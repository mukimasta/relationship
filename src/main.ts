import './styles.css';
import { getEl } from './dom';
import { fillStardust } from './lib/stardust';
import { displayColorForAssessment } from './model/colors';
import type { Person } from './model/person';
import { clearAllData, loadData, saveData } from './storage/persist';
import {
  drawRingLines,
  initCircleStage,
  renderDots,
} from './views/circle-stage';
import { openFlowMap } from './views/flow-map';
import { openWizard } from './views/wizard';

function fmtTime(at: number): string {
  const d = new Date(at);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function main(): void {
  const svg = getEl<SVGSVGElement>('circles-svg');
  const dotsRoot = getEl<SVGGElement>('dots-root');
  const ringGroup = getEl<SVGGElement>('ring-lines');
  const ringLabels = getEl<SVGGElement>('ring-labels');
  const emptyHint = getEl('empty-hint');
  const stardust = getEl('stardust');
  const stage = getEl('stage');
  const viewport = getEl('viewport');
  const fab = getEl('fab-add');
  const sheetBack = getEl('sheet-backdrop');
  const sheet = getEl('person-sheet');
  const histBack = getEl('history-backdrop');
  const histPanel = getEl('history-panel');

  const sheetAlias = getEl('sheet-alias');
  const sheetWord = getEl('sheet-word');
  const sheetTime = getEl('sheet-time');
  const historyList = getEl('history-list');
  const historyTitle = getEl('history-title');

  let store = loadData();
  let selectedId: string | null = null;

  let scale = 1;
  let tx = 0;
  let ty = 0;

  /**
   * 必须与 CSS 中 #stage 的定位与 translate 一起生效，否则会顶掉居中。
   */
  function applyStageTransform(): void {
    stage.style.transform = `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(${scale})`;
    dotsRoot.classList.toggle(
      'labels-suppress',
      scale < 1.12 && store.people.length > 7,
    );
  }

  function refresh(): void {
    store = loadData();
    renderDots(dotsRoot, store.people);
    emptyHint.hidden = store.people.length > 0;
    dotsRoot.classList.toggle(
      'labels-suppress',
      scale < 1.12 && store.people.length > 7,
    );
  }

  function findPerson(id: string): Person | undefined {
    return store.people.find((p) => p.id === id);
  }

  fillStardust(stardust);
  drawRingLines(ringGroup, ringLabels);
  refresh();

  initCircleStage(svg, dotsRoot, ringGroup, {
    onSelect: (id) => {
      selectedId = id;
      const p = findPerson(id);
      if (!p) return;
      const last = p.assessments[p.assessments.length - 1];
      sheetAlias.textContent = p.alias;
      sheetWord.textContent = last ? `「${last.word}」` : '—';
      sheetTime.textContent = last ? fmtTime(last.at) : '—';
      sheetBack.hidden = false;
      sheet.hidden = false;
    },
    onMoveCommit: (id, next, ringMove) => {
      const p = findPerson(id);
      if (!p) return;
      p.ring = next.ring;
      p.angle = next.angle;
      p.rad = next.rad;
      if (ringMove) p.ringMoves.push(ringMove);
      saveData(store);
      refresh();
    },
  });

  function closeSheet(): void {
    sheetBack.hidden = true;
    sheet.hidden = true;
    selectedId = null;
  }

  sheetBack.addEventListener('click', closeSheet);

  getEl('sheet-retest').addEventListener('click', () => {
    if (!selectedId) return;
    const id = selectedId;
    closeSheet();
    openWizard({ kind: 'retest', personId: id }, (r) => {
      if (r.dataChanged) refresh();
    });
  });

  getEl('sheet-history').addEventListener('click', () => {
    if (!selectedId) return;
    const p = findPerson(selectedId);
    if (!p) return;
    sheet.hidden = true;
    sheetBack.hidden = true;
    historyTitle.textContent = `${p.alias} · 记录`;
    historyList.innerHTML = '';
    const sorted = [...p.assessments].sort((a, b) => b.at - a.at);
    for (const a of sorted) {
      const row = document.createElement('div');
      row.className = 'history-row';
      row.style.borderLeft = `3px solid ${displayColorForAssessment(a)}`;
      row.innerHTML = `<span class="history-word">${a.word}</span><span class="history-meta">${new Date(a.at).toLocaleString()}</span>`;
      historyList.appendChild(row);
    }
    histBack.hidden = false;
    histPanel.hidden = false;
  });

  function closeHistory(): void {
    histBack.hidden = true;
    histPanel.hidden = true;
  }

  histBack.addEventListener('click', closeHistory);
  getEl('history-close').addEventListener('click', closeHistory);

  getEl('btn-flow').addEventListener('click', () => {
    openFlowMap(store.people);
  });

  fab.addEventListener('click', () => {
    openWizard({ kind: 'add' }, (r) => {
      if (r.dataChanged) refresh();
    });
  });

  getEl('btn-clear').addEventListener('click', () => {
    if (
      !confirm(
        '确定清空本地所有人物与测评记录？此操作不可恢复。',
      )
    ) {
      return;
    }
    clearAllData();
    selectedId = null;
    closeSheet();
    closeHistory();
    scale = 1;
    tx = 0;
    ty = 0;
    applyStageTransform();
    refresh();
  });

  /** 双指缩放 + 单指平移（在空白处） */
  let pinchDist = 0;
  viewport.addEventListener(
    'wheel',
    (e) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.92 : 1.08;
      scale = Math.min(3.2, Math.max(0.55, scale * factor));
      applyStageTransform();
    },
    { passive: false },
  );

  viewport.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      const [a, b] = [e.touches[0], e.touches[1]];
      pinchDist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    }
  });

  viewport.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2) {
      const [a, b] = [e.touches[0], e.touches[1]];
      const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      if (pinchDist > 0) {
        const factor = d / pinchDist;
        pinchDist = d;
        scale = Math.min(3.2, Math.max(0.55, scale * factor));
        applyStageTransform();
      }
    }
  });

  let pan = false;
  let panStartX = 0;
  let panStartY = 0;
  let startTx = 0;
  let startTy = 0;

  viewport.addEventListener('pointerdown', (e) => {
    if (document.body.classList.contains('wizard-open')) return;
    if ((e.target as Element).closest?.('.main-dock')) return;
    if ((e.target as Element).closest?.('.person-g')) return;
    if (e.pointerType === 'touch' && (e as PointerEvent).isPrimary === false) return;
    pan = true;
    panStartX = e.clientX;
    panStartY = e.clientY;
    startTx = tx;
    startTy = ty;
    viewport.setPointerCapture(e.pointerId);
  });

  viewport.addEventListener('pointermove', (e) => {
    if (!pan) return;
    tx = startTx + (e.clientX - panStartX);
    ty = startTy + (e.clientY - panStartY);
    applyStageTransform();
  });

  viewport.addEventListener('pointerup', () => {
    pan = false;
  });

  applyStageTransform();
}

main();
