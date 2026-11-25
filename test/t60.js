// v0.19.5: brush strokes on a blank map leave no see-through pixels along the edges of the patches they repaint (the dark
// straight lines the owner saw on 25 Nov 2026), and a reopened map has none either
const { chromium } = require('playwright');
let bad = 0; const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m, x === undefined ? '' : x); if (!c) bad++; };
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForSelector('#newBtn');
  await p.evaluate(() => { const v = document.getElementById('brVeil'); if (v) v.hidden = true; });
  await p.click('#newBtn'); await p.click('#nmStart button[data-v="blank"]'); await p.fill('#nmTitle', 'seam'); await p.fill('#nmKm', '5'); await p.click('#nmCreate'); await p.waitForTimeout(5000);
  await p.click('#modes button[data-mode="terrain"]'); await p.click('#pal .sw[data-b="g"]'); await p.click('#bsize button:nth-child(4)').catch(() => {});
  const box = await p.locator('#mapbox canvas').first().boundingBox();
  for (let r = 0; r < 9; r++) { const y = box.y + 220 + r * 45; await p.mouse.move(box.x + 300, y); await p.mouse.down(); for (let k = 1; k <= 12; k++) await p.mouse.move(box.x + 300 + k * 45, y + (k % 3) * 7); await p.mouse.up(); await p.waitForTimeout(150); }
  await p.waitForTimeout(1500);
  const a = await p.evaluate(() => MME.shell.cur.rt.test.layerHoles()); ok(a.hexes > 1000 && a.px === 0, 'after the strokes: no see-through pixel inside the land', JSON.stringify(a));
  await p.reload(); await p.waitForSelector('#newBtn'); await p.evaluate(() => { const v = document.getElementById('brVeil'); if (v) v.hidden = true; });
  await p.click('.mapcard:has-text("seam") [data-act="open"]'); await p.waitForTimeout(6000);
  const b = await p.evaluate(() => MME.shell.cur.rt.test.layerHoles()); ok(b.hexes === a.hexes && b.px === 0, 'reopened: the same land, still none', JSON.stringify(b));
  ok(!errs.length, 'no page errors', errs.join(' | '));
  await browser.close(); console.log(bad ? bad + ' failed' : 'all passed'); process.exit(bad ? 1 : 0);
})();
