// v0.19.5: one community put under another from its own form; the state divided first when it is not; a loop refused; one step
// back; and the delete-all-roads button. Gresland, in the test browser's own copy.
const { chromium } = require('playwright');
let bad = 0; const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m, x === undefined ? '' : x); if (!c) bad++; };
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await (await browser.newContext({ viewport: { width: 1536, height: 900 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForSelector('.mapcard[data-id="gresland"]', { timeout: 60000 }); await p.click('.mapcard[data-id="gresland"] [data-act="open"]');
  await p.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable && MME.shell.cur.rt.state().econ, null, { timeout: 90000 });
  const T = (f, a) => p.evaluate(f, a);
  // a state over the middle of the map, not yet divided
  await p.click('.setpick [data-eco="states"]'); await p.waitForTimeout(800); await p.click('#ecobody [data-a="snew"]'); await p.waitForTimeout(600);
  ok((await T(() => MME.shell.cur.rt.test.ecoPaintNow()))[0] === 'A', 'a new state starts with its brush on');
  { const bx = await p.locator('#mapbox canvas').first().boundingBox(); for (let r = 0; r < 8; r++) { const y = bx.y + bx.height * 0.28 + r * 30; await p.mouse.move(bx.x + bx.width * 0.28, y); await p.mouse.down(); await p.mouse.move(bx.x + bx.width * 0.62, y, { steps: 14 }); await p.mouse.up(); } }
  await T(() => { const b = document.querySelector('#ecobody [data-a="spaint"]'); if (b) b.click(); }); await p.waitForTimeout(2500);
  const inS = await T(() => { const t = MME.shell.cur.rt.test, st = t.eco().states[0].id, cells = t.eco().cells; return t.cities().filter(c => c.st === st).map(c => ({ id: c.id, name: c.name, kind: c.kind })); });
  ok(inS.length >= 3, 'the state holds some communities', inS.length);
  let [A, B, C] = [inS.find(c => c.kind === 'village') || inS[0], inS.filter(c => c.kind === 'village')[1] || inS[1], inS.find(c => c.kind === 'town') || inS.filter(c => c.kind !== 'village')[0] || inS[2]];
  if (C.id === A.id || C.id === B.id) C = inS.find(c => c.id !== A.id && c.id !== B.id);
  console.log('A', A.name, A.kind, '| B', B.name, B.kind, '| C', C.name, C.kind);
  ok((await T(() => MME.shell.cur.rt.test.admCount())) === 0, 'not yet divided');
  await T(id => MME.shell.cur.rt.test.pickCity(id), A.id); await p.waitForTimeout(400);
  ok(/ยังไม่ได้แบ่ง/.test(await p.textContent('#cfUpNote')), 'the form says the state is not divided yet', await p.textContent('#cfUpNote'));
  await p.selectOption('#cfUp', B.id); await p.waitForTimeout(1200);
  ok((await T(() => MME.shell.cur.rt.test.admCount())) > 0, 'choosing divided the state first', await T(() => MME.shell.cur.rt.test.admCount()));
  ok((await T(id => MME.shell.cur.rt.test.admBoss(id), A.id)) === B.id, `${A.name} answers to ${B.name}`);
  ok((await p.inputValue('#cfUp')) === B.id, 'the form shows it');
  // a loop: B under A is refused
  await T(id => MME.shell.cur.rt.test.pickCity(id), B.id); await p.waitForTimeout(400);
  const n1 = await T(() => JSON.stringify(MME.shell.cur.rt.test.adm().units));
  await p.selectOption('#cfUp', A.id); await p.waitForTimeout(800);
  ok((await T(() => JSON.stringify(MME.shell.cur.rt.test.adm().units))) === n1 && (await T(id => MME.shell.cur.rt.test.admBoss(id), A.id)) === B.id, 'putting B under A, which is under B, changes nothing');
  // A under C, then one step back
  await T(id => MME.shell.cur.rt.test.pickCity(id), A.id); await p.waitForTimeout(400);
  await p.selectOption('#cfUp', C.id); await p.waitForTimeout(800);
  ok((await T(id => MME.shell.cur.rt.test.admBoss(id), A.id)) === C.id, `${A.name} moved under ${C.name}`);
  await p.click('#undo'); await p.waitForTimeout(800);
  ok((await T(id => MME.shell.cur.rt.test.admBoss(id), A.id)) === B.id, 'one step back puts it under B again');
  await T(id => MME.shell.cur.rt.test.pickCity(id), A.id); await p.waitForTimeout(300);
  await p.selectOption('#cfUp', ''); await p.waitForTimeout(800);
  ok((await T(id => MME.shell.cur.rt.test.admBoss(id), A.id)) === '', 'straight under the state');
  // a community outside any state
  const out = await T(() => { const t = MME.shell.cur.rt.test; return t.cities().find(c => c.st === '.'); });
  if (out) { await T(id => MME.shell.cur.rt.test.pickCity(id), out.id); await p.waitForTimeout(300); ok(await p.isDisabled('#cfUp') && /ระบายเขตรัฐ/.test(await p.textContent('#cfUpNote')), 'outside a state the choice is shut', [await p.isDisabled('#cfUp'), await p.textContent('#cfUpNote'), out.name, await T(() => MME.shell.cur.rt.test.ecoPaintNow())].join(' | ')); }
  // roads
  await p.keyboard.press('Escape'); await p.click('#modes button[data-mode="route"]'); await p.waitForTimeout(300);
  const r0 = await T(() => MME.shell.cur.rt.test.roadCount()); ok(r0 > 10, 'Gresland has roads', r0);
  await p.click('#rtDelAll'); await p.waitForTimeout(200); ok((await T(() => MME.shell.cur.rt.test.roadCount())) === r0, 'one press only asks again');
  await p.click('#rtDelAll'); await p.waitForTimeout(800); ok((await T(() => MME.shell.cur.rt.test.roadCount())) === 0, 'the second press removes every road');
  await p.click('#undo'); await p.waitForTimeout(800); ok((await T(() => MME.shell.cur.rt.test.roadCount())) === r0, 'one step back brings them all');
  ok(!errs.length, 'no page errors', errs.join(' | '));
  await browser.close(); console.log(bad ? bad + ' failed' : 'all passed'); process.exit(bad ? 1 : 0);
})();
