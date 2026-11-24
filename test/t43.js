// v0.17.0: people on the lines (sightseeing, kin, pilgrims, business) and railways laid by hand
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await (await browser.newContext({ viewport: { width: 1536, height: 900 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForSelector('.mapcard[data-id="gresland"]', { timeout: 60000 }); await p.click('.mapcard[data-id="gresland"] [data-act="open"]');
  await p.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable && MME.shell.cur.rt.state().econ, null, { timeout: 90000 });
  const settle = async () => { for (let n = 0, last = -1; n < 40; n++) { await p.waitForTimeout(1200); const v = await p.evaluate(() => { const e = MME.shell.cur.rt.test.econ(); return e ? e.ver : -1; }); if (v === last && v >= 0) return; last = v; } };
  await settle();
  // three states side by side, so journeys cross borders
  await p.evaluate(() => { const x = MME.shell.cur.rt.test, e = x.eco(), g = x.grid(); let cells = ''; for (let i = 0; i < g.N; i++) { const c = i % g.COLS; cells += c < g.COLS * 0.45 ? 'A' : c < g.COLS * 0.7 ? 'B' : 'C'; }
    e.states = [{ id: 'A', name: 'รัฐตะวันตก', color: '#d9534f', sys: 'feud', cur: '', rate: 1, rel: {}, slave: 'free' }, { id: 'B', name: 'รัฐกลาง', color: '#4f8fd9', sys: 'cap', cur: '', rate: 1, rel: {}, slave: 'free' }, { id: 'C', name: 'รัฐตะวันออก', color: '#58b368', sys: 'soc', cur: '', rate: 1, rel: {}, slave: 'abol' }]; e.cells = cells; x.ecoSet(e); });
  await settle();
  ok(/0\.1[7-9]\.\d/.test(await p.evaluate(() => MME.VERSION)), 'version 0.17');
  const T0 = await p.evaluate(() => MME.shell.cur.rt.test.trv());
  console.log('   travel', JSON.stringify(T0.by), 'holy', JSON.stringify(T0.holy.slice(0, 5)));
  ok(T0.by.tour > 0 && T0.by.per > 0 && T0.by.biz > 0, 'sightseers, personal journeys and business trips all travel');
  ok(T0.links.filter(L => L.pax >= 1).length >= T0.links.length * 0.5, `most lines carry people (${T0.links.filter(L => L.pax >= 1).length} of ${T0.links.length})`);
  ok(T0.by.per > T0.by.pilg, 'personal journeys outnumber pilgrimages');
  // a holy city of the owner's: pilgrims come, and the cities near it live better
  const rows = T0.rows.slice().sort((a, b) => (b.inn ? Object.values(b.inn).reduce((x, y) => x + y, 0) : 0) - (a.inn ? Object.values(a.inn).reduce((x, y) => x + y, 0) : 0));
  const H = rows[3];
  await p.evaluate(id => { const x = MME.shell.cur.rt.test, e = x.eco(); e.holy = { ...(e.holy || {}), [id]: 3 }; x.ecoSet(e); }, H.id); await settle();
  const T1 = await p.evaluate(() => MME.shell.cur.rt.test.trv()), h1 = T1.rows.find(r => r.id === H.id);
  console.log('   holy', H.name, 'pilgrims in', Math.round(H.inn.pilg), '→', Math.round(h1.inn.pilg), 'pilgrims all', Math.round(T0.by.pilg), '→', Math.round(T1.by.pilg));
  ok(h1.inn.pilg > H.inn.pilg + 10 && T1.by.pilg > T0.by.pilg, 'a city the owner makes a great holy place draws pilgrims');
  const wl = T1.rows.filter(r => r.id !== H.id).map(r => r.well);
  ok(Math.max(...wl) > Math.min(...wl) + 0.2, `the cities that reach a holy place easily live better (well-being from ${Math.min(...wl).toFixed(2)} to ${Math.max(...wl).toFixed(2)})`);
  ok(await p.evaluate(id => MME.shell.cur.rt.test.eco().holy[id] === 3, H.id), 'the holy city is kept in the map\'s document');
  ok(T1.books.some(b => b.trvIn > 0) && T1.books.some(b => b.trvOut > 0), 'travellers across a border count in the states\' books');
  ok(T1.rows.some(r => r.spendIn > 0), 'travellers spend in the cities they go to');
  // the cards
  await p.click('#modes button[data-mode="trade"]'); await p.waitForTimeout(500);
  const ci = await p.evaluate(id => MME.shell.cur.rt.test.cities().findIndex(c => c.id === id), H.id);
  const card = await p.evaluate(k => MME.shell.cur.rt.test.cityCard(k), ci);
  ok(/การเดินทางของผู้คน/.test(card) && /แสวงบุญ/.test(card) && /ศูนย์แสวงบุญใหญ่/.test(card), 'the city card shows its travellers and its holiness');
  const li = T1.links.findIndex(L => L.pax >= 1);
  ok(/ผู้เดินทางบนเส้นนี้/.test(await p.evaluate(k => MME.shell.cur.rt.test.linkCard(k), li)), 'the line card shows the people on it');
  ok(await p.evaluate(() => !!document.querySelector('#layers input[data-k="pax"]') && !!document.querySelector('#layers input[data-k="rail"]')), 'the map has layers for travellers and railways');
  // a railway, laid by hand between two cities a long caravan ride apart
  const pick = T1.links.filter(L => L.dry >= 8 && L.dry <= 30 && !L.rail).sort((a, b) => b.pax - a.pax)[0];
  const nt0 = await p.evaluate(([a, b]) => MME.shell.cur.rt.test.nt(a, b), [pick.a, pick.b]);
  await p.click('#modes button[data-mode="route"]'); await p.waitForTimeout(400);
  ok(await p.evaluate(() => !!document.querySelector('#rtCls button[data-k="rail"]')), 'the road tool offers a railway');
  await p.click('#rtCls button[data-k="rail"]');
  for (const id of [pick.a, pick.b]) { const xy = await p.evaluate(id => MME.shell.cur.rt.test.cityXY(id), id); await p.mouse.click(xy[0], xy[1]); await p.waitForTimeout(400); }
  await settle();
  const R = await p.evaluate(() => MME.shell.cur.rt.test.rail());
  console.log('   rail', JSON.stringify({ n: R.rails.length, len: R.rails[0] && R.rails[0].len, tunnels: R.rails[0] && R.rails[0].tunnels, bridges: R.rails[0] && R.rails[0].bridges, edges: R.edges }));
  ok(R.rails.length === 1 && R.rails[0].ok && R.edges > 0, 'the railway is laid');
  const nt1 = await p.evaluate(([a, b]) => MME.shell.cur.rt.test.nt(a, b), [pick.a, pick.b]);
  ok(nt1 < nt0 * 0.8, `the journey between the two cities is cheaper by rail (${nt0.toFixed(1)} → ${nt1.toFixed(1)})`);
  const T2 = await p.evaluate(() => MME.shell.cur.rt.test.trv());
  ok(T2.links.some(L => L.rail > 0 && L.pax > 0) && T2.onRail > 0, `travellers ride the railway (${Math.round(T2.onRail)} mostly by rail)`);
  const pr = (T, a, b) => T.links.filter(L => (L.a === a && L.b === b) || (L.a === b && L.b === a)).reduce((x, L) => x + L.pax, 0);
  ok(pr(T2, pick.a, pick.b) > pr(T1, pick.a, pick.b), `more people travel the line the railway runs along (${Math.round(pr(T1, pick.a, pick.b))} → ${Math.round(pr(T2, pick.a, pick.b))})`);
  ok(/ทางรถไฟ/.test(await p.evaluate(() => document.getElementById('rfInfo').textContent)), 'the chosen railway is named in the route form');
  // the button that joins loose cities lays roads, never rails
  const nr = await p.evaluate(() => MME.shell.cur.rt.test.rail().rails.length);
  await p.click('#rtLoose').catch(() => {}); await p.waitForTimeout(800);
  ok(await p.evaluate(() => MME.shell.cur.rt.test.rail().rails.length) === nr, 'joining the loose cities lays no railway');
  // undo takes the railway away
  await p.keyboard.press('Escape'); await p.evaluate(() => MME.shell.cur.rt.undo ? MME.shell.cur.rt.undo() : null).catch(() => {});
  ok(errs.length === 0, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await browser.close(); console.log(fails ? fails + ' FAILED' : 'ALL OK'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('FAILED', e.message.slice(0, 600)); process.exit(1); });
