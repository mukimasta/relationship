import './styles.css';
import { getEl } from './dom';
import { bindAliasPage, submitAlias } from './ui/alias';
import { goTo } from './ui/navigation';
import { initHorizontalSlider, initVerticalSlider } from './ui/sliders';

function init(): void {
  getEl('btn-welcome-start').addEventListener('click', () => goTo('page-alias'));
  getEl('btn-alias-next').addEventListener('click', () => submitAlias());
  getEl('skip-alias').addEventListener('click', () => submitAlias(true));

  const skip = getEl('skip-alias');
  skip.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      submitAlias(true);
    }
  });

  bindAliasPage();
  initHorizontalSlider();
  initVerticalSlider();

  getEl('btn-final-restart').addEventListener('click', () => {
    location.reload();
  });
}

init();
