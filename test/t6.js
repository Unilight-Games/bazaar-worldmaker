const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 1360, height: 900 } })).newPage();
  page.on('pageerror', e => console.log('PAGEERR', e.message)); page.on('console', m => { if (/^DBG/.test(m.text())) console.log(m.text()); });
  const st = () => page.evaluate(() => MME.shell.cur.rt.state());
  await page.goto('http://localhost:8765/index.html'); await page.waitForSelector('.mapcard');
  await page.click('#newBtn'); await page.fill('#nmSeed', '4242'); await page.dispatchEvent('#nmSeed', 'input'); await page.waitForTimeout(300); await page.click('#nmCreate');
  await page.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable, null, { timeout: 30000 });
  await page.click('#modes button[data-mode="econ"]'); await page.click('#ecoTab button[data-t="states"]'); await page.click('#ecobody [data-a="snew"]'); await page.click('#ecobody [data-a="snew"]');
  await page.evaluate(() => document.addEventListener('pointerdown', e => console.log('DBG down target', e.target.id || e.target.className, 'at', Math.round(e.clientX), Math.round(e.clientY), 'scrollY', Math.round(scrollY)), true));
  for (const [key, fx, fy] of [['A', 0.42, 0.5], ['A', 0.3, 0.55], ['B', 0.6, 0.45], ['B', 0.5, 0.62]]) {
    await page.click(`#ecoPaintSeg button[data-p="${key}"]`);
    const box = await page.locator('#map').boundingBox(); console.log('box', Math.round(box.y), Math.round(box.height), 'pressed', await page.$$eval('#ecoPaintSeg button[aria-pressed="true"]', a => a.map(x => x.dataset.p)));
    await page.mouse.move(box.x + box.width * fx, box.y + box.height * fy); await page.mouse.down(); await page.mouse.move(box.x + box.width * fx + 30, box.y + box.height * fy + 10); await page.mouse.up(); await page.waitForTimeout(200);
    console.log(key, 'cells', (await st()).cellsSet);
  }
  await browser.close();
})().catch(e => { console.error('TEST FAILED', e.message.slice(0, 500)); process.exit(1); });
