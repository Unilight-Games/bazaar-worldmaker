// the climate in seasons: a map of our own world by latitude and wind, the seasons added and removed, one season changed by hand, and Gresland untouched until its year is divided
const { chromium } = require('./_fit');
const URL = 'http://localhost:8765/index.html?fit=0';
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } }); const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push('PAGEERR ' + e.message)); page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
  const T = (f, a) => page.evaluate(f, a), r1 = x => x == null ? x : Math.round(x * 10) / 10;
  const ready = () => page.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable && MME.shell.cur.rt.state().econ, null, { timeout: 90000 });
  const clim = () => T(() => MME.shell.cur.rt.test.clim ? MME.shell.cur.rt.test.clim() : MME.shell.cur.rt.clim());
  const show = c => c.seasons ? c.seasons.map(s => s.name + ' ' + r1(s.t) + '°C (เหนือ ' + r1(s.north) + ' ใต้ ' + r1(s.south) + ') ฝน ' + Math.round(s.p)).join(' | ') : 'no seasons';
  await page.goto(URL); await page.waitForSelector('.mapcard');
  // a strip of land with a range down its middle, on an empty sea: the wind's wet side and dry side can be read off it
  await page.click('#newBtn'); await page.fill('#nmTitle', 'ทดสอบฤดู'); await page.click('#nmStart button[data-v="blank"]'); await page.click('#nmCreate'); await ready();
  const made = await T(() => {
    const rt = MME.shell.cur.rt, { N, COLS, ROWS } = rt.test.grid(), cells = new Array(N).fill('.'), mid = COLS >> 1;
    for (let r = 4; r < ROWS - 4; r++) for (let c = mid - 22; c <= mid + 22; c++) cells[r * COLS + c] = Math.abs(c - mid) <= 1 ? 'M' : 'g';
    MME.shell.cur.db.remoteDoc('terrain', { v: 2, cols: COLS, rows: ROWS, cells: cells.join(''), rivOff: [], rivSig: '0:0' });
    return { COLS, ROWS, mid };
  });
  await page.waitForTimeout(1500);
  let c = await clim(); console.log('new map of our own world, latitudes', c.lat.map(r1).join(' to '), '| land', c.land, '| broken', c.bad); console.log('  ' + show(c));
  console.log('  seasons add up to the year: mean gap', r1(c.sum), 'mm | year rain', Math.round(c.p), '| crops grow', Math.round(c.grow * 100) + '% of the year | rain-fed harvest', r1(c.f));
  const hx = (col, row) => T(([a, b]) => { const rt = MME.shell.cur.rt, g = rt.test.grid(); return rt.climHex(b * g.COLS + a); }, [col, row]);
  const row = made.ROWS >> 1, west = await hx(made.mid - 12, row), east = await hx(made.mid + 12, row);
  console.log('  belts by latitude at the middle row: west of the range', Math.round(west.p), 'mm, east', Math.round(east.p), 'mm | by season west', JSON.stringify(west.s), 'east', JSON.stringify(east.s));
  // the climate mode: the season row, the card, a wind from the west for the whole map
  await page.click('#modes button[data-mode="climate"]'); await page.waitForTimeout(500);
  console.log('season row:', (await page.$$eval('#clSeason button', a => a.map(b => b.textContent).join(' / '))), '| editor seasons:', await page.$$eval('#clseasbox .clseas [data-sid]', a => a.length));
  await page.selectOption('#clWind', 'W'); await page.waitForTimeout(900);
  const w2 = await hx(made.mid - 12, row), e2 = await hx(made.mid + 12, row); console.log('wind from the west all year: west of the range', Math.round(w2.p), 'mm, east', Math.round(e2.p), 'mm', w2.p > e2.p * 1.3 ? 'RAIN SHADOW' : 'NO SHADOW');
  await page.selectOption('#clWind', 'E'); await page.waitForTimeout(900);
  const w3 = await hx(made.mid - 12, row), e3 = await hx(made.mid + 12, row); console.log('wind from the east all year: west', Math.round(w3.p), 'mm, east', Math.round(e3.p), 'mm', e3.p > w3.p * 1.3 ? 'RAIN SHADOW' : 'NO SHADOW');
  // one season gets its own wind and more rain: a monsoon
  const sid = await page.$eval('#clseasbox .clseas [data-sid]:nth-of-type(3)', e => e.dataset.sid).catch(() => null);
  const ids = await page.$$eval('#clseasbox .clseas [data-sid]', a => a.map(e => e.dataset.sid)); const summer = ids[2];
  await page.selectOption(`#clseasbox [data-sid="${summer}"] [data-sf="wind"]`, 'W'); await page.waitForTimeout(700);
  await page.fill(`#clseasbox [data-sid="${summer}"] [data-sf="rain"]`, '200'); await page.dispatchEvent(`#clseasbox [data-sid="${summer}"] [data-sf="rain"]`, 'change'); await page.waitForTimeout(900);
  c = await clim(); console.log('summer with a west wind and double rain:'); console.log('  ' + show(c)); const w4 = await hx(made.mid - 12, row), e4 = await hx(made.mid + 12, row); console.log('  by season west', JSON.stringify(w4.s), 'east', JSON.stringify(e4.s));
  // seasons taken away and added: three seasons like the tropics, then a fifth
  await page.click(`#clseasbox [data-sid="${ids[1]}"] [data-sa="del"]`); await page.waitForTimeout(700);
  c = await clim(); console.log('one season removed:', c.seasons.length, 'seasons |', show(c), '| gap', r1(c.sum));
  await page.click('#clseasbox [data-sa="add"]'); await page.waitForTimeout(500); await page.click('#clseasbox [data-sa="add"]'); await page.waitForTimeout(700);
  const ids2 = await page.$$eval('#clseasbox .clseas [data-sid]', a => a.map(e => e.dataset.sid)), nw = ids2[ids2.length - 1];
  await page.fill(`#clseasbox [data-sid="${nw}"] [data-sf="name"]`, 'ฤดูมรสุม'); await page.dispatchEvent(`#clseasbox [data-sid="${nw}"] [data-sf="name"]`, 'change'); await page.waitForTimeout(400);
  await page.fill(`#clseasbox [data-sid="${nw}"] [data-sf="dt"]`, '-6'); await page.dispatchEvent(`#clseasbox [data-sid="${nw}"] [data-sf="dt"]`, 'change'); await page.waitForTimeout(900);
  c = await clim(); console.log('two seasons added, the last named and cooled by 6:', c.seasons.length, 'seasons |', show(c), '| broken', c.bad);
  // one season by hand, hex by hex
  await page.click(`#clseasbox [data-sid="${nw}"] [data-sa="view"]`); await page.waitForTimeout(500);
  console.log('looking at one season: layers', await page.$$eval('#clLayer button', a => a.map(b => b.textContent).join(' / ')));
  const before = await hx(made.mid - 12, row); await page.evaluate(() => window.scrollTo(0, 0));
  await page.click('#clLayer button[data-k="st"]'); await page.click('#clTool button[data-t="up"]'); await page.click('#clBrush button[data-n="3"]');
  const pt = await T(([a, b]) => { const rt = MME.shell.cur.rt, g = rt.test.grid(); return rt.test.pt((a + 0.5) / g.COLS, (b + 0.5) / g.ROWS); }, [made.mid - 12, row]);
  await page.mouse.move(pt[0], pt[1]); await page.mouse.down(); await page.mouse.move(pt[0] + 2, pt[1] + 1); await page.mouse.up(); await page.waitForTimeout(900);
  const after = await hx(made.mid - 12, row); console.log('brush on that season alone: the hex', JSON.stringify(before.s), '->', JSON.stringify(after.s), '| kept in the document:', Object.keys((await T(() => MME.shell.cur.db.known('climate'))).st || {}).length, 'hexes');
  await page.click('#clUndo'); await page.waitForTimeout(700); console.log('one step back:', JSON.stringify((await hx(made.mid - 12, row)).s));
  // south of the equator the seasons turn over
  await page.fill('#clLat0', '-20'); await page.dispatchEvent('#clLat0', 'change'); await page.fill('#clLat1', '-50'); await page.dispatchEvent('#clLat1', 'change'); await page.waitForTimeout(900);
  c = await clim(); console.log('the map moved south of the equator:', show(c));
  await page.click('#clseasbox [data-sa="reset"]'); await page.waitForTimeout(700); c = await clim(); console.log('seasons reset:', c.seasons.length, '|', show(c));
  await page.evaluate(() => window.scrollTo(0, 0)); await page.click('#mmBack'); await page.waitForSelector('.mapcard');
  // Gresland: the lore's two extremes until the owner divides the year, and the same trade either way at first
  await page.click('.mapcard[data-id="gresland"] [data-act="open"]'); await ready();
  const g0 = await clim(), e0 = await T(() => MME.shell.cur.rt.test.econ()); console.log('Gresland as it was:', g0.seasons ? 'SEASONS' : 'two extremes', '| year rain', Math.round(g0.p), '| harvest', r1(g0.f * 100) / 100, '| loads', Math.round(e0.vol), '| value', Math.round(e0.val));
  await page.click('#modes button[data-mode="climate"]'); await page.waitForTimeout(500); console.log('  season row hidden:', await page.$eval('#clSeason', e => e.closest('.optrow').hidden), '| note:', (await page.textContent('#clseasbox .clseas')).slice(0, 70));
  await page.click('#clseasbox [data-sa="split"]'); await page.waitForTimeout(600); await page.waitForFunction(v => MME.shell.cur.rt.test.econ().ver > v, e0.ver, { timeout: 60000 }); await page.waitForTimeout(500);
  const g1 = await clim(), e1 = await T(() => MME.shell.cur.rt.test.econ()); console.log('Gresland with its year divided in two:', show(g1)); console.log('  year rain', Math.round(g1.p), '| harvest', r1(g1.f * 100) / 100, '| loads', Math.round(e1.vol), '| value', Math.round(e1.val), '| broken', g1.bad);
  await page.click('#clseasbox [data-sa="reset"]'); await page.waitForTimeout(900); console.log('back to the lore:', (await clim()).seasons ? 'SEASONS' : 'two extremes', '| errors', errs.length, errs.slice(0, 4).join(' | '));
  await browser.close();
})().catch(e => { console.error('TEST FAILED', e.message.slice(0, 900)); process.exit(1); });
