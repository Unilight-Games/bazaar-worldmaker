// Map Maker Engine: a second copy of the library, kept by the page that hosts the engine.
// The library itself stays in the browser (store.js). Where the host page offers a private store for each signed-in person
// (the Claude artifact database, under data/users/<that person>/), every map is also written there a short while after it
// changes, and a browser that has lost its library, or a second machine, gets the maps back from it. Nobody else can read that
// copy, the owner of the page included. Where the host offers no such store (the offline file, another host) nothing here runs.
(function () {
  const MME = window.MME = window.MME || {};
  const LS = { get(k) { try { return localStorage.getItem(k); } catch (err) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (err) { /* this visit only */ } } };
  const fnv = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36) + '.' + s.length.toString(36); };
  const cut = (s, max) => {                           // pieces of at most max bytes as the store counts them
    const out = []; let a = 0, n = 0;
    for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i), b = c < 128 ? 1 : c < 2048 ? 2 : 3; if (n + b > max) { out.push(s.slice(a, i)); a = i; n = 0; } n += b; }
    out.push(s.slice(a)); return out;
  };
  const PART = 180000, BK = '@bk';
  const timed = (p, ms) => Promise.race([p, new Promise((res, rej) => setTimeout(() => rej({ code: 'unavailable', message: 'timeout' }), ms))]);
  const call = async fn => {                          // one retry where the store is briefly away
    try { return await timed(fn(), 20000); }
    catch (err) { if (!err || err.code !== 'unavailable') throw err; await new Promise(res => setTimeout(res, 800 + Math.random() * 900)); return timed(fn(), 20000); }
  };

  // o: { db (promise of the host's store or null), user (promise or null), store, onChange(), say(text), busy(id) -> true while that map is open }
  MME.Backup = function (o) {
    const store = o.store, DOCKEYS = MME.DOCKEYS;
    let last = null, col = null, off = 'รอหน้านี้ตอบ', dead = false, server = new Map(), listed = false, timer = 0, first = 0, running = Promise.resolve();
    const st = new Map();                             // per map: { state: 'ok'|'wait'|'err'|'conflict'|'pull'|'gone', t, why }
    const gone = () => { try { return new Set(JSON.parse(LS.get('mme-bak-gone') || '[]')); } catch (err) { return new Set(); } };
    const setGone = s => LS.set('mme-bak-gone', JSON.stringify([...s].slice(-200)));
    const enabled = () => LS.get('mme-bak') !== '0';
    const mark = (id, state, why) => { st.set(id, { state, t: Date.now(), why: why || '' }); };
    const why = err => err && err.code === 'quota_exceeded' ? 'ที่เก็บของหน้านี้เต็ม' : err && err.code === 'invalid_argument' ? 'บัญชีนี้ไม่มีสิทธิ์เขียนบนหน้านี้' : err && err.code === 'resource_exhausted' ? 'เขียนถี่เกินที่หน้านี้รับ จะลองใหม่เอง' : 'ติดต่อที่เก็บของหน้านี้ไม่ได้ จะลองใหม่เอง';
    const ready = (async () => {
      const [db, user] = await Promise.all([o.db, o.user]);
      if (!db || typeof db.collection !== 'function' || !user || typeof user.id !== 'function') { off = 'หน้านี้ไม่มีที่เก็บสำรอง'; return false; }
      let id = null; try { id = await timed(Promise.resolve(user.id()), 8000); } catch (err) { id = null; }
      if (!id || typeof id !== 'string') { off = 'หน้านี้ไม่รู้ว่าใครเปิดอยู่ จึงไม่มีที่เก็บสำรองส่วนตัว'; return false; }
      try { col = db.collection('data/users/' + id); } catch (err) { off = 'หน้านี้ไม่มีที่เก็บสำรอง'; return false; }
      off = ''; return true;
    })();
    const partId = (id, k, g, i) => 'doc_' + id + '_' + k + '_' + g + '_' + i;
    async function list() {
      const snap = await call(() => col.where('kind', 'in', ['map', 'gone']).get());
      server = new Map(); for (const d of snap.docs) { const b = d.data(); if (b && typeof b.id === 'string' && (b.kind === 'gone' || (b.meta && b.docs))) server.set(b.id, JSON.parse(JSON.stringify(b))); }
      listed = true;
    }
    // the whole map as the copy holds it, or null when a piece is missing or does not match its fingerprint
    async function fetchMap(S) {
      const docs = {};
      for (const k of DOCKEYS) {
        const e = S.docs[k]; if (!e || !e.n) { docs[k] = null; continue; }
        let s = ''; for (let i = 0; i < e.n; i++) { const snap = await call(() => col.doc(partId(S.id, k, e.g || 0, i)).get()); if (!snap.exists) return null; s += String((snap.data() || {}).s || ''); }
        if (fnv(s) !== e.h) return null;
        try { docs[k] = JSON.parse(s); } catch (err) { return null; }
      }
      return { format: 'map-maker-engine', version: 1, meta: { ...S.meta, id: S.id }, docs };
    }
    async function push(id) {
      const meta = await store.getMeta(id); if (!meta) return;
      const S0 = server.get(id), S = S0 && S0.kind === 'map' ? S0 : null, entry = {}, olds = [];
      for (const k of DOCKEYS) {
        const body = await store.getDoc(id, k), s = body == null ? '' : JSON.stringify(body), h = fnv(s), was = S && S.docs[k];
        if (was && was.h === h) { entry[k] = was; continue; }
        if (!s) { entry[k] = { n: 0, h, g: was ? (was.g || 0) + 1 : 0 }; if (was) olds.push([k, was]); continue; }
        const parts = cut(s, PART), g = was ? (was.g || 0) + 1 : 0;
        for (let i = 0; i < parts.length; i++) await call(() => col.doc(partId(id, k, g, i)).set({ kind: 'part', map: id, k, g, i, s: parts[i] }));
        entry[k] = { n: parts.length, h, g }; if (was) olds.push([k, was]);
      }
      const m = { ...meta }; if (typeof m.thumb === 'string' && m.thumb.length > 150000) m.thumb = '';
      const rev = Date.now().toString(36) + Math.random().toString(36).slice(2, 8), doc = { kind: 'map', id, rev, saved: Date.now(), meta: m, docs: entry };
      await call(() => col.doc('map_' + id).set(doc));
      server.set(id, doc); await store.putDoc(id, BK, { rev, lu: meta.updated || 0 });
      for (const [k, was] of olds) for (let i = 0; i < (was.n || 0); i++) { try { await call(() => col.doc(partId(id, k, was.g || 0, i)).delete()); } catch (err) { /* a stray piece does no harm */ } }
    }
    async function drop(id) {
      const S = server.get(id), note = { kind: 'gone', id, t: Date.now() };
      await call(() => col.doc('map_' + id).set(note));   // a note in its place: another browser of the same person must not put the map back unasked
      if (S && S.kind === 'map') for (const k of DOCKEYS) { const e = S.docs[k]; for (let i = 0; e && i < (e.n || 0); i++) { try { await call(() => col.doc(partId(id, k, e.g || 0, i)).delete()); } catch (err) { /* a stray piece does no harm */ } } }
      server.set(id, note);
    }
    async function take(S, asCopy, title) {           // the copy's map into the library, in place or as a map of its own
      const f = await fetchMap(S); if (!f) return null;
      if (title) f.meta = { ...f.meta, title };
      if (asCopy) { delete f.meta.builtin; const m = await store.importMap(f, false); delete m.backup; await store.putMeta(m); return m; }
      const keep = { ...S.meta, id: S.id }; await store.putMeta(keep);
      for (const k of DOCKEYS) await store.putDoc(S.id, k, f.docs[k] == null ? null : f.docs[k]);
      await store.putDoc(S.id, BK, { rev: S.rev, lu: keep.updated || 0 });
      return keep;
    }
    // every map in the library against the copy: write what is newer here, bring back what this browser lacks
    async function reconcile() {
      if (dead || !(await ready)) return;
      if (!enabled()) { st.clear(); return; }
      const local = await store.list();
      // the copy cannot be read: every card says so and why, and nothing is written over a copy that was not seen
      try { await list(); } catch (err) { last = { at: 'list', code: (err && err.code) || '', text: String((err && err.message) || err).slice(0, 160) }; for (const m of local) mark(m.id, 'err', why(err) + (err && err.code ? ' (' + err.code + ')' : '')); if (o.onChange) o.onChange(false); return; }
      const have = new Set(local.map(m => m.id)), dels = gone(); let back = 0, pulled = 0;
      for (const id of [...dels]) { if (have.has(id)) { dels.delete(id); continue; } const S = server.get(id); if (S && S.kind === 'map') { try { await drop(id); dels.delete(id); } catch (err) { /* next time */ } } else dels.delete(id); }
      setGone(dels);
      for (const [id, S] of server) {
        if (have.has(id) || dels.has(id) || S.kind !== 'map') continue;
        try { const m = await take(S, false); if (m) { back++; mark(id, 'ok'); } } catch (err) { /* stays on the copy; next visit tries again */ }
      }
      for (const m of local) {
        const id = m.id, S = server.get(id), bk = await store.getDoc(id, BK);
        try {
          if (S && S.kind === 'gone') { if (bk) { mark(id, 'gone'); continue; } }   // deleted from another browser of the same person: the owner says what happens here
          if (!S || S.kind === 'gone') { mark(id, 'wait'); await push(id); mark(id, 'ok'); continue; }
          if (bk && bk.rev === S.rev) { if ((m.updated || 0) > (bk.lu || 0)) { mark(id, 'wait'); await push(id); } mark(id, 'ok'); continue; }
          // the copy was written by another browser since this one last agreed with it, or this one never has
          let same = true; for (const k of DOCKEYS) { const body = await store.getDoc(id, k), s = body == null ? '' : JSON.stringify(body); if (!S.docs[k] || S.docs[k].h !== fnv(s)) { same = false; break; } }
          if (same) { await store.putDoc(id, BK, { rev: S.rev, lu: m.updated || 0 }); mark(id, 'ok'); continue; }
          if (bk && (m.updated || 0) <= (bk.lu || 0)) {   // nothing was done here since: the other browser's work is simply the later state
            if (o.busy && o.busy(id)) { mark(id, 'pull'); continue; }
            if (await take(S, false)) { pulled++; mark(id, 'ok'); } else mark(id, 'err', 'สำเนาสำรองอ่านไม่ครบ');
            continue;
          }
          mark(id, 'conflict');
        } catch (err) { last = { at: 'map ' + id, code: (err && err.code) || '', text: String((err && err.message) || err).slice(0, 160) }; mark(id, 'err', why(err) + (err && err.code ? ' (' + err.code + ')' : '')); if (err && (err.code === 'revoked' || err.code === 'invalid_argument' || err.code === 'not_granted')) { dead = true; off = why(err); break; } }
      }
      if (back && o.say) o.say('นำแผนที่ ' + back + ' ผืนกลับมาจากสำเนาสำรองของหน้านี้');
      else if (pulled && o.say) o.say('รับงานแก้ล่าสุดจากเบราว์เซอร์อื่นของคุณ ' + pulled + ' ผืน');
      if (o.onChange) o.onChange(back + pulled > 0);
    }
    const run = () => { clearTimeout(timer); timer = 0; first = 0; running = running.then(reconcile).catch(err => { if (!(err && err.code)) console.error(err); }); return running; };
    const self = {
      ready,
      get off() { return off; },                      // why there is no copy, in words for the menu; empty when there is one
      get on() { return enabled(); },
      set on(v) { LS.set('mme-bak', v ? '1' : '0'); if (v) run(); else { st.clear(); if (o.onChange) o.onChange(false); } },
      status: id => st.get(id) || null,
      get last() { return last; },                    // the last thing that went wrong, for whoever is looking into it
      // a map changed: write it a while after the last change, and not later than a minute and a half after the first
      touch(id) { if (dead || off || !enabled()) return; const now = Date.now(); if (id && (!st.get(id) || st.get(id).state === 'ok')) mark(id, 'wait'); if (!first) first = now; clearTimeout(timer); timer = setTimeout(run, Math.max(1500, Math.min(20000, first + 90000 - now))); },
      soon() { if (dead || off || !enabled()) return; if (!first) first = Date.now(); clearTimeout(timer); timer = setTimeout(run, 1500); },
      sync: run,
      idle: () => running,
      // the library deleted a map: the copy of it goes too, and until that is done it must not come back
      async forget(id) { const g = gone(); g.add(id); setGone(g); st.delete(id); if (!(await ready) || dead) return; running = running.then(async () => { try { if (!listed) await list(); await drop(id); const s = gone(); s.delete(id); setGone(s); } catch (err) { /* reconcile finishes it */ } }); return running; },
      // one map straight from the copy, for a library that has not got it yet (the built-in map on a new browser)
      async restore(id) { if (!(await ready) || dead || !enabled()) return null; try { if (!listed) await list(); const S = server.get(id); if (!S || S.kind !== 'map' || gone().has(id)) return null; const m = await take(S, false); if (m) mark(id, 'ok'); return m; } catch (err) { return null; } },
      // both this browser and another changed the map: the owner picks
      async keepMine(id) { running = running.then(async () => { try { mark(id, 'wait'); await store.putDoc(id, BK, null); await push(id); mark(id, 'ok'); } catch (err) { mark(id, 'err', why(err)); } if (o.onChange) o.onChange(false); }); return running; },
      async takeTheirs(id, copyTitle) { running = running.then(async () => { try { const S = server.get(id); if (!S || S.kind !== 'map') return; if (copyTitle) { const f = await store.exportMap(id); if (f) { f.meta = { ...f.meta, title: copyTitle }; delete f.meta.builtin; await store.importMap(f, false); } } if (await take(S, false)) mark(id, 'ok'); else mark(id, 'err', 'สำเนาสำรองอ่านไม่ครบ'); } catch (err) { mark(id, 'err', why(err)); } if (o.onChange) o.onChange(true); }); return running; }
    };
    return self;
  };
})();
