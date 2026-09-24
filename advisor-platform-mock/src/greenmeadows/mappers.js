/*
 * Green Meadows shapes into the contract's shapes (../../openapi.yaml).
 *
 * This is the layer that will need the most rework when recorded sandbox responses replace
 * the transcribed schemas, which is why it is separate from the transport and holds no
 * credentials, no HTTP and no fan-out logic.
 *
 * Every assumption that is not a documented field is marked ASSUMPTION.
 */

/* ---- account type codes ----------------------------------------------------------------
 * accountType, accountReg and accountSubType are 4-character codes. The reference documents
 * that they are codes but not what the codes mean, so this table is an ASSUMPTION built from
 * the obvious readings. Replace it with the real list before anything ships: a client seeing
 * their IRA labelled as a joint account is a support call at best.
 */
export const ACCOUNT_TYPE_LABELS = {
  INDV: 'Individual brokerage',
  JTWR: 'Joint brokerage',
  IRAT: 'Traditional IRA',
  ROTH: 'Roth IRA',
  TRUS: 'Trust account'
};
export const labelForAccountType = (code) => ACCOUNT_TYPE_LABELS[code] || code || 'Account';

/** Account numbers are int64. The contract shows the last four, as a string. */
export const maskAccountNumber = (n) => '****' + String(n ?? '').slice(-4).padStart(4, '0');

/* ---- accounts ---- */

/**
 * One Green Meadows account into the contract's Account.
 * `performance` and `balance` come from different endpoints and are optional: an account with
 * neither still has a type and a status.
 */
export function toAccount(gmAccount, { balance, performance } = {}) {
  return {
    maskedNumber: maskAccountNumber(gmAccount.accountNumber),
    type: labelForAccountType(gmAccount.accountType),
    status: gmAccount.status,
    // aoStatus is an account-opening status; the contract calls it openingStatus.
    openingStatus: gmAccount.aoStatus ?? 'igo',
    balance: balance?.accountNetworth ?? performance?.totalMarketValue ?? 0,
    // Positions marks its gain/loss fields "Not applicable"; these come from accounts/performance.
    todayGainLoss: performance?.todaysUnrealizedProfitAndLoss ?? 0,
    totalGainLoss: performance?.totalUnrealizedProfitAndLoss ?? 0
  };
}

/** Client-facing accounts carry no status of any kind (X-12). */
export function toClientAccount(gmAccount, sources) {
  const { maskedNumber, type, balance, todayGainLoss, totalGainLoss } = toAccount(gmAccount, sources);
  return { maskedNumber, type, balance, todayGainLoss, totalGainLoss };
}

/* ---- the 12-month trend ----------------------------------------------------------------
 * balance-history returns DAILY points per account. The contract's TrendPoint is monthly and
 * household-level, so: sum across accounts per day, take the last day of each month, and keep
 * the last 12 months.
 */
export function toTrend(points, { months = 12 } = {}) {
  /** @type {Map<string, { total: number, flagged: boolean, day: string }>} */
  const byDay = new Map();
  for (const p of points) {
    const day = String(p.balanceDate);
    const held = byDay.get(day) || { total: 0, flagged: false, day };
    held.total += Number(p.value) || 0;
    // One inaccurate account makes the whole day's household total inaccurate.
    held.flagged = held.flagged || Boolean(p.error);
    byDay.set(day, held);
  }
  /** @type {Map<string, { total: number, flagged: boolean, day: string }>} */
  const monthEnd = new Map();
  for (const entry of [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day))) {
    monthEnd.set(entry.day.slice(0, 7), entry);   // later days overwrite, leaving the last
  }
  return [...monthEnd.entries()]
    .slice(-months)
    .map(([month, e]) => ({ month, value: e.total, ...(e.flagged ? { estimated: true } : {}) }));
}

/**
 * Whether any point in a trend was flagged by the custodian. The client portal must not draw
 * a flagged point as fact; see the contract note on ClientHousehold.trend.
 */
export const trendHasFlaggedPoints = (trend) => trend.some(p => p.estimated);

/* ---- allocation ------------------------------------------------------------------------
 * Positions carry no asset class (securityClassificationLevel is "Not applicable"), so class
 * comes from the model's holdings, matched on ticker. That only classifies securities the
 * model holds; anything else lands in "Unclassified", which is honest rather than silently
 * dropping it out of the percentages.
 */
export function toAllocation({ positions, model, valueOf }) {
  if (!model) return { model: null, lines: [], maxDriftPoints: null, unclassifiedPct: 0 };

  const classOf = new Map(model.holdings.map(h => [h.ticker, h.category]));
  const targets = new Map();
  for (const h of model.holdings) targets.set(h.category, (targets.get(h.category) || 0) + h.targetPercent);

  const values = new Map();
  let total = 0, unclassified = 0;
  for (const p of positions) {
    const v = valueOf(p);
    if (!v) continue;
    total += v;
    const cls = classOf.get(p.symbol);
    if (cls) values.set(cls, (values.get(cls) || 0) + v);
    else unclassified += v;
  }
  if (!total) return { model: { id: model.id, name: model.name }, lines: [], maxDriftPoints: null, unclassifiedPct: 0 };

  const classes = [...new Set([...targets.keys(), ...values.keys()])];
  const lines = classes.map(assetClass => {
    const targetPct = targets.get(assetClass) || 0;
    const currentPct = +(((values.get(assetClass) || 0) / total) * 100).toFixed(1);
    return { assetClass, targetPct, currentPct, driftPct: +(currentPct - targetPct).toFixed(1) };
  });

  return {
    model: { id: model.id, name: model.name },
    lines,
    maxDriftPoints: lines.length ? Math.max(...lines.map(l => Math.abs(l.driftPct))) : null,
    unclassifiedPct: +((unclassified / total) * 100).toFixed(1),
    // The threshold belongs to the model, not to us. The mock's flat 5 points was invented.
    driftThresholdPoints: model.driftMethod === 'Absolute' ? model.driftThreshold * 100 : null
  };
}

/** A position's market value. Returns null when the sandbox does not price positions. */
export const positionValue = (p) =>
  (typeof p.currentValue === 'number' && p.currentValue > 0) ? p.currentValue : null;

/**
 * Falls back to quantity times a price from elsewhere. Needed only if includeCurrentValue
 * turns out not to price positions; see the open question in HANDOFF section 9.
 */
export const positionValueVia = (prices) => (p) => {
  const priced = positionValue(p);
  if (priced !== null) return priced;
  const price = prices?.get?.(p.cusip) ?? prices?.get?.(p.symbol);
  return typeof price === 'number' ? p.tdQuantity * price : 0;
};

/* ---- signals ---- */

/** Tax-loss harvesting: lots whose unrealised gain is a loss, worst first. */
export function toHarvestingCandidates(lots, { minLoss = 1000 } = {}) {
  return lots
    .filter(l => l.lotOpenIndicator && !l.cancelIndicator && Number(l.unrealizedGainOrLoss) < 0)
    .map(l => ({
      taxlotId: l.taxlotId,
      symbol: l.symbol,
      securityName: l.securityName,
      maskedAccountNumber: maskAccountNumber(l.accountNumber),
      unrealizedLoss: Math.abs(Number(l.unrealizedGainOrLoss)),
      holdingPeriod: l.holdingPeriod,
      // A wash sale makes the loss unusable. Surfacing it is the difference between a
      // recommendation an advisor can act on and one they have to check by hand.
      washSaleAmount: Number(l.washSaleAmount) || 0,
      covered: Boolean(l.coveredFlag)
    }))
    .filter(c => c.unrealizedLoss >= minLoss)
    .sort((a, b) => b.unrealizedLoss - a.unrealizedLoss);
}

/** Idle cash, as a share of the account's value. */
export const toIdleCash = (balance) => ({
  maskedAccountNumber: maskAccountNumber(balance.accountNumber),
  cash: balance.cashAmt ?? 0,
  value: balance.accountNetworth ?? 0,
  pct: balance.accountNetworth ? +(((balance.cashAmt ?? 0) / balance.accountNetworth) * 100).toFixed(1) : 0
});

/* ---- alerts ---- */

export function toMarginAlert(call) {
  const overdue = call.dueStatus !== 'CURRENT';
  return {
    severity: overdue ? 'high' : 'medium',
    title: `${call.callType} margin call${overdue ? ', past due date' : ''}`,
    source: 'greenmeadows',
    detail: `${call.currentCallAmount} due ${call.dueDate}`,
    maskedAccountNumber: maskAccountNumber(call.accountNumber)
  };
}

export function toRestrictionAlerts(balance) {
  const flags = balance.restrictions || {};
  const named = { freeRidingRestr: 'Free-riding restriction', liquidationRestr: 'Liquidation restriction', goodFaithRestr: 'Good-faith violation' };
  return Object.entries(named)
    .filter(([k]) => flags[k])
    .map(([, title]) => ({ severity: 'medium', title, source: 'greenmeadows', maskedAccountNumber: maskAccountNumber(balance.accountNumber) }));
}

/* ---- documents ---- */

/** The contract's docType vocabulary is not Green Meadows'. */
export const DOC_TYPES = { statements: 'statement', taxforms: 'tax', tradeconfirmation: 'confirmation', nap: 'notice', rap: 'notice', option: 'notice' };

export const toDocument = (d) => ({
  id: d.id,
  title: d.fileName,
  docType: DOC_TYPES[d.docType] || 'other',
  date: String(d.documentDate).slice(0, 10),
  maskedAccountNumber: maskAccountNumber(d.accountNumber),
  source: 'greenmeadows'
  // `link` is deliberately dropped. It is a custodian URL; the backend must proxy the
  // download so a credentialed URL never reaches a browser.
});

/** The freshest lastUpdatedTstp across a set of balances, for dataAsOf. */
export const dataAsOf = (balances) =>
  balances.map(b => b.lastUpdatedTstp).filter(Boolean).sort().at(-1) || new Date().toISOString();
