/*
 * The model layer. Two things are being checked: that the platform still works with no model
 * at all, and that when one is wired the request is the shape the API expects.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { __injectClient, MODEL } from '../src/model/client.js';
import { summariseMeeting, draftAgenda, draftEmail, modelStatus } from '../src/model/service.js';
import { fakeGenerate } from '../src/model/fake.js';
import { PROMPTS } from '../src/model/prompts.js';

const withStub = async (reply, fn) => {
  const sent = [];
  __injectClient({ beta: { messages: { create: async (req) => { sent.push(req); return reply; } } } });
  try { return { sent, result: await fn() }; } finally { __injectClient(null); }
};
const ok = { content: [{ type: 'text', text: 'A draft.' }], stop_reason: 'end_turn' };

test('with no model, drafting still works and says it is offline', async () => {
  const st = await modelStatus();
  assert.equal(st.live, false);
  assert.ok(st.reason, 'it must say why there is no model');
  const r = await summariseMeeting({ householdName: 'Okafor household', type: 'Annual review',
    content: 'Cash is above target. A Roth conversion is open.' });
  assert.ok(r.draft.length > 0, 'the platform must not stop working without a model');
  assert.equal(r.provenance.live, false);
  assert.match(r.draft, /No model read this/, 'an offline draft must say so in its own text');
});

test('a draft is never accepted, whatever produced it', async () => {
  const offline = await draftEmail({ householdName: 'x', tone: 'Formal', subject: 'y' });
  assert.equal(offline.accepted, false);
  const { result } = await withStub(ok, () => draftEmail({ householdName: 'x', tone: 'Formal', subject: 'y' }));
  assert.equal(result.accepted, false, 'a live model does not change the human-in-the-loop rule');
});

test('the request is the shape the Messages API expects', async () => {
  const { sent } = await withStub(ok, () => summariseMeeting({ householdName: 'x', content: 'y' }));
  const r = sent[0];
  assert.equal(r.model, MODEL);
  assert.equal(r.model, 'claude-opus-5');
  assert.deepEqual(r.thinking, { type: 'adaptive' }, 'adaptive thinking, not a token budget');
  assert.equal(r.budget_tokens, undefined, 'budget_tokens is rejected on this model');
  assert.ok(r.max_tokens >= 16000, 'a truncated draft is the failure mode worth avoiding');
  assert.ok(r.output_config && r.output_config.effort);
  assert.deepEqual(r.betas, ['server-side-fallback-2026-07-01']);
  assert.equal(r.fallbacks, 'default');
  assert.equal(r.messages.length, 1);
  assert.equal(r.messages[0].role, 'user');
  assert.ok(!r.messages.some(m => m.role === 'assistant'), 'prefill is rejected on this model');
});

test('every draft carries what produced it and what it read', async () => {
  const readFrom = [{ source: 'greenmeadows', id: 'h3', label: 'Positions' }];
  const { result } = await withStub(ok, () => draftAgenda({ householdName: 'Okafor', readFrom }));
  assert.equal(result.provenance.model, MODEL);
  assert.equal(result.provenance.promptVersion, PROMPTS.meeting_agenda.version);
  assert.ok(result.provenance.generatedAt);
  assert.deepEqual(result.provenance.readFrom, readFrom, 'X-04: an output must name its sources');
});

test('a refusal is reported, not passed off as a draft', async () => {
  const { result } = await withStub(
    { content: [], stop_reason: 'refusal', stop_details: { type: 'refusal', category: 'cyber' } },
    () => draftEmail({ householdName: 'x', tone: 'Brief', subject: 'y' }));
  assert.equal(result.refused, true);
  assert.equal(result.refusalCategory, 'cyber');
  assert.equal(result.draft, '', 'a refusal must not surface as empty-looking prose');
});

test('the prompts forbid inventing facts, and the tone reaches the model', async () => {
  // system is now a function of the language (AX-12); the house rules must hold in every one.
  for (const [name, p] of Object.entries(PROMPTS)) {
    for (const lang of ['en', 'fr']) {
      const sys = p.system(lang);
      assert.match(sys, /Use only the facts in the CONTEXT block/, name + '/' + lang + ' must forbid invention');
      assert.match(sys, /draft/i, name + '/' + lang + ' must say the output is a draft');
    }
    assert.ok(p.version.includes('/v'), name + ' must be versioned for the audit trail');
  }
  const { sent } = await withStub(ok, () => draftEmail({ householdName: 'x', tone: 'Formal', subject: 'y' }));
  assert.match(sent[0].messages[0].content, /Tone: Formal/);
});

/* A French interface that produces English drafts has only been half translated (AX-12). The
   language has to reach the model as an instruction, not as a hope. */
test('the reader\'s language reaches the model, and governs the draft', async () => {
  const fr = await withStub(ok, () => draftEmail({ householdName: 'x', tone: 'Brief', subject: 'y', language: 'fr' }));
  assert.match(fr.sent[0].system, /French/, 'the French rule must be in the system prompt');
  assert.match(fr.sent[0].system, /vouvoiement/, 'and must set the register, which a model will otherwise pick for itself');
  assert.equal(fr.result.provenance.language, 'fr', 'the audit trail must record which language was asked for');

  const en = await withStub(ok, () => draftEmail({ householdName: 'x', tone: 'Brief', subject: 'y' }));
  assert.match(en.sent[0].system, /British English/, 'no language means English, not nothing');
  assert.equal(en.result.provenance.language, 'en');

  // The language rule leads, because it governs everything after it.
  assert.ok(fr.sent[0].system.indexOf('French') < fr.sent[0].system.indexOf('CONTEXT'),
    'the language rule must come before the house rules it governs');

  // And offline, where there is no model at all, the scaffolding is in the right language too —
  // otherwise an adviser cannot tell a broken translation from a disconnected model.
  const offline = fakeGenerate('email_draft', { householdName: 'Foyer Dupont', language: 'fr' });
  assert.match(offline, /Bonjour/);
  assert.doesNotMatch(offline, /Kind regards/);
});

test('no credential can reach a caller', async () => {
  const st = await modelStatus();
  assert.doesNotMatch(JSON.stringify(st), /sk-ant|api[-_]?key["']?\s*:\s*["'][^"']+/i);
  const r = await draftEmail({ householdName: 'x', tone: 'Brief', subject: 'y' });
  assert.doesNotMatch(JSON.stringify(r), /sk-ant/);
});
