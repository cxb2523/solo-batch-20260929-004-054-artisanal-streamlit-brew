// 指标算法层：纯函数，无 DOM / SVG / 事件依赖，可直接被 node --test 引用。

export const TIER_ORDER = ['invalid', 'cold', 'warm', 'hot', 'over'];

export const TIER_META = {
  invalid: { label: '无数据' },
  cold: { label: '冷档' },
  warm: { label: '温档' },
  hot: { label: '热档' },
  over: { label: '溢出' }
};

// 三套阈值档位（切档位只改这里的配置，算法不动）
export const TIER_PRESETS = {
  standard: { id: 'standard', label: '标准档', cut: { warm: 60, hot: 85 } },
  gentle: { id: 'gentle', label: '保守档', cut: { warm: 40, hot: 70 } },
  rush: { id: 'rush', label: '冲刺档', cut: { warm: 75, hot: 90 } }
};

export function isInvalidPercent(value) {
  return typeof value !== 'number' || !Number.isFinite(value) || value < 0;
}

function formatPercent(value) {
  const rounded = Math.round(value * 10) / 10;
  return String(rounded);
}

// 边界语义（与原版对齐，禁止漂移）：
//   NaN / Infinity / 负数 / 非数字 -> invalid
//   0 <= v < warmCut              -> cold   （0 落冷档）
//   warmCut <= v < hotCut         -> warm
//   hotCut <= v <= 100            -> hot    （100 仍是热档）
//   v > 100                       -> over   （超 100% 落溢出档，绘制时钳到满量程）
export function classifyPercent(value, preset = TIER_PRESETS.standard) {
  if (isInvalidPercent(value)) {
    return {
      value,
      tier: 'invalid',
      label: TIER_META.invalid.label,
      clamped: null,
      ratio: 0,
      percentText: '—'
    };
  }

  const { warm, hot } = preset.cut;
  let tier;
  if (value > 100) {
    tier = 'over';
  } else if (value >= hot) {
    tier = 'hot';
  } else if (value >= warm) {
    tier = 'warm';
  } else {
    tier = 'cold';
  }

  const clamped = value > 100 ? 100 : value;
  return {
    value,
    tier,
    label: TIER_META[tier].label,
    clamped,
    ratio: clamped / 100,
    percentText: `${formatPercent(value)}%`
  };
}
