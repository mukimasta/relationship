import { getEl } from '../dom';
import type { PageId } from '../types';

const FADE_MS = 300;

/** 全屏单页切换，带淡出淡入 */
export function goTo(pageId: PageId): void {
  const current = document.querySelector<HTMLElement>('.page.active');
  if (!current) return;

  current.classList.add('fading');
  window.setTimeout(() => {
    current.classList.remove('active', 'fading');
    const next = getEl(pageId);
    next.classList.add('active');
    requestAnimationFrame(() => next.classList.remove('fading'));
  }, FADE_MS);
}
