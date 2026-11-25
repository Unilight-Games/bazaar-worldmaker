// v0.19.7: a community's specialty: its goods come out twice over where the ground allows the trade, the rest at seven in ten,
// a mining village opens a mine whatever its size, and a trade the ground does not allow changes nothing
const { chromium } = require('playwright');
let bad = 0; const ok = (m, c, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m, x === undefined ? '' : x); if (!c) bad++; };
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await (await browser.newContext({ viewport: { width: 1536, height: 900 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForSelector('.mapcard[data-id="gresland"]', { timeout: 60000 }); await p.click('.mapcard[data-id="gresland"] [data-act="open"]');
  await p.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable && MME.shell.cur.rt.state().econ, null, { timeout: 90000 }); await p.waitForTimeout(3000);
  const pick = await p.evaluate(() => { const t = MME.shell.cur.rt.test; for (const c of t.cities()) { if (c.kind !== 'village') continue; const f = t.specFitList(c.id); const pr = t.prodOf(c.id); if (f.includes('iron') && pr && pr.prod.iron > 0) return { id: c.id, name: c.name, fit: f, before: pr }; } return null; });
  console.log('pick', pick && pick.name, pick && pick.fit.join(','), pick && JSON.stringify(pick.before).slice(0, 300));
  await p.evaluate(id => MME.shell.cur.rt.test.pickCity(id), pick.id); await p.waitForTimeout(500);
  console.log('form', (await p.textContent('#cfSpec')).slice(0, 200));
  await p.selectOption('#cfSpecSel', 'iron'); await p.waitForTimeout(3500);
  const after = await p.evaluate(id => MME.shell.cur.rt.test.prodOf(id), pick.id);
  console.log('after', JSON.stringify(after).slice(0, 300));
  ok('a village that can mine iron is found', !!pick);
  const ri = after.prod.iron / pick.before.prod.iron, ro = after.prod.amber / pick.before.prod.amber;
  ok('its iron about doubles', ri > 1.7 && ri < 2.3, ri.toFixed(3)); ok('the rest it gathers falls to about seven in ten', ro > 0.6 && ro < 0.8, ro.toFixed(3));
  ok('a mine opens beside it', pick.before.mine === 0 && after.mine === 1, pick.before.mine + ' -> ' + after.mine);
  ok('the card says what the specialty does', /×2/.test(await p.textContent('#cfSpec')));
  // a trade the ground does not allow
  const inland = await p.evaluate(() => { const t = MME.shell.cur.rt.test; for (const c of t.cities()) if (!t.specFitList(c.id).includes('seafish') && c.kind === 'village') return c.id; return null; });
  const b2 = await p.evaluate(id => MME.shell.cur.rt.test.prodOf(id), inland);
  await p.evaluate(id => MME.shell.cur.rt.test.pickCity(id), inland); await p.waitForTimeout(400); await p.selectOption('#cfSpecSel', 'seafish'); await p.waitForTimeout(3000);
  const a2 = await p.evaluate(id => MME.shell.cur.rt.test.prodOf(id), inland);
  ok('a fishing village far from the sea changes nothing', a2.spec === '' && Math.abs(a2.prod.amber / b2.prod.amber - 1) < 0.05 && /ยังไม่มีผล/.test(await p.textContent('#cfSpec')), (a2.prod.amber / b2.prod.amber).toFixed(3));
  // kept in the economy document, and back to none
  ok('the choice is saved with the economy', await p.evaluate(id => MME.shell.cur.rt.test.eco().spec[id] === 'seafish', inland));
  await p.selectOption('#cfSpecSel', ''); await p.waitForTimeout(500); ok('and taken away again', await p.evaluate(id => !(MME.shell.cur.rt.test.eco().spec || {})[id], inland));
  ok('no page errors', !errs.length, errs.join(' | '));
  await browser.close(); console.log(bad ? bad + ' failed' : 'all passed'); process.exit(bad ? 1 : 0);
})();
