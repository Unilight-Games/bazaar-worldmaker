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

