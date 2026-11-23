const { chromium } = require('./_fit');
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  const A = await ctx.newPage(), B = await ctx.newPage(); const errs = [];
  for (const [n, p] of [['A', A], ['B', B]]) { p.on('pageerror', e => errs.push(n + ' PAGEERR ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n'))); p.on('console', m => { if (m.type() === 'error' && !/fonts\.g|Failed to load resource/.test(m.text())) errs.push(n + ' CONSOLE ' + m.text()); }); }
  const st = p => p.evaluate(() => MME.shell.cur && MME.shell.cur.rt ? MME.shell.cur.rt.state() : null);
  const ready = p => p.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable, null, { timeout: 40000 });
  await A.goto('http://localhost:8765/index.html?fit=0'); await A.waitForSelector('.mapcard');
  await B.goto('http://localhost:8765/index.html?fit=0'); await B.waitForSelector('.mapcard');
  await A.click('#newBtn'); await A.fill('#nmTitle', 'ห้องทดสอบ'); await A.waitForTimeout(300); await A.click('#nmCreate'); await ready(A); await A.waitForTimeout(700);
  await A.click('#roomOpen'); await A.waitForTimeout(200); await A.fill('#roomNameIn', 'เจ้าของ'); await A.keyboard.press('Enter');
  await A.waitForSelector('#roomPanel:not([hidden])', { timeout: 15000 }); const code = (await A.textContent('#roomCode')).trim(); console.log('room code', code, '|', await A.textContent('#roomChipText'));
  await B.fill('#myName', 'เพื่อน'); await B.fill('#joinCode', code); let t0 = Date.now(); await B.click('#joinBtn'); await ready(B); console.log('B joined ms', Date.now() - t0);
  await B.waitForTimeout(1200);
  let a = await st(A), b = await st(B); console.log('A', a.land, a.rivers, a.status, '| B', b.land, b.rivers, b.status);
  console.log('people A:', await A.textContent('#roomPeople'), '| B:', await B.textContent('#roomPeople'), '| B back btn:', await B.textContent('#mmBack'));
  // B paints land on the sea in the corner
  await B.bringToFront(); await B.click('#modes button[data-mode="terrain"]'); await B.click('#pal .sw[data-b="g"]');
  const box = await B.locator('#map').boundingBox();
  await B.mouse.move(box.x + 40, box.y + 80); await B.mouse.down(); for (let k = 0; k < 12; k++) await B.mouse.move(box.x + 40 + k * 8, box.y + 80 + k * 3); await B.mouse.up();
  await B.waitForTimeout(2500); a = await st(A); b = await st(B); console.log('after B paints: A land', a.land, 'B land', b.land, a.land === b.land ? 'SYNC OK' : 'MISMATCH');
  // A paints elsewhere at the same time as B
  await A.bringToFront(); await A.click('#modes button[data-mode="terrain"]'); await A.click('#pal .sw[data-b="d"]');
  const boxA = await A.locator('#map').boundingBox();
  await A.mouse.move(boxA.x + 900, boxA.y + 60); await A.mouse.down(); await B.bringToFront(); await B.mouse.move(box.x + 60, box.y + 600); await B.mouse.down();
  for (let k = 0; k < 10; k++) { await A.mouse.move(boxA.x + 900 - k * 6, boxA.y + 60 + k * 4); await B.mouse.move(box.x + 60 + k * 7, box.y + 600 - k * 2); }
  await A.mouse.up(); await B.mouse.up(); await B.waitForTimeout(3000); a = await st(A); b = await st(B); console.log('both paint: A land', a.land, 'B land', b.land, a.land === b.land ? 'SYNC OK' : 'MISMATCH');
  // A lays rivers automatically, B sees them
  await A.bringToFront(); await A.click('#modes button[data-mode="river"]'); await A.click('#autoRiv'); await A.waitForTimeout(6000); a = await st(A); b = await st(B); console.log('rivers A', a.rivers, 'B', b.rivers, a.rivers === b.rivers ? 'SYNC OK' : 'MISMATCH');
  // B places a city, A sees it
  await B.bringToFront(); await B.click('#modes button[data-mode="city"]'); await B.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5); await B.mouse.down(); await B.mouse.up(); await B.waitForTimeout(300); await B.fill('#cfName', 'เมืองของเพื่อน'); await B.keyboard.press('Enter'); await B.keyboard.press('Escape');
  await B.waitForTimeout(2500); a = await st(A); b = await st(B); console.log('cities A', a.cities, 'B', b.cities, a.cities === b.cities && b.cities > 0 ? 'SYNC OK' : 'MISMATCH');
  const hashes = p => p.evaluate(() => MME.DOCKEYS.map(k => MME.sync.hash(k, MME.shell.cur.db.known(k))).join(' '));
  console.log('hash A', await hashes(A)); console.log('hash B', await hashes(B));
  await A.screenshot({ path: 'shots/20-host.png' }); await B.screenshot({ path: 'shots/21-guest.png' });
  // the owner leaves the map: the guest is put out, and keeps nothing
  await A.bringToFront(); await A.click('#mmBack'); await A.waitForSelector('.mapcard');
  await B.waitForSelector('#menu:not([hidden])', { timeout: 15000 }); console.log('B kicked:', await B.textContent('#mtoast'));
  console.log('B library', await B.evaluate(async () => (await MME.store.list()).map(m => m.id.slice(0, 5) + ':' + m.title)));
  // reopening: what the owner has is what both made
  await A.click('.mapcard [data-act="open"]'); await ready(A); await A.waitForTimeout(800); const a2 = await st(A); console.log('owner reopened: land', a2.land, 'rivers', a2.rivers, 'cities', a2.cities, a2.land === a.land && a2.rivers === a.rivers && a2.cities === a.cities ? 'PERSIST OK' : 'LOST');
  // close-room button
  await A.click('#roomOpen'); await A.waitForSelector('#roomPanel:not([hidden])'); const code2 = (await A.textContent('#roomCode')).trim();
  await B.fill('#joinCode', code2); await B.click('#joinBtn'); await ready(B); await A.click('#roomClose'); await B.waitForSelector('#menu:not([hidden])', { timeout: 15000 }); console.log('room closed -> B:', await B.textContent('#mtoast'));
  await A.click('#roomOpen'); await A.waitForSelector('#roomPanel:not([hidden])'); const code3 = (await A.textContent('#roomCode')).trim(); console.log('restore button hidden while room open:', await A.isHidden('#setRestore'));
  await B.fill('#joinCode', code3.slice(0, 7) + (code3.endsWith('AAAA') ? 'BBBB' : 'AAAA')); await B.click('#joinBtn'); await B.waitForFunction(() => /ไม่พบห้อง/.test(document.getElementById('mtoast').textContent), null, { timeout: 20000 }); console.log('wrong code:', await B.textContent('#mtoast'));
  await A.click('#roomClose'); await A.waitForTimeout(300); console.log('restore button shown after room:', await A.isVisible('#setRestore'));
  const before = (await st(A)).cities; await A.click('#setRestore'); await A.click('#setRestore'); await ready(A); await A.waitForTimeout(600); console.log('restored: cities', before, '->', (await st(A)).cities, await A.textContent('#mtoast'));
  console.log('ERRORS', errs.length); for (const e of errs.slice(0, 10)) console.log(e);
  await browser.close();
})().catch(e => { console.error('TEST FAILED', e.message.slice(0, 900)); process.exit(1); });
