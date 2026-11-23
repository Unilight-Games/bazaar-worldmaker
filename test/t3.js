const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 1360, height: 900 } })).newPage();
  page.on('pageerror', e => console.log('PAGEERR', e.message));
  await page.goto('http://localhost:8765/index.html'); await page.waitForSelector('.mapcard');
  for (const start of ['blank', 'random']) {
    await page.click('#newBtn'); await page.click(`#nmStart button[data-v="${start}"]`); await page.waitForTimeout(300); await page.click('#nmCreate');
    await page.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable, null, { timeout: 30000 });
    await page.waitForTimeout(800);
    const client = await page.context().newCDPSession(page); await client.send('Profiler.enable'); await client.send('Profiler.start');
    const t = await page.evaluate(() => { const t0 = performance.now(); window.__ed.rebuildAll(); return performance.now() - t0; });
    const { profile } = await client.send('Profiler.stop');
    const self = new Map(); const dt = profile.timeDeltas, ids = profile.samples, byId = new Map(profile.nodes.map(n => [n.id, n]));
    ids.forEach((id, i) => { const n = byId.get(id), k = n.callFrame.functionName || '(anon)'; self.set(k, (self.get(k) || 0) + dt[i] / 1000); });
    console.log(start, 'rebuildAll ms', Math.round(t), [...self].sort((a, b) => b[1] - a[1]).slice(0, 9).map(([k, v]) => k + ':' + Math.round(v)).join(' '));
    await page.click('#mmBack'); await page.waitForSelector('.mapcard');
  }
  await browser.close();
})().catch(e => { console.error('TEST FAILED', e.message.slice(0, 600)); process.exit(1); });
