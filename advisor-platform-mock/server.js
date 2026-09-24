#!/usr/bin/env node
'use strict';
/*
 * Standalone mock server for the Advisor Platform API v0.3.
 * No dependencies; needs Node 18 or newer.
 *
 *   npm start              serves http://localhost:4010
 *   PORT=8080 npm start    use another port
 *
 * Non-spec helpers live under /_mock and are for development only.
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { createMock } = require('./src/mock-core');

const ROOT = __dirname;
const MAX_BODY = 1024 * 1024;

function createServer(options = {}) {
  const latency = Number(options.latencyMs ?? process.env.MOCK_LATENCY_MS ?? 0);
  const defaultPersona = options.defaultPersona ?? process.env.MOCK_DEFAULT_PERSONA ?? '';
  const quiet = options.quiet ?? process.env.MOCK_QUIET === '1';
  let mock = createMock();
  const known = () => new Set(mock.personas().map(p => p.token));

  const send = (res, status, data, extra = {}) => {
    const body = data === undefined ? '' : JSON.stringify(data);
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...extra });
    res.end(body);
  };
  const error = (res, status, code, message, traceId) => send(res, status, { code, message, traceId });
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  function readBody(req) {
    return new Promise((resolve, reject) => {
      let size = 0; const chunks = [];
      req.on('data', c => { size += c.length; if (size > MAX_BODY) { reject(Object.assign(new Error('Body too large'), { status: 413 })); req.destroy(); } else chunks.push(c); });
      req.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        if (!raw.trim()) return resolve(undefined);
        try { resolve(JSON.parse(raw)); } catch { reject(Object.assign(new Error('Body is not valid JSON'), { status: 400 })); }
      });
      req.on('error', reject);
    });
  }

  function serveFile(res, file, type, transform) {
    fs.readFile(path.join(ROOT, file), 'utf8', (err, text) => {
      if (err) return error(res, 404, 'not_found', file + ' is missing.');
      res.writeHead(200, { 'Content-Type': type });
      res.end(transform ? transform(text) : text);
    });
  }

  const handler = async (req, res) => {
    const started = Date.now();
    const url = new URL(req.url, 'http://localhost');
    const traceId = req.headers['x-trace-id'] || 'mock-' + Math.random().toString(36).slice(2, 10);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, x-trace-id, x-mock-persona, x-mock-delay, x-mock-fail');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.setHeader('x-trace-id', traceId);
    const log = (status) => { if (!quiet) console.log(`${new Date().toISOString()} ${req.method} ${url.pathname}${url.search} -> ${status} (${Date.now() - started} ms)`); };
    const done = (status) => { log(status); };

    try {
      if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return done(204); }
      const p = url.pathname;

      if (req.method === 'GET' && (p === '/' || p === '/index.html')) {
        serveFile(res, 'dashboard/index.html', 'text/html; charset=utf-8', (html) =>
          html.replace('<head>', '<head>\n<script>window.ADVISOR_CONFIG = { mode: "live", baseUrl: "", personaPicker: true };</script>'));
        return done(200);
      }
      if (req.method === 'GET' && p === '/openapi.yaml') { serveFile(res, 'openapi.yaml', 'application/yaml; charset=utf-8'); return done(200); }
      if (req.method === 'GET' && p === '/healthz') { send(res, 200, { status: 'ok' }); return done(200); }
      if (req.method === 'GET' && p === '/_mock/personas') { send(res, 200, { items: mock.personas() }); return done(200); }
      if (req.method === 'POST' && p === '/_mock/reset') { mock = createMock(); send(res, 200, { status: 'reset' }); return done(200); }

      if (!p.startsWith('/v1/')) { error(res, 404, 'not_found', 'Not found.', traceId); return done(404); }

      // Sign-in: the bearer token is a persona name (see /_mock/personas).
      const bearer = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
      const persona = bearer || req.headers['x-mock-persona'] || defaultPersona;
      if (!persona) { error(res, 401, 'unauthorized', 'Send Authorization: Bearer <persona>. See /_mock/personas.', traceId); return done(401); }
      if (!known().has(persona)) { error(res, 401, 'unauthorized', 'Unknown persona token: ' + persona, traceId); return done(401); }

      // Failure and latency injection for testing loading and error states.
      const delay = Number(req.headers['x-mock-delay'] ?? latency);
      if (delay > 0) await sleep(delay);
      const forced = Number(req.headers['x-mock-fail']);
      if (forced >= 400 && forced < 600) { error(res, forced, 'mock_failure', 'Failure injected by x-mock-fail.', traceId); return done(forced); }

      const body = ['POST', 'PATCH', 'PUT'].includes(req.method) ? await readBody(req) : undefined;
      const query = Object.fromEntries(url.searchParams);
      const r = mock.handle(req.method, p.slice(3), query, body, persona);
      const data = r.status >= 400 ? { ...r.data, traceId } : r.data;
      send(res, r.status, data);
      return done(r.status);
    } catch (e) {
      const status = e.status || 500;
      error(res, status, status === 500 ? 'internal_error' : 'bad_request', status === 500 ? 'Unexpected error.' : e.message, traceId);
      if (status === 500) console.error(e);
      return done(status);
    }
  };
  return http.createServer(handler);
}

if (require.main === module) {
  const port = Number(process.env.PORT || 4010);
  createServer().listen(port, () => {
    const mock = createMock();
    console.log(`Advisor Platform mock API v0.3 on http://localhost:${port}`);
    console.log('  Dashboard:  http://localhost:' + port + '/');
    console.log('  API:        http://localhost:' + port + '/v1   (Authorization: Bearer <persona>)');
    console.log('  Spec:       http://localhost:' + port + '/openapi.yaml');
    console.log('  Personas:   ' + mock.personas().map(p => `${p.token} (${p.roles.join('+')})`).join(', '));
  });
}

module.exports = { createServer };
