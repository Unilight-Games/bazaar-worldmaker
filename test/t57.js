// v0.19.2: boats and ships start and stop at a community; the party that walks and buys passage changes conveyance at ports and
// stations; the new conveyances go at their own pace
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await (await browser.newContext({ viewport: { width: 1536, height: 900 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForSelector('.mapcard[data-id="gresland"]', { timeout: 60000 });
  await p.click('#gContinue'); await p.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().econ, null, { timeout: 90000 }); await p.waitForTimeout(3000);
  const r = await p.evaluate(() => { const T = MME.shell.cur.rt.test, C = T.cityHexes(), ports = C.filter(c => c.wet), riv = C.filter(c => c.river);
    const a = ports[0], b = ports[ports.length - 1], o = {}; for (const v of ['foot', 'horse', 'pack', 'army', 'courier', 'ship', 'mixed', 'fly']) o[v] = T.tripT(v, a.h, b.h).d;
    let boat = 0; for (const x of riv.slice(0, 10)) for (const y of riv) if (x !== y && T.tripT('boat', x.h, y.h).d > 0) { boat++; break; }
    const far = [C[0], C[C.length - 1]], inland = T.tripT('ship', far[0].h, far[1].h).d, mixedInland = T.tripT('mixed', far[0].h, far[1].h).d;
    return { o, boat, inland, mixedInland, footFar: T.tripT('foot', far[0].h, far[1].h).d }; });
  ok(r.o.ship > 0, 'a sea ship sails from one port community to another (' + r.o.ship.toFixed(1) + ' days)');
  ok(r.boat > 0, 'a river boat sets out from a community on a river');
  ok(r.o.mixed > 0 && r.o.mixed < r.o.foot && r.o.mixed >= r.o.ship, 'walking and passage by ship beats walking, and waits at the changes (' + r.o.mixed.toFixed(1) + ')');
  ok(r.mixedInland > 0 && r.mixedInland <= r.footFar + 0.01, 'the mixed way reaches inland communities no slower than on foot');
  ok(r.o.courier < r.o.horse && r.o.horse < r.o.foot && r.o.foot < r.o.army, 'courier, horse, foot and army in order of pace');
  ok(r.o.fly > 0 && r.o.fly < r.o.courier, 'flying goes over everything');
  await p.click('#tripBtn'); await p.waitForTimeout(300);
  const names = await p.$$eval('.tripbox select[data-tp="veh"] option', o => o.map(x => x.textContent));
  ok(names.includes('เดินเท้าต่อเรือโดยสารและรถไฟ') && names.includes('กองทัพเดินทัพ') && names.length === 12, 'the planner offers twelve conveyances');
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' '));
  console.log(fails ? fails + ' failed' : 'all passed'); await browser.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('TEST FAILED', e.message.slice(0, 400)); process.exit(1); });
