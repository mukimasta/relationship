/**
 * 多视口比例跑通到结果页，截图 + 校验黄点是否相对整张 grid 定位（非单象限）
 *   PORT=8765 npm run preview:matrix
 */
import puppeteer from 'puppeteer-core';
import { mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || '8765';
const BASE = `http://127.0.0.1:${PORT}/`;
const OUT_DIR = join(__dirname, 'preview-matrix');

const CHROME =
  process.env.CHROME_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

/** 手机竖屏、平板、常见笔电、宽屏 */
const VIEWPORTS = [
  { width: 390, height: 844, name: 'phone' },
  { width: 375, height: 812, name: 'phone-narrow' },
  { width: 820, height: 1180, name: 'tablet-portrait' },
  { width: 1280, height: 800, name: 'laptop' },
  { width: 1440, height: 900, name: 'laptop-wide' },
  { width: 1920, height: 1080, name: 'desktop-fhd' },
  { width: 2560, height: 1440, name: 'desktop-qhd' },
];

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function dragInSlider(page, selector, fromRatio, toRatio) {
  const h = await page.$(selector);
  const box = await h.boundingBox();
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width * fromRatio, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * toRatio, y, { steps: 8 });
  await page.mouse.up();
}

async function dragVerticalSlider(page, selector, fromRatio, toRatio) {
  const h = await page.$(selector);
  const box = await h.boundingBox();
  const x = box.x + box.width / 2;
  await page.mouse.move(x, box.y + box.height * fromRatio);
  await page.mouse.down();
  await page.mouse.move(x, box.y + box.height * toRatio, { steps: 8 });
  await page.mouse.up();
}

async function goToResult(page) {
  await page.goto(BASE, { waitUntil: 'load', timeout: 20000 });
  await page.waitForSelector('#page-welcome.active', { timeout: 5000 });
  await page.click('#page-welcome .btn');
  await sleep(400);
  await page.click('.skip-link');
  await sleep(400);
  await dragInSlider(page, '#h-slider', 0.5, 0.2);
  await sleep(150);
  await page.click('#btn-h-next:not(.disabled)');
  await sleep(400);
  await dragVerticalSlider(page, '#v-slider', 0.5, 0.35);
  await sleep(150);
  await page.click('#btn-v-next:not(.disabled)');
  await page.waitForSelector('#page-result.active', { timeout: 5000 });
  await sleep(400);
}

async function measureDotVsGrid(page) {
  return page.evaluate(() => {
    const gc = document.getElementById('grid-container');
    const dot = document.getElementById('user-dot');
    if (!gc || !dot) return { ok: false, reason: 'missing element' };

    const gr = gc.getBoundingClientRect();
    const dr = dot.getBoundingClientRect();
    const leftPct = parseFloat(dot.style.left) / 100;
    const topPct = parseFloat(dot.style.top) / 100;
    const expectedCx = gr.left + leftPct * gr.width;
    const expectedCy = gr.top + topPct * gr.height;
    const actualCx = dr.left + dr.width / 2;
    const actualCy = dr.top + dr.height / 2;
    const err = Math.hypot(expectedCx - actualCx, expectedCy - actualCy);

    return {
      ok: err < 2.5,
      errPx: Math.round(err * 100) / 100,
      gridW: Math.round(gr.width),
      gridH: Math.round(gr.height),
      leftPct: dot.style.left,
      topPct: dot.style.top,
    };
  });
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  let failed = 0;

  for (const vp of VIEWPORTS) {
    const page = await browser.newPage();
    await page.setViewport({
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1,
    });

    try {
      await goToResult(page);
      const m = await measureDotVsGrid(page);
      const tag = `${vp.width}x${vp.height}-${vp.name}`;
      await page.screenshot({
        path: join(OUT_DIR, `${tag}-result.png`),
        fullPage: true,
      });

      if (!m.ok) {
        failed++;
        console.error(`FAIL ${tag}`, m);
      } else {
        console.log(`ok ${tag} err=${m.errPx}px grid=${m.gridW}x${m.gridH}`);
      }
    } catch (e) {
      failed++;
      console.error(`FAIL ${vp.name}`, e.message || e);
    }

    await page.close();
  }

  await browser.close();

  if (failed) {
    console.error(`\n共 ${failed} 个视口未通过（黄点与 grid 偏差应 <2.5px）`);
    process.exit(1);
  }
  console.log(`\n全部 ${VIEWPORTS.length} 个视口通过，截图在 ${OUT_DIR}/`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
