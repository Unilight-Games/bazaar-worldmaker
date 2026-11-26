// v0.21.0: more goods (beasts of work, ten workshops, the goods the specialties named), workshop villages, the farmland of a
// community (shares, method, herds, draft beasts, bought fertiliser and feed), and what a town gains by making much of a thing.
// Gresland, in the test browser's own copy.
const { chromium } = require('playwright');
let bad = 0; const ok = (m, c, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m, x === undefined ? '' : x); if (!c) bad++; };
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await (await browser.newContext({ viewport: { width: 1536, height: 900 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForSelector('.mapcard[data-id="gresland"]', { timeout: 60000 }); await p.click('.mapcard[data-id="gresland"] [data-act="open"]');
  await p.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable && MME.shell.cur.rt.state().econ, null, { timeout: 90000 }); await p.waitForTimeout(3000);
  const T = (f, a) => p.evaluate(f, a), settle = () => p.waitForTimeout(4000);
  const wb = await T(() => MME.shell.cur.rt.test.worldBook());
  ok('the world trades the ten new workshop goods and beasts of work', ['drink', 'furniture', 'build', 'fert', 'feed', 'textile', 'pottery', 'food', 'medicine', 'jewelry', 'livestock'].every(c => wb[c] && wb[c][0] > 0), Object.keys(wb).length + ' classes');
  // a village that lives by a craft
  const v = await T(() => { const t = MME.shell.cur.rt.test; const c = t.cities().find(c => c.kind === 'village' && t.specFitList(c.id).includes('brewery')); return c ? c.id : null; });
  ok('a village can take up a craft', !!v);
  const drink0 = await T(id => { const b = MME.shell.cur.rt.test.cityBook(id).o.drink; return b ? b[0] : 0; }, v);
  await T(id => { const x = MME.shell.cur.rt.test, e = x.eco(); e.spec = { ...(e.spec || {}), [id]: 'brewery' }; x.ecoSet(e); }, v); await settle();
  const drink1 = await T(id => { const b = MME.shell.cur.rt.test.cityBook(id).o.drink; return b ? b[0] : 0; }, v);
  ok('a brewing village makes far more drink', drink1 > drink0 * 4, JSON.stringify([+drink0.toFixed(3), +drink1.toFixed(3)]));
  // the farmland
  const town = await T(() => { const t = MME.shell.cur.rt.test, g = t.gdp(); const c = t.cities().filter(c => c.kind === 'town' || c.kind === 'village').find(c => { const b = t.cityBook(c.id); return b && b.goods && Object.keys(b.goods).some(k => /grain|wheat|rice|gloam|stonetuber|sunbeet|amber/.test(k)); }); return c ? c.id : null; });
  const sum = (id, re) => T(([id, re]) => { const g = MME.shell.cur.rt.test.prodOf(id).prod, r = new RegExp(re); let a = 0; for (const [k, q] of Object.entries(g)) if (r.test(k)) a += q; return a; }, [id, re]);
  const G = 'gloam|stonetuber|sunbeet|amber|soulshape|oasisfruit|windgoblet|waterrope|wheat|rice', H = 'amberdairy|dodod|bison|cavehog|drake|horses|oxen|mules|hides|bisonhide|stonewool';
  const g0 = await sum(town, G), h0 = await sum(town, H);
  await T(id => { const x = MME.shell.cur.rt.test, e = x.eco(); e.farm = { [id]: { g: 30, p: 60 } }; x.ecoSet(e); }, town); await settle();
  const g1 = await sum(town, G), h1 = await sum(town, H);
  ok('more pasture: more from the herds, less grain', g1 < g0 && h1 > h0, JSON.stringify({ g: [+g0.toFixed(3), +g1.toFixed(3)], h: [+h0.toFixed(3), +h1.toFixed(3)] }));
  await T(id => { const x = MME.shell.cur.rt.test, e = x.eco(); e.farm = { [id]: { m: 'fert', d: 1 } }; x.ecoSet(e); }, town); await settle();
  const g2 = await sum(town, G), need = await T(id => MME.shell.cur.rt.test.needOf(id, 'fert'), town);
  ok('bought fertiliser and draft beasts: more grain, and the town wants fertiliser', g2 > g0 && need > 0, JSON.stringify({ g: [+g0.toFixed(3), +g2.toFixed(3)], need: +need.toFixed(4) }));
  ok('the farm is kept in the document', await T(id => MME.shell.cur.rt.test.eco().farm[id].m === 'fert', town));
  // the form
  await T(id => MME.shell.cur.rt.test.pickCity(id), town); await p.waitForTimeout(600);
  ok('the community form has its farmland', await T(() => { const b = document.getElementById('cfFarm'); return !!b && /ที่ดินเกษตรและปศุสัตว์/.test(b.textContent) && !!b.querySelector('select[data-fm="m"]'); }));
  // what a town gains by making much of a thing
  const g = await T(() => MME.shell.cur.rt.test.gdp());
  const gain = g.filter(r => (r.why || []).some(w => /^ผลิต/.test(w[0])));
  ok('towns that make much of a thing gain by it', gain.length > 0, gain.length + ' towns');
  ok('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  console.log(bad ? bad + ' failed' : 'all passed'); await browser.close(); process.exit(bad ? 1 : 0);
})();
