import { ALL_WORDS } from '../data/word-model';
import { WORDS_BY_QUADRANT } from '../data/words';
import { getEl } from '../dom';
import { state } from '../state';
import type { QuadrantKey, WordItem } from '../types';
import { goTo } from './navigation';

const NEARBY_COUNT = 8;

const QUADRANT_GRID_IDS: Record<QuadrantKey, string> = {
  tl: 'grid-tl',
  tr: 'grid-tr',
  bl: 'grid-bl',
  br: 'grid-br',
};

const FINAL_COLOR_CLASS: Record<QuadrantKey, string> = {
  tl: 'color-tl',
  tr: 'color-tr',
  bl: 'color-bl',
  br: 'color-br',
};

function buildGrid(): void {
  let globalIndex = 0;
  (Object.keys(WORDS_BY_QUADRANT) as QuadrantKey[]).forEach((qKey) => {
    const container = getEl(QUADRANT_GRID_IDS[qKey]);
    container.innerHTML = '';
    const rows = WORDS_BY_QUADRANT[qKey];
    rows.forEach((row, ri) => {
      row.forEach((text) => {
        const cell = document.createElement('div');
        cell.className = `word-cell r${ri}`;
        cell.textContent = text;
        cell.dataset.index = String(globalIndex);
        container.appendChild(cell);
        globalIndex += 1;
      });
    });
  });
}

/** 根据滑块值渲染四象限、黄点，并高亮最近的词 */
export function showResult(): void {
  buildGrid();

  const aliasEl = getEl('result-alias');
  aliasEl.textContent = state.alias ? `关于「${state.alias}」` : '';

  const dotX = ((state.valX + 1) / 2) * 100;
  const dotY = ((1 - state.valY) / 2) * 100;
  const dot = getEl('user-dot');
  dot.style.left = `${dotX}%`;
  dot.style.top = `${dotY}%`;

  const distances = ALL_WORDS.map((w, i) => ({
    i,
    d: Math.hypot(w.x - state.valX, w.y - state.valY),
  }));
  distances.sort((a, b) => a.d - b.d);
  const nearby = new Set(distances.slice(0, NEARBY_COUNT).map((d) => d.i));

  document.querySelectorAll('.word-cell').forEach((el, i) => {
    if (!nearby.has(i)) return;
    el.classList.add('nearby');
    el.addEventListener('click', () => selectWord(ALL_WORDS[i]!));
  });

  goTo('page-result');
}

function selectWord(word: WordItem): void {
  const finalWord = getEl('final-word');
  finalWord.textContent = word.text;
  finalWord.className = `final-word ${FINAL_COLOR_CLASS[word.q]}`;

  const finalAlias = getEl('final-alias');
  finalAlias.textContent = state.alias ? `你和「${state.alias}」的此刻` : '你的此刻';

  goTo('page-final');
}
