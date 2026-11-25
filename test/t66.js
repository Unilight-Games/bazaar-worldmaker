// v0.19.6: two people in one room. Fields the sync schema never named (the units of government among them) now travel both
// ways; a change to them and a change to a named field at the same moment both stand; and text being typed in the economy
// card survives a change heard from the room.
const { chromium } = require('playwright');
const URL = 'http://localhost:8765/index.html';
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1536, height: 800 } });
  const A = await ctx.newPage(), B = await ctx.newPage(); const errs = []; let bad = 0;
  const ok = (name, v, extra) => { if (!v) bad++; console.log((v ? 'ok   ' : 'FAIL ') + name + (extra != null ? ' | ' + extra : '')); };
  for (const [n, p] of [['A', A], ['B', B]]) p.on('pageerror', e => errs.push(n + ' ' + e.message));
  const ready = p => p.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable, null, { timeout: 60000 });
  const H = (p, f, a) => p.evaluate(f, a);
  for (const p of [A, B]) { await p.goto(URL); await p.waitForSelector('#lib'); await p.waitForTimeout(400); }
  await A.bringToFront(); await A.click('#newBtn'); await A.fill('#nmTitle', 'ห้องทดสอบซิงก์'); await A.fill('#nmSeed', '4242'); await A.dispatchEvent('#nmSeed', 'input'); await A.waitForTimeout(300); await A.click('#nmCreate'); await ready(A); await A.waitForTimeout(800);
  // a state over the middle, and a few communities in it, before the room opens
  await A.click('#modes button[data-mode="city"]'); await A.waitForTimeout(300);
  const spots = await H(A, () => { const t = MME.shell.cur.rt.test, gr = t.ground(), out = []; const cv = document.querySelector('#mapbox canvas').getBoundingClientRect();
    for (let i = 0; i < gr.length && out.length < 6; i++) { if ('.SLi'.includes(gr[i])) continue; const xy = t.hexXY(i); if (xy[0] < cv.left + 500 || xy[0] > cv.right - 500 || xy[1] < cv.top + 260 || xy[1] > cv.bottom - 200) continue; if (out.some(o => Math.hypot(o[0] - xy[0], o[1] - xy[1]) < 90)) continue; out.push(xy); } return out; });
  for (let k = 0; k < spots.length; k++) {
    const before = await H(A, () => MME.shell.cur.rt.test.vcount());
    for (let tries = 0; tries < 3; tries++) { await A.click('#ckind button[data-k="village"]'); await A.mouse.move(1000, 790); await A.waitForTimeout(350); await A.mouse.click(spots[k][0], spots[k][1]); await A.waitForTimeout(300); if (await H(A, () => MME.shell.cur.rt.test.vcount()) > before) break; await A.keyboard.press('Escape'); }
    await A.keyboard.type('v' + k); await A.keyboard.press('Enter'); await A.waitForTimeout(200); await A.keyboard.press('Escape');
  }
  await A.click('.setpick [data-eco="states"]'); await A.waitForTimeout(600); await A.click('#ecobody [data-a="snew"]'); await A.waitForTimeout(500);
  { const xs = spots.map(s => s[0]), ys = spots.map(s => s[1]), x0 = Math.min(...xs) - 60, x1 = Math.max(...xs) + 60; for (let y = Math.min(...ys) - 60; y <= Math.max(...ys) + 60; y += 14) { await A.mouse.move(x0, y); await A.mouse.down(); await A.mouse.move(x1, y, { steps: 18 }); await A.mouse.up(); } }
  await A.waitForTimeout(2500);
  const inState = await H(A, () => MME.shell.cur.rt.test.cities().filter(c => c.st !== '.').map(c => c.id));
  ok('the owner has a state holding communities', inState.length >= 3, inState.length);
  // the room
  await A.click('#roomOpen'); await A.waitForTimeout(200); if (await A.isVisible('#roomNameIn')) { await A.fill('#roomNameIn', 'เจ้าของ'); await A.keyboard.press('Enter'); }
  await A.waitForSelector('#roomPanel:not([hidden])', { timeout: 20000 }); const code = (await A.textContent('#roomCode')).trim();
  await B.bringToFront(); await B.waitForSelector('#joinBtn', { state: 'visible' }); await B.fill('#myName', 'บี'); await B.fill('#joinCode', code); await B.click('#joinBtn'); await ready(B); await B.waitForTimeout(1500);
  ok('a friend joins', await H(B, () => !!MME.shell.cur.rt));
  // the owner divides the state: the units reach the friend
  await A.bringToFront(); await A.click('#ecoTab [data-t="adm"]'); await A.waitForTimeout(500); await H(A, () => document.querySelector('[data-aa="build"]').click()); await A.waitForTimeout(500);
  const nA = await H(A, () => MME.shell.cur.rt.test.admCount());
  await B.waitForFunction(n => MME.shell.cur.rt.test.admCount() === n, nA, { timeout: 15000 }).catch(() => {});
  ok('units the owner made reach the friend', nA > 0 && (await H(B, () => MME.shell.cur.rt.test.admCount())) === nA, nA + ' / ' + await H(B, () => MME.shell.cur.rt.test.admCount()));
  // the friend puts one community under another; at the same moment the owner changes a good
  const pair = await H(B, ids => { const t = MME.shell.cur.rt.test, tops = t.adm().units.filter(u => u.t >= 1 && u.seat).map(u => u.seat);
    for (const y of ids) if (tops.includes(y)) for (const x of ids) if (x !== y && t.admBoss(x) !== y && !tops.includes(x)) return [x, y];
    for (const y of ids) for (const x of ids) if (x !== y && t.admBoss(x) !== y && !tops.includes(x)) return [x, y]; return [ids[0], ids[1]]; }, inState);
  const [x, y] = pair; console.log('pair', x, y);
  await B.bringToFront(); await H(B, id => MME.shell.cur.rt.test.pickCity(id), x); await B.waitForTimeout(400);
  await A.bringToFront(); await A.click('.setpick [data-eco="goods"]'); await A.waitForTimeout(500);
  await H(A, () => document.querySelectorAll('#ecobody [data-a="gsel"]')[2].click()); await A.waitForTimeout(300);
  const gid = await H(A, () => { const el = document.querySelector('#ecobody [data-f="pct"]'); el.value = 40; el.dispatchEvent(new Event('change', { bubbles: true })); return Object.keys(MME.shell.cur.rt.test.eco().goods)[0]; });
  console.log('A good right after', gid, JSON.stringify(await H(A, () => MME.shell.cur.rt.test.eco().goods)));
  console.log('B options', await H(B, () => [...document.querySelectorAll('#cfUp option')].map(o => o.value).join(','), y), 'want', y, 'note', await B.textContent('#cfUpNote'));
  await B.selectOption('#cfUp', y); await B.waitForTimeout(300); console.log('B toast', await B.textContent('#mtoast').catch(() => ''), await H(B, id => MME.shell.cur.rt.test.admBoss(id), x));
  await A.waitForTimeout(4000);
  const bossA = await H(A, id => MME.shell.cur.rt.test.admBoss(id), x), bossB = await H(B, id => MME.shell.cur.rt.test.admBoss(id), x);
  ok('the friend\'s choice of overlord reaches the owner', bossA === y && bossB === y, bossA + ' / ' + bossB);
  const gB = await H(B, g => (MME.shell.cur.rt.test.eco().goods[g] || {}).pct, gid), gA = await H(A, g => (MME.shell.cur.rt.test.eco().goods[g] || {}).pct, gid);
  ok('the owner\'s change to a good made at the same moment stands on both sides', gA === 0.4 && gB === 0.4, gA + ' / ' + gB);
  // typing on the friend's side while the owner changes the economy
  await B.bringToFront(); await B.click('.setpick [data-eco="goods"]'); await B.waitForTimeout(500);
  await H(B, () => document.querySelectorAll('#ecobody [data-a="gsel"]')[5].click()); await B.waitForTimeout(300);
  const nm = B.locator('#ecobody [data-f="name"]').first(); await nm.click(); await nm.press('End'); await B.keyboard.type(' กำลังพิมพ์', { delay: 20 });
  await H(A, () => { const els = document.querySelectorAll('#ecobody [data-f="pct"]'); const el = els[0]; el.value = 55; el.dispatchEvent(new Event('change', { bubbles: true })); });
  await B.waitForTimeout(3000);
  const typed = await H(B, () => { const a = document.activeElement; return { val: a && a.value, f: a && a.dataset ? a.dataset.f : '' }; });
  ok('text being typed survives a change heard from the room', /กำลังพิมพ์$/.test(typed.val || '') && typed.f === 'name', JSON.stringify(typed));
  const heard = await H(B, g => (MME.shell.cur.rt.test.eco().goods[g] || {}).pct, gid);
  ok('and the change was heard', heard === 0.55, heard);
  ok('no page errors', !errs.length, errs.join(' | '));
  await browser.close(); console.log(bad ? bad + ' failed' : 'all passed'); process.exit(bad ? 1 : 0);
})();
