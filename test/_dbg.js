const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 1000 } })).newPage(); page.on('pageerror', e => console.log('PAGEERR', e.message));
  await page.goto('http://localhost:8765/index.html'); await page.waitForSelector('.mapcard');
  await page.click('#newBtn'); await page.fill('#nmTitle', 'พับตัวเลือก'); await page.fill('#nmSeed', '12'); await page.dispatchEvent('#nmSeed', 'input'); await page.waitForTimeout(300); await page.click('#nmCreate');
  await page.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable && MME.shell.cur.rt.state().econ, null, { timeout: 90000 });
  await page.click('#modes button[data-mode="climate"]'); await page.waitForTimeout(500);
  const h = () => page.evaluate(() => Math.round(document.getElementById('opts').getBoundingClientRect().height));
  console.log('dock', await page.evaluate(() => document.getElementById('mapscreen').className), '| options height with the pointer in them', await h());
  await page.mouse.move(700, 700); await page.waitForTimeout(400); console.log('pointer on the map: height', await h()); await page.screenshot({ path: 'shots/92-opts-folded.png' });
  await page.hover('#clSeason'); await page.waitForTimeout(400); console.log('pointer back in: height', await h()); await page.screenshot({ path: 'shots/93-opts-open.png' });
  await page.click('#clSeason button:nth-child(4)'); await page.mouse.move(700, 700); await page.waitForTimeout(600); await page.screenshot({ path: 'shots/94-season-summer.png' });
  await page.keyboard.press('Tab'); await page.waitForTimeout(300); console.log('keyboard focus inside: height', await h(), '| focused', await page.evaluate(() => document.activeElement.id || document.activeElement.textContent.slice(0, 20)));
  await browser.close();
})();
