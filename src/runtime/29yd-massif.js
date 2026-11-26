// ---------- mountains seen from afar (v0.21.0) ----------
// The owner's report (26 Nov 2026): zoomed out, a range drawn as one small peak a hex looked like the skin of a durian. Seen from
// afar a range is drawn instead as a few large peaks. The mountain hexes are laid over in their own ground colour (the rivers that
// cross them drawn again on top), and over that stand peaks a few hexes apart, each as large as the share of the ground about it
// that is mountain: a broad range gets big peaks shouldered by smaller ones, a lone hill a small one. Close in the single peaks of
// the layer come back; the two fade into each other while a hex measures between MSF_ON and MSF_OFF pixels across on screen.
// How far apart the large peaks stand follows the zoom, so they keep about MSF_GAP pixels apart on screen.
const MSF = { ver: -1, list: null, B: new Map(), cv: null, cvKey: '', cell: null, cw: 0, gx: 0 };
const MSF_ON = 5.5, MSF_OFF = 9, MSF_GAP = 40, MSF_STEPS = [2, 3, 4, 6, 9, 13, 19, 28, 40], MSF_VEC = 2.5;   // numbers chosen by eye
function msfAlpha() { const r = R * view.s; return r <= MSF_ON ? 1 : r >= MSF_OFF ? 0 : (MSF_OFF - r) / (MSF_OFF - MSF_ON); }
function msfStep() { const want = MSF_GAP / (DX * view.s); return MSF_STEPS.find(k => k >= want) || MSF_STEPS[MSF_STEPS.length - 1]; }
// the mountain hexes of the ground as it stands, and a coarse grid of them for finding those in view
function msfList() {
  if (MSF.ver === layerVer && MSF.list) return MSF.list;
  const L = []; for (let i = 0; i < N; i++) if (eff(i) === 'M') L.push(i);
  const cw = 16 * DX, gx = Math.ceil(G.w / cw) + 1, gy = Math.ceil(G.h / cw) + 1, cell = new Map();
  for (const i of L) { const k = Math.floor(CY[i] / cw) * gx + Math.floor(CX[i] / cw); let a = cell.get(k); if (!a) cell.set(k, a = []); a.push(i); }
  // how deep in the mountain ground each hex lies, in hexes from its edge
  const din = new Uint16Array(N), q = []; for (const i of L) { let edge = false; for (let k = 0; k < 6; k++) { const v = NB[i * 6 + k]; if (v < 0 || eff(v) !== 'M') { edge = true; break; } } if (edge) { din[i] = 1; q.push(i); } }
  for (let hd = 0; hd < q.length; hd++) { const u = q[hd]; for (let k = 0; k < 6; k++) { const v = NB[u * 6 + k]; if (v >= 0 && !din[v] && eff(v) === 'M') { din[v] = din[u] + 1; q.push(v); } } }
  Object.assign(MSF, { list: L, ver: layerVer, cell, cw, gx, din, nl: (MSF.nl || 0) + 1 }); MSF.B.clear(); return L;
}
// how snowy a peak is: on a map of the lore by the old reckoning of the render, elsewhere by its warmest season's warmth
function msfSnow(i) { return BLANK ? peakSnowClim(i) : !(ZO[i] === 'K') && (CX[i] < 220 || ZO[i] === 'H' || (CY[i] < 380 && CX[i] < 1040)); }
// the large peaks for one spacing
function msfBand(k) {
  let P = MSF.B.get(k); if (P) return P;
  const L = msfList(), gap = k * DX, cw = gap, gx = Math.ceil(G.w / cw) + 1, gy = Math.ceil(G.h / cw) + 1, cnt = new Float32Array(gx * gy), head = new Int32Array(gx * gy).fill(-1), next = new Int32Array(L.length);
  const cellOf = (x, y) => Math.floor(y / cw) * gx + Math.floor(x / cw);
  for (let a = 0; a < L.length; a++) { const c = cellOf(CX[L[a]], CY[L[a]]); cnt[c]++; next[a] = head[c]; head[c] = a; }
  const per = cw * cw / (DX * DY);
  const den = (x, y) => { const fx = x / cw - 0.5, fy = y / cw - 0.5, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0; let s = 0;
    for (let q = 0; q < 4; q++) { const X = x0 + (q & 1), Y = y0 + (q >> 1), w = ((q & 1) ? tx : 1 - tx) * ((q >> 1) ? ty : 1 - ty); if (X >= 0 && Y >= 0 && X < gx && Y < gy) s += w * cnt[Y * gx + X]; } return Math.min(1, s / per); };
  // A range, as the owner asked (26 Nov 2026): the peaks follow the spine first, then the flanks, each lined up along the way the
  // range runs (the long axis of the mountain ground about it) so they stand close and overlap along it and wider apart across it.
  // Where the ground is a broad block with no long axis, a slow-turning field of directions gives it ridges of its own. A peak on the
  // spine, far from the range's edge, stands larger and taller than one on its rim.
  const DIN = MSF.din, core = i => Math.min(1, Math.max(0, (DIN[i] - 0.5) * DY / (0.7 * gap)));
  const score = new Float32Array(L.length); for (let a = 0; a < L.length; a++) { const i = L[a]; score[a] = core(i) + 0.3 * den(CX[i], CY[i]) + 0.1 * vnoise(CX[i], CY[i], 5, 3); }
  const ord = Array.from(L.keys()).sort((a, b) => score[b] - score[a]), took = new Map(), rr = 0.8 * gap, rr2 = rr * rr, want = Math.PI * rr2 / (DX * DY);
  const ALONG = 0.45, ACROSS = 1.25;
  P = [];
  for (const a of ord) {
    const i = L[a]; if (isStan(i)) continue;
    const cx = Math.floor(CX[i] / cw), cy = Math.floor(CY[i] / cw); let near = false;
    for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2 && !near; dx++) { const t = took.get((cy + dy) * gx + cx + dx); if (t) for (const p of t) {
      const ex = CX[i] - p[0], ey = CY[i] - p[1], al = ex * p[2] + ey * p[3], ac = -ex * p[3] + ey * p[2], g = p[4];
      if ((al / (ALONG * g)) ** 2 + (ac / (ACROSS * g)) ** 2 < 1) { near = true; break; } } }
    if (near) continue;
    let n = 0, sx = 0, sy = 0, sxx = 0, sxy = 0, syy = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = cx + dx, Y = cy + dy; if (X < 0 || Y < 0 || X >= gx || Y >= gy) continue; for (let b = head[Y * gx + X]; b >= 0; b = next[b]) { const j = L[b], ex = CX[j] - CX[i], ey = CY[j] - CY[i]; if (ex * ex + ey * ey <= rr2) { n++; sx += ex; sy += ey; sxx += ex * ex; sxy += ex * ey; syy += ey * ey; } } }
    let ox = n ? sx / n : 0, oy = n ? sy / n : 0; const ol = Math.hypot(ox, oy), lim = 0.3 * gap; if (ol > lim) { ox *= lim / ol; oy *= lim / ol; }
    // the way the range runs here: the long axis of the mountain ground about the peak, or the field where it has none
    const mx = n ? sx / n : 0, my = n ? sy / n : 0, cxx = n ? sxx / n - mx * mx : 0, cxy = n ? sxy / n - mx * my : 0, cyy = n ? syy / n - my * my : 0;
    const tr = cxx + cyy, df = Math.sqrt((cxx - cyy) ** 2 + 4 * cxy * cxy), an = tr > 0 ? df / tr : 0;
    let th = 0.5 * Math.atan2(2 * cxy, cxx - cyy); if (an < 0.3) th = Math.PI * vnoise(CX[i], CY[i], 6 * gap, 13) * 2;
    const ux = Math.cos(th), uy = Math.sin(th), cr = core(i), nz = vnoise(CX[i] * 3.1, CY[i] * 3.1, 7, 4), d = Math.min(1, Math.sqrt(n / want));
    const w = Math.max(6.3, gap * (0.34 + 0.5 * cr) * (0.85 + 0.3 * nz) * (0.7 + 0.3 * d)), h = w * (0.85 + 0.4 * cr) * (0.95 + 0.15 * nz);
    const x = CX[i] + ox, y = CY[i] + oy;
    P.push([x, y, w, h, msfSnow(i) && n >= 3, i, cr]);
    const key = cy * gx + cx; let t = took.get(key); if (!t) took.set(key, t = []); t.push([CX[i], CY[i], ux, uy, gap * (0.9 + 0.4 * cr)]);
  }
  P.sort((a, b) => a[1] - b[1]);
  MSF.B.set(k, P); MSF.nb = (MSF.nb || 0) + 1; return P;
}
// one large peak: a main summit, and on a broad one two lower shoulders behind it
function msfPeak(c, p) {
  const [x, y, w, h, snow, i] = p, j = (vnoise(x, y, 11, 2) - 0.5) * 0.3 * w;
  const one = (px, py, ww, hh, sn) => { const sz = ww / 7; c.save(); c.translate(px, py); c.scale(1, hh / (9.6 * sz) / (ww / (7 * sz))); peak(c, 0, 0, sz, sn); c.restore(); };
  if (w > 16) { const sd = j > 0 ? 1 : -1; one(x + sd * 0.55 * w, y - 0.1 * h, 0.55 * w, 0.58 * h, snow); }
  one(x + j * 0.2, y, w, h, snow);
}
// the cover's shade by how deep in the range a hex lies: the rim darker, the heart lighter, so the range reads as raised ground
const MSF_SH = [-14, -6, 2, 8];
function msfCoverPaths(ids) {
  const P = MSF_SH.map(() => new Path2D()), all = new Path2D(), D = MSF.din;
  for (const i of ids) { const k = Math.min(3, Math.max(0, D[i] - 1 + (((i * 2654435761) >>> 0) % 2))); hexPath(P[k], i, 1.05); hexPath(all, i, 1.05); }
  return { P, all };
}
function msfCoverFill(c, cov) { const b = RCOL.M; cov.P.forEach((p, k) => { const s = MSF_SH[k]; c.fillStyle = `rgb(${b[0] + s},${b[1] + s},${b[2] + s})`; c.fill(p); }); }
// the rivers that cross the covered ground, drawn again inside it
// (only the rivers that touch mountain ground, found once each time the ground changes)
function msfRivTouch() {
  if (MSF.rv && MSF.rvVer === MSF.ver) return MSF.rv;
  const touch = q => { for (const [x, y] of q) { const h = hexAt(x, y); if (h < 0) continue; if (eff(h) === 'M') return true; for (let k = 0; k < 6; k++) { const v = NB[h * 6 + k]; if (v >= 0 && eff(v) === 'M') return true; } } return false; };
  const base = BRIV.filter(r => touch(r.q)), user = new Set(); for (const r of ED.rivers) { const d = RDER.get(r.id); if (d && touch(d.q)) user.add(r.id); }
  MSF.rv = { base, user }; MSF.rvVer = MSF.ver; return MSF.rv;
}
function msfRivers(c, cov, x0, y0, x1, y1) {
  const T = msfRivTouch(); if (!T.base.length && !T.user.size) return;
  c.save(); c.clip(cov.all);
  for (const r of T.base) if (hits(r.bb, x0, y0, x1, y1)) for (const u of riverRuns(r)) strokeRiver(c, u.q, r.w, r.s, u.a, u.b);
  if (T.user.size) for (const r of userRiversSorted()) { if (!T.user.has(r.id)) continue; const d = RDER.get(r.id); if (d && hits(d.bb, x0, y0, x1, y1)) strokeRiver(c, d.q, d.w, d.c ? 'c' : d.s); }
  c.restore();
}
// the hexes the cover leaves alone: terraced fields while the cities' land is shown
const msfKeep = landShown => i => !(landShown && LAND && LAND.use && LAND.use[i] === 6);
// the cover of a whole map at once, for views too far out to draw it hex by hex each frame
function msfSheet(keep, tag) {
  const key = MSF.ver + '|' + tag; if (MSF.cv && MSF.cvKey === key) return MSF.cv;
  const cs = Math.min(1, Math.sqrt(12e6 / (G.w * G.h)));
  if (!MSF.cv) MSF.cv = document.createElement('canvas'); MSF.cv.width = Math.ceil(G.w * cs); MSF.cv.height = Math.ceil(G.h * cs);
  const c = MSF.cv.getContext('2d'); c.setTransform(cs, 0, 0, cs, 0, 0); c.clearRect(0, 0, G.w, G.h);
  const cov = msfCoverPaths(MSF.list.filter(keep)); msfCoverFill(c, cov); msfRivers(c, cov, 0, 0, G.w, G.h);
  MSF.cvKey = key; return MSF.cv;
}
function massifDraw(c, landShown) {
  const al = msfAlpha(); if (al <= 0 || !layerUsed && !(img.complete && img.naturalWidth)) return;
  const L = msfList(); if (!L.length) return;
  const w = cv.clientWidth || 1, h = cv.clientHeight || 1, x0 = -view.x / view.s, y0 = -view.y / view.s, x1 = (w - view.x) / view.s, y1 = (h - view.y) / view.s, m = 4 * R;
  const keep = msfKeep(landShown);
  c.save(); c.globalAlpha = al;
  if (R * view.s >= MSF_VEC) {
    // the cover's outlines are kept for each block of the coarse grid and only the blocks in view are filled
    const cw = MSF.cw, gx = MSF.gx, tag = landShown ? 'L' : '', all = new Path2D(); let any = false;
    if (MSF.pcTag !== MSF.ver + tag) { MSF.pc = new Map(); MSF.pcTag = MSF.ver + tag; }
    for (let Y = Math.max(0, Math.floor((y0 - m) / cw)); Y <= Math.floor((y1 + m) / cw); Y++) for (let X = Math.max(0, Math.floor((x0 - m) / cw)); X <= Math.floor((x1 + m) / cw); X++) {
      const key = Y * gx + X, a = MSF.cell.get(key); if (!a) continue;
      let cov = MSF.pc.get(key); if (!cov) MSF.pc.set(key, cov = msfCoverPaths(a.filter(keep)));
      msfCoverFill(c, cov); all.addPath(cov.all); any = true;
    }
    if (any) msfRivers(c, { all }, x0, y0, x1, y1);
  } else c.drawImage(msfSheet(keep, landShown ? 'L' : ''), 0, 0, G.w, G.h);
  const P = msfBand(msfStep()), pm = 3.5 * DX * msfStep();
  c.lineJoin = 'round';
  for (const p of P) if (p[0] > x0 - pm && p[0] < x1 + pm && p[1] > y0 - pm && p[1] < y1 + pm && keep(p[5])) msfPeak(c, p);
  const st = stPeak(); if (st >= 0 && CX[st] > x0 - 40 && CX[st] < x1 + 40 && CY[st] > y0 - 40 && CY[st] < y1 + 40) drawStanther(c);
  c.restore();
}
