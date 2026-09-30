/* The client portal. Plain language, factual account data only, and nothing internal:
   no briefs, alerts, tasks, signals, notes or another household's anything (X-12). */
import { api } from './api.js';
import { $, esc, moneyFull, pct, pctClass, fmtDate, localDate, SHARE_TYPES } from './format.js';
import { toast, spark, head, panel, load } from './ui.js';
import { t } from './i18n.js';

/* A fee status is a contract enum, so it is mapped rather than shown raw — 'billed' in a
   French sentence is not a translation, it is a leak. */
const FEE_STATUS_EN = { paid: 'paid', billed: 'billed', accrued: 'accrued' };
const FEE_STATUS = new Proxy(FEE_STATUS_EN, { get: (o, k) => (k in o ? t(o[k]) : undefined) });

export function clientView() {
  $('view').innerHTML = `<dl class="strip three" id="strip"></dl>
    <div class="grid">
      <div class="col">${panel('c-accounts')}${panel('c-shared')}${panel('c-docs')}</div>
      <div class="col">${panel('c-request')}${panel('c-fees')}${panel('c-prefs')}</div>
    </div>`;

  load($('c-accounts'), 'Your accounts', () => api('GET', '/me/household'), (h) => {
    $('strip').innerHTML = `
      <div class="stat"><dt>${esc(t('Total value'))}</dt><dd><div class="figure">${moneyFull(h.aum)}</div>${spark(h.trend, 'Value over the last 12 months')}</dd></div>
      <div class="stat"><dt>${esc(t('Change in the last 30 days'))}</dt><dd><div class="figure ${pctClass(h.change30d)}">${pct(h.change30d)}</div></dd></div>
      <div class="stat"><dt>${esc(t('Your advisor'))}</dt><dd><div class="figure" style="font-size:24px">${esc(h.advisorName)}</div></dd></div>`;
    return head('Your accounts') + `<ul class="rows">${h.accounts.map(a => `<li><div class="grow"><div class="title">${esc(a.type)}</div><div class="meta">${esc(a.maskedNumber)}</div></div><div style="text-align:right"><div class="title">${moneyFull(a.balance)}</div><div class="meta ${pctClass(a.todayGainLoss)}">${a.todayGainLoss >= 0 ? '+' : ''}${moneyFull(a.todayGainLoss)} ${esc(t('today'))}</div></div></li>`).join('')}</ul>`;
  });

  load($('c-shared'), 'From your advisor', () => api('GET', '/me/shared'), (r) => head('From your advisor') + (r.items.length ? `<ul class="rows">${r.items.map(s => `<li><div class="grow"><div class="title">${esc(s.title)}</div><div class="meta">${esc(SHARE_TYPES[s.type])} \u2022 ${esc(t('shared by {who} on {date}', { who: s.sharedBy, date: fmtDate(localDate(new Date(s.sharedAt))) }))}</div>${s.message ? `<div style="margin-top:4px">${esc(s.message)}</div>` : ''}</div></li>`).join('')}</ul>` : `<p class="empty">${esc(t('Nothing shared yet. Plans and reports from your advisor will appear here.'))}</p>`));

  load($('c-docs'), 'Documents', () => api('GET', '/me/documents', { query: { size: 10 } }), (r) => head('Documents') + `<ul class="rows">${r.items.map(d => `<li><div class="grow"><div class="title">${esc(d.title)}</div><div class="meta">${esc(fmtDate(d.date))}${d.maskedAccountNumber ? ' \u2022 ' + esc(d.maskedAccountNumber) : ''}</div></div><button class="btn" data-doc="${esc(d.id)}">${esc(t('Download'))}</button></li>`).join('')}</ul>`,
  (el) => el.querySelectorAll('[data-doc]').forEach(b => b.onclick = async () => { try { const r = await api('GET', '/me/documents/' + encodeURIComponent(b.dataset.doc)); toast(r.mockDownload ? t('A download of {file} would start here.', { file: r.filename }) : t('Download started.')); } catch (e) { toast(e.message); } }));

  load($('c-request'), 'Request a meeting', async () => null, () => head('Request a meeting') + `
    <div class="field"><label for="mrTopic">${esc(t('What would you like to talk about?'))}</label><input type="text" id="mrTopic" placeholder="${esc(t('For example, a change to my retirement date'))}"></div>
    <div class="field"><label for="mrTime">${esc(t('A time that suits you (optional)'))}</label><input type="datetime-local" id="mrTime"></div>
    <div class="field"><label for="mrNote">${esc(t('Anything else we should know (optional)'))}</label><textarea id="mrNote"></textarea></div>
    <button class="btn primary" id="mrGo">${esc(t('Send request'))}</button>`,
  () => { $('mrGo').onclick = async () => {
    const topic = $('mrTopic').value.trim(); if (!topic) { toast('Tell us what you would like to discuss.'); return; }
    const when = $('mrTime').value;
    try { await api('POST', '/me/meeting-requests', { body: { topic, note: $('mrNote').value.trim() || undefined, preferredTimes: when ? [new Date(when).toISOString()] : undefined } }); toast('Request sent. Your advisor will be in touch.'); $('mrTopic').value = ''; $('mrNote').value = ''; $('mrTime').value = ''; }
    catch (e) { toast(e.message); }
  }; });

  load($('c-fees'), 'Fees', () => api('GET', '/me/fees'), (r) => head('Fees') + `<ul class="rows">${r.items.map(f => `<li><div class="grow"><div class="title">${esc(f.description)}</div><div class="meta">${esc(t('{from} to {to}', { from: fmtDate(f.periodStart), to: fmtDate(f.periodEnd) }))} \u2022 ${esc(f.maskedAccountNumber)}</div></div><div style="text-align:right"><div class="title">${moneyFull(f.amount)}</div><span class="badge ${f.status === 'paid' ? 'ok' : f.status === 'billed' ? 'warn' : 'plain'}">${esc(FEE_STATUS[f.status] || f.status)}</span></div></li>`).join('')}</ul>`);

  load($('c-prefs'), 'Preferences', () => api('GET', '/me/preferences'), (p) => head('Preferences') + `
    <div class="field"><div class="checks"><label><input type="checkbox" id="pfPaper" ${p.paperless ? 'checked' : ''}> ${esc(t('Send documents electronically only'))}</label></div></div>
    <fieldset class="field"><legend>${esc(t('Tell me about updates by'))}</legend><div class="checks">${[['email', 'Email'], ['sms', 'Text message'], ['portal', 'This portal']].map(([k, l]) => `<label><input type="checkbox" data-ch="${k}" ${p.notificationChannels.includes(k) ? 'checked' : ''}> ${esc(t(l))}</label>`).join('')}</div></fieldset>
    <button class="btn primary" id="pfSave">${esc(t('Save preferences'))}</button>
    <!-- The portal has no navigation, so this is the client's door to the same Settings panel
         an advisor reaches from the foot of theirs. Language and appearance belong to the
         person reading, and a client reads this portal. -->
    <p class="hint" style="margin-top:14px"><button class="link" data-settings
      aria-expanded="false" aria-controls="setPanel">${esc(t('Language and appearance'))}</button></p>`,
  () => { $('pfSave').onclick = async () => { try { await api('PATCH', '/me/preferences', { body: { paperless: $('pfPaper').checked, notificationChannels: [...document.querySelectorAll('[data-ch]:checked')].map(x => x.dataset.ch) } }); toast('Preferences saved.'); } catch (e) { toast(e.message); } }; });
}
