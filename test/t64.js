// v0.19.5: every built-in good back to how it ships, with a second press; the goods added by hand stay; one step back
const { chromium } = require('playwright');
let bad = 0; const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m, x === undefined ? '' : x); if (!c) bad++; };
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await (await browser.newContext({ viewport: { width: 1536, height: 900 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForSelector('.mapcard[data-id="gresland"]', { timeout: 60000 }); await p.click('.mapcard[data-id="gresland"] [data-act="open"]');
  await p.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable && MME.shell.cur.rt.state().econ, null, { timeout: 90000 });
  const G = () => p.evaluate(() => { const e = MME.shell.cur.rt.test.eco(); return { goods: Object.keys(e.goods || {}).length, custom: (e.custom || []).length }; });
  await p.click('.setpick [data-eco="goods"]'); await p.waitForTimeout(600);
  const g0 = await G(); console.log('start', JSON.stringify(g0));
  // a hand-made good, and two built-in goods changed
  await p.evaluate(() => document.querySelector('#ecobody [data-a="gnew"]').click()); await p.waitForTimeout(400);
  for (let k = 0; k < 2; k++) {
    await p.evaluate(k => document.querySelectorAll('#ecobody [data-a="gsel"]')[k + 3].click(), k); await p.waitForTimeout(300);
    await p.evaluate(() => { const el = document.querySelector('#ecobody [data-f="pct"]'); el.value = 40; el.dispatchEvent(new Event('change', { bubbles: true })); }); await p.waitForTimeout(300);
  }
  const g1 = await G(); ok(g1.goods >= g0.goods + 2 && g1.custom === g0.custom + 1, 'two goods changed and one added', JSON.stringify(g1));
  const btn = () => p.evaluate(() => { const b = document.querySelector('#ecobody [data-a="gresetall"]'); return b ? b.textContent : null; });
  ok(/คืนค่าสินค้าเดิมทั้งหมด/.test(await btn() || ''), 'the reset button shows how many', await btn());
  await p.evaluate(() => document.querySelector('#ecobody [data-a="gresetall"]').click()); await p.waitForTimeout(200);
  ok(/อีกครั้ง/.test(await btn() || '') && (await G()).goods === g1.goods, 'one press only asks again');
  await p.evaluate(() => document.querySelector('#ecobody [data-a="gresetall"]').click()); await p.waitForTimeout(600);
  const g2 = await G(); ok(g2.goods === 0 && g2.custom === g1.custom, 'the second press puts every built-in good back; the added good stays', JSON.stringify(g2));
  ok((await btn()) === null, 'with nothing changed the button goes');
  await p.mouse.move(700, 500); await p.keyboard.press('Control+z'); await p.waitForTimeout(800);
  ok((await G()).goods === g1.goods, 'one step back brings the changes back', JSON.stringify(await G()));
  ok(!errs.length, 'no page errors', errs.join(' | '));
  await browser.close(); console.log(bad ? bad + ' failed' : 'all passed'); process.exit(bad ? 1 : 0);
})();
