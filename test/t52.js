// v0.19.0 batch 3: the tiers of government: dividing a state, picking a unit, annexing with Shift, the names of the tiers, and
// joining two states with the old one kept as a principality
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await (await browser.newContext({ viewport: { width: 1536, height: 900 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForSelector('.mapcard[data-id="gresland"]', { timeout: 60000 }); await p.click('.mapcard[data-id="gresland"] [data-act="open"]');
  await p.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable && MME.shell.cur.rt.state().econ, null, { timeout: 90000 });
  const T = (f, a) => p.evaluate(f, a), A = () => T(() => MME.shell.cur.rt.test.adm());
  const settle = async () => { for (let n = 0, last = -1; n < 40; n++) { await p.waitForTimeout(1200); const v = await T(() => { const e = MME.shell.cur.rt.test.econ(); return e ? e.ver : -1; }); if (v === last && v >= 0) return; last = v; } };
  await settle();
  const eco0 = await T(() => MME.shell.cur.rt.test.eco());
  // two states: west and east
  await T(() => { const t = MME.shell.cur.rt.test, d = t.eco(), g = t.grid(); let cells = ''; for (let i = 0; i < g.N; i++) cells += (i % g.COLS) < g.COLS / 2 ? 'A' : 'B'; d.states = [{ id: 'A', name: 'ตะวันตก', color: '#aa3333', sys: 'feud', rel: { B: 'rival' } }, { id: 'B', name: 'ตะวันออก', color: '#3355aa', sys: 'merc', rel: { A: 'rival' } }]; d.cells = cells; t.ecoSet(d); });
  await settle();
  await p.click('#modes button[data-mode="econ"]'); await p.click('#ecoTab button[data-t="adm"]'); await p.waitForTimeout(400);
  await p.evaluate(() => { const d = document.querySelector('[data-afold="A"]'); if (d) d.open = true; }); await p.click('[data-aa="build"][data-s="A"]');   /* v0.19.6: a state not yet divided is open already */ await p.waitForTimeout(500);
  await p.evaluate(() => { const d = document.querySelector('[data-afold="B"]'); if (d) d.open = true; }); await p.click('[data-aa="build"][data-s="B"]'); await settle();
  let a = await A(); const by = t => a.units.filter(u => u.t === t);
  ok(by(0).length > 10 && by(1).length >= 2, 'both states divided: ' + by(0).length + ' manors, ' + by(1).length + ' counties, ' + by(2).length + ' duchies');
  ok(by(0).every(u => u.hexes > 0), 'every manor has land');
  ok(by(0).filter(u => u.up).length === by(0).length, 'every manor sits in a county');
  ok(by(2).some(u => u.type === 'march'), 'a duchy on the rival border keeps the march');
  // pick a county and annex a county of the other duchy
  await p.click('#admLv button[data-lv="1"]'); await p.waitForTimeout(200);
  const pts = await T(() => { const t = MME.shell.cur.rt.test, out = []; for (let y = 250; y < 800; y += 40) for (let x = 200; x < 1100; x += 40) { const [mx, my] = t.toMapXY ? t.toMapXY(x, y) : [0, 0]; out.push([x, y]); } return out; });
  const at = async (x, y) => T(([x, y]) => { const r = document.querySelector('#map').getBoundingClientRect(), v = MME.shell.cur.rt.test; return v.admAtScreen ? null : null; }, [x, y]);
  // find two screen points in different counties of the same state
  const pick = await T(() => { const t = MME.shell.cur.rt.test, cv = document.querySelector('#map'), r = cv.getBoundingClientRect(), st = MME.shell.cur.rt.state();
    const seen = []; for (let y = 250; y < 820; y += 30) for (let x = 150; x < 1100; x += 30) { const m = t.screenToMap(x, y), ch = t.admAt(m[0], m[1]); if (ch && ch[1]) seen.push({ x, y, c: ch[1].id, d: ch[2] && ch[2].id, u: ch[1].up }); }
    for (const a of seen) for (const b of seen) if (a.c !== b.c && a.u !== b.u && a.u && b.u) return [a, b]; return null; });
  ok(!!pick, 'two counties under different duchies found on screen');
  if (pick) {
    await p.mouse.click(pick[0].x, pick[0].y); await p.waitForTimeout(200);
    a = await A(); ok(a.sel === pick[0].c, 'a click picks the county');
    await p.click('#admLv button[data-lv="2"]'); await p.mouse.click(pick[0].x, pick[0].y); await p.waitForTimeout(200); a = await A(); const duchy = a.sel;
    await p.keyboard.down('Shift'); await p.mouse.click(pick[1].x, pick[1].y); await p.keyboard.up('Shift'); await p.waitForTimeout(300);
    a = await A(); ok(a.units.find(u => u.id === pick[1].c).up === duchy, 'Shift and a click annexes the other county to the chosen duchy');
    await p.keyboard.press('Control+z'); await p.waitForTimeout(300); a = await A(); ok(a.units.find(u => u.id === pick[1].c).up === pick[1].u, 'undo gives it back');
  }
  // names
  await p.evaluate(() => { const d = [...document.querySelectorAll('#ecobody details')].find(x => x.textContent.includes('ชื่อของระดับ')); if (d) d.open = true; }); await p.click('[data-aa="namesTh"]'); await p.waitForTimeout(200); a = await A(); ok(a.names[2] === 'อาณาจักร' && a.names[1] === 'มณฑล' && a.names.princ === 'ประเทศราช', 'the Thai names of the tiers');   /* v0.20.0: county, duchy, kingdom */
  // join east into west, keeping it as a principality
  await p.evaluate(() => { document.querySelector('[data-afold="B"]').open = true; }); await p.waitForTimeout(200);
  await p.click('[data-aa="join"][data-s="B"]'); await settle();
  a = await A(); ok(a.states.length === 1 && a.states[0] === 'A', 'the two states are one');
  const pr = a.units.find(u => u.type === 'princ'); ok(pr && pr.name === 'ตะวันออก' && pr.st === 'A' && pr.hexes > 100, 'the old state stays as a principality under the new (' + (pr && pr.hexes) + ' hexes)');
  await p.screenshot({ path: '/tmp/b3-adm.png' });
  await p.keyboard.press('Control+z'); await p.waitForTimeout(500); a = await A(); ok(a.states.length === 2 || a.units.every(u => u.type !== 'princ'), 'undo takes the joining back (units)');
  await T(d => MME.shell.cur.rt.test.ecoSet(d), eco0);
  ok(!errs.length, 'no page errors ' + errs.join(' | '));
  await browser.close(); console.log(fails ? fails + ' failed' : 'all passed'); process.exit(fails ? 1 : 0);
})();
