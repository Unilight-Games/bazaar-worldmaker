// v0.22.0: the English page (the owner's ask, 26 Nov 2026). The sources stay Thai and the build writes an English twin; this test
// opens the twin, looks for Thai left on the screen, switches language both ways, and checks the few places where logic read Thai text.
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m, x === undefined ? '' : x); if (!c) fails++; };
const thaiOnScreen = () => { const out = new Set(); const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
  while ((n = w.nextNode())) { const el = n.parentElement; if (!el || el.closest('template,script,style') || !el.offsetParent) continue; if (/[ก-๙]/.test(n.nodeValue)) out.add(n.nodeValue.trim().slice(0, 60)); }
  for (const el of document.querySelectorAll('[title],[placeholder],[aria-label]')) { if (!el.offsetParent) continue; for (const a of ['title', 'placeholder', 'aria-label']) { const v = el.getAttribute(a); if (v && /[ก-๙]/.test(v)) out.add('@' + a + ': ' + v.slice(0, 50)); } }
  return [...out]; };
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }), p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/en.html'); await p.waitForSelector('#newBtn', { timeout: 60000 });
  await p.evaluate(() => { const v = document.getElementById('brVeil'); if (v) v.hidden = true; });
  const head = await p.evaluate(() => [document.documentElement.lang, MME.LANG, document.getElementById('langBtn').textContent, document.getElementById('langBtn').hidden]);
  ok(head[0] === 'en' && head[1] === 'en' && head[2] === 'ภาษาไทย' && !head[3], 'the English page knows its language and offers Thai', JSON.stringify(head));
  const menuTh = (await p.evaluate(thaiOnScreen)).filter(s => s !== 'ภาษาไทย');
  ok(!menuTh.length, 'no Thai left on the menu but the language button', JSON.stringify(menuTh.slice(0, 6)));
  // the practice map: the whole interface in English
  await p.click('#tuStart'); await p.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable, null, { timeout: 120000 }); await p.waitForTimeout(2500);
  await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Minimise'); if (b) b.click(); });
  for (const m of ['terrain', 'river', 'city', 'label', 'road', 'trade', 'climate', 'econ', 'info']) { const bt = await p.$(`#modes button[data-mode="${m}"]`); if (bt) { await bt.click(); await p.waitForTimeout(500); } }
  const mapTh = await p.evaluate(thaiOnScreen);
  ok(!mapTh.length, 'no Thai on the practice map in any mode', JSON.stringify(mapTh.slice(0, 6)));
  // numbers typed the English way
  const pop = await p.evaluate(async () => { const s = document.getElementById('tierSel'), n = document.getElementById('tierNum'); s.value = 'own'; s.dispatchEvent(new Event('change')); await new Promise(r => setTimeout(r, 200));
    n.value = '2.5 billion'; n.dispatchEvent(new Event('change')); n.blur(); s.dataset.sig = ''; await new Promise(r => setTimeout(r, 600)); return n.value; });
  ok(pop.replace(/,/g, '') === '2500000000', 'the population box reads "2.5 billion"', pop);
  // the market: the cloth unit is a bolt, numbers keep commas
  await p.click('#modes button[data-mode="view"]'); await p.click('#mkBtn').catch(() => {}); await p.waitForTimeout(900);
  const mk = await p.evaluate(() => document.body.innerText);
  ok(/\/bolt/.test(mk) && !/\/maps/.test(mk), 'cloth is sold by the bolt, maps are not a unit', (mk.match(/\/(bolt|maps)/g) || []).join(' '));
  // switching back to Thai, and the choice is remembered
  await p.keyboard.press('Escape'); await p.evaluate(() => { for (const d of document.querySelectorAll('dialog[open]')) d.close(); });
  const p2 = await ctx.newPage(); await p2.goto('http://localhost:8765/en.html'); await p2.waitForSelector('#langBtn');
  await p2.evaluate(() => { const v = document.getElementById('brVeil'); if (v) v.hidden = true; });
  await Promise.all([p2.waitForNavigation(), p2.click('#langBtn')]); await p2.waitForSelector('#newBtn');
  ok(/index\.html$|\/$/.test(p2.url()) && await p2.evaluate(() => MME.LANG) === 'th', 'the language button goes to the Thai page', p2.url());
  const p3 = await ctx.newPage(); await p3.goto('http://localhost:8765/en.html'); await p3.waitForSelector('#newBtn'); await p3.waitForTimeout(300);
  ok(await p3.evaluate(() => MME.LANG) === 'th', 'the choice is remembered: the English address now opens Thai', p3.url());
  await p3.evaluate(() => { const v = document.getElementById('brVeil'); if (v) v.hidden = true; });
  await Promise.all([p3.waitForNavigation(), p3.click('#langBtn')]); await p3.waitForSelector('#newBtn');
  ok(await p3.evaluate(() => MME.LANG) === 'en', 'and back to English');
  // the web build has its twin too
  const p4 = await ctx.newPage(); await p4.goto('http://localhost:8767/en.html'); await p4.waitForSelector('#newBtn', { timeout: 60000 });
  ok(await p4.evaluate(() => MME.LANG) === 'en', 'the web build serves en.html');
  ok(!errs.length, 'no page errors', JSON.stringify(errs.slice(0, 3)));
  await browser.close(); console.log(fails ? fails + ' FAILED' : 'ALL OK'); process.exit(fails ? 1 : 0);
})();
