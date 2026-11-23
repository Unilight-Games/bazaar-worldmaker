const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push('PAGEERR ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 5).join('\n')));
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
  const st = () => page.evaluate(() => MME.shell.cur.rt.state());
  await page.goto('http://localhost:8765/index.html'); await page.waitForSelector('.mapcard');
  await page.click('#newBtn'); await page.fill('#nmTitle', 'เมืองทดสอบ'); await page.waitForTimeout(300); await page.click('#nmCreate');
  await page.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable, null, { timeout: 30000 });
  await page.waitForTimeout(1200); await page.screenshot({ path: 'shots/10-sea.png' });
  const t = await page.evaluate(() => { const t0 = performance.now(); window.__ed.rebuildAll(); return performance.now() - t0; }); console.log('rebuildAll ms', Math.round(t));
  await page.click('#modes button[data-mode="city"]');
  const box = await page.locator('#map').boundingBox(); console.log('box', JSON.stringify(box));
  // find land hexes on screen
  const pts = await page.evaluate(() => { const ed = window.__ed.ED; const r = document.getElementById('map').getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; });
  for (const [fx, fy, nm] of [[0.42, 0.5, 'อัลฟา'], [0.6, 0.45, 'เบตา'], [0.5, 0.62, 'แกมมา'], [0.3, 0.55, 'เดลตา']]) {
    await page.mouse.move(box.x + box.width * fx, box.y + box.height * fy); await page.mouse.down(); await page.waitForTimeout(40); await page.mouse.up(); await page.waitForTimeout(350);
    const info = await page.evaluate(() => ({ n: window.__ed.ED.cities.length, form: !document.getElementById('cityForm').classList.contains('pane-off'), toast: document.getElementById('toast').textContent, focus: document.activeElement && document.activeElement.id }));
    console.log(nm, JSON.stringify(info));
    if (info.form) { await page.fill('#cfName', nm); await page.keyboard.press('Enter'); await page.waitForTimeout(150); await page.keyboard.press('Escape'); await page.waitForTimeout(150); }
  }
  console.log('cities', (await st()).cities, (await st()).status);
  await page.click('#modes button[data-mode="route"]'); await page.click('#rtLoose').catch(() => {}); await page.waitForTimeout(600);
  await page.click('#modes button[data-mode="trade"]'); await page.waitForTimeout(2500); await page.screenshot({ path: 'shots/11-trade.png' });
  await page.click('#modes button[data-mode="climate"]'); await page.waitForTimeout(900); await page.screenshot({ path: 'shots/12-climate.png' });
  console.log('tradecard', (await page.textContent('#tradebody')).slice(0, 160));
  console.log('ERRORS', errs.length); for (const e of errs.slice(0, 10)) console.log(e);
  await browser.close();
})().catch(e => { console.error('TEST FAILED', e.message.slice(0, 600)); process.exit(1); });
