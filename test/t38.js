// v0.15.1: the settings that live in the side panel can always be found: a hidden panel is named in the options and comes back
// when a tab or a city asks for it; a folded card unfolds
const { chromium } = require('playwright');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await (await browser.newContext({ viewport: { width: 1366, height: 768 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8765/index.html'); await p.waitForSelector('.mapcard[data-id="gresland"]', { timeout: 60000 }); await p.click('.mapcard[data-id="gresland"] [data-act="open"]');
  await p.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable && MME.shell.cur.rt.state().econ, null, { timeout: 90000 }); await p.waitForTimeout(3000);
  ok(/0\.15\.\d/.test(await p.evaluate(() => MME.VERSION)), 'version 0.15.1');
  const asideOn = () => p.evaluate(() => { const a = document.querySelector('#mapscreen aside'); return !!a && getComputedStyle(a).display !== 'none'; });
  const vis = sel => p.evaluate(s => { const e = document.querySelector(s); return !!e && !!e.offsetParent && getComputedStyle(e).display !== 'none'; }, sel);
  await p.click('#modes button[data-mode="econ"]'); await p.waitForTimeout(300);
  ok(!(await vis('#opts [data-for="econ"] .sidehint')), 'with the side panel shown the options say nothing of it');
  await p.click('#panSide'); await p.waitForTimeout(300);
  ok(!(await asideOn()), 'the side panel can be hidden');
  ok(await vis('#opts [data-for="econ"] .sidehint'), 'then the economy options say where the settings went');
  await p.click('#opts [data-for="econ"] .sidehint [data-reveal]'); await p.waitForTimeout(400);
  ok(await asideOn(), 'and its button brings the panel back');
  await p.click('#panSide'); await p.waitForTimeout(300);
  await p.click('#ecoTab button[data-t="states"]'); await p.waitForTimeout(600);
  ok(await asideOn() && await vis('#ecobody [data-a="snew"]'), 'picking the tab of states brings the panel back with its button to add a state');
  await p.click('#ecocard > h2'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.getElementById('ecocard').classList.contains('shut')), 'the economy card folds');
  await p.click('#ecoTab button[data-t="goods"]'); await p.waitForTimeout(600);
  ok(!(await p.evaluate(() => document.getElementById('ecocard').classList.contains('shut'))) && await vis('#ecobody'), 'picking a tab unfolds it');
  // the city card of the trade view
  await p.click('#panSide'); await p.waitForTimeout(300);
  await p.click('#modes button[data-mode="trade"]'); await p.waitForTimeout(500);
  ok(await vis('#opts [data-for="trade"] .sidehint'), 'the trade options say the city cards are in the hidden panel');
  const xy = await p.evaluate(() => MME.shell.cur.rt.test.cityXY('luxonia')); await p.mouse.click(xy[0], xy[1]); await p.waitForTimeout(800);
  ok(await asideOn() && await vis('#tradebody'), 'clicking a city brings the panel back with its card');
  // the world's settings on the map's own bar
  await p.click('#modes button[data-mode="view"]'); await p.click('#panSide'); await p.waitForTimeout(300);
  ok(await vis('.ctl .setpick') && !(await asideOn()), 'the map bar carries the world\'s settings while the side panel is hidden');
  await p.click('.setpick [data-eco="states"]'); await p.waitForTimeout(700);
  ok(await p.evaluate(() => MME.shell.cur.rt.state().mode === 'econ') && await asideOn() && await vis('#ecobody [data-a="snew"]'), 'its states button opens the economy tool at the states, the panel shown with the button to add a state');
  ok(await p.evaluate(() => document.querySelector('.setpick [data-eco="states"]').getAttribute('aria-pressed') === 'true'), 'and marks itself');
  const top = await p.evaluate(() => { const a = document.querySelector('#mapscreen aside').getBoundingClientRect(), c = document.getElementById('ecocard').getBoundingClientRect(); return c.top - a.top; });
  ok(top < 60, `the economy card comes to the top of the panel (${Math.round(top)} px)`);
  ok(await p.evaluate(() => (document.scrollingElement || document.documentElement).scrollTop === 0), 'the page itself does not scroll away from the map');
  await p.click('.setpick [data-eco="gdp"]'); await p.waitForTimeout(700);
  ok(await p.evaluate(() => document.querySelector('#ecoTab button[data-t="gdp"]').getAttribute('aria-pressed') === 'true'), 'the coin button opens the tab of GDP and coin');
  await p.click('#modes button[data-mode="terrain"]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => [...document.querySelectorAll('.setpick [data-eco]')].every(b => b.getAttribute('aria-pressed') === 'false')), 'leaving the economy tool unmarks the buttons');
  // the side panel's state is remembered as before
  await p.click('#panSide'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => JSON.parse(localStorage.getItem('mme-panels')).side === false), 'hiding the panel is still remembered');
  await p.click('#panSide');
  ok(errs.length === 0, 'no page errors ' + errs.slice(0, 2).join(' | '));
  await browser.close(); console.log(fails ? fails + ' FAILED' : 'ALL OK'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('FAILED', e.message.slice(0, 600)); process.exit(1); });
