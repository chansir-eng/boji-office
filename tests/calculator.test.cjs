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
  'chartDescription', 'submitStatus', 'formHint'
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
  const photos = [12, 16, 22, 28, 35].map(value => {
    const el = element(); el.dataset.bf = String(value); return el;
  });
  const images = photos.map(photo => {
    const image = element(); image.parentElement = photo; return image;
  });
  const metricButtons = ['bf', 'w'].map(metric => {
    const el = element(); el.dataset.chartMetric = metric; return el;
  });
  document.getElementById = id => elements.get(id) || null;
  document.querySelector = selector => selector.startsWith('#') ? elements.get(selector.slice(1)) : null;
  document.querySelectorAll = selector => {
    if (selector === '.photo-card') return photos;
    if (selector === '.photo-card img') return images;
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
  return { get, photos, images, metricButtons, document, apply, timers,
    resize(width) { get('chart').clientWidth = width; windowListeners.get('resize')?.(); } };
}

let passed = 0;
function test(name, check) {
  try { check(); passed++; console.log('PASS ' + name); }
  catch (error) { console.error('FAIL ' + name); throw error; }
}

test('pure model exports original numerical results without browser dependencies', () => {
  const input = { height: 1.75, weight: 78, bf: 24, age: 28, experience: 'new', sessions: 3, targetBF: 12, targetFFMI: 20.5 };
  const before = JSON.stringify(input);
  const results = model.params.map(param => model.simulate(input, param));
  assert.deepEqual(results.map(result => [result.cutWeeks, result.bulkWeeks, result.weeks]), [[53, 75, 128], [33, 36, 69], [23, 21, 44]]);
  assert.equal(results[1].initial.lean, 59.28);
  assert.equal(results[1].goalLean, 61.816562499999996);
  assert.equal(results[1].final.w, 70.03477788541244);
  assert.equal(results[1].hist.length, 70);
  assert.equal(JSON.stringify(input), before);
  assert.equal(model.massIndex(59.28, 1.75).toFixed(1), '19.7');
  assert.equal(typeof model.weeklyRate, 'function');
  assert.equal(typeof model.requiredLean, 'function');
});

test('thin-muscle reference is fixed and has no target form dependencies', () => {
  assert.deepEqual(model.thinMuscleTarget, { targetBF: 12, targetFFMI: 20.5 });
  assert.equal(Object.isFrozen(model.thinMuscleTarget), true);
  assert.throws(() => { model.thinMuscleTarget.targetBF = 18; }, TypeError);
  const app = browser();
  assert.equal(app.get('targetbf'), undefined);
  assert.equal(app.get('targetffmi'), undefined);
  const originalLookup = app.document.getElementById;
  app.document.getElementById = id => id === 'targetbf' ? { value: '18' } : id === 'targetffmi' ? { value: '23' } : originalLookup(id);
  app.apply(defaults);
  assert.equal(app.get('time').innerHTML, '44–128 <small>周</small>');
  assert.match(app.get('chart').innerHTML, /薄肌参考 12%/);
  assert.equal(app.get('phaseSummary').textContent, '薄肌参考去脂体重 61.8 kg');
});

test('default example preserves original scenario outputs', () => {
  const { get } = browser();
  assert.equal(get('time').innerHTML, '44–128 <small>周</small>');
  assert.equal(get('ffmiNow').textContent, '19.7');
  assert.equal(get('leanMass').textContent, '59.3');
  assert.equal(get('targetWeight').textContent, '70.0 kg');
  assert.equal(get('compositionText').textContent, '59.3 / 18.7 kg');
  assert.equal(get('barLean').style.width, '76.0%');
  assert.equal(get('barFat').style.width, '24.0%');
  assert.match(get('scenarios').innerHTML, /保守<\/td><td>53周<\/td><td>75周<\/td><td class="">128周/);
  assert.match(get('scenarios').innerHTML, /中心<\/td><td>33周<\/td><td>36周<\/td><td class="focus">69周/);
  assert.match(get('scenarios').innerHTML, /较快<\/td><td>23周<\/td><td>21周<\/td><td class="">44周/);
  assert.equal(get('centralWeeks').textContent, '69 周');
  assert.equal(get('cutWeeks').textContent, '33 周');
  assert.equal(get('bulkWeeks').textContent, '36 周');
  assert.equal(get('phaseSummary').textContent, '薄肌参考去脂体重 61.8 kg');
  assert.equal(get('resultStatus').dataset.state, 'ready');
  assert.equal(get('resultStatus').textContent, '示例估算');
  assert.equal(get('formHint').textContent, '已填入一组示例数据，可直接修改。');
});

test('already met targets use zero weeks', () => {
  const app = browser(); app.apply({ weight: 72, bf: 12 });
  assert.equal(app.get('time').innerHTML, '已达标 <small>薄肌参考目标</small>');
  assert.equal(app.get('centralWeeks').textContent, '已达标');
  assert.equal(app.get('targetWeight').textContent, '72.0 kg');
  assert.equal(app.get('resultStatus').dataset.state, 'complete');
  assert.equal((app.get('scenarios').innerHTML.match(/0周/g) || []).length, 9);
});

test('no regular training does not invent a muscle gain completion date', () => {
  const app = browser(); app.apply({ sessions: 0 });
  assert.equal(app.get('time').innerHTML, '无法估算 <small>当前条件</small>');
  assert.equal(app.get('targetWeight').textContent, '—');
  assert.equal(app.get('centralWeeks').textContent, '无法估算');
  assert.equal(app.get('bulkWeeks').textContent, '未估算');
  assert.equal(app.get('resultStatus').dataset.state, 'unavailable');
  assert.equal((app.get('scenarios').innerHTML.match(/未估算/g) || []).length, 3);
  assert.equal((app.get('scenarios').innerHTML.match(/无法估算/g) || []).length, 3);
  assert.doesNotMatch(app.get('scenarios').innerHTML, /0周|超过10年/);
  assert.match(app.get('advice').textContent, /未进行规律力量训练/);
});

test('simulation cap is distinct from unestimated growth without training', () => {
  const app = browser();
  app.apply({ weight: 60, bf: 38, experience: 'trained', sessions: 2 });
  assert.equal(app.get('time').innerHTML, '超出范围 <small>520 周上限</small>');
  assert.equal(app.get('centralWeeks').textContent, '超出模拟范围');
  assert.equal(app.get('bulkWeeks').textContent, '超出范围');
  assert.equal((app.get('scenarios').innerHTML.match(/超出模拟范围/g) || []).length, 3);
  assert.doesNotMatch(app.get('scenarios').innerHTML, /未估算|无法估算/);
  app.apply({ ...defaults, weight: 90, sessions: 0 });
  assert.equal(app.get('bulkWeeks').textContent, '0 周');
  assert.equal(app.get('time').innerHTML, '23–53 <small>周</small>');
});

test('cut-only conditions preserve scenario duration', () => {
  const app = browser(); app.apply({ weight: 90 });
  assert.equal(app.get('time').innerHTML, '23–53 <small>周</small>');
  assert.equal(app.get('bulkWeeks').textContent, '0 周');
  assert.equal(app.get('targetWeight').textContent, '76.9 kg');
});

test('manual submit validates and focuses the first invalid field', () => {
  const invalid = [
    [{ height: 139 }, 'height', /请输入有效参数/],
    [{ weight: 35 }, 'weight', /BMI 16–48/],
    [{ bf: 7 }, 'bf', /非常低的区间/],
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
    assert.equal(app.get('resultStatus').textContent, '输入有误 · 结果未更新');
    app.apply(defaults);
    assert.equal(app.get('error').textContent, '');
    assert.equal(app.get(field).getAttribute('aria-invalid'), null);
    assert.equal(app.get(field).getAttribute('aria-describedby'), null);
  }
});

test('automatic validation marks errors without stealing focus or removing other help text', () => {
  const app = browser();
  const timeBefore = app.get('time').innerHTML;
  app.get('weight').setAttribute('aria-describedby', 'weightHint otherHint');
  app.get('weight').value = 35;
  app.get('weight').dispatch('change');
  assert.equal(app.get('weight').getAttribute('aria-invalid'), 'true');
  assert.equal(app.get('weight').getAttribute('aria-describedby'), 'weightHint otherHint error');
  assert.equal(app.document.activeElement, null);
  assert.equal(app.get('time').innerHTML, timeBefore);
  assert.equal(app.get('resultStatus').textContent, '输入有误 · 结果未更新');
  app.get('weight').value = 78;
  app.get('weight').dispatch('change');
  assert.equal(app.get('weight').getAttribute('aria-invalid'), null);
  assert.equal(app.get('weight').getAttribute('aria-describedby'), 'weightHint otherHint');
  assert.equal(app.get('formHint').textContent, '修改参数后，估算会自动更新。');
});

test('current-state fields update estimates without repeated submit announcements', () => {
  const app = browser(); app.get('weight').value = 90;
  app.get('weight').dispatch('change');
  assert.equal(app.get('time').innerHTML, '23–53 <small>周</small>');
  assert.equal(app.get('submitStatus').textContent, '');
  assert.match(app.get('chart').innerHTML, /薄肌参考 12%/);
  assert.match(app.get('headline').textContent, /薄肌参考值/);
});

test('photo selection updates body fat, pressed state, and scroll destination', () => {
  const app = browser(); app.photos[3].dispatch('click');
  assert.equal(app.get('bf').value, '28');
  assert.equal(app.photos[3].getAttribute('aria-pressed'), 'true');
  assert.equal(app.photos[0].getAttribute('aria-pressed'), 'false');
  assert.equal(app.get('barFat').style.width, '28.0%');
  assert.equal(app.get('calculator').scrollSettings.behavior, 'smooth');
  assert.equal(app.get('submitStatus').textContent, '已选择 28% 参考值，估算已更新。');
  assert.equal(app.get('resultStatus').textContent, '已更新');
});

test('demo reset restores every original input and calculated result', () => {
  const app = browser(); app.apply({ weight: 90, bf: 35, sessions: 0, experience: 'trained' });
  app.get('demo').dispatch('click');
  for (const [id, value] of Object.entries(defaults)) assert.equal(app.get(id).value, value);
  assert.equal(app.get('time').innerHTML, '44–128 <small>周</small>');
  assert.equal(app.get('resultStatus').textContent, '示例估算');
  assert.equal(app.get('submitStatus').textContent, '已恢复默认示例。');
  assert.equal(app.get('formHint').textContent, '已填入一组示例数据，可直接修改。');
});

test('metric switch changes chart units without changing the calculation', () => {
  const app = browser(); const originalTime = app.get('time').innerHTML;
  app.metricButtons[1].dispatch('click');
  assert.equal(app.metricButtons[1].getAttribute('aria-pressed'), 'true');
  assert.equal(app.metricButtons[0].getAttribute('aria-pressed'), 'false');
  assert.match(app.get('chart').innerHTML, / kg<\/text>/);
  assert.doesNotMatch(app.get('chart').innerHTML, /薄肌参考 12%/);
  assert.equal(app.get('chartDescription').textContent, '每 4 周取样 · 含减脂与增肌阶段');
  assert.equal(app.get('time').innerHTML, originalTime);
  app.metricButtons[0].dispatch('click');
  assert.match(app.get('chart').innerHTML, /薄肌参考 12%/);
  for (const color of ['#7d857a', '#526a43', '#A9703F']) assert.ok(app.get('chart').innerHTML.includes(color));
});

test('mobile chart keeps legible typography and redraws at the actual width', () => {
  const app = browser(appSource, { chartWidth: 298 });
  assert.equal(app.get('chart').getAttribute('viewBox'), '0 0 298 240');
  assert.equal(app.get('chart').style.aspectRatio, '298 / 240');
  const labels = app.get('chart').innerHTML.match(/<text[^>]+>/g) || [];
  assert.equal(labels.length, 10); // Five y-axis labels, four x-axis labels, one target.
  assert.ok(labels.every(label => label.includes('font-size="12"') && label.includes('fill="#626c5d"')));
  assert.match(app.get('chart').innerHTML, /stroke="#7d896f"/);
  app.resize(560);
  assert.equal(app.get('chart').getAttribute('viewBox'), '0 0 560 220');
  assert.equal(app.get('chart').style.aspectRatio, '560 / 220');
  assert.equal((app.get('chart').innerHTML.match(/<text[^>]+>/g) || []).length, 11);
  app.resize(240);
  assert.equal(app.get('chart').getAttribute('viewBox'), '0 0 260 240');
});

test('form submit and keyboard path announce the updated estimate', () => {
  const app = browser(); const event = app.get('applicationForm').dispatch('submit');
  assert.equal(event.defaultPrevented, true);
  assert.equal(app.get('submitStatus').textContent, '估算已更新：44–128 周。');
  assert.equal(app.get('resultStatus').textContent, '已更新');
  assert.equal(app.get('results').scrollSettings, undefined);
});

test('manual mobile submission scrolls to valid results without taking focus', () => {
  const app = browser(appSource, { viewportWidth: 390, chartWidth: 298 });
  app.get('weight').value = 79; app.get('weight').dispatch('change');
  assert.equal(app.get('results').scrollSettings, undefined);
  app.get('applicationForm').dispatch('submit');
  assert.equal(app.get('results').scrollSettings.behavior, 'smooth');
  assert.equal(app.get('results').scrollSettings.block, 'start');
  assert.equal(app.document.activeElement, null);
  const reduced = browser(appSource, { viewportWidth: 390, reducedMotion: true });
  reduced.get('applicationForm').dispatch('submit');
  assert.equal(reduced.get('results').scrollSettings.behavior, 'auto');
  const invalid = browser(appSource, { viewportWidth: 390 });
  invalid.apply({ age: '' });
  assert.equal(invalid.get('results').scrollSettings, undefined);
});

test('failed photos retain a usable selection with one fallback', () => {
  const app = browser();
  app.images[0].dispatch('error'); app.images[0].dispatch('error');
  assert.equal(app.images[0].hidden, true);
  assert.equal(app.photos[0].children.length, 1);
  assert.equal(app.photos[0].children[0].className, 'photo-fallback');
  app.photos[0].dispatch('click');
  assert.equal(app.get('bf').value, '12');
});

test('reduced motion avoids smooth scrolling and update effects', () => {
  const app = browser(appSource, { reducedMotion: true });
  app.photos[1].dispatch('click');
  assert.equal(app.get('calculator').scrollSettings.behavior, 'auto');
  assert.equal(app.get('results').classList.contains('is-updating'), false);
  assert.equal(app.timers.size, 0);
});

const baselinePath = argument('--baseline');
if (baselinePath) {
  const originalSource = fs.readFileSync(baselinePath, 'utf8');
  test('pure model matches every original result and history point in 432 cases', () => {
    const originalModelCode = originalSource.slice(originalSource.indexOf('const massIndex='), originalSource.indexOf('function targetMessage('));
    const context = vm.createContext({});
    vm.runInContext(originalModelCode + '\nglobalThis.baselineModel={params,simulate,massIndex,weeklyRate,requiredLean};', context);
    const baseline = context.baselineModel;
    let cases = 0;
    for (const height of [150, 175, 205]) for (const weight of [65, 100])
      for (const bf of [12, 24, 38]) for (const experience of ['new', 'return', 'trained'])
        for (const sessions of [0, 2, 3, 4]) for (const [targetbf, targetffmi] of [[10, 23], [18, 18]]) {
          const values = { height: height / 100, weight, bf, experience, sessions, targetBF: targetbf, targetFFMI: targetffmi };
          const actual = model.params.map(param => model.simulate(values, param));
          const expected = baseline.params.map(param => baseline.simulate(values, param));
          assert.equal(JSON.stringify(actual), JSON.stringify(expected), JSON.stringify(values));
          cases++;
        }
    assert.equal(cases, 432);
  });
}

console.log(`${passed} regression checks passed.`);
