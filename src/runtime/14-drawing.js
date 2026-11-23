// ---------- drawing ----------
const cv = $('map'), box = $('mapbox'), ctx = cv.getContext('2d'), fx = $('fx'), fxc = fx.getContext('2d');
const img = new Image();
let view = { s: 1, x: 0, y: 0 }, fitS = 1, dpr = 1, hot = -1, showNames = true, cursor = null, showCityNames = true;
try { if (localStorage.getItem('gresland-city-names') === '0') showCityNames = false; } catch (err) { /* without storage the names start shown */ }
// the names of capitals and cities stay on the map; a town, a village or a fort shows its name while the pointer is on it (or it is chosen)
const NAMED_KINDS = new Set(['capital', 'city']);
let hoverCity = null, tapCity = null;   // the city under the mouse, and the one last tapped on a touch screen, which has no hover
// how big this viewer wants the names, city names and place names apart, as a share of the page's own sizes
const NSIZE = { min: 0.6, max: 2 };
let nameSize = { city: 1, place: 1 };
try { const v = JSON.parse(localStorage.getItem('gresland-name-size') || 'null'); if (v) for (const k of ['city', 'place']) if (v[k] >= NSIZE.min && v[k] <= NSIZE.max) nameSize[k] = v[k]; } catch (err) { /* without storage the names start at the page's sizes */ }
const scaled = (f, k) => k === 1 ? f : { min: f.min * k, max: f.max * k, base: f.base * k };
let FD = "'Noto Serif Thai', serif";
const freeBox = () => box.classList.contains('free'), padR = () => (freeBox() ? Math.min(+box.dataset.padr || 0, box.clientWidth * 0.5) : 0), padL = () => (freeBox() ? Math.min(+box.dataset.padl || 0, box.clientWidth * 0.5) : 0);   // up to half: in a lesson the strip left of the map holds her and the options side by side
const boxH = () => (freeBox() ? Math.max(120, box.clientHeight) : Math.round(box.clientWidth * G.h / G.w));
let boxSeen = '';
function sizeCanvas() {
  const w = box.clientWidth, h = boxH();
  dpr = window.devicePixelRatio || 1; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); cv.style.height = h + 'px';
  fx.width = cv.width; fx.height = cv.height; fx.style.height = h + 'px';
  fitS = freeBox() ? Math.max(0.02, Math.min((w - padR() - padL()) / G.w, h / G.h)) : w / G.w; boxSeen = w + 'x' + h + 'x' + padR() + 'x' + padL() + 'x' + dpr;
}
function fit() { sizeCanvas(); view = { s: fitS, x: 0, y: 0 }; clampView(); draw(); }
function refit() {                                  // the box changed: the same spot stays in the middle, at the same zoom
  const mid = () => padL() + (box.clientWidth - padR() - padL()) / 2, h0 = cv.clientHeight || boxH(), z = view.s / fitS, cx = (mid() - view.x) / view.s, cy = (h0 / 2 - view.y) / view.s;
  if (boxSeen === box.clientWidth + 'x' + boxH() + 'x' + padR() + 'x' + padL() + 'x' + (window.devicePixelRatio || 1)) return;
  sizeCanvas(); view.s = fitS * z; view.x = mid() - cx * view.s; view.y = boxH() / 2 - cy * view.s; clampView(); draw();
}
function label(c, px, t, x, y, size, color, ang, weight) {
  const fs = Math.max(size.min * px, Math.min(size.max * px, size.base));
  c.save(); c.translate(x, y); if (ang) c.rotate(ang);
  c.font = `${weight || 600} ${fs}px ${FD}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
  c.strokeStyle = 'rgba(20,18,14,.82)'; c.lineWidth = fs * 0.22; c.strokeText(t, 0, 0);
  c.fillStyle = color; c.fillText(t, 0, 0);
  const w = c.measureText(t).width; c.restore();
  return { w, fs };
}
const LBL = new Map();                           // where each city's name sits on screen now, in map units, so the name is a handle too
const isBuiltin = id => D.cities.some(c => c.id === id);
const ownCity = id => ED.cities.find(c => c.id === id) || null;
const cityIdx = id => ED.cities.findIndex(c => c.id === id);
function visibleCities() {
  const out = [];
  for (const b of D.cities) if (!ED.bhid.has(b.id) && !ownCity(b.id)) out.push({ id: b.id, name: b.name, kind: b.kind || 'city', note: b.note, x: b.x, y: b.y, own: false });
  for (const c of ED.cities) out.push({ ...c, own: true });
  if (act && act.k === 'cdrag' && act.pos) for (const c of out) if (c.id === act.id) { c.x = act.pos[0]; c.y = act.pos[1]; }
  if (act && act.k === 'sdrag' && act.target >= 0) { const [dx, dy] = stanShift(); for (const c of out) if (c.id === 'stanther') { c.x += dx; c.y += dy; } }
  return out;
}
const stanShift = () => [CX[act.target] - CX[stPeak()], CY[act.target] - CY[stPeak()]];   // while the great peak is carried, its city and name ride along
const LBX = new Map();                           // where each map label sits on screen now (centre, angle, width, height), so a label is a handle
// map labels: the page's own unless the user changed (ED.labels holds the whole changed label) or removed them (ED.lhid), then the user's own
const LSIZE = { small: { name: 'เล็ก', f: { min: 10, max: 15, base: 13 }, wt: 500 }, mid: { name: 'กลาง', f: { min: 11, max: 19, base: 17 }, wt: 700 }, big: { name: 'ใหญ่', f: { min: 13, max: 26, base: 24 }, wt: 700 } };
const LCOL = [['#f3ead2', 'แผ่นดิน'], ['#f2d48a', 'อาณาจักร'], ['#fff1d6', 'ทะเลทราย'], ['#d2e8f6', 'แม่น้ำ'], ['#e4f0f6', 'ทะเลสาบ'], ['#e9f2f6', 'หิมะ'], ['#e6f2dc', 'ป่า'], ['#e6d8ff', 'แดนผี']];
const LANG = a => Math.max(-90, Math.min(90, Math.round(a) || 0));
const baseLabel = id => D.labels.find(l => l.id === id) || null;
const labelOf = L => ({ id: L.id, text: L.text, x: L.x, y: L.y, size: LSIZE[L.size] ? L.size : 'mid', ang: L.ang || 0, color: L.color || '#f3ead2' });
function visibleLabels() {
  const out = [];
  for (const L of D.labels) { if (ED.lhid.has(L.id)) continue; const o = ED.labels.get(L.id); out.push(o ? { ...o, own: true } : { ...labelOf(L), own: false }); }
  for (const [id, o] of ED.labels) if (!baseLabel(id)) out.push({ ...o, own: true });
  for (const v of out) {
    if (act && act.k === 'ldrag' && act.id === v.id && act.pos) { v.x = act.pos[0]; v.y = act.pos[1]; }
    if (v.id === 'stanther' && act && act.k === 'sdrag' && act.target >= 0) { const [dx, dy] = stanShift(); v.x += dx; v.y += dy; }
  }
  return out;
}
const plainLabel = v => ({ id: v.id, text: v.text, x: v.x, y: v.y, size: v.size, ang: v.ang, color: v.color });
// what a press here picks up: a city, a map label, or Mount Stanther. The city on Stanther's summit only takes the press
// on its own marker or name; the rest of the peak picks up the mountain, at every zoom
function pickAt(mx, my) {
  const c = cityAt(mx, my), onSt = stanAt(mx, my);
  if (c) {
    const st = CK[c.kind] || CK.city, d = Math.hypot(c.x - mx, c.y - my), byName = d > 12 / view.s;
    if (byName || !onSt || d <= Math.max(st.r / view.s, st.min) + 2 / view.s) return { k: 'city', v: c };
  }
  const l = labelAt(mx, my); if (l) return { k: 'label', id: l };
  return onSt ? { k: 'stan' } : null;
}
function labelAt(mx, my) {                         // the label on top first
  for (const id of [...LBX.keys()].reverse()) {
    const b = LBX.get(id), dx = mx - b.x, dy = my - b.y, ca = Math.cos(b.ang), sa = Math.sin(b.ang);
    if (Math.abs(dx * ca + dy * sa) <= b.w / 2 + b.pad && Math.abs(-dx * sa + dy * ca) <= b.fs * 0.62) return id;
  }
  return null;
}
function marker(c, px, v, selected) {
  const st = CK[v.kind] || CK.city, r = Math.max(st.r * px, st.min), x = v.x, y = v.y;
  c.lineWidth = 1.3 * px; c.strokeStyle = '#2a2116'; c.fillStyle = '#f5e7b8';
  if (selected) { c.beginPath(); c.arc(x, y, r + 3.5 * px, 0, 2 * Math.PI); c.strokeStyle = '#cfa95e'; c.lineWidth = 2.2 * px; c.stroke(); c.strokeStyle = '#2a2116'; c.lineWidth = 1.3 * px; }
  if (v.kind === 'fort') {
    c.beginPath(); c.rect(x - r, y - r, 2 * r, 2 * r); c.fill(); c.stroke();
    c.beginPath(); c.rect(x - r * 0.42, y - r * 0.42, r * 0.84, r * 0.84); c.fillStyle = '#2a2116'; c.fill();
  } else {
    c.beginPath(); c.arc(x, y, r, 0, 2 * Math.PI); c.fill(); c.stroke();
    if (v.kind === 'capital') { c.beginPath(); c.arc(x, y, r * 0.58, 0, 2 * Math.PI); c.lineWidth = 1.1 * px; c.stroke(); c.beginPath(); c.arc(x, y, r * 0.24, 0, 2 * Math.PI); c.fillStyle = '#2a2116'; c.fill(); }
    else if (v.kind !== 'town' && v.kind !== 'village') { c.beginPath(); c.arc(x, y, r * 0.42, 0, 2 * Math.PI); c.fillStyle = '#2a2116'; c.fill(); }
  }
  if (v.name && (selected || (c === ctx && (v.id === hoverCity || v.id === tapCity)) || (showCityNames && NAMED_KINDS.has(v.kind)))) {
    const ly = y - r - Math.max(7 * px, 3.5), lb = label(c, px, v.name, x, ly, scaled(st.f, nameSize.city), '#fbf3dc', 0, st.wt);
    if (c === ctx) LBL.set(v.id, [x - lb.w / 2 - 3 * px, ly - lb.fs * 0.65, x + lb.w / 2 + 3 * px, ly + lb.fs * 0.65]);
  }
}
function drawNames(c, px, withLabels, withCities) {
  if (withLabels) for (const v of visibleLabels()) {
    const sz = LSIZE[v.size] || LSIZE.mid, ang = v.ang * Math.PI / 180, text = v.text || (mode === 'label' && c === ctx ? '…' : '');
    if (!text) continue;
    const lb = label(c, px, text, v.x, v.y, scaled(sz.f, nameSize.place), v.color, ang, sz.wt);
    if (c === ctx) {
      LBX.set(v.id, { x: v.x, y: v.y, ang, w: lb.w, fs: lb.fs, pad: 3 * px });
      if (mode === 'label' && (v.id === lsel || (act && act.k === 'ldrag' && act.id === v.id))) {   // the chosen label: a dashed frame around it
        c.save(); c.translate(v.x, v.y); c.rotate(ang); c.setLineDash([4 * px, 3 * px]); c.lineWidth = 1.4 * px; c.strokeStyle = '#cfa95e';
        c.strokeRect(-lb.w / 2 - 4 * px, -lb.fs * 0.68, lb.w + 8 * px, lb.fs * 1.36); c.restore();
      }
    }
  }
  if (!withCities) return;
  const held = act && act.k === 'cdrag' ? act.id : null;
  for (const v of visibleCities()) marker(c, px, v, (mode === 'city' && v.id === sel) || v.id === held);
}
const citiesShown = () => showNames || mode === 'city' || mode === 'route' || mode === 'trade' || mode === 'climate';
const labelsShown = () => showNames || mode === 'label';
let rq = 0;
function requestDraw() { if (!rq) rq = requestAnimationFrame(() => { rq = 0; draw(); }); }
function draw() {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#0f1114'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.setTransform(dpr * view.s, 0, 0, dpr * view.s, dpr * view.x, dpr * view.y);
  if (img.complete && img.naturalWidth) ctx.drawImage(img, 0, 0, G.w, G.h);
  if (layerUsed) ctx.drawImage(layer, 0, 0, G.w, G.h);
  const px = 1 / view.s, panning = act && act.k === 'pan';
  if (mode === 'climate') drawClimate(ctx, px);
  if ((mode === 'view' || mode === 'climate') && hot >= 0) { ctx.beginPath(); hexPath(ctx, hot, 1); ctx.lineWidth = 2.2 * px; ctx.strokeStyle = 'rgba(255,240,200,.95)'; ctx.stroke(); }
  if (mode === 'terrain' && cursor && !panning && !pinch) {
    const h = hexAt(cursor[0], cursor[1]);
    if (h >= 0) {
      ctx.beginPath(); for (const i of brush(h, bsize)) hexPath(ctx, i, 1);
      if (bcode !== 'restore') { ctx.fillStyle = chipColor(bcode); ctx.globalAlpha = 0.38; ctx.fill(); ctx.globalAlpha = 1; }
      ctx.lineWidth = 1.4 * px; ctx.strokeStyle = 'rgba(255,244,214,.95)'; ctx.stroke();
    }
  }
  if (mode === 'river' && rtool === 'erase' && cursor && !panning && !pinch) {
    // the eraser's reach, and in red what it would take if pressed here
    const rad = eraseReach();
    ctx.beginPath(); ctx.arc(cursor[0], cursor[1], rad, 0, 2 * Math.PI); ctx.lineWidth = 1.2 * px; ctx.strokeStyle = 'rgba(255,190,170,.95)'; ctx.stroke();
    if (!(act && act.k === 'erase')) {
      const { lines, users } = eraseHits(cursor[0], cursor[1], null);
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(232,72,52,.8)';
      for (const [k, hs] of lines) {
        const r = BRIV[k]; ctx.lineWidth = (r.s ? r.w : r.w + 1.2) + 0.8; ctx.beginPath();
        let open = false;
        for (let j = r.s0; j < r.s1; j++) {
          const on = hs.has(BS.hex[j]) && !sampleOff(j);
          if (on) { if (open) ctx.lineTo(BS.x[j], BS.y[j]); else ctx.moveTo(BS.x[j], BS.y[j]); }
          open = on;
        }
        ctx.stroke();
      }
      for (const id of users) { const d = RDER.get(id); if (!d) continue; ctx.lineWidth = d.w + 2; ctx.beginPath(); ctx.moveTo(d.q[0][0], d.q[0][1]); for (const p of d.q) ctx.lineTo(p[0], p[1]); ctx.stroke(); }
      ctx.restore();
    }
  }
  if (riv && riv.pts.length) {
    const pts = riv.pts.slice(); if (cursor && !(act && act.k === 'rdraw' && act.free)) pts.push(cursor);
    const k = RK[riv.kind]; ctx.globalAlpha = 0.9; strokeRiver(ctx, smoothLine(pts), k.w, k.s); ctx.globalAlpha = 1;
    for (const p of riv.pts) { ctx.beginPath(); ctx.arc(p[0], p[1], 2.6 * px, 0, 2 * Math.PI); ctx.fillStyle = '#fff4d6'; ctx.fill(); ctx.lineWidth = 1 * px; ctx.strokeStyle = '#2a2116'; ctx.stroke(); }
  }
  if (act && act.k === 'sdrag' && act.target >= 0) {        // the great peak being carried: a ghost on the hex it would land on
    const t = act.target, ok = !isW(eff(t));
    ctx.beginPath(); hexPath(ctx, t, 1); ctx.lineWidth = 2 * px; ctx.strokeStyle = ok ? 'rgba(207,169,94,.95)' : 'rgba(230,90,70,.95)'; ctx.stroke();
    if (ok) drawStanther(ctx, t, 0.85);
  }
  drawLoosePoints(ctx, px);
  if (mode === 'trade') ctx.globalAlpha = 0.45;
  drawRoutes(ctx, px, liveRoute()); ctx.globalAlpha = 1;
  drawTrade(ctx, px, true);
  drawHandles(ctx, px);
  drawFixes(ctx, px);
  if (mode === 'info' && isel && isel.t === 'hex') { ctx.beginPath(); hexPath(ctx, isel.h, 1); ctx.lineWidth = 2.2 * px; ctx.strokeStyle = 'rgba(255,214,120,.95)'; ctx.stroke(); }
  LBL.clear(); LBX.clear();
  drawNames(ctx, px, labelsShown(), citiesShown());
}

