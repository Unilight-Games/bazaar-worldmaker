// the one-file build, opened from disk
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 }, offline: true });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/fonts|ERR_INTERNET_DISCONNECTED|Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
  const url = 'file://' + require('path').resolve(__dirname, '../dist-offline/bazaar-worldmaker-offline.html');
  await page.goto(url); await page.waitForSelector('.mapcard', { timeout: 30000 });
  console.log('library:', await page.$$eval('.mapcard h3', a => a.map(x => x.textContent).join(' ; ')), '| persistent store:', await page.evaluate(() => MME.store.persistent));
  await page.click('.mapcard[data-id="gresland"] [data-act="open"]'); await page.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().econ, null, { timeout: 40000 });
  let s = await page.evaluate(() => MME.shell.cur.rt.state()); console.log('gresland: land', s.land, 'cities', s.cities, 'flows', s.flows, 'vol', s.vol);
  await page.click('#mmBack'); await page.waitForSelector('.mapcard');
  await page.click('#newBtn'); await page.fill('#nmTitle', 'ออฟไลน์'); await page.click('#nmCreate');
  await page.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable, null, { timeout: 30000 }); await page.waitForTimeout(1200);
  await page.click('#mmBack'); await page.waitForSelector('.mapcard');
  await page.reload(); await page.waitForSelector('.mapcard', { timeout: 30000 });
  console.log('after reload:', await page.$$eval('.mapcard h3', a => a.map(x => x.textContent).join(' ; ')));
  await page.click('#tuStart'); await page.waitForSelector('#tutor:not([hidden])', { timeout: 30000 }); await page.waitForTimeout(800);
  console.log('lesson: figure loaded', await page.evaluate(() => { const i = document.getElementById('tuImg'); return i.complete && i.naturalWidth; }), '|', await page.textContent('#tuChap'));
  await page.screenshot({ path: 'shots/90-offline-lesson.png' });
  console.log('ERRORS', errs.length, errs.slice(0, 4).join(' | '));
  await browser.close();
})().catch(e => { console.error('TEST FAILED', e.message.slice(0, 900)); process.exit(1); });
