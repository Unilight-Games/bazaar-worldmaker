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
        else if (LAND_OPEN.has(b) || featFarmAt(u)) { if (nF >= 0.5) { use[u] = 1; own[u] = k; nF--; r.farm++; } }   // an oasis or a volcanic soil takes fields wherever it lies (v0.16.0)
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
