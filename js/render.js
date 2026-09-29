// 绘制层：只负责 DOM 与 SVG 的生成、文本与动画，不绑定任何事件。
// 两张量表共用同一套路径与动画参数；路径坐标固定，切档位只能改填充比例。
import { summarizeMetric } from './metrics.js';

const GAUGE = {
  cx: 100,
  cy: 100,
  r: 78,
  stroke: 14,
  start: Math.PI,
  end: 0
};

function polar(cx, cy, r, angle) {
  return { x: cx + r * Math.cos(angle), y: cy - r * Math.sin(angle) };
}

function arcPath(fraction) {
  const endAngle = GAUGE.start + (GAUGE.end - GAUGE.start) * fraction;
  const start = polar(GAUGE.cx, GAUGE.cy, GAUGE.r, GAUGE.start);
  const end = polar(GAUGE.cx, GAUGE.cy, GAUGE.r, endAngle);
  const largeArc = endAngle - GAUGE.start > Math.PI ? 1 : 0;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${GAUGE.r} ${GAUGE.r} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

const TRACK_PATH = arcPath(1);
const ANIM_MS = 900;

function svgEl(tag, attrs = {}) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  return node;
}

function buildGaugeSvg() {
  const svg = svgEl('svg', {
    class: 'gauge-svg',
    viewBox: '0 0 200 116',
    role: 'img'
  });
  const track = svgEl('path', {
    class: 'gauge-track',
    d: TRACK_PATH,
    'stroke-width': GAUGE.stroke
  });
  const value = svgEl('path', {
    class: 'gauge-value',
    d: arcPath(0),
    'stroke-width': GAUGE.stroke
  });
  svg.append(track, value);
  return { svg, value };
}

function animateArc(path, targetFraction) {
  const startFraction = 0;
  const startedAt = performance.now();
  let frame = 0;
  return new Promise((resolve) => {
    const tick = (now) => {
      const t = Math.min(1, (now - startedAt) / ANIM_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      path.setAttribute('d', arcPath(startFraction + (targetFraction - startFraction) * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
      else resolve();
    };
    frame = requestAnimationFrame(tick);
  });
}

function animateNumber(el, targetValue, done) {
  const missing = Number.isNaN(targetValue);
  const startedAt = performance.now();
  let frame = 0;
  return new Promise((resolve) => {
    const tick = (now) => {
      const t = Math.min(1, (now - startedAt) / ANIM_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = missing ? '—' : `${Math.round(targetValue * eased)}%`;
      if (t < 1) frame = requestAnimationFrame(tick);
      else {
        if (done) done();
        resolve();
      }
    };
    frame = requestAnimationFrame(tick);
  });
}

function renderGaugeCard(metric) {
  const summary = summarizeMetric(metric);
  const card = document.createElement('article');
  card.className = `gauge-card tier-${summary.tier}`;
  card.dataset.tier = summary.tier;
  card.dataset.metricKey = summary.key;
  card.tabIndex = 0;
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', `${summary.name}：${summary.text}，${summary.tierLabel}`);

  const { svg, value: arc } = buildGaugeSvg();
  const readout = document.createElement('div');
  readout.className = 'gauge-readout';
  readout.textContent = '0%';
  const name = document.createElement('div');
  name.className = 'gauge-name';
  name.textContent = summary.name;
  const badge = document.createElement('span');
  badge.className = 'gauge-badge';
  badge.textContent = summary.tierLabel;
  const head = document.createElement('div');
  head.className = 'gauge-head';
  head.append(name, badge);
  card.append(svg, readout, head);

  return {
    node: card,
    summary,
    play() {
      card.classList.add('is-animating');
      readout.textContent = Number.isNaN(summary.value) ? '—' : '0%';
      return Promise.all([
        animateArc(arc, summary.fraction),
        animateNumber(readout, summary.value, () => {
          readout.textContent = summary.text;
        })
      ]).then(() => card.classList.remove('is-animating'));
    }
  };
}

export function createTooltip(root) {
  const tip = document.createElement('div');
  tip.className = 'tooltip';
  tip.hidden = true;
  tip.setAttribute('role', 'tooltip');
  root.appendChild(tip);
  return {
    node: tip,
    show(summary, anchor) {
      tip.innerHTML = '';
      const title = document.createElement('strong');
      title.textContent = `${summary.name} · ${summary.tierLabel}`;
      const body = document.createElement('span');
      body.textContent = `${summary.text} — ${summary.hint}`;
      tip.append(title, body);
      tip.hidden = false;
      const rect = anchor.getBoundingClientRect();
      tip.style.left = `${rect.left + rect.width / 2}px`;
      tip.style.top = `${rect.top}px`;
    },
    hide() {
      tip.hidden = true;
    }
  };
}

export function renderDashboard(root, metrics) {
  let grid = root.querySelector('.gauge-grid');
  if (grid) grid.remove();
  grid = document.createElement('div');
  grid.className = 'gauge-grid';
  const cards = metrics.map(renderGaugeCard);
  grid.append(...cards.map((card) => card.node));
  root.insertBefore(grid, root.firstChild);
  return {
    cards,
    play() {
      return Promise.all(cards.map((card) => card.play()));
    }
  };
}
