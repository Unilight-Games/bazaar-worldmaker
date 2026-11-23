// Map Maker Engine: working on one map together. The owner's browser holds the map and is the room; friends who join
// get a copy in memory only, every change travels as a small difference, and when the owner leaves the room is over.
// The transport is a thin layer on purpose: the Claude artifact room today, a WebSocket or WebRTC relay on another host later.
(function () {
  const MME = window.MME = window.MME || {};
  const DOCKEYS = MME.DOCKEYS;

  // ---------- differences between two versions of a document ----------
  // each document is a few lists of things with an id, a few sets, a few maps and a few plain values; the terrain is one long string
  const SCHEMA = {
    terrain: { str: ['cells'], whole: ['v', 'cols', 'rows', 'rivOff', 'rivSig'] },
    rivers: { byId: ['rivers'], whole: ['v'] },
    cities: { byId: ['cities'], set: ['hidden'], whole: ['v'] },
    marks: { byId: ['labels'], set: ['lhidden'], whole: ['v', 'stanther'] },
    routes: { byId: ['routes'], set: ['hidden'], whole: ['v'] },
    info: { map: ['zones', 'biomes', 'kinds'], byId: ['points'], set: ['phidden'], whole: ['v'] },
    trade: { byId: ['links'], set: ['hidden'], map: ['hubs', 'parent'], whole: ['v'] },
    economy: { map: ['goods', 'cats', 'pop', 'danger', 'tune', 'work'], byId: ['custom', 'states', 'ucats'], str: ['cells'], whole: ['v', 'unit', 'central', 'auto'] },
    climate: { map: ['e', 'p', 't', 'st', 'sp'], byId: ['seasons'], whole: ['v', 'set'] }
  };
  const J = v => JSON.stringify(v === undefined ? null : v);
  const sync = {
    diff(k, a, b) {
      const S = SCHEMA[k], d = {}; a = a || {}; b = b || {};
      for (const f of S.str || []) {
        const x = a[f] || '', y = b[f] || '';
        if (x.length !== y.length) { if (x !== y) (d.w = d.w || {})[f] = y; continue; }
        let s = ''; for (let i = 0; i < y.length; i++) if (x[i] !== y[i]) s += (s ? ',' : '') + i.toString(36) + y[i];
        if (s) (d.s = d.s || {})[f] = s;
      }
      for (const f of S.byId || []) {
        const A = new Map((a[f] || []).map(o => [o.id, J(o)])), set = [], del = [];
        const seen = new Set();
        const mod = [], Ao = new Map((a[f] || []).map(o => [o.id, o]));
        for (const o of b[f] || []) {
          seen.add(o.id); if (A.get(o.id) === J(o)) continue;
          const was = Ao.get(o.id);
          if (!was) { set.push(o); continue; }
          // a thing both copies know: only the fields this side changed travel, so two people changing different fields both keep theirs
          const fs = {}, gone = [];
          for (const key of Object.keys(o)) if (J(was[key]) !== J(o[key])) fs[key] = o[key];
          for (const key of Object.keys(was)) if (!(key in o)) gone.push(key);
          mod.push(gone.length ? [o.id, fs, gone] : [o.id, fs]);
        }
        for (const id of A.keys()) if (!seen.has(id)) del.push(id);
        if (set.length || del.length || mod.length) (d.i = d.i || {})[f] = mod.length ? [set, del, mod] : [set, del];
      }
      for (const f of S.set || []) {
        const A = new Set(a[f] || []), B = new Set(b[f] || []), add = [...B].filter(x => !A.has(x)), del = [...A].filter(x => !B.has(x));
        if (add.length || del.length) (d.e = d.e || {})[f] = [add, del];
      }
      for (const f of S.map || []) {
        const A = a[f] || {}, B = b[f] || {}, set = {}, del = [];
        for (const key of Object.keys(B)) if (J(A[key]) !== J(B[key])) set[key] = B[key];
        for (const key of Object.keys(A)) if (!(key in B)) del.push(key);
        if (Object.keys(set).length || del.length) (d.m = d.m || {})[f] = [set, del];
      }
      for (const f of S.whole || []) if (J(a[f]) !== J(b[f])) (d.w = d.w || {})[f] = b[f] === undefined ? null : b[f];
      return d;
    },
    empty: d => !d || !(d.s || d.i || d.e || d.m || d.w),
    patch(k, a, d) {
      const out = a ? JSON.parse(JSON.stringify(a)) : {};
      for (const f in d.w || {}) out[f] = d.w[f];
      for (const f in d.s || {}) {
        const arr = (out[f] || '').split('');
        for (const t of d.s[f].split(',')) { const ch = t[t.length - 1], i = parseInt(t.slice(0, -1), 36); if (i >= 0 && i < arr.length) arr[i] = ch; }
        out[f] = arr.join('');
      }
      for (const f in d.i || {}) {
        const [set, del, mod] = d.i[f], gone = new Set(del), list = (out[f] || []).filter(o => !gone.has(o.id)), at = new Map(list.map((o, i) => [o.id, i]));
        for (const o of set) { if (!o || typeof o.id !== 'string') continue; if (at.has(o.id)) list[at.get(o.id)] = o; else { at.set(o.id, list.length); list.push(o); } }
        for (const m of mod || []) { if (!Array.isArray(m) || !at.has(m[0]) || !m[1] || typeof m[1] !== 'object') continue; const o = { ...list[at.get(m[0])], ...m[1], id: m[0] }; for (const key of m[2] || []) delete o[key]; list[at.get(m[0])] = o; }
        out[f] = list;
      }
      for (const f in d.e || {}) { const [add, del] = d.e[f], s = new Set(out[f] || []); for (const x of del) s.delete(x); for (const x of add) s.add(x); out[f] = [...s]; }
      for (const f in d.m || {}) { const [set, del] = d.m[f], o = { ...(out[f] || {}) }; for (const key of del) delete o[key]; Object.assign(o, set); out[f] = o; }
      return out;
    },
    // a fingerprint that ignores the order of lists and keys, so two copies that hold the same things agree
    hash(k, doc) {
      if (!doc) return '0';
      const S = SCHEMA[k], parts = [];
      const canon = v => JSON.stringify(v, (key, x) => x && typeof x === 'object' && !Array.isArray(x) ? Object.keys(x).sort().reduce((o, q) => (o[q] = x[q], o), {}) : x);
      for (const f of S.str || []) parts.push(doc[f] || '');
      for (const f of S.byId || []) parts.push((doc[f] || []).map(canon).sort().join('|'));
      for (const f of S.set || []) parts.push([...(doc[f] || [])].sort().join('|'));
      for (const f of S.map || []) parts.push(canon(doc[f] || {}));
      for (const f of S.whole || []) if (f !== 'v') parts.push(canon(doc[f] === undefined ? null : doc[f]));
      const s = parts.join('\u0001'); let h = 2166136261;
      for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
      return (h >>> 0).toString(36);
    }
  };
  MME.sync = sync;

  // ---------- transports ----------
  // A transport joins a named room and offers: id (this page), send(obj), onMsg(fn(obj, from)), presence(obj),
  // onPeers(fn(list of {peer, me, presence})), leave(). Messages may be lost; they are never larger than about 3 KiB.
  function claudeTransport(room) {
    return async function join(name) {
      const nr = await room.join(name);
      const offs = []; let me = null, onMsg = null, onPeers = null, peersNow = [];
      offs.push(nr.on('mm', m => { if (m.sameTab) { me = m.peer; return; } if (onMsg) onMsg(m.data, m.peer, m.by || null); }, () => {}));
      offs.push(nr.onPeers(ch => { for (const p of ch.peers) if (p.sameTab) me = p.peer; peersNow = ch.peers.map(p => ({ peer: p.peer, me: p.sameTab, by: p.by || null, presence: p.presence || {} })); if (onPeers) onPeers(peersNow); }, () => {}));
      return {
        get id() { if (!me) { try { for (const p of nr.peers()) if (p.sameTab) me = p.peer; } catch (err) { /* not answered yet */ } } return me; },
        send: obj => nr.emit('mm', obj).catch(() => {}),
        onMsg(fn) { onMsg = fn; }, onPeers(fn) { onPeers = fn; if (peersNow.length) fn(peersNow); },
        presence: obj => nr.presence(obj).catch(() => {}),
        leave() { for (const f of offs) try { f(); } catch (err) { /* already gone */ } return nr.leave().catch(() => {}); }
      };
    };
  }
  // the same room between tabs of one browser: for trying a room alone, and where the page has no online room
  function tabTransport() {
    return async function join(name) {
      const bc = new BroadcastChannel('mme-room-' + name), id = 'p' + Math.random().toString(36).slice(2, 10);
      let who = null; try { who = sessionStorage.getItem('mme-tab'); if (!who) { who = 't' + Math.random().toString(36).slice(2, 12); sessionStorage.setItem('mme-tab', who); } } catch (err) { who = null; }
      // a line with delay and loss, for trying the room as a poor connection would have it: localStorage mme-net = {"delay":300,"jitter":300,"loss":0.05}
      let bad = null; try { bad = JSON.parse(localStorage.getItem('mme-net') || 'null'); } catch (err) { bad = null; }
      const post = m => { if (!bad) return bc.postMessage(m); if (Math.random() < (+bad.loss || 0)) return; window.setTimeout(() => { if (!dead) try { bc.postMessage(m); } catch (err) { /* closed */ } }, (+bad.delay || 0) + Math.random() * (+bad.jitter || 0)); };
      const peers = new Map(); let onMsg = null, onPeers = null, mine = {}, dead = false;
      const tell = () => { if (onPeers) onPeers([{ peer: id, me: true, by: who, presence: mine }, ...[...peers].map(([peer, v]) => ({ peer, me: false, by: v.by || null, presence: v.p }))]); };
      const beat = () => { if (!dead) post({ _p: 1, from: id, by: who, p: mine }); };
      bc.onmessage = e => {
        const m = e.data; if (!m || m.from === id || dead) return;
        if (m._p) { const had = peers.has(m.from); peers.set(m.from, { p: m.p || {}, by: m.by || null, t: Date.now() }); tell(); if (!had) beat(); }
        else if (m._bye) { peers.delete(m.from); tell(); }
        else if (onMsg) onMsg(m.d, m.from, m.by || null);
      };
      const iv = setInterval(() => { beat(); const now = Date.now(); let ch = false; for (const [p, v] of peers) if (now - v.t > 4000) { peers.delete(p); ch = true; } if (ch) tell(); }, 1200);
      const bye = () => { try { bc.postMessage({ _bye: 1, from: id }); } catch (err) { /* closed */ } };
      window.addEventListener('pagehide', bye);
      beat();
      return {
        id, send: obj => { if (!dead) post({ from: id, by: who, d: obj }); },
        onMsg(fn) { onMsg = fn; }, onPeers(fn) { onPeers = fn; tell(); },
        presence(obj) { mine = { ...mine, ...obj }; for (const key in mine) if (mine[key] === null) delete mine[key]; beat(); tell(); },
        leave() { bye(); dead = true; clearInterval(iv); window.removeEventListener('pagehide', bye); bc.close(); }
      };
    };
  }
  MME.transports = { claude: claudeTransport, tabs: tabTransport };

  // ---------- messages: paced, and cut into parts when long ----------
  const bytes = s => { let n = 0; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); n += c === 34 || c === 92 ? 2 : c < 32 ? 6 : c < 128 ? 1 : c < 2048 ? 2 : 3; } return n; };
  function pipe(tr, onMessage) {
    const q = [], parts = new Map(), sent = new Map(), last = new Map(), done = new Map(); let timer = 0, dead = false, seq = 0, mend = 0, heard = Date.now();
    const slow = [];                                    // parts of long messages wait here, so a change or a question never queues behind a whole map
    const LIM = tr.max > 3000 ? tr.max : 3000, CUT = tr.cut > 2600 ? Math.min(tr.cut, LIM - 400) : 2600;   // how long a message this line carries whole (the artifact's room: about 3 KiB)
    const pump = () => {                                // about fifteen a second: short messages first, and always at least one part
      timer = 0; if (dead) return; let n = 0;
      if (slow.length) { tr.send(slow.shift()); n++; }
      while (q.length && n < 4) { tr.send(q.shift()); n++; }
      while (slow.length && n < 4) { tr.send(slow.shift()); n++; }
      if (q.length || slow.length) timer = setTimeout(pump, 260);
    };
    const kick = () => { if (!timer) timer = setTimeout(pump, 0); };
    // A long message travels as parts, and a line may lose one. The one who is waiting asks for the parts still missing; the one
    // who sent keeps what it cut for a minute and sends those again. Without this a single lost part would lose the whole map.
    const chase = () => {
      mend = 0; if (dead) return; const now = Date.now(); let more = false;
      for (const [key, p] of parts) {
        if (now - p.t0 > 90000 || p.asks > 12) { parts.delete(key); continue; }
        more = true; if (now - p.t < 1400 || now - p.ask < 3200) continue;       // an answer needs the way there and the way back
        const miss = []; for (let i = 0; i < p.a.length && miss.length < 60; i++) if (p.a[i] == null) miss.push(i);
        p.ask = now; p.asks++; q.push({ t: 're', to: p.from, id: p.id, miss }); kick();
      }
      if (more) mend = setTimeout(chase, 700);
    };
    tr.onMsg((m, from, by) => {
      if (dead || !m || typeof m !== 'object') return;
      last.set(from, Date.now());
      if (m.t === 're') {                                 // someone lacks parts of something this page sent
        if (m.to !== tr.id || !Array.isArray(m.miss)) return; const c = sent.get(String(m.id)); if (!c) return;
        for (const i of m.miss.slice(0, 60)) if (Number.isInteger(i) && i >= 0 && i < c.cuts.length) slow.push({ t: 'part', id: m.id, i, n: c.cuts.length, s: c.cuts[i], to: c.to });
        kick(); return;
      }
      if (m.t === 'part') {
        if (m.to && m.to !== tr.id) return;
        if (typeof m.id !== 'string' || !(m.n > 0 && m.n < 4000) || typeof m.s !== 'string' || !Number.isInteger(m.i) || m.i < 0 || m.i >= m.n) return;
        const key = from + ':' + m.id; let p = parts.get(key);
        if (done.has(key)) return;                        // a part sent twice, arriving after the whole was read: without this it would start the message over
        if (!p) { if (parts.size > 60) return; p = { got: 0, a: new Array(m.n).fill(null), t: Date.now(), t0: Date.now(), ask: 0, asks: 0, from, id: m.id }; parts.set(key, p); }
        if (p.a.length !== m.n) return;
        if (p.a[m.i] == null) { p.a[m.i] = m.s; p.got++; p.t = Date.now(); heard = p.t; }
        if (p.got === m.n) { parts.delete(key); done.set(key, Date.now()); if (done.size > 200) { const now = Date.now(); for (const [dk, t] of done) if (now - t > 120000) done.delete(dk); } let o = null; try { o = JSON.parse(p.a.join('')); } catch (err) { o = null; } if (o) onMessage(o, from, by); }
        else if (!mend) mend = setTimeout(chase, 700);
        return;
      }
      onMessage(m, from, by);
    });
    return {
      send(obj) {
        const s = JSON.stringify(obj);
        if (bytes(s) <= LIM) { q.push(obj); kick(); return 1; }
        const id = (seq++).toString(36) + Math.random().toString(36).slice(2, 6), cuts = []; let a = 0, n = 0;
        for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i), b = c === 34 || c === 92 ? 2 : c < 32 ? 6 : c < 128 ? 1 : c < 2048 ? 2 : 3; if (n + b > CUT) { cuts.push(s.slice(a, i)); a = i; n = 0; } n += b; }
        cuts.push(s.slice(a));
        const to = obj && typeof obj.to === 'string' ? obj.to : undefined;
        sent.set(id, { cuts, to, t: Date.now() }); if (sent.size > 24) { const now = Date.now(); for (const [k, v] of sent) if (now - v.t > 60000 || sent.size > 48) sent.delete(k); }
        cuts.forEach((part, i) => slow.push(to ? { t: 'part', id, i, n: cuts.length, s: part, to } : { t: 'part', id, i, n: cuts.length, s: part })); kick(); return cuts.length;
      },
      get queued() { return q.length + slow.length; },
      get heard() { return heard; },
      last: peer => last.get(peer) || 0,                  // when anything at all last came from that page                      // when a part of something long last arrived
      close() { dead = true; clearTimeout(timer); clearTimeout(mend); }
    };
  }

  const COLORS = ['#e8b04a', '#5fb3d9', '#e2748a', '#7cc47f', '#b392e0', '#e58f55', '#59c2b0', '#d6c35a'];
  const cleanName = s => String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 24) || 'ไม่ระบุชื่อ';
  MME.roomCode = () => { const A = 'abcdefghjkmnpqrstuvwxyz23456789'; let s = ''; for (let i = 0; i < 6; i++) s += A[Math.floor(Math.random() * A.length)]; return s; };
  // a code is the room (six characters) and, after it, four that are a fingerprint of the owner's own connection. The platform
  // stamps every message with its sender's connection, which no page can forge, so a guest takes the map only from the
  // connection the code names: someone else in the room cannot pose as the owner.
  const FPA = 'abcdefghjkmnpqrstuvwxyz23456789';
  const fingerprint = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h >>>= 0; let o = ''; for (let i = 0; i < 4; i++) { o += FPA[h % FPA.length]; h = Math.floor(h / FPA.length); } return o; };
  const cleanCode = code => String(code).toLowerCase().replace(/[^a-z0-9]/g, '');
  const roomName = code => 'mm-' + cleanCode(code).slice(0, 6);
  const waitId = async tr => { for (let i = 0; i < 60 && !tr.id; i++) await new Promise(res => setTimeout(res, 100)); return tr.id; };

  // ---------- the owner's side ----------
  // h: { join (a transport), code, name, meta, db (MapDb of the owner's map), onPeople(list), onEnd(why),
  //      bans (keys of the people shut out of this map for good), onEvent({t: join|leave|refused|kick|ban, peer, name, at}) }
  MME.hostRoom = async function (h) {
    const tr = await h.join(roomName(h.code)), db = h.db;
    await db.loadAll();
    const myId = await waitId(tr);
    if (!myId) { tr.leave(); throw new Error('no connection'); }
    const fullCode = cleanCode(h.code).slice(0, 6) + fingerprint(myId);
    let dead = false; const hashes = {}, revs = {}; for (const k of DOCKEYS) revs[k] = 0;
    // each document counts its changes here, and every copy sent says which count it shows: a late copy from before a change is told apart from a fresh one
    // Who may write. The owner's page is the only authority: it lets a friend in when they knock, tells the room who is in, and
    // keeps the list of who was sent away, by the platform's durable id of the person where there is one (it survives a reload),
    // else by their connection. Someone sent away is not let back in, and nothing they send is taken, here or by the others.
    // Sent away for this room (kick) and shut out of the map for good (ban) are two lists. The second one is the map's own: it
    // comes in with h.bans, a ban adds to it through the event, and it is asked again every time a room opens on this map. A
    // ban names the person by the platform's id; a page that has none is named by an id its own browser keeps, which is weaker.
    const members = new Set(), banned = new Set(), shut = new Set((h.bans || []).map(String)), info = new Map(); let peersNow = [];
    const keyOf = (by, dv) => by != null ? 'u:' + by : typeof dv === 'string' && /^[a-z0-9]{8,40}$/i.test(dv) ? 'd:' + dv : null;
    const out = (from, by, dv) => { const k = keyOf(by, dv), i = info.get(from); return banned.has(from) || shut.has(from) || (k != null && (banned.has(k) || shut.has(k))) || !!(i && i.key && shut.has(i.key)); };
    const say = ev => { try { if (h.onEvent) h.onEvent({ at: Date.now(), ...ev }); } catch (err) { console.error(err); } };
    const person = p => { const i = info.get(p.peer) || {}; return { peer: p.peer, me: p.me, name: cleanName(p.presence.n), color: p.presence.c || '#aaa', host: p.me, x: p.presence.x, y: p.presence.y, md: typeof p.presence.md === 'string' ? p.presence.md.slice(0, 12) : '', since: i.since || 0, edits: i.edits || 0, last: i.last || 0, known: p.by != null, key: i.key || null }; };
    const tellPeople = () => { if (h.onPeople) h.onPeople(peersNow.filter(p => p.me || members.has(p.peer)).map(person)); };
    // A page that lacks a document asks again when nothing comes, and on a slow line it asks while the first copy is still on its
    // way. Each copy of the terrain is many parts, so answering every ask would bury the line under copies of the same thing.
    // One copy per asker and document at a time: a long one mends itself part by part, so the next ask is heard only after a while.
    const given = new Map();
    const give = (to, k) => {
      const key = to + ' ' + k, g = given.get(key), now = Date.now();
      if (g && g.r === revs[k] && now - g.t < (g.n > 1 ? 12000 : 2500)) return;
      const n = P.send({ t: 'doc', to, k, r: revs[k], body: db.known(k) }); given.set(key, { r: revs[k], t: now, n });
      if (given.size > 600) for (const [q, v] of given) if (now - v.t > 12000) given.delete(q);
    };
    // The ground under the map (its drawn picture, grid and data) goes to a friend whose page does not carry it. It is long, so
    // one copy per asker in twenty seconds; a page that has no ground to give says so, and the friend stops waiting.
    const giveBase = to => {
      const key = to + ' @base', g = given.get(key), now = Date.now(); if (g && now - g.t < 20000) return;
      given.set(key, { r: -1, t: now, n: 2 });
      Promise.resolve().then(() => (h.base ? h.base() : null)).catch(() => null).then(b => { if (!dead && members.has(to)) P.send({ t: 'doc', to, k: '@base', body: b || null }); });
    };
    const P = pipe(tr, (m, from, by) => {
      if (dead) return;
      if (out(from, by, m && m.dv)) {
        if (m.t === 'hello') { P.send({ t: 'no', to: from }); const k = 'no ' + from; if (!info.has(k)) { info.set(k, 1); say({ t: 'refused', peer: from, name: cleanName(m.n) }); } }
        return;
      }
      if (m.t === 'hello') {                              // a friend arrives: the map as it stands, to them alone
        const fresh = !members.has(from);
        members.add(from); P.send({ t: 'in', p: from });
        if (fresh || !info.has(from)) { const i = info.get(from) || { since: Date.now(), edits: 0, last: Date.now() }; i.key = keyOf(by, m.dv); i.name = cleanName(m.n); info.set(from, i); if (fresh) { say({ t: 'join', peer: from, name: i.name }); tellPeople(); } }
        if (m.re) return;                                 // someone already in, whom a bad line had dropped from the list: back on it, nothing to send again
        P.send({ t: 'welcome', to: from, meta: h.meta(), n: DOCKEYS.length, m: [...members].slice(-80) });
        for (const k of DOCKEYS) give(from, k);
      } else if (!members.has(from)) return;              // not let in yet: nothing else is heard
      else if (m.t === 'need' && DOCKEYS.includes(m.k)) give(from, m.k);
      else if (m.t === 'need' && m.k === '@base') giveBase(from);
      else if (m.t === 'd' && DOCKEYS.includes(m.k) && m.d && typeof m.d === 'object') {
        // A friend numbers their changes. The owner takes them in that order, holds one that came early until the ones before it
        // arrive, and answers with the number it has reached; the friend sends again whatever has no answer. So no change is lost
        // on a line that drops messages, and an old one arriving late never undoes a newer one.
        const i = info.get(from); if (i) { i.edits++; i.last = Date.now(); }
        if (!Number.isInteger(m.n) || m.n < 1) return take(m);
        let q = seqs.get(from); if (!q) { q = { next: 1, hold: new Map(), ack: 0 }; seqs.set(from, q); }
        if (m.n >= q.next && m.n < q.next + 400) { q.hold.set(m.n, m); while (q.hold.has(q.next)) { const x = q.hold.get(q.next); q.hold.delete(q.next); q.next++; take(x); } }
        if (!q.ack) q.ack = setTimeout(() => { q.ack = 0; if (!dead) P.send({ t: 'ok', to: from, n: q.next - 1 }); }, 200);
      }
    });
    const seqs = new Map(), take = m => { try { db.remoteDelta(m.k, m.d); delete hashes[m.k]; revs[m.k]++; } catch (err) { console.error(err); } };
    const session = { sendDelta(k, d) { delete hashes[k]; revs[k]++; P.send({ t: 'd', k, d }); } };
    db.attach(session);
    tr.presence({ role: 'host', n: cleanName(h.name), c: COLORS[0], title: String(h.meta().title || '').slice(0, 60) });
    const goneT = new Map();
    tr.onPeers(list => {
      if (dead) return; peersNow = list;
      // someone who was in and is no longer seen: said once, after a short wait, since a poor line drops people for a moment
      const here = new Set(list.map(p => p.peer));
      for (const peer of members) {
        if (here.has(peer)) { if (goneT.has(peer)) { clearTimeout(goneT.get(peer)); goneT.delete(peer); } const i = info.get(peer); if (i) { i.gone = false; const p = list.find(q => q.peer === peer); if (p && cleanName(p.presence.n)) i.name = cleanName(p.presence.n); } }
        else if (!goneT.has(peer)) goneT.set(peer, setTimeout(() => { goneT.delete(peer); if (dead || !members.has(peer)) return; const i = info.get(peer); if (i && !i.gone) { i.gone = true; say({ t: 'leave', peer, name: i.name || '' }); } }, 5000));
      }
      tellPeople();
    });
    const hb = setInterval(() => {                      // the room lives while this beats; the fingerprints let a friend's copy mend itself
      if (dead) return;
      const hs = {}; for (const k of DOCKEYS) hs[k] = hashes[k] || (hashes[k] = sync.hash(k, db.known(k)));
      tr.send({ t: 'hb', h: hs, r: revs, m: [...members].slice(-80) });   // past the queue: the room must be seen to live even while a whole map is going out
    }, 2500);
    const bye = () => { try { tr.send({ t: 'bye' }); } catch (err) { /* closing anyway */ } };
    window.addEventListener('pagehide', bye);
    return {
      code: fullCode, role: 'host', transport: tr,
      cursor(x, y) { tr.presence({ x: Math.round(x), y: Math.round(y) }); },
      kick(peer) {                                        // sent away: their page is told, the room is told, and they are not let back while this room stands
        const p = peersNow.find(q => q.peer === peer), i = info.get(peer); banned.add(peer); if (p && p.by != null) banned.add('u:' + p.by); if (i && i.key) banned.add(i.key);
        members.delete(peer); P.send({ t: 'kick', to: peer }); P.send({ t: 'ban', p: peer });
        say({ t: 'kick', peer, name: (i && i.name) || (p && cleanName(p.presence.n)) || '' }); tellPeople();
      },
      // shut out of this map for good: sent away now, and the key that names the person is handed back for the map to keep.
      // Without a key (a page the platform gives no id for, whose browser sent none) the ban holds for this room only.
      ban(peer) {
        const p = peersNow.find(q => q.peer === peer), i = info.get(peer), key = (i && i.key) || (p && p.by != null ? 'u:' + p.by : null), name = (i && i.name) || (p && cleanName(p.presence.n)) || '';
        banned.add(peer); if (key) shut.add(key);
        members.delete(peer); P.send({ t: 'kick', to: peer, ban: 1 }); P.send({ t: 'ban', p: peer, f: 1 });
        say({ t: 'ban', peer, name, key }); tellPeople();
        return key ? { k: key, name, at: Date.now() } : null;
      },
      unban(key) { shut.delete(String(key)); },
      get banned() { return banned.size; },
      touch() { for (const k of DOCKEYS) delete hashes[k]; },
      close() { if (dead) return; dead = true; clearInterval(hb); for (const t of goneT.values()) clearTimeout(t); window.removeEventListener('pagehide', bye); bye(); db.detach(); P.close(); setTimeout(() => tr.leave(), 150); }
    };
  };

  // ---------- a friend's side ----------
  // g: { join, code, name, onReady({meta, db, room}), onPeople(list), onEnd(why) }; resolves once the whole map has arrived
  MME.joinRoom = async function (g) {
    const tr = await g.join(roomName(g.code)), want = cleanCode(g.code).slice(6, 10);
    if (want.length !== 4) { tr.leave(); throw new Error('รหัสห้องต้องมีสิบตัว ตามที่เจ้าของแผนที่เห็นบนจอ'); }
    await waitId(tr);
    return new Promise((resolve, reject) => {
      let dead = false, host = null, meta = null, db = null, lastBeat = Date.now(), lastDoc = Date.now(), started = false; let wantBase = false, base = null; const got = {}, docs = {}, odd = {}, members = new Set(), asked = {}, askT = {}, mine = [], seen = new Map(); let seq = 0;
      const end = why => { if (dead) return; dead = true; clearInterval(iv); clearInterval(again); clearInterval(wait); clearInterval(resend); clearTimeout(gone); if (db) { db.detach(); db.destroy(); } P.close(); tr.leave(); for (const k of DOCKEYS) docs[k] = null; if (started) g.onEnd && g.onEnd(why); else reject(new Error(why)); };
      const P = pipe(tr, (m, from) => {
        if (dead) return;
        if (m.to && m.to !== tr.id) return;
        if (m.t === 'no' && !meta && m.to === tr.id && fingerprint(String(from)) === want) return end('เจ้าของแผนที่ไม่ให้เข้าห้องนี้');
        if (m.t === 'welcome' && !meta) { if (fingerprint(String(from)) !== want) return; host = from; meta = m.meta || {}; lastBeat = Date.now(); lastDoc = lastBeat; if (Array.isArray(m.m)) for (const q of m.m) members.add(String(q)); try { wantBase = !!(g.needBase && g.needBase(meta)); } catch (err) { wantBase = false; } if (wantBase) P.send({ t: 'need', k: '@base' }); return; }   // only the connection the code names is the owner
        if (m.t === 'd') {                                // a change by anyone in the room
          if (!started || !DOCKEYS.includes(m.k) || !m.d || typeof m.d !== 'object') return;
          if (from !== host && !members.has(from)) return;   // someone the owner has not let in, or has sent away
          if (Number.isInteger(m.n)) { if (m.n <= (seen.get(from) || 0)) return; seen.set(from, m.n); }   // a friend's change sent again, or one older than what is already here
          try { db.remoteDelta(m.k, m.d); } catch (err) { console.error(err); } return;
        }
        if (from !== host) return;                        // the rest only the owner may say
        if (m.t === 'ok') { if (m.to === tr.id && Number.isInteger(m.n)) while (mine.length && mine[0].n <= m.n) mine.shift(); return; }
        if (m.t === 'doc' && m.k === '@base') {            // the ground this page lacks, from the owner
          if (!wantBase || base || started || from !== host) return;
          if (!m.body || typeof m.body !== 'object') return end('เจ้าของห้องส่งพื้นแผนที่ให้ไม่ได้ ให้เจ้าของเปิดหน้าเวอร์ชันล่าสุดแล้วเปิดห้องใหม่');
          base = m.body; lastBeat = Date.now(); lastDoc = lastBeat; if (DOCKEYS.every(k => got[k])) start();
          return;
        }
        if (m.t === 'doc' && DOCKEYS.includes(m.k)) {
          lastBeat = Date.now(); lastDoc = lastBeat;
          if (!started) { docs[m.k] = m.body == null ? null : m.body; got[m.k] = true; if (DOCKEYS.every(k => got[k]) && (!wantBase || base)) start(); }
          else {
            // After the map has opened, a copy is taken only when this page asked for it and it is no older than the owner's count at
            // the asking: on a slow line the copies asked for while joining keep arriving late, and one of them would undo work.
            if (asked[m.k] == null || !(m.r >= asked[m.k])) return;
            asked[m.k] = null; db.remoteDoc(m.k, m.body == null ? null : m.body);
            // what this page changed and the owner has not yet answered for goes on top again: the owner's copy may lack it, and
            // without this the mending itself would throw the work away. It is on its way again already (see the sending below).
            for (const o of mine) if (o.k === m.k) { try { db.remoteDelta(o.k, o.d); } catch (err) { console.error(err); } }
          }
        } else if (m.t === 'in') { if (typeof m.p === 'string') members.add(m.p); }
        else if (m.t === 'ban') { members.delete(m.p); if (m.p === tr.id) end(m.f ? 'เจ้าของแผนที่แบนคุณจากแผนที่นี้' : 'เจ้าของแผนที่ให้ออกจากห้อง'); }
        else if (m.t === 'hb') {
          lastBeat = Date.now(); if (Array.isArray(m.m)) { members.clear(); for (const q of m.m) members.add(String(q)); if (started && !members.has(tr.id) && Date.now() - reKnock > 2000) { reKnock = Date.now(); P.send({ t: 'hello', re: 1, n: cleanName(g.name), dv: g.device || undefined }); } }
          if (started && m.h) for (const k of DOCKEYS) {     // a copy that stays different from the owner's is fetched again
            if (!db.idle(k)) { odd[k] = 0; continue; }
            if (sync.hash(k, db.known(k)) === m.h[k]) { odd[k] = 0; asked[k] = null; continue; }
            if (asked[k] == null && mine.some(o => o.k === k)) { odd[k] = 0; continue; }   // different because the owner has not answered for this page's own change yet
            const now = Date.now();
            if (asked[k] != null ? now - askT[k] > 6000 : (odd[k] = (odd[k] || 0) + 1) >= 2) { odd[k] = 0; asked[k] = m.r && m.r[k] >= 0 ? m.r[k] : 0; askT[k] = now; P.send({ t: 'need', k }); }
          }
        } else if (m.t === 'bye') end('เจ้าของแผนที่ออกจากห้องแล้ว ห้องจึงปิด');
        else if (m.t === 'kick') end(m.ban ? 'เจ้าของแผนที่แบนคุณจากแผนที่นี้' : 'เจ้าของแผนที่ให้ออกจากห้อง');
      });
      function start() {
        started = true; clearInterval(wait);
        db = MME.MapDb(MME.memoryBack(docs));
        db.attach({ sendDelta(k, d) { const now = Date.now(), n = ++seq; mine.push({ k, d, n, t: now }); P.send({ t: 'd', k, d, n }); } });
        resolve({ meta, db, base, room: { code: cleanCode(g.code).slice(0, 10), role: 'guest', transport: tr, cursor(x, y) { tr.presence({ x: Math.round(x), y: Math.round(y) }); }, status(md) { tr.presence({ md: String(md || '').slice(0, 12) }); }, close() { end('ออกจากห้องแล้ว'); } } });
      }
      let sawPeers = false, gone = 0, reKnock = 0;
      tr.onPeers(list => {
        if (dead) return; sawPeers = true;
        if (host && started) {                         // the owner gone from the room: a short grace for a reconnect, then the room is over
          const here = list.some(p => p.peer === host);
          if (here) { clearTimeout(gone); gone = 0; } else if (!gone) gone = setTimeout(() => end('เจ้าของแผนที่ออกจากห้องแล้ว ห้องจึงปิด'), 5000);
        }
        if (g.onPeople) g.onPeople(list.map(p => ({ peer: p.peer, me: p.me, name: cleanName(p.presence.n), color: p.presence.c || '#aaa', host: p.peer === host, x: p.presence.x, y: p.presence.y, md: typeof p.presence.md === 'string' ? p.presence.md.slice(0, 12) : '' })));
      });
      tr.presence({ role: 'guest', n: cleanName(g.name), c: COLORS[1 + Math.floor(Math.random() * (COLORS.length - 1))] });
      let tries = 0; const hello = () => { if (!dead && !meta && tries++ < 10) { P.send({ t: 'hello', n: cleanName(g.name), dv: g.device || undefined }); setTimeout(hello, 1500); } };
      setTimeout(hello, 400);
      const t0 = Date.now(), wait = setInterval(() => { if (started || dead) return clearInterval(wait); const quiet = Date.now() - Math.max(lastDoc, P.heard); if (quiet > 30000 || Date.now() - t0 > 240000) end(meta ? 'รับแผนที่จากเจ้าของห้องไม่ครบ ลองเข้าใหม่อีกครั้ง' : 'ไม่พบห้องนี้ หรือเจ้าของแผนที่ไม่ได้อยู่ในห้อง'); }, 2000);
      const early = setTimeout(() => { if (!meta) end('ไม่พบห้องนี้ หรือเจ้าของแผนที่ไม่ได้อยู่ในห้อง'); }, 17000);
      let asks = 0; const again = setInterval(() => { if (dead || started) return clearInterval(again); if (!meta || Date.now() - Math.max(lastDoc, P.heard) < 3500 || ++asks > 40) return; /* the heartbeat does not count: only the map arriving does */ for (const k of DOCKEYS) if (!got[k]) P.send({ t: 'need', k }); if (wantBase && !base) P.send({ t: 'need', k: '@base' }); }, 3000);
      // silence from the owner ends the room, and anything the owner sends counts as a sign of life: on a line that loses one message
      // in five, three heartbeats in a row go missing often enough that counting heartbeats alone would close rooms that are fine
      const resend = setInterval(() => {               // what the owner has not answered for goes again, oldest first, a few at a time
        if (dead || !started || !mine.length) return; const now = Date.now(); let n = 0;
        for (const o of mine) { if (now - o.t < 3000) continue; o.t = now; P.send({ t: 'd', k: o.k, d: o.d, n: o.n }); if (++n >= 10) break; }
      }, 1500);
      const iv = setInterval(() => { if (started && Date.now() - Math.max(lastBeat, P.last(host)) > 15000) end('ขาดการติดต่อกับเจ้าของแผนที่ ห้องจึงปิด'); if (meta) clearTimeout(early); }, 1000);
    });
  };
})();
