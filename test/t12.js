const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const NARROW = !!process.env.NARROW; const ctx = await browser.newContext(NARROW ? { viewport: { width: 390, height: 800 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 } : { viewport: { width: 1360, height: 900 } });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push('PAGEERR ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 5).join('\n')));
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
  const st = () => page.evaluate(() => MME.shell.cur && MME.shell.cur.rt ? MME.shell.cur.rt.state() : null);
  const head = async () => (await page.textContent('#tuChap')) + ' | ' + (await page.textContent('#tuCount'));
  const next = async () => { await page.click('#tuNext'); await page.waitForTimeout(60); if (await page.evaluate(() => document.getElementById('tutor') && !document.getElementById('tutor').hidden && document.getElementById('tuText').textContent.length === 0)) await page.waitForTimeout(100); };
  const full = async () => { await page.click('#tuText'); await page.waitForTimeout(80); };
  await page.goto('http://localhost:8765/index.html'); await page.waitForSelector('.mapcard');
  console.log('card:', (await page.textContent('#tutorCard')).replace(/\s+/g, ' ').slice(0, 200));
  await page.screenshot({ path: NARROW ? 'shots/80n-menu.png' : 'shots/80-menu.png' });
  await page.click('#tuStart'); await page.waitForSelector('#tutor:not([hidden])', { timeout: 30000 });
  let s = await st(); console.log('practice:', 'cities', s.cities, 'rivers', s.rivers, 'land', s.land, 'mode', s.mode, '| back:', await page.textContent('#mmBack'), '| export:', await page.textContent('#setExport'));
  await page.waitForTimeout(2500); await page.screenshot({ path: 'shots/81-welcome.png' });
  const seen = []; let guard = 0, nameMiss = 0, boxBad = 0, shots = { 'terrain-01': 1, 'climate-03': 1, 'climate-05': 1, 'climate-06': 1, 'states-02': 1, 'gdp-01': 1, 'gdp-05': 1, 'room-01': 1, 'room-03': 1, 'keep-01': 1 };
  const total = await page.evaluate(() => MME.TUTOR.chapters.reduce((a, c) => a + c.steps.length, 0));
  for (let n = 0; n < total; n++) {
    await full();
    const at = await page.evaluate(() => { const p = JSON.parse(localStorage.getItem('mme-tutor')); const c = MME.TUTOR.chapters[p.at[0]], x = c.steps[p.at[1]]; return { id: x.id, mode: x.mode || c.mode, tab: x.tab || '', spot: x.spot || '', task: x.task || '', act: x.act || '' }; });
    s = await st(); const spots = await page.evaluate(() => document.querySelectorAll('.tu-spot').length);
    const tabOn = await page.evaluate(() => { const b = document.querySelector('#ecoTab button[aria-pressed="true"]'); return b ? b.dataset.t : ''; });
    let note = '';
    if (at.mode && s.mode !== at.mode) note += ' MODE-MISMATCH ' + s.mode;
    if (at.tab && tabOn !== at.tab) note += ' TAB-MISMATCH ' + tabOn;
    if (at.spot && !spots) note += ' NO-SPOT';
    // the words on the page that the line speaks of must be on the page, and the line must fit on the screen with its buttons
    const miss = await page.evaluate(() => { const p = JSON.parse(localStorage.getItem('mme-tutor')), x = MME.TUTOR.chapters[p.at[0]].steps[p.at[1]]; const have = [...document.querySelectorAll('button, summary, h2, h3, h4, option, label, span.lbl')].map(e => e.textContent.trim()); return (x.names || []).filter(n => !have.some(t => t === n || t.startsWith(n + ' ') || t.startsWith(n))); });
    if (miss.length) { note += ' NAME-NOT-ON-PAGE ' + miss.join(','); nameMiss++; }
    const fit = await page.evaluate(() => { const b = document.querySelector('#tutor .tu-box').getBoundingClientRect(), n = document.getElementById('tuNext').getBoundingClientRect(), t = document.getElementById('tuText'); return { out: b.left < -1 || b.right > innerWidth + 1 || b.bottom > innerHeight + 1 || b.top < -1, next: n.width > 0 && n.bottom <= innerHeight + 1 && n.right <= innerWidth + 1, clip: t.scrollHeight > t.clientHeight + 2 && getComputedStyle(t).overflowY === 'hidden' }; });
    if (fit.out || !fit.next || fit.clip) { note += ' BOX-OFF-SCREEN ' + JSON.stringify(fit); boxBad++; }
    if (shots[at.id]) { await page.waitForTimeout(700); await page.screenshot({ path: `shots/82${NARROW ? 'n' : ''}-${at.id}.png` }); }
    if (at.act === 'states') { await page.click('#tuAct'); await page.waitForTimeout(2600); s = await st(); note += ` | act -> states ${s.states} cells ${s.cellsSet} task: ${await page.textContent('#tuTask')}`; await page.screenshot({ path: 'shots/83-states-seeded.png' }); }
    if (at.task === 'rivers') { await page.click('#autoRiv'); await page.waitForTimeout(1500); note += ' | task: ' + (await page.textContent('#tuTask')) + ' | says: ' + (await page.textContent('#tuText')).slice(0, 40); }
    if (at.task === 'view') { await page.keyboard.press('KeyD'); await page.locator('#zin').click(); await page.waitForTimeout(1200); note += ' | task: ' + (await page.textContent('#tuTask')); }
    seen.push(at.id + (note ? note : ''));
    if (note) console.log(' ', at.id, note);
    await next();
  }
  console.log('walked', seen.length, 'of', total, '| lines whose words are missing from the page:', nameMiss, '| lines off the screen:', boxBad, '| tutor hidden at end:', await page.evaluate(() => document.getElementById('tutor').hidden), '| menu shown:', await page.isVisible('#menu'));
  console.log('card after:', (await page.textContent('#tutorCard')).replace(/\s+/g, ' ').slice(0, 120));
  console.log('library maps:', await page.$$eval('.mapcard h3', a => a.map(x => x.textContent).join(' ; ')));
  // chapter chips, keeping the practice map, minimise, leaving by the back button
  await page.click('.tu-chips [data-k="8"]'); await page.waitForSelector('#tutor:not([hidden])', { timeout: 30000 }); console.log('chip ->', await head());
  await page.click('#tuMin'); console.log('minimised: tutor hidden', await page.evaluate(() => document.getElementById('tutor').hidden), 'chip shown', await page.isVisible('#tuChip')); await page.click('#tuChip');
  await page.click('#tuToc'); await page.click('#tuTocBox [data-k="2"]'); console.log('toc ->', await head());
  await page.keyboard.press('Enter'); await page.keyboard.press('Enter'); console.log('enter ->', await head());
  await page.evaluate(() => window.scrollTo(0, 0)); await page.click('#setExport'); await page.waitForTimeout(800);
  await page.click('#mmBack'); await page.waitForSelector('.mapcard'); await page.waitForTimeout(300);
  console.log('after back: tutor hidden', await page.evaluate(() => document.getElementById('tutor').hidden), '| library:', await page.$$eval('.mapcard h3', a => a.map(x => x.textContent).join(' ; ')));
  console.log('ERRORS', errs.length); for (const e of errs.slice(0, 8)) console.log(e);
  await browser.close();
})().catch(e => { console.error('TEST FAILED', e.message.slice(0, 900)); process.exit(1); });
