import type { Ring } from '../model/person';

/** viewBox 0 0 100 100，圆心 */
export const CX = 50;
export const CY = 50;

/** 两条可见轨道：第一道与内/中分界一致；第二道略放大，外缘仍落在可落点范围内 */
export const CIRCLE_R = [16, 40] as const;

/** 各圈落点环带 [min, max]，内圈更「挤」，外圈更疏 */
export const BANDS: Record<Ring, { min: number; max: number }> = {
  inner: { min: 7, max: 15 },
  middle: { min: 17, max: 31 },
  outer: { min: 33, max: 50 },
};

const THRESH = [16, 32] as const;

/** 三圈名称：均在正上方，沿半径错开 */
const UP = -Math.PI / 2;
export const RING_LABELS: readonly { text: string; angle: number; rad: number }[] = [
  { text: '内圈', angle: UP, rad: 11 },
  { text: '中圈', angle: UP, rad: 24 },
  { text: '外圈', angle: UP, rad: 41 },
];

export function ringFromRadius(r: number): Ring {
  if (r < THRESH[0]) return 'inner';
  if (r < THRESH[1]) return 'middle';
  return 'outer';
}

export function clampRadToRing(ring: Ring, rad: number): number {
  const { min, max } = BANDS[ring];
  return Math.max(min, Math.min(max, rad));
}

export function polarToXY(angle: number, rad: number): { x: number; y: number } {
  return {
    x: CX + rad * Math.cos(angle),
    y: CY + rad * Math.sin(angle),
  };
}

export function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}
