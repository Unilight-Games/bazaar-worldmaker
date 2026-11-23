// the automatic mountains and rivers on shapes nobody would generate: a ring, a thread of land, specks, land to every edge, a tiny map,
// land that is all mountain, lakes, and nothing at all. Each must come back sane, and quickly.
const fs = require('fs'), path = require('path');
global.window = global; new Function(fs.readFileSync(path.join(__dirname, '../src/gen.js'), 'utf8'))();
const MME = window.MME, WATER = b => b === 'S' || b === 'i' || b === 'L' || b === '.';
const shapes = {
  'ring of land around a sea': (c, r, C, R) => { const d = Math.hypot((c - C / 2) / (C / 2), (r - R / 2) / (R / 2)); return d > 0.55 && d < 0.8 ? 'g' : '.'; },
  'ring of land around a lake': (c, r, C, R) => { const d = Math.hypot((c - C / 2) / (C / 2), (r - R / 2) / (R / 2)); return d < 0.3 ? 'L' : d < 0.8 ? 'f' : '.'; },
  'a thread of land one hex wide': (c, r, C, R) => r === (R >> 1) && c > 4 && c < C - 4 ? 'g' : '.',
  'a thread three hexes wide, north to south': (c, r, C, R) => Math.abs(c - (C >> 1)) <= 1 && r > 2 && r < R - 2 ? 'g' : '.',
  'specks of two and three hexes': (c, r) => (c % 9 < 2 && r % 7 < 1) || (c % 11 === 5 && r % 9 < 3) ? 'g' : '.',
  'land to every edge, no sea': () => 'g',
  'land to every edge with lakes': (c, r) => (c % 17 < 3 && r % 13 < 3) ? 'L' : 'g',
  'all mountain already': (c, r, C, R) => c > 8 && c < C - 8 && r > 8 && r < R - 8 ? 'M' : '.',
  'desert continent': (c, r, C, R) => Math.hypot((c - C / 2) / (C / 2), (r - R / 2) / (R / 2)) < 0.75 ? 'd' : '.',
  'two continents joined by a neck': (c, r, C, R) => { const a = Math.hypot((c - C * 0.28) / (C * 0.2), (r - R / 2) / (R * 0.35)), b = Math.hypot((c - C * 0.72) / (C * 0.2), (r - R / 2) / (R * 0.35)); return a < 1 || b < 1 || (Math.abs(r - R / 2) < 1.5 && c > C * 0.28 && c < C * 0.72) ? 'g' : '.'; },
  'checkerboard of land and sea': (c, r) => ((c >> 2) + (r >> 2)) % 2 ? 'g' : '.',
  'sea only': () => '.',
  'one hex of land': (c, r, C, R) => c === (C >> 1) && r === (R >> 1) ? 'g' : '.',
  'land with snow and ice sea': (c, r, C, R) => r < 6 ? 'i' : r < R - 5 ? (r < 20 ? 'n' : 'g') : 'S',
};
const sizes = [[8, 8], [24, 16], [96, 64], [159, 104], [240, 156], [400, 400]];
let bad = 0, runs = 0, slow = 0, totM = 0, totR = 0, totP = 0, maxMs = 0; const notes = [];
for (const [C, R] of sizes) for (const [name, f] of Object.entries(shapes)) {
  if (C === 400 && !/every edge, no sea|two continents|ring of land around a sea/.test(name)) continue;
  const G = MME.gridFor(C, R), L = MME.lattice(G), N = C * R, cells = new Array(N); let land = 0;
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) { cells[r * C + c] = f(c, r, C, R); if (!WATER(cells[r * C + c])) land++; }
  const tag = `${C}x${R} ${name}`, fail = m => { bad++; notes.push(tag + ': ' + m); };
  for (const seed of [1, 77, 4242]) {
    runs++;
    // mountains
    let ids, t0 = Date.now(); const keep = new Set(); for (let i = 0; i < N; i += 37) keep.add(i);
    try { ids = MME.autoMountains(G, cells, { seed, amount: seed === 1 ? 0 : seed === 77 ? 0.5 : 1, keep }); } catch (e) { fail('mountains threw ' + e.message); continue; }
    const tm = Date.now() - t0; totM += ids.length; maxMs = Math.max(maxMs, tm); if (tm > 1500) { slow++; notes.push(tag + ': mountains took ' + tm + ' ms'); }
    if (new Set(ids).size !== ids.length) fail('mountains: the same hex twice');
    for (const i of ids) { if (!(i >= 0 && i < N)) { fail('mountains: a hex off the map'); break; } if (WATER(cells[i])) { fail('mountains: on water'); break; } if (cells[i] === 'M') { fail('mountains: on a mountain that was there'); break; } if (keep.has(i)) { fail('mountains: on a hex to be left alone'); break; } }
    if (land && ids.length > 0.3 * land + 2) fail('mountains: ' + ids.length + ' of ' + land + ' land hexes, too many');
    // rivers, on the ground with those mountains
    const cells2 = cells.slice(); for (const i of ids) cells2[i] = 'M';
    let res; t0 = Date.now(); const blocked = new Set(); for (let i = 5; i < N; i += 211) blocked.add(i);
    try { res = MME.autoRivers(G, cells2, { seed, density: seed % 3, blocked }); } catch (e) { fail('rivers threw ' + e.message); continue; }
    const tr = Date.now() - t0; maxMs = Math.max(maxMs, tr); if (tr > 4000) { slow++; notes.push(tag + ': rivers took ' + tr + ' ms'); }
    if (!res || !Array.isArray(res.rivers)) { fail('rivers: no list'); continue; }
    if (!land && res.rivers.length) fail('rivers on a map with no land');
    if (res.rivers.length > 900) fail('rivers: more than the cap');
    const near = (x, y) => { const c0 = Math.round((x - G.x0) / (L.CX[1] - L.CX[0])); let best = -1, bd = 1e18; for (let c = Math.max(0, c0 - 2); c <= Math.min(C - 1, c0 + 2); c++) for (let r = 0; r < R; r++) { const i = r * C + c, d = (L.CX[i] - x) ** 2 + (L.CY[i] - y) ** 2; if (d < bd) { bd = d; best = i; } } return best; };
    totR += res.rivers.length; for (const rv of res.rivers) { totP += Array.isArray(rv.pts) ? rv.pts.length : 0;
      if (!['stream', 'river', 'major', 'seasonal'].includes(rv.kind) && typeof rv.kind !== 'string') { fail('rivers: a kind that is not a word'); break; }
      if (!Array.isArray(rv.pts) || rv.pts.length < 2) { fail('rivers: a river of fewer than two points'); break; }
      let on = 0, off = false, long = false;
      for (let q = 0; q < rv.pts.length; q++) { const [x, y] = rv.pts[q]; if (!isFinite(x) || !isFinite(y)) { off = true; break; } if (x < -G.R * 2 || y < -G.R * 2 || x > G.w + G.R * 2 || y > G.h + G.R * 2) off = true; if (q && Math.hypot(x - rv.pts[q - 1][0], y - rv.pts[q - 1][1]) > G.R * 4.2) long = true; if (C <= 240) { const h = near(x, y); if (h >= 0 && !WATER(cells2[h])) on++; } }
      if (off) { fail('rivers: a point off the map or not a number'); break; }
      if (long) { fail('rivers: a jump of more than two hexes between points'); break; }
      if (C <= 240 && on < 0.5 * rv.pts.length) { fail('rivers: a river mostly over water (' + on + ' of ' + rv.pts.length + ')'); break; }
    }
  }
}
// the generator's own lands as well: whatever it makes, the tools must take
for (const [C, R] of [[96, 64], [159, 104]]) for (const style of ['continent', 'continents', 'isles']) for (const seed of [3, 9]) {
  runs++; const G = MME.gridFor(C, R), g = MME.generate(G, { seed, style, land: 0.38, relief: 0.45, climate: 'mixed', wind: 'W', rivers: 1 }), cells = g.cells.split('');
  try { const ids = MME.autoMountains(G, cells, { seed, amount: 0.5 }); for (const i of ids) cells[i] = 'M'; const rv = MME.autoRivers(G, cells, { seed, density: 1 }); if (!rv.rivers.every(r => r.pts.length >= 2 && r.pts.every(p => isFinite(p[0]) && isFinite(p[1])))) { bad++; notes.push(`${C}x${R} ${style}: broken river`); } } catch (e) { bad++; notes.push(`${C}x${R} ${style}: threw ${e.message}`); }
}
console.log('auto mountains and rivers:', runs, 'runs over', Object.keys(shapes).length, 'odd shapes and', sizes.length, 'sizes |', bad ? 'FAULTS ' + bad : 'no fault', '| slow', slow, '| mountains laid', totM, '| rivers', totR, 'with', totP, 'points | slowest call', maxMs, 'ms');
for (const n of [...new Set(notes)].slice(0, 30)) console.log('  ' + n);
process.exit(bad ? 1 : 0);
