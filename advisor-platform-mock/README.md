# Advisor Platform mock server (API v0.3)

A dependency-free mock of the draft Advisor Platform API for the firm, advisor and client-portal views. It implements all 50 operations in `openapi.yaml` on one consistent dataset, enforces roles, and serves the dashboard.

Nothing here is the real backend. It exists so the dashboard can be built and demonstrated before the backend and the Green Meadows connection exist, and so developers have a running example of every shape in the contract.

## Run it

Needs Node 18 or newer. There is nothing to install.

```
npm start
```

Then open http://localhost:4010/ for the dashboard, already connected to this server. Use `PORT=8080 npm start` to change the port.

```
npm test
```

runs 34 tests, including one that reads `openapi.yaml` and checks that every listed operation is served, and one that checks the dashboard's embedded mock has not drifted from `src/mock-core.js`.

## Signing in

The bearer token is a persona name. There is no real authentication.

| Token | Person | Roles | Views |
| --- | --- | --- | --- |
| `dana` | Dana Whitfield | principal, advisor | firm, advisor |
| `marcus` | Marcus Bell | advisor | advisor |
| `grace` | Grace Okafor (client of Dana) | client | client |

```
curl -H 'Authorization: Bearer dana' http://localhost:4010/v1/session
curl -H 'Authorization: Bearer dana' 'http://localhost:4010/v1/households?scope=firm&sort=aum,desc&size=5'
curl -H 'Authorization: Bearer grace' http://localhost:4010/v1/me/household
curl -H 'Authorization: Bearer dana' -H 'Content-Type: application/json' \
     -d '{"type":"plan","sourceId":"draft-1","title":"Your retirement plan"}' \
     http://localhost:4010/v1/households/h3/shares
```

A missing or unknown token returns 401. Set `MOCK_DEFAULT_PERSONA=dana` to allow requests with no token.

## What it does

- **Roles are enforced.** A client asking for advisor data gets 403. An advisor asking for another advisor's household gets 404. Firm-wide data needs the principal role and `scope=firm`.
- **The data is consistent.** 4 advisors, 28 households, $217.7M in total. Firm totals equal the sum of the advisors, and every signal count equals the number of items behind it. Allocation drift matches the drift signal, the fee a client sees matches the advisor's fee schedule, and the compliance alert counts the actual draft emails.
- **Approval gates are real, not decorative.** A draft message cannot be sent without being approved first; a transcript with no recorded consent is withheld rather than labelled; suggested next steps are drafts that create nothing until an advisor posts them to `/tasks`; onboarding will not convert until every step is done.
- **State changes persist until reset.** Completing a task, dismissing an alert, sharing an item with a client or requesting a meeting all take effect. A client's meeting request becomes a task for their advisor.
- **Client responses are client-safe.** The `/me` endpoints never return advisor-side fields such as briefs, status flags or contact history.
- **Dates are relative to today.** Restart the server or call `POST /_mock/reset` to re-anchor them.

## Testing states the real backend will produce

| Header | Effect |
| --- | --- |
| `x-mock-fail: 503` | Returns that status immediately with `code: mock_failure`. Any status from 400 to 599. |
| `x-mock-delay: 1500` | Waits that many milliseconds before answering. |
| `x-trace-id: abc` | Echoed back in the response header and in error bodies. |

`MOCK_LATENCY_MS=200 npm start` adds a delay to every call. `MOCK_QUIET=1` turns off request logging.

## Endpoints outside the spec

These exist only for development.

| Method and path | Purpose |
| --- | --- |
| `GET /_mock/personas` | List persona tokens |
| `POST /_mock/reset` | Restore the seed data |
| `GET /healthz` | Liveness check |
| `GET /openapi.yaml` | The contract this server implements |
| `GET /` | The dashboard, configured for this server |

## Pointing the dashboard at the real backend

`dashboard/js/config.js` controls where data comes from.

```js
window.ADVISOR_CONFIG = {
  mode: 'live',
  baseUrl: 'https://your-backend.example.com',  // the /v1 prefix is added for you
  getToken: async () => yourSessionToken         // return the bearer token
};
```

Leave `personaPicker` off so the demo buttons disappear. The dashboard never holds Green Meadows credentials, and it must not: the backend calls Green Meadows.

## How the pieces fit

```
server.js              HTTP layer: routing, sign-in, CORS, failure injection, static files
src/mock-core.js       the dataset and every operation; imported by the server and the dashboard
openapi.yaml           the contract (v0.3 draft)
dashboard/index.html   a shell: markup, stylesheet, one module script
dashboard/styles.css   all styling
dashboard/js/*.js      the dashboard, as native ES modules (no build step)
test/server.test.js    behaviour and contract tests
```

The dashboard imports `src/mock-core.js` directly, so the mock exists in exactly one place. `dashboard/js/api.js` is the only module that knows whether data comes from the mock or a real backend.

There is no build step. The browser loads `dashboard/js/*.js` as native ES modules, and the server sends them `no-store` so an edited file is never served stale.

## Known limits

- Response shapes for Green Meadows data (balances, positions, tax lots, documents, fees) are assumptions. The Green Meadows reference documents parameters but not response bodies. Replace them with recorded real responses when you have the sandbox key.
- Some actions are placeholders in the dashboard, such as alert buttons like "Review" and "Draft email".
- There is no persistence to disk, no pagination beyond `page` and `size`, and no request validation beyond required fields.
- Not a security model. Do not expose this server to a network you don't control.
