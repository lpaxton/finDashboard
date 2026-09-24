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
