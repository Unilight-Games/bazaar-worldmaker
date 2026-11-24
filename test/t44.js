// v0.18.0: people online, the public chat that empties at midnight, copies of maps sent when their owner leaves them, and the
// back office that only the owner's account sees
const { chromium } = require('playwright');
const makeHubFake = require('./_fakehub.js');
const URL = 'http://localhost:8767/index.html';
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const errs = [];
  const open = async (n, o) => { const p = await ctx.newPage(); p.on('pageerror', e => errs.push(n + ' PAGEERR ' + e.message)); await p.addInitScript('window.MME_FIRE_FAKE = (' + makeHubFake.toString() + ')(' + JSON.stringify(o) + ');'); await p.goto(URL); await p.waitForSelector('#lib'); await p.waitForFunction(() => MME.hub && MME.hub.uid, null, { timeout: 20000 }); await p.waitForTimeout(600); return p; };
  const A = await open('A', { anonUid: 'anonAAAA1', uid: 'uAdminAAA', name: 'นน', signedIn: true, admin: true });
  const B = await open('B', { anonUid: 'anonBBBB1', uid: 'uBeeBBBBB', name: 'บี', signedIn: false });
  await A.waitForTimeout(800);
  const t = (p, id) => p.evaluate(id => { const e = document.getElementById(id); return e && !e.hidden ? e.textContent : null; }, id);
  ok(/ออนไลน์ 2 คน/.test(await t(A, 'hubOnline') || '') && /ออนไลน์ 2 คน/.test(await t(B, 'hubOnline') || ''), 'both pages count two people online, the one without a name too');
  ok(await A.evaluate(() => !document.getElementById('hubMsg').disabled) && await B.evaluate(() => document.getElementById('hubMsg').disabled), 'only the page signed in with Google can type in the chat');
  // the chat
  await A.fill('#hubMsg', 'สวัสดีทุกคน'); await A.keyboard.press('Enter'); await A.waitForTimeout(500);
  ok(/สวัสดีทุกคน/.test(await t(B, 'hubList') || ''), 'a line said on one page shows on the other');
  await A.fill('#hubMsg', 'ซ้ำเร็วเกินไป'); await A.click('#hubSend'); await A.waitForTimeout(400);
  ok(!/ซ้ำเร็วเกินไป/.test(await t(B, 'hubList') || ''), 'a second line within three seconds is refused');
  await A.waitForTimeout(3000); await A.click('#hubSend'); await A.waitForTimeout(500);
  ok(/ซ้ำเร็วเกินไป/.test(await t(B, 'hubList') || ''), 'after three seconds it goes');
  // what was said before midnight
  await A.evaluate(() => MME_FIRE_FAKE._put('bw/chat/old1', { u: 'uAdminAAA', n: 'นน', m: 'ข้อความเมื่อวาน', t: Date.now() - ((Date.now() + 25200000) % 86400000) - 60000 }));
  await A.waitForTimeout(300);
  ok(!/ข้อความเมื่อวาน/.test(await t(A, 'hubList') || ''), 'a line from before midnight is not shown');
  await B.reload(); await B.waitForFunction(() => MME.hub && MME.hub.uid, null, { timeout: 20000 }); await B.waitForTimeout(1200);
  ok(await A.evaluate(() => !MME_FIRE_FAKE._get('bw/chat/old1')), 'and the next page to come clears it from the database');
  // the back office
  ok(await A.evaluate(() => !document.getElementById('hubAdminBtn').hidden) && await B.evaluate(() => document.getElementById('hubAdminBtn').hidden), 'the back office button shows on the admin\'s page alone');
  ok(/uAdminAAA/.test(await t(A, 'acctId') || ''), 'a signed-in account sees its own id, to make itself the admin');
  await A.click('#hubAdminBtn'); await A.waitForTimeout(600); await A.click('#hubBoTabs [data-v="on"]'); await A.waitForTimeout(600);
  const on1 = await t(A, 'hubBo');
  ok(/ออนไลน์ตอนนี้ 2/.test(on1) && /ผู้เยี่ยมชมไม่ระบุชื่อ/.test(on1) && /นน/.test(on1) && /หน้าเมนู/.test(on1), 'the back office lists who is online and where on the page');
  ok(await B.evaluate(async () => { try { await MME_FIRE_FAKE.hub.get('bw/who'); return false; } catch (e) { return true; } }), 'a visitor cannot read the back office lists');
  // a copy of a map: told first, never while it is open, sent when its owner leaves it
  ok(await B.evaluate(() => !document.getElementById('hubNote').hidden), 'the visitor is told about copies before any is sent');
  await B.click('[data-hub="cloudok"]');
  await B.click('#newBtn'); await B.fill('#nmTitle', 'แผนที่ของบี'); await B.click('#nmCreate');
  await B.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable, null, { timeout: 60000 }); await B.waitForTimeout(4500);
  const on2 = await t(A, 'hubBo');
  ok(/กำลังแก้แผนที่/.test(on2) && !/แผนที่ของบี/.test(on2), 'the back office sees that someone is making a map, not which');
  ok(await A.evaluate(() => !MME_FIRE_FAKE._get('bw/mapix/anonBBBB1')), 'no copy is sent while the map is open');
  await B.click('#mmBack'); await B.waitForTimeout(5000);
  const ix = await A.evaluate(() => MME_FIRE_FAKE._get('bw/mapix/anonBBBB1'));
  ok(ix && Object.values(ix).some(x => x.title === 'แผนที่ของบี' && x.size > 1000), 'leaving the map sends its copy');
  await A.click('#hubBoTabs [data-v="maps"]'); await A.waitForTimeout(600);
  ok(/แผนที่ของบี/.test(await t(A, 'hubBo')) && await A.evaluate(() => !!document.querySelector('#hubBo [data-hub="dl"]')), 'the back office lists the copy and offers it to download');
  const d = await A.evaluate(async () => { const m = MME_FIRE_FAKE._get('bw/maps/anonBBBB1'); const x = Object.values(m)[0]; return JSON.parse(x.d); });
  ok(d && d.format === 'map-maker-engine' && d.meta.title === 'แผนที่ของบี', 'the copy is the map\'s own file, which the page can import');
  await A.click('#hubBoTabs [data-v="stat"]'); await A.waitForTimeout(600);
  const st = await t(A, 'hubBo');
  ok(/เข้าทั้งหมด/.test(st) && new RegExp(new Date(Date.now() + 25200000).toISOString().slice(0, 10)).test(st), 'the back office counts the comings and goings by day');
  // turned off, and taken back
  await B.click('[data-hub="cloudoff"]'); await B.click('[data-hub="forget"]'); await B.waitForTimeout(500);
  ok(await A.evaluate(() => !MME_FIRE_FAKE._get('bw/mapix/anonBBBB1') && !MME_FIRE_FAKE._get('bw/maps/anonBBBB1')), 'a visitor can stop the copies and take back what was sent');
  // signing in moves the page's place online to the new account
  await B.click('#acctBtn'); await B.waitForTimeout(1500);
  const on = await A.evaluate(() => Object.keys(MME_FIRE_FAKE._get('bw/on') || {}));
  ok(on.length === 2 && on.some(k => k.startsWith('uBeeBBBBB_')) && !on.some(k => k.startsWith('anonBBBB1_')), 'after signing in the page is online under the account, once');
  await B.fill('#hubMsg', 'บีมาแล้ว'); await B.keyboard.press('Enter'); await B.waitForTimeout(600);
  await A.click('#hubVeil [data-hub="close"]'); await A.click('[data-hub="ban"][data-u="uBeeBBBBB"]'); await A.waitForTimeout(600);
  ok(await B.evaluate(() => document.getElementById('hubMsg').disabled), 'the admin can stop an account from typing');
  ok(errs.length === 0, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await browser.close(); console.log(fails ? fails + ' FAILED' : 'ALL OK'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('FAILED', e.message.slice(0, 600)); process.exit(1); });
