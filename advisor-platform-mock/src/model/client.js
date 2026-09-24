/*
 * The one place that talks to a model.
 *
 * The project runs with nothing installed, and that stays true: the Anthropic SDK is loaded
 * with a dynamic import and is optional. With no SDK and no key, every capability falls back
 * to ./fake.js, which is deterministic and offline. So:
 *
 *   node server.js                                    works, fake model
 *   npm install @anthropic-ai/sdk + ANTHROPIC_API_KEY  works, real model
 *
 * The key never leaves this process. Nothing model-related is exposed to the browser: the
 * dashboard calls the platform's own endpoints, and the platform calls the model, exactly as
 * it does with Green Meadows.
 */
import { fakeGenerate } from './fake.js';

export const MODEL = 'claude-opus-5';

/** Loaded once, and only if it is actually installed. */
let sdkPromise = null;
async function loadSdk() {
  if (sdkPromise) return sdkPromise;
  sdkPromise = import('@anthropic-ai/sdk').then(m => m.default, () => null);
  return sdkPromise;
}

/* A seam for tests, mirroring the transport injection in src/greenmeadows/client.js.
   It lets the real request shape be asserted without a key and without a network call. */
let injected = null;
export function __injectClient(c) { injected = c; clientPromise = null; }

let clientPromise = null;
async function getClient() {
  if (injected) return injected;
  if (clientPromise) return clientPromise;
  clientPromise = (async () => {
    if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) return null;
    const Anthropic = await loadSdk();
    if (!Anthropic) return null;
    return new Anthropic();   // resolves the key from the environment itself
  })();
  return clientPromise;
}

/** What the platform can tell a user about where an answer came from. Never a credential. */
export async function modelStatus() {
  if (injected) return { live: true, model: MODEL, reason: null };
  const hasKey = Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
  const hasSdk = Boolean(await loadSdk());
  return {
    live: hasKey && hasSdk,
    model: hasKey && hasSdk ? MODEL : 'fake-model-v0',
    reason: hasKey && hasSdk ? null
      : !hasSdk ? 'The Anthropic SDK is not installed. Run: npm install @anthropic-ai/sdk'
      : 'No ANTHROPIC_API_KEY is set, so drafts are generated offline.'
  };
}

/**
 * One bounded generation. Returns the text plus what produced it, because every AI output in
 * this platform has to say what made it (X-04) and stays a draft until a human accepts it (X-03).
 *
 * @param {object} opts
 * @param {string} opts.system
 * @param {string} opts.prompt
 * @param {'low'|'medium'|'high'|'xhigh'|'max'} [opts.effort]
 * @param {string} opts.capability  Which capability asked, for the audit trail.
 * @param {object} [opts.fallbackContext] Passed to the offline generator when there is no model.
 * @returns {Promise<{ text: string, model: string, live: boolean, capability: string, generatedAt: string }>}
 */
export async function generate({ system, prompt, effort = 'medium', capability, fallbackContext }) {
  const client = await getClient();
  const generatedAt = new Date().toISOString();

  if (!client) {
    return { text: fakeGenerate(capability, fallbackContext), model: 'fake-model-v0',
      live: false, capability, generatedAt };
  }

  // max_tokens is generous on purpose: truncating a draft mid-sentence is the failure mode,
  // and an unused ceiling costs nothing.
  const res = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    system,
    thinking: { type: 'adaptive' },
    output_config: { effort },
    // Opus 5 can decline a request. Server-side fallback routes by refusal category rather
    // than failing the advisor's draft outright.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    messages: [{ role: 'user', content: prompt }]
  });

  if (res.stop_reason === 'refusal') {
    return { text: '', refused: true, refusalCategory: res.stop_details?.category ?? null,
      model: MODEL, live: true, capability, generatedAt };
  }

  const text = res.content.filter(b => b.type === 'text').map(b => b.text).join('').trim();
  return { text, model: MODEL, live: true, capability, generatedAt };
}
