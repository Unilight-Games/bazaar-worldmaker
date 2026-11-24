// the room's rules: sent away means out for good; nothing is taken from someone not let in; a poor line still converges
const { chromium } = require('./_fit');
const URL = 'http://localhost:8765/index.html?fit=0';
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const run = async (label, net) => {
    const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
    if (net) await ctx.addInitScript(n => { try { localStorage.setItem('mme-net', JSON.stringify(n)); } catch (e) {} }, net);
    const A = await ctx.newPage(), B = await ctx.newPage(), C = await ctx.newPage(); const errs = [];
    for (const [n, p] of [['A', A], ['B', B], ['C', C]]) { p.on('pageerror', e => errs.push(n + ' PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/fonts\.g|Failed to load resource/.test(m.text())) errs.push(n + ' CONSOLE ' + m.text()); }); }
    const st = p => p.evaluate(() => MME.shell.cur && MME.shell.cur.rt ? MME.shell.cur.rt.state() : null);
    const ready = p => p.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable, null, { timeout: 60000 });
    const hashes = p => p.evaluate(() => MME.shell.cur ? MME.DOCKEYS.map(k => MME.sync.hash(k, MME.shell.cur.db.known(k))).join(' ') : 'out');
    const same = async (ps, ms) => { const t0 = Date.now(); for (;;) { const h = []; for (const p of ps) h.push(await hashes(p)); if (h.every(x => x === h[0] && x !== 'out')) return Date.now() - t0; if (Date.now() - t0 > ms) return -1; await A.waitForTimeout(500); } };
    const mapBox = p => p.evaluate(() => { const t = MME.shell.cur.rt.test, a = t.pt(0, 0), b = t.pt(1, 1); return { x: a[0], y: a[1], width: b[0] - a[0], height: b[1] - a[1] }; });
    for (const p of [A, B, C]) { await p.goto(URL); await p.waitForSelector('.mapcard'); }
    await A.click('#newBtn'); await A.fill('#nmTitle', 'ห้อง ' + label); await A.fill('#nmSeed', '777'); await A.dispatchEvent('#nmSeed', 'input'); await A.waitForTimeout(300); await A.click('#nmCreate'); await ready(A); await A.waitForTimeout(700);
    await A.click('#roomOpen'); await A.waitForTimeout(200); await A.fill('#roomNameIn', 'เจ้าของ'); await A.keyboard.press('Enter');
    await A.waitForSelector('#roomPanel:not([hidden])', { timeout: 20000 }); const code = (await A.textContent('#roomCode')).trim();
    const join = async (p, name) => { await p.bringToFront(); await p.fill('#myName', name); await p.fill('#joinCode', code); const t0 = Date.now(); await p.click('#joinBtn'); try { await ready(p); } catch (e) { console.log(`[${label}] ${name} could not join:`, (await p.textContent('#mtoast')).trim(), '| button', await p.textContent('#joinBtn')); throw e; } return Date.now() - t0; };
    console.log(`[${label}] join ms`, await join(B, 'บี'), await join(C, 'ซี'), '| all the same after', await same([A, B, C], 30000), 'ms');
    // everyone works at once
    const paint = async (p, fx, fy, sw) => { await p.bringToFront(); await p.click('#modes button[data-mode="terrain"]'); await p.click(`#pal .sw[data-b="${sw}"]`); const b = await mapBox(p); await p.mouse.move(b.x + b.width * fx, b.y + b.height * fy); await p.mouse.down(); for (let k = 1; k <= 8; k++) await p.mouse.move(b.x + b.width * fx + k * 7, b.y + b.height * fy + k * 3); await p.mouse.up(); };
    const land0 = (await st(A)).land; await paint(B, 0.06, 0.05, 'g'); await paint(C, 0.5, 0.04, 'd'); await paint(A, 0.9, 0.05, 'f');
    await A.bringToFront(); await A.click('#modes button[data-mode="river"]'); await A.click('#autoRiv'); await A.waitForTimeout(3000);
    let ms = await same([A, B, C], 90000); const a = await st(A), b = await st(B), c = await st(C);
    console.log(`[${label}] three paint and the owner lays rivers: same after`, ms, 'ms | land', a.land, b.land, c.land, '| rivers', a.rivers, b.rivers, c.rivers, ms >= 0 && a.land === b.land && b.land === c.land && a.land > land0 && a.rivers === c.rivers ? 'SYNC OK' : 'MISMATCH', '(land before', land0 + ')');
    console.log(`[${label}] still in the room:`, await B.isVisible('#mapscreen'), await C.isVisible('#mapscreen'), '| people at the owner:', (await A.textContent('#roomPeople')).replace(/\s+/g, ' '));
    if (!net) {
      // a stranger who never knocked sends a change: nobody takes it
      const D = await ctx.newPage(); await D.goto(URL); await D.waitForSelector('.mapcard');
      await D.evaluate(c => { const bc = new BroadcastChannel('mme-room-mm-' + c.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6)); const d = MME.sync.diff('cities', { v: 1, hidden: [], cities: [] }, { v: 1, hidden: [], cities: [{ id: 'cfake', kind: 'capital', name: 'ปลอม', note: '', x: 600, y: 500 }] }); bc.postMessage({ _p: 1, from: 'pstranger', by: 'tstranger', p: { n: 'คนแปลกหน้า' } }); bc.postMessage({ from: 'pstranger', by: 'tstranger', d: { t: 'd', k: 'cities', d } }); }, code);
      await A.waitForTimeout(2500); console.log(`[${label}] a stranger's change: cities at A, B, C`, (await st(A)).cities, (await st(B)).cities, (await st(C)).cities, (await st(A)).cities === 0 && (await st(B)).cities === 0 && (await st(C)).cities === 0 ? 'REFUSED' : 'TAKEN');
      await D.close();
      // the owner sends B away
      await A.bringToFront(); await A.evaluate(() => window.scrollTo(0, 0)); let done = false;
      for (let tries = 0; tries < 6 && !done; tries++) {   // the people list is drawn again as D leaves; look again if the button went
        await A.waitForTimeout(tries ? 600 : 0);
        try { const kicks = await A.$$('#roomPeople [data-kick]'); for (const k of kicks) { const li = await k.evaluateHandle(e => e.closest('li')); if (/บี/.test(await li.evaluate(e => e.textContent))) { await k.click({ timeout: 3000 }); done = true; break; } } } catch (e) { /* drawn again under the click */ }
      }
      await B.waitForSelector('#menu:not([hidden])', { timeout: 15000 }); console.log(`[${label}] B sent away:`, done, '|', (await B.textContent('#mtoast')).trim());
      await B.bringToFront(); await B.fill('#joinCode', code); await B.click('#joinBtn'); await B.waitForTimeout(6000);
      console.log(`[${label}] B tries to come back: in the room`, await B.isVisible('#mapscreen'), '|', (await B.textContent('#mtoast')).trim(), '| banned at the owner', await A.evaluate(() => MME.shell.cur.room.banned));
      await paint(C, 0.3, 0.05, 'g'); await A.waitForTimeout(1500); ms = await same([A, C], 20000); console.log(`[${label}] C still works with the owner: same after`, ms, 'ms');
    }
    // the owner leaves: everyone is out
    await A.bringToFront(); await A.evaluate(() => window.scrollTo(0, 0)); await A.click('#mmBack'); await C.waitForSelector('#menu:not([hidden])', { timeout: 20000 });
    console.log(`[${label}] the owner left: C out`, await C.isVisible('#menu'), '| errors', errs.length, errs.slice(0, 3).join(' | '));
    await ctx.close();
  };
  const only = process.env.LINE || '';
  if (!only || only === 'clean') await run('clean line');
  if (!only || only === 'poor') await run('poor line', { delay: 350, jitter: 450, loss: 0.08 });
  if (!only || only === 'bad') await run('bad line', { delay: 600, jitter: 900, loss: 0.2 });
  await browser.close();
})().catch(e => { console.error('TEST FAILED', e.message.slice(0, 900)); process.exit(1); });
