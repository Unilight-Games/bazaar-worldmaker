// A map drawn on Gresland leaves a page that carries Gresland as a file, and opens on the page that does not (the one on GitHub):
// the file brings the ground along, a copy and a room hand it on, and a file without it is refused in words.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), os = require('os');
const makeFake = require('./_fakefire.js');
const FULL = 'http://localhost:8765/index.html', WEB = 'http://localhost:8767/index.html';
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const errs = []; let bad = 0;
  const ok = (name, v, extra) => { if (!v) bad++; console.log((v ? 'ok   ' : 'FAIL ') + name + (extra != null ? ' | ' + extra : '')); };
  const watch = (p, n) => { p.on('pageerror', e => errs.push(n + ' PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/fonts\.g|Failed to load resource/.test(m.text())) errs.push(n + ' CONSOLE ' + m.text()); }); };
  const ready = p => p.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable, null, { timeout: 90000 });
  const st = p => p.evaluate(() => { const s = MME.shell.cur.rt.state(); return { land: s.land, cities: s.cities, rivers: s.rivers }; });
  const hashes = p => p.evaluate(() => MME.shell.cur ? MME.DOCKEYS.map(k => MME.sync.hash(k, MME.shell.cur.db.known(k))).join(' ') : 'out');
  const toastOf = p => p.evaluate(() => document.getElementById('mtoast').hidden ? '' : document.getElementById('mtoast').textContent);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 't29-'));

  // ---- the page that carries Gresland: the file it writes
  const c1 = await browser.newContext({ viewport: { width: 1536, height: 700 }, acceptDownloads: true });
  const F = await c1.newPage(); watch(F, 'F'); await F.goto(FULL); await F.waitForSelector('.mapcard[data-id="gresland"]', { timeout: 60000 });
  await F.click('.mapcard[data-id="gresland"] [data-act="open"]'); await ready(F); const want = await st(F); const wantH = await hashes(F);
  await F.evaluate(() => MME.shell.closeMap('')); await F.waitForSelector('.mapcard[data-id="gresland"]');
  const [dl] = await Promise.all([F.waitForEvent('download'), F.click('.mapcard[data-id="gresland"] [data-act="export"]')]);
  const file = path.join(tmp, 'gresland.mapmaker.json'); await dl.saveAs(file);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  ok('the file of a Gresland map carries its ground', !!(data.base && typeof data.base.img === 'string' && data.base.img.length > 100000 && data.base.G && data.base.D && data.base.D.biome.length === 159 * 104), 'file ' + Math.round(fs.statSync(file).size / 1024) + ' KB');
  ok('and nothing of the page is kept beside the map there', await F.evaluate(async () => (await MME.store.getDoc('gresland', '@base')) == null));
  const bare = path.join(tmp, 'old.mapmaker.json'); { const o = JSON.parse(JSON.stringify(data)); delete o.base; fs.writeFileSync(bare, JSON.stringify(o)); }
  await c1.close();

  // ---- the page without Gresland
  const ctx = await browser.newContext({ viewport: { width: 1536, height: 700 }, acceptDownloads: true });
  const open = async (n, o) => { const p = await ctx.newPage(); watch(p, n); await p.addInitScript('window.MME_FIRE_FAKE = (' + makeFake.toString() + ')(' + JSON.stringify(o) + ');'); await p.goto(WEB); await p.waitForSelector('#lib'); await p.waitForFunction(() => document.getElementById('libCount').textContent && !document.getElementById('acct').hidden); await p.waitForTimeout(300); return p; };
  const A = await open('A', { uid: 'uOwnerAAAA', name: 'เจ้าของบ้าน', signedIn: true });
  await A.setInputFiles('#impFile', bare); await A.waitForFunction(() => !document.getElementById('mtoast').hidden, null, { timeout: 20000 });
  ok('a file without the ground is refused, and the words say what to do', /ไม่มีพื้นแผนที่/.test(await toastOf(A)) && /0\.8\.2/.test(await toastOf(A)) && (await A.locator('.mapcard').count()) === 0, (await toastOf(A)).slice(0, 60));
  await A.setInputFiles('#impFile', file); await A.waitForSelector('.mapcard', { timeout: 30000 });
  const id = await A.getAttribute('.mapcard', 'data-id');
  await A.click('.mapcard [data-act="open"]'); await ready(A); const got = await st(A);
  ok('the file with its ground opens on the page without Gresland', got.land === want.land && got.cities === want.cities && got.rivers === want.rivers && (await hashes(A)) === wantH, JSON.stringify(got));
  ok('the drawn picture came along', await A.evaluate(async id => { const b = await MME.store.getDoc(id, '@base'); return !!b && b.img.length > 100000; }, id) && !(await A.evaluate(() => document.getElementById('mapscreen').classList.contains('blank'))));

  // a room: the friend's page has no ground either, and gets it from the owner
  await A.click('#roomOpen'); await A.waitForSelector('#roomPanel:not([hidden])', { timeout: 20000 }); const code = (await A.textContent('#roomCode')).trim();
  const B = await open('B', { uid: 'uFriendBBB', name: 'เพื่อนบี', signedIn: true });
  await B.fill('#myName', 'บี'); await B.fill('#joinCode', code); const t0 = Date.now(); await B.click('#joinBtn');
  try { await B.waitForFunction(() => (MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable) || (!document.getElementById('joinBtn').disabled && !document.getElementById('mtoast').hidden), null, { timeout: 90000 }); } catch (e) { /* told below */ }
  const inRoom = await B.evaluate(() => !!(MME.shell.cur && MME.shell.cur.rt));
  ok('a friend without the ground gets it from the owner and sees the same map', inRoom && (await st(B)).land === want.land && (await hashes(B)) === (await hashes(A)), inRoom ? (Date.now() - t0) + ' ms' : await toastOf(B));
  if (inRoom) {
    const box = await B.evaluate(() => { const t = MME.shell.cur.rt.test, a = t.pt(0.45, 0.45), b = t.pt(0.55, 0.55); return { x: a[0], y: a[1], w: b[0] - a[0], h: b[1] - a[1] }; });
    const h0 = await hashes(A);
    await B.bringToFront(); await B.click('#modes button[data-mode="terrain"]'); await B.click('#pal .sw[data-b="d"]'); await B.mouse.move(box.x + 10, box.y + 10); await B.mouse.down(); for (let k = 1; k <= 6; k++) await B.mouse.move(box.x + 10 + k * 12, box.y + 14); await B.mouse.up();
    let same = false; for (let n = 0; n < 50 && !same; n++) { await A.waitForTimeout(400); const a = await hashes(A); same = a === await hashes(B) && a !== h0; }
    ok('and the friend\'s work reaches the owner', same);
    await A.bringToFront(); await A.evaluate(() => [...document.querySelectorAll('button')].find(x => x.innerText.trim() === 'ปิดห้อง').click());
    await B.waitForFunction(() => !MME.shell.cur, null, { timeout: 20000 });
    ok('the friend keeps nothing of it: no map and no ground', (await B.locator('.mapcard').count()) === 0 && await B.evaluate(async () => { const db = await new Promise((res, rej) => { const o = indexedDB.open('map-maker-engine'); o.onsuccess = () => res(o.result); o.onerror = () => rej(o.error); }); const keys = await new Promise(res => { const r = db.transaction('docs').objectStore('docs').getAllKeys(); r.onsuccess = () => res(r.result); }); db.close(); return keys.filter(k => /@base$/.test(k)).length; }) <= 1);
  }
  // a copy and a file from this page carry the ground on
  await A.bringToFront(); await A.evaluate(() => MME.shell.closeMap('')); await A.waitForSelector('.mapcard');
  await A.click('.mapcard[data-id="' + id + '"] [data-act="copy"]'); await A.waitForFunction(() => document.querySelectorAll('.mapcard').length === 2, null, { timeout: 30000 });
  const id2 = await A.evaluate(id => [...document.querySelectorAll('.mapcard')].map(c => c.dataset.id).find(x => x !== id), id);
  await A.click('.mapcard[data-id="' + id2 + '"] [data-act="open"]'); await ready(A);
  ok('a copy made on this page opens', (await st(A)).cities === want.cities);
  await A.evaluate(() => MME.shell.closeMap('')); await A.waitForSelector('.mapcard');
  const [dl2] = await Promise.all([A.waitForEvent('download'), A.click('.mapcard[data-id="' + id2 + '"] [data-act="export"]')]);
  const file2 = path.join(tmp, 'again.mapmaker.json'); await dl2.saveAs(file2);
  ok('a file written by this page carries the ground too', (() => { const o = JSON.parse(fs.readFileSync(file2, 'utf8')); return !!(o.base && o.base.img.length > 100000); })());
  // deleting the map takes its ground away
  const del = async mid => { const b = A.locator('.mapcard[data-id="' + mid + '"] [data-act="del"]'); await b.click(); await A.waitForTimeout(200); await A.locator('.mapcard[data-id="' + mid + '"] [data-act="del"]').click(); await A.waitForFunction(m => !document.querySelector('.mapcard[data-id="' + m + '"]'), mid, { timeout: 15000 }); };
  await del(id2);
  ok('deleting a map deletes its ground', await A.evaluate(async ([a, b]) => (await MME.store.getDoc(b, '@base')) == null && (await MME.store.getDoc(a, '@base')) != null, [id, id2]));
  const denied = [...(await A.evaluate(() => window.__fakeDenied || [])), ...(await B.evaluate(() => window.__fakeDenied || []))];
  ok('nothing the pages tried was against the rules', denied.length === 0, denied.slice(0, 3).join(' ; '));
  console.log('errors', errs.length + bad, errs.slice(0, 4).join(' | '));
  await browser.close();
})().catch(e => { console.error('TEST FAILED', e.message.slice(0, 900)); process.exit(1); });
