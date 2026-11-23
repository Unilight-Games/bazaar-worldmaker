// A stand-in for the Realtime Database, shared by the tabs of one test browser over a BroadcastChannel. It keeps the few
// habits of the real one that the room leans on: lists of records, a listener for new children, a listener for a list's
// whole value, removal when a page goes away, and the rule that an account writes only under its own id.
module.exports = function makeFake(opts) {
  const bc = new BroadcastChannel('mme-fakefire'), tree = new Map(), addedL = new Set(), valueL = new Set(), userL = new Set(), gone = new Set();
  let user = opts.signedIn ? { id: opts.uid, name: opts.name, photo: '' } : null;
  const parent = p => p.slice(0, p.lastIndexOf('/')), leaf = p => p.slice(p.lastIndexOf('/') + 1);
  const kids = path => { const pre = path + '/', out = {}; for (const [k, v] of tree) if (k.startsWith(pre) && !k.slice(pre.length).includes('/')) out[k.slice(pre.length)] = v; return out; };
  const fireValue = path => { for (const l of valueL) if (l.path === path) l.fn(Object.keys(kids(path)).length ? kids(path) : null); };
  const apply = op => {
    if (op.op === 'set') { tree.set(op.path, op.val); const par = parent(op.path), key = leaf(op.path); for (const l of addedL) if (l.path === par && !l.seen.has(key) && (op.val.t || 0) >= l.since) { l.seen.add(key); l.fn(key, op.val); } fireValue(par); }
    else if (op.op === 'rm') { const hit = new Set(); for (const k of [...tree.keys()]) if (k === op.path || k.startsWith(op.path + '/')) { tree.delete(k); hit.add(parent(k)); } for (const p of hit) fireValue(p); }
  };
  const send = op => { apply(op); bc.postMessage(op); };
  bc.onmessage = e => { const op = e.data; if (op.op === 'hello') bc.postMessage({ op: 'sync', entries: [...tree] }); else if (op.op === 'sync') { for (const [k, v] of op.entries) if (!tree.has(k)) apply({ op: 'set', path: k, val: v }); } else apply(op); };
  bc.postMessage({ op: 'hello' });
  addEventListener('pagehide', () => { for (const p of gone) bc.postMessage({ op: 'rm', path: p }); });
  // the rules, as far as the room leans on them
  const mayWrite = path => { const m = /^bw\/rooms\/mm-[a-z0-9]{6}\/(p|m|in)\/([^/]+)(\/[^/]+)?$/.exec(path); if (!m || !user) return false; return m[1] === 'in' ? true : m[2].startsWith(user.id + '_'); };
  const mayRead = path => { const m = /^bw\/rooms\/mm-[a-z0-9]{6}\/(p|m\/[^/]+|in\/([^/]+))$/.exec(path); if (!m || !user) return false; return !m[2] || m[2].startsWith(user.id + '_'); };
  const deny = what => { window.__fakeDenied = (window.__fakeDenied || []).concat([what]); const e = new Error('PERMISSION_DENIED ' + what); e.code = 'PERMISSION_DENIED'; return e; };
  return {
    get user() { return user; }, onUser(fn) { userL.add(fn); },
    async signIn() { if (opts.refuse) throw new Error('popup closed'); user = { id: opts.uid, name: opts.name, photo: '' }; for (const f of userL) f(user); },
    async signOut() { user = null; for (const f of userL) f(null); },
    now: () => Date.now(), stamp: () => '@now',
    async set(path, val) { if (!mayWrite(path)) throw deny('set ' + path); const v = { ...val }; if (v.t === '@now') v.t = Date.now(); if (v.u && v.u !== user.id) throw deny('forged ' + path); send({ op: 'set', path, val: v }); },
    async push(path, val) { const key = Date.now().toString(36) + Math.random().toString(36).slice(2, 8); await this.set(path + '/' + key, val); return key; },
    async remove(path) { send({ op: 'rm', path }); },
    async gone(path) { gone.add(path); },
    added(path, fn, bad, since) { if (!mayRead(path)) { setTimeout(() => bad && bad(deny('read ' + path)), 0); return () => {}; } const l = { path, fn, since: since || 0, seen: new Set() }; addedL.add(l); setTimeout(() => { for (const [k, v] of Object.entries(kids(path))) if (!l.seen.has(k) && (v.t || 0) >= l.since) { l.seen.add(k); fn(k, v); } }, 0); return () => addedL.delete(l); },
    value(path, fn, bad) { if (!mayRead(path)) { setTimeout(() => bad && bad(deny('read ' + path)), 0); return () => {}; } const l = { path, fn }; valueL.add(l); setTimeout(() => fn(Object.keys(kids(path)).length ? kids(path) : null), 0); return () => valueL.delete(l); },
    connected(fn) { setTimeout(() => fn(true), 60); return () => {}; },
    _tree: () => [...tree.keys()]
  };
};
