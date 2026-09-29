import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyTier,
  clampPercent,
  gaugeFraction,
  formatPercent,
  metricHint,
  summarizeMetric,
  TIER_LOW,
  TIER_HIGH
} from '../js/metrics.js';

test('0 与负零都落入 empty 空档，弧线比例为 0', () => {
  assert.equal(classifyTier(0), 'empty');
  assert.equal(classifyTier(-0), 'empty');
  assert.equal(classifyTier(-12), 'empty');
  assert.equal(gaugeFraction(0), 0);
  assert.equal(clampPercent(0), 0);
});

test('0 到 60 之间（不含 60）落入 cold 冷清档', () => {
  assert.equal(classifyTier(0.0001), 'cold');
  assert.equal(classifyTier(42.7), 'cold');
  assert.equal(classifyTier(59.999), 'cold');
});

test('60 边界抬档到 warm，85 之前都保持 warm', () => {
  assert.equal(TIER_LOW, 60);
  assert.equal(classifyTier(60), 'warm');
  assert.equal(classifyTier(60.0), 'warm');
  assert.equal(classifyTier(84.999), 'warm');
});

test('85 与 100 边界落入 hot 高峰档', () => {
  assert.equal(TIER_HIGH, 85);
  assert.equal(classifyTier(85), 'hot');
  assert.equal(classifyTier(96), 'hot');
  assert.equal(classifyTier(100), 'hot');
});

test('超过 100% 落入 over 溢出档，读数不截断，弧线封顶 1', () => {
  assert.equal(classifyTier(100.0001), 'over');
  assert.equal(classifyTier(128.4), 'over');
  assert.equal(classifyTier(Infinity), 'over');
  assert.equal(gaugeFraction(128.4), 1);
  assert.equal(gaugeFraction(Infinity), 1);
  assert.equal(clampPercent(128.4), 100);
  assert.equal(formatPercent(128.4), '128%');
});

test('NaN 与非数值落入 invalid 档，读数为破折号，弧线停在 0', () => {
  for (const bad of [NaN, undefined, null, '96', {}, []]) {
    assert.equal(classifyTier(bad), 'invalid', `bad input: ${String(bad)}`);
    assert.equal(gaugeFraction(bad), 0);
    assert.equal(clampPercent(bad), NaN);
    assert.equal(formatPercent(bad), '—');
  }
});

test('hint 文案随档位切换且不越界', () => {
  assert.match(metricHint(0), /空档/);
  assert.match(metricHint(42.7), /60%/);
  assert.match(metricHint(60), /85%/);
  assert.match(metricHint(96), /高峰区间/);
  assert.match(metricHint(128.4), /28\.4 个点/);
  assert.match(metricHint(NaN), /有效数据/);
});

test('summarizeMetric 汇总口径与边界一致', () => {
  const over = summarizeMetric({ key: 'sales', name: '销售额达成率', value: 128.4 });
  assert.equal(over.tier, 'over');
  assert.equal(over.fraction, 1);
  assert.equal(over.text, '128%');

  const missing = summarizeMetric({ key: 'stock', name: '库存鲜度', value: NaN });
  assert.equal(missing.tier, 'invalid');
  assert.equal(missing.fraction, 0);
  assert.equal(missing.text, '—');

  const zero = summarizeMetric({ key: 'x', name: 'x', value: 0 });
  assert.equal(zero.tier, 'empty');
  assert.equal(zero.text, '0%');
});
