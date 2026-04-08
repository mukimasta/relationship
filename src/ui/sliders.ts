import { getEl } from '../dom';
import { state } from '../state';
import { goTo } from './navigation';
import { showResult } from './result';

function clientX(e: MouseEvent | TouchEvent): number {
  if ('touches' in e && e.touches.length > 0) return e.touches[0].clientX;
  return (e as MouseEvent).clientX;
}

function clientY(e: MouseEvent | TouchEvent): number {
  if ('touches' in e && e.touches.length > 0) return e.touches[0].clientY;
  return (e as MouseEvent).clientY;
}

/** 紧 ↔ 松：映射到 state.valX ∈ [-1, 1] */
export function initHorizontalSlider(): void {
  const wrap = getEl('h-slider');
  const thumb = getEl('h-thumb');
  const fillL = getEl('h-fill-left');
  const fillR = getEl('h-fill-right');
  const btn = getEl('btn-h-next');
  let dragging = false;

  function setVal(ratio: number): void {
    ratio = Math.max(0, Math.min(1, ratio));
    state.valX = ratio * 2 - 1;
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

  setVal(0.5);

  function onStart(e: MouseEvent | TouchEvent): void {
    dragging = true;
    btn.classList.remove('disabled');
    onMove(e);
  }

  function onMove(e: MouseEvent | TouchEvent): void {
    if (!dragging) return;
    e.preventDefault();
    const rect = wrap.getBoundingClientRect();
    const ratio = (clientX(e) - rect.left) / rect.width;
    setVal(ratio);
  }

  function onEnd(): void {
    dragging = false;
  }

  wrap.addEventListener('mousedown', onStart);
  wrap.addEventListener('touchstart', onStart, { passive: false });
  window.addEventListener('mousemove', onMove);
  window.addEventListener('touchmove', onMove, { passive: false });
  window.addEventListener('mouseup', onEnd);
  window.addEventListener('touchend', onEnd);

  btn.addEventListener('click', () => goTo('page-slider-v'));
}

/** 高投入 ↔ 低投入：映射到 state.valY ∈ [-1, 1]（上为高投入） */
export function initVerticalSlider(): void {
  const wrap = getEl('v-slider');
  const thumb = getEl('v-thumb');
  const fillT = getEl('v-fill-top');
  const fillB = getEl('v-fill-bottom');
  const btn = getEl('btn-v-next');
  let dragging = false;

  function setVal(ratio: number): void {
    ratio = Math.max(0, Math.min(1, ratio));
    state.valY = (1 - ratio) * 2 - 1;
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

  setVal(0.5);

  function onStart(e: MouseEvent | TouchEvent): void {
    dragging = true;
    btn.classList.remove('disabled');
    onMove(e);
  }

  function onMove(e: MouseEvent | TouchEvent): void {
    if (!dragging) return;
    e.preventDefault();
    const rect = wrap.getBoundingClientRect();
    const ratio = (clientY(e) - rect.top) / rect.height;
    setVal(ratio);
  }

  function onEnd(): void {
    dragging = false;
  }

  wrap.addEventListener('mousedown', onStart);
  wrap.addEventListener('touchstart', onStart, { passive: false });
  window.addEventListener('mousemove', onMove);
  window.addEventListener('touchmove', onMove, { passive: false });
  window.addEventListener('mouseup', onEnd);
  window.addEventListener('touchend', onEnd);

  btn.addEventListener('click', () => showResult());
}
