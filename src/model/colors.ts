import { ALL_WORDS } from '../data/word-model';
import type { Assessment } from '../model/person';
import type { QuadrantKey, WordItem } from '../types';

/**
 * 与 `styles.css` 中 `.quadrant-grid.q-* .word-cell.r*` 的 background 一致（每格一行 r0–r3）。
 * 圆点 / 历史条 / 确认页文字均用该色，保证与二维词表上看到的格子同色。
 */
const GRID_CELL_BG: Record<QuadrantKey, readonly [string, string, string, string]> = {
  tl: ['#b5312a', '#cc4040', '#d96b6b', '#e8a0a0'],
  tr: ['#d97519', '#e89540', '#f0b570', '#f8d8a8'],
  bl: ['#7095b5', '#5578a0', '#3a5d85', '#1e3a5f'],
  br: ['#9dd09d', '#72b872', '#4da04d', '#358835'],
};

export function gridCellColor(word: WordItem): string {
  return GRID_CELL_BG[word.q][word.ri]!;
}

/** 根据测评里保存的词 + 象限解析格子色；找不到时退回已存 color（兼容旧数据）。 */
export function displayColorForAssessment(a: Assessment): string {
  const w = ALL_WORDS.find((x) => x.text === a.word && x.q === a.q);
  if (w) return gridCellColor(w);
  return a.color;
}

/**
 * 连续色谱（滑块→色）：仅 relationshipColor 使用。
 * 四角参考：高投入+消耗、高投入+滋养、低投入+消耗、低投入+滋养。
 */
const NEUTRAL = { r: 118, g: 112, b: 108 };

const TL = { r: 88, g: 38, b: 72 };
const TR = { r: 218, g: 165, b: 72 };
const BL = { r: 118, g: 124, b: 132 };
const BR = { r: 118, g: 198, b: 178 };

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpRgb(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
  t: number,
): { r: number; g: number; b: number } {
  return {
    r: Math.round(lerp(a.r, b.r, t)),
    g: Math.round(lerp(a.g, b.g, t)),
    b: Math.round(lerp(a.b, b.b, t)),
  };
}

function toHex(c: { r: number; g: number; b: number }): string {
  const h = (n: number) => n.toString(16).padStart(2, '0');
  return `#${h(c.r)}${h(c.g)}${h(c.b)}`;
}

/** 仅由滑块插值（备用，非词格展示路径） */
export function relationshipColor(valX: number, valY: number): string {
  const u = (valX + 1) / 2;
  const v = (valY + 1) / 2;
  const top = lerpRgb(TL, TR, u);
  const bottom = lerpRgb(BL, BR, u);
  const saturated = lerpRgb(top, bottom, v);
  const dist = Math.min(1, Math.hypot(valX, valY) / Math.SQRT2);
  const mixed = lerpRgb(NEUTRAL, saturated, dist);
  return toHex(mixed);
}
