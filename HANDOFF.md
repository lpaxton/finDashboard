# Handoff: Advisor Platform (firm, advisor and client portal)

Read this first. It gives you the context, what exists, what does not, the decisions already made, and a suggested order of work. Written 24 September 2026.

## 1. What this project is

An AI-assisted platform for financial advisors at a registered investment advisor (RIA) firm. It has three connected views:

1. **Firm dashboard**, for the principal, operations and compliance.
2. **Advisor dashboard**, for each advisor.
3. **Client portal**, for each client.

Custodial data comes from the **Green Meadows API** (the reference is at `developer.thegreensfintech.com/greenmeadows`, hosted on Fidelity infrastructure). Meetings, email, CRM, tasks and marketing have no source yet, so a draft internal API and a mock stand in for them. The owner will hand a working dashboard to a client, so it must connect to real APIs later with minimal rework.

**Where things stand:** requirements, a draft API contract, a complete mock server, and a three-view dashboard running against that mock all exist. The real backend does not exist. Nothing has been connected to Green Meadows yet, and the owner does not yet have sandbox credentials in this project.

The contract and mock cover 50 operations, including the feature surface ported from the Meridian Wealth Advisor Desk mockup (communications, prospects, onboarding, book migration, calendar and meeting capture, allocation, billing, branding). The dashboard renders all of it.

## 2. What is in the repo

```
HANDOFF.md                this file, at the project root
advisor-platform-mock/
  README.md               how to run and use the mock server
  package.json            npm start, npm test (no dependencies, Node 18+, ES modules)
  server.js               HTTP layer: routing, sign-in, CORS, failure injection, static files
  src/mock-core.js        the dataset and all 68 operations; imported by the server AND the dashboard
  src/greenmeadows/       the custodian integration. schemas.js holds shapes transcribed from
                          the reference; credentials.js, client.js, mappers.js and adapter.js
                          are the adapter; fake.js is a Green Meadows shaped like the real one.
                          Read its README first.
  openapi.yaml            the API contract, v0.3 draft
  dashboard/index.html    a 41-line shell: markup, stylesheet, one module script
  dashboard/styles.css    all styling; colour tokens defined once in :root
  dashboard/js/config.js  the only file to edit when connecting to a real backend
  dashboard/js/api.js     the one place that knows whether data is mock or live
  dashboard/js/format.js  pure display helpers: no API, no DOM, no state
  dashboard/js/ui.js      shared DOM layer: panel loading, toasts, tables, dialogs, sub-nav
  dashboard/js/state.js   the little that crosses view boundaries, including branding
  dashboard/js/advisor.js the seven advisor sections
  dashboard/js/firm.js    overview, billing, branding
  dashboard/js/client.js  the client portal
  dashboard/js/app.js     entry point: sign in, pick a view, global click handlers
  types/api.d.ts          a type per schema plus an Operations map; generated, never hand-edited
  tools/gen-types.js      the generator, and a YAML reader for the subset the spec uses
  jsconfig.json           lets editors check JSDoc against the generated types, no build step
  test/server.test.js     38 tests, including a check that every operation in openapi.yaml is served
  test/greenmeadows.test.js  23 tests for the adapter, against the fake
```

Run it (from `advisor-platform-mock/`):

```
npm start        # http://localhost:4010 serves the dashboard, connected to the mock
npm test         # 61 tests
```

Sign-in is a persona token in `Authorization: Bearer <token>`: `dana` (principal and advisor), `marcus` (advisor), `grace` (client). See `README.md` for curl examples and failure-injection headers.

## 3. Links outside the repo

- Requirements doc (Claude Doc, 14 sections): https://claude.ai/code/artifact/4dddd796-9a2c-4efc-b3c5-2e65c415162f
- Published demo of the dashboard (in-page mock, no server needed): https://claude.ai/artifact/2wh9o1G9p4VmNfmx56QnPb
- Green Meadows reference: https://developer.thegreensfintech.com/greenmeadows/reference/user-federation-1 (the site blocks automated fetching; open it in a real browser session, for example Claude in Chrome)

If you cannot open the requirements doc, section 5 below has the essentials.

## 4. Product model

| Level | Who | Sees | Green Meadows access |
| --- | --- | --- | --- |
| Firm | Principal, operations, compliance | Every advisor and client in the firm | Firm-scoped access, unconfirmed |
| Advisor | Advisor, associate | Own clients, plus team-shared | Unconfirmed: advisor-wide access, or one token per federated client |
| Client | Client | Own household only | User-specific token; client federates themselves |

Roles: `principal`, `advisor`, `associate`, `client`. A user can hold several (a solo advisor is principal and advisor) and gets a view switcher.

**Client-safe rule (requirements X-12, X-13, X-14):** the client portal never shows prep briefs, alerts, tasks, internal notes, portfolio signals, sentiment scores, coaching, scorecards, or any other client's data. Anything a client sees beyond factual account data (statements, balances, fees) goes through an explicit advisor approval via `POST /households/{id}/shares`, recorded with who approved it and when. Roles are enforced on the backend, not by hiding controls.

## 5. Requirements in brief

75 features across six pillars. IDs are used in the API contract and code comments. The requirements doc has the full "shall" statement for each; the list below is the inventory.

**Intelligence Platform (IP, 11):** IP-01 Query recorded meetings · IP-02 Query CRM (Salesforce, Wealthbox, Redtail) · IP-03 Query email · IP-04 Query custodial and financial data · IP-05 Query documents · IP-06 Query external market and regulatory info · IP-07 Deep research and Fidelity internal information · IP-08 Context-aware answers per client · IP-09 Unified dashboard · IP-10 Data fusion for tax intelligence · IP-11 Conversation insights.

**Client Engagement (MEET 8, COMM 5):** MEET-01 Pre-meeting prep · MEET-02 Personalized agenda · MEET-03 Scheduling · MEET-04 Recording · MEET-05 Live transcription · MEET-06 AI summaries · MEET-07 Action item extraction · MEET-08 CRM auto-update · COMM-01 AI email drafting · COMM-02 Tone personalization · COMM-03 Communication tracker · COMM-04 Client monitoring · COMM-05 Client Sentiment Index.

**Practice Operations (PO, 12):** PO-01 Daily AI digest · PO-02 Task creation and CRM sync · PO-03 Priority surfacing and alerts · PO-04 Team share · PO-05 Spreadsheet replacement and workflow automation · PO-06 Advisor performance tracking · PO-07 Reporting and analytics · PO-08 Compliance tracker · PO-09 Multi-custodian · PO-10 Business operations management · PO-11 Book of business · PO-12 Cap table and ownership tracking.

**Planning, Portfolio and Tax Intelligence (PM 5, PL 2, RTI 10):** PM-01 Portfolio summaries · PM-02 Exposure analysis · PM-03 Portfolio modeling · PM-04 Robo portfolio · PM-05 Placing a trade · PL-01 Financial planning agent · PL-02 Next best action · RTI-01 Credit risk · RTI-02 Document ingestion · RTI-03 AI tax strategies · RTI-04 Tax opportunity identification · RTI-05 Tax loss harvesting · RTI-06 Interactive scenario modeling · RTI-07 Real-time projections and tax simulations · RTI-08 Client-facing tax explanations · RTI-09 Quantification of advisor value · RTI-10 Client-ready outputs.

**Growth and Prospecting (GP, 10):** GP-01 Advisor-client matching · GP-02 Referral tracking · GP-03 Proposal generation · GP-04 Portfolio proposals · GP-05 Pitch decks · GP-06 Content for social, blogs, newsletters · GP-07 Branded content · GP-08 Podcasts · GP-09 Presentations · GP-10 Branded materials.

**Advisor and Client Experience (AX, 12):** AX-01 AI intake forms · AX-02 Onboarding tracker · AX-03 Document intelligence · AX-04 Other onboarding assistance · AX-05 Practice client conversations · AX-06 Simulated client conversation · AX-07 Coaching in workflow · AX-08 Scorecards · AX-09 Playbooks · AX-10 Client billing · AX-11 Fee plan customization · AX-12 Client-side experience.

**Cross-cutting (X-01 to X-15):** role-based access, client data isolation, human in the loop for anything that leaves the firm or changes a system of record, source citation with data-as-of dates, audit trail, compliance review, security and privacy, managed integrations, AI quality evaluation, performance targets, accessibility (WCAG 2.1 AA), the client-safe boundary, explicit approval for shared content, server-side role enforcement, and a view switcher.

**Books and records:** the platform being a working surface rather than the system of record is partly a compliance decision — leaving the CRM canonical keeps retention and archival obligations where they already sit. Confirm with compliance before anything moves the other way.

**Regulatory sensitivity (needs review before build):** recording consent (MEET-04), placing trades (PM-05), robo portfolios (PM-04), credit risk (RTI-01), tax strategies (RTI-03), advisor value claims (RTI-09), marketing content (GP-06 to GP-10), and the Client Sentiment Index (COMM-05).

**Coverage against the 75, audited 24 September 2026 by reading the code:** 26 built and working, 16 partial, 33 remaining.

Built since the audit, all over data the platform already held, with no new source, provider choice or compliance review needed: PO-07 reporting, AX-08 scorecards, PL-02 next best action, PO-12 cap table, PO-04 team share, AX-11 fee plan customisation, PM-03 portfolio modeling, AX-09 playbooks, GP-01 advisor-client matching. Every one of the 50 contract operations now has a UI; a test asserts it. Full matrix: https://claude.ai/code/artifact/5611e434-13f5-4262-9562-4881dd3b797d

The largest gap is structural rather than incremental. Seven of the eleven Intelligence Platform features are "query X" — meetings, CRM, email, custodial data, documents, market information, internal research — and the dashboard has no query surface at all: no chat, no ask box, no cross-source search. Those seven are one missing capability, not seven builds, and deciding where it lives changes the shell rather than filling in a section of it.

Where that query surface should live, what its contract needs from day one, and why `unanswerable[]` is the field that makes a partial one shippable: `advisor-platform-mock/docs/query-surface.md`.

Three clusters are untouched: advisor development (AX-05 to AX-09, five features), marketing and sales enablement (GP-04 to GP-10, seven), and everything downstream of reading a document (IP-05, RTI-02, AX-03). Five of the marketing ones are on the regulatory list in section 5, so that order starts with compliance, not code.

## 6. The API contract (`openapi.yaml`, v0.3 draft)

One API, role-scoped: the caller's role decides what each endpoint returns. Firm-wide data uses `scope=firm` (principal only). Client-portal endpoints live under `/me`.

68 operations across 56 paths.

| Group | Operations |
| --- | --- |
| Advisor core (13) | `GET /session` · `GET /summary` · `GET /households` · `GET /households/{id}` · `GET /meetings` · `GET /meetings/{id}` · `GET /tasks` · `POST /tasks` · `PATCH /tasks/{id}` · `GET /alerts` · `PATCH /alerts/{id}` · `GET /portfolio-signals` · `GET /portfolio-signals/{id}/items` |
| Calendar and meeting capture (5) | `POST /meetings` · `PATCH /meetings/{id}` · `DELETE /meetings/{id}` · `GET /meetings/{id}/record` · `POST /meetings/{id}/record/next-steps` |
| Communications (3) | `GET /communications` · `GET /communications/{id}` · `PATCH /communications/{id}` |
| Prospects (3) | `GET /prospects` · `GET /prospects/{id}` · `PATCH /prospects/{id}` |
| Onboarding (4) | `GET /onboarding` · `GET /onboarding/{id}` · `PATCH /onboarding/{id}/steps/{stepId}` · `POST /onboarding/{id}/convert` |
| Migration (2) | `GET /migrations` · `POST /migrations` |
| Portfolio and fees (2) | `GET /households/{id}/allocation` · `GET /billing/fees` |
| Firm (9) | `GET /firm/summary` · `GET /firm/advisors` · `GET /firm/advisors/{id}` · `GET /firm/compliance` · `GET /firm/billing/subscription` · `GET /firm/billing/invoices` · `GET /firm/billing/invoices/{id}` · `GET /firm/branding` · `PATCH /firm/branding` |
| Intelligence (3) | `POST /queries` · `GET /queries` · `GET /queries/{id}` |
| Reporting (3) | `GET /reports/practice` · `GET /next-actions` · `GET /firm/advisors/{id}/scorecard` |
| Billing and modeling (5) | `GET /billing/fee-plan` · `PATCH /billing/fee-plan` · `PATCH /billing/fees/{id}` · `GET /models` · `POST /households/{id}/model-comparison` |
| Playbooks and growth (3) | `GET /playbooks` · `POST /playbooks/{id}/runs` · `GET /prospects/{id}/matches` |
| Ownership (1) | `GET /firm/cap-table` |
| Sharing (4) | `POST /households/{id}/shares` · `GET /team-shares` · `POST /team-shares` · `DELETE /team-shares/{id}` |
| Client (8) | `GET /me/household` · `GET /me/documents` · `GET /me/documents/{id}` · `GET /me/fees` · `GET /me/shared` · `GET /me/preferences` · `PATCH /me/preferences` · `POST /me/meeting-requests` |

Everything from Calendar down to Portfolio and fees was ported from the Meridian Wealth Advisor Desk mockup, which covered a wider feature surface than v0.2 did. `GET /firm/branding` is the one operation any signed-in role may read, because the client portal is branded too; only a principal may change it.

Conventions: ISO 8601 dates, USD numbers, zero-based paging with default size 20 (matches Green Meadows), empty results return 200 with an empty list, summaries carry `dataAsOf`, items carry a `source` (`greenmeadows`, `crm`, `calendar`, `platform`), account numbers are always masked to the last 4 digits, `x-trace-id` is echoed and forwarded to Green Meadows as `x_gm_ext_traceid`.

**The contract is a proposal.** Several shapes are assumptions (see section 9). The mock and the contract are meant to be edited together.

**Four rules the ported operations enforce, which the Meridian mockup illustrated but did not implement.** They are covered by tests, so removing one fails the suite.

1. A communication cannot go from `draft` to `sent`. It must be approved first, and the approver and time are recorded (X-03, X-05).
2. A transcript is returned only when recording consent is on file. Without it the response carries `withheld: true` and no content, and `POST .../next-steps` is refused with 409 — the model is not run over a transcript the firm has no consent for (MEET-04).
3. `POST .../next-steps` returns drafts with `accepted: false` and creates nothing. An advisor turns a suggestion into a task by posting it to `/tasks` (X-03).
4. Onboarding will not convert until every step is done, and the refusal names what is outstanding (AX-02).

## 7. Green Meadows API: what was learned

The reference has about 120 endpoints. Sixteen topics were read in full (the list below, plus federation and tokens in all three environments); the rest were mapped from names and descriptions only.

**Environments and hosts.** Three sets of the same federation and token pages exist.

| Environment | Host | Needs |
| --- | --- | --- |
| Non-mTLS sandbox | `gp-sandbox.fidelity.com` | API key and `tid`. For testing. |
| mTLS sandbox | `api.greenpierxq1.com` | mTLS client certificate; `x_gm_client_info` header (encoded client ID plus secret hash, issued at mTLS onboarding); API key; bearer identity token signed with the robo advisor application's private key, whose subject is the client's TID. |
| mTLS production | `api.greenpier.com` | Same as mTLS sandbox |

**Auth flow.**

1. `POST /token/fintech/user/b2b` (User Federation): maps one of your users to the platform. Takes the user's **tax ID (SSN)**. Must run once before a user token can be issued.
2. `GET /token/fintech/retail/b2b` (User Specific Access Token): returns a short-lived token. Must be refreshed.
3. `GET /token/fintech/advisor/b2b?type=ROBO` (ROBO Advisor System Access Token): system-level token for robo advisor actions.
4. Business calls send the API key, the token (`x_gm_ext_token`) and a unique `x_gm_ext_traceid` per request.

Non-mTLS sandbox paths end in `/nonprod`.

**Endpoints read in full** (paths are relative to the environment host):

| Purpose | Method and path |
| --- | --- |
| Account summaries | `GET /ftgw/fcat/customer/user/v4/accounts/summary` (query `status`, `aoStatus`, `amStatus`, `feature`) |
| Balances | `POST /ftgw/fcat/bookkeeping/v2/accounts/balances/search` (`accountNumbers`, `include: [accountNetworth]`, paging) |
| Performance | `POST /ftgw/fcat/bookkeeping/v1/accounts/performance/get` (`accountNumbers`) |
| Positions | `POST /ftgw/fcat/bookkeeping/v3/positions/get` (`accountNumbers`, `includeCurrentValue`) |
| Transaction history | `POST /ftgw/fcat/bookkeeping/v3/accounts/history/get` (up to 30 accounts) |
| Open tax lots | `POST /ftgw/fcat/bookkeeping/v2/opentaxlot/get` (one account plus `subAccountCode` CASH or MRGN per call) |
| Realized gain and loss | `POST /ftgw/fcat/bookkeeping/v1/realized-gain-loss/get` |
| Model portfolios | `GET /ftgw/fcat/portfolios/ria/v1/customer/models` |
| Account rebalances | `POST /ftgw/fcat/portfolios/ria/v1/customer/accounts/rebalances/search` (10-digit `account_number`) |
| Documents | `POST /ftgw/fcat/reports/user/v1/documents/search` (`accountNumbers`, `docTypes`, dates) |
| Notes | `GET /ftgw/fcat/ows/api/v1/get-notes` |
| Service requests | `POST /ftgw/fcat/ows/api/v1/work-items` |
| Account fees | `POST /ftgw/fcat/rt/v1/account-fees/search` |
| Margin calls | `POST /ftgw/fcat/margin/admin/v1/margin-calls` (shown on a separate internal host; access unconfirmed) |

Other areas exist and are only mapped by name: account opening, user details, agreements, restrictions, trusted contacts, beneficiaries, funding and money movement, orders and trades (including a review-then-confirm order flow and crypto), IRA inquiries, tax day and tax transaction details, asset search and metadata, fee setup and execution, ACAT transfers, user preferences, and the rest of the RIA customer set.

**The reference does document response bodies.** An earlier version of this note said it did not, and that every Green Meadows shape here was an assumption. That was wrong. Each endpoint page carries a full field-by-field **RESPONSE BODY** tree collapsed behind its `200` row, plus a worked example in the right-hand panel. Reaching it needs a signed-in browser session: the site redirects anonymous requests to a ReadMe login, which is what made automated fetching look like a block.

Twelve endpoints have now been transcribed into `src/greenmeadows/schemas.js`, each tagged with the page it came from: account summaries, balances, balance history, positions, accounts performance, open tax lots, model portfolios, account rebalances, document search, margin calls, user notes and account fees. Ten are usable. **Two are not**: account fees publishes `content` as a bare string with the note "mapping will be dynamic", and user notes documents a user-info object that does not contain the notes. Both need a sample response before anything maps to them, and both are load-bearing (fees for AX-10 and AX-11, notes for the CRM surface). `src/greenmeadows/README.md` has the detail, what is still uncaptured, and the method.

**Coverage.** Green Meadows covers 30 of the 75 features; the other 45 need different sources.

- Data only or partial: IP-04, IP-05, IP-08, IP-09, IP-10, PM-01, PM-02, PM-03, PL-01, RTI-01, RTI-02, RTI-04, RTI-05, RTI-09, PO-02, PO-07, PO-08, PO-11, MEET-07, MEET-08, COMM-03, AX-02, AX-03, AX-12.
- Direct: PM-04 (robo), PM-05 (orders), AX-01, AX-04 (account opening), AX-10, AX-11 (fees).
- No endpoint: IP-01 to IP-03, IP-06, IP-07, IP-11; MEET-01 to MEET-06; COMM-01, COMM-02, COMM-04, COMM-05; PO-01, PO-03 to PO-06, PO-09, PO-10, PO-12; PL-02; RTI-03, RTI-06 to RTI-08, RTI-10; GP-01 to GP-10; AX-05 to AX-09. PO-09 (multi-custodian) is structurally uncovered: Green Meadows is one custodian.

**Dashboard widget to endpoint mapping** (what the backend should assemble):

| Dashboard data | Green Meadows source |
| --- | --- |
| Assets, month change, 12-month trend | Balances (with `accountNetworth`), `POST /ftgw/fcat/bookkeeping/v1/balance-history/search` (daily, max 30 accounts per call, points can be flagged inaccurate) |
| Household values and 30-day change | Account summaries, balances, performance |
| Tax-loss harvesting signal | Open tax lots (`unrealizedGainOrLoss`, `washSaleAmount`, `holdingPeriod`), realized gain/loss. One call per account per sub-account code. |
| Concentration and idle cash signals | Positions, balances |
| Allocation drift signal | Model portfolios (`holdings[].category`, `targetPercent`, and the model's own `driftThreshold`), positions, rebalances search. Green Meadows already computes drift: rebalance `reasons` include `DriftExceeded`. |
| Account-status and margin alerts | Account summaries (status), margin calls (internal host, access unconfirmed) |
| Meetings, tasks, last contact | None. Needs calendar, task store, CRM. |

## 8. Architecture decisions already made

1. **A backend service sits between the dashboard and everything else.** The API key, tax ID, tokens, mTLS certificate, client secret and identity-token signing key must never reach a browser or a log. The dashboard's `CONFIG.baseUrl` points at this service; the service calls Green Meadows.
2. **One role-scoped API**, not three. `scope=firm` for firm-wide data; `/me` for the client.
3. **The dashboard talks only to the internal API contract.** All mock-versus-live logic lives in one function, `api()`. Mappers and formatters sit at the edge: the API returns ISO dates and plain numbers, the UI formats them.
4. **Sharing is the only route from advisor content to the client**, and it is recorded.
5. **AI outputs are drafts until an advisor accepts them.** Nothing is sent to a client, written to a CRM, or traded without explicit advisor action (X-03).
6. **Mock and contract stay in step.** `test/server.test.js` fails if `openapi.yaml` lists an operation the server does not serve.

## 9. Assumptions and open questions

Assumptions baked into the code and contract:

- **"Household" is an invented grouping.** Green Meadows has users and accounts, not households. The API returns `households`; the backend must define where households are stored.
- ~~Green Meadows response shapes for balances, positions, tax lots, documents and fees.~~ Balances, positions, account summaries and balance history are now transcribed from the reference (`src/greenmeadows/schemas.js`). Tax lots, documents and fees are not yet. What remains assumed is the sandbox's behaviour, not its shapes: several fields are documented as "Not applicable", and the reference contradicted its own example twice in the balances endpoint.
- **The client portal's 12-month value chart needs a real source.** `ClientHousehold.trend` is in the contract and the mock fills it, but the backend must populate it from custodial balance history (balances over time). The dashboard draws no chart when the field is absent, which is the correct failure: a client-facing performance line the firm cannot evidence must never be generated in the browser.
- `Preferences` fields are placeholders for the Green Meadows preferences endpoints.
- Meeting briefs, alert sources and signal thresholds (for example a 20% concentration limit, 5-point drift, 10% idle cash) are illustrative.

Open questions, from the requirements doc:

- **Does `includeCurrentValue` actually price positions?** The positions reference marks `currentValue` and `lastPrice` "Not applicable" while offering `includeCurrentValue` as a pricing flag, and does not resolve the contradiction. Per-position value is what the concentration signal needs. Gain and loss turned out not to depend on this (accounts performance supplies it) and asset class turned out not to either (model holdings carry `category`), so this is now the only piece of the portfolio signals with no confirmed source. Second question after the token one.
- **Can this client reach the margin admin host?** The margin-call endpoint is documented on `fcat-gm-gmsecgtwy-dev-nlb.fmr.com`, an internal dev NLB, not `gp-sandbox.fidelity.com`. It is the source for the margin-call alert.
- **Sample responses for account fees and user notes**, whose published shapes are unusable.
- Which Green Meadows token lets an advisor see every client's accounts? Only a user-specific token and a robo advisor system token appear in the reference. If none exists, options are federating every client (needs each client's SSN and consent) or asking Green Meadows for another token type.
- Does the API have a household concept? Are the margin admin endpoints available to this client? What are the token lifetime and rate limits? What is the sandbox to production timeline (mTLS onboarding)?
- Which systems supply meetings, email, CRM notes and tasks? Which calendar and CRM providers first? **The system-of-record question is decided:** the platform is a working surface and the CRM stays canonical — `advisor-platform-mock/docs/system-of-record.md`. No provider is chosen, and the answer is a port with one adapter per CRM rather than a choice. Syncable records now carry `sync`, which reports `not_configured` while none is connected.
- Are firm and advisor separate logins, or one person switching views? Can a principal open an advisor's dashboard read-only, and is that access logged?
- Should the portal offer AI question answering? A recommendation is now written up in `advisor-platform-mock/docs/query-surface.md`: not in the first version, because the client-safe boundary is currently structural (a `/me` endpoint physically cannot return another household's data) and a free-text surface makes it probabilistic. Can clients trade in the portal, or only view?
- ~~Are performance-tracking features (PO-06, AX-07, AX-08) visible to advisors, principals or both?~~ **Resolved for scorecards:** an advisor reads their own against the firm median; only a principal sees a rank or another advisor's card, because placing someone against named peers is a management decision rather than a reporting one. AX-07 coaching is still open.
- Should signal counts be computed live or refreshed on a schedule? Live needs many Green Meadows calls per advisor (open tax lots need one call per account and sub-account).

## 10. Suggested order of work

1. **Confirm access with Green Meadows.** Get sandbox credentials, then record real responses for the endpoints in section 7 and replace the assumed shapes in `mock-core.js` and `openapi.yaml`. Raise the advisor-wide token question first: it decides how the book-of-business view gets its data.
2. **Build the real backend.** The Green Meadows side is started: `src/greenmeadows/` has credential handling, transport, mappers and an adapter for accounts, balances, the trend, performance, positions, models, tax lots and documents, all running against a fake built from the transcribed shapes. What remains is the service around it (sign-in, roles, audit trail) and the domains Green Meadows does not cover. Implement the v0.3 contract with Green Meadows adapters. Start with `/session`, `/summary`, `/households`, `/households/{id}` and `/me/*`, since those come almost entirely from Green Meadows. Keep credential handling in one module. Reuse `test/server.test.js` as a contract test that runs against both the mock and the real service.
3. ~~**Turn the dashboard into a proper project.**~~ Done. `dashboard/index.html` is a 41-line shell; the application is ten ES modules under `dashboard/js/`, the mock is imported rather than copied, and `types/api.d.ts` is generated from the contract by `npm run types`. What is still open from this step: whether the mock ships in a production build at all, and adopting `// @ts-check` across the remaining modules (about 590 findings, all implicit-any and possibly-null, none of them bugs).
4. **Decide sources for the missing domains** (calendar, CRM, task store, email) and build adapters behind the same contract shapes.
5. **Build the platform's own sign-in, roles and audit trail** (X-01, X-05, X-14, X-15). The mock's persona tokens are a stand-in only.
6. **Then the AI features**, in the phasing proposed in section 9 of the requirements doc: foundation first (data access, meeting capture, tasks), then advisor value (tax and portfolio analysis, reporting, onboarding, content), then the higher-risk features.

## 11. Conventions and gotchas

- **The mock exists once.** `src/mock-core.js` is an ES module with no Node APIs, imported by both the server and the dashboard. The old embedded copy, the sync script and the drift test are gone. A test fails if a second copy is ever reintroduced.
- **No build step, and it should stay that way.** The dashboard is native ES modules loaded straight from disk. Adding a bundler means adding a toolchain to a project whose whole point is that it runs with `node server.js` and nothing else.
- **Dev assets are served `no-store`**, so an edited module is never served stale from a browser cache.
- **Dates in the mock are relative to the day it starts.** Restart or `POST /_mock/reset` to re-anchor. Weekly counts depend on the current weekday.
- **Mock-only endpoints** live under `/_mock` and `/healthz`; they are not part of the contract.
- **Injecting states for testing:** `x-mock-fail: 503`, `x-mock-delay: 1500`; in the dashboard's in-page mock, add `?fail=alerts` to the page URL.
- **Placeholder actions:** alert buttons such as Review and Draft email only show a "not built yet" message. "Open advisor dashboard read-only" from the firm view is not built; the drill-down shows summary numbers only.
- **Views and sections.** The role switcher (Firm, Advisor, Client) is the top level, per X-15. Inside the advisor view a sub-nav holds Today, Clients, Communications, Prospects, Onboarding, Calendar and Follow-ups; inside the firm view, Overview, Billing and Branding. Sections were kept below the role switcher deliberately, so an advisor's own work never sits at the same level as the client-safe boundary.

**Compliance is firm-only.** The Meridian mockup had a compliance list in the advisor's own nav, but `GET /firm/compliance` is principal-scoped, so it lives under Firm here. Giving an advisor their own compliance view needs a contract decision first: either relax that operation's role check with an `advisorId` filter, or add an advisor-scoped equivalent.

**Branding and dark mode.** `accentColor` is stored as a single light-mode colour. Applied unchanged in dark mode it fails contrast, so the dashboard lifts it toward the page ink before use (`forTheme`). A firm that wants exact brand colour reproduction in both themes needs two stored colours, which is a contract change.

**Types are generated, and the generator is strict on purpose.** `tools/gen-types.js` reads only the YAML subset this spec uses and throws on anything else, rather than guessing. Two constructs it refuses, both of which were already in the spec and silently wrong:

- An unquoted value containing a comma inside a flow mapping. YAML reads the comma as a separator, truncating the value and turning the rest of the sentence into a key. Eight descriptions in this contract were corrupted that way before it was caught. Quote any value containing a comma.
- A `$ref` pointing inside another schema (`#/components/schemas/Summary/properties/aum`). It resolves to no type name. Give the shape its own entry, as `AumBlock` and `TrendPoint` now have.

**Design.** Deliberately not the generic dashboard look. Type: Instrument Sans for interface text, Source Serif 4 for headings and figures, both from Google Fonts with system fallbacks. Colour tokens are defined once in `:root` with light and dark variants (deep teal brand `#0E5A57`, cool grey-green backgrounds, amber and crimson only for warnings). Dark mode follows the system setting. Layout uses hairline dividers instead of card-on-card, and a meeting timeline as the one distinctive element. Keep new work consistent with these tokens. The client portal uses plain language ("Your accounts", "From your advisor"), not internal terms.
- **Accessibility floor:** visible keyboard focus, reduced-motion respected, semantic tables with sortable column buttons that announce sort state, live region for toasts, dialogs via `<dialog>`.

## 12. Guardrails

- Do not put the Green Meadows API key, tokens, tax IDs, client secrets or private keys in front-end code, the repo, logs or test fixtures. The Green Meadows reference page pre-fills a sandbox API key in its example; it is deliberately not copied here. Treat it as a secret and rotate it if it has been shared.
- The federation call takes a user's SSN. Handle it server-side only, do not store or log it, and get the client's consent first.
- Never let AI place a trade, send a message to a client, or write to a system of record without explicit advisor confirmation.
- Never return advisor-side fields on `/me` endpoints. `test/server.test.js` has a leak check; extend it whenever a client-facing shape changes.
- This is not legal or compliance advice. Regulatory items in section 5 need review by compliance and legal before build.

## 13. A good first prompt

> Read HANDOFF.md, README.md and openapi.yaml, then run `npm test` and `npm start` to confirm everything works. Then propose a plan for step 2: a real backend implementing the v0.3 contract with Green Meadows adapters. Ask me which language and framework to use, and what credentials I have, before writing code.
