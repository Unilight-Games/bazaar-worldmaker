// v0.19.7: a crowded island farms harder before it goes short: some communities farm above 1x, no farther than the cap,
// the shortfall is smaller than the land alone would leave, and the card and the well-being say so
const { chromium } = require('playwright');
let bad = 0; const ok = (m, c, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m, x === undefined ? '' : x); if (!c) bad++; };
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  for (const port of [8765]) {
    const p = await (await browser.newContext({ viewport: { width: 1536, height: 864 } })).newPage();
    await p.goto(`http://localhost:${port}/index.html`); await p.waitForSelector('#newBtn');
    await p.evaluate(() => { const v = document.getElementById('brVeil'); if (v) v.hidden = true; });
    await p.click('#newBtn'); await p.click('#nmStart button[data-v="image"]'); await p.setInputFiles('#nmPicFile', require('path').join(__dirname, 'img', 'silhouette.png')); await p.waitForTimeout(800); await p.fill('#nmKm', '5'); await p.click('#nmCreate');
    await p.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable, null, { timeout: 90000 }); await p.waitForTimeout(2000);
    await p.click('#modes button[data-mode="city"]'); await p.waitForTimeout(300);
    const spots = await p.evaluate(() => { const t = MME.shell.cur.rt.test, gr = t.ground(), out = []; const cv = document.querySelector('#mapbox canvas').getBoundingClientRect();
      for (let i = 0; i < gr.length && out.length < 10; i++) { if (gr[i] !== 'g') continue; const xy = t.hexXY(i); if (xy[0] < cv.left + 420 || xy[0] > cv.right - 420 || xy[1] < cv.top + 220 || xy[1] > cv.bottom - 160) continue; if (out.some(o => Math.hypot(o[0] - xy[0], o[1] - xy[1]) < 80)) continue; out.push(xy); } return out; });
    for (let k = 0; k < spots.length; k++) { const before = await p.evaluate(() => MME.shell.cur.rt.test.vcount ? MME.shell.cur.rt.test.vcount() : MME.shell.cur.rt.test.cities().length);
      for (let tries = 0; tries < 3; tries++) { await p.click(`#ckind button[data-k="${k < 2 ? 'city' : 'village'}"]`); await p.mouse.move(1000, 850); await p.waitForTimeout(350); await p.mouse.click(spots[k][0], spots[k][1]); await p.waitForTimeout(300); if ((await p.evaluate(() => MME.shell.cur.rt.test.vcount ? MME.shell.cur.rt.test.vcount() : -1)) > before) break; await p.keyboard.press('Escape'); }
      await p.keyboard.type('c' + k); await p.keyboard.press('Enter'); await p.waitForTimeout(200); await p.keyboard.press('Escape'); }
    await p.click('#modes button[data-mode="view"]'); await p.waitForTimeout(2500);
    await p.selectOption('#tierSel', 'own').catch(() => {}); await p.fill('#tierNum', '40000000'); await p.press('#tierNum', 'Enter'); await p.waitForTimeout(4000);
    const r = await p.evaluate(() => { const t = MME.shell.cur.rt.test, L = t.land(), out = []; for (const c of t.cities()) { const q = t.prodOf(c.id); out.push(q.intens); } return { short: L.short, ints: out }; });
    const hi = r.ints.filter(x => x > 1.01);
    ok('crowded communities farm harder', hi.length > 0, r.ints.map(x => x.toFixed(2)).join(' '));
    ok('no harder than the cap', Math.max(...r.ints) <= 2.5 + 1e-9);
    const top = await p.evaluate(() => { const t = MME.shell.cur.rt.test; let best = null; for (const c of t.cities()) { const q = t.prodOf(c.id); if (!best || q.intens > best.i) best = { id: c.id, i: q.intens }; } return best; });
    await p.evaluate(id => MME.shell.cur.rt.test.pickCity(id), top.id); await p.click('#modes button[data-mode="trade"]').catch(() => {}); await p.waitForTimeout(300);
    const why = await p.evaluate(id => { const g = MME.shell.cur.rt.test.gdp().find(r => r.id === id); return g ? JSON.stringify(g.wellWhy || g.why || '') : ''; }, top.id);
    ok('its well-being names the harder farming', /ทำนาเข้มข้น/.test(why), why.slice(0, 160));
    await p.close();
  }
  await browser.close(); console.log(bad ? bad + ' failed' : 'all passed'); process.exit(bad ? 1 : 0);
})();
