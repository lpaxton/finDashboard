/* The advisor's own sections. Everything here is internal: none of it may reach a client. */
import { api } from './api.js';
import { $, esc, money, moneyFull, pct, pctClass, fmtTime, fmtDate, localDate, daysAgo, daysBetween, dueLabel, syncBadge, syncNotice, sourceLine, sourceKind, CATEGORY } from './format.js';
import { toast, spark, head, panel, load, alertsList, openHousehold, bookPanel, spine, roleMark, roleTabs, disclosure, wireDisclosures, snoozeChoices, SNOOZE_CHOICES, loadActivity, onUndo } from './ui.js';
import { snooze, unsnooze, unsnoozeAll, dropExpiredSnoozes, get as vsGet, set as vsSet, isSnoozed } from './viewstate.js';
import { ROLES, ROLE, collectRoleWork, rankRoles } from './roles.js';
import { state } from './state.js';

/* The spine (UX_IA §2). Today, Inbox and Calendar are used every day by every role, so they sit
   at the top. The four roles are part of the frame, in a fixed order that never changes
   whatever Today does. Systems sits at the bottom. */
export const ADV_SECTIONS = [['today', 'Today'], ['inbox', 'Inbox'], ['calendar', 'Calendar'],
  ['role:bd', 'Prospecting'], ['role:ca', 'Clients'], ['role:op', 'Operations'], ['role:pd', 'Development'],
  ['glance', 'Book at a glance'], ['systems', 'Systems']];
export let advSection = 'today';

/* Tabs inside each role home (UX_IA §3). One level below the spine and no deeper (FO-07).
   Compliance is principal-only in the contract, so it appears only for someone who can read it. */
export const ROLE_TABS = {
  bd: () => [['overview', 'Overview'], ['pipeline', 'Pipeline'], ['referrals', 'Referrals']],
  ca: () => [['overview', 'Overview'], ['households', 'Households'], ['meetings', 'Meetings'], ['onboarding', 'Onboarding']],
  op: () => [['overview', 'Overview'], ['reports', 'Reports'], ['billing', 'Billing & fees'],
    ...(state.session && state.session.roles.includes('principal') ? [['compliance', 'Compliance']] : [])],
  pd: () => [['playbooks', 'Playbooks'], ['scorecard', 'Scorecard']]
};

export function advLoadStrip(el) {
  const target = el || $('strip');
  if (!target) return Promise.resolve();
  return api('GET', '/summary').then(s => {
    target.innerHTML = `
      <div class="stat"><dt>Assets under management</dt><dd><div class="figure">${money(s.aum.value)}</div><div class="sub"><span class="${pctClass(s.aum.changeMtd)}">${pct(s.aum.changeMtd)}</span> this month</div>${spark(s.aum.trend, 'Assets under management, last 12 months')}</dd></div>
      <div class="stat"><dt>Households</dt><dd><div class="figure">${s.households}</div></dd></div>
      <div class="stat"><dt>Meetings this week</dt><dd><div class="figure">${s.meetingsThisWeek}</div></dd></div>
      <div class="stat"><dt>Open tasks</dt><dd><div class="figure">${s.tasksOpen}</div><div class="sub">${s.tasksDueToday} due today</div></dd></div>`;
  }).catch(e => { target.innerHTML = `<div class="err" style="padding:16px 0">${esc(e.message)}</div>`; });
}

/* What the advisor pinned. The platform may suggest a pin but never adds one itself
   (UX_IA §6.1, ST-07, TM-03). */
const pins = () => vsGet('pins', []) || [];
export const isPinned = (key) => pins().some(p => p.key === key);
export function togglePin(key, label) {
  const now = pins().filter(p => p.key !== key);
  vsSet('pins', isPinned(key) ? now : [...now, { key, label }]);
}

export function advisorView() {
  $('view').innerHTML = `<div class="viewbody">
      <div id="navrail"><nav class="subnav" id="advnav" aria-label="Advisor navigation"></nav></div>
      <div id="section"></div>
    </div>`;
  const go = (k) => {
    advSection = k;
    drawSpine(go);
    (ADV_RENDER[k] || ADV_RENDER.today)();
  };
  go(advSection);
}

function drawSpine(go) {
  const p = pins();
  spine($('advnav'), [
    { items: [['today', 'Today'], ['inbox', 'Inbox'], ['calendar', 'Calendar']] },
    { label: 'Your roles', items: ROLES.map(r => ['role:' + r.key, r.name, r.mark]) },
    ...(p.length ? [{ label: 'Pinned', items: p.map(x => [x.key, x.label]) }] : []),
    { items: [['glance', 'Book at a glance'], ['systems', 'Systems']] }
  ], advSection, go);
}

export const goSection = (k) => { advSection = k; advisorView(); };

/* A portfolio signal is computed from holdings, and now says so: Signal.source arrived with the
   contract run. */

/* ---- Today ---------------------------------------------------------------------------------
 * Four role cards, one action each, one card leading (FO-01 to FO-04, FO-11). The number strip
 * has moved to Book at a glance (UX_IA §4) and Next best action has folded into the cards, so
 * nothing else competes for attention here (FO-03).
 */
export function advToday() {
  $('section').innerHTML = `<div id="todayHead"></div><div class="rolecards" id="roleCards">
    ${ROLES.map(() => '<div class="skel m" style="height:150px"></div>').join('')}</div>
    <div class="grid" style="margin-top:20px"><div class="col">${panel('w-meetings')}</div><div class="col">${panel('w-signals')}</div></div>`;
  drawRoleCards();
  drawMeetings();
  drawSignals();
  onUndo(() => { drawRoleCards(); });
}

/* An item the advisor answered "not this" to is gone until something changes (CS-04, CS-05).
   It lives in view state because there is nowhere in the contract to put a preference about a
   suggestion; the reason teaches nothing yet, which is honest and is logged. */
const itemKey = (w) => w.role + ':' + (w.action.id || w.meaning.slice(0, 40));
const notThis = () => vsGet('notThis', []) || [];

async function drawRoleCards() {
  const host = $('roleCards');
  if (!host) return;
  dropExpiredSnoozes();
  let work = [];
  try { work = await collectRoleWork(state.session && state.session.advisorId); }
  catch (e) { host.innerHTML = `<div class="err">${esc(e.message || "Couldn't work out today.")}</div>`; return; }

  const hidden = new Set(notThis());
  work = work.filter(w => !hidden.has(itemKey(w)) && !isSnoozed(itemKey(w)));
  const pinnedOrder = !!vsGet('roleOrderPinned', false);
  const { order, byRole, lead, reason } = rankRoles(work, pinnedOrder);

  $('todayHead').innerHTML = `<div class="todayline">
    ${reason ? `<button class="orderpill" id="whyOrder" aria-expanded="false"><span class="dot" aria-hidden="true"></span>Why today's order changed</button>` : ''}
    <button class="btn quiet" id="pinOrder" aria-pressed="${pinnedOrder}">${pinnedOrder ? 'Unpin this order' : 'Pin this order'}</button>
  </div><p class="orderwhy" id="orderWhy" hidden>${esc(reason || '')}</p>`;
  const why = $('whyOrder');
  if (why) why.onclick = () => {
    const el = $('orderWhy'), open = el.hidden;
    el.hidden = !open; why.setAttribute('aria-expanded', String(open));
  };
  $('pinOrder').onclick = () => { vsSet('roleOrderPinned', !pinnedOrder); drawRoleCards(); };

  host.innerHTML = order.map(k => roleCard(k, byRole[k], k === lead && !pinnedOrder)).join('');
  wireRoleCards(host, byRole);
}

function roleCard(key, items, isLead) {
  const r = ROLE[key];
  const top = items[0];
  const rest = items.slice(1, 3);
  const body = !top
    /* An empty role says so in one sentence, and never invents a task (FO-05). */
    ? `<p class="empty serif">Nothing pressing in ${esc(r.name.toLowerCase())} today.</p>`
    : `<p class="card-meaning">${esc(top.meaning)}</p>
       <div class="well">
         <span class="well-label">Suggested</span>
         <div class="well-actions">
           <button class="btn primary" data-do="${esc(itemKey(top))}">${esc(top.action.label)}</button>
           <button class="btn" data-later="${esc(itemKey(top))}">Not now</button>
           <button class="btn quiet" data-notthis="${esc(itemKey(top))}">Not this</button>
         </div>
       </div>
       <p class="source">${esc(sourceLine(top.source.kinds, top.source.at))}</p>
       ${rest.length ? disclosure('role:' + key, `Show the next ${rest.length === 1 ? 'one' : rest.length}`,
         { openLabel: 'Hide the next ' + (rest.length === 1 ? 'one' : rest.length),
           body: `<ul class="rows">${rest.map(w => `<li><div class="grow"><div class="title">${esc(w.meaning)}</div>
             <div class="source">${esc(sourceLine(w.source.kinds, w.source.at))}</div></div>
             <button class="btn" data-do="${esc(itemKey(w))}">${esc(w.action.label)}</button></li>`).join('')}</ul>` }) : ''}`;
  return `<article class="rolecard${isLead ? ' lead' : ''} role-${esc(key)}" data-role="${esc(key)}">
    <div class="band">${roleMark(r.mark, key)}<span class="band-name">${esc(r.name)}</span>
      ${isLead ? '<span class="chip">Leading today</span>' : ''}
      <button class="pin" data-pinrole="${esc(key)}" aria-pressed="${isPinned('role:' + key)}" aria-label="${isPinned('role:' + key) ? 'Unpin' : 'Pin'} ${esc(r.name)}">${isPinned('role:' + key) ? '★' : '☆'}</button></div>
    <div class="cardbody">${body}</div>
    <button class="link cardlink" data-open-role="${esc(key)}">Open ${esc(r.name.toLowerCase())}</button>
  </article>`;
}

function wireRoleCards(host, byRole) {
  const all = Object.values(byRole).flat();
  const find = (k) => all.find(w => itemKey(w) === k);
  wireDisclosures(host);
  host.querySelectorAll('[data-open-role]').forEach(b => b.onclick = () => goSection('role:' + b.dataset.openRole));
  host.querySelectorAll('[data-pinrole]').forEach(b => b.onclick = () => {
    const k = b.dataset.pinrole;
    togglePin('role:' + k, ROLE[k].name);
    advisorView();
  });
  host.querySelectorAll('[data-do]').forEach(b => b.onclick = () => runItemAction(find(b.dataset.do), b));
  /* Not now, and the advisor picks when (CS-05). An item that stands on a real alert is set
     aside through the contract, so it survives a change of browser and lands in the activity
     log; anything else has nowhere in the contract to live and is kept in view state. The
     difference is invisible to the advisor and is the honest one to make. */
  host.querySelectorAll('[data-later]').forEach(b => b.onclick = () => {
    const w = find(b.dataset.later), row = b.closest('.well-actions'), keep = row.innerHTML, well = b.closest('.well');
    row.outerHTML = snoozeChoices(b.dataset.later);
    const group = well.querySelector('.notnow');
    group.querySelector('[data-snooze-cancel]').onclick = () => { group.outerHTML = `<div class="well-actions">${keep}</div>`; drawRoleCards(); };
    group.querySelectorAll('[data-snooze]').forEach(c => c.onclick = async () => {
      const until = SNOOZE_CHOICES.find(([k]) => k === c.dataset.when)[2]();
      const said = 'Set aside. It comes back ' + c.textContent.toLowerCase() + '.';
      if (w && w.alertId) {
        try {
          await api('PATCH', '/alerts/' + encodeURIComponent(w.alertId), { body: { status: 'snoozed', snoozedUntil: until.toISOString() } });
          toast(said, { label: 'Undo', run: () => reopenAlert(w.alertId) });
        } catch (e) { toast(e.message); }
      } else {
        snooze(itemKey(w), until);
        toast(said, { label: 'Undo', run: () => { unsnooze(itemKey(w)); drawRoleCards(); } });
      }
      drawRoleCards();
      loadActivity();
    });
    group.querySelector('[data-snooze]').focus();
  });

  host.querySelectorAll('[data-notthis]').forEach(b => b.onclick = async () => {
    const w = find(b.dataset.notthis);
    if (w && w.alertId) {
      try {
        await api('PATCH', '/alerts/' + encodeURIComponent(w.alertId), { body: { status: 'dismissed' } });
        toast('Put away.', { label: 'Undo', run: () => reopenAlert(w.alertId) });
      } catch (e) { toast(e.message); return; }
    } else {
      const k = itemKey(w);
      vsSet('notThis', [...notThis(), k]);
      toast('Put away. It will not come back unless something changes.',
        { label: 'Undo', run: () => { vsSet('notThis', notThis().filter(x => x !== k)); drawRoleCards(); } });
    }
    drawRoleCards();
    loadActivity();
  });
}

async function reopenAlert(id) {
  try { await api('PATCH', '/alerts/' + encodeURIComponent(id), { body: { status: 'open' } }); drawRoleCards(); loadActivity(); }
  catch (e) { toast(e.message); }
}

async function runItemAction(w, btn) {
  if (!w) return;
  const a = w.action;
  if (a.kind === 'household') return openHousehold(a.id, true);
  if (a.kind === 'prospect') return openProspect(a.id, drawRoleCards);
  if (a.kind === 'communication') { vsSet('openComm', a.id); vsSet('inboxTab', 'approve'); return goSection('inbox'); }
  if (a.kind === 'inbox') return goSection('inbox');
  if (a.kind === 'role') return goSection('role:' + a.id);
  if (a.kind === 'next-action') {
    const t = a.nextAction.suggestedTask;
    btn.disabled = true;
    try {
      await api('POST', '/tasks', { body: { title: t.title, dueDate: t.dueDate, householdId: t.householdId || undefined } });
      toast('Added to your follow-ups.');
      drawRoleCards();
    } catch (e) { toast(e.message); btn.disabled = false; }
  }
}

/* Today's meetings keep their place: they are time-bound, which is what earns a place (FO-03). */
function drawMeetings() {
  load($('w-meetings'), "Today's meetings", () => api('GET', '/meetings'), (r) => {
    const list = r.items, nextIdx = list.findIndex(m => new Date(m.startsAt) > new Date());
    return head("Today's meetings", list.length + ' scheduled') + (list.length ? `<ol class="timeline">${list.map((m, i) => `
      <li class="meet${i === nextIdx ? ' next' : ''}"><div class="meet-row"><span class="time">${esc(fmtTime(m.startsAt))}</span><span class="client">${esc(m.householdName || m.prospectName || 'No client attached')}</span><span class="type">${esc(m.type)}</span>
      ${i === nextIdx ? '<span class="badge next">Next up</span>' : ''}<span class="badge ${m.prepStatus === 'ready' ? 'ready' : 'prep'}">${m.prepStatus === 'ready' ? 'Prep ready' : 'Needs prep'}</span></div>
      ${disclosure('brief:' + m.id, 'Show the prep brief', { openLabel: 'Hide the prep brief', cls: 'brief' })}</li>`).join('')}</ol>` : '<p class="empty">No meetings today.</p>');
  }, (el) => wireDisclosures(el, async (key, inner) => {
    inner.innerHTML = '<p class="meta">Loading…</p>';
    try {
      const m = await api('GET', '/meetings/' + encodeURIComponent(key.slice('brief:'.length)));
      /* The receipt: what the platform did, from what, and when (TR-04, UX-007). */
      inner.innerHTML = `<p class="meta">${esc(m.brief || 'No brief yet.')}</p>`
        + (m.preparedAt ? `<p class="receipt"><span class="dot" aria-hidden="true"></span>Prepared by the platform at ${esc(fmtTime(m.preparedAt))} from ${esc(sourceLine(m.briefSources).replace(/^From /, ''))}.</p>`
          : m.briefSources ? `<p class="source">${esc(sourceLine(m.briefSources))}</p>` : '');
    } catch { inner.innerHTML = '<p class="meta">The brief could not be loaded. Close this and open it again to retry.</p>'; }
  }));
}

/* Every signal leads with what it means and one suggested action (FO-09, CS-03, UX-011). */
const SIGNAL_MEANING = {
  tax_loss_harvesting: (s) => `${s.count} ${s.count === 1 ? 'household has' : 'households have'} losses worth harvesting. ${s.detail}.`,
  concentration: (s) => `${s.count} ${s.count === 1 ? 'household is' : 'households are'} over the concentration limit. ${s.detail}.`,
  allocation_drift: (s) => `${s.count} ${s.count === 1 ? 'household has' : 'households have'} drifted from target. ${s.detail}.`,
  idle_cash: (s) => `${s.count} ${s.count === 1 ? 'household is' : 'households are'} holding more cash than the target. ${s.detail}.`
};
const SIGNAL_ACTION = {
  tax_loss_harvesting: 'Show which households',
  concentration: 'Show which households',
  allocation_drift: 'Show which households',
  idle_cash: 'Show which households'
};

function drawSignals() {
  load($('w-signals'), 'Portfolio signals', () => api('GET', '/portfolio-signals'), (r) => head('Portfolio signals')
    + (r.items.length ? `<ul class="rows">${r.items.map(s => `
      <li data-sig="${esc(s.id)}"><div class="grow">
        <div class="title">${esc((SIGNAL_MEANING[s.kind] || (() => s.label))(s))}</div>
        <div class="source">${esc(sourceLine(s.source, s.dataAsOf))}</div>
        ${disclosure('signal:' + s.id, SIGNAL_ACTION[s.kind] || 'Show which households', { openLabel: 'Hide the households' })}
      </div></li>`).join('')}</ul>` : '<p class="empty">No signals right now.</p>'),
  (el) => wireDisclosures(el, async (key, inner) => {
    inner.innerHTML = '<p class="meta">Loading…</p>';
    try {
      const r = await api('GET', '/portfolio-signals/' + encodeURIComponent(key.slice('signal:'.length)) + '/items', { query: { size: 8 } });
      inner.innerHTML = `<ul class="subrows">${r.items.map(i => `<li><span><button class="link" data-hh="${esc(i.householdId)}">${esc(i.householdName)}</button> <span class="meta">${esc(i.maskedAccountNumber)}</span></span><span>${esc(i.detail)}</span></li>`).join('')}</ul>`;
      inner.querySelectorAll('[data-hh]').forEach(x => x.onclick = () => openHousehold(x.dataset.hh, true));
    } catch { inner.innerHTML = '<p class="meta">These households could not be loaded. Close this and open it again to retry.</p>'; }
  }));
}

/* ---- Book at a glance -----------------------------------------------------------------------
 * The four-number strip, off Today and given its own quiet place (UX_IA §4). GET /summary keeps
 * a home rather than losing one.
 */
export function advGlance() {
  $('section').innerHTML = `<h2 class="pagehead">Book at a glance</h2><dl class="strip" id="strip"></dl>
    <p class="hint">A standing picture of the book. Nothing here needs an answer today — what does is on Today.</p>`;
  advLoadStrip($('strip'));
}

/* ---- Clients ---- */
export function advClients(host) {
  (host || $('section')).innerHTML = `<div class="grid">${panel('w-book', 'wide')}${panel('w-team', 'wide')}</div>`;
  bookPanel({ scope: 'own', canShare: true, id: 'w-book', title: 'Book of business', size: 10 });
  teamSharePanelFor('w-team');
}

/* ---- Follow-ups: a tab of the Inbox, because a follow-up is something waiting on someone ---- */
export function followupsPanel(host) {
  host.innerHTML = `<div class="grid">${panel('w-tasks', 'wide')}</div>`;
  const run = () => load($('w-tasks'), 'Follow-ups', () => api('GET', '/tasks'), (r) => head('Follow-ups', r.openCount + ' open') + (r.items.length ? `<ul class="rows">${r.items.map(t => { const d = dueLabel(t.dueDate); return `
    <li class="task${t.status === 'done' ? ' done' : ''}"><label><input type="checkbox" data-task="${esc(t.id)}" ${t.status === 'done' ? 'checked' : ''}>
    <span class="grow"><span class="title">${esc(t.title)}</span>${t.origin === 'meeting' ? '<span class="tag">From meeting</span>' : ''}${syncBadge(t.sync)}
    <span class="meta" style="display:block">${esc(t.householdName || 'Practice')} • <span class="${d.hot && t.status === 'open' ? 'due-hot' : ''}">${esc(d.text)}</span></span></span></label></li>`; }).join('')}</ul>` + syncNotice(r.items) : '<p class="empty">No follow-ups yet.</p>'),
  (el) => el.querySelectorAll('[data-task]').forEach(c => c.addEventListener('change', async () => {
    const li = c.closest('.task'); li.classList.toggle('done', c.checked);
    try { await api('PATCH', '/tasks/' + encodeURIComponent(c.dataset.task), { body: { status: c.checked ? 'done' : 'open' } }); toast(c.checked ? 'Done.' : 'Reopened.'); advLoadStrip(); }
    catch (e) { c.checked = !c.checked; li.classList.toggle('done', c.checked); toast(e.message); }
  })));
  run();
}

/* ---- Communications: the approval gate. Nothing leaves the firm without a human (X-03). ---- */
export const COMM_BADGE = { draft: ['prep', 'Awaiting approval'], approved: ['ready', 'Approved, queued'], sent: ['plain', 'Sent'] };
export function commsPanel(host, initialStatus = '') {
  let status = initialStatus;

  const drawList = () => {
    host.innerHTML = `<div class="grid">${panel('w-comms', 'wide')}</div>`;
    load($('w-comms'), 'Messages',
      () => api('GET', '/communications', { query: { status, size: 20 } }),
      (r) => `<div class="panel-head"><h2>Messages</h2><label class="hint">Show <select id="cmfilter" aria-label="Filter messages by status"><option value="">All</option><option value="draft">Awaiting approval</option><option value="approved">Approved</option><option value="sent">Sent</option></select></label></div>`
        + (r.items.length ? `<ul class="rows">${r.items.map(c => { const [cls, label] = COMM_BADGE[c.status]; return `
          <li><div class="grow"><div class="title">${esc(c.subject)}</div>
          <div class="meta">${esc(c.householdName || 'Practice')} \u2022 ${esc(c.channel)} \u2022 ${esc(daysAgo(c.createdAt))}${c.complianceReview ? ' \u2022 <span class="due-hot">compliance review</span>' : ''}</div>
          ${c.approvedBy ? `<div class="meta">Approved by ${esc(c.approvedBy)}</div>` : ''}</div>
          <span class="badge ${cls}">${esc(label)}</span>${syncBadge(c.sync)}
          <button class="btn" data-open="${esc(c.id)}">${c.status === 'draft' ? 'Read and approve' : 'Open'}</button></li>`; }).join('')}</ul>` + syncNotice(r.items)
          : '<p class="empty serif">No messages match.</p>'),
      (el) => {
        const f = el.querySelector('#cmfilter'); f.value = status; f.onchange = () => { status = f.value; drawList(); };
        el.querySelectorAll('[data-open]').forEach(b => b.onclick = () => openComm(b.dataset.open, drawList, host));
      });
  };

  /* A message asked for by name — from a role card on Today — opens straight into its frame
     rather than dropping the advisor at a list to find it again (FO-06). */
  const waiting = vsGet('openComm');
  if (waiting) { vsSet('openComm', undefined); openComm(waiting, drawList, host); } else { drawList(); }
}

/* ---- The message: the draft frame and the send confirmation (TR-01, TR-02) ---------------
 * "What you edit is what they get. A draft is shown exactly as it will arrive, so there is no
 * separate preview" (TR-02). So this is not a form with a preview beside it: the fields the
 * advisor types into ARE the message, styled as the message. The dashed violet frame is the
 * only thing that says it has not been sent (product rule 1, design system §1.5), and it stays
 * dashed until it actually leaves — an approved message has not been sent either.
 *
 * It opens in place, where the advisor was, and gives back one step (FO-06).
 */

/* What the recipient is told, in the order the advisor needs to check it. Channel and household
 * are all the contract models: there is no named person and no address on a household, which is
 * why "To" is a household and not an inbox. Raised in docs/design.md. */
const CHANNEL_WORD = { email: 'by email', letter: 'by post', portal: 'in their client portal' };

function messageFrom() {
  const s = state.session;
  return s ? s.name + ' \u00b7 ' + s.firm.name : 'your firm';
}

export async function openComm(id, done, host) {
  const el = host || $('w-comms') || $('section');
  el.innerHTML = `<div class="panel"><div class="skel"></div><div class="skel m"></div><div class="skel s"></div></div>`;
  try {
    const c = await api('GET', '/communications/' + encodeURIComponent(id));
    drawComm(el, c, done);
  } catch (e) {
    el.innerHTML = `<div class="panel"><p class="err">${esc(e.message)}</p></div>`;
  }
}

function drawComm(el, c, done) {
  const sent = c.status === 'sent';
  const [cls, statusLabel] = COMM_BADGE[c.status];
  /* Dashed while it is still ours; solid once it has gone. Nothing sent is ever dashed. */
  const frameLabel = sent ? 'Sent ' + daysAgo(c.sentAt || c.createdAt).toLowerCase()
    : c.status === 'approved' ? 'Approved \u00b7 not sent yet' : 'Draft \u00b7 not sent';

  el.innerHTML = `<section class="panel wide msg-panel">
    <div class="panel-head">
      <button class="link back" id="cmBack">\u2190 All messages</button>
      <span class="badge ${cls}">${esc(statusLabel)}</span>
    </div>

    <article class="msg" data-state="${esc(c.status)}">
      <span class="msg-label${sent ? ' sent' : ''}">${esc(frameLabel)}</span>
      <div class="msg-frame">
        <dl class="msg-head">
          <div><dt>To</dt><dd>${esc(c.householdName || 'The practice')} <span class="meta">${esc(CHANNEL_WORD[c.channel] || c.channel)}</span></dd></div>
          <div><dt>From</dt><dd>${esc(messageFrom())}</dd></div>
        </dl>
        <label class="vh" for="cmSubject">Subject</label>
        <input class="msg-subject" id="cmSubject" value="${esc(c.subject)}" ${sent ? 'readonly' : ''}>
        <label class="vh" for="cmBody">Message</label>
        <textarea class="msg-body" id="cmBody" rows="1" ${sent ? 'readonly' : ''}>${esc(c.body)}</textarea>
      </div>
      <p class="source" id="cmReceipt">${esc(commReceipt(c))}</p>
    </article>

    ${c.complianceReview && !sent ? '<p class="hint warnline">Flagged for compliance review. It should not go out until that is done.</p>' : ''}

    <div class="actions msg-actions">
      ${sent ? ''
        : c.status === 'draft'
          ? '<button class="btn primary" id="cmApprove">Approve</button><button class="btn" id="cmRedraft">Rewrite it for me</button>'
          : '<button class="btn primary" id="cmSend">Send</button><button class="btn" id="cmReturn">Back to draft</button><button class="btn" id="cmRedraft">Rewrite it for me</button>'}
      ${sent ? '' : '<select id="cmTone" aria-label="Tone for a rewrite"><option>Warm and direct</option><option>Formal</option><option>Brief</option></select>'}
    </div>
    <div id="cmDraft"></div>
  </section>`;

  $('cmBack').onclick = () => done();
  const subject = $('cmSubject'), body = $('cmBody');
  autoGrow(body);

  if (!sent) {
    /* Saved when the advisor looks away, not when they hunt for a Save button. The edit is
       recorded and can be taken back, which is what makes saving quietly safe (TR-07). */
    async function save(field, input, was) {
      const val = input.value.trim();
      if (val === was || !val) { input.value = was; return; }
      try {
        const updated = await api('PATCH', '/communications/' + encodeURIComponent(c.id), { body: { [field]: val } });
        c[field] = val; c.editedBy = updated.editedBy; c.editedAt = updated.editedAt; c.draftedBy = 'advisor';
        $('cmReceipt').textContent = commReceipt(c);
        toast('Saved.', { label: 'Undo', run: async () => {
          try { await api('PATCH', '/communications/' + encodeURIComponent(c.id), { body: { [field]: was } }); c[field] = was; input.value = was; autoGrow(body); $('cmReceipt').textContent = commReceipt(c); loadActivity(); }
          catch (e) { toast(e.message); }
        } });
        loadActivity();
      } catch (e) { toast(e.message); input.value = was; autoGrow(body); }
    }
    subject.onblur = () => save('subject', subject, c.subject);
    body.onblur = () => save('body', body, c.body);
    body.oninput = () => autoGrow(body);

    const rd = $('cmRedraft');
    if (rd) rd.onclick = () => runDraft(rd, $('cmDraft'), 'POST', '/communications/' + encodeURIComponent(c.id) + '/redraft',
      { tone: $('cmTone').value },
      /* Straight into the frame, saved the same way a typed edit is — so it is undoable, it is
         in the log, and the message still lives in exactly one place. */
      (text) => {
        /* A model may still open with a subject line even though it was asked not to. Put it
           where it belongs rather than letting the message say it twice. */
        const m = /^\s*Subject:\s*(.+?)\n+/i.exec(text);
        if (m) { text = text.slice(m[0].length); const wasSubj = c.subject; subject.value = m[1].trim(); save('subject', subject, wasSubj); }
        const was = c.body; body.value = text.trim(); autoGrow(body); save('body', body, was);
      });

    const move = async (status, said) => {
      try {
        await api('PATCH', '/communications/' + encodeURIComponent(c.id), { body: { status } });
        toast(said);
        loadActivity();
        const fresh = await api('GET', '/communications/' + encodeURIComponent(c.id));
        drawComm(el, fresh, done);
      } catch (e) { toast(e.message); }
    };
    const ap = $('cmApprove');
    if (ap) ap.onclick = () => move('approved', 'Approved. It is queued, not sent.');
    const rt = $('cmReturn');
    if (rt) rt.onclick = () => move('draft', 'Back to draft.');
    const sd = $('cmSend');
    if (sd) sd.onclick = () => confirmSend(c, () => move('sent', 'Sent.'));
  }
}

/* The one-line receipt: what the platform did, or what the advisor did to it (TR-04). */
function commReceipt(c) {
  if (c.editedBy) return 'Drafted by the platform, edited by ' + c.editedBy + ' \u00b7 ' + daysAgo(c.editedAt).toLowerCase();
  if (c.draftedBy === 'ai') return 'Drafted by the platform ' + daysAgo(c.createdAt).toLowerCase() + ' \u00b7 in a ' + (c.tone || 'plain').toLowerCase() + ' tone';
  return 'Written by ' + (c.advisorName || 'an advisor') + ' \u00b7 ' + daysAgo(c.createdAt).toLowerCase();
}

const autoGrow = (t) => { t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; };

/* The send confirmation (TR-01, TR-02). One sheet, above the page, naming who it goes to, who
 * it comes from, what is attached and whether it can be called back. It is the last thing
 * between a draft and a client, so it says so plainly and it is not the default button.
 */
export function confirmSend(c, send) {
  const dlg = $('dlg');
  dlg.className = 'sheet';
  dlg.innerHTML = `<h2 id="dlgTitle" class="sheet-title">This leaves the firm</h2>
    <dl class="defs sheet-defs">
      <dt>To</dt><dd>${esc(c.householdName || 'The practice')} <span class="meta">${esc(CHANNEL_WORD[c.channel] || c.channel)}</span></dd>
      <dt>From</dt><dd>${esc(messageFrom())}</dd>
      <dt>Subject</dt><dd>${esc(c.subject)}</dd>
      <dt>Attached</dt><dd>Nothing</dd>
    </dl>
    ${c.complianceReview ? '<p class="hint warnline">This message is flagged for compliance review.</p>' : ''}
    <p class="sheet-warn">Once it goes it cannot be recalled.</p>
    <div class="actions sheet-actions">
      <button class="btn primary" id="sendGo">Send it</button>
      <button class="btn" id="sendNo">Not yet</button>
    </div>`;
  dlg.showModal();
  $('sendNo').focus();
  /* Escape closes it too, and Escape means 'not yet'. The class is cleared on close in
     app.js, so the next thing to use this dialog is not styled as a sheet. */
  $('sendNo').onclick = () => dlg.close();
  $('sendGo').onclick = () => { dlg.close(); send(); };
}

/* ---- Prospects ---- */
/* Where the lead came from. Not a data source: this is the prospect's own origin. */
export const LEAD_SOURCE = { referral: 'A referral', website: 'The website', event: 'An event', other: 'Somewhere else' };
export const STAGE_LABEL = { lead: 'Lead', contacted: 'Contacted', meeting_scheduled: 'Meeting scheduled', proposal: 'Proposal', onboarding: 'Onboarding', converted: 'Converted' };
export function advProspects(host) {
  (host || $('section')).innerHTML = `<div class="grid">${panel('w-pros', 'wide')}</div>`;
  const run = () => load($('w-pros'), 'Prospects', () => api('GET', '/prospects', { query: { size: 100 } }), (r) => {
    const total = r.items.reduce((a, p) => a + (p.estimatedAssets || 0), 0);
    return head('Prospects', r.totalItems + ' in the pipeline, about ' + money(total)) + `<div class="kanban">${r.stages.map(st => {
      const col = r.items.filter(p => p.stage === st);
      return `<div class="kcol"><h3>${esc(STAGE_LABEL[st])} <span class="count">${col.length}</span></h3>
        ${col.length ? col.map(p => `<article class="kcard" data-pros="${esc(p.id)}" tabindex="0" role="button" aria-label="Open ${esc(p.name)}">
          <div class="title">${esc(p.name)}</div>
          <div class="meta">${p.estimatedAssets ? esc(money(p.estimatedAssets)) : 'Assets unknown'} • ${esc(LEAD_SOURCE[p.source] || p.source)}</div>
          ${p.meetingId ? '<div class="meta">Meeting booked</div>' : ''}</article>`).join('') : '<p class="empty">Empty</p>'}</div>`;
    }).join('')}</div>` + syncNotice(r.items);
  }, (el) => el.querySelectorAll('[data-pros]').forEach(c => {
    const open = () => openProspect(c.dataset.pros, run);
    c.onclick = open;
    c.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } };
  }));
  run();
}

export async function openProspect(id, done) {
  const dlg = $('dlg');
  dlg.innerHTML = '<p class="empty">Loading…</p>'; dlg.showModal();
  try {
    const p = await api('GET', '/prospects/' + encodeURIComponent(id));
    const stages = Object.keys(STAGE_LABEL), i = stages.indexOf(p.stage), next = stages[i + 1];
    dlg.innerHTML = `<button class="btn quiet close" data-close>Close</button><h2 id="dlgTitle">${esc(p.name)}</h2>
      <div><span class="badge plain">${esc(STAGE_LABEL[p.stage])}</span></div>
      <dl class="defs"><dt>Estimated assets</dt><dd>${p.estimatedAssets ? moneyFull(p.estimatedAssets) : 'Unknown'}</dd><dt>Came from</dt><dd>${esc(LEAD_SOURCE[p.source] || p.source)}</dd><dt>First seen</dt><dd>${esc(daysAgo(p.createdAt))}</dd></dl>
      <h3>Intake notes</h3><p class="draft">${esc(p.intakeNotes || 'No notes yet.')}</p>
      ${next ? `<div class="actions"><button class="btn primary" id="prAdv">Move to ${esc(STAGE_LABEL[next])}</button>` : '<p class="hint">This prospect has converted.</p><div class="actions">'}
        <button class="btn" id="prMatch">Which advisor fits?</button></div>
      <div id="prOut"></div>`;
    $('prMatch').onclick = async () => {
      const b = $('prMatch'); b.disabled = true;
      try {
        const r = await api('GET', '/prospects/' + encodeURIComponent(id) + '/matches');
        $('prOut').innerHTML = `<h3>Suggested fit</h3><ul class="rows">${r.items.map((mt, i) => `
          <li><span class="count">${i + 1}</span><div class="grow"><div class="title">${esc(mt.advisorName)}${mt.advisorId === r.currentAdvisorId ? ' <span class="tag">current</span>' : ''}</div>
          ${mt.reasons.map(x => `<div class="meta">${esc(x)}</div>`).join('')}</div></li>`).join('')}</ul>
          <p class="hint">${esc(r.note)}</p>`;
      } catch (e) { toast(e.message); } finally { b.disabled = false; }
    };
    const adv = $('prAdv');
    if (adv) adv.onclick = async () => {
      adv.disabled = true;
      try { await api('PATCH', '/prospects/' + encodeURIComponent(id), { body: { stage: next } }); toast('Moved to ' + STAGE_LABEL[next] + '.'); dlg.close(); done(); }
      catch (e) { toast(e.message); adv.disabled = false; }
    };
  } catch (e) { dlg.innerHTML = `<button class="btn quiet close" data-close>Close</button><p class="err">${esc(e.message)}</p>`; }
}

/* ---- Onboarding, and importing a book ---- */
export function advOnboarding(host) {
  (host || $('section')).innerHTML = `<div class="grid"><div class="col">${panel('w-onb')}</div><div class="col">${panel('w-mig')}</div></div>`;
  const run = () => load($('w-onb'), 'New clients', () => api('GET', '/onboarding'), (r) =>
    head('New clients', r.items.length + ' in progress') + (r.items.length ? r.items.map(o => `
      <article class="onb" data-onb="${esc(o.id)}"><div class="onb-head"><div><div class="title">${esc(o.name)}</div>
      <div class="meta">Started ${esc(daysAgo(o.startedAt).toLowerCase())} • ${o.stepsComplete} of ${o.stepsTotal} steps</div></div>
      <button class="btn primary" data-convert="${esc(o.id)}" ${o.readyToConvert ? '' : 'disabled'}>Convert to client</button></div>
      <ul class="steps">${o.steps.map(s => `<li class="step ${esc(s.status)}">
        <label><input type="checkbox" data-step="${esc(o.id)}:${esc(s.id)}" ${s.status === 'done' ? 'checked' : ''}>
        <span class="grow"><button class="link" data-detail="${esc(o.id)}:${esc(s.id)}">${esc(s.label)}</button></span></label></li>`).join('')}</ul></article>`).join('')
      : '<p class="empty">Nobody is onboarding right now.</p>'),
  (el) => {
    el.querySelectorAll('[data-step]').forEach(c => c.addEventListener('change', async () => {
      const [oid, sid] = c.dataset.step.split(':');
      try { await api('PATCH', `/onboarding/${encodeURIComponent(oid)}/steps/${encodeURIComponent(sid)}`, { body: { status: c.checked ? 'done' : 'open' } }); run(); }
      catch (e) { c.checked = !c.checked; toast(e.message); }
    }));
    el.querySelectorAll('[data-detail]').forEach(b => b.onclick = async () => {
      const [oid, sid] = b.dataset.detail.split(':');
      const dlg = $('dlg'); dlg.innerHTML = '<p class="empty">Loading…</p>'; dlg.showModal();
      try {
        const o = await api('GET', '/onboarding/' + encodeURIComponent(oid));
        const s = o.steps.find(x => x.id === sid);
        dlg.innerHTML = `<button class="btn quiet close" data-close>Close</button><h2 id="dlgTitle">${esc(s.label)}</h2>
          <div class="meta">${esc(o.name)}</div>
          <p class="draft">${esc(s.detail || 'Not started yet. Nothing has been captured for this step.')}</p>
          ${s.completedAt ? `<p class="hint">Completed ${esc(fmtDate(localDate(new Date(s.completedAt))))}.</p>` : ''}`;
      } catch (e) { dlg.innerHTML = `<button class="btn quiet close" data-close>Close</button><p class="err">${esc(e.message)}</p>`; }
    });
    el.querySelectorAll('[data-convert]').forEach(b => b.onclick = async () => {
      b.disabled = true;
      try { const r = await api('POST', `/onboarding/${encodeURIComponent(b.dataset.convert)}/convert`); toast(r.name + ' is now in your book.'); run(); advLoadStrip(); }
      catch (e) { toast(e.message); b.disabled = false; }
    });
  });
  run();

  load($('w-mig'), 'Import a book', () => api('GET', '/migrations'), (past) =>
    head('Import a book', 'Migrate from another system') + `
    <p class="hint">Paste one household per line as <code>Name, assets</code>. Rows that fail validation are reported and skipped; the rest are imported and flagged for review.</p>
    <div class="field"><label for="migSrc">Where is it coming from?</label><input type="text" id="migSrc" value="Redtail export"></div>
    <div class="field"><label for="migRows">Households</label><textarea id="migRows" rows="6">Okonkwo household, 3200000
Vance Trust, 1400000
, 50
Bad Assets, -3</textarea></div>
    <button class="btn primary" id="migGo">Validate and import</button>
    <div id="migOut"></div>
    ${past && past.items.length ? `<h3>Past imports</h3><ul class="rows">${past.items.map(m => `
      <li><div class="grow"><div class="title">${esc(m.source)}</div>
      <div class="meta">${esc(daysAgo(m.createdAt))} \u2022 ${m.counts.imported} imported, ${m.counts.invalid} rejected</div></div></li>`).join('')}</ul>` : ''}`,
  () => {
    $('migGo').onclick = async () => {
      const rows = $('migRows').value.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
        const i = l.lastIndexOf(','), name = (i < 0 ? l : l.slice(0, i)).trim(), n = i < 0 ? NaN : Number(l.slice(i + 1).trim());
        const row = {}; if (name) row.name = name; if (!Number.isNaN(n)) row.aum = n; return row;
      });
      if (!rows.length) { toast('Add at least one row.'); return; }
      const b = $('migGo'); b.disabled = true;
      try {
        const r = await api('POST', '/migrations', { body: { source: $('migSrc').value.trim() || 'Unknown', rows } });
        $('migOut').innerHTML = `<dl class="defs"><dt>Read</dt><dd>${r.counts.read}</dd><dt>Imported</dt><dd>${r.counts.imported}</dd><dt>Rejected</dt><dd>${r.counts.invalid}</dd></dl>`
          + (r.invalidRows.length ? `<ul class="rows">${r.invalidRows.map(x => `<li><div class="grow"><div class="title">Row ${x.row + 1}</div><div class="meta">${esc(x.problems.join('; '))}</div></div></li>`).join('')}</ul>` : '');
        toast(r.counts.imported + ' imported, flagged for review.');
        advLoadStrip();
      } catch (e) { toast(e.message); } finally { b.disabled = false; }
    };
  });
}

/* ---- Calendar ---- */
export let calMonth = null;
export function advCalendar() {
  const now = new Date();
  if (!calMonth) calMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  $('section').innerHTML = `<div class="grid">${panel('w-cal', 'wide')}</div>`;
  const run = () => {
    const first = new Date(calMonth), last = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0);
    const from = localDate(first), to = localDate(last);
    load($('w-cal'), 'Calendar', () => api('GET', '/meetings', { query: { from, to } }), (r) => {
      const byDay = {};
      for (const m of r.items) (byDay[localDate(new Date(m.startsAt))] ||= []).push(m);
      const lead = (first.getDay() + 6) % 7, cells = [];
      for (let i = 0; i < lead; i++) cells.push('<div class="cday out"></div>');
      for (let d = 1; d <= last.getDate(); d++) {
        const date = new Date(calMonth.getFullYear(), calMonth.getMonth(), d), key = localDate(date);
        const list = byDay[key] || [], today = key === localDate(now);
        cells.push(`<div class="cday${today ? ' today' : ''}"><div class="dnum">${d}</div>
          ${list.map(m => `<button class="cmeet" data-meet="${esc(m.id)}" title="${esc(m.type)}">${esc(fmtTime(m.startsAt))} ${esc(m.householdName || m.prospectName || m.type)}</button>`).join('')}
          <button class="cadd" data-add="${esc(key)}" aria-label="Add a meeting on ${esc(fmtDate(key))}">+</button></div>`);
      }
      return `<div class="panel-head"><h2>${esc(calMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }))}</h2>
        <span class="actions"><button class="btn" data-mv="-1">Previous</button><button class="btn" data-mv="1">Next</button></span></div>
        <div class="calgrid">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => `<div class="cdow">${d}</div>`).join('')}${cells.join('')}</div>
        <p class="hint">Past meetings hold notes or a transcript. Select one to read it and draft follow-ups.</p>`;
    }, (el) => {
      el.querySelectorAll('[data-mv]').forEach(b => b.onclick = () => { calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + (+b.dataset.mv), 1); run(); });
      el.querySelectorAll('[data-meet]').forEach(b => b.onclick = () => openMeeting(b.dataset.meet, run));
      el.querySelectorAll('[data-add]').forEach(b => b.onclick = () => addMeeting(b.dataset.add, run));
    });
  };
  run();
}

export async function addMeeting(date, done) {
  const dlg = $('dlg');
  dlg.innerHTML = '<p class="empty">Loading…</p>'; dlg.showModal();
  try {
    const hh = await api('GET', '/households', { query: { size: 100, sort: 'name,asc' } });
    dlg.innerHTML = `<button class="btn quiet close" data-close>Close</button><h2 id="dlgTitle">New meeting</h2>
      <div class="field"><label for="nmType">What is it?</label><input type="text" id="nmType" placeholder="For example, Annual review"></div>
      <div class="field"><label for="nmHh">Client</label><select id="nmHh"><option value="">No client attached (prospect)</option>${hh.items.map(h => `<option value="${esc(h.id)}">${esc(h.name)}</option>`).join('')}</select></div>
      <div class="field"><label for="nmTime">Time</label><input type="time" id="nmTime" value="10:00"></div>
      <div class="field"><label for="nmMins">Minutes</label><input type="number" id="nmMins" value="45" min="15" step="15"></div>
      <button class="btn primary" id="nmGo">Add to ${esc(fmtDate(date))}</button>`;
    $('nmGo').onclick = async () => {
      const type = $('nmType').value.trim(); if (!type) { toast('Give the meeting a name.'); return; }
      const b = $('nmGo'); b.disabled = true;
      try {
        await api('POST', '/meetings', { body: { startsAt: new Date(date + 'T' + ($('nmTime').value || '10:00') + ':00').toISOString(), type,
          householdId: $('nmHh').value || undefined, durationMinutes: Number($('nmMins').value) || 30 } });
        toast('Meeting added.'); dlg.close(); done();
      } catch (e) { toast(e.message); b.disabled = false; }
    };
  } catch (e) { dlg.innerHTML = `<button class="btn quiet close" data-close>Close</button><p class="err">${esc(e.message)}</p>`; }
}

export async function openMeeting(id, done) {
  const dlg = $('dlg');
  dlg.innerHTML = '<p class="empty">Loading…</p>'; dlg.showModal();
  try {
    const m = await api('GET', '/meetings/' + encodeURIComponent(id));
    let record = null;
    try { record = await api('GET', '/meetings/' + encodeURIComponent(id) + '/record'); } catch { /* most meetings have none */ }
    dlg.innerHTML = `<button class="btn quiet close" data-close>Close</button><h2 id="dlgTitle">${esc(m.type)}</h2>
      <div class="meta">${esc(m.householdName || m.prospectName || 'No client attached')} • ${esc(fmtDate(localDate(new Date(m.startsAt))))} at ${esc(fmtTime(m.startsAt))} • ${m.durationMinutes} minutes</div>
      <h3>Prep brief</h3><p class="draft">${esc(m.brief || 'No brief yet.')}</p>
      ${record ? `<h3>${record.kind === 'transcript' ? 'Transcript' : 'Notes'}</h3>
        ${record.consent ? `<p class="hint">Recording consent: ${record.consent.obtained ? 'on file' + (record.consent.method ? ', ' + esc(record.consent.method) : '') : '<strong>not on file</strong>'}.</p>` : ''}
        ${record.withheld ? `<p class="err">${esc(record.withheldReason)}</p>`
          : `<p class="draft">${esc(record.content)}</p><div class="actions"><button class="btn primary" id="mtNext">Suggest next steps</button></div><div id="mtOut"></div>`}`
        : '<p class="hint">No notes or transcript for this meeting.</p>'}
      <div class="actions" style="margin:4px 0 10px">
        ${record && !record.withheld ? '<button class="btn" id="mtSum">Summarise</button>' : ''}
        ${new Date(m.startsAt) > new Date() ? '<button class="btn" id="mtAgenda">Draft agenda</button>' : ''}</div>
      <div id="mtDraft"></div>
      ${new Date(m.startsAt) > new Date() ? `<h3>Move</h3>
        <div class="field"><label for="mtWhen">New date and time</label><input type="datetime-local" id="mtWhen" value="${esc(localDate(new Date(m.startsAt)))}T${esc(new Date(m.startsAt).toTimeString().slice(0, 5))}"></div>
        <button class="btn" id="mtMove">Move meeting</button>` : ''}
      <div class="actions"><button class="btn quiet" id="mtDel">Cancel meeting</button></div>`;
    const nx = $('mtNext');
    if (nx) nx.onclick = async () => {
      nx.disabled = true;
      try {
        const s = await api('POST', '/meetings/' + encodeURIComponent(id) + '/record/next-steps');
        $('mtOut').innerHTML = `<p class="hint">Drafts only. Nothing is created until you add one as a follow-up.</p>
          <ul class="rows">${s.items.map((it, i) => `<li><div class="grow"><div class="title">${esc(it.title)}</div><div class="meta">${it.dueDate ? 'Suggested due ' + esc(fmtDate(it.dueDate)) : 'No date'}</div></div>
          <button class="btn" data-accept="${i}">Add as follow-up</button></li>`).join('')}</ul>`;
        $('mtOut').querySelectorAll('[data-accept]').forEach(b => b.onclick = async () => {
          const it = s.items[+b.dataset.accept]; b.disabled = true;
          try { await api('POST', '/tasks', { body: { title: it.title, householdId: it.householdId || undefined, dueDate: it.dueDate || undefined, origin: 'meeting', originMeetingId: id } }); toast('Added to your follow-ups.'); b.textContent = 'Added'; advLoadStrip(); }
          catch (e) { toast(e.message); b.disabled = false; }
        });
      } catch (e) { toast(e.message); nx.disabled = false; }
    };
    const sum = $('mtSum');
    if (sum) sum.onclick = () => runDraft(sum, $('mtDraft'), 'POST', '/meetings/' + encodeURIComponent(id) + '/record/summary');
    const ag = $('mtAgenda');
    if (ag) ag.onclick = () => runDraft(ag, $('mtDraft'), 'POST', '/meetings/' + encodeURIComponent(id) + '/agenda');
    const mv = $('mtMove');
    if (mv) mv.onclick = async () => {
      const when = $('mtWhen').value;
      if (!when) { toast('Pick a new date and time.'); return; }
      mv.disabled = true;
      try { await api('PATCH', '/meetings/' + encodeURIComponent(id), { body: { startsAt: new Date(when).toISOString() } }); toast('Meeting moved.'); dlg.close(); done(); }
      catch (e) { toast(e.message); mv.disabled = false; }
    };
    $('mtDel').onclick = async () => {
      try { await api('DELETE', '/meetings/' + encodeURIComponent(id)); toast('Meeting cancelled.'); dlg.close(); done(); advLoadStrip(); }
      catch (e) { toast(e.message); }
    };
  } catch (e) { dlg.innerHTML = `<button class="btn quiet close" data-close>Close</button><p class="err">${esc(e.message)}</p>`; }
}

/* ---- Inbox --------------------------------------------------------------------------------
 * Messages to answer, drafts to approve and follow-ups due, in one place. Communications and
 * Follow-ups merge because both are "waiting on someone" (UX_IA §4). Each item also shows on
 * the person's record, so there are two doors to it and only one item.
 */
export function advInbox() {
  $('section').innerHTML = `<h2 class="pagehead">Inbox</h2>
    <div id="inboxTabs"></div>
    <div class="grid" style="margin-top:16px">${panel('w-inbox', 'wide')}</div>`;
  const tabs = [['approve', 'Drafts to approve'], ['followups', 'Follow-ups'], ['all', 'Everything sent']];
  const go = (k) => {
    vsSet('inboxTab', k);
    roleTabs($('inboxTabs'), tabs, k, go);
    if (k === 'followups') return followupsPanel($('w-inbox'));
    commsPanel($('w-inbox'), k === 'approve' ? 'draft' : '');
  };
  go(vsGet('inboxTab', 'approve'));
}

/* ---- Role homes ---------------------------------------------------------------------------
 * "Choosing a role opens its home: the role's priorities — the same ones that feed its card on
 * Today — and an overview of how that part of the business is going" (UX_IA §3). Overviews are
 * sentences and simple shapes, not tile walls.
 */
export function advRoleHome(key) {
  const r = ROLE[key];
  $('section').innerHTML = `<h2 class="pagehead"><span class="headmark">${roleMark(r.mark, key)}</span>${esc(r.full)}</h2>
    <div id="roleTabs"></div><div id="roleBody" style="margin-top:16px"></div>`;
  const tabs = ROLE_TABS[key]();
  const go = (t) => {
    vsSet('roleTab:' + key, t);
    roleTabs($('roleTabs'), tabs, t, go);
    (ROLE_PANEL[key][t] || ROLE_PANEL[key][tabs[0][0]])($('roleBody'));
  };
  const saved = vsGet('roleTab:' + key, tabs[0][0]);
  go(tabs.some(([k]) => k === saved) ? saved : tabs[0][0]);
}

/* The role's own priorities, drawn from the same place its Today card is (ST-02, FO-09). */
function roleOverview(key) {
  return async (el) => {
    el.innerHTML = `<div class="grid">${panel('w-rolepri', 'wide')}</div>`;
    const host = $('w-rolepri');
    host.innerHTML = head(ROLE[key].name + ' priorities') + '<div class="skel"></div><div class="skel m"></div>';
    try {
      const work = (await collectRoleWork(state.session && state.session.advisorId)).filter(w => w.role === key);
      host.innerHTML = head(ROLE[key].name + ' priorities', work.length ? work.length + ' to answer' : '')
        + (work.length ? `<ul class="rows">${work.map(w => `<li><div class="grow"><div class="title">${esc(w.meaning)}</div>
            <div class="source">${esc(sourceLine(w.source.kinds, w.source.at))}</div></div>
            <button class="btn" data-ritem="${esc(itemKey(w))}">${esc(w.action.label)}</button></li>`).join('')}</ul>`
          : `<p class="empty serif">Nothing pressing in ${esc(ROLE[key].name.toLowerCase())} today.</p>`);
      host.querySelectorAll('[data-ritem]').forEach(b => b.onclick = () =>
        runItemAction(work.find(w => itemKey(w) === b.dataset.ritem), b));
    } catch (e) { host.innerHTML = head(ROLE[key].name + ' priorities') + `<div class="err">${esc(e.message)}</div>`; }
  };
}

/* Referrals: who came to the firm because someone sent them. Drawn from each prospect's own
   origin, which is the only referral data the contract holds — there is no record of who made
   the referral, so the thank-you half of CS-09's referral window cannot be built yet. Logged. */
function referralsPanel(el) {
  el.innerHTML = `<div class="grid">${panel('w-ref', 'wide')}</div>`;
  load($('w-ref'), 'Referrals', () => api('GET', '/prospects', { query: { size: 100 } }), (r) => {
    const refs = r.items.filter(p => p.source === 'referral');
    const value = refs.reduce((a, p) => a + (p.estimatedAssets || 0), 0);
    return head('Referrals', refs.length + ' in the pipeline, about ' + money(value))
      + (refs.length ? `<ul class="rows">${refs.map(p => `<li><div class="grow">
        <div class="title">${esc(p.name)}</div>
        <div class="meta">${esc(STAGE_LABEL[p.stage])} • ${p.estimatedAssets ? esc(money(p.estimatedAssets)) : 'Assets unknown'} • ${daysBetween(p.stageChangedAt)} days at this stage</div>
        <div class="source">${esc(sourceLine('crm', p.lastContactAt || p.createdAt))}</div></div>
        <button class="btn" data-pros="${esc(p.id)}">Open</button></li>`).join('')}</ul>`
        : '<p class="empty">Nobody has been referred to you yet.</p>');
  }, (el2) => el2.querySelectorAll('[data-pros]').forEach(b => b.onclick = () => openProspect(b.dataset.pros, () => referralsPanel(el))));
}

/* Meetings inside the Clients home: what is booked and whether it is prepared. The Calendar in
   the spine is for moving things; this is for knowing where you stand. */
function clientMeetingsPanel(el) {
  el.innerHTML = `<div class="grid">${panel('w-cm', 'wide')}</div>`;
  const to = new Date(); to.setDate(to.getDate() + 14);
  load($('w-cm'), 'Meetings', () => api('GET', '/meetings', { query: { from: localDate(new Date()), to: localDate(to) } }), (r) =>
    head('Meetings', 'Next 14 days') + (r.items.length ? `<ul class="rows">${r.items.map(m => `
      <li><div class="grow"><div class="title">${esc(m.householdName || m.prospectName || 'No client attached')}</div>
      <div class="meta">${esc(fmtDate(m.startsAt.slice(0, 10)))} at ${esc(fmtTime(m.startsAt))} • ${esc(m.type)}</div></div>
      <span class="badge ${m.prepStatus === 'ready' ? 'ready' : 'prep'}">${m.prepStatus === 'ready' ? 'Prep ready' : 'Needs prep'}</span>
      <button class="btn" data-mt="${esc(m.id)}">Open</button></li>`).join('')}</ul>` : '<p class="empty">Nothing is booked in the next two weeks.</p>'),
  (el2) => el2.querySelectorAll('[data-mt]').forEach(b => b.onclick = () => openMeeting(b.dataset.mt, () => clientMeetingsPanel(el))));
}

/* What the firm charges this advisor's households (AX-10). */
function billingPanel(el) {
  el.innerHTML = `<div class="grid">${panel('w-fees', 'wide')}</div>`;
  load($('w-fees'), 'Billing and fees', () => api('GET', '/billing/fees', { query: { size: 100 } }), (r) =>
    head('Billing and fees', money(r.items.reduce((a, f) => a + f.annualFee, 0)) + ' a year across ' + r.items.length + ' households')
    + `<div class="tablewrap"><table><thead><tr><th>Household</th><th class="num">Assets</th><th class="num">Rate</th><th class="num">Annual fee</th><th>Basis</th></tr></thead><tbody>
      ${r.items.map(f => `<tr><td>${esc(f.householdName)}</td><td class="num">${money(f.aum)}</td><td class="num">${f.annualRatePct}%</td><td class="num">${money(f.annualFee)}</td><td>${f.override ? '<span class="badge warn">Override</span>' : 'Schedule'}</td></tr>`).join('')}</tbody></table></div>`
    + `<p class="hint">Changing what a household is charged is done on the household itself, where the reason is recorded with it.</p>`);
}

function compliancePanel(el) {
  el.innerHTML = `<div class="grid">${panel('w-comp', 'wide')}</div>`;
  load($('w-comp'), 'Compliance', () => api('GET', '/firm/compliance', { query: { size: 20 } }), (r) =>
    head('Compliance', r.totalItems + ' items') + (r.items.length ? `<ul class="rows">${r.items.map(c => `
      <li><div class="grow"><div class="title">${esc(c.title)}</div>
      <div class="meta">${esc(CATEGORY[c.category] || c.category)} • ${esc(c.advisorName || 'The firm')} • due ${esc(fmtDate(c.dueDate))}</div></div>
      <span class="badge ${c.status === 'overdue' ? 'crit' : c.status === 'done' ? 'ok' : 'plain'}">${esc(c.status)}</span></li>`).join('')}</ul>`
      : '<p class="empty">Nothing is outstanding.</p>'));
}

function scorecardPanel(el) {
  el.innerHTML = `<div class="grid">${panel('w-score', 'wide')}</div>`;
  load($('w-score'), 'Your scorecard', () => api('GET', '/firm/advisors/' + encodeURIComponent(SCORE_ID()) + '/scorecard'), (s) =>
    head('Your scorecard', esc(s.advisorName)) + metricRows(s.metrics)
    + '<p class="hint">Compared with the firm median. Where you sit against named colleagues is shown to a principal only. Nothing here is shared with the firm.</p>');
}

const ROLE_PANEL = {
  bd: { overview: roleOverview('bd'), pipeline: (el) => advProspects(el), referrals: referralsPanel },
  ca: { overview: roleOverview('ca'), households: (el) => advClients(el), meetings: clientMeetingsPanel, onboarding: (el) => advOnboarding(el) },
  op: { overview: roleOverview('op'), reports: (el) => advReports(el), billing: billingPanel, compliance: compliancePanel },
  pd: { playbooks: (el) => advPlaybooks(el), scorecard: scorecardPanel }
};

/* ---- Systems (UX_IA §5) ---------------------------------------------------------------------
 * What the platform is connected to, who set each up, when it last synced, and a plain
 * statement of what it cannot see right now. Set up by whoever administers the firm; every
 * other advisor sees it read-only, because knowing what the platform cannot see is not an
 * administrator's privilege.
 */
export function advSystems() {
  $('section').innerHTML = `<h2 class="pagehead">Systems</h2><div class="grid">${panel('w-sys', 'wide')}</div>`;
  const run = () => load($('w-sys'), 'Systems', () => api('GET', '/systems'), (r) =>
    head('Systems', r.items.filter(x => x.status === 'connected').length + ' of ' + r.items.length + ' connected')
    + (r.note ? `<p class="hint gap">${esc(r.note)}</p>` : '')
    + `<ul class="rows">${r.items.map(x => `<li><div class="grow">
        <div class="title">${esc(x.name)}</div>
        <div class="meta">${esc(SYSTEM_KIND[x.kind] || x.kind)}${x.connectedBy ? ' • set up by ' + esc(x.connectedBy) : ''}</div>
        ${x.cannotSee ? `<div class="meta gap">${esc(x.cannotSee)}</div>` : ''}
        ${x.lastSyncAt ? `<div class="source">Last synced ${esc(fmtTime(x.lastSyncAt))}</div>` : ''}</div>
      <span class="badge ${x.status === 'connected' ? 'ok' : x.status === 'error' ? 'crit' : 'plain'}">${x.status === 'connected' ? 'Connected' : x.status === 'error' ? 'Not working' : 'Not connected'}</span>
      ${r.canEdit ? `<button class="btn" data-sys="${esc(x.id)}" data-to="${x.status === 'connected' ? 'not_connected' : 'connected'}">${x.status === 'connected' ? 'Disconnect' : 'Connect'}</button>` : ''}</li>`).join('')}</ul>`
    + (r.canEdit ? '' : '<p class="hint">Connections are set up by whoever administers the firm. You can see what they are, and what the platform cannot see because of them.</p>'),
  (el) => el.querySelectorAll('[data-sys]').forEach(b => b.onclick = async () => {
    b.disabled = true;
    try { await api('PATCH', '/systems/' + encodeURIComponent(b.dataset.sys), { body: { status: b.dataset.to } });
      toast(b.dataset.to === 'connected' ? 'Connected.' : 'Disconnected.'); run(); loadActivity(); }
    catch (e) { toast(e.message); b.disabled = false; }
  }));
  run();
}
const SYSTEM_KIND = { custodian: 'Custodian', crm: 'CRM', email: 'Email', calendar: 'Calendar', documents: 'Documents' };

export const ADV_RENDER = {
  today: advToday, inbox: advInbox, calendar: advCalendar, glance: advGlance, systems: advSystems,
  'role:bd': () => advRoleHome('bd'), 'role:ca': () => advRoleHome('ca'),
  'role:op': () => advRoleHome('op'), 'role:pd': () => advRoleHome('pd')
};

/* ---- Next best action (PL-02) ----------------------------------------------------------
 * No longer a section. Every suggestion now arrives inside the role card it belongs to
 * (FO-11, UX-008), so /next-actions is read by roles.js rather than drawn as its own list.
 * Nothing was lost: the same items, with the same reasons and the same sources, in the place
 * the advisor is already looking.
 */

/* ---- Reporting and the advisor's own scorecard (PO-07, AX-08) ---- */
const fmtMetric = (m) => m.unit === 'usd' ? money(m.value) : m.value.toLocaleString('en-US');

export function metricRows(metrics) {
  return `<ul class="rows">${metrics.map(m => {
    const better = m.change === 0 ? '' : (m.lowerIsBetter ? (m.change < 0 ? 'up' : 'neg') : (m.change > 0 ? 'up' : 'neg'));
    return `<li><div class="grow"><div class="title">${esc(m.label)}</div>
      ${m.previousValue !== undefined ? `<div class="meta">was ${m.unit === 'usd' ? money(m.previousValue) : m.previousValue}</div>` : ''}</div>
      <span class="figure-sm">${esc(fmtMetric(m))}</span>
      ${m.change !== undefined ? `<span class="${better}" style="min-width:52px;text-align:right">${m.change > 0 ? '+' : ''}${m.unit === 'usd' ? money(m.change) : m.change}</span>` : ''}
      ${m.firmMedian !== undefined ? `<span class="meta" style="min-width:110px;text-align:right">firm median ${m.unit === 'usd' ? money(m.firmMedian) : m.firmMedian}</span>` : ''}
      ${m.rank ? `<span class="badge plain">#${m.rank} of ${m.outOf}</span>` : ''}</li>`;
  }).join('')}</ul>`;
}

export function advReports(host) {
  (host || $('section')).innerHTML = `<div class="grid">${panel('w-report', 'wide')}</div>`;
  let days = 30;
  const runReport = () => load($('w-report'), 'Practice report', () => api('GET', '/reports/practice', { query: { from: backDate(days) } }), (r) =>
    `<div class="panel-head"><h2>Practice report</h2><label class="hint">Last <select id="repDays" aria-label="Reporting period">
      <option value="30">30 days</option><option value="90">90 days</option></select></label></div>`
    + `<p class="hint">${esc(r.from)} to ${esc(r.to)}, against ${esc(r.previousFrom)} to ${esc(r.previousTo)}.</p>`
    + metricRows(r.metrics)
    + Object.entries(r.breakdowns).map(([k, rows]) => rows.length ? `<h3>${esc(BREAKDOWN[k] || k)}</h3><ul class="rows">${rows.map(x => `
        <li><div class="grow"><div class="title">${esc(x.label)}</div></div><span>${x.count}</span></li>`).join('')}</ul>` : '').join(''),
  (el) => { const f = el.querySelector('#repDays'); f.value = String(days); f.onchange = () => { days = +f.value; runReport(); }; });
  runReport();
}

const BREAKDOWN = { meetingsByType: 'Meetings by type', communicationsByStatus: 'Messages by status', complianceByStatus: 'Compliance by status' };
const backDate = (n) => { const d = new Date(); d.setDate(d.getDate() - n + 1); return localDate(d); };
const SCORE_ID = () => (state.session && state.session.advisorId) || 'adv1';

/* ---- Playbooks (AX-09) ----------------------------------------------------------------
 * Running one IS the advisor's explicit action, so unlike a suggestion these create real
 * follow-ups rather than drafts. The dates come from each step's offset from the anchor.
 */
export function advPlaybooks(host) {
  (host || $('section')).innerHTML = `<div class="grid">${panel('w-pb', 'wide')}</div>`;
  load($('w-pb'), 'Playbooks', () => Promise.all([api('GET', '/playbooks'), api('GET', '/households', { query: { size: 100, sort: 'name,asc' } })]),
    ([pbs, hh]) => head('Playbooks', pbs.items.length + ' available') + pbs.items.map(pb => `
      <article class="onb" data-pb="${esc(pb.id)}"><div class="onb-head"><div>
        <div class="title">${esc(pb.name)}</div><div class="meta">${esc(pb.description)}</div></div>
        <button class="btn primary" data-run="${esc(pb.id)}">Run</button></div>
      <ul class="steps">${pb.steps.map(st => `<li class="step"><span class="grow">${esc(st.title)}</span>
        <span class="meta">${st.dayOffset === 0 ? 'on the day' : st.dayOffset < 0 ? Math.abs(st.dayOffset) + ' days before' : st.dayOffset + ' days after'}</span></li>`).join('')}</ul>
      <div class="field" style="margin-top:8px"><label for="pbHh-${esc(pb.id)}">For</label>
        <select id="pbHh-${esc(pb.id)}"><option value="">No household</option>${hh.items.map(h => `<option value="${esc(h.id)}">${esc(h.name)}</option>`).join('')}</select></div>
      </article>`).join(''),
  (el) => el.querySelectorAll('[data-run]').forEach(b => b.onclick = async () => {
    const id = b.dataset.run, hhId = el.querySelector('#pbHh-' + CSS.escape(id)).value;
    b.disabled = true;
    try {
      const r = await api('POST', '/playbooks/' + encodeURIComponent(id) + '/runs', { body: { householdId: hhId || undefined } });
      toast(r.tasks.length + ' follow-ups added.'); advLoadStrip();
    } catch (e) { toast(e.message); } finally { b.disabled = false; }
  }));
}

/* Households a colleague has shared with you, and ones you have shared out (PO-04). */
export function teamSharePanelFor(elId) {
  load($(elId), 'Shared with the team', () => api('GET', '/team-shares'), (r) => {
    const live = r.items.filter(t => !t.revokedAt);
    return head('Shared with the team', live.length + ' active') + (live.length ? `<ul class="rows">${live.map(t => `
      <li><div class="grow"><div class="title">${esc(t.householdName)}</div>
      <div class="meta">${t.direction === 'in' ? 'Shared with you by ' + esc(t.sharedByName) : 'You shared this with ' + esc(t.sharedWithName)}${t.reason ? ' • ' + esc(t.reason) : ''}</div></div>
      <span class="badge plain">${t.direction === 'in' ? 'read access' : 'shared out'}</span></li>`).join('')}</ul>`
      : '<p class="empty">Nothing is shared with or by you.</p>');
  });
}

/* A draft is shown beside what it was made from, never in place of it, and is labelled with
   what produced it — including when that was the offline generator rather than a model. */
/* `use` is given when there is somewhere for the draft to go. TR-02 says a draft is shown
   exactly as it will arrive and there is no separate preview — so where a frame exists, a
   rewrite belongs in it, not in a second block beside it. Copy stays for the drafts with no
   frame to land in: a meeting summary, an agenda. */
export async function runDraft(btn, out, method, path, body, use) {
  btn.disabled = true;
  out.innerHTML = '<div class="skel"></div><div class="skel s"></div>';
  try {
    const r = await api(method, path, body ? { body } : undefined);
    if (r.refused) {
      out.innerHTML = `<p class="err">The model declined this request${r.refusalCategory ? ' (' + esc(r.refusalCategory) + ')' : ''}.</p>`;
      return;
    }
    out.innerHTML = `<div class="answer suggestion">
      <p class="demo-lbl">${use ? 'Suggested rewrite' : 'Draft'}</p>
      <p class="draft">${esc(r.draft)}</p>
      ${r.provenance.readFrom && r.provenance.readFrom.length ? `<div class="answer-cites"><strong>Read from</strong>
        <ul>${r.provenance.readFrom.map(c => `<li><span class="tag">${esc(sourceKind(c.source))}</span> ${esc(c.label)}</li>`).join('')}</ul></div>` : ''}
      <p class="hint">${r.provenance.live ? 'Drafted by ' + esc(r.provenance.model) : 'Written offline: no model is connected'}
        \u2022 prompt ${esc(r.provenance.promptVersion)}. ${use ? 'Nothing has changed until you use it.' : 'A draft \u2014 nothing has been saved or sent.'}</p>
      <div class="actions">${use ? '<button class="btn primary" data-use>Use this wording</button><button class="btn" data-discard>Keep what I have</button>' : '<button class="btn" data-copy>Copy</button>'}</div></div>`;
    const copy = out.querySelector('[data-copy]');
    if (copy) copy.onclick = async () => {
      try { await navigator.clipboard.writeText(r.draft); toast('Copied.'); }
      catch { toast('Select the text to copy it.'); }
    };
    const useBtn = out.querySelector('[data-use]');
    if (useBtn) useBtn.onclick = () => { out.innerHTML = ''; use(r.draft); };
    const discard = out.querySelector('[data-discard]');
    if (discard) discard.onclick = () => { out.innerHTML = ''; };
  } catch (e) { out.innerHTML = `<p class="err">${esc(e.message)}</p>`; }
  finally { btn.disabled = false; }
}
