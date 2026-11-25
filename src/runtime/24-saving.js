// ---------- saving: three documents, one write at a time each ----------
const DOCS = { terrain: 'map/terrain', rivers: 'map/rivers', cities: 'map/cities', marks: 'map/marks', routes: 'map/routes', info: 'map/info', trade: 'map/trade' };
let db = null, downloads = null, readOnly = false, offline = false, loadNote = '', saveErr = '';
const per = v => ({ terrain: v, rivers: v, cities: v, marks: v, routes: v, info: v, trade: v });
const loaded = per(false), failed = per(false), confirmed = per(false), dirty = per(false), saving = per(false), lastSaved = per(null), tries = per(0), saveT = {};
const settled = () => Object.keys(DOCS).every(k => loaded[k] || failed[k]);
// a stable form of a document, so the echo of our own write never reads as someone else's change
const canon = v => JSON.stringify(v, (k, x) => x && typeof x === 'object' && !Array.isArray(x) ? Object.keys(x).sort().reduce((o, key) => (o[key] = x[key], o), {}) : x);
function serial(k) {
  // rivOff: [line, hex] for each hidden stretch; line counts the map's rivers in the page's order, rivSig names that order
  if (k === 'terrain') return { v: 2, cols: COLS, rows: ROWS, cells: ED.cells.join(''), rivOff: [...HIDK].sort((a, b) => a - b).map(key => [Math.floor(key / N), key % N]), rivSig: RIVSIG };
  if (k === 'rivers') return { v: 1, rivers: ED.rivers.map(r => ({ id: r.id, kind: r.kind, pts: r.pts.map(p => [r1(p[0]), r1(p[1])]) })) };
  if (k === 'marks') return { v: 2, labels: [...ED.labels.values()].map(o => ({ ...plainLabel(o), x: r1(o.x), y: r1(o.y) })), lhidden: [...ED.lhid], stanther: ED.stan };
  if (k === 'routes') return { v: 1, routes: [...ED.routes.values()].map(plainRoute), hidden: [...ED.rthid] };
  if (k === 'trade') return { v: 2, links: [...ED.tlinks.values()].map(plainLink), hidden: [...ED.tlhid], hubs: Object.fromEntries(ED.hubs), parent: Object.fromEntries(ED.tparent) };
  if (k === 'info') {
    const obj = m => Object.fromEntries([...m].map(([key, o]) => [key, { ...o }]));
    return { v: 1, zones: obj(ED.zinfo), biomes: obj(ED.binfo), kinds: obj(ED.kinfo), points: [...ED.points.values()].map(o => ({ id: o.id, k: o.k, x: r1(o.x), y: r1(o.y), name: o.name || '', note: o.note || '' })), phidden: [...ED.phid] };
  }
  return { v: 1, cities: ED.cities.map(c => ({ id: c.id, name: c.name, kind: c.kind, note: c.note, x: r1(c.x), y: r1(c.y) })), hidden: [...ED.bhid] };
}
function scheduleSave(k) {
  dirty[k] = true; saveErr = ''; tries[k] = 0; status();
  if (!db || readOnly) return;
  clearTimeout(saveT[k]); saveT[k] = setTimeout(() => save(k), ENV.saveDelay || 700);
}
const LOCKED = ['invalid_argument', 'revoked', 'not_granted', 'capability_disabled', 'capability_removed', 'transform_error'];
async function save(k) {
  if (!db || readOnly || !loaded[k] || failed[k] || !dirty[k]) { status(); return; }   // a document never read is never written over
  if (saving[k]) return;                        // the write in flight picks up the rest when it lands
  saving[k] = true; dirty[k] = false; status();
  const body = serial(k), str = JSON.stringify(body);
  let retry = false;
  if (new TextEncoder().encode(str).length > (ENV.maxDoc || 250000)) { saveErr = 'งานแก้ส่วนนี้ใหญ่เกินกว่าจะบันทึกได้ ลองลบแม่น้ำที่ไม่ใช้แล้ว'; dirty[k] = true; }
  else {
    try { await db.doc(DOCS[k]).set(body); lastSaved[k] = canon(body); }
    catch (err) {
      dirty[k] = true;
      const code = err && err.code;
      if (LOCKED.includes(code)) { setReadOnly(); flash('บันทึกงานแก้ไม่ได้ เพราะบัญชีนี้แก้แผนที่นี้ไม่ได้'); }
      else if (code === 'quota_exceeded') saveErr = 'ที่เก็บงานแก้เต็ม บันทึกเพิ่มไม่ได้';
      else if (++tries[k] <= 2) retry = true;
      else saveErr = 'บันทึกไม่สำเร็จ จะลองใหม่เมื่อแก้ครั้งถัดไป';
    }
  }
  saving[k] = false;
  if (retry) setTimeout(() => save(k), 1500 + Math.random() * 1500);
  else if (dirty[k] && !saveErr && !readOnly) save(k);
  status();
}
function status() {
  const el = $('status'); let t = '', cls = '';
  const anySaving = Object.values(saving).some(Boolean), anyDirty = Object.values(dirty).some(Boolean);
  if (readOnly) { t = 'ดูได้อย่างเดียว'; }
  else if (!editable) { t = 'กำลังโหลดงานที่บันทึกไว้'; cls = 'busy'; }
  else if (offline) { t = 'หน้านี้บันทึกงานแก้ไม่ได้ งานแก้จะหายเมื่อปิดหน้า'; cls = 'bad'; }
  else if (saveErr) { t = saveErr; cls = 'bad'; }
  else if (loadNote) { t = loadNote; cls = 'busy'; }
  else if (anySaving) { t = 'กำลังบันทึก'; cls = 'busy'; }
  else if (anyDirty) { t = 'รอบันทึก'; cls = 'busy'; }
  else { t = ENV.savedText ? ENV.savedText() : 'บันทึกแล้ว'; cls = 'ok'; }
  el.textContent = t; el.className = 'status ' + cls;
}
function setReadOnly() {
  setMode('view'); readOnly = true; editable = false; selectCity(null); riv = null;
  for (const b of document.querySelectorAll('#modes button')) b.hidden = b.dataset.mode !== 'view' && b.dataset.mode !== 'trade' && b.dataset.mode !== 'climate';   // the trade and the climate can be looked at by anyone
  $('history').hidden = true; $('clearAll').hidden = true; $('editcard').hidden = true; $('viewEditHint').hidden = true; setTtool('pick');
  document.querySelector('#editcard h2').textContent = 'งานแก้บนแผนที่นี้';
  $('editnote').textContent = 'แผนที่นี้แสดงงานแก้ของเจ้าของแผนที่ หน้านี้ให้ดูได้อย่างเดียว';
  status(); updateHistory(); updatePointsLegend(); requestDraw();
}
function unlock() {
  if (editable || readOnly) return;
  editable = true;
  for (const b of document.querySelectorAll('#modes button')) b.disabled = false;
  $('tdTool').hidden = false; $('tdReset').hidden = false; setTtool(ttool);
  status(); updateStats(); updateHistory(); updatePointsLegend();   // v0.18.5: the points list gains its place-it rows
}
for (const b of document.querySelectorAll('#modes button')) if (b.dataset.mode !== 'view' && b.dataset.mode !== 'trade' && b.dataset.mode !== 'climate') b.disabled = true;
// remote documents are untrusted: keep only well formed values
const HEXC = /^#[0-9a-f]{6}$/i;
function cleanLabel(l) {
  // the first format kept only where the page's own names had moved: the rest of such a name comes from the page
  if (!l || typeof l.id !== 'string' || !Number.isFinite(l.x) || !Number.isFinite(l.y)) return null;
  const id = l.id.slice(0, 40), B = baseLabel(id);
  if (!B && (typeof l.text !== 'string' || !l.text.trim())) return null;
  const src = B ? labelOf(B) : { text: '', size: 'mid', ang: 0, color: '#f3ead2' }, old = D.oldl && D.oldl[id];
  const o = {
    id, text: typeof l.text === 'string' ? l.text.slice(0, 60) : src.text,
    x: Math.max(0, Math.min(G.w, l.x)), y: Math.max(0, Math.min(G.h, l.y)),
    size: LSIZE[l.size] ? l.size : src.size, ang: Number.isFinite(l.ang) ? LANG(l.ang) : src.ang,
    color: typeof l.color === 'string' && HEXC.test(l.color) ? l.color.toLowerCase() : src.color,
  };
  if (B) for (const f of ['text', 'size', 'color']) if (oldField(old, f, o[f])) o[f] = src[f];   // a name the user moved keeps the page's new wording
  return o;
}
const str = (v, n) => typeof v === 'string' ? v.slice(0, n) : '';
function cleanEnd(e) {
  if (typeof e === 'string' && e && e.length <= 40) return e;
  if (Array.isArray(e) && Number.isFinite(e[0]) && Number.isFinite(e[1])) return [Math.max(0, Math.min(G.w, e[0])), Math.max(0, Math.min(G.h, e[1]))];
  return null;
}
function cleanRoute(r) {
  if (!r || typeof r.id !== 'string' || !r.id || r.id.length > 40) return null;
  if (r.t !== 'road') return null;                  // trade is worked out, not stored: an old hand-laid trade route is let go
  const t = 'road', cls = RDC[r.cls] ? r.cls : 'laterite';
  const a = cleanEnd(r.a), b = cleanEnd(r.b); if (a == null || b == null) return null;
  const via = Array.isArray(r.via) ? r.via.slice(0, 60).map(cleanEnd).filter(p => Array.isArray(p)) : [];
  return { id: r.id, t, cls, a, b, via };
}
const oldField = (old, f, v) => old && f in old && (Array.isArray(old[f]) ? old[f].includes(v) : old[f] === v);   // a field may have had several wordings
function loadDoc(k, body) {
  if (k === 'trade') {
    ED.tlinks.clear(); ED.tlhid.clear(); ED.hubs.clear(); ED.tparent.clear();
    for (const o of body && Array.isArray(body.links) ? body.links.slice(0, 3000) : []) {
      if (!o || typeof o.id !== 'string' || !o.id || o.id.length > 120 || typeof o.a !== 'string' || typeof o.b !== 'string' || o.a.length > 40 || o.b.length > 40) continue;
      const via = Array.isArray(o.via) ? o.via.slice(0, 60).map(cleanEnd).filter(p => Array.isArray(p)) : [];
      ED.tlinks.set(o.id, { id: o.id, a: o.a, b: o.b, mode: LMODE[o.mode] ? o.mode : 'auto', via });
    }
    if (body && Array.isArray(body.hidden)) for (const id of body.hidden.slice(0, 3000)) if (typeof id === 'string' && id.startsWith('a:') && id.length <= 120) ED.tlhid.add(id);
    if (body && body.hubs && typeof body.hubs === 'object') for (const [id, v] of Object.entries(body.hubs)) {
      if (id.length > 40) continue;
      if (typeof v === 'boolean') ED.hubs.set(id, v ? 2 : 0);   // the first version's hub flag: made a hub, or unmade
      else if (Number.isInteger(v) && v >= 0 && v <= 3) ED.hubs.set(id, v);
    }
    if (body && body.parent && typeof body.parent === 'object') for (const [id, v] of Object.entries(body.parent)) if (id.length <= 40 && typeof v === 'string' && v && v.length <= 40 && v !== id) ED.tparent.set(id, v);
    return;
  }
  if (k === 'routes') {
    ED.routes.clear(); ED.rthid.clear();
    for (const r of body && Array.isArray(body.routes) ? body.routes.slice(0, 3000) : []) { const o = cleanRoute(r); if (o) ED.routes.set(o.id, o); }
    if (body && Array.isArray(body.hidden)) for (const id of body.hidden) if (typeof id === 'string' && baseRoad(id)) ED.rthid.add(id);
    return;
  }
  if (k === 'info') {
    for (const m of [ED.zinfo, ED.binfo, ED.kinfo]) m.clear();
    ED.points.clear(); ED.phid.clear();
    const take = (src, m, ok, fields) => { if (src && typeof src === 'object') for (const [key, o] of Object.entries(src)) if (ok(key) && o && typeof o === 'object') { const v = {}; for (const [f, n] of fields) v[f] = str(o[f], n); m.set(key, v); } };
    take(body && body.zones, ED.zinfo, c => !!ZONE[c], [['name', 60], ['lore', 1200], ['placed', 600]]);
    take(body && body.biomes, ED.binfo, b => !!BIOME[b], [['name', 60], ['note', 600]]);
    take(body && body.kinds, ED.kinfo, q => !!D.pointKinds[q], [['name', 60], ['note', 600]]);
    for (const o of body && Array.isArray(body.points) ? body.points.slice(0, 3000) : []) {
      if (!o || typeof o.id !== 'string' || !o.id || o.id.length > 40 || !D.pointKinds[o.k] || !Number.isFinite(o.x) || !Number.isFinite(o.y)) continue;
      ED.points.set(o.id, { id: o.id, k: o.k, x: Math.max(0, Math.min(G.w, o.x)), y: Math.max(0, Math.min(G.h, o.y)), name: str(o.name, 60), note: str(o.note, 600) });
    }
    if (body && Array.isArray(body.phidden)) for (const id of body.phidden) if (typeof id === 'string' && PTB.has(id)) ED.phid.add(id);
    refreshAllPTF();
    return;
  }
  if (k === 'terrain') {
    const cells = body && typeof body.cells === 'string' && body.cells.length === N ? body.cells : '';
    for (const key of [...HIDK]) setPair(key, false);
    for (const i of [...painted]) setCell(i, '.');
    for (let i = 0; i < N; i++) { const c = cells[i]; if (c && c !== '.' && CODES.includes(c) && c !== BI[i]) setCell(i, c); }
    if (body && Array.isArray(body.rivOff) && body.rivSig === RIVSIG) {
      for (const pr of body.rivOff.slice(0, 40000)) {
        if (!Array.isArray(pr)) continue;
        const [k, h] = pr;
        if (Number.isInteger(k) && Number.isInteger(h) && h >= 0 && h < N && (HEXLINES.get(h) || new Set()).has(k)) setPair(k * N + h, true);
      }
    } else if (body && typeof body.hide === 'string' && body.hide.length === N) {
      // the first format hid every line through a hex
      for (let h = 0; h < N; h++) if (body.hide[h] === '1') for (const k of HEXLINES.get(h) || []) setPair(k * N + h, true);
    }
  } else if (k === 'rivers') {
    for (const r of ED.rivers.slice()) removeRiver(r.id);
    const list = body && Array.isArray(body.rivers) ? body.rivers.slice(0, 3000) : [];
    for (const r of list) {
      if (!r || typeof r.id !== 'string' || !Array.isArray(r.pts)) continue;
      const pts = r.pts.filter(p => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1])).map(p => [Math.max(0, Math.min(G.w, p[0])), Math.max(0, Math.min(G.h, p[1]))]);
      if (pts.length >= 2) addRiver({ id: r.id.slice(0, 40), kind: RK[r.kind] ? r.kind : 'river', pts });
    }
    buildUserSamples();
  } else if (k === 'marks') {
    ED.labels.clear(); ED.lhid.clear();
    const list = body && Array.isArray(body.labels) ? body.labels.slice(0, 600) : [];
    for (const l of list) { const o = cleanLabel(l); if (o && !ED.labels.has(o.id)) ED.labels.set(o.id, o); }
    if (body && Array.isArray(body.lhidden)) for (const id of body.lhidden) if (typeof id === 'string' && baseLabel(id)) ED.lhid.add(id);
    const s = body && Number.isInteger(body.stanther) && body.stanther >= 0 && body.stanther < N ? body.stanther : null;
    setStan(s);
  } else {
    ED.cities.length = 0; ED.bhid.clear();
    const list = body && Array.isArray(body.cities) ? body.cities.slice(0, 2000) : [];
    for (const c of list) {
      if (!c || typeof c.id !== 'string' || !Number.isFinite(c.x) || !Number.isFinite(c.y)) continue;
      const id = c.id.slice(0, 40), o = { id, name: String(c.name || '').slice(0, 60), kind: CK[c.kind] ? c.kind : 'city', note: String(c.note || '').slice(0, 600), x: Math.max(0, Math.min(G.w, c.x)), y: Math.max(0, Math.min(G.h, c.y)) };
      const B = D.cities.find(q => q.id === id), old = D.oldc && D.oldc[id];
      if (B) for (const f of ['name', 'kind', 'note']) if (oldField(old, f, o[f])) o[f] = f === 'kind' ? B.kind || 'city' : B[f];   // the page's own city, field still as the page first had it
      const rn = !B && D.cren && D.cren[id]; if (rn && o.name === rn.from) o.name = rn.to;   // a city of the user's that the lore spells otherwise, still in the old spelling
      addCity(o);
    }
    if (body && Array.isArray(body.hidden)) for (const id of body.hidden) if (isBuiltin(id)) ED.bhid.add(id);
  }
}
let loadTimer = 0;
let softLoad = false;
const SOFTK = new Set(BLANK ? ['cities', 'routes', 'trade', 'marks', 'info'] : ['cities', 'routes', 'trade']);
function onSnap(k, snap) {
  let took = true;
  const body = snap.exists ? snap.data() : null, str = body ? canon(body) : null;
  if (!loaded[k]) {
    loaded[k] = true; failed[k] = false; lastSaved[k] = str;
    loadDoc(k, body);
    if (editable && undoS.length) {               // the store answered after the user began: their work goes on top of what was saved
      const fx = newFx(); for (const op of undoS) applyOp(op, 1, fx);
      if (canon(serial(k)) !== str) dirty[k] = true;
    }
    afterLoad(k);
  } else if (!snap.metadata.hasPendingWrites && !dirty[k] && !saving[k] && str !== lastSaved[k]) {
    lastSaved[k] = str;
    if (ENV.room) { softLoad = true; if (!(k === 'terrain' && softTerrain(body))) { loadDoc(k, body); afterLoad(k); } softLoad = false; }
    else { loadDoc(k, body); undoS.length = 0; redoS.length = 0; afterLoad(k); flash('มีการแก้จากหน้าต่างอื่น โหลดงานล่าสุดมาแล้ว'); }
  } else if (loaded[k] && str !== lastSaved[k]) took = false;      // unsaved work here: the store offers the merged document again
  if (!snap.metadata.fromCache) confirmed[k] = true;
  if (Object.values(confirmed).every(Boolean)) { clearTimeout(loadTimer); loadNote = ''; }
  if (settled()) unlock();
  status();
  return took;
}
let rebuildQ = 0;
function afterLoad(k) {
  if (sel && !visibleCities().some(c => c.id === sel)) selectCity(null); else refreshForm();
  afterLabels();
  if (k !== 'routes' && k !== 'info') bumpRoutes();
  if (k === 'info') infoChanged();
  afterRoutes();
  if (!rebuildQ && !(softLoad && SOFTK.has(k))) rebuildQ = setTimeout(() => { rebuildQ = 0; rebuildAll(); requestDraw(); }, 0);   // the three documents usually land together: one rebuild
  updateStats(); scheduleEcon();
  if (dirty[k]) scheduleSave(k);
}
function subscribe(k, attempt) {
  try { db.doc(DOCS[k]).onSnapshot(s => onSnap(k, s), err => onSnapErr(k, err, attempt)); }
  catch (err) { onSnapErr(k, err, attempt); }
}
function onSnapErr(k, err, attempt) {
  const code = err && err.code;
  if (code === 'revoked') { setReadOnly(); return; }
  if (code === 'unavailable' && attempt < 2) { setTimeout(() => subscribe(k, attempt + 1), 3000); return; }
  if (!loaded[k]) failed[k] = true;
  loadNote = 'ติดต่อที่เก็บงานแก้ไม่ได้ งานแก้ใหม่อาจไม่ถูกบันทึก';
  if (settled()) unlock();
  status();
}
async function initStore() {
  downloads = ENV.downloads || null;
  $('expPng').hidden = !downloads; $('expJson').hidden = !downloads;
  if (ENV.canEdit === false) setReadOnly();
  db = ENV.db || null;
  if (!db) { offline = !readOnly; unlock(); return; }
  loadTimer = setTimeout(() => { if (!settled()) { loadNote = 'ยังโหลดงานที่บันทึกไว้ไม่ได้ วาดต่อได้ งานใหม่จะรวมกับของเดิมเมื่อโหลดได้'; unlock(); } status(); }, 10000);
  for (const k of Object.keys(DOCS)) subscribe(k, 0);
}

