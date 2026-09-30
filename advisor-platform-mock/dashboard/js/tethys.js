/*
 * Tethys: the model library (PM-02, PM-03, PO-07).
 *
 * A model is what a household's holdings are measured against, which makes it the definition of
 * what counts as drift for them. Two people need it and need different things from it:
 *
 *   a principal   what is in use across the firm, what it is doing, and the power to publish a
 *                 model every advisor can then reach for
 *   an advisor    a shelf to choose from, the ability to put a client on one, and their own
 *                 models for the households a firm model does not fit
 *
 * One module serves both, because the difference between the two screens is which book the
 * numbers are counted over — and that is the server's decision, not this file's. What differs
 * here is only what is offered: an advisor assigns, a principal publishes.
 */
import { api } from './api.js';
import { $, esc, money, moneyFull } from './format.js';
import { toast, head, panel, load } from './ui.js';
import { t, raw, locale } from './i18n.js';

/* Contract enums given words a person would use, read through t() at call time. */
const lookup = (o) => new Proxy(o, { get: (x, k) => (k in x ? t(x[k]) : undefined) });
export const DRIFT_METHOD = lookup({ absolute: 'Percentage points', relative: 'Share of the target', total: 'Whole portfolio' });
export const DRIFT_METHOD_HINT = lookup({
  absolute: 'A 40% target sitting at 45% has drifted 5.',
  relative: 'The same holding has drifted 12.5% of what it should be — so a small sleeve is not left alone just for being small.',
  total: 'Every deviation added up and halved: what a rebalance would actually turn over.'
});
export const REBALANCE = lookup({ monthly: 'Monthly', quarterly: 'Quarterly', semiannual: 'Twice a year', annual: 'Yearly', on_drift: 'Only when it drifts' });
export const RISK = lookup({ Conservative: 'Conservative', Moderate: 'Moderate', Aggressive: 'Aggressive' });
const STATE_BADGE = { in_tolerance: ['ok', 'In tolerance'], over_threshold: ['warn', 'Past the threshold'], over_max: ['crit', 'Past the maximum'] };

/* Every bare number on this screen goes through the locale. A French reader is shown 83,9 M$
   for money by format.js and would otherwise be shown 4.2 points beside it, which is a screen in
   two languages rather than one. */
const num = (v) => new Intl.NumberFormat(locale()).format(v);

/* Points or a share of target, depending on the model — so the unit has to travel with the
   number. A bare "6" on a relative model means something quite different from 6 on an absolute
   one, and showing both the same way is how the two come to be read as one. */
const driftWords = (mdl, v) => v == null ? t('Not measured')
  : mdl.driftMethod === 'absolute' ? t('{n} points', { n: num(v) })
  : t('{n}%', { n: num(v) });

const scopeBadge = (m) => m.visibility === 'firm'
  ? `<span class="badge plain">${esc(t('Firm model'))}</span>`
  : `<span class="badge prep">${esc(t('{who}’s own', { who: m.ownerName }))}</span>`;

/* ---- the principal's screen ---------------------------------------------------------------
 * Every model in the practice, whoever built it, with what it is doing underneath it. The
 * ordering is by assets rather than by name: a library screen sorted alphabetically tells you
 * where a model is in the list, and this screen is for telling you which ones matter.
 */
export function tethysFirm() {
  $('section').innerHTML = `<h2 class="pagehead">${esc(t('Tethys'))}</h2>
    <p class="hint pagehint">${esc(t('Every model in use across the practice, and what each one is doing. A model published here is one every advisor can put a household on.'))}</p>
    <div class="grid">${panel('ty-models', 'wide')}${panel('ty-detail', 'wide')}</div>`;
  drawLibrary({ firm: true });
}

/* ---- the advisor's screen ---------------------------------------------------------------- */
export function tethysAdvisor() {
  $('section').innerHTML = `<h2 class="pagehead">${esc(t('Tethys'))}</h2>
    <p class="hint pagehint">${esc(t('What you can put a household on: the firm’s models, and your own. Assigning one changes what their holdings are measured against — it places no trade.'))}</p>
    <div class="grid">${panel('ty-models', 'wide')}${panel('ty-detail', 'wide')}</div>`;
  drawLibrary({ firm: false });
}

function drawLibrary(ctx) {
  /* The firm screen asks for the firm view by name. Dana is a principal and an advisor at once,
     so her role cannot say which of her two screens she is on — only the request can. */
  const query = ctx.firm ? { scope: 'firm' } : undefined;
  const run = () => load($('ty-models'), 'Model library', () => api('GET', '/models', { query }), (r) => {
    const rows = [...r.items].sort((a, b) => b.usage.aum - a.usage.aum);
    const totals = rows.reduce((acc, m) => ({ hh: acc.hh + m.usage.households, aum: acc.aum + m.usage.aum,
      over: acc.over + m.usage.outsideThreshold }), { hh: 0, aum: 0, over: 0 });
    return head('Model library', raw(t('{n} models · {hh} households · {aum}', { n: rows.length, hh: totals.hh, aum: money(totals.aum) })))
      + `<div class="tablewrap"><table><thead><tr>
          <th>${esc(t('Model'))}</th><th>${esc(t('Risk'))}</th><th class="num">${esc(t('Households'))}</th>
          ${ctx.firm ? `<th class="num">${esc(t('Advisors'))}</th>` : ''}
          <th class="num">${esc(t('Assets'))}</th><th class="num">${esc(t('Average drift'))}</th><th>${esc(t('Out of tolerance'))}</th></tr></thead><tbody>
        ${rows.map(m => `<tr>
          <td><button class="link" data-mdl="${esc(m.id)}">${esc(m.name)}</button> ${scopeBadge(m)}</td>
          <td>${esc(RISK[m.riskLevel] || m.riskLevel)}</td>
          <td class="num">${m.usage.households}</td>
          ${ctx.firm ? `<td class="num">${m.usage.advisors}</td>` : ''}
          <td class="num">${money(m.usage.aum)}</td>
          <td class="num">${m.usage.households ? esc(driftWords(m, m.usage.averageDriftPct)) : '<span class="meta">&mdash;</span>'}</td>
          <td>${!m.usage.households ? `<span class="meta">${esc(t('Not in use'))}</span>`
            : m.usage.outsideThreshold
              ? `<span class="badge ${m.usage.outsideMax ? 'crit' : 'warn'}">${esc(t('{n} of {total}', { n: m.usage.outsideThreshold, total: m.usage.households }))}</span>`
              : `<span class="badge ok">${esc(t('All within'))}</span>`}</td></tr>`).join('')}
        </tbody></table></div>
      <div class="panel-foot"><button class="btn primary" id="tyNew">${esc(ctx.firm ? t('Publish a new model') : t('Create a model'))}</button></div>`;
  }, (el) => {
    el.querySelectorAll('[data-mdl]').forEach(b => b.onclick = () => drawDetail(b.dataset.mdl, ctx, run));
    $('tyNew').onclick = () => drawForm(ctx, run);
  });
  run();
  $('ty-detail').innerHTML = `<p class="empty">${esc(t('Choose a model to see what it holds and who is on it.'))}</p>`;
}

function drawDetail(id, ctx, after) {
  load($('ty-detail'), 'Model', () => api('GET', '/models/' + encodeURIComponent(id), { query: ctx.firm ? { scope: 'firm' } : undefined }), (m) => {
    const total = +m.holdings.reduce((x, h) => x + h.weightPct, 0).toFixed(2);
    return head(raw(m.name), raw(t('{risk} · built {date}', { risk: RISK[m.riskLevel] || m.riskLevel, date: String(m.createdAt).slice(0, 10) })))
      + `<div class="ty-head">${scopeBadge(m)} <span class="meta">${esc(t('by {who}', { who: m.createdBy }))}</span></div>
      ${m.description ? `<p class="ty-desc">${esc(m.description)}</p>` : ''}

      <h3 class="ar-h">${esc(t('How it is run'))}</h3>
      <dl class="defs ty-rules">
        <dt>${esc(t('Drift measured as'))}</dt><dd>${esc(DRIFT_METHOD[m.driftMethod] || m.driftMethod)}<div class="meta">${esc(DRIFT_METHOD_HINT[m.driftMethod] || '')}</div></dd>
        <dt>${esc(t('Looked at past'))}</dt><dd>${esc(driftWords(m, m.driftThresholdPct))}</dd>
        <dt>${esc(t('Acted on past'))}</dt><dd>${esc(driftWords(m, m.maxDriftPct))}</dd>
        <dt>${esc(t('Rebalanced'))}</dt><dd>${esc(REBALANCE[m.rebalanceFrequency] || m.rebalanceFrequency)}</dd>
        <dt>${esc(t('Left alone for'))}</dt><dd>${esc(t('{n} days after a rebalance', { n: m.cooldownDays }))}</dd>
      </dl>

      <h3 class="ar-h">${esc(t('What it holds'))}</h3>
      <div class="tablewrap"><table><thead><tr><th>${esc(t('Ticker'))}</th><th>${esc(t('Instrument'))}</th><th>${esc(t('Asset class'))}</th><th class="num">${esc(t('Weight'))}</th></tr></thead><tbody>
        ${m.holdings.map(h => `<tr><td class="mono">${esc(h.ticker)}</td><td>${esc(h.name)}</td><td>${esc(h.assetClass)}</td><td class="num">${esc(num(h.weightPct))}%</td></tr>`).join('')}
      </tbody><tfoot><tr><th colspan="3">${esc(t('Total'))}</th><th class="num${total === 100 ? '' : ' neg'}">${esc(num(total))}%</th></tr></tfoot></table></div>

      <h3 class="ar-h">${esc(ctx.firm ? t('Who is on it') : t('Your households on it'))}</h3>
      ${m.households.length ? `<div class="tablewrap"><table><thead><tr><th>${esc(t('Household'))}</th>
        ${ctx.firm ? `<th>${esc(t('Advisor'))}</th>` : ''}
        <th class="num">${esc(t('Assets'))}</th><th class="num">${esc(t('Drift'))}</th><th>${esc(t('State'))}</th></tr></thead><tbody>
        ${m.households.map(h => { const [cls, label] = STATE_BADGE[h.state] || ['plain', h.state];
          return `<tr><td>${esc(h.householdName)}</td>${ctx.firm ? `<td>${esc(h.advisorName)}</td>` : ''}
            <td class="num">${money(h.aum)}</td><td class="num">${esc(driftWords(m, h.driftPct))}</td>
            <td><span class="badge ${cls}">${esc(t(label))}</span></td></tr>`; }).join('')}
      </tbody></table></div>` : `<p class="empty">${esc(t('No households on this model.'))}</p>`}

      ${m.byAdvisor ? `<h3 class="ar-h">${esc(t('By advisor'))}</h3>
        <ul class="subrows">${m.byAdvisor.map(a => `<li><span>${esc(a.advisorName)}</span><span>${esc(t('{n} households · {aum}', { n: a.households, aum: money(a.aum) }))}</span></li>`).join('')}</ul>` : ''}

      ${ctx.firm ? '' : `<div class="panel-foot"><button class="btn" id="tyAssign">${esc(t('Put a household on this model'))}</button></div>`}
      <div id="tyAssignBox"></div>`;
  }, (el) => {
    const a = $('tyAssign');
    if (a) a.onclick = () => assignBox(id, after);
  });
}

/* Assigning. The list is the advisor's own households and nobody else's, and the confirmation
   says what did not happen as well as what did — an advisor who reads "moved to Growth 70/30"
   and pictures a trade has been told the wrong thing. */
async function assignBox(modelId, after) {
  const box = $('tyAssignBox');
  box.innerHTML = `<p class="meta">${esc(t('Loading…'))}</p>`;
  try {
    const r = await api('GET', '/households', { query: { size: 100 } });
    box.innerHTML = `<div class="field"><label for="tyHh">${esc(t('Household'))}</label>
        <select id="tyHh">${r.items.map(h => `<option value="${esc(h.id)}">${esc(h.name)}</option>`).join('')}</select></div>
      <p class="hint">${esc(t('This changes the target their holdings are measured against. It places no trade and moves nothing.'))}</p>
      <button class="btn primary" id="tyGo">${esc(t('Assign the model'))}</button>`;
    $('tyGo').onclick = async () => {
      const b = $('tyGo'); b.disabled = true;
      try {
        const a = await api('PUT', '/households/' + encodeURIComponent($('tyHh').value) + '/model', { body: { modelId } });
        toast('Assigned. Nothing was traded.');
        box.innerHTML = `<p class="hint">${esc(t('{name} is now measured against {model}. Largest gap: {n} points.', { name: a.householdName, model: a.model.name, n: num(a.maxDriftPoints) }))}</p>`;
        if (after) after();
      } catch (e) { toast(e.message); b.disabled = false; }
    };
  } catch (e) { box.innerHTML = `<p class="err">${esc(e.message)}</p>`; }
}

/* ---- creating one -------------------------------------------------------------------------
 * The scope is not on this form, and that is deliberate: it follows from who is filling it in.
 * A field offering "firm" to an advisor would be a control that fails on submit.
 */
const BLANK = () => [{ ticker: '', weightPct: '' }, { ticker: '', weightPct: '' }, { ticker: '', weightPct: '' }];

async function drawForm(ctx, after) {
  const box = $('ty-detail');
  box.innerHTML = `<p class="meta">${esc(t('Loading…'))}</p>`;
  let instruments;
  try { instruments = (await api('GET', '/instruments')).items; }
  catch (e) { box.innerHTML = `<p class="err">${esc(e.message)}</p>`; return; }

  const state = { holdings: BLANK() };
  const opts = (sel) => `<option value="">${esc(t('Choose…'))}</option>`
    + instruments.map(i => `<option value="${esc(i.ticker)}"${i.ticker === sel ? ' selected' : ''}>${esc(i.ticker)} — ${esc(i.name)}</option>`).join('');

  const draw = () => {
    box.innerHTML = head(ctx.firm ? 'Publish a new model' : 'Create a model',
      raw(ctx.firm ? t('Every advisor will be able to use it.') : t('Yours alone. No one else will see it.')))
      + `<div class="ty-form">
        <div class="field"><label for="tyName">${esc(t('Name'))}</label><input type="text" id="tyName" value="${esc(state.name || '')}" placeholder="${esc(t('For example, Balanced with a tax-managed sleeve'))}"></div>
        <div class="field"><label for="tyDesc">${esc(t('Description'))}</label><textarea id="tyDesc" rows="2" placeholder="${esc(t('Who it is for, and what it is trying to do.'))}">${esc(state.description || '')}</textarea></div>
        <div class="ty-grid">
          <div class="field"><label for="tyRisk">${esc(t('Risk level'))}</label><select id="tyRisk">
            ${['Conservative', 'Moderate', 'Aggressive'].map(k => `<option value="${k}"${state.riskLevel === k ? ' selected' : ''}>${esc(RISK[k])}</option>`).join('')}</select></div>
          <div class="field"><label for="tyMethod">${esc(t('Drift method'))}</label><select id="tyMethod">
            ${['absolute', 'relative', 'total'].map(k => `<option value="${k}"${state.driftMethod === k ? ' selected' : ''}>${esc(DRIFT_METHOD[k])}</option>`).join('')}</select>
            <p class="hint" id="tyMethodHint">${esc(DRIFT_METHOD_HINT[state.driftMethod || 'absolute'])}</p></div>
          <div class="field"><label for="tyTh">${esc(t('Drift threshold (%)'))}</label><input type="number" id="tyTh" min="0.1" step="0.1" value="${esc(state.driftThresholdPct ?? '')}"></div>
          <div class="field"><label for="tyMax">${esc(t('Max drift (%)'))}</label><input type="number" id="tyMax" min="0.1" step="0.1" value="${esc(state.maxDriftPct ?? '')}"></div>
          <div class="field"><label for="tyFreq">${esc(t('Rebalance frequency'))}</label><select id="tyFreq">
            ${['monthly', 'quarterly', 'semiannual', 'annual', 'on_drift'].map(k => `<option value="${k}"${state.rebalanceFrequency === k ? ' selected' : ''}>${esc(REBALANCE[k])}</option>`).join('')}</select></div>
          <div class="field"><label for="tyCool">${esc(t('Cooldown (days)'))}</label><input type="number" id="tyCool" min="0" step="1" value="${esc(state.cooldownDays ?? '')}"></div>
        </div>

        <h3 class="ar-h">${esc(t('ETF holdings'))}</h3>
        <table class="ty-holdings"><thead><tr><th>${esc(t('Instrument'))}</th><th class="num">${esc(t('Weight (%)'))}</th><th></th></tr></thead><tbody>
          ${state.holdings.map((h, i) => `<tr>
            <td><label class="vh" for="tyT${i}">${esc(t('Instrument'))}</label><select id="tyT${i}" data-row="${i}" data-f="ticker">${opts(h.ticker)}</select></td>
            <td class="num"><label class="vh" for="tyW${i}">${esc(t('Weight (%)'))}</label><input type="number" id="tyW${i}" data-row="${i}" data-f="weightPct" min="0" step="0.1" value="${esc(h.weightPct)}"></td>
            <td><button class="btn quiet" data-drop="${i}" aria-label="${esc(t('Remove this holding'))}">${esc(t('Remove'))}</button></td></tr>`).join('')}
        </tbody><tfoot><tr><th>${esc(t('Total'))}</th><th class="num" id="tyTotal"></th><th></th></tr></tfoot></table>
        <button class="btn" id="tyAdd">${esc(t('Add a holding'))}</button>

        <div class="panel-foot">
          <button class="btn primary" id="tySave">${esc(ctx.firm ? t('Publish to every advisor') : t('Create the model'))}</button>
          <button class="btn quiet" id="tyCancel">${esc(t('Cancel'))}</button>
        </div>
        <p class="err" id="tyErr" hidden></p>
      </div>`;
    wire();
    total();
  };

  /* The running total is the whole reason this is a table and not three fields. It is shown
     against 100 at all times rather than only on submit, because a weight list is arithmetic
     the person filling it in is doing in their head otherwise. */
  const total = () => {
    const sum = +state.holdings.reduce((x, h) => x + (parseFloat(h.weightPct) || 0), 0).toFixed(2);
    const el = $('tyTotal');
    el.textContent = num(sum) + '%';
    el.className = 'num ' + (sum === 100 ? 'ty-ok' : 'ty-off');
    const save = $('tySave');
    save.disabled = sum !== 100;
    save.title = sum === 100 ? '' : t('Holdings must total 100%.');
  };

  const read = () => ({
    name: $('tyName').value.trim(), description: $('tyDesc').value.trim(),
    riskLevel: $('tyRisk').value, driftMethod: $('tyMethod').value,
    driftThresholdPct: parseFloat($('tyTh').value), maxDriftPct: parseFloat($('tyMax').value),
    rebalanceFrequency: $('tyFreq').value, cooldownDays: parseInt($('tyCool').value, 10),
    holdings: state.holdings.filter(h => h.ticker && parseFloat(h.weightPct) > 0)
      .map(h => ({ ticker: h.ticker, weightPct: parseFloat(h.weightPct) }))
  });

  function wire() {
    box.querySelectorAll('[data-row]').forEach(inp => {
      const set = () => { state.holdings[+inp.dataset.row][inp.dataset.f] = inp.value; total(); };
      inp.oninput = set; inp.onchange = set;
    });
    box.querySelectorAll('[data-drop]').forEach(b => b.onclick = () => {
      // Never below one row: an empty table has nothing to add a holding to.
      if (state.holdings.length > 1) state.holdings.splice(+b.dataset.drop, 1); else state.holdings = BLANK().slice(0, 1);
      keep(); draw();
    });
    $('tyAdd').onclick = () => { keep(); state.holdings.push({ ticker: '', weightPct: '' }); draw(); };
    $('tyMethod').onchange = () => { $('tyMethodHint').textContent = DRIFT_METHOD_HINT[$('tyMethod').value]; };
    $('tyCancel').onclick = () => { $('ty-detail').innerHTML = `<p class="empty">${esc(t('Choose a model to see what it holds and who is on it.'))}</p>`; };
    $('tySave').onclick = save;
  }
  /* Redrawing the table would throw away everything typed above it, so what is in the fields is
     read back into state first. */
  const keep = () => Object.assign(state, read(), { holdings: state.holdings });

  async function save() {
    const b = $('tySave'), err = $('tyErr');
    err.hidden = true;
    const body = read();
    b.disabled = true;
    try {
      const made = await api('POST', '/models', { body });
      toast(ctx.firm ? 'Published. Every advisor can use it.' : 'Created. It is yours alone.');
      if (after) after();
      drawDetail(made.id, ctx, after);
    } catch (e) {
      /* The server's refusal, verbatim and in place. It knows things the form does not — which
         tickers the firm has approved, and that a maximum below a threshold is not a model. */
      err.textContent = e.message; err.hidden = false;
      b.disabled = false;
    }
  }

  draw();
}
