// v0.9.0: a state's balance of trade, the GDP list's folds and order, lands without a state, names over borders, the page's
// letter size, the model's two scales, and organisations.
const { chromium } = require('playwright');
const URL = 'http://localhost:8765/index.html';
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1536, height: 760 } });
  const errs = []; let bad = 0;
  const ok = (name, v, extra) => { if (!v) bad++; console.log((v ? 'ok   ' : 'FAIL ') + name + (extra != null ? ' | ' + extra : '')); };
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/fonts\.g|Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
  await p.goto(URL); await p.waitForSelector('#lib');
  ok('the page starts at the middle letter size, larger than before', await p.evaluate(() => getComputedStyle(document.documentElement).fontSize === '17px' && document.querySelector('.uisize.fixed [data-ui="m"]').getAttribute('aria-pressed') === 'true'));
  await p.click('.uisize.fixed [data-ui="l"]'); ok('the large size is one click away and is kept', await p.evaluate(() => getComputedStyle(document.documentElement).fontSize === '19px' && localStorage.getItem('mme-ui') === 'l'));
  await p.click('.uisize.fixed [data-ui="m"]');
  await p.waitForSelector('.mapcard[data-id="gresland"]', { timeout: 60000 }); await p.click('.mapcard[data-id="gresland"] [data-act="open"]');
  await p.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable && MME.shell.cur.rt.state().econ, null, { timeout: 90000 });
  const T = (f, a) => p.evaluate(f, a);
  const settle = async () => { for (let n = 0, last = -1; n < 40; n++) { await p.waitForTimeout(2200); const v = await p.evaluate(() => { const e = MME.shell.cur.rt.test.econ(); return e ? e.ver : -1; }); if (v === last && v >= 0) return; last = v; } };
  const base = await T(() => MME.shell.cur.rt.test.econ());
  const gdp0 = await T(() => MME.shell.cur.rt.test.gdp());
  const ppl = gdp0.reduce((a, r) => a + r.people, 0), pc = gdp0.reduce((a, r) => a + r.inc, 0) / ppl, kinds = await T(() => MME.shell.cur.rt.test.cities().map(c => [c.kind, c.pop]));
  const small = Math.min(...gdp0.map(r => r.people)), big = Math.max(...gdp0.map(r => r.people));
  ok('people and money read as a world\'s: a village in the low thousands, a year\'s income per head in the hundreds of coins', small >= 800 && small <= 3000 && big >= 8000 && big <= 30000 && pc > 80 && pc < 800, `smallest ${small} largest ${big} per head ${pc.toFixed(1)}`);
  // the GDP tab: folds and order
  await p.click('#modes button[data-mode="econ"]'); await p.click('#ecoTab button[data-t="gdp"]'); await p.waitForSelector('#ecobody details[data-fold="gct"]');
  const names = () => p.evaluate(() => [...document.querySelectorAll('#ecobody details[data-fold="gct"] .etr')].map(r => [r.children[0].textContent.trim(), +r.children[1].textContent.replace(/,/g, '')]));
  await p.selectOption('#ecobody select[data-f="gsort"]', 'people'); await p.selectOption('#ecobody select[data-f="gdir"]', '1');
  let rows = await names(); ok('the cities can be put in order of any column, either way', rows.length > 3 && rows.every((r, i) => !i || r[1] >= rows[i - 1][1]), rows.slice(0, 3).map(r => r[1]).join(' '));
  await p.click('#ecobody .eth.sortable span[data-k="people"]'); rows = await names(); ok('a click on a column heading turns the order round', rows.every((r, i) => !i || r[1] <= rows[i - 1][1]));
  await p.click('#ecobody details[data-fold="gct"] > summary'); await p.waitForTimeout(200);
  await T(() => MME.shell.cur.rt.test.avoid(false)); await settle();
  ok('the list of cities folds away and stays folded when the year is worked out again', await p.evaluate(() => { const d = document.querySelector('#ecobody details[data-fold="gct"]'); return !!d && !d.open; }));
  await p.click('#ecobody details[data-fold="gct"] > summary');
  // states by the document: the left half one state, the right half a land without a state, rivals elsewhere
  const made = await T(() => { const t = MME.shell.cur.rt.test, g = t.grid(), e = t.eco(), cs = t.cities(); let cells = ''; for (let i = 0; i < g.N; i++) { const col = i % g.COLS; cells += col < g.COLS * 0.4 ? 'A' : col < g.COLS * 0.7 ? 'B' : 'C'; } e.states = [{ id: 'A', name: 'รัฐเอ', color: '#d9534f', sys: 'merc', cur: 'ดีนาร์', rate: 2, rel: { B: 'rival' } }, { id: 'B', name: 'รัฐบี', color: '#4f8fd9', sys: 'merc', cur: '', rate: 1, rel: { A: 'rival' } }, { id: 'C', name: 'แดนเถื่อน', color: '#58b368', sys: 'merc', cur: '', rate: 1, rel: {} }]; e.cells = cells; t.ecoSet(e); return cs.length; });
  await settle(); const merc = await T(() => MME.shell.cur.rt.test.econ());
  await T(() => { const t = MME.shell.cur.rt.test, e = t.eco(); e.states[2].sys = 'anar'; t.ecoSet(e); }); await settle(); const anar = await T(() => MME.shell.cur.rt.test.econ());
  const stOf = await T(() => Object.fromEntries(MME.shell.cur.rt.test.cities().map(c => [c.id, c.st])));
  const cross = async () => (await T(() => MME.shell.cur.rt.test.flowsOf())).filter(f => (stOf[f.a] === 'A' && stOf[f.b] === 'B') || (stOf[f.a] === 'B' && stOf[f.b] === 'A'));
  const viaAnar = (await cross()).filter(f => f.broker >= 0).length;
  ok('a land without a state trades more freely than the same land under a mercantile state', anar.val > merc.val, `value moved ${merc.val.toFixed(1)} -> ${anar.val.toFixed(1)}`);
  ok('and its markets sell on between two rivals', viaAnar > 0, viaAnar + ' flows between the rivals through a market there');
  ok('the form of such a land offers no friends or enemies', await p.evaluate(async () => { document.querySelector('#ecoTab button[data-t="states"]').click(); await new Promise(r => setTimeout(r, 200)); const f = document.querySelector('#ecobody .eform[data-s="C"]'); return !!f && !f.querySelector('select[data-f="srel"]') && /อนาธิปไตย/.test(f.textContent) && !document.querySelector('#ecobody .eform[data-s="A"] select[data-f="srel"][data-o="C"]'); }));
  // a state's balance of trade: a click inside its borders in the trade view
  await p.click('#modes button[data-mode="trade"]'); await p.waitForTimeout(400);
  const spot = await T(() => { const t = MME.shell.cur.rt.test, g = t.grid(), cs = new Set(t.cities().map(c => c.h)); for (let r = Math.floor(g.ROWS * 0.3); r < g.ROWS * 0.7; r++) for (let c = 2; c < g.COLS * 0.35; c++) { const i = r * g.COLS + c; if (!cs.has(i)) { const xy = t.hexXY(i), b = document.getElementById('map').getBoundingClientRect(); if (xy[0] > b.left + 30 && xy[0] < b.right - 30 && xy[1] > b.top + 30 && xy[1] < b.bottom - 30) return xy; } } return null; });
  await p.mouse.click(spot[0], spot[1]); await p.waitForTimeout(400);
  const card = await p.textContent('#tradebody');
  ok('a click inside a state shows that state\'s balance of trade', /รัฐเอ/.test(card) && /ส่งออก/.test(card) && /นำเข้า/.test(card) && /(เกินดุล|ขาดดุล)/.test(card) && /คู่ค้า/.test(card), card.replace(/\s+/g, ' ').slice(0, 110));
  ok('with the balance in the state\'s own coin too', /ดีนาร์/.test(card));
  // organisations
  await p.click('#modes button[data-mode="econ"]'); await p.click('#ecoTab button[data-t="orgs"]'); await p.click('#ecobody [data-a="onew"]'); await p.waitForSelector('#ecobody .eform[data-org]');
  const cA = await T(() => { const t = MME.shell.cur.rt.test; const cs = t.cities().filter(c => c.st === 'A'); return cs.map(c => ({ id: c.id, xy: t.cityXY(c.id) })); });
  const cB = await T(() => { const t = MME.shell.cur.rt.test; return t.cities().filter(c => c.st === 'B').map(c => ({ id: c.id, xy: t.cityXY(c.id) })); });
  const inView = async c => p.evaluate(xy => { const b = document.getElementById('map').getBoundingClientRect(), el = document.elementFromPoint(xy[0], xy[1]); return xy[0] > b.left + 8 && xy[0] < b.right - 8 && xy[1] > b.top + 8 && xy[1] < b.bottom - 8 && el && (el.id === 'map' || el.id === 'fx'); }, c.xy);
  let hit = null; for (const c of cA) if (await inView(c)) { hit = c; break; }
  await p.mouse.click(hit.xy[0], hit.xy[1]); await p.waitForTimeout(400);
  let eco = await T(() => MME.shell.cur.rt.test.eco());
  ok('with an organisation picked, a click on a city gives it a house there', eco.orgs.length === 1 && eco.orgs[0].seats.join() === hit.id && eco.orgs[0].kind === 'guild' && eco.orgs[0].prod > 0);
  await settle(); const one = await T(() => MME.shell.cur.rt.test.orgs());
  ok('the house raises what the city makes, and the organisation has a worth of its own', one[0].made > 0 && one[0].year > 0 && one[0].value > 0 && one[0].seats === 1, `a year ${one[0].year.toFixed(0)} worth ${one[0].value.toFixed(0)}`);
  await p.mouse.click(hit.xy[0], hit.xy[1]); await p.waitForTimeout(300); eco = await T(() => MME.shell.cur.rt.test.eco());
  ok('a second click takes the house down', eco.orgs[0].seats.length === 0);
  // an association whose houses trade past the states: two rivals' cities deal directly
  await settle(); const before = (await cross()).filter(f => f.org).length;
  await T(({ a, b }) => { const t = MME.shell.cur.rt.test, e = t.eco(); e.orgs = [{ id: 'oleague', name: 'สันนิบาตพ่อค้า', kind: 'assoc', color: '#4fb0c9', cat: '', prod: 0, val: 0, well: 0, haul: 0.2, net: 1, base: 5000, seats: [...a, ...b] }, { id: 'ocare', name: 'โรงทาน', kind: 'charity', color: '#7cc47f', cat: '', prod: 0, val: 0, well: 0.1, haul: 0, net: 0, base: 0, seats: a.slice(0, 1) }]; t.ecoSet(e); }, { a: cA.map(c => c.id), b: cB.map(c => c.id) });
  await settle(); const direct = (await cross()).filter(f => f.org === 'oleague'); const two = await T(() => MME.shell.cur.rt.test.orgs());
  const lg = two.find(o => o.id === 'oleague'), care = two.find(o => o.id === 'ocare');
  ok('houses of one association in two rival states trade with each other directly', before === 0 && direct.length > 0, direct.length + ' flows');
  ok('it earns a fee on that trade and saves on carrying, and its founding capital counts in its worth', lg.fee > 0 && lg.saved > 0 && lg.value >= 5000 + lg.year, `fee ${lg.fee.toFixed(0)} saved ${lg.saved.toFixed(0)} worth ${lg.value.toFixed(0)}`);
  const g1 = await T(() => MME.shell.cur.rt.test.gdp()); const helped = g1.find(r => r.inc > r.gdp * 1.09 && r.inc < r.gdp * 1.3);
  ok('a charity lifts the income of the people of its city', care.help > 0 && !!helped, helped ? helped.name : '');
  ok('the GDP tab lists the organisations with what they made and their worth', await p.evaluate(async () => { document.querySelector('#ecoTab button[data-t="gdp"]').click(); await new Promise(r => setTimeout(r, 300)); const d = document.querySelector('#ecobody details[data-fold="gor"]'); return !!d && /สันนิบาตพ่อค้า/.test(d.textContent) && /โรงทาน/.test(d.textContent); }));
  // the document keeps it all, and a map saved before this version takes the new scales without changing its trade
  const kept = await T(() => { const e = MME.shell.cur.rt.test.eco(); return e.v === 2 && e.orgs.length === 2 && e.unit === 1000 && e.central.per === 40000; });
  ok('the economy document keeps the organisations and the scales', kept);
  const mig = await T(() => { const t = MME.shell.cur.rt.test, e = t.eco(); const a = JSON.parse(JSON.stringify(e)); a.v = 1; a.unit = 5000; a.central.per = 1000; a.orgs = []; t.ecoSet(a); const x = t.eco(); const b = JSON.parse(JSON.stringify(a)); b.pop = { anycity: 60000 }; t.ecoSet(b); const y = t.eco(); const c = JSON.parse(JSON.stringify(a)); c.unit = 2500; t.ecoSet(c); const z = t.eco(); return [x.unit, x.central.per, y.unit, y.central.per, z.unit, z.central.per]; });
  ok('an older map takes the new scales; counted people keep the old head; numbers the owner set stay', mig.join() === '1000,40000,5000,200000,2500,1000', mig.join(' '));
  console.log('errors', errs.length + bad, errs.slice(0, 4).join(' | '));
  await browser.close();
})().catch(e => { console.error('TEST FAILED', e.message.slice(0, 900)); process.exit(1); });
