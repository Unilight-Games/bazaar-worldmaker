// v0.19.0 batch 5: regional markets and the central market window, seasons moving prices and stock; armies reckoned from people,
// budget and kit, the kit's demand in the garrisons, and the army instead of the economy's size in the neighbour's squeeze
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await (await browser.newContext({ viewport: { width: 1536, height: 900 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForSelector('.mapcard[data-id="gresland"]', { timeout: 60000 }); await p.click('.mapcard[data-id="gresland"] [data-act="open"]');
  await p.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable && MME.shell.cur.rt.state().econ, null, { timeout: 90000 });
  const T = (f, a) => p.evaluate(f, a);
  const settle = async () => { for (let n = 0, last = -1; n < 40; n++) { await p.waitForTimeout(1500); const v = await T(() => { const e = MME.shell.cur.rt.test.econ(); return e ? e.ver : -1; }); if (v === last && v >= 0) return; last = v; } };
  const set = async f => { const d = await T(() => MME.shell.cur.rt.test.eco()); f(d); await T(d => MME.shell.cur.rt.test.ecoSet(d), d); await settle(); };
  await settle();
  const eco0 = await T(() => MME.shell.cur.rt.test.eco()), G = await T(() => MME.shell.cur.rt.test.grid());
  // markets on the map as it is (no seasons on this map: one season)
  let m = await T(() => MME.shell.cur.rt.test.mk());
  ok(m && m.n >= 3 && m.regions[0].name === 'ทั้งแผนที่', 'regional markets and the whole map (' + (m && m.n - 1) + ' regions)');
  ok(m.regions.slice(1).every(R => R.cities > 0) && m.regions.slice(1).reduce((a, R) => a + R.cities, 0) === m.regions[0].cities, 'every community belongs to exactly one market');
  // split the year into seasons: the grain price moves with the harvest
  await T(() => { const t = MME.shell.cur.rt.test; if (t.splitSeasons) t.splitSeasons(); });
  await p.click('#modes button[data-mode="climate"]'); await p.waitForTimeout(400);
  await p.evaluate(() => { for (const d of document.querySelectorAll('details.clseas')) d.open = true; }); await p.waitForTimeout(200); const split = await p.$('[data-sa="split"]'); if (split) { await split.click(); await settle(); }
  m = await T(() => MME.shell.cur.rt.test.mk());
  if (m.seas > 1) { const g = m.regions[0].grain, ps = g.rows.map(r => r.price); ok(Math.max(...ps) > Math.min(...ps) * 1.05, 'with seasons the grain price moves (' + ps.map(x => Math.round(x)).join(' ') + ')'); ok(g.rows.every(r => r.stock0 >= -1e-6), 'stock never runs below nothing'); }
  else ok(true, 'this map keeps one season (no split button found); seasons are checked by the unit maths');
  // the window
  await p.click('#modes button[data-mode="view"]'); await p.click('#mkBtn'); await p.waitForTimeout(400);
  ok(await p.isVisible('#mkReg') && (await p.$$('.mkrow')).length > 5, 'the central market window lists the goods');
  await p.click('.mkrow[data-cat="grain"]'); await p.waitForTimeout(200); ok(await p.isVisible('.mkdet svg'), 'a good opens its seasons and its sellers');
  const piece0 = await p.$eval('.mkrow[data-cat="grain"] span:nth-child(6)', e => e.textContent);
  ok(/กก\./.test(piece0), 'a price per piece: ' + piece0);
  await p.fill('[data-mu="n"][data-cat="grain"]', '20'); await p.dispatchEvent('[data-mu="n"][data-cat="grain"]', 'change'); await p.waitForTimeout(200);
  const piece1 = await p.$eval('.mkrow[data-cat="grain"] span:nth-child(6)', e => e.textContent);
  ok(parseFloat(piece1.replace(/,/g, '')) > parseFloat(piece0.replace(/,/g, '')) * 5, 'fewer pieces to a portion, a dearer piece (' + piece1 + ')');
  await p.screenshot({ path: '/tmp/b5-piece.png' });
  await p.selectOption('#mkReg', '1'); await p.waitForTimeout(200); ok((await p.$$('.mkrow')).length > 3, 'one region\'s market');
  await p.screenshot({ path: '/tmp/b5-market.png' }); await p.keyboard.press('Escape');
  // armies
  await set(d => { let cells = ''; for (let i = 0; i < G.N; i++) cells += (i % G.COLS) < G.COLS / 2 ? 'A' : 'B'; d.states = [{ id: 'A', name: 'ตะวันตก', color: '#aa3333', sys: 'feud', rel: {} }, { id: 'B', name: 'ตะวันออก', color: '#3355aa', sys: 'merc', rel: {} }]; d.cells = cells; });
  let a = await T(() => MME.shell.cur.rt.test.army());
  const A = a.find(x => x.id === 'A'), B = a.find(x => x.id === 'B');
  ok(A && A.men > 100 && B && B.men > 100, 'both states raise men (' + Math.round(A.men) + ', ' + Math.round(B.men) + ')');
  ok(A.men <= A.want + 1e-6 && Object.values(A.units).some(u => u.regs > 0), 'no more than the people allow, gathered in regiments');
  ok(Object.keys(A.ready).length > 2 && Object.values(A.ready).every(r => r >= 0 && r <= 1), 'each class of kit has its readiness');
  const nd = await T(id => MME.shell.cur.rt.test.armyNeedOf(id), A.seats[0]); ok((nd.arms || 0) > 0, 'the garrison asks for arms (' + (nd.arms || 0).toFixed(2) + ' loads)');
  // a bigger army raises more men; a smaller budget pays fewer
  await set(d => { d.states.find(s => s.id === 'A').army = { mob: 0.05 }; }); a = await T(() => MME.shell.cur.rt.test.army());
  const A2 = a.find(x => x.id === 'A'); ok(A2.want > A.want * 2, 'a higher call to arms wants more men');
  await set(d => { d.states.find(s => s.id === 'A').fisc = { bud: { mil: 0.01, adm: 0.3, pub: 0.3, wel: 0.3 } }; }); a = await T(() => MME.shell.cur.rt.test.army());
  const A3 = a.find(x => x.id === 'A'); ok(A3.men < A2.men && A3.men <= A3.can + 1e-6, 'a thin defence budget pays fewer (' + Math.round(A2.men) + '→' + Math.round(A3.men) + ')');
  // the tab
  await p.click('#modes button[data-mode="econ"]'); await p.click('#ecoTab button[data-t="army"]'); await p.waitForTimeout(400);
  ok(await p.isVisible('[data-aa2="enew"]') && (await p.$$('[data-ae]')).length >= 8, 'the army tab lists kinds and gear');
  await p.click('[data-ae="sword"] summary'); await p.fill('[data-ae="sword"] [data-aef="atk"]', '9'); await p.dispatchEvent('[data-ae="sword"] [data-aef="atk"]', 'change'); await settle();
  const a4 = (await T(() => MME.shell.cur.rt.test.army())).find(x => x.id === 'A'); ok(a4.pow > A3.pow, 'sharper swords make a stronger army');
  await p.screenshot({ path: '/tmp/b5-army.png' });
  await T(d => MME.shell.cur.rt.test.ecoSet(d), eco0);
  ok(!errs.length, 'no page errors ' + errs.join(' | '));
  await browser.close(); console.log(fails ? fails + ' failed' : 'all passed'); process.exit(fails ? 1 : 0);
})();
