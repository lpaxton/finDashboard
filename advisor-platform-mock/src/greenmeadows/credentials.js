/*
 * The only module that holds Green Meadows credentials.
 *
 * Nothing here is ever returned, logged, stringified or put in an error. The rest of the
 * backend asks this module to decorate a request; it never sees the values. That is the whole
 * point of the module, and the reason it is small enough to read in one sitting.
 *
 * Guardrail (HANDOFF section 12): the API key, tokens, tax IDs, the client secret and the
 * identity-token signing key must never reach a browser, a log or a test fixture.
 */

const REDACTED = '[redacted]';

/* Header names, from the reference's own credentials panel. */
export const HEADERS = {
  apiKey: 'x_gm_api_key',
  token: 'x_gm_ext_token',
  traceId: 'x_gm_ext_traceid',
  clientInfo: 'x_gm_client_info'
};

/** Values that must never appear in a log line or an error message. */
const SECRET_KEYS = new Set([HEADERS.apiKey, HEADERS.token, HEADERS.clientInfo,
  'authorization', 'taxId', 'ssn', 'clientSecret', 'privateKey', 'password']);

/**
 * Replaces anything secret with [redacted], at any depth. Use this on every object that is
 * about to be logged or attached to an error. It matches on key name, case-insensitively,
 * so a new secret field is redacted by naming it, not by remembering to handle it.
 */
export function redact(value, seen = new WeakSet()) {
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return '[circular]';
  seen.add(value);
  if (Array.isArray(value)) return value.map(v => redact(v, seen));
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    out[k] = [...SECRET_KEYS].some(s => s.toLowerCase() === k.toLowerCase()) ? REDACTED : redact(v, seen);
  }
  return out;
}

/**
 * Holds the credentials for one environment and hands out request headers.
 *
 * Tokens are short-lived and must be refreshed (HANDOFF section 7). `getUserToken` is supplied
 * by the caller so this module never has to know how a token is obtained, only when it expired.
 *
 * @param {object} opts
 * @param {string} opts.apiKey
 * @param {string} [opts.clientInfo] Encoded client id plus secret hash. mTLS environments only.
 * @param {(userId: string) => Promise<{ token: string, expiresAt: number }>} [opts.getUserToken]
 * @param {() => Promise<{ token: string, expiresAt: number }>} [opts.getSystemToken]
 * @param {number} [opts.refreshSkewMs] Refresh this long before expiry. Default 60s.
 */
export function createCredentials({ apiKey, clientInfo, getUserToken, getSystemToken, refreshSkewMs = 60_000 }) {
  if (!apiKey) throw new Error('Green Meadows needs an API key. Set it from the environment, never from a file in the repo.');

  /** @type {Map<string, { token: string, expiresAt: number }>} */
  const userTokens = new Map();
  let systemToken = null;

  const fresh = (t, now) => t && t.expiresAt - refreshSkewMs > now;

  async function userToken(userId, now = Date.now()) {
    if (!getUserToken) throw new Error('No user-token source configured.');
    const held = userTokens.get(userId);
    if (fresh(held, now)) return held.token;
    const got = await getUserToken(userId);
    userTokens.set(userId, got);
    return got.token;
  }

  async function robotToken(now = Date.now()) {
    if (!getSystemToken) throw new Error('No system-token source configured.');
    if (fresh(systemToken, now)) return systemToken.token;
    systemToken = await getSystemToken();
    return systemToken.token;
  }

  /**
   * Builds the headers for one call. `traceId` is the internal x-trace-id, forwarded as
   * x_gm_ext_traceid so one request can be followed across both systems.
   */
  async function headersFor({ traceId, userId, system = false }) {
    const token = system ? await robotToken() : await userToken(userId);
    const h = {
      [HEADERS.apiKey]: apiKey,
      [HEADERS.token]: token,
      accept: 'application/json',
      'content-type': 'application/json'
    };
    if (clientInfo) h[HEADERS.clientInfo] = clientInfo;
    if (traceId) h[HEADERS.traceId] = traceId;
    return h;
  }

  return {
    headersFor,
    /** Forgets a user's token, for sign-out or after a 401. */
    forget: (userId) => { userTokens.delete(userId); },
    /** Never returns a credential. Exists so health checks can report readiness safely. */
    describe: () => ({
      apiKey: apiKey ? REDACTED : '(missing)',
      clientInfo: clientInfo ? REDACTED : '(not set)',
      userTokensHeld: userTokens.size,
      systemTokenHeld: Boolean(systemToken)
    }),
    toJSON() { return this.describe(); }
  };
}
