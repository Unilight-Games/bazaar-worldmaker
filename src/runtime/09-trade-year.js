// ---------- the year's trade ----------
let ECON = null, econDirty = true, econTimer = 0;
function econCompute() {
  const t0 = performance.now();
  ensureRoutes();                                    // the roads as they stand, and the river crossings
  eWaterways();
  CL_DIRTY = true; climEnsure();                     // the climate as the map now stands
  ecoPrep();
  const cities = visibleCities().map(c => {
    const h = landHex(hexAt(c.x, c.y)), ki0 = KIX[c.kind] != null ? KIX[c.kind] : 1, ki = ecoKi(c.id, c.kind);
    return { id: c.id, name: c.name || 'เมืองไม่มีชื่อ', kind: c.kind, ki, x: c.x, y: c.y, h, zone: h >= 0 ? ZO[h] : '.', pop: ecoPop(c.id, ki0), lk: KIK[ki], st: h >= 0 ? ECO.cells[h] : '.' };
  }).filter(c => c.h >= 0);
  PORTZ.fill(0);
  for (const c of cities) { PORTZ[c.h] = 1; for (let k = 0; k < 6; k++) { const v = NB[c.h * 6 + k]; if (v >= 0 && !WATR[v]) PORTZ[v] = 1; } }
  eLanes(cities);
  const { own, dist } = eHinterland(cities, false), Hs = eStats(cities, own, (i, k) => 1 - 0.5 * dist[i] / EREACH[cities[k].ki]);
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
    for (const g of EGOODS) { if (g.off) continue; let v = (g.f(H) + (g.far ? g.f(Ho[k]) : 0)) * (g.pct == null ? 1 : g.pct); if (!(v > 0.004)) continue; v *= (cn[g.cat] || 1) * orgProd(c, g.cat); if (g.id === 'silver' && c.id === 'vidsaga') v *= 1.5; prod[k].set(g.id, v); }
  });
  // what each city needs, before its workshops
  const need = cities.map(c => {
    const m = {}; for (const cat of ECATS) m[cat] = ENEED[cat][c.ki] * c.pop; if (!c.port) m.ships = 0;
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
    for (const m of EMADEC) { const v = ind * EWORK[m].base * spec[m] * (cn[m] || 1) * orgProd(c, m); if (v > 0.01) p[m] = v; }
    for (const m in p) for (const [cat, q] of Object.entries(EWORK[m].in)) need[k][cat] += p[m] * q;
    return p;
  });
  const flows = [], links = eNetwork(cities);
  // what trade between two cities costs: the cheapest way along the network's lines, through the cities between. A boat that
  // comes in and goes on by water passes a smaller place without unloading; at a centre of rank 2 or up the cargo comes ashore
  // to be sorted and sent on, and pays the quay both ways, as it does wherever it changes between boat and caravan.
  const wetEnd = (L, atA) => { const st = L.states; if (!st) return false; for (let q = 1; q <= 2 && q < st.length; q++) if (st[atA ? q : st.length - 1 - q] & 1) return true; return false; };
  const adj = cities.map(() => []);
  links.forEach((L, li) => { if (L.fail) return; const wa = wetEnd(L, true), wb = wetEnd(L, false); const lc = ecoLinkCost(L, cities) * orgHaul(cities[L.ia], cities[L.ib]); adj[L.ia].push([L.ib, lc, li, wa, wb]); adj[L.ib].push([L.ia, lc, li, wb, wa]); });
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
  const bundles = eBundles(links, cities);
  ECON = { ver: (ECON ? ECON.ver : 0) + 1, plan, cities, prod, need, got, left, flows, links, bundles, NT, P0, P1, MK, rounds, ms: performance.now() - t0 };
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

