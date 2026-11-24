// v0.16.2: workshops of the owner's own: a factory product with its own recipe, priced, wanted, made, traded, counted
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await (await browser.newContext({ viewport: { width: 1536, height: 900 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForSelector('.mapcard[data-id="gresland"]', { timeout: 60000 }); await p.click('.mapcard[data-id="gresland"] [data-act="open"]');
  await p.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable && MME.shell.cur.rt.state().econ, null, { timeout: 90000 });
  const settle = async () => { for (let n = 0, last = -1; n < 40; n++) { await p.waitForTimeout(1200); const v = await p.evaluate(() => { const e = MME.shell.cur.rt.test.econ(); return e ? e.ver : -1; }); if (v === last && v >= 0) return; last = v; } };
  await settle();
  ok(/0\.1[6-9]\.\d/.test(await p.evaluate(() => MME.VERSION)), 'version 0.16.2');
  // the button on the tab of classes
  await p.click('.setpick [data-eco="cats"]'); await p.waitForTimeout(600);
  ok(await p.evaluate(() => !!document.querySelector('#ecobody [data-a="unewm"]')), 'the tab of classes has a button to add a factory product and its recipe');
  await p.click('#ecobody [data-a="unewm"]'); await settle();
  const u = await p.evaluate(() => MME.shell.cur.rt.test.eco().ucats.find(u => u.made));
  ok(!!u && u.made === 1 && u.in && u.in.timber > 0, 'a new factory product comes with a recipe of its own');
  ok(await p.evaluate(id => !!document.querySelector(`#ecobody [data-w="${id}"]`), u.id), 'its recipe stands among the workshops\' recipes');
  // a recipe of the owner's: glass from stone and fuel
  await p.evaluate(id => { const x = MME.shell.cur.rt.test, e = x.eco(); const v = e.ucats.find(z => z.id === id); Object.assign(v, { name: 'แก้ว', v: 4, need: 0.1, base: 0.15, in: { stone: 0.6, fuel: 0.4 } }); x.ecoSet(e); }, u.id); await settle();
  const w = await p.evaluate(id => { const x = MME.shell.cur.rt.test, B = x.worldBook(); return { book: B[id], stone: B.stone, flows: x.flowsOf().filter(f => f.cat === id).length, name: (() => { const c = x.cities().find(c => x.cityBook(c.id).goods && Object.keys(x.cityBook(c.id).goods).some(g => g.startsWith(id))); return c ? Object.keys(x.cityBook(c.id).goods).find(g => g.startsWith(id)) : null; })() }; }, u.id);
  console.log('   glass', JSON.stringify(w));
  ok(w.book && w.book[0] > 0.5 && w.book[1] > 0, `the workshops make it and the cities want it (made ${w.book && w.book[0]}, wanted ${w.book && w.book[1]})`);
  ok(w.flows > 0, `it is traded between cities (${w.flows} flows)`);
  // the recipe binds: with no stone and no fuel to be had, little is made
  const lean = await p.evaluate(async id => { const x = MME.shell.cur.rt.test, e = x.eco(); e.ucats.find(z => z.id === id).in = { rare: 5 }; x.ecoSet(e); await new Promise(r => setTimeout(r, 6000)); return x.worldBook()[id]; }, u.id); await settle();
  ok(lean && lean[0] < w.book[0] * 0.6, `a recipe of a scarce input makes less (${w.book[0]} → ${lean && lean[0]})`);
  // counted among the basics when the owner says so
  const b0 = await p.evaluate(() => { const g = MME.shell.cur.rt.test.gdp(); return g.reduce((a, r) => a + r.metB, 0) / g.length; });
  await p.evaluate(id => { const x = MME.shell.cur.rt.test, e = x.eco(); const v = e.ucats.find(z => z.id === id); v.basic = 1; v.need = 1; x.ecoSet(e); }, u.id); await settle();
  const b1 = await p.evaluate(() => { const g = MME.shell.cur.rt.test.gdp(); return g.reduce((a, r) => a + r.metB, 0) / g.length; });
  ok(b1 < b0, `counted among the basics, its shortage weighs on the basics met (${b0.toFixed(3)} → ${b1.toFixed(3)})`);
  // the editing of the recipe in the card
  await p.evaluate(() => { const x = MME.shell.cur.rt.test; x.ecoSet(x.eco()); }); await p.click('.setpick [data-eco="cats"]'); await p.waitForTimeout(600);
  await p.selectOption(`#ecobody [data-w="${u.id}"] select[data-f="wadd"]`, 'ore'); await settle();
  ok(await p.evaluate(id => { const v = MME.shell.cur.rt.test.eco().ucats.find(z => z.id === id); return v.in && v.in.ore > 0; }, u.id), 'adding an input in the recipe card keeps it with the product');
  // kept, and deleted cleanly
  await p.evaluate(id => { const x = MME.shell.cur.rt.test, e = x.eco(); e.ucats = e.ucats.filter(z => z.id !== id); x.ecoSet(e); }, u.id); await settle();
  ok(await p.evaluate(id => !MME.shell.cur.rt.test.worldBook()[id] && !document.querySelector(`#ecobody [data-w="${id}"]`), u.id), 'deleting the product takes its workshop away');
  ok(errs.length === 0, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await browser.close(); console.log(fails ? fails + ' FAILED' : 'ALL OK'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('FAILED', e.message.slice(0, 600)); process.exit(1); });
