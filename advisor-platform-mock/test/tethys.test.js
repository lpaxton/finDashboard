/*
 * Tethys — the model library (PM-02, PM-03, PO-07).
 *
 * A model is the definition of what counts as drift for a household, so the thing worth
 * guarding is not the CRUD. It is that there is exactly one statement of what a model is, that
 * the two people who read it are shown their own book and not each other's, and that assigning
 * one is never mistaken for trading.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMock } from '../src/mock-core.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rig = () => {
  const mk = createMock();
  return { mk, call: (who, method, p, q, b) => mk.handle(method, p, q || {}, b || null, who) };
};
const GOOD = {
  name: 'Tax-aware balanced', description: 'Munis in place of taxable core.',
  riskLevel: 'Moderate', driftMethod: 'absolute', driftThresholdPct: 4, maxDriftPct: 9,
  rebalanceFrequency: 'quarterly', cooldownDays: 30,
  holdings: [{ ticker: 'VTI', weightPct: 40 }, { ticker: 'VXUS', weightPct: 20 },
    { ticker: 'MUB', weightPct: 35 }, { ticker: 'SGOV', weightPct: 5 }]
};

/* ---- one statement of what a model is --------------------------------------------------- */

const CLASSES = ['US equity', 'International equity', 'Fixed income', 'Cash', 'Alternatives'];

test('a model says what it holds once, and every asset-class weight is worked out from that', () => {
  const { call } = rig();
  /* The screens that came before Tethys were built on asset-class weights. Those are now
     derived from the holdings rather than written down beside them — a model stated twice is a
     model that can disagree with itself, and this one already had.

     Checked across every model rather than one: a single model would pass against a hard-coded
     array that happened to match it, which is exactly the failure being guarded. */
  const models = call('dana', 'GET', '/models', { scope: 'firm' }).data.items;
  assert.ok(models.length >= 4);
  const seen = new Set();
  for (const m of models) {
    const d = call('dana', 'GET', '/models/' + m.id, { scope: 'firm' }).data;
    const byClass = {};
    for (const h of d.holdings) byClass[h.assetClass] = +((byClass[h.assetClass] || 0) + h.weightPct).toFixed(2);
    assert.deepEqual(d.target, CLASSES.map(c => byClass[c] || 0), d.name + ' target must come off its holdings');
    assert.equal(+d.holdings.reduce((t, h) => t + h.weightPct, 0).toFixed(2), 100, d.name + ' must total 100%');
    assert.ok(d.maxDriftPct >= d.driftThresholdPct, d.name + ' max must not sit below its threshold');
    for (const h of d.holdings) assert.ok(h.assetClass, h.ticker + ' has no asset class, so no weight can be derived');
    seen.add(d.target.join(','));
  }
  assert.ok(seen.size > 1, 'the models must not all derive to the same target');
  // And Growth is still the model the comparison screen was built against.
  assert.deepEqual(call('dana', 'GET', '/models/mdl_growth').data.target, [45, 20, 25, 5, 5]);
});

test('a household is measured against its model, not against a target of its own', () => {
  const { call } = rig();
  /* The bug this replaced: h3 was on Growth 70/30 while carrying a target Growth 70/30 has
     never had, so the allocation screen and the model library described the same household
     differently. */
  const a = call('dana', 'GET', '/households/h3/allocation').data;
  const m = call('dana', 'GET', '/models/' + a.model.id).data;
  assert.deepEqual(a.lines.map(l => l.targetPct), m.target);
});

/* ---- whose screen is this ---------------------------------------------------------------- */

test('scope=firm is the supervisory view and the role alone cannot stand in for it', () => {
  const { call } = rig();
  /* Dana is a principal AND an advisor. Her role cannot say which of her two screens she is
     looking at, so the request has to — the same way it already does for households and
     communications. Deciding by role alone put a colleague's model on her own shelf. */
  const own = call('dana', 'GET', '/models').data.items;
  const firm = call('dana', 'GET', '/models', { scope: 'firm' }).data.items;
  assert.ok(firm.length > own.length, 'the firm view must be wider than her own shelf');
  assert.ok(!own.some(m => m.id === 'mdl_adv2_tilt'), "a colleague's model is not on her shelf");
  assert.ok(firm.some(m => m.id === 'mdl_adv2_tilt'), 'but supervising the firm shows it exists');

  // Usage is counted over whichever book was asked for, never over both.
  const g = (list) => list.find(m => m.id === 'mdl_growth').usage;
  assert.ok(g(firm).households > g(own).households);
  assert.equal(g(own).advisors, 1, "an advisor's own view counts only their own book");

  // And an advisor cannot reach the supervisory view by asking for it.
  assert.equal(call('marcus', 'GET', '/models', { scope: 'firm' }).status, 403);
  assert.equal(call('marcus', 'GET', '/models', { advisorId: 'adv1' }).status, 400);
});

test('an advisor sees their own model and no one else sees it', () => {
  const { call } = rig();
  const marcus = call('marcus', 'GET', '/models').data.items;
  const tilt = marcus.find(m => m.id === 'mdl_adv2_tilt');
  assert.ok(tilt, 'Marcus must see the model he built');
  assert.equal(tilt.visibility, 'advisor');
  assert.equal(tilt.ownerName, 'Marcus Bell');
  // Dana on her own shelf cannot read it, and cannot put a client on it either.
  assert.equal(call('dana', 'GET', '/models/mdl_adv2_tilt').status, 404);
  assert.equal(call('dana', 'PUT', '/households/h1/model', {}, { modelId: 'mdl_adv2_tilt' }).status, 400,
    'seeing a model while supervising is not permission to use it');
  // A client has no business in the library at all.
  assert.equal(call('grace', 'GET', '/models').status, 403);
});

test('an advisor is not handed a breakdown of their colleagues', () => {
  const { call } = rig();
  /* Null rather than an empty list: nothing to read here is a different statement from no
     colleagues using it, and the second is a claim about their books. */
  assert.equal(call('marcus', 'GET', '/models/mdl_growth').data.byAdvisor, null);
  assert.ok(Array.isArray(call('dana', 'GET', '/models/mdl_growth', { scope: 'firm' }).data.byAdvisor));
  for (const h of call('marcus', 'GET', '/models/mdl_growth').data.households)
    assert.equal(h.advisorName, 'Marcus Bell');
});

/* ---- creating one ------------------------------------------------------------------------ */

test('the scope of a new model follows the role, and is not asked for', () => {
  const { call } = rig();
  /* A field offering "publish to the firm" to an advisor is a control that fails on submit.
     Worse, a body that carried the scope would make it possible to answer wrongly. */
  const byPrincipal = call('dana', 'POST', '/models', {}, { ...GOOD, visibility: 'advisor' });
  assert.equal(byPrincipal.status, 201);
  assert.equal(byPrincipal.data.visibility, 'firm', 'a principal publishes, whatever the body said');
  assert.equal(byPrincipal.data.ownerAdvisorId, null);

  const byAdvisor = call('marcus', 'POST', '/models', {}, { ...GOOD, name: 'Mine', visibility: 'firm' });
  assert.equal(byAdvisor.status, 201);
  assert.equal(byAdvisor.data.visibility, 'advisor', 'an advisor cannot publish to the firm by asking');
  assert.equal(byAdvisor.data.ownerAdvisorId, 'adv2');

  // Published means every advisor really can reach it.
  assert.ok(call('marcus', 'GET', '/models').data.items.some(m => m.id === byPrincipal.data.id));
  // And the advisor's own really is not on anyone else's shelf.
  assert.ok(!call('dana', 'GET', '/models').data.items.some(m => m.id === byAdvisor.data.id));
});

test('holdings must total 100, and the backend is what says so', () => {
  const { call } = rig();
  const bad = (h, why) => {
    const r = call('dana', 'POST', '/models', {}, { ...GOOD, holdings: h });
    assert.equal(r.status, 400, why);
    return r.data.message;
  };
  /* The form runs a total and disables its button, but a form is not what the library rests on:
     a model at 98% is a target no household can ever be measured against correctly. */
  assert.match(bad([{ ticker: 'VTI', weightPct: 98 }], 'under 100 must be refused'), /100%/);
  assert.match(bad([{ ticker: 'VTI', weightPct: 60 }, { ticker: 'BND', weightPct: 60 }], 'over 100 must be refused'), /100%/);
  assert.match(bad([{ ticker: 'VTI', weightPct: 50 }, { ticker: 'VTI', weightPct: 50 }], 'the same holding twice'), /twice/);
  assert.match(bad([{ ticker: 'NOPE', weightPct: 100 }], 'an unmapped ticker'), /approved/);
  assert.match(bad([], 'a model with nothing in it'), /at least one/);
  // The one that would quietly produce a model nothing can breach.
  const r = call('dana', 'POST', '/models', {}, { ...GOOD, driftThresholdPct: 8, maxDriftPct: 3 });
  assert.equal(r.status, 400);
  assert.match(r.data.message, /below the drift threshold/);
});

test('a new model starts in use by nobody, and says so rather than looking clean', () => {
  const { call } = rig();
  const made = call('dana', 'POST', '/models', {}, GOOD).data;
  assert.deepEqual([made.usage.households, made.usage.aum, made.usage.outsideThreshold], [0, 0, 0]);
  /* Null, not zero. An average drift of 0 across nobody reads as a model whose households are
     all exactly on target, which is the most flattering possible lie about a new one. */
  assert.equal(made.usage.averageDriftPct, null);
});

/* ---- assigning one ----------------------------------------------------------------------- */

test('assigning a model moves the target, not the holdings', () => {
  const { call } = rig();
  const before = call('dana', 'GET', '/households/h1/allocation').data;
  const r = call('dana', 'PUT', '/households/h1/model', {}, { modelId: 'mdl_income' });
  assert.equal(r.status, 200);
  const after = r.data;

  assert.equal(after.model.id, 'mdl_income');
  /* Nothing was traded, so the current weights are exactly what they were. The gap changes
     because what it is a gap FROM has changed, and that is the honest thing to show. */
  assert.deepEqual(after.lines.map(l => l.currentPct), before.lines.map(l => l.currentPct));
  assert.notDeepEqual(after.lines.map(l => l.targetPct), before.lines.map(l => l.targetPct));
  assert.notEqual(after.maxDriftPoints, before.maxDriftPoints);

  // It is a fact about the household, so it is in the log, and it can be taken back.
  const act = call('dana', 'GET', '/activity', { size: 10 }).data.items[0];
  assert.match(act.summary, /Growth, 70\/30/);
  assert.match(act.summary, /Income/);
  assert.match(act.detail, /No trade has been placed/);
  assert.ok(act.undoable, 'putting a household back is the whole of the undo');
});

test('an advisor can only assign within their own book and their own shelf', () => {
  const { call } = rig();
  assert.equal(call('marcus', 'PUT', '/households/h1/model', {}, { modelId: 'mdl_growth' }).status, 404,
    'h1 is not Marcus’s household');
  assert.equal(call('dana', 'PUT', '/households/h1/model', {}, { modelId: 'nope' }).status, 400);
  assert.equal(call('grace', 'PUT', '/households/h3/model', {}, { modelId: 'mdl_growth' }).status, 403);
});

test('drift is measured the way the model says, and the unit travels with it', () => {
  const { call } = rig();
  const abs = call('dana', 'GET', '/models/mdl_growth', { scope: 'firm' }).data;
  const rel = call('dana', 'GET', '/models/mdl_conservative', { scope: 'firm' }).data;
  assert.equal(abs.driftMethod, 'absolute');
  assert.equal(rel.driftMethod, 'relative');

  /* The same household would report two different numbers under the two methods, which is why
     the screen never shows a bare figure: 6 points and 6% of target are not the same claim. */
  for (const m of [abs, rel]) {
    for (const h of m.households) {
      assert.equal(typeof h.driftPct, 'number');
      const want = h.driftPct > m.maxDriftPct ? 'over_max' : h.driftPct > m.driftThresholdPct ? 'over_threshold' : 'in_tolerance';
      assert.equal(h.state, want, m.name + ' / ' + h.householdName);
    }
    assert.equal(m.usage.outsideThreshold, m.households.filter(h => h.state !== 'in_tolerance').length);
    assert.equal(m.usage.outsideMax, m.households.filter(h => h.state === 'over_max').length);
  }
  // An absolute model measured in points agrees with the allocation screen, which is also points.
  const one = abs.households[0];
  assert.equal(call('dana', 'GET', '/households/' + one.householdId + '/allocation', { scope: 'firm' }).data.maxDriftPoints, one.driftPct);
});

test('the screen never shows a drift figure without saying what it is a figure of', () => {
  /* Two models can report "6" and mean different things. A bare number in this table is the
     bug: the unit has to be built in, not added by whoever writes the next row. */
  const src = fs.readFileSync(path.join(__dirname, '..', 'dashboard', 'js', 'tethys.js'), 'utf8');
  assert.match(src, /const driftWords = \(mdl, v\)/, 'one helper owns the wording');
  for (const field of ['averageDriftPct', 'driftThresholdPct', 'maxDriftPct', 'driftPct']) {
    const bare = new RegExp('\\$\\{[^}]*\\b' + field + '\\b[^}]*\\}');
    const inWords = new RegExp('driftWords\\([^)]*' + field);
    /* A form input is exempt, and only a form input: the value being edited has to be the bare
       number, and its unit is in the label above it ("Drift threshold (%)"). Everywhere the
       figure is being SHOWN rather than typed, it carries its unit. */
    const uses = src.split('\n').filter(l => l.includes(field) && !l.includes('<input'));
    for (const l of uses)
      assert.ok(inWords.test(l) || !bare.test(l), field + ' is rendered without its unit: ' + l.trim());
  }
});

test('a household still filling in forms is not on a model, and is not counted as if it were', () => {
  const { call } = rig();
  /* h7's forms are incomplete. A library that quietly put it on a model would report an
     allocation for a household that has not funded anything. */
  const none = call('dana', 'GET', '/households/h7/allocation').data;
  assert.equal(none.model, null);
  assert.deepEqual(none.lines, []);
  const onModels = call('dana', 'GET', '/models', { scope: 'firm' }).data.items
    .flatMap(m => call('dana', 'GET', '/models/' + m.id, { scope: 'firm' }).data.households.map(h => h.householdId));
  assert.ok(!onModels.includes('h7'));
  // Every household that IS counted is counted exactly once.
  assert.equal(new Set(onModels).size, onModels.length, 'a household cannot be on two models');
});
