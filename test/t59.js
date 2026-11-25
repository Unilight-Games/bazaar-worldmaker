// v0.19.4: a new map read from a picture, bare land and water only. Five pictures in test/img: a coloured map with a lake,
// a black silhouette, a pencil sketch, the sketch as an unevenly lit scan, and a cut-out on a clear ground.
const { chromium } = require('playwright'), path = require('path');
const URL = process.env.URL || 'http://localhost:8765/index.html';
let bad = 0; const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m, x === undefined ? '' : x); if (!c) bad++; };
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL); await p.waitForSelector('#newBtn');
  await p.evaluate(() => { const v = document.getElementById('brVeil'); if (v) v.hidden = true; });
  await p.click('#newBtn'); await p.click('#nmStart button[data-v="image"]'); await p.waitForTimeout(300);
  ok(await p.isVisible('#nmImage') && !(await p.isVisible('#nmSeedRow')), 'the picture controls show, the seed row hides');
  ok(/เลือกรูปก่อน/.test(await p.textContent('#nmStat')), 'asks for a picture first');
  const read = async f => { await p.setInputFiles('#nmPicFile', path.join(__dirname, 'img', f)); await p.waitForTimeout(900); const t = await p.textContent('#nmStat'); const n = s => +((t.match(new RegExp(s + ' ([0-9,]+)')) || [0, '-1'])[1].replace(/,/g, '')); return { t, land: n('แผ่นดิน'), lake: n('ทะเลสาบ') }; };
  const c = await read('colour.png'); ok(c.land > 4000 && c.land < 5500 && c.lake > 30, 'the coloured map: land and its lake', c.t);
  const s = await read('silhouette.png'); ok(s.land > 4800 && s.land < 5900 && /สีเข้มเป็นแผ่นดิน/.test(s.t), 'the silhouette: dark is land', s.t);
  const k = await read('sketch.png'); ok(k.land > 5300 && k.land < 6500 && /ลายเส้น/.test(k.t), 'the sketch: read as lines, the inside filled', k.t);
  const j = await read('scan.jpg'); ok(Math.abs(j.land - k.land) < 400 && j.lake < 50, 'the uneven scan reads like the clean sketch', j.t);
  const a = await read('alpha.png'); ok(Math.abs(a.land - s.land) < 400 && /โปร่งใส/.test(a.t) && await p.isDisabled('#nmCut'), 'the cut-out: the clear ground is water', a.t);
  await read('silhouette.png');
  await p.click('#nmInv'); await p.waitForTimeout(300); const inv = await p.textContent('#nmStat'); await p.click('#nmInv'); await p.waitForTimeout(300);
  ok(+inv.match(/แผ่นดิน ([0-9,]+)/)[1].replace(/,/g, '') > 9000, 'the swap turns the sea into land', inv);
  await p.fill('#nmCut', '5'); await p.dispatchEvent('#nmCut', 'input'); await p.waitForTimeout(300);
  ok(/5%/.test(await p.textContent('#nmCutV')), 'the split slider takes over from the automatic one');
  await p.click('#nmRead button[data-v="auto"]'); await p.waitForTimeout(300);
  ok(/อัตโนมัติ/.test(await p.textContent('#nmCutV')), 'choosing a reading resets the split');
  await read('colour.png'); await p.fill('#nmTitle', 'จากรูป'); await p.click('#nmCreate'); await p.waitForTimeout(6000);
  const m = await p.evaluate(() => { const t = MME.shell.cur.rt.test, b = t.b19(); const sea = t.grid(); return { title: MME.shell.cur.meta.title, gen: MME.shell.cur.meta.gen, ground: t.ground() }; });
  const kinds = new Set(m.ground.split('')); ok(m.title === 'จากรูป' && m.gen && m.gen.image === 1, 'the map opens and says it came from a picture', JSON.stringify(m.gen));
  ok([...kinds].every(ch => 'gSL.'.includes(ch)), 'only grassland, sea and lake', [...kinds].join(''));
  const mini = await p.evaluate(() => { const c = document.querySelector('.minimap'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let lit = 0; for (let q = 0; q < d.length; q += 4) if (d[q] + d[q + 1] + d[q + 2] > 120) lit++; return lit / (d.length / 4); });
  ok(mini > 0.3, 'the minimap of the new map is drawn', mini.toFixed(2));
  ok(!errs.length, 'no page errors', errs.join(' | '));
  await browser.close(); console.log(bad ? bad + ' failed' : 'all passed'); process.exit(bad ? 1 : 0);
})();
