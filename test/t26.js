// the room's people: the owner is told who comes, sees their state, sends them out, and shuts them out of the map for good
const { chromium } = require('playwright');
const URL = 'http://localhost:8765/index.html';
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1536, height: 700 } });
  const A = await ctx.newPage(), B = await ctx.newPage(); const errs = []; let bad = 0;
  const ok = (name, v, extra) => { if (!v) bad++; console.log((v ? 'ok   ' : 'FAIL ') + name + (extra != null ? ' | ' + extra : '')); };
  for (const [n, p] of [['A', A], ['B', B]]) { p.on('pageerror', e => errs.push(n + ' PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/fonts\.g|Failed to load resource/.test(m.text())) errs.push(n + ' CONSOLE ' + m.text()); }); }
  const ready = p => p.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable, null, { timeout: 60000 });
  const mapBox = p => p.evaluate(() => { const t = MME.shell.cur.rt.test, a = t.pt(0.3, 0.3), b = t.pt(0.7, 0.7); return { x: a[0], y: a[1], width: b[0] - a[0], height: b[1] - a[1] }; });
  for (const p of [A, B]) { await p.goto(URL); await p.waitForSelector('#lib'); await p.waitForTimeout(400); }
  await A.bringToFront(); await A.click('#newBtn'); await A.fill('#nmTitle', 'ห้องทดสอบคน'); await A.fill('#nmSeed', '4242'); await A.dispatchEvent('#nmSeed', 'input'); await A.waitForTimeout(300); await A.click('#nmCreate'); await ready(A); await A.waitForTimeout(600);
  const open = async () => { await A.bringToFront(); await A.click('#roomOpen'); await A.waitForTimeout(200); if (await A.isVisible('#roomNameIn')) { await A.fill('#roomNameIn', 'เจ้าของ'); await A.keyboard.press('Enter'); } await A.waitForSelector('#roomPanel:not([hidden])', { timeout: 20000 }); return (await A.textContent('#roomCode')).trim(); };
  const tryJoin = async (code, name) => { await B.bringToFront(); await B.waitForSelector('#joinBtn', { state: 'visible' }); await B.fill('#myName', name); await B.fill('#joinCode', code); await B.click('#joinBtn'); try { await B.waitForFunction(() => (MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable) || (!document.getElementById('joinBtn').disabled && !document.getElementById('mtoast').hidden), null, { timeout: 40000 }); } catch (e) { /* told below */ } return B.evaluate(() => ({ in: !!(MME.shell.cur && MME.shell.cur.rt), toast: document.getElementById('mtoast').hidden ? '' : document.getElementById('mtoast').textContent })); };
  let code = await open();
  ok('the room panel hangs over the screen as a panel of its own', await A.evaluate(() => getComputedStyle(document.getElementById('roomPanel')).position === 'absolute'));
  let j = await tryJoin(code, 'บี'); ok('a friend joins', j.in);
  await A.bringToFront(); await A.waitForFunction(() => document.querySelector('#roomPeople .pp'), null, { timeout: 15000 });
  const said = await A.evaluate(() => ({ log: document.getElementById('roomLog').textContent, toast: document.getElementById('mtoast').textContent, chip: document.getElementById('roomChipText').textContent }));
  ok('the owner is told who came in', /บี เข้าห้อง/.test(said.log) && /บี เข้าห้องแล้ว/.test(said.toast), said.log.replace(/\s+/g, ' ') + ' | chip: ' + said.chip);
  const row = () => A.evaluate(() => { const li = document.querySelector('#roomPeople .pp'); return li ? { text: li.textContent.replace(/\s+/g, ' ').trim(), look: !li.querySelector('[data-look]').disabled } : null; });
  ok('name and state on the list', /บี/.test((await row()).text) && /ดูอยู่/.test((await row()).text) && /เข้ามา \d\d:\d\d/.test((await row()).text), (await row()).text);
  // the friend takes up a tool and paints
  await B.bringToFront(); await B.click('#modes button[data-mode="terrain"]'); await B.click('#pal .sw[data-b="d"]'); const bb = await mapBox(B);
  await B.mouse.move(bb.x + bb.width, bb.y + bb.height); await B.waitForTimeout(250); await B.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await B.mouse.down(); bb.x += bb.width / 2; bb.y += bb.height / 2; for (let k = 1; k <= 6; k++) await B.mouse.move(bb.x + k * 9, bb.y + k * 4); await B.mouse.up(); await B.waitForTimeout(1800);
  await A.bringToFront(); await A.waitForFunction(() => /แก้ [1-9]/.test((document.querySelector('#roomPeople .pp') || {}).textContent || ''), null, { timeout: 15000 }).catch(() => {});
  const r2 = await row(); ok('the list follows what the friend does', /กำลังแก้/.test(r2.text) && /โหมดระบายภูมิประเทศ/.test(r2.text) && /แก้ [1-9]\d* ครั้ง/.test(r2.text), r2.text);
  const v0 = (await A.evaluate(() => MME.shell.cur.rt.state().view)).join(','); await A.click('#roomPeople [data-look]'); await A.waitForTimeout(300);
  ok('the owner is taken to where the friend points', r2.look && (await A.evaluate(() => MME.shell.cur.rt.state().view)).join(',') !== v0);
  // the chip folds the panel away and brings it back
  await A.click('#roomChip'); const shut = await A.isHidden('#roomPanel'); await A.click('#roomChip'); ok('the chip hides and shows the panel', shut && await A.isVisible('#roomPanel'));
  // kick: out of this room, back in the next
  await A.click('#roomPeople [data-kick]'); await B.waitForFunction(() => !MME.shell.cur, null, { timeout: 15000 });
  ok('kicked: the friend is out and told so', /ให้ออกจากห้อง/.test(await B.textContent('#mtoast')), (await B.textContent('#mtoast')).trim());
  // both pages are tabs of one browser here, so they share one library: the owner's map is in it once, and the room added nothing
  const lib = () => B.evaluate(async () => { const l = await MME.store.list(); return { same: l.filter(m => m.title === 'ห้องทดสอบคน').length, room: l.filter(m => /^room-/.test(m.id)).length }; });
  let L = await lib(); ok('kicked: the room left nothing in the library', L.same === 1 && L.room === 0, JSON.stringify(L));
  j = await tryJoin(code, 'บี'); ok('kicked: not let back into the same room', !j.in, j.toast);
  await A.bringToFront(); await A.waitForTimeout(600); ok('the owner hears of the knock', /พยายามเข้าห้อง/.test(await A.textContent('#roomLog')), (await A.textContent('#roomLog')).replace(/\s+/g, ' ').slice(0, 120));
  await A.click('#roomClose'); await A.waitForTimeout(500); code = await open();
  j = await tryJoin(code, 'บี'); ok('kicked: let into the next room', j.in);
  // ban: out of the map for good, until the owner says otherwise
  await A.bringToFront(); await A.waitForSelector('#roomPeople [data-ban]'); const at1 = await A.evaluate(() => { const r = document.querySelector('#roomPeople [data-ban]').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }); await A.mouse.click(at1[0], at1[1]); await A.waitForTimeout(150);
  ok('one press on ban only arms it', (await A.textContent('#roomPeople [data-ban]')).includes('ยืนยันแบน') && await B.evaluate(() => !!MME.shell.cur));
  ok('the armed button stays under the pointer', await A.evaluate(q => { const e = document.elementFromPoint(q[0], q[1]); return !!e && e.matches('[data-ban]'); }, at1));
  await A.mouse.click(at1[0], at1[1]); await B.waitForFunction(() => !MME.shell.cur, null, { timeout: 15000 });
  ok('banned: the friend is out and told why', /แบน/.test(await B.textContent('#mtoast')), (await B.textContent('#mtoast')).trim());
  const bans = await A.evaluate(() => ({ meta: (MME.shell.cur.meta.bans || []).map(b => b.name + ' ' + b.k.slice(0, 2)), room: document.getElementById('roomBans').textContent, card: document.getElementById('setBans').textContent }));
  ok('banned: written on the map and shown to the owner', bans.meta.length === 1 && /บี/.test(bans.room) && /ปลดแบน/.test(bans.card), JSON.stringify(bans.meta));
  j = await tryJoin(code, 'บี'); ok('banned: not let back in', !j.in, j.toast);
  await A.bringToFront(); await A.click('#roomClose'); await A.waitForTimeout(500);
  ok('banned: kept in the library record', await A.evaluate(async () => ((await MME.store.getMeta(MME.shell.cur.meta.id)).bans || []).length === 1));
  code = await open(); j = await tryJoin(code, 'บี ชื่อใหม่'); ok('banned: not let into a later room either, under another name', !j.in, j.toast);
  const file = await A.evaluate(async () => { const f = await MME.store.exportMap(MME.shell.cur.meta.id); return { bans: 'bans' in f.meta, owner: 'owner' in f.meta }; });
  ok('the ban list does not travel in an exported file', !file.bans && !file.owner);
  await A.bringToFront(); await A.click('#roomBans [data-unban]'); await A.waitForTimeout(400);
  ok('unban clears the map\'s list', await A.evaluate(() => !MME.shell.cur.meta.bans && document.getElementById('roomBans').hidden));
  j = await tryJoin(code, 'บี'); ok('unbanned: let in again', j.in);
  // the owner leaves: everyone is out, and the friend keeps nothing
  await A.bringToFront(); await A.click('#roomClose'); await B.waitForFunction(() => !MME.shell.cur, null, { timeout: 15000 });
  L = await lib(); ok('room closed: the room left nothing in the library', L.same === 1 && L.room === 0, JSON.stringify(L));
  console.log('errors', errs.length + bad, errs.slice(0, 4).join(' | '));
  await browser.close();
})().catch(e => { console.error('TEST FAILED', e.message.slice(0, 900)); process.exit(1); });
