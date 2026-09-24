/* Pieces shared by every view: panel loading with its error and retry states, toasts,
   sparklines, sortable tables, the alert list, the household dialog and the book table. */
import { api } from './api.js';
import { $, esc, money, moneyFull, pct, pctClass, daysAgo, statusBadge, SHARE_TYPES } from './format.js';

let toastTimer;
export function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600); }

/* Draws nothing rather than a misleading line when the backend sends no history. */
export function spark(trend, label) {
  if (!Array.isArray(trend) || trend.length < 2) return '';
  const v = trend.map(p => p.value), w = 180, h = 34, min = Math.min(...v), max = Math.max(...v);
  const pts = v.map((x, i) => [(i / (v.length - 1)) * w, h - 3 - ((x - min) / (max - min || 1)) * (h - 6)]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' '), last = pts[pts.length - 1];
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}"><path d="${d}" fill="none" stroke="var(--brand)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${last[0]}" cy="${last[1]}" r="3" fill="var(--brand)"/></svg>`;
}

/* Loads a panel with loading, error and retry states. */
export async function load(el, title, loader, render, after) {
  el.innerHTML = `<div class="panel-head"><h2>${esc(title)}</h2></div><div class="skel"></div><div class="skel m"></div><div class="skel s"></div>`;
  try {
    const d = await loader();
    el.innerHTML = render(d);
    if (after) after(el, d);
  } catch (e) {
    const msg = e.status === 403 ? "You don't have access to this section." : (e.message || "Couldn't load this section.");
    el.innerHTML = `<div class="panel-head"><h2>${esc(title)}</h2></div><div class="err"><span>${esc(msg)}</span>${e.status === 403 ? '' : '<button class="btn" data-retry>Try again</button>'}</div>`;
    const r = el.querySelector('[data-retry]'); if (r) r.onclick = () => load(el, title, loader, render, after);
  }
}
export const head = (title, hint = '') => `<div class="panel-head"><h2>${esc(title)}</h2>${hint ? `<span class="hint">${esc(hint)}</span>` : ''}</div>`;
export const panel = (id, extra = '') => `<section class="panel ${extra}" id="${id}"></section>`;

export function sortTable(cols, sort, rowsHtml) {
  const [sk, sd] = sort.split(',');
  return `<div class="tablewrap"><table><thead><tr>${cols.map(c => `<th class="${c.num ? 'num' : ''}" scope="col">${c.key && !c.nosort ? `<button data-sort="${c.key}" aria-sort="${sk === c.key ? (sd === 'asc' ? 'ascending' : 'descending') : 'none'}">${esc(c.label)}</button>` : esc(c.label)}</th>`).join('')}</tr></thead><tbody>${rowsHtml}</tbody></table></div>`;
}
export const nextSort = (cur, key, textFirst) => { const [k, d] = cur.split(','); return k === key ? key + ',' + (d === 'asc' ? 'desc' : 'asc') : key + ',' + (textFirst ? 'asc' : 'desc'); };

export function alertsList(list, { dismiss, showAdvisor } = {}) {
  if (!list.length) return '<p class="empty">Nothing needs your attention right now.</p>';
  return `<ul class="rows">${list.map(a => `<li><span class="sev ${esc(a.severity)}" title="${esc(a.severity)} priority"></span>
    <div class="grow"><div class="title">${esc(a.title)}</div><div class="meta">${esc(a.householdName || 'Practice')} \u2022 ${esc(a.source)}</div></div>
    ${dismiss ? `<div class="actions"><button class="btn" data-alert-action="${esc(a.action.label)}">${esc(a.action.label)}</button><button class="btn quiet" data-dismiss="${esc(a.id)}" aria-label="Dismiss: ${esc(a.title)}">Dismiss</button></div>` : ''}</li>`).join('')}</ul>`;
}

export async function openHousehold(id, canShare) {
  const dlg = $('dlg');
  dlg.innerHTML = '<p class="empty">Loading\u2026</p>'; dlg.showModal();
  try {
    const h = await api('GET', '/households/' + encodeURIComponent(id));
    dlg.innerHTML = `<button class="btn quiet close" data-close>Close</button><h2 id="dlgTitle">${esc(h.name)}</h2>
      <div>${statusBadge(h.status)}</div>
      <dl class="defs"><dt>Assets</dt><dd>${moneyFull(h.aum)}</dd><dt>30-day change</dt><dd class="${pctClass(h.change30d)}">${pct(h.change30d)}</dd><dt>Last contact</dt><dd>${esc(daysAgo(h.lastContactAt))}</dd></dl>
      <h3>Accounts</h3>
      <div class="tablewrap"><table><thead><tr><th>Account</th><th>Type</th><th class="num">Balance</th><th class="num">Today</th><th>Opening</th></tr></thead><tbody>
      ${h.accounts.map(a => `<tr><td>${esc(a.maskedNumber)}</td><td>${esc(a.type)}</td><td class="num">${moneyFull(a.balance)}</td><td class="num ${pctClass(a.todayGainLoss)}">${moneyFull(a.todayGainLoss)}</td><td>${esc((a.openingStatus || '').toUpperCase())}</td></tr>`).join('')}</tbody></table></div>
      ${canShare ? `<h3>Share with client</h3>
      <p class="hint" style="margin:0 0 10px">Clients see only what an advisor approves here. Briefs, alerts, notes and tasks are never shared.</p>
      <div class="field"><label for="shType">Type</label><select id="shType">${Object.entries(SHARE_TYPES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
      <div class="field"><label for="shTitle">Title shown to the client</label><input type="text" id="shTitle" placeholder="For example, Your retirement plan summary"></div>
      <div class="field"><label for="shMsg">Message (optional)</label><textarea id="shMsg"></textarea></div>
      <button class="btn primary" id="shGo">Approve and share</button>` : ''}`;
    const go = $('shGo');
    if (go) go.onclick = async () => {
      const title = $('shTitle').value.trim(); if (!title) { toast('Add a title first.'); return; }
      go.disabled = true;
      try { await api('POST', '/households/' + encodeURIComponent(id) + '/shares', { body: { type: $('shType').value, sourceId: 'draft-' + Date.now(), title, message: $('shMsg').value.trim() || undefined } }); toast('Shared with the client.'); dlg.close(); }
      catch (e) { toast(e.message); go.disabled = false; }
    };
  } catch (e) { dlg.innerHTML = `<button class="btn quiet close" data-close>Close</button><p class="err">${esc(e.message)}</p>`; }
}

/* Book / households table: sorting and paging are done by the API. */
export function bookPanel({ scope, canShare, id, title, size = 8 }) {
  const el = $(id), st = { sort: 'aum,desc', page: 0 };
  const cols = [{ key: 'name', label: 'Household' }, { key: 'aum', label: 'Assets', num: true }, { key: 'change30d', label: '30-day change', num: true }, { key: 'lastContactAt', label: 'Last contact' }, { key: 'status', label: 'Status' }];
  const run = () => load(el, title, () => api('GET', '/households', { query: { scope: scope === 'firm' ? 'firm' : undefined, sort: st.sort, page: st.page, size } }), (r) => {
    const pages = Math.max(1, Math.ceil(r.totalItems / r.size));
    return head(title, r.totalItems + ' households') + sortTable(cols, st.sort, r.items.map(h => `<tr><td><button class="link" data-hh="${esc(h.id)}">${esc(h.name)}</button></td><td class="num">${money(h.aum)}</td><td class="num ${pctClass(h.change30d)}">${pct(h.change30d)}</td><td>${esc(daysAgo(h.lastContactAt))}</td><td>${statusBadge(h.status)}</td></tr>`).join(''))
      + `<div class="pager"><span>Page ${r.page + 1} of ${pages}</span><button class="btn" data-pg="-1" ${r.page === 0 ? 'disabled' : ''}>Previous</button><button class="btn" data-pg="1" ${r.page + 1 >= pages ? 'disabled' : ''}>Next</button></div>`;
  }, (e) => {
    e.querySelectorAll('[data-sort]').forEach(b => b.onclick = () => { st.sort = nextSort(st.sort, b.dataset.sort, b.dataset.sort === 'name'); st.page = 0; run(); });
    e.querySelectorAll('[data-pg]').forEach(b => b.onclick = () => { st.page += +b.dataset.pg; run(); });
    e.querySelectorAll('[data-hh]').forEach(b => b.onclick = () => openHousehold(b.dataset.hh, canShare));
  });
  run();
}


/* A section switcher inside a view. The role switcher above it stays the top level. */

export function subnav(el, items, active, go) {
  el.innerHTML = items.map(([k, label]) => `<button role="tab" data-sec="${esc(k)}" aria-selected="${k === active}">${esc(label)}</button>`).join('');
  el.querySelectorAll('[data-sec]').forEach(b => b.onclick = () => go(b.dataset.sec));
}
