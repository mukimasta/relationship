import { getEl } from '../dom';

function clientY(e: MouseEvent | TouchEvent): number {
  if ('touches' in e && e.touches.length > 0) return e.touches[0].clientY;
  return (e as MouseEvent).clientY;
}

export interface VerticalSliderHandle {
  setRatio: (r: number) => void;
  getRatio: () => number;
  destroy: () => void;
}

/**
 * 上端 ratio=0 → valY=+1（高投入 / 时刻都在），下端 ratio=1 → valY=-1（低投入 / 偶尔浮现）
 * 与原版 index.html 纵滑一致。
 */
export function attachVerticalSlider(
  wrapId: string,
  thumbId: string,
  fillTopId: string,
  fillBottomId: string,
  onChange: (val: number) => void,
  onInteract: () => void,
): VerticalSliderHandle {
  const wrap = getEl(wrapId);
  const thumb = getEl(thumbId);
  const fillT = getEl(fillTopId);
  const fillB = getEl(fillBottomId);
  const ac = new AbortController();
  const { signal } = ac;
  let dragging = false;
  let ratio = 0.5;

  function applyRatio(r: number): void {
    ratio = Math.max(0, Math.min(1, r));
    const valY = (1 - ratio) * 2 - 1;
    onChange(valY);
    const pct = ratio * 100;
    thumb.style.top = `${pct}%`;
    if (ratio < 0.5) {
      fillT.style.height = `${pct}%`;
      fillT.style.top = '0';
      fillB.style.height = '0';
    } else {
      fillB.style.height = `${100 - pct}%`;
      fillB.style.bottom = '0';
      fillT.style.height = '0';
    }
  }

  function onStart(e: MouseEvent | TouchEvent): void {
    dragging = true;
    onInteract();
    onMove(e);
  }

  function onMove(e: MouseEvent | TouchEvent): void {
    if (!dragging) return;
    e.preventDefault();
    const rect = wrap.getBoundingClientRect();
    const r = (clientY(e) - rect.top) / rect.height;
    applyRatio(r);
  }

  function onEnd(): void {
    dragging = false;
  }

  wrap.addEventListener('mousedown', onStart, { signal });
  wrap.addEventListener('touchstart', onStart, { passive: false, signal });
  window.addEventListener('mousemove', onMove, { signal });
  window.addEventListener('touchmove', onMove, { passive: false, signal });
  window.addEventListener('mouseup', onEnd, { signal });
  window.addEventListener('touchend', onEnd, { signal });

  applyRatio(0.5);

  return {
    setRatio: applyRatio,
    getRatio: () => ratio,
    destroy: () => ac.abort(),
  };
}
