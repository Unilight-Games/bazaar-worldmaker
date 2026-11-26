// ---------- the sharp view of the largest maps (v0.21.0) ----------
// The owner asked for maps up to 1080 hexes a side (26 Nov 2026). The layer that holds the painted ground of such a map is kept
// coarse, so it fits in memory (13), and close up it would blur. So the part of the map in view is painted again, sharp, on a
// canvas of its own, a moment after the view comes to rest, by the same routine that paints the layer; and laid over the layer.
// It is drawn again when the ground changes or the view leaves it. Maps no larger than the large canvas never need it.
const DTL = { cv: null, x0: 0, y0: 0, x1: 0, y1: 0, s: 0, ver: -1, t: 0, want: '' };
const DTL_MAX = 3, DTL_PIX = 14e6, DTL_HEX = 70000;
function detailView() { const w = cv.clientWidth || 1, h = cv.clientHeight || 1; return [Math.max(0, -view.x / view.s), Math.max(0, -view.y / view.s), Math.min(G.w, (w - view.x) / view.s), Math.min(G.h, (h - view.y) / view.s)]; }
function detailDraw(c) {
  if (SHK <= 1 || view.s * dpr <= LS0 * 1.25) return;
  const [a, b, x, y] = detailView(), s = Math.min(DTL_MAX, view.s * dpr), ok = DTL.cv && DTL.ver === layerVer && DTL.s >= s * 0.7;
  if (ok) c.drawImage(DTL.cv, DTL.x0, DTL.y0, DTL.x1 - DTL.x0, DTL.y1 - DTL.y0);
  if (!(ok && a >= DTL.x0 && b >= DTL.y0 && x <= DTL.x1 && y <= DTL.y1)) { clearTimeout(DTL.t); DTL.t = setTimeout(detailBuild, 140); }
}
function detailBuild() {
  if (SHK <= 1 || __dead) return; const [a, b, x, y] = detailView(); if (x <= a || y <= b) return;
  const mw = (x - a) * 0.25, mh = (y - b) * 0.25, x0 = Math.max(0, a - mw), y0 = Math.max(0, b - mh), x1 = Math.min(G.w, x + mw), y1 = Math.min(G.h, y + mh);
  if ((x1 - x0) * (y1 - y0) / (DX * DY) > DTL_HEX) return;          // too much in view to paint sharp at once: the layer serves
  let s = Math.min(DTL_MAX, view.s * dpr); const area = (x1 - x0) * (y1 - y0) * s * s; if (area > DTL_PIX) s *= Math.sqrt(DTL_PIX / area);
  const W = Math.max(1, Math.ceil((x1 - x0) * s)), H = Math.max(1, Math.ceil((y1 - y0) * s));
  if (!DTL.cv) DTL.cv = document.createElement('canvas'); DTL.cv.width = W; DTL.cv.height = H;
  const keep = { LC, LS, LOX, LOY, LW, LH }, v = layerVer, t0 = performance.now();
  LC = DTL.cv.getContext('2d'); LS = s; LOX = x0; LOY = y0; LW = W; LH = H;
  try { rebuild(x0, y0, x0 + W / s, y0 + H / s); } finally { ({ LC, LS, LOX, LOY, LW, LH } = keep); layerVer = v; }
  Object.assign(DTL, { x0, y0, x1: x0 + W / s, y1: y0 + H / s, s, ver: v, ms: performance.now() - t0, n: (DTL.n || 0) + 1 }); requestDraw();
}
