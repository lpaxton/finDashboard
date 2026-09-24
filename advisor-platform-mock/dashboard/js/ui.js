/* Pieces shared by every view: panel loading with its error and retry states, toasts,
   sparklines, sortable tables, the alert list, the household dialog and the book table. */
import { api } from './api.js';
import { $, esc, money, moneyFull, pct, pctClass, daysAgo, fmtTime, statusBadge, SHARE_TYPES } from './format.js';

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
      <div class="actions" style="margin:2px 0 14px"><button class="btn" id="hhAsk">Ask about this household</button>
        ${canShare ? '<button class="btn" id="hhTeam">Share with a colleague</button><button class="btn" id="hhFee">Change fee</button><button class="btn" id="hhModel">Compare models</button>' : ''}</div>
      <div id="hhPanel"></div>
      <h3>Allocation</h3>
      <div id="hhAlloc"><div class="skel"></div></div>
      <h3>Accounts</h3>
      <div class="tablewrap"><table><thead><tr><th>Account</th><th>Type</th><th class="num">Balance</th><th class="num">Today</th><th>Opening</th></tr></thead><tbody>
      ${h.accounts.map(a => `<tr><td>${esc(a.maskedNumber)}</td><td>${esc(a.type)}</td><td class="num">${moneyFull(a.balance)}</td><td class="num ${pctClass(a.todayGainLoss)}">${moneyFull(a.todayGainLoss)}</td><td>${esc((a.openingStatus || '').toUpperCase())}</td></tr>`).join('')}</tbody></table></div>
      ${canShare ? `<h3>Share with client</h3>
      <p class="hint" style="margin:0 0 10px">Clients see only what an advisor approves here. Briefs, alerts, notes and tasks are never shared.</p>
      <div class="field"><label for="shType">Type</label><select id="shType">${Object.entries(SHARE_TYPES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
      <div class="field"><label for="shTitle">Title shown to the client</label><input type="text" id="shTitle" placeholder="For example, Your retirement plan summary"></div>
      <div class="field"><label for="shMsg">Message (optional)</label><textarea id="shMsg"></textarea></div>
      <button class="btn primary" id="shGo">Approve and share</button>` : ''}`;
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

/* Target against current, per asset class. The drift threshold belongs to the household's
   model rather than to us, so it is shown when Green Meadows supplies it and left out when
   it does not, instead of falling back to an invented number. */
async function loadAllocation(id) {
  const el = $('hhAlloc');
  if (!el) return;
  try {
    const a = await api('GET', '/households/' + encodeURIComponent(id) + '/allocation');
    if (a.priced === false) {
      el.innerHTML = `<p class="hint">${esc(a.unavailableReason || 'Allocation is unavailable.')}</p>`;
      return;
    }
    if (!a.model) {
      el.innerHTML = '<p class="hint">No model portfolio on file for this household, so there is no target to compare against.</p>';
      return;
    }
    const limit = a.driftThresholdPoints ?? null;
    const over = limit !== null && a.maxDriftPoints > limit;
    el.innerHTML = `
      <div class="meta" style="margin-bottom:10px">${esc(a.model.name)} \u2022 largest drift
        <strong class="${over ? 'due-hot' : ''}">${a.maxDriftPoints} points</strong>${limit !== null ? ` against a ${limit}-point limit` : ''}</div>
      <ul class="alloc">${a.lines.map(l => {
        const scale = Math.max(...a.lines.map(x => Math.max(x.targetPct, x.currentPct)));
        return `<li>
          <span class="alloc-label">${esc(l.assetClass)}</span>
          <span class="alloc-bars" role="img" aria-label="${esc(l.assetClass)}: target ${l.targetPct}%, current ${l.currentPct}%">
            <span class="alloc-target" style="width:${(l.targetPct / scale) * 100}%"></span>
            <span class="alloc-current ${Math.abs(l.driftPct) >= (limit ?? Infinity) ? 'hot' : ''}" style="width:${(l.currentPct / scale) * 100}%"></span>
          </span>
          <span class="alloc-nums">${l.currentPct}% <span class="meta">of ${l.targetPct}%</span></span>
          <span class="alloc-drift ${l.driftPct > 0 ? 'up' : l.driftPct < 0 ? 'neg' : ''}">${l.driftPct > 0 ? '+' : ''}${l.driftPct}</span>
        </li>`;
      }).join('')}</ul>
      ${a.unclassifiedPct ? `<p class="hint">${a.unclassifiedPct}% of holdings are not in the model and could not be classified.</p>` : ''}`;
  } catch (e) {
    el.innerHTML = `<p class="hint">${esc(e.status === 404 ? 'No allocation for this household.' : e.message)}</p>`;
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

export function openAsk(canFirm) {
  const dlg = $('dlg');
  dlg.innerHTML = `<button class="btn quiet close" data-close>Close</button>
    <h2 id="dlgTitle">Ask</h2>
    <div class="meta">Answering across ${esc(askScope.label)}</div>
    <div class="field"><label for="askQ">What do you want to know?</label>
      <input type="text" id="askQ" placeholder="For example, which clients are holding cash above target?" autocomplete="off"></div>
    ${canFirm && askScope.scope !== 'household' ? `<label class="hint"><input type="checkbox" id="askFirm"> Ask across the whole firm</label>` : ''}
    <div class="actions" style="margin-top:10px"><button class="btn primary" id="askGo">Ask</button></div>
    <div id="askOut"></div>
    <div id="askPast"></div>`;
  dlg.showModal();
  loadAskHistory();
  const q = $('askQ');
  q.focus();
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
      $('askOut').innerHTML = renderAnswer(r);
      loadAskHistory();
    } catch (e) { $('askOut').innerHTML = `<p class="err">${esc(e.message)}</p>`; }
    finally { btn.disabled = false; }
  };
  $('askGo').onclick = go;
  q.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } };
}

/* An answer is never shown without what it was drawn from, and never without naming the
   sources it could not reach. Both are contract fields, not decoration. */
function renderAnswer(r) {
  return `<div class="answer">
    <p class="answer-text">${esc(r.answer)}</p>
    ${r.unanswerable.length ? `<div class="answer-gap">
      <strong>Not covered by this answer</strong>
      <ul>${r.unanswerable.map(u => `<li>${esc(u.reason)}</li>`).join('')}</ul>
    </div>` : ''}
    ${r.citations.length ? `<div class="answer-cites">
      <strong>Drawn from</strong>
      <ul>${r.citations.map(c => `<li><span class="tag">${esc(c.source)}</span> ${esc(c.label || c.id)}
        <span class="meta">as of ${esc(fmtTime(c.dataAsOf))}</span></li>`).join('')}</ul>
    </div>` : '<p class="hint">No sources were used for this answer.</p>'}
    <p class="hint">Answered by ${esc(r.model)}. A question only reads: nothing here has changed anything.</p>
  </div>`;
}

/* Earlier questions, so an answer is a record rather than something that vanishes on close. */
async function loadAskHistory() {
  const el = $('askPast');
  if (!el) return;
  try {
    const r = await api('GET', '/queries', { query: { size: 5 } });
    el.innerHTML = r.items.length ? `<div class="answer-cites"><strong>Earlier questions</strong>
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
    const mine = shares.items.filter(t => t.householdId === h.id && !t.revokedAt);
    el.innerHTML = `<h3>Share with a colleague</h3>
      <p class="hint">Gives read access to this household. You stay the owner, it is recorded, and either of you can end it.</p>
      ${advisors.items.length ? `<div class="field"><label for="tsWho">Colleague</label>
        <select id="tsWho">${advisors.items.map(a => `<option value="${esc(a.id)}">${esc(a.name)}</option>`).join('')}</select></div>
        <div class="field"><label for="tsWhy">Reason (optional)</label><input type="text" id="tsWhy" placeholder="For example, cover while I am away"></div>
        <button class="btn primary" id="tsGo">Share</button>`
      : '<p class="hint">The advisor list is not available to you, so sharing cannot be set up here.</p>'}
      ${mine.length ? `<h3>Currently shared with</h3><ul class="rows">${mine.map(t => `
        <li><div class="grow"><div class="title">${esc(t.sharedWithName)}</div>
        <div class="meta">${esc(t.reason || 'No reason given')} • ${esc(daysAgo(t.sharedAt).toLowerCase())}</div></div>
        <button class="btn quiet" data-revoke="${esc(t.id)}">End</button></li>`).join('')}</ul>` : ''}`;
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
    el.innerHTML = `<h3>Fee for this household</h3>
      <p class="hint">The schedule charges ${esc(String(scheduleRateFor(plan, h.aum)))}% at these assets. An override replaces that for this household only.</p>
      <div class="field"><label for="feeRate">Annual rate</label><input type="number" id="feeRate" step="0.05" min="0" max="5" value="${current ? current.annualRatePct : scheduleRateFor(plan, h.aum)}"> <span class="meta">%</span></div>
      <div class="field"><label for="feeWhy">Reason</label><input type="text" id="feeWhy" value="${esc(current ? current.reason : '')}" placeholder="Required: this changes what the client is billed"></div>
      <div class="actions"><button class="btn primary" id="feeGo">Save rate</button>
        ${current ? '<button class="btn quiet" id="feeClear">Remove override</button>' : ''}</div>`;
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
  const t = plan.schedule.find(x => aum >= x.minAssets && (x.maxAssets === null || aum < x.maxAssets));
  return t ? t.annualRatePct : 0;
};

/* Model comparison (PM-03). A comparison, never an instruction: no trade leaves this screen. */
async function modelPanel(el, h) {
  el.innerHTML = '<div class="skel"></div>';
  try {
    const models = await api('GET', '/models');
    el.innerHTML = `<h3>Compare models</h3>
      <div class="field"><label for="mdlPick">Move to</label>
        <select id="mdlPick">${models.items.map(m => `<option value="${esc(m.id)}">${esc(m.name)} (${esc(m.riskLevel)})</option>`).join('')}</select></div>
      <button class="btn primary" id="mdlGo">Compare</button>
      <div id="mdlOut"></div>`;
    $('mdlGo').onclick = async () => {
      const b = $('mdlGo'); b.disabled = true;
      try {
        const c = await api('POST', '/households/' + encodeURIComponent(h.id) + '/model-comparison', { body: { modelId: $('mdlPick').value } });
        $('mdlOut').innerHTML = `<p class="hint">${esc(c.fromModel ? c.fromModel.name : 'No model')} to ${esc(c.toModel.name)} • turnover ${c.turnoverPct}%</p>
          <div class="tablewrap"><table><thead><tr><th>Asset class</th><th class="num">Now</th><th class="num">Proposed</th><th class="num">Change</th><th class="num">Value</th></tr></thead><tbody>
          ${c.lines.map(l => `<tr><td>${esc(l.assetClass)}</td><td class="num">${l.currentPct}%</td><td class="num">${l.targetPct}%</td>
            <td class="num ${l.changePct > 0 ? 'up' : l.changePct < 0 ? 'neg' : ''}">${l.changePct > 0 ? '+' : ''}${l.changePct}</td>
            <td class="num">${moneyFull(l.changeValue)}</td></tr>`).join('')}</tbody></table></div>
          <p class="hint">${esc(c.note)}</p>`;
      } catch (e) { $('mdlOut').innerHTML = `<p class="err">${esc(e.message)}</p>`; }
      finally { b.disabled = false; }
    };
  } catch (e) { el.innerHTML = `<p class="err">${esc(e.message)}</p>`; }
}
