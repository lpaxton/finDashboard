/* The API returns ISO dates and plain numbers; these make them readable.
   Pure helpers only: nothing here calls the API, touches the DOM or holds state. */

export const $ = (id) => document.getElementById(id);
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const money = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(n);
export const moneyFull = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
export const pct = (n) => (n > 0 ? '+' : '') + (n * 100).toFixed(1) + '%';
export const pctClass = (n) => (n < 0 ? 'neg' : n > 0 ? 'up' : '');
export const fmtTime = (iso) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
export const fmtDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
export const localDate = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
export const daysAgo = (iso) => {
  if (!iso) return 'No record';
  const n = Math.floor((Date.now() - new Date(iso)) / 864e5);
  return n <= 0 ? 'Today' : n === 1 ? 'Yesterday' : n + ' days ago';
};
/* How recent, finely enough to be useful on a source line. daysAgo() is the right grain for a
   record ("12 days ago"); this is the right grain for a reading ("2 hrs ago"). */
export const ageBrief = (iso) => {
  if (!iso) return 'age unknown';
  const mins = Math.floor((Date.now() - new Date(iso)) / 6e4);
  if (!Number.isFinite(mins) || mins < 0) return 'just now';
  if (mins < 2) return 'just now';
  if (mins < 60) return mins + ' mins ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + (hrs === 1 ? ' hr ago' : ' hrs ago');
  const days = Math.floor(hrs / 24);
  return days === 1 ? 'yesterday' : days + ' days ago';
};

/* Sources in the advisor's language, never the system's name (UX_RULES TR-06, TR-10).
   The contract's Source enum has four values and briefSources carries the same ones, but it is
   typed as free strings, so an unknown value has to degrade rather than leak "greenmeadows"
   onto an advisor's screen. Anything reaching the fallback is worth raising with design: a
   source the advisor cannot name is a TR-10 problem, not a wording one. */
export const SOURCE_KIND = {
  greenmeadows: 'custodian records',
  crm: 'your CRM',
  calendar: 'your calendar',
  platform: "the platform's own checks"
};
/* UX_DESIGN_SYSTEM names five kinds — custodian records, your CRM, your calendar, your notes,
   market data — and the contract has a fourth value, `platform`, for something the platform
   worked out itself. "From the platform" reads as circular, so it is named for what it is.
   Worth confirming with design; notes and market data have no contract value yet. */
const unnamedSources = new Set();
export const sourceKind = (s) => {
  const k = SOURCE_KIND[s];
  if (k) return k;
  if (s && !unnamedSources.has(s)) { unnamedSources.add(s); console.warn('No advisor-facing name for source:', s); }
  return 'another connected system';
};

/* "From custodian records, your CRM and your calendar \u00b7 updated 2 hrs ago".
   Takes one source or a list; the age is optional, because not every source carries one. */
export function sourceLine(sources, at) {
  const kinds = [...new Set([].concat(sources ?? []).filter(Boolean).map(sourceKind))];
  if (!kinds.length) return '';
  const named = kinds.length === 1 ? kinds[0]
    : kinds.slice(0, -1).join(', ') + ' and ' + kinds[kinds.length - 1];
  return 'From ' + named + (at ? ' \u00b7 updated ' + ageBrief(at) : '');
}

/* Whole days between then and now. daysAgo() is for showing; this is for deciding. */
export const daysBetween = (iso, to = Date.now()) => Math.floor((to - new Date(iso)) / 864e5);

export function dueLabel(dateStr) {
  if (!dateStr) return { text: 'No due date', hot: false };
  const t = localDate(new Date()), tm = new Date(); tm.setDate(tm.getDate() + 1);
  if (dateStr < t) return { text: 'Overdue, ' + fmtDate(dateStr), hot: true };
  if (dateStr === t) return { text: 'Due today', hot: true };
  if (dateStr === localDate(tm)) return { text: 'Due tomorrow', hot: false };
  return { text: 'Due ' + new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }), hot: false };
}
export const HH_STATUS = { on_track: ['On track', 'ok'], needs_review: ['Needs review', 'warn'], overdue_contact: ['Overdue contact', 'crit'], onboarding: ['Onboarding', 'plain'], forms_incomplete: ['Forms incomplete', 'warn'] };
export const statusBadge = (s) => { const [t, c] = HH_STATUS[s] || [s, 'plain']; return `<span class="badge ${c}">${esc(t)}</span>`; };
export const SHARE_TYPES = { plan: 'Plan', tax_explanation: 'Tax explanation', report: 'Report', proposal: 'Proposal', message: 'Message', document: 'Document' };
export const CATEGORY = { communications_review: 'Communications review', annual_review: 'Annual review', disclosure: 'Disclosure', restriction: 'Restriction', agreement: 'Agreement' };

/* The CRM is the system of record (docs/system-of-record.md). While none is connected, a badge
   on every row would be pure noise, so the state shows per record only when it needs attention
   and the section says once, quietly, that nothing is connected. */
export const SYNC_LABEL = { pending: 'Not yet in CRM', failed: 'CRM write failed', conflict: 'Differs from CRM' };

export const syncBadge = (sync) => {
  const label = sync && SYNC_LABEL[sync.status];
  if (!label) return '';
  return `<span class="badge ${sync.status === 'synced' ? 'ok' : sync.status === 'pending' ? 'prep' : 'crit'}" title="${esc(sync.error || label)}">${esc(label)}</span>`;
};

/* One line per section, not one per row. Returns nothing once a CRM is connected. */
export const syncNotice = (items) => {
  const off = items.some(i => i.sync && i.sync.status === 'not_configured');
  return off ? '<p class="hint">No CRM is connected, so nothing here has been written to one. This platform is the working surface; the CRM stays the system of record.</p>' : '';
};
