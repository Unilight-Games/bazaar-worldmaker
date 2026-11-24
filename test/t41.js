// v0.16.1: features laid by rule from the ground of the map; islands strewn over open sea
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await (await browser.newContext({ viewport: { width: 1536, height: 900 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForSelector('.mapcard[data-id="gresland"]', { timeout: 60000 }); await p.click('.mapcard[data-id="gresland"] [data-act="open"]');
  await p.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable && MME.shell.cur.rt.state().econ, null, { timeout: 90000 });
  const settle = async () => { for (let n = 0, last = -1; n < 40; n++) { await p.waitForTimeout(1200); const v = await p.evaluate(() => { const e = MME.shell.cur.rt.test.econ(); return e ? e.ver : -1; }); if (v === last && v >= 0) return; last = v; } };
  await settle();
  ok(/0\.16\.[1-9]/.test(await p.evaluate(() => MME.VERSION)), 'version 0.16.1');
  await p.click('#modes button[data-mode="terrain"]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => [...document.querySelectorAll('#featPal .sw')].some(b => /หมู่เกาะกลางทะเล/.test(b.textContent))), 'islands strewn over open sea are a kind of feature');
  // a user's own feature first: the rule leaves it alone
  const mine = await p.evaluate(() => { const x = MME.shell.cur.rt.test, g = x.ground(); const i = g.indexOf('g'); const e = x.eco(); e.feat = { g: [i] }; x.ecoSet(e); return i; });
  await p.evaluate(() => { document.getElementById('featAutoAmt').value = '1'; document.getElementById('featAuto').click(); }); await settle();
  const e = await p.evaluate(() => MME.shell.cur.rt.test.eco());
  const n = Object.fromEntries(Object.entries(e.feat || {}).map(([k, v]) => [k, v.length])); const tot = Object.values(n).reduce((a, b) => a + b, 0);
  console.log('   laid', JSON.stringify(n), '|', await p.evaluate(() => document.getElementById('featAutoSay').textContent));
  ok(tot > 30 && Object.keys(n).length >= 8, `the button lays ${tot} features of ${Object.keys(n).length} kinds on Gresland`);
  ok(e.feat.g.includes(mine), 'the feature the owner laid stays where it was');
  // each lies where its rule says, read off the ground
  const chk = await p.evaluate(() => { const x = MME.shell.cur.rt.test, g = x.ground(), e = x.eco(), G = x.grid();
    const nb = i => { const c0 = i % G.COLS, r0 = (i - c0) / G.COLS, o = c0 & 1, at = (c, r) => c >= 0 && c < G.COLS && r >= 0 && r < G.ROWS ? r * G.COLS + c : -1; return [at(c0, r0 - 1), at(c0, r0 + 1), at(c0 - 1, o ? r0 : r0 - 1), at(c0 - 1, o ? r0 + 1 : r0), at(c0 + 1, o ? r0 : r0 - 1), at(c0 + 1, o ? r0 + 1 : r0)].filter(v => v >= 0); };
    const f = e.feat; return { oasis: (f.a || []).every(i => g[i] === 'd'), reef: (f.h || []).every(i => g[i] === 'S' && nb(i).some(v => !'SLi'.includes(g[v]))), delta: (f.o || []).every(i => !'SLi'.includes(g[i]) && nb(i).some(v => g[v] === 'S')), canyon: (f.j || []).every(i => 'dcys'.includes(g[i])), sea: ['h', 'k', 'l', 'm', 's'].every(k => (f[k] || []).every(i => g[i] === 'S')) }; });
  ok(chk.oasis && chk.canyon, 'oases lie in the desert and canyons in dry country');
  ok(chk.reef && chk.delta, 'reefs lie in the sea by a shore, deltas on a shore');
  ok(chk.sea, 'reefs, atolls, lagoons, volcanic islands and open-sea islands lie only on the sea');
  // spacing: no two oases close together
  const sp = await p.evaluate(() => { const x = MME.shell.cur.rt.test, e = x.eco(), a = e.feat.a || []; let min = 1e9; for (const i of a) for (const j of a) if (i < j) { const [x1, y1] = x.hexXY(i), [x2, y2] = x.hexXY(j); min = Math.min(min, Math.hypot(x1 - x2, y1 - y2)); } return [a.length, min]; });
  ok(sp[0] < 2 || sp[1] > 20, `oases stand apart (${sp[0]} of them)`);
  // one step of undo, and pressing again adds only where nothing is
  await p.click('#undo'); await settle();
  ok(await p.evaluate(m => { const f = MME.shell.cur.rt.test.eco().feat || {}; return Object.values(f).flat().length === 1 && f.g[0] === m; }, mine), 'one undo takes all the laid features off and leaves the owner\'s');
  await p.click('#redo'); await settle();
  const tot2 = await p.evaluate(() => Object.values(MME.shell.cur.rt.test.eco().feat || {}).flat().length);
  ok(tot2 === tot, 'redo lays them again');
  ok(errs.length === 0, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await browser.close(); console.log(fails ? fails + ' FAILED' : 'ALL OK'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('FAILED', e.message.slice(0, 600)); process.exit(1); });
