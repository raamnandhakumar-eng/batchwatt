/* Shift analyst panel: portfolio-style KPI overview, ranked actions, and local Q&A. */
'use strict';
(function () {
  let lastQuestion = '';
  const escapeHtml = value => String(value == null ? '' : value).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const metrics = (title, value, detail, className) =>
    '<article class="bw-ai-metric ' + (className || '') + '"><span>' + escapeHtml(title) +
    '</span><strong>' + escapeHtml(value) + '</strong><small>' + escapeHtml(detail) + '</small></article>';

  function renderAnswer(report) {
    const box = document.getElementById('bw-ai-answer');
    if (!box) return;
    const question = lastQuestion || 'What should I review first?';
    const output = window.BatchWattShiftAnalyst.answer(report, question);
    box.innerHTML = '<span class="bw-ai-answer-label">ANALYST RESPONSE</span><h3>' +
      escapeHtml(output.title) + '</h3><p></p><small>Source: current workspace plan and supplied inputs</small>';
    box.querySelector('p').textContent = output.body;
  }

  function render() {
    const root = document.getElementById('bw-ai-root');
    const analyzer = window.BatchWattShiftAnalyst;
    if (!root || !analyzer) return;
    const report = analyzer.analyze(typeof input === 'undefined' ? null : input,
      typeof result === 'undefined' ? null : result);
    if (!report.ready) {
      root.innerHTML = '<div class="bw-ai-empty"><h2>Generate a production plan</h2><p>' +
        escapeHtml(report.note) + '</p><a href="#today">Open production plan →</a></div>';
      return;
    }
    const m = report.metrics, money = value => analyzer.amount(value, report.currency), f = analyzer.format;
    const available = Math.max(0, report.orders - m.atRiskOrders);
    const riskRows = report.actions.slice(0, 6).map((action, idx) =>
      '<li class="bw-ai-action"><span class="bw-ai-action-num">' + (idx + 1) + '</span><div>' +
      '<strong>' + escapeHtml(action.title) + '</strong><p>' + escapeHtml(action.detail) + '</p>' +
      '<small>' + escapeHtml(action.source) + '</small></div><span class="bw-ai-level ' +
      escapeHtml(action.severity) + '">' + escapeHtml(action.severity) + '</span></li>').join('');
    const mixRows = report.mix.slice(0, 6).map(x =>
      '<div class="bw-ai-mix-row"><div><strong>' + escapeHtml(x.name) + '</strong>' +
      '<span>' + x.count + ' order' + (x.count === 1 ? '' : 's') + ' · ' +
      (x.share * 100).toFixed(1) + '%</span></div>' +
      '<div class="bw-ai-bar"><span style="width:' + Math.max(0, Math.min(100, x.share * 100)) +
      '%"></span></div></div>').join('');
    const quality = report.quality.map(x =>
      '<li><span class="bw-ai-quality-state">' + escapeHtml(x.status) + '</span>' +
      escapeHtml(x.text) + '</li>').join('');
    const questions = ['What needs attention?', 'Which orders are at risk?', 'What are modeled costs?',
      'How does energy change?', 'What is the product mix?', 'How reliable are inputs?'];
    root.innerHTML =
      '<div class="bw-ai-strip"><span>WORKSPACE REVIEW</span><strong>' + escapeHtml(report.factory) +
      '</strong><small>' + escapeHtml(report.shift) + ' · Current plan · Modeled, not actual</small></div>' +
      '<div class="bw-ai-metrics">' +
        metrics('Orders not flagged', String(available) + ' / ' + report.orders,
          'Calculated from supplied due times and holds', 'bw-ai-good') +
        metrics('At-risk orders', String(m.atRiskOrders),
          m.holds + ' holds · ' + m.lateOrders + ' late/overdue', m.atRiskOrders ? 'bw-ai-warn' : 'bw-ai-good') +
        metrics('Peak load', f(m.proposedPeak) + ' kW',
          f(m.baselinePeak) + ' kW baseline · target ' + f(m.peakLimit) + ' kW',
          m.peakBreach ? 'bw-ai-warn' : '') +
        metrics('Usage cost', money(m.proposedUsage),
          'Baseline ' + money(m.baselineUsage), '') +
      '</div>' +
      '<div class="bw-ai-compare"><div><span>USAGE COST DIFFERENCE</span><strong>' +
        escapeHtml(money(m.usageDelta)) + '</strong><small>Baseline minus recommended. ' +
        (report.comparable ? 'Same production-order set.' : 'Different order sets; not an efficiency saving.') +
        '</small></div><div><span>CONDITIONAL DEMAND EXPOSURE DIFFERENCE</span><strong>' +
        escapeHtml(money(m.demandDelta)) + '</strong><small>Not daily savings. Depends on the final monthly billing peak.</small></div>' +
        '<div><span>SHIFTED RUNS</span><strong>' + m.shifted +
        '</strong><small>Compared with the earliest-feasible baseline</small></div></div>' +
      '<div class="bw-ai-columns">' +
        '<section class="bw-ai-panel"><div class="bw-ai-panel-head"><div><p>PRIORITY QUEUE</p><h2>What needs action</h2></div>' +
        '<span>' + report.actions.length + ' suggestions</span></div><ol class="bw-ai-actions">' + riskRows +
        '</ol></section>' +
        '<section class="bw-ai-panel"><div class="bw-ai-panel-head"><div><p>ORDER ALLOCATION</p><h2>Production mix</h2></div>' +
        '<span>Share of order count</span></div><div class="bw-ai-mix">' + mixRows +
        '</div><small class="bw-ai-caption">Shares reflect order count, not comparable SKU quantities or revenue.</small></section>' +
      '</div>' +
      '<section class="bw-ai-panel bw-ai-ask"><div class="bw-ai-panel-head"><div>' +
      '<p>ASK THE ANALYST</p><h2>Ask about the current shift</h2></div>' +
      '<span>Explainable, local analysis</span></div>' +
      '<p class="bw-ai-disclosure">This analyst answers from calculated plan data using transparent rules. ' +
      'It is not connected to a generative AI model, and it does not automatically change or release a plan.</p>' +
      '<div class="bw-ai-questions">' + questions.map(q =>
        '<button type="button" class="bw-ai-question" data-bw-question="' + escapeHtml(q) + '">' +
        escapeHtml(q) + '</button>').join('') + '</div>' +
      '<form id="bw-ai-form"><label for="bw-ai-question-input">Your question</label>' +
      '<div class="bw-ai-input"><input id="bw-ai-question-input" type="text" maxlength="300" ' +
      'placeholder="Example: Which orders should we prioritize?"><button type="submit">Analyze</button></div></form>' +
      '<div id="bw-ai-answer" class="bw-ai-answer" aria-live="polite"></div></section>' +
      '<details class="bw-ai-panel bw-ai-details"><summary>Data quality and methodology</summary>' +
      '<ul>' + quality + '</ul><p>' + escapeHtml(report.note) + '</p>' +
      '<p>Baseline and proposed schedules come from the same planning shift. This analyst uses current data ' +
      'and does not infer historical trends, production execution, CO₂ reductions or verified utility-bill savings.</p></details>';
    renderAnswer(report);
  }

  document.addEventListener('submit', e => {
    if (e.target && e.target.id === 'bw-ai-form') {
      e.preventDefault();
      const field = document.getElementById('bw-ai-question-input');
      lastQuestion = String(field && field.value || '').trim().slice(0, 300);
      renderAnswer(window.BatchWattShiftAnalyst.analyze(input, result));
    }
  });
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-bw-question]');
    if (!b) return;
    lastQuestion = b.dataset.bwQuestion;
    const field = document.getElementById('bw-ai-question-input');
    if (field) field.value = lastQuestion;
    renderAnswer(window.BatchWattShiftAnalyst.analyze(input, result));
  });
  const previousRecalc = typeof recalc === 'function' ? recalc : null;
  if (previousRecalc) recalc = function () {
    const out = previousRecalc.apply(this, arguments);
    setTimeout(render, 0);
    return out;
  };
  window.addEventListener('hashchange', () => setTimeout(render, 0));
  document.addEventListener('DOMContentLoaded', () => setTimeout(render, 0));
})();
