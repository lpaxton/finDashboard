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
    'lastContactAt', 'origin', 'originMeetingId', 'sourceId', 'severity', 'sentiment'];
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
  assert.equal(ops.length, 26, 'spec should list 26 operations');
  const params = { householdId: 'h3', meetingId: 'm1', taskId: 't1', alertId: 'a1', signalId: 'sig_idle_cash', advisorId: 'adv2', documentId: 'd1' };
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
