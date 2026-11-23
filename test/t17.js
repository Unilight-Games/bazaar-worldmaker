// the room on a bad line, many rooms at once without a browser: every page's own work must survive and all copies must end the same
const fs = require('fs'), path = require('path');
const NET = process.env.NET ? JSON.parse(process.env.NET) : { delay: 600, jitter: 900, loss: 0.2 }, ROOMS = +(process.env.ROOMS || 8), LIMIT = +(process.env.LIMIT || 90000);
global.window = global; window.addEventListener = () => {}; window.removeEventListener = () => {};
const mem = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; };
global.localStorage = mem(); global.sessionStorage = mem(); localStorage.setItem('mme-net', JSON.stringify(NET));
for (const f of ['store.js', 'net.js']) new Function(fs.readFileSync(path.join(__dirname, '../src', f), 'utf8'))();
const MME = window.MME, K = MME.DOCKEYS, sleep = ms => new Promise(r => setTimeout(r, ms));
const N = 23000, rnd = n => Math.floor(Math.random() * n);
const fresh = () => { const d = {}; for (const k of K) d[k] = null; let s = ''; for (let i = 0; i < N; i++) s += 'swgfd'[rnd(5)]; d.terrain = { v: 1, cols: 200, rows: 115, cells: s }; d.cities = { v: 1, hidden: [], cities: [] }; return d; };
const page = db => { const local = {}; for (const k of K) db.doc('map/' + k).onSnapshot(s => { local[k] = s.data(); }); return local; };
async function room(i) {
  const code = MME.roomCode(), docs = fresh(), hdb = MME.MapDb(MME.memoryBack(docs)); const hl = page(hdb); await sleep(50);
  const host = await MME.hostRoom({ join: MME.transports.tabs(), code, name: 'เจ้าของ', meta: () => ({ title: 'r' + i }), db: hdb });
  const pages = [{ n: 'A', db: hdb, local: hl }], t0 = Date.now(), joins = [];
  for (const n of ['B', 'C']) {
    const tj = Date.now(); let ended = null;
    const g = await MME.joinRoom({ join: MME.transports.tabs(), code: host.code, name: n, onEnd: why => { ended = why; } }).catch(e => ({ err: e.message }));
    if (g.err) return { i, fail: n + ' could not join: ' + g.err };
    joins.push(Date.now() - tj); const p = { n, db: g.db, local: page(g.db), room: g.room, get ended() { return ended; } }; pages.push(p);
  }
  await sleep(1500);
  // every page writes its own mark three times: fifteen cells of terrain each time, in a band of its own, and a city
  const marks = [];
  await Promise.all(pages.map(async (p, pi) => { for (let r = 0; r < 3; r++) { await sleep(rnd(1500)); const t = JSON.parse(JSON.stringify(p.local.terrain)), a = t.cells.split(''); const at = 1000 + pi * 5000 + r * 100; for (let q = 0; q < 15; q++) a[at + q] = 'X'; t.cells = a.join(''); await p.db.doc('map/terrain').set(t); marks.push([p.n, at]);
    const c = JSON.parse(JSON.stringify(p.local.cities)); c.cities.push({ id: 'c' + p.n + r, name: p.n + r, x: 1, y: 2 }); await p.db.doc('map/cities').set(c); p.local.cities = c; p.local.terrain = t; } }));
  const tw = Date.now(); let same = -1;
  const hs = p => K.map(k => MME.sync.hash(k, p.db.known(k))).join(' ');
  while (Date.now() - tw < LIMIT) { const h = pages.map(hs); if (h.every(x => x === h[0])) { same = Date.now() - tw; break; } await sleep(400); }
  const lost = []; for (const p of pages) { const cells = (p.db.known('terrain') || {}).cells || '', ids = new Set(((p.db.known('cities') || {}).cities || []).map(c => c.id)); for (const [n, at] of marks) if (cells.slice(at, at + 15) !== 'XXXXXXXXXXXXXXX') lost.push(p.n + ' lacks terrain of ' + n + '@' + at); for (const q of pages) for (let r = 0; r < 3; r++) if (!ids.has('c' + q.n + r)) lost.push(p.n + ' lacks city c' + q.n + r); }
  const out = pages.filter(p => p.ended).map(p => p.n + ' put out: ' + p.ended);
  for (const p of pages) if (p.room) p.room.close(); host.close();
  return { i, joins, same, lost, out };
}
(async () => {
  const rs = await Promise.all([...Array(ROOMS)].map((_, i) => room(i))); let bad = 0;
  for (const r of rs) { const ok = !r.fail && r.same >= 0 && !r.lost.length && !r.out.length; if (!ok) bad++; console.log('room', r.i, r.fail || ('join ms ' + r.joins.join(' ') + ' | same after ' + r.same + ' ms | lost ' + r.lost.length + (r.lost.length ? ' (' + r.lost.slice(0, 4).join('; ') + ')' : '') + (r.out.length ? ' | ' + r.out.join('; ') : '')), ok ? 'OK' : 'BAD'); }
  console.log(bad ? 'ROOMS BAD ' + bad + ' of ' + rs.length : 'ALL ' + rs.length + ' ROOMS OK', '| line', JSON.stringify(NET));
  setTimeout(() => process.exit(bad ? 1 : 0), 300);
})();
