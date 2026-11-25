// Map Maker Engine: the hex lattice and the procedural ground. No DOM here: the menu uses it to lay out a new map,
// the map runtime uses it for the automatic mountains and rivers.
(function () {
  const MME = window.MME = window.MME || {};
  const R0 = 8.53323697862267, X0 = 12.5, Y0 = 6.8, DX = 1.5 * R0, DY = Math.sqrt(3) * R0;

  // three canvases: the middle one is exactly the grid of the Gresland map
  MME.SIZES = {
    s: { cols: 96, rows: 64, name: 'เล็ก', note: 'ภูมิภาคเดียว หรือเกาะใหญ่หนึ่งเกาะ' },
    m: { cols: 159, rows: 104, name: 'กลาง', note: 'ทวีปหนึ่งทวีป เท่าแผนที่เกรสแลนด์' },
    l: { cols: 240, rows: 156, name: 'ใหญ่', note: 'หลายทวีป หรือโลกทั้งใบ' }
  };
  MME.gridFor = (cols, rows) => ({ x0: X0, y0: Y0, R: R0, cols, rows, cmin: 0, kmin: 0, w: Math.ceil(2 * X0 + (cols - 1) * DX), h: Math.floor(Y0 + (rows - 0.5) * DY) });

  // flat-top hexes, odd columns half a row lower: the same lattice as the map runtime
  function lattice(G) {
    const cols = G.cols, rows = G.rows, N = cols * rows, CX = new Float32Array(N), CY = new Float32Array(N), NB = new Int32Array(N * 6);
    const at = (c, r) => c >= 0 && c < cols && r >= 0 && r < rows ? r * cols + c : -1;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const i = r * cols + c, o = c & 1;
      CX[i] = G.x0 + c * DX; CY[i] = G.y0 + r * DY + (o ? DY / 2 : 0);
      NB[i * 6] = at(c, r - 1); NB[i * 6 + 1] = at(c, r + 1);
      NB[i * 6 + 2] = at(c - 1, o ? r : r - 1); NB[i * 6 + 3] = at(c - 1, o ? r + 1 : r);
      NB[i * 6 + 4] = at(c + 1, o ? r : r - 1); NB[i * 6 + 5] = at(c + 1, o ? r + 1 : r);
    }
    return { G, cols, rows, N, CX, CY, NB };
  }
  MME.lattice = lattice;

  // ---------- noise ----------
  function hash2(i, j, seed) { let h = (i * 374761393 + j * 668265263 + seed * 1274126177) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; h ^= h >>> 16; return (h >>> 0) / 4294967296; }
  function vnoise(x, y, seed) {
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed), c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y, seed, oct) { let t = 0, a = 0.5, n = 0; for (let o = 0; o < oct; o++) { t += a * vnoise(x, y, seed + o * 101); n += a; x *= 2.03; y *= 2.03; a *= 0.5; } return t / n; }
  function rng(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

  // steps over the lattice from every hex of a set (water, mountains) to the rest
  function distFrom(L, isSrc, cap) {
    const d = new Uint16Array(L.N).fill(cap || 999), q = [];
    for (let i = 0; i < L.N; i++) if (isSrc(i)) { d[i] = 0; q.push(i); }
    for (let h = 0; h < q.length; h++) { const u = q[h]; for (let k = 0; k < 6; k++) { const v = L.NB[u * 6 + k]; if (v >= 0 && d[v] > d[u] + 1) { d[v] = d[u] + 1; q.push(v); } } }
    return d;
  }

  // ---------- water finds its way ----------
  // Every land hex drains to a neighbour lower than itself until the sea (priority flood, so no hollow traps the water);
  // a lake is level ground the water crosses. acc is the rain gathered from everything upstream.
  function drainage(L, kind, height, rain) {     // kind: 0 land, 1 lake, 2 sea
    const N = L.N, NB = L.NB, to = new Int32Array(N).fill(-1), fill = new Float32Array(N), done = new Uint8Array(N), order = [];
    const hp = [], hf = [];
    const push = (i, f) => { let p = hp.length; hp.push(i); hf.push(f); while (p > 0) { const q = (p - 1) >> 1; if (hf[q] <= f) break; hp[p] = hp[q]; hf[p] = hf[q]; p = q; } hp[p] = i; hf[p] = f; };
    const pop = () => {
      const top = hp[0], li = hp.pop(), lf = hf.pop(), n = hp.length;
      if (n) { let p = 0; for (;;) { let c = 2 * p + 1; if (c >= n) break; if (c + 1 < n && hf[c + 1] < hf[c]) c++; if (hf[c] >= lf) break; hp[p] = hp[c]; hf[p] = hf[c]; p = c; } hp[p] = li; hf[p] = lf; }
      return top;
    };
    for (let i = 0; i < N; i++) {
      if (kind[i] === 2) continue;
      let out = -1, edge = false;
      for (let k = 0; k < 6; k++) { const v = NB[i * 6 + k]; if (v < 0) edge = true; else if (kind[v] === 2 && out < 0) out = v; }
      if (out >= 0 || edge) { to[i] = out >= 0 ? out : -2; fill[i] = height[i]; done[i] = 1; push(i, height[i]); }   // -2: off the edge of the map
    }
    while (hp.length) {
      const u = pop(); order.push(u);
      for (let k = 0; k < 6; k++) {
        const v = NB[u * 6 + k]; if (v < 0 || done[v] || kind[v] === 2) continue;
        done[v] = 1; to[v] = u; fill[v] = Math.max(height[v], fill[u] + 0.002 + 0.03 * hash2(v, 3, 77)); push(v, fill[v]);   // on level ground the water wanders
      }
    }
    const acc = new Float32Array(N);
    for (let i = 0; i < N; i++) if (kind[i] !== 2) acc[i] = rain[i];
    for (let j = order.length - 1; j >= 0; j--) { const u = order[j], d = to[u]; if (d >= 0 && kind[d] !== 2) acc[d] += acc[u]; }
    return { to, acc, fill, order };
  }

  // the rivers as lines: sources high up, tributaries joining and never parting, each stretch wider than the one above it
  function traceRivers(L, kind, dr, o) {
    const { N, NB, CX, CY } = L, { to, acc } = dr, T = o.T, seed = o.seed | 0, blocked = o.blocked || new Set();
    const cls = a => a >= T * 11 ? 2 : a >= T * 3.2 ? 1 : 0, KIND = ['stream', 'river', 'big'];
    const jx = i => CX[i] + (hash2(i, 7, seed) - 0.5) * R0 * 0.55, jy = i => CY[i] + (hash2(i, 13, seed) - 0.5) * R0 * 0.55;
    const up = new Int32Array(N).fill(-1);                       // the greatest stream flowing into each hex
    for (let i = 0; i < N; i++) { const d = to[i]; if (d >= 0 && kind[i] !== 2 && (up[d] < 0 || acc[i] > acc[up[d]])) up[d] = i; }
    const heads = [], lenOf = h => { let len = 0, w = h; while (w >= 0 && kind[w] !== 2 && len < 4000) { len++; w = to[w]; } return len; };
    for (let i = 0; i < N; i++) {
      if (kind[i] !== 0 || acc[i] < T || blocked.has(i)) continue;
      const u = up[i]; if (u >= 0 && acc[u] >= T) continue;      // not the top of its channel
      let h = i, g = 0, lake = -1, src = '';                     // climb to the spring: up the greatest feeder towards the high ground
      while (g++ < 40) { const v = up[h]; if (v < 0 || kind[v] !== 0 || acc[v] < T * 0.3 || blocked.has(v)) break; h = v; if (o.isMt && o.isMt(h)) break; }
      // Snow and ice count as a source as mountains do: meltwater. A river with no visible source looked unreal to the owner (v0.15.2): from where the water has gathered enough to draw,
      // the line climbs on up the greatest feeder, a thin stream, to the mountain or the lake it comes from, when one is near.
      if (o.isMt && o.isMt(h)) src = 'mt';
      else { let x = h, k = 0; while (k++ < (o.climb || 8)) { const v = up[x]; if (v < 0 || blocked.has(v) || kind[v] === 2) break; if (kind[v] === 1) { src = 'lake'; lake = v; break; } x = v; if (o.isMt && o.isMt(x)) { src = 'mt'; break; } } if (src) h = x; }
      heads.push([h, lenOf(h), lake, src]);
    }
    // every lake that spills over sends out a stream of its own, though the water it gathers is too little to draw by itself
    if (o.lakeOut !== false) for (let lk = 0; lk < N; lk++) {
      if (kind[lk] !== 1) continue; const ex = to[lk]; if (ex < 0 || kind[ex] !== 0 || blocked.has(ex) || acc[ex] >= T) continue;
      if (o.arid && o.arid(ex)) continue;                        // a lake of the dry country keeps its water and turns to salt
      heads.push([ex, lenOf(ex), lk, 'lake']);
    }
    heads.sort((a, b) => b[1] - a[1] || a[0] - b[0]);            // the longest first: it is the main stem, the rest join it
    const seen = new Uint8Array(N), out = [];
    const emit = (pts, hexes, c, part) => {
      if (pts.length < 2 || hexes.length < (part && part.src === 'lake' ? 1 : 2)) return;
      let dry = 0; for (const h of hexes) if (o.arid && o.arid(h)) dry++;
      out.push({ kind: c === 0 && dry * 2 > hexes.length ? 'seasonal' : KIND[c], pts: pts.map(p => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10]), hexes, head: !!(part && part.head), src: part ? part.src || '' : '' });
    };
    for (const [head, , lake, src] of heads) {
      if (seen[head]) continue;
      let cur = head, pts = lake >= 0 ? [[CX[lake] + (CX[head] - CX[lake]) * 0.4, CY[lake] + (CY[head] - CY[lake]) * 0.4]] : [], hexes = [], c = cls(acc[cur]), total = 0;
      const first = parts => { if (parts.length) { parts[0].src = src || ''; parts[0].head = true; } };
      const parts = [];
      for (;;) {
        seen[cur] = 1; pts.push([jx(cur), jy(cur)]); hexes.push(cur); total++;
        const nx = to[cur];
        if (nx === -2) { parts.push([pts, hexes, c]); break; }                                   // off the map
        if (nx < 0) { parts.push([pts, hexes, c]); break; }
        if (kind[nx] === 2) { pts.push([CX[cur] + (CX[nx] - CX[cur]) * 0.62, CY[cur] + (CY[nx] - CY[cur]) * 0.62]); parts.push([pts, hexes, c]); break; }   // the mouth
        if (kind[nx] === 1) {                                                                   // into a lake: the river ends at its shore, and leaves from the far one
          pts.push([CX[cur] + (CX[nx] - CX[cur]) * 0.6, CY[cur] + (CY[nx] - CY[cur]) * 0.6]); parts.push([pts, hexes, c]);
          let lk = nx, g = 0; while (g++ < 500 && to[lk] >= 0 && kind[to[lk]] === 1) lk = to[lk];
          const ex = to[lk];
          if (ex < 0 || kind[ex] !== 0 || seen[ex] || blocked.has(ex)) { pts = null; break; }
          pts = [[CX[lk] + (CX[ex] - CX[lk]) * 0.4, CY[lk] + (CY[ex] - CY[lk]) * 0.4]]; hexes = []; c = cls(acc[ex]); cur = ex; continue;
        }
        if (seen[nx] || blocked.has(nx)) {                                                      // a confluence: run one step along the river it joins
          pts.push([jx(nx), jy(nx)]); const n2 = to[nx];
          if (!blocked.has(nx) && n2 >= 0 && kind[n2] === 0) pts.push([jx(n2), jy(n2)]);
          parts.push([pts, hexes, c]); break;
        }
        const c2 = cls(acc[nx]);
        if (c2 > c) { pts.push([jx(nx), jy(nx)]); parts.push([pts, hexes, c]); pts = []; hexes = []; c = c2; }   // wider below a confluence
        cur = nx;
      }
      if (total < (o.minLen || (lake >= 0 ? 2 : 3))) continue;
      first(parts);
      for (const pt of parts) emit(pt[0], pt[1], pt[2], pt);
    }
    return out;
  }

  const WATER = b => b === 'S' || b === 'i' || b === 'L' || b === '.';
  // how much of a cycle's rain each kind of ground stands for: what the user painted tells the weather
  const RAINW = { g: 1, h: 1.2, s: 0.5, v: 0.75, c: 0.28, d: 0.06, t: 0.4, n: 0.35, f: 0.9, o: 1.2, k: 1.1, j: 1.7, a: 1.3, e: 1.05, w: 1.5, m: 1.3, p: 1.2, r: 1.3, y: 0.2, u: 0.15, M: 1.4, L: 1 };
  const ARIDB = new Set(['d', 'c', 'y', 'u']);
  MME.RAINW = RAINW;

  // ---------- rivers for ground already painted ----------
  // cells: one code a hex (the ground as it stands). The land rises from the shore and towards the mountains, the rain is what
  // the ground says, and the water runs down from the mountains to the sea, the lakes on its way.
  MME.autoRivers = function (G, cells, opt) {
    const L = lattice(G), N = L.N, o = opt || {}, seed = o.seed | 0;
    const kind = new Uint8Array(N); let land = 0, mts = 0;
    for (let i = 0; i < N; i++) { const b = cells[i]; kind[i] = b === 'L' ? 1 : WATER(b) ? 2 : 0; if (!kind[i]) { land++; if (b === 'M') mts++; } }
    if (!land) return { rivers: [], why: 'ยังไม่มีแผ่นดินบนแผนที่' };
    const dW = distFrom(L, i => kind[i] !== 0), dM = distFrom(L, i => cells[i] === 'M', 60);
    const height = new Float32Array(N), rain = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      if (kind[i] === 2) continue;
      const b = cells[i];
      if (kind[i] === 1) { height[i] = 0.02; rain[i] = 1; continue; }
      let nm = 0; if (b === 'M') for (let k = 0; k < 6; k++) { const v = L.NB[i * 6 + k]; if (v >= 0 && cells[v] === 'M') nm++; }
      height[i] = 0.08 * Math.min(dW[i], 14) + (b === 'M' ? 2.2 + 0.25 * nm : 1.2 * Math.exp(-dM[i] / 2.5)) + 0.34 * fbm(L.CX[i] / 95, L.CY[i] / 95, seed + 5, 3) + 0.1 * vnoise(L.CX[i] / 24, L.CY[i] / 24, seed + 9);
      rain[i] = RAINW[b] == null ? 1 : RAINW[b];
    }
    // a lake lies level with the lowest ground on its shore
    for (let i = 0; i < N; i++) if (kind[i] === 1) { let m = 9; for (let k = 0; k < 6; k++) { const v = L.NB[i * 6 + k]; if (v >= 0 && kind[v] === 0) m = Math.min(m, height[v]); } height[i] = Math.max(0.02, m - 0.02); }
    const dr = drainage(L, kind, height, rain);
    const T = [38, 22, 12][o.density == null ? 1 : o.density];
    const all = traceRivers(L, kind, dr, { T, seed, blocked: o.blocked, isMt: i => cells[i] === 'M' || cells[i] === 'n', arid: i => ARIDB.has(cells[i]), minLen: 3 });
    // where the land has mountains a river worth drawing comes down from them, or is long enough to have gathered on the plain
    const rivers = all.filter(r => { if (!mts || r.src) return true; const h0 = r.hexes[0]; return h0 == null || dM[h0] <= 4 || r.kind !== 'stream' || r.hexes.length >= 6; });
    return { rivers: rivers.slice(0, o.max || 900).map(r => ({ kind: r.kind, pts: r.pts })), why: '' };
  };

  // ---------- mountains for ground already painted ----------
  // Ranges, as mountains come: a belt along one side of a landmass, set back from the shore, with passes through it; a second,
  // shorter belt on a great landmass; a short spine on an island; nothing on a speck of land. keep: hexes left alone.
  MME.autoMountains = function (G, cells, opt) {
    const L = lattice(G), N = L.N, o = opt || {}, rnd = rng((o.seed | 0) + 77), amount = o.amount == null ? 0.5 : o.amount, keep = o.keep || new Set();
    const isLand = i => !WATER(cells[i]);
    const dW = distFrom(L, i => !isLand(i));
    const comp = new Int32Array(N).fill(-1), comps = [];
    for (let s = 0; s < N; s++) {
      if (!isLand(s) || comp[s] >= 0) continue;
      const id = comps.length, q = [s]; comp[s] = id;
      for (let h = 0; h < q.length; h++) { const u = q[h]; for (let k = 0; k < 6; k++) { const v = L.NB[u * 6 + k]; if (v >= 0 && isLand(v) && comp[v] < 0) { comp[v] = id; q.push(v); } } }
      comps.push(q);
    }
    const out = new Set();
    const put = i => { if (i >= 0 && isLand(i) && cells[i] !== 'M' && !keep.has(i) && dW[i] >= 1) out.add(i); };
    const hexNear = (x, y, from) => {             // the land hex of this landmass nearest a point, looking outward from a hex
      let best = from, bd = (L.CX[from] - x) ** 2 + (L.CY[from] - y) ** 2, moved = true, g = 0;
      while (moved && g++ < 400) { moved = false; for (let k = 0; k < 6; k++) { const v = L.NB[best * 6 + k]; if (v < 0 || !isLand(v)) continue; const d = (L.CX[v] - x) ** 2 + (L.CY[v] - y) ** 2; if (d < bd) { bd = d; best = v; moved = true; } } }
      return best;
    };
    for (const q of comps) {
      const n = q.length; if (n < 14) continue;
      let mx = 0, my = 0; for (const i of q) { mx += L.CX[i]; my += L.CY[i]; } mx /= n; my /= n;
      let sxx = 0, sxy = 0, syy = 0; for (const i of q) { const x = L.CX[i] - mx, y = L.CY[i] - my; sxx += x * x; sxy += x * y; syy += y * y; }
      const th = 0.5 * Math.atan2(2 * sxy, sxx - syy), ux = Math.cos(th), uy = Math.sin(th), vx = -uy, vy = ux;
      let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9, deep = q[0];
      for (const i of q) { const x = L.CX[i] - mx, y = L.CY[i] - my, a = x * ux + y * uy, b = x * vx + y * vy; a0 = Math.min(a0, a); a1 = Math.max(a1, a); b0 = Math.min(b0, b); b1 = Math.max(b1, b); if (dW[i] > dW[deep]) deep = i; }
      const len = a1 - a0, target = Math.round(n * (0.035 + 0.06 * amount));
      if (n < 60) {                                 // an island: a short spine from its heart
        let h = deep; const steps = Math.max(1, Math.round(n / 12)), dir = rnd() < 0.5 ? 1 : -1;
        for (let s = 0; s < steps; s++) { put(h); h = hexNear(L.CX[h] + ux * dir * DX * 1.2, L.CY[h] + uy * dir * DX * 1.2, h); if (dW[h] < 1) break; }
        continue;
      }
      const ranges = n < 400 ? 1 : n < 1600 ? 2 : 3; let side = rnd() < 0.5 ? 1 : -1, placed0 = out.size;
      for (let rg = 0; rg < ranges; rg++) {
        const share = rg === 0 ? 0.62 : 0.38 / (ranges - 1 || 1), want = Math.round(target * (ranges === 1 ? 1 : share));
        const span = (rg === 0 ? 0.55 + 0.3 * rnd() : 0.25 + 0.25 * rnd()) * len, t0 = a0 + 0.1 * len + rnd() * Math.max(0, 0.8 * len - span);
        const half = (side > 0 ? b1 : -b0), off = half * (0.3 + 0.3 * rnd()), ph = rnd() * 50, wob = half * 0.22;
        let cur = hexNear(mx + ux * t0 + vx * side * off, my + uy * t0 + vy * side * off, deep), got = 0, sincePass = 0, passAt = 7 + Math.floor(rnd() * 8), lost = 0;
        for (let t = t0; t <= t0 + span && got < want * 1.15; t += DX * 0.9) {
          const w = side * (off + wob * (2 * fbm(t / 110, ph, (o.seed | 0) + rg * 31, 3) - 1) + half * 0.18 * Math.sin(Math.PI * (t - t0) / span + ph));   // a range bends
          cur = hexNear(mx + ux * t + vx * w, my + uy * t + vy * w, cur);
          if (dW[cur] < 2) { if (++lost > 3) break; continue; } lost = 0;
          if (++sincePass >= passAt) { sincePass = 0; passAt = 7 + Math.floor(rnd() * 8); continue; }      // a pass through the range
          const before = out.size; put(cur);
          const edge = (t - t0) / span, thick = Math.sin(Math.PI * Math.min(1, Math.max(0, edge))) * (0.35 + 0.5 * amount);   // thin at both ends
          for (let k = 0; k < 6; k++) { const v = L.NB[cur * 6 + k]; if (v >= 0 && dW[v] >= 2 && rnd() < thick) put(v); }
          got += out.size - before;
        }
        side = -side;
      }
      if (out.size === placed0) put(deep);
    }
    return [...out];
  };

  // ---------- a whole new land ----------
  // opt: seed, land (share of the map that is land), style: 'continent' | 'continents' | 'isles', relief 0..1, climate:
  // 'mixed' | 'cold' | 'temperate' | 'hot', rivers 0..2 or -1 for none. Returns cells ('.' is sea) and the rivers.
  MME.generate = function (G, opt) {
    const L = lattice(G), N = L.N, o = opt || {}, seed = (o.seed | 0) || 1, rnd = rng(seed * 7919 + 3);
    const landShare = Math.min(0.75, Math.max(0.08, o.land == null ? 0.38 : o.land)), style = o.style || 'continent', relief = o.relief == null ? 0.5 : o.relief;
    const W = G.w, H = G.h, sc = Math.min(W, H);
    const blobs = [];
    if (style === 'continent') blobs.push([0.5 + (rnd() - 0.5) * 0.12, 0.5 + (rnd() - 0.5) * 0.12, 0.44, 0.38]);
    else if (style === 'continents') { const k = 2 + Math.floor(rnd() * 3); for (let b = 0; b < k; b++) blobs.push([0.16 + 0.68 * ((b + 0.5) / k) + (rnd() - 0.5) * 0.1, 0.25 + 0.5 * rnd(), 0.2 + 0.1 * rnd(), 0.22 + 0.14 * rnd()]); }
    else { const k = 9 + Math.floor(rnd() * 8); for (let b = 0; b < k; b++) blobs.push([0.1 + 0.8 * rnd(), 0.12 + 0.76 * rnd(), 0.06 + 0.08 * rnd(), 0.06 + 0.08 * rnd()]); }
    const e = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const x = L.CX[i], y = L.CY[i];
      const wx = x + 90 * (fbm(x / 260, y / 260, seed + 11, 3) - 0.5), wy = y + 90 * (fbm(x / 260, y / 260, seed + 23, 3) - 0.5);
      let m = 0; for (const [bx, by, rx, ry] of blobs) { const dx = (wx / W - bx) / rx, dy = (wy / H - by) / ry; m = Math.max(m, Math.exp(-(dx * dx + dy * dy) * 1.3)); }
      const n = fbm(wx / (sc * 0.32), wy / (sc * 0.32), seed, 5);
      const border = Math.min(x, W - x, y, H - y) / (sc * 0.07);
      e[i] = (0.62 * m + (style === 'isles' ? 0.55 : 0.42) * n) * Math.min(1, border) - (border < 1 ? (1 - border) * 0.3 : 0);
    }
    const sorted = Float32Array.from(e).sort(), sea = sorted[Math.min(N - 1, Math.floor(N * (1 - landShare)))];
    const kind = new Uint8Array(N); let land = 0;
    for (let i = 0; i < N; i++) { kind[i] = e[i] > sea ? 0 : 2; if (!kind[i]) land++; }
    // single hexes of sea shut inside the land become land, single hexes of land far out at sea go under: a cleaner coast
    for (let i = 0; i < N; i++) { let w = 0, n = 0; for (let k = 0; k < 6; k++) { const v = L.NB[i * 6 + k]; if (v >= 0) { n++; if (kind[v] === 2) w++; } } if (kind[i] === 2 && w === 0 && n === 6) kind[i] = 0; else if (kind[i] === 0 && w === n) kind[i] = 2; }
    const dSea = distFrom(L, i => kind[i] === 2);
    // mountains: ridged noise picks out belts; the highest ground of each belt, set back from the coast
    const emax = sorted[N - 1], ms = new Float32Array(N), cand = [];
    for (let i = 0; i < N; i++) {
      if (kind[i]) continue;
      const x = L.CX[i], y = L.CY[i], rdg = 1 - Math.abs(2 * fbm(x / (sc * 0.42) + 3.1, y / (sc * 0.42) - 1.7, seed + 301, 4) - 1);
      ms[i] = 0.45 * (e[i] - sea) / (emax - sea + 1e-6) + 0.75 * rdg * rdg * rdg + (dSea[i] >= 2 ? 0 : -0.5);
      cand.push(i);
    }
    cand.sort((a, b) => ms[b] - ms[a]);
    const isM = new Uint8Array(N), nM = Math.round(cand.length * (0.03 + 0.09 * relief));
    for (let j = 0; j < nM; j++) isM[cand[j]] = 1;
    for (let i = 0; i < N; i++) if (isM[i]) { let m = 0; for (let k = 0; k < 6; k++) { const v = L.NB[i * 6 + k]; if (v >= 0 && isM[v]) m++; } if (!m && hash2(i, 3, seed) < 0.7) isM[i] = 0; }   // few lone peaks
    const dM = distFrom(L, i => isM[i] === 1, 60);
    const height = new Float32Array(N);
    for (let i = 0; i < N; i++) if (!kind[i]) height[i] = (e[i] - sea) * 3 + 0.05 * Math.min(dSea[i], 12) + (isM[i] ? 2 : 1.0 * Math.exp(-dM[i] / 2.5)) + 0.3 * fbm(L.CX[i] / 95, L.CY[i] / 95, seed + 401, 3) + 0.09 * vnoise(L.CX[i] / 24, L.CY[i] / 24, seed + 409);
    // the weather: wind off the western sea loses its rain crossing the land and most of what is left on a range
    const moist = new Float32Array(N), wind = o.wind === 'E' ? -1 : 1;
    for (let r = 0; r < L.rows; r++) {
      let hum = 1;
      for (let s = 0; s < L.cols; s++) {
        const c = wind > 0 ? s : L.cols - 1 - s, i = r * L.cols + c;
        if (kind[i] === 2) { hum = Math.min(1, hum + 0.12); continue; }
        hum *= isM[i] ? 0.66 : 0.986; moist[i] = hum;
      }
    }
    const sm = new Float32Array(N);
    for (let i = 0; i < N; i++) { if (kind[i]) continue; let t = moist[i] * 2, n = 2; for (let k = 0; k < 6; k++) { const v = L.NB[i * 6 + k]; if (v >= 0 && !kind[v]) { t += moist[v]; n++; } } sm[i] = 0.6 * t / n + 0.3 * Math.exp(-dSea[i] / 9) + 0.22 * (fbm(L.CX[i] / 210, L.CY[i] / 210, seed + 51, 3) - 0.5); }
    const CLIM = { mixed: [-5, 33], cold: [-15, 24], temperate: [3, 19], hot: [15, 14] }[o.climate || 'mixed'] || [-9, 37];
    const cells = new Array(N).fill('.'), temp = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      if (kind[i]) continue;
      const lat = L.CY[i] / H, T = CLIM[0] + CLIM[1] * lat - 2.2 * Math.min(4, height[i]) + 3 * (fbm(L.CX[i] / 170, L.CY[i] / 170, seed + 71, 2) - 0.5), m = sm[i];
      temp[i] = T;
      let b;
      if (isM[i]) b = 'M';
      else if (T < -5) b = 'n';
      else if (T < 1) b = 't';
      else if (T < 8) b = m > 0.34 ? 'f' : m > 0.18 ? 's' : 'c';
      else if (T < 17) b = m > 0.62 ? 'o' : m > 0.47 ? (hash2(i, 5, seed) < 0.5 + (m - 0.47) * 2 ? 'o' : 'g') : m > 0.32 ? 'g' : m > 0.2 ? 's' : m > 0.11 ? 'c' : 'd';
      else b = m > 0.66 ? 'j' : m > 0.4 ? 'v' : m > 0.25 ? 's' : m > 0.13 ? 'c' : 'd';
      cells[i] = b;
    }
    // windward shores under a steady sea wind: heath; cool wet lowlands by the water: marsh
    for (let i = 0; i < N; i++) {
      const b = cells[i]; if (b === '.' || b === 'M') continue;
      if (dSea[i] === 1 && (b === 'g' || b === 'o') && moist[i] > 0.9 && hash2(i, 9, seed) < 0.55) cells[i] = 'h';
    }
    let rivers = [];
    const rain = new Float32Array(N); for (let i = 0; i < N; i++) if (!kind[i]) rain[i] = 0.12 + 1.5 * Math.max(0, sm[i]) + (isM[i] ? 0.4 : 0);
    const dr = drainage(L, kind, height, rain);
    // hollows the flood had to fill deep become lakes
    const lakes = []; for (let i = 0; i < N; i++) if (!kind[i] && !isM[i] && dr.fill[i] - height[i] > 0.12 && dSea[i] >= 3 && sm[i] > 0.3) lakes.push(i);
    const cap = Math.round(land * 0.012); lakes.sort((a, b) => (dr.fill[b] - height[b]) - (dr.fill[a] - height[a]));
    for (const i of lakes.slice(0, cap)) { kind[i] = 1; cells[i] = 'L'; }
    for (let i = 0; i < N; i++) if (kind[i] === 1) { let m = 0; for (let k = 0; k < 6; k++) { const v = L.NB[i * 6 + k]; if (v >= 0 && kind[v] === 1) m++; } if (!m && hash2(i, 17, seed) < 0.5) { kind[i] = 0; cells[i] = temp[i] > 17 ? 'w' : 'm'; } }   // a lone hollow is a marsh as often as a lake
    // Lakes of the high ground (v0.15.2): a tarn in a cirque beside a range, where a mountain river begins. Two or more mountain
    // hexes about it, wet enough, set back from the sea, and none closer to another than nine hexes; about one a range of 45 hexes.
    { let nMt = 0; for (let i = 0; i < N; i++) nMt += isM[i]; const want = Math.min(16, Math.round(nMt / 45)), cand = [], tarns = [], far = (9 * DX) * (9 * DX);
      for (let i = 0; i < N; i++) { if (kind[i] || isM[i] || dM[i] !== 1 || dSea[i] < 4 || sm[i] < 0.25) continue; let m = 0; for (let k = 0; k < 6; k++) { const v = L.NB[i * 6 + k]; if (v >= 0 && isM[v]) m++; } if (m >= 2) cand.push([i, m + hash2(i, 31, seed)]); }
      cand.sort((a, b) => b[1] - a[1]);
      for (const [i] of cand) { if (tarns.length >= want) break; if (tarns.some(j => (L.CX[i] - L.CX[j]) ** 2 + (L.CY[i] - L.CY[j]) ** 2 < far)) continue; tarns.push(i); }
      for (const i of tarns) { kind[i] = 1; cells[i] = 'L'; } }
    if (o.rivers !== -1) {
      for (let i = 0; i < N; i++) if (kind[i] === 1) height[i] = dr.fill[i];
      const dr2 = drainage(L, kind, height, rain), T = [44, 26, 14][o.rivers == null ? 1 : o.rivers];
      const all = traceRivers(L, kind, dr2, { T, seed, isMt: i => isM[i] === 1 || cells[i] === 'n', arid: i => ARIDB.has(cells[i]), minLen: 3 });
      const kept = all.filter(r => { if (r.src) return true; const h0 = r.hexes[0]; return h0 == null || dM[h0] <= 4 || r.kind !== 'stream' || r.hexes.length >= 6; });
      // a river of the plain that comes from no mountain and no lake rises from a spring in wet ground, a tundra river from a bog (v0.15.2)
      for (const r of kept) { if (!r.head || r.src) continue; const h = r.hexes[0]; if (h == null || dM[h] <= 1 || !(cells[h] === 't' || ('gofsh'.includes(cells[h]) && temp[h] >= 0)) || hash2(h, 29, seed) > 0.7) continue; cells[h] = temp[h] > 17 ? 'w' : 'm'; }
      rivers = kept.map(r => ({ kind: r.kind, pts: r.pts }));
      // wet ground where a river meets the sea
      for (const r of all) { if (r.kind === 'stream' || r.kind === 'seasonal') continue; const h = r.hexes[r.hexes.length - 1]; if (h != null && dSea[h] === 1 && 'gov'.includes(cells[h]) && hash2(h, 21, seed) < 0.6) cells[h] = temp[h] > 17 ? 'w' : 'm'; }
    }
    return { cells: cells.join(''), rivers, land };
  };

  // ---------- a map read from a picture (v0.19.4) ----------
  // The owner asked for a new map traced from an image, with bare land and water only (25 Nov 2026). img is the picture already
  // drawn over the map's frame at k pixels a map unit: { data, w, h, k }. Each hex takes its colour from the pixels within 0.85 of its radius and looks for a dark line out to its full radius.
  // How a hex is read: 'alpha' (a clear ground is water, chosen by 'auto' when the picture has one), 'blue' (bluish is water), 'dark' (dark is land), 'light' (light is land), 'line' (dark lines are the
  // coast, what the border reaches through them is water), or 'auto', which picks one. cut is where the split falls, 0 to 1 of the
  // feature's range (Otsu's split when not given). Water that reaches the edge, or covers 2% of the map, is sea; the rest is
  // lake. Land is grassland. The thresholds 0.05, 10% and 2% are Claude's numbers.
  const ETA_AREA = 0.8;
  function otsu(vals, lo, hi) {
    const B = 64, h = new Float64Array(B); let n = 0, sum = 0;
    for (const v of vals) { const b = Math.min(B - 1, Math.max(0, Math.floor((v - lo) / (hi - lo + 1e-9) * B))); h[b]++; n++; sum += b; }
    if (!n) return { t: 0.5, eta: 0 };
    let tot = 0; for (let b = 0; b < B; b++) tot += h[b] * (b - sum / n) ** 2;
    let w0 = 0, s0 = 0, best = -1, bt = B >> 1;
    for (let b = 0; b < B - 1; b++) { w0 += h[b]; s0 += b * h[b]; const w1 = n - w0; if (!w0 || !w1) continue; const m0 = s0 / w0, m1 = (sum - s0) / w1, v = w0 * w1 * (m0 - m1) ** 2 / n; if (v > best) { best = v; bt = b + 1; } }
    return { t: bt / B, eta: tot > 0 ? Math.max(0, best) / tot : 0 };
  }
  // a scan or a photo is lit unevenly: the lightness is taken as a tilted plane plus one step between land and water, the
  // plane is fitted by least squares with the step, and taken away (twice, as the step is found from the flattened values)
  function solve(A, b) {
    const n = b.length; for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r; [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]]; if (Math.abs(A[c][c]) < 1e-12) return null;
      for (let r = 0; r < n; r++) if (r !== c) { const f = A[r][c] / A[c][c]; for (let q = c; q < n; q++) A[r][q] -= f * A[c][q]; b[r] -= f * b[c]; } }
    return b.map((v, c) => v / A[c][c]);
  }
  MME.readImage = function (G, img, opt) {
    const L = lattice(G), N = L.N, o = opt || {}, k = img.k, rr = G.R * k, rr2 = rr * rr, rc2 = (0.85 * G.R * k) ** 2, D = img.data;
    const blue = new Float32Array(N), light = new Float32Array(N), ink = new Float32Array(N), has = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      const cx = L.CX[i] * k, cy = L.CY[i] * k; let r = 0, g = 0, b = 0, m = 0, mn = 1, lf = 0, nf = 0;
      for (let y = Math.max(0, Math.floor(cy - rr)); y <= Math.min(img.h - 1, Math.ceil(cy + rr)); y++) for (let x = Math.max(0, Math.floor(cx - rr)); x <= Math.min(img.w - 1, Math.ceil(cx + rr)); x++) {
        const d2 = (x - cx) ** 2 + (y - cy) ** 2; if (d2 > rr2) continue; const p = (y * img.w + x) * 4; if (D[p + 3] < 128) continue;
        const l = (0.299 * D[p] + 0.587 * D[p + 1] + 0.114 * D[p + 2]) / 255; if (l < mn) mn = l; lf += l; nf++;     // a line is looked for out to the corners
        if (d2 <= rc2) { r += D[p]; g += D[p + 1]; b += D[p + 2]; m++; }
      }
      if (!m) continue; has[i] = 1; r /= m; g /= m; b /= m;
      blue[i] = (b - (r + g) / 2) / 255; light[i] = (0.299 * r + 0.587 * g + 0.114 * b) / 255; ink[i] = lf / nf - mn;   // ink: how much darker the darkest pixel is than the hex
    }
    const range = a => { let lo = Infinity, hi = -Infinity; for (let i = 0; i < N; i++) if (has[i]) { if (a[i] < lo) lo = a[i]; if (a[i] > hi) hi = a[i]; } return lo <= hi ? [lo, hi] : [0, 1]; };
    const split = a => { const [lo, hi] = range(a), v = []; for (let i = 0; i < N; i++) if (has[i]) v.push(a[i]); return otsu(v, lo, hi); };
    const edge = i => { const c = i % L.cols, r = (i / L.cols) | 0; return c === 0 || r === 0 || c === L.cols - 1 || r === L.rows - 1; };
    const flat = Float32Array.from(light);
    for (let pass = 0; pass < 2; pass++) {
      const [lo, hi] = range(flat), t = lo + split(flat).t * (hi - lo), A = [0, 1, 2, 3].map(() => [0, 0, 0, 0]), B = [0, 0, 0, 0];
      for (let i = 0; i < N; i++) { if (!has[i]) continue; const v = [1, flat[i] > t ? 1 : 0, L.CX[i] / G.w - 0.5, L.CY[i] / G.h - 0.5]; for (let a = 0; a < 4; a++) { B[a] += v[a] * light[i]; for (let b = 0; b < 4; b++) A[a][b] += v[a] * v[b]; } }
      const w = solve(A, B); if (!w) break;
      for (let i = 0; i < N; i++) if (has[i]) flat[i] = light[i] - w[2] * (L.CX[i] / G.w - 0.5) - w[3] * (L.CY[i] / G.h - 0.5);
    }
    const sb = split(blue), sl = split(flat);
    let mode = o.mode || 'auto';
    if (mode === 'auto' && o.alpha) mode = 'alpha';                  // a picture cut out on a clear ground: the clear part is water
    if (mode === 'auto') {
      const [lo, hi] = range(flat), t = lo + sl.t * (hi - lo);
      let nd = 0, n = 0, ed = 0, en = 0; for (let i = 0; i < N; i++) if (has[i]) { n++; const d = flat[i] < t; if (d) nd++; if (edge(i)) { en++; if (d) ed++; } }
      if (sb.eta > sl.eta + 0.05 && range(blue)[1] > 0.06) mode = 'blue';
      else if (!n || nd / n < 0.1 || sl.eta < ETA_AREA) mode = 'line';
      else mode = en && ed / en > 0.5 ? 'light' : 'dark';
    }
    const a = mode === 'blue' ? blue : mode === 'line' ? ink : flat, [lo, hi] = range(a), auto = split(a).t;
    const cut = o.cut == null ? auto : Math.min(1, Math.max(0, o.cut)), t = lo + cut * (hi - lo);
    const water = new Uint8Array(N);
    if (mode === 'line') {
      const q = []; for (let i = 0; i < N; i++) if (!has[i] || (edge(i) && a[i] <= t)) { water[i] = 1; q.push(i); }
      for (let h = 0; h < q.length; h++) { const u = q[h]; for (let j = 0; j < 6; j++) { const v = L.NB[u * 6 + j]; if (v >= 0 && !water[v] && has[v] && a[v] <= t) { water[v] = 1; q.push(v); } } }
    } else if (mode === 'alpha') for (let i = 0; i < N; i++) water[i] = has[i] ? 0 : 1;
    else for (let i = 0; i < N; i++) water[i] = !has[i] ? 1 : mode === 'blue' ? +(a[i] > t) : mode === 'dark' ? +(a[i] >= t) : +(a[i] <= t);
    if (o.invert) for (let i = 0; i < N; i++) if (has[i] || mode === 'alpha') water[i] ^= 1;
    if (o.clean !== false) for (let pass = 0; pass < 2; pass++) for (let i = 0; i < N; i++) {     // lone hexes go with what is around them
      let w = 0, n = 0; for (let j = 0; j < 6; j++) { const v = L.NB[i * 6 + j]; if (v >= 0) { n++; w += water[v]; } }
      if (water[i] && w === 0 && n === 6) water[i] = 0; else if (!water[i] && w === n) water[i] = 1;
    }
    const cells = new Array(N).fill('.'), seen = new Uint8Array(N); let land = 0, lake = 0;
    for (let i = 0; i < N; i++) if (!water[i]) { cells[i] = 'g'; land++; }
    for (let s = 0; s < N; s++) {
      if (!water[s] || seen[s]) continue; const comp = [s]; seen[s] = 1; let open = false;
      for (let h = 0; h < comp.length; h++) { const u = comp[h]; if (edge(u) || !has[u]) open = true; for (let j = 0; j < 6; j++) { const v = L.NB[u * 6 + j]; if (v >= 0 && water[v] && !seen[v]) { seen[v] = 1; comp.push(v); } } }
      if (!open && comp.length < 0.02 * N) for (const u of comp) { cells[u] = 'L'; lake++; }
    }
    return { cells: cells.join(''), land, lake, mode, cut, auto, eta: { blue: +sb.eta.toFixed(3), light: +sl.eta.toFixed(3) }, inPic: has.reduce((x, v) => x + v, 0) };
  };

  // the ground a map's climate is read from when it has no survey of its own: height in metres and rain in millimetres a cycle
  MME.synthClimate = function (L, eff, elev, rain) {
    const N = L.N, dW = distFrom(L, i => WATER(eff(i))), dM = distFrom(L, i => eff(i) === 'M', 60), raw = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const b = eff(i);
      if (WATER(b)) { elev[i] = 0; raw[i] = 0; continue; }
      let nm = 0; if (b === 'M') for (let k = 0; k < 6; k++) { const v = L.NB[i * 6 + k]; if (v >= 0 && eff(v) === 'M') nm++; }
      elev[i] = Math.round(b === 'M' ? 2600 + 330 * nm + 400 * hash2(i, 1, 9) : 40 + 55 * Math.min(dW[i], 12) + 1100 * Math.exp(-dM[i] / 2.2));
      raw[i] = 60 + 1050 * (RAINW[b] == null ? 1 : RAINW[b]);
    }
    for (let i = 0; i < N; i++) {
      if (!raw[i]) { rain[i] = 0; continue; }
      let t = raw[i] * 2, n = 2, best = 0;
      for (let k = 0; k < 6; k++) { const v = L.NB[i * 6 + k]; if (v >= 0 && raw[v]) { t += raw[v]; n++; if (eff(v) !== 'M') best = Math.max(best, raw[v]); } }
      rain[i] = Math.round(eff(i) === 'M' ? Math.max(400, best * 1.15) : t / n);       // a range takes the rain of its wetter side
    }
  };
})();
