// @ts-check
/* The only place that knows whether data is mock or live.
   The mock is imported from the same file the server runs, so there is no second copy.

   Response shapes come from ../../types/api.d.ts, which is generated from openapi.yaml.
   Editors type-check these JSDoc annotations without any build step; see jsconfig.json. */
// Served from the project root at runtime; the relative path is for the type checker only.
// @ts-ignore TS cannot resolve the server's root-relative URL.
import { createMock } from '/src/mock-core.js';
import { CONFIG, FAIL, currentPersona } from './config.js';

/** @typedef {import('../../types/api.js').Operations} Operations */
/** @typedef {import('../../types/api.js').OperationId} OperationId */

const Mock = createMock();

export class ApiError extends Error {
  /** @param {number} status @param {string} [code] @param {string} [message] */
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}

/** @param {number} ms */
export const wait = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Calls one operation on the internal API.
 *
 * Typing the path against the contract is done at the call site with `expect`, because the
 * paths here carry ids (`/tasks/t1`) while the contract names them (`/tasks/{taskId}`).
 *
 * @param {'GET'|'POST'|'PATCH'|'DELETE'} method
 * @param {string} path Path below /v1, with ids already substituted.
 * @param {{ query?: Record<string, string|number|undefined>, body?: unknown }} [opts]
 * @returns {Promise<any>} The decoded body. Narrow it with `expect`.
 * @throws {ApiError} On any non-2xx response.
 */
export async function api(method, path, { query, body } = {}) {
  /** @type {Record<string, string>} */
  const clean = Object.fromEntries(Object.entries(query || {})
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => [k, String(v)]));
  if (CONFIG.mode === 'mock') {
    await wait(120 + Math.random() * 220);
    if (FAIL && path.includes(FAIL)) throw new ApiError(500, 'mock_failure', "Couldn't load this section.");
    const r = Mock.handle(method, path, clean, body, currentPersona);
    if (r.status >= 400) throw new ApiError(r.status, r.data.code, r.data.message);
    return structuredClone(r.data);
  }
  const token = await CONFIG.getToken();
  const qs = Object.keys(clean).length ? '?' + new URLSearchParams(clean) : '';
  const res = await fetch(CONFIG.baseUrl + '/v1' + path + qs, {
    method,
    headers: { Accept: 'application/json', 'x-trace-id': crypto.randomUUID(),
      ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    /** @type {{ code?: string, message?: string }} */
    let e = {};
    try { e = await res.json(); } catch { /* an error body is optional */ }
    throw new ApiError(res.status, e.code, e.message || 'Request failed (' + res.status + ')');
  }
  return res.json();
}

/**
 * Names the contract type a call is expected to return, so a mismatch is an editor error
 * rather than a runtime surprise. It does not validate at runtime: it is a claim about the
 * contract that the type checker holds you to.
 *
 *   const s = expect('getSummary', await api('GET', '/summary'));
 *
 * @template {OperationId} K
 * @param {K} _operationId
 * @param {any} value
 * @returns {Operations[K]['response']}
 */
export function expect(_operationId, value) { return value; }
