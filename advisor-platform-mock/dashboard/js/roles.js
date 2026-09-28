/* The four roles an advisor plays, and the work that belongs to each.
   UX_RULES FO-01: Today is organised by prospecting and business development · client advisor ·
   business operations · professional development. CS-01: growth work always has its own place,
   so the order here never changes and Prospecting is always first.

   The taxonomy lives in the front end. The contract does not say which role a piece of work
   belongs to, and nothing in it needs to: a role is how an advisor's day is organised, not a
   property of an alert. If that turns out to be wrong — if the platform should be ranking
   across roles rather than the screen doing it — it becomes a `role` field on NextAction and
   this file gets smaller. Noted in docs/ux-build-plan.md.

   What counts as slipping is UX_RULES CS-09, and it is a [PO] rule: unanswered prospect
   replies · prospects quiet 45+ days · the referral window after a strong review · clients
   quiet 60+ days · life events · stalled onboarding. The thresholds below are that list. */
import { api } from './api.js';
import { daysBetween } from './format.js';

export const ROLES = [
  { key: 'bd', mark: 'BD', name: 'Prospecting', full: 'Prospecting and business development' },
  { key: 'ca', mark: 'CA', name: 'Clients', full: 'Client advisor' },
  { key: 'op', mark: 'OP', name: 'Operations', full: 'Business operations' },
  { key: 'pd', mark: 'PD', name: 'Development', full: 'Professional development' }
];
export const ROLE = Object.fromEntries(ROLES.map(r => [r.key, r]));

/* CS-09's thresholds, in one place so the rule can be read rather than hunted for. */
export const SLIPPING = {
  proposalWaitingDays: 14,
  leadNoReplyDays: 3,
  prospectQuietDays: 45,
  clientQuietDays: 60
};

/* An item on a role card. Meaning first, then one suggested action (FO-09, CS-03).
   `weight` is only for ordering inside a card and for choosing the day's lead (FO-04). */
const item = (role, weight, meaning, action, source, extra = {}) =>
  ({ role, weight, meaning, action, source, ...extra });

/* FO-04: time-critical means activity that has gone dormant and is about to cost something, or
   anything that could affect the business itself. Both are expressed as weight. */
const PRIORITY_WEIGHT = { high: 60, medium: 30, low: 10 };

export async function collectRoleWork(advisorId) {
  const get = (m, p, o) => api(m, p, o).catch(() => null);
  const [prospects, households, next, alerts, comms, scorecard] = await Promise.all([
    get('GET', '/prospects', { query: { size: 100 } }),
    get('GET', '/households', { query: { size: 100 } }),
    get('GET', '/next-actions', { query: { size: 25 } }),
    get('GET', '/alerts'),
    get('GET', '/communications', { query: { status: 'draft', size: 20 } }),
    advisorId ? get('GET', '/firm/advisors/' + encodeURIComponent(advisorId) + '/scorecard') : Promise.resolve(null)
  ]);
  const out = [];

  /* ---- Prospecting: what has gone quiet on the growth side (CS-09) ----
     CS-03 asks for the next step already drafted where automation exists. For growth work it
     does not: the contract has no operation that creates a communication at all, so these
     actions open the record rather than promising a draft nobody can produce. Logged. */
  for (const p of (prospects && prospects.items) || []) {
    const inStage = daysBetween(p.stageChangedAt);
    const sinceContact = p.lastContactAt ? daysBetween(p.lastContactAt) : null;
    if (p.stage === 'proposal' && inStage >= SLIPPING.proposalWaitingDays) {
      out.push(item('bd', 40 + inStage, `The ${p.name} proposal has been out for ${inStage} days.`,
        { label: 'Open the proposal', kind: 'prospect', id: p.id },
        { kinds: ['crm'], at: p.stageChangedAt }, { subject: p.name }));
    } else if (p.stage === 'lead' && sinceContact === null && inStage >= SLIPPING.leadNoReplyDays) {
      out.push(item('bd', 35 + inStage, `${p.name} came in ${inStage} days ago and has had no reply.`,
        { label: 'Open the lead', kind: 'prospect', id: p.id },
        { kinds: ['crm'], at: p.createdAt }, { subject: p.name }));
    } else if (sinceContact !== null && sinceContact >= SLIPPING.prospectQuietDays && p.stage !== 'converted') {
      out.push(item('bd', 30 + sinceContact / 2, `${p.name} has been quiet for ${sinceContact} days.`,
        { label: 'Open the prospect', kind: 'prospect', id: p.id },
        { kinds: ['crm'], at: p.lastContactAt }, { subject: p.name }));
    }
  }

  /* ---- Clients: the platform's own ranking, plus contact that has gone cold ---- */
  const CA_KINDS = { contact: 1, prep: 1, tax: 1, onboarding: 1 };
  for (const a of (next && next.items) || []) {
    if (!CA_KINDS[a.kind]) continue;
    out.push(item('ca', PRIORITY_WEIGHT[a.priority] + 20, a.title + '. ' + a.reason,
      { label: 'Add as a follow-up', kind: 'next-action', id: a.id, nextAction: a },
      { kinds: a.citations.map(c => c.source), at: a.citations.map(c => c.dataAsOf).sort().pop() },
      { subject: a.householdName, drafted: true }));
  }
  for (const a of (alerts && alerts.items) || []) {
    if (!a.householdId) continue;
    out.push(item('ca', PRIORITY_WEIGHT[a.severity], a.title + (a.householdName ? ' — ' + a.householdName + '.' : '.'),
      { label: 'Open the household', kind: 'household', id: a.householdId },
      { kinds: [a.source], at: a.createdAt }, { subject: a.householdName, alertId: a.id }));
  }
  for (const h of (households && households.items) || []) {
    const quiet = h.lastContactAt ? daysBetween(h.lastContactAt) : null;
    if (quiet !== null && quiet >= SLIPPING.clientQuietDays) {
      out.push(item('ca', 25 + quiet / 4, `${h.name} has not been contacted in ${quiet} days.`,
        { label: 'Open the household', kind: 'household', id: h.id },
        { kinds: ['crm'], at: h.lastContactAt }, { subject: h.name }));
    }
  }

  /* ---- Operations: what is waiting on the advisor's yes, and the practice's own alerts ---- */
  for (const a of (next && next.items) || []) {
    if (a.kind !== 'approval') continue;
    out.push(item('op', PRIORITY_WEIGHT[a.priority] + 15, a.title + '. ' + a.reason,
      { label: 'Open the message', kind: 'communication', id: a.citations[0] && a.citations[0].id },
      { kinds: a.citations.map(c => c.source), at: a.citations.map(c => c.dataAsOf).sort().pop() },
      { subject: a.householdName, drafted: true }));
  }
  const waiting = ((comms && comms.items) || []).filter(c => !c.complianceReview);
  if (waiting.length) {
    out.push(item('op', 20 + waiting.length, waiting.length === 1
      ? `One message is drafted and waiting for your yes.`
      : `${waiting.length} messages are drafted and waiting for your yes.`,
      { label: 'Open the inbox', kind: 'inbox' },
      { kinds: ['platform'], at: waiting.map(c => c.createdAt).sort().pop() }, { drafted: true }));
  }
  for (const a of (alerts && alerts.items) || []) {
    if (a.householdId) continue;
    out.push(item('op', PRIORITY_WEIGHT[a.severity] + 10, a.title + '.',
      { label: 'Open the inbox', kind: 'inbox' }, { kinds: [a.source], at: a.createdAt }, { alertId: a.id }));
  }

  /* ---- Development: the advisor's own practice. Never a shortfall (CS-08). ---- */
  if (scorecard && scorecard.metrics) {
    const moved = scorecard.metrics
      .filter(m => typeof m.change === 'number' && m.change !== 0)
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))[0];
    if (moved) {
      const better = moved.lowerIsBetter ? moved.change < 0 : moved.change > 0;
      out.push(item('pd', 12, `${moved.label} ${better ? 'moved in your favour' : 'moved against you'} this period.`,
        { label: 'Open your scorecard', kind: 'role', id: 'pd' },
        { kinds: ['platform'], at: scorecard.dataAsOf }, { optional: true }));
    }
  }

  return out.sort((a, b) => b.weight - a.weight);
}

/* Which role leads today, and the one line that says why (ST-03).
   A pinned order overrides it entirely and says so instead (ST-09). */
export function rankRoles(work, pinned) {
  const byRole = Object.fromEntries(ROLES.map(r => [r.key, work.filter(w => w.role === r.key)]));
  if (pinned) return { order: ROLES.map(r => r.key), byRole, lead: ROLES[0].key, reason: null, pinned: true };
  const top = (k) => (byRole[k][0] ? byRole[k][0].weight : 0);
  const order = ROLES.map(r => r.key).sort((a, b) => top(b) - top(a));
  const lead = order[0];
  return { order, byRole, lead, reason: reasonFor(lead, byRole[lead]), pinned: false };
}

/* One line, about the work rather than the advisor (CS-02). */
function reasonFor(lead, items) {
  if (!items.length) return null;
  const name = ROLE[lead].name;
  const n = items.length;
  const what = lead === 'bd' ? 'growth work has gone quiet'
    : lead === 'ca' ? 'the day is client work'
    : lead === 'op' ? 'work is waiting on your yes'
    : 'nothing else is pressing';
  return `${name} first today: ${what}, and ${n === 1 ? 'one thing needs' : n + ' things need'} an answer.`;
}
