// v0.19.1: the terms of use say an account not seen for three years loses its record and its copies; the admin page lists such
// accounts and deletes them on a second press, and leaves a fresh account alone
const { chromium } = require('playwright');
const makeHubFake = require('./_fakehub.js');
const URL = 'http://localhost:8767/index.html';
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const errs = [];
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript('window.MME_FIRE_FAKE = (' + makeHubFake.toString() + ')(' + JSON.stringify({ anonUid: 'anonAAAA1', uid: 'uAdminAAA', name: 'นน', signedIn: true, admin: true }) + ');');
  await p.goto(URL); await p.waitForSelector('#lib'); await p.waitForFunction(() => MME.hub && MME.hub.uid, null, { timeout: 20000 });
  await p.evaluate(() => { const old = Date.now() - 4 * 365 * 86400000, F = MME_FIRE_FAKE;
    F._put('bw/users/uOldOLDOL', { t: old, n: 'คนเก่า', g: true }); F._put('bw/maps/uOldOLDOL/m1', { d: '{}', at: old }); F._put('bw/mapix/uOldOLDOL/m1', { title: 'ผืนเก่า', at: old, size: 10 });
    F._put('bw/users/uNewNEWNE', { t: Date.now() - 86400000, n: 'คนใหม่', g: true }); F._put('bw/maps/uNewNEWNE/m2', { d: '{}', at: Date.now() }); F._put('bw/mapix/uNewNEWNE/m2', { title: 'ผืนใหม่', at: Date.now(), size: 10 }); });
  await p.waitForSelector('#hubAdminBtn', { state: 'visible', timeout: 20000 });
  await p.click('#hubAdminBtn'); await p.waitForTimeout(800);
  await p.click('#hubBoTabs [data-v="maps"]'); await p.waitForTimeout(800);
  const txt = await p.$eval('#hubBo', e => e.textContent);
  ok(/บัญชีที่ไม่ได้เข้ามาเกิน 3 ปี 1 บัญชี/.test(txt) && txt.includes('uOldOLDOL'), 'the copies tab lists the one idle account');
  await p.click('[data-hub="stale"]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => !!MME_FIRE_FAKE._get('bw/users/uOldOLDOL')), 'one press deletes nothing');
  await p.click('[data-hub="stale"]'); await p.waitForTimeout(1200);
  ok(await p.evaluate(() => !MME_FIRE_FAKE._get('bw/users/uOldOLDOL') && !MME_FIRE_FAKE._get('bw/maps/uOldOLDOL/m1') && !MME_FIRE_FAKE._get('bw/mapix/uOldOLDOL/m1')), 'the second press deletes its record and copies');
  ok(await p.evaluate(() => !!MME_FIRE_FAKE._get('bw/users/uNewNEWNE') && !!MME_FIRE_FAKE._get('bw/maps/uNewNEWNE/m2')), 'the fresh account is untouched');
  ok(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' '));
  console.log(fails ? fails + ' failed' : 'all passed'); await browser.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('TEST FAILED', e.message.slice(0, 400)); process.exit(1); });
