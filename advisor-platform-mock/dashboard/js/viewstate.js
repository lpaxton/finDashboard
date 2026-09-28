/* What the advisor set by hand, kept between renders and between visits.
   UX_RULES ST-07: what the advisor sets, stays. An opened brief, an expanded row, a snoozed
   alert and (later) a pinned role order are all the same promise, so they live in one place
   rather than in seven closures that are lost the moment a section redraws.

   Two things this is not. It is not a cache: nothing here is data from the API, only the
   advisor's own choices about it. And it is not durable: it is this browser only, so anything
   that must survive a change of machine belongs in the contract, not here (see UX-001).

   Keyed by persona, because the sign-in-as switcher is a development tool and Dana's open
   briefs must not appear as Marcus's. */
import { currentPersona } from './config.js';

const KEY = 'advisor-platform:viewstate';

/* Storage is allowed to fail — private browsing, a full quota, a browser that blocks it. A
   failure costs the advisor their open cards, which is a disappointment and never an error. */
function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; }
  catch { return {}; }
}
function write(all) {
  try { localStorage.setItem(KEY, JSON.stringify(all)); }
  catch { /* nothing to tell the advisor: their choice simply will not outlive this visit */ }
}

const mine = (all) => (all[currentPersona] ||= {});

/** @param {string} key @param {any} [fallback] */
export function get(key, fallback = undefined) {
  const v = mine(read())[key];
  return v === undefined ? fallback : v;
}

/** @param {string} key @param {any} value Anything JSON can hold. `undefined` removes it. */
export function set(key, value) {
  const all = read(), bucket = mine(all);
  if (value === undefined) delete bucket[key]; else bucket[key] = value;
  write(all);
}

/* Open and closed. One flat set of ids, namespaced by the caller ("brief:m3", "signal:s1"),
   so a new kind of thing that opens needs no change here. */
export const isOpen = (id) => (get('open', []) || []).includes(id);
export function setOpen(id, on) {
  const now = new Set(get('open', []) || []);
  if (on) now.add(id); else now.delete(id);
  set('open', [...now]);
}

/* Not now: hidden until a time the advisor picked (UX_RULES CS-05).
   An expired snooze is dropped on read, so nothing has to run on a timer. */
export function snooze(id, until) {
  const all = { ...(get('snoozed') || {}) };
  all[id] = new Date(until).toISOString();
  set('snoozed', all);
}
export function unsnooze(id) {
  const all = { ...(get('snoozed') || {}) };
  delete all[id];
  set('snoozed', all);
}
export function snoozedUntil(id) {
  const at = (get('snoozed') || {})[id];
  if (!at) return null;
  if (new Date(at) <= new Date()) { unsnooze(id); return null; }
  return at;
}
export const isSnoozed = (id) => snoozedUntil(id) !== null;

/** Drops every snooze whose time has passed. Call once per render of a list that uses them. */
export function dropExpiredSnoozes() {
  const all = get('snoozed') || {}, now = new Date();
  const live = Object.fromEntries(Object.entries(all).filter(([, at]) => new Date(at) > now));
  if (Object.keys(live).length !== Object.keys(all).length) set('snoozed', live);
}

/** Brings back everything the advisor set aside. Paired with the line that says how many. */
export const unsnoozeAll = () => set('snoozed', {});

/** Everything this persona set by hand, forgotten. For a "reset my view" action, and for tests. */
export function forget() {
  const all = read();
  delete all[currentPersona];
  write(all);
}
