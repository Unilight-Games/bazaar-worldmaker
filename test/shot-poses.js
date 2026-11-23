// every pose beside the box, on a wide and a narrow screen, with the longest line: does anything cover the words?
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  for (const [w, h] of [[1360, 900], [1536, 703], [420, 800]]) {
    const page = await (await browser.newContext({ viewport: { width: w, height: h } })).newPage();
    await page.goto('http://localhost:8765/index.html'); await page.waitForSelector('.mapcard');
    await page.click('#tuStart'); await page.waitForSelector('#tutor:not([hidden])', { timeout: 30000 }); await page.waitForTimeout(600);
    await page.evaluate(() => { document.getElementById('tuToc').click(); document.querySelector('#tuTocBox [data-k="8"]').click(); });
    for (let k = 0; k < 4; k++) { await page.click('#tuNext'); await page.waitForTimeout(80); await page.click('#tuNext'); await page.waitForTimeout(80); }
    await page.click('#tuText'); await page.waitForTimeout(200);
    for (const p of ['smile', 'explain', 'think', 'ask', 'smirk', 'guilty', 'shush', 'surprise', 'panic', 'mad']) {
      await page.evaluate(q => { const i = document.getElementById('tuImg'); i.src = 'assets/nem/' + q + '.webp'; i.parentNode.dataset.pose = q; }, p); await page.waitForTimeout(450);
      const over = await page.evaluate(() => {      // does any opaque pixel of her picture sit above the box in the stack, inside the box?
        const box = document.querySelector('#tutor .tu-box').getBoundingClientRect(), fig = document.querySelector('#tutor .tu-fig').getBoundingClientRect(), txt = document.getElementById('tuText').getBoundingClientRect();
        const top = document.elementFromPoint(txt.left + 4, txt.top + 8);
        return { figRight: Math.round(fig.right), boxLeft: Math.round(box.left), textLeft: Math.round(txt.left), topIsText: !!top && (top.id === 'tuText' || top.closest('.tu-box') !== null) };
      });
      if (p === 'smile' || p === 'mad' || p === 'ask' || p === 'explain') await page.screenshot({ path: `shots/95-${w}-${p}.png`, clip: { x: 0, y: h - 560, width: Math.min(w, 1360), height: 560 } });
      { const g = await page.evaluate(() => { const f = document.querySelector('#tutor .tu-fig').getBoundingClientRect(); return Math.round(f.left) + ',' + Math.round(f.top); }); console.log(w, p, 'frame at', g, JSON.stringify(over)); }
    }
    await page.close();
  }
  await browser.close();
})().catch(e => { console.error('TEST FAILED', e.message.slice(0, 600)); process.exit(1); });
