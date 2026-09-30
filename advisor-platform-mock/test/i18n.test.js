/*
 * Language (AX-12).
 *
 * Two kinds of failure are worth a test here, and neither shows up as an exception.
 *
 * A translation that drops a placeholder renders "Échéance" with no date and reads as finished.
 * A dictionary that drifts out of step with the code renders a French screen with English
 * sentences in it. Both look like working software.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jsDir = path.join(__dirname, '..', 'dashboard', 'js');
const src = fs.readFileSync(path.join(jsDir, 'i18n.js'), 'utf8');

/* The dictionary is a plain object literal, so it can be read without a DOM. Both quote styles
   and a value wrapped onto its own line, because the file is written to be read by people and
   a test that only matched one house style would fail on a reformat rather than on a bug. */
const entries = () => {
  const Q = String.raw`(?:'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")`;
  const re = new RegExp(String.raw`^ {2}(${Q}):\s*(${Q}),?$`, 'gm');
  const unq = (s) => s.slice(1, -1)
    .replace(/\\u([0-9a-fA-F]{4})/g, (m, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  return [...src.matchAll(re)].map(m => [unq(m[1]), unq(m[2])]);
};

test('the French dictionary is well formed', () => {
  const rows = entries();
  assert.ok(rows.length > 400, 'expected a full dictionary, found ' + rows.length);
  const seen = new Set();
  for (const [k] of rows) {
    assert.ok(!seen.has(k), 'duplicate key: ' + k);
    seen.add(k);
  }
});

test('no translation loses or invents a placeholder', () => {
  // The SET, not the count: French often needs a name twice where English needs it once
  // ("C'est a {name}... de les ajouter a ses suivis"), and that is a better translation, not a bug.
  const marks = (s) => [...new Set([...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]))].sort();
  for (const [k, v] of entries()) {
    assert.deepEqual(marks(v), marks(k),
      `"${k}" and its French differ in placeholders — a dropped {name} renders as a gap, not an error`);
  }
});

test('no translation is left as the English', () => {
  // A key copied into the value is the shape an unfinished translation takes, and it renders
  // as a perfectly ordinary English sentence on a French screen.
  const same = entries().filter(([k, v]) => k === v && /[a-z]{4}\s+[a-z]{4}/i.test(k));
  assert.deepEqual(same.map(([k]) => k), [], 'untranslated entries');
});

/* The rule the whole layer rests on: the English string IS the key. If a call site is edited
   and the dictionary is not, the screen silently falls back to English — so the two are
   compared here rather than discovered by a French reader. */
test('every key the dashboard asks for exists in French', () => {
  const have = new Set(entries().map(([k]) => k));
  const files = fs.readdirSync(jsDir).filter(f => f.endsWith('.js') && f !== 'i18n.js');
  const S = String.raw`('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")`;
  // Every helper that translates what it is handed, so a literal reaching one is a key.
  const pats = [`\\bt\\(\\s*${S}`, `\\btr\\(\\s*${S}`, `\\btoast\\(\\s*${S}`,
    `\\bhead\\(\\s*${S}`, `\\bload\\(\\$\\('[\\w-]+'\\),\\s*${S}`].map(p => new RegExp(p, 'g'));
  const unq = (s) => s.slice(1, -1)
    .replace(/\\u([0-9a-fA-F]{4})/g, (m, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\'/g, "'").replace(/\\\\/g, '\\');

  const missing = new Set();
  for (const f of files) {
    const s = fs.readFileSync(path.join(jsDir, f), 'utf8');
    for (const p of pats) for (const m of s.matchAll(p)) {
      const key = unq(m[1]);
      if (!have.has(key)) missing.add(f + ': ' + key);
    }
  }
  assert.deepEqual([...missing], [], 'strings with no French');
});

test('formatting follows the language, not just the words', () => {
  // A dictionary that translates the words and leaves 83,900,000.00 in en-US produces a screen
  // in two languages at once, so the locale has to reach Intl.
  assert.match(src, /LOCALE = \{[^}]*fr: 'fr-FR'/, 'fr must map to a real locale');
  const fmt = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 });
  assert.notEqual(fmt.format(83900000), new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(83900000));

  const f = fs.readFileSync(path.join(jsDir, 'format.js'), 'utf8');
  assert.doesNotMatch(f, /'en-US'/, "format.js must not hard-code a locale — that is half a translation");
});

test('the language a person chose is offered by the server, not guessed by the page', () => {
  // The settings screen must not offer French because the front end believes it exists.
  const ui = fs.readFileSync(path.join(jsDir, 'ui.js'), 'utf8');
  assert.match(ui, /cfg\.availableLanguages\.map/, 'the language list must come from GET /settings');
});

/* ---- the server's half ---------------------------------------------------------------- *
 * The dashboard translating itself is not enough: the reason under a role card, the activity
 * log and the drafts note are all composed by the backend, and a French screen full of English
 * sentences is what you get if only one half is done.
 */
import { createMock } from '../src/mock-core.js';
import { tr } from '../src/i18n.js';

const mk = () => {
  const m = createMock();
  return (who, method, path, query, body) => m.handle(method, path, query || {}, body || null, who);
};

test('the server composes its own prose in the reader\'s language', async () => {
  const call = mk();
  assert.equal(call('dana', 'PATCH', '/settings', {}, { language: 'fr' }).status, 200);

  const na = call('dana', 'GET', '/next-actions', { size: 20 }).data;
  assert.match(na.note, /brouillons/, 'the drafts note must be in French');
  const contact = na.items.find(a => a.kind === 'contact');
  assert.ok(contact, 'need a contact-kind next action');
  assert.match(contact.title, /Reprendre contact/);
  assert.match(contact.reason, /Aucun contact depuis \d+ jours/);
  // The household inside that sentence is a record and stays as it is recorded.
  assert.match(contact.title, /household|Trust|Family/);

  const act = call('dana', 'GET', '/activity', { size: 5 }).data.items;
  assert.ok(act.some(a => /Journée classée par rôle/.test(a.summary)), 'the activity log must be in French');
  assert.ok(act.every(a => !('vars' in a)), 'the interpolation values are internal and must not leak');
});

test('what a signal says about one household is translated too, numbers included', () => {
  const call = mk();
  /* This line is the platform's own prose about a position, and it was the last one on the
     signals list still composed in English with an en-US number glued to it. It is drawn twice
     now — under the signal, and beside the article aRCHi offers for it — so a French reader
     meets it twice. */
  const en = call('dana', 'GET', '/portfolio-signals/sig_tax_loss_harvesting/items', { size: 1 }).data.items[0];
  assert.match(en.detail, /Unrealised loss of \$12,400/);

  call('dana', 'PATCH', '/settings', {}, { language: 'fr' });
  const fr = call('dana', 'GET', '/portfolio-signals/sig_tax_loss_harvesting/items', { size: 1 }).data.items[0];
  assert.match(fr.detail, /Moins-value latente/);
  assert.doesNotMatch(fr.detail, /12,400/, 'the figure has to follow the language as well as the words');
  // Drift is a decimal, and a decimal point left as a point is the same half-translation.
  const drift = call('dana', 'GET', '/portfolio-signals/sig_allocation_drift/items', { size: 1 }).data.items[0];
  assert.match(drift.detail, /7,2 points/);
});

test('language is per person, not per server', () => {
  const call = mk();
  call('marcus', 'PATCH', '/settings', {}, { language: 'fr' });
  // Dana never chose French and must not be given it.
  const hers = call('dana', 'GET', '/next-actions', { size: 20 }).data;
  assert.match(hers.note, /These are drafts/);
  assert.ok(hers.items.some(a => /Reconnect with/.test(a.title)), 'Dana must still read English');
  // And Marcus is unchanged by Dana having read anything.
  assert.match(call('marcus', 'GET', '/next-actions', { size: 1 }).data.note, /brouillons/);
});

test('records are not translated, and that is the point', () => {
  const call = mk();
  call('marcus', 'PATCH', '/settings', {}, { language: 'fr' });
  // A household's name is what it is called. Translating it would change the record.
  const hh = call('marcus', 'GET', '/households').data.items;
  assert.ok(hh.some(h => /household|Trust|Family/.test(h.name)), 'household names must survive the translation layer');
  // An unknown key falls through to the English rather than rendering as a key or an empty string.
  assert.equal(tr('fr', 'Something nobody has translated yet'), 'Something nobody has translated yet');
  assert.equal(tr('fr', 'No contact in {n} days.', { n: 3 }), 'Aucun contact depuis 3 jours.');
  // A language this build does not have falls back rather than failing.
  assert.equal(tr('de', 'No contact in {n} days.', { n: 3 }), 'No contact in 3 days.');
});

test('a language the build cannot render is refused, not stored', () => {
  const call = mk();
  const bad = call('dana', 'PATCH', '/settings', {}, { language: 'de' });
  assert.equal(bad.status, 400);
  assert.match(bad.data.message, /en and fr/, 'the refusal must say what this build does have');
  assert.equal(call('dana', 'GET', '/settings').data.language, 'en', 'a refused change must not take effect');
  // The list the settings screen offers comes from here, so it cannot drift from what exists.
  const codes = call('dana', 'GET', '/settings').data.availableLanguages.map(l => l.code);
  assert.deepEqual(codes, ['en', 'fr']);
  // Each language is named in itself: a French reader looking for their language looks for
  // "Français", not "French".
  assert.equal(call('dana', 'GET', '/settings').data.availableLanguages.find(l => l.code === 'fr').label, 'Français');
});

test('a client reads the portal in their own language too', () => {
  const call = mk();
  assert.equal(call('grace', 'PATCH', '/settings', {}, { language: 'fr' }).status, 200,
    'the setting is not an advisor privilege');
  assert.equal(call('grace', 'GET', '/settings').data.language, 'fr');
});

/* ---- Settings: where it is reached from, and what belongs in it ------------------------- *
 * Two decisions worth holding still. Settings has to be reachable from every view, including
 * the one with no navigation at all; and the theme is a browser preference while the language
 * is an account one, which is the sort of distinction that quietly collapses later.
 */
test('settings is reachable from every view, including the one with no nav', () => {
  const ui = fs.readFileSync(path.join(jsDir, 'ui.js'), 'utf8');
  const client = fs.readFileSync(path.join(jsDir, 'client.js'), 'utf8');
  const html = fs.readFileSync(path.join(__dirname, '..', 'dashboard', 'index.html'), 'utf8');

  // The spine (advisor) and the section list (firm) both render the same foot item.
  assert.equal((ui.match(/\$\{settingsItem\(\)\}/g) || []).length, 2,
    'both spine() and subnav() must render the settings item');
  // The client portal has no nav, so it carries its own door to the same panel.
  assert.match(client, /data-settings/, 'the client portal must be able to reach settings');
  // And it is not left in the header as well, or there are two doors to one room.
  assert.doesNotMatch(html, /id="setBtn"/, 'the header button was replaced by the nav item');
  // The label is built per call, not frozen at module load, or it stays English after a switch.
  assert.match(ui, /const settingsItem = \(\) =>/, 'the item must be a function so t() runs each render');
});

test('the theme is a property of the browser, the language a property of the account', () => {
  const st = fs.readFileSync(path.join(jsDir, 'state.js'), 'utf8');
  const ui = fs.readFileSync(path.join(jsDir, 'ui.js'), 'utf8');

  // Three options, and "system" is a real one rather than a label for light.
  assert.match(st, /THEMES = \[\['system'/, 'system must be offered, and first');
  for (const k of ['light', 'dark']) assert.ok(st.includes(`'${k}'`), k + ' must be offered');
  assert.match(st, /else delete el\.dataset\.theme/, 'system must clear the attribute, not set one');

  // Stored locally. If this ever goes to the server, the same person gets one theme across a
  // desktop and a phone, which is the wrong answer for light and dark.
  assert.match(st, /vsSet\('theme', pref\)/, 'the theme belongs in view state');
  const patch = ui.slice(ui.indexOf("api('PATCH', '/settings'"), ui.indexOf("api('PATCH', '/settings'") + 120);
  assert.doesNotMatch(patch, /theme/, 'the theme must not be sent to /settings');

  // The accent is a light-mode colour lifted for dark ground, so it has to be recomputed.
  assert.match(st, /if \(state\.branding\) applyBranding\(state\.branding\)/,
    'changing theme must re-apply branding, or the firm mark keeps the old contrast');
});
