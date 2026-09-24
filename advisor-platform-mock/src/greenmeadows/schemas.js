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

/** POST /ftgw/fcat/bookkeeping/v1/accounts/performance/get */
export const accountsPerformance = {
  capturedFrom: 'getaccountsperformancesummary',
  method: 'POST',
  path: '/ftgw/fcat/bookkeeping/v1/accounts/performance/get',
  body: { accountNumbers: 'array of int64, required' },
  notes: [
    'This is where per-account gain and loss lives, NOT positions. Positions marks its gain/loss fields "Not applicable"; this endpoint returns them, with the formulas documented.',
    'ClientAccount.todayGainLoss maps to todaysUnrealizedProfitAndLoss, totalGainLoss to totalUnrealizedProfitAndLoss. That is the one Green Meadows source that reaches a client directly.'
  ],
  envelope: { content: 'array of performance' },
  performance: {
    accountNumber: { type: 'int64' },
    todaysUnrealizedProfitAndLoss: { type: 'number', desc: 'Open positions market value today minus yesterday, plus same-day shares at cost' },
    todaysUnrealizedProfitAndLossPercentage: { type: 'number' },
    totalUnrealizedProfitAndLoss: { type: 'number', desc: 'Market value of open positions minus their cost basis' },
    totalUnrealizedProfitAndLossPercentage: { type: 'number' },
    todaysRealizedProfitAndLoss: { type: 'number' },
    totalRealizedProfitAndLoss: { type: 'number' },
    totalMarketValue: { type: 'number', desc: 'Trade-date cash balance plus market value' }
  }
};

/** POST /ftgw/fcat/bookkeeping/v2/opentaxlot/get */
export const openTaxLots = {
  capturedFrom: 'getopentaxlots-1',
  method: 'POST',
  path: '/ftgw/fcat/bookkeeping/v2/opentaxlot/get',
  body: { accountNumber: 'int64, required', subAccountCode: "'CASH' | 'MRGN', required", securityId: 'string', symbol: 'string', basketId: 'string' },
  query: ['page', 'size', 'sort'],
  notes: [
    'One account and one sub-account code per call, both required. A firm-wide harvesting scan over 28 households is roughly 110 calls, which is the performance question in HANDOFF section 9.',
    'unrealizedGainOrLoss is returned, so the tax-loss harvesting signal has a real source.',
    'washSaleAmount, holdingPeriod and coveredFlag are all present, which is what a defensible harvesting recommendation needs.'
  ],
  taxLot: {
    purchaseDate: { type: 'date' }, taxlotId: { type: 'string' }, accountNumber: { type: 'int64' },
    subAccountCode: { type: 'string', desc: 'CASH or MRGN' }, orderId: { type: 'string' },
    tradeExecutionId: { type: 'string' }, securityId: { type: 'string' }, basketId: { type: 'string' },
    originalQuantity: { type: 'number' }, pendingQuantity: { type: 'number' }, price: { type: 'number' },
    washSalePurchaseDate: { type: 'date' }, purchaseTimestamp: { type: 'date-time' }, toaInTimestamp: { type: 'date-time' },
    coveredFlag: { type: 'boolean' }, transactionAmount: { type: 'number' }, currencyCode: { type: 'int32' },
    commission: { type: 'number' }, washSaleAmount: { type: 'number' }, costBasis: { type: 'number' },
    lotOpenIndicator: { type: 'boolean' }, cancelIndicator: { type: 'boolean' }, updateTimestamp: { type: 'date-time' },
    updateBy: { type: 'string', notApplicable: true }, availableQuantity: { type: 'number' },
    discountingDays: { type: 'int32' }, comments: { type: 'string' }, toaActivityTypeCode: { type: 'int32' },
    activityTypeCode: { type: 'string' }, closedQuantity: { type: 'number' }, holdingPeriod: { type: 'string' },
    securityName: { type: 'string' }, symbol: { type: 'string' }, cusip: { type: 'string' },
    unrealizedGainOrLoss: { type: 'number', desc: 'Feeds the tax-loss harvesting signal' },
    customerViewCostBasis: { type: 'number', desc: 'Includes the wash-sale amount' },
    fundingStatus: { type: 'int32' }, unclearedFundingAmt: { type: 'number' }, unsettledFundingAmt: { type: 'number' },
    costBasisPerShare: { type: 'number' }, owningFirmId: { type: 'string' }
  }
};

/** GET /ftgw/fcat/portfolios/ria/v1/customer/models */
export const modelPortfolios = {
  capturedFrom: 'ria-customerlistcustomermodels',
  method: 'GET',
  path: '/ftgw/fcat/portfolios/ria/v1/customer/models',
  notes: [
    'Asset class lives HERE, not on positions. holdings[].category and subCategory give the target allocation by asset class, so allocation drift is reachable by matching a position ticker to a model holding.',
    'Drift policy is per model and configurable: driftMethod (Absolute or Relative), driftThreshold as a decimal fraction, maxTotalDrift, rebalanceFrequency and rebalanceCooldownDays. The mock invents a flat 5-point threshold; the real one belongs to the model.',
    'Target percentages sum to 100 across holdings.',
    'Top level is a bare array, not an envelope.'
  ],
  envelope: 'array of model',
  model: {
    id: { type: 'string', required: true, desc: 'UUID' },
    name: { type: 'string', required: true },
    description: { type: 'string', required: true },
    riskLevel: { type: "'Conservative' | 'Moderate' | 'Aggressive'", required: true },
    driftMethod: { type: "'Absolute' | 'Relative'", required: true },
    driftThreshold: { type: 'number', required: true, desc: 'Decimal fraction, 0 to 1. 0.20 = 20%' },
    maxTotalDrift: { type: 'number', required: true, desc: '0 disables the gate' },
    rebalanceFrequency: { type: "'Weekly' | 'Monthly' | 'Quarterly'", required: true },
    rebalanceCooldownDays: { type: 'number', required: true },
    clearingFirmId: { type: 'string', required: true },
    introducingFirmId: { type: 'string', required: true },
    firm3Id: { type: 'string', required: true },
    firm4Id: { type: 'string', required: true },
    currentVersion: { type: 'number', required: true },
    archived: { type: 'boolean', required: true },
    holdings: {
      type: 'array', required: true, desc: 'ETF holdings, target allocations summing to 100',
      item: {
        id: { type: 'string', required: true }, modelId: { type: 'string', required: true },
        universeId: { type: 'string', required: true, desc: 'FK into the approved ETF universe' },
        ticker: { type: 'string', required: true }, tickerName: { type: 'string', required: true },
        targetPercent: { type: 'number', required: true, desc: '0 to 100' },
        category: { type: 'string', required: true, desc: 'Asset category. The missing asset class.' },
        subCategory: { type: 'string', required: true },
        sortOrder: { type: 'number', required: true },
        createdAt: { type: 'string', required: true }, updatedAt: { type: 'string', required: true }
      }
    }
  }
};

/** POST /ftgw/fcat/portfolios/ria/v1/customer/accounts/rebalances/search */
export const accountRebalances = {
  capturedFrom: 'ria-customersearchcustomerrebalances',
  method: 'POST',
  path: '/ftgw/fcat/portfolios/ria/v1/customer/accounts/rebalances/search',
  body: { account_number: 'string, required, ^[0-9]{10}$' },
  notes: [
    'This subsystem is snake_case. Bookkeeping and user/v4 are camelCase. The adapter cannot assume one convention across Green Meadows.',
    'reasons includes DriftExceeded and MaxTotalDriftExceeded, so Green Meadows already detects drift. The allocation_drift signal may be a read of their calculation rather than our own, which would remove the per-account fan-out.',
    'drift_calculation_id points at a drift calculation resource that has not been captured yet.'
  ],
  envelope: { data: 'array of rebalance', metadata: { search_criteria: 'object' } },
  rebalance: {
    ria_account_rebalance_id: { type: 'string', required: true, desc: 'UUID' },
    ria_account_id: { type: 'string', required: true },
    model_portfolio_id: { type: 'string', required: true },
    reasons: { type: 'array', required: true, desc: 'ManualRequest, FrequencyElapsed, DriftExceeded, ModelChanged, MaxTotalDriftExceeded' },
    status: { type: "'Requested' | 'Processing' | 'Completed' | 'Cancelled' | 'Deferred'", required: true },
    requested_by: { type: 'string | null', desc: 'Null for batch-generated requests' },
    attempted_ts: { type: 'date | null' }, completed_ts: { type: 'date | null' },
    cancelled_ts: { type: 'date | null' }, cancelled_by: { type: 'string | null' },
    create_ts: { type: 'string', required: true }, update_ts: { type: 'string', required: true },
    drift_calculation_id: { type: 'string | null' },
    metadata: { type: 'object | null' }
  }
};

/** POST /ftgw/fcat/reports/user/v1/documents/search */
export const documentSearch = {
  capturedFrom: 'searchrecords',
  method: 'POST',
  path: '/ftgw/fcat/reports/user/v1/documents/search',
  body: { accountNumbers: 'array of int64', docTypes: 'array of string', startDate: 'yyyy-MM-dd, required', endDate: 'yyyy-MM-dd, required' },
  query: ['page (required)', 'size (required)'],
  notes: [
    'docType enum is: nap, rap, statements, tradeconfirmation, taxforms, option. The contract uses statement, tax and agreement, so a mapping is needed.',
    'There is no agreement type. Advisory agreements and fee schedules are not custodian documents, which is why the mock marks them source=platform. That was a correct guess.',
    'Top level is an ARRAY of objects each holding content and page: a third envelope shape.',
    'link is a download URL. It must be proxied, never handed to a browser with credentials attached.'
  ],
  envelope: 'array of { content: array of document, page: object }',
  document: {
    id: { type: 'string' }, fileName: { type: 'string' }, contentType: { type: 'string' },
    docType: { type: 'string', desc: 'nap, rap, statements, tradeconfirmation, taxforms, option' },
    documentDate: { type: 'date' }, createdDate: { type: 'string' }, userId: { type: 'string' },
    accountNumber: { type: 'int64' }, link: { type: 'string', desc: 'Download URL. Proxy it.' },
    owningFirmId: { type: 'string' }
  }
};

/** POST /ftgw/fcat/margin/admin/v1/margin-calls */
export const marginCalls = {
  capturedFrom: 'post_admin-v1-margin-calls',
  method: 'POST',
  path: '/ftgw/fcat/margin/admin/v1/margin-calls',
  host: 'fcat-gm-gmsecgtwy-dev-nlb.fmr.com',
  notes: [
    'The documented host is an internal dev NLB, not gp-sandbox.fidelity.com. Whether this client can reach it at all is still unconfirmed, and it is the source for the margin-call alert.',
    'Paging key is "pagination" here, against "page" in bookkeeping. A fourth envelope variant.',
    'Defaults to the last 7 issued dates ending yesterday when no range is given.'
  ],
  body: { accountNumber: 'integer', callType: "['FED','HOUSE','FINRA','MINIMUM_EQUITY']", dueStatus: "['CURRENT','PAST_DUE_DATE','PAST_DUE_DATE_EXTENSION_FILED']", status: "['OPEN','CANCELED','CLOSED','OPEN_EXTENSION']", issuedDateFrom: 'YYYY-MM-DD', issuedDateTo: 'YYYY-MM-DD', isExtensionFiled: 'boolean', marginCallId: 'string', owningFirmId: 'string' },
  query: ['pageSize (required)', 'pageNumber (required)', 'sortBy', 'sortOrder'],
  envelope: { content: 'array of marginCall', pagination: { pageNumber: 'integer', pageSize: 'integer', totalElements: 'integer', totalPages: 'integer' } },
  marginCall: {
    accountNumber: { type: 'integer', required: true }, accountSubType: { type: 'string', required: true },
    accountType: { type: 'string', required: true },
    callType: { type: "'FED' | 'HOUSE' | 'FINRA' | 'MINIMUM_EQUITY'", required: true },
    clearingFirmId: { type: 'string', required: true }, comments: { type: 'string' },
    createId: { type: 'string' }, createTs: { type: 'string', required: true },
    currentCallAmount: { type: 'number', required: true },
    dueDate: { type: 'string', required: true, desc: 'YYYY-MM-DD' },
    dueStatus: { type: "'CURRENT' | 'PAST_DUE_DATE' | 'PAST_DUE_DATE_EXTENSION_FILED'", required: true },
    equity: { type: 'number' }, equityPercentage: { type: 'number' },
    isExtensionFiled: { type: 'boolean' }, issuedDate: { type: 'string', required: true },
    lmv: { type: 'number', desc: 'Long market value' }, smv: { type: 'number', desc: 'Short market value' },
    marginCallId: { type: 'string' }, originalCallAmount: { type: 'number', required: true },
    processDate: { type: 'string', required: true }, requirementAmount: { type: 'number' },
    status: { type: "'OPEN' | 'CANCELED' | 'CLOSED' | 'OPEN_EXTENSION'", required: true },
    statusLogs: { type: 'array', required: true, desc: 'Status change history with action, comments and field diffs' },
    owningFirmId: { type: 'string', required: true },
    updateId: { type: 'string' }, updateTs: { type: 'string', required: true }
  }
};

/** GET /ftgw/fcat/ows/api/v1/get-notes */
export const userNotes = {
  capturedFrom: 'getusernotes',
  method: 'GET',
  path: '/ftgw/fcat/ows/api/v1/get-notes',
  query: ['userId (required)', 'category', 'addedBy', 'fromDate', 'toDate', 'accounts', 'sortBy', 'sortOrder'],
  incomplete: true,
  notes: [
    'INCOMPLETE. The documented 200 body is a "Flight Deck User Info" object plus error messages. The notes themselves do not appear in the documented shape at all, despite being what the endpoint is for.',
    'The documented keys carry spaces ("GM User Id", "First Name", "Phone Number Country Code"). Either the reference is rendering display labels rather than JSON keys, or the payload really is shaped that way. Confirm against the sandbox before mapping anything.',
    'category enum: MANUAL, RESTRICTIONS, MAINTENANCE, TRADE_CORRECTION.'
  ],
  flightDeckUserInfo: {
    'GM User Id': { type: 'string' }, 'First Name': { type: 'string' }, 'Last Name': { type: 'string' },
    'Phone Number Country Code': { type: 'string' }, 'Phone Number': { type: 'string' }, Email: { type: 'string' },
    Status: { type: "'PENDING' | 'ACTIVE' | 'DELETED' | 'SUSPENDED'" },
    'ECAAP Flag': { type: 'boolean' }, 'Created At timestamp': { type: 'date-time' },
    'Updated At timestamp': { type: 'date-time' }, 'Clearing Firm Id': { type: 'string' },
    'Introducing Broker Id': { type: 'string' }, Firm3: { type: 'string' }, Firm4: { type: 'string' },
    'Owning Firm Id': { type: 'string' }
  }
};

/** POST /ftgw/fcat/rt/v1/account-fees/search */
export const accountFees = {
  capturedFrom: 'getaccountfees',
  method: 'POST',
  path: '/ftgw/fcat/rt/v1/account-fees/search',
  body: { accountNumbers: 'array of string, unique', userId: 'string', fromNextExecutionDate: 'string', toNextExecutionDate: 'string', fromCreatedAt: 'string', toCreatedAt: 'string', hasWaiver: 'boolean', owningFirmId: 'string' },
  incomplete: true,
  notes: [
    'INCOMPLETE, and the reference says so: content[].content is a bare string and the docs state "Mapping will be dynamic in nature based on the entity involved". There is no fee shape to map yet.',
    'accountNumbers is an array of STRINGS here, against int64 everywhere in bookkeeping.',
    'This is the source for AX-10 and AX-11, so the client fee table and the portal fee list both depend on a shape that is not published. Ask for a sample response.'
  ],
  envelope: { content: 'array of { content: string, _links: object }', pageLinks: 'array', page: { size: 'int64', totalElements: 'int64', totalPages: 'int64', number: 'int64' } }
};

export const captured = { accountsSummary, accountBalances, balanceHistory, positions,
  accountsPerformance, openTaxLots, modelPortfolios, accountRebalances, documentSearch,
  marginCalls, userNotes, accountFees };

/** Endpoints whose published shape is not usable yet. Ask Green Meadows for a sample response. */
export const incomplete = Object.entries(captured).filter(([, s]) => s.incomplete).map(([k]) => k);

/** Fields the reference marks "Not applicable", by endpoint. The adapter must not read these. */
export const notApplicable = Object.fromEntries(
  Object.entries(captured).map(([name, spec]) => {
    const shape = spec.account || spec.balance || spec.balancePoint || spec.position
      || spec.performance || spec.taxLot || spec.model || spec.rebalance || spec.document || spec.marginCall || {};
    return [name, Object.entries(shape).filter(([, f]) => f && f.notApplicable).map(([k]) => k)];
  })
);
