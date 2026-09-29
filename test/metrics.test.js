import test from 'node:test';
import assert from 'node:assert/strict';

import { classifyPercent, TIER_PRESETS, isInvalidPercent } from '../js/metrics.js';

const standard = TIER_PRESETS.standard; // warm 60 / hot 85
const gentle = TIER_PRESETS.gentle; // warm 40 / hot 70
const rush = TIER_PRESETS.rush; // warm 75 / hot 90

test('0 落冷档，量程为 0，不允许漂移到温档或无效档', () => {
  const r = classifyPercent(0, standard);
  assert.equal(r.tier, 'cold');
  assert.equal(r.clamped, 0);
  assert.equal(r.ratio, 0);
  assert.equal(r.percentText, '0%');
});

test('超过 100% 落溢出档，绘制量程钳到 100 但保留原始数值与文案', () => {
  const r = classifyPercent(107.4, standard);
  assert.equal(r.tier, 'over');
  assert.equal(r.value, 107.4);
  assert.equal(r.clamped, 100);
  assert.equal(r.ratio, 1);
  assert.equal(r.percentText, '107.4%');
});

test('100% 仍是热档而不是溢出档（上边界包含）', () => {
  const r = classifyPercent(100, standard);
  assert.equal(r.tier, 'hot');
  assert.equal(r.clamped, 100);
  assert.equal(r.ratio, 1);
});

test('NaN 落无效档，没有量程，文案显示占位符', () => {
  const r = classifyPercent(NaN, standard);
  assert.equal(r.tier, 'invalid');
  assert.equal(r.clamped, null);
  assert.equal(r.ratio, 0);
  assert.equal(r.percentText, '—');
});

test('Infinity / -Infinity / 负数 / 非数字 一律落无效档', () => {
  for (const bad of [Infinity, -Infinity, -1, -0.01, null, undefined, '80']) {
    assert.equal(isInvalidPercent(bad), true, `expected invalid for ${String(bad)}`);
    assert.equal(classifyPercent(bad, standard).tier, 'invalid');
  }
});

test('标准档边界：59.9 冷、60 温、84.9 温、85 热', () => {
  assert.equal(classifyPercent(59.9, standard).tier, 'cold');
  assert.equal(classifyPercent(60, standard).tier, 'warm');
  assert.equal(classifyPercent(84.9, standard).tier, 'warm');
  assert.equal(classifyPercent(85, standard).tier, 'hot');
});

test('切档位只移动阈值：同一 60 在标准档为温、在冲刺档为冷', () => {
  assert.equal(classifyPercent(60, standard).tier, 'warm');
  assert.equal(classifyPercent(60, rush).tier, 'cold');
  assert.equal(classifyPercent(40, gentle).tier, 'warm');
  assert.equal(classifyPercent(40, standard).tier, 'cold');
  assert.equal(classifyPercent(90, rush).tier, 'hot');
});

test('负值即使超过 -100 也不允许绕回任何有效档', () => {
  assert.equal(classifyPercent(-100, standard).tier, 'invalid');
});

test('文案保留一位小数，正常与溢出值一致使用原始值', () => {
  assert.equal(classifyPercent(58, standard).percentText, '58%');
  assert.equal(classifyPercent(84.96, standard).percentText, '85%');
  assert.equal(classifyPercent(132, standard).percentText, '132%');
});
