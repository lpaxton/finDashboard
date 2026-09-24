'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createServer } = require('../server');

let server, base;
test.before(async () => {
  server = createServer({ quiet: true, latencyMs: 0 });
  await new Promise(r => server.listen(0, r));
  base = 'http://localhost:' + server.address().port;
});
test.after(() => new Promise(r => server.close(r)));

const call = async (persona, method, p, body, headers = {}) => {
  const res = await fetch(base + '/v1' + p, {
    method,
    headers: { ...(persona ? { Authorization: 'Bearer ' + persona } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  return { status: res.status, headers: res.headers, data: text ? JSON.parse(text) : undefined };
};

test.beforeEach(async () => { await fetch(base + '/_mock/reset', { method: 'POST' }); });

test('requires a known persona token', async () => {
  assert.equal((await call(null, 'GET', '/session')).status, 401);
  assert.equal((await call('nobody', 'GET', '/session')).status, 401);
  const r = await call('dana', 'GET', '/session');
  assert.equal(r.status, 200);
  assert.deepEqual(r.data.views, ['firm', 'advisor']);
});

test('echoes the trace id', async () => {
  const r = await call('dana', 'GET', '/session', undefined, { 'x-trace-id': 'abc-123' });
  assert.equal(r.headers.get('x-trace-id'), 'abc-123');
});

test('roles are enforced on the server', async () => {
  assert.equal((await call('marcus', 'GET', '/firm/summary')).status, 403);
  assert.equal((await call('marcus', 'GET', '/households?scope=firm')).status, 403);
  assert.equal((await call('grace', 'GET', '/summary')).status, 403);
  assert.equal((await call('grace', 'GET', '/alerts')).status, 403);
  assert.equal((await call('dana', 'GET', '/me/household')).status, 403);
  assert.equal((await call('marcus', 'GET', '/households/h1')).status, 404); // another advisor's client
});

test('totals are consistent across levels', async () => {
  const firm = (await call('dana', 'GET', '/firm/summary')).data;
  const advisors = (await call('dana', 'GET', '/firm/advisors')).data.items;
  assert.equal(firm.households, 28);
  assert.equal(advisors.reduce((a, x) => a + x.aum, 0), firm.aum.value);
  const mine = (await call('dana', 'GET', '/summary')).data;
  assert.equal(mine.aum.value, advisors.find(a => a.id === 'adv1').aum);
  const sig = (await call('dana', 'GET', '/portfolio-signals')).data.items;
  for (const s of sig) {
    const items = (await call('dana', 'GET', `/portfolio-signals/${s.id}/items`)).data;
    assert.equal(items.totalItems, s.count);
  }
});

test('households page, sort and filter server-side', async () => {
  const r = (await call('dana', 'GET', '/households?sort=name,asc&size=3&page=1')).data;
  assert.equal(r.items.length, 3);
  assert.equal(r.totalItems, 10);
  assert.equal(r.page, 1);
  const names = r.items.map(i => i.name);
  assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b)));
  const f = (await call('dana', 'GET', '/households?status=overdue_contact')).data;
  assert.ok(f.items.every(i => i.status === 'overdue_contact'));
});

test('tasks and alerts can be changed', async () => {
  const t = await call('dana', 'PATCH', '/tasks/t1', { status: 'done' });
  assert.equal(t.data.status, 'done');
  const created = await call('dana', 'POST', '/tasks', { title: 'Call the Shahs' });
  assert.equal(created.status, 201);
  assert.equal((await call('dana', 'POST', '/tasks', {})).status, 400);
  const a = await call('dana', 'PATCH', '/alerts/a1', { status: 'dismissed' });
  assert.equal(a.data.status, 'dismissed');
  const open = (await call('dana', 'GET', '/alerts')).data.items;
  assert.ok(!open.some(x => x.id === 'a1'));
});

test('advisor share reaches the client, and only that', async () => {
  const before = (await call('grace', 'GET', '/me/shared')).data.items.length;
  const share = await call('dana', 'POST', '/households/h3/shares', { type: 'report', sourceId: 'r1', title: 'Q3 report' });
  assert.equal(share.status, 201);
  const after = (await call('grace', 'GET', '/me/shared')).data.items;
  assert.equal(after.length, before + 1);
  assert.equal(after[0].title, 'Q3 report');
  assert.equal((await call('dana', 'POST', '/households/h11/shares', { type: 'report', sourceId: 'r1', title: 'x' })).status, 404); // not Dana's client
});

test('client responses never contain internal fields', async () => {
  const forbidden = ['status', 'openingStatus', 'lastContactAt', 'brief', 'advisorId', 'householdId'];
  const h = (await call('grace', 'GET', '/me/household')).data;
  for (const k of forbidden) assert.ok(!(k in h), 'household leaks ' + k);
  for (const a of h.accounts) for (const k of forbidden) assert.ok(!(k in a), 'account leaks ' + k);
  const shared = (await call('grace', 'GET', '/me/shared')).data.items;
  for (const s of shared) assert.ok(!('householdId' in s));
});

// Guardrail X-12: nothing internal may reach a client, at any depth, on any /me endpoint.
// `status` is not on this list because a fee's status (paid, billed, scheduled) is client-facing;
// the household-specific check above covers the status field that is not.
test('no /me endpoint leaks an internal field at any depth', async () => {
  const forbidden = ['advisorId', 'householdId', 'brief', 'briefSources', 'prepStatus', 'openingStatus',
    'lastContactAt', 'origin', 'originMeetingId', 'sourceId', 'severity', 'sentiment',
    'intakeNotes', 'stage', 'consent', 'withheld', 'steps', 'complianceReview', 'draftedBy',
    'approvedBy', 'paymentMethod', 'invalidRows', 'meters'];
  const keysIn = (v, out = []) => {
    if (Array.isArray(v)) v.forEach(x => keysIn(x, out));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { out.push(k); keysIn(x, out); }
    return out;
  };
  const paths = ['/me/household', '/me/documents', '/me/documents/d1', '/me/fees', '/me/shared', '/me/preferences'];
  for (const p of paths) {
    const r = await call('grace', 'GET', p);
    assert.equal(r.status, 200, p + ' should answer 200');
    const leaked = keysIn(r.data).filter(k => forbidden.includes(k));
    assert.deepEqual(leaked, [], p + ' leaks ' + leaked.join(', '));
  }
});

test('the client value chart is sourced, not synthesised in the browser', async () => {
  const h = (await call('grace', 'GET', '/me/household')).data;
  assert.ok(Array.isArray(h.trend) && h.trend.length === 12, '/me/household must carry 12 months of history');
  assert.equal(h.trend.at(-1).value, h.aum, 'the last point must be the current value');
  for (const p of h.trend) assert.match(p.month, /^\d{4}-\d{2}$/);
  const html = fs.readFileSync(path.join(__dirname, '..', 'dashboard', 'index.html'), 'utf8');
  assert.doesNotMatch(html, /trendFrom/, 'the dashboard must not generate its own trend data');
});

// The dashboard embeds a copy of createMock() so it can run offline. Run `npm run sync-mock`
// after changing src/mock-core.js. Delete both when the dashboard loses its embedded copy.
test('the dashboard mock is an exact copy of src/mock-core.js', () => {
  const { extractMockCore, extractEmbeddedMock, CORE, DASHBOARD } = require('../tools/mock-source');
  const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  assert.equal(extractEmbeddedMock(read(DASHBOARD)), extractMockCore(read(CORE)),
    `${DASHBOARD} has drifted from ${CORE}. Run: npm run sync-mock`);
});

test('a client meeting request becomes an advisor task', async () => {
  const before = (await call('dana', 'GET', '/tasks')).data.items.length;
  const r = await call('grace', 'POST', '/me/meeting-requests', { topic: 'Retirement date' });
  assert.equal(r.status, 201);
  const tasks = (await call('dana', 'GET', '/tasks')).data.items;
  assert.equal(tasks.length, before + 1);
  assert.ok(tasks.some(t => t.title.includes('Retirement date')));
});

test('client preferences persist', async () => {
  await call('grace', 'PATCH', '/me/preferences', { paperless: false, notificationChannels: ['sms'] });
  const p = (await call('grace', 'GET', '/me/preferences')).data;
  assert.equal(p.paperless, false);
  assert.deepEqual(p.notificationChannels, ['sms']);
});

test('reset restores the seed data', async () => {
  await call('dana', 'PATCH', '/tasks/t1', { status: 'done' });
  await fetch(base + '/_mock/reset', { method: 'POST' });
  const t = (await call('dana', 'GET', '/tasks')).data.items.find(x => x.id === 't1');
  assert.equal(t.status, 'open');
});

test('failure injection and bad bodies', async () => {
  const f = await call('dana', 'GET', '/summary', undefined, { 'x-mock-fail': '503' });
  assert.equal(f.status, 503);
  assert.equal(f.data.code, 'mock_failure');
  const res = await fetch(base + '/v1/tasks', { method: 'POST', headers: { Authorization: 'Bearer dana', 'Content-Type': 'application/json' }, body: '{oops' });
  assert.equal(res.status, 400);
});

test('every operation in openapi.yaml is served', async () => {
  const spec = fs.readFileSync(path.join(__dirname, '..', 'openapi.yaml'), 'utf8').split('\n');
  const start = spec.findIndex(l => l === 'paths:'), end = spec.findIndex(l => l === 'components:');
  const ops = []; let cur = null;
  for (const l of spec.slice(start + 1, end)) {
    const p = l.match(/^  (\/[^\s:]+):\s*$/); if (p) { cur = p[1]; continue; }
    const m = l.match(/^    (get|post|patch|put|delete):\s*$/); if (m && cur) ops.push([m[1].toUpperCase(), cur]);
  }
  assert.equal(ops.length, 50, 'spec should list 50 operations');
  const params = { householdId: 'h3', meetingId: 'm1', taskId: 't1', alertId: 'a1', signalId: 'sig_idle_cash', advisorId: 'adv2', documentId: 'd1',
    communicationId: 'cm1', prospectId: 'p1', onboardingId: 'ob1', stepId: 'intake_form', invoiceId: 'inv1' };
  const missing = [];
  for (const [method, p] of ops) {
    const url = p.replace(/\{(\w+)\}/g, (_, k) => params[k]);
    const persona = url.startsWith('/me') ? 'grace' : 'dana';
    const r = await call(persona, method, url, ['POST', 'PATCH'].includes(method) ? {} : undefined);
    if (r.status === 404 && /No such operation/.test(r.data.message)) missing.push(method + ' ' + p);
  }
  assert.deepEqual(missing, []);
});

test('serves the dashboard configured for this server', async () => {
  const html = await (await fetch(base + '/')).text();
  assert.match(html, /ADVISOR_CONFIG = \{ mode: "live"/);
  const spec = await fetch(base + '/openapi.yaml');
  assert.equal(spec.status, 200);
});

/* ---- ported from the Meridian mockup: client engagement, growth, practice operations ---- */

test('a draft cannot be sent without being approved first', async () => {
  // X-03: nothing leaves the firm without a human. The gate is the point of this endpoint.
  assert.equal((await call('dana', 'PATCH', '/communications/cm1', { status: 'sent' })).status, 409);
  const approved = await call('dana', 'PATCH', '/communications/cm1', { status: 'approved' });
  assert.equal(approved.status, 200);
  assert.equal(approved.data.approvedBy, 'Dana Whitfield');
  assert.ok(approved.data.approvedAt, 'the approval must be timestamped');
  const sent = await call('dana', 'PATCH', '/communications/cm1', { status: 'sent' });
  assert.equal(sent.data.status, 'sent');
  assert.ok(sent.data.sentAt);
  assert.equal((await call('dana', 'PATCH', '/communications/cm1', { status: 'posted' })).status, 400);
});

test('the compliance review queue reconciles with the alert that counts it', async () => {
  const drafts = (await call('dana', 'GET', '/communications?status=draft')).data;
  const alert = (await call('dana', 'GET', '/alerts')).data.items.find(a => a.title.includes('compliance review'));
  assert.match(alert.title, new RegExp('^' + drafts.totalItems + ' client emails'), 'alert a2 must count Dana\'s actual drafts');
  const list = (await call('dana', 'GET', '/communications')).data.items;
  assert.ok(list.every(c => !('body' in c)), 'the list must not carry message bodies');
  assert.ok((await call('dana', 'GET', '/communications/cm1')).data.body, 'fetching one message must include its body');
});

test('firm scope on communications is principal-only', async () => {
  assert.equal((await call('marcus', 'GET', '/communications?scope=firm')).status, 403);
  assert.equal((await call('grace', 'GET', '/communications')).status, 403);
  const firm = (await call('dana', 'GET', '/communications?scope=firm')).data;
  const mine = (await call('dana', 'GET', '/communications')).data;
  assert.ok(firm.totalItems > mine.totalItems, 'firm scope must widen the result');
  assert.equal((await call('marcus', 'GET', '/communications/cm1')).status, 404); // Dana's message
});

test('prospects move through the pipeline', async () => {
  const board = (await call('dana', 'GET', '/prospects')).data;
  assert.deepEqual(board.stages, ['lead', 'contacted', 'meeting_scheduled', 'proposal', 'onboarding', 'converted']);
  assert.ok(board.items.every(p => !('intakeNotes' in p)), 'the board must not carry intake notes');
  const one = (await call('dana', 'GET', '/prospects/p1')).data;
  assert.ok(one.intakeNotes);
  assert.equal(one.meetingId, 'm12');
  const moved = await call('dana', 'PATCH', '/prospects/p1', { stage: 'proposal' });
  assert.equal(moved.data.stage, 'proposal');
  assert.equal((await call('dana', 'PATCH', '/prospects/p1', { stage: 'nonsense' })).status, 400);
  assert.equal((await call('marcus', 'GET', '/prospects/p1')).status, 404);
});

test('a prospect meeting has no household until they convert', async () => {
  const m = (await call('dana', 'GET', '/meetings')).data.items.find(x => x.id === 'm12');
  assert.equal(m.householdId, null);
  assert.equal(m.householdName, null);
  assert.equal(m.prospectName, 'Marcus DeLuca');
});

test('onboarding will not convert until every step is done', async () => {
  const before = (await call('dana', 'GET', '/onboarding/ob1')).data;
  assert.equal(before.readyToConvert, false);
  const blocked = await call('dana', 'POST', '/onboarding/ob1/convert', {});
  assert.equal(blocked.status, 409);
  assert.match(blocked.data.message, /Funding/, 'the refusal must name what is outstanding');
  for (const s of before.steps) await call('dana', 'PATCH', `/onboarding/ob1/steps/${s.id}`, { status: 'done' });
  const ready = (await call('dana', 'GET', '/onboarding/ob1')).data;
  assert.equal(ready.readyToConvert, true);
  assert.equal(ready.stepsComplete, ready.stepsTotal);
  const done = await call('dana', 'POST', '/onboarding/ob1/convert', {});
  assert.equal(done.status, 201);
  const hh = (await call('dana', 'GET', '/households?size=100')).data.items;
  assert.ok(hh.some(h => h.id === done.data.householdId), 'the converted client must appear in the book');
  assert.equal((await call('dana', 'POST', '/onboarding/ob1/convert', {})).status, 409, 'converting twice must be refused');
});

test('a book import keeps the good rows and reports the bad ones', async () => {
  const before = (await call('dana', 'GET', '/households?size=100')).data.totalItems;
  const r = await call('dana', 'POST', '/migrations', {
    source: 'Redtail export',
    rows: [{ name: 'Okonkwo household', aum: 3200000 }, { name: 'Vance Trust', aum: 1400000 }, { aum: 50 }, { name: 'Bad Assets', aum: -3 }]
  });
  assert.equal(r.status, 201);
  assert.deepEqual(r.data.counts, { read: 4, valid: 2, invalid: 2, imported: 2 });
  assert.equal(r.data.invalidRows.length, 2);
  assert.match(r.data.invalidRows[0].problems.join(), /name is missing/);
  const after = (await call('dana', 'GET', '/households?size=100')).data;
  assert.equal(after.totalItems, before + 2);
  const imported = after.items.filter(h => r.data.createdHouseholdIds.includes(h.id));
  assert.ok(imported.every(h => h.status === 'needs_review'), 'imported households must arrive flagged for review');
  assert.equal((await call('dana', 'POST', '/migrations', { source: 'x', rows: [] })).status, 400);
  assert.equal((await call('dana', 'GET', '/migrations')).data.items.length, 1);
});

test('calendar meetings can be created, moved and cancelled', async () => {
  const made = await call('dana', 'POST', '/meetings', { startsAt: '2026-10-02T14:00:00.000Z', type: 'Estate review', householdId: 'h3', durationMinutes: 45 });
  assert.equal(made.status, 201);
  assert.equal(made.data.householdName, 'Okafor household');
  const moved = await call('dana', 'PATCH', `/meetings/${made.data.id}`, { startsAt: '2026-10-03T15:30:00.000Z' });
  assert.equal(moved.data.startsAt, '2026-10-03T15:30:00.000Z');
  assert.equal((await call('dana', 'PATCH', `/meetings/${made.data.id}`, { startsAt: 'not a date' })).status, 400);
  assert.equal((await call('dana', 'POST', '/meetings', { type: 'No date' })).status, 400);
  assert.equal((await call('dana', 'POST', '/meetings', { startsAt: '2026-10-02T14:00:00.000Z', type: 'x', householdId: 'h11' })).status, 404); // not Dana's
  assert.equal((await call('dana', 'DELETE', `/meetings/${made.data.id}`)).status, 204);
  assert.equal((await call('dana', 'GET', `/meetings/${made.data.id}`)).status, 404);
});

test('a transcript without recorded consent is withheld, not just labelled', async () => {
  // MEET-04 is flagged for compliance review. Consent gates disclosure, and it gates the AI too.
  const consented = (await call('dana', 'GET', '/meetings/m6/record')).data;
  assert.equal(consented.kind, 'transcript');
  assert.equal(consented.consent.obtained, true);
  assert.equal(consented.withheld, false);
  assert.ok(consented.content);

  const withheld = (await call('dana', 'GET', '/meetings/m14/record')).data;
  assert.equal(withheld.withheld, true);
  assert.equal(withheld.content, null, 'withheld content must not be sent at all');
  assert.ok(withheld.withheldReason);
  assert.equal((await call('dana', 'POST', '/meetings/m14/record/next-steps', {})).status, 409,
    'the model must not be run over a transcript with no consent');
});

test('suggested next steps are drafts, not tasks', async () => {
  const before = (await call('dana', 'GET', '/tasks')).data.items.length;
  const s = await call('dana', 'POST', '/meetings/m5/record/next-steps', {});
  assert.equal(s.status, 200);
  assert.equal(s.data.accepted, false);
  assert.ok(s.data.items.length > 0);
  assert.ok(s.data.model, 'the suggestion must say which model produced it');
  const after = (await call('dana', 'GET', '/tasks')).data.items.length;
  assert.equal(after, before, 'suggesting must not create tasks on its own');
});

test('allocation drift agrees with the portfolio signal', async () => {
  const items = (await call('dana', 'GET', '/portfolio-signals/sig_allocation_drift/items')).data.items;
  for (const h of ['h1', 'h2', 'h3']) {
    const a = (await call('dana', 'GET', `/households/${h}/allocation`)).data;
    const signal = items.find(i => i.householdId === h);
    assert.equal(a.maxDriftPoints, parseFloat(signal.detail), `${h} drift must match its signal`);
    assert.equal(Math.round(a.lines.reduce((t, l) => t + l.currentPct, 0)), 100, `${h} weights must sum to 100`);
  }
  const none = (await call('dana', 'GET', '/households/h7/allocation')).data;
  assert.equal(none.model, null, 'a household with no model on file returns model: null');
  assert.deepEqual(none.lines, []);
  assert.equal((await call('marcus', 'GET', '/households/h1/allocation')).status, 404);
});

test('the fee a client sees is the fee the advisor charges', async () => {
  const advisorView = (await call('dana', 'GET', '/billing/fees')).data;
  const h3 = advisorView.items.find(r => r.householdId === 'h3');
  const clientView = (await call('grace', 'GET', '/me/fees')).data.items[0];
  assert.equal(h3.quarterlyFee, clientView.amount, 'the two views must agree on the number');
  const tier = advisorView.schedule.find(t => h3.billableAssets >= t.minAssets && (t.maxAssets === null || h3.billableAssets < t.maxAssets));
  assert.equal(h3.annualRatePct, tier.annualRatePct, 'the rate must come from the published schedule');
  assert.equal((await call('grace', 'GET', '/billing/fees')).status, 403);
});

test('platform billing is principal-only and the card is masked', async () => {
  assert.equal((await call('marcus', 'GET', '/firm/billing/subscription')).status, 403);
  assert.equal((await call('marcus', 'GET', '/firm/billing/invoices')).status, 403);
  const s = (await call('dana', 'GET', '/firm/billing/subscription')).data;
  assert.equal(s.seats.used, 4);
  assert.match(s.paymentMethod.maskedNumber, /^\*{4}\d{4}$/, 'only the last four digits may be returned');
  assert.ok(!JSON.stringify(s).match(/\d{13,19}/), 'no full card number anywhere in the response');
  const inv = (await call('dana', 'GET', '/firm/billing/invoices/inv1')).data;
  assert.equal(inv.amount, inv.lines.reduce((t, l) => t + l.amount, 0), 'the invoice must equal its lines');
});

test('branding is readable by everyone and writable only by a principal', async () => {
  for (const who of ['dana', 'marcus', 'grace']) {
    assert.equal((await call(who, 'GET', '/firm/branding')).status, 200, who + ' should see the firm brand');
  }
  assert.equal((await call('marcus', 'PATCH', '/firm/branding', { firmName: 'Hijacked' })).status, 403);
  assert.equal((await call('dana', 'PATCH', '/firm/branding', { accentColor: 'teal' })).status, 400);
  const r = await call('dana', 'PATCH', '/firm/branding', { accentColor: '#123456', markLetter: 'M' });
  assert.equal(r.data.accentColor, '#123456');
  assert.equal(r.data.updatedBy, 'Dana Whitfield', 'the change must be attributed');
});

test('a client is refused every advisor-side feature ported from Meridian', async () => {
  const paths = ['/communications', '/prospects', '/onboarding', '/migrations', '/billing/fees',
    '/households/h3/allocation', '/meetings/m1/record', '/firm/billing/subscription'];
  for (const p of paths) assert.equal((await call('grace', 'GET', p)).status, 403, p + ' must refuse a client');
  assert.equal((await call('grace', 'POST', '/meetings', { startsAt: '2026-10-02T14:00:00.000Z', type: 'x' })).status, 403);
  assert.equal((await call('grace', 'POST', '/migrations', { source: 'x', rows: [{ name: 'y' }] })).status, 403);
});
