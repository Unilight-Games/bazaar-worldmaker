// v0.18.3: one account leaves at most a set amount of copies (100 MB on the real page; a small line here), is told when a copy
// would go past it, keeps copies as JSON files and takes some away; the admin's statistics page; an admin stops an account's copies
const { chromium } = require('playwright');
const makeHubFake = require('./_fakehub.js');
const URL = 'http://localhost:8767/index.html', Q = 2000000;
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true }); const errs = [];
  const open = async (n, o) => { const p = await ctx.newPage(); p.on('pageerror', e => errs.push(n + ' PAGEERR ' + e.message)); await p.addInitScript('window.MME_CLOUD_QUOTA = ' + Q + '; window.MME_FIRE_FAKE = (' + makeHubFake.toString() + ')(' + JSON.stringify(o) + ');'); await p.goto(URL); await p.waitForSelector('#lib'); await p.waitForFunction(() => MME.hub && MME.hub.uid, null, { timeout: 20000 }); await p.waitForTimeout(600); return p; };
  const A = await open('A', { anonUid: 'anonAAAA1', uid: 'uAdminAAA', name: 'นน', signedIn: true, admin: true });
  const B = await open('B', { anonUid: 'anonBBBB1', uid: 'uBeeBBBBB', name: 'บี', signedIn: false });
  const t = (p, id) => p.evaluate(id => { const e = document.getElementById(id); return e && !e.hidden ? e.textContent : null; }, id);
  // B has already left an old copy that fills nearly all of its line
  await B.evaluate(q => { MME_FIRE_FAKE._put('bw/maps/anonBBBB1/old1', { d: JSON.stringify({ format: 'map-maker-engine', meta: { title: 'ของเก่า' } }), at: Date.now() - 86400000 }); MME_FIRE_FAKE._put('bw/mapix/anonBBBB1/old1', { title: 'ของเก่า', at: Date.now() - 86400000, size: q - 1000, cols: 10, rows: 10 }); }, Q);
  await B.click('[data-hub="cloudok"]'); await B.waitForTimeout(500);
  ok(/ฝากไว้ 1\.9 MB จาก 1\.9 MB/.test(await t(B, 'hubCloud') || ''), 'the menu shows how much of the line the account has used');
  await B.click('#newBtn'); await B.fill('#nmTitle', 'แผนที่ใหม่ของบี'); await B.click('#nmCreate');
  await B.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable, null, { timeout: 60000 }); await B.waitForTimeout(1500);
  await B.click('#mmBack'); await B.waitForTimeout(5000);
  const ix1 = await A.evaluate(() => MME_FIRE_FAKE._get('bw/mapix/anonBBBB1'));
  ok(Object.keys(ix1 || {}).length === 1, 'a copy that would go past the line is not sent');
  ok(await B.evaluate(() => !document.getElementById('cloudVeil').hidden && /พื้นที่ฝากเต็ม/.test(document.getElementById('cloudBody').textContent) && /แผนที่ใหม่ของบี/.test(document.getElementById('cloudBody').textContent)), 'the page says the space is full, names the map, and asks to keep JSON files and take others away');
  ok(/พื้นที่ฝากเต็ม/.test(await t(B, 'hubCloud') || ''), 'and the menu keeps saying so');
  let dl = B.waitForEvent('download'); await B.click('[data-hub="keepfull"]'); let f = await dl;
  const rd = async f => { try { return JSON.parse(require('fs').readFileSync(await f.path(), 'utf8')); } catch (e) { return null; } };   // headless Chrome here names a Thai file "download"
  let j = await rd(f); ok(j && j.format === 'map-maker-engine' && j.meta.title === 'แผนที่ใหม่ของบี', 'the map that did not go is kept as a JSON file');
  dl = B.waitForEvent('download'); await B.click('[data-hub="mykeep"][data-m="old1"]'); f = await dl;
  j = await rd(f); ok(j && j.meta && j.meta.title === 'ของเก่า', 'an old copy is kept as a JSON file too');
  ok(await B.evaluate(() => document.querySelector('[data-hub="retry"]').disabled), 'trying again waits until there is room');
  await B.click('[data-hub="mydel"][data-m="old1"]');
  ok(await B.evaluate(() => /กดอีกครั้ง/.test(document.querySelector('[data-hub="mydel"][data-m="old1"]').textContent)), 'taking a copy away asks once more');
  await B.click('[data-hub="mydel"][data-m="old1"]'); await B.waitForTimeout(600);
  ok(await A.evaluate(() => !MME_FIRE_FAKE._get('bw/maps/anonBBBB1/old1') && !MME_FIRE_FAKE._get('bw/mapix/anonBBBB1/old1')), 'the old copy is gone from the database');
  ok(await B.evaluate(() => MME.store.list().then(l => l.some(m => m.title === 'แผนที่ใหม่ของบี'))), 'the map in the library is untouched');
  await B.click('[data-hub="retry"]'); await B.waitForTimeout(1500);
  const ix2 = await A.evaluate(() => MME_FIRE_FAKE._get('bw/mapix/anonBBBB1'));
  ok(ix2 && Object.values(ix2).some(x => x.title === 'แผนที่ใหม่ของบี'), 'with room again, the copy goes');
  ok(await B.evaluate(() => !MME.hub.full && !/พื้นที่ฝากเต็ม/.test(document.getElementById('cloudBody').textContent)), 'and the warning goes away');
  await B.click('[data-hub="storeclose"]');
  // the admin's statistics page
  await A.click('#hubAdminBtn'); await A.waitForTimeout(1200);
  const s1 = await t(A, 'hubBo');
  ok(await A.evaluate(() => document.querySelector('#hubBoTabs [data-v="dash"]').getAttribute('aria-pressed') === 'true'), 'the back office opens on the statistics page');
  ok(/ออนไลน์ตอนนี้\s*2/.test(s1) && /วันนี้\s*2 คน/.test(s1) && /บัญชีที่เคยเข้า\s*2/.test(s1) && /แผนที่ที่ฝาก\s*1 ผืน/.test(s1), 'the tiles count people online, today, accounts and copies');
  ok(await A.evaluate(() => document.querySelectorAll('#hubBo svg.chart').length === 2 && document.querySelectorAll('#hubBo svg.chart')[0].querySelectorAll('.hit').length === 30 && document.querySelectorAll('#hubBo svg.chart')[1].querySelectorAll('.hit').length === 24), 'a chart of 30 days and a chart of 24 hours');
  ok(await A.evaluate(() => document.querySelectorAll('#hubBo svg.chart')[0].querySelectorAll('.bar').length >= 1), 'today has a bar');
  ok(await A.evaluate(() => document.querySelectorAll('#hubBo .hbars > div').length === 1 && /ผู้เยี่ยมชมไม่ระบุชื่อ/.test(document.querySelector('#hubBo .hbars').textContent)), 'the space each account uses');
  ok(/สำเนาแผนที่ใช้ราว/.test(s1) && /แผนฟรี/.test(s1), 'and how much of the free database the copies take');
  const box = await A.evaluate(() => { const r = document.querySelectorAll('#hubBo svg.chart')[0].querySelectorAll('.hit')[29].getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await A.mouse.move(box.x, box.y); await A.waitForTimeout(200);
  ok(await A.evaluate(() => !document.getElementById('hubTip').hidden && /เข้า \d+ ครั้ง/.test(document.getElementById('hubTip').textContent)), 'hovering a day tells its numbers');
  // an admin stops an account's copies
  await A.click('#hubBoTabs [data-v="maps"]'); await A.waitForTimeout(800);
  ok(/ที่ฝากของแต่ละบัญชี/.test(await t(A, 'hubBo')), 'the copies tab lists the space each account uses');
  await A.click('[data-hub="cloudban"][data-u="anonBBBB1"]'); await A.waitForTimeout(800);
  ok(/ห้ามฝาก/.test(await t(A, 'hubBo')) && await A.evaluate(() => MME_FIRE_FAKE._get('bw/cloudban/anonBBBB1') === true), 'the admin stops the account');
  ok(/ปิดการฝาก/.test(await t(B, 'hubCloud') || ''), 'the account is told');
  ok(await B.evaluate(async () => { try { await MME_FIRE_FAKE.hub.update({ 'bw/maps/anonBBBB1/x1': { d: '{}', at: '@now' } }); return false; } catch (e) { return true; } }), 'the rules refuse its copies');
  const k = await B.evaluate(() => Object.keys(MME_FIRE_FAKE._get('bw/mapix/anonBBBB1'))[0]);
  ok(await B.evaluate(async k => { try { await MME_FIRE_FAKE.hub.update({ ['bw/maps/anonBBBB1/' + k]: null, ['bw/mapix/anonBBBB1/' + k]: null }); return true; } catch (e) { return false; } }, k), 'but it may still take away what it left');
  ok(errs.length === 0, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await browser.close(); console.log(fails ? fails + ' FAILED' : 'ALL OK'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('FAILED', e.message.slice(0, 600)); process.exit(1); });
