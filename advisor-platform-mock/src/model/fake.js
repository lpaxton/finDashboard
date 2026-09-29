/*
 * The offline generator.
 *
 * It is deterministic and obviously not a model, which is deliberate: a fake that improvised
 * fluent prose would let the UI, the tests and the reviewer all forget that nothing is
 * actually reading anything. Everything it returns is built from the context it was handed.
 */

const bullet = (s) => '• ' + s;

/* The offline generator writes in the reader's language too (AX-12). Not out of completeness:
   an adviser reading a French interface who presses Summarise and gets English back has no way
   to tell whether the model is offline or the translation is broken. The phrasing is
   deliberately plain and slightly stiff in both languages — this is scaffolding, and it should
   read as scaffolding rather than as something a model produced. */
const W = {
  en: {
    meeting: 'Meeting', client: 'the client', on: ' on ', nothing: 'Nothing was captured for this meeting.',
    points: 'Points raised:', offlineSummary: 'Written offline from the captured record. No model read this.',
    since: 'Where things stand since we last spoke', followUp: 'Follow up: ',
    anything: 'Anything on your mind we have not covered',
    offlineAgenda: 'Assembled offline from the prep brief and open signals. No model read this.',
    dear: 'Dear ', clientWord: 'client', following: 'Following up on our last conversation.',
    call: 'Do let me know if a call would be easier.', regards: 'Kind regards',
    offlineEmail: (tone) => `Assembled offline in a ${tone} register. No model wrote this.`,
    neutral: 'neutral', none: 'No offline generator exists for '
  },
  fr: {
    meeting: 'Rendez-vous', client: 'le client', on: ' du ', nothing: 'Rien n’a été consigné pour ce rendez-vous.',
    points: 'Points abordés :', offlineSummary: 'Rédigé hors ligne à partir du compte rendu. Aucun modèle ne l’a lu.',
    since: 'Point de situation depuis notre dernier échange', followUp: 'À suivre : ',
    anything: 'Tout autre sujet que vous souhaitez aborder',
    offlineAgenda: 'Constitué hors ligne à partir de la note de préparation et des signaux ouverts. Aucun modèle ne l’a lu.',
    dear: 'Bonjour ', clientWord: 'cher client', following: 'Pour faire suite à notre dernier échange.',
    call: 'N’hésitez pas à me dire si un appel vous conviendrait mieux.', regards: 'Bien cordialement',
    offlineEmail: (tone) => `Constitué hors ligne sur un ton ${tone}. Aucun modèle ne l’a rédigé.`,
    neutral: 'neutre', none: 'Aucun générateur hors ligne n’existe pour '
  }
};
const words = (ctx) => W[ctx && ctx.language] || W.en;

export function fakeGenerate(capability, ctx = {}) {
  switch (capability) {
    case 'meeting_summary': return meetingSummary(ctx);
    case 'meeting_agenda': return meetingAgenda(ctx);
    case 'email_draft': return emailDraft(ctx);
    default: return words(ctx).none + capability + '.';
  }
}

function meetingSummary(ctx = {}) {
  const { householdName, type, content, capturedAt } = ctx;
  const w = words(ctx);
  const sentences = String(content || '').split(/(?<=[.?!])\s+/).filter(Boolean);
  const first = sentences.slice(0, 2).join(' ');
  return [
    `${type || w.meeting} — ${householdName || w.client}${capturedAt ? w.on + String(capturedAt).slice(0, 10) : ''}.`,
    '',
    first || w.nothing,
    '',
    w.points,
    ...sentences.slice(0, 4).map(s => bullet(s.trim())),
    '',
    w.offlineSummary
  ].join('\n');
}

function meetingAgenda(ctx = {}) {
  const { householdName, type, brief, signals = [], lastContact } = ctx;
  const w = words(ctx);
  const items = [
    w.since + (lastContact ? ` (${lastContact})` : ''),
    ...signals.map(s => s.label),
    brief ? w.followUp + String(brief).split(/(?<=[.?!])\s/)[0] : null,
    w.anything
  ].filter(Boolean);
  return [
    `${type || w.meeting} — ${householdName || w.clientWord}`,
    '',
    ...items.map((x, i) => `${i + 1}. ${x}`),
    '',
    w.offlineAgenda
  ].join('\n');
}

/* No "Subject:" line: the subject is its own field in the draft frame, and repeating it inside
   the body showed up as a duplicate the moment the message was drawn as it will arrive
   (UX_RULES TR-02). */
function emailDraft(ctx = {}) {
  const { householdName, tone, points = [] } = ctx;
  const w = words(ctx);
  return [
    `${w.dear}${householdName || w.clientWord},`,
    '',
    ...(points.length ? points.map(p => p + '.') : [w.following]),
    '',
    w.call,
    '',
    w.regards,
    '',
    w.offlineEmail(tone || w.neutral)
  ].join('\n');
}
