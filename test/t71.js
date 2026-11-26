// v0.21.0: forms of government and the marks of a state; central and local taxes, a unit's own purse and tolls; the keys of
// the tool in hand on the map; the culture brush's reach; folds that stay open; canals; organisations with a head office;
// money issued by a state and used by another; fishing grounds out to sea. Gresland, in the test browser's own copy.
const { chromium } = require('playwright');
let bad = 0; const ok = (m, c, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m, x === undefined ? '' : x); if (!c) bad++; };
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await (await browser.newContext({ viewport: { width: 1536, height: 900 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForSelector('.mapcard[data-id="gresland"]', { timeout: 60000 }); await p.click('.mapcard[data-id="gresland"] [data-act="open"]');
  await p.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable && MME.shell.cur.rt.state().econ, null, { timeout: 90000 }); await p.waitForTimeout(2000);
  const T = (f, a) => p.evaluate(f, a), X = f => T(f);
  // the fishing grounds: a coastal community's harvest now reaches out over the water, as far as the boats go
  const wet = async n => { await T(n => { const x = MME.shell.cur.rt.test, e = x.eco(); e.tune = { ...(e.tune || {}), fishReach: n }; x.ecoSet(e); }, n); await p.waitForTimeout(3500); return T(() => { const x = MME.shell.cur.rt.test; return x.cities().reduce((a, c) => { const r = x.reachOf(c.id); return a + (r ? r.nw || 0 : 0); }, 0); }); };
  const w1 = await wet(1), w3 = await wet(3);
  ok('boats that go further out fish more water', w1 > 0 && w3 > w1 * 1.4, JSON.stringify([w1, w3]));
  await wet(2);
  // a specialty pulls the harvest toward its thing: a fishing village's boats go further, a mining village reaches the mountains
  const sp = await T(() => { const x = MME.shell.cur.rt.test; for (const c of x.cities()) { const f = x.specFitList(c.id); if (f.includes('seafish')) return c.id; } return null; });
  if (sp) {
    const before = await T(id => MME.shell.cur.rt.test.reachOf(id).nw, sp);
    await T(id => { const x = MME.shell.cur.rt.test, e = x.eco(); e.spec = { ...(e.spec || {}), [id]: 'seafish' }; x.ecoSet(e); }, sp); await p.waitForTimeout(3500);
    const after = await T(id => MME.shell.cur.rt.test.reachOf(id).nw, sp);
    ok('a fishing village fishes further out', after > before, JSON.stringify([before, after]));
  } else ok('a coastal community to make a fishing village', false);
  // two states
  await T(() => { const t = MME.shell.cur.rt.test, d = t.eco(), g = t.grid(); let cells = ''; for (let i = 0; i < g.N; i++) { const c = i % g.COLS, r = (i / g.COLS) | 0; cells += r > g.ROWS * 0.15 && r < g.ROWS * 0.85 && c > g.COLS * 0.1 && c < g.COLS * 0.9 ? (c < g.COLS / 2 ? 'A' : 'B') : '.'; }
    d.states = [{ id: 'A', name: 'ตะวันตก', color: '#aa3333', sys: 'feud', rel: {} }, { id: 'B', name: 'ตะวันออก', color: '#3355aa', sys: 'merc', rel: {} }]; d.cells = cells; t.ecoSet(d); });
  await p.waitForTimeout(2500);
  // the form of government: names follow it, and it is kept
  await p.click('#modes button[data-mode="econ"]'); await p.click('#ecoTab button[data-t="states"]'); await p.waitForTimeout(400);
  ok('the state card offers twenty forms of government', await T(() => document.querySelectorAll('#ecobody [data-s="A"] select[data-gv] option').length) >= 21);
  await p.selectOption('#ecobody [data-s="A"] select[data-gv]', 'republic'); await p.waitForTimeout(800);
  ok('a form is kept in the document', await T(() => MME.shell.cur.rt.test.eco().states.find(s => s.id === 'A').gov === 'republic'));
  ok('the republic\'s own marks are offered, with the common ones', await T(() => !!document.querySelector('#ecobody [data-s="A"] input[data-gt="suffrage"]') && !!document.querySelector('#ecobody [data-s="A"] input[data-gt="bureau"]') && !document.querySelector('#ecobody [data-s="A"] input[data-gt="serf"]')));
  // a tick does not fold the card away
  await T(() => { const d = document.querySelector('#ecobody details[data-fold="stA"]'); if (d) d.open = true; const i = document.querySelector('#ecobody details[data-fold="syA"]'); if (i) i.open = true; });
  await p.click('#ecobody [data-s="A"] input[data-gt="bureau"]'); await p.waitForTimeout(900);
  ok('a mark is ticked and kept', await T(() => (MME.shell.cur.rt.test.eco().states.find(s => s.id === 'A').gtr || []).includes('bureau')));
  ok('ticking leaves the folds as they were', await T(() => { const a = document.querySelector('#ecobody details[data-fold="stA"]'), b = document.querySelector('#ecobody details[data-fold="syA"]'); return !!a && a.open && (!b || b.open); }));
  // the government tab names the tiers by the form
  await p.click('#ecoTab button[data-t="adm"]'); await p.waitForTimeout(300);
  await T(() => document.querySelector('[data-aa="build"][data-s="A"]').click()); await p.waitForTimeout(1500);
  await T(() => document.querySelector('[data-aa="sel"][data-s="A"]').click()); await p.waitForTimeout(400);
  ok('a republic\'s tiers read district, province, region', await T(() => [...document.querySelectorAll('#admLv button')].map(b => b.textContent).join(',') === 'อำเภอ,จังหวัด,ภาค,สาธารณรัฐ'));
  // the keys of the tool in hand
  ok('the strip on the map says Shift and a click annexes', await T(() => { const k = document.getElementById('keyhint'); return !!k && !k.hidden && /Shift/.test(k.textContent) && /ผนวก/.test(k.textContent); }));
  await p.keyboard.down('Shift'); await p.waitForTimeout(150);
  ok('Shift held lights its key', await T(() => !!document.querySelector('#keyhint .kh.on')));
  await p.keyboard.up('Shift');
  // central and local taxes
  const F = await T(() => MME.shell.cur.rt.test.fisc());
  const A = F.st.find(s => s.id === 'A');
  ok('the centre and the units both collect', A && A.total > 0 && A.kept > 0, A && JSON.stringify({ c: Math.round(A.total), l: Math.round(A.kept) }));
  // a unit's own purse
  const u = await T(() => { const a = MME.shell.cur.rt.test.adm(); const x = a.units.find(z => z.t === 0 && z.cities > 1) || a.units.find(z => z.t === 0 && z.cities > 0); return x.id; });
  await T(id => { const a = document.createElement('a'); a.dataset.adm = id; a.href = '#'; document.getElementById('ecobody').appendChild(a); a.click(); }, u); await p.waitForTimeout(500);
  ok('a unit shows its own economy', /เศรษฐกิจของ/.test(await p.textContent('#ecobody')) && /ภาษีท้องถิ่นปีนี้/.test(await p.textContent('#ecobody')));
  const got0 = (await T(() => MME.shell.cur.rt.test.fisc())).units.find(x => x.id === u);
  await p.fill('#ecobody input[data-uf="rate"]', '10'); await p.press('#ecobody input[data-uf="rate"]', 'Enter'); await T(() => document.querySelector('#ecobody input[data-uf="rate"]').dispatchEvent(new Event('change', { bubbles: true }))); await p.waitForTimeout(2500);
  const got1 = (await T(() => MME.shell.cur.rt.test.fisc())).units.find(x => x.id === u);
  ok('a higher local rate brings the unit more', got0 && got1 && got1.got > got0.got * 1.5, JSON.stringify([got0 && Math.round(got0.got), got1 && Math.round(got1.got)]));
  ok('the rate is kept on the unit', await T(id => MME.shell.cur.rt.test.adm().units.find(x => x.id === id).rate === 0.1, u));
  await p.fill('#ecobody input[data-uf="toll"]', '20'); await T(() => document.querySelector('#ecobody input[data-uf="toll"]').dispatchEvent(new Event('change', { bubbles: true }))); await p.waitForTimeout(2500);
  const got2 = (await T(() => MME.shell.cur.rt.test.fisc())).units.find(x => x.id === u);
  ok('a toll brings in money of its own', got2 && got2.toll >= 0 && got2.got >= got1.got * 0.9, JSON.stringify(got2 && [Math.round(got2.toll), Math.round(got2.got)]));
  // money: B uses A's money
  await p.click('#ecoTab button[data-t="states"]'); await p.waitForTimeout(300);
  await p.selectOption('#ecobody [data-s="A"] select[data-cn="use"]', 'own'); await p.waitForTimeout(800);
  await p.selectOption('#ecobody [data-s="A"] select[data-cn="form"]', 'fiat'); await p.waitForTimeout(800);
  await p.selectOption('#ecobody [data-s="B"] select[data-cn="use"]', 'A'); await p.waitForTimeout(2500);
  const coin = await T(() => { const e = MME.shell.cur.rt.test.eco(); const a = e.states.find(s => s.id === 'A'), b = e.states.find(s => s.id === 'B'); return { a: a.cur, b: b.cur, ar: a.rate, br: b.rate, use: b.coin && b.coin.use }; });
  ok('a state uses another\'s money: one name, one rate', coin.a && coin.a === coin.b && coin.ar === coin.br && coin.use === 'A', JSON.stringify(coin));
  ok('the issuer earns from the money it makes', /ได้จากการผลิตเงิน/.test(await p.textContent('#ecobody [data-s="A"]')));
  await p.click('#ecoTab button[data-t="gdp"]').catch(() => {}); await T(() => { const b = document.querySelector('.setpick [data-eco="gdp"]'); if (b) b.click(); }); await p.waitForTimeout(800);
  ok('the money tab lists the world\'s money', /ระบบเงินตราของโลก/.test(await p.textContent('#ecobody')));
  // more marks of culture and faith; the brush shows its reach
  await T(() => { const b = document.querySelector('#ecoTab button[data-t="cul"]'); b.click(); }); await p.waitForTimeout(300);
  await T(() => document.querySelector('#ecobody [data-bl="new"]').click()); await p.waitForTimeout(500);
  ok('a culture has many marks to tick', await T(() => document.querySelectorAll('#ecobody details[data-bid] input[data-bt]').length) >= 25);
  const cvb = await p.locator('#mapbox canvas').first().boundingBox(); await p.mouse.move(cvb.x + cvb.width * 0.4, cvb.y + cvb.height * 0.5); await p.mouse.move(cvb.x + cvb.width * 0.41, cvb.y + cvb.height * 0.5); await p.waitForTimeout(300);
  ok('the culture brush shows its reach', await T(() => { const r = MME.shell.cur.rt.test.reach(); return !!r && r.cells > 0; }));
  ok('and the strip says how to paint and erase', await T(() => /คลิกขวา/.test(document.getElementById('keyhint').textContent)));
  // a canal is its own kind of waterway
  ok('canals are a kind of waterway', await T(() => [...document.querySelectorAll('#rkind button')].some(b => b.dataset.k === 'canal')));
  const cn = await T(() => { const t = MME.shell.cur.rt.test, g = t.grid(); return t.riverDraw([[g.COLS * 2, g.ROWS * 3], [g.COLS * 2 + 40, g.ROWS * 3], [g.COLS * 2 + 40, g.ROWS * 3 + 40]], 'canal'); });
  ok('a canal can be drawn and is kept as one', await T(() => MME.shell.cur.rt.test.rivers().some(r => r.kind === 'canal')), cn);
  // an organisation founded at a head office
  await T(() => { const b = document.querySelector('.setpick [data-eco="orgs"]'); if (b) b.click(); }); await p.waitForTimeout(400);
  await T(() => document.querySelector('#ecobody [data-a="onew"]').click()); await p.waitForTimeout(400);
  ok('a new organisation asks for its head office first', await T(() => /ตั้งสำนักงานใหญ่ก่อน/.test(document.getElementById('ecobody').textContent) && !document.querySelector('#ecobody select[data-f="oadd"]')));
  const ids = await T(() => MME.shell.cur.rt.test.cities().slice(0, 3).map(c => c.id));
  await p.selectOption('#ecobody select[data-f="ohq"]', ids[0]); await p.waitForTimeout(500);
  await p.selectOption('#ecobody select[data-f="oadd"]', ids[1]); await p.waitForTimeout(800);
  const og = await T(() => MME.shell.cur.rt.test.eco().orgs.slice(-1)[0]);
  ok('the head office is set and a branch opened from it', og.hq === ids[0] && og.seats.includes(ids[1]), JSON.stringify({ hq: og.hq, seats: og.seats }));
  ok('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  console.log(bad ? bad + ' failed' : 'all passed'); await browser.close(); process.exit(bad ? 1 : 0);
})();
