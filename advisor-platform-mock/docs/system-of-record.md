# The platform is a working surface. The CRM stays the system of record.

Decided 24 September 2026.

## What was actually happening

Nobody chose for the platform to be a CRM, but it had become one. `source: 'crm'` appeared
seven times in the codebase and four of those were alert seed rows — a label, not a connection.
Meanwhile the platform owned and mutated meetings, tasks, prospects, onboarding steps,
communications, meeting records and shares, across seventeen write operations.

That contradicted three of the requirements, all of which assume an external CRM:

- **IP-02** — Query CRM (Salesforce, Wealthbox, Redtail)
- **MEET-08** — CRM auto-**update** from meetings
- **PO-02** — Task creation **+ CRM sync**

## The decision

The platform is the **system of engagement**. The CRM is the **system of record**.

| The platform owns | The CRM owns |
| --- | --- |
| AI drafts and the approval that releases them | Contacts and the relationship record |
| Meeting capture, consent, records | Activity history |
| Portfolio signals and their drill-downs | Tasks, canonically |
| Onboarding progress while it is in progress | Notes |
| Queries and their citations | The pipeline, canonically |
| Sharing to the client portal, with attribution | |

The platform writes back on accept: a task created here syncs to the CRM, a meeting summary
becomes a CRM note, an approved and sent email becomes a CRM activity. That is exactly what
"sync" in PO-02 and "auto-update" in MEET-08 describe.

## Why, beyond engineering taste

RIAs have books-and-records obligations. If the platform becomes the system of record for
client communications it inherits retention and archival duties. Leaving the CRM canonical
keeps that obligation where it already sits, and keeps this platform a working surface rather
than an archive. **This belongs on the regulatory review list in HANDOFF section 5** — it is a
compliance decision as much as an architectural one.

## No CRM is chosen, and none should be

An advisor may be on any of Salesforce, Wealthbox or Redtail. So the answer is a **port and
adapters**, the same shape as `src/greenmeadows/`: one interface, one adapter per CRM.

They are not interchangeable. Wealthbox and Redtail are advisor-native and understand
households; Salesforce is generic unless the firm is on Financial Services Cloud. The port has
to be the least common denominator that is still useful, with each adapter mapping upward.

## What this changes in the contract

**`SyncState` on everything that will sync.** Tasks, communications, prospects and meeting
records each carry `sync`, naming the CRM record they map to and when they last agreed.

Its default state is `not_configured`, and that is the point. The same honesty the query
surface applies with `unanswerable[]`: when no CRM is connected, the platform says so on the
record rather than implying the sync happened. An advisor looking at a task needs to know
whether their CRM has it.

**Read-through fields are marked as such.** `Household.lastContactAt` already carries
`source: 'crm'`. Under this decision it is genuinely the CRM's value, not ours, and the
contract says so.

**Writes must become idempotent and conflict-aware** before a real adapter lands. Two-way sync
between two systems that both accept edits is the hard part, and it is not solved here. What is
in place now is the shape that makes solving it possible without reshaping every entity.

## What is deliberately not done yet

- No CRM adapter. No provider is chosen, and choosing one is a client decision.
- No conflict resolution. `syncState` can express a conflict; nothing resolves one.
- Contacts are still ours. Moving them to read-through needs an adapter to read them through.

The platform works standalone today and will keep working standalone. `not_configured` is a
supported state, not a broken one.
