import type { QuadrantKey, WordItem } from '../types';
import { WORDS_BY_QUADRANT } from './words';

/**
 * 将象限内行列映射到抽象坐标。
 * x: -1（消耗）～ +1（滋养）；y: -1（低投入）～ +1（高投入）
 */
function pushQuadrantWords(
  out: WordItem[],
  qKey: QuadrantKey,
  xSign: -1 | 1,
  ySign: -1 | 1,
): void {
  const rows = WORDS_BY_QUADRANT[qKey];
  rows.forEach((row, ri) => {
    row.forEach((text, ci) => {
      const yMag =
        ySign > 0
          ? 0.125 + (3 - ri) * 0.25
          : 0.125 + ri * 0.25;
      const xMag = xSign < 0 ? 0.9 - ci * 0.2 : 0.1 + ci * 0.2;

      out.push({
        text,
        x: xSign * xMag,
        y: ySign * yMag,
        q: qKey,
        ri,
        ci,
      });
    });
  });
}

function buildAllWords(): readonly WordItem[] {
  const list: WordItem[] = [];
  pushQuadrantWords(list, 'tl', -1, 1);
  pushQuadrantWords(list, 'tr', 1, 1);
  pushQuadrantWords(list, 'bl', -1, -1);
  pushQuadrantWords(list, 'br', 1, -1);
  return list;
}

/** 与 DOM 中四象限格子按 tl→tr→bl→br 展开顺序一致 */
export const ALL_WORDS: readonly WordItem[] = buildAllWords();
