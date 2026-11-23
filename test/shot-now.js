// Shots of the page as it stands: menu, and a map in a few modes, at the size of the owner's window.
const { chromium } = require('playwright');
(async () => {
  const W = +process.env.W || 1536, H = +process.env.H || 602, TAG = process.env.TAG || 'now';
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: W, height: H } })).newPage(); const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:8765/index.html'); await page.waitForSelector('.mapcard'); await page.waitForTimeout(600);
  await page.screenshot({ path: `shots/${TAG}-menu.png` }); await page.screenshot({ path: `shots/${TAG}-menu-full.png`, fullPage: true });
  await page.click('.mapcard[data-id="gresland"] [data-act="open"]'); await page.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().econ, null, { timeout: 40000 });
  for (const m of (process.env.MODES || 'view terrain river city climate econ').split(' ')) {
    await page.click(`#modes button[data-mode="${m}"]`); await page.waitForTimeout(500); await page.mouse.move(W * 0.55, H * 0.6); await page.waitForTimeout(250);
    await page.screenshot({ path: `shots/${TAG}-${m}.png` });
  }
  console.log('errors', errs.length, errs.slice(0, 3).join(' | '));
  await browser.close();
})().catch(e => { console.error('TEST FAILED', e.message.slice(0, 700)); process.exit(1); });
