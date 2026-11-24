// A stand-in for the Realtime Database for hub.js (v0.18.0): people online, the public chat, copies of maps and the back office.
// The tabs of one test browser share one tree over a BroadcastChannel. It keeps the habits of the real one that hub.js leans on
// (paths, a listener on a path's value, a list read from a time on, removal and writes when a page goes away) and the rules
// that matter here: what only an admin reads, a chat line only from a Google account, three seconds between lines, and the
// clearing of what was said before midnight.
module.exports = function makeHubFake(opts) {
  const bc = new BroadcastChannel('mme-fakehub'), tree = {}, valueL = new Set(), userL = new Set(), hubL = new Set(), gone = new Map();
  let anonUid = opts.anonUid, user = opts.signedIn ? { id: opts.uid, name: opts.name, photo: '' } : null;
  const uidNow = () => user ? user.id : anonUid;
  const split = p => p.split('/').filter(Boolean);
  const get = path => { let o = tree; for (const k of split(path)) { if (o == null || typeof o !== 'object') return null; o = o[k]; } return o === undefined ? null : JSON.parse(JSON.stringify(o)); };
  const put = (path, val) => { const ks = split(path); let o = tree; for (let i = 0; i < ks.length - 1; i++) { if (o[ks[i]] == null || typeof o[ks[i]] !== 'object') o[ks[i]] = {}; o = o[ks[i]]; } if (val == null) delete o[ks[ks.length - 1]]; else o[ks[ks.length - 1]] = val; };
  const fireAll = () => { for (const l of valueL) { try { l.call(); } catch (err) { console.error(err); } } };
  const apply = op => { if (op.op === 'set') put(op.path, op.val); else if (op.op === 'upd') for (const [p, v] of Object.entries(op.vals)) put(p, v); fireAll(); };
  const stamp = v => { const n = Date.now(); const walk = x => x === '@now' ? n : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, y]) => [k, walk(y)])) : x; return walk(v); };
  const send = op => { apply(op); bc.postMessage(op); };
  bc.onmessage = e => { const op = e.data; if (op.op === 'hello') bc.postMessage({ op: 'sync', tree: JSON.parse(JSON.stringify(tree)) }); else if (op.op === 'sync') { const merge = (a, b) => { for (const [k, v] of Object.entries(b)) { if (v && typeof v === 'object' && a[k] && typeof a[k] === 'object') merge(a[k], v); else if (!(k in a)) a[k] = v; } }; merge(tree, op.tree); fireAll(); } else apply(op); };
  bc.postMessage({ op: 'hello' });
  addEventListener('pagehide', () => { for (const [p, v] of gone) bc.postMessage({ op: 'set', path: p, val: v }); });
  const isAdmin = () => get('bw/admin/' + uidNow()) === true || (!!user && !!opts.email && opts.email === opts.adminEmail);   // the rules name an admin by a verified email too
  const deny = what => { window.__hubDenied = (window.__hubDenied || []).concat([what]); const e = new Error('PERMISSION_DENIED ' + what); e.code = 'PERMISSION_DENIED'; return e; };
  const ADMIN_READ = /^bw\/(who|log|users|mapix|maps|chatban)$/;
  const mayRead = path => { if (ADMIN_READ.test(path) || /^bw\/(who|log|users)\//.test(path)) return isAdmin(); const m = /^bw\/(maps|mapix|admin|chatban)\/([^/]+)/.exec(path); if (m) return m[2] === uidNow() || (m[1] !== 'admin' && isAdmin()); return true; };
  const midnight = t => t - ((t + 25200000) % 86400000);
  const mayWrite = (path, val, all) => {
    const u = uidNow(); let m;
    if ((m = /^bw\/(on|who)\/([^/]+)$/.exec(path))) return m[2].startsWith(u + '_');
    if ((m = /^bw\/chat\/([^/]+)$/.exec(path))) {
      const old = get(path);
      if (val == null) return !!old && (isAdmin() || old.u === u || old.t < midnight(Date.now()));
      return !!user && !old && val.u === u && get('bw/chatban/' + u) !== true && all && all['bw/chatlast/' + u] != null;
    }
    if ((m = /^bw\/chatlast\/([^/]+)$/.exec(path))) { const last = get(path); return m[1] === u && (last == null || last < Date.now() - 3000); }
    if (/^bw\/chatban\//.test(path)) return isAdmin();
    if ((m = /^bw\/(users|maps|mapix)\/([^/]+)/.exec(path))) return m[2] === u || (m[1] !== 'users' && val == null && isAdmin());
    if (/^bw\/log\/[^/]+\/[^/]+$/.test(path)) return val == null ? isAdmin() : !get(path) && val.u === u;
    if (path === 'bw/log') return isAdmin();
    return false;
  };
  const hub = {
    uid: uidNow, anon: () => !user, now: () => Date.now(), stamp: () => '@now',
    key: () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    async set(path, val) { if (!mayWrite(path, val)) throw deny('set ' + path); send({ op: 'set', path, val: stamp(val) }); },
    async update(vals) { for (const [p, v] of Object.entries(vals)) if (!mayWrite(p, v, vals)) throw deny('update ' + p); send({ op: 'upd', vals: stamp(vals) }); },
    async remove(path) { if (!mayWrite(path, null)) throw deny('remove ' + path); send({ op: 'set', path, val: null }); },
    async gone(path) { gone.set(path, null); }, async goneSet(path, val) { gone.set(path, stamp(val)); }, async cancel(path) { gone.delete(path); },
    async get(path) { if (!mayRead(path)) throw deny('read ' + path); return get(path); },
    value(path, fn, bad) { if (!mayRead(path)) { setTimeout(() => bad && bad(deny('read ' + path)), 0); return () => {}; } let last; const l = { call() { const v = get(path), s = JSON.stringify(v); if (s !== last) { last = s; fn(v); } } }; valueL.add(l); setTimeout(() => l.call(), 0); return () => valueL.delete(l); },
    since(path, t, fn, bad) { if (!mayRead(path)) { setTimeout(() => bad && bad(deny('read ' + path)), 0); return () => {}; } let last; const l = { call() { const all = get(path) || {}, v = Object.fromEntries(Object.entries(all).filter(([, x]) => x && x.t >= t)), s = JSON.stringify(v); if (s !== last) { last = s; fn(Object.keys(v).length ? v : null); } } }; valueL.add(l); setTimeout(() => l.call(), 0); return () => valueL.delete(l); },
    async before(path, t) { if (!mayRead(path)) throw deny('read ' + path); const all = get(path) || {}; const v = Object.fromEntries(Object.entries(all).filter(([, x]) => x && x.t <= t)); return Object.keys(v).length ? v : null; },
    connected(fn) { setTimeout(() => fn(true), 40); return () => {}; }
  };
  if (opts.admin) setTimeout(() => send({ op: 'set', path: 'bw/admin/' + opts.uid, val: true }), 0);
  return {
    hub, get user() { return user; }, onUser(fn) { userL.add(fn); }, onHub(fn) { hubL.add(fn); },
    async signIn() { user = { id: opts.uid, name: opts.name, photo: '' }; for (const f of userL) f(user); for (const f of hubL) f(); },
    async signOut() { user = null; for (const f of userL) f(null); for (const f of hubL) f(); },
    now: () => Date.now(), stamp: () => '@now', set: async () => {}, push: async () => '', remove: async () => {}, gone: async () => {}, added: () => () => {}, value: () => () => {}, connected: () => () => {},
    _get: get, _put: (path, val) => send({ op: 'set', path, val })
  };
};
