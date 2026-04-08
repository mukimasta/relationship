/** 主界面静态星尘：随机位置、固定、不动画 */
export function fillStardust(container: HTMLElement): void {
  const frag = document.createDocumentFragment();
  const n = 110 + ((Math.random() * 45) | 0);
  for (let i = 0; i < n; i++) {
    const s = document.createElement('div');
    s.className = 'stardust';
    s.style.left = `${Math.random() * 100}%`;
    s.style.top = `${Math.random() * 100}%`;
    s.style.opacity = String(0.035 + Math.random() * 0.09);
    const sz = 1 + Math.random() * 1.2;
    s.style.width = `${sz}px`;
    s.style.height = `${sz}px`;
    frag.appendChild(s);
  }
  container.appendChild(frag);
}
