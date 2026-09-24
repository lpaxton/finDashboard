/*
 * Assembles contract shapes from Green Meadows calls.
 *
 * This is where the fan-out lives, because the fan-out is a property of Green Meadows' own
 * limits rather than of any one mapper:
 *   - balance history takes at most 30 account numbers per call
 *   - open tax lots take ONE account and ONE sub-account code per call
 *
 * Nothing here knows a credential. It takes a client, which knows how to get headers.
 */
import { chunk, LIMITS } from './client.js';
import * as map from './mappers.js';

const SUB_ACCOUNTS = ['CASH', 'MRGN'];

export function createAdapter({ client }) {
  /** All accounts the signed-in user can see, keyed by account number. */
  async function accounts({ traceId, userId }) {
    const { items } = await client.call('/ftgw/fcat/customer/user/v4/accounts/summary', { traceId, userId });
    return items;
  }

  async function balances(accountNumbers, { traceId, userId }) {
    if (!accountNumbers.length) return [];
    const { items } = await client.call('/ftgw/fcat/bookkeeping/v2/accounts/balances/search', {
      method: 'POST', traceId, userId,
      body: { accountNumbers, include: ['accountNetworth'] }
    });
    return items;
  }

  async function performance(accountNumbers, { traceId, userId }) {
    if (!accountNumbers.length) return [];
    const { items } = await client.call('/ftgw/fcat/bookkeeping/v1/accounts/performance/get', {
      method: 'POST', traceId, userId, body: { accountNumbers }
    });
    return items;
  }

  /** Daily points across however many calls the 30-account limit requires. */
  async function balanceHistory(accountNumbers, { from, to, traceId, userId }) {
    if (!accountNumbers.length) return [];
    const batches = chunk(accountNumbers, LIMITS.balanceHistoryAccounts);
    const results = await Promise.all(batches.map(batch =>
      client.call('/ftgw/fcat/bookkeeping/v1/balance-history/search', {
        method: 'POST', traceId, userId,
        body: { accountNumbers: batch, startDate: from, endDate: to }
      })));
    return results.flatMap(r => r.items);
  }

  async function positions(accountNumbers, { traceId, userId, priced = true }) {
    if (!accountNumbers.length) return [];
    const { items } = await client.call('/ftgw/fcat/bookkeeping/v3/positions/get', {
      method: 'POST', traceId, userId, body: { accountNumbers, includeCurrentValue: priced }
    });
    return items;
  }

  async function models({ traceId, userId }) {
    const { items } = await client.call('/ftgw/fcat/portfolios/ria/v1/customer/models', { traceId, userId });
    return items;
  }

  /**
   * One call per account per sub-account code, as the reference requires. This is the
   * expensive one: 28 households at 2 accounts each is 112 calls for a firm-wide scan, which
   * is the scheduling question in HANDOFF section 9.
   */
  async function openTaxLots(accountNumbers, { traceId, userId }) {
    const pairs = accountNumbers.flatMap(n => SUB_ACCOUNTS.map(sub => ({ n, sub })));
    const results = await Promise.all(pairs.map(({ n, sub }) =>
      client.call('/ftgw/fcat/bookkeeping/v2/opentaxlot/get', {
        method: 'POST', traceId, userId, body: { accountNumber: n, subAccountCode: sub }
      }).catch(e => { if (e.status === 404 || e.status === 204) return { items: [] }; throw e; })));
    return results.flatMap(r => r.items);
  }

  async function documents(accountNumbers, { from, to, traceId, userId }) {
    const { items } = await client.call('/ftgw/fcat/reports/user/v1/documents/search', {
      method: 'POST', traceId, userId, query: { page: 0, size: 50 },
      body: { accountNumbers, startDate: from, endDate: to }
    });
    return items;
  }

  /* ---- contract shapes ---- */

  /** GET /me/household, for one client's own accounts. */
  async function clientHousehold({ traceId, userId, name, advisorName, from, to }) {
    const gmAccounts = await accounts({ traceId, userId });
    const numbers = gmAccounts.map(a => a.accountNumber);
    const [bal, perf, history] = await Promise.all([
      balances(numbers, { traceId, userId }),
      performance(numbers, { traceId, userId }),
      balanceHistory(numbers, { from, to, traceId, userId })
    ]);
    const balByNum = new Map(bal.map(b => [b.accountNumber, b]));
    const perfByNum = new Map(perf.map(p => [p.accountNumber, p]));
    const trend = map.toTrend(history);

    return {
      name,
      advisorName,
      aum: bal.reduce((t, b) => t + (b.accountNetworth || 0), 0),
      trend,
      // Surfaced so the portal can say a point is the custodian's estimate rather than fact.
      trendHasEstimates: map.trendHasFlaggedPoints(trend),
      accounts: gmAccounts.map(a => map.toClientAccount(a, {
        balance: balByNum.get(a.accountNumber), performance: perfByNum.get(a.accountNumber)
      })),
      dataAsOf: map.dataAsOf(bal)
    };
  }

  /** GET /households/{id}/allocation. */
  async function allocation({ accountNumbers, traceId, userId }) {
    const [pos, allModels, gmAccounts] = await Promise.all([
      positions(accountNumbers, { traceId, userId }),
      models({ traceId, userId }),
      accounts({ traceId, userId })
    ]);
    const modelId = gmAccounts.find(a => accountNumbers.includes(a.accountNumber))?.portfolioModel;
    const model = allModels.find(m => m.id === modelId) || null;
    const priced = pos.some(p => map.positionValue(p) !== null);
    const result = map.toAllocation({ positions: pos, model, valueOf: map.positionValue });
    return {
      ...result,
      // If the sandbox does not price positions the percentages are meaningless, and saying so
      // is better than drawing a chart of zeroes.
      priced,
      unavailableReason: priced ? null : 'Green Meadows did not return position values, so allocation cannot be computed.'
    };
  }

  /** The tax-loss harvesting signal for a set of accounts. */
  async function harvesting({ accountNumbers, traceId, userId, minLoss }) {
    const lots = await openTaxLots(accountNumbers, { traceId, userId });
    return map.toHarvestingCandidates(lots, { minLoss });
  }

  /** GET /me/documents. */
  async function clientDocuments({ accountNumbers, from, to, traceId, userId }) {
    return (await documents(accountNumbers, { from, to, traceId, userId })).map(map.toDocument);
  }

  return {
    accounts, balances, performance, balanceHistory, positions, models, openTaxLots, documents,
    clientHousehold, allocation, harvesting, clientDocuments
  };
}
