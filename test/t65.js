// v0.19.6: on a fresh map, the government tab leads to the states tab when there is no state, and a state not yet divided
// shows the button that divides it without unfolding anything
const { chromium } = require('playwright');
let bad = 0; const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m, x === undefined ? '' : x); if (!c) bad++; };
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await (await browser.newContext({ viewport: { width: 1536, height: 864 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const flashes = []; await p.exposeFunction('__fl', t => flashes.push(t));
  await p.goto('http://localhost:8765/index.html'); await p.waitForSelector('#newBtn');
  await p.evaluate(() => { const v = document.getElementById('brVeil'); if (v) v.hidden = true; });
  await p.click('#newBtn'); await p.click('#nmStart button[data-v="image"]'); await p.setInputFiles('#nmPicFile', require('path').join(__dirname, 'img', 'silhouette.png')); await p.waitForTimeout(800); await p.click('#nmCreate'); await p.waitForTimeout(5000);
  await p.evaluate(() => { new MutationObserver(() => { for (const el of document.querySelectorAll('.flash, #flash, .toast')) if (el.textContent && !el.dataset.seen) { el.dataset.seen = 1; window.__fl(el.textContent); } }).observe(document.body, { subtree: true, childList: true, characterData: true }); });
  // communities
  await p.click('#modes button[data-mode="city"]'); await p.waitForTimeout(300);
  const spots = await p.evaluate(() => { const t = MME.shell.cur.rt.test, g = t.grid(), gr = t.ground(), out = []; const cv = document.querySelector('#mapbox canvas').getBoundingClientRect();
    for (let i = 0; i < gr.length && out.length < 12; i++) { if (gr[i] !== 'g') continue; const xy = t.hexXY(i); if (xy[0] < cv.left + 420 || xy[0] > cv.right - 420 || xy[1] < cv.top + 220 || xy[1] > cv.bottom - 160) continue; if (out.some(o => Math.hypot(o[0] - xy[0], o[1] - xy[1]) < 110)) continue; out.push(xy); } return out; });
  for (let k = 0; k < Math.min(8, spots.length); k++) {
    const before = await p.evaluate(() => MME.shell.cur.rt.test.vcount());
    for (let tries = 0; tries < 3; tries++) { await p.click(`#ckind button[data-k="${k === 0 ? 'city' : 'village'}"]`); await p.mouse.move(1000, 840); await p.waitForTimeout(350); await p.mouse.click(spots[k][0], spots[k][1]); await p.waitForTimeout(300); if (await p.evaluate(() => MME.shell.cur.rt.test.vcount()) > before) break; await p.keyboard.press('Escape'); }
    await p.keyboard.type('c' + k); await p.keyboard.press('Enter'); await p.waitForTimeout(200); await p.keyboard.press('Escape');
  }
  console.log('cities', await p.evaluate(() => MME.shell.cur.rt.test.vcount()));
  // no state yet: the government tab says so and leads to the states tab
  await p.click('.setpick [data-eco="states"]'); await p.waitForTimeout(600); await p.click('#ecoTab [data-t="adm"]'); await p.waitForTimeout(500);
  ok(/ยังไม่มีรัฐ/.test(await p.textContent('#ecobody')), 'with no state the tab says to make one first');
  await p.click('#ecobody [data-aa="gost"]'); await p.waitForTimeout(500);
  ok(await p.locator('#ecobody [data-a="snew"]').count() === 1, 'its button leads to the states tab'); await p.click('#ecobody [data-a="snew"]'); await p.waitForTimeout(500);
  console.log('paint', JSON.stringify(await p.evaluate(() => MME.shell.cur.rt.test.ecoPaintNow())));
  const cvb = await p.locator('#mapbox canvas').first().boundingBox();
  for (let r = 0; r < 14; r++) { const y = cvb.y + 200 + r * 30; await p.mouse.move(cvb.x + 380, y); await p.mouse.down(); await p.mouse.move(cvb.x + cvb.width - 420, y, { steps: 20 }); await p.mouse.up(); }
  await p.waitForTimeout(2500);
  console.log('state land', await p.evaluate(() => MME.shell.cur.rt.test.landOfStates()), 'cities in state', await p.evaluate(() => MME.shell.cur.rt.test.cities().filter(c => c.st !== '.').length));
  // the government tab, as a person would reach it
  const tabs = await p.evaluate(() => [...document.querySelectorAll('#ecoTab button')].map(b => b.dataset.t + ':' + b.textContent + (b.offsetParent ? '' : '(hidden)')).join(' '));
  console.log('tabs', tabs);
  await p.click('#ecoTab [data-t="adm"]').catch(e => console.log('tab click failed', e.message.split('\n')[0])); await p.waitForTimeout(600);
  const bb = p.locator('[data-aa="build"]'); console.log('build buttons', await bb.count(), 'visible', await bb.first().isVisible().catch(() => false), 'disabled', await bb.first().isDisabled().catch(() => null));
  ok(await bb.first().isVisible(), 'the divide button shows without unfolding the state');
  if (await bb.count()) { await bb.first().click({ timeout: 5000 }).catch(e => console.log('build click failed', e.message.split('\n')[0])); await p.waitForTimeout(1200); }
  ok((await p.evaluate(() => MME.shell.cur.rt.test.admCount())) > 0, 'a click divides the state', await p.evaluate(() => MME.shell.cur.rt.test.admCount()));
  ok(!errs.length, 'no page errors', errs.join(' | '));
  await browser.close(); console.log(bad ? bad + ' failed' : 'all passed'); process.exit(bad ? 1 : 0);
})();
