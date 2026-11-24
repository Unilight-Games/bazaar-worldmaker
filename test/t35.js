// v0.14.0: four classes measured by where the money comes from, the analyser, what the not-so-rich buy, a city's reach on the
// map, what a surplus and a balance do, and the version badge off the side panel.
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1536, height: 860 } });
  const errs = []; let bad = 0;
  const ok = (name, v, extra) => { if (!v) bad++; console.log((v ? 'ok   ' : 'FAIL ') + name + (extra != null ? ' | ' + extra : '')); };
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/fonts\.g|Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 200)); });
  await p.goto('http://localhost:8765/index.html'); await p.waitForSelector('.mapcard[data-id="gresland"]', { timeout: 60000 });
  ok('the version badge shows on the library', await p.evaluate(() => !document.getElementById('vtag').hidden && /v0\.14/.test(document.getElementById('vtag').textContent)));
  await p.click('.mapcard[data-id="gresland"] [data-act="open"]');
  await p.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable && MME.shell.cur.rt.state().econ, null, { timeout: 90000 });
  const settle = async () => { for (let n = 0, last = -1; n < 40; n++) { await p.waitForTimeout(2000); const v = await p.evaluate(() => { const e = MME.shell.cur.rt.test.econ(); return e ? e.ver : -1; }); if (v === last && v >= 0) return; last = v; } };
  const eco = async (fn, arg) => { await p.evaluate(new Function('arg', `const x = MME.shell.cur.rt.test, e = x.eco(); (${fn})(e, arg, x); x.ecoSet(e);`), arg); await settle(); };
  const G = () => p.evaluate(() => MME.shell.cur.rt.test.gdp());
  const SC = () => p.evaluate(() => MME.shell.cur.rt.test.soc());
  await settle();
  ok('on the map the badge steps aside and the side panel carries the version at its foot', await p.evaluate(() => document.getElementById('vtag').hidden && /Bazaar Worldmaker v0\.14/.test(document.getElementById('vfoot').textContent)));
  // ---- 1 classes ----
  const g0 = await G();
  ok('every city\'s money falls into four classes that add up to it, and its people likewise with its slaves', g0.every(r => { const c = r.cls, inc = Math.max(0, r.inc), n = c.hi.n + c.mid.n + c.low.n + c.poor.n + c.slave.n, m = c.hi.inc + c.mid.inc + c.low.inc + c.poor.inc; return Math.abs(n - r.people) < 1 && Math.abs(m - inc) <= 1e-6 * inc + 1e-6 && Object.values(c).every(q => q.n >= 0 && q.inc >= 0 && q.well >= 0 && q.well <= 100); }));
  const per = (r, q) => r.cls[q].n > 0.5 ? r.cls[q].inc / r.cls[q].n : null;
  const order = g0.filter(r => r.cls.poor.n > 1 && r.cls.hi.n > 1).filter(r => per(r, 'hi') > per(r, 'mid') && per(r, 'mid') > per(r, 'low') && per(r, 'low') > per(r, 'poor')).length;
  ok('the top earns most a head, then the middle, then the hands, then the bottom', order >= 0.95 * g0.filter(r => r.cls.poor.n > 1 && r.cls.hi.n > 1).length, `${order} of ${g0.length} cities in order`);
  const cs0 = (await SC()).cs;
  ok('about one in a hundred at the top, more than a tenth in the middle', cs0.out.hi.p > 0.005 && cs0.out.hi.p < 0.04 && cs0.out.mid.p > 0.08 && cs0.out.mid.p < 0.3 && cs0.out.poor.p > 0.02, Object.entries(cs0.out).map(([q, o]) => `${q} ${(100 * o.p).toFixed(1)}% of people, ${(100 * o.s).toFixed(1)}% of money`).join(', '));
  const mk = arg => eco(`(e, a, x) => { const g = x.grid(); let cells = ''; for (let i = 0; i < g.N; i++) { const c = i % g.COLS; cells += c < g.COLS * 0.6 ? 'A' : c < g.COLS * 0.8 ? 'B' : 'C'; } e.noSlave = 0; e.states = [Object.assign({ id: 'A', name: 'รัฐใหญ่', color: '#d9534f', sys: 'feud', cur: '', rate: 1, rel: {}, slave: 'free' }, a.A || {}), Object.assign({ id: 'B', name: 'รัฐกลาง', color: '#4f8fd9', sys: 'cap', cur: '', rate: 1, rel: {}, slave: 'free' }, a.B || {}), Object.assign({ id: 'C', name: 'รัฐเล็ก', color: '#58b368', sys: 'soc', cur: '', rate: 1, rel: {}, slave: 'abol' }, a.C || {})]; e.cells = cells; e.tune = Object.assign({}, a.tune || {}); }`, arg);
  await mk({});
  const s1 = await SC(), by = Object.fromEntries(s1.books.map(b => [b.id, b]));
  ok('a feudal state is far more unequal than a socialist one', by.A.cs.gini > by.C.cs.gini + 0.2 && by.A.cs.out.hi.s > 2 * by.C.cs.out.hi.s, `feudal ${by.A.cs.gini.toFixed(2)}, capitalist ${by.B.cs.gini.toFixed(2)}, socialist ${by.C.cs.gini.toFixed(2)}`);
  // ---- 1 slaves live by the wealth at the top ----
  const slaveVsTop = async tune => { await mk({ A: { reg: 'sweat' }, tune }); const g = (await G()).filter(r => r.st === 'A' && r.cls.slave.n >= 1); return g.map(r => [r.clsW.hi, r.cls.slave.well, r.cls.mid.well]); };
  const sv = await slaveVsTop({});
  ok('the more of a city\'s money the top holds, the better its slaves live', sv.length > 5 && sv.every(([h, w]) => Math.abs(w - Math.min(100, 15 + 110 * h)) < 1e-6) && Math.max(...sv.map(x => x[1])) > Math.min(...sv.map(x => x[1])) + 5, `${sv.length} cities, slaves from ${Math.round(Math.min(...sv.map(x => x[1])))} to ${Math.round(Math.max(...sv.map(x => x[1])))}`);
  ok('and where it sits high enough they live better than the middle', sv.some(([, w, m]) => w > m), `${sv.filter(([, w, m]) => w > m).length} of ${sv.length} cities`);
  // ---- 2 the analyser ----
  await mk({});
  await p.click('#modes button[data-mode="econ"]'); await p.click('#ecoTab button[data-t="gdp"]'); await p.waitForSelector('#ecobody details[data-fold="gcl"]');
  await p.evaluate(() => { document.querySelector('#ecobody details[data-fold="gcl"]').open = true; });
  const an = await p.evaluate(() => { const d = document.querySelector('#ecobody details[data-fold="gcl"]'); return { groups: d.querySelectorAll('.clsgrp').length, text: d.textContent }; });
  ok('the GDP tab analyses where the money gathers in each state and the whole map', an.groups === 4 && /ความมั่งคั่ง \(รายได้ต่อปี\) (กระจุกที่ชนชั้นสูง|กระจุกที่ชนชั้นสูงและกลาง|กระจายถึงชนชั้นล่าง)/.test(an.text) && /ดัชนีความเหลื่อมล้ำ/.test(an.text) && /ความต้องการของฟุ่มเฟือย/.test(an.text));
  ok('a feudal state\'s money gathers at the top, a socialist one\'s reaches the hands', by.A.cs.top !== 'low' && by.C.cs.top === 'low', `feudal: ${by.A.cs.top}, socialist: ${by.C.cs.top}`);
  // ---- 3 what the not-so-rich want ----
  const g1 = await G(), lux = g1.filter(r => r.st === 'A').map(r => r.rich0), luxC = g1.filter(r => r.st === 'C').map(r => r.rich0);
  const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
  const nA = await p.evaluate(ids => ids.map(id => MME.shell.cur.rt.test.needOf(id, 'luxury')), g1.filter(r => r.st === 'A').slice(0, 30).map(r => r.id));
  await mk({ A: { sys: 'soc' } }); const nA2 = await p.evaluate(ids => ids.map(id => MME.shell.cur.rt.test.needOf(id, 'luxury')), g1.filter(r => r.st === 'A').slice(0, 30).map(r => r.id));
  ok('where the money sits high, the fine things are wanted more', avg(lux) > avg(luxC) && nA.reduce((a, b) => a + b, 0) > 1.3 * nA2.reduce((a, b) => a + b, 0), `rich share feudal ${avg(lux).toFixed(2)}, socialist ${avg(luxC).toFixed(2)}; luxury wanted ${nA.reduce((a, b) => a + b, 0).toFixed(1)} against ${nA2.reduce((a, b) => a + b, 0).toFixed(1)}`);
  await mk({});
  const dom = await p.evaluate(() => { const x = MME.shell.cur.rt.test, g = x.gdp(); const out = []; for (const cat of ['mana', 'ore', 'stone', 'salt', 'luxury', 'rare', 'herbs']) out.push([cat, g.filter(r => r.st === 'C').reduce((a, r) => a + (x.needOf(r.id, cat) || 0), 0)]); return out; });
  await eco('e => { e.states = []; e.cells = e.cells.replace(/[A-Z]/g, "."); }');
  const dom0 = await p.evaluate(ids => { const x = MME.shell.cur.rt.test; return ['mana', 'ore', 'stone', 'salt', 'luxury', 'rare', 'herbs'].map(cat => [cat, ids.reduce((a, id) => a + (x.needOf(id, cat) || 0), 0)]); }, g1.filter(r => r.st === 'C').map(r => r.id));
  ok('staples are wanted the same whoever holds the money', [2, 3].every(i => Math.abs(dom[i][1] - dom0[i][1]) < 1e-6 * Math.max(1, dom0[i][1])));
  await mk({});
  const wb = await G();
  ok('well-being falls with the staples a city lacks, a little at a time', wb.every(r => Math.abs(r.why.filter(w => w[0] === 'ของพื้นฐานที่ยังขาด').reduce((a, w) => a + w[1], 0) + (Math.abs(70 * (1 - r.metB)) >= 0.5 ? 70 * (1 - r.metB) : 0)) < 1e-6) && wb.some(r => r.metB < 0.95 && r.metB > 0.3), `${wb.filter(r => r.metB < 0.999).length} cities short of staples`);
  const cb1 = await p.evaluate(() => MME.shell.cur.rt.test.crossBasic());
  await mk({ tune: { homePref: 1.5 } }); const cb2 = await p.evaluate(() => MME.shell.cur.rt.test.crossBasic());
  await mk({ tune: { homePref: 0 } }); const cb0 = await p.evaluate(() => MME.shell.cur.rt.test.crossBasic());
  ok('the not-so-rich buy their staples at home unless the foreign is clearly cheaper', cb2.cross < cb1.cross && cb1.cross <= cb0.cross + 1e-9, `staples across borders: ${cb0.cross.toFixed(1)} with no preference, ${cb1.cross.toFixed(1)} as set, ${cb2.cross.toFixed(1)} with a strong one`);
  // ---- 6 surplus and balance ----
  await mk({});
  const s6 = await SC(), b6 = Object.fromEntries(s6.books.map(b => [b.id, b])), g6 = await G();
  const sur = s6.books.filter(b => b.net > 0 && !b.stable), def = s6.books.filter(b => b.net < 0 && !b.stable);
  ok('a state in surplus has a harder coin, one in deficit a softer', s6.fx.length >= 2 && sur.every(b => b.fx > 0) && def.every(b => b.fx < 0), s6.books.map(b => `${b.id} ${b.net >= 0 ? '+' : ''}${(100 * b.net / b.gdp).toFixed(1)}% of GDP, coin ${(100 * b.fx).toFixed(1)}%`).join('; '));
  const surState = sur[0]; const gs = g6.filter(r => r.st === (surState && surState.id));
  ok('the surplus goes to the classes that trade', !!surState && Math.abs(gs.reduce((a, r) => a + r.sur, 0) - surState.net) < 1e-3 * surState.net && gs.some(r => r.sur > 0));
  const flatFx = await (async () => { await mk({ tune: { fxBal: 0 } }); return (await SC()).fx.length; })();
  ok('with the coin held still, no state\'s coin moves', flatFx === 0);
  await mk({ tune: { balBand: 0.5 } });
  const gb = await G();
  ok('a state that trades in balance lives a little better and keeps its people', gb.filter(r => r.st !== '.').every(r => r.stable && r.why.some(w => w[0] === 'รัฐค้าสมดุล' && w[1] === 3)), `${gb.filter(r => r.stable).length} cities in balanced states`);
  const outB = gb.filter(r => r.st === 'A').reduce((a, r) => a + r.demo.out, 0); await mk({ tune: { balBand: 0 } }); const outN = (await G()).filter(r => r.st === 'A').reduce((a, r) => a + r.demo.out, 0);
  ok('fewer leave a balanced state', outB < outN, `${Math.round(outB)} leave in balance, ${Math.round(outN)} otherwise`);
  // ---- 5 the reach of a city ----
  await mk({});
  await p.click('#modes button[data-mode="trade"]'); await p.waitForTimeout(400);
  const px = () => p.evaluate(() => { const c = document.getElementById('map'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 240 && d[i + 1] > 195 && d[i + 1] < 225 && d[i + 2] > 100 && d[i + 2] < 140) n++; return n; });
  const before = await px();
  const q = await p.evaluate(() => MME.shell.cur.rt.test.cityXY('swalendaw')), xy = Array.isArray(q) ? q : [q.x, q.y]; await p.mouse.click(xy[0], xy[1]); await p.waitForTimeout(700);
  const rch = await p.evaluate(() => MME.shell.cur.rt.test.reachOf('swalendaw')), after = await px(), card = await p.textContent('#tradebody');
  ok('a city clicked in the trade view shows the land it works on the map, and says so', rch && rch.sel >= 0 && rch.ni > 20 && after > before + 60 && /เก็บเกี่ยวรอบเมือง \d+ ช่อง ไกลสุด \d+ ช่อง/.test(card), `${rch && rch.ni} hexes, ${before} -> ${after} gold pixels`);
  ok('and its classes', /ชนชั้นในเมือง/.test(card) && await p.evaluate(() => document.querySelectorAll('#tradebody .etable.g5c .etr').length >= 4));
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  await p.click('#modes button[data-mode="city"]'); await p.waitForTimeout(300); await p.mouse.click(xy[0], xy[1]); await p.waitForTimeout(700);
  ok('and in the cities mode too', (await px()) > before + 200 && /เก็บเกี่ยวรอบเมือง \d+ ช่อง/.test(await p.textContent('#cfHint')));
  await p.keyboard.press('Escape');
  // ---- the state card ----
  await p.click('#modes button[data-mode="trade"]'); await p.waitForTimeout(300);
  const st = await p.evaluate(() => { const x = MME.shell.cur.rt.test, c = x.cities().find(c => c.id === 'swalendaw'); return x.hexXY(c.h); });
  await p.mouse.click(st[0] + 60, st[1] + 60); await p.waitForTimeout(600);
  ok('a state\'s card in the trade view carries its classes and the analysis', /ชนชั้นและความมั่งคั่ง/.test(await p.textContent('#tradebody')) && /ดัชนีความเหลื่อมล้ำ/.test(await p.textContent('#tradebody')));
  // ---- one card a state ----
  await p.click('#modes button[data-mode="econ"]'); await p.click('#ecoTab button[data-t="states"]'); await p.waitForSelector('#ecobody details.scard');
  const scard = await p.evaluate(() => { const d = document.querySelector('#ecobody details.scard[data-fold="stA"]'); return { chips: d.querySelectorAll('summary .chip0').length, secs: [...d.querySelectorAll('.ssec h5')].map(h => h.textContent), f: ['sname', 'scolor', 'scur', 'srate', 'ssys', 'sslave', 'sspread', 'sreg', 'srel', 'spol'].every(f => d.querySelector(`[data-f="${f}"]`)), year: !!d.querySelector('details.sinner') }; });
  ok('everything about a state sits in one card, in sections, with its numbers at the head', scard.chips >= 4 && scard.secs.join('|') === 'ชื่อ สี และเงิน|ระบอบและกฎหมาย|ผู้คนและการทำงาน|ความสัมพันธ์กับรัฐอื่น|เมื่อขาดดุลการค้า' && scard.f && scard.year, scard.secs.join(' / '));
  await p.click('#ecobody [data-s="A"] [data-a="spaint"]'); await p.waitForTimeout(300);
  const painting = await p.evaluate(() => document.querySelector('#ecobody [data-s="A"] [data-a="spaint"]').classList.contains('on'));
  await p.click('#ecobody [data-s="A"] [data-a="spaint"]'); await p.waitForTimeout(300);
  ok('its own button paints its land, and lets go again', painting && await p.evaluate(() => !document.querySelector('#ecobody [data-s="A"] [data-a="spaint"]').classList.contains('on')));
  await p.click('#ecobody [data-s="B"] [data-a="sgo"]'); await p.waitForTimeout(600);
  const tc = await p.evaluate(() => ({ mode: MME.shell.cur.rt.state().mode, txt: document.getElementById('tradebody').textContent, folds: [...document.querySelectorAll('#tradebody details.tfold')].map(d => d.dataset.tfold) }));
  ok('from the card to the state on the trade map, with its numbers and its sections folded', tc.mode === 'trade' && /แก้ค่าของรัฐนี้/.test(tc.txt) && tc.folds.includes('sp') && tc.folds.includes('sb'));
  await p.click('#tradebody [data-sopen="B"]'); await p.waitForTimeout(600);
  ok('and back to its card, open', await p.evaluate(() => MME.shell.cur.rt.state().mode === 'econ' && document.querySelector('#ecobody details[data-fold="stB"]').open));
  await p.click('#modes button[data-mode="trade"]'); await p.waitForTimeout(300); await p.mouse.click(xy[0], xy[1]); await p.waitForTimeout(700);
  const cf = await p.evaluate(() => [...document.querySelectorAll('#tradebody details.tfold')].map(d => d.dataset.tfold));
  ok('a city\'s card on the trade map folds by section', ['rank', 'people', 'cls', 'prod', 'price', 'exp', 'imp'].every(k => cf.includes(k)), cf.join(' '));
  await p.click('#tradebody details[data-tfold="exp"] > summary'); await p.waitForTimeout(200); await p.click('#tradebody details[data-tfold="rank"] > summary'); await p.waitForTimeout(200);
  await p.keyboard.press('Escape'); await p.waitForTimeout(200); await p.mouse.click(xy[0], xy[1]); await p.waitForTimeout(600);
  ok('and remembers what was left open', await p.evaluate(() => document.querySelector('#tradebody details[data-tfold="exp"]').open && document.querySelector('#tradebody details[data-tfold="rank"]').open));
  await p.click('#tradebody details[data-tfold="exp"] > summary'); await p.click('#tradebody details[data-tfold="rank"] > summary');
  console.log('errors', errs.length + bad, errs.slice(0, 4).join(' | '));
  await browser.close();
})().catch(e => { console.error('TEST FAILED', e.message.slice(0, 900)); process.exit(1); });
