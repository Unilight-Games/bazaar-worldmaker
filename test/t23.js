// the notice about the browser: silent on Google Chrome on the hosted page, spoken on any other browser, and always in the one-file build
const { chromium, firefox, webkit } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 1360, height: 900 } })).newPage(); page.on('pageerror', e => console.log('PAGEERR', e.message));
  await page.goto('http://localhost:8765/index.html'); await page.waitForSelector('.mapcard');
  console.log('headless chrome:', JSON.stringify(await page.evaluate(() => [MME.browser, navigator.userAgentData && navigator.userAgentData.brands, navigator.userAgent])), '| notice shown', await page.isVisible('#brVeil'));
  // as another browser would report itself
  const c2 = await browser.newContext({ viewport: { width: 1360, height: 900 }, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0' }); const p2 = await c2.newPage();
  await p2.addInitScript(() => { window.MME_NOTICE_TEST = 1; try { Object.defineProperty(navigator, 'userAgentData', { get: () => undefined }); } catch (e) {} });
  await p2.goto('http://localhost:8765/index.html'); await p2.waitForSelector('.mapcard');
  console.log('as Firefox: notice shown', await p2.isVisible('#brVeil'), '|', (await p2.textContent('#brNow')).slice(0, 90), '| offline text hidden', await p2.$eval('#brOff', e => e.hidden));
  await p2.screenshot({ path: 'shots/90-browser-notice.png' });
  await p2.click('#brOk'); console.log('  after ok: shown', await p2.isVisible('#brVeil')); await p2.reload(); await p2.waitForSelector('.mapcard'); console.log('  next visit without the tick: shown', await p2.isVisible('#brVeil'));
  await p2.check('#brKeep'); await p2.click('#brOk'); await p2.reload(); await p2.waitForSelector('.mapcard'); console.log('  next visit after the tick: shown', await p2.isVisible('#brVeil'));
  // the one-file build, on Chrome
  const c3 = await browser.newContext({ viewport: { width: 1360, height: 900 } }); const p3 = await c3.newPage(); await p3.addInitScript(() => { window.MME_NOTICE_TEST = 1; Object.defineProperty(navigator, 'userAgentData', { get: () => ({ brands: [{ brand: 'Google Chrome', version: '142' }, { brand: 'Chromium', version: '142' }] }) }); });
  const c4 = await browser.newContext({ viewport: { width: 1360, height: 900 } }); const p4 = await c4.newPage(); await p4.addInitScript(() => { window.MME_NOTICE_TEST = 1; Object.defineProperty(navigator, 'userAgentData', { get: () => ({ brands: [{ brand: 'Google Chrome', version: '142' }] }) }); }); await p4.goto('http://localhost:8765/index.html'); await p4.waitForSelector('.mapcard'); console.log('hosted page on Google Chrome: notice shown', await p4.isVisible('#brVeil'));
  await p3.goto('file:///home/claude/mme/dist-offline/bazaar-worldmaker-offline.html'); await p3.waitForSelector('.mapcard', { timeout: 30000 });
  console.log('offline file on Chrome: notice shown', await p3.isVisible('#brVeil'), '|', (await p3.textContent('#brNow')).slice(0, 80), '| offline text shown', !(await p3.$eval('#brOff', e => e.hidden)));
  await p3.screenshot({ path: 'shots/91-offline-notice.png' });
  await browser.close();
})();
