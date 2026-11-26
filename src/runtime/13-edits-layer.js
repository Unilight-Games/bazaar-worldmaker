// ---------- the edits layer: repainted hexes and the user's rivers, at the resolution of the map image ----------
let LS = 1.5 / SHK; const LS0 = LS, layer = document.createElement('canvas');   // v0.21.0: coarser on the largest maps
layer.width = Math.round(G.w * LS); layer.height = Math.round(G.h * LS);
let LC = layer.getContext('2d');
// v0.21.0: where rebuild draws. The layer by default; the sharp detail of the view on the largest maps (29yc) borrows it.
let LOX = 0, LOY = 0, LW = layer.width, LH = layer.height;
let layerUsed = false, layerVer = 0;           // layerVer: counts the repaints, so a copy of the layer (the minimap) knows it is stale
let SDC = null;
function seaDepths() {
  const d = new Uint8Array(N).fill(6), q = [];
  for (let i = 0; i < N; i++) if (!isSea(eff(i))) { d[i] = 0; q.push(i); }
  for (let h = 0; h < q.length; h++) { const u = q[h]; if (d[u] >= 5) continue; for (let j = 0; j < 6; j++) { const v = NB[u * 6 + j]; if (v >= 0 && d[v] > d[u] + 1) { d[v] = d[u] + 1; q.push(v); } } }
  return d;
}
function seaDepth(i) {
  if (SDC) return SDC[i];                         // hexes to the nearest hex that is not sea, as the render shades the sea
  let ring = [i]; const seen = new Set(ring);
  for (let d = 1; d <= 5; d++) {
    const nxt = [];
    for (const u of ring) for (let j = 0; j < 6; j++) { const v = NB[u * 6 + j]; if (v < 0 || seen.has(v)) continue; if (!isSea(eff(v))) return d; seen.add(v); nxt.push(v); }
    ring = nxt;
  }
  return 6;
}
function fillOf(i, b) {
  if (b === 'S') { const d = seaDepth(i); return jit(d === 1 ? [70, 108, 128] : d === 2 ? [56, 88, 110] : d <= 4 ? [44, 70, 92] : [36, 58, 80], i, 4); }
  if (b === 'L') return jit([74, 118, 146], i, 4);
  if (b === 'i') return jit([78, 118, 136], i, 4);               // the archipelago's shoals, the palest sea
  return jit(RCOL[b], i, b === 'n' || b === 'd' ? 5 : 8);
}
const hits = (bb, x0, y0, x1, y1) => bb[2] > x0 && bb[0] < x1 && bb[3] > y0 && bb[1] < y1;
function rebuild(x0, y0, x1, y1) {
  // v0.19.5: the patch's edges lie on whole pixels of the layer. An edge through the middle of a pixel cleared it only in part
  // and painted it back only in part, so the pixel was left half see-through and the dark sea under a blank map showed as thin
  // straight lines along the edges of every patch the brush had repainted (the owner's report, 25 Nov 2026)
  x0 = Math.max(LOX, LOX + Math.floor((x0 - LOX) * LS) / LS); y0 = Math.max(LOY, LOY + Math.floor((y0 - LOY) * LS) / LS); x1 = Math.min(LOX + LW / LS, LOX + Math.ceil((x1 - LOX) * LS) / LS); y1 = Math.min(LOY + LH / LS, LOY + Math.ceil((y1 - LOY) * LS) / LS);
  if (x1 <= x0 || y1 <= y0) return;
  const c = LC;
  c.save(); c.setTransform(LS, 0, 0, LS, -LOX * LS, -LOY * LS);
  c.beginPath(); c.rect(x0, y0, x1 - x0, y1 - y0); c.clip(); c.clearRect(x0, y0, x1 - x0, y1 - y0);
  const m = 2.2 * R, list = [], land = [], water = [], sea = [];
  for (const i of painted) if (CX[i] > x0 - m && CX[i] < x1 + m && CY[i] > y0 - m && CY[i] < y1 + m) list.push(i);
  for (const i of list) { const b = eff(i); if (isW(b)) { water.push(i); if (isSea(b)) sea.push(i); } else land.push(i); }
  const inList = new Set(list);
  // a repainted hex reaches a touch past its edge to cover the old edge and shore; a hex only cleared of a river keeps the render's own overlap
  const grow = i => ED.cells[i] !== '.' ? 1.1 : 1.03;
  const clipTo = (ids, s) => { c.beginPath(); for (const i of ids) hexPath(c, i, s || grow(i)); c.clip(); };
  // the hidden stretches of the map's rivers: every sample's whole stroke, wherever it spilled, is scrubbed back to ground
  const hid = [];
  for (let gx = Math.floor((x0 - HWMAX - 1) / SC); gx <= Math.floor((x1 + HWMAX + 1) / SC); gx++) for (let gy = Math.floor((y0 - HWMAX - 1) / SC); gy <= Math.floor((y1 + HWMAX + 1) / SC); gy++) {
    const cell = BS.grid.get(gx * 4096 + gy); if (cell) for (const j of cell) if (sampleOff(j)) hid.push(j);
  }
  const discs = () => { for (const j of hid) { const r = BS.hw[j] + 0.35; c.moveTo(BS.x[j] + r, BS.y[j]); c.arc(BS.x[j], BS.y[j], r, 0, 2 * Math.PI); } };
  const inScrub = () => { c.beginPath(); discs(); c.clip(); };
  const scrub = new Set();                        // untouched hexes the scrubbed strokes reach into
  for (const j of hid) { const h = BS.hex[j]; for (let k = -1; k < 6; k++) { const v = k < 0 ? h : NB[h * 6 + k]; if (v >= 0 && !painted.has(v)) scrub.add(v); } }
  const scrubL = [...scrub];
  // ground colour
  for (const i of list) { c.beginPath(); hexPath(c, i, grow(i)); c.fillStyle = fillOf(i, eff(i)); c.fill(); }
  if (scrubL.length) { c.save(); inScrub(); for (const n of scrubL) { c.beginPath(); hexPath(c, n, 1.03); c.fillStyle = fillOf(n, eff(n)); c.fill(); } c.restore(); }
  // the coastal glow on sea and the phantom haze, once over everything laid down above
  const sSea = scrubL.filter(n => isSea(eff(n)));
  if (glowCv && sea.length) { c.save(); clipTo(sea); c.drawImage(glowCv, 0, 0, G.w, G.h); c.restore(); }
  if (glowCv && sSea.length) { c.save(); inScrub(); clipTo(sSea, 1.03); c.drawImage(glowCv, 0, 0, G.w, G.h); c.restore(); }
  if (hazeCv && list.length) { c.save(); clipTo(list); c.drawImage(hazeCv, 0, 0, G.w, G.h); c.restore(); }
  if (hazeCv && scrubL.length) { c.save(); inScrub(); clipTo(scrubL, 1.03); c.drawImage(hazeCv, 0, 0, G.w, G.h); c.restore(); }
  const trees = [];
  for (const i of land) ground(c, i, eff(i), trees);
  // the map's own rivers, only the stretches still shown, over repainted land and over the scrubbed strips
  if ((land.length || hid.length) && BRIV.length) {
    c.save(); c.beginPath(); for (const i of land) hexPath(c, i, grow(i)); discs(); c.clip();
    for (const r of BRIV) if (hits(r.bb, x0, y0, x1, y1)) for (const u of riverRuns(r)) strokeRiver(c, u.q, r.w, r.s, u.a, u.b);
    c.restore();
  }
  for (const r of userRiversSorted()) { const d = RDER.get(r.id); if (d && hits(d.bb, x0, y0, x1, y1)) strokeRiver(c, d.q, d.w, d.c ? 'c' : d.s); }
  // shores where water meets land: around repainted hexes in full, inside the scrubbed strips elsewhere
  const shore = (i, j, v) => {
    const wi = isW(eff(i)), wh = wi ? i : v, e = EDGE[wi ? j : [0, 1, 2, 3, 4, 5].find(q => NB[v * 6 + q] === i)], a = e, b = (e + 1) % 6, onSea = isSea(eff(wh));
    seg(c, CX[wh] + R * COS[a], CY[wh] + R * SIN[a], CX[wh] + R * COS[b], CY[wh] + R * SIN[b], onSea ? 'rgba(36,50,60,.9)' : 'rgba(44,72,92,.86)', onSea ? 4 / 3 : 1);
  };
  for (const i of list) for (let j = 0; j < 6; j++) {
    const v = NB[i * 6 + j]; if (v < 0 || isW(eff(i)) === isW(eff(v)) || (inList.has(v) && v < i)) continue;
    shore(i, j, v);
  }
  if (scrubL.length) {
    c.save(); inScrub();
    for (const n of scrubL) for (let j = 0; j < 6; j++) {
      const v = NB[n * 6 + j]; if (v < 0 || painted.has(v) || isW(eff(n)) === isW(eff(v)) || (scrub.has(v) && v < n)) continue;
      shore(n, j, v);
    }
    c.restore();
  }
  // the islets of repainted archipelago hexes, and of any the scrubbed strips crossed
  for (const i of water) if (eff(i) === 'i') islets(c, i);
  const sIsl = scrubL.filter(n => eff(n) === 'i');
  if (sIsl.length) { c.save(); inScrub(); for (const n of sIsl) islets(c, n); c.restore(); }
  trees.sort((a, b) => a[0] - b[0]);
  for (const t of trees) if (clearOfWater(t[1], t[2], t[3])) TREE[t[1]](c, t[2], t[3], t[4]);
  // mountains back to front: repainted ones whole, the map's own ones only inside the scrubbed strips they overlap
  const mts = land.filter(i => eff(i) === 'M').map(i => [i, false]);
  if (scrubL.length) {
    const near = new Set();
    for (const n of scrubL) for (let k = -1; k < 6; k++) { const v = k < 0 ? n : NB[n * 6 + k]; if (v >= 0 && !painted.has(v) && eff(v) === 'M') near.add(v); }
    for (const v of near) mts.push([v, true]);
  }
  mts.sort((a, b) => CY[a[0]] - CY[b[0]]);
  for (const [i, inside] of mts) { if (inside) { c.save(); inScrub(); } drawPeak(c, i); if (inside) c.restore(); }
  // Mount Stanther's great peak, last of the mountains: moved, it is drawn whole at its new hex; in its old place the render's
  // own peak stands, so it is only redrawn over whatever this pass laid down under it
  const st = stPeak();
  if (st >= 0 && Math.abs(CX[st] - (x0 + x1) / 2) < (x1 - x0) / 2 + 20 && Math.abs(CY[st] - (y0 + y1) / 2) < (y1 - y0) / 2 + 20) {
    if (ED.stan != null) drawStanther(c);
    else if ([...list, ...scrubL].some(i => Math.hypot(CX[i] - CX[st], CY[i] - CY[st]) < 34)) {
      c.save(); c.beginPath(); for (const i of list) hexPath(c, i, grow(i)); discs(); c.clip(); drawStanther(c); c.restore();
    }
  }
  for (const p of PTS) {
    if (p.h < 0 || isW(eff(p.h)) || ED.phid.has(p.id) || !bakedOk(p, ED.points.get(p.id))) continue;
    if (inList.has(p.h)) POINTFN[p.k](c, p.x, p.y);
    else if (scrub.has(p.h)) { c.save(); inScrub(); POINTFN[p.k](c, p.x, p.y); c.restore(); }
  }
  // the faint hex grid, once over each repainted hex, and over the edges the scrubbed strips crossed
  c.lineWidth = 1 / 3;
  const gridOf = (ids, col) => { c.strokeStyle = col; for (let a = 0; a < ids.length; a += 300) { c.beginPath(); for (let b = a; b < Math.min(ids.length, a + 300); b++) hexPath(c, ids[b], 1); c.stroke(); } };
  gridOf(land, 'rgba(40,34,26,.16)'); gridOf(water, 'rgba(170,196,208,.07)');
  if (scrubL.length) {
    c.save(); inScrub();
    const pl = new Path2D(), pw = new Path2D();
    for (const n of scrubL) for (let k = 0; k < 6; k++) {
      const v = NB[n * 6 + k]; if (v >= 0 && (painted.has(v) || (scrub.has(v) && v < n))) continue;
      const a = EDGE[k], b = (a + 1) % 6, P = isW(eff(n)) ? pw : pl;
      P.moveTo(CX[n] + R * COS[a], CY[n] + R * SIN[a]); P.lineTo(CX[n] + R * COS[b], CY[n] + R * SIN[b]);
    }
    c.strokeStyle = 'rgba(40,34,26,.16)'; c.stroke(pl); c.strokeStyle = 'rgba(170,196,208,.07)'; c.stroke(pw);
    c.restore();
  }
  c.restore();
  layerUsed = painted.size > 0 || ED.rivers.length > 0; layerVer++;
}
function rebuildAll() { SDC = seaDepths(); LC.setTransform(1, 0, 0, 1, 0, 0); LC.clearRect(0, 0, layer.width, layer.height); rebuild(0, 0, G.w, G.h); SDC = null; }
function rebuildHexes(ids, flip) {
  if (!ids.length) return;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const i of ids) { x0 = Math.min(x0, CX[i]); y0 = Math.min(y0, CY[i]); x1 = Math.max(x1, CX[i]); y1 = Math.max(y1, CY[i]); }
  const m = (flip ? 7 : 2.5) * R;              // a coast that moves reshades the sea around it
  rebuild(x0 - m, y0 - m, x1 + m, y1 + m);
}

