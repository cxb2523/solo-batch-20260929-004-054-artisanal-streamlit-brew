// 入口层：只持有数据配置与装配顺序，结构骨架留在 index.html。

import { TIER_PRESETS } from './metrics.js';
import { renderDashboard } from './render.js';
import { bindGauges, bindPresetSwitch } from './bindings.js';

// 指标原始值（百分比标量，分档由 metrics 层纯函数决定）
const METRICS = [
  {
    id: 'footfall',
    name: '下周客流预测达成率',
    value: 107.4,
    hint: 'LSTM 7 日预测相对排班容量，超过 100% 表示早高峰存在溢出风险。',
    tip: '107.4% 超出满负荷 7.4 个百分点：建议把开店准备提前 20 分钟，并加排一名吧台手。'
  },
  {
    id: 'inventory',
    name: '鲜食库存健康度',
    value: 58,
    hint: '在架鲜食按预测销量折算的健康比例，60% 以下偏紧。',
    tip: '58% 落在温档以下、接近冷档：今日午后前需补一轮可颂与燕麦奶，避免断货。'
  }
];

const switcherEl = document.querySelector('[data-preset-bar]');
const dashboardEl = document.querySelector('[data-dashboard]');
const tooltipEl = document.querySelector('[data-tooltip]');

let gaugeBinding = null;

function rerender(presetId) {
  const preset = TIER_PRESETS[presetId] || TIER_PRESETS.standard;

  // 先解绑旧监听，再丢弃旧 DOM，杜绝切档位后回调叠加
  if (gaugeBinding) {
    gaugeBinding.destroy();
    gaugeBinding = null;
  }

  document.querySelectorAll('[data-preset-id]').forEach((button) => {
    const active = button.dataset.presetId === preset.id;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });

  renderDashboard(dashboardEl, { preset, metrics: METRICS });
  gaugeBinding = bindGauges({ cardsRoot: dashboardEl, tooltipEl });
}

bindPresetSwitch(switcherEl, rerender);
rerender('standard');
