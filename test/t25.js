// what a brush will touch, the card that says what is pointed at, and the panels that can be dragged and folded
const { chromium } = require('playwright');
const URL = 'http://localhost:8765/index.html';
(async () => {
  const W = +process.env.W || 1536, H = +process.env.H || 660;
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H } });
  const p = await ctx.newPage(); const errs = []; let bad = 0;
  const ok = (name, v, extra) => { if (!v) bad++; console.log((v ? 'ok   ' : 'FAIL ') + name + (extra != null ? ' | ' + extra : '')); };
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/fonts\.g|Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
  const ready = () => p.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable, null, { timeout: 60000 });
  const T = (f, a) => p.evaluate(f, a);
  await p.goto(URL); await p.waitForSelector('.mapcard');
  ok('the menu wears its name and its painting', (await p.textContent('.brand h1')).includes('Bazaar Worldmaker') && (await p.textContent('.brand h1')).includes('ตลาดขายโลก') && await T(() => getComputedStyle(document.querySelector('#menubg i.a')).backgroundImage.includes('valley')) && (await p.textContent('#vtag')).startsWith('Bazaar Worldmaker v'));
  ok('the paintings load', await T(async () => { const one = u => new Promise(r => { const i = new Image(); i.onload = () => r(i.naturalWidth); i.onerror = () => r(0); i.src = u; }); return (await one('assets/bg/valley.webp')) > 1000 && (await one('assets/bg/forest.webp')) > 1000; }));
  await p.click('#newBtn'); await p.fill('#nmTitle', 'แปรงและการ์ด'); await p.fill('#nmSeed', '2024'); await p.dispatchEvent('#nmSeed', 'input'); await p.waitForTimeout(300); await p.click('#nmCreate'); await ready(); await p.waitForTimeout(600);
  ok('the tools ride in the top bar', await T(() => document.getElementById('modes').parentNode.classList.contains('mapbar') && document.getElementById('mapscreen').classList.contains('onebar')), 'bar height ' + await T(() => Math.round(document.querySelector('.mapbar').getBoundingClientRect().height)) + ' px, map box ' + await T(() => { const b = document.getElementById('mapbox').getBoundingClientRect(); return Math.round(b.width) + ' × ' + Math.round(b.height); }));
  // a land hex to point at
  const land = await T(() => { const t = MME.shell.cur.rt.test; for (let fy = 0.3; fy < 0.75; fy += 0.04) for (let fx = 0.3; fx < 0.7; fx += 0.04) { const c = MME.shell.cur.rt.climAt ? null : null; const q = t.pt(fx, fy), e = document.elementFromPoint(q[0], q[1]); if (e && e.id === 'map' && t.landAt && t.landAt(fx, fy)) return q; } return null; }) || await T(() => MME.shell.cur.rt.test.pt(0.5, 0.5));
  const at = async (x, y) => { await p.mouse.move(x - 30, y - 20); await p.mouse.move(x, y); await p.waitForTimeout(160); };
  // ---- climate brush
  await p.click('#modes button[data-mode="climate"]'); await p.waitForTimeout(400); await at(land[0], land[1]);
  ok('no tool in hand: no reach is drawn', (await T(() => MME.shell.cur.rt.test.reach())) === null);
  await p.click('#clTool button[data-t="up"]'); await p.click('#clBrush button[data-n="2"]'); await at(land[0], land[1]);
  let r = await T(() => MME.shell.cur.rt.test.reach()), tip = await T(() => MME.shell.cur.rt.test.tip());
  ok('the climate brush shows the hexes it will raise', r && r.all === 7 && r.cells > 0 && r.cells <= 7, JSON.stringify(r));
  ok('and the card says so in words', tip.shown && /แปรงตรงนี้เพิ่ม/.test(tip.text) && /ใน \d+ ช่อง/.test(tip.text), tip.text.replace(/\s+/g, ' ').slice(-90));
  await p.click('#clBrush button[data-n="3"]'); await at(land[0], land[1]); r = await T(() => MME.shell.cur.rt.test.reach());
  ok('a wider brush, a wider reach', r && r.all === 19, JSON.stringify(r));
  const px = await T(q => { const cv = document.getElementById('map'), b = cv.getBoundingClientRect(), c = cv.getContext('2d'), d = c.getImageData(Math.round((q[0] - b.left) * cv.width / b.width), Math.round((q[1] - b.top) * cv.height / b.height), 1, 1).data; return [d[0], d[1], d[2]]; }, land);
  await p.click('#clTool button[data-t="down"]'); await at(land[0], land[1]);
  const px2 = await T(q => { const cv = document.getElementById('map'), b = cv.getBoundingClientRect(), c = cv.getContext('2d'), d = c.getImageData(Math.round((q[0] - b.left) * cv.width / b.width), Math.round((q[1] - b.top) * cv.height / b.height), 1, 1).data; return [d[0], d[1], d[2]]; }, land);
  ok('raise and lower are tinted apart on the map itself', px.join() !== px2.join(), px.join() + ' vs ' + px2.join());
  await p.screenshot({ path: 'shots/t25-reach.png' });
  await p.click('#clTool button[data-t=""]').catch(() => {});
  // ---- the card
  await p.click('#modes button[data-mode="view"]'); await p.waitForTimeout(300); await at(land[0], land[1]);
  tip = await T(() => MME.shell.cur.rt.test.tip()); ok('pointing at a hex fills the card', tip.shown && tip.text.length > 3, tip.text.replace(/\s+/g, ' ').slice(0, 60));
  const tb = () => T(() => { const r = document.getElementById('tip').getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; });
  let b0 = await tb(); await at(land[0] + 60, land[1] + 30); let b1 = await tb();
  ok('the card rests in one place while the pointer moves', b0.x === b1.x && Math.abs(b0.y + b0.h - b1.y - b1.h) < 2, JSON.stringify(b0));
  await p.mouse.move(b1.x + 60, b1.y + 8); await p.waitForTimeout(150);
  ok('the pointer can go to the card and it stays', (await T(() => MME.shell.cur.rt.test.tip())).shown);
  await p.mouse.down(); await p.mouse.move(b1.x + 200, b1.y - 120, { steps: 5 }); await p.mouse.up(); let b2 = await tb();
  ok('dragged by its bar, it moves', Math.abs(b2.x - b1.x - 140) < 6 && Math.abs(b2.y - b1.y + 128) < 6, JSON.stringify(b2));
  await p.click('#tipFold'); let b3 = await tb(); tip = await T(() => MME.shell.cur.rt.test.tip());
  ok('folded, it is its title alone', tip.fold && b3.h < 34 && (await p.textContent('#tipTitle')).trim().length > 1, 'height ' + b3.h + ' px, title ' + (await p.textContent('#tipTitle')).trim());
  await at(land[0], land[1]); ok('and stays folded as the pointer reads on', (await tb()).h < 34);
  // ---- the options
  await p.click('#modes button[data-mode="terrain"]'); await p.waitForTimeout(300);
  const ob = () => T(() => { const o = document.getElementById('opts'), r = o.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), dock: document.getElementById('mapscreen').classList.contains('dock'), padl: document.getElementById('mapbox').dataset.padl, pal: !!document.getElementById('pal').offsetParent }; });
  let o0 = await ob(); ok('the options name the tool on their bar', (await p.textContent('#optsTitle')).includes('ระบายภูมิประเทศ'), JSON.stringify(o0));
  await p.click('#optsFold'); await p.waitForTimeout(250); let o1 = await ob();
  ok('folded, the options are their bar alone and give the strip back to the map', o1.h < 36 && !o1.pal && !o1.dock && o1.padl === '0', JSON.stringify(o1));
  await p.click('#optsFold'); await p.waitForTimeout(250); let o2 = await ob(); ok('unfolded, they are back', o2.pal && o2.h > 80 && o2.dock === o0.dock);
  await p.mouse.move(o2.x + 80, o2.y + 9); await p.mouse.down(); await p.mouse.move(o2.x + 400, o2.y + 150, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(250); let o3 = await ob();
  ok('dragged, the options go where they are put and the strip closes', Math.abs(o3.x - o2.x - 320) < 8 && o3.y > o2.y + 60 && o3.y + o3.h <= H - 8 && !o3.dock && o3.pal, JSON.stringify(o3));
  await p.screenshot({ path: 'shots/t25-moved.png' });
  // ---- a card of the side panel
  await p.click('#editcard > h2'); ok('a side card folds to its heading', await T(() => document.getElementById('editcard').classList.contains('shut') && !document.getElementById('stats').offsetParent));
  // ---- all of it is remembered
  await p.click('#mmBack'); await p.waitForSelector('.mapcard'); await p.reload(); await p.waitForSelector('.mapcard');
  await p.click('.mapcard:has-text("แปรงและการ์ด") [data-act="open"]'); await ready(); await p.waitForTimeout(500);
  await p.click('#modes button[data-mode="terrain"]'); await p.waitForTimeout(300); let o4 = await ob();
  await p.click('#modes button[data-mode="view"]'); await at(land[0], land[1]); let b4 = await tb();
  ok('after a reload the options, the card and the fold are where they were left', Math.abs(o4.x - o3.x) < 4 && Math.abs(o4.y - o3.y) < 4 && b4.h < 34 && Math.abs(b4.x - b3.x) < 4 && await T(() => document.getElementById('editcard').classList.contains('shut')), JSON.stringify(o4) + ' ' + JSON.stringify(b4));
  await p.dblclick('#opts .ohead .otitle'); await p.waitForTimeout(250); await p.click('#modes button[data-mode="terrain"]'); await p.waitForTimeout(200); let o5 = await ob();
  ok('a double click sends the options home', o5.dock === o0.dock && Math.abs(o5.x - o0.x) < 4, JSON.stringify(o5));
  console.log(W + 'x' + H, 'errors', errs.length + bad, errs.slice(0, 4).join(' | '));
  await browser.close();
})().catch(e => { console.error('TEST FAILED', e.message.slice(0, 900)); process.exit(1); });
