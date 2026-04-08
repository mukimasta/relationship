/** 四象限：左上 / 右上 / 左下 / 右下 */
export type QuadrantKey = 'tl' | 'tr' | 'bl' | 'br';

/** 每个词在抽象坐标系中的位置（与滑块 valX/valY 同尺度） */
export interface WordItem {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly q: QuadrantKey;
  readonly ri: number;
  readonly ci: number;
}
