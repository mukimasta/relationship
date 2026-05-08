import { displayColorForAssessment } from '../model/colors';
import type { Person, Ring, RingMove } from '../model/person';
import {
  CIRCLE_R,
  CX,
  CY,
  getRingLabels,
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

const SVG_NS = 'http://www.w3.org/2000/svg';

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  if (!m) return null;
  return { r: parseInt(m[1]!, 16), g: parseInt(m[2]!, 16), b: parseInt(m[3]!, 16) };
}

function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

/** 与白色混合，t∈[0,1] */
function lightenHex(hex: string, t: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const { r, g, b } = rgb;
  return rgbToHex(r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t);
}

/** 与黑色混合 */
function darkenHex(hex: string, t: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const { r, g, b } = rgb;
  return rgbToHex(r * (1 - t), g * (1 - t), b * (1 - t));
}

function glowFilterForColor(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return '';
  const { r, g, b } = rgb;
  return `drop-shadow(0 0 1.5px rgba(${r},${g},${b},0.42)) drop-shadow(0 0 4px rgba(${r},${g},${b},0.22))`;
}

function appendRadialDotGradient(defs: SVGDefsElement, id: string, baseHex: string): void {
  const hi = lightenHex(baseHex, 0.42);
  const lo = darkenHex(baseHex, 0.22);
  const rad = document.createElementNS(SVG_NS, 'radialGradient');
  rad.setAttribute('id', id);
  rad.setAttribute('cx', '32%');
  rad.setAttribute('cy', '28%');
  rad.setAttribute('r', '100%');
  rad.setAttribute('fx', '28%');
  rad.setAttribute('fy', '22%');
  rad.setAttribute('gradientUnits', 'objectBoundingBox');

  const s0 = document.createElementNS(SVG_NS, 'stop');
  s0.setAttribute('offset', '0%');
  s0.setAttribute('stop-color', hi);

  const s1 = document.createElementNS(SVG_NS, 'stop');
  s1.setAttribute('offset', '52%');
  s1.setAttribute('stop-color', baseHex);

  const s2 = document.createElementNS(SVG_NS, 'stop');
  s2.setAttribute('offset', '100%');
  s2.setAttribute('stop-color', lo);

  rad.appendChild(s0);
  rad.appendChild(s1);
  rad.appendChild(s2);
  defs.appendChild(rad);
}

export function renderDots(dotsRoot: SVGGElement, people: Person[]): void {
  dotsRoot.innerHTML = '';

  const defs = document.createElementNS(SVG_NS, 'defs');
  const clip = document.createElementNS(SVG_NS, 'clipPath');
  clip.setAttribute('id', 'person-dot-clip');
  const clipC = document.createElementNS(SVG_NS, 'circle');
  clipC.setAttribute('cx', '0');
  clipC.setAttribute('cy', '0');
  clipC.setAttribute('r', '1.3');
  clip.appendChild(clipC);
  defs.appendChild(clip);

  for (const p of people) {
    const last = p.assessments[p.assessments.length - 1];
    const base = last ? displayColorForAssessment(last) : '#888';
    appendRadialDotGradient(defs, `dot-grad-${p.id}`, base);
  }
  dotsRoot.appendChild(defs);

  for (const p of people) {
    const { x, y } = polarToXY(p.angle, p.rad);
    const last = p.assessments[p.assessments.length - 1];
    const base = last ? displayColorForAssessment(last) : '#888';

    const g = document.createElementNS(SVG_NS, 'g');
    g.classList.add('person-g');
    g.setAttribute('data-person-id', p.id);
    g.setAttribute('data-ring', p.ring);
    g.setAttribute('transform', `translate(${x},${y})`);

    const inner = document.createElementNS(SVG_NS, 'g');
    inner.classList.add('person-dot-wrap');
    inner.setAttribute('style', `filter: ${glowFilterForColor(base)}`);

    const shell = document.createElementNS(SVG_NS, 'g');
    shell.setAttribute('clip-path', 'url(#person-dot-clip)');

    const c = document.createElementNS(SVG_NS, 'circle');
    c.setAttribute('r', '1.3');
    c.setAttribute('fill', `url(#dot-grad-${p.id})`);
    c.setAttribute('class', 'person-dot-c');
    c.setAttribute('stroke', 'rgba(255,255,255,0.38)');
    c.setAttribute('stroke-width', '0.21');

    const hi = document.createElementNS(SVG_NS, 'circle');
    hi.setAttribute('cx', '-0.62');
    hi.setAttribute('cy', '-0.62');
    hi.setAttribute('r', '0.81');
    hi.setAttribute('class', 'person-dot-highlight');
    hi.setAttribute('fill', 'rgba(255,255,255,0.2)');

    shell.appendChild(c);
    shell.appendChild(hi);

    const tx = document.createElementNS(SVG_NS, 'text');
    tx.setAttribute('x', '2.68');
    tx.setAttribute('y', '0.58');
    tx.setAttribute('class', 'person-dot-label');
    tx.textContent = p.alias;

    inner.appendChild(shell);
    inner.appendChild(tx);
    g.appendChild(inner);
    dotsRoot.appendChild(g);
  }
}

function drawRingLabels(labelsGroup: SVGGElement): void {
  const NS = 'http://www.w3.org/2000/svg';
  labelsGroup.innerHTML = '';
  for (const { text, angle, rad } of getRingLabels()) {
    const x = CX + rad * Math.cos(angle);
    const y = CY + rad * Math.sin(angle);
    const el = document.createElementNS(NS, 'text');
    el.setAttribute('x', String(x));
    el.setAttribute('y', String(y));
    el.setAttribute('text-anchor', 'middle');
    el.setAttribute('dominant-baseline', 'middle');
    el.setAttribute('class', 'ring-label');
    el.textContent = text;
    labelsGroup.appendChild(el);
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
