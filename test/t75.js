// v0.21.0: the central market orders its goods by any of its number columns, high to low on a first press, low to high on the
// next, and back to the order by trade from the goods' own head (the owner's ask, 26 Nov 2026)
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m, x === undefined ? '' : x); if (!c) fails++; };
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await (await browser.newContext({ viewport: { width: 1536, height: 900 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForSelector('.mapcard[data-id="gresland"]', { timeout: 60000 }); await p.click('.mapcard[data-id="gresland"] [data-act="open"]');
  await p.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().econ, null, { timeout: 90000 }); await p.waitForTimeout(3000);
  await p.click('#modes button[data-mode="view"]'); await p.click('#mkBtn'); await p.waitForTimeout(500);
  const heads = await p.$$eval('#mkBody [data-mks]', a => a.map(b => b.dataset.mks));
  ok(heads.join() === ',sup,dem,stock,price,piece', 'six heads press to order the table', heads.join());
  // the numbers of one column, top to bottom, read back from the cells (thousands commas and the Thai digits of toLocaleString aside)
  const col = n => p.$$eval('#mkBody .mkrow', (rows, n) => rows.map(r => { const t = r.children[n].textContent.replace(/[▲▼·].*$/, '').split('/')[0].replace(/,/g, '').trim(); return parseFloat(t); }), n);
  const order0 = await p.$$eval('#mkBody .mkrow', r => r.map(x => x.dataset.cat));
  for (const [k, n, name] of [['sup', 1, 'supply'], ['dem', 2, 'demand'], ['stock', 3, 'stock at the season start'], ['price', 4, 'price a portion'], ['piece', 5, 'price a piece']]) {
    await p.click(`#mkBody [data-mks="${k}"]`); await p.waitForTimeout(200);
    const hi = await col(n), down = hi.every((v, i) => i === 0 || v <= hi[i - 1] * 1.0001 + 1e-9);
    const st = await p.$eval(`#mkBody [data-mks="${k}"]`, b => [b.getAttribute('aria-sort'), b.textContent]);
    ok(down && st[0] === 'descending' && /▼/.test(st[1]), name + ': high to low on a first press', hi.slice(0, 4).join(' '));
    await p.click(`#mkBody [data-mks="${k}"]`); await p.waitForTimeout(200);
    const lo = await col(n), up = lo.every((v, i) => i === 0 || v >= lo[i - 1] * 0.9999 - 1e-9);
    ok(up && /▲/.test(await p.$eval(`#mkBody [data-mks="${k}"]`, b => b.textContent)), name + ': low to high on the next', lo.slice(0, 4).join(' '));
  }
  // a good opened stays open while the order changes
  const first = order0[0]; await p.click(`#mkBody .mkrow[data-cat="${first}"]`); await p.waitForTimeout(200);
  await p.click('#mkBody [data-mks="price"]'); await p.waitForTimeout(200);
  ok(await p.$(`#mkBody .mkrow.on[data-cat="${first}"] + .mkdet`) !== null, 'the good opened keeps its details under it in the new order');
  await p.click('#mkBody [data-mks=""]'); await p.waitForTimeout(200);
  ok((await p.$$eval('#mkBody .mkrow', r => r.map(x => x.dataset.cat))).join() === order0.join(), 'the goods head goes back to the order by trade');
  ok(errs.length === 0, 'no page errors', errs.slice(0, 3).join(' | '));
  await browser.close(); console.log(fails ? fails + ' FAILED' : 'all passed'); process.exit(fails ? 1 : 0);
})();
