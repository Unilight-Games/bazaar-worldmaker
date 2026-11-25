// v0.20.0: government as Crusader Kings III has it, with two things from Victoria 3. Dividing a state seats counties at the
// greater communities, the smaller ones are its baronies; a duchy names the state that holds 51% of its counties; a state
// lists the titles it holds; new titles can be set up and filled by hand; a county can be left unincorporated or made a
// colony, and pays less for it. Old stock names become the new ones. Gresland, in the test browser's own copy.
const { chromium } = require('playwright');
let bad = 0; const ok = (m, c, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m, x === undefined ? '' : x); if (!c) bad++; };
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await (await browser.newContext({ viewport: { width: 1536, height: 900 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForSelector('.mapcard[data-id="gresland"]', { timeout: 60000 }); await p.click('.mapcard[data-id="gresland"] [data-act="open"]');
  await p.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable && MME.shell.cur.rt.state().econ, null, { timeout: 90000 }); await p.waitForTimeout(2000);
  const T = (f, a) => p.evaluate(f, a);
  // two states side by side over the middle of the map
  await T(() => { const t = MME.shell.cur.rt.test, d = t.eco(), g = t.grid(); let cells = ''; for (let i = 0; i < g.N; i++) { const c = i % g.COLS, r = (i / g.COLS) | 0; cells += r > g.ROWS * 0.15 && r < g.ROWS * 0.85 && c > g.COLS * 0.1 && c < g.COLS * 0.9 ? (c < g.COLS / 2 ? 'A' : 'B') : '.'; }
    d.states = [{ id: 'A', name: 'ตะวันตก', color: '#aa3333', sys: 'feud', rel: {} }, { id: 'B', name: 'ตะวันออก', color: '#3355aa', sys: 'feud', rel: {} }]; d.cells = cells; MME.shell.cur.rt.test.ecoSet ? MME.shell.cur.rt.test.ecoSet(d) : null; });
  const has = await T(() => !!MME.shell.cur.rt.test.ecoSet); if (!has) { console.log('no ecoSet hook'); }
  await p.waitForTimeout(2500);
  await p.click('#modes button[data-mode="econ"]'); await p.click('#ecoTab button[data-t="adm"]'); await p.waitForTimeout(400);
  ok('the tiers read county, duchy, kingdom', await T(() => [...document.querySelectorAll('#admLv button')].map(b => b.textContent).join(',') === 'เคาน์ตี,ดัชชี,คิงดอม,รัฐอธิปไตย'));
  await T(() => document.querySelector('[data-aa="build"][data-s="A"]').click()); await p.waitForTimeout(1500);
  const A = await T(() => { const t = MME.shell.cur.rt.test, a = t.adm(), cs = t.cities().filter(c => c.st === 'A'); const units = a.units; return { communities: cs.length, counties: units.filter(u => u.t === 0).length, duchies: units.filter(u => u.t === 1).length, kingdoms: units.filter(u => u.t === 2).length }; });
  ok('counties are seated at the greater communities, the rest are baronies', A.counties > 0 && A.counties < A.communities && Math.abs(A.counties - A.communities / 2.5) <= 2, JSON.stringify(A));
  ok('counties gather into duchies', A.duchies >= 1, JSON.stringify(A));
  // the state's card names the titles it holds
  await T(() => { const d = document.querySelector('[data-afold="A"]'); if (d) d.open = true; }); await p.waitForTimeout(200);
  ok('the state lists the titles it holds', /ตำแหน่งที่ครอง/.test(await p.textContent('[data-afold="A"]')));
  // a duchy's card names its holder
  const duke = await T(() => MME.shell.cur.rt.test.adm().units.find(u => u.t === 1).id);
  await T(id => { const a = document.createElement('a'); a.dataset.adm = id; a.href = '#'; document.getElementById('ecobody').appendChild(a); a.click(); }, duke); await p.waitForTimeout(400);
  ok('a duchy says who holds it', /ครองโดย/.test(await p.textContent('#ecobody')) && /ตามสิทธิ์/.test(await p.textContent('#ecobody')));
  // a new county, painted by hand
  const n0 = await T(() => MME.shell.cur.rt.test.admCount());
  await p.click('#ecobody [data-aa="new"][data-t="0"]'); await p.waitForTimeout(400);
  ok('a new county is set up and chosen', (await T(() => MME.shell.cur.rt.test.admCount())) === n0 + 1);
  const cvb = await p.locator('#mapbox canvas').first().boundingBox(); const x0 = cvb.x + cvb.width * 0.3, y0 = cvb.y + cvb.height * 0.5;
  await p.keyboard.down('Shift'); await p.mouse.move(x0, y0); await p.mouse.down(); await p.mouse.move(x0 + 60, y0, { steps: 8 }); await p.mouse.up(); await p.keyboard.up('Shift'); await p.waitForTimeout(600);
  const painted = await T(() => { const a = MME.shell.cur.rt.test.adm(); const u = a.units[a.units.length - 1]; return a.hexesOf ? a.hexesOf[u.id] : (u.hexes != null ? u.hexes : -1); });
  ok('Shift and a drag paint land into it', painted !== 0, painted);
  // incorporation: a colony pays less
  const pick = await T(() => { const t = MME.shell.cur.rt.test; const a = t.adm(); const c = a.units.find(u => u.t === 0 && u.seat); return { id: c.id, seat: c.seat }; });
  const tax0 = await T(id => { const r = MME.shell.cur.rt.test.fisc().rows.find(r => r.id === id); return r ? r.tax : null; }, pick.seat);
  await T(id => { const a = document.createElement('a'); a.dataset.adm = id; a.href = '#'; document.getElementById('ecobody').appendChild(a); a.click(); }, pick.id); await p.waitForTimeout(400);
  await p.selectOption('#ecobody select[data-af="inc"]', 'col'); await p.waitForTimeout(3500);
  const tax1 = await T(id => { const r = MME.shell.cur.rt.test.fisc().rows.find(r => r.id === id); return r ? r.tax : null; }, pick.seat);
  const stab = await T(id => { const r = MME.shell.cur.rt.test.fisc().rows.find(r => r.id === id); return r ? r.stab : null; }, pick.seat);
  ok('a colony pays a fraction of its taxes', tax0 > 0 && tax1 < tax0 * 0.5, tax0 + ' -> ' + tax1);
  ok('the choice is kept on the county', await T(id => MME.shell.cur.rt.test.adm().units.find(u => u.id === id).inc === 'col', pick.id));
  ok('no page errors', !errs.length, errs.join(' | '));
  await browser.close(); console.log(bad ? bad + ' failed' : 'all passed'); process.exit(bad ? 1 : 0);
})();
