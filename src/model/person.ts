import type { QuadrantKey } from '../types';

export type Ring = 'inner' | 'middle' | 'outer';

/** 单次测评记录 */
export interface Assessment {
  id: string;
  at: number;
  word: string;
  q: QuadrantKey;
  valX: number;
  valY: number;
  color: string;
}

/** 手动移圈记录 */
export interface RingMove {
  at: number;
  from: Ring;
  to: Ring;
}

/** 一个人物在同心圆上的状态 */
export interface Person {
  id: string;
  alias: string;
  ring: Ring;
  /** 弧度 0～2π */
  angle: number;
  /** 距圆心的距离（与 viewBox 单位一致，约 0～52） */
  rad: number;
  assessments: Assessment[];
  ringMoves: RingMove[];
}

export interface AppData {
  version: 1;
  people: Person[];
}
