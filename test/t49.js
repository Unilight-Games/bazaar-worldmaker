// v0.18.5: community kinds and traits, taxes, the season button, small and big rivers, rivers that join and replace, road ends
// that snap onto another road, the points-of-interest launcher, and Ctrl+Z on any keyboard layout
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await (await browser.newContext({ viewport: { width: 1536, height: 900 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForSelector('.mapcard[data-id="gresland"]', { timeout: 60000 }); await p.click('.mapcard[data-id="gresland"] [data-act="open"]');
  await p.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable && MME.shell.cur.rt.state().econ, null, { timeout: 90000 });
  const T = (f, a) => p.evaluate(f, a);
  const settle = async () => { for (let n = 0, last = -1; n < 40; n++) { await p.waitForTimeout(1200); const v = await T(() => { const e = MME.shell.cur.rt.test.econ(); return e ? e.ver : -1; }); if (v === last && v >= 0) return; last = v; } };
  await settle();
  const thaiZ = (shift) => T(sh => { document.querySelector('canvas').dispatchEvent(new KeyboardEvent('keydown', { key: sh ? 'ฦ' : 'ผ', code: 'KeyZ', ctrlKey: true, shiftKey: !!sh, bubbles: true, cancelable: true })); }, shift);

  // ---- rivers: one drawn over another replaces that stretch; an end near the end of one of the same kind joins it ----
  const R = await T(() => MME.shell.cur.rt.test.R());
  const city = await T(() => { const t = MME.shell.cur.rt.test; return t.cities().map(c => ({ id: c.id, xy: t.cityAt(c.id) })).find(c => c.xy); });
  const [cx, cy] = [city.xy[0] + 3 * R, city.xy[1] + 6 * R];
  const line = (x0, y0, x1, y1, n) => Array.from({ length: n + 1 }, (_, i) => [x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n]);
  const n0 = (await T(() => MME.shell.cur.rt.test.rivers())).length;
  await T(a => MME.shell.cur.rt.test.riverDraw(a, 'river'), line(cx, cy, cx + 20 * R, cy, 40));
  const A = (await T(() => MME.shell.cur.rt.test.rivers())).slice(-1)[0];
  ok((await T(() => MME.shell.cur.rt.test.rivers())).length === n0 + 1, 'a first river is drawn');
  // the second runs along the right half of the first, then turns away
  const B0 = line(cx + 10 * R, cy, cx + 20 * R, cy, 20).concat(line(cx + 20 * R, cy, cx + 24 * R, cy + 8 * R, 10).slice(1));
  await T(a => MME.shell.cur.rt.test.riverDraw(a, 'river'), B0);
  const after = await T(() => MME.shell.cur.rt.test.rivers());
  const oldA = after.find(r => r.id === A.id);
  ok(!oldA, 'the older river is taken off where the new one runs over it');
  const left = after.filter(r => r.pts.some(q => q[0] < cx + 8 * R && Math.abs(q[1] - cy) < 1));
  ok(left.length === 1, 'what is left of the older river stays');
  const coveredByOld = after.filter(r => r.pts.length && !r.pts.some(q => q[1] > cy + 2) && r.pts.some(q => q[0] > cx + 13 * R && q[0] < cx + 18 * R));
  ok(coveredByOld.length === 0, 'no older line is left lying under the new one');
  ok(after.length === n0 + 2, 'the leftover piece and the new river are two lines (' + (after.length - n0) + ')');
  await thaiZ(false); await p.waitForTimeout(300);
  const undone = await T(() => MME.shell.cur.rt.test.rivers());
  ok(undone.some(r => r.id === A.id) && undone.length === n0 + 1, 'Ctrl+Z on a Thai keyboard brings the first river back whole, as one step');
  await thaiZ(true); await p.waitForTimeout(300);
  ok((await T(() => MME.shell.cur.rt.test.rivers())).length === n0 + 2, 'Ctrl+Shift+Z on a Thai keyboard does it again');
  // a river started at the end of another of the same kind becomes one line with it
  const Bnew = (await T(() => MME.shell.cur.rt.test.rivers())).find(r => r.pts.some(q => q[1] > cy + 6 * R));
  const e = Bnew.pts[Bnew.pts.length - 1];
  const vs = await T(() => MME.shell.cur.rt.test.vs());
  await T(a => MME.shell.cur.rt.test.riverDraw(a, 'river'), line(e[0] + 0.5, e[1] + 0.5, e[0] + 6 * R, e[1] + 6 * R, 12));
  const merged = await T(() => MME.shell.cur.rt.test.rivers());
  const one = merged.find(r => r.pts.some(q => q[0] > e[0] + 5 * R));
  ok(merged.length === n0 + 2 && one && Math.hypot(one.pts[0][0] - Bnew.pts[0][0], one.pts[0][1] - Bnew.pts[0][1]) < 0.6, 'joined end to end into one river (scale ' + vs.toFixed(2) + ')');
  await thaiZ(false); await thaiZ(false); await thaiZ(false); await p.waitForTimeout(300);
  ok((await T(() => MME.shell.cur.rt.test.rivers())).length === n0, 'three undos take every test river away');

  // ---- road ends snap onto another road ----
  const snap = await T(() => { const t = MME.shell.cur.rt.test, r = t.routes().find(x => x.ok && x.mid); if (!r) return null; const [x, y] = r.mid; return { id: r.id, at: t.endAt(x + 0.4, y + 0.3, null), own: t.endAt(x + 0.4, y + 0.3, r.id), x, y }; });
  ok(snap && Array.isArray(snap.at) && Math.hypot(snap.at[0] - snap.x - 0.4, snap.at[1] - snap.y - 0.3) > 0.01, 'an end dropped next to a road goes onto the road');
  ok(snap && Array.isArray(snap.own) && Math.abs(snap.own[0] - snap.x - 0.4) < 0.06, 'but never onto the road being moved itself');

  // ---- the season button ----
  const s0 = await T(() => MME.shell.cur.rt.test.seas());
  await p.click('#seasonBtn'); await p.waitForTimeout(500);
  const s1 = await T(() => MME.shell.cur.rt.test.seas());
  const lbl = await p.textContent('#seasonBtn');
  ok(s1.on !== s0.on || (await T(() => MME.shell.cur.rt.state().mode)) === 'climate', 'the season button moves the season, or opens the climate tools on a map with none (' + lbl + ')');
  if (s1.on !== s0.on) { let any = s1.any; for (let i = 0; i < 6 && !any; i++) { await p.click('#seasonBtn'); await p.waitForTimeout(300); any = (await T(() => MME.shell.cur.rt.test.seas())).any; } ok(any, 'some season dries a seasonal river'); }
  for (let i = 0; i < 8; i++) { if (!(await T(() => MME.shell.cur.rt.test.seas())).on) break; await p.click('#seasonBtn'); await p.waitForTimeout(200); }
  ok(!(await T(() => MME.shell.cur.rt.test.seas())).on, 'round the seasons and back to the whole year');
  const nav = await T(() => MME.shell.cur.rt.test.nav());
  ok(nav && nav.small > 0 && nav.big > 0, 'small rivers and big rivers both on the map ' + JSON.stringify(nav));

  // (v0.19.0: points of interest are no longer placed; they became features, see t50)

  // ---- community kinds and traits ----
  const c0 = await T(() => { const t = MME.shell.cur.rt.test; return t.gdp ? t.cities().filter(c => c.kind === 'city')[0] : null; });
  const fx0 = await T(id => MME.shell.cur.rt.test.comFx(id), c0.id);
  const eco0 = await T(() => MME.shell.cur.rt.test.eco());
  const ppl = async id => (await T(() => MME.shell.cur.rt.test.tax())).rows.find(r => r.id === id);
  const before = await ppl(c0.id);
  await T(([d, id]) => { d.tr = { ...(d.tr || {}), [id]: ['slum', 'fort'] }; MME.shell.cur.rt.test.ecoSet(d); }, [JSON.parse(JSON.stringify(eco0)), c0.id]); await settle();
  const fx1 = await T(id => MME.shell.cur.rt.test.comFx(id), c0.id), after1 = await ppl(c0.id);
  ok(Math.abs(fx1.pop / fx0.pop - 1.25) < 1e-6 && fx1.arms > fx0.arms && fx1.well === fx0.well - 6 + 2, 'a crowded quarter and a fort change size, arms and well-being ' + JSON.stringify({ pop: fx1.pop, arms: fx1.arms, well: fx1.well }));
  ok(after1.people > before.people * 1.05, 'the year counts the bigger crowd ' + Math.round(before.people) + '→' + Math.round(after1.people));
  const kinds = await T(() => [...document.querySelectorAll('#cfKind option')].map(o => o.value));
  ok(['hamlet', 'monastery', 'camp', 'waystation'].every(k => kinds.includes(k)), 'the four new kinds of community can be chosen');

  // (v0.19.0: the single tax became the public purse, see t53)
  ok(!errs.length, 'no page errors ' + errs.join(' | '));
  await browser.close(); console.log(fails ? fails + ' failed' : 'all passed'); process.exit(fails ? 1 : 0);
})();
