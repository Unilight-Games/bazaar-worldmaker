// Map Maker Engine: the library. Every map lives in the browser of the person who owns it (IndexedDB). Where the host page
// offers each person a private store, backup.js keeps a second copy there; nothing here knows about it.
// A map is a small record (meta) and seven documents, the same seven the map runtime reads and writes.
(function () {
  const MME = window.MME = window.MME || {};
  const DOCKEYS = ['terrain', 'rivers', 'cities', 'marks', 'routes', 'info', 'trade', 'economy', 'climate'];
  MME.DOCKEYS = DOCKEYS;
  let idb = null, mem = null;                       // mem: the fallback when the browser gives the page no storage
  const req = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  async function open() {
    if (idb || mem) return;
    try {
      const o = indexedDB.open('map-maker-engine', 1);
      o.onupgradeneeded = () => { const d = o.result; if (!d.objectStoreNames.contains('maps')) d.createObjectStore('maps', { keyPath: 'id' }); if (!d.objectStoreNames.contains('docs')) d.createObjectStore('docs'); };
      idb = await Promise.race([req(o), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000))]);
    } catch (err) { idb = null; mem = { maps: new Map(), docs: new Map() }; }
  }
  const tx = (names, mode) => idb.transaction(names, mode);
  const store = {
    get persistent() { return !!idb; },
    // Whose library this is. One browser keeps one store for the page, whoever is signed in, so a map carries the id of the person
    // who made it and a person is shown only their own. me: that id where the host page gives one; role: 'owner' of the page,
    // 'other', or 'unknown'. The map that ships with the page (builtin) belongs to the page's owner and is shown to nobody else.
    // strict: a page that signs people in itself. There a map that carries an account is shown to that account alone, so a visitor
    // who has not signed in sees only maps nobody has claimed; elsewhere a page that cannot name its viewer hides nothing.
    me: null, role: 'owner', strict: false, hidden: 0,
    sees(m) { return !!m && !(m.builtin && store.role === 'other') && !(m.owner && m.owner !== store.me && (store.me || store.strict)); },
    async list() {
      await open();
      const all = idb ? await req(tx('maps', 'readonly').objectStore('maps').getAll()) : [...mem.maps.values()];
      const mine = all.filter(m => store.sees(m)); store.hidden = all.filter(m => !m.builtin).length - mine.filter(m => !m.builtin).length;
      // a map from before maps had owners goes to the person who opens the library first
      if (store.me) for (const m of mine) if (!m.owner && (!m.builtin || store.role === 'owner')) { m.owner = store.me; try { await store.putMeta(m); } catch (err) { /* asked again next time */ } }
      return mine.sort((a, b) => (b.updated || 0) - (a.updated || 0));
    },
    async getMeta(id) { await open(); return (idb ? await req(tx('maps', 'readonly').objectStore('maps').get(id)) : mem.maps.get(id)) || null; },
    async putMeta(meta) { await open(); if (store.me && !meta.owner && (!meta.builtin || store.role === 'owner')) meta.owner = store.me; if (idb) await req(tx('maps', 'readwrite').objectStore('maps').put(meta)); else mem.maps.set(meta.id, meta); return meta; },
    async getDoc(id, k) { await open(); const v = idb ? await req(tx('docs', 'readonly').objectStore('docs').get(id + '/' + k)) : mem.docs.get(id + '/' + k); return v == null ? null : v; },
    async putDoc(id, k, body) { await open(); if (idb) await req(tx('docs', 'readwrite').objectStore('docs').put(body, id + '/' + k)); else mem.docs.set(id + '/' + k, body); },
    async remove(id) {
      await open();
      if (idb) { const t = tx(['maps', 'docs'], 'readwrite'); t.objectStore('maps').delete(id); for (const k of DOCKEYS) { t.objectStore('docs').delete(id + '/' + k); t.objectStore('docs').delete(id + '@room/' + k); } t.objectStore('docs').delete(id + '/@bk'); t.objectStore('docs').delete(id + '/@base'); await new Promise((res, rej) => { t.oncomplete = res; t.onerror = () => rej(t.error); }); }
      else { mem.maps.delete(id); for (const k of DOCKEYS) { mem.docs.delete(id + '/' + k); mem.docs.delete(id + '@room/' + k); } mem.docs.delete(id + '/@bk'); mem.docs.delete(id + '/@base'); }
    },
    // a second copy of a map's documents under another key: the map as it stood before a room opened
    async copyDocs(from, to) { for (const k of DOCKEYS) { const b = await store.getDoc(from, k); await store.putDoc(to, k, b == null ? null : b); } },
    async exportMap(id) {
      const meta = await store.getMeta(id); if (!meta) return null;
      const docs = {}; for (const k of DOCKEYS) docs[k] = await store.getDoc(id, k);
      const { bans, owner, ...plain } = meta;       // who made it and who is shut out of it stay with the owner's library, not in a file that may be handed on
      // A map drawn on a ground this page does not carry keeps that ground beside it (see importMap), and a copy or a file of
      // the map takes it along: without it the map cannot be opened anywhere the ground is missing.
      const out = { format: 'map-maker-engine', version: 1, meta: plain, docs }, base = await store.getDoc(id, '@base');
      if (store.okBase(base, meta.cols, meta.rows)) out.base = base;
      return out;
    },
    // the ground of a map as a file may carry it: the drawn picture, the grid and the data, of the map's own size
    okBase(b, cols, rows) {
      return !!(b && typeof b === 'object' && b.G && typeof b.G === 'object' && b.D && typeof b.D === 'object' && typeof b.D.biome === 'string' && b.D.biome.length === cols * rows
        && (b.img == null || (typeof b.img === 'string' && b.img.length < 6e6 && (b.img === '' || b.img.startsWith('data:image/')))));
    },
    async importMap(file, keepId) {
      if (!file || file.format !== 'map-maker-engine' || !file.meta || !file.docs) throw new Error('ไฟล์นี้ไม่ใช่ไฟล์แผนที่ของ Bazaar Worldmaker');
      const m = file.meta, cols = m.cols | 0, rows = m.rows | 0;
      if (!(cols >= 8 && cols <= 400 && rows >= 8 && rows <= 400)) throw new Error('ขนาดแผนที่ในไฟล์ไม่ถูกต้อง');
      const id = keepId && typeof m.id === 'string' ? m.id : MME.newId();
      const meta = { id, title: String(m.title || 'แผนที่ที่นำเข้า').slice(0, 80), base: m.base === 'gresland' ? 'gresland' : 'blank', cols, rows, kmPerHex: Number(m.kmPerHex) > 0 ? Number(m.kmPerHex) : 10, created: m.created || Date.now(), updated: Date.now(), backup: Date.now(), thumb: typeof m.thumb === 'string' && m.thumb.startsWith('data:image/') ? m.thumb : '' };
      // store.keepBase: this page has no ground of its own for such a map (set by the shell). The file must bring one, or the
      // map would sit in the library and never open.
      const base = meta.base === 'gresland' && store.keepBase ? file.base : null;
      if (meta.base === 'gresland' && store.keepBase && !store.okBase(base, cols, rows)) { const e = new Error('ไฟล์นี้เป็นแผนที่ที่วาดบนพื้นเกรสแลนด์ แต่ไม่มีพื้นแผนที่มาในไฟล์ หน้านี้จึงเปิดไม่ได้ ให้ส่งออกไฟล์ใหม่จากหน้าที่มีเกรสแลนด์ด้วยเวอร์ชัน 0.8.2 ขึ้นไป แล้วนำเข้าอีกครั้ง'); e.code = 'nobase'; throw e; }
      await store.putMeta(meta);
      for (const k of DOCKEYS) if (file.docs[k] && typeof file.docs[k] === 'object') await store.putDoc(id, k, file.docs[k]);
      if (base) await store.putDoc(id, '@base', { img: base.img || '', G: base.G, D: base.D });
      return meta;
    }
  };
  MME.store = store;
  MME.newId = () => 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  // the shape of a snapshot the runtime expects from its document store
  const snap = body => ({ exists: body != null, data: () => body, metadata: { hasPendingWrites: false, fromCache: false } });
  MME.snap = snap;

  // ---------- one map's documents, as the runtime's store ----------
  // back: where the documents rest ({get(k), put(k, body)}): the library for the owner, plain memory for a guest in a room.
  // With a session (see net.js) every local write goes out as a small change and every change heard comes in, merged.
  MME.MapDb = function (back, onWrite) {
    const known = {}, base = {}, subs = {}, stale = {}, ready = {};
    let session = null, dead = false, timer = 0;
    const deliver = k => {                       // hand the runtime the merged document; it refuses while it holds unsaved work
      if (dead || !subs[k]) return;
      let took = false; try { took = subs[k](snap(known[k])) !== false; } catch (err) { took = true; console.error(err); }
      if (took) { base[k] = known[k]; stale[k] = false; } else stale[k] = true;
    };
    const tick = () => { for (const k of DOCKEYS) if (stale[k]) deliver(k); };
    const self = {
      doc(path) {
        const k = path.split('/')[1];
        return {
          onSnapshot(cb) {
            subs[k] = cb;
            Promise.resolve(k in known ? known[k] : back.get(k)).then(body => { if (dead) return; if (!(k in known)) known[k] = body == null ? null : body; ready[k] = true; deliver(k); }, () => { known[k] = null; ready[k] = true; deliver(k); });
          },
          async set(body) {
            if (dead) return;
            const copy = JSON.parse(JSON.stringify(body));
            if (session && MME.sync) {
              const d = MME.sync.diff(k, base[k], copy);            // what this window changed since the document it last took
              const merged = MME.sync.empty(d) ? known[k] : MME.sync.patch(k, known[k], d);
              const same = MME.sync.hash(k, merged) === MME.sync.hash(k, copy);
              known[k] = same ? copy : merged; base[k] = copy;
              if (!MME.sync.empty(d)) session.sendDelta(k, d);
              if (!same) { stale[k] = true; }                        // others' changes arrived meanwhile: the runtime takes the merged document next
            } else { known[k] = copy; base[k] = copy; }
            await back.put(k, known[k]);
            if (onWrite) onWrite(k, known[k]);
          }
        };
      },
      // ---- the room side ----
      attach(s) { session = s; if (!timer) timer = setInterval(tick, 350); },
      detach() { session = null; },
      docs() { const o = {}; for (const k of DOCKEYS) o[k] = known[k] == null ? null : known[k]; return o; },
      known: k => known[k],
      idle: k => !stale[k] && base[k] === known[k],
      remoteDelta(k, d) { if (dead || !MME.sync) return; known[k] = MME.sync.patch(k, known[k], d); back.put(k, known[k]); if (onWrite) onWrite(k, known[k]); deliver(k); },
      remoteDoc(k, body) { if (dead) return; known[k] = body; back.put(k, body); if (onWrite) onWrite(k, body); deliver(k); },
      async loadAll() { for (const k of DOCKEYS) if (!(k in known)) { const b = await back.get(k); if (!(k in known)) known[k] = b == null ? null : b; } },
      destroy() { dead = true; clearInterval(timer); }
    };
    return self;
  };
  MME.libraryBack = id => ({ get: k => store.getDoc(id, k), put: (k, body) => store.putDoc(id, k, body) });
  MME.memoryBack = docs => ({ get: async k => (docs[k] == null ? null : docs[k]), put: async (k, body) => { docs[k] = body; } });
})();
