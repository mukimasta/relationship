import { t, tWord } from '../i18n';
import { gridCellColor } from '../model/colors';
import type { Assessment, Person, Ring } from '../model/person';
import { newId } from '../lib/id';
import { randomPlacement } from '../lib/placement';
import { attachHorizontalSlider } from '../lib/slider-horizontal';
import { attachVerticalSlider } from '../lib/slider-vertical';
import { loadData, saveData } from '../storage/persist';
import type { WordItem } from '../types';
import { buildWordCells, highlightNearby, positionUserDot } from './word-picker';

export type WizardMode = { kind: 'add' } | { kind: 'retest'; personId: string };

export interface WizardResult {
  dataChanged: boolean;
}

let valX = 0;
let valY = 0;
type SliderHandle = { destroy: () => void };
let sliders: SliderHandle[] = [];

function destroySliders(): void {
  sliders.forEach((s) => s.destroy());
  sliders = [];
}

function wizardHtml(): string {
  return `
<div class="wizard-overlay" id="wizard-overlay" role="dialog" aria-modal="true">
  <div class="wizard-panel">
    <button type="button" class="wizard-close" id="wizard-close" aria-label="${t('close')}">×</button>

    <section class="wiz-step" data-wiz-step="alias">
      <div class="alias-prompt">${t('aliasPrompt')}</div>
      <input type="text" class="alias-input" id="wiz-alias" maxlength="24" autocomplete="off" placeholder="${t('aliasPlaceholder')}" />
      <button type="button" class="btn" id="wiz-next-alias">${t('nextStep')}</button>
    </section>

    <section class="wiz-step" data-wiz-step="ring" hidden>
      <div class="alias-prompt">${t('ringPrompt')}</div>
      <p class="ring-hint">${t('ringHint')}</p>
      <div class="ring-pick">
        <button type="button" class="ring-card" data-ring="inner">
          <span class="ring-card-title">${t('ringInner')}</span>
          <span class="ring-card-desc">${t('ringInnerDesc')}</span>
        </button>
        <button type="button" class="ring-card" data-ring="middle">
          <span class="ring-card-title">${t('ringMiddle')}</span>
          <span class="ring-card-desc">${t('ringMiddleDesc')}</span>
        </button>
        <button type="button" class="ring-card" data-ring="outer">
          <span class="ring-card-title">${t('ringOuter')}</span>
          <span class="ring-card-desc">${t('ringOuterDesc')}</span>
        </button>
      </div>
    </section>

    <section class="wiz-step slider-page" data-wiz-step="s1" hidden>
      <div class="slider-question">${t('s1Question1')}<span class="alias-name" id="wiz-q1-alias">${t('defaultAlias')}</span>${t('s1Question2')}</div>
      <div class="h-slider-wrap" id="wiz-h-slider">
        <div class="h-slider-track"></div>
        <div class="h-slider-fill-left" id="wiz-h-fill-left"></div>
        <div class="h-slider-fill-right" id="wiz-h-fill-right"></div>
        <div class="slider-thumb h-slider-thumb" id="wiz-h-thumb"></div>
      </div>
      <div class="slider-labels">
        <span class="slider-label">${t('sliderTight')}</span>
        <span class="slider-label">${t('sliderLoose')}</span>
      </div>
      <div style="height:40px"></div>
      <div class="slider-btn-wrap">
        <button type="button" class="btn disabled" id="wiz-next-s1">${t('nextStep')}</button>
      </div>
    </section>

    <section class="wiz-step slider-page" data-wiz-step="s2" hidden>
      <div class="slider-question">${t('s2Question1')}<span class="alias-name" id="wiz-q2-alias">${t('defaultAlias')}</span>${t('s2Question2')}</div>
      <div class="v-slider-container">
        <div class="v-labels">
          <span class="v-label">${t('sliderAlways')}</span>
          <span class="v-label">${t('sliderSometimes')}</span>
        </div>
        <div class="v-slider-wrap" id="wiz-v-slider">
          <div class="v-slider-track"></div>
          <div class="v-slider-fill-top" id="wiz-v-fill-top"></div>
          <div class="v-slider-fill-bottom" id="wiz-v-fill-bottom"></div>
          <div class="slider-thumb v-slider-thumb" id="wiz-v-thumb"></div>
        </div>
      </div>
      <div class="slider-btn-wrap">
        <button type="button" class="btn disabled" id="wiz-next-s2">${t('seeResult')}</button>
      </div>
    </section>

    <section class="wiz-step wiz-step-result" data-wiz-step="words" hidden>
      <div class="result-prompt wiz-result-prompt">${t('pickPrompt')}</div>
      <div class="grid-wrapper wiz-grid-wrap">
        <div class="grid-axis-label grid-axis-top">${t('axisTop')}</div>
        <div class="grid-axis-label grid-axis-bottom">${t('axisBottom')}</div>
        <div class="grid-axis-label grid-axis-left">${t('axisLeft')}</div>
        <div class="grid-axis-label grid-axis-right">${t('axisRight')}</div>
        <div class="grid-container" id="wiz-grid-container"></div>
      </div>
    </section>

    <section class="wiz-step wiz-step-confirm" data-wiz-step="confirm" hidden>
      <div class="final-alias" id="wiz-confirm-alias"></div>
      <div class="final-word" id="wiz-confirm-word"></div>
      <p class="wiz-confirm-sub">${t('confirmSub')}</p>
    </section>
  </div>
</div>`;
}

function showStep(root: HTMLElement, step: string): void {
  root.querySelectorAll('.wiz-step').forEach((el) => {
    const s = el as HTMLElement;
    s.hidden = s.dataset.wizStep !== step;
  });
}

export function openWizard(
  mode: WizardMode,
  onDone: (r: WizardResult) => void,
): void {
  const host = document.createElement('div');
  host.innerHTML = wizardHtml().trim();
  const overlay = host.firstElementChild as HTMLElement;
  document.body.appendChild(overlay);
  document.body.classList.add('wizard-open');

  valX = 0;
  valY = 0;

  const data = loadData();

  if (mode.kind === 'retest') {
    const exists = data.people.some((x) => x.id === mode.personId);
    if (!exists) {
      document.body.classList.remove('wizard-open');
      overlay.remove();
      onDone({ dataChanged: false });
      return;
    }
  }

  let alias = '';
  let ring: Ring = 'middle';
  let personIdRetest: string | null = mode.kind === 'retest' ? mode.personId : null;
  let pickedWord: WordItem | null = null;
  let result: WizardResult = { dataChanged: false };

  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') close();
  };

  const close = (): void => {
    destroySliders();
    window.removeEventListener('keydown', onKeyDown);
    document.body.classList.remove('wizard-open');
    overlay.remove();
    onDone(result);
  };

  const steps = [
    'alias',
    'ring',
    's1',
    's2',
    'words',
    'confirm',
  ] as const;

  let stepIndex = 0;
  if (mode.kind === 'retest') {
    stepIndex = 2;
  }

  function goStep(i: number): void {
    stepIndex = i;
    const name = steps[stepIndex];
    if (!name) return;
    showStep(overlay, name);
    if (name === 's1') {
      mountS1();
    } else if (name === 's2') {
      mountS2();
    } else if (name === 'words') {
      mountWords();
    } else if (name === 'confirm') {
      runConfirm();
    }
  }

  function syncAliasLabels(): void {
    const d = alias || t('defaultAlias');
    document.getElementById('wiz-q1-alias')!.textContent = d;
    document.getElementById('wiz-q2-alias')!.textContent = d;
  }

  function mountS1(): void {
    destroySliders();
    syncAliasLabels();
    const s = attachHorizontalSlider(
      'wiz-h-slider',
      'wiz-h-thumb',
      'wiz-h-fill-left',
      'wiz-h-fill-right',
      (v) => {
        valX = v;
      },
      () => {
        document.getElementById('wiz-next-s1')?.classList.remove('disabled');
      },
    );
    sliders.push(s);
    document.getElementById('wiz-next-s1')?.addEventListener(
      'click',
      () => {
        goStep(3);
      },
      { once: true },
    );
  }

  function mountS2(): void {
    destroySliders();
    syncAliasLabels();
    const s = attachVerticalSlider(
      'wiz-v-slider',
      'wiz-v-thumb',
      'wiz-v-fill-top',
      'wiz-v-fill-bottom',
      (v) => {
        valY = v;
      },
      () => {
        document.getElementById('wiz-next-s2')?.classList.remove('disabled');
      },
    );
    sliders.push(s);
    document.getElementById('wiz-next-s2')?.addEventListener(
      'click',
      () => {
        goStep(4);
      },
      { once: true },
    );
  }

  function mountWords(): void {
    const grid = document.getElementById('wiz-grid-container');
    if (!grid) return;
    grid.innerHTML = '';
    buildWordCells(grid);
    const dot = document.createElement('div');
    dot.id = 'wiz-user-dot';
    dot.className = 'user-dot';
    grid.appendChild(dot);
    positionUserDot(dot, valX, valY);
    highlightNearby(
      valX,
      valY,
      (w) => {
        pickedWord = w;
        goStep(5);
      },
      overlay,
    );
  }

  function runConfirm(): void {
    if (!pickedWord) {
      goStep(4);
      return;
    }
    const color = gridCellColor(pickedWord);
    const aliasEl = document.getElementById('wiz-confirm-alias');
    const wordEl = document.getElementById('wiz-confirm-word');
    if (aliasEl) {
      aliasEl.textContent = alias ? t('confirmAlias', alias) : t('confirmNoAlias');
    }
    if (wordEl) {
      wordEl.textContent = tWord(pickedWord.text);
      wordEl.style.color = color;
    }

    window.setTimeout(() => {
      const assessment: Assessment = {
        id: newId(),
        at: Date.now(),
        word: pickedWord!.text,
        q: pickedWord!.q,
        valX,
        valY,
        color,
      };

      if (mode.kind === 'add') {
        const person: Person = {
          id: newId(),
          alias: alias || t('defaultAlias'),
          ring,
          ...randomPlacement(ring, data.people),
          assessments: [assessment],
          ringMoves: [],
        };
        data.people.push(person);
      } else {
        const p = data.people.find((x) => x.id === personIdRetest);
        if (p) {
          p.assessments.push(assessment);
        }
      }
      saveData(data);
      result.dataChanged = true;
      close();
    }, 2000);
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  overlay.querySelector('#wizard-close')?.addEventListener('click', close);
  window.addEventListener('keydown', onKeyDown);

  overlay.querySelector('#wiz-next-alias')?.addEventListener('click', () => {
    const input = document.getElementById('wiz-alias') as HTMLInputElement | null;
    alias = input?.value.trim() ?? '';
    goStep(1);
  });

  overlay.querySelectorAll('.ring-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      ring = (btn as HTMLElement).dataset.ring as Ring;
      goStep(2);
    });
  });

  if (mode.kind === 'retest') {
    const p = data.people.find((x) => x.id === personIdRetest)!;
    alias = p.alias;
    goStep(2);
  } else {
    goStep(0);
  }

  const aliasInput = document.getElementById('wiz-alias') as HTMLInputElement | null;
  aliasInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      alias = aliasInput.value.trim();
      goStep(1);
    }
  });
}
