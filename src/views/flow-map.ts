import { displayColorForAssessment } from '../model/colors';
import type { Assessment, Person } from '../model/person';
import { buildWordCells } from './word-picker';

function xyFromAssessment(a: Assessment): { x: number; y: number } {
  return {
    x: ((a.valX + 1) / 2) * 100,
    y: ((1 - a.valY) / 2) * 100,
  };
}

/** 同一人物时间轴内：越早越淡，越新越实 */
function opacityInSeries(series: Assessment[], a: Assessment): number {
  if (series.length <= 1) return 1;
  const sorted = [...series].sort((x, y) => x.at - y.at);
  const t0 = sorted[0]!.at;
  const t1 = sorted[sorted.length - 1]!.at;
  if (t1 === t0) return 1;
  return 0.12 + 0.88 * ((a.at - t0) / (t1 - t0));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  if (!m) return null;
  return {
    r: parseInt(m[1]!, 16),
    g: parseInt(m[2]!, 16),
    b: parseInt(m[3]!, 16),
  };
}

function withAlpha(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
}

function flowMapHtml(): string {
  return `
<div class="flow-map-overlay" id="flow-map-overlay" role="dialog" aria-modal="true" aria-labelledby="flow-map-title">
  <div class="flow-map-panel">
    <button type="button" class="flow-map-close" id="flow-map-close" aria-label="关闭">×</button>
    <h2 class="flow-map-title" id="flow-map-title">关系位置与流转</h2>
    <p class="flow-map-hint">所有人在词表平面上的测评位置；同一人按时间连线，越早越淡、越新越实。</p>
    <div id="flow-map-empty" class="flow-map-empty" hidden>还没有测评记录。先添加一个人并完成感受流程吧。</div>
    <div class="grid-wrapper flow-map-grid-wrap" id="flow-map-grid-section" hidden>
      <div class="grid-axis-label grid-axis-top">高投入</div>
      <div class="grid-axis-label grid-axis-bottom">低投入</div>
      <div class="grid-axis-label grid-axis-left">消耗</div>
      <div class="grid-axis-label grid-axis-right">滋养</div>
      <div class="grid-container flow-grid" id="flow-grid-root">
        <div class="flow-quadrants" id="flow-quadrants"></div>
        <svg class="flow-lines-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <g id="flow-lines-g"></g>
        </svg>
        <div class="flow-dots-layer" id="flow-dots-layer"></div>
      </div>
    </div>
  </div>
</div>`.trim();
}

export function openFlowMap(people: Person[], onClose?: () => void): void {
  const host = document.createElement('div');
  host.innerHTML = flowMapHtml();
  const overlay = host.firstElementChild as HTMLElement;
  document.body.appendChild(overlay);
  document.body.classList.add('flow-map-open');

  const emptyEl = document.getElementById('flow-map-empty');
  const sectionEl = document.getElementById('flow-map-grid-section');
  const quadrants = document.getElementById('flow-quadrants');
  const linesG = document.getElementById('flow-lines-g');
  const dotsLayer = document.getElementById('flow-dots-layer');

  if (!quadrants || !linesG || !dotsLayer || !emptyEl || !sectionEl) {
    document.body.classList.remove('flow-map-open');
    overlay.remove();
    return;
  }

  function onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') close();
  }

  function close(): void {
    window.removeEventListener('keydown', onKeyDown);
    document.body.classList.remove('flow-map-open');
    overlay.remove();
    onClose?.();
  }

  const totalAssessments = people.reduce((n, p) => n + p.assessments.length, 0);
  if (totalAssessments === 0) {
    emptyEl.hidden = false;
    sectionEl.hidden = true;
  } else {
    emptyEl.hidden = true;
    sectionEl.hidden = false;
    buildWordCells(quadrants);

    const svgNS = 'http://www.w3.org/2000/svg';

    for (const person of people) {
      const series = [...person.assessments].sort((a, b) => a.at - b.at);
      if (series.length < 2) continue;

      const lineColor = displayColorForAssessment(series[series.length - 1]!);

      for (let i = 0; i < series.length - 1; i++) {
        const a = series[i]!;
        const b = series[i + 1]!;
        const p1 = xyFromAssessment(a);
        const p2 = xyFromAssessment(b);
        const o1 = opacityInSeries(series, a);
        const o2 = opacityInSeries(series, b);
        const lineOp = ((o1 + o2) / 2) * 0.92;

        const line = document.createElementNS(svgNS, 'line');
        line.setAttribute('x1', String(p1.x));
        line.setAttribute('y1', String(p1.y));
        line.setAttribute('x2', String(p2.x));
        line.setAttribute('y2', String(p2.y));
        line.setAttribute('stroke', lineColor);
        line.setAttribute('stroke-width', '0.55');
        line.setAttribute('stroke-linecap', 'round');
        line.setAttribute('stroke-opacity', String(lineOp));
        linesG.appendChild(line);
      }
    }

    for (const person of people) {
      const series = [...person.assessments].sort((a, b) => a.at - b.at);
      if (series.length === 0) continue;

      for (const a of series) {
        const { x, y } = xyFromAssessment(a);
        const op = opacityInSeries(series, a);
        const fillHex = displayColorForAssessment(a);

        const marker = document.createElement('div');
        marker.className = 'flow-marker';
        marker.style.left = `${x}%`;
        marker.style.top = `${y}%`;
        marker.title = `${person.alias} · ${a.word} · ${new Date(a.at).toLocaleString()}`;

        const dot = document.createElement('div');
        dot.className = 'flow-dot';
        dot.style.background = withAlpha(fillHex, op);
        dot.style.borderColor = `rgba(255,255,255,${0.35 + op * 0.55})`;

        const label = document.createElement('div');
        label.className = 'flow-label';
        label.textContent = person.alias;
        label.style.opacity = String(op);

        marker.appendChild(dot);
        marker.appendChild(label);
        dotsLayer.appendChild(marker);
      }
    }
  }

  window.addEventListener('keydown', onKeyDown);

  overlay.querySelector('#flow-map-close')?.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
}
