/* The small amount of state that genuinely crosses view boundaries. Keeping it here
   rather than in app.js stops the views and the shell importing each other. */
import { $ } from './format.js';
import { get as vsGet, set as vsSet } from './viewstate.js';
import { locale } from './i18n.js';

export const state = { session: null, view: null, branding: null };

/* The firm's accent paints the firm's mark, not the interface. The interactive colour
   (--brand) is fixed by the design system, because a colour has to mean one thing everywhere
   (UX_RULES ST-04): a red or orange firm accent driving --brand would collide with the
   Prospecting role, with --crit, and with the coral focus ring. Leila's leaning, recorded in
   ux/UX_DESIGN_SYSTEM.md §6, adopted here; reverse it by setting --brand below instead.

   The stored accent is a light-mode colour. Used as-is in dark mode it fails contrast
   against the dark ground, so it is lifted toward the page ink first. A firm that needs
   exact brand reproduction in both themes needs two stored colours: a contract change. */
export const isDark = () => document.documentElement.dataset.theme === 'dark'
  || (document.documentElement.dataset.theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);

export function forTheme(hex) {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || '');
  if (!m || !isDark()) return hex;
  const mix = (c, t) => Math.round(parseInt(c, 16) + (t - parseInt(c, 16)) * 0.55);
  return '#' + [mix(m[1], 230), mix(m[2], 238), mix(m[3], 236)].map(v => v.toString(16).padStart(2, '0')).join('');
}

/* Light or dark, or whatever the machine is set to.
   Kept in view state rather than in the contract, deliberately: the language a person reads is
   a property of the person and travels with them, but light or dark is a property of the screen
   they are at — dark on a phone at night, light at a desk in the morning, the same person both
   times. viewstate.js is this browser only, which is exactly the right reach for it (UX-001).

   'system' stores nothing and removes the attribute, so the machine keeps deciding. That is the
   default, and it is a real third option rather than a label for one of the other two. */
export const THEMES = [['system', 'Match my system'], ['light', 'Light'], ['dark', 'Dark']];
export const getTheme = () => vsGet('theme', 'system') || 'system';

export function applyTheme(pref) {
  const el = document.documentElement;
  if (pref === 'light' || pref === 'dark') el.dataset.theme = pref;
  else delete el.dataset.theme;
  vsSet('theme', pref);
  /* The firm's accent is a light-mode colour that gets lifted for dark ground, so it has to be
     recomputed when the ground changes. Re-applied from what was last fetched rather than
     re-fetched: this is a display change, not a data change. */
  if (state.branding) applyBranding(state.branding);
}

/* Branding is the one thing every role reads, so it is applied in the shell, not per view. */
export function applyBranding(b) {
  if (!b) return;
  state.branding = b;
  if (b.accentColor) document.documentElement.style.setProperty('--firm-mark', forTheme(b.accentColor));
  if (b.firmName && state.session) {
    state.session.firm.name = b.firmName;
    $('subhead').textContent = new Date().toLocaleDateString(locale(), { weekday: 'long', month: 'long', day: 'numeric' }) + ' • ' + b.firmName;
  }
}
