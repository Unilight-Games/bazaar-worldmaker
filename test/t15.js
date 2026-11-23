// the fitted screen: the map takes the window, panels lie over it, tools still land where the pointer is
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  for (const [W, H] of [[1536, 703], [1360, 900]]) {
    const page = await (await browser.newContext({ viewport: { width: W, height: H } })).newPage(); const errs = [];
    page.on('pageerror', e => errs.push('PAGEERR ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
    page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
    const st = () => page.evaluate(() => MME.shell.cur.rt.state());
    const pt = (fx, fy) => page.evaluate(([a, b]) => MME.shell.cur.rt.test.pt(a, b), [fx, fy]);
    const over = async (x, y) => page.evaluate(([a, b]) => { const e = document.elementFromPoint(a, b); return e ? (e.id || e.className || e.tagName) : 'none'; }, [x, y]);
    const geo = () => page.evaluate(() => { const b = document.getElementById('mapbox').getBoundingClientRect(), s = MME.shell.cur.rt.state(), pad = +document.getElementById('mapbox').dataset.padr; const mw = 2048 * s.view[0], mh = 1536 * s.view[0]; return { box: Math.round(b.width) + 'x' + Math.round(b.height), scroll: document.documentElement.scrollHeight - innerHeight, z: Math.round(s.view[0] / s.fitS * 100) / 100, centred: Math.abs(s.view[1] - (b.width - pad - mw) / 2) < 1 || mw > b.width - pad, fits: mw <= b.width - pad + 1 && mh <= b.height + 1 }; });
    const settle = async () => { let v = -1; for (let i = 0; i < 30; i++) { await page.waitForTimeout(400); const s = await st(); if (s.ver === v) return s; v = s.ver; } return st(); };
    await page.goto('http://localhost:8765/index.html'); await page.waitForSelector('.mapcard');
    await page.evaluate(() => localStorage.removeItem('mme-panels'));
    await page.click('#newBtn'); await page.fill('#nmTitle', 'จอพอดี'); await page.fill('#nmSeed', '4242'); await page.dispatchEvent('#nmSeed', 'input'); await page.waitForTimeout(300); await page.click('#nmCreate');
    await page.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable, null, { timeout: 30000 }); await page.waitForTimeout(700);
    console.log(`== ${W}x${H}`, 'fit', await page.evaluate(() => document.getElementById('mapscreen').classList.contains('fit')), JSON.stringify(await geo()));
    // a city where the pointer is
    await page.click('#modes button[data-mode="city"]'); await page.waitForTimeout(200);
    let p = await pt(0.42, 0.5); let on = await over(p[0], p[1]); if (on !== 'map') { await page.click('#panOpts'); await page.waitForTimeout(200); p = await pt(0.42, 0.5); on = await over(p[0], p[1]); }
    await page.mouse.move(p[0], p[1]); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(300);
    if (await page.isVisible('#cfName')) { await page.fill('#cfName', 'กลางจอ'); await page.keyboard.press('Enter'); await page.keyboard.press('Escape'); }
    let s = await st(); console.log('city placed', s.cities === 1, '| pointer was over', on);
    // paint, with the options floating over the map
    await page.click('#modes button[data-mode="terrain"]'); await page.waitForTimeout(200);
    const land0 = s.land; p = await pt(0.5, 0.93); on = await over(p[0], p[1]);
    await page.mouse.move(p[0], p[1]); await page.mouse.down(); await page.mouse.move(p[0] + 30, p[1] + 4, { steps: 4 }); await page.mouse.up(); await page.waitForTimeout(300);
    s = await st(); console.log('painted', s.land !== land0, land0, '->', s.land, '| over', on, '| options overlay box', JSON.stringify(await page.evaluate(() => { const r = document.getElementById('opts').getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })));
    await page.screenshot({ path: `shots/b-${W}-terrain.png` });
    // the side panel put away: the map gets the freed width, still centred; zoom and keys
    const g0 = await geo(); await page.click('#panSide'); await page.waitForTimeout(300); const g1 = await geo(); console.log('side off', JSON.stringify(g1), '| was', g0.box, 'fits', g0.fits);
    p = await pt(0.5, 0.5); await page.mouse.move(p[0], p[1]); for (let k = 0; k < 4; k++) { await page.mouse.wheel(0, -300); await page.waitForTimeout(60); }
    const v0 = (await st()).view; await page.keyboard.down('KeyD'); await page.waitForTimeout(350); await page.keyboard.up('KeyD'); const v1 = (await st()).view; console.log('zoom', Math.round(v0[0] / (await st()).fitS * 100) / 100, '| D pans', v1[1] < v0[1], JSON.stringify(v0.map(Math.round)), JSON.stringify(v1.map(Math.round)), 'focus', await page.evaluate(() => document.activeElement && (document.activeElement.id || document.activeElement.tagName)));
    await page.setViewportSize({ width: W - 200, height: H - 60 }); await page.waitForTimeout(500); console.log('window smaller', JSON.stringify(await geo()));
    await page.setViewportSize({ width: W, height: H }); await page.waitForTimeout(400); await page.click('#zfit'); await page.click('#panSide'); await page.waitForTimeout(300);
    // borders and climate brushes
    await page.click('#modes button[data-mode="econ"]'); await page.click('#ecoTab button[data-t="states"]'); await page.click('#ecobody [data-a="snew"]'); await page.click('#ecoPaintSeg button[data-p="A"]');
    p = await pt(0.42, 0.5); on = await over(p[0], p[1]); if (on !== 'map') { await page.click('#panOpts'); await page.waitForTimeout(200); }
    await page.mouse.move(p[0], p[1]); await page.mouse.down(); await page.mouse.move(p[0] + 20, p[1] + 10, { steps: 3 }); await page.mouse.up(); s = await settle(); console.log('border cells', s.cellsSet, '| pointer over', on);
    await page.screenshot({ path: `shots/b-${W}-econ.png` });
    if (await page.evaluate(() => document.getElementById('mapscreen').classList.contains('noopts'))) await page.click('#panOpts');
    await page.click('#modes button[data-mode="climate"]'); await page.click('#clLayer button[data-k="h"]'); await page.click('#clTool button[data-t="up"]'); p = await pt(0.42, 0.5); on = await over(p[0], p[1]); if (on !== 'map') { await page.click('#panOpts'); await page.waitForTimeout(200); }
    await page.mouse.move(p[0], p[1]); await page.mouse.down(); await page.mouse.move(p[0] + 6, p[1] + 3); await page.mouse.up(); await page.waitForTimeout(300); console.log('climate cells', (await st()).clim[0]);
    await page.click('#mmBack'); await page.waitForSelector('.mapcard');
    // a lesson on the fitted screen, with the side panel put away beforehand
    await page.evaluate(() => localStorage.setItem('mme-panels', JSON.stringify({ side: false, opts: true })));
    await page.reload(); await page.waitForSelector('.mapcard'); await page.click('.tu-chips [data-k="0"]'); await page.waitForSelector('#tutor:not([hidden])', { timeout: 30000 }); await page.waitForTimeout(500);
    const lay = () => page.evaluate(() => { const m = document.getElementById('mapscreen').getBoundingClientRect(), b = document.querySelector('#tutor .tu-box').getBoundingClientRect(); return { screenBottom: Math.round(m.bottom), boxTop: Math.round(b.top), side: !document.getElementById('mapscreen').classList.contains('noside'), spots: document.querySelectorAll('.tu-spot').length, scroll: document.documentElement.scrollHeight - innerHeight }; });
    console.log('lesson line 1', JSON.stringify(await lay()));
    await page.click('#tuNext'); await page.click('#tuNext'); await page.click('#tuNext'); await page.click('#tuNext'); await page.waitForTimeout(500); console.log('lesson line 3 (points at the card)', JSON.stringify(await lay()));
    await page.screenshot({ path: `shots/b-${W}-lesson.png` });
    console.log('ERRORS', errs.length); for (const e of errs.slice(0, 5)) console.log(e);
    await page.close();
  }
  await browser.close();
})().catch(e => { console.error('TEST FAILED', e.message.slice(0, 900)); process.exit(1); });
