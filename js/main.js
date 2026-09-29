// 入口：只剩数据与装配骨架；指标归 metrics，DOM/SVG 归 render，事件归 bindings。
import { renderDashboard, createTooltip } from './render.js';
import { bindInteractions, bindRangeButtons } from './bindings.js';

const RANGES = {
  daily: {
    label: '今日',
    metrics: [
      { key: 'sales', name: '销售额达成率', value: 0 },
      { key: 'stock', name: '库存鲜度', value: NaN }
    ]
  },
  weekly: {
    label: '本周',
    metrics: [
      { key: 'sales', name: '销售额达成率', value: 128.4 },
      { key: 'stock', name: '库存鲜度', value: 42.7 }
    ]
  },
  monthly: {
    label: '本月',
    metrics: [
      { key: 'sales', name: '销售额达成率', value: 96 },
      { key: 'stock', name: '库存鲜度', value: 60 }
    ]
  }
};

const dashboard = document.getElementById('dashboard');
const tooltip = createTooltip(dashboard);
const rangeButtons = Array.from(document.querySelectorAll('[data-range]'));

let view = null;

function setActiveButton(rangeKey) {
  rangeButtons.forEach((button) => {
    const active = button.dataset.range === rangeKey;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function update(rangeKey) {
  // 重渲染前必须先解绑旧监听，再清空 DOM，避免切档位后回调层层叠加。
  if (view) view.dispose();
  setActiveButton(rangeKey);
  const rendered = renderDashboard(dashboard, RANGES[rangeKey].metrics);
  const interactions = bindInteractions(rendered.cards, tooltip);
  rendered.play();
  view = {
    dispose() {
      interactions.dispose();
    }
  };
}

const rangeBinding = bindRangeButtons(rangeButtons, update);
update('daily');

window.addEventListener('beforeunload', () => {
  rangeBinding.dispose();
  if (view) view.dispose();
});
