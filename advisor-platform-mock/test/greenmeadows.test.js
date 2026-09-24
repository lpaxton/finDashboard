/*
 * The adapter, against the fake Green Meadows.
 *
 * The fake reproduces the awkward parts of the real API on purpose, so these tests are about
 * the things that actually break a custodial integration: envelopes, credential leakage,
 * fan-out limits, and data the custodian says it cannot vouch for.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { createCredentials, redact } from '../src/greenmeadows/credentials.js';
import { createClient, unwrap, chunk, LIMITS, GreenMeadowsError } from '../src/greenmeadows/client.js';
import { createFakeGreenMeadows } from '../src/greenmeadows/fake.js';
import { createAdapter } from '../src/greenmeadows/adapter.js';
import * as map from '../src/greenmeadows/mappers.js';

const creds = () => createCredentials({
  apiKey: 'test-key-not-a-real-one',
  getUserToken: async () => ({ token: 'user-token', expiresAt: Date.now() + 600_000 }),
  getSystemToken: async () => ({ token: 'system-token', expiresAt: Date.now() + 600_000 })
});

const build = (fakeOpts) => {
  const fake = createFakeGreenMeadows(fakeOpts);
  const client = createClient({ credentials: creds(), transport: fake.transport });
  return { fake, client, adapter: createAdapter({ client }) };
};

const ctx = { traceId: 'trace-1', userId: 'u1' };

/* ---- credentials ---- */

test('credentials never leave the module', () => {
  const c = creds();
  const described = c.describe();
  assert.equal(described.apiKey, '[redacted]');
  assert.doesNotMatch(JSON.stringify(c), /test-key-not-a-real-one/, 'stringifying must not reveal the key');
  assert.doesNotMatch(String(c.toJSON().apiKey), /test-key/);
});

test('redact removes secrets at any depth, by name', () => {
  const out = redact({
    x_gm_api_key: 'KEY', nested: { x_gm_ext_token: 'TOK', taxId: '123-45-6789', keep: 'fine' },
    list: [{ Authorization: 'Bearer abc' }]
  });
  assert.equal(out.x_gm_api_key, '[redacted]');
  assert.equal(out.nested.x_gm_ext_token, '[redacted]');
  assert.equal(out.nested.taxId, '[redacted]', 'a tax ID must never survive redaction');
  assert.equal(out.nested.keep, 'fine');
  assert.equal(out.list[0].Authorization, '[redacted]');
});

test('an error carries no credential', async () => {
  const fake = createFakeGreenMeadows();
  const client = createClient({ credentials: creds(), transport: fake.transport, retries: 0 });
  await assert.rejects(
    () => client.call('/ftgw/fcat/nope', { ...ctx }),
    (e) => {
      assert.ok(e instanceof GreenMeadowsError);
      assert.equal(e.status, 404);
      assert.doesNotMatch(JSON.stringify(e.body ?? {}), /test-key-not-a-real-one|user-token/);
      return true;
    });
});

test('the log line carries the trace id and never the headers', async () => {
  const fake = createFakeGreenMeadows();
  const lines = [];
  const client = createClient({ credentials: creds(), transport: fake.transport, log: (l, d) => lines.push({ l, d }) });
  await client.call('/ftgw/fcat/customer/user/v4/accounts/summary', { ...ctx });
  assert.equal(lines.length, 1);
  assert.match(lines[0].l, /GM GET/);
  assert.equal(lines[0].d.traceId, 'trace-1');
  assert.doesNotMatch(JSON.stringify(lines[0]), /test-key-not-a-real-one|user-token/);
});

test('a call without credentials is refused by the fake', async () => {
  const fake = createFakeGreenMeadows();
  const res = await fake.transport({ url: 'https://gp-sandbox.fidelity.com/ftgw/fcat/customer/user/v4/accounts/summary', method: 'GET', headers: {} });
  assert.equal(res.status, 401);
});

test('the trace id is forwarded to Green Meadows', async () => {
  const { fake, client } = build();
  await client.call('/ftgw/fcat/customer/user/v4/accounts/summary', { ...ctx });
  assert.equal(fake.calls[0].traceId, 'trace-1', 'x-trace-id must arrive as x_gm_ext_traceid');
});

/* ---- envelopes ---- */

test('unwrap handles every envelope the subsystems use', () => {
  assert.deepEqual(unwrap({ accounts: [1, 2] }).items, [1, 2], 'user/v4');
  assert.deepEqual(unwrap({ content: [3], page: { size: 1 } }).items, [3], 'bookkeeping');
  assert.deepEqual(unwrap({ data: [4], metadata: {} }).items, [4], 'portfolios RIA, snake_case');
  assert.deepEqual(unwrap([{ content: [5], page: {} }]).items, [5], 'reports: array of { content, page }');
  assert.deepEqual(unwrap([6, 7]).items, [6, 7], 'models: bare array');
  assert.equal(unwrap({ content: [8], pagination: { pageNumber: 0 } }).page.pageNumber, 0, 'margin uses pagination');
  assert.deepEqual(unwrap(null).items, []);
});

/* ---- fan-out limits ---- */

test('balance history is split to respect the 30-account limit', async () => {
  const { fake, adapter } = build({ accountCount: 6 });
  const many = Array.from({ length: 70 }, (_, i) => 1083386981 + i);
  fake.reset();
  await adapter.balanceHistory(many, { from: '2026-09-01', to: '2026-09-03', ...ctx });
  const calls = fake.calls.filter(c => c.path.endsWith('/balance-history/search'));
  assert.equal(calls.length, 3, '70 accounts must become 3 calls, not 1');
  for (const c of calls) assert.ok(c.accounts.length <= LIMITS.balanceHistoryAccounts);
});

test('exceeding the limit in one call is refused by Green Meadows', async () => {
  const { client } = build();
  await assert.rejects(() => client.call('/ftgw/fcat/bookkeeping/v1/balance-history/search', {
    method: 'POST', ...ctx,
    body: { accountNumbers: Array.from({ length: 31 }, (_, i) => i), startDate: '2026-09-01', endDate: '2026-09-02' }
  }), /At most 30/);
});

test('tax lots fan out to one call per account per sub-account code', async () => {
  const { fake, adapter } = build();
  const numbers = fake.accounts.slice(0, 3).map(a => a.accountNumber);
  fake.reset();
  await adapter.openTaxLots(numbers, ctx);
  const calls = fake.calls.filter(c => c.path.endsWith('/opentaxlot/get'));
  assert.equal(calls.length, 6, '3 accounts x CASH and MRGN');
});

/* ---- the trend, and what the custodian will not vouch for ---- */

test('daily balances become monthly month-end points, summed across accounts', () => {
  const points = [
    { accountNumber: 1, balanceDate: '2026-08-30', value: 100 },
    { accountNumber: 2, balanceDate: '2026-08-30', value: 50 },
    { accountNumber: 1, balanceDate: '2026-08-31', value: 110 },
    { accountNumber: 2, balanceDate: '2026-08-31', value: 55 },
    { accountNumber: 1, balanceDate: '2026-09-01', value: 120 }
  ];
  const trend = map.toTrend(points);
  assert.deepEqual(trend, [{ month: '2026-08', value: 165 }, { month: '2026-09', value: 120 }]);
});

test('a day the custodian flagged is marked estimated, not shown as fact', () => {
  const trend = map.toTrend([
    { accountNumber: 1, balanceDate: '2026-08-31', value: 100, error: true, accuracyNote: 'Unpriced: 922908769' },
    { accountNumber: 2, balanceDate: '2026-08-31', value: 50 }
  ]);
  assert.equal(trend[0].estimated, true, 'one unpriced account makes the household total an estimate');
  assert.equal(map.trendHasFlaggedPoints(trend), true);
  assert.equal(map.trendHasFlaggedPoints([{ month: '2026-08', value: 1 }]), false);
});

test('the client household carries the estimate flag through to the portal', async () => {
  const { adapter } = build();
  const h = await adapter.clientHousehold({ ...ctx, name: 'Okafor household', advisorName: 'Dana Whitfield', from: '2025-10-01', to: '2026-09-24' });
  assert.equal(h.trend.length, 12, 'twelve month-end points');
  assert.equal(typeof h.trendHasEstimates, 'boolean');
  assert.ok(h.aum > 0);
  assert.ok(h.accounts.length > 0);
});

/* ---- client safety ---- */

test('client accounts carry no status of any kind', async () => {
  const { adapter } = build();
  const h = await adapter.clientHousehold({ ...ctx, name: 'x', advisorName: 'y', from: '2026-08-01', to: '2026-09-24' });
  for (const a of h.accounts) {
    for (const k of ['status', 'openingStatus', 'accountNumber', 'restrictions', 'userId']) {
      assert.ok(!(k in a), 'client account leaks ' + k);
    }
    assert.match(a.maskedNumber, /^\*{4}\d{4}$/);
  }
});

test('a document download link never reaches the client shape', async () => {
  const { adapter, fake } = build();
  const docs = await adapter.clientDocuments({ accountNumbers: [fake.accounts[0].accountNumber], from: '2026-01-01', to: '2026-12-31', ...ctx });
  assert.ok(docs.length > 0);
  for (const d of docs) {
    assert.ok(!('link' in d), 'a custodian download URL must be proxied, never handed out');
    assert.match(d.maskedNumber ?? d.maskedAccountNumber, /^\*{4}\d{4}$/);
  }
  assert.deepEqual([...new Set(docs.map(d => d.docType))].sort(), ['statement', 'tax'],
    'Green Meadows doc types must be mapped to the contract vocabulary');
});

/* ---- gain and loss comes from performance, not positions ---- */

test('per-account gain and loss comes from accounts/performance', async () => {
  const { adapter, fake } = build();
  const n = fake.accounts[0].accountNumber;
  const [perf] = await adapter.performance([n], ctx);
  const gm = (await adapter.accounts(ctx)).find(a => a.accountNumber === n);
  const acct = map.toAccount(gm, { performance: perf });
  assert.equal(acct.totalGainLoss, perf.totalUnrealizedProfitAndLoss);
  assert.equal(acct.todayGainLoss, perf.todaysUnrealizedProfitAndLoss);
  // Positions must not be the source: the reference marks its gain/loss "Not applicable".
  const pos = await adapter.positions([n], ctx);
  assert.ok(pos.every(p => p.totalGainLoss === undefined), 'the fake reproduces the missing fields');
});

/* ---- allocation ---- */

test('allocation is classified from the model, since positions carry no asset class', async () => {
  const { adapter, fake } = build({ pricesPositions: true });
  const withModel = fake.accounts.find(a => a.portfolioModel);
  const a = await adapter.allocation({ accountNumbers: [withModel.accountNumber], ...ctx });
  assert.ok(a.priced);
  assert.ok(a.model && a.model.name);
  assert.ok(a.lines.length >= 4);
  assert.equal(Math.round(a.lines.reduce((t, l) => t + l.currentPct, 0)), 100);
  assert.equal(a.unclassifiedPct, 0);
  assert.ok(a.maxDriftPoints >= 0);
  assert.ok(a.driftThresholdPoints > 0, 'the threshold belongs to the model, not to us');
});

test('when positions are unpriced, allocation says so instead of charting zeroes', async () => {
  const { adapter, fake } = build({ pricesPositions: false });
  const withModel = fake.accounts.find(a => a.portfolioModel);
  const a = await adapter.allocation({ accountNumbers: [withModel.accountNumber], ...ctx });
  assert.equal(a.priced, false);
  assert.match(a.unavailableReason, /did not return position values/);
});

test('an account with no model returns no allocation rather than a wrong one', async () => {
  const { adapter, fake } = build({ pricesPositions: true });
  const noModel = fake.accounts.find(a => !a.portfolioModel);
  const a = await adapter.allocation({ accountNumbers: [noModel.accountNumber], ...ctx });
  assert.equal(a.model, null);
  assert.deepEqual(a.lines, []);
});

/* ---- harvesting ---- */

test('harvesting returns losses worst first, with the wash-sale amount', async () => {
  const { adapter, fake } = build();
  const numbers = fake.accounts.slice(0, 4).map(a => a.accountNumber);
  const candidates = await adapter.harvesting({ accountNumbers: numbers, minLoss: 1, ...ctx });
  assert.ok(candidates.length > 0);
  for (const c of candidates) {
    assert.ok(c.unrealizedLoss > 0, 'losses are reported as positive amounts');
    assert.ok('washSaleAmount' in c, 'a harvesting candidate is not actionable without it');
    assert.match(c.maskedAccountNumber, /^\*{4}\d{4}$/);
  }
  const losses = candidates.map(c => c.unrealizedLoss);
  assert.deepEqual(losses, [...losses].sort((a, b) => b - a));
});

/* ---- account types ---- */

test('4-character account type codes are mapped, and an unknown code survives', () => {
  assert.equal(map.labelForAccountType('ROTH'), 'Roth IRA');
  assert.equal(map.labelForAccountType('ZZZZ'), 'ZZZZ', 'an unmapped code must not become "undefined" on a screen');
  assert.equal(map.maskAccountNumber(1083386981), '****6981');
  assert.equal(map.maskAccountNumber(7), '****0007');
});

/* ---- retries ---- */

test('5xx is retried, 4xx is not', async () => {
  let calls = 0;
  const flaky = async () => { calls++; return calls < 3 ? { status: 503, json: {} } : { status: 200, json: { accounts: [] } }; };
  const ok = createClient({ credentials: creds(), transport: flaky, retries: 2 });
  await ok.call('/x', ctx);
  assert.equal(calls, 3, 'two retries then success');

  calls = 0;
  const bad = createClient({ credentials: creds(), transport: async () => { calls++; return { status: 400, json: {} }; }, retries: 2 });
  await assert.rejects(() => bad.call('/x', ctx));
  assert.equal(calls, 1, 'a 400 must not be retried');
});

test('chunk splits exactly at the boundary', () => {
  assert.equal(chunk(Array.from({ length: 30 }, (_, i) => i), 30).length, 1);
  assert.equal(chunk(Array.from({ length: 31 }, (_, i) => i), 30).length, 2);
  assert.deepEqual(chunk([], 30), []);
});
