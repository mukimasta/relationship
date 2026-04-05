/**
 * 用本机 Chrome 跑一遍主要交互，输出多张截图到 preview-steps/
 * 用法：先起静态服务，再 npm run preview:interactive
 *   PORT=8765 npm run preview:interactive
 */
import puppeteer from 'puppeteer-core';
import { mkdir, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || '8765';
const BASE = `http://127.0.0.1:${PORT}/`;
const OUT_DIR = join(__dirname, 'preview-steps');

const CHROME =
  process.env.CHROME_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function shot(page, name) {
  const path = join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage: true });
  console.log('wrote', path);
}

/** 在元素内拖一段，满足滑块「摸过才解锁」 */
async function dragInSlider(page, selector, fromRatio, toRatio) {
  const h = await page.$(selector);
  if (!h) throw new Error('missing ' + selector);
  const box = await h.boundingBox();
  if (!box) throw new Error('no box ' + selector);
  const x0 = box.x + box.width * fromRatio;
  const x1 = box.x + box.width * toRatio;
  const y = box.y + box.height / 2;
  await page.mouse.move(x0, y);
  await page.mouse.down();
  await page.mouse.move(x1, y, { steps: 8 });
  await page.mouse.up();
}

async function dragVerticalSlider(page, selector, fromRatio, toRatio) {
  const h = await page.$(selector);
  if (!h) throw new Error('missing ' + selector);
  const box = await h.boundingBox();
  if (!box) throw new Error('no box ' + selector);
  const x = box.x + box.width / 2;
  const y0 = box.y + box.height * fromRatio;
  const y1 = box.y + box.height * toRatio;
  await page.mouse.move(x, y0);
  await page.mouse.down();
  await page.mouse.move(x, y1, { steps: 8 });
  await page.mouse.up();
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    defaultViewport: { width: 390, height: 844, deviceScaleFactor: 2 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  const res = await page.goto(BASE, { waitUntil: 'load', timeout: 20000 });
  if (!res || !res.ok()) {
    throw new Error(
      `无法打开 ${BASE}（请先在该目录执行: python3 -m http.server ${PORT} --bind 127.0.0.1）`
    );
  }

  await page.waitForSelector('#page-welcome.active', { timeout: 5000 });
  await shot(page, '01-welcome');

  await page.click('#page-welcome .btn');
  await sleep(450);
  await shot(page, '02-alias');

  await page.click('.skip-link');
  await sleep(450);
  await shot(page, '03-slider-h');

  await dragInSlider(page, '#h-slider', 0.5, 0.2);
  await sleep(200);
  await page.click('#btn-h-next:not(.disabled)');
  await sleep(450);
  await shot(page, '04-slider-v');

  await dragVerticalSlider(page, '#v-slider', 0.5, 0.35);
  await sleep(200);
  await page.click('#btn-v-next:not(.disabled)');
  await sleep(500);
  await shot(page, '05-result');

  await page.waitForSelector('.word-cell.nearby', { timeout: 5000 });
  await page.click('.word-cell.nearby');
  await sleep(450);
  await shot(page, '06-final');

  await browser.close();
  console.log('完成：preview-steps/ 下共 6 张交互截图');
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
