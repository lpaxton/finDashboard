/* Pieces shared by every view: panel loading with its error and retry states, toasts,
   sparklines, sortable tables, the alert list, the household dialog and the book table. */
import { api } from './api.js';
import { $, esc, money, moneyFull, pct, pctClass, daysAgo, fmtTime, statusBadge, SHARE_TYPES, sourceLine, sourceKind } from './format.js';
import { isSnoozed, snoozedUntil } from './viewstate.js';
/* head(), load() and toast() translate what they are given, which is how every panel heading,
   hint and confirmation in the dashboard is localised without touching each call site. A title
   that is really data — a person's name, a household's — is passed through raw(). */
import { t, raw, locale, setLang } from './i18n.js';
/* SHARE_TYPES reads through t(), so Object.entries on it would translate the keys too. The
   keys are contract values and must stay as they are. */
const SHARE_TYPE_KEYS = { plan: 1, tax_explanation: 1, report: 1, proposal: 1, message: 1, document: 1 };
import { isOpen, setOpen } from './viewstate.js';

let toastTimer;
/* A toast can carry one way back. Undo wherever undo is possible (UX_RULES TR-07), and an undo
   the advisor cannot reach in time is not an undo, so a toast with an action waits longer and
   accepts a click. */
export function toast(msg, action) {
  const el = $('toast');
  el.textContent = t(msg);
  el.classList.toggle('actionable', !!action);
  if (action) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'toast-action'; b.textContent = t(action.label);
    b.onclick = () => { el.classList.remove('show'); clearTimeout(toastTimer); action.run(); };
    el.append(b);
  }
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), action ? 9000 : 2600);
}

/* Draws nothing rather than a misleading line when the backend sends no history. */
export function spark(trend, label) {
  if (!Array.isArray(trend) || trend.length < 2) return '';
  const v = trend.map(p => p.value), w = 180, h = 34, min = Math.min(...v), max = Math.max(...v);
  const pts = v.map((x, i) => [(i / (v.length - 1)) * w, h - 3 - ((x - min) / (max - min || 1)) * (h - 6)]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' '), last = pts[pts.length - 1];
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(t(label))}"><path d="${d}" fill="none" stroke="var(--brand)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${last[0]}" cy="${last[1]}" r="3" fill="var(--brand)"/></svg>`;
}

/* Loads a panel with loading, error and retry states. */
export async function load(el, title, loader, render, after) {
  el.innerHTML = `<div class="panel-head"><h2>${esc(t(title))}</h2></div><div class="skel"></div><div class="skel m"></div><div class="skel s"></div>`;
  try {
    const d = await loader();
    el.innerHTML = render(d);
    if (after) after(el, d);
  } catch (e) {
    const msg = e.status === 403 ? t("You don't have access to this section.") : (e.message || t("Couldn't load this section."));
    el.innerHTML = `<div class="panel-head"><h2>${esc(t(title))}</h2></div><div class="err"><span>${esc(msg)}</span>${e.status === 403 ? '' : `<button class="btn" data-retry>${esc(t('Try again'))}</button>`}</div>`;
    const r = el.querySelector('[data-retry]'); if (r) r.onclick = () => load(el, title, loader, render, after);
  }
}
export const head = (title, hint = '') => `<div class="panel-head"><h2>${esc(t(title))}</h2>${hint ? `<span class="hint">${esc(t(hint))}</span>` : ''}</div>`;
export const panel = (id, extra = '') => `<section class="panel ${extra}" id="${id}"></section>`;

/* Opening and closing, with somewhere to put the motion.
   <details>/<summary> cannot be transitioned and cannot remember that it was open, and
   UX_RULES asks for both: FO-08 (motion explains where things went) and ST-07 (what the
   advisor opens, stays open). One component, so the prep brief, a signal's detail and a role
   card's top three all behave the same way (ST-06).

   `id` is namespaced by the caller ("brief:m3") because it is also the view-state key. */
export function disclosure(id, label, { openLabel = label, body = '', cls = '' } = {}) {
  const dom = 'disc-' + id.replace(/[^a-z0-9]+/gi, '-');
  return `<div class="disc ${cls}" data-disc="${esc(id)}" data-open="false" data-label="${esc(label)}" data-open-label="${esc(openLabel)}">
    <button class="btn disc-toggle" type="button" aria-expanded="false" aria-controls="${dom}">${esc(label)}</button>
    <div class="disc-panel" id="${dom}"><div class="disc-inner">${body}</div></div>
  </div>`;
}

/* Wires every disclosure inside `el`, and puts back the ones the advisor had open.
   `onOpen(id, inner)` is called the first time each one opens, for content that is fetched
   rather than rendered up front; it is awaited, so it can load. */
export function wireDisclosures(el, onOpen) {
  el.querySelectorAll('[data-disc]').forEach(d => {
    const btn = d.querySelector('.disc-toggle'), inner = d.querySelector('.disc-inner');
    const show = async (on, animate = true) => {
      if (!animate) d.setAttribute('data-restoring', '');
      d.dataset.open = String(on);
      btn.setAttribute('aria-expanded', String(on));
      btn.textContent = on ? d.dataset.openLabel : d.dataset.label;
      if (!animate) requestAnimationFrame(() => d.removeAttribute('data-restoring'));
      if (on && onOpen && !d.dataset.loaded) { d.dataset.loaded = '1'; await onOpen(d.dataset.disc, inner, d); }
    };
    btn.onclick = () => { const on = d.dataset.open !== 'true'; setOpen(d.dataset.disc, on); show(on); };
    if (isOpen(d.dataset.disc)) show(true, false);
  });
}

export function sortTable(cols, sort, rowsHtml) {
  const [sk, sd] = sort.split(',');
  return `<div class="tablewrap"><table><thead><tr>${cols.map(c => `<th class="${c.num ? 'num' : ''}" scope="col">${c.key && !c.nosort ? `<button data-sort="${c.key}" aria-sort="${sk === c.key ? (sd === 'asc' ? 'ascending' : 'descending') : 'none'}">${esc(t(c.label))}</button>` : esc(t(c.label))}</th>`).join('')}</tr></thead><tbody>${rowsHtml}</tbody></table></div>`;
}
export const nextSort = (cur, key, textFirst) => { const [k, d] = cur.split(','); return k === key ? key + ',' + (d === 'asc' ? 'desc' : 'asc') : key + ',' + (textFirst ? 'asc' : 'desc'); };

/* One word, one meaning (UX_RULES ST-06). The contract gives every alert an action.label, but
   those labels are named from the system's side: "Review" arrives on a margin call, a cash
   balance and a restricted account, and means something different each time. The screen names
   an action for what pressing it will do.

   An action the platform cannot actually perform is not offered (UX-004): draft_email and
   send_reminder have no operation in the contract, so they are absent rather than a button
   that apologises. Both are logged in docs/design.md. */
export const ALERT_ACTIONS = {
  review: 'Open the household',
  open_queue: 'Open the approval queue'
};

/* Not now, and the advisor picks when (UX_RULES CS-05). */
export const SNOOZE_CHOICES = [
  ['later', 'Later today', () => new Date(Date.now() + 4 * 36e5)],
  ['tomorrow', 'Tomorrow morning', () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d; }],
  ['week', 'Next week', () => { const d = new Date(); d.setDate(d.getDate() + 7); d.setHours(9, 0, 0, 0); return d; }]
];
const untilWords = (iso) => {
  const d = new Date(iso), now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString(locale(), { hour: 'numeric', minute: '2-digit' });
  if (sameDay) return t('until {when}', { when: time });
  const tm = new Date(now); tm.setDate(tm.getDate() + 1);
  if (d.toDateString() === tm.toDateString()) return t('until tomorrow');
  return t('until {when}', { when: d.toLocaleDateString(locale(), { weekday: 'long', month: 'short', day: 'numeric' }) });
};

export function alertsList(list, { dismiss, showAdvisor } = {}) {
  const hidden = dismiss ? list.filter(a => isSnoozed(a.id)) : [];
  const shown = dismiss ? list.filter(a => !isSnoozed(a.id)) : list;
  const setAside = hidden.length
    ? `<p class="hint set-aside">${hidden.length === 1
        ? esc(t('One alert is set aside {until}.', { until: untilWords(snoozedUntil(hidden[0].id)) })) + ` <button class="link" data-unsnooze-all>${esc(t('Bring it back'))}</button>`
        : esc(t('{n} alerts are set aside.', { n: hidden.length })) + ` <button class="link" data-unsnooze-all>${esc(t('Bring them back'))}</button>`}</p>`
    : '';
  if (!shown.length) return `<p class="empty">${esc(t('Nothing needs your attention right now.'))}</p>` + setAside;
  return `<ul class="rows">${shown.map(a => {
    const label = ALERT_ACTIONS[a.action && a.action.type];
    return `<li data-alert="${esc(a.id)}"><span class="sev ${esc(a.severity)}" title="${esc(a.severity)} priority"></span>
    <div class="grow"><div class="title">${esc(a.title)}</div>
      <div class="meta">${esc(a.householdName || t('Practice'))}${showAdvisor && a.advisorName ? ' \u2022 ' + esc(a.advisorName) : ''}</div>
      <div class="source">${esc(sourceLine(a.source, a.createdAt))}</div></div>
    ${dismiss ? `<div class="actions">
      ${label ? `<button class="btn" data-alert-action="${esc(a.action.type)}" data-target="${esc(a.action.targetId || '')}">${esc(t(label))}</button>` : ''}
      <button class="btn quiet" data-notnow="${esc(a.id)}" aria-label="${esc(t('Not now: {what}', { what: a.title }))}">${esc(t('Not now'))}</button>
      <button class="btn quiet" data-dismiss="${esc(a.id)}" aria-label="${esc(t('Dismiss: {what}', { what: a.title }))}">${esc(t('Dismiss'))}</button></div>` : ''}</li>`;
  }).join('')}</ul>` + setAside;
}

/* The three times, offered in place of the row's actions so the choice stays where it was made. */
export const snoozeChoices = (id) => `<div class="actions notnow" role="group" aria-label="${esc(t('Bring this back'))}">
  <span class="meta">${esc(t('Bring back'))}</span>
  ${SNOOZE_CHOICES.map(([k, label]) => `<button class="btn" data-snooze="${esc(id)}" data-when="${k}">${esc(t(label))}</button>`).join('')}
  <button class="btn quiet" data-snooze-cancel>${esc(t('Keep it here'))}</button></div>`;

export async function openHousehold(id, canShare) {
  const dlg = $('dlg');
  dlg.innerHTML = `<p class="empty">${esc(t('Loading\u2026'))}</p>`; dlg.showModal();
  try {
    const h = await api('GET', '/households/' + encodeURIComponent(id));
    dlg.innerHTML = `<button class="btn quiet close" data-close>${esc(t('Close'))}</button><h2 id="dlgTitle">${esc(h.name)}</h2>
      <div>${statusBadge(h.status)}</div>
      <dl class="defs"><dt>${esc(t('Assets'))}</dt><dd>${moneyFull(h.aum)}</dd><dt>${esc(t('30-day change'))}</dt><dd class="${pctClass(h.change30d)}">${pct(h.change30d)}</dd><dt>${esc(t('Last contact'))}</dt><dd>${esc(daysAgo(h.lastContactAt))}</dd></dl>
      <div class="actions" style="margin:2px 0 14px"><button class="btn" id="hhAsk">${esc(t('Ask about this household'))}</button>
        ${canShare ? `<button class="btn" id="hhTeam">${esc(t('Share with a colleague'))}</button><button class="btn" id="hhFee">${esc(t('Change fee'))}</button><button class="btn" id="hhModel">${esc(t('Compare models'))}</button>` : ''}</div>
      <div id="hhPanel"></div>
      <h3>${esc(t('Allocation'))}</h3>
      <div id="hhAlloc"><div class="skel"></div></div>
      <h3>${esc(t('Accounts'))}</h3>
      <div class="tablewrap"><table><thead><tr><th>${esc(t('Account'))}</th><th>${esc(t('Type'))}</th><th class="num">${esc(t('Balance'))}</th><th class="num">${esc(t('Today'))}</th><th>${esc(t('Opening'))}</th></tr></thead><tbody>
      ${h.accounts.map(a => `<tr><td>${esc(a.maskedNumber)}</td><td>${esc(a.type)}</td><td class="num">${moneyFull(a.balance)}</td><td class="num ${pctClass(a.todayGainLoss)}">${moneyFull(a.todayGainLoss)}</td><td>${esc((a.openingStatus || '').toUpperCase())}</td></tr>`).join('')}</tbody></table></div>
      ${canShare ? `<h3>${esc(t('Share with client'))}</h3>
      <p class="hint" style="margin:0 0 10px">${esc(t('Clients see only what an advisor approves here. Briefs, alerts, notes and tasks are never shared.'))}</p>
      <div class="field"><label for="shType">${esc(t('Type'))}</label><select id="shType">${Object.keys(SHARE_TYPE_KEYS).map(k => `<option value="${k}">${esc(SHARE_TYPES[k])}</option>`).join('')}</select></div>
      <div class="field"><label for="shTitle">${esc(t('Title shown to the client'))}</label><input type="text" id="shTitle" placeholder="${esc(t('For example, Your retirement plan summary'))}"></div>
      <div class="field"><label for="shMsg">${esc(t('Message (optional)'))}</label><textarea id="shMsg"></textarea></div>
      <button class="btn primary" id="shGo">${esc(t('Approve and share'))}</button>` : ''}`;
    loadAllocation(id);
    setAskContext('household', id, h.name);
    const ask = $('hhAsk');
    if (ask) ask.onclick = () => openAsk(false);
    const panelEl = () => $('hhPanel');
    const team = $('hhTeam'); if (team) team.onclick = () => teamSharePanel(panelEl(), h);
    const fee = $('hhFee'); if (fee) fee.onclick = () => feePanel(panelEl(), h);
    const mdl = $('hhModel'); if (mdl) mdl.onclick = () => modelPanel(panelEl(), h);
    const go = $('shGo');
    if (go) go.onclick = async () => {
      const title = $('shTitle').value.trim(); if (!title) { toast('Add a title first.'); return; }
      go.disabled = true;
      try { await api('POST', '/households/' + encodeURIComponent(id) + '/shares', { body: { type: $('shType').value, sourceId: 'draft-' + Date.now(), title, message: $('shMsg').value.trim() || undefined } }); toast('Shared with the client.'); dlg.close(); }
      catch (e) { toast(e.message); go.disabled = false; }
    };
  } catch (e) { dlg.innerHTML = `<button class="btn quiet close" data-close>${esc(t('Close'))}</button><p class="err">${esc(e.message)}</p>`; }
}

/* Book / households table: sorting and paging are done by the API. */
/* `advisorId` narrows firm scope to one advisor's book (PO-06). It is only ever sent with
   scope: 'firm', which is what the contract requires, and reaching it is a supervisory act the
   advisor is told about — so nothing calls this with an advisorId except a deliberate press. */
export function bookPanel({ scope, canShare, id, title, size = 8, advisorId = null }) {
  const el = $(id), st = { sort: 'aum,desc', page: 0 };
  const cols = [{ key: 'name', label: 'Household' }, { key: 'aum', label: 'Assets', num: true }, { key: 'change30d', label: '30-day change', num: true }, { key: 'lastContactAt', label: 'Last contact' }, { key: 'status', label: 'Status' }];
  const run = () => load(el, title, () => api('GET', '/households', { query: { scope: scope === 'firm' ? 'firm' : undefined, advisorId: advisorId || undefined, sort: st.sort, page: st.page, size } }), (r) => {
    const pages = Math.max(1, Math.ceil(r.totalItems / r.size));
    return head(title, raw(t('{n} households', { n: r.totalItems }))) + sortTable(cols, st.sort, r.items.map(h => `<tr><td><button class="link" data-hh="${esc(h.id)}">${esc(h.name)}</button></td><td class="num">${money(h.aum)}</td><td class="num ${pctClass(h.change30d)}">${pct(h.change30d)}</td><td>${esc(daysAgo(h.lastContactAt))}</td><td>${statusBadge(h.status)}</td></tr>`).join(''))
      + `<div class="pager"><span>${esc(t('Page {n} of {total}', { n: r.page + 1, total: pages }))}</span><button class="btn" data-pg="-1" ${r.page === 0 ? 'disabled' : ''}>${esc(t('Previous'))}</button><button class="btn" data-pg="1" ${r.page + 1 >= pages ? 'disabled' : ''}>${esc(t('Next'))}</button></div>`;
  }, (e) => {
    e.querySelectorAll('[data-sort]').forEach(b => b.onclick = () => { st.sort = nextSort(st.sort, b.dataset.sort, b.dataset.sort === 'name'); st.page = 0; run(); });
    e.querySelectorAll('[data-pg]').forEach(b => b.onclick = () => { st.page += +b.dataset.pg; run(); });
    e.querySelectorAll('[data-hh]').forEach(b => b.onclick = () => openHousehold(b.dataset.hh, canShare));
  });
  run();
}


/* A section switcher inside a view. The role switcher above it stays the top level.
   A rail on the left at full width; below 860px it collapses to a toggle that names the
   section you are in, so the current position is still readable with the list closed. */

/* On the smallest screens the nav belongs above the page title rather than below the summary:
   on a phone you want to move before you read. CSS order cannot do this, because the nav and
   the header sit in different containers, so the element itself is relocated between two mount
   points. One listener, registered once. */
const NARROW = typeof matchMedia === 'function' ? matchMedia('(max-width: 620px)') : null;

function placeNav(el) {
  const top = document.getElementById('navtop');
  const rail = document.getElementById('navrail');
  const target = NARROW && NARROW.matches ? top : rail;
  if (target && el.parentElement !== target) target.appendChild(el);
}

if (NARROW) {
  NARROW.addEventListener('change', () => {
    document.querySelectorAll('.subnav').forEach(placeNav);
  });
}

/* The advisor's navigation spine (UX_IA §2). Grouped rather than flat, because the four roles
   are part of the frame rather than a list of places (ST-01, ST-02): the same four marks, in
   the same order, appear here and on Today's cards. The order is fixed — growth first, so a
   busy client day never pushes it down (CS-01) — and the spine never reorders, whatever Today
   does.

   `groups` is [{ label, items: [[key, text, mark?]] }]. A group with no label draws no heading. */
export function spine(el, groups, active, go) {
  document.querySelectorAll('.subnav').forEach(n => { if (n !== el) n.remove(); });
  const listId = el.id + '-list';
  const flat = groups.flatMap(g => g.items);
  const current = t((flat.find(([k]) => k === active) || [])[1] || 'Sections');
  el.innerHTML = `
    <button class="subnav-toggle" aria-expanded="false" aria-controls="${esc(listId)}">
      <span class="bars" aria-hidden="true"></span><span class="subnav-current">${esc(current)}</span>
    </button>
    <div class="subnav-list spine-list" id="${esc(listId)}">
      ${groups.map(g => `${g.label ? `<h2 class="spine-group">${esc(t(g.label))}</h2>` : ''}
        <div role="tablist" aria-orientation="vertical"${g.label ? ` aria-label="${esc(t(g.label))}"` : ''}>
        ${g.items.map(([k, text, mark]) => `<button role="tab" data-sec="${esc(k)}" aria-selected="${k === active}">
          ${mark ? roleMark(mark, k.replace(/^role:/, '')) : ''}<span>${esc(t(text))}</span></button>`).join('')}
        </div>`).join('')}
    </div>`;
  placeNav(el);
  const toggle = el.querySelector('.subnav-toggle');
  const close = () => { el.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); };
  toggle.onclick = () => toggle.setAttribute('aria-expanded', String(el.classList.toggle('open')));
  el.querySelectorAll('[data-sec]').forEach(b => b.onclick = () => { close(); go(b.dataset.sec); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  document.addEventListener('click', (e) => { if (!el.contains(e.target)) close(); });
}

/* Two letters on the role's gradient. Colour is never the only signal (UX_DESIGN_SYSTEM §5). */
export const roleMark = (mark, role) => `<span class="rolemark role-${esc(role)}" aria-hidden="true">${esc(mark)}</span>`;

/* Tabs inside a role home. One level below the spine and no deeper (FO-07). */
export function roleTabs(el, tabs, active, go) {
  el.innerHTML = `<div class="tabrow" role="tablist">${tabs.map(([k, label]) =>
    `<button role="tab" data-tab="${esc(k)}" aria-selected="${k === active}">${esc(t(label))}</button>`).join('')}</div>`;
  el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => go(b.dataset.tab));
}

export function subnav(el, items, active, go) {
  // When the nav is relocated to #navtop it sits outside #view, so replacing the view does not
  // remove it. Clear any nav that is not this one, or switching views stacks two hamburgers.
  document.querySelectorAll('.subnav').forEach(n => { if (n !== el) n.remove(); });

  const listId = el.id + '-list';
  const current = t((items.find(([k]) => k === active) || [])[1] || 'Sections');
  el.innerHTML = `
    <button class="subnav-toggle" aria-expanded="false" aria-controls="${esc(listId)}">
      <span class="bars" aria-hidden="true"></span><span class="subnav-current">${esc(current)}</span>
    </button>
    <div class="subnav-list" id="${esc(listId)}" role="tablist" aria-orientation="vertical">
      ${items.map(([k, label]) => `<button role="tab" data-sec="${esc(k)}" aria-selected="${k === active}">${esc(t(label))}</button>`).join('')}
    </div>`;

  placeNav(el);

  const toggle = el.querySelector('.subnav-toggle');
  const close = () => { el.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); };
  toggle.onclick = () => {
    const open = el.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  };
  el.querySelectorAll('[data-sec]').forEach(b => b.onclick = () => { close(); go(b.dataset.sec); });

  // Escape closes it, and so does a click anywhere else: an open menu should not trap you.
  el.onkeydown = (e) => { if (e.key === 'Escape' && el.classList.contains('open')) { close(); toggle.focus(); } };
  // subnav() re-runs on every section change, so the outside-click handler is registered once
  // per element and reads the element fresh. Adding one per call would leak a listener a click.
  if (!el.dataset.outsideBound) {
    el.dataset.outsideBound = '1';
    document.addEventListener('click', (e) => {
      if (!el.isConnected) return;
      if (!el.contains(e.target)) {
        el.classList.remove('open');
        const t = el.querySelector('.subnav-toggle');
        if (t) t.setAttribute('aria-expanded', 'false');
      }
    });
  }
}

/* Target against current, per asset class. The drift threshold belongs to the household's
   model rather than to us, so it is shown when Green Meadows supplies it and left out when
   it does not, instead of falling back to an invented number. */
async function loadAllocation(id) {
  const el = $('hhAlloc');
  if (!el) return;
  try {
    const a = await api('GET', '/households/' + encodeURIComponent(id) + '/allocation');
    if (a.priced === false) {
      el.innerHTML = `<p class="hint">${esc(a.unavailableReason || t('Allocation is unavailable.'))}</p>`;
      return;
    }
    if (!a.model) {
      el.innerHTML = `<p class="hint">${esc(t('No model portfolio on file for this household, so there is no target to compare against.'))}</p>`;
      return;
    }
    const limit = a.driftThresholdPoints ?? null;
    const over = limit !== null && a.maxDriftPoints > limit;
    el.innerHTML = `
      <div class="meta" style="margin-bottom:10px">${esc(a.model.name)} \u2022 ${esc(t('largest drift'))}
        <strong class="${over ? 'due-hot' : ''}">${esc(t('{n} points', { n: a.maxDriftPoints }))}</strong>${limit !== null ? ' ' + esc(t('against a {n}-point limit', { n: limit })) : ''}</div>
      <ul class="alloc">${a.lines.map(l => {
        const scale = Math.max(...a.lines.map(x => Math.max(x.targetPct, x.currentPct)));
        return `<li>
          <span class="alloc-label">${esc(l.assetClass)}</span>
          <span class="alloc-bars" role="img" aria-label="${esc(t('{class}: target {target}%, current {current}%', { class: l.assetClass, target: l.targetPct, current: l.currentPct }))}">
            <span class="alloc-target" style="width:${(l.targetPct / scale) * 100}%"></span>
            <span class="alloc-current ${Math.abs(l.driftPct) >= (limit ?? Infinity) ? 'hot' : ''}" style="width:${(l.currentPct / scale) * 100}%"></span>
          </span>
          <span class="alloc-nums">${l.currentPct}% <span class="meta">${esc(t('of {n}%', { n: l.targetPct }))}</span></span>
          <span class="alloc-drift ${l.driftPct > 0 ? 'up' : l.driftPct < 0 ? 'neg' : ''}">${l.driftPct > 0 ? '+' : ''}${l.driftPct}</span>
        </li>`;
      }).join('')}</ul>
      ${a.unclassifiedPct ? `<p class="hint">${esc(t('{n}% of holdings are not in the model and could not be classified.', { n: a.unclassifiedPct }))}</p>` : ''}`;
  } catch (e) {
    el.innerHTML = `<p class="hint">${esc(e.status === 404 ? t('No allocation for this household.') : e.message)}</p>`;
  }
}

/* ---- the query surface --------------------------------------------------------------
 * One affordance, seeded by wherever it is opened from: inside a household it scopes to
 * that household, from a view it scopes to the book, and a principal can widen to the firm.
 * See docs/query-surface.md for why this shape rather than a global bar or its own section.
 */
let askScope = { scope: 'own', householdId: null, label: 'your book' };

export function setAskContext(scope, householdId, label) {
  askScope = { scope, householdId, label };
}

/* Ask opens beside the screen, never over it (UX_IA §5, FO-06): the advisor can read what they
   were looking at while they ask about it. It keeps its conversation as they move between
   screens, and it stays in the same place on every one of them (ST-01). */
export function openAsk(canFirm) {
  const p = $('askPanel');
  if (p.classList.contains('open')) { closeAsk(); return; }
  p.innerHTML = `<div class="side-head"><h2 id="askTitle">${esc(t('Ask'))}</h2>
      <button class="btn quiet" id="askClose" aria-label="${esc(t('Close Ask'))}">${esc(t('Close'))}</button></div>
    <div class="side-body">
      <p class="meta">${esc(t('Answering across {scope}', { scope: askScope.label }))}</p>
      <div class="field"><label for="askQ">${esc(t('What do you want to know?'))}</label>
        <input type="text" id="askQ" placeholder="${esc(t('For example, which clients are holding cash above target?'))}" autocomplete="off"></div>
      ${canFirm && askScope.scope !== 'household' ? `<label class="hint"><input type="checkbox" id="askFirm"> ${esc(t('Ask across the whole firm'))}</label>` : ''}
      <div class="actions" style="margin-top:10px"><button class="btn primary" id="askGo">${esc(t('Ask'))}</button></div>
      <div id="askOut">${askLast || ''}</div>
      <div id="askPast"></div>
    </div>`;
  p.hidden = false;
  requestAnimationFrame(() => p.classList.add('open'));
  document.body.classList.add('side-open');
  $('askBtn').setAttribute('aria-expanded', 'true');
  loadAskHistory();
  const q = $('askQ');
  q.focus();
  $('askClose').onclick = closeAsk;
  const go = async () => {
    const question = q.value.trim();
    if (!question) { toast('Type a question first.'); return; }
    const btn = $('askGo'); btn.disabled = true;
    $('askOut').innerHTML = '<div class="skel"></div><div class="skel s"></div>';
    try {
      const firm = $('askFirm') && $('askFirm').checked;
      const r = await api('POST', '/queries', { body: {
        question,
        scope: firm ? 'firm' : askScope.scope,
        householdId: askScope.scope === 'household' ? askScope.householdId : undefined
      } });
      askLast = renderAnswer(r);
      $('askOut').innerHTML = askLast;
      loadAskHistory();
    } catch (e) { $('askOut').innerHTML = `<p class="err">${esc(e.message)}</p>`; }
    finally { btn.disabled = false; }
  };
  $('askGo').onclick = go;
  q.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } };
}

/* The conversation survives moving between screens (UX_IA §5). */
let askLast = '';
export function closeAsk() {
  const p = $('askPanel');
  if (!p || !p.classList.contains('open')) { if (p) p.hidden = true; return; }
  p.classList.remove('open');
  document.body.classList.remove('side-open');
  $('askBtn').setAttribute('aria-expanded', 'false');
  $('askBtn').focus();
  setTimeout(() => { if (!p.classList.contains('open')) p.hidden = true; }, 240);
}

/* Activity: one log, always in the same place, top right (TR-03, ST-01). It doubles as
   history: an entry that can still be stepped back says so and offers it (TR-07). */
export async function openActivity() {
  const p = $('actPanel');
  if (p.classList.contains('open')) { closeActivity(); return; }
  p.innerHTML = `<div class="side-head"><h2 id="actTitle">${esc(t('Activity'))}</h2>
      <button class="btn quiet" id="actClose" aria-label="${esc(t('Close activity'))}">${esc(t('Close'))}</button></div>
    <div class="side-body" id="actBody"><div class="skel"></div><div class="skel m"></div><div class="skel s"></div></div>`;
  p.hidden = false;
  requestAnimationFrame(() => p.classList.add('open'));
  document.body.classList.add('side-open');
  $('actBtn').setAttribute('aria-expanded', 'true');
  $('actClose').onclick = closeActivity;
  loadActivity();
}
export function closeActivity() {
  const p = $('actPanel');
  if (!p || !p.classList.contains('open')) { if (p) p.hidden = true; return; }
  p.classList.remove('open');
  document.body.classList.remove('side-open');
  $('actBtn').setAttribute('aria-expanded', 'false');
  $('actBtn').focus();
  setTimeout(() => { if (!p.classList.contains('open')) p.hidden = true; }, 240);
}

let afterUndo = null;
/** What to re-render once something is stepped back. Set by whichever screen is showing. */
export const onUndo = (fn) => { afterUndo = fn; };

/* Three actors, three marks. A principal appears only when they have read this advisor's book,
   and must not be dressed as the advisor's own doing — the whole point of the entry is that
   somebody else looked (PO-06). */
const ACTOR_LABEL = (a) => a.actor === 'platform' ? t('The platform')
  : a.actor === 'principal' ? t('{name}, reading your book', { name: a.actorName || t('A principal') })
  : a.actorName || t('You');

async function loadActivity() {
  const body = $('actBody');
  if (!body) return;
  try {
    const r = await api('GET', '/activity', { query: { size: 30 } });
    body.innerHTML = r.items.length ? `<ul class="rows activity">${r.items.map(a => `
      <li><span class="actor ${esc(a.actor)}" aria-hidden="true"></span>
        <div class="grow"><div class="title">${esc(a.summary)}</div>
          ${a.detail ? `<div class="meta">${esc(a.detail)}</div>` : ''}
          <div class="source">${esc(ACTOR_LABEL(a))} \u00b7 ${esc(fmtTime(a.at))}</div></div>
        ${a.undoable && a.undoWith ? `<button class="btn quiet" data-undo="${esc(a.id)}">${esc(t('Undo'))}</button>` : ''}</li>`).join('')}</ul>`
      : `<p class="empty">${esc(t('Nothing has happened yet today.'))}</p>`;
    body.querySelectorAll('[data-undo]').forEach(b => b.onclick = async () => {
      const a = r.items.find(x => x.id === b.dataset.undo);
      b.disabled = true;
      try {
        await api(a.undoWith.method, a.undoWith.path, { body: a.undoWith.body });
        toast('Stepped back.');
        loadActivity();
        if (afterUndo) afterUndo();
      } catch (e) { toast(e.message); b.disabled = false; }
    });
  } catch (e) {
    body.innerHTML = `<div class="err">${esc(e.message || "Couldn't load your activity.")}</div>`;
  }
}
export { loadActivity };


/* Settings (AX-12). Beside the page like Ask and Activity, and reachable from every view,
   because language belongs to the person reading rather than to the view they are in.

   Changing it re-renders rather than reloads: the advisor keeps their place, and a reload would
   also lose an unsent draft. The server is asked first and the interface follows, so a failed
   write leaves the two agreeing rather than a French screen and an English preference. */
export async function openSettings(onChanged) {
  const p = $('setPanel');
  if (p.classList.contains('open')) { closeSettings(); return; }
  p.innerHTML = `<div class="side-head"><h2 id="setTitle">${esc(t('Settings'))}</h2>
      <button class="btn quiet" id="setClose" aria-label="${esc(t('Close settings'))}">${esc(t('Close'))}</button></div>
    <div class="side-body" id="setBody"><div class="skel"></div><div class="skel s"></div></div>`;
  p.hidden = false;
  requestAnimationFrame(() => p.classList.add('open'));
  document.body.classList.add('side-open');
  $('setBtn').setAttribute('aria-expanded', 'true');
  $('setClose').onclick = closeSettings;

  const body = $('setBody');
  try {
    const cfg = await api('GET', '/settings');
    /* The list comes from the server, not from the dictionary: the settings screen should offer
       what this build can render rather than what the front end hopes is there. */
    body.innerHTML = `<div class="field"><label for="setLang">${esc(t('Language'))}</label>
        <select id="setLang">${cfg.availableLanguages.map(l =>
          `<option value="${esc(l.code)}" ${l.code === cfg.language ? 'selected' : ''}>${esc(l.label)}</option>`).join('')}</select></div>
      <p class="hint">${esc(t('Changes the interface, and the dates, numbers and amounts with it. Drafts the platform writes for you are written in the same language.'))}</p>
      <p class="hint">${esc(t('Client and household names stay as they are recorded. They are data, not wording.'))}</p>`;
    $('setLang').onchange = async (e) => {
      const code = e.target.value, was = cfg.language;
      e.target.disabled = true;
      try {
        await api('PATCH', '/settings', { body: { language: code } });
        cfg.language = code;
        setLang(code);
        if (onChanged) onChanged(code);
        toast('Language changed.');
      } catch (err) { e.target.value = was; toast(err.message); }
      finally { e.target.disabled = false; }
    };
  } catch (e) { body.innerHTML = `<p class="err">${esc(e.message)}</p>`; }
}
export function closeSettings() {
  const p = $('setPanel');
  if (!p || !p.classList.contains('open')) { if (p) p.hidden = true; return; }
  p.classList.remove('open');
  document.body.classList.remove('side-open');
  $('setBtn').setAttribute('aria-expanded', 'false');
  setTimeout(() => { if (!p.classList.contains('open')) p.hidden = true; }, 240);
}

/* An answer is never shown without what it was drawn from, and never without naming the
   sources it could not reach. Both are contract fields, not decoration. */
function renderAnswer(r) {
  return `<div class="answer">
    <p class="answer-text">${esc(r.answer)}</p>
    ${r.unanswerable.length ? `<div class="answer-gap">
      <strong>${esc(t('Not covered by this answer'))}</strong>
      <ul>${r.unanswerable.map(u => `<li>${esc(u.reason)}</li>`).join('')}</ul>
    </div>` : ''}
    ${r.citations.length ? `<div class="answer-cites">
      <strong>${esc(t('Drawn from'))}</strong>
      <ul>${r.citations.map(c => `<li><span class="tag">${esc(sourceKind(c.source))}</span> ${esc(c.label || c.id)}
        <span class="meta">${esc(t('as of {time}', { time: fmtTime(c.dataAsOf) }))}</span></li>`).join('')}</ul>
    </div>` : `<p class="hint">${esc(t('No sources were used for this answer.'))}</p>`}
    <p class="hint">${esc(t('Answered by {model}. A question only reads: nothing here has changed anything.', { model: r.model }))}</p>
  </div>`;
}

/* Earlier questions, so an answer is a record rather than something that vanishes on close. */
async function loadAskHistory() {
  const el = $('askPast');
  if (!el) return;
  try {
    const r = await api('GET', '/queries', { query: { size: 5 } });
    el.innerHTML = r.items.length ? `<div class="answer-cites"><strong>${esc(t('Earlier questions'))}</strong>
      <ul>${r.items.map(q => `<li><button class="link" data-q="${esc(q.id)}">${esc(q.question)}</button></li>`).join('')}</ul></div>` : '';
    el.querySelectorAll('[data-q]').forEach(b => b.onclick = async () => {
      try { $('askOut').innerHTML = renderAnswer(await api('GET', '/queries/' + encodeURIComponent(b.dataset.q))); }
      catch (e) { toast(e.message); }
    });
  } catch { el.innerHTML = ''; }
}

/* ---- household actions, opened inline in the dialog ---- */

/* Team share (PO-04). Read access only, recorded, revocable by either side. */
async function teamSharePanel(el, h) {
  el.innerHTML = '<div class="skel"></div>';
  try {
    const [advisors, shares] = await Promise.all([
      api('GET', '/firm/advisors').catch(() => ({ items: [] })),
      api('GET', '/team-shares')
    ]);
    const mine = shares.items.filter(x => x.householdId === h.id && !x.revokedAt);
    el.innerHTML = `<h3>${esc(t('Share with a colleague'))}</h3>
      <p class="hint">${esc(t('Gives read access to this household. You stay the owner, it is recorded, and either of you can end it.'))}</p>
      ${advisors.items.length ? `<div class="field"><label for="tsWho">${esc(t('Colleague'))}</label>
        <select id="tsWho">${advisors.items.map(a => `<option value="${esc(a.id)}">${esc(a.name)}</option>`).join('')}</select></div>
        <div class="field"><label for="tsWhy">${esc(t('Reason (optional)'))}</label><input type="text" id="tsWhy" placeholder="${esc(t('For example, cover while I am away'))}"></div>
        <button class="btn primary" id="tsGo">${esc(t('Share'))}</button>`
      : `<p class="hint">${esc(t('The advisor list is not available to you, so sharing cannot be set up here.'))}</p>`}
      ${mine.length ? `<h3>${esc(t('Currently shared with'))}</h3><ul class="rows">${mine.map(x => `
        <li><div class="grow"><div class="title">${esc(x.sharedWithName)}</div>
        <div class="meta">${esc(x.reason || t('No reason given'))} • ${esc(daysAgo(x.sharedAt).toLowerCase())}</div></div>
        <button class="btn quiet" data-revoke="${esc(x.id)}">${esc(t('End'))}</button></li>`).join('')}</ul>` : ''}`;
    const go = $('tsGo');
    if (go) go.onclick = async () => {
      go.disabled = true;
      try { await api('POST', '/team-shares', { body: { householdId: h.id, advisorId: $('tsWho').value, reason: $('tsWhy').value.trim() || undefined } });
        toast('Shared.'); teamSharePanel(el, h); }
      catch (e) { toast(e.message); go.disabled = false; }
    };
    el.querySelectorAll('[data-revoke]').forEach(b => b.onclick = async () => {
      b.disabled = true;
      try { await api('DELETE', '/team-shares/' + encodeURIComponent(b.dataset.revoke)); toast('Access ended.'); teamSharePanel(el, h); }
      catch (e) { toast(e.message); b.disabled = false; }
    });
  } catch (e) { el.innerHTML = `<p class="err">${esc(e.message)}</p>`; }
}

/* Fee override (AX-11). A reason is required, because the change alters what a client is billed. */
async function feePanel(el, h) {
  el.innerHTML = '<div class="skel"></div>';
  try {
    const plan = await api('GET', '/billing/fee-plan');
    const current = plan.overrides.find(o => o.householdId === h.id);
    el.innerHTML = `<h3>${esc(t('Fee for this household'))}</h3>
      <p class="hint">${esc(t('The schedule charges {rate}% at these assets. An override replaces that for this household only.', { rate: scheduleRateFor(plan, h.aum) }))}</p>
      <div class="field"><label for="feeRate">${esc(t('Annual rate'))}</label><input type="number" id="feeRate" step="0.05" min="0" max="5" value="${current ? current.annualRatePct : scheduleRateFor(plan, h.aum)}"> <span class="meta">%</span></div>
      <div class="field"><label for="feeWhy">${esc(t('Reason'))}</label><input type="text" id="feeWhy" value="${esc(current ? current.reason : '')}" placeholder="${esc(t('Required: this changes what the client is billed'))}"></div>
      <div class="actions"><button class="btn primary" id="feeGo">${esc(t('Save rate'))}</button>
        ${current ? `<button class="btn quiet" id="feeClear">${esc(t('Remove override'))}</button>` : ''}</div>`;
    $('feeGo').onclick = async () => {
      const b = $('feeGo'); b.disabled = true;
      try { await api('PATCH', '/billing/fees/' + encodeURIComponent(h.id), { body: { annualRatePct: Number($('feeRate').value), reason: $('feeWhy').value.trim() } });
        toast('Rate saved.'); feePanel(el, h); }
      catch (e) { toast(e.message); b.disabled = false; }
    };
    const clear = $('feeClear');
    if (clear) clear.onclick = async () => {
      try { await api('PATCH', '/billing/fees/' + encodeURIComponent(h.id), { body: { annualRatePct: null } }); toast('Override removed.'); feePanel(el, h); }
      catch (e) { toast(e.message); }
    };
  } catch (e) { el.innerHTML = `<p class="err">${esc(e.message)}</p>`; }
}
const scheduleRateFor = (plan, aum) => {
  const band = plan.schedule.find(x => aum >= x.minAssets && (x.maxAssets === null || aum < x.maxAssets));
  return band ? band.annualRatePct : 0;
};

/* Model comparison (PM-03). A comparison, never an instruction: no trade leaves this screen. */
async function modelPanel(el, h) {
  el.innerHTML = '<div class="skel"></div>';
  try {
    const models = await api('GET', '/models');
    el.innerHTML = `<h3>${esc(t('Compare models'))}</h3>
      <div class="field"><label for="mdlPick">${esc(t('Move to'))}</label>
        <select id="mdlPick">${models.items.map(m => `<option value="${esc(m.id)}">${esc(m.name)} (${esc(m.riskLevel)})</option>`).join('')}</select></div>
      <button class="btn primary" id="mdlGo">${esc(t('Compare'))}</button>
      <div id="mdlOut"></div>`;
    $('mdlGo').onclick = async () => {
      const b = $('mdlGo'); b.disabled = true;
      try {
        const c = await api('POST', '/households/' + encodeURIComponent(h.id) + '/model-comparison', { body: { modelId: $('mdlPick').value } });
        $('mdlOut').innerHTML = `<p class="hint">${esc(t('{from} to {to} • turnover {n}%', { from: c.fromModel ? c.fromModel.name : t('No model'), to: c.toModel.name, n: c.turnoverPct }))}</p>
          <div class="tablewrap"><table><thead><tr><th>${esc(t('Asset class'))}</th><th class="num">${esc(t('Now'))}</th><th class="num">${esc(t('Proposed'))}</th><th class="num">${esc(t('Change'))}</th><th class="num">${esc(t('Value'))}</th></tr></thead><tbody>
          ${c.lines.map(l => `<tr><td>${esc(l.assetClass)}</td><td class="num">${l.currentPct}%</td><td class="num">${l.targetPct}%</td>
            <td class="num ${l.changePct > 0 ? 'up' : l.changePct < 0 ? 'neg' : ''}">${l.changePct > 0 ? '+' : ''}${l.changePct}</td>
            <td class="num">${moneyFull(l.changeValue)}</td></tr>`).join('')}</tbody></table></div>
          <p class="hint">${esc(c.note)}</p>`;
      } catch (e) { $('mdlOut').innerHTML = `<p class="err">${esc(e.message)}</p>`; }
      finally { b.disabled = false; }
    };
  } catch (e) { el.innerHTML = `<p class="err">${esc(e.message)}</p>`; }
}
