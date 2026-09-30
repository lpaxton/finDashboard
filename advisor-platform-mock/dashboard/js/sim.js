/*
 * SimGPT: rehearsing a conversation before having it (AX-05, AX-06, AX-07).
 *
 * The platform plays the client for one turn and says one thing about how the adviser's turn
 * landed. Three rules shape everything here, and all three are about the same worry — that an
 * adviser walks out of a rehearsal believing something a real client never said.
 *
 *   It is not a record.   Nothing is filed against the household. The exchange lives in this
 *                         panel and in view state, and the server is told it each turn rather
 *                         than keeping it.
 *   It is marked.         Every client turn is framed as simulated, every time, not once at the
 *                         top where it scrolls away.
 *   It names its source.  The scene is composed from the record and says so; the coaching note
 *                         carries the same provenance line as every other model output (X-04).
 */
import { api } from './api.js';
import { $, esc } from './format.js';
import { toast } from './ui.js';
import { t } from './i18n.js';
import { get as vsGet, set as vsSet } from './viewstate.js';

/* Kept per meeting so closing the panel to look something up does not lose the conversation,
   and cleared by "Start again" rather than persisting as though it meant something. */
const key = (id) => 'rehearsal:' + id;
const load = (id) => vsGet(key(id), null);
const save = (id, v) => vsSet(key(id), v);

let current = null;

export function closeSim() {
  const p = $('simPanel');
  if (!p || !p.classList.contains('open')) { if (p) p.hidden = true; return; }
  p.classList.remove('open');
  document.body.classList.remove('side-open');
  setTimeout(() => { if (!p.classList.contains('open')) p.hidden = true; }, 240);
}

export function openSim(meetingId, label) {
  const p = $('simPanel');
  if (p.classList.contains('open') && current === meetingId) { closeSim(); return; }
  current = meetingId;
  p.innerHTML = `<div class="side-head"><h2 id="simTitle">${esc(t('Rehearsal'))}</h2>
      <button class="btn quiet" id="simClose" aria-label="${esc(t('Close the rehearsal'))}">${esc(t('Close'))}</button></div>
    <div class="side-body sim-body">
      <p class="sim-frame">${esc(t('Practice. The client here is simulated from what is on file — nothing they say is something your client said, and nothing you say is filed anywhere.'))}</p>
      <div id="simScene" class="sim-scene"><span class="skel"></span></div>
      <div id="simTurns" class="sim-turns"></div>
      <div class="sim-compose">
        <label class="vh" for="simSay">${esc(t('What you say next'))}</label>
        <textarea id="simSay" rows="3" placeholder="${esc(t('Say something to {who}', { who: label || t('them') }))}"></textarea>
        <div class="actions">
          <button class="btn primary" id="simGo">${esc(t('Say it'))}</button>
          <button class="btn quiet" id="simReset">${esc(t('Start again'))}</button>
        </div>
      </div>
    </div>`;
  p.hidden = false;
  requestAnimationFrame(() => p.classList.add('open'));
  document.body.classList.add('side-open');
  $('simClose').onclick = closeSim;

  const state = load(meetingId) || { exchange: [], scene: null };
  $('simReset').onclick = () => { save(meetingId, null); openSim(meetingId, label); };
  $('simGo').onclick = () => say(meetingId);
  $('simSay').onkeydown = (e) => {
    /* Enter sends, because this is a conversation. Shift+Enter is the newline, as it is in
       every message box the adviser already uses. */
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); say(meetingId); }
  };

  draw(meetingId, state);
  if (!state.scene) say(meetingId, '');      // the opening turn sets the scene and says nothing
  else $('simSay').focus();
}

function draw(meetingId, state) {
  const scene = $('simScene');
  if (scene) {
    scene.innerHTML = state.scene
      ? `<span class="sim-scene-label">${esc(t('On the record'))}</span> ${esc(state.scene)}`
      : `<span class="skel"></span>`;
  }
  const turns = $('simTurns');
  if (!turns) return;
  turns.innerHTML = state.exchange.map(x => x.who === 'adviser'
    ? `<div class="sim-turn me"><p>${esc(x.text)}</p></div>`
    : `<div class="sim-turn them">
         <span class="sim-who">${esc(t('Simulated client'))}</span>
         <p>${esc(x.text)}</p>
         ${x.coaching ? `<div class="sim-coach"><span class="sim-coach-label">${esc(t('What landed'))}</span>
           <p>${esc(x.coaching)}</p></div>` : ''}
         ${x.source ? `<p class="source">${esc(x.source)}</p>` : ''}
       </div>`).join('');
  turns.scrollTop = turns.scrollHeight;
}

async function say(meetingId, override) {
  const box = $('simSay');
  const said = override !== undefined ? override : (box ? box.value.trim() : '');
  if (override === undefined && !said) { toast('Say something first.'); return; }
  const state = load(meetingId) || { exchange: [], scene: null };
  const btn = $('simGo');
  if (btn) btn.disabled = true;
  if (said) { state.exchange.push({ who: 'adviser', text: said }); if (box) box.value = ''; draw(meetingId, state); }

  const turns = $('simTurns');
  if (turns) turns.insertAdjacentHTML('beforeend', '<div class="sim-turn them" id="simWait"><span class="skel"></span></div>');

  try {
    const r = await api('POST', '/meetings/' + encodeURIComponent(meetingId) + '/rehearsal',
      { body: { said, exchange: state.exchange.map(({ who, text }) => ({ who, text })) } });
    if (r.scene) state.scene = r.scene;
    if (r.refused) {
      toast(t('The model declined this request.'));
    } else if (r.client) {
      state.exchange.push({ who: 'client', text: r.client, coaching: r.coaching || null,
        source: r.provenance.live
          ? t('{model} · prompt {version}', { model: r.provenance.model, version: r.provenance.promptVersion })
          : t('Written offline: no model is connected · prompt {version}', { version: r.provenance.promptVersion }) });
    }
    save(meetingId, state);
    draw(meetingId, state);
    const s = $('simSay'); if (s) s.focus();
  } catch (e) {
    const wait = $('simWait'); if (wait) wait.remove();
    toast(e.message);
  } finally { if ($('simGo')) $('simGo').disabled = false; }
}
