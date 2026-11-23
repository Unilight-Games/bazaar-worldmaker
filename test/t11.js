const { chromium } = require('./_fit');
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 1000 } });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push('PAGEERR ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 5).join('\n')));
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
  const st = () => page.evaluate(() => MME.shell.cur.rt.state());
  const settle = async () => { let v = -1; for (let i = 0; i < 30; i++) { await page.waitForTimeout(400); const s = await st(); if (s.ver === v) return s; v = s.ver; } return st(); };
  const line = s => `flows ${s.flows} vol ${s.vol} | relayed ${s.relay[0]} by broker ${s.relay[1]} | danger ${s.dng} | ${s.relay[2]}`;
  const top = () => page.evaluate(() => window.scrollTo(0, 0));
  await page.goto('http://localhost:8765/index.html?fit=0'); await page.waitForSelector('.mapcard');
  await page.click('#newBtn'); await page.fill('#nmTitle', 'ส่งต่อสินค้า'); await page.fill('#nmSeed', '4242'); await page.dispatchEvent('#nmSeed', 'input'); await page.waitForTimeout(300); await page.click('#nmCreate');
  await page.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable, null, { timeout: 30000 });
  await page.waitForTimeout(800);
  await page.click('#modes button[data-mode="city"]');
  let box = await page.locator('#map').boundingBox();
  const spots = [[0.42, 0.5, 'อัลฟา'], [0.3, 0.55, 'เดลตา'], [0.6, 0.45, 'เบตา'], [0.5, 0.62, 'แกมมา'], [0.36, 0.42, 'เอปไซลอน'], [0.64, 0.56, 'ซีตา']];
  for (const [fx, fy, nm] of spots) { await page.mouse.move(box.x + box.width * fx, box.y + box.height * fy); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(300); if (await page.isVisible('#cfName')) { await page.fill('#cfName', nm); if (nm === 'เอปไซลอน') { await page.fill('#cfPop', '3000'); await page.dispatchEvent('#cfPop', 'change'); } await page.keyboard.press('Enter'); await page.keyboard.press('Escape'); await page.waitForTimeout(100); } }
  let s = await settle(); console.log('no states            ', line(s));
  // ---- danger: the estimate, the owner's own level, the switch
  await page.click('#modes button[data-mode="trade"]'); await page.waitForTimeout(400); await top();
  const pt = await page.evaluate(() => MME.shell.cur.rt.test.linkAt(0)); await page.mouse.click(pt[0], pt[1]); await page.waitForTimeout(400);
  s = await st(); console.log('line picked', s.tlsel === pt[2], '| estimate', pt[4], '| options:', (await page.$$eval('#ecoDanger option', a => a.map(o => o.value + '=' + o.textContent).join(' ; '))).slice(0, 260));
  console.log('  why:', await page.$eval('#tradebody', e => (e.textContent.match(/ระบบประเมินจาก[^ผ]*/) || [''])[0]));
  await page.selectOption('#ecoDanger', '3'); s = await settle(); console.log('owner sets level 3   ', line(s));
  await top(); await page.mouse.click(pt[0], pt[1]); await page.waitForTimeout(300); if (!(await page.isVisible('#ecoDanger'))) { await page.mouse.click(pt[0], pt[1]); await page.waitForTimeout(300); }
  await page.selectOption('#ecoDanger', '4'); s = await settle(); console.log('owner sets safe      ', line(s));
  await top(); if (!(await page.isVisible('#ecoAuto'))) { await page.mouse.click(pt[0], pt[1]); await page.waitForTimeout(300); }
  await page.uncheck('#ecoAuto'); s = await settle(); console.log('estimate switched off', line(s));
  await top(); if (!(await page.isVisible('#ecoAuto'))) { await page.mouse.click(pt[0], pt[1]); await page.waitForTimeout(300); }
  await page.check('#ecoAuto'); s = await settle(); console.log('estimate back on     ', line(s));
  // ---- states
  await page.click('#modes button[data-mode="econ"]'); await page.waitForSelector('#ecocard:not([hidden])');
  await page.click('#ecoTab button[data-t="states"]'); for (let i = 0; i < 3; i++) await page.click('#ecobody [data-a="snew"]');
  const blob = async (key, pts) => { await top(); await page.click(`#ecoPaintSeg button[data-p="${key}"]`); await page.click('#ecoBrush button[data-n="3"]'); for (const [fx, fy] of pts) { box = await page.locator('#map').boundingBox(); await page.mouse.move(box.x + box.width * fx - 30, box.y + box.height * fy - 20); await page.mouse.down(); for (let k = 0; k <= 6; k++) await page.mouse.move(box.x + box.width * fx - 30 + k * 10, box.y + box.height * fy - 20 + k * 7); await page.mouse.up(); await page.waitForTimeout(80); } };
  await blob('A', [[0.3, 0.55], [0.36, 0.42]]); await blob('B', [[0.42, 0.5], [0.5, 0.62]]); await blob('C', [[0.6, 0.45], [0.64, 0.56]]);
  s = await settle(); console.log('three states         ', line(s), '\n   ', s.cst);
  const sys = async (k, v) => page.selectOption(`#ecobody [data-s="${k}"] [data-f="ssys"]`, v), rel = async (a, b, v) => page.selectOption(`#ecobody [data-s="${a}"] [data-f="srel"][data-o="${b}"]`, v);
  await rel('A', 'C', 'rival'); s = await settle(); console.log('A rival C, B merc    ', line(s));
  await sys('B', 'cap'); s = await settle(); console.log('A rival C, B cap     ', line(s));
  await rel('A', 'B', 'rival'); s = await settle(); console.log('B also rival of A    ', line(s));
  await rel('A', 'B', ''); await rel('A', 'C', ''); await sys('B', 'merc'); await sys('A', 'soc'); s = await settle(); console.log('A socialist          ', line(s));
  console.log('   capital select:', await page.$$eval('#ecobody [data-s="A"] [data-f="scap"] option', a => a.map(o => o.textContent).join(' ; ')));
  const capv = await page.$$eval('#ecobody [data-s="A"] [data-f="scap"] option', a => a.map(o => o.value).filter(Boolean)); await page.selectOption('#ecobody [data-s="A"] [data-f="scap"]', capv[capv.length - 1]); s = await settle(); console.log('A capital changed    ', line(s));
  await sys('A', 'feud'); s = await settle(); console.log('A feudal             ', line(s)); console.log('   ways:', await page.evaluate(() => [['เอปไซลอน', 'เบตา'], ['เบตา', 'เอปไซลอน'], ['เอปไซลอน', 'เดลตา'], ['เดลตา', 'เบตา']].map(p => MME.shell.cur.rt.test.way(p[0], p[1])).join(' | ')));
  await page.screenshot({ path: 'shots/70-relay.png' });
  // ---- an own category
  await page.click('#ecoTab button[data-t="cats"]'); await page.click('#ecobody [data-a="unew"]'); await page.fill('#ecobody [data-f="uname"]', 'ผ้าไหม'); await page.dispatchEvent('#ecobody [data-f="uname"]', 'change'); await page.fill('#ecobody [data-f="uneed"]', '0.3'); await page.dispatchEvent('#ecobody [data-f="uneed"]', 'change');
  s = await settle(); console.log('own category: cats', s.cats, 'ownvol', s.ownvol);
  await page.click('#ecoTab button[data-t="goods"]'); await page.click('#ecobody .egood'); const gname = await page.textContent('#ecobody .eform h3');
  const uval = await page.$$eval('#ecobody [data-f="cat"] option', a => a.map(o => [o.value, o.textContent]).filter(x => /ผ้าไหม/.test(x[1]))[0][0]); await page.selectOption('#ecobody [data-f="cat"]', uval);
  s = await settle(); console.log('moved', gname, 'into it: cats', s.cats, 'own volume', s.ownvol, '| flows', s.flows, 'vol', s.vol);
  await page.click('#ecoTab button[data-t="gdp"]'); await page.waitForTimeout(300);
  await page.click('#ecoTab button[data-t="cats"]'); await page.screenshot({ path: 'shots/71-cats.png' });
  await page.click('#mmBack'); await page.waitForSelector('.mapcard'); await page.click('.mapcard [data-act="open"]');
  await page.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable, null, { timeout: 30000 }); s = await settle();
  console.log('reopened: cats', s.cats, 'own volume', s.ownvol, line(s));
  await page.click('#modes button[data-mode="econ"]'); await page.click('#ecoTab button[data-t="cats"]'); await page.click('#ecobody [data-a="udel"]'); s = await settle(); console.log('category deleted: cats', s.cats, 'own volume', s.ownvol, 'flows', s.flows);
  await page.keyboard.press('Control+z'); s = await settle(); console.log('ctrl+z: cats', s.cats, 'own volume', s.ownvol);
  console.log('ERRORS', errs.length); for (const e of errs.slice(0, 8)) console.log(e);
  await browser.close();
})().catch(e => { console.error('TEST FAILED', e.message.slice(0, 900)); process.exit(1); });
