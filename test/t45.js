// v0.18.1: the share button on the menu: the official link, copied, handed to the device's own share, or to three sites
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  for (const [name, url] of [['artifact build', 'http://localhost:8765/index.html'], ['web build', 'http://localhost:8767/index.html']]) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(url).origin });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(url); await p.waitForSelector('#lib'); await p.waitForTimeout(800);
    await p.evaluate(() => { const v = document.getElementById('brVeil'); if (v) v.hidden = true; });
    ok(await p.isVisible('#shareBtn'), name + ': the menu has a share button');
    await p.click('#shareBtn');
    ok(await p.isVisible('#shareVeil') && await p.inputValue('#shareUrl') === 'https://unilight-games.github.io/bazaar-worldmaker/', name + ': it shows the official link');
    await p.click('#shareCopy'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => navigator.clipboard.readText()) === 'https://unilight-games.github.io/bazaar-worldmaker/' && /คัดลอกลิงก์แล้ว/.test(await p.textContent('#mtoast')), name + ': copying puts the link on the clipboard');
    await p.evaluate(() => { window.__opened = []; window.open = (u, t, f) => { window.__opened.push(u); return {}; }; });   // the sandbox reaches no social site: the address asked for is what counts
    await p.click('[data-share="facebook"]'); await p.click('[data-share="line"]'); await p.click('[data-share="x"]');
    const op = await p.evaluate(() => window.__opened), enc = encodeURIComponent('https://unilight-games.github.io/bazaar-worldmaker/');
    ok(op.length === 3 && op[0].startsWith('https://www.facebook.com/sharer/sharer.php?u=' + enc), name + ': Facebook opens with the link');
    ok(op[1] && op[1].startsWith('https://social-plugins.line.me/lineit/share?url=' + enc), name + ': LINE opens with the link');
    ok(op[2] && op[2].startsWith('https://twitter.com/intent/tweet?url=' + enc) && op[2].includes('text='), name + ': X opens with the link and a line about the page');
    ok(await p.evaluate(() => !document.getElementById('mtoast').textContent.includes('เปิดหน้าต่างใหม่ไม่ได้')), name + ': no false complaint about the new window');
    await p.keyboard.press('Escape'); ok(await p.isHidden('#shareVeil'), name + ': Escape closes it');
    ok(errs.length === 0, name + ': no page errors ' + errs.join(' | '));
    await ctx.close();
  }
  await browser.close(); console.log(fails ? fails + ' FAILED' : 'ALL OK'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('FAILED', e.message.slice(0, 600)); process.exit(1); });
