/* Firm sections, for the principal. Billing holds two unrelated concerns deliberately:
   what the firm pays for the platform, and what the firm charges its clients. */
import { api } from './api.js';
import { $, esc, money, moneyFull, pct, pctClass, fmtDate, localDate, daysAgo, CATEGORY } from './format.js';
import { toast, spark, head, panel, load, sortTable, nextSort, alertsList, bookPanel, subnav } from './ui.js';
import { applyBranding, state } from './state.js';
/* The scorecard and the practice report are the same metric shape the advisor's own Reports
   section renders. One renderer, so a firm number and a book number never disagree on form. */
import { metricRows } from './advisor.js';
import { t, raw, locale } from './i18n.js';
/* Contract enums, mapped rather than printed. */
const INVOICE_STATUS_EN = { paid: 'paid', open: 'open', overdue: 'overdue', due: 'due' };
const INVOICE_STATUS = new Proxy(INVOICE_STATUS_EN, { get: (o, k) => (k in o ? t(o[k]) : undefined) });

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
      <div class="stat"><dt>${esc(t('Firm assets under management'))}</dt><dd><div class="figure">${money(s.aum.value)}</div><div class="sub"><span class="${pctClass(s.aum.changeMtd)}">${pct(s.aum.changeMtd)}</span> ${esc(t('this month'))}</div>${spark(s.aum.trend, 'Firm assets, last 12 months')}</dd></div>
      <div class="stat"><dt>${esc(t('Advisors'))}</dt><dd><div class="figure">${s.advisors}</div></dd></div>
      <div class="stat"><dt>${esc(t('Households'))}</dt><dd><div class="figure">${s.households}</div></dd></div>
      <div class="stat"><dt>${esc(t('Open compliance items'))}</dt><dd><div class="figure">${s.openComplianceItems}</div><div class="sub">${esc(t('{n} overdue', { n: s.overdueComplianceItems }))}</div></dd></div>`;
  }).catch(e => { $('strip').innerHTML = `<div class="err" style="padding:16px 0">${esc(e.message)}</div>`; });
}

export function firmView() {
  $('view').innerHTML = `<dl class="strip" id="strip"></dl>
    <div class="viewbody">
      <div id="navrail"><nav class="subnav" id="firmnav" aria-label="${esc(t('Firm sections'))}"></nav></div>
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
  $('section').innerHTML = `<h2 class="pagehead">${esc(t('Across the firm'))}</h2>
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

    $('f-pri').innerHTML = head('Needs you', r.totalItems > r.items.length ? raw(t('top {n} of {total}', { n: r.items.length, total: r.totalItems })) : 'across every advisor')
      + (r.items.length ? `<ul class="rows">${r.items.map(a => `
        <li><span class="sev ${esc(a.priority)}" title="${esc(a.priority)} priority"></span>
        <div class="grow"><div class="title">${esc(a.title)}</div>
        <div class="meta">${esc(a.reason)}</div>
        <div class="source">${esc(a.householdName || 'Practice')} · ${a.citations.map(c => esc(c.source)).join(', ')}</div></div></li>`).join('')}</ul>
        <p class="hint">${esc(r.note)}</p>`
        : `<p class="empty serif">${esc(t('Nothing across the firm needs you today.'))}</p>`);

    load($('f-alerts'), 'Also open', () => api('GET', '/alerts', { query: { scope: 'firm' } }), (al) => {
      const rest = al.items.filter(a => !raised.has(a.id)
        && !(a.action && a.action.type === 'draft_email' && contacted.has(a.householdId)));
      return head('Also open', rest.length ? 'not in the list on the left' : '')
        + (rest.length ? alertsList(rest.slice(0, 6))
          : `<p class="empty serif">${esc(t('Every open alert is already named on the left.'))}</p>`);
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
  $('section').innerHTML = `<h2 class="pagehead">${esc(t('Advisors'))}</h2>
    <div class="grid">${panel('f-advisors', 'wide')}</div>
    <div class="grid" style="margin-top:20px">${panel('f-score', 'wide')}</div>
    <div id="f-bookwrap"></div>`;

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
      el.querySelectorAll('[data-adv]').forEach(b => b.onclick = () => showScorecard(b.dataset.adv, b.textContent.trim()));
      if (!st.picked && r.items.length) showScorecard(r.items[0].id, r.items[0].name);
    });
  runAdv();

  /* One advisor, in two questions: where they are right now, and how the last month places them
     in the firm. Two calls, and the two blocks are made not to overlap — the scorecard already
     carries households, assets and overdue follow-ups, so the figures above it are only the three
     the scorecard has no period for. */
  function showScorecard(id, name) {
    st.picked = id;
    closeBook();
    const url = '/firm/advisors/' + encodeURIComponent(id);
    load($('f-score'), raw(name),
      () => Promise.all([api('GET', url), api('GET', url + '/scorecard')]),
      ([a, s]) => head(raw(a.name), 'right now, and against the firm')
        + `<dl class="defs"><dt>${esc(t('30-day change'))}</dt><dd class="${pctClass(a.change30d)}">${pct(a.change30d)}</dd>
           <dt>${esc(t('Meetings this week'))}</dt><dd>${a.meetingsThisWeek}</dd>
           <dt>${esc(t('Open alerts'))}</dt><dd>${a.openAlerts}</dd></dl>`
        + `<p class="source">${esc(t('{from} to {to}', { from: fmtDate(s.from), to: fmtDate(s.to) }))}</p>`
        + metricRows(s.metrics)
        + `<p class="hint">${esc(t('Rank is shown to a principal only. An advisor reading their own scorecard sees the firm median and no placing.'))}</p>`
        /* The book is not opened by arriving here. Selecting a name reads a row; reading someone's
           book is a separate act, so it takes a separate press — and the press is what the
           advisor is told about. Auto-opening would put "Dana opened your book" in four people's
           activity logs for one glance at the roster. */
        + (a.id === ownAdvisorId()
          ? `<p class="hint">${esc(t('This is your own book. It is the Advisor view, where you can act in it.'))}</p>`
          : `<button class="btn" id="openBook" data-adv="${esc(a.id)}">${esc(t('Open {name}\u2019s book', { name: a.name.split(' ')[0] }))}</button>
             <p class="hint">${esc(t('Read-only, and {name} is told: it appears in their activity log.', { name: a.name.split(' ')[0] }))}</p>`),
      (el, [a]) => { const b = el.querySelector('#openBook'); if (b) b.onclick = () => openBook(a.id, a.name); });
  }
}

const ownAdvisorId = () => (state.session && state.session.advisorId) || null;

function closeBook() { const w = $('f-bookwrap'); if (w) w.innerHTML = ''; }

/* Supervision, not impersonation (PO-06, and the question left open in HANDOFF section 9).
   What a principal gets is the firm's records for this advisor's households — which they can
   already read in full at firm scope, so nothing here is a new permission, only a narrower one.
   What they do not get is the advisor's screen: no activity log, no meetings, no prospects, no
   ability to act. The contract enforces that by not offering advisorId on any of them.

   The notice says all three things a person needs: what this is, what it is not, and that the
   advisor knows. Not dashed — dashed means draft in this design system (styles.css), and this
   is a record, not a draft. */
function openBook(id, name) {
  const first = name.split(' ')[0];
  $('f-bookwrap').innerHTML = `
    <div class="supervision" role="region" aria-label="${esc(t('Reading {name}\u2019s book', { name }))}">
      <p><strong>${esc(t('You are reading {name}\u2019s book.', { name }))}</strong>
      ${esc(t('Read-only: nothing here acts in {name}\u2019s name. {name} is told \u2014 this shows in their own activity log, not an audit table they never see.', { name: first }))}</p>
      <button class="btn quiet" id="closeBook">${esc(t('Close {name}\u2019s book', { name: first }))}</button>
    </div>
    <div class="grid" style="margin-top:20px">${panel('f-advbook', 'wide')}</div>
    <div class="grid" style="margin-top:20px">${panel('f-advpri')}${panel('f-advcomm')}</div>`;
  $('closeBook').onclick = () => { closeBook(); $('f-score').scrollIntoView({ block: 'nearest' }); };

  bookPanel({ scope: 'firm', advisorId: id, canShare: false, id: 'f-advbook',
    title: raw(t('{name}\u2019s households', { name: first })), size: 6 });

  const needsThem = raw(t('Needs {name}', { name: first }));
  load($('f-advpri'), needsThem,
    () => api('GET', '/next-actions', { query: { scope: 'firm', advisorId: id, size: 6 } }),
    (r) => head(needsThem, r.totalItems > r.items.length ? raw(t('top {n} of {total}', { n: r.items.length, total: r.totalItems })) : '')
      + (r.items.length ? `<ul class="rows">${r.items.map(a => `
        <li><span class="sev ${esc(a.priority)}" title="${esc(a.priority)} priority"></span>
        <div class="grow"><div class="title">${esc(a.title)}</div>
        <div class="meta">${esc(a.reason)}</div>
        <div class="source">${esc(a.householdName || t('Practice'))}</div></div></li>`).join('')}</ul>
        <p class="hint">${esc(t('Drafts, as they are for {name}. Adding one to their follow-ups is theirs to do, not yours.', { name: first }))}</p>`
        : `<p class="empty serif">${esc(t('Nothing in {name}\u2019s book needs answering today.', { name: first }))}</p>`));

  const waitingOn = raw(t('Waiting on {name}', { name: first }));
  load($('f-advcomm'), waitingOn,
    () => api('GET', '/communications', { query: { scope: 'firm', advisorId: id, status: 'draft', size: 20 } }),
    (r) => head(waitingOn, r.items.length ? 'unapproved drafts' : '')
      + (r.items.length ? `<ul class="rows">${r.items.map(c => `
          <li><div class="grow"><div class="title">${esc(c.subject)}</div>
          <div class="meta">${esc(c.householdName || t('Practice'))} · ${esc(daysAgo(c.createdAt).toLowerCase())}</div></div>
          ${c.complianceReview ? `<span class="badge prep">${esc(t('flagged'))}</span>` : ''}</li>`).join('')}</ul>
          <p class="hint">${esc(t('Approving a message stays with the advisor who wrote it (X-03).'))}</p>`
        : `<p class="empty serif">${esc(t('Nothing of {name}\u2019s is waiting.', { name: first }))}</p>`));
}

/* Compliance: the firm's obligations, and the queue of messages waiting for review. The queue
   was only ever reachable from an advisor's own Inbox, which is the wrong door for the person
   who has to sign it off (COMM-03, PO-08). */
export function firmCompliance() {
  $('section').innerHTML = `<h2 class="pagehead">${esc(t('Compliance'))}</h2>
    <div class="grid"><div class="col">${panel('f-comp')}</div><div class="col">${panel('f-queue')}</div></div>`;

  let cstatus = '';
  const runComp = () => load($('f-comp'), 'Obligations',
    /* The order is asked for rather than assumed. It is also the operation's default, but a
       screen that states the order it wants cannot quietly inherit a different one later, and
       the list is paged — reordering it here would order a page rather than the obligations. */
    () => api('GET', '/firm/compliance', { query: { status: cstatus, sort: 'status,desc', size: 12 } }),
    (r) => `<div class="panel-head"><h2>${esc(t('Obligations'))}</h2><span class="hint">${esc(t('overdue first'))}</span><label class="hint">${esc(t('Show'))}
        <select id="cfilter" aria-label="${esc(t('Filter compliance by status'))}">
          <option value="">${esc(t('All'))}</option><option value="overdue">${esc(t('Overdue'))}</option>
          <option value="open">${esc(t('Open'))}</option><option value="done">${esc(t('Done'))}</option></select></label></div>`
      + (r.items.length ? `<ul class="rows">${r.items.map(c => `
          <li><div class="grow"><div class="title">${esc(c.title)}</div>
          <div class="meta">${esc(CATEGORY[c.category] || c.category)} · ${esc(c.advisorName)} · ${esc(t('due {date}', { date: fmtDate(c.dueDate) }))}</div></div>
          <span class="badge ${c.status === 'overdue' ? 'crit' : c.status === 'done' ? 'ok' : 'plain'}">${esc(COMPLIANCE_STATUS[c.status] || c.status)}</span></li>`).join('')}</ul>`
        : `<p class="empty serif">${esc(t('Nothing matches.'))}</p>`),
    (el) => { const f = el.querySelector('#cfilter'); f.value = cstatus; f.onchange = () => { cstatus = f.value; runComp(); }; });
  runComp();

  load($('f-queue'), 'Waiting for review',
    () => api('GET', '/communications', { query: { scope: 'firm', status: 'draft', size: 20 } }),
    (r) => {
      const flagged = r.items.filter(c => c.complianceReview);
      return head('Waiting for review', flagged.length ? '' : '')
        + (flagged.length ? `<ul class="rows">${flagged.map(c => `
            <li><div class="grow"><div class="title">${esc(c.subject)}</div>
            <div class="meta">${esc(c.householdName || t('Practice'))} · ${esc(c.advisorName)} · ${esc(daysAgo(c.createdAt).toLowerCase())}</div></div>
            <span class="badge prep">${esc(t('flagged'))}</span></li>`).join('')}</ul>
            <p class="hint">${esc(t('Approving a message stays with the advisor who wrote it. This is the firm\u2019s view of what is waiting.'))}</p>`
          : `<p class="empty serif">${esc(t('No messages are waiting for review.'))}</p>`);
    });
}

/* Reports at firm scale. GET /reports/practice has taken scope=firm since it was built and
   nothing in the Firm view ever asked for it. */
export function firmReports() {
  $('section').innerHTML = `<h2 class="pagehead">${esc(t('Reports'))}</h2><div class="grid">${panel('f-report', 'wide')}</div>`;
  let days = 30;
  const run = () => load($('f-report'), 'The firm',
    () => api('GET', '/reports/practice', { query: { scope: 'firm', from: firmBackDate(days) } }),
    (r) => `<div class="panel-head"><h2>${esc(t('The firm'))}</h2><label class="hint">${esc(t('Last'))}
        <select id="frepDays" aria-label="${esc(t('Reporting period'))}">
          <option value="30">${esc(t('30 days'))}</option><option value="90">${esc(t('90 days'))}</option></select></label></div>`
      + `<p class="source">${esc(t('{from} to {to}, against {pfrom} to {pto}', { from: fmtDate(r.from), to: fmtDate(r.to), pfrom: fmtDate(r.previousFrom), pto: fmtDate(r.previousTo) }))}</p>`
      + metricRows(r.metrics)
      + Object.entries(r.breakdowns || {}).map(([k, rows]) => rows.length
        ? `<h3>${esc(t(FIRM_BREAKDOWN[k] || k))}</h3><ul class="rows">${rows.map(x => `
            <li><div class="grow"><div class="title">${esc(x.label)}</div></div><span>${x.count}</span></li>`).join('')}</ul>`
        : '').join(''),
    (el) => { const f = el.querySelector('#frepDays'); f.value = String(days); f.onchange = () => { days = +f.value; run(); }; });
  run();
}

/* Contract enums, mapped rather than printed: 'overdue' inside a French sentence is a leak. */
const COMPLIANCE_STATUS_EN = { open: 'open', overdue: 'overdue', done: 'done' };
const COMPLIANCE_STATUS = new Proxy(COMPLIANCE_STATUS_EN, { get: (o, k) => (k in o ? t(o[k]) : undefined) });

const FIRM_BREAKDOWN = { meetingsByType: 'Meetings by type', communicationsByStatus: 'Messages by status', complianceByStatus: 'Compliance by status' };
const firmBackDate = (n) => { const d = new Date(); d.setDate(d.getDate() - n + 1); return localDate(d); };

export function firmBilling() {
  $('section').innerHTML = `<h2 class="pagehead">${esc(t('Billing & fees'))}</h2><div class="grid"><div class="col">${panel('b-sub')}${panel('b-inv')}</div><div class="col">${panel('b-plan')}${panel('b-fees')}</div></div>`;

  // Where the model status belongs: beside the AI usage meter a principal is already reading.
  load($('b-sub'), 'Platform subscription',
    () => Promise.all([api('GET', '/firm/billing/subscription'), api('GET', '/ai/status').catch(() => null)]),
    ([s, ai]) =>
    head('Platform subscription', raw(s.plan)) + `
    <dl class="defs"><dt>${esc(t('Seats'))}</dt><dd>${esc(t('{used} of {total} in use', { used: s.seats.used, total: s.seats.purchased }))}</dd>
      <dt>${esc(t('Renews'))}</dt><dd>${esc(fmtDate(s.renewalDate))}</dd>
      <dt>${esc(t('Payment method'))}</dt><dd>${esc(t('{brand} {number}, expires {month}/{year}', { brand: s.paymentMethod.brand, number: s.paymentMethod.maskedNumber, month: s.paymentMethod.expiryMonth, year: s.paymentMethod.expiryYear }))}</dd>
      <dt>${esc(t('This invoice'))}</dt><dd>${moneyFull(s.currentInvoice.amount)}, ${esc(INVOICE_STATUS[s.currentInvoice.status] || s.currentInvoice.status)} ${esc(fmtDate(s.currentInvoice.dueDate))}</dd></dl>
    <h3>${esc(t('Usage this period'))}</h3>
    <ul class="meters">${s.meters.map(m => { const p = Math.min(100, Math.round(m.used / m.included * 100)); return `
      <li><div class="meter-top"><span>${esc(m.label)}</span><span class="meta">${esc(t('{used} of {total} {unit}', { used: m.used.toLocaleString(locale()), total: m.included.toLocaleString(locale()), unit: m.unit }))}</span></div>
      <div class="meter"><span style="width:${p}%" class="${p >= 90 ? 'hot' : ''}"></span></div></li>`; }).join('')}</ul>
    ${ai ? `<p class="hint">${ai.live
      ? esc(t('Drafting is live, on {model}.', { model: ai.model }))
      : esc(t('Drafting is offline, so nothing here is consuming the AI allowance.')) + ' ' + esc(ai.reason || '')}</p>` : ''}`);

  load($('b-inv'), 'Invoices', () => api('GET', '/firm/billing/invoices'), (r) =>
    head('Invoices', raw(t('{n} on file', { n: r.totalItems }))) + `<ul class="rows">${r.items.map(i => `
      <li><div class="grow"><div class="title">${esc(i.number)}</div><div class="meta">${esc(t('Issued {date}', { date: fmtDate(i.issuedDate) }))}</div></div>
      <span>${moneyFull(i.amount)}</span><span class="badge ${i.status === 'paid' ? 'ok' : i.status === 'overdue' ? 'crit' : 'plain'}">${esc(INVOICE_STATUS[i.status] || i.status)}</span>
      <button class="btn" data-inv="${esc(i.id)}">${esc(t('Breakdown'))}</button></li>`).join('')}</ul>`,
  (el) => el.querySelectorAll('[data-inv]').forEach(b => b.onclick = async () => {
    const dlg = $('dlg'); dlg.innerHTML = `<p class="empty">${esc(t('Loading\u2026'))}</p>`; dlg.showModal();
    try {
      const i = await api('GET', '/firm/billing/invoices/' + encodeURIComponent(b.dataset.inv));
      dlg.innerHTML = `<button class="btn quiet close" data-close>${esc(t('Close'))}</button><h2 id="dlgTitle">${esc(i.number)}</h2>
        <div class="meta">${esc(t('Issued {date}', { date: fmtDate(i.issuedDate) }))} • ${esc(t('due {date}', { date: fmtDate(i.dueDate) }))}</div>
        <div class="tablewrap"><table><thead><tr><th>${esc(t('Item'))}</th><th class="num">${esc(t('Quantity'))}</th><th class="num">${esc(t('Each'))}</th><th class="num">${esc(t('Amount'))}</th></tr></thead>
        <tbody>${i.lines.map(l => `<tr><td>${esc(l.description)}</td><td class="num">${l.quantity}</td><td class="num">${moneyFull(l.unitAmount)}</td><td class="num">${moneyFull(l.amount)}</td></tr>`).join('')}
        <tr><td colspan="3"><strong>${esc(t('Total'))}</strong></td><td class="num"><strong>${moneyFull(i.amount)}</strong></td></tr></tbody></table></div>`;
    } catch (e) { dlg.innerHTML = `<button class="btn quiet close" data-close>${esc(t('Close'))}</button><p class="err">${esc(e.message)}</p>`; }
  }));

  runFeePlan();

  // The principal is also an advisor here, so /billing/fees resolves to their own book.
  load($('b-fees'), 'Client fees', () => api('GET', '/billing/fees', { query: { size: 100 } }), (r) =>
    head('Client fees', raw(t('Next run {date}', { date: fmtDate(r.nextRunDate) }))) + `
    <h3>${esc(t('Schedule'))}</h3>
    <div class="tablewrap"><table><thead><tr><th>${esc(t('Assets'))}</th><th class="num">${esc(t('Annual rate'))}</th></tr></thead><tbody>
    ${r.schedule.map(b => `<tr><td>${esc(b.maxAssets ? t('{from} to {to}', { from: money(b.minAssets), to: money(b.maxAssets) }) : t('{from} and above', { from: money(b.minAssets) }))}</td><td class="num">${b.annualRatePct}%</td></tr>`).join('')}
    </tbody></table></div>
    <h3>${esc(t('This quarter'))}</h3>
    <div class="tablewrap"><table><thead><tr><th>${esc(t('Household'))}</th><th class="num">${esc(t('Billable'))}</th><th class="num">${esc(t('Rate'))}</th><th class="num">${esc(t('Fee'))}</th></tr></thead><tbody>
    ${r.items.map(f => `<tr><td>${esc(f.householdName)}</td><td class="num">${money(f.billableAssets)}</td><td class="num">${f.annualRatePct}%</td><td class="num">${moneyFull(f.quarterlyFee)}</td></tr>`).join('')}
    <tr><td colspan="3"><strong>${esc(t('Total'))}</strong></td><td class="num"><strong>${moneyFull(r.totalQuarterlyFees)}</strong></td></tr></tbody></table></div>
    <p class="hint">${esc(t('Clients see their own fee from this same schedule in the portal.'))}</p>`);
}

export function firmBranding() {
  $('section').innerHTML = `<h2 class="pagehead">${esc(t('Branding'))}</h2><div class="grid"><div class="col">${panel('b-brand')}</div></div>`;
  load($('b-brand'), 'Branding', () => api('GET', '/firm/branding'), (b) =>
    head('Branding', 'Applies to every view, including the client portal') + `
    <div class="field"><label for="brFirm">${esc(t('Firm name'))}</label><input type="text" id="brFirm" value="${esc(b.firmName)}"></div>
    <div class="field"><label for="brAdv">${esc(t('Advisor name and credential'))}</label><input type="text" id="brAdv" value="${esc(b.advisorDisplayName || '')}"></div>
    <div class="field"><label for="brMark">${esc(t('Mark letter'))}</label><input type="text" id="brMark" maxlength="1" value="${esc(b.markLetter)}"></div>
    <div class="field"><label for="brColor">${esc(t('Accent colour'))}</label><input type="color" id="brColor" value="${esc(b.accentColor)}"></div>
    <button class="btn primary" id="brSave">${esc(t('Save branding'))}</button>
    <p class="hint">${esc(t('Last changed by {who} {when}. Only a principal can change this; every advisor and client sees the result.', { who: b.updatedBy || t('nobody'), when: daysAgo(b.updatedAt).toLowerCase() }))}</p>`,
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
  $('section').innerHTML = `<h2 class="pagehead">${esc(t('Ownership'))}</h2><div class="grid">${panel('f-cap', 'wide')}</div>`;
  load($('f-cap'), 'Ownership', () => api('GET', '/firm/cap-table'), (c) =>
    head('Ownership', raw(t('{n} shares as at {date}', { n: c.totalShares.toLocaleString(locale()), date: fmtDate(c.asOf) })))
    + `<div class="tablewrap"><table><thead><tr><th>${esc(t('Holder'))}</th><th>${esc(t('Class'))}</th><th class="num">${esc(t('Shares'))}</th><th class="num">${esc(t('Vested'))}</th><th class="num">${esc(t('Ownership'))}</th><th>${esc(t('Vesting ends'))}</th></tr></thead><tbody>
      ${c.holders.map(h => `<tr><td>${esc(h.holder)}<div class="meta">${esc(h.role)}</div></td>
        <td>${esc((c.shareClasses.find(s2 => s2.id === h.shareClass) || {}).name || h.shareClass)}</td>
        <td class="num">${h.shares.toLocaleString(locale())}</td>
        <td class="num">${h.unvested ? h.vested.toLocaleString(locale()) : '—'}</td>
        <td class="num">${h.ownershipPct}%</td>
        <td>${h.vestingEndsOn ? esc(fmtDate(h.vestingEndsOn)) : '—'}</td></tr>`).join('')}
      </tbody></table></div>
    <p class="hint">${esc(t('The firm\u2019s own ownership, not a client\u2019s. Visible to a principal only.'))}</p>`);
}

/* The schedule is the firm's, so only a principal may change it. Tiers must meet exactly:
   the API refuses a gap, and the UI says why before you try. */
function runFeePlan() {
  load($('b-plan'), 'Fee schedule', () => api('GET', '/billing/fee-plan'), (p) =>
    head('Fee schedule', p.canEditSchedule ? 'Editable' : 'Set by the principal')
    + `<ul class="tiers" id="tierList">${p.schedule.map((b, i) => `<li>
        <span>${esc(b.maxAssets ? t('{from} to {to}', { from: money(b.minAssets), to: money(b.maxAssets) }) : t('{from} and above', { from: money(b.minAssets) }))}</span>
        ${p.canEditSchedule
          ? `<input type="number" step="0.05" min="0" max="5" value="${b.annualRatePct}" data-tier="${i}" aria-label="${esc(t('Annual rate for this tier'))}"> <span class="meta">%</span>`
          : `<span>${b.annualRatePct}%</span>`}
      </li>`).join('')}</ul>
    ${p.canEditSchedule ? `<button class="btn primary" id="planSave">${esc(t('Save schedule'))}</button>` : ''}
    <p class="hint">${esc(t('Last changed by {who} {when}. Tiers must meet exactly, so no household is left without a rate.', { who: p.updatedBy || t('nobody'), when: daysAgo(p.updatedAt).toLowerCase() }))}</p>
    ${p.overrides.length ? `<h3>${esc(t('Overrides'))}</h3><ul class="rows">${p.overrides.map(o => `
      <li><div class="grow"><div class="title">${esc(o.householdName)}</div><div class="meta">${esc(o.reason)} • ${esc(o.setBy)}</div></div>
      <span>${o.annualRatePct}%</span></li>`).join('')}</ul>` : ''}`,
  (el, p) => {
    const btn = el.querySelector('#planSave');
    if (!btn) return;
    btn.onclick = async () => {
      const schedule = p.schedule.map((b, i) => ({ ...b, annualRatePct: Number(el.querySelector(`[data-tier="${i}"]`).value) }));
      btn.disabled = true;
      try { await api('PATCH', '/billing/fee-plan', { body: { schedule } }); toast('Schedule saved.'); runFeePlan(); }
      catch (e) { toast(e.message); btn.disabled = false; }
    };
  });
}
