// v0.21.0: map sizes past the large one. The extra-large preset (560 × 364), a custom size up to 1080 a side,
// a km per hex that shrinks as the hexes grow, the raised limits on files, and the sharp view on a huge map.
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://localhost:8765/index.html';
let bad = 0; const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m, x === undefined ? '' : x); if (!c) bad++; };
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL); await p.waitForSelector('#newBtn');
  await p.evaluate(() => { const v = document.getElementById('brVeil'); if (v) v.hidden = true; });
  await p.click('#newBtn'); await p.waitForTimeout(400);
  const sizes = await p.evaluate(() => ({ xl: MME.SIZES.xl, max: MME.MAXDIM, min: MME.MINDIM, opts: [...document.querySelectorAll('#nmSizes input[name=nmSize]')].map(e => e.value) }));
  ok(sizes.xl && sizes.xl.cols === 560 && sizes.xl.rows === 364, 'the extra-large preset is 560 × 364', JSON.stringify(sizes.xl));
  ok(sizes.max === 1080 && sizes.min === 16 && sizes.opts.join() === 's,m,l,xl,c', 'five choices, the custom one last, each side 16 to 1080', sizes.opts.join());
  const pick = async v => { await p.evaluate(v => { const r = document.getElementById('nmSize-' + v); r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); }, v); await p.waitForTimeout(250); return +(await p.inputValue('#nmKm')); };
  const km = { s: await pick('s'), m: await pick('m'), l: await pick('l'), xl: await pick('xl') };
  ok(km.s === 30 && km.m === 30 && km.l === 20 && km.xl === 8.5, 'km per hex follows the size: small and medium 30, large 20, extra large 8.5', JSON.stringify(km));
  ok(/ตั้งตามขนาดแผนที่/.test(await p.textContent('#nmKmNote')), 'the note says the scale was set from the size');
  const setDim = async (c, r) => { await p.evaluate(([c, r]) => { for (const [id, v] of [['nmCols', c], ['nmRows', r]]) { const e = document.getElementById(id); e.focus(); e.value = v; e.dispatchEvent(new Event('change')); } }, [c, r]); await p.waitForTimeout(300); };
  await setDim(5000, 3);
  const cl = await p.evaluate(() => ({ c: +document.getElementById('nmCols').value, r: +document.getElementById('nmRows').value, on: document.getElementById('nmSize-c').checked }));
  ok(cl.c === 1080 && cl.r === 16 && cl.on, 'typed sizes clamp to 16 to 1080 and pick the custom choice', JSON.stringify(cl));
  ok(+(await p.inputValue('#nmKm')) === 4.5, 'a custom 1080-wide map starts at 4.5 km per hex', await p.inputValue('#nmKm'));
  ok(!(await p.isVisible('.sizeopt .heavy')), 'a long thin strip is not heavy');
  await setDim(1080, 702);
  ok(await p.isVisible('.sizeopt .heavy'), 'a heavy size warns about the machine', await p.evaluate(() => (document.querySelector('.sizeopt .heavy') || {}).textContent));
  await p.fill('#nmKm', '12'); await p.dispatchEvent('#nmKm', 'input'); await pick('l');
  ok(+(await p.inputValue('#nmKm')) === 12, 'once typed, the scale stays the player’s own', await p.inputValue('#nmKm'));
  await p.evaluate(() => document.getElementById('nmCancel').click()); await p.waitForTimeout(300);
  await p.click('#newBtn'); await p.waitForTimeout(400); await pick('m'); ok(+(await p.inputValue('#nmKm')) === 30, 'a fresh form follows the size again', await p.inputValue('#nmKm'));
  // a 560 × 364 map opens and draws
  await pick('xl'); await p.fill('#nmTitle', 'ใหญ่พิเศษ'); const t0 = Date.now();
  await p.evaluate(() => document.getElementById('nmCreate').click());
  await p.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable, null, { timeout: 300000 });
  const m = await p.evaluate(() => ({ cols: MME.shell.cur.meta.cols, rows: MME.shell.cur.meta.rows, km: MME.shell.cur.meta.kmPerHex }));
  ok(m.cols === 560 && m.rows === 364 && m.km === 8.5, 'the extra-large map opens at 8.5 km per hex', JSON.stringify(m) + ' ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');
  await p.waitForTimeout(2500);
  const d0 = await p.evaluate(() => MME.shell.cur.rt.test.detail());
  ok(d0.shk > 1 && !d0.on, 'the whole-map view uses the coarser sheet, no sharp view yet', JSON.stringify(d0));
  await p.evaluate(() => MME.shell.cur.rt.test.setView(1.6)); await p.waitForTimeout(2500);
  const d1 = await p.evaluate(() => MME.shell.cur.rt.test.detail());
  ok(d1.on && d1.s === 1.6 && d1.ms < 3000, 'zooming in paints a sharp view of the screen', JSON.stringify(d1));
  const lim = await p.evaluate(() => MME.MAXDIM);
  ok(lim === 1080, 'files and rooms accept up to the same limit');
  // the ranges seen from afar (the owner, 26 Nov 2026): a few large peaks, the single ones back when close
  await p.evaluate(() => MME.shell.cur.rt.test.setView(0.08)); await p.waitForTimeout(800);
  const f = await p.evaluate(() => MME.shell.cur.rt.test.massif());
  ok(f.a === 1 && f.mts > 50 && f.peaks * 6 < f.mts, 'far out, the mountains stand as a few large peaks', JSON.stringify(f));
  await p.evaluate(() => MME.shell.cur.rt.test.setView(2)); await p.waitForTimeout(800);
  const n = await p.evaluate(() => MME.shell.cur.rt.test.massif());
  ok(n.a === 0, 'close in, every mountain hex has its own peak again', JSON.stringify(n));
  // the weather of a new land counts in km: the same land made at 8.5 km a hex has the same make-up as at 30 on a medium map
  const g = await p.evaluate(() => { const share = (sz, km) => { const S = MME.SIZES[sz], c = MME.generate(MME.gridFor(S.cols, S.rows), { seed: 4242, style: 'continent', land: 0.38, relief: 0.5, climate: 'mixed', wind: 'W', rivers: -1, km }).cells; let d = 0, l = 0; for (const ch of c) if (ch !== '.') { l++; if (ch === 'd' || ch === 'c') d++; } return Math.round(100 * d / l); }; return { m30: share('m', 30), xl85: share('xl', 8.5), xl30: share('xl', 30) }; });
  ok(Math.abs(g.m30 - g.xl85) <= 8 && g.xl30 > g.xl85 + 15, 'dry land: medium at 30 km and extra large at 8.5 km alike; extra large at 30 km far drier', JSON.stringify(g));
  ok(errs.length === 0, 'no page errors', errs.slice(0, 3).join(' | '));
  await browser.close(); console.log(bad ? bad + ' FAILED' : 'all passed'); process.exit(bad ? 1 : 0);
})();
