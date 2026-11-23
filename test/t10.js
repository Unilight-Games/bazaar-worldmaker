const { chromium } = require('./_fit');
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push('PAGEERR ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 5).join('\n')));
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
  const st = () => page.evaluate(() => MME.shell.cur.rt.state());
  const settle = async () => { let v = -1; for (let i = 0; i < 30; i++) { await page.waitForTimeout(400); const s = await st(); if (s.ver === v) return s; v = s.ver; } return st(); };
  const line = s => `flows ${s.flows} vol ${s.vol} | hostile lines ${s.host[0]}/${s.host[2]} worst share ${s.host[1]} total way ${s.host[3]} | eco undo ${s.clim[5]}`;
  await page.goto('http://localhost:8765/index.html?fit=0'); await page.waitForSelector('.mapcard');
  await page.click('#newBtn'); await page.fill('#nmTitle', 'เลี่ยงคู่แข่ง'); await page.fill('#nmSeed', '4242'); await page.dispatchEvent('#nmSeed', 'input'); await page.waitForTimeout(300); await page.click('#nmCreate');
  await page.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable, null, { timeout: 30000 });
  await page.waitForTimeout(800);
  await page.click('#modes button[data-mode="city"]');
  let box = await page.locator('#map').boundingBox();
  for (const [fx, fy, nm] of [[0.3, 0.55, 'ตะวันตก'], [0.64, 0.56, 'ตะวันออก'], [0.34, 0.44, 'ตะวันตกเหนือ']]) { await page.mouse.move(box.x + box.width * fx, box.y + box.height * fy); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(300); if (await page.isVisible('#cfName')) { await page.fill('#cfName', nm); await page.keyboard.press('Enter'); await page.keyboard.press('Escape'); await page.waitForTimeout(100); } }
  let s = await settle(); console.log('no states       ', line(s));
  await page.click('#modes button[data-mode="econ"]'); await page.waitForSelector('#ecocard:not([hidden])');
  await page.click('#ecoTab button[data-t="states"]'); for (let i = 0; i < 3; i++) await page.click('#ecobody [data-a="snew"]');
  const stroke = async (key, x0, y0, x1, y1) => { await page.click(`#ecoPaintSeg button[data-p="${key}"]`); await page.click('#ecoBrush button[data-n="3"]'); box = await page.locator('#map').boundingBox(); await page.mouse.move(box.x + box.width * x0, box.y + box.height * y0); await page.mouse.down(); for (let k = 1; k <= 30; k++) await page.mouse.move(box.x + box.width * (x0 + (x1 - x0) * k / 30), box.y + box.height * (y0 + (y1 - y0) * k / 30)); await page.mouse.up(); await page.waitForTimeout(80); };
  await stroke('A', 0.26, 0.42, 0.36, 0.58); await stroke('A', 0.3, 0.55, 0.36, 0.44); await stroke('C', 0.6, 0.5, 0.68, 0.6);
  for (const x of [0.45, 0.47, 0.49]) await stroke('B', x, 0.38, x, 0.66);
  s = await settle(); console.log('three states    ', line(s), '|', s.cst);
  await page.screenshot({ path: 'shots/50-neutral.png' });
  await page.selectOption('#ecobody [data-s="A"] [data-f="srel"][data-o="B"]', 'rival'); s = await settle(); console.log('A rival B, avoid', line(s));
  await page.screenshot({ path: 'shots/51-avoid.png' });
  await page.evaluate(() => MME.shell.cur.rt.test.avoid(false)); s = await settle(); console.log('same, no avoid  ', line(s));
  await page.screenshot({ path: 'shots/52-noavoid.png' });
  await page.evaluate(() => MME.shell.cur.rt.test.avoid(true)); s = await settle();
  // undo of border and state edits
  const before = s.cellsSet; await page.keyboard.press('Control+z'); s = await settle(); console.log('ctrl+z: rival undone ->', line(s));
  await page.click('#ecoUndo'); s = await st(); console.log('undo btn: cells', before, '->', s.cellsSet);
  await page.click('#ecoRedo'); await page.click('#ecoRedo'); s = await settle(); console.log('redo x2: cells', s.cellsSet, line(s));
  console.log('ERRORS', errs.length); for (const e of errs.slice(0, 8)) console.log(e);
  await browser.close();
})().catch(e => { console.error('TEST FAILED', e.message.slice(0, 700)); process.exit(1); });
