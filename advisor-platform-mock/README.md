# Advisor Platform mock server (API v0.3)

A mock of the draft Advisor Platform API for the firm, advisor and client-portal views. It implements all 72 operations in `openapi.yaml` on one consistent dataset, enforces roles, and serves the dashboard. Nothing needs installing: Node 18 or newer is the only requirement.

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

runs 96 tests across three files: `server.test.js` for the contract, the roles and the client-safe boundary, `greenmeadows.test.js` for the custodian adapter, and `model.test.js` for the model layer. Two of them are worth knowing about — one reads `openapi.yaml` and fails if an operation is not served, and another fails if an operation has no UI, because an endpoint nothing calls is a feature that looks done and does not exist for a user.

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
- **AI output is always a draft.** Suggested next steps, next best action, query answers, meeting summaries, agendas and message redrafts all return `accepted: false`, create nothing, and say what produced them. An advisor turns a draft into something real by posting a task or approving a message.

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
src/greenmeadows/      the custodian integration, and the shapes transcribed from its reference
src/model/             the model layer: client, versioned prompts, offline generator, drafts
openapi.yaml           the contract (v0.3 draft)
dashboard/index.html   a shell: markup, stylesheet, one module script
dashboard/styles.css   all styling
dashboard/js/*.js      the dashboard, as native ES modules (no build step)
types/api.d.ts         generated from openapi.yaml; do not edit by hand
tools/gen-types.js     the generator
docs/                  decisions worth keeping: the query surface, the system of record
test/*.test.js         contract, custodian and model tests
```

The dashboard imports `src/mock-core.js` directly, so the mock exists in exactly one place. `dashboard/js/api.js` is the only module that knows whether data comes from the mock or a real backend.

There is no build step. The browser loads `dashboard/js/*.js` as native ES modules, and the server sends them `no-store` so an edited file is never served stale.

## Types

`types/api.d.ts` holds a TypeScript type for every schema in `openapi.yaml`, plus an
`Operations` map keyed by operationId. It is generated:

```
npm run types
```

`npm test` fails if it is out of date, if a schema has no type, or if the contract grows a
YAML construct the generator does not read.

Nothing is compiled. Editors pick the types up through `jsconfig.json`, so a module can opt
into checking by starting with `// @ts-check` — `dashboard/js/api.js` and `config.js` do, and
are clean. `checkJs` is off for the rest: the dashboard predates the checker and turning it on
reports about 590 implicit-any and possibly-null findings, none of them bugs. Adopt per file.

To run the checker yourself you need TypeScript, which this project deliberately does not
depend on:

```
npm install --no-save typescript && npm run typecheck
```

## Drafting with a real model

The drafting features work out of the box without one: `src/model/` falls back to a
deterministic offline generator, `GET /ai/status` reports why, and the dashboard says so once.
Offline drafts admit in their own text that no model read anything.

To make them live:

```
npm install @anthropic-ai/sdk
export ANTHROPIC_API_KEY=...
```

That is the project's only dependency and it stays optional — `npm start` and `npm test` need
nothing installed. The key is read server-side and never reaches the browser, the same rule
that applies to Green Meadows credentials.

## Known limits

- Green Meadows response shapes are transcribed from its published reference, not recorded from
  the sandbox — see `src/greenmeadows/README.md`. Two endpoints publish shapes that cannot be
  mapped at all (account fees, user notes), several fields are documented "Not applicable", and
  the reference contradicts its own example twice. Replace `src/greenmeadows/schemas.js` with
  recorded responses when the sandbox key exists.
- Some alert actions are still placeholders in the dashboard.
- There is no persistence to disk, no pagination beyond `page` and `size`, and no request validation beyond required fields.
- Not a security model. Do not expose this server to a network you don't control.
