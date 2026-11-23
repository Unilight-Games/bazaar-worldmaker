// v0.10.0: the level of people a map holds, and the land its cities use up.
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1536, height: 760 } });
  const errs = []; let bad = 0;
  const ok = (name, v, extra) => { if (!v) bad++; console.log((v ? 'ok   ' : 'FAIL ') + name + (extra != null ? ' | ' + extra : '')); };
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/fonts\.g|Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
  await p.goto('http://localhost:8765/index.html'); await p.waitForSelector('.mapcard[data-id="gresland"]', { timeout: 60000 }); await p.click('.mapcard[data-id="gresland"] [data-act="open"]');
  await p.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable && MME.shell.cur.rt.state().econ, null, { timeout: 90000 });
  const settle = async () => { for (let n = 0, last = -1; n < 40; n++) { await p.waitForTimeout(2200); const v = await p.evaluate(() => { const e = MME.shell.cur.rt.test.econ(); return e ? e.ver : -1; }); if (v === last && v >= 0) return; last = v; } };
  const read = () => p.evaluate(() => { const x = MME.shell.cur.rt.test, L = x.land(), e = x.eco(), g = x.gdp(), ec = x.econ(), ppl = g.reduce((a, r) => a + r.people, 0); return { total: L.total, unit: e.unit, tier: e.tier, crop: L.crop, tot: L.tot, short: L.short, ppl, pc: g.reduce((a, r) => a + r.inc, 0) / ppl, vol: ec.vol, flows: ec.flows, rows: L.rows }; });
  await p.evaluate(() => { const x = MME.shell.cur.rt.test, e = x.eco(); e.noSlave = 1; x.ecoSet(e); }); await settle();   // slaves thin out as cities grow (t32): kept out of this comparison
  const base = await read();
  await p.click('#modes button[data-mode="econ"]'); await p.click('#ecoTab button[data-t="gdp"]'); await p.waitForSelector('#ecobody select[data-f="tier"]');
  ok('the GDP tab offers the five levels, a number of one\'s own, and none', await p.evaluate(() => [...document.querySelectorAll('#ecobody select[data-f="tier"] option')].map(o => o.value).join() === ',xs,l,m,h,xl,own'));
  const pick = async v => { await p.selectOption('#ecobody select[data-f="tier"]', v); await settle(); return read(); };
  const xs = await pick('xs'), m = await pick('m'), h = await pick('h'), xl = await pick('xl');
  const near = (a, b) => Math.abs(a - b) / b < 0.01;
  ok('each level sets how many people the whole map holds', near(xs.ppl, 3e4) && near(m.ppl, 3e6) && near(h.ppl, 2e9) && near(xl.ppl, 2e10), [xs, m, h, xl].map(r => Math.round(r.ppl)).join(' '));
  ok('the year\'s trade and a person\'s income are the same at every level', [xs, m, h, xl].every(r => r.flows === base.flows && Math.abs(r.vol - base.vol) < 1e-6 && Math.abs(r.pc - base.pc) < 0.5), `${base.flows} flows, ${base.pc.toFixed(1)} a head`);
  const sum = r => r.tot.farm + r.tot.cleared + r.tot.logged + r.tot.mine;
  ok('few people leave the land as it is; billions plough it, clear forest and mine the mountains', sum(xs) === 0 && sum(m) < 30 && h.tot.farm > 500 && h.tot.cleared > 100 && h.tot.mine > 10, `m ${sum(m)} h ${JSON.stringify(h.tot)}`);
  ok('a larger city takes more land than a smaller one', (() => { const r = [...h.rows].sort((a, b) => b.people - a.people); return r[0].need > r[r.length - 1].need * 3; })());
  ok('ploughland a person falls as the world fills, and the shortfall is counted', xs.crop === 0.45 && h.crop === 0.3 && xl.crop === 0.15 && xl.short > h.short && h.short > 0, `short ${h.short} -> ${xl.short}`);
  const txt = await p.textContent('#ecobody');
  ok('the tab says how many people, how dense, and what the land says', /ทั้งแผนที่มี/.test(txt) && /คนต่อตารางกิโลเมตร/.test(txt) && /ไร่บนป่าที่ถาง/.test(txt) && /เหมืองในภูเขา/.test(txt) && /ที่ดินรอบเมืองไม่พอ/.test(txt));
  ok('the layer has a switch among the view\'s chips, and it is remembered', await p.evaluate(() => { const b = document.getElementById('landBtn'); const was = b.getAttribute('aria-pressed'); b.click(); const off = b.getAttribute('aria-pressed') === 'false' && localStorage.getItem('mme-land') === '0'; b.click(); return was === 'true' && off && b.getAttribute('aria-pressed') === 'true'; }));
  await p.selectOption('#ecobody select[data-f="tier"]', 'own'); await p.waitForSelector('#ecobody input[data-f="total"]'); await p.fill('#ecobody input[data-f="total"]', '250000000'); await p.dispatchEvent('#ecobody input[data-f="total"]', 'change'); await settle();
  const own = await read(); ok('a number of one\'s own works the same way', near(own.ppl, 2.5e8) && own.tier === 'own');
  const kept = await p.evaluate(() => { const x = MME.shell.cur.rt.test, e = x.eco(); x.ecoSet(JSON.parse(JSON.stringify(e))); const f = x.eco(); return [f.tier, f.total]; });
  ok('the document keeps the level', kept.join() === 'own,250000000');
  await p.fill('#ecobody input[data-f="unit"]', '2000'); await p.dispatchEvent('#ecobody input[data-f="unit"]', 'change'); await settle();
  const hand = await read(); ok('setting the people of a head by hand lets the level go', hand.tier === '' && hand.unit === 2000);
  console.log('errors', errs.length + bad, errs.slice(0, 4).join(' | '));
  await browser.close();
})().catch(e => { console.error('TEST FAILED', e.message.slice(0, 900)); process.exit(1); });
