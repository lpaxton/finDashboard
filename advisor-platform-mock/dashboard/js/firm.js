/* Firm sections, for the principal. Billing holds two unrelated concerns deliberately:
   what the firm pays for the platform, and what the firm charges its clients. */
import { api } from './api.js';
import { $, esc, money, moneyFull, pct, pctClass, fmtDate, localDate, daysAgo, CATEGORY } from './format.js';
import { toast, spark, head, panel, load, sortTable, nextSort, alertsList, bookPanel, subnav } from './ui.js';
import { applyBranding } from './state.js';
/* The scorecard and the practice report are the same metric shape the advisor's own Reports
   section renders. One renderer, so a firm number and a book number never disagree on form. */
import { metricRows } from './advisor.js';

/* The Firm pass (UX_IA §1, §6.3). The doc's lean was that "the Firm view may simply be the
   Operations role seen across the whole firm rather than one advisor's book". That is what this
   is: the Operations role's tabs at firm scale — Overview, Reports, Billing & fees, Compliance —
   plus the three places that are the firm itself and have no Operations equivalent.

   It does not show Dana her own four role cards. She already has those in the Advisor view for
   her own book; repeating them here would answer "how is my book going" twice and "how is the
   firm going" never. */
export const FIRM_SECTIONS = [['overview', 'Overview'], ['advisors', 'Advisors'],
  ['compliance', 'Compliance'], ['reports', 'Reports'], ['billing', 'Billing & fees'],
  ['ownership', 'Ownership'], ['branding', 'Branding']];
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

/* Overview leads with what needs answering, then how the firm is going — the same shape as a
   role home (UX_IA §3): priorities first, overview second, not a wall of equal tiles. The
   advisors table moved to its own place, and compliance to its own, because both had grown
   past what a panel on a summary screen should hold. */
export function firmOverview() {
  $('section').innerHTML = `<h2 class="pagehead">Across the firm</h2>
    <div class="grid">${panel('f-pri')}${panel('f-alerts')}${panel('f-book', 'wide')}</div>`;

  /* One stream, told twice, would be a tile wall by another name: the ranked list is built from
     the alerts, so showing both raw and ranked side by side repeats the same three rows. The
     second panel is therefore what is open and NOT already named on the left.

     Two kinds of overlap, both knowable rather than guessed. An alert-kind next action cites the
     alert by id. A contact-kind one cites the CRM instead, but a contact gap and a no-contact
     alert on the same household are the same fact by construction — and a no-contact alert is
     exactly the one the contract gives a draft_email action. No title matching. */
  api('GET', '/next-actions', { query: { scope: 'firm', size: 8 } }).then(r => {
    const raised = new Set(r.items.flatMap(a => a.citations.map(c => c.id)));
    const contacted = new Set(r.items.filter(a => a.kind === 'contact').map(a => a.householdId));

    $('f-pri').innerHTML = head('Needs you', r.totalItems > r.items.length ? `top ${r.items.length} of ${r.totalItems}` : 'across every advisor')
      + (r.items.length ? `<ul class="rows">${r.items.map(a => `
        <li><span class="sev ${esc(a.priority)}" title="${esc(a.priority)} priority"></span>
        <div class="grow"><div class="title">${esc(a.title)}</div>
        <div class="meta">${esc(a.reason)}</div>
        <div class="source">${esc(a.householdName || 'Practice')} · ${a.citations.map(c => esc(c.source)).join(', ')}</div></div></li>`).join('')}</ul>
        <p class="hint">${esc(r.note)}</p>`
        : '<p class="empty serif">Nothing across the firm needs you today.</p>');

    load($('f-alerts'), 'Also open', () => api('GET', '/alerts', { query: { scope: 'firm' } }), (al) => {
      const rest = al.items.filter(a => !raised.has(a.id)
        && !(a.action && a.action.type === 'draft_email' && contacted.has(a.householdId)));
      return head('Also open', rest.length ? 'not in the list on the left' : '')
        + (rest.length ? alertsList(rest.slice(0, 6))
          : '<p class="empty serif">Every open alert is already named on the left.</p>');
    });
  }).catch(e => {
    $('f-pri').innerHTML = head('Needs you') + `<div class="err">${esc(e.message)}</div>`;
    load($('f-alerts'), 'Firm alerts', () => api('GET', '/alerts', { query: { scope: 'firm' } }),
      (al) => head('Firm alerts') + alertsList(al.items.slice(0, 6)));
  });

  bookPanel({ scope: 'firm', canShare: false, id: 'f-book', title: 'Households across the firm', size: 6 });
}

/* Advisors: the roster, and one advisor against the firm. A principal is the only person who
   sees a rank — placing someone against named colleagues is a management decision, not a
   reporting one (AX-08, and the resolution recorded in HANDOFF section 9). */
export function firmAdvisors() {
  $('section').innerHTML = `<h2 class="pagehead">Advisors</h2>
    <div class="grid">${panel('f-advisors', 'wide')}</div>
    <div class="grid" style="margin-top:20px">${panel('f-score', 'wide')}</div>`;

  const st = { sort: 'aum,desc', picked: null };
  const cols = [{ key: 'name', label: 'Advisor' }, { key: 'households', label: 'Households', num: true },
    { key: 'aum', label: 'Assets', num: true }, { key: 'change30d', label: '30-day change', num: true, nosort: true },
    { key: 'meetingsThisWeek', label: 'Meetings this week', num: true, nosort: true },
    { key: 'tasksOverdue', label: 'Overdue follow-ups', num: true }, { key: 'openAlerts', label: 'Open alerts', num: true }];

  const runAdv = () => load($('f-advisors'), 'Advisors',
    () => api('GET', '/firm/advisors', { query: { sort: st.sort } }),
    (r) => head('Advisors', 'Select a name for their scorecard')
      + sortTable(cols, st.sort, r.items.map(a => `<tr><td><button class="link" data-adv="${esc(a.id)}">${esc(a.name)}</button></td>
        <td class="num">${a.households}</td><td class="num">${money(a.aum)}</td>
        <td class="num ${pctClass(a.change30d)}">${pct(a.change30d)}</td>
        <td class="num">${a.meetingsThisWeek}</td>
        <td class="num ${a.tasksOverdue ? 'neg' : ''}">${a.tasksOverdue}</td>
        <td class="num">${a.openAlerts}</td></tr>`).join('')),
    (el, r) => {
      el.querySelectorAll('[data-sort]').forEach(b => b.onclick = () => {
        st.sort = nextSort(st.sort, b.dataset.sort, b.dataset.sort === 'name'); runAdv();
      });
      el.querySelectorAll('[data-adv]').forEach(b => b.onclick = () => showScorecard(b.dataset.adv, b.textContent));
      if (!st.picked && r.items.length) showScorecard(r.items[0].id, r.items[0].name);
    });
  runAdv();

  /* One advisor, in two questions: where they are right now, and how the last month places them
     in the firm. Two calls, and the two blocks are made not to overlap — the scorecard already
     carries households, assets and overdue follow-ups, so the figures above it are only the three
     the scorecard has no period for. */
  function showScorecard(id, name) {
    st.picked = id;
    const url = '/firm/advisors/' + encodeURIComponent(id);
    load($('f-score'), name,
      () => Promise.all([api('GET', url), api('GET', url + '/scorecard')]),
      ([a, s]) => head(a.name, 'right now, and against the firm')
        + `<dl class="defs"><dt>30-day change</dt><dd class="${pctClass(a.change30d)}">${pct(a.change30d)}</dd>
           <dt>Meetings this week</dt><dd>${a.meetingsThisWeek}</dd>
           <dt>Open alerts</dt><dd>${a.openAlerts}</dd></dl>`
        + `<p class="source">${esc(fmtDate(s.from))} to ${esc(fmtDate(s.to))}</p>`
        + metricRows(s.metrics)
        + '<p class="hint">Rank is shown to a principal only. An advisor reading their own scorecard sees the firm median and no placing.</p>');
  }
}

/* Compliance: the firm's obligations, and the queue of messages waiting for review. The queue
   was only ever reachable from an advisor's own Inbox, which is the wrong door for the person
   who has to sign it off (COMM-03, PO-08). */
export function firmCompliance() {
  $('section').innerHTML = `<h2 class="pagehead">Compliance</h2>
    <div class="grid"><div class="col">${panel('f-comp')}</div><div class="col">${panel('f-queue')}</div></div>`;

  let cstatus = '';
  const runComp = () => load($('f-comp'), 'Obligations',
    /* The order is asked for rather than assumed. It is also the operation's default, but a
       screen that states the order it wants cannot quietly inherit a different one later, and
       the list is paged — reordering it here would order a page rather than the obligations. */
    () => api('GET', '/firm/compliance', { query: { status: cstatus, sort: 'status,desc', size: 12 } }),
    (r) => `<div class="panel-head"><h2>Obligations</h2><span class="hint">overdue first</span><label class="hint">Show
        <select id="cfilter" aria-label="Filter compliance by status">
          <option value="">All</option><option value="overdue">Overdue</option>
          <option value="open">Open</option><option value="done">Done</option></select></label></div>`
      + (r.items.length ? `<ul class="rows">${r.items.map(c => `
          <li><div class="grow"><div class="title">${esc(c.title)}</div>
          <div class="meta">${esc(CATEGORY[c.category] || c.category)} · ${esc(c.advisorName)} · due ${esc(fmtDate(c.dueDate))}</div></div>
          <span class="badge ${c.status === 'overdue' ? 'crit' : c.status === 'done' ? 'ok' : 'plain'}">${esc(c.status)}</span></li>`).join('')}</ul>`
        : '<p class="empty serif">Nothing matches.</p>'),
    (el) => { const f = el.querySelector('#cfilter'); f.value = cstatus; f.onchange = () => { cstatus = f.value; runComp(); }; });
  runComp();

  load($('f-queue'), 'Waiting for review',
    () => api('GET', '/communications', { query: { scope: 'firm', status: 'draft', size: 20 } }),
    (r) => {
      const flagged = r.items.filter(c => c.complianceReview);
      return head('Waiting for review', flagged.length ? '' : '')
        + (flagged.length ? `<ul class="rows">${flagged.map(c => `
            <li><div class="grow"><div class="title">${esc(c.subject)}</div>
            <div class="meta">${esc(c.householdName || 'Practice')} · ${esc(c.advisorName)} · ${esc(daysAgo(c.createdAt).toLowerCase())}</div></div>
            <span class="badge prep">flagged</span></li>`).join('')}</ul>
            <p class="hint">Approving a message stays with the advisor who wrote it. This is the firm's view of what is waiting.</p>`
          : '<p class="empty serif">No messages are waiting for review.</p>');
    });
}

/* Reports at firm scale. GET /reports/practice has taken scope=firm since it was built and
   nothing in the Firm view ever asked for it. */
export function firmReports() {
  $('section').innerHTML = `<h2 class="pagehead">Reports</h2><div class="grid">${panel('f-report', 'wide')}</div>`;
  let days = 30;
  const run = () => load($('f-report'), 'The firm',
    () => api('GET', '/reports/practice', { query: { scope: 'firm', from: firmBackDate(days) } }),
    (r) => `<div class="panel-head"><h2>The firm</h2><label class="hint">Last
        <select id="frepDays" aria-label="Reporting period">
          <option value="30">30 days</option><option value="90">90 days</option></select></label></div>`
      + `<p class="source">${esc(fmtDate(r.from))} to ${esc(fmtDate(r.to))}, against ${esc(fmtDate(r.previousFrom))} to ${esc(fmtDate(r.previousTo))}</p>`
      + metricRows(r.metrics)
      + Object.entries(r.breakdowns || {}).map(([k, rows]) => rows.length
        ? `<h3>${esc(FIRM_BREAKDOWN[k] || k)}</h3><ul class="rows">${rows.map(x => `
            <li><div class="grow"><div class="title">${esc(x.label)}</div></div><span>${x.count}</span></li>`).join('')}</ul>`
        : '').join(''),
    (el) => { const f = el.querySelector('#frepDays'); f.value = String(days); f.onchange = () => { days = +f.value; run(); }; });
  run();
}

const FIRM_BREAKDOWN = { meetingsByType: 'Meetings by type', communicationsByStatus: 'Messages by status', complianceByStatus: 'Compliance by status' };
const firmBackDate = (n) => { const d = new Date(); d.setDate(d.getDate() - n + 1); return localDate(d); };

export function firmBilling() {
  $('section').innerHTML = `<h2 class="pagehead">Billing &amp; fees</h2><div class="grid"><div class="col">${panel('b-sub')}${panel('b-inv')}</div><div class="col">${panel('b-plan')}${panel('b-fees')}</div></div>`;

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
  $('section').innerHTML = `<h2 class="pagehead">Branding</h2><div class="grid"><div class="col">${panel('b-brand')}</div></div>`;
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

export const FIRM_RENDER = { overview: firmOverview, advisors: firmAdvisors, compliance: firmCompliance,
  reports: firmReports, billing: firmBilling, ownership: firmOwnership, branding: firmBranding };

/* Who owns the practice (PO-12). Principal only, and the API enforces that. */
export function firmOwnership() {
  $('section').innerHTML = `<h2 class="pagehead">Ownership</h2><div class="grid">${panel('f-cap', 'wide')}</div>`;
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
