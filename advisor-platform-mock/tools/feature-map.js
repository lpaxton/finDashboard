#!/usr/bin/env node
/*
 * Regenerates the tables in docs/feature-api-map.md from openapi.yaml.
 *
 *   npm run feature-map              rewrite the tables
 *   npm run feature-map -- --check   exit non-zero if they are out of date
 *
 * Every operation in the contract names the requirements it serves in its description
 * ("Requirement: MEET-04, MEET-05"). This inverts those tags, so the map cannot drift from the
 * contract: a feature that gains an operation appears on its own, and one that loses its tag
 * disappears. Only the tables between the markers are rewritten; the prose around them is
 * written by hand and left alone.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseYaml } from './yaml.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOC = path.join(ROOT, 'docs', 'feature-api-map.md');
const START = '<!-- generated:tables -->';
const END = '<!-- /generated:tables -->';

const GROUPS = [
  ['Intelligence Platform', 'IP', 11], ['Client Engagement — meetings', 'MEET', 8],
  ['Client Engagement — communications', 'COMM', 5], ['Practice Operations', 'PO', 12],
  ['Portfolio Management', 'PM', 5], ['Planning', 'PL', 2],
  ['Risk and Tax Intelligence', 'RTI', 10], ['Growth and Prospecting', 'GP', 10],
  ['Advisor and Client Experience', 'AX', 12]
];

const NAMES = {
  'IP-01': 'Query recorded meetings', 'IP-02': 'Query CRM', 'IP-03': 'Query email',
  'IP-04': 'Query custodial and financial data', 'IP-05': 'Query documents',
  'IP-06': 'Query external market and regulatory info', 'IP-07': 'Deep research and internal information',
  'IP-08': 'Context-aware answers per client', 'IP-09': 'Unified dashboard',
  'IP-10': 'Data fusion for tax intelligence', 'IP-11': 'Conversation insights',
  'MEET-01': 'Pre-meeting prep', 'MEET-02': 'Personalised agenda', 'MEET-03': 'Scheduling',
  'MEET-04': 'Recording', 'MEET-05': 'Live transcription', 'MEET-06': 'AI summaries',
  'MEET-07': 'Action item extraction', 'MEET-08': 'CRM auto-update',
  'COMM-01': 'AI email drafting', 'COMM-02': 'Tone personalisation', 'COMM-03': 'Communication tracker',
  'COMM-04': 'Client monitoring', 'COMM-05': 'Client Sentiment Index',
  'PO-01': 'Daily AI digest', 'PO-02': 'Task creation and CRM sync', 'PO-03': 'Priority surfacing and alerts',
  'PO-04': 'Team share', 'PO-05': 'Spreadsheet replacement and workflow automation',
  'PO-06': 'Advisor performance tracking', 'PO-07': 'Reporting and analytics', 'PO-08': 'Compliance tracker',
  'PO-09': 'Multi-custodian', 'PO-10': 'Business operations management', 'PO-11': 'Book of business',
  'PO-12': 'Cap table and ownership',
  'PM-01': 'Portfolio summaries', 'PM-02': 'Exposure analysis', 'PM-03': 'Portfolio modeling',
  'PM-04': 'Robo portfolio', 'PM-05': 'Placing a trade',
  'PL-01': 'Financial planning agent', 'PL-02': 'Next best action',
  'RTI-01': 'Credit risk', 'RTI-02': 'Document ingestion', 'RTI-03': 'AI tax strategies',
  'RTI-04': 'Tax opportunity identification', 'RTI-05': 'Tax loss harvesting',
  'RTI-06': 'Interactive scenario modeling', 'RTI-07': 'Projections and tax simulations',
  'RTI-08': 'Client-facing tax explanations', 'RTI-09': 'Quantification of advisor value',
  'RTI-10': 'Client-ready outputs',
  'GP-01': 'Advisor-client matching', 'GP-02': 'Referral tracking', 'GP-03': 'Proposal generation',
  'GP-04': 'Portfolio proposals', 'GP-05': 'Pitch decks', 'GP-06': 'Content for social, blogs, newsletters',
  'GP-07': 'Branded content', 'GP-08': 'Podcasts', 'GP-09': 'Presentations', 'GP-10': 'Branded materials',
  'AX-01': 'AI intake forms', 'AX-02': 'Onboarding tracker', 'AX-03': 'Document intelligence',
  'AX-04': 'Other onboarding assistance', 'AX-05': 'Practice client conversations',
  'AX-06': 'Simulated client conversation', 'AX-07': 'Coaching in workflow', 'AX-08': 'Scorecards',
  'AX-09': 'Playbooks', 'AX-10': 'Client billing', 'AX-11': 'Fee plan customisation',
  'AX-12': 'Client-side experience'
};

/* Why a feature has no operation. Hand-maintained, because it is a judgement rather than
   something the contract can state about a feature it does not mention. */
const BLOCKED = {
  'IP-02': 'No CRM connected', 'IP-03': 'No inbox connected',
  'IP-04': 'Served indirectly; no query operation', 'IP-05': 'Nothing reads a document',
  'IP-06': 'No market or regulatory source', 'IP-07': 'No access to internal research',
  'IP-10': 'Needs IP-02 and IP-05 first', 'MEET-08': 'No CRM connected',
  'COMM-05': 'Regulatory review', 'PO-01': 'Composed in the UI, no single operation',
  'PO-05': 'Scope undefined', 'PO-09': 'One custodian only', 'PM-04': 'Regulatory review',
  'PL-01': 'Not started', 'RTI-01': 'Regulatory review', 'RTI-02': 'Nothing reads a document',
  'RTI-03': 'Regulatory review', 'RTI-06': 'Not started', 'RTI-07': 'Not started',
  'RTI-09': 'Regulatory review', 'GP-03': 'Not started', 'GP-04': 'Not started',
  'GP-05': 'Not started', 'GP-06': 'Regulatory review', 'GP-08': 'Regulatory review',
  'GP-09': 'Regulatory review', 'AX-03': 'Nothing reads a document', 'AX-05': 'Not started',
  'AX-06': 'Not started', 'AX-07': 'Not started'
};

/* What an operation ultimately reads. Derived from src/greenmeadows/adapter.js and the mock. */
const MODEL_PATHS = new Set(['/meetings/{meetingId}/record/summary', '/meetings/{meetingId}/agenda',
  '/communications/{communicationId}/redraft', '/queries', '/ai/status']);
const PLATFORM_PREFIX = ['/tasks', '/communications', '/prospects', '/onboarding', '/playbooks',
  '/team-shares', '/migrations', '/firm/cap-table', '/firm/branding', '/next-actions', '/reports',
  '/session', '/firm/billing', '/me/preferences', '/me/meeting-requests', '/me/shared'];

function sourcesFor(p) {
  const out = [];
  if (p.startsWith('/households') || p === '/summary' || p === '/portfolio-signals'
      || p.startsWith('/portfolio-signals') || p === '/alerts' || p === '/billing/fees'
      || p === '/me/household' || p.startsWith('/me/documents') || p === '/me/fees'
      || p === '/models') out.push('Green Meadows');
  if (p.startsWith('/meetings')) out.push('Calendar');
  if (MODEL_PATHS.has(p)) out.push('Model');
  if (!out.length || PLATFORM_PREFIX.some(x => p.startsWith(x))) out.push('Platform');
  return [...new Set(out)];
}

const spec = parseYaml(fs.readFileSync(path.join(ROOT, 'openapi.yaml'), 'utf8'));

/** feature id -> the operations whose description names it */
const byFeature = new Map();
let tagged = 0, total = 0;
for (const [p, item] of Object.entries(spec.paths || {})) {
  for (const method of ['get', 'post', 'patch', 'put', 'delete']) {
    const op = item?.[method];
    if (!op) continue;
    total++;
    const text = `${op.description || ''} ${op.summary || ''}`;
    const ids = [...new Set(text.match(/\b(?:IP|MEET|COMM|PO|PM|PL|RTI|GP|AX)-\d{2}\b/g) || [])];
    if (ids.length) tagged++;
    for (const id of ids) {
      if (!byFeature.has(id)) byFeature.set(id, { ops: new Set(), sources: new Set() });
      byFeature.get(id).ops.add(`${method.toUpperCase()} ${p}`);
      sourcesFor(p).forEach(s => byFeature.get(id).sources.add(s));
    }
  }
}

const lines = [];
const allIds = GROUPS.flatMap(([, pre, n]) => Array.from({ length: n }, (_, i) => `${pre}-${String(i + 1).padStart(2, '0')}`));
const mapped = allIds.filter(id => byFeature.has(id)).length;

lines.push('| | Count |', '| --- | --- |',
  `| Features with at least one API operation | **${mapped}** of ${allIds.length} |`,
  `| Features with no operation yet | **${allIds.length - mapped}** |`,
  `| Operations carrying a requirement ID | **${tagged}** of ${total} |`);

for (const [title, pre, n] of GROUPS) {
  lines.push('', `### ${title}`, '', '| Feature | API operation | Source |', '| --- | --- | --- |');
  for (let i = 1; i <= n; i++) {
    const id = `${pre}-${String(i).padStart(2, '0')}`;
    const hit = byFeature.get(id);
    const ops = hit ? [...hit.ops].sort().map(o => '`' + o + '`').join('<br>')
      : `— *${BLOCKED[id] || 'Not started'}*`;
    const src = hit ? [...hit.sources].sort().join(', ') : '—';
    lines.push(`| **${id}** ${NAMES[id]} | ${ops} | ${src} |`);
  }
}

const doc = fs.readFileSync(DOC, 'utf8');
const a = doc.indexOf(START), b = doc.indexOf(END);
if (a < 0 || b < 0) {
  console.error(`docs/feature-api-map.md is missing the ${START} / ${END} markers.`);
  process.exit(1);
}
const next = doc.slice(0, a + START.length) + '\n\n' + lines.join('\n') + '\n\n' + doc.slice(b);

if (process.argv.includes('--check')) {
  if (next !== doc) {
    console.error('docs/feature-api-map.md is out of date with openapi.yaml. Run: npm run feature-map');
    process.exit(1);
  }
  console.log(`feature-api-map.md is up to date: ${mapped} of ${allIds.length} features mapped.`);
} else {
  fs.writeFileSync(DOC, next);
  console.log(`Wrote docs/feature-api-map.md: ${mapped} of ${allIds.length} features mapped, ${tagged} of ${total} operations tagged.`);
}
