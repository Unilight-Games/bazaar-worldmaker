// v0.19.0 batch 2: cultures and faiths: painting, spreading, traits on the communities, trade between them, the tithe, the
// pilgrims, the layer on the map, and a community's own choice
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await (await browser.newContext({ viewport: { width: 1536, height: 900 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForSelector('.mapcard[data-id="gresland"]', { timeout: 60000 }); await p.click('.mapcard[data-id="gresland"] [data-act="open"]');
  await p.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable && MME.shell.cur.rt.state().econ, null, { timeout: 90000 });
  const T = (f, a) => p.evaluate(f, a), B = () => T(() => MME.shell.cur.rt.test.bel());
  const settle = async () => { for (let n = 0, last = -1; n < 40; n++) { await p.waitForTimeout(1200); const v = await T(() => { const e = MME.shell.cur.rt.test.econ(); return e ? e.ver : -1; }); if (v === last && v >= 0) return; last = v; } };
  await settle();
  const eco0 = await T(() => MME.shell.cur.rt.test.eco());
  await p.click('#modes button[data-mode="econ"]'); await p.waitForTimeout(300);
  await p.click('#ecoTab button[data-t="cul"]'); await p.waitForTimeout(300);
  ok(await p.isVisible('[data-bl="spread"]'), 'the culture tab is there');
  await p.selectOption('#belSeeds', '4'); await p.click('[data-bl="spread"]'); await settle();
  let b = await B(); ok(b.cul.length === 4 && b.culn > 1000, 'four cultures spread over the land (' + b.culn + ' hexes)');
  ok(b.city.filter(c => c.cul).length === b.city.length, 'every community has a culture');
  ok(b.far > 0, 'some trade lines run between two cultures (' + b.far + ')');
  // a trait on a culture changes its communities
  const c0 = b.city.find(c => c.cul === b.cul[0].id);
  const fx0 = await T(id => MME.shell.cur.rt.test.comFx(id), c0.id);
  await p.click(`[data-bid="${b.cul[0].id}"] summary`).catch(() => {}); await p.waitForTimeout(200);
  await p.check(`[data-bid="${b.cul[0].id}"] [data-bt="artisan"]`); await settle();
  const fx1 = await T(id => MME.shell.cur.rt.test.comFx(id), c0.id);
  ok(Math.abs(fx1.ind / fx0.ind - 1.15) < 1e-6, 'an artisan culture makes its workshops 15% stronger');
  // faiths
  await p.click('#ecoTab button[data-t="rel"]'); await p.waitForTimeout(300);
  await p.selectOption('#belSeeds', '2'); await p.click('[data-bl="spread"]'); await settle();
  b = await B(); ok(b.rel.length === 2 && b.reln > 1000, 'two faiths spread');
  ok(Object.keys(b.tithe).length === 2 && Object.values(b.tithe).every(t => t.pool > 0 && t.seat), 'each faith gathers its tithe at its seat');
  // the layer, painting and undo
  const n0 = b.reln;
  await p.click(`[data-bid="${b.rel[0].id}"] [data-bl="pick"]`).catch(async () => { await p.click(`[data-bid="${b.rel[0].id}"] summary`); await p.click(`[data-bid="${b.rel[0].id}"] [data-bl="pick"]`); });
  await p.mouse.move(700, 450); await p.mouse.down({ button: 'right' }); await p.mouse.move(760, 470, { steps: 4 }); await p.mouse.up({ button: 'right' }); await p.waitForTimeout(300);
  ok((await B()).reln < n0, 'a right drag takes the faith off hexes');
  await p.keyboard.press('Control+z'); await p.waitForTimeout(300); ok((await B()).reln === n0, 'undo puts it back');
  // a community's own culture
  await p.click('#modes button[data-mode="city"]'); await p.waitForTimeout(300);
  const q = await T(() => { const t = MME.shell.cur.rt.test; for (const c of t.cities()) { const q = t.cityXY(c.id); if (q && q[0] > 880 && q[0] < 1120 && q[1] > 480 && q[1] < 860) return { id: c.id, q }; } });
  await p.mouse.click(q.q[0], q.q[1]); await p.waitForTimeout(400);
  ok(await p.isVisible('[data-cb="cul"]'), 'the community form chooses its own culture');
  const other = (await B()).cul.find(x => x.id !== (b.city.find(c => c.id === q.id) || {}).cul);
  if (other && await p.isVisible('[data-cb="cul"]')) { await p.selectOption('[data-cb="cul"]', other.id); await p.waitForTimeout(300); ok((await B()).city.find(c => c.id === q.id).cul === other.id, 'and keeps it'); }
  await p.keyboard.press('Escape');
  // the map layer switch
  await p.click('#modes button[data-mode="view"]'); await p.click('#belBtn'); ok((await p.textContent('#belBtn')).includes('วัฒนธรรม'), 'the layer shows culture'); await p.click('#belBtn'); ok((await p.textContent('#belBtn')).includes('ศาสนา'), 'then faith');
  await p.screenshot({ path: '/tmp/b2-rel.png' }); await p.click('#belBtn'); await p.click('#belBtn'); await p.screenshot({ path: '/tmp/b2-cul.png' }); await p.click('#belBtn');
  await T(d => MME.shell.cur.rt.test.ecoSet(d), eco0);
  ok(!errs.length, 'no page errors ' + errs.join(' | '));
  await browser.close(); console.log(fails ? fails + ' failed' : 'all passed'); process.exit(fails ? 1 : 0);
})();
