/* The shell: sign in, pick a view, wire the global click handlers. Entry point. */
import { api } from './api.js';
import { CONFIG, setPersona } from './config.js';
import { $, esc } from './format.js';
import { state, applyBranding, applyTheme, getTheme } from './state.js';
import { openAsk, closeAsk, openActivity, closeActivity, setAskContext, openSettings, closeSettings } from './ui.js';
import { t, setLang, getLang, locale, onLangChange } from './i18n.js';
import { advisorView } from './advisor.js';
import { firmView } from './firm.js';
import { clientView } from './client.js';

const VIEWS = { firm: firmView, advisor: advisorView, client: clientView };
const VIEW_LABEL = { firm: 'Firm', advisor: 'Advisor', client: 'Client' };

function showView(v) {
  state.view = v;
  const s = state.session, first = s.name.split(' ')[0], h = new Date().getHours();
  // 'The firm', not 'Firm overview': the view has seven sections now and Overview is one of
  // them, so naming the whole view after a section made the page title argue with the nav.
  /* The greeting is one string per case rather than a greeting plus a comma plus a name:
     French puts no comma there, and a sentence assembled from fragments can only be translated
     into the language it was assembled for. */
  $('greeting').textContent = v === 'firm' ? t('The firm')
    : v === 'client' ? t('Welcome, {name}', { name: first })
    : t(h < 12 ? 'Good morning, {name}' : h < 18 ? 'Good afternoon, {name}' : 'Good evening, {name}', { name: first });
  $('subhead').textContent = new Date().toLocaleDateString(locale(), { weekday: 'long', month: 'long', day: 'numeric' }) + ' • ' + s.firm.name;
  const tabs = $('tabs');
  tabs.hidden = s.views.length < 2;
  tabs.innerHTML = s.views.map(x => `<button role="tab" data-view="${x}" aria-selected="${x === v}">${esc(t(VIEW_LABEL[x]))}</button>`).join('');
  $('actBtn').textContent = t('Activity');
  $('askBtn').textContent = t('Ask');
  document.title = t('Advisor platform');
  const signIn = $('demoSignIn'); if (signIn) signIn.textContent = t('Sign in as');
  /* The harness chrome is relabelled here rather than in boot(), because boot() paints it
     before it has asked the server which language this person reads. */
  $('demoText').textContent = CONFIG.mode === 'mock' ? t('Sample data. This page runs a mock of the draft API, and nothing leaves your browser.') : t('Connected to the standalone mock server. Data resets when the server restarts.');
  $('foot').textContent = CONFIG.mode === 'mock' ? t('Showing sample data from a mock of the draft API. Set CONFIG.mode to live and CONFIG.baseUrl to connect the real backend.')
    : CONFIG.personaPicker ? t('Talking to the standalone mock server through the /v1 API. Point CONFIG.baseUrl at the real backend to go live.') : '';
  // The ask affordance is advisor-side only. The client portal deliberately has none:
  // see docs/query-surface.md on why the client-safe boundary stays structural.
  // Activity follows the same boundary: it is a record of an advisor's own work.
  const ask = $('askBtn');
  ask.hidden = v === 'client';
  $('actBtn').hidden = v !== 'advisor';
  closeAsk(); closeActivity();
  // The section nav is mounted outside #view so it can move above the header on a phone, which
  // means replacing the view does not remove it. A view that has no sections must therefore not
  // inherit the last one's: the client portal was showing the firm spine, Ownership and all.
  // Cleared here rather than in each view, so a new view cannot forget.
  document.querySelectorAll('.subnav').forEach(n => n.remove());
  setAskContext(v === 'firm' ? 'firm' : 'own', null, v === 'firm' ? t('the whole firm') : t('your book'));
  VIEWS[v]();
}

async function boot() {
  $('demo').hidden = !(CONFIG.mode === 'mock' || CONFIG.personaPicker);
  /* Theme before anything is drawn. It is read from this browser rather than from the server,
     so there is nothing to wait for — but the module itself is deferred, so a person who has
     chosen light on a dark machine still sees one dark frame first. Removing that last flash
     needs an inline script in the head, which would have to duplicate the storage key and the
     persona scoping; not worth it for a POC, and logged rather than hidden. */
  applyTheme(getTheme());
  $('view').innerHTML = '<div class="skel"></div><div class="skel m"></div>';
  try { state.session = await api('GET', '/session'); }
  catch (e) { $('view').innerHTML = `<p class="err">${esc(e.message || t("Couldn't sign you in."))}</p>`; return; }
  /* Language before the first render, so nothing is painted in one language and repainted in
     another. A failure here leaves English, which is the default rather than a broken state. */
  try { setLang((await api('GET', '/settings')).language); } catch { /* English it is */ }
  $('avatar').textContent = state.session.name.split(' ').map(p => p[0]).slice(0, 2).join('');
  try { applyBranding(await api('GET', '/firm/branding')); } catch { /* branding is decoration; never block the app */ }
  showView(state.session.views[0]);
}

/* Changing the language re-renders the view in place. Ask and Activity are closed first: they
   were rendered in the old language and are not worth re-rendering, and someone who just
   changed a setting is looking at the page, not at those panels. Settings itself stays open —
   they may want to change something else while they are in there.

   Registered as a listener rather than passed to openSettings as a callback, so every door into
   Settings behaves the same and a new one cannot forget to wire it. */
onLangChange(() => { closeAsk(); closeActivity(); if (state.view) showView(state.view); });

document.addEventListener('click', (e) => {
  if (e.target.closest('#askBtn')) { closeActivity(); closeSettings(); openAsk(state.session.roles.includes('principal')); return; }
  if (e.target.closest('#actBtn')) { closeAsk(); closeSettings(); openActivity(); return; }
  if (e.target.closest('[data-settings]')) { closeAsk(); closeActivity(); openSettings(); return; }
  const t = e.target.closest('[data-view]'); if (t) showView(t.dataset.view);
  const p = e.target.closest('[data-persona]');
  if (p) { setPersona(p.dataset.persona); document.querySelectorAll('[data-persona]').forEach(b => b.setAttribute('aria-pressed', String(b === p))); boot(); }
  if (e.target.closest('[data-close]')) $('dlg').close();
});

$('dlg').addEventListener('close', () => { $('dlg').className = ''; });

boot();