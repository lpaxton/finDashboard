# Where the query surface lives

Written 24 September 2026 off the back of the coverage audit. **Step one is now built** — see the
last section. Shareable version: https://claude.ai/code/artifact/c7aa4f6b-4c09-4711-ab6b-752afbbfdebe

## What hangs off this decision

Nine of the eleven Intelligence Platform features, not seven. The seven "query X" features
(IP-01 to IP-07) plus **IP-08 context-aware answers per client** and **IP-11 conversation
insights**, both of which are a query surface wearing a different hat.

That makes this the single largest piece of unbuilt product, and it is the one piece that
changes the shell rather than filling in a section of it.

## Four placements

**A. A global ask bar in the shell.** Always visible, above the section nav, scoped to the
current role.
*Against it:* context-free. "What about the Lindqvists?" means naming the household every
time, and it competes with the section nav for the top of the page.

**B. Contextual panels inside each entity.** Ask within a household, a meeting, the book.
*For it:* scope is implicit, so role enforcement is trivial — you are already inside something
you are allowed to see. IP-08 is literally this shape.
*Against it:* no cross-book question, and "which clients should I call this week" is where most
of the value is.

**C. Its own section.** An eighth item in the advisor sub-nav.
*For it:* room for history, saved questions and a sources panel.
*Against it:* a destination rather than an assistant. People stop going.

**D. Hybrid — one affordance, seeded by where you are.** Reachable from anywhere; invoked
inside a household it pre-scopes to that household; invoked from Today it scopes to the book.
The panel keeps history, so it also satisfies C's case without being a place you must visit.

**Recommendation: D.** It is the only one that serves both IP-08 (per client) and IP-11
(across clients) without building two things.

## The contract matters more than the placement

Placement is a week. The contract is the part that is expensive to change later.

```
POST /queries      { question, scope: own | firm | household, householdId? }
  -> { id, answer, citations[], unanswerable[], dataAsOf }
GET  /queries/{id}   for anything long-running
```

Three properties it needs from the start, because retrofitting them is much harder:

1. **Citations are part of the answer, not a footnote.** X-04 requires source and data-as-of on
   anything shown. `citations[]` carries `{ source, id, dataAsOf }` per claim, matching the
   `source` vocabulary already in the contract (`greenmeadows`, `crm`, `calendar`, `platform`).
2. **`unanswerable[]` is a first-class field.** Which parts of the question could not be
   answered, and why — usually "no CRM connected". See below.
3. **A query can never change anything.** It reads. Anything actionable comes back as a draft
   the advisor accepts, exactly like `POST /meetings/{id}/record/next-steps` already does.
   That keeps X-03 structural rather than a rule someone has to remember.

## The thing that would sink it

**Four of the seven queryable sources do not exist.** CRM, email, market and regulatory data,
and Fidelity internal research have no connection and, for three of them, no chosen provider.

A query surface launched over that will spend most of its time being asked questions it has no
data for. If it answers those anyway, the product is worse than not having it — in a regulated
setting, a confident answer with no source is the failure mode that ends pilots.

So `unanswerable[]` is not a nicety. It is the feature that makes a partial query surface
shippable: *"I can tell you their cash position and last meeting. I cannot see their email,
because no inbox is connected."* That sentence is useful. A guess is not.

## The portal question, which is already open

HANDOFF section 9 asks whether the client portal should offer AI question answering.

**Recommendation: not in the first version.** The client-safe boundary is currently enforced by
shape — `/me` endpoints physically cannot return another household's data, and a test walks
every response looking for internal fields. A free-text query surface replaces a structural
guarantee with a probabilistic one. That is a real regression in the property this project has
been most careful about, and it should be a deliberate decision rather than a side effect of
shipping the advisor surface.

If it is wanted later, the safer shape is a query surface restricted to the household's own
already-shared content, rather than one with the portal's data access and a filter on top.

## Suggested order

1. ~~Build the contract and the panel over **custodial data and meetings only**.~~ **Done.**
   `POST /queries`, `GET /queries`, `GET /queries/{id}`, and the hybrid panel. The mock is a matcher,
   not a model, and says so in its own unmatched answer; it genuinely answers over cash, contact gaps,
   harvesting, drift, meetings, fees and the book, and refuses everything else. `unanswerable[]` covers
   the rest from day one, and a test asserts a query leaves tasks, alerts and communications unchanged.
2. Add documents when something can read a document; that unblocks IP-05, RTI-02 and AX-03
   together.
3. Add CRM when a provider is chosen; that unblocks IP-02, MEET-08 and PO-02's sync half.
4. Email, market data and internal research last: each needs an access decision before it needs
   a build.
