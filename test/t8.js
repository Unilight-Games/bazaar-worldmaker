const { chromium } = require('./_fit');
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  const A = await ctx.newPage(), B = await ctx.newPage(); const errs = [];
  for (const [n, p] of [['A', A], ['B', B]]) p.on('pageerror', e => errs.push(n + ' PAGEERR ' + e.message));
  const st = p => p.evaluate(() => MME.shell.cur.rt.state());
  const ready = p => p.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable, null, { timeout: 40000 });
  await A.goto('http://localhost:8765/index.html?fit=0'); await A.waitForSelector('.mapcard'); await B.goto('http://localhost:8765/index.html?fit=0'); await B.waitForSelector('.mapcard');
  await A.click('#newBtn'); await A.waitForTimeout(300); await A.click('#nmCreate'); await ready(A); await A.waitForTimeout(600);
  await A.click('#roomOpen'); await A.fill('#roomNameIn', 'เจ้าของ'); await A.keyboard.press('Enter'); await A.waitForSelector('#roomPanel:not([hidden])'); const code = (await A.textContent('#roomCode')).trim();
  await B.fill('#myName', 'เพื่อน'); await B.fill('#joinCode', code); await B.click('#joinBtn'); await ready(B); await B.waitForTimeout(800);
  await A.bringToFront(); await A.click('#modes button[data-mode="econ"]'); await A.click('#ecoTab button[data-t="states"]'); await A.click('#ecobody [data-a="snew"]');
  let box = await A.locator('#map').boundingBox(); await A.mouse.move(box.x + 400, box.y + 300); await A.mouse.down(); await A.mouse.move(box.x + 460, box.y + 330); await A.mouse.up();
  await A.waitForTimeout(2500); let a = await st(A), b = await st(B); console.log('host adds a state and paints: A', a.states, a.cellsSet, '| B', b.states, b.cellsSet, a.states === b.states && a.cellsSet === b.cellsSet && b.cellsSet > 0 ? 'SYNC OK' : 'MISMATCH');
  await B.bringToFront(); await B.click('#modes button[data-mode="econ"]'); await B.click('#ecobody .egood'); await B.$eval('#ecobody [data-f="pct"]', el => { el.value = 0; el.dispatchEvent(new Event('change', { bubbles: true })); });
  await B.click('#ecobody [data-a="gnew"]'); await B.waitForTimeout(3000); a = await st(A); b = await st(B); console.log('guest edits goods: A goods', a.goods, 'B goods', b.goods, a.goods === b.goods && a.goods === 55 ? 'SYNC OK' : 'MISMATCH');
  await A.evaluate(() => window.scrollTo(0, 0)); await A.click('#modes button[data-mode="econ"]'); await A.click('#ecoTab button[data-t="cats"]'); await A.click('#ecobody [data-a="unew"]'); await B.waitForTimeout(3000); a = await st(A); b = await st(B); console.log('host adds a category: A cats', a.cats, 'B cats', b.cats, a.cats === 18 && b.cats === 18 ? 'SYNC OK' : 'DIFFER'); await A.evaluate(() => window.scrollTo(0, 0));
  // the climate by hand: the host raises ground, the guest sets the winter mean, both ends agree
  const drag = async (pg, fx, fy) => { const box = await pg.locator('#map').boundingBox(); await pg.mouse.move(box.x + box.width * fx, box.y + box.height * fy); await pg.mouse.down(); await pg.mouse.move(box.x + box.width * fx + 4, box.y + box.height * fy + 3); await pg.mouse.up(); };
  await A.click('#modes button[data-mode="climate"]'); await A.click('#clLayer button[data-k="h"]'); await A.click('#clTool button[data-t="up"]'); await drag(A, 0.42, 0.5);
  await B.click('#modes button[data-mode="climate"]'); await B.waitForTimeout(2500); await B.fill('#clW', '-20'); await B.dispatchEvent('#clW', 'change'); await B.click('#clLayer button[data-k="p"]'); await B.click('#clTool button[data-t="down"]'); await B.evaluate(() => window.scrollTo(0, 0)); await B.waitForTimeout(200); await drag(B, 0.42, 0.5);
  await A.waitForTimeout(3500); a = await st(A); b = await st(B); console.log('climate: A', a.clim.slice(0, 4).join(' '), '| B', b.clim.slice(0, 4).join(' '), a.clim.slice(0, 4).join() === b.clim.slice(0, 4).join() && a.clim[0] > 0 && a.clim[1] > 0 ? 'SAME' : 'DIFFER');
  const ch = p => p.evaluate(() => MME.sync.hash('climate', MME.shell.cur.db.known('climate'))); console.log('climate hash', await ch(A), await ch(B));
  const hashes = p => p.evaluate(() => MME.sync.hash('economy', MME.shell.cur.db.known('economy'))); console.log('economy hash', await hashes(A), await hashes(B));
  console.log('ERRORS', errs.length, errs.slice(0, 4).join(' | ')); await browser.close();
})().catch(e => { console.error('TEST FAILED', e.message.slice(0, 500)); process.exit(1); });
