const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 1360, height: 1100 } })).newPage();
  await page.goto('http://localhost:8765/index.html'); await page.waitForSelector('.mapcard');
  await page.click('.mapcard [data-act="open"]'); await page.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().econ, null, { timeout: 40000 });
  await page.click('#modes button[data-mode="econ"]'); await page.click('#ecoTab button[data-t="gdp"]'); await page.waitForTimeout(500);
  await page.locator('#ecocard').screenshot({ path: '/home/claude/mme/shots/60-gdp-card.png' });
  await browser.close();
})();
