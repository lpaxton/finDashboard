/* Firm sections, for the principal. Billing holds two unrelated concerns deliberately:
   what the firm pays for the platform, and what the firm charges its clients. */
import { api } from './api.js';
import { $, esc, money, moneyFull, pct, pctClass, fmtDate, daysAgo, CATEGORY } from './format.js';
import { toast, spark, head, panel, load, sortTable, nextSort, alertsList, bookPanel, subnav } from './ui.js';
import { applyBranding } from './state.js';

export const FIRM_SECTIONS = [['overview', 'Overview'], ['billing', 'Billing'], ['ownership', 'Ownership'], ['branding', 'Branding']];
export let firmSection = 'overview';

export function firmLoadStrip() {
  return api('GET', '/firm/summary').then(s => {
    $('strip').innerHTML = `
      <div class="stat"><dt>Firm assets under management</dt><dd><div class="figure">${money(s.aum.value)}</div><div class="sub"><span class="${pctClass(s.aum.changeMtd)}">${pct(s.aum.changeMtd)}</span> this month</div>${spark(s.aum.trend, 'Firm assets, last 12 months')}</dd></div>
      <div class="stat"><dt>Advisors</dt><dd><div class="figure">${s.advisors}</div></dd></div>
      <div class="stat"><dt>Households</dt><dd><div class="figure">${s.households}</div></dd></div>
      <div class="stat"><dt>Open compliance items</dt><dd><div class="figure">${s.openComplianceItems}</div><div class="sub">${s.overdueComplianceItems} overdue</div></dd></div>`;
  }).catch(e => { $('strip').innerHTML = `<div class="err" style="padding:16px 0">${esc(e.message)}</div>`; });
}

export function firmView() {
  $('view').innerHTML = `<dl class="strip" id="strip"></dl>
    <div class="viewbody">
      <div id="navrail"><nav class="subnav" id="firmnav" aria-label="Firm sections"></nav></div>
      <div id="section"></div>
    </div>`;
  firmLoadStrip();
  const go = (k) => { firmSection = k; subnav($('firmnav'), FIRM_SECTIONS, k, go); FIRM_RENDER[k](); };
  go(firmSection);
}

export function firmOverview() {
  $('section').innerHTML = `<div class="grid even">
      ${panel('f-advisors', 'wide')}${panel('f-compliance')}${panel('f-alerts')}${panel('f-book', 'wide')}
    </div>`;

  const st = { sort: 'aum,desc' };
  const cols = [{ key: 'name', label: 'Advisor' }, { key: 'households', label: 'Households', num: true }, { key: 'aum', label: 'Assets', num: true }, { key: 'change30d', label: '30-day change', num: true, nosort: true }, { key: 'meetingsThisWeek', label: 'Meetings this week', num: true, nosort: true }, { key: 'tasksOverdue', label: 'Overdue tasks', num: true }, { key: 'openAlerts', label: 'Open alerts', num: true }];
  const runAdv = () => load($('f-advisors'), 'Advisors', () => api('GET', '/firm/advisors', { query: { sort: st.sort } }), (r) =>
    head('Advisors', 'Select a name for details') + sortTable(cols, st.sort, r.items.map(a => `<tr><td><button class="link" data-adv="${esc(a.id)}">${esc(a.name)}</button></td><td class="num">${a.households}</td><td class="num">${money(a.aum)}</td><td class="num ${pctClass(a.change30d)}">${pct(a.change30d)}</td><td class="num">${a.meetingsThisWeek}</td><td class="num ${a.tasksOverdue ? 'neg' : ''}">${a.tasksOverdue}</td><td class="num">${a.openAlerts}</td></tr>`).join('')),
  (el) => {
    el.querySelectorAll('[data-sort]').forEach(b => b.onclick = () => { st.sort = nextSort(st.sort, b.dataset.sort, b.dataset.sort === 'name'); runAdv(); });
    el.querySelectorAll('[data-adv]').forEach(b => b.onclick = async () => {
      const dlg = $('dlg'); dlg.innerHTML = '<p class="empty">Loading\u2026</p>'; dlg.showModal();
      try {
        const a = await api('GET', '/firm/advisors/' + encodeURIComponent(b.dataset.adv));
        dlg.innerHTML = `<button class="btn quiet close" data-close>Close</button><h2 id="dlgTitle">${esc(a.name)}</h2>
          <dl class="defs"><dt>Households</dt><dd>${a.households}</dd><dt>Assets</dt><dd>${moneyFull(a.aum)}</dd><dt>30-day change</dt><dd class="${pctClass(a.change30d)}">${pct(a.change30d)}</dd><dt>Meetings this week</dt><dd>${a.meetingsThisWeek}</dd><dt>Overdue tasks</dt><dd>${a.tasksOverdue}</dd><dt>Open alerts</dt><dd>${a.openAlerts}</dd></dl>
          <p class="hint">Opening this advisor's full dashboard in read-only mode is a decision still open in the requirements doc.</p>`;
      } catch (e) { dlg.innerHTML = `<button class="btn quiet close" data-close>Close</button><p class="err">${esc(e.message)}</p>`; }
    });
  });
  runAdv();

  let cstatus = '';
  const runComp = () => load($('f-compliance'), 'Compliance', () => api('GET', '/firm/compliance', { query: { status: cstatus, size: 6 } }), (r) =>
    `<div class="panel-head"><h2>Compliance</h2><label class="hint">Show <select id="cfilter" aria-label="Filter compliance by status"><option value="">All</option><option value="overdue">Overdue</option><option value="open">Open</option><option value="done">Done</option></select></label></div>` +
    (r.items.length ? `<ul class="rows">${r.items.map(c => `<li><div class="grow"><div class="title">${esc(c.title)}</div><div class="meta">${esc(CATEGORY[c.category])} \u2022 ${esc(c.advisorName)} \u2022 due ${esc(fmtDate(c.dueDate))}</div></div><span class="badge ${c.status === 'overdue' ? 'crit' : c.status === 'done' ? 'ok' : 'plain'}">${esc(c.status)}</span></li>`).join('')}</ul>` : '<p class="empty">No items match.</p>'),
  (el) => { const f = el.querySelector('#cfilter'); f.value = cstatus; f.onchange = () => { cstatus = f.value; runComp(); }; });
  runComp();

  load($('f-alerts'), 'Firm alerts', () => api('GET', '/alerts', { query: { scope: 'firm' } }), (r) => head('Firm alerts', r.items.length + ' open') + alertsList(r.items.slice(0, 6)));

  bookPanel({ scope: 'firm', canShare: false, id: 'f-book', title: 'Households across the firm', size: 6 });
}

/* Billing holds two unrelated concerns: what the firm pays for the platform, and what the
   firm charges its clients. They share a section because that is where people look for both. */
export function firmBilling() {
  $('section').innerHTML = `<div class="grid"><div class="col">${panel('b-sub')}${panel('b-inv')}</div><div class="col">${panel('b-plan')}${panel('b-fees')}</div></div>`;

  // Where the model status belongs: beside the AI usage meter a principal is already reading.
  load($('b-sub'), 'Platform subscription',
    () => Promise.all([api('GET', '/firm/billing/subscription'), api('GET', '/ai/status').catch(() => null)]),
    ([s, ai]) =>
    head('Platform subscription', s.plan) + `
    <dl class="defs"><dt>Seats</dt><dd>${s.seats.used} of ${s.seats.purchased} in use</dd>
      <dt>Renews</dt><dd>${esc(fmtDate(s.renewalDate))}</dd>
      <dt>Payment method</dt><dd>${esc(s.paymentMethod.brand)} ${esc(s.paymentMethod.maskedNumber)}, expires ${s.paymentMethod.expiryMonth}/${s.paymentMethod.expiryYear}</dd>
      <dt>This invoice</dt><dd>${moneyFull(s.currentInvoice.amount)}, ${esc(s.currentInvoice.status)} ${esc(fmtDate(s.currentInvoice.dueDate))}</dd></dl>
    <h3>Usage this period</h3>
    <ul class="meters">${s.meters.map(m => { const p = Math.min(100, Math.round(m.used / m.included * 100)); return `
      <li><div class="meter-top"><span>${esc(m.label)}</span><span class="meta">${m.used.toLocaleString('en-US')} of ${m.included.toLocaleString('en-US')} ${esc(m.unit)}</span></div>
      <div class="meter"><span style="width:${p}%" class="${p >= 90 ? 'hot' : ''}"></span></div></li>`; }).join('')}</ul>
    ${ai ? `<p class="hint">${ai.live
      ? 'Drafting is live, on ' + esc(ai.model) + '.'
      : 'Drafting is offline, so nothing here is consuming the AI allowance. ' + esc(ai.reason || '')}</p>` : ''}`);

  load($('b-inv'), 'Invoices', () => api('GET', '/firm/billing/invoices'), (r) =>
    head('Invoices', r.totalItems + ' on file') + `<ul class="rows">${r.items.map(i => `
      <li><div class="grow"><div class="title">${esc(i.number)}</div><div class="meta">Issued ${esc(fmtDate(i.issuedDate))}</div></div>
      <span>${moneyFull(i.amount)}</span><span class="badge ${i.status === 'paid' ? 'ok' : i.status === 'overdue' ? 'crit' : 'plain'}">${esc(i.status)}</span>
      <button class="btn" data-inv="${esc(i.id)}">Breakdown</button></li>`).join('')}</ul>`,
  (el) => el.querySelectorAll('[data-inv]').forEach(b => b.onclick = async () => {
    const dlg = $('dlg'); dlg.innerHTML = '<p class="empty">Loading…</p>'; dlg.showModal();
    try {
      const i = await api('GET', '/firm/billing/invoices/' + encodeURIComponent(b.dataset.inv));
      dlg.innerHTML = `<button class="btn quiet close" data-close>Close</button><h2 id="dlgTitle">${esc(i.number)}</h2>
        <div class="meta">Issued ${esc(fmtDate(i.issuedDate))} • due ${esc(fmtDate(i.dueDate))}</div>
        <div class="tablewrap"><table><thead><tr><th>Item</th><th class="num">Quantity</th><th class="num">Each</th><th class="num">Amount</th></tr></thead>
        <tbody>${i.lines.map(l => `<tr><td>${esc(l.description)}</td><td class="num">${l.quantity}</td><td class="num">${moneyFull(l.unitAmount)}</td><td class="num">${moneyFull(l.amount)}</td></tr>`).join('')}
        <tr><td colspan="3"><strong>Total</strong></td><td class="num"><strong>${moneyFull(i.amount)}</strong></td></tr></tbody></table></div>`;
    } catch (e) { dlg.innerHTML = `<button class="btn quiet close" data-close>Close</button><p class="err">${esc(e.message)}</p>`; }
  }));

  runFeePlan();

  // The principal is also an advisor here, so /billing/fees resolves to their own book.
  load($('b-fees'), 'Client fees', () => api('GET', '/billing/fees', { query: { size: 100 } }), (r) =>
    head('Client fees', 'Next run ' + fmtDate(r.nextRunDate)) + `
    <h3>Schedule</h3>
    <div class="tablewrap"><table><thead><tr><th>Assets</th><th class="num">Annual rate</th></tr></thead><tbody>
    ${r.schedule.map(t => `<tr><td>${money(t.minAssets)}${t.maxAssets ? ' to ' + money(t.maxAssets) : ' and above'}</td><td class="num">${t.annualRatePct}%</td></tr>`).join('')}
    </tbody></table></div>
    <h3>This quarter</h3>
    <div class="tablewrap"><table><thead><tr><th>Household</th><th class="num">Billable</th><th class="num">Rate</th><th class="num">Fee</th></tr></thead><tbody>
    ${r.items.map(f => `<tr><td>${esc(f.householdName)}</td><td class="num">${money(f.billableAssets)}</td><td class="num">${f.annualRatePct}%</td><td class="num">${moneyFull(f.quarterlyFee)}</td></tr>`).join('')}
    <tr><td colspan="3"><strong>Total</strong></td><td class="num"><strong>${moneyFull(r.totalQuarterlyFees)}</strong></td></tr></tbody></table></div>
    <p class="hint">Clients see their own fee from this same schedule in the portal.</p>`);
}

export function firmBranding() {
  $('section').innerHTML = `<div class="grid"><div class="col">${panel('b-brand')}</div></div>`;
  load($('b-brand'), 'Branding', () => api('GET', '/firm/branding'), (b) =>
    head('Branding', 'Applies to every view, including the client portal') + `
    <div class="field"><label for="brFirm">Firm name</label><input type="text" id="brFirm" value="${esc(b.firmName)}"></div>
    <div class="field"><label for="brAdv">Advisor name and credential</label><input type="text" id="brAdv" value="${esc(b.advisorDisplayName || '')}"></div>
    <div class="field"><label for="brMark">Mark letter</label><input type="text" id="brMark" maxlength="1" value="${esc(b.markLetter)}"></div>
    <div class="field"><label for="brColor">Accent colour</label><input type="color" id="brColor" value="${esc(b.accentColor)}"></div>
    <button class="btn primary" id="brSave">Save branding</button>
    <p class="hint">Last changed by ${esc(b.updatedBy || 'nobody')} ${esc(daysAgo(b.updatedAt).toLowerCase())}. Only a principal can change this; every advisor and client sees the result.</p>`,
  () => {
    $('brSave').onclick = async () => {
      const btn = $('brSave'); btn.disabled = true;
      try {
        const b = await api('PATCH', '/firm/branding', { body: { firmName: $('brFirm').value.trim(), advisorDisplayName: $('brAdv').value.trim(), markLetter: $('brMark').value.trim() || 'W', accentColor: $('brColor').value } });
        applyBranding(b); toast('Branding saved.');
      } catch (e) { toast(e.message); } finally { btn.disabled = false; }
    };
  });
}

export const FIRM_RENDER = { overview: firmOverview, billing: firmBilling, ownership: firmOwnership, branding: firmBranding };

/* Who owns the practice (PO-12). Principal only, and the API enforces that. */
export function firmOwnership() {
  $('section').innerHTML = `<div class="grid">${panel('f-cap', 'wide')}</div>`;
  load($('f-cap'), 'Ownership', () => api('GET', '/firm/cap-table'), (c) =>
    head('Ownership', c.totalShares.toLocaleString('en-US') + ' shares as at ' + fmtDate(c.asOf))
    + `<div class="tablewrap"><table><thead><tr><th>Holder</th><th>Class</th><th class="num">Shares</th><th class="num">Vested</th><th class="num">Ownership</th><th>Vesting ends</th></tr></thead><tbody>
      ${c.holders.map(h => `<tr><td>${esc(h.holder)}<div class="meta">${esc(h.role)}</div></td>
        <td>${esc((c.shareClasses.find(s2 => s2.id === h.shareClass) || {}).name || h.shareClass)}</td>
        <td class="num">${h.shares.toLocaleString('en-US')}</td>
        <td class="num">${h.unvested ? h.vested.toLocaleString('en-US') : '—'}</td>
        <td class="num">${h.ownershipPct}%</td>
        <td>${h.vestingEndsOn ? esc(fmtDate(h.vestingEndsOn)) : '—'}</td></tr>`).join('')}
      </tbody></table></div>
    <p class="hint">The firm's own ownership, not a client's. Visible to a principal only.</p>`);
}

/* The schedule is the firm's, so only a principal may change it. Tiers must meet exactly:
   the API refuses a gap, and the UI says why before you try. */
function runFeePlan() {
  load($('b-plan'), 'Fee schedule', () => api('GET', '/billing/fee-plan'), (p) =>
    head('Fee schedule', p.canEditSchedule ? 'Editable' : 'Set by the principal')
    + `<ul class="tiers" id="tierList">${p.schedule.map((t, i) => `<li>
        <span>${money(t.minAssets)}${t.maxAssets ? ' to ' + money(t.maxAssets) : ' and above'}</span>
        ${p.canEditSchedule
          ? `<input type="number" step="0.05" min="0" max="5" value="${t.annualRatePct}" data-tier="${i}" aria-label="Annual rate for this tier"> <span class="meta">%</span>`
          : `<span>${t.annualRatePct}%</span>`}
      </li>`).join('')}</ul>
    ${p.canEditSchedule ? '<button class="btn primary" id="planSave">Save schedule</button>' : ''}
    <p class="hint">Last changed by ${esc(p.updatedBy || 'nobody')} ${esc(daysAgo(p.updatedAt).toLowerCase())}. Tiers must meet exactly, so no household is left without a rate.</p>
    ${p.overrides.length ? `<h3>Overrides</h3><ul class="rows">${p.overrides.map(o => `
      <li><div class="grow"><div class="title">${esc(o.householdName)}</div><div class="meta">${esc(o.reason)} • ${esc(o.setBy)}</div></div>
      <span>${o.annualRatePct}%</span></li>`).join('')}</ul>` : ''}`,
  (el, p) => {
    const btn = el.querySelector('#planSave');
    if (!btn) return;
    btn.onclick = async () => {
      const schedule = p.schedule.map((t, i) => ({ ...t, annualRatePct: Number(el.querySelector(`[data-tier="${i}"]`).value) }));
      btn.disabled = true;
      try { await api('PATCH', '/billing/fee-plan', { body: { schedule } }); toast('Schedule saved.'); runFeePlan(); }
      catch (e) { toast(e.message); btn.disabled = false; }
    };
  });
}
