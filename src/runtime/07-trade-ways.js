// ---------- the ways goods travel ----------
// boats: the sea and the lakes, and the rivers wide enough for a barge (the user's big rivers and rivers, and the map's wider ones);
// caravans: any land, cheap on a road and dear off it. A load changes from one to the other at a city's quay for little,
// anywhere else for more.
const NAVW = 2.2;
// v0.18.5, the owner's rule: a river takes small boats and ferries only; a great river takes the merchant ships. NAVR marks a hex of
// a navigable river 2 when a merchant ship gets up it (the user's great rivers, and the map's rivers at least NAVBIG wide) and 1 when
// only small boats do (the user's rivers, and the map's narrower navigable ones). Goods carried up a small boat's river cost ESMALL
// times a ship's river: small loads, slow going. Both numbers are Claude's.
const NAVBIG = 3.3, ESMALL = 3.5;
const WATR = new Uint8Array(N), NAVR = new Uint8Array(N), RIVM = new Uint8Array(N), PORTZ = new Uint8Array(N);
const NPX = new Float32Array(N), NPY = new Float32Array(N), NPC = new Uint16Array(N);
function eLink(u, v) { const k = nbIndex(u, v); if (k < 0) return; RIVM[u] |= 1 << k; RIVM[v] |= 1 << REVK[k]; }
function eRiverRun(xs, ys, runs, cls) {           // one navigable stretch: the hexes it passes, linked in order; cls 2 ships, 1 small boats
  let prev = -1; const hs = [];
  for (let j = 0; j < xs.length; j++) {
    const h = hexAt(xs[j], ys[j]); if (h < 0) { prev = -1; continue; }
    if (!WATR[h]) { NAVR[h] = Math.max(NAVR[h], cls || 2); NPX[h] += xs[j]; NPY[h] += ys[j]; NPC[h]++; }
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
      if (sampleOff(j)) { if (xs.length > 1) eRiverRun(xs, ys, runs, r.w >= NAVBIG ? 2 : 1); xs = []; ys = []; continue; }
      xs.push(BS.x[j]); ys.push(BS.y[j]);
    }
    if (xs.length > 1) eRiverRun(xs, ys, runs, r.w >= NAVBIG ? 2 : 1);
  }
  for (const r of ED.rivers) {
    if (r.kind !== 'big' && r.kind !== 'river') continue;
    const d = RDER.get(r.id); if (!d) continue;
    const xs = [], ys = [];                          // the drawn line, half a unit apart, so no hex on it is skipped
    for (let i = 0; i < d.q.length - 1; i++) { const a = d.q[i], b = d.q[i + 1], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.5)); for (let s = 0; s < n; s++) { xs.push(a[0] + (b[0] - a[0]) * s / n); ys.push(a[1] + (b[1] - a[1]) * s / n); } }
    const e = d.q[d.q.length - 1]; xs.push(e[0]); ys.push(e[1]);
    eRiverRun(xs, ys, runs, r.kind === 'big' ? 2 : 1);
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
let RAIL_STEP = 0.3;                                  // one hex by rail, against 0.6 on a royal road and about 2.4 over open grass (mine)
const CAR = { g: 2.4, s: 2.4, v: 2.4, h: 2.4, e: 2.4, p: 2.6, r: 2.5, y: 2.6, u: 4, c: 3, d: 4.2, t: 4.5, n: 6, f: 3.6, o: 3.4, k: 5, j: 6, w: 6, m: 5.5, a: 3.6, M: 9 };
function caravanStep(u, k, v) {
  const x = EX[u * 6 + k];
  if (RAILE.has(u * 6 + k)) return RAIL_STEP;     // a train: cheaper than the best road (v0.17.0)
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
      else if (RIVM[h] >> k & 1) f(v * 2 + 1, (ZO[v] === 'J' && !NEARC[v] ? ERIV * EWILDR : ERIV) * (NAVR[h] === 1 || NAVR[v] === 1 ? ESMALL : 1));   // v0.18.5: small boats only
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

