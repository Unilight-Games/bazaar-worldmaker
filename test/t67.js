// v0.19.6: a map left and opened again keeps a steady row of buttons: the old map's beat no longer reaches into the new one
const { chromium } = require('playwright');
let bad = 0; const ok = (m, c, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m, x === undefined ? '' : x); if (!c) bad++; };
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await (await browser.newContext({ viewport: { width: 1280, height: 760 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForSelector('#newBtn');
  await p.evaluate(() => { const v = document.getElementById('brVeil'); if (v) v.hidden = true; });
  await p.click('#newBtn'); await p.fill('#nmTitle', 'กะพริบ'); await p.click('#nmCreate');
  const ready = () => p.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable, null, { timeout: 60000 });
  await ready(); await p.waitForTimeout(1500);
  for (let k = 0; k < 2; k++) {                      // out to the library and back in, twice
    await p.click('#mmBack'); await p.waitForTimeout(1200);
    await p.click('.mapcard:has-text("กะพริบ") [data-act="open"]'); await ready(); await p.waitForTimeout(1500);
  }
  const seen = await p.evaluate(async () => { const out = new Set(), sp = new Set(); for (let i = 0; i < 40; i++) { const c = document.querySelector('#mapbox .ctl'), s = document.querySelector('.setpick'); out.add(c ? c.style.maxWidth : '-'); if (s) { const r = s.getBoundingClientRect(); sp.add(Math.round(r.left) + ',' + Math.round(r.top)); } await new Promise(r => setTimeout(r, 100)); } return { widths: [...out], places: [...sp] }; });
  ok('the row of buttons keeps one width', seen.widths.length === 1, JSON.stringify(seen.widths));
  ok('the settings group stays put', seen.places.length <= 1, JSON.stringify(seen.places));
  ok('no page errors', !errs.length, errs.join(' | '));
  await browser.close(); console.log(bad ? bad + ' failed' : 'all passed'); process.exit(bad ? 1 : 0);
})();
