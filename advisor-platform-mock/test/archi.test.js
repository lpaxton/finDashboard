/*
 * aRCHi — sending an approved article to a client (GP-06, GP-07, GP-10, TM-02, TM-07).
 *
 * The feature is small. What is not small is the claim it makes: that afterwards, the platform
 * can say which version of what went to whom, approved by whom, and that nothing reached a
 * client except through the one door. Every test here is a version of that claim.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMock } from '../src/mock-core.js';
import { draftArticleNote } from '../src/model/service.js';
import { PROMPTS } from '../src/model/prompts.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const spec = () => fs.readFileSync(path.join(__dirname, '..', 'openapi.yaml'), 'utf8');

const rig = () => {
  const mk = createMock();
  return { mk, call: (who, method, p, q, b) => mk.handle(method, p, q || {}, b || null, who) };
};
const share = (call, hh, body) => call('dana', 'POST', '/households/' + hh + '/shares', {}, body);
const sendArticle = (call, hh, id, extra = {}) =>
  share(call, hh, { type: 'article', sourceId: id, title: 'x', ...extra });

/* ---- the one door ---------------------------------------------------------------------- */

test('an article reaches a client through the share door and there is no other', () => {
  const s = spec();
  /* Any operation that hands back a SharedItem is a way into the client portal. There must be
     exactly one, and adding a second is the change this test exists to stop — not because a
     second one would be badly written, but because the client-safe boundary is the fact that
     there is one. Counted over the paths only: the schema section names the type again, and
     defining a shape is not opening a door. */
  const paths = s.slice(s.indexOf('\npaths:'), s.indexOf('\ncomponents:'));
  const doors = [...paths.matchAll(/schemas\/SharedItem'/g)].length;
  const lists = [...paths.matchAll(/schemas\/SharedItemList'/g)].length;
  assert.equal(doors, 1, 'exactly one operation may return a SharedItem');
  assert.equal(lists, 1, 'and exactly one operation may list them (the client portal)');
  // And the article routes are reads and a draft. None of them writes to a client.
  const articleOps = [...s.matchAll(/^  (\/articles[^\s:]*):\s*$/gm)].map(m => m[1]);
  assert.deepEqual(articleOps, ['/articles', '/articles/{articleId}', '/articles/{articleId}/note']);
});

test('the client portal can name an article when one arrives', () => {
  const { call } = rig();
  const sent = sendArticle(call, 'h3', 'ar1');
  assert.equal(sent.status, 201);
  const mine = call('grace', 'GET', '/me/shared').data.items;
  const it = mine.find(x => x.id === sent.data.id);
  assert.ok(it, 'the client must see what was shared with them');
  assert.equal(it.type, 'article');
  /* A type the portal cannot name renders as an empty label beside a real document. The
     advisor-facing list of offerable types and the label table are not the same thing, and this
     is the half that has to know every value the contract allows. */
  const fmt = fs.readFileSync(path.join(__dirname, '..', 'dashboard', 'js', 'format.js'), 'utf8');
  const table = /SHARE_TYPES = lookup\(\{([^}]*)\}/.exec(fmt)[1];
  const enumLine = /ShareType:[\s\S]*?enum: \[([^\]]+)\]/.exec(spec())[1];
  for (const v of enumLine.split(',').map(x => x.trim()))
    assert.match(table, new RegExp('\\b' + v + ':'), 'the portal cannot name share type: ' + v);
});

test('the advisor-facing summary does not travel to the client', () => {
  const { call } = rig();
  const a = call('dana', 'GET', '/articles', { topic: 'tax_loss_harvesting' }).data.items[0];
  sendArticle(call, 'h3', a.id);
  const it = call('grace', 'GET', '/me/shared').data.items[0];
  /* The summary is written for an advisor choosing between pieces ("where the proceeds go, and
     the rule that stops you buying the same thing straight back"). It is not client copy and
     has not been reviewed as client copy. */
  for (const v of Object.values(it)) assert.notEqual(v, a.summary);
});

/* ---- the state the library is actually for --------------------------------------------- */

test('an expired article cannot be sent, and the refusal files nothing', () => {
  const { call } = rig();
  const before = call('grace', 'GET', '/me/shared').data.items.length;
  const acts = call('dana', 'GET', '/activity', { size: 50 }).data.totalItems;

  const r = sendArticle(call, 'h1', 'ar5');
  assert.equal(r.status, 409);
  assert.equal(r.data.code, 'article_not_sendable');
  assert.equal(call('grace', 'GET', '/me/shared').data.items.length, before);
  // A refusal that still wrote an activity entry would read as though something had gone out.
  assert.equal(call('dana', 'GET', '/activity', { size: 50 }).data.totalItems, acts);
});

test('expiry is a rule the code applies, not a field somebody remembered to change', () => {
  const { call } = rig();
  /* ar5 is stored as approved with a date in the past. If expiry were read off the status
     field it would still be sendable, which is exactly how a stale tax article goes out. */
  const all = call('dana', 'GET', '/articles', { status: 'all', size: 50 }).data.items;
  const ar5 = all.find(a => a.id === 'ar5');
  assert.equal(ar5.status, 'expired');
  assert.equal(ar5.sendable, false);
  assert.ok(ar5.expiresAt < new Date().toISOString().slice(0, 10));
});

test('the picker cannot offer anything that cannot be sent', () => {
  const { call } = rig();
  const offered = call('dana', 'GET', '/articles', { size: 50 }).data.items;
  assert.ok(offered.length, 'there must be something to offer');
  for (const a of offered) {
    assert.equal(a.sendable, true, a.id + ' was offered but cannot be sent');
    assert.equal(a.status, 'approved');
  }
  // Every unsendable state is actually represented, or this test is passing on an empty set.
  const all = call('dana', 'GET', '/articles', { status: 'all', size: 50 }).data.items;
  const states = new Set(all.map(a => a.status));
  for (const st of ['in_review', 'expired', 'restricted'])
    assert.ok(states.has(st), 'the library needs an example of: ' + st);
});

test('the door checks the state itself rather than trusting the picker', () => {
  const { call } = rig();
  // Straight at the endpoint, past any UI: restricted and in-review are refused the same way.
  for (const [id, why] of [['ar7', 'restricted'], ['ar6', 'in review']]) {
    const r = sendArticle(call, 'h1', id);
    assert.equal(r.status, 409, id + ' must be refused');
    assert.match(r.data.message, new RegExp(why));
  }
});

test('the version on the share is stamped by the server, not sent by the caller', () => {
  const { call } = rig();
  const a = call('dana', 'GET', '/articles', { topic: 'concentration' }).data.items[0];
  const r = sendArticle(call, 'h1', a.id, { articleVersion: '99', version: '99' });
  assert.equal(r.status, 201);
  /* This is the field a regulator asks about, and the caller is the one party that could have
     it stale. It is read from the library at send time and never from the request — which is
     also what makes it a snapshot: revising the article later cannot rewrite what this client
     was given. */
  assert.equal(r.data.articleVersion, a.version);
  assert.equal(r.data.articleId, a.id);
  assert.ok(r.data.sharedBy, 'the share records who approved it');
});

test('an article is not sent in a language it was never published in', () => {
  const { call } = rig();
  const en = call('dana', 'GET', '/articles', { topic: 'idle_cash' }).data.items[0];
  assert.deepEqual(en.languages, ['en'], 'this fixture exists to be the untranslated one');

  const r = sendArticle(call, 'h3', en.id, { language: 'fr' });
  assert.equal(r.status, 409);
  assert.equal(r.data.code, 'article_not_translated');
  // And it is not offered on a French-language filter either, so the picker never gets there.
  const fr = call('dana', 'GET', '/articles', { language: 'fr', size: 50 }).data.items;
  assert.ok(!fr.some(a => a.id === en.id));
  // The share that does go records which language it was, because the client may read another.
  assert.equal(sendArticle(call, 'h3', en.id, { language: 'en' }).data.language, 'en');
});

test('a published article is served in its own words, never machine-translated', () => {
  const { call } = rig();
  assert.equal(call('dana', 'PATCH', '/settings', {}, { language: 'fr' }).status, 200);
  const fr = call('dana', 'GET', '/articles', { topic: 'tax_loss_harvesting' }).data.items[0];
  /* The French title is the one the firm published and approved. Running an approved article
     through the interface translator would produce a version nobody signed off, which is the
     whole reason this library exists rather than a folder of PDFs. */
  assert.match(fr.title, /perte/);
  const en = call('dana', 'GET', '/articles', { topic: 'idle_cash' }).data.items[0];
  // And one with no French falls back to the English rather than rendering empty.
  assert.match(en.title, /Cash/);
});

/* ---- the note (X-03, X-04, TM-07) ------------------------------------------------------- */

test('the covering note is told nothing about the household, on purpose', async () => {
  const { call } = rig();
  const r = call('dana', 'POST', '/articles/ar1/note', {}, { reason: 'losses worth harvesting' });
  assert.equal(r.async, 'draftArticleNote');
  /* The same note goes to several households at once. A context carrying one household's name
     or balance would put a figure into a note the others also receive — so the context does not
     carry them, and the prompt cannot reach for what it was not given. */
  const keys = Object.keys(r.context);
  for (const k of keys)
    assert.doesNotMatch(k, /household|aum|balance|holding|account|client/i,
      'the note context must not carry household data: ' + k);
  const rendered = PROMPTS.article_note.user(r.context);
  for (const name of ['Lindqvist', 'Okafor', 'Halvorsen'])
    assert.ok(!rendered.includes(name));
  assert.match(PROMPTS.article_note.system('en'), /told nothing about this client/);
});

test('the reason a note is built from carries no count and no figure', () => {
  const { call } = rig();
  const sigs = call('dana', 'GET', '/portfolio-signals').data.items;
  assert.ok(sigs.length >= 4);
  for (const sg of sigs) {
    /* `label` and `detail` describe the advisor's book — five households, $61,200 between them.
       The same note goes to all five, so a note opened with that sentence tells each of those
       clients about the other four. `topic` is the same signal with the arithmetic taken out,
       and it is the only half that may travel. */
    assert.ok(sg.topic, sg.kind + ' must have a sayable topic');
    assert.doesNotMatch(sg.topic, /\d/, 'a topic with a number in it is a tally: ' + sg.topic);
    assert.doesNotMatch(sg.topic, /household/i, 'a topic must not count households: ' + sg.topic);
  }
  // And the pair really are different, or this test is asserting nothing.
  const tlh = sigs.find(x => x.kind === 'tax_loss_harvesting');
  assert.match(tlh.label + ' ' + tlh.detail, /\d/);

  const r = call('dana', 'POST', '/articles/ar1/note', {}, { reason: tlh.topic });
  assert.doesNotMatch(PROMPTS.article_note.user(r.context), /\$[\d,]+/,
    'no figure may reach the prompt that writes client-facing copy');
});

test('the panel sends the topic to the note, never the row it is standing on', () => {
  /* The bug this was written after: the panel passed the signal row's own sentence through as
     the reason, and the offline draft came back "Sending it because 5 households have losses
     worth harvesting. About $61,200 in unrealised losses." Held here because the two strings sit
     side by side in the same object and the wrong one is one word away. */
  const src = fs.readFileSync(path.join(__dirname, '..', 'dashboard', 'js', 'archi.js'), 'utf8');
  assert.match(src, /reason: s\.subject/, 'the note is asked for against the topic');
  assert.doesNotMatch(src, /reason: s\.meaning/, 'the advisor-facing tally must not be sent');
});

test('drafting a note sends nothing and is not an action', async () => {
  const { call } = rig();
  const before = call('grace', 'GET', '/me/shared').data.items.length;
  const r = call('dana', 'POST', '/articles/ar1/note', {}, { reason: 'losses worth harvesting' });
  const out = await draftArticleNote(r.context);

  assert.equal(out.accepted, false, 'X-03: a draft is never accepted here');
  assert.ok(out.draft, 'and it does produce something to edit');
  // X-04: what produced it, from what, and when.
  assert.equal(out.provenance.promptVersion, 'article_note/v1');
  assert.ok(out.provenance.generatedAt);
  assert.deepEqual(out.provenance.readFrom.map(x => x.source), ['platform']);
  assert.equal(call('grace', 'GET', '/me/shared').data.items.length, before,
    'drafting must not put anything in front of a client');
});

/* ---- suggested reading, beside a message draft (GP-06, COMM-01) -------------------------- */

const suggest = (call, id) => call('dana', 'GET', '/communications/' + id + '/suggested-articles').data;

test('an article that answers the subject but cannot be sent is said so, not hidden', () => {
  const { call } = rig();
  /* cm1 is "Following up on your Roth conversion", and the one piece in the library about Roth
     conversions is expired. Dropping it silently leaves the advisor wondering why nothing
     matched the thing they are actually writing about; saying so lets them chase the review. */
  const r = suggest(call, 'cm1');
  const blocked = r.unavailable.find(x => x.id === 'ar5');
  assert.ok(blocked, 'the expired match must be reported, not dropped');
  assert.equal(blocked.status, 'expired');
  assert.equal(blocked.sendable, false);
  assert.equal(blocked.matchedOn, 'subject');
  assert.match(blocked.because, /Roth conversions/);
  // And it is nowhere near the sendable list, whatever the UI then does with it.
  assert.ok(!r.items.some(x => x.id === 'ar5'));
  for (const x of r.items) assert.equal(x.sendable, true);
});

test('a suggestion carries the reason it was made, and the reason is checkable', () => {
  const { call } = rig();
  /* Deterministic, so the reason is a claim the advisor can agree or disagree with at a glance.
     A model picking would need provenance for the choice and would still leave them no way to
     check it. */
  const subj = suggest(call, 'cm4').items.find(x => x.matchedOn === 'subject');
  assert.ok(subj, 'a subject-line match must be found for "Your tax-loss harvesting summary"');
  assert.match(subj.because, /subject line/i);

  const sig = suggest(call, 'cm2').items.find(x => x.matchedOn === 'signal');
  assert.ok(sig, 'a household with open signals must match on them');
  // It names the household, which is fine: this line is on the advisor's screen and goes nowhere.
  assert.match(sig.because, /Lindqvist/);
  assert.ok(sig.topics.some(t2 => ['concentration', 'tax_loss_harvesting', 'allocation_drift', 'idle_cash'].includes(t2)));
});

test('the phrase a note is built from stays free of counts and figures here too', () => {
  const { call } = rig();
  for (const id of ['cm1', 'cm2', 'cm4']) {
    const r = suggest(call, id);
    for (const x of [...r.items, ...r.unavailable]) {
      if (x.topic === null) { assert.equal(x.matchedOn, 'subject'); continue; }
      /* Same field and same rule as Signal.topic. Null is allowed and is the honest answer for
         a subject-line match: there is no tally-free phrase, and inventing one is the failure
         this whole feature is arranged around. */
      assert.doesNotMatch(x.topic, /\d/, id + ' suggested a topic with a number in it: ' + x.topic);
      assert.doesNotMatch(x.topic, /household/i);
    }
  }
});

test('the subject is matched and the body is not', () => {
  const { call } = rig();
  const words = 'tax-loss harvesting';
  /* cm3 goes to a household with no open signals and says nothing the library covers, so it
     starts empty and anything appearing later came from the text this test put there. */
  const none = suggest(call, 'cm3');
  assert.deepEqual([none.items.length, none.unavailable.length], [0, 0]);

  /* In the body: still nothing. The body wanders — cm2's mentions a capital gain while the
     message is about concentration — and a suggestion drawn from a sentence the advisor has
     half rewritten is one they cannot place. */
  assert.equal(call('dana', 'PATCH', '/communications/cm3', {}, { body: 'Some thoughts on ' + words + ' for you.' }).status, 200);
  assert.deepEqual(suggest(call, 'cm3').items, [], 'the body must not be read');

  // In the subject: found, and it says which line it read.
  assert.equal(call('dana', 'PATCH', '/communications/cm3', {}, { subject: 'Your ' + words + ' summary' }).status, 200);
  const hit = suggest(call, 'cm3').items;
  assert.equal(hit.length, 1, 'the subject must be read');
  assert.equal(hit[0].matchedOn, 'subject');
});

test('a topic too short to mean anything does not match every message', () => {
  const { call } = rig();
  /* `tax` is a topic id on the Roth piece. Left in the match it would fire on any subject with
     "tax" in it, which is most of them, and a suggestion that always fires says nothing. Words
     of three letters or fewer are dropped, so a topic made only of them cannot match at all. */
  assert.equal(call('dana', 'PATCH', '/communications/cm3', {}, { subject: 'A note about tax' }).status, 200);
  assert.deepEqual(suggest(call, 'cm3').items, []);
  assert.deepEqual(suggest(call, 'cm3').unavailable, []);
});

test('suggesting sends nothing, and is bound to the advisor whose message it is', () => {
  const { call } = rig();
  const before = call('grace', 'GET', '/me/shared').data.items.length;
  suggest(call, 'cm1');
  assert.equal(call('grace', 'GET', '/me/shared').data.items.length, before);
  // cm6 is Marcus's. Dana is not told it exists.
  assert.equal(call('dana', 'GET', '/communications/cm6/suggested-articles').status, 404);
  assert.equal(call('grace', 'GET', '/communications/cm1/suggested-articles').status, 403);
});

test('the strip opens the one send path rather than a second one', () => {
  /* The temptation here is an attach: one Approve that sends the message and the article
     together. That would be one press standing for two things reaching a client under two
     different approvals, which is what X-03 is about — so the strip opens the same panel the
     portfolio signals open, and the send sheet still says nothing is attached. */
  const src = fs.readFileSync(path.join(__dirname, '..', 'dashboard', 'js', 'advisor.js'), 'utf8');
  const strip = src.slice(src.indexOf('async function suggestReading'), src.indexOf('function markSent'));
  assert.match(strip, /openArchi\(\{/, 'the strip must reach the send through the aRCHi panel');
  assert.doesNotMatch(strip, /\/shares/, 'the strip must not share anything itself');
  // And approving the message must not have grown an article step.
  const approve = src.slice(src.indexOf("const move = async (status, said)"), src.indexOf("const ap = $('cmApprove')"));
  assert.doesNotMatch(approve, /article|shares/i, 'approving a message must not send an article');
});

/* ---- the review queue (COMM-03) --------------------------------------------------------- */

test('an article waiting on review joins the queue that exists rather than a new one', () => {
  const { call } = rig();
  const q = call('dana', 'GET', '/firm/compliance', { size: 50 }).data.items;
  const mine = q.filter(c => c.category === 'content_review');
  assert.equal(mine.length, 1, 'the in-review article must be waiting somewhere a principal looks');
  assert.match(mine[0].title, /quarterly statement/);

  /* Derived from the library, so an article put into review cannot fail to appear. The count
     has to agree with what the library says is in review, both ways. */
  const inReview = call('dana', 'GET', '/articles', { status: 'in_review', size: 50 }).data.items;
  assert.equal(mine.length, inReview.length);
  // And there is no second review queue in the contract for articles to have gone to instead.
  assert.doesNotMatch(spec(), /\/articles\/[^\n]*\/(review|approval)/);
});

test('the library is read by the two roles that need it, and by nobody else', () => {
  const { call } = rig();
  assert.equal(call('dana', 'GET', '/articles').status, 200);
  assert.equal(call('marcus', 'GET', '/articles').status, 200);
  /* A client has no business reading the shelf. They see what was chosen for them, at
     /me/shared, and the difference between those two is the product. */
  assert.equal(call('grace', 'GET', '/articles').status, 403);
  assert.equal(call('grace', 'GET', '/articles/ar1').status, 403);
  assert.equal(call('grace', 'POST', '/articles/ar1/note', {}, { reason: 'x' }).status, 403);
});

test('an advisor cannot send to a household that is not theirs', () => {
  const { call } = rig();
  // h1 is Dana's. Marcus asking is not a 403 but a 404: he is not told it exists.
  const r = call('marcus', 'POST', '/households/h1/shares', {},
    { type: 'article', sourceId: 'ar1', title: 'x' });
  assert.equal(r.status, 404);
});
