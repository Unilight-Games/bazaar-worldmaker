// v0.13.0: the owner's thirteen. Land that follows a moved city and widens its reach, food bought when land is short, cheap hands,
// the four orders of work, people on the move and visitors, slaves as a class of goods, each state's books and what it does
// about them, the city's full tables, states that fold, and bridges on their roads.
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1536, height: 860 } });
  const errs = []; let bad = 0;
  const ok = (name, v, extra) => { if (!v) bad++; console.log((v ? 'ok   ' : 'FAIL ') + name + (extra != null ? ' | ' + extra : '')); };
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/fonts\.g|Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 200)); });
  await p.goto('http://localhost:8765/index.html'); await p.waitForSelector('.mapcard[data-id="gresland"]', { timeout: 60000 }); await p.click('.mapcard[data-id="gresland"] [data-act="open"]');
  await p.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable && MME.shell.cur.rt.state().econ, null, { timeout: 90000 });
  const settle = async () => { for (let n = 0, last = -1; n < 40; n++) { await p.waitForTimeout(2000); const v = await p.evaluate(() => { const e = MME.shell.cur.rt.test.econ(); return e ? e.ver : -1; }); if (v === last && v >= 0) return; last = v; } };
  const set = async (fn, arg) => { await p.evaluate(fn, arg); await settle(); };
  const eco = (fn, arg) => set(new Function('arg', `const x = MME.shell.cur.rt.test, e = x.eco(); (${fn})(e, arg, x); x.ecoSet(e);`), arg);
  const G = () => p.evaluate(() => MME.shell.cur.rt.test.gdp());
  const sum = (a, f) => a.reduce((s, r) => s + f(r), 0);
  await settle();
  // ---- 6 bridges ----
  const br = await p.evaluate(() => MME.shell.cur.rt.test.bridges());
  ok('every bridge stands on its road as drawn', br.length > 5 && br.every(b => b.off < 0.01), `${br.length} bridges`);
  // ---- 3 people on the move and visitors, at the scale the map starts with ----
  const g0 = await G(), ppl0 = sum(g0, r => r.demo.base);
  ok('a city\'s people are those who stayed, those who came and those who left, and the map keeps its people', g0.every(r => r.demo && r.demo.native >= 0 && Math.abs(r.demo.native + r.demo.out - r.demo.base) < 1e-6) && Math.abs(sum(g0, r => r.demo.in) - sum(g0, r => r.demo.out)) < 1 && Math.abs(sum(g0, r => r.people) - ppl0) < g0.length, `${Math.round(sum(g0, r => r.demo.out))} moved of ${Math.round(ppl0)}`);
  ok('people leave where life is worse and settle where it is better', (() => { const s = [...g0].sort((a, b) => a.well - b.well), q = Math.floor(s.length / 4), lo = s.slice(0, q), hi = s.slice(-q), net = a => sum(a, r => r.demo.in - r.demo.out) / sum(a, r => r.demo.base); return net(lo) < 0 && net(hi) > net(lo); })());
  ok('visitors come to every kind of draw, and as many arrive as set out', sum(g0, r => r.demo.tour) > 100 && Math.abs(sum(g0, r => r.demo.tour) - sum(g0, r => r.demo.tourOut)) < 1 && g0.every(r => ['att', 'hub', 'rich', 'org'].every(k => r.tourWhy[k] >= 0 && r.tourWhy[k] <= 1)) && g0.some(r => r.tourWhy.att > 0) && g0.some(r => r.tourWhy.hub > 0.5), `${Math.round(sum(g0, r => r.demo.tour))} visitors a year`);
  const lots = await p.evaluate(() => { const x = MME.shell.cur.rt.test; return x.gdp().slice(0, 30).map(r => r.tourWhy.charm.toFixed(3)); });
  ok('each city drew its own lot when it was made', new Set(lots).size > 20);
  const big = [...g0].sort((a, b) => b.demo.base - a.demo.base)[0];
  await eco('(e, id) => { e.demo = { [id]: { nat: 0.99, mob: 1, charm: 3 } }; }', big.id);
  const g1 = await G(), b1 = g1.find(r => r.id === big.id);
  ok('the owner sets a city\'s lot: a settled people hardly leave, a charming city draws more visitors', b1.demo.out < big.demo.out * 0.2 && b1.demo.tour > big.demo.tour * 1.5, `out ${Math.round(big.demo.out)} -> ${Math.round(b1.demo.out)}, visitors ${Math.round(big.demo.tour)} -> ${Math.round(b1.demo.tour)}`);
  await eco('e => { delete e.demo; }');
  // ---- 5 the four orders of work ----
  const town = [...g0].filter(r => r.made > 0).sort((a, b) => b.made - a.made)[3];
  const regs = {}; for (const k of ['home', 'sweat', 'care']) { await eco('(e, a) => { e.regime = { [a[0]]: a[1] }; }', [town.id, k]); regs[k] = (await G()).find(r => r.id === town.id); }
  await eco('e => { delete e.regime; }'); const base = (await G()).find(r => r.id === town.id);
  ok('the four orders of work: more or less made, a better or a worse life', regs.home.work < base.work && regs.sweat.work > regs.care.work && regs.care.work > base.work && regs.sweat.well0 < base.well0 - 5 && regs.home.well0 >= base.well0 && regs.care.well0 >= base.well0 && regs.sweat.reg === 'sweat', `workshops x${regs.home.work.toFixed(2)} ${base.work.toFixed(2)} ${regs.care.work.toFixed(2)} ${regs.sweat.work.toFixed(2)}, well-being ${[regs.home, base, regs.care, regs.sweat].map(r => Math.round(r.well0)).join(' ')}`);
  ok('a long shift drives people out', regs.sweat.demo.out > base.demo.out * 1.2);
  // ---- 2, 4, 8 at the middle level: reach, cheap hands, land too short ----
  const lines0 = await p.evaluate(() => MME.shell.cur.rt.test.lines());
  await p.selectOption('#tierSel', 'mid'); await settle();
  const gm = await G(), bm = [...gm].sort((a, b) => b.demo.base - a.demo.base)[0], sm = [...gm].sort((a, b) => a.demo.base - b.demo.base)[0];
  ok('a city works the land as far out as its fields reach', bm.reach > 7 && gm.filter(r => r.reach > 7).length > 5 && gm.every(r => r.reach <= 16), `the largest reaches ${bm.reach} hexes, ${gm.filter(r => r.reach > 7).length} cities past seven`);
  ok('a city of many people has cheap hands, and its workshops make more for it', bm.lab > 0.15 && bm.work > 1.05 && sm.lab < bm.lab, `the largest: work ${(100 * bm.lab).toFixed(0)}% cheaper, workshops x${bm.work.toFixed(2)}`);
  const dry = lines0.filter(l => l.dry > 0 && l.wet === 0).map(l => [l.a, l.b]).slice(0, 40);
  const ntMid = await p.evaluate(ps => ps.map(([a, b]) => MME.shell.cur.rt.test.nt(a, b)), dry);
  await eco('e => { e.tune = Object.assign({}, e.tune, { labHaul: 0 }); }');
  const ntOff = await p.evaluate(ps => ps.map(([a, b]) => MME.shell.cur.rt.test.nt(a, b)), dry);
  await eco('e => { const t = Object.assign({}, e.tune); delete t.labHaul; e.tune = t; }');
  ok('and caravans to and from it cost less', dry.length > 10 && ntMid.every((t, i) => t <= ntOff[i] + 1e-9) && ntMid.filter((t, i) => t < ntOff[i] * 0.97).length > dry.length / 3, `${ntMid.filter((t, i) => t < ntOff[i] * 0.97).length} of ${dry.length} caravan lines cheaper`);
  await p.selectOption('#tierSel', 'high'); await settle();
  const gh = await G();
  ok('at two billion many cities are short of land', gh.filter(r => r.lack >= 0.3).length > 5, `${gh.filter(r => r.lack >= 0.3).length} cities at least three tenths short`);
  await p.selectOption('#tierSel', 'mid'); await settle();
  const lackers = (await G()).filter(r => r.lack >= 0.3);
  const pick = lackers.sort((a, b) => b.lack - a.lack)[0], mkOn = await p.evaluate(id => MME.shell.cur.rt.test.market(id), pick.id);
  await eco('e => { e.tune = Object.assign({}, e.tune, { landFood: 0 }); }');
  const mkOff = await p.evaluate(id => MME.shell.cur.rt.test.market(id), pick.id);
  await eco('e => { const t = Object.assign({}, e.tune); delete t.landFood; e.tune = t; }');
  const food = m => (m.book.grain ? m.book.grain[0] : 0) + (m.book.protein ? m.book.protein[0] : 0), buy = m => (m.book.grain ? m.book.grain[2] : 0) + (m.book.protein ? m.book.protein[2] : 0);
  ok('a city short of land grows less of its food and buys more', food(mkOn) < food(mkOff) * (1 - 0.8 * pick.lack) + 0.01 && buy(mkOn) > buy(mkOff), `${pick.name}: ${Math.round(100 * pick.lack)}% short, grows ${food(mkOn).toFixed(1)} against ${food(mkOff).toFixed(1)}, buys ${buy(mkOn).toFixed(1)} against ${buy(mkOff).toFixed(1)}`);
  // ---- 1 a moved city takes its land with it ----
  await p.selectOption('#tierSel', 'mid'); await settle();
  const landOf = id => p.evaluate(id => { const x = MME.shell.cur.rt.test, L = x.land(), r = L.rows.find(r => r.id === id); return { n: r.farm + r.cleared + r.garden + r.terrace + r.logged + r.mine, sheet: x.landSheet().on, own: (() => { const U = x.landUse(), cs = x.cities(), k = cs.findIndex(c => c.id === id), h = cs[k].h, g = x.grid(); let near = 0; for (let i = 0; i < U.own.length; i++) if (U.own[i] === k && U.use[i] !== 5) { const d = Math.hypot(x.hexXY(i)[0] - x.hexXY(h)[0], x.hexXY(i)[1] - x.hexXY(h)[1]); if (d < 9999) near++; } return near; })() }; }, id);
  const mv = 'swalendaw', l0 = await landOf(mv);
  await p.click('#modes button[data-mode="city"]'); await p.waitForTimeout(300);
  for (let step = 0; step < 2; step++) { const q = await p.evaluate(id => MME.shell.cur.rt.test.cityXY(id), mv), xy = Array.isArray(q) ? q : [q.x, q.y]; await p.mouse.move(xy[0], xy[1]); await p.mouse.down(); for (let k = 1; k <= 6; k++) { await p.mouse.move(xy[0] + k * 4, xy[1] + k * 2); await p.waitForTimeout(40); } await p.mouse.up(); await settle(); }
  const l1 = await landOf(mv); await p.keyboard.press('Escape');
  ok('a city that is moved takes its land with it, about as much as before', l0.sheet && l1.sheet && l1.n > 0 && l1.n > l0.n * 0.5 && l1.n < l0.n * 2 && l1.own === l1.n, `${l0.n} hexes before, ${l1.n} after`);
  await p.click('#modes button[data-mode="view"]'); await p.selectOption('#tierSel', 'own'); await p.fill('#tierNum', '538600'); await p.press('#tierNum', 'Enter'); await settle();
  // ---- states: 7 slaves as goods, 9 deficit, 10 pressure, 11 tools, 3 spread ----
  const mk = arg => eco(`(e, a, x) => { const g = x.grid(); let cells = ''; for (let i = 0; i < g.N; i++) { const c = i % g.COLS; cells += c < g.COLS * 0.6 ? 'A' : c < g.COLS * 0.8 ? 'B' : 'C'; } e.noSlave = 0; e.states = [Object.assign({ id: 'A', name: 'รัฐใหญ่', color: '#d9534f', sys: 'merc', cur: '', rate: 1, rel: {}, slave: 'pat' }, a.A || {}), Object.assign({ id: 'B', name: 'รัฐกลาง', color: '#4f8fd9', sys: 'cap', cur: '', rate: 1, rel: {}, slave: 'free' }, a.B || {}), Object.assign({ id: 'C', name: 'รัฐเล็ก', color: '#58b368', sys: 'soc', cur: '', rate: 1, rel: {}, slave: 'abol' }, a.C || {})]; e.cells = cells; e.tune = Object.assign({}, e.tune, { homePref: 0, fxBal: 0, defFree: 0.01, polStart: 0.01, polFull: 0.1 }); }`, arg);   // v0.14.0 narrows deficits by itself: its two new levers held off and the thresholds lowered, so a deficit can still be studied
  await mk({ A: { pol: [], slave: 'free' }, B: { pol: [], slave: 'free' }, C: { pol: [], slave: 'pat' } });
  await eco('(e, a, x) => { const g = x.grid(); e.orgs = [{ id: "owel", name: "โรงทาน", kind: "charity", color: "#ffffff", cat: "", prod: 0, val: 0, well: 1, haul: 0, net: 0, base: 0, seats: x.cities().filter(c => (c.h % g.COLS) >= g.COLS * 0.8).map(c => c.id) }]; }');   // nobody of the patron state is poor enough to be sold, so its buyers look abroad
  const S = () => p.evaluate(() => { const x = MME.shell.cur.rt.test, s = x.soc(), L = x.labor(), g = x.gdp(), st = new Map(g.map(r => [r.id, r.st])); return { books: Object.fromEntries(s.books.map(b => [b.id, b])), slave: L ? L.flows.map(f => [st.get(f.a), st.get(f.b), f.n]) : [], goods: x.flowsOf ? null : null, econ: x.econ(), g }; });
  const sp = await S();
  ok('under patronage a state buys slaves from abroad and sells none out', sp.slave.some(f => f[0] !== 'C' && f[1] === 'C') && !sp.slave.some(f => f[0] === 'C' && f[1] !== 'C'), `${sp.slave.filter(f => f[0] !== 'C' && f[1] === 'C').reduce((a, f) => a + f[2], 0)} people bought into the patron state from abroad`);
  await eco('e => { e.orgs = []; }');
  await mk({ A: { pol: [] }, B: { pol: [] }, C: { pol: [] } });
  const s0 = await S();
  ok('a state that has abolished slavery neither buys nor sells', !s0.slave.some(f => f[0] === 'C' || f[1] === 'C'));
  const lab = await p.evaluate(() => { const x = MME.shell.cur.rt.test, L = x.labor(), all = x.flowList ? x.flowList() : null; return { opt: !!document.querySelector('#tdCat option[value="labor"]'), n: L.flows.length, cat: x.cats ? x.cats() : null }; });
  ok('slaves are a class of goods in the trade view', lab.opt && lab.n > 0 && s0.econ.flows > lab.n);
  const def = s0.books.C;
  ok('a state deep in deficit lives worse', def.def > 0.01 && def.pen > 0 && s0.g.filter(r => r.st === 'C').every(r => Math.abs((r.well0 + (r.trvWell || 0) - r.well) - Math.min(def.pen, r.well0)) < 0.01) && s0.books.B.pen === 0, `the small state: deficit ${(100 * def.def).toFixed(1)}% of GDP, well-being down ${def.pen.toFixed(1)}`);
  ok('a greater state squeezes the price of a smaller one beside it', s0.books.A.won > 0 && s0.books.B.lost > 0 && Math.abs(s0.books.A.won + s0.books.B.won - s0.books.B.lost - s0.books.C.lost) < 1 && s0.books.A.lost === 0, `the great state gains ${Math.round(s0.books.A.won)}`);
  await mk({ A: { pol: [], rel: { B: 'ally' } }, B: { pol: [] }, C: { pol: [] } });
  const sAl = await S(); ok('but not an ally', sAl.books.A.won === 0 && sAl.books.B.lost <= sAl.books.C.won + 1e-6 + sAl.books.B.lost * 0 && !(sAl.books.B.lost > 0 && sAl.books.C.won === 0 && sAl.books.A.won > 0));
  await mk({ A: { pol: [] }, B: { pol: [] }, C: {} });
  const s1 = await S(), pl = s1.books.C.plan;
  ok('a state in deficit reaches for the first tool its system favours, and its deficit shrinks', pl && pl.tools[0] === 'subst' && pl.def1 > s1.books.C.def && !s1.books.A.plan && s1.g.filter(r => r.st === 'C').every(r => r.pol && r.pol.tools.length >= 1), pl ? `${(100 * pl.def1).toFixed(1)}% -> ${(100 * s1.books.C.def).toFixed(1)}% with ${pl.tools.join(' ')} at ${(100 * pl.k).toFixed(0)}%` : 'no plan');
  const tools = {}; for (const t of ['tariff', 'subsidy', 'dev', 'aust', 'tour']) { await mk({ A: { pol: [] }, B: { pol: [] }, C: { pol: [t] } }); const s = await S(); tools[t] = { def: s.books.C.def, plan: s.books.C.plan, tin: s.books.C.tourIn }; }
  ok('each of the other tools is taken up when ticked, and none makes the deficit worse than doing nothing', Object.entries(tools).every(([t, v]) => v.plan && v.plan.tools.length === 1 && v.plan.tools[0] === t && v.def <= s0.books.C.def * 1.02), Object.entries(tools).map(([t, v]) => `${t} ${(100 * v.def).toFixed(1)}%`).join(' ') + ` (none ${(100 * s0.books.C.def).toFixed(1)}%)`);
  ok('drawing visitors brings their money in', tools.tour.tin > s0.books.C.tourIn * 1.02);
  await mk({ A: { pol: [] }, B: { pol: [] }, C: { pol: ['aust', 'tariff', 'subst'], pol1: 'tariff' } });
  const s2 = await S(); ok('the owner names which tool comes first', s2.books.C.plan && s2.books.C.plan.tools[0] === 'tariff');
  const share = async sp => { await mk({ A: { pol: [], spread: sp }, B: { pol: [] }, C: { pol: [] } }); const g = (await G()).filter(r => r.st === 'A'), tin = sum(g, r => r.demo.in), top = [...g].sort((a, b) => b.demo.in - a.demo.in)[0], small = [...g].sort((a, b) => a.demo.base - b.demo.base).slice(0, 20); return { top: top.demo.in / tin, small: sum(small, r => r.demo.in) / tin, seas: sum(g, r => r.demo.seasOut), spread: Math.max(...g.map(r => r.tw)) - Math.min(...g.map(r => r.tw)), coldOut: (() => { const s = [...g].sort((a, b) => a.tw - b.tw), q = Math.floor(s.length / 4); return sum(s.slice(0, q), r => r.demo.seasOut) / Math.max(1, sum(s.slice(0, q), r => r.demo.base)) > sum(s.slice(-q), r => r.demo.seasOut) / Math.max(1, sum(s.slice(-q), r => r.demo.base)); })() }; };
  const nat = await share('nat'), clump = await share('clump'), even = await share('even'), seas = await share('season');
  ok('a state chooses how its incomers spread: into a few great cities, or evenly', clump.top > nat.top * 1.2 && even.small > nat.small * 1.5 && even.top < nat.top, `largest city takes ${(100 * even.top).toFixed(0)}% evenly, ${(100 * nat.top).toFixed(0)}% by pull, ${(100 * clump.top).toFixed(0)}% clumped`);
  ok('or with the seasons, out of the cities with the harder winters', seas.seas > 0 && nat.seas === 0 && seas.coldOut, `winters differ by ${seas.spread.toFixed(0)} degrees across the state, ${Math.round(seas.seas)} people move with the season`);
  // ---- 13 states fold; 12 the city's tables ----
  await mk({ A: {}, B: {}, C: {} });
  await p.click('#modes button[data-mode="econ"]'); await p.click('#ecoTab button[data-t="states"]'); await p.waitForSelector('#ecobody details.stfold');
  const folds = () => p.evaluate(() => [...document.querySelectorAll('#ecobody details.stfold')].map(d => d.open));
  const f0 = await folds(); await p.click('#ecobody [data-a="stfold"][data-v="0"]'); await p.waitForTimeout(300); const f1 = await folds();
  await p.click('#ecobody details.stfold summary'); await p.waitForTimeout(300); await p.click('#ecoTab button[data-t="gdp"]'); await p.click('#ecoTab button[data-t="states"]'); await p.waitForTimeout(300); const f2 = await folds();
  ok('each state folds in the states tab, all at once too, and stays as it was left', f0.length === 3 && f0.every(Boolean) && f1.every(v => !v) && f2[0] === true && f2[1] === false);
  ok('a state\'s form holds its choices', await p.evaluate(() => { const b = document.querySelector('#ecobody details.stfold [data-s="A"]'); return !!b && !!b.querySelector('select[data-f="sspread"]') && !!b.querySelector('select[data-f="sreg"]') && b.querySelectorAll('input[data-f="spol"]').length === 6 && b.querySelectorAll('input[data-f="spol"]:checked').length === 3; }));
  await p.click('#ecobody details.stfold [data-s="A"] input[data-f="spol"][data-k="aust"]'); await settle();
  ok('ticking a tool changes what the state may do', await p.evaluate(() => MME.shell.cur.rt.test.eco().states.find(s => s.id === 'A').pol.includes('aust')));
  await p.click('#ecoTab button[data-t="gdp"]'); await p.waitForSelector('#ecobody details[data-fold="gpp"]');
  await p.evaluate(() => { for (const d of document.querySelectorAll('#ecobody details')) if (d.dataset.fold === 'gpp' || d.dataset.fold === 'gbl') d.open = true; });
  const gp = await p.evaluate(() => ({ rows: document.querySelectorAll('#ecobody details[data-fold="gpp"] .etr').length, bl: document.querySelectorAll('#ecobody details[data-fold="gbl"] .etr').length, n: MME.shell.cur.rt.test.cities().length }));
  ok('the GDP tab lists the people of every city and the books of every state', gp.rows === gp.n && gp.bl === 3);
  await p.click('#modes button[data-mode="trade"]'); await p.waitForTimeout(400);
  { const q = await p.evaluate(() => MME.shell.cur.rt.test.cityXY('swalendaw')), xy = Array.isArray(q) ? q : [q.x, q.y]; await p.mouse.click(xy[0], xy[1]); await p.waitForSelector('#tradebody details[data-tfold="prod"]'); }
  const card = () => p.evaluate(() => { const x = MME.shell.cur.rt.test, m = x.market(x.cities().find(c => c.h != null && document.querySelector('#tradebody h3').textContent.includes(c.name)).id); const pr = [...document.querySelectorAll('#tradebody details[data-tfold="prod"] .etr')], pc = [...document.querySelectorAll('#tradebody details[data-tfold="price"] .etr')]; return { prod: pr.length, cats: pc.length, want: m.prod, first: pr.length ? pr[0].children[0].textContent : '', nums: pr.map(r => +r.children[1].textContent), names: pr.map(r => r.children[0].textContent), open: [...document.querySelectorAll('#tradebody details.tfold')].map(d => d.open), soc: /ประชากรและความเป็นอยู่/.test(document.getElementById('tradebody').textContent) && !!document.querySelector('#tradebody select[data-sf="reg"]') }; });
  const c0 = await card();
  ok('the city\'s card shows everything it makes and every class it prices', c0.prod > 12 && c0.prod >= c0.want - 2 && c0.cats >= 12 && c0.soc, `${c0.prod} goods, ${c0.cats} classes`);
  ok('made most first to begin with', c0.nums.every((v, i) => i === 0 || v <= c0.nums[i - 1] + 1e-9));
  await p.click('#tradebody [data-ts="p:name"]'); await p.waitForTimeout(300); const c1 = await card();
  await p.click('#tradebody [data-ts="p:name"]'); await p.waitForTimeout(300); const c2 = await card();
  ok('a column clicked sets the order, clicked again turns it', c1.names.join('|') === [...c1.names].sort((a, b) => a.localeCompare(b, 'th')).join('|') && c2.names.join('|') === [...c1.names].reverse().join('|'));
  await p.click('#tradebody details[data-tfold="prod"] > summary'); await p.waitForTimeout(200); await p.click('#tradebody [data-ts="c:need"]'); await p.waitForTimeout(300); const c3 = await card();
  ok('and each list folds, and stays folded when the card is drawn again', c3.open[0] === false && c3.open[1] === true);
  await p.click('#tradebody details[data-tfold="prod"] > summary'); await p.click('#tradebody [data-ts="p:amt"]'); await p.waitForTimeout(200);
  await p.selectOption('#tradebody select[data-sf="reg"]', 'sweat'); await settle();
  ok('the order of work is set on the city\'s card', (await G()).find(r => r.id === 'swalendaw').reg === 'sweat');
  await p.click('#tradebody [data-sf="dice"]'); await settle();
  ok('and its lot drawn again', await p.evaluate(() => { const d = MME.shell.cur.rt.test.eco().demo; return !!d && !!d.swalendaw && d.swalendaw.nat >= 0.6 && d.swalendaw.nat <= 0.95; }));
  console.log('errors', errs.length + bad, errs.slice(0, 4).join(' | '));
  await browser.close();
})().catch(e => { console.error('TEST FAILED', e.message.slice(0, 900)); process.exit(1); });
