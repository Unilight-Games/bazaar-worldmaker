// v0.14.2: the land a city works feeds it. A capital set by hand at a million heads in a world of three million (the owner's own
// Luxonia) must eat from the ten hexes of ploughland laid out for it, fell its own timber and dig its own stone.
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await (await browser.newContext({ viewport: { width: 1536, height: 900 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForSelector('.mapcard[data-id="gresland"]', { timeout: 60000 }); await p.click('.mapcard[data-id="gresland"] [data-act="open"]');
  await p.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable && MME.shell.cur.rt.state().econ, null, { timeout: 90000 });
  const settle = async () => { for (let n = 0, last = -1; n < 40; n++) { await p.waitForTimeout(1500); const v = await p.evaluate(() => { const e = MME.shell.cur.rt.test.econ(); return e ? e.ver : -1; }); if (v === last && v >= 0) return; last = v; } };
  await settle();
  ok(/0\.1\d\.\d/.test(await p.evaluate(() => MME.VERSION)), 'version 0.14.2');
  await p.selectOption('#tierSel', 'low'); await settle();
  await p.evaluate(() => { const x = MME.shell.cur.rt.test, e = x.eco(); e.pop = Object.assign({}, e.pop, { luxonia: 1024400 }); x.ecoSet(e); }); await settle();
  const a = await p.evaluate(() => { const x = MME.shell.cur.rt.test, b = x.cityBook('luxonia'), r = x.gdp().find(r => r.id === 'luxonia'); return { b, metB: r.metB, well: r.well, people: r.people }; });
  const L = a.b.land, g = a.b.o.grain, t = a.b.o.timber, s = a.b.o.stone;
  console.log('   luxonia', Math.round(a.people), 'well', Math.round(a.well), 'metB', a.metB.toFixed(2), 'land', JSON.stringify(L), 'grain', g, 'timber', t, 'stone', s);
  ok(L && L.want >= 5, 'a million heads lay out fields (' + (L && L.want) + ' hexes wanted)');
  const fed = (1 - L.lack) * Math.min(1, L.yield);
  ok(g[0] >= 0.95 * g[1] * fed, 'the fields bring in the grain they were laid out for: ' + g[0].toFixed(1) + ' of ' + g[1].toFixed(1) + ' (fed ' + fed.toFixed(2) + ')');
  ok(!(L.wantW >= 1) || t[0] >= 0.95 * t[1] * Math.min(1, L.logged / L.wantW), 'the felled woods bring in timber');
  ok(!(L.wantM >= 1) || s[0] >= 0.95 * s[1] * Math.min(1, L.mine / L.wantM), 'the mines bring in stone');
  ok(a.metB > 0.5, 'the capital meets more than half its basic needs (' + a.metB.toFixed(2) + ')');
  // a count beyond the city form's ceiling, coming in from a file, is held to the ceiling, never dropped
  await p.evaluate(() => { const x = MME.shell.cur.rt.test, e = x.eco(); e.pop = Object.assign({}, e.pop, { luxonia: 3e8 }); x.ecoSet(e); }); await settle();
  ok(await p.evaluate(() => MME.shell.cur.rt.test.eco().pop.luxonia) === 5e7, 'a loaded count past fifty million is held at fifty million');
  ok(errs.length === 0, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await browser.close(); console.log(fails ? fails + ' FAILED' : 'ALL OK'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('FAILED', e.message.slice(0, 600)); process.exit(1); });
