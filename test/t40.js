// v0.16.0: features of the ground, painted over the hexes: the goods of the hex, fields where the ground alone forbids them,
// water for the caravans, how well people live and what visitors come to see; kinds of one's own; undo; kept with the map
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await (await browser.newContext({ viewport: { width: 1536, height: 900 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForSelector('.mapcard[data-id="gresland"]', { timeout: 60000 }); await p.click('.mapcard[data-id="gresland"] [data-act="open"]');
  await p.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable && MME.shell.cur.rt.state().econ, null, { timeout: 90000 });
  const settle = async () => { for (let n = 0, last = -1; n < 40; n++) { await p.waitForTimeout(1200); const v = await p.evaluate(() => { const e = MME.shell.cur.rt.test.econ(); return e ? e.ver : -1; }); if (v === last && v >= 0) return; last = v; } };
  await settle(); await p.selectOption('#tierSel', 'mid'); await settle();
  ok(/0\.16\.\d/.test(await p.evaluate(() => MME.VERSION)), 'version 0.16');
  await p.click('#modes button[data-mode="terrain"]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.querySelectorAll('#featPal .sw').length >= 10 && !document.getElementById('featcard').hidden), 'the painting of the ground has a row of features, and its card');
  // the desert capital: its own ground and the desert hexes round it
  const T = await p.evaluate(() => { const x = MME.shell.cur.rt.test, g = x.ground(), c = x.cities().find(c => c.id === 'sar-kadum'), G = x.grid(); const ring = [];
    const nb = i => { const c0 = i % G.COLS, r0 = (i - c0) / G.COLS, o = c0 & 1, at = (c, r) => c >= 0 && c < G.COLS && r >= 0 && r < G.ROWS ? r * G.COLS + c : -1; return [at(c0, r0 - 1), at(c0, r0 + 1), at(c0 - 1, o ? r0 : r0 - 1), at(c0 - 1, o ? r0 + 1 : r0), at(c0 + 1, o ? r0 : r0 - 1), at(c0 + 1, o ? r0 + 1 : r0)].filter(v => v >= 0); };
    for (const v of nb(c.h)) for (const u of nb(v)) if (u !== c.h && g[u] === 'd' && !ring.includes(u)) ring.push(u);
    return { h: c.h, ring: ring.slice(0, 4) }; });
  const book0 = await p.evaluate(() => { const x = MME.shell.cur.rt.test; return { b: x.cityBook('sar-kadum'), g: x.gdp().find(r => r.id === 'sar-kadum') }; });
  // paint oases on two desert hexes
  await p.evaluate(() => document.querySelector('#featPal .sw[data-f="a"]').click());
  ok(await p.evaluate(() => /โอเอซิส/.test(document.getElementById('bname').textContent)), 'picking the oasis says so beside the brush');
  await p.click('#bsize button[data-n="1"]');
  for (const h of T.ring.slice(0, 2)) { const [x, y] = await p.evaluate(h => MME.shell.cur.rt.test.hexXY(h), h); await p.mouse.click(x, y); await p.waitForTimeout(150); }
  await settle();
  const eco1 = await p.evaluate(() => MME.shell.cur.rt.test.eco());
  ok(eco1.feat && eco1.feat.a && eco1.feat.a.length === 2, 'two oases lie on the map, kept in the map\'s economy document');
  const book1 = await p.evaluate(() => { const x = MME.shell.cur.rt.test; return { b: x.cityBook('sar-kadum'), g: x.gdp().find(r => r.id === 'sar-kadum'), card: (() => { const k = x.cities().findIndex(c => c.id === 'sar-kadum'); return x.cityCard(k); })() }; });
  const dates = book1.b.goods['ft.a.grain'] || 0;
  ok(dates > 0.5, `the capital harvests the oases' food: ${dates.toFixed(2)} loads of grain`);
  ok((book1.b.land.farm + book1.b.land.cleared) >= (book0.b.land.farm + book0.b.land.cleared), `fields may lie on the oases (fields ${book0.b.land.farm} → ${book1.b.land.farm})`);
  ok(book1.g.why.some(w => /ลักษณะพิเศษ/.test(w[0]) && w[1] > 0), 'the oases add to how well the capital lives: ' + JSON.stringify(book1.g.why.find(w => /ลักษณะพิเศษ/.test(w[0]))));
  ok(/ลักษณะพิเศษในพื้นที่เก็บเกี่ยว/.test(book1.card) && /โอเอซิส/.test(book1.card), 'the city card names the features of its land');
  // the hover card of the hex
  await p.click('#modes button[data-mode="view"]'); await p.waitForTimeout(300);
  const tipT = await p.evaluate(async h => { const [x, y] = MME.shell.cur.rt.test.hexXY(h); return [x, y]; }, T.ring[0]);
  await p.mouse.move(tipT[0], tipT[1]); await p.waitForTimeout(500);
  ok(/ลักษณะพิเศษ: โอเอซิส/.test(await p.evaluate(() => MME.shell.cur.rt.test.tip().text)), 'the hover card of the hex names the oasis');
  // fields where the ground alone forbids them: an oasis far out in the open desert is no use to a field, one by a city is
  const fu = await p.evaluate(r => { const L = MME.shell.cur.rt.test.landUse(); return r.map(h => [L.use[h], L.own[h]]); }, T.ring.slice(0, 2));
  console.log('   the oases\' hexes in the land plan', JSON.stringify(fu), 'lack', book1.b.land.lack);
  ok(fu.some(u => u[0] === 1) || !(book1.b.land.lack > 0), 'a city short of land lays fields on the oasis by it');
  await p.click('#modes button[data-mode="terrain"]'); await p.waitForTimeout(300);
  // undo and redo
  await p.click('#undo'); await p.waitForTimeout(300); await p.click('#undo'); await settle();
  ok(!(await p.evaluate(() => { const e = MME.shell.cur.rt.test.eco(); return e.feat && e.feat.a && e.feat.a.length; })), 'undo takes the oases off again');
  await p.click('#redo'); await p.click('#redo'); await settle();
  ok(await p.evaluate(() => { const e = MME.shell.cur.rt.test.eco(); return e.feat && e.feat.a && e.feat.a.length === 2; }), 'redo puts them back');
  // water for the caravans: an oasis on a desert line makes its dry stretch cheaper
  const L0 = await p.evaluate(() => MME.shell.cur.rt.test.lines().length);
  const water = await p.evaluate(() => { const x = MME.shell.cur.rt.test, e = x.eco(); const n = x.grid().N; const g = x.ground(); const lines = x.lines(); return { lines: lines.length }; });
  const wet = await p.evaluate(() => { const x = MME.shell.cur.rt.test, e = x.eco(); delete e.feat; e.feat = {}; x.ecoSet(e); return true; }); await settle();
  const cost0 = await p.evaluate(() => { const x = MME.shell.cur.rt.test, C = x.cities(); return C.map(c => c.id); });
  // put an oasis on every desert hex of the desert's longest line and see the line get cheaper
  const pick = await p.evaluate(() => { const x = MME.shell.cur.rt.test, g = x.ground(); let best = null; for (let k = 0; k < 400; k++) { const a = x.linkAt(k); if (!a) break; const card = x.linkCard(k); } return null; });
  const res = await p.evaluate(async () => {
    const x = MME.shell.cur.rt.test, g = x.ground(); const before = x.nt('sar-kadum', 'sp-baytzil');
    const e = x.eco(); e.feat = { a: [] }; for (let i = 0; i < g.length; i++) if (g[i] === 'd' && i % 7 === 0) e.feat.a.push(i); x.ecoSet(e);
    await new Promise(r => setTimeout(r, 6000)); return [before, x.nt('sar-kadum', 'sp-baytzil')];
  });
  await settle();
  ok(res[1] < res[0], `oases strewn over the desert shorten the caravans' way across it (${res[0].toFixed(2)} → ${res[1].toFixed(2)})`);
  // a canyon across the way: the line runs slower; the new kinds are in the row
  ok(await p.evaluate(() => ['หุบผาชัน', 'เกาะปะการังวงแหวน', 'ลากูน', 'เกาะภูเขาไฟ', 'ที่ราบลุ่มน้ำ'].every(n => [...document.querySelectorAll('#featPal .sw')].some(b => b.textContent.includes(n)))), 'canyons, atolls, lagoons, volcanic islands and floodplains are in the row');
  const cn = await p.evaluate(async () => {
    const x = MME.shell.cur.rt.test, g = x.ground(); const e0 = x.eco(); e0.feat = {}; x.ecoSet(e0); await new Promise(r => setTimeout(r, 5000)); const before = x.nt('sar-kadum', 'sp-baytzil');
    const e = x.eco(); e.feat = { j: [] }; for (let i = 0; i < g.length; i++) if (g[i] === 'd' && i % 3 === 0) e.feat.j.push(i); x.ecoSet(e);
    await new Promise(r => setTimeout(r, 6000)); return [before, x.nt('sar-kadum', 'sp-baytzil')];
  });
  await settle();
  ok(cn[1] > cn[0], `canyons strewn over the desert lengthen the caravans' way (${cn[0].toFixed(2)} → ${cn[1].toFixed(2)})`);
  // a kind of one's own
  await p.evaluate(() => { const e = MME.shell.cur.rt.test.eco(); e.feat = {}; e.fkinds = { A: { name: 'ตาน้ำมานา', col: '#7fb6ff', on: 'land', y: { mana: 2 }, well: 3, tour: 1 } }; MME.shell.cur.rt.test.ecoSet(e); }); await settle();
  ok(await p.evaluate(() => [...document.querySelectorAll('#featPal .sw')].some(b => /ตาน้ำมานา/.test(b.textContent))), 'a kind of one\'s own joins the row');
  const m0 = await p.evaluate(() => MME.shell.cur.rt.test.cityBook('sar-kadum').o.mana || [0]);
  await p.evaluate(h => { const e = MME.shell.cur.rt.test.eco(); e.feat = { A: [h] }; MME.shell.cur.rt.test.ecoSet(e); }, T.ring[0]); await settle();
  const m1 = await p.evaluate(() => MME.shell.cur.rt.test.cityBook('sar-kadum'));
  ok((m1.goods['ft.A.mana'] || 0) > 1, `and gives what its card says: ${(m1.goods['ft.A.mana'] || 0).toFixed(2)} loads of mana a year`);
  // the card edits a kind
  await p.click('#modes button[data-mode="view"]'); await p.click('#modes button[data-mode="terrain"]'); await p.waitForTimeout(300);
  await p.evaluate(() => { const d = document.querySelector('#featbody details[data-fk="a"]'); d.open = true; });
  await p.fill('#featbody details[data-fk="a"] input[data-ff="name"]', 'บ่อน้ำกลางทราย'); await p.press('#featbody details[data-fk="a"] input[data-ff="name"]', 'Enter'); await p.waitForTimeout(400);
  ok(await p.evaluate(() => MME.shell.cur.rt.test.eco().fkinds.a && MME.shell.cur.rt.test.eco().fkinds.a.name === 'บ่อน้ำกลางทราย' && [...document.querySelectorAll('#featPal .sw')].some(b => /บ่อน้ำกลางทราย/.test(b.textContent))), 'renaming a kind on its card renames it in the row');
  // the reef lies only in the sea
  await p.evaluate(() => document.querySelector('#featPal .sw[data-f="h"]').click());
  const [lx, ly] = await p.evaluate(h => MME.shell.cur.rt.test.hexXY(h), T.ring[1]); await p.mouse.click(lx, ly); await p.waitForTimeout(300);
  ok(!(await p.evaluate(() => { const e = MME.shell.cur.rt.test.eco(); return e.feat && e.feat.h; })), 'a reef will not lie on the desert');
  ok(errs.filter(e => !/Failed to load resource/.test(e)).length === 0, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await browser.close(); console.log(fails ? fails + ' FAILED' : 'ALL OK'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('FAILED', e.message.slice(0, 600)); process.exit(1); });
