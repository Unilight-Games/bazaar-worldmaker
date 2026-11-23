const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 1360, height: 900 } })).newPage();
  page.on('pageerror', e => console.log('PAGEERR', e.message));
  await page.goto('http://localhost:8765/index.html'); await page.waitForSelector('.mapcard');
  await page.click('#newBtn'); await page.fill('#nmSeed', '4242'); await page.dispatchEvent('#nmSeed', 'input'); await page.waitForTimeout(300); await page.click('#nmCreate');
  await page.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable, null, { timeout: 30000 });
  const by = async tag => { const b = await page.locator('#map').boundingBox(); console.log(tag, 'map y', Math.round(b.y), 'scrollY', await page.evaluate(() => Math.round(scrollY))); return b; };
  await by('view'); await page.click('#modes button[data-mode="city"]'); let box = await by('city');
  await page.mouse.move(box.x + box.width * 0.42, box.y + box.height * 0.5); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(300); await by('city form open');
  await page.fill('#cfName', 'ก'); await page.keyboard.press('Enter'); await by('after enter'); await page.keyboard.press('Escape'); await by('after escape');
  await page.click('#modes button[data-mode="econ"]'); await by('econ'); await page.click('#ecoTab button[data-t="states"]'); await page.click('#ecobody [data-a="snew"]'); await by('econ states');
  await browser.close();
})().catch(e => { console.error('TEST FAILED', e.message.slice(0, 500)); process.exit(1); });
