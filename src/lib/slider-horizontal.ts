import { getEl } from '../dom';

function clientX(e: MouseEvent | TouchEvent): number {
  if ('touches' in e && e.touches.length > 0) return e.touches[0].clientX;
  return (e as MouseEvent).clientX;
}

export interface HorizontalSliderHandle {
  setRatio: (r: number) => void;
  getRatio: () => number;
  destroy: () => void;
}

/** 左端 ratio=0 → val=-1，右端 → +1 */
export function attachHorizontalSlider(
  wrapId: string,
  thumbId: string,
  fillLeftId: string,
  fillRightId: string,
  onChange: (val: number) => void,
  onInteract: () => void,
): HorizontalSliderHandle {
  const wrap = getEl(wrapId);
  const thumb = getEl(thumbId);
  const fillL = getEl(fillLeftId);
  const fillR = getEl(fillRightId);
  const ac = new AbortController();
  const { signal } = ac;
  let dragging = false;
  let ratio = 0.5;

  function applyRatio(r: number): void {
    ratio = Math.max(0, Math.min(1, r));
    const val = ratio * 2 - 1;
    onChange(val);
    const pct = ratio * 100;
    thumb.style.left = `${pct}%`;
    fillR.style.right = '0';
    fillL.style.left = '0';
    if (ratio < 0.5) {
      fillL.style.left = `${pct}%`;
      fillL.style.width = `${50 - pct}%`;
      fillR.style.width = '0';
    } else {
      fillR.style.right = `${100 - pct}%`;
      fillR.style.width = `${pct - 50}%`;
      fillL.style.width = '0';
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
    const r = (clientX(e) - rect.left) / rect.width;
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
