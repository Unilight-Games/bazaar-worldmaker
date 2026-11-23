// the page on its own address: Google sign-in and rooms over Firebase, with a stand-in for the server (see _fakefire.js)
const { chromium } = require('playwright');
const makeFake = require('./_fakefire.js');
const URL = 'http://localhost:8767/index.html';
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1536, height: 700 } });
  const errs = []; let bad = 0;
  const ok = (name, v, extra) => { if (!v) bad++; console.log((v ? 'ok   ' : 'FAIL ') + name + (extra != null ? ' | ' + extra : '')); };
  const open = async (n, o) => { const p = await ctx.newPage(); p.on('pageerror', e => errs.push(n + ' PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/fonts\.g|Failed to load resource/.test(m.text())) errs.push(n + ' CONSOLE ' + m.text()); }); await p.addInitScript('window.MME_FIRE_FAKE = (' + makeFake.toString() + ')(' + JSON.stringify(o) + ');'); await p.goto(URL); await p.waitForSelector('#lib'); await p.waitForFunction(() => document.getElementById('libCount').textContent && !document.getElementById('acct').hidden); await p.waitForTimeout(300); return p; };
  const ready = p => p.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable, null, { timeout: 60000 });
  const mapBox = p => p.evaluate(() => { const t = MME.shell.cur.rt.test, a = t.pt(0.35, 0.35), b = t.pt(0.65, 0.65); return { x: a[0], y: a[1], width: b[0] - a[0], height: b[1] - a[1] }; });
  const A = await open('A', { uid: 'uOwnerAAAA', name: 'เจ้าของบ้าน', signedIn: true }), B = await open('B', { uid: 'uFriendBBB', name: 'เพื่อนบี', signedIn: false });
  ok('the build for the web carries no Gresland', (await A.evaluate(() => [...document.querySelectorAll('.mapcard')].length)) === 0 && await A.evaluate(() => window.MME_NO_GRESLAND === true && window.MME_BUILD === 'web'));
  ok('the menu shows who is signed in', /เข้าสู่ระบบแล้ว/.test(await A.textContent('#acctWho')) && /เจ้าของบ้าน/.test(await A.textContent('#acctWho')) && (await A.textContent('#acctBtn')).includes('ออกจากระบบ'));
  ok('and offers Google to who is not', /บัญชี Google/.test(await B.textContent('#acctWho')) && (await B.textContent('#acctBtn')).includes('เข้าสู่ระบบด้วย Google'));
  ok('the name to show is taken from the account when none was typed', (await A.inputValue('#myName')) === 'เจ้าของบ้าน');
  await A.bringToFront(); await A.click('#newBtn'); await A.fill('#nmTitle', 'ห้องบนเว็บ'); await A.fill('#nmSeed', '777'); await A.dispatchEvent('#nmSeed', 'input'); await A.waitForTimeout(300); await A.click('#nmCreate'); await ready(A); await A.waitForTimeout(500);
  ok('a new map belongs to the account', await A.evaluate(() => MME.shell.cur.meta.owner === 'uOwnerAAAA'));
  await A.click('#roomOpen'); await A.waitForSelector('#roomPanel:not([hidden])', { timeout: 20000 }); const code = (await A.textContent('#roomCode')).trim();
  ok('the room is an online one and says friends sign in', await A.evaluate(() => MME.shell.cur.online === true) && /เข้าสู่ระบบด้วย Google/.test(await A.textContent('#roomWhere')), code);
  // the friend: not signed in, so joining signs them in first
  const join = async (name) => { await B.bringToFront(); await B.waitForSelector('#joinBtn', { state: 'visible' }); await B.fill('#myName', name); await B.fill('#joinCode', code); await B.click('#joinBtn'); try { await B.waitForFunction(() => (MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable) || (!document.getElementById('joinBtn').disabled && !document.getElementById('mtoast').hidden), null, { timeout: 40000 }); } catch (e) { /* told below */ } return B.evaluate(() => ({ in: !!(MME.shell.cur && MME.shell.cur.rt), toast: document.getElementById('mtoast').hidden ? '' : document.getElementById('mtoast').textContent })); };
  let j = await join('บี'); ok('joining signs the friend in and lets them in', j.in && await B.evaluate(() => MME.fire.user && MME.fire.user.id === 'uFriendBBB'), j.toast);
  await A.bringToFront(); await A.waitForFunction(() => document.querySelector('#roomPeople .pp'), null, { timeout: 15000 });
  const row = () => A.evaluate(() => (document.querySelector('#roomPeople .pp') || { textContent: '' }).textContent.replace(/\s+/g, ' ').trim());
  ok('the owner sees the friend, known by account', /บี/.test(await row()) && /มีบัญชีให้ระบบจำ/.test(await row()) && /บี เข้าห้อง/.test(await A.textContent('#roomLog')), await row());
  const st = p => p.evaluate(() => MME.shell.cur.rt.state()); const land0 = (await st(A)).land;
  ok('the friend got the same map', land0 === (await st(B)).land && land0 > 0, 'land ' + land0);
  // both paint; each sees the other's work
  const paint = async (p, sw, dx) => { await p.bringToFront(); await p.click('#modes button[data-mode="terrain"]'); await p.click('#pal .sw[data-b="' + sw + '"]'); const bb = await mapBox(p); await p.mouse.move(bb.x + bb.width, bb.y + bb.height); await p.waitForTimeout(200); await p.mouse.move(bb.x + dx, bb.y + 20); await p.mouse.down(); for (let k = 1; k <= 6; k++) await p.mouse.move(bb.x + dx + k * 8, bb.y + 20 + k * 5); await p.mouse.up(); await p.waitForTimeout(1500); };
  const h0 = await A.evaluate(() => MME.DOCKEYS.map(k => MME.sync.hash(k, MME.shell.cur.db.known(k))).join(' '));
  await paint(B, 'd', 40); await paint(A, 'f', 160);
  const hashes = p => p.evaluate(() => MME.shell.cur ? MME.DOCKEYS.map(k => MME.sync.hash(k, MME.shell.cur.db.known(k))).join(' ') : 'out');
  const same = async ms => { const t0 = Date.now(); for (;;) { const a = await hashes(A), b = await hashes(B); if (a === b && a !== 'out') return true; if (Date.now() - t0 > ms) return false; await A.waitForTimeout(400); } };
  ok('work done on either side reaches the other', await same(20000) && (await hashes(A)) !== h0, 'the owner\'s list: ' + await row());
  // ban holds by account
  await A.bringToFront(); const at = await A.evaluate(() => { const r = document.querySelector('#roomPeople [data-ban]').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }); await A.mouse.click(at[0], at[1]); await A.waitForTimeout(150); await A.mouse.click(at[0], at[1]);
  await B.waitForFunction(() => !MME.shell.cur, null, { timeout: 15000 });
  ok('a ban names the friend by account', await A.evaluate(() => (MME.shell.cur.meta.bans || []).map(b => b.k).join() === 'u:uFriendBBB'));
  j = await join('ชื่อใหม่'); ok('and the banned account is not let back in', !j.in, j.toast);
  // the library is each account's own, on one browser
  const lib = p => p.evaluate(async () => ({ shown: (await MME.store.list()).map(m => m.title), hidden: MME.store.hidden, note: (document.getElementById('libHidden') || { textContent: '' }).textContent }));
  await B.bringToFront(); await B.reload(); await B.waitForSelector('#lib'); await B.waitForFunction(() => !document.getElementById('acct').hidden); await B.waitForTimeout(500);
  let L = await lib(B); ok('a visitor who is not signed in does not see an account\'s map', L.shown.length === 0 && L.hidden === 1 && /เข้าสู่ระบบ/.test(L.note), JSON.stringify(L));
  await B.click('#acctBtn'); await B.waitForTimeout(500); L = await lib(B);
  ok('nor does another account', L.shown.length === 0 && L.hidden === 1 && /บัญชีอื่น/.test(L.note), JSON.stringify(L));
  // closing the room leaves nothing of it on the server
  await A.bringToFront(); await A.click('#roomClose'); await A.waitForTimeout(1200);
  const left = await A.evaluate(() => MME_FIRE_FAKE._tree().filter(k => !/\/in\/uFriendBBB_/.test(k)));
  ok('closing the room clears what the owner put on the server', left.length === 0, left.slice(0, 4).join(' ; '));
  const denied = [...(await A.evaluate(() => window.__fakeDenied || [])), ...(await B.evaluate(() => window.__fakeDenied || []))];
  ok('nothing the pages tried was against the rules', denied.length === 0, denied.slice(0, 3).join(' ; '));
  console.log('errors', errs.length + bad, errs.slice(0, 4).join(' | '));
  await browser.close();
})().catch(e => { console.error('TEST FAILED', e.message.slice(0, 900)); process.exit(1); });
