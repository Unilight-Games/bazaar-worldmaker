// v0.22.1: the map's seed and its making settings in the World data window, after the map is made (the owner's ask, 26 Nov 2026)
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m, x === undefined ? '' : x); if (!c) fails++; };
const make = async (p, start, seed, title) => {
  await p.click('#newBtn'); await p.waitForTimeout(400);
  await p.evaluate(([start, seed, title]) => { const r = document.getElementById('nmSize-s'); r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true }));
    const b = document.querySelector(`#nmStart button[data-v="${start}"]`); if (b) b.click();
    if (seed) { const s = document.getElementById('nmSeed'); s.value = seed; s.dispatchEvent(new Event('input')); }
    document.getElementById('nmTitle').value = title; }, [start, seed, title]);
  await p.waitForTimeout(600); await p.evaluate(() => document.getElementById('nmCreate').click());
  await p.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable, null, { timeout: 120000 }); await p.waitForTimeout(1500);
};
const world = p => p.evaluate(() => { document.getElementById('setWorld').click(); const g = document.getElementById('ntGen'); return { text: g.innerText, seed: (g.querySelector('.gseed') || {}).textContent || '', vis: !!g.offsetParent }; });
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://localhost:8765' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForSelector('#newBtn');
  await p.evaluate(() => { const v = document.getElementById('brVeil'); if (v) v.hidden = true; });
  await make(p, 'random', 4242, 'เมล็ด');
  const meta = await p.evaluate(() => ({ ...MME.shell.cur.meta.gen, now: MME.VERSION }));
  ok(meta && meta.seed === 4242 && meta.ver === meta.now, 'a random map keeps its seed and the version it was made with', JSON.stringify(meta));
  const w = await world(p);
  ok(w.vis && w.seed === '4242', 'World data shows the seed', w.seed);
  ok(/ทวีปเดียว|หลายทวีป|หมู่เกาะ/.test(w.text) && /แผ่นดิน \d+%/.test(w.text) && /กม\. ต่อช่อง/.test(w.text) && /สร้างด้วยรุ่น/.test(w.text), 'and the settings it was made with', w.text.split('\n')[1]);
  await p.click('#ntSeedCopy'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => navigator.clipboard.readText()) === '4242', 'the copy button puts the seed on the clipboard');
  // the same seed and settings again give the same land
  // a map from empty sea says it has no seed
  await p.goto('http://localhost:8765/index.html'); await p.waitForSelector('#newBtn'); await p.evaluate(() => { const v = document.getElementById('brVeil'); if (v) v.hidden = true; });
  await make(p, 'blank', 0, 'ทะเลเปล่า');
  const w2 = await world(p);
  ok(!w2.seed && /ไม่มีเลขสุ่ม/.test(w2.text), 'a map begun from empty sea says it has no seed', w2.text.slice(0, 60));
  // the English page
  const e = await ctx.newPage(); await e.goto('http://localhost:8765/en.html'); await e.waitForSelector('#newBtn'); await e.evaluate(() => { const v = document.getElementById('brVeil'); if (v) v.hidden = true; });
  await make(e, 'random', 777, 'Seed test');
  const w3 = await world(e);
  ok(w3.seed === '777' && /Map seed/.test(w3.text) && /km per hex/.test(w3.text) && !/[ก-๙]/.test(w3.text), 'the English page shows it in English', w3.text.split('\n').slice(0, 2).join(' | '));
  ok(!errs.length, 'no page errors', JSON.stringify(errs.slice(0, 3)));
  await browser.close(); console.log(fails ? fails + ' FAILED' : 'ALL OK'); process.exit(fails ? 1 : 0);
})();
