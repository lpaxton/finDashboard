/*
 * aRCHi: sending an approved article to a client (GP-06, GP-07, GP-10, TM-02, TM-07).
 *
 * The advisor is looking at a portfolio signal — five households with losses worth harvesting —
 * and this is where they answer it with something the client can actually read. Four rules
 * shape the panel, and each one is a thing the feature would otherwise get wrong:
 *
 *   One door.        Every send goes through POST /households/{id}/shares, the same operation
 *                    a plan or a report goes through. There is no article-shaped route into the
 *                    client portal, because the client-safe boundary is what that one door is.
 *   One approval.    Nothing leaves until the advisor presses a button that names how many
 *                    households it is about to reach (X-03). The panel drafts; it never sends.
 *   The version is   The share records which version of the article this client was given, and
 *   the record.      the server stamps it rather than taking the UI's word for it.
 *   The note is      The article is the firm's and has been through review. The note attached to
 *   the advisor's.   it is theirs, always editable, and knows nothing about the household —
 *                    the same words go to everyone on the list (TM-07).
 *
 * Two ways in and one panel, because there is one approval and one receipt:
 *   a portfolio signal   several households at once, fetched from the signal
 *   a message draft      one named client, handed over by the caller who already has them
 */
import { api } from './api.js';
import { $, esc } from './format.js';
import { toast } from './ui.js';
import { t, getLang, LANGS } from './i18n.js';

/* Named in the language itself — a French reader looks for "Français", not for "French" — and
   taken from the list the interface already uses rather than written out again here. */
const langName = (code) => (LANGS.find(([c]) => c === code) || [code, code])[1];

let current = null;

export function closeArchi() {
  const p = $('archiPanel');
  if (!p || !p.classList.contains('open')) { if (p) p.hidden = true; return; }
  p.classList.remove('open');
  document.body.classList.remove('side-open');
  setTimeout(() => { if (!p.classList.contains('open')) p.hidden = true; }, 240);
}

/* `meaning` is the sentence the signal row shows the advisor — a count of their households and
   a total across them. `subject` is the same signal with the arithmetic taken out. Only the
   second one may leave the building: a covering note that opened "sending this because five
   households have $61,200 in unrealised losses" would tell each of those five clients about the
   other four. They are kept as separate arguments rather than one, so nothing downstream has to
   remember which of the two it is holding. */
export async function openArchi({ key, topic, meaning, subject = null, articleId = null, households = null, onSent = null }) {
  const p = $('archiPanel');
  if (p.classList.contains('open') && current === key) { closeArchi(); return; }
  current = key;
  p.innerHTML = frame(`<p class="empty"><span class="skel"></span></p>`);
  p.hidden = false;
  requestAnimationFrame(() => p.classList.add('open'));
  document.body.classList.add('side-open');
  $('archiClose').onclick = closeArchi;

  try {
    /* The library and the households are independent reads and are asked for together: the
       panel has nothing to show until both are back, so serialising them only costs time.
       A caller that already knows the households — a message is to one named client — hands
       them over instead of sending the panel to look them up. */
    const [lib, rows] = await Promise.all([
      api('GET', '/articles', { query: { topic } }),
      households
        ? Promise.resolve({ items: households })
        : api('GET', '/portfolio-signals/' + encodeURIComponent(key) + '/items', { query: { size: 20 } })
    ]);
    if (current !== key) return;                   // the advisor moved on while this was in flight
    const state = {
      key, topic, meaning, subject,
      articles: lib.items,
      households: rows.items,
      chosen: new Set(rows.items.map(h => h.householdId)),
      /* A caller may name the article it was standing next to. It still has to be in the list
         the library just returned — a suggestion that has expired between the strip being drawn
         and the panel being opened falls back rather than being offered. */
      pick: (articleId && lib.items.some(a => a.id === articleId)) ? articleId
        : lib.items.length ? lib.items[0].id : null,
      lang: null, note: '', provenance: null, onSent
    };
    state.lang = langFor(state);
    draw(state);
  } catch (e) {
    if (current !== key) return;
    $('archiBody').innerHTML = `<p class="err">${esc(e.message)}</p>`;
  }
}

const frame = (body) => `<div class="side-head"><h2 id="archiTitle">${esc(t('Send an article'))}</h2>
    <button class="btn quiet" id="archiClose" aria-label="${esc(t('Close'))}">${esc(t('Close'))}</button></div>
  <div class="side-body" id="archiBody">${body}</div>`;

const chosenArticle = (s) => s.articles.find(a => a.id === s.pick) || null;

/* The advisor's own reading language if the article has it, English if not. Never a language the
   article was not published in: the picker cannot offer a translation that does not exist. */
function langFor(s) {
  const a = chosenArticle(s);
  if (!a) return null;
  return a.languages.includes(getLang()) ? getLang() : a.languages[0];
}

function draw(s) {
  const a = chosenArticle(s);
  $('archiBody').innerHTML = `
    <p class="sim-frame">${esc(t('The article is the firm’s and has been through review. The note you add is yours. Nothing reaches a client until you approve it below.'))}</p>
    <p class="ar-because">${esc(s.meaning)}</p>
    ${!s.articles.length ? `<p class="empty">${esc(t('Nothing in the library covers this topic yet.'))}</p>` : `
    <h3 class="ar-h">${esc(t('The article'))}</h3>
    <ul class="ar-list" role="radiogroup" aria-label="${esc(t('The article'))}">
      ${s.articles.map(x => `<li><label class="ar-opt${x.id === s.pick ? ' on' : ''}">
        <input type="radio" name="archiPick" value="${esc(x.id)}"${x.id === s.pick ? ' checked' : ''}>
        <span class="grow"><span class="title">${esc(x.title)}</span>
          <span class="meta">${esc(x.summary)}</span>
          <span class="source">${esc(t('Version {v} · approved {date} · {n} min read', { v: x.version, date: (x.approvedAt || '').slice(0, 10), n: x.readingMinutes }))}${x.expiresAt ? esc(t(' · approval runs out {date}', { date: x.expiresAt })) : ''}</span>
        </span></label></li>`).join('')}
    </ul>

    <h3 class="ar-h">${esc(t('Language'))}</h3>
    <div class="field ar-lang">
      ${a.languages.length > 1
        ? `<label class="vh" for="arLang">${esc(t('Language'))}</label>
           <select id="arLang">${a.languages.map(l => `<option value="${esc(l)}"${l === s.lang ? ' selected' : ''}>${esc(langName(l))}</option>`).join('')}</select>`
        : `<p class="meta">${esc(t('Published in {lang} only.', { lang: langName(a.languages[0]) }))}</p>`}
      <p class="hint">${esc(t('The platform cannot see which language a client reads, so this is your call.'))}</p>
    </div>

    <h3 class="ar-h">${esc(t('Who it goes to'))}</h3>
    <ul class="ar-list">
      ${s.households.map(h => `<li><label class="ar-opt${s.chosen.has(h.householdId) ? ' on' : ''}">
        <input type="checkbox" data-hh="${esc(h.householdId)}"${s.chosen.has(h.householdId) ? ' checked' : ''}>
        <span class="grow"><span class="title">${esc(h.householdName)}</span>
          ${h.detail ? `<span class="meta">${esc(h.detail)}</span>` : ''}</span></label></li>`).join('')}
    </ul>

    <h3 class="ar-h">${esc(t('Your note'))}</h3>
    <p class="hint" style="margin:0 0 8px">${esc(t('The same note goes to everyone on the list, so it says nothing about any one household’s holdings.'))}</p>
    <div class="field"><label class="vh" for="arNote">${esc(t('Your note'))}</label>
      <textarea id="arNote" rows="4" placeholder="${esc(t('Optional. A line saying why you are sending it.'))}">${esc(s.note)}</textarea></div>
    <div class="actions">
      <select id="arTone" aria-label="${esc(t('Tone for a rewrite'))}">
        <option value="Warm and direct">${esc(t('Warm and direct'))}</option>
        <option value="Formal">${esc(t('Formal'))}</option>
        <option value="Brief">${esc(t('Brief'))}</option></select>
      <button class="btn" id="arDraft">${esc(t('Draft a note'))}</button>
    </div>
    <p class="source" id="arProv">${s.provenance ? esc(s.provenance) : ''}</p>

    <div class="ar-send">
      <button class="btn primary" id="arGo">${esc(sendLabel(s))}</button>
      <p class="hint">${esc(t('The client sees this in their portal. A share cannot be taken back from here.'))}</p>
    </div>`}`;
  wire(s);
}

const sendLabel = (s) => s.chosen.size === 1
  ? t('Approve and send to 1 household')
  : t('Approve and send to {n} households', { n: s.chosen.size });

function wire(s) {
  const body = $('archiBody');
  body.querySelectorAll('[name="archiPick"]').forEach(r => r.onchange = () => {
    s.pick = r.value; s.lang = langFor(s); draw(s);
  });
  body.querySelectorAll('[data-hh]').forEach(c => c.onchange = () => {
    if (c.checked) s.chosen.add(c.dataset.hh); else s.chosen.delete(c.dataset.hh);
    /* Only the label and the row's own state change. Redrawing here would throw away a note the
       advisor has half written, to move a tick they have just moved themselves. */
    c.closest('.ar-opt').classList.toggle('on', c.checked);
    const go = $('arGo'); if (go) { go.textContent = sendLabel(s); go.disabled = s.chosen.size === 0; }
  });
  const note = $('arNote'); if (note) note.oninput = () => { s.note = note.value; };
  const draft = $('arDraft'); if (draft) draft.onclick = () => drawNote(s);
  const go = $('arGo');
  if (go) { go.disabled = s.chosen.size === 0; go.onclick = () => send(s); }
}

/* The covering note, drafted. It is put into the box rather than sent anywhere, and the box
   stays editable: a draft the advisor cannot change is not a draft (X-03). */
async function drawNote(s) {
  const a = chosenArticle(s); if (!a) return;
  const btn = $('arDraft'), box = $('arNote');
  btn.disabled = true;
  try {
    /* No reason where there is none to give: a suggestion matched on a subject line has no
       phrase free of counts and figures, and the endpoint would rather be told nothing than be
       handed something invented. */
    const r = await api('POST', '/articles/' + encodeURIComponent(a.id) + '/note',
      { body: { ...(s.subject ? { reason: s.subject } : {}), tone: $('arTone').value } });
    if (r.refused) { toast(t('The model declined this request.')); return; }
    s.note = r.draft; if (box) box.value = r.draft;
    /* The same provenance line every other model output in this product carries (X-04). */
    s.provenance = r.provenance.live
      ? t('{model} · prompt {version}', { model: r.provenance.model, version: r.provenance.promptVersion })
      : t('Written offline: no model is connected · prompt {version}', { version: r.provenance.promptVersion });
    const prov = $('arProv'); if (prov) prov.textContent = s.provenance;
  } catch (e) { toast(e.message); }
  finally { if ($('arDraft')) $('arDraft').disabled = false; }
}

/* A refusal the advisor can act on. The server answers with a code because the message it
   composes is the platform's own prose and would arrive in English on a French screen. */
const shareError = (e) => e.code === 'article_not_sendable'
    ? t('That article is no longer approved for sending.')
  : e.code === 'article_not_translated'
    ? t('That article is not published in the language you chose.')
  : e.message;

/* One call per household, because that is what the door takes. There is no bulk share
   operation and there should not be: each send is its own record and its own line in the
   activity log, which is what makes "who was sent this" answerable afterwards. */
async function send(s) {
  const a = chosenArticle(s); if (!a) return;
  const go = $('arGo'); go.disabled = true;
  go.textContent = t('Sending…');
  const sent = [], failed = [];
  for (const id of s.chosen) {
    const h = s.households.find(x => x.householdId === id);
    try {
      await api('POST', '/households/' + encodeURIComponent(id) + '/shares',
        { body: { type: 'article', sourceId: a.id, title: a.title, language: s.lang, message: s.note.trim() || undefined } });
      sent.push(h.householdName);
    } catch (e) { failed.push(h.householdName + ' — ' + shareError(e)); }
  }
  receipt(s, a, sent, failed);
}

/* What was actually recorded, in the words a regulator would ask it in: which article, which
   version, in which language, to whom. Shown instead of a toast because a toast that says
   "sent" and disappears is not a receipt for something that cannot be undone. */
function receipt(s, a, sent, failed) {
  /* Reopening is a fresh panel, not a toggle back to this receipt: the panel is keyed on the
     signal, and without this the next press on the same row would only close what is already
     closed. */
  current = null;
  /* The caller that opened this gets told what went, so a strip beside a message can say "sent,
     version 3" on the row the advisor pressed rather than being left to guess or refetch. Told
     after the fact and never asked first: nothing a caller returns can stop or alter a send. */
  if (s.onSent && sent.length) s.onSent({ article: a, language: s.lang, households: sent });
  $('archiBody').innerHTML = `
    <h3 class="ar-h">${esc(!sent.length ? t('Nothing was sent')
      : sent.length === 1 ? t('Sent to 1 household') : t('Sent to {n} households', { n: sent.length }))}</h3>
    ${sent.length ? `<p class="ar-because">${esc(t('{title}, version {v}, in {lang}.', { title: a.title, v: a.version, lang: langName(s.lang) }))}</p>
    <ul class="subrows">${sent.map(n => `<li><span>${esc(n)}</span></li>`).join('')}</ul>` : ''}
    ${failed.length ? `<h3 class="ar-h">${esc(t('Not sent'))}</h3>
      <ul class="subrows">${failed.map(n => `<li><span>${esc(n)}</span></li>`).join('')}</ul>` : ''}
    ${sent.length ? `<p class="hint">${esc(t('Recorded against each household: the article, the version they were given, and that you approved it. A later revision does not change what they received.'))}</p>` : ''}
    <div class="ar-send"><button class="btn" id="arDone">${esc(t('Close'))}</button></div>`;
  $('arDone').onclick = closeArchi;
  if (failed.length && !sent.length) toast(t('Nothing was sent.'));
}
