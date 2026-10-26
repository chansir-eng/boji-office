'use strict';

// Dependency-free browser contract checks. Run with: node tests/calculator.test.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function argument(name) {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

const appPath = argument('--app') || path.join(__dirname, '..', 'assets', 'app.js');
const appSource = fs.readFileSync(appPath, 'utf8');
const modelPath = argument('--model') || path.join(__dirname, '..', 'assets', 'model.js');
const modelSource = fs.readFileSync(modelPath, 'utf8');
const model = require(path.resolve(modelPath));
const defaults = {
  height: '175', weight: '78', bf: '24', age: '28', experience: 'new',
  sessions: '3'
};
const ids = [
  ...Object.keys(defaults), 'applicationForm', 'calculate', 'demo', 'error',
  'results', 'time', 'headline', 'phaseSummary', 'ffmiNow',
  'leanMass', 'targetWeight', 'compositionText', 'barLean', 'barFat', 'chart',
  'scenarios', 'advice', 'calculator',
  'centralWeeks', 'cutWeeks', 'bulkWeeks', 'resultStatus',
  'chartDescription', 'submitStatus', 'formHint', 'validScenarioNote',
  'scenarioAssumptions', 'sensitivityRows', 'sensitivityNote'
];

function browser(source = appSource, options = {}) {
  const elements = new Map();
  const timers = new Map();
  const windowListeners = new Map();
  let timerId = 0;
  const document = { activeElement: null };

  function element(id = '') {
    const classes = new Set();
    const listeners = new Map();
    let value = '';
    const el = {
      id, textContent: '', innerHTML: '', style: {}, dataset: {}, attributes: {},
      children: [], hidden: false, complete: false, naturalWidth: 200,
      classList: {
        add: (...names) => names.forEach(name => classes.add(name)),
        remove: (...names) => names.forEach(name => classes.delete(name)),
        contains: name => classes.has(name),
        toggle(name, force) {
          const next = force === undefined ? !classes.has(name) : force;
          next ? classes.add(name) : classes.delete(name);
          return next;
        }
      },
      addEventListener(name, callback) {
        if (!listeners.has(name)) listeners.set(name, []);
        listeners.get(name).push(callback);
      },
      dispatch(name) {
        const event = { type: name, target: el, defaultPrevented: false,
          preventDefault() { this.defaultPrevented = true; } };
        for (const callback of listeners.get(name) || []) callback(event);
        return event;
      },
      setAttribute(name, content) { el.attributes[name] = String(content); },
      getAttribute(name) { return el.attributes[name] ?? null; },
      removeAttribute(name) { delete el.attributes[name]; },
      scrollIntoView(settings) { el.scrollSettings = settings; },
      focus() { document.activeElement = el; },
      insertBefore(child) { child.parentElement = el; el.children.push(child); }
    };
    Object.defineProperty(el, 'value', { get: () => value, set: next => { value = String(next); } });
    return el;
  }

  for (const id of ids) elements.set(id, element(id));
  elements.get('chart').clientWidth = options.chartWidth || 600;
  for (const [id, value] of Object.entries(defaults)) elements.get(id).value = value;
  const metricButtons = ['bf', 'w'].map(metric => {
    const el = element(); el.dataset.chartMetric = metric; return el;
  });
  for (const id of options.missingIds || []) elements.delete(id);
  document.getElementById = id => elements.get(id) || null;
  document.querySelector = selector => selector.startsWith('#') ? elements.get(selector.slice(1)) : null;
  document.querySelectorAll = selector => {
    if (selector === '[data-chart-metric]') return metricButtons;
    return [];
  };
  document.createElement = () => element();
  const context = vm.createContext({
    document,
    window: {
      matchMedia: query => ({ matches: query.includes('max-width') ? (options.viewportWidth || 1200) <= 850 : !!options.reducedMotion }),
      addEventListener: (name, callback) => windowListeners.set(name, callback)
    },
    setTimeout(callback) { const id = ++timerId; timers.set(id, callback); return id; },
    clearTimeout(id) { timers.delete(id); },
    console
  });
  vm.runInContext(modelSource, context, { filename: 'model.js' });
  vm.runInContext(source, context, { filename: 'app.js' });

  const get = id => elements.get(id);
  function apply(values) {
    for (const [id, value] of Object.entries(values)) get(id).value = value;
    return get('applicationForm').dispatch('submit');
  }
  return { get, metricButtons, document, apply, timers,
    resize(width) { get('chart').clientWidth = width; windowListeners.get('resize')?.(); } };
}


let passed = 0;
function test(name, check) {
  try { check(); passed++; console.log('PASS ' + name); }
  catch (error) { console.error('FAIL ' + name); throw error; }
}

test('default UI shows conditional simulated weeks and auditable composition', () => {
  const { get } = browser();
  assert.equal(get('time').innerHTML, '44–128 <small>模拟周</small>');
  assert.equal(get('ffmiNow').textContent, '19.7');
  assert.equal(get('leanMass').textContent, '59.3');
  assert.equal(get('targetWeight').textContent, '70.1 kg');
  assert.equal(get('compositionText').textContent, '59.3 / 18.7 kg');
  assert.equal(get('barLean').style.width, '76.0%');
  assert.equal(get('barFat').style.width, '24.0%');
  assert.equal(get('centralWeeks').textContent, '69 周');
  assert.equal(get('cutWeeks').textContent, '33 周');
  assert.equal(get('bulkWeeks').textContent, '36 周');
  for (const name of ['审慎', '中间', '乐观']) assert.ok(get('scenarios').innerHTML.includes(name));
  assert.equal(get('resultStatus').textContent, '示例演算');
});

test('fixed numeric reference has no target form dependency', () => {
  assert.deepEqual(model.thinMuscleTarget, { targetBF: 12, targetFFMI: 20.5 });
  const app = browser(), originalLookup = app.document.getElementById;
  app.document.getElementById = id => id === 'targetbf' ? { value: '18' } : id === 'targetffmi' ? { value: '23' } : originalLookup(id);
  app.apply(defaults);
  assert.equal(app.get('time').innerHTML, '44–128 <small>模拟周</small>');
  assert.match(app.get('chart').innerHTML, /12%/);
  assert.match(app.get('phaseSummary').textContent, /61\.8 kg/);
});

test('already satisfied references have completed zero-week paths', () => {
  const app = browser(); app.apply({ weight: 72, bf: 12 });
  assert.equal(app.get('time').innerHTML, '已满足 <small>本站数字参考</small>');
  assert.equal(app.get('targetWeight').textContent, '72.0 kg');
  assert.equal(app.get('resultStatus').dataset.state, 'complete');
  assert.equal((app.get('scenarios').innerHTML.match(/0周/g) || []).length, 9);
});

test('no regular training never invents a lean-growth completion date', () => {
  const app = browser(); app.apply({ sessions: 0 });
  assert.equal(app.get('time').innerHTML, '无法估算 <small>当前条件</small>');
  assert.equal(app.get('targetWeight').textContent, '—');
  assert.equal(app.get('centralWeeks').textContent, '无法估算');
  assert.equal(app.get('bulkWeeks').textContent, '未估算');
  assert.equal(app.get('resultStatus').dataset.state, 'unavailable');
  assert.equal((app.get('scenarios').innerHTML.match(/未估算/g) || []).length, 3);
  assert.match(app.get('headline').textContent, /补足条件|训练/);
});

test('trajectory domain stop is distinct from the 520-week limit', () => {
  const app = browser(); app.apply({ weight: 60, bf: 38 });
  assert.equal(app.get('time').innerHTML, '不适用 <small>停止模拟</small>');
  assert.equal(app.get('centralWeeks').textContent, '不适用');
  assert.equal(app.get('cutWeeks').textContent, '—');
  assert.equal(app.get('bulkWeeks').textContent, '—');
  assert.equal(app.get('targetWeight').textContent, '—');
  assert.match(app.get('headline').textContent, /18\.5|边界|不适用/);
  assert.doesNotMatch(app.get('scenarios').innerHTML, /超出模拟范围|520周/);
});

test('all supported low-weight inputs use the same 18.5 domain-stop policy', () => {
  for(const weight of [35,45,50,54]){
    const app=browser();app.apply({weight,bf:24});
    assert.equal(app.get('error').textContent,'');
    assert.equal(app.get('time').innerHTML,'不适用 <small>停止模拟</small>');
    assert.doesNotMatch(app.get('headline').textContent,/16–48/);
  }
});

test('partial completion identifies the only scenario with an available completion time', () => {
  const app = browser(); app.apply({ weight: 82, sessions: 0 });
  assert.equal(app.get('time').innerHTML, '23 <small>模拟周</small>');
  assert.match(app.get('validScenarioNote').textContent, /1\s*\/\s*3/);
  assert.equal(app.get('centralWeeks').textContent, '无法估算');
  assert.equal((app.get('scenarios').innerHTML.match(/无法估算/g) || []).length, 2);
});

test('capped scenarios remain visible when a completion interval uses the other scenarios', () => {
  const app = browser(); app.apply({ weight: 75, bf: 28, sessions: 2, experience: 'trained' });
  assert.equal(app.get('time').innerHTML, '173–306 <small>模拟周</small>');
  assert.match(app.get('validScenarioNote').textContent, /2\s*\/\s*3/);
  assert.match(app.get('scenarios').innerHTML, /超出模拟范围/);
});

test('guidance acknowledges lean mass that must be replenished after cutting', () => {
  const app = browser(); app.apply({ weight: 82 });
  assert.equal(app.get('bulkWeeks').textContent, '1 周');
  assert.match(app.get('headline').textContent + app.get('advice').textContent, /补足|补回|补充|增加去脂体重/);
  app.apply({ weight: 60, bf: 12, sessions: 0 });
  assert.equal(app.get('time').innerHTML, '无法估算 <small>当前条件</small>');
  assert.doesNotMatch(app.get('advice').textContent, /数值达标不等于|已满足.*数字参考/);
});

test('measurement sensitivity and scenario assumptions are shown beside estimates', () => {
  const app = browser();
  const rows=app.get('sensitivityRows').innerHTML;
  for (const value of ['21', '24', '27', '33', '69', '105']) assert.ok(rows.includes(value), value);
  assert.match(app.get('sensitivityNote').textContent, /误差|敏感|测量/);
  const assumptions=app.get('scenarioAssumptions').innerHTML;
  for (const value of ['0.4', '0.6', '0.8', '0.20', '0.35', '0.50']) assert.ok(assumptions.includes(value), value);
});

test('optional explanatory DOM nodes can be absent without blocking calculation', () => {
  const app=browser(appSource,{missingIds:['validScenarioNote','scenarioAssumptions','sensitivityRows','sensitivityNote']});
  app.apply({weight:82,sessions:0});
  assert.equal(app.get('centralWeeks').textContent,'无法估算');
});

test('frequency input does not imply unsupported precision in growth rates', () => {
  const app=browser();
  for(const sessions of [2,3,4]){
    app.apply({sessions});
    assert.equal(app.get('time').innerHTML,'44–128 <small>模拟周</small>');
    assert.equal(app.get('centralWeeks').textContent,'69 周');
  }
});

test('manual submit validates and focuses the first invalid field', () => {
  const invalid = [
    [{ height: 139 }, 'height', /请输入有效参数/],
    [{ weight: 250 }, 'weight', /BMI/],
    [{ bf: 7 }, 'bf', /非常低|不适用/],
    [{ age: 17 }, 'age', /请输入有效参数/],
    [{ height: '' }, 'height', /请输入有效参数/],
    [{ age: '' }, 'age', /请输入有效参数/]
  ];
  for (const [values, field, message] of invalid) {
    const app = browser(); const event = app.apply(values);
    assert.equal(event.defaultPrevented, true);
    assert.match(app.get('error').textContent, message);
    assert.equal(app.document.activeElement, app.get(field));
    assert.equal(app.get(field).getAttribute('aria-invalid'), 'true');
    assert.equal(app.get(field).getAttribute('aria-describedby'), 'error');
    assert.equal(app.get('resultStatus').dataset.state, 'invalid');
    app.apply(defaults);
    assert.equal(app.get('error').textContent, '');
    assert.equal(app.get(field).getAttribute('aria-invalid'), null);
    assert.equal(app.get(field).getAttribute('aria-describedby'), null);
  }
});

test('automatic validation preserves other help text and does not steal focus', () => {
  const app = browser(), timeBefore = app.get('time').innerHTML;
  app.get('weight').setAttribute('aria-describedby', 'weightHint otherHint');
  app.get('weight').value = 250; app.get('weight').dispatch('change');
  assert.equal(app.get('weight').getAttribute('aria-invalid'), 'true');
  assert.equal(app.get('weight').getAttribute('aria-describedby'), 'weightHint otherHint error');
  assert.equal(app.document.activeElement, null);
  assert.equal(app.get('time').innerHTML, timeBefore);
  app.get('weight').value = 78; app.get('weight').dispatch('change');
  assert.equal(app.get('weight').getAttribute('aria-invalid'), null);
  assert.equal(app.get('weight').getAttribute('aria-describedby'), 'weightHint otherHint');
});

test('field changes update estimates without repeat submit announcements', () => {
  const app = browser(); app.get('weight').value = 90; app.get('weight').dispatch('change');
  assert.equal(app.get('time').innerHTML, '23–53 <small>模拟周</small>');
  assert.equal(app.get('submitStatus').textContent, '');
  assert.match(app.get('chart').innerHTML, /12%/);
});

test('demo restores inputs and conditional simulation outputs', () => {
  const app = browser(); app.apply({ weight: 90, bf: 35, sessions: 0, experience: 'trained' });
  app.get('demo').dispatch('click');
  for (const [id, value] of Object.entries(defaults)) assert.equal(app.get(id).value, value);
  assert.equal(app.get('time').innerHTML, '44–128 <small>模拟周</small>');
  assert.equal(app.get('resultStatus').textContent, '示例演算');
  assert.equal(app.get('submitStatus').textContent, '已恢复默认示例。');
});

test('chart metric switching changes units without recalculating the result', () => {
  const app = browser(), originalTime = app.get('time').innerHTML;
  app.metricButtons[1].dispatch('click');
  assert.equal(app.metricButtons[1].getAttribute('aria-pressed'), 'true');
  assert.equal(app.metricButtons[0].getAttribute('aria-pressed'), 'false');
  assert.match(app.get('chart').innerHTML, / kg<\/text>/);
  assert.equal(app.get('time').innerHTML, originalTime);
  app.metricButtons[0].dispatch('click');
  assert.match(app.get('chart').innerHTML, /12%/);
  for (const color of ['#7d857a', '#526a43', '#A9703F']) assert.ok(app.get('chart').innerHTML.includes(color));
});

test('mobile chart remains legible and redraws at actual width', () => {
  const app = browser(appSource, { chartWidth: 298 });
  assert.equal(app.get('chart').getAttribute('viewBox'), '0 0 298 240');
  assert.equal(app.get('chart').style.aspectRatio, '298 / 240');
  const labels = app.get('chart').innerHTML.match(/<text[^>]+>/g) || [];
  assert.equal(labels.length, 10);
  assert.ok(labels.every(label => label.includes('font-size="12"') && label.includes('fill="#626c5d"')));
  app.resize(560);
  assert.equal(app.get('chart').getAttribute('viewBox'), '0 0 560 220');
  assert.equal((app.get('chart').innerHTML.match(/<text[^>]+>/g) || []).length, 11);
  app.resize(240);assert.equal(app.get('chart').getAttribute('viewBox'), '0 0 260 240');
});

test('submit announces results and uses the mobile scrolling path', () => {
  const app = browser(), event = app.get('applicationForm').dispatch('submit');
  assert.equal(event.defaultPrevented, true);
  assert.equal(app.get('submitStatus').textContent, '假设结果已更新：44–128 模拟周。');
  assert.equal(app.get('results').scrollSettings, undefined);
  const mobile = browser(appSource, { viewportWidth: 390, chartWidth: 298 });
  mobile.get('weight').value = 79; mobile.get('weight').dispatch('change');
  assert.equal(mobile.get('results').scrollSettings, undefined);
  mobile.get('applicationForm').dispatch('submit');
  assert.equal(mobile.get('results').scrollSettings.behavior, 'smooth');
  assert.equal(mobile.get('results').scrollSettings.block, 'start');
  assert.equal(mobile.document.activeElement, null);
  const invalid = browser(appSource, { viewportWidth: 390 });invalid.apply({ age: '' });
  assert.equal(invalid.get('results').scrollSettings, undefined);
});

test('reduced motion disables smooth scrolling and update animation', () => {
  const app = browser(appSource, { viewportWidth: 390, reducedMotion: true });
  app.get('applicationForm').dispatch('submit');
  assert.equal(app.get('results').scrollSettings.behavior, 'auto');
  assert.equal(app.get('results').classList.contains('is-updating'), false);
  assert.equal(app.timers.size, 0);
});

console.log(`${passed} UI regression checks passed.`);
