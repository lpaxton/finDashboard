/* The advisor's own sections. Everything here is internal: none of it may reach a client. */
import { api } from './api.js';
import { $, esc, money, moneyFull, pct, pctClass, fmtTime, fmtDate, localDate, daysAgo, dueLabel, syncBadge, syncNotice } from './format.js';
import { toast, spark, head, panel, load, alertsList, openHousehold, bookPanel, subnav } from './ui.js';
import { state } from './state.js';

/* The role switcher stays the top level (X-15). These are sections inside the advisor view,
   so the client-safe boundary is never one click away from an advisor's own sections. */
export const ADV_SECTIONS = [['today', 'Today'], ['next', 'Next best action'], ['clients', 'Clients'],
  ['communications', 'Communications'], ['prospects', 'Prospects'], ['onboarding', 'Onboarding'],
  ['calendar', 'Calendar'], ['followups', 'Follow-ups'], ['playbooks', 'Playbooks'], ['reports', 'Reports']];
export let advSection = 'today';

export function advLoadStrip() {
  return api('GET', '/summary').then(s => {
    $('strip').innerHTML = `
      <div class="stat"><dt>Assets under management</dt><dd><div class="figure">${money(s.aum.value)}</div><div class="sub"><span class="${pctClass(s.aum.changeMtd)}">${pct(s.aum.changeMtd)}</span> this month</div>${spark(s.aum.trend, 'Assets under management, last 12 months')}</dd></div>
      <div class="stat"><dt>Households</dt><dd><div class="figure">${s.households}</div></dd></div>
      <div class="stat"><dt>Meetings this week</dt><dd><div class="figure">${s.meetingsThisWeek}</div></dd></div>
      <div class="stat"><dt>Open tasks</dt><dd><div class="figure">${s.tasksOpen}</div><div class="sub">${s.tasksDueToday} due today</div></dd></div>`;
  }).catch(e => { $('strip').innerHTML = `<div class="err" style="padding:16px 0">${esc(e.message)}</div>`; });
}

export function advisorView() {
  $('view').innerHTML = `<dl class="strip" id="strip"></dl>
    <nav class="subnav" id="advnav" role="tablist" aria-label="Advisor sections"></nav>
    <div id="section"></div>`;
  advLoadStrip();
  const go = (k) => { advSection = k; subnav($('advnav'), ADV_SECTIONS, k, go); ADV_RENDER[k](); };
  go(advSection);
}

/* ---- Today ---- */
export function advToday() {
  $('section').innerHTML = `<div id="aiNote"></div><div class="grid">
    <div class="col">${panel('w-meetings')}</div>
    <div class="col">${panel('w-alerts')}${panel('w-signals')}</div>
  </div>`;

  // Said once, where nothing reloads over it: an advisor should know what is drafting for them.
  api('GET', '/ai/status').then(st => {
    const el = $('aiNote');
    if (!el || st.live) return;
    el.innerHTML = `<p class="hint" style="margin:0 0 14px">Drafting is offline. ${esc(st.reason || '')} Drafts are still produced, and each one says what made it.</p>`;
  }).catch(() => {});

  load($('w-meetings'), "Today's meetings", () => api('GET', '/meetings'), (r) => {
    const list = r.items, nextIdx = list.findIndex(m => new Date(m.startsAt) > new Date());
    return head("Today's meetings", list.length + ' scheduled') + (list.length ? `<ol class="timeline">${list.map((m, i) => `
      <li class="meet${i === nextIdx ? ' next' : ''}"><div class="meet-row"><span class="time">${esc(fmtTime(m.startsAt))}</span><span class="client">${esc(m.householdName || m.prospectName || 'No client attached')}</span><span class="type">${esc(m.type)}</span>
      ${i === nextIdx ? '<span class="badge next">Next up</span>' : ''}<span class="badge ${m.prepStatus === 'ready' ? 'ready' : 'prep'}">${m.prepStatus === 'ready' ? 'Prep ready' : 'Needs prep'}</span></div>
      <details class="brief" data-id="${esc(m.id)}"><summary>Prep brief</summary><p></p></details></li>`).join('')}</ol>` : '<p class="empty">No meetings today.</p>');
  }, (el) => el.querySelectorAll('details.brief').forEach(d => d.addEventListener('toggle', async () => {
    if (!d.open || d.dataset.loaded) return;
    d.dataset.loaded = '1'; const p = d.querySelector('p'); p.textContent = 'Loading…';
    try { const m = await api('GET', '/meetings/' + encodeURIComponent(d.dataset.id)); p.textContent = (m.brief || 'No brief yet.') + (m.briefSources ? ' Sources: ' + m.briefSources.join(', ') + '.' : ''); }
    catch { p.textContent = "Couldn't load the brief."; d.dataset.loaded = ''; }
  })));

  const alertsLoader = () => api('GET', '/alerts');
  const renderAlerts = (r) => head('Needs attention', r.items.length + ' items') + alertsList(r.items, { dismiss: true });
  const afterAlerts = (el) => {
    el.querySelectorAll('[data-alert-action]').forEach(b => b.onclick = () => {
      if (b.dataset.alertAction === 'Open queue') { advSection = 'communications'; advisorView(); return; }
      toast(b.dataset.alertAction + ' is not built yet.');
    });
    el.querySelectorAll('[data-dismiss]').forEach(b => b.onclick = async () => {
      b.disabled = true;
      try { await api('PATCH', '/alerts/' + encodeURIComponent(b.dataset.dismiss), { body: { status: 'dismissed' } }); toast('Alert dismissed.'); load(el, 'Needs attention', alertsLoader, renderAlerts, afterAlerts); }
      catch (e) { toast(e.message); b.disabled = false; }
    });
  };
  load($('w-alerts'), 'Needs attention', alertsLoader, renderAlerts, afterAlerts);

  load($('w-signals'), 'Portfolio signals', () => api('GET', '/portfolio-signals'), (r) => head('Portfolio signals') + (r.items.length ? `<ul class="rows">${r.items.map(s => `
    <li data-sig="${esc(s.id)}"><span class="count">${esc(s.count)}</span><div class="grow"><div class="title">${esc(s.label)}</div><div class="meta">${esc(s.detail)}</div></div>
    <button class="btn" data-review aria-expanded="false">Review</button></li>`).join('')}</ul>` : '<p class="empty">No signals right now.</p>'),
  (el) => el.querySelectorAll('[data-review]').forEach(b => b.onclick = async () => {
    const li = b.closest('li'), open = li.querySelector('.subrows');
    if (open) { open.remove(); b.setAttribute('aria-expanded', 'false'); b.textContent = 'Review'; return; }
    b.disabled = true;
    try {
      const r = await api('GET', '/portfolio-signals/' + encodeURIComponent(li.dataset.sig) + '/items', { query: { size: 8 } });
      li.insertAdjacentHTML('beforeend', `<ul class="subrows">${r.items.map(i => `<li><span><button class="link" data-hh="${esc(i.householdId)}">${esc(i.householdName)}</button> <span class="meta">${esc(i.maskedAccountNumber)}</span></span><span>${esc(i.detail)}</span></li>`).join('')}</ul>`);
      li.querySelectorAll('[data-hh]').forEach(x => x.onclick = () => openHousehold(x.dataset.hh, true));
      b.setAttribute('aria-expanded', 'true'); b.textContent = 'Hide';
    } catch (e) { toast(e.message); } finally { b.disabled = false; }
  }));
}

/* ---- Clients ---- */
export function advClients() {
  $('section').innerHTML = `<div class="grid">${panel('w-book', 'wide')}${panel('w-team', 'wide')}</div>`;
  bookPanel({ scope: 'own', canShare: true, id: 'w-book', title: 'Book of business', size: 10 });
  teamSharePanelFor('w-team');
}

/* ---- Follow-ups ---- */
export function advFollowups() {
  $('section').innerHTML = `<div class="grid">${panel('w-tasks', 'wide')}</div>`;
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
export function advComms() {
  $('section').innerHTML = `<div class="grid">${panel('w-comms', 'wide')}</div>`;
  let status = '';
  const run = () => load($('w-comms'), 'Communications', () => api('GET', '/communications', { query: { status, size: 20 } }), (r) =>
    `<div class="panel-head"><h2>Communications</h2><label class="hint">Show <select id="cmfilter" aria-label="Filter messages by status"><option value="">All</option><option value="draft">Awaiting approval</option><option value="approved">Approved</option><option value="sent">Sent</option></select></label></div>`
    + (r.items.length ? `<ul class="rows">${r.items.map(c => { const [cls, label] = COMM_BADGE[c.status]; return `
      <li><div class="grow"><div class="title">${esc(c.subject)}</div>
      <div class="meta">${esc(c.householdName || 'Practice')} • ${esc(c.channel)} • ${esc(daysAgo(c.createdAt))}${c.draftedBy === 'ai' ? ' • AI draft' : ''}${c.complianceReview ? ' • <span class="due-hot">compliance review</span>' : ''}</div>
      ${c.approvedBy ? `<div class="meta">Approved by ${esc(c.approvedBy)}</div>` : ''}</div>
      <span class="badge ${cls}">${esc(label)}</span>${syncBadge(c.sync)}
      <button class="btn" data-open="${esc(c.id)}">Open</button></li>`; }).join('')}</ul>` + syncNotice(r.items) : '<p class="empty">No messages match.</p>'),
  (el) => {
    const f = el.querySelector('#cmfilter'); f.value = status; f.onchange = () => { status = f.value; run(); };
    el.querySelectorAll('[data-open]').forEach(b => b.onclick = () => openComm(b.dataset.open, run));
  });
  run();
}

export async function openComm(id, done) {
  const dlg = $('dlg');
  dlg.innerHTML = '<p class="empty">Loading…</p>'; dlg.showModal();
  try {
    const c = await api('GET', '/communications/' + encodeURIComponent(id));
    const [cls, label] = COMM_BADGE[c.status];
    dlg.innerHTML = `<button class="btn quiet close" data-close>Close</button><h2 id="dlgTitle">${esc(c.subject)}</h2>
      <div><span class="badge ${cls}">${esc(label)}</span>${c.complianceReview ? ' <span class="badge crit">Compliance review</span>' : ''}</div>
      <dl class="defs"><dt>To</dt><dd>${esc(c.householdName || 'Practice')}</dd><dt>Channel</dt><dd>${esc(c.channel)}</dd><dt>Tone</dt><dd>${esc(c.tone || 'Not set')}</dd><dt>Drafted</dt><dd>${esc(c.draftedBy === 'ai' ? 'By AI, ' + daysAgo(c.createdAt).toLowerCase() : daysAgo(c.createdAt))}</dd>${c.approvedBy ? `<dt>Approved</dt><dd>${esc(c.approvedBy)}</dd>` : ''}</dl>
      <h3>Draft</h3><p class="draft">${esc(c.body)}</p>
      <p class="hint">${c.status === 'draft' ? 'This is a draft. It cannot be sent until an advisor approves it, and the approval is recorded.' : c.status === 'approved' ? 'Approved and queued. Sending is the last step.' : 'This message has been sent.'}</p>
      <div class="actions">
      ${c.status !== 'sent' ? `<button class="btn" id="cmRedraft">Redraft</button>
        <select id="cmTone" aria-label="Tone"><option>Warm and direct</option><option>Formal</option><option>Brief</option></select>` : ''}
      ${c.status === 'draft' ? '<button class="btn primary" data-act="approved">Approve</button>' : ''}
      ${c.status === 'approved' ? '<button class="btn primary" data-act="sent">Send now</button><button class="btn" data-act="draft">Return to draft</button>' : ''}</div>
      <div id="cmDraft"></div>`;
    const rd = $('cmRedraft');
    if (rd) rd.onclick = () => runDraft(rd, $('cmDraft'), 'POST', '/communications/' + encodeURIComponent(id) + '/redraft', { tone: $('cmTone').value });
    dlg.querySelectorAll('[data-act]').forEach(b => b.onclick = async () => {
      b.disabled = true;
      try {
        await api('PATCH', '/communications/' + encodeURIComponent(id), { body: { status: b.dataset.act } });
        toast(b.dataset.act === 'approved' ? 'Approved. It is queued, not sent.' : b.dataset.act === 'sent' ? 'Sent.' : 'Returned to draft.');
        dlg.close(); done();
      } catch (e) { toast(e.message); b.disabled = false; }
    });
  } catch (e) { dlg.innerHTML = `<button class="btn quiet close" data-close>Close</button><p class="err">${esc(e.message)}</p>`; }
}

/* ---- Prospects ---- */
export const STAGE_LABEL = { lead: 'Lead', contacted: 'Contacted', meeting_scheduled: 'Meeting scheduled', proposal: 'Proposal', onboarding: 'Onboarding', converted: 'Converted' };
export function advProspects() {
  $('section').innerHTML = `<div class="grid">${panel('w-pros', 'wide')}</div>`;
  const run = () => load($('w-pros'), 'Prospects', () => api('GET', '/prospects', { query: { size: 100 } }), (r) => {
    const total = r.items.reduce((a, p) => a + (p.estimatedAssets || 0), 0);
    return head('Prospects', r.totalItems + ' in the pipeline, about ' + money(total)) + `<div class="kanban">${r.stages.map(st => {
      const col = r.items.filter(p => p.stage === st);
      return `<div class="kcol"><h3>${esc(STAGE_LABEL[st])} <span class="count">${col.length}</span></h3>
        ${col.length ? col.map(p => `<article class="kcard" data-pros="${esc(p.id)}" tabindex="0" role="button" aria-label="Open ${esc(p.name)}">
          <div class="title">${esc(p.name)}</div>
          <div class="meta">${p.estimatedAssets ? esc(money(p.estimatedAssets)) : 'Assets unknown'} • ${esc(p.source)}</div>
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
      <dl class="defs"><dt>Estimated assets</dt><dd>${p.estimatedAssets ? moneyFull(p.estimatedAssets) : 'Unknown'}</dd><dt>Source</dt><dd>${esc(p.source)}</dd><dt>First seen</dt><dd>${esc(daysAgo(p.createdAt))}</dd></dl>
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
export function advOnboarding() {
  $('section').innerHTML = `<div class="grid"><div class="col">${panel('w-onb')}</div><div class="col">${panel('w-mig')}</div></div>`;
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

export const ADV_RENDER = { today: advToday, next: advNext, clients: advClients, communications: advComms,
  prospects: advProspects, onboarding: advOnboarding, calendar: advCalendar, followups: advFollowups,
  reports: advReports, playbooks: advPlaybooks };

/* ---- Next best action (PL-02) ----------------------------------------------------------
 * One prioritised list across the book. Every row is a draft: accepting one posts it to
 * /tasks, which is the only thing that creates anything.
 */
export function advNext() {
  $('section').innerHTML = `<div class="grid">${panel('w-next', 'wide')}</div>`;
  const run = () => load($('w-next'), 'Next best action', () => api('GET', '/next-actions', { query: { size: 25 } }), (r) =>
    head('Next best action', r.totalItems + ' suggested') + (r.items.length ? `<ul class="rows">${r.items.map(a => `
      <li><span class="sev ${esc(a.priority)}" title="${esc(a.priority)} priority"></span>
      <div class="grow"><div class="title">${esc(a.title)}</div>
        <div class="meta">${esc(a.reason)}</div>
        <div class="meta">${esc(a.householdName || 'Practice')} • ${a.citations.map(c => esc(c.source)).join(', ')}</div></div>
      <div class="actions"><button class="btn" data-accept="${esc(a.id)}">Add as follow-up</button></div></li>`).join('')}</ul>
      <p class="hint">${esc(r.note)}</p>` : '<p class="empty">Nothing needs doing right now.</p>'),
  (el, r) => el.querySelectorAll('[data-accept]').forEach(b => b.onclick = async () => {
    const a = r.items.find(x => x.id === b.dataset.accept);
    b.disabled = true;
    try {
      await api('POST', '/tasks', { body: { title: a.suggestedTask.title, dueDate: a.suggestedTask.dueDate,
        householdId: a.suggestedTask.householdId || undefined } });
      toast('Added to your follow-ups.'); b.textContent = 'Added'; advLoadStrip();
    } catch (e) { toast(e.message); b.disabled = false; }
  }));
  run();
}

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

export function advReports() {
  $('section').innerHTML = `<div class="grid"><div class="col">${panel('w-report')}</div><div class="col">${panel('w-score')}</div></div>`;
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

  load($('w-score'), 'Your scorecard', () => api('GET', '/firm/advisors/' + encodeURIComponent(SCORE_ID()) + '/scorecard'), (s) =>
    head('Your scorecard', esc(s.advisorName)) + metricRows(s.metrics)
    + '<p class="hint">Compared with the firm median. Where you sit against named colleagues is shown to a principal only.</p>');
}

const BREAKDOWN = { meetingsByType: 'Meetings by type', communicationsByStatus: 'Messages by status', complianceByStatus: 'Compliance by status' };
const backDate = (n) => { const d = new Date(); d.setDate(d.getDate() - n + 1); return localDate(d); };
const SCORE_ID = () => (state.session && state.session.advisorId) || 'adv1';

/* ---- Playbooks (AX-09) ----------------------------------------------------------------
 * Running one IS the advisor's explicit action, so unlike a suggestion these create real
 * follow-ups rather than drafts. The dates come from each step's offset from the anchor.
 */
export function advPlaybooks() {
  $('section').innerHTML = `<div class="grid">${panel('w-pb', 'wide')}</div>`;
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
export async function runDraft(btn, out, method, path, body) {
  btn.disabled = true;
  out.innerHTML = '<div class="skel"></div><div class="skel s"></div>';
  try {
    const r = await api(method, path, body ? { body } : undefined);
    if (r.refused) {
      out.innerHTML = `<p class="err">The model declined this request${r.refusalCategory ? ' (' + esc(r.refusalCategory) + ')' : ''}.</p>`;
      return;
    }
    out.innerHTML = `<div class="answer">
      <p class="demo-lbl">Draft</p>
      <p class="draft">${esc(r.draft)}</p>
      ${r.provenance.readFrom && r.provenance.readFrom.length ? `<div class="answer-cites"><strong>Read from</strong>
        <ul>${r.provenance.readFrom.map(c => `<li><span class="tag">${esc(c.source)}</span> ${esc(c.label)}</li>`).join('')}</ul></div>` : ''}
      <p class="hint">${r.provenance.live ? 'Drafted by ' + esc(r.provenance.model) : 'Written offline: no model is connected'}
        • prompt ${esc(r.provenance.promptVersion)}. A draft — nothing has been saved or sent.</p>
      <button class="btn" data-copy>Copy</button></div>`;
    const copy = out.querySelector('[data-copy]');
    if (copy) copy.onclick = async () => {
      try { await navigator.clipboard.writeText(r.draft); toast('Copied.'); }
      catch { toast('Select the text to copy it.'); }
    };
  } catch (e) { out.innerHTML = `<p class="err">${esc(e.message)}</p>`; }
  finally { btn.disabled = false; }
}
