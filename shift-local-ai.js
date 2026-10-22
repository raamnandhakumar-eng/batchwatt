/* Optional local generative AI for the current BatchWatt shift.
   Adapted from the on-device model pattern in Energy Portfolio Health Tracker. */
'use strict';
(function () {
  let worker = null, engine = null, model = '', ready = false, busy = false;
  let snapshot = null, draft = '';
  const $ = id => document.getElementById(id);
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function status(value) { if ($('bw-ai-local-status')) $('bw-ai-local-status').textContent = value; }
  function stopModel() {
    if (engine && typeof engine.interruptGenerate === 'function') {
      try { engine.interruptGenerate(); } catch {}
    }
    if (worker) worker.terminate();
    worker = null; engine = null; model = ''; ready = false;
  }
  function context() {
    return window.BatchWattAIContext && typeof input !== 'undefined' && typeof result !== 'undefined'
      ? window.BatchWattAIContext.context(input, result) : null;
  }
  function controls() {
    if (!$('bw-ai-local-load')) return;
    $('bw-ai-local-load').disabled = busy || ready;
    $('bw-ai-local-unload').disabled = busy || !ready;
    $('bw-ai-local-run').disabled = busy || !ready || !context();
    $('bw-ai-local-stop').disabled = !busy || !ready;
    $('bw-ai-local-download').disabled = busy || !draft;
  }
  function refresh() {
    if (!$('bw-ai-local-stale')) return;
    const current = context();
    const stale = Boolean(snapshot && (!current || current.key !== snapshot.key));
    $('bw-ai-local-stale').hidden = !stale;
    controls();
  }
  function mount() {
    const host = $('bw-ai-model');
    if (!host || $('bw-ai-local-load')) return;
    host.className = 'bw-ai-panel bw-ai-local-model';
    host.innerHTML = [
      '<div class="bw-ai-panel-head"><div><p>OPTIONAL ON-DEVICE AI</p>',
      '<h2>Draft a shift leadership brief</h2></div><span>Local language model · opt in</span></div>',
      '<p class="bw-ai-disclosure">Just like the Energy Portfolio Health Tracker, you can load a free language model ',
      'on your own device to draft a supervisor brief, explain risks and suggest handoffs. No API key is required. ',
      'The model requires WebGPU, downloads large model files from external hosts, and uses your device memory. ',
      'Current shift facts are processed locally and are not sent to a model API.</p>',
      '<div class="bw-ai-local-controls"><button id="bw-ai-local-load" type="button">Load on-device AI</button>',
      '<button id="bw-ai-local-unload" type="button" disabled>Release model memory</button></div>',
      '<p id="bw-ai-local-status" class="bw-ai-local-status" role="status">Model not loaded. ',
      'Rule-based analyst answers above work without it.</p>',
      '<progress id="bw-ai-local-progress" max="1" value="0" hidden aria-label="Model loading progress"></progress>',
      '<form id="bw-ai-local-form"><label for="bw-ai-local-task">Draft task</label>',
      '<select id="bw-ai-local-task"><option value="brief">Leadership brief</option>',
      '<option value="risks">Explain priority risks</option><option value="handoffs">Cross-team handoffs</option></select>',
      '<button id="bw-ai-local-run" type="submit" disabled>Generate AI draft</button>',
      '<button id="bw-ai-local-stop" type="button" disabled>Stop</button></form>',
      '<p id="bw-ai-local-stale" class="bw-ai-stale" hidden>Current shift or workspace changed. ',
      'This draft belongs to the prior plan; regenerate before use.</p>',
      '<p id="bw-ai-local-facts" class="bw-ai-local-facts"></p>',
      '<div id="bw-ai-local-output" class="bw-ai-local-output" aria-label="Local AI draft" ',
      'aria-live="polite">Load the model to draft a review. Supervisor approval required.</div>',
      '<div id="bw-ai-local-sources" class="bw-ai-local-sources"></div>',
      '<button id="bw-ai-local-download" type="button" disabled>Download draft (.txt)</button>',
      '<p class="bw-ai-disclosure">Small language models can make mistakes. Compare every claim with the ',
      'calculated metrics and listed order references. The AI cannot change orders, run machines or release a shift.</p>'
    ].join('');
    $('bw-ai-local-load').addEventListener('click', load);
    $('bw-ai-local-unload').addEventListener('click', () => {
      stopModel(); status('Model unloaded. Some downloaded files may remain in the browser cache.');
      controls();
    });
    $('bw-ai-local-form').addEventListener('submit', event => {
      event.preventDefault(); generate();
    });
    $('bw-ai-local-stop').addEventListener('click', () => {
      if (engine && typeof engine.interruptGenerate === 'function') {
        engine.interruptGenerate(); status('Stopping AI generation…');
      }
    });
    $('bw-ai-local-download').addEventListener('click', () => {
      if (!draft || !snapshot) return;
      const content = [
        'BATCHWATT AI DRAFT — SUPERVISOR REVIEW REQUIRED',
        'Model: ' + model,
        'Workspace: ' + snapshot.facts.scope.factory + ' | ' + snapshot.facts.scope.shift,
        'Verified by model: NO',
        'MODELED INPUT FACTS:\n' + JSON.stringify(snapshot.facts.metrics, null, 2),
        'AI DRAFT:\n' + draft,
        'ORDER REFERENCES:\n' + snapshot.sources.map(s => '[' + s.ref + '] ' +
          s.orderId + ' — ' + s.title).join('\n')
      ].join('\n\n');
      const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url; link.download = 'batchwatt-shift-ai-draft.txt'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    controls();
  }
  function withTimeout(promise, ms) {
    let timer;
    return Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('timeout')), ms);
    })]).finally(() => clearTimeout(timer));
  }
  async function load() {
    if (busy || ready) return;
    busy = true; controls();
    try {
      if (!navigator.gpu) throw new Error('unsupported');
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) throw new Error('unsupported');
      model = adapter.features.has('shader-f16') ?
        'Qwen2.5-1.5B-Instruct-q4f16_1-MLC' : 'Qwen2.5-1.5B-Instruct-q4f32_1-MLC';
      status('Loading model files and WebGPU runtime…');
      $('bw-ai-local-progress').hidden = false;
      const runtime = await withTimeout(import('https://esm.run/@mlc-ai/web-llm@0.2.85'), 60000);
      worker = new Worker('./shift-ai-worker.js', { type: 'module' });
      engine = new runtime.WebWorkerMLCEngine(worker, {
        initProgressCallback: progress => {
          status(progress.text || 'Loading AI…');
          $('bw-ai-local-progress').value = Number(progress.progress || 0);
        }
      });
      await withTimeout(engine.reload(model, { context_window_size: 4096 }), 600000);
      ready = true;
      status('On-device AI ready: ' + model + '. Prompts run locally.');
    } catch (error) {
      stopModel();
      status(error.message === 'unsupported'
        ? 'WebGPU is unavailable. Use a WebGPU-capable browser or the built-in analyst.'
        : 'Local AI could not load. Check network, WebGPU and available device memory; the built-in analyst still works.');
    } finally {
      busy = false; $('bw-ai-local-progress').hidden = true; controls();
    }
  }
  async function generate() {
    if (busy || !ready) return;
    const current = context();
    if (!current) { status('Generate a production plan before drafting.'); return; }
    busy = true; snapshot = current; draft = '';
    $('bw-ai-local-output').textContent = 'Drafting from this plan…';
    $('bw-ai-local-sources').replaceChildren();
    $('bw-ai-local-stale').hidden = true;
    $('bw-ai-local-facts').textContent =
      'Current model facts · ' + current.facts.orders + ' orders · ' +
      current.facts.highPriorityRecords.length + ' priority records · ' +
      current.facts.scope.shift + ' · Modeled, not executed';
    controls();
    try {
      const messages = window.BatchWattAIContext.messages(current, $('bw-ai-local-task').value);
      const response = await withTimeout(engine.chat.completions.create({
        messages, temperature: 0.2, max_tokens: 450, stream: false
      }), 120000);
      draft = String(response.choices && response.choices[0] &&
        response.choices[0].message && response.choices[0].message.content || '');
      $('bw-ai-local-output').textContent = draft || 'No draft returned. Try again.';
      if (current.sources.length) {
        const heading = document.createElement('strong');
        heading.textContent = 'Order records supplied to AI';
        $('bw-ai-local-sources').appendChild(heading);
        for (const record of current.sources) {
          const line = document.createElement('p');
          line.textContent = '[' + record.ref + '] ' + record.orderId + ': ' + record.title;
          $('bw-ai-local-sources').appendChild(line);
        }
      }
      const invalid = [...draft.matchAll(/\[R(\d+)\]/g)].some(match =>
        Number(match[1]) < 1 || Number(match[1]) > current.sources.length);
      status(invalid
        ? 'Draft contains an unsupported record citation. Verify it before use.'
        : 'AI draft complete. Check every claim against the current plan.');
    } catch {
      stopModel(); draft = '';
      $('bw-ai-local-output').textContent = 'AI did not finish. The production plan is unchanged.';
      status('Local AI stopped after an error or timeout. Reload to try again.');
    } finally { busy = false; controls(); refresh(); }
  }
  const previousRecalc = typeof recalc === 'function' ? recalc : null;
  if (previousRecalc) recalc = function () {
    const output = previousRecalc.apply(this, arguments);
    setTimeout(refresh, 0);
    return output;
  };
  document.addEventListener('DOMContentLoaded', () => setTimeout(() => { mount(); refresh(); }, 0));
  window.addEventListener('hashchange', refresh);
})();
