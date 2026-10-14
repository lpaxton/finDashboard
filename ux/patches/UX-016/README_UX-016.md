# UX-016 · The quantity leads, the sentence supports — a patch for Luke

*14 October 2026 · from Leila's side · built against `archi` at 4ef91c1 (contract v0.7.0-draft) ·
177 tests pass, including the French-dictionary check.*

## What it is

One idea, applied to every item on a role card and on the four role overviews: **the number
leads, the sentence supports.** A 44px glyph carries the item's figure — `92d` quiet, `$12k` at
stake, `24%` over the limit, `2/6` steps, `draft` — coloured by the *kind* of signal, so a screen
can be scanned before it is read. The sentence stays, beside it. In front of every source line a
small kind-of-source mark (custodian · CRM · calendar · platform) makes TR-10 visible.

This is the first of the look-and-feel stories on the demo path (S-18 on the story map). It
touches no contract and no data.

## Apply it

```
git am 0001-UX-016-the-quantity-leads-the-sentence-supports.patch
```

Five files, 140 lines. Nothing of yours is overwritten; it adds to `format.js` (two helpers),
`roles.js` (a `lead` on each item), `advisor.js` (three render sites), `styles.css` (one block),
`i18n.js` (the French for the new words). Revert with one `git revert` if it is wrong.

## The kinds, and why they use the status tints

| Kind | Means | Tint |
| --- | --- | --- |
| `time` | something has gone quiet; days are the cost | warn |
| `money` | an amount at stake | ok |
| `limit` | a threshold breached | crit |
| `process` | a thing stalled part-way (a draft, a form, steps) | mist + ink, mono |
| `trend-up` / `trend-down` | the scorecard moved, for or against | ok / warn |

They reuse the status tints on purpose — tint plus figure, never a solid fill, as the design
system says — because a separate signal-kind palette is a design-system decision (Leila's), not
something to invent in a patch. If she gives the kinds their own colours, it is four tokens.

## What this patch does honestly, and what it fudges

- **Prospecting and the quiet-household items** carry real numbers from the records
  (`stageChangedAt`, `lastContactAt`), so their glyphs are exact.
- **Items from `NextAction` and `Alert`** have no structured figure in the contract, so the glyph
  reads the number back out of the sentence the server composed (`leadFromText` in `roles.js`:
  days, dollars, a percentage, "n of m steps", and a few words for alerts with no number). That
  works on today's data and is the wrong place for it to live. **The right fix is a `lead` on
  `NextAction` and `Alert`, decided server-side,** so the glyph can never disagree with the
  sentence. Your call whether that is a contract change now or after the demo; the UI will take
  either.
- **The sentences are unchanged.** Shortening them ("quiet since July" instead of "has not been
  contacted in 92 days") is the second half of the idea and means touching `src/i18n.js`; left
  for a separate, smaller change once the glyphs have been seen.
- **Dedupe is not in here.** Delacroix still appears three times on Clients › Overview; that is
  UX-015 and it is more visible now, which is the point.

## One thing I hit

`.lead` is already your class for the leading role section on Today. My glyph class was also
`.lead` for about an hour, and the Clients card collapsed to 44 pixels square. It is `.qty` now.
Worth a line in `UX_DESIGN_SYSTEM.md`: class names for *states* (`lead`, `next`, `on`) and for
*components* should not share a word.

## Files here

- `0001-UX-016-the-quantity-leads-the-sentence-supports.patch` — the change
- `before-after-1.png` — Clients › Overview, 4 Oct build beside the patch
- `before-after-2.png` — Today's role cards, same
- `today-after.png`, `clients-overview-after.png` — full screens after
