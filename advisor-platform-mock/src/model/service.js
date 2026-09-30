/*
 * The capability layer: what the platform can ask a model for.
 *
 * Every function returns a DRAFT with its provenance attached — which model, which prompt
 * version, what it was given to read, and whether a model was involved at all. Nothing here
 * writes to a record, sends anything, or creates a task. The advisor does that (X-03).
 */
import { generate, modelStatus } from './client.js';
import { PROMPTS } from './prompts.js';

async function run(capability, context) {
  const p = PROMPTS[capability];
  if (!p) throw new Error('No prompt for capability: ' + capability);
  /* The system prompt is a function of the language rather than a fixed string: the language
     rule has to sit inside the instructions the model is given, not be appended to the user
     turn, or it competes with the house rules instead of governing them. */
  const language = context.language || 'en';
  const out = await generate({
    capability, system: p.system(language), prompt: p.user(context),
    effort: p.effort, fallbackContext: context
  });
  return {
    capability,
    draft: out.text,
    // Always false. A draft becomes real when an advisor accepts it, never here.
    accepted: false,
    refused: Boolean(out.refused),
    refusalCategory: out.refusalCategory ?? null,
    provenance: {
      model: out.model,
      live: out.live,
      promptVersion: p.version,
      language,
      generatedAt: out.generatedAt,
      readFrom: context.readFrom || []
    }
  };
}

/* SimGPT returns two blocks in one completion, so it is split here rather than asked for twice:
   a second round trip to get the coaching note would double the cost and the wait, and let the
   note drift from the turn it is about. A reply that does not come back in the expected shape
   degrades to a client turn with no note rather than showing the adviser a parsing failure. */
export async function rehearseMeeting(ctx) {
  const out = await run('meeting_rehearsal', ctx);
  const text = out.draft || '';
  const m = /CLIENT:\s*([\s\S]*?)(?:\n\s*COACH:\s*([\s\S]*))?$/i.exec(text.trim());
  const { draft, capability, ...rest } = out;
  return {
    capability: 'meeting_rehearsal',
    scene: ctx.scene || null,
    client: out.refused ? null : ((m && m[1] ? m[1] : text).trim() || null),
    /* No note on the opening turn. There is nothing yet to observe, and a coach that comments on
       a turn the adviser has not taken is the tell that nothing is really being read. */
    coaching: out.refused || !ctx.said ? null : ((m && m[2] ? m[2].trim() : null) || null),
    ...rest
  };
}

export const summariseMeeting = (ctx) => run('meeting_summary', ctx);
export const draftAgenda = (ctx) => run('meeting_agenda', ctx);
export const draftEmail = (ctx) => run('email_draft', ctx);
/* aRCHi. It drafts the covering note and nothing else: choosing the article is the advisor's,
   the article itself is the firm's, and sending it is an action no capability here may take. */
export const draftArticleNote = (ctx) => run('article_note', ctx);
export { modelStatus };
