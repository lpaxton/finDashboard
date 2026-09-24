/*
 * Green Meadows response shapes, transcribed from the developer reference.
 *
 * These are NOT assumptions. Every field below was read from the published schema at
 * developer.thegreensfintech.com/greenmeadows/reference/<slug> on 24 September 2026, by
 * expanding the 200 row on each endpoint page. `capturedFrom` records the slug.
 *
 * What is still an assumption: the sandbox's actual values. The reference documents the
 * shape and describes each field, but several fields are marked "Not applicable" (recorded
 * below as `notApplicable`), and the reference's own example disagreed with its schema in
 * two places (see notes). Replace this file with recorded real responses once the sandbox
 * key exists; the adapter should read shapes only from here.
 *
 * Types use the reference's own vocabulary: int64, number, date, date-time, string, boolean.
 */

/** GET /ftgw/fcat/customer/user/v4/accounts/summary */
export const accountsSummary = {
  capturedFrom: 'getaccountsbyuseridv4compact',
  method: 'GET',
  path: '/ftgw/fcat/customer/user/v4/accounts/summary',
  query: ['status', 'aoStatus', 'amStatus', 'feature'],
  notes: [
    'Envelope is { accounts: [...] }, not the { content, page } envelope bookkeeping uses.',
    'With no query parameters, accounts with status=closed or aoStatus=nigo are excluded by default.',
    'accountType, accountReg, accountSubType and accountSubReg are 4-character codes, not display names. A lookup table is needed before anything reaches a screen.',
    'There is no household. Accounts reach a user through accountRelationships[].userId, which is what the invented household grouping has to be built on.'
  ],
  envelope: { accounts: 'array of account' },
  account: {
    accountNumber: { type: 'int64', required: true, desc: '10-digit GM account number' },
    accountReg: { type: 'string', required: true, desc: 'Ownership identifier, 4-char' },
    accountSubReg: { type: 'string', required: true, desc: 'Tertiary identifier, if any' },
    accountSubType: { type: 'string', required: true, desc: 'Segregation, 4-char' },
    accountType: { type: 'string', required: true, desc: 'Account objective, 4-char' },
    accountManagementType: { type: 'string' },
    portfolioModel: { type: 'string', desc: 'The model assigned to the account' },
    inheritedDetails: { type: 'object' },
    corePosition: { type: 'string', required: true },
    eDeliveryPreferences: { type: 'object', required: true },
    nonCustomerInd: { type: 'boolean' },
    status: { type: 'string', required: true, desc: 'active, dormant, frozen, closed - grace period, closed' },
    createdTs: { type: 'date-time' },
    closedTs: { type: 'date-time' },
    accountFeatures: { type: 'IAccountOptionFeatures | IAccountToaFeatures | object' },
    accountRelationships: {
      type: 'array', required: true,
      item: {
        relationshipType: { type: 'string', required: true, desc: "'OW' owner" },
        relationshipTypeRole: { type: 'string', required: true, desc: "'PO' primary owner, 'JO' joint owner" },
        mailingAddress: { type: 'object', required: true },
        userId: { type: 'int32', required: true, desc: 'GM user id' }
      }
    },
    cryptoAoStatus: { type: 'string', desc: 'initiated, pending, active, failed. Crypto accounts only.' },
    owningFirmId: { type: 'string' },
    userFeatureDetails: { type: 'object' },
    verificationDetail: { type: 'object', required: true },
    p2pVerificationDetail: { type: 'object', required: true }
  }
};

/** POST /ftgw/fcat/bookkeeping/v2/accounts/balances/search */
export const accountBalances = {
  capturedFrom: 'getaccountbalances-1',
  method: 'POST',
  path: '/ftgw/fcat/bookkeeping/v2/accounts/balances/search',
  body: { accountNumbers: 'array of int64, required', include: "['accountNetworth']", expand: "'details'" },
  query: ['page', 'size', 'sort'],
  notes: [
    'accountNetworth is only populated when include contains accountNetworth. It is the number the book of business needs.',
    'The reference says firmId is "Always PIER"; its own example returns "FIBS". Confirm against the sandbox.',
    'The schema lists pendingUnCollFundAmt; the example returns pendingOpenCollFundAmt. Confirm against the sandbox.'
  ],
  envelope: { content: 'array of balance' },
  balance: {
    firmId: { type: 'string', desc: 'Reference says always PIER; example shows FIBS' },
    accountNumber: { type: 'int64' },
    linkedAccountNumber: { type: 'int64' },
    accountNetworth: { type: 'number', desc: 'Only with include=accountNetworth' },
    cashAccountMarketValue: { type: 'number' },
    uncollectedFundCr: { type: 'number' },
    cashAmt: { type: 'number', desc: 'Cash buying power. Feeds the idle-cash signal.' },
    cashCollectedBalanceAmt: { type: 'number' },
    debitBalanceInterestAmt: { type: 'number' },
    committedOpenOrderAmt: { type: 'number' },
    coreAmt: { type: 'number', desc: 'Value of the core fund held' },
    dayTradingAmt: { type: 'number' },
    openOrderUpdateTstp: { type: 'date-time' },
    pendingUnCollFundAmt: { type: 'number' },
    runningCollectedBalanceAmt: { type: 'number' },
    settledCashBalanceAmt: { type: 'number' },
    settlementDateBalanceAmt: { type: 'number' },
    tradeDateBalanceAmt: { type: 'number' },
    unSettCashPurchaseAmt: { type: 'number' },
    unSettCashFromSellAmt: { type: 'number' },
    saleProceedsSettledShares: { type: 'number' },
    saleProceedsUnsettledShares: { type: 'number' },
    unSettCoreCrAmt: { type: 'number' },
    unSettCoreDrAmt: { type: 'number' },
    pendingWithdrawalAmt: { type: 'number' },
    pendingCaSettlementAmt: { type: 'number' },
    cawHoldAmt: { type: 'number' },
    lastUpdatedTstp: { type: 'date-time', desc: 'Feeds dataAsOf' },
    smaOpeningBalance: { type: 'number' },
    smaAsOfDate: { type: 'date' },
    intraDaySmaCredits: { type: 'number' },
    intraDaySmaDebits: { type: 'number' },
    unsettledMarginDebitBalanceAmount: { type: 'number' },
    settledMarginDebitBalanceAmount: { type: 'number' },
    marginBuyingPower: { type: 'number' },
    marginCashAvailableToWithdraw: { type: 'number' },
    nonMarginBuyingPower: { type: 'number' },
    updatedBy: { type: 'string', notApplicable: true },
    restrictions: {
      type: 'object',
      desc: 'Feeds the account-restriction alert',
      fields: {
        freeRidingRestr: { type: 'boolean' },
        liquidationRestr: { type: 'boolean' },
        goodFaithRestr: { type: 'boolean' }
      }
    },
    escrowAmount: { type: 'number' },
    owningFirmId: { type: 'string' },
    unclearedAmtUsed: { type: 'number' },
    unsettledAmtUsed: { type: 'number' },
    committedExerciseAmt: { type: 'number' },
    committedAssignmentAmt: { type: 'number' },
    committedCAAmt: { type: 'number' }
  }
};

/** POST /ftgw/fcat/bookkeeping/v1/balance-history/search */
export const balanceHistory = {
  capturedFrom: 'searchaccountbalancesovertime-1',
  method: 'POST',
  path: '/ftgw/fcat/bookkeeping/v1/balance-history/search',
  body: { accountNumbers: 'array of int64, required, max 30', startDate: 'date, required', endDate: 'date, required', includeSplitUps: 'boolean' },
  query: ['page', 'size', 'sort'],
  notes: [
    'This is the source for the 12-month trend on /summary, /firm/summary and /me/household.',
    'It returns DAILY balances. The contract\'s TrendPoint is monthly, so the backend must pick month-end values.',
    'At most 30 accounts per call. A firm with 28 households and 1-3 accounts each needs several calls for one firm-level chart.',
    'error=true means unpriced securities affected that day\'s value, and accuracyNote lists the CUSIPs. A flagged point must not be drawn to a client as fact: the client portal chart is the one place this reaches a client directly.'
  ],
  envelope: { content: 'object', page: { size: 'int64', totalElements: 'int64', totalPages: 'int64', number: 'int64' } },
  balancePoint: {
    value: { type: 'number', desc: 'Total market value of securities and cash' },
    accountNumber: { type: 'int64' },
    balanceDate: { type: 'date', desc: 'Closing price basis for that day' },
    sdBalanceAmt: { type: 'number' },
    sweepAmt: { type: 'number' },
    tdBalanceAmt: { type: 'number' },
    securitiesValue: { type: 'number' },
    error: { type: 'boolean', desc: 'Unpriced securities affected this value' },
    accuracyNote: { type: 'string', desc: 'CUSIPs of unpriced securities' }
  }
};

/** POST /ftgw/fcat/bookkeeping/v3/positions/get */
export const positions = {
  capturedFrom: 'getpositionswithpagination-1',
  method: 'POST',
  path: '/ftgw/fcat/bookkeeping/v3/positions/get',
  body: { accountNumbers: 'array of int64, unique, required', includeCurrentValue: 'boolean', toaReq: 'boolean' },
  query: ['page', 'size', 'sort'],
  notes: [
    'The reference marks currentValue, totalGainLoss, totalPercentGainLoss, todayGainLoss, todayPercentGainLoss and lastPrice as "Not applicable", despite includeCurrentValue existing as a pricing flag.',
    'It also marks securityClassificationLevel and securityClassificationLevel2 as "Not applicable". Those are the asset-class fields the allocation-drift and concentration signals were designed around.',
    'If that holds in the sandbox, position value must be derived (quantity x price from a pricing source) and asset class must come from somewhere else entirely. See the open questions in HANDOFF section 9.'
  ],
  envelope: { content: 'array of position' },
  position: {
    accountNumber: { type: 'int64' },
    accountSubType: { type: 'string', desc: 'Cash or Margin' },
    cusip: { type: 'string' },
    tdQuantity: { type: 'number' },
    costBasis: { type: 'number' },
    coreAccountIndicator: { type: 'boolean', desc: 'True only for the GCASH position' },
    symbol: { type: 'string' },
    securityId: { type: 'string' },
    description: { type: 'string', desc: 'From the GM security master' },
    lastPrice: { type: 'number', notApplicable: true },
    lastPriceChange: { type: 'number', notApplicable: true },
    multiplier: { type: 'number' },
    pendingSettlementBuyQuantity: { type: 'number', notApplicable: true },
    pendingSettlementSellQuantity: { type: 'number', notApplicable: true },
    pendingOmsTdQuantity: { type: 'number' },
    pendingCaTdQuantity: { type: 'number' },
    pendingForExerciseQuantity: { type: 'number' },
    pendingForAssignmentQuantity: { type: 'number' },
    availableTdQuantity: { type: 'number' },
    currentDayPurchasedQuantity: { type: 'number' },
    currentDayCostBasis: { type: 'number' },
    intraDayActivityIndicator: { type: 'boolean' },
    securityClassificationLevel: { type: 'string', notApplicable: true },
    securityClassificationLevel2: { type: 'string', notApplicable: true },
    currentValue: { type: 'number', notApplicable: true },
    totalGainLoss: { type: 'number', notApplicable: true },
    totalPercentGainLoss: { type: 'number', notApplicable: true },
    currentDayCostBasisPerShare: { type: 'number' },
    todayGainLoss: { type: 'number', notApplicable: true },
    todayPercentGainLoss: { type: 'number', notApplicable: true },
    costBasisPerShare: { type: 'number' },
    editCostBasisIndicator: { type: 'boolean' },
    owningFirmId: { type: 'string', required: true }
  }
};

export const captured = { accountsSummary, accountBalances, balanceHistory, positions };

/** Fields the reference marks "Not applicable", by endpoint. The adapter must not read these. */
export const notApplicable = Object.fromEntries(
  Object.entries(captured).map(([name, spec]) => {
    const shape = spec.account || spec.balance || spec.balancePoint || spec.position || {};
    return [name, Object.entries(shape).filter(([, f]) => f && f.notApplicable).map(([k]) => k)];
  })
);
