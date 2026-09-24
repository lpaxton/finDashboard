/* The shell: sign in, pick a view, wire the global click handlers. Entry point. */
import { api } from './api.js';
import { CONFIG, setPersona } from './config.js';
import { $, esc } from './format.js';
import { state, applyBranding } from './state.js';
import { openAsk, setAskContext } from './ui.js';
import { advisorView } from './advisor.js';
import { firmView } from './firm.js';
import { clientView } from './client.js';

const VIEWS = { firm: firmView, advisor: advisorView, client: clientView };
const VIEW_LABEL = { firm: 'Firm', advisor: 'Advisor', client: 'Client' };

function showView(v) {
  state.view = v;
  const s = state.session, first = s.name.split(' ')[0], h = new Date().getHours();
  $('greeting').textContent = v === 'firm' ? 'Firm overview' : v === 'client' ? 'Welcome, ' + first
    : (h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening') + ', ' + first;
  $('subhead').textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) + ' • ' + s.firm.name;
  const tabs = $('tabs');
  tabs.hidden = s.views.length < 2;
  tabs.innerHTML = s.views.map(x => `<button role="tab" data-view="${x}" aria-selected="${x === v}">${VIEW_LABEL[x]}</button>`).join('');
  // The ask affordance is advisor-side only. The client portal deliberately has none:
  // see docs/query-surface.md on why the client-safe boundary stays structural.
  const ask = $('askBtn');
  ask.hidden = v === 'client';
  setAskContext(v === 'firm' ? 'firm' : 'own', null, v === 'firm' ? 'the whole firm' : 'your book');
  VIEWS[v]();
}

async function boot() {
  $('demo').hidden = !(CONFIG.mode === 'mock' || CONFIG.personaPicker);
  $('demoText').textContent = CONFIG.mode === 'mock' ? 'Sample data. This page runs a mock of the draft API v0.3, and nothing leaves your browser.' : 'Connected to the standalone mock server. Data resets when the server restarts.';
  $('foot').textContent = CONFIG.mode === 'mock' ? 'Showing sample data from a mock of the draft API v0.3. Set CONFIG.mode to live and CONFIG.baseUrl to connect the real backend.'
    : CONFIG.personaPicker ? 'Talking to the standalone mock server through the /v1 API. Point CONFIG.baseUrl at the real backend to go live.' : '';
  $('view').innerHTML = '<div class="skel"></div><div class="skel m"></div>';
  try { state.session = await api('GET', '/session'); }
  catch (e) { $('view').innerHTML = `<p class="err">${esc(e.message || "Couldn't sign you in.")}</p>`; return; }
  $('avatar').textContent = state.session.name.split(' ').map(p => p[0]).slice(0, 2).join('');
  try { applyBranding(await api('GET', '/firm/branding')); } catch { /* branding is decoration; never block the app */ }
  showView(state.session.views[0]);
}

document.addEventListener('click', (e) => {
  if (e.target.closest('#askBtn')) { openAsk(state.session.roles.includes('principal')); return; }
  const t = e.target.closest('[data-view]'); if (t) showView(t.dataset.view);
  const p = e.target.closest('[data-persona]');
  if (p) { setPersona(p.dataset.persona); document.querySelectorAll('[data-persona]').forEach(b => b.setAttribute('aria-pressed', String(b === p))); boot(); }
  if (e.target.closest('[data-close]')) $('dlg').close();
});

boot();
