// 事件绑定层：只做监听装配与 tooltip 状态管理，不碰算法、不改 SVG。
//
// 关键约束：
//  1. hover / focus / touch 三条路径可能对同一张量表重复触发，
//     用“原因集合 + 当前卡片”做幂等去重，任一路径离开都不能提前关掉别人仍在用的 tooltip。
//  2. 每次返回一个 destroy()，重渲染前必须调用（AbortController 整体解绑），
//     避免切档位后旧 DOM 已丢弃、旧回调却层层叠加。

const MARGIN = 12;

function positionTooltip(tooltip, anchorRect, point) {
  tooltip.style.visibility = 'hidden';
  tooltip.classList.add('is-visible');
  const box = tooltip.getBoundingClientRect();

  let left;
  let top;
  if (point && Number.isFinite(point.clientX)) {
    left = point.clientX + MARGIN;
    top = point.clientY + MARGIN;
  } else {
    left = anchorRect.left + anchorRect.width / 2 - box.width / 2;
    top = anchorRect.top - box.height - MARGIN;
  }

  left = Math.max(MARGIN, Math.min(left, window.innerWidth - box.width - MARGIN));
  top = Math.max(MARGIN, Math.min(top, window.innerHeight - box.height - MARGIN));

  tooltip.style.left = `${Math.round(left)}px`;
  tooltip.style.top = `${Math.round(top)}px`;
  tooltip.style.visibility = '';
}

export function bindGauges({ cardsRoot, tooltipEl }) {
  const controller = new AbortController();
  const { signal } = controller;

  const cards = Array.from(cardsRoot.querySelectorAll('[data-tooltip]'));
  const activeReasons = new Set();
  let currentCard = null;

  function show(card, reason, event) {
    if (currentCard !== card) {
      activeReasons.clear();
      currentCard = card;
    }
    activeReasons.add(reason);

    tooltipEl.textContent = card.dataset.tooltip || '';
    positionTooltip(
      tooltipEl,
      card.getBoundingClientRect(),
      reason === 'hover' || reason === 'touch' ? event : null
    );
    card.setAttribute('aria-describedby', tooltipEl.id);
    card.classList.add('is-active');
  }

  function hide(card, reason) {
    if (currentCard !== card) return;
    activeReasons.delete(reason);
    if (activeReasons.size > 0) return;

    tooltipEl.classList.remove('is-visible');
    card.removeAttribute('aria-describedby');
    card.classList.remove('is-active');
    currentCard = null;
  }

  cards.forEach((card) => {
    card.addEventListener('mouseenter', (event) => show(card, 'hover', event), { signal });
    card.addEventListener('mousemove', (event) => {
      if (currentCard === card && activeReasons.has('hover')) {
        positionTooltip(tooltipEl, card.getBoundingClientRect(), event);
      }
    }, { signal });
    card.addEventListener('mouseleave', () => hide(card, 'hover'), { signal });

    card.addEventListener('focus', (event) => show(card, 'focus', event), { signal });
    card.addEventListener('blur', () => hide(card, 'focus'), { signal });

    // preventDefault 抑制触摸后浏览器补发的合成 mouseenter，touch 与 hover 不会各弹一次
    card.addEventListener('touchstart', (event) => {
      if (currentCard === card && activeReasons.has('touch')) return;
      event.preventDefault();
      show(card, 'touch', event.touches ? event.touches[0] : event);
    }, { signal });
  });

  // 点按量表以外的区域收起触摸 tooltip
  document.addEventListener('touchstart', (event) => {
    const target = event.target instanceof Element ? event.target.closest('[data-tooltip]') : null;
    if (currentCard && !cards.includes(target)) {
      hide(currentCard, 'touch');
    }
  }, { signal });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && currentCard) {
      const card = currentCard;
      activeReasons.clear();
      tooltipEl.classList.remove('is-visible');
      card.removeAttribute('aria-describedby');
      card.classList.remove('is-active');
      currentCard = null;
    }
  }, { signal });

  return {
    destroy() {
      controller.abort();
      tooltipEl.classList.remove('is-visible');
      activeReasons.clear();
      currentCard = null;
    }
  };
}

export function bindPresetSwitch(switcherEl, onPick) {
  const controller = new AbortController();
  const { signal } = controller;

  switcherEl.addEventListener('click', (event) => {
    const button = event.target.closest('[data-preset-id]');
    if (!button || switcherEl.contains(button) === false) return;
    onPick(button.dataset.presetId);
  }, { signal });

  return {
    destroy() {
      controller.abort();
    }
  };
}
