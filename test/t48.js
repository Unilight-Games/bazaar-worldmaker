// v0.18.4: roads, railways and trade lines are bent straight from a press on them, and the ends of a road or railway move to
// another city or spot
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await (await browser.newContext({ viewport: { width: 1536, height: 900 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForSelector('.mapcard[data-id="gresland"]', { timeout: 60000 }); await p.click('.mapcard[data-id="gresland"] [data-act="open"]');
  await p.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable && MME.shell.cur.rt.state().econ, null, { timeout: 90000 });
  const settle = async () => { for (let n = 0, last = -1; n < 40; n++) { await p.waitForTimeout(1200); const v = await p.evaluate(() => { const e = MME.shell.cur.rt.test.econ(); return e ? e.ver : -1; }); if (v === last && v >= 0) return; last = v; } };
  await settle();
  const T = (f, a) => p.evaluate(f, a);
  const drag = async (x0, y0, x1, y1) => { await p.mouse.move(x0, y0); await p.mouse.down(); for (let i = 1; i <= 8; i++) await p.mouse.move(x0 + (x1 - x0) * i / 8, y0 + (y1 - y0) * i / 8); await p.waitForTimeout(150); await p.mouse.up(); await p.waitForTimeout(400); };
  await p.click('#modes button[data-mode="route"]'); await p.waitForTimeout(400);
  // a road well inside the screen, its middle away from any city
  const pick = await T(() => { const t = MME.shell.cur.rt.test, cs = t.cities(); const rs = t.routes().filter(r => r.ok && r.mid && typeof r.a === 'string' && typeof r.b === 'string' && r.len >= 6);
    for (const r of rs) { const [x, y] = t.mapXY(r.mid[0], r.mid[1]); if (x < 420 || x > 1300 || y < 140 || y > 780) continue; const near = cs.some(c => { const q = t.cityXY(c.id); return q && Math.hypot(q[0] - x, q[1] - y) < 40; }); if (!near) return { id: r.id, x, y, via: r.via.length, a: r.a, b: r.b }; } return null; });
  ok(!!pick, 'a road to work on ' + (pick && pick.id));
  ok(await T(() => MME.shell.cur.rt.test.rsel()) === null, 'no road is chosen to begin with');
  await drag(pick.x, pick.y, pick.x + 18, pick.y + 26);
  const r1 = await T(id => MME.shell.cur.rt.test.routes().find(r => r.id === id), pick.id);
  ok(r1.via.length === pick.via + 1 && r1.ok, 'a press and a drag on a road nobody chose bends it at once');
  ok(await T(() => MME.shell.cur.rt.test.rsel()) === pick.id, 'and the road becomes the chosen one');
  await p.keyboard.press('Control+z'); await p.waitForTimeout(400);
  ok((await T(id => MME.shell.cur.rt.test.routes().find(r => r.id === id), pick.id)).via.length === pick.via, 'one undo takes the bend back');
  await p.keyboard.press('Control+Shift+z'); await p.waitForTimeout(400);
  // the end of the chosen road moves to another city
  { let last = ''; for (let n = 0; n < 20; n++) { const v = await p.evaluate(() => MME.shell.cur.rt.test.mapXY(0, 0).map(Math.round).join(',')); if (v === last) break; last = v; await p.waitForTimeout(300); } }   /* v0.19.4: the map may still be gliding */
  const tgt = await T(pk => { const t = MME.shell.cur.rt.test, B = t.cityXY(pk.b), A = t.cityXY(pk.a); let best = null, bd = 1e9;
    for (const c of t.cities()) { if (c.id === pk.a || c.id === pk.b) continue; const q = t.cityXY(c.id); if (!q || q[0] < 300 || q[0] > 1400 || q[1] < 120 || q[1] > 800) continue; { const el = document.elementFromPoint(q[0], q[1]); if (!el || el.tagName !== 'CANVAS' || el.classList.contains('minimap')) continue; }   /* v0.19.4: not under a panel */ const d = Math.hypot(q[0] - B[0], q[1] - B[1]); if (d > 60 && d < bd) { bd = d; best = { id: c.id, x: q[0], y: q[1] }; } }
    return best && { ...best, bx: B[0], by: B[1], ax: A[0], ay: A[1] }; }, pick);
  ok(!!tgt, 'another city to move the end to ' + (tgt && tgt.id));
  ok(await T(() => !!MME.shell.cur.rt.test.rsel()), 'the road is still chosen, so its ends show');
  await drag(tgt.bx, tgt.by, tgt.x, tgt.y);
  const r2 = await T(id => MME.shell.cur.rt.test.routes().find(r => r.id === id), pick.id);
  ok(r2.b === tgt.id && r2.a === pick.a && r2.ok, 'dragging the end of the chosen road moves that end to another city');
  await drag(tgt.x, tgt.y, tgt.ax, tgt.ay);
  ok((await T(id => MME.shell.cur.rt.test.routes().find(r => r.id === id), pick.id)).b === tgt.id, 'both ends on the same city is refused');
  // a click on an end, not a drag, does what a click on a city always did: lets the road go and starts a new one there
  await p.mouse.click(tgt.x, tgt.y); await p.waitForTimeout(300);
  ok(await T(() => MME.shell.cur.rt.test.rsel()) === null, 'a click on the end, without a drag, lets the road go as before');
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  // a railway bends the same way
  const m2 = await T(id => { const t = MME.shell.cur.rt.test, r = t.routes().find(x => x.id === id); return t.mapXY(r.mid[0], r.mid[1]); }, pick.id);
  await p.mouse.click(m2[0], m2[1]); await p.waitForTimeout(300);
  const chosen = await T(() => MME.shell.cur.rt.test.rsel());
  if (chosen) { await p.click('#rfCls button[data-k="rail"]'); await p.waitForTimeout(300); }
  const rail = await T(id => MME.shell.cur.rt.test.routes().find(r => r.id === id), chosen);
  ok(rail && rail.cls === 'rail', 'the road is made a railway');
  await p.mouse.click(60, 860); await p.waitForTimeout(200); await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  const rp = await T(id => { const t = MME.shell.cur.rt.test, r = t.routes().find(x => x.id === id); return r && r.mid ? { xy: t.mapXY(r.mid[0], r.mid[1]), via: r.via.length } : null; }, chosen);
  await drag(rp.xy[0], rp.xy[1], rp.xy[0] - 20, rp.xy[1] + 22);
  ok((await T(id => MME.shell.cur.rt.test.routes().find(r => r.id === id), chosen)).via.length === rp.via + 1, 'a railway is bent straight from a drag too');
  // trade lines
  await p.click('#modes button[data-mode="trade"]'); await p.waitForTimeout(800);
  const tl = await T(() => { const t = MME.shell.cur.rt.test, cs = t.cities(), n = t.econ().links;
    for (let k = 0; k < n; k++) { const v = t.linkAt(k); if (!v) continue; const [x, y, id] = v; if (x < 420 || x > 1300 || y < 140 || y > 780) continue; if (cs.some(c => { const q = t.cityXY(c.id); return q && Math.hypot(q[0] - x, q[1] - y) < 40; })) continue; return { x, y, id }; } return null; });
  ok(!!tl, 'a trade line to work on');
  ok(await T(() => MME.shell.cur.rt.test.tlsel()) === null, 'no trade line is chosen to begin with');
  await drag(tl.x, tl.y, tl.x + 22, tl.y - 24); await p.waitForTimeout(600);
  const tsel = await T(() => MME.shell.cur.rt.test.tlsel());
  const tv = tsel ? await T(id => MME.shell.cur.rt.test.linkVia(id), tsel) : null;
  ok(!!tsel && tv && tv.length === 1, 'a press and a drag on a trade line nobody chose bends it at once, and chooses it');
  await p.keyboard.press('Control+z'); await p.waitForTimeout(800);
  ok(((await T(id => MME.shell.cur.rt.test.linkVia(id), tsel)) || []).length === 0, 'one undo takes the trade bend back');
  ok(errs.length === 0, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await browser.close(); console.log(fails ? fails + ' FAILED' : 'ALL OK'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('FAILED', e.message.slice(0, 600)); process.exit(1); });
