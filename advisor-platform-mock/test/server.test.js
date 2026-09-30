import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createServer } from '../server.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
  const dir = path.join(__dirname, '..', 'dashboard', 'js');
  const js = fs.readdirSync(dir).map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
  assert.doesNotMatch(js, /trendFrom/, 'the dashboard must not generate its own trend data');
});

// The dashboard imports src/mock-core.js directly, so there is no second copy to drift.
// This fails if one is ever reintroduced.
test('the mock exists in exactly one place', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'dashboard', 'index.html'), 'utf8');
  assert.doesNotMatch(html, /function createMock/, 'the dashboard must import the mock, not embed a copy');
  const app = fs.readFileSync(path.join(__dirname, '..', 'dashboard', 'js', 'api.js'), 'utf8');
  assert.match(app, /from '\/src\/mock-core\.js'/, 'the dashboard must import the one mock-core');
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

/* The dashboard runs the mock in the browser, so every module mock-core imports has to be
   reachable over HTTP too. This broke once: src/i18n.js was added on the server, worked in
   every test, and 404'd in the browser — which took the whole dashboard down, because a module
   that fails to link takes its importers with it. Tests that only run in Node cannot see it. */
test('every module the browser-side mock imports is actually served', async () => {
  const core = fs.readFileSync(path.join(__dirname, '..', 'src', 'mock-core.js'), 'utf8');
  const imports = [...core.matchAll(/from '\.\/([\w./-]+)'/g)].map(m => m[1]);
  assert.ok(imports.length, 'expected mock-core to import something');
  for (const rel of imports) {
    const r = await fetch(base + '/src/' + rel);
    assert.equal(r.status, 200, '/src/' + rel + ' is imported by mock-core but is not served');
    assert.match(r.headers.get('content-type') || '', /javascript/);
  }
});

test('every operation in openapi.yaml is served', async () => {
  const spec = fs.readFileSync(path.join(__dirname, '..', 'openapi.yaml'), 'utf8').split('\n');
  const start = spec.findIndex(l => l === 'paths:'), end = spec.findIndex(l => l === 'components:');
  const ops = []; let cur = null;
  for (const l of spec.slice(start + 1, end)) {
    const p = l.match(/^  (\/[^\s:]+):\s*$/); if (p) { cur = p[1]; continue; }
    const m = l.match(/^    (get|post|patch|put|delete):\s*$/); if (m && cur) ops.push([m[1].toUpperCase(), cur]);
  }
  assert.equal(ops.length, 82, 'spec should list 82 operations');
  const params = { householdId: 'h3', meetingId: 'm1', taskId: 't1', alertId: 'a1', signalId: 'sig_idle_cash', advisorId: 'adv2', documentId: 'd1',
    communicationId: 'cm1', prospectId: 'p1', onboardingId: 'ob1', stepId: 'intake_form', invoiceId: 'inv1', queryId: 'q1', teamShareId: 'ts1', playbookId: 'pb1', articleId: 'ar1' };
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

/* A compliance list ordered purely by due date puts a thing that is done above a thing that is
   late. The status order is urgency, not alphabet, and must survive anyone renaming a status. */
test('compliance leads with what is overdue, and the page is the one that is ordered', async () => {
  const rank = { overdue: 0, open: 1, done: 2 };
  const all = (await call('dana', 'GET', '/firm/compliance?size=100')).data.items;
  assert.ok(all.length > 3, 'need enough items for the order to mean anything');
  assert.ok(all.some(c => c.status === 'done') && all.some(c => c.status === 'overdue'),
    'the fixture must hold both, or this asserts nothing');

  for (let i = 1; i < all.length; i++) {
    const [prev, cur] = [all[i - 1], all[i]];
    assert.ok(rank[prev.status] <= rank[cur.status],
      `${prev.status} must not follow ${cur.status}`);
    if (prev.status === cur.status) {
      assert.ok(prev.dueDate <= cur.dueDate, 'within one status, the oldest due date leads');
    }
  }
  assert.equal(all[0].status, 'overdue', 'overdue leads');

  // The ordering is the server's, so the first page is the first page of the whole list and not
  // the first few records re-sorted. That is the thing the browser could not have done.
  const first = (await call('dana', 'GET', '/firm/compliance?size=2')).data;
  assert.equal(first.totalItems, all.length);
  assert.deepEqual(first.items.map(c => c.id), all.slice(0, 2).map(c => c.id));

  // The direction still means what it means everywhere else, and due date is still available.
  const asc = (await call('dana', 'GET', '/firm/compliance?sort=status,asc&size=100')).data.items;
  assert.equal(asc[0].status, 'done');
  const byDue = (await call('dana', 'GET', '/firm/compliance?sort=dueDate,asc&size=100')).data.items;
  assert.deepEqual(byDue.map(c => c.dueDate), [...byDue.map(c => c.dueDate)].sort());
});

/* Supervision (PO-06). The decision recorded in docs/design.md: a principal may read an
   advisor's book, because it is the firm's book and supervising it is their job — but it is a
   narrowing of access they already have, it is not impersonation, and the advisor is told. */
test('advisorId narrows firm scope and gives the principal nothing new', async () => {
  const firm = (await call('dana', 'GET', '/households?scope=firm&size=100')).data;
  const his = (await call('dana', 'GET', '/households?scope=firm&advisorId=adv2&size=100')).data;
  assert.ok(his.totalItems > 0 && his.totalItems < firm.totalItems, 'it must narrow, not widen');

  // Every household it returns was already in the unfiltered firm-scope response. That is the
  // claim the whole decision rests on: no 403 moved.
  const all = new Set(firm.items.map(h => h.id));
  assert.ok(his.items.every(h => all.has(h.id)), 'advisorId must not reach a record scope=firm cannot');

  // Without scope=firm it is meaningless rather than permissive, so it is refused outright.
  assert.equal((await call('dana', 'GET', '/households?advisorId=adv2')).status, 400);
  // And it is not a way around the role boundary.
  assert.equal((await call('marcus', 'GET', '/households?scope=firm&advisorId=adv1')).status, 403);
  assert.equal((await call('grace', 'GET', '/households?scope=firm&advisorId=adv1')).status, 403);
  assert.equal((await call('dana', 'GET', '/households?scope=firm&advisorId=nobody')).status, 404);

  for (const p of ['/next-actions', '/communications']) {
    const wide = (await call('dana', 'GET', `${p}?scope=firm&size=100`)).data;
    const one = (await call('dana', 'GET', `${p}?scope=firm&advisorId=adv2&size=100`)).data;
    assert.ok(one.items.length && one.items.length < wide.items.length, `${p} must narrow`);
  }
});

test('supervision is not impersonation: an advisor\'s own screen stays theirs', async () => {
  // None of these takes advisorId, so a principal asking for one gets their own, not Marcus's.
  // If any of them ever starts honouring it, this fails and the decision gets re-made on purpose.
  for (const p of ['/activity', '/meetings', '/tasks', '/prospects', '/onboarding', '/portfolio-signals']) {
    const mine = (await call('dana', 'GET', `${p}?size=100`)).data;
    const asked = (await call('dana', 'GET', `${p}?scope=firm&advisorId=adv2&size=100`)).data;
    assert.deepEqual(asked.items.map(x => x.id), mine.items.map(x => x.id),
      `${p} must ignore advisorId — supervision does not hand over another advisor's screen`);
  }
  // And a principal cannot act in the advisor's name: writes stay bound to the owner.
  const his = (await call('dana', 'GET', '/communications?scope=firm&advisorId=adv2&status=draft')).data.items[0];
  assert.ok(his, 'need one of Marcus\'s drafts');
  assert.equal((await call('dana', 'PATCH', '/communications/' + his.id, { status: 'approved' })).status, 404);
});

test('being read is told to the advisor, in their own activity log', async () => {
  const before = (await call('marcus', 'GET', '/activity')).data.items;
  assert.ok(!before.some(a => a.actor === 'principal'), 'nothing yet');

  await call('dana', 'GET', '/households?scope=firm&advisorId=adv2');
  const after = (await call('marcus', 'GET', '/activity')).data.items;
  const entry = after.find(a => a.actor === 'principal');
  assert.ok(entry, 'Marcus must be told that his book was opened');
  assert.match(entry.summary, /Dana Whitfield/, 'it must name who looked');
  assert.equal(entry.undoable, false);

  // A second read in the same visit is the same visit, not a second notification.
  await call('dana', 'GET', '/next-actions?scope=firm&advisorId=adv2');
  await call('dana', 'GET', '/communications?scope=firm&advisorId=adv2');
  const again = (await call('marcus', 'GET', '/activity')).data.items.filter(a => a.actor === 'principal');
  assert.equal(again.length, 1, 'one entry per principal per day, not one per request');

  // Dana filtering to her own book is not supervision and tells nobody anything.
  await call('dana', 'GET', '/households?scope=firm&advisorId=adv1');
  assert.ok(!(await call('dana', 'GET', '/activity')).data.items.some(a => a.actor === 'principal'),
    'reading your own book is not a supervisory read');
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

// A light guard on the UI: every ported feature must still be wired to its endpoint.
// It does not prove the screens work, only that a feature was not silently dropped.
test('the dashboard calls every ported endpoint', () => {
  const dir = path.join(__dirname, '..', 'dashboard', 'js');
  const html = fs.readdirSync(dir).map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
  const wired = ["'/communications'", "'/prospects'", "'/onboarding'", "'/migrations'", "'/billing/fees'",
    "'/firm/billing/subscription'", "'/firm/billing/invoices'", "'/firm/branding'", "'/meetings'", "'/tasks'"];
  for (const w of wired) assert.ok(html.includes(w), 'the dashboard no longer calls ' + w);
  for (const frag of ['/record', '/record/next-steps', '/convert', '/steps/'])
    assert.ok(html.includes(frag), 'the dashboard no longer calls ' + frag);
  // The advisor spine, after the IA pass (ux/UX_IA.md §2): Today, Inbox and Calendar at the top,
  // the four roles as the frame, Systems at the bottom. Communications and Follow-ups merged
  // into the Inbox and Prospects moved inside a role home, so they are tabs, not spine entries.
  for (const sec of ['today', 'inbox', 'calendar', 'role:bd', 'role:ca', 'role:op', 'role:pd', 'glance', 'systems'])
    assert.ok(new RegExp(`\\['${sec}',`).test(html), 'the advisor spine lost ' + sec);
  for (const tab of ['pipeline', 'referrals', 'households', 'onboarding', 'reports', 'billing', 'playbooks', 'scorecard'])
    assert.ok(new RegExp(`\\['${tab}', '`).test(html), 'a role home lost its ' + tab + ' tab');
  for (const sec of ['overview', 'billing', 'branding'])
    assert.ok(new RegExp(`\\['${sec}',`).test(html), 'the firm sub-nav lost ' + sec);
});

// The dashboard is plain ES modules with no build step. Keep it that way.
test('the dashboard is modules, and every module is served', async () => {
  const dir = path.join(__dirname, '..', 'dashboard', 'js');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
  assert.ok(files.length >= 8, 'expected the dashboard to be split into modules, found ' + files.length);

  const html = fs.readFileSync(path.join(__dirname, '..', 'dashboard', 'index.html'), 'utf8');
  assert.match(html, /<script type="module" src="\/js\/app\.js">/, 'index.html must load app.js as a module');
  assert.doesNotMatch(html, /<style>/, 'styles belong in styles.css');
  assert.ok(html.split('\n').length < 60, 'index.html should be a shell, not the application');

  for (const f of files) {
    const r = await fetch(base + '/js/' + f);
    assert.equal(r.status, 200, '/js/' + f + ' is not served');
    assert.match(r.headers.get('content-type'), /javascript/);
  }
  for (const p of ['/styles.css', '/src/mock-core.js']) {
    assert.equal((await fetch(base + p)).status, 200, p + ' is not served');
  }
  // No path is resolved from the request, so traversal cannot reach the repo.
  assert.equal((await fetch(base + '/js/%2e%2e%2f%2e%2e%2fpackage.json')).status, 404);
});

/* ---- generated types ---- */

const runGen = (args = []) => new Promise((resolve) => {
  const p = spawn(process.execPath, [path.join(__dirname, '..', 'tools', 'gen-types.js'), ...args]);
  let out = '', err = '';
  p.stdout.on('data', d => { out += d; });
  p.stderr.on('data', d => { err += d; });
  p.on('close', code => resolve({ code, out, err }));
});

test('types/api.d.ts is up to date with openapi.yaml', async () => {
  const r = await runGen(['--check']);
  assert.equal(r.code, 0, r.err.trim() || 'the generator failed');
});

test('every schema in the contract has a generated type', () => {
  const spec = fs.readFileSync(path.join(__dirname, '..', 'openapi.yaml'), 'utf8');
  const types = fs.readFileSync(path.join(__dirname, '..', 'types', 'api.d.ts'), 'utf8');
  const start = spec.indexOf('\n  schemas:');
  const names = [...spec.slice(start).matchAll(/^    ([A-Z][A-Za-z0-9_]*):$/gm)].map(m => m[1]);
  assert.ok(names.length > 70, 'expected the spec to define many schemas, found ' + names.length);
  const missing = names.filter(n => !new RegExp(`export (interface|type) ${n}\\b`).test(types));
  assert.deepEqual(missing, [], 'schemas with no generated type: ' + missing.join(', '));
  for (const op of ['getSession', 'listCommunications', 'suggestNextSteps', 'updateBranding'])
    assert.match(types, new RegExp(`\\b${op}: \\{`), 'Operations is missing ' + op);
});

// The generator reads a deliberate subset of YAML. These are the constructs it does not
// handle; if the spec grows one, the generated types would be wrong, so fail here instead.
test('the contract stays within the subset the generator reads', () => {
  const spec = fs.readFileSync(path.join(__dirname, '..', 'openapi.yaml'), 'utf8');
  const lines = spec.split('\n');
  lines.forEach((l, i) => {
    assert.doesNotMatch(l, /^\s*[^#]*\s[&*]\w/, `line ${i + 1} looks like a YAML anchor or alias, which the generator cannot read`);
    const opens = (l.match(/\{/g) || []).length, closes = (l.match(/\}/g) || []).length;
    assert.equal(opens, closes, `line ${i + 1} has an unbalanced flow mapping; the generator needs them on one line`);
  });
  assert.doesNotMatch(spec, /\$ref: '#\/components\/schemas\/[A-Za-z0-9_]+\//,
    'a $ref pointing inside another schema has no type name: give it its own entry under components.schemas');
});

// An unquoted value containing a comma silently truncates in YAML and turns the rest of the
// sentence into a key. It cost a real bug in this spec, so it is checked.
test('no flow mapping has an unquoted value containing a comma', async () => {
  const r = await runGen(['--check']);
  assert.equal(r.code, 0);
  const spec = fs.readFileSync(path.join(__dirname, '..', 'openapi.yaml'), 'utf8');
  for (const [i, line] of spec.split('\n').entries()) {
    for (const seg of line.match(/\{[^{}]*\}/g) || []) {
      for (const m of seg.matchAll(/\b(description|example|summary|title):\s*([^,}]*)/g)) {
        const rest = seg.slice(m.index + m[0].length);
        const value = m[2].trim();
        if (!value.startsWith("'") && !value.startsWith('"') && rest.startsWith(',')) {
          const after = rest.slice(1).trim();
          assert.ok(/^[A-Za-z_$][\w$]*\s*:/.test(after) || after.startsWith('}'),
            `line ${i + 1}: "${value}" is followed by a comma but "${after.slice(0, 40)}" is not a key. Quote the value.`);
        }
      }
    }
  }
});

// Every operation in the contract should be reachable from the dashboard. An endpoint with
// no UI is a feature that looks done in the contract and does not exist for a user.
test('no contract operation is left without a UI', () => {
  const dir = path.join(__dirname, '..', 'dashboard', 'js');
  const js = fs.readdirSync(dir).map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
  const spec = fs.readFileSync(path.join(__dirname, '..', 'openapi.yaml'), 'utf8');
  const start = spec.indexOf('\npaths:'), end = spec.indexOf('\ncomponents:');
  const ops = []; let cur = null;
  for (const l of spec.slice(start, end).split('\n')) {
    const p = l.match(/^  (\/[^\s:]+):\s*$/); if (p) { cur = p[1]; continue; }
    const m = l.match(/^    (get|post|patch|put|delete):\s*$/); if (m && cur) ops.push([m[1].toUpperCase(), cur]);
  }
  const missing = ops.filter(([method, p]) => {
    const base = p.replace(/\{[^}]+\}.*/, '').replace(/\/$/, '');
    const tail = p.split('}').pop().replace(/^\//, '');
    return !(new RegExp(`'${method}', [\`']${base.replace(/\//g, '\\/')}`).test(js)
      || (tail && js.includes(tail) && js.includes(base)));
  }).map(([m, p]) => `${m} ${p}`);
  assert.deepEqual(missing, [], 'operations with no UI: ' + missing.join(', '));
});

/* The no-UI test above checks a path is mentioned somewhere. Four firm-scope capabilities were
   served and documented for weeks while the Firm view reached none of them, because the advisor
   view calls the same paths for one book. Scope is the thing that was missing, so scope is what
   this asserts. */
test('the firm view reaches the firm-scope operations, not just the paths', () => {
  const js = fs.readFileSync(path.join(__dirname, '..', 'dashboard', 'js', 'firm.js'), 'utf8');
  const want = [
    ["/next-actions", "firm-wide priorities (PL-02)"],
    ["/alerts", "firm alerts (AX-05)"],
    ["/reports/practice", "the practice report at firm scale (PO-07)"],
    ["/communications", "the review queue across the firm (COMM-03)"],
    ["/scorecard", "one advisor against the firm (AX-08)"],
    ["/firm/advisors/", "one advisor's own figures (PO-06)"]
  ];
  const missing = want.filter(([p]) => !js.includes(p)).map(([p, why]) => `${p} — ${why}`);
  assert.deepEqual(missing, [], 'the Firm view no longer reaches: ' + missing.join('; '));
  // The supervisory read has a door too, and it is a deliberate press rather than a page load.
  assert.match(js, /advisorId: id/, 'Firm > Advisors must still be able to open an advisor\'s book (PO-06)');
  assert.match(js, /id="openBook"/, 'opening a book must stay an explicit action, not something arriving here does');
  // The first four are only firm-scope if they ask for it.
  for (const p of ['/next-actions', '/alerts', '/reports/practice', '/communications']) {
    const call = js.slice(js.indexOf(`'${p}'`));
    assert.match(call.slice(0, 200), /scope: 'firm'/, `${p} is called from the Firm view without scope=firm`);
  }
});

/* ---- the query surface ---- */

test('a query is scoped like every other operation', async () => {
  assert.equal((await call('grace', 'POST', '/queries', { question: 'how much cash' })).status, 403,
    'a client has no query surface: the client-safe boundary stays structural');
  assert.equal((await call('marcus', 'POST', '/queries', { question: 'cash', scope: 'firm' })).status, 403);
  assert.equal((await call('marcus', 'POST', '/queries', { question: 'cash', scope: 'household', householdId: 'h1' })).status, 404,
    'another advisor\'s household is not visible to a query either');
  assert.equal((await call('dana', 'POST', '/queries', {})).status, 400);
  assert.equal((await call('dana', 'POST', '/queries', { question: 'x', scope: 'nonsense' })).status, 400);
  assert.equal((await call('dana', 'POST', '/queries', { question: 'cash', scope: 'firm' })).status, 201);
});

test('an answer carries its sources, with a data-as-of date', async () => {
  const r = await call('dana', 'POST', '/queries', { question: 'which clients are holding idle cash?' });
  assert.equal(r.status, 201);
  assert.ok(r.data.citations.length > 0, 'an answer drawn from data must say what it drew on');
  for (const c of r.data.citations) {
    assert.ok(['greenmeadows', 'crm', 'calendar', 'platform'].includes(c.source));
    assert.ok(c.dataAsOf, 'X-04 requires a data-as-of date on every citation');
  }
  assert.ok(r.data.model, 'the answer must record what produced it');
});

test('a question about a source that does not exist says so, and answers nothing', async () => {
  const r = (await call('dana', 'POST', '/queries', { question: 'what did the Lindqvists email me about?' })).data;
  assert.equal(r.unanswerable.length, 1);
  assert.equal(r.unanswerable[0].source, 'email');
  assert.match(r.unanswerable[0].reason, /No inbox is connected/);
  assert.deepEqual(r.citations, [], 'nothing may be cited for a source that is not connected');
  assert.doesNotMatch(r.answer, /Lindqvist/, 'it must not improvise an answer about the household');

  const multi = (await call('dana', 'POST', '/queries', { question: 'what does the CRM say about their sentiment?' })).data;
  assert.deepEqual(multi.unanswerable.map(u => u.source).sort(), ['crm', 'sentiment']);
});

test('a query changes nothing', async () => {
  const before = await Promise.all([
    call('dana', 'GET', '/tasks'), call('dana', 'GET', '/alerts'), call('dana', 'GET', '/communications')
  ]);
  const r = await call('dana', 'POST', '/queries', { question: 'who have I not spoken to in a while?' });
  assert.deepEqual(r.data.actions, [], 'anything actionable is a draft, never applied here');
  const after = await Promise.all([
    call('dana', 'GET', '/tasks'), call('dana', 'GET', '/alerts'), call('dana', 'GET', '/communications')
  ]);
  assert.equal(after[0].data.items.length, before[0].data.items.length);
  assert.equal(after[1].data.items.length, before[1].data.items.length);
  assert.equal(after[2].data.totalItems, before[2].data.totalItems);
});

test('firm scope widens the answer, own scope does not', async () => {
  const own = (await call('dana', 'POST', '/queries', { question: 'how big is the book?' })).data;
  const firm = (await call('dana', 'POST', '/queries', { question: 'how big is the book?', scope: 'firm' })).data;
  assert.match(own.answer, /10 households/);
  assert.match(firm.answer, /28 households/);
});

test('questions are kept, and only for the person who asked', async () => {
  await call('dana', 'POST', '/queries', { question: 'idle cash please' });
  const mine = (await call('dana', 'GET', '/queries')).data;
  assert.ok(mine.totalItems >= 1);
  assert.equal((await call('marcus', 'GET', '/queries')).data.totalItems, 0, 'one advisor cannot read another\'s questions');
  const one = await call('dana', 'GET', '/queries/' + mine.items[0].id);
  assert.equal(one.status, 200);
  assert.equal((await call('marcus', 'GET', '/queries/' + mine.items[0].id)).status, 404);
});

test('an unmatched question admits it rather than inventing an answer', async () => {
  const r = (await call('dana', 'POST', '/queries', { question: 'what is the airspeed of a swallow' })).data;
  assert.deepEqual(r.citations, []);
  assert.match(r.answer, /matches phrasing rather than understanding/);
});

/* ---- system of record (docs/system-of-record.md) ---- */

test('records that will sync say where they stand with the CRM', async () => {
  const syncable = [
    ['/tasks', r => r.items],
    ['/communications', r => r.items],
    ['/prospects', r => r.items]
  ];
  for (const [p, pick] of syncable) {
    const items = pick((await call('dana', 'GET', p)).data);
    assert.ok(items.length > 0, p + ' should return something to check');
    for (const i of items) {
      assert.ok(i.sync, p + ' record has no sync state');
      assert.ok(['not_configured', 'pending', 'synced', 'failed', 'conflict'].includes(i.sync.status));
    }
  }
  const record = (await call('dana', 'GET', '/meetings/m5/record')).data;
  assert.ok(record.sync, 'a meeting record syncs to the CRM as a note (MEET-08)');
});

test('with no CRM connected, nothing claims to have reached one', async () => {
  const t = (await call('dana', 'GET', '/tasks')).data.items[0];
  assert.equal(t.sync.status, 'not_configured');
  assert.equal(t.sync.externalId, null, 'a record cannot name a CRM id it does not have');
  assert.equal(t.sync.lastSyncedAt, null);
  assert.equal(t.sync.system, null);

  const made = await call('dana', 'POST', '/tasks', { title: 'Call the Shahs' });
  assert.equal(made.data.sync.status, 'not_configured',
    'a task created here must not imply it was written to a CRM');
});

test('the client portal carries no sync state at all', async () => {
  for (const p of ['/me/household', '/me/shared', '/me/documents', '/me/fees']) {
    const body = JSON.stringify((await call('grace', 'GET', p)).data);
    assert.doesNotMatch(body, /"sync"|not_configured/, p + ' leaks internal sync plumbing to a client');
  }
});

/* ---- reporting, scorecards, next best action ---- */

test('the practice report compares a period with the one before it', async () => {
  const r = (await call('dana', 'GET', '/reports/practice?from=2026-09-01&to=2026-09-24')).data;
  assert.equal(r.scope, 'own');
  assert.equal(r.previousTo, '2026-08-31', 'the previous window must end the day before this one starts');
  assert.ok(r.metrics.length >= 8);
  for (const m of r.metrics) {
    assert.equal(m.change, m.value - m.previousValue, m.label + ' change must equal the difference');
    assert.ok(['count', 'usd'].includes(m.unit));
  }
  const overdue = r.metrics.find(m => m.id === 'tasksOverdue');
  assert.equal(overdue.lowerIsBetter, true, 'a rise in overdue work must not read as progress');
  assert.equal(r.metrics.find(m => m.id === 'aum').lowerIsBetter, false);
  assert.equal((await call('dana', 'GET', '/reports/practice?from=2026-09-24&to=2026-09-01')).status, 400);
});

test('firm scope on the report is principal-only and widens it', async () => {
  assert.equal((await call('marcus', 'GET', '/reports/practice?scope=firm')).status, 403);
  assert.equal((await call('grace', 'GET', '/reports/practice')).status, 403);
  const own = (await call('dana', 'GET', '/reports/practice')).data;
  const firm = (await call('dana', 'GET', '/reports/practice?scope=firm')).data;
  assert.equal(own.metrics.find(m => m.id === 'households').value, 10);
  assert.equal(firm.metrics.find(m => m.id === 'households').value, 28);
});

// Resolves the open question in HANDOFF section 9 about who sees performance tracking.
test('an advisor sees their own scorecard but never a rank, and never a colleague\'s', async () => {
  const mine = await call('marcus', 'GET', '/firm/advisors/adv2/scorecard');
  assert.equal(mine.status, 200);
  assert.ok(mine.data.metrics.length > 0);
  for (const m of mine.data.metrics) {
    assert.ok(typeof m.firmMedian === 'number', 'an advisor is compared with the firm median');
    assert.equal(m.rank, undefined, 'placing an advisor against named peers is a principal-only view');
  }
  assert.equal((await call('marcus', 'GET', '/firm/advisors/adv1/scorecard')).status, 403,
    'an advisor cannot read a colleague\'s scorecard');
  assert.equal((await call('grace', 'GET', '/firm/advisors/adv1/scorecard')).status, 403);

  const asPrincipal = (await call('dana', 'GET', '/firm/advisors/adv2/scorecard')).data;
  assert.ok(asPrincipal.metrics.every(m => m.rank >= 1 && m.outOf === 4), 'a principal sees the rank');
  assert.equal((await call('dana', 'GET', '/firm/advisors/nope/scorecard')).status, 404);
});

test('rank respects which direction is good', async () => {
  const cards = await Promise.all(['adv1', 'adv2', 'adv3', 'adv4']
    .map(id => call('dana', 'GET', `/firm/advisors/${id}/scorecard`).then(r => r.data)));
  const byAum = cards.slice().sort((a, b) => b.metrics.find(m => m.id === 'aum').value - a.metrics.find(m => m.id === 'aum').value);
  assert.equal(byAum[0].metrics.find(m => m.id === 'aum').rank, 1, 'most assets ranks first');
  const gaps = cards.map(c => c.metrics.find(m => m.id === 'contactGaps'));
  const best = gaps.reduce((a, b) => (a.value <= b.value ? a : b));
  assert.equal(best.rank, 1, 'fewest contact gaps ranks first, because lower is better');
});

test('next best action is drafts, prioritised, with reasons and sources', async () => {
  const r = (await call('dana', 'GET', '/next-actions')).data;
  assert.ok(r.totalItems > 0);
  const order = { high: 0, medium: 1, low: 2 };
  const seen = r.items.map(i => order[i.priority]);
  assert.deepEqual(seen, [...seen].sort((a, b) => a - b), 'items must come back prioritised');
  for (const i of r.items) {
    assert.ok(i.reason, i.title + ' must say why it is being suggested');
    assert.ok(i.citations.length > 0, i.title + ' must say what it is drawn from');
    assert.ok(i.suggestedTask && i.suggestedTask.title);
  }
  assert.equal((await call('grace', 'GET', '/next-actions')).status, 403);
  assert.equal((await call('marcus', 'GET', '/next-actions?scope=firm')).status, 403);
});

test('reading next best action creates nothing', async () => {
  const before = (await call('dana', 'GET', '/tasks')).data.items.length;
  const r = (await call('dana', 'GET', '/next-actions')).data;
  assert.equal((await call('dana', 'GET', '/tasks')).data.items.length, before, 'suggestions are not tasks');
  // Accepting one is an explicit post, exactly as the note on the response says.
  const first = r.items[0];
  await call('dana', 'POST', '/tasks', { title: first.suggestedTask.title, dueDate: first.suggestedTask.dueDate, householdId: first.suggestedTask.householdId || undefined });
  assert.equal((await call('dana', 'GET', '/tasks')).data.items.length, before + 1);
});

/* ---- ownership, team share, fee plan, modeling, playbooks, matching ---- */

test('the cap table is the principal\'s alone, and the percentages add up', async () => {
  assert.equal((await call('marcus', 'GET', '/firm/cap-table')).status, 403);
  assert.equal((await call('grace', 'GET', '/firm/cap-table')).status, 403);
  const c = (await call('dana', 'GET', '/firm/cap-table')).data;
  assert.equal(c.holders.reduce((a, h) => a + h.shares, 0), c.totalShares);
  assert.equal(Math.round(c.holders.reduce((a, h) => a + h.ownershipPct, 0)), 100);
  for (const h of c.holders) assert.equal(h.vested + h.unvested, h.shares, h.holder + ' vested and unvested must equal shares');
});

test('a team share widens access, is recorded, and either side can end it', async () => {
  assert.equal((await call('marcus', 'GET', '/households/h1')).status, 404, 'not visible before sharing');
  const share = await call('dana', 'POST', '/team-shares', { householdId: 'h1', advisorId: 'adv2', reason: 'Cover while away' });
  assert.equal(share.status, 201);
  assert.equal(share.data.access, 'read', 'a team share is read access; the owner stays the owner');
  assert.ok(share.data.sharedAt);

  const asMarcus = (await call('marcus', 'GET', '/team-shares')).data.items;
  assert.equal(asMarcus.length, 1);
  assert.equal(asMarcus[0].direction, 'in');

  assert.equal((await call('dana', 'POST', '/team-shares', { householdId: 'h1', advisorId: 'adv2' })).status, 409, 'sharing twice is refused');
  assert.equal((await call('dana', 'POST', '/team-shares', { householdId: 'h11', advisorId: 'adv2' })).status, 404, 'cannot share a household that is not yours');
  assert.equal((await call('dana', 'POST', '/team-shares', { householdId: 'h1', advisorId: 'adv1' })).status, 400);

  // The recipient can give it up, not only the owner.
  assert.equal((await call('marcus', 'DELETE', '/team-shares/' + share.data.id)).status, 204);
  assert.equal((await call('marcus', 'GET', '/team-shares')).data.items.filter(t => !t.revokedAt).length, 0);
});

test('the fee schedule cannot be left with a gap a household falls through', async () => {
  assert.equal((await call('marcus', 'PATCH', '/billing/fee-plan', { schedule: [{ minAssets: 0, maxAssets: null, annualRatePct: 1 }] })).status, 403,
    'the schedule is the firm\'s, so an advisor cannot change it');
  const bad = [
    [[{ minAssets: 1000, maxAssets: null, annualRatePct: 1 }], /start at zero/],
    [[{ minAssets: 0, maxAssets: 1e6, annualRatePct: 1 }, { minAssets: 2e6, maxAssets: null, annualRatePct: 0.8 }], /meet exactly/],
    [[{ minAssets: 0, maxAssets: 1e6, annualRatePct: 1 }], /open-ended/],
    [[{ minAssets: 0, maxAssets: null, annualRatePct: 9 }], /between 0 and 5/]
  ];
  for (const [schedule, re] of bad) {
    const r = await call('dana', 'PATCH', '/billing/fee-plan', { schedule });
    assert.equal(r.status, 400);
    assert.match(r.data.message, re);
  }
  const good = await call('dana', 'PATCH', '/billing/fee-plan', {
    schedule: [{ minAssets: 0, maxAssets: 5e6, annualRatePct: 0.9 }, { minAssets: 5e6, maxAssets: null, annualRatePct: 0.6 }] });
  assert.equal(good.status, 200);
  assert.equal(good.data.updatedBy, 'Dana Whitfield', 'a fee change must be attributed');
});

test('a fee override needs a reason, and flows through to what the client sees', async () => {
  assert.equal((await call('dana', 'PATCH', '/billing/fees/h3', { annualRatePct: 0.4 })).status, 400,
    'a change to what a client is billed must say why');
  assert.equal((await call('dana', 'PATCH', '/billing/fees/h11', { annualRatePct: 0.4, reason: 'x' })).status, 404,
    'an advisor cannot reprice another advisor\'s household');

  const before = (await call('grace', 'GET', '/me/fees')).data.items[0].amount;
  const set = await call('dana', 'PATCH', '/billing/fees/h3', { annualRatePct: 0.4, reason: 'Long-standing relationship' });
  assert.equal(set.status, 200);
  assert.equal(set.data.setBy, 'Dana Whitfield');
  const after = (await call('grace', 'GET', '/me/fees')).data.items[0].amount;
  assert.ok(after < before, 'the client portal must bill the overridden rate, not the schedule');

  const advisorView = (await call('dana', 'GET', '/billing/fees')).data.items.find(f => f.householdId === 'h3');
  assert.equal(advisorView.quarterlyFee, after, 'the two views must still agree after an override');

  await call('dana', 'PATCH', '/billing/fees/h3', { annualRatePct: null });
  assert.equal((await call('grace', 'GET', '/me/fees')).data.items[0].amount, before, 'removing the override restores the schedule rate');
});

test('a model comparison is a comparison, and never places a trade', async () => {
  const models = (await call('dana', 'GET', '/models')).data;
  assert.ok(models.items.length >= 3);
  const c = (await call('dana', 'POST', '/households/h1/model-comparison', { modelId: 'mdl_conservative' })).data;
  assert.equal(c.placed, false, 'placing a trade is PM-05 and is on the regulatory list');
  assert.match(c.note, /No trade has been placed/);
  assert.equal(Math.round(c.lines.reduce((t, l) => t + l.targetPct, 0)), 100);
  for (const l of c.lines) assert.equal(l.changePct, +(l.targetPct - l.currentPct).toFixed(1));
  assert.ok(c.turnoverPct > 0);
  assert.equal((await call('dana', 'POST', '/households/h1/model-comparison', { modelId: 'nope' })).status, 400);
  assert.equal((await call('dana', 'POST', '/households/h7/model-comparison', { modelId: 'mdl_income' })).status, 409,
    'a household with no allocation has nothing to compare');
  assert.equal((await call('marcus', 'POST', '/households/h1/model-comparison', { modelId: 'mdl_income' })).status, 404);
});

test('running a playbook creates dated follow-ups', async () => {
  const before = (await call('dana', 'GET', '/tasks')).data.items.length;
  const pbs = (await call('dana', 'GET', '/playbooks')).data.items;
  assert.ok(pbs.length >= 3);
  const r = await call('dana', 'POST', '/playbooks/pb1/runs', { householdId: 'h3', anchorDate: '2026-10-15' });
  assert.equal(r.status, 201);
  assert.equal(r.data.tasks.length, pbs.find(p => p.id === 'pb1').steps.length);
  assert.equal((await call('dana', 'GET', '/tasks')).data.items.length, before + r.data.tasks.length);
  // A step at -10 days should land before the anchor, which is the point of an offset.
  assert.ok(r.data.tasks.some(t => t.dueDate < '2026-10-15'), 'preparation steps fall before the meeting');
  assert.ok(r.data.tasks.every(t => t.origin === 'playbook'));
  assert.equal((await call('dana', 'POST', '/playbooks/nope/runs', {})).status, 404);
  assert.equal((await call('dana', 'POST', '/playbooks/pb1/runs', { householdId: 'h11' })).status, 404);
});

test('advisor matching ranks with its reasoning, and moves nobody', async () => {
  const r = (await call('dana', 'GET', '/prospects/p1/matches')).data;
  assert.equal(r.items.length, 4);
  const scores = r.items.map(i => i.score);
  assert.deepEqual(scores, [...scores].sort((a, b) => b - a), 'matches come back ranked');
  for (const m of r.items) assert.ok(m.reasons.length >= 2, m.advisorName + ' must say why');
  assert.match(r.note, /human decision/);
  const after = (await call('dana', 'GET', '/prospects/p1')).data;
  assert.equal(after.id, 'p1', 'reading matches must not reassign the prospect');
  assert.equal((await call('marcus', 'GET', '/prospects/p1/matches')).status, 404);
});

/* ---- model-backed drafts over HTTP ---- */

test('a meeting summary is a draft, and consent still gates it', async () => {
  assert.equal((await call('grace', 'POST', '/meetings/m5/record/summary', {})).status, 403);
  const r = await call('dana', 'POST', '/meetings/m5/record/summary', {});
  assert.equal(r.status, 201);
  assert.equal(r.data.accepted, false);
  assert.equal(r.data.capability, 'meeting_summary');
  assert.ok(r.data.provenance.readFrom.length > 0, 'it must name the record it read');
  // The record itself is untouched: a summary is not filed against the meeting.
  assert.equal((await call('dana', 'GET', '/meetings/m5/record')).data.content.includes('gifting'), true);
  assert.equal((await call('dana', 'POST', '/meetings/m14/record/summary', {})).status, 409,
    'no consent, no transcript, and so no summary of one either');
});

test('an agenda is drawn from the household, and creates nothing', async () => {
  const before = (await call('dana', 'GET', '/tasks')).data.items.length;
  const r = await call('dana', 'POST', '/meetings/m7/agenda', {});
  assert.equal(r.status, 201);
  assert.equal(r.data.capability, 'meeting_agenda');
  assert.equal(r.data.accepted, false);
  assert.ok(r.data.provenance.readFrom.some(c => c.source === 'calendar'));
  assert.equal((await call('dana', 'GET', '/tasks')).data.items.length, before, 'an agenda is not a task list');
  assert.equal((await call('marcus', 'POST', '/meetings/m7/agenda', {})).status, 404);
});

test('a redraft sits beside the message and never replaces it', async () => {
  const original = (await call('dana', 'GET', '/communications/cm1')).data.body;
  const r = await call('dana', 'POST', '/communications/cm1/redraft', { tone: 'Formal' });
  assert.equal(r.status, 201);
  assert.equal(r.data.accepted, false);
  assert.equal((await call('dana', 'GET', '/communications/cm1')).data.body, original,
    'the stored message must be unchanged by a redraft');
  assert.equal((await call('dana', 'POST', '/communications/cm1/redraft', { tone: 'Shouty' })).status, 400);

  await call('dana', 'PATCH', '/communications/cm1', { status: 'approved' });
  await call('dana', 'PATCH', '/communications/cm1', { status: 'sent' });
  assert.equal((await call('dana', 'POST', '/communications/cm1/redraft', {})).status, 409,
    'a sent message cannot be redrafted');
});

test('model status is reported without any credential', async () => {
  const r = await call('dana', 'GET', '/ai/status');
  assert.equal(r.status, 200);
  assert.equal(typeof r.data.live, 'boolean');
  assert.doesNotMatch(JSON.stringify(r.data), /sk-ant|ANTHROPIC_API_KEY/);
  assert.equal((await call('grace', 'GET', '/ai/status')).status, 403);
});

// The feature-to-API map is generated from the requirement ids in openapi.yaml. If it drifts,
// the document is claiming a link the contract does not make.
test('docs/feature-api-map.md matches the contract', async () => {
  const r = await new Promise((resolve) => {
    const p = spawn(process.execPath, [path.join(__dirname, '..', 'tools', 'feature-map.js'), '--check']);
    let err = ''; p.stderr.on('data', d => { err += d; });
    p.on('close', code => resolve({ code, err }));
  });
  assert.equal(r.code, 0, r.err.trim() || 'the generator failed');
});

test('every requirement id named in the contract is a real one', () => {
  const spec = fs.readFileSync(path.join(__dirname, '..', 'openapi.yaml'), 'utf8');
  const sizes = { IP: 11, MEET: 8, COMM: 5, PO: 12, PM: 5, PL: 2, RTI: 10, GP: 10, AX: 12, X: 15 };
  const bad = [...new Set(spec.match(/\b(?:IP|MEET|COMM|PO|PM|PL|RTI|GP|AX|X)-\d{2}\b/g) || [])]
    .filter(id => { const [p, n] = id.split('-'); return Number(n) < 1 || Number(n) > sizes[p]; });
  assert.deepEqual(bad, [], 'the contract references requirement ids that do not exist: ' + bad.join(', '));
});

// The section nav is mounted outside #view so it can move above the header on a phone, which
// means replacing the view does not remove it. The client portal has no sections, and was
// inheriting whichever nav was rendered last — the firm spine, Ownership and Billing included.
test('a view with no sections cannot inherit the last one\'s nav', () => {
  const app = fs.readFileSync(path.join(__dirname, '..', 'dashboard', 'js', 'app.js'), 'utf8');
  const fn = app.slice(app.indexOf('function showView'), app.indexOf('async function boot'));
  assert.match(fn, /querySelectorAll\('\.subnav'\)[\s\S]{0,40}remove\(\)/,
    'showView must clear the section nav before rendering, or a view without sections keeps the last one');
  const client = fs.readFileSync(path.join(__dirname, '..', 'dashboard', 'js', 'client.js'), 'utf8');
  assert.doesNotMatch(client, /subnav\(/, 'the client portal has no sections and must not render a nav');
});
