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

