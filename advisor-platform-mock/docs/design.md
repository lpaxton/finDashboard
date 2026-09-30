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

### 30 September 2026 · SimGPT — rehearsing a conversation (AX-05, AX-06, AX-07)

**Asked for.** Luke, after the touchpoint map: build the two products, aRCHi's regulatory review is
already done, there are no endpoints so mock the interactions — **start with SimGPT**.

**Built.** `POST /meetings/{meetingId}/rehearsal`, the model capability behind it, and a rehearsal
panel beside the page. The platform plays the client for one turn and says one thing about how the
adviser's turn landed. Three requirements that had no endpoint at all now have one.

**Where it is reached from.** Two doors, both from the touchpoint map's primary placements:

- **An upcoming meeting** — beside *Draft agenda*, which is the right neighbour because the two
  share their whole context. Opening it closes the dialog: an adviser practising a meeting wants
  the meeting on screen, not a modal over it.
- **"Prepare for {household}" on Today** — and this one replaced an action rather than adding one.
  That card used to offer *Add as a follow-up*, which would have created a follow-up saying
  "prepare for it" — a note restating the card. Preparing **is** the action, so the button now
  rehearses. AX-07 asks for coaching in the workflow rather than somewhere the adviser has to go
  and find it; this is what that means in practice.

**The one design decision everything else follows from: a rehearsal is not a record.**

Nothing is stored. The exchange travels with each request and the server keeps none of it — the
route is asserted to contain no `push`. It does not appear in the activity log either, which was
a deliberate call against the grain of X-05: the log is a record of what happened, and "Dana
rehearsed talking to the Lindqvists" is not something that happened *to the Lindqvists*. Filing
it would make a conversation the client never had into a fact about them.

The worry underneath all of it is not regulatory, it is epistemic, and I raised it in the
touchpoint map before building: **an adviser remembers what a rehearsal client told them.** So:

- The prompt's strongest instruction is the invention ban — the context block is everything known,
  and a question it cannot answer gets *"I'd have to check"* rather than a plausible figure. A
  test asserts that line survives in both languages, because it is the line a future edit would
  most easily soften.
- **The scene is composed by the platform, not the model.** It states the meeting, the household,
  the contact gap and what the record says is open. A model writing that could invent the
  household's circumstances before the adviser has said a word — the worst possible place for an
  invention, because it reads as briefing. A test stubs a model that tries and checks the scene
  is unmoved.
- Every client turn is labelled **Simulated client**, every time, not once at the top where it
  scrolls away. The framing note is dashed, which in this design system has always meant *not the
  real thing*.

**The coaching note is the product.** A simulated client on its own is a novelty; a simulated
client plus *"you led with a number and left the worry unanswered"* is coaching. Both come back in
one completion and are split here rather than asked for twice — a second round trip would double
the wait and let the note drift from the turn it is about. A reply in the wrong shape degrades to
a client turn with no note rather than showing a parsing failure.

**Offline it still works, and deliberately reads as offline.** No model connected means the client
works through the household's own open signals, one per turn, and the note counts what the adviser
did rather than judging it. It is flat on purpose: an offline rehearsal that read as fluent would
be doing the one thing this feature must never do.

**Two bugs found by looking rather than by testing.** The transcript collapsed to 14px — `.sim-body`
lost the cascade to `.side-body`, which is declared later in the file and sets `overflow-y: auto`;
fixed with a compound selector and `min-height: 0`. And the offline client repeated its first line
every turn until it was given the turn count.

**A correction, straight away.** I wrote above that one of the doors was *"Prepare for {household}"
on Today*. It is not. The item exists and carries the right action, but it ranks fifth in the
Clients role and the Today card shows the top item plus two — so it surfaces on **Clients →
Overview** and never on Today. Checked in the browser rather than assumed, after Luke asked where
the buttons actually were.

**Then, from Luke:** *"i would think at a minimum we should have buttons for every meeting
interaction."* Right — a rehearsal reached only from inside a meeting is a rehearsal an adviser
has to go looking for, which is the opposite of what AX-07 asks for. There is now a **Rehearse**
control on every meeting wherever meetings are listed:

| Where | Meetings shown | Rehearse offered |
| --- | --- | --- |
| Today → Today's meetings | 5 | 4 — not the one at 9:30, which has happened |
| Clients → Meetings, next 14 days | 7 | 6 — same rule |
| Calendar → a meeting | the dialog | beside *Draft agenda* |
| Clients → Overview | the prep priorities | on the row |

One helper renders the control and one wires it, so a fourth list of meetings cannot be the one
that forgets. **Only on a meeting that has not happened yet:** rehearsing one that is over is not
a smaller version of the feature, it is a different thing, and offering it would say the platform
has not noticed what time it is.

**Implications.** Contract **0.5.0-draft**; one operation, two schemas, no change to anything that
existed. New `dashboard/js/sim.js` and a fourth side panel. Eight tests, five verified by injecting
the matching fault.

**Still to build:** aRCHi. Its socket is one enum value on `POST /households/{id}/shares` — see the
touchpoint map.

---

### 30 September 2026 · The whole item goes in the violet box

**Asked for.** Luke: *"i like the display of content when a user clicks the 'Show the Next 2'
button. add the text above the purple box and below the purple box inside the purple box for all
4 cards."*

**Built.** On a role section the meaning and the source line move **inside** the well, so it
holds the whole item: what it means, then what the platform suggests doing about it, then where
it came from.

**And the label leads it.** Luke, straight after: *"move the Suggested tag to the top for each."*
Right, and for a reason worth writing down: the label qualifies everything under it. A suggestion
that announces itself *after* the reader has already taken the sentence as fact has announced
itself too late — the order now is whose voice, then what it means, then what to do, then where
it came from.

**Why that was the right note.** The rows under *Show the next two* have always kept their
meaning, their source and their action together in one object. The top item did not — the
meaning sat above the violet and the source below it, which left the well holding three buttons
and no subject, and made the most important item on the card read as **a different kind of
thing** from the two beneath it. They are the same kind of thing, and now they look it.

It also makes the violet mean what it is supposed to mean. `--ai` marks the platform's own
voice; with the subject outside the box, the box was marking only the buttons, which is the
narrower and less true claim.

**Spacing set on `.well .card-meaning` and `.well .source`** rather than on those two classes
directly: both are used outside a well elsewhere in the product and should not inherit a layout
they are not in.

**And a footer under it.** Luke: *"add a border above that so the card has a footer for that
action and move that link to the right side."* The *Open clients* link was the last thing in the
same column as the work; it is now a footer with a hairline over it, right-aligned. The work is
what you read and the footer is where you leave from, and the eye finishes a card on the left and
goes on from the right. The empty card gets one too — *"Nothing pressing in development today"*
is still an answer, and the way out of it should not move about depending on whether there was
anything in it.

**Implications.** `advisor.js` (one template) and `styles.css` (five rules). No contract change,
nothing new said or done, and the empty case still has no well at all, because there is no
suggestion to put in one.

---

### 30 September 2026 · Today's six cards can be moved, and tacked (ST-03, ST-07, ST-08)

**Asked for.** Luke, in one message: let the user move and reorder the six cards; turn the star
into a pin/tack that holds a card in its spot; rename *"Why today's order changed"* to **Today's
top priority** and make it move that card to the front **even if it's pinned**; rename *"Pin this
order"* to **My pin order** and make it shuffle back to the arrangement the user made.

**The six** are the four role sections and the two standing panels — Today's meetings and
Portfolio signals. They were in two separate grids; they are one now, which is what let them be
reordered against each other at all.

**Three orders, and which one wins.**

| Mode | What it shows |
| --- | --- |
| `auto` | What the platform worked out this morning, with the advisor's pins honoured |
| `lead` | The same, with today's top priority forced to the front — **pins and all** |
| `mine` | The arrangement the advisor dragged the cards into |

Dragging anything puts you in `mine`, because you have just said what you want.

**Today's top priority outranks a pin, and that is the point.** A tack that could veto it would
make the button do nothing in exactly the case it exists for. It is not destructive: the pins are
untouched, so *My pin order* puts everything back. A test holds this specifically, because it is
the kind of rule that looks like a bug to whoever meets it next.

**One button, two jobs, and they are the same job.** *Today's top priority* both says what the
top priority is — the sentence that used to hide behind *"Why today's order changed"* — and puts
that card first. Pressing it again lets the order fall back, so it reads as a state rather than
as something that happened to you (ST-08).

**Moving the cards moves the DOM, not the render.** The two panels hold data already fetched and
disclosures the advisor opened; re-rendering to change an order would throw both away and ask the
server for them again. A reorder appends the existing elements in the new order — no refetch, no
flash, and every handler survives.

**The keyboard does the same job as the drag.** Arrow keys on a focused grip move the card. Not
optional: a reorder that can only be done by dragging cannot be done by everyone, and does not
work at all on a touch screen, where the HTML drag events never fire. Left/right rather than
up/down, because the grid is two across and the arrow follows reading order.

**What a pin remembers.** The slot, not the neighbour. It is re-read after every reorder, so a
tack means "this slot" from the moment it is set and keeps meaning that after the advisor moves
it by hand. A pin that clashes with another, or that points past the end of the list, takes the
next free slot rather than being dropped — a tack that silently stopped holding would be worse
than one that shifted by one.

**What this cost, and it is worth knowing.** The star on each role card used to pin that *role*
into a **Pinned** group in the spine. The tack means something else now, which left that spine
group with nothing feeding it, so it has gone rather than sitting there permanently empty. If
pinning a section into the spine is wanted back it needs its own control somewhere that is not
the card. **Nothing else was lost:** ST-07 is still kept, by a different thing.

**Not built.** Touch dragging. The HTML drag events do not fire on a touch screen, and the grid
is one column on a phone where reordering matters least. The keyboard path covers the
accessibility case; a pointer-events implementation would cover touch, and is a bigger piece
than this was.

**Then, from a screenshot:** *"let's make it so the cards can be nested under each other without
these big gaps."*

A grid row is as tall as the tallest thing in it, so a short card beside a long one left a hole
the height of the difference — Development sat in a column of its own dead space next to a
five-meeting list. The six are laid out in **CSS columns** now, so each column packs down
independently and the holes close.

**The trade, stated because it is a real one.** The order reads **down the first column and then
down the second**, rather than left-to-right in pairs. The top priority is still the first card,
and a newspaper column is a familiar way to read a stack of unequal things — but it is a
different reading order, and it is why the count stays capped at two. Three columns of
column-major order stops being scannable.

No JS and no dependency, which rules out a masonry library. `grid-template-rows: masonry` would
keep the left-to-right order *and* close the holes, and is the right answer the moment it is in a
shipping browser. Worth revisiting then.

Verified that dragging, the arrow keys and the tacks all still behave inside a multi-column
container, and that it collapses to one column on a phone.

**Implications.** No contract change — the order and the pins are the advisor's own choices about
data, not data, so they live in view state where ST-07's other promises already live. New module
`dashboard/js/cards.js`, which is the arithmetic and knows nothing about a browser; ten tests
against it, three verified by injecting the matching fault.

---

### 30 September 2026 · Settings moves into the navigation, and gains light/dark

**Asked for.** Luke: *"let's move 'Settings' that has the language selector to the bottom of the
left side navigation"* and *"inside of settings, let's add the ability to switch from light and
dark CSS."*

**Built.** Settings is now the foot of the navigation, under a rule, below everything a view can
show. It is a **door, not a destination**: it opens the same side panel as before rather than
replacing the section, so it carries no `data-sec`, is never `aria-selected`, and leaves the
adviser exactly where they were. A nav item that changed the page would cost them their place to
change a language, which is the one thing they are least likely to want.

**The client portal has no navigation at all,** which the move nearly broke. Language and
appearance belong to the person reading, and a client reads the portal — so the portal's door is
a line in the Preferences panel it already has, *"Language and appearance"*, opening the same
panel. One panel, three doors: the adviser's spine, the firm's section list, and the client's
Preferences. A test asserts all three, and that the header button did not quietly survive
alongside them.

**Light and dark, and where the preference lives.** Three options, and *Match my system* is the
default and a real third option rather than a label for one of the other two — it removes the
attribute and lets the machine keep deciding.

It is stored in **view state, not in the contract**, and that is the decision rather than the
shortcut. The language a person reads is a property of *them* and should follow them to a new
machine. Light or dark is a property of the *screen they are at*: dark on a phone at night,
light at a desk in the morning, the same person both times. Sending it to `/settings` would give
one answer to both. A test holds that line, because it is exactly the sort of distinction that
collapses the next time someone tidies two similar-looking settings into one.

**Two things that fell out of it.**

*The firm's accent has to be recomputed on a theme change.* It is stored as a light-mode colour
and lifted toward the page ink for dark ground, so switching theme without re-applying it leaves
the firm mark at the old contrast. `applyBranding` now keeps what it was last given so
`applyTheme` can re-run it — a display change, so re-applied rather than re-fetched.

*The language re-render moved from a callback to a listener.* `openSettings` used to take an
`onChanged` function, which meant every new door had to remember to pass one. The shell now
registers with `onLangChange` at boot, and `setLang` notifies it. Three doors, no callbacks.

**Not built, and logged rather than hidden.** The theme is applied in `boot()`, and the module is
deferred — so someone who has chosen light on a dark machine still sees **one dark frame** before
it applies. Removing that needs an inline script in the document head, which would have to
duplicate the storage key and its persona scoping. Not worth it for a POC; worth knowing before
it ships.

**Implications.** No contract change: the theme never reaches the server, and `/settings` is
unchanged. `styles.css`, `state.js`, `ui.js`, `app.js`, `client.js`, `index.html`.

---

### 29 September 2026 · The role cards become role sections

**Asked for,** over four messages while looking at the screen: *"i hate the boards. let's remove
them"* → *"keep the 'Leading Today' and order of the card"* → *"keep the colored headers of the
cards"* → *"just remove the colored borders."*

**Built.** Today's four role cards are no longer cards. Each is a plain section: the coloured
header bar, then the work beneath it. No border, no card background, no fill behind the leading
one.

| Kept | Gone |
| --- | --- |
| The coloured header per role — this is how a role is recognised (ST-02) | The card border, in any colour |
| "Leading today", and the order rankRoles decided (ST-03) | The full-bleed gradient on the leading card |
| The pin, the mark, the suggestion well, the sources, the disclosure | The card surface and its shadow |

**Two things worth recording, because they were decided rather than defaulted.**

*The leading section is marked by a word, not a treatment.* It was a filled card, then a 2px
border, and now it is the chip that says **LEADING TODAY** plus the fact that it comes first.
FO-04 asks for one card that leads; the order does that work and *"Why today's order changed"*
already explains it. If that reads as too quiet in use, the fix is a stronger chip rather than
bringing back a fill.

*The header bar is rounded on all four corners now,* not just the top two. It used to cap a box.
With the box gone it is a bar that names a section, and a top-rounded bar with square bottom
corners floating over plain text reads like a lid that lost its jar.

**What this cost.** The filled leading card required a parallel set of styles for everything
inside it — white text, glass buttons, glass well, a lighter link, a lighter source line —
because the card behind them was dark and saturated. All of that is gone: **the lead card's
overrides went from eleven rules to none.** The suggestion well is violet on every section
rather than violet on three and frosted on the fourth, which is the ST-04 inconsistency I had
logged as an open question two entries ago. It is closed, not by arguing it, but because the
thing that caused it no longer exists.

**For Leila.** This is a real departure from the wireframes, which drew these as cards. The
information architecture is untouched — same four roles, same ranking, same one-action-each
(FO-01 to FO-04, FO-11) — but the visual weight of Today has dropped a long way. Worth a look
before the next round of testing. Checked in both themes and at three widths.

**Then, looking at it next to the panels underneath:** *"you see how the cards for Today's
meetings have a background and that border? add that to the 4 cards above, just have the
background and borders on the right, left and bottom. keep the colored top of the cards."*

So the sections are panels again — but panels the coloured header **caps** rather than sits
inside. Surface and hairline on the left, right and bottom; **no top border**, because the
role's colour is the top edge. Same `--surface` and same `--line` as "Today's meetings" and
"Portfolio signals" directly below, so Today reads as one family of objects instead of two.

The header is rounded on its top two corners again, having been rounded on all four while there
was no box for it to cap.

**Where that leaves the three rounds of this.** Not back where it started: the leading section
is still marked by its chip and its position rather than by a full-bleed gradient, so the eleven
override rules that gradient required are still gone and the suggestion well is still violet on
every section. What came back is the container; what did not is the fill.

**Implications.** `styles.css` and one function in `advisor.js`. No contract change, no change
to what the screen says or does.

---

### 29 September 2026 · The leading card is an outline, not a fill

**Asked for.** Luke, on why the Clients card looked green and Prospecting red: "remove the color
background on the clients card. make the border of the card the same green as the bottom border."

**Built.** `.rolecard.lead` no longer fills with the role's gradient. It is an ordinary card with
a **2px border in the leading role's colour**, and the rule under its band in the same colour so
the band reads as part of the card rather than as a lid on it.

**Not hard-coded green.** Which role leads changes daily (ST-03), so the border takes the colour
of whichever role it is. Green is what you see when Clients leads; it will be amber on a day
Operations leads.

**It also closed something I had raised as a question rather than a bug.** On a filled card the
suggestion well had to become frosted glass to stay readable
(`.rolecard.lead .well { background: var(--glass-fill) }`), which meant *"the platform suggested
this"* was violet on three cards and glass on the fourth — and, because the lead rotates, the
same suggestion was violet one morning and glass the next. That is the inconsistency ST-04
exists to prevent. Removing the fill removed the exception, and with it a parallel set of styles
for every control inside the lead card: white text, glass buttons, glass well, a lighter link.
**Eleven rules became eight**, and the leading card now differs from the others in one property.

**Then, same session, Luke: "make the board half the width and then apply this same rule to the
other cards in their colors" / "make the cards so they are 2 over 2".**

*Two up, never three.* The grid was `auto-fit, minmax(290px, 1fr)`, which on a wide screen gave
**three cards and a fourth hanging alone on the next row**. Four cards want a 2×2. The count is
capped at two now — but the decision still belongs to the space the grid has rather than the
width of the window, which matters because opening Ask takes 420px out of the page *without
changing the viewport*, so a media query would not notice. It is a **container query** on
`#section`. Verified: 2×2 at 872px, one column when Ask drops the section to 452px, back to 2×2
on close.

*Every card wears its role colour.* The outline treatment is now on all four — coral, teal,
amber, sage — with the rule under each band in the same colour.

*Which forced a better answer for the leading card.* If every card has a coloured edge, the lead
cannot be marked by having a colour. It is marked by **weight**: 2px instead of 1px, and the
lift it already had. That is the same distinction said two ways instead of a colour that means
one thing on one card and something else on the rest, and the "LEADING TODAY" chip still says it
in words.

**For Leila.** The role colours themselves are untouched and still carry their meaning: the band
on every card keeps the role gradient. What changed is that the lead is now marked by *weight*
rather than by *fill*. Worth confirming that reads as strongly as the filled card did — FO-04
asks for one card that leads, and 2px against 1px is a quiet distinction. If it is too quiet,
the next step is a tinted band on the lead only, not a return to the fill. Checked in both
themes and at three widths.

**Implications.** None beyond styling. No contract change, no markup change; `styles.css` only.

---

### 29 September 2026 · French, and the machinery for any other language (AX-12)

**Asked for.** Luke: "we also need an option in the settings to change the language to French."

**Built.** A working language setting, and the product in French behind it. **Settings** now
exists — beside Ask and Activity, reachable from every view including the client portal, because
language belongs to the person reading rather than to the view they are in.

**What "in French" turned out to mean.** Four layers, and doing only the first would have been
visible within a minute of use.

| Layer | What it covers |
| --- | --- |
| The interface | ~560 strings across every screen. `dashboard/js/i18n.js` |
| The formatting | Dates, numbers, currency, weekday names. `83,9 M $US`, `mardi 29 septembre`, `+0,2 %` |
| The server's own prose | Role-card reasons, the activity log, metric labels, the drafts note. `src/i18n.js` |
| What the model writes | A French screen that produces English drafts is half a translation |

**Three decisions inside that.**

**1. The English string is the key.** With ~560 of them, inventing an identifier for each would
have meant touching every call site twice and naming "Nothing across the firm needs you today."
A missing translation therefore renders the *English*, not a key and not a blank — a
half-translated screen is legible; `advisor.today.empty` is not. `untranslated()` lists what is
missing, which is the review list.

**2. Translate at the chokepoints, not at every call site.** `head()`, `load()`, `toast()`,
`sortTable()`, `spine()`, `subnav()` and `roleTabs()` translate what they are handed, so every
panel title, column heading, section name and confirmation in the product was localised by
editing seven functions. Titles that are really data — a person's name, a household's — go
through `raw()`, which says so explicitly rather than letting the translator guess.

**3. Records are never translated, and that is the point.** A household's name, a person's name,
an alert or a compliance item as it arrives from the custodian or the CRM stays exactly as it is
recorded. A platform that rewrites a record has changed the record. **Where you will see this:**
one practice-level alert reads *"3 client emails waiting for compliance review for over 2 days"*
in English on an otherwise French screen. In this mock that string is a fixture standing in for
what a rules engine would emit; in a real build the rule that raises the alert composes its
title through `src/i18n.js`, exactly as `nextActions()` now does. It is a fixture boundary, not
a design one — but it is worth seeing rather than papering over.

**The model writes in the reader's language.** The language rule leads the system prompt, before
the house rules, because it governs them; it names French *in* French, which measurably steadies
a model that would otherwise drift back into the language the rest of the prompt is written in;
and it sets vouvoiement explicitly, because a model left to choose will sometimes not. All three
prompt versions are bumped, per this project's own rule that editing a prompt bumps its version.
The offline generator writes French too — otherwise an adviser cannot tell a disconnected model
from a broken translation.

**Register, for whoever reviews this.** Vouvoiement throughout: this is a professional tool and
the adviser is being addressed by their firm's software. *Conseiller* for advisor, *dirigeant*
for principal, *foyer* for household (*ménage* reads domestic rather than financial), *encours
sous gestion* for AUM, *brouillon* for draft, *suivi* for follow-up.

> **NEEDS A NATIVE AND COMPLIANCE REVIEW BEFORE THIS SHIPS.** The machinery is finished and
> tested; the wording is mine. Regulated phrasing in particular — *"Ce sont des brouillons. Rien
> n'a été créé"*, *"Ceci a quitté le cabinet et ne peut pas être rappelé"* — carries the same
> weight in French as the English it came from, and a translator working from the English alone
> will not know which phrases are load-bearing. `ux/UX_RULES.md` names them; they should be
> reviewed against it.

**What the tests hold.** Six front-end and five server-side, each verified to fail by injecting
the matching fault:

- A translation that drops a `{placeholder}` renders "Échéance" with no date and reads as
  finished. Compared as sets, because French often needs a name twice where English needs it once.
- A key the code asks for and the dictionary does not have. This is the one that rots: a call
  site is edited, the dictionary is not, and the screen quietly falls back to English.
- `format.js` hard-coding a locale — half a translation, and the half nobody notices.
- Language is **per person**: Dana in English and Marcus in French at the same time, neither
  changed by the other having read anything.
- A language this build cannot render is refused with a message saying what it does have, and
  the refusal does not take effect.
- A client can set it too: the portal is not an English-only afterthought.

**One bug worth recording, because no test could have caught it and one now does.** Adding
`src/i18n.js` worked in every Node test and **404'd in the browser** — the dashboard runs the
mock in-browser, so a module `mock-core.js` imports has to be served over HTTP as well as exist
on disk, and a module that fails to link takes its importers down with it. The whole dashboard
went white. There is now a test that fetches every module `mock-core.js` imports.

**Implications.**

- **Contract 0.4.0-draft.** `GET /settings` and `PATCH /settings`; `Provenance` gains `language`.
  A minor bump rather than a patch: the model's output language is now part of the audit trail.
- **Adding a language is one file and one array.** `src/mock-core.js` `LANGUAGES` declares what
  the build can render — the settings screen offers what the *server* says exists rather than
  what the front end hopes is there — and a dictionary in `dashboard/js/i18n.js` plus one in
  `src/i18n.js`.
- **Not built:** right-to-left layout. Nothing here assumes direction, but nothing has been
  tested against it either, and Arabic or Hebrew would need a CSS pass, not a dictionary.
- **Not built:** translated fixture data, per the boundary above.
- **Worth knowing:** `Intl` does all the formatting, so a new language gets correct dates,
  numbers and currency for free. The words are the only work.

---

### 29 September 2026 · Supervision, not impersonation — the read-only advisor book (PO-06)

**Asked for.** Luke: "do the read-only advisor dashboard decision." It had sat open since the
requirements doc, and `HANDOFF` section 9 still carried it word for word: *"Can a principal open
an advisor's dashboard read-only, and is that access logged?"* The contract had quietly answered
**yes** on its own — `GET /firm/advisors/{advisorId}` was described as *"Lets a principal open an
advisor's dashboard in read-only mode"* — while actually returning a summary row. A promise in a
description that no code keeps.

**Decided. Yes, as supervision. Three things it is, and is not.**

**1. It is not a new permission.** The framing in the last entry was half wrong. A principal
already reads every household, alert, message and next action in the firm with `scope=firm`;
naming one advisor *filters* records they can see in full anyway. So `advisorId` narrows firm
scope rather than widening own scope, and **no 403 moves.** A test asserts exactly that: every
record the filtered call returns was already in the unfiltered one. Sent without `scope=firm` it
is a **400**, not a permissive default, because "my own book, filtered by somebody else" is
nothing.

Supporting precedent found in the code: `GET /households/{id}` has always let a principal read
any household. The boundary being argued about had already been drawn.

**2. It is not "view as".** Impersonation would be seeing the advisor's screen — their working
history, their prospects, their calendar, their drafts to act on. Supervision is reading **the
firm's records for their book**. The contract enforces the difference by simply not offering
`advisorId` anywhere else: `/activity`, `/meetings`, `/tasks`, `/prospects`, `/onboarding` and
`/portfolio-signals` stay bound to the advisor who owns them, and a principal who sends
`advisorId` to any of them gets **their own** data back. A test walks all six. A principal also
cannot act: `PATCH /communications/{id}` on Marcus's draft is a 404 for Dana.

**3. The looking is told to the person looked at.** Not an audit table nobody reads — an entry in
**that advisor's own activity log**, the one they already open. `Activity.actor` gains
`principal`, with its own mark and its own line: *"Dana Whitfield, reading your book."* Once per
principal per advisor per day, because a refresh is the same visit. Reading your own book is not
a supervisory read and logs nothing.

**Why yes at all.** The clients are the firm's clients, not the advisor's, and in a small RIA the
principal is usually the person carrying the supervisory obligation. Refusing the access would
not protect anyone; it would just mean the supervision happens over email with no record. The
risk worth designing against is not access — it is *silent* access, and that is what part 3 is
for.

**Built.**

| Where | What |
| --- | --- |
| `openapi.yaml` | `advisorFilter` parameter on `GET /households`, `/next-actions`, `/communications`. `Activity.actor` gains `principal`. `GET /firm/advisors/{advisorId}` now describes what it actually returns |
| `src/mock-core.js` | `supervise(q)` — one place holding the rule, the 400/403/404s, and the deduplicated log entry |
| Firm → Advisors | **"Open Marcus's book"**, a deliberate press. Then his households, what needs him, and his unapproved drafts, under a notice saying what this is, what it is not, and that he is told |
| `dashboard/js/ui.js` | The activity log distinguishes three actors rather than two |

**The press matters.** Selecting a name in the roster reads a row; opening a book is a separate
act, so it takes a separate button. Loading the book automatically would have put *"Dana opened
your book"* in four advisors' activity logs for one glance at the roster — the log would have
stopped meaning anything within a week.

**A design-system note.** The supervision notice is **not** dashed. `styles.css` already assigns
dashed borders a meaning — draft, not yet real — and these are records. It uses the warning
colour as a left rule instead, which already means *this wants your attention* everywhere else,
and the thing wanting attention is that you are reading someone else's work.

**Not built, deliberately.**

- **`advisorId` on `/alerts`.** The priorities list is built from the alerts, so a per-advisor
  alerts panel beside a per-advisor priorities panel would repeat itself — the same duplication
  removed from the firm Overview earlier today.
- **`advisorId` on `/reports/practice`.** `GET /firm/advisors/{id}/scorecard` already answers
  "how is this advisor doing", and answers it better, because it carries the firm comparison. Two
  ways to ask one question is the thing being removed from this product, not added to it.
- **A consent model.** Considered and rejected: asking Marcus's permission to supervise Marcus
  inverts who is responsible. Notification is the right instrument here, not consent. *(Client
  consent is a different matter and is unchanged — it still gates disclosure and the AI.)*

**Implications.**

- **Contract 0.3.2-draft.** No new paths or operations; three parameters and one enum value.
- **`HANDOFF` section 9's open question is closed** — both halves of it.
- **Worth knowing for the real build:** the deduplication window is per calendar day and lives in
  memory. A real implementation needs it to survive a restart, or an advisor learns about at most
  one visit per deploy.
- **Still open, and untouched by this:** AX-07 coaching. Who writes it, who reads it, and whether
  a principal's view of it is supervision or performance management is a separate question with a
  separate answer.

---

### 29 September 2026 · Compliance leads with what is overdue — contract 0.3.1-draft

**Asked for.** Luke, on reading the Firm pass entry below: "add the sort param so overdue leads."

**Built.** `GET /firm/compliance` takes `sort`, and its **default is now `status,desc`**: overdue,
then open, then done, each by due date with the oldest first. It was `dueDate,asc`, which put a
finished obligation from three weeks ago above one that is late.

The order is a property of the status, not of the alphabet. `status` is ranked explicitly —
`['done', 'open', 'overdue']`, listed least-urgent first so that `,asc` and `,desc` keep their
ordinary meaning everywhere in the API. A status nobody planned for sorts **last**, so it is
visible at the end of the list rather than silently leading it.

That the alphabet happens to agree today (`done` < `open` < `overdue`) is a coincidence and is
treated as one: renaming a status to `urgent` would quietly invert the list if the order were
left to `localeCompare`.

**Where.** `paged()` in `src/mock-core.js` gained two options — `rank`, for a field whose order
is its own, and `tie`, the field that settles equal ranks, always ascending. Both are general;
`/firm/compliance` is the first operation to use them. The dashboard asks for `status,desc`
explicitly rather than relying on the default, so the screen declares the order it is showing,
and the panel now reads **"overdue first"**.

**Verified.** A test asserts the rank order, the due-date tie-break, that `,asc` still inverts it,
that `sort=dueDate,asc` still works for anyone who wants the old order, and — the point of doing
this on the server — that the **first page is the first page of the whole list**, not the first
few records re-sorted. Checked by injecting three faults in turn (the old default restored, the
rank listed backwards, the tie-break removed); each failed the test before it was put back.

**Implications.**

- **Contract change, backwards-compatible in shape but not in order.** `info.version` is now
  **0.3.1-draft**, with a "Changes since 0.3.0-draft" note in the spec description. No schema
  changed; `types/api.d.ts` regenerated with no diff beyond the version line.
- A **general convention** is now written into the spec's Conventions block: a `sort` field may
  have an order of its own, in which case the operation lists it, and ascending always means
  least urgent first. Worth holding to if other lists get ranked ordering later.

---

### 29 September 2026 · The Firm pass — UX_IA §6 #3, a [PO] decision

**Asked for.** Luke: "do the firm view IA pass." The question was recorded in `ux/UX_IA.md` §6 as
decision 3 and tagged **[PO]** — the product owner's call, not the designer's — and in
`ux/UX_RULES.md` as open decision 6: *does the Firm view show Dana her own four role cards, or
the firm's operations?*

**Decided.** The firm's operations. Dana already has her own four role cards in the Advisor view
for her own book. Repeating them under **Firm** would answer "how is my book going" twice and
"how is the firm going" never. This follows the lean the IA doc itself recorded: in a small firm
the Firm view is the Operations role seen across the whole firm, so it is the principal's version
of the Operations role home rather than a separate product.

**Built.** `dashboard/js/firm.js`, from four sections to seven:

| Section | What it is | New? |
| --- | --- | --- |
| Overview | Firm-wide priorities, then what else is open, then the households | Rebuilt |
| Advisors | The roster, and one advisor against the firm | Moved out of Overview, and grown |
| Compliance | The firm's obligations, and the messages waiting for review | Moved out of Overview, and grown |
| Reports | The practice report at firm scale | **New** |
| Billing & fees | Unchanged — renamed from "Billing" to say it holds both | Renamed |
| Ownership | Unchanged | — |
| Branding | Unchanged | — |

**What the pass actually unlocked.** Four capabilities were being served and documented while no
screen reached them. Not a gap anyone would have spotted from the contract: the advisor view
calls the same paths for one book, so the paths looked used. **Scope** was the missing half.

| Operation | Requirement | Now reached from |
| --- | --- | --- |
| `GET /next-actions?scope=firm` | PL-02 | Firm → Overview |
| `GET /reports/practice?scope=firm` | PO-07 | Firm → Reports |
| `GET /communications?scope=firm` | COMM-03 | Firm → Compliance |
| `GET /firm/advisors/{id}/scorecard` | AX-08 | Firm → Advisors |

A test — *"the firm view reaches the firm-scope operations, not just the paths"* — now asserts
`scope: 'firm'` is present on each call, not merely that the path appears somewhere in the
dashboard. The existing no-UI test could not have caught this and still cannot; the two sit side
by side deliberately.

**Two things the pass fixed on the way.**

*The overview was a tile wall.* Four equal panels, the shape `UX_IA` §3 argues against
("priorities lead, overviews are sentences and simple shapes"). It now leads with what needs the
principal, and the advisors table and the compliance list — both of which had outgrown a panel on
a summary screen — moved to sections of their own.

*Two panels were telling the same story.* "Needs you" is built from the alerts, so showing the
ranked list beside the raw alert stream repeated the same three rows verbatim. The second panel
is now **"Also open"** — what is open and *not* already named on the left. The overlap is
computed, not guessed, in two ways: an alert-kind next action cites its alert by id, and a
contact-kind one, which cites the CRM instead, is matched to the no-contact alert on the same
household via the `draft_email` action the contract gives exactly those alerts. No title
matching.

**Not built.**

- **Opening an advisor's own dashboard read-only.** ~~Still an open decision.~~ **Luke called it
  the same day — see the entry above.** The framing here turned out to be half wrong and is worth
  keeping for that reason: the question is not *what is this advisor looking at* (that is
  impersonation, and the answer is no) but *what does the firm hold for this advisor's book*,
  which the principal could already read in full.
- **Re-ordering the compliance list by state.** ~~Overdue items ought to lead.~~ **Luke said add
  it — built the same day, see the entry above.** The reason it could not be done in the browser
  stands and is worth keeping on the record: the response is paged, so sorting in the browser
  would order a page rather than the obligations, which would read as correct and be wrong.

**Implications.**

- **No contract change.** Every operation above already existed and already accepted `scope`.
- `UX_IA.md` is now **v0.2**; §1 and §6 #3 updated. `UX_RULES.md` open decision 6 closed.
- The view's page title changed from "Firm overview" to **"The firm"**, because "Overview" is now
  one of seven sections and the title was arguing with the nav.
- **Both open items from this entry were called the same day and are built:** the compliance
  ordering, and the read-only advisor book. See the two entries above. Nothing in this entry is
  still waiting on you.

---

### 28 September 2026 · TR-02 — the draft frame and the send confirmation

The last two components of the fifteen in `ux/UX_DESIGN_SYSTEM.md` §5, and the highest-value
remaining work by the research check: they sit on F3, the only finding every advisor in the
study agreed on.

**Asked for** — TR-02: *"What you edit is what they get. A draft is shown exactly as it will
arrive, so there is no separate preview. Anything leaving the firm gets one confirmation: who it
goes to, from whom, what's attached, and whether it can be recalled."* Design system §5: a
dashed 2px violet frame, a "Draft · not sent" label on `--ai-deep`, editable in place; and an
`--elev-3` sheet saying "This leaves the firm".

**Built**

- **The draft frame.** The message is drawn as it will arrive — To, From, subject, body — and
  the fields the advisor types into *are* the message: no borders, no form furniture, the same
  type the client reads. Dashed violet while it is still ours, solid and read-only once it has
  gone. An approved message is still dashed, because it has not been sent either; its label
  reads "Approved · not sent yet".
- **Editing in place.** Saved on blur, with *Undo* in the toast and a line in the activity log.
  The receipt under the frame changes from "Drafted by the platform" to "Drafted by the platform,
  edited by Dana Whitfield", because after an edit it is not only the platform's words.
- **The send confirmation.** An `--elev-3` sheet on send only: to, from, subject, what is
  attached, the compliance flag if there is one, and "Once it goes it cannot be recalled."
  Focus lands on *Not yet*, and Escape means *Not yet*.
- **It opens in place.** The message used to open in a modal over the page; it now opens inside
  the Inbox with one step back (FO-06). A message reached from a role card on Today opens in its
  own home rather than on top of Today.
- **A rewrite lands in the frame.** *Rewrite it for me* used to render a second draft beside the
  message with a Copy button — which is the separate preview TR-02 forbids. It now offers *Use
  this wording*, which puts the text in the frame and saves it the same way a typed edit is, so
  it is undoable and in the log. Copy stays where there is no frame to land in: meeting summaries
  and agendas.

**Contract** — `PATCH /communications/{id}` now takes `subject` and `body` as well as `status`,
and `operationId` moved from `approveCommunication` to `updateCommunication`, because an
operation that edits text should not be named for approving. `Communication` gained `editedBy`
and `editedAt`. Editing a sent message is refused with 409: what left the firm is what the client
has. An edited AI draft has `draftedBy` set to `advisor` — after the advisor rewrites it, it is
their message.

**Not built**

- **Version history.** S1 names it alongside audit trail and source attribution as a trust
  prerequisite, and the activity log records *that* an edit happened but keeps only one step
  back, not the succession of drafts. Still open.
- **A real recipient.** "To" is a household, because a household is all the contract models —
  no named person, no address. The sheet says "Delacroix household · by email" and cannot say
  who or where. Worth a field if this is ever more than a POC.
- **Attachments.** The sheet says "Nothing", truthfully: the contract has no attachments. TR-02
  asks the confirmation to name what is attached, so the line is there and will have something
  to say when there is.

**Implications**

1. **The frame found a content bug nothing else would have.** The offline draft generator opened
   every email with a `Subject: …` line inside the body, which was invisible when the body was a
   blob in a dialog and an obvious duplicate the moment the message was drawn with its own
   subject field. Fixed in `src/model/fake.js` and in the `email_draft` prompt, and the frame
   strips a leading subject line anyway, because a connected model may still send one. **Drawing
   a thing as it will really appear is itself a test.**
2. **Saving on blur rather than behind a button** is a deliberate reading of F3 — *"if the
   approval UI is clunky, advisors skip it"* — and it is only safe because the edit is
   recorded and reversible. The two go together; neither would be right alone.
3. **One shared `<dialog>` now has variants.** The send confirmation styles it as a sheet, and an
   Escape-close used to leave that class behind and restyle the next dialog to open. The class is
   now cleared on `close` in `app.js`. Anything else that adds a variant should do the same.
4. **`runDraft` was leaking system names** into the "Read from" list — `greenmeadows` rather than
   *custodian records*. A UX-002 miss, found while adding *Use this wording*. Fixed, and it was
   the last one: the sweep now holds across every screen.

---

### 28 September 2026 · UX-008 to UX-011, the IA pass, and the contract run

Everything left in `ux/`: the four fields the design needed, Today rebuilt around the four
roles, the navigation spine and role homes from `ux/UX_IA.md`, the activity log, Systems, and
Ask as a side panel. Built against the specs rather than a wireframe, because the UX-008
wireframe has not arrived — every place that decided something a wireframe would have decided
is named under *Calls made without the drawing* below.

**The contract run** — four fields and two operations, added once rather than four times:

| Added | For |
| --- | --- |
| `Meeting.preparedAt` | UX-007. The receipt now reads "Prepared by the platform at 7:40 from custodian records, your CRM and your calendar" |
| `ProspectSummary.stageChangedAt` · `lastContactAt` | UX-009. "26 days" is now days in the proposal stage, which is what the sentence claims |
| `Signal.source` | The UI was asserting "custodian records"; now it is told |
| `AlertStatus.snoozed` · `Alert.snoozedUntil` | UX-001. *Not now* survives a change of browser and lands in the log |
| `GET /activity` | UX-010, X-05 |
| `GET /systems` · `PATCH /systems/{systemId}` | `UX_IA.md` §5 |

**Built**

- **UX-008 · Today by the four roles.** Four cards, fixed order in the spine and a daily order
  on Today, one action each, the top three behind one disclosure, one card leading on its
  role's deep gradient. The order pill says why it changed and the order can be pinned (ST-03,
  ST-09). *Next best action* is gone as a section: every suggestion now arrives inside the role
  card it belongs to (FO-11). The number strip has moved to **Book at a glance**, so
  `GET /summary` kept a home rather than losing one.
- **UX-009 · what is slipping**, in `dashboard/js/roles.js`, with CS-09's thresholds written
  out as a table rather than scattered. All three of the designer's examples now reach Today
  for Marcus: the Halloran Trust proposal at 26 days, Devon Pryce's lead with no reply at 6
  days, and the Guerrero household at 30 days — the last of which arrives through the platform's
  own ranking rather than the contact rule.
- **UX-010 · the activity log.** Top right on every advisor screen, opening beside the page.
  Seeded with the platform's own morning — ranked, prepared, checked, read — then every advisor
  action appended by the operation that did it. It doubles as history: an entry that can still
  be stepped back carries the operation that reverses it, and *Undo* in the panel re-renders
  whatever screen is showing.
- **UX-011 · a suggested next step on every signal.** Signals lead with what they mean
  ("2 households have losses worth harvesting. About $14,500 in unrealized losses.") and open
  in place.
- **The spine and role homes** (`UX_IA.md` §2–§4). Today · Inbox · Calendar, then the four roles
  with their marks, then Pinned when the advisor has pinned something, then Book at a glance and
  Systems. Communications and Follow-ups merged into one Inbox; Prospects, Onboarding, Reports
  and Playbooks moved inside role homes as tabs. Twelve tabs, all working against real data.
- **Systems**, showing what is connected, who set it up, when it last synced, and one sentence
  per gap saying what the platform cannot see. Read-only for an advisor who does not administer
  the firm, because knowing what the platform cannot see is not an administrator's privilege.
- **Ask as a side panel**, beside the page and never over it (FO-06). The page shifts rather
  than being covered wherever there is room to; below 860px there is none and the panel takes
  the screen. Its conversation survives moving between screens.

**Not built**

- **Outreach & content · Practice · Learning.** Named as role-home tabs in `UX_IA.md` §3 and
  §4, and there is no feature behind any of them: no operation, no data, nothing to draw. They
  are left out rather than built as three screens that say "nothing here yet" — which is what
  UX-004 asked us to stop doing. Development therefore has two tabs, not four. **This is a [PO]
  question for Leila**, not a build decision: they are new features, and they need specs before
  they need screens.
- **The referral window after a strong review** (CS-09). Referrals are built from each
  prospect's own origin, which is all the contract holds — there is no record of *who* made a
  referral, so the thank-you half of the rule cannot be built. Proposed as a contract change.
- **A drafted next step for growth work.** CS-03 asks for the suggested action to arrive already
  drafted where automation exists. For Prospecting it does not exist: the contract has no
  operation that creates a communication at all. Those actions open the record instead, and the
  labels say so rather than promising a draft nobody can produce.

**Calls made without the drawing** — each of these is a wireframe's job, decided here so the
build could continue, and each is one edit to change:

1. **Two cards across, reflowing to one.** Not a breakpoint: the cards reflow on the space left
   beside an open Ask panel, so opening Ask does not squash them.
2. **The lead card is the deep gradient and the other three are white with a band.** That is
   the design system's rule (§1.3); what the wireframe would settle is whether the lead card is
   also *larger*. It is not, here.
3. **Top three behind one disclosure per card**, labelled "Show the next two" — FO-02 says the
   card opens to its top three on demand, and does not say how.
4. **The order pill is a button that reveals the reason**, rather than the reason always being
   on screen. ST-03 requires the reason, not its permanent display.
5. **Pinning.** Two different pins exist: a star on each role card pins that role into the
   spine's Pinned group, and a separate control pins the day's order (ST-09). `UX_IA.md` §6.1 is
   still open on whether the platform may suggest a pin; it does not, and never adds one.
6. **Inbox tabs** are Drafts to approve · Follow-ups · Everything sent. §4 says the Inbox holds
   "messages to answer, drafts to approve and follow-ups due" and does not divide them.

**Implications**

1. **The role taxonomy lives in the front end.** The contract does not say which role a piece of
   work belongs to, and `roles.js` decides. That is defensible — a role is how a day is
   organised, not a property of an alert — but it means the platform cannot rank across roles,
   which is what UX-009 flagged as possible plumbing. If it should, `role` becomes a field on
   NextAction and that file gets much smaller.
2. **Development is nearly empty, and that is the finding.** Its card shows one thing: whichever
   scorecard metric moved most, phrased as movement and never as a shortfall (CS-08). The
   research's point was that growth work has no place on Today; the same is now visibly true of
   the advisor's own practice, and it is a product gap rather than a layout one.
3. **"Not this" teaches nothing yet.** CS-05 says the optional reason teaches the ranking. There
   is nowhere in the contract to put a preference about a suggestion, so *Not this* hides the
   item in this browser and no reason is collected. Worth a contract change if the ranking is
   ever to learn — and worth *not* pretending in the meantime.
4. **An alert-backed item and an ordinary one behave differently underneath.** Setting aside an
   alert goes through the contract, survives a change of browser and lands in the activity log.
   Setting aside anything else is view state. The difference is invisible to the advisor, and it
   is the honest one to make rather than faking durability.
5. **Two tests were updated deliberately, as the build plan said they would be.** The advisor
   sub-nav assertion now names the spine and the role tabs; the operation count moved from 72 to
   75. `no contract operation is left without a UI` stayed green throughout except once, when it
   correctly caught that the rebuilt Today had left `PATCH /alerts/{alertId}` with no caller —
   a real regression, fixed by answering alert-backed items through the contract.
6. **Dark-mode role bands hold.** Leila's open check. The deep gradients are not redefined for
   dark and do not need to be; the bands and the lead card read correctly on the dark ground.
   Still worth her eye.

---

### 28 September 2026 · Batch 1 — UX-001 to UX-006

Six of the seven quick wins in `ux/UX_REQUESTS.md`. UX-007 is held for the contract run; it
needs a time a meeting does not carry. All six land on the same three panels, so they were
built as one pass. `docs/ux-build-plan.md` §4.

**Asked for, and built**

- **UX-004 · placeholder copy.** The "…is not built yet" toasts are gone: an action the
  platform cannot perform is not offered at all. "0 days ago" is gone. So are the two
  developer-facing sentences — the note under Next best action that named `suggestedTask` and
  `/tasks`, and the ISO date in a prep reason ("…on 2026-09-28 has no prep").
- **UX-003 · one word, one meaning.** "Review" meant three things. It now means none of them.
  Alert actions are named for what pressing them does (*Open the household*, *Open the approval
  queue*); the signal expander is *Show the households* / *Hide the households*; the prep brief
  is *Show the prep brief* / *Hide the prep brief*. Every expander in the advisor view now takes
  the same Show/Hide shape.
- **UX-002 · sources in plain language.** One `sourceLine()` used by the alert list, the prep
  brief, the portfolio signals, Next best action and the Ask panel's citations. No system name
  appears anywhere in the advisor view — checked by walking all ten sections and scanning the
  rendered text. The prospect's own origin (`referral`, `website`, `event`) was a second raw
  enum on screen and is now words too.
- **UX-005 · what the advisor opens, stays open.** Open cards are written to view state and put
  back on render, without the opening motion. Verified against the request's own test: open a
  brief, go to Clients, come back — still open, still loaded.
- **UX-006 · motion on open and close.** The new disclosure, with the root-level reduced-motion
  override from the scaffolding entry below.
- **UX-001 · undo on dismiss, and Not now.** Dismiss toasts an *Undo* that patches the alert
  back to `open` — a real round trip, verified. *Not now* offers three times in place of the
  row's actions (later today · tomorrow morning · next week), and its toast also undoes. A line
  under the list says how many are set aside and brings them back, so nothing vanishes quietly
  (ST-08).

**Not built**

- **UX-007**, deliberately. See implication 2.
- **Two alert actions have no button.** `draft_email` and `send_reminder` are in the contract's
  `AlertAction` enum and have no operation behind them — there is no way to create a
  communication in the API at all. Rather than a button that apologises, they are absent. The
  alert still has *Not now* and *Dismiss*, so it is always answerable (CS-05).
- **UX-011's meaning-first signal copy** is phase 4 and untouched here; only the signal's button
  was renamed.

**Implications**

1. **The contract's `action.label` is now unused in the advisor view.** The screen names actions
   itself, because the contract's labels are named from the system's side — the same "Review"
   arrives on a margin call, a cash balance and a restricted account. Either the contract's
   labels should change, or the field is presentational and should be dropped. A question for
   the designer and the contract, not a bug.
2. **A prep brief shows its sources without an age.** `sourceLine()` takes an optional time and
   the brief passes none: a meeting carries `briefSources` but nothing saying when the brief was
   prepared, and the meeting's own start time is not that. Implying a freshness the platform
   cannot vouch for would break TR-06 and TR-08 more than omitting it does. This is UX-007's
   `preparedAt`, and it is now the only source line in the advisor view with no recency.
3. **A portfolio signal asserts a source the contract does not give it.** `Signal` carries
   `dataAsOf` but no `source`. The signals are computed from holdings, so "custodian records" is
   true, but the UI is stating it rather than being told — exactly what TR-10 is about. Added to
   the contract proposals.
4. **`platform` is a fifth kind of source.** The design system names five — custodian records,
   your CRM, your calendar, your notes, market data — and the contract's fourth enum value is
   `platform`, for something the platform worked out itself. It renders as "the platform's own
   checks". Worth confirming. Notes and market data have no contract value yet.
5. **Three answers is the most an alert row will hold.** With an action, *Not now* and *Dismiss*,
   the row's text column collapsed; it now has a width floor and the buttons wrap beneath. Worth
   watching in the UX-008 wireframe, where the same three answers sit inside a role card.
6. **One change reached the mock, not just the dashboard.** The "0 days ago" and the
   `suggestedTask` note are composed server-side in `src/mock-core.js`, so UX-004 was not purely
   Paint. Nothing in the contract changed — only the strings a real backend would also be
   returning.

---

### 28 September 2026 · Front-end scaffolding for Batch 1

Not a designer request. Four shared pieces built first because four of the seven Batch 1
requests are cheap only if they exist, and everything in UX-008 needs all four. Recorded here
because one of them carries a decision the designer needs to know about. See
`docs/ux-build-plan.md` §3.

**Built**

- `dashboard/js/viewstate.js` — one place for what the advisor set by hand: open cards,
  expanded rows, snoozed alerts, and the pinned role order when it arrives. Persisted to
  `localStorage`, keyed by persona so the sign-in-as switcher cannot leak Dana's state into
  Marcus's. This is UX_RULES ST-07 kept in one place rather than in seven closures.
- `format.js` — `sourceLine()` and `ageBrief()`. The contract's four-value `Source` enum mapped
  to the advisor's words (custodian records · your CRM · your calendar · the platform), with a
  fallback for anything unrecognised. Nothing renders through it yet; UX-002 is the sweep.
- `ui.js` — `disclosure()` / `wireDisclosures()`. A button-and-region pair replacing
  `<details>`, which can neither be transitioned nor remember that it was open. Serves UX-005
  and UX-006 together, and the role cards' top-three later.
- `styles.css` — motion tokens wired to the transitions that exist, and one root-level
  `prefers-reduced-motion` block that zeroes every duration. Done as a token override rather
  than per-rule so a component added later cannot forget it.

**Not built** — nothing renders through any of it yet. That is phase 2, deliberately: the
scaffolding landed on its own so the seven requests are small.

**Implications**

1. **View state is this browser only.** It is the advisor's own choices, not data, and there is
   nowhere in the contract to put it. Fine for open cards. Not fine for UX-001's *Not now*,
   where a snooze that vanishes when the advisor opens a laptop instead of a desktop is a
   broken promise, not a lost convenience. Raised as a contract proposal — see the build plan §8.
2. **An unnamed source is a rule problem, not a wording one.** `sourceKind()` degrades an
   unrecognised value to "another connected system" and warns once in the console. If that ever
   fires in real use, TR-10 is the thing to fix, not the mapping table.
3. **The disclosure's motion is unverified.** The component's behaviour is verified — open and
   closed state, `aria-expanded`, the label swap, focus correctly withheld from closed content,
   lazy loading on first open, and the open state surviving a redraw. The easing itself is not:
   a hidden browser tab does not run CSS transitions, so it could not be measured. Worth two
   seconds of somebody's eyes when UX-005 lands. The technique (`grid-template-rows` `0fr` to
   `1fr`) needs Chrome/Edge 107, Safari 16 or Firefox 127; older engines snap rather than break.

---

### 28 September 2026 · UX_TOKENS.css v0.5 — the ground, the type and the firm's accent

**Asked for** — *(`ux/UX_TOKENS.css`, header)* "Replace the three `:root` blocks at the top of
`dashboard/styles.css` … Every variable name you use today is kept, so no other line of
styles.css has to change to pick up the new ground, type and status colours." Plus the font
link in `index.html`.

**Built**

- The three `:root` blocks replaced wholesale. Our `box-sizing` and safe-area padding stay in
  `:root`; they are not part of the palette and are commented as ours.
- Fonts swapped to Plus Jakarta Sans · Newsreader · JetBrains Mono.
- Three rules moved with the palette, because the design system changes what they *mean* rather
  than only their colour: `.btn.primary` from `--brand` fill to `--ink` fill, and every
  `:focus-visible` ring from `--brand` to `--accent`, the coral ring. Checked in both themes on
  Today, Clients, Communications, the household dialog and Firm billing.

**Not built**

- **Charts are still `--brand`.** The design system says charts use `--chart-1..4` and never a
  role or brand colour, but it also lists the data-visualisation palette under "not yet
  designed". The sparkline, the meters and the allocation bars are left as they are rather than
  half-moved. One edit when that palette arrives.
- **Two selected-state treatments still coexist.** The view tabs fill with `--brand`; the
  section rail uses `--brand-soft` with `--brand` text. ST-06 says the same thing takes the same
  shape. Left alone here because the token swap was meant to change no other line; folded into
  UX-003, which is the same kind of problem.
- **Dark-mode role bands unchecked.** The dark blocks in the tokens file redefine the solid
  role colours but not the gradients, which is the designer's own note. Nothing on screen uses
  a band yet, so this waits for UX-008 and is flagged there.

**Implications**

1. **The firm's accent no longer drives the interface.** `state.js` set `--brand` from the
   firm's `accentColor` at runtime, which would have let a red or orange firm colour collide
   with the Prospecting role, with `--crit`, and with the coral focus ring — ST-04 says a colour
   means one thing everywhere. `applyBranding()` now sets `--firm-mark`, used by the avatar,
   and `--brand` stays moss. **This follows the designer's own recorded leaning**
   (`ux/UX_DESIGN_SYSTEM.md` §6) on a question she has parked as a [PO] call, so it is a
   decision made in her direction, not for her — it reverses in one line if she lands elsewhere.
2. **The dark-mode accent problem is retired with it.** The two-stored-colours contract change
   the handoff anticipated is moot while the accent only paints the mark: `forTheme()` still
   lifts it, and the mark's text colour already flips with the theme.
3. **`--on-brand` now has one user.** Only the avatar and the view tabs use it. It is not dead,
   but it is no longer the pair to every `--brand` fill, and it is worth watching.
4. **`npm run typecheck` does not run** — `tsc` is not installed in this checkout. Not a
   regression and not caused by this change, but the JSDoc types went unchecked for it.

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
