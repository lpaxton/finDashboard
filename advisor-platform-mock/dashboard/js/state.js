/* The small amount of state that genuinely crosses view boundaries. Keeping it here
   rather than in app.js stops the views and the shell importing each other. */
import { $ } from './format.js';

export const state = { session: null, view: null };

/* The stored accent is a light-mode colour. Used as-is in dark mode it fails contrast
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

/* Branding is the one thing every role reads, so it is applied in the shell, not per view. */
export function applyBranding(b) {
  if (!b) return;
  if (b.accentColor) document.documentElement.style.setProperty('--brand', forTheme(b.accentColor));
  if (b.firmName && state.session) {
    state.session.firm.name = b.firmName;
    $('subhead').textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) + ' • ' + b.firmName;
  }
}
