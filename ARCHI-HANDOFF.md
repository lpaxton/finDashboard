# aRCHi — handoff

> **Status, 30 September 2026: two of the six primary placements built.** The content model, the
> portfolio signals card and the message-draft strip are done — contract v0.7.0-draft, 164 tests
> passing. The full account is the top two entries in `advisor-platform-mock/docs/design.md`;
> read those before this. Still open from the plan below: **the share dialog's picker**
> (section 4, first row), **the meeting invitation** (third row), **onboarding** and **the
> client's own words on Request a meeting** — plus two decisions the build ran into and could not
> settle on its own: the advisor voice setting (section 5, question 2) and a `language` field on
> the household (question 3). Sections 5 and 8 are now history rather than instructions.

**For whoever picks this up next.** This is everything needed to add aRCHi to the advisor
dashboard without reading the rest of the history. It assumes you have the repo and nothing else.

aRCHi is **educational article PDFs, chosen by topic and sent to a client** — with a meeting
invitation, or as the follow-up to an interaction. It is the second of two products being added.
The first, **SimGPT**, is built and merged, and it is the worked example to copy: same shape of
contract change, same model-layer discipline, same test standard. Read
`advisor-platform-mock/docs/design.md` — the SimGPT entry is the top one — before starting.

---

## 1. Where the project is

```
advisor-platform-mock/
  openapi.yaml            the contract — v0.5.0-draft, 78 operations, 65 paths, 127 schemas
  src/mock-core.js        the dataset and every operation; imported by the server AND the dashboard
  src/i18n.js             the platform's own prose, in the reader's language
  src/model/              the AI capability layer: client, prompts, service, offline generator
  dashboard/js/           the front end, plain ES modules, no build step
  docs/design.md          the decision log — newest first. Add an entry for aRCHi.
  test/                   139 tests, all passing
```

Run it:

```bash
cd advisor-platform-mock && npm start
```

That serves the dashboard and the mock API on **http://localhost:4010**. There is no build step
and no dependency to install — Node 18+ and nothing else. `npm test` runs the suite.

**Node caches modules.** If you change anything under `src/` you must restart the server or you
will spend twenty minutes debugging code that is not running. This has bitten twice.

---

## 2. What aRCHi has to do

| | |
| --- | --- |
| Pick an article | by topic, from a library, at the moment the advisor is doing something else |
| Send it | to a client, through the one door that reaches the client portal |
| Record it | which article, which version, to whom, approved by whom, when |

**The regulatory review is already done.** Do not treat GP-06 to GP-10 as blocked; the
requirements doc lists them under "needs review before build" and that review has happened. Say so
in the design log entry so nobody re-raises it.

---

## 3. The socket already exists, and it is one enum value wide

This is the single most useful thing to know.

```
POST /households/{householdId}/shares
```

The contract describes it as **"the only way advisor-side content reaches the client portal"**. It
already takes a `type`:

```yaml
ShareType:
  type: string
  enum: [plan, tax_explanation, report, proposal, message, document]
```

An aRCHi article is a **seventh value**. Everything downstream of it already works:

- the backend records who approved the share and when
- the client portal renders it under **"From your advisor"** (`GET /me/shared`)
- the client-safe boundary holds, because nothing new crosses it
- the client's own language preference already applies to that screen

You are adding a kind of thing to a door that exists. **Do not build a second door.** If you find
yourself adding a path that puts content in front of a client without going through `shares`, stop
— that is the boundary the whole product's client-safety claim rests on (X-12, X-13, X-14).

---

## 4. Where it goes in the UI

Taken from a full audit of the twenty-one places an advisor touches a client. **Primary** means
build it here; **secondary** means it is a good fit once the primary ones work.

### Primary

| Placement | Where | The topic it keys off |
| --- | --- | --- |
| **Share with the client** | Household dialog → *Share with client* | The advisor picks. This is the integration point — the share form already has a type selector |
| **The four portfolio signals** | Today → Portfolio signals | `tax_loss_harvesting`, `concentration`, `allocation_drift`, `idle_cash` — four standing topics, already classified, already counted per household. **The cleanest topic-to-article mapping in the product, and the place to prove the feature with the least content** |
| **Booking a meeting** | Calendar → New meeting | The "What is it?" field, typed at the moment of creation. The natural moment to offer to send something with the invitation |
| **Message drafts** | Inbox → Drafts to approve | The subject line. Live examples: tax-loss harvesting summary, Roth conversion follow-up, reducing the technology position |
| **The six onboarding steps** | Clients → Onboarding | intake form, risk profile, custodian application, advisory agreement, funding, compliance review — six named topics a client reliably has questions about |
| **A client asks for a meeting** | Client portal → Request a meeting | **The client's own words**, free text. The only topic in the product stated by the client rather than inferred, and the best signal aRCHi will ever get. Nothing currently reads it |

### Secondary

Contact gaps on Today (a reconnection has no subject — which is exactly why it keeps not
happening; an article gives the advisor a reason to write) · Suggested next steps after a meeting ·
An upcoming meeting, to send ahead · Clients → Meetings, to send to several at once · The three
playbooks, where a step could schedule a send rather than trigger one ad hoc · Alerts whose
`draft_email` action currently has no operation behind it.

---

## 5. The design work that is actually hard

The integration is cheap. **The content model is not**, and getting it wrong is not recoverable by
a later patch.

An article library needs:

- **versioning** — articles get revised
- **an approval state** — approved, expired, restricted
- **an expiry** — a tax article from two years ago is not merely stale, it is wrong
- **a record of which version a given client was sent** — this is the one a regulator asks for, and
  it cannot be reconstructed afterwards if it was not captured at send time

Building the picker first and the library later produces a product that cannot answer the only
question that matters about it. **Design the content model before the UI.**

Open questions worth deciding deliberately rather than by default:

1. Does an article get **approved once** and then be sendable, or is each send reviewed? (COMM-03's
   review queue exists and shows what is waiting — articles flagged for review should join that
   queue rather than get one of their own.)
2. Is the covering note the **advisor's own voice**? TM-07 says firm brand, personal voice — and
   there is still no advisor voice setting in the product. aRCHi would be the second feature to
   need one.
3. **Languages.** The client portal is localised and a client can set their own language. An
   article library needs the same languages as the interface, or a French-reading client gets an
   English PDF from a French screen.
4. Where do the PDFs actually live? The mock can serve fixtures; the contract should be honest
   about the fact that a real one needs storage with its own retention rules.

---

## 6. The rules it must pass

These are the platform's existing product rules, each enforced somewhere in the contract or the
tests. A product that ignores one will break something visible.

| Rule | What it means for aRCHi |
| --- | --- |
| **X-03** drafts, not actions | Sending an article **is** an action. It must pass through the same explicit approval a message does. Nothing in the AI layer may send |
| **X-04** provenance | If a model picks or summarises an article, the output names model, prompt version, timestamp and sources |
| **X-12/13/14** client-safe boundary | Reach the client through `shares` and nowhere else. The boundary is structural, not a promise |
| **COMM-03** review queue | Articles awaiting review join the existing queue, visible in Firm → Compliance |
| **TM-02** branded templates | The rule exists and has never been actioned. aRCHi is what actions it |
| **TM-07** firm brand, personal voice | The article is the firm's; the note attached to it is the advisor's |

---

## 7. How SimGPT was built — copy this shape

`git show 35b615e` is the whole feature in one commit. The order that worked:

1. **Contract first.** Add the operation and schemas to `openapi.yaml`, bump `info.version`, add a
   "Changes in x.y.z" note in the description. Run `npm run types`.
2. **Mock it** in `src/mock-core.js`. Routes are `['METHOD', /regex/, handler]`. A route needing the
   model returns `{ status, async: 'capabilityName', context: {...} }` and `server.js` awaits it —
   `mock-core.js` stays synchronous and has no idea a model exists.
3. **Model layer** if AI is involved: a versioned prompt in `src/model/prompts.js`, a function in
   `service.js`, and an **offline generator** in `fake.js` that works with no model connected and
   reads as offline rather than pretending.
4. **Front end.** A module in `dashboard/js/`. Panels beside the page (`.side`) rather than over it.
5. **i18n.** Every user-visible string goes through `t()`; add the French to `dashboard/js/i18n.js`.
   Server-composed prose goes through `src/i18n.js`. A test fails if a key has no French.
6. **Tests that bite.** Write them, then **break the thing they guard and watch them fail**, then put
   it back. Five of SimGPT's eight were verified this way. A test that has never failed has not
   been shown to work.
7. **`docs/design.md`.** An entry saying what was asked for, what was built, what was deliberately
   not built, and what it cost. Newest first.

Conventions worth matching: comments explain **why**, never what; British English in prose; every
operation carries its `Requirement: XX-NN` id; `npm run feature-map` regenerates the
feature-to-API map and a test checks it matches the contract.

---

## 8. Suggested first move

**Portfolio signals, and nothing else.** Four topics, already classified, already counted per
household, with an advisor looking at them every morning. It needs four fixture articles to prove
the whole path end to end — library, picker, share, portal — and it is the placement where a
missing library is most obvious, so it will not let you skip section 5.

Then the share dialog, then the meeting invitation.

---

## 9. What to say to the new session

> Read `ARCHI-HANDOFF.md` and `advisor-platform-mock/docs/design.md`, then build aRCHi. Start with
> the content model, then the portfolio signals placement. The regulatory review is done.

---

*Written 30 September 2026, against `main` at contract v0.5.0-draft, 139 tests passing. The
touchpoint map this draws on is at
`https://claude.ai/code/artifact/f61ea3b8-de28-45c1-a383-719039ff9ee8`.*
