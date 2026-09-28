# The build against the research

**For Luke, and for Leila.** `ux/UX_RULES.md` was written from `ux/UX_RESEARCH.md`, and the
build was written from the rules. This checks the build against the evidence directly, one
finding at a time, to catch anything the rules summarised away.

Read `ux/UX_RESEARCH.md` §1 first. It says plainly that one piece of primary research exists —
a directional study of seven RIAs (S1) — that one industry figure is properly sourced (S2), and
that everything else is the team's own framing. That changes what this check is for: where a
finding is **HEARD**, a gap in the build is a real gap. Where it is **OURS**, a gap may just be
a hypothesis we have not built yet, and building it harder would not make it truer.

Tags below are the research's own.

---

## Summary

| Finding | Tag | How the build does |
| --- | --- | --- |
| F1 Winning clients is the constraint | HEARD | **Structurally served, thinly fed** |
| F2 The week is lost around the meeting | SOURCED | **Served, and then demoted** |
| F3 Internal is fine, external needs a human | HEARD | **Strongest gain, one real gap left** |
| F4 A signal needs its next step | HEARD | **Half built. The half that is missing is the half advisors asked for** |
| F5 They already have AI and tools | HEARD | **Better than asked for** |
| F6 Attention is scarce | SOURCED + OURS | **Served, with a tension worth testing** |
| F7 Predictability and a way back | SOURCED | **Served best of all — and one risk we just took** |
| F8 Onboarding: silence is the problem | OURS | **Advisor half only** |
| F9 One person, three roles | OURS | **The build says four. See below** |

**The one to read:** F9 and F4.

---

## F9 · One person, three roles — and the build says four

The research says the advisor is **planner, relationship manager and small-business owner**
(OURS, S8). `UX_RULES.md` FO-01 says the advisor plays **prospecting and business development ·
client advisor · business operations · professional development**, and the whole of Today is
built on that.

Those are not the same four, and they are not a tidy expansion of the three:

| F9's three | Where it went in the four |
| --- | --- |
| Planner | Folded into *client advisor* |
| Relationship manager | Folded into *client advisor* |
| Small-business owner | Split across *prospecting* and *business operations* |
| — | *Professional development* has no basis in F9 at all |

So the organising principle of the entire Today screen is a reframing of a finding that was
itself the team's own framing: **OURS built on OURS, and no advisor has been asked.** The
research knows this — §9 question 9 is exactly "Do advisors recognise their week in prospecting,
client work, business operations and professional development?"

It is not wrong. It is untested, and it is load-bearing in a way nothing else in the build is.
Two things follow:

1. **Development is the emptiest card, and that is not a data problem.** It is the one role with
   no root in F9. Its card currently shows whichever scorecard metric moved most, because that
   is all there is. Before building anything into it, it is worth knowing whether advisors
   recognise it as a part of their week at all.
2. **The A/B test in §9 question 10 is now more valuable, not less.** Both navigation boards
   still exist on the canvas. The build committed to Option B; the research kept the other one
   deliberately.

---

## F4 · A signal arrives with its next step — the missing half

Half of this is now built and half of it is missing, and the missing half is the part advisors
actually named.

**Built.** Every signal leads with what it means and one action; suggestions carry a reason and
their sources; nothing arrives as raw data alone.

**Not built — and this is a HEARD finding.** S1's advisors asked for **life changes** to be
surfaced: job changes, relocations, new family members, divorce, inheritance, large
transactions, birthdays and anniversaries, retirement horizon, children reaching college age,
overspending and pay swings. `UX_RULES.md` CS-09 lists "life events" as something that counts as
slipping. **Nothing in the build detects one, and nothing in the contract could.** The research's
own cross-check (§7) says it: *"life-event detection is not a named feature, though it's one of
S1's three clearest asks."*

The word "life events" appears exactly once in the code — in a comment in `roles.js` quoting the
rule it cannot implement.

**Also not built: the restraint rule.** The research asks for the opposite of surfacing as well:
*"sensitive events never enter a draft, and a client going through a divorce gets a full
automation clamp — inspectable, with reasons."* There is no restraint concept anywhere in the
build. Every rule we implemented is a rule about what to show. This one is about what to
withhold, and it is the harder and more distinctive of the two.

Worth noting what §5 says about the market: *"What nobody ships yet: a prioritised operating day ·
execution through custody · restraint and trust rules."* We built the first. The third is
untouched and is the one with no competitor in it.

---

## F3 · Internal vs external — the biggest gain, and what is still clunky

This finding got the most from this build. S1 named three trust prerequisites: **audit trails,
version history, clear source attribution.**

| Asked for | Before | Now |
| --- | --- | --- |
| Audit trail | Nothing | `GET /activity`, top right on every advisor screen, doubling as undo |
| Source attribution | System names on screen | Every output names the kind of source and how recent |
| Version history | Nothing | **Still nothing** |

The research's §7 read was *"nothing names undo or version history."* Undo now exists several
steps back, exactly as TR-07 asks. Version history of a draft does not.

**The gap that matters more.** S1's implication is that *"the advisor approval step [must be]
explicit and easy, not an afterthought"*, and S10 warns *"if the approval UI is clunky, advisors
skip it — and the system degrades into noise."* Approving is currently: open the message in a
modal dialog, read a draft you cannot edit, press Approve. The design system's own answer to
this — the dashed **draft frame** editable in place, and the **send confirmation** sheet saying
"This leaves the firm", who it goes to, what is attached and whether it can be recalled — are
the two components of the fifteen in §5 that were not built.

That makes them the highest-value remaining work in the whole `ux/` folder: they sit on the
only finding where every advisor agreed, and they are named in both the rules (TR-02) and the
design system.

---

## F1 · Winning clients — structurally served, thinly fed

**Served.** Prospecting is first in the spine, always on Today, and cannot be pushed off by a
busy client day. That is CS-01 and it is exactly what the finding asks for: *"growth work needs
a place in the structure that matches its importance."*

**Thin underneath.** The card is fed by three rules over seven prospect records. The research's
own cross-check is blunt: *"Thinnest where it matters most. 4 of 10 growth features have an API
operation… No feature is named for prospect outreach itself."* Nothing in this build changed
that, because nothing in `ux/` asked it to.

**One accidental alignment worth keeping.** The finding carries a warning: prospect conversion
*"probably shouldn't be"* automated — the platform should *"free time for it and prepare the
ground, and leave the persuading to the person."* The build's Prospecting actions open the
record rather than drafting an approach, and they do that because the contract has no operation
to create a communication. The right behaviour arrived for the wrong reason. If a drafting
operation is ever added, **this finding says not to point it at prospect outreach.**

**Not served at all:** *"the time the platform returns should visibly point somewhere — ideally
at a prospect."* Nothing in the build shows time returned, or points it anywhere.

---

## F2 · The week is lost around the meeting — served, then demoted

Meeting prep is 10% of the week and follow-up is where time comes back first (S2). Prep briefs
now carry a receipt saying what was prepared, from what, and when.

**The tension.** Today used to lead with meetings. It now leads with four role cards, and
meetings sit below them. That is FO-01 and CS-01 working as written — growth first, because F1
says growth is the constraint — but it means the screen demotes the block the sourced evidence
says is the most recoverable, in favour of the block the interviews say is the most important.

Both readings are defensible and they point opposite ways. It is worth naming rather than
discovering in testing.

---

## F5 · Their existing tools — better than asked for

Nothing in `UX_REQUESTS.md` asked for this, and **Systems** serves it directly: what the
platform is connected to, when it last synced, and one plain sentence per gap saying what it
cannot see. *"It has to be better than what they have and fit beside it"* — the build now at
least admits what it is sitting beside.

**One omission.** The five kinds are custodian, CRM, email, calendar and documents. S1 names
advisors' planning platforms — **eMoney and RightCapital** — in active use, and the research
flags that planning-platform integration *"isn't in the list."* It still isn't. A sixth kind.

---

## F6 · Attention is scarce — with a tension worth testing

*"Show one or two things, beautifully."* Today now shows four role cards, a meetings panel and a
signals panel: six blocks. FO-02's "one action per role card, so four things at once" is a
deliberate reading of this finding, and a generous one.

The research is honest that this is the weakest-held of the findings: *"No advisor in S1 talked
about overload directly."* It is SOURCED on the attention research and OURS on the design
conclusion. §9 question 4 asks to test it by showing advisors a busy screen and a calm one.

Today is now a candidate for the busy one.

---

## F7 · Predictability and a way back — best served, and one risk taken

This finding is served better than any other, and it is the one with the strongest sources.

- *"Adapt what is in the rooms, never where the rooms are"* — the spine never reorders, Today's
  cards do, and the order pill says why.
- *"Show what's happening. Explain why in one sentence, not a paragraph. Let people undo it."* —
  the activity log, the one-line reason, undo several steps back.
- *"More explanation is usually the wrong fix."* — the reason sits behind the order pill rather
  than permanently on screen. Deliberate, and this finding is why.

**The risk we took.** S3 also says: *"Redesigns cost trust: users lose their navigational
confidence."* This build moved every section in the advisor view — Communications and Follow-ups
merged into an Inbox, Prospects, Onboarding, Reports and Playbooks moved inside role homes,
Next best action disappeared as a place. For a POC with no users that costs nothing. It is worth
recording that the evidence predicts a cost when there are.

---

## F8 · Onboarding — advisor half only

The finding is about the client's experience of the transfer window: *"the job is visibility,
not speed — for the client view as much as the advisor's."* The advisor half exists as a tracker
under Clients. The client view has not been designed, by agreement (`UX_IA.md` §1), so the half
of this finding that is actually about the client is untouched.

Consistent with the plan, worth remembering when the Client pass comes: F8 is the finding that
pass most needs to answer.

---

## What this check changes

Nothing that was built is wrong. Three things are worth acting on:

1. **Build TR-02.** The draft frame and the send confirmation. They sit on F3, the only finding
   every advisor in S1 agreed on, and they are named in the rules, the design system and the
   research's own gap list. Two components.
2. **Raise life events as a request.** F4 is HEARD, CS-09 names it, and it exists nowhere — not
   in the UI, not in the contract, not in the 75 features. It needs a feature before it needs a
   rule.
3. **Put the four roles in front of an advisor before building further into them.** They are the
   frame of the entire advisor view, they are OURS built on OURS, and the research already has
   the question written down (§9.9). Development in particular should not be built out until
   someone confirms it is a part of the week advisors recognise.

And one for the record: the five unsourced numbers in `ux/UX_RESEARCH.md` §8 marked "Don't use"
appear nowhere in the build or in any screen copy. Checked.
