// ---------- the hex lattice (flat-top hexes, odd columns half a row lower) ----------
const R = G.R, DX = 1.5 * R, DY = Math.sqrt(3) * R, COLS = G.cols, ROWS = G.rows, N = COLS * ROWS;
// v0.21.0: on a map larger than the large canvas the drawing sheets are made coarser, so they keep to the memory of a large map
const SHK = Math.max(1, Math.sqrt(G.w * G.h / 7.2e6));
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
// v0.22.0: on the English page the kinds of ground and of places a map brings with it (Gresland's own) take the English names of
// the same codes; their notes stay as the map wrote them
const enKinds = (o, def) => { if (window.MME_LANG !== 'en' || !o || !def) return o; const r = {}; for (const k in o) r[k] = def[k] ? { ...o[k], name: def[k].name } : o[k]; return r; };
if (window.MME_LANG === 'en' && window.MME && MME.DEFAULTS) { D.biomes = enKinds(D.biomes, MME.DEFAULTS.biomes); D.pointKinds = enKinds(D.pointKinds, MME.DEFAULTS.pointKinds); }
const BIOME = D.biomes, ZONE = D.zones;
const isW = b => b === 'S' || b === 'L' || b === 'i';
const isSea = b => b === 'S' || b === 'i';            // the archipelago ('i') is shallow sea strewn with islets

