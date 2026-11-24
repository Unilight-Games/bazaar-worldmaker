// Map Maker Engine: the map runtime. Built by build.py from the Gresland terrain page's script; see the patches there.
(function () {
const MME = window.MME = window.MME || {};
MME.startMap = function (BASE, ENV) {
const MAP_IMG = BASE.img || '', G = BASE.G, D = BASE.D, BLANK = !!BASE.blank;
let __dead = false; const __offs = [];
const setTimeout = (f, ms) => window.setTimeout(() => { if (!__dead) f(); }, ms);
const requestAnimationFrame = f => window.requestAnimationFrame(t => { if (!__dead) f(t); });
const __on = (t, ev, fn, o) => { t.addEventListener(ev, fn, o); __offs.push(() => t.removeEventListener(ev, fn, o)); };
const FSLUG = (String(ENV.meta && ENV.meta.title || 'map').toLowerCase().replace(/[^a-z0-9ก-๙]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)) || 'map';
const PANKEY = { ArrowUp: 'u', ArrowDown: 'd', ArrowLeft: 'l', ArrowRight: 'r', KeyW: 'u', KeyS: 'd', KeyA: 'l', KeyD: 'r' }, panKeys = new Set();
let panRaf = 0, panT = 0, panFast = false, panHint = false;
const CLO = { e: {}, p: {}, t: {}, set: {}, seasons: [], st: {}, sp: {} };   // heights, rain and warmth set by hand, hex by hex; the means; the seasons of the year and what each is like, down to the hex
const clSet = k => CLO.set[k] != null ? CLO.set[k] : k === 'g' ? 16 : BLANK ? (k === 'w' ? 0 : 22) : (k === 'w' ? -60 : 26);
const $ = id => document.getElementById(id);

// ---------- the hex lattice (flat-top hexes, odd columns half a row lower) ----------
const R = G.R, DX = 1.5 * R, DY = Math.sqrt(3) * R, COLS = G.cols, ROWS = G.rows, N = COLS * ROWS;
const cOf = id => id % COLS + G.cmin, kOf = id => ((id / COLS) | 0) + G.kmin, odd = c => (c & 1) === 1;
const CX = new Float32Array(N), CY = new Float32Array(N);
for (let id = 0; id < N; id++) { const c = cOf(id); CX[id] = G.x0 + c * DX; CY[id] = G.y0 + kOf(id) * DY + (odd(c) ? DY / 2 : 0); }
const idAt = (c, k) => { const i = c - G.cmin, r = k - G.kmin; return i >= 0 && i < COLS && r >= 0 && r < ROWS ? r * COLS + i : -1; };
function hexAt(x, y) {
  const c0 = Math.round((x - G.x0) / DX); let best = -1, bd = 1e9;
  for (let c = c0 - 1; c <= c0 + 1; c++) {
    const off = odd(c) ? DY / 2 : 0, k0 = Math.round((y - G.y0 - off) / DY);
    for (let k = k0 - 1; k <= k0 + 1; k++) { const id = idAt(c, k); if (id < 0) continue; const d = (CX[id] - x) ** 2 + (CY[id] - y) ** 2; if (d < bd) { bd = d; best = id; } }
  }
  return best;
}
// neighbours in the order top, bottom, upper left, lower left, upper right, lower right; EDGE names the side of a hexagon each one shares
const NB = new Int32Array(N * 6), EDGE = [4, 1, 3, 2, 5, 0];
for (let id = 0; id < N; id++) {
  const c = cOf(id), k = kOf(id), d = odd(c) ? [[0, -1], [0, 1], [-1, 0], [-1, 1], [1, 0], [1, 1]] : [[0, -1], [0, 1], [-1, -1], [-1, 0], [1, -1], [1, 0]];
  for (let j = 0; j < 6; j++) NB[id * 6 + j] = idAt(c + d[j][0], k + d[j][1]);
}
const COS = [], SIN = [];
for (let a = 0; a < 6; a++) { COS.push(Math.cos(a * Math.PI / 3)); SIN.push(Math.sin(a * Math.PI / 3)); }
function hexPath(c, i, s) { c.moveTo(CX[i] + R * s, CY[i]); for (let a = 1; a < 6; a++) c.lineTo(CX[i] + R * s * COS[a], CY[i] + R * s * SIN[a]); c.closePath(); }
const BI = D.biome, ZO = D.zone, RV = D.river;   // one character per hex: the map as drawn
const BIOME = D.biomes, ZONE = D.zones;
const isW = b => b === 'S' || b === 'L' || b === 'i';
const isSea = b => b === 'S' || b === 'i';            // the archipelago ('i') is shallow sea strewn with islets

// ---------- the user's edits ----------
// cells: '.' keeps the drawn map, any other code repaints the hex
// HIDK: stretches of the map's own rivers the user hid, one key per river line and hex (line × N + hex); hide counts them per hex
// labels: map labels the user added or changed (id → the whole label); lhid: the page's own labels the user removed;
// stan: the hex Mount Stanther's great peak was moved to (null: where the render put it)
// routes: roads and trade routes the user laid or changed (id → the whole route); rthid: the page's own roads the user removed;
// points, phid: lore points the same way; zinfo, binfo, kinfo: the user's text for zones, kinds of ground and kinds of point;
// tlinks: trade lines the user laid or changed (id → the whole line), tlhid: the page's own lines removed, hubs: city → its rank as
// a centre (0 to 3) where the user set one, tparent: city → the centre the user chose for it to send its goods to
const ED = { cells: new Array(N).fill('.'), hide: new Uint16Array(N), rivers: [], cities: [], bhid: new Set(), labels: new Map(), lhid: new Set(), stan: null,
  routes: new Map(), rthid: new Set(), points: new Map(), phid: new Set(), zinfo: new Map(), binfo: new Map(), kinfo: new Map(),
  tlinks: new Map(), tlhid: new Set(), hubs: new Map(), tparent: new Map() };
const HIDK = new Set();
const painted = new Set();
if (BLANK) for (let i = 0; i < N; i++) painted.add(i);   // nothing is drawn under a new map: the sea is the engine's to draw too                         // hexes the edits layer draws afresh
const STF = new Set();                             // hexes redrawn because Mount Stanther moved: where it stood and where it stands
const eff = i => ED.cells[i] !== '.' ? ED.cells[i] : i === ED.stan ? 'M' : BI[i];   // the great peak stands on a mountain hex wherever it goes
function updPainted(i) { if (BLANK || ED.cells[i] !== '.' || ED.hide[i] || STF.has(i) || PTF.has(i)) painted.add(i); else painted.delete(i); }
function setCell(i, c) { ED.cells[i] = c; updPainted(i); CL_DIRTY = true; }
function setPair(key, on) {
  if (on === HIDK.has(key)) return false;
  const h = key % N;
  if (on) { HIDK.add(key); ED.hide[h]++; } else { HIDK.delete(key); ED.hide[h]--; }
  updPainted(h); return true;
}
const CODES = 'SLigsvchdtnfokjaewmpryuM';
const RK = {
  big: { name: 'แม่น้ำใหญ่', w: 4.0, s: 0 }, river: { name: 'แม่น้ำ', w: 2.5, s: 0 },
  stream: { name: 'ลำน้ำเล็ก', w: 1.5, s: 0 }, seasonal: { name: 'ลำน้ำตามฤดูกาล', w: 1.6, s: 1 },
};
const CK = {
  capital: { name: 'เมืองหลวง', r: 4.2, min: 3.6, f: { min: 11, max: 16, base: 14 }, wt: 700 },
  city: { name: 'เมือง', r: 3.3, min: 2.8, f: { min: 10, max: 14, base: 12 }, wt: 600 },
  town: { name: 'เมืองเล็ก', r: 2.4, min: 2, f: { min: 9, max: 12.5, base: 10.5 }, wt: 500 },
  fort: { name: 'ป้อมปราการ', r: 2.9, min: 2.4, f: { min: 9.5, max: 13, base: 11 }, wt: 600 },
  village: { name: 'หมู่บ้าน', r: 1.8, min: 1.5, f: { min: 8.5, max: 11.5, base: 9.5 }, wt: 500 },
};

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

// ---------- roads ----------
// every road is found on the hex lattice: the cheapest way over the ground between its ends and through its waypoints.
// A road shuns mountains (a tunnel), big rivers (a bridge) and the ancient forest unless a city stands near it.
// The trade is not laid by hand: it is worked out from the ground around the cities (see the trade below).
const RDC = {
  royal: { name: 'ถนนหลวง', w: 1.3, px: 2, line: '#efe3c4', edge: 'rgba(46,34,22,.92)' },
  laterite: { name: 'ถนนลูกรัง', w: 0.95, px: 1.5, line: '#cf7f48', edge: 'rgba(58,34,20,.72)' },
  cart: { name: 'ทางเกวียน', w: 0.65, px: 1.1, line: '#a07a50', dash: [1.6, 1.3], dpx: [3, 2.4] },
};
const CIMP = { capital: 3, city: 3, fort: 2, town: 2, village: 1 };
const autoCls = (ka, kb) => { const m = Math.min(CIMP[ka] || 2, CIMP[kb] || 2); return m >= 3 ? 'royal' : m >= 2 ? 'laterite' : 'cart'; };
const showR = { royal: true, laterite: true, cart: true, water: true, caravan: true };
const shown = r => !!showR[r.cls];

// rivers crossed on the way from a hex to a neighbour: 1 any river, 2 a big one (a bridge, or a long way round)
const REVK = [1, 0, 5, 4, 3, 2], BIGW = 3.2;
const EX = new Uint8Array(N * 6);
const nbIndex = (u, v) => { for (let k = 0; k < 6; k++) if (NB[u * 6 + k] === v) return k; return -1; };
function segCross(ax, ay, bx, by, cx, cy, dx, dy) {
  const d1 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax), d2 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
  const d3 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx), d4 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx);
  return (d1 > 0) !== (d2 > 0) && (d3 > 0) !== (d4 > 0);
}
function markRun(xs, ys, big) {
  const f = big ? 3 : 1;
  for (let s = 0; s < xs.length - 1; s++) {
    const ax = xs[s], ay = ys[s], bx = xs[s + 1], by = ys[s + 1], h1 = hexAt(ax, ay), h2 = hexAt(bx, by);
    for (const u of h1 === h2 ? [h1] : [h1, h2]) {
      if (u < 0) continue;
      for (let k = 0; k < 6; k++) {
        const v = NB[u * 6 + k];
        if (v >= 0 && segCross(CX[u], CY[u], CX[v], CY[v], ax, ay, bx, by)) { EX[u * 6 + k] |= f; EX[v * 6 + REVK[k]] |= f; }
      }
    }
  }
}
function buildCrossings() {
  EX.fill(0);
  for (const r of BRIV) {                           // the map's rivers by their samples, less the stretches the user hid
    const big = !r.s && r.w >= BIGW; let xs = [], ys = [];
    for (let j = r.s0; j < r.s1; j++) {
      if (sampleOff(j)) { if (xs.length > 1) markRun(xs, ys, big); xs = []; ys = []; continue; }
      xs.push(BS.x[j]); ys.push(BS.y[j]);
    }
    if (xs.length > 1) markRun(xs, ys, big);
  }
  for (const r of ED.rivers) { const d = RDER.get(r.id); if (d) markRun(d.q.map(p => p[0]), d.q.map(p => p[1]), !d.s && d.w >= BIGW); }
}
// the ground: what one hex of travel costs, against open grassland at 1
const TC = { g: 1, s: 1, v: 1, h: 1.05, e: 1.1, p: 1.15, r: 1.1, y: 1.05, u: 1.6, c: 1.25, d: 1.8, t: 1.9, n: 2.6, f: 1.6, o: 1.5, k: 2.3, j: 2.7, w: 2.8, m: 2.6, a: 1.8, M: 1 };
const NEARC = new Uint8Array(N);                    // within three hexes of a city: the ancient forest and the Florans' jungle are no barrier there
function buildNearC() {
  NEARC.fill(0);
  for (const c of visibleCities()) { const h = hexAt(c.x, c.y); if (h < 0) continue; let ring = [h]; NEARC[h] = 1; for (let r = 0; r < 3; r++) { const nx = []; for (const u of ring) for (let k = 0; k < 6; k++) { const v = NB[u * 6 + k]; if (v >= 0 && !NEARC[v]) { NEARC[v] = 1; nx.push(v); } } ring = nx; } }
}
const RDH = new Uint8Array(N), RDE = new Set();     // the best road on each hex (3 royal, 2 laterite, 1 cart) and the edges roads cross
function stepCost(mode, u, k, v) {
  const b = eff(v); if (isW(b)) return Infinity;
  const x = EX[u * 6 + k], wild = (b === 'a' || ZO[v] === 'J') && !NEARC[v];   // the Florans guard their jungle (the user's ruling of 19 Nov 2026)
  return (b === 'M' ? 22 : wild ? 14 : TC[b]) + (x & 2 ? 16 : x & 1 ? 0.8 : 0);
}
const HMIN = { road: 1 };
// A*, with a binary heap that may hold a hex more than once (the stale entries are skipped)
const HP = new Int32Array(N * 7), HF = new Float64Array(N * 7);
let HN = 0;
function hpush(id, f) { let i = HN++; while (i > 0) { const p = (i - 1) >> 1; if (HF[p] <= f) break; HP[i] = HP[p]; HF[i] = HF[p]; i = p; } HP[i] = id; HF[i] = f; }
function hpop() {
  const top = HP[0], lid = HP[--HN], lf = HF[HN]; let i = 0;
  for (;;) { let c = 2 * i + 1; if (c >= HN) break; if (c + 1 < HN && HF[c + 1] < HF[c]) c++; if (HF[c] >= lf) break; HP[i] = HP[c]; HF[i] = HF[c]; i = c; }
  if (HN) { HP[i] = lid; HF[i] = lf; }
  return top;
}
const GS = new Float64Array(N), PREV = new Int32Array(N), SEENS = new Uint32Array(N), DONES = new Uint32Array(N);
let stampN = 0;
function findPath(src, dst, mode) {
  if (src < 0 || dst < 0) return null;
  if (src === dst) return [src];
  const s = ++stampN, hm = HMIN[mode] / DY, tx = CX[dst], ty = CY[dst];
  HN = 0; GS[src] = 0; SEENS[src] = s; PREV[src] = -1; hpush(src, 0);
  while (HN) {
    const u = hpop(); if (DONES[u] === s) continue; DONES[u] = s;
    if (u === dst) break;
    for (let k = 0; k < 6; k++) {
      const v = NB[u * 6 + k]; if (v < 0 || DONES[v] === s) continue;
      const c = stepCost(mode, u, k, v); if (c === Infinity) continue;
      const g = GS[u] + c;
      if (SEENS[v] !== s || g < GS[v]) { SEENS[v] = s; GS[v] = g; PREV[v] = u; hpush(v, g + Math.hypot(CX[v] - tx, CY[v] - ty) * hm); }
    }
  }
  if (DONES[dst] !== s) return null;
  const path = []; for (let v = dst; v !== -1; v = PREV[v]) path.push(v);
  return path.reverse();
}
// the city a new road goes to: the nearest one by the road's own reckoning, so a city over a mountain range is far
function nearestCity(src, selfId) {
  const targets = new Map();
  for (const c of visibleCities()) { if (c.id === selfId) continue; const h = landHex(hexAt(c.x, c.y)); if (h >= 0 && h !== src && !targets.has(h)) targets.set(h, c.id); }
  if (src < 0 || !targets.size) return null;
  const s = ++stampN; HN = 0; GS[src] = 0; SEENS[src] = s; PREV[src] = -1; hpush(src, 0);
  while (HN) {
    const u = hpop(); if (DONES[u] === s) continue; DONES[u] = s;
    if (targets.has(u)) return { id: targets.get(u), cost: GS[u] };
    for (let k = 0; k < 6; k++) {
      const v = NB[u * 6 + k]; if (v < 0 || DONES[v] === s) continue;
      const c = stepCost('road', u, k, v); if (c === Infinity) continue;
      const g = GS[u] + c;
      if (SEENS[v] !== s || g < GS[v]) { SEENS[v] = s; GS[v] = g; PREV[v] = u; hpush(v, g); }
    }
  }
  return null;
}
function landHex(h) {                               // a city on the shore may sit on a water hex: its road starts on the nearest land
  if (h < 0 || !isW(eff(h))) return h;
  let ring = [h]; const seen = new Set(ring);
  for (let r = 0; r < 3; r++) { const nx = []; for (const u of ring) for (let k = 0; k < 6; k++) { const v = NB[u * 6 + k]; if (v < 0 || seen.has(v)) continue; if (!isW(eff(v))) return v; seen.add(v); nx.push(v); } ring = nx; }
  return -1;
}
const cityById = id => visibleCities().find(c => c.id === id) || null;
function endPoint(e) {
  if (typeof e === 'string') { const c = cityById(e); return c ? { x: c.x, y: c.y, h: landHex(hexAt(c.x, c.y)), city: c } : null; }
  if (Array.isArray(e) && Number.isFinite(e[0]) && Number.isFinite(e[1])) return { x: e[0], y: e[1], h: landHex(hexAt(e[0], e[1])) };
  return null;
}
const routeMode = () => 'road';
function routeGeom(r) {
  const A = endPoint(r.a), B = endPoint(r.b);
  if (!A || !B) return null;                        // a city at an end is gone: the route is not shown
  const stops = [A, ...(r.via || []).map(p => ({ x: p[0], y: p[1], h: landHex(hexAt(p[0], p[1])) })), B];
  if (stops.some(s => s.h < 0)) return { fail: true };
  const mode = routeMode(r);
  let hexes = [];
  const legs = [];
  for (let i = 0; i < stops.length - 1; i++) {
    const p = findPath(stops[i].h, stops[i + 1].h, mode);
    if (!p) return { fail: true };
    legs.push(Math.max(0, hexes.length - 1));
    hexes = hexes.length ? hexes.concat(p.slice(1)) : p;
  }
  const raw = hexes.map(h => [CX[h], CY[h]]);
  if (raw.length === 1) raw.push([CX[hexes[0]], CY[hexes[0]]]);
  raw[0] = [A.x, A.y]; raw[raw.length - 1] = [B.x, B.y];
  const q = smoothLine(raw);
  const bridges = [], tun = new Set();
  for (let i = 0; i < hexes.length - 1; i++) {
    const u = hexes[i], v = hexes[i + 1], k = nbIndex(u, v);
    if (k >= 0 && EX[u * 6 + k] & 2) bridges.push(bridgeAt(q, u, v, k));
  }
  if (mode === 'road') {                            // a tunnel: a run of mountain hexes the road passes through, not the one it starts or ends on
    let i = 0;
    while (i < hexes.length) {
      if (eff(hexes[i]) !== 'M') { i++; continue; }
      let j = i; while (j + 1 < hexes.length && eff(hexes[j + 1]) === 'M') j++;
      if (i > 0 && j < hexes.length - 1) for (let t = i; t <= j; t++) tun.add(hexes[t]);
      i = j + 1;
    }
  }
  const segT = tun.size ? q.slice(0, -1).map((p, i) => tun.has(hexAt((p[0] + q[i + 1][0]) / 2, (p[1] + q[i + 1][1]) / 2))) : null;
  let tunnels = 0; if (segT) for (let i = 0; i < segT.length; i++) if (segT[i] && !segT[i - 1]) tunnels++;
  return { hexes, q, raw, legs, bridges, segT, tunnels, len: hexes.length - 1, bb: bbox(q, 6), mode };
}
// the user's routes and the page's own roads; RGEO keeps each route's geometry until the ground, its ends or its course change
const baseRoad = id => D.roads.find(r => r.id === id) || null;
function visibleRoutes() {
  const out = [];
  for (const r of D.roads) { if (ED.rthid.has(r.id)) continue; const o = ED.routes.get(r.id); out.push(o ? { ...o, own: true, base: true } : { id: r.id, t: 'road', cls: r.cls, a: r.a, b: r.b, via: [], own: false, base: true }); }
  for (const [id, o] of ED.routes) if (!baseRoad(id)) out.push({ ...o, own: true, base: false });
  return out;
}
const plainRoute = r => ({ id: r.id, t: r.t, cls: r.cls, a: r.a, b: r.b, via: (r.via || []).map(p => [r1(p[0]), r1(p[1])]) });
const RGEO = new Map();
let RT_EPOCH = 1, RT_BUILT = 0, ROAD_VER = 0, ROAD_KEY = '';
const bumpRoutes = () => { RT_EPOCH++; };
function routeSig(r) {
  const A = endPoint(r.a), B = endPoint(r.b);
  return JSON.stringify([RT_EPOCH, r.cls, A && [A.x, A.y], B && [B.x, B.y], r.via || []]);
}
function geoOf(r) {
  const s = routeSig(r), c = RGEO.get(r.id);
  if (c && c.sig === s) return c.geo;
  const geo = routeGeom(r); RGEO.set(r.id, { sig: s, geo }); return geo;
}
function ensureRoutes() {
  if (RT_BUILT !== RT_EPOCH) { buildCrossings(); buildNearC(); RT_BUILT = RT_EPOCH; }
  const vis = visibleRoutes(), keys = [];
  for (const r of vis) if (r.t === 'road') { const g = geoOf(r); keys.push(r.id + ':' + r.cls + ':' + (g && !g.fail ? g.hexes.length + ':' + g.hexes[0] + ':' + g.hexes[g.hexes.length - 1] + ':' + g.q.length : 'x')); }
  const key = keys.join('|');
  if (key !== ROAD_KEY) {                           // the roads changed: which hexes and edges they cover, for the caravans
    ROAD_KEY = key; ROAD_VER++; RDH.fill(0); RDE.clear();
    for (const r of vis) {
      if (r.t !== 'road') continue;
      const g = RGEO.get(r.id) && RGEO.get(r.id).geo; if (!g || g.fail) continue;
      const lv = r.cls === 'royal' ? 3 : r.cls === 'laterite' ? 2 : 1;
      for (let i = 0; i < g.hexes.length; i++) {
        const h = g.hexes[i]; if (RDH[h] < lv) RDH[h] = lv;
        if (i) { const u = g.hexes[i - 1], k = nbIndex(u, h); if (k >= 0) { RDE.add(u * 6 + k); RDE.add(h * 6 + REVK[k]); } }
      }
    }
  }
  if (RGEO.size > vis.length + 40) { const ids = new Set(vis.map(r => r.id)); for (const id of [...RGEO.keys()]) if (!ids.has(id)) RGEO.delete(id); }
  return vis;
}
// drawing: the lesser roads under the greater, bridges and tunnel mouths on top
function linePath(c, q) { c.beginPath(); c.moveTo(q[0][0], q[0][1]); for (let i = 1; i < q.length; i++) c.lineTo(q[i][0], q[i][1]); }
function offsetLine(q, d) {
  const o = [];
  for (let i = 0; i < q.length; i++) {
    const a = q[Math.max(0, i - 1)], b = q[Math.min(q.length - 1, i + 1)], nx = a[1] - b[1], ny = b[0] - a[0], L = Math.hypot(nx, ny) || 1;
    o.push([q[i][0] + nx / L * d, q[i][1] + ny / L * d]);
  }
  return o;
}
function runsOf(g) {                                // the line cut where it goes into or out of a tunnel
  if (!g.segT) return [{ q: g.q, t: false }];
  const out = []; let cur = null;
  for (let i = 0; i < g.segT.length; i++) {
    const t = g.segT[i];
    if (!cur || cur.t !== t) { if (cur) out.push(cur); cur = { q: [g.q[i]], t }; }
    cur.q.push(g.q[i + 1]);
  }
  if (cur) out.push(cur);
  return out;
}
const dashOf = (st, px) => st.dash ? st.dash.map((d, i) => Math.max(d, st.dpx[i] * px)) : [];
function strokeRoad(c, px, cls, g, glow) {
  if (!g || g.fail || g.q.length < 2) return;
  const st = RDC[cls] || RDC.cart, w = Math.max(st.w, st.px * px);
  c.lineJoin = 'round'; c.lineCap = 'round';
  const runs = runsOf(g);
  if (glow) { linePath(c, g.q); c.strokeStyle = 'rgba(255,214,120,.55)'; c.lineWidth = w + 6 * px; c.stroke(); }
  for (const u of runs) {
    linePath(c, u.q);
    if (u.t) { c.setLineDash([1.6 * w, 1.4 * w]); c.strokeStyle = 'rgba(36,30,26,.9)'; c.lineWidth = w * 0.95; c.stroke(); c.setLineDash([]); continue; }
    if (st.edge) { c.strokeStyle = st.edge; c.lineWidth = w + Math.max(0.6, 1.1 * px); c.stroke(); }
    c.strokeStyle = st.line; c.lineWidth = w; c.setLineDash(dashOf(st, px)); c.stroke(); c.setLineDash([]);
  }
  for (let i = 1; i < runs.length; i++) {           // tunnel mouths: a dark arch across the road
    const p = runs[i].q[0], a = runs[i].q[1] || p, ang = Math.atan2(a[1] - p[1], a[0] - p[0]);
    c.save(); c.translate(p[0], p[1]); c.rotate(ang); c.beginPath(); c.arc(0, 0, w * 0.95 + 0.6 * px, -Math.PI / 2, Math.PI / 2, runs[i].t);
    c.strokeStyle = 'rgba(30,24,20,.95)'; c.lineWidth = Math.max(0.8, 1.3 * px); c.stroke(); c.restore();
  }
}
// Where a bridge stands (v0.13.0, the owner saw bridges off their roads): on the road as it is drawn, at the point where the
// drawn line crosses the edge between the two hexes the river runs between, and turned the way the road runs there. The drawn
// road is a smoothed line that cuts its corners, so the middle of the two hex centres is often beside it. Where the line does
// not cross that edge at all, the bridge goes to the point of the road nearest the middle of the edge.
function bridgeAt(q, u, v, k) {
  const e = EDGE[k], e2 = (e + 1) % 6, ax = CX[u] + R * COS[e], ay = CY[u] + R * SIN[e], bx = CX[u] + R * COS[e2], by = CY[u] + R * SIN[e2];
  const mx = (ax + bx) / 2, my = (ay + by) / 2, ex = (bx - ax) * 0.62, ey = (by - ay) * 0.62, x1 = mx - ex, y1 = my - ey, x2 = mx + ex, y2 = my + ey;   // the edge, a little longer at both ends
  let best = null, bd = Infinity;
  for (let i = 0; i + 1 < q.length; i++) {
    const px = q[i][0], py = q[i][1], dx = q[i + 1][0] - px, dy = q[i + 1][1] - py, den = dx * (y2 - y1) - dy * (x2 - x1);
    if (Math.abs(den) > 1e-9) { const t = ((x1 - px) * (y2 - y1) - (y1 - py) * (x2 - x1)) / den, s = ((x1 - px) * dy - (y1 - py) * dx) / den; if (t >= 0 && t <= 1 && s >= 0 && s <= 1) return { x: px + dx * t, y: py + dy * t, a: Math.atan2(dy, dx) }; }
    const l2 = dx * dx + dy * dy, w = l2 > 0 ? clamp(((mx - px) * dx + (my - py) * dy) / l2, 0, 1) : 0, nx = px + dx * w, ny = py + dy * w, d = Math.hypot(nx - mx, ny - my);
    if (d < bd) { bd = d; best = { x: nx, y: ny, a: Math.atan2(dy, dx) }; }
  }
  return best || { x: mx, y: my, a: Math.atan2(CY[v] - CY[u], CX[v] - CX[u]) };
}
function drawBridge(c, px, b, cls) {
  const st = RDC[cls] || RDC.cart, w = Math.max(st.w, st.px * px), L = Math.max(4.2, 7 * px), hw = w / 2 + Math.max(0.5, 0.9 * px), f = Math.max(0.6, 1.2 * px);
  c.save(); c.translate(b.x, b.y); c.rotate(b.a);
  c.fillStyle = '#eadcbc'; c.fillRect(-L / 2, -hw, L, 2 * hw);
  c.beginPath();
  for (const s of [-1, 1]) { c.moveTo(-L / 2 - f, s * (hw + f)); c.lineTo(-L / 2, s * hw); c.lineTo(L / 2, s * hw); c.lineTo(L / 2 + f, s * (hw + f)); }
  c.strokeStyle = 'rgba(36,28,22,.95)'; c.lineWidth = Math.max(0.4, 0.9 * px); c.lineJoin = 'miter'; c.stroke(); c.restore();
}
function drawRoutes(c, px, live) {
  const vis = ensureRoutes();
  const geo = r => live && live.id === r.id ? live.geo : RGEO.get(r.id) && RGEO.get(r.id).geo;
  for (const cls of ['cart', 'laterite', 'royal']) for (const r of vis) if (r.t === 'road' && r.cls === cls && shown(r)) strokeRoad(c, px, cls, geo(r), c === ctx && r.id === rsel);
  for (const r of vis) if (r.t === 'road' && shown(r)) { const g = geo(r); if (g && !g.fail) for (const b of g.bridges) drawBridge(c, px, b, r.cls); }
  if (live && live.id == null && live.geo) strokeRoad(c, px, live.cls, live.geo, true);   // a road being laid
}
// picking a route: the nearest drawn line within a few pixels
function distToLine(q, x, y) { let best = 1e9; for (let i = 0; i < q.length - 1; i++) best = Math.min(best, segDist(x, y, q[i], q[i + 1])); return best; }
function routeAt(mx, my) {
  const lim = Math.max(3, 7 / view.s); let best = null, bd = lim;
  for (const r of visibleRoutes()) {
    if (!shown(r)) continue;
    const c = RGEO.get(r.id), g = c && c.geo; if (!g || g.fail || !hits(g.bb, mx - lim - 8, my - lim - 8, mx + lim + 8, my + lim + 8)) continue;
    const d = distToLine(g.q, mx, my); if (d < bd) { bd = d; best = r; }
  }
  return best;
}
const routeName = r => (RDC[r.cls] || RDC.cart).name;
const endName = e => typeof e === 'string' ? ((cityById(e) || {}).name || 'เมืองที่ถูกลบ') : 'จุดบนแผนที่';

// ---------- trade: what the ground around each city yields, what each city needs, and how the goods travel ----------
// Every city works the hexes nearest to it, a wider ring for a bigger city. Each kind of ground yields its own goods and each zone
// adds its own: the mines of the Karahara, the phantom haze of Grandfall, the dwarves under Handerlaw, the elves of Qredens who
// will not dig. A city keeps what it needs and sells the rest to whoever can fetch it cheapest. Boats carry most of it: a load on
// a lake, the sea or a navigable river costs a fraction of what it costs a caravan, and a caravan on a road a fraction of one off it.
// Workshops in the bigger cities turn ore, fuel, timber and mana into tools, arms, devices, ships and books.
const ECAT = {   // name, colour, value of a load, bulk (what a load pays per unit of travel)
  grain: { name: 'ธัญพืชและอาหารหลัก', col: '#e3c46a', v: 1, bulk: 1 },
  protein: { name: 'เนื้อ ปลา นม และไข่', col: '#e0896a', v: 1.6, bulk: 0.9 },
  salt: { name: 'เกลือ', col: '#ece6d8', v: 2.2, bulk: 0.8 },
  herbs: { name: 'เห็ด สมุนไพร และเครื่องเทศ', col: '#93c46e', v: 4, bulk: 0.3 },
  timber: { name: 'ไม้', col: '#a37b4c', v: 1.1, bulk: 1.4 },
  fuel: { name: 'เชื้อเพลิงและยางไม้', col: '#8a735c', v: 1, bulk: 1.2 },
  stone: { name: 'หินและดินปั้น', col: '#b9ae9a', v: 0.7, bulk: 1.6 },
  ore: { name: 'แร่', col: '#9a9aa6', v: 1.4, bulk: 1.3 },
  cloth: { name: 'เส้นใย หนัง และเชือก', col: '#c9a0d0', v: 3, bulk: 0.45 },
  mana: { name: 'ศิลาเวทและวัสดุมานา', col: '#7fb6ff', v: 6, bulk: 0.35 },
  rare: { name: 'โลหะมีค่าและโลหะหายาก', col: '#f2d48a', v: 10, bulk: 0.35 },
  luxury: { name: 'ของหายาก', col: '#e58fb8', v: 8, bulk: 0.15 },
  tools: { name: 'เครื่องมือโลหะ', col: '#aab5c3', v: 4, bulk: 0.6, made: true },
  arms: { name: 'อาวุธและชุดเกราะ', col: '#d26a5a', v: 6, bulk: 0.7, made: true },
  tech: { name: 'เครื่องกลและอุปกรณ์เวท', col: '#6ad0c8', v: 10, bulk: 0.4, made: true },
  ships: { name: 'เรือ', col: '#5a90b4', v: 8, bulk: 0.05, made: true },
  books: { name: 'ตำราและความรู้', col: '#dccca2', v: 6, bulk: 0.2, made: true },
  labor: { name: 'แรงงาน (ทาส)', col: '#d0343c', v: 1, bulk: 0.5, people: true },   // people bought and sold (v0.13.0): no ground yields it and no workshop makes it; the year's slave trade fills its books
};
// on a map of our own world the class that is mana in Gresland is crude oil, priced with gems and gold as the owner ruled; coal burns with the other fuels
if (BLANK) { ECAT.mana.name = 'น้ำมันดิบ'; ECAT.mana.v = ECAT.rare.v; ECAT.fuel.name = 'เชื้อเพลิง ถ่านหิน และยางไม้'; ECAT.tech.name = 'เครื่องจักรและเครื่องกล'; ECAT.rare.name = 'โลหะมีค่าและอัญมณี'; ECAT.herbs.name = 'สมุนไพร เครื่องเทศ และน้ำผึ้ง'; }
const ECATS = Object.keys(ECAT), ERAW = ECATS.filter(c => !ECAT[c].made && !ECAT[c].people), EMADEC = ECATS.filter(c => ECAT[c].made);
const KIX = { capital: 0, city: 1, town: 2, fort: 3, village: 4 };
const EPOP = [12, 7, 4, 3, 1.6];                   // heads of a capital, a city, a town, a fort, a village
const EREACH = [7, 6, 5, 4, 4];                    // how far out each works the land, in hexes of open ground
const EIND = [1, 0.8, 0.4, 0.35, 0.1];             // workshops per head
const ENEED = {                                    // loads a head needs a year, capital, city, town, fort, village
  grain: [1, 1, 1, 1, 1], protein: [0.5, 0.45, 0.4, 0.5, 0.35], salt: [0.09, 0.08, 0.08, 0.08, 0.07], herbs: [0.08, 0.06, 0.04, 0.03, 0.02],
  timber: [0.3, 0.25, 0.2, 0.25, 0.15], fuel: [0.25, 0.2, 0.18, 0.2, 0.15], stone: [0.2, 0.15, 0.08, 0.2, 0.04], ore: [0, 0, 0, 0, 0],
  cloth: [0.18, 0.15, 0.12, 0.12, 0.08], mana: [0.16, 0.1, 0.04, 0.08, 0.01], rare: [0.05, 0.03, 0.01, 0.01, 0], luxury: [0.14, 0.08, 0.03, 0.02, 0.01],
  tools: [0.1, 0.1, 0.1, 0.08, 0.1], arms: [0.12, 0.08, 0.03, 0.35, 0.01], tech: [0.06, 0.04, 0.01, 0.04, 0], ships: [0.04, 0.03, 0.015, 0.01, 0.01],
  books: [0.03, 0.02, 0.005, 0.004, 0], labor: [0, 0, 0, 0, 0],
};
// the workshops: loads a head turns out at full supply, and what one load takes
const EWORK = {
  tools: { base: 0.11, in: { ore: 1, fuel: 0.5 } },
  arms: { base: 0.14, in: { ore: 0.9, fuel: 0.4, timber: 0.3 } },
  tech: { base: 0.05, in: { mana: 0.8, ore: 0.3, rare: 0.2 } },
  ships: { base: 0.05, in: { timber: 2, fuel: 0.4, cloth: 0.3 } },
  books: { base: 0.04, in: { timber: 0.3, cloth: 0.05 } },
};
if (BLANK) { ENEED.mana = ENEED.mana.map(x => x * 0.4); EWORK.tech.in = { mana: 0.3, fuel: 0.5, ore: 0.3, rare: 0.2 }; }   // oil is dear and scarce: a head burns less of it, and machines run on coal too (my numbers)
const SB = (H, s) => { let t = 0; for (const ch of s) t += H.b[ch] || 0; return t; };                   // land of these kinds
const SZ = (H, s, z) => { let t = 0; for (const ch of s) t += H.bz[ch + z] || 0; return t; };          // the same within one zone
const NOQ = (H, s) => SB(H, s) - SZ(H, s, 'Q');                                                        // the elves of Qredens dig no mines
const SBA = (H, s) => { let t = 0; for (const ch of s) t += H.ba[ch] || 0; return t; };              // the same, each hex weighed by the rain-fed grain it can grow
// ---------- the climate (the user's request of 19 Nov 2026) ----------
// From the build: each hex's height in metres (Mount Stanther's own rise left out) and its rain of a cycle in millimetres, both
// from the same water model that lays the rivers. From the lore: the White interval averages -60°C and falls to -90°C, the swing
// to the Sky Ease interval comes close to a hundred degrees, the west is very dry, the centre moderately dry, the east and the
// north wet, and the highest peaks rise through the mana cloud (Astral). The rest is my model, worked out here in the page so it
// follows Mount Stanther wherever the user moves it and the ground wherever the user repaints it.
const b64u16 = s => { const b = atob(s), a = new Uint16Array(b.length >> 1); for (let i = 0; i < a.length; i++) a[i] = b.charCodeAt(2 * i) | (b.charCodeAt(2 * i + 1) << 8); return a; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const CL = { cloud: 3000, stTop: 10200, stRing: 7600, lapseS: 6.5, lapseW: 3, rdry: 0.6, k: 6.8, sMean: 26 };
const CLW = BLANK ? 5 : CL.lapseW;   // how fast the cold season cools with height: in Gresland the cold pools in the lowlands (the lore), on Earth it does so far less
const SYN = !D.clim;   // no surveyed heights and rain: both are read from the painted ground, afresh whenever it changes
const CL_E = SYN ? new Uint16Array(N) : b64u16(D.clim.elev), CL_P0 = SYN ? new Uint16Array(N) : b64u16(D.clim.rain);
const LAT = { N, NB, CX, CY };
// ---- the year in seasons ----
// A map of our own world lies between two latitudes. Where the owner has not said, the span comes from the map's real size
// (a degree is 111 km) around the middle its climate was made for. A season has a place on the year's swing between the coldest
// and the warmest (warm 0 to 1), its own share of the year, a wind, and the owner's finer hand on its warmth and rain.
const CLLAT = (() => { const g = ENV.meta && ENV.meta.gen, mid = { cold: 60, temperate: 42, hot: 14 }[g && g.climate] || 38, span = clamp(ROWS * (ENV.meta && +ENV.meta.kmPerHex || 30) / 111, 6, 120); return [clamp(mid + span / 2, -89, 89), clamp(mid - span / 2, -89, 89)]; })();
const clLat0 = () => CLO.set.lat0 != null ? CLO.set.lat0 : CLLAT[0], clLat1 = () => CLO.set.lat1 != null ? CLO.set.lat1 : CLLAT[1];
const CLSEAS0 = [{ id: 'd0', name: 'ฤดูหนาว', len: 3, warm: 0, dt: 0, rain: 1, wind: '', gust: 1 }, { id: 'd1', name: 'ฤดูใบไม้ผลิ', len: 3, warm: 0.5, dt: 0, rain: 1, wind: '', gust: 1 }, { id: 'd2', name: 'ฤดูร้อน', len: 3, warm: 1, dt: 0, rain: 1, wind: '', gust: 1 }, { id: 'd3', name: 'ฤดูใบไม้ร่วง', len: 3, warm: 0.5, dt: 0, rain: 1, wind: '', gust: 1 }];
// the seasons the year is worked out in: the owner's, or the four of our own world; a map from the lore keeps its two extremes until the owner divides its year
const clSeasons = () => CLO.seasons.length ? CLO.seasons : BLANK ? CLSEAS0 : null;
// where the wind blows to, by the side it comes from (y grows southward on the map)
const WDIR = { N: [0, 1], NE: [-0.7071, 0.7071], E: [-1, 0], SE: [-0.7071, -0.7071], S: [0, -1], SW: [0.7071, -0.7071], W: [1, 0], NW: [0.7071, 0.7071] };
const WNAME = { N: 'เหนือ', NE: 'ตะวันออกเฉียงเหนือ', E: 'ตะวันออก', SE: 'ตะวันออกเฉียงใต้', S: 'ใต้', SW: 'ตะวันตกเฉียงใต้', W: 'ตะวันตก', NW: 'ตะวันตกเฉียงเหนือ' };
const WORD = {};                                   // the hexes in the order a wind crosses them, kept for each wind
// How wet a wind leaves each hex. The air crosses the map from the side the wind comes from: over water it takes up moisture,
// over land it rains some out, more where the ground rises in its way, and it comes down the far side of a range dry. The numbers
// are mine: they give a wet windward coast, a rain shadow, and an interior that dries with distance from the sea.
function clWindField(dir, gust, H) {
  const [dx, dy] = WDIR[dir], pr = new Float32Array(N); for (let i = 0; i < N; i++) pr[i] = CX[i] * dx + CY[i] * dy;
  let ord = WORD[dir]; if (!ord) { ord = WORD[dir] = new Int32Array(N); for (let i = 0; i < N; i++) ord[i] = i; ord.sort((a, b) => pr[a] - pr[b]); }
  const M = new Float32Array(N), W = new Float32Array(N), base = 0.05 / clamp(gust || 1, 0.3, 3);
  let sum = 0, n = 0;
  for (let q = 0; q < N; q++) {
    const i = ord[q]; let mi = 0, hi = 0, ws = 0;
    for (let k = 0; k < 6; k++) { const v = NB[i * 6 + k]; if (v < 0) continue; const d = pr[i] - pr[v]; if (d > 0.01) { mi += M[v] * d; hi += (H[v] || 0) * d; ws += d; } }
    const land = !isNaN(H[i]);
    if (ws > 0) { mi /= ws; hi /= ws; } else { mi = land ? 0.55 : 0.9; hi = land ? H[i] : 0; }      // air that enters over the edge of the map
    if (!land) { M[i] = mi + (1 - mi) * 0.3; continue; }
    const rise = (H[i] - hi) / 1000, f = clamp(base + (rise > 0 ? 0.5 * rise : 0), 0, 0.85), r = mi * f / (1 + (rise < 0 ? -1.6 * rise : 0));
    W[i] = r; M[i] = Math.max(0, mi - 0.85 * r); sum += r; n++;
  }
  const mean = n ? sum / n : 1;
  for (let i = 0; i < N; i++) if (W[i] || !isNaN(H[i])) W[i] = clamp(W[i] / (mean || 1), 0.12, 3.5);
  const S = new Float32Array(N);                   // a little spreading, so one hex does not stand alone
  for (let i = 0; i < N; i++) { if (isNaN(H[i])) continue; let t = W[i] * 2, c = 2; for (let k = 0; k < 6; k++) { const v = NB[i * 6 + k]; if (v >= 0 && !isNaN(H[v])) { t += W[v]; c++; } } S[i] = t / c; }
  return S;
}
// the wind of one season over each hex: the season's own, else the map's, else the belts of our own world by latitude
// (easterly trades below 30 degrees, westerlies to 60, polar easterlies beyond)
// A map the engine made was painted for one prevailing wind (its wet coasts and dry interiors already follow it), so that wind
// stays the map's own until the owner picks another; a map begun as empty sea takes the belts.
const GENWIND = BLANK && ENV.meta && ENV.meta.gen && WDIR[ENV.meta.gen.wind] ? ENV.meta.gen.wind : '';
const clWindOf = s => (s.wind || CLO.set.wind || (BLANK ? GENWIND || 'auto' : ''));
const clBelt = lat => { const a = Math.abs(lat); return a < 30 ? 'E' : a < 60 ? 'W' : 'E'; };
// the parts of each hex's climate that the user cannot change: its rain, and the sea-level warmth of the two intervals.
// Colder north, warmer south, milder by the sea, hotter summers in the rain shadow, and the warm current of Celestia's sea along
// the south-east isles (my own, as for the plantations).
function buildCLB() {
  if (SYN) MME.synthClimate(LAT, eff, CL_E, CL_P0);
  const GB = SYN ? eff : (i => BI[i]);
  const P0 = CL_P0, d = new Uint16Array(N).fill(999), q = [];
  for (let i = 0; i < N; i++) if (GB(i) === 'S' || GB(i) === 'i') { d[i] = 0; q.push(i); }
  for (let h = 0; h < q.length; h++) { const u = q[h]; for (let k = 0; k < 6; k++) { const v = NB[u * 6 + k]; if (v >= 0 && d[v] > d[u] + 1) { d[v] = d[u] + 1; q.push(v); } } }
  const p = new Float32Array(N), s = new Float32Array(N), w = new Float32Array(N), dtr = new Float32Array(N), lat = BLANK ? new Float32Array(N) : null;
  for (let i = 0; i < N; i++) {
    let pi = P0[i];
    if (!pi) { let t = 0, n = 0; for (let k = 0; k < 6; k++) { const v = NB[i * 6 + k]; if (v >= 0 && P0[v]) { t += P0[v]; n++; } } pi = n ? t / n : 600; }   // land raised from the sea takes the rain around it
    const u = clamp((CY[i] * 1536 / G.h - 80) / 1420, 0, 1), c = 1 - Math.exp(-d[i] / 6), rain = (pi - 60) / 1400, dry = clamp((CL.rdry - rain) / CL.rdry, 0, 1);
    const warm = !SYN && CX[i] > 1650 && CY[i] > 1080 && d[i] <= 4 ? 2 : 0;
    // wet country stays cooler in the warm interval under its clouds
    p[i] = pi; dtr[i] = 7 + 9 * clamp(1 - rain, 0, 1) + 3 * c;
    if (BLANK) {
      // our own world: the year's mean at sea level falls from 27°C at the equator to -20 at the pole, and the swing between the
      // coldest and the warmest month grows with latitude and with distance from the sea (2 degrees on an equatorial coast, some
      // 35 deep inside a continent at 45 degrees). Both curves are fitted by eye to the zonal means of Earth.
      const la = lat[i] = clLat0() + (clLat1() - clLat0()) * clamp(CY[i] / G.h, 0, 1), sl = Math.sin(Math.abs(la) * Math.PI / 180), tm = 27 - 47 * Math.pow(sl, 2.6), rg = 2 + sl * (10 + 36 * c);
      s[i] = tm + rg / 2 + 4 * dry - 3 * clamp((rain - 0.4) / 0.8, 0, 1); w[i] = tm - rg / 2;
    } else { s[i] = clSet('g') * u + 5 * c + 5 * dry - 4 * clamp((rain - 0.4) / 0.8, 0, 1) + warm; w[i] = clSet('g') * u + 8 * (1 - c) + warm; }
  }
  let tw = 0, ts = 0, n = 0; for (let i = 0; i < N; i++) if (!isW(GB(i))) { tw += w[i] - CLW * CL_E[i] / 1000; ts += s[i] - CL.lapseS * CL_E[i] / 1000; n++; }
  // a map of our own world keeps what its latitudes give unless the owner names a mean for the coldest or the warmest season
  if (BLANK) return { p, s, w, dtr, lat, mean: { w: tw / (n || 1), s: ts / (n || 1) }, w0: CLO.set.w != null ? CLO.set.w - tw / (n || 1) : 0, s0: CLO.set.s != null ? CLO.set.s - ts / (n || 1) : 0, dsea: d };
  // w0 puts the White interval's mean over the land at the lore's -60°C; s0 the Sky Ease interval's at 26°C before the snowfields
  // and Stanther's heights are counted, which bring it to about 24: a swing of some 85 degrees in the means, so the hot days and
  // the coldest nights stretch past the hundred the lore speaks of
  return { p, s, w, dtr, w0: clSet('w') - tw / (n || 1), s0: clSet('s') - ts / (n || 1), dsea: d };
}
let CLB = buildCLB();
function climHeight(i) {
  const b = eff(i); if (isW(b)) return 0;
  if (CLO.e[i] != null) return CLO.e[i];
  if (isStan(i)) return i === stPeak() ? CL.stTop : Math.max(CL_E[i], CL.stRing);
  return b === 'M' && BI[i] !== 'M' ? Math.max(CL_E[i], 2600) : CL_E[i];          // a mountain the user painted stands as high as the ranges
}
const ARID = [[0.05, 'แห้งแล้งจัด'], [0.2, 'แห้งแล้ง'], [0.5, 'กึ่งแห้งแล้ง'], [0.65, 'กึ่งชุ่มชื้น'], [Infinity, 'ชุ่มชื้น']];
const aridClass = ai => ARID.findIndex(([t]) => ai < t);
function climAt(i) {
  const h = climHeight(i), p = CLO.p[i] != null ? CLO.p[i] : CLB.p[i];
  let ts = (CLO.t[i] || 0) + CLB.s0 + CLB.s[i] - CL.lapseS * h / 1000; const tw = Math.max(-88, (CLO.t[i] || 0) + CLB.w0 + CLB.w[i] - CLW * h / 1000);   // the lore's coldest is -90
  if (eff(i) === 'n') ts = Math.min(ts, 1);         // snow and ice hold their ground near freezing through the warm interval
  const pet = CL.k * Math.max(0, ts + 17.8) * Math.sqrt(CLB.dtr[i]);               // Hargreaves over the warm intervals of a cycle
  const ai = pet > 1 ? p / pet : 9;
  return { h, ts, tw, p, ai, cls: aridClass(ai), cloud: h >= CL.cloud };
}
// how cold a whole cycle is: degrees below a heated room's 18°C summed over the thirteen intervals along a smooth swing between the
// White interval and the Sky Ease interval, against the same sum at the lore's -60°C and the land's mean Sky Ease
const heatSum = (ts, tw) => { const m = (ts + tw) / 2, a = (ts - tw) / 2; let s = 0; for (let k = 0; k < 13; k++) s += Math.max(0, 18 - (m + a * Math.cos(2 * Math.PI * k / 13))); return s; };
let CL_ARR = null, CL_DIRTY = true;
function climEnsure() {
  if (!CL_DIRTY && CL_ARR) return CL_ARR;
  CLB = buildCLB();
  const A = { h: new Float32Array(N), ts: new Float32Array(N), tw: new Float32Array(N), p: new Float32Array(N), ai: new Float32Array(N), f: new Float32Array(N).fill(1) };
  let ss = 0, n = 0;
  for (let i = 0; i < N; i++) {
    if (isW(eff(i))) { A.h[i] = NaN; continue; }
    const c = climAt(i); A.h[i] = c.h; A.ts[i] = c.ts; A.tw[i] = c.tw; A.p[i] = c.p; A.ai[i] = c.ai; if (SYN || !isW(BI[i])) { ss += c.ts; n++; }
  }
  // The year in seasons. Each hex's warmth in a season lies between its coldest and its warmest by the season's place on the
  // year's swing (turned over south of the equator), plus what the owner added. Its rain of the year is shared out between the
  // seasons by their length and by how wet each season's wind leaves the hex; on a map of our own world the rain belt that
  // follows the sun and the dry belt of the subtropics shift with the season too. Dryness is the year's rain against what the
  // warmth of every season could draw out of the ground, and a crop counts only the seasons warm enough to grow in.
  const SE = clSeasons(); A.seas = SE; A.S = null; A.aig = null; A.grow = null; A.heat = null; A.wind = null;
  if (SE) {
    const tot = SE.reduce((a, s) => a + s.len, 0) || 1, lat = CLB.lat, fields = {}, fld = (dir, g) => fields[dir + g] || (fields[dir + g] = clWindField(dir, g, A.h));
    const Wk = SE.map(s => { const w = clWindOf(s), g = Math.round(clamp(s.gust || 1, 0.3, 3) * 20) / 20; if (!w || w === 'calm' || !WDIR[w] && !(w === 'auto' && lat)) return null; if (w !== 'auto') return fld(w, g); const a = fld('E', g), b = fld('W', g), o = new Float32Array(N); for (let i = 0; i < N; i++) o[i] = clBelt(lat[i]) === 'E' ? a[i] : b[i]; return o; });
    A.wind = SE.map(s => clWindOf(s));
    A.S = SE.map(() => ({ t: new Float32Array(N), p: new Float32Array(N) })); A.aig = new Float32Array(N); A.grow = new Float32Array(N); A.heat = new Float32Array(N);
    const wt = new Float64Array(SE.length), WA = CLO.set.wa != null ? CLO.set.wa : 0.35, SOUTH = lat ? clLat0() + clLat1() < 0 : false; ss = 0; n = 0;   // SOUTH: most of the map lies south of the equator, so the seasons are named for the south
    for (let i = 0; i < N; i++) {
      if (isNaN(A.h[i])) continue;
      const ts = A.ts[i], tw = A.tw[i], la = lat ? lat[i] : null, south = la != null && (la < 0) !== SOUTH, snow = eff(i) === 'n', dq = Math.sqrt(CLB.dtr[i]); let wsum = 0;
      for (let k = 0; k < SE.length; k++) {
        const s = SE[k]; let W = Wk[k] ? Wk[k][i] : 1;
        if (la != null) { const hw = 2 * (south ? 1 - s.warm : s.warm) - 1; W *= (1 + 1.3 * Math.exp(-Math.pow((la - 10 * (2 * (SOUTH ? 1 - s.warm : s.warm) - 1)) / 9, 2))) * (1 - 0.55 * Math.exp(-Math.pow((Math.abs(la) - 28 - 6 * hw) / 8, 2))); }
        wt[k] = s.len * W; wsum += wt[k];
      }
      // The wind also moves the year's total, part of the way: the ground the owner painted says how much rain a place gets, and
      // the winds and the belts of latitude push that up on a windward side and down in a rain shadow. A hex whose rain the
      // owner set by hand keeps the owner's number.
      const yr = CLO.p[i] != null ? A.p[i] : A.p[i] * Math.pow(clamp(wsum / tot, 0.1, 4), WA);
      let P = 0, pet = 0, gp = 0, gpet = 0, grow = 0, heat = 0, hi = -1e9, lo = 1e9;
      for (let k = 0; k < SE.length; k++) {
        const s = SE[k], sh = s.len / tot, key = s.id + ':' + i;
        let T = tw + (ts - tw) * (south ? 1 - s.warm : s.warm) + s.dt + (CLO.st[key] || 0); if (snow) T = Math.min(T, 1); if (!BLANK) T = Math.max(-88, T);
        const p = yr * (wsum > 0 ? wt[k] / wsum : sh) * s.rain * (CLO.sp[key] != null ? CLO.sp[key] : 1), e = sh * 2 * CL.k * Math.max(0, T + 17.8) * dq;
        A.S[k].t[i] = T; A.S[k].p[i] = p; P += p; pet += e; if (T >= 5) { grow += sh; gp += p; gpet += e; } else gp += T < 0 ? p : 0.5 * p; heat += sh * Math.max(0, 18 - T); if (T > hi) hi = T; if (T < lo) lo = T;   // snow lies until the thaw and waters the crop then; cold rain half soaks away
      }
      A.ts[i] = hi; A.tw[i] = lo; A.p[i] = P; A.ai[i] = pet > 1 ? P / pet : 9; A.grow[i] = grow; A.heat[i] = heat; A.aig[i] = gpet > 1 ? gp / gpet : grow > 0 ? 9 : 0;
      if (SYN || !isW(BI[i])) { ss += hi; n++; }
    }
  }
  // rain-fed grain: full on humid ground, less as the ground dries; a hex by a lake or a river that runs the whole cycle is watered,
  // one on a stream that runs with the season half watered. With the year in seasons the water is counted over the seasons a crop
  // can grow in, and a year with under a third of it warm enough cuts the harvest whatever the water.
  let hs = 0, hn = 0;
  for (let i = 0; i < N; i++) {
    if (isNaN(A.h[i])) continue;
    let wet = (RV[i] === '1' && shownAt(i)) || URVH.has(i);
    for (let k = 0; k < 6 && !wet; k++) { const v = NB[i * 6 + k]; if (v >= 0 && (eff(v) === 'L' || (RV[v] === '1' && shownAt(v)) || URVH.has(v))) wet = true; }
    A.f[i] = wet ? 1 : Math.max(RV[i] === '2' ? 0.6 : 0, clamp(((SE ? A.aig[i] : A.ai[i]) - 0.05) / 0.6, 0.25, 1));
    if (SE) { A.f[i] *= clamp(A.grow[i] / 0.3, 0.25, 1); hs += A.heat[i]; hn++; }
  }
  A.tsMean = n ? ss / n : 20; A.ref = SE ? Math.max(0.5, hn ? hs / hn : 1) : heatSum(A.tsMean, clSet('w')); A.stamp = (CL_ARR ? CL_ARR.stamp : 0) + 1;
  CL_ARR = A; CL_DIRTY = false; return A;
}
// what the climate asks of a city: fuel and warm clothing for the cold, herbs for the fevers of the damp intervals and new tools for
// the rust (the Drizzling Rain interval, Astral); Handerlaw's cities under the mountains heat with the earth's own fire (Astral)
function climCity(h, zone) {
  const A = climEnsure(), hs = clamp(A.heat ? A.heat[h] / A.ref : heatSum(A.ts[h], A.tw[h]) / A.ref, 0, 4), wet = clamp((A.p[h] - 800) / 800, -0.6, 1.2), heat = zone === 'H' ? 0.25 : 1;
  return { hs, fuel: 0.4 + 0.6 * hs * heat, cloth: 0.8 + 0.2 * hs, herbs: 1 + 0.25 * wet, tools: 1 + 0.15 * wet, geo: zone === 'H' };
}
// the goods of the ground: id, name, category, loads from the hinterland H, where the lore says so
// the goods of a new map: what the same kinds of ground yield on Earth, at the rates the Gresland table uses for its like.
// Each is a list of terms the owner can edit: [ground codes or @point kind, loads a hex, conditions]. Conditions: f rain-fed,
// r a river in the hex, mN within N hexes of a mountain, cN within N of the sea, l beside a lake, o a forest's open edge.
const LANDNM = 'gsvchdtnfokjaewmpryu', LANDALL = LANDNM + 'M', WOODS = 'fokjaw';
const EARTH_RULES = [
  ['wheat', 'ข้าวสาลี', 'grain', [['gh', 0.18, 'f'], ['e', 0.1, 'f']]],
  ['barley', 'ข้าวบาร์เลย์และข้าวไรย์', 'grain', [['s', 0.07, 'f'], ['gh', 0.05, 'f'], ['t', 0.02]]],
  ['rice', 'ข้าว', 'grain', [['p', 0.24], ['m', 0.04]]],
  ['millet', 'ข้าวฟ่างและข้าวโพด', 'grain', [['v', 0.12, 'f'], ['c', 0.03]]],
  ['tubers', 'มันฝรั่งและพืชหัว', 'grain', [[LANDNM, 0.03, 'm1'], ['e', 0.03, 'f']]],
  ['dates', 'อินทผลัมและผลไม้โอเอซิส', 'grain', [['@oasis', 1]]],
  ['plantain', 'กล้วย เผือก และมันสำปะหลัง', 'grain', [['j', 0.04], ['r', 0.05]]],
  ['cattle', 'เนื้อวัว นม และเนย', 'protein', [['ghev', 0.04]]],
  ['sheep', 'เนื้อแกะและแพะ', 'protein', [['sc', 0.03], [LANDNM, 0.02, 'm1']]],
  ['poultry', 'หมู ไก่ และไข่', 'protein', [['gepo', 0.02]]],
  ['lakefish', 'ปลาน้ำจืดและปลาเค็ม', 'protein', [['L', 0.1], [LANDALL, 0.025, 'r']]],
  ['seafish', 'ปลาและหอยทะเล', 'protein', [['Si', 0.08]]],
  ['reindeer', 'เนื้อกวางเรนเดียร์', 'protein', [['t', 0.035], ['n', 0.015]]],
  ['game', 'เนื้อกวางและสัตว์ป่า', 'protein', [[WOODS, 0.012]]],
  ['camel', 'อูฐและนมอูฐ', 'protein', [['dy', 0.02]]],
  ['seasalt', 'เกลือทะเล', 'salt', [['Si', 0.035]]],
  ['rocksalt', 'เกลือสินเธาว์', 'salt', [['M', 0.004], ['d', 0.012], ['y', 0.008]], 1],
  ['spice', 'พริกไทยและเครื่องเทศ', 'herbs', [['r', 0.02], ['j', 0.006]]],
  ['herbs', 'สมุนไพรและเห็ด', 'herbs', [[WOODS, 0.012, 'o'], ['mw', 0.006]]],
  ['honey', 'น้ำผึ้งและขี้ผึ้ง', 'herbs', [['goe', 0.008]]],
  ['tea', 'ชา', 'herbs', [[WOODS, 0.012, 'm1']]],
  ['sulfur', 'กำมะถัน', 'herbs', [['u', 0.02]], 1],
  ['softwood', 'ไม้สน', 'timber', [['f', 0.13]]],
  ['hardwood', 'ไม้เนื้อแข็ง (โอ๊ก บีช)', 'timber', [['ok', 0.1]]],
  ['tropicalwood', 'ไม้เขตร้อน (สัก มะฮอกกานี)', 'timber', [['j', 0.08]]],
  ['swampwood', 'ไม้ป่าบึงและป่าชายเลน', 'timber', [['w', 0.05]]],
  ['charcoal', 'ถ่านไม้และฟืน', 'fuel', [[WOODS, 0.07]]],
  ['pitch', 'ยางสนและน้ำมันดิน', 'fuel', [['fk', 0.03]]],
  ['peat', 'พีต', 'fuel', [['mw', 0.05], ['t', 0.01]]],
  ['dung', 'มูลสัตว์แห้งและฟาง', 'fuel', [['gvhepsc', 0.012]]],
  ['stone', 'หินก่อสร้าง', 'stone', [['M', 0.06], [LANDNM, 0.02, 'm1']]],
  ['clay', 'ดินเหนียวและเครื่องปั้นดินเผา', 'stone', [['mp', 0.025], [LANDALL, 0.01, 'r']]],
  ['iron', 'แร่เหล็ก', 'ore', [['M', 0.1], ['mw', 0.01]], 1],
  ['copper', 'แร่ทองแดงและดีบุก', 'ore', [['M', 0.04], [LANDNM, 0.01, 'm1']], 1],
  ['wool', 'ขนแกะ', 'cloth', [['sc', 0.03], [LANDNM, 0.04, 'm1'], ['gh', 0.012]]],
  ['flax', 'ลินินและป่าน', 'cloth', [['ge', 0.02, 'f'], [LANDALL, 0.01, 'r']]],
  ['cotton', 'ฝ้าย', 'cloth', [['r', 0.06], ['v', 0.012, 'f']]],
  ['hides', 'หนังสัตว์', 'cloth', [['ghepvs', 0.012]]],
  ['coal', 'ถ่านหิน', 'fuel', [[LANDNM, 0.03, 'm1'], ['M', 0.012], ['mw', 0.01]], 1],
  ['oil', 'น้ำมันดิบ', 'mana', [['dy', 0.012], ['c', 0.004]], 1],
  ['whaleoil', 'น้ำมันวาฬและไขสัตว์ทะเล', 'fuel', [['Si', 0.01]]],
  ['silver', 'แร่เงิน', 'rare', [['M', 0.012]], 1],
  ['gold', 'ทองคำ', 'rare', [['M', 0.006], [LANDALL, 0.004, 'r']], 1],
  ['gems', 'เพชรและพลอย', 'rare', [['M', 0.004], ['j', 0.004], ['d', 0.002]], 1],
  ['furs', 'ขนสัตว์เมืองหนาว', 'luxury', [['fktn', 0.012]]],
  ['sugar', 'อ้อยและน้ำตาล', 'luxury', [['r', 0.05]]],
  ['cocoa', 'โกโก้และกาแฟ', 'luxury', [['r', 0.025], ['j', 0.004]]],
  ['wine', 'ไวน์และน้ำมันมะกอก', 'luxury', [['h', 0.012], ['s', 0.008, 'f'], ['g', 0.004, 'f']]],
  ['pearl', 'ไข่มุก', 'luxury', [['i', 0.02], ['Si', 0.002]]],
  ['silk', 'ไหม', 'luxury', [['o', 0.006], ['p', 0.008]]],
  ['incense', 'กำยานและยางหอม', 'luxury', [['c', 0.01], ['d', 0.006]]],
  ['dyes', 'สีย้อม (คราม ครั่ง)', 'luxury', [['v', 0.008], ['j', 0.006]]],
  ['finewood', 'ไม้หอมและไม้เนื้อดี', 'luxury', [['a', 0.012]]],
  ['relics', 'โบราณวัตถุจากซากเมืองเก่า', 'luxury', [['@ruin', 0.25], ['@harbour', 0.15]], 1],
];
const EGOODS = (BLANK ? EARTH_RULES.map(([id, name, cat, terms, far]) => [id, name, cat, null, 'earth', far, terms]) : [
  ['amber', 'รวงอำพัน', 'grain', H => 0.18 * SBA(H, 'gvh') + 0.14 * SBA(H, 'e') + 0.22 * SB(H, 'p') + 0.06 * SBA(H, 's'), 'flora'],   // rain-fed but the paddies (the climate)
  ['gloam', 'ข้าวหม่น', 'grain', H => 0.24 * (SZ(H, 'p', 'X') + SZ(H, 'p', 'G') + SZ(H, 'p', 'F')) + 0.05 * (SZ(H, 'm', 'X') + SZ(H, 'm', 'G')), 'cult'],
  ['blackwater', 'นิลวารี', 'grain', H => 0.09 * (H.rz.G || 0) + (H.zone === 'G' ? 0.05 * H.lake : 0), 'flora'],
  ['soulshape', 'ผลโซลด์เชป', 'grain', H => 0.12 * (H.hz.G || 0), 'king'],
  ['stonetuber', 'หัวมันหิน', 'grain', H => 0.03 * H.foot + 0.05 * SZ(H, 'M', 'H'), 'flora'],
  ['sunbeet', 'รากตะวัน', 'grain', H => 0.05 * SB(H, 'm') + 0.03 * SB(H, 'w') + 0.12 * (H.rz.S || 0) + 0.5 * H.pt.oasis, 'cult'],
  ['oasisfruit', 'อินทผลัมและผลไม้โอเอซิส', 'grain', H => 1 * H.pt.oasis, 'cult'],
  ['windgoblet', 'จอกเกล็ดวายุ', 'grain', H => 0.06 * SZ(H, 'mw', 'L') + 0.03 * (H.rz.L || 0) + (H.zone === 'L' ? 0.04 * H.lake : 0), 'cult'],
  ['waterrope', 'เชือกธารา', 'grain', H => 0.05 * SZ(H, 'mw', 'Q') + 0.04 * (H.rz.Q || 0), 'cult'],
  ['amberdairy', 'นม เนย และเนยแข็งโคอำพัน', 'protein', H => 0.045 * SZ(H, 'ghepv', 'X') + 0.015 * (SZ(H, 'ghepv', 'G') + SZ(H, 'ghepv', 'F')), 'flora'],
  ['dodod', 'ไข่และเนื้อโดโด้ด', 'protein', H => 0.028 * SB(H, 'gvhepsc'), 'flora'],
  ['bison', 'เนื้อไบซันยักษ์', 'protein', H => 0.07 * SZ(H, 'gscv', 'L'), 'flora'],
  ['cavehog', 'เนื้อหมูถ้ำจมูกผลึก', 'protein', H => 0.05 * SZ(H, 'M', 'H') + 0.015 * H.footH, 'flora'],
  ['drake', 'เนื้อและไข่กิ้งก่าศิลาทราย', 'protein', H => 0.03 * SZ(H, 'dc', 'S'), 'flora'],
  ['lakefish', 'ปลาน้ำจืดและปลาเค็ม', 'protein', H => 0.1 * H.lake + 0.025 * H.riv, 'cult'],
  ['seafish', 'ปลาและหอยทะเล', 'protein', H => 0.08 * H.sea, 'me'],
  ['dragonalgae', 'สาหร่ายเกล็ดมังกร', 'protein', H => 0.05 * H.arch, 'astral'],   // the farm plots of the Kaitiaki merfolk in the shallows of the isles (Astral)
  ['reindeer', 'เนื้อกวางเรนเดียร์เขี้ยว', 'protein', H => 0.035 * SB(H, 't') + 0.015 * SB(H, 'n'), 'cult'],
  ['game', 'เนื้อกวางและสัตว์ป่า', 'protein', H => 0.012 * SB(H, 'fokjaw'), 'cult'],
  ['phantomgame', 'เนื้อสัตว์เขตแดนผีที่ผ่านกรรมวิธี', 'protein', H => 0.04 * (H.hz.G || 0), 'cult'],
  ['seasalt', 'เกลือทะเล', 'salt', H => H.sea * (0.015 + 0.045 * H.south), 'cult'],
  ['desertsalt', 'เกลือทะเลทราย', 'salt', H => 0.012 * SB(H, 'd'), 'cult'],
  ['minesalt', 'เกลือเหมือง', 'salt', H => 0.012 * SZ(H, 'M', 'H') + 0.003 * SB(H, 'M'), 'cult', 1],
  ['phantomsalt', 'เกลือแร่เขตแดนผี', 'salt', H => 0.025 * (H.hz.G || 0), 'cult', 1],
  ['plainsalt', 'เกลือจากแหล่งธรรมชาติ', 'salt', H => 0.008 * SZ(H, 'scg', 'L') + 0.004 * SB(H, 'tn') + 0.006 * SB(H, 'y'), 'cult'],   // and the crust on the wastes' dry earth
  ['spice', 'เครื่องเทศเขตร้อน', 'herbs', H => 0.02 * SB(H, 'r'), 'you'],
  ['sulfur', 'กำมะถัน', 'herbs', H => 0.02 * SB(H, 'u'), 'you', 1],   // the wastes' sulfur fields (the user's ruling of 19 Nov 2026), burnt in the spore-ward pyres (culture file)   // the plantation colonies of the isles (the user's ruling of 18 Nov 2026)
  ['coriander', 'ผักชีดาริกา', 'herbs', H => 0.012 * H.edge, 'flora'],
  ['guardian', 'บุปผาอารักษ์', 'herbs', H => 0.006 * H.edge + 0.02 * H.hzAll, 'flora'],
  ['crimsonvein', 'เห็ดเส้นสีชาด', 'herbs', H => H.lake >= 3 ? 0.02 * SZ(H, 'gpm', 'X') : 0, 'cult'],
  ['cliffmush', 'เห็ดหอมผา', 'herbs', H => 0.01 * SB(H, 'M'), 'flora'],
  ['shadowflora', 'พฤกษาเงา', 'herbs', H => 0.012 * SB(H, 'a') + 0.04 * H.hzAll, 'flora'],
  ['bloodroot', 'รากโลหิตและน้ำผึ้งโลหิต', 'herbs', H => 0.008 * SB(H, 'goe'), 'cult'],
  ['bluebird', 'น้ำหวานปักษาสวรรค์สีคราม', 'herbs', H => 0.012 * H.edgeQ, 'flora'],
  ['spiritsap', 'ยางภูตพราย', 'herbs', H => 0.012 * SZ(H, 'a', 'Q'), 'flora'],
  ['pine', 'ไม้สน', 'timber', H => 0.13 * SB(H, 'f'), 'king'],
  ['hardwood', 'ไม้เนื้อแข็งป่าผลัดใบ', 'timber', H => 0.1 * SB(H, 'o'), 'me'],
  ['darkwood', 'ไม้ป่าดำ', 'timber', H => 0.1 * SB(H, 'k'), 'king'],
  ['swampwood', 'ไม้ป่าบึง', 'timber', H => 0.05 * SB(H, 'w'), 'king'],
  ['junglewood', 'ไม้ป่าดงดิบ', 'timber', H => 0.08 * SB(H, 'j'), 'me'],
  ['steelwood', 'ไม้เหล็ก', 'timber', H => 0.02 * H.forestM, 'flora'],
  ['charcoal', 'ถ่านไม้และฟืน', 'fuel', H => 0.07 * SB(H, 'fokwj'), 'me'],
  ['pitch', 'ยางสนและน้ำมันดิน', 'fuel', H => 0.03 * SB(H, 'fk'), 'me'],
  ['peat', 'พีต', 'fuel', H => 0.05 * SB(H, 'mw'), 'me'],
  ['dung', 'มูลสัตว์แห้งและฟาง', 'fuel', H => 0.012 * SB(H, 'gvhepsc'), 'me'],
  ['stone', 'หินก่อสร้าง', 'stone', H => 0.06 * NOQ(H, 'M') + 0.02 * H.footNQ, 'me'],
  ['clay', 'ดินเหนียวและเครื่องปั้นดินเผา', 'stone', H => 0.025 * SB(H, 'mp') + 0.01 * H.riv, 'me'],
  ['iron', 'แร่เหล็ก', 'ore', H => 0.1 * NOQ(H, 'M') + 0.05 * SZ(H, 'M', 'H'), 'king', 1],
  ['copper', 'แร่ทองแดงและดีบุก', 'ore', H => 0.05 * (SZ(H, 'M', 'L') + SZ(H, 'M', 'F') + SZ(H, 'M', 'G') + SZ(H, 'M', 'S') + SZ(H, 'M', 'I')), 'me', 1],
  ['stonewool', 'ขนแกะศิลา', 'cloth', H => 0.04 * H.foot, 'flora'],
  ['cotton', 'ฝ้าย', 'cloth', H => 0.06 * SB(H, 'r'), 'you'],
  ['bisonhide', 'หนังไบซันยักษ์', 'cloth', H => 0.03 * SZ(H, 'gscv', 'L'), 'flora'],
  ['hides', 'หนังและขนสัตว์เลี้ยง', 'cloth', H => 0.012 * SB(H, 'ghepvs'), 'me'],
  ['ironvine', 'เชือกเถาวัลย์เหล็ก', 'cloth', H => 0.012 * H.forestM, 'flora'],
  ['drakehide', 'หนังกิ้งก่าศิลาทราย', 'cloth', H => 0.012 * SZ(H, 'dc', 'S'), 'flora'],
  ['sephine', 'มานาเซฟไฟน์', 'mana', H => 0.08 * SZ(H, 'M', 'S') + 0.004 * SB(H, 'd'), 'astral', 1],
  ['manastone', 'ศิลาเวท', 'mana', H => 0.012 * SB(H, 'M') + 0.04 * SZ(H, 'M', 'H'), 'astral', 1],
  ['phantomstone', 'ศิลาเวทเขตแดนผี', 'mana', H => 0.05 * H.hzAll, 'astral', 1],
  ['floatstone', 'ศิลาลอย', 'mana', H => 0.6 * H.pt.pillar + 0.012 * H.peak, 'astral', 1],
  ['thunderreed', 'กกสายฟ้า', 'mana', H => 0.02 * SB(H, 'mw') + 0.008 * H.riv, 'flora'],
  ['moonantler', 'เขาผลึกกวางแสงจันทร์', 'mana', H => 0.02 * SZ(H, 'gpew', 'G') + 0.008 * SZ(H, 'a', 'Q'), 'flora'],
  ['silver', 'แร่เงิน', 'rare', H => 0.012 * SZ(H, 'M', 'H') + 0.006 * SZ(H, 'M', 'X'), 'king', 1],
  ['gold', 'ทองคำ', 'rare', H => 0.015 * SZ(H, 'M', 'S'), 'astral', 1],
  ['mithril', 'มิทริล', 'rare', H => 0.006 * SZ(H, 'M', 'H'), 'astral', 1],
  ['hyperium', 'ไฮพีเรียม', 'rare', H => 0.003 * SZ(H, 'M', 'H'), 'astral', 1],
  ['adamant', 'อะดาแมน', 'rare', H => 0.005 * SZ(H, 'M', 'S'), 'astral', 1],
  ['orichalcum', 'โอริคัลคุม', 'rare', H => 0.004 * SZ(H, 'M', 'S'), 'astral', 1],
  ['umbralite', 'แร่รัตติกาล', 'rare', H => 0.03 * (H.hz.G || 0), 'astral', 1],
  ['pearl', 'ไข่มุกเมขลา', 'luxury', H => 0.012 * H.lake + 0.02 * H.arch, 'flora'],   // lakes (flora file) and the Kaitiaki pearl beds of the isles (Astral)
  ['sugar', 'อ้อยและน้ำตาล', 'luxury', H => 0.05 * SB(H, 'r'), 'you'],
  ['cocoa', 'โกโก้', 'luxury', H => 0.025 * SB(H, 'r'), 'you'],
  ['furs', 'ขนสัตว์แดนเหนือ', 'luxury', H => 0.012 * (SZ(H, 'fktn', 'I') + SZ(H, 'fktn', 'B') + SZ(H, 'fktn', 'X') + SZ(H, 'fktn', 'H')), 'me'],
  ['finewood', 'ไม้เนื้อดีจากป่าบรรพกาล', 'luxury', H => 0.012 * SB(H, 'a'), 'king'],
  ['manasilk', 'ไหมมานา', 'luxury', H => 0.01 * SZ(H, 'a', 'Q'), 'flora'],
  ['relics', 'โบราณวัตถุจากซากเมืองเก่า', 'luxury', H => 0.25 * H.pt.ruin + 0.15 * H.pt.harbour, 'me', 1],
  ['bloodruby', 'ทับทิมโลหิต', 'luxury', H => 0.006 * (SZ(H, 'ghe', 'X') + SZ(H, 'ghe', 'G')), 'flora'],
  ['midnightbane', 'บุปผาราตรี', 'luxury', H => 0.003 * SB(H, 'k'), 'flora'],
]).map(([id, name, cat, f, src, far, terms]) => { const g = { id, name, cat, f, src, far: !!far, terms: terms ? terms.map(ecoTerm) : null }; if (g.terms) g.f = ecoRuleF(g); return g; });
// rules of the era: the Blood Moon church refuses mana stones of the phantom zones, so no city of the empire buys them;
// Saduin rations the ore of its arms and slows the sephine it sells the empire
const ERULE = {
  phantomstone: { ban: z => z === 'X', why: 'ศาสนจักรจันทร์โลหิตปฏิเสธศิลาเวทจากเขตแดนผี เมืองในจักรวรรดิจึงไม่ซื้อ' },
  adamant: { cap: 0.3, why: 'ซาดูอินคุมการส่งออกแร่เกรดอาวุธและเกราะ' },
  orichalcum: { cap: 0.3, why: 'ซาดูอินผูกขาดโอริคัลคุมและคุมการส่งออก' },
  sephine: { capTo: { X: 0.5 }, why: 'ยุคนี้ซาดูอินชะลอการส่งเซฟไฟน์ให้ลักซอน' },
};
// the goods of the workshops, named by the zone they are made in
const EMADE = {
  tools: { def: 'เครื่องมือและเครื่องใช้เหล็ก', H: 'เครื่องมือคนแคระ' },
  arms: { def: 'อาวุธและชุดเกราะ', X: 'ยุทโธปกรณ์ลักซอน', S: 'อาวุธพลังงานซาดูอิน', H: 'เหล็กกล้าและยุทโธปกรณ์คนแคระ' },
  tech: { def: 'เครื่องกลเวท', X: 'เครื่องจักรวิทยาการเวท', S: 'อุปกรณ์พลังเซฟไฟน์', H: 'เครื่องกลคนแคระ', G: 'เทคโนโลยีมานาโบราณของสวาลาน' },
  ships: { def: 'เรือ' },
  books: { def: 'หนังสือและตำรา', T: 'ตำราและม้วนคัมภีร์ของนครการศึกษา' },
};
if (BLANK) { EMADE.tools = { def: 'เครื่องมือและเครื่องใช้เหล็ก' }; EMADE.arms = { def: 'อาวุธและชุดเกราะ' }; EMADE.tech = { def: 'เครื่องจักรและเครื่องกล' }; EMADE.books = { def: 'หนังสือและตำรา' }; }
// what the lore says a city is known for: its output of a category times a factor
const ECANON = {
  luxonia: { tech: 1.8, arms: 1.6, why: 'โรงงานในลักซอนเนียผลิตเครื่องจักร ยุทโธปกรณ์ และสินค้าแปรรูปป้อนทั้งทวีป' },
  stovbert: { arms: 2, why: 'อาวุธขนาดใหญ่ของจักรวรรดิกระจุกอยู่ที่ลักซอนเนียกับสตอฟเบิร์ต' },
  estrekridge: { ships: 3, why: 'ศูนย์กลางการต่อเรือของจักรวรรดิ' },
  vidsaga: { ore: 1.6, rare: 1.8, tools: 1.4, why: 'สัมปทานเหมืองของคนแคระ แหล่งเหล็ก เหล็กกล้า มิทริล ไฮพีเรียม และเหมืองเงิน' },
  oakvil: { timber: 1.6, books: 2, why: 'ผู้ผลิตไม้รายใหญ่ที่สุดในแดนเหนือ มีห้องสมุดเป็นแหล่งความรู้' },
  oresol: { grain: 1.4, protein: 1.4, why: 'ที่ดินของตระกูลธอร์น อาหารจากที่นี่หล่อเลี้ยงจักรวรรดิ' },
  idovan: { grain: 1.4, protein: 1.3, why: 'ที่ดินของตระกูลธอร์น อาหารจากที่นี่หล่อเลี้ยงจักรวรรดิ' },
  stanther: { books: 5, why: 'นครการศึกษาบนยอดเขาสแตนเทอร์' },
  swalendaw: { tech: 1.5, herbs: 1.5, why: 'สวาลานส่งออกเทคโนโลยีมานาโบราณ ยาแปรธาตุ และสมุนไพรหายาก' },
  'sar-kadum': { tech: 1.4, arms: 1.5, why: 'อาวุธพลังงานและอุปกรณ์เซฟไฟน์ของซาดูอิน' },
};

// the phantom haze of the render, one value a hex (0 to 1), read from the fields image once it loads
const HZ = new Float32Array(N);
// the land each city works: the nearest city by steps over the ground, within its reach; a water hex at the edge is its fishery
// The mines, quarries and phantom diggings a city sends crews to reach further, to twice as far for a capital or a city:
// a hex no city farms goes to the nearest city within that reach, and yields its far goods at half the rate.
const EFAR = [2, 2, 1.5, 1.5, 1];
// Each hex goes to the city that reaches it first, a populous city reaching as if its hexes were shorter (v0.14.1: a great
// city hemmed in by towns used to work no more land than they did, however many it had to feed). c.claim is that weight.
const HKEY = new Float32Array(N);
function eHinterland(cities, far) {
  const own = new Int32Array(N).fill(-1), dist = new Float32Array(N).fill(1e9);
  HN = 0; const s = ++stampN; HKEY.fill(1e9);
  cities.forEach((c, k) => { const h = c.h; if (h < 0) return; if (0 < HKEY[h]) { dist[h] = 0; HKEY[h] = 0; own[h] = k; SEENS[h] = s; hpush(h, 0); } });
  while (HN) {
    const u = hpop(); if (DONES[u] === s) continue; DONES[u] = s;
    if (isW(eff(u))) continue;                                     // water is claimed but not crossed
    const k = own[u], reach = (cities[k].reach || EREACH[cities[k].ki]) * (far ? EFAR[cities[k].ki] : 1), w = cities[k].claim || 1;
    for (let j = 0; j < 6; j++) {
      const v = NB[u * 6 + j]; if (v < 0 || DONES[v] === s) continue;
      const g = dist[u] + (eff(v) === 'M' ? 1.5 : 1); if (g > reach) continue;
      const key = g / w; if (key < HKEY[v]) { HKEY[v] = key; dist[v] = g; own[v] = k; SEENS[v] = s; hpush(v, key); }
    }
  }
  return { own, dist };
}
const FOREST = new Set(['f', 'o', 'k', 'a', 'j', 'w']);
function eStats(cities, own, wfn) {
  const Hs = cities.map(c => ({ gx: {}, b: {}, ba: {}, bz: {}, rz: {}, hz: {}, hzAll: 0, lake: 0, sea: 0, arch: 0, riv: 0, foot: 0, footH: 0, footNQ: 0, edge: 0, edgeQ: 0, forestM: 0, peak: 0,
    pt: { ruin: 0, harbour: 0, pillar: 0, oasis: 0 }, south: 0, n: 0, hexes: 0, zone: c.zone }));
  const wOf = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const k = own[i]; if (k < 0) continue;
    const H = Hs[k], w = wfn(i, k), b = eff(i), z = ZO[i];
    wOf[i] = w; H.hexes++;
    if (RULEIX[b]) ecoRuleHex(H, i, b, w);
    if (b === 'L') { H.lake += w; continue; }
    if (isSea(b)) { H.sea += w; if (b === 'i') H.arch += w; continue; }
    H.b[b] = (H.b[b] || 0) + w; H.bz[b + z] = (H.bz[b + z] || 0) + w; H.n += w; H.south += w * CY[i] / G.h;
    if (b === 'g' || b === 'v' || b === 'h' || b === 'e' || b === 's') H.ba[b] = (H.ba[b] || 0) + w * CL_ARR.f[i];
    if ((RV[i] === '1' && shownAt(i)) || URVH.has(i)) { H.riv += w; H.rz[z] = (H.rz[z] || 0) + w; }
    if (HZ[i] > 0.02) { H.hzAll += w * HZ[i]; H.hz[z] = (H.hz[z] || 0) + w * HZ[i]; }
    let nM = 0, nOpen = 0;
    for (let j = 0; j < 6; j++) { const v = NB[i * 6 + j]; if (v < 0) continue; const e = eff(v); if (e === 'M') nM++; else if (!isW(e) && !FOREST.has(e)) nOpen++; }
    if (b === 'M') { if (nM >= 5) H.peak += w; }
    else if (nM) { H.foot += w; if (z === 'H') H.footH += w; if (z !== 'Q') H.footNQ += w; }
    if (FOREST.has(b)) { if (nOpen) { H.edge += w; if (z === 'Q') H.edgeQ += w; } if (nM) H.forestM += w; }
  }
  for (const p of visiblePoints()) { const h = p.h != null ? p.h : hexAt(p.x, p.y); if (h >= 0 && own[h] >= 0 && Hs[own[h]].pt[p.k] != null) Hs[own[h]].pt[p.k] += wOf[h]; }
  for (const H of Hs) H.south = H.n ? H.south / H.n : 0.5;
  return Hs;
}

// ---------- the ways goods travel ----------
// boats: the sea and the lakes, and the rivers wide enough for a barge (the user's big rivers and rivers, and the map's wider ones);
// caravans: any land, cheap on a road and dear off it. A load changes from one to the other at a city's quay for little,
// anywhere else for more.
const NAVW = 2.2;
const WATR = new Uint8Array(N), NAVR = new Uint8Array(N), RIVM = new Uint8Array(N), PORTZ = new Uint8Array(N);
const NPX = new Float32Array(N), NPY = new Float32Array(N), NPC = new Uint16Array(N);
function eLink(u, v) { const k = nbIndex(u, v); if (k < 0) return; RIVM[u] |= 1 << k; RIVM[v] |= 1 << REVK[k]; }
function eRiverRun(xs, ys, runs) {                // one navigable stretch: the hexes it passes, linked in order
  let prev = -1; const hs = [];
  for (let j = 0; j < xs.length; j++) {
    const h = hexAt(xs[j], ys[j]); if (h < 0) { prev = -1; continue; }
    if (!WATR[h]) { NAVR[h] = 1; NPX[h] += xs[j]; NPY[h] += ys[j]; NPC[h]++; }
    if (prev >= 0 && prev !== h) eLink(prev, h);
    if (prev !== h) hs.push(h);
    prev = h;
  }
  if (hs.length) runs.push({ hs, a: [xs[0], ys[0]], b: [xs[xs.length - 1], ys[ys.length - 1]] });
}
function eWaterways() {
  WATR.fill(0); NAVR.fill(0); RIVM.fill(0); NPX.fill(0); NPY.fill(0); NPC.fill(0);
  for (let i = 0; i < N; i++) if (isW(eff(i))) WATR[i] = 1;
  const runs = [];
  for (const r of BRIV) {
    if (r.s || r.w < NAVW) continue;
    let xs = [], ys = [];
    for (let j = r.s0; j < r.s1; j++) {
      if (sampleOff(j)) { if (xs.length > 1) eRiverRun(xs, ys, runs); xs = []; ys = []; continue; }
      xs.push(BS.x[j]); ys.push(BS.y[j]);
    }
    if (xs.length > 1) eRiverRun(xs, ys, runs);
  }
  for (const r of ED.rivers) {
    if (r.kind !== 'big' && r.kind !== 'river') continue;
    const d = RDER.get(r.id); if (!d) continue;
    const xs = [], ys = [];                          // the drawn line, half a unit apart, so no hex on it is skipped
    for (let i = 0; i < d.q.length - 1; i++) { const a = d.q[i], b = d.q[i + 1], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.5)); for (let s = 0; s < n; s++) { xs.push(a[0] + (b[0] - a[0]) * s / n); ys.push(a[1] + (b[1] - a[1]) * s / n); } }
    const e = d.q[d.q.length - 1]; xs.push(e[0]); ys.push(e[1]);
    eRiverRun(xs, ys, runs);
  }
  for (let i = 0; i < N; i++) if (NPC[i]) { NPX[i] /= NPC[i]; NPY[i] /= NPC[i]; } else { NPX[i] = CX[i]; NPY[i] = CY[i]; }
  // a river that ends a step short of the sea, a lake or another river flows on into it: each end of a stretch is joined to the
  // nearest water or navigable river beside it, so a mouth reaches the sea and a tributary its main stream
  for (const r of runs) {
    const own = new Set(r.hs);
    for (const [h, p] of [[r.hs[0], r.a], [r.hs[r.hs.length - 1], r.b]]) {
      if (h < 0 || WATR[h]) continue;
      let best = -1, bd = 1e9;
      for (let k = 0; k < 6; k++) {
        const v = NB[h * 6 + k]; if (v < 0 || own.has(v) || !(WATR[v] || NAVR[v])) continue;
        const d = Math.hypot((NAVR[v] ? NPX[v] : CX[v]) - p[0], (NAVR[v] ? NPY[v] : CY[v]) - p[1]); if (d < bd) { bd = d; best = v; }
      }
      if (best >= 0 && bd <= 1.6 * DY) eLink(h, best);
    }
  }
  // how far each water hex lies from the shore: boats keep to the coast, so their lanes gather along it
  SHORE.fill(0);
  let ring = [];
  for (let i = 0; i < N; i++) if (WATR[i]) for (let k = 0; k < 6; k++) { const v = NB[i * 6 + k]; if (v >= 0 && !WATR[v]) { SHORE[i] = 1; ring.push(i); break; } }
  for (let d = 2; d <= 3; d++) { const nx = []; for (const u of ring) for (let k = 0; k < 6; k++) { const v = NB[u * 6 + k]; if (v >= 0 && WATR[v] && !SHORE[v]) { SHORE[v] = d; nx.push(v); } } ring = nx; }
  for (let i = 0; i < N; i++) if (WATR[i] && !SHORE[i]) SHORE[i] = 4;
}
const SHORE = new Uint8Array(N);
const WCOST = { S: [0, 0.1, 0.15, 0.2, 0.25], L: [0, 0.11, 0.16, 0.21, 0.26] };   // a lane one hex off the shore is the cheapest
WCOST.i = WCOST.S;                                  // the archipelago: sheltered channels, as cheap as the open sea
// The shipping lanes: on each sea and each lake the boats keep to one network joining its harbours and river mouths. It grows
// from one harbour, each time reaching out to the nearest harbour not yet joined, so every load on that water shares its lanes.
const LANE = new Uint8Array(N), LANEH = new Uint8Array(N), WCOMP = new Int32Array(N);
function eLanes(cities) {
  LANE.fill(0); LANEH.fill(0); WCOMP.fill(-1);
  let nc = 0;
  for (let i = 0; i < N; i++) {                     // the bodies of water, one number each
    if (!WATR[i] || WCOMP[i] >= 0) continue;
    const st = [i]; WCOMP[i] = nc;
    while (st.length) { const u = st.pop(); for (let k = 0; k < 6; k++) { const v = NB[u * 6 + k]; if (v >= 0 && WATR[v] && WCOMP[v] < 0) { WCOMP[v] = nc; st.push(v); } } }
    nc++;
  }
  const term = new Set();
  for (const c of cities) {                         // each city's quay: its nearest water hex on every body of water beside it
    const best = new Map();
    for (const u of [c.h, ...[0, 1, 2, 3, 4, 5].map(k => NB[c.h * 6 + k])]) {
      if (u < 0 || WATR[u]) continue;
      for (let k = 0; k < 6; k++) { const v = NB[u * 6 + k]; if (v < 0 || !WATR[v]) continue; const d = Math.hypot(CX[v] - c.x, CY[v] - c.y), b = best.get(WCOMP[v]); if (!b || d < b[1]) best.set(WCOMP[v], [v, d]); }
    }
    for (const [v] of best.values()) term.add(v);
  }
  for (let i = 0; i < N; i++) if (NAVR[i] && RIVM[i]) for (let k = 0; k < 6; k++) if (RIVM[i] >> k & 1) { const v = NB[i * 6 + k]; if (v >= 0 && WATR[v]) term.add(v); }   // river mouths
  const left = new Set(term), dist = new Float32Array(N), from = new Int32Array(N), seen = new Uint32Array(N), done = new Uint32Array(N);
  let stp = 0;
  while (left.size) {
    const seed = left.values().next().value, comp = WCOMP[seed], tree = [seed];
    left.delete(seed); LANEH[seed] = 1;
    for (;;) {                                       // from the whole network out to the nearest harbour not yet on it
      const s = ++stp; HN2 = 0; let hit = -1;
      for (const t of tree) { seen[t] = s; dist[t] = 0; from[t] = -1; hpush2(t, 0); }
      while (HN2) {
        const u = hpop2(); if (done[u] === s) continue; done[u] = s;
        if (left.has(u)) { hit = u; break; }
        for (let k = 0; k < 6; k++) {
          const v = NB[u * 6 + k]; if (v < 0 || !WATR[v] || WCOMP[v] !== comp || done[v] === s) continue;
          const nd = dist[u] + WCOST[eff(v)][SHORE[v]];
          if (seen[v] !== s || nd < dist[v]) { seen[v] = s; dist[v] = nd; from[v] = u; hpush2(v, nd); }
        }
      }
      if (hit < 0) break;
      left.delete(hit);
      for (let v = hit; v >= 0 && !LANEH[v]; v = from[v]) {   // the way back becomes a lane
        const w = from[v]; LANEH[v] = 1; tree.push(v);
        if (w >= 0) { const k = nbIndex(v, w); if (k >= 0) { LANE[v] |= 1 << k; LANE[w] |= 1 << REVK[k]; } }
      }
    }
  }
}
const CAR = { g: 2.4, s: 2.4, v: 2.4, h: 2.4, e: 2.4, p: 2.6, r: 2.5, y: 2.6, u: 4, c: 3, d: 4.2, t: 4.5, n: 6, f: 3.6, o: 3.4, k: 5, j: 6, w: 6, m: 5.5, a: 3.6, M: 9 };
function caravanStep(u, k, v) {
  const x = EX[u * 6 + k];
  if (RDE.has(u * 6 + k)) { const lv = Math.min(RDH[u], RDH[v]); return lv >= 3 ? 0.6 : lv === 2 ? 0.75 : 0.95; }
  const b = eff(v); let c = (b === 'a' || ZO[v] === 'J') && !NEARC[v] ? 30 : CAR[b] || 3;
  return c + (x & 2 ? 3 : x & 1 ? 0.3 : 0);
}
const ESEA = 0.11, ELAKE = 0.13, ERIV = 0.22, EQUAY = 0.5, EBANK = 3, EMAX = 320;
const EWILDR = 12;   // a river through the Florans' jungle away from the towns: boats creep, and pay for it
// Victoria 3's price rule: price = base × (1 + 0.75 × clamp((buy − sell) / min(buy, sell), −1, 1)), here as a share of the base
const eShare = (buy, sell) => { const m = Math.min(buy, sell); if (m <= 1e-6) return buy > sell + 1e-6 ? 1.75 : sell > buy + 1e-6 ? 0.25 : 1; return 1 + 0.75 * Math.max(-1, Math.min(1, (buy - sell) / m)); };
const EKAPPA = 0.078;   // a unit of travel cost, in base value per load of bulk 1: the continent trades as much as under the old range rule,
                        // and the price gaps now decide who trades with whom
const G2 = new Float32Array(N * 2), D2 = new Uint32Array(N * 2), S2 = new Uint32Array(N * 2);
const HP2 = new Int32Array(N * 14), HF2 = new Float32Array(N * 14);
let HN2 = 0, st2 = 0;
function hpush2(id, f) { let i = HN2++; while (i > 0) { const p = (i - 1) >> 1; if (HF2[p] <= f) break; HP2[i] = HP2[p]; HF2[i] = HF2[p]; i = p; } HP2[i] = id; HF2[i] = f; }
function hpop2() {
  const top = HP2[0], lid = HP2[--HN2], lf = HF2[HN2]; let i = 0;
  for (;;) { let c = 2 * i + 1; if (c >= HN2) break; if (c + 1 < HN2 && HF2[c + 1] < HF2[c]) c++; if (HF2[c] >= lf) break; HP2[i] = HP2[c]; HF2[i] = HF2[c]; i = c; }
  if (HN2) { HP2[i] = lid; HF2[i] = lf; }
  return top;
}
// every way on from one state: by caravan to the next land hex, onto a boat at a river or a lane, along a lane or a river,
// and ashore again. near, for a line by water, keeps the caravans to the ground beside its own cities.
function eNext(t, mode, near, f) {
  if (AVOIDZ) { const f0 = f, Z = AVOIDZ; const zx = TU('rivalStep'); f = (s, x) => f0(s, Z[s >> 1] ? x * zx : x); }
  const h = t >> 1;
  if ((t & 1) === 0) {                               // on land, with a caravan
    for (let k = 0; k < 6; k++) { const v = NB[h * 6 + k]; if (v < 0 || WATR[v] || (near && !near[v])) continue; f(v * 2, caravanStep(h, k, v)); }
    if (mode !== 'land') {
      const q = PORTZ[h] ? EQUAY : EBANK;
      if (NAVR[h]) f(h * 2 + 1, q);
      for (let k = 0; k < 6; k++) { const v = NB[h * 6 + k]; if (v >= 0 && LANEH[v]) f(v * 2 + 1, q); }   // boats wait on the lanes
    }
  } else {                                           // afloat
    const wet = WATR[h];
    for (let k = 0; k < 6; k++) {
      const v = NB[h * 6 + k]; if (v < 0) continue;
      if (wet && WATR[v] && (LANE[h] >> k & 1)) f(v * 2 + 1, WCOST[eff(v)][SHORE[v]]);
      else if (RIVM[h] >> k & 1) f(v * 2 + 1, ZO[v] === 'J' && !NEARC[v] ? ERIV * EWILDR : ERIV);
    }
    if (!wet) f(h * 2, PORTZ[h] ? EQUAY : EBANK);
    else for (let k = 0; k < 6; k++) { const v = NB[h * 6 + k]; if (v >= 0 && !WATR[v]) f(v * 2, PORTZ[v] ? EQUAY : EBANK); }
  }
}
// what one step from a state to the next costs, and what a whole way costs
function eStep(a, b) { let c = Infinity; eNext(a, 'auto', null, (t, x) => { if (t === b && x < c) c = x; }); return c; }
function ePathCost(st) { const z0 = AVOIDZ; AVOIDZ = null; try { return ePathCost0(st); } finally { AVOIDZ = z0; } }
function ePathCost0(st) { let c = 0; for (let i = 0; i + 1 < st.length; i++) c += eStep(st[i], st[i + 1]); return c; }
// the cheapest way from one city to every hex, on land (state 2h) or afloat (2h+1); prev, when given, keeps the way back
function eSearch(src, prev) {
  const s = ++st2; HN2 = 0; let g = 0, from = -1;
  const go = (t, c) => { const x = g + c; if (x > EMAX) return; if (S2[t] !== s || x < G2[t]) { S2[t] = s; G2[t] = x; if (prev) prev[t] = from; hpush2(t, x); } };
  S2[src * 2] = s; G2[src * 2] = 0; if (prev) prev[src * 2] = -1; hpush2(src * 2, 0);
  while (HN2) { const t = hpop2(); if (D2[t] === s) continue; D2[t] = s; g = G2[t]; from = t; eNext(t, 'auto', null, go); }
  return s;
}
// the same from many cities at once: every state learns which of them is nearest (own) and the way back to it (prev).
// att marks the states lines already run through: a step onto one costs EATTK of its price, so a new line joins them.
function eMulti(srcs, att, prev, own) {
  const s = ++st2; HN2 = 0; let g = 0, from = -1, ow = -1;
  const go = (t, c) => { const x = g + (att && att[t] ? c * EATTK : c); if (x > EMAX) return; if (S2[t] !== s || x < G2[t]) { S2[t] = s; G2[t] = x; prev[t] = from; own[t] = ow; hpush2(t, x); } };
  for (const [t, o] of srcs) { if (S2[t] === s) continue; S2[t] = s; G2[t] = 0; prev[t] = -1; own[t] = o; hpush2(t, 0); }
  while (HN2) { const t = hpop2(); if (D2[t] === s) continue; D2[t] = s; g = G2[t]; from = t; ow = own[t]; eNext(t, 'auto', null, go); }
  return s;
}

// ---------- the trade network ----------
// Goods travel only along trade lines between cities, and every line ends at a city. Each city has a rank as a centre of
// distribution: 3 a great centre (the capitals and the lore's trading centres), 2 a regional centre (a city), 1 a market town,
// 0 none (villages and forts); the user can give any city any rank. The centres of rank 2 and up are joined by main lines, two
// of them directly unless a third lies between them, and the great centres to each other by trunk lines as well. Every smaller
// place sends its goods to the nearest centre above it, a town to a regional centre, a village or a fort to the nearest market
// town or higher, unless the user names its centre: so each centre gathers the lines around it and sends the goods on to the
// places below it. Lines gather too: while the network is laid, a way along a line already there costs less, so two lines
// that would run side by side run as one. Each line keeps to the cheapest way for its kind: by boat and caravan as suits
// (auto), by water, or by land.
// lines the lore asks for, laid by the page between the two cities it names, kept like the page's other lines (the user can bend,
// retype or remove them): the ore of Handerlaw comes down to the ore pier outside the main wall of Luxonia (the plan of Luxonia,
// point 31) from Krogan, the user's town under the Handerlaw hills (the user asked for the line on 18 Nov 2026)
const ELORE = [
  { a: 'cmwln045b63rdx', b: 'luxonia', why: 'ขนแร่จากฮันเดอลอวลงท่าแร่นอกกำแพงหลักของลักซอนเนีย' },
  // the user's request of 20 Nov 2026 (make goods cheaper, levers 5, 6 and 10): the grain of the paddies along the great river goes down
  // to the town at its mouth, Grandfall's grain goes by sea along the east coast to the frontier's port (from Kerten, the user's village,
  // the richest in grain that could not sell), and Grandfall's rice market sends rice to the capital of the empire that annexed it,
  // whose settlers opened the three-river plain as a source of food (Astral)
  { a: 'sp-kavxos', b: 'sp-skivdorn', why: 'ข้าวจากนาริมแม่น้ำใหญ่ล่องเรือลงไปท่าสคิฟดอร์นที่ปากแม่น้ำ' },
  { a: 'cmwlydujyo6637', b: 'sp-urmharth', why: 'ข้าวจากแกรนด์ฟอลลงเรือเลียบชายฝั่งตะวันออกไปท่าอูร์มฮาร์ธ เลี้ยงนิคมของแนวบุกเบิก' },
  { a: 'sp-akaharth', b: 'luxonia', why: 'ตลาดข้าวอกาฮาร์ธส่งข้าวขึ้นไปลักซอนเนีย ที่ราบลุ่มแม่น้ำสามสายเป็นแหล่งอาหารของจักรวรรดิ' },
];
const loreOf = L => ELORE.find(e => linkKey(e.a, e.b) === L.id);
const EHUB = {
  luxonia: 'ลักซอนเนียคือจุดศูนย์กลางของเส้นทางการค้าทางบกและทางน้ำ',
  estrekridge: 'ตระกูลเมอร์ซิเออร์ที่เอสเตรเคริดจ์คุมกองเรือพาณิชย์ที่ใหญ่ที่สุดและผูกขาดเส้นทางการค้าทางทะเล',
  'sp-brass': 'นครทองเหลืองคือศูนย์กลางการปกครองและการค้าที่สำคัญที่สุดของสหพันธรัฐฮันเดอลอว',
};
const LMODE = { auto: 'อัตโนมัติ', water: 'ทางน้ำ', land: 'คาราวาน' };
const RANKN = ['ไม่เป็นศูนย์', 'ศูนย์ย่อย', 'ศูนย์ภาค', 'ศูนย์หลัก'];
// regional centres (rank 2) that are towns (the user's request of 20 Nov 2026, lever 6): the confluence of the great river, where the
// boats of the wastes meet, gathers the towns of the southern wastes, and the confluence of the western river those of the west, which
// the nearest-centre rule had sent to a city of Handerlaw, a city of Saduin and a port across the sea
const EHUB2 = {
  'sp-kavxos': 'จุดบรรจบของแม่น้ำใหญ่กลางดินแดนรกร้าง เรือข้าวขึ้นฝั่งที่นี่แล้วกระจายไปทั่วดินแดนรกร้างตอนใต้',
  'sp-baotarn': 'จุดบรรจบของลำน้ำฝั่งตะวันตก เมืองริมแม่น้ำของดินแดนรกร้างฝั่งตะวันตกส่งของผ่านที่นี่',
};
const autoRank = c => { const k = c.lk || c.kind; return EHUB[c.id] || k === 'capital' ? 3 : EHUB2[c.id] || k === 'city' ? 2 : k === 'town' ? 1 : 0; };
const hubRank = c => ED.hubs.has(c.id) ? ED.hubs.get(c.id) : autoRank(c);
const linkKey = (a, b) => 'a:' + [a, b].sort().join('~');
const plainLink = L => ({ id: L.id, a: L.a, b: L.b, mode: LMODE[L.mode] ? L.mode : 'auto', via: (L.via || []).map(p => [r1(p[0]), r1(p[1])]) });
const EATT = new Uint8Array(N * 2), EATTK = 0.7;   // the states the lines laid so far run through
const eWalk = (prev, t) => { const out = []; let g = 0; while (t >= 0 && g++ < N * 2) { out.push(t); t = prev[t]; } return out.reverse(); };
// the cheapest way from one state to another for one kind of line: by land only, by water (land only near its own cities), or both
const EPV = new Int32Array(N * 2);
function ePath(src, dst, mode, near, att) { AVOIDZ = ECOPAIR ? ecoAvoid(ECOPAIR[0], ECOPAIR[1]) : ecoAvoid(src >> 1, dst >> 1); try { return ePath0(src, dst, mode, near, att); } finally { AVOIDZ = null; } }
function ePath0(src, dst, mode, near, att) {
  if (src < 0 || dst < 0) return null;
  if (src === dst) return { states: [src], cost: 0 };
  const s = ++st2; HN2 = 0; let g = 0, from = -1;
  const go = (t, c) => { const x = g + (att && att[t] ? c * EATTK : c); if (S2[t] !== s || x < G2[t]) { S2[t] = s; G2[t] = x; EPV[t] = from; hpush2(t, x); } };
  S2[src] = s; G2[src] = 0; EPV[src] = -1; hpush2(src, 0);
  while (HN2) { const t = hpop2(); if (D2[t] === s) continue; D2[t] = s; if (t === dst) break; g = G2[t]; from = t; eNext(t, mode, near, go); }
  if (D2[dst] !== s) return null;
  const out = []; for (let t = dst; t !== -1; t = EPV[t]) out.push(t);
  const states = out.reverse();
  return { states, cost: att || AVOIDZ ? ePathCost(states) : G2[dst] };   // a line pays the full price of its way, joined to others or not
}
function eViaState(p, mode) {                      // where a waypoint puts the line: on a boat if water is right there, else on land
  const h0 = hexAt(p[0], p[1]); if (h0 < 0) return -1;
  if (mode !== 'land') {
    let best = -1, bd = 1e9, ring = [h0]; const seen = new Set(ring);
    for (let r = 0; r <= 3; r++) {
      for (const v of ring) if (LANEH[v] || NAVR[v]) { const d = Math.hypot((NAVR[v] ? NPX[v] : CX[v]) - p[0], (NAVR[v] ? NPY[v] : CY[v]) - p[1]); if (d < bd) { bd = d; best = v; } }
      const nx = []; for (const u of ring) for (let k = 0; k < 6; k++) { const v = NB[u * 6 + k]; if (v >= 0 && !seen.has(v)) { seen.add(v); nx.push(v); } } ring = nx;
    }
    if (best >= 0 && (mode === 'water' || bd < 0.8 * DY)) return best * 2 + 1;
    if (mode === 'water') return -1;
  }
  const h = landHex(h0); return h < 0 ? -1 : h * 2;
}
function eRoute(o, A, B, att = EATT) { ECOPAIR = [A.h, B.h]; try { return eRoute0(o, A, B, att); } finally { ECOPAIR = null; } }
function eRoute0(o, A, B, att) {             // a line laid by the user's choice: its kind and its waypoints, leg by leg
  const mode = LMODE[o.mode] ? o.mode : 'auto';
  let near = null;
  if (mode === 'water') {                          // by water: the caravan only carries the goods to and from the quays
    near = new Uint8Array(N);
    for (const h0 of [A.h, B.h]) { let ring = [h0]; near[h0] = 1; for (let r = 0; r < 2; r++) { const nx = []; for (const u of ring) for (let k = 0; k < 6; k++) { const v = NB[u * 6 + k]; if (v >= 0 && !near[v] && !WATR[v]) { near[v] = 1; nx.push(v); } } ring = nx; } }
  }
  const stops = [A.h * 2, ...(o.via || []).map(p => eViaState(p, mode)), B.h * 2];
  if (stops.some(t => t < 0)) return null;
  let states = [], cost = 0; const legs = [];
  for (let i = 0; i < stops.length - 1; i++) {
    const r = ePath(stops[i], stops[i + 1], mode, near, att); if (!r) return null;
    legs.push(Math.max(0, states.length - 1));
    states = states.length ? states.concat(r.states.slice(1)) : r.states; cost += r.cost;
  }
  return { states, cost, legs };
}
function eGeo(states, A, B) {                      // the drawn line: runs afloat and runs on land, each smoothed, joined end to end
  if (!states || !states.length) return null;
  const pos = t => { const h = t >> 1; return (t & 1) && !WATR[h] ? [NPX[h], NPY[h]] : [CX[h], CY[h]]; };
  const P = states.map(pos); P[0] = [A.x, A.y];
  if (P.length === 1) P.push([B.x, B.y]); else P[P.length - 1] = [B.x, B.y];
  const runs = []; let cur = null;
  for (let i = 0; i < P.length - 1; i++) {
    const a = states[Math.min(i, states.length - 1)], b = states[Math.min(i + 1, states.length - 1)], wet = !!((a & 1) || (b & 1));   // a quay counts with the water
    if (!cur || cur.wet !== wet) { if (cur) runs.push(cur); cur = { wet, p: [P[i]] }; }
    cur.p.push(P[i + 1]);
  }
  if (cur) runs.push(cur);
  for (const r of runs) r.q = r.p.length > 2 ? smoothLine(r.p) : r.p;
  return { runs, raw: P, bb: bbox(runs.flatMap(r => r.q), 6) };
}
function eLinkOf(L, cities, ia, ib, r) {
  const A = cities[ia], B = cities[ib];
  Object.assign(L, { ia, ib, states: r ? r.states : null, legs: r ? r.legs || [0] : [0], cost: r ? Math.max(0.05, r.cost) : Infinity, fail: !r,
    vol: 0, fwd: 0, back: 0, goods: new Map(), cats: new Map(), cdir: new Map(), wet: 0, dry: 0, road: 0 });
  if (r) for (let i = 0; i < r.states.length - 1; i++) {
    const a = r.states[i], b = r.states[i + 1]; if ((a & 1) !== (b & 1)) continue;
    if (a & 1) L.wet++; else { L.dry++; const k = nbIndex(a >> 1, b >> 1); if (k >= 0 && RDE.has((a >> 1) * 6 + k)) L.road++; }
  }
  L.geo = r ? eGeo(r.states, A, B) : null;
  return L;
}
function eNetwork(cities) {
  const n = cities.length, idx = new Map(cities.map((c, k) => [c.id, k])), out = [], tiers = new Map();
  EATT.fill(0);
  cities.forEach(c => { c.rank = hubRank(c); c.home = -1; c.chosen = false; });
  let top = n ? Math.max(...cities.map(c => c.rank)) : 0;
  if (n && top <= 0) { let b = 0; cities.forEach((c, k) => { if (c.pop > cities[b].pop) b = k; }); cities[b].rank = 1; top = 1; }   // a map of villages: the biggest gathers the rest
  const meshMin = Math.min(2, top);
  cities.forEach(c => { c.hub = c.rank > 0; c.stop = c.rank >= 2; c.mesh = c.rank >= meshMin; });
  const mark = st => { for (const t of st) EATT[t] = 1; };
  const userPair = new Set();                      // two cities the user joined by a line of their own need no line of the page's
  for (const [id, o] of ED.tlinks) if (!id.startsWith('a:') && !ED.tlhid.has(id) && o.a !== o.b && idx.has(o.a) && idx.has(o.b)) userPair.add(linkKey(o.a, o.b));
  const want = (ia, ib, tier) => {
    const id = linkKey(cities[ia].id, cities[ib].id); if (tiers.has(id)) return null;
    tiers.set(id, tier);
    return ED.tlhid.has(id) || ED.tlinks.has(id) || userPair.has(id) ? null : id;   // removed by the user, laid below as the user has it, or replaced
  };
  const lay = (id, ia, ib, tier, r) => { out.push(eLinkOf({ id, a: cities[ia].id, b: cities[ib].id, mode: 'auto', via: [], tier, auto: true, own: false }, cities, ia, ib, r)); if (r) mark(r.states); };
  // the centres: what it costs between each two of them, both ways averaged
  const mesh = [];
  cities.forEach((c, k) => { if (c.mesh) mesh.push(k); });
  const M = mesh.length, T = mesh.map(a => { const s = eSearch(cities[a].h, null); return mesh.map(b => S2[cities[b].h * 2] === s ? G2[cities[b].h * 2] : Infinity); });
  const DM = T.map((row, x) => row.map((a, y) => { const b = T[y][x]; return isFinite(a) && isFinite(b) ? (a + b) / 2 : Math.min(a, b); }));
  const pairs = [];
  for (let x = 0; x < M; x++) for (let y = x + 1; y < M; y++) {   // two centres directly, unless a third lies between them
    const d = DM[x][y]; if (!isFinite(d)) continue;
    let between = false; for (let z = 0; z < M && !between; z++) if (z !== x && z !== y && Math.max(DM[x][z], DM[z][y]) < d) between = true;
    if (!between) pairs.push([d, x, y, 'main']);
  }
  const big = []; for (let x = 0; x < M; x++) if (cities[mesh[x]].rank >= 3) big.push(x);
  const joined = new Set(pairs.map(p => p[1] * M + p[2]));
  for (let i = 0; i < big.length; i++) for (let j = i + 1; j < big.length; j++) {   // the great centres to each other, past the regional ones
    const x = big[i], y = big[j], d = DM[x][y]; if (!isFinite(d) || joined.has(x * M + y)) continue;
    if (big.some(z => z !== x && z !== y && Math.max(DM[x][z], DM[z][y]) < d)) continue;
    pairs.push([d, x, y, 'trunk']);
  }
  pairs.sort((p, q) => (p[3] === q[3] ? 0 : p[3] === 'main' ? -1 : 1) || p[0] - q[0]);   // the short main lines first, so the long ones join them
  for (const [, x, y, tier] of pairs) {
    const ia = mesh[x], ib = mesh[y], id = want(ia, ib, tier); if (!id) continue;
    lay(id, ia, ib, tier, ePath(cities[ia].h * 2, cities[ib].h * 2, 'auto', null, EATT));
  }
  for (const e of ELORE) {                         // the lines the lore asks for, before the smaller places join, so they can join them
    const ia = idx.get(e.a), ib = idx.get(e.b); if (ia == null || ib == null || ia === ib) continue;
    const id = want(ia, ib, 'lore'); if (id) lay(id, ia, ib, 'lore', ePath(cities[ia].h * 2, cities[ib].h * 2, 'auto', null, EATT));
  }
  // the smaller places, rank by rank down: each to the centre the user chose for it, or to the nearest centre above it
  const prev = new Int32Array(N * 2), own = new Int32Array(N * 2);
  for (let r = meshMin - 1; r >= 0; r--) {
    const src = [], kids = [];
    cities.forEach((c, k) => { if (c.rank > r) src.push([c.h * 2, k]); else if (c.rank === r) kids.push(k); });
    if (!src.length || !kids.length) continue;
    const free = [];
    for (const k of kids) {
      const pid = ED.tparent.get(cities[k].id), p = pid != null ? idx.get(pid) : undefined;
      if (p == null || p === k || cities[p].rank <= r) { free.push(k); continue; }
      cities[k].home = p; cities[k].chosen = true;
      const id = want(p, k, 'branch'); if (id) lay(id, p, k, 'branch', ePath(cities[p].h * 2, cities[k].h * 2, 'auto', null, EATT));
    }
    if (!free.length) continue;
    const s = eMulti(src, EATT, prev, own), found = [];
    for (const k of free) {
      const t = cities[k].h * 2; if (S2[t] !== s) continue;   // no centre within reach
      const p = own[t]; if (p === k) continue;
      cities[k].home = p; found.push([G2[t], k, p, eWalk(prev, t)]);
    }
    found.sort((a, b) => a[0] - b[0]);
    for (const [, k, p, st] of found) {
      const id = want(p, k, 'branch'); if (!id) continue;
      lay(id, p, k, 'branch', st[0] === cities[p].h * 2 ? { states: st, cost: ePathCost(st), legs: [0] } : null);
    }
  }
  // the user's own lines, and the page's lines the user bent or changed
  for (const [id, o] of ED.tlinks) {
    const ia = idx.get(o.a), ib = idx.get(o.b); if (ia == null || ib == null || ia === ib || ED.tlhid.has(id)) continue;
    const auto = id.startsWith('a:'), tier = !auto ? 'user' : tiers.get(id) || (cities[ia].rank >= 2 && cities[ib].rank >= 2 ? 'main' : 'branch');
    const r = eRoute(o, cities[ia], cities[ib], EATT);
    out.push(eLinkOf({ ...plainLink(o), tier, auto, own: true }, cities, ia, ib, r)); if (r) mark(r.states);
  }
  return out;
}
// lines that share a stretch are drawn as one: the network split at every fork, every city and every change in the lines on it
function eBundles(links, cities) {
  const NS = N * 2, E = new Map(), at = new Map(), cityS = new Map();
  for (const c of cities) cityS.set(c.h * 2, c);
  links.forEach((L, li) => {
    if (L.fail || !L.states) return;
    const st = L.states;
    for (let i = 0; i + 1 < st.length; i++) {
      const a = st[i], b = st[i + 1]; if (a === b) continue;
      const lo = Math.min(a, b), hi = Math.max(a, b), key = lo * NS + hi;
      let e = E.get(key);
      if (!e) { E.set(key, e = { a: lo, b: hi, ls: [] }); for (const s of [lo, hi]) { let l = at.get(s); if (!l) at.set(s, l = []); l.push(e); } }
      if (!e.ls.includes(li)) e.ls.push(li);
    }
  });
  for (const e of E.values()) { e.ls.sort((x, y) => x - y); e.sig = ((e.a & 1) || (e.b & 1) ? 'w' : 'd') + e.ls.join(','); }
  const pos = t => { const c = cityS.get(t); if (c) return [c.x, c.y]; const h = t >> 1; return (t & 1) && !WATR[h] ? [NPX[h], NPY[h]] : [CX[h], CY[h]]; };
  const ends = s => { const l = at.get(s); return l.length !== 2 || cityS.has(s) || l[0].sig !== l[1].sig; };
  const out = [], done = new Set();
  for (const e0 of E.values()) {
    if (done.has(e0)) continue;
    done.add(e0);
    const seq = [e0.a, e0.b];
    for (const fwd of [false, true]) {               // on along the stretch both ways, to its ends
      let s = fwd ? e0.b : e0.a, e = e0;
      while (!ends(s)) {
        const l = at.get(s), nx = l[0] === e ? l[1] : l[0]; if (done.has(nx)) break;
        done.add(nx); const o = nx.a === s ? nx.b : nx.a;
        if (fwd) seq.push(o); else seq.unshift(o);
        s = o; e = nx;
      }
    }
    const P = seq.map(pos), q = P.length > 2 ? smoothLine(P) : P;
    out.push({ ls: e0.ls, wet: e0.sig[0] === 'w', main: e0.ls.some(li => isMain(links[li])), q, bb: bbox(q, 6) });
  }
  return out;
}

// ---------- the year's trade ----------
let ECON = null, econDirty = true, econTimer = 0;
function econCompute() {
  const t0 = performance.now();
  ensureRoutes();                                    // the roads as they stand, and the river crossings
  eWaterways();
  CL_DIRTY = true; climEnsure();                     // the climate as the map now stands
  ecoPrep(); ecoScale();
  const cities = visibleCities().map(c => {
    const h = landHex(hexAt(c.x, c.y)), ki0 = KIX[c.kind] != null ? KIX[c.kind] : 1, ki = ecoKi(c.id, c.kind);
    return { id: c.id, name: c.name || 'เมืองไม่มีชื่อ', kind: c.kind, ki, x: c.x, y: c.y, h, zone: h >= 0 ? ZO[h] : '.', pop: ecoPop(c.id, ki0), lk: KIK[ki], st: h >= 0 ? ECO.cells[h] : '.' };
  }).filter(c => c.h >= 0);
  const LP = landPlan(cities);                       // the land each city takes for its people: how far its fields reach, and how short it falls
  cities.forEach((c, k) => { c.land = LP.rows[k]; c.people = c.pop * ECO.unit; c.reach = Math.max(EREACH[c.ki], Math.min(LAND_REACH, c.land.ring + 1)); });
  { const ps = cities.map(c => c.pop).sort((a, b) => a - b), med = ps.length ? ps[ps.length >> 1] : 1; for (const c of cities) c.claim = clamp(Math.pow(c.pop / Math.max(1e-9, med), TU('claimPow')), 0.6, 2.5); }   // how hard a city presses on its neighbours' land
  socPrep(cities);
  PORTZ.fill(0);
  for (const c of cities) { PORTZ[c.h] = 1; for (let k = 0; k < 6; k++) { const v = NB[c.h * 6 + k]; if (v >= 0 && !WATR[v]) PORTZ[v] = 1; } }
  eLanes(cities);
  const { own, dist } = eHinterland(cities, false);
  for (let i = 0; i < N; i++) { const k = LP.own[i], u = LP.use[i]; if (k >= 0 && u >= 1 && u !== 5 && own[i] !== k) { own[i] = k; dist[i] = 0.5 * cities[k].reach; } }   // the fields, clearings and mines a city has made are its own to harvest (v0.14.1)
  const Hs = eStats(cities, own, (i, k) => 1 - 0.5 * dist[i] / cities[k].reach);
  const outer = eHinterland(cities, true).own;
  for (let i = 0; i < N; i++) if (own[i] >= 0) outer[i] = -1;
  const Ho = eStats(cities, outer, () => 0.5);
  cities.forEach((c, k) => { c.cm = climCity(c.h, c.zone); const raw = SB(Hs[k], 'gvhes'); c.cm.grain = raw > 1e-6 ? SBA(Hs[k], 'gvhes') / raw : 1; });
  const n = cities.length;
  ecoCities(cities); orgCities(cities);
  // what each city has the boats for: the sea, a lake or a navigable river at its quay
  for (const c of cities) {
    let sea = false, wet = false;
    const look = [c.h]; for (let k = 0; k < 6; k++) { const v = NB[c.h * 6 + k]; if (v >= 0) look.push(v); }
    for (const v of look) { if (isSea(eff(v))) sea = true; if (WATR[v] || NAVR[v]) wet = true; }
    c.port = sea ? 2 : wet ? 1 : 0;
  }
  // the ground's goods
  const prod = cities.map(() => new Map());
  cities.forEach((c, k) => {
    const H = Hs[k], cn = ECANON[c.id] || {};
    for (const g of EGOODS) { if (g.off) continue; let v = (g.f(H) + (g.far ? g.f(Ho[k]) : 0)) * (g.pct == null ? 1 : g.pct); if (!(v > 0.004)) continue; v *= (cn[g.cat] || 1) * orgProd(c, g.cat) * socRaw(c, g.cat); if (g.id === 'silver' && c.id === 'vidsaga') v *= 1.5; prod[k].set(g.id, v); }
  });
  harvApply(cities, prod, own, dist);                     // how many hands work each hex: the yield of a hex rises and falls with them (v0.15.0)
  socRich(cities, prod);                            // how the city's money falls between its classes, and what its country brings up: what its people will want
  // what each city needs, before its workshops
  const need = cities.map(c => {
    const m = {}; for (const cat of ECATS) m[cat] = ENEED[cat][c.ki] * c.pop * socNeed(c, cat); if (!c.port) m.ships = 0;
    m.fuel *= c.cm.fuel; m.cloth *= c.cm.cloth; m.herbs *= c.cm.herbs; m.tools *= c.cm.tools;   // what the climate asks of the city
    return m;
  });
  // the workshops' plan: what each could make at full supply, and what that takes
  const plan = cities.map((c, k) => {
    const H = Hs[k], cn = ECANON[c.id] || {}, z = c.zone, ind = c.pop * EIND[c.ki], p = {};
    const ore = (prod[k].get('iron') || 0) + (prod[k].get('copper') || 0);
    const spec = {
      tools: 0.6 + (ore > 0.4 ? 0.8 : 0),
      arms: [1.2, 1, 0.5, 1.4, 0][c.ki] * ({ S: 1.5, H: 1.4, X: 1.2, G: 0.8 }[z] || 0.6) * (z === 'Q' ? 0.3 : 1),
      tech: [1.2, 1, 0.3, 0.5, 0][c.ki] * ({ X: 1.3, S: 1.4, H: 1.2, G: 0.9, T: 0.5 }[z] || 0.1),
      ships: c.port === 2 ? 1 : c.port === 1 ? 0.4 : 0,
      books: (z === 'T' ? 3 : 1) * [1, 0.5, 0.2, 0.1, 0][c.ki],
    };
    for (const m of EMADEC) { const v = ind * EWORK[m].base * spec[m] * (cn[m] || 1) * orgProd(c, m) * socMake(c, m); if (v > 0.01) p[m] = v; }
    for (const m in p) for (const [cat, q] of Object.entries(EWORK[m].in)) need[k][cat] += p[m] * q;
    return p;
  });
  landYield(cities, prod, need, LP);                // what the city's own fields, felled woods and mines bring in (v0.14.2)
  const flows = [], links = eNetwork(cities);
  // what trade between two cities costs: the cheapest way along the network's lines, through the cities between. A boat that
  // comes in and goes on by water passes a smaller place without unloading; at a centre of rank 2 or up the cargo comes ashore
  // to be sorted and sent on, and pays the quay both ways, as it does wherever it changes between boat and caravan.
  const wetEnd = (L, atA) => { const st = L.states; if (!st) return false; for (let q = 1; q <= 2 && q < st.length; q++) if (st[atA ? q : st.length - 1 - q] & 1) return true; return false; };
  const adj = cities.map(() => []);
  links.forEach((L, li) => { if (L.fail) return; const wa = wetEnd(L, true), wb = wetEnd(L, false); const lc = ecoLinkCost(L, cities) * orgHaul(cities[L.ia], cities[L.ib]) * socHaul(L, cities); adj[L.ia].push([L.ib, lc, li, wa, wb]); adj[L.ib].push([L.ia, lc, li, wb, wa]); });
  const NT = [], NWAY = [];                         // NWAY[i][j]: the lines from i to j, each as [line, +1 from its first city or -1]
  for (let i = 0; i < n; i++) {                     // states: a city, reached by land (2k) or still afloat (2k + 1)
    const d = new Float64Array(2 * n).fill(Infinity), pv = new Int32Array(2 * n).fill(-1), pl = new Int32Array(2 * n).fill(-1), done = new Uint8Array(2 * n); d[2 * i] = 0;
    for (;;) {
      let u = -1, bd = Infinity; for (let k = 0; k < 2 * n; k++) if (!done[k] && d[k] < bd) { bd = d[k]; u = k; }
      if (u < 0) break; done[u] = 1;
      const k = u >> 1, afloat = u & 1, through = afloat && k !== i && !cities[k].stop;
      for (const [v, c, li, wOut, wIn] of adj[k]) {
        const g = d[u] + (through && wOut ? Math.max(0.05, c - 2 * EQUAY) : c), t = 2 * v + (wIn ? 1 : 0);
        if (g < d[t]) { d[t] = g; pv[t] = u; pl[t] = li; }
      }
    }
    const row = new Float64Array(n), ways = [];
    for (let j = 0; j < n; j++) {
      const t = d[2 * j] <= d[2 * j + 1] ? 2 * j : 2 * j + 1; row[j] = d[t];
      const way = []; let x = t, guard = 0;
      while (x !== 2 * i && pl[x] >= 0 && guard++ < 2 * n) { const L = links[pl[x]], at = x >> 1; way.push([pl[x], L.ib === at ? 1 : -1]); x = pv[x]; }
      ways.push(way.reverse());
    }
    NT.push(row); NWAY.push(ways);
  }
  // Prices, after Victoria 3: a city's price for a category follows its buy and sell orders, from a quarter of the base value
  // when nobody wants it to one and three quarters when nobody has it. Goods move only while the price gap between two cities
  // pays for carrying them along the network, a little at a time, so every load narrows the gap it crosses: a mild shortage is
  // filled from close by, a famine draws grain from far away.
  ecoWays(NT);
  const got = cities.map(() => ({}));               // what each city has of each category: its own use plus what it bought
  const left = cities.map(() => new Map());         // what each city still has to sell, by good
  const P0 = cities.map(() => ({})), P1 = cities.map(() => ({}));   // prices before and after trade, as a share of the base value
  const MK = cities.map(() => ({}));                // each category's book in each city: [made, wanted, bought in, sold out]
  let rounds = 0, phase = -1;
  function allocate(cats, goodsOf) {
    for (const cat of cats) {
      const { v, bulk } = ECAT[cat], sup = [], dem = [], spare0 = new Map();   // spare0: what each city had to sell before any of it went
      const S = new Float64Array(n), B = new Float64Array(n), imp = new Float64Array(n), exp = new Float64Array(n);
      for (let k = 0; k < n; k++) {
        const gs = goodsOf(k, cat), tot = gs.reduce((a, g) => a + g[1], 0), nd = need[k][cat], use = Math.min(tot, nd);
        S[k] = tot; B[k] = nd; got[k][cat] = use; P0[k][cat] = eShare(nd, tot);
        if (tot - use > 0.01) { const f = (tot - use) / tot; for (const [id, x] of gs) { left[k].set(id, x * f); spare0.set(k + ':' + id, x * f); } sup.push(k); }
        if (nd - use > 0.01) dem.push(k);
      }
      const price = k => eShare(B[k] + exp[k], S[k] + imp[k]);
      const budget = new Map(), pair = new Map();
      function avail(i, j) {                        // what i may sell to j: the rules of the era hold some goods back
        const zj = cities[j].zone, take = []; let sum = 0;
        for (const [id, rest] of left[i]) {
          if (catOf(id) !== cat || rest <= 0.001) continue;
          const r = ERULE[id]; if (r && r.ban && r.ban(zj)) continue;
          let a = rest;
          const s0 = spare0.get(i + ':' + id) || rest;
          if (r && r.cap != null) { const key = i + ':' + id; if (!budget.has(key)) budget.set(key, s0 * r.cap); a = Math.min(a, budget.get(key)); }
          if (r && r.capTo && r.capTo[zj] != null) { const key = i + ':' + id + ':' + zj; if (!budget.has(key)) budget.set(key, s0 * r.capTo[zj]); a = Math.min(a, budget.get(key)); }
          if (a > 0.001) { take.push([id, a]); sum += a; }
        }
        return [take, sum];
      }
      // Each round the pair whose load earns most once carried trades, the first in the cities' order when two earn alike. While
      // a market clears, prices move one way only: a seller's rises as it ships and a buyer's falls as it receives, so what any
      // pair could earn only shrinks. The pairs wait in a heap, best on top, each with what it earned when last priced; a pair is
      // priced again only when it comes up after one of its two cities has traded, so the top that is still current is the best
      // of all, as a full search of every pair would find it.
      const ns = sup.length, nd = dem.length, vS = new Int32Array(ns), vD = new Int32Array(nd);
      const cap = ns * nd + 1300, Hm = new Float64Array(cap), Ha = new Int32Array(cap), Hb = new Int32Array(cap), Hva = new Int32Array(cap), Hvb = new Int32Array(cap);
      let hn = 0;
      const first = (m, a, b, x) => m > Hm[x] || (m === Hm[x] && (a < Ha[x] || (a === Ha[x] && b < Hb[x])));
      const hset = (x, m, a, b, va, vb) => { Hm[x] = m; Ha[x] = a; Hb[x] = b; Hva[x] = va; Hvb[x] = vb; };
      const hmove = (x, y) => hset(x, Hm[y], Ha[y], Hb[y], Hva[y], Hvb[y]);
      function hput(m, a, b, va, vb) {
        let x = hn++;
        while (x > 0) { const p = (x - 1) >> 1; if (!first(m, a, b, p)) break; hmove(x, p); x = p; }
        hset(x, m, a, b, va, vb);
      }
      function hdrop() {                            // takes the top away
        const last = --hn; if (!last) return;
        const m = Hm[last], a = Ha[last], b = Hb[last], va = Hva[last], vb = Hvb[last];
        let x = 0;
        for (;;) {
          let c = 2 * x + 1; if (c >= last) break;
          if (c + 1 < last && !first(Hm[c], Ha[c], Hb[c], c + 1)) c++;
          if (first(m, a, b, c)) break;
          hmove(x, c); x = c;
        }
        hset(x, m, a, b, va, vb);
      }
      const earn = (a, b) => {                      // what a load from the a-th seller to the b-th buyer earns now; nothing when it is out
        const i = sup[a], j = dem[b];
        if (i === j || S[i] - B[i] - exp[i] <= 0.02 || B[j] - S[j] - imp[j] <= 0.02) return 0;
        const w = ECOX.on ? ecoWay(i, j, cat) : null, t = w ? w.t : NT[i][j]; if (!isFinite(t)) return 0;
        return ecoEarn(i, j, cat, price(i), price(j), v, t, bulk, phase, w);
      };
      for (const ph of ecoPhases()) { phase = ph; hn = 0;      // who may trade with whom, in turn: a lord's due, then the realm, then the world
      for (let a = 0; a < ns; a++) for (let b = 0; b < nd; b++) { const m = earn(a, b); if (m > 0) hput(m, a, b, vS[a], vD[b]); }
      for (let round = 0; round < 4000; round++) {   // a guard only: a market of 180 cities clears in about 1300 rounds
        let ta = -1, tb = -1, tm = 0;
        while (hn) {
          const m = Hm[0], a = Ha[0], b = Hb[0], cur = Hva[0] === vS[a] && Hvb[0] === vD[b];
          hdrop();
          if (cur) { ta = a; tb = b; tm = m; break; }
          const m2 = earn(a, b); if (m2 > 0) hput(m2, a, b, vS[a], vD[b]);   // what it earns only falls: once nothing, out for good
        }
        rounds = Math.max(rounds, round + 1);
        if (ta < 0) break;
        const bi = sup[ta], bj = dem[tb];
        const room = S[bi] - B[bi] - exp[bi], lack = B[bj] - S[bj] - imp[bj], [take, sum] = avail(bi, bj);
        if (Math.min(room, lack, sum) < 0.03) continue;   // a scrap is not worth a boat: the pair stays out of the heap
        const step = Math.min(room, lack, sum, Math.max(0.05, 0.25 * Math.min(room, lack))), f = step / sum, zj = cities[bj].zone;
        let fl = pair.get(bi * n + bj);
        if (!fl) { const wy = ECOX.on ? ecoWay(bi, bj, cat) : null; pair.set(bi * n + bj, fl = { from: bi, to: bj, cat, amt: 0, goods: {}, cost: wy ? wy.t : NT[bi][bj], via: wy ? wy.mids : null, broker: wy ? wy.broker : -1, hub: !!wy && wy.hub >= 0, org: wy && wy.org ? orgNet(cities[bi], cities[bj], cat) : null }); }
        for (const [id, a] of take) {
          const x = a * f; fl.goods[id] = (fl.goods[id] || 0) + x; left[bi].set(id, left[bi].get(id) - x);
          for (const key of [bi + ':' + id, bi + ':' + id + ':' + zj]) if (budget.has(key)) budget.set(key, budget.get(key) - x);
        }
        fl.amt += step; exp[bi] += step; imp[bj] += step; got[bj][cat] += step;
        vS[ta]++; vD[tb]++; hput(tm, ta, tb, -1, -1);   // both cities traded: their pairs are priced again when they come up
      }
      }
      for (const fl of pair.values()) flows.push(fl);
      for (let k = 0; k < n; k++) {
        P1[k][cat] = price(k); MK[k][cat] = [S[k], B[k], imp[k], exp[k]];
        const lack = B[k] - S[k] - imp[k]; if (lack > 0.01) (cities[k].short || (cities[k].short = {}))[cat] = lack;
      }
    }
  }
  allocate(ERAW, (k, cat) => [...prod[k]].filter(([id]) => catOf(id) === cat));
  // the workshops run as far as their scarcest input allows
  cities.forEach((c, k) => {
    for (const m in plan[k]) {
      let f = 0, q = 0; for (const [cat, x] of Object.entries(EWORK[m].in)) { f += x * (need[k][cat] > 0 ? Math.min(1, got[k][cat] / need[k][cat]) : 1); q += x; }
      f = q ? f / q : 1;                             // a workshop short of one input still makes some, with what it has
      const v = plan[k][m] * f; if (v > 0.01) prod[k].set(madeId(m, c.zone), v);
    }
  });
  allocate(EMADEC, (k, cat) => [...prod[k]].filter(([id]) => catOf(id) === cat));
  // the lines each flow rode, from its source to its market, and what every line carries both ways
  for (const f of flows) {
    const way = ecoRide(f, NWAY); f.way = way;
    let wet = 0, dry = 0;
    for (const [li, dir] of way) {
      const L = links[li]; L.vol += f.amt; if (dir > 0) L.fwd += f.amt; else L.back += f.amt;
      L.cats.set(f.cat, (L.cats.get(f.cat) || 0) + f.amt); for (const g in f.goods) L.goods.set(g, (L.goods.get(g) || 0) + f.goods[g]);
      let cd = L.cdir.get(f.cat); if (!cd) L.cdir.set(f.cat, cd = [0, 0]); cd[dir > 0 ? 0 : 1] += f.amt;
      wet += L.wet; dry += L.dry;
    }
    f.by = !dry ? 'water' : !wet ? 'caravan' : 'mixed';
  }
  // the value of the goods that pass through each city, as EU4 weighs its centres of trade: the rank that value would suggest
  for (const c of cities) c.through = 0;
  for (const f of flows) { const val = f.amt * ECAT[f.cat].v, seen = new Set([f.from]); let at = f.from; for (const [li] of f.way) { const L = links[li]; at = L.ia === at ? L.ib : L.ia; seen.add(at); } for (const k of seen) cities[k].through += val; }
  const top = Math.max(0, ...cities.map(c => c.through));
  for (const c of cities) { c.level = c.rank; c.sug = !(top > 0) ? 0 : c.through >= 0.5 * top ? 3 : c.through >= 0.2 * top ? 2 : c.through >= 0.05 * top ? 1 : 0; }
  ECON = { ver: (ECON ? ECON.ver : 0) + 1, plan, cities, prod, need, got, left, flows, links, bundles: null, NT, NWAY, P0, P1, MK, rounds, land: LP, hin: own, hout: outer, ms: 0 };
  LP.ver = ECON.ver; landCompute();
  try { socYear(ECON); } catch (err) { console.error('society', err); }   // who ends up where and with what: people on the move, visitors, slaves as a class of goods, each state's books
  ECON.bundles = eBundles(links, cities); ECON.ms = performance.now() - t0;
  return ECON;
}
const GBY = new Map(EGOODS.map(g => [g.id, g]));
const catOf = id => { const g = GBY.get(id); if (g) return g.cat; return id.split(':')[0]; };
const madeId = (m, z) => m + ':' + (EMADE[m][z] ? z : 'def');
const goodName = id => { const g = GBY.get(id); if (g) return g.name; const [m, z] = id.split(':'); return (EMADE[m] && (EMADE[m][z] || EMADE[m].def)) || id; };

// the trade is worked out again a moment after the ground, the rivers, the cities, the roads or the lore points change
function scheduleEcon(ms = 350) {
  econDirty = true; clearTimeout(econTimer);
  econTimer = setTimeout(() => {
    econTimer = 0; if (!econDirty) return; econDirty = false;
    try { econCompute(); } catch (err) { console.error(err); }
    tprev = null; requestDraw(); renderTradeCard(); renderClimCard(); fxKick();
  }, ms);
}

// ---------- drawing the trade ----------
// Every line of the network runs from city to city: blue where boats carry it, amber where caravans do, wider for more loads,
// with a light stripe down a main or trunk line, and dashed while nothing moves on it. Where lines share a stretch they are
// drawn as one, as wide as their loads together. A centre wears one gold ring for each rank.
const TRD = {
  water: { name: 'การค้าทางน้ำ', line: 'rgba(118,214,250,.95)', core: 'rgba(236,252,255,.95)', px: 3 },
  caravan: { name: 'คาราวาน', line: 'rgba(242,170,62,.95)', core: 'rgba(255,240,200,.95)', px: 3 },
};
let tsel = null, tlsel = null, tcat = '', ttool = 'pick', tmode = 'auto', tpend = null, tprev = null;
const PCOL = { mid: [232, 226, 208], lo: [62, 184, 166], hi: [228, 82, 58] };
function priceCol(x) {                              // a price as a share of the base value, as a colour
  const t = Math.max(-1, Math.min(1, (x - 1) / 0.75)), b = t < 0 ? PCOL.lo : PCOL.hi, u = Math.abs(t);
  return 'rgb(' + PCOL.mid.map((m, i) => Math.round(m + (b[i] - m) * u)).join(',') + ')';
}
const pctP = x => Math.round(x * 100) + '%';
const priceWord = x => x >= 1.5 ? 'แพงมาก' : x >= 1.15 ? 'แพง' : x <= 0.5 ? 'ถูกมาก' : x <= 0.85 ? 'ถูก' : 'ราคากลาง';
const linkVol = L => tcat ? L.cats.get(tcat) || 0 : L.vol;
const volW = (v, m, px) => Math.max((m ? 0.8 : 0.55) + 0.5 * Math.sqrt(v), ((m ? 1.8 : 1.2) + 1.0 * Math.sqrt(v)) * px);
const isMain = L => L.tier === 'main' || L.tier === 'trunk' || L.tier === 'lore';
const linkW = (L, px) => volW(linkVol(L), isMain(L), px);
const bundleVol = ch => ch.ls.reduce((a, li) => a + linkVol(ECON.links[li]), 0);
const bundleW = (ch, px) => volW(bundleVol(ch), ch.main, px);
function strokeLink(c, px, L, geo, glow) {
  if (!geo) return;
  const runs = geo.runs.filter(r => showR[r.wet ? 'water' : 'caravan']); if (!runs.length) return;
  const w = linkW(L, px), idle = linkVol(L) < 0.03;
  c.lineJoin = 'round'; c.lineCap = 'round';
  if (glow) for (const r of runs) { linePath(c, r.q); c.strokeStyle = 'rgba(255,232,160,.55)'; c.lineWidth = w + 6 * px; c.stroke(); }
  c.setLineDash(idle ? [Math.max(1.6, 3.2 * px), Math.max(1.3, 2.6 * px)] : []);
  for (const r of runs) { linePath(c, r.q); c.strokeStyle = 'rgba(14,18,24,.6)'; c.lineWidth = w + Math.max(0.6, 1.2 * px); c.stroke(); }
  for (const r of runs) { linePath(c, r.q); c.strokeStyle = TRD[r.wet ? 'water' : 'caravan'].line; c.lineWidth = w; c.stroke(); }
  c.setLineDash([]);
  if (isMain(L) && !idle) for (const r of runs) { linePath(c, r.q); c.strokeStyle = TRD[r.wet ? 'water' : 'caravan'].core; c.lineWidth = Math.max(0.5, w * 0.28); c.stroke(); }
}
function focusLinks(id) {                           // the lines a city's own goods ride, and the lines that end at it
  const k = ECON.cities.findIndex(c => c.id === id), s = new Set();
  for (const f of ECON.flows) if ((f.from === k || f.to === k) && (!tcat || f.cat === tcat)) for (const [li] of f.way) s.add(li);
  ECON.links.forEach((L, li) => { if (L.ia === k || L.ib === k) s.add(li); });
  return s;
}
function drawTrade(c, px, live) {
  if (!ECON || (!showR.water && !showR.caravan)) return;
  const here = live && mode === 'trade', focus = here && tsel ? focusLinks(tsel) : null;
  const si = here && tlsel ? ECON.links.findIndex(x => x.id === tlsel) : -1, sel = si >= 0 ? ECON.links[si] : null;
  const bend = sel && act && act.k === 'tbend' && act.id === sel.id && act.geo ? act.geo : null;
  const B = (ECON.bundles || []).filter(ch => showR[ch.wet ? 'water' : 'caravan']), W = B.map(ch => bundleW(ch, px)), V = B.map(bundleVol);
  c.lineJoin = 'round'; c.lineCap = 'round';
  if (sel && sel.geo && !bend) {                    // the chosen line: a glow along all of it, under the stretches it shares
    const w = Math.max(linkW(sel, px), ...B.map((ch, i) => ch.ls.includes(si) ? W[i] : 0));
    for (const r of sel.geo.runs) if (showR[r.wet ? 'water' : 'caravan']) { linePath(c, r.q); c.strokeStyle = 'rgba(255,232,160,.55)'; c.lineWidth = w + 6 * px; c.stroke(); }
  }
  const dash = [Math.max(1.6, 3.2 * px), Math.max(1.3, 2.6 * px)];
  for (let pass = 0; pass < 3; pass++) B.forEach((ch, i) => {   // the dark edges of every stretch, then the colours, then the stripes of the main lines
    const idle = V[i] < 0.03; if (pass === 2 && (!ch.main || idle)) return;
    c.globalAlpha = focus && !ch.ls.some(li => focus.has(li)) ? 0.22 : 1;
    c.setLineDash(pass < 2 && idle ? dash : []);
    const st = TRD[ch.wet ? 'water' : 'caravan'];
    linePath(c, ch.q);
    c.strokeStyle = pass === 0 ? 'rgba(14,18,24,.6)' : pass === 1 ? st.line : st.core;
    c.lineWidth = pass === 0 ? W[i] + Math.max(0.6, 1.2 * px) : pass === 1 ? W[i] : Math.max(0.3, W[i] * 0.28);
    c.stroke();
  });
  c.setLineDash([]); c.globalAlpha = 1;
  if (bend) strokeLink(c, px, sel, bend, true);     // a line being bent: its new course over the old
  const vc = new Map(visibleCities().map(v => [v.id, v])), priced = here && tcat && ECON.P1;
  ECON.cities.forEach((ct, k) => {
    const v = vc.get(ct.id) || ct, st = CK[ct.kind] || CK.city, r0 = Math.max(st.r * px, st.min);
    const bk = priced && ECON.MK[k][tcat], on = bk && (bk[0] > 0.01 || bk[1] > 0.01);
    if (on) {                                         // the price of the chosen category: a ring from sea green (cheap) to red (dear)
      const r = r0 + Math.max(1, 1.8 * px);
      c.beginPath(); c.arc(v.x, v.y, r, 0, 2 * Math.PI); c.lineWidth = Math.max(1.5, 3.4 * px); c.strokeStyle = 'rgba(14,18,24,.8)'; c.stroke();
      c.beginPath(); c.arc(v.x, v.y, r, 0, 2 * Math.PI); c.lineWidth = Math.max(0.9, 2.2 * px); c.strokeStyle = priceCol(ECON.P1[k][tcat]); c.stroke();
    }
    if (!ct.hub) return;                              // the centres: one ring for each rank
    for (let l = 0; l < Math.max(1, ct.rank); l++) {
      const r = r0 + Math.max(1.6, (on ? 5 : 3.4) * px) + l * Math.max(1.2, 2.4 * px);
      c.beginPath(); c.arc(v.x, v.y, r, 0, 2 * Math.PI); c.lineWidth = Math.max(0.9, 2.2 * px); c.strokeStyle = 'rgba(14,18,24,.75)'; c.stroke();
      c.beginPath(); c.arc(v.x, v.y, r, 0, 2 * Math.PI); c.lineWidth = Math.max(0.55, 1.3 * px); c.strokeStyle = '#f2c862'; c.stroke();
    }
  });
  if (!here) return;
  if (tpend) {                                        // a line being laid: a ring at its first city, and its course to the city under the pointer
    const a = vc.get(tpend);
    if (a) { c.beginPath(); c.arc(a.x, a.y, 9 * px, 0, 2 * Math.PI); c.setLineDash([3 * px, 2 * px]); c.lineWidth = 1.8 * px; c.strokeStyle = '#ffd678'; c.stroke(); c.setLineDash([]); }
    const pv = tradePreview(); if (pv) strokeLink(c, px, { tier: 'user', vol: 0.5, cats: new Map() }, pv, true);
  }
  const L = tlsel && ECON.links.find(x => x.id === tlsel);
  if (L && editable) {
    const via = act && act.k === 'tbend' && act.id === L.id ? act.via : L.via || [];
    for (const p of via) { c.beginPath(); c.arc(p[0], p[1], 4.2 * px, 0, 2 * Math.PI); c.fillStyle = '#fff4d6'; c.fill(); c.lineWidth = 1.5 * px; c.strokeStyle = '#2a2116'; c.stroke(); }
  }
}
function tradePreview() {
  if (!cursor || !tpend || !ECON) return null;
  const b = cityAt(cursor[0], cursor[1]); if (!b || b.id === tpend) return null;
  const key = JSON.stringify([tpend, b.id, tmode, ECON.ver]);
  if (!tprev || tprev.key !== key) {
    const A = ECON.cities.find(c => c.id === tpend), B = ECON.cities.find(c => c.id === b.id);
    const r = A && B ? eRoute({ mode: tmode, via: [] }, A, B) : null;
    tprev = { key, geo: r ? eGeo(r.states, A, B) : null };
  }
  return tprev.geo;
}
const linkDist = (L, geo, mx, my) => { let d = 1e9; for (const r of (geo || L.geo).runs) d = Math.min(d, distToLine(r.q, mx, my)); return d; };
function chainAt(mx, my) {                          // the stretch of the network under the pointer
  if (!ECON || !ECON.bundles) return null;
  let best = null, bd = 1e9;
  for (const ch of ECON.bundles) {
    if (!showR[ch.wet ? 'water' : 'caravan']) continue;
    const lim = bundleW(ch, 1 / view.s) / 2 + Math.max(2, 4 / view.s);
    if (!hits(ch.bb, mx - lim, my - lim, mx + lim, my + lim)) continue;
    const d = distToLine(ch.q, mx, my); if (d <= lim && d < bd) { bd = d; best = ch; }
  }
  return best;
}
const chainLines = ch => ch.ls.map(li => ECON.links[li]).sort((a, b) => linkVol(b) - linkVol(a) || (a.id < b.id ? -1 : 1));
function linkAt(mx, my) {                           // the line under the pointer: the chosen one where it runs, else the busiest there
  const ch = chainAt(mx, my); if (!ch) return null;
  const ls = chainLines(ch); return ls.find(L => L.id === tlsel) || ls[0];
}
function linkLegAt(L, x, y) {                        // which leg of the line, between its waypoints, a point lies on
  const P = L.geo.raw; let best = 0, bd = 1e9;
  for (let i = 0; i < P.length - 1; i++) { const d = segDist(x, y, P[i], P[i + 1]); if (d < bd) { bd = d; best = i; } }
  let leg = 0; for (let l = 0; l < L.legs.length; l++) if (best >= L.legs[l]) leg = l;
  return leg;
}
const viaAt = (via, mx, my) => { const lim = Math.max(3, 8 / view.s); for (let i = 0; i < via.length; i++) if (Math.hypot(via[i][0] - mx, via[i][1] - my) <= lim) return i; return -1; };
const fmtL = v => v >= 9.95 ? Math.round(v).toString() : v >= 0.095 ? v.toFixed(1) : v.toFixed(2);
const topGoods = (m, n) => [...m].sort((a, b) => b[1] - a[1]).filter(([, v]) => v >= 0.05).slice(0, n).map(([id, v]) => `${esc(goodName(id))} ${fmtL(v)}`).join(' · ');
const linkGoods = L => tcat ? new Map([...L.goods].filter(([g]) => catOf(g) === tcat)) : L.goods;
const linkName = L => L.tier === 'main' ? 'เส้นหลัก' : L.tier === 'trunk' ? 'เส้นสายใหญ่' : L.tier === 'branch' ? 'เส้นสาขา' : L.tier === 'lore' || !editable ? 'เส้นประจำ' : 'เส้นที่วางเพิ่ม';
const howText = L => (L.wet && L.dry ? `ทางน้ำ ${L.wet} ช่อง คาราวาน ${L.dry} ช่อง` : L.wet ? `ทางน้ำ ${L.wet} ช่อง` : `คาราวาน ${L.dry} ช่อง`) + (L.dry && L.road ? ` บนถนน ${L.road} ช่อง` : '');
function linkTipHTML(L) {
  const v = linkVol(L);
  return `<b>${linkName(L)} ${esc(ECON.cities[L.ia].name)} กับ${esc(ECON.cities[L.ib].name)}</b><div class="m">${howText(L)}${v >= 0.03 ? ' · ขนส่ง ' + fmtL(v) + ' หน่วย' : ' · ยังไม่มีของวิ่ง'}</div>`
    + (v >= 0.03 ? `<div class="lore">${topGoods(linkGoods(L), 5)}</div>` : '');
}
function bundleTipHTML(ch) {                        // a stretch several lines share: the lines on it and what they carry together
  const ls = chainLines(ch); if (ls.length === 1) return linkTipHTML(ls[0]);
  const v = bundleVol(ch), gs = new Map(); for (const L of ls) for (const [g, x] of linkGoods(L)) gs.set(g, (gs.get(g) || 0) + x);
  let h = `<b>เส้นการค้า ${ls.length} เส้นวิ่งร่วมกันช่วงนี้</b><div class="m">${ch.wet ? 'ทางน้ำ' : 'คาราวาน'}${v >= 0.03 ? ' · ขนส่งรวม ' + fmtL(v) + ' หน่วย' : ' · ยังไม่มีของวิ่ง'}</div>`;
  h += ls.slice(0, 6).map(L => `<div class="m">${linkName(L)} ${esc(ECON.cities[L.ia].name)} กับ${esc(ECON.cities[L.ib].name)}${linkVol(L) >= 0.03 ? ' · ' + fmtL(linkVol(L)) : ''}</div>`).join('');
  if (ls.length > 6) h += `<div class="m">และอีก ${ls.length - 6} เส้น</div>`;
  return h + (v >= 0.03 ? `<div class="lore">${topGoods(gs, 5)}</div>` : '');
}
// what a city sells and buys, short: for the hover cards
function cityTradeLine(id) {
  if (!ECON) return '';
  const k = ECON.cities.findIndex(c => c.id === id); if (k < 0) return '';
  const c = ECON.cities[k], sum = (fs, pick) => { const m = new Map(); for (const f of fs) for (const g in f.goods) m.set(g, (m.get(g) || 0) + f.goods[g]); return [...m].sort((a, b) => b[1] - a[1]).slice(0, pick).map(([g]) => esc(goodName(g))).join(' '); };
  const out = ECON.flows.filter(f => f.from === k), inn = ECON.flows.filter(f => f.to === k);
  let h = c.hub ? `<div class="s">${RANKN[c.rank]} ระดับ ${c.rank}</div>` : '';
  if (c.home >= 0 && c.home !== k) h += `<div class="m">ส่งของผ่าน${RANKN[ECON.cities[c.home].rank]}${esc(ECON.cities[c.home].name)}</div>`;
  const bk = mode === 'trade' && tcat && ECON.MK[k][tcat];
  if (bk && (bk[0] > 0.01 || bk[1] > 0.01)) h += `<div class="m">ราคา${esc(ECAT[tcat].name)} ${pctP(ECON.P1[k][tcat])} ของราคากลาง</div>`;
  if (out.length) h += `<div class="m">ส่งออก ${sum(out, 3)}</div>`;
  if (inn.length) h += `<div class="m">นำเข้า ${sum(inn, 3)}</div>`;
  if (!ECON.links.some(L => !L.fail && (L.ia === k || L.ib === k))) h += '<div class="mine">ยังไม่มีเส้นการค้ามาถึง</div>';
  return h;
}

// ---------- the trade card ----------
const PORTN = ['ไม่มีท่าเรือ ค้าขายด้วยคาราวานอย่างเดียว', 'ท่าเรือริมแม่น้ำหรือทะเลสาบ', 'ท่าเรือริมทะเล'];
const BYN = { water: 'ทางน้ำ', caravan: 'คาราวาน', mixed: 'ทางน้ำต่อคาราวาน' };
const chipT = cat => `<i style="background:${ECAT[cat].col}"></i>`;
function goodRows(list) {                            // [[id, loads]] as rows with the colour of their category
  return `<div class="tl">${list.map(([id, v]) => { const g = GBY.get(id); return `${chipT(catOf(id))}<span>${esc(goodName(id))}</span><span class="n">${fmtL(v)}</span>`; }).join('')}</div>`;
}
function partnerRows(fs, side) {                     // flows grouped by the other city, the biggest first
  const by = new Map();
  for (const f of fs) {
    const o = side === 'to' ? f.to : f.from; let r = by.get(o);
    if (!r) by.set(o, r = { o, amt: 0, goods: new Map(), by: new Set(), hops: 0 });
    r.amt += f.amt; r.by.add(f.by); r.hops = Math.max(r.hops, f.way.length); if (f.via) r.via = f.via; for (const g in f.goods) r.goods.set(g, (r.goods.get(g) || 0) + f.goods[g]);
  }
  const rows = [...by.values()].sort((a, b) => b.amt - a.amt), shown = rows.slice(0, 7);
  return shown.map(r => {
    const how = r.by.size === 1 ? BYN[[...r.by][0]] : 'หลายทาง';
    return `<div class="tr"><b>${side === 'to' ? 'ไป' : 'จาก'}${esc(ECON.cities[r.o].name)}</b> <span class="w">${how} · ${r.via ? 'ส่งต่อที่' + r.via.map(k => esc(ECON.cities[k].name)).join(' แล้ว') + ' · ' : ''}${r.hops > 1 ? 'ผ่าน ' + (r.hops - 1) + ' เมือง · ' : ''}${fmtL(r.amt)} หน่วย</span><br>${topGoods(r.goods, 4)}</div>`;
  }).join('') + (rows.length > shown.length ? `<div class="tr w">และอีก ${rows.length - shown.length} เมือง</div>` : '');
}
function tradeCityHTML(k) {
  const c = ECON.cities[k], z = c.zone !== '.' ? zoneInfo(c.zone) : null, cn = ECANON[c.id];
  const inCat = id => !tcat || catOf(id) === tcat;
  const prod = [...ECON.prod[k]].filter(([id, v]) => inCat(id) && v >= 0.05).sort((a, b) => b[1] - a[1]);
  const out = ECON.flows.filter(f => f.from === k && (!tcat || f.cat === tcat)), inn = ECON.flows.filter(f => f.to === k && (!tcat || f.cat === tcat));
  const short = Object.entries(c.short || {}).filter(([cat, v]) => (!tcat || cat === tcat) && v >= 0.05).sort((a, b) => b[1] * ECAT[b[0]].v - a[1] * ECAT[a[0]].v);
  const spare = [...ECON.left[k]].filter(([id, v]) => inCat(id) && v >= 0.1).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const lines = ECON.links.filter(L => !L.fail && (L.ia === k || L.ib === k));
  let h = `<h3>${esc(c.name)}</h3><div class="tr w">${esc((CK[c.kind] || CK.city).name)}${z ? ' · ' + esc(z.name) : ''} · ${PORTN[c.port]}</div>`;
  h += rankHTML(k, lines.length);
  if (cn) h += `<div class="tr">${esc(cn.why)}</div>`;
  if (c.zone === 'X') h += `<div class="tr w">${esc(ERULE.phantomstone.why)}</div>`;
  if (c.zone === 'S') h += `<div class="tr w">${esc(ERULE.adamant.why)} ${esc(ERULE.sephine.why)}</div>`;
  h += '<!--prod-->' + prodHTML(k);
  h += priceHTML(k);
  h += `<h3>ส่งออก</h3>` + (out.length ? partnerRows(out, 'to') : '<div class="tr w">ไม่มี</div>');
  h += `<h3>นำเข้า</h3>` + (inn.length ? partnerRows(inn, 'from') : '<div class="tr w">ไม่มี</div>');
  if (short.length) h += `<h3>ยังขาด</h3><div class="tl">${short.map(([cat, v]) => `${chipT(cat)}<span>${esc(ECAT[cat].name)}</span><span class="n">${fmtL(v)}</span>`).join('')}</div>`;
  if (spare.length) h += `<h3>ขายไม่หมด</h3>` + goodRows(spare);
  return h;
}
function rankHTML(k, nl) {                          // the city as a centre: its rank, where its goods go, what it gathers, and the controls
  const E = ECON, c = E.cities[k], set = ED.hubs.has(c.id), ar = autoRank(c);
  const why = set ? 'ตั้งระดับไว้เอง' : EHUB[c.id] || EHUB2[c.id] || 'เพราะเป็น' + (CK[c.kind] || CK.city).name;
  let h = `<div class="tr"><b>${c.rank ? RANKN[c.rank] + ' ระดับ ' + c.rank : 'ไม่เป็นศูนย์กระจายสินค้า'}</b> <span class="w">${esc(why)}</span></div>`;
  if (c.home >= 0) { const p = E.cities[c.home]; h += `<div class="tr">ส่งของผ่าน${RANKN[p.rank]}${esc(p.name)} <span class="w">${c.chosen ? 'ศูนย์ที่เลือกไว้' : 'ศูนย์ที่ใกล้ที่สุดซึ่งระดับสูงกว่า'}</span></div>`; }
  else if (!c.mesh) h += '<div class="tr mine">ยังไม่มีศูนย์ที่ระดับสูงกว่าอยู่ในระยะ</div>';
  const kids = E.cities.filter(x => x.home === k);
  if (kids.length) h += `<div class="tr">รวมของจาก ${kids.length} แห่ง <span class="w">${kids.sort((a, b) => b.rank - a.rank || b.through - a.through).map(x => esc(x.name)).join(' · ')}</span></div>`;
  h += `<div class="tr w">เส้นการค้าที่มาถึงเมืองนี้ ${nl} เส้น · มูลค่าสินค้าที่ผ่านเมืองนี้ ${fmtL(c.through)}${editable && c.sug !== c.rank ? ' · มูลค่านี้เทียบกับเมืองที่คึกคักที่สุดเหมาะกับระดับ ' + c.sug : ''}</div>`;
  if (!editable) return h;
  h += `<div class="optrow"><span class="lbl">ระดับศูนย์</span><div class="seg" id="tdRank"><button type="button" data-r="a" aria-pressed="${!set}">อัตโนมัติ ${ar}</button>${[0, 1, 2, 3].map(r => `<button type="button" data-r="${r}" aria-pressed="${set && c.rank === r}">${r}</button>`).join('')}</div></div>`;
  h += '<div class="tr w">0 ไม่เป็นศูนย์ · 1 ศูนย์ย่อยรวมของจากหมู่บ้านและป้อม · 2 ศูนย์ภาครวมของจากศูนย์ย่อย · 3 ศูนย์หลัก มีเส้นสายใหญ่ถึงศูนย์หลักด้วยกัน</div>';
  if (!c.mesh) {                                    // the centre this place sends its goods to: the nearest above it, or one the user picks
    const pid = ED.tparent.get(c.id), opts = E.cities.map((x, j) => ({ x, j, d: Math.hypot(x.x - c.x, x.y - c.y) })).filter(o => o.j !== k && o.x.rank > c.rank).sort((a, b) => a.d - b.d);
    const shown = opts.slice(0, 12); if (pid && !shown.some(o => o.x.id === pid)) { const o = opts.find(o => o.x.id === pid); if (o) shown.push(o); }
    h += `<div class="optrow"><span class="lbl">ส่งของให้</span><select id="tdPar"><option value="">ศูนย์ที่ใกล้ที่สุดเอง</option>${shown.map(o => `<option value="${esc(o.x.id)}"${o.x.id === pid ? ' selected' : ''}>${esc(o.x.name)} · ${RANKN[o.x.rank]} ระดับ ${o.x.rank}</option>`).join('')}</select></div>`;
  }
  return h;
}
// The city's own tables (v0.13.0, the owner asked to see all of it): everything it makes and every class it prices, each list
// folded or open as the owner left it and in the order of the column last clicked.
const TCV = (() => { const d = { pk: 'amt', pd: -1, ck: 'price', cd: -1, prod: 1, price: 1 }; try { return Object.assign(d, JSON.parse(localStorage.getItem('mme-tc') || '{}')); } catch (err) { return d; } })();
const tcKeep = () => { try { localStorage.setItem('mme-tc', JSON.stringify(TCV)); } catch (err) { /* a browser that keeps nothing */ } };
const tfold = (id, title, body) => `<details class="tfold" data-tfold="${id}"${TCV[id] === 0 ? '' : ' open'}><summary>${title}</summary>${body}</details>`;
const thead = (kind, cols, sk, dir) => `<div class="eth sortable">${cols.map(([k, t]) => `<span data-ts="${kind}:${k}" title="กดเพื่อเรียงตามช่องนี้">${t}${k === sk ? (dir > 0 ? ' ▲' : ' ▼') : ''}</span>`).join('')}</div>`;
const tsort = (rows, sk, dir) => rows.sort((a, b) => (sk === 'name' ? dir * a.name.localeCompare(b.name, 'th') : dir * (a[sk] - b[sk])) || a.name.localeCompare(b.name, 'th'));
function prodHTML(k) {                              // everything the city makes, with its worth at the city's own price and what it could not sell
  const E = ECON, per = ECO.central.per, cols = [['name', 'สินค้า'], ['amt', 'ผลิต'], ['val', 'มูลค่า'], ['left', 'ขายไม่หมด']];
  const rows = [...E.prod[k]].filter(([id, v]) => (!tcat || catOf(id) === tcat) && v > 0.004).map(([id, v]) => { const cat = catOf(id); return { id, cat, name: goodName(id), amt: v, val: v * ECAT[cat].v * (E.P1[k][cat] || 1) * per, left: E.left[k].get(id) || 0 }; });
  const sk = cols.some(c => c[0] === TCV.pk) ? TCV.pk : 'amt', dir = TCV.pd > 0 ? 1 : -1, tot = rows.reduce((a, r) => a + r.val, 0);
  return tfold('prod', `ผลผลิต <small>${rows.length} อย่าง · ${ecoNumF(tot)} ${esc(ECO.central.name)}</small>`, !rows.length ? '<div class="tr w">ไม่มี</div>'
    : `<div class="etable">${thead('p', cols, sk, dir)}` + tsort(rows, sk, dir).map(r => `<div class="etr"><span title="${esc(r.name)}">${chipT(r.cat)}${esc(r.name)}</span><span>${fmtL(r.amt)}</span><span>${ecoNumF(r.val)}</span><span>${r.left >= 0.05 ? fmtL(r.left) : ''}</span></div>`).join('') + `</div><div class="tr w">ผลิตและขายไม่หมดนับเป็นหน่วยสินค้าของแบบจำลอง มูลค่านับตามราคาในเมืองนี้หลังการค้า</div>`);
}
function priceHTML(k) {                             // every class the city makes, uses, buys or sells: its price after trade and its book
  const E = ECON, cols = [['name', 'หมวด'], ['price', 'ราคา'], ['made', 'ผลิต'], ['need', 'ต้องการ'], ['inn', 'ซื้อเข้า'], ['out', 'ขายออก']], rows = [];
  for (const cat of ECATS) {
    if (tcat && cat !== tcat) continue;
    const bk = E.MK[k][cat]; if (!bk || bk[0] + bk[1] + bk[2] + bk[3] <= 0.005) continue;
    rows.push({ cat, name: ECAT[cat].name, p0: E.P0[k][cat], price: ECAT[cat].people ? 1 : E.P1[k][cat], made: bk[0], need: bk[1], inn: bk[2], out: bk[3] });
  }
  const sk = cols.some(c => c[0] === TCV.ck) ? TCV.ck : 'price', dir = TCV.cd > 0 ? 1 : -1;
  return tfold('price', `ราคาและตลาดในเมือง <small>${rows.length} หมวด</small>`, !rows.length ? `<div class="tr w">${tcat ? 'เมืองนี้ไม่ผลิตและไม่ใช้' + esc(ECAT[tcat].name) : 'ไม่มี'}</div>`
    : `<div class="etable g6">${thead('c', cols, sk, dir)}` + tsort(rows, sk, dir).map(r => `<div class="etr"><span title="${esc(r.name)}">${chipT(r.cat)}${esc(r.name)}</span><span title="${ECAT[r.cat].people ? 'ราคาทาสตั้งจากรายได้ต่อหัวเฉลี่ยของแผนที่' : 'ก่อนค้าขาย ' + pctP(r.p0) + ' · ' + priceWord(r.price)}">${ECAT[r.cat].people ? '' : `<b style="color:${priceCol(r.price)}">${pctP(r.price)}</b>`}</span><span>${r.made > 0.004 ? fmtL(r.made) : ''}</span><span>${r.need > 0.004 ? fmtL(r.need) : ''}</span><span>${r.inn > 0.004 ? fmtL(r.inn) : ''}</span><span>${r.out > 0.004 ? fmtL(r.out) : ''}</span></div>`).join('')
    + `</div><div class="tr w">ราคาเป็นร้อยละของราคากลางหลังการค้าของปี ชี้ที่ราคาเพื่อดูราคาก่อนค้าขาย ช่องที่เหลือเป็นหน่วยสินค้าของแบบจำลอง</div>`);
}
function tradeLinkHTML(L) {
  const A = ECON.cities[L.ia], B = ECON.cities[L.ib], v = linkVol(L);
  let h = `<h3>${linkName(L)}</h3><div class="tr"><b>${esc(A.name)} กับ${esc(B.name)}</b></div>`;
  h += `<div class="tr w">${L.tier === 'main' ? 'ระหว่างศูนย์ระดับ 2 ขึ้นไปสองแห่ง' : L.tier === 'trunk' ? 'ระหว่างศูนย์หลักสองแห่ง ของผ่านศูนย์ภาคระหว่างทางโดยไม่ต้องขึ้นฝั่ง' : L.tier === 'branch' ? 'จากเมืองเข้าศูนย์ที่มันส่งของให้' : L.tier === 'lore' ? esc((loreOf(L) || {}).why || 'เส้นประจำ') : editable ? 'เส้นที่วางเพิ่ม' : 'สองเมืองนี้ค้าขายกันเป็นประจำ'}${editable && L.own && L.auto ? ' · ดัดทางหรือเปลี่ยนแบบเส้นไว้' : ''}</div>`;
  h += L.fail ? `<div class="tr mine">หาทางแบบ${esc(LMODE[L.mode])}ระหว่างสองเมืองนี้ไม่ได้ ของจึงไม่วิ่งบนเส้นนี้</div>` : `<div class="tr">${howText(L)}</div>`;
  if (!L.fail) h += v >= 0.03 ? `<div class="tr">ขนส่ง ${fmtL(v)} หน่วย <span class="w">จาก${esc(A.name)} ${fmtL(L.fwd)} · จาก${esc(B.name)} ${fmtL(L.back)}</span></div>` + goodRows([...linkGoods(L)].sort((a, b) => b[1] - a[1]).filter(([, x]) => x >= 0.05).slice(0, 10)) : '<div class="tr w">ยังไม่มีของวิ่ง</div>';
  if (editable) {
    h += `<div class="optrow"><span class="lbl">แบบเส้น</span><div class="seg" id="tdLMode">${Object.entries(LMODE).map(([k, n]) => `<button type="button" data-k="${k}" aria-pressed="${k === L.mode}">${esc(n)}</button>`).join('')}</div></div>`;
    h += `<div class="btns"><button type="button" class="btn" id="tdLFlat"${L.via && L.via.length ? '' : ' disabled'}>ล้างจุดดัด</button><button type="button" class="btn warn" id="tdLDel">ลบเส้นนี้</button><button type="button" class="btn" id="tdLDone">เสร็จ</button></div>`;
    h += `<p class="hint">ลากเส้นเพื่อดัดทาง ลากจุดกลมเพื่อขยับ ดับเบิลคลิกจุดกลมเพื่อเอาออก ดัดลงแม่น้ำหรือทะเลแล้วเส้นจะลงเรือตรงนั้น</p>`;
  }
  return h;
}
function tradeAllHTML() {
  const E = ECON, fs = E.flows.filter(f => !tcat || f.cat === tcat);
  const tot = fs.reduce((a, f) => a + f.amt, 0), wet = fs.filter(f => f.by === 'water').reduce((a, f) => a + f.amt, 0), car = fs.filter(f => f.by === 'caravan').reduce((a, f) => a + f.amt, 0);
  const pct = v => tot ? Math.round(100 * v / tot) : 0, ok = E.links.filter(L => !L.fail);
  const cnt = t => ok.filter(L => L.tier === t).length, hubs = E.cities.filter(c => c.hub);
  let h = `<h3>เครือข่าย</h3><div class="tr">เส้นการค้า ${ok.length} เส้น เส้นสายใหญ่ ${cnt('trunk')} เส้นหลัก ${cnt('main')} เส้นสาขา ${cnt('branch')}${editable ? (cnt('lore') ? ` เส้นประจำ ${cnt('lore')}` : '') + ` เส้นที่วางเพิ่ม ${cnt('user')}` : cnt('lore') + cnt('user') ? ` เส้นประจำ ${cnt('lore') + cnt('user')}` : ''}</div>`;
  const shared = (E.bundles || []).filter(ch => ch.ls.length > 1).length;
  if (shared) h += `<div class="tr w">ช่วงที่หลายเส้นวิ่งร่วมกัน ${shared} ช่วง วาดเป็นเส้นเดียวที่หนาตามของรวม</div>`;
  h += `<div class="tr"><b>ศูนย์กระจายสินค้า ${hubs.length} แห่ง</b></div>`;
  const nk = E.cities.map(() => 0); for (const c of E.cities) if (c.home >= 0) nk[c.home]++;
  for (const l of [3, 2, 1]) {                      // each rank's centres, the busiest first, with how many places send their goods to each
    const at = E.cities.map((c, k) => ({ c, k })).filter(o => o.c.rank === l).sort((a, b) => b.c.through - a.c.through);
    if (at.length) h += `<div class="tr">ระดับ ${l} ${RANKN[l]} <span class="w">${at.map(o => esc(o.c.name) + (nk[o.k] ? ' รวมจาก ' + nk[o.k] + ' แห่ง' : '')).join(' · ')}</span></div>`;
  }
  const up = E.cities.filter(c => c.sug > c.rank).sort((a, b) => b.through - a.through).slice(0, 5);
  if (editable && up.length) h += `<div class="tr w">ของผ่านมากกว่าระดับที่ตั้งไว้ ${up.map(c => esc(c.name) + ' เหมาะกับระดับ ' + c.sug).join(' · ')}</div>`;
  const alone = E.cities.filter((c, k) => !ok.some(L => L.ia === k || L.ib === k));
  if (editable && alone.length) h += `<div class="tr mine">ยังไม่มีเส้นการค้ามาถึง ${alone.map(c => esc(c.name)).join(' · ')}</div>`;
  const bad = E.links.filter(L => L.fail);
  if (editable && bad.length) h += `<div class="tr mine">เส้นที่หาทางไม่ได้ ${bad.length} เส้น</div>`;
  h += `<h3>ภาพรวม${tcat ? ' · ' + esc(ECAT[tcat].name) : ''}</h3><div class="tr">${E.cities.length} เมือง ค้าขาย ${fs.length} คู่ รวม ${fmtL(tot)} หน่วย ทางน้ำล้วน ${pct(wet)}% คาราวานล้วน ${pct(car)}% ที่เหลือต่อกันสองทาง</div>`;
  if (tcat) {
    const pr = E.cities.map((c, k) => ({ c, k, bk: E.MK[k][tcat] })).filter(r => r.bk && (r.bk[0] > 0.01 || r.bk[1] > 0.01)).map(r => ({ ...r, p: E.P1[r.k][tcat] })).sort((a, b) => b.p - a.p);
    if (pr.length) {
      const row = list => list.map(r => `${esc(r.c.name)} <b style="color:${priceCol(r.p)}">${pctP(r.p)}</b>`).join(' · ');
      h += `<h3>ราคา${esc(ECAT[tcat].name)}</h3><div class="tr">แพงสุด <span class="w">${row(pr.slice(0, 4))}</span></div><div class="tr">ถูกสุด <span class="w">${row(pr.slice(-4).reverse())}</span></div>`;
      h += '<div class="tr w">วงสีรอบเมืองบอกราคาหมวดนี้ แดงคือแพงกว่าราคากลาง เขียวอมฟ้าคือถูกกว่า</div>';
    }
  } else h += '<div class="tr w">เลือกหมวดสินค้าเพื่อดูราคาของหมวดนั้นทุกเมืองบนแผนที่</div>';
  const busy = ok.slice().sort((a, b) => linkVol(b) - linkVol(a)).filter(L => linkVol(L) >= 0.05).slice(0, 6);
  if (busy.length) h += `<h3>เส้นที่คึกคักที่สุด</h3>` + busy.map(L => `<div class="tr"><b>${esc(E.cities[L.ia].name)} กับ${esc(E.cities[L.ib].name)}</b> <span class="w">${linkName(L)} · ${fmtL(linkVol(L))} หน่วย</span><br>${topGoods(linkGoods(L), 4)}</div>`).join('');
  const gs = new Map(); for (const f of fs) for (const g in f.goods) gs.set(g, (gs.get(g) || 0) + f.goods[g]);
  if (gs.size) h += `<h3>สินค้าที่ขนมากที่สุด</h3>` + goodRows([...gs].sort((a, b) => b[1] - a[1]).slice(0, 10));
  const lack = E.cities.map(c => ({ c, v: Object.entries(c.short || {}).filter(([cat]) => !tcat || cat === tcat).reduce((a, [cat, v]) => a + v * ECAT[cat].v, 0) })).filter(r => r.v >= 0.3).sort((a, b) => b.v - a.v).slice(0, 6);
  if (lack.length) h += `<h3>เมืองที่ขาดมากที่สุด</h3>` + lack.map(({ c }) => `<div class="tr"><b>${esc(c.name)}</b> <span class="w">${Object.entries(c.short).filter(([cat, v]) => (!tcat || cat === tcat) && v >= 0.05).sort((a, b) => b[1] * ECAT[b[0]].v - a[1] * ECAT[a[0]].v).slice(0, 4).map(([cat]) => esc(ECAT[cat].name)).join(' · ')}</span></div>`).join('');
  h += `<p class="note">ตัวเลขเป็นหน่วยเทียบกันเองในแผนที่นี้ ผลผลิตคิดจากภูมิประเทศรอบเมือง ราคาขึ้นลงตามของที่มีกับของที่ต้องการ ของวิ่งเมื่อส่วนต่างราคาคุ้มค่าขนตามเส้นการค้า</p>`;
  return h;
}
function renderTradeCard() {
  const card = $('tradecard'); card.hidden = mode !== 'trade';
  if (card.hidden) return;
  if (!ECON) { $('tradebody').innerHTML = '<div class="tr w">กำลังคิดการค้า</div>'; return; }
  if (tsel && !ECON.cities.some(c => c.id === tsel)) tsel = null;
  const L = tlsel && ECON.links.find(x => x.id === tlsel);
  if (tlsel && !L && !ED.tlinks.has(tlsel)) tlsel = null;          // a line just laid waits for the network to be worked out again
  const k = tsel ? ECON.cities.findIndex(c => c.id === tsel) : -1;
  $('tradebody').innerHTML = L ? tradeLinkHTML(L) : tlsel ? '<div class="tr w">กำลังหาทางของเส้นนี้</div>' : k >= 0 ? tradeCityHTML(k) : tradeAllHTML();
  if (!editable) return;
  if (L) {
    for (const b of document.querySelectorAll('#tdLMode button')) b.onclick = () => changeLink(L.id, { mode: b.dataset.k });
    $('tdLFlat').onclick = () => changeLink(L.id, { via: [] });
    $('tdLDel').onclick = () => deleteLink(L.id);
    $('tdLDone').onclick = () => selectLink(null);
  } else if (k >= 0) {
    const id = ECON.cities[k].id;
    for (const b of document.querySelectorAll('#tdRank button')) b.onclick = () => setHub(id, b.dataset.r === 'a' ? null : +b.dataset.r);
    const ps = $('tdPar'); if (ps) ps.onchange = () => setParent(id, ps.value || null);
  }
}
const tradeReveal = id => { if (id && window.MME && MME.shell && MME.shell.reveal) MME.shell.reveal('tradecard'); };   // a city's or a line's card is in the side panel (v0.15.1)
function selectTrade(id) { tsel = id || null; tlsel = null; renderTradeCard(); requestDraw(); tradeReveal(id); }
function selectLink(id) { tlsel = id || null; tsel = null; renderTradeCard(); requestDraw(); tradeReveal(id); }

// ---------- editing the network ----------
function changeLink(id, patch) {                    // one step of undo: the line as the user had it (null: the page's own) and as it is now
  const L = ECON && ECON.links.find(x => x.id === id); if (!L || !editable) return;
  const own = ED.tlinks.get(id);
  doOp({ k: 'tl', id, a: own ? { ...own, via: (own.via || []).map(p => [p[0], p[1]]) } : null, b: { ...plainLink(L), ...patch } });
}
function deleteLink(id) {
  if (!ED.tlinks.has(id) && !(ECON && ECON.links.some(x => x.id === id))) return;
  const own = ED.tlinks.get(id), ops = [];
  if (own) ops.push({ k: 'tl', id, a: { ...own }, b: null });
  if (id.startsWith('a:') && !ED.tlhid.has(id)) ops.push({ k: 'tlh+', id });
  if (!ops.length || !editable) return;
  if (tlsel === id) tlsel = null;
  doOp(ops.length === 1 ? ops[0] : { k: 'm', ops });
  flash('ลบเส้นการค้าแล้ว กดย้อนเพื่อเอาคืน');
}
function setHub(id, rank) {                         // a city's rank as a centre (null: as its kind gives); a rank set by hand stays even where it
  const c = ECON && ECON.cities.find(x => x.id === id); if (!c || !editable) return;   // matches the kind, so a later change of kind leaves it
  const a = ED.hubs.has(id) ? ED.hubs.get(id) : null, b = rank == null ? null : Math.max(0, Math.min(3, rank | 0));
  if (a === b) return;
  doOp({ k: 'hub', id, a, b });
  const r = b == null ? autoRank(c) : b;
  flash(r ? `ตั้งเป็น${RANKN[r]}ระดับ ${r} แล้ว เครือข่ายจัดใหม่รอบเมืองนี้` : 'เลิกเป็นศูนย์กระจายสินค้าแล้ว สินค้าของเมืองนี้ไปรวมที่ศูนย์ที่ใกล้ที่สุด');
}
function setParent(id, pid) {                       // the centre a smaller place sends its goods to (null: the nearest above it)
  if (!editable) return;
  const a = ED.tparent.has(id) ? ED.tparent.get(id) : null, b = pid || null;
  if (a === b) return;
  doOp({ k: 'tpar', id, a, b });
  flash(b ? 'เปลี่ยนศูนย์ที่ส่งของให้แล้ว' : 'กลับไปส่งของให้ศูนย์ที่ใกล้ที่สุดแล้ว');
}
function resetNetwork() {
  if (!editable) return;
  const ops = [];
  for (const [id, o] of ED.tlinks) ops.push({ k: 'tl', id, a: { ...o }, b: null });
  for (const id of ED.tlhid) ops.push({ k: 'tlh-', id });
  for (const [id, v] of ED.hubs) ops.push({ k: 'hub', id, a: v, b: null });
  for (const [id, v] of ED.tparent) ops.push({ k: 'tpar', id, a: v, b: null });
  if (!ops.length) { flash('เครือข่ายเป็นแบบอัตโนมัติอยู่แล้ว'); return; }
  tlsel = null; tpend = null;
  doOp({ k: 'm', ops }); flash('คืนเครือข่ายอัตโนมัติแล้ว กดย้อนเพื่อเอาคืน');
}
function tradeClick(x, y) {
  const c = cityAt(x, y);
  if (ttool === 'add' && editable) {                  // laying a line: one city, then another
    if (!c) { if (tpend) { tpend = null; tprev = null; requestDraw(); } return; }
    if (!tpend) { tpend = c.id; tprev = null; requestDraw(); return; }
    if (tpend === c.id) { tpend = null; tprev = null; requestDraw(); return; }
    const o = { id: uid('u'), a: tpend, b: c.id, mode: tmode, via: [] }; tpend = null; tprev = null;
    doOp({ k: 'tl', id: o.id, a: null, b: o }); tlsel = o.id; tsel = null; renderTradeCard(); return;
  }
  if (c) { selectTrade(c.id); return; }
  const ch = chainAt(x, y);
  if (ch) { const ls = chainLines(ch), i = ls.findIndex(L => L.id === tlsel); selectLink(ls[(i + 1) % ls.length].id); return; }   // again: the next line on the stretch
  { const hz = hexAt(x, y), zs = hz >= 0 ? ECO.cells[hz] : '.'; if (zs !== '.' && ECOX.byKey.get(zs)) { selectState(zs); return; } }   // inside a state's borders: that state's balance of trade
  selectTrade(null);
}
function setTtool(t) {
  ttool = t === 'add' ? 'add' : 'pick'; tpend = null; tprev = null;
  segPick('tdTool', 't', ttool, setTtool);
  $('tdMode').hidden = ttool !== 'add';
  $('tdHint').textContent = ttool === 'add'
    ? 'คลิกเมืองต้นทางแล้วคลิกเมืองปลายทาง เส้นใหม่หาทางที่ถูกที่สุดตามแบบที่เลือก อัตโนมัติใช้ทั้งเรือและคาราวาน ทางน้ำใช้เรือ คาราวานไปทางบกอย่างเดียว สินค้าจะเลือกวิ่งบนเส้นใหม่เองถ้าถูกกว่า Esc ยกเลิก'
    : 'สินค้าวิ่งเฉพาะบนเส้นการค้า เมืองที่มีวงทองคือศูนย์กระจายสินค้า จำนวนวงบอกระดับศูนย์ ศูนย์ระดับ 2 ขึ้นไปเชื่อมกันด้วยเส้นหลัก ศูนย์หลักระดับ 3 มีเส้นสายใหญ่ถึงกัน เมืองที่เล็กกว่าส่งของเข้าศูนย์ที่ใกล้ที่สุดซึ่งระดับสูงกว่าด้วยเส้นสาขา เส้นที่วิ่งเลียบกันรวมเป็นเส้นเดียวที่หนาตามของรวม เส้นฟ้าคือช่วงที่ไปทางน้ำ เส้นอำพันคือช่วงที่คาราวานขน เส้นประคือเส้นที่ยังไม่มีของวิ่ง ' + (editable ? 'คลิกเมืองเพื่อดูการค้า ปรับระดับศูนย์ หรือเลือกศูนย์ที่ส่งของให้ คลิกเส้นเพื่อเลือก คลิกซ้ำช่วงที่วิ่งร่วมกันเพื่อเลือกเส้นถัดไป ลากเส้นที่เลือกเพื่อดัดทาง Delete ลบเส้น' : 'คลิกเมืองเพื่อดูการค้าของเมืองนั้น คลิกเส้นเพื่อดูว่าขนอะไร คลิกซ้ำช่วงที่วิ่งร่วมกันเพื่อเลือกเส้นถัดไป');
  requestDraw();
}
function setTmode(m) { tmode = LMODE[m] ? m : 'auto'; tprev = null; segPick('tdMode', 'k', tmode, setTmode); }


// the coastal glow and the phantom haze of the render, as fields to lay over repainted hexes
let hazeCv = null, glowCv = null;
function fieldCanvas(src, w, h, col, ch, k) {
  const cv2 = document.createElement('canvas'); cv2.width = w; cv2.height = h; const c2 = cv2.getContext('2d'), im = c2.createImageData(w, h);
  for (let p = 0; p < w * h; p++) { im.data[p * 4] = col[0]; im.data[p * 4 + 1] = col[1]; im.data[p * 4 + 2] = col[2]; im.data[p * 4 + 3] = Math.round(src[p * 4 + ch] * k); }
  c2.putImageData(im, 0, 0); return cv2;
}
const fimg = new Image();
fimg.onload = () => {
  const w = fimg.naturalWidth, h = fimg.naturalHeight, t = document.createElement('canvas'); t.width = w; t.height = h;
  const tc = t.getContext('2d'); tc.drawImage(fimg, 0, 0); const src = tc.getImageData(0, 0, w, h).data;
  hazeCv = fieldCanvas(src, w, h, [128, 98, 168], 0, 0.5); glowCv = fieldCanvas(src, w, h, [118, 160, 172], 1, 0.42);
  for (let i = 0; i < N; i++) { const x = Math.min(w - 1, Math.max(0, Math.round(CX[i] / G.w * w))), y = Math.min(h - 1, Math.max(0, Math.round(CY[i] / G.h * h))); HZ[i] = src[(y * w + x) * 4] / 255; }
  scheduleEcon(0);
  if (painted.size) rebuildAll();
};
if (D.fields) fimg.src = D.fields;

// ---------- the edits layer: repainted hexes and the user's rivers, at the resolution of the map image ----------
const LS = 1.5, layer = document.createElement('canvas');
layer.width = Math.round(G.w * LS); layer.height = Math.round(G.h * LS);
const LC = layer.getContext('2d');
let layerUsed = false;
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
  x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(G.w, x1); y1 = Math.min(G.h, y1);
  if (x1 <= x0 || y1 <= y0) return;
  const c = LC;
  c.save(); c.setTransform(LS, 0, 0, LS, 0, 0);
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
  for (const r of userRiversSorted()) { const d = RDER.get(r.id); if (d && hits(d.bb, x0, y0, x1, y1)) strokeRiver(c, d.q, d.w, d.s); }
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
  layerUsed = painted.size > 0 || ED.rivers.length > 0;
}
function rebuildAll() { SDC = seaDepths(); LC.setTransform(1, 0, 0, 1, 0, 0); LC.clearRect(0, 0, layer.width, layer.height); rebuild(0, 0, G.w, G.h); SDC = null; }
function rebuildHexes(ids, flip) {
  if (!ids.length) return;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const i of ids) { x0 = Math.min(x0, CX[i]); y0 = Math.min(y0, CY[i]); x1 = Math.max(x1, CX[i]); y1 = Math.max(y1, CY[i]); }
  const m = (flip ? 7 : 2.5) * R;              // a coast that moves reshades the sea around it
  rebuild(x0 - m, y0 - m, x1 + m, y1 + m);
}

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
let drawOverGround = null;                          // what a later part draws straight onto the ground, under rivers of ink, roads, lines and names (the land the cities use)
let drawUnderNames = null;                          // what a later part of the engine draws just under the names (the borders of states)
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
  if (drawOverGround) drawOverGround(ctx, G.w, G.h, true);
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
  if (drawUnderNames) { drawUnderNames(); ctx.setTransform(dpr * view.s, 0, 0, dpr * view.s, dpr * view.x, dpr * view.y); ctx.globalAlpha = 1; }
  drawNames(ctx, px, labelsShown(), citiesShown());
}

// ---------- tools ----------
let mode = 'view', bcode = 'g', bsize = 2, rtool = 'draw', rkind = 'river', rsize = 1, ckind = 'city';
let act = null, pinch = null, riv = null, sel = null, editBase = null, spaceDown = false, overMap = false;
let editable = false;                              // tools unlock once the saved edits have loaded (or the page has no store)
const undoS = [], redoS = [];
function brush(h, size) {
  const seen = new Set([h]); let ring = [h];
  for (let r = 1; r < size; r++) { const nxt = []; for (const u of ring) for (let j = 0; j < 6; j++) { const v = NB[u * 6 + j]; if (v >= 0 && !seen.has(v)) { seen.add(v); nxt.push(v); } } ring = nxt; }
  return [...seen];
}
const chipColor = b => b === 'S' ? '#2c4a64' : b === 'L' ? '#4a7692' : b === 'i' ? '#4e7688' : 'rgb(' + RCOL[b].join(',') + ')';
const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const r1 = v => Math.round(v * 10) / 10;

// every change is an operation that can be done and undone; doing one again over the same state changes nothing
function applyOp(op, dir, fx) {
  if (op.k === 't') {
    for (const [i, c0, c1] of op.ch) {
      const before = eff(i); setCell(i, dir > 0 ? c1 : c0);
      if (isW(before) !== isW(eff(i))) fx.flip = true; fx.hexes.push(i);
    }
    fx.docs.add('terrain');
  } else if (op.k === 'rh') {                       // stretches of the map's rivers hidden (on) or shown again (off)
    for (const key of op.on) { setPair(key, dir > 0); fx.hexes.push(key % N); }
    for (const key of op.off) { setPair(key, dir < 0); fx.hexes.push(key % N); }
    fx.docs.add('terrain');
  } else if (op.k === 'r+' || op.k === 'r-') {
    const add = (op.k === 'r+') === (dir > 0);
    if (add) addRiver(op.r, op.at); else removeRiver(op.r.id);
    fx.rivers.push(op.r); fx.docs.add('rivers');
  } else if (op.k === 'c+' || op.k === 'c-') {
    const add = (op.k === 'c+') === (dir > 0);
    if (add) addCity(op.c, op.at); else removeCity(op.c.id);
    fx.docs.add('cities');
  } else if (op.k === 'c~') {
    const c = ownCity(op.id); if (c) Object.assign(c, dir > 0 ? op.b : op.a); fx.docs.add('cities');
  } else if (op.k === 'bh+' || op.k === 'bh-') {
    if ((op.k === 'bh+') === (dir > 0)) ED.bhid.add(op.id); else ED.bhid.delete(op.id);
    fx.docs.add('cities');
  } else if (op.k === 'lb') {                       // a map label as the user has it (null: the page's own, or none for a label of the user's)
    const o = dir > 0 ? op.b : op.a;
    if (o) ED.labels.set(op.id, { ...o }); else ED.labels.delete(op.id);
    fx.docs.add('marks');
  } else if (op.k === 'lh+' || op.k === 'lh-') {   // one of the page's own labels removed, or brought back
    if ((op.k === 'lh+') === (dir > 0)) ED.lhid.add(op.id); else ED.lhid.delete(op.id);
    fx.docs.add('marks');
  } else if (op.k === 'rt') {                       // a road or trade route as the user has it (null: the page's own road, or none)
    const o = dir > 0 ? op.b : op.a;
    if (o) ED.routes.set(op.id, { ...o, via: (o.via || []).map(p => [p[0], p[1]]) }); else ED.routes.delete(op.id);
    fx.docs.add('routes');
  } else if (op.k === 'rth+' || op.k === 'rth-') { // one of the page's own roads removed, or brought back
    if ((op.k === 'rth+') === (dir > 0)) ED.rthid.add(op.id); else ED.rthid.delete(op.id);
    fx.docs.add('routes');
  } else if (op.k === 'pt') {                       // a lore point as the user has it (null: the page's own, or none)
    const o = dir > 0 ? op.b : op.a;
    if (o) ED.points.set(op.id, { ...o }); else ED.points.delete(op.id);
    fx.hexes.push(...refreshPTF(op.id)); fx.docs.add('info'); fx.info = true;
  } else if (op.k === 'ph+' || op.k === 'ph-') {
    if ((op.k === 'ph+') === (dir > 0)) ED.phid.add(op.id); else ED.phid.delete(op.id);
    fx.hexes.push(...refreshPTF(op.id)); fx.docs.add('info'); fx.info = true;
  } else if (op.k === 'zi' || op.k === 'bi' || op.k === 'ki') {   // the user's text for a zone, a kind of ground or a kind of point
    const o = dir > 0 ? op.b : op.a, m = INFO[op.k].map();
    if (o) m.set(op.key, { ...o }); else m.delete(op.key);
    fx.docs.add('info'); fx.info = true;
  } else if (op.k === 'tl') {                       // a trade line as the user has it (null: the page's own line, or none)
    const o = dir > 0 ? op.b : op.a;
    if (o) ED.tlinks.set(op.id, { ...o, via: (o.via || []).map(p => [p[0], p[1]]) }); else ED.tlinks.delete(op.id);
    fx.docs.add('trade');
  } else if (op.k === 'tlh+' || op.k === 'tlh-') { // one of the page's own trade lines removed, or brought back
    if ((op.k === 'tlh+') === (dir > 0)) ED.tlhid.add(op.id); else ED.tlhid.delete(op.id);
    fx.docs.add('trade');
  } else if (op.k === 'hub') {                      // a city's rank as a centre, 0 to 3; null: as its kind gives
    const o = dir > 0 ? op.b : op.a;
    if (o == null) ED.hubs.delete(op.id); else ED.hubs.set(op.id, o);
    fx.docs.add('trade');
  } else if (op.k === 'tpar') {                     // the centre a city sends its goods to; null: the nearest above it
    const o = dir > 0 ? op.b : op.a;
    if (o == null) ED.tparent.delete(op.id); else ED.tparent.set(op.id, o);
    fx.docs.add('trade');
  } else if (op.k === 'st') {                       // Mount Stanther's great peak to another hex (null: its first place)
    const before = stPeak(); setStan(dir > 0 ? op.b : op.a);
    fx.rects.push(stanRect(before), stanRect(stPeak()), stanRect(D.stpeak)); fx.docs.add('marks'); fx.stan = true;
  } else if (op.k === 'm') {
    for (const o of dir > 0 ? op.ops : op.ops.slice().reverse()) applyOp(o, dir, fx);
  }
}
const newFx = () => ({ docs: new Set(), hexes: [], rivers: [], rects: [], flip: false, info: false });
function settle(fx) {
  if (fx.rivers.length) buildUserSamples();
  if (fx.hexes.length > 4000 || fx.rivers.length > 6) rebuildAll();
  else {
    if (fx.hexes.length) rebuildHexes(fx.hexes, fx.flip);
    for (const r of fx.rivers) { const bb = bbox(smoothLine(r.pts), (RK[r.kind] || RK.river).w + 3 * R); rebuild(bb[0], bb[1], bb[2], bb[3]); }
    for (const rc of fx.rects) rebuild(rc[0], rc[1], rc[2], rc[3]);
  }
  layerUsed = painted.size > 0 || ED.rivers.length > 0;
  for (const d of fx.docs) scheduleSave(d);
  if (fx.stan || ['terrain', 'rivers', 'cities'].some(d => fx.docs.has(d))) bumpRoutes();   // the ground, the rivers, the cities or the great peak moved: routes are found again
  if (fx.info) infoChanged();
  if (fx.docs.has('trade')) scheduleEcon(20);       // an edit of the network shows at once
  else if (fx.stan || fx.info || ['terrain', 'rivers', 'cities', 'routes'].some(d => fx.docs.has(d))) scheduleEcon();   // the trade follows the map
  updateStats(); requestDraw();
}
function pushOp(op) { undoS.push(op); if (undoS.length > 400) undoS.shift(); redoS.length = 0; updateHistory(); }
function doOp(op) { const fx = newFx(); applyOp(op, 1, fx); pushOp(op); settle(fx); }
function addRiver(r, at) {
  if (ED.rivers.some(x => x.id === r.id)) return;
  const o = { id: r.id, kind: r.kind, pts: r.pts.map(p => [p[0], p[1]]) };
  if (at != null && at >= 0 && at <= ED.rivers.length) ED.rivers.splice(at, 0, o); else ED.rivers.push(o);
  derive(o);
}
function removeRiver(id) { const k = ED.rivers.findIndex(x => x.id === id); if (k >= 0) ED.rivers.splice(k, 1); RDER.delete(id); }
function addCity(c, at) {
  if (ownCity(c.id)) return;
  const o = { id: c.id, name: c.name, kind: c.kind, note: c.note, x: c.x, y: c.y };
  if (at != null && at >= 0 && at <= ED.cities.length) ED.cities.splice(at, 0, o); else ED.cities.push(o);
}
function removeCity(id) { const k = cityIdx(id); if (k >= 0) ED.cities.splice(k, 1); }
function undo() {
  if (riv && riv.pts.length) { riv.pts.pop(); if (!riv.pts.length) riv = null; requestDraw(); return; }
  commitCityEdit(); commitLabelEdit(true); commitInfo(); const op = undoS.pop(); if (!op) return;
  const fx = newFx(); applyOp(op, -1, fx); redoS.push(op); settle(fx); afterHistory();
}
function redo() {
  commitCityEdit(); commitLabelEdit(true); commitInfo(); const op = redoS.pop(); if (!op) return;
  const fx = newFx(); applyOp(op, 1, fx); undoS.push(op); settle(fx); afterHistory();
}
function afterHistory() {
  updateHistory();
  if (sel && !visibleCities().some(c => c.id === sel)) selectCity(null); else refreshForm();
  afterLabels(); afterRoutes();
}
function afterRoutes() {                            // the chosen route and the info card after undo, redo or a load
  if (rsel && !visibleRoutes().some(r => r.id === rsel)) selectRoute(null); else refreshRouteForm();
  if (isel && isel.t === 'pt' && !visiblePoints().some(p => p.id === isel.id)) isel = null;
  if (mode === 'info') renderInfoCard();
}
function afterLabels() {                            // the chosen name after undo, redo or a load: gone, or shown as it is now
  if (!lsel) return;
  if (!visibleLabels().some(l => l.id === lsel)) dropLabelSel(); else { rebaseLabel(); refreshLabelForm(); }
}
function updateHistory() { $('undo').disabled = !editable || (!undoS.length && !(riv && riv.pts.length)); $('redo').disabled = !editable || !redoS.length; }

// terrain brush, and the river eraser
function paintHex(t, changed) {
  const c1 = bcode === 'restore' || bcode === BI[t] ? '.' : bcode;
  if (ED.cells[t] !== c1) {
    if (!act.ch.has(t)) act.ch.set(t, ED.cells[t]);
    const before = eff(t); setCell(t, c1); if (isW(before) !== isW(eff(t))) act.flip = true;
    changed.push(t);
  }
  if (bcode === 'restore' && ED.hide[t]) for (const k of HEXLINES.get(t) || []) hidePair(k * N + t, false, changed);   // the map's own river comes back too
}
function hidePair(key, on, changed) {
  if (HIDK.has(key) === on) return;
  if (!act.pr.has(key)) act.pr.set(key, !on);
  setPair(key, on); changed.push(key % N);
}
// how far the eraser reaches: the thin size takes the line under the pointer, the others a circle of about one and two hexes
const eraseReach = () => rsize === 1 ? Math.max(4 / view.s, 1.2) : rsize === 2 ? R * 1.5 : R * 3;
function eraseHits(x, y, lock) {
  // what an erase at this point takes: for each line of the map's rivers the hexes of its stretches in reach, and the user's rivers in reach
  const rad = eraseReach(), lines = new Map(), users = [], gap = new Map();
  nearSamples(BS, x, y, rad + HWMAX, j => {
    const h = BS.hex[j], d = Math.hypot(BS.x[j] - x, BS.y[j] - y) - BS.hw[j];
    if (h < 0 || d >= rad) return;
    const k = BS.line[j]; let s = lines.get(k); if (!s) lines.set(k, s = new Set()); s.add(h);
    gap.set('b' + k, Math.min(gap.get('b' + k) ?? 1e9, d));
  });
  for (const r of ED.rivers) {
    const d = RDER.get(r.id); if (!d || !hits(d.bb, x - rad, y - rad, x + rad, y + rad)) continue;
    let g = 1e9; for (let i = 0; i < d.q.length - 1; i++) g = Math.min(g, segDist(x, y, d.q[i], d.q[i + 1]) - d.w / 2);
    if (g < rad) { users.push(r.id); gap.set('u' + r.id, g); }
  }
  // the thin size takes one line: the one the stroke is already on, else the nearest; through a confluence
  // the other lines stay, unless the stroke leaves its line and goes on along one of them
  if (rsize === 1 && gap.size) {
    let keep = lock && lock.size ? [...gap.keys()].filter(c => lock.has(c)) : [];
    if (!keep.length) { let best = null, bd = 1e9; for (const [c, d] of gap) if (d < bd) { bd = d; best = c; } keep = [best]; if (lock) lock.add(best); }
    const K = new Set(keep);
    for (const k of [...lines.keys()]) if (!K.has('b' + k)) lines.delete(k);
    for (let i = users.length - 1; i >= 0; i--) if (!K.has('u' + users[i])) users.splice(i, 1);
  }
  return { lines, users };
}
function eraseAt(x, y, changed) {
  const { lines, users } = eraseHits(x, y, act.lock);
  for (const [k, hs] of lines) for (const h of hs) hidePair(k * N + h, true, changed);
  for (const id of users) {
    const r = ED.rivers.find(v => v.id === id), d = RDER.get(id); if (!r || !d) continue;
    act.gone.push({ k: 'r-', r: { id: r.id, kind: r.kind, pts: r.pts }, at: ED.rivers.indexOf(r) });
    removeRiver(id); buildUserSamples(); const bb = bbox(d.q, d.w + 3 * R); rebuild(bb[0], bb[1], bb[2], bb[3]);
  }
}
function strokeTo(mx, my) {
  const erase = act.k === 'erase', step = erase ? Math.max(0.6, Math.min(R * 0.5, eraseReach() * 0.7)) : R * 0.5;
  const a = act.last || [mx, my], dx = mx - a[0], dy = my - a[1], n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / step));
  const changed = [];
  for (let s = act.last ? 1 : 0; s <= n; s++) {
    const x = a[0] + dx * s / n, y = a[1] + dy * s / n;
    if (erase) { eraseAt(x, y, changed); continue; }
    const h = hexAt(x, y);
    if (h >= 0 && h !== act.lastHex) { act.lastHex = h; for (const i of brush(h, bsize)) paintHex(i, changed); }
  }
  act.last = [mx, my];
  if (changed.length) { rebuildHexes(changed, act.flip); act.flip = false; layerUsed = painted.size > 0 || ED.rivers.length > 0; updateStats(); }
  requestDraw();
}
function segDist(x, y, a, b) {
  const vx = b[0] - a[0], vy = b[1] - a[1], L2 = vx * vx + vy * vy, t = L2 ? Math.max(0, Math.min(1, ((x - a[0]) * vx + (y - a[1]) * vy) / L2)) : 0;
  return Math.hypot(x - a[0] - t * vx, y - a[1] - t * vy);
}
function endStroke(cancel) {
  const ch = [...act.ch].map(([i, c0]) => [i, c0, ED.cells[i]]).filter(x => x[1] !== x[2]);
  const on = [], off = [];
  for (const [key, was] of act.pr) { const now = HIDK.has(key); if (now !== was) (now ? on : off).push(key); }
  const ops = [];
  if (ch.length) ops.push({ k: 't', ch });
  if (on.length || off.length) ops.push({ k: 'rh', on, off });
  ops.push(...act.gone);
  if (!ops.length) return;
  if (cancel) { const fx = newFx(); applyOp({ k: 'm', ops }, -1, fx); settle(fx); return; }
  pushOp(ops.length === 1 ? ops[0] : { k: 'm', ops });
  bumpRoutes();
  if (ch.length || on.length || off.length) scheduleSave('terrain');
  if (act.gone.length) scheduleSave('rivers');
  updateStats();
}

// river pen
function finishRiver() {
  if (!riv) return;
  const pts = [];
  for (const p of riv.pts) if (!pts.length || Math.hypot(p[0] - pts[pts.length - 1][0], p[1] - pts[pts.length - 1][1]) >= 1.5) pts.push([r1(p[0]), r1(p[1])]);
  const kind = riv.kind; riv = null;
  if (pts.length >= 2) doOp({ k: 'r+', r: { id: uid('r'), kind, pts } });
  updateHistory(); requestDraw();
}
function cancelRiver() { riv = null; updateHistory(); requestDraw(); }

// cities
function cityAt(mx, my) {                         // the marker first, then the name above it
  if (!citiesShown()) return null;
  let best = null, bd = (12 / view.s) ** 2;
  const all = visibleCities();
  for (const v of all) { const d = (v.x - mx) ** 2 + (v.y - my) ** 2; if (d < bd) { bd = d; best = v; } }
  if (best) return best;
  for (const v of all) { const b = LBL.get(v.id); if (b && mx >= b[0] && mx <= b[2] && my >= b[1] && my <= b[3]) return v; }
  return null;
}
const fieldsOf = c => ({ name: c.name, kind: c.kind, note: c.note, x: c.x, y: c.y });
const sameFields = (a, b) => a.name === b.name && a.kind === b.kind && a.note === b.note && a.x === b.x && a.y === b.y;
function makeOverride(id) {
  const b = D.cities.find(c => c.id === id); if (!b) return null;
  const o = { id, name: b.name, kind: b.kind || 'city', note: b.note, x: b.x, y: b.y };
  doOp({ k: 'c+', c: o }); return ownCity(id);
}
function selectCity(id) {
  commitCityEdit(); sel = id || null; editBase = null;
  const v = sel && visibleCities().find(c => c.id === sel);
  if (!v) sel = null;
  $('cityNew').classList.toggle('pane-off', !!sel); $('cityForm').classList.toggle('pane-off', !sel);
  if (sel) refreshForm();
  requestDraw();
}
function refreshForm() {
  if (!sel) return;
  const v = visibleCities().find(c => c.id === sel); if (!v) return;
  $('cfName').value = v.name || ''; $('cfKind').value = CK[v.kind] ? v.kind : 'city'; $('cfNote').value = v.note || '';
  $('cfHint').textContent = isBuiltin(sel) ? 'เมืองนี้มากับแผนที่ ย้ายหรือแก้ได้ ค่าที่แก้จะใช้แทนค่าเดิม' : '';
  const own = ownCity(sel); editBase = own ? fieldsOf(own) : null;
}
function cityInput() {
  if (!sel || !editable) return;
  let c = ownCity(sel);
  if (!c) { c = makeOverride(sel); if (!c) return; editBase = fieldsOf(c); }
  c.name = $('cfName').value.slice(0, 60); c.kind = CK[$('cfKind').value] ? $('cfKind').value : 'city'; c.note = $('cfNote').value.slice(0, 600);
  scheduleSave('cities'); requestDraw();
}
function commitCityEdit() {
  if (!sel || !editBase) return;
  const c = ownCity(sel); if (!c) { editBase = null; return; }
  const now = fieldsOf(c); if (!sameFields(now, editBase)) pushOp({ k: 'c~', id: sel, a: editBase, b: now });
  editBase = now;
}
// Mount Stanther to another hex: the great peak, the city on its summit and its name move as one, in one step of undo
function moveStanther(H) {
  const P0 = stPeak(); if (H < 0 || H === P0) return;
  if (isW(eff(H))) { flash('วางภูเขาลงในน้ำไม่ได้'); return; }
  const dx = CX[H] - CX[P0], dy = CY[H] - CY[P0], ops = [{ k: 'st', a: ED.stan, b: H === D.stpeak ? null : H }];
  if (!ED.bhid.has('stanther')) {
    const own = ownCity('stanther'), b0 = D.cities.find(c => c.id === 'stanther');
    if (own) ops.push({ k: 'c~', id: 'stanther', a: { x: own.x, y: own.y }, b: { x: r1(own.x + dx), y: r1(own.y + dy) } });
    else if (b0) ops.push({ k: 'c+', c: { id: 'stanther', name: b0.name, kind: b0.kind || 'city', note: b0.note, x: r1(b0.x + dx), y: r1(b0.y + dy) } });
  }
  const L = visibleLabels().find(l => l.id === 'stanther');
  if (L) { const now = ED.labels.get('stanther'); ops.push({ k: 'lb', id: 'stanther', a: now ? { ...now } : null, b: { ...plainLabel(L), x: r1(L.x + dx), y: r1(L.y + dy) } }); }
  doOp({ k: 'm', ops });
  if (sel === 'stanther') refreshForm();
  if (lsel === 'stanther') { rebaseLabel(); refreshLabelForm(); }
}
// place names: chosen, edited and removed like cities; the page's own names too.
// An edit runs on the user's own copy of the name; it becomes one step of undo when the field is left (or the name let go)
let lsel = null, leditBase = null, lfresh = false, lsize = 'mid';
const sameLabel = (a, b) => ['text', 'x', 'y', 'size', 'ang', 'color'].every(k => a[k] === b[k]);
function rebaseLabel() { const own = lsel && ED.labels.get(lsel); leditBase = own ? { ...own } : null; lfresh = false; }
function selectLabel(id) {
  commitLabelEdit();
  lsel = id && visibleLabels().some(l => l.id === id) ? id : null;
  rebaseLabel();
  $('labelNew').classList.toggle('pane-off', !!lsel); $('labelForm').classList.toggle('pane-off', !lsel);
  if (lsel) refreshLabelForm();
  requestDraw();
}
function dropLabelSel() { lsel = null; leditBase = null; lfresh = false; selectLabel(null); }   // the chosen name is gone: let it go without committing
function refreshLabelForm() {
  if (!lsel) return;
  const v = visibleLabels().find(l => l.id === lsel); if (!v) return;
  $('lfText').value = v.text || ''; $('lfSize').value = v.size; $('lfAng').value = String(v.ang); $('lfAngV').textContent = v.ang + '°';
  for (const b of document.querySelectorAll('#lfColor button')) b.setAttribute('aria-pressed', String(b.dataset.c === v.color));
  $('lfHint').textContent = baseLabel(lsel) ? 'ชื่อนี้มากับแผนที่ แก้ ย้าย หรือลบได้ ค่าที่แก้จะใช้แทนค่าเดิม' : 'ชื่อที่ใส่เพิ่ม ล้างข้อความจนว่างแล้วกด Enter ก็ลบชื่อนี้ได้';
}
function labelEdit(patch) {
  if (!lsel || !editable) return;
  let o = ED.labels.get(lsel);
  if (!o) { const L = baseLabel(lsel); if (!L) return; o = labelOf(L); ED.labels.set(lsel, o); lfresh = true; }   // the first change to one of the page's names
  Object.assign(o, patch);
  scheduleSave('marks'); updateStats(); requestDraw();
}
function commitLabelEdit(quiet) {
  if (!lsel) return;
  const id = lsel, o = ED.labels.get(id);
  if (!o || (!lfresh && !leditBase)) { rebaseLabel(); return; }
  const was = lfresh ? null : leditBase;            // the name as it stood before this edit (null: the page's own)
  lfresh = false; leditBase = { ...o };
  if (!String(o.text || '').trim()) {               // a name emptied out is a name removed, in one step of undo
    if (was) ED.labels.set(id, { ...was }); else ED.labels.delete(id);
    const ops = [];
    if (was) ops.push({ k: 'lb', id, a: { ...was }, b: null });
    if (baseLabel(id)) ops.push({ k: 'lh+', id });
    lsel = null; leditBase = null;
    $('labelNew').classList.remove('pane-off'); $('labelForm').classList.add('pane-off');
    if (ops.length) doOp(ops.length === 1 ? ops[0] : { k: 'm', ops }); else { scheduleSave('marks'); updateStats(); requestDraw(); }
    if (!quiet) flash('ลบชื่อที่ว่างแล้ว กดย้อนเพื่อเอาคืน');
    return;
  }
  if (!was || !sameLabel(o, was)) pushOp({ k: 'lb', id, a: was ? { ...was } : null, b: { ...o } });
}
function deleteLabel() {
  if (!lsel || !editable) return;
  commitLabelEdit();
  if (!lsel) return;                                // an emptied name is already gone
  const id = lsel, own = ED.labels.get(id), ops = [];
  if (own) ops.push({ k: 'lb', id, a: { ...own }, b: null });
  if (baseLabel(id)) ops.push({ k: 'lh+', id });
  selectLabel(null);
  if (ops.length) doOp(ops.length === 1 ? ops[0] : { k: 'm', ops });
  flash('ลบชื่อแล้ว กดย้อนเพื่อเอาคืน');
}
function newLabelId() { let id; do id = uid('n'); while (baseLabel(id) || ED.labels.has(id)); return id; }
function deleteCity() {
  if (!sel || !editable) return;
  commitCityEdit();
  const id = sel, own = ownCity(id), ops = [];
  for (const [rid, r] of ED.routes) if (!baseRoad(rid) && (r.a === id || r.b === id)) ops.push({ k: 'rt', id: rid, a: { ...r }, b: null });
  for (const [lid, o] of ED.tlinks) if (o.a === id || o.b === id) ops.push({ k: 'tl', id: lid, a: { ...o }, b: null });
  if (ED.hubs.has(id)) ops.push({ k: 'hub', id, a: ED.hubs.get(id), b: null });
  for (const [cid, pid] of ED.tparent) if (cid === id || pid === id) ops.push({ k: 'tpar', id: cid, a: pid, b: null });
  if (own) ops.push({ k: 'c-', c: { ...own }, at: cityIdx(id) });
  if (isBuiltin(id)) ops.push({ k: 'bh+', id });
  selectCity(null);
  if (ops.length) doOp(ops.length === 1 ? ops[0] : { k: 'm', ops });
  flash('ลบเมืองแล้ว กดย้อนเพื่อเอาคืน');
}

// ---------- laying roads ----------
let rcls = 'royal', rsel = null, rpend = null, rprev = null;
const ROADS_OF = id => visibleRoutes().filter(r => r.a === id || r.b === id);
function endAt(mx, my) {                            // a city under the pointer, or the spot itself on land
  const c = cityAt(mx, my); if (c) return c.id;
  const h = hexAt(mx, my); if (h < 0 || isW(eff(h))) return null;
  return [r1(mx), r1(my)];
}
function makeRoute(cls, a, b) { return { id: uid('d'), t: 'road', cls, a, b, via: [] }; }
function selectRoute(id) {
  rsel = id || null; rpend = null; rprev = null;
  if (rsel && !visibleRoutes().some(r => r.id === rsel)) rsel = null;
  $('routeNew').classList.toggle('pane-off', !!rsel); $('routeForm').classList.toggle('pane-off', !rsel);
  refreshRouteForm(); requestDraw();
}
function refreshRouteForm() {
  if (!rsel) return;
  const r = visibleRoutes().find(v => v.id === rsel); if (!r) return;
  const g = geoOf(r);
  let t = `${routeName(r)} จาก${endName(r.a)} ถึง${endName(r.b)}`;
  if (g && !g.fail) t += ` · ยาว ${g.len} ช่อง` + (g.bridges.length ? ` · สะพาน ${g.bridges.length}` : '') + (g.tunnels ? ` · อุโมงค์ ${g.tunnels}` : '');
  else t += ' · หาทางไม่ได้';
  $('rfInfo').textContent = t;
  $('rfCls').innerHTML = Object.entries(RDC).map(([k, v]) => `<button type="button" data-k="${k}" aria-pressed="${k === r.cls}">${esc(v.name)}</button>`).join('');
  for (const b of document.querySelectorAll('#rfCls button')) b.onclick = () => changeRoute(r.id, { cls: b.dataset.k });
  $('rfFlat').disabled = !(r.via && r.via.length);
}
function changeRoute(id, patch) {                   // one step of undo: the route as it was (null: the page's own road) and as it is now
  const r = visibleRoutes().find(v => v.id === id); if (!r || !editable) return;
  const own = ED.routes.get(id);
  doOp({ k: 'rt', id, a: own ? { ...own } : null, b: { ...plainRoute(r), ...patch } });
  refreshRouteForm();
}
function deleteRoute(id) {
  const own = ED.routes.get(id), ops = [];
  if (own) ops.push({ k: 'rt', id, a: { ...own }, b: null });
  if (baseRoad(id)) ops.push({ k: 'rth+', id });
  if (!ops.length) return;
  if (rsel === id) selectRoute(null);
  doOp(ops.length === 1 ? ops[0] : { k: 'm', ops });
  flash('ลบเส้นแล้ว กดย้อนเพื่อเอาคืน');
}
// a new city's road to its nearest city, and roads for every city that has none
function autoRoad(c) {
  const h = landHex(hexAt(c.x, c.y)); if (h < 0) return null;
  ensureRoutes();
  const n = nearestCity(h, c.id); if (!n) return null;
  const o = cityById(n.id), id = uid('d');
  return { k: 'rt', id, a: null, b: { id, t: 'road', cls: autoCls(c.kind, o ? o.kind : 'city'), a: c.id, b: n.id, via: [] } };
}
function connectLoose(quiet) {
  if (!editable) return 0;
  ensureRoutes();
  const has = new Set(); for (const r of visibleRoutes()) if (r.t === 'road') { if (typeof r.a === 'string') has.add(r.a); if (typeof r.b === 'string') has.add(r.b); }
  const ops = [];
  for (const c of visibleCities()) {
    if (has.has(c.id)) continue;
    const op = autoRoad(c); if (!op) continue;
    ops.push(op); has.add(c.id); has.add(op.b.b);
  }
  if (ops.length) doOp(ops.length === 1 ? ops[0] : { k: 'm', ops });
  if (!quiet) flash(ops.length ? `ต่อถนนให้ ${ops.length} เมืองแล้ว` : 'ทุกเมืองมีถนนแล้ว');
  return ops.length;
}
function setRoadCls(k) {
  rcls = RDC[k] ? k : 'royal'; rpend = null; rprev = null;
  $('rtCls').innerHTML = Object.entries(RDC).map(([q, v]) => `<button type="button" data-k="${q}">${esc(v.name)}</button>`).join('');
  segPick('rtCls', 'k', rcls, setRoadCls);
  $('rtHint').textContent = 'คลิกเมืองต้นทางแล้วคลิกเมืองปลายทาง ถนนจะหาทางที่สั้นที่สุดเอง เลี่ยงภูเขา แม่น้ำใหญ่ และป่าบรรพกาล ถ้าเลี่ยงไม่ได้จะมีอุโมงค์หรือสะพาน คลิกที่ว่างเพื่อเริ่มหรือจบที่จุดนั้น คลิกเส้นที่มีอยู่เพื่อเลือก แล้วลากเส้นเพื่อดัดทาง Esc ยกเลิก เมืองที่วางใหม่ยังไม่มีถนน กดปุ่มต่อถนนเพื่อต่อให้ คาราวานใช้ถนนที่วางไว้';
  requestDraw();
}
function drawnLine(r, g) { return g.q; }
function routeClick(x, y) {
  const c = cityAt(x, y);
  if (!c && rpend == null) { const r = routeAt(x, y); if (r) { selectRoute(r.id); return; } }
  if (rsel) { selectRoute(null); if (!c) return; }   // a click away lets the chosen route go; a click on a city starts a new one at once
  const e = c ? c.id : endAt(x, y);
  if (e == null) { flash('เริ่มหรือจบเส้นในน้ำไม่ได้'); return; }
  if (rpend == null) { rpend = e; rprev = null; requestDraw(); return; }
  if (JSON.stringify(e) === JSON.stringify(rpend)) { rpend = null; rprev = null; requestDraw(); return; }   // the same place twice lets it go
  const route = makeRoute(rcls, rpend, e); rpend = null; rprev = null;
  ensureRoutes(); const g = routeGeom(route);
  if (!g || g.fail) { flash('หาทางระหว่างสองจุดนี้ไม่ได้'); requestDraw(); return; }
  doOp({ k: 'rt', id: route.id, a: null, b: route }); selectRoute(route.id);
}
// bending: a waypoint is put where the line is grabbed, between the stops of the leg it was grabbed on
function legAt(g, x, y) {
  let best = 0, bd = 1e9;
  for (let i = 0; i < g.raw.length - 1; i++) { const d = segDist(x, y, g.raw[i], g.raw[i + 1]); if (d < bd) { bd = d; best = i; } }
  let leg = 0; for (let l = 0; l < g.legs.length; l++) if (best >= g.legs[l]) leg = l;
  return leg;
}
function handleAt(r, mx, my) {
  const lim = Math.max(3, 8 / view.s);
  for (let i = 0; i < (r.via || []).length; i++) if (Math.hypot(r.via[i][0] - mx, r.via[i][1] - my) <= lim) return i;
  return -1;
}
// ---------- cities that stand where they should not ----------
// The page lists the cities of the user's own map that sit on a mountain, in the haze they guard, or on top of another city,
// each with a hex nearby that suits it better. A proposal applies with one click and one step of undo; a city the user has
// moved since the proposal was written drops out of the list.
const FIXES = Array.isArray(D.fixes) ? D.fixes : [];
function activeFixes() {
  const vc = new Map(visibleCities().map(c => [c.id, c]));
  return FIXES.filter(f => { const c = vc.get(f.id); return c && Math.hypot(c.x - f.from[0], c.y - f.from[1]) <= 2; });
}
function applyFixes(list) {
  if (!editable || !list.length) return;
  const ops = [];
  for (const f of list) {
    const own = ownCity(f.id), b = D.cities.find(c => c.id === f.id);
    if (own) ops.push({ k: 'c~', id: f.id, a: { x: own.x, y: own.y }, b: { x: f.x, y: f.y } });
    else if (b) ops.push({ k: 'c+', c: { id: b.id, name: b.name, kind: b.kind || 'city', note: b.note, x: f.x, y: f.y } });
  }
  if (!ops.length) return;
  doOp(ops.length === 1 ? ops[0] : { k: 'm', ops });
  flash(ops.length === 1 ? 'ย้ายเมืองตามข้อเสนอแล้ว กดย้อนเพื่อเอาคืน' : `ย้ายเมืองตามข้อเสนอ ${ops.length} เมืองแล้ว กดย้อนเพื่อเอาคืน`);
}
function lookAt(x, y, z) {                          // the view on a point of the map, at z times the whole-map scale
  const w = box.clientWidth - padR() - padL(), h = boxH(); view.s = fitS * z; clampView();
  view.x = padL() + w / 2 - x * view.s; view.y = h / 2 - y * view.s; clampView(); requestDraw();
}
function renderFixes() {
  const card = $('fixcard'), list = mode === 'city' && editable ? activeFixes() : [];
  card.hidden = !list.length; if (card.hidden) return;
  $('fixbody').innerHTML = list.map(f => `<div class="tr"><b>${esc(f.name)}</b> <span class="w">${esc(f.why)}</span><div class="btns"><button type="button" class="btn" data-fix="${esc(f.id)}">ย้ายตามข้อเสนอ</button><button type="button" class="btn" data-see="${esc(f.id)}">ดูบนแผนที่</button></div></div>`).join('')
    + (list.length > 1 ? '<div class="btns"><button type="button" class="btn" id="fixAll">ย้ายทั้งหมด</button></div>' : '')
    + '<p class="note">เส้นประบนแผนที่ชี้จากที่ตั้งตอนนี้ไปช่องที่เสนอ ถนนกับเส้นการค้าของเมืองหาทางใหม่เอง กดย้อนได้ทุกครั้ง</p>';
  for (const b of document.querySelectorAll('#fixbody [data-fix]')) b.onclick = () => applyFixes(activeFixes().filter(f => f.id === b.dataset.fix));
  for (const b of document.querySelectorAll('#fixbody [data-see]')) b.onclick = () => { const f = FIXES.find(x => x.id === b.dataset.see); if (f) { lookAt((f.from[0] + f.x) / 2, (f.from[1] + f.y) / 2, 4); selectCity(f.id); } };
  const all = $('fixAll'); if (all) all.onclick = () => applyFixes(activeFixes());
}
function drawFixes(c, px) {                         // in the city mode: a dashed arrow from each such city to the hex proposed for it
  if (mode !== 'city' || !editable) return;
  for (const f of activeFixes()) {
    const v = visibleCities().find(x => x.id === f.id); if (!v) continue;
    const ang = Math.atan2(f.y - v.y, f.x - v.x), r = 5 * px;
    c.beginPath(); c.moveTo(v.x, v.y); c.lineTo(f.x - Math.cos(ang) * r, f.y - Math.sin(ang) * r);
    c.setLineDash([4 * px, 3 * px]); c.lineWidth = 1.8 * px; c.strokeStyle = '#ffd678'; c.stroke(); c.setLineDash([]);
    c.beginPath(); c.arc(f.x, f.y, r, 0, 2 * Math.PI); c.lineWidth = 2 * px; c.strokeStyle = '#ffd678'; c.stroke();
  }
}
function drawHandles(c, px) {
  if (mode === 'route' && rpend != null) {          // where the route being laid starts
    const e = endPoint(rpend);
    if (e) { c.beginPath(); c.arc(e.x, e.y, 7 * px, 0, 2 * Math.PI); c.setLineDash([3 * px, 2 * px]); c.lineWidth = 1.8 * px; c.strokeStyle = '#ffd678'; c.stroke(); c.setLineDash([]); }
  }
  const r = rsel && visibleRoutes().find(v => v.id === rsel); if (!r) return;
  const via = act && act.k === 'rbend' && act.id === r.id ? act.via : r.via || [];
  for (const p of via) { c.beginPath(); c.arc(p[0], p[1], 4.2 * px, 0, 2 * Math.PI); c.fillStyle = '#fff4d6'; c.fill(); c.lineWidth = 1.5 * px; c.strokeStyle = '#2a2116'; c.stroke(); }
}
function liveRoute() {                              // what the canvas shows instead of the stored line: a bend in progress, or a route being laid
  if (act && act.k === 'rbend') return { id: act.id, geo: act.geo };
  if (mode === 'route' && rpend != null && cursor) {
    const b = endAt(cursor[0], cursor[1]); if (b == null) return null;
    const key = JSON.stringify([rcls, rpend, typeof b === 'string' ? b : hexAt(b[0], b[1]), RT_EPOCH]);
    if (!rprev || rprev.key !== key) { ensureRoutes(); rprev = { key, geo: routeGeom({ t: 'road', cls: rcls, a: rpend, b, via: [] }) }; }
    return { id: null, t: 'road', cls: rcls, geo: rprev.geo };
  }
  return null;
}

// ---------- the page's own information: zones, kinds of ground, lore points ----------
// overrides by key; an edit runs on a copy and is one step of undo when its field is left
const zoneInfo = c => { const z = ZONE[c] || { name: '', lore: '', placed: '' }, o = ED.zinfo.get(c); return o ? { ...z, ...o } : z; };
const biomeInfo = b => { const z = BIOME[b], o = ED.binfo.get(b); return o ? { ...z, ...o } : z; };
const kindInfo = k => { const z = D.pointKinds[k], o = ED.kinfo.get(k); return o ? { ...z, ...o } : z; };
const INFO = { zi: { map: () => ED.zinfo, keys: ['name', 'lore', 'placed'], base: c => ZONE[c] }, bi: { map: () => ED.binfo, keys: ['name', 'note'], base: b => BIOME[b] }, ki: { map: () => ED.kinfo, keys: ['name', 'note'], base: k => D.pointKinds[k] } };
let iedit = null;                                   // { t, key, was }
function infoEdit(t, key, patch) {
  if (!editable) return;
  if (!iedit || iedit.t !== t || iedit.key !== key) { commitInfo(); const cur = t === 'pt' ? ED.points.get(key) : INFO[t].map().get(key); iedit = { t, key, was: cur ? { ...cur } : null }; }
  if (t === 'pt') {
    let o = ED.points.get(key);
    if (!o) { const p = PTB.get(key); if (!p) return; o = { id: p.id, k: p.k, x: p.x, y: p.y, name: '', note: '' }; ED.points.set(key, o); }
    Object.assign(o, patch);
    const hs = refreshPTF(key); if (hs.length) { rebuildHexes(hs, false); layerUsed = true; }   // a changed kind: the map's own glyph is painted out
  } else {
    const m = INFO[t].map(); let o = m.get(key);
    if (!o) { const b = INFO[t].base(key); o = {}; for (const f of INFO[t].keys) o[f] = b[f] || ''; m.set(key, o); }
    Object.assign(o, patch);
  }
  scheduleSave('info'); infoChanged(); requestDraw();
}
function commitInfo() {
  if (!iedit) return;
  const { t, key, was } = iedit; iedit = null;
  const cur = t === 'pt' ? ED.points.get(key) : INFO[t].map().get(key);
  const now = cur ? { ...cur } : null;
  if (JSON.stringify(now) !== JSON.stringify(was)) pushOp(t === 'pt' ? { k: 'pt', id: key, a: was, b: now } : { k: t, key, a: was, b: now });
}
function resetInfo(t, key) {
  commitInfo();
  const cur = INFO[t].map().get(key); if (!cur) return;
  doOp({ k: t, key, a: { ...cur }, b: null }); renderInfoCard();
}
function infoChanged() { updateLegend(); paletteNames(); updatePointsLegend(); if (mode === 'terrain') setBrush(bcode); }
// lore points: the page's own (by id) unless changed or removed, then the user's own
const PTB = new Map(PTS.map(p => [p.id, p]));
const PTF = new Set();                              // hexes of the page's own points that moved, changed kind or went: redrawn without them
const bakedOk = (p, o) => !o || (o.x === p.x && o.y === p.y && o.k === p.k);
function refreshPTF(id) {
  const p = PTB.get(id); if (!p || p.h < 0) return [];
  const want = ED.phid.has(id) || !bakedOk(p, ED.points.get(id)), had = PTF.has(p.h) && PTFBY.get(p.h).has(id);
  if (want === had) return [];
  let s = PTFBY.get(p.h); if (!s) PTFBY.set(p.h, s = new Set());
  if (want) s.add(id); else s.delete(id);
  if (s.size) PTF.add(p.h); else PTF.delete(p.h);
  updPainted(p.h); return [p.h];
}
const PTFBY = new Map();
function refreshAllPTF() { const hs = []; for (const p of PTS) hs.push(...refreshPTF(p.id)); return hs; }
function visiblePoints() {
  const out = [];
  for (const p of PTS) { if (ED.phid.has(p.id)) continue; const o = ED.points.get(p.id); out.push(o ? { ...p, ...o, h: hexAt(o.x, o.y), base: true, baked: bakedOk(p, o) } : { ...p, name: '', note: '', base: true, baked: true }); }
  for (const [id, o] of ED.points) if (!PTB.has(id)) out.push({ ...o, h: hexAt(o.x, o.y), base: false, baked: false });
  if (act && act.k === 'pdrag' && act.pos) for (const v of out) if (v.id === act.id) { v.x = act.pos[0]; v.y = act.pos[1]; v.baked = false; }
  return out;
}
function drawLoosePoints(c, px) {                   // points not in the map image: placed, moved or changed by the user
  for (const p of visiblePoints()) {
    if (p.baked || !POINTFN[p.k] || (p.h >= 0 && isW(eff(p.h)))) continue;
    POINTFN[p.k](c, p.x, p.y);
  }
  if (c === ctx && mode === 'info' && isel && isel.t === 'pt') {
    const p = visiblePoints().find(v => v.id === isel.id);
    if (p) { c.beginPath(); c.arc(p.x, p.y - 1.5, 7.5, 0, 2 * Math.PI); c.setLineDash([3 * px, 2 * px]); c.lineWidth = 1.5 * px; c.strokeStyle = '#cfa95e'; c.stroke(); c.setLineDash([]); }
  }
}
function pointAt(mx, my) {
  const lim = Math.max(6, 9 / view.s); let best = null, bd = lim;
  for (const p of visiblePoints()) { const d = Math.hypot(p.x - mx, p.y - 1.5 - my); if (d < bd) { bd = d; best = p; } }
  return best;
}
let isel = null, iptool = 'pick', ipkind = 'ruin';
function selectInfo(s) { commitInfo(); isel = s; renderInfoCard(); requestDraw(); }
function setIptool(t) {
  iptool = t === 'point' ? 'point' : 'pick'; segPick('ifTool', 't', iptool, setIptool);
  $('ifKind').hidden = iptool !== 'point';
  $('ifKind').innerHTML = Object.keys(D.pointKinds).map(k => `<button type="button" data-k="${k}">${esc(kindInfo(k).name)}</button>`).join('');
  segPick('ifKind', 'k', ipkind, k => { ipkind = k; setIptool(iptool); });
  $('ifHint').textContent = iptool === 'pick'
    ? 'คลิกช่องบนแผนที่เพื่อแก้ชื่อและเรื่องของเขต กับชื่อและคำอธิบายของภูมิประเทศ ช่องแก้อยู่ในแถบด้านข้าง คลิกจุดสำคัญเพื่อแก้หรือลบ ลากจุดเพื่อย้าย'
    : 'คลิกที่ว่างบนแผ่นดินเพื่อวางจุดชนิดที่เลือก ลากจุดเพื่อย้าย คลิกจุดเพื่อแก้ชื่อและบันทึกของจุดนั้น';
}
function renderInfoCard() {
  const card = $('infocard'); card.hidden = mode !== 'info';
  if (card.hidden) return;
  const body = $('infobody');
  if (!isel) { body.innerHTML = '<p class="hint">คลิกช่องหรือจุดบนแผนที่เพื่อแก้ข้อมูลของแผนที่ ชื่อและข้อความที่แก้จะขึ้นในการ์ดของช่อง คำอธิบายภูมิประเทศ และรายการด้านล่างทันที</p>'; return; }
  const ro = !editable ? ' disabled' : '';
  if (isel.t === 'hex') {
    const h = isel.h, zc = zoneOf(h), b = eff(h), z = zc !== '.' ? zoneInfo(zc) : null, bi = biomeInfo(b);
    body.innerHTML = (z ? `<h3>เขต: ${esc(z.name)}</h3>
      <label class="full">ชื่อเขต <input id="izName" maxlength="60" value="${esc(z.name)}"${ro}></label>
      <label class="full">เรื่องของเขต <textarea id="izLore" rows="5" maxlength="1200"${ro}>${esc(z.lore)}</textarea></label>
      <label class="full">ข้อมูลเพิ่มเติม <textarea id="izPlaced" rows="2" maxlength="600"${ro}>${esc(z.placed || '')}</textarea></label>
      <div class="btns"><button type="button" class="btn" id="izReset"${ED.zinfo.has(zc) ? '' : ' disabled'}>คืนข้อความเดิมของเขต</button></div>` : '<p class="hint">ช่องนี้ไม่อยู่ในเขตใด</p>')
      + `<h3>ภูมิประเทศ: ${esc(bi.name)}</h3>
      <label class="full">ชื่อ <input id="ibName" maxlength="60" value="${esc(bi.name)}"${ro}></label>
      <label class="full">คำอธิบาย <textarea id="ibNote" rows="3" maxlength="600"${ro}>${esc(bi.note || '')}</textarea></label>
      <div class="btns"><button type="button" class="btn" id="ibReset"${ED.binfo.has(b) ? '' : ' disabled'}>คืนข้อความเดิมของภูมิประเทศ</button></div>
      <p class="hint">ชื่อและคำอธิบายที่แก้ใช้กับทุกช่องของเขตหรือภูมิประเทศเดียวกัน</p>`;
    if (z) {
      const zf = () => infoEdit('zi', zc, { name: $('izName').value.slice(0, 60), lore: $('izLore').value.slice(0, 1200), placed: $('izPlaced').value.slice(0, 600) });
      for (const id of ['izName', 'izLore', 'izPlaced']) { $(id).addEventListener('input', zf); $(id).addEventListener('change', commitInfo); }
      $('izReset').onclick = () => resetInfo('zi', zc);
    }
    const bf = () => infoEdit('bi', b, { name: $('ibName').value.slice(0, 60), note: $('ibNote').value.slice(0, 600) });
    for (const id of ['ibName', 'ibNote']) { $(id).addEventListener('input', bf); $(id).addEventListener('change', commitInfo); }
    $('ibReset').onclick = () => resetInfo('bi', b);
    return;
  }
  const p = visiblePoints().find(v => v.id === isel.id); if (!p) { isel = null; renderInfoCard(); return; }
  const ki = kindInfo(p.k);
  body.innerHTML = `<h3>จุดสำคัญ: ${esc(p.name || ki.name)}</h3>
    <label>ชนิด <select id="ipKind"${ro}>${Object.keys(D.pointKinds).map(k => `<option value="${k}"${k === p.k ? ' selected' : ''}>${esc(kindInfo(k).name)}</option>`).join('')}</select></label>
    <label class="full">ชื่อจุดนี้ <input id="ipName" maxlength="60" value="${esc(p.name || '')}" placeholder="${esc(ki.name)}"${ro}></label>
    <label class="full">บันทึกของจุดนี้ <textarea id="ipNote" rows="3" maxlength="600" placeholder="${esc(ki.note)}"${ro}>${esc(p.note || '')}</textarea></label>
    <div class="btns"><button type="button" class="btn warn" id="ipDel"${ro}>ลบจุดนี้</button></div>
    <h3>ทุกจุดชนิด${esc(ki.name)}</h3>
    <label class="full">ชื่อชนิด <input id="ikName" maxlength="60" value="${esc(ki.name)}"${ro}></label>
    <label class="full">คำอธิบายชนิด <textarea id="ikNote" rows="3" maxlength="600"${ro}>${esc(ki.note || '')}</textarea></label>
    <div class="btns"><button type="button" class="btn" id="ikReset"${ED.kinfo.has(p.k) ? '' : ' disabled'}>คืนข้อความเดิมของชนิดนี้</button></div>
    <p class="hint">ชื่อจุดกับบันทึกของจุดเว้นว่างไว้ได้ การ์ดจะใช้ชื่อและคำอธิบายของชนิดแทน</p>`;
  const pf = () => infoEdit('pt', p.id, { name: $('ipName').value.slice(0, 60), note: $('ipNote').value.slice(0, 600) });
  for (const id of ['ipName', 'ipNote']) { $(id).addEventListener('input', pf); $(id).addEventListener('change', commitInfo); }
  $('ipKind').addEventListener('change', () => { infoEdit('pt', p.id, { k: D.pointKinds[$('ipKind').value] ? $('ipKind').value : p.k }); commitInfo(); renderInfoCard(); });
  $('ipDel').onclick = () => deletePoint(p.id);
  const kf = () => infoEdit('ki', p.k, { name: $('ikName').value.slice(0, 60), note: $('ikNote').value.slice(0, 600) });
  for (const id of ['ikName', 'ikNote']) { $(id).addEventListener('input', kf); $(id).addEventListener('change', commitInfo); }
  $('ikReset').onclick = () => resetInfo('ki', p.k);
}
function deletePoint(id) {
  if (!editable) return;
  commitInfo();
  const own = ED.points.get(id), ops = [];
  if (own) ops.push({ k: 'pt', id, a: { ...own }, b: null });
  if (PTB.has(id)) ops.push({ k: 'ph+', id });
  if (!ops.length) return;
  isel = null; doOp(ops.length === 1 ? ops[0] : { k: 'm', ops }); renderInfoCard();
  flash('ลบจุดแล้ว กดย้อนเพื่อเอาคืน');
}
function placePoint(x, y) {
  const h = hexAt(x, y); if (h < 0 || isW(eff(h))) { flash('วางจุดในน้ำไม่ได้'); return; }
  const o = { id: uid('p'), k: ipkind, x: r1(x), y: r1(y), name: '', note: '' };
  doOp({ k: 'pt', id: o.id, a: null, b: o }); selectInfo({ t: 'pt', id: o.id });
}
function paletteNames() { for (const s of document.querySelectorAll('#pal .sw')) if (s.dataset.b !== 'restore') s.lastChild.textContent = biomeInfo(s.dataset.b).name; }
function updatePointsLegend() {
  const vis = visiblePoints();
  $('points').innerHTML = Object.entries(D.pointKinds).map(([k, p]) =>
    `<div class="lg"><span class="chip" style="background:${p.color}"></span><span>${esc(kindInfo(k).name)}</span><span class="n">${vis.filter(q => q.k === k).length}</span></div>`).join('')
    + `<div class="lg"><span class="chip" style="background:radial-gradient(circle,#2a2116 30%,#f5e7b8 32%)"></span><span>เมือง</span><span class="n">${visibleCities().length}</span></div>`;
}

// ---------- pointer, touch and keys ----------
const toMap = (ex, ey) => { const r = cv.getBoundingClientRect(); return [(ex - r.left - view.x) / view.s, (ey - r.top - view.y) / view.s]; };
function clampView() {
  const pl = padL(), w = box.clientWidth - padR() - pl, h = boxH();
  view.s = Math.max(fitS, Math.min(fitS * 6, view.s));
  const mw = G.w * view.s, mh = G.h * view.s;      // a map smaller than the room left by the panels sits in its middle; a larger one may be dragged until its edge shows
  view.x = mw <= w + 0.5 ? pl + (w - mw) / 2 : Math.min(pl, Math.max(pl + w - mw, view.x));
  view.y = mh <= h + 0.5 ? (h - mh) / 2 : Math.min(0, Math.max(h - mh, view.y));
}
function zoomAt(f, sx, sy) { const s0 = view.s; view.s *= f; clampView(); const k = view.s / s0; view.x = sx - (sx - view.x) * k; view.y = sy - (sy - view.y) * k; clampView(); requestDraw(); }
cv.addEventListener('wheel', e => { e.preventDefault(); const r = cv.getBoundingClientRect(); zoomAt(e.deltaY < 0 ? 1.18 : 1 / 1.18, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
$('zin').onclick = () => zoomAt(1.4, padL() + (box.clientWidth - padR() - padL()) / 2, cv.clientHeight / 2);
$('zout').onclick = () => zoomAt(1 / 1.4, padL() + (box.clientWidth - padR() - padL()) / 2, cv.clientHeight / 2);
$('zfit').onclick = () => fit();
const bn = $('names');
bn.onclick = () => { showNames = !showNames; bn.setAttribute('aria-pressed', String(showNames)); requestDraw(); };
const bcn = $('cnames');
bcn.setAttribute('aria-pressed', String(showCityNames));
bcn.onclick = () => {
  showCityNames = !showCityNames; bcn.setAttribute('aria-pressed', String(showCityNames));
  try { localStorage.setItem('gresland-city-names', showCityNames ? '1' : '0'); } catch (err) { /* the choice lasts this visit */ }
  requestDraw();
};
const ptrs = new Map();
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('pointerdown', e => {
  ptrs.set(e.pointerId, [e.clientX, e.clientY]);
  try { cv.setPointerCapture(e.pointerId); } catch (err) { /* capture is a nicety */ }
  if (ptrs.size === 2) { abortAct(); const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, m: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], s: view.s, vx: view.x, vy: view.y }; return; }
  if (ptrs.size > 2 || pinch) return;
  hideTip(true); hot = -1;
  const [mx, my] = toMap(e.clientX, e.clientY);
  if (e.pointerType !== 'mouse') { const tc = cityAt(mx, my), tid = tc ? tc.id : null; if (tid !== tapCity) { tapCity = tid; requestDraw(); } }   // a tap shows a small place's name until the next tap
  // in the view mode and the city mode a city (its marker or its name), a map label, or Mount Stanther can be picked up and moved;
  // in the place-name mode only the names
  if (e.button === 0 && editable && !spaceDown && (mode === 'view' || mode === 'city' || mode === 'label')) {
    const pk = mode === 'label' ? (lab => lab ? { k: 'label', id: lab } : null)(labelAt(mx, my)) : pickAt(mx, my);
    if (pk && pk.k === 'city') {
      commitCityEdit(); cv.classList.add('drag');
      act = { k: 'cdrag', id: pk.v.id, sx: e.clientX, sy: e.clientY, d: [pk.v.x - mx, pk.v.y - my], pos: null }; requestDraw(); return;
    }
    if (pk && pk.k === 'label') {
      const v = visibleLabels().find(l => l.id === pk.id); commitCityEdit(); commitLabelEdit(); cv.classList.add('drag');
      act = { k: 'ldrag', id: pk.id, sx: e.clientX, sy: e.clientY, d: [v.x - mx, v.y - my], pos: null }; requestDraw(); return;
    }
    if (pk && pk.k === 'stan') {
      const P = stPeak(); commitCityEdit(); cv.classList.add('drag');
      act = { k: 'sdrag', sx: e.clientX, sy: e.clientY, d: [CX[P] - mx, CY[P] - my], target: -1 }; requestDraw(); return;
    }
  }
  if (e.button === 0 && editable && !spaceDown && mode === 'route') {
    // the chosen route: grabbed on a waypoint, that waypoint moves; grabbed on its line, a new waypoint goes there
    const r = rsel && visibleRoutes().find(v => v.id === rsel), g = r && geoOf(r);
    if (r && g && !g.fail) {
      const hi = handleAt(r, mx, my);
      if (hi >= 0 || distToLine(drawnLine(r, g), mx, my) <= Math.max(3, 7 / view.s)) {
        const via = (r.via || []).map(p => [p[0], p[1]]); let at = hi;
        if (at < 0) { at = legAt(g, mx, my); via.splice(at, 0, [r1(mx), r1(my)]); }
        cv.classList.add('drag');
        act = { k: 'rbend', id: r.id, at, via, sx: e.clientX, sy: e.clientY, moved: false, geo: g }; requestDraw(); return;
      }
    }
    act = { k: 'rnew', sx: e.clientX, sy: e.clientY, at: [mx, my], vx: view.x, vy: view.y }; return;
  }
  if (e.button === 0 && !spaceDown && mode === 'trade') {
    // the chosen line: grabbed on a waypoint, that waypoint moves; grabbed on the line, a new waypoint goes there
    const L = editable && ttool === 'pick' && tlsel && ECON ? ECON.links.find(x => x.id === tlsel) : null;
    if (L && L.geo) {
      const hi = viaAt(L.via || [], mx, my);
      if (hi >= 0 || linkDist(L, null, mx, my) <= Math.max(3, 7 / view.s)) {
        const via = (L.via || []).map(p => [p[0], p[1]]); let at = hi;
        if (at < 0) { at = linkLegAt(L, mx, my); via.splice(at, 0, [r1(mx), r1(my)]); }
        cv.classList.add('drag');
        act = { k: 'tbend', id: L.id, at, via, sx: e.clientX, sy: e.clientY, moved: false, geo: L.geo, hi, px: [mx, my] }; requestDraw(); return;
      }
    }
    act = { k: 'tnew', sx: e.clientX, sy: e.clientY, at: [mx, my], vx: view.x, vy: view.y }; return;
  }
  if (e.button === 0 && editable && !spaceDown && mode === 'info') {
    const p = pointAt(mx, my);
    if (p) { commitInfo(); cv.classList.add('drag'); act = { k: 'pdrag', id: p.id, sx: e.clientX, sy: e.clientY, d: [p.x - mx, p.y - my], pos: null }; requestDraw(); return; }
    act = { k: 'inew', sx: e.clientX, sy: e.clientY, at: [mx, my], vx: view.x, vy: view.y }; return;
  }
  if (e.button === 0 && !spaceDown && mode === 'climate') { act = { k: 'wnew', sx: e.clientX, sy: e.clientY, at: [mx, my], vx: view.x, vy: view.y }; return; }
  if (mode === 'view' || !editable || e.button === 1 || e.button === 2 || spaceDown) {
    act = { k: 'pan', x: e.clientX, y: e.clientY, vx: view.x, vy: view.y }; cv.classList.add('pan'); return;
  }
  if (e.button !== 0) return;
  if (mode === 'terrain' || (mode === 'river' && rtool === 'erase')) { act = { k: mode === 'terrain' ? 'paint' : 'erase', ch: new Map(), pr: new Map(), gone: [], lock: new Set(), last: null, lastHex: -1, flip: false }; strokeTo(mx, my); }
  else if (mode === 'river') { if (!riv) riv = { pts: [], kind: rkind }; act = { k: 'rdraw', sx: e.clientX, sy: e.clientY, start: [mx, my], free: false }; }
  else if (mode === 'city') act = { k: 'cnew', sx: e.clientX, sy: e.clientY, at: [mx, my], vx: view.x, vy: view.y };
  else if (mode === 'label') act = { k: 'lnew', sx: e.clientX, sy: e.clientY, at: [mx, my], vx: view.x, vy: view.y };
});
cv.addEventListener('pointermove', e => {
  if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, [e.clientX, e.clientY]);
  if (pinch) {
    if (ptrs.size < 2) return;
    const [a, b] = [...ptrs.values()], r = cv.getBoundingClientRect();
    const s = Math.max(fitS, Math.min(fitS * 6, pinch.s * Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch.d));
    const mx = (pinch.m[0] - r.left - pinch.vx) / pinch.s, my = (pinch.m[1] - r.top - pinch.vy) / pinch.s;
    view.s = s; view.x = (a[0] + b[0]) / 2 - r.left - mx * s; view.y = (a[1] + b[1]) / 2 - r.top - my * s; clampView(); requestDraw(); return;
  }
  const [mx, my] = toMap(e.clientX, e.clientY); cursor = [mx, my];
  if (act) {
    if (act.k === 'pan') { view.x = act.vx + e.clientX - act.x; view.y = act.vy + e.clientY - act.y; clampView(); requestDraw(); return; }
    if (act.k === 'paint' || act.k === 'erase') { strokeTo(mx, my); return; }
    const far = Math.hypot(e.clientX - act.sx, e.clientY - act.sy) > 4;
    if (act.k === 'rdraw') {
      if (!act.free && far) { act.free = true; const l = riv.pts[riv.pts.length - 1]; if (!l || Math.hypot(l[0] - act.start[0], l[1] - act.start[1]) > 1.5) riv.pts.push(act.start); }
      if (act.free) { const l = riv.pts[riv.pts.length - 1]; if (Math.hypot(l[0] - mx, l[1] - my) >= Math.max(3, 5 / view.s)) riv.pts.push([mx, my]); }
      requestDraw(); return;
    }
    if (act.k === 'cdrag' || act.k === 'ldrag') { if (far || act.pos) act.pos = [r1(Math.max(0, Math.min(G.w, mx + act.d[0]))), r1(Math.max(0, Math.min(G.h, my + act.d[1])))]; requestDraw(); return; }
    if (act.k === 'sdrag') { if (far || act.target >= 0) act.target = hexAt(mx + act.d[0], my + act.d[1]); requestDraw(); return; }
    if (act.k === 'pdrag') { if (far || act.pos) act.pos = [r1(Math.max(0, Math.min(G.w, mx + act.d[0]))), r1(Math.max(0, Math.min(G.h, my + act.d[1])))]; requestDraw(); return; }
    if (act.k === 'tbend') {
      if (!act.moved && !far) return;
      act.moved = true; act.via[act.at] = [r1(Math.max(0, Math.min(G.w, mx))), r1(Math.max(0, Math.min(G.h, my)))];
      if (!act.pend) {                              // the course is found again once a frame, not once an event
        act.pend = true;
        requestAnimationFrame(() => {
          const a = act; if (!a || a.k !== 'tbend') return; a.pend = false;
          const L = ECON && ECON.links.find(x => x.id === a.id);
          if (L) { const A = ECON.cities[L.ia], B = ECON.cities[L.ib], r = eRoute({ ...L, via: a.via }, A, B); if (r) a.geo = eGeo(r.states, A, B); }
          requestDraw();
        });
      }
      return;
    }
    if (act.k === 'rbend') {
      if (!act.moved && !far) return;
      act.moved = true; act.via[act.at] = [r1(Math.max(0, Math.min(G.w, mx))), r1(Math.max(0, Math.min(G.h, my)))];
      if (!act.pend) {                              // the course is found again once a frame, not once an event
        act.pend = true;
        requestAnimationFrame(() => {
          const a = act; if (!a || a.k !== 'rbend') return; a.pend = false;
          const r = visibleRoutes().find(v => v.id === a.id); if (r) { ensureRoutes(); const g = routeGeom({ ...r, via: a.via }); if (g && !g.fail) a.geo = g; }
          requestDraw();
        });
      }
      return;
    }
    if ((act.k === 'cnew' || act.k === 'lnew' || act.k === 'rnew' || act.k === 'inew' || act.k === 'tnew' || act.k === 'wnew') && far) { act = { k: 'pan', x: act.sx, y: act.sy, vx: act.vx, vy: act.vy }; cv.classList.add('pan'); }   // dragging open ground moves the map
    return;
  }
  const hc = cityAt(mx, my), hid = hc ? hc.id : null;
  if (hid !== hoverCity) { hoverCity = hid; requestDraw(); }
  cv.classList.toggle('overcity', editable && (mode === 'label' ? !!labelAt(mx, my) : mode === 'info' ? !!pointAt(mx, my) : mode === 'route' ? !!(cityAt(mx, my) || routeAt(mx, my)) : (mode === 'view' || mode === 'city') && !!pickAt(mx, my)));
  cv.classList.toggle('pick', mode === 'trade' && !!(cityAt(mx, my) || chainAt(mx, my)));
  if (mode === 'trade') { showTradeTip(mx, my, e); return; }
  if (mode === 'climate') { const id = hexAt(mx, my); cv.classList.toggle('pick', !!hc); if (id !== hot) { hot = id; requestDraw(); } showClimTip(mx, my, e, id); return; }
  if (mode === 'view') {
    const id = hexAt(mx, my);
    if (id !== hot) { hot = id; requestDraw(); }
    if (id >= 0) showTip(id, mx, my, e); else hideTip(true);
  } else requestDraw();
});
function endPointer(e, cancel) {
  ptrs.delete(e.pointerId);
  if (pinch) { if (ptrs.size < 2) pinch = null; return; }
  if (!act) return;
  const a = act; act = null; cv.classList.remove('pan'); cv.classList.remove('drag');
  if (a.k === 'paint' || a.k === 'erase') { act = a; endStroke(cancel); act = null; return; }
  if (cancel) { requestDraw(); return; }
  const [mx, my] = toMap(e.clientX, e.clientY);
  if (a.k === 'rdraw') {
    if (a.free) { const l = riv.pts[riv.pts.length - 1]; if (Math.hypot(l[0] - mx, l[1] - my) > 1.5) riv.pts.push([mx, my]); finishRiver(); }
    else { const l = riv.pts[riv.pts.length - 1]; if (!l || Math.hypot(l[0] - mx, l[1] - my) > 4 / view.s) riv.pts.push([mx, my]); updateHistory(); requestDraw(); }
  } else if (a.k === 'cdrag') {
    if (a.pos) {
      const own = ownCity(a.id);
      if (own) doOp({ k: 'c~', id: a.id, a: { x: own.x, y: own.y }, b: { x: a.pos[0], y: a.pos[1] } });
      else { const b = D.cities.find(c => c.id === a.id); if (b) doOp({ k: 'c+', c: { id: b.id, name: b.name, kind: b.kind || 'city', note: b.note, x: a.pos[0], y: a.pos[1] } }); }
    }
    if (mode === 'city') { if (a.id !== sel) selectCity(a.id); else refreshForm(); }   // the form opens after the drag, so the bar never shifts mid-move
    else refreshForm();
  } else if (a.k === 'ldrag') {
    if (a.pos) {
      const v = visibleLabels().find(l => l.id === a.id), now = ED.labels.get(a.id);
      if (v) doOp({ k: 'lb', id: a.id, a: now ? { ...now } : null, b: { ...plainLabel(v), x: a.pos[0], y: a.pos[1] } });
    }
    if (mode === 'label') { if (a.id !== lsel) selectLabel(a.id); else { rebaseLabel(); refreshLabelForm(); } }
  } else if (a.k === 'lnew' && Math.hypot(e.clientX - a.sx, e.clientY - a.sy) <= 4) {
    if (lsel) selectLabel(null);                  // a click beside the chosen name lets it go; the next click places a new one
    else {
      const o = { id: newLabelId(), text: 'ชื่อใหม่', x: r1(a.at[0]), y: r1(a.at[1]), size: lsize, ang: 0, color: '#f3ead2' };
      doOp({ k: 'lb', id: o.id, a: null, b: o }); selectLabel(o.id); const t = $('lfText'); t.focus(); t.select();
    }
  } else if (a.k === 'rbend') {
    if (a.moved) {
      const r = visibleRoutes().find(v => v.id === a.id), own = ED.routes.get(a.id);
      if (r) doOp({ k: 'rt', id: a.id, a: own ? { ...own } : null, b: { ...plainRoute(r), via: a.via.map(p => [r1(p[0]), r1(p[1])]) } });
      refreshRouteForm();
    }
  } else if (a.k === 'rnew' && Math.hypot(e.clientX - a.sx, e.clientY - a.sy) <= 4) {
    routeClick(a.at[0], a.at[1]);
  } else if (a.k === 'pdrag') {
    if (a.pos) {
      const h = hexAt(a.pos[0], a.pos[1]), p = visiblePoints().find(v => v.id === a.id), own = ED.points.get(a.id);
      if (h < 0 || isW(eff(h))) flash('วางจุดในน้ำไม่ได้');
      else if (p) doOp({ k: 'pt', id: a.id, a: own ? { ...own } : null, b: { id: p.id, k: p.k, x: a.pos[0], y: a.pos[1], name: p.name || '', note: p.note || '' } });
    }
    selectInfo({ t: 'pt', id: a.id });
  } else if (a.k === 'tnew' && Math.hypot(e.clientX - a.sx, e.clientY - a.sy) <= 4) {
    tradeClick(a.at[0], a.at[1]);
  } else if (a.k === 'wnew' && Math.hypot(e.clientX - a.sx, e.clientY - a.sy) <= 4) {
    climClick(a.at[0], a.at[1]);
  } else if (a.k === 'tbend') {
    if (a.moved) changeLink(a.id, { via: a.via.map(p => [r1(p[0]), r1(p[1])]) });
    else if (a.hi < 0) tradeClick(a.px[0], a.px[1]);   // a click on the line, not on a waypoint
  } else if (a.k === 'inew' && Math.hypot(e.clientX - a.sx, e.clientY - a.sy) <= 4) {
    if (iptool === 'point') placePoint(a.at[0], a.at[1]);
    else { const h = hexAt(a.at[0], a.at[1]); selectInfo(h >= 0 ? { t: 'hex', h } : null); }
  } else if (a.k === 'sdrag') {
    if (a.target >= 0) moveStanther(a.target);
  } else if (a.k === 'cnew' && Math.hypot(e.clientX - a.sx, e.clientY - a.sy) <= 4) {
    if (sel) selectCity(null);                    // a click beside the selected city lets it go; the next click places a new one
    else {
      const c = { id: uid('c'), name: 'เมืองใหม่', kind: ckind, note: '', x: r1(a.at[0]), y: r1(a.at[1]) };
      doOp({ k: 'c+', c }); selectCity(c.id); const nm = $('cfName'); nm.focus(); nm.select();   // no road of its own until the user asks
    }
  }
  requestDraw();
}
function abortAct() {
  if (!act) return;
  const a = act;
  if (a.k === 'paint' || a.k === 'erase') endStroke(true);
  if (a.k === 'rdraw' && riv && a.free) riv = null;
  act = null; cv.classList.remove('pan'); cv.classList.remove('drag'); requestDraw();
}
cv.addEventListener('pointerup', e => endPointer(e, false));
cv.addEventListener('pointercancel', e => endPointer(e, true));
cv.addEventListener('pointerenter', () => { overMap = true; });
cv.addEventListener('pointerleave', () => { overMap = false; if (!act) { hot = -1; cursor = null; hoverCity = null; hideTip(true); requestDraw(); } });
cv.addEventListener('dblclick', e => {
  if (mode !== 'trade' || !tlsel || !ECON || !editable) return;
  const [mx, my] = toMap(e.clientX, e.clientY), L = ECON.links.find(x => x.id === tlsel), hi = L ? viaAt(L.via || [], mx, my) : -1;
  if (hi >= 0) { e.preventDefault(); changeLink(L.id, { via: L.via.filter((p, i) => i !== hi) }); }
});
cv.addEventListener('dblclick', e => {
  if (mode !== 'route' || !rsel) return;
  const [mx, my] = toMap(e.clientX, e.clientY), r = visibleRoutes().find(v => v.id === rsel), hi = r ? handleAt(r, mx, my) : -1;
  if (hi >= 0) { e.preventDefault(); changeRoute(r.id, { via: r.via.filter((p, i) => i !== hi) }); }
});
cv.addEventListener('dblclick', e => { if (mode === 'river' && rtool === 'draw' && riv) { e.preventDefault(); if (riv.pts.length >= 3) { const a = riv.pts[riv.pts.length - 1], b = riv.pts[riv.pts.length - 2]; if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 10 / view.s) riv.pts.pop(); } finishRiver(); } });
__on(window, 'keydown', e => {
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
  const mod = e.ctrlKey || e.metaKey;
  if (mod && !typing && editable && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
  if (mod && !typing && editable && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
  if (typing) { if (e.key === 'Escape' || (e.key === 'Enter' && e.target.tagName === 'INPUT')) e.target.blur(); return; }
  if (PANKEY[e.code] && !mod && !e.altKey) { e.preventDefault(); panKeys.add(PANKEY[e.code]); panFast = e.shiftKey; panKick(); return; }
  if (e.key === ' ' && overMap && mode !== 'view') { spaceDown = true; e.preventDefault(); if (document.activeElement && document.activeElement.tagName === 'BUTTON') document.activeElement.blur(); return; }
  if (mode === 'river' && riv) {
    if (e.key === 'Enter') { e.preventDefault(); finishRiver(); }
    else if (e.key === 'Escape') cancelRiver();
    else if (e.key === 'Backspace') { e.preventDefault(); riv.pts.pop(); if (!riv.pts.length) riv = null; updateHistory(); requestDraw(); }
  } else if (mode === 'city') {
    if (e.key === 'Escape') selectCity(null);
    else if ((e.key === 'Delete' || e.key === 'Backspace') && sel) { e.preventDefault(); deleteCity(); }
  } else if (mode === 'label') {
    if (e.key === 'Escape') selectLabel(null);
    else if ((e.key === 'Delete' || e.key === 'Backspace') && lsel) { e.preventDefault(); deleteLabel(); }
  } else if (mode === 'route') {
    if (e.key === 'Escape') { if (rpend != null) { rpend = null; rprev = null; requestDraw(); } else selectRoute(null); }
    else if ((e.key === 'Delete' || e.key === 'Backspace') && rsel) { e.preventDefault(); deleteRoute(rsel); }
  } else if (mode === 'trade') {
    if (e.key === 'Escape') { if (tpend) { tpend = null; tprev = null; requestDraw(); } else if (tlsel) selectLink(null); else selectTrade(null); }
    else if ((e.key === 'Delete' || e.key === 'Backspace') && tlsel && editable) { e.preventDefault(); deleteLink(tlsel); }
  } else if (mode === 'climate') {
    if (e.key === 'Escape') { clsel = null; clhex = -1; renderClimCard(); requestDraw(); }
  } else if (mode === 'info') {
    if (e.key === 'Escape') selectInfo(null);
    else if ((e.key === 'Delete' || e.key === 'Backspace') && isel && isel.t === 'pt') { e.preventDefault(); deletePoint(isel.id); }
  }
});
__on(window, 'keyup', e => { if (e.key === ' ') spaceDown = false; if (PANKEY[e.code]) panKeys.delete(PANKEY[e.code]); });
__on(window, 'blur', () => panKeys.clear());

// ---------- the toolbar ----------
function setMode(m) {
  if (m !== 'view' && m !== 'trade' && m !== 'climate' && !editable) return;
  if (m === mode) return;
  if (mode === 'river' && riv) finishRiver();
  if (mode === 'city') selectCity(null);
  if (mode === 'label') selectLabel(null);
  if (mode === 'route') { selectRoute(null); rpend = null; rprev = null; }
  if (mode === 'info') selectInfo(null);
  if (mode === 'trade') { tsel = null; tlsel = null; tpend = null; tprev = null; }
  if (mode === 'climate') { clsel = null; clhex = -1; }
  mode = m; box.dataset.mode = m; hot = -1; hideTip(); cv.classList.remove('pick');
  for (const b of document.querySelectorAll('#modes button')) b.setAttribute('aria-pressed', String(b.dataset.mode === m));
  for (const p of document.querySelectorAll('#opts > [data-for]')) p.hidden = p.dataset.for !== m;
  renderInfoCard(); renderTradeCard(); renderClimCard(); renderFixes(); requestDraw();
}
for (const b of document.querySelectorAll('#modes button')) b.onclick = () => setMode(b.dataset.mode);
const PAL = [['น้ำและภูเขา', ['S', 'i', 'L', 'M']], ['ทุ่ง', ['g', 'h', 's', 'v', 'c', 'y', 'u', 'd', 'e', 'm', 'p', 'r', 't', 'n']], ['ป่า', ['f', 'o', 'k', 'j', 'a', 'w']]];
const esc = t => String(t).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
$('pal').innerHTML = PAL.map(([g, codes]) => `<div class="grp"><span>${esc(g)}</span>${codes.map(b => `<button type="button" class="sw" data-b="${b}" aria-pressed="false"><i style="background:${chipColor(b)}"></i>${esc(BIOME[b].name)}</button>`).join('')}</div>`).join('')
  + `<div class="grp"><button type="button" class="sw" data-b="restore" aria-pressed="false"><i class="rs"></i>คืนค่าเดิม</button></div>`;
function setBrush(b) {
  bcode = b;
  for (const s of document.querySelectorAll('#pal .sw')) s.setAttribute('aria-pressed', String(s.dataset.b === b));
  $('bname').textContent = b === 'restore' ? 'กำลังคืนค่าเดิม' : 'กำลังระบาย' + biomeInfo(b).name;
}
for (const s of document.querySelectorAll('#pal .sw')) s.onclick = () => setBrush(s.dataset.b);
function segPick(id, attr, val, fn) { for (const b of document.querySelectorAll(`#${id} button`)) { b.setAttribute('aria-pressed', String(b.dataset[attr] === String(val))); b.onclick = () => fn(b.dataset[attr]); } }
function setBsize(n) { bsize = +n; segPick('bsize', 'n', bsize, setBsize); }
function setRsize(n) { rsize = +n; segPick('rsize', 'n', rsize, setRsize); }
$('rkind').innerHTML = Object.entries(RK).map(([k, v]) => `<button type="button" data-k="${k}">${esc(v.name)}</button>`).join('');
function setRkind(k) { rkind = k; if (riv) riv.kind = k; segPick('rkind', 'k', k, setRkind); requestDraw(); }
function setRtool(t) {
  if (t === 'erase' && riv) finishRiver();
  rtool = t; segPick('rtool', 'rt', t, setRtool);
  $('rkind').hidden = t !== 'draw'; $('rfinish').hidden = t !== 'draw'; $('rcancel').hidden = t !== 'draw'; $('rsize').hidden = t !== 'erase';
  $('rhint').textContent = t === 'draw'
    ? 'คลิกทีละจุดตามแนวแม่น้ำ หรือกดค้างแล้วลากเป็นเส้นเดียว ดับเบิลคลิกหรือกด Enter เพื่อจบเส้น Esc ยกเลิก Backspace ลบจุดล่าสุด แม่น้ำควรเริ่มจากภูเขาและไหลไปถึงทะเลหรือทะเลสาบ'
    : 'ชี้ที่แม่น้ำแล้วส่วนที่จะหายขึ้นเป็นสีแดงก่อน ขนาดทีละสายจับเส้นที่ใกล้เคอร์เซอร์ที่สุดแล้วลบตามที่ลาก ลากผ่านจุดบรรจบแล้วสายอื่นยังอยู่ จนกว่าจะลากต่อไปตามสายนั้น ขนาดวงลบทุกสายในวง แม่น้ำเดิมหายทีละช่วงตามช่อง แม่น้ำที่วาดเพิ่มหายทั้งสาย ใช้ช่องคืนค่าเดิมในเครื่องมือระบายเพื่อเอาแม่น้ำเดิมกลับมา';
  requestDraw();
}
$('ckind').innerHTML = Object.entries(CK).map(([k, v]) => `<button type="button" data-k="${k}">${esc(v.name)}</button>`).join('');
$('cfKind').innerHTML = Object.entries(CK).map(([k, v]) => `<option value="${k}">${esc(v.name)}</option>`).join('');
function setCkind(k) { ckind = k; segPick('ckind', 'k', k, setCkind); }
$('rfinish').onclick = finishRiver; $('rcancel').onclick = cancelRiver;
$('undo').onclick = undo; $('redo').onclick = redo;
for (const id of ['cfName', 'cfNote']) { $(id).addEventListener('input', cityInput); $(id).addEventListener('change', commitCityEdit); }
$('cfKind').addEventListener('change', () => { cityInput(); commitCityEdit(); });
$('cfName').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); selectCity(null); } });
$('cfDel').onclick = deleteCity;
$('cfDone').onclick = () => selectCity(null);
$('lsizeSeg').innerHTML = Object.entries(LSIZE).map(([k, v]) => `<button type="button" data-s="${k}">${esc(v.name)}</button>`).join('');
$('lfSize').innerHTML = Object.entries(LSIZE).map(([k, v]) => `<option value="${k}">${esc(v.name)}</option>`).join('');
$('lfColor').innerHTML = LCOL.map(([c, n]) => `<button type="button" class="sw" data-c="${c}" aria-pressed="false"><i style="background:${c}"></i>${esc(n)}</button>`).join('');
function setLsize(k) { lsize = LSIZE[k] ? k : 'mid'; segPick('lsizeSeg', 's', lsize, setLsize); }
$('lfText').addEventListener('input', () => labelEdit({ text: $('lfText').value.slice(0, 60) }));
$('lfText').addEventListener('change', () => commitLabelEdit());
$('lfText').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); selectLabel(null); } });
$('lfSize').addEventListener('change', () => { labelEdit({ size: LSIZE[$('lfSize').value] ? $('lfSize').value : 'mid' }); commitLabelEdit(); });
$('lfAng').addEventListener('input', () => { const a = LANG(+$('lfAng').value); $('lfAngV').textContent = a + '°'; labelEdit({ ang: a }); });
$('lfAng').addEventListener('change', () => commitLabelEdit());
for (const b of document.querySelectorAll('#lfColor button')) b.onclick = () => { labelEdit({ color: b.dataset.c }); commitLabelEdit(); refreshLabelForm(); };
$('lfDel').onclick = deleteLabel;
$('lfDone').onclick = () => selectLabel(null);
setBrush('g'); setBsize(2); setRsize(1); setRkind('river'); setRtool('draw'); setCkind('city'); setLsize('mid'); setRoadCls('royal'); setIptool('pick');
$('tdCat').innerHTML = `<option value="">ทุกหมวด</option>` + ECATS.map(c => `<option value="${c}">${esc(ECAT[c].name)}</option>`).join('');
$('tdCat').onchange = () => { tcat = ECAT[$('tdCat').value] ? $('tdCat').value : ''; renderTradeCard(); requestDraw(); };
$('tdMode').innerHTML = Object.entries(LMODE).map(([k, n]) => `<button type="button" data-k="${k}">${esc(n)}</button>`).join('');
setTtool('pick'); setTmode('auto');
$('tdReset').onclick = resetNetwork;
$('rtLoose').onclick = () => connectLoose(false);
$('rfFlat').onclick = () => { if (rsel) changeRoute(rsel, { via: [] }); };
$('rfDel').onclick = () => { if (rsel) deleteRoute(rsel); };
$('rfDone').onclick = () => selectRoute(null);
// which roads and which trade the map shows (and the saved picture), kept for this viewer in this browser, and how the trade moves
const FXMODES = { off: 'ปิด', dots: 'ลูกไฟ', ships: 'เรือและเกวียน' };
const LAYERS = [['royal', RDC.royal], ['laterite', RDC.laterite], ['cart', RDC.cart], ['water', TRD.water], ['caravan', TRD.caravan]];
try { const sv = JSON.parse(localStorage.getItem('gresland-route-layers') || 'null'); if (sv) for (const k in showR) if (typeof sv[k] === 'boolean') showR[k] = sv[k]; } catch (err) { /* without storage the layers start all shown */ }
$('layers').innerHTML = LAYERS.map(([k, st]) => `<label><input type="checkbox" data-k="${k}"${showR[k] ? ' checked' : ''}><i style="border-top:${Math.max(2, Math.round(st.px))}px ${st.dash ? 'dashed' : 'solid'} ${st.line}"></i>${esc(st.name)}</label>`).join('')
  + `<div class="fxrow"><span>การค้าเคลื่อนไหว</span><div class="seg" id="fxSeg">${Object.entries(FXMODES).map(([k, n]) => `<button type="button" data-m="${k}">${esc(n)}</button>`).join('')}</div></div>`;
for (const b of document.querySelectorAll('#layers input')) b.onchange = () => { showR[b.dataset.k] = b.checked; try { localStorage.setItem('gresland-route-layers', JSON.stringify(showR)); } catch (err) { /* the choice lasts this visit */ } requestDraw(); fxKick(); };
// the two cards under the map's buttons: opening one closes the other
function openCard(id, btn) {
  for (const [c, b] of [['layers', 'layersBtn'], ['nsize', 'nsizeBtn']]) { const open = c === id && $(c).hidden; $(c).hidden = !open; $(b).setAttribute('aria-expanded', String(open)); }
}
$('layersBtn').onclick = () => openCard('layers');
$('nsizeBtn').onclick = () => openCard('nsize');
$('nsize').innerHTML = [['city', 'ชื่อเมือง'], ['place', 'ชื่อสถานที่']].map(([k, n]) =>
  `<label>${n}<input type="range" data-k="${k}" min="${NSIZE.min * 100}" max="${NSIZE.max * 100}" step="10" value="${Math.round(nameSize[k] * 100)}" aria-label="ขนาด${n}"><output data-k="${k}">${Math.round(nameSize[k] * 100)}%</output></label>`).join('')
  + '<div class="hint">ชื่อเมืองหลวงกับเมืองขึ้นเสมอ ชื่อเมืองเล็ก หมู่บ้าน และป้อม ขึ้นเมื่อชี้หรือแตะที่จุดนั้น</div><button type="button" id="nsizeReset">ขนาดเดิม</button>';
function setNameSize(k, v) {
  nameSize[k] = Math.max(NSIZE.min, Math.min(NSIZE.max, Math.round(v * 10) / 10));
  const r = document.querySelector(`#nsize input[data-k="${k}"]`), o = document.querySelector(`#nsize output[data-k="${k}"]`);
  if (r) r.value = Math.round(nameSize[k] * 100); if (o) o.textContent = Math.round(nameSize[k] * 100) + '%';
  try { localStorage.setItem('gresland-name-size', JSON.stringify(nameSize)); } catch (err) { /* the choice lasts this visit */ }
  requestDraw();
}
for (const r of document.querySelectorAll('#nsize input')) r.oninput = () => setNameSize(r.dataset.k, +r.value / 100);
$('nsizeReset').onclick = () => { setNameSize('city', 1); setNameSize('place', 1); };
let flashT = 0;
function flash(t) { const el = $('toast'); el.textContent = t; el.classList.add('on'); clearTimeout(flashT); flashT = setTimeout(() => el.classList.remove('on'), 2600); }

const CLRAMP = {"heat":["#814b28","#894d26","#904f23","#985120","#a0531c","#a75618","#ae5814","#b55a10","#bc5d0d","#c3600a","#c9630b","#cf670e","#d56b13","#da6f19","#df7320","#e37828","#e77d31","#eb8239","#ef8842","#f18e4c","#f49355","#f69a5f","#f8a068","#faa672","#fbac7c","#fcb386","#fdb990","#febf9a","#fec5a4","#fdccaf","#ffd2b8","#ffd8c2"],"cold":["#365f80","#366388","#356891","#356c99","#3571a1","#3476a9","#347ab0","#357fb8","#3684bf","#3788c6","#398dcd","#3c92d3","#4096d9","#449bde","#4aa0e3","#4fa5e8","#56aaec","#5daef0","#64b3f4","#6cb8f7","#74bdf9","#7cc1fb","#84c6fd","#90cafc","#99cffe","#a4d3fd","#acd8fe","#b6dcfe","#c0e1fd","#c9e5fe","#d2eaff","#dbeefe"],"wet":["#246666","#1e6b6b","#177070","#0d7575","#127a7a","#067f7f","#128383","#0a8888","#038c8d","#189090","#199595","#1b9a9a","#079f9f","#13a3a4","#1da8a8","#13adad","#03b2b2","#1fb6b6","#2fbaba","#3ebebe","#4ac2c2","#57c5c5","#62c9c9","#6ecdcc","#79d0cf","#84d3d3","#8ed7d6","#99dad9","#9ddfde","#a1e3e2","#a6e8e7","#aaeceb"],"elev":["#60527b","#655682","#6a598a","#6f5c91","#746099","#7963a0","#7f67a8","#846baf","#896eb6","#8e72bc","#9376c3","#977bc9","#9c7fcf","#a184d4","#a688d9","#ab8dde","#af92e3","#b498e7","#b89dea","#bda2ee","#c1a8f1","#c6aef4","#cab3f6","#cfb9f8","#d3bffb","#d8c5fc","#dccbfe","#e0d1fe","#e4d8fe","#e8defe","#ede5fe","#f1ebff"],"arid":["#725523","#a17003","#ca8f18","#e2b66e","#fedca8"]};
// ---------- the climate mode: five layers to look through, what each hex is like, and what it asks of each city ----------
// the colours are one hue each, dark for little and pale for much, stepped in OKLCH and checked as ordinal ramps against the page's ink
const fmtT = v => (v <= -0.5 ? '−' : '') + Math.abs(v).toFixed(0) + '°C';
const fmtN = v => Math.round(v).toLocaleString('en-US');
const CLL = {
  ts: { name: 'อากาศห้วงฟ้าคลาย', ramp: 'heat', v: (A, i) => A.ts[i], t: v => (v + 10) / 50, ticks: [-10, 0, 10, 20, 30, 40], fmt: fmtT,
        about: 'อุณหภูมิเฉลี่ยในห้วงฟ้าคลาย ห้วงที่อุ่นที่สุดของปี ทางเหนือเย็นกว่าทางใต้ ริมทะเลเย็นกว่าแผ่นดินด้านใน หลังเทือกเขาที่ฝนไม่ตกร้อนที่สุด และทุกพันเมตรที่สูงขึ้น อากาศเย็นลงราวหกองศาครึ่ง' },
  tw: { name: 'อากาศห้วงขาว', ramp: 'cold', v: (A, i) => A.tw[i], t: v => (-40 - v) / 55, ticks: [-40, -50, -60, -70, -80, -90], fmt: fmtT,
        about: 'อุณหภูมิเฉลี่ยในห้วงขาว ห้วงที่หนาวที่สุดของปี ทั้งทวีปเฉลี่ยราวลบหกสิบองศา และบางคืนลงไปถึงลบเก้าสิบ ทางเหนือหนาวกว่าทางใต้ ริมทะเลอุ่นกว่าด้านใน บนที่สูงหนาวขึ้นไม่มากนัก เพราะอากาศเย็นไหลลงไปขังในที่ต่ำ' },
  p: { name: 'ความชื้น', ramp: 'wet', v: (A, i) => A.p[i], t: v => v / 2300, ticks: [0, 500, 1000, 1500, 2000], fmt: v => fmtN(v) + ' มม.',
       about: 'ปริมาณฝนและหิมะตลอดหนึ่งปี ฝั่งตะวันตกหลังเทือกเขาคาราฮาระแห้งจัด ตอนกลางแห้งปานกลาง ดินแดนรกร้างทางใต้แล้ง ฝนราวสองร้อยถึงห้าร้อยมิลลิเมตร แดนเหนือกับภาคตะวันออกเฉียงเหนือชื้น ชายฝั่งตะวันตกหน้าเทือกเขาและภูเขาด้านที่รับลมได้ฝนมากที่สุด' },
  ai: { name: 'ความแห้งแล้ง', ramp: 'arid', classes: true, v: (A, i) => A.ai[i],
        about: 'บอกว่าฝนที่ตกพอกับน้ำที่แดดและลมดึงออกไปจากดินหรือไม่ ยิ่งค่าน้อยยิ่งแห้ง แบ่งเป็นห้าระดับ ตั้งแต่แห้งแล้งจัดอย่างทะเลทรายซาทาราไปจนถึงชุ่มชื้น' },
  h: { name: 'ความสูง', ramp: 'elev', v: (A, i) => A.h[i], t: v => Math.sqrt(Math.max(0, v) / 10500), ticks: [0, 500, 1000, 2000, 3000, 5000, 10000], fmt: v => fmtN(v) + ' ม.',
       about: 'ความสูงเฉลี่ยของแต่ละช่องจากระดับน้ำทะเล ยอดเขาบางยอดในช่องสูงกว่านี้ ภูเขาสแตนเทอร์สูงที่สุดในทวีป ชั้นเมฆมานาคลุมโลกไว้ที่ราวสามพันเมตร ที่ที่สูงพ้นเมฆจึงมีแดดส่องถึง' },
};
if (BLANK) {
  Object.assign(CLL.ts, { name: 'อากาศฤดูร้อน', about: 'อุณหภูมิเฉลี่ยของฤดูที่อุ่นที่สุดของแต่ละช่อง คิดจากละติจูดของแผนที่ ยิ่งใกล้ขั้วโลกยิ่งเย็น ริมทะเลเย็นกว่าแผ่นดินด้านใน ที่แห้งร้อนกว่าที่ชื้น และทุกพันเมตรที่สูงขึ้นเย็นลงราวหกองศาครึ่ง' });
  Object.assign(CLL.tw, { name: 'อากาศฤดูหนาว', t: v => (25 - v) / 65, ticks: [20, 10, 0, -10, -20, -40], about: 'อุณหภูมิเฉลี่ยของฤดูที่หนาวที่สุดของแต่ละช่อง คิดจากละติจูดของแผนที่ ยิ่งใกล้ขั้วโลกและยิ่งลึกเข้าไปในแผ่นดิน ฤดูหนาวยิ่งหนาวและห่างจากฤดูร้อนมาก ริมทะเลอุ่นกว่าด้านใน' });
  CLL.p.about = 'ปริมาณฝนและหิมะตลอดหนึ่งปี เริ่มจากชนิดของพื้นที่ระบายไว้ เกลี่ยกับช่องข้างเคียง แล้วลมของแต่ละฤดูกับแถบละติจูดดันขึ้นในด้านที่รับลมจากทะเลและดันลงหลังเทือกเขา ช่องที่ตั้งฝนเองด้วยเครื่องมือจะคงค่าที่ตั้งไว้';
  CLL.ai.about = 'บอกว่าฝนที่ตกพอกับน้ำที่แดดและลมดึงออกไปจากดินหรือไม่ ยิ่งค่าน้อยยิ่งแห้ง แบ่งเป็นห้าระดับ ตั้งแต่แห้งแล้งจัดไปจนถึงชุ่มชื้น';
  CLL.h.about = 'ความสูงเฉลี่ยของแต่ละช่องจากระดับน้ำทะเล คิดจากระยะถึงฝั่งและระยะถึงภูเขา แก้เองรายช่องได้';
}
// one season looked at alone: its own warmth and its own rain take the place of the year's extremes
let clSeas = '';
const clSeasIx = () => { const A = climEnsure(); return A.seas ? A.seas.findIndex(s => s.id === clSeas) : -1; };
CLL.st = { get name() { const k = clSeasIx(); return 'อากาศ' + (k >= 0 ? climEnsure().seas[k].name : 'ของฤดู'); }, ramp: 'heat', v: (A, i) => { const k = clSeasIx(); return k >= 0 ? A.S[k].t[i] : A.ts[i]; }, t: BLANK ? v => (v + 30) / 70 : v => (v + 90) / 130, ticks: BLANK ? [-30, -20, -10, 0, 10, 20, 30, 40] : [-90, -60, -30, 0, 20, 40], fmt: fmtT,
  about: 'อุณหภูมิเฉลี่ยของฤดูที่เลือก คิดจากตำแหน่งของฤดูบนวงรอบปีระหว่างช่วงหนาวที่สุดกับร้อนที่สุดของแต่ละช่อง บวกค่าที่ตั้งให้ฤดูนี้ และค่าที่ระบายแก้รายช่อง' };
CLL.sp = { get name() { const k = clSeasIx(); return 'ฝน' + (k >= 0 ? climEnsure().seas[k].name : 'ของฤดู'); }, ramp: 'wet', v: (A, i) => { const k = clSeasIx(); return k >= 0 ? A.S[k].p[i] : A.p[i]; }, t: v => v / 900, ticks: [0, 150, 300, 450, 600, 900], fmt: v => fmtN(v) + ' มม.',
  about: 'ฝนและหิมะที่ตกในฤดูที่เลือก ฝนทั้งปีของแต่ละช่องถูกแบ่งให้แต่ละฤดูตามความยาวของฤดูและตามลมของฤดูนั้น ด้านที่รับลมจากทะเลได้มาก หลังเทือกเขาได้น้อย' };
const clKeys = () => clSeas && clSeasIx() >= 0 ? ['st', 'sp', 'ai', 'h'] : ['ts', 'tw', 'p', 'ai', 'h'];
let clLayer = 'ts', clsel = null, clhex = -1, CL_BK = null;
try { const v = localStorage.getItem('gresland-clim-layer'); if (CLL[v] && v !== 'st' && v !== 'sp') clLayer = v; } catch (err) { /* the first layer this visit */ }
const clColor = (key, v) => { const L = CLL[key]; if (L.classes) return CLRAMP.arid[4 - aridClass(v)]; const r = CLRAMP[L.ramp]; return r[Math.round(clamp(L.t(v), 0, 1) * (r.length - 1))]; };
function climBuckets() {                            // the land hexes as one path per colour, built when the layer or the climate changes
  const A = climEnsure(), key = clLayer + '|' + clSeas + '|' + A.stamp;
  if (CL_BK && CL_BK.key === key) return CL_BK;
  const by = new Map();
  for (let i = 0; i < N; i++) { if (isNaN(A.h[i])) continue; const c = clColor(clLayer, CLL[clLayer].v(A, i)); let q = by.get(c); if (!q) by.set(c, q = new Path2D()); hexPath(q, i, 1.03); }
  return CL_BK = { key, by };
}
function drawClimate(c, px) {
  const B = climBuckets(), w = cv.width / dpr, h = cv.height / dpr;
  const x0 = -view.x / view.s - R, y0 = -view.y / view.s - R, x1 = (w - view.x) / view.s + R, y1 = (h - view.y) / view.s + R;
  c.globalAlpha = 0.86;
  for (const [col, q] of B.by) { c.fillStyle = col; c.fill(q); }
  c.globalAlpha = 1;
  // the rivers stay in sight as thin ink, the ones that run with the seasons broken
  c.save(); c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = 'rgba(12,16,22,.62)';
  for (const r of BRIV) {
    if (!hits(r.bb, x0, y0, x1, y1)) continue;
    c.lineWidth = Math.max(0.6, (r.s ? 0.45 : 0.6) * r.w); c.setLineDash(r.s ? [2.2, 1.8] : []);
    for (const u of riverRuns(r)) { if (u.q.length < 2) continue; c.beginPath(); c.moveTo(u.q[0][0], u.q[0][1]); for (let j = 1; j < u.q.length; j++) c.lineTo(u.q[j][0], u.q[j][1]); c.stroke(); }
  }
  c.setLineDash([]);
  if (clhex >= 0) { c.beginPath(); hexPath(c, clhex, 1); c.lineWidth = 2.2 * px; c.strokeStyle = 'rgba(255,214,120,.95)'; c.stroke(); }
  const sc = clsel && visibleCities().find(v => v.id === clsel);
  if (sc) { c.beginPath(); c.arc(sc.x, sc.y, Math.max(7 * px, 4), 0, 2 * Math.PI); c.lineWidth = 2.2 * px; c.strokeStyle = 'rgba(255,214,120,.95)'; c.stroke(); }
  c.restore();
}
// one hex as the climate sees it, as lines for a card
function climLines(i) {
  const A = climEnsure(); if (isNaN(A.h[i])) return '';
  const k = aridClass(A.ai[i]), hl = key => key === clLayer ? ' class="s"' : '';
  return `<div${hl('h')}>สูง ${fmtN(A.h[i])} ม. จากระดับทะเล</div>`
    + `<div><span${hl('ts')}>${BLANK ? 'ฤดูร้อน' : 'ห้วงฟ้าคลาย'} ${fmtT(A.ts[i])}</span> · <span${hl('tw')}>${BLANK ? 'ฤดูหนาว' : 'ห้วงขาว'} ${fmtT(A.tw[i])}</span></div>`
    + `<div${hl('p')}>ฝนและหิมะ ${fmtN(A.p[i])} มม. ต่อปี</div>`
    + `<div${hl('ai')}>${ARID[k][1]} · ดัชนีความแห้ง ${A.ai[i] >= 9 ? 'มากกว่า 5' : A.ai[i].toFixed(2)}</div>`
    + (A.S ? `<div class="clsl">` + A.seas.map((s, q) => { const T = A.S[q].t[i], p = A.S[q].p[i]; return `<span${s.id === clSeas ? ' class="s"' : ''}>${esc(s.name)}</span><span class="n">${fmtT(T)}</span><span class="n">${fmtN(p)} มม.</span><span>${T < 0 ? (p >= 15 ? 'หิมะตก น้ำแข็งจับ' : 'เยือกแข็ง') : T < 5 ? 'หนาวจัด พืชไม่โต' : p < 12 ? 'แล้ง' : p > 350 ? 'ฝนชุก' : ''}</span>`; }).join('') + `</div><div>ปลูกพืชได้ราวร้อยละ ${Math.round(A.grow[i] * 100)} ของปี</div>` : '')
    + (!BLANK && A.h[i] >= CL.cloud ? `<div class="mine">พ้นชั้นเมฆมานา แดดส่องถึง</div>` : '');
}
const xm = v => '×' + v.toFixed(2);
function climFxRows(id) {                           // what the climate asks of one city, against a city of the continent's own mean climate
  const c = ECON && ECON.cities.find(x => x.id === id); if (!c || !c.cm) return '';
  const m = c.cm, rows = [
    ['เชื้อเพลิง', m.fuel, m.geo ? 'นครใต้ภูเขาใช้ความร้อนใต้พิภพให้ความอบอุ่น จึงใช้เชื้อเพลิงน้อยกว่าเมืองอื่น' : 'ยิ่งหนาวนานยิ่งต้องเผาเชื้อเพลิงให้ความอบอุ่นมาก'],
    ['เส้นใย หนัง และเชือก', m.cloth, 'เสื้อผ้ากันหนาว'],
    ['สมุนไพร', m.herbs, 'ที่ชื้นมีไข้หวัดและปอดบวมมากกว่า'],
    ['เครื่องมือโลหะ', m.tools, 'โลหะขึ้นสนิมเร็วในที่ชื้น'],
    ['ธัญพืชจากน้ำฝนในที่ทำกิน', m.grain, 'ที่แห้งปลูกพืชที่อาศัยน้ำฝนได้น้อยลง นาริมแม่น้ำและริมทะเลสาบไม่เสีย'],
  ];
  return `<h3>ผลต่อเมือง</h3><div class="clfx">` + rows.map(([n, v, why]) => `<span title="${esc(why)}">${esc(n)}</span><span class="n${Math.abs(v - 1) >= 0.05 ? ' hi' : ''}">${xm(v)}</span>`).join('') + `</div>`
    + `<p class="note" style="margin-top:6px">ค่า ×1.00 คือเมืองที่อากาศเท่าค่าเฉลี่ยของทวีป สี่แถวแรกคูณความต้องการ แถวสุดท้ายคูณผลผลิตรวงอำพันจากที่ทำกินรอบเมือง</p>`;
}
function climLegend() {
  const L = CLL[clLayer];
  if (L.classes) return `<div class="legend" style="margin-top:6px">` + ARID.map(([t], k) => { const lo = k ? ARID[k - 1][0] : 0; const col = CLRAMP.arid[4 - k];
    return `<div class="lg"><span class="chip" style="background:${col}"></span><span>${ARID[k][1]}</span><span class="n">${t === Infinity ? lo.toFixed(2) + ' ขึ้นไป' : lo.toFixed(2) + ' ถึง ' + t.toFixed(2)}</span></div>`; }).reverse().join('') + `</div>`;
  const r = CLRAMP[L.ramp], grad = r.map((c, k) => `${c} ${(k / (r.length - 1) * 100).toFixed(1)}%`).join(',');
  const ticks = L.ticks.map(v => { const x = clamp(L.t(v), 0, 1) * 100; return `<span${!BLANK && clLayer === 'h' && v === CL.cloud ? ' class="cloud"' : ''} style="left:${x.toFixed(1)}%">${clLayer === 'h' ? (v >= 1000 ? (v / 1000).toLocaleString('en-US') + 'k' : v) : L.fmt(v).replace(' มม.', '')}</span>`; }).join('');
  return `<div class="clleg"><div class="clbar" style="background:linear-gradient(90deg,${grad})"></div><div class="clticks">${ticks}</div></div>`
    + (clLayer === 'h' ? `<p class="note" style="margin-top:2px">สเกลยืดช่วงที่ต่ำให้กว้าง ที่ราบจึงเห็นความต่าง${BLANK ? '' : ' ขีดสีทองคือชั้นเมฆมานา'}</p>` : clLayer === 'p' ? `<p class="note" style="margin-top:2px">มิลลิเมตรต่อปี</p>` : '');
}
function renderClimCard() {
  const card = $('climcard'); card.hidden = mode !== 'climate';
  if (card.hidden) return;
  const L = CLL[clLayer], A = climEnsure();
  if (clsel && !visibleCities().some(v => v.id === clsel)) clsel = null;
  let h = `<div class="tr"><b>${esc(L.name)}</b></div><div class="tr w">${esc(L.about)}</div>` + climLegend();
  const sc = clsel && visibleCities().find(v => v.id === clsel);
  if (sc) {
    const hx = landHex(hexAt(sc.x, sc.y));
    h += `<h3>${esc(sc.name || 'เมืองไม่มีชื่อ')}</h3><div class="tr">${hx >= 0 ? climLines(hx) : ''}</div>` + climFxRows(sc.id);
    h += `<div class="btns"><button type="button" class="btn" id="clBack">ดูทุกเมือง</button></div>`;
  } else {
    if (clhex >= 0 && !isNaN(A.h[clhex])) h += `<h3>${esc(biomeInfo(eff(clhex)).name)}</h3><div class="tr">${climLines(clhex)}</div>`;
    // the table view: every city on the map by the layer shown, so no reading rests on colour alone
    const rows = visibleCities().map(v => { const hx = landHex(hexAt(v.x, v.y)); return hx >= 0 && !isNaN(A.h[hx]) ? [v, CLL[clLayer].v(A, hx)] : null; }).filter(Boolean);
    const desc = clLayer !== 'tw';                   // the coldest White interval first, the hottest, wettest, driest and highest first otherwise
    rows.sort((a, b) => clLayer === 'ai' ? a[1] - b[1] : desc ? b[1] - a[1] : a[1] - b[1]);
    const val = v => clLayer === 'ai' ? ARID[aridClass(v)][1] + ' ' + (v >= 9 ? '>5' : v.toFixed(2)) : CLL[clLayer].fmt(v);
    h += `<h3>เมืองทั้งหมด ${rows.length} แห่ง</h3><div class="cltbl">` + rows.map(([v, x]) => `<button type="button" data-id="${esc(v.id)}">${esc(v.name || 'เมืองไม่มีชื่อ')}</button><span class="n">${esc(val(x))}</span>`).join('') + `</div>`
      + `<p class="note">คลิกเมืองบนแผนที่หรือในรายการเพื่อดูว่าอากาศส่งผลกับเมืองนั้นอย่างไร</p>`;
  }
  $('climbody').innerHTML = h;
  for (const b of document.querySelectorAll('#climbody .cltbl button')) b.onclick = () => { clsel = b.dataset.id; clhex = -1; renderClimCard(); requestDraw(); };
  if ($('clBack')) $('clBack').onclick = () => { clsel = null; renderClimCard(); requestDraw(); };
}
function setClLayer(k) {
  clLayer = k; CL_BK = null; segPick('clLayer', 'k', k, setClLayer);
  try { localStorage.setItem('gresland-clim-layer', k); } catch (err) { /* this visit only */ }
  renderClimCard(); requestDraw();
}
function climClick(mx, my) {
  const c = cityAt(mx, my);
  if (c) { clsel = c.id; clhex = -1; }
  else { const h = hexAt(mx, my); clsel = null; clhex = h >= 0 && !isW(eff(h)) ? h : -1; }
  renderClimCard(); requestDraw();
}
function showClimTip(mx, my, e, id) {
  const c = cityAt(mx, my), hx = c ? landHex(hexAt(c.x, c.y)) : id;
  if (hx < 0 || isNaN(climEnsure().h[hx])) { hideTip(true); return; }
  const z = zoneOf(hx), zn = z !== '.' ? zoneInfo(z).name : '';
  tip.set((c ? `<b>${esc(c.name || 'เมืองไม่มีชื่อ')}</b>` : `<b>${esc(biomeInfo(eff(hx)).name)}</b>`) + (zn ? `<div class="m">${esc(zn)}</div>` : '') + `<div class="lore">${climLines(hx)}</div>`
    + (c ? '<div class="m">คลิกเพื่อดูผลต่อเมือง</div>' : '') + (typeof clReachNote === 'function' ? clReachNote() : ''), clColor(clLayer, CLL[clLayer].v(climEnsure(), hx)));
}
function clLayerRow() { const ks = clKeys(); if (!ks.includes(clLayer)) clLayer = clLayer === 'p' || clLayer === 'sp' ? (clSeas ? 'sp' : 'p') : ks.includes('st') ? 'st' : 'ts'; $('clLayer').innerHTML = ks.map(k => `<button type="button" data-k="${k}">${esc(CLL[k].name)}</button>`).join(''); segPick('clLayer', 'k', clLayer, setClLayer); }
clLayerRow();
$('clHint').textContent = 'เลือกชั้นข้อมูลด้านบน ชี้ช่องเพื่อดูอากาศของช่องนั้น คลิกเมืองเพื่อดูว่าอากาศส่งผลกับเมืองอย่างไร ลากเพื่อเลื่อนแผนที่';

// ---------- the hover card ----------
// It used to follow the pointer, and so lay over the very ground being read. The owner asked for the notes that cover the map to
// be something he can drag and fold away (23 Nov 2026): the card now rests where it is put, keeps the last thing pointed at so the
// hand can reach it, folds down to its title, and remembers place and fold between visits.
const tipEl = $('tip');
tipEl.innerHTML = '<div class="tiphead" title="ลากเพื่อย้ายคำอธิบาย ดับเบิลคลิกเพื่อคืนที่เดิม"><span class="tipgrip" aria-hidden="true">⠿</span><span class="tiptitle" id="tipTitle">คำอธิบาย</span><button type="button" class="tipfold" id="tipFold" aria-expanded="true" aria-controls="tipBody" title="พับหรือกางคำอธิบาย">▾</button></div><div class="tipbody" id="tipBody"></div>';
const tipBody = $('tipBody');
let TIP = { x: null, y: null, fold: false };
try { const o = JSON.parse(localStorage.getItem('mme-tip') || 'null'); if (o && typeof o === 'object') TIP = { x: Number.isFinite(o.x) ? o.x : null, y: Number.isFinite(o.y) ? o.y : null, fold: !!o.fold }; } catch (err) { /* where it started */ }
const tipSave = () => { try { localStorage.setItem('mme-tip', JSON.stringify(TIP)); } catch (err) { /* this visit only */ } };
function tipPlace() {                               // inside the map's box, wherever the box now ends
  if (tipEl.style.display === 'none') return;
  const r = box.getBoundingClientRect(), w = tipEl.offsetWidth, h = tipEl.offsetHeight;
  // Where nobody has put it: the foot of the map, clear of the strip the options stand in. In a lesson her words lie over the
  // foot, so there it stands at the top, left of the side panel, and a place chosen outside lessons waits until the lesson ends.
  const teach = document.body.classList.contains('tutoring');
  if (teach) { tipEl.style.left = Math.max(4, r.width - padR() - w - 52) + 'px'; tipEl.style.top = '8px'; return; }
  if (TIP.x == null) { tipEl.style.left = (padL() + 10) + 'px'; tipEl.style.top = Math.max(6, r.height - h - 46) + 'px'; return; }
  tipEl.style.left = Math.max(4, Math.min(r.width - w - 4, TIP.x)) + 'px'; tipEl.style.top = Math.max(4, Math.min(r.height - h - 4, TIP.y)) + 'px';
}
function tipFoldUI() { tipEl.classList.toggle('folded', TIP.fold); $('tipFold').textContent = TIP.fold ? '▸' : '▾'; $('tipFold').setAttribute('aria-expanded', String(!TIP.fold)); const b = tipBody.querySelector('b'); $('tipTitle').textContent = TIP.fold && b ? b.textContent : 'คำอธิบาย'; }
// the one way a card is filled: what to say, and the colour of its edge
const tip = {
  set(html, color) { tipEl.style.setProperty('--c', color || 'var(--brass)'); if (tipBody.innerHTML !== html) tipBody.innerHTML = html; tipEl.style.display = 'block'; tipFoldUI(); tipPlace(); },
  get shown() { return tipEl.style.display === 'block'; }
};
$('tipFold').onclick = e => { e.stopPropagation(); TIP.fold = !TIP.fold; tipSave(); tipFoldUI(); tipPlace(); };
(function tipDrag() {
  const head = tipEl.querySelector('.tiphead'); let d = null;
  head.addEventListener('pointerdown', e => { if (e.button !== 0 || e.target.closest('button')) return; const r = tipEl.getBoundingClientRect(); d = { dx: e.clientX - r.left, dy: e.clientY - r.top }; try { head.setPointerCapture(e.pointerId); } catch (err) { /* a nicety */ } tipEl.classList.add('dragging'); e.preventDefault(); e.stopPropagation(); });
  head.addEventListener('pointermove', e => { if (!d) return; const r = box.getBoundingClientRect(); TIP.x = Math.round(e.clientX - r.left - d.dx); TIP.y = Math.round(e.clientY - r.top - d.dy); tipPlace(); });
  const end = () => { if (!d) return; d = null; tipEl.classList.remove('dragging'); const r = box.getBoundingClientRect(), t = tipEl.getBoundingClientRect(); TIP.x = Math.round(t.left - r.left); TIP.y = Math.round(t.top - r.top); tipSave(); };
  head.addEventListener('pointerup', end); head.addEventListener('pointercancel', end);
  head.addEventListener('dblclick', e => { if (e.target.closest('button')) return; TIP.x = TIP.y = null; tipSave(); tipPlace(); });
  for (const ev of ['pointerdown', 'wheel', 'click']) tipEl.addEventListener(ev, e => e.stopPropagation());   // the card is not the map: nothing done on it reaches the map under it
  __on(window, 'resize', tipPlace);
})();
function near(list, mx, my, rad) { let best = null, bd = rad * rad; for (const p of list) { const d = (p.x - mx) ** 2 + (p.y - my) ** 2; if (d < bd) { bd = d; best = p; } } return best; }
function showTip(id, mx, my, e) {
  const code = eff(id), b = biomeInfo(code), zc = zoneOf(id), z = zc !== '.' ? zoneInfo(zc) : null;
  const pk = pickAt(mx, my), city = pk && pk.k === 'city' ? pk.v : null, lid = pk && pk.k === 'label' ? pk.id : null, onStan = !!pk && pk.k === 'stan', pt = near(visiblePoints(), mx, my, 9);
  const td = !pk && !pt ? chainAt(mx, my) : null, rt = !pk && !td ? routeAt(mx, my) : null;
  const hr = '<hr style="border:0;border-top:1px solid #333844;margin:6px 0">';
  let h = '';
  if (city) h += `<b>${esc(city.name || 'เมืองไม่มีชื่อ')}</b>` + (editable && city.own && !isBuiltin(city.id) ? `<div class="mine">${esc((CK[city.kind] || CK.city).name)}ที่วางเพิ่ม</div>` : '') + `<div class="lore">${esc(city.note || 'ยังไม่มีบันทึก')}</div>`
    + cityTradeLine(city.id) + (editable ? `<div class="m">ลากตัวเมืองหรือชื่อเมืองเพื่อย้าย</div>` : '') + hr;
  else if (lid) { const v = visibleLabels().find(l => l.id === lid) || {}; h += `<b>${esc(v.text || 'ชื่อสถานที่')}</b>` + (!editable ? '' : !baseLabel(lid) ? `<div class="mine">ชื่อที่ใส่เพิ่ม</div>` : ED.labels.has(lid) ? `<div class="mine">ชื่อนี้แก้หรือย้ายแล้ว</div>` : '') + (editable ? `<div class="m">ลากเพื่อย้าย แก้ข้อความได้ในโหมดใส่ชื่อสถานที่</div>` : '') + hr; }
  else if (onStan) h += `<b>ภูเขาสแตนเทอร์</b>` + (editable && ED.stan != null ? `<div class="mine">ภูเขานี้ย้ายมาตั้งที่นี่</div>` : '') + (editable ? `<div class="m">ลากเพื่อย้ายภูเขาทั้งลูก นครบนยอดกับป้ายชื่อจะย้ายตามไปด้วย</div>` : '') + hr;
  else if (pt && pt.h >= 0 && !isW(eff(pt.h))) { const ki = kindInfo(pt.k); h += `<b>${esc(pt.name || ki.name)}</b><div class="lore">${esc(pt.note || ki.note)}</div>${hr}`; }
  else if (td) h += bundleTipHTML(td) + hr;
  else if (rt) { const g = geoOf(rt); h += `<b>${esc(routeName(rt))}</b><div class="m">${esc(endName(rt.a))} ถึง ${esc(endName(rt.b))}${g && !g.fail ? ` · ยาว ${g.len} ช่อง` + (g.bridges.length ? ` · สะพาน ${g.bridges.length}` : '') + (g.tunnels ? ` · อุโมงค์ ${g.tunnels}` : '') : ''}</div>${hr}`; }
  h += `<b>${esc(b.name)}</b>`;
  h += landTipHTML(id);
  if (editable && ED.cells[id] !== '.') h += `<div class="mine">ช่องนี้ระบายใหม่ เดิมเป็น${esc(biomeInfo(BI[id]).name)}</div>`;
  if (!isW(code) && shownAt(id)) {
    if (RV[id] === '1') h += `<div class="s">มีแม่น้ำไหลผ่าน</div>`;
    if (RV[id] === '2') h += `<div class="s">ลำน้ำตามฤดูกาล ไหลเฉพาะห้วงที่ฝนชุก</div>`;
  }
  if (editable && ED.hide[id]) h += `<div class="mine">${shownAt(id) ? 'ซ่อนแม่น้ำเดิมบางสายในช่องนี้' : 'ซ่อนแม่น้ำเดิมในช่องนี้'}</div>`;
  if (URVH.has(id)) h += editable ? `<div class="mine">มีแม่น้ำที่วาดเพิ่มไหลผ่าน</div>` : RV[id] === '1' && shownAt(id) ? '' : `<div class="s">มีแม่น้ำไหลผ่าน</div>`;
  if (b.note && ED.cells[id] === '.') h += `<div class="lore">${esc(b.note)}</div>`;
  if (z) h += `<div class="m" style="margin-top:4px"><span class="s">${esc(z.name)}</span> · ${esc(z.lore)}</div>`;
  if (z && zc === 'T' && ED.stan != null) { if (editable) h += `<div class="m">ภูเขาย้ายมาตั้งที่นี่</div>`; }
  else if (z && z.placed) h += `<div class="m">${esc(z.placed)}</div>`;
  tip.set(h, chipColor(code));
}
// soft: the pointer only left the ground it was reading, so the card keeps what it says and the hand can go to it
function hideTip(soft) { if (soft && tipEl.style.display === 'block') return; tipEl.style.display = 'none'; }
function showTradeTip(mx, my, e) {                  // the trade mode: a city's trade, or what a line carries
  const c = cityAt(mx, my), ch = c ? null : chainAt(mx, my);
  if (!c && !ch) { hideTip(true); return; }
  tip.set(c ? `<b>${esc(c.name || 'เมืองไม่มีชื่อ')}</b>${cityTradeLine(c.id)}<div class="m">คลิกเพื่อดูรายละเอียด</div>`
    : bundleTipHTML(ch) + (ch.ls.length > 1 ? '<div class="m">คลิกเพื่อเลือกทีละเส้น</div>' : editable ? '<div class="m">คลิกเพื่อเลือก แล้วลากเพื่อดัดทาง</div>' : ''), ch ? TRD[ch.wet ? 'water' : 'caravan'].line : 'var(--brass)');
}

// ---------- the side panel ----------
let counts = {};
function updateLegend() {
  counts = {}; for (let i = 0; i < N; i++) { const b = eff(i); counts[b] = (counts[b] || 0) + 1; }
  let rv1 = 0, rv2 = 0; for (let i = 0; i < N; i++) if (RV[i] !== '0' && !isW(eff(i)) && shownAt(i)) { if (RV[i] === '1') rv1++; else rv2++; }
  $('legend').innerHTML = Object.entries(BIOME).filter(([k]) => counts[k] && k !== 'S').map(([k, b]) =>
    `<div class="lg"><span class="chip" style="background:${chipColor(k)}"></span><span>${esc(biomeInfo(k).name)}</span><span class="n">${counts[k]}</span></div>`).join('')
    + `<div class="lg"><span class="chip" style="background:linear-gradient(90deg,transparent 40%,#5488ac 40% 60%,transparent 60%),#a7b06e"></span><span>แม่น้ำ</span><span class="n">${rv1}</span></div>`
    + `<div class="lg"><span class="chip" style="background:linear-gradient(90deg,transparent 42%,#7ca6be 42% 58%,transparent 58%),#c4b880"></span><span>ลำน้ำตามฤดูกาล</span><span class="n">${rv2}</span></div>`;
}
let statT = 0;
function updateStats() {
  renderFixes();
  clearTimeout(statT);
  statT = setTimeout(() => {
    let pc = 0, hc = 0; for (const i of painted) { if (ED.cells[i] !== '.') pc++; if (ED.hide[i]) hc++; }
    const lc = { add: 0, edit: 0 }; for (const id of ED.labels.keys()) if (!baseLabel(id)) lc.add++; else if (!ED.lhid.has(id)) lc.edit++;
    const rc = { add: 0, edit: 0 }; for (const id of ED.routes.keys()) if (!baseRoad(id)) rc.add++; else if (!ED.rthid.has(id)) rc.edit++;
    const rows = [['ช่องที่ระบาย', pc], ['ช่องที่ซ่อนแม่น้ำเดิม', hc], ['แม่น้ำที่วาด', ED.rivers.length], ['เมืองที่วางหรือแก้', ED.cities.length], ['เมืองเดิมที่ลบ', ED.bhid.size],
      ['ชื่อสถานที่ที่ใส่เพิ่ม', lc.add], ['ชื่อสถานที่เดิมที่แก้หรือย้าย', lc.edit], ['ชื่อสถานที่เดิมที่ลบ', ED.lhid.size], ['ภูเขาสแตนเทอร์', ED.stan == null ? 'ที่เดิม' : 'ย้ายแล้ว'],
      ['ถนนที่วาง', rc.add], ['ถนนเดิมที่แก้', rc.edit], ['ถนนเดิมที่ลบ', ED.rthid.size],
      ['จุดสำคัญที่วางหรือแก้', ED.points.size], ['จุดสำคัญเดิมที่ลบ', ED.phid.size], ['ข้อความเขตและภูมิประเทศที่แก้', ED.zinfo.size + ED.binfo.size + ED.kinfo.size],
      ['เส้นการค้าที่วางหรือแก้', ED.tlinks.size], ['เส้นการค้าเดิมที่ลบ', ED.tlhid.size], ['ระดับศูนย์ที่ตั้งเอง', ED.hubs.size], ['ศูนย์ที่ส่งของให้ที่เลือกเอง', ED.tparent.size]];
    $('stats').innerHTML = (BLANK ? rows.filter(([k]) => !k.includes('เดิม') && !k.includes('สแตนเทอร์')) : rows).map(([k, v]) => `<span>${esc(k)}</span><span>${v}</span>`).join('');
    $('clearAll').disabled = !editable || !(pc + hc + ED.rivers.length + ED.cities.length + ED.bhid.size + ED.labels.size + ED.lhid.size + (ED.stan != null ? 1 : 0) + ED.routes.size + ED.rthid.size + ED.points.size + ED.phid.size + ED.zinfo.size + ED.binfo.size + ED.kinfo.size + ED.tlinks.size + ED.tlhid.size + ED.hubs.size + ED.tparent.size);
    updateLegend(); updateHistory();
  }, 120);
}
updatePointsLegend();
document.getElementById('method').innerHTML = (D.method || []).map(sec => `<h3>${esc(sec.h)}</h3><ol>${sec.items.map(x => `<li>${esc(x)}</li>`).join('')}</ol>`).join('');
let clearArm = 0;
$('clearAll').onclick = () => {
  if (!editable) return;
  const btn = $('clearAll');
  if (!clearArm) { btn.textContent = 'กดอีกครั้งเพื่อล้าง'; clearArm = setTimeout(() => { clearArm = 0; btn.textContent = 'ล้างงานแก้ทั้งหมด'; }, 4000); return; }
  clearTimeout(clearArm); clearArm = 0; btn.textContent = 'ล้างงานแก้ทั้งหมด';
  commitCityEdit(); commitInfo(); selectCity(null); selectLabel(null); selectRoute(null); selectInfo(null); riv = null;
  const ops = [], ch = [];
  for (const i of painted) if (ED.cells[i] !== '.') ch.push([i, ED.cells[i], '.']);
  if (ch.length) ops.push({ k: 't', ch });
  if (HIDK.size) ops.push({ k: 'rh', on: [], off: [...HIDK] });
  // rivers and cities leave from the back, so undo puts each one back at its own place in the list
  for (let at = ED.rivers.length - 1; at >= 0; at--) { const r = ED.rivers[at]; ops.push({ k: 'r-', r: { id: r.id, kind: r.kind, pts: r.pts }, at }); }
  for (let at = ED.cities.length - 1; at >= 0; at--) ops.push({ k: 'c-', c: { ...ED.cities[at] }, at });
  for (const id of ED.bhid) ops.push({ k: 'bh-', id });
  for (const [id, o] of ED.labels) ops.push({ k: 'lb', id, a: { ...o }, b: null });
  for (const id of ED.lhid) ops.push({ k: 'lh-', id });
  if (ED.stan != null) ops.push({ k: 'st', a: ED.stan, b: null });
  for (const [id, o] of ED.routes) ops.push({ k: 'rt', id, a: { ...o }, b: null });
  for (const id of ED.rthid) ops.push({ k: 'rth-', id });
  for (const [id, o] of ED.points) ops.push({ k: 'pt', id, a: { ...o }, b: null });
  for (const id of ED.phid) ops.push({ k: 'ph-', id });
  for (const t of ['zi', 'bi', 'ki']) for (const [key, o] of INFO[t].map()) ops.push({ k: t, key, a: { ...o }, b: null });
  for (const [id, o] of ED.tlinks) ops.push({ k: 'tl', id, a: { ...o }, b: null });
  for (const id of ED.tlhid) ops.push({ k: 'tlh-', id });
  for (const [id, v] of ED.hubs) ops.push({ k: 'hub', id, a: v, b: null });
  for (const [id, v] of ED.tparent) ops.push({ k: 'tpar', id, a: v, b: null });
  if (!ops.length) return;
  doOp({ k: 'm', ops });
  flash('ล้างงานแก้แล้ว กดย้อนเพื่อเอาคืน');
};

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
  status(); updateHistory(); requestDraw();
}
function unlock() {
  if (editable || readOnly) return;
  editable = true;
  for (const b of document.querySelectorAll('#modes button')) b.disabled = false;
  $('tdTool').hidden = false; $('tdReset').hidden = false; setTtool(ttool);
  status(); updateStats(); updateHistory();
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

// ---------- export ----------
async function offer(filename, data) {
  if (!downloads) return;
  try { await downloads.save({ filename, data }); flash('บันทึกไฟล์แล้ว'); }
  catch (err) { const code = err && err.code; if (code === 'declined') return; if (code === 'rate_limited') flash('รอสักครู่แล้วลองอีกครั้ง'); else flash('หน้านี้บันทึกไฟล์ไม่ได้'); }
}
$('expPng').onclick = async () => {
  // names and cities go into the picture only while the names button is on, the same rule as on the map
  const named = showNames;
  flash(named ? 'กำลังเตรียมภาพพร้อมชื่อสถานที่' : 'กำลังเตรียมภาพแบบไม่มีชื่อสถานที่');
  const W = layer.width, H = layer.height, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'); x.drawImage(img, 0, 0, W, H); if (layerUsed) x.drawImage(layer, 0, 0, W, H); if (drawOverGround) drawOverGround(x, W, H, false);
  x.setTransform(LS, 0, 0, LS, 0, 0); drawLoosePoints(x, 1 / LS); drawRoutes(x, 1 / LS, null); drawTrade(x, 1 / LS, false);
  if (named) { const keep = sel; sel = null; drawNames(x, 1 / LS, true, true); sel = keep; }
  const blob = await new Promise(res => c.toBlob(res, 'image/png'));
  if (blob) offer(FSLUG + (named ? '.png' : '-no-names.png'), blob);
};
$('expJson').onclick = () => {
  commitCityEdit(); commitLabelEdit(); commitInfo();
  const vr = ensureRoutes();
  const out = {
    map: 'Gresland terrain', version: 4, exported: new Date().toISOString(),
    grid: { x0: G.x0, y0: G.y0, R: G.R, cols: COLS, rows: ROWS, cmin: G.cmin, kmin: G.kmin, width: G.w, height: G.h },
    codes: Object.fromEntries(Object.keys(BIOME).map(k => [k, biomeInfo(k).name])),
    terrain: [...painted].filter(i => ED.cells[i] !== '.').sort((a, b) => a - b).map(i => ({ hex: i, col: cOf(i), row: kOf(i), x: r1(CX[i]), y: r1(CY[i]), was: BI[i], now: ED.cells[i] })),
    hiddenRivers: [...HIDK].sort((a, b) => a - b).map(key => { const i = key % N; return { line: Math.floor(key / N), hex: i, col: cOf(i), row: kOf(i), x: r1(CX[i]), y: r1(CY[i]) }; }),
    rivers: ED.rivers.map(r => ({ id: r.id, kind: r.kind, name: RK[r.kind].name, pts: r.pts })),
    cities: ED.cities.map(c => ({ ...c, builtin: isBuiltin(c.id) })),
    removedCities: [...ED.bhid],
    labels: [...ED.labels.values()].map(o => ({ ...plainLabel(o), x: r1(o.x), y: r1(o.y), builtin: !!baseLabel(o.id) })),
    removedLabels: [...ED.lhid],
    routes: vr.map(r => { const g = geoOf(r); return { ...plainRoute(r), name: routeName(r), builtin: r.base, ...(g && !g.fail ? { hexes: g.hexes, bridges: g.bridges.map(b => [r1(b.x), r1(b.y)]), tunnels: g.tunnels } : { unreachable: true }) }; }),
    removedRoads: [...ED.rthid],
    zones: Object.fromEntries([...ED.zinfo]), biomes: Object.fromEntries([...ED.binfo]), pointKinds: Object.fromEntries([...ED.kinfo]),
    points: [...ED.points.values()].map(o => ({ ...o, builtin: PTB.has(o.id) })), removedPoints: [...ED.phid],
    stanther: ED.stan == null ? null : { hex: ED.stan, col: cOf(ED.stan), row: kOf(ED.stan), x: r1(CX[ED.stan]), y: r1(CY[ED.stan]) },
    trade: tradeExport(),
  };
  offer(FSLUG + '-edits.json', JSON.stringify(out, null, 1));
};

// the year's trade as data: what each city makes, sells, buys and lacks, and every flow with its goods and its way
function tradeExport() {
  if (!ECON) return null;
  const E = ECON, nm = k => E.cities[k].id, r2 = v => Math.round(v * 100) / 100, goods = o => Object.fromEntries(Object.entries(o).filter(([, v]) => v >= 0.01).map(([g, v]) => [goodName(g), r2(v)]));
  return {
    note: 'loads are relative to each other on this map; production comes from the ground around each city; prices are shares of each category\'s base value, after the Victoria 3 rule, before and after trade; hubRank is a city\'s rank as a centre of distribution (0 none, 1 market town, 2 regional, 3 great), sendsTo the centre it sends its goods to; line tiers are trunk (great centre to great centre), main (between centres of rank 2 and up), branch (a place to its centre) and user',
    categories: Object.fromEntries(ECATS.map(c => [c, ECAT[c].name])),
    cities: E.cities.map((c, k) => ({ id: c.id, name: c.name, kind: c.kind, zone: c.zone, port: ['none', 'river or lake', 'sea'][c.port],
      production: goods(Object.fromEntries(E.prod[k])), short: Object.fromEntries(Object.entries(c.short || {}).map(([cat, v]) => [cat, r2(v)])), unsold: goods(Object.fromEntries(E.left[k])),
      hubRank: c.rank, rankSetByUser: ED.hubs.has(c.id), sendsTo: c.home >= 0 ? E.cities[c.home].id : null, sendsToChosen: !!c.chosen, valueThrough: r2(c.through), rankByValue: c.sug,
      prices: Object.fromEntries(ECATS.filter(cat => E.MK[k][cat] && (E.MK[k][cat][0] > 0.01 || E.MK[k][cat][1] > 0.01)).map(cat => [cat, { before: r2(E.P0[k][cat]), after: r2(E.P1[k][cat]), made: r2(E.MK[k][cat][0]), wanted: r2(E.MK[k][cat][1]), bought: r2(E.MK[k][cat][2]), sold: r2(E.MK[k][cat][3]) }])) })),
    hubs: E.cities.filter(c => c.hub).map(c => ({ id: c.id, rank: c.rank })),
    lines: E.links.map(L => ({ id: L.id, from: nm(L.ia), to: nm(L.ib), tier: L.tier, mode: L.mode, edited: !!L.own, via: L.via || [], unreachable: !!L.fail, loads: r2(L.vol),
      water: L.wet, land: L.dry, onRoad: L.road, way: L.states ? L.states.filter((t, i) => !i || (t >> 1) !== (L.states[i - 1] >> 1)).map(t => [t >> 1, t & 1 ? 'boat' : 'land']) : [] })),
    flows: E.flows.map(f => ({ from: nm(f.from), to: nm(f.to), category: f.cat, loads: r2(f.amt), by: f.by, goods: goods(f.goods), lines: f.way.map(([li]) => E.links[li].id) })),
  };
}

// ---------- the trade in motion ----------
// Boats and caravans run along the trade lines, each carrying one category of goods: as many on a line as its loads call for,
// each way in proportion to what goes each way, quicker afloat than on land. Two looks: a spark in the colour of its goods, or a
// little ship or wagon flying a pennant in that colour, the way the trade of EU4 is seen moving on its map. They are drawn on a
// canvas of their own over the map, so the map itself is drawn again only when something on it changes.
const FXSPEED = { water: 9, land: 3.2 };           // map units a second: a ship crosses a hex in about a second and a half, a wagon in four
let fxMode = 'dots', fxSet = null, fxRaf = 0, fxFocus = null;
try {
  const m = localStorage.getItem('gresland-trade-motion');
  if (FXMODES[m]) fxMode = m; else if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) fxMode = 'off';
} catch (err) { /* without storage the motion starts as sparks */ }
const fxRunning = () => fxMode !== 'off' && !!ECON && (showR.water || showR.caravan) && !document.hidden;
function fxBuild() {                                 // the ways of the lines that carry something, and who runs on each
  const E = ECON, lines = [], movers = [];
  let seed = 1234567; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
  E.links.forEach((L, li) => {
    if (L.fail || !L.geo) return;
    const vol = tcat ? L.cats.get(tcat) || 0 : L.vol; if (vol < 0.03) return;
    const P = [], wet = [];                          // the way as one line from the first city to the second
    for (const r of L.geo.runs) for (let i = P.length ? 1 : 0; i < r.q.length; i++) { P.push(r.q[i]); if (P.length > 1) wet.push(r.wet); }
    const n = P.length; if (n < 2) return;
    const T = new Float64Array(n); let len = 0;
    for (let j = 1; j < n; j++) { const d = Math.hypot(P[j][0] - P[j - 1][0], P[j][1] - P[j - 1][1]); len += d; T[j] = T[j - 1] + d / FXSPEED[wet[j - 1] ? 'water' : 'land']; }
    if (len < 2) return;
    const w = { li, P, T, wet, dur: T[n - 1] }; lines.push(w);
    const cnt = Math.max(1, Math.min(12, Math.round(Math.sqrt(vol) * len / 70)));
    const d = tcat ? L.cdir.get(tcat) || [0, 0] : [L.fwd, L.back], nf = Math.round(cnt * (d[0] + d[1] > 0 ? d[0] / (d[0] + d[1]) : 0.5));
    const cats = tcat ? [[tcat, 1]] : [...L.cats].filter(([, v]) => v > 0), sum = cats.reduce((a, [, v]) => a + v, 0);
    for (const [dir, k] of [[1, nf], [-1, cnt - nf]]) for (let i = 0; i < k; i++) {
      let u = rnd() * sum, cat = cats[0][0]; for (const [c, v] of cats) if ((u -= v) <= 0) { cat = c; break; }
      movers.push({ w, dir, t0: (i + 0.7 * rnd()) / k * w.dur, cat, j: 2 * rnd() - 1 });
    }
  });
  return { key: E.ver + '|' + tcat, lines, movers };
}
function fxAt(w, tau) {                              // where a runner is at a time along its way, its heading, and whether afloat
  const T = w.T; let lo = 0, hi = T.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (T[mid] <= tau) lo = mid; else hi = mid; }
  const a = w.P[lo], b = w.P[hi], f = T[hi] > T[lo] ? (tau - T[lo]) / (T[hi] - T[lo]) : 0;
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, Math.atan2(b[1] - a[1], b[0] - a[0]), w.wet[lo]];
}
const hexA = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`; };
const FXSPR = new Map();
function fxSprite(kind, cat) {                       // drawn once for each kind and colour: a spark, a ship, a wagon
  const key = kind + cat; let s = FXSPR.get(key); if (s) return s;
  const col = ECAT[cat] ? ECAT[cat].col : '#ffe9a8';
  s = document.createElement('canvas'); const c = s.getContext('2d');
  if (kind === 'spark') {                           // a dark halo under it, so it shows on a pale line as well as on dark water
    s.width = s.height = 32;
    let g = c.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(10,12,16,.55)'); g.addColorStop(0.55, 'rgba(10,12,16,.22)'); g.addColorStop(1, 'rgba(10,12,16,0)');
    c.fillStyle = g; c.fillRect(0, 0, 32, 32);
    g = c.createRadialGradient(16, 16, 0, 16, 16, 14);
    g.addColorStop(0, 'rgba(255,253,240,1)'); g.addColorStop(0.32, 'rgba(255,248,226,.95)'); g.addColorStop(0.42, col); g.addColorStop(0.7, hexA(col, 0.5)); g.addColorStop(1, hexA(col, 0));
    c.fillStyle = g; c.beginPath(); c.arc(16, 16, 14, 0, 2 * Math.PI); c.fill();
  } else {
    s.width = 64; s.height = 48; c.scale(2, 2); c.lineJoin = 'round'; c.lineCap = 'round';
    c.fillStyle = 'rgba(8,10,14,.38)'; c.beginPath(); c.ellipse(16, 20.5, 13, 2.4, 0, 0, 2 * Math.PI); c.fill();
    if (kind === 'ship') {                           // a merchant ship from the side: hull, mast, one square sail, a pennant
      c.beginPath(); c.moveTo(2.5, 14); c.lineTo(29.5, 14); c.lineTo(25.5, 19.5); c.lineTo(6.5, 19.5); c.closePath();
      c.fillStyle = '#6b4528'; c.fill(); c.strokeStyle = '#1e140b'; c.lineWidth = 1; c.stroke();
      c.beginPath(); c.moveTo(3.5, 15.6); c.lineTo(28.5, 15.6); c.strokeStyle = 'rgba(240,214,160,.55)'; c.lineWidth = 0.7; c.stroke();
      c.beginPath(); c.moveTo(16, 14); c.lineTo(16, 1.6); c.strokeStyle = '#26190e'; c.lineWidth = 1.2; c.stroke();
      c.beginPath(); c.moveTo(9, 3.4); c.quadraticCurveTo(16, 1.8, 23, 3.4); c.lineTo(23, 11.6); c.quadraticCurveTo(16, 10.2, 9, 11.6); c.closePath();
      c.fillStyle = '#f1e7cc'; c.fill(); c.strokeStyle = '#3a2c1c'; c.lineWidth = 0.8; c.stroke();
      c.beginPath(); c.moveTo(16, 1.2); c.lineTo(23.5, 2.6); c.lineTo(16, 4); c.closePath(); c.fillStyle = col; c.fill(); c.strokeStyle = 'rgba(20,14,8,.8)'; c.lineWidth = 0.5; c.stroke();
    } else {                                         // a covered wagon drawn by an ox: wheels, bed, canopy with a band in the goods' colour
      c.fillStyle = '#4a3322'; c.beginPath(); c.ellipse(26.2, 14.6, 4, 2.6, 0, 0, 2 * Math.PI); c.fill();
      c.beginPath(); c.arc(30.2, 13.2, 1.7, 0, 2 * Math.PI); c.fill();
      c.strokeStyle = '#3a281a'; c.lineWidth = 1; c.beginPath(); c.moveTo(24.6, 16.6); c.lineTo(24.6, 20); c.moveTo(27.8, 16.6); c.lineTo(27.8, 20); c.moveTo(18.5, 16) ; c.lineTo(23, 15.2); c.stroke();
      c.fillStyle = '#7a5232'; c.fillRect(4, 12, 15, 5); c.strokeStyle = '#25180d'; c.lineWidth = 0.9; c.strokeRect(4, 12, 15, 5);
      c.beginPath(); c.moveTo(4.4, 12); c.bezierCurveTo(4.4, 3.6, 18.6, 3.6, 18.6, 12); c.closePath();
      c.fillStyle = '#efe6cf'; c.fill(); c.strokeStyle = '#3a2c1c'; c.lineWidth = 0.8; c.stroke();
      c.fillStyle = col; c.fillRect(4.7, 9.6, 13.6, 1.8);
      c.fillStyle = '#2b1d12'; for (const wx of [7.6, 15.6]) { c.beginPath(); c.arc(wx, 18, 2.6, 0, 2 * Math.PI); c.fill(); }
      c.fillStyle = '#c9b48a'; for (const wx of [7.6, 15.6]) { c.beginPath(); c.arc(wx, 18, 0.75, 0, 2 * Math.PI); c.fill(); }
    }
  }
  FXSPR.set(key, s); return s;
}
function fxClear() { fxc.setTransform(1, 0, 0, 1, 0, 0); fxc.clearRect(0, 0, fx.width, fx.height); }
function fxFrame(now) {
  fxRaf = 0;
  if (!fxRunning()) { fxClear(); return; }
  if (!fxSet || fxSet.key !== ECON.ver + '|' + tcat) fxSet = fxBuild();
  const fk = mode === 'trade' && tsel ? tsel + '|' + ECON.ver + '|' + tcat : '';
  if (!fxFocus || fxFocus.key !== fk) fxFocus = { key: fk, set: fk ? focusLinks(tsel) : null };
  const t = now / 1000, z = view.s / fitS, ships = fxMode === 'ships';
  const size = (ships ? Math.min(9, 2.6 + 1.9 * Math.sqrt(z)) : Math.min(8, 3.4 + 1.3 * Math.sqrt(z))) / view.s;   // on the screen, in pixels, as map units: small beside a town
  const dens = ships ? Math.min(1, 0.3 + 0.25 * (z - 1)) : Math.min(1, 0.55 + 0.2 * (z - 1));   // zoomed out, fewer of them, so the coast is not a swarm
  // what lies on top of the trade on the map: a runner fades as it passes under a city or a name
  const under = [...LBL.values()], names = [...LBX.values()];
  const x0 = -view.x / view.s - size, y0 = -view.y / view.s - size, x1 = x0 + cv.clientWidth / view.s + 2 * size, y1 = y0 + cv.clientHeight / view.s + 2 * size;
  fxClear(); fxc.setTransform(dpr * view.s, 0, 0, dpr * view.s, dpr * view.x, dpr * view.y);
  for (const m of fxSet.movers) {
    if ((m.j + 1) / 2 > dens) continue;
    const w = m.w; let tau = (m.t0 + t) % w.dur; if (m.dir < 0) tau = w.dur - tau;
    let [x, y, ang, wet] = fxAt(w, tau);
    const off = (m.dir * 0.22 + m.j * 0.08) * size;  // each keeps to the right of its way, so the two ways pass side by side
    x -= Math.sin(ang) * off; y += Math.cos(ang) * off;
    if (x < x0 || x > x1 || y < y0 || y > y1 || !showR[wet ? 'water' : 'caravan']) continue;
    let alpha = fxFocus.set && !fxFocus.set.has(w.li) ? 0.16 : 1;
    const e0 = w.P[0], e1 = w.P[w.P.length - 1], near = 0.9 * size;
    if (Math.abs(x - e0[0]) < near && Math.abs(y - e0[1]) < near || Math.abs(x - e1[0]) < near && Math.abs(y - e1[1]) < near) alpha *= 0.3;
    else if (under.some(b => x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3]) || names.some(n => { const dx = x - n.x, dy = y - n.y, c = Math.cos(n.ang), s = Math.sin(n.ang); return Math.abs(dx * c + dy * s) < n.w / 2 && Math.abs(dy * c - dx * s) < n.fs * 0.6; })) alpha *= 0.3;
    fxc.globalAlpha = alpha;
    if (!ships) { const s = size * (1 + 0.12 * Math.sin(5 * t + 9 * m.j)); fxc.drawImage(fxSprite('spark', m.cat), x - s / 2, y - s / 2, s, s); continue; }
    let a = m.dir < 0 ? ang + Math.PI : ang; const flip = Math.cos(a) < 0;   // the side view faces its way; it leans up or down hill a little
    if (flip) a = Math.atan2(Math.sin(a), -Math.cos(a));
    a = Math.max(-0.5, Math.min(0.5, a));
    fxc.save(); fxc.translate(x, y); fxc.rotate(flip ? -a : a); if (flip) fxc.scale(-1, 1);
    fxc.drawImage(fxSprite(wet ? 'ship' : 'wagon', m.cat), -size * 0.667, -size * 0.8, size * 1.333, size);
    fxc.restore();
  }
  fxc.globalAlpha = 1;
  fxRaf = requestAnimationFrame(fxFrame);
}
function fxKick() { if (fxRunning()) { if (!fxRaf) fxRaf = requestAnimationFrame(fxFrame); } else { if (fxRaf) cancelAnimationFrame(fxRaf); fxRaf = 0; fxClear(); } }
function setFxMode(m) {
  fxMode = FXMODES[m] ? m : 'dots';
  try { localStorage.setItem('gresland-trade-motion', fxMode); } catch (err) { /* the choice lasts this visit */ }
  segPick('fxSeg', 'm', fxMode, setFxMode); fxKick();
}
__on(document, 'visibilitychange', fxKick);

// ---------- start ----------
img.onload = () => requestDraw();
img.src = MAP_IMG;
__on(window, 'resize', refit);
if (window.ResizeObserver) { const ro = new ResizeObserver(() => requestAnimationFrame(() => { if (!__dead) refit(); })); ro.observe(box); __offs.push(() => ro.disconnect()); }
FD = (getComputedStyle(document.body).getPropertyValue('--display') || FD).trim();
fit();
document.fonts && document.fonts.ready.then(() => requestDraw());
updateLegend(); updateStats(); status();
initStore(); scheduleEcon(600);
segPick('fxSeg', 'm', fxMode, setFxMode); fxKick();
window.__terrain = { counts, cities: D.cities.length, labels: D.labels.length, points: D.points.length };
window.__ed = { ED, painted, undoS, redoS, get mode() { return mode; }, get editable() { return editable; }, get layerUsed() { return layerUsed; }, rebuildAll, setMode, setBrush, setBsize, setRtool, setRkind, setCkind };
// ---------- the engine's additions ----------
// moving the view with the keys: a steady glide while a key is held
function panStep(now) {
  panRaf = 0; if (!panKeys.size) return;
  const dt = Math.min(50, now - (panT || now)); panT = now;
  const v = (panFast ? 1.5 : 0.75) * dt, x0 = view.x, y0 = view.y;
  view.x += ((panKeys.has('l') ? 1 : 0) - (panKeys.has('r') ? 1 : 0)) * v; view.y += ((panKeys.has('u') ? 1 : 0) - (panKeys.has('d') ? 1 : 0)) * v;
  clampView();
  if (view.x === x0 && view.y === y0 && view.s <= fitS * 1.001 && !panHint) { panHint = true; flash('ซูมเข้าก่อน แล้วใช้ปุ่มลูกศรหรือ W A S D เลื่อนแผนที่'); }
  requestDraw(); panRaf = requestAnimationFrame(panStep);
}
function panKick() { if (!panRaf) { panT = 0; panRaf = requestAnimationFrame(panStep); } }

// the terrain as changed by someone else in the room: only the hexes that differ are repainted
function softTerrain(body) {
  if (!body || typeof body.cells !== 'string' || body.cells.length !== N) return false;
  if (JSON.stringify(body.rivOff || []) !== JSON.stringify(serial('terrain').rivOff)) return false;
  const ch = []; for (let i = 0; i < N; i++) { const c1 = body.cells[i], c = c1 !== '.' && CODES.includes(c1) && c1 !== BI[i] ? c1 : '.'; if (ED.cells[i] !== c) ch.push([i, c]); }
  if (ch.length > 2500) return false;
  let flip = false; const ids = [];
  for (const [i, c1] of ch) { const before = eff(i); setCell(i, c1); if (isW(before) !== isW(eff(i))) flip = true; ids.push(i); }
  if (ids.length) { rebuildHexes(ids, flip); layerUsed = painted.size > 0 || ED.rivers.length > 0; bumpRoutes(); scheduleEcon(); updateStats(); requestDraw(); }
  return true;
}

// the others in the room, where their pointers are
let PEERS = [], curT = 0;
cv.addEventListener('pointermove', e => { if (!ENV.room) return; const now = performance.now(); if (now - curT < 170) return; curT = now; const [mx, my] = toMap(e.clientX, e.clientY); ENV.room.cursor(mx, my); });
function drawPeers() {
  if (!PEERS.length) return;
  ctx.setTransform(dpr * view.s, 0, 0, dpr * view.s, dpr * view.x, dpr * view.y);
  const px = 1 / view.s;
  for (const p of PEERS) {
    const col = /^#[0-9a-f]{6}$/i.test(p.color) ? p.color : '#e8b04a';
    ctx.beginPath(); ctx.arc(p.x, p.y, 7 * px, 0, 2 * Math.PI); ctx.lineWidth = 4.5 * px; ctx.strokeStyle = 'rgba(15,17,20,.8)'; ctx.stroke(); ctx.lineWidth = 2.2 * px; ctx.strokeStyle = col; ctx.stroke();
    ctx.beginPath(); ctx.arc(p.x, p.y, 2 * px, 0, 2 * Math.PI); ctx.fillStyle = col; ctx.fill();
    ctx.font = `600 ${12 * px}px 'Noto Sans Thai', sans-serif`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 3.5 * px; ctx.strokeStyle = 'rgba(15,17,20,.9)'; ctx.strokeText(p.name, p.x + 11 * px, p.y - 11 * px); ctx.fillStyle = col; ctx.fillText(p.name, p.x + 11 * px, p.y - 11 * px);
  }
}
// the scale: one hex centre to the next is the map's distance for a hex
let scaleKey = '';
function drawScale() {
  const el = $('scalebar'); if (!el) return;
  const kmU = (ENV.meta && ENV.meta.kmPerHex || 10) / DY, target = 120 / view.s * kmU;
  const p = Math.pow(10, Math.floor(Math.log10(target))), m = target / p, nice = (m >= 5 ? 5 : m >= 2 ? 2 : 1) * p, w = Math.round(nice / kmU * view.s);
  const key = nice + ':' + w; if (key === scaleKey) return; scaleKey = key;
  el.firstChild.textContent = (nice >= 1 ? nice.toLocaleString('en-US') : String(+nice.toPrecision(2))) + ' กม.'; el.lastChild.style.width = w + 'px';
}
const __drawBase = draw;
draw = function () { __drawBase(); drawPeers(); drawScale(); };

// mountains and rivers laid by rule on the ground as it stands (gen.js); each is one step of undo
const groundNow = () => { const a = new Array(N); for (let i = 0; i < N; i++) a[i] = eff(i); return a; };
$('autoMt').onclick = () => {
  if (!editable) return;
  const keep = new Set(); for (const ct of visibleCities()) { const h = hexAt(ct.x, ct.y); if (h >= 0) keep.add(h); }
  const ids = MME.autoMountains(G, groundNow(), { seed: (Math.random() * 1e9) | 0, amount: +$('autoMtAmt').value / 100, keep });
  const ch = ids.filter(i => eff(i) !== 'M').map(i => [i, ED.cells[i], BI[i] === 'M' ? '.' : 'M']);
  if (!ch.length) { flash('ยังไม่มีแผ่นดินที่กว้างพอจะตั้งเทือกเขา ระบายแผ่นดินให้ห่างฝั่งอย่างน้อยสองช่องก่อน'); return; }
  doOp({ k: 't', ch }); flash(`วางเทือกเขา ${ch.length} ช่อง ถ้าไม่ถูกใจกดย้อนแล้ววางใหม่ได้`);
};
$('autoRiv').onclick = () => {
  if (!editable) return;
  const blocked = new Set(URVH); for (let i = 0; i < N; i++) if (RV[i] !== '0' && shownAt(i)) blocked.add(i);
  const res = MME.autoRivers(G, groundNow(), { seed: (Math.random() * 1e9) | 0, density: +$('autoRivAmt').value, blocked });
  const list = res.rivers.slice(0, 2400 - ED.rivers.length);
  if (!list.length) { flash(res.why || 'ไม่มีลุ่มน้ำที่ควรมีแม่น้ำเพิ่ม ลองวางภูเขาก่อน หรือเพิ่มจำนวนแม่น้ำ'); return; }
  const ops = list.map(r => ({ k: 'r+', r: { id: uid('r'), kind: r.kind, pts: r.pts } }));
  doOp(ops.length === 1 ? ops[0] : { k: 'm', ops }); flash(`วางแม่น้ำ ${ops.length} สาย ถ้าไม่ถูกใจกดย้อนแล้ววางใหม่ได้`);
};
document.querySelector('section.method').hidden = !(D.method && D.method.length);


// ---------- the economy the owner shapes: goods, price classes, people, states and their borders (document map/economy) ----------
// A good's term: { on: ground codes or '@' + a kind of point, rate: loads a hex, f rain-fed, r river in the hex, m within m hexes of
// a mountain, c within c hexes of the sea, l beside a lake, o a forest's open edge }.
function ecoTerm(t) { const o = { on: t[0], rate: t[1] }; for (const m of String(t[2] || '').match(/[a-z]\d*/g) || []) { const k = m[0]; o[k] = k === 'm' || k === 'c' ? +m.slice(1) || 1 : 1; } return o; }
function ecoRuleF(g) { return H => { let v = (H.gx && H.gx[g.id]) || 0; for (const t of g.terms) if (t.on[0] === '@') v += t.rate * (H.pt[t.on.slice(1)] || 0); return v; }; }
const ECO = { goods: {}, custom: [], cats: {}, ucats: [], tune: {}, work: {}, pop: {}, danger: {}, auto: BLANK, states: [], orgs: [], cells: new Array(N).fill('.'), unit: 1000, central: { name: 'เหรียญกลาง', per: 40000 }, tier: '', total: 0, cpp: 40, noSlave: 0 };
// What the model's two scales stand for (v0.9.0, the owner asked for numbers that read as a world's). A head of the model is
// EUNIT people, so a village is 1,600 and a capital 12,000 before the owner counts them. A unit of base value, the worth of a
// load of staple food, is ECOIN coins for each of those people: a person's grain for a year costs 40 coins, and what a person
// makes in a year comes to about 250, when a coin is roughly what unskilled work earns in most of a day. Both are my numbers.
const EUNIT = 1000, ECOIN = 40;
let POL = null, FXS = null, POLG = 0, POLC = 0;               // what each state is doing about its balance this year (worked out in the society part), and the two numbers it hands back to a trade
// How many people the whole map holds (v0.10.0, the owner's five levels and his words for them). With a level chosen, the people
// of a head of the model follow from it: the level's number shared over every city by its weight. The numbers inside each band are mine.
// The levels of people a map can hold (v0.11.1, the owner's three): a few million, a few hundred million, billions. Anything else
// the owner writes as a number. Before that there were five under other keys; a map that named one of those keeps the people it
// had, under the level that now means that many or as a number of its own.
const ETIER = { low: ['ต่ำ', 3e6, 'ไม่กี่ล้านคน'], mid: ['กลาง', 3e8, 'ไม่กี่ร้อยล้านคน'], high: ['สูง', 2e9, 'พันล้านคน'] };
const ETIER_OLD = { xs: 3e4, l: 3e5, m: 'low', h: 'high', xl: 2e10 };
const tierOk = k => typeof k === 'string' && Object.prototype.hasOwnProperty.call(ETIER, k);
function ecoScale() {
  if (!(ECO.total > 0)) return;
  let h0 = 0, own = 0, all = 0;
  for (const c of visibleCities()) { const k = KIX[c.kind] != null ? KIX[c.kind] : 1; all += EPOP[k]; if (ECO.pop[c.id] > 0) own += ECO.pop[c.id]; else h0 += EPOP[k]; }
  if (!(all > 0)) return;
  ECO.unit = clamp(h0 > 0 && ECO.total > own ? (ECO.total - own) / h0 : ECO.total / all, 0.01, 1e9);   // cities the owner counted keep their count; the rest share what is left
  ECO.central.per = ECO.unit * ECO.cpp;                // a person's year stays worth what it was, whatever the map holds
}
// an organisation's kinds, each with the effects it starts with (the owner changes them): what it adds to output and to the worth
// of what is made, what it gives the people, what it takes off the cost of carrying, and whether its houses trade past the states
// What a state's law says of slaves (v0.11.0, the owner's three). A city under no state, and a land without one, trade freely.
const ESLAVE = {
  abol: ['เลิกทาสสมบูรณ์', 'ไม่มีใครถือทาสได้ คนของรัฐนี้ถูกขายไม่ได้ และเมืองของรัฐนี้ซื้อทาสไม่ได้'],
  pat: ['ระบบอุปถัมภ์', 'ถือทาสได้ตามเงื่อนไข และทาสเป็นไทได้ง่าย เมืองจึงมีทาสน้อยกว่าและได้แรงงานจากทาสน้อยกว่า ซื้อทาสจากนอกรัฐเข้ามาได้ แต่ขายคนของรัฐออกนอกรัฐไม่ได้'],
  free: ['ค้าทาสเสรี', 'ซื้อขายทาสได้ทั้งในรัฐและข้ามรัฐ เว้นแต่กับคู่อริ'],
};
const OKIND = {
  guild: ['กิลด์ช่างฝีมือ', { prod: 0.15, val: 0.1, well: 0, haul: 0, net: 0 }, '#d9a24a'],
  assoc: ['สมาคมการค้า', { prod: 0, val: 0, well: 0, haul: 0.15, net: 1 }, '#4fb0c9'],
  charity: ['องค์กรสาธารณกุศล', { prod: 0, val: 0, well: 0.1, haul: 0, net: 0 }, '#7cc47f'],
  faith: ['องค์กรศาสนา', { prod: 0, val: 0.05, well: 0.06, haul: 0, net: 0 }, '#c9a0d0'],
  other: ['องค์กรอื่น', { prod: 0, val: 0, well: 0, haul: 0, net: 0 }, '#b0b0b0'],
};
const ECAT0 = JSON.parse(JSON.stringify(ECAT)), EGOODS0 = EGOODS.map(g => ({ ...g })), EWORK0 = JSON.parse(JSON.stringify(EWORK));   // as the map's base gives them
// The model's own numbers, every one of them mine until the owner rules otherwise: [what it starts at, least, most, step, what it is].
// The owner changes them in the economy card; a map keeps only the ones that differ from these.
const ETUNE = {
  cut: [0.04, 0, 0.5, 0.01, 'ส่วนคนกลางของตลาดทุนนิยม เป็นส่วนของมูลค่าที่ขาย', 'ค้าข้ามรัฐ'],
  hubDisc: [0.9, 0.5, 1, 0.01, 'ค่าขนเมื่อของผ่านตลาดทุนนิยมที่อยู่บนทาง เทียบกับไม่ผ่าน (1 คือไม่ลด)', 'ค้าข้ามรัฐ'],
  hubCut: [0.02, 0, 0.5, 0.005, 'ค่าฝากผ่านตลาดทุนนิยม เป็นส่วนของมูลค่าที่ขาย', 'ค้าข้ามรัฐ'],
  capLeg: [0.85, 0.3, 1, 0.01, 'ค่าขนระหว่างรัฐทุนนิยมด้วยกัน เทียบกับปกติ', 'ค้าข้ามรัฐ'],
  socLeg: [0.05, 0, 1, 0.01, 'ค่าขนในรัฐสังคมนิยมที่ผู้ค้าต้องจ่ายเอง เทียบกับปกติ', 'ค้าข้ามรัฐ'],
  tradFar: [5, 0.5, 100, 0.5, 'ระยะไกลสุดที่ชุมชนดั้งเดิมค้ากันเอง (หน่วยค่าเดินทาง)', 'ค้าข้ามรัฐ'],
  tradOut: [1.3, 1, 5, 0.05, 'ค่าขนเมื่อคนนอกต้องเข้ามารับของถึงรัฐดั้งเดิม เทียบกับปกติ', 'ค้าข้ามรัฐ'],
  wall: [0.25, 0, 2, 0.01, 'กำแพงภาษีของพาณิชยนิยมต่อสินค้าโรงงานต่างรัฐ เป็นส่วนของราคาฐาน', 'ค้าข้ามรัฐ'],
  keep: [0.12, 0, 2, 0.01, 'ภาษีส่งออกวัตถุดิบของพาณิชยนิยม เป็นส่วนของราคาฐาน', 'ค้าข้ามรัฐ'],
  big: [0.04, 0, 0.3, 0.01, 'แรงดึงของตลาดใหญ่ ต่อประชากรที่เพิ่มเป็นสองเท่า', 'ค้าข้ามรัฐ'],
  fxFee: [0.02, 0, 0.5, 0.005, 'ค่าแลกเงินเมื่อผู้ซื้อกับผู้ขายใช้เงินต่างสกุล เป็นส่วนของมูลค่าที่ขาย', 'เงิน'],
  fxPow: [0.25, 0, 1, 0.05, 'น้ำหนักของค่าเงินต่อราคาที่ผู้ขายเห็น (0 คือไม่มีผล)', 'เงิน'],
  tithe: [0.1, 0, 0.9, 0.01, 'ส่วยที่ชุมชนศักดินาส่งให้ศูนย์ เป็นส่วนของ GDP', 'เงิน'],
  pool: [0.5, 0, 1, 0.05, 'ส่วนของ GDP ที่รัฐสังคมนิยมรวมไปแบ่งตามหัว', 'เงิน'],
  rivalStep: [4, 1, 50, 0.5, 'ต้นทุนของช่องในแดนคู่อริตอนหาเส้นทาง เทียบกับช่องปกติ', 'เขตแดนและอันตราย'],
  hostile: [3, 0, 20, 0.25, 'ค่าขนที่เพิ่มของเส้นซึ่งต้องผ่านแดนคู่อริ ต่อสัดส่วนของทางที่ผ่าน', 'เขตแดนและอันตราย'],
  dstep: [0.5, 0, 5, 0.05, 'ค่าขนที่เพิ่มต่ออันตรายหนึ่งระดับ', 'เขตแดนและอันตราย'],
  dfar: [0.5, 0, 1, 0.05, 'น้ำหนักของทางที่ไกลเมือง ในการประเมินอันตราย', 'เขตแดนและอันตราย'],
  dfree: [0.3, 0, 1, 0.05, 'น้ำหนักของทางที่ไม่มีรัฐใดถือ', 'เขตแดนและอันตราย'],
  drough: [0.2, 0, 1, 0.05, 'น้ำหนักของภูมิประเทศทุรกันดารและทะเลเปิด', 'เขตแดนและอันตราย'],
  d1: [0.15, 0, 1, 0.01, 'คะแนนที่เริ่มนับว่ามีโจรบ้าง', 'เขตแดนและอันตราย'],
  d2: [0.3, 0, 1, 0.01, 'คะแนนที่เริ่มนับว่าอันตราย', 'เขตแดนและอันตราย'],
  d3: [0.5, 0, 1, 0.01, 'คะแนนที่เริ่มนับว่าอันตรายมาก', 'เขตแดนและอันตราย'],
  pop1: [9.5, 1, 1000, 0.5, 'ประชากรที่ทำให้เมืองทำงานระดับเมืองหลวง (หน่วยของแบบจำลอง)', 'ประชากร'],
  pop2: [5.5, 1, 1000, 0.5, 'ประชากรที่ทำให้ทำงานระดับเมืองใหญ่', 'ประชากร'],
  pop3: [2.4, 0.5, 1000, 0.1, 'ประชากรที่ทำให้ทำงานระดับเมืองเล็ก ต่ำกว่านี้เป็นหมู่บ้าน', 'ประชากร'],
  slaveOut: [0.06, 0, 0.5, 0.005, 'ส่วนของคนในเมืองที่ยากจนที่สุดที่ตกเป็นทาส เมืองที่จนน้อยกว่าได้น้อยลงตามส่วน', 'แรงงานทาส'],
  slaveIn: [0.08, 0, 0.6, 0.005, 'จำนวนทาสที่เมืองมั่งคั่งที่สุดต้องการ เป็นส่วนของประชากรเมือง', 'แรงงานทาส'],
  slaveCheap: [100000, 100, 1e9, 1000, 'จำนวนคนของเมืองที่ทำให้แรงงานอิสระถูกจนความต้องการทาสเหลือครึ่ง เมืองยิ่งใหญ่กว่านี้ยิ่งต้องการทาสน้อย', 'แรงงานทาส'],
  slaveGain: [0.5, 0, 2, 0.05, 'รายได้ที่เมืองได้จากทาสหนึ่งคนต่อปี เป็นส่วนของรายได้ต่อหัวเฉลี่ยของแผนที่', 'แรงงานทาส'],
  slavePrice: [3, 0.1, 30, 0.1, 'ราคาทาสหนึ่งคน เป็นจำนวนปีของรายได้ต่อหัวเฉลี่ยของแผนที่', 'แรงงานทาส'],
  slaveHaul: [0.25, 0, 3, 0.05, 'ค่าขนย้ายทาสหนึ่งคนบนเส้นทางยาวปานกลางของแผนที่ เป็นส่วนของราคาทาส เส้นทางที่ค่าขนย้ายเกินราคาทาสไม่มีใครเดิน', 'แรงงานทาส'],
  orgYears: [5, 0, 50, 0.5, 'มูลค่าองค์กรนับมูลค่าที่องค์กรสร้างต่อปีกี่ปี บวกกับทุนตั้งต้น', 'องค์กร'],
  orgFee: [0.03, 0, 0.5, 0.005, 'ค่าธรรมเนียมที่องค์กรเก็บจากของที่ค้าผ่านเครือข่ายขององค์กร เป็นส่วนของมูลค่าที่ขาย', 'องค์กร'],
};
function TU(k) { const v = ECO.tune[k]; return v == null ? ETUNE[k][0] : v; }
const SKEYS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', SCOLS = ['#d9534f', '#4f8fd9', '#58b368', '#e0a83a', '#a56cd6', '#3bb5ad', '#e07a3a', '#c95f9c', '#8a9a3a', '#7480e0'];
const ESYS = {
  trad: ['ดั้งเดิม', 'ไม่ออกไปค้าเอง ค้ากันเองได้แค่ระยะใกล้ ของไกลต้องรอพ่อค้าต่างรัฐเข้ามา ซึ่งคิดค่าขนแพงขึ้น'],
  feud: ['ศักดินา', 'ชุมชนส่งของเหลือให้ศูนย์ที่ตนขึ้นอยู่ก่อน ของที่ชุมชนขายหรือซื้อกับที่อื่นต้องผ่านศูนย์นั้น แล้วจึงค้าในรัฐ แล้วจึงค้านอกรัฐ'],
  merc: ['พาณิชยนิยม', 'ซื้อของถูก ขายของเหลือให้ผู้ให้ราคาดีที่สุดโดยนับค่าเงินที่แข็งกว่าเป็นราคาที่ดีกว่า ตั้งกำแพงกับสินค้าโรงงานต่างรัฐ และหวงวัตถุดิบไว้ในรัฐ'],
  cap: ['ทุนนิยม', 'ค้าเสรี ค่าขนระหว่างรัฐทุนนิยมด้วยกันถูกลง เลือกผู้ซื้อตามค่าเงินที่แข็งกว่า ตลาดของรัฐที่อยู่บนทางผ่านรับของของผู้อื่นไปส่งต่อในค่าขนที่ถูกลงโดยเก็บค่าฝาก และรับของจากคู่อริสองฝ่ายไปขายต่อให้กันโดยเก็บส่วนคนกลาง'],
  anar: ['อนาธิปไตย', 'ดินแดนที่ไม่มีรัฐใดปกครอง นับเป็นทุนนิยมทุกอย่าง และมีตลาดมืดที่ขายให้ใครก็ได้ ไม่ถือคู่อริของใคร กำแพงภาษีและการหวงวัตถุดิบของรัฐอื่นใช้กับของที่เข้าออกดินแดนนี้ไม่ได้ ตลาดของดินแดนนี้รับของจากคู่อริสองฝ่ายไปขายต่อให้กันได้ เส้นทางในดินแดนนี้นับว่าไม่มีรัฐคุ้มครอง'],
  soc: ['สังคมนิยม', 'ของในรัฐถูกรวมที่เมืองศูนย์กลางแล้วแจกตามความขาดโดยรัฐรับค่าขนเอง ของเข้าออกรัฐผ่านเมืองศูนย์กลาง ส่งออกเฉพาะส่วนที่เหลือ']
};
const MERCKEEP = new Set(['ore', 'timber', 'cloth', 'mana', 'rare']), DANGER = ['ปลอดภัย', 'มีโจรบ้าง', 'อันตราย', 'อันตรายมาก'];
let RULEIX = {}, ECODM = null, ECODS = null, ECODC = null, WAYS = new Map(), ecoStamp = 1, ecoDirty = false, ecoLoaded = false, ecoT = 0, ecoSaving = false;
const ECOX = { on: false, feud: false, bargain: false, byKey: new Map(), C: [], NT: null, cap: new Map(), brokers: [], seat: new Int32Array(0), km: 1 };
const ecoPop = (id, ki) => ECO.pop[id] > 0 ? ECO.pop[id] / ECO.unit : EPOP[ki];
const KIK = ['capital', 'city', 'town', 'fort', 'village'];
// the level a city works at: its kind, or the one its people make it once the owner has counted them (a fort stays a fort until it is a city)
function ecoKi(id, kind) { const ki = KIX[kind] != null ? KIX[kind] : 1; if (!(ECO.pop[id] > 0)) return ki; const h = ECO.pop[id] / ECO.unit, fit = h >= TU('pop1') ? 0 : h >= TU('pop2') ? 1 : h >= TU('pop3') ? 2 : 4; return ki === 3 && fit >= 2 ? 3 : fit; }
const ecoFx = s => Math.pow(clamp(s.rate || 1, 0.25, 4), TU('fxPow'));
const ecoCoin = s => (s && s.cur ? s.cur.trim().toLowerCase() : '');
const ecoCap = s => !!s && (s.sys === 'cap' || s.sys === 'anar');     // a land without a state trades as a capitalist one does
const ecoRival = (a, b) => !!a && !!b && a !== b && a.sys !== 'anar' && b.sys !== 'anar' && (a.rel[b.id] === 'rival' || b.rel[a.id] === 'rival');   // the black market has no enemies
const ecoRivalCell = (s, z) => { if (!s || s.sys === 'anar' || s.rel[z] !== 'rival') return false; const o = ECOX.byKey.get(z); return !o || o.sys !== 'anar'; };   // a state that names no coin of its own uses the central one

function ecoApply() {                              // the tables the year's trade reads, from the base and the owner's changes
  for (const c of [...ECATS]) if (ECAT[c].own) { delete ECAT[c]; delete ENEED[c]; ECATS.splice(ECATS.indexOf(c), 1); ERAW.splice(ERAW.indexOf(c), 1); }   // the owner's own classes, afresh
  for (const u of ECO.ucats) { ECAT[u.id] = { name: u.name, col: u.col, v: u.v, bulk: u.bulk, own: true }; ENEED[u.id] = [u.need, u.need, u.need, u.need, u.need]; ECATS.push(u.id); ERAW.push(u.id); }
  if (tcat && !ECAT[tcat]) tcat = '';
  for (const c of ECATS) { if (ECAT[c].own) continue; const o = ECO.cats[c] || {}, z = ECAT0[c]; ECAT[c].name = o.name || z.name; ECAT[c].v = o.v > 0 ? o.v : z.v; ECAT[c].bulk = o.bulk > 0 ? o.bulk : z.bulk; }
  const rawCat = (c, d) => ECAT[c] && !ECAT[c].made ? c : d;
  for (const m of EMADEC) {                          // the workshops' recipes: the base's, or the owner's, fed by any raw class including the owner's own
    const o = ECO.work[m], z = EWORK0[m], ins = {};
    if (o && o.in) for (const [c, q] of Object.entries(o.in)) if (ECAT[c] && !ECAT[c].made && q > 0) ins[c] = q;
    EWORK[m] = { base: o && o.base > 0 ? o.base : z.base, in: o && o.in && Object.keys(ins).length ? ins : z.in };
  }
  EGOODS.length = 0;
  for (const z of EGOODS0) {
    const o = ECO.goods[z.id] || {}, g = { ...z, name: o.name || z.name, cat: rawCat(o.cat, z.cat), pct: o.pct == null ? 1 : o.pct, off: !!o.off, far: o.far == null ? z.far : !!o.far, terms: z.terms ? (Array.isArray(o.terms) ? o.terms : z.terms) : null, edited: !!ECO.goods[z.id] };
    if (g.terms) g.f = ecoRuleF(g); EGOODS.push(g);
  }
  for (const o of ECO.custom) { const g = { id: o.id, name: o.name, cat: rawCat(o.cat, 'luxury'), pct: o.pct == null ? 1 : o.pct, off: !!o.off, far: !!o.far, terms: o.terms, src: 'owner', custom: true }; g.f = ecoRuleF(g); EGOODS.push(g); }
  GBY.clear(); for (const g of EGOODS) GBY.set(g.id, g);
  RULEIX = {};
  for (const g of EGOODS) if (g.terms && !g.off) for (const t of g.terms) { if (t.on[0] === '@') continue; for (const ch of new Set(t.on)) (RULEIX[ch] || (RULEIX[ch] = [])).push({ ...t, g: g.id }); }
  const sel0 = $('tdCat').value; $('tdCat').innerHTML = `<option value="">ทุกหมวด</option>` + ECATS.map(c => `<option value="${c}">${esc(ECAT[c].name)}</option>`).join(''); $('tdCat').value = sel0;
}
function ecoRuleHex(H, i, b, w) {                  // one worked hex: what the rule goods find on it
  for (const t of RULEIX[b]) {
    if (t.r && !((RV[i] === '1' && shownAt(i)) || URVH.has(i))) continue;
    if (t.m && !(ECODM && ECODM[i] <= t.m)) continue;
    if (t.c && !(ECODS && ECODS[i] <= t.c)) continue;
    if (t.l || t.o) { let lake = false, open = false; for (let k = 0; k < 6; k++) { const v = NB[i * 6 + k]; if (v < 0) continue; const e = eff(v); if (e === 'L') lake = true; else if (!isW(e) && !FOREST.has(e) && e !== 'M') open = true; } if ((t.l && !lake) || (t.o && !open)) continue; }
    H.gx[t.g] = (H.gx[t.g] || 0) + w * t.rate * (t.f ? CL_ARR.f[i] : 1);
  }
}
function ecoPrep() {                               // before the year is worked out: distances the rules ask for, and which states are on the map
  let needM = false, needS = false; for (const k in RULEIX) for (const t of RULEIX[k]) { if (t.m) needM = true; if (t.c) needS = true; }
  const bfs = (src, lim = 9) => { const d = new Uint8Array(N).fill(99), q = []; for (let i = 0; i < N; i++) if (src(i)) { d[i] = 0; q.push(i); } for (let h = 0; h < q.length; h++) { const u = q[h]; if (d[u] >= lim) continue; for (let k = 0; k < 6; k++) { const v = NB[u * 6 + k]; if (v >= 0 && d[v] > d[u] + 1) { d[v] = d[u] + 1; q.push(v); } } } return d; };
  ECODM = needM ? bfs(i => eff(i) === 'M') : null; ECODS = needS ? bfs(i => isSea(eff(i))) : null;
  if (ECO.auto) { const at = new Set(visibleCities().map(c => landHex(hexAt(c.x, c.y)))); ECODC = bfs(i => at.has(i), 13); } else ECODC = null;
  ECOX.byKey = new Map(ECO.states.map(s => [s.id, s]));
  let used = false; if (ECO.states.length) for (let i = 0; i < N; i++) if (ECOX.byKey.has(ECO.cells[i])) { used = true; break; }
  ECOX.km = clamp((ENV.meta && +ENV.meta.kmPerHex || 34) / 34, 0.2, 5);   // carriage is priced by the road's real length: the numbers were set on Gresland's 34 km a hex
  ECOX.on = used; ECOX.feud = used && ECO.states.some(s => s.sys === 'feud'); ECOX.bargain = used || Object.keys(ECO.pop).length > 0;
}
function ecoCities(cities) {
  ECOX.C = cities;
  for (const c of cities) {
    c.sto = ECOX.byKey.get(c.st) || null; c.near = new Set();
    if (ECOX.on && c.ki === 4) { let ring = [c.h]; const seen = new Set(ring); for (let r = 0; r < 2; r++) { const nx = []; for (const u of ring) for (let k = 0; k < 6; k++) { const v = NB[u * 6 + k]; if (v >= 0 && !seen.has(v)) { seen.add(v); nx.push(v); if (ECO.cells[v] !== '.') c.near.add(ECO.cells[v]); } } ring = nx; } }   // a village by the border knows its neighbours
  }
}
// what a line costs to ride: its way, dearer for the danger the owner gave it, and for every stretch through the land or waters of a rival
function ecoLinkCost(L, cities) {
  const own = ECO.danger[L.id] || 0; L.dauto = !own && ECO.auto ? ecoAutoDanger(L) : null;
  L.danger = own === 4 ? 0 : own || (L.dauto ? L.dauto.lv : 0); let k = 1 + TU('dstep') * L.danger; L.hostile = 0;
  if (ECOX.on && L.states && L.states.length) {
    const sa = cities[L.ia].sto, sb = cities[L.ib].sto; let bad = 0;
    if (sa || sb) for (const s of L.states) { const z = ECO.cells[s >> 1]; if (z !== '.' && (ecoRivalCell(sa, z) || ecoRivalCell(sb, z))) bad++; }
    L.hostile = bad / L.states.length; k *= 1 + TU('hostile') * L.hostile;      // what could not be gone around is paid for
  }
  return L.cost * k;
}
// How dangerous a line looks when the owner has not said: the share of its way that runs far from any city, through land or
// water no state holds (once there are states), and over hard ground or open sea. The weights and the steps are my own numbers.
function ecoAutoDanger(L) {
  const st = L.states; if (!st || !st.length || !ECODC) return null;
  let far = 0, free = 0, rough = 0;
  for (const t of st) { const h = t >> 1, b = eff(h); far += clamp((ECODC[h] - 4) / 8, 0, 1); if (ECOX.on && (ECO.cells[h] === '.' || (ECOX.byKey.get(ECO.cells[h]) || {}).sys === 'anar')) free++; if (t & 1 ? isSea(b) && !SHORE[h] : (CAR[b] || 3) >= 4.5) rough++; }
  const n = st.length, sc = TU('dfar') * far / n + TU('dfree') * free / n + TU('drough') * rough / n;
  return { lv: sc < TU('d1') ? 0 : sc < TU('d2') ? 1 : sc < TU('d3') ? 2 : 3, sc, far: far / n, free: free / n, rough: rough / n };
}
const ecoPhases = () => !ECOX.on ? [-1] : ECOX.feud ? [0, 1, 2] : [1, 2];
// The way a load takes under the systems of the states it leaves and enters. A feudal community sells and buys through the seat
// it answers to; a socialist state gathers and hands out through its capital, and carries inside its borders at its own cost; two
// rivals reach each other only through a market of a capitalist state at odds with neither, which keeps a middleman's cut.
function ecoWays(NT) {
  ECOX.NT = NT; WAYS = new Map(); ECOX.cap = new Map(); ECOX.brokers = []; ECOX.seat = new Int32Array(ECOX.C.length).fill(-1); if (!ECOX.on) return;
  ECOX.C.forEach((c, k) => {
    const s = c.sto; if (!s) return;
    const b = ECOX.cap.has(s) ? ECOX.C[ECOX.cap.get(s)] : null;
    if (!b || c.id === s.cap || (b.id !== s.cap && (c.rank > b.rank || (c.rank === b.rank && c.pop > b.pop)))) ECOX.cap.set(s, k);
    if (ecoCap(s) && c.rank >= 1) ECOX.brokers.push(k);
  });
  // a feudal community answers to a seat of its own state: the centre it already sends to, or the nearest market of the state
  ECOX.C.forEach((c, k) => {
    const s = c.sto; if (!s || s.sys !== 'feud' || c.home < 0) return;
    if (ECOX.C[c.home].sto === s) { ECOX.seat[k] = c.home; return; }
    let best = Infinity; ECOX.C.forEach((o, q) => { if (q !== k && o.sto === s && o.rank >= 1 && NT[k][q] < best) { best = NT[k][q]; ECOX.seat[k] = q; } });
  });
}
const ecoLeg = (a, b) => { const s = ECOX.C[a].sto; return ECOX.NT[a][b] * (s && s === ECOX.C[b].sto && s.sys === 'soc' ? TU('socLeg') : 1); };
function ecoGate(k) {                               // the city a community's goods pass on their way out or in
  const c = ECOX.C[k], s = c.sto; if (!s) return -1;
  if (s.sys === 'feud') return ECOX.seat[k];
  if (s.sys === 'soc') { const cap = ECOX.cap.get(s); return cap != null && cap !== k ? cap : -1; }
  return -1;
}
function ecoWay(i, j, cat) {
  const C = ECOX.C;
  // two houses of one organisation that trades past the states deal with each other directly: no seat, no capital, no broker
  if (cat && orgNet(C[i], C[j], cat)) { const ko = -(i * C.length + j) - 1; let wo = WAYS.get(ko); if (!wo) WAYS.set(ko, wo = { t: ECOX.NT[i][j], mids: null, broker: -1, hub: -1, org: true }); return wo; }
  const key = i * C.length + j; let w = WAYS.get(key); if (w) return w;
  const si = C[i].sto, sj = C[j].sto, gi = ecoGate(i), gj = ecoGate(j), a = gi >= 0 && gi !== j ? gi : i, z = gj >= 0 && gj !== i ? gj : j;
  const nodes = [i]; if (a !== i) nodes.push(a);
  let broker = -1;
  if (ecoRival(si, sj)) {
    let best = Infinity;
    for (const r of ECOX.brokers) { const sr = C[r].sto; if (sr === si || sr === sj || ecoRival(sr, si) || ecoRival(sr, sj)) continue; const t = ecoLeg(a, r) + ecoLeg(r, z); if (t < best) { best = t; broker = r; } }
    if (broker >= 0) nodes.push(broker);
  }
  if (z !== j && nodes[nodes.length - 1] !== z) nodes.push(z);
  nodes.push(j);
  let t = 0; for (let q = 0; q + 1 < nodes.length; q++) t += ecoLeg(nodes[q], nodes[q + 1]);
  // A load that would go straight may instead be left with a market of a capitalist state that stands on its way: such a market
  // gathers loads and sends them on at a lower cost a load, and keeps a fee. It never pays to go far out of the way for it.
  let hub = -1;
  if (nodes.length === 2 && broker < 0 && ECOX.brokers.length && !ecoRival(si, sj)) {
    const disc = TU('hubDisc'); let best = t;
    if (disc < 1) for (const r of ECOX.brokers) { if (r === i || r === j) continue; const sr = C[r].sto; if (ecoRival(sr, si) || ecoRival(sr, sj)) continue; const t2 = (ecoLeg(i, r) + ecoLeg(r, j)) * disc; if (t2 < best) { best = t2; hub = r; } }
    if (hub >= 0) { t = best; nodes.splice(1, 0, hub); }
  }
  WAYS.set(key, w = { t, mids: nodes.length > 2 ? nodes.slice(1, -1) : null, broker, hub });
  return w;
}
function ecoRide(f, NWAY) {                         // the lines a flow rides, by way of the cities that pass it on
  if (!f.via) return NWAY[f.from][f.to];
  const out = []; let at = f.from; for (const m of [...f.via, f.to]) { for (const x of NWAY[at][m]) out.push(x); at = m; }
  return out;
}
// what a load from city i to city j earns, under the systems of their two states. Without states on the map this is the plain rule.
function ecoEarn(i, j, cat, pi, pj, v, t, bulk, phase, w) {
  const ci = ECOX.C[i], cj = ECOX.C[j]; let cost = t * bulk * EKAPPA * ECOX.km, gain = pj - pi;
  if (phase >= 0 && w && w.org) {                     // inside an organisation's own network the states' rules do not reach: its fee, and the money changer
    if (phase === 0) return 0;
    cost += TU('orgFee') * pj * v; if (ci.sto && cj.sto && ecoCoin(ci.sto) !== ecoCoin(cj.sto)) cost += TU('fxFee') * pj * v;
  } else if (phase >= 0) {
    const si = ci.sto, sj = cj.sto, same = !!si && si === sj, black = !same && ((!!si && si.sys === 'anar') || (!!sj && sj.sys === 'anar')), rl = si && sj && !same && !black ? si.rel[sj.id] || sj.rel[si.id] : null;
    if (rl === 'rival') { if (!(phase === 2 && w && w.broker >= 0)) return 0; cost += TU('cut') * pj * v; }   // rivals do not trade, unless a market at odds with neither sells it on, for its cut
    if (phase === 0) { if (!(same && si.sys === 'feud' && ECOX.seat[i] === j)) return 0; }                    // the lord's due comes first
    else if (phase === 1) { if (!(same || (rl === 'ally' && ((ci.ki === 4 && ci.near.has(sj.id)) || (cj.ki === 4 && cj.near.has(si.id)))))) return 0; }   // then the realm, and a border village's allied neighbours
    const ti = !!si && si.sys === 'trad', tj = !!sj && sj.sys === 'trad';
    if (ti && tj) { if (t * ECOX.km > TU('tradFar')) return 0; } else if (ti || tj) cost *= TU('tradOut');                              // nobody of theirs carries it far: an outsider must come
    if (ecoCap(si) && ecoCap(sj)) cost *= TU('capLeg');
    if (w && w.hub >= 0) cost += TU('hubCut') * pj * v;                                                  // the market on the way keeps its fee
    if (!same) {
      if (si && sj && (ecoCap(si) || si.sys === 'merc')) gain = pj * ecoFx(sj) / ecoFx(si) - pi;   // a seller who sells to the best bidder sees the harder coin as the better price
      if (si && sj && ecoCoin(si) !== ecoCoin(sj)) cost += TU('fxFee') * pj * v;                         // two coins: the money changer is paid, under every system
      if (!black && sj && sj.sys === 'merc' && ECAT[cat].made) cost += TU('wall') * v;                             // a wall against foreign wares
      if (!black && si && si.sys === 'merc' && MERCKEEP.has(cat)) cost += TU('keep') * v;                          // and raw stuff kept at home
    }
  }
  if (phase >= 0 && !(w && w.org) && ci.sto !== cj.sto && SOC_BASIC.has(cat)) { const hp = TU('homePref'); if (hp > 0) cost += hp * (1 - (cj.rich0 == null ? 0.5 : cj.rich0)) * pj * v; }   // the not-so-rich buy their staples at home unless the foreign is clearly cheaper (v0.14.0)
  if ((POL || FXS) && phase >= 0 && !(w && w.org)) { polEarn(ci, cj, cat, pi, pj, v, gain, cost); gain = POLG; cost = POLC; }   // what a state does about its balance: a wall, a bounty, a cheaper coin
  let m = gain * v - cost;
  if (m > 0 && ECOX.bargain) m *= 1 + TU('big') * Math.log2(Math.max(0.25, cj.pop) / 4);                    // a great market is served before a small one
  return m;
}

// ---- the document ----
const ecoNum = (x, a, b, d) => Number.isFinite(+x) && +x >= a && +x <= b ? +x : d, ecoStr = (x, n) => typeof x === 'string' ? x.slice(0, n) : '';
function ecoCleanTerms(a) {
  if (!Array.isArray(a)) return null; const out = [];
  for (const t of a.slice(0, 8)) { if (!t || typeof t.on !== 'string' || !t.on) continue; const on = t.on[0] === '@' ? (D.pointKinds[t.on.slice(1)] ? t.on : '') : [...new Set(t.on)].filter(ch => CODES.includes(ch)).join(''); if (!on) continue;
    const o = { on, rate: ecoNum(t.rate, 0, 20, 0.02) }; for (const k of ['f', 'r', 'l', 'o']) if (t[k]) o[k] = 1; for (const k of ['m', 'c']) { const n = ecoNum(t[k], 1, 8, 0); if (n) o[k] = Math.round(n); } out.push(o); }
  return out;
}
function ecoLoad(b) {
  b = b && typeof b === 'object' ? b : {};
  ECO.goods = {}; for (const [id, o] of Object.entries(b.goods || {}).slice(0, 400)) { if (!o || typeof o !== 'object') continue; const g = {}; if (o.name) g.name = ecoStr(o.name, 60); if (o.cat) g.cat = ecoStr(o.cat, 20); if (o.pct != null) g.pct = ecoNum(o.pct, 0, 5, 1); if (o.off) g.off = 1; if (o.far != null) g.far = o.far ? 1 : 0; const tm = ecoCleanTerms(o.terms); if (tm) g.terms = tm; ECO.goods[ecoStr(id, 40)] = g; }
  ECO.custom = []; for (const o of (Array.isArray(b.custom) ? b.custom : []).slice(0, 120)) { if (!o || typeof o.id !== 'string') continue; ECO.custom.push({ id: ecoStr(o.id, 40), name: ecoStr(o.name, 60) || 'สินค้าใหม่', cat: ecoStr(o.cat, 20), pct: ecoNum(o.pct, 0, 5, 1), off: o.off ? 1 : 0, far: o.far ? 1 : 0, terms: ecoCleanTerms(o.terms) || [] }); }
  ECO.cats = {}; for (const c of ECATS) { if (!ECAT0[c]) continue; const o = (b.cats || {})[c]; if (o && typeof o === 'object') { const z = {}; if (o.name) z.name = ecoStr(o.name, 60); if (o.v > 0) z.v = ecoNum(o.v, 0.05, 200, ECAT0[c].v); if (o.bulk > 0) z.bulk = ecoNum(o.bulk, 0.01, 10, ECAT0[c].bulk); ECO.cats[c] = z; } }
  ECO.ucats = []; for (const u of (Array.isArray(b.ucats) ? b.ucats : []).slice(0, 24)) { if (!u || typeof u.id !== 'string' || !/^u[a-z0-9]{2,30}$/.test(u.id) || ECAT0[u.id] || ECO.ucats.some(x => x.id === u.id)) continue; ECO.ucats.push({ id: u.id, name: ecoStr(u.name, 60) || 'ประเภทใหม่', col: HEXC.test(u.col) ? u.col : '#b0b0b0', v: ecoNum(u.v, 0.05, 200, 3), bulk: ecoNum(u.bulk, 0.01, 10, 0.5), need: ecoNum(u.need, 0, 5, 0.05) }); }
  ECO.auto = b.auto == null ? BLANK : !!b.auto;
  ECO.tune = {}; for (const [k, v] of Object.entries(b.tune || {})) if (ETUNE[k] && Number.isFinite(+v)) { const z = ETUNE[k], x = clamp(+v, z[1], z[2]); if (x !== z[0]) ECO.tune[k] = x; }
  ECO.work = {}; for (const m of EMADEC) { const o = (b.work || {})[m]; if (!o || typeof o !== 'object') continue; const w = {}; if (o.base > 0) w.base = ecoNum(o.base, 0.001, 5, EWORK0[m].base); if (o.in && typeof o.in === 'object') { w.in = {}; for (const [c, q] of Object.entries(o.in).slice(0, 8)) if (typeof c === 'string' && c.length <= 40 && q > 0) w.in[c] = ecoNum(q, 0.001, 20, 0.1); } if (w.base || w.in) ECO.work[m] = w; }
  ECO.pop = {}; for (const [id, n] of Object.entries(b.pop || {}).slice(0, 2000)) if (+n > 0 && Number.isFinite(+n)) ECO.pop[ecoStr(id, 40)] = Math.round(clamp(+n, 1, 5e7));   // a count past the form's ceiling is held to it (v0.14.2)
  ECO.danger = {}; for (const [id, n] of Object.entries(b.danger || {}).slice(0, 4000)) if (n > 0) ECO.danger[ecoStr(id, 120)] = Math.round(ecoNum(n, 0, 4, 0));
  ECO.states = []; for (const s of (Array.isArray(b.states) ? b.states : []).slice(0, 52)) { if (!s || typeof s.id !== 'string' || !SKEYS.includes(s.id) || s.id.length !== 1 || ECO.states.some(x => x.id === s.id)) continue; const rel = {}; for (const [k, r] of Object.entries(s.rel || {})) if (SKEYS.includes(k) && (r === 'ally' || r === 'rival')) rel[k] = r; ECO.states.push({ id: s.id, name: ecoStr(s.name, 60) || 'รัฐใหม่', color: HEXC.test(s.color) ? s.color : SCOLS[0], sys: ESYS[s.sys] ? s.sys : 'merc', cur: ecoStr(s.cur, 30), rate: ecoNum(s.rate, 0.01, 1000, 1), cap: ecoStr(s.cap, 60), slave: ESLAVE[s.slave] ? s.slave : 'abol', rel }); }
  const cells = typeof b.cells === 'string' && b.cells.length === N ? b.cells : ''; for (let i = 0; i < N; i++) ECO.cells[i] = cells && SKEYS.includes(cells[i]) ? cells[i] : '.';
  ECO.orgs = []; for (const o of (Array.isArray(b.orgs) ? b.orgs : []).slice(0, 60)) { if (!o || typeof o.id !== 'string' || !/^o[a-z0-9]{2,30}$/.test(o.id) || ECO.orgs.some(x => x.id === o.id)) continue; ECO.orgs.push({ id: o.id, name: ecoStr(o.name, 60) || 'องค์กรใหม่', kind: OKIND[o.kind] ? o.kind : 'other', color: HEXC.test(o.color) ? o.color : '#d9a24a', cat: typeof o.cat === 'string' && o.cat.length <= 40 ? o.cat : '', prod: ecoNum(o.prod, 0, 2, 0), val: ecoNum(o.val, 0, 2, 0), well: ecoNum(o.well, 0, 1, 0), haul: ecoNum(o.haul, 0, 0.9, 0), net: o.net ? 1 : 0, base: ecoNum(o.base, 0, 1e12, 0), seats: [...new Set((Array.isArray(o.seats) ? o.seats : []).filter(x => typeof x === 'string' && x.length <= 60))].slice(0, 400) }); }
  // The two scales. A map saved before v0.9.0 that still had the old starting numbers (5,000 people a head, 1,000 coins a unit of
  // value) takes the new ones; where the owner had counted the people of some city, the head stays at 5,000 so those counts mean
  // what they meant, and only the coin changes. Numbers the owner had set are kept as they are. The year's trade is the same either way.
  const u0 = ecoNum(b.unit, 0.01, 1e9, 0), p0 = ecoNum(b.central && b.central.per, 0.001, 1e9, 0), old = !(b.v >= 2) && u0 === 5000 && p0 === 1000;
  ECO.unit = u0 && !old ? u0 : old && Object.keys(ECO.pop).length ? 5000 : EUNIT;
  ECO.central = { name: ecoStr(b.central && b.central.name, 30) || 'เหรียญกลาง', per: p0 && !old ? p0 : ECO.unit * ECOIN };
  ECO.noSlave = b.noSlave ? 1 : 0;
  { const t = b.tier, o = typeof t === 'string' && Object.prototype.hasOwnProperty.call(ETIER_OLD, t) ? ETIER_OLD[t] : 0;
    ECO.tier = tierOk(t) ? t : typeof o === 'string' ? o : o > 0 || (t === 'own' && b.total > 0) ? 'own' : '';
    ECO.total = tierOk(ECO.tier) ? ETIER[ECO.tier][1] : ECO.tier === 'own' ? ecoNum(o > 0 ? o : b.total, 100, 1e12, 0) : 0; if (ECO.tier === 'own' && !(ECO.total > 0)) ECO.tier = ''; }
  ECO.cpp = clamp(ECO.central.per / ECO.unit, 1e-6, 1e9);
  ecoStamp++; ecoApply();
}
let ecoSerial = () => ({ v: 2, noSlave: ECO.noSlave, tier: ECO.tier, total: ECO.tier === 'own' ? ECO.total : 0, orgs: ECO.orgs, goods: ECO.goods, custom: ECO.custom, cats: ECO.cats, ucats: ECO.ucats, tune: ECO.tune, work: ECO.work, pop: ECO.pop, danger: ECO.danger, auto: ECO.auto, states: ECO.states, cells: ECO.cells.join(''), unit: ECO.unit, central: ECO.central });
async function ecoSaveNow() { if (!ENV.db || !ecoLoaded || !ecoDirty || ecoSaving) return; ecoSaving = true; ecoDirty = false; try { await ENV.db.doc('map/economy').set(ecoSerial()); } catch (err) { ecoDirty = true; } ecoSaving = false; if (ecoDirty) ecoSaveNow(); }
async function ecoFlush() { clearTimeout(ecoT); await ecoSaveNow(); }
function ecoChanged(tables) {                      // the owner changed something: the tables, the year, the card, the save
  if (tables) ecoApply();
  ecoStamp++; ecoDirty = true; clearTimeout(ecoT); ecoT = setTimeout(ecoSaveNow, ENV.saveDelay || 500);
  scheduleEcon(120); requestDraw();
}
const SIDE = {};   // one step back and forward for the documents the engine added: filled in further down
if (ENV.db) ENV.db.doc('map/economy').onSnapshot(s => {
  if (ecoLoaded && (ecoDirty || ecoSaving)) return false;                 // unsaved work here: the store offers the merged document again
  const had = ecoLoaded; ecoLoaded = true; ecoLoad(s && s.exists ? s.data() : null);
  scheduleEcon(had ? 120 : 400); if (had) { ecoRender(); requestDraw(); }
  if (SIDE.eco) sideSeen('eco');
  return true;
}); else ecoLoaded = true;

// ---- borders on the map ----
let ecoPaths = null, ecoPathStamp = 0;
function ecoBuildPaths() {
  ecoPaths = new Map();
  for (const s of ECO.states) ecoPaths.set(s.id, { fill: new Path2D(), edge: new Path2D(), n: 0 });
  for (let i = 0; i < N; i++) {
    const z = ECO.cells[i], P = ecoPaths.get(z); if (!P) continue; P.n++;
    P.fill.moveTo(CX[i] + R, CY[i]); for (let a = 1; a < 6; a++) P.fill.lineTo(CX[i] + R * COS[a], CY[i] + R * SIN[a]); P.fill.closePath();
    for (let k = 0; k < 6; k++) { const v = NB[i * 6 + k]; if (v >= 0 && ECO.cells[v] === z) continue; const a = EDGE[k], b = (a + 1) % 6; P.edge.moveTo(CX[i] + R * 0.94 * COS[a], CY[i] + R * 0.94 * SIN[a]); P.edge.lineTo(CX[i] + R * 0.94 * COS[b], CY[i] + R * 0.94 * SIN[b]); }
  }
  ecoPathStamp = ecoStamp;
}
function drawBorders() {
  if (!ECO.states.length) { orgDraw(1 / view.s); return; }
  if (!ecoPaths || ecoPathStamp !== ecoStamp) ecoBuildPaths();
  ctx.setTransform(dpr * view.s, 0, 0, dpr * view.s, dpr * view.x, dpr * view.y);
  const px = 1 / view.s;
  for (const s of ECO.states) {
    const P = ecoPaths.get(s.id); if (!P || !P.n) continue;
    if (mode === 'econ' || (mode === 'trade' && tstate === s.id)) { ctx.globalAlpha = 0.2; ctx.fillStyle = s.color; ctx.fill(P.fill); ctx.globalAlpha = 1; }
    ctx.lineCap = 'round'; ctx.lineWidth = Math.max(2.2, 4.2 * px); ctx.strokeStyle = 'rgba(15,17,20,.55)'; ctx.stroke(P.edge);
    if (s.sys === 'anar') ctx.setLineDash([5 * Math.max(1, px), 5 * Math.max(1, px)]);   // a land without a state: a broken line
    ctx.lineWidth = Math.max(1.1, 2.2 * px); ctx.strokeStyle = s.color; ctx.stroke(P.edge); ctx.setLineDash([]);
  }
  orgDraw(px);
}
drawUnderNames = drawBorders;                       // the borders go under the names of places and cities (the owner's ruling, v0.9.0)

// painting a state's land and waters
let ecoTab = 'goods', ecoSel = null, ecoPaint = null, ecoBrushN = 2, ecoPainting = false, ecoPainted = false;
function ecoPaintAt(e) {
  const [mx, my] = toMap(e.clientX, e.clientY), h = hexAt(mx, my); if (h < 0) return;
  for (const i of brush(h, ecoBrushN)) if (ECO.cells[i] !== ecoPaint) { ECO.cells[i] = ecoPaint; ecoPainted = true; }
  if (ecoPainted) { ecoStamp++; requestDraw(); }
}
box.addEventListener('pointerdown', e => {
  if (mode !== 'econ' || ecoTab !== 'states' || ecoPaint == null || !editable || e.button !== 0 || spaceDown || e.target !== cv) return;
  e.stopPropagation(); e.preventDefault(); ecoPainting = true; ecoPainted = false; ecoPaintAt(e);
}, true);
__on(window, 'pointermove', e => { if (ecoPainting) ecoPaintAt(e); });
__on(window, 'pointerup', () => { if (!ecoPainting) return; ecoPainting = false; if (ecoPainted) { ecoChanged(false); ecoRender(); } });

// ---- the card ----
const ecoIn = (label, html) => `<label class="ef"><span>${label}</span>${html}</label>`;
const ecoGood = id => EGOODS.find(g => g.id === id) || null;
const ecoOver = id => ECO.goods[id] || (ECO.goods[id] = {});
function ecoTermHTML(t, k) {
  const pt = t.on[0] === '@';
  let h = `<div class="eterm" data-k="${k}"><div class="erow"><select data-f="src"><option value="g"${pt ? '' : ' selected'}>ภูมิประเทศ</option>${Object.keys(D.pointKinds).map(q => `<option value="@${q}"${t.on === '@' + q ? ' selected' : ''}>จุดสำคัญ: ${esc(kindInfo(q).name)}</option>`).join('')}</select>`
    + `<label>ได้ <input type="number" data-f="rate" min="0" max="20" step="0.005" value="${t.rate}"> ${pt ? 'ต่อจุด' : 'ต่อช่อง'}</label><button type="button" class="btn warn" data-a="tdel">ลบเงื่อนไข</button></div>`;
  if (!pt) {
    h += `<div class="echips">${[...CODES].map(b => `<button type="button" class="echip${t.on.includes(b) ? ' on' : ''}" data-a="code" data-b="${b}" title="${esc(biomeInfo(b).name)}"><i style="background:${chipColor(b)}"></i>${esc(biomeInfo(b).name)}</button>`).join('')}</div>`
      + `<div class="erow"><label><input type="checkbox" data-f="r"${t.r ? ' checked' : ''}> มีแม่น้ำในช่อง</label><label><input type="checkbox" data-f="l"${t.l ? ' checked' : ''}> ติดทะเลสาบ</label><label><input type="checkbox" data-f="o"${t.o ? ' checked' : ''}> ป่าที่ติดที่โล่ง</label><label><input type="checkbox" data-f="f"${t.f ? ' checked' : ''}> ขึ้นกับน้ำฝน</label>`
      + `<label>ใกล้ภูเขาในระยะ <input type="number" data-f="m" min="0" max="8" step="1" value="${t.m || 0}"> ช่อง</label><label>ใกล้ทะเลในระยะ <input type="number" data-f="c" min="0" max="8" step="1" value="${t.c || 0}"> ช่อง</label></div>`;
  }
  return h + '</div>';
}
function ecoGoodsHTML() {
  let h = `<div class="btns" style="margin:0 0 8px"><button type="button" class="btn" data-a="gnew">เพิ่มสินค้าใหม่</button></div>`;
  const g = ecoSel && ecoGood(ecoSel);
  if (g) {
    const yields = ECON ? ECON.prod.reduce((a, m) => a + (m.get(g.id) || 0), 0) : 0;
    h += `<div class="eform"><h3>${esc(g.name)}</h3>`
      + ecoIn('ชื่อ', `<input type="text" data-f="name" maxlength="60" value="${esc(g.name)}">`)
      + ecoIn('ประเภท (กำหนดระดับราคา)', `<select data-f="cat">${ERAW.map(c => `<option value="${c}"${c === g.cat ? ' selected' : ''}>${esc(ECAT[c].name)} · ราคาฐาน ${ECAT[c].v}</option>`).join('')}</select>`)
      + ecoIn(`ความอุดมสมบูรณ์ <b id="ecoPctV">${Math.round(g.pct * 100)}%</b>`, `<input type="range" data-f="pct" min="0" max="300" step="5" value="${Math.round(g.pct * 100)}">`)
      + `<div class="erow"><label><input type="checkbox" data-f="off"${g.off ? ' checked' : ''}> ไม่มีสินค้านี้ในแผนที่</label>${g.terms ? `<label><input type="checkbox" data-f="far"${g.far ? ' checked' : ''}> ส่งคนออกไปทำไกลเมืองได้ (เหมือง)</label>` : ''}</div>`
      + `<div class="tr w">ปีนี้ทั้งแผนที่ผลิตได้ ${fmtL(yields)} หน่วย</div>`;
    if (g.terms) h += `<h4>เกิดที่ไหน ได้เท่าไร</h4>` + g.terms.map(ecoTermHTML).join('') + `<div class="btns"><button type="button" class="btn" data-a="tadd">เพิ่มเงื่อนไข</button></div>`;
    else h += `<p class="note">สินค้านี้เกิดตามสูตรของลอร์เกรสแลนด์ ปรับได้ที่ชื่อ ประเภท และความอุดมสมบูรณ์</p>`;
    h += `<div class="btns">${g.custom ? '<button type="button" class="btn warn" data-a="gdel">ลบสินค้านี้</button>' : g.edited ? '<button type="button" class="btn" data-a="greset">คืนค่าตั้งต้นของสินค้านี้</button>' : ''}<button type="button" class="btn" data-a="gclose">ปิด</button></div></div>`;
  }
  for (const c of ERAW) {
    const list = EGOODS.filter(x => x.cat === c); if (!list.length) continue;
    h += `<div class="ecat"><i style="background:${ECAT[c].col}"></i>${esc(ECAT[c].name)}</div><div class="elist">` + list.map(x => `<button type="button" class="egood${x.id === ecoSel ? ' on' : ''}${x.off ? ' off' : ''}" data-a="gsel" data-g="${esc(x.id)}">${esc(x.name)}<span>${x.off ? 'ปิด' : Math.round(x.pct * 100) + '%'}</span></button>`).join('') + `</div>`;
  }
  return h;
}
function ecoCatsHTML() {
  return `<p class="note" style="margin-top:0">ราคาฐานคือราคาของหนึ่งหน่วยเมื่อของพอดีกับที่ต้องการ เมืองที่ขาดจ่ายได้ถึง 1.75 เท่า เมืองที่ล้นขายเหลือ 0.25 เท่า ความเทอะทะคือค่าขนต่อระยะทาง</p><div class="etable"><div class="eth"><span>ประเภท</span><span>ราคาฐาน</span><span>เทอะทะ</span></div>`
    + ECATS.filter(c => !ECAT[c].own && !ECAT[c].people).map(c => `<div class="etr" data-c="${c}"><span><i style="background:${ECAT[c].col}"></i><input type="text" data-f="cname" maxlength="60" value="${esc(ECAT[c].name)}"></span><input type="number" data-f="cv" min="0.05" max="200" step="0.1" value="${ECAT[c].v}"><input type="number" data-f="cbulk" min="0.01" max="10" step="0.05" value="${ECAT[c].bulk}"></div>`).join('')
    + `</div><div class="btns"><button type="button" class="btn" data-a="creset">คืนค่าตั้งต้นทุกประเภท</button></div>`
    + `<h4>ประเภทที่เพิ่มเอง</h4>` + (ECO.ucats.length ? '' : `<p class="note">ยังไม่มี เพิ่มประเภทแล้วย้ายสินค้าเข้ามาได้จากแท็บสินค้า</p>`)
    + ECO.ucats.map(u => `<div class="eform" data-u="${u.id}"><div class="erow"><input type="color" data-f="ucol" value="${u.col}" aria-label="สีของประเภท"><input type="text" data-f="uname" maxlength="60" value="${esc(u.name)}" style="flex:1"></div>`
      + `<div class="erow"><label>ราคาฐาน <input type="number" data-f="uv" min="0.05" max="200" step="0.1" value="${u.v}"></label><label>เทอะทะ <input type="number" data-f="ubulk" min="0.01" max="10" step="0.05" value="${u.bulk}"></label><label>ต้องการต่อหัว <input type="number" data-f="uneed" min="0" max="5" step="0.01" value="${u.need}"></label></div>`
      + `<div class="tr w">มีสินค้า ${EGOODS.filter(g => g.cat === u.id).length} ชนิด ความต้องการต่อหัวเทียบกับธัญพืชซึ่งเท่ากับ 1 ถ้าใส่ 0 จะไม่มีเมืองใดซื้อ</div><div class="btns"><button type="button" class="btn" data-a="udel">ลบประเภทนี้</button></div></div>`).join('')
    + `<div class="btns"><button type="button" class="btn" data-a="unew"${ECO.ucats.length >= 24 ? ' disabled' : ''}>เพิ่มประเภท</button></div>`;
}
// the workshops' recipes: what a head turns out at full supply, and what one load takes
function ecoWorkHTML() {
  let h = `<h4 id="ecoWorkHead">สูตรของโรงงาน</h4><p class="note" style="margin-top:0">โรงงานในเมืองเปลี่ยนวัตถุดิบเป็นสินค้าโรงงาน หนึ่งหน่วยที่ผลิตใช้วัตถุดิบตามสูตร วัตถุดิบเลือกได้จากทุกประเภทที่ไม่ใช่สินค้าโรงงาน รวมประเภทที่เพิ่มเอง เมืองที่วัตถุดิบไม่ครบผลิตได้ตามส่วนที่หาได้</p>`;
  for (const m of EMADEC) {
    const w = EWORK[m], ins = Object.entries(w.in), free = ERAW.filter(c => !(c in w.in));
    h += `<div class="eform" data-w="${m}"><div class="erow"><b><i class="sdot" style="background:${ECAT[m].col}"></i>${esc(ECAT[m].name)}</b><label>ผลิตต่อหัวเมื่อของครบ <input type="number" data-f="wbase" min="0.001" max="5" step="0.005" value="${w.base}"></label></div>`
      + ins.map(([c, q]) => `<div class="erow" data-i="${c}"><span style="flex:1"><i class="sdot" style="background:${ECAT[c].col}"></i>${esc(ECAT[c].name)}</span><label>ใช้ <input type="number" data-f="win" min="0.001" max="20" step="0.05" value="${q}"> ต่อหน่วย</label>${ins.length > 1 ? '<button type="button" class="btn warn" data-a="wdel">เอาออก</button>' : ''}</div>`).join('')
      + `<div class="btns">${free.length && ins.length < 8 ? `<select data-f="wadd"><option value="">เพิ่มวัตถุดิบ</option>${free.map(c => `<option value="${c}">${esc(ECAT[c].name)}</option>`).join('')}</select>` : ''}${ECO.work[m] ? '<button type="button" class="btn" data-a="wreset">คืนสูตรตั้งต้น</button>' : ''}</div></div>`;
  }
  return h;
}
// every number the model runs on, for the owner to rule on
function ecoTuneHTML() {
  let h = '', grp = '';
  for (const [k, z] of Object.entries(ETUNE)) {
    if (z[5] !== grp) { if (grp) h += '</div>'; grp = z[5]; h += `<h4>${grp}</h4><div class="etune">`; }
    const v = TU(k), ch = ECO.tune[k] != null;
    h += `<label class="etu${ch ? ' ch' : ''}"><span>${z[4]}</span><input type="number" data-f="tune" data-k="${k}" min="${z[1]}" max="${z[2]}" step="${z[3]}" value="${v}"><em>${ch ? 'ตั้งต้น ' + z[0] : ''}</em></label>`;
  }
  return h + `</div><div class="btns"><button type="button" class="btn" data-a="treset"${Object.keys(ECO.tune).length ? '' : ' disabled'}>คืนค่าตั้งต้นทุกตัว</button></div>`
    + `<p class="note">ตัวเลขที่ไม่อยู่ในหน้านี้อยู่ที่แท็บอื่น: ราคาฐานและความเทอะทะอยู่ที่หมวดและราคา ความต้องการต่อหัวของประเภทที่เพิ่มเองอยู่ที่เดียวกัน อัตราแลกเงินอยู่ที่รัฐ ค่าที่ยังแก้จากหน้าจอไม่ได้คือความต้องการต่อหัวของประเภทตั้งต้นและผลผลิตต่อช่องของสินค้าตามลอร์เกรสแลนด์</p>`;
}
function ecoCapHTML(s) {                            // the city a socialist state gathers and hands out through
  const cs = ECON ? ECON.cities.filter(c => c.st === s.id) : [], k = ECOX.cap.get(ECOX.byKey.get(s.id)), now = k != null && ECOX.C[k] ? ECOX.C[k].name : '';
  if (!cs.length) return `<div class="tr w">ยังไม่มีเมืองในเขตของรัฐนี้</div>`;
  return ecoIn('เมืองศูนย์กลางของรัฐ', `<select data-f="scap"><option value="">ให้ระบบเลือก${now && !cs.some(c => c.id === s.cap) ? ' (ตอนนี้ ' + esc(now) + ')' : ''}</option>${cs.map(c => `<option value="${esc(c.id)}"${c.id === s.cap ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}</select>`);
}
function ecoStatesHTML() {
  let h = `<div class="btns" style="margin:0 0 8px"><button type="button" class="btn" data-a="snew"${ECO.states.length >= 52 ? ' disabled' : ''}>เพิ่มรัฐ</button>${ECO.states.length > 1 ? `<button type="button" class="btn" data-a="stfold" data-v="0">พับทุกรัฐ</button><button type="button" class="btn" data-a="stfold" data-v="1">กางทุกรัฐ</button>` : ''}</div>`;
  if (!ECO.states.length) return h + `<p class="note">ยังไม่มีรัฐ เพิ่มรัฐแล้วเลือกชื่อรัฐในแถบเครื่องมือเพื่อระบายเขตลงบนแผนที่ ระบายลงทะเลได้เพื่อกำหนดน่านน้ำ เมืองขึ้นกับรัฐของช่องที่ตั้งอยู่</p>`;
  const cnt = {}; for (const z of ECO.cells) if (z !== '.') cnt[z] = (cnt[z] || 0) + 1;
  for (const s of ECO.states) {
    const others = s.sys === 'anar' ? [] : ECO.states.filter(o => o !== s && o.sys !== 'anar');
    h += `<details class="efold stfold" data-fold="st${s.id}"${GDPV['st' + s.id] === 0 ? '' : ' open'}><summary><i class="sdot" style="background:${s.color}"></i>${esc(s.name)} <small>${ESYS[s.sys][0]} · ${cnt[s.id] || 0} ช่อง</small></summary><div class="eform" data-s="${s.id}"><div class="erow"><input type="color" data-f="scolor" value="${s.color}" aria-label="สีของรัฐ"><input type="text" data-f="sname" maxlength="60" value="${esc(s.name)}" style="flex:1"></div>`
      + ecoIn('ระบอบเศรษฐกิจ', `<select data-f="ssys">${Object.entries(ESYS).map(([k, v]) => `<option value="${k}"${k === s.sys ? ' selected' : ''}>${v[0]}</option>`).join('')}</select>`) + `<div class="tr w">${ESYS[s.sys][1]}</div>`
      + (s.sys === 'anar' ? `<div class="tr w">แรงงานทาส: ดินแดนที่ไม่มีรัฐค้าทาสเสรีเสมอ</div>` : ecoIn('แรงงานทาส', `<select data-f="sslave">${Object.entries(ESLAVE).map(([k, v]) => `<option value="${k}"${k === (s.slave || 'abol') ? ' selected' : ''}>${v[0]}</option>`).join('')}</select>`) + `<div class="tr w">${ESLAVE[s.slave || 'abol'][1]}</div>`)
      + (s.sys === 'soc' ? ecoCapHTML(s) : '') + socStateForm(s)
      + `<div class="erow"><label>สกุลเงิน <input type="text" data-f="scur" maxlength="30" value="${esc(s.cur)}" placeholder="${esc(ECO.central.name)}" style="width:8em"></label><label>1 หน่วย = <input type="number" data-f="srate" min="0.01" max="1000" step="0.05" value="${s.rate}"> ${esc(ECO.central.name)}</label></div>`
      + (others.length ? `<div class="erow">${others.map(o => `<label><i class="sdot" style="background:${o.color}"></i>${esc(o.name)} <select data-f="srel" data-o="${o.id}"><option value="">เป็นกลาง</option><option value="ally"${(s.rel[o.id] || o.rel[s.id]) === 'ally' ? ' selected' : ''}>พันธมิตร</option><option value="rival"${(s.rel[o.id] || o.rel[s.id]) === 'rival' ? ' selected' : ''}>คู่อริ</option></select></label>`).join('')}</div>` : '')
      + `<div class="tr w">${cnt[s.id] || 0} ช่อง</div><div class="btns"><button type="button" class="btn warn" data-a="sdel">ลบรัฐนี้</button></div></div></details>`;
  }
  return h;
}
function ecoGdp() {
  const E = ECON; if (!E) return [];
  return E.cities.map((c, k) => {
    let g = 0; for (const cat of ECATS) { const mk = E.MK[k][cat]; if (mk) g += mk[0] * (E.P1[k][cat] || 1) * ECAT[cat].v * (1 + orgVal(c, cat)); }
    for (const m in E.plan[k] || {}) { const out = E.prod[k].get(madeId(m, c.zone)) || 0; for (const [cat, q] of Object.entries(EWORK[m].in)) g -= out * q * (E.P1[k][cat] || 1) * ECAT[cat].v; }   // what the workshops used up is not counted twice
    return { c, gdp: Math.max(0, g) * ECO.central.per, people: Math.max(1, Math.round(c.pop * ECO.unit)), s: ECOX.byKey.get(c.st) || null, short: Object.keys(c.short || {}).length };
  });
}
// who ends up with the year's money. The trade itself stays as worked out: this is the hand of each system on what it earned.
// A capitalist city keeps a middleman's share of the value that passes through it; a feudal community pays its lord's seat a
// tenth; a socialist state pools half of every city's product and shares it out by head. The three shares are my own numbers.
function ecoIncome(rows) {
  const E = ECON; for (const r of rows) { r.inc = r.gdp; r.why = ''; }
  rows.forEach((r, k) => {
    const sys = r.s ? r.s.sys : '';
    if ((sys === 'cap' || sys === 'anar') && r.c.through > 0) { const x = TU('cut') * r.c.through * ECO.central.per; r.inc += x; if (x > 0.005 * r.gdp) r.why = 'ได้ส่วนคนกลาง'; }
    const seat = sys === 'feud' && ECOX.seat && k < ECOX.seat.length ? ECOX.seat[k] : -1;
    if (seat >= 0 && rows[seat] && rows[seat].s === r.s) { const x = TU('tithe') * r.gdp; r.inc -= x; rows[seat].inc += x; r.why = 'ส่งส่วยให้' + rows[seat].c.name; if (!rows[seat].why) rows[seat].why = 'ได้ส่วย'; }
  });
  for (const r of rows) { const wl = orgWell(r.c); if (wl > 0) { r.inc += wl * r.gdp; r.why = (r.why ? r.why + ' และ' : '') + 'ได้ความช่วยเหลือจากองค์กร'; } }
  const pool = new Map();
  for (const r of rows) if (r.s && r.s.sys === 'soc') { const o = pool.get(r.s) || { sum: 0, people: 0 }; o.sum += TU('pool') * r.gdp; o.people += r.people; pool.set(r.s, o); }
  for (const r of rows) if (r.s && r.s.sys === 'soc') { const o = pool.get(r.s), back = o.sum * r.people / o.people, d = back - TU('pool') * r.gdp; r.inc += d; r.why = d > 0.02 * r.gdp ? 'รัฐเกลี่ยให้' : d < -0.02 * r.gdp ? 'รัฐเกลี่ยออก' : ''; }
  return rows;
}
const ecoPc = x => Math.round(x * 1000) / 10;
const GDPV = (() => { try { return Object.assign({ k: 'inc', d: -1 }, JSON.parse(localStorage.getItem('mme-gdp') || '{}')); } catch (err) { return { k: 'inc', d: -1 }; } })();
const gdpKeep = () => { try { localStorage.setItem('mme-gdp', JSON.stringify(GDPV)); } catch (err) { /* this view keeps nothing */ } };
const ecoNumF = v => { const a = Math.abs(v), big = (d, w) => (v / d).toLocaleString('en-US', { maximumFractionDigits: 1 }) + ' ' + w; return a >= 1e13 ? big(1e12, 'ล้านล้าน') : a >= 1e10 ? big(1e9, 'พันล้าน') : a >= 1e7 ? big(1e6, 'ล้าน') : a >= 100 ? Math.round(v).toLocaleString('en-US') : a >= 1 ? v.toFixed(1) : v.toFixed(2); };
function ecoGdpHTML() {
  const rows = ecoIncome(ecoGdp()); let h = `<div class="erow"><label>เงินกลางชื่อ <input type="text" data-f="cenname" maxlength="30" value="${esc(ECO.central.name)}" style="width:8em"></label><label>หนึ่งหน่วยมูลค่าฐาน = <input type="number" data-f="cenper" min="0.001" step="1" value="${ECO.central.per}"> ${esc(ECO.central.name)}</label><label>ประชากรหนึ่งหน่วยของแบบจำลอง = <input type="number" data-f="unit" min="100" step="100" value="${ECO.unit}"> คน</label></div><p class="note">สองตัวเลขนี้เป็นมาตราของทั้งแผนที่ หมู่บ้านคือ ${Math.round(EPOP[4] * ECO.unit).toLocaleString('en-US')} คน เมืองหลวงคือ ${Math.round(EPOP[0] * ECO.unit).toLocaleString('en-US')} คน จนกว่าจะกรอกประชากรของเมืองเอง ธัญพืชของคนหนึ่งคนตลอดปีมีราคาฐาน ${ecoNumF(ECO.central.per / ECO.unit)} ${esc(ECO.central.name)} สินค้าหนึ่งหน่วยคือปริมาณที่คน ${ECO.unit.toLocaleString('en-US')} คนกินธัญพืชในหนึ่งปี แก้สองตัวเลขนี้แล้วผลการค้าไม่เปลี่ยน เปลี่ยนเฉพาะจำนวนคนกับจำนวนเงินที่แสดง</p>`;
  if (!rows.length) return h + `<p class="note">ยังไม่มีเมืองบนแผนที่ หรือยังคิดการค้าไม่เสร็จ</p>`;
  const tot = rows.reduce((a, r) => a + r.gdp, 0), ppl = rows.reduce((a, r) => a + r.people, 0), mean = rows.reduce((a, r) => a + r.inc, 0) / ppl;
  h += `<div class="tr">ทั้งแผนที่ GDP <b>${ecoNumF(tot)}</b> ${esc(ECO.central.name)} ประชากร ${ppl.toLocaleString('en-US')} คน เฉลี่ยคนละ ${ecoNumF(mean)}</div>`;
  const by = new Map(); for (const r of rows) { const key = r.s ? r.s.id : '.'; const o = by.get(key) || { s: r.s, gdp: 0, people: 0, n: 0 }; o.gdp += r.gdp; o.people += r.people; o.n++; by.set(key, o); }
  const orgT = ECO.orgs.length ? orgTableHTML(rows) : '';   // before the rows are put in the order asked for: it reads them by city
  const SK = { name: ['เมือง', (a, b) => a.c.name.localeCompare(b.c.name, 'th')], people: ['ประชากร', (a, b) => a.people - b.people], gdp: ['GDP', (a, b) => a.gdp - b.gdp], inc: ['รายได้', (a, b) => a.inc - b.inc], pc: ['ต่อหัว', (a, b) => a.inc / a.people - b.inc / b.people] };
  const sk = SK[GDPV.k] ? GDPV.k : 'inc', dir = GDPV.d > 0 ? 1 : -1, arrow = k => k === sk ? (dir > 0 ? ' ▲' : ' ▼') : '';
  const fold = (id, title, body) => `<details class="efold" data-fold="${id}"${GDPV[id] === 0 ? '' : ' open'}><summary>${title}</summary>${body}</details>`;
  if (ECO.states.length) h += fold('gst', `รายรัฐ <small>${by.size} แถว</small>`, `<div class="etable g4"><div class="eth"><span>รัฐ</span><span>GDP (เงินกลาง)</span><span>เงินท้องถิ่น</span><span>ต่อหัว</span></div>` + [...by.values()].sort((a, b) => b.gdp - a.gdp).map(o => `<div class="etr"><span>${o.s ? `<i class="sdot" style="background:${o.s.color}"></i>${esc(o.s.name)} · ${ESYS[o.s.sys][0]}` : 'ไม่ขึ้นกับรัฐใด'}</span><span>${ecoNumF(o.gdp)}</span><span>${o.s ? ecoNumF(o.gdp / o.s.rate) + ' ' + esc(o.s.cur || ECO.central.name) : ''}</span><span>${ecoNumF(o.gdp / o.people)}</span></div>`).join('') + `</div>`);
  h += fold('gct', `รายเมือง <small>${rows.length} แถว</small>`, `<div class="erow"><label>เรียงตาม <select data-f="gsort">${Object.entries(SK).map(([k, v]) => `<option value="${k}"${k === sk ? ' selected' : ''}>${v[0]}</option>`).join('')}</select></label><label><select data-f="gdir"><option value="-1"${dir < 0 ? ' selected' : ''}>มากไปน้อย</option><option value="1"${dir > 0 ? ' selected' : ''}>น้อยไปมาก</option></select></label></div><div class="etable g5"><div class="eth sortable">${Object.entries(SK).map(([k, v]) => `<span data-a="gsortc" data-k="${k}" title="กดเพื่อเรียงตามช่องนี้">${v[0]}${arrow(k)}</span>`).join('')}</div>` + rows.sort((a, b) => dir * SK[sk][1](a, b) || a.c.name.localeCompare(b.c.name, 'th')).map(r => { const ph = r.inc / r.people, w = ph >= 1.4 * mean ? 'มั่งคั่ง' : ph <= 0.6 * mean ? 'ยากจน' : ''; return `<div class="etr"><span>${r.s ? `<i class="sdot" style="background:${r.s.color}"></i>` : ''}${esc(r.c.name)}${r.short ? ` <em>ขาด ${r.short} ประเภท</em>` : ''}</span><span>${r.people.toLocaleString('en-US')}</span><span>${ecoNumF(r.gdp)}</span><span${r.why ? ` title="${esc(r.why)}"` : ''}>${ecoNumF(r.inc)}${r.why ? '*' : ''}</span><span>${ecoNumF(ph)}${w ? ' <em>' + w + '</em>' : ''}</span></div>`; }).join('') + `</div>`);
  if (ECO.orgs.length) h += fold('gor', `องค์กร <small>${ECO.orgs.length} แถว</small>`, orgT);
  return h + `<p class="note">GDP ของเมืองคือมูลค่าของทุกอย่างที่เมืองผลิตได้ในหนึ่งปีตามราคาในเมืองหลังการค้า หักวัตถุดิบที่โรงงานใช้ไป เงินท้องถิ่นแปลงด้วยอัตราของแต่ละรัฐ รายได้คือ GDP หลังมือของระบอบ เมืองทุนนิยมได้ส่วนคนกลางร้อยละ ${ecoPc(TU('cut'))} ของมูลค่าที่ผ่านเมือง ชุมชนศักดินาส่งส่วยร้อยละ ${ecoPc(TU('tithe'))} ให้ศูนย์ที่ตนขึ้นอยู่ รัฐสังคมนิยมรวมร้อยละ ${ecoPc(TU('pool'))} ของทุกเมืองแล้วแบ่งตามหัว สัดส่วนทั้งสามแก้ได้ที่แท็บตัวเลข ช่องที่มีดอกจันชี้ค้างไว้เพื่อดูเหตุ ความมั่งคั่งวัดจากรายได้ต่อหัว</p>`;
}
function ecoRender() {
  const card = $('ecocard'); card.hidden = mode !== 'econ'; if (card.hidden) return;
  setpickSync(); segPick('ecoTab', 't', ecoTab, t => { ecoTab = t; ecoRender(); requestDraw(); if (window.MME && MME.shell && MME.shell.reveal) MME.shell.reveal('ecocard'); });   // a tab's settings are in the side panel: picking it brings the panel back (v0.15.1)
  $('ecoHead').textContent = { goods: 'สินค้าของแผนที่', cats: 'ประเภทสินค้า ระดับราคา และสูตรโรงงาน', states: 'รัฐและเขตแดน', gdp: 'GDP และค่าเงิน', tune: 'ตัวเลขของแบบจำลอง' }[ecoTab];
  $('ecoPaintRow').hidden = ecoTab !== 'states' || !ECO.states.length || !editable;
  if (!$('ecoPaintRow').hidden) {
    if (ecoPaint != null && ecoPaint !== '.' && !ECO.states.some(s => s.id === ecoPaint)) ecoPaint = null;
    $('ecoPaintSeg').innerHTML = `<button type="button" data-p="">ไม่ระบาย</button>` + ECO.states.map(s => `<button type="button" data-p="${s.id}"><i class="sdot" style="background:${s.color}"></i>${esc(s.name)}</button>`).join('') + `<button type="button" data-p=".">ลบเขต</button>`;
    segPick('ecoPaintSeg', 'p', ecoPaint == null ? '' : ecoPaint, p => { ecoPaint = p === '' ? null : p; ecoRender(); });
    segPick('ecoBrush', 'n', ecoBrushN, n => { ecoBrushN = +n; ecoRender(); });
  }
  box.classList.toggle('ecopaint', !$('ecoPaintRow').hidden && ecoPaint != null);
  $('ecoHint').textContent = { goods: 'เลือกสินค้าเพื่อแก้ชื่อ ประเภท ความอุดมสมบูรณ์ และเงื่อนไขของช่องที่สินค้าเกิด ผลการค้าคิดใหม่ทุกครั้งที่แก้', cats: 'ประเภทคือระดับราคา สินค้าในประเภทเดียวกันมีราคาฐานเท่ากัน', states: 'รัฐเดียวกันแบ่งของกันก่อนขายออกนอกรัฐ คู่อริไม่ค้ากัน เส้นการค้าอ้อมแดนและน่านน้ำของคู่อริเมื่อมีทางอื่น ส่วนที่อ้อมไม่ได้แพงขึ้นตามสัดส่วนที่ผ่าน', gdp: 'ตัวเลขมาจากผลการค้าปีล่าสุดของแผนที่', tune: 'ตัวเลขทุกตัวในหน้านี้เป็นค่าที่ผู้สร้างเอนจินตั้งไว้เอง แก้ได้ทุกตัว แผนที่จำเฉพาะตัวที่ต่างจากค่าตั้งต้น และผลการค้าคิดใหม่ทุกครั้งที่แก้' }[ecoTab];
  if (!editable && ecoTab !== 'gdp') { $('ecobody').innerHTML = '<p class="note">กำลังโหลดแผนที่</p>'; return; }
  $('ecobody').innerHTML = ecoTab === 'goods' ? ecoGoodsHTML() : ecoTab === 'cats' ? ecoCatsHTML() + ecoWorkHTML() : ecoTab === 'states' ? ecoStatesHTML() : ecoTab === 'tune' ? ecoTuneHTML() : ecoGdpHTML();
}
const ecoTermsOf = g => { if (g.custom) return ECO.custom.find(x => x.id === g.id).terms; const o = ecoOver(g.id); if (!o.terms) o.terms = g.terms.map(t => ({ ...t })); return o.terms; };
$('ecobody').addEventListener('click', e => {
  const b = e.target.closest('[data-a]'); if (!b || !editable) return; const a = b.dataset.a, g = ecoSel && ecoGood(ecoSel);
  if (a === 'gsel') { ecoSel = b.dataset.g; ecoRender(); $('ecobody').scrollIntoView({ block: 'nearest' }); return; }
  if (a === 'gclose') { ecoSel = null; ecoRender(); return; }
  if (a === 'gnew') { const id = uid('x'); ECO.custom.push({ id, name: 'สินค้าใหม่', cat: 'luxury', pct: 1, off: 0, far: 0, terms: [{ on: 'g', rate: 0.02 }] }); ecoSel = id; }
  else if (a === 'gdel' && g && g.custom) { ECO.custom = ECO.custom.filter(x => x.id !== g.id); ecoSel = null; }
  else if (a === 'greset' && g) { delete ECO.goods[g.id]; }
  else if (a === 'tadd' && g && g.terms) { const ts = ecoTermsOf(g); if (ts.length < 8) ts.push({ on: 'g', rate: 0.02 }); }
  else if (a === 'tdel' && g && g.terms) { ecoTermsOf(g).splice(+b.closest('.eterm').dataset.k, 1); }
  else if (a === 'code' && g && g.terms) { const t = ecoTermsOf(g)[+b.closest('.eterm').dataset.k], ch = b.dataset.b; t.on = t.on.includes(ch) ? t.on.replace(ch, '') || ch : t.on + ch; }
  else if (a === 'creset') { ECO.cats = {}; }
  else if (a === 'treset') { ECO.tune = {}; }
  else if (a === 'wreset') { delete ECO.work[b.closest('[data-w]').dataset.w]; }
  else if (a === 'wdel') { const m = b.closest('[data-w]').dataset.w, c = b.closest('[data-i]').dataset.i, w = ECO.work[m] || (ECO.work[m] = {}); w.in = { ...EWORK[m].in }; delete w.in[c]; if (!Object.keys(w.in).length) return; }
  else if (a === 'unew') { if (ECO.ucats.length >= 24) return; ECO.ucats.push({ id: 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: 'ประเภทใหม่', col: SCOLS[(ECO.ucats.length + 3) % SCOLS.length], v: 3, bulk: 0.5, need: 0.05 }); }
  else if (a === 'udel') { const id = b.closest('[data-u]').dataset.u; ECO.ucats = ECO.ucats.filter(u => u.id !== id); }
  else if (a === 'snew') { const id = [...SKEYS].find(k => !ECO.states.some(s => s.id === k)); if (!id) return; ECO.states.push({ id, name: 'รัฐที่ ' + (ECO.states.length + 1), color: SCOLS[ECO.states.length % SCOLS.length], sys: 'merc', cur: '', rate: 1, rel: {} }); ecoPaint = id; }
  else if (a === 'sdel') { const id = b.closest('[data-s]').dataset.s; ECO.states = ECO.states.filter(s => s.id !== id); for (const s of ECO.states) delete s.rel[id]; for (let i = 0; i < N; i++) if (ECO.cells[i] === id) ECO.cells[i] = '.'; if (ecoPaint === id) ecoPaint = null; }
  else return;
  ecoChanged(true); ecoRender();
});
$('ecobody').addEventListener('input', e => { if (e.target.dataset.f === 'pct') { const v = $('ecoPctV'); if (v) v.textContent = e.target.value + '%'; } });
$('ecobody').addEventListener('change', e => {
  const el = e.target, f = el.dataset.f; if (!f || !editable) return; const g = ecoSel && ecoGood(ecoSel), num = +el.value;
  if (g && ['name', 'cat', 'pct', 'off', 'far'].includes(f)) {
    const o = g.custom ? ECO.custom.find(x => x.id === g.id) : ecoOver(g.id);
    if (f === 'name') { const v = el.value.trim().slice(0, 60); if (v) o.name = v; } else if (f === 'cat') o.cat = el.value; else if (f === 'pct') o.pct = clamp(num / 100, 0, 3); else o[f] = el.checked ? 1 : 0;
  } else if (g && g.terms && el.closest('.eterm')) {
    const t = ecoTermsOf(g)[+el.closest('.eterm').dataset.k]; if (!t) return;
    if (f === 'src') { if (el.value === 'g') t.on = 'g'; else { t.on = el.value; for (const k of ['f', 'r', 'l', 'o', 'm', 'c']) delete t[k]; t.rate = 0.25; } }
    else if (f === 'rate') t.rate = clamp(num || 0, 0, 20); else if (f === 'm' || f === 'c') { if (num >= 1) t[f] = Math.min(8, Math.round(num)); else delete t[f]; } else if (el.checked) t[f] = 1; else delete t[f];
  } else if (f === 'tune' && ETUNE[el.dataset.k]) {
    const k = el.dataset.k, z = ETUNE[k]; if (!Number.isFinite(num) || el.value === '') return; const x = clamp(num, z[1], z[2]); if (x === z[0]) delete ECO.tune[k]; else ECO.tune[k] = x;
  } else if (el.closest('[data-w]')) {
    const m = el.closest('[data-w]').dataset.w, w = ECO.work[m] || (ECO.work[m] = {});
    if (f === 'wbase' && num > 0) w.base = clamp(num, 0.001, 5);
    else if (f === 'win' && num > 0) { w.in = { ...EWORK[m].in }; w.in[el.closest('[data-i]').dataset.i] = clamp(num, 0.001, 20); }
    else if (f === 'wadd' && el.value && ECAT[el.value] && !ECAT[el.value].made) { w.in = { ...EWORK[m].in }; w.in[el.value] = 0.2; }
    else return;
  } else if (el.closest('[data-u]')) {
    const u = ECO.ucats.find(x => x.id === el.closest('[data-u]').dataset.u); if (!u) return;
    if (f === 'uname') u.name = el.value.trim().slice(0, 60) || u.name; else if (f === 'ucol' && HEXC.test(el.value)) u.col = el.value; else if (f === 'uv' && num > 0) u.v = clamp(num, 0.05, 200); else if (f === 'ubulk' && num > 0) u.bulk = clamp(num, 0.01, 10); else if (f === 'uneed' && num >= 0) u.need = clamp(num, 0, 5);
  } else if (el.closest('[data-c]')) {
    const c = el.closest('[data-c]').dataset.c, o = ECO.cats[c] || (ECO.cats[c] = {});
    if (f === 'cname') { const v = el.value.trim().slice(0, 60); if (v) o.name = v; } else if (f === 'cv' && num > 0) o.v = clamp(num, 0.05, 200); else if (f === 'cbulk' && num > 0) o.bulk = clamp(num, 0.01, 10);
  } else if (el.closest('[data-s]')) {
    const s = ECO.states.find(x => x.id === el.closest('[data-s]').dataset.s); if (!s) return;
    if (f === 'sname') s.name = el.value.trim().slice(0, 60) || s.name; else if (f === 'scolor' && HEXC.test(el.value)) s.color = el.value; else if (f === 'ssys' && ESYS[el.value]) s.sys = el.value; else if (f === 'scur') s.cur = el.value.trim().slice(0, 30); else if (f === 'srate' && num > 0) s.rate = clamp(num, 0.01, 1000); else if (f === 'scap') s.cap = el.value;
    else if (f === 'srel') { const o = ECO.states.find(x => x.id === el.dataset.o); if (!o) return; delete s.rel[o.id]; delete o.rel[s.id]; if (el.value) { s.rel[o.id] = el.value; o.rel[s.id] = el.value; } }
  } else if (f === 'cenname') ECO.central.name = el.value.trim().slice(0, 30) || ECO.central.name; else if (f === 'cenper' && num > 0) ECO.central.per = num; else if (f === 'unit' && num >= 100) ECO.unit = Math.round(num);
  else return;
  ecoChanged(true);
  if (el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'color' || el.type === 'range' || f === 'tune') ecoRender();   // a field being typed in keeps its place: the next click must land
});

// the people of a city, in the city's own form
$('cfPop').onchange = () => { if (!sel || !editable) return; const n = Math.round(+$('cfPop').value); if (n > 0) ECO.pop[sel] = Math.min(5e7, n); else delete ECO.pop[sel]; ecoChanged(false); ecoCityForm(); };
function ecoCityForm() {
  if (!sel) return; const v = visibleCities().find(c => c.id === sel); if (!v) return;
  const ki = KIX[v.kind] != null ? KIX[v.kind] : 1, def = Math.round(EPOP[ki] * ECO.unit);
  $('cfPop').value = ECO.pop[sel] || ''; $('cfPop').placeholder = def.toLocaleString('en-US');
  const fit = KIK[ecoKi(sel, v.kind)];
  const note = ECO.pop[sel] && CK[fit] && fit !== v.kind ? ` ประชากรเท่านี้ทำให้เมืองนี้ผลิต บริโภค และค้าขายในระดับ${CK[fit].name}` : '';
  $('cfHint').textContent = [$('cfHint').textContent.split(' · ')[0].trim(), note.trim()].filter(Boolean).join(' · ');
}
const __rfEco = refreshForm;
refreshForm = function () { __rfEco(); ecoCityForm(); };

// how dangerous a trade line is, in the line's own card
const __rtEco = renderTradeCard;
renderTradeCard = function () {
  __rtEco();
  const was = $('ecocard').hidden; $('ecocard').hidden = mode !== 'econ';
  if (mode !== 'econ') box.classList.remove('ecopaint'); else if (was || ecoTab === 'gdp') ecoRender();   // a card being typed in is left alone
  if (mode !== 'trade' || !ECON || !tlsel || !editable) return;
  const L = ECON.links.find(x => x.id === tlsel); if (!L) return;
  const d = document.createElement('div'); d.className = 'tr';
  const own = ECO.danger[L.id] || 0, au = L.dauto, opt = (v, t, on) => `<option value="${v}"${on ? ' selected' : ''}>${t}</option>`, mul = k => ` (ค่าขน ×${(1 + 0.5 * k).toFixed(1)})`;
  d.innerHTML = `ความอันตรายของเส้นทาง <select id="ecoDanger">`
    + (ECO.auto ? opt('', 'ให้ระบบประเมิน' + (au ? ' ตอนนี้ ' + DANGER[au.lv] + mul(au.lv) : ''), !own) + DANGER.map((n, k) => opt(k || 4, n + mul(k), own === (k || 4))).join('') : DANGER.map((n, k) => opt(k, n + mul(k), k === (own === 4 ? 0 : own))).join(''))
    + `</select>`
    + (ECO.auto && au && !own ? `<div class="w">ระบบประเมินจากทางที่ไกลเมือง ${Math.round(au.far * 100)}%${ECOX.on ? ' ไม่มีรัฐคุม ' + Math.round(au.free * 100) + '%' : ''} และภูมิประเทศยากหรือทะเลเปิด ${Math.round(au.rough * 100)}%</div>` : '')
    + `<label class="w" style="display:block;margin-top:4px"><input type="checkbox" id="ecoAuto"${ECO.auto ? ' checked' : ''}> ให้ระบบประเมินทุกเส้นที่ยังไม่ได้ตั้งเอง</label>`
    + (L.hostile > 0.005 ? `<div class="w">ผ่านแดนหรือน่านน้ำของคู่อริ ${Math.round(L.hostile * 100)}% ของทาง ค่าขนคูณ ${(1 + 3 * L.hostile).toFixed(2)}</div>` : '');
  $('tradebody').appendChild(d);
  $('ecoDanger').onchange = () => { const n = +$('ecoDanger').value; if (n > 0) ECO.danger[L.id] = n; else delete ECO.danger[L.id]; ecoChanged(false); };
  $('ecoAuto').onchange = () => { ECO.auto = $('ecoAuto').checked; if (!ECO.auto) for (const k in ECO.danger) if (ECO.danger[k] === 4) delete ECO.danger[k]; ecoChanged(false); };
};
ecoApply();

// ---- one step back and forward for the documents the engine added (they stand outside the page's own undo) ----
SIDE.eco = { last: '', undo: [], redo: [], ser: () => JSON.stringify(ecoSerial()), load: b => { ecoLoad(b); ecoDirty = true; clearTimeout(ecoT); ecoT = setTimeout(ecoSaveNow, 300); scheduleEcon(120); ecoRender(); requestDraw(); } };
function sideNote(k) { const S = SIDE[k], now = S.ser(); if (now === S.last) return; if (S.last) { S.undo.push(S.last); if (S.undo.length > 40) S.undo.shift(); S.redo.length = 0; } S.last = now; sideButtons(); }
// a change that came from someone else in the room: stepping back over it would undo their work, so the steps kept so far are let go
function sideSeen(k) { const S = SIDE[k], now = S.ser(); if (now !== S.last) { S.undo.length = 0; S.redo.length = 0; } S.last = now; sideButtons(); }
function sideStep(k, back) { const S = SIDE[k], from = back ? S.undo : S.redo, to = back ? S.redo : S.undo; if (!from.length) return false; to.push(S.last); S.last = from.pop(); S.load(JSON.parse(S.last)); sideButtons(); return true; }
function sideButtons() { for (const [k, u, r] of [['eco', 'ecoUndo', 'ecoRedo'], ['clim', 'clUndo', 'clRedo']]) if (SIDE[k] && $(u)) { $(u).disabled = !SIDE[k].undo.length; $(r).disabled = !SIDE[k].redo.length; } }
const __ecoChanged = ecoChanged;
ecoChanged = function (tables) { __ecoChanged(tables); sideNote('eco'); };
$('ecoUndo').onclick = () => sideStep('eco', true); $('ecoRedo').onclick = () => sideStep('eco', false);
__on(window, 'keydown', e => {
  if (!(e.ctrlKey || e.metaKey) || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || !editable) return;
  const k = mode === 'econ' ? 'eco' : mode === 'climate' && clTool ? 'clim' : null, key = e.key.toLowerCase(); if (!k || (key !== 'z' && key !== 'y')) return;
  e.preventDefault(); e.stopImmediatePropagation(); sideStep(k, key === 'z' && !e.shiftKey);
}, true);

// ---- trade lines keep clear of a rival's land and waters where another way exists ----
let AVOIDZ = null, ECOPAIR = null, avoidKey = '', avoidArr = null, AVOID_ON = true;
function ecoAvoid(ha, hb) {
  if (!ECOX.on || !AVOID_ON) return null;
  const sa = ECOX.byKey.get(ECO.cells[ha]), sb = ECOX.byKey.get(ECO.cells[hb]), bad = new Set();
  for (const s of [sa, sb]) if (s) for (const z in s.rel) if (s.rel[z] === 'rival') bad.add(z);
  if (sa) bad.delete(sa.id); if (sb) bad.delete(sb.id);
  if (!bad.size) return null;
  const key = ecoStamp + ':' + [...bad].sort().join('');
  if (key !== avoidKey) { avoidKey = key; avoidArr = new Uint8Array(N); for (let i = 0; i < N; i++) if (bad.has(ECO.cells[i])) avoidArr[i] = 1; }
  return avoidArr;
}

// ---- the climate by hand: heights, rain and warmth the owner sets hex by hex, and the two seasons' means (document map/climate) ----
let clTool = '', clBrushN = 2, clPainting = false, clSeen = null, clDirty = false, clLoaded = false, clSaving = false, clT = 0;
const CLSTEP = { h: [250, 'ม.'], p: [150, 'มม.'], ts: [2, '°C'], tw: [2, '°C'], st: [2, '°C'], sp: [25, '%'] };
const CLSET = [['w', -90, 30, 'clW'], ['s', -20, 45, 'clS'], ['g', -40, 40, 'clG'], ['lat0', -89, 89, 'clLat0'], ['lat1', -89, 89, 'clLat1'], ['wa', 0, 1, 'clWa']];   // the coldest season's mean, the warmest's, and how much warmer the south edge is than the north
const clSerial = () => ({ v: 1, e: CLO.e, p: CLO.p, t: CLO.t, set: CLO.set, seasons: CLO.seasons, st: CLO.st, sp: CLO.sp });
function clLoad(b) {
  b = b && typeof b === 'object' ? b : {};
  for (const [k, lo, hi] of [['e', 0, 12000], ['p', 0, 5000], ['t', -60, 60]]) { CLO[k] = {}; for (const [i, v] of Object.entries(b[k] || {})) { const h = +i; if (Number.isInteger(h) && h >= 0 && h < N && Number.isFinite(+v)) CLO[k][h] = clamp(+v, lo, hi); } }
  CLO.set = {}; for (const [k, lo, hi] of CLSET) if (b.set && b.set[k] != null && Number.isFinite(+b.set[k])) CLO.set[k] = clamp(+b.set[k], lo, hi);
  if (b.set && (WDIR[b.set.wind] || b.set.wind === 'calm' || b.set.wind === 'auto')) CLO.set.wind = b.set.wind;
  CLO.seasons = []; for (const s of (Array.isArray(b.seasons) ? b.seasons : []).slice(0, 13)) { if (!s || typeof s.id !== 'string' || !/^[a-z0-9]{2,16}$/.test(s.id) || CLO.seasons.some(x => x.id === s.id)) continue; CLO.seasons.push({ id: s.id, name: (typeof s.name === 'string' ? s.name.slice(0, 40) : '') || 'ฤดู', len: ecoNum(s.len, 0.25, 13, 3), warm: ecoNum(s.warm, 0, 1, 0.5), dt: ecoNum(s.dt, -40, 40, 0), rain: ecoNum(s.rain, 0, 4, 1), wind: WDIR[s.wind] || s.wind === 'calm' || s.wind === 'auto' ? s.wind : '', gust: ecoNum(s.gust, 0.3, 3, 1) }); }
  const ids = new Set(CLO.seasons.map(s => s.id));
  for (const [k, lo, hi] of [['st', -40, 40], ['sp', 0, 4]]) { CLO[k] = {}; let n = 0; for (const [key, v] of Object.entries(b[k] || {})) { const [sid, hx] = String(key).split(':'), h = +hx; if (ids.has(sid) && Number.isInteger(h) && h >= 0 && h < N && Number.isFinite(+v) && n++ < 400000) CLO[k][sid + ':' + h] = clamp(+v, lo, hi); } }
  CL_DIRTY = true; CL_BK = null; clInputs();
}
async function clSaveNow() { if (!ENV.db || !clLoaded || !clDirty || clSaving) return; clSaving = true; clDirty = false; try { await ENV.db.doc('map/climate').set(clSerial()); } catch (err) { clDirty = true; } clSaving = false; if (clDirty) clSaveNow(); }
function clChanged() { CL_DIRTY = true; CL_BK = null; clDirty = true; clearTimeout(clT); clT = setTimeout(clSaveNow, ENV.saveDelay || 500); sideNote('clim'); scheduleEcon(200); renderClimCard(); requestDraw(); }
SIDE.clim = { last: '', undo: [], redo: [], ser: () => JSON.stringify(clSerial()), load: b => { clLoad(b); clDirty = true; clearTimeout(clT); clT = setTimeout(clSaveNow, 300); scheduleEcon(200); renderClimCard(); requestDraw(); } };
if (ENV.db) ENV.db.doc('map/climate').onSnapshot(s => { if (clLoaded && (clDirty || clSaving)) return false; const had = clLoaded; clLoaded = true; clLoad(s && s.exists ? s.data() : null); sideSeen('clim'); scheduleEcon(had ? 200 : 450); if (had) { renderClimCard(); requestDraw(); } return true; }); else clLoaded = true;
function clInputs() { for (const [k, , , id] of CLSET) { $(id).value = CLO.set[k] != null ? CLO.set[k] : ''; $(id).placeholder = BLANK && CLB.mean && (k === 'w' || k === 's') ? Math.round(CLB.mean[k]) : k === 'lat0' ? Math.round(CLLAT[0]) : k === 'lat1' ? Math.round(CLLAT[1]) : k === 'wa' ? 0.35 : clSet(k); } $('clWind').value = CLO.set.wind || ''; }
for (const [k, lo, hi, id] of CLSET) $(id).onchange = () => { if (!editable) return; const v = $(id).value.trim(); if (v === '' || !Number.isFinite(+v)) delete CLO.set[k]; else CLO.set[k] = clamp(+v, lo, hi); clInputs(); clChanged(); };
function clPaintAt(e) {
  const [mx, my] = toMap(e.clientX, e.clientY), h = hexAt(mx, my); if (h < 0) return;
  const A = climEnsure(), L = clLayer, st = CLSTEP[L], sign = clTool === 'up' ? 1 : -1; let any = false;
  for (const i of brush(h, clBrushN)) {
    if (clSeen.has(i) || isW(eff(i))) continue; clSeen.add(i); any = true;
    if (L === 'h') { if (clTool === 'clear') delete CLO.e[i]; else CLO.e[i] = clamp(Math.round(A.h[i] + sign * st[0]), 0, 12000); }
    else if (L === 'p') { if (clTool === 'clear') delete CLO.p[i]; else CLO.p[i] = clamp(Math.round(A.p[i] + sign * st[0]), 0, 5000); }
    else if (L === 'st' || L === 'sp') {            // one season alone: its warmth by degrees, its rain by a share of what the model gives
      const key = clOwnSeasons()[Math.max(0, clSeasIx())].id + ':' + i;
      if (clTool === 'clear') { delete CLO.st[key]; delete CLO.sp[key]; }
      else if (L === 'st') { const v = clamp((CLO.st[key] || 0) + sign * st[0], -40, 40); if (v) CLO.st[key] = v; else delete CLO.st[key]; }
      else { const v = clamp(Math.round(((CLO.sp[key] != null ? CLO.sp[key] : 1) + sign * 0.25) * 100) / 100, 0, 4); if (v !== 1) CLO.sp[key] = v; else delete CLO.sp[key]; }
    }
    else { if (clTool === 'clear') delete CLO.t[i]; else { const v = clamp((CLO.t[i] || 0) + sign * st[0], -60, 60); if (v) CLO.t[i] = v; else delete CLO.t[i]; } }
  }
  if (any) { CL_DIRTY = true; CL_BK = null; requestDraw(); }
}
box.addEventListener('pointerdown', e => {
  if (mode !== 'climate' || !clTool || !editable || e.button !== 0 || spaceDown || e.target !== cv) return;
  e.stopPropagation(); e.preventDefault();
  if (!CLSTEP[clLayer]) { flash('ชั้นความแห้งแล้งคิดจากฝนกับอุณหภูมิ แก้ที่ชั้นความชื้นหรือชั้นอากาศแทน'); return; }
  clPainting = true; clSeen = new Set(); clPaintAt(e);
}, true);
__on(window, 'pointermove', e => { if (clPainting) clPaintAt(e); });
__on(window, 'pointerup', () => { if (!clPainting) return; clPainting = false; if (clSeen.size) clChanged(); });
function clToolUI() {
  segPick('clTool', 't', clTool, t => { clTool = t; clToolUI(); });
  segPick('clBrush', 'n', clBrushN, n => { clBrushN = +n; clToolUI(); });
  const st = CLSTEP[clLayer]; $('clStep').textContent = !clTool ? '' : !st ? 'ชั้นนี้แก้ตรง ๆ ไม่ได้' : clTool === 'clear' ? 'ลากเพื่อคืนค่าของชั้นนี้ตามที่ระบบคิดให้' : `ลากหนึ่งครั้ง ${clTool === 'up' ? 'เพิ่ม' : 'ลด'} ${st[0]} ${st[1]} ต่อช่อง` + (clLayer === 'ts' || clLayer === 'tw' ? ' ทั้งปี' : clLayer === 'st' || clLayer === 'sp' ? ' เฉพาะฤดูที่ดูอยู่' : '');
  box.classList.toggle('ecopaint', mode === 'climate' && !!clTool);
  $('clEditRow').hidden = !editable; $('clSetRow').hidden = !editable;
}
$('clUndo').onclick = () => sideStep('clim', true); $('clRedo').onclick = () => sideStep('clim', false);
const __setClLayer = setClLayer; setClLayer = function (k) { __setClLayer(k); clToolUI(); };
const __rcEco = renderClimCard; renderClimCard = function () { __rcEco(); if (mode === 'climate') clToolUI(); else if (mode !== 'econ') box.classList.remove('ecopaint'); };
SIDE.eco.last = SIDE.eco.ser(); sideButtons(); clInputs();


// ---------- the world's settings on the map (v0.15.1) ----------
// The owner could not find where states, goods, their classes and the coin were set: they live in the side panel, which can be
// hidden, under a tab of the economy tool. He asked for them on the map's own bar, as the people of the map are. A button there
// opens the economy tool at that tab and brings the side panel, with its card at the top.
function setpickSync() { const g = document.querySelector('.setpick'); if (g) g.hidden = !editable; for (const b of document.querySelectorAll('.setpick [data-eco]')) b.setAttribute('aria-pressed', String(mode === 'econ' && ecoTab === b.dataset.eco)); }
for (const b of document.querySelectorAll('.setpick [data-eco]')) b.addEventListener('click', () => {
  ecoTab = b.dataset.eco; if (mode !== 'econ') setMode('econ'); else { ecoRender(); requestDraw(); }
  setpickSync(); if (window.MME && MME.shell && MME.shell.reveal) MME.shell.reveal('ecocard', true);
});
new MutationObserver(setpickSync).observe($('mapbox'), { attributes: true, attributeFilter: ['data-mode'] });

// ---- the seasons of the year, as the owner divides it (the request of 23 Nov 2026) ----
// The climate mode gains a row to look at one season alone, and its card a list of the seasons: add one, take one away, give each
// its length, its place between the coldest and the warmest of the year, its own warmth and rain, and its wind. With a season
// chosen the brush changes that season's warmth or rain hex by hex. The model that reads all this is in the climate part above.
const clUid = () => 's' + Math.random().toString(36).slice(2, 8);
const SBOX = document.createElement('div'); SBOX.id = 'clseasbox'; $('climbody').parentNode.insertBefore(SBOX, $('climbody'));
// the list the owner can change: on a map of our own world the four seasons become the map's own the first time one is touched
function clOwnSeasons() { if (!CLO.seasons.length && BLANK) CLO.seasons = CLSEAS0.map(s => ({ ...s })); return CLO.seasons; }
const CLUNIT = BLANK ? 'เดือน' : 'ห้วง';
let clSeasOpen = true, clSeasMean = null;
function clSeasMeans() {                            // each season over the whole land, for the list
  const A = climEnsure(); if (!A.S) return null; if (clSeasMean && clSeasMean.stamp === A.stamp) return clSeasMean.rows;
  const rows = A.S.map(() => [0, 0, 0, 0]); let n = 0;
  for (let i = 0; i < N; i++) { if (isNaN(A.h[i])) continue; n++; A.S.forEach((S, k) => { rows[k][0] += S.t[i]; rows[k][1] += S.p[i]; if (S.t[i] < 0) rows[k][2]++; if (S.t[i] >= 5) rows[k][3]++; }); }
  for (const r of rows) { r[0] /= n || 1; r[1] /= n || 1; r[2] /= n || 1; r[3] /= n || 1; }
  clSeasMean = { stamp: A.stamp, rows }; return rows;
}
const clWindOpts = (v, first) => `<option value="">${first}</option>` + Object.keys(WDIR).map(d => `<option value="${d}"${v === d ? ' selected' : ''}>จาก${WNAME[d]}</option>`).join('') + `<option value="calm"${v === 'calm' ? ' selected' : ''}>ลมสงบ ไม่พาฝนไปทางใด</option>`;
function clSeasHTML() {
  const A = climEnsure(), SE = A.seas, own = CLO.seasons.length > 0;
  if (!SE) return `<details class="clseas"${clSeasOpen ? ' open' : ''}><summary>ฤดูของปี</summary><p class="note" style="margin-top:6px">แผนที่นี้คิดอากาศจากสองห้วงสุดขั้วตามลอร์ คือห้วงขาวกับห้วงฟ้าคลาย ถ้าแบ่งปีเป็นฤดู แต่ละฤดูจะมีอุณหภูมิ ฝน และลมของตัวเอง แล้วผลผลิตกับความต้องการของเมืองจะคิดจากทุกฤดูรวมกัน</p>${editable ? '<div class="btns"><button type="button" class="btn" data-sa="split">แบ่งปีเป็นฤดู</button></div>' : ''}</details>`;
  const tot = SE.reduce((a, s) => a + s.len, 0) || 1, M = clSeasMeans();
  let h = `<details class="clseas"${clSeasOpen ? ' open' : ''}><summary>ฤดูของปี ${SE.length} ฤดู</summary>`;
  if (editable) h += `<div class="btns"><button type="button" class="btn" data-sa="add"${SE.length >= 13 ? ' disabled' : ''}>เพิ่มฤดู</button>${own ? `<button type="button" class="btn" data-sa="reset">${BLANK ? 'คืนสี่ฤดูตั้งต้น' : 'กลับไปใช้สองห้วงตามลอร์'}</button>` : ''}</div>`;
  SE.forEach((s, k) => {
    const m = M[k], w = clWindOf(s);
    h += `<div class="eform${s.id === clSeas ? ' on' : ''}" data-sid="${s.id}"><div class="erow"><input type="text" data-sf="name" maxlength="40" value="${esc(s.name)}" style="flex:1" aria-label="ชื่อฤดู"${editable ? '' : ' disabled'}><button type="button" class="btn" data-sa="view">${s.id === clSeas ? 'กำลังดู' : 'ดูบนแผนที่'}</button>${editable && SE.length > 1 ? '<button type="button" class="btn warn" data-sa="del">ลบ</button>' : ''}</div>`
      + `<div class="erow"><label>ยาว <input type="number" data-sf="len" min="0.25" max="13" step="0.25" value="${s.len}"> ${CLUNIT} (ร้อยละ ${Math.round(s.len / tot * 100)} ของปี)</label></div>`
      + `<div class="erow"><label style="flex:1">ตำแหน่งบนวงรอบปี หนาวสุด <input type="range" data-sf="warm" min="0" max="100" step="5" value="${Math.round(s.warm * 100)}" style="flex:1"> ร้อนสุด <b>${Math.round(s.warm * 100)}%</b></label></div>`
      + `<div class="erow"><label>อุณหภูมิ บวกหรือลบ <input type="number" data-sf="dt" min="-40" max="40" step="0.5" value="${s.dt}"> °C</label><label>ฝน <input type="number" data-sf="rain" min="0" max="400" step="5" value="${Math.round(s.rain * 100)}"> %</label></div>`
      + `<div class="erow"><label>ลม <select data-sf="wind">${clWindOpts(s.wind, BLANK ? 'ตามลมประจำของแผนที่' : 'ไม่กำหนด ฝนกระจายตามที่สำรวจ')}</select></label><label>แรงลม <input type="number" data-sf="gust" min="30" max="300" step="10" value="${Math.round((s.gust || 1) * 100)}"> %</label></div>`
      + `<div class="tr w">เฉลี่ยทั้งแผ่นดิน ${fmtT(m[0])} ฝน ${fmtN(m[1])} มม.${m[2] > 0.02 ? ' แผ่นดินร้อยละ ' + Math.round(m[2] * 100) + ' ต่ำกว่าจุดเยือกแข็ง' : ''} ปลูกพืชได้ร้อยละ ${Math.round(m[3] * 100)} ของแผ่นดิน${w === 'auto' ? ' ลมตามแถบละติจูด' : WDIR[w] ? ' ลมจาก' + WNAME[w] : ''}</div></div>`;
  });
  return h + `<p class="note">ความยาวคิดเป็นสัดส่วนกันเอง ไม่ต้องรวมได้เลขใดเลขหนึ่ง ตำแหน่งบนวงรอบปีบอกว่าฤดูนั้นอยู่ใกล้ช่วงหนาวที่สุดหรือร้อนที่สุดของแต่ละช่อง ${BLANK ? 'ซีกใต้ของเส้นศูนย์สูตรกลับฤดูให้เอง ' : ''}ฝนร้อยละร้อยคือส่วนที่แบบจำลองแบ่งให้ฤดูนี้ ลมกำหนดว่าด้านไหนของแผ่นดินและของเทือกเขาได้ฝนของฤดูนี้ แรงลมมากพาความชื้นเข้าไปได้ลึก ถ้าจะแก้เฉพาะบางพื้นที่ กดดูบนแผนที่แล้วใช้เครื่องมือแก้ค่าของชั้นที่ดูอยู่</p></details>`;
}
function clSeasonRow() {
  const A = climEnsure(), SE = A.seas; if (clSeas && !(SE && SE.some(s => s.id === clSeas))) clSeas = '';
  $('clSeason').innerHTML = `<button type="button" data-s="">ทั้งปี</button>` + (SE || []).map(s => `<button type="button" data-s="${s.id}">${esc(s.name)}</button>`).join('');
  segPick('clSeason', 's', clSeas, setClSeas);
  $('clSeason').closest('.optrow').hidden = !SE;
}
function setClSeas(id) { clSeas = id || ''; CL_BK = null; clSeasonRow(); clLayerRow(); renderClimCard(); requestDraw(); }
function clSeasEdit(fn) { if (!editable) return; fn(clOwnSeasons()); clChanged(); }
SBOX.addEventListener('toggle', e => { if (e.target.classList && e.target.classList.contains('clseas')) clSeasOpen = e.target.open; }, true);
SBOX.addEventListener('click', e => {
  const b = e.target.closest('[data-sa]'); if (!b) return; const a = b.dataset.sa, box = b.closest('[data-sid]'), sid = box && box.dataset.sid;
  if (a === 'view') { setClSeas(clSeas === sid ? '' : sid); return; }
  if (!editable) return;
  if (a === 'split') { CLO.seasons = [{ id: clUid(), name: 'ห้วงขาว', len: 6.5, warm: 0, dt: 0, rain: 1, wind: '', gust: 1 }, { id: clUid(), name: 'ห้วงฟ้าคลาย', len: 6.5, warm: 1, dt: 0, rain: 1, wind: '', gust: 1 }]; clChanged(); }
  else if (a === 'add') clSeasEdit(L => { if (L.length < 13) L.push({ id: clUid(), name: 'ฤดูใหม่', len: BLANK ? 3 : 1, warm: 0.5, dt: 0, rain: 1, wind: '', gust: 1 }); });
  else if (a === 'del') clSeasEdit(L => { if (L.length < 2) return; const k = L.findIndex(s => s.id === sid); if (k < 0) return; L.splice(k, 1); for (const m of [CLO.st, CLO.sp]) for (const key of Object.keys(m)) if (key.startsWith(sid + ':')) delete m[key]; if (clSeas === sid) clSeas = ''; });
  else if (a === 'reset') { CLO.seasons = []; CLO.st = {}; CLO.sp = {}; clSeas = ''; clChanged(); }
});
SBOX.addEventListener('input', e => { if (e.target.dataset.sf === 'warm') { const b = e.target.parentNode.querySelector('b'); if (b) b.textContent = e.target.value + '%'; } });
SBOX.addEventListener('change', e => {
  const el = e.target, f = el.dataset.sf, box = el.closest('[data-sid]'); if (!f || !box) return; const sid = box.dataset.sid, num = +el.value;
  clSeasEdit(L => {
    const s = L.find(x => x.id === sid); if (!s) return;
    if (f === 'name') s.name = el.value.trim().slice(0, 40) || s.name;
    else if (f === 'len' && num > 0) s.len = clamp(num, 0.25, 13);
    else if (f === 'warm') s.warm = clamp(num / 100, 0, 1);
    else if (f === 'dt' && Number.isFinite(num)) s.dt = clamp(num, -40, 40);
    else if (f === 'rain' && num >= 0) s.rain = clamp(num / 100, 0, 4);
    else if (f === 'wind') s.wind = WDIR[el.value] || el.value === 'calm' ? el.value : '';
    else if (f === 'gust' && num > 0) s.gust = clamp(num / 100, 0.3, 3);
  });
});
// the map's own settings: its latitudes and its prevailing wind
$('clWind').innerHTML = clWindOpts('', !BLANK ? 'ไม่กำหนด' : GENWIND ? 'ตามที่แผนที่ถูกสร้าง (จาก' + WNAME[GENWIND] + ')' : 'ตามแถบละติจูด') + (BLANK && GENWIND ? '<option value="auto">ตามแถบละติจูด (ลมสินค้า ลมตะวันตก ลมขั้วโลก)</option>' : '');
$('clWind').onchange = () => { if (!editable) return; const v = $('clWind').value; if (WDIR[v] || v === 'calm' || (v === 'auto' && BLANK)) CLO.set.wind = v; else delete CLO.set.wind; clChanged(); };
$('clLatL').hidden = !BLANK; $('clGL').hidden = BLANK;
// which way the season's wind blows, drawn over the layer as small arrows
function clDrawWind(c, px) {
  const A = climEnsure(), k = clSeasIx(); if (k < 0) return; const w = clWindOf(A.seas[k]); if (!w || w === 'calm') return;
  const step = Math.max(3, Math.round(26 * px / R)), len = R * step * 0.42;
  c.save(); c.strokeStyle = 'rgba(255,255,255,.62)'; c.fillStyle = 'rgba(255,255,255,.62)'; c.lineWidth = Math.max(1, 1.4 * px); c.lineCap = 'round';
  for (let r = (step >> 1); r < ROWS; r += step) for (let q = (step >> 1); q < COLS; q += step) {
    const i = r * COLS + q, d = WDIR[w === 'auto' ? clBelt(CLB.lat ? CLB.lat[i] : 0) : w]; if (!d) continue;
    const x = CX[i], y = CY[i], x1 = x + d[0] * len, y1 = y + d[1] * len, x0 = x - d[0] * len, y0 = y - d[1] * len, hx = len * 0.45;
    c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x1 - d[0] * hx - d[1] * hx * 0.55, y1 - d[1] * hx + d[0] * hx * 0.55); c.lineTo(x1 - d[0] * hx + d[1] * hx * 0.55, y1 - d[1] * hx - d[0] * hx * 0.55); c.closePath(); c.fill();
  }
  c.restore();
}
const __dcSeas = drawClimate; drawClimate = function (c, px) { __dcSeas(c, px); clDrawWind(c, px); };
// A field that was typed in reports its change when the cursor leaves it, which is often the press of a button in this very card.
// Were the list drawn afresh at that moment the button would be gone from under the press and the click lost, so after a typed
// change the list stands as it is for a moment and is drawn afresh a little later.
// The list has a box of its own above the rest of the card for the same reason: the rest of the card is drawn afresh at every change.
let clTyped = false, clSeasLater = 0;
__on(window, 'change', e => { const t = e.target; if (t && t.matches && t.matches('input[type="number"], input[type="text"]')) { clTyped = true; setTimeout(() => { clTyped = false; }, 0); } }, true);
const __rcSeas = renderClimCard; renderClimCard = function () {
  __rcSeas(); SBOX.hidden = mode !== 'climate'; if (mode !== 'climate') return;
  clSeasonRow(); clLayerRow();
  if (!(document.activeElement && document.activeElement.closest && document.activeElement.closest('#clSetRow'))) clInputs();   // the means the model gives show in the empty fields
  if (clTyped && SBOX.firstChild) { clearTimeout(clSeasLater); clSeasLater = setTimeout(() => { if (mode === 'climate' && !__dead) renderClimCard(); }, 700); return; }
  const at = document.activeElement, hold = at && at.dataset && at.dataset.sf && at.closest('[data-sid]') ? [at.closest('[data-sid]').dataset.sid, at.dataset.sf] : null;
  SBOX.innerHTML = clSeasHTML();
  if (hold) { const el = SBOX.querySelector(`[data-sid="${hold[0]}"] [data-sf="${hold[1]}"]`); if (el) el.focus({ preventScroll: true }); }   // the field that was being worked in keeps the cursor
};
clInputs();
// ---------- the reach of a brush that paints numbers or borders ----------
// The terrain brush has always shown its reach under the pointer. The climate brush and the border brush did not, so a stroke
// was a guess at how far it would go (the owner's note, 23 Nov 2026). Both show it now: the hexes a press here would change,
// tinted by what it would do to them, and the card says the same in words.
let REACH = null;
function reachNow() {
  if (!cursor || pinch || !editable || spaceDown || (act && act.k === 'pan')) return null;
  let n = 0, tint = '', land = false;
  if (mode === 'climate' && clTool && CLSTEP[clLayer]) { n = clBrushN; land = true; tint = clTool === 'up' ? '255,138,76' : clTool === 'down' ? '96,176,255' : '236,236,236'; }
  else if (mode === 'econ' && ecoTab === 'states' && ecoPaint != null) { n = ecoBrushN; const s = ECOX.byKey && ECOX.byKey.get(ecoPaint), c = s && /^#[0-9a-f]{6}$/i.test(s.color || '') ? s.color : null; tint = c ? [1, 3, 5].map(k => parseInt(c.slice(k, k + 2), 16)).join(',') : '236,236,236'; }
  if (!n) return null;
  const h = hexAt(cursor[0], cursor[1]); if (h < 0) return null;
  const cells = []; for (const i of brush(h, n)) if (!land || !isW(eff(i))) cells.push(i);
  return { h, n, tint, cells, all: brush(h, n).length };
}
const __drawReach = draw;
draw = function () {
  __drawReach();
  REACH = reachNow(); if (!REACH) return;
  const px = 1 / view.s;
  ctx.save(); ctx.setTransform(dpr * view.s, 0, 0, dpr * view.s, dpr * view.x, dpr * view.y);
  if (REACH.cells.length) {
    ctx.beginPath(); for (const i of REACH.cells) hexPath(ctx, i, 1);
    ctx.fillStyle = `rgba(${REACH.tint},.3)`; ctx.fill();
    ctx.lineWidth = 1.5 * px; ctx.strokeStyle = 'rgba(255,244,214,.95)'; ctx.stroke();
  }
  if (REACH.cells.length < REACH.all) {              // the part of the brush that lies on water, where the climate brush changes nothing
    ctx.beginPath(); for (const i of brush(REACH.h, REACH.n)) if (!REACH.cells.includes(i)) hexPath(ctx, i, 1);
    ctx.setLineDash([3 * px, 3 * px]); ctx.lineWidth = 1 * px; ctx.strokeStyle = 'rgba(255,244,214,.45)'; ctx.stroke(); ctx.setLineDash([]);
  }
  ctx.restore();
};
// one more line on the climate card while a brush is in hand: what a press here would do, and to how many hexes
function clReachNote() {
  if (mode !== 'climate' || !clTool || !editable) return '';
  const st = CLSTEP[clLayer]; if (!st) return '<div class="m">ชั้นนี้คิดจากชั้นอื่น แปรงแก้ตรง ๆ ไม่ได้</div>';
  const r = reachNow(), k = r ? r.cells.length : 0;
  return `<div class="s">แปรงตรงนี้${clTool === 'clear' ? 'คืนค่าที่ระบบคิดให้' : (clTool === 'up' ? 'เพิ่ม ' : 'ลด ') + st[0] + ' ' + st[1] + ' ต่อช่อง'} ${k ? 'ใน ' + k + ' ช่อง' : 'แต่ใต้แปรงเป็นน้ำทั้งหมด จึงไม่มีช่องให้แก้'}</div>`;
}
// the card keeps its place when the map's box changes size
const __refitTip = refit; refit = function () { __refitTip(); tipPlace(); };
// the room's owner asks to be taken to where a friend is working
function lookAt(x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  const r = cv.getBoundingClientRect();
  view.s = Math.max(view.s, Math.min(fitS * 6, fitS * 2.2));
  view.x = padL() + (r.width - padL() - padR()) / 2 - x * view.s; view.y = r.height / 2 - y * view.s; clampView(); requestDraw();
}
// ---------- organisations, a state's balance of trade, and the order of the GDP list (v0.9.0) ----------
// An organisation is a guild, an association, a charity, a faith or anything else the owner names. It has houses in cities, and
// in each of them it does what its five numbers say: raises output, raises the worth of what is made, helps the people, takes
// something off the cost of carrying, and (when it trades past the states) lets its houses deal with each other directly.
// Every number is the owner's to set; what each kind starts with is mine.
function orgCities(cities) {
  const by = new Map(cities.map(c => [c.id, c]));
  for (const c of cities) c.org = null;
  for (const o of ECO.orgs) for (const id of o.seats) { const c = by.get(id); if (c) (c.org || (c.org = [])).push(o); }
}
function orgFor(o, cat) { return !o.cat || o.cat === cat; }
function orgProd(c, cat) { if (!c.org) return 1; let f = 1; for (const o of c.org) if (o.prod > 0 && orgFor(o, cat)) f += o.prod; return Math.min(4, f); }
function orgVal(c, cat) { if (!c.org) return 0; let f = 0; for (const o of c.org) if (o.val > 0 && orgFor(o, cat)) f += o.val; return Math.min(3, f); }
function orgWell(c) { if (!c.org) return 0; let f = 0; for (const o of c.org) f += o.well || 0; return Math.min(1, f); }
function orgHaulOf(c) { if (!c.org) return 0; let f = 0; for (const o of c.org) f += o.haul || 0; return Math.min(0.9, f); }
function orgHaul(a, b) { return 1 - (orgHaulOf(a) + orgHaulOf(b)) / 2; }   // a line pays less at each end that has such a house
function orgNet(a, b, cat) { if (!a.org || !b.org || a === b) return null; for (const o of a.org) if (o.net && orgFor(o, cat) && b.org.includes(o)) return o.id; return null; }

// What each organisation made in the year, in the central coin: the extra output its houses brought, the worth it added, the
// carrying it saved, the fee on what rode its own network, and the help it gave. Its worth is its founding capital plus so many
// years of that (a number in the model's table). The split between two organisations in one city follows their own numbers.
function orgValues(rows) {
  const E = ECON, out = new Map(ECO.orgs.map(o => [o.id, { made: 0, worth: 0, saved: 0, fee: 0, help: 0, year: 0, value: o.base || 0, seats: 0 }]));
  if (!E) return out;
  const per = ECO.central.per;
  E.cities.forEach((c, k) => {
    if (!c.org) return;
    for (const o of c.org) out.get(o.id).seats++;
    for (const cat of ECATS) {
      const mk = E.MK[k][cat]; if (!mk || !(mk[0] > 0)) continue; const val = mk[0] * (E.P1[k][cat] || 1) * ECAT[cat].v * per, f = orgProd(c, cat);
      for (const o of c.org) { if (!orgFor(o, cat)) continue; const v = out.get(o.id); if (o.prod > 0 && f > 1) v.made += val * o.prod / f; if (o.val > 0) v.worth += val * o.val; }
    }
    const r = rows && rows[k]; if (r) for (const o of c.org) if (o.well > 0) out.get(o.id).help += o.well * r.gdp;
  });
  for (const f of E.flows) {
    const a = E.cities[f.from], b = E.cities[f.to], cat = ECAT[f.cat]; if (!cat) continue;
    if (f.org && out.has(f.org)) out.get(f.org).fee += TU('orgFee') * f.amt * (E.P1[f.to][f.cat] || 1) * cat.v * per;
    const ha = orgHaulOf(a), hb = orgHaulOf(b), h = (ha + hb) / 2; if (!(h > 0)) continue;
    const saved = f.amt * f.cost * cat.bulk * EKAPPA * ECOX.km * h / (1 - h) * per;   // what the same way would have cost without the houses
    for (const [c, hc] of [[a, ha], [b, hb]]) if (hc > 0) for (const o of c.org) if (o.haul > 0) out.get(o.id).saved += saved * (hc / (ha + hb)) * (o.haul / c.org.reduce((s, x) => s + (x.haul || 0), 0));
  }
  for (const [id, v] of out) { v.year = v.made + v.worth + v.saved + v.fee + v.help; v.value += v.year * TU('orgYears'); }
  return out;
}
function orgTableHTML(rows) {
  const V = orgValues(rows);
  return `<div class="etable g4"><div class="eth"><span>องค์กร</span><span>เมือง</span><span>สร้างต่อปี</span><span>มูลค่าองค์กร</span></div>` + [...ECO.orgs].sort((a, b) => V.get(b.id).value - V.get(a.id).value).map(o => { const v = V.get(o.id); return `<div class="etr"><span><i class="odot" style="background:${o.color}"></i>${esc(o.name)} · ${OKIND[o.kind][0]}</span><span>${v.seats}</span><span>${ecoNumF(v.year)}</span><span>${ecoNumF(v.value)}</span></div>`; }).join('') + `</div>`;
}
let orgPick = null;                                  // the organisation whose houses a click on a city sets up or takes down
function ecoOrgsHTML() {
  let h = `<div class="btns" style="margin:0 0 8px"><button type="button" class="btn" data-a="onew"${ECO.orgs.length >= 60 ? ' disabled' : ''}>เพิ่มองค์กร</button></div>`;
  if (!ECO.orgs.length) return h + `<p class="note">ยังไม่มีองค์กร เพิ่มองค์กรแล้วกดปุ่มแปะบนแผนที่ จากนั้นคลิกเมืองที่องค์กรนั้นมีสาขา คลิกซ้ำเพื่อถอนสาขา เมืองหนึ่งมีหลายองค์กรได้</p>`;
  const E = ECON, rows = E ? ecoIncome(ecoGdp()) : null, V = orgValues(rows), names = new Map(visibleCities().map(c => [c.id, c.name || 'เมืองไม่มีชื่อ']));
  const pct = (o, f, label, max) => `<label>${label} <input type="number" data-f="${f}" min="0" max="${max}" step="1" value="${Math.round(o[f] * 1000) / 10}"> %</label>`;
  for (const o of ECO.orgs) {
    const v = V.get(o.id), seats = o.seats.filter(id => names.has(id)), free = [...names].filter(([id]) => !o.seats.includes(id)).sort((a, b) => a[1].localeCompare(b[1], 'th'));
    h += `<div class="eform${orgPick === o.id ? ' picked' : ''}" data-org="${o.id}"><div class="erow"><input type="color" data-f="ocolor" value="${o.color}" aria-label="สีขององค์กร"><input type="text" data-f="oname" maxlength="60" value="${esc(o.name)}" style="flex:1"></div>`
      + `<div class="erow"><label>ชนิด <select data-f="okind">${Object.entries(OKIND).map(([k, z]) => `<option value="${k}"${k === o.kind ? ' selected' : ''}>${z[0]}</option>`).join('')}</select></label><label>ทำงานกับ <select data-f="ocat"><option value="">สินค้าทุกประเภท</option>${ECATS.map(c => `<option value="${c}"${c === o.cat ? ' selected' : ''}>${esc(ECAT[c].name)}</option>`).join('')}</select></label></div>`
      + `<div class="erow">${pct(o, 'prod', 'เพิ่มผลผลิต', 200)}${pct(o, 'val', 'เพิ่มมูลค่าสินค้า', 200)}${pct(o, 'well', 'ยกความเป็นอยู่', 100)}${pct(o, 'haul', 'ลดค่าขนส่ง', 90)}</div>`
      + `<div class="erow"><label><input type="checkbox" data-f="onet"${o.net ? ' checked' : ''}> สาขาค้ากันเองข้ามกรอบของรัฐ</label><label>ทุนตั้งต้น <input type="number" data-f="obase" min="0" step="1000" value="${o.base || 0}" style="width:8em"> ${esc(ECO.central.name)}</label></div>`
      + `<div class="tr w">สาขา ${seats.length} เมือง${seats.length ? ' ' + seats.map(id => `<span class="ochip">${esc(names.get(id))}${editable ? `<button type="button" data-a="oseat" data-c="${esc(id)}" aria-label="ถอนสาขาที่ ${esc(names.get(id))}">×</button>` : ''}</span>`).join('') : ''}</div>`
      + `<div class="erow"><label>เพิ่มสาขา <select data-f="oadd"><option value="">เลือกเมือง</option>${free.map(([id, n]) => `<option value="${esc(id)}">${esc(n)}</option>`).join('')}</select></label><button type="button" class="btn${orgPick === o.id ? ' on' : ''}" data-a="opick">${orgPick === o.id ? 'กำลังแปะ คลิกเมืองบนแผนที่' : 'แปะบนแผนที่'}</button></div>`
      + `<div class="tr">สร้างมูลค่าปีละ <b>${ecoNumF(v.year)}</b> ${esc(ECO.central.name)} มูลค่าองค์กร <b>${ecoNumF(v.value)}</b></div>`
      + `<div class="tr w">ผลผลิตที่เพิ่ม ${ecoNumF(v.made)} · มูลค่าที่เพิ่ม ${ecoNumF(v.worth)} · ค่าขนที่ประหยัด ${ecoNumF(v.saved)} · ค่าธรรมเนียมเครือข่าย ${ecoNumF(v.fee)} · ความช่วยเหลือ ${ecoNumF(v.help)}</div>`
      + `<div class="btns"><button type="button" class="btn warn" data-a="odel">ลบองค์กรนี้</button></div></div>`;
  }
  return h + `<p class="note">เพิ่มผลผลิตคูณของที่เมืองทำได้ในประเภทที่องค์กรทำงานด้วย เพิ่มมูลค่าสินค้านับเข้า GDP ของเมืองโดยไม่เปลี่ยนปริมาณ ยกความเป็นอยู่เพิ่มรายได้ของคนในเมืองเป็นสัดส่วนของ GDP ลดค่าขนส่งลดค่าเดินทางของเส้นที่ปลายข้างนั้นมีสาขา ปลายละครึ่งของตัวเลข สาขาที่ค้ากันเองข้ามกรอบของรัฐไม่ต้องผ่านศูนย์ของศักดินา เมืองศูนย์กลางของสังคมนิยม คนกลางของคู่อริ หรือกำแพงภาษี โดยจ่ายค่าธรรมเนียมให้องค์กรร้อยละ ${ecoPc(TU('orgFee'))} มูลค่าองค์กรคือทุนตั้งต้นบวกมูลค่าที่สร้างต่อปี ${TU('orgYears')} ปี ตัวเลขสองตัวหลังแก้ได้ที่แท็บตัวเลข</p>`;
}
const __erOrg = ecoRender;
ecoRender = function () {
  if (ecoTab !== 'orgs' && orgPick) orgPick = null;
  __erOrg();
  box.classList.toggle('orgpick', mode === 'econ' && ecoTab === 'orgs' && !!orgPick);
  if ($('ecocard').hidden || ecoTab !== 'orgs') return;
  if (orgPick && !ECO.orgs.some(o => o.id === orgPick)) orgPick = null;
  $('ecoHead').textContent = 'องค์กร'; $('ecoHint').textContent = 'องค์กรมีสาขาในเมือง และทำงานในเมืองนั้นตามตัวเลขของตัวเอง ผลการค้าคิดใหม่ทุกครั้งที่แก้';
  if (editable) $('ecobody').innerHTML = ecoOrgsHTML();
};
$('ecobody').addEventListener('click', e => {
  const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a;
  if (a === 'gsortc') { const k = b.dataset.k; if (GDPV.k === k) GDPV.d = -GDPV.d; else { GDPV.k = k; GDPV.d = k === 'name' ? 1 : -1; } gdpKeep(); ecoRender(); return; }
  if (!editable || a[0] !== 'o') return;
  const o = b.closest('[data-org]') ? ECO.orgs.find(x => x.id === b.closest('[data-org]').dataset.org) : null;
  if (a === 'onew') { if (ECO.orgs.length >= 60) return; const z = OKIND.guild, id = 'o' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); ECO.orgs.push({ id, name: 'องค์กรที่ ' + (ECO.orgs.length + 1), kind: 'guild', color: SCOLS[(ECO.orgs.length * 3 + 3) % SCOLS.length], cat: '', ...z[1], base: 0, seats: [] }); orgPick = id; }
  else if (a === 'odel' && o) { ECO.orgs = ECO.orgs.filter(x => x !== o); if (orgPick === o.id) orgPick = null; }
  else if (a === 'opick' && o) { orgPick = orgPick === o.id ? null : o.id; ecoRender(); return; }
  else if (a === 'oseat' && o) { o.seats = o.seats.filter(id => id !== b.dataset.c); }
  else return;
  ecoChanged(false); ecoRender();
});
$('ecobody').addEventListener('change', e => {
  const el = e.target, f = el.dataset.f; if (!f) return;
  if (f === 'gsort') { GDPV.k = el.value; gdpKeep(); ecoRender(); return; }
  if (f === 'gdir') { GDPV.d = +el.value > 0 ? 1 : -1; gdpKeep(); ecoRender(); return; }
  const box0 = el.closest('[data-org]'); if (!box0 || !editable) return; const o = ECO.orgs.find(x => x.id === box0.dataset.org); if (!o) return; const num = +el.value;
  if (f === 'oname') o.name = el.value.trim().slice(0, 60) || o.name;
  else if (f === 'ocolor' && HEXC.test(el.value)) o.color = el.value;
  else if (f === 'okind' && OKIND[el.value]) { o.kind = el.value; Object.assign(o, OKIND[el.value][1]); }   // a kind brings the numbers it starts with
  else if (f === 'ocat') o.cat = ECAT[el.value] ? el.value : '';
  else if (f === 'prod' || f === 'val') o[f] = clamp((num || 0) / 100, 0, 2);
  else if (f === 'well') o.well = clamp((num || 0) / 100, 0, 1);
  else if (f === 'haul') o.haul = clamp((num || 0) / 100, 0, 0.9);
  else if (f === 'onet') o.net = el.checked ? 1 : 0;
  else if (f === 'obase') o.base = clamp(num || 0, 0, 1e12);
  else if (f === 'oadd' && el.value && !o.seats.includes(el.value) && o.seats.length < 400) o.seats.push(el.value);
  else return;
  ecoChanged(false);
  if (el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'color') ecoRender();
});
$('ecobody').addEventListener('toggle', e => { const d = e.target; if (d && d.dataset && d.dataset.fold) { GDPV[d.dataset.fold] = d.open ? 1 : 0; gdpKeep(); } }, true);
// a click on a city, with an organisation picked: a house there, or none any more
box.addEventListener('pointerdown', e => {
  if (mode !== 'econ' || ecoTab !== 'orgs' || !orgPick || !editable || e.button !== 0 || spaceDown || e.target !== cv) return;
  const [mx, my] = toMap(e.clientX, e.clientY), c = cityAt(mx, my), o = ECO.orgs.find(x => x.id === orgPick); if (!c || !o) return;
  e.stopPropagation(); e.preventDefault();
  if (o.seats.includes(c.id)) o.seats = o.seats.filter(id => id !== c.id); else if (o.seats.length < 400) o.seats.push(c.id);
  ecoChanged(false); ecoRender();
}, true);
// the houses on the map: a small diamond for each organisation beside its city, in the economy and the trade views
function orgDraw(px) {
  if (!ECO.orgs.length || (mode !== 'econ' && mode !== 'trade')) return;
  const at = new Map(); for (const o of ECO.orgs) for (const id of o.seats) (at.get(id) || at.set(id, []).get(id)).push(o);
  if (!at.size) return; const r = Math.max(3.2, 5 * px);
  ctx.setTransform(dpr * view.s, 0, 0, dpr * view.s, dpr * view.x, dpr * view.y); ctx.globalAlpha = 1; ctx.setLineDash([]);
  for (const c of visibleCities()) {
    const os = at.get(c.id); if (!os) continue;
    os.slice(0, 5).forEach((o, i) => {
      const x = c.x + (i - (Math.min(os.length, 5) - 1) / 2) * r * 2.3, y = c.y + r * 2.6;
      ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath();
      ctx.fillStyle = o.color; ctx.fill(); ctx.lineWidth = Math.max(0.8, 1.4 * px); ctx.strokeStyle = orgPick === o.id ? '#fff' : 'rgba(15,17,20,.85)'; ctx.stroke();
    });
  }
}

// ---- a state's balance of trade: a click inside its borders, in the trade view ----
let tstate = null;
function selectState(id) { tstate = id || null; tsel = null; tlsel = null; renderTradeCard(); requestDraw(); }
function tradeStateHTML(s) {
  const E = ECON, per = ECO.central.per, inS = E.cities.map(c => c.st === s.id), n = inS.filter(Boolean).length;
  const val = f => f.amt * ECAT[f.cat].v * (E.P1[f.to][f.cat] || 1) * per;
  let out = 0, inn = 0, home = 0, slvOut = 0, slvIn = 0; const byP = new Map(), byC = new Map();
  for (const f of E.flows) {
    if (tcat && f.cat !== tcat) continue; const a = inS[f.from], b = inS[f.to]; if (!a && !b) continue; const v = val(f);
    if (f.cat === 'labor' && !tcat) { if (a !== b) { if (a) slvOut += v; else slvIn += v; } continue; }   // people bought and sold stand on their own line
    if (a && b) { home += v; continue; }
    const other = E.cities[a ? f.to : f.from].st, P = byP.get(other) || byP.set(other, [0, 0]).get(other), C = byC.get(f.cat) || byC.set(f.cat, [0, 0]).get(f.cat);
    if (a) { out += v; P[0] += v; C[0] += v; } else { inn += v; P[1] += v; C[1] += v; }
  }
  const net = out - inn, coin = esc(ECO.central.name), loc = s.cur && s.rate ? ` (${ecoNumF(Math.abs(net) / s.rate)} ${esc(s.cur)})` : '';
  const sign = v => (v >= 0 ? '+' : '−') + ecoNumF(Math.abs(v));
  let h = `<h3><i class="sdot" style="background:${s.color}"></i>${esc(s.name)}</h3><div class="tr w">${ESYS[s.sys][0]} · ${n} เมือง${tcat ? ' · เฉพาะ' + esc(ECAT[tcat].name) : ''}</div>`
    + `<div class="tr">ส่งออก <b>${ecoNumF(out)}</b> นำเข้า <b>${ecoNumF(inn)}</b> ${coin}</div>`
    + `<div class="tr">${net >= 0 ? 'เกินดุลสินค้า' : 'ขาดดุลสินค้า'} <b>${ecoNumF(Math.abs(net))}</b> ${coin}${loc}</div><div class="tr w">ค้ากันเองในรัฐ ${ecoNumF(home)} ${coin}</div>`;
  if (!n) return h + `<div class="tr w">ยังไม่มีเมืองในเขตของรัฐนี้ จึงยังไม่มีการค้าให้นับ</div>`;
  const table = (title, m, name) => !m.size ? '' : `<h4>${title}</h4><div class="etable g4"><div class="eth"><span></span><span>ส่งออก</span><span>นำเข้า</span><span>ดุล</span></div>` + [...m].sort((x, y) => (y[1][0] + y[1][1]) - (x[1][0] + x[1][1])).map(([k, v]) => `<div class="etr"><span>${name(k)}</span><span>${ecoNumF(v[0])}</span><span>${ecoNumF(v[1])}</span><span class="${v[0] - v[1] >= 0 ? 'pos' : 'neg'}">${sign(v[0] - v[1])}</span></div>`).join('') + `</div>`;
  h += table('คู่ค้า', byP, k => { const o = ECOX.byKey.get(k); return o ? `<i class="sdot" style="background:${o.color}"></i>${esc(o.name)}` : 'เมืองที่ไม่ขึ้นกับรัฐใด'; });
  h += table('ตามประเภทสินค้า', byC, c => `${chipT(c)}${esc(ECAT[c].name)}`);
  if (slvOut + slvIn >= 1) h += `<div class="tr w">ซื้อขายทาสข้ามเขตรัฐ ขายออก ${ecoNumF(slvOut)} ซื้อเข้า ${ecoNumF(slvIn)} ${coin} ไม่นับในดุลข้างบน</div>`;
  if (!tcat) h += socStateCardHTML(s);
  return h + `<div class="tr w">มูลค่านับตามราคาในเมืองที่ซื้อ หลังการค้าของปี คลิกที่ว่างนอกเขตเพื่อกลับไปดูทั้งเครือข่าย</div>`;
}
const __stSel = selectTrade, __stLink = selectLink;
selectTrade = function (id) { tstate = null; __stSel(id); };
selectLink = function (id) { tstate = null; __stLink(id); };
const __rtOrg = renderTradeCard;
renderTradeCard = function () {
  __rtOrg();
  if (mode !== 'trade' || !ECON) return;
  const s = tstate && !tsel && !tlsel ? ECOX.byKey.get(tstate) : null; if (tstate && !s) tstate = null;
  if (s) $('tradebody').innerHTML = tradeStateHTML(s);
  else if (!tsel && !tlsel && ECO.states.length) $('tradebody').insertAdjacentHTML('beforeend', `<div class="tr w">คลิกในเขตของรัฐบนแผนที่เพื่อดูดุลการค้าของรัฐนั้น</div>`);
};
// ---------- how many people the map holds, and the land its cities use up (v0.10.0) ----------
// The owner picks a level for the whole map. From it follows how many people each city has, and from that how much of the land
// around it has gone under the plough, how much forest is cleared or cut, and whether its mountains are mined. The yardsticks are
// read off our own world's history and are mine:
//   - Ploughland a person: 0.45 hectares while the world holds under half a billion, 0.3 up to five billion, 0.15 beyond. HYDE
//     puts the world's cropland near 293 million hectares in 1700 and 1.5 billion in 2000; over some 600 million and 6.1 billion
//     people (those two counts from memory) that is about 0.49 and 0.25 hectares a head. Tens of billions have not happened yet:
//     0.15 says farming has to go on getting denser for the land to hold them.
//   - A hex counts as farmed when 45 in 100 of it is ploughed, which is about what the most closely farmed country of the old
//     world reached, with the rest in villages, roads, fallow and waste.
//   - Open country goes first. Forest is cleared when the open land of the same distance has run out, as in Europe's great
//     clearances of the years 1000 to 1300.
//   - Wood for fuel and building: two thirds of a person's ploughland again, as forest cut over (from memory: about a cubic metre
//     of firewood a person a year, off coppice that gives three or four a hectare).
//   - Mountains are mined on a scale that shows on a map only by a city of 100,000 or more, one hex and then one more for each
//     further 250,000. Before the age of industry our world had a handful of such cities at any time.
//   - A city of the forest or of the mountains feeds itself otherwise (v0.12.0, the owner's question). Where half or more of the
//     land within two hexes of a city is forest, it keeps the trees and gardens under them: the forest garden of the Maya
//     lowlands and of the home gardens of the wet tropics, which fed dense peoples without open fields (from memory). Where
//     three in ten or more of it is mountain, it terraces the slopes, as in the Andes, Yemen and the Cordillera of Luzon.
//     A hex of forest garden counts as 30 in 100 under crops and a terraced one as 25 in 100, against 45 for open fields, so
//     such a city spreads over more hexes for the same people. The four numbers are mine.
// None of this changes the year's trade: it is the picture of what the people need, and a count of where the land falls short.
const LAND_GARDEN = 0.3, LAND_TERRACE = 0.25, LAND_WOODY = 0.5, LAND_HILLY = 0.3;
const LAND_TILL = 0.45, LAND_REACH = 16, LAND_MINE = 1e5, LAND_OPEN = new Set(['g', 's', 'v', 'h', 'e', 'm', 'c', 'y']), LAND_FARM = new Set(['p', 'r']);
function ecoCrop(total) { return total < 5e8 ? 0.45 : total < 5e9 ? 0.3 : 0.15; }
let LAND = null, landOn = (() => { try { return localStorage.getItem('mme-land') !== '0'; } catch (err) { return true; } })();
// The land is worked out with the year itself (v0.13.0): the year asks it how far each city's fields reach, to work the ground
// that far, and how short of land each city is, to send it abroad for food. So the land on the map is always the land of the
// cities as they stand, and a city that is moved takes its land with it in the same step.
function landCompute() { LAND = ECON && ECON.land ? ECON.land : null; }
const landDice = u => { const x = Math.sin(u * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };   // a hex's own lot, the same every year
function landPlan(cities) {
  const E = { cities };
  const km = ENV.meta && +ENV.meta.kmPerHex || 34, haHex = 0.866 * km * km * 100, total = E.cities.reduce((a, c) => a + c.pop, 0) * ECO.unit, crop = ecoCrop(total), wood = crop * 2 / 3;
  const use = new Int8Array(N), own = new Int16Array(N).fill(-1), rows = E.cities.map(() => ({ farm: 0, cleared: 0, logged: 0, mine: 0, terrace: 0, garden: 0, need: 0, short: 0, want: 0, wantW: 0, wantM: 0, lack: 0, ring: 0, kind: '' })), tot = { farm: 0, cleared: 0, logged: 0, mine: 0, terrace: 0, garden: 0, was: 0 };
  let short = 0;
  for (const k of E.cities.map((c, i) => i).sort((a, b) => E.cities[b].pop - E.cities[a].pop)) {   // the largest city takes its land first
    const c = E.cities[k], r = rows[k], P = c.pop * ECO.unit; r.need = P * crop / 100;             // square kilometres of ploughland
    if (c.h < 0) continue;
    let nF = Math.round(P * crop / (haHex * LAND_TILL)), nW = Math.round(P * wood / (haHex * 0.8)), nM = P >= LAND_MINE ? Math.min(12, 1 + Math.floor((P - LAND_MINE) / 2.5e5)) : 0;
    r.want = nF; r.wantW = nW; r.wantM = nM; if (!nF && !nW && !nM) continue;
    // what kind of country the city stands in, read off the land within two hexes of it
    let nl = 0, nf = 0, nm = 0; { let rg = [c.h]; const sn = new Set(rg); for (let d = 0; d <= 2; d++) { const nx = []; for (const u of rg) { const b = eff(u); if (!isW(b)) { nl++; if (FOREST.has(b)) nf++; else if (b === 'M') nm++; } for (let j = 0; j < 6; j++) { const v = NB[u * 6 + j]; if (v >= 0 && !sn.has(v)) { sn.add(v); nx.push(v); } } } rg = nx; } }
    // How much of a forest city it is decides what share of its forest it gardens, hex by hex, and likewise its slopes: a city
    // moved a hex or two changes a few hexes of its land, where a plain yes or no changed all of it at once (the owner saw the
    // fields vanish when a city was moved).
    const wf = nl > 0 ? nf / nl : 0, wm = nl > 0 ? nm / nl : 0, woodP = clamp((wf - (LAND_WOODY - 0.2)) / 0.4, 0, 1), hillP = clamp((wm - (LAND_HILLY - 0.15)) / 0.3, 0, 1), gG = LAND_GARDEN / LAND_TILL, gT = LAND_TERRACE / LAND_TILL;
    const woody = wf >= LAND_WOODY, hilly = wm >= LAND_HILLY;
    r.kind = woody && hilly ? 'both' : woody ? 'forest' : hilly ? 'mount' : '';
    let ring = [c.h]; const seen = new Set(ring);
    for (let d = 0; d <= LAND_REACH && (nF >= 0.5 || nW > 0 || nM > 0) && ring.length; d++) {
      const trees = [], hills = [], d0 = r.farm + r.cleared + r.logged + r.mine + r.terrace + r.garden + tot.was;
      for (const u of ring) {
        if (use[u]) continue; const b = eff(u);
        if (LAND_FARM.has(b)) { if (nF >= 0.5) { use[u] = 5; own[u] = k; nF--; tot.was++; } }                  // fields the map already shows
        else if (LAND_OPEN.has(b)) { if (nF >= 0.5) { use[u] = 1; own[u] = k; nF--; r.farm++; } }
        else if (FOREST.has(b)) trees.push(u);
        else if (b === 'M') { if (nM > 0 && d > 0) { use[u] = 4; own[u] = k; nM--; r.mine++; } else if (hillP > 0 && landDice(u) < hillP) hills.push(u); }
      }
      for (const u of hills) if (nF >= 0.5 * gT) { use[u] = 6; own[u] = k; nF -= gT; r.terrace++; }                   // a city of the mountains terraces the slopes
      for (const u of trees) {
        const gd = woodP > 0 && landDice(u) < woodP;
        if (gd && nF >= 0.5 * gG) { use[u] = 7; own[u] = k; nF -= gG; r.garden++; }                                   // a city of the forest gardens under the trees
        else if (!gd && nF >= 0.5) { use[u] = 2; own[u] = k; nF--; r.cleared++; }
        else if (nW > 0) { use[u] = 3; own[u] = k; nW--; r.logged++; }
      }
      if (r.farm + r.cleared + r.logged + r.mine + r.terrace + r.garden + tot.was > d0) r.ring = d;
      const nx = []; for (const u of ring) for (let j = 0; j < 6; j++) { const v = NB[u * 6 + j]; if (v >= 0 && !seen.has(v)) { seen.add(v); nx.push(v); } } ring = nx;
    }
    r.short = Math.max(0, Math.round(nF)); r.lack = r.want > 0 ? clamp(Math.max(0, nF) / r.want, 0, 1) : 0; short += r.short; tot.farm += r.farm; tot.cleared += r.cleared; tot.logged += r.logged; tot.mine += r.mine; tot.terrace += r.terrace; tot.garden += r.garden;
  }
  let landN = 0; for (let i = 0; i < N; i++) { const b = eff(i); if (b !== 'S' && b !== 'L') landN++; }
  return { ver: 0, unit: ECO.unit, use, own, rows, tot, total, crop, haHex, short, landN, km2: landN * haHex / 100 };
}
// ---------- what the land a city works brings in (v0.14.2) ----------
// The owner set his capital at a million heads and found it starving beside the ten hexes of ploughland laid out for it: the year
// counted the natural yield of the hinterland, sized for an ordinary city, and never what the fields, the felled woods and the
// mines laid out for the city's own people brought in. Now they feed the share of the city they were laid out for: the fields its
// grain and part of its meat, at the yield the climate allows; the felled woods its timber and firewood; the mines its stone and
// ore. Where the hinterland's own yield is the larger, that stands. A city short of land keeps the gap, and buys or goes without.
const LAND_FEED = { grain: 1, protein: 0.6 }, LAND_FELL = ['timber', 'fuel'], LAND_DIG = ['stone', 'ore'];
const landClimY = c => clamp(c.cm ? c.cm.hs : 1, 0.15, 1.15) * clamp(c.cm && c.cm.grain > 0 ? c.cm.grain : 1, 0.3, 1);
function landGood(cat) { for (const g of EGOODS) if (g.cat === cat && !g.off) return g; return null; }
function landYield(cities, prod, need, LP) {
  if (!LP || !LP.rows) return;
  cities.forEach((c, k) => {
    const r = LP.rows[k]; if (!r) return;
    const lift = (cat, q) => {
      if (!(q > 0.004) || !ECAT[cat]) return; let t = 0; for (const g of EGOODS) if (g.cat === cat && prod[k].has(g.id)) t += prod[k].get(g.id);
      if (t >= q) return;
      if (t > 0) { const f = q / t; for (const g of EGOODS) if (g.cat === cat && prod[k].has(g.id)) prod[k].set(g.id, prod[k].get(g.id) * f); }
      else { const g = landGood(cat); if (g) prod[k].set(g.id, q); }
    };
    if (r.want >= 1) { const fed = clamp(1 - r.lack, 0, 1) * landClimY(c); for (const cat in LAND_FEED) lift(cat, need[k][cat] * fed * LAND_FEED[cat]); }
    if (r.wantW >= 1) { const w = Math.min(1, r.logged / r.wantW); for (const cat of LAND_FELL) lift(cat, need[k][cat] * w); }
    if (r.wantM >= 1) { const m = Math.min(1, r.mine / r.wantM); for (const cat of LAND_DIG) lift(cat, need[k][cat] * m); }
    r.yield = landClimY(c);
  });
}
// ---------- the land as ground of its own (v0.12.0) ----------
// The owner asked for fields, clearings and mines to look better and to lie low, as hexes of ground in their own right like the
// colonies' plantations. So they are painted the way the map's own ground is painted, on a sheet that lies straight on the map
// and its repainted hexes, under the roads, the trade lines, the borders and the names. Each hex of the cities' land is drawn
// anew; the hexes around it are drawn again as they are, inside a rim, so that the tops of felled trees do not stay behind;
// rivers, shores, mountains and the map's own marks are laid back over. The sheet is painted once for a year, not on a frame.
const LAND_NAME = { 1: 'ไร่นาของเมือง', 2: 'ไร่นาบนป่าที่ถาง', 3: 'ป่าที่ถูกตัดไม้', 4: 'เหมืองในภูเขา', 6: 'นาขั้นบันได', 7: 'สวนป่า' };
const landIs = t => (t >= 1 && t <= 4) || t === 6 || t === 7;
const LAND_SW = { 1: 'rgb(196,182,104)', 2: 'rgb(172,164,96)', 3: 'rgb(116,128,88)', 4: 'rgb(132,122,110)', 6: 'rgb(170,176,108)', 7: 'rgb(98,134,84)' };   // the swatches of the tab
const LAND_CROP = ['rgba(214,190,92,.5)', 'rgba(148,168,88,.5)', 'rgba(168,136,92,.46)', 'rgba(190,198,112,.46)', 'rgba(204,170,84,.5)'];   // ripe grain, green crop, ploughed earth, young crop, stubble
const LAND_TREEY = new Set(['f', 'o', 'k', 'a', 'j', 'w', 'e', 'h', 'v']);
const landMix = (a, b, t) => a.map((x, k) => x + (b[k] - x) * t);
function landFill(i, t, b) {
  const base = RCOL[b] || RCOL.g;
  return jit(t === 1 ? landMix([192, 180, 106], base, 0.3) : t === 2 ? landMix([174, 168, 100], base, 0.35) : t === 3 ? landMix(base, [160, 150, 106], 0.42) : t === 6 ? landMix(RCOL.M, [150, 150, 104], 0.4) : t === 7 ? landMix(base, [172, 180, 108], 0.6) : landMix(RCOL.M, [134, 118, 98], 0.45), i, 6);
}
function landTreesOf(i, b) {                         // the trees a hex of forest carries, where the map's own drawing puts them
  return b === 'f' || b === 'k' || b === 'w' ? spots(i, 4, 0.6, 0).map(p => ['con', p]) : b === 'o' ? spots(i, 3, 0.58, 0).map(p => ['broad', p]) : b === 'a' ? spots(i, 3, 0.55, 0).map(p => ['anc', p]) : b === 'j' ? spots(i, 4, 0.62, 17).map(p => ['jung', p]) : [];
}
// A hex of fields is worked out as shapes and laid down with every other hex's at once: the parcels of one crop in one fill, all
// the furrows in one stroke. Cutting each hex out with the canvas's own clip was right and slow (a second for a few thousand).
const landCut = (pts, px, py, nx, ny, sd) => {       // the part of a convex shape on one side of a line
  const out = [], side = q => ((q[0] - px) * nx + (q[1] - py) * ny) * sd;
  for (let k = 0; k < pts.length; k++) { const a = pts[k], b = pts[(k + 1) % pts.length], da = side(a), db = side(b); if (da >= 0) out.push(a); if ((da < 0) !== (db < 0)) { const u = da / (da - db); out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]); } }
  return out;
};
const landSpan = (pts, ox, oy, fx, fy) => {          // the stretch of a line that lies inside a convex shape
  let t0 = -Infinity, t1 = Infinity;
  for (let k = 0; k < pts.length; k++) { const a = pts[k], b = pts[(k + 1) % pts.length], ex = b[0] - a[0], ey = b[1] - a[1], den = ex * fy - ey * fx, num = ex * (oy - a[1]) - ey * (ox - a[0]); if (Math.abs(den) < 1e-9) { if (num * LAND_TURN < 0) return null; continue; } const t = -num / den; if (den * LAND_TURN > 0) t0 = Math.max(t0, t); else t1 = Math.min(t1, t); }
  return t1 - t0 > 0.4 ? [t0, t1] : null;
};
const LAND_TURN = (() => { const h = [0, 1, 2].map(a => [COS[a], SIN[a]]); return Math.sign((h[1][0] - h[0][0]) * (h[2][1] - h[1][1]) - (h[1][1] - h[0][1]) * (h[2][0] - h[1][0])) || 1; })();   // which way round a hex's corners go
function landField(c, i, t, b, trees, flat, G2) {    // two parcels with their furrows, a hedge between, now and then a farmstead
  const x0 = CX[i], y0 = CY[i], r = rng(i * 17 + 41), o = Math.floor(r() * 3), a = o * Math.PI / 3, d = (r() - 0.5) * 0.7 * R;
  const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux, px = x0 + nx * d, py = y0 + ny * d, c1 = Math.floor(r() * LAND_CROP.length), c2 = (c1 + 1 + Math.floor(r() * (LAND_CROP.length - 1))) % LAND_CROP.length;
  const hex = []; for (let q = 0; q < 6; q++) hex.push([x0 + R * 0.985 * COS[q], y0 + R * 0.985 * SIN[q]]);
  [[1, c1, a], [-1, c2, a + Math.PI / 3]].forEach(([sd, ci, fa]) => {
    const pg = landCut(hex, px, py, nx, ny, sd); if (pg.length < 3) return; G2.crop[ci].push(pg);
    const fx = Math.cos(fa), fy = Math.sin(fa), gx = -fy, gy = fx;
    for (let k = -5; k <= 5; k++) { const ox = x0 + gx * (k + 0.5) * 0.24 * R, oy = y0 + gy * (k + 0.5) * 0.24 * R, sp = landSpan(pg, ox, oy, fx, fy); if (sp) G2.furrow.push([ox + fx * sp[0], oy + fy * sp[0], ox + fx * sp[1], oy + fy * sp[1]]); }
  });
  const hs = landSpan(hex, px, py, ux, uy); if (hs) (t === 2 ? G2.hedge2 : G2.hedge).push([px + ux * hs[0], py + uy * hs[0], px + ux * hs[1], py + uy * hs[1]]);
  if (r() < 0.16) flat.push([y0 + ny * d * 0.4, 'house', x0 - nx * d * 0.6 + (r() - 0.5) * 0.5 * R, y0 - ny * d * 0.6 + (r() - 0.5) * 0.4 * R]);
  if (t !== 2) return;
  const was = landTreesOf(i, b);                     // a clearing: stumps where the trees stood, and one or two left standing at the edge
  was.forEach(([kind, [x, y]], k) => { if (k === 0 && r() < 0.7) trees.push([y, kind, x, y, b]); else if (k < 3) flat.push([y, 'stump', x, y]); });
}
function landLogged(c, i, b, trees, flat) {          // cut over: half the trees stand, the rest are stumps, with a stack of logs
  const was = landTreesOf(i, b), keep = Math.max(1, Math.floor(was.length / 2));
  was.forEach(([kind, [x, y]], k) => { if (k < keep) trees.push([y, kind, x, y, b]); else flat.push([y, 'stump', x, y]); });
  const r = rng(i * 29 + 3); if (r() < 0.5) flat.push([CY[i] + 0.3 * R, 'logs', CX[i] + (r() - 0.5) * 0.6 * R, CY[i] + 0.3 * R]);
}
function landMine(c, i) {                            // at the mountain's foot: a dark mouth in a timber frame, the spoil beside it, a track down
  const x = CX[i] + (vnoise(CX[i], CY[i], 7, 1) - 0.5) * 2 - 0.6, y = CY[i] + 3.1;
  ell(c, x - 3.6, y + 0.5, 2.9, 1.25, 'rgb(104,96,88)', 'rgb(52,44,40)'); ell(c, x - 4, y + 0.05, 1.7, 0.65, 'rgb(168,160,148)');
  c.beginPath(); c.moveTo(x - 0.5, y + 1); c.lineTo(x - 0.5, y - 1.5); c.quadraticCurveTo(x + 1.3, y - 3.4, x + 3.1, y - 1.5); c.lineTo(x + 3.1, y + 1); c.closePath();
  c.fillStyle = 'rgb(22,18,16)'; c.fill(); c.strokeStyle = 'rgb(198,156,92)'; c.lineWidth = 0.7; c.lineJoin = 'round'; c.stroke();
  seg(c, x + 0.7, y + 1, x - 0.4, y + 3.1, 'rgba(48,40,34,.9)', 0.5); seg(c, x + 1.9, y + 1, x + 1.1, y + 3.1, 'rgba(48,40,34,.9)', 0.5);
  for (const k of [0.35, 0.75]) seg(c, x + 0.7 - 1.1 * k - 0.15, y + 1 + 2.1 * k, x + 1.9 - 0.8 * k + 0.15, y + 1 + 2.1 * k, 'rgba(48,40,34,.9)', 0.4);
}
const LAND_STEP = ['rgb(176,190,104)', 'rgb(210,192,108)', 'rgb(152,176,98)', 'rgb(198,186,102)'];
function landTerrace(c, i) {                         // a slope cut into steps: each a level field behind its wall, a bare summit above
  const x = CX[i] + (vnoise(CX[i], CY[i], 7, 1) - 0.5) * 2, y = CY[i], r = rng(i * 23 + 9), k0 = Math.floor(r() * LAND_STEP.length);
  [[4.0, 6.9, 2.1], [1.5, 5.4, 1.75], [-0.9, 3.9, 1.4], [-3.0, 2.5, 1.05]].forEach(([dy, w, d], k) => {
    ell(c, x, y + dy + 1.0, w, d, 'rgb(122,102,78)', 'rgb(54,44,36)');
    ell(c, x, y + dy, w, d, LAND_STEP[(k0 + k) % LAND_STEP.length], 'rgb(66,56,42)');
    c.beginPath(); c.ellipse(x, y + dy, w * 0.72, d * 0.6, 0, 0.15 * Math.PI, 0.85 * Math.PI); c.strokeStyle = 'rgba(86,96,46,.5)'; c.lineWidth = 1 / 3; c.stroke();
  });
  peak(c, x, y - 4.9, 0.4, false);
}
function landGarden(c, i, b, trees, flat) {          // the forest thinned to a grove: two of its trees, three plots of garden between them, a path, often a house
  const was = landTreesOf(i, b), r = rng(i * 37 + 5);
  was.forEach(([kind, [x, y]], k) => { if (k < 2) trees.push([y, kind, x, y, b]); });
  for (const [x, y] of spots(i, 3, 0.56, 37)) flat.push([y, 'plot', x, y, Math.floor(r() * LAND_STEP.length)]);
  flat.push([CY[i] - 0.5 * R, 'path', CX[i] - 0.55 * R, CY[i] + 0.1 * R, CX[i] + 0.5 * R, CY[i] - 0.15 * R]);
  if (r() < 0.45) flat.push([CY[i] + 0.2 * R, 'house', CX[i] + (r() - 0.5) * 0.7 * R, CY[i] + 0.2 * R]);
}
let landMk = null, landCv = null, LLC = null, landKey = '', landAny = false, landMs = 0;
function landPaint() {
  const L = LAND; if (!landCv) { landCv = document.createElement('canvas'); landCv.width = layer.width; landCv.height = layer.height; LLC = landCv.getContext('2d'); }
  const c = LLC, use = L.use, inA = i => landIs(use[i]);
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; c.setLineDash([]); c.clearRect(0, 0, landCv.width, landCv.height); landAny = false;
  const A = []; for (let i = 0; i < N; i++) if (inA(i) && !isW(eff(i))) A.push(i);
  if (!A.length) return; landAny = true;
  const Bs = new Set(), Ws = new Set();              // the land hexes around them, and the water that must stay as the map has it
  for (const u of A) for (let k = 0; k < 6; k++) { const v = NB[u * 6 + k]; if (v < 0 || inA(v)) continue; if (isW(eff(v))) Ws.add(v); else Bs.add(v); }
  for (const u of Bs) for (let k = 0; k < 6; k++) { const v = NB[u * 6 + k]; if (v >= 0 && isW(eff(v))) Ws.add(v); }
  const B = [...Bs], all = new Set(A); for (const v of B) all.add(v);
  c.setTransform(LS, 0, 0, LS, 0, 0);               // everything is laid down freely and trimmed to the land and its rim at the end: one trim, where a clip would slow every stroke
  for (const v of B) { c.beginPath(); hexPath(c, v, 1.03); c.fillStyle = fillOf(v, eff(v)); c.fill(); }
  for (const u of A) { c.beginPath(); hexPath(c, u, 1.03); c.fillStyle = landFill(u, use[u], eff(u)); c.fill(); }
  if (hazeCv) c.drawImage(hazeCv, 0, 0, G.w, G.h);
  const trees = [], flat = [], G2 = { crop: LAND_CROP.map(() => []), furrow: [], hedge: [], hedge2: [] };
  for (const v of B) ground(c, v, eff(v), trees);
  for (const u of A) { const t = use[u], b = eff(u); if (t === 1 || t === 2) landField(c, u, t, b, trees, flat, G2); else if (t === 3) landLogged(c, u, b, trees, flat); else if (t === 7) landGarden(c, u, b, trees, flat); }
  G2.crop.forEach((list, ci) => { c.fillStyle = LAND_CROP[ci]; for (let a = 0; a < list.length; a += 200) { c.beginPath(); for (let q = a; q < Math.min(list.length, a + 200); q++) { const pg = list[q]; c.moveTo(pg[0][0], pg[0][1]); for (let k = 1; k < pg.length; k++) c.lineTo(pg[k][0], pg[k][1]); c.closePath(); } c.fill(); } });
  const lines = (list, col, w) => { if (!list.length) return; c.lineCap = 'butt'; c.strokeStyle = col; c.lineWidth = w; for (let a = 0; a < list.length; a += 4000) { c.beginPath(); for (let k = a; k < Math.min(list.length, a + 4000); k++) { const q = list[k]; c.moveTo(q[0], q[1]); c.lineTo(q[2], q[3]); } c.stroke(); } };
  lines(G2.furrow, 'rgba(92,78,40,.36)', 1 / 3); lines(G2.hedge, 'rgba(86,104,58,.7)', 0.55); lines(G2.hedge2, 'rgba(70,92,52,.8)', 0.55);
  for (const r of BRIV) for (const u of riverRuns(r)) strokeRiver(c, u.q, r.w, r.s, u.a, u.b);
  for (const r of userRiversSorted()) { const d = RDER.get(r.id); if (d) strokeRiver(c, d.q, d.w, d.s); }
  // the small things on the ground, each kind laid down in one go: stumps, stacks of logs, garden plots, farmsteads
  const fl = flat.filter(f => clearOfWater('broad', f[2], f[3])), of = k => fl.filter(f => f[1] === k), ells = (list, dy, rx, ry, fill, line) => { if (!list.length) return; c.beginPath(); for (const f of list) { c.moveTo(f[2] + rx, f[3] + dy); c.ellipse(f[2], f[3] + dy, rx, ry, 0, 0, 2 * Math.PI); } c.fillStyle = fill; c.fill(); if (line) { c.strokeStyle = line; c.lineWidth = 1 / 3; c.stroke(); } };
  const shapes = (list, ptsOf, fill, line) => { if (!list.length) return; c.beginPath(); for (const f of list) { const q = ptsOf(f[2], f[3]); c.moveTo(q[0][0], q[0][1]); for (let k = 1; k < q.length; k++) c.lineTo(q[k][0], q[k][1]); c.closePath(); } c.fillStyle = fill; c.fill(); if (line) { c.strokeStyle = line; c.lineWidth = 1 / 3; c.stroke(); } };
  const sm = of('stump'); ells(sm, 0.25, 0.75, 0.5, 'rgb(104,80,54)'); ells(sm, 0, 0.62, 0.38, 'rgb(196,170,124)', 'rgb(104,80,54)');
  const lg = of('logs'); lines(lg.map(f => [f[2] - 1.5, f[3], f[2] + 1.5, f[3]]), 'rgb(120,92,60)', 0.7); lines(lg.map(f => [f[2] - 1.2, f[3] - 0.7, f[2] + 1.2, f[3] - 0.7]), 'rgb(142,112,74)', 0.7);
  lines(of('path').map(f => [f[2], f[3], f[4], f[5]]), 'rgba(196,176,128,.85)', 0.6);
  const pl = of('plot'); LAND_STEP.forEach((col, k) => shapes(pl.filter(f => f[4] === k), (x, y) => [[x - 2.6, y - 1.1], [x + 2.2, y - 1.5], [x + 2.6, y + 1.1], [x - 2.2, y + 1.5]], col, 'rgb(62,74,44)'));
  lines(pl.map(f => [f[2] - 2.3, f[3] - 0.3, f[2] + 2.3, f[3] - 0.7]).concat(pl.map(f => [f[2] - 2.2, f[3] + 0.6, f[2] + 2.4, f[3] + 0.2])), 'rgba(84,96,46,.6)', 1 / 3);
  const hs = of('house'); shapes(hs, (x, y) => [[x - 1, y - 0.5], [x + 1, y - 0.5], [x + 1, y + 0.7], [x - 1, y + 0.7]], 'rgb(228,214,184)', 'rgb(66,54,44)'); shapes(hs, (x, y) => [[x - 1.35, y - 0.45], [x, y - 1.7], [x + 1.35, y - 0.45]], 'rgb(162,88,62)', 'rgb(66,54,44)');
  trees.sort((a, b) => a[0] - b[0]);
  for (const t of trees) if (clearOfWater(t[1], t[2], t[3])) TREE[t[1]](c, t[2], t[3], t[4]);
  const mts = [...A.filter(u => use[u] === 4 || use[u] === 6), ...B.filter(v => eff(v) === 'M')].sort((a, b) => CY[a] - CY[b]);
  for (const i of mts) { if (use[i] === 6) { landTerrace(c, i); continue; } drawPeak(c, i); if (use[i] === 4) landMine(c, i); }
  const st = stPeak(); if (st >= 0 && [...all].some(i => Math.hypot(CX[i] - CX[st], CY[i] - CY[st]) < 34)) drawStanther(c);
  for (const p of PTS) { if (p.h < 0 || !all.has(p.h) || isW(eff(p.h)) || ED.phid.has(p.id) || !bakedOk(p, ED.points.get(p.id))) continue; POINTFN[p.k](c, p.x, p.y); }
  c.lineWidth = 1 / 3; c.strokeStyle = 'rgba(40,34,26,.16)'; const ids = [...all]; for (let a = 0; a < ids.length; a += 300) { c.beginPath(); for (let b = a; b < Math.min(ids.length, a + 300); b++) hexPath(c, ids[b], 1); c.stroke(); }
  // the trim: the land and its rim drawn on a small sheet a few hundred hexes at a time, then laid over the whole in one pass
  if (!landMk) { landMk = document.createElement('canvas'); landMk.width = Math.ceil(landCv.width / 2); landMk.height = Math.ceil(landCv.height / 2); }
  const m = landMk.getContext('2d'); m.setTransform(1, 0, 0, 1, 0, 0); m.clearRect(0, 0, landMk.width, landMk.height); m.setTransform(LS / 2, 0, 0, LS / 2, 0, 0); m.fillStyle = '#000';
  for (let a = 0; a < A.length; a += 250) { m.beginPath(); for (let k = a; k < Math.min(A.length, a + 250); k++) { const u = A[k]; hexPath(m, u, LAND_TREEY.has(eff(u)) || use[u] === 6 ? 1.36 : 1.03); } m.fill(); }
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'destination-in'; c.imageSmoothingEnabled = true; c.drawImage(landMk, 0, 0, landCv.width, landCv.height); c.globalCompositeOperation = 'source-over'; c.setTransform(LS, 0, 0, LS, 0, 0);
  if (Ws.size) { c.globalCompositeOperation = 'destination-out'; c.beginPath(); for (const v of Ws) hexPath(c, v, 1); c.fillStyle = '#000'; c.fill(); c.globalCompositeOperation = 'source-over'; }
  for (const i of all) for (let j = 0; j < 6; j++) {   // the shores, as the map draws them, where this land meets water
    const v = NB[i * 6 + j]; if (v < 0 || !isW(eff(v))) continue;
    const e = EDGE[[0, 1, 2, 3, 4, 5].find(q => NB[v * 6 + q] === i)], b = (e + 1) % 6, sea = isSea(eff(v));
    seg(c, CX[v] + R * COS[e], CY[v] + R * SIN[e], CX[v] + R * COS[b], CY[v] + R * SIN[b], sea ? 'rgba(36,50,60,.9)' : 'rgba(44,72,92,.86)', sea ? 4 / 3 : 1);
  }
}
function landSheet() {                               // the sheet as the year now stands; null while there is nothing to lay down
  if (!landOn || !ECON || mode === 'terrain' || mode === 'river') return null;   // while the ground or its rivers are being drawn, the ground shows as it is
  landCompute(); const L = LAND; if (!L || !(L.tot.farm + L.tot.cleared + L.tot.logged + L.tot.mine + L.tot.terrace + L.tot.garden)) return null;
  const key = L.ver + '|' + L.unit + '|' + painted.size + '|' + ED.rivers.length;
  if (key !== landKey) { landKey = key; const t0 = performance.now(); try { landPaint(); } catch (err) { console.error('land sheet', err); } landMs = performance.now() - t0; }   // a sheet that fails to paint leaves the last one lying
  return landAny ? landCv : null;
}
drawOverGround = function (c, w, h) { const cvs = landSheet(); if (cvs) c.drawImage(cvs, 0, 0, w, h); };
{ const under = drawUnderNames; drawUnderNames = function () { tierSync(); if (under) under(); }; }
function landTipHTML(id) {                           // the hover card's line for a hex of the cities' land
  const L = LAND; if (!landOn || !L || !ECON || L.ver !== ECON.ver || mode === 'terrain' || mode === 'river') return '';
  const t = L.use[id]; if (!landIs(t)) return ''; const c = ECON.cities[L.own[id]];
  return `<div class="s">${LAND_NAME[t]}${c ? ' ของ' + esc(c.name) : ''}</div>`;
}
{ const b = $('landBtn'); if (b) { b.setAttribute('aria-pressed', landOn ? 'true' : 'false'); b.onclick = () => { landOn = !landOn; b.setAttribute('aria-pressed', landOn ? 'true' : 'false'); try { localStorage.setItem('mme-land', landOn ? '1' : '0'); } catch (err) { /* this view keeps nothing */ } requestDraw(); }; } }

// the level, set on the map itself (the owner asked for it there): a small list beside the chips, kept in step with the document.
// Three levels and a number of one's own (v0.11.1); the number is written in the box beside the list, as a person writes it.
const tierSel = $('tierSel'), tierNum = $('tierNum');
function ecoPeople(s) {                               // 250,000,000 · 250 ล้าน · 2.5 พันล้าน · 3 แสน · 2.5e8
  s = String(s == null ? '' : s).replace(/[,\s_]/g, '').replace(/คน$/, '').toLowerCase();
  const m = /^(\d+(?:\.\d+)?(?:e\d{1,2})?)(ล้านล้าน|หมื่นล้าน|พันล้าน|ร้อยล้าน|สิบล้าน|ล้าน|แสน|หมื่น|พัน|ร้อย|k|m|b)?$/.exec(s); if (!m) return NaN;
  const u = { 'ล้านล้าน': 1e12, 'หมื่นล้าน': 1e10, 'พันล้าน': 1e9, 'ร้อยล้าน': 1e8, 'สิบล้าน': 1e7, 'ล้าน': 1e6, 'แสน': 1e5, 'หมื่น': 1e4, 'พัน': 1e3, 'ร้อย': 100, k: 1e3, m: 1e6, b: 1e9 };
  return Math.round(+m[1] * (m[2] ? u[m[2]] : 1));
}
const tierNow = () => ECO.tier === 'own' ? ECO.total : ECON ? ECON.cities.reduce((a, c) => a + c.pop, 0) * ECO.unit : 0;   // with no level named, what the heads come to
function tierSet(k, total) {
  if (tierOk(k)) { ECO.tier = k; ECO.total = ETIER[k][1]; }
  else { ECO.tier = 'own'; ECO.total = clamp(Math.round(total > 0 ? total : tierNow() || 3e6), 100, 1e12); }
  ecoChanged(true); ecoRender();
}
const tierOpts = sel => Object.entries(ETIER).map(([k, z]) => `<option value="${k}"${sel === k ? ' selected' : ''}>${z[0]} · ${z[2]}</option>`).join('') + `<option value="own"${tierOk(sel) ? '' : ' selected'}>กำหนดเอง</option>`;
function tierSync() {
  if (!tierSel) return; const own = !tierOk(ECO.tier), n = Math.round(tierNow()), sig = ECO.tier + '|' + (editable ? 1 : 0) + '|' + (own ? n : 0);
  if (tierSel.dataset.sig === sig) return; tierSel.dataset.sig = sig;
  tierSel.innerHTML = tierOpts(ECO.tier); tierSel.value = own ? 'own' : ECO.tier; tierSel.disabled = !editable;
  tierSel.parentNode.classList.toggle('own', own);
  if (tierNum) { tierNum.hidden = !own; tierNum.disabled = !editable; tierNum.classList.remove('bad'); if (document.activeElement !== tierNum) tierNum.value = n > 0 ? n.toLocaleString('en-US') : ''; }
}
function tierTyped(el) {                              // a number written by hand; one that cannot be read is refused and the old one comes back
  const v = ecoPeople(el.value); if (!(v >= 100) || !(v <= 1e12)) { el.classList.add('bad'); el.title = 'อ่านจำนวนนี้ไม่ออก เขียนได้ตั้งแต่ 100 ถึง 1 ล้านล้านคน เช่น 250,000,000 หรือ 250 ล้าน'; return false; }
  el.classList.remove('bad'); tierSet('own', v); return true;
}
if (tierSel) tierSel.addEventListener('change', () => {
  if (!editable) { tierSel.dataset.sig = ''; tierSync(); return; }
  tierSet(tierSel.value); if (tierSel.value === 'own' && tierNum) { tierSel.dataset.sig = ''; tierSync(); tierNum.focus(); tierNum.select(); }
});
if (tierNum) {
  tierNum.addEventListener('change', () => { if (!editable) return; if (tierTyped(tierNum)) { tierSel.dataset.sig = ''; tierSync(); } });
  tierNum.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); tierNum.blur(); } else if (e.key === 'Escape') { tierNum.value = ''; tierSel.dataset.sig = ''; tierNum.blur(); tierSync(); } });
  tierNum.addEventListener('blur', () => { if (tierNum.classList.contains('bad')) { tierSel.dataset.sig = ''; tierSync(); } });
  tierNum.addEventListener('focus', () => tierNum.select());
}
// the head of the GDP tab: the level, what follows from it, and what the land says
function landHeadHTML() {
  landCompute(); const L = LAND, own = ECO.tier === 'own';
  const tn = Math.round(tierNow());
  let h = `<div class="erow"><label>ประชากรรวมในแผนที่ <select data-f="tier"${editable ? '' : ' disabled'}>${tierOpts(ECO.tier)}</select></label>${tierOk(ECO.tier) ? '' : `<label>จำนวน <input type="text" inputmode="numeric" data-f="total" value="${tn > 0 ? tn.toLocaleString('en-US') : ''}" style="width:10em" title="เขียนได้เช่น 250,000,000 หรือ 250 ล้าน หรือ 2.5 พันล้าน"${editable ? '' : ' disabled'}> คน</label>`}</div>`;
  if (!tierOk(ECO.tier)) h += `<p class="note">${own ? 'จำนวนนี้คุณเขียนเอง' : 'จำนวนนี้นับจากจำนวนคนต่อหน่วยที่ตั้งไว้'} เขียนใหม่ได้เป็นตัวเลขเต็มหรือย่อ เช่น 250,000,000 หรือ 250 ล้าน หรือ 2.5 พันล้าน</p>`;
  if (!L) return h;
  const dens = L.km2 > 0 ? L.total / L.km2 : 0, used = L.tot.farm + L.tot.cleared + L.tot.was + L.tot.terrace + L.tot.garden, sw = t => `<i class="lsw" style="background:${LAND_SW[t]}"></i>`;
  h += `<p class="note">ทั้งแผนที่มี <b>${ecoNumF(L.total)}</b> คน หนาแน่น ${dens >= 10 ? Math.round(dens).toLocaleString('en-US') : dens.toFixed(2)} คนต่อตารางกิโลเมตรของแผ่นดิน หนึ่งหน่วยประชากรคือ ${ecoNumF(ECO.unit)} คน คนหนึ่งคนใช้ไร่นา ${L.crop} เฮกตาร์ หนึ่งช่องเลี้ยงคนได้ราว ${ecoNumF(L.haHex * LAND_TILL / L.crop)} คนเมื่อไถเต็มที่</p>`;
  h += `<div class="tr">${sw(1)}ไร่บนที่โล่ง <b>${L.tot.farm}</b> ช่อง ${sw(2)}ไร่บนป่าที่ถาง <b>${L.tot.cleared}</b> ช่อง ${sw(3)}ป่าที่ตัดไม้ <b>${L.tot.logged}</b> ช่อง ${sw(4)}เหมืองในภูเขา <b>${L.tot.mine}</b> ช่อง</div>`;
  if (L.tot.garden + L.tot.terrace) h += `<div class="tr">${sw(7)}สวนป่าของเมืองป่า <b>${L.tot.garden}</b> ช่อง ${sw(6)}นาขั้นบันไดของเมืองภูเขา <b>${L.tot.terrace}</b> ช่อง</div>`;
  h += `<div class="tr w">ที่เพาะปลูกกินแผ่นดินร้อยละ ${(100 * used / Math.max(1, L.landN)).toFixed(1)} ${L.short ? `<em>ที่ดินรอบเมืองไม่พอ ขาดไร่อีก ${L.short} ช่อง เมืองเหล่านั้นต้องพึ่งอาหารจากที่อื่น</em>` : used ? 'ที่ดินรอบเมืองพอเลี้ยงคนทุกเมือง' : 'ประชากรระดับนี้ยังใช้ที่ดินไม่ถึงครึ่งช่องต่อเมือง แผนที่จึงยังไม่เปลี่ยน'}</div>`;
  const rows = L.rows.map((r, k) => ({ r, c: ECON.cities[k] })).filter(x => x.r.farm + x.r.cleared + x.r.logged + x.r.mine + x.r.terrace + x.r.garden + x.r.short > 0).sort((a, b) => (b.r.farm + b.r.cleared + b.r.terrace + b.r.garden) - (a.r.farm + a.r.cleared + a.r.terrace + a.r.garden));
  if (rows.length) h += `<details class="efold" data-fold="gld"${GDPV.gld === 1 ? ' open' : ''}><summary>ที่ดินที่เมืองใช้ <small>${rows.length} แถว</small></summary><div class="etable g5 g7"><div class="eth"><span>เมือง</span><span>ไร่</span><span>ถางป่า</span><span>สวนป่า</span><span>ขั้นบันได</span><span>ตัดไม้</span><span>เหมือง</span></div>` + rows.slice(0, 200).map(x => `<div class="etr"><span>${esc(x.c.name)}${x.r.kind ? ` <em>${{ forest: 'เมืองป่า', mount: 'เมืองภูเขา', both: 'เมืองป่าบนภูเขา' }[x.r.kind]}</em>` : ''}${x.r.short ? ` <em>ขาด ${x.r.short}</em>` : ''}</span><span>${x.r.farm}</span><span>${x.r.cleared}</span><span>${x.r.garden}</span><span>${x.r.terrace}</span><span>${x.r.logged}</span><span>${x.r.mine}</span></div>`).join('') + `</div></details>`;
  return h;
}
const __gdpLand = ecoGdpHTML;
ecoGdpHTML = function () { return landHeadHTML() + __gdpLand(); };
$('ecobody').addEventListener('change', e => {
  const el = e.target, f = el.dataset.f; if (!editable || !f) return;
  if (f === 'tier') { tierSet(el.value); if (el.value === 'own') { const t = $('ecobody').querySelector('input[data-f="total"]'); if (t) { t.focus(); t.select(); } } return; }
  else if (f === 'total') { if (ecoPeople(el.value) >= 100 && document.activeElement === el) el.blur(); tierTyped(el); return; }
  else if (f === 'unit') { ECO.tier = ''; ECO.total = 0; ECO.cpp = clamp(ECO.central.per / ECO.unit, 1e-6, 1e9); }   // a head set by hand: the level lets go
  else if (f === 'cenper') { ECO.cpp = clamp(ECO.central.per / ECO.unit, 1e-6, 1e9); }
  else return;
  ecoChanged(true); ecoRender();
});
// The year is worked out again a moment after a change, and the GDP tab is drawn again when it is: a number half written in the
// box for the people of the map is carried across, with the place of the caret.
{ const er = ecoRender; ecoRender = function () {
  const at = document.activeElement, hold = at && at.dataset && at.dataset.f === 'total' && at.closest && at.closest('#ecobody') ? [at.value, at.selectionStart, at.selectionEnd, at.classList.contains('bad')] : null;
  er();
  if (!hold) return; const el = $('ecobody').querySelector('input[data-f="total"]'); if (!el) return;
  el.value = hold[0]; if (hold[3]) el.classList.add('bad'); el.focus(); try { el.setSelectionRange(hold[1], hold[2]); } catch (err) { /* a field that keeps no caret */ }
}; }
// ---------- slaves: labour as a thing bought and sold (v0.11.0) ----------
// The owner asked for a slave trade that rises out of poverty and a poor life, under a law each state chooses: none at all,
// patronage (held on conditions and easily freed), or a free trade. Slaves count among the people of the city that holds them.
// It is worked out after the year's trade, from what each city earned a head. The shape is the owner's; every number is mine:
//   - A city gives up people as it is poor: nothing at four fifths of the map's income a head or better, the most (a number in
//     the model's table) where there is no income at all. Each need of the people that went unmet adds to it, and what an
//     organisation does for the people's life takes away from it.
//   - A city wants slaves as it is rich: a third of the most at the map's mean income, rising with income above it.
//   - A city first holds its own poor, where its law lets it. Then the richest cities buy from the nearest that still have
//     people to sell. Abolition neither sells, buys nor holds. Patronage holds four tenths of what a free city would, gets six
//     tenths of the work, and deals only inside its own state. Rivals do not deal. A city under no state, and a land without one,
//     deal with anyone whose law lets them buy.
//   - A city wants fewer as it grows (the owner's ruling): where people are many, free labour is cheap. The want is halved at
//     100,000 people and all but gone in the millions. (Domar's old argument runs the same way: bondage pays where land is
//     plenty and hands are few. From memory.)
//   - A slave bought away is counted in the buyer's city and no longer in the one that lost them.
// Our own world's range, from memory and not looked up: in societies that kept slaves they were a few in a hundred; in the few
// built on them (Roman Italy, the American South) a fifth to a third. These numbers give the first kind.
let SLAVE = null, slaveShow = false, slaveSeen = null;
const SLAVE_BY = { water: 'ทางเรือ', caravan: 'คาราวาน', mixed: 'เรือต่อคาราวาน', none: 'ไม่มีเส้นทาง' };
function slaveLaw(c) { const s = c.sto; return !s ? 'free' : s.sys === 'anar' ? 'free' : ESLAVE[s.slave] ? s.slave : 'abol'; }
function slaveApply(rows) {
  const E = ECON; SLAVE = null;
  for (const r of rows) r.slave = null;
  if (!E || ECO.noSlave || rows.length < 2) return rows;
  let ppl = 0, inc = 0; for (const r of rows) { ppl += r.people; inc += r.inc; } const mean = ppl > 0 ? inc / ppl : 0; if (!(mean > 0)) return rows;
  const n = rows.length, law = rows.map(r => slaveLaw(r.c)), sup = new Float64Array(n), dem = new Float64Array(n), held = new Float64Array(n), out = new Float64Array(n), got = new Float64Array(n), flows = [];
  rows.forEach((r, k) => {
    const y = r.inc / r.people, poor = clamp(clamp((0.8 * mean - y) / (0.8 * mean), 0, 1) + 0.08 * (r.short || 0) + (r.c.reg === 'sweat' ? 0.04 : 0) + 0.004 * (r.wellPen || 0) - orgWell(r.c), 0, 1), rich = clamp((y - mean) / mean, 0, 1.5);
    if (law[k] !== 'abol') { sup[k] = r.people * TU('slaveOut') * poor * (law[k] === 'pat' ? 0.5 : 1); dem[k] = r.people * TU('slaveIn') * (1 / 3 + rich) * (law[k] === 'pat' ? 0.4 : 1) / (1 + r.people / TU('slaveCheap')); }   // a crowded city has cheap free hands, and wants few slaves
  });
  for (let k = 0; k < n; k++) { const own = Math.min(sup[k], dem[k]); held[k] += own; sup[k] -= own; dem[k] -= own; }   // a city's own poor first
  const may = (a, b) => { const sa = rows[a].c.sto, sb = rows[b].c.sto, same = !!sa && sa === sb; if (law[a] === 'pat') return same; return same || !ecoRival(sa, sb); };   // a is the seller: under patronage people are not sold out of the state, but a city of such a state may buy from abroad (v0.13.0, the owner's)
  // The journey (v0.12.0, the owner's): people are marched and shipped along the lines of the trade network, as goods are. The
  // nearest seller is the one the network brings nearest. Carrying costs a share of the price that grows with the journey, so a
  // buyer gets fewer from far away, and a journey that would cost more than the slave is not made. Where no line joins two
  // cities, nothing passes between them.
  const NT = E.NT, NWAY = E.NWAY || null, haul = TU('slaveHaul'); let ts = 0, tn = 0;
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) { const t = NT[a][b]; if (isFinite(t) && t > 0) { ts += t; tn++; } }
  const tRef = tn ? ts / tn : 1, far = (k, j) => { const t = NT[k] ? NT[k][j] : Infinity; return isFinite(t) ? haul * t / tRef : Infinity; };
  const order = [...rows.keys()].filter(k => dem[k] >= 0.5).sort((a, b) => rows[b].inc / rows[b].people - rows[a].inc / rows[a].people);
  for (const j of order) {
    const near = [...rows.keys()].filter(k => k !== j && sup[k] >= 0.5 && may(k, j) && far(k, j) <= 1).sort((a, b) => NT[a][j] - NT[b][j]);
    for (const k of near) {
      if (dem[j] < 0.5) break; const h = far(k, j), q = Math.min(sup[k], dem[j] / (1 + h)); if (q < 0.5) continue;
      sup[k] -= q; dem[j] -= q * (1 + h); out[k] += q; got[j] += q; held[j] += q; flows.push({ a: k, b: j, n: Math.round(q), t: NT[k][j], h, way: NWAY ? NWAY[k][j] : [] });
    }
  }
  const tot = { held: 0, moved: 0, people: 0 }, price = TU('slavePrice') * mean;
  rows.forEach((r, k) => {
    const h = Math.round(held[k]), o = Math.round(out[k]), g = Math.round(got[k]); if (!h && !o) return;
    r.slave = { held: h, out: o, bought: g, law: law[k] }; r.people = Math.max(1, r.people - o + g);
    if (h) { r.inc += h * mean * TU('slaveGain') * (law[k] === 'pat' ? 0.6 : 1); r.why = (r.why ? r.why + ' และ' : '') + 'ได้แรงงานจากทาส'; }
    tot.held += h; tot.moved += o;
  });
  for (const r of rows) tot.people += r.people;
  const fl = flows.filter(f => f.n > 0).sort((a, b) => b.n - a.n), load = new Map(); tot.haul = 0;
  for (const f of fl) {                              // what each line of the network carries in people, both ways, and how each journey goes
    let wet = 0, dry = 0, at = f.a; f.mids = [];
    for (const [li, dir] of f.way) { const L = E.links[li]; let x = load.get(li); if (!x) load.set(li, x = [0, 0]); x[dir > 0 ? 0 : 1] += f.n; wet += L.wet; dry += L.dry; at = L.ia === at ? L.ib : L.ia; if (at !== f.b) f.mids.push(at); }
    f.by = !f.way.length ? 'none' : !dry ? 'water' : !wet ? 'caravan' : 'mixed'; tot.haul += f.n * price * f.h;
  }
  SLAVE = { flows: fl, load, tot, price, mean, tRef };
  return rows;
}
const __incLabor = ecoIncome;
ecoIncome = function (rows) { __incLabor(rows); socApply(rows); slaveApply(rows); classApply(rows); return rows; };

function slaveHTML() {
  if (!ECON) return '';
  const rows = ecoIncome(ecoGdp()), S = SLAVE, sw = `<div class="erow"><label>การค้าทาสในโลกนี้ <select data-f="noslave"${editable ? '' : ' disabled'}><option value="0"${ECO.noSlave ? '' : ' selected'}>มี</option><option value="1"${ECO.noSlave ? ' selected' : ''}>ไม่มี</option></select></label></div>`;
  let h = sw;
  if (ECO.noSlave) h += `<p class="note">ปิดไว้ ไม่มีเมืองใดถือหรือซื้อขายทาส</p>`;
  else if (!S || !S.tot.held) h += `<p class="note">ยังไม่มีทาสในแผนที่นี้ ทาสเกิดเมื่อมีเมืองที่รายได้ต่อหัวต่ำกว่าสี่ในห้าของค่าเฉลี่ย และมีเมืองที่กฎหมายยอมให้ถือทาส รัฐตั้งต้นที่เลิกทาสสมบูรณ์ เปลี่ยนได้ในแท็บรัฐและเขตแดน เมืองที่ไม่ขึ้นกับรัฐใดค้าทาสเสรี</p>`;
  else {
    const list = rows.filter(r => r.slave).sort((a, b) => b.slave.held - a.slave.held || b.slave.out - a.slave.out), nm = k => esc(ECON.cities[k].name);
    h += `<div class="tr">ทาสทั้งแผนที่ <b>${ecoNumF(S.tot.held)}</b> คน คิดเป็นร้อยละ ${(100 * S.tot.held / Math.max(1, S.tot.people)).toFixed(1)} ของประชากร ถูกขายข้ามเมือง <b>${ecoNumF(S.tot.moved)}</b> คน ราคาคนละ ${ecoNumF(S.price)} ${esc(ECO.central.name)}</div>`;
    h += `<div class="etable g4"><div class="eth"><span>เมือง</span><span>ทาสในเมือง</span><span>ซื้อเข้า</span><span>ถูกขายออก</span></div>` + list.slice(0, 200).map(r => `<div class="etr"><span>${r.s ? `<i class="sdot" style="background:${r.s.color}"></i>` : ''}${esc(r.c.name)} <em>${r.slave.law === 'pat' ? 'อุปถัมภ์' : ''}</em></span><span>${ecoNumF(r.slave.held)}</span><span>${ecoNumF(r.slave.bought)}</span><span>${ecoNumF(r.slave.out)}</span></div>`).join('') + `</div>`;
    if (S.flows.length) h += `<h4>เส้นทางขนย้ายที่คนมากที่สุด</h4>` + S.flows.slice(0, 12).map(f => `<div class="tr w">${nm(f.a)} ไป ${nm(f.b)} <b>${ecoNumF(f.n)}</b> คน · ${SLAVE_BY[f.by]}${f.mids.length ? ' ผ่าน' + f.mids.slice(0, 3).map(nm).join(' ') + (f.mids.length > 3 ? ' และอีก ' + (f.mids.length - 3) + ' เมือง' : '') : ''} · ค่าขนย้ายร้อยละ ${Math.round(100 * f.h)} ของราคา</div>`).join('') + `<div class="tr w">ค่าขนย้ายรวมทั้งแผนที่ ${ecoNumF(S.tot.haul)} ${esc(ECO.central.name)}</div>`;
    h += `<p class="note">ทาสนับเป็นประชากรของเมืองที่ถือ จำนวนคนและรายได้ต่อหัวในตารางข้างบนรวมทาสแล้ว เมืองที่ถือทาสได้รายได้เพิ่มจากแรงงานของทาส ทาสเดินทางตามเส้นการค้าของแผนที่ ทั้งทางเรือและคาราวาน ผู้ซื้อหาจากเมืองที่เส้นทางพาไปถึงใกล้ที่สุดก่อน และเส้นทางที่ค่าขนย้ายเกินราคาทาสไม่มีใครเดิน เส้นทางดูได้ในโหมดการค้า กดปุ่มแสดงเส้นทางขนย้ายทาสในการ์ดการค้า ตัวเลขของแบบจำลองแก้ได้ที่แท็บตัวเลข หมวดแรงงานทาส</p>`;
  }
  return `<details class="efold" data-fold="gsl"${GDPV.gsl === 1 ? ' open' : ''}><summary>แรงงานทาส <small>${S ? ecoNumF(S.tot.held) + ' คน' : 'ไม่มี'}</small></summary>${h}</details>`;
}
const __gdpLabor = ecoGdpHTML;
ecoGdpHTML = function () { return __gdpLabor() + slaveHTML(); };
$('ecobody').addEventListener('change', e => {
  const el = e.target, f = el.dataset.f; if (!editable || !f) return;
  if (f === 'noslave') ECO.noSlave = el.value === '1' ? 1 : 0;
  else if (f === 'sslave') { const box0 = el.closest('[data-s]'), s = box0 && ECO.states.find(x => x.id === box0.dataset.s); if (!s || !ESLAVE[el.value]) return; s.slave = el.value; }
  else return;
  ecoChanged(false); ecoRender();
});
// a state's card in the trade view: what it bought and sold in people
const __tsLabor = tradeStateHTML;
tradeStateHTML = function (s) {
  let h = __tsLabor(s); ecoIncome(ecoGdp()); const S = SLAVE, law = s.sys === 'anar' ? 'free' : ESLAVE[s.slave] ? s.slave : 'abol';
  h += `<h4>แรงงานทาส</h4><div class="tr w">กฎหมาย: ${ESLAVE[law][0]}</div>`;
  if (!S || ECO.noSlave) return h;
  let inn = 0, out = 0, home = 0; for (const f of S.flows) { const a = ECON.cities[f.a].st === s.id, b = ECON.cities[f.b].st === s.id; if (a && b) home += f.n; else if (a) out += f.n; else if (b) inn += f.n; }
  return h + `<div class="tr">ซื้อเข้า <b>${ecoNumF(inn)}</b> คน ขายออก <b>${ecoNumF(out)}</b> คน ซื้อขายในรัฐ ${ecoNumF(home)} คน</div><div class="tr w">มูลค่าที่ซื้อ ${ecoNumF(inn * S.price)} ที่ขาย ${ecoNumF(out * S.price)} ${esc(ECO.central.name)}</div>`;
};
// the journeys on the map, in the trade view, when asked for: along the lines the people are carried on, as wide as the
// number that pass, with a mark for the way they go; a ring on a city that sells its people, a dot on one that buys
function slaveNow() {
  const key = [ECON.ver, ECO.unit, ECO.noSlave, ECO.states.map(z => z.sys + (z.slave || '') + JSON.stringify(z.rel)).join(), ECO.orgs.length, TU('slaveOut'), TU('slaveIn'), TU('slaveCheap'), TU('slaveHaul')].join('|');
  if (!slaveSeen || slaveSeen.key !== key) { const rows = ecoIncome(ecoGdp()); slaveSeen = { key, S: SLAVE, rows: rows.map(r => r.slave) }; }   // worked out once for a year, not on every frame
  return slaveSeen;
}
function slaveAlong(q, f) {                          // the point a share of the way along a line, and the way the line runs there
  let len = 0; for (let k = 1; k < q.length; k++) len += Math.hypot(q[k][0] - q[k - 1][0], q[k][1] - q[k - 1][1]);
  let go = len * f; for (let k = 1; k < q.length; k++) { const d = Math.hypot(q[k][0] - q[k - 1][0], q[k][1] - q[k - 1][1]); if (go <= d || k === q.length - 1) { const u = d > 0 ? Math.min(1, go / d) : 0; return [q[k - 1][0] + (q[k][0] - q[k - 1][0]) * u, q[k - 1][1] + (q[k][1] - q[k - 1][1]) * u, Math.atan2(q[k][1] - q[k - 1][1], q[k][0] - q[k - 1][0]), len]; } go -= d; }
  return [q[0][0], q[0][1], 0, len];
}
function slaveDraw() {
  if (!slaveShow || mode !== 'trade' || !ECON) return;
  const seen = slaveNow(), S = seen.S; if (!S || !S.flows.length) return;
  const px = 1 / view.s, E = ECON, pick = tsel ? E.cities.findIndex(c => c.id === tsel) : -1;
  let load = S.load, flows = S.flows;
  if (pick >= 0) { flows = S.flows.filter(f => f.a === pick || f.b === pick); load = new Map(); for (const f of flows) for (const [li, dir] of f.way) { let x = load.get(li); if (!x) load.set(li, x = [0, 0]); x[dir > 0 ? 0 : 1] += f.n; } }
  let top = 1; for (const x of load.values()) top = Math.max(top, x[0] + x[1]);
  ctx.setTransform(dpr * view.s, 0, 0, dpr * view.s, dpr * view.x, dpr * view.y); ctx.globalAlpha = 1; ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
  const wOf = v => Math.max(0.5 + 1.1 * Math.sqrt(v / top), (1.3 + 3.4 * Math.sqrt(v / top)) * px), marks = [];
  for (let pass = 0; pass < 2; pass++) for (const [li, x] of load) {
    const L = E.links[li], geo = L && L.geo; if (!geo || !geo.runs.length) continue; const w = wOf(x[0] + x[1]);
    ctx.setLineDash(pass ? [Math.max(2.2, 5 * px), Math.max(1.6, 3.6 * px)] : []); ctx.strokeStyle = pass ? '#d0343c' : 'rgba(22,8,10,.82)'; ctx.lineWidth = pass ? w : w + Math.max(0.7, 1.5 * px);
    for (const r of geo.runs) { linePath(ctx, r.q); ctx.stroke(); }
    if (pass) continue;
    let best = null, bl = -1; for (const r of geo.runs) { const l = slaveAlong(r.q, 0.5)[3]; if (l > bl) { bl = l; best = r; } }
    const A = E.cities[L.ia], q0 = geo.runs[0].q[0], qe = geo.runs[geo.runs.length - 1].q, q1 = qe[qe.length - 1], fwdRuns = Math.hypot(q0[0] - A.x, q0[1] - A.y) <= Math.hypot(q1[0] - A.x, q1[1] - A.y);   // do the runs start at the line's first city
    if (best && bl * view.s > 26) { if (x[0] > 0) marks.push([best.q, x[1] > 0 ? 0.38 : 0.5, fwdRuns ? 0 : Math.PI, w]); if (x[1] > 0) marks.push([best.q, x[0] > 0 ? 0.62 : 0.5, fwdRuns ? Math.PI : 0, w]); }
  }
  ctx.setLineDash([]); ctx.lineCap = 'round';
  for (const [q, f, turn, w] of marks) {             // a chevron pointing the way the people go
    const [x, y, an] = slaveAlong(q, f), a = an + turn, s = Math.max(w * 1.5, 5.5 * px), tx = x + Math.cos(a) * s * 0.5, ty = y + Math.sin(a) * s * 0.5;
    for (let pass = 0; pass < 2; pass++) { ctx.beginPath(); ctx.moveTo(tx - Math.cos(a - 0.6) * s, ty - Math.sin(a - 0.6) * s); ctx.lineTo(tx, ty); ctx.lineTo(tx - Math.cos(a + 0.6) * s, ty - Math.sin(a + 0.6) * s); ctx.strokeStyle = pass ? '#ffd9d2' : 'rgba(22,8,10,.9)'; ctx.lineWidth = pass ? Math.max(0.5, 1.5 * px) : Math.max(1, 3.2 * px); ctx.stroke(); }
  }
  const ends = new Map(); for (const f of flows) { ends.set(f.a, (ends.get(f.a) || 0) | 1); ends.set(f.b, (ends.get(f.b) || 0) | 2); }
  for (const [k, m] of ends) {
    const c = E.cities[k], r = Math.max(2.2, 5.5 * px);
    ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, 2 * Math.PI); ctx.lineWidth = Math.max(0.7, 2 * px); ctx.strokeStyle = 'rgba(22,8,10,.85)'; if (m & 2) { ctx.fillStyle = '#d0343c'; ctx.fill(); } ctx.stroke();
    ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, 2 * Math.PI); ctx.lineWidth = Math.max(0.4, 1.1 * px); ctx.strokeStyle = m & 2 ? '#ffd9d2' : '#d0343c'; ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
{ const under = drawUnderNames; drawUnderNames = function () { if (under) under(); slaveDraw(); }; }
const __rtLabor = renderTradeCard;
renderTradeCard = function () {
  __rtLabor();
  if (mode !== 'trade' || !ECON || ECO.noSlave) return;
  $('tradebody').insertAdjacentHTML('beforeend', `<div class="btns" style="margin-top:8px"><button type="button" class="btn${slaveShow ? ' on' : ''}" data-a="slaveshow" aria-pressed="${slaveShow}">${slaveShow ? 'ซ่อนเส้นทางขนย้ายทาส' : 'แสดงเส้นทางขนย้ายทาส'}</button></div>` + (slaveShow ? `<p class="hint">เส้นประสีแดงคือเส้นการค้าที่มีทาสถูกขนผ่าน หนาตามจำนวนคน หัวลูกศรชี้ทางที่ไป วงแหวนคือเมืองที่ขายคนออก จุดทึบคือเมืองที่ซื้อ เลือกเมืองเพื่อดูเฉพาะเส้นทางของเมืองนั้น</p>` : ''));
};
$('tradebody').addEventListener('click', e => { const b = e.target.closest('[data-a="slaveshow"]'); if (!b) return; slaveShow = !slaveShow; renderTradeCard(); requestDraw(); });
// a line's card and a city's card in the trade view: the people carried along the line, and the slaves of the city
const __tlLabor = tradeLinkHTML;
tradeLinkHTML = function (L) {
  let h = __tlLabor(L); if (!ECON || ECO.noSlave) return h;
  const S = slaveNow().S, li = ECON.links.indexOf(L), x = S && S.load.get(li); if (!x || !(x[0] + x[1])) return h;
  const row = `<div class="tr">ทาสถูกขนผ่านเส้นนี้ <b>${ecoNumF(x[0] + x[1])}</b> คน <span class="w">จาก${esc(ECON.cities[L.ia].name)} ${ecoNumF(x[0])} · จาก${esc(ECON.cities[L.ib].name)} ${ecoNumF(x[1])}</span></div>`;
  const at = h.indexOf('<div class="optrow">'); return at >= 0 ? h.slice(0, at) + row + h.slice(at) : h + row;
};
const __tcLabor = tradeCityHTML;
tradeCityHTML = function (k) {
  let h = __tcLabor(k); if (!ECON || ECO.noSlave) return h;
  const seen = slaveNow(), sl = seen.rows[k]; if (!sl) return h;
  return h + `<h4>แรงงานทาส</h4><div class="tr">ทาสในเมือง <b>${socN(sl.held)}</b> คน <span class="w">ซื้อเข้า ${socN(sl.bought)} · ถูกขายออก ${socN(sl.out)}${sl.law === 'pat' ? ' · ระบบอุปถัมภ์' : ''}</span></div>`;
};
// ---------- society (v0.13.0, the owner's twelve) ----------
// What this part adds to the year, each from a line of the owner's:
//   - People move. A city's people are those who were born to it and stay, those who came, and those who left, and beside them
//     the visitors who pass through. How settled a city's people are, how readily they move and how much the place charms a
//     visitor are three numbers each city is given by lot when it is made (the owner changes them, or draws again).
//   - Movement follows well-being and income: people leave where life is poorer than their state's average and settle where it
//     is better. A state chooses how its incomers spread: by the pull of each city, into a few great ones, evenly, or with the
//     seasons, out of the hard winters and back.
//   - Visitors go by four things the owner chose together: what there is to see near a city, how much trade passes through it,
//     how rich and well it lives, and the houses of organisations in it. Rich cities send more of them, far cities draw fewer.
//   - A city of many people has cheap hands: its workshops turn out more, and caravans to and from it cost less.
//   - Each city's workshops run under one of four orders of work, the owner's choice of four.
//   - A state that buys far more than it sells, measured against what it makes, lives worse for it. A greater state leans on
//     the smaller ones beside it and pays them less. And a state in deficit does something about it, with the tools its
//     system favours, the first of them first: a wall of duties, a bounty on exports, a cheaper coin, making at home what it
//     buys abroad, a tighter belt, drawing visitors. Organisations are left to the owner, as a last resort the card points to.
// Every number here is mine unless the owner gave it, and each sits in the numbers tab.
Object.assign(ETUNE, {
  labRef: [10000, 100, 1e7, 100, 'จำนวนคนของเมืองที่ค่าแรงเป็นค่ากลาง เมืองที่คนมากกว่านี้ค่าแรงถูกลง เมืองที่คนน้อยกว่านี้ค่าแรงแพงขึ้นเล็กน้อย', 'ประชากรและแรงงาน'],
  labCheap: [0.3, 0, 0.8, 0.01, 'ค่าแรงถูกลงได้มากสุดเป็นส่วนเท่านี้ เมื่อเมืองมีคนเป็นพันเท่าของค่ากลาง', 'ประชากรและแรงงาน'],
  labMake: [0.5, 0, 2, 0.05, 'โรงงานผลิตเพิ่มเป็นกี่เท่าของส่วนที่ค่าแรงถูกลง', 'ประชากรและแรงงาน'],
  labHaul: [1, 0, 2, 0.05, 'ค่าคาราวานของเส้นที่ต่อกับเมืองถูกลงเป็นกี่เท่าของส่วนที่ค่าแรงถูกลง นับเฉพาะช่วงทางบก', 'ประชากรและแรงงาน'],
  landFood: [1, 0, 1, 0.05, 'เมื่อที่ดินไม่พอ เมืองผลิตอาหารขาดไปเป็นส่วนเท่านี้ของส่วนที่ดินที่ขาด (1 คือขาดที่ดินเท่าไรก็ผลิตอาหารขาดเท่านั้น ส่วนที่ขาดต้องซื้อเข้า)', 'ประชากรและแรงงาน'],
  regHomeOut: [0.85, 0.3, 1.5, 0.01, 'งานช่างตามบ้าน: ผลผลิตโรงงานเทียบกับโรงงานกะเดียว', 'ระเบียบงาน'],
  regHomeVal: [0.08, 0, 1, 0.01, 'งานช่างตามบ้าน: มูลค่าสินค้าโรงงานที่เพิ่มขึ้น', 'ระเบียบงาน'],
  regSweatOut: [1.25, 0.5, 2.5, 0.01, 'โรงงานเร่งผลิต: ผลผลิตโรงงานเทียบกับโรงงานกะเดียว', 'ระเบียบงาน'],
  regSweatWell: [10, 0, 50, 1, 'โรงงานเร่งผลิต: ความเป็นอยู่ที่ลดลง (แต้มจาก 100)', 'ระเบียบงาน'],
  regCareOut: [1.12, 0.5, 2.5, 0.01, 'โรงงานสองกะมีสวัสดิการ: ผลผลิตโรงงานเทียบกับโรงงานกะเดียว', 'ระเบียบงาน'],
  regCareCost: [0.1, 0, 0.8, 0.01, 'โรงงานสองกะมีสวัสดิการ: ต้นทุนค่าแรงที่เพิ่ม เป็นส่วนของมูลค่าสินค้าโรงงานที่หักจากรายได้ของเมือง', 'ระเบียบงาน'],
  regWell: [5, 0, 50, 1, 'งานช่างตามบ้านและโรงงานมีสวัสดิการ: ความเป็นอยู่ที่เพิ่มขึ้น (แต้มจาก 100)', 'ระเบียบงาน'],
  migMove: [0.5, 0, 1, 0.05, 'ส่วนของคนที่พร้อมย้ายซึ่งย้ายออกจริงในเมืองที่แย่ที่สุดของรัฐ', 'ย้ายถิ่นและท่องเที่ยว'],
  migWorld: [0.2, 0, 1, 0.05, 'ส่วนของคนย้ายออกที่ไปตั้งถิ่นนอกรัฐของตัวเอง', 'ย้ายถิ่นและท่องเที่ยว'],
  seasSpan: [20, 2, 80, 1, 'ย้ายถิ่นตามฤดู: เมืองที่หน้าหนาวเย็นกว่าเมืองที่อุ่นที่สุดของรัฐเท่านี้องศา คนที่พร้อมย้ายครึ่งหนึ่งออกไปอยู่เมืองที่อุ่นกว่าครึ่งปี', 'ย้ายถิ่นและท่องเที่ยว'],
  tourRate: [0.02, 0, 1, 0.005, 'จำนวนครั้งที่คนหนึ่งคนออกไปเที่ยวเมืองอื่นต่อปี ในเมืองที่รายได้และความเป็นอยู่เท่าค่าเฉลี่ย', 'ย้ายถิ่นและท่องเที่ยว'],
  tourSpend: [0.03, 0, 1, 0.005, 'เงินที่นักท่องเที่ยวหนึ่งคนใช้ในเมืองที่ไปเที่ยว เป็นส่วนของรายได้ต่อหัวเฉลี่ยของแผนที่', 'ย้ายถิ่นและท่องเที่ยว'],
  tourFar: [1, 0.1, 10, 0.1, 'ระยะที่แรงดึงดูดนักท่องเที่ยวลดลงราวสองในสาม เป็นกี่เท่าของการเดินทางยาวปานกลางของแผนที่', 'ย้ายถิ่นและท่องเที่ยว'],
  defFree: [0.05, 0, 1, 0.01, 'ขาดดุลได้เท่านี้ของ GDP ของรัฐโดยความเป็นอยู่ไม่ลด', 'ดุลการค้าของรัฐ'],
  defWell: [100, 0, 500, 5, 'ความเป็นอยู่ลดกี่แต้ม ต่อการขาดดุลเต็ม GDP ที่เกินจากส่วนที่ขาดได้', 'ดุลการค้าของรัฐ'],
  defMax: [30, 0, 100, 1, 'ความเป็นอยู่ลดเพราะขาดดุลได้มากสุดกี่แต้ม', 'ดุลการค้าของรัฐ'],
  pressStep: [0.08, 0, 0.5, 0.01, 'รัฐที่ใหญ่กว่าเท่าตัวกดราคาของรัฐติดกันลงได้เป็นส่วนเท่านี้', 'ดุลการค้าของรัฐ'],
  pressMax: [0.2, 0, 0.6, 0.01, 'กดราคาได้มากสุดเป็นส่วนเท่านี้', 'ดุลการค้าของรัฐ'],
  polStart: [0.05, 0, 1, 0.01, 'รัฐเริ่มใช้นโยบายแก้ขาดดุลเมื่อขาดดุลเกินเท่านี้ของ GDP', 'ดุลการค้าของรัฐ'],
  polFull: [0.25, 0.01, 2, 0.01, 'รัฐใช้นโยบายทุกข้อเต็มกำลังเมื่อขาดดุลถึงเท่านี้ของ GDP', 'ดุลการค้าของรัฐ'],
  polTariff: [0.3, 0, 2, 0.01, 'ภาษีขาเข้าเต็มกำลัง เป็นส่วนของมูลค่าของที่ซื้อเข้า (ไม่เก็บจากอาหาร เกลือ และเชื้อเพลิง)', 'ดุลการค้าของรัฐ'],
  polSub: [0.3, 0, 2, 0.01, 'เงินอุดหนุนส่งออกเต็มกำลัง เป็นส่วนของมูลค่าของที่ขายออก', 'ดุลการค้าของรัฐ'],
  polDev: [0.15, 0, 1, 0.01, 'ลดค่าเงินเต็มกำลัง เป็นส่วนที่ของนอกแพงขึ้นและของส่งออกได้ราคาดีขึ้น', 'ดุลการค้าของรัฐ'],
  polSubst: [0.25, 0, 2, 0.01, 'ผลิตทดแทนการนำเข้าเต็มกำลัง ผลผลิตของสามหมวดที่ซื้อเข้ามากที่สุดเพิ่มเป็นส่วนเท่านี้', 'ดุลการค้าของรัฐ'],
  polAust: [0.2, 0, 0.9, 0.01, 'รัดเข็มขัดเต็มกำลัง ความต้องการของฟุ่มเฟือยลดเป็นส่วนเท่านี้', 'ดุลการค้าของรัฐ'],
  claimPow: [0.35, 0, 1, 0.05, 'เมืองที่คนมากกว่าชิงพื้นที่เก็บเกี่ยวจากเมืองข้างเคียงได้มากขึ้น: แรงชิงเท่ากับ (คนของเมือง ÷ คนของเมืองค่ากลาง) ยกกำลังเท่านี้ 0 คือทุกเมืองเท่ากัน', 'ประชากรและแรงงาน'],
  richRef: [0.5, 0.05, 0.95, 0.01, 'ส่วนรายได้ของชนชั้นสูงและกลางรวมกันที่ความต้องการของฟุ่มเฟือยเป็นค่ากลาง', 'ชนชั้น'],
  homePref: [0.15, 0, 2, 0.01, 'คนที่ไม่มั่งคั่งชอบของพื้นฐานจากในรัฐ: ของจากนอกรัฐต้องถูกกว่าเท่านี้ของราคาจึงซื้อ (คูณส่วนรายได้ของชนชั้นล่าง)', 'ชนชั้น'],
  basicWell: [70, 0, 100, 1, 'ความเป็นอยู่ที่ลดลงเมื่อของพื้นฐานขาดทั้งหมด (อาหาร เกลือ เชื้อเพลิง ไม้ หิน ผ้า เครื่องมือ) ลดตามส่วนที่ขาด', 'ชนชั้น'],
  otherWell: [25, 0, 100, 1, 'ความเป็นอยู่ที่ลดลงเมื่อของอื่นขาดทั้งหมด ลดตามส่วนที่ขาด', 'ชนชั้น'],
  alms: [0.01, 0, 0.2, 0.005, 'ทานที่ชนชั้นล่างสุดได้ เป็นส่วนของรายได้ของเมือง เมื่อคนล่างสุดมีร้อยละ 8 (องค์กรที่ให้ความเป็นอยู่เพิ่มทานได้)', 'ชนชั้น'],
  jobless: [0.03, 0, 0.5, 0.01, 'ส่วนของคนแรงงานที่ไม่มีงานเป็นอย่างน้อย กลายเป็นชนชั้นล่างสุด (เพิ่มตามค่าแรงที่ถูก ทาส และของพื้นฐานที่ขาด)', 'ชนชั้น'],
  slvBase: [15, 0, 100, 1, 'ความเป็นอยู่ของทาสเมื่อชนชั้นสูงไม่มีเงินเลย', 'ชนชั้น'],
  slvTop: [110, 0, 300, 5, 'ความเป็นอยู่ของทาสที่เพิ่มตามส่วนรายได้ของเมืองที่อยู่กับชนชั้นสูง (คูณส่วนนั้น)', 'ชนชั้น'],
  fxBal: [0.5, 0, 3, 0.05, 'ค่าเงินของรัฐแข็งขึ้นเป็นกี่เท่าของดุลการค้าต่อ GDP (เกินดุลร้อยละ 10 แข็งขึ้นร้อยละ 5) ขาดดุลอ่อนลงแบบเดียวกัน สูงสุดร้อยละ 30', 'ดุลการค้าของรัฐ'],
  balBand: [0.03, 0, 0.5, 0.005, 'รัฐที่ดุลห่างจากศูนย์ไม่เกินเท่านี้ของ GDP นับว่าค้าสมดุล', 'ดุลการค้าของรัฐ'],
  balWell: [3, 0, 30, 1, 'ค้าสมดุล: ความเป็นอยู่ที่เพิ่มขึ้น (แต้ม)', 'ดุลการค้าของรัฐ'],
  balStay: [0.2, 0, 1, 0.05, 'ค้าสมดุล: คนย้ายออกน้อยลงเป็นส่วนเท่านี้', 'ดุลการค้าของรัฐ'],
  polTour: [0.5, 0, 3, 0.05, 'ส่งเสริมการท่องเที่ยวเต็มกำลัง แรงดึงดูดนักท่องเที่ยวของเมืองในรัฐเพิ่มเป็นส่วนเท่านี้', 'ดุลการค้าของรัฐ'],
});
const EREG = {
  home: ['งานช่างตามบ้าน', 'ผลผลิตโรงงานน้อยลง มูลค่าสินค้าโรงงานสูงขึ้น ความเป็นอยู่ดีขึ้น'],
  shift: ['โรงงานกะเดียว', 'ค่ากลาง ไม่บวกไม่ลบ'],
  sweat: ['โรงงานเร่งผลิต กะยาว', 'ผลผลิตโรงงานมากขึ้น ความเป็นอยู่แย่ลง คนย้ายออกมากขึ้น และความจนที่เพิ่มทำให้มีทาสมากขึ้น'],
  care: ['โรงงานสองกะมีสวัสดิการ', 'ผลผลิตโรงงานมากขึ้น ต้นทุนค่าแรงสูงขึ้น ความเป็นอยู่ดีขึ้น และดึงคนย้ายเข้า'],
};
const ESPREAD = {
  nat: ['ตามแรงดึงดูด', 'คนย้ายเข้าเมืองตามแรงดึงดูดและขนาดของแต่ละเมือง'],
  clump: ['เป็นกลุ่มก้อน', 'คนย้ายเข้ากระจุกในเมืองใหญ่ที่น่าอยู่ที่สุดไม่กี่เมือง เมืองเล็กแทบไม่ได้คน'],
  even: ['สม่ำเสมอ', 'คนย้ายเข้ากระจายทุกเมืองใกล้เคียงกันไม่ว่าเมืองเล็กหรือใหญ่ เมืองเล็กจึงโตเร็วกว่าเมื่อเทียบกับขนาด'],
  season: ['ย้ายถิ่นตามฤดู', 'นอกจากย้ายตามแรงดึงดูด คนส่วนหนึ่งออกจากเมืองที่ฤดูหนาวรุนแรงไปอยู่เมืองที่อุ่นกว่าในรัฐเดียวกันครึ่งปีแล้วกลับ'],
};
const EPOL = {
  tariff: ['ภาษีขาเข้า', 'ของจากนอกรัฐแพงขึ้นจึงซื้อเข้าน้อยลง ไม่เก็บจากอาหาร เกลือ และเชื้อเพลิง', 'ของในเมืองแพงขึ้น ความเป็นอยู่ลดเล็กน้อย'],
  subsidy: ['อุดหนุนการส่งออก', 'รัฐช่วยค่าขนของที่ขายออกนอกรัฐ จึงขายได้ไกลและมากขึ้น', 'รัฐจ่ายเงินอุดหนุน รายได้ของเมืองลดเล็กน้อย'],
  dev: ['ลดค่าเงิน', 'ของส่งออกได้ราคาดีขึ้นในสายตาผู้ขาย และของนอกแพงขึ้น', 'ของนำเข้าแพง ความเป็นอยู่ลด'],
  subst: ['ผลิตทดแทนการนำเข้า', 'เร่งผลิตสามหมวดที่รัฐซื้อเข้ามากที่สุดขึ้นเองในรัฐ', 'รัฐอุดหนุนผู้ผลิต รายได้ของเมืองลดเล็กน้อย'],
  aust: ['รัดเข็มขัด', 'ลดการใช้ของฟุ่มเฟือย (ของหายาก โลหะมีค่า ตำรา เครื่องกล สมุนไพร) จึงซื้อเข้าน้อยลง', 'ความเป็นอยู่ลด'],
  tour: ['ส่งเสริมการท่องเที่ยว', 'ดึงนักท่องเที่ยวจากนอกรัฐ เงินที่เขาใช้นับเป็นรายรับของรัฐ', 'รัฐจ่ายค่าส่งเสริม รายได้ของเมืองลดเล็กน้อย'],
};
const EPOL_SYS = { trad: ['aust'], feud: ['tariff', 'aust'], merc: ['tariff', 'subst', 'subsidy'], cap: ['dev', 'subsidy', 'tour'], soc: ['subst', 'aust', 'tariff'], anar: [] };
const EPOL_COST = { tariff: [3, 0], subsidy: [0, 0.02], dev: [4, 0], subst: [0, 0.02], aust: [6, 0], tour: [0, 0.01] };   // at full strength: points of well-being lost, share of the city's income spent
const SOC_BASIC = new Set(['grain', 'protein', 'salt', 'fuel', 'timber', 'stone', 'cloth', 'tools']), SOC_FOOD = new Set(['grain', 'protein']), SOC_LUX = new Set(['luxury', 'rare', 'books', 'tech', 'herbs']), SOC_STAPLE = new Set(['grain', 'protein', 'salt', 'fuel']);
ECO.regime = {}; ECO.demo = {};
let SOC = null;

// ---- each city's lot ----
function socHash(str, salt) { let h = (2166136261 ^ salt) >>> 0; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15; return (h >>> 0) / 4294967296; }
function socDemo(id) {                               // the lot a city drew when it was made, unless the owner has set or redrawn it
  const o = ECO.demo[id] || {};
  return { nat: o.nat != null ? o.nat : 0.6 + 0.35 * socHash(id, 1), mob: o.mob != null ? o.mob : 0.5 + socHash(id, 2), charm: o.charm != null ? o.charm : 0.5 + socHash(id, 3) };
}
const polList = s => { if (!s || s.sys === 'anar') return []; const on = (Array.isArray(s.pol) ? s.pol : EPOL_SYS[s.sys] || []).filter(k => EPOL[k]); return s.pol1 && on.includes(s.pol1) ? [s.pol1, ...on.filter(k => k !== s.pol1)] : on; };
const polOn = (c, tool) => c.pol && c.pol.tools.has(tool) ? c.pol.k : 0;

// ---- before the year's trade: what each city brings to it ----
function socPrep(cities) {
  const ref = TU('labRef'), cheap = TU('labCheap'), pts = new Map(), st = stPeak();
  for (const p of visiblePoints()) if (p.h >= 0) pts.set(p.h, (pts.get(p.h) || 0) + 1);
  for (const c of cities) {
    const s = ECOX.byKey.get(c.st) || null;
    c.reg = EREG[ECO.regime[c.id]] ? ECO.regime[c.id] : s && EREG[s.reg] ? s.reg : 'shift';
    c.lab = clamp(cheap * Math.log10(Math.max(1, c.people) / ref) / 3, -0.1, cheap);              // how much cheaper a day's work is here than in a middling town
    c.pol = POL && s ? POL.get(s.id) || null : null;
    c.work = (c.reg === 'home' ? TU('regHomeOut') : c.reg === 'sweat' ? TU('regSweatOut') : c.reg === 'care' ? TU('regCareOut') : 1) * (1 + TU('labMake') * c.lab);
    c.foodCut = 1 - TU('landFood') * (c.land ? c.land.lack : 0);                                   // a city short of land grows that much less of its food, and must buy the rest
    let seen = 0, sea = 0, lake = 0, ring = [c.h]; const sn = new Set(ring);                       // what there is to see: marks on the map within three hexes, the great peak, a sea shore, a lake
    for (let d = 0; d <= 3 && ring.length; d++) { const nx = []; for (const u of ring) { seen += pts.get(u) || 0; if (u === st) seen += 3; const b = eff(u); if (d <= 1 && isSea(b)) sea = 1; if (d <= 2 && b === 'L') lake = 1; for (let j = 0; j < 6; j++) { const v = NB[u * 6 + j]; if (v >= 0 && !sn.has(v)) { sn.add(v); nx.push(v); } } } ring = nx; }
    c.att = clamp((seen + sea + lake) / 6, 0, 1);
  }
}
function socRaw(c, cat) { return (SOC_FOOD.has(cat) ? c.foodCut : 1) * (c.pol && c.pol.top.has(cat) ? 1 + polOn(c, 'subst') * TU('polSubst') : 1); }
function socMake(c, m) { return c.work * (c.pol && c.pol.top.has(m) ? 1 + polOn(c, 'subst') * TU('polSubst') : 1); }
function socNeed(c, cat) {                         // the share of the city's need that its people will pay for (v0.14.0): the rich want the fine things, the rest want what their country has
  const A = ECAT[cat]; if (!A || A.people || SOC_BASIC.has(cat)) return 1;
  const r = c.rich0 == null ? TU('richRef') : c.rich0; let f = 1;
  if (SOC_LUX.has(cat)) f = clamp(r / TU('richRef'), 0.2, 2.5) * (1 - polOn(c, 'aust') * TU('polAust'));
  else if (A.made) return 1;
  if (!A.made && c.dom && !c.dom.has(cat)) f *= clamp(r, 0.05, 1);   // what nobody of their country brings up from the ground, only the well-off send for
  return f;
}
function socHaul(L, cities) {                        // caravans to and from a city of many hands cost less: the stretch by land, by the two ends
  const a = cities[L.ia], b = cities[L.ib], len = (L.dry || 0) + (L.wet || 0), dry = len > 0 ? L.dry / len : 0;
  return clamp(1 - TU('labHaul') * dry * (Math.max(0, a.lab) + Math.max(0, b.lab)) / 2, 0.4, 1);
}
function polEarn(ci, cj, cat, pi, pj, v, gain, cost) {   // a trade across a border, as the two states' tools leave it
  POLG = gain; POLC = cost; const si = ci.sto, sj = cj.sto; if (si === sj) return;
  if ((si && si.sys === 'anar') || (sj && sj.sys === 'anar')) return;                              // no wall and no bounty reaches the black market
  if (FXS) { const xa = FXS.get(si ? si.id : '') || 0, xb = FXS.get(sj ? sj.id : '') || 0; if (xa || xb) POLC = Math.max(0.2 * cost, POLC + clamp((1 + xa) / (1 + xb) - 1, -0.5, 0.5) * pj * v); }   // a hard coin makes a state's wares dear abroad and the world's cheap at home
  const a = ci.pol, b = cj.pol;
  if (b) { if (b.tools.has('tariff') && !SOC_STAPLE.has(cat)) POLC += b.k * TU('polTariff') * pj * v; if (b.tools.has('dev')) POLC += b.k * TU('polDev') * pj * v; }
  if (a) { if (a.tools.has('subsidy')) POLC = Math.max(0.3 * cost, POLC - a.k * TU('polSub') * pi * v); if (a.tools.has('dev')) POLG += a.k * TU('polDev') * pj; }
}

// ---- after the year's trade ----
function socMet(E, k, set, inSet) {                  // how far the city's needs were met, by value, the staples counted twice; of one set of classes, or of the rest, when asked
  let a = 0, b = 0;
  for (const cat of ECATS) { const nd = E.need[k][cat]; if (!(nd > 0) || !ECAT[cat] || ECAT[cat].people || (set && set.has(cat) !== inSet)) continue; const w = nd * ECAT[cat].v * (SOC_STAPLE.has(cat) ? 2 : 1); a += w * Math.min(1, (E.got[k][cat] || 0) / nd); b += w; }
  return b > 0 ? a / b : 1;
}
let socNearKey = '', socNearSet = null;
function socNear() {                                 // which states touch
  const key = ecoStamp + '|' + ECO.states.length; if (key === socNearKey && socNearSet) return socNearSet;
  const S = new Set(); for (let i = 0; i < N; i++) { const a = ECO.cells[i]; if (a === '.') continue; for (let j = 0; j < 6; j++) { const v = NB[i * 6 + j]; if (v < 0) continue; const b = ECO.cells[v]; if (b !== '.' && b !== a) S.add(a < b ? a + b : b + a); } }
  socNearKey = key; return socNearSet = S;
}
const socTouch = (a, b) => socNear().has(a < b ? a + b : b + a);
function socTRef(E) { let s = 0, m = 0; const n = E.cities.length; for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) { const t = E.NT[a][b]; if (isFinite(t) && t > 0) { s += t; m++; } } return m ? s / m : 1; }
function socApply(rows) {
  const E = ECON, n = rows.length; SOC = null; if (!E || !n) return rows;
  let ppl = 0, inc = 0; for (const r of rows) { ppl += r.people; inc += r.inc; } const mean = ppl > 0 ? inc / ppl : 0, per = ECO.central.per;
  const base = rows.map(r => r.people), books = new Map();
  const book = s => { let b = books.get(s.id); if (!b) books.set(s.id, b = { s, out: 0, inn: 0, gdp: 0, people: 0, cities: 0, lost: 0, won: 0, tourIn: 0, tourOut: 0, byP: new Map(), byC: new Map(), sq: new Map(), def: 0, pen: 0, plan: null }); return b; };
  rows.forEach((r, k) => { if (r.s) { const b = book(r.s); b.gdp += r.gdp; b.people += r.people; b.cities++; if (r.c.pol) b.plan = r.c.pol; } });
  // the order of work, and the workshops' wage bill under the two-shift order
  rows.forEach((r, k) => {
    r.exX = 0; const c = r.c; let made = 0; for (const m of EMADEC) { const mk = E.MK[k][m]; if (mk) made += mk[0] * (E.P1[k][m] || 1) * ECAT[m].v; } made *= per; r.made = made;
    if (c.reg === 'home') { r.inc += TU('regHomeVal') * made; r.gdp += TU('regHomeVal') * made; } else if (c.reg === 'care') r.inc -= TU('regCareCost') * made;
    if (c.pol) { let cost = 0; for (const t of c.pol.tools) cost += EPOL_COST[t][1]; r.inc -= c.pol.k * cost * r.gdp; }
  });
  // each state's books in goods, at the buyer's price; and what a greater neighbour squeezed out of a smaller one
  for (const f of E.flows) {
    if (f.cat === 'labor') continue; const ra = rows[f.from], rb = rows[f.to], A = ra.s, B = rb.s; if (A === B) continue;
    let v = f.amt * ECAT[f.cat].v * (E.P1[f.to][f.cat] || 1) * per;
    if (A && B && A.sys !== 'anar' && B.sys !== 'anar' && (A.rel[B.id] || B.rel[A.id]) !== 'ally' && socTouch(A.id, B.id)) {
      const ga = book(A).gdp, gb = book(B).gdp;
      if (gb > ga && ga > 0) { const x = clamp(TU('pressStep') * Math.log2(gb / ga), 0, TU('pressMax')) * v; ra.inc -= x; rb.inc += x; v -= x; const ba = book(A), bb = book(B); ba.lost += x; bb.won += x; ba.sq.set(B.id, (ba.sq.get(B.id) || 0) + x); }
    }
    const put = (b, other, side) => { const P = b.byP.get(other) || b.byP.set(other, [0, 0]).get(other), C = b.byC.get(f.cat) || b.byC.set(f.cat, [0, 0]).get(f.cat); P[side] += v; C[side] += v; };
    if (A) { const b = book(A); b.out += v; put(b, B ? B.id : '.', 0); }
    ra.exX = (ra.exX || 0) + v;
    if (B) { const b = book(B); b.inn += v; put(b, A ? A.id : '.', 1); }
  }
  // well-being before the state's balance weighs on it
  rows.forEach((r, k) => {
    const c = r.c, why = []; r.met = socMet(E, k); r.rich = mean > 0 ? r.inc / r.people / mean : 1;
    let w = 100; const add = (t, v) => { if (Math.abs(v) >= 0.5) { w += v; why.push([t, v]); } };
    r.metB = socMet(E, k, SOC_BASIC, true); r.metO = socMet(E, k, SOC_BASIC, false);
    add('ของพื้นฐานที่ยังขาด', -TU('basicWell') * (1 - r.metB)); add('ของอื่นที่ยังขาด', -TU('otherWell') * (1 - r.metO));
    add('รายได้ต่อหัวเทียบค่าเฉลี่ย', 8 * clamp(Math.log2(Math.max(0.01, r.rich)), -1, 1));
    add('องค์กรในเมือง', Math.min(15, 100 * orgWell(c)));
    add(EREG[c.reg][0], c.reg === 'sweat' ? -TU('regSweatWell') : c.reg === 'home' || c.reg === 'care' ? TU('regWell') : 0);
    if (c.pol) for (const t of c.pol.tools) add(EPOL[t][0], -c.pol.k * EPOL_COST[t][0]);
    r.well0 = clamp(w, 0, 100); r.wellWhy = why;
  });
  // visitors
  const top = Math.max(1e-9, ...E.cities.map(c => c.through || 0)), tRef = socTRef(E), far = Math.max(1e-6, TU('tourFar') * tRef), spend = TU('tourSpend') * mean, rate = TU('tourRate');
  const score = rows.map(r => {
    const c = r.c, d = socDemo(c.id); let og = 0; for (const o of c.org || []) og += o.kind === 'faith' ? 1 : o.kind === 'guild' || o.kind === 'assoc' ? 0.5 : 0.3;
    r.tourWhy = { att: c.att || 0, hub: Math.sqrt((c.through || 0) / top), rich: clamp(r.rich / 2, 0, 1) * r.well0 / 100, org: clamp(og / 2, 0, 1), charm: d.charm };
    return d.charm * (0.35 * r.tourWhy.att + 0.25 * r.tourWhy.hub + 0.2 * r.tourWhy.rich + 0.2 * r.tourWhy.org + 0.01) * (1 + polOn(c, 'tour') * TU('polTour')) * Math.sqrt(r.people);
  });
  const tin = new Float64Array(n), tout = new Float64Array(n), W = new Float64Array(n);
  if (rate > 0 && n > 1) for (let i = 0; i < n; i++) {
    const r = rows[i], G = r.people * rate * clamp(r.rich, 0.2, 3) * r.well0 / 100; if (!(G >= 0.5)) continue;
    let sum = 0; for (let j = 0; j < n; j++) { W[j] = 0; if (j === i) continue; const t = E.NT[i][j]; if (!isFinite(t) || ecoRival(r.s, rows[j].s)) continue; sum += W[j] = score[j] * Math.exp(-t / far); }
    if (!(sum > 0)) continue; tout[i] = G;
    for (let j = 0; j < n; j++) if (W[j] > 0) { const x = G * W[j] / sum; tin[j] += x; const A = r.s, B = rows[j].s; if (A !== B) { if (A) book(A).tourOut += x * spend; if (B) book(B).tourIn += x * spend; } }
  }
  rows.forEach((r, k) => { r.inc += (tin[k] - tout[k]) * spend; });
  // a state deep in deficit lives worse
  for (const b of books.values()) { const net = b.out + b.tourIn - b.inn - b.tourOut; b.net = net; b.def = b.gdp > 0 ? Math.max(0, -net) / b.gdp : 0; b.pen = clamp((b.def - TU('defFree')) * TU('defWell'), 0, TU('defMax')); b.stable = b.s.sys !== 'anar' && b.gdp > 0 && Math.abs(net) / b.gdp <= TU('balBand'); b.fx = ECON && ECON.fx ? ECON.fx.get(b.s.id) || 0 : 0; }
  rows.forEach(r => {
    const b = r.s ? books.get(r.s.id) : null, pen = b ? b.pen : 0, bon = b && b.stable ? TU('balWell') : 0; r.wellPen = pen; r.stable = !!(b && b.stable);
    if (pen >= 0.5) r.wellWhy.push(['รัฐขาดดุลการค้าหนัก', -pen]); if (bon >= 0.5) r.wellWhy.push(['รัฐค้าสมดุล', bon]);
    r.well = clamp(r.well0 - pen + bon, 0, 100);
    r.sur = b && b.net > 0 && b.out > 0 ? b.net * r.exX / b.out : 0;                                 // the city's part of its state's surplus
  });
  // people on the move
  const A = rows.map(r => Math.max(0.02, (r.well / 100) * Math.sqrt(clamp(r.rich, 0.2, 3)) * (r.c.reg === 'sweat' ? 0.85 : r.c.reg === 'care' ? 1.15 : 1)));
  const groups = new Map(); rows.forEach((r, k) => { const key = r.s || null; (groups.get(key) || groups.set(key, []).get(key)).push(k); });
  const mIn = new Float64Array(n), mOut = new Float64Array(n), sIn = new Float64Array(n), sOut = new Float64Array(n), mobile = rows.map((r, k) => { const d = socDemo(r.c.id); return base[k] * Math.min(0.6, (1 - d.nat) * d.mob); });
  const CLM = climEnsure(), tw = rows.map(r => CLM && CLM.tw ? CLM.tw[r.c.h] : 0), harsh = new Float64Array(n), move = TU('migMove'), abroad = TU('migWorld');
  for (const [s, ks] of groups) {
    let pw = 0, aw = 0; for (const k of ks) { pw += base[k]; aw += A[k] * base[k]; } const abar = pw > 0 ? aw / pw : 1;
    let pool = 0; for (const k of ks) { const o = mobile[k] * move * clamp((abar - A[k]) / abar + 0.25, 0.05, 1) * (rows[k].c.reg === 'sweat' ? 1.3 : 1) * (rows[k].stable ? 1 - TU('balStay') : 1); mOut[k] = o; pool += o; }
    const outs = []; let ws = 0; for (let j = 0; j < n; j++) { const o = rows[j].s || null; if (o === s || ecoRival(s, o)) continue; const w = A[j] * base[j]; outs.push([j, w]); ws += w; }
    const away = ws > 0 ? pool * abroad : 0, home = pool - away, mode = s && ESPREAD[s.spread] ? s.spread : 'nat';
    const wt = k => mode === 'clump' ? Math.pow(A[k] * base[k], 1.8) : mode === 'even' ? A[k] : A[k] * base[k];
    let hs = 0; for (const k of ks) hs += wt(k); if (hs > 0) for (const k of ks) mIn[k] += home * wt(k) / hs;
    for (const [j, w] of outs) mIn[j] += away * w / ws;
    if (mode === 'season') {                           // out of the hard winters for half the year, to the milder cities of the same state
      let warm = -Infinity; for (const k of ks) warm = Math.max(warm, tw[k]);
      for (const k of ks) harsh[k] = clamp((warm - tw[k]) / TU('seasSpan'), 0, 1);   // how much colder a city's winter is than the mildest of its state's
      let ms = 0; for (const k of ks) ms += base[k] * (1 - harsh[k]); if (!(ms > 0)) continue;
      for (const k of ks) { const o = mobile[k] * 0.5 * harsh[k]; if (!(o > 0)) continue; sOut[k] = o; for (const j of ks) if (j !== k) sIn[j] += o * base[j] * (1 - harsh[j]) / Math.max(1e-9, ms - base[k] * (1 - harsh[k])); }
    }
  }
  const T = { native: 0, moved: 0, season: 0, tour: 0 };
  rows.forEach((r, k) => {
    r.demo = { base: base[k], native: Math.max(0, base[k] - mOut[k]), in: mIn[k], out: mOut[k], seasIn: sIn[k], seasOut: sOut[k], tour: tin[k], tourOut: tout[k] };
    r.people = Math.max(1, Math.round(base[k] - mOut[k] + mIn[k] + (sIn[k] - sOut[k]) / 2));
    T.native += r.demo.native; T.moved += mOut[k]; T.season += sOut[k]; T.tour += tin[k];
  });
  SOC = { books, mean, spend, tot: T, rows };
  return rows;
}

// ---- the year, closed: slaves as a class of goods on the lines they are carried by, and the state of each state ----
function socYear(E) {
  ECAT.labor.v = 1;
  const rows = ecoIncome(ecoGdp()), S = SLAVE, unit = ECO.unit, per = ECO.central.per;
  for (let k = 0; k < E.cities.length; k++) { E.MK[k].labor = [0, 0, 0, 0]; E.P0[k].labor = 1; E.P1[k].labor = 1; }
  if (S && S.flows.length && unit > 0 && per > 0) {
    ECAT.labor.v = Math.max(0.01, S.price * unit / per);                                          // a person's price, in the measure every other load is priced in
    for (const f of S.flows) {
      const amt = f.n / unit; if (!(amt > 0)) continue;
      E.flows.push({ from: f.a, to: f.b, cat: 'labor', amt, goods: { slaves: amt }, cost: f.t, via: null, broker: -1, hub: false, org: null, way: f.way, by: f.by === 'none' ? 'caravan' : f.by, people: f.n });
      E.MK[f.a].labor[3] += amt; E.MK[f.b].labor[2] += amt; E.MK[f.b].labor[1] += amt;
      for (const [li, dir] of f.way) { const L = E.links[li]; L.vol += amt; if (dir > 0) L.fwd += amt; else L.back += amt; L.cats.set('labor', (L.cats.get('labor') || 0) + amt); L.goods.set('slaves', (L.goods.get('slaves') || 0) + amt); let cd = L.cdir.get('labor'); if (!cd) L.cdir.set('labor', cd = [0, 0]); cd[dir > 0 ? 0 : 1] += amt; }
    }
  }
  const st = new Map(); if (SOC) for (const [id, b] of SOC.books) st.set(id, { def: b.def, net: b.net, gdp: b.gdp, byC: b.byC });
  E.soc = { states: st, rows: rows.length };
}
// A state in deficit acts, and the year is worked out once more with what it does. The first working shows how deep each
// state's deficit is and in which classes of goods; the deeper it is, the more of the state's tools come in, in its own order.
function polPlan(E) {
  if (!ECOX.on || !E || !E.soc) return null; const plan = new Map(), start = TU('polStart'), full = Math.max(start + 0.01, TU('polFull'));
  for (const [id, b] of E.soc.states) {
    const s = ECOX.byKey.get(id), list = polList(s); if (!s || !list.length || !(b.def > start)) continue;
    const k = clamp((b.def - start) / (full - start), 0.2, 1), use = Math.max(1, Math.ceil(k * list.length));
    const top = [...b.byC].map(([cat, v]) => [cat, v[1] - v[0]]).filter(x => x[1] > 0 && !ECAT[x[0]].people).sort((x, y) => y[1] - x[1]).slice(0, 3).map(x => x[0]);
    plan.set(id, { k, tools: new Set(list.slice(0, use)), top: new Set(top), def1: b.def, net1: b.net });
  }
  return plan.size ? plan : null;
}
// The coin of a state in surplus hardens, and of one in deficit softens (the owner's choice, after the flow of money Hume
// described: from memory, not looked up). Worked out from the first working of the year, used in the second.
function fxPlan(E) {
  if (!ECOX.on || !E || !E.soc || !(TU('fxBal') > 0)) return null; const fx = new Map();
  for (const [id, b] of E.soc.states) { const s = ECOX.byKey.get(id); if (!s || s.sys === 'anar' || !(b.gdp > 0)) continue; const x = clamp(TU('fxBal') * b.net / b.gdp, -0.3, 0.3); if (Math.abs(x) >= 0.002) fx.set(id, x); }
  return fx.size ? fx : null;
}
const __ecSoc = econCompute;
econCompute = function () {
  POL = null; FXS = null; HARVL = null; let E = __ecSoc();
  const plan = polPlan(E), fx = fxPlan(E), lab = E.harvN && (plan || fx || harvMoved(E)) ? E.harvN : null;   // the hands on the land counted by class (v0.15.0) go into the second working
  if (plan || fx || lab) { POL = plan; FXS = fx; HARVL = lab; try { E = __ecSoc(); E.pol = plan; E.fx = fx; E.harvL = lab; } finally { POL = null; FXS = null; HARVL = null; } }
  else harvSettle(E);
  return E;
};
{ const ap = ecoApply; ecoApply = function () { ap(); GBY.set('slaves', { id: 'slaves', name: 'ทาส', cat: 'labor' }); }; GBY.set('slaves', { id: 'slaves', name: 'ทาส', cat: 'labor' }); }

// ---- the document ----
{
  const ld = ecoLoad, sr = ecoSerial;
  ecoLoad = function (b) {
    ld(b); b = b || {};
    ECO.regime = {}; for (const [id, k] of Object.entries(b.regime || {}).slice(0, 4000)) if (EREG[k] && k !== 'shift') ECO.regime[ecoStr(id, 120)] = k;
    ECO.demo = {}; for (const [id, o] of Object.entries(b.demo || {}).slice(0, 4000)) { if (!o || typeof o !== 'object') continue; const d = {}; if (o.nat != null) d.nat = ecoNum(o.nat, 0.3, 0.99, 0.8); if (o.mob != null) d.mob = ecoNum(o.mob, 0, 3, 1); if (o.charm != null) d.charm = ecoNum(o.charm, 0, 5, 1); if (Object.keys(d).length) ECO.demo[ecoStr(id, 120)] = d; }
    const by = new Map((Array.isArray(b.states) ? b.states : []).filter(s => s && typeof s.id === 'string').map(s => [s.id, s]));
    for (const s of ECO.states) { const o = by.get(s.id) || {}; s.spread = ESPREAD[o.spread] ? o.spread : 'nat'; s.reg = EREG[o.reg] && o.reg !== 'shift' ? o.reg : ''; s.pol = Array.isArray(o.pol) ? o.pol.filter(k => EPOL[k]).slice(0, 8) : null; s.pol1 = EPOL[o.pol1] ? o.pol1 : ''; }
  };
  ecoSerial = function () {
    const o = sr(); if (Object.keys(ECO.regime).length) o.regime = { ...ECO.regime }; if (Object.keys(ECO.demo).length) o.demo = JSON.parse(JSON.stringify(ECO.demo));
    return o;
  };
}

// ---- on the screen ----
const socN = x => { const v = Math.round(x); return Math.abs(v) < 1e6 ? v.toLocaleString('en-US') : ecoNumF(v); }, socPts = v => (v >= 0 ? '+' : '−') + Math.abs(Math.round(v));
const socOpt = (table, cur, first) => (first != null ? `<option value="">${first}</option>` : '') + Object.entries(table).map(([k, z]) => `<option value="${k}"${k === cur ? ' selected' : ''}>${z[0]}</option>`).join('');
function socStateForm(s) {                           // a state's choices: how incomers spread, the order of work, and what it does about a deficit
  if (s.sys === 'anar') return `<div class="tr w">ดินแดนที่ไม่มีรัฐไม่มีนโยบายดุลการค้า คนย้ายเข้าตามแรงดึงดูดของแต่ละเมือง</div>`;
  const on = new Set(Array.isArray(s.pol) ? s.pol : EPOL_SYS[s.sys] || []), list = polList(s), b = SOC && SOC.books.get(s.id), dis = editable ? '' : ' disabled';
  let h = ecoIn('การกระจายตัวของคนย้ายเข้า', `<select data-f="sspread"${dis}>${socOpt(ESPREAD, s.spread || 'nat')}</select>`) + `<div class="tr w">${ESPREAD[s.spread || 'nat'][1]}</div>`
    + ecoIn('ระเบียบงานของโรงงานในรัฐ', `<select data-f="sreg"${dis}>${socOpt(EREG, s.reg || 'shift')}</select>`) + `<div class="tr w">${EREG[s.reg || 'shift'][1]} เมืองที่ตั้งระเบียบของตัวเองในการ์ดเมืองใช้ของตัวเอง</div>`
    + `<div class="tr">สิ่งที่รัฐทำเมื่อขาดดุลการค้า <span class="w">ใช้ข้อแรกก่อน ยิ่งขาดดุลลึกยิ่งใช้หลายข้อ ชี้ที่ชื่อเพื่อดูผลดีและผลเสีย</span></div><div class="polset">`
    + Object.entries(EPOL).map(([k, z]) => `<label title="${esc(z[1] + ' ข้อเสีย: ' + z[2])}"><input type="checkbox" data-f="spol" data-k="${k}"${on.has(k) ? ' checked' : ''}${dis}> ${z[0]}</label>`).join('') + `</div>`
    + (list.length > 1 ? ecoIn('ใช้ข้อไหนก่อน', `<select data-f="spol1"${dis}>${list.map((k, i) => `<option value="${k}"${i === 0 ? ' selected' : ''}>${EPOL[k][0]}</option>`).join('')}</select>`) : '')
    + (!list.length ? `<div class="tr w">รัฐนี้ไม่แทรกแซง ปล่อยให้ขาดดุลหรือเกินดุลตามการค้า</div>` : '');
  if (b) h += `<div class="tr w">${socBalanceLine(b)}</div>`;
  return h;
}
function socBalanceLine(b) {
  const p = b.plan, pc = x => ecoPc(x) + '%';
  let t = (b.net >= 0 ? `ปีนี้เกินดุล ${socN(b.net)} ${esc(ECO.central.name)}` : `ปีนี้ขาดดุล ${socN(-b.net)} ${esc(ECO.central.name)} คิดเป็น ${pc(b.def)} ของ GDP`) + ' (สินค้ารวมเงินนักท่องเที่ยว)';
  if (p) t += ` หลังใช้${[...p.tools].map(k => EPOL[k][0]).join(' ')}ที่กำลัง ${pc(p.k)} (ก่อนใช้ขาดดุล ${pc(p.def1)})`;
  if (b.pen >= 0.5) t += ` ความเป็นอยู่ของทุกเมืองในรัฐลด ${Math.round(b.pen)} แต้ม`;
  return t;
}
$('ecobody').addEventListener('change', e => {
  const el = e.target, f = el && el.dataset ? el.dataset.f : ''; if (!editable || !f) return;
  const box = el.closest('[data-s]'), s = box ? ECO.states.find(x => x.id === box.dataset.s) : null; if (!s) return;
  if (f === 'sspread') s.spread = ESPREAD[el.value] ? el.value : 'nat';
  else if (f === 'sreg') s.reg = EREG[el.value] && el.value !== 'shift' ? el.value : '';
  else if (f === 'spol') { const on = new Set(Array.isArray(s.pol) ? s.pol : EPOL_SYS[s.sys] || []); if (el.checked) on.add(el.dataset.k); else on.delete(el.dataset.k); s.pol = Object.keys(EPOL).filter(k => on.has(k)); if (s.pol1 && !on.has(s.pol1)) s.pol1 = ''; }
  else if (f === 'spol1') s.pol1 = EPOL[el.value] ? el.value : '';
  else return;
  ecoChanged(false); ecoRender();
});
$('ecobody').addEventListener('click', e => {
  const el = e.target.closest ? e.target.closest('[data-a]') : null; if (!el) return; const a = el.dataset.a;
  if (a === 'stfold') { for (const s of ECO.states) GDPV['st' + s.id] = +el.dataset.v; gdpKeep(); ecoRender(); }
  else if (a === 'psort') { const k = el.dataset.k; if (GDPV.pk === k) GDPV.pd = GDPV.pd > 0 ? -1 : 1; else { GDPV.pk = k; GDPV.pd = k === 'name' ? 1 : -1; } gdpKeep(); ecoRender(); }
});
// the GDP tab: who lives where, who visits, and how each state's books stand
function socGdpHTML() {
  if (!ECON) return ''; const rows = ecoIncome(ecoGdp()); if (!rows.length || !SOC) return '';
  const fold = (id, title, body) => `<details class="efold" data-fold="${id}"${GDPV[id] ? ' open' : ''}><summary>${title}</summary>${body}</details>`, T = SOC.tot, coin = esc(ECO.central.name);
  const SK = { name: ['เมือง', r => r.c.name], well: ['อยู่ดี', r => r.well], native: ['ดั้งเดิม', r => r.demo.native], in: ['ย้ายเข้า', r => r.demo.in + r.demo.seasIn], out: ['ย้ายออก', r => r.demo.out + r.demo.seasOut], tour: ['นักท่องเที่ยว', r => r.demo.tour] };
  const sk = SK[GDPV.pk] ? GDPV.pk : 'tour', dir = GDPV.pd > 0 ? 1 : -1, arrow = k => k === sk ? (dir > 0 ? ' ▲' : ' ▼') : '';
  const list = rows.slice().sort((a, b) => sk === 'name' ? dir * a.c.name.localeCompare(b.c.name, 'th') : dir * (SK[sk][1](a) - SK[sk][1](b)) || a.c.name.localeCompare(b.c.name, 'th'));
  const wellAvg = rows.reduce((a, r) => a + r.well * r.people, 0) / Math.max(1, rows.reduce((a, r) => a + r.people, 0));
  let h = fold('gpp', `ประชากร การย้ายถิ่น และนักท่องเที่ยว <small>${rows.length} แถว</small>`,
    `<div class="tr">ผู้อยู่อาศัยดั้งเดิม <b>${socN(T.native)}</b> คน ย้ายถิ่นในปีนี้ <b>${socN(T.moved)}</b> คน${T.season >= 0.5 ? ` ย้ายตามฤดู <b>${socN(T.season)}</b> คน` : ''} นักท่องเที่ยว <b>${socN(T.tour)}</b> คนต่อปี ความเป็นอยู่เฉลี่ย <b>${Math.round(wellAvg)}</b> จาก 100</div>`
    + `<div class="etable g5 g7"><div class="eth sortable">${Object.entries(SK).map(([k, v]) => `<span data-a="psort" data-k="${k}" title="กดเพื่อเรียงตามช่องนี้">${v[0]}${arrow(k)}</span>`).join('')}</div><div class="eth"><span></span><span>อยู่ดี</span><span>ดั้งเดิม</span><span>ย้ายเข้า</span><span>ย้ายออก</span><span>นักท่องเที่ยว</span><span>ค่าแรง</span></div>`
    + list.map(r => `<div class="etr"><span>${r.s ? `<i class="sdot" style="background:${r.s.color}"></i>` : ''}${esc(r.c.name)}${r.c.reg !== 'shift' ? ` <em>${EREG[r.c.reg][0]}</em>` : ''}${r.c.land && r.c.land.lack >= 0.05 ? ` <em>ที่ดินขาด ${ecoPc(r.c.land.lack)}%</em>` : ''}</span><span>${Math.round(r.well)}</span><span>${socN(r.demo.native)}</span><span>${socN(r.demo.in + r.demo.seasIn)}</span><span>${socN(r.demo.out + r.demo.seasOut)}</span><span>${socN(r.demo.tour)}</span><span>${r.c.lab >= 0.005 ? 'ถูก ' + ecoPc(r.c.lab) + '%' : r.c.lab <= -0.005 ? 'แพง ' + ecoPc(-r.c.lab) + '%' : 'กลาง'}</span></div>`).join('') + `</div>`
    + `<p class="note">ผู้อยู่อาศัยดั้งเดิมคือคนของเมืองที่ยังอยู่ คนย้ายออกจากเมืองที่ความเป็นอยู่และรายได้ต่ำกว่าค่าเฉลี่ยของรัฐไปเมืองที่ดีกว่า ร้อยละ ${ecoPc(TU('migWorld'))} ไปนอกรัฐ นักท่องเที่ยวไม่นับเป็นประชากร แต่ละคนใช้เงินราว ${ecoNumF(SOC.spend)} ${coin} ในเมืองที่ไป แรงดึงดูดนักท่องเที่ยวมาจากสี่อย่าง: สิ่งดึงดูดรอบเมืองในสามช่อง ความเป็นชุมทางการค้า ความมั่งคั่งกับความเป็นอยู่ และองค์กรในเมือง คูณด้วยเสน่ห์ของเมืองที่สุ่มไว้ ค่าแรงถูกหมายถึงโรงงานผลิตได้มากขึ้นและคาราวานรอบเมืองถูกลง ระเบียบงาน สัดส่วนคนดั้งเดิม และเสน่ห์ของเมือง ตั้งได้ในการ์ดของเมืองในโหมดการค้า</p>`);
  if (SOC.books.size) {
    const bs = [...SOC.books.values()].sort((a, b) => a.net - b.net);
    h += fold('gbl', `ดุลการค้าของรัฐและนโยบาย <small>${bs.length} แถว</small>`, `<div class="etable g5"><div class="eth"><span>รัฐ</span><span>ส่งออก</span><span>นำเข้า</span><span>ดุล</span><span>ต่อ GDP</span></div>`
      + bs.map(b => `<div class="etr"><span><i class="sdot" style="background:${b.s.color}"></i><button type="button" class="lnk" data-sopen="${b.s.id}" title="เปิดการ์ดตั้งค่าของรัฐ">${esc(b.s.name)}</button>${b.plan ? ` <em>${[...b.plan.tools].map(k => EPOL[k][0]).join(' ')}</em>` : ''}${b.pen >= 0.5 ? ` <em>ความเป็นอยู่ลด ${Math.round(b.pen)}</em>` : ''}${b.lost >= 1 ? ` <em>ถูกกดราคา ${socN(b.lost)}</em>` : ''}${b.won >= 1 ? ` <em>กดราคาได้ ${socN(b.won)}</em>` : ''}</span><span>${socN(b.out + b.tourIn)}</span><span>${socN(b.inn + b.tourOut)}</span><span class="${b.net >= 0 ? 'pos' : 'neg'}">${(b.net >= 0 ? '+' : '−') + socN(Math.abs(b.net))}</span><span>${b.gdp > 0 ? (b.net >= 0 ? '+' : '−') + ecoPc(Math.abs(b.net) / b.gdp) + '%' : ''}</span></div>`).join('') + `</div>`
      + `<p class="note">ดุลนับสินค้าที่ข้ามเขตรัฐตามราคาในเมืองที่ซื้อ รวมเงินที่นักท่องเที่ยวต่างรัฐใช้ ไม่นับการซื้อขายทาส รัฐที่ขาดดุลเกินร้อยละ ${ecoPc(TU('defFree'))} ของ GDP เสียความเป็นอยู่ และรัฐที่ขาดดุลเกินร้อยละ ${ecoPc(TU('polStart'))} เริ่มใช้นโยบายที่ติ๊กไว้ในแท็บรัฐและเขตแดน รัฐที่ใหญ่กว่า (วัดด้วย GDP) กดราคาของที่ซื้อจากรัฐติดกันที่เล็กกว่าและไม่ใช่พันธมิตร</p>`);
  }
  return h;
}
{ const g = ecoGdpHTML; ecoGdpHTML = function () { return g() + socGdpHTML(); }; }
// a city's card in the trade view: its people, how well it lives and why, the order of its workshops, and the lot it drew
function socCityHTML(k) {
  const rows = ecoIncome(ecoGdp()), r = rows[k]; if (!r || !r.demo) return ''; const c = r.c, d = socDemo(c.id), D = r.demo, dis = editable ? '' : ' disabled', own = ECO.regime[c.id] || '';
  let h = `<h3>ประชากรและความเป็นอยู่</h3><div class="tr">ผู้อยู่อาศัย <b>${socN(r.people)}</b> คน <span class="w">ดั้งเดิม ${socN(D.native)} · ย้ายเข้า ${socN(D.in)} · ย้ายออก ${socN(D.out)}${D.seasIn + D.seasOut >= 0.5 ? ` · ตามฤดู เข้า ${socN(D.seasIn)} ออก ${socN(D.seasOut)}` : ''}</span></div>`
    + `<div class="tr">นักท่องเที่ยว <b>${socN(D.tour)}</b> คนต่อปี <span class="w">คนของเมืองออกไปเที่ยว ${socN(D.tourOut)} · สิ่งดึงดูด ${ecoPc(r.tourWhy.att)}% ชุมทาง ${ecoPc(r.tourWhy.hub)}% มั่งคั่ง ${ecoPc(r.tourWhy.rich)}% องค์กร ${ecoPc(r.tourWhy.org)}%</span></div>`
    + `<div class="tr">ความเป็นอยู่ <b>${Math.round(r.well)}</b> จาก 100 <span class="w">${r.wellWhy.filter(x => Math.abs(x[1]) >= 0.5).map(x => `${x[0]} ${socPts(x[1])}`).join(' · ') || 'ความต้องการครบ'}</span></div>`
    + `<div class="tr">ค่าแรง <b>${c.lab >= 0.005 ? 'ถูกกว่าค่ากลาง ' + ecoPc(c.lab) + '%' : c.lab <= -0.005 ? 'แพงกว่าค่ากลาง ' + ecoPc(-c.lab) + '%' : 'ค่ากลาง'}</b> <span class="w">โรงงานผลิต ×${c.work.toFixed(2)} · เก็บเกี่ยวรอบเมืองได้ไกล ${c.reach} ช่อง</span></div>`;
  if (c.land && c.land.lack >= 0.01) h += `<div class="tr">ที่ดินไม่พอ <b>${ecoPc(c.land.lack)}%</b> <span class="w">เมืองจึงผลิตอาหารได้ ${ecoPc(c.foodCut)}% ของที่ผืนดินให้ ส่วนที่ขาดต้องซื้อเข้า</span></div>`;
  h += `<div class="optrow"><span class="lbl">ระเบียบงานของโรงงาน</span><select data-sf="reg"${dis}>${socOpt(EREG, own, 'ตามรัฐ' + (c.sto && c.sto.reg ? ' (' + EREG[c.sto.reg][0] + ')' : ' (โรงงานกะเดียว)'))}</select></div><div class="tr w">${EREG[c.reg][1]}</div>`
    + `<div class="optrow soclot"><label title="ส่วนของคนในเมืองที่ตั้งรกรากและไม่ย้าย">ดั้งเดิม <input type="number" data-sf="nat" min="30" max="99" step="1" value="${Math.round(d.nat * 100)}"${dis}>%</label><label title="คนที่ไม่ได้ตั้งรกรากพร้อมย้ายแค่ไหน 1 คือค่ากลาง">พร้อมย้าย <input type="number" data-sf="mob" min="0" max="3" step="0.1" value="${d.mob.toFixed(1)}"${dis}></label><label title="เสน่ห์ของเมืองต่อนักท่องเที่ยว 1 คือค่ากลาง">เสน่ห์ <input type="number" data-sf="charm" min="0" max="5" step="0.1" value="${d.charm.toFixed(1)}"${dis}></label><button type="button" class="btn" data-sf="dice"${dis}>สุ่มใหม่</button></div>`
    + `<div class="tr w">สามค่านี้เมืองได้มาจากการสุ่มตอนสร้างเมือง${ECO.demo[c.id] ? ' และถูกตั้งเองแล้ว' : ''}</div>`;
  return h;
}
{
  const t = tradeCityHTML; tradeCityHTML = function (k) { const h = t(k), add = socCityHTML(k), at = h.indexOf('<!--prod-->'); return at >= 0 ? h.slice(0, at) + add + h.slice(at) : h + add; };
  const set = el => {
    if (!editable || !tsel) return false; const f = el.dataset.sf, id = tsel;
    if (f === 'reg') { if (EREG[el.value]) ECO.regime[id] = el.value; else delete ECO.regime[id]; }
    else if (f === 'dice') ECO.demo[id] = { nat: +(0.6 + 0.35 * Math.random()).toFixed(2), mob: +(0.5 + Math.random()).toFixed(1), charm: +(0.5 + Math.random()).toFixed(1) };
    else if (f === 'nat' || f === 'mob' || f === 'charm') { const d = socDemo(id), v = +el.value; if (!Number.isFinite(v)) return false; d[f] = f === 'nat' ? clamp(v / 100, 0.3, 0.99) : clamp(v, 0, f === 'mob' ? 3 : 5); ECO.demo[id] = d; }
    else return false;
    ecoChanged(false); renderTradeCard(); return true;
  };
  $('tradebody').addEventListener('change', e => { const el = e.target; if (el && el.dataset && el.dataset.sf && el.dataset.sf !== 'dice') set(el); });
  $('tradebody').addEventListener('click', e => { const el = e.target.closest ? e.target.closest('[data-sf="dice"]') : null; if (el) set(el); });
}
// a state's card in the trade view: the same books the model works from
function socStateCardHTML(s) {
  ecoIncome(ecoGdp()); const b = SOC && SOC.books.get(s.id); if (!b) return '';
  const coin = esc(ECO.central.name), nm = id => { const o = ECOX.byKey.get(id); return o ? esc(o.name) : 'เมืองที่ไม่ขึ้นกับรัฐใด'; };
  let h = `<h4>ดุลของรัฐในปีนี้</h4><div class="tr">${socBalanceLine(b)}</div>`;
  if (b.tourIn + b.tourOut >= 1) h += `<div class="tr w">นักท่องเที่ยวต่างรัฐใช้เงินในรัฐ ${socN(b.tourIn)} ${coin} คนของรัฐออกไปใช้นอกรัฐ ${socN(b.tourOut)} ${coin}</div>`;
  if (b.lost >= 1) h += `<div class="tr w">ถูกรัฐที่ใหญ่กว่ากดราคา เสีย ${socN(b.lost)} ${coin}: ${[...b.sq].map(([id, v]) => nm(id) + ' ' + socN(v)).join(' · ')}</div>`;
  if (b.won >= 1) h += `<div class="tr w">กดราคารัฐติดกันที่เล็กกว่าได้ ${socN(b.won)} ${coin}</div>`;
  if (b.plan) h += `<div class="tr w">กำลังใช้: ${[...b.plan.tools].map(k => `${EPOL[k][0]} (${EPOL[k][2]})`).join(' · ')}${b.plan.top.size ? ' หมวดที่ซื้อเข้ามากที่สุด: ' + [...b.plan.top].map(c => esc(ECAT[c].name)).join(' ') : ''}</div>`;
  if (b.def > TU('polStart')) h += `<div class="tr w">ยังขาดดุลอยู่ ทางที่เหลือ: ติ๊กนโยบายเพิ่มในแท็บรัฐและเขตแดน ปรับอัตราแลกเงิน ผูกพันธมิตรกับรัฐที่กดราคา หรือเป็นทางสุดท้าย ตั้งองค์กรที่เพิ่มผลผลิตหรือลดค่าขนในเมืองของรัฐ</div>`;
  return h;
}
$('tradebody').addEventListener('click', e => {      // the city's tables: a column clicked sets the order
  const el = e.target.closest ? e.target.closest('[data-ts]') : null; if (!el) return; const [kind, k] = el.dataset.ts.split(':'), key = kind === 'p' ? 'pk' : 'ck', dk = kind === 'p' ? 'pd' : 'cd';
  if (TCV[key] === k) TCV[dk] = TCV[dk] > 0 ? -1 : 1; else { TCV[key] = k; TCV[dk] = k === 'name' ? 1 : -1; } tcKeep(); renderTradeCard();
});
$('tradebody').addEventListener('toggle', e => { const d = e.target; if (d && d.dataset && d.dataset.tfold) { TCV[d.dataset.tfold] = d.open ? 1 : 0; tcKeep(); } }, true);

// ---------- classes (v0.14.0, the owner's four, measured by where the money comes from) ----------
// A city's year is split by its sources: the rent of land and mine goes mostly to the landlords, the profit of the workshops to
// the owners and the master craftsmen, the margins of trade and the visitors' money to the merchants, the pay of officials and
// soldiers to the middle, and what is left of each to those who work for wages. Who gets how much of rent and profit is the
// system's: a feudal lord takes most of the rent, a socialist state little of anything. Cheap hands lower wages and raise the
// profit; a long shift does the same, a welfare shift the reverse; home crafts leave the profit with the craftsmen. Those who
// find no work fall to the bottom and live on alms. A slave fares as well as the house that holds him, so the more of a city's
// money the top holds, the better its slaves live, better than the middle where the money sits high enough. All numbers mine.
const RENT_HI = { feud: 0.6, trad: 0.35, merc: 0.4, cap: 0.4, anar: 0.45, soc: 0.1, '': 0.35 };
const PROF_HI = { feud: 0.4, trad: 0.25, merc: 0.45, cap: 0.5, anar: 0.55, soc: 0.1, '': 0.35 };
const ADMIN = [0.12, 0.08, 0.05, 0.15, 0.02];                 // the share of what land and workshops make that pays officials and soldiers, by kind of city
const HI_N = [0.03, 0.02, 0.015, 0.015, 0.01], MID_N = [0.22, 0.18, 0.12, 0.25, 0.06];
const HI_SYS = { feud: 1.4, soc: 0.4, cap: 1.1, anar: 1.2 }, MID_SYS = { cap: 1.2, merc: 1.1, soc: 1.3, feud: 0.8, trad: 0.7 };
const CLS = { hi: 'ชนชั้นสูง', mid: 'ชนชั้นกลาง', low: 'ชนชั้นล่าง', poor: 'ล่างสุด', slave: 'ทาส' };
const CLS_WHO = { hi: 'ขุนนาง ราชวงศ์ เศรษฐี', mid: 'ข้าราชการ พ่อค้า ทหาร เจ้าของที่ดินรายย่อย', low: 'กรรมกร คนหาเช้ากินค่ำ กุลี คนงานโรงงาน', poor: 'ขอทาน คนไร้บ้าน', slave: '' };
function classSplit(c, P) {                          // the city's money by class, as shares that add up to one
  const sys = c.sto ? c.sto.sys : '', cut = clamp(c.lab || 0, -0.1, 0.5), reg = c.reg || 'shift';
  let hi = 0, mid = 0, low = 0;
  const rh = clamp((RENT_HI[sys] != null ? RENT_HI[sys] : 0.35) * (1 + cut), 0.02, 0.9); hi += P.rent * rh; mid += P.rent * (1 - rh) * 0.3; low += P.rent * (1 - rh) * 0.7;   // landlords, the small holders, and those who work the land
  const pf = clamp((PROF_HI[sys] != null ? PROF_HI[sys] : 0.35) + 0.6 * cut + (reg === 'sweat' ? 0.12 : reg === 'care' ? -0.08 : 0), 0.03, 0.85), prof = P.made * pf;
  if (reg === 'home') { hi += prof * 0.2; mid += prof * 0.8; } else { hi += prof * 0.6; mid += prof * 0.4; } mid += (P.made - prof) * 0.15; low += (P.made - prof) * 0.85;   // the foremen and clerks are paid more than the hands
  mid += P.comm * 0.75; hi += P.comm * 0.25 + P.slave;
  const sur = P.surplus || 0; hi += sur * 0.5; mid += sur * 0.5; low -= sur;
  const adm = ADMIN[c.ki] * (P.rent + P.made) * (sys === 'soc' ? 1.5 : 1); mid += adm; hi -= adm * 0.5; low -= adm * 0.5;
  hi = Math.max(0, hi); mid = Math.max(0, mid); low = Math.max(0, low);
  // Of each class, the share of its people who work the land (v0.15.0): read off what the land and the workshops make, before
  // anyone takes a cut, since a landlord's or a state's share leaves the hands in the field as many as they were. The small
  // holders against the officials, merchants and foremen of the middle; the hands in the fields against the hands at the benches.
  const lr = Math.max(0, P.rent), mr = Math.max(0, P.made), land = { mid: lr > 0 ? clamp(0.3 * lr / (0.3 * lr + 0.15 * mr + 0.75 * Math.max(0, P.comm) + adm), 0, 1) : 0, low: lr > 0 ? clamp(0.7 * lr / (0.7 * lr + 0.85 * mr), 0, 1) : 0 };
  const tot = hi + mid + low || 1, a = clamp((TU('alms') + 0.3 * orgWell(c)) * clamp((P.poorFrac == null ? 0.08 : P.poorFrac) / 0.08, 0, 3), 0, 0.25), top = hi + mid;
  const w = top > 0 ? { hi: hi / tot - a * hi / top, mid: mid / tot - a * mid / top, low: low / tot, poor: a } : { hi: 0, mid: 0, low: low / tot - a, poor: a };
  return { w, land };
}
function classHeads(c, free, held, metB) {           // the free people by class, as shares of them
  const sys = c.sto ? c.sto.sys : '', reg = c.reg || 'shift', hi = HI_N[c.ki] * (HI_SYS[sys] || 1), mid = MID_N[c.ki] * (MID_SYS[sys] || 1), rest = Math.max(0, 1 - hi - mid);
  const out = clamp(TU('jobless') + 0.4 * Math.max(0, c.lab || 0) + 0.6 * held / Math.max(1, free + held) + 0.3 * (1 - (metB == null ? 1 : metB)) + (reg === 'sweat' ? -0.02 : reg === 'home' ? -0.01 : 0), 0.01, 0.6);
  return { hi, mid, low: rest * (1 - out), poor: rest * out };
}
function socRich(cities, prod) {                     // before the year's trade: roughly how the money will fall, and what the country brings up from its own ground
  const dom = new Map();
  cities.forEach((c, k) => { const key = c.sto ? c.sto.id : '@' + k; let s = dom.get(key); if (!s) dom.set(key, s = new Set()); for (const [id, v] of prod[k]) if (v > 0.05) s.add(catOf(id)); });
  cities.forEach((c, k) => {
    let rent = 0; for (const [id, v] of prod[k]) { const cat = catOf(id); if (ECAT[cat]) rent += v * ECAT[cat].v; }
    const made = c.pop * EIND[c.ki] * 0.5 * (c.work || 1), sp = classSplit(c, { rent, made, comm: 0.03 * (rent + made), slave: 0, surplus: 0 });
    c.rich0 = sp.w.hi + sp.w.mid; c.dom = dom.get(c.sto ? c.sto.id : '@' + k);
  });
}
function classApply(rows) {
  const E = ECON; if (!E || !rows.length) return rows; const per = ECO.central.per, S = SLAVE;
  rows.forEach((r, k) => {
    const c = r.c; let rent = 0;
    for (const cat of ERAW) { const mk = E.MK[k][cat]; if (mk && ECAT[cat]) rent += mk[0] * (E.P1[k][cat] || 1) * ECAT[cat].v; }
    rent *= per; const made = Math.max(0, r.gdp - rent), held = r.slave ? r.slave.held : 0;
    const slaveInc = held && S ? held * S.mean * TU('slaveGain') * (r.slave.law === 'pat' ? 0.6 : 1) : 0, other = r.inc - r.gdp - slaveInc;
    const free = Math.max(1, r.people - held), H = classHeads(c, free, held, r.metB);
    const sp = classSplit(c, { rent, made, comm: Math.max(0, other), slave: slaveInc, surplus: Math.min(r.sur || 0, 0.8 * (rent + made)), poorFrac: H.poor });
    const inc = Math.max(0, r.inc), ph = inc / free, wellOf = (x, n) => n > 0.5 ? clamp((r.well == null ? 60 : r.well) + 12 * Math.log2(Math.max(1e-6, x / n) / Math.max(1e-6, ph)), 0, 100) : 0;
    const cls = {};
    for (const q of ['hi', 'mid', 'low', 'poor']) { const n = free * H[q], x = inc * sp.w[q]; cls[q] = { n, inc: x, well: wellOf(x, n) }; }
    cls.poor.well = Math.min(cls.poor.well, 30);
    cls.slave = { n: held, inc: 0, well: held ? clamp(TU('slvBase') + TU('slvTop') * sp.w.hi, 0, 100) : 0 };
    r.cls = cls; r.clsW = sp.w; r.clsLand = sp.land; r.rentSh = rent + made > 0 ? rent / (rent + made) : 1;
  });
  if (SOC) {                                         // each state's classes, and the whole map's
    const add = (G, r) => { for (const q in r.cls) { const a = G[q] || (G[q] = { n: 0, inc: 0, wn: 0 }); a.n += r.cls[q].n; a.inc += r.cls[q].inc; a.wn += r.cls[q].well * r.cls[q].n; } };
    SOC.cls = {}; for (const b of SOC.books.values()) b.cls = {};
    for (const r of rows) { add(SOC.cls, r); const b = r.s ? SOC.books.get(r.s.id) : null; if (b) add(b.cls, r); }
  }
  return rows;
}
function clsSum(G) {                                 // shares, wealth per head, well-being and the measure of inequality of a group of classes
  const qs = ['hi', 'mid', 'low', 'poor', 'slave'].filter(q => G[q] && G[q].n >= 0.5), n = qs.reduce((a, q) => a + G[q].n, 0), w = qs.reduce((a, q) => a + G[q].inc, 0);
  const out = {}; for (const q of qs) { const g = G[q]; out[q] = { n: g.n, p: n > 0 ? g.n / n : 0, s: w > 0 ? g.inc / w : 0, ph: g.n > 0 ? g.inc / g.n : 0, well: g.wn != null ? (g.n > 0 ? g.wn / g.n : 0) : g.well }; }
  const ord = qs.slice().sort((a, b) => out[a].ph - out[b].ph); let L = 0, gini = 1;
  for (const q of ord) { const L2 = L + out[q].s; gini -= out[q].p * (L + L2); L = L2; }
  // where the money gathers: going down from the top, the class at which half of all the money has been counted
  let acc = 0, top = 'low'; for (const q of ['hi', 'mid']) { acc += out[q] ? out[q].s : 0; if (acc >= 0.5) { top = q; break; } }
  return { out, n, w, gini: clamp(gini, 0, 1), top };
}
function clsTableHTML(G) {
  const T = clsSum(G); if (!T.n) return '';
  return `<div class="etable g5c"><div class="eth"><span>ชนชั้น</span><span>คน</span><span>เงิน</span><span>ต่อหัว</span><span>อยู่ดี</span></div>`
    + ['hi', 'mid', 'low', 'poor', 'slave'].filter(q => T.out[q]).map(q => { const o = T.out[q]; return `<div class="etr"><span title="${CLS_WHO[q]}">${CLS[q]}</span><span>${ecoPc(o.p)}%</span><span>${q === 'slave' ? '' : ecoPc(o.s) + '%'}</span><span>${q === 'slave' ? '' : ecoNumF(o.ph)}</span><span>${Math.round(o.well)}</span></div>`; }).join('') + `</div>`;
}
// what the way the money falls does to a state, from the numbers the model works with
function clsVerdictHTML(G, rows, b) {
  const T = clsSum(G); if (!T.n) return ''; const o = T.out, top = T.top, coin = esc(ECO.central.name), L = [];
  const hp = o.hi ? o.hi.p : 0, hs = o.hi ? o.hi.s : 0, mp = hp + (o.mid ? o.mid.p : 0), ms = hs + (o.mid ? o.mid.s : 0);
  L.push((top === 'hi' ? `ความมั่งคั่ง (รายได้ต่อปี) <b>กระจุกที่ชนชั้นสูง</b>: คนร้อยละ ${ecoPc(hp)} ถือเงินร้อยละ ${ecoPc(hs)} เกินครึ่งของทั้งหมด`
    : top === 'mid' ? `ความมั่งคั่ง (รายได้ต่อปี) <b>กระจุกที่ชนชั้นสูงและกลาง</b>: คนร้อยละ ${ecoPc(mp)} ถือเงินร้อยละ ${ecoPc(ms)} (ชนชั้นสูงลำพังร้อยละ ${ecoPc(hs)})`
    : `ความมั่งคั่ง (รายได้ต่อปี) <b>กระจายถึงชนชั้นล่าง</b>: ชนชั้นสูงและกลางรวมกันถือเงินร้อยละ ${ecoPc(ms)} ไม่ถึงครึ่ง`)
    + ` · ดัชนีความเหลื่อมล้ำ <b>${T.gini.toFixed(2)}</b> <span class="w">(0 ทุกคนได้เท่ากัน 1 คนกลุ่มเดียวได้ทั้งหมด)</span>`);
  const ppl = rows.reduce((a, r) => a + r.people, 0) || 1, rich = rows.reduce((a, r) => a + (r.c.rich0 == null ? TU('richRef') : r.c.rich0) * r.people, 0) / ppl;
  L.push(`ชนชั้นสูงและกลางมีรายได้รวมร้อยละ ${ecoPc(rich)} ความต้องการของฟุ่มเฟือย (ของหายาก โลหะมีค่า ตำรา เครื่องกล สมุนไพร) จึงเป็น <b>×${clamp(rich / TU('richRef'), 0.2, 2.5).toFixed(2)}</b> ของค่ากลาง`);
  const c0 = rows[0] && rows[0].c, miss = b && c0 && c0.dom ? ERAW.filter(cat => ECAT[cat] && !SOC_BASIC.has(cat) && !SOC_LUX.has(cat) && rows.some(r => ENEED[cat] && ENEED[cat][r.c.ki] > 0) && !c0.dom.has(cat)) : [];
  if (miss.length) L.push(`${b ? 'รัฐนี้' : 'เมืองเหล่านี้'}ไม่มี${miss.map(c => esc(ECAT[c].name)).join(' ')}เอง คนที่ไม่มั่งคั่งจึงไม่ซื้อ ความต้องการเหลือราวร้อยละ ${ecoPc(rich)}`);
  if (b) L.push(`ของพื้นฐานจากนอกรัฐต้องถูกกว่าของในรัฐราวร้อยละ ${ecoPc(TU('homePref') * (1 - rich))} คนจึงยอมซื้อ`);
  if (o.slave && o.slave.n >= 1) L.push(`ทาส ${ecoNumF(Math.round(o.slave.n))} คน อยู่ดี <b>${Math.round(o.slave.well)}</b> ${o.mid && o.slave.well > o.mid.well ? '<b>ดีกว่าชนชั้นกลาง</b> (' + Math.round(o.mid.well) + ') เพราะเงินกระจุกอยู่กับชนชั้นสูงที่ถือทาส' : 'ต่ำกว่าชนชั้นกลาง (' + (o.mid ? Math.round(o.mid.well) : 0) + ') ยิ่งเงินไปกระจุกกับชนชั้นสูง ทาสยิ่งอยู่ดี'}`);
  if (o.poor) L.push(`ล่างสุด ร้อยละ ${ecoPc(o.poor.p)} ของคน อยู่ดี ${Math.round(o.poor.well)} อยู่ได้ด้วยทาน${o.low ? ` ชนชั้นล่างอยู่ดี ${Math.round(o.low.well)}` : ''}`);
  if (b) {
    if (b.net > 0 && b.gdp > 0) L.push(`เกินดุล ${socN(b.net)} ${coin} เงินส่วนเกินไหลเข้าชนชั้นสูงและกลางที่ค้าขาย${b.fx > 0.001 ? ` และค่าเงินแข็งขึ้นร้อยละ ${ecoPc(b.fx)} ของส่งออกจึงแพงขึ้นในสายตาต่างรัฐ ของนำเข้าถูกลง` : ''}`);
    else if (b.net < 0 && b.fx < -0.001) L.push(`ขาดดุล ค่าเงินอ่อนลงร้อยละ ${ecoPc(-b.fx)} ของส่งออกขายง่ายขึ้น ของนำเข้าแพงขึ้น`);
    if (b.stable) L.push(`ค้าสมดุล ความเป็นอยู่ +${TU('balWell')} และคนย้ายออกน้อยลงร้อยละ ${ecoPc(TU('balStay'))}`);
  }
  return `<div class="clsv">${L.map(t => `<div class="tr">${t}</div>`).join('')}</div>`;
}
function clsGdpHTML() {
  if (!ECON || !SOC || !SOC.cls) return ''; const rows = ecoIncome(ecoGdp());
  let h = `<div class="clsgrp"><h4>ทั้งแผนที่</h4>${clsTableHTML(SOC.cls)}${clsVerdictHTML(SOC.cls, rows, null)}</div>`;
  for (const b of [...SOC.books.values()].sort((x, y) => y.gdp - x.gdp)) if (b.cls) h += `<div class="clsgrp"><h4><i class="sdot" style="background:${b.s.color}"></i>${esc(b.s.name)} <small>${ESYS[b.s.sys][0]}</small> <button type="button" class="lnk" data-sopen="${b.s.id}">เปิดการ์ดรัฐ</button></h4>${clsTableHTML(b.cls)}${clsVerdictHTML(b.cls, rows.filter(r => r.s === b.s), b)}</div>`;
  return `<details class="efold" data-fold="gcl"${GDPV.gcl ? ' open' : ''}><summary>ชนชั้นและความมั่งคั่ง <small>${SOC.books.size + 1} กลุ่ม</small></summary>${h}<p class="note">ชนชั้นวัดจากแหล่งรายได้ของเมือง: ค่าเช่าที่ดินและเหมือง กำไรโรงงาน ส่วนต่างการค้าและเงินนักท่องเที่ยว เงินเดือนข้าราชการและทหาร และค่าแรง ส่วนแบ่งของแต่ละก้อนขึ้นกับระบอบ ค่าแรงที่ถูก ระเบียบงาน ทาส และเงินเกินดุล คนที่ไม่มีงานเป็นชนชั้นล่างสุดและอยู่ด้วยทาน ชี้ที่ชื่อชนชั้นเพื่อดูว่าใครอยู่ในชั้นนั้น ตัวเลขทั้งหมดอยู่ในแท็บตัวเลข หมวดชนชั้น</p></details>`;
}
{ const g = ecoGdpHTML; ecoGdpHTML = function () { return g() + clsGdpHTML(); }; }
{
  const t = tradeCityHTML; tradeCityHTML = function (k) {
    let h = t(k); const rows = ecoIncome(ecoGdp()), r = rows[k]; if (!r || !r.cls) return h;
    const G = {}; for (const q in r.cls) G[q] = { n: r.cls[q].n, inc: r.cls[q].inc, wn: r.cls[q].well * r.cls[q].n };
    const add = `<h3>ชนชั้นในเมือง</h3>${clsTableHTML(G)}`, at = h.indexOf('<!--prod-->'); return at >= 0 ? h.slice(0, at) + add + h.slice(at) : h + add;
  };
  const st = socStateCardHTML; socStateCardHTML = function (s) { let h = st(s); const b = SOC && SOC.books.get(s.id); if (b && b.cls) { const rows = ecoIncome(ecoGdp()).filter(r => r.s === s); h += `<h4>ชนชั้นและความมั่งคั่ง</h4>${clsTableHTML(b.cls)}${clsVerdictHTML(b.cls, rows, b)}`; } return h; };
}

// ---------- a city's reach, on the map (v0.14.0): the land it works for its goods, and the farther land it sends out to ----------
let reachKey = '', reachP = null;
function reachSel() { if (!ECON || !ECON.hin) return -1; const id = mode === 'trade' ? tsel : mode === 'city' ? sel : null; return id ? ECON.cities.findIndex(c => c.id === id) : -1; }
function reachOf(k) {
  const key = ECON.ver + '|' + k; if (key === reachKey && reachP) return reachP; reachKey = key;
  const fi = new Path2D(), fo = new Path2D(), ei = new Path2D(), eo = new Path2D(), I = ECON.hin, O = ECON.hout; let ni = 0, no = 0;
  for (let i = 0; i < N; i++) {
    const a = I[i] === k, b = O[i] === k; if (!a && !b) continue; if (isW(eff(i))) continue;
    if (a) ni++; else no++; hexPath(a ? fi : fo, i, 1);
    for (let j = 0; j < 6; j++) { const v = NB[i * 6 + j], same = v >= 0 && !isW(eff(v)) && (a ? I[v] === k : I[v] === k || O[v] === k); if (same) continue; const e = EDGE[j], e2 = (e + 1) % 6, P = a ? ei : eo; P.moveTo(CX[i] + R * COS[e], CY[i] + R * SIN[e]); P.lineTo(CX[i] + R * COS[e2], CY[i] + R * SIN[e2]); }
  }
  return reachP = { fi, fo, ei, eo, ni, no };
}
function reachDraw() {
  const k = reachSel(); if (k < 0) return; const P = reachOf(k), px = 1 / view.s;
  ctx.save(); ctx.setTransform(dpr * view.s, 0, 0, dpr * view.s, dpr * view.x, dpr * view.y); ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(255,206,110,.1)'; ctx.fill(P.fo); ctx.fillStyle = 'rgba(255,206,110,.28)'; ctx.fill(P.fi);
  ctx.lineCap = 'round'; ctx.setLineDash([Math.max(1.5, 4 * px), Math.max(1.5, 4 * px)]); ctx.strokeStyle = 'rgba(255,214,130,.7)'; ctx.lineWidth = Math.max(0.4, 1.2 * px); ctx.stroke(P.eo);
  ctx.setLineDash([]); ctx.strokeStyle = 'rgba(30,20,8,.75)'; ctx.lineWidth = Math.max(0.8, 3.4 * px); ctx.stroke(P.ei); ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = Math.max(0.5, 1.8 * px); ctx.stroke(P.ei);
  ctx.restore();
}
{ const under = drawUnderNames; drawUnderNames = function () { if (under) under(); reachDraw(); }; }
{ const t = tradeCityHTML; tradeCityHTML = function (k) { const h = t(k); if (!ECON || !ECON.hin) return h; const P = reachOf(k), c = ECON.cities[k], line = `<div class="tr">เก็บเกี่ยวรอบเมือง <b>${P.ni}</b> ช่อง ไกลสุด ${c.reach} ช่อง <span class="w">และอีก ${P.no} ช่องที่ส่งคนไปหาของบางอย่าง เช่น ไม้ แร่ และของป่า (กรอบทองทึบกับกรอบประบนแผนที่)</span></div>`, at = h.indexOf('<h3>ประชากรและความเป็นอยู่</h3>'); return at >= 0 ? h.slice(0, at) + line + h.slice(at) : h + line; }; }
{ const cf = ecoCityForm; ecoCityForm = function () { cf(); if (!sel || !ECON || !ECON.hin || !$('cfHint')) return; const k = ECON.cities.findIndex(c => c.id === sel); if (k < 0) return; const P = reachOf(k), tx = `เก็บเกี่ยวรอบเมือง ${P.ni} ช่อง ไกลสุด ${ECON.cities[k].reach} ช่อง (กรอบทองบนแผนที่)`, cur = $('cfHint').textContent.split(' · ').filter(x => !x.startsWith('เก็บเกี่ยวรอบเมือง')); $('cfHint').textContent = [...cur, tx].join(' · '); requestDraw(); }; }

// ---------- one card for each state, one card for each city (v0.14.0, the owner: easy, friendly, not scattered) ----------
// Everything about a state is set in one card in the states tab, in sections in the order a person thinks of them: what it is
// called and pays in, how it is ruled, how its people live and work, whom it deals with, what it does when it buys too much, and
// how its year went. The card's head carries the numbers worth a glance. From the trade map, a state's card has a button to open
// its settings, and from the settings a button to see it on the trade map. A city's card in the trade view folds by section.
const socStat = s => { const b = SOC && SOC.books.get(s.id); return b ? b : null; };
function stateChips(s, cnt) {
  const b = socStat(s), cs = b && b.cls ? clsSum(b.cls) : null, coin = esc(ECO.central.name);
  if (!b) return `<span class="chip0">${cnt || 0} ช่อง · ยังไม่มีเมือง</span>`;
  const r = b.gdp > 0 ? b.net / b.gdp : 0;
  return `<span class="chip0">${b.cities} เมือง</span><span class="chip0">${socN(b.people)} คน</span><span class="chip0" title="GDP ต่อปี">${ecoNumF(b.gdp)} ${coin}</span>`
    + `<span class="chip0 ${b.stable ? 'ok' : r >= 0 ? 'pos' : 'neg'}" title="ดุลการค้าต่อ GDP">${b.stable ? 'สมดุล' : r >= 0 ? 'เกินดุล' : 'ขาดดุล'} ${r >= 0 ? '+' : '−'}${ecoPc(Math.abs(r))}%</span>`
    + (cs ? `<span class="chip0" title="ดัชนีความเหลื่อมล้ำ 0 ถึง 1">เหลื่อมล้ำ ${cs.gini.toFixed(2)}</span>` : '');
}
ecoStatesHTML = function () {
  if (ECON) ecoIncome(ecoGdp());
  let h = `<div class="btns" style="margin:0 0 8px"><button type="button" class="btn" data-a="snew"${ECO.states.length >= 52 ? ' disabled' : ''}>เพิ่มรัฐ</button>${ECO.states.length > 1 ? `<button type="button" class="btn" data-a="stfold" data-v="0">พับทุกรัฐ</button><button type="button" class="btn" data-a="stfold" data-v="1">กางทุกรัฐ</button>` : ''}</div>`;
  if (!ECO.states.length) return h + `<p class="note">ยังไม่มีรัฐ กดเพิ่มรัฐ แล้วกดปุ่มระบายเขตในการ์ดของรัฐเพื่อระบายเขตลงบนแผนที่ ระบายลงทะเลได้เพื่อกำหนดน่านน้ำ เมืองขึ้นกับรัฐของช่องที่ตั้งอยู่</p>`;
  const cnt = {}; for (const z of ECO.cells) if (z !== '.') cnt[z] = (cnt[z] || 0) + 1;
  const dis = editable ? '' : ' disabled', sel = (f, table, cur, extra) => `<select data-f="${f}"${extra || ''}${dis}>${Object.entries(table).map(([k, v]) => `<option value="${k}"${k === cur ? ' selected' : ''}>${v[0]}</option>`).join('')}</select>`;
  for (const s of ECO.states) {
    const others = s.sys === 'anar' ? [] : ECO.states.filter(o => o !== s && o.sys !== 'anar'), b = socStat(s), anar = s.sys === 'anar';
    const on = new Set(Array.isArray(s.pol) ? s.pol : EPOL_SYS[s.sys] || []), list = polList(s);
    h += `<details class="efold stfold scard" data-fold="st${s.id}"${GDPV['st' + s.id] === 0 ? '' : ' open'}><summary><i class="sdot" style="background:${s.color}"></i>${esc(s.name)} <small>${ESYS[s.sys][0]}</small><span class="schips">${stateChips(s, cnt[s.id])}</span></summary><div class="eform" data-s="${s.id}">`
      + `<div class="btns sbtns"><button type="button" class="btn${ecoPaint === s.id ? ' on' : ''}" data-a="spaint"${dis}>${ecoPaint === s.id ? 'กำลังระบายเขตของรัฐนี้' : 'ระบายเขตของรัฐนี้'}</button><button type="button" class="btn" data-a="sgo">ดูบนแผนที่การค้า</button><small class="w">${cnt[s.id] || 0} ช่องบนแผนที่</small></div>`
      + `<div class="ssec"><h5>ชื่อ สี และเงิน</h5><div class="erow"><input type="color" data-f="scolor" value="${s.color}" aria-label="สีของรัฐ"${dis}><input type="text" data-f="sname" maxlength="60" value="${esc(s.name)}" style="flex:1"${dis}></div>`
      + `<div class="erow"><label>สกุลเงิน <input type="text" data-f="scur" maxlength="30" value="${esc(s.cur)}" placeholder="${esc(ECO.central.name)}" style="width:8em"${dis}></label><label>1 หน่วย = <input type="number" data-f="srate" min="0.01" max="1000" step="0.05" value="${s.rate}"${dis}> ${esc(ECO.central.name)}</label></div>${b && Math.abs(b.fx) >= 0.001 ? `<div class="tr w">ปีนี้ค่าเงิน${b.fx > 0 ? 'แข็งขึ้น' : 'อ่อนลง'}ร้อยละ ${ecoPc(Math.abs(b.fx))} ตามดุลการค้า</div>` : ''}</div>`
      + `<div class="ssec"><h5>ระบอบและกฎหมาย</h5>` + ecoIn('ระบอบเศรษฐกิจ', sel('ssys', ESYS, s.sys)) + `<div class="tr w">${ESYS[s.sys][1]}</div>`
      + (anar ? `<div class="tr w">แรงงานทาส: ดินแดนที่ไม่มีรัฐค้าทาสเสรีเสมอ</div>` : ecoIn('แรงงานทาส', sel('sslave', ESLAVE, s.slave || 'abol')) + `<div class="tr w">${ESLAVE[s.slave || 'abol'][1]}</div>`)
      + (s.sys === 'soc' ? ecoCapHTML(s) : '') + `</div>`
      + (anar ? '' : `<div class="ssec"><h5>ผู้คนและการทำงาน</h5>` + ecoIn('คนย้ายเข้ากระจายตัว', sel('sspread', ESPREAD, s.spread || 'nat')) + `<div class="tr w">${ESPREAD[s.spread || 'nat'][1]}</div>`
        + ecoIn('ระเบียบงานของโรงงาน', sel('sreg', EREG, s.reg || 'shift')) + `<div class="tr w">${EREG[s.reg || 'shift'][1]} เมืองที่ตั้งระเบียบของตัวเองในการ์ดเมืองใช้ของตัวเอง</div></div>`)
      + (others.length ? `<div class="ssec"><h5>ความสัมพันธ์กับรัฐอื่น</h5><div class="srel">${others.map(o => `<label><i class="sdot" style="background:${o.color}"></i><span>${esc(o.name)}</span><select data-f="srel" data-o="${o.id}"${dis}><option value="">เป็นกลาง</option><option value="ally"${(s.rel[o.id] || o.rel[s.id]) === 'ally' ? ' selected' : ''}>พันธมิตร</option><option value="rival"${(s.rel[o.id] || o.rel[s.id]) === 'rival' ? ' selected' : ''}>คู่อริ</option></select></label>`).join('')}</div><div class="tr w">พันธมิตรไม่กดราคากัน คู่อริไม่ค้ากันและเส้นทางผ่านแดนกันแพงขึ้น</div></div>` : '')
      + (anar ? '' : `<div class="ssec"><h5>เมื่อขาดดุลการค้า</h5><div class="polset">` + Object.entries(EPOL).map(([k, z]) => `<label title="${esc(z[1] + ' ข้อเสีย: ' + z[2])}"><input type="checkbox" data-f="spol" data-k="${k}"${on.has(k) ? ' checked' : ''}${dis}> ${z[0]}</label>`).join('') + `</div>`
        + (list.length > 1 ? ecoIn('ใช้ข้อไหนก่อน', `<select data-f="spol1"${dis}>${list.map((k, i) => `<option value="${k}"${i === 0 ? ' selected' : ''}>${EPOL[k][0]}</option>`).join('')}</select>`) : '')
        + `<div class="tr w">${list.length ? `รัฐเริ่มใช้เมื่อขาดดุลเกินร้อยละ ${ecoPc(TU('polStart'))} ของ GDP ยิ่งขาดลึกยิ่งใช้หลายข้อ ชี้ที่ชื่อนโยบายเพื่อดูผลดีและผลเสีย` : 'รัฐนี้ไม่แทรกแซง ปล่อยให้ดุลเป็นไปตามการค้า'}</div></div>`)
      + (b ? `<details class="efold sinner" data-fold="sy${s.id}"${GDPV['sy' + s.id] ? ' open' : ''}><summary>ปีนี้ของรัฐ: ดุลการค้า ชนชั้น และความมั่งคั่ง</summary><div class="tr">${socBalanceLine(b)}</div>${b.cls ? clsTableHTML(b.cls) + clsVerdictHTML(b.cls, ecoIncome(ecoGdp()).filter(r => r.s === s), b) : ''}</details>` : '')
      + `<div class="btns"><button type="button" class="btn warn" data-a="sdel"${dis}>ลบรัฐนี้</button></div></div></details>`;
  }
  return h;
};
function stateOpen(id) {                             // from anywhere: the state's card in the states tab, open and in view
  if (mode !== 'econ') setMode('econ'); ecoTab = 'states'; GDPV['st' + id] = 1; gdpKeep(); ecoRender();
  const d = document.querySelector(`#ecobody details[data-fold="st${id}"]`); if (d) { d.open = true; d.scrollIntoView({ block: 'start' }); }
}
$('ecobody').addEventListener('click', e => {
  const el = e.target.closest ? e.target.closest('[data-a="spaint"], [data-a="sgo"], [data-sopen]') : null; if (!el) return;
  if (el.dataset.sopen) { e.preventDefault(); stateOpen(el.dataset.sopen); return; }
  const id = el.closest('[data-s]') ? el.closest('[data-s]').dataset.s : null; if (!id) return;
  if (el.dataset.a === 'spaint') { if (!editable) return; ecoPaint = ecoPaint === id ? null : id; ecoRender(); requestDraw(); }
  else { setMode('trade'); selectState(id); }
});
$('tradebody').addEventListener('click', e => { const el = e.target.closest ? e.target.closest('[data-sopen]') : null; if (el) stateOpen(el.dataset.sopen); });
// the state's card on the trade map: the same numbers at the head, a way to its settings, and its sections folded
{
  const t = tradeStateHTML; tradeStateHTML = function (s) {
    if (ECON) ecoIncome(ecoGdp());
    const h = t(s), at = h.indexOf('</h3>'); const head = `<div class="schips tr">${stateChips(s)}</div><div class="btns"><button type="button" class="btn" data-sopen="${s.id}">แก้ค่าของรัฐนี้</button></div>`;
    return socFold(at >= 0 ? h.slice(0, at + 5) + head + h.slice(at + 5) : head + h, 'H4', { 'คู่ค้า': ['sp', 1], 'ตามประเภทสินค้า': ['sc', 0], 'ดุลของรัฐในปีนี้': ['sb', 1], 'ชนชั้นและความมั่งคั่ง': ['scl', 0] });
  };
}
// cut a card into folds at its headings of one level: the part before the first is its head, each heading opens a fold
function socFold(html, tag, keys, first) {
  const d = document.createElement('div'); d.innerHTML = html; const kids = [...d.childNodes], out = [];
  let i = 0; const head = document.createElement('div');
  if (first) { while (i < kids.length && !(kids[i].nodeType === 1 && kids[i].tagName === 'H3')) head.appendChild(kids[i++]); if (i < kids.length) head.appendChild(kids[i++]); while (i < kids.length && kids[i].nodeType === 1 && kids[i].matches('.tr.w, .schips')) head.appendChild(kids[i++]); }
  let cur = first ? { key: first[0], title: first[1], nodes: [] } : null; const groups = [];
  for (; i < kids.length; i++) {
    const n = kids[i];
    if (n.nodeType === 1 && (n.tagName === tag || (tag === 'H3' && n.tagName === 'H4')) && keys[n.textContent.trim()]) { if (cur) groups.push(cur); cur = { key: keys[n.textContent.trim()][0], def: keys[n.textContent.trim()][1], title: n.innerHTML, nodes: [] }; continue; }
    if (n.nodeType === 1 && n.tagName === 'DETAILS' && n.classList.contains('tfold')) { if (cur) groups.push(cur); groups.push({ raw: n }); cur = null; continue; }
    if (n.nodeType === 1 && n.matches('.tr') && /^เก็บเกี่ยวรอบเมือง/.test(n.textContent.trim())) { head.appendChild(n); continue; }
    if (!cur) { if (!groups.length) { head.appendChild(n); continue; } cur = { key: 'more', title: 'อื่น ๆ', nodes: [] }; }
    cur.nodes.push(n);
  }
  if (cur) groups.push(cur);
  let s = head.innerHTML;
  for (const g of groups) {
    if (g.raw) { s += g.raw.outerHTML; continue; }
    if (!g.nodes.some(n => n.nodeType === 1 || (n.textContent || '').trim())) continue;
    const open = TCV[g.key] != null ? TCV[g.key] === 1 : g.def != null ? !!g.def : false, box = document.createElement('div'); for (const n of g.nodes) box.appendChild(n.cloneNode(true));
    s += `<details class="tfold" data-tfold="${g.key}"${open ? ' open' : ''}><summary>${g.title}</summary>${box.innerHTML}</details>`;
  }
  return s;
}
{
  const t = tradeCityHTML; tradeCityHTML = function (k) {
    const h = t(k), rows = ECON ? ecoIncome(ecoGdp()) : [], r = rows[k];
    const chips = r ? `<div class="schips tr"><span class="chip0">${socN(r.people)} คน</span><span class="chip0" title="ความเป็นอยู่ 0 ถึง 100">อยู่ดี ${Math.round(r.well)}</span><span class="chip0" title="GDP ต่อปี">${ecoNumF(r.gdp)} ${esc(ECO.central.name)}</span><span class="chip0" title="รายได้ต่อหัว">ต่อหัว ${ecoNumF(r.inc / r.people)}</span>${r.s ? `<span class="chip0 link" data-sopen="${r.s.id}" title="เปิดการ์ดตั้งค่าของรัฐ"><i class="sdot" style="background:${r.s.color}"></i>${esc(r.s.name)}</span>` : ''}</div>` : '';
    const at = h.indexOf('</h3>'), h2 = at >= 0 ? h.slice(0, at + 5) + chips + h.slice(at + 5) : chips + h;
    return socFold(h2, 'H3', { 'ประชากรและความเป็นอยู่': ['people', 1], 'ชนชั้นในเมือง': ['cls', 0], 'ส่งออก': ['exp', 0], 'นำเข้า': ['imp', 0], 'ยังขาด': ['short', 1], 'ขายไม่หมด': ['spare', 0], 'แรงงานทาส': ['slv', 0] }, ['rank', 'ศูนย์การค้าและการส่งต่อ']);
  };
}
// ---------- the yield of a hex and the hands that work it (v0.15.0) ----------
// The owner asked for a city's people to raise or lower what each hex of its land yields: 100% at the start, 10% at the least,
// 300% at the most, counted from the hands that work the land, class by class. Measured the way the owner chose from what Claude
// set out: the hands on the land over the hexes the city harvests, against a reference density that is fixed (a city does not
// change because a village was set down across the map), in heads of the model (so a level of people on the map does not starve
// one map and glut another), and turned into a yield by a power under one: more hands bring more from a hex and less a head.
// Who works the land: the share of each class that lives off it, read from where its money comes from, as the classes are
// measured (the small holders of the middle, the hands in the fields of the lower class, a few of the poorest at harvest, and
// the slaves at the share of the city's money the land makes, a slave in the fields counting for more than a free hand). The
// classes come out of the year's trade, so the year is worked out once with the classes guessed before trade, and again with
// the classes the first working found, whenever they move a city's yield by more than two in a hundred; a state's tools and its
// coin go into the same second working. All numbers Claude's, in the numbers tab.
Object.assign(ETUNE, {
  effRef: [0.065, 0.001, 10, 0.001, 'ความแน่นอ้างอิงของแรงงานบนที่ดิน เป็นหัวต่อช่อง (หัวคือหน่วยประชากรของแบบจำลอง) เมืองที่แน่นเท่านี้เก็บเกี่ยวได้ 100% ต่อช่อง', 'การเก็บเกี่ยวต่อช่อง'],
  effMin: [0.1, 0.01, 1, 0.01, 'ประสิทธิภาพการเก็บเกี่ยวต่อช่องต่ำสุด', 'การเก็บเกี่ยวต่อช่อง'],
  effMax: [3, 1, 10, 0.05, 'ประสิทธิภาพการเก็บเกี่ยวต่อช่องสูงสุด', 'การเก็บเกี่ยวต่อช่อง'],
  effGrain: [0.5, -1, 1.5, 0.05, 'ธัญพืชและพืชผล: ประสิทธิภาพ = (ความแน่น ÷ ค่าอ้างอิง) ยกกำลังเท่านี้ 0 คือคนไม่มีผล', 'การเก็บเกี่ยวต่อช่อง'],
  effHerd: [0.35, -1, 1.5, 0.05, 'เนื้อ ปลา นม และไข่ (ทุ่งหญ้าจำกัดมากกว่าแรงงาน)', 'การเก็บเกี่ยวต่อช่อง'],
  effFibre: [0.45, -1, 1.5, 0.05, 'เส้นใย หนัง และเชือก', 'การเก็บเกี่ยวต่อช่อง'],
  effDig: [0.6, -1, 1.5, 0.05, 'ไม้ เชื้อเพลิง หิน แร่ เกลือ และโลหะมีค่า (งานที่ขึ้นกับมือคน)', 'การเก็บเกี่ยวต่อช่อง'],
  effHerb: [0.2, -1, 1.5, 0.05, 'เห็ด สมุนไพร และเครื่องเทศ (ปลูกได้บ้าง เก็บจากป่าบ้าง)', 'การเก็บเกี่ยวต่อช่อง'],
  effWild: [-0.3, -1, 1.5, 0.05, 'ของหายากจากป่า: ค่าติดลบคือยิ่งคนแน่นยิ่งถูกล่าและเก็บจนร่อยหรอ', 'การเก็บเกี่ยวต่อช่อง'],
  effPoor: [0.15, 0, 1, 0.01, 'ส่วนของคนล่างสุดที่รับจ้างในไร่ตามฤดู', 'การเก็บเกี่ยวต่อช่อง'],
  effSlave: [1.5, 0, 3, 0.05, 'ทาสในไร่นับเป็นแรงงานกี่เท่าของคนอิสระ (ไร่แบบอาณานิคมใช้แรงทาสเข้มกว่า)', 'การเก็บเกี่ยวต่อช่อง'],
});
const HARV_POW = { grain: 'effGrain', protein: 'effHerd', cloth: 'effFibre', timber: 'effDig', fuel: 'effDig', stone: 'effDig', ore: 'effDig', salt: 'effDig', rare: 'effDig', herbs: 'effHerb', luxury: 'effWild' };   // mana: the hands do not matter
const HARV_SHOW = [['grain', 'ธัญพืช'], ['protein', 'เนื้อ'], ['timber', 'ไม้และแร่'], ['luxury', 'ของป่า']];
let HARVL = null;                                    // the hands counted by class in the first working, used in the second
const harvE = (d, cat) => { const p = HARV_POW[cat] ? TU(HARV_POW[cat]) : 0; return p ? clamp(Math.pow(Math.max(1e-9, d), p), TU('effMin'), Math.max(TU('effMin'), TU('effMax'))) : 1; };
function harvEst(c, rent, made) {                    // before trade: the classes as the city's kind, system and work order make them, and their money from the ground
  const H = classHeads(c, 1, 0, 1), sp = classSplit(c, { rent, made, comm: 0.03 * (rent + made), slave: 0, surplus: 0 }), pp = TU('effPoor');
  const parts = { mid: c.pop * H.mid * sp.land.mid, low: c.pop * H.low * sp.land.low, poor: c.pop * H.poor * pp, slave: 0 };
  return { units: parts.mid + parts.low + parts.poor, parts };
}
function harvApply(cities, prod, own, dist) {         // the hands spread over the city's home ground: the hexes it harvests within the reach of its kind of city, so the
  const n = cities.length, cnt = new Int32Array(n), ref = TU('effRef');   // measure holds whatever the level of people (fields laid out farther for a populous level feed their own share, v0.14.2)
  for (let i = 0; i < N; i++) { const k = own[i]; if (k >= 0 && k < n && dist[i] <= EREACH[cities[k].ki]) cnt[k]++; }
  cities.forEach((c, k) => {
    const P = prod[k], hexes = Math.max(1, cnt[k]), made = c.pop * EIND[c.ki] * 0.5 * (c.work || 1);
    let rent0 = 0; for (const [id, v] of P) { const cat = catOf(id); if (ECAT[cat]) rent0 += v * ECAT[cat].v; }
    const got = HARVL ? HARVL.get(c.id) : null; let L = 0, parts = null;
    if (got) { L = got.units; parts = got.parts; }
    else { let e = 1; for (let it = 0; it < 3; it++) { const r = harvEst(c, rent0 * e, made); L = r.units; parts = r.parts; e = harvE(L / hexes / ref, 'grain'); } }   // the ground's money rises with the yield it counts: three rounds settle it
    const d = L / hexes / ref, eff = {}; for (const cat of ERAW) eff[cat] = harvE(d, cat);
    c.harv = { L, parts, hexes, d, eff, est: !got };
    for (const [id, v] of P) { const f = eff[catOf(id)]; if (f != null && f !== 1) P.set(id, v * f); }
  });
}
function harvCount(E) {                               // after the year: the hands on the land, class by class, as the classes came out
  const rows = ecoIncome(ecoGdp()), unit = ECO.unit, pp = TU('effPoor'), sl = TU('effSlave'), out = new Map(); if (!(unit > 0)) return;
  rows.forEach(r => {
    if (!r.cls || !r.clsLand) return; const C = r.cls, Ld = r.clsLand;
    const parts = { mid: C.mid.n * Ld.mid / unit, low: C.low.n * Ld.low / unit, poor: C.poor.n * pp / unit, slave: (C.slave ? C.slave.n : 0) * (r.rentSh == null ? 1 : r.rentSh) * sl / unit };
    out.set(r.c.id, { units: parts.mid + parts.low + parts.poor + parts.slave, parts });
  });
  E.harvN = out;
}
function harvMoved(E) {                               // whether the counted hands move any city's yield of grain by more than two in a hundred
  if (!E || !E.harvN) return false; const ref = TU('effRef');
  for (const c of E.cities) { const h = c.harv, x = E.harvN.get(c.id); if (!h || !x) continue; if (Math.abs(harvE(x.units / h.hexes / ref, 'grain') - h.eff.grain) > 0.02) return true; }
  return false;
}
function harvSettle(E) {                             // no second working was needed: the counted hands are within two in a hundred of the guess, so the card shows them
  if (!E || !E.harvN) return; const ref = TU('effRef');
  for (const c of E.cities) { const h = c.harv, x = E.harvN.get(c.id); if (!h || !x) continue; h.L = x.units; h.parts = x.parts; h.d = x.units / h.hexes / ref; h.est = false; }
}
{ const sy = socYear; socYear = function (E) { const r = sy(E); harvCount(E); return r; }; }

// ---- on the screen ----
const harvPc = x => Math.round(100 * x) + '%';
function harvWho(h) {                                // the hands on the land in people, class by class
  const u = ECO.unit, p = h.parts || {}, L = [];
  if (p.mid >= 1e-9) L.push(`เจ้าของที่ดินรายย่อย ${socN(p.mid * u)}`); if (p.low >= 1e-9) L.push(`ชนชั้นล่างในไร่ ${socN(p.low * u)}`);
  if (p.poor >= 1e-9) L.push(`ล่างสุดรับจ้างตามฤดู ${socN(p.poor * u)}`); if (p.slave >= 1e-9) L.push(`ทาส ${socN(p.slave * u / Math.max(1e-9, TU('effSlave')))} คน นับเป็น ${socN(p.slave * u)}`);
  return L.join(' · ');
}
function harvLine(c) {
  const h = c.harv; if (!h) return '';
  return `<div class="tr">เก็บเกี่ยวต่อช่อง <b>${harvPc(h.eff.grain)}</b> <span class="w">แรงงานบนที่ดิน ${socN(h.L * ECO.unit)} คน บน ${h.hexes} ช่อง แน่นเป็น ${h.d >= 10 ? Math.round(h.d) : h.d.toFixed(2)} เท่าของค่าอ้างอิง · ${HARV_SHOW.map(([cat, t]) => `${t} ${harvPc(h.eff[cat])}`).join(' · ')}${h.est ? ' · ประมาณจากชนชั้นก่อนการค้า' : ''}</span></div>`
    + (h.parts ? `<div class="tr w">ใครทำกินบนที่ดิน: ${harvWho(h) || 'ไม่มี'}</div>` : '');
}
{
  const sc = socCityHTML; socCityHTML = function (k) {
    const h = sc(k), c = ECON && ECON.cities[k]; if (!c || !c.harv) return h; const add = harvLine(c), at = h.indexOf('<div class="optrow"><span class="lbl">ระเบียบงาน');
    return at >= 0 ? h.slice(0, at) + add + h.slice(at) : h + add;
  };
}
function harvGdpHTML() {
  if (!ECON) return ''; const cs = ECON.cities.filter(c => c.harv); if (!cs.length) return '';
  const SK = { name: ['เมือง', c => c.name], L: ['บนที่ดิน', c => c.harv.L], hexes: ['ช่อง', c => c.harv.hexes], d: ['ความแน่น', c => c.harv.d], grain: ['ธัญพืช', c => c.harv.eff.grain], protein: ['เนื้อ', c => c.harv.eff.protein], timber: ['ไม้และแร่', c => c.harv.eff.timber] };
  const sk = SK[GDPV.hk] ? GDPV.hk : 'grain', dir = GDPV.hd > 0 ? 1 : -1, arrow = k => k === sk ? (dir > 0 ? ' ▲' : ' ▼') : '';
  const list = cs.slice().sort((a, b) => sk === 'name' ? dir * a.name.localeCompare(b.name, 'th') : dir * (SK[sk][1](a) - SK[sk][1](b)) || a.name.localeCompare(b.name, 'th'));
  const g = cs.map(c => c.harv.eff.grain).sort((a, b) => a - b), med = g[g.length >> 1], top = g.filter(x => x >= TU('effMax') - 1e-6).length, bot = g.filter(x => x <= TU('effMin') + 1e-6).length;
  const est = cs.some(c => c.harv.est);
  return `<details class="efold" data-fold="ghv"${GDPV.ghv ? ' open' : ''}><summary>การเก็บเกี่ยวต่อช่อง <small>${cs.length} แถว</small></summary>`
    + `<div class="tr">ธัญพืชต่อช่อง ค่ากลาง <b>${harvPc(med)}</b> · ชนเพดาน ${harvPc(TU('effMax'))} <b>${top}</b> เมือง · ชนพื้น ${harvPc(TU('effMin'))} <b>${bot}</b> เมือง</div>`
    + `<div class="etable g5 g7"><div class="eth sortable">${Object.entries(SK).map(([k, v]) => `<span data-a="hsort" data-k="${k}" title="กดเพื่อเรียงตามช่องนี้">${v[0]}${arrow(k)}</span>`).join('')}</div>`
    + list.map(c => { const s = c.sto; return `<div class="etr"><span>${s ? `<i class="sdot" style="background:${s.color}"></i>` : ''}${esc(c.name)}</span><span>${socN(c.harv.L * ECO.unit)}</span><span>${c.harv.hexes}</span><span>${c.harv.d >= 10 ? Math.round(c.harv.d) : c.harv.d.toFixed(2)}×</span><span>${harvPc(c.harv.eff.grain)}</span><span>${harvPc(c.harv.eff.protein)}</span><span>${harvPc(c.harv.eff.timber)}</span></div>`; }).join('') + `</div>`
    + `<p class="note">ผลผลิตของแต่ละช่องขึ้นกับจำนวนคนที่ทำกินบนที่ดินต่อช่องที่เมืองเก็บเกี่ยว เทียบกับความแน่นอ้างอิง แล้วยกกำลังตามชนิดของ คนยิ่งแน่นยิ่งได้ต่อช่องมากขึ้นแต่ได้ต่อหัวน้อยลง ของป่ากลับลดลงเมื่อคนแน่น คนที่ทำกินบนที่ดินนับจากชนชั้น: ส่วนของชนชั้นกลางและชนชั้นล่างที่รายได้มาจากที่ดิน คนล่างสุดที่รับจ้างตามฤดู และทาสตามส่วนรายได้ของเมืองที่มาจากที่ดิน${est ? ' เมืองที่ยังไม่ได้คิดรอบที่สองใช้ชนชั้นที่ประมาณก่อนการค้า' : ''} ไร่ที่แผนที่วางให้ยังเลี้ยงคนส่วนที่วางไว้ให้เหมือนเดิม ตัวเลขทั้งหมดอยู่ในแท็บตัวเลข หมวดการเก็บเกี่ยวต่อช่อง</p></details>`;
}
{ const g = ecoGdpHTML; ecoGdpHTML = function () { return g() + harvGdpHTML(); }; }
$('ecobody').addEventListener('click', e => {
  const el = e.target.closest ? e.target.closest('[data-a="hsort"]') : null; if (!el) return; const k = el.dataset.k;
  if (GDPV.hk === k) GDPV.hd = GDPV.hd > 0 ? -1 : 1; else { GDPV.hk = k; GDPV.hd = k === 'name' ? 1 : -1; } gdpKeep(); ecoRender();
});
return {
  destroy() { __dead = true; for (const f of __offs) f(); cancelAnimationFrame(rq); cancelAnimationFrame(fxRaf); cancelAnimationFrame(panRaf); },
  async flush() { for (const k of Object.keys(DOCS)) { clearTimeout(saveT[k]); if (dirty[k] && !saving[k]) await save(k); } await ecoFlush(); },
  requestDraw,
  setPeers(list) { PEERS = list || []; requestDraw(); },
  lookAt,
  get mode() { return mode; },
  thumb() {                                          // the map as a small picture, two pixels a hex, for its card in the library
    const t = document.createElement('canvas'); t.width = COLS * 2; t.height = ROWS * 2 + 1; const x = t.getContext('2d');
    x.fillStyle = chipColor('S'); x.fillRect(0, 0, t.width, t.height);
    for (let i = 0; i < N; i++) { const b = eff(i); if (b === 'S') continue; const cc = i % COLS; x.fillStyle = RCOL[b] || isW(b) ? chipColor(b) : '#8d8273'; x.fillRect(cc * 2, ((i / COLS) | 0) * 2 + (cc & 1), 2, 2); }
    try { return t.toDataURL('image/webp', 0.8); } catch (err) { return ''; }
  },
  recalc: () => scheduleEcon(150),
  refit,
  test: { reach: () => REACH ? { n: REACH.n, cells: REACH.cells.length, all: REACH.all, tint: REACH.tint } : null, tip: () => ({ shown: tip.shown, fold: TIP.fold, x: TIP.x, y: TIP.y, text: tipBody.textContent }), avoid: v => { AVOID_ON = !!v; scheduleEcon(50); }, cities: () => ECON ? ECON.cities.map((c, k) => ({ id: c.id, name: c.name, kind: c.kind, h: c.h, st: c.st, rank: c.rank, pop: c.pop, through: c.through, seat: ECOX.seat[k], short: c.short ? Object.keys(c.short).length : 0 })) : [], econ: () => ECON ? { ms: Math.round(ECON.ms), ver: ECON.ver, rounds: ECON.rounds, flows: ECON.flows.length, vol: ECON.flows.reduce((x, f) => x + f.amt, 0), goods: ECON.flows.reduce((x, f) => x + (f.cat === 'labor' ? 0 : f.amt), 0), gflows: ECON.flows.filter(f => f.cat !== 'labor').length, val: ECON.flows.reduce((x, f) => x + f.amt * ECAT[f.cat].v, 0), via: ECON.flows.filter(f => f.via).length, broker: ECON.flows.filter(f => f.broker >= 0).length, hub: ECON.flows.filter(f => f.hub).length, links: ECON.links.length, hostile: ECON.links.filter(L => L.hostile > 0).length, bad: ECON.flows.filter(f => !isFinite(f.amt) || !isFinite(f.cost)).length, cross: ECON.flows.filter(f => ECON.cities[f.from].st !== ECON.cities[f.to].st).length, rivals: ECON.flows.filter(f => { const a = ECON.cities[f.from].sto, b = ECON.cities[f.to].sto; return a && b && a !== b && (a.rel[b.id] === 'rival' || b.rel[a.id] === 'rival'); }).length } : null, gdp: () => ecoIncome(ecoGdp()).map(r => ({ id: r.c.id, name: r.c.name, st: r.s ? r.s.id : '.', gdp: r.gdp, inc: r.inc, people: r.people, well: r.well, well0: r.well0, met: r.met, rich: r.rich, reg: r.c.reg, lab: r.c.lab, reach: r.c.reach, lack: r.c.land ? r.c.land.lack : 0, att: r.c.att, work: r.c.work, cls: r.cls, clsW: r.clsW, metB: r.metB, metO: r.metO, rich0: r.c.rich0, stable: r.stable, sur: r.sur, why: r.wellWhy, made: r.made, tw: (() => { const A = climEnsure(); return A && A.tw ? A.tw[r.c.h] : null; })(), demo: r.demo, tourWhy: r.tourWhy, pol: r.c.pol ? { k: r.c.pol.k, tools: [...r.c.pol.tools], top: [...r.c.pol.top], def1: r.c.pol.def1 } : null })), soc: () => { ecoIncome(ecoGdp()); return SOC ? { mean: SOC.mean, tot: SOC.tot, cs: SOC.cls ? clsSum(SOC.cls) : null, fx: ECON && ECON.fx ? [...ECON.fx] : [], books: [...SOC.books.values()].map(b => ({ id: b.s.id, out: b.out, inn: b.inn, gdp: b.gdp, def: b.def, pen: b.pen, net: b.net, lost: b.lost, won: b.won, tourIn: b.tourIn, tourOut: b.tourOut, stable: b.stable, fx: b.fx, cs: b.cls ? clsSum(b.cls) : null, plan: b.plan ? { k: b.plan.k, tools: [...b.plan.tools], top: [...b.plan.top], def1: b.plan.def1 } : null })) } : null; }, grid: () => ({ N, COLS, ROWS }), labor: () => { const rows = ecoIncome(ecoGdp()); return SLAVE ? { tot: SLAVE.tot, price: SLAVE.price, mean: SLAVE.mean, flows: SLAVE.flows.map(f => ({ a: ECON.cities[f.a].id, b: ECON.cities[f.b].id, n: f.n, t: f.t, h: f.h, by: f.by, legs: f.way.length, mids: f.mids.map(k => ECON.cities[k].id) })), rows: rows.map(r => ({ id: r.c.id, st: r.c.st, people: r.people, inc: r.inc, held: r.slave ? r.slave.held : 0, out: r.slave ? r.slave.out : 0, bought: r.slave ? r.slave.bought : 0 })) } : null; }, fieldsOf: id => { if (!ECON || !ECON.land) return null; const k = ECON.cities.findIndex(c => c.id === id), L = ECON.land; let a = 0, b = 0; for (let i = 0; i < N; i++) if (L.own[i] === k && L.use[i] >= 1 && L.use[i] !== 5) { b++; if (ECON.hin[i] === k) a++; } return [a, b]; }, crossBasic: () => { if (!ECON) return null; let x = 0, all = 0; for (const f of ECON.flows) { if (!SOC_BASIC.has(f.cat)) continue; all += f.amt; const a = ECON.cities[f.from].sto, b = ECON.cities[f.to].sto; if (a !== b) x += f.amt; } return { cross: x, all }; }, reachOf: id => { if (!ECON || !ECON.hin) return null; const k = ECON.cities.findIndex(c => c.id === id); if (k < 0) return null; const P = reachOf(k); return { ni: P.ni, no: P.no, reach: ECON.cities[k].reach, sel: reachSel() }; }, cityBook: id => { if (!ECON) return null; const k = ECON.cities.findIndex(c => c.id === id); if (k < 0) return null; const o = {}; for (const cat of ECATS) { const b = ECON.MK[k][cat]; if (b && (b[0] || b[1])) o[cat] = Array.from(b, v => +v.toFixed(2)); } const c = ECON.cities[k]; return { o, foodCut: c.foodCut, land: c.land, pop: c.pop, unit: ECO.unit, cm: c.cm, ki: c.ki, kind: c.kind }; }, harv: id => { if (!ECON) return null; const c = ECON.cities.find(c => c.id === id); return c && c.harv ? JSON.parse(JSON.stringify(c.harv)) : null; }, harvAll: () => ECON ? ECON.cities.map(c => c.harv ? [c.id, c.harv.L, c.harv.hexes, c.harv.d, c.harv.eff.grain, c.harv.est, c.pop] : null).filter(Boolean) : [], harvPasses: () => ECON ? !!ECON.harvL : null, worldBook: () => { if (!ECON) return null; const o = {}; for (const cat of ECATS) { const t = [0, 0, 0, 0]; for (let k = 0; k < ECON.cities.length; k++) { const b = ECON.MK[k][cat]; if (b) for (let q = 0; q < 4; q++) t[q] += b[q]; } if (t[0] || t[1]) o[cat] = t.map(v => +v.toFixed(1)); } return o; }, needOf: (id, cat) => { if (!ECON) return null; const k = ECON.cities.findIndex(c => c.id === id); return k < 0 ? null : ECON.need[k][cat]; }, market: id => { if (!ECON) return null; const k = ECON.cities.findIndex(c => c.id === id); if (k < 0) return null; const o = {}; for (const cat of ECATS) { const b = ECON.MK[k][cat]; if (b) o[cat] = Array.from(b); } return { book: o, prod: ECON.prod[k].size, price: Object.assign({}, ECON.P1[k]) }; }, nt: (a, b) => { if (!ECON) return null; const i = ECON.cities.findIndex(c => c.id === a), j = ECON.cities.findIndex(c => c.id === b); return i < 0 || j < 0 ? null : ECON.NT[i][j]; }, lines: () => ECON ? ECON.links.filter(L => !L.fail).map(L => ({ a: ECON.cities[L.ia].id, b: ECON.cities[L.ib].id, wet: L.wet, dry: L.dry })) : [], bridges: () => { const r = cv.getBoundingClientRect(), out = []; for (const rt of visibleRoutes()) { if (rt.t !== 'road') continue; const g = geoOf(rt); if (!g || g.fail) continue; for (const b of g.bridges) { let d = Infinity; for (let i = 0; i + 1 < g.q.length; i++) { const px = g.q[i][0], py = g.q[i][1], dx = g.q[i + 1][0] - px, dy = g.q[i + 1][1] - py, l2 = dx * dx + dy * dy, w = l2 > 0 ? Math.max(0, Math.min(1, ((b.x - px) * dx + (b.y - py) * dy) / l2)) : 0; d = Math.min(d, Math.hypot(px + dx * w - b.x, py + dy * w - b.y)); } out.push({ x: r.left + view.x + b.x * view.s, y: r.top + view.y + b.y * view.s, off: d, a: b.a }); } } return out; }, linkCard: li => { const d = document.createElement('div'); d.innerHTML = tradeLinkHTML(ECON.links[li]); return d.textContent; }, cityCard: k => { const d = document.createElement('div'); d.innerHTML = tradeCityHTML(k); return d.textContent; }, drawOrder: () => { const seq = {}; let n = 0; const g = drawOverGround, r = drawRoutes, t = drawTrade, m = drawNames; drawOverGround = function () { seq.ground = ++n; return g.apply(this, arguments); }; drawRoutes = function () { seq.routes = ++n; return r.apply(this, arguments); }; drawTrade = function () { seq.trade = ++n; return t.apply(this, arguments); }; drawNames = function () { seq.names = ++n; return m.apply(this, arguments); }; try { draw(); } finally { drawOverGround = g; drawRoutes = r; drawTrade = t; drawNames = m; } return seq; }, landSheet: () => { const cvs = landSheet(); return { on: !!cvs, any: landAny, key: landKey, w: cvs ? cvs.width : 0, ms: Math.round(landMs) }; }, landPx: i => { if (!landSheet()) return null; return Array.from(LLC.getImageData(Math.round(CX[i] * LS), Math.round(CY[i] * LS), 1, 1).data); }, landUse: () => { landCompute(); return LAND ? { use: Array.from(LAND.use), own: Array.from(LAND.own) } : null; }, slaveLoad: () => { if (!ECON) return null; const S = slaveNow().S; return S ? { links: [...S.load].map(([li, x]) => ({ li, fwd: x[0], back: x[1], a: ECON.links[li].ia, b: ECON.links[li].ib })), tRef: S.tRef, haul: S.tot.haul } : null; }, land: () => { landCompute(); return LAND ? { tot: LAND.tot, total: LAND.total, crop: LAND.crop, haHex: LAND.haHex, short: LAND.short, rows: LAND.rows.map((r, k) => ({ id: ECON.cities[k].id, people: Math.round(ECON.cities[k].pop * ECO.unit), ...r })) } : null; }, eco: () => JSON.parse(JSON.stringify(ecoSerial())), ecoSet: b => { ecoLoad(b); ecoChanged(true); ecoRender(); }, orgs: () => [...orgValues(ecoIncome(ecoGdp()))].map(([id, v]) => ({ id, ...v })), cityXY: id => { const c = visibleCities().find(x => x.id === id), r = cv.getBoundingClientRect(); return c ? [r.left + view.x + c.x * view.s, r.top + view.y + c.y * view.s] : null; }, hexXY: i => { const r = cv.getBoundingClientRect(); return [r.left + view.x + CX[i] * view.s, r.top + view.y + CY[i] * view.s]; }, flowsOf: () => ECON ? ECON.flows.map(f => ({ a: ECON.cities[f.from].id, b: ECON.cities[f.to].id, cat: f.cat, amt: f.amt, org: f.org || null, broker: f.broker })) : [], tune: () => ({ ...ECO.tune }), pt: (fx, fy) => { const r = cv.getBoundingClientRect(); return [r.left + view.x + fx * G.w * view.s, r.top + view.y + fy * G.h * view.s]; }, way: (a, b) => { const C = ECON.cities, i = C.findIndex(c => c.name === a), j = C.findIndex(c => c.name === b); if (i < 0 || j < 0 || !ECOX.on) return null; const w = ecoWay(i, j); return [a, ...(w.mids || []).map(k => C[k].name), b].join('>') + ' t=' + w.t.toFixed(1) + ' direct=' + ECOX.NT[i][j].toFixed(1); }, linkAt: k => { const L = ECON && ECON.links[k]; if (!L || !L.states) return null; const t = L.states[L.states.length >> 1], h = t >> 1, r = cv.getBoundingClientRect(); return [r.left + view.x + (t & 1 && NAVR[h] ? NPX[h] : CX[h]) * view.s, r.top + view.y + (t & 1 && NAVR[h] ? NPY[h] : CY[h]) * view.s, L.id, L.danger, L.dauto ? L.dauto.lv : -1]; } },
  clim: () => { const A = climEnsure(), land = []; for (let i = 0; i < N; i++) if (!isNaN(A.h[i])) land.push(i); const mean = f => land.reduce((a, i) => a + f(i), 0) / (land.length || 1), band = (f, lo, hi) => { const q = land.filter(i => CY[i] / G.h >= lo && CY[i] / G.h < hi); return q.length ? q.reduce((a, i) => a + f(i), 0) / q.length : null; };
    return { seasons: A.seas ? A.seas.map((s, k) => ({ id: s.id, name: s.name, t: mean(i => A.S[k].t[i]), p: mean(i => A.S[k].p[i]), north: band(i => A.S[k].t[i], 0, 0.33), south: band(i => A.S[k].t[i], 0.67, 1.01), wind: clWindOf(s) })) : null, p: mean(i => A.p[i]), ai: mean(i => Math.min(5, A.ai[i])), f: mean(i => A.f[i]), grow: A.grow ? mean(i => A.grow[i]) : null, lat: [clLat0(), clLat1()], land: land.length, bad: land.filter(i => !isFinite(A.ts[i]) || !isFinite(A.tw[i]) || !isFinite(A.p[i]) || !isFinite(A.f[i])).length, sum: A.S ? mean(i => Math.abs(A.S.reduce((a, S) => a + S.p[i], 0) - A.p[i])) : 0 }; },
  climHex: i => { const A = climEnsure(); return isNaN(A.h[i]) ? null : { h: A.h[i], ts: A.ts[i], tw: A.tw[i], p: A.p[i], ai: A.ai[i], f: A.f[i], grow: A.grow ? A.grow[i] : null, s: A.S ? A.S.map(S => [Math.round(S.t[i] * 10) / 10, Math.round(S.p[i])]) : null }; },
  climAt: (fx, fy) => { const r = cv.getBoundingClientRect(), [mx, my] = toMap(r.left + r.width * fx, r.top + r.height * fy), h = hexAt(mx, my); if (h < 0) return null; const A = climEnsure(); return { hex: h, b: eff(h), h: Math.round(A.h[h]), p: Math.round(A.p[h]), ts: Math.round(A.ts[h] * 10) / 10, tw: Math.round(A.tw[h] * 10) / 10, ai: Math.round(A.ai[h] * 100) / 100, mean: [Math.round(A.tsMean * 10) / 10] }; },
  state: () => ({ editable, mode, land: (() => { let n = 0; for (let i = 0; i < N; i++) if (!isW(eff(i))) n++; return n; })(), rivers: ED.rivers.length, cities: visibleCities().length, undo: undoS.length, view: [view.s, view.x, view.y], fitS, status: $('status').textContent, econ: !!ECON, ver: ECON ? ECON.ver : 0, flows: ECON ? ECON.flows.length : 0, vol: ECON ? Math.round(ECON.flows.reduce((x, f) => x + f.amt, 0) * 100) / 100 : 0, goods: EGOODS.length, cats: ECATS.length, homes: ECON ? ECON.cities.filter(c => c.home >= 0).map(c => c.name + '>' + ECON.cities[c.home].name).join(' ') : '', fl: ECON ? ECON.flows.map(f => ECON.cities[f.from].name.slice(0, 3) + '>' + ECON.cities[f.to].name.slice(0, 3)).join(' ') : '', ownvol: ECON ? Math.round(ECON.flows.filter(f => ECAT[f.cat] && ECAT[f.cat].own).reduce((x, f) => x + f.amt, 0) * 1000) / 1000 : 0, tlsel, relay: ECON ? [ECON.flows.filter(f => f.via).length, ECON.flows.filter(f => f.broker >= 0).length, ECON.flows.filter(f => f.via).slice(0, 4).map(f => ECON.cities[f.from].name + '>' + f.via.map(k => ECON.cities[k].name).join('>') + '>' + ECON.cities[f.to].name).join(' | ')] : null, dng: ECON ? ECON.links.map(L => L.danger).join('') : '', host: ECON ? [ECON.links.filter(L => L.hostile > 0).length, Math.round(Math.max(0, ...ECON.links.map(L => L.hostile || 0)) * 100) / 100, ECON.links.length, Math.round(ECON.links.reduce((x, L) => x + L.cost, 0))] : null, clim: [Object.keys(CLO.e).length, Object.keys(CLO.p).length, Object.keys(CLO.t).length, JSON.stringify(CLO.set), SIDE.clim.undo.length, SIDE.eco.undo.length], states: ECO.states.length, cellsSet: ECO.cells.filter(z => z !== '.').length, cst: ECON ? ECON.cities.map(c => c.name + ':' + c.st + ':' + Math.round(c.pop * 10) / 10).join(' ') : '', made: ECON ? Math.round(ECON.prod.reduce((x, m) => x + [...m.values()].reduce((p, q) => p + q, 0), 0) * 10) / 10 : 0 })
};
};
})();
