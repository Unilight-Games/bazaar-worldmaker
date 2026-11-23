const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  for (const [w, h] of [[1536, 703], [1360, 900]]) {
    const page = await (await browser.newContext({ viewport: { width: w, height: h } })).newPage(); const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    await page.goto('http://localhost:8765/index.html'); await page.waitForSelector('.mapcard');
    await page.click('.mapcard[data-id="gresland"] [data-act="open"]'); await page.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().econ, null, { timeout: 40000 });
    const geo = () => page.evaluate(() => { const b = document.getElementById('mapbox').getBoundingClientRect(), s = MME.shell.cur.rt.state(); return { box: [Math.round(b.width), Math.round(b.height), Math.round(b.top)], view: s.view.map(v => Math.round(v * 1000) / 1000), fitS: Math.round(s.fitS * 1000) / 1000, scrollH: document.documentElement.scrollHeight, winH: innerHeight }; });
    console.log(w + 'x' + h, 'view mode', JSON.stringify(await geo()));
    await page.screenshot({ path: `shots/a-${w}-view.png` });
    await page.click('#modes button[data-mode="terrain"]'); await page.waitForTimeout(300); await page.screenshot({ path: `shots/a-${w}-terrain.png` });
    await page.click('#panSide'); await page.waitForTimeout(300); console.log('  side off', JSON.stringify(await geo()));
    await page.click('#modes button[data-mode="econ"]'); await page.waitForTimeout(400); await page.screenshot({ path: `shots/a-${w}-econ-noside.png` });
    await page.click('#panSide'); await page.click('#panOpts'); await page.waitForTimeout(300); await page.mouse.move(w / 2, h / 2); await page.mouse.wheel(0, -600); await page.waitForTimeout(300); console.log('  zoomed', JSON.stringify(await geo()));
    await page.screenshot({ path: `shots/a-${w}-econ-zoom.png` }); await page.click('#panOpts');
    await page.setViewportSize({ width: 900, height: 800 }); await page.waitForTimeout(500); console.log('  narrow', JSON.stringify(await geo()), 'fit class', await page.evaluate(() => document.getElementById('mapscreen').classList.contains('fit')));
    await page.screenshot({ path: `shots/a-${w}-narrow.png` });
    console.log('  errors', errs.length, errs.slice(0, 3).join(' | '));
    await page.close();
  }
  await browser.close();
})().catch(e => { console.error('TEST FAILED', e.message.slice(0, 700)); process.exit(1); });
