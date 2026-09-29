// 量表绘制层：只负责 DOM 与 SVG，不含任何算法分支与事件绑定。
// 两张量表共用完全相同的路径与动画模板，仅注入各自的指标数据。

import { classifyPercent } from './metrics.js';

const CX = 100;
const CY = 95;
const R = 80;
const ARC_LENGTH = Math.PI * R; // 半圆弧长，约 251.327
const ANIM_MS = 900;

// 固定路径：背景轨道 / 数值弧，两张量表逐字节一致
const TRACK_PATH = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`;

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[ch]);
}

function needleAngle(ratio) {
  // r=0 -> -90°（左端），r=0.5 -> 0°（正上），r=1 -> +90°（右端）
  return 180 * ratio - 90;
}

function gaugeSvg(result) {
  const invalid = result.tier === 'invalid';
  const angle = needleAngle(result.ratio);
  const finalOffset = ARC_LENGTH * (1 - result.ratio);

  if (invalid) {
    // 无效数据：空轨道、指针隐藏、无动画
    return `
<svg class="gauge-svg" viewBox="0 0 200 118" role="img" aria-hidden="true">
  <path class="gauge-track" d="${TRACK_PATH}"></path>
  <path class="gauge-arc gauge-arc-${result.tier}" d="${TRACK_PATH}"
        stroke-dasharray="${ARC_LENGTH}" stroke-dashoffset="${ARC_LENGTH}"></path>
  <g class="gauge-needle" opacity="0">
    <line x1="${CX}" y1="${CY}" x2="${CX}" y2="${CY - R + 12}"></line>
  </g>
  <circle class="gauge-hub" cx="${CX}" cy="${CY}" r="7"></circle>
</svg>`;
  }

  return `
<svg class="gauge-svg" viewBox="0 0 200 118" role="img" aria-hidden="true">
  <path class="gauge-track" d="${TRACK_PATH}"></path>
  <path class="gauge-arc gauge-arc-${result.tier}" d="${TRACK_PATH}"
        stroke-dasharray="${ARC_LENGTH}" stroke-dashoffset="${ARC_LENGTH}">
    <animate attributeName="stroke-dashoffset"
             values="${ARC_LENGTH};${finalOffset}"
             dur="${ANIM_MS}ms" calcMode="spline"
             keyTimes="0;1" keySplines="0.22 1 0.36 1" fill="freeze"/>
  </path>
  <g class="gauge-needle" transform="rotate(-90 ${CX} ${CY})">
    <line x1="${CX}" y1="${CY}" x2="${CX}" y2="${CY - R + 12}"></line>
    <animateTransform attributeName="transform" type="rotate"
                      values="-90 ${CX} ${CY};${angle} ${CX} ${CY}"
                      dur="${ANIM_MS}ms" calcMode="spline"
                      keyTimes="0;1" keySplines="0.22 1 0.36 1" fill="freeze"/>
  </g>
  <circle class="gauge-hub" cx="${CX}" cy="${CY}" r="7"></circle>
</svg>`;
}

function gaugeCard(metric, preset) {
  const result = classifyPercent(metric.value, preset);
  return `
<article class="gauge-card tier-${result.tier}"
         tabindex="0"
         data-metric="${escapeHtml(metric.id)}"
         data-tooltip="${escapeHtml(metric.tip)}">
  <div class="gauge-head">
    <h3>${escapeHtml(metric.name)}</h3>
    <span class="tier-badge tier-badge-${result.tier}">${escapeHtml(result.label)}</span>
  </div>
  <div class="gauge-stage">
    ${gaugeSvg(result)}
    <div class="gauge-readout">${escapeHtml(result.percentText)}</div>
  </div>
  <p class="gauge-hint">${escapeHtml(metric.hint)}</p>
</article>`;
}

export function renderDashboard(container, { preset, metrics }) {
  container.innerHTML = `
<div class="gauge-grid" data-preset="${escapeHtml(preset.id)}">
  ${metrics.map((metric) => gaugeCard(metric, preset)).join('')}
</div>
<p class="dashboard-foot">阈值档位：<strong>${escapeHtml(preset.label)}</strong>
（温档 ≥ ${preset.cut.warm}%，热档 ≥ ${preset.cut.hot}%，超过 100% 计溢出；NaN 等无效值不参与分档）</p>`;
}
