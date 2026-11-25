// ---------- cut a part of the map out as a new map (v0.19.0) ----------
// The owner asked to take a part of a map out as a map of its own. A rectangle is drawn over the map; the new map, put in the
// library beside this one, carries everything inside it as this map now stands: the ground as painted, the rivers (the map's own
// become drawn ones), the communities, names, roads and railways whose both ends lie inside, the trade lines of the owner's own,
// the points, the economy (states and their land, features, special zones, notes, the world's page) and the climate (heights
// as they are now, and the owner's own rain and warmth). The edge columns start on an even column so the hexes keep their
// order. What lies across the edge is cut there. This map is not touched.
const CROP = { on: false, a: null, b: null, act: null };
function cropRect() {
  if (!CROP.a || !CROP.b) return null;
  const ha = hexAt(CROP.a[0], CROP.a[1]), hb = hexAt(CROP.b[0], CROP.b[1]); if (ha < 0 || hb < 0) return null;
  let c0 = Math.min(cOf(ha), cOf(hb)), c1 = Math.max(cOf(ha), cOf(hb)), k0 = Math.min(kOf(ha), kOf(hb)), k1 = Math.max(kOf(ha), kOf(hb));
  if (c0 & 1) c0--; c0 = Math.max(c0, G.cmin + ((G.cmin & 1) ? 1 : 0));
  return { c0, c1, k0, k1, cols: c1 - c0 + 1, rows: k1 - k0 + 1 };
}
function cropBuild(rc, title) {
  const nc = rc.cols, nr = rc.rows, nN = nc * nr, NG = MME.gridFor(nc, nr), s = NG.R / R;
  const ox = G.x0 + rc.c0 * DX, oy = G.y0 + rc.k0 * DY;
  const mv = p => [r1(NG.x0 + (p[0] - ox) * s), r1(NG.y0 + (p[1] - oy) * s)];
  const map = new Int32Array(N).fill(-1), back = new Int32Array(nN).fill(-1);
  for (let c = rc.c0; c <= rc.c1; c++) for (let k = rc.k0; k <= rc.k1; k++) { const o = idAt(c, k); if (o < 0) continue; const n = (k - rc.k0) * nc + (c - rc.c0); map[o] = n; back[n] = o; }
  const inside = p => { const h = hexAt(p[0], p[1]); return h >= 0 && map[h] >= 0; };
  // the ground
  let cells = ''; for (let n = 0; n < nN; n++) { const o = back[n], e = o >= 0 ? eff(o) : 'S'; cells += e === 'S' ? '.' : e; }
  // rivers: the drawn ones, and the map's own as drawn ones, cut at the edge
  const rivers = [], cut = (pts, kind, id) => { let run = []; const flush = () => { if (run.length >= 2) rivers.push({ id: id + '-' + rivers.length, kind, pts: run }); run = []; }; for (const p of pts) { if (inside(p)) run.push(mv(p)); else flush(); } flush(); };
  for (const r of ED.rivers) cut(r.pts, r.kind, r.id);
  BRIV.forEach((r, k) => {
    const kind = r.s ? (r.w >= 2 ? 'searv' : 'seasonal') : r.w >= 3.3 ? 'big' : r.w >= 2 ? 'river' : 'stream', pts = [];
    let last = null; for (let j = r.s0; j < r.s1; j++) { if (sampleOff(j)) { if (pts.length) { cut(pts.splice(0), kind, 'b' + k); } last = null; continue; } const p = [BS.x[j], BS.y[j]]; if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) >= 2.5 || j === r.s1 - 1) { pts.push(p); last = p; } }
    if (pts.length) cut(pts, kind, 'b' + k);
  });
  // communities, names, points
  const cities = visibleCities().filter(c => inside([c.x, c.y])), ids = new Set(cities.map(c => c.id));
  const cdoc = { v: 1, cities: cities.map(c => { const p = mv([c.x, c.y]); return { id: c.id, name: c.name || '', kind: c.kind, note: c.note || '', x: p[0], y: p[1] }; }), hidden: [] };
  const labels = visibleLabels().filter(l => inside([l.x, l.y])).map(l => { const p = mv([l.x, l.y]); return { ...plainLabel(l), x: p[0], y: p[1], size: l.size }; });
  const points = visiblePoints().filter(p => p.h >= 0 && map[p.h] >= 0).map(p => { const q = mv([p.x, p.y]); return { id: p.id, k: p.k, x: q[0], y: q[1], name: p.name || '', note: p.note || '' }; });
  // roads and railways, and the owner's trade lines, with both ends inside
  const endIn = e => typeof e === 'string' ? ids.has(e) : Array.isArray(e) && inside(e), endMv = e => typeof e === 'string' ? e : mv(e);
  const routes = visibleRoutes().filter(r => endIn(r.a) && endIn(r.b)).map(r => { const o = plainRoute(r); return { ...o, a: endMv(o.a), b: endMv(o.b), via: o.via.filter(inside).map(mv) }; });
  const links = [...ED.tlinks.values()].filter(L => ids.has(L.a) && ids.has(L.b)).map(L => { const o = plainLink(L); return { ...o, via: o.via.filter(inside).map(mv) }; });
  const keepIds = o => Object.fromEntries(Object.entries(o).filter(([k]) => ids.has(k)));
  // the economy, its hexes renumbered
  const eco = JSON.parse(JSON.stringify(ecoSerial()));
  if (typeof eco.cells === 'string') { let t = ''; for (let n = 0; n < nN; n++) t += back[n] >= 0 ? eco.cells[back[n]] || '.' : '.'; eco.cells = t; }
  for (const f of ['feat', 'szc']) if (eco[f]) { const o = {}; for (const [c, list] of Object.entries(eco[f])) { const l = list.map(i => map[i]).filter(i => i >= 0); if (l.length) o[c] = l; } eco[f] = o; }
  if (eco.notes) { const o = {}; for (const [k, v] of Object.entries(eco.notes)) { if (k.startsWith('h:')) { const n = map[+k.slice(2)]; if (n >= 0) o['h:' + n] = v; } else if (k.startsWith('c:')) { if (ids.has(k.slice(2))) o[k] = v; } else o[k] = v; } eco.notes = o; }
  // the climate: the owner's own values renumbered; the heights as they now are, on every hex of land
  const A = climEnsure(), clim = JSON.parse(JSON.stringify(clSerial()));
  for (const f of ['e', 'p', 't']) { const o = {}; for (const [h, v] of Object.entries(clim[f] || {})) { const n = map[+h]; if (n >= 0) o[n] = v; } clim[f] = o; }
  for (let n = 0; n < nN; n++) { const o = back[n]; if (o >= 0 && !isW(eff(o)) && Number.isFinite(A.h[o]) && clim.e[n] == null) clim.e[n] = Math.round(clamp(A.h[o], 0, 12000)); }
  for (const f of ['st', 'sp']) { const o = {}; for (const [key, v] of Object.entries(clim[f] || {})) { const [sid, h] = key.split(':'), n = map[+h]; if (n >= 0) o[sid + ':' + n] = v; } clim[f] = o; }
  const l0 = clLat0(), l1 = clLat1(), latAt = k => l0 + (l1 - l0) * (k - G.kmin) / Math.max(1, ROWS - 1);
  clim.set = { ...(clim.set || {}), lat0: Math.round(latAt(rc.k0) * 10) / 10, lat1: Math.round(latAt(rc.k1) * 10) / 10 };
  return {
    format: 'map-maker-engine', version: 1,
    meta: { title: (title || 'ส่วนของ' + (ENV.meta && ENV.meta.title || 'แผนที่')).slice(0, 80), base: 'blank', cols: nc, rows: nr, kmPerHex: ENV.meta && +ENV.meta.kmPerHex || 34, created: Date.now() },
    docs: {
      terrain: { v: 2, cols: nc, rows: nr, cells, rivOff: [], rivSig: '0:0' }, rivers: { v: 1, rivers }, cities: cdoc,
      marks: { v: 2, labels, lhidden: [], stanther: null }, routes: { v: 1, routes, hidden: [] },
      info: { v: 1, zones: {}, biomes: Object.fromEntries([...ED.binfo].map(([k, o]) => [k, { ...o }])), kinds: Object.fromEntries([...ED.kinfo].map(([k, o]) => [k, { ...o }])), points, phidden: [] },
      trade: { v: 2, links, hidden: [], hubs: keepIds(Object.fromEntries(ED.hubs)), parent: keepIds(Object.fromEntries(ED.tparent)) },
      economy: eco, climate: clim,
    },
  };
}

// ---- the tool: a button on the map's card, a rectangle dragged over the map, a small window to name and make it ----
const cropEl = document.createElement('div'); cropEl.className = 'tripbox cropbox'; cropEl.hidden = true; $('mapbox').appendChild(cropEl);
for (const ev of ['pointerdown', 'wheel', 'click', 'keydown']) cropEl.addEventListener(ev, e => e.stopPropagation());
function cropCard() {
  cropEl.hidden = !CROP.on; if (!CROP.on) return; cropEl.style.right = (padR() + 56) + 'px'; const rc = cropRect(), km = ENV.meta && +ENV.meta.kmPerHex || 34;
  const ok = rc && rc.cols >= 8 && rc.rows >= 8 && rc.cols <= 400 && rc.rows <= 400;
  cropEl.innerHTML = `<div class="mmhead"><h3>ตัดส่วนแผนที่เป็นแผนที่ใหม่</h3><button type="button" class="btn" data-cr="close">ปิด</button></div>`
    + `<p class="hint">ลากกรอบบนแผนที่ครอบส่วนที่ต้องการ ลากซ้ำเพื่อเปลี่ยนกรอบ ลากด้วยปุ่มกลางหรือกด Space ค้างเพื่อเลื่อนแผนที่</p>`
    + (rc ? `<div class="tr">ขนาด <b>${rc.cols} × ${rc.rows}</b> ช่อง <span class="w">ราว ${fmtKm(rc.cols * km * 0.866)} × ${fmtKm(rc.rows * km)} กม.</span></div>` + (ok ? '' : '<div class="tr w">แผนที่ใหม่ต้องกว้างและสูงอย่างน้อย 8 ช่อง และไม่เกิน 400 ช่อง</div>') : '')
    + `<label class="full">ชื่อแผนที่ใหม่ <input type="text" id="crTitle" maxlength="80" value="${esc('ส่วนของ' + (ENV.meta && ENV.meta.title || 'แผนที่'))}"></label>`
    + `<div class="btns"><button type="button" class="btn" data-cr="make"${ok ? '' : ' disabled'}>สร้างแผนที่ใหม่ในคลัง</button></div>`
    + `<p class="note">แผนที่นี้ไม่ถูกแก้ แผนที่ใหม่เป็นแผนที่เปล่าที่วาดตามส่วนที่ตัด ของที่คร่อมขอบถูกตัดที่ขอบ ถนนกับเส้นการค้าที่ปลายข้างหนึ่งอยู่นอกกรอบไม่ไปด้วย</p>`;
}
cropEl.addEventListener('click', async e => {
  const b = e.target.closest('[data-cr]'); if (!b) return;
  if (b.dataset.cr === 'close') { cropStop(); return; }
  if (b.dataset.cr === 'make') {
    const rc = cropRect(); if (!rc || !MME.store) return; b.disabled = true;
    try { const f = cropBuild(rc, $('crTitle').value.trim()); const m = await MME.store.importMap(f); flash('สร้าง "' + m.title + '" ในคลังแผนที่แล้ว กลับไปที่คลังเพื่อเปิด'); cropStop(); }
    catch (err) { b.disabled = false; flash('สร้างแผนที่ใหม่ไม่ได้: ' + (err && err.message || 'ไม่ทราบสาเหตุ')); }
  }
});
function cropStart() { if (MS.tool) msTool(null); CROP.on = true; CROP.a = CROP.b = null; cv.classList.add('measuring'); cropCard(); requestDraw(); }
function cropStop() { CROP.on = false; CROP.a = CROP.b = CROP.act = null; cv.classList.remove('measuring'); cropCard(); requestDraw(); }
box.addEventListener('pointerdown', e => {
  if (!CROP.on || e.button !== 0 || e.target !== cv || spaceDown) return; e.stopPropagation(); e.preventDefault();
  CROP.a = toMap(e.clientX, e.clientY); CROP.b = CROP.a.slice(); CROP.act = true; cropCard(); requestDraw();
}, true);
__on(window, 'pointermove', e => { if (!CROP.act) return; CROP.b = toMap(e.clientX, e.clientY); requestDraw(); });
__on(window, 'pointerup', () => { if (!CROP.act) return; CROP.act = null; cropCard(); });
__on(window, 'keydown', e => { if (e.key === 'Escape' && CROP.on) cropStop(); });
{
  const top = drawOnTop; drawOnTop = function (c, px) {
    if (top) top(c, px); if (!CROP.on) return; const rc = cropRect(); if (!rc) return;
    const a = idAt(rc.c0, rc.k0), b = idAt(rc.c1, rc.k1); if (a < 0 || b < 0) return;
    const x0 = CX[a] - R, y0 = CY[a] - DY / 2, x1 = CX[b] + R, y1 = CY[b] + DY;
    c.save(); c.fillStyle = 'rgba(10,10,14,.45)'; c.beginPath(); c.rect(0, 0, G.w, G.h); c.rect(x0, y0, x1 - x0, y1 - y0); c.fill('evenodd');
    c.strokeStyle = '#ffe9a8'; c.lineWidth = 2 * px; c.setLineDash([8 * px, 5 * px]); c.strokeRect(x0, y0, x1 - x0, y1 - y0); c.restore();
  };
}
{ const sm = setMode; setMode = function (m) { if (CROP.on) cropStop(); return sm(m); }; }
// the button, on the card of this map
function cropButton() {
  const sc = $('setcard'); if (!sc || $('setCrop')) return; const row = $('setWorld') ? $('setWorld').parentNode : sc.querySelector('.btns');
  const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.id = 'setCrop'; b.textContent = 'ตัดส่วนเป็นแผนที่ใหม่'; b.onclick = () => (CROP.on ? cropStop() : cropStart()); row.appendChild(b);
}
cropButton();
