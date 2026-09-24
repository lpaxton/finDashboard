/*
 * Transport for Green Meadows. Everything that is true regardless of what the sandbox
 * actually returns lives here: hosts, headers, trace propagation, envelope unwrapping,
 * error translation and the two fan-out limits the reference documents.
 *
 * It takes a `transport` so it can run against the fake in ./fake.js today and against the
 * real host once a sandbox key exists, with nothing else changing.
 */
import { redact, HEADERS } from './credentials.js';

export const ENVIRONMENTS = {
  sandbox:      { host: 'https://gp-sandbox.fidelity.com', pathSuffix: '/nonprod', mtls: false },
  mtlsSandbox:  { host: 'https://api.greenpierxq1.com', pathSuffix: '', mtls: true },
  production:   { host: 'https://api.greenpier.com', pathSuffix: '', mtls: true }
};

/** Documented limits. Exceeding them is the caller's bug, not a runtime surprise. */
export const LIMITS = {
  balanceHistoryAccounts: 30,   // balance-history/search: "length between 0 and 30"
  transactionHistoryAccounts: 30
};

export class GreenMeadowsError extends Error {
  constructor(status, message, { traceId, path, body } = {}) {
    super(message);
    this.name = 'GreenMeadowsError';
    this.status = status;
    this.traceId = traceId;
    this.path = path;
    this.body = redact(body);          // never carry a credential into an error
    this.retryable = status === 429 || status >= 500;
  }
}

/**
 * The subsystems disagree about envelopes. Rather than teach every caller, unwrap here.
 * See src/greenmeadows/README.md for the table of who does what.
 */
export function unwrap(payload) {
  if (payload == null) return { items: [], page: null };
  if (Array.isArray(payload)) {
    // documents/search is an array of { content, page }; models is a bare array
    if (payload.length && payload[0] && Array.isArray(payload[0].content)) {
      return { items: payload.flatMap(p => p.content), page: payload[0].page ?? null };
    }
    return { items: payload, page: null };
  }
  if (Array.isArray(payload.accounts)) return { items: payload.accounts, page: null };       // user/v4
  if (Array.isArray(payload.data)) return { items: payload.data, page: payload.metadata ?? null }; // portfolios RIA
  if (Array.isArray(payload.content)) return { items: payload.content, page: payload.page ?? payload.pagination ?? null };
  if (payload.content && typeof payload.content === 'object') {
    return { items: [payload.content], page: payload.page ?? payload.pagination ?? null };   // balance-history
  }
  return { items: [payload], page: null };
}

/**
 * @param {object} opts
 * @param {keyof ENVIRONMENTS} opts.environment
 * @param {ReturnType<import('./credentials.js').createCredentials>} opts.credentials
 * @param {(req: { url: string, method: string, headers: object, body?: string }) =>
 *   Promise<{ status: number, json: any }>} opts.transport
 * @param {(line: string, detail?: object) => void} [opts.log]
 * @param {number} [opts.retries] Retries for 5xx and 429 only. Never for 4xx.
 */
export function createClient({ environment = 'sandbox', credentials, transport, log = () => {}, retries = 2 }) {
  const env = ENVIRONMENTS[environment];
  if (!env) throw new Error(`Unknown Green Meadows environment: ${environment}`);

  async function call(path, { method = 'GET', body, query, traceId, userId, system = false, host } = {}) {
    const base = host ? (host.startsWith('http') ? host : 'https://' + host) : env.host;
    const qs = query && Object.keys(query).length
      ? '?' + new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]))
      : '';
    const url = base + path + (host ? '' : env.pathSuffix) + qs;
    const headers = await credentials.headersFor({ traceId, userId, system });

    let attempt = 0;
    for (;;) {
      // The log carries the trace id and the path, never the headers.
      log(`GM ${method} ${path}`, { traceId, attempt });
      const res = await transport({ url, method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
      if (res.status >= 200 && res.status < 300) return unwrap(res.json);
      if (res.status === 204) return { items: [], page: null };
      if (res.status === 401 && userId) credentials.forget(userId);

      const err = new GreenMeadowsError(res.status, describe(res), { traceId, path, body: res.json });
      if (!err.retryable || attempt >= retries) throw err;
      attempt++;
    }
  }

  return { call, environment: env, limits: LIMITS };
}

function describe(res) {
  const b = res.json;
  if (b && typeof b === 'object') {
    const first = Array.isArray(b.errorMessages) ? b.errorMessages[0] : (b.error || b);
    if (first && (first.detail || first.title || first.message)) {
      return `${res.status}: ${first.detail || first.title || first.message}`;
    }
  }
  return `Green Meadows returned ${res.status}`;
}

/** Splits a list into chunks a documented limit allows. */
export const chunk = (items, size) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, i * size + size));

export { HEADERS };
