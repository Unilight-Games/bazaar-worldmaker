// v0.19.0 batch 6: the feel of a game: the menu's front row, the bar of figures, the small map, keys and the hotbar, the ring
// menu, floating cards, the gliding camera, sounds that can be turned off
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await (await browser.newContext({ viewport: { width: 1536, height: 900 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForSelector('.mapcard[data-id="gresland"]', { timeout: 60000 });
  ok(await p.isVisible('#gameBar') && await p.isVisible('#gContinue'), 'the menu has a game\'s front row with carry on');
  await p.click('#gContinue');
  await p.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable && MME.shell.cur.rt.state().econ, null, { timeout: 90000 });
  const T = (f, a) => p.evaluate(f, a); await p.waitForTimeout(3000);
  ok(!(await p.$('.hud')) && !(await p.$('.hotbar')), 'no bar along the foot of the map, no hotbar inside it');
  ok(await p.isVisible('.mapopt [data-hud="world"]') && await p.isVisible('.mapopt [data-hud="music"]'), 'the world and the sound switches at the top right');
  const mm = await p.$eval('.minimap', e => { const r = e.getBoundingClientRect(), b = document.getElementById('map').getBoundingClientRect(); return [b.right - r.right, b.bottom - r.bottom]; });
  ok(await p.isVisible('.minimap') && mm[1] >= 0 && mm[1] < 20 && mm[0] >= 0 && mm[0] < 400, 'the small map sits at the bottom right (' + mm.map(Math.round) + ')');
  ok((await p.$$('#modes .modekey')).length >= 9, 'the mode buttons at the top show their keys');
  const tipPos = await p.$eval('#tip', e => { const r = e.getBoundingClientRect(), b = document.getElementById('map').getBoundingClientRect(); return [r.left - b.left, b.bottom - r.bottom, getComputedStyle(e).display]; });
  ok(tipPos[2] === 'none' || (tipPos[0] < 60 && tipPos[1] < 80), 'the description card starts at the bottom left (' + tipPos.map(x => typeof x === 'number' ? Math.round(x) : x) + ')');
  // keys and hotbar
  await p.mouse.move(700, 400); await p.keyboard.press('Digit2'); await p.waitForTimeout(200);
  ok(await T(() => MME.shell.cur.rt.state().mode) === 'terrain', 'key 2 opens the terrain');
  await p.keyboard.press('Digit7'); await p.waitForTimeout(200); ok(await T(() => MME.shell.cur.rt.state().mode) === 'trade', 'key 7 opens trade');
  await p.keyboard.press('Digit1'); await p.waitForTimeout(200);
  await p.keyboard.press('KeyM'); await p.waitForTimeout(300); ok(await p.isVisible('.mkcard'), 'M opens the market'); await p.keyboard.press('Escape');
  await p.keyboard.press('KeyH'); await p.waitForTimeout(300); ok(!(await p.isVisible('.minimap')), 'H hides the small map'); await p.keyboard.press('KeyH'); await p.waitForTimeout(300);
  // the ring menu
  await p.mouse.click(700, 420, { button: 'right' }); await p.waitForTimeout(300);
  ok(await p.$eval('.ringmenu', e => !e.hidden) && (await p.$$('.ringmenu button')).length === 6, 'a right click opens the ring');
  await p.click('.ringmenu button:has-text("วัดระยะจากที่นี่")'); await p.waitForTimeout(200);
  ok((await T(() => MME.shell.cur.rt.test.b19())).ruler === 1, 'the ring starts the ruler at that spot'); await p.keyboard.press('Escape'); await p.keyboard.press('Escape');
  // the camera glides and lands where it would have
  const s0 = await T(() => MME.shell.cur.rt.state().view ? MME.shell.cur.rt.state().view.s : null);
  await p.click('#zin'); await p.waitForTimeout(40); const mid = await T(() => MME.shell.cur.rt.test.vs()); await p.waitForTimeout(400); const end = await T(() => MME.shell.cur.rt.test.vs());
  ok(end > mid * 1.01 || end > (s0 || 0), 'zooming glides (' + mid.toFixed(3) + '→' + end.toFixed(3) + ')');
  // the small map moves the view
  for (let i = 0; i < 4; i++) { await p.click('#zin'); await p.waitForTimeout(250); }
  const v0 = await T(() => MME.shell.cur.rt.test.mapXY(0, 0)); const box = await p.$eval('.minimap', e => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; });
  await p.mouse.click(box[0] + box[2] * 0.85, box[1] + box[3] * 0.8); await p.waitForTimeout(200); const v1 = await T(() => MME.shell.cur.rt.test.mapXY(0, 0));
  ok(Math.hypot(v1[0] - v0[0], v1[1] - v0[1]) > 20, 'a click on the small map moves the view');
  // a card comes out of the side panel and goes back
  const pop = await p.$('aside .card .popbtn'); ok(!!pop, 'side cards can come out');
  if (pop) { await pop.click(); await p.waitForTimeout(200); ok(await p.$eval('.card.floating', e => !!e).catch(() => false), 'the card floats over the map'); await p.click('.card.floating .popbtn'); await p.waitForTimeout(200); ok(!(await p.$('.card.floating')), 'and goes back'); }
  // sounds can be turned off and on
  await p.click('.mapopt [data-hud="sfx"]'); await p.waitForTimeout(100); ok((await p.textContent('.mapopt [data-hud="sfx"]')).includes('○'), 'sounds off'); await p.click('.mapopt [data-hud="sfx"]');
  await p.mouse.move(700, 400); await p.waitForTimeout(400);
  await p.screenshot({ path: '/tmp/b6-hud.png' });
  ok(!errs.length, 'no page errors ' + errs.join(' | '));
  await browser.close(); console.log(fails ? fails + ' failed' : 'all passed'); process.exit(fails ? 1 : 0);
})();
