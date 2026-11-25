// v0.19.0 batch 1: features from points, waterfall and rift valley, the ground look, special zones, notes and the world's page,
// the two-second peek, the ruler, the journey planner, cutting a part out as a new map, and the pinned brushes
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await (await browser.newContext({ viewport: { width: 1536, height: 900 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForSelector('.mapcard[data-id="gresland"]', { timeout: 60000 }); await p.click('.mapcard[data-id="gresland"] [data-act="open"]');
  await p.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable && MME.shell.cur.rt.state().econ, null, { timeout: 90000 });
  const T = (f, a) => p.evaluate(f, a), B = () => T(() => MME.shell.cur.rt.test.b19());
  const settle = async () => { for (let n = 0, last = -1; n < 40; n++) { await p.waitForTimeout(1200); const v = await T(() => { const e = MME.shell.cur.rt.test.econ(); return e ? e.ver : -1; }); if (v === last && v >= 0) return; last = v; } };
  await settle();

  // ---- features ----
  let b = await B();
  ok(b.fk.t && b.fk.t.name === 'น้ำตก' && b.fk.u && b.fk.u.name === 'หุบเขาทรุดตัว' && b.fk.u.look === 'ground', 'waterfall and great rift valley are kinds of feature, the rift looking like ground');
  ok(b.fk.g.look === 'ground' && b.fk.a.look === 'mark', 'pasture looks like ground, the oasis keeps its sign');
  // points become features
  await p.click('#modes button[data-mode="info"]'); await p.waitForTimeout(400);
  ok(!(await p.$('[data-ptk]')), 'no row to place a new point of interest');
  ok((await p.$$eval('#ifTool button', bs => bs.map(x => x.dataset.t))).join() === 'pick,zone', 'the information tools are pick and special zones');
  const p0 = b.pts, pl0 = b.ptl, eco0 = await T(() => MME.shell.cur.rt.test.eco());
  if (p0 > 0) {
    await p.click('#ptMove'); await p.waitForTimeout(500); b = await B();
    ok(b.pts === 0 && b.feat > 0, 'the points moved over to features (' + p0 + ' points)');
    ok(b.ptl >= pl0 - 1 && b.ptl > 0, 'and still count as points for goods, visitors and holiness (' + pl0 + '→' + b.ptl + ')');
    ok(Object.values(b.fk).some(k => k.pk), 'a kind of feature remembers the kind of point it came from');
    await p.keyboard.press('Control+z'); await p.waitForTimeout(400);
    ok((await B()).pts === p0, 'one undo brings the points back');
  } else ok(true, 'this map has no points to move');

  // ---- special zones ----
  await p.click('#ifTool button[data-t="zone"]'); await p.waitForTimeout(300);
  await p.selectOption('#szNewKind', 'war'); await p.click('[data-sz="new"]'); await p.waitForTimeout(300);
  b = await B(); ok(b.sz.length === 1 && b.sz[0].danger === 3 && b.sz[0].well === -12, 'a war zone is added with its starting danger and well-being');
  const city = await T(() => { const t = MME.shell.cur.rt.test; for (const c of t.cities()) { const q = t.cityXY(c.id); if (q && q[0] > 500 && q[0] < 1100 && q[1] > 250 && q[1] < 750) return { id: c.id, q }; } return null; });
  await p.mouse.move(city.q[0], city.q[1]); await p.mouse.down(); await p.mouse.move(city.q[0] + 30, city.q[1] + 10, { steps: 5 }); await p.mouse.up(); await p.waitForTimeout(300);
  b = await B(); ok(b.szn > 3, 'painting lays the zone on hexes (' + b.szn + ')');
  await settle();
  const sw = await T(() => MME.shell.cur.rt.test.szWell()), lz = await T(() => MME.shell.cur.rt.test.linkZones());
  ok(sw.some(r => r.id === city.id), 'the community inside the zone counts it');
  ok(lz.length > 0, 'trade lines through the zone carry its danger (' + lz.length + ')');
  await p.keyboard.press('Control+z'); await p.waitForTimeout(300); ok((await B()).szn === 0, 'undo takes the painting away');
  await p.keyboard.press('Control+Shift+z'); await p.waitForTimeout(300);

  // ---- notes ----
  await p.click('#szCard, [data-szid] [data-note]').catch(() => {}); await p.waitForTimeout(300);
  ok(!(await p.$eval('.mmodal', e => e.hidden)), 'the zone\'s note opens in the writer');
  await p.click('#ntEdit'); await p.keyboard.type('สงครามแม่น้ำแดง'); await p.click('#ntTools [data-c="bold"]');
  await T(() => { const e = document.getElementById('ntEdit'); e.innerHTML += '<script>x=1</script><img src=x onerror="window.__bad=1"><h3 onclick="1">หัวข้อ</h3>'; e.dispatchEvent(new Event('input')); });
  await p.waitForTimeout(800); await p.click('#ntClose'); await p.waitForTimeout(200);
  b = await B(); const nk = Object.keys(b.notes).find(k => k.startsWith('x:')), nv = nk ? b.notes[nk] : '';
  ok(nv.includes('สงครามแม่น้ำแดง') && nv.includes('<h3>หัวข้อ</h3>'), 'the note keeps its words and headings');
  ok(!/script|img|onclick|onerror/.test(nv), 'and nothing that could run');
  // the world's page
  await p.click('#setWorld'); await p.fill('#ntWName', 'คีรันนา'); await p.fill('#ntWYear', '1203'); await p.fill('#ntWEra', 'ยุคหลังสงคราม'); await p.waitForTimeout(700); await p.click('#ntClose');
  b = await B(); ok(b.world.name === 'คีรันนา' && b.world.year === '1203', 'the world\'s name and year are kept');
  ok((await p.textContent('#worldLine')).includes('คีรันนา'), 'and shown on the map');

  // ---- the peek ----
  await p.click('#modes button[data-mode="view"]'); await p.waitForTimeout(300);
  await p.mouse.move(city.q[0] + 2, city.q[1] + 1); await p.mouse.move(city.q[0], city.q[1]); await p.waitForTimeout(900);
  ok(await p.isVisible('.peekring') && !(await p.isVisible('.peek')), 'a ring fills while the pointer rests');
  await p.waitForTimeout(1500);
  ok(await p.isVisible('.peek'), 'after two seconds the peek shows ' + (await p.textContent('.peek')).slice(0, 40));
  await p.mouse.move(city.q[0] + 300, city.q[1] + 100); await p.waitForTimeout(200); ok(!(await p.isVisible('.peek')), 'and goes when the pointer leaves');

  // ---- the ruler ----
  await p.click('#rulerBtn'); await p.mouse.click(700, 400); await p.mouse.click(900, 400); await p.waitForTimeout(200);
  b = await B(); ok(b.ruler === 2 && b.tool === 'ruler', 'the ruler takes two points');
  await p.keyboard.press('Escape'); await p.keyboard.press('Escape'); b = await B(); ok(b.ruler === 0 && !b.tool, 'Esc clears it and leaves');

  // ---- the journey planner ----
  await p.click('#tripBtn'); await p.click('[data-tp="pin"]'); await p.mouse.click(city.q[0], city.q[1]); await p.waitForTimeout(300);
  b = await B(); ok(b.trip.pin >= 0, 'the party\'s pin is placed');
  await p.click('[data-tp="way"]'); await p.mouse.click(city.q[0] + 120, city.q[1] + 40); await p.waitForTimeout(400);
  b = await B(); ok(b.legs.length === 1 && b.legs[0] > 0 && isFinite(b.legs[0]), 'a leg to a mark takes ' + (b.legs[0] || 0).toFixed(2) + ' days on foot');
  await p.selectOption('[data-tp="veh"]', 'horse'); await p.waitForTimeout(300);
  const b2 = await B(); ok(b2.legs[0] < b.legs[0], 'a horse is quicker (' + b2.legs[0].toFixed(2) + ' days)');
  await p.click('[data-tp="close"]');

  // ---- cut out ----
  const f = await T(() => { const t = MME.shell.cur.rt.test; const cs = t.cities().slice(0, 1); return t.cropTest([200, 200], [520, 420]); });
  ok(f && f.meta.cols >= 8 && f.docs.terrain.cells.length === f.meta.cols * f.meta.rows, 'a cut builds a map of ' + (f && f.meta.cols) + '×' + (f && f.meta.rows));
  ok(f && f.docs.cities.cities.length > 0 && f.docs.rivers.rivers.length > 0, 'with its communities (' + (f && f.docs.cities.cities.length) + ') and rivers (' + (f && f.docs.rivers.rivers.length) + ')');
  ok(f && /[^.]/.test(f.docs.terrain.cells), 'and its ground');
  const nLib0 = await T(async () => (await MME.store.list()).length).catch(() => -1);
  await p.click('#setCrop'); await p.mouse.move(400, 300); await p.mouse.down(); await p.mouse.move(700, 520, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(200);
  await p.click('[data-cr="make"]'); await p.waitForTimeout(1500);
  const nLib1 = await T(async () => (await MME.store.list()).length).catch(() => -1);
  ok(nLib0 >= 0 && nLib1 === nLib0 + 1, 'the new map is in the library (' + nLib0 + '→' + nLib1 + ')');

  // ---- pinned brushes ----
  await p.click('#modes button[data-mode="terrain"]'); await p.waitForTimeout(300);
  ok(await p.$eval('#pal', e => !!e.closest('.pinrow') && getComputedStyle(e.closest('.pinrow')).position === 'sticky'), 'the brushes stay pinned at the top of the options');

  await T(d => MME.shell.cur.rt.test.ecoSet(d), eco0);
  ok(!errs.length, 'no page errors ' + errs.join(' | '));
  await browser.close(); console.log(fails ? fails + ' failed' : 'all passed'); process.exit(fails ? 1 : 0);
})();
