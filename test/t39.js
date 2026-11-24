// v0.15.2: rivers rise somewhere: from mountains, snow and ice, lakes, or a spring in wet ground; every lake that spills sends a river out
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await (await browser.newContext({ viewport: { width: 1536, height: 900 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForSelector('.mapcard[data-id="gresland"]', { timeout: 60000 });
  const stat = (src) => p.evaluate(src => {
    const G = MME.gridFor(159, 104), L = MME.lattice(G), N = L.N;
    const near = (x, y) => { let b = -1, bd = 1e9; for (let i = 0; i < N; i++) { const d = (L.CX[i] - x) ** 2 + (L.CY[i] - y) ** 2; if (d < bd) { bd = d; b = i; } } return b; };
    const out = { heads: 0, sourced: 0, lakes: 0, spilling: 0 };
    const one = (cells, rivers, spring) => {
      const touch = (i, f) => { if (f(cells[i])) return true; for (let k = 0; k < 6; k++) { const v = L.NB[i * 6 + k]; if (v >= 0 && f(cells[v])) return true; } return false; };
      const mid = new Set(); for (const r of rivers) for (const q of r.pts.slice(1)) mid.add(near(q[0], q[1]));
      for (const r of rivers) { const h = near(r.pts[0][0], r.pts[0][1]); if (mid.has(h)) continue; out.heads++; if (touch(h, b => b === 'M' || b === 'n' || b === 'L') || (spring && 'mw'.includes(cells[h]))) out.sourced++; }
      const on = new Set(); for (const r of rivers) for (const q of r.pts) on.add(near(q[0], q[1]));
      for (let j = 0; j < N; j++) if (cells[j] === 'L') { out.lakes++; let t = on.has(j); for (let k = 0; k < 6; k++) if (on.has(L.NB[j * 6 + k])) t = true; if (t) out.spilling++; }
    };
    if (src === 'gen') for (const seed of [11, 12, 13]) { const g = MME.generate(G, { seed, style: 'continent', land: 0.4, relief: 0.5, climate: 'mixed', rivers: 1 }); one(g.cells, g.rivers, true); }
    else { const cells = src; const r = MME.autoRivers(G, cells, { seed: 5, density: 1 }); one(cells, r.rivers, false); }
    return out;
  }, src);
  const g = await stat('gen');
  ok(g.heads > 30 && g.sourced / g.heads >= 0.7, `a new map: ${g.sourced} of ${g.heads} rivers rise from a mountain, snow and ice, a lake or a spring`);
  ok(g.lakes > 0 && g.spilling / g.lakes >= 0.9, `a new map has lakes, and a river at ${g.spilling} of ${g.lakes} lake hexes`);
  await p.click('.mapcard[data-id="gresland"] [data-act="open"]'); await p.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().econ, null, { timeout: 90000 });
  const ground = await p.evaluate(() => MME.shell.cur.rt.test.ground());
  const a = await stat(ground);
  ok(a.heads > 30 && a.sourced / a.heads >= 0.6, `auto rivers on Gresland's ground: ${a.sourced} of ${a.heads} rise from a mountain, snow and ice or a lake`);
  ok(errs.length === 0, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await browser.close(); console.log(fails ? fails + ' FAILED' : 'ALL OK'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('FAILED', e.message.slice(0, 600)); process.exit(1); });
