'use strict';
/*
 * Mock core for the Advisor Platform API v0.2 (see ../openapi.yaml).
 * One consistent dataset behind every operation, with role checks.
 * createMock() returns a fresh, isolated instance, so resetting means creating a new one.
 * handle(method, path, query, body, personaKey) is synchronous and returns { status, data }.
 * The dashboard embeds a copy of this same code for its offline demo.
 */
function createMock() {
  const T0 = new Date(); T0.setHours(0, 0, 0, 0);
  const dayISO = (off, h = 0, m = 0) => { const d = new Date(T0); d.setDate(d.getDate() + off); d.setHours(h, m, 0, 0); return d.toISOString(); };
  const dateOnly = (off) => { const d = new Date(T0); d.setDate(d.getDate() + off); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const hash = (s) => { let x = 0; for (const c of s) x = (x * 31 + c.charCodeAt(0)) >>> 0; return x; };
  const NOW = () => new Date().toISOString();

  const FIRM = { id: 'f1', name: 'Whitfield Wealth Partners' };
  const PERSONAS = {
    dana:   { id: 'u_dana',   name: 'Dana Whitfield', role: 'Principal and senior advisor', roles: ['principal', 'advisor'], views: ['firm', 'advisor'], advisorId: 'adv1' },
    marcus: { id: 'u_marcus', name: 'Marcus Bell',    role: 'Advisor',                      roles: ['advisor'],              views: ['advisor'],         advisorId: 'adv2' },
    grace:  { id: 'u_grace',  name: 'Grace Okafor',   role: 'Client',                       roles: ['client'],               views: ['client'],          householdId: 'h3' }
  };
  let persona = 'dana';
  const user = () => PERSONAS[persona];
  const isRole = (r) => user().roles.includes(r);

  const ADVISORS = [
    { id: 'adv1', name: 'Dana Whitfield' }, { id: 'adv2', name: 'Marcus Bell' },
    { id: 'adv3', name: 'Elena Park' },     { id: 'adv4', name: 'Tom Reyes' }
  ];
  const advName = (id) => ADVISORS.find(a => a.id === id).name;

  // id, name, advisor, assets ($M), 30-day change, days since contact, status
  const HH_ROWS = [
    ['h1', 'Lindqvist Family Trust', 'adv1', 18.4, 0.021, 6, 'needs_review'],
    ['h2', 'Halvorsen Estate', 'adv1', 14.9, 0.012, 12, 'on_track'],
    ['h3', 'Okafor household', 'adv1', 9.7, 0.008, 3, 'on_track'],
    ['h4', 'Nakamura household', 'adv1', 7.2, -0.006, 21, 'on_track'],
    ['h5', 'Delacroix household', 'adv1', 5.8, 0.004, 92, 'overdue_contact'],
    ['h6', 'Priya and Marcus Shah', 'adv1', 3.1, 0, 0, 'onboarding'],
    ['h7', 'Bergstrom household', 'adv1', 2.6, -0.011, 34, 'forms_incomplete'],
    ['h8', 'Whitcombe household', 'adv1', 11.3, 0.017, 9, 'on_track'],
    ['h9', 'Alvarado household', 'adv1', 6.4, 0.005, 15, 'on_track'],
    ['h10', 'Petrov household', 'adv1', 4.5, -0.002, 27, 'on_track'],
    ['h11', 'Abernathy household', 'adv2', 12.8, 0.014, 5, 'on_track'],
    ['h12', 'Castellano household', 'adv2', 10.2, 0.009, 8, 'on_track'],
    ['h13', 'Ito household', 'adv2', 9.1, -0.004, 19, 'needs_review'],
    ['h14', 'Fairweather Trust', 'adv2', 8.4, 0.011, 14, 'on_track'],
    ['h15', 'Guerrero household', 'adv2', 7.7, 0.003, 30, 'needs_review'],
    ['h16', 'Hollis household', 'adv2', 6.5, 0.006, 11, 'on_track'],
    ['h17', 'Jankowski household', 'adv2', 4.9, -0.008, 44, 'on_track'],
    ['h18', 'Kessler household', 'adv2', 3.2, 0.002, 7, 'on_track'],
    ['h19', 'Lindgren household', 'adv3', 13.5, 0.019, 4, 'on_track'],
    ['h20', 'Moreau household', 'adv3', 10.9, 0.007, 13, 'on_track'],
    ['h21', 'Nwosu household', 'adv3', 8.8, 0.01, 22, 'on_track'],
    ['h22', 'Osei household', 'adv3', 7.4, -0.003, 61, 'overdue_contact'],
    ['h23', 'Pruitt household', 'adv3', 5.6, 0.004, 17, 'on_track'],
    ['h24', 'Quill household', 'adv3', 3.3, 0.001, 25, 'on_track'],
    ['h25', 'Rasmussen household', 'adv4', 9.2, 0.008, 10, 'on_track'],
    ['h26', 'Santoro household', 'adv4', 6.1, 0.005, 16, 'on_track'],
    ['h27', 'Tanaka household', 'adv4', 3.8, -0.002, 33, 'on_track'],
    ['h28', 'Underhill household', 'adv4', 2.4, 0, 2, 'forms_incomplete']
  ];
  const ACCT_TYPES = ['Joint brokerage', 'Traditional IRA', 'Roth IRA', 'Trust account'];
  const HH = HH_ROWS.map(([id, name, advisorId, aumM, change30d, days, status]) => {
    const aum = Math.round(aumM * 1e6);
    const n = aumM >= 10 ? 3 : aumM >= 5 ? 2 : 1;
    const split = n === 3 ? [0.55, 0.3, 0.15] : n === 2 ? [0.65, 0.35] : [1];
    const accounts = split.map((f, i) => {
      const balance = Math.round(aum * f);
      return { maskedNumber: '****' + (1000 + hash(id + i) % 9000), type: ACCT_TYPES[(hash(id) + i) % ACCT_TYPES.length], status: 'active',
               openingStatus: status === 'onboarding' || status === 'forms_incomplete' ? 'nigo' : 'igo',
               balance, todayGainLoss: Math.round(balance * change30d / 21), totalGainLoss: Math.round(balance * 0.17) };
    });
    return { id, name, advisorId, aum, change30d, status, accounts,
             lastContactAt: days === 0 ? NOW() : dayISO(-days, 10) };
  });
  const hhById = (id) => HH.find(h => h.id === id);
  const hhSummary = (h) => ({ id: h.id, name: h.name, aum: h.aum, change30d: h.change30d, lastContactAt: h.lastContactAt, status: h.status, accountCount: h.accounts.length, dataAsOf: NOW() });
  const myHH = () => HH.filter(h => h.advisorId === user().advisorId);

  // id, advisor, household, day offset, time, type, prep, duration, brief
  const MEETINGS = [
    ['m1', 'adv1', 'h3', 0, '09:30', 'Annual review', 'ready', 60, 'Retirement date moved up to 2029. A Roth conversion was discussed in March and is still open.'],
    ['m2', 'adv1', 'h1', 0, '11:00', 'Portfolio check-in', 'needs_prep', 45, 'One technology holding has grown to 24% of equities, above the 20% policy limit.'],
    ['m3', 'adv1', 'h6', 0, '13:30', 'New client onboarding', 'ready', 60, 'Intake form is complete. Two documents are still missing: prior-year return and trust deed.'],
    ['m4', 'adv1', 'h2', 0, '16:00', 'Tax planning', 'ready', 45, 'About $18,400 of harvestable losses across two taxable accounts.'],
    ['m5', 'adv1', 'h8', -2, '10:00', 'Annual review', 'ready', 60, 'Completed. Client asked about gifting strategy.'],
    ['m6', 'adv1', 'h9', -1, '14:00', 'Check-in', 'ready', 30, 'Completed. Idle cash discussed.'],
    ['m7', 'adv1', 'h5', 1, '11:00', 'Q4 review', 'needs_prep', 45, 'No contact in 92 days. Confirm goals and beneficiary details.'],
    ['m8', 'adv1', 'h7', 1, '15:00', 'Forms follow-up', 'ready', 30, 'Beneficiary form is incomplete.'],
    ['m9', 'adv2', 'h11', 0, '10:00', 'Portfolio check-in', 'ready', 45, 'Rebalance completed last week.'],
    ['m10', 'adv2', 'h12', 0, '14:00', 'Annual review', 'needs_prep', 60, 'Prior-year return not yet received.'],
    ['m11', 'adv3', 'h19', 0, '09:00', 'Tax planning', 'ready', 45, 'Two harvesting candidates flagged.']
  ].map(([id, advisorId, householdId, off, hm, type, prepStatus, durationMinutes, brief]) => {
    const [h, m] = hm.split(':').map(Number);
    return { id, advisorId, householdId, startsAt: dayISO(off, h, m), type, prepStatus, durationMinutes, brief };
  });

  // id, advisor, title, household, due offset, origin, status
  const TASKS = [
    ['t1', 'adv1', 'Send Roth conversion illustration', 'h3', 0, 'meeting', 'open'],
    ['t2', 'adv1', 'Request prior-year return and trust deed', 'h6', 0, 'manual', 'open'],
    ['t3', 'adv1', 'Approve rebalance proposal', 'h1', 0, 'manual', 'open'],
    ['t4', 'adv1', 'Update CRM notes after Halvorsen call', 'h2', 1, 'meeting', 'open'],
    ['t5', 'adv1', 'Schedule Q4 review', 'h5', 2, 'manual', 'open'],
    ['t6', 'adv1', 'File signed fee agreement', 'h4', 2, 'manual', 'done'],
    ['t7', 'adv1', 'Review beneficiary form', 'h7', -1, 'manual', 'open'],
    ['t8', 'adv2', 'Collect prior-year return', 'h12', 0, 'manual', 'open'],
    ['t9', 'adv2', 'Send restriction paperwork', 'h15', -3, 'manual', 'open'],
    ['t10', 'adv3', 'Confirm harvesting trades', 'h19', 1, 'meeting', 'open'],
    ['t11', 'adv4', 'Chase intake form', 'h28', -2, 'manual', 'open']
  ].map(([id, advisorId, title, householdId, off, origin, status]) => ({ id, advisorId, title, householdId, dueDate: dateOnly(off), origin, originMeetingId: null, status, createdAt: dayISO(-4, 9) }));

  // id, advisor, severity, title, household, action, source, age in hours
  const ALERTS = [
    ['a1', 'adv1', 'high', 'Single holding is 24% of equities, limit is 20%', 'h1', ['review', 'Review'], 'platform', 5],
    ['a2', 'adv1', 'high', '3 client emails waiting for compliance review for over 2 days', null, ['open_queue', 'Open queue'], 'platform', 52],
    ['a3', 'adv1', 'medium', 'Cash above target for 45 days', 'h3', ['review', 'Review'], 'greenmeadows', 30],
    ['a4', 'adv1', 'medium', 'No contact in 92 days', 'h5', ['draft_email', 'Draft email'], 'crm', 70],
    ['a5', 'adv1', 'low', 'Beneficiary form incomplete', 'h7', ['send_reminder', 'Send reminder'], 'crm', 96],
    ['a6', 'adv2', 'high', 'Open margin call, past due date', 'h13', ['review', 'Review'], 'greenmeadows', 20],
    ['a7', 'adv2', 'medium', 'Account restricted: documents needed', 'h15', ['review', 'Review'], 'greenmeadows', 60],
    ['a8', 'adv3', 'medium', 'No contact in 61 days', 'h22', ['draft_email', 'Draft email'], 'crm', 40],
    ['a9', 'adv4', 'low', 'Onboarding form incomplete', 'h28', ['send_reminder', 'Send reminder'], 'crm', 24]
  ].map(([id, advisorId, severity, title, householdId, [type, label], source, age]) => ({
    id, advisorId, severity, title, householdId, source, status: 'open',
    action: { type, label, targetId: householdId }, createdAt: new Date(Date.now() - age * 36e5).toISOString() }));

  // advisor, kind, household, value (dollars, or percent, or points)
  const SIGNAL_ROWS = [
    ['adv1', 'tax_loss_harvesting', 'h1', 12400], ['adv1', 'tax_loss_harvesting', 'h2', 18400], ['adv1', 'tax_loss_harvesting', 'h8', 9700],
    ['adv1', 'tax_loss_harvesting', 'h9', 11200], ['adv1', 'tax_loss_harvesting', 'h3', 9500],
    ['adv1', 'concentration', 'h1', 24], ['adv1', 'concentration', 'h8', 22], ['adv1', 'concentration', 'h4', 21],
    ['adv1', 'allocation_drift', 'h1', 7.2], ['adv1', 'allocation_drift', 'h2', 5.4], ['adv1', 'allocation_drift', 'h3', 6.1],
    ['adv1', 'allocation_drift', 'h8', 8.1], ['adv1', 'allocation_drift', 'h9', 5.9], ['adv1', 'allocation_drift', 'h10', 6.6],
    ['adv1', 'idle_cash', 'h3', 1200000], ['adv1', 'idle_cash', 'h4', 900000], ['adv1', 'idle_cash', 'h9', 700000], ['adv1', 'idle_cash', 'h10', 600000],
    ['adv2', 'tax_loss_harvesting', 'h11', 8200], ['adv2', 'tax_loss_harvesting', 'h14', 6300], ['adv2', 'allocation_drift', 'h12', 5.9]
  ].map(([advisorId, kind, householdId, value], i) => ({ id: 'si' + i, advisorId, kind, householdId, value }));
  const SIGNAL_META = {
    tax_loss_harvesting: { label: 'Tax-loss harvesting opportunities', detail: (v) => 'About $' + Math.round(v.reduce((a, b) => a + b, 0)).toLocaleString('en-US') + ' in unrealized losses' },
    concentration:       { label: 'Households over concentration limit', detail: (v) => 'Largest: ' + Math.max(...v) + '% in one holding' },
    allocation_drift:    { label: 'Households outside target allocation', detail: () => 'Drift beyond 5 points' },
    idle_cash:           { label: 'Households with idle cash above 10%', detail: (v) => 'About $' + (v.reduce((a, b) => a + b, 0) / 1e6).toFixed(1) + 'M total' }
  };
  const itemDetail = (s) => s.kind === 'tax_loss_harvesting' ? 'Unrealized loss of $' + s.value.toLocaleString('en-US')
    : s.kind === 'concentration' ? s.value + '% of equities in one holding'
    : s.kind === 'allocation_drift' ? s.value + ' points from target' : 'About $' + (s.value / 1e6).toFixed(1) + 'M in cash';

  // id, title, category, advisor, household, due offset, status
  const COMPLIANCE = [
    ['c1', 'Review 3 client emails', 'communications_review', 'adv1', null, -2, 'overdue'],
    ['c2', 'Annual review documentation, Lindqvist', 'annual_review', 'adv1', 'h1', 6, 'open'],
    ['c3', 'Disclosure delivery, Halvorsen', 'disclosure', 'adv1', 'h2', 12, 'open'],
    ['c4', 'Restriction review, Guerrero', 'restriction', 'adv2', 'h15', -4, 'overdue'],
    ['c5', 'Advisory agreement renewal, Ito', 'agreement', 'adv2', 'h13', 9, 'open'],
    ['c6', 'Communications sample review', 'communications_review', 'adv3', null, 3, 'open'],
    ['c7', 'Annual review documentation, Nwosu', 'annual_review', 'adv3', 'h21', -1, 'overdue'],
    ['c8', 'Disclosure delivery, Santoro', 'disclosure', 'adv4', 'h26', 15, 'open'],
    ['c9', 'Agreement renewal, Tanaka', 'agreement', 'adv4', 'h27', -20, 'done']
  ].map(([id, title, category, advisorId, householdId, off, status]) => ({ id, title, category, advisorId, advisorName: advName(advisorId), householdId, dueDate: dateOnly(off), status }));

  const DOCS = [
    ['d1', 'Quarterly statement, Q2', 'statement', -85], ['d2', 'Quarterly statement, Q1', 'statement', -175],
    ['d3', 'Year-end statement', 'statement', -265], ['d4', 'Tax form 1099, prior year', 'tax', -240],
    ['d5', 'Advisory agreement', 'agreement', -700], ['d6', 'Fee schedule', 'agreement', -700]
  ].map(([id, title, docType, off], i) => ({ id, householdId: 'h3', title, docType, date: dateOnly(off), source: i > 3 ? 'platform' : 'greenmeadows' }));

  const SHARED = [
    { id: 'sh1', householdId: 'h3', type: 'plan', title: 'Retirement plan summary', message: 'Here is where we landed after our March meeting.', sharedAt: dayISO(-30, 15), sharedBy: 'Dana Whitfield', contentUrl: null },
    { id: 'sh2', householdId: 'h3', type: 'tax_explanation', title: 'What a Roth conversion would mean for you', message: null, sharedAt: dayISO(-12, 11), sharedBy: 'Dana Whitfield', contentUrl: null }
  ];
  const PREFS = { h3: { paperless: true, notificationChannels: ['email', 'portal'] } };
  const MEETING_REQUESTS = [];
  let seq = 100;

  /* ---- helpers ---- */
  const ok = (d) => ({ status: 200, data: d });
  const created = (d) => ({ status: 201, data: d });
  const fail = (status, code, message) => ({ status, data: { code, message } });
  const forbid = () => fail(403, 'forbidden', "Your role can't access this.");
  const notFound = (what) => fail(404, 'not_found', what + ' not found.');

  function paged(items, q, def) {
    const [k, d] = (q.sort || def).split(','); const dir = d === 'asc' ? 1 : -1;
    const sorted = [...items].sort((a, b) => {
      const x = a[k], y = b[k];
      if (x == null) return 1; if (y == null) return -1;
      return (typeof x === 'number' ? x - y : String(x).localeCompare(String(y))) * dir;
    });
    const size = +q.size || 20, page = +q.page || 0;
    return { items: sorted.slice(page * size, page * size + size), page, size, totalItems: items.length };
  }
  function trend(aum) {
    const now = new Date(), out = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const f = i === 0 ? 1 : 1 - i * 0.0075 + Math.sin(i * 1.7) * 0.006;
      out.push({ month: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'), value: Math.round(aum * f) });
    }
    return out;
  }
  function aumBlock(aum) {
    const t = trend(aum);
    return { value: aum, changeMtd: +(t[11].value / t[10].value - 1).toFixed(4), trend: t };
  }
  function weekBounds() {
    const s = new Date(T0); s.setDate(s.getDate() - ((s.getDay() + 6) % 7));
    const e = new Date(s); e.setDate(e.getDate() + 7);
    return [s, e];
  }
  const meetingsFor = (advisorId) => MEETINGS.filter(m => m.advisorId === advisorId);
  const tasksFor = (advisorId) => TASKS.filter(t => t.advisorId === advisorId);
  const withName = (t) => ({ ...t, householdName: t.householdId ? hhById(t.householdId).name : null });
  const publicTask = ({ advisorId, ...t }) => withName(t);

  function advisorRow(id) {
    const hs = HH.filter(h => h.advisorId === id), aum = hs.reduce((a, h) => a + h.aum, 0);
    const [ws, we] = weekBounds();
    return {
      id, name: advName(id), households: hs.length, aum,
      change30d: +(hs.reduce((a, h) => a + h.change30d * h.aum, 0) / aum).toFixed(4),
      meetingsThisWeek: meetingsFor(id).filter(m => new Date(m.startsAt) >= ws && new Date(m.startsAt) < we).length,
      tasksOverdue: tasksFor(id).filter(t => t.status === 'open' && t.dueDate < dateOnly(0)).length,
      openAlerts: ALERTS.filter(a => a.advisorId === id && a.status === 'open').length, dataAsOf: NOW()
    };
  }
  const alertOut = ({ advisorId, ...a }) => ({ ...a, householdName: a.householdId ? hhById(a.householdId).name : null });

  /* ---- routes ---- */
  const routes = [
    ['GET', /^\/session$/, () => { const u = user(); return ok({ id: u.id, name: u.name, role: u.role, roles: u.roles, views: u.views, firm: FIRM }); }],

    ['GET', /^\/summary$/, () => {
      if (!isRole('advisor')) return forbid();
      const id = user().advisorId, hs = myHH(), [ws, we] = weekBounds();
      const open = tasksFor(id).filter(t => t.status === 'open');
      return ok({
        aum: aumBlock(hs.reduce((a, h) => a + h.aum, 0)), households: hs.length,
        meetingsThisWeek: meetingsFor(id).filter(m => new Date(m.startsAt) >= ws && new Date(m.startsAt) < we).length,
        tasksOpen: open.length, tasksDueToday: open.filter(t => t.dueDate === dateOnly(0)).length, dataAsOf: NOW() });
    }],

    ['GET', /^\/households$/, (m, q) => {
      let list;
      if (q.scope === 'firm') { if (!isRole('principal')) return forbid(); list = HH; }
      else { if (!isRole('advisor')) return forbid(); list = myHH(); }
      if (q.status) list = list.filter(h => h.status === q.status);
      return ok(paged(list.map(hhSummary), q, 'aum,desc'));
    }],
    ['GET', /^\/households\/([^/]+)$/, (m) => {
      if (!isRole('advisor') && !isRole('principal')) return forbid();
      const h = hhById(m[1]); if (!h) return notFound('Household');
      if (!isRole('principal') && h.advisorId !== user().advisorId) return notFound('Household');
      return ok({ ...hhSummary(h), accounts: h.accounts });
    }],
    ['POST', /^\/households\/([^/]+)\/shares$/, (m, q, b) => {
      if (!isRole('advisor')) return forbid();
      const h = hhById(m[1]); if (!h || h.advisorId !== user().advisorId) return notFound('Household');
      if (!b || !b.type || !b.sourceId || !b.title) return fail(400, 'bad_request', 'Type, sourceId and title are required.');
      const s = { id: 'sh' + (++seq), householdId: h.id, type: b.type, title: b.title, message: b.message || null, sharedAt: NOW(), sharedBy: user().name, contentUrl: null };
      SHARED.unshift(s);
      const { householdId, ...out } = s; return created(out);
    }],

    ['GET', /^\/meetings$/, (m, q) => {
      if (!isRole('advisor')) return forbid();
      const from = q.from || dateOnly(0), to = q.to || from;
      const list = meetingsFor(user().advisorId).filter(x => { const d = new Date(x.startsAt); const ds = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); return ds >= from && ds <= to; })
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
        .map(({ advisorId, brief, ...x }) => ({ ...x, householdName: hhById(x.householdId).name, brief: null }));
      return ok({ items: list });
    }],
    ['GET', /^\/meetings\/([^/]+)$/, (m) => {
      if (!isRole('advisor')) return forbid();
      const x = MEETINGS.find(y => y.id === m[1] && y.advisorId === user().advisorId); if (!x) return notFound('Meeting');
      const { advisorId, ...out } = x;
      return ok({ ...out, householdName: hhById(x.householdId).name, briefSources: ['greenmeadows', 'crm', 'calendar'] });
    }],

    ['GET', /^\/tasks$/, (m, q) => {
      if (!isRole('advisor')) return forbid();
      let list = tasksFor(user().advisorId);
      if (q.status) list = list.filter(t => t.status === q.status);
      if (q.dueBy) list = list.filter(t => t.dueDate && t.dueDate <= q.dueBy);
      list = [...list].sort((a, b) => (a.status === b.status ? (a.dueDate || '9999').localeCompare(b.dueDate || '9999') : a.status === 'open' ? -1 : 1));
      return ok({ items: list.map(publicTask), openCount: tasksFor(user().advisorId).filter(t => t.status === 'open').length });
    }],
    ['POST', /^\/tasks$/, (m, q, b) => {
      if (!isRole('advisor')) return forbid();
      if (!b || !b.title) return fail(400, 'bad_request', 'Title is required.');
      const t = { id: 't' + (++seq), advisorId: user().advisorId, title: b.title, householdId: b.householdId || null, dueDate: b.dueDate || null, origin: b.origin || 'manual', originMeetingId: b.originMeetingId || null, status: 'open', createdAt: NOW() };
      TASKS.push(t); return created(publicTask(t));
    }],
    ['PATCH', /^\/tasks\/([^/]+)$/, (m, q, b) => {
      if (!isRole('advisor')) return forbid();
      const t = TASKS.find(x => x.id === m[1] && x.advisorId === user().advisorId); if (!t) return notFound('Task');
      Object.assign(t, ['title', 'dueDate', 'status'].reduce((o, k) => (b && k in b ? { ...o, [k]: b[k] } : o), {}));
      return ok(publicTask(t));
    }],

    ['GET', /^\/alerts$/, (m, q) => {
      let list;
      if (q.scope === 'firm') { if (!isRole('principal')) return forbid(); list = ALERTS; }
      else { if (!isRole('advisor')) return forbid(); list = ALERTS.filter(a => a.advisorId === user().advisorId); }
      list = list.filter(a => a.status === (q.status || 'open'));
      if (q.severity) list = list.filter(a => a.severity === q.severity);
      const order = { high: 0, medium: 1, low: 2 };
      list = [...list].sort((a, b) => order[a.severity] - order[b.severity] || b.createdAt.localeCompare(a.createdAt));
      return ok({ items: list.map(alertOut) });
    }],
    ['PATCH', /^\/alerts\/([^/]+)$/, (m, q, b) => {
      if (!isRole('advisor')) return forbid();
      const a = ALERTS.find(x => x.id === m[1] && x.advisorId === user().advisorId); if (!a) return notFound('Alert');
      if (!b || !['open', 'dismissed', 'resolved'].includes(b.status)) return fail(400, 'bad_request', 'Status must be open, dismissed or resolved.');
      a.status = b.status; return ok(alertOut(a));
    }],

    ['GET', /^\/portfolio-signals$/, () => {
      if (!isRole('advisor')) return forbid();
      const mine = SIGNAL_ROWS.filter(s => s.advisorId === user().advisorId);
      const items = Object.keys(SIGNAL_META).map(kind => {
        const rows = mine.filter(s => s.kind === kind); if (!rows.length) return null;
        return { id: 'sig_' + kind, kind, count: rows.length, label: SIGNAL_META[kind].label, detail: SIGNAL_META[kind].detail(rows.map(r => r.value)), dataAsOf: NOW() };
      }).filter(Boolean);
      return ok({ items });
    }],
    ['GET', /^\/portfolio-signals\/([^/]+)\/items$/, (m, q) => {
      if (!isRole('advisor')) return forbid();
      const kind = m[1].replace(/^sig_/, ''); if (!SIGNAL_META[kind]) return notFound('Signal');
      const rows = SIGNAL_ROWS.filter(s => s.advisorId === user().advisorId && s.kind === kind).map(s => {
        const h = hhById(s.householdId);
        return { householdId: h.id, householdName: h.name, maskedAccountNumber: h.accounts[hash(s.id) % h.accounts.length].maskedNumber, detail: itemDetail(s), amount: ['tax_loss_harvesting', 'idle_cash'].includes(kind) ? s.value : null };
      });
      const size = +q.size || 20, page = +q.page || 0;
      return ok({ items: rows.slice(page * size, page * size + size), page, size, totalItems: rows.length });
    }],

    ['GET', /^\/firm\/summary$/, () => {
      if (!isRole('principal')) return forbid();
      const live = COMPLIANCE.filter(c => c.status !== 'done');
      return ok({ aum: aumBlock(HH.reduce((a, h) => a + h.aum, 0)), advisors: ADVISORS.length, households: HH.length,
        openComplianceItems: live.length, overdueComplianceItems: live.filter(c => c.status === 'overdue').length, dataAsOf: NOW() });
    }],
    ['GET', /^\/firm\/advisors$/, (m, q) => isRole('principal') ? ok(paged(ADVISORS.map(a => advisorRow(a.id)), q, 'aum,desc')) : forbid()],
    ['GET', /^\/firm\/advisors\/([^/]+)$/, (m) => !isRole('principal') ? forbid() : ADVISORS.some(a => a.id === m[1]) ? ok(advisorRow(m[1])) : notFound('Advisor')],
    ['GET', /^\/firm\/compliance$/, (m, q) => {
      if (!isRole('principal')) return forbid();
      let list = COMPLIANCE;
      if (q.status) list = list.filter(c => c.status === q.status);
      if (q.advisorId) list = list.filter(c => c.advisorId === q.advisorId);
      return ok(paged(list, q, 'dueDate,asc'));
    }],

    ['GET', /^\/me\/household$/, () => {
      if (!isRole('client')) return forbid();
      const h = hhById(user().householdId);
      return ok({ id: h.id, name: h.name, aum: h.aum, change30d: h.change30d, trend: trend(h.aum), advisorName: advName(h.advisorId), dataAsOf: NOW(),
        accounts: h.accounts.map(({ maskedNumber, type, balance, todayGainLoss, totalGainLoss }) => ({ maskedNumber, type, balance, todayGainLoss, totalGainLoss })) });
    }],
    ['GET', /^\/me\/documents$/, (m, q) => {
      if (!isRole('client')) return forbid();
      let list = DOCS.filter(d => d.householdId === user().householdId);
      if (q.docType) list = list.filter(d => d.docType === q.docType);
      if (q.from) list = list.filter(d => d.date >= q.from);
      if (q.to) list = list.filter(d => d.date <= q.to);
      return ok(paged(list.map(({ householdId, ...d }) => ({ ...d, maskedAccountNumber: d.docType === 'statement' ? hhById(householdId).accounts[0].maskedNumber : null })), q, 'date,desc'));
    }],
    ['GET', /^\/me\/documents\/([^/]+)$/, (m) => {
      if (!isRole('client')) return forbid();
      const d = DOCS.find(x => x.id === m[1] && x.householdId === user().householdId); if (!d) return notFound('Document');
      return ok({ mockDownload: true, filename: d.title + '.pdf' });
    }],
    ['GET', /^\/me\/fees$/, () => {
      if (!isRole('client')) return forbid();
      const a = hhById(user().householdId).accounts[0], amt = Math.round(a.balance * 0.0025);
      const q = (o) => ({ periodStart: dateOnly(o), periodEnd: dateOnly(o + 89) });
      return ok({ dataAsOf: NOW(), items: [
        { id: 'f1', maskedAccountNumber: a.maskedNumber, description: 'Advisory fee, prior quarter', amount: amt, ...q(-180), status: 'paid' },
        { id: 'f2', maskedAccountNumber: a.maskedNumber, description: 'Advisory fee, this quarter', amount: amt, ...q(-90), status: 'billed' },
        { id: 'f3', maskedAccountNumber: a.maskedNumber, description: 'Advisory fee, next quarter', amount: amt, ...q(0), status: 'scheduled' }] });
    }],
    ['GET', /^\/me\/shared$/, () => {
      if (!isRole('client')) return forbid();
      return ok({ items: SHARED.filter(s => s.householdId === user().householdId).map(({ householdId, ...s }) => s) });
    }],
    ['GET', /^\/me\/preferences$/, () => isRole('client') ? ok(PREFS[user().householdId]) : forbid()],
    ['PATCH', /^\/me\/preferences$/, (m, q, b) => {
      if (!isRole('client')) return forbid();
      const p = PREFS[user().householdId];
      if (b && 'paperless' in b) p.paperless = !!b.paperless;
      if (b && Array.isArray(b.notificationChannels)) p.notificationChannels = b.notificationChannels;
      return ok(p);
    }],
    ['POST', /^\/me\/meeting-requests$/, (m, q, b) => {
      if (!isRole('client')) return forbid();
      if (!b || !b.topic) return fail(400, 'bad_request', 'Topic is required.');
      const h = hhById(user().householdId);
      const r = { id: 'mr' + (++seq), status: 'requested', topic: b.topic, createdAt: NOW() };
      MEETING_REQUESTS.push(r);
      TASKS.push({ id: 't' + (++seq), advisorId: h.advisorId, title: 'Meeting request from ' + h.name + ': ' + b.topic, householdId: h.id, dueDate: dateOnly(1), origin: 'manual', originMeetingId: null, status: 'open', createdAt: NOW() });
      return created(r);
    }]
  ];

  function handle(method, path, query, body, personaKey) {
    // Every caller passes personaKey; the fallback to the last-used persona exists only for
    // setPersona(). Do not carry this pattern into the real backend: identity must come from
    // the request, never from instance state, or concurrent requests will see each other's user.
    if (personaKey) persona = personaKey;
    for (const [m, re, fn] of routes) {
      if (m !== method) continue;
      const match = path.match(re);
      if (match) return fn(match, query || {}, body);
    }
    return fail(404, 'not_found', 'No such operation: ' + method + ' ' + path);
  }
  return {
    handle,
    personas: () => Object.entries(PERSONAS).map(([token, u]) => ({ token, name: u.name, roles: u.roles, views: u.views })),
    setPersona: (p) => { persona = p; },
    get persona() { return persona; }
  };
}

module.exports = { createMock };
