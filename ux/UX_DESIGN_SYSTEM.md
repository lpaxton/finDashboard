# UX design system — Advisor Platform

*v0.5 · 26 September 2026 · Owner: Leila Mitchell · Tokens: `UX_TOKENS.css` · Rules:
`UX_RULES.md` · Evolved from the team's earlier design work and fitted to the five UX
commitments. Replaces the placeholder look in `styles.css` by agreement. v0.3 cooled the ground and gave
Clients the lighter teal; v0.4 made every status quiet (never solid); v0.5 makes Development slate sage and gives Market its own saved blue. Full colour spec: the
"Advisor Platform — colour system spec" doc. Supersedes v0.1–v0.3.*

Canvas: boards 12 (style tile) and 13 (Today, visual pass) on "Advisor Today — wireframes".

---

## 1. Six visual principles

Each one is a rule from `UX_RULES.md` made visible.

1. **Calm ground, colour that means something** (ST-04). The page is cool stone. Colour arrives
   only when it says something: a role, a status, or the platform's own work. Nothing is
   decoration only.
2. **Each role owns one gradient, everywhere** (ST-02). Prospecting, Clients, Operations and
   Development each have a deep gradient that appears on the role's mark, on the band of its
   card, on its home and in the spine. The two-letter mark travels with it, so colour is never
   the only signal.
3. **Deep leads, white follows** (FO-04). The one item that leads Today sits on its role's deep
   gradient. Everything else is a white card with a thin gradient band on top. One deep card
   per screen, at most.
4. **The platform's voice is violet.** Anything the platform prepared, suggested or said —
   drafts, receipts, suggestions, Ask — is violet. Violet means *"the platform did this; it
   needs your eye."* (TR-04, product rule 1)
5. **Dashed means not yet real.** A dashed violet frame marks a draft that hasn't been sent.
   Nothing sent or final is ever dashed. (Product rule 1: a draft never looks sent.)
6. **Three typefaces, three jobs.** Serif for voice (headings, greetings, empty states,
   figures); sans for doing (card titles, body, interface); mono for provenance (sources,
   times, labels). You can tell what a line *is* from its face.

---

## 2. Colour

Values for light and dark are in `UX_TOKENS.css`. Every text colour passes WCAG 2.1 AA in
both themes.

### The ground

| Token | Light | Meaning | Use |
| --- | --- | --- | --- |
| `--bg` | `#F3F4F0` cool stone | The page | Never pure white; same family as mist, fog and moss |
| `--surface` | `#FAFBF8` paper | Cards and panels | One step up from the ground |
| `--mist` | `#E8E9E3` | Secondary surface | Hover row, quiet wells |
| `--ink` | `#1B1F1D` | Primary text; primary buttons | Headings, body, the one main action |
| `--muted` | `#4C5145` graphite | Secondary text | Sources, timestamps, labels |
| `--line` | `#D7DAD3` fog | Structure | 1px hairlines only |

### Interactive

| Token | Light | Meaning | Never |
| --- | --- | --- | --- |
| `--ink` (fill) | `#1B1F1D` | Primary button on paper or sand | More than one per card |
| `--brand` | `#3D5440` moss | Links, active nav, selected state | Decoration, headings, status |
| `--brand-soft` | `#E3E9E1` | Active nav and selected-row background | Large fills |
| `--accent` | `#E45D4D` coral | Focus ring; the dot on "why today's order changed" | Text, fills, buttons, anything larger than a dot |

### The four roles — gradients at 165°

Each role has four tokens:

| Suffix | What it is | Use it for |
| --- | --- | --- |
| `--role-x` | Solid, text-safe | Marks and labels on sand or paper |
| `--role-x-soft` | Tint | Backgrounds behind role text |
| `--role-x-grad` | Full three-stop gradient | Bands, marks and graphics — **no small text** |
| `--role-x-deep` | Mid-to-deep two-stop gradient | The lead card; **the only gradient text may sit on** |

| Role | Mark | Solid | Full gradient | Earlier name |
| --- | --- | --- | --- | --- |
| Prospecting & business development | BD | `#9E3F2B` | `#D2644A → #9E3F2B → #4A1C12` | New — coral → terracotta |
| Clients | CA | `#1F6B73` | `#3FA0A6 → #1F6B73 → #14322A` | Market signals (lighter than the old client slate) |
| Operations | OP | `#8C5C20` | `#C68A3A → #8C5C20 → #3F2A0C` | Operations system |
| Development | PD | `#59675C` | `#899A8D → #59675C → #2B352D` | New — slate sage, deliberately the quietest role |

**Why the "-deep" rule:** white text passes AA on every stop of the deep gradients. The bright
top stop of the full gradients (for example `#C68A3A` or `#3FA0A6`) fails for small text, so a full gradient
never carries words smaller than 24px.

### The platform's voice and market information

| Token | Light | Meaning | Where |
| --- | --- | --- | --- |
| `--ai` | `#5A4A8C` violet | The platform prepared, suggested or said this | Draft frames (dashed), receipt dot |
| `--ai-soft` | `#E5E2EF` | Background for the platform's work | Suggestion wells on white cards, receipts |
| `--ai-deep-edge` | `#3F326C` | The platform's edge | 3px left edge on suggestion wells |
| `--ai-grad` / `--ai-deep` | `#6E5DA0 → #3F326C → #1C1438` | The platform itself | The Ask pill, the Ask panel header, and the small "Suggested" and "Draft · not sent" labels |
| `--market` / `--market-soft` / `--market-grad` | `#335B8A`, `#E4E8F1`, `#6D8DBC → #335B8A → #142D49` | Outside information | **Saved, not in use.** Its own blue for a future market section; never a role, never beside a Clients band |

### Status — always with a word

| Token | Light | Soft | Meaning |
| --- | --- | --- | --- |
| `--ok` | `#356856` | `#E1ECE7` | Good, synced, gains — *when a rise is good* (product rule 5) |
| `--warn` | `#77602E` | `#F1E9DA` | Needs attention |
| `--crit` | `#954552` | `#F5E4E5` | Past due, breached, failed (muted berry, clear of Prospecting's terracotta) |

Status colour always travels with a word ("Past due") or an icon. Tints are **dusty** (low
saturation, pulled toward the ground) so they sit with the earthy gradients rather than reading
as pastel. **No status is ever a solid fill:** tint + dot + word on paper; on a deep card, a glass pill
with a light dot (`--ok-on-deep`, `--warn-on-deep`, `--crit-on-deep`). A status never
outshouts the role colour around it. Charts use `--chart-1..4` (neutrals), never role colours. **Warn moved** in v0.2 from
amber to a yellow-olive so it can't be mistaken for Operations' amber (ST-04).

---

## 3. Type

| Job | Face | Token | Examples |
| --- | --- | --- | --- |
| **Voice** | Newsreader (serif) | `--serif` | Page headings · "Good morning, Marcus" · empty states · figures |
| **Doing** | Plus Jakarta Sans | `--sans` | **Card titles**, body, buttons, form fields |
| **Provenance** | JetBrains Mono | `--mono` | Source lines · timestamps · eyebrows and labels (uppercase, +0.08em) |

Card titles moved from serif (v0.1) to sans, semibold: a card title is something you act on.

**Scale** (size / line height): display 44/48 · page heading 30/38 · card title 18/24 ·
section 16/22 · body 15/24 · small 13/20 · label 11/14 (mono, uppercase, +0.08em).

Sentence case everywhere. No exclamation marks.

---

## 4. Shape, depth and motion

- **Radii:** 8 (controls) · 12 (cards and panels) · pill (chips, Ask). No others.
- **Lines:** 1px hairlines around white cards.
- **Depth:** three levels. `--elev-1` on every card at rest; `--elev-2` on the lead card and on
  hover; `--elev-3` only for what floats above the page (Ask panel, send confirmation,
  side sheets). Higher means closer to you.
- **Glass:** on a gradient, buttons and chips are glass — `--glass-fill` (14% paper),
  `--glass-line` (32% paper), 6px blur. The main action on a deep card is solid paper with ink
  text so it still reads as the one to press.
- **Motion:** `--ease` with `--dur-fast` (120ms) for hover and press, `--dur-base` (220ms) for
  opening, closing and panels, `--dur-slow` (400ms) only for a role or page change. Every
  movement explains where something came from or went (FO-08). Reduced motion = none.

---

## 5. Components (as drawn on the canvas)

| Component | Anatomy | Rules |
| --- | --- | --- |
| **Role mark** | 28px rounded square on the role's full gradient, two letters in mono, paper text at 11px bold (a mark, not body text) | ST-02 |
| **Lead card** | Role's `-deep` gradient · glass eyebrow chip (role) · status badge · title in sans · context line · glass suggestion well · solid paper main button, glass *Not now* · `--elev-2` | FO-04, FO-09 |
| **Status badge** | Pill, `-soft` fill, 6px dot and word in the status colour · on a deep card: glass pill, paper word, `-on-deep` dot · never solid | ST-04, product rule 5 |
| **Role card** | Paper, 12 radius, hairline, `--elev-1` · 34px band on the role's `-deep` gradient with the mark and role name · title · context · violet-soft suggestion well · ink main button · mono source line | FO-02, FO-09 |
| **Suggestion well** | `--ai-soft` on white with a 3px `--ai-deep-edge` (glass on a deep card) · "Suggested" label on `--ai-deep` · one action · *Not now* · *Not this* | CS-03, CS-05 |
| **Draft frame** | Dashed 2px `--ai` border around the email as it will arrive; "Draft · not sent" label on `--ai-deep`; editable in place | TR-02, product rule 1 |
| **Send confirmation** | `--elev-3` sheet: "This leaves the firm" · to · from · attached · can't be recalled | TR-01, TR-02 |
| **Receipt line** | Violet dot + mono line: what the platform did, from what, when | TR-04 |
| **Source line** | Mono, muted: kind of source · how recent | TR-06, TR-10 |
| **Order pill** | Mono label with a coral dot: "Why today's order changed" — opens the reason | ST-03, ST-09 |
| **Ask** | Pill on `--ai-deep`, paper text, bottom right, always the same place, `--elev-3` | ST-01 |
| **Pin** | Outline bookmark icon on a card; filled when pinned | ST-07 (open: who sets pins) |
| **Activity row** | Time (mono) · what happened · status (mono) · one action (Undo / Open) | TR-03, TR-07 |
| **Empty state** | One serif sentence ("Nothing pressing today."), optional one quiet offer | FO-05 |
| **Buttons** | Primary: ink fill · Secondary: hairline · On a gradient: glass · Quiet: underlined moss text. 44px minimum height | — |

Icons: outline, 1.5px stroke, 24px box, `currentColor` (Lucide is a close match). No emoji.

---

## 6. For Luke — what changes, what doesn't

| Your token | Was | Now |
| --- | --- | --- |
| `--bg` | `#EEF1F0` cool grey-green | `#F3F4F0` cool stone (lighter, a touch warmer) |
| `--surface` | `#FBFCFB` | `#FAFBF8` |
| `--ink` | `#16262D` | `#1B1F1D` |
| `--muted` | `#5B6B71` | `#4C5145` |
| `--line` | `#D5DCDA` | `#D7DAD3` |
| `--brand` | `#0E5A57` teal | `#3D5440` moss (links and active; primary buttons move to ink) |
| `--ok` · `--warn` · `--crit` | green · amber · crimson | Same meanings; dusty tints; warn is now yellow-olive |
| `--sans` | Instrument Sans | Plus Jakarta Sans |
| `--serif` | Source Serif 4 | Newsreader |
| **New** | — | `--mist`, `--accent`, `--mono`, `--ai*` (incl. `--ai-deep-edge`), `--role-*` (solid, soft, grad, deep), `--market*`, glass, radii, `--elev-1..3`, motion |

Your structural choices stay: hairlines, no card-on-card, serif on figures, the accessibility
floor. Swapping the three `:root` blocks changes the ground, type and status colours with no
other edits. The gradients, glass and elevation arrive with the Today requests (UX-008).

### Two things found by dropping the tokens into the build (26 Sept)

The tokens were applied to a local copy of the build and screenshotted in light and dark (no
errors; ground, surfaces, lines and status colours all changed as expected).

1. **The firm's accent colour overrides `--brand` at runtime.** `state.js` sets `--brand` from
   the firm's branding (`accentColor`). So moss is only the default until a firm picks its own
   colour. **Parked [PO], 26 Sept — to decide later in the process:** should a firm's accent drive the interactive colour, or
   only its client-facing materials and mark (TM-02)? A red or orange firm accent would collide
   with Prospecting, status and the coral focus ring (ST-04). Leaning: the firm's colour
   belongs on what clients see; the interactive colour stays fixed.
2. **Dark mode: the lifted firm accent is too dim.** Your handoff already notes the fix needs
   two stored colours, one per theme — a contract change. Moot if decision 1 goes as leaning.

---

## 7. Not yet designed

Data visualisation palette (market and role colours in charts) · icon set as components ·
illustration · dark-mode gradients (the deep gradients hold as they are; bands need a check) ·
the Client view's treatment (quieter, fewer colours) · print.
