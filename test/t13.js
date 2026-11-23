// the old Gresland page's database, played by a stand-in: the import at first visit, the late answer, and the import by hand
const { chromium } = require('./_fit');
const fs = require('fs');
const edits = JSON.parse(fs.readFileSync(__dirname + '/../legacy/gresland-edits.json', 'utf8'));
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const run = async (label, delay) => {
    const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
    const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
    await page.addInitScript(([docs, wait]) => {
      const N = 159 * 104, cells = '.'.repeat(N).split(''); for (const i of [3000, 3001, 3002, 3160, 3161]) cells[i] = 'g';
      docs.terrain = { v: 2, cols: 159, rows: 104, cells: cells.join(''), rivOff: [], rivSig: '0:0' };
      window.__writes = 0;
      const db = { doc: path => ({ get: async () => { const k = path.split('/')[1], b = docs[k]; return { id: k, exists: !!b, data: () => b, metadata: { fromCache: false, hasPendingWrites: false } }; }, set: async () => { window.__writes++; }, update: async () => { window.__writes++; }, delete: async () => { window.__writes++; }, onSnapshot: () => () => {} }) };
      const user = { id: async () => 'u_test', isOwner: async () => true };   // the page's owner is looking: only they are handed Gresland
      window.claude = { use: name => new Promise(res => setTimeout(() => res(name === 'db' ? db : name === 'user' ? user : null), name === 'db' ? wait : 50)) };
    }, [edits, delay]);
    await page.goto('http://localhost:8765/index.html?fit=0'); await page.waitForSelector('.mapcard', { timeout: 30000 });
    const meta = () => page.evaluate(async () => { const m = await MME.store.getMeta('gresland'); const t = await MME.store.getDoc('gresland', 'terrain'); return { seed: m.seed, docs: (m.seedDocs || []).join(','), terrain: t ? (t.cells.match(/g/g) || []).length : null }; });
    console.log(label, 'at first paint:', JSON.stringify(await meta()), '| again button:', await page.isVisible('#gresAgain'));
    if (delay > 6000) { for (let n = 0; n < 60; n++) { if ((await meta()).seed === 'db') break; await page.waitForTimeout(500); } console.log(label, 'after the late answer:', JSON.stringify(await meta()), '| maps:', await page.$$eval('.mapcard h3', a => a.length)); }
    console.log(label, 'card:', (await page.$eval('.mapcard[data-id="gresland"] .bd', e => e.textContent)).replace(/\s+/g, ' ').slice(0, 220));
    await page.click('.mapcard[data-id="gresland"] [data-act="open"]'); await page.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().econ, null, { timeout: 40000 });
    const s = await page.evaluate(() => MME.shell.cur.rt.state()); console.log(label, 'opened: land', s.land, 'cities', s.cities, 'rivers', s.rivers, 'flows', s.flows);
    await page.click('#mmBack'); await page.waitForSelector('.mapcard');
    if (delay < 6000) { await page.click('#gresAgain'); await page.waitForFunction(() => document.querySelectorAll('.mapcard').length === 2, null, { timeout: 20000 }); console.log(label, 'by hand:', await page.$$eval('.mapcard h3', a => a.map(x => x.textContent).join(' ; '))); }
    console.log(label, 'writes to the old database:', await page.evaluate(() => window.__writes), '| errors', errs.length, errs.slice(0, 3).join(' '));
    await ctx.close();
  };
  await run('[db answers at once]', 300);
  await run('[db answers late]', 9000);
  await browser.close();
})().catch(e => { console.error('TEST FAILED', e.message.slice(0, 900)); process.exit(1); });
