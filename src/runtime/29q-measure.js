// ---------- the ruler and the journey planner (v0.19.0) ----------
// The owner asked for a ruler with the scale, and for a planner of journeys: a choice of conveyance, the time on the road in days,
// and a pin for the adventuring party with the ring of how far it gets. None of this is part of the map: it is kept in this
// browser only, per map, and nothing in it changes the map's data or the economy.
// How fast each conveyance goes on open level ground, in km a day, and how much each kind of ground slows the ones that go by land,
// are Claude's numbers; the speeds can be changed in the planner.
const kmUnit = () => (ENV.meta && +ENV.meta.kmPerHex || 34) / DY;     // km in one unit of the map
const fmtKm = km => km >= 100 ? Math.round(km).toLocaleString('th-TH') : km >= 10 ? km.toFixed(1) : km.toFixed(2);
const VEH = {
  foot: { name: 'เดินเท้า', kmd: 25, on: 'land' },
  horse: { name: 'ขี่ม้า', kmd: 45, on: 'land' },
  cart: { name: 'เกวียนหรือรถม้า', kmd: 22, on: 'land', road: 1.8 },
  camel: { name: 'คาราวานอูฐ', kmd: 30, on: 'land', desert: 1 },
  rail: { name: 'รถไฟ', kmd: 450, on: 'rail' },
  boat: { name: 'เรือแม่น้ำ', kmd: 60, on: 'river' },
  ship: { name: 'เรือเดินทะเล', kmd: 160, on: 'sea' },
};
const TERR = { g: 1, s: 1, v: 1, c: 0.9, h: 1, d: 0.65, t: 0.75, n: 0.4, f: 0.75, o: 0.8, k: 0.6, j: 0.5, a: 0.5, e: 0.9, w: 0.45, m: 0.55, p: 0.85, r: 1, y: 0.9, u: 0.65, M: 0.3 };
const MS = { tool: null, ruler: [], trip: null, act: null, cache: null };
const tripKey = () => 'mme-trip-' + ((ENV.meta && (ENV.meta.id || ENV.meta.title)) || 'map');
function tripLoad() {
  let o = null; try { o = JSON.parse(localStorage.getItem(tripKey()) || 'null'); } catch (err) { /* a fresh plan */ }
  const sp = {}; for (const k of Object.keys(VEH)) sp[k] = o && o.sp && +o.sp[k] > 0 ? Math.min(5000, +o.sp[k]) : VEH[k].kmd;
  MS.trip = { pin: o && Number.isInteger(o.pin) && o.pin >= 0 && o.pin < N ? o.pin : -1, veh: o && VEH[o.veh] ? o.veh : 'foot', days: o && +o.days > 0 ? Math.min(365, +o.days) : 1, sp, way: o && Array.isArray(o.way) ? o.way.filter(i => Number.isInteger(i) && i >= 0 && i < N).slice(0, 30) : [], ring: o ? o.ring !== false : true };
}
const tripSave = () => { try { localStorage.setItem(tripKey(), JSON.stringify(MS.trip)); } catch (err) { /* this visit */ } };
tripLoad();

// ---- the roads, the rails and the waters a conveyance can use, and the time of one hex for it ----
function tripNet() {
  const key = routeStamp() + '|' + MS.trip.veh + '|' + MS.trip.sp[MS.trip.veh] + '|' + painted.size;
  if (MS.cache && MS.cache.key === key) return MS.cache;
  const road = new Uint8Array(N);                     // 1 road, 2 railway
  for (const r of visibleRoutes()) { const g = geoOf(r); if (!g || g.fail) continue; const v = r.cls === 'rail' ? 2 : 1; for (const q of g.q) { const h = hexAt(q[0], q[1]); if (h >= 0 && road[h] < v) road[h] = v; } }
  const V = VEH[MS.trip.veh], hexKm = (ENV.meta && +ENV.meta.kmPerHex || 34), kmd = MS.trip.sp[MS.trip.veh], step = new Float32Array(N).fill(Infinity);
  for (let i = 0; i < N; i++) {
    const b = eff(i), w = isW(b); let f = 0;
    if (V.on === 'land') { if (!w || road[i]) f = (TERR[b] || 0.8) * (road[i] ? (V.road || 1.5) : 1); if (V.desert && (b === 'd' || b === 'y' || b === 'c')) f = Math.max(f, 0.95); }
    else if (V.on === 'rail') f = road[i] === 2 ? 1 : 0;
    else if (V.on === 'river') f = b === 'L' || (typeof NAVR !== 'undefined' && NAVR[i] > 0) || RV[i] === '1' ? 1 : 0;
    else if (V.on === 'sea') f = isW(b) ? 1 : 0;
    if (f > 0) step[i] = hexKm / (kmd * f);           // days for one hex
  }
  MS.cache = { key, step, road }; return MS.cache;
}
const routeStamp = () => { let s = 0; for (const r of visibleRoutes()) s = (Math.imul(s, 31) + r.id.length + (r.via ? r.via.length : 0) + (r.cls === 'rail' ? 7 : 1)) | 0; return s; };
// the time from one hex to every other, the cheapest way (half a step leaving, half arriving)
function tripReach(from, stopAt) {
  const { step } = tripNet(), T = new Float64Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1); if (from < 0 || !isFinite(step[from])) return { T, prev };
  const H = [[0, from]]; T[from] = 0;
  const push = x => { H.push(x); let k = H.length - 1; while (k) { const p = (k - 1) >> 1; if (H[p][0] <= H[k][0]) break; [H[p], H[k]] = [H[k], H[p]]; k = p; } };
  const pop = () => { const top = H[0], last = H.pop(); if (H.length) { H[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < H.length && H[l][0] < H[m][0]) m = l; if (r < H.length && H[r][0] < H[m][0]) m = r; if (m === k) break; [H[m], H[k]] = [H[k], H[m]]; k = m; } } return top; };
  while (H.length) {
    const [t, i] = pop(); if (t > T[i]) continue; if (i === stopAt) break;
    for (let j = 0; j < 6; j++) { const v = NB[i * 6 + j]; if (v < 0 || !isFinite(step[v])) continue; const nt = t + (step[i] + step[v]) / 2; if (nt < T[v]) { T[v] = nt; prev[v] = i; push([nt, v]); } }
  }
  return { T, prev };
}
function tripLegs() {                                  // from the pin through each mark in turn: the hexes and the days of each leg
  const tr = MS.trip, legs = []; let at = tr.pin; if (at < 0) return legs;
  for (const to of tr.way) { const { T, prev } = tripReach(at, to), path = []; if (isFinite(T[to])) for (let v = to; v >= 0; v = prev[v]) path.unshift(v); legs.push({ from: at, to, days: T[to], path }); at = to; }
  return legs;
}
let tripRing = null;
function tripRingHexes() {
  const tr = MS.trip, key = (MS.cache ? MS.cache.key : '') + '|' + tr.pin + '|' + tr.days; if (tripRing && tripRing.key === key) return tripRing;
  const { T } = tripReach(tr.pin, -1), on = new Uint8Array(N); for (let i = 0; i < N; i++) if (T[i] <= tr.days) on[i] = 1;
  tripRing = { key, on }; return tripRing;
}

// ---- drawing ----
{
  const top = drawOnTop; drawOnTop = function (c, px) {
    if (top) top(c, px);
    const kmU = kmUnit();
    if (MS.ruler.length) {
      const P = MS.ruler.slice(); if (MS.tool === 'ruler' && MS.hover) P.push(MS.hover);
      c.save(); c.lineWidth = 2.2 * px; c.strokeStyle = '#ffe9a8'; c.setLineDash([7 * px, 4 * px]); c.beginPath(); P.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke(); c.setLineDash([]);
      let sum = 0; P.forEach((p, i) => { if (i) sum += Math.hypot(p[0] - P[i - 1][0], p[1] - P[i - 1][1]); c.beginPath(); c.arc(p[0], p[1], 3 * px, 0, 2 * Math.PI); c.fillStyle = '#ffe9a8'; c.fill(); c.strokeStyle = '#2a2116'; c.lineWidth = 1 * px; c.stroke(); if (i) msTag(c, px, p[0] + 6 * px, p[1] - 8 * px, fmtKm(sum * kmU) + ' กม.'); });
      c.restore();
    }
    const tr = MS.trip; if (!tripOn() || tr.pin < 0) return;
    c.save();
    if (tr.ring) {
      const { on } = tripRingHexes(); c.beginPath(); for (let i = 0; i < N; i++) if (on[i]) hexPath(c, i, 1.01); c.fillStyle = 'rgba(120,200,255,.14)'; c.fill();
      c.beginPath(); for (let i = 0; i < N; i++) { if (!on[i]) continue; for (let a = 0; a < 6; a++) { const v = NB[i * 6 + a]; if (v >= 0 && on[v]) continue; const e = EDGE[a], t0 = e * Math.PI / 3, t1 = (e + 1) * Math.PI / 3; c.moveTo(CX[i] + R * Math.cos(t0), CY[i] + R * Math.sin(t0)); c.lineTo(CX[i] + R * Math.cos(t1), CY[i] + R * Math.sin(t1)); } }
      c.strokeStyle = 'rgba(140,210,255,.95)'; c.lineWidth = 1.6 * px; c.stroke();
      const rad = tr.days * tr.sp[tr.veh] / kmU; c.beginPath(); c.arc(CX[tr.pin], CY[tr.pin], rad, 0, 2 * Math.PI); c.setLineDash([5 * px, 5 * px]); c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1.2 * px; c.stroke(); c.setLineDash([]);
    }
    const legs = tripLegs(); let sum = 0;
    for (const L of legs) {
      if (!L.path.length) continue; c.beginPath(); L.path.forEach((h, i) => i ? c.lineTo(CX[h], CY[h]) : c.moveTo(CX[h], CY[h])); c.strokeStyle = '#ffcf6a'; c.lineWidth = 2.6 * px; c.lineJoin = 'round'; c.stroke();
      sum += L.days; c.beginPath(); c.arc(CX[L.to], CY[L.to], 4 * px, 0, 2 * Math.PI); c.fillStyle = '#ffcf6a'; c.fill(); c.strokeStyle = '#2a2116'; c.lineWidth = 1 * px; c.stroke();
      msTag(c, px, CX[L.to] + 7 * px, CY[L.to] - 8 * px, isFinite(L.days) ? tripDays(sum) : 'ไปไม่ถึง');
    }
    // the party: a banner on a pole
    const x = CX[tr.pin], y = CY[tr.pin], s = px;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 22 * s); c.strokeStyle = '#2a2116'; c.lineWidth = 2 * s; c.stroke();
    c.beginPath(); c.moveTo(x, y - 22 * s); c.lineTo(x + 13 * s, y - 18 * s); c.lineTo(x, y - 13 * s); c.closePath(); c.fillStyle = '#d0453a'; c.fill(); c.strokeStyle = '#2a2116'; c.lineWidth = 1 * s; c.stroke();
    c.beginPath(); c.arc(x, y, 3.2 * s, 0, 2 * Math.PI); c.fillStyle = '#fff4d6'; c.fill(); c.stroke();
    c.restore();
  };
}
function msTag(c, px, x, y, t) { c.font = `600 ${11 * px}px sans-serif`; c.textAlign = 'left'; c.textBaseline = 'middle'; const w = c.measureText(t).width; c.fillStyle = 'rgba(21,23,28,.85)'; c.fillRect(x - 3 * px, y - 8 * px, w + 6 * px, 16 * px); c.fillStyle = '#ffe9a8'; c.fillText(t, x, y); }
const tripDays = d => d < 1 ? Math.max(1, Math.round(d * 24)) + ' ชม.' : (Math.round(d * 10) / 10).toLocaleString('th-TH') + ' วัน';

// ---- the buttons on the map, and the planner's window ----
const tripOn = () => MS.tool === 'trip' || MS.tool === 'pin' || MS.tool === 'way' || MS.keep;
{
  const ctl = document.querySelector('#mapbox .ctl');
  const mk = (id, t, title) => { const b = document.createElement('button'); b.type = 'button'; b.id = id; b.textContent = t; b.title = title; b.setAttribute('aria-pressed', 'false'); ctl.appendChild(b); return b; };
  mk('rulerBtn', 'วัดระยะ', 'คลิกบนแผนที่ทีละจุดเพื่อวัดระยะทาง กด Esc เพื่อล้าง').onclick = () => msTool(MS.tool === 'ruler' ? null : 'ruler');
  mk('tripBtn', 'วางแผนเดินทาง', 'วางหมุดคณะผจญภัย เลือกพาหนะ ดูวงระยะเดินทางและเวลาเป็นวัน').onclick = () => msTool(MS.tool && MS.tool !== 'ruler' ? null : 'trip');
}
const tripEl = document.createElement('div'); tripEl.className = 'tripbox'; tripEl.hidden = true; $('mapbox').appendChild(tripEl);
for (const ev of ['pointerdown', 'wheel', 'click', 'keydown']) tripEl.addEventListener(ev, e => e.stopPropagation());
function msTool(t) {
  MS.tool = t; MS.hover = null;
  $('rulerBtn').setAttribute('aria-pressed', String(t === 'ruler')); $('tripBtn').setAttribute('aria-pressed', String(!!t && t !== 'ruler'));
  if (t === 'ruler' && !MS.ruler.length) flash('คลิกบนแผนที่ทีละจุดเพื่อวัดระยะ กด Esc เพื่อล้าง');
  if (t !== 'ruler') MS.ruler = t ? MS.ruler : MS.ruler;
  tripCard(); cv.classList.toggle('measuring', !!t); requestDraw();
}
function tripCard() {
  const tr = MS.trip; tripEl.hidden = !(MS.tool && MS.tool !== 'ruler'); if (tripEl.hidden) return;
  tripEl.style.right = (padR() + 56) + 'px';
  const legs = tripLegs(), total = legs.reduce((a, L) => a + L.days, 0), kmU = kmUnit();
  const km = legs.reduce((a, L) => { let s = 0; for (let i = 1; i < L.path.length; i++) s += Math.hypot(CX[L.path[i]] - CX[L.path[i - 1]], CY[L.path[i]] - CY[L.path[i - 1]]); return a + s; }, 0) * kmU;
  tripEl.innerHTML = `<div class="mmhead"><h3>วางแผนเดินทาง</h3><button type="button" class="btn" data-tp="close">ปิด</button></div>`
    + `<div class="erow"><label>พาหนะ <select data-tp="veh">${Object.entries(VEH).map(([k, v]) => `<option value="${k}"${k === tr.veh ? ' selected' : ''}>${v.name}</option>`).join('')}</select></label><label><input type="number" data-tp="kmd" min="1" max="5000" step="1" value="${tr.sp[tr.veh]}" style="width:5em"> กม. ต่อวัน</label></div>`
    + `<div class="btns"><button type="button" class="btn${MS.tool === 'pin' ? ' on' : ''}" data-tp="pin">${tr.pin < 0 ? 'วางหมุดคณะ' : 'ย้ายหมุดคณะ'}</button><button type="button" class="btn${MS.tool === 'way' ? ' on' : ''}" data-tp="way"${tr.pin < 0 ? ' disabled' : ''}>เพิ่มจุดหมาย</button><button type="button" class="btn" data-tp="undo"${tr.way.length ? '' : ' disabled'}>เอาจุดหมายสุดท้ายออก</button><button type="button" class="btn warn" data-tp="clear"${tr.way.length ? '' : ' disabled'}>ล้างเส้นทาง</button></div>`
    + `<div class="erow"><label><input type="checkbox" data-tp="ring"${tr.ring ? ' checked' : ''}> วงระยะเดินทาง</label><label>ใน <input type="number" data-tp="days" min="0.1" max="365" step="0.5" value="${tr.days}" style="width:4.5em"> วัน</label></div>`
    + (tr.pin < 0 ? '<p class="hint">กดวางหมุดคณะ แล้วคลิกบนแผนที่</p>'
      : `<p class="hint">พื้นสีฟ้าคือที่ที่ไปถึงได้ในเวลาที่ตั้ง คิดตามภูมิประเทศ ถนน และทางน้ำ วงเส้นประคือระยะเส้นตรง${legs.length ? '' : ' กดเพิ่มจุดหมายแล้วคลิกบนแผนที่เพื่อวางเส้นทาง'}</p>`)
    + (legs.length ? `<div class="tr">รวม <b>${isFinite(total) ? tripDays(total) : 'ไปไม่ถึงบางช่วง'}</b> <span class="w">ราว ${fmtKm(km)} กม. ตามทาง · ${legs.length} ช่วง</span></div>` + legs.map((L, i) => `<div class="tr w">ช่วง ${i + 1}: ${isFinite(L.days) ? tripDays(L.days) : 'พาหนะนี้ไปไม่ถึง'}</div>`).join('') : '')
    + `<p class="note">แผนนี้เก็บไว้ในเบราว์เซอร์นี้เท่านั้น ไม่เปลี่ยนข้อมูลของแผนที่</p>`;
}
tripEl.addEventListener('click', e => {
  const b = e.target.closest('[data-tp]'); if (!b || b.tagName === 'SELECT' || b.tagName === 'INPUT') return; const a = b.dataset.tp, tr = MS.trip;
  if (a === 'close') { msTool(null); return; }
  if (a === 'pin') MS.tool = MS.tool === 'pin' ? 'trip' : 'pin';
  else if (a === 'way') MS.tool = MS.tool === 'way' ? 'trip' : 'way';
  else if (a === 'undo') tr.way.pop();
  else if (a === 'clear') tr.way = [];
  tripSave(); tripCard(); requestDraw();
});
tripEl.addEventListener('change', e => {
  const el = e.target, a = el.dataset.tp, tr = MS.trip; if (!a) return;
  if (a === 'veh' && VEH[el.value]) tr.veh = el.value;
  else if (a === 'kmd') tr.sp[tr.veh] = clamp(+el.value || VEH[tr.veh].kmd, 1, 5000);
  else if (a === 'days') tr.days = clamp(+el.value || 1, 0.1, 365);
  else if (a === 'ring') tr.ring = el.checked;
  tripSave(); tripCard(); requestDraw();
});

// ---- the pointer while measuring or planning: a click places, a drag still moves the map ----
box.addEventListener('pointerdown', e => {
  if (!MS.tool || e.button !== 0 || e.target !== cv || spaceDown) return;
  e.stopPropagation(); e.preventDefault();
  const [mx, my] = toMap(e.clientX, e.clientY), tr = MS.trip;
  const onPin = tr.pin >= 0 && Math.hypot(CX[tr.pin] - mx, CY[tr.pin] - my) * view.s < 12 && MS.tool !== 'ruler';
  MS.act = { sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y, moved: false, pin: onPin };
}, true);
__on(window, 'pointermove', e => {
  if (MS.tool === 'ruler' && !MS.act && e.target === cv) { MS.hover = toMap(e.clientX, e.clientY); requestDraw(); }
  const a = MS.act; if (!a) return;
  if (!a.moved && Math.hypot(e.clientX - a.sx, e.clientY - a.sy) > 4) a.moved = true;
  if (!a.moved) return;
  if (a.pin) { const [mx, my] = toMap(e.clientX, e.clientY), h = hexAt(mx, my); if (h >= 0 && h !== MS.trip.pin) { MS.trip.pin = h; requestDraw(); } return; }
  view.x = a.vx + e.clientX - a.sx; view.y = a.vy + e.clientY - a.sy; clampView(); requestDraw();
});
__on(window, 'pointerup', e => {
  const a = MS.act; if (!a) return; MS.act = null;
  if (a.pin) { if (a.moved) { tripSave(); tripCard(); } return; }
  if (a.moved) return;
  const [mx, my] = toMap(e.clientX, e.clientY), h = hexAt(mx, my), tr = MS.trip;
  if (MS.tool === 'ruler') { MS.ruler.push([mx, my]); requestDraw(); return; }
  if (h < 0) return;
  if (MS.tool === 'pin') { tr.pin = h; MS.tool = 'trip'; }
  else if (MS.tool === 'way') { if (tr.way.length < 30) tr.way.push(h); }
  tripSave(); tripCard(); requestDraw();
});
__on(window, 'keydown', e => {
  if (e.key !== 'Escape' || !MS.tool) return; const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
  if (MS.tool === 'ruler') { if (MS.ruler.length) MS.ruler = []; else msTool(null); requestDraw(); }
  else if (MS.tool === 'pin' || MS.tool === 'way') { MS.tool = 'trip'; tripCard(); }
  else msTool(null);
});
{ const sm = setMode; setMode = function (m) { if (MS.tool) { MS.tool = null; msTool(null); } return sm(m); }; }
