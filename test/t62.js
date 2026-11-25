// v0.19.5: a hamlet, a monastery, a tribal camp and a way station start with far fewer people than a village
const { chromium } = require('playwright'), path = require('path');
let bad = 0; const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m, x === undefined ? '' : x); if (!c) bad++; };
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await (await browser.newContext({ viewport: { width: 1536, height: 900 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForSelector('#newBtn');
  await p.evaluate(() => { const v = document.getElementById('brVeil'); if (v) v.hidden = true; });
  await p.click('#newBtn'); await p.click('#nmStart button[data-v="image"]'); await p.setInputFiles('#nmPicFile', path.join(__dirname, 'img', 'silhouette.png')); await p.waitForTimeout(800); await p.click('#nmCreate'); await p.waitForTimeout(5000);
  await p.click('#modes button[data-mode="city"]'); await p.waitForTimeout(300);
  // land hexes well inside the island, spread along a row, and on screen
  const spots = await p.evaluate(() => { const t = MME.shell.cur.rt.test, g = t.grid(), gr = t.ground(), out = []; const cv = document.querySelector('#mapbox canvas').getBoundingClientRect();
    for (let i = 0; i < gr.length && out.length < 40; i++) { if (gr[i] !== 'g') continue; let inner = true; for (const d of [-1, 1, -g.COLS, g.COLS, -2, 2, -2 * g.COLS, 2 * g.COLS]) if (gr[i + d] !== 'g') inner = false; if (!inner) continue; const xy = t.hexXY(i); if (xy[0] < cv.left + 420 || xy[0] > cv.right - 420 || xy[1] < cv.top + 220 || xy[1] > cv.bottom - 160) continue; if (out.some(o => Math.hypot(o[0] - xy[0], o[1] - xy[1]) < 140)) continue; out.push(xy); }
    return out; });
  const kinds = (process.env.KO || 'village,hamlet,monastery,camp,waystation').split(',');
  ok(spots.length >= kinds.length, 'room for the test communities', spots.length);
  for (let k = 0; k < kinds.length; k++) {
    const before = await p.evaluate(() => MME.shell.cur.rt.test.vcount());
    for (let tries = 0; tries < 3; tries++) { await p.click(`#ckind button[data-k="${kinds[k]}"]`); await p.mouse.move(1000, 850); await p.waitForTimeout(400); /* let the options strip fold back */ await p.mouse.click(spots[k][0], spots[k][1]); await p.waitForTimeout(300); if (await p.evaluate(() => MME.shell.cur.rt.test.vcount()) > before) break; if (process.env.SHOT) { await p.screenshot({ path: '/tmp/imgs/t62-' + k + '-' + tries + '.png' }); console.log('miss', k, tries, await p.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e.tagName + '.' + e.className + '#' + e.id; }, spots[k])); } await p.keyboard.press('Escape'); }   /* the first click after a name may only close it */
    await p.keyboard.type('t-' + kinds[k]); await p.keyboard.press('Enter'); await p.waitForTimeout(250); await p.keyboard.press('Escape'); await p.waitForTimeout(150);
  }
  await p.waitForTimeout(3000);
  const pop = await p.evaluate(() => { const o = {}; for (const c of MME.shell.cur.rt.test.cities()) o[c.kind] = c.pop; return o; });
  console.log(JSON.stringify(pop));
  ok(kinds.every(k => pop[k] > 0), 'all five were placed');
  const r = k => pop[k] / pop.village, want = { hamlet: 0.15, monastery: 0.2, camp: 0.25, waystation: 0.06 };
  for (const [k, v] of Object.entries(want)) ok(Math.abs(r(k) - v) < 0.005, `${k} starts at ${v} of a village`, r(k).toFixed(3));
  ok(!errs.length, 'no page errors', errs.join(' | '));
  await browser.close(); console.log(bad ? bad + ' failed' : 'all passed'); process.exit(bad ? 1 : 0);
})();
