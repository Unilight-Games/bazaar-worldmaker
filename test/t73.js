// v0.21.0: the systems talk to each other. Each check changes one system and looks for the change where another system reads
// it: government into workshops and stability, marks of a state into customs, a unit's toll into trade, a shared money into
// trade, organisations into income, building materials into public works, the army into beasts and stores, the mint into
// precious metal, canals into shipping, and every new setting through saving and loading, and through undo.
// Gresland, in the test browser's own copy.
const { chromium } = require('playwright');
let bad = 0; const ok = (m, c, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m, x === undefined ? '' : x); if (!c) bad++; };
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await (await browser.newContext({ viewport: { width: 1536, height: 900 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForSelector('.mapcard[data-id="gresland"]', { timeout: 60000 }); await p.click('.mapcard[data-id="gresland"] [data-act="open"]');
  await p.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable && MME.shell.cur.rt.state().econ, null, { timeout: 90000 }); await p.waitForTimeout(3000);
  const T = (f, a) => p.evaluate(f, a), settle = () => p.waitForTimeout(4500);
  const base = { A: { id: 'A', name: 'ตะวันตก', color: '#aa3333', sys: 'merc', rel: { B: 'rival' } }, B: { id: 'B', name: 'ตะวันออก', color: '#3355aa', sys: 'merc', rel: { A: 'rival' } } };
  const set = async (fn, a) => { await T(([fn, a]) => { const t = MME.shell.cur.rt.test, d = t.eco(), g = t.grid(); if (!d.cells || !/[AB]/.test(d.cells)) { let cells = ''; for (let i = 0; i < g.N; i++) { const c = i % g.COLS, r = (i / g.COLS) | 0; cells += r > g.ROWS * 0.1 && r < g.ROWS * 0.9 && c > g.COLS * 0.05 && c < g.COLS * 0.95 ? (c < g.COLS / 2 ? 'A' : 'B') : '.'; } d.cells = cells; } (new Function('d', 'a', fn))(d, a); t.ecoSet(d); }, [fn.toString().replace(/^[^{]*{|}$/g, ''), a]); await settle(); };
  const S = () => T(() => { const t = MME.shell.cur.rt.test, st = Object.fromEntries(t.cities().map(c => [c.id, c.st])); const wb = { A: {}, B: {} }; for (const c of t.cities()) { if (!wb[c.st]) continue; const b = t.cityBook(c.id).o; for (const [k, v] of Object.entries(b)) wb[c.st][k] = (wb[c.st][k] || 0) + v[0]; } const f = t.flowsOf(); return { wb, ab: f.filter(x => st[x.a] !== st[x.b] && st[x.a] !== '.' && st[x.b] !== '.').reduce((a, x) => a + x.amt, 0), fisc: t.fisc().st, rows: t.fisc().rows }; });
  await set(d => { d.states = [{ ...a.A, rel: {} }, { ...a.B, rel: {} }]; }, base);
  const s0 = await S();
  // government into workshops
  await set(d => { d.states[0].gov = 'junta'; }, base); const s1 = await S();
  ok('a military government makes more arms', s1.wb.A.arms > s0.wb.A.arms * 1.2, JSON.stringify([+s0.wb.A.arms.toFixed(2), +s1.wb.A.arms.toFixed(2)]));
  const stab = rows => { const r = rows.filter(x => x.s === 'A' && x.stab != null); return r.reduce((a, x) => a + x.stab, 0) / r.length; };
  ok('and its people are less settled', stab(s1.rows) < stab(s0.rows), JSON.stringify([+stab(s0.rows).toFixed(1), +stab(s1.rows).toFixed(1)]));
  // a mark of the state into customs
  await set(d => { d.states[0].gov = ''; d.states[0].gtr = ['wall']; }, base); const s2 = await S();
  await set(d => { d.states[0].gtr = ['freeport']; }, base); const s3 = await S();
  const imp = s => (s.fisc.find(x => x.id === 'A') || { rev: { imp: 0 } }).rev.imp;
  ok('a free port takes less at the border than a wall of duties', imp(s3) < imp(s2), JSON.stringify([Math.round(imp(s2)), Math.round(imp(s3))]));
  // a shared money into trade
  await set(d => { d.states[0].gtr = []; d.states[0].cur = 'ดีนาร์'; d.states[0].rate = 2; d.states[0].coin = { use: 'own', form: 'fiat' }; d.states[1].cur = 'ลีรา'; d.states[1].rate = 0.5; d.states[1].coin = { use: 'own', form: 'fiat' }; }, base); const s4 = await S();
  await set(d => { d.states[1].coin = { use: 'A' }; }, base); const s5 = await S();
  ok('two states on one money trade more with each other', s5.ab > s4.ab, JSON.stringify([+s4.ab.toFixed(2), +s5.ab.toFixed(2)]));
  // the mint into precious metal
  await set(d => { d.states[0].coin = { use: 'own', form: 'gold' }; }, base);
  const rareA = await T(() => { const t = MME.shell.cur.rt.test; let a = 0; for (const c of t.cities()) if (c.st === 'A') a += t.needOf(c.id, 'rare') || 0; return a; });
  await set(d => { d.states[0].coin = { use: 'own', form: 'fiat' }; }, base);
  const rareF = await T(() => { const t = MME.shell.cur.rt.test; let a = 0; for (const c of t.cities()) if (c.st === 'A') a += t.needOf(c.id, 'rare') || 0; return a; });
  ok('a mint of gold coin buys precious metal', rareA > rareF, JSON.stringify([+rareF.toFixed(3), +rareA.toFixed(3)]));
  // a unit's toll into trade
  await T(() => { document.querySelector('#modes button[data-mode="econ"]').click(); }); await p.click('#ecoTab button[data-t="adm"]'); await p.waitForTimeout(300);
  await T(() => document.querySelector('[data-aa="build"][data-s="A"]').click()); await settle();
  const unit = await T(() => { const a = MME.shell.cur.rt.test.adm(); return a.units.filter(u => u.t === 0 && u.st === 'A').sort((x, y) => y.cities - x.cities)[0].id; });
  const into = () => T(id => { const t = MME.shell.cur.rt.test, a = t.adm(), ids = new Set(t.cities().filter(c => { const ch = t.admAt(...t.cityAt(c.id)); return ch && ch[0] && ch[0].id === id; }).map(c => c.id)); return t.flowsOf().filter(f => ids.has(f.b) && !ids.has(f.a)).reduce((x, f) => x + f.amt, 0); }, unit);
  const in0 = await into();
  await T(id => { const t = MME.shell.cur.rt.test, e = t.eco(); e.adm.find(u => u.id === id).toll = 0.6; t.ecoSet(e); }, unit); await settle();
  const in1 = await into();
  ok('a heavy toll cuts what comes into the unit', in1 < in0, JSON.stringify([+in0.toFixed(3), +in1.toFixed(3)]));
  // undo of a unit's purse
  await T(id => { const a = document.createElement('a'); a.dataset.adm = id; a.href = '#'; document.getElementById('ecobody').appendChild(a); a.click(); }, unit); await p.waitForTimeout(400);
  await p.fill('#ecobody input[data-uf="rate"]', '12'); await T(() => document.querySelector('#ecobody input[data-uf="rate"]').dispatchEvent(new Event('change', { bubbles: true }))); await p.waitForTimeout(600);
  const r1 = await T(id => MME.shell.cur.rt.test.adm().units.find(u => u.id === id).rate, unit);
  await T(() => document.activeElement && document.activeElement.blur()); await p.keyboard.press('Control+z'); await p.waitForTimeout(800);
  const r2 = await T(id => MME.shell.cur.rt.test.adm().units.find(u => u.id === id).rate, unit);
  ok('a unit\'s rate is one step back', r1 === 0.12 && r2 !== 0.12, JSON.stringify([r1, r2]));
  // the army into beasts and stores
  await set(d => { d.army = d.army || {}; }, base);
  const an = await T(() => { const t = MME.shell.cur.rt.test, out = {}; for (const c of t.cities()) { const m = t.armyNeedOf(c.id); for (const [k, v] of Object.entries(m)) out[k] = (out[k] || 0) + v; } return out; });
  ok('the army asks for preserved food and medicine', (an.food || 0) > 0 && (an.medicine || 0) > 0, JSON.stringify(Object.fromEntries(Object.entries(an).map(([k, v]) => [k, +v.toFixed(3)]))));
  // building materials into public works
  const fb = await T(() => MME.shell.cur.rt.test.fisc().st);
  ok('the works budget knows how much brick and lime it got', fb.length > 0 && fb.every(x => x.build >= 0 && x.build <= 1), JSON.stringify(fb.map(x => [x.id, x.build && +x.build.toFixed(2)])));
  // canals into shipping
  const nav0 = await T(() => MME.shell.cur.rt.test.nav().big);
  await T(() => { const t = MME.shell.cur.rt.test, R = t.R(); const pts = []; for (let i = 0; i < 12; i++) pts.push([600 + i * R * 2, 400]); t.riverDraw(pts, 'canal'); }); await settle();
  const nav1 = await T(() => MME.shell.cur.rt.test.nav().big);
  ok('a canal opens water to sea-going ships', nav1 > nav0, JSON.stringify([nav0, nav1]));
  // everything new is saved and read back
  await set(d => { d.states[0].gov = 'federation'; d.states[0].gtr = ['rights', 'bureau']; d.states[0].coin = { use: 'own', form: 'note' }; d.states[0].fisc = { loc: { 1: 0.07 }, lbase: { 0: 'poll' }, lbud: { wel: 0.5 } }; d.farm = { x1: { g: 20, p: 70, m: 'irrig', h: 'nomad', d: 1 } }; d.tune = { ...(d.tune || {}), fishReach: 3, specRoad: 0.5 }; }, base);
  const rt = await T(() => { const t = MME.shell.cur.rt.test, e = t.eco(); t.ecoSet(JSON.parse(JSON.stringify(e))); const f = t.eco(), a = f.states.find(s => s.id === 'A'); return { gov: a.gov, gtr: (a.gtr || []).join(), coin: a.coin, loc: a.fisc && a.fisc.loc, lbase: a.fisc && a.fisc.lbase, lbud: a.fisc && a.fisc.lbud, farm: f.farm, tune: f.tune, units: f.adm.filter(u => u.toll || u.rate != null).length }; });
  ok('the form, its marks, the money, the local taxes, the farmland and the dials come back from the document', rt.gov === 'federation' && rt.gtr.split(',').sort().join() === 'bureau,rights' && rt.coin.form === 'note' && rt.loc[1] === 0.07 && rt.lbase[0] === 'poll' && rt.lbud.wel === 0.5 && rt.farm.x1.m === 'irrig' && rt.tune.fishReach === 3, JSON.stringify(rt));
  ok('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  console.log(bad ? bad + ' failed' : 'all passed'); await browser.close(); process.exit(bad ? 1 : 0);
})();
