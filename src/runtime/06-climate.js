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
function eHinterland(cities, far) {
  const own = new Int32Array(N).fill(-1), dist = new Float32Array(N).fill(1e9);
  HN = 0; const s = ++stampN;
  cities.forEach((c, k) => { const h = c.h; if (h < 0) return; if (0 < dist[h]) { dist[h] = 0; own[h] = k; SEENS[h] = s; hpush(h, 0); } });
  while (HN) {
    const u = hpop(); if (DONES[u] === s) continue; DONES[u] = s;
    if (isW(eff(u))) continue;                                     // water is claimed but not crossed
    const k = own[u], reach = (cities[k].reach || EREACH[cities[k].ki]) * (far ? EFAR[cities[k].ki] : 1);
    for (let j = 0; j < 6; j++) {
      const v = NB[u * 6 + j]; if (v < 0 || DONES[v] === s) continue;
      const g = dist[u] + (eff(v) === 'M' ? 1.5 : 1); if (g > reach) continue;
      if (g < dist[v]) { dist[v] = g; own[v] = k; SEENS[v] = s; hpush(v, g); }
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

