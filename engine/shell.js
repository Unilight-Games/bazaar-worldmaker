// Bazaar Worldmaker (ตลาดขายโลก; the code still says Map Maker Engine and MME, its working name): the menu, the library,
// the sheet for a new map, and the room around an open map.
(function () {
  const MME = window.MME;
  MME.VERSION = '0.18.1';
  MME.NAME = 'Bazaar Worldmaker';
  MME.GRESLAND_KM = 34;   // canon: the continent is about 12 million square kilometres, and the map draws it on 12,208 hexes
  const $ = id => document.getElementById(id);
  const esc = t => String(t).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
  const store = MME.store, DOCKEYS = MME.DOCKEYS;
  const LS = { get(k) { try { return localStorage.getItem(k); } catch (err) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (err) { /* this visit only */ } } };

  // ---------- what the host page offers (the only part that knows it runs as a Claude artifact) ----------
  const cap = name => { const cl = window.claude; return cl && typeof cl.use === 'function' ? Promise.resolve().then(() => cl.use(name)).then(v => v || null, () => null) : Promise.resolve(null); };
  const platform = { downloads: cap('downloads'), room: cap('room'), db: cap('db'), user: cap('user') };
  const fire = MME.fire || null;                  // a page of its own (GitHub Pages): Google sign-in and rooms over Firebase, see fire.js
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (err) { /* the browser decides alone */ }
  // ---------- whose library this is ----------
  // The owner asked that someone who does not own a map should not find it in their own library (23 Nov 2026). Two things follow.
  // The map that ships with the page, Gresland, is put in the library of the page's owner alone. And since one browser keeps one
  // library for the page whoever is signed in, every map carries the id of the person who made it, and the library shows a person
  // only their own (see store.js). Where the page cannot say who is looking (the one-file build, a copy served from a folder)
  // there is one person, and everything is theirs. A friend in a room never had the map in their library: it lives in the
  // memory of their page and leaves with the room.
  const HOSTED = !!(window.claude && typeof window.claude.use === 'function') || !!window.MME_WHO || !!fire;
  const waitMs = ms => new Promise(res => setTimeout(() => res(null), ms));
  let WHO = HOSTED ? { id: null, owner: null } : { id: null, owner: true };
  const setWho = w => { WHO = w; MME.who = w; store.me = w.id; store.role = w.owner === true ? 'owner' : w.owner === false ? 'other' : 'unknown'; };
  setWho(WHO);
  const whoP = (async () => {
    if (window.MME_WHO) return setWho({ id: window.MME_WHO.id || null, owner: window.MME_WHO.owner });   // a test says who is looking
    if (!HOSTED) return;
    if (fire) {                                     // the page signs people in itself: the account is whoever is signed in, and nobody is the page's owner
      store.strict = true; await fire.ready;
      const put = () => setWho({ id: fire.user ? fire.user.id : null, owner: false });
      put(); fire.onUser(() => { put(); acctUI(); if (!cur) renderLibrary(); });
      return;
    }
    const u = await platform.user; if (!u) return;
    let id = null, owner = null;
    try { if (typeof u.id === 'function') id = await Promise.race([Promise.resolve(u.id()), waitMs(6000)]); } catch (err) { id = null; }
    try { if (typeof u.isOwner === 'function') { const o = await Promise.race([Promise.resolve(u.isOwner()), waitMs(6000)]); owner = o == null ? null : !!o; } } catch (err) { owner = null; }
    setWho({ id: typeof id === 'string' && id ? id : null, owner });
  })();
  const myDevice = () => { let d = LS.get('mme-dev'); if (!d || !/^[a-z0-9]{12,40}$/.test(d)) { d = (Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + Date.now().toString(36)).slice(0, 24); LS.set('mme-dev', d); } return d; };
  const sayErr = msg => { const e = new Error(msg); e.say = true; return e; };
  async function joiner() {                       // how this page reaches a room: the online room, else the tabs of this browser
    const room = await Promise.race([platform.room, new Promise(res => setTimeout(() => res(null), window.claude ? 11000 : 0))]);
    if (room && typeof room.join === 'function') return { join: MME.transports.claude(room), online: true };
    if (fire) {
      if (!(await fire.ready)) throw sayErr('ต่อระบบห้องออนไลน์ไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง');
      if (!fire.user) { try { await fire.signIn(); } catch (err) { /* said below */ } }
      if (!fire.user) throw sayErr('ห้องออนไลน์ต้องเข้าสู่ระบบด้วย Google ก่อน ถ้าหน้าต่างเข้าสู่ระบบไม่ขึ้น ให้อนุญาตป๊อปอัปของหน้านี้แล้วลองอีกครั้ง');
      return { join: fire.transport(), online: true };
    }
    if (typeof BroadcastChannel === 'function') return { join: MME.transports.tabs(), online: false };
    return null;
  }
  async function saveFile(filename, data) {
    const dl = await platform.downloads;
    if (dl) { try { await dl.save({ filename, data }); toast('บันทึกไฟล์แล้ว'); } catch (err) { if (!(err && err.code === 'declined')) toast('หน้านี้บันทึกไฟล์ไม่ได้'); } return; }
    try { const blob = data instanceof Blob ? data : new Blob([data], { type: 'application/json' }), a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
    catch (err) { toast('หน้านี้บันทึกไฟล์ไม่ได้'); }
  }

  let toastT = 0;
  function toast(t, ms) { const el = $('mtoast'); el.textContent = t; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, ms || 3600); }
  // the second copy of the library on the host page, where the page has a private store for the person looking at it
  const backup = MME.Backup({ db: platform.db, user: platform.user, store, say: t => toast(t, 7000), busy: id => !!(cur && cur.meta.id === id), onChange: () => { if (!cur) renderLibrary(); } });
  MME.backup = backup;
  const slug = s => (String(s || 'map').toLowerCase().replace(/[^a-z0-9ก-๙]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)) || 'map';
  const fmtDate = t => { try { return new Date(t).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (err) { return ''; } };
  const fmtKm = v => Math.round(v).toLocaleString('en-US');

  // ---------- bases: the ground under a map before anyone paints it ----------
  function blankBase(meta) {
    const G = MME.gridFor(meta.cols, meta.rows), N = meta.cols * meta.rows, DF = MME.DEFAULTS;
    return { blank: true, img: '', G, D: { biome: 'S'.repeat(N), zone: '.'.repeat(N), river: '0'.repeat(N), biomes: DF.biomes, zones: {}, pointKinds: DF.pointKinds, points: [], cities: [], labels: [], method: [], rivs: [], fields: '', stan: [], stpeak: -1, oldc: {}, oldl: {}, roads: [], fixes: [], clim: null, cren: {} } };
  }
  let greslandBase = null;
  function loadGresland() {
    if (!greslandBase) greslandBase = new Promise((res, rej) => {
      if (window.MME_BASES && window.MME_BASES.gresland) return res(window.MME_BASES.gresland);
      const s = document.createElement('script'); s.src = 'maps/gresland-base.js';
      s.onload = () => window.MME_BASES && window.MME_BASES.gresland ? res(window.MME_BASES.gresland) : rej(new Error('base')); s.onerror = () => rej(new Error('base'));
      document.head.appendChild(s);
    });
    return greslandBase.catch(err => { greslandBase = null; throw err; });
  }
  // Where the ground of a map comes from. A page that carries Gresland reads its own copy. A page that does not (the one on
  // GitHub, by the owner's ruling) takes the ground from beside the map, where importing a file put it, or from the owner of the
  // room this page is a guest in.
  const NOGRES = !!window.MME_NO_GRESLAND, lent = new Map();
  store.keepBase = NOGRES;
  const baseFor = async meta => {
    if (meta.base !== 'gresland') return blankBase(meta);
    if (!NOGRES) return loadGresland();
    const b = lent.get(meta.id) || await store.getDoc(meta.id, '@base');
    if (store.okBase(b, meta.cols, meta.rows)) return { img: b.img || '', G: b.G, D: b.D };
    const e = new Error('nobase'); e.code = 'nobase'; throw e;
  };
  // a file that leaves this page carries the ground of a Gresland map, so it opens on a page without Gresland too
  const withBase = async f => { if (f && f.meta && f.meta.base === 'gresland' && !f.base) { try { const b = await baseFor(f.meta); f.base = { img: b.img || '', G: b.G, D: b.D }; } catch (err) { /* the file goes without it */ } } return f; };

  // the Gresland map and the owner's edits on it enter the library once
  // where this page stands on the old Gresland page's own address, the owner's edits are still in that page's database: read whole
  const dbRead = async (db, path) => {            // one document, read once; a store that is briefly away gets a second try
    for (let n = 0; n < 2; n++) {
      try { const s = await Promise.race([db.doc(path).get(), new Promise((res, rej) => setTimeout(() => rej({ code: 'unavailable' }), 12000))]); return s && s.exists ? JSON.parse(JSON.stringify(s.data())) : null; }
      catch (err) { if (n || !err || err.code !== 'unavailable') throw err; await new Promise(res => setTimeout(res, 700 + Math.random() * 600)); }
    }
    return null;
  };
  async function greslandFromDb(wait) {
    const db = await Promise.race([platform.db, new Promise(res => setTimeout(() => res(null), wait || 6000))]);
    if (!db || typeof db.doc !== 'function') return null;
    const out = {}; let any = false;
    for (const k of DOCKEYS) { try { const b = await dbRead(db, 'map/' + k); if (b && typeof b === 'object') { out[k] = b; any = true; } } catch (err) { if (k === 'terrain' || k === 'cities') return null; } }
    return any ? out : null;
  }
  const GRES_TITLE = 'แผนที่ภูมิประเทศเกรสแลนด์';
  const fileEdits = async () => { if (window.MME_EDITS) return window.MME_EDITS; try { const r = await fetch('maps/gresland-edits.json'); return r.ok ? await r.json() : {}; } catch (err) { return {}; } };
  async function seedGresland() {
    if (WHO.owner !== true || window.MME_NO_GRESLAND) return;   // the page's owner alone, and only in a build that carries the map: nobody else gets it put in their library
    const have = await store.getMeta('gresland');
    if (have) {                                     // the distance a hex stands for, once the canon's size of the continent was read
      if (!have.kmCanon) { if (have.kmPerHex === 10) have.kmPerHex = MME.GRESLAND_KM; have.kmCanon = true; await store.putMeta(have); }
      LS.set('mme-gresland-seeded', '1');
      if (have.seed !== 'db') greslandLate();
      return;
    }
    $('lib').innerHTML = '<p class="note2">กำลังเตรียมแผนที่เกรสแลนด์</p>';
    // a browser that has no library yet: the owner's own copy on this page is the latest state of the map, so it comes first
    if (await backup.restore('gresland')) { LS.set('mme-gresland-seeded', '1'); return; }
    let docs = await greslandFromDb(), seed = 'db';
    if (!docs) { docs = await fileEdits(); seed = 'file'; }
    for (const k of DOCKEYS) if (docs[k]) await store.putDoc('gresland', k, docs[k]);
    await store.putMeta({ id: 'gresland', title: GRES_TITLE, base: 'gresland', cols: 159, rows: 104, kmPerHex: MME.GRESLAND_KM, kmCanon: true, created: Date.now(), updated: Date.now(), thumb: MME.DEFAULTS.greslandThumb, builtin: true, seed, seedDocs: DOCKEYS.filter(k => docs[k]) });
    LS.set('mme-gresland-seeded', '1');
    if (seed !== 'db') greslandLate();
  }
  // The page's own database answered after the library was already seeded from the copy that ships with the engine: take the
  // owner's map from it now. What stood in the library is kept as a second map if it was ever worked on.
  let lateRun = false;
  async function greslandLate() {
    if (lateRun) return; lateRun = true;
    const db = await platform.db; if (!db || typeof db.doc !== 'function') return;
    for (let n = 0; n < 40 && cur && cur.meta.id === 'gresland'; n++) await new Promise(res => setTimeout(res, 3000));
    if (cur && cur.meta.id === 'gresland') return;
    const docs = await greslandFromDb(20000), have = await store.getMeta('gresland'); if (!docs || !have || have.seed === 'db') return;
    await adoptGresland(docs, have);
    toast('อ่านแผนที่เกรสแลนด์จากฐานข้อมูลของหน้าเดิมครบแล้ว', 7000);
  }
  async function adoptGresland(docs, have) {
    if (have.updated > have.created + 5000) { const f = await store.exportMap('gresland'); if (f) { f.meta = { ...f.meta, title: 'เกรสแลนด์ (ชุดก่อนอ่านจากหน้าเดิม)' }; delete f.meta.builtin; await store.importMap(f, false); } }
    for (const k of DOCKEYS) await store.putDoc('gresland', k, docs[k] || null);
    have.seed = 'db'; have.seedDocs = DOCKEYS.filter(k => docs[k]); have.updated = Date.now(); await store.putMeta(have);
    await renderLibrary(); backup.soon();
  }
  // by hand, for the owner: the map as the old page's database holds it, brought in again as a map of its own
  async function greslandAgain() {
    const b = $('gresAgain'); b.disabled = true; b.textContent = 'กำลังอ่านจากหน้าเดิม';
    const docs = await greslandFromDb(12000);
    if (!docs) toast('อ่านฐานข้อมูลของหน้าเดิมไม่ได้ในมุมมองนี้', 6000);
    else {
      const id = MME.newId(); for (const k of DOCKEYS) if (docs[k]) await store.putDoc(id, k, docs[k]);
      await store.putMeta({ id, title: 'เกรสแลนด์ (อ่านจากหน้าเดิม ' + fmtDate(Date.now()) + ')', base: 'gresland', cols: 159, rows: 104, kmPerHex: MME.GRESLAND_KM, kmCanon: true, created: Date.now(), updated: Date.now(), thumb: MME.DEFAULTS.greslandThumb, seed: 'db', seedDocs: DOCKEYS.filter(k => docs[k]) });
      await renderLibrary(); backup.soon(); toast('นำเข้าเป็นแผนที่อีกผืนในคลังแล้ว แผนที่เดิมในคลังไม่ถูกแตะ', 7000);
    }
    b.disabled = false; b.textContent = 'อ่านเกรสแลนด์จากหน้าเดิมอีกครั้ง';
  }
  Promise.all([platform.db, whoP]).then(([db]) => { if (db && typeof db.doc === 'function' && WHO.owner === true) { $('gresAgain').hidden = false; $('gresAgain').onclick = greslandAgain; } });

  // ---------- the library ----------
  async function renderLibrary() {
    const list = await store.list(), box = $('lib');
    $('libCount').textContent = list.length + ' ผืน';
    box.innerHTML = list.map(m => `<article class="mapcard" data-id="${esc(m.id)}">
      <button type="button" class="th" data-act="open" aria-label="เปิด ${esc(m.title)}" style="${m.thumb ? `background-image:url(${esc(m.thumb)})` : ''}"></button>
      <div class="bd"><h3>${esc(m.title)}${m.builtin ? '<span class="tag">แผนที่ตั้งต้น</span>' : ''}</h3>
      <div class="mt">${m.cols} × ${m.rows} ช่อง · กว้างราว ${fmtKm(m.cols * 0.866 * m.kmPerHex)} กม. · แก้ล่าสุด ${esc(fmtDate(m.updated))}</div>
      ${m.seed === 'db' ? `<div class="mt">อ่านจากฐานข้อมูลของหน้าเกรสแลนด์เดิม ${(m.seedDocs || []).length} ชุด ฐานข้อมูลเดิมยังอยู่และไม่ถูกแก้</div>` : ''}
      <div class="mt bk${!m.backup || m.updated > m.backup + 60000 ? ' due' : ''}">${!m.backup ? 'ยังไม่เคยสำรองเป็นไฟล์' : m.updated > m.backup + 60000 ? 'มีงานแก้หลังสำรองครั้งล่าสุด (' + esc(fmtDate(m.backup)) + ')' : 'สำรองเป็นไฟล์แล้ว ' + esc(fmtDate(m.backup))}</div>
      ${bkLine(m.id)}
      <div class="acts"><button type="button" class="btn brass" data-act="open">เปิดแผนที่</button><button type="button" class="btn" data-act="copy">ทำสำเนา</button><button type="button" class="btn" data-act="export">ส่งออกไฟล์</button>${m.builtin ? '' : '<button type="button" class="btn warn" data-act="del">ลบ</button>'}</div></div></article>`).join('')
      || '<p class="note2">ยังไม่มีแผนที่ในคลัง กดสร้างแผนที่ใหม่ทางซ้ายเพื่อเริ่มผืนแรก' + (HOSTED && WHO.owner == null ? ' หน้านี้ยังบอกไม่ได้ว่าใครเปิดอยู่ จึงยังไม่วางแผนที่ของเจ้าของหน้าให้ ถ้าคุณคือเจ้าของ ลองโหลดหน้านี้ใหม่อีกครั้ง' : '') + '</p>';
    // maps of an account that is not signed in just now stay out of sight, and the library says that they are there
    if (store.hidden > 0 && fire) $('lib').insertAdjacentHTML('beforeend', '<p class="note2" id="libHidden">มีแผนที่อีก ' + store.hidden + ' ผืนในเบราว์เซอร์นี้ที่เป็นของบัญชีอื่น' + (fire.user ? '' : ' เข้าสู่ระบบด้วยบัญชีเจ้าของเพื่อเปิด') + '</p>');
    const copyOn = !backup.off && backup.on;
    $('storeNote').textContent = copyOn
      ? (store.persistent ? 'แผนที่ทุกผืนเก็บอยู่ในเบราว์เซอร์ของเครื่องนี้ และหน้านี้เก็บสำเนาสำรองส่วนตัวไว้อีกชุดหนึ่ง มีแต่บัญชีของคุณที่อ่านสำเนานั้นได้ ถ้าล้างข้อมูลเบราว์เซอร์หรือเปิดจากเครื่องอื่นด้วยบัญชีเดิม แผนที่จะกลับมาจากสำเนานั้นเอง ไฟล์ส่งออกยังเป็นสำรองชั้นที่สองที่พกไปที่อื่นได้' : 'เบราว์เซอร์นี้ไม่ให้หน้านี้เก็บข้อมูล แผนที่อยู่ได้เพราะสำเนาสำรองส่วนตัวบนหน้านี้ รอให้การ์ดขึ้นว่าสำรองแล้วก่อนปิดหน้า')
      : (store.persistent ? 'แผนที่ทุกผืนเก็บอยู่ในเบราว์เซอร์ของเครื่องนี้เท่านั้น ไม่มีสำเนาบนเซิร์ฟเวอร์ ส่งออกเป็นไฟล์ไว้สำรองหรือย้ายไปเครื่องอื่น และถ้าล้างข้อมูลเบราว์เซอร์ แผนที่จะหายไปด้วย' : 'เบราว์เซอร์นี้ไม่ให้หน้านี้เก็บข้อมูล แผนที่จะอยู่แค่ตอนที่เปิดหน้านี้ ส่งออกเป็นไฟล์ก่อนปิดทุกครั้ง');
    $('storeNote').classList.toggle('bad', !store.persistent && !copyOn);
    const tg = $('bakOn'); tg.hidden = !!backup.off; tg.textContent = backup.on ? 'หยุดสำรองขึ้นหน้านี้' : 'เปิดการสำรองขึ้นหน้านี้';
  }
  function bkLine(id) {                             // what the second copy on this page holds of one map
    if (backup.off || !backup.on) return '';
    const s = backup.status(id);
    if (!s) return '<div class="mt bk2">กำลังตรวจสำเนาสำรองบนหน้านี้</div>';
    if (s.state === 'ok') return '<div class="mt bk2 ok">สำรองบนหน้านี้แล้ว</div>';
    if (s.state === 'wait') return '<div class="mt bk2">รอสำรองขึ้นหน้านี้</div>';
    if (s.state === 'pull') return '<div class="mt bk2">มีงานแก้ใหม่กว่าจากเบราว์เซอร์อื่นของคุณ จะรับมาเมื่อปิดแผนที่</div>';
    if (s.state === 'conflict') return '<div class="mt bk2 due">ผืนนี้ถูกแก้ทั้งที่เครื่องนี้และที่เบราว์เซอร์อื่นของคุณ สำเนาสำรองจึงต่างจากในเครื่อง เลือกว่าจะเก็บฉบับไหน</div><div class="acts"><button type="button" class="btn" data-act="bkMine">ใช้ฉบับในเครื่องนี้</button><button type="button" class="btn" data-act="bkTheirs">รับฉบับสำรอง แล้วเก็บฉบับนี้เป็นสำเนา</button></div>';
    if (s.state === 'gone') return '<div class="mt bk2 due">ผืนนี้ถูกลบจากเบราว์เซอร์อื่นของคุณแล้ว ในเครื่องนี้ยังอยู่ครบ</div><div class="acts"><button type="button" class="btn" data-act="bkMine">เก็บไว้และสำรองขึ้นใหม่</button><button type="button" class="btn warn" data-act="del">ลบจากเครื่องนี้ด้วย</button></div>';
    return '<div class="mt bk2 due"' + (backup.last ? ' title="' + esc(backup.last.at + ' ' + backup.last.code + ' ' + backup.last.text) + '"' : '') + '>สำรองขึ้นหน้านี้ไม่สำเร็จ ' + esc(s.why || '') + '</div>';
  }
  $('bakOn').onclick = () => { backup.on = !backup.on; renderLibrary(); toast(backup.on ? 'เปิดการสำรองขึ้นหน้านี้แล้ว' : 'หยุดสำรองขึ้นหน้านี้แล้ว สำเนาที่มีอยู่ยังอยู่ แต่จะไม่ตามงานแก้ใหม่', 6000); };
  Promise.all([backup.ready, whoP]).then(([ok]) => { if (!cur) renderLibrary(); if (ok) backup.sync(); });
  let delArm = null;
  $('lib').addEventListener('click', async e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const id = b.closest('.mapcard').dataset.id, act = b.dataset.act;
    if (act === 'open') openMap(id);
    else if (act === 'export') { const f = await withBase(await store.exportMap(id)); if (f) { await saveFile(slug(f.meta.title) + '.mapmaker.json', JSON.stringify(f)); await markBackup([id]); renderLibrary(); } }
    else if (act === 'copy') {
      const f = await store.exportMap(id); if (!f) return;
      f.meta = { ...f.meta, title: (f.meta.title + ' (สำเนา)').slice(0, 80) }; delete f.meta.builtin;
      await store.importMap(f, false); renderLibrary(); backup.soon(); toast('ทำสำเนาแล้ว');
    } else if (act === 'del') {
      if (delArm !== id) { delArm = id; const lab = b.textContent; b.textContent = 'กดอีกครั้งเพื่อลบ'; setTimeout(() => { if (delArm === id) { delArm = null; b.textContent = lab; } }, 4000); return; }
      delArm = null; const m0 = await store.getMeta(id); if (m0 && m0.builtin) return; await store.remove(id); backup.forget(id); renderLibrary(); toast('ลบแผนที่แล้ว');
    } else if (act === 'bkMine') { b.disabled = true; await backup.keepMine(id); }
    else if (act === 'bkTheirs') { b.disabled = true; const m = await store.getMeta(id); await backup.takeTheirs(id, ((m ? m.title : 'แผนที่') + ' (ฉบับในเครื่องนี้ก่อนรับสำรอง)').slice(0, 80)); backup.soon(); }
  });
  async function markBackup(ids) { const t = Date.now(); for (const id of ids) { const m = await store.getMeta(id); if (m) { m.backup = t; await store.putMeta(m); if (cur && cur.meta.id === id) cur.meta.backup = t; } } }
  $('bakAll').onclick = async () => {
    const list = await store.list(), maps = []; for (const m of list) { const f = await withBase(await store.exportMap(m.id)); if (f) maps.push(f); }
    if (!maps.length) return;
    await saveFile('map-maker-library-' + new Date().toISOString().slice(0, 10) + '.mapmaker.json', JSON.stringify({ format: 'map-maker-engine-library', version: 1, maps }));
    await markBackup(list.map(m => m.id)); renderLibrary();
  };
  $('impBtn').onclick = () => $('impFile').click();
  $('impFile').onchange = async e => {
    const f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (data && data.format === 'map-maker-engine-library' && Array.isArray(data.maps)) { let n = 0, bare = 0; for (const one of data.maps.slice(0, 200)) { try { if (one.meta) delete one.meta.builtin; await store.importMap(one, false); n++; } catch (err) { if (err && err.code === 'nobase') bare++; /* a broken one is skipped */ } } await renderLibrary(); backup.soon(); toast('นำเข้า ' + n + ' ผืนจากไฟล์สำรองคลัง' + (bare ? ' ข้าม ' + bare + ' ผืนที่วาดบนพื้นเกรสแลนด์ เพราะไฟล์ไม่มีพื้นแผนที่มาด้วย ให้ส่งออกใหม่ด้วยเวอร์ชัน 0.8.2 ขึ้นไป' : ''), bare ? 9000 : undefined); return; }
      const meta = await store.importMap(data, false); await renderLibrary(); backup.soon(); toast('นำเข้า ' + meta.title + ' แล้ว');
    }
    catch (err) { const own = err && (err.code === 'nobase' || /Bazaar|Map Maker|ขนาด/.test(err.message)); toast(own ? err.message : 'อ่านไฟล์นี้ไม่ได้ ต้องเป็นไฟล์ .mapmaker.json ที่ส่งออกจากหน้านี้', err && err.code === 'nobase' ? 12000 : undefined); }
  };

  // ---------- a new map ----------
  const NM = { size: 'm', start: 'random', style: 'continent', climate: 'mixed', wind: 'W', rivers: 1, seed: 1 };
  let nmGen = null, nmT = 0;
  const seg = (id, key, cb) => { for (const b of $(id).querySelectorAll('button')) b.onclick = () => { NM[key] = isNaN(+b.dataset.v) ? b.dataset.v : +b.dataset.v; syncSeg(id, key); cb && cb(); }; };
  const syncSeg = (id, key) => { for (const b of $(id).querySelectorAll('button')) b.setAttribute('aria-pressed', String(String(NM[key]) === b.dataset.v)); };
  function nmSizes() {
    $('nmSizes').innerHTML = Object.entries(MME.SIZES).map(([k, s]) => `<label class="sizeopt${NM.size === k ? ' on' : ''}"><input type="radio" name="nmSize" id="nmSize-${k}" value="${k}"${NM.size === k ? ' checked' : ''}><b>${s.name}</b><span>${s.cols} × ${s.rows} ช่อง</span><span>${esc(s.note)}</span></label>`).join('');
    for (const r of $('nmSizes').querySelectorAll('input')) r.onchange = () => { NM.size = r.value; nmSizes(); nmPreview(); };
    nmKm();
  }
  function nmKm() { const s = MME.SIZES[NM.size], km = Math.max(0.1, +$('nmKm').value || 30); $('nmKmNote').textContent = `แผนที่กว้างราว ${fmtKm(s.cols * 0.866 * km)} กม. สูงราว ${fmtKm(s.rows * km)} กม. พื้นที่ราว ${(Math.round(s.cols * s.rows * 0.866 * km * km / 1e5) / 10).toLocaleString('en-US')} ล้าน ตร.กม. รวมทะเล`; }
  function nmOpts() { return { seed: NM.seed, style: NM.style, land: +$('nmLand').value / 100, relief: +$('nmRelief').value / 100, climate: NM.climate, wind: NM.wind, rivers: NM.rivers }; }
  const PREV = { S: '#274559', L: '#4a7692', M: '#8d8273', g: '#a7b06e', s: '#c4b880', v: '#bbb56c', c: '#cdb988', h: '#929e6c', d: '#e3c78f', t: '#b7b7a0', n: '#e9edf0', f: '#4f6f52', o: '#5f8a4e', j: '#2f6b45', m: '#7f9a78', w: '#4d7361' };
  function nmPreview() {
    clearTimeout(nmT);
    nmT = setTimeout(() => {
      const s = MME.SIZES[NM.size], cv = $('nmPrev'), c = cv.getContext('2d'); cv.width = s.cols * 2; cv.height = s.rows * 2 + 1;
      c.fillStyle = PREV.S; c.fillRect(0, 0, cv.width, cv.height);
      $('nmRandom').hidden = NM.start !== 'random';
      if (NM.start !== 'random') { nmGen = null; $('nmStat').textContent = 'ทะเลทั้งผืน รอให้ระบายแผ่นดินเอง'; return; }
      const G = MME.gridFor(s.cols, s.rows); nmGen = MME.generate(G, nmOpts());
      for (let i = 0; i < nmGen.cells.length; i++) { const ch = nmGen.cells[i]; if (ch === '.') continue; const x = i % s.cols, y = (i / s.cols) | 0; c.fillStyle = PREV[ch] || '#999'; c.fillRect(x * 2, y * 2 + (x & 1), 2, 2); }
      c.strokeStyle = 'rgba(120,180,220,.9)'; c.lineWidth = 0.8;
      for (const r of nmGen.rivers) { c.beginPath(); r.pts.forEach((p, j) => { const x = (p[0] - G.x0) / (1.5 * G.R) * 2 + 1, y = (p[1] - G.y0) / (Math.sqrt(3) * G.R) * 2 + 1; if (j) c.lineTo(x, y); else c.moveTo(x, y); }); c.stroke(); }
      $('nmStat').textContent = `แผ่นดิน ${nmGen.land.toLocaleString('en-US')} ช่อง · แม่น้ำ ${nmGen.rivers.length} สาย · เลขสุ่ม ${NM.seed}`;
    }, 60);
  }
  function openNewMap() {
    NM.seed = 1 + Math.floor(Math.random() * 99999); $('nmSeed').value = NM.seed; $('nmTitle').value = '';
    nmSizes(); for (const [id, key] of [['nmStart', 'start'], ['nmStyle', 'style'], ['nmClimate', 'climate'], ['nmWind', 'wind'], ['nmRivers', 'rivers']]) syncSeg(id, key);
    $('newVeil').hidden = false; nmPreview(); $('nmTitle').focus();
  }
  seg('nmStart', 'start', nmPreview); seg('nmStyle', 'style', nmPreview); seg('nmClimate', 'climate', nmPreview); seg('nmWind', 'wind', nmPreview); seg('nmRivers', 'rivers', nmPreview);
  for (const id of ['nmLand', 'nmRelief']) $(id).oninput = () => { $(id + 'V').textContent = $(id).value + '%'; nmPreview(); };
  $('nmSeed').oninput = () => { NM.seed = Math.max(1, Math.floor(+$('nmSeed').value) || 1); nmPreview(); };
  $('nmReroll').onclick = () => { NM.seed = 1 + Math.floor(Math.random() * 99999); $('nmSeed').value = NM.seed; nmPreview(); };
  $('nmKm').oninput = nmKm;
  $('newBtn').onclick = openNewMap;
  $('nmCancel').onclick = () => { $('newVeil').hidden = true; };
  $('newVeil').addEventListener('pointerdown', e => { if (e.target === $('newVeil')) $('newVeil').hidden = true; });
  $('nmCreate').onclick = async () => {
    const s = MME.SIZES[NM.size], id = MME.newId(), N = s.cols * s.rows;
    const meta = { id, title: ($('nmTitle').value.trim() || 'แผนที่ใหม่').slice(0, 80), base: 'blank', cols: s.cols, rows: s.rows, kmPerHex: Math.max(0.1, Math.min(1000, +$('nmKm').value || 30)), created: Date.now(), updated: Date.now(), thumb: '' };
    let cells = '.'.repeat(N), rivers = [];
    if (NM.start === 'random') { const g = nmGen || MME.generate(MME.gridFor(s.cols, s.rows), nmOpts()); cells = g.cells; rivers = g.rivers.map((r, i) => ({ id: 'g' + i.toString(36) + Math.random().toString(36).slice(2, 6), kind: r.kind, pts: r.pts })); meta.gen = nmOpts(); }
    try { meta.thumb = $('nmPrev').toDataURL('image/webp', 0.8); } catch (err) { meta.thumb = ''; }
    await store.putDoc(id, 'terrain', { v: 2, cols: s.cols, rows: s.rows, cells, rivOff: [], rivSig: '0:0' });
    await store.putDoc(id, 'rivers', { v: 1, rivers });
    await store.putMeta(meta);
    $('newVeil').hidden = true; openMap(id);
  };

  // ---------- an open map ----------
  let cur = null;                                   // { meta, rt, db, room, guest, env }
  const myName = () => ($('myName').value.trim() || LS.get('mme-name') || '').slice(0, 24);
  // the account row of the menu, where the page signs people in itself
  function acctUI() {
    const box = $('acct'); if (!box || !fire) return; box.hidden = false;
    const u = fire.user, pic = $('acctPic');
    $('acctWho').innerHTML = fire.state === 'failed' ? 'ต่อระบบบัญชีไม่ได้ ห้องออนไลน์ใช้ไม่ได้ในตอนนี้' : u ? 'เข้าสู่ระบบแล้ว <b>' + esc(u.name || 'บัญชี Google') + '</b>' : 'ห้องออนไลน์ใช้บัญชี Google';
    pic.hidden = !(u && /^https:\/\//.test(u.photo || '')); if (!pic.hidden) { pic.referrerPolicy = 'no-referrer'; pic.src = u.photo; }
    $('acctBtn').hidden = fire.state === 'failed'; $('acctBtn').textContent = u ? 'ออกจากระบบ' : 'เข้าสู่ระบบด้วย Google';
    $('acctBtn').onclick = async () => { try { if (fire.user) await fire.signOut(); else await fire.signIn(); } catch (err) { toast('เข้าสู่ระบบไม่สำเร็จ ถ้าหน้าต่างเข้าสู่ระบบไม่ขึ้น ให้อนุญาตป๊อปอัปของหน้านี้', 6000); } acctUI(); };
    if (u && u.name && !$('myName').value.trim() && !LS.get('mme-name')) { $('myName').value = u.name.slice(0, 24); LS.set('mme-name', $('myName').value); }
  }
  if (fire) { acctUI(); fire.ready.then(acctUI); }
  // ---------- sharing the page (v0.18.1, the owner's ask) ----------
  // Always the official page on GitHub, whichever copy is open: the Claude artifact is private to its owner and the one-file
  // build is a file on someone's disk, so neither is a link a friend can open. The usage policy lets anyone share this link.
  MME.SITE = 'https://unilight-games.github.io/bazaar-worldmaker/';
  const SHARE_TEXT = 'Bazaar Worldmaker ตลาดขายโลก เครื่องมือสร้างแผนที่โลกแฟนตาซีบนช่องหกเหลี่ยม ใช้ฟรีในเบราว์เซอร์';
  const SHARE_TO = {
    facebook: u => 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(u),
    line: u => 'https://social-plugins.line.me/lineit/share?url=' + encodeURIComponent(u),
    x: u => 'https://twitter.com/intent/tweet?url=' + encodeURIComponent(u) + '&text=' + encodeURIComponent(SHARE_TEXT)
  };
  async function copyText(t) {
    try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(t); return true; } } catch (err) { /* the older way below */ }
    try { const el = $('shareUrl'); el.focus(); el.select(); return document.execCommand('copy'); } catch (err) { return false; }
  }
  $('shareBtn').onclick = () => {
    $('shareUrl').value = MME.SITE; $('shareNative').hidden = !(navigator.share && typeof navigator.share === 'function');
    $('shareVeil').hidden = false; setTimeout(() => $('shareUrl').select(), 30);
  };
  $('shareClose').onclick = () => { $('shareVeil').hidden = true; };
  $('shareVeil').addEventListener('click', e => { if (e.target === $('shareVeil')) $('shareVeil').hidden = true; });
  $('shareCopy').onclick = async () => { toast(await copyText(MME.SITE) ? 'คัดลอกลิงก์แล้ว ส่งให้เพื่อนได้เลย' : 'คัดลอกเองไม่ได้ ให้เลือกลิงก์ในช่องแล้วคัดลอก'); };
  $('shareNative').onclick = async () => { try { await navigator.share({ title: 'Bazaar Worldmaker', text: SHARE_TEXT, url: MME.SITE }); } catch (err) { if (!(err && err.name === 'AbortError')) toast('แชร์ผ่านแอปไม่ได้ ใช้ปุ่มคัดลอกลิงก์แทน'); } };
  for (const b of document.querySelectorAll('[data-share]')) b.onclick = () => { const w = window.open(SHARE_TO[b.dataset.share](MME.SITE), '_blank', 'width=620,height=560'); if (w) { try { w.opener = null; } catch (err) { /* another site's window */ } } else toast('หน้านี้เปิดหน้าต่างใหม่ไม่ได้ ใช้ปุ่มคัดลอกลิงก์แทน'); };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('shareVeil').hidden) $('shareVeil').hidden = true; });
  $('myName').value = LS.get('mme-name') || '';
  $('myName').onchange = () => LS.set('mme-name', $('myName').value.trim().slice(0, 24));

  // the size of the page's letters: the owner found the first size too small (v0.9.0), so the middle one is larger and there are three
  const UIS = { s: 15, m: 17, l: 19 };
  function setUi(k, keep) {
    k = UIS[k] ? k : 'm'; document.documentElement.style.setProperty('--ufs', UIS[k] + 'px'); if (keep) LS.set('mme-ui', k);
    for (const b of document.querySelectorAll('[data-ui]')) b.setAttribute('aria-pressed', b.dataset.ui === k ? 'true' : 'false');
    if (keep && cur) { try { applyFit(false); cur.rt.refit && cur.rt.refit(); } catch (err) { /* the next resize sets it right */ } }
  }
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-ui]'); if (b) setUi(b.dataset.ui, true); });
  setUi(LS.get('mme-ui') || 'm');
  function showScreen(map) { $('menu').hidden = map; $('mapscreen').hidden = !map; $('vtag').hidden = map; window.scrollTo(0, 0); }   // on the map the version sits at the foot of the side panel, where it covers nothing (v0.14.0)
  async function mount(meta, db, guestRoom, practice) {
    const scr = $('mapscreen'); scr.innerHTML = '<div id="mapload">กำลังเปิดแผนที่</div>'; showScreen(true);
    let base; try { base = await baseFor(meta); } catch (err) { showScreen(false); toast(err && err.code === 'nobase' ? 'แผนที่ผืนนี้วาดบนพื้นเกรสแลนด์ ซึ่งหน้านี้ไม่มี ให้ส่งออกไฟล์ใหม่จากหน้าที่มีเกรสแลนด์ด้วยเวอร์ชัน 0.8.2 ขึ้นไป แล้วนำเข้าอีกครั้ง' : 'โหลดพื้นแผนที่ไม่สำเร็จ ลองเปิดใหม่อีกครั้ง', err && err.code === 'nobase' ? 9000 : undefined); return false; }
    scr.innerHTML = ''; scr.appendChild($('tpl-map').content.cloneNode(true)); if ($('vfoot')) $('vfoot').textContent = MME.NAME + ' v' + MME.VERSION; scr.classList.toggle('blank', !!base.blank); setUi(LS.get('mme-ui') || 'm');
    const side = scr.querySelector('aside'), meth = scr.querySelector('section.method'); if (side && meth) side.appendChild(meth);   // the notes under the map live in the side panel
    applyFit(true);
    if (base.blank) {                               // words that belong to Gresland alone
      const w = document.createTreeWalker($('opts'), NodeFilter.SHOW_TEXT); let n;
      while ((n = w.nextNode())) n.nodeValue = n.nodeValue.replace(' หรือยอดภูเขาสแตนเทอร์', '').replace('ชื่อสถานที่กับภูเขาสแตนเทอร์ก็ลากย้ายได้', 'ชื่อสถานที่ก็ลากย้ายได้');
    }
    const dl = await Promise.race([platform.downloads, new Promise(res => setTimeout(() => res(null), 1500))]);
    const env = { db, meta, room: guestRoom || null, canEdit: true, maxDoc: 4000000, saveDelay: guestRoom ? 260 : 500, saveFile, peers: [],
      savedText: () => cur && cur.guest ? 'ส่งถึงเจ้าของห้องแล้ว' : cur && cur.room ? 'บันทึกแล้ว ส่งให้ห้องแล้ว' : 'บันทึกในเครื่องนี้แล้ว' };
    env.downloads = dl || { save: ({ filename, data }) => saveFile(filename, data) };
    cur = { meta, db, room: guestRoom || null, guest: !!guestRoom, practice: !!practice, env, rt: null, roomShut: !!guestRoom };   // a friend's panel of the room starts put away: the chip in the bar opens it
    cur.rt = MME.startMap(base, env);
    wireMapBar();
    return true;
  }
  // ---------- the fitted screen: on a screen wide enough the map takes the whole window, and the panels lie over it ----------
  const FITMQ = window.matchMedia && !/[?&]fit=0\b/.test(location.search) ? matchMedia('(min-width: 981px) and (min-height: 600px)') : null;   // ?fit=0 keeps the scrolling page, for the tests written on it
  // fold: the options show their title bar alone. ox, oy: where the owner dragged them, from the map's top left corner (null: where the layout puts them)
  const PAN = { side: true, opts: true, fold: false, ox: null, oy: null }, DOCKW = 330;
  try { const p = JSON.parse(LS.get('mme-panels') || 'null'); if (p) { PAN.side = p.side !== false; PAN.opts = p.opts !== false; PAN.fold = !!p.fold; if (Number.isFinite(p.ox) && Number.isFinite(p.oy)) { PAN.ox = p.ox; PAN.oy = p.oy; } } } catch (err) { /* both shown */ }
  const panSave = () => LS.set('mme-panels', JSON.stringify(PAN));
  let SHUT = {}; try { SHUT = JSON.parse(LS.get('mme-cards') || '{}') || {}; } catch (err) { SHUT = {}; }
  const MODENAME = { view: 'ดูแผนที่', terrain: 'ระบายภูมิประเทศ', river: 'วาดแม่น้ำ', city: 'วางเมือง', label: 'ใส่ชื่อสถานที่', route: 'ถนน', trade: 'การค้า', climate: 'ภูมิอากาศ', econ: 'เศรษฐกิจ', info: 'แก้ข้อมูล' };
  function applyFit(first) {
    const scr = $('mapscreen'), box = $('mapbox'); if (!box) return;
    const on = !!(FITMQ && FITMQ.matches), teach = document.body.classList.contains('tutoring');
    // on the fitted screen the tools ride in the top bar beside the map's name, so the map gets the row they stood in
    const bar = scr.querySelector('.mapbar'), row = scr.querySelector('#toolbar .tbrow'), md = $('modes'), hi = $('history'), gr = bar && bar.querySelector('.grow');
    if (bar && row && md && hi && gr) { if (on && md.parentNode !== bar) { bar.insertBefore(md, gr); bar.insertBefore(hi, gr); } else if (!on && md.parentNode !== row) { row.insertBefore(hi, row.firstChild); row.insertBefore(md, hi); } }
    scr.classList.toggle('onebar', on && !!md && md.parentNode === bar);
    const op = $('opts'), moved = on && !teach && PAN.ox != null, fold = on && !teach && PAN.fold;
    if (op) { op.classList.toggle('folded', fold); op.classList.toggle('moved', moved); const f = $('optsFold'); if (f) { f.textContent = fold ? '▸' : '▾'; f.setAttribute('aria-expanded', String(!fold)); } }
    scr.classList.toggle('fit', on); scr.classList.toggle('noside', on && !PAN.side); scr.classList.toggle('noopts', on && !PAN.opts);
    { const ctl = scr.querySelector('.ctl'); if (ctl && ctl.offsetHeight > 0) scr.style.setProperty('--ctlh', ctl.offsetHeight + 'px'); }   // the bar over the map may take two rows on a narrow window: the options start below it (v0.15.1)
    box.classList.toggle('free', on); box.dataset.padr = on && PAN.side ? '342' : '0';
    // where the window is wide for its height, the tool's options stand in the strip left of the map and cover none of it
    let dock = false;
    if (on && PAN.opts && cur && !moved && !fold) { const G = MME.gridFor(cur.meta.cols, cur.meta.rows), b = box.getBoundingClientRect(); dock = b.height > 200 && (b.width - (PAN.side ? 342 : 0) - DOCKW) / G.w >= 0.85 * b.height / G.h; }   // the strip may cost the map up to a seventh of its size: that is less than the options would cover
    // In a lesson she stands at the left edge, which is where the options stand too. Where the window is wide enough the options
    // move to her right and the map takes what is left; where it is not, the options end above her head and scroll inside
    // themselves. Either way nothing she points at is behind her.
    let shift = 0, cap = 0; const fig = on && PAN.opts && document.body.classList.contains('tutoring') ? document.querySelector('#tutor .tu-fig') : null;
    if (fig) {
      const f = fig.getBoundingClientRect(), b = box.getBoundingClientRect(), at = f.left + 0.8 * f.width - b.left;
      if (f.width > 0 && innerWidth > 760) { if (b.width - (PAN.side ? 342 : 0) - DOCKW - at >= 480) shift = Math.max(0, Math.round(at)); else { const o1 = scr.querySelector('.opts'), r1 = o1 ? o1.getBoundingClientRect() : null, top1 = r1 && r1.height > 0 ? r1.top : b.top + 54; cap = Math.max(96, Math.round(f.top + 0.127 * f.width - top1)); } }   // from where the options begin, measured: the bar over the map may take two rows (v0.17.0)
    }
    if (shift) dock = true;
    scr.style.setProperty('--tush', shift + 'px'); scr.style.setProperty('--tumax', cap ? cap + 'px' : '9999px');
    // beside her, the options may run down to where her box of words begins
    const reach = fig && /^(ask|mad)$/.test(fig.dataset.pose || ''), tub = fig && shift && !reach ? document.querySelector('#tutor .tu-box') : null,   // two of her poses hold an arm far out at the height of her box: under those the options keep their shorter length
     tb0 = tub ? tub.getBoundingClientRect() : null, o0 = scr.querySelector('.opts'), ot = o0 && o0.getBoundingClientRect().height > 0 ? o0.getBoundingClientRect().top : $('toolbar') ? $('toolbar').getBoundingClientRect().bottom + 46 : 164,   // where the options begin: measured, since the size of the page's letters moves it
     tl = tb0 && tb0.height > 0 ? Math.round(tb0.top - ot - 8) : 0;
    if (tl >= 140) scr.style.setProperty('--tuh', tl + 'px'); else scr.style.removeProperty('--tuh');
    scr.style.setProperty('--tuh0', Math.max(120, Math.round(innerHeight - ot - 216)) + 'px');
    scr.classList.toggle('dock', dock); box.dataset.padl = dock ? String(DOCKW + shift) : '0';
    if (op) {                                       // where the owner dragged the options: kept inside the map's box, whatever its size now
      if (moved) { const t = $('toolbar').getBoundingClientRect(), b = box.getBoundingClientRect(), w = op.offsetWidth || 310, h = Math.min(op.offsetHeight || 40, b.height - 8); op.style.left = Math.round(b.left - t.left + Math.max(4, Math.min(b.width - w - 4, PAN.ox))) + 'px'; op.style.top = Math.round(b.top - t.top + Math.max(4, Math.min(b.height - h - 4, PAN.oy))) + 'px'; }
      else { op.style.left = ''; op.style.top = ''; }
    }
    const bs = $('panSide'), bo = $('panOpts');
    if (bs) { bs.hidden = !on; bs.setAttribute('aria-pressed', String(PAN.side)); } if (bo) { bo.hidden = !on; bo.setAttribute('aria-pressed', String(PAN.opts)); }
    if (!first && cur && cur.rt) cur.rt.refit();
  }
  function panels(o) { if (o.side != null) PAN.side = !!o.side; if (o.opts != null) PAN.opts = !!o.opts; if (o.fold != null) PAN.fold = !!o.fold; if ('ox' in o) { PAN.ox = o.ox; PAN.oy = o.oy; } panSave(); applyFit(false); }
  window.addEventListener('resize', () => { if (cur) applyFit(false); });
  if (FITMQ) { const h = () => applyFit(false); if (FITMQ.addEventListener) FITMQ.addEventListener('change', h); else if (FITMQ.addListener) FITMQ.addListener(h); }
  let metaT = 0;
  function touchMeta(now) {                         // the library card follows the map: its date, and a small picture of it
    if (!cur || cur.guest || cur.practice) return;
    clearTimeout(metaT);
    const run = async () => { if (!cur || cur.guest || cur.practice) return; const m = cur.meta; m.updated = Date.now(); try { m.thumb = cur.rt.thumb() || m.thumb; } catch (err) { /* keep the old picture */ } await store.putMeta(m); backup.touch(m.id); };
    if (now) return run(); metaT = setTimeout(run, 4000);
  }
  async function openMap(id) {
    const meta = await store.getMeta(id); if (!meta) { toast('ไม่พบแผนที่นี้ในคลัง'); renderLibrary(); return; }
    const db = MME.MapDb(MME.libraryBack(id), () => { touchMeta(false); if (cur && cur.room && cur.room.touch) cur.room.touch(); });
    await mount(meta, db, null);
  }
  // a map for the lessons: it lives in this page's memory and leaves with the lesson
  async function openPractice(meta, docs) {
    if (cur) return false;
    const db = MME.MapDb(MME.memoryBack(docs), () => {});
    return mount(meta, db, null, true);
  }
  async function keepPractice() {
    if (!cur || !cur.practice) return;
    await cur.rt.flush();
    let thumb = ''; try { thumb = cur.rt.thumb() || ''; } catch (err) { thumb = ''; }
    const m = await store.importMap({ format: 'map-maker-engine', version: 1, meta: { ...cur.meta, title: cur.meta.title, thumb }, docs: cur.db.docs() }, false);
    delete m.backup; await store.putMeta(m); backup.soon();
    toast('เก็บแผนที่ฝึกลงคลังแล้ว เป็นสำเนา ณ ตอนนี้ งานหลังจากนี้ในบทเรียนไม่ตามไป', 6000);
  }
  async function closeMap(why) {
    if (!cur) return; const c = cur;
    try { await c.rt.flush(); } catch (err) { /* nothing more to save */ }
    if (!c.guest && !c.practice) await touchMeta(true);
    if (c.room) c.room.close();
    cur = null; c.rt.destroy(); c.db.destroy(); lent.delete(c.meta.id);
    $('mapscreen').innerHTML = ''; showScreen(false); document.title = MME.NAME; titleWas = null; await renderLibrary(); if (!c.guest && !c.practice) backup.soon();
    if (c.practice && MME.tutor) MME.tutor.closed();
    if (why) toast(why, 7000);
  }
  window.addEventListener('pagehide', () => { if (cur) { try { cur.rt.flush(); } catch (err) { /* closing */ } if (cur.room) cur.room.close(); } });

  function wireMapBar() {
    const op = $('opts');
    if (op && !$('optsFold')) {
      // The owner asked that the notes lying over the map can be dragged and folded (23 Nov 2026). The options get a title bar:
      // drag it to move them, press the arrow to fold them to that bar, double-click it to send them back where the layout puts them.
      const hd = document.createElement('div'); hd.className = 'ohead'; hd.title = 'ลากเพื่อย้ายตัวเลือก ดับเบิลคลิกเพื่อคืนที่เดิม';
      hd.innerHTML = '<span class="ogrip" aria-hidden="true">⠿</span><span class="otitle" id="optsTitle">ตัวเลือกของเครื่องมือ</span><button type="button" id="optsFold" aria-expanded="true" title="พับหรือกางตัวเลือกของเครื่องมือ">▾</button>';
      op.insertBefore(hd, op.firstChild);
      $('optsFold').onclick = e => { e.stopPropagation(); panels({ fold: !PAN.fold }); };
      let d = null;
      hd.addEventListener('pointerdown', e => { if (e.button !== 0 || e.target.closest('button') || !$('mapscreen').classList.contains('fit') || document.body.classList.contains('tutoring')) return; const r = op.getBoundingClientRect(); d = { dx: e.clientX - r.left, dy: e.clientY - r.top, go: false, x: e.clientX, y: e.clientY }; try { hd.setPointerCapture(e.pointerId); } catch (err) { /* a nicety */ } e.preventDefault(); });
      hd.addEventListener('pointermove', e => { if (!d) return; if (!d.go && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 4) return; d.go = true; const b = $('mapbox').getBoundingClientRect(); PAN.ox = Math.round(e.clientX - d.dx - b.left); PAN.oy = Math.round(e.clientY - d.dy - b.top); op.classList.add('dragging'); applyFit(false); });
      const end = () => { if (!d) return; const went = d.go; d = null; op.classList.remove('dragging'); if (went) { const b = $('mapbox').getBoundingClientRect(), r = op.getBoundingClientRect(); PAN.ox = Math.round(r.left - b.left); PAN.oy = Math.round(r.top - b.top); panSave(); } };
      hd.addEventListener('pointerup', end); hd.addEventListener('pointercancel', end);
      hd.addEventListener('dblclick', e => { if (e.target.closest('button')) return; panels({ ox: null, oy: null }); });
      const name = () => { const m = $('mapbox').dataset.mode; $('optsTitle').textContent = MODENAME[m] ? 'ตัวเลือก: ' + MODENAME[m] : 'ตัวเลือกของเครื่องมือ'; if (cur && cur.guest && cur.room && cur.room.status) cur.room.status(m); };
      new MutationObserver(name).observe($('mapbox'), { attributes: true, attributeFilter: ['data-mode'] }); name();
      // each card of the side panel folds to its heading, and stays so between visits
      for (const c of document.querySelectorAll('#mapscreen aside .card')) {
        const h = c.querySelector(':scope > h2'); if (!h || !c.id) continue;
        h.tabIndex = 0; h.setAttribute('role', 'button'); h.title = 'พับหรือกางการ์ดนี้';
        const set = () => { c.classList.toggle('shut', !!SHUT[c.id]); h.setAttribute('aria-expanded', String(!SHUT[c.id])); };
        const flip = () => { if (document.body.classList.contains('tutoring')) return; if (SHUT[c.id]) delete SHUT[c.id]; else SHUT[c.id] = 1; LS.set('mme-cards', JSON.stringify(SHUT)); set(); };
        h.addEventListener('click', flip); h.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } }); set();
      }
    }
    const tb = document.querySelector('#toolbar .tbrow'), st = $('status');
    if (tb && st && !$('panSide')) {                // two switches for the panels that lie over the map
      const g = document.createElement('div'); g.className = 'seg panseg';
      g.innerHTML = '<button type="button" id="panOpts" title="แสดงหรือซ่อนตัวเลือกของเครื่องมือที่ลอยอยู่บนแผนที่">ตัวเลือก</button><button type="button" id="panSide" title="แสดงหรือซ่อนแผงการ์ดทางขวา">แผงข้าง</button>';
      const bar = document.querySelector('#mapscreen .mapbar'), chip = $('roomChip');   // the save status and the switches ride in the top bar, so the tools keep one row
      if (bar && chip) { bar.insertBefore(st, chip); bar.insertBefore(g, chip); } else tb.insertBefore(g, st);
      $('panSide').onclick = () => panels({ side: !PAN.side }); $('panOpts').onclick = () => panels({ opts: !PAN.opts });
      if (window.ResizeObserver) { const ro = new ResizeObserver(() => { const w = document.querySelector('#mapscreen .wrap'), t = $('toolbar'); if (w && t) w.style.setProperty('--tbh', t.querySelector('.tbrow').offsetHeight + 8 + 'px'); }); ro.observe($('toolbar')); }
      if (window.ResizeObserver) { const ctl = document.querySelector('#mapscreen .ctl'), scr = $('mapscreen'); if (ctl) new ResizeObserver(() => { if (ctl.offsetHeight > 0) scr.style.setProperty('--ctlh', ctl.offsetHeight + 'px'); }).observe(ctl); }
    }
    applyFit(true); requestAnimationFrame(() => { if (cur) applyFit(false); });
    const m = cur.meta, guest = cur.guest, practice = cur.practice;
    const head = () => { $('mmTitle').textContent = m.title; $('mmSub').textContent = `${m.cols} × ${m.rows} ช่อง · ช่องละ ${m.kmPerHex} กม.` + (guest ? ' · แผนที่ของเจ้าของห้อง' : ''); $('mmTitle').title = m.title + ' · ' + $('mmSub').textContent; document.title = m.title + ' · ' + MME.NAME; };
    head();
    $('mmBack').textContent = practice ? '← ออกจากบทเรียน' : guest ? '← ออกจากห้อง' : '← คลังแผนที่';
    $('mmBack').onclick = () => practice && MME.tutor ? MME.tutor.quit('') : closeMap(guest ? 'ออกจากห้องแล้ว แผนที่ไม่ได้ถูกเก็บไว้ในเครื่องนี้' : '');
    $('setTitle').value = m.title; $('setKm').value = m.kmPerHex;
    $('setTitle').disabled = guest; $('setKm').disabled = guest; $('setExport').hidden = guest;
    $('setTitle').onchange = () => { m.title = ($('setTitle').value.trim() || m.title).slice(0, 80); $('setTitle').value = m.title; head(); touchMeta(true); };
    $('setKm').onchange = () => { m.kmPerHex = Math.max(0.1, Math.min(1000, +$('setKm').value || m.kmPerHex)); $('setKm').value = m.kmPerHex; head(); cur.rt.requestDraw(); cur.rt.recalc(); touchMeta(true); };
    if (practice) { $('setExport').textContent = 'เก็บแผนที่ฝึกนี้ลงคลัง'; }
    $('setExport').onclick = practice ? keepPractice : async () => { await cur.rt.flush(); await touchMeta(true); const f = await withBase(await store.exportMap(m.id)); if (f) { await saveFile(slug(m.title) + '.mapmaker.json', JSON.stringify(f)); await markBackup([m.id]); } };
    const rb = $('setRestore'); let arm = 0;
    const rbShow = () => { rb.hidden = guest || !m.roomBackup || !!(cur && cur.room); rb.textContent = 'คืนแผนที่กลับไปก่อนเปิดห้องครั้งล่าสุด'; };
    rbShow(); cur.rbShow = rbShow;
    rb.onclick = async () => {
      if (!arm) { arm = 1; rb.textContent = 'กดอีกครั้งเพื่อคืนค่า งานหลังจากนั้นจะหายไป'; setTimeout(() => { arm = 0; if ($('setRestore')) rbShow(); }, 5000); return; }
      const id = m.id; await closeMap(''); await store.copyDocs(id + '@room', id); await openMap(id); toast('คืนแผนที่กลับไปก่อนเปิดห้องครั้งล่าสุดแล้ว');
    };
    $('setNote').textContent = practice ? 'แผนที่ฝึกอยู่แค่ระหว่างบทเรียน ออกจากบทเรียนแล้วจะหายไป เว้นแต่กดเก็บลงคลัง' : guest ? 'แผนที่นี้อยู่ในเครื่องของเจ้าของห้อง เครื่องนี้ถือไว้ชั่วคราวระหว่างอยู่ในห้องเท่านั้น' : 'แผนที่นี้เก็บในเบราว์เซอร์ของเครื่องนี้ ส่งออกไฟล์ไว้สำรองเป็นระยะ';
    $('roomOpen').hidden = guest; $('roomOpen').onclick = practice ? () => toast('แผนที่ฝึกเปิดห้องไม่ได้ ลองกับแผนที่ในคลังของคุณ') : openRoom;
    $('roomClose').onclick = () => { if (cur && cur.room && !cur.guest) { cur.room.close(); cur.room = null; cur.env.room = null; cur.env.saveDelay = 500; cur.people = []; cur.rt.setPeers([]); roomUI(null); if (cur.rbShow) cur.rbShow(); toast('ปิดห้องแล้ว ทุกคนออกจากห้อง'); } };
    $('roomCopy').onclick = () => { const code = cur && cur.room && cur.room.code; if (!code) return; try { navigator.clipboard.writeText(showCode(code)).then(() => toast('คัดลอกรหัสห้องแล้ว'), () => toast('คัดลอกไม่ได้ จดรหัสจากหน้าจอแทน')); } catch (err) { toast('คัดลอกไม่ได้ จดรหัสจากหน้าจอแทน'); } };
    $('roomChip').onclick = () => { if (!cur || !cur.room) return; cur.roomShut = !cur.roomShut; roomUI(); };
    $('roomHide').onclick = () => { if (!cur) return; cur.roomShut = true; roomUI(); };
    roomUI(guest ? [] : null);
  }
  // ---------- the room: who is in it, what they are doing, and who is kept out ----------
  // The owner asked to be told when someone comes in, to be able to look at that person's name and state, and to send them out
  // or shut them out of the map (23 Nov 2026). The panel of the room hangs under its chip in the top bar; the chip opens and
  // closes it. A kick holds while this room stands. A ban is written on the map itself (meta.bans) and holds in every later room.
  const clock = t => { const d = new Date(t); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  const ago = t => { const m = Math.max(0, Math.round((Date.now() - t) / 60000)); return m < 1 ? 'เพิ่งเข้ามา' : m < 60 ? 'อยู่มา ' + m + ' นาที' : 'อยู่มา ' + Math.floor(m / 60) + ' ชม. ' + (m % 60) + ' นาที'; };
  function stateOf(p) {                              // one line on what a friend is doing, from what the owner's page itself has seen
    const mode = MODENAME[p.md] ? 'โหมด' + MODENAME[p.md] : '', busy = p.last && p.edits && Date.now() - p.last < 45000;
    return (busy ? 'กำลังแก้' : p.edits ? 'ดูอยู่ แก้ล่าสุด ' + clock(p.last) : 'ดูอยู่ ยังไม่ได้แก้') + (mode ? ' · ' + mode : '');
  }
  function bansHTML() {
    const bans = cur && !cur.guest && Array.isArray(cur.meta.bans) ? cur.meta.bans : [];
    return bans.length ? '<span class="lbl">ถูกแบนจากแผนที่นี้ ' + bans.length + ' คน</span>' + bans.map(b => `<span class="banrow">${esc(b.name || 'ไม่ระบุชื่อ')}<small>${esc(fmtDate(b.at))}</small><button type="button" class="btn" data-unban="${esc(b.k)}">ปลดแบน</button></span>`).join('') : '';
  }
  function bansUI() {
    const h = bansHTML();
    for (const id of ['roomBans', 'setBans']) { const el = $(id); if (!el) continue; el.innerHTML = h; el.hidden = !h; for (const b of el.querySelectorAll('[data-unban]')) b.onclick = () => unban(b.dataset.unban); }
  }
  async function unban(key) {
    if (!cur || cur.guest) return; const m = cur.meta, was = (m.bans || []).find(b => b.k === key);
    m.bans = (m.bans || []).filter(b => b.k !== key); if (!m.bans.length) delete m.bans; await store.putMeta(m);
    if (cur.room && cur.room.unban) cur.room.unban(key);
    roomSay({ t: 'unban', name: was ? was.name : '', at: Date.now() }, true); bansUI(); toast('ปลดแบน ' + (was && was.name ? was.name : 'คนนี้') + ' แล้ว เข้าห้องของแผนที่นี้ได้อีก');
  }
  const EVTEXT = { join: 'เข้าห้อง', leave: 'ออกจากห้อง', refused: 'ถูกกันไว้ พยายามเข้าห้อง', kick: 'ถูกเตะออก', ban: 'ถูกแบนจากแผนที่', unban: 'ถูกปลดแบน' };
  let titleWas = null;
  document.addEventListener('visibilitychange', () => { if (!document.hidden && titleWas != null) { document.title = titleWas; titleWas = null; } });
  function roomSay(ev, quiet) {                      // something happened in the room: the owner is told, and it goes on the room's list
    if (!cur || !cur.room) return;
    (cur.roomLog = cur.roomLog || []).unshift(ev); cur.roomLog.length = Math.min(cur.roomLog.length, 30);
    const name = ev.name || 'ไม่ระบุชื่อ';
    if (!quiet && (ev.t === 'join' || ev.t === 'leave' || ev.t === 'refused')) {
      toast(ev.t === 'join' ? name + ' เข้าห้องแล้ว' : ev.t === 'leave' ? name + ' ออกจากห้องแล้ว' : name + ' ถูกกันไว้ แต่พยายามเข้าห้องอีกครั้ง', 6000);
      const chip = $('roomChip'); if (chip) { chip.classList.remove('ping'); void chip.offsetWidth; chip.classList.add('ping'); }
      if (ev.t === 'join' && document.hidden) { if (titleWas == null) titleWas = document.title; document.title = '● ' + name + ' เข้าห้อง · ' + titleWas; }
    }
    roomLogUI();
  }
  function roomLogUI() {
    const el = $('roomLog'); if (!el || !cur) return; const log = cur.roomLog || [];
    el.hidden = !log.length || cur.guest; el.innerHTML = log.slice(0, 8).map(e => `<li><time>${clock(e.at)}</time> ${esc(e.name || 'ไม่ระบุชื่อ')} ${EVTEXT[e.t] || ''}</li>`).join('');
  }
  function roomUI(people) {
    if (!cur) return; const inRoom = !!cur.room, guest = cur.guest;
    if (people) cur.people = people;
    $('roomPanel').hidden = !inRoom || !!cur.roomShut; $('roomChip').hidden = !inRoom; $('roomOpen').hidden = inRoom || guest;
    $('roomChip').setAttribute('aria-expanded', String(inRoom && !cur.roomShut));
    bansUI();
    if (!inRoom) return;
    $('roomCode').textContent = showCode(cur.room.code); $('roomClose').hidden = guest;
    $('roomWhere').textContent = cur.online === false ? 'ห้องทดลอง ใช้ได้เฉพาะระหว่างแท็บของเบราว์เซอร์นี้ เพราะหน้านี้ต่อห้องออนไลน์ไม่ได้' : guest ? 'คุณอยู่ในห้องของเจ้าของแผนที่ ทุกการแก้ส่งไปเก็บที่เครื่องของเจ้าของ แผนที่นี้ไม่ถูกเก็บลงคลังของคุณ' : 'บอกรหัสนี้กับเพื่อน เพื่อนเปิดหน้านี้' + (fire ? ' เข้าสู่ระบบด้วย Google ' : '') + 'แล้วใส่รหัสที่เมนู แผนที่ยังอยู่ในเครื่องนี้เท่านั้น ถ้าคุณปิดห้องหรือออกจากหน้านี้ ทุกคนจะหลุดออกทันที';
    const list = cur.people || [];
    $('roomChipText').textContent = (guest ? 'อยู่ในห้อง ' : 'ห้องเปิดอยู่ ') + showCode(cur.room.code) + ' · ' + Math.max(1, list.length) + ' คน';
    $('roomPeople').innerHTML = list.map(p => {
      const dot = `<i style="background:${/^#[0-9a-f]{6}$/i.test(p.color) ? p.color : '#aaa'}"></i>`, who = `<b>${esc(p.name)}</b>${p.host ? '<small>เจ้าของ</small>' : ''}${p.me ? '<small>คุณ</small>' : ''}`;
      if (guest || p.me || p.host) return `<li>${dot}${who}${!p.me && !p.host && MODENAME[p.md] ? `<span class="pst">โหมด${MODENAME[p.md]}</span>` : ''}</li>`;
      // the buttons ride on the line of the name, so they keep their place whatever the lines under them say
      return `<li class="pp" data-peer="${esc(p.peer)}">${dot}${who}
        <span class="pact"><button type="button" class="btn" data-look="${esc(p.peer)}"${Number.isFinite(p.x) && Number.isFinite(p.y) ? '' : ' disabled'} title="เลื่อนแผนที่ไปยังจุดที่คนนี้ชี้อยู่">ไปดู</button><button type="button" class="btn" data-kick="${esc(p.peer)}" title="ให้ออกจากห้องรอบนี้ เข้ากลับมาไม่ได้จนกว่าจะเปิดห้องใหม่">เตะออก</button><button type="button" class="btn warn${banArm === p.peer ? ' armed' : ''}" data-ban="${esc(p.peer)}" title="ให้ออก และกันไม่ให้เข้าห้องของแผนที่นี้อีกจนกว่าจะปลดแบน กดสองครั้งเพื่อยืนยัน">${banArm === p.peer ? 'ยืนยันแบน' : 'แบน'}</button></span>
        <span class="pst">${esc(stateOf(p))}</span>
        <span class="pmeta">${p.since ? 'เข้ามา ' + clock(p.since) + ' · ' + ago(p.since) + ' · ' : ''}แก้ ${p.edits || 0} ครั้ง · ${p.key && p.key[0] === 'u' ? (cur.online === false ? 'แท็บของเบราว์เซอร์นี้' : 'มีบัญชีให้ระบบจำ') : p.key ? 'ไม่มีบัญชี ระบบจำได้จากเบราว์เซอร์ของเขา' : 'ไม่มีบัญชีให้ระบบจำ'}</span></li>`;
    }).join('');
    for (const b of $('roomPeople').querySelectorAll('[data-kick]')) b.onclick = () => cur && cur.room && cur.room.kick && cur.room.kick(b.dataset.kick);
    for (const b of $('roomPeople').querySelectorAll('[data-look]')) b.onclick = () => { const p = cur && (cur.people || []).find(q => q.peer === b.dataset.look); if (p && cur.rt.lookAt) cur.rt.lookAt(p.x, p.y); };
    for (const b of $('roomPeople').querySelectorAll('[data-ban]')) b.onclick = () => banPeer(b);
    roomLogUI();
  }
  let banArm = null;
  async function banPeer(b) {                        // twice to ban: it reaches past this room
    const peer = b.dataset.ban; if (!cur || !cur.room || !cur.room.ban) return;
    // the first press arms the button and the list is drawn again from that, so the wait for the second press survives the list
    // being redrawn every time someone in the room moves
    if (banArm !== peer) { banArm = peer; roomUI(); setTimeout(() => { if (banArm === peer) { banArm = null; if (cur && cur.room) roomUI(); } }, 5000); return; }
    banArm = null; const c = cur, e = c.room.ban(peer);
    if (e) { c.meta.bans = (c.meta.bans || []).filter(x => x.k !== e.k).concat([e]).slice(-200); await store.putMeta(c.meta); backup.touch(c.meta.id); toast('แบน ' + e.name + ' จากแผนที่นี้แล้ว จะเข้าห้องของแผนที่นี้ไม่ได้อีกจนกว่าคุณจะปลดแบน', 7000); }
    else toast('ให้ออกแล้ว แต่คนนี้ไม่มีบัญชีให้ระบบจำ จึงกันได้เฉพาะห้องรอบนี้', 7000);
    if (cur === c) roomUI();
  }
  setInterval(() => { if (cur && cur.room && !cur.guest && !cur.roomShut && $('roomPanel') && !document.hidden) roomUI(); }, 20000);   // the minutes on the list move on
  const showCode = c => { const u = String(c).toUpperCase(); return u.slice(0, 6) + '-' + u.slice(6); };
  const onPeople = list => { if (!cur) return; roomUI(list); cur.rt && cur.rt.setPeers(list.filter(p => !p.me && Number.isFinite(p.x) && Number.isFinite(p.y))); };
  async function openRoom() {
    if (!cur || cur.guest || cur.room) return;
    const name = myName(); if (!name) { toast('ใส่ชื่อที่เพื่อนจะเห็นก่อน ในช่องด้านบนของการ์ดห้อง'); $('roomName').hidden = false; $('roomNameIn').focus(); return; }
    $('roomOpen').disabled = true; $('roomOpen').textContent = 'กำลังเปิดห้อง';
    try {
      const j = await joiner(); if (!j) throw new Error('none');
      await cur.rt.flush();
      await store.copyDocs(cur.meta.id, cur.meta.id + '@room'); cur.meta.roomBackup = Date.now(); await store.putMeta(cur.meta);   // the map as it stands, kept in case the room goes wrong
      const c = cur, room = await MME.hostRoom({ join: j.join, code: MME.roomCode(), name, db: c.db, onPeople, base: () => c.meta.base === 'gresland' ? baseFor(c.meta).then(b => ({ img: b.img || '', G: b.G, D: b.D })) : null, bans: (c.meta.bans || []).map(b => b.k), onEvent: ev => { if (cur === c) roomSay(ev, ev.t === 'kick' || ev.t === 'ban'); }, meta: () => ({ title: c.meta.title, base: c.meta.base, cols: c.meta.cols, rows: c.meta.rows, kmPerHex: c.meta.kmPerHex, v: MME.VERSION }) });
      if (cur !== c) { room.close(); return; }
      c.room = room; c.online = j.online; c.env.room = room; c.env.saveDelay = 260; c.roomShut = false; c.roomLog = []; roomUI([]); if (c.rbShow) c.rbShow();
    } catch (err) { console.error(err); toast(err && err.say ? err.message : fire ? 'เปิดห้องไม่ได้ ลองอีกครั้ง' : 'เปิดห้องไม่ได้ในมุมมองนี้ ลองเปิดหน้านี้จากลิงก์ของ Artifact โดยตรง', 7000); }
    if ($('roomOpen')) { $('roomOpen').disabled = false; $('roomOpen').textContent = 'เปิดห้องแก้ร่วมกัน'; }
  }
  document.addEventListener('change', e => { if (e.target && e.target.id === 'roomNameIn') { const v = e.target.value.trim().slice(0, 24); if (v) { LS.set('mme-name', v); $('myName').value = v; $('roomName').hidden = true; openRoom(); } } });

  // a friend's room
  $('joinBtn').onclick = async () => {
    const code = $('joinCode').value.trim().toLowerCase().replace(/[^a-z0-9]/g, ''), name = myName();
    if (!name) { toast('ใส่ชื่อที่เพื่อนจะเห็นก่อน'); $('myName').focus(); return; }
    if (code.length !== 10) { toast('รหัสห้องมีสิบตัว ใส่ให้ครบตามที่เจ้าของแผนที่เห็นบนจอ'); $('joinCode').focus(); return; }
    LS.set('mme-name', name);
    $('joinBtn').disabled = true; $('joinBtn').textContent = 'กำลังเข้าห้อง';
    try {
      const j = await joiner(); if (!j) throw new Error('หน้านี้ต่อห้องไม่ได้ในมุมมองนี้');
      const r = await MME.joinRoom({ join: j.join, code, name, device: myDevice(), onPeople, onEnd: why => closeMap(why), needBase: m => NOGRES && m.base === 'gresland' });
      const meta = { id: 'room-' + code.slice(0, 6), title: String(r.meta.title || 'แผนที่ของเพื่อน').slice(0, 80), base: r.meta.base === 'gresland' ? 'gresland' : 'blank', cols: r.meta.cols | 0, rows: r.meta.rows | 0, kmPerHex: +r.meta.kmPerHex || 10 };
      if (!(meta.cols >= 8 && meta.cols <= 400 && meta.rows >= 8 && meta.rows <= 400)) { r.room.close(); throw new Error('แผนที่ของห้องนี้อ่านไม่ได้'); }
      if (r.base) lent.set(meta.id, r.base);          // the ground the owner handed over, held only while this page is in the room
      const ok = await mount(meta, r.db, r.room); if (ok) { cur.online = j.online; roomUI([]); try { r.room.status($('mapbox').dataset.mode); } catch (err) { /* said at the next change of tool */ } } else r.room.close();
    } catch (err) { toast(err && err.message ? err.message : 'เข้าห้องไม่ได้', 6000); }
    $('joinBtn').disabled = false; $('joinBtn').textContent = 'เข้าห้อง';
  };
  $('joinCode').addEventListener('keydown', e => { if (e.key === 'Enter') $('joinBtn').click(); });

  // ---------- which browser this is ----------
  // The engine has been tried on Google Chrome on a computer and nowhere else. The one-file build says so every time it is opened;
  // the hosted page says so when the browser is another one. The owner asked for this notice before real use (23 Nov 2026).
  (function browserNotice() {
    let chrome = false, name = '';
    try {
      const b = navigator.userAgentData && navigator.userAgentData.brands, ua = navigator.userAgent || '';
      if (b && b.length) { chrome = b.some(x => x.brand === 'Google Chrome'); name = (b.find(x => !/Not.?A.?Brand|Chromium/i.test(x.brand)) || {}).brand || 'Chromium'; }
      else { chrome = /Chrome\//.test(ua) && !/Edg\/|OPR\/|SamsungBrowser|YaBrowser|Vivaldi/.test(ua); name = /Firefox\//.test(ua) ? 'Firefox' : /Edg\//.test(ua) ? 'Microsoft Edge' : /OPR\//.test(ua) ? 'Opera' : /Safari\//.test(ua) && !/Chrome\//.test(ua) ? 'Safari' : chrome ? 'Google Chrome' : ''; }
      if (chrome && /Android|iPhone|iPad|Mobile/.test(ua)) { chrome = false; name = 'Chrome บนมือถือหรือแท็บเล็ต'; }
    } catch (err) { chrome = false; }
    MME.browser = { chrome, name };
    const off = !!window.MME_OFFLINE, key = off ? 'mme-br-off' : 'mme-br';
    if ((!off && chrome) || LS.get(key) === '1' || (navigator.webdriver && !window.MME_NOTICE_TEST)) return;   // a browser driven by a test script is not a person to tell
    $('brOff').hidden = !off;
    $('brNow').textContent = chrome ? 'เบราว์เซอร์ที่ใช้อยู่ตอนนี้คือ Google Chrome ซึ่งเป็นตัวที่ทดสอบแล้ว' : 'เบราว์เซอร์ที่ใช้อยู่ตอนนี้' + (name ? 'คือ ' + name : 'ไม่ใช่ Google Chrome') + ' ยังไม่ผ่านการทดสอบกับเครื่องมือนี้ ถ้าพบอะไรทำงานแปลก ให้ลองเปิดด้วย Google Chrome';
    $('brVeil').hidden = false;
    const close = () => { if ($('brKeep').checked) LS.set(key, '1'); $('brVeil').hidden = true; };
    $('brOk').onclick = close; setTimeout(() => { try { $('brOk').focus(); } catch (err) { /* no focus to give */ } }, 60);
  })();

  // ---------- start ----------
  $('vtag').textContent = MME.NAME + ' v' + MME.VERSION;
  // the first sight of the library waits a moment for the page to say who is looking; if the answer comes later it is drawn again
  (async () => {
    let late = false; whoP.then(async () => { if (!late) return; try { await seedGresland(); } catch (err) { console.error(err); } if (!cur) renderLibrary(); if (backup.ready) backup.ready.then(ok => { if (ok) backup.soon(); }); });
    await Promise.race([whoP, waitMs(HOSTED ? 3000 : 0)]); late = true;
    try { await seedGresland(); } catch (err) { console.error(err); } await renderLibrary();
  })();
  function reveal(id, top) {                               // bring a card of the side panel into sight: the panel shown, the card unfolded, scrolled to (v0.15.1)
    const c = $(id); if (!c || !cur || document.body.classList.contains('tutoring')) return;   // a lesson keeps the panels where it set them
    if (!PAN.side) panels({ side: true });
    if (SHUT[id]) { delete SHUT[id]; LS.set('mme-cards', JSON.stringify(SHUT)); c.classList.remove('shut'); const h = c.querySelector(':scope > h2'); if (h) h.setAttribute('aria-expanded', 'true'); }
    requestAnimationFrame(() => {                     // scroll the panel alone: the page itself stays where it is
      const a = c.closest('aside'); if (!a || c.hidden || !c.offsetParent) return; const ar = a.getBoundingClientRect(), cr = c.getBoundingClientRect(), d = cr.top - ar.top;
      if (top || d < 0 || cr.bottom > ar.bottom) a.scrollTo({ top: a.scrollTop + (top || d < 0 ? d : Math.min(d, cr.bottom - ar.bottom)), behavior: 'smooth' });
    });
  }
  document.addEventListener('click', e => { const b = e.target.closest ? e.target.closest('[data-reveal]') : null; if (b) reveal(b.dataset.reveal); });
  MME.shell = { openMap, closeMap, openPractice, panels, reveal, refit: () => applyFit(false), get cur() { return cur; }, renderLibrary };
})();
