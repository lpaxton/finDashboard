/* The only place that knows whether data is mock or live.
   The mock is imported from the same file the server runs, so there is no second copy. */
import { createMock } from '/src/mock-core.js';
import { CONFIG, FAIL, currentPersona } from './config.js';

const Mock = createMock();

export class ApiError extends Error { constructor(status, code, message) { super(message); this.status = status; this.code = code; } }
export const wait = (ms) => new Promise(r => setTimeout(r, ms));

export async function api(method, path, { query, body } = {}) {
  const clean = Object.fromEntries(Object.entries(query || {}).filter(([, v]) => v !== undefined && v !== ''));
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
  if (!res.ok) { let e = {}; try { e = await res.json(); } catch {} throw new ApiError(res.status, e.code, e.message || 'Request failed (' + res.status + ')'); }
  return res.json();
}
