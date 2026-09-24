/*
 * Mock core for the Advisor Platform API v0.3 (see ../openapi.yaml).
 * One consistent dataset behind every operation, with role checks.
 * createMock() returns a fresh, isolated instance, so resetting means creating a new one.
 * handle(method, path, query, body, personaKey) is synchronous and returns { status, data }.
 *
 * An ES module with no Node APIs, so the server and the dashboard's offline demo both
 * import this one file. There is no second copy to keep in step.
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
    ['m11', 'adv3', 'h19', 0, '09:00', 'Tax planning', 'ready', 45, 'Two harvesting candidates flagged.'],
    // A prospect meeting has no household yet: householdId stays null until they convert.
    ['m12', 'adv1', null, 0, '15:00', 'Prospect introduction', 'ready', 45, 'Business sale proceeds in cash since March. Lead with the tax consequences, not the portfolio.'],
    ['m13', 'adv1', 'h4', -9, '10:30', 'Quarterly check-in', 'ready', 45, 'Completed. Concentration discussed.'],
    ['m14', 'adv1', 'h10', -5, '14:30', 'Portfolio check-in', 'ready', 30, 'Completed.']
  ].map(([id, advisorId, householdId, off, hm, type, prepStatus, durationMinutes, brief]) => {
    const [h, m] = hm.split(':').map(Number);
    return { id, advisorId, householdId, startsAt: dayISO(off, h, m), type, prepStatus, durationMinutes, brief };
  });
  const hhName = (id) => (id ? hhById(id).name : null);

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

  /* ---- client engagement, growth and practice operations ---- */

  // id, advisor, household, status, subject, channel, hours old, compliance flag, body
  // Dana's three drafts are the three emails alert a2 counts: keep them in step.
  const COMMS = [
    ['cm1', 'adv1', 'h3', 'draft', 'Following up on your Roth conversion', 'email', 60, true,
      'Thank you for the time this morning. As discussed, converting a portion of the traditional IRA before year end would let us use the lower bracket you are in this year. I have attached an illustration of three conversion amounts.'],
    ['cm2', 'adv1', 'h1', 'draft', 'Reducing the technology position', 'email', 72, true,
      'Your largest holding has grown to 24% of the equity sleeve, above the 20% limit in your policy statement. I would like to trim it back over two quarters to manage the capital gain.'],
    ['cm3', 'adv1', 'h5', 'draft', 'Overdue for a conversation', 'email', 55, true,
      'It has been a while since we last spoke and I would like to confirm your goals and beneficiary details are still current.'],
    ['cm4', 'adv1', 'h2', 'approved', 'Your tax-loss harvesting summary', 'email', 20, false,
      'Here is a summary of the losses we realised this quarter and what they save you at your marginal rate.'],
    ['cm5', 'adv1', 'h8', 'sent', 'Thank you for your time', 'email', 50, false,
      'Good to see you both. I will send the gifting analysis we discussed by the end of next week.'],
    ['cm6', 'adv2', 'h13', 'draft', 'Margin call, action needed', 'email', 18, true,
      'Your account has an open margin call past its due date. Please call me today so we can resolve it.'],
    ['cm7', 'adv2', 'h15', 'draft', 'Documents needed for your account', 'email', 44, false,
      'Two documents are outstanding before we can lift the restriction on your account.'],
    ['cm8', 'adv3', 'h22', 'draft', 'Reconnecting', 'email', 30, false,
      'It has been two months since we last spoke. Would a call in the next fortnight suit you?']
  ].map(([id, advisorId, householdId, status, subject, channel, age, complianceReview, body]) => ({
    id, advisorId, householdId, status, subject, channel, body, complianceReview,
    tone: 'Warm and direct', source: 'platform', draftedBy: 'ai',
    createdAt: new Date(Date.now() - age * 36e5).toISOString(),
    approvedBy: status === 'draft' ? null : advName(advisorId),
    approvedAt: status === 'draft' ? null : new Date(Date.now() - (age - 6) * 36e5).toISOString(),
    sentAt: status === 'sent' ? new Date(Date.now() - (age - 8) * 36e5).toISOString() : null
  }));

  const PROSPECT_STAGES = ['lead', 'contacted', 'meeting_scheduled', 'proposal', 'onboarding', 'converted'];
  // id, advisor, name, stage, estimated assets, source, days old, notes
  const PROSPECTS = [
    ['p1', 'adv1', 'Marcus DeLuca', 'meeting_scheduled', 2400000, 'referral', 12,
      'Referred by the Lindqvists. Sold his engineering business in March; proceeds sitting in cash. Wants to understand the tax consequences before committing.'],
    ['p2', 'adv1', 'Yusuf Rahman', 'lead', 1100000, 'website', 4, 'Enquiry through the site. No call yet.'],
    ['p3', 'adv1', 'The Ashworth Family', 'contacted', 3600000, 'referral', 21, 'Introductory call done. Comparing us with two other firms.'],
    ['p4', 'adv1', 'Nadia Constantin', 'proposal', 5200000, 'event', 34, 'Proposal sent after the estate planning seminar. Waiting on her accountant.'],
    ['p5', 'adv1', 'Beatriz Okonjo', 'onboarding', 1800000, 'referral', 47, 'Agreement signed. Account opening under way.'],
    ['p6', 'adv2', 'Halloran Trust', 'proposal', 4400000, 'referral', 26, 'Trustees reviewing the proposal at their next quarterly meeting.'],
    ['p7', 'adv2', 'Devon Pryce', 'lead', 900000, 'website', 6, 'Downloaded the retirement guide.']
  ].map(([id, advisorId, name, stage, estimatedAssets, source, days, intakeNotes]) => ({
    id, advisorId, name, stage, estimatedAssets, source, intakeNotes,
    createdAt: dayISO(-days, 9), updatedAt: dayISO(-Math.floor(days / 3), 9), meetingId: id === 'p1' ? 'm12' : null
  }));
  const prospectName = (meetingId) => PROSPECTS.find(p => p.meetingId === meetingId)?.name ?? null;

  const ONB_STEPS = [
    ['intake_form', 'Intake form'], ['risk_profile', 'Risk profile'], ['custodian_application', 'Custodian application'],
    ['agreements', 'Advisory agreement'], ['funding', 'Funding'], ['compliance_review', 'Compliance review']
  ];
  // id, advisor, name, days since start, steps completed, per-step detail
  const ONBOARDING = [
    ['ob1', 'adv1', 'Renee and Iris Castellano', 18, 4, {
      intake_form: 'Both forms complete. Joint goals: retire at 62, fund one grandchild college account.',
      risk_profile: 'Score 54 of 100, balanced growth. Completed by both parties separately, scores within 6 points.',
      custodian_application: 'Submitted to Green Meadows. Application in good order.',
      agreements: 'Advisory agreement and fee schedule signed electronically by both parties.',
      funding: 'Awaiting ACAT transfer from the prior custodian. Nothing received yet.',
      compliance_review: null }],
    ['ob2', 'adv1', 'The Ferraro Family', 6, 2, {
      intake_form: 'Complete for both spouses. Trust documents still outstanding.',
      risk_profile: 'Score 38 of 100, conservative. One party scored materially lower; reconciled in the review call.',
      custodian_application: 'Drafted, not yet submitted. Waiting on the trust deed.',
      agreements: null, funding: null, compliance_review: null }]
  ].map(([id, advisorId, name, days, done, detail]) => ({
    id, advisorId, name, startedAt: dayISO(-days, 9), convertedAt: null,
    steps: ONB_STEPS.map(([sid, label], i) => ({
      id: sid, label, status: i < done ? 'done' : detail[sid] ? 'open' : 'not_started',
      detail: detail[sid] || null, completedAt: i < done ? dayISO(-days + i * 2, 11) : null }))
  }));

  const MIGRATIONS = [];
  const QUERIES = [];

  /* ---- the query surface (IP-01 to IP-08, IP-11) --------------------------------------
   * Only two sources exist: custodial data and the calendar. Everything else has no
   * connection, so the mock answers what it genuinely can from this dataset and reports the
   * rest in `unanswerable`. It is a matcher, not a model, and it says so: a mock that
   * improvised answers would teach the UI the wrong lesson about what to trust.
   */
  const NO_SOURCE = [
    [/\b(email|inbox|mailbox|wrote to|sent me)\b/i, 'email', 'No inbox is connected.'],
    [/\b(crm|salesforce|wealthbox|redtail)\b/i, 'crm', 'No CRM is connected.'],
    [/\b(market|news|index|s&p|nasdaq|rate cut|regulat\w*|sec rule)\b/i, 'market', 'No external market or regulatory source is connected.'],
    [/\b(fidelity internal|deep research|white paper)\b/i, 'research', 'Fidelity internal research is not connected.'],
    [/\b(sentiment|how does .* feel|mood)\b/i, 'sentiment', 'The Client Sentiment Index is not built.']
  ];

  const cite = (source, id, label) => ({ source, id, label, dataAsOf: NOW() });
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

  /* Each matcher answers from the dataset or returns null. Order matters: first hit wins. */
  const ANSWERERS = [
    { id: 'idle_cash', test: /\b(idle cash|cash|uninvested)\b/i, run: (hs) => {
      const rows = SIGNAL_ROWS.filter(x => x.kind === 'idle_cash' && hs.some(h => h.id === x.householdId));
      if (!rows.length) return null;
      const total = rows.reduce((a, r) => a + r.value, 0);
      return { answer: `${plural(rows.length, 'household is', 'households are')} holding cash above target, about $${(total / 1e6).toFixed(1)}M in total. The largest is ${hhName(rows.slice().sort((a, b) => b.value - a.value)[0].householdId)}.`,
        citations: rows.map(r => cite('greenmeadows', r.householdId, hhName(r.householdId) + ' cash balance')) };
    } },
    { id: 'overdue_contact', test: /\b(not (spoken|talked|heard)|overdue|last contact|haven'?t (spoken|called)|out of touch)\b/i, run: (hs) => {
      const stale = hs.filter(h => h.lastContactAt && (Date.now() - new Date(h.lastContactAt)) / 864e5 > 45)
        .sort((a, b) => a.lastContactAt.localeCompare(b.lastContactAt));
      if (!stale.length) return { answer: 'Every household has been contacted within the last 45 days.', citations: [] };
      return { answer: `${plural(stale.length, 'household has', 'households have')} had no contact for more than 45 days: ` +
        stale.map(h => `${h.name} (${Math.floor((Date.now() - new Date(h.lastContactAt)) / 864e5)} days)`).join(', ') + '.',
        citations: stale.map(h => cite('crm', h.id, h.name + ' last contact')) };
    } },
    { id: 'harvesting', test: /\b(harvest\w*|tax loss|losses to realis|realize losses)\b/i, run: (hs, u) => {
      const rows = SIGNAL_ROWS.filter(x => x.kind === 'tax_loss_harvesting' && hs.some(h => h.id === x.householdId));
      if (!rows.length) return null;
      const total = rows.reduce((a, r) => a + r.value, 0);
      return { answer: `About $${total.toLocaleString('en-US')} of unrealised losses across ${rows.length} households. Largest: ${hhName(rows.slice().sort((a, b) => b.value - a.value)[0].householdId)}.`,
        citations: rows.map(r => cite('greenmeadows', r.householdId, hhName(r.householdId) + ' open tax lots')) };
    } },
    { id: 'drift', test: /\b(drift|allocation|off target|rebalanc\w*)\b/i, run: (hs) => {
      const rows = SIGNAL_ROWS.filter(x => x.kind === 'allocation_drift' && hs.some(h => h.id === x.householdId));
      if (!rows.length) return null;
      const worst = rows.slice().sort((a, b) => b.value - a.value)[0];
      return { answer: `${plural(rows.length, 'household is', 'households are')} outside their target allocation. The largest drift is ${hhName(worst.householdId)} at ${worst.value} points.`,
        citations: rows.map(r => cite('greenmeadows', r.householdId, hhName(r.householdId) + ' positions against model')) };
    } },
    { id: 'meetings', test: /\b(meeting|calendar|schedule|who am i seeing|diary)\b/i, run: (hs, u, ctx) => {
      const mine = meetingsFor(ctx.advisorId).filter(m => new Date(m.startsAt) >= new Date(dayISO(0)));
      if (!mine.length) return { answer: 'Nothing is scheduled from today onwards.', citations: [] };
      const today = mine.filter(m => m.startsAt.slice(0, 10) === dateOnly(0));
      return { answer: `${plural(today.length, 'meeting', 'meetings')} today and ${mine.length} from today onwards. Today: ` +
        (today.map(m => `${hhName(m.householdId) || prospectName(m.id) || 'no client attached'} at ${m.startsAt.slice(11, 16)}`).join(', ') || 'none') + '.',
        citations: mine.slice(0, 6).map(m => cite('calendar', m.id, m.type)) };
    } },
    { id: 'fees', test: /\b(fee|billing|charge|revenue)\b/i, run: (hs) => {
      const billable = hs.filter(h => h.aum > 0);
      const total = billable.reduce((a, h) => a + quarterlyFee(h.aum, h.id), 0);
      return { answer: `This quarter bills about $${total.toLocaleString('en-US')} across ${billable.length} households, off the published tier schedule.`,
        citations: [cite('platform', 'fee-schedule', 'Firm fee schedule')] };
    } },
    { id: 'book', test: /\b(book|assets under management|aum|how (much|many)|total)\b/i, run: (hs) => ({
      answer: `${plural(hs.length, 'household', 'households')}, $${(hs.reduce((a, h) => a + h.aum, 0) / 1e6).toFixed(1)}M in assets.`,
      citations: [cite('greenmeadows', 'balances', 'Account balances')]
    }) }
  ];

  function runQuery(question, scope, householdId) {
    const u = user();
    const hs = scope === 'firm' ? HH : (householdId ? HH.filter(h => h.id === householdId) : myHH());
    const unanswerable = NO_SOURCE.filter(([re]) => re.test(question))
      .map(([, source, reason]) => ({ source, reason }));

    let hit = null;
    for (const a of ANSWERERS) {
      if (!a.test.test(question)) continue;
      const got = a.run(hs, u, { advisorId: u.advisorId });
      if (got) { hit = { ...got, matched: a.id }; break; }
    }

    if (!hit) {
      return { answer: unanswerable.length
          ? 'Nothing in the connected sources answers this.'
          : "This mock answers questions about cash, contact gaps, harvesting, drift, meetings, fees and the book. It matches phrasing rather than understanding it, so a real question may need rewording.",
        citations: [], unanswerable, matched: null };
    }
    return { ...hit, unanswerable };
  }


  // household, model, target and current allocation. Max drift equals that household's drift signal.
  const MODEL_LIBRARY = {
    mdl_growth:       { name: 'Growth, 70/30', riskLevel: 'Aggressive', target: [45, 20, 25, 5, 5] },
    mdl_balanced:     { name: 'Balanced, 60/40', riskLevel: 'Moderate', target: [40, 20, 30, 5, 5] },
    mdl_conservative: { name: 'Conservative, 40/60', riskLevel: 'Conservative', target: [25, 15, 50, 7, 3] },
    mdl_income:       { name: 'Income', riskLevel: 'Conservative', target: [20, 10, 60, 8, 2] }
  };
  const ALLOC_CLASSES = ['US equity', 'International equity', 'Fixed income', 'Cash', 'Alternatives'];
  const ALLOCATIONS = {
    h1: { modelId: 'mdl_growth', modelName: 'Growth, 70/30', target: [45, 20, 25, 5, 5], current: [52.2, 18, 21, 4.8, 4] },
    h2: { modelId: 'mdl_balanced', modelName: 'Balanced, 60/40', target: [40, 20, 30, 5, 5], current: [45.4, 18.6, 28, 4, 4] },
    h3: { modelId: 'mdl_growth', modelName: 'Growth, 70/30', target: [50, 15, 25, 7, 3], current: [56.1, 13.9, 22, 5, 3] }
  };

  // meeting, kind, author, consent, content
  const RECORDS = [
    ['m5', 'notes', 'Dana Whitfield', null,
      'Annual review. Portfolio up 11% over twelve months. Asked about gifting to the grandchildren before the exemption changes; wants numbers on $50k versus $100k. Mentioned the son is buying a first home next spring and may ask for help.'],
    ['m6', 'transcript', 'Zocks (meeting capture)', { obtained: true, obtainedAt: dayISO(-1, 13, 58), method: 'verbal, recorded' },
      'Dana: Before we start, are you happy for me to record this for my notes?\nClient: Yes, that is fine.\nDana: Thank you. So the cash position is the main thing I wanted to raise...\nClient: We have been sitting on it since the house sale fell through.\nDana: That is about 700,000 earning next to nothing. I would like to put most of it to work over three tranches.'],
    ['m13', 'notes', 'Dana Whitfield', null,
      'Quarterly check-in. Discussed the concentration in the technology holding. Client reluctant to sell because of the gain; agreed to revisit with a multi-year trim plan.'],
    ['m14', 'transcript', 'Zocks (meeting capture)', { obtained: false, obtainedAt: null, method: null },
      'Capture started before consent was confirmed. Transcript withheld pending client consent.']
  ].map(([meetingId, kind, author, consent, content]) => ({ meetingId, kind, author, consent, content, source: 'platform' }));

  /* The schedule is the firm's, so only a principal changes it. A per-household override is
     the advisor's call for their own client, and both are recorded: a fee change alters what a
     client is billed, so who changed it and when is part of the record (AX-11, X-05). */
  let FEE_TIERS = [
    { minAssets: 0, maxAssets: 2000000, annualRatePct: 1 },
    { minAssets: 2000000, maxAssets: 5000000, annualRatePct: 0.85 },
    { minAssets: 5000000, maxAssets: 10000000, annualRatePct: 0.7 },
    { minAssets: 10000000, maxAssets: null, annualRatePct: 0.55 }
  ];
  let FEE_PLAN_META = { updatedAt: dayISO(-120, 10), updatedBy: 'Dana Whitfield' };
  const FEE_OVERRIDES = {};   // householdId -> { annualRatePct, reason, setBy, setAt }
  const scheduleRate = (assets) => FEE_TIERS.find(t => assets >= t.minAssets && (t.maxAssets === null || assets < t.maxAssets)).annualRatePct;
  const feeRate = (assets, householdId) => (householdId && FEE_OVERRIDES[householdId])
    ? FEE_OVERRIDES[householdId].annualRatePct : scheduleRate(assets);
  const quarterlyFee = (assets, householdId) => Math.round(assets * (feeRate(assets, householdId) / 100) / 4);

  const SUBSCRIPTION = {
    plan: 'Advisor Desk, firm plan', seats: { purchased: 6, used: ADVISORS.length },
    renewalDate: dateOnly(64), billingContact: 'Dana Whitfield',
    meters: [
      { id: 'ai_drafts', label: 'AI drafts generated', used: 1840, included: 3000, unit: 'drafts' },
      { id: 'transcription', label: 'Meeting transcription', used: 41, included: 60, unit: 'hours' },
      { id: 'documents', label: 'Documents processed', used: 312, included: 500, unit: 'documents' }
    ],
    // Masked, as everywhere else. A real backend must never hold the full number.
    paymentMethod: { brand: 'Visa', maskedNumber: '****4242', expiryMonth: 11, expiryYear: 2028 }
  };
  // id, period offset (months back), amount, status
  const INVOICES = [[-0, 4380, 'due'], [-1, 4380, 'paid'], [-2, 4380, 'paid'], [-3, 3920, 'paid']]
    .map(([back, amount, status], i) => {
      const d = new Date(T0.getFullYear(), T0.getMonth() + back, 1);
      const month = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      return { id: 'inv' + (i + 1), number: 'MW-' + month.replace('-', ''), periodMonth: month, amount, status,
        issuedDate: month + '-01', dueDate: month + '-28',
        lines: [
          { description: 'Seats, ' + SUBSCRIPTION.seats.used + ' advisors', quantity: SUBSCRIPTION.seats.used, unitAmount: 890, amount: SUBSCRIPTION.seats.used * 890 },
          { description: 'Meeting transcription over plan', quantity: i === 3 ? 0 : 2, unitAmount: 110, amount: i === 3 ? 0 : 220 },
          { description: 'Document processing over plan', quantity: i === 3 ? 4 : 6, unitAmount: 100, amount: i === 3 ? 400 : 600 }
        ] };
    });

  const BRANDING = { firmName: FIRM.name, advisorDisplayName: 'Dana Whitfield, CFP', markLetter: 'W',
    accentColor: '#0E5A57', updatedAt: dayISO(-40, 14), updatedBy: 'Dana Whitfield' };

  /* ---- firm ownership (PO-12) -------------------------------------------------------
   * The firm's own cap table, not a client's. Principal only: who owns the practice and on
   * what terms is the most sensitive non-client data the platform holds.
   */
  const SHARE_CLASSES = [
    { id: 'common', name: 'Common', votesPerShare: 1 },
    { id: 'pref_a', name: 'Preferred A', votesPerShare: 1, liquidationPreference: 1 }
  ];
  const CAP_TABLE = [
    ['Dana Whitfield', 'Founder and principal', 'common', 5200000, 0, null],
    ['Marcus Bell', 'Advisor', 'common', 900000, 225000, 18],
    ['Elena Park', 'Advisor', 'common', 700000, 350000, 9],
    ['Tom Reyes', 'Advisor', 'common', 400000, 300000, 4],
    ['Harbour Lane Capital', 'Outside investor', 'pref_a', 1800000, 0, null],
    ['Employee option pool', 'Reserved', 'common', 1000000, 1000000, null]
  ].map(([holder, role, shareClass, shares, unvested, vestingMonthsLeft], i) => ({
    id: 'cap' + (i + 1), holder, role, shareClass, shares, unvested, vested: shares - unvested,
    vestingEndsOn: vestingMonthsLeft ? dateOnly(vestingMonthsLeft * 30) : null
  }));

  /* ---- team share (PO-04) -----------------------------------------------------------
   * Widens who may see a household, so it is recorded and revocable, never implicit.
   */
  const TEAM_SHARES = [];

  /* ---- playbooks (AX-09) ------------------------------------------------------------ */
  const PLAYBOOKS = [
    ['pb1', 'Annual review preparation', 'Everything that should happen in the fortnight before an annual review.', [
      ['Pull the latest statements and performance', -10],
      ['Check allocation against the model', -8],
      ['Review open tax-loss positions', -7],
      ['Draft the agenda and send it to the client', -3],
      ['Confirm attendees and location', -2]
    ]],
    ['pb2', 'New client first 30 days', 'The onboarding steps that are not the custodian\'s.', [
      ['Welcome call', 1], ['Collect outstanding documents', 5],
      ['Confirm beneficiaries', 10], ['Walk them through the portal', 14],
      ['First check-in', 30]
    ]],
    ['pb3', 'Reconnecting after a gap', 'For a household that has gone quiet.', [
      ['Review what changed since last contact', 0],
      ['Draft a personal note, not a newsletter', 1],
      ['Offer two specific times', 2],
      ['Log the outcome', 7]
    ]]
  ].map(([id, name, description, steps]) => ({ id, name, description,
    steps: steps.map(([title, offset], i) => ({ id: `${id}-s${i}`, title, dayOffset: offset })) }));

  /* ---- reporting, scorecards and next best action (PO-07, AX-08, PL-02) ----------------
   * All three read data the platform already holds. Nothing here needs a new source, which
   * is why they were built before the ones that do.
   */
  const inPeriod = (iso, from, to) => iso && iso.slice(0, 10) >= from && iso.slice(0, 10) <= to;
  const shiftDays = (d, n) => { const x = new Date(d + 'T00:00:00'); x.setDate(x.getDate() + n); return dateOnly(Math.round((x - T0) / 864e5)); };

  /* One period's numbers for a set of advisors. Only counts things the dataset can evidence. */
  function practiceMetrics(advisorIds, from, to) {
    const hs = HH.filter(h => advisorIds.includes(h.advisorId));
    const ms = MEETINGS.filter(m => advisorIds.includes(m.advisorId) && inPeriod(m.startsAt, from, to));
    const ts = TASKS.filter(t => advisorIds.includes(t.advisorId));
    const cs = COMMS.filter(c => advisorIds.includes(c.advisorId));
    const comp = COMPLIANCE.filter(c => advisorIds.includes(c.advisorId));
    return {
      households: hs.length,
      aum: hs.reduce((a, h) => a + h.aum, 0),
      meetingsHeld: ms.filter(m => new Date(m.startsAt) <= new Date()).length,
      meetingsScheduled: ms.length,
      tasksCompleted: ts.filter(t => t.status === 'done').length,
      tasksOverdue: ts.filter(t => t.status === 'open' && t.dueDate < dateOnly(0)).length,
      messagesSent: cs.filter(c => c.sentAt && inPeriod(c.sentAt, from, to)).length,
      messagesAwaitingApproval: cs.filter(c => c.status === 'draft').length,
      complianceOverdue: comp.filter(c => c.status === 'overdue').length,
      contactGaps: hs.filter(h => h.lastContactAt && (Date.now() - new Date(h.lastContactAt)) / 864e5 > 45).length
    };
  }

  const METRIC_LABELS = {
    households: ['Households', 'count'], aum: ['Assets under management', 'usd'],
    meetingsHeld: ['Meetings held', 'count'], meetingsScheduled: ['Meetings scheduled', 'count'],
    tasksCompleted: ['Follow-ups completed', 'count'], tasksOverdue: ['Follow-ups overdue', 'count'],
    messagesSent: ['Messages sent', 'count'], messagesAwaitingApproval: ['Messages awaiting approval', 'count'],
    complianceOverdue: ['Compliance items overdue', 'count'], contactGaps: ['Households not contacted in 45 days', 'count']
  };
  /* Lower is better for these, so the UI must not colour a rise green. */
  const LOWER_IS_BETTER = new Set(['tasksOverdue', 'messagesAwaitingApproval', 'complianceOverdue', 'contactGaps']);

  function practiceReport(advisorIds, from, to) {
    const days = Math.max(1, Math.round((new Date(to) - new Date(from)) / 864e5));
    const prevFrom = shiftDays(from, -days - 1), prevTo = shiftDays(from, -1);
    const now = practiceMetrics(advisorIds, from, to), was = practiceMetrics(advisorIds, prevFrom, prevTo);
    return {
      from, to, previousFrom: prevFrom, previousTo: prevTo, dataAsOf: NOW(),
      metrics: Object.keys(METRIC_LABELS).map(id => ({
        id, label: METRIC_LABELS[id][0], unit: METRIC_LABELS[id][1],
        value: now[id], previousValue: was[id], change: now[id] - was[id],
        lowerIsBetter: LOWER_IS_BETTER.has(id)
      })),
      breakdowns: {
        meetingsByType: Object.entries(MEETINGS.filter(m => advisorIds.includes(m.advisorId) && inPeriod(m.startsAt, from, to))
          .reduce((a, m) => ({ ...a, [m.type]: (a[m.type] || 0) + 1 }), {})).map(([label, count]) => ({ label, count })),
        communicationsByStatus: ['draft', 'approved', 'sent'].map(st => ({ label: st,
          count: COMMS.filter(c => advisorIds.includes(c.advisorId) && c.status === st).length })),
        complianceByStatus: ['open', 'overdue', 'done'].map(st => ({ label: st,
          count: COMPLIANCE.filter(c => advisorIds.includes(c.advisorId) && c.status === st).length }))
      }
    };
  }

  const median = (ns) => { const a = [...ns].sort((x, y) => x - y); const m = a.length >> 1;
    return a.length % 2 ? a[m] : Math.round((a[m - 1] + a[m]) / 2); };

  /* A scorecard compares an advisor with the firm. Advisors see their own against the firm
     median; only a principal sees a rank, because naming where someone sits against named
     peers is a management decision rather than a reporting one. See HANDOFF section 9. */
  function scorecard(advisorId, from, to, withRank) {
    const all = ADVISORS.map(a => ({ id: a.id, m: practiceMetrics([a.id], from, to) }));
    const mine = all.find(a => a.id === advisorId).m;
    const ids = ['households', 'aum', 'meetingsHeld', 'tasksCompleted', 'tasksOverdue', 'messagesSent', 'contactGaps', 'complianceOverdue'];
    return {
      advisorId, advisorName: advName(advisorId), from, to, dataAsOf: NOW(),
      metrics: ids.map(id => {
        const values = all.map(a => a.m[id]);
        const lower = LOWER_IS_BETTER.has(id);
        const sorted = [...all].sort((a, b) => lower ? a.m[id] - b.m[id] : b.m[id] - a.m[id]);
        return { id, label: METRIC_LABELS[id][0], unit: METRIC_LABELS[id][1],
          value: mine[id], firmMedian: median(values), lowerIsBetter: lower,
          ...(withRank ? { rank: sorted.findIndex(a => a.id === advisorId) + 1, outOf: all.length } : {}) };
      })
    };
  }

  /* Next best action: one prioritised list across the book, drawn from what is already known.
     Every item is a DRAFT. suggestedTask is what an advisor would post to /tasks (X-03). */
  function nextActions(advisorIds) {
    const out = [];
    const push = (priority, kind, title, reason, householdId, citations, due) => out.push({
      id: 'na_' + kind + '_' + (householdId || 'practice'), priority, kind, title, reason,
      householdId: householdId || null, householdName: hhName(householdId),
      citations, suggestedTask: { title, dueDate: dateOnly(due), householdId: householdId || null }
    });

    for (const a of ALERTS.filter(x => advisorIds.includes(x.advisorId) && x.status === 'open' && x.severity === 'high')) {
      push('high', 'alert', a.title, 'Flagged as high severity ' + daysSince(a.createdAt) + ' days ago.', a.householdId,
        [{ source: a.source, id: a.id, label: a.title, dataAsOf: NOW() }], 1);
    }
    for (const h of HH.filter(x => advisorIds.includes(x.advisorId) && x.lastContactAt && (Date.now() - new Date(x.lastContactAt)) / 864e5 > 45)) {
      push('high', 'contact', 'Reconnect with ' + h.name,
        'No contact in ' + Math.floor((Date.now() - new Date(h.lastContactAt)) / 864e5) + ' days.', h.id,
        [{ source: 'crm', id: h.id, label: h.name + ' last contact', dataAsOf: NOW() }], 3);
    }
    for (const c of COMMS.filter(x => advisorIds.includes(x.advisorId) && x.status === 'draft' && x.complianceReview)) {
      push('medium', 'approval', 'Review the draft to ' + (hhName(c.householdId) || 'the practice'),
        'Waiting for compliance review since ' + daysSince(c.createdAt) + ' days ago.', c.householdId,
        [{ source: 'platform', id: c.id, label: c.subject, dataAsOf: NOW() }], 1);
    }
    for (const r of SIGNAL_ROWS.filter(x => advisorIds.includes(x.advisorId) && x.kind === 'tax_loss_harvesting' && x.value >= 10000)) {
      push('medium', 'tax', 'Review harvesting for ' + hhName(r.householdId),
        'About $' + r.value.toLocaleString('en-US') + ' of unrealised losses.', r.householdId,
        [{ source: 'greenmeadows', id: r.householdId, label: 'Open tax lots', dataAsOf: NOW() }], 7);
    }
    for (const m of MEETINGS.filter(x => advisorIds.includes(x.advisorId) && x.prepStatus === 'needs_prep'
        && new Date(x.startsAt) >= new Date(dayISO(0)))) {
      push('medium', 'prep', 'Prepare for ' + (hhName(m.householdId) || prospectName(m.id) || m.type),
        m.type + ' on ' + m.startsAt.slice(0, 10) + ' has no prep.', m.householdId,
        [{ source: 'calendar', id: m.id, label: m.type, dataAsOf: NOW() }], 1);
    }
    for (const o of ONBOARDING.filter(x => advisorIds.includes(x.advisorId) && !x.convertedAt)) {
      const open = o.steps.filter(st => st.status !== 'done');
      if (open.length) push('low', 'onboarding', 'Move ' + o.name + ' forward',
        open.length + ' of ' + o.steps.length + ' steps outstanding: ' + open.map(st => st.label).join(', ') + '.', null,
        [{ source: 'platform', id: o.id, label: o.name, dataAsOf: NOW() }], 5);
    }
    const order = { high: 0, medium: 1, low: 2 };
    return out.sort((a, b) => order[a.priority] - order[b.priority]);
  }
  const daysSince = (iso) => Math.floor((Date.now() - new Date(iso)) / 864e5);

  /* ---- helpers ---- */
  /* The CRM is the system of record; this platform is a working surface (docs/system-of-record.md).
     No CRM is connected, so every syncable record says so rather than implying it reached one. */
  const CRM = { connected: false, system: null };
  const syncState = (externalId = null) => CRM.connected
    ? { status: externalId ? 'synced' : 'pending', system: CRM.system, externalId, lastSyncedAt: externalId ? NOW() : null, error: null }
    : { status: 'not_configured', system: null, externalId: null, lastSyncedAt: null, error: null };

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
  const publicTask = ({ advisorId, ...t }) => ({ ...withName(t), sync: syncState() });

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

  // List shapes leave the heavy field out; the by-id operation adds it back.
  const commRow = ({ advisorId, body, ...c }) => ({ ...c, householdName: hhName(c.householdId), advisorName: advName(advisorId), sync: syncState() });
  const prospectRow = ({ advisorId, intakeNotes, ...p }) => ({ ...p, sync: syncState() });
  const onbRow = ({ advisorId, ...o }) => ({ ...o,
    stepsComplete: o.steps.filter(s => s.status === 'done').length, stepsTotal: o.steps.length,
    readyToConvert: o.steps.every(s => s.status === 'done') && !o.convertedAt });

  // Illustrative AI output. Drafts only: an advisor turns these into tasks, nothing does it for them.
  const NEXT_STEPS = {
    m5: [
      { title: 'Model gifting at $50k and $100k before the exemption changes', dueDate: dateOnly(5), householdId: 'h8' },
      { title: 'Note the son\'s spring house purchase in the file', dueDate: dateOnly(2), householdId: 'h8' }
    ],
    m6: [
      { title: 'Draft a three-tranche plan for the idle cash', dueDate: dateOnly(3), householdId: 'h9' },
      { title: 'Confirm the house sale is not proceeding', dueDate: dateOnly(1), householdId: 'h9' }
    ],
    m13: [
      { title: 'Build a multi-year trim plan for the technology holding', dueDate: dateOnly(6), householdId: 'h4' }
    ]
  };

  /* ---- routes ---- */
  const routes = [
    ['GET', /^\/session$/, () => { const u = user(); return ok({ id: u.id, name: u.name, role: u.role, roles: u.roles, views: u.views, advisorId: u.advisorId || null, firm: FIRM }); }],

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
        .map(({ advisorId, brief, ...x }) => ({ ...x, householdName: hhName(x.householdId), prospectName: prospectName(x.id), brief: null }));
      return ok({ items: list });
    }],
    ['GET', /^\/meetings\/([^/]+)$/, (m) => {
      if (!isRole('advisor')) return forbid();
      const x = MEETINGS.find(y => y.id === m[1] && y.advisorId === user().advisorId); if (!x) return notFound('Meeting');
      const { advisorId, ...out } = x;
      return ok({ ...out, householdName: hhName(x.householdId), prospectName: prospectName(x.id), briefSources: ['greenmeadows', 'crm', 'calendar'] });
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

    /* ---- communications (COMM-01 to COMM-03). Drafts are AI output; an advisor must approve
       before anything leaves the firm (X-03), and approval is recorded. ---- */
    ['GET', /^\/communications$/, (m, q) => {
      let list;
      if (q.scope === 'firm') { if (!isRole('principal')) return forbid(); list = COMMS; }
      else { if (!isRole('advisor')) return forbid(); list = COMMS.filter(c => c.advisorId === user().advisorId); }
      if (q.status) list = list.filter(c => c.status === q.status);
      if (q.complianceReview === 'true') list = list.filter(c => c.complianceReview);
      return ok(paged(list.map(commRow), q, 'createdAt,desc'));
    }],
    ['GET', /^\/communications\/([^/]+)$/, (m) => {
      if (!isRole('advisor') && !isRole('principal')) return forbid();
      const c = COMMS.find(x => x.id === m[1]); if (!c) return notFound('Message');
      if (!isRole('principal') && c.advisorId !== user().advisorId) return notFound('Message');
      return ok({ ...commRow(c), body: c.body });
    }],
    ['PATCH', /^\/communications\/([^/]+)$/, (m, q, b) => {
      if (!isRole('advisor')) return forbid();
      const c = COMMS.find(x => x.id === m[1] && x.advisorId === user().advisorId); if (!c) return notFound('Message');
      if (!b || !['approved', 'sent', 'draft'].includes(b.status)) return fail(400, 'bad_request', 'Status must be draft, approved or sent.');
      if (b.status === 'sent' && c.status === 'draft') return fail(409, 'conflict', 'A draft must be approved before it is sent.');
      c.status = b.status;
      if (b.status === 'draft') { c.approvedBy = null; c.approvedAt = null; c.sentAt = null; }
      else { c.approvedBy = user().name; c.approvedAt = c.approvedAt || NOW(); if (b.status === 'sent') c.sentAt = NOW(); }
      return ok({ ...commRow(c), body: c.body });
    }],

    /* ---- prospects (GP-01, GP-02) ---- */
    ['GET', /^\/prospects$/, (m, q) => {
      if (!isRole('advisor')) return forbid();
      let list = PROSPECTS.filter(p => p.advisorId === user().advisorId);
      if (q.stage) list = list.filter(p => p.stage === q.stage);
      return ok({ stages: PROSPECT_STAGES, ...paged(list.map(prospectRow), q, 'updatedAt,desc') });
    }],
    ['GET', /^\/prospects\/([^/]+)$/, (m) => {
      if (!isRole('advisor')) return forbid();
      const p = PROSPECTS.find(x => x.id === m[1] && x.advisorId === user().advisorId); if (!p) return notFound('Prospect');
      return ok({ ...prospectRow(p), intakeNotes: p.intakeNotes });
    }],
    ['PATCH', /^\/prospects\/([^/]+)$/, (m, q, b) => {
      if (!isRole('advisor')) return forbid();
      const p = PROSPECTS.find(x => x.id === m[1] && x.advisorId === user().advisorId); if (!p) return notFound('Prospect');
      if (!b || !PROSPECT_STAGES.includes(b.stage)) return fail(400, 'bad_request', 'Stage must be one of: ' + PROSPECT_STAGES.join(', ') + '.');
      p.stage = b.stage; p.updatedAt = NOW();
      return ok({ ...prospectRow(p), intakeNotes: p.intakeNotes });
    }],

    /* ---- onboarding (AX-01 to AX-04) ---- */
    ['GET', /^\/onboarding$/, () => {
      if (!isRole('advisor')) return forbid();
      return ok({ items: ONBOARDING.filter(o => o.advisorId === user().advisorId).map(onbRow) });
    }],
    ['GET', /^\/onboarding\/([^/]+)$/, (m) => {
      if (!isRole('advisor')) return forbid();
      const o = ONBOARDING.find(x => x.id === m[1] && x.advisorId === user().advisorId); if (!o) return notFound('Onboarding client');
      return ok(onbRow(o));
    }],
    ['PATCH', /^\/onboarding\/([^/]+)\/steps\/([^/]+)$/, (m, q, b) => {
      if (!isRole('advisor')) return forbid();
      const o = ONBOARDING.find(x => x.id === m[1] && x.advisorId === user().advisorId); if (!o) return notFound('Onboarding client');
      const s = o.steps.find(x => x.id === m[2]); if (!s) return notFound('Step');
      if (!b || !['done', 'open', 'not_started'].includes(b.status)) return fail(400, 'bad_request', 'Status must be done, open or not_started.');
      s.status = b.status; s.completedAt = b.status === 'done' ? NOW() : null;
      return ok(onbRow(o));
    }],
    ['POST', /^\/onboarding\/([^/]+)\/convert$/, (m) => {
      if (!isRole('advisor')) return forbid();
      const o = ONBOARDING.find(x => x.id === m[1] && x.advisorId === user().advisorId); if (!o) return notFound('Onboarding client');
      if (o.convertedAt) return fail(409, 'conflict', 'This client has already been converted.');
      const outstanding = o.steps.filter(s => s.status !== 'done');
      if (outstanding.length) return fail(409, 'conflict', 'These steps are not complete: ' + outstanding.map(s => s.label).join(', ') + '.');
      o.convertedAt = NOW();
      const h = { id: 'h' + (++seq), name: o.name, advisorId: o.advisorId, aum: 0, change30d: 0, status: 'onboarding',
        accounts: [], lastContactAt: NOW() };
      HH.push(h);
      return created({ onboardingId: o.id, householdId: h.id, name: h.name, convertedAt: o.convertedAt });
    }],

    /* ---- book migration. Not in the 75 requirements: an implementation concern that has to
       exist before a firm can move its book onto the platform. Real imports are asynchronous. ---- */
    ['GET', /^\/migrations$/, () => {
      if (!isRole('advisor')) return forbid();
      return ok({ items: MIGRATIONS.filter(x => x.advisorId === user().advisorId) });
    }],
    ['POST', /^\/migrations$/, (m, q, b) => {
      if (!isRole('advisor')) return forbid();
      if (!b || !b.source || !Array.isArray(b.rows)) return fail(400, 'bad_request', 'Source and rows are required.');
      if (!b.rows.length) return fail(400, 'bad_request', 'At least one row is required.');
      const valid = [], invalid = [];
      b.rows.forEach((r, i) => {
        const problems = [];
        if (!r || !r.name) problems.push('name is missing');
        if (r && r.aum != null && !(typeof r.aum === 'number' && r.aum >= 0)) problems.push('aum is not a positive number');
        (problems.length ? invalid : valid).push(problems.length ? { row: i, problems } : r);
      });
      const created_ = valid.map(r => {
        const h = { id: 'h' + (++seq), name: r.name, advisorId: user().advisorId, aum: Math.round(r.aum || 0), change30d: 0,
          status: 'needs_review', accounts: [], lastContactAt: null };
        HH.push(h); return h.id;
      });
      const mig = { id: 'mig' + (++seq), advisorId: user().advisorId, source: b.source, status: 'imported',
        counts: { read: b.rows.length, valid: valid.length, invalid: invalid.length, imported: created_.length },
        invalidRows: invalid, createdHouseholdIds: created_, createdAt: NOW() };
      MIGRATIONS.unshift(mig);
      return created(mig);
    }],

    /* ---- calendar: meetings are created, moved and cancelled here (MEET-03) ---- */
    ['POST', /^\/meetings$/, (m, q, b) => {
      if (!isRole('advisor')) return forbid();
      if (!b || !b.startsAt || !b.type) return fail(400, 'bad_request', 'startsAt and type are required.');
      if (Number.isNaN(Date.parse(b.startsAt))) return fail(400, 'bad_request', 'startsAt must be an ISO 8601 date-time.');
      if (b.householdId && !(hhById(b.householdId) || {}).id) return notFound('Household');
      if (b.householdId && hhById(b.householdId).advisorId !== user().advisorId) return notFound('Household');
      const x = { id: 'm' + (++seq), advisorId: user().advisorId, householdId: b.householdId || null,
        startsAt: new Date(b.startsAt).toISOString(), type: b.type, prepStatus: 'needs_prep',
        durationMinutes: b.durationMinutes || 30, brief: b.brief || null };
      MEETINGS.push(x);
      const { advisorId, ...out } = x;
      return created({ ...out, householdName: hhName(x.householdId), prospectName: prospectName(x.id) });
    }],
    ['PATCH', /^\/meetings\/([^/]+)$/, (m, q, b) => {
      if (!isRole('advisor')) return forbid();
      const x = MEETINGS.find(y => y.id === m[1] && y.advisorId === user().advisorId); if (!x) return notFound('Meeting');
      if (b && b.startsAt && Number.isNaN(Date.parse(b.startsAt))) return fail(400, 'bad_request', 'startsAt must be an ISO 8601 date-time.');
      for (const k of ['startsAt', 'type', 'durationMinutes', 'prepStatus', 'brief']) if (b && k in b) x[k] = b[k];
      if (b && b.startsAt) x.startsAt = new Date(b.startsAt).toISOString();
      const { advisorId, ...out } = x;
      return ok({ ...out, householdName: hhName(x.householdId), prospectName: prospectName(x.id) });
    }],
    ['DELETE', /^\/meetings\/([^/]+)$/, (m) => {
      if (!isRole('advisor')) return forbid();
      const i = MEETINGS.findIndex(y => y.id === m[1] && y.advisorId === user().advisorId); if (i < 0) return notFound('Meeting');
      MEETINGS.splice(i, 1);
      return { status: 204, data: undefined };
    }],

    /* ---- meeting records (MEET-04 to MEET-07). A transcript without recorded consent is
       withheld: consent is a precondition for disclosure, not a label on it. ---- */
    ['GET', /^\/meetings\/([^/]+)\/record$/, (m) => {
      if (!isRole('advisor')) return forbid();
      const x = MEETINGS.find(y => y.id === m[1] && y.advisorId === user().advisorId); if (!x) return notFound('Meeting');
      const r = RECORDS.find(y => y.meetingId === x.id); if (!r) return notFound('Record');
      const withheld = r.kind === 'transcript' && !(r.consent && r.consent.obtained);
      return ok({ meetingId: r.meetingId, kind: r.kind, author: r.author, source: r.source, consent: r.consent, sync: syncState(),
        capturedAt: x.startsAt, withheld, content: withheld ? null : r.content,
        withheldReason: withheld ? 'Recording consent is not on file for this meeting.' : null });
    }],
    ['POST', /^\/meetings\/([^/]+)\/record\/next-steps$/, (m) => {
      if (!isRole('advisor')) return forbid();
      const x = MEETINGS.find(y => y.id === m[1] && y.advisorId === user().advisorId); if (!x) return notFound('Meeting');
      const r = RECORDS.find(y => y.meetingId === x.id); if (!r) return notFound('Record');
      if (r.kind === 'transcript' && !(r.consent && r.consent.obtained)) return fail(409, 'conflict', 'Recording consent is not on file for this meeting.');
      // Drafts only. Nothing becomes a task until the advisor posts it to /tasks (X-03).
      return ok({ meetingId: x.id, generatedAt: NOW(), accepted: false, model: 'mock-suggestion-v0',
        items: NEXT_STEPS[x.id] || [{ title: 'Write up ' + (hhName(x.householdId) || 'the meeting') + ' and file the notes', dueDate: dateOnly(1), householdId: x.householdId }] });
    }],

    /* ---- allocation against the household's model (PM-02, PM-03) ---- */
    ['GET', /^\/households\/([^/]+)\/allocation$/, (m) => {
      if (!isRole('advisor') && !isRole('principal')) return forbid();
      const h = hhById(m[1]); if (!h) return notFound('Household');
      if (!isRole('principal') && h.advisorId !== user().advisorId) return notFound('Household');
      const a = ALLOCATIONS[h.id];
      if (!a) return ok({ householdId: h.id, householdName: h.name, model: null, lines: [], maxDriftPoints: null, dataAsOf: NOW() });
      const lines = ALLOC_CLASSES.map((assetClass, i) => ({ assetClass, targetPct: a.target[i], currentPct: a.current[i],
        driftPct: +(a.current[i] - a.target[i]).toFixed(1) }));
      return ok({ householdId: h.id, householdName: h.name, model: { id: a.modelId, name: a.modelName },
        lines, maxDriftPoints: Math.max(...lines.map(l => Math.abs(l.driftPct))), source: 'greenmeadows', dataAsOf: NOW() });
    }],

    /* ---- what the firm charges its clients (AX-10, AX-11) ---- */
    ['GET', /^\/billing\/fees$/, (m, q) => {
      if (!isRole('advisor')) return forbid();
      const hs = myHH().filter(h => h.aum > 0);
      const rows = hs.map(h => ({ householdId: h.id, householdName: h.name, billableAssets: h.aum,
        annualRatePct: feeRate(h.aum, h.id), quarterlyFee: quarterlyFee(h.aum, h.id) }));
      return ok({ schedule: FEE_TIERS, nextRunDate: dateOnly(7), currency: 'USD',
        totalQuarterlyFees: rows.reduce((a, r) => a + r.quarterlyFee, 0), dataAsOf: NOW(),
        ...paged(rows, q, 'billableAssets,desc') });
    }],

    /* ---- query surface ---- */
    ['POST', /^\/queries$/, (m, q, b) => {
      if (!isRole('advisor') && !isRole('principal')) return forbid();
      if (!b || !b.question || !String(b.question).trim()) return fail(400, 'bad_request', 'A question is required.');
      const scope = b.scope || 'own';
      if (!['own', 'firm', 'household'].includes(scope)) return fail(400, 'bad_request', 'Scope must be own, firm or household.');
      if (scope === 'firm' && !isRole('principal')) return forbid();
      if (scope === 'household') {
        const h = hhById(b.householdId);
        if (!h) return notFound('Household');
        if (!isRole('principal') && h.advisorId !== user().advisorId) return notFound('Household');
      }
      const r = runQuery(String(b.question), scope, b.householdId);
      const rec = { id: 'q' + (++seq), question: String(b.question).trim(), scope,
        householdId: scope === 'household' ? b.householdId : null,
        answer: r.answer, citations: r.citations, unanswerable: r.unanswerable,
        // A query reads. Anything actionable comes back as a draft the advisor accepts (X-03).
        actions: [], model: 'mock-matcher-v0', askedBy: user().name, dataAsOf: NOW(), createdAt: NOW() };
      QUERIES.unshift(rec);
      return created(rec);
    }],
    ['GET', /^\/queries$/, (m, q) => {
      if (!isRole('advisor') && !isRole('principal')) return forbid();
      return ok(paged(QUERIES.filter(x => x.askedBy === user().name), q, 'createdAt,desc'));
    }],
    ['GET', /^\/queries\/([^/]+)$/, (m) => {
      if (!isRole('advisor') && !isRole('principal')) return forbid();
      const r = QUERIES.find(x => x.id === m[1] && x.askedBy === user().name);
      return r ? ok(r) : notFound('Query');
    }],

    /* ---- reporting, scorecards, next best action ---- */
    ['GET', /^\/reports\/practice$/, (m, q) => {
      let ids;
      if (q.scope === 'firm') { if (!isRole('principal')) return forbid(); ids = ADVISORS.map(a => a.id); }
      else { if (!isRole('advisor')) return forbid(); ids = [user().advisorId]; }
      const to = q.to || dateOnly(0), from = q.from || dateOnly(-29);
      if (from > to) return fail(400, 'bad_request', 'from must not be after to.');
      return ok({ scope: q.scope === 'firm' ? 'firm' : 'own', ...practiceReport(ids, from, to) });
    }],
    ['GET', /^\/firm\/advisors\/([^/]+)\/scorecard$/, (m, q) => {
      const id = m[1];
      const isPrincipal = isRole('principal');
      // An advisor may see their own. Only a principal sees anyone else's, or a rank.
      if (!isPrincipal && !(isRole('advisor') && user().advisorId === id)) return forbid();
      if (!ADVISORS.some(a => a.id === id)) return notFound('Advisor');
      const to = q.to || dateOnly(0), from = q.from || dateOnly(-29);
      return ok(scorecard(id, from, to, isPrincipal));
    }],
    ['GET', /^\/next-actions$/, (m, q) => {
      let ids;
      if (q.scope === 'firm') { if (!isRole('principal')) return forbid(); ids = ADVISORS.map(a => a.id); }
      else { if (!isRole('advisor')) return forbid(); ids = [user().advisorId]; }
      const items = nextActions(ids);
      const size = +q.size || 20;
      return ok({ items: items.slice(0, size), totalItems: items.length, dataAsOf: NOW(),
        note: 'Drafts. Nothing here has been created; post a suggestedTask to /tasks to accept one.' });
    }],

    /* ---- firm ownership (PO-12) ---- */
    ['GET', /^\/firm\/cap-table$/, () => {
      if (!isRole('principal')) return forbid();
      const total = CAP_TABLE.reduce((a, r) => a + r.shares, 0);
      return ok({ asOf: dateOnly(0), totalShares: total, shareClasses: SHARE_CLASSES,
        holders: CAP_TABLE.map(r => ({ ...r, ownershipPct: +((r.shares / total) * 100).toFixed(2),
          fullyDilutedPct: +((r.shares / total) * 100).toFixed(2) })), dataAsOf: NOW() });
    }],

    /* ---- team share (PO-04) ---- */
    ['GET', /^\/team-shares$/, () => {
      if (!isRole('advisor')) return forbid();
      const me = user().advisorId;
      return ok({ items: TEAM_SHARES.filter(t => t.sharedBy === me || t.sharedWith === me)
        .map(t => ({ ...t, householdName: hhName(t.householdId), sharedByName: advName(t.sharedBy),
          sharedWithName: advName(t.sharedWith), direction: t.sharedBy === me ? 'out' : 'in' })) });
    }],
    ['POST', /^\/team-shares$/, (m, q, b) => {
      if (!isRole('advisor')) return forbid();
      if (!b || !b.householdId || !b.advisorId) return fail(400, 'bad_request', 'householdId and advisorId are required.');
      const h = hhById(b.householdId);
      if (!h || h.advisorId !== user().advisorId) return notFound('Household');
      if (!ADVISORS.some(a => a.id === b.advisorId)) return notFound('Advisor');
      if (b.advisorId === user().advisorId) return fail(400, 'bad_request', 'That household is already yours.');
      if (TEAM_SHARES.some(t => t.householdId === b.householdId && t.sharedWith === b.advisorId && !t.revokedAt))
        return fail(409, 'conflict', 'This household is already shared with that advisor.');
      const t = { id: 'ts' + (++seq), householdId: h.id, sharedBy: user().advisorId, sharedWith: b.advisorId,
        access: 'read', reason: b.reason || null, sharedAt: NOW(), revokedAt: null, revokedBy: null };
      TEAM_SHARES.push(t);
      return created({ ...t, householdName: h.name, sharedByName: user().name, sharedWithName: advName(b.advisorId), direction: 'out' });
    }],
    ['DELETE', /^\/team-shares\/([^/]+)$/, (m) => {
      if (!isRole('advisor')) return forbid();
      const t = TEAM_SHARES.find(x => x.id === m[1] && !x.revokedAt);
      if (!t) return notFound('Team share');
      // Either side may end it: the owner withdraws access, the recipient gives it up.
      if (t.sharedBy !== user().advisorId && t.sharedWith !== user().advisorId) return notFound('Team share');
      t.revokedAt = NOW(); t.revokedBy = user().name;
      return { status: 204, data: undefined };
    }],

    /* ---- fee plan (AX-11) ---- */
    ['GET', /^\/billing\/fee-plan$/, () => {
      if (!isRole('advisor') && !isRole('principal')) return forbid();
      return ok({ schedule: FEE_TIERS, currency: 'USD', ...FEE_PLAN_META,
        overrides: Object.entries(FEE_OVERRIDES)
          .filter(([hid]) => isRole('principal') || hhById(hid).advisorId === user().advisorId)
          .map(([hid, o]) => ({ householdId: hid, householdName: hhName(hid), ...o })),
        canEditSchedule: isRole('principal'), dataAsOf: NOW() });
    }],
    ['PATCH', /^\/billing\/fee-plan$/, (m, q, b) => {
      // The schedule is the firm's. An advisor changes one client's rate, not everyone's.
      if (!isRole('principal')) return forbid();
      if (!b || !Array.isArray(b.schedule) || !b.schedule.length) return fail(400, 'bad_request', 'A schedule with at least one tier is required.');
      const tiers = b.schedule;
      for (const t of tiers) {
        if (typeof t.minAssets !== 'number' || t.minAssets < 0) return fail(400, 'bad_request', 'Each tier needs a minAssets of zero or more.');
        if (typeof t.annualRatePct !== 'number' || t.annualRatePct < 0 || t.annualRatePct > 5)
          return fail(400, 'bad_request', 'Each rate must be between 0 and 5 percent.');
      }
      const sorted = [...tiers].sort((a, b2) => a.minAssets - b2.minAssets);
      if (sorted[0].minAssets !== 0) return fail(400, 'bad_request', 'The first tier must start at zero, or some households have no rate.');
      for (let i = 0; i < sorted.length - 1; i++) {
        if (sorted[i].maxAssets !== sorted[i + 1].minAssets)
          return fail(400, 'bad_request', 'Tiers must meet exactly, with no gap or overlap between them.');
      }
      if (sorted[sorted.length - 1].maxAssets !== null) return fail(400, 'bad_request', 'The top tier must be open-ended.');
      FEE_TIERS = sorted;
      FEE_PLAN_META = { updatedAt: NOW(), updatedBy: user().name };
      return ok({ schedule: FEE_TIERS, currency: 'USD', ...FEE_PLAN_META, overrides: [], canEditSchedule: true, dataAsOf: NOW() });
    }],
    ['PATCH', /^\/billing\/fees\/([^/]+)$/, (m, q, b) => {
      if (!isRole('advisor')) return forbid();
      const h = hhById(m[1]);
      if (!h || h.advisorId !== user().advisorId) return notFound('Household');
      if (b && b.annualRatePct === null) { delete FEE_OVERRIDES[h.id]; return ok({ householdId: h.id, householdName: h.name, annualRatePct: scheduleRate(h.aum), overridden: false }); }
      if (!b || typeof b.annualRatePct !== 'number' || b.annualRatePct < 0 || b.annualRatePct > 5)
        return fail(400, 'bad_request', 'annualRatePct must be between 0 and 5, or null to remove the override.');
      if (!b.reason || !String(b.reason).trim()) return fail(400, 'bad_request', 'A reason is required: a fee change alters what a client is billed.');
      FEE_OVERRIDES[h.id] = { annualRatePct: b.annualRatePct, reason: String(b.reason).trim(), setBy: user().name, setAt: NOW() };
      return ok({ householdId: h.id, householdName: h.name, overridden: true, scheduleRate: scheduleRate(h.aum), ...FEE_OVERRIDES[h.id] });
    }],

    /* ---- portfolio modeling (PM-03) ---- */
    ['GET', /^\/models$/, () => {
      if (!isRole('advisor') && !isRole('principal')) return forbid();
      return ok({ items: Object.entries(MODEL_LIBRARY).map(([id, mdl]) => ({ id, ...mdl })) });
    }],
    ['POST', /^\/households\/([^/]+)\/model-comparison$/, (m, q, b) => {
      if (!isRole('advisor')) return forbid();
      const h = hhById(m[1]);
      if (!h || h.advisorId !== user().advisorId) return notFound('Household');
      const target = MODEL_LIBRARY[b && b.modelId];
      if (!target) return fail(400, 'bad_request', 'modelId must be one of: ' + Object.keys(MODEL_LIBRARY).join(', ') + '.');
      const a = ALLOCATIONS[h.id];
      if (!a) return fail(409, 'conflict', 'This household has no allocation on file, so there is nothing to compare.');
      const lines = ALLOC_CLASSES.map((assetClass, i) => {
        const currentPct = a.current[i], targetPct = target.target[i];
        return { assetClass, currentPct, targetPct, changePct: +(targetPct - currentPct).toFixed(1),
          changeValue: Math.round(h.aum * (targetPct - currentPct) / 100) };
      });
      return created({
        householdId: h.id, householdName: h.name, aum: h.aum,
        fromModel: { id: a.modelId, name: a.modelName }, toModel: { id: b.modelId, name: target.name },
        lines,
        turnoverPct: +(lines.reduce((t, l) => t + Math.abs(l.changePct), 0) / 2).toFixed(1),
        // A comparison is a draft. Placing a trade is PM-05 and is on the regulatory list.
        placed: false,
        note: 'A comparison, not an instruction. No trade has been placed and none can be from here.',
        dataAsOf: NOW()
      });
    }],

    /* ---- playbooks (AX-09) ---- */
    ['GET', /^\/playbooks$/, () => (isRole('advisor') ? ok({ items: PLAYBOOKS }) : forbid())],
    ['POST', /^\/playbooks\/([^/]+)\/runs$/, (m, q, b) => {
      if (!isRole('advisor')) return forbid();
      const pb = PLAYBOOKS.find(p2 => p2.id === m[1]); if (!pb) return notFound('Playbook');
      const h = b && b.householdId ? hhById(b.householdId) : null;
      if (b && b.householdId && (!h || h.advisorId !== user().advisorId)) return notFound('Household');
      const anchor = b && b.anchorDate ? b.anchorDate : dateOnly(0);
      if (Number.isNaN(Date.parse(anchor))) return fail(400, 'bad_request', 'anchorDate must be a date.');
      const base = Math.round((new Date(anchor + 'T00:00:00') - T0) / 864e5);
      // Running a playbook IS the advisor's explicit action, so these are real tasks.
      const made = pb.steps.map(st => {
        const t = { id: 't' + (++seq), advisorId: user().advisorId, title: st.title,
          householdId: h ? h.id : null, dueDate: dateOnly(base + st.dayOffset), origin: 'playbook',
          originMeetingId: null, status: 'open', createdAt: NOW() };
        TASKS.push(t); return publicTask(t);
      });
      return created({ playbookId: pb.id, playbookName: pb.name, householdId: h ? h.id : null,
        householdName: h ? h.name : null, anchorDate: anchor, tasks: made });
    }],

    /* ---- advisor-client matching (GP-01) ---- */
    ['GET', /^\/prospects\/([^/]+)\/matches$/, (m) => {
      if (!isRole('advisor') && !isRole('principal')) return forbid();
      const p = PROSPECTS.find(x => x.id === m[1]);
      if (!p) return notFound('Prospect');
      if (!isRole('principal') && p.advisorId !== user().advisorId) return notFound('Prospect');
      const scored = ADVISORS.map(a => {
        const hs = HH.filter(h => h.advisorId === a.id);
        const load = hs.length;
        const sizes = hs.map(h => h.aum).sort((x, y) => x - y);
        const typical = sizes.length ? sizes[sizes.length >> 1] : 0;
        // Closeness of the prospect's assets to this advisor's typical client, and spare capacity.
        const fit = typical ? 1 - Math.min(1, Math.abs(Math.log((p.estimatedAssets || 1) / typical)) / 2) : 0.5;
        const capacity = 1 - Math.min(1, load / 12);
        const score = +(fit * 0.6 + capacity * 0.4).toFixed(3);
        const reasons = [];
        reasons.push(`Typical client is $${(typical / 1e6).toFixed(1)}M against this prospect's $${((p.estimatedAssets || 0) / 1e6).toFixed(1)}M.`);
        reasons.push(load >= 12 ? `Carrying ${load} households, which is at the top of the range.` : `Carrying ${load} households, with room for more.`);
        return { advisorId: a.id, advisorName: a.name, score, households: load, typicalClientAssets: typical, reasons };
      }).sort((x, y) => y.score - x.score);
      return ok({ prospectId: p.id, prospectName: p.name, estimatedAssets: p.estimatedAssets,
        items: scored, currentAdvisorId: p.advisorId,
        note: 'A suggestion based on client size and current load. Reassigning is a human decision.',
        dataAsOf: NOW() });
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

    /* ---- what the firm pays for the platform (PO-10). Principal only: an advisor has no
       business seeing the firm's payment method or invoices. ---- */
    ['GET', /^\/firm\/billing\/subscription$/, () => {
      if (!isRole('principal')) return forbid();
      const current = INVOICES[0];
      return ok({ ...SUBSCRIPTION, currentInvoice: { id: current.id, number: current.number, amount: current.amount, dueDate: current.dueDate, status: current.status }, dataAsOf: NOW() });
    }],
    ['GET', /^\/firm\/billing\/invoices$/, (m, q) => {
      if (!isRole('principal')) return forbid();
      return ok(paged(INVOICES.map(({ lines, ...i }) => i), q, 'issuedDate,desc'));
    }],
    ['GET', /^\/firm\/billing\/invoices\/([^/]+)$/, (m) => {
      if (!isRole('principal')) return forbid();
      const i = INVOICES.find(x => x.id === m[1]); if (!i) return notFound('Invoice');
      return ok(i);
    }],

    /* ---- branding (GP-07, GP-10). Readable by anyone signed in, because the client portal is
       branded too; only a principal may change it. It holds no client data. ---- */
    ['GET', /^\/firm\/branding$/, () => ok({ ...BRANDING, firmId: FIRM.id })],
    ['PATCH', /^\/firm\/branding$/, (m, q, b) => {
      if (!isRole('principal')) return forbid();
      if (b && 'accentColor' in b && !/^#[0-9a-fA-F]{6}$/.test(b.accentColor)) return fail(400, 'bad_request', 'accentColor must be a six-digit hex colour, for example #0E5A57.');
      if (b && 'markLetter' in b && String(b.markLetter).length !== 1) return fail(400, 'bad_request', 'markLetter must be a single character.');
      for (const k of ['firmName', 'advisorDisplayName', 'markLetter', 'accentColor']) if (b && k in b) BRANDING[k] = b[k];
      BRANDING.updatedAt = NOW(); BRANDING.updatedBy = user().name;
      return ok({ ...BRANDING, firmId: FIRM.id });
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
      // Billed off the same schedule the advisor sees at /billing/fees, so the two agree.
      const h = hhById(user().householdId), a = h.accounts[0], amt = quarterlyFee(h.aum, h.id);
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

export { createMock };
