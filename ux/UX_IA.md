# UX information architecture — advisor view

*v0.2 · 29 September 2026 · Owner: Leila Mitchell · Decisions from the wireframe session on
26 Sept. The wireframes live on the canvas "Advisor Today — wireframes" (boards 1–11).
Rules referenced are in `UX_RULES.md`.*

*v0.2 — the Firm pass (§6 #3) was called and built; §1 and §6 updated. Nothing in the advisor
view changed.*

---

## 1. Scope [PO]

| View | Status |
| --- | --- |
| **Advisor** | **The focus now.** Every rule in `UX_RULES.md` is written for it |
| **Client** | A required deliverable, designed in a later pass. Already protected by the product rules: clients see only what an advisor approved |
| **Firm** | **Done — the Firm pass, 29 September.** Overview · Advisors · Compliance · Reports · Billing & fees · Ownership · Branding. Was parked at four sections; §6 #3 was called and built |

**The simplification held.** The doc's lean was that in a small firm the Firm view is the
Operations role seen across the whole firm rather than one advisor's book — the principal's
version of the Operations role home, not a separate product. That is what was built: the
Operations role's concerns at firm scale (priorities, compliance, reports, money), plus the three
places that are the firm itself and have no Operations equivalent (Advisors, Ownership,
Branding). It does **not** show Dana her own four role cards; she already has those in the
Advisor view for her own book, and repeating them here would answer "how is my book going" twice
and "how is the firm going" never. That settles `UX_RULES.md` open decision 6.

**What the pass actually unlocked.** Four firm-scope capabilities had been served and documented
for some time while no screen reached them, because the advisor view calls the same paths for one
book and scope was the missing half: `GET /next-actions?scope=firm` (PL-02),
`GET /reports/practice?scope=firm` (PO-07), `GET /communications?scope=firm` (COMM-03, the review
queue) and `GET /firm/advisors/{id}/scorecard` (AX-08). A test now asserts the scope, not just
the path.

**Note on the two switches in the build today:** the "Sign in as" bar (Dana / Marcus / Grace) is
a development tool and won't ship. The Firm / Advisor tabs are a real feature, shown only to
someone who is both principal and advisor (Dana).

---

## 2. The spine — decided (Option B)

```
Today
Inbox                 messages · drafts to approve · follow-ups
Calendar

YOUR ROLES            fixed order: growth first (pay yourself first)
[BD] Prospecting
[CA] Clients
[OP] Operations
[PD] Development

PINNED                open decision (§6)

Systems               bottom of the spine
```

**Always on every screen, always in the same place:** Ask (bottom right) · Activity (top right).

- **Most-used first.** Today, Inbox and Calendar sit at the top because they're used every day,
  by every role.
- **The roles are part of the frame** (ST-01, ST-02). The same four marks appear on Today's cards
  and in the spine, in the same order everywhere. Today may reorder its cards daily (ST-03); the
  spine never reorders.
- **One level of depth, at most** (FO-07). Sub-places live as tabs inside each role's home, not
  as a second level in the spine.

## 3. Role homes

Choosing a role opens its home: **the role's priorities** (the same ones that feed its card on
Today) **and an overview** of how that part of the business is going. Tabs inside the role hold
its places:

| Role | Tabs |
| --- | --- |
| Prospecting & business development | Overview · Pipeline · Referrals · Outreach & content |
| Clients | Overview · Households · Meetings · Onboarding |
| Operations | Overview · Reports · Billing & fees · Compliance |
| Development | Practice · Learning · Playbooks · Scorecard |

Role homes follow the same Focused rules as Today: priorities lead, overviews are sentences and
simple shapes, not tile walls. A goal, where set, gives suggestions their reason and is never
shown as a shortfall (CS-08).

**Practice is private to the advisor.** Nothing in Practice is shared with the firm.

## 4. Where each current section goes

| In the build today | Goes to |
| --- | --- |
| Today | Today |
| Next best action | Inside the role cards on Today (FO-11) |
| Clients | Clients · Households |
| Prospects | Prospecting · Pipeline |
| Communications | Inbox, and on each person's record |
| Follow-ups | Inbox, and on each person's record |
| Calendar | Calendar |
| Onboarding | Clients · Onboarding |
| Playbooks | Development · Playbooks |
| Reports | Operations · Reports |

**New homes for features that exist without one:** Referrals (referral tracking) · Outreach &
content (branded content and materials) · Scorecard · Practice · Learning.

**Why Communications and Follow-ups merge:** both are "waiting on someone." One Inbox holds
messages to answer, drafts to approve and follow-ups due. Each item also shows on the person's
record, so there are two doors to it but only one item.

**For Luke:** every section keeps a home, so no operation is left without a UI. The number
strip becomes a quiet "Book at a glance" link, which keeps `GET /summary` reachable.

## 5. Ask and Systems

**Ask is the platform's intelligence, in the foreground.** The role cards are that intelligence
speaking first; Ask is the advisor speaking first.

- Opens as a side panel **beside** the screen, never over it (FO-06).
- Knows what the advisor is looking at, and keeps the conversation as they move between screens.
- Answers show their sources and say plainly what they couldn't check (TR-06, TR-08), with a
  link to Systems to fix it.
- Also works as a **helper inside the work**: on a selection in a draft (warmer, shorter, add a
  figure with its source), and as live suggestions when the advisor switches them on (CS-06).

**Systems (bottom of the spine)** shows what the platform is connected to (custodian, CRM,
email, calendar, documents), who set each up and when it last synced, and a plain statement of
what the platform can't see right now.

- **Set up by the firm's admin** [PO, decided]: the owner, or the advisor when they own the
  firm alone. Other advisors see firm connections as read-only.

## 6. Open

| # | Question | Tag | Status |
| --- | --- | --- | --- |
| 1 | **Pinned:** does the advisor set the pins, or are pins suggested from their habits? *Leaning, for discussion:* the platform may **suggest** a pin ("You open the Ito household most mornings — pin it?"), but never adds one itself. That keeps ST-07 (what the advisor sets, stays) and TM-03 (it learns in the open). | [UX] | Open |
| 2 | Tabs for each role home beyond Prospecting: confirm when each is wireframed | [UX] | Open |
| 3 | ~~The Firm pass: is the Firm view the Operations role at firm scale?~~ | [PO] | **Yes, built 29 Sept.** See §1 |

## 7. Parked for user testing

- **Navigation A/B test.** Option A (roles as tabs across the top) vs. Option B (roles in the
  spine, tabs inside each role). B is chosen for the build; the two boards are kept so both can
  be put in front of advisors when testing resumes.

## 8. Movement

| Moment | Motion |
| --- | --- |
| Choosing a role | The spine stays still; the page fades in and settles about 8px (~150ms). Back to Today reverses it |
| Tabs inside a role | The underline slides between tabs; content cross-fades |
| Opening depth | In place, and back to where you were (FO-06, FO-08) |
| Connecting a system | A side sheet opens from the right; on success the row updates in place and a line is added to Activity |
| Everywhere | Reduced-motion settings mean no motion. Nothing moves for decoration |
