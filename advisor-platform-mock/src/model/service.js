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
  const out = await generate({
    capability, system: p.system, prompt: p.user(context),
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
      generatedAt: out.generatedAt,
      readFrom: context.readFrom || []
    }
  };
}

export const summariseMeeting = (ctx) => run('meeting_summary', ctx);
export const draftAgenda = (ctx) => run('meeting_agenda', ctx);
export const draftEmail = (ctx) => run('email_draft', ctx);
export { modelStatus };
