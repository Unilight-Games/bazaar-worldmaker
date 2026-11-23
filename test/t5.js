const { chromium } = require('./_fit');
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push('PAGEERR ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 5).join('\n')));
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
  const st = () => page.evaluate(() => MME.shell.cur.rt.state());
  const settle = async () => { let v = -1; for (let i = 0; i < 30; i++) { await page.waitForTimeout(400); const s = await st(); if (s.ver === v) return s; v = s.ver; } return st(); };
  await page.goto('http://localhost:8765/index.html?fit=0'); await page.waitForSelector('.mapcard');
  await page.click('#newBtn'); await page.fill('#nmTitle', 'เศรษฐกิจทดสอบ'); await page.fill('#nmSeed', '4242'); await page.dispatchEvent('#nmSeed', 'input'); await page.waitForTimeout(300); await page.click('#nmCreate');
  await page.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable, null, { timeout: 30000 });
  await page.waitForTimeout(800);
  await page.click('#modes button[data-mode="city"]');
  let box = await page.locator('#map').boundingBox();
  const spots = [[0.42, 0.5, 'อัลฟา'], [0.3, 0.55, 'เดลตา'], [0.6, 0.45, 'เบตา'], [0.5, 0.62, 'แกมมา'], [0.36, 0.42, 'เอปไซลอน'], [0.64, 0.56, 'ซีตา']];
  for (const [fx, fy, nm] of spots) { await page.mouse.move(box.x + box.width * fx, box.y + box.height * fy); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(300); if (await page.isVisible('#cfName')) { await page.fill('#cfName', nm); await page.keyboard.press('Enter'); await page.keyboard.press('Escape'); await page.waitForTimeout(100); } }
  await page.click('#modes button[data-mode="route"]'); await page.click('#rtLoose').catch(() => {});
  let s = await settle(); console.log('base: cities', s.cities, 'goods', s.goods, 'flows', s.flows, 'vol', s.vol, 'made', s.made);
  // goods: turn the first good off, then add a custom good with a rule
  await page.click('#modes button[data-mode="econ"]'); await page.waitForSelector('#ecocard:not([hidden])');
  await page.click('#ecobody .egood'); console.log('editing', await page.textContent('#ecobody .eform h3'));
  await page.fill('#ecobody [data-f="pct"]', '0').catch(async () => { await page.$eval('#ecobody [data-f="pct"]', el => { el.value = 0; el.dispatchEvent(new Event('change', { bubbles: true })); }); });
  await page.$eval('#ecobody [data-f="pct"]', el => { el.value = 0; el.dispatchEvent(new Event('change', { bubbles: true })); });
  s = await settle(); console.log('wheat at 0%: made', s.made, 'vol', s.vol);
  await page.click('#ecobody [data-a="greset"]'); s = await settle(); console.log('reset: made', s.made);
  await page.click('#ecobody [data-a="gnew"]'); await page.fill('#ecobody [data-f="name"]', 'เห็ดทรัฟเฟิล'); await page.dispatchEvent('#ecobody [data-f="name"]', 'change');
  await page.click('#ecobody .echip[data-b="o"]'); await page.click('#ecobody .echip[data-b="g"]');   // broadleaf only
  await page.check('#ecobody .eterm [data-f="r"]'); await page.fill('#ecobody .eterm [data-f="m"]', '2'); await page.dispatchEvent('#ecobody .eterm [data-f="m"]', 'change');
  s = await settle(); console.log('custom good: goods', s.goods, '|', (await page.textContent('#ecobody .eform .tr.w')).trim());
  await page.screenshot({ path: 'shots/30-goods.png' });
  // states: two states over the two halves, then rivals
  await page.click('#ecoTab button[data-t="states"]'); await page.click('#ecobody [data-a="snew"]'); await page.click('#ecobody [data-a="snew"]');
  box = await page.locator('#map').boundingBox();
  const paint = async (key, pts) => { await page.click(`#ecoPaintSeg button[data-p="${key}"]`); await page.click('#ecoBrush button[data-n="3"]'); for (const [fx, fy] of pts) { box = await page.locator('#map').boundingBox(); await page.mouse.move(box.x + box.width * fx - 30, box.y + box.height * fy - 20); await page.mouse.down(); for (let k = 0; k <= 6; k++) await page.mouse.move(box.x + box.width * fx - 30 + k * 10, box.y + box.height * fy - 20 + k * 7); await page.mouse.up(); await page.waitForTimeout(80); } };
  await paint('A', [[0.42, 0.5], [0.3, 0.55], [0.36, 0.42]]); await paint('B', [[0.6, 0.45], [0.5, 0.62], [0.64, 0.56]]);
  s = await settle(); console.log('states', s.states, 'cells', s.cellsSet, '|', s.cst, '| flows', s.flows, 'vol', s.vol);
  await page.screenshot({ path: 'shots/31-states.png' });
  await page.selectOption('#ecobody [data-s="A"] [data-f="srel"]', 'rival'); s = await settle(); console.log('rivals: flows', s.flows, 'vol', s.vol);
  const cross = await page.evaluate(() => 0);
  await page.selectOption('#ecobody [data-s="A"] [data-f="srel"]', 'ally'); await page.selectOption('#ecobody [data-s="A"] [data-f="ssys"]', 'soc'); await page.selectOption('#ecobody [data-s="B"] [data-f="ssys"]', 'feud'); s = await settle(); console.log('ally, A socialist, B feudal: flows', s.flows, 'vol', s.vol);
  await page.selectOption('#ecobody [data-s="A"] [data-f="ssys"]', 'trad'); await page.selectOption('#ecobody [data-s="B"] [data-f="ssys"]', 'trad'); s = await settle(); console.log('both traditional: flows', s.flows, 'vol', s.vol);
  await page.selectOption('#ecobody [data-s="A"] [data-f="ssys"]', 'cap'); await page.selectOption('#ecobody [data-s="B"] [data-f="ssys"]', 'merc'); s = await settle(); console.log('A capitalist, B mercantilist: flows', s.flows, 'vol', s.vol);
  await page.click('#ecoTab button[data-t="gdp"]'); await page.waitForTimeout(400); console.log('gdp:', (await page.textContent('#ecobody .tr')).trim().slice(0, 160)); console.log('gdp rows', await page.$$eval('#ecobody .etr', a => a.length));
  await page.screenshot({ path: 'shots/32-gdp.png', fullPage: false });
  // people
  await page.click('#modes button[data-mode="city"]'); box = await page.locator('#map').boundingBox();
  await page.mouse.move(box.x + box.width * 0.42, box.y + box.height * 0.5); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(300);
  await page.fill('#cfPop', '120000'); await page.dispatchEvent('#cfPop', 'change'); console.log('hint:', await page.textContent('#cfHint')); await page.keyboard.press('Escape');
  s = await settle(); console.log('pop set |', s.cst);
  // trade line danger
  await page.click('#modes button[data-mode="trade"]'); await page.waitForTimeout(500);
  // persistence: back and reopen
  await page.click('#mmBack'); await page.waitForSelector('.mapcard'); await page.click('.mapcard [data-act="open"]');
  await page.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable, null, { timeout: 30000 }); s = await settle();
  console.log('reopened: states', s.states, 'cells', s.cellsSet, 'goods', s.goods, '|', s.cst);
  console.log('ERRORS', errs.length); for (const e of errs.slice(0, 8)) console.log(e);
  await browser.close();
})().catch(e => { console.error('TEST FAILED', e.message.slice(0, 700)); process.exit(1); });
