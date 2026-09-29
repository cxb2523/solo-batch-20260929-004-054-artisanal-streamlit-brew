// 指标层：只允许纯函数，禁止访问 DOM / window / document。
// 边界口径（重构前后必须逐字对齐，node --test 锁定）：
//   NaN（或非数值） -> invalid 无数据档，量表按 0% 绘制但读数显示 “—”
//   <= 0（含 0、-0）-> empty 空档
//   0 < v < 60      -> cold 冷清档
//   60 <= v < 85    -> warm 平稳档
//   85 <= v <= 100  -> hot 高峰档
//   v > 100（含 Infinity）-> over 溢出档，读数保留真实值，量表弧线封顶 100%

export const SCALE_MAX = 100;
export const TIER_LOW = 60;
export const TIER_HIGH = 85;

export const TIERS = {
  invalid: { key: 'invalid', label: '无数据' },
  empty: { key: 'empty', label: '空档' },
  cold: { key: 'cold', label: '冷清' },
  warm: { key: 'warm', label: '平稳' },
  hot: { key: 'hot', label: '高峰' },
  over: { key: 'over', label: '溢出' }
};

export function isMissing(value) {
  return typeof value !== 'number' || Number.isNaN(value);
}

export function classifyTier(value) {
  if (isMissing(value)) return 'invalid';
  if (value <= 0) return 'empty';
  if (value > SCALE_MAX) return 'over';
  if (value < TIER_LOW) return 'cold';
  if (value < TIER_HIGH) return 'warm';
  return 'hot';
}

export function clampPercent(value) {
  if (isMissing(value)) return NaN;
  if (value <= 0) return 0;
  if (value >= SCALE_MAX) return SCALE_MAX;
  return value;
}

// 供 SVG 弧线使用的 0..1 比例：invalid 与 empty 都落在 0，over 封顶在 1。
export function gaugeFraction(value) {
  if (isMissing(value)) return 0;
  return clampPercent(value) / SCALE_MAX;
}

export function formatPercent(value, digits = 0) {
  if (isMissing(value)) return '—';
  return `${value.toFixed(digits)}%`;
}

// 给 tooltip 用的口径说明，保持纯函数便于单测。
export function metricHint(value) {
  const tier = classifyTier(value);
  switch (tier) {
    case 'invalid':
      return '本期缺少有效数据，量表回落到 0% 位置但不计入任何档位';
    case 'empty':
      return `数值为 ${formatPercent(value, 1)}，落在 0% 空档`;
    case 'cold':
      return `距离 ${TIER_LOW}% 门槛还差 ${(TIER_LOW - value).toFixed(1)} 个点`;
    case 'warm':
      return `已过 ${TIER_LOW}% 门槛，距 ${TIER_HIGH}% 高峰线还差 ${(TIER_HIGH - value).toFixed(1)} 个点`;
    case 'hot':
      return `处于 ${TIER_HIGH}%–${SCALE_MAX}% 高峰区间`;
    case 'over':
      return `实际 ${formatPercent(value, 1)}，超出 ${SCALE_MAX}% 上限 ${(value - SCALE_MAX).toFixed(1)} 个点，弧线封顶显示`;
    default:
      return '';
  }
}

export function summarizeMetric(metric) {
  const value = isMissing(metric.value) ? NaN : Number(metric.value);
  const tier = classifyTier(value);
  return {
    key: metric.key,
    name: metric.name,
    value,
    tier,
    tierLabel: TIERS[tier].label,
    fraction: gaugeFraction(value),
    text: formatPercent(value),
    hint: metricHint(value)
  };
}
