// Bazaar Worldmaker on a page of its own (GitHub Pages): who is looking, by Google sign-in, and rooms over Firebase's Realtime
// Database. On a Claude artifact the platform gives both and this file does nothing: it wakes only where the page carries a
// Firebase config (window.MME_FIREBASE, written by firebase-config.js) or a test hands it a stand-in (window.MME_FIRE_FAKE).
//
// The owner chose this road on 23 Nov 2026: a friend who came to the artifact by a public link could not reach its room, and
// the only invitation that could would have let the friend edit the page itself.
//
// What is kept on the server, and for how long. While a room is open nothing of the map rests there: its messages pass through
// three lists under bw/rooms/<room>/:
//   p/<peer>         who is here and where their pointer is. Removed when that page leaves or its line drops.
//   m/<peer>/<id>    what that page says to everyone. Each message is removed about twenty seconds after it is sent, and the
//                    whole list when that page leaves or its line drops.
//   in/<peer>/<id>   what is said to that page alone (the map, to someone coming in). Only that person's account can read it.
// A peer is "<account id>_<a few letters for this tab>". The rules of the database let an account write only under its own id,
// so the first half of a sender's name cannot be forged, which is what the code of a room and a ban both lean on.
// Since v0.18.0 the page also keeps people online, a public chat, a log of comings and goings and copies of maps, under other
// lists of bw/: see hub.js for what each is and who reads it.
(function () {
  'use strict';
  const MME = window.MME = window.MME || {};
  const cfg = window.MME_FIREBASE, fake = window.MME_FIRE_FAKE || null;
  if (!fake && !(cfg && cfg.projectId && cfg.databaseURL)) { MME.fire = null; return; }

  const subs = new Set(), hubSubs = new Set(), hubState = { anon: '' }; let user = null, api = null, state = 'loading';
  const tellHub = () => { for (const f of hubSubs) { try { f(); } catch (err) { console.error(err); } } };
  const tell = () => { for (const f of subs) { try { f(user); } catch (err) { console.error(err); } } };
  const rnd = n => { let s = ''; while (s.length < n) s += Math.random().toString(36).slice(2); return s.slice(0, n); };

  const ready = (async () => {
    if (fake) {                                         // a test stands in for the server
      api = fake; user = fake.user || null; state = 'ready'; if (typeof fake.onHub === 'function') fake.onHub(tellHub);
      if (typeof fake.onUser === 'function') fake.onUser(u => { user = u || null; tell(); });
      return true;
    }
    const V = cfg.sdkVersion || '11.0.1', base = 'https://www.gstatic.com/firebasejs/' + V + '/';
    const [{ initializeApp }, A, D] = await Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-auth.js'), import(base + 'firebase-database.js')]);
    // a name of its own: another site of the same owner lives on this address with the same project, and each keeps its own sign-in
    const app = initializeApp(cfg, 'bazaar-worldmaker'), auth = A.getAuth(app), db = D.getDatabase(app);
    let offset = 0; D.onValue(D.ref(db, '.info/serverTimeOffset'), s => { offset = +s.val() || 0; });
    // a Google account only: a nameless visitor cannot be told from the next one, so nobody could be kept out of a map
    const put = u => { user = u && !u.isAnonymous && (u.providerData || []).some(p => p.providerId === 'google.com') ? { id: u.uid, name: u.displayName || '', photo: u.photoURL || '' } : null; tell(); };
    api = {
      async signIn() { const p = new A.GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' }); const r = await A.signInWithPopup(auth, p); put(r.user); },
      signOut: () => A.signOut(auth),
      now: () => Date.now() + offset,
      stamp: () => D.serverTimestamp(),
      set: (path, val) => D.set(D.ref(db, path), val),
      push(path, val) { const r = D.push(D.ref(db, path)); return D.set(r, val).then(() => r.key); },
      remove: path => D.remove(D.ref(db, path)),
      gone: path => D.onDisconnect(D.ref(db, path)).remove(),
      added: (path, fn, bad, since) => D.onChildAdded(D.query(D.ref(db, path), D.orderByChild('t'), D.startAt(since || 0)), s => fn(s.key, s.val()), bad),
      value: (path, fn, bad) => D.onValue(D.ref(db, path), s => fn(s.val()), bad),
      connected: fn => D.onValue(D.ref(db, '.info/connected'), s => fn(!!s.val()))
    };
    // v0.18.0, the owner's ask: everyone who opens the page counts as someone online, so a visitor who has not signed in with
    // Google is signed in without a name (Firebase's anonymous accounts; the project must have that provider turned on). The rooms
    // still take a Google account only. If the provider is off, the page goes on without it and counts only the signed-in.
    let anonTried = false;
    const anon = () => { if (anonTried || cfg.anon === false) return; anonTried = true; A.signInAnonymously(auth).catch(err => { hubState.anon = 'off'; console.warn('anonymous sign-in', err && err.code); tellHub(); }).finally(() => { anonTried = false; }); };
    api.hub = {
      uid: () => auth.currentUser ? auth.currentUser.uid : null,
      anon: () => !!(auth.currentUser && auth.currentUser.isAnonymous),
      now: () => Date.now() + offset, stamp: () => D.serverTimestamp(),
      key: path => D.push(D.ref(db, path)).key,
      set: (path, val) => D.set(D.ref(db, path), val),
      update: vals => D.update(D.ref(db), vals),
      remove: path => D.remove(D.ref(db, path)),
      gone: path => D.onDisconnect(D.ref(db, path)).remove(),
      goneSet: (path, val) => D.onDisconnect(D.ref(db, path)).set(val),
      cancel: path => D.onDisconnect(D.ref(db, path)).cancel(),
      get: path => D.get(D.ref(db, path)).then(s => s.val()),
      value: (path, fn, bad) => D.onValue(D.ref(db, path), s => fn(s.val()), bad),
      since: (path, t, fn, bad) => D.onValue(D.query(D.ref(db, path), D.orderByChild('t'), D.startAt(t)), s => fn(s.val()), bad),
      before: (path, t) => D.get(D.query(D.ref(db, path), D.orderByChild('t'), D.endAt(t))).then(s => s.val()),
      inc: path => D.runTransaction(D.ref(db, path), v => (+v || 0) + 1),
      connected: fn => D.onValue(D.ref(db, '.info/connected'), s => fn(!!s.val()))
    };
    await new Promise(res => A.onAuthStateChanged(auth, u => { state = 'ready'; put(u); if (!u) anon(); tellHub(); res(); }));
    return true;
  })().catch(err => { console.error(err); state = 'failed'; tell(); return false; });

  // ---------- a room ----------
  function transport() {
    return async function join(name) {
      if (!(await ready) || !user) throw new Error('signin');
      const me = user, sess = rnd(8), id = me.id + '_' + sess, root = 'bw/rooms/' + name + '/';
      const since = api.now() - 5000, offs = [], hear = new Map(), mineKeys = [];
      let onMsg = null, onPeers = null, mine = {}, dead = false, peersNow = [{ peer: id, me: true, by: me.id, presence: mine }], pT = 0;
      const lost = err => { if (!dead) console.warn('room', err && err.code ? err.code : err); };
      const split = k => { const i = k.indexOf('_'); return i > 0 ? k.slice(0, i) : null; };
      const take = (from, v) => { if (dead || !v || typeof v.d !== 'string' || from === id) return; let o = null; try { o = JSON.parse(v.d); } catch (err) { return; } if (onMsg) onMsg(o, from, split(from)); };
      // what is said to this page alone; the sender's account is written in the message and the rules hold it to the truth
      offs.push(api.added(root + 'in/' + id, (k, v) => { if (v && typeof v.u === 'string' && /^[a-z0-9]{6,16}$/.test(String(v.f))) take(v.u + '_' + v.f, v); }, lost, since));
      // who is here; each one's own list of what they say to everyone is listened to while they are here
      const pPath = root + 'p/' + id, mPath = root + 'm/' + id;
      const pSend = () => { pT = 0; if (!dead) api.set(pPath, { s: JSON.stringify(mine), t: api.stamp() }).catch(lost); };
      offs.push(api.value(root + 'p', v => {
        if (dead) return; const list = [], seen = new Set();
        for (const k of Object.keys(v || {})) {
          const by = split(k); if (!by) continue; let p = {}; try { p = JSON.parse(v[k].s) || {}; } catch (err) { p = {}; }
          list.push({ peer: k, me: k === id, by, presence: k === id ? mine : p }); seen.add(k);
          if (k !== id && !hear.has(k)) hear.set(k, api.added(root + 'm/' + k, (mk, mv) => take(k, mv), lost, since));
        }
        for (const [k, off] of hear) if (!seen.has(k)) { try { off(); } catch (err) { /* already off */ } hear.delete(k); }
        if (!seen.has(id)) list.unshift({ peer: id, me: true, by: me.id, presence: mine });
        peersNow = list; if (onPeers) onPeers(list);
      }, lost));
      // on the line, and again each time the line comes back: say that this page is here, and have the server clear its things if it vanishes
      offs.push(api.connected(on => { if (!on || dead) return; Promise.all([api.gone(pPath), api.gone(mPath), api.gone(root + 'in/' + id)]).then(pSend).catch(lost); }));
      const sweep = setInterval(() => { const now = Date.now(); while (mineKeys.length && now - mineKeys[0].t > 20000) api.remove(mineKeys.shift().path).catch(() => {}); }, 4000);
      return {
        id, max: 60000, cut: 48000,                       // this line carries long messages whole, so a map crosses in tens of parts where the artifact's room needs hundreds
        send(obj) {
          if (dead) return;
          const to = obj && typeof obj.to === 'string' && /^[A-Za-z0-9]{1,128}_[a-z0-9]{6,16}$/.test(obj.to) ? obj.to : null;
          const path = to ? root + 'in/' + to : mPath, body = to ? { u: me.id, f: sess, d: JSON.stringify(obj), t: api.stamp() } : { d: JSON.stringify(obj), t: api.stamp() };
          api.push(path, body).then(k => { if (k) mineKeys.push({ path: path + '/' + k, t: Date.now() }); }).catch(lost);
        },
        onMsg(fn) { onMsg = fn; }, onPeers(fn) { onPeers = fn; fn(peersNow); },
        presence(obj) { mine = { ...mine, ...obj }; for (const k in mine) if (mine[k] === null) delete mine[k]; if (!pT) pT = setTimeout(pSend, 130); if (onPeers) { peersNow = peersNow.map(p => p.me ? { ...p, presence: mine } : p); onPeers(peersNow); } },
        leave() {
          if (dead) return Promise.resolve(); dead = true; clearInterval(sweep); clearTimeout(pT);
          for (const f of offs) { try { f(); } catch (err) { /* already off */ } } for (const off of hear.values()) { try { off(); } catch (err) { /* already off */ } }
          return Promise.all([api.remove(pPath), api.remove(mPath), api.remove(root + 'in/' + id)].map(p => p.catch(() => {})));
        }
      };
    };
  }

  MME.fire = {
    ready, transport,
    get user() { return user; }, get state() { return state; },
    // what the menu's people online, the public chat and the owner's back office reach the database with (see hub.js); null where
    // the stand-in of a test has none of it
    get hub() { return api && api.hub ? api.hub : null; }, hubState,
    onHub(fn) { hubSubs.add(fn); return () => hubSubs.delete(fn); },
    onUser(fn) { subs.add(fn); return () => subs.delete(fn); },
    async signIn() { if (!(await ready)) throw new Error('unavailable'); await api.signIn(); return user; },
    async signOut() { if (await ready) await api.signOut(); }
  };
})();
