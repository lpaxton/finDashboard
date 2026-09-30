/*
 * The order of Today's six cards.
 *
 * Three things decide it, and they are deliberately not the same thing:
 *
 *   the ranking   what the platform worked out this morning — which role has the heaviest
 *                 work on it (roles.js), with the two standing panels after the roles.
 *   the pins      a card the advisor has tacked to a slot. It holds that slot while everything
 *                 else flows around it. ST-07: what the advisor sets, stays.
 *   their order   the arrangement they dragged the cards into, kept whole so they can come
 *                 back to it after looking at the day the platform's way.
 *
 * Nothing here touches the DOM or the API. It is all list arithmetic, which is the only reason
 * it can be tested without a browser.
 */

export const PANELS = ['meetings', 'signals'];
export const cardId = (roleKey) => 'role:' + roleKey;

/* Pinned cards are placed first, each at the slot it was tacked to; the rest flow into what is
   left, in the order they were given. A pin past the end of the list, or onto a slot another
   pin already holds, moves to the next free slot rather than being dropped — a pin that
   silently stopped working would be worse than one that shifted by one. */
export function arrange(sequence, pins = {}) {
  const ids = sequence.filter(Boolean);
  const slots = new Array(ids.length).fill(null);
  const pinned = Object.entries(pins)
    .filter(([id]) => ids.includes(id))
    .sort((a, b) => a[1] - b[1]);

  for (const [id, at] of pinned) {
    let i = Math.min(Math.max(0, Number(at) || 0), slots.length - 1);
    let tries = 0;
    while (slots[i] !== null && tries++ < slots.length) i = (i + 1) % slots.length;
    if (slots[i] === null) slots[i] = id;
  }
  const rest = ids.filter(id => !pinned.some(([p]) => p === id));
  let r = 0;
  for (let i = 0; i < slots.length; i++) if (slots[i] === null) slots[i] = rest[r++];
  return slots.filter(Boolean);
}

/* "Today's top priority" puts one card first and lets the rest fall in behind it, pins and all.
   It overrides a pin on purpose: the advisor asked for the most pressing thing to lead, and a
   pin that outranked that would make the button a no-op exactly when it mattered. The pins are
   not forgotten — "My pin order" puts everything back. */
export function leadWith(sequence, id) {
  if (!sequence.includes(id)) return [...sequence];
  return [id, ...sequence.filter(x => x !== id)];
}

/* A drag: take `id` out and put it back before or after `target`. Returns a new list rather
   than mutating, so a drop that changes nothing is visibly a no-op. */
export function move(sequence, id, targetId, after = false) {
  if (id === targetId || !sequence.includes(id) || !sequence.includes(targetId)) return [...sequence];
  const rest = sequence.filter(x => x !== id);
  const at = rest.indexOf(targetId) + (after ? 1 : 0);
  return [...rest.slice(0, at), id, ...rest.slice(at)];
}

/* Nudging with the keyboard, which has to exist: a reorder that can only be done by dragging
   cannot be done by everyone (and not at all on a touch screen, where the HTML drag events do
   not fire). */
export function nudge(sequence, id, by) {
  const i = sequence.indexOf(id);
  if (i < 0) return [...sequence];
  const to = Math.min(Math.max(0, i + by), sequence.length - 1);
  if (to === i) return [...sequence];
  const out = [...sequence];
  out.splice(to, 0, out.splice(i, 1)[0]);
  return out;
}

/* Pins follow the cards they are on. Re-read after every reorder, so a pin means "this slot"
   from the moment it is set and keeps meaning that after the advisor moves it by hand. */
export const pinsFor = (order, pinnedIds) =>
  Object.fromEntries(order.map((id, i) => [id, i]).filter(([id]) => pinnedIds.includes(id)));
