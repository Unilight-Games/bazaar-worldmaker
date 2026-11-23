const { chromium } = require('./_fit');
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push('PAGEERR ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
  const st = () => page.evaluate(() => MME.shell.cur && MME.shell.cur.rt ? MME.shell.cur.rt.state() : null);
  await page.goto('http://localhost:8765/index.html?fit=0'); await page.waitForSelector('.mapcard');
  console.log('library cards', await page.$$eval('.mapcard h3', a => a.map(x => x.textContent)));
  await page.screenshot({ path: 'shots/01-menu.png' });
  await page.click('#newBtn'); await page.fill('#nmTitle', 'ทดสอบทวีปใหม่'); await page.waitForTimeout(400);
  console.log('preview', await page.textContent('#nmStat'));
  await page.screenshot({ path: 'shots/02-new.png' });
  let t0 = Date.now(); await page.click('#nmCreate');
  await page.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable, null, { timeout: 30000 });
  console.log('open new map ms', Date.now() - t0, JSON.stringify(await st()));
  await page.waitForTimeout(1500); await page.screenshot({ path: 'shots/03-map.png' });
  // automatic mountains and rivers
  await page.click('#modes button[data-mode="terrain"]'); const a = await st();
  t0 = Date.now(); await page.click('#autoMt'); await page.waitForTimeout(300); const b = await st(); console.log('autoMt ms', Date.now() - t0, 'undo', a.undo, '->', b.undo, await page.textContent('#toast'));
  await page.click('#modes button[data-mode="river"]'); t0 = Date.now(); await page.click('#autoRiv'); await page.waitForTimeout(300); const c = await st(); console.log('autoRiv ms', Date.now() - t0, 'rivers', b.rivers, '->', c.rivers, await page.textContent('#toast'));
  await page.keyboard.press('Control+z'); await page.waitForTimeout(300); console.log('after undo rivers', (await st()).rivers);
  // keys
  await page.click('#modes button[data-mode="view"]'); await page.click('#zin'); await page.click('#zin'); await page.click('#zin'); const v0 = (await st()).view;
  await page.keyboard.down('KeyD'); await page.waitForTimeout(400); await page.keyboard.up('KeyD'); await page.keyboard.down('ArrowDown'); await page.waitForTimeout(400); await page.keyboard.up('ArrowDown');
  const v1 = (await st()).view; console.log('pan', v0.map(x => +x.toFixed(1)), '->', v1.map(x => +x.toFixed(1)), 'scale', await page.textContent('#scalebar'));
  await page.screenshot({ path: 'shots/04-zoom.png' });
  // a city, the trade and the climate
  await page.click('#zfit').catch(() => {});
  await page.click('#modes button[data-mode="city"]');
  const box = await page.locator('#map').boundingBox();
  const land = await page.evaluate(() => { const ed = window.__ed; return null; });
  for (const [fx, fy, nm] of [[0.45, 0.45, 'อัลฟา'], [0.55, 0.5, 'เบตา'], [0.5, 0.6, 'แกมมา']]) { await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy); await page.waitForTimeout(300); await page.fill('#cfName', nm); await page.keyboard.press('Enter'); await page.waitForTimeout(200); await page.click('#cfDone').catch(() => {}); await page.waitForTimeout(100); }
  console.log('cities', (await st()).cities);
  await page.click('#modes button[data-mode="trade"]'); await page.waitForTimeout(2500); console.log('trade', JSON.stringify(await st()).slice(0, 200)); await page.screenshot({ path: 'shots/05-trade.png' });
  console.log('cats', (await page.$$eval('#tdCat option', o => o.map(x => x.textContent))).join(' | ').slice(0, 330));
  await page.click('#modes button[data-mode="climate"]'); await page.waitForTimeout(800); await page.screenshot({ path: 'shots/06-climate.png' });
  await page.click('#modes button[data-mode="view"]'); await page.waitForTimeout(900);
  t0 = Date.now(); await page.click('#mmBack'); await page.waitForSelector('.mapcard'); console.log('back ms', Date.now() - t0, await page.$$eval('.mapcard h3', a => a.map(x => x.textContent)));
  await page.screenshot({ path: 'shots/07-menu2.png' });
  console.log('cards', JSON.stringify(await page.$$eval('.mapcard', a => a.map(x => x.querySelector('h3').textContent.slice(0, 18) + ' / ' + x.querySelectorAll('.mt')[0].textContent.slice(0, 48) + ' / ' + x.querySelector('.bk').textContent))));
  // Gresland
  t0 = Date.now(); await page.click('.mapcard[data-id="gresland"] [data-act="open"]');
  await page.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable, null, { timeout: 40000 });
  await page.waitForTimeout(3000); console.log('gresland ms', Date.now() - t0, JSON.stringify(await st()).slice(0, 260)); await page.screenshot({ path: 'shots/08-gresland.png' });
  await page.click('#mmBack'); await page.waitForSelector('.mapcard');
  console.log('ERRORS', errs.length); for (const e of errs.slice(0, 12)) console.log(e);
  await browser.close();
})().catch(e => { console.error('TEST FAILED', e); process.exit(1); });
