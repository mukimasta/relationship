import type { Person, Ring } from '../model/person';
import { BANDS, distance, polarToXY } from '../views/geometry';

const MIN_GAP = 3.2;

export function randomPlacement(ring: Ring, others: Person[]): { angle: number; rad: number } {
  const band = BANDS[ring];
  for (let k = 0; k < 100; k++) {
    const angle = Math.random() * Math.PI * 2;
    const rad = band.min + Math.random() * (band.max - band.min);
    const p = polarToXY(angle, rad);
    let ok = true;
    for (const o of others) {
      const q = polarToXY(o.angle, o.rad);
      if (distance(p.x, p.y, q.x, q.y) < MIN_GAP) {
        ok = false;
        break;
      }
    }
    if (ok) return { angle, rad };
  }
  return { angle: Math.random() * Math.PI * 2, rad: (band.min + band.max) / 2 };
}
