// v0.15.0: the yield of a hex follows the hands that work it, counted class by class
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await (await browser.newContext({ viewport: { width: 1536, height: 900 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForSelector('.mapcard[data-id="gresland"]', { timeout: 60000 }); await p.click('.mapcard[data-id="gresland"] [data-act="open"]');
  await p.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable && MME.shell.cur.rt.state().econ, null, { timeout: 90000 });
  const settle = async () => { for (let n = 0, last = -1; n < 40; n++) { await p.waitForTimeout(1500); const v = await p.evaluate(() => { const e = MME.shell.cur.rt.test.econ(); return e ? e.ver : -1; }); if (v === last && v >= 0) return; last = v; } };
  await settle(); await p.selectOption('#tierSel', 'mid'); await settle();
  ok(/0\.1\d\.\d/.test(await p.evaluate(() => MME.VERSION)), 'version 0.15');
  const A = await p.evaluate(() => MME.shell.cur.rt.test.harvAll());
  const g = A.map(h => h[4]).sort((a, b) => a - b), med = g[g.length >> 1];
  ok(A.length > 50 && g[0] >= 0.1 - 1e-9 && g[g.length - 1] <= 3 + 1e-9, `every city's yield a hex lies between 10% and 300% (${g[0].toFixed(2)} to ${g[g.length - 1].toFixed(2)})`);
  ok(med > 0.8 && med < 1.25, `on the sample map an ordinary city harvests about 100% a hex (middle ${(100 * med).toFixed(0)}%)`);
  ok(A.every(h => !h[5]), 'the hands are counted from the classes the year found, never left at the guess');
  // the hands, class by class
  const lx = await p.evaluate(() => MME.shell.cur.rt.test.harv('luxonia'));
  const sum = lx.parts.mid + lx.parts.low + lx.parts.poor + lx.parts.slave;
  ok(Math.abs(sum - lx.L) < 1e-6 && lx.parts.low > lx.parts.mid && lx.parts.mid > 0, `the hands on the land add up from the classes: small holders ${lx.parts.mid.toFixed(2)}, field hands ${lx.parts.low.toFixed(2)}, the poorest ${lx.parts.poor.toFixed(2)}, slaves ${lx.parts.slave.toFixed(3)}`);
  ok(Math.abs(lx.eff.grain - Math.min(3, Math.max(0.1, Math.sqrt(lx.d)))) < 1e-6, 'grain a hex = (density ÷ reference) to the power 0.5');
  ok(lx.d > 1 ? lx.eff.luxury < 1 : lx.eff.luxury >= 1, 'wild goods run thin where the hands are many');
  // more hands on the same home ground, more from a hex, less a head
  const town = 'luxonia';   // a capital stays a capital however many it holds: the same kind of city, the same home reach (a town that grows into a city reaches farther and may spread rather than crowd)
  const b0 = await p.evaluate(id => MME.shell.cur.rt.test.harv(id), town);
  await p.evaluate(id => { const x = MME.shell.cur.rt.test, e = x.eco(); const h = x.harvAll().find(h => h[0] === id); e.pop = Object.assign({}, e.pop, { [id]: Math.round(h[6] * 4 * e.unit) }); x.ecoSet(e); }, town); await settle();
  const b1 = await p.evaluate(id => MME.shell.cur.rt.test.harv(id), town);
  ok(b1.eff.grain > b0.eff.grain * 1.2 && b1.eff.grain / (b1.L / b1.hexes) < b0.eff.grain / (b0.L / b0.hexes), `four times the people: ${(100 * b0.eff.grain).toFixed(0)}% → ${(100 * b1.eff.grain).toFixed(0)}% a hex, less a head`);
  await p.evaluate(id => { const x = MME.shell.cur.rt.test, e = x.eco(); delete e.pop[id]; x.ecoSet(e); }, town); await settle();
  // a long shift pulls hands off the land
  const c0 = await p.evaluate(() => MME.shell.cur.rt.test.harv('luxonia'));
  await p.evaluate(() => { const x = MME.shell.cur.rt.test, e = x.eco(); e.regime = Object.assign({}, e.regime, { luxonia: 'sweat' }); x.ecoSet(e); }); await settle();
  const c1 = await p.evaluate(() => MME.shell.cur.rt.test.harv('luxonia'));
  ok(c1.parts.low < c0.parts.low, `long shifts at the workshops: field hands ${c0.parts.low.toFixed(2)} → ${c1.parts.low.toFixed(2)}`);
  await p.evaluate(() => { const x = MME.shell.cur.rt.test, e = x.eco(); delete e.regime.luxonia; x.ecoSet(e); }); await settle();
  // the reference moves every city together; 0 for the power turns the hands off
  await p.evaluate(() => { const x = MME.shell.cur.rt.test, e = x.eco(); e.tune = Object.assign({}, e.tune, { effGrain: 0 }); x.ecoSet(e); }); await settle();
  ok((await p.evaluate(() => MME.shell.cur.rt.test.harvAll())).every(h => Math.abs(h[4] - 1) < 1e-9), 'a power of 0 leaves every hex at 100%');
  await p.evaluate(() => { const x = MME.shell.cur.rt.test, e = x.eco(); delete e.tune.effGrain; x.ecoSet(e); }); await settle();
  // on the screen
  await p.click('#modes button[data-mode="econ"]').catch(() => {}); await p.waitForTimeout(500);
  const card = await p.evaluate(() => { const x = MME.shell.cur.rt.test, k = x.cities().findIndex(c => c.id === 'luxonia'); return x.cityCard(k); });
  ok(/เก็บเกี่ยวต่อช่อง \d+%/.test(card) && /ใครทำกินบนที่ดิน/.test(card), 'the city card says what a hex yields and who works the land');
  await p.click('#modes button[data-mode="econ"]'); await p.click('#ecoTab button[data-t="gdp"]'); await p.waitForSelector('#ecobody details[data-fold="ghv"]', { timeout: 20000 });
  await p.evaluate(() => { const d = document.querySelector('#ecobody details[data-fold="ghv"]'); d.open = true; d.dispatchEvent(new Event('toggle')); });
  await p.click('#ecobody details[data-fold="ghv"] [data-a="hsort"][data-k="d"]'); await p.waitForTimeout(400);
  const first = await p.evaluate(() => { const r = [...document.querySelectorAll('#ecobody details[data-fold="ghv"] .etr')].map(e => parseFloat(e.children[3].textContent)); return [r.length, r[0], r[r.length - 1]]; });
  ok(first[0] > 50 && first[1] >= first[2], `the GDP tab's harvest table sorts by density (${first[0]} rows, ${first[1]} … ${first[2]})`);
  ok(errs.length === 0, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await browser.close(); console.log(fails ? fails + ' FAILED' : 'ALL OK'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('FAILED', e.message.slice(0, 600)); process.exit(1); });
