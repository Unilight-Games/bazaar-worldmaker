// states on the real Gresland map: six states of five systems over 183 cities, how long the year takes and whether it stays sane
const { chromium } = require('./_fit');
const URL = 'http://localhost:8765/index.html?fit=0';
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } }); const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push('PAGEERR ' + e.message)); page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
  await page.goto(URL); await page.waitForSelector('.mapcard[data-id="gresland"]');
  await page.click('.mapcard[data-id="gresland"] [data-act="open"]'); await page.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().econ, null, { timeout: 90000 });
  const T = (f, a) => page.evaluate(f, a);
  const econ = () => T(() => MME.shell.cur.rt.test.econ());
  const settle = async ver => { await page.waitForFunction(v => MME.shell.cur.rt.test.econ().ver > v, ver, { timeout: 120000 }); await page.waitForTimeout(400); return econ(); };
  const e0 = await econ(); console.log('no states: cities', (await T(() => MME.shell.cur.rt.test.cities().length)), '| year worked out in', e0.ms, 'ms | flows', e0.flows, '| loads', Math.round(e0.vol), '| value', Math.round(e0.val));
  // six states grown from the six greatest cities, each hex to the nearest of them within reach
  const made = await T(() => {
    const rt = MME.shell.cur.rt, C = rt.test.cities(), { N, COLS } = rt.test.grid();
    const caps = C.filter(c => c.kind === 'capital').sort((a, b) => b.pop - a.pop); const pick = [];
    for (const c of [...caps, ...C.filter(c => c.kind === 'city')]) { const x = c.h % COLS, y = (c.h / COLS) | 0; if (pick.every(p => Math.hypot(p.x - x, p.y - y) > 26)) pick.push({ x, y, c }); if (pick.length === 6) break; }
    const keys = 'ABCDEF', sys = ['cap', 'feud', 'merc', 'soc', 'trad', 'cap'], cells = new Array(N).fill('.');
    for (let i = 0; i < N; i++) { const x = i % COLS, y = (i / COLS) | 0; let best = 34, at = -1; pick.forEach((p, q) => { const d = Math.hypot(p.x - x, (p.y - y) * 1.15); if (d < best) { best = d; at = q; } }); if (at >= 0) cells[i] = keys[at]; }
    const states = pick.map((p, q) => ({ id: keys[q], name: 'รัฐ' + p.c.name, color: ['#d9534f', '#4f8fd9', '#58b368', '#e0a83a', '#a56cd6', '#3bb5ad'][q], sys: sys[q], cur: 'เหรียญ' + keys[q], rate: [1, 2, 0.5, 1, 1, 4][q], cap: p.c.id, rel: {} }));
    const rel = (a, b, r) => { states[a].rel[keys[b]] = r; states[b].rel[keys[a]] = r; }; rel(1, 2, 'rival'); rel(3, 4, 'rival'); rel(0, 1, 'ally'); rel(2, 3, 'ally');
    window.__eco = { v: 1, states, cells: cells.join('') };
    MME.shell.cur.db.remoteDoc('economy', window.__eco);
    return states.map(s => s.name + ' ' + s.sys).join(', ');
  });
  let e = await settle(e0.ver);
  const cs = await T(() => { const C = MME.shell.cur.rt.test.cities(), by = {}; for (const c of C) by[c.st] = (by[c.st] || 0) + 1; return by; });
  console.log('states:', made); console.log('cities by state', JSON.stringify(cs));
  console.log('with states: year in', e.ms, 'ms | rounds', e.rounds, '| flows', e.flows, '| loads', Math.round(e.vol), '| value', Math.round(e.val), '| across borders', e.cross, '| passed on by a city', e.via, '| through a broker', e.broker, '| between rivals', e.rivals, '| lines through rival ground', e.hostile + '/' + e.links, '| broken numbers', e.bad);
  const g = await T(() => { const r = MME.shell.cur.rt.test.gdp(), by = {}; for (const x of r) { const o = by[x.st] || (by[x.st] = { gdp: 0, inc: 0, people: 0, n: 0 }); o.gdp += x.gdp; o.inc += x.inc; o.people += x.people; o.n++; } return { by, bad: r.filter(x => !isFinite(x.gdp) || !isFinite(x.inc) || x.inc < -1e-6).length, tot: r.reduce((a, x) => a + x.gdp, 0), inc: r.reduce((a, x) => a + x.inc, 0) }; });
  console.log('GDP by state (per head):', Object.entries(g.by).map(([k, o]) => k + ' ' + Math.round(o.gdp / o.people * 1000) / 1000 + '→' + Math.round(o.inc / o.people * 1000) / 1000).join(' | '), '| total product', Math.round(g.tot), 'income', Math.round(g.inc), '| broken rows', g.bad);
  // rivals trade only through a broker
  console.log('rival flows without a broker:', await T(() => { const rt = MME.shell.cur.rt; return rt.test.econ().rivals - rt.state().relay[1] > 0 ? 'SOME' : 'none'; }));
  // the same map, every state capitalist, then every state traditional: the extremes
  for (const all of ['cap', 'trad', 'soc']) { const v = (await econ()).ver; await T(s => { const d = JSON.parse(JSON.stringify(window.__eco)); for (const st of d.states) st.sys = s; MME.shell.cur.db.remoteDoc('economy', d); }, all); e = await settle(v); console.log('all ' + all + ': year in', e.ms, 'ms | flows', e.flows, '| loads', Math.round(e.vol), '| value', Math.round(e.val), '| across borders', e.cross, '| broker', e.broker, '| hub', e.hub, '| broken', e.bad); }
  // the card draws
  await page.click('#modes button[data-mode="econ"]'); await page.waitForTimeout(600);
  for (const t of await page.$$eval('#ecoTab button', a => a.map(b => b.dataset.t))) { await page.click(`#ecoTab button[data-t="${t}"]`); await page.waitForTimeout(350); }
  // the dials: no discount at a hub means no load is left with one; then back
  let v = (await econ()).ver; await page.click('#ecoTab button[data-t="tune"]'); await page.fill('#ecobody input[data-k="hubDisc"]', '1'); await page.dispatchEvent('#ecobody input[data-k="hubDisc"]', 'change'); e = await settle(v);
  console.log('dial hubDisc = 1: hub flows', e.hub, '| kept in the map:', JSON.stringify(await T(() => MME.shell.cur.rt.test.tune())), '| marked on the card:', await page.$$eval('#ecobody .etu.ch', a => a.length));
  v = e.ver; await page.click('#ecobody [data-a="treset"]'); e = await settle(v); console.log('dials reset: hub flows', e.hub, '| kept', JSON.stringify(await T(() => MME.shell.cur.rt.test.tune())));
  // a recipe: tools also take timber
  v = e.ver; await page.click('#ecoTab button[data-t="cats"]'); await page.selectOption('#ecobody [data-w="tools"] select[data-f="wadd"]', 'timber'); e = await settle(v);
  await page.waitForTimeout(900); console.log('recipe: tools now take', await page.$$eval('#ecobody [data-w="tools"] [data-i]', a => a.map(x => x.dataset.i).join('+')), '| in the document:', JSON.stringify((await T(() => MME.shell.cur.db.known('economy').work)) || null));
  console.log('economy card tabs drawn | errors', errs.length, errs.slice(0, 4).join(' | '));
  await browser.close();
})().catch(e => { console.error('TEST FAILED', e.message.slice(0, 900)); process.exit(1); });
