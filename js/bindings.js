// 绑定层：只挂事件、调 tooltip，不碰 SVG 路径、不算指标。
// 同一张卡片可能被 hover / focus / touch 三条路径同时命中，
// 用“激活来源集合”合并，重复来源不重复 show，最后一个来源离开才 hide。
// dispose() 必须在重渲染前调用，AbortController 一次性摘掉本层全部监听，
// 否则切换档位（数据范围）后旧回调会层层叠加。

const TOUCH_GUARD_MS = 700;

export function bindInteractions(cards, tooltip) {
  const controller = new AbortController();
  const { signal } = controller;
  const active = new Map();
  let lastTouchAt = 0;

  const sourcesOf = (node) => {
    let set = active.get(node);
    if (!set) {
      set = new Set();
      active.set(node, set);
    }
    return set;
  };

  const visibleCard = () => {
    for (const card of cards) {
      const set = active.get(card.node);
      if (set && set.size > 0) return card;
    }
    return null;
  };

  const refresh = () => {
    const card = visibleCard();
    if (card) tooltip.show(card.summary, card.node);
    else tooltip.hide();
  };

  cards.forEach((card) => {
    const node = card.node;

    // 路径一：鼠标悬停。触屏合成的 mouseenter 在时间窗内丢弃，避免双触发。
    node.addEventListener('mouseenter', () => {
      if (Date.now() - lastTouchAt < TOUCH_GUARD_MS) return;
      sourcesOf(node).add('hover');
      refresh();
    }, { signal });

    node.addEventListener('mouseleave', () => {
      sourcesOf(node).delete('hover');
      refresh();
    }, { signal });

    // 路径二：键盘 / 读屏焦点。
    node.addEventListener('focus', () => {
      sourcesOf(node).add('focus');
      refresh();
    }, { signal });

    node.addEventListener('blur', () => {
      sourcesOf(node).delete('focus');
      refresh();
    }, { signal });

    // 路径三：触摸。preventDefault 抑制后续合成鼠标事件，
    // 同一卡片再次点按收起，点按卡片外区域统一收起。
    node.addEventListener('touchstart', (event) => {
      event.preventDefault();
      lastTouchAt = Date.now();
      const set = sourcesOf(node);
      if (set.has('touch')) set.delete('touch');
      else {
        active.forEach((otherSet, otherNode) => {
          if (otherNode !== node) otherSet.delete('touch');
        });
        set.add('touch');
      }
      refresh();
    }, { signal, passive: false });
  });

  document.addEventListener('touchstart', (event) => {
    const insideCard = cards.some((card) => card.node.contains(event.target));
    if (insideCard) return;
    active.forEach((set) => set.delete('touch'));
    refresh();
  }, { signal });

  return {
    dispose() {
      controller.abort();
      active.clear();
      tooltip.hide();
    }
  };
}

export function bindRangeButtons(buttons, onSelect) {
  const controller = new AbortController();
  const { signal } = controller;
  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      onSelect(button.dataset.range);
    }, { signal });
  });
  return {
    dispose() {
      controller.abort();
    }
  };
}
