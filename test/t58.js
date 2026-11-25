// v0.19.2: the owner's song plays in place of the made-up music, on a loop; the switch stops it; leaving the map stops it
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  for (const url of ['http://localhost:8765/index.html', 'file://' + __dirname + '/../dist-offline/bazaar-worldmaker-offline.html']) {
    const p = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(url); await p.waitForSelector('#tuStart', { timeout: 60000 }); const tag = url.startsWith('file') ? 'offline: ' : 'page: ';
    await p.click('#tuStart'); await p.waitForSelector('#tutor:not([hidden])', { timeout: 30000 }); await p.waitForTimeout(2000);
    const M = () => p.evaluate(() => MME.shell.cur.rt.test.music());
    await p.click('.mapopt [data-hud="music"]'); await p.waitForTimeout(3500); let m = await M();
    ok(m.on && !m.paused && m.loop && m.dur > 250 && m.t > 1, tag + 'the song plays on a loop (' + Math.round(m.dur) + ' s)');
    await p.evaluate(() => MME.shell.cur.rt.test.musicSeek(0.6)); await p.waitForTimeout(1800); m = await M();
    ok(!m.paused && m.t < 5, tag + 'at the end it starts again (' + m.t.toFixed(1) + ' s)');
    await p.click('.mapopt [data-hud="music"]'); await p.waitForTimeout(1300); m = await M();
    ok(!m.on && m.paused, tag + 'the switch stops it');
    ok(!errs.length, tag + 'no page errors ' + errs.slice(0, 2).join(' '));
    await p.close();
  }
  console.log(fails ? fails + ' failed' : 'all passed'); await browser.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('TEST FAILED', e.message.slice(0, 400)); process.exit(1); });
