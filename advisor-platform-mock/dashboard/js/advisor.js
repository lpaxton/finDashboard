/* The advisor's own sections. Everything here is internal: none of it may reach a client. */
import { api } from './api.js';
import { $, esc, money, moneyFull, pct, pctClass, fmtTime, fmtDate, localDate, daysAgo, daysBetween, dueLabel, syncBadge, syncNotice, sourceLine, sourceKind, CATEGORY } from './format.js';
import { toast, spark, head, panel, load, alertsList, openHousehold, bookPanel, spine, roleMark, roleTabs, disclosure, wireDisclosures, snoozeChoices, SNOOZE_CHOICES, loadActivity, onUndo } from './ui.js';
import { snooze, unsnooze, unsnoozeAll, dropExpiredSnoozes, get as vsGet, set as vsSet, isSnoozed } from './viewstate.js';
import { ROLES, ROLE, collectRoleWork, rankRoles } from './roles.js';
import { PANELS, cardId, arrange, leadWith, move, nudge, pinsFor } from './cards.js';
import { openSim } from './sim.js';
import { state } from './state.js';
/* head(), load(), toast(), sortTable() and the nav helpers translate what they are given, so
   panel titles, column headings and confirmations here need no wrapping. What is wrapped below
   is the prose written directly into the markup. */
import { t as tr, raw, locale } from './i18n.js';
/* `t` is also the name this file has long used for a task in two map callbacks, so the
   translator is imported as tr and re-exported locally as t for the rest of the module. */
const t = tr;

/* The week's day names come from the locale rather than a hard-coded list, and start on Monday
   because the grid does. Intl gives them in the reader's language and their own abbreviation. */
const weekdayNames = () => {
  const f = new Intl.DateTimeFormat(locale(), { weekday: 'short' });
  // 2024-01-01 was a Monday.
  return Array.from({ length: 7 }, (_, i) => f.format(new Date(Date.UTC(2024, 0, 1 + i))));
};

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
      <div class="stat"><dt>${esc(t('Assets under management'))}</dt><dd><div class="figure">${money(s.aum.value)}</div><div class="sub"><span class="${pctClass(s.aum.changeMtd)}">${pct(s.aum.changeMtd)}</span> this month</div>${spark(s.aum.trend, 'Assets under management, last 12 months')}</dd></div>
      <div class="stat"><dt>${esc(t('Households'))}</dt><dd><div class="figure">${s.households}</div></dd></div>
      <div class="stat"><dt>${esc(t('Meetings this week'))}</dt><dd><div class="figure">${s.meetingsThisWeek}</div></dd></div>
      <div class="stat"><dt>${esc(t('Open tasks'))}</dt><dd><div class="figure">${s.tasksOpen}</div><div class="sub">${s.tasksDueToday} due today</div></dd></div>`;
  }).catch(e => { target.innerHTML = `<div class="err" style="padding:16px 0">${esc(e.message)}</div>`; });
}

/* What the advisor pinned. The platform may suggest a pin but never adds one itself
   (UX_IA §6.1, ST-07, TM-03). */
/* The star on each role card used to pin that role into a "Pinned" group in the spine. It is
   now a tack that holds the card's place on Today, which is what Luke asked it to be — and
   that left the spine group with nothing to feed it, so it has gone too rather than sitting
   there permanently empty. If pinning a section into the spine is wanted back, it needs its own
   control somewhere that is not the card, because the card's control now means something else.
   Logged in docs/design.md. */

export function advisorView() {
  $('view').innerHTML = `<div class="viewbody">
      <div id="navrail"><nav class="subnav" id="advnav" aria-label="${esc(t('Advisor navigation'))}"></nav></div>
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
  spine($('advnav'), [
    { items: [['today', 'Today'], ['inbox', 'Inbox'], ['calendar', 'Calendar']] },
    /* ROLES.name is already in the reader's language, so it is passed as data rather than as
       a key: translating a translation loses it and fills the missing-key list with French. */
    { label: 'Your roles', items: ROLES.map(r => ['role:' + r.key, raw(r.name), r.mark]) },
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
    ${CARD_IDS().map(() => '<div class="skel m" style="height:150px"></div>').join('')}</div>`;
  drawToday();
  onUndo(() => { drawToday(); });
}

/* ---- The order of the six ------------------------------------------------------------------
 * Four role sections and the two standing panels, in an order the advisor can change: drag a
 * card by its grip, or tack one to a slot so the rest flow around it. The arithmetic is in
 * cards.js and has no idea a browser exists; this is the part that knows about the DOM.
 *
 * Three modes, and the two buttons above the grid switch between them:
 *   auto   what the platform worked out this morning, with the advisor's pins honoured.
 *   lead   the same, but today's top priority forced to the front — pins and all.
 *   mine   the arrangement the advisor dragged the cards into.
 * Dragging anything puts you in `mine`, because you have just told it what you want.
 */
const CARD_IDS = () => [...ROLES.map(r => cardId(r.key)), ...PANELS];
const PANEL_OF = { meetings: 'w-meetings', signals: 'w-signals' };
const cardPins = () => vsGet('cardPins', {}) || {};
const orderMode = () => vsGet('orderMode', 'auto') || 'auto';
const savedOrder = () => (vsGet('cardOrder', []) || []).filter(id => CARD_IDS().includes(id));

/* A stored order is repaired rather than trusted: a card added to Today in a later release must
   appear for someone who arranged the six before it existed, not vanish because it is missing
   from a list in their browser. */
function sequenceFor(rankedRoleKeys) {
  const all = CARD_IDS();
  if (orderMode() === 'mine') {
    const mine = savedOrder();
    return [...mine, ...all.filter(id => !mine.includes(id))];
  }
  return [...rankedRoleKeys.map(cardId), ...PANELS];
}

/* The grip and the tack, at the top right of every card, whatever kind of card it is. Absolute
   rather than part of either header, so a role section's coloured band and a panel's serif
   heading each keep their own shape and still get the same two controls in the same place. */
function cardControls(id) {
  const pinned = id in cardPins();
  return `<div class="tcard-ctl">
    <button class="tcard-grip" data-grip="${esc(id)}" draggable="true"
      aria-label="${esc(t('Move this card'))}" title="${esc(t('Drag to move, or use the arrow keys'))}">
      <span aria-hidden="true">\u2059</span></button>
    <button class="tcard-tack${pinned ? ' on' : ''}" data-tack="${esc(id)}" aria-pressed="${pinned}"
      aria-label="${esc(t(pinned ? 'Unpin this card from its place' : 'Pin this card to this place'))}"
      title="${esc(t(pinned ? 'Unpin this card from its place' : 'Pin this card to this place'))}">
      <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
        <path d="M9.6 1.2 14.8 6.4l-1.1 1.1-1.3-.4-2.6 2.6.5 2.4-1.1 1.1L6 10.8l-3.6 3.6-.9-.9L5.2 10 2 6.8l1.1-1.1 2.4.5L8.1 3.6l-.4-1.3z"
          fill="currentColor"/></svg></button>
  </div>`;
}

async function drawToday() {
  const host = $('roleCards');
  if (!host) return;
  dropExpiredSnoozes();
  let work = [];
  try { work = await collectRoleWork(state.session && state.session.advisorId); }
  catch (e) { host.innerHTML = `<div class="err">${esc(e.message || "Couldn't work out today.")}</div>`; return; }

  const hidden = new Set(notThis());
  work = work.filter(w => !hidden.has(itemKey(w)) && !isSnoozed(itemKey(w)));
  /* The ranking is always computed, whatever the mode: the "leading today" mark and the reason
     under the button are about what is most pressing, not about where a card happens to sit. */
  const { order: ranked, byRole, lead, reason } = rankRoles(work, false);

  let order = arrange(sequenceFor(ranked), cardPins());
  if (orderMode() === 'lead') order = leadWith(order, cardId(lead));

  host.innerHTML = order.map(id => `<article class="tcard" data-card="${esc(id)}">
    ${cardControls(id)}
    ${id.startsWith('role:')
      ? roleCard(id.slice(5), byRole[id.slice(5)], id.slice(5) === lead)
      : panel(PANEL_OF[id], '')}
  </article>`).join('');

  drawHead(reason, lead);
  wireRoleCards(host, byRole);
  wireCardOrder(host, () => drawToday());
  drawMeetings();
  drawSignals();
}

function drawHead(reason, lead) {
  const mode = orderMode();
  const mine = savedOrder().length > 0;
  $('todayHead').innerHTML = `<div class="todayline">
    <button class="orderpill${mode === 'lead' ? ' on' : ''}" id="whyOrder" aria-pressed="${mode === 'lead'}">
      <span class="dot" aria-hidden="true"></span>${esc(t('Today\u2019s top priority'))}</button>
    <button class="btn quiet" id="pinOrder" aria-pressed="${mode === 'mine'}" ${mine ? '' : 'disabled'}
      title="${esc(t(mine ? 'Put the cards back the way you arranged them' : 'Drag a card to make an order of your own'))}">${esc(t('My pin order'))}</button>
  </div><p class="orderwhy" id="orderWhy" ${mode === 'lead' && reason ? '' : 'hidden'}>${esc(reason || '')}</p>`;

  /* One button, two jobs, and they are the same job: it says what today's top priority is and
     it puts that card first. Pressing it again lets the order go back to what it was, so it
     reads as a state rather than as a thing that happened to you (ST-08). */
  $('whyOrder').onclick = () => {
    vsSet('orderMode', orderMode() === 'lead' ? 'auto' : 'lead');
    drawToday();
  };
  $('pinOrder').onclick = () => { vsSet('orderMode', 'mine'); drawToday(); };
}

/* Dragging, and the keyboard that has to do the same job.
   The cards are moved in the DOM rather than re-rendered: the two panels hold data already
   fetched and open disclosures the advisor opened, and re-rendering to change an order would
   throw both away and ask the server for them again. */
function wireCardOrder(host, redraw) {
  const idsNow = () => [...host.querySelectorAll('.tcard')].map(el => el.dataset.card);

  const apply = (next) => {
    const byId = Object.fromEntries([...host.querySelectorAll('.tcard')].map(el => [el.dataset.card, el]));
    next.forEach(id => byId[id] && host.appendChild(byId[id]));
    /* An arrangement made by hand is theirs from now on, and the pins move with the cards they
       are on — a tack means "this slot" from the moment it is set, and keeps meaning that. */
    vsSet('cardOrder', next);
    vsSet('orderMode', 'mine');
    vsSet('cardPins', pinsFor(next, Object.keys(cardPins())));
    drawHead(null, null);
  };

  let dragging = null;
  host.querySelectorAll('[data-grip]').forEach(g => {
    const card = g.closest('.tcard');
    g.ondragstart = (e) => {
      dragging = g.dataset.grip;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', dragging);
      e.dataTransfer.setDragImage(card, 24, 18);
      card.classList.add('dragging');
    };
    g.ondragend = () => { dragging = null; host.querySelectorAll('.tcard').forEach(c => c.classList.remove('dragging', 'over')); };
    /* The same move without a mouse. Left and right rather than up and down, because the grid
       is two across and reading order is what the arrow follows. */
    g.onkeydown = (e) => {
      const by = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[e.key];
      if (!by) return;
      e.preventDefault();
      apply(nudge(idsNow(), g.dataset.grip, by));
      host.querySelector(`[data-grip="${CSS.escape(g.dataset.grip)}"]`).focus();
    };
  });

  host.querySelectorAll('.tcard').forEach(card => {
    card.ondragover = (e) => {
      if (!dragging || card.dataset.card === dragging) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      card.classList.add('over');
    };
    card.ondragleave = () => card.classList.remove('over');
    card.ondrop = (e) => {
      e.preventDefault();
      card.classList.remove('over');
      const id = e.dataTransfer.getData('text/plain') || dragging;
      if (!id) return;
      const ids = idsNow();
      /* Dropped past the middle means after, which is what makes the last slot reachable. */
      const r = card.getBoundingClientRect();
      const after = (e.clientY - r.top) > r.height / 2;
      apply(move(ids, id, card.dataset.card, after));
    };
  });

  host.querySelectorAll('[data-tack]').forEach(b => b.onclick = () => {
    const id = b.dataset.tack, pins = { ...cardPins() };
    if (id in pins) delete pins[id]; else pins[id] = idsNow().indexOf(id);
    vsSet('cardPins', pins);
    toast(id in pins ? 'Pinned to this place.' : 'Unpinned.');
    redraw();
  });
}

/* An item the advisor answered "not this" to is gone until something changes (CS-04, CS-05).
   It lives in view state because there is nowhere in the contract to put a preference about a
   suggestion; the reason teaches nothing yet, which is honest and is logged. */
const itemKey = (w) => w.role + ':' + (w.action.id || w.meaning.slice(0, 40));
const notThis = () => vsGet('notThis', []) || [];

/* A role's work on Today. It used to be a card — a coloured band, a border, and on the leading
   one a full-bleed gradient behind everything. Luke asked for the boxes gone and the two things
   that were doing the actual work kept: which role leads, and the order they are in (ST-03).

   So this is a section, not a card. The role still names itself, the lead still says it leads,
   and the order is still whatever rankRoles decided this morning. What went is the chrome: no
   band, no border, no fill, no per-role colour on the container. The only colour left on Today
   is the role's own mark, which is the one place ST-02 needs it, and the violet of the
   suggestion well, which means what it means everywhere. */
function roleCard(key, items, isLead) {
  const r = ROLE[key];
  const top = items[0];
  const rest = items.slice(1, 3);
  const body = !top
    /* An empty role says so in one sentence, and never invents a task (FO-05). */
    ? `<p class="empty serif">${esc(t('Nothing pressing in {role} today.', { role: r.name.toLowerCase() }))}</p>`
    /* The whole item in one box, and the label first: whose voice this is, then what it means,
       then what to do about it, then where it came from. The label leads because it qualifies
       everything under it — a suggestion that announces itself after the reader has taken the
       sentence as fact has announced itself too late (TR-01).

       The meaning and the source used to sit outside the well, which left the violet holding
       three buttons and no subject, and made the top item read as a different kind of thing
       from the ones under "Show the next two" — which have always kept their meaning, their
       source and their action together. Now they match. */
    : `<div class="well">
         <span class="well-label">${esc(t('Suggested'))}</span>
         <p class="card-meaning">${esc(top.meaning)}</p>
         <div class="well-actions">
           <button class="btn primary" data-do="${esc(itemKey(top))}">${esc(t(top.action.label))}</button>
           <button class="btn" data-later="${esc(itemKey(top))}">${esc(t('Not now'))}</button>
           <button class="btn quiet" data-notthis="${esc(itemKey(top))}">${esc(t('Not this'))}</button>
         </div>
         <p class="source">${esc(sourceLine(top.source.kinds, top.source.at))}</p>
       </div>
       ${rest.length ? disclosure('role:' + key, rest.length === 1 ? t('Show the next one') : t('Show the next {n}', { n: rest.length }),
         { openLabel: rest.length === 1 ? t('Hide the next one') : t('Hide the next {n}', { n: rest.length }),
           body: `<ul class="rows">${rest.map(w => `<li><div class="grow"><div class="title">${esc(w.meaning)}</div>
             <div class="source">${esc(sourceLine(w.source.kinds, w.source.at))}</div></div>
             <button class="btn" data-do="${esc(itemKey(w))}">${esc(t(w.action.label))}</button></li>`).join('')}</ul>` }) : ''}`;
  return `<section class="rolesec${isLead ? ' lead' : ''} role-${esc(key)}" data-role="${esc(key)}">
    <h3 class="rolesec-head">${roleMark(r.mark, key)}<span class="rolesec-name">${esc(r.name)}</span>
      ${isLead ? `<span class="chip">${esc(t('Leading today'))}</span>` : ''}
      </h3>
    <div class="rolesec-body">${body}</div>
    <div class="rolesec-foot"><button class="link cardlink" data-open-role="${esc(key)}">${esc(t('Open {what}', { what: r.name.toLowerCase() }))}</button></div>
  </section>`;
}

function wireRoleCards(host, byRole) {
  const all = Object.values(byRole).flat();
  const find = (k) => all.find(w => itemKey(w) === k);
  wireDisclosures(host);
  host.querySelectorAll('[data-open-role]').forEach(b => b.onclick = () => goSection('role:' + b.dataset.openRole));
  host.querySelectorAll('[data-do]').forEach(b => b.onclick = () => runItemAction(find(b.dataset.do), b));
  /* Not now, and the advisor picks when (CS-05). An item that stands on a real alert is set
     aside through the contract, so it survives a change of browser and lands in the activity
     log; anything else has nowhere in the contract to live and is kept in view state. The
     difference is invisible to the advisor and is the honest one to make. */
  host.querySelectorAll('[data-later]').forEach(b => b.onclick = () => {
    const w = find(b.dataset.later), row = b.closest('.well-actions'), keep = row.innerHTML, well = b.closest('.well');
    row.outerHTML = snoozeChoices(b.dataset.later);
    const group = well.querySelector('.notnow');
    group.querySelector('[data-snooze-cancel]').onclick = () => { group.outerHTML = `<div class="well-actions">${keep}</div>`; drawToday(); };
    group.querySelectorAll('[data-snooze]').forEach(c => c.onclick = async () => {
      const until = SNOOZE_CHOICES.find(([k]) => k === c.dataset.when)[2]();
      const said = t('Set aside. It comes back {when}.', { when: c.textContent.toLowerCase() });
      if (w && w.alertId) {
        try {
          await api('PATCH', '/alerts/' + encodeURIComponent(w.alertId), { body: { status: 'snoozed', snoozedUntil: until.toISOString() } });
          toast(said, { label: 'Undo', run: () => reopenAlert(w.alertId) });
        } catch (e) { toast(e.message); }
      } else {
        snooze(itemKey(w), until);
        toast(said, { label: 'Undo', run: () => { unsnooze(itemKey(w)); drawToday(); } });
      }
      drawToday();
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
        { label: 'Undo', run: () => { vsSet('notThis', notThis().filter(x => x !== k)); drawToday(); } });
    }
    drawToday();
    loadActivity();
  });
}

async function reopenAlert(id) {
  try { await api('PATCH', '/alerts/' + encodeURIComponent(id), { body: { status: 'open' } }); drawToday(); loadActivity(); }
  catch (e) { toast(e.message); }
}

async function runItemAction(w, btn) {
  if (!w) return;
  const a = w.action;
  if (a.kind === 'household') return openHousehold(a.id, true);
  if (a.kind === 'prospect') return openProspect(a.id, drawToday);
  if (a.kind === 'communication') { vsSet('openComm', a.id); vsSet('inboxTab', 'approve'); return goSection('inbox'); }
  if (a.kind === 'inbox') return goSection('inbox');
  if (a.kind === 'rehearsal') return openSim(a.id, a.subject);
  if (a.kind === 'role') return goSection('role:' + a.id);
  if (a.kind === 'next-action') {
    const t = a.nextAction.suggestedTask;
    btn.disabled = true;
    try {
      await api('POST', '/tasks', { body: { title: t.title, dueDate: t.dueDate, householdId: t.householdId || undefined } });
      toast('Added to your follow-ups.');
      drawToday();
    } catch (e) { toast(e.message); btn.disabled = false; }
  }
}

/* Today's meetings keep their place: they are time-bound, which is what earns a place (FO-03). */
function drawMeetings() {
  load($('w-meetings'), "Today's meetings", () => api('GET', '/meetings'), (r) => {
    const list = r.items, nextIdx = list.findIndex(m => new Date(m.startsAt) > new Date());
    return head("Today's meetings", raw(t('{n} scheduled', { n: list.length }))) + (list.length ? `<ol class="timeline">${list.map((m, i) => `
      <li class="meet${i === nextIdx ? ' next' : ''}"><div class="meet-row"><span class="time">${esc(fmtTime(m.startsAt))}</span><span class="client">${esc(m.householdName || m.prospectName || t('No client attached'))}</span><span class="type">${esc(m.type)}</span>
      ${i === nextIdx ? `<span class="badge next">${esc(t('Next up'))}</span>` : ''}<span class="badge ${m.prepStatus === 'ready' ? 'ready' : 'prep'}">${esc(t(m.prepStatus === 'ready' ? 'Prep ready' : 'Needs prep'))}</span></div>
      ${disclosure('brief:' + m.id, t('Show the prep brief'), { openLabel: t('Hide the prep brief'), cls: 'brief' })}</li>`).join('')}</ol>` : `<p class="empty">${esc(t('No meetings today.'))}</p>`);
  }, (el) => wireDisclosures(el, async (key, inner) => {
    inner.innerHTML = `<p class="meta">${esc(t('Loading\u2026'))}</p>`;
    try {
      const m = await api('GET', '/meetings/' + encodeURIComponent(key.slice('brief:'.length)));
      /* The receipt: what the platform did, from what, and when (TR-04, UX-007). */
      inner.innerHTML = `<p class="meta">${esc(m.brief || t('No brief yet.'))}</p>`
        + (m.preparedAt ? `<p class="receipt"><span class="dot" aria-hidden="true"></span>${esc(t('Prepared by the platform at {time} from {sources}.', { time: fmtTime(m.preparedAt), sources: sourceLine(m.briefSources).replace(/^\S+\s/, '') }))}</p>`
          : m.briefSources ? `<p class="source">${esc(sourceLine(m.briefSources))}</p>` : '');
    } catch { inner.innerHTML = `<p class="meta">${esc(t('The brief could not be loaded. Close this and open it again to retry.'))}</p>`; }
  }));
}

/* Every signal leads with what it means and one suggested action (FO-09, CS-03, UX-011). */
/* One whole sentence per case, singular and plural both written out. English needs the count
   only for the verb; French agrees the noun as well, and neither can be reached by gluing a
   number to a fragment. */
const SIGNAL_MEANING = {
  tax_loss_harvesting: (s) => t(s.count === 1 ? '{n} household has losses worth harvesting. {detail}.' : '{n} households have losses worth harvesting. {detail}.', { n: s.count, detail: s.detail }),
  concentration: (s) => t(s.count === 1 ? '{n} household is over the concentration limit. {detail}.' : '{n} households are over the concentration limit. {detail}.', { n: s.count, detail: s.detail }),
  allocation_drift: (s) => t(s.count === 1 ? '{n} household has drifted from target. {detail}.' : '{n} households have drifted from target. {detail}.', { n: s.count, detail: s.detail }),
  idle_cash: (s) => t(s.count === 1 ? '{n} household is holding more cash than the target. {detail}.' : '{n} households are holding more cash than the target. {detail}.', { n: s.count, detail: s.detail })
};

function drawSignals() {
  load($('w-signals'), 'Portfolio signals', () => api('GET', '/portfolio-signals'), (r) => head('Portfolio signals')
    + (r.items.length ? `<ul class="rows">${r.items.map(s => `
      <li data-sig="${esc(s.id)}"><div class="grow">
        <div class="title">${esc((SIGNAL_MEANING[s.kind] || (() => s.label))(s))}</div>
        <div class="source">${esc(sourceLine(s.source, s.dataAsOf))}</div>
        ${disclosure('signal:' + s.id, t('Show which households'), { openLabel: t('Hide the households') })}
      </div></li>`).join('')}</ul>` : `<p class="empty">${esc(t('No signals right now.'))}</p>`),
  (el) => wireDisclosures(el, async (key, inner) => {
    inner.innerHTML = `<p class="meta">${esc(t('Loading\u2026'))}</p>`;
    try {
      const r = await api('GET', '/portfolio-signals/' + encodeURIComponent(key.slice('signal:'.length)) + '/items', { query: { size: 8 } });
      inner.innerHTML = `<ul class="subrows">${r.items.map(i => `<li><span><button class="link" data-hh="${esc(i.householdId)}">${esc(i.householdName)}</button> <span class="meta">${esc(i.maskedAccountNumber)}</span></span><span>${esc(i.detail)}</span></li>`).join('')}</ul>`;
      inner.querySelectorAll('[data-hh]').forEach(x => x.onclick = () => openHousehold(x.dataset.hh, true));
    } catch { inner.innerHTML = `<p class="meta">${esc(t('These households could not be loaded. Close this and open it again to retry.'))}</p>`; }
  }));
}

/* ---- Book at a glance -----------------------------------------------------------------------
 * The four-number strip, off Today and given its own quiet place (UX_IA §4). GET /summary keeps
 * a home rather than losing one.
 */
export function advGlance() {
  $('section').innerHTML = `<h2 class="pagehead">${esc(t('Book at a glance'))}</h2><dl class="strip" id="strip"></dl>
    <p class="hint">${esc(t('A standing picture of the book. Nothing here needs an answer today — what does is on Today.'))}</p>`;
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
  const run = () => load($('w-tasks'), 'Follow-ups', () => api('GET', '/tasks'), (r) => head('Follow-ups', raw(t('{n} open', { n: r.openCount }))) + (r.items.length ? `<ul class="rows">${r.items.map(t => { const d = dueLabel(t.dueDate); return `
    <li class="task${t.status === 'done' ? ' done' : ''}"><label><input type="checkbox" data-task="${esc(t.id)}" ${t.status === 'done' ? 'checked' : ''}>
    <span class="grow"><span class="title">${esc(t.title)}</span>${t.origin === 'meeting' ? `<span class="tag">${esc(t('From meeting'))}</span>` : ''}${syncBadge(t.sync)}
    <span class="meta" style="display:block">${esc(t.householdName || tr('Practice'))} • <span class="${d.hot && t.status === 'open' ? 'due-hot' : ''}">${esc(d.text)}</span></span></span></label></li>`; }).join('')}</ul>` + syncNotice(r.items) : `<p class="empty">${esc(t('No follow-ups yet.'))}</p>`),
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
      (r) => `<div class="panel-head"><h2>${esc(t('Messages'))}</h2><label class="hint">${esc(t('Show'))} <select id="cmfilter" aria-label="${esc(t('Filter messages by status'))}"><option value="">${esc(t('All'))}</option><option value="draft">${esc(t('Awaiting approval'))}</option><option value="approved">${esc(t('Approved'))}</option><option value="sent">${esc(t('Sent'))}</option></select></label></div>`
        + (r.items.length ? `<ul class="rows">${r.items.map(c => { const [cls, label] = COMM_BADGE[c.status]; return `
          <li><div class="grow"><div class="title">${esc(c.subject)}</div>
          <div class="meta">${esc(c.householdName || t('Practice'))} \u2022 ${esc(CHANNEL[c.channel] || c.channel)} \u2022 ${esc(daysAgo(c.createdAt))}${c.complianceReview ? ` \u2022 <span class="due-hot">${esc(t('compliance review'))}</span>` : ''}</div>
          ${c.approvedBy ? `<div class="meta">${esc(t('Approved by {who}', { who: c.approvedBy }))}</div>` : ''}</div>
          <span class="badge ${cls}">${esc(t(label))}</span>${syncBadge(c.sync)}
          <button class="btn" data-open="${esc(c.id)}">${esc(t(c.status === 'draft' ? 'Read and approve' : 'Open'))}</button></li>`; }).join('')}</ul>` + syncNotice(r.items)
          : `<p class="empty serif">${esc(t('No messages match.'))}</p>`),
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
const CHANNEL_WORD_EN = { email: 'by email', letter: 'by post', portal: 'in their client portal' };
const CHANNEL_WORD = new Proxy(CHANNEL_WORD_EN, { get: (o, k) => (k in o ? t(o[k]) : undefined) });
/* The channel as a noun, for a list row. Contract enum, so mapped rather than printed. */
const CHANNEL_EN = { email: 'email', letter: 'letter', portal: 'portal' };
const CHANNEL = new Proxy(CHANNEL_EN, { get: (o, k) => (k in o ? t(o[k]) : undefined) });

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
  const frameLabel = sent ? t('Sent {when}', { when: daysAgo(c.sentAt || c.createdAt).toLowerCase() })
    : c.status === 'approved' ? t('Approved \u00b7 not sent yet') : t('Draft \u00b7 not sent');

  el.innerHTML = `<section class="panel wide msg-panel">
    <div class="panel-head">
      <button class="link back" id="cmBack">\u2190 ${esc(t('All messages'))}</button>
      <span class="badge ${cls}">${esc(statusLabel)}</span>
    </div>

    <article class="msg" data-state="${esc(c.status)}">
      <span class="msg-label${sent ? ' sent' : ''}">${esc(frameLabel)}</span>
      <div class="msg-frame">
        <dl class="msg-head">
          <div><dt>To</dt><dd>${esc(c.householdName || 'The practice')} <span class="meta">${esc(CHANNEL_WORD[c.channel] || c.channel)}</span></dd></div>
          <div><dt>${esc(t('From'))}</dt><dd>${esc(messageFrom())}</dd></div>
        </dl>
        <label class="vh" for="cmSubject">${esc(t('Subject'))}</label>
        <input class="msg-subject" id="cmSubject" value="${esc(c.subject)}" ${sent ? 'readonly' : ''}>
        <label class="vh" for="cmBody">${esc(t('Message'))}</label>
        <textarea class="msg-body" id="cmBody" rows="1" ${sent ? 'readonly' : ''}>${esc(c.body)}</textarea>
      </div>
      <p class="source" id="cmReceipt">${esc(commReceipt(c))}</p>
    </article>

    ${c.complianceReview && !sent ? `<p class="hint warnline">${esc(t('Flagged for compliance review. It should not go out until that is done.'))}</p>` : ''}

    <div class="actions msg-actions">
      ${sent ? ''
        : c.status === 'draft'
          ? `<button class="btn primary" id="cmApprove">${esc(t('Approve'))}</button><button class="btn" id="cmRedraft">${esc(t('Rewrite it for me'))}</button>`
          : `<button class="btn primary" id="cmSend">${esc(t('Send'))}</button><button class="btn" id="cmReturn">${esc(t('Back to draft'))}</button><button class="btn" id="cmRedraft">${esc(t('Rewrite it for me'))}</button>`}
      ${sent ? '' : `<select id="cmTone" aria-label="${esc(t('Tone for a rewrite'))}"><option>${esc(t('Warm and direct'))}</option><option>${esc(t('Formal'))}</option><option>${esc(t('Brief'))}</option></select>`}
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
  if (c.editedBy) return t('Drafted by the platform, edited by {who} \u00b7 {when}', { who: c.editedBy, when: daysAgo(c.editedAt).toLowerCase() });
  if (c.draftedBy === 'ai') return t('Drafted by the platform {when} \u00b7 in a {tone} tone', { when: daysAgo(c.createdAt).toLowerCase(), tone: t(c.tone || 'plain').toLowerCase() });
  return t('Written by {who} \u00b7 {when}', { who: c.advisorName || t('an advisor'), when: daysAgo(c.createdAt).toLowerCase() });
}

const autoGrow = (t) => { t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; };

/* The send confirmation (TR-01, TR-02). One sheet, above the page, naming who it goes to, who
 * it comes from, what is attached and whether it can be called back. It is the last thing
 * between a draft and a client, so it says so plainly and it is not the default button.
 */
export function confirmSend(c, send) {
  const dlg = $('dlg');
  dlg.className = 'sheet';
  dlg.innerHTML = `<h2 id="dlgTitle" class="sheet-title">${esc(t('This leaves the firm'))}</h2>
    <dl class="defs sheet-defs">
      <dt>To</dt><dd>${esc(c.householdName || 'The practice')} <span class="meta">${esc(CHANNEL_WORD[c.channel] || c.channel)}</span></dd>
      <dt>${esc(t('From'))}</dt><dd>${esc(messageFrom())}</dd>
      <dt>${esc(t('Subject'))}</dt><dd>${esc(c.subject)}</dd>
      <dt>${esc(t('Attached'))}</dt><dd>${esc(t('Nothing'))}</dd>
    </dl>
    ${c.complianceReview ? `<p class="hint warnline">${esc(t('This message is flagged for compliance review.'))}</p>` : ''}
    <p class="sheet-warn">${esc(t('Once it goes it cannot be recalled.'))}</p>
    <div class="actions sheet-actions">
      <button class="btn primary" id="sendGo">${esc(t('Send it'))}</button>
      <button class="btn" id="sendNo">${esc(t('Not yet'))}</button>
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
/* Contract enums given advisor-facing words, read through t() at call time. */
const lookup = (o) => new Proxy(o, { get: (x, k) => (k in x ? t(x[k]) : undefined) });
const COMPLIANCE_STATUS = lookup({ open: 'open', overdue: 'overdue', done: 'done' });
export const LEAD_SOURCE = lookup({ referral: 'A referral', website: 'The website', event: 'An event', other: 'Somewhere else' });
export const STAGE_LABEL = lookup({ lead: 'Lead', contacted: 'Contacted', meeting_scheduled: 'Meeting scheduled', proposal: 'Proposal', onboarding: 'Onboarding', converted: 'Converted' });
export function advProspects(host) {
  (host || $('section')).innerHTML = `<div class="grid">${panel('w-pros', 'wide')}</div>`;
  const run = () => load($('w-pros'), 'Prospects', () => api('GET', '/prospects', { query: { size: 100 } }), (r) => {
    const total = r.items.reduce((a, p) => a + (p.estimatedAssets || 0), 0);
    return head('Prospects', raw(t('{n} in the pipeline, about {value}', { n: r.totalItems, value: money(total) }))) + `<div class="kanban">${r.stages.map(st => {
      const col = r.items.filter(p => p.stage === st);
      return `<div class="kcol"><h3>${esc(STAGE_LABEL[st])} <span class="count">${col.length}</span></h3>
        ${col.length ? col.map(p => `<article class="kcard" data-pros="${esc(p.id)}" tabindex="0" role="button" aria-label="${esc(t('Open {name}', { name: p.name }))}">
          <div class="title">${esc(p.name)}</div>
          <div class="meta">${p.estimatedAssets ? esc(money(p.estimatedAssets)) : esc(t('Assets unknown'))} • ${esc(LEAD_SOURCE[p.source] || p.source)}</div>
          ${p.meetingId ? `<div class="meta">${esc(t('Meeting booked'))}</div>` : ''}</article>`).join('') : `<p class="empty">${esc(t('Empty'))}</p>`}</div>`;
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
  dlg.innerHTML = `<p class="empty">${esc(t('Loading\u2026'))}</p>`; dlg.showModal();
  try {
    const p = await api('GET', '/prospects/' + encodeURIComponent(id));
    const stages = Object.keys(STAGE_LABEL), i = stages.indexOf(p.stage), next = stages[i + 1];
    dlg.innerHTML = `<button class="btn quiet close" data-close>${esc(t('Close'))}</button><h2 id="dlgTitle">${esc(p.name)}</h2>
      <div><span class="badge plain">${esc(STAGE_LABEL[p.stage])}</span></div>
      <dl class="defs"><dt>${esc(t('Estimated assets'))}</dt><dd>${p.estimatedAssets ? moneyFull(p.estimatedAssets) : esc(t('Unknown'))}</dd><dt>${esc(t('Came from'))}</dt><dd>${esc(LEAD_SOURCE[p.source] || p.source)}</dd><dt>${esc(t('First seen'))}</dt><dd>${esc(daysAgo(p.createdAt))}</dd></dl>
      <h3>${esc(t('Intake notes'))}</h3><p class="draft">${esc(p.intakeNotes || t('No notes yet.'))}</p>
      ${next ? `<div class="actions"><button class="btn primary" id="prAdv">${esc(t('Move to {stage}', { stage: STAGE_LABEL[next] }))}</button>` : `<p class="hint">${esc(t('This prospect has converted.'))}</p><div class="actions">`}
        <button class="btn" id="prMatch">${esc(t('Which advisor fits?'))}</button></div>
      <div id="prOut"></div>`;
    $('prMatch').onclick = async () => {
      const b = $('prMatch'); b.disabled = true;
      try {
        const r = await api('GET', '/prospects/' + encodeURIComponent(id) + '/matches');
        $('prOut').innerHTML = `<h3>${esc(t('Suggested fit'))}</h3><ul class="rows">${r.items.map((mt, i) => `
          <li><span class="count">${i + 1}</span><div class="grow"><div class="title">${esc(mt.advisorName)}${mt.advisorId === r.currentAdvisorId ? ` <span class="tag">${esc(t('current'))}</span>` : ''}</div>
          ${mt.reasons.map(x => `<div class="meta">${esc(x)}</div>`).join('')}</div></li>`).join('')}</ul>
          <p class="hint">${esc(r.note)}</p>`;
      } catch (e) { toast(e.message); } finally { b.disabled = false; }
    };
    const adv = $('prAdv');
    if (adv) adv.onclick = async () => {
      adv.disabled = true;
      try { await api('PATCH', '/prospects/' + encodeURIComponent(id), { body: { stage: next } }); toast(t('Moved to {stage}.', { stage: STAGE_LABEL[next] })); dlg.close(); done(); }
      catch (e) { toast(e.message); adv.disabled = false; }
    };
  } catch (e) { dlg.innerHTML = `<button class="btn quiet close" data-close>${esc(t('Close'))}</button><p class="err">${esc(e.message)}</p>`; }
}

/* ---- Onboarding, and importing a book ---- */
export function advOnboarding(host) {
  (host || $('section')).innerHTML = `<div class="grid"><div class="col">${panel('w-onb')}</div><div class="col">${panel('w-mig')}</div></div>`;
  const run = () => load($('w-onb'), 'New clients', () => api('GET', '/onboarding'), (r) =>
    head('New clients', raw(t('{n} in progress', { n: r.items.length }))) + (r.items.length ? r.items.map(o => `
      <article class="onb" data-onb="${esc(o.id)}"><div class="onb-head"><div><div class="title">${esc(o.name)}</div>
      <div class="meta">${esc(t('Started {when} \u2022 {done} of {total} steps', { when: daysAgo(o.startedAt).toLowerCase(), done: o.stepsComplete, total: o.stepsTotal }))}</div></div>
      <button class="btn primary" data-convert="${esc(o.id)}" ${o.readyToConvert ? '' : 'disabled'}>${esc(t('Convert to client'))}</button></div>
      <ul class="steps">${o.steps.map(s => `<li class="step ${esc(s.status)}">
        <label><input type="checkbox" data-step="${esc(o.id)}:${esc(s.id)}" ${s.status === 'done' ? 'checked' : ''}>
        <span class="grow"><button class="link" data-detail="${esc(o.id)}:${esc(s.id)}">${esc(s.label)}</button></span></label></li>`).join('')}</ul></article>`).join('')
      : `<p class="empty">${esc(t('Nobody is onboarding right now.'))}</p>`),
  (el) => {
    el.querySelectorAll('[data-step]').forEach(c => c.addEventListener('change', async () => {
      const [oid, sid] = c.dataset.step.split(':');
      try { await api('PATCH', `/onboarding/${encodeURIComponent(oid)}/steps/${encodeURIComponent(sid)}`, { body: { status: c.checked ? 'done' : 'open' } }); run(); }
      catch (e) { c.checked = !c.checked; toast(e.message); }
    }));
    el.querySelectorAll('[data-detail]').forEach(b => b.onclick = async () => {
      const [oid, sid] = b.dataset.detail.split(':');
      const dlg = $('dlg'); dlg.innerHTML = `<p class="empty">${esc(t('Loading\u2026'))}</p>`; dlg.showModal();
      try {
        const o = await api('GET', '/onboarding/' + encodeURIComponent(oid));
        const s = o.steps.find(x => x.id === sid);
        dlg.innerHTML = `<button class="btn quiet close" data-close>${esc(t('Close'))}</button><h2 id="dlgTitle">${esc(s.label)}</h2>
          <div class="meta">${esc(o.name)}</div>
          <p class="draft">${esc(s.detail || t('Not started yet. Nothing has been captured for this step.'))}</p>
          ${s.completedAt ? `<p class="hint">${esc(t('Completed {date}.', { date: fmtDate(localDate(new Date(s.completedAt))) }))}</p>` : ''}`;
      } catch (e) { dlg.innerHTML = `<button class="btn quiet close" data-close>${esc(t('Close'))}</button><p class="err">${esc(e.message)}</p>`; }
    });
    el.querySelectorAll('[data-convert]').forEach(b => b.onclick = async () => {
      b.disabled = true;
      try { const r = await api('POST', `/onboarding/${encodeURIComponent(b.dataset.convert)}/convert`); toast(t('{name} is now in your book.', { name: r.name })); run(); advLoadStrip(); }
      catch (e) { toast(e.message); b.disabled = false; }
    });
  });
  run();

  load($('w-mig'), 'Import a book', () => api('GET', '/migrations'), (past) =>
    head('Import a book', 'Migrate from another system') + `
    <p class="hint">${esc(t('Paste one household per line as'))} <code>${esc(t('Name, assets'))}</code>. ${esc(t('Rows that fail validation are reported and skipped; the rest are imported and flagged for review.'))}</p>
    <div class="field"><label for="migSrc">${esc(t('Where is it coming from?'))}</label><input type="text" id="migSrc" value="Redtail export"></div>
    <div class="field"><label for="migRows">${esc(t('Households'))}</label><textarea id="migRows" rows="6">Okonkwo household, 3200000
Vance Trust, 1400000
, 50
Bad Assets, -3</textarea></div>
    <button class="btn primary" id="migGo">${esc(t('Validate and import'))}</button>
    <div id="migOut"></div>
    ${past && past.items.length ? `<h3>${esc(t('Past imports'))}</h3><ul class="rows">${past.items.map(m => `
      <li><div class="grow"><div class="title">${esc(m.source)}</div>
      <div class="meta">${esc(daysAgo(m.createdAt))} \u2022 ${esc(t('{imported} imported, {rejected} rejected', { imported: m.counts.imported, rejected: m.counts.invalid }))}</div></div></li>`).join('')}</ul>` : ''}`,
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
        $('migOut').innerHTML = `<dl class="defs"><dt>${esc(t('Read'))}</dt><dd>${r.counts.read}</dd><dt>${esc(t('Imported'))}</dt><dd>${r.counts.imported}</dd><dt>${esc(t('Rejected'))}</dt><dd>${r.counts.invalid}</dd></dl>`
          + (r.invalidRows.length ? `<ul class="rows">${r.invalidRows.map(x => `<li><div class="grow"><div class="title">${esc(t('Row {n}', { n: x.row + 1 }))}</div><div class="meta">${esc(x.problems.join('; '))}</div></div></li>`).join('')}</ul>` : '');
        toast(t('{n} imported, flagged for review.', { n: r.counts.imported }));
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
          <button class="cadd" data-add="${esc(key)}" aria-label="${esc(t('Add a meeting on {date}', { date: fmtDate(key) }))}">+</button></div>`);
      }
      return `<div class="panel-head"><h2>${esc(calMonth.toLocaleDateString(locale(), { month: 'long', year: 'numeric' }))}</h2>
        <span class="actions"><button class="btn" data-mv="-1">${esc(t('Previous'))}</button><button class="btn" data-mv="1">${esc(t('Next'))}</button></span></div>
        <div class="calgrid">${weekdayNames().map(d => `<div class="cdow">${esc(d)}</div>`).join('')}${cells.join('')}</div>
        <p class="hint">${esc(t('Past meetings hold notes or a transcript. Select one to read it and draft follow-ups.'))}</p>`;
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
  dlg.innerHTML = `<p class="empty">${esc(t('Loading\u2026'))}</p>`; dlg.showModal();
  try {
    const hh = await api('GET', '/households', { query: { size: 100, sort: 'name,asc' } });
    dlg.innerHTML = `<button class="btn quiet close" data-close>${esc(t('Close'))}</button><h2 id="dlgTitle">${esc(t('New meeting'))}</h2>
      <div class="field"><label for="nmType">${esc(t('What is it?'))}</label><input type="text" id="nmType" placeholder="${esc(t('For example, Annual review'))}"></div>
      <div class="field"><label for="nmHh">${esc(t('Client'))}</label><select id="nmHh"><option value="">${esc(t('No client attached (prospect)'))}</option>${hh.items.map(h => `<option value="${esc(h.id)}">${esc(h.name)}</option>`).join('')}</select></div>
      <div class="field"><label for="nmTime">${esc(t('Time'))}</label><input type="time" id="nmTime" value="10:00"></div>
      <div class="field"><label for="nmMins">${esc(t('Minutes'))}</label><input type="number" id="nmMins" value="45" min="15" step="15"></div>
      <button class="btn primary" id="nmGo">${esc(t('Add to {date}', { date: fmtDate(date) }))}</button>`;
    $('nmGo').onclick = async () => {
      const type = $('nmType').value.trim(); if (!type) { toast('Give the meeting a name.'); return; }
      const b = $('nmGo'); b.disabled = true;
      try {
        await api('POST', '/meetings', { body: { startsAt: new Date(date + 'T' + ($('nmTime').value || '10:00') + ':00').toISOString(), type,
          householdId: $('nmHh').value || undefined, durationMinutes: Number($('nmMins').value) || 30 } });
        toast('Meeting added.'); dlg.close(); done();
      } catch (e) { toast(e.message); b.disabled = false; }
    };
  } catch (e) { dlg.innerHTML = `<button class="btn quiet close" data-close>${esc(t('Close'))}</button><p class="err">${esc(e.message)}</p>`; }
}

export async function openMeeting(id, done) {
  const dlg = $('dlg');
  dlg.innerHTML = `<p class="empty">${esc(t('Loading\u2026'))}</p>`; dlg.showModal();
  try {
    const m = await api('GET', '/meetings/' + encodeURIComponent(id));
    let record = null;
    try { record = await api('GET', '/meetings/' + encodeURIComponent(id) + '/record'); } catch { /* most meetings have none */ }
    dlg.innerHTML = `<button class="btn quiet close" data-close>${esc(t('Close'))}</button><h2 id="dlgTitle">${esc(m.type)}</h2>
      <div class="meta">${esc(m.householdName || m.prospectName || t('No client attached'))} • ${esc(t('{date} at {time} \u2022 {n} minutes', { date: fmtDate(localDate(new Date(m.startsAt))), time: fmtTime(m.startsAt), n: m.durationMinutes }))}</div>
      <h3>${esc(t('Prep brief'))}</h3><p class="draft">${esc(m.brief || t('No brief yet.'))}</p>
      ${record ? `<h3>${esc(t(record.kind === 'transcript' ? 'Transcript' : 'Notes'))}</h3>
        ${record.consent ? `<p class="hint">${esc(t('Recording consent:'))} ${record.consent.obtained ? esc(record.consent.method ? t('on file, {how}', { how: record.consent.method }) : t('on file')) : `<strong>${esc(t('not on file'))}</strong>`}.</p>` : ''}
        ${record.withheld ? `<p class="err">${esc(record.withheldReason)}</p>`
          : `<p class="draft">${esc(record.content)}</p><div class="actions"><button class="btn primary" id="mtNext">${esc(t('Suggest next steps'))}</button></div><div id="mtOut"></div>`}`
        : `<p class="hint">${esc(t('No notes or transcript for this meeting.'))}</p>`}
      <div class="actions" style="margin:4px 0 10px">
        ${record && !record.withheld ? `<button class="btn" id="mtSum">${esc(t('Summarise'))}</button>` : ''}
        ${new Date(m.startsAt) > new Date() ? `<button class="btn" id="mtAgenda">${esc(t('Draft agenda'))}</button>
          <button class="btn" id="mtSim">${esc(t('Rehearse this'))}</button>` : ''}</div>
      <div id="mtDraft"></div>
      ${new Date(m.startsAt) > new Date() ? `<h3>${esc(t('Move'))}</h3>
        <div class="field"><label for="mtWhen">${esc(t('New date and time'))}</label><input type="datetime-local" id="mtWhen" value="${esc(localDate(new Date(m.startsAt)))}T${esc(new Date(m.startsAt).toTimeString().slice(0, 5))}"></div>
        <button class="btn" id="mtMove">${esc(t('Move meeting'))}</button>` : ''}
      <div class="actions"><button class="btn quiet" id="mtDel">${esc(t('Cancel meeting'))}</button></div>`;
    const nx = $('mtNext');
    if (nx) nx.onclick = async () => {
      nx.disabled = true;
      try {
        const s = await api('POST', '/meetings/' + encodeURIComponent(id) + '/record/next-steps');
        $('mtOut').innerHTML = `<p class="hint">${esc(t('Drafts only. Nothing is created until you add one as a follow-up.'))}</p>
          <ul class="rows">${s.items.map((it, i) => `<li><div class="grow"><div class="title">${esc(it.title)}</div><div class="meta">${it.dueDate ? esc(t('Suggested due {date}', { date: fmtDate(it.dueDate) })) : esc(t('No date'))}</div></div>
          <button class="btn" data-accept="${i}">${esc(t('Add as follow-up'))}</button></li>`).join('')}</ul>`;
        $('mtOut').querySelectorAll('[data-accept]').forEach(b => b.onclick = async () => {
          const it = s.items[+b.dataset.accept]; b.disabled = true;
          try { await api('POST', '/tasks', { body: { title: it.title, householdId: it.householdId || undefined, dueDate: it.dueDate || undefined, origin: 'meeting', originMeetingId: id } }); toast('Added to your follow-ups.'); b.textContent = t('Added'); advLoadStrip(); }
          catch (e) { toast(e.message); b.disabled = false; }
        });
      } catch (e) { toast(e.message); nx.disabled = false; }
    };
    const sum = $('mtSum');
    if (sum) sum.onclick = () => runDraft(sum, $('mtDraft'), 'POST', '/meetings/' + encodeURIComponent(id) + '/record/summary');
    const ag = $('mtAgenda');
    if (ag) ag.onclick = () => runDraft(ag, $('mtDraft'), 'POST', '/meetings/' + encodeURIComponent(id) + '/agenda');
    /* The rehearsal opens beside the page, so the dialog closes: an adviser practising a meeting
       wants the meeting on screen, not a modal over it. */
    const sim = $('mtSim');
    if (sim) sim.onclick = () => { dlg.close(); openSim(id, m.householdName || m.prospectName || m.type); };
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
  } catch (e) { dlg.innerHTML = `<button class="btn quiet close" data-close>${esc(t('Close'))}</button><p class="err">${esc(e.message)}</p>`; }
}

/* ---- Inbox --------------------------------------------------------------------------------
 * Messages to answer, drafts to approve and follow-ups due, in one place. Communications and
 * Follow-ups merge because both are "waiting on someone" (UX_IA §4). Each item also shows on
 * the person's record, so there are two doors to it and only one item.
 */
export function advInbox() {
  $('section').innerHTML = `<h2 class="pagehead">${esc(t('Inbox'))}</h2>
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
    const title = raw(t('{role} priorities', { role: ROLE[key].name }));
    host.innerHTML = head(title) + '<div class="skel"></div><div class="skel m"></div>';
    try {
      const work = (await collectRoleWork(state.session && state.session.advisorId)).filter(w => w.role === key);
      host.innerHTML = head(title, work.length ? raw(t('{n} to answer', { n: work.length })) : '')
        + (work.length ? `<ul class="rows">${work.map(w => `<li><div class="grow"><div class="title">${esc(w.meaning)}</div>
            <div class="source">${esc(sourceLine(w.source.kinds, w.source.at))}</div></div>
            <button class="btn" data-ritem="${esc(itemKey(w))}">${esc(t(w.action.label))}</button></li>`).join('')}</ul>`
          : `<p class="empty serif">${esc(t('Nothing pressing in {role} today.', { role: ROLE[key].name.toLowerCase() }))}</p>`);
      host.querySelectorAll('[data-ritem]').forEach(b => b.onclick = () =>
        runItemAction(work.find(w => itemKey(w) === b.dataset.ritem), b));
    } catch (e) { host.innerHTML = head(title) + `<div class="err">${esc(e.message)}</div>`; }
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
    return head('Referrals', raw(t('{n} in the pipeline, about {value}', { n: refs.length, value: money(value) })))
      + (refs.length ? `<ul class="rows">${refs.map(p => `<li><div class="grow">
        <div class="title">${esc(p.name)}</div>
        <div class="meta">${esc(STAGE_LABEL[p.stage])} • ${p.estimatedAssets ? esc(money(p.estimatedAssets)) : esc(t('Assets unknown'))} • ${esc(t('{n} days at this stage', { n: daysBetween(p.stageChangedAt) }))}</div>
        <div class="source">${esc(sourceLine('crm', p.lastContactAt || p.createdAt))}</div></div>
        <button class="btn" data-pros="${esc(p.id)}">${esc(t('Open'))}</button></li>`).join('')}</ul>`
        : `<p class="empty">${esc(t('Nobody has been referred to you yet.'))}</p>`);
  }, (el2) => el2.querySelectorAll('[data-pros]').forEach(b => b.onclick = () => openProspect(b.dataset.pros, () => referralsPanel(el))));
}

/* Meetings inside the Clients home: what is booked and whether it is prepared. The Calendar in
   the spine is for moving things; this is for knowing where you stand. */
function clientMeetingsPanel(el) {
  el.innerHTML = `<div class="grid">${panel('w-cm', 'wide')}</div>`;
  const to = new Date(); to.setDate(to.getDate() + 14);
  load($('w-cm'), 'Meetings', () => api('GET', '/meetings', { query: { from: localDate(new Date()), to: localDate(to) } }), (r) =>
    head('Meetings', 'Next 14 days') + (r.items.length ? `<ul class="rows">${r.items.map(m => `
      <li><div class="grow"><div class="title">${esc(m.householdName || m.prospectName || t('No client attached'))}</div>
      <div class="meta">${esc(t('{date} at {time}', { date: fmtDate(m.startsAt.slice(0, 10)), time: fmtTime(m.startsAt) }))} • ${esc(m.type)}</div></div>
      <span class="badge ${m.prepStatus === 'ready' ? 'ready' : 'prep'}">${esc(t(m.prepStatus === 'ready' ? 'Prep ready' : 'Needs prep'))}</span>
      <button class="btn" data-mt="${esc(m.id)}">${esc(t('Open'))}</button></li>`).join('')}</ul>` : `<p class="empty">${esc(t('Nothing is booked in the next two weeks.'))}</p>`),
  (el2) => el2.querySelectorAll('[data-mt]').forEach(b => b.onclick = () => openMeeting(b.dataset.mt, () => clientMeetingsPanel(el))));
}

/* What the firm charges this advisor's households (AX-10). */
function billingPanel(el) {
  el.innerHTML = `<div class="grid">${panel('w-fees', 'wide')}</div>`;
  load($('w-fees'), 'Billing and fees', () => api('GET', '/billing/fees', { query: { size: 100 } }), (r) =>
    head('Billing and fees', raw(t('{value} a year across {n} households', { value: money(r.items.reduce((a, f) => a + f.annualFee, 0)), n: r.items.length })))
    + `<div class="tablewrap"><table><thead><tr><th>${esc(t('Household'))}</th><th class="num">${esc(t('Assets'))}</th><th class="num">${esc(t('Rate'))}</th><th class="num">${esc(t('Annual fee'))}</th><th>${esc(t('Basis'))}</th></tr></thead><tbody>
      ${r.items.map(f => `<tr><td>${esc(f.householdName)}</td><td class="num">${money(f.aum)}</td><td class="num">${f.annualRatePct}%</td><td class="num">${money(f.annualFee)}</td><td>${f.override ? `<span class="badge warn">${esc(t('Override'))}</span>` : esc(t('Schedule'))}</td></tr>`).join('')}</tbody></table></div>`
    + `<p class="hint">${esc(t('Changing what a household is charged is done on the household itself, where the reason is recorded with it.'))}</p>`);
}

function compliancePanel(el) {
  el.innerHTML = `<div class="grid">${panel('w-comp', 'wide')}</div>`;
  load($('w-comp'), 'Compliance', () => api('GET', '/firm/compliance', { query: { size: 20 } }), (r) =>
    head('Compliance', raw(t('{n} items', { n: r.totalItems }))) + (r.items.length ? `<ul class="rows">${r.items.map(c => `
      <li><div class="grow"><div class="title">${esc(c.title)}</div>
      <div class="meta">${esc(CATEGORY[c.category] || c.category)} • ${esc(c.advisorName || t('The firm'))} • ${esc(t('due {date}', { date: fmtDate(c.dueDate) }))}</div></div>
      <span class="badge ${c.status === 'overdue' ? 'crit' : c.status === 'done' ? 'ok' : 'plain'}">${esc(COMPLIANCE_STATUS[c.status] || c.status)}</span></li>`).join('')}</ul>`
      : `<p class="empty">${esc(t('Nothing is outstanding.'))}</p>`));
}

function scorecardPanel(el) {
  el.innerHTML = `<div class="grid">${panel('w-score', 'wide')}</div>`;
  load($('w-score'), 'Your scorecard', () => api('GET', '/firm/advisors/' + encodeURIComponent(SCORE_ID()) + '/scorecard'), (s) =>
    head('Your scorecard', raw(s.advisorName)) + metricRows(s.metrics)
    + `<p class="hint">${esc(t('Compared with the firm median. Where you sit against named colleagues is shown to a principal only. Nothing here is shared with the firm.'))}</p>`);
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
  $('section').innerHTML = `<h2 class="pagehead">${esc(t('Systems'))}</h2><div class="grid">${panel('w-sys', 'wide')}</div>`;
  const run = () => load($('w-sys'), 'Systems', () => api('GET', '/systems'), (r) =>
    head('Systems', raw(t('{n} of {total} connected', { n: r.items.filter(x => x.status === 'connected').length, total: r.items.length })))
    + (r.note ? `<p class="hint gap">${esc(r.note)}</p>` : '')
    + `<ul class="rows">${r.items.map(x => `<li><div class="grow">
        <div class="title">${esc(x.name)}</div>
        <div class="meta">${esc(SYSTEM_KIND[x.kind] || x.kind)}${x.connectedBy ? ' • ' + esc(t('set up by {who}', { who: x.connectedBy })) : ''}</div>
        ${x.cannotSee ? `<div class="meta gap">${esc(x.cannotSee)}</div>` : ''}
        ${x.lastSyncAt ? `<div class="source">${esc(t('Last synced {time}', { time: fmtTime(x.lastSyncAt) }))}</div>` : ''}</div>
      <span class="badge ${x.status === 'connected' ? 'ok' : x.status === 'error' ? 'crit' : 'plain'}">${esc(t(x.status === 'connected' ? 'Connected' : x.status === 'error' ? 'Not working' : 'Not connected'))}</span>
      ${r.canEdit ? `<button class="btn" data-sys="${esc(x.id)}" data-to="${x.status === 'connected' ? 'not_connected' : 'connected'}">${esc(t(x.status === 'connected' ? 'Disconnect' : 'Connect'))}</button>` : ''}</li>`).join('')}</ul>`
    + (r.canEdit ? '' : `<p class="hint">${esc(t('Connections are set up by whoever administers the firm. You can see what they are, and what the platform cannot see because of them.'))}</p>`),
  (el) => el.querySelectorAll('[data-sys]').forEach(b => b.onclick = async () => {
    b.disabled = true;
    try { await api('PATCH', '/systems/' + encodeURIComponent(b.dataset.sys), { body: { status: b.dataset.to } });
      toast(b.dataset.to === 'connected' ? 'Connected.' : 'Disconnected.'); run(); loadActivity(); }
    catch (e) { toast(e.message); b.disabled = false; }
  }));
  run();
}
const SYSTEM_KIND = lookup({ custodian: 'Custodian', crm: 'CRM', email: 'Email', calendar: 'Calendar', documents: 'Documents' });

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
const fmtMetric = (m) => m.unit === 'usd' ? money(m.value) : m.value.toLocaleString(locale());

export function metricRows(metrics) {
  return `<ul class="rows">${metrics.map(m => {
    const better = m.change === 0 ? '' : (m.lowerIsBetter ? (m.change < 0 ? 'up' : 'neg') : (m.change > 0 ? 'up' : 'neg'));
    return `<li><div class="grow"><div class="title">${esc(m.label)}</div>
      ${m.previousValue !== undefined ? `<div class="meta">${esc(t('was {value}', { value: m.unit === 'usd' ? money(m.previousValue) : m.previousValue }))}</div>` : ''}</div>
      <span class="figure-sm">${esc(fmtMetric(m))}</span>
      ${m.change !== undefined ? `<span class="${better}" style="min-width:52px;text-align:right">${m.change > 0 ? '+' : ''}${m.unit === 'usd' ? money(m.change) : m.change}</span>` : ''}
      ${m.firmMedian !== undefined ? `<span class="meta" style="min-width:110px;text-align:right">${esc(t('firm median {value}', { value: m.unit === 'usd' ? money(m.firmMedian) : m.firmMedian }))}</span>` : ''}
      ${m.rank ? `<span class="badge plain">${esc(t('#{rank} of {total}', { rank: m.rank, total: m.outOf }))}</span>` : ''}</li>`;
  }).join('')}</ul>`;
}

export function advReports(host) {
  (host || $('section')).innerHTML = `<div class="grid">${panel('w-report', 'wide')}</div>`;
  let days = 30;
  const runReport = () => load($('w-report'), 'Practice report', () => api('GET', '/reports/practice', { query: { from: backDate(days) } }), (r) =>
    `<div class="panel-head"><h2>${esc(t('Practice report'))}</h2><label class="hint">Last <select id="repDays" aria-label="${esc(t('Reporting period'))}">
      <option value="30">30 days</option><option value="90">90 days</option></select></label></div>`
    + `<p class="hint">${esc(t('{from} to {to}, against {pfrom} to {pto}', { from: fmtDate(r.from), to: fmtDate(r.to), pfrom: fmtDate(r.previousFrom), pto: fmtDate(r.previousTo) }))}</p>`
    + metricRows(r.metrics)
    + Object.entries(r.breakdowns).map(([k, rows]) => rows.length ? `<h3>${esc(t(BREAKDOWN[k] || k))}</h3><ul class="rows">${rows.map(x => `
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
    ([pbs, hh]) => head('Playbooks', raw(t('{n} available', { n: pbs.items.length }))) + pbs.items.map(pb => `
      <article class="onb" data-pb="${esc(pb.id)}"><div class="onb-head"><div>
        <div class="title">${esc(pb.name)}</div><div class="meta">${esc(pb.description)}</div></div>
        <button class="btn primary" data-run="${esc(pb.id)}">${esc(t('Run'))}</button></div>
      <ul class="steps">${pb.steps.map(st => `<li class="step"><span class="grow">${esc(st.title)}</span>
        <span class="meta">${esc(st.dayOffset === 0 ? t('on the day') : st.dayOffset < 0 ? t('{n} days before', { n: Math.abs(st.dayOffset) }) : t('{n} days after', { n: st.dayOffset }))}</span></li>`).join('')}</ul>
      <div class="field" style="margin-top:8px"><label for="pbHh-${esc(pb.id)}">${esc(t('For'))}</label>
        <select id="pbHh-${esc(pb.id)}"><option value="">${esc(t('No household'))}</option>${hh.items.map(h => `<option value="${esc(h.id)}">${esc(h.name)}</option>`).join('')}</select></div>
      </article>`).join(''),
  (el) => el.querySelectorAll('[data-run]').forEach(b => b.onclick = async () => {
    const id = b.dataset.run, hhId = el.querySelector('#pbHh-' + CSS.escape(id)).value;
    b.disabled = true;
    try {
      const r = await api('POST', '/playbooks/' + encodeURIComponent(id) + '/runs', { body: { householdId: hhId || undefined } });
      toast(t('{n} follow-ups added.', { n: r.tasks.length })); advLoadStrip();
    } catch (e) { toast(e.message); } finally { b.disabled = false; }
  }));
}

/* Households a colleague has shared with you, and ones you have shared out (PO-04). */
export function teamSharePanelFor(elId) {
  load($(elId), 'Shared with the team', () => api('GET', '/team-shares'), (r) => {
    const live = r.items.filter(x => !x.revokedAt);
    return head('Shared with the team', raw(t('{n} active', { n: live.length }))) + (live.length ? `<ul class="rows">${live.map(x => `
      <li><div class="grow"><div class="title">${esc(x.householdName)}</div>
      <div class="meta">${esc(x.direction === 'in' ? t('Shared with you by {who}', { who: x.sharedByName }) : t('You shared this with {who}', { who: x.sharedWithName }))}${x.reason ? ' • ' + esc(x.reason) : ''}</div></div>
      <span class="badge plain">${esc(t(x.direction === 'in' ? 'read access' : 'shared out'))}</span></li>`).join('')}</ul>`
      : `<p class="empty">${esc(t('Nothing is shared with or by you.'))}</p>`);
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
      out.innerHTML = `<p class="err">${esc(r.refusalCategory ? t('The model declined this request ({why}).', { why: r.refusalCategory }) : t('The model declined this request.'))}</p>`;
      return;
    }
    out.innerHTML = `<div class="answer suggestion">
      <p class="demo-lbl">${esc(t(use ? 'Suggested rewrite' : 'Draft'))}</p>
      <p class="draft">${esc(r.draft)}</p>
      ${r.provenance.readFrom && r.provenance.readFrom.length ? `<div class="answer-cites"><strong>${esc(t('Read from'))}</strong>
        <ul>${r.provenance.readFrom.map(c => `<li><span class="tag">${esc(sourceKind(c.source))}</span> ${esc(c.label)}</li>`).join('')}</ul></div>` : ''}
      <p class="hint">${esc(r.provenance.live ? t('Drafted by {model}', { model: r.provenance.model }) : t('Written offline: no model is connected'))}
        \u2022 ${esc(t('prompt {version}.', { version: r.provenance.promptVersion }))} ${esc(t(use ? 'Nothing has changed until you use it.' : 'A draft \u2014 nothing has been saved or sent.'))}</p>
      <div class="actions">${use ? `<button class="btn primary" data-use>${esc(t('Use this wording'))}</button><button class="btn" data-discard>${esc(t('Keep what I have'))}</button>` : `<button class="btn" data-copy>${esc(t('Copy'))}</button>`}</div></div>`;
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
