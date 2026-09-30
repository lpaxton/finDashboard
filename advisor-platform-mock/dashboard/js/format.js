/* The API returns ISO dates and plain numbers; these make them readable.
   Pure helpers only: nothing here calls the API, touches the DOM or holds state.

   Every one of them is language-aware, because formatting is half of a translation: a French
   reader expects 83,9 M$ and "29 sept. 2026", and a dictionary that leaves the numbers in
   en-US produces a screen in two languages at once. The locale is read at call time rather
   than captured, so switching language re-renders correctly without reloading. */
import { t, locale } from './i18n.js';

export const $ = (id) => document.getElementById(id);
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const money = (n) => new Intl.NumberFormat(locale(), { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(n);
export const moneyFull = (n) => new Intl.NumberFormat(locale(), { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
export const pct = (n) => (n > 0 ? '+' : '') + new Intl.NumberFormat(locale(), { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n);
export const pctClass = (n) => (n < 0 ? 'neg' : n > 0 ? 'up' : '');
export const fmtTime = (iso) => new Date(iso).toLocaleTimeString(locale(), { hour: 'numeric', minute: '2-digit' });
export const fmtDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString(locale(), { month: 'short', day: 'numeric', year: 'numeric' });
export const localDate = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
export const daysAgo = (iso) => {
  if (!iso) return t('No record');
  const n = Math.floor((Date.now() - new Date(iso)) / 864e5);
  return n <= 0 ? t('Today') : n === 1 ? t('Yesterday') : t('{n} days ago', { n });
};
/* How recent, finely enough to be useful on a source line. daysAgo() is the right grain for a
   record ("12 days ago"); this is the right grain for a reading ("2 hrs ago"). */
export const ageBrief = (iso) => {
  if (!iso) return t('age unknown');
  const mins = Math.floor((Date.now() - new Date(iso)) / 6e4);
  if (!Number.isFinite(mins) || mins < 0) return t('just now');
  if (mins < 2) return t('just now');
  if (mins < 60) return t('{n} mins ago', { n: mins });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t(hrs === 1 ? '{n} hr ago' : '{n} hrs ago', { n: hrs });
  const days = Math.floor(hrs / 24);
  return days === 1 ? t('yesterday') : t('{n} days ago', { n: days });
};

/* Sources in the advisor's language, never the system's name (UX_RULES TR-06, TR-10).
   The contract's Source enum has four values and briefSources carries the same ones, but it is
   typed as free strings, so an unknown value has to degrade rather than leak "greenmeadows"
   onto an advisor's screen. Anything reaching the fallback is worth raising with design: a
   source the advisor cannot name is a TR-10 problem, not a wording one. */
const SOURCE_EN = {
  greenmeadows: 'custodian records',
  crm: 'your CRM',
  calendar: 'your calendar',
  platform: "the platform's own checks"
};
/* Read through t() at call time, not frozen at module load, so a language change re-renders. */
export const SOURCE_KIND = new Proxy(SOURCE_EN, { get: (o, k) => (k in o ? t(o[k]) : undefined) });
/* UX_DESIGN_SYSTEM names five kinds — custodian records, your CRM, your calendar, your notes,
   market data — and the contract has a fourth value, `platform`, for something the platform
   worked out itself. "From the platform" reads as circular, so it is named for what it is.
   Worth confirming with design; notes and market data have no contract value yet. */
const unnamedSources = new Set();
export const sourceKind = (s) => {
  const k = SOURCE_KIND[s];
  if (k) return k;
  if (s && !unnamedSources.has(s)) { unnamedSources.add(s); console.warn('No advisor-facing name for source:', s); }
  return t('another connected system');
};

/* "From custodian records, your CRM and your calendar \u00b7 updated 2 hrs ago".
   Takes one source or a list; the age is optional, because not every source carries one. */
export function sourceLine(sources, at) {
  const kinds = [...new Set([].concat(sources ?? []).filter(Boolean).map(sourceKind))];
  if (!kinds.length) return '';
  const named = kinds.length === 1 ? kinds[0]
    : kinds.slice(0, -1).join(', ') + t(' and ') + kinds[kinds.length - 1];
  return at ? t('From {sources} \u00b7 updated {age}', { sources: named, age: ageBrief(at) })
    : t('From {sources}', { sources: named });
}

/* Whole days between then and now. daysAgo() is for showing; this is for deciding. */
export const daysBetween = (iso, to = Date.now()) => Math.floor((to - new Date(iso)) / 864e5);

export function dueLabel(dateStr) {
  if (!dateStr) return { text: t('No due date'), hot: false };
  const today = localDate(new Date()), tm = new Date(); tm.setDate(tm.getDate() + 1);
  if (dateStr < today) return { text: t('Overdue, {date}', { date: fmtDate(dateStr) }), hot: true };
  if (dateStr === today) return { text: t('Due today'), hot: true };
  if (dateStr === localDate(tm)) return { text: t('Due tomorrow'), hot: false };
  const d = new Date(dateStr + 'T00:00:00').toLocaleDateString(locale(), { weekday: 'short', month: 'short', day: 'numeric' });
  return { text: t('Due {date}', { date: d }), hot: false };
}
/* Three lookup tables, all read through t() at call time for the same reason as SOURCE_KIND.
   The English value is the key, so adding a status means one line here and one in i18n.js. */
const lookup = (o) => new Proxy(o, { get: (x, k) => (k in x ? t(x[k]) : undefined) });

export const HH_STATUS = { on_track: ['On track', 'ok'], needs_review: ['Needs review', 'warn'], overdue_contact: ['Overdue contact', 'crit'], onboarding: ['Onboarding', 'plain'], forms_incomplete: ['Forms incomplete', 'warn'] };
export const statusBadge = (s) => { const [label, c] = HH_STATUS[s] || [s, 'plain']; return `<span class="badge ${c}">${esc(t(label))}</span>`; };
export const SHARE_TYPES = lookup({ plan: 'Plan', tax_explanation: 'Tax explanation', report: 'Report', proposal: 'Proposal', message: 'Message', document: 'Document', article: 'Article' });
export const CATEGORY = lookup({ communications_review: 'Communications review', annual_review: 'Annual review', disclosure: 'Disclosure', restriction: 'Restriction', agreement: 'Agreement', content_review: 'Content review' });

/* The CRM is the system of record (docs/system-of-record.md). While none is connected, a badge
   on every row would be pure noise, so the state shows per record only when it needs attention
   and the section says once, quietly, that nothing is connected. */
export const SYNC_LABEL = lookup({ pending: 'Not yet in CRM', failed: 'CRM write failed', conflict: 'Differs from CRM' });

export const syncBadge = (sync) => {
  const label = sync && SYNC_LABEL[sync.status];
  if (!label) return '';
  return `<span class="badge ${sync.status === 'synced' ? 'ok' : sync.status === 'pending' ? 'prep' : 'crit'}" title="${esc(sync.error || label)}">${esc(label)}</span>`;
};

/* One line per section, not one per row. Returns nothing once a CRM is connected. */
export const syncNotice = (items) => {
  const off = items.some(i => i.sync && i.sync.status === 'not_configured');
  return off ? `<p class="hint">${esc(t('No CRM is connected, so nothing here has been written to one. This platform is the working surface; the CRM stays the system of record.'))}</p>` : '';
};
