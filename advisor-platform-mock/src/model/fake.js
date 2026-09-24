/*
 * The offline generator.
 *
 * It is deterministic and obviously not a model, which is deliberate: a fake that improvised
 * fluent prose would let the UI, the tests and the reviewer all forget that nothing is
 * actually reading anything. Everything it returns is built from the context it was handed.
 */

const bullet = (s) => '• ' + s;

export function fakeGenerate(capability, ctx = {}) {
  switch (capability) {
    case 'meeting_summary': return meetingSummary(ctx);
    case 'meeting_agenda': return meetingAgenda(ctx);
    case 'email_draft': return emailDraft(ctx);
    default: return 'No offline generator exists for ' + capability + '.';
  }
}

function meetingSummary({ householdName, type, content, capturedAt } = {}) {
  const sentences = String(content || '').split(/(?<=[.?!])\s+/).filter(Boolean);
  const first = sentences.slice(0, 2).join(' ');
  return [
    `${type || 'Meeting'} with ${householdName || 'the client'}${capturedAt ? ' on ' + String(capturedAt).slice(0, 10) : ''}.`,
    '',
    first || 'Nothing was captured for this meeting.',
    '',
    'Points raised:',
    ...sentences.slice(0, 4).map(s => bullet(s.trim())),
    '',
    'Written offline from the captured record. No model read this.'
  ].join('\n');
}

function meetingAgenda({ householdName, type, brief, signals = [], lastContact } = {}) {
  const items = [
    'Where things stand since we last spoke' + (lastContact ? ` (${lastContact})` : ''),
    ...signals.map(s => s.label),
    brief ? 'Follow up: ' + String(brief).split(/(?<=[.?!])\s/)[0] : null,
    'Anything on your mind we have not covered'
  ].filter(Boolean);
  return [
    `${type || 'Meeting'} — ${householdName || 'client'}`,
    '',
    ...items.map((t, i) => `${i + 1}. ${t}`),
    '',
    'Assembled offline from the prep brief and open signals. No model read this.'
  ].join('\n');
}

function emailDraft({ householdName, subject, tone, points = [] } = {}) {
  return [
    `Subject: ${subject || 'Following up'}`,
    '',
    `Dear ${householdName || 'client'},`,
    '',
    ...(points.length ? points.map(p => p + '.') : ['Following up on our last conversation.']),
    '',
    'Do let me know if a call would be easier.',
    '',
    'Kind regards',
    '',
    `Assembled offline in a ${tone || 'neutral'} register. No model wrote this.`
  ].join('\n');
}
