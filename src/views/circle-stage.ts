import { displayColorForAssessment } from '../model/colors';
import type { Person, Ring, RingMove } from '../model/person';
import {
  CIRCLE_R,
  CX,
  CY,
  RING_LABELS,
  clampRadToRing,
  polarToXY,
  ringFromRadius,
} from './geometry';

const LONG_MS = 450;
const TAP_MAX_MS = 420;
const TAP_MAX_PX = 14;

function haptic(ms = 14): void {
  if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(ms);
}

function svgPoint(svg: SVGSVGElement, clientX: number, clientY: number): { x: number; y: number } {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const m = svg.getScreenCTM();
  if (!m) return { x: CX, y: CY };
  const p = pt.matrixTransform(m.inverse());
  return { x: p.x, y: p.y };
}

export interface CircleStageHandlers {
  onSelect: (personId: string) => void;
  onMoveCommit: (
    personId: string,
    next: { ring: Ring; angle: number; rad: number },
    ringMove: RingMove | null,
  ) => void;
}

type Active = {
  id: string;
  startX: number;
  startY: number;
  t0: number;
  longTimer: ReturnType<typeof setTimeout> | null;
  dragging: boolean;
  pointerId: number;
};

export function initCircleStage(
  svg: SVGSVGElement,
  dotsRoot: SVGGElement,
  ringGroup: SVGGElement,
  handlers: CircleStageHandlers,
): void {
  let active: Active | undefined;

  function clearLong(a: Active | undefined): void {
    if (!a || a.longTimer == null) return;
    clearTimeout(a.longTimer);
    a.longTimer = null;
  }

  function setRingsGlow(on: boolean): void {
    ringGroup.classList.toggle('rings-lit', on);
  }

  dotsRoot.addEventListener('pointerdown', (e) => {
    const t = e.target as Element | null;
    const node = t?.closest?.('[data-person-id]') as SVGGElement | null;
    if (!node) return;
    e.preventDefault();
    const id = node.dataset.personId!;
    active = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      t0: performance.now(),
      longTimer: null,
      dragging: false,
      pointerId: e.pointerId,
    };
    active.longTimer = setTimeout(() => {
      if (!active || active.id !== id) return;
      clearLong(active);
      active.dragging = true;
      node.classList.add('dragging');
      setRingsGlow(true);
      haptic(12);
      try {
        node.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }, LONG_MS);
  });

  dotsRoot.addEventListener('pointermove', (e) => {
    if (!active) return;
    const dist = Math.hypot(e.clientX - active.startX, e.clientY - active.startY);
    if (!active.dragging && dist > TAP_MAX_PX) {
      clearLong(active);
    }
    if (!active.dragging) return;
    e.preventDefault();
    const g = dotsRoot.querySelector(`[data-person-id="${active.id}"]`) as SVGGElement | null;
    if (!g) return;
    const { x, y } = svgPoint(svg, e.clientX, e.clientY);
    const dx = x - CX;
    const dy = y - CY;
    const angle = Math.atan2(dy, dx);
    let rad = Math.hypot(dx, dy);
    rad = Math.max(6, Math.min(52, rad));
    g.setAttribute('transform', `translate(${CX + rad * Math.cos(angle)},${CY + rad * Math.sin(angle)})`);
  });

  dotsRoot.addEventListener('pointerup', (e) => {
    if (!active) return;
    const cur = active;
    active = undefined;

    clearLong(cur);

    const g = dotsRoot.querySelector(`[data-person-id="${cur.id}"]`) as SVGGElement | null;
    if (g) {
      g.classList.remove('dragging');
      try {
        g.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }

    if (cur.dragging) {
      const { x, y } = svgPoint(svg, e.clientX, e.clientY);
      const dx = x - CX;
      const dy = y - CY;
      const angle = Math.atan2(dy, dx);
      let rad = Math.hypot(dx, dy);
      rad = Math.max(6, Math.min(52, rad));
      const ring = ringFromRadius(rad);
      const clamped = clampRadToRing(ring, rad);
      let ringMove: RingMove | null = null;
      const prevRing = g?.dataset.ring as Ring | undefined;
      if (prevRing && prevRing !== ring) {
        ringMove = { at: Date.now(), from: prevRing, to: ring };
        haptic(18);
      }
      handlers.onMoveCommit(cur.id, { ring, angle, rad: clamped }, ringMove);
      setRingsGlow(false);
      return;
    }

    const dt = performance.now() - cur.t0;
    const dist = Math.hypot(e.clientX - cur.startX, e.clientY - cur.startY);
    if (dt < TAP_MAX_MS && dist < TAP_MAX_PX) {
      handlers.onSelect(cur.id);
    }
  });

  dotsRoot.addEventListener('pointercancel', () => {
    if (!active) return;
    clearLong(active);
    active = undefined;
    setRingsGlow(false);
    document.querySelectorAll('.person-g.dragging').forEach((el) => el.classList.remove('dragging'));
  });
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  if (!m) return null;
  return { r: parseInt(m[1]!, 16), g: parseInt(m[2]!, 16), b: parseInt(m[3]!, 16) };
}

function glowFilterForColor(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return '';
  const { r, g, b } = rgb;
  return `drop-shadow(0 0 2px rgba(${r},${g},${b},0.65)) drop-shadow(0 0 7px rgba(${r},${g},${b},0.35))`;
}

export function renderDots(dotsRoot: SVGGElement, people: Person[]): void {
  dotsRoot.innerHTML = '';
  for (const p of people) {
    const { x, y } = polarToXY(p.angle, p.rad);
    const last = p.assessments[p.assessments.length - 1];
    const fill = last ? displayColorForAssessment(last) : '#888';
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.classList.add('person-g');
    g.setAttribute('data-person-id', p.id);
    g.setAttribute('data-ring', p.ring);
    g.setAttribute('transform', `translate(${x},${y})`);

    const inner = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    inner.classList.add('person-dot-wrap');

    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('r', '2.75');
    c.setAttribute('fill', fill);
    c.setAttribute('class', 'person-dot-c');
    c.setAttribute('style', `filter: ${glowFilterForColor(fill)}`);

    const tx = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    tx.setAttribute('x', '4');
    tx.setAttribute('y', '1.2');
    tx.setAttribute('class', 'person-dot-label');
    tx.textContent = p.alias;

    inner.appendChild(c);
    inner.appendChild(tx);
    g.appendChild(inner);
    dotsRoot.appendChild(g);
  }
}

function drawRingLabels(labelsGroup: SVGGElement): void {
  const NS = 'http://www.w3.org/2000/svg';
  labelsGroup.innerHTML = '';
  for (const { text, angle, rad } of RING_LABELS) {
    const x = CX + rad * Math.cos(angle);
    const y = CY + rad * Math.sin(angle);
    const t = document.createElementNS(NS, 'text');
    t.setAttribute('x', String(x));
    t.setAttribute('y', String(y));
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('dominant-baseline', 'middle');
    t.setAttribute('class', 'ring-label');
    t.textContent = text;
    labelsGroup.appendChild(t);
  }
}

export function drawRingLines(ringGroup: SVGGElement, labelsGroup: SVGGElement): void {
  ringGroup.innerHTML = '';
  CIRCLE_R.forEach((r, i) => {
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('cx', String(CX));
    c.setAttribute('cy', String(CY));
    c.setAttribute('r', String(r));
    c.setAttribute('class', `ring-line ring-${i + 1}`);
    ringGroup.appendChild(c);
  });
  drawRingLabels(labelsGroup);
}
