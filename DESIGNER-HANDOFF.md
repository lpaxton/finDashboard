# Designer handoff — Advisor Platform

Written for the designer joining this project. It covers what the thing is, how to see it
running, the design system already in place, and the small number of rules that look like
styling choices but are not.

If you want one sentence: **it is a working dashboard, not a prototype**, so a design change
here lands in code rather than in a comp.

---

## 1. What it is

An AI-assisted platform for financial advisers at a registered investment adviser firm. Three
connected views, and which one you see depends on who you are:

| View | Who | Sees |
| --- | --- | --- |
| **Firm** | The principal | Every adviser and client in the firm |
| **Adviser** | Each adviser | Their own clients |
| **Client** | Each client | Their own household, and nothing else |

Dana is both principal and adviser, so she gets a view switcher. Marcus is an adviser only.
Grace is a client.

## 2. Seeing it

```
cd advisor-platform-mock
npm start
```

Then open **http://localhost:4010**. Nothing needs installing; Node 18 or newer is all it
wants. The buttons along the top left sign you in as Dana, Marcus or Grace — use all three,
because they are genuinely different products, not the same screen with rows hidden.

Two things worth doing early:

- Add `?fail=alerts` to the URL to see the error and retry state.
- Switch your OS between light and dark. Both are designed; neither is an afterthought.

## 3. The design system already in place

It was built deliberately away from the generic dashboard look — no card-on-card, no drop
shadows, hairline dividers instead of boxes, and one distinctive element (the meeting timeline)
rather than a page of equal-weight widgets. Please push on this; it is a starting point, not a
finished identity.

### Colour

Tokens live once in `dashboard/styles.css` under `:root`, with a dark set redefined below.
Change a token and it changes everywhere.

| Token | Light | Dark | Used for |
| --- | --- | --- | --- |
| `--bg` | `#EEF1F0` | `#0F1A1E` | Page ground |
| `--surface` | `#FBFCFB` | `#16252A` | Panels |
| `--ink` | `#16262D` | `#E6EEEC` | Body text |
| `--muted` | `#5B6B71` | `#93A4A9` | Secondary text |
| `--line` | `#D5DCDA` | `#263A40` | Hairlines |
| `--brand` | `#0E5A57` | `#5CC0B8` | Accent, links, active state |
| `--brand-soft` | `#DCEBE9` | `#1B3A3B` | Accent backgrounds |
| `--ok` | `#2E7D4F` | `#6CC494` | Good, gains, synced |
| `--warn` | `#9A4A06` | `#E0A15B` | Needs attention |
| `--crit` | `#A3282F` | `#EE8A8F` | Overdue, breached, failed |

The neutrals are cool grey-greens rather than pure greys, biased toward the brand. `--ok`,
`--warn` and `--crit` are semantic and carry meaning — they are not a secondary palette to
decorate with.

### Type

- **Instrument Sans** (400/500/600) for interface text
- **Source Serif 4** (500/600) for headings and figures

The serif on numbers is doing real work: it is what stops a wall of financial data reading as a
spreadsheet. Both come from Google Fonts with system fallbacks.

### Layout

Breakpoints at **1180px**, **860px** and **620px**. A twelve-column grid is not used; panels
sit in a two-column flex grid that collapses. Wide content (tables, the calendar, the Kanban
board) scrolls inside its own container so the page never scrolls sideways.

### Accessibility floor

Not negotiable, and already in place: visible keyboard focus, `prefers-reduced-motion`
respected, semantic tables with sortable column buttons that announce sort state, a live region
for toasts, and real `<dialog>` elements. WCAG 2.1 AA is a stated requirement of the product.

---

## 4. Five rules that look like styling and are not

These come from financial regulation and from decisions already made. A design that breaks one
of them cannot ship, so it is worth knowing them before you start rather than after.

**1. A draft must never look like a sent message.**
Six surfaces produce AI drafts: suggested next steps, next best action, query answers, meeting
summaries, agendas and message redrafts. Every one of them is a draft until an adviser
explicitly accepts it. Nothing is sent, filed or created on the adviser's behalf. If a design
makes a draft look finished, or makes accepting one feel like a formality, it has broken the
rule the whole product is built on.

**2. An AI output must show what produced it and what it read.**
Every draft and every query answer carries its sources and a timestamp. That is a regulatory
requirement, not a nicety. You can absolutely make it quieter, more elegant, progressively
disclosed — but it cannot be removed, and it cannot be behind a click on a screen where the
adviser might act on the output without seeing it.

**3. Uncertain data must not be presented as fact.**
The custodian flags some figures as affected by unpriced securities. Where that happens the
platform marks the value as an estimate rather than showing it plainly. The client portal's
value chart is the one place this reaches a client directly, so it matters most there.

**4. The client sees only what an adviser has approved.**
The client portal never shows briefs, alerts, tasks, internal notes, signals, sentiment,
scorecards, or another household's anything. Plain language throughout — "Your accounts", "From
your adviser", never internal terms. It is a different product with a different voice, not the
adviser view with things hidden.

**5. Anything showing a rise must know whether a rise is good.**
Overdue follow-ups going up is not progress. The data already says which direction is good; a
design that colours every increase green is wrong regardless of how it looks.

---

## 5. What exists today

Ten sections in the adviser view, four in the firm view, and the client portal. All of it is
working against real data, not placeholders.

**Adviser:** Today · Next best action · Clients · Communications · Prospects · Onboarding ·
Calendar · Follow-ups · Playbooks · Reports

**Firm:** Overview · Billing · Ownership · Branding

**Client portal:** accounts, value chart, items shared by the adviser, documents, fees,
preferences, and a meeting request form.

About 29 of a planned 75 features are built. The gaps are known and deliberate, and most of
what is missing is waiting on a data source or a compliance review rather than on design.

### Components you can build with

Already styled and in use: panels, hairline tables with sortable headers, stat strips,
sparklines, the meeting timeline, alert rows with severity stripes, badges and pills, tags,
task rows, the Kanban board, the month calendar, allocation bars, usage meters, dialogs,
toasts, skeleton loaders, sub-navigation, and the empty and error states.

---

## 6. If you want something that does not exist yet

**Ask for it anyway.** If you want a component that has not been built, or a treatment for
something not yet designed — including instructions like *"anything generated by AI should be
this colour"*, or *"drafts should have their own texture"* — say so in the same terms you would
use with any engineer.

Here is what happens:

1. **I will build what can be built now**, and tell you plainly which parts I could and could
   not do, and why. Some things are one CSS token; some need a field adding to the API, which
   is slower but not a refusal.
2. **Every such request goes into `docs/design.md`**, along with what was implemented, what was
   not, and anything it implies for the product. That file goes back to Luke, so a design
   decision that widens the scope is visible to him rather than quietly absorbed.

You will not be told "that is not in the design system". If a rule in section 4 is in the way,
you will get the actual reason and, where there is one, a version that gets you the same effect
within it.

### Useful to include when you ask

- Which view and section it belongs to, since the same component often behaves differently for
  an adviser and a client.
- Whether it should hold in both light and dark, or whether you are proposing a change to one.
- Whether it carries meaning (a state, a severity, a provenance) or is purely visual — that
  decides whether it becomes a token, a component, or a one-off.

---

## 7. Where things are

| | |
| --- | --- |
| Tokens and all styling | `advisor-platform-mock/dashboard/styles.css` |
| Markup shell | `advisor-platform-mock/dashboard/index.html` (42 lines) |
| The views | `advisor-platform-mock/dashboard/js/` — `advisor.js`, `firm.js`, `client.js` |
| Shared components | `advisor-platform-mock/dashboard/js/ui.js` |
| Design decisions log | `advisor-platform-mock/docs/design.md` |
| Full project handoff | `HANDOFF.md` — engineering detail, more than you will need |

There is no build step. Editing `styles.css` and reloading is the whole loop.
