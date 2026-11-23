// the second copy of the library on the host page, played by a stand-in store shared between two browsers of one person
const { chromium } = require('./_fit');
const URL = 'http://localhost:8765/index.html?fit=0';
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const SRV = new Map(), log = []; let down = new Set();
  const open = async (name, uid) => {
    const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } }); const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', e => errs.push(name + ' PAGEERR ' + e.message)); page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|Failed to load resource/.test(m.text())) errs.push(name + ' CONSOLE ' + m.text()); });
    await page.exposeFunction('__srv', (op, path, body) => {
      if (down.has(name)) return { err: 'unavailable' };
      if (op !== 'get' && op !== 'list') log.push(op + ' ' + path);
      if (!path.startsWith('data/users/' + uid + '/') && path !== 'data/users/' + uid) return op === 'get' ? { exists: false } : op === 'list' ? { docs: [] } : { err: 'invalid_argument' };
      if (op === 'get') return SRV.has(path) ? { exists: true, body: SRV.get(path) } : { exists: false };
      if (op === 'set') { if (JSON.stringify(body).length > 262144) return { err: 'invalid_argument' }; SRV.set(path, body); return {}; }
      if (op === 'delete') { SRV.delete(path); return {}; }
      if (op === 'list') return { docs: [...SRV].filter(([p]) => p.startsWith(path + '/') && p.slice(path.length + 1).indexOf('/') < 0).map(([p, b]) => ({ id: p.slice(path.length + 1), body: b })) };
    });
    await page.addInitScript(id => {
      const snap = (i, r) => ({ id: i, exists: !!r.exists, data: () => r.body, metadata: { fromCache: false, hasPendingWrites: false } });
      const go = async (op, path, body) => { const r = await window.__srv(op, path, body); if (r && r.err) throw { code: r.err, message: r.err }; return r; };
      const doc = path => ({ id: path.split('/').pop(), path, get: async () => snap(path.split('/').pop(), await go('get', path)), set: b => go('set', path, b), delete: () => go('delete', path), update: b => go('set', path, b), onSnapshot: () => () => {} });
      const q = (path, fs) => ({ where: (f, op, v) => q(path, [...fs, [f, op, v]]), doc: i => doc(path + '/' + i), get: async () => { const r = await go('list', path); const docs = r.docs.filter(d => fs.every(([f, op, v]) => op === '==' ? d.body[f] === v : op === 'in' ? v.includes(d.body[f]) : true)).map(d => snap(d.id, { exists: true, body: d.body })); return { docs, size: docs.length, empty: !docs.length }; } });
      const db = { doc, collection: path => q(path, []) }, user = { id: async () => id, isOwner: async () => true };
      window.claude = { use: n => new Promise(res => setTimeout(() => res(n === 'db' ? db : n === 'user' ? user : null), 120)) };
    }, uid);
    const st = () => page.evaluate(() => MME.shell.cur && MME.shell.cur.rt ? MME.shell.cur.rt.state() : null);
    const lib = () => page.evaluate(async () => { await MME.backup.idle(); const out = []; for (const m of await MME.store.list()) { const t = await MME.store.getDoc(m.id, 'terrain'); out.push(m.title + ':' + (t && t.cells ? t.cells.length - (t.cells.match(/[.S]/g) || []).length : '-') + ':' + ((MME.backup.status(m.id) || {}).state || '?')); } return out.sort().join(' | '); });
    const settle = async () => { await page.evaluate(async () => { await MME.backup.sync(); await MME.backup.idle(); }); await page.waitForTimeout(300); };
    const paint = async (title, fx, fy) => {
      await page.click(`.mapcard:has(h3:text-is("${title}")) [data-act="open"]`); await page.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable, null, { timeout: 60000 }); await page.waitForTimeout(500);
      await page.click('#modes button[data-mode="terrain"]'); await page.click('#pal .sw[data-b="g"]');
      const b = await page.evaluate(() => { const t = MME.shell.cur.rt.test, a = t.pt(0, 0), c = t.pt(1, 1); return { x: a[0], y: a[1], w: c[0] - a[0], h: c[1] - a[1] }; });
      await page.mouse.move(b.x + b.w * fx, b.y + b.h * fy); await page.mouse.down(); for (let k = 1; k <= 8; k++) await page.mouse.move(b.x + b.w * fx + k * 7, b.y + b.h * fy + k * 3); await page.mouse.up(); await page.waitForTimeout(900);
      const land = (await st()).land; await page.evaluate(() => window.scrollTo(0, 0)); await page.click('#mmBack'); await page.waitForSelector('.mapcard'); return land;
    };
    return { name, ctx, page, errs, lib, settle, paint };
  };
  // one person, first browser: a new map, some work, and the copy follows
  const A = await open('A', 'u1'); await A.page.goto(URL); await A.page.waitForSelector('.mapcard'); await A.settle();
  console.log('A first visit:', await A.lib());
  await A.page.click('#newBtn'); await A.page.fill('#nmTitle', 'ผืนทดสอบ'); await A.page.fill('#nmSeed', '31'); await A.page.dispatchEvent('#nmSeed', 'input'); await A.page.waitForTimeout(300); await A.page.click('#nmCreate');
  await A.page.waitForFunction(() => MME.shell.cur && MME.shell.cur.rt && MME.shell.cur.rt.state().editable, null, { timeout: 60000 }); await A.page.waitForTimeout(600); await A.page.click('#mmBack'); await A.page.waitForSelector('.mapcard');
  const landA = await A.paint('ผืนทดสอบ', 0.05, 0.05); await A.settle();
  console.log('A after work: land', landA, '|', await A.lib(), '| card:', (await A.page.$eval('.mapcard:has(h3:text-is("ผืนทดสอบ")) .bk2', e => e.textContent)));
  console.log('store holds', SRV.size, 'documents | kinds', [...SRV.values()].map(b => b.kind).sort().join(',').replace(/(part,)+part/, m => 'part×' + m.split(',').length), '| anything outside the person\'s own corner:', [...SRV.keys()].filter(p => !p.startsWith('data/users/u1/')).length, '| writes to the old map/ documents:', log.filter(l => / map\//.test(l)).length);
  // the same person on a browser with nothing in it
  const B = await open('B', 'u1'); await B.page.goto(URL); await B.page.waitForSelector('.mapcard'); await B.settle();
  console.log('B first visit, empty browser:', await B.lib());
  // B works; A, untouched since, takes the later state at its next look
  const landB = await B.paint('ผืนทดสอบ', 0.5, 0.05); await B.settle(); await A.page.reload(); await A.page.waitForSelector('.mapcard'); await A.settle();
  console.log('B worked: land', landB, '| A after a reload:', await A.lib(), landB > landA ? '' : 'NO GROWTH');
  // both work while A cannot reach the store: A must not lose its work and must not overwrite B's
  down.add('A'); const landA2 = await A.paint('ผืนทดสอบ', 0.9, 0.05); await A.settle();
  const landB2 = await B.paint('ผืนทดสอบ', 0.3, 0.05); await B.settle();
  console.log('A away from the store:', await A.lib());
  down.delete('A'); await A.page.reload(); await A.page.waitForSelector('.mapcard'); await A.settle();
  console.log('both worked (A', landA2, 'B', landB2 + '): A sees', await A.lib());
  await A.page.click('.mapcard:has(h3:text-is("ผืนทดสอบ")) [data-act="bkTheirs"]'); await A.page.waitForFunction(() => document.querySelectorAll('.mapcard').length === 3, null, { timeout: 20000 }); await A.settle();
  console.log('A takes the copy and keeps its own as a second map:', await A.lib());
  // another person on the same page sees none of it
  const C = await open('C', 'u2'); await C.page.goto(URL); await C.page.waitForSelector('.mapcard'); await C.settle();
  console.log('another person:', await C.lib());
  // A deletes a map: B is told and keeps its own until the owner says
  const del = A.page.locator('.mapcard:has(h3:text-is("ผืนทดสอบ")) .acts [data-act="del"]').first(); await del.click(); await del.click(); await A.page.waitForFunction(() => document.querySelectorAll('.mapcard').length === 2); await A.settle();
  await B.page.reload(); await B.page.waitForSelector('.mapcard'); await B.settle();
  console.log('A deleted it: A', await A.lib(), '|| B', await B.lib());
  await A.page.reload(); await A.page.waitForSelector('.mapcard'); await A.settle(); console.log('A after a reload, the deleted map stays away:', await A.lib());
  // switched off: nothing more is written
  const n0 = log.length; await B.page.click('#bakOn'); await B.paint('ผืนทดสอบ', 0.7, 0.05); await B.page.waitForTimeout(2500);
  console.log('B switched the copy off: writes after that', log.length - n0, '| note:', (await B.page.textContent('#storeNote')).slice(0, 60));
  console.log('errors', [...A.errs, ...B.errs, ...C.errs].length, [...A.errs, ...B.errs, ...C.errs].slice(0, 4).join(' | '));
  await browser.close();
})().catch(e => { console.error('TEST FAILED', e.message.slice(0, 900)); process.exit(1); });
