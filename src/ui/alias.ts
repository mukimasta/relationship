import { getEl } from '../dom';
import { state } from '../state';
import { goTo } from './navigation';

function displayAlias(): string {
  return state.alias.trim() || 'ta';
}

/** 提交代号并进入第一题滑块 */
export function submitAlias(skip?: boolean): void {
  state.alias = skip ? '' : getEl<HTMLInputElement>('alias-input').value.trim();
  const label = displayAlias();
  getEl('q1-alias').textContent = label;
  getEl('q2-alias').textContent = label;
  goTo('page-slider-h');
}

export function bindAliasPage(): void {
  const input = getEl<HTMLInputElement>('alias-input');
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitAlias();
  });
}
