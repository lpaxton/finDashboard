/* The client portal. Plain language, factual account data only, and nothing internal:
   no briefs, alerts, tasks, signals, notes or another household's anything (X-12). */
import { api } from './api.js';
import { $, esc, moneyFull, pct, pctClass, fmtDate, localDate, SHARE_TYPES } from './format.js';
import { toast, spark, head, panel, load } from './ui.js';

export function clientView() {
  $('view').innerHTML = `<dl class="strip three" id="strip"></dl>
    <div class="grid">
      <div class="col">${panel('c-accounts')}${panel('c-shared')}${panel('c-docs')}</div>
      <div class="col">${panel('c-request')}${panel('c-fees')}${panel('c-prefs')}</div>
    </div>`;

  load($('c-accounts'), 'Your accounts', () => api('GET', '/me/household'), (h) => {
    $('strip').innerHTML = `
      <div class="stat"><dt>Total value</dt><dd><div class="figure">${moneyFull(h.aum)}</div>${spark(h.trend, 'Value over the last 12 months')}</dd></div>
      <div class="stat"><dt>Change in the last 30 days</dt><dd><div class="figure ${pctClass(h.change30d)}">${pct(h.change30d)}</div></dd></div>
      <div class="stat"><dt>Your advisor</dt><dd><div class="figure" style="font-size:24px">${esc(h.advisorName)}</div></dd></div>`;
    return head('Your accounts') + `<ul class="rows">${h.accounts.map(a => `<li><div class="grow"><div class="title">${esc(a.type)}</div><div class="meta">${esc(a.maskedNumber)}</div></div><div style="text-align:right"><div class="title">${moneyFull(a.balance)}</div><div class="meta ${pctClass(a.todayGainLoss)}">${a.todayGainLoss >= 0 ? '+' : ''}${moneyFull(a.todayGainLoss)} today</div></div></li>`).join('')}</ul>`;
  });

  load($('c-shared'), 'From your advisor', () => api('GET', '/me/shared'), (r) => head('From your advisor') + (r.items.length ? `<ul class="rows">${r.items.map(s => `<li><div class="grow"><div class="title">${esc(s.title)}</div><div class="meta">${esc(SHARE_TYPES[s.type])} \u2022 shared by ${esc(s.sharedBy)} on ${esc(fmtDate(localDate(new Date(s.sharedAt))))}</div>${s.message ? `<div style="margin-top:4px">${esc(s.message)}</div>` : ''}</div></li>`).join('')}</ul>` : '<p class="empty">Nothing shared yet. Plans and reports from your advisor will appear here.</p>'));

  load($('c-docs'), 'Documents', () => api('GET', '/me/documents', { query: { size: 10 } }), (r) => head('Documents') + `<ul class="rows">${r.items.map(d => `<li><div class="grow"><div class="title">${esc(d.title)}</div><div class="meta">${esc(fmtDate(d.date))}${d.maskedAccountNumber ? ' \u2022 ' + esc(d.maskedAccountNumber) : ''}</div></div><button class="btn" data-doc="${esc(d.id)}">Download</button></li>`).join('')}</ul>`,
  (el) => el.querySelectorAll('[data-doc]').forEach(b => b.onclick = async () => { try { const r = await api('GET', '/me/documents/' + encodeURIComponent(b.dataset.doc)); toast(r.mockDownload ? 'A download of ' + r.filename + ' would start here.' : 'Download started.'); } catch (e) { toast(e.message); } }));

  load($('c-request'), 'Request a meeting', async () => null, () => head('Request a meeting') + `
    <div class="field"><label for="mrTopic">What would you like to talk about?</label><input type="text" id="mrTopic" placeholder="For example, a change to my retirement date"></div>
    <div class="field"><label for="mrTime">A time that suits you (optional)</label><input type="datetime-local" id="mrTime"></div>
    <div class="field"><label for="mrNote">Anything else we should know (optional)</label><textarea id="mrNote"></textarea></div>
    <button class="btn primary" id="mrGo">Send request</button>`,
  () => { $('mrGo').onclick = async () => {
    const topic = $('mrTopic').value.trim(); if (!topic) { toast('Tell us what you would like to discuss.'); return; }
    const t = $('mrTime').value;
    try { await api('POST', '/me/meeting-requests', { body: { topic, note: $('mrNote').value.trim() || undefined, preferredTimes: t ? [new Date(t).toISOString()] : undefined } }); toast('Request sent. Your advisor will be in touch.'); $('mrTopic').value = ''; $('mrNote').value = ''; $('mrTime').value = ''; }
    catch (e) { toast(e.message); }
  }; });

  load($('c-fees'), 'Fees', () => api('GET', '/me/fees'), (r) => head('Fees') + `<ul class="rows">${r.items.map(f => `<li><div class="grow"><div class="title">${esc(f.description)}</div><div class="meta">${esc(fmtDate(f.periodStart))} to ${esc(fmtDate(f.periodEnd))} \u2022 ${esc(f.maskedAccountNumber)}</div></div><div style="text-align:right"><div class="title">${moneyFull(f.amount)}</div><span class="badge ${f.status === 'paid' ? 'ok' : f.status === 'billed' ? 'warn' : 'plain'}">${esc(f.status)}</span></div></li>`).join('')}</ul>`);

  load($('c-prefs'), 'Preferences', () => api('GET', '/me/preferences'), (p) => head('Preferences') + `
    <div class="field"><div class="checks"><label><input type="checkbox" id="pfPaper" ${p.paperless ? 'checked' : ''}> Send documents electronically only</label></div></div>
    <fieldset class="field"><legend>Tell me about updates by</legend><div class="checks">${[['email', 'Email'], ['sms', 'Text message'], ['portal', 'This portal']].map(([k, l]) => `<label><input type="checkbox" data-ch="${k}" ${p.notificationChannels.includes(k) ? 'checked' : ''}> ${l}</label>`).join('')}</div></fieldset>
    <button class="btn primary" id="pfSave">Save preferences</button>`,
  () => { $('pfSave').onclick = async () => { try { await api('PATCH', '/me/preferences', { body: { paperless: $('pfPaper').checked, notificationChannels: [...document.querySelectorAll('[data-ch]:checked')].map(x => x.dataset.ch) } }); toast('Preferences saved.'); } catch (e) { toast(e.message); } }; });
}
