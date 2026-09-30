/*
 * The order of Today's six cards (ST-03, ST-07, ST-08).
 *
 * This is list arithmetic with no DOM in it, which is the whole reason it lives in its own
 * module: the rules about what a pin means and what outranks it are the part worth pinning
 * down, and they are impossible to read off a drag handler.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { arrange, leadWith, move, nudge, pinsFor, PANELS, cardId } from '../dashboard/js/cards.js';

const SIX = ['role:ca', 'role:op', 'role:bd', 'role:pd', 'meetings', 'signals'];

test('with nothing pinned, the order it is given is the order it gives back', () => {
  assert.deepEqual(arrange(SIX), SIX);
  assert.deepEqual(arrange(SIX, {}), SIX);
});

test('a pinned card holds its slot and the rest flow around it', () => {
  assert.deepEqual(arrange(SIX, { 'role:op': 0 })[0], 'role:op');
  const two = arrange(SIX, { 'role:op': 0, signals: 1 });
  assert.deepEqual(two.slice(0, 2), ['role:op', 'signals']);
  // Everything is still present exactly once: a pin moves a card, it never loses one.
  assert.deepEqual([...two].sort(), [...SIX].sort());
});

test('a pin that cannot have the slot it asked for takes the next one, rather than going quiet', () => {
  // Two cards pinned to the same slot, and a pin past the end of the list. Both are reachable
  // by dragging after pinning, and a tack that silently stopped holding would be worse than one
  // that moved by a slot.
  const clash = arrange(SIX, { 'role:op': 0, 'role:pd': 0 });
  assert.deepEqual(clash.slice(0, 2), ['role:op', 'role:pd']);
  const past = arrange(SIX, { signals: 99 });
  assert.equal(past[past.length - 1], 'signals', 'a pin past the end lands at the end');
  assert.deepEqual([...clash].sort(), [...SIX].sort());
  assert.deepEqual([...past].sort(), [...SIX].sort());
});

test("today's top priority outranks a pin — that is the point of it", () => {
  // Luke's words: the top priority card moves to the first spot, even if it's pinned, and the
  // others fall in order. A pin that could veto this would make the button do nothing in
  // exactly the case it exists for.
  const pinnedFirst = arrange(SIX, { signals: 0 });
  assert.equal(pinnedFirst[0], 'signals');
  const led = leadWith(pinnedFirst, cardId('bd'));
  assert.equal(led[0], 'role:bd', 'the top priority leads');
  assert.equal(led[1], 'signals', 'the pinned card falls in behind rather than being dropped');
  assert.deepEqual([...led].sort(), [...SIX].sort());
  // And it is not destructive: the pins are untouched, so "my pin order" can put it all back.
  assert.deepEqual(arrange(SIX, { signals: 0 }), pinnedFirst);
});

test('leading with a card that is not there changes nothing', () => {
  assert.deepEqual(leadWith(SIX, 'role:zz'), SIX);
});

test('a drop lands before or after the card it was dropped on', () => {
  assert.deepEqual(move(SIX, 'role:pd', 'role:ca'), ['role:pd', 'role:ca', 'role:op', 'role:bd', 'meetings', 'signals']);
  assert.deepEqual(move(SIX, 'role:pd', 'role:ca', true), ['role:ca', 'role:pd', 'role:op', 'role:bd', 'meetings', 'signals']);
  // Dropping the last card after the last card is a no-op, not a list that loses its end.
  assert.deepEqual(move(SIX, 'signals', 'signals', true), SIX);
  assert.deepEqual(move(SIX, 'role:ca', 'signals', true)[5], 'role:ca');
});

test('the keyboard does the same job as the drag, and stops at the ends', () => {
  // A reorder that can only be done by dragging cannot be done by everyone — and not at all on
  // a touch screen, where the drag events do not fire.
  assert.deepEqual(nudge(SIX, 'role:ca', 1)[1], 'role:ca');
  assert.deepEqual(nudge(SIX, 'role:ca', -1), SIX, 'the first card cannot move further left');
  assert.deepEqual(nudge(SIX, 'signals', 1), SIX, 'the last card cannot move further right');
  assert.deepEqual(nudge(SIX, 'role:ca', 99)[5], 'role:ca', 'a big nudge clamps rather than wraps');
  assert.deepEqual([...nudge(SIX, 'role:ca', 2)].sort(), [...SIX].sort());
});

test('pins follow the cards they are on', () => {
  // A tack means "this slot" from the moment it is set, and has to keep meaning that after the
  // advisor drags the card somewhere else.
  const moved = nudge(SIX, 'signals', -5);
  assert.equal(moved[0], 'signals');
  assert.deepEqual(pinsFor(moved, ['signals']), { signals: 0 });
  assert.deepEqual(pinsFor(SIX, ['signals']), { signals: 5 });
  assert.deepEqual(pinsFor(SIX, ['role:zz']), {}, 'a pin on a card that is gone is dropped');
});

test('a stored order from an older release still shows a card added since', () => {
  // The repair lives in advisor.js because it needs to know what the six are; what it must
  // never do is hide a card because somebody arranged five of them last year.
  const advisor = fs.readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dashboard', 'js', 'advisor.js'), 'utf8');
  assert.match(advisor, /\[\.\.\.mine, \.\.\.all\.filter\(id => !mine\.includes\(id\)\)\]/,
    'a stored order must be topped up with anything it does not mention');
  assert.match(advisor, /\.filter\(id => CARD_IDS\(\)\.includes\(id\)\)/,
    'and stripped of anything that no longer exists');
});

test('the six are the four roles and the two standing panels', () => {
  assert.deepEqual(PANELS, ['meetings', 'signals']);
  assert.equal(cardId('bd'), 'role:bd');
});
