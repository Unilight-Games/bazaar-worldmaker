// v0.19.5: delete every city, delete every state, each one step back; the small map folds away with its own button.
// Gresland, in the test browser's own copy.
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://localhost:8765/index.html';
let bad = 0; const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m, x === undefined ? '' : x); if (!c) bad++; };
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await (await browser.newContext({ viewport: { width: 1536, height: 900 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL); await p.waitForSelector('.mapcard[data-id="gresland"]', { timeout: 60000 }); await p.click('.mapcard[data-id="gresland"] [data-act="open"]');
  await p.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable && MME.shell.cur.rt.state().econ, null, { timeout: 90000 });
  const T = f => p.evaluate(f), H = () => MME.shell.cur.rt.test;
  const n = () => T(() => { const t = MME.shell.cur.rt.test; return { c: t.vcount(), s: t.stCount(), a: t.admCount(), land: t.landOfStates() }; });
  const n0 = await n(); console.log('before', JSON.stringify(n0));
  // cities
  await p.click('#modes button[data-mode="city"]'); await p.waitForTimeout(300);
  ok(await p.isVisible('#cityDelAll'), 'the city tool shows the delete-all button');
  await p.click('#cityDelAll'); await p.waitForTimeout(200);
  ok((await n()).c === n0.c && /อีกครั้ง/.test(await p.textContent('#cityDelAll')), 'one press only asks again');
  await p.click('#cityDelAll'); await p.waitForTimeout(800);
  ok((await n()).c === 0, 'the second press removes every city', (await n()).c);
  await p.click('#undo'); await p.waitForTimeout(800);
  ok((await n()).c === n0.c, 'one step back brings them all', (await n()).c);
  await p.click('#cityDelAll'); await p.waitForTimeout(4400);
  ok(/ลบเมืองทั้งหมด/.test(await p.textContent('#cityDelAll')) && (await n()).c === n0.c, 'an unanswered first press wears off');
  // states
  if (n0.s === 0) { console.log('no states on this map: adding two'); }
  await p.click('.setpick [data-eco="states"]').catch(() => {}); await p.waitForTimeout(600);
  if (n0.s === 0) { for (let k = 0; k < 2; k++) { await p.click('#ecobody [data-a="snew"]'); await p.waitForTimeout(300); } }
  // give the first state land around the middle of the map, and divide it into units
  await p.locator('#ecobody [data-a="spaint"]').first().click(); await p.waitForTimeout(300);
  { const bx = await p.locator('#mapbox canvas').first().boundingBox(); for (let r = 0; r < 6; r++) { const y = bx.y + bx.height * 0.3 + r * 30; await p.mouse.move(bx.x + bx.width * 0.3, y); await p.mouse.down(); await p.mouse.move(bx.x + bx.width * 0.6, y, { steps: 12 }); await p.mouse.up(); } }
  await p.locator('#ecobody [data-a="spaint"]').first().click().catch(() => {}); await p.waitForTimeout(500);
  await T(() => { const t = document.querySelector('#ecoTab [data-t="adm"]'); if (t) t.click(); }); await p.waitForTimeout(600);
  console.log('build buttons', await T(() => { const b = document.querySelector('[data-aa="build"]'); if (b) b.click(); return document.querySelectorAll('[data-aa="build"]').length; })); await p.waitForTimeout(800);
  await T(() => { const t = document.querySelector('#ecoTab [data-t="states"]'); if (t) t.click(); }); await p.waitForTimeout(600);
  const s1 = await n(); console.log('with states', JSON.stringify(s1)); ok(s1.land > 0 && s1.a > 0, 'the test state has land and units');
  const btn = p.locator('#ecobody [data-a="sdelall"]');
  ok(await btn.count() === 1, 'the states list has the delete-all button');
  await btn.click(); await p.waitForTimeout(200);
  ok(/อีกครั้ง/.test(await p.locator('#ecobody [data-a="sdelall"]').textContent()) && (await n()).s === s1.s, 'one press only asks again');
  await p.locator('#ecobody [data-a="sdelall"]').click(); await p.waitForTimeout(800);
  const s2 = await n(); ok(s2.s === 0 && s2.land === 0 && s2.a === 0, 'the second press removes every state, its land and its units', JSON.stringify(s2));
  ok(await p.locator('#ecobody [data-a="sdelall"]').count() === 0, 'with no states the button goes');
  await p.click('#undo'); await p.waitForTimeout(800);
  const s3 = await n(); ok(s3.s === s1.s && s3.land === s1.land && s3.a === s1.a, 'one step back brings the states, land and units', JSON.stringify(s3));
  // the small map
  await p.click('#modes button[data-mode="view"]').catch(() => {}); await p.waitForTimeout(400);
  const vis = () => T(() => ({ mini: !document.querySelector('.minimap').hidden, tog: document.querySelector('.minitog').textContent, r: (() => { const a = document.querySelector('.minimap').getBoundingClientRect(), b = document.querySelector('.minitog').getBoundingClientRect(); return [a.left, a.top, a.right, a.bottom, b.left, b.top, b.right, b.bottom].map(Math.round); })() }));
  let v = await vis(); ok(v.mini && v.r[4] >= v.r[0] && v.r[6] <= v.r[2] && v.r[5] >= v.r[1] && v.r[7] <= v.r[3], 'the fold button sits inside the small map\'s corner', JSON.stringify(v));
  await p.click('.minitog'); await p.waitForTimeout(400); v = await vis();
  ok(!v.mini && /แผนที่ย่อ/.test(v.tog), 'folded: the small map goes, the button stays to open it', v.tog);
  const keep = await T(() => JSON.parse(localStorage.getItem('mme-game') || '{}').mini); ok(keep === false, 'the fold is remembered');
  await p.click('.minitog'); await p.waitForTimeout(400); v = await vis(); ok(v.mini, 'opened again');
  await p.keyboard.press('u'); await p.waitForTimeout(300); ok(!(await p.isVisible('.minitog')), 'hide-all hides the fold button too'); await p.keyboard.press('u');
  ok(!errs.length, 'no page errors', errs.join(' | '));
  await browser.close(); console.log(bad ? bad + ' failed' : 'all passed'); process.exit(bad ? 1 : 0);
})();
