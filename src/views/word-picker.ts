import { ALL_WORDS } from '../data/word-model';
import { WORDS_BY_QUADRANT } from '../data/words';
import type { QuadrantKey } from '../types';
import type { WordItem } from '../types';

export const NEARBY_COUNT = 7;

const GRID_IDS: Record<QuadrantKey, string> = {
  tl: 'grid-tl',
  tr: 'grid-tr',
  bl: 'grid-bl',
  br: 'grid-br',
};

export function buildWordCells(container: HTMLElement): void {
  let globalIndex = 0;
  (Object.keys(WORDS_BY_QUADRANT) as QuadrantKey[]).forEach((qKey) => {
    const el = document.createElement('div');
    el.id = GRID_IDS[qKey];
    el.className = `quadrant-grid q-${qKey}`;
    const rows = WORDS_BY_QUADRANT[qKey];
    rows.forEach((row, ri) => {
      row.forEach((text) => {
        const cell = document.createElement('div');
        cell.className = `word-cell r${ri}`;
        cell.textContent = text;
        cell.dataset.index = String(globalIndex);
        el.appendChild(cell);
        globalIndex += 1;
      });
    });
    container.appendChild(el);
  });
}

export function highlightNearby(
  valX: number,
  valY: number,
  onPick: (w: WordItem) => void,
  root: ParentNode = document,
): void {
  const distances = ALL_WORDS.map((w, i) => ({
    i,
    d: Math.hypot(w.x - valX, w.y - valY),
  }));
  distances.sort((a, b) => a.d - b.d);
  const nearby = new Set(distances.slice(0, NEARBY_COUNT).map((d) => d.i));

  root.querySelectorAll('.word-cell').forEach((el, i) => {
    if (!nearby.has(i)) return;
    el.classList.add('nearby');
    el.addEventListener(
      'click',
      () => {
        onPick(ALL_WORDS[i]!);
      },
      { once: true },
    );
  });
}

export function positionUserDot(dot: HTMLElement, valX: number, valY: number): void {
  const dotX = ((valX + 1) / 2) * 100;
  const dotY = ((1 - valY) / 2) * 100;
  dot.style.left = `${dotX}%`;
  dot.style.top = `${dotY}%`;
}
