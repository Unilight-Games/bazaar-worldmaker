// ---------- the renderer of repainted hexes: the same palette, noise and glyphs as the Python render of the map ----------
const RCOL = { g: [167, 176, 110], s: [196, 184, 128], v: [187, 181, 108], c: [205, 185, 136], h: [146, 158, 108], d: [227, 199, 143], t: [183, 189, 172],
  n: [235, 240, 243], f: [98, 126, 88], o: [118, 144, 90], k: [62, 76, 66], a: [78, 110, 74], e: [152, 170, 104], w: [106, 126, 92],
  m: [126, 144, 112], p: [172, 190, 114], M: [158, 144, 120], j: [60, 108, 64], i: [78, 118, 136], r: [164, 150, 82], y: [186, 158, 118], u: [206, 190, 86] };
function vh(i, j, seed) {
  let v = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(seed, 1442695041)) >>> 0;
  v = Math.imul(v ^ (v >>> 13), 1274126177) >>> 0;
  return ((v ^ (v >>> 16)) >>> 0) / 4294967295;
}
function vnoise(x, y, cell, seed) {
  const gx = Math.floor(x / cell), gy = Math.floor(y / cell), fx = x / cell - gx, fy = y / cell - gy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = vh(gx, gy, seed) + (vh(gx + 1, gy, seed) - vh(gx, gy, seed)) * sx, b = vh(gx, gy + 1, seed) + (vh(gx + 1, gy + 1, seed) - vh(gx, gy + 1, seed)) * sx;
  return a + (b - a) * sy;
}
function jit(col, i, amt) {
  const n = vnoise(CX[i], CY[i], 60, 3) - 0.5 + 0.5 * (vnoise(CX[i], CY[i], 17, 5) - 0.5);
  return 'rgb(' + col.map(c => Math.max(0, Math.min(255, Math.trunc(c + amt * 2 * n)))).join(',') + ')';
}
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function spots(i, n, rad, seed) {
  const r = rng(i * 31 + seed + 7), out = [];
  for (let t = 0; t < n * 4 && out.length < n; t++) {
    const a = r() * 2 * Math.PI, d = Math.sqrt(r()) * rad * R, x = CX[i] + d * Math.cos(a), y = CY[i] + d * Math.sin(a);
    if (out.every(([u, v]) => Math.hypot(x - u, y - v) > R * 0.42)) out.push([x, y]);
  }
  return out;
}
function seg(c, x0, y0, x1, y1, col, w) { c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.strokeStyle = col; c.lineWidth = w; c.stroke(); }
function ell(c, x, y, rx, ry, fill, line) { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 2 * Math.PI); c.fillStyle = fill; c.fill(); if (line) { c.strokeStyle = line; c.lineWidth = 1 / 3; c.stroke(); } }
function poly(c, pts, fill, line) { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let k = 1; k < pts.length; k++) c.lineTo(pts[k][0], pts[k][1]); c.closePath(); c.fillStyle = fill; c.fill(); if (line) { c.strokeStyle = line; c.lineWidth = 1 / 3; c.stroke(); } }
function rect(c, x0, y0, x1, y1, fill, line) { poly(c, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], fill, line); }
const TREE = {
  con(c, x, y, b) {
    const s = b === 'k' ? 1.1 : 1, h = 4.6 * s, w = 2 * s;
    poly(c, [[x, y - h], [x - w, y + 0.6], [x + w, y + 0.6]], b === 'k' ? 'rgb(30,44,38)' : b === 'w' ? 'rgb(66,96,70)' : 'rgb(58,92,62)');
    poly(c, [[x, y - h], [x - w, y + 0.6], [x - 0.2, y + 0.6]], b === 'k' ? 'rgb(50,66,54)' : b === 'w' ? 'rgb(92,120,86)' : 'rgb(88,122,82)');
    seg(c, x, y + 0.6, x, y + 1.6, 'rgb(70,54,40)', 1 / 3);
  },
  broad(c, x, y) { seg(c, x, y, x, y + 1.9, 'rgb(84,64,44)', 1 / 3); ell(c, x, y - 1.4, 2.2, 2.2, 'rgb(78,112,66)'); ell(c, x - 0.7, y - 2, 1.3, 1.3, 'rgb(104,138,82)'); },
  anc(c, x, y) {
    seg(c, x, y, x, y + 2.2, 'rgb(70,52,38)', 2 / 3); ell(c, x, y - 1.8, 2.9, 2.9, 'rgb(40,74,50)'); ell(c, x - 0.9, y - 2.6, 1.6, 1.6, 'rgb(62,98,66)');
    if (Math.trunc(x * 7 + y * 13) % 9 === 0) ell(c, x + 1.2, y - 1, 0.55, 0.55, 'rgba(170,236,200,.86)');      // the glow of shadowflora
  },
  jung(c, x, y) { ell(c, x, y - 1.2, 2.5, 2.5, 'rgb(30,76,42)'); ell(c, x - 1, y - 2, 1.7, 1.7, 'rgb(52,104,56)'); ell(c, x + 0.9, y - 2.4, 0.9, 0.9, 'rgb(78,132,72)'); },
  acacia(c, x, y) { seg(c, x, y + 1.6, x, y - 1.2, 'rgb(92,70,46)', 1 / 3); ell(c, x, y - 1.7, 2.6, 0.7, 'rgb(104,124,64)'); },
};
const FOOT = { jung: [0, -1.2, 2.8], con: [0, -1.5, 3.2], broad: [0, -0.9, 2.8], anc: [0, -1.0, 3.4], acacia: [0, -0.4, 2.8] };   // each glyph's footprint: centre offset and radius
function ground(c, i, b, trees) {
  const x0 = CX[i], y0 = CY[i];
  if (b === 'f' || b === 'k' || b === 'w') for (const [x, y] of spots(i, 4, 0.6, 0)) trees.push([y, 'con', x, y, b]);
  else if (b === 'o') for (const [x, y] of spots(i, 3, 0.58, 0)) trees.push([y, 'broad', x, y, b]);
  else if (b === 'a') for (const [x, y] of spots(i, 3, 0.55, 0)) trees.push([y, 'anc', x, y, b]);
  else if (b === 'j') for (const [x, y] of spots(i, 4, 0.62, 17)) trees.push([y, 'jung', x, y, b]);
  else if (b === 'e' || b === 'h') { if (vnoise(x0, y0, 9, 3) > 0.55) trees.push([y0, 'broad', x0, y0, b]); }
  else if (b === 'v') {
    const r = rng(i * 7 + 3);
    if (r() < 0.28) trees.push([y0, 'acacia', x0 + (r() - 0.5) * R * 0.6, y0 + (r() - 0.5) * R * 0.5, b]);
    c.lineJoin = 'miter';
    for (const [x, y] of spots(i, 2, 0.55, 3)) { c.beginPath(); c.moveTo(x - 1.6, y + 1); c.lineTo(x, y - 1.6); c.lineTo(x + 1.6, y + 1); c.strokeStyle = 'rgba(140,132,70,.59)'; c.lineWidth = 2 / 3; c.stroke(); }
  } else if (b === 's' || b === 'g') {
    const col = b === 's' ? 'rgba(150,140,92,.55)' : 'rgba(122,136,80,.47)';
    for (const [x, y] of spots(i, b === 's' ? 3 : 2, 0.55, 5)) { seg(c, x - 1.7, y + 1.2, x - 0.4, y - 1.6, col, 2 / 3); seg(c, x + 0.4, y - 1.6, x + 1.7, y + 1.2, col, 2 / 3); }
  } else if (b === 'c') { for (const [x, y] of spots(i, 3, 0.55, 7)) ell(c, x, y, 1.1, 1.1, 'rgba(150,132,92,.67)'); }
  else if (b === 'd') {
    const r = rng(i * 7 + 11);
    for (let k = 0; k < 2; k++) {
      const x = x0 + (r() - 0.5) * R * 0.8, y = y0 + (k - 0.5) * R * 0.7;
      c.beginPath(); c.ellipse(x, y + 0.4, 3.4, 2, 0, 200 * Math.PI / 180, 340 * Math.PI / 180); c.strokeStyle = 'rgba(200,165,108,.75)'; c.lineWidth = 1; c.stroke();
    }
  } else if (b === 't') { for (const [x, y] of spots(i, 3, 0.6, 9)) ell(c, x, y, 0.7, 0.7, 'rgba(140,150,138,.67)'); }
  else if (b === 'n') { if (vnoise(x0, y0, 23, 11) > 0.5) seg(c, x0 - 3, y0 + 1, x0 + 3, y0 - 1, 'rgba(196,210,222,.63)', 2 / 3); }
  else if (b === 'm') {
    for (const [x, y] of spots(i, 3, 0.55, 13)) {
      seg(c, x, y + 1.6, x, y - 1.8, 'rgba(70,96,70,.78)', 2 / 3); seg(c, x - 1.1, y + 1.6, x - 1.6, y - 0.6, 'rgba(70,96,70,.71)', 1 / 3);
      ell(c, x + 1.9, y + 1.5, 1.3, 0.5, 'rgba(96,130,150,.67)');
    }
  } else if (b === 'p') {
    for (const k of [-1, 0, 1]) seg(c, x0 - R * 0.7, y0 + k * R * 0.38, x0 + R * 0.7, y0 + k * R * 0.38, 'rgba(126,160,120,.67)', 1 / 3);
    seg(c, x0, y0 - R * 0.6, x0, y0 + R * 0.6, 'rgba(126,160,120,.59)', 1 / 3);
  } else if (b === 'r') {                         // the colonies' plantations of cane, cocoa and cotton: slanting rows and dark shrubs
    for (const k of [-1.5, -0.5, 0.5, 1.5]) seg(c, x0 - R * 0.62, y0 + (k + 0.4) * R * 0.3, x0 + R * 0.62, y0 + (k - 0.4) * R * 0.3, 'rgba(112,128,56,.71)', 1 / 3);
    for (const [x, y] of spots(i, 2, 0.5, 19)) ell(c, x, y, 0.8, 0.8, 'rgba(78,100,50,.75)');
  } else if (b === 'y') {                         // the wastes' dry earth (the user's ruling of 19 Nov 2026): bare ground split by cracks
    const r = rng(i * 13 + 5);
    for (const [x, y] of spots(i, 2, 0.5, 23)) {
      const a0 = r() * 2 * Math.PI;
      for (let k = 0; k < 3; k++) { const a = a0 + k * 2.09 + (r() - 0.5) * 0.5, ln = 1.5 + r() * 0.9; seg(c, x, y, x + ln * Math.cos(a), y + ln * Math.sin(a), 'rgba(140,106,76,.69)', 1 / 3); }
    }
  } else if (b === 'u') {                         // the sulfur fields: a yellow crust, bright crystals and a pale wisp of fume
    for (const [x, y] of spots(i, 3, 0.55, 29)) ell(c, x, y, 0.75, 0.75, 'rgba(238,220,96,.9)');
    ell(c, x0 + R * 0.2, y0 - R * 0.25, 1.5, 0.7, 'rgba(232,230,212,.47)');
  }
}
// the archipelago: islets and skerries on the shallow shelf sea, laid out from the same hash as the Python render, so a
// repainted archipelago hex looks like the map's own
const isletBand = i => BLANK ? (f => f < 0.13 ? 'cold' : f < 0.21 ? 'north' : f >= 0.78 ? 'warm' : 'temperate')(CY[i] / G.h) : CY[i] < 200 || (CX[i] < 300 && CY[i] < 520) ? 'cold' : CY[i] < 330 ? 'north' : CY[i] >= 1200 || (CX[i] > 1650 && CY[i] > 1080) ? 'warm' : 'temperate';
const ISLET_LAND = { cold: 'rgb(184,190,178)', north: 'rgb(112,136,92)', temperate: 'rgb(132,152,96)', warm: 'rgb(104,140,84)' };
function isletLayout(i) {
  const n = 1 + Math.trunc(vh(i, 1, 501) * 2.999), g = Math.PI * vh(i, 2, 501), out = [];   // one to three islets along one grain
  for (let k = 0; k < n; k++) for (let t = 0; t < 8; t++) {
    const q = k * 8 + t, r = k === 0 ? 1.8 + 1.6 * vh(i, q, 504) : 1.0 + 1.2 * vh(i, q, 504);
    const a = 2 * Math.PI * vh(i, q, 502), d = (0.6 * R - 1.25 * r) * Math.sqrt(vh(i, q, 503)), x = CX[i] + d * Math.cos(a), y = CY[i] + d * Math.sin(a);
    if (out.every(([u, v, w]) => Math.hypot(x - u, y - v) > 1.1 * (r + w) + 0.8)) { out.push([x, y, r, q]); break; }
  }
  return [g, out];
}
function isletShape(i, x, y, r, q, g, grow = 1) {
  const pts = [], cg = Math.cos(g), sg = Math.sin(g);
  for (let j = 0; j < 8; j++) {
    const f = (0.72 + 0.4 * vh(i, q * 8 + j, 505)) * r * grow, a = 2 * Math.PI * (j + 0.3 * vh(i, q * 8 + j, 506)) / 8;
    const u = 1.35 * f * Math.cos(a), v = 0.75 * f * Math.sin(a);
    pts.push([x + u * cg - v * sg, y + u * sg + v * cg]);
  }
  const out = [];
  for (let j = 0; j < 8; j++) { const a = pts[j], b = pts[(j + 1) % 8]; out.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]], [0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]); }
  return out;
}
function outline(c, pts, col, w) { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let k = 1; k < pts.length; k++) c.lineTo(pts[k][0], pts[k][1]); c.closePath(); c.strokeStyle = col; c.lineWidth = w; c.stroke(); }
function islets(c, i) {
  const band = isletBand(i), [g, lay] = isletLayout(i);
  c.lineJoin = 'round';
  for (const [x, y, r, q] of lay) {
    if (r < 1.3) { const sh = isletShape(i, x, y, r, q, g); poly(c, sh, 'rgb(124,118,108)'); outline(c, sh, 'rgba(40,56,66,.86)', 1 / 3); continue; }   // a bare skerry
    const beach = isletShape(i, x, y, r, q, g, 1.16);
    poly(c, beach, 'rgb(212,200,156)'); poly(c, isletShape(i, x, y, r, q, g, 0.9), ISLET_LAND[band]); outline(c, beach, 'rgba(40,56,66,.9)', 1 / 3);
    if (band === 'cold') ell(c, x - 0.05 * r, y - 0.14 * r, 0.45 * r, 0.26 * r, 'rgb(238,241,243)');
    else if (r > 2.0) for (const dx of r < 2.8 ? [0] : [-0.55, 0.6]) {          // a tree or two on the bigger islets
      const tx = x + dx * r * Math.cos(g), ty = y + dx * r * Math.sin(g);
      if (band === 'north') { poly(c, [[tx, ty - 3], [tx - 1.25, ty + 0.3], [tx + 1.25, ty + 0.3]], 'rgb(58,92,62)'); poly(c, [[tx, ty - 3], [tx - 1.25, ty + 0.3], [tx - 0.1, ty + 0.3]], 'rgb(88,122,82)'); }
      else { seg(c, tx, ty, tx, ty + 1, 'rgb(84,64,44)', 1 / 3); ell(c, tx, ty - 0.8, 1.3, 1.3, 'rgb(70,106,60)'); ell(c, tx - 0.4, ty - 1.2, 0.75, 0.75, 'rgb(98,134,80)'); }
    }
  }
}
function peak(c, x, y, size, snow, lit = [204, 190, 162], shade = [112, 96, 80], out = [52, 42, 34]) {
  const h = 9.6 * size, w = 7 * size, top = [x, y - h * 0.62], l = [x - w, y + h * 0.38], r = [x + w, y + h * 0.38], m = [x + w * 0.15, y + h * 0.38];
  poly(c, [top, l, m], `rgb(${lit})`); poly(c, [top, m, r], `rgb(${shade})`);
  if (snow) { const sy = y - h * 0.62 + h * 0.36; poly(c, [top, [x - w * 0.36, sy], [x - w * 0.1, sy + 1.2], [x + w * 0.05, sy - 0.2], [x + w * 0.2, sy + 1], [x + w * 0.36, sy]], 'rgb(244,246,248)'); }
  c.lineJoin = 'round'; c.beginPath(); c.moveTo(l[0], l[1]); c.lineTo(top[0], top[1]); c.lineTo(r[0], r[1]); c.strokeStyle = `rgb(${out})`; c.lineWidth = 1; c.stroke();
  seg(c, l[0], l[1], r[0], r[1], `rgba(${out},.47)`, 2 / 3);
}
// a mountain hex as the render draws it: size by how many mountain neighbours it has, snow by region; Stanther's own hexes larger and white
const STAN = new Set(D.stan || []);
const ring1 = h => { const out = [h]; for (let k = 0; k < 6; k++) { const v = NB[h * 6 + k]; if (v >= 0) out.push(v); } return out; };
const stPeak = () => ED.stan != null ? ED.stan : D.stpeak;
// where the great peak moves, the mountains right around it become Stanther's own; the old ones go back to plain mountains
const isStan = i => ED.stan == null ? STAN.has(i) : i === ED.stan || (eff(i) === 'M' && ring1(ED.stan).includes(i));
function drawPeak(c, i) {
  let deg = 0; for (let j = 0; j < 6; j++) { const v = NB[i * 6 + j]; if (v >= 0 && eff(v) === 'M') deg++; }
  const big = deg >= 2, st = isStan(i), isl = ZO[i] === 'K', snowy = !isl && (CX[i] < 220 || ZO[i] === 'H' || (CY[i] < 380 && CX[i] < 1040) || st);
  peak(c, CX[i] + (vnoise(CX[i], CY[i], 7, 1) - 0.5) * 2, CY[i], st ? 1.15 : isl ? (deg >= 1 ? 1 : 0.92) : big ? 1 : 0.8, (snowy && big) || st);
}
function drawStanther(c, at, alpha) {
  const i = at != null ? at : stPeak(); if (i < 0) return;
  if (alpha) c.globalAlpha = alpha;
  peak(c, CX[i], CY[i] - 2, 2.3, true, [222, 214, 196], [128, 116, 104], [44, 38, 34]);
  if (alpha) c.globalAlpha = 1;
}
// the great peak as a shape, for picking it up: its triangle, a little padded
function stanAt(mx, my) {
  if (stPeak() < 0) return false;                // a map with no great peak
  const i = stPeak(), x = CX[i], y = CY[i] - 2, pad = 2;
  const ax = x, ay = y - 13.7 - pad, bx = x - 16.1 - pad, by = y + 8.4 + pad, cx = x + 16.1 + pad, cy = by;
  const s = (px, py, qx, qy, rx, ry) => (px - rx) * (qy - ry) - (qx - rx) * (py - ry);
  const d1 = s(mx, my, ax, ay, bx, by), d2 = s(mx, my, bx, by, cx, cy), d3 = s(mx, my, cx, cy, ax, ay);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
}
// the hexes Stanther's old place covers: its own cluster and two rings round the old great peak
const STOLD = (() => { const s = new Set(D.stan || []); let ring = [D.stpeak]; s.add(D.stpeak); for (let r = 0; r < 2; r++) { const nx = []; for (const u of ring) for (const v of ring1(u)) if (!s.has(v)) { s.add(v); nx.push(v); } ring = nx; } return s; })();
function setStan(h) {
  if (h === D.stpeak) h = null;
  const before = [...STF];
  ED.stan = h; STF.clear(); CL_DIRTY = true;
  if (h != null) { for (const i of STOLD) STF.add(i); for (const i of ring1(h)) STF.add(i); }
  for (const i of before) updPainted(i);
  for (const i of STF) updPainted(i);
}
const stanRect = h => { let x0 = CX[h], y0 = CY[h], x1 = x0, y1 = y0; const pts = h === D.stpeak ? STOLD : ring1(h); for (const i of pts) { x0 = Math.min(x0, CX[i]); y0 = Math.min(y0, CY[i]); x1 = Math.max(x1, CX[i]); y1 = Math.max(y1, CY[i]); } return [x0 - 2.5 * R, y0 - 2.5 * R, x1 + 2.5 * R, y1 + 2.5 * R]; };
// the zone a hex shows in its card: Stanther's lore follows the peak; a hex of its old zone takes the zone around it
const ZFALL = (() => {
  const z = Array.from(ZO), q = [];
  for (let i = 0; i < N; i++) if (z[i] !== 'T' && z[i] !== '.') q.push(i); else if (z[i] === 'T') z[i] = '';
  for (let h = 0; h < q.length; h++) { const u = q[h]; for (const v of ring1(u)) if (z[v] === '') { z[v] = z[u]; q.push(v); } }
  return z;
})();
const zoneOf = i => ED.stan == null ? ZO[i] : isStan(i) ? 'T' : ZO[i] === 'T' ? (ZFALL[i] || '.') : ZO[i];
const POINTFN = {
  ruin(c, x, y) { [3.2, 2.0, 2.8].forEach((hh, k) => { const xx = x - 2 + k * 2; rect(c, xx - 0.55, y - hh, xx + 0.55, y, 'rgb(122,116,106)', 'rgb(66,60,54)'); }); seg(c, x - 3, y + 0.4, x + 3, y + 0.4, 'rgb(66,60,54)', 2 / 3); },
  harbour(c, x, y) { rect(c, x - 3, y - 0.8, x + 3, y + 0.8, 'rgb(120,108,92)', 'rgb(64,58,50)'); for (const k of [-2, 0, 2]) seg(c, x + k, y + 0.8, x + k, y + 2.6, 'rgb(64,58,50)', 1 / 3); },
  pillar(c, x, y) { poly(c, [[x - 0.9, y + 1.2], [x - 1.3, y - 3.8], [x + 0.4, y - 4.6], [x + 1.1, y + 1.2]], 'rgb(150,140,124)', 'rgb(84,76,66)'); ell(c, x - 0.3, y - 5.1, 1.7, 1.1, 'rgb(162,152,136)', 'rgb(84,76,66)'); },
  oasis(c, x, y) { ell(c, x, y + 0.3, 2.4, 1.1, 'rgb(86,138,160)'); ell(c, x - 1.9, y - 2, 1.5, 1.4, 'rgb(84,130,70)'); ell(c, x + 1.7, y - 1.7, 1.3, 1.3, 'rgb(98,142,76)'); },
};
const PTS = D.points.map(p => ({ ...p, h: hexAt(p.x, p.y) }));

// rivers: the same smoothing as the render, then a dark bank under a blue line; seasonal streams a pale unbroken line
function smooth3(p) { if (p.length < 3) return p; const o = [p[0]]; for (let i = 1; i < p.length - 1; i++) o.push([(p[i - 1][0] + 2 * p[i][0] + p[i + 1][0]) / 4, (p[i - 1][1] + 2 * p[i][1] + p[i + 1][1]) / 4]); o.push(p[p.length - 1]); return o; }
function chaikin(p, it) {
  for (let k = 0; k < it; k++) {
    const o = [p[0]];
    for (let i = 0; i < p.length - 1; i++) { const a = p[i], b = p[i + 1]; o.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]], [0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]); }
    o.push(p[p.length - 1]); p = o;
  }
  return p;
}
const smoothLine = p => chaikin(smooth3(smooth3(p)), 2);
function bbox(q, pad) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of q) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return [x0 - pad, y0 - pad, x1 + pad, y1 + pad]; }
function strokeRiver(c, q, w, s, capA = true, capB = true) {     // a cut end (capA/capB false) stops flat at the hidden stretch
  if (q.length < 2) return;
  const path = () => { c.beginPath(); c.moveTo(q[0][0], q[0][1]); for (let i = 1; i < q.length; i++) c.lineTo(q[i][0], q[i][1]); };
  const end = (col, r) => { for (const [p, on] of [[q[0], capA], [q[q.length - 1], capB]]) if (on) { c.beginPath(); c.arc(p[0], p[1], r, 0, 2 * Math.PI); c.fillStyle = col; c.fill(); } };
  c.lineJoin = 'round'; c.lineCap = 'butt';
  if (s) { path(); c.strokeStyle = 'rgb(124,166,190)'; c.lineWidth = w * 0.85; c.stroke(); end('rgb(124,166,190)', w * 0.85 / 2); return; }
  path(); c.strokeStyle = 'rgb(44,72,94)'; c.lineWidth = w + 1.2; c.stroke();
  path(); c.strokeStyle = 'rgb(84,136,172)'; c.lineWidth = w; c.stroke(); end('rgb(84,136,172)', w / 2);
}
const BRIV = D.rivs.map(r => { const q = smoothLine(r.p); return { q, w: r.w, s: r.s, bb: bbox(q, r.w + 1.5), s0: 0, s1: 0 }; });
// points along every drawn line, half a map unit apart, with half its stroke width and its line number:
// trees keep clear of them, the eraser finds lines by them, and a hidden stretch is cut out of a line by them
const SC = 6;
function sampler() { return { x: [], y: [], hw: [], hex: [], line: [], grid: new Map() }; }
function addSamples(S, q, hw, line) {
  for (let i = 0; i < q.length - 1; i++) {
    const a = q[i], b = q[i + 1], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.5));
    for (let s = 0; s < n; s++) pushSample(S, a[0] + (b[0] - a[0]) * s / n, a[1] + (b[1] - a[1]) * s / n, hw, line);
  }
  const e = q[q.length - 1]; pushSample(S, e[0], e[1], hw, line);
}
function pushSample(S, x, y, hw, line) {
  const j = S.x.length; S.x.push(x); S.y.push(y); S.hw.push(hw); S.hex.push(hexAt(x, y)); S.line.push(line);
  const key = Math.floor(x / SC) * 4096 + Math.floor(y / SC); let cell = S.grid.get(key); if (!cell) S.grid.set(key, cell = []); cell.push(j);
}
function nearSamples(S, x, y, lim, fn) {
  for (let gx = Math.floor((x - lim) / SC); gx <= Math.floor((x + lim) / SC); gx++) for (let gy = Math.floor((y - lim) / SC); gy <= Math.floor((y + lim) / SC); gy++) {
    const cell = S.grid.get(gx * 4096 + gy); if (cell) for (const j of cell) if (fn(j) === false) return false;
  }
  return true;
}
const BS = sampler();
BRIV.forEach((r, k) => { r.s0 = BS.x.length; addSamples(BS, r.q, (r.s ? r.w : r.w + 1.2) / 2, k); r.s1 = BS.x.length; });
const RVD = new Uint8Array(N), HEXLINES = new Map();   // hexes a drawn river of the map passes through, and which lines
for (let j = 0; j < BS.x.length; j++) { const h = BS.hex[j]; if (h < 0) continue; RVD[h] = 1; let s = HEXLINES.get(h); if (!s) HEXLINES.set(h, s = new Set()); s.add(BS.line[j]); }
const RIVSIG = D.rivs.length + ':' + Math.round(D.rivs.reduce((a, r) => a + r.p.reduce((b, p) => b + p[0] + p[1], 0), 0));
// a sample is off where the user hid its line in its hex, or painted that hex as water
const sampleOff = j => { const h = BS.hex[j]; return h >= 0 && ((ED.hide[h] > 0 && HIDK.has(BS.line[j] * N + h)) || (ED.cells[h] !== '.' && isW(ED.cells[h]))); };
const shownAt = h => { const s = HEXLINES.get(h); if (!s) return false; if (!ED.hide[h]) return true; for (const k of s) if (!HIDK.has(k * N + h)) return true; return false; };
function riverRuns(r) {                             // the stretches of a map river still shown, and whether each keeps the river's own end
  let any = false;
  for (let j = r.s0; j < r.s1; j++) if (sampleOff(j)) { any = true; break; }
  if (!any) return [{ q: r.q, a: true, b: true }];
  const runs = []; let cur = null;
  for (let j = r.s0; j < r.s1; j++) {
    if (sampleOff(j)) { if (cur) { runs.push(cur); cur = null; } continue; }
    if (!cur) cur = { q: [], a: j === r.s0, b: false };
    cur.q.push([BS.x[j], BS.y[j]]);
  }
  if (cur) { cur.b = true; runs.push(cur); }
  return runs.filter(u => u.q.length >= 2);
}
let US = sampler(), URVH = new Set();
const RDER = new Map();                        // derived geometry of the user's rivers, by id
function derive(r) { const k = RK[r.kind] || RK.river, q = smoothLine(r.pts); RDER.set(r.id, { q, w: k.w, s: k.s, bb: bbox(q, k.w + 1.5) }); }
function buildUserSamples() {
  US = sampler(); URVH = new Set();
  for (const r of ED.rivers) { const d = RDER.get(r.id); addSamples(US, d.q, (d.s ? d.w : d.w + 1.2) / 2, -1); }
  for (const h of US.hex) if (h >= 0) URVH.add(h);
}
const HWMAX = 3.2;
function clearOfWater(kind, x, y) {
  const [dx, dy, r] = FOOT[kind], cx = x + dx, cy = y + dy, lim = r + HWMAX + 0.4;
  for (const S of [BS, US]) {
    const clear = nearSamples(S, cx, cy, lim, j => {
      if (S === BS && sampleOff(j)) return true;                       // a hidden stretch is no water
      return Math.hypot(S.x[j] - cx, S.y[j] - cy) >= r + S.hw[j] + 0.4;  // false: water too close, stop looking
    });
    if (!clear) return false;
  }
  return true;
}
function userRiversSorted() { return ED.rivers.slice().sort((a, b) => (RK[a.kind] || RK.river).w - (RK[b.kind] || RK.river).w); }

