// whose library: the page owner's map goes to the page's owner alone, and a person sees only the maps they made
const { chromium } = require('playwright');
const URL = 'http://localhost:8765/index.html';
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const errs = []; let bad = 0;
  const ok = (name, v, extra) => { if (!v) bad++; console.log((v ? 'ok   ' : 'FAIL ') + name + (extra != null ? ' | ' + extra : '')); };
  const as = async (ctx, who) => { const p = await ctx.newPage(); p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); if (who) await p.addInitScript(w => { window.MME_WHO = w; }, who); await p.goto(URL); await p.waitForSelector('#lib'); await p.waitForFunction(() => !/กำลังเตรียม/.test(document.getElementById('lib').textContent) && document.getElementById('libCount').textContent, null, { timeout: 30000 }); await p.waitForTimeout(500); return p; };
  const titles = p => p.evaluate(() => [...document.querySelectorAll('.mapcard h3')].map(e => e.firstChild.textContent.trim()));
  const make = async (p, t) => { await p.click('#newBtn'); await p.fill('#nmTitle', t); await p.click('#nmCreate'); await p.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable, null, { timeout: 60000 }); await p.waitForTimeout(400); await p.click('#mmBack'); await p.waitForSelector('.mapcard'); await p.waitForTimeout(300); };
  // one browser, three people in turn
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 800 } });
  let P = await as(ctx, { id: 'u_owner', owner: true });
  ok('the page\'s owner gets Gresland', (await titles(P)).includes('แผนที่ภูมิประเทศเกรสแลนด์'), (await titles(P)).join(' ; '));
  await make(P, 'ของเจ้าของ');
  ok('a new map carries its maker', await P.evaluate(async () => (await MME.store.list()).every(m => m.owner === 'u_owner')));
  await P.close();
  P = await as(ctx, { id: 'u_other', owner: false });
  ok('someone else on the same browser sees neither', (await titles(P)).length === 0, (await titles(P)).join(' ; ') + ' | ' + (await P.textContent('#libCount')));
  ok('and is not offered the old page\'s map', await P.isHidden('#gresAgain'));
  await make(P, 'ของอีกคน');
  ok('their own map is theirs', (await titles(P)).join(';') === 'ของอีกคน' && await P.evaluate(async () => (await MME.store.list())[0].owner === 'u_other'));
  await P.close();
  P = await as(ctx, { id: 'u_owner', owner: true });
  const t = await titles(P); ok('the owner comes back to their own two', t.length === 2 && t.includes('ของเจ้าของ') && t.includes('แผนที่ภูมิประเทศเกรสแลนด์') && !t.includes('ของอีกคน'), t.join(' ; '));
  await P.close(); await ctx.close();
  // a fresh browser where the page cannot yet say who is looking: nothing is put in the library, and nothing breaks
  const c2 = await browser.newContext({ viewport: { width: 1400, height: 800 } });
  P = await as(c2, { id: null, owner: null });
  ok('unknown viewer: Gresland is not handed out', (await titles(P)).length === 0);
  await P.close(); await c2.close();
  // a fresh browser, someone who is not the owner
  const c3 = await browser.newContext({ viewport: { width: 1400, height: 800 } });
  P = await as(c3, { id: 'u_guest', owner: false });
  ok('a visitor starts with an empty library', (await titles(P)).length === 0 && /ยังไม่มีแผนที่/.test(await P.textContent('#lib')));
  ok('the lesson still opens for a visitor', await P.isVisible('#tutorCard button'));
  await P.close(); await c3.close();
  // the one-file build and a copy served from a folder: one person, everything theirs
  const c4 = await browser.newContext({ viewport: { width: 1400, height: 800 } });
  P = await as(c4, null);
  ok('where nobody can be named, Gresland is there as before', (await titles(P)).includes('แผนที่ภูมิประเทศเกรสแลนด์'));
  await P.close(); await c4.close();
  console.log('errors', errs.length + bad, errs.slice(0, 4).join(' | '));
  await browser.close();
})().catch(e => { console.error('TEST FAILED', e.message.slice(0, 900)); process.exit(1); });
