// v0.18.2: an admin named by a verified Google email in the rules, with nothing written under admin/ in the database
const { chromium } = require('playwright');
const makeHubFake = require('./_fakehub.js');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const errs = [];
  const open = async o => { const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); await p.addInitScript('window.MME_FIRE_FAKE = (' + makeHubFake.toString() + ')(' + JSON.stringify(o) + ');'); await p.goto('http://localhost:8767/index.html'); await p.waitForSelector('#lib'); await p.waitForFunction(() => MME.hub && MME.hub.uid); await p.waitForTimeout(1200); return p; };
  const N = await open({ anonUid: 'anonNNNN1', uid: 'uNonNNNNN', name: 'นน', email: 'admin@example.com', adminEmail: 'admin@example.com', signedIn: true });
  const F = await open({ anonUid: 'anonFFFF1', uid: 'uFriendFF', name: 'เพื่อน', email: 'friend@example.com', adminEmail: 'admin@example.com', signedIn: true });
  ok(await N.evaluate(() => !MME_FIRE_FAKE._get('bw/admin')), 'nothing is written under admin/ in the database');
  ok(await N.evaluate(() => MME.hub.admin && !document.getElementById('hubAdminBtn').hidden), 'the account whose email the rules name sees the back office');
  ok(await F.evaluate(() => !MME.hub.admin && document.getElementById('hubAdminBtn').hidden), 'another Google account does not');
  await N.click('#hubAdminBtn'); await N.waitForTimeout(600); await N.click('#hubBoTabs [data-v="on"]'); await N.waitForTimeout(600);
  ok(/ออนไลน์ตอนนี้ 2/.test(await N.textContent('#hubBo')), 'and the back office reads the people online');
  await N.click('#hubVeil [data-hub="close"]'); await N.click('#acctBtn'); await N.waitForTimeout(1500);
  ok(await N.evaluate(() => !MME.hub.admin && document.getElementById('hubAdminBtn').hidden), 'signed out, the back office goes away');
  ok(errs.length === 0, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await browser.close(); console.log(fails ? fails + ' FAILED' : 'ALL OK'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('FAILED', e.message.slice(0, 600)); process.exit(1); });
