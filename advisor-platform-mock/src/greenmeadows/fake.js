/*
 * A fake Green Meadows, shaped by ./schemas.js.
 *
 * It answers the real paths with the real envelopes and the real field names, so the adapter
 * and the credential handling can be built and tested before a sandbox key exists. The VALUES
 * are invented; the SHAPES are transcribed from the reference.
 *
 * It deliberately reproduces the awkward parts, because those are what break a naive adapter:
 *   - four different envelopes
 *   - accountNumber as int64 here, string there
 *   - positions with currentValue and the securityClassification fields absent
 *   - balance history daily, capped at 30 accounts, with points flagged inaccurate
 *   - rebalances in snake_case
 *
 * Swap this for recorded sandbox responses when they exist. Nothing above it should change.
 */
import { LIMITS } from './client.js';

const ACCOUNT_TYPES = ['INDV', 'JTWR', 'IRAT', 'ROTH', 'TRUS'];

/** Deterministic, so tests do not drift. */
const hash = (s) => { let x = 7; for (const c of String(s)) x = (x * 31 + c.charCodeAt(0)) >>> 0; return x; };
const pick = (arr, seed) => arr[hash(seed) % arr.length];
const money = (seed, min, max) => min + (hash(seed) % (max - min));

/**
 * @param {object} [opts]
 * @param {number} [opts.accountCount]
 * @param {boolean} [opts.pricesPositions] Whether includeCurrentValue populates currentValue.
 *   The reference contradicts itself here, so it is a switch: build for both until confirmed.
 */
export function createFakeGreenMeadows({ accountCount = 6, pricesPositions = false } = {}) {
  const accounts = Array.from({ length: accountCount }, (_, i) => {
    const accountNumber = 1083386981 + i * 137;
    return {
      accountNumber,
      userId: 5000 + Math.floor(i / 2),           // two accounts per user, so households have >1
      accountType: pick(ACCOUNT_TYPES, accountNumber),
      status: i === accountCount - 1 ? 'dormant' : 'active',
      portfolioModel: i % 3 === 0 ? 'mdl-growth-70-30' : (i % 3 === 1 ? 'mdl-balanced-60-40' : null),
      networth: money(accountNumber, 250_000, 9_000_000)
    };
  });
  const byNumber = new Map(accounts.map(a => [a.accountNumber, a]));
  const calls = [];

  const model = (id, name, holdings, driftThreshold) => ({
    id, name, description: name + ' model portfolio',
    riskLevel: driftThreshold > 0.05 ? 'Aggressive' : 'Moderate',
    driftMethod: 'Absolute', driftThreshold, maxTotalDrift: 0.15,
    rebalanceFrequency: 'Quarterly', rebalanceCooldownDays: 30,
    clearingFirmId: 'CF01', introducingFirmId: 'IF01', firm3Id: 'F3', firm4Id: 'F4',
    currentVersion: 3, archived: false,
    holdings: holdings.map((h, i) => ({
      id: `${id}-h${i}`, modelId: id, universeId: `u${i}`, ticker: h.ticker, tickerName: h.name,
      targetPercent: h.target, category: h.category, subCategory: h.sub, sortOrder: i,
      createdAt: '2025-01-02T00:00:00.000Z', updatedAt: '2026-06-01T00:00:00.000Z'
    }))
  });

  const MODELS = [
    model('mdl-growth-70-30', 'Growth, 70/30', [
      { ticker: 'VTI', name: 'Total US Market', target: 45, category: 'US equity', sub: 'Broad market' },
      { ticker: 'VXUS', name: 'Total International', target: 20, category: 'International equity', sub: 'Developed' },
      { ticker: 'BND', name: 'Total Bond Market', target: 25, category: 'Fixed income', sub: 'Aggregate' },
      { ticker: 'GCASH', name: 'Core cash', target: 5, category: 'Cash', sub: 'Core' },
      { ticker: 'VNQ', name: 'Real Estate', target: 5, category: 'Alternatives', sub: 'REIT' }
    ], 0.07),
    model('mdl-balanced-60-40', 'Balanced, 60/40', [
      { ticker: 'VTI', name: 'Total US Market', target: 40, category: 'US equity', sub: 'Broad market' },
      { ticker: 'VXUS', name: 'Total International', target: 20, category: 'International equity', sub: 'Developed' },
      { ticker: 'BND', name: 'Total Bond Market', target: 30, category: 'Fixed income', sub: 'Aggregate' },
      { ticker: 'GCASH', name: 'Core cash', target: 5, category: 'Cash', sub: 'Core' },
      { ticker: 'VNQ', name: 'Real Estate', target: 5, category: 'Alternatives', sub: 'REIT' }
    ], 0.05)
  ];

  /* ---- the routes, keyed exactly as the reference documents them ---- */
  const routes = [
    ['GET', '/ftgw/fcat/customer/user/v4/accounts/summary', () => ({
      // user/v4 envelope: { accounts: [...] }, no paging
      accounts: accounts.map(a => ({
        accountNumber: a.accountNumber, accountReg: 'INDV', accountSubReg: '', accountSubType: 'CASH',
        accountType: a.accountType, accountManagementType: 'RIA', portfolioModel: a.portfolioModel,
        corePosition: 'GCASH', eDeliveryPreferences: { statements: true }, nonCustomerInd: false,
        status: a.status, createdTs: '2023-04-11T14:02:00.000Z', closedTs: null,
        accountRelationships: [{ relationshipType: 'OW', relationshipTypeRole: 'PO',
          mailingAddress: { line1: '1 Example Street', postalCode: '02109' }, userId: a.userId }],
        owningFirmId: 'OF01', verificationDetail: {}, p2pVerificationDetail: {}
      }))
    })],

    ['POST', '/ftgw/fcat/bookkeeping/v2/accounts/balances/search', (body) => ({
      // bookkeeping envelope: { content: [...] }
      content: (body.accountNumbers || []).map(n => {
        const a = byNumber.get(n);
        const networth = a ? a.networth : 0;
        return {
          firmId: 'FIBS', accountNumber: n, linkedAccountNumber: 0,
          // only populated when asked for, exactly as documented
          accountNetworth: (body.include || []).includes('accountNetworth') ? networth : 0,
          cashAccountMarketValue: Math.round(networth * 0.9),
          cashAmt: Math.round(networth * (hash(n) % 17) / 100),
          coreAmt: Math.round(networth * 0.02),
          settledCashBalanceAmt: Math.round(networth * 0.04),
          tradeDateBalanceAmt: networth,
          lastUpdatedTstp: '2026-09-24T02:10:00.000Z',
          restrictions: { freeRidingRestr: false, liquidationRestr: n % 3 === 0, goodFaithRestr: false },
          owningFirmId: 'OF01'
        };
      })
    })],

    ['POST', '/ftgw/fcat/bookkeeping/v1/balance-history/search', (body) => {
      const nums = body.accountNumbers || [];
      if (nums.length > LIMITS.balanceHistoryAccounts) {
        return { __status: 400, errorMessages: [{ code: 'TOO_MANY', detail: `At most ${LIMITS.balanceHistoryAccounts} account numbers` }] };
      }
      const start = new Date(body.startDate), end = new Date(body.endDate);
      const points = [];
      for (const n of nums) {
        const a = byNumber.get(n);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const key = n + d.toISOString().slice(0, 10);
          // roughly 1 day in 40 is flagged, which is what makes the client chart interesting
          const flagged = hash(key) % 40 === 0;
          points.push({
            accountNumber: n,
            balanceDate: d.toISOString().slice(0, 10),
            value: a ? Math.round(a.networth * (0.92 + (hash(key) % 160) / 1000)) : 0,
            securitiesValue: a ? Math.round(a.networth * 0.9) : 0,
            sdBalanceAmt: 0, tdBalanceAmt: 0, sweepAmt: 0,
            error: flagged,
            accuracyNote: flagged ? 'Unpriced securities on this date: 922908769' : null
          });
        }
      }
      // balance-history nests a single object under content, with page beside it
      return { content: points, page: { size: points.length, totalElements: points.length, totalPages: 1, number: 0 } };
    }],

    ['POST', '/ftgw/fcat/bookkeeping/v1/accounts/performance/get', (body) => ({
      content: (body.accountNumbers || []).map(n => {
        const a = byNumber.get(n);
        const v = a ? a.networth : 0;
        return {
          accountNumber: n,
          todaysUnrealizedProfitAndLoss: Math.round(v * ((hash(n + 'd') % 40) - 15) / 10000),
          todaysUnrealizedProfitAndLossPercentage: 0.12,
          totalUnrealizedProfitAndLoss: Math.round(v * 0.17),
          totalUnrealizedProfitAndLossPercentage: 17,
          todaysRealizedProfitAndLoss: 0,
          totalRealizedProfitAndLoss: Math.round(v * 0.02),
          totalMarketValue: v
        };
      })
    })],

    ['POST', '/ftgw/fcat/bookkeeping/v3/positions/get', (body) => ({
      content: (body.accountNumbers || []).flatMap(n => {
        const a = byNumber.get(n);
        const m = MODELS.find(x => x.id === (a && a.portfolioModel)) || MODELS[0];
        return m.holdings.map(h => {
          // drift the actual weights away from target so the signal has something to find
          const actual = h.targetPercent + ((hash(n + h.ticker) % 15) - 6);
          const value = a ? Math.round(a.networth * Math.max(actual, 0) / 100) : 0;
          const pos = {
            accountNumber: n, accountSubType: 'CASH', cusip: String(900000000 + hash(h.ticker) % 99999999),
            symbol: h.ticker, securityId: 'SEC' + hash(h.ticker), description: h.tickerName,
            tdQuantity: Math.max(1, Math.round(value / 100)), availableTdQuantity: Math.max(1, Math.round(value / 100)),
            costBasis: Math.round(value * 0.86), costBasisPerShare: 86,
            coreAccountIndicator: h.ticker === 'GCASH',
            multiplier: 1, intraDayActivityIndicator: false, editCostBasisIndicator: false,
            owningFirmId: 'OF01'
          };
          // The reference marks these "Not applicable". The switch exists because it also
          // offers includeCurrentValue as a pricing flag, and does not resolve the contradiction.
          if (pricesPositions && body.includeCurrentValue) {
            pos.currentValue = value;
            pos.lastPrice = 100;
            pos.totalGainLoss = Math.round(value * 0.14);
            pos.todayGainLoss = Math.round(value * 0.001);
          }
          return pos;
        });
      })
    })],

    ['POST', '/ftgw/fcat/bookkeeping/v2/opentaxlot/get', (body) => {
      const n = body.accountNumber;
      if (!n || !['CASH', 'MRGN'].includes(body.subAccountCode)) {
        return { __status: 400, errorMessages: [{ code: 'BAD_REQUEST', detail: 'accountNumber and subAccountCode are required' }] };
      }
      if (body.subAccountCode === 'MRGN') return { __status: 204 };
      const a = byNumber.get(n);
      return {
        content: ['VTI', 'VXUS', 'BND'].map((sym, i) => {
          const cost = a ? Math.round(a.networth / 10) : 1000;
          const gain = ((hash(n + sym) % 200) - 140) / 100;   // often negative, which is the point
          return {
            taxlotId: `${n}-${sym}-${i}`, accountNumber: n, subAccountCode: 'CASH',
            purchaseDate: '2024-03-14', purchaseTimestamp: '2024-03-14T15:04:00.000Z',
            symbol: sym, cusip: String(900000000 + hash(sym) % 99999999), securityName: sym + ' ETF',
            originalQuantity: 100, availableQuantity: 100, price: 84,
            costBasis: cost, costBasisPerShare: 84, customerViewCostBasis: cost,
            unrealizedGainOrLoss: Math.round(cost * gain / 10),
            washSaleAmount: 0, coveredFlag: true, holdingPeriod: 'LONG',
            lotOpenIndicator: true, cancelIndicator: false, owningFirmId: 'OF01'
          };
        })
      };
    }],

    ['GET', '/ftgw/fcat/portfolios/ria/v1/customer/models', () => MODELS],  // bare array

    ['POST', '/ftgw/fcat/portfolios/ria/v1/customer/accounts/rebalances/search', (body) => ({
      // snake_case subsystem, { data, metadata } envelope, account_number as a string
      data: [{
        ria_account_rebalance_id: 'reb-' + body.account_number,
        ria_account_id: 'ria-' + body.account_number,
        model_portfolio_id: 'mdl-growth-70-30',
        reasons: ['DriftExceeded'],
        status: 'Completed',
        requested_by: null,
        attempted_ts: '2026-08-02T09:00:00.000Z',
        completed_ts: '2026-08-02T09:14:00.000Z',
        cancelled_ts: null, cancelled_by: null,
        create_ts: '2026-08-02T08:55:00.000Z', update_ts: '2026-08-02T09:14:00.000Z',
        drift_calculation_id: 'drift-1', metadata: null
      }],
      metadata: { search_criteria: { account_number: body.account_number } }
    })],

    ['POST', '/ftgw/fcat/reports/user/v1/documents/search', (body) => ([{
      // reports envelope: an ARRAY of { content, page }
      content: (body.accountNumbers || []).flatMap(n => [
        { id: 'doc-' + n + '-1', fileName: 'statement-q2.pdf', contentType: 'application/pdf',
          docType: 'statements', documentDate: '2026-07-01', createdDate: '2026-07-02T03:00:00.000Z',
          userId: String(byNumber.get(n)?.userId ?? ''), accountNumber: n,
          link: 'https://gp-sandbox.fidelity.com/documents/doc-' + n + '-1', owningFirmId: 'OF01' },
        { id: 'doc-' + n + '-2', fileName: '1099.pdf', contentType: 'application/pdf',
          docType: 'taxforms', documentDate: '2026-01-27', createdDate: '2026-01-28T03:00:00.000Z',
          userId: String(byNumber.get(n)?.userId ?? ''), accountNumber: n,
          link: 'https://gp-sandbox.fidelity.com/documents/doc-' + n + '-2', owningFirmId: 'OF01' }
      ]),
      page: { size: 20, totalElements: 2, totalPages: 1, number: 0 }
    }])],

    ['POST', '/ftgw/fcat/margin/admin/v1/margin-calls', (body) => ({
      // margin admin uses "pagination", not "page"
      content: (body.accountNumber ? [body.accountNumber] : [accounts[0].accountNumber]).map(n => ({
        accountNumber: n, accountSubType: 'MRGN', accountType: 'INDV',
        callType: 'HOUSE', clearingFirmId: 'CF01', createTs: '2026-09-18T11:00:00.000Z',
        currentCallAmount: 42000, dueDate: '2026-09-22', dueStatus: 'PAST_DUE_DATE',
        equity: 180000, equityPercentage: 28.4, isExtensionFiled: false,
        issuedDate: '2026-09-18', lmv: 640000, smv: 0, marginCallId: 'mc-' + n,
        originalCallAmount: 52000, processDate: '2026-09-24', requirementAmount: 96000,
        status: 'OPEN', statusLogs: [], firmId: 'F1', introducingBrokerId: 'IB1',
        introducingFirmId: 'IF01', owningFirmId: 'OF01', updateTs: '2026-09-23T11:00:00.000Z'
      })),
      pagination: { pageNumber: 0, pageSize: 20, totalElements: 1, totalPages: 1 }
    })]
  ];

  /** A transport, shaped like the one createClient expects. */
  async function transport({ url, method, headers, body }) {
    const u = new URL(url);
    const path = u.pathname.replace(/\/nonprod$/, '');
    const parsed = body ? JSON.parse(body) : {};
    calls.push({ method, path, traceId: headers[ 'x_gm_ext_traceid' ], accounts: parsed.accountNumbers || parsed.accountNumber });

    if (!headers['x_gm_api_key']) return { status: 401, json: { errorMessages: [{ code: 'NO_KEY', detail: 'Missing API key' }] } };
    if (!headers['x_gm_ext_token']) return { status: 401, json: { errorMessages: [{ code: 'NO_TOKEN', detail: 'Missing token' }] } };

    const route = routes.find(([m, p]) => m === method && p === path);
    if (!route) return { status: 404, json: { errorMessages: [{ code: 'NOT_FOUND', detail: 'No such Green Meadows path: ' + path }] } };

    const out = route[2](parsed, Object.fromEntries(u.searchParams));
    if (out && out.__status) { const { __status, ...rest } = out; return { status: __status, json: __status === 204 ? null : rest }; }
    return { status: 200, json: out };
  }

  return {
    transport,
    accounts,
    models: MODELS,
    /** What was asked for, so tests can assert the fan-out rather than guess at it. */
    calls,
    reset: () => { calls.length = 0; }
  };
}
