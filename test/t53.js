// v0.19.0 batch 4: the public purse: taxes by kind, gathering up the tiers, corruption, the budget, stability, a community's
// own rate, and customs duties and embargoes
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await (await browser.newContext({ viewport: { width: 1536, height: 900 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForSelector('.mapcard[data-id="gresland"]', { timeout: 60000 }); await p.click('.mapcard[data-id="gresland"] [data-act="open"]');
  await p.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable && MME.shell.cur.rt.state().econ, null, { timeout: 90000 });
  const T = (f, a) => p.evaluate(f, a), F = () => T(() => MME.shell.cur.rt.test.fisc());
  const settle = async () => { for (let n = 0, last = -1; n < 40; n++) { await p.waitForTimeout(1200); const v = await T(() => { const e = MME.shell.cur.rt.test.econ(); return e ? e.ver : -1; }); if (v === last && v >= 0) return; last = v; } };
  const set = async f => { const d = await T(() => MME.shell.cur.rt.test.eco()); f(d); await T(d => MME.shell.cur.rt.test.ecoSet(d), d); await settle(); return F(); };
  await settle();
  const eco0 = await T(() => MME.shell.cur.rt.test.eco()), G = await T(() => MME.shell.cur.rt.test.grid());
  let f = await set(d => { let cells = ''; for (let i = 0; i < G.N; i++) cells += (i % G.COLS) < G.COLS / 2 ? 'A' : 'B'; d.states = [{ id: 'A', name: 'ตะวันตก', color: '#aa3333', sys: 'feud', rel: {} }, { id: 'B', name: 'ตะวันออก', color: '#3355aa', sys: 'merc', rel: {} }]; d.cells = cells; });
  const A = () => f.st.find(s => s.id === 'A'), Bs = () => f.st.find(s => s.id === 'B');
  ok(A() && A().total > 0 && Bs() && Bs().total > 0, 'both states collect');
  ok(A().rev.land > 0 && A().rev.poll > 0 && Bs().rev.corp > 0 && Bs().rev.vat > 0, 'taxes come in by kind (feudal land and head, merchant companies and value added)');
  ok(Bs().rev.imp > 0 || A().rev.imp > 0, 'duties are paid at the border');
  ok(A().leak > 0 && A().leak < A().total * 0.6, 'corruption takes a share (' + (A().leak / A().total * 100).toFixed(1) + '%)');
  ok(Math.abs(A().reach - (A().bud.mil + A().bud.adm + A().bud.pub + A().bud.wel + A().treasury)) < 1e-6 * Math.max(1, A().reach), 'the budget spends what reached the centre');
  ok(f.rows.filter(r => r.s).every(r => r.stab != null && r.stab >= 0 && r.stab <= 100), 'every community in a state has its stability');
  // with units of government, the tiers keep their share
  await p.click('#modes button[data-mode="econ"]'); await p.click('#ecoTab button[data-t="adm"]'); await p.waitForTimeout(300);
  await p.evaluate(() => { for (const d of document.querySelectorAll('[data-afold]')) d.open = true; }); await p.click('[data-aa="build"][data-s="A"]'); await settle();
  f = await F(); ok(A().kept > 0 && f.units.length > 5, 'the units keep a share on the way up (' + f.units.length + ' units hold money)');
  // more welfare, people live better
  const wA = f.rows.filter(r => r.s === 'A'), w0 = wA.reduce((a, r) => a + r.well, 0) / wA.length;
  f = await set(d => { d.states.find(s => s.id === 'A').fisc = { bud: { wel: 0.8, mil: 0, adm: 0.1, pub: 0.1 } }; });
  const w1 = f.rows.filter(r => r.s === 'A').reduce((a, r) => a + r.well, 0) / wA.length;
  ok(w1 > w0, 'a welfare budget lifts well-being (' + w0.toFixed(1) + '→' + w1.toFixed(1) + ')');
  // a community exempt
  const one = f.rows.filter(r => r.s === 'A').sort((a, b) => b.tax - a.tax)[0];
  f = await set(d => { d.cmul = { [one.id]: 0 }; }); ok(f.rows.find(r => r.id === one.id).tax === 0, 'a community with rate 0 pays nothing');
  // customs: a high duty on grain from the east, then an embargo on everything
  const flows0 = f.flows.filter(x => (x.a === 'A' && x.b === 'B') || (x.a === 'B' && x.b === 'A')).length;
  f = await set(d => { d.states.find(s => s.id === 'A').trade = [{ p: 'B', c: '*', t: 0, e: 1 }]; });
  const flows1 = f.flows.filter(x => (x.a === 'A' && x.b === 'B') || (x.a === 'B' && x.b === 'A')).length;
  ok(flows0 > 0 && flows1 === 0, 'an embargo stops the trade between the two (' + flows0 + '→' + flows1 + ' flows)');
  f = await set(d => { d.states.find(s => s.id === 'A').trade = [{ p: 'B', c: 'grain', t: 0, e: 1 }]; });
  const g1 = f.flows.filter(x => ((x.a === 'A' && x.b === 'B') || (x.a === 'B' && x.b === 'A')));
  ok(g1.length > 0 && !g1.some(x => x.cat === 'grain'), 'an embargo on one class stops that class only');
  // the card
  await p.click('#ecoTab button[data-t="states"]'); await p.waitForTimeout(500);
  ok(await p.isVisible('[data-fz="poll"]') && await p.isVisible('[data-rf="new"]'), 'the state card sets taxes, budget and trade rules');
  await p.evaluate(() => { const e = document.querySelector('[data-fz="poll"]'); e.closest('.ssec').scrollIntoView({ block: 'start' }); }); await p.waitForTimeout(300);
  await p.screenshot({ path: '/tmp/b4-fisc.png', clip: { x: 1196, y: 60, width: 340, height: 840 } });
  await T(d => MME.shell.cur.rt.test.ecoSet(d), eco0);
  ok(!errs.length, 'no page errors ' + errs.join(' | '));
  await browser.close(); console.log(fails ? fails + ' failed' : 'all passed'); process.exit(fails ? 1 : 0);
})();
