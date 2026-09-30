/*
 * SimGPT — rehearsing a conversation before having it (AX-05, AX-06, AX-07).
 *
 * The whole feature rests on one worry: an adviser walks out of a rehearsal believing something
 * a real client never said. Every test here is a version of that worry.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMock } from '../src/mock-core.js';
import { __injectClient } from '../src/model/client.js';
import { rehearseMeeting } from '../src/model/service.js';
import { PROMPTS } from '../src/model/prompts.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* The mock describes the work and the server awaits the model, so a test has to do both. */
const rig = () => {
  const mk = createMock();
  return {
    mk,
    turn: async (body, who = 'dana', id = 'm2') => {
      const r = mk.handle('POST', `/meetings/${id}/rehearsal`, {}, body, who);
      if (!r.async) return r;
      return { status: 200, data: await rehearseMeeting(r.context) };
    }
  };
};
const stub = async (text, fn) => {
  __injectClient({ beta: { messages: { create: async () => ({ content: [{ type: 'text', text }], stop_reason: 'end_turn' }) } } });
  try { return await fn(); } finally { __injectClient(null); }
};

test('a rehearsal creates nothing and is filed nowhere', async () => {
  const { mk, turn } = rig();
  const before = {
    tasks: mk.handle('GET', '/tasks', {}, null, 'dana').data.totalItems,
    comms: mk.handle('GET', '/communications', {}, null, 'dana').data.totalItems,
    activity: mk.handle('GET', '/activity', {}, null, 'dana').data.totalItems
  };

  const open = await turn({ said: '' });
  const reply = await turn({ said: 'The portfolio is up 4.2%.', exchange: [{ who: 'client', text: open.data.client || 'x' }] });
  assert.equal(reply.data.accepted, false, 'X-03: a rehearsal is never an action');

  assert.equal(mk.handle('GET', '/tasks', {}, null, 'dana').data.totalItems, before.tasks);
  assert.equal(mk.handle('GET', '/communications', {}, null, 'dana').data.totalItems, before.comms);
  // Not even in the activity log. Practice is not something that happened to the client, and an
  // entry saying the adviser rehearsed talking to them would read as though it were.
  assert.equal(mk.handle('GET', '/activity', {}, null, 'dana').data.totalItems, before.activity,
    'rehearsing must not appear in the activity log');
});

test('the server keeps no rehearsal, so the same turn twice gives the same answer', async () => {
  // The exchange travels with the request. If the server accumulated it, a transcript of a
  // conversation the client never had would exist on the platform — which is the thing this
  // feature must not produce.
  const { turn } = rig();
  const a = await turn({ said: 'Hello.', exchange: [] });
  const b = await turn({ said: 'Hello.', exchange: [] });
  assert.equal(a.data.client, b.data.client, 'no hidden state between calls');
  const core = fs.readFileSync(path.join(__dirname, '..', 'src', 'mock-core.js'), 'utf8');
  const route = core.slice(core.indexOf("rehearsal$/"), core.indexOf("rehearsal$/") + 2200);
  assert.doesNotMatch(route, /REHEARSALS|\.push\(|\.unshift\(/, 'the route must store nothing');
});

test('the opening turn sets a scene and says nothing about a turn not yet taken', async () => {
  const { turn } = rig();
  const open = await turn({ said: '' });
  assert.ok(open.data.scene, 'opening must return the scene');
  assert.equal(open.data.coaching, null, 'there is nothing yet to coach');
  // The scene is the record, not the model: it names the meeting, the household and the gap.
  assert.match(open.data.scene, /Portfolio check-in/);
  assert.match(open.data.scene, /Lindqvist Family Trust/);
  assert.match(open.data.scene, /Last contact/);
});

test('the scene is composed by the platform, never by the model', async () => {
  // A model that wrote the scene could invent the household's circumstances before the adviser
  // has said a word — the worst possible place for an invention, because it reads as briefing.
  const { turn } = rig();
  const open = await stub('CLIENT: something else entirely\nCOACH: and this', () => turn({ said: '' }));
  assert.match(open.data.scene, /Lindqvist Family Trust/, 'the scene survives whatever the model says');
});

test('the client turn and the coaching note are pulled apart, and a malformed reply still works', async () => {
  const { turn } = rig();
  const good = await stub('CLIENT: I would want to understand the tax first.\nCOACH: You led with a number and left the worry unanswered.',
    () => turn({ said: 'Up 4.2%.', exchange: [] }));
  assert.equal(good.data.client, 'I would want to understand the tax first.');
  assert.equal(good.data.coaching, 'You led with a number and left the worry unanswered.');

  // A reply in the wrong shape degrades to a client turn rather than showing a parsing failure.
  const odd = await stub('I would want to understand the tax first.', () => turn({ said: 'Up 4.2%.', exchange: [] }));
  assert.equal(odd.data.client, 'I would want to understand the tax first.');
  assert.equal(odd.data.coaching, null);
});

test('the prompt forbids the simulated client inventing a circumstance', async () => {
  // The single most important line in the feature. An invented figure or family member is not a
  // wrong answer, it is a false belief about a real person planted in the adviser's head.
  for (const lang of ['en', 'fr']) {
    const sys = PROMPTS.meeting_rehearsal.system(lang);
    assert.match(sys, /may not invent/i, 'the invention ban must be explicit');
    assert.match(sys, /CONTEXT block is everything known/i, 'and must name the context as the only source');
    assert.match(sys, /I'd have to check|haven't talked about that/i, 'and must say what to do instead of filling the gap');
  }
});

test('a rehearsal is bound to the adviser whose meeting it is', async () => {
  const { turn } = rig();
  assert.equal((await turn({ said: '' }, 'marcus')).status, 404, "another adviser's meeting is not there");
  assert.equal((await turn({ said: '' }, 'grace')).status, 403, 'a client has no rehearsal');
  assert.equal((await turn({ notSaid: '' })).status, 400, 'the turn has to say what was said');
});

test('with no model connected the client still moves through the topics on file', async () => {
  // An offline rehearsal that repeated one line would be a broken button rather than practice,
  // and one that improvised would be the exact failure this feature exists to avoid.
  const { turn } = rig();
  const seen = [];
  let exchange = [];
  for (let i = 0; i < 3; i++) {
    const r = await turn({ said: 'And what about the rest?', exchange });
    seen.push(r.data.client);
    exchange = [...exchange, { who: 'adviser', text: 'And what about the rest?' }, { who: 'client', text: r.data.client }];
  }
  assert.equal(new Set(seen).size, seen.length, 'each turn raises a different thing on file');
  assert.ok(seen.every(Boolean));
});
