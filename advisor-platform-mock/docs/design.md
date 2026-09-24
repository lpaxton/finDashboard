# Design decisions log

**For Luke.** Every design request that arrives from the designer gets an entry here: what was
asked for, what was built, what was not and why, and anything it implies for the product beyond
the styling.

The point is that a design request which widens scope, adds a field to the contract, or bumps
into one of the product's regulatory rules is visible to you rather than quietly absorbed into
a commit. Nothing here needs your approval to have happened — it has already been built — but
anything marked **Needs a decision** is waiting on you.

---

## How to read an entry

Each one records:

- **Asked for** — in the designer's words, as close to verbatim as possible.
- **Built** — what actually landed, and where.
- **Not built** — what could not be done now, and the real reason.
- **Implications** — a contract change, a new token, a cost that will land later, or a rule it
  ran into. Empty when it is purely visual.

Entries are newest first.

---

## Log

_No entries yet. The designer handoff (`DESIGNER-HANDOFF.md`) has been written and points here;
the first entry will appear when the first request arrives._

---

## Standing notes

Things worth knowing before reading entries, so the same context is not repeated in each one.

**The five product rules the designer has been given** (section 4 of the handoff) are the ones
most likely to generate an entry, because they are where a reasonable design request meets a
constraint that is not obvious from looking at the screen:

1. A draft must never look like a sent message.
2. An AI output must show what produced it and what it read.
3. Uncertain data must not be presented as fact.
4. The client sees only what an adviser has approved.
5. Anything showing a rise must know whether a rise is good.

**Requests that are cheap:** anything expressible as a colour token, spacing, type, or a
variant of an existing component. The tokens are defined once, so a palette change is one edit.

**Requests that are not cheap, and why:** anything needing information the API does not
currently return. "Colour AI-generated content differently" is an example that sounds like CSS
and is not entirely — the platform already marks AI output with provenance, so the data is
there for drafts and query answers, but content that was AI-assisted earlier in its life and
then edited by an adviser carries no such marker today. Making that distinction visible would
need a field adding to the contract and the mock. Worth knowing that shape of request exists.

**The one thing that cannot be traded away:** the client-safe boundary. It is currently
structural — a `/me` endpoint physically cannot return another household's data, and a test
walks every client response looking for internal fields. A design that needs a client to see
something adviser-side is not a styling change; it is a change to what the product is, and it
comes to you.
