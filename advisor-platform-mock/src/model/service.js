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

export const summariseMeeting = (ctx) => run('meeting_summary', ctx);
export const draftAgenda = (ctx) => run('meeting_agenda', ctx);
export const draftEmail = (ctx) => run('email_draft', ctx);
export { modelStatus };
