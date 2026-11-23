// ---------- the economy the owner shapes: goods, price classes, people, states and their borders (document map/economy) ----------
// A good's term: { on: ground codes or '@' + a kind of point, rate: loads a hex, f rain-fed, r river in the hex, m within m hexes of
// a mountain, c within c hexes of the sea, l beside a lake, o a forest's open edge }.
function ecoTerm(t) { const o = { on: t[0], rate: t[1] }; for (const m of String(t[2] || '').match(/[a-z]\d*/g) || []) { const k = m[0]; o[k] = k === 'm' || k === 'c' ? +m.slice(1) || 1 : 1; } return o; }
function ecoRuleF(g) { return H => { let v = (H.gx && H.gx[g.id]) || 0; for (const t of g.terms) if (t.on[0] === '@') v += t.rate * (H.pt[t.on.slice(1)] || 0); return v; }; }
const ECO = { goods: {}, custom: [], cats: {}, ucats: [], tune: {}, work: {}, pop: {}, danger: {}, auto: BLANK, states: [], cells: new Array(N).fill('.'), unit: 5000, central: { name: 'เหรียญกลาง', per: 1000 } };
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
};
function TU(k) { const v = ECO.tune[k]; return v == null ? ETUNE[k][0] : v; }
const SKEYS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', SCOLS = ['#d9534f', '#4f8fd9', '#58b368', '#e0a83a', '#a56cd6', '#3bb5ad', '#e07a3a', '#c95f9c', '#8a9a3a', '#7480e0'];
const ESYS = {
  trad: ['ดั้งเดิม', 'ไม่ออกไปค้าเอง ค้ากันเองได้แค่ระยะใกล้ ของไกลต้องรอพ่อค้าต่างรัฐเข้ามา ซึ่งคิดค่าขนแพงขึ้น'],
  feud: ['ศักดินา', 'ชุมชนส่งของเหลือให้ศูนย์ที่ตนขึ้นอยู่ก่อน ของที่ชุมชนขายหรือซื้อกับที่อื่นต้องผ่านศูนย์นั้น แล้วจึงค้าในรัฐ แล้วจึงค้านอกรัฐ'],
  merc: ['พาณิชยนิยม', 'ซื้อของถูก ขายของเหลือให้ผู้ให้ราคาดีที่สุดโดยนับค่าเงินที่แข็งกว่าเป็นราคาที่ดีกว่า ตั้งกำแพงกับสินค้าโรงงานต่างรัฐ และหวงวัตถุดิบไว้ในรัฐ'],
  cap: ['ทุนนิยม', 'ค้าเสรี ค่าขนระหว่างรัฐทุนนิยมด้วยกันถูกลง เลือกผู้ซื้อตามค่าเงินที่แข็งกว่า ตลาดของรัฐที่อยู่บนทางผ่านรับของของผู้อื่นไปส่งต่อในค่าขนที่ถูกลงโดยเก็บค่าฝาก และรับของจากคู่อริสองฝ่ายไปขายต่อให้กันโดยเก็บส่วนคนกลาง'],
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
const ecoCoin = s => (s && s.cur ? s.cur.trim().toLowerCase() : '');   // a state that names no coin of its own uses the central one

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
    if (sa || sb) for (const s of L.states) { const z = ECO.cells[s >> 1]; if (z !== '.' && ((sa && sa.rel[z] === 'rival') || (sb && sb.rel[z] === 'rival'))) bad++; }
    L.hostile = bad / L.states.length; k *= 1 + TU('hostile') * L.hostile;      // what could not be gone around is paid for
  }
  return L.cost * k;
}
// How dangerous a line looks when the owner has not said: the share of its way that runs far from any city, through land or
// water no state holds (once there are states), and over hard ground or open sea. The weights and the steps are my own numbers.
function ecoAutoDanger(L) {
  const st = L.states; if (!st || !st.length || !ECODC) return null;
  let far = 0, free = 0, rough = 0;
  for (const t of st) { const h = t >> 1, b = eff(h); far += clamp((ECODC[h] - 4) / 8, 0, 1); if (ECOX.on && ECO.cells[h] === '.') free++; if (t & 1 ? isSea(b) && !SHORE[h] : (CAR[b] || 3) >= 4.5) rough++; }
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
    if (s.sys === 'cap' && c.rank >= 1) ECOX.brokers.push(k);
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
function ecoWay(i, j) {
  const C = ECOX.C, key = i * C.length + j; let w = WAYS.get(key); if (w) return w;
  const si = C[i].sto, sj = C[j].sto, gi = ecoGate(i), gj = ecoGate(j), a = gi >= 0 && gi !== j ? gi : i, z = gj >= 0 && gj !== i ? gj : j;
  const nodes = [i]; if (a !== i) nodes.push(a);
  let broker = -1;
  if (si && sj && si !== sj && si.rel[sj.id] === 'rival') {
    let best = Infinity;
    for (const r of ECOX.brokers) { const sr = C[r].sto; if (sr === si || sr === sj || sr.rel[si.id] === 'rival' || sr.rel[sj.id] === 'rival') continue; const t = ecoLeg(a, r) + ecoLeg(r, z); if (t < best) { best = t; broker = r; } }
    if (broker >= 0) nodes.push(broker);
  }
  if (z !== j && nodes[nodes.length - 1] !== z) nodes.push(z);
  nodes.push(j);
  let t = 0; for (let q = 0; q + 1 < nodes.length; q++) t += ecoLeg(nodes[q], nodes[q + 1]);
  // A load that would go straight may instead be left with a market of a capitalist state that stands on its way: such a market
  // gathers loads and sends them on at a lower cost a load, and keeps a fee. It never pays to go far out of the way for it.
  let hub = -1;
  if (nodes.length === 2 && broker < 0 && ECOX.brokers.length && !(si && sj && si !== sj && si.rel[sj.id] === 'rival')) {
    const disc = TU('hubDisc'); let best = t;
    if (disc < 1) for (const r of ECOX.brokers) { if (r === i || r === j) continue; const sr = C[r].sto; if ((si && sr.rel[si.id] === 'rival') || (sj && sr.rel[sj.id] === 'rival')) continue; const t2 = (ecoLeg(i, r) + ecoLeg(r, j)) * disc; if (t2 < best) { best = t2; hub = r; } }
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
  if (phase >= 0) {
    const si = ci.sto, sj = cj.sto, same = !!si && si === sj, rl = si && sj && !same ? si.rel[sj.id] || sj.rel[si.id] : null;
    if (rl === 'rival') { if (!(phase === 2 && w && w.broker >= 0)) return 0; cost += TU('cut') * pj * v; }   // rivals do not trade, unless a market at odds with neither sells it on, for its cut
    if (phase === 0) { if (!(same && si.sys === 'feud' && ECOX.seat[i] === j)) return 0; }                    // the lord's due comes first
    else if (phase === 1) { if (!(same || (rl === 'ally' && ((ci.ki === 4 && ci.near.has(sj.id)) || (cj.ki === 4 && cj.near.has(si.id)))))) return 0; }   // then the realm, and a border village's allied neighbours
    const ti = !!si && si.sys === 'trad', tj = !!sj && sj.sys === 'trad';
    if (ti && tj) { if (t * ECOX.km > TU('tradFar')) return 0; } else if (ti || tj) cost *= TU('tradOut');                              // nobody of theirs carries it far: an outsider must come
    if (si && sj && si.sys === 'cap' && sj.sys === 'cap') cost *= TU('capLeg');
    if (w && w.hub >= 0) cost += TU('hubCut') * pj * v;                                                  // the market on the way keeps its fee
    if (!same) {
      if (si && sj && (si.sys === 'cap' || si.sys === 'merc')) gain = pj * ecoFx(sj) / ecoFx(si) - pi;   // a seller who sells to the best bidder sees the harder coin as the better price
      if (si && sj && ecoCoin(si) !== ecoCoin(sj)) cost += TU('fxFee') * pj * v;                         // two coins: the money changer is paid, under every system
      if (sj && sj.sys === 'merc' && ECAT[cat].made) cost += TU('wall') * v;                             // a wall against foreign wares
      if (si && si.sys === 'merc' && MERCKEEP.has(cat)) cost += TU('keep') * v;                          // and raw stuff kept at home
    }
  }
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
  ECO.pop = {}; for (const [id, n] of Object.entries(b.pop || {}).slice(0, 2000)) if (n > 0) ECO.pop[ecoStr(id, 40)] = Math.round(ecoNum(n, 1, 5e7, 0));
  ECO.danger = {}; for (const [id, n] of Object.entries(b.danger || {}).slice(0, 4000)) if (n > 0) ECO.danger[ecoStr(id, 120)] = Math.round(ecoNum(n, 0, 4, 0));
  ECO.states = []; for (const s of (Array.isArray(b.states) ? b.states : []).slice(0, 52)) { if (!s || typeof s.id !== 'string' || !SKEYS.includes(s.id) || s.id.length !== 1 || ECO.states.some(x => x.id === s.id)) continue; const rel = {}; for (const [k, r] of Object.entries(s.rel || {})) if (SKEYS.includes(k) && (r === 'ally' || r === 'rival')) rel[k] = r; ECO.states.push({ id: s.id, name: ecoStr(s.name, 60) || 'รัฐใหม่', color: HEXC.test(s.color) ? s.color : SCOLS[0], sys: ESYS[s.sys] ? s.sys : 'merc', cur: ecoStr(s.cur, 30), rate: ecoNum(s.rate, 0.01, 1000, 1), cap: ecoStr(s.cap, 60), rel }); }
  const cells = typeof b.cells === 'string' && b.cells.length === N ? b.cells : ''; for (let i = 0; i < N; i++) ECO.cells[i] = cells && SKEYS.includes(cells[i]) ? cells[i] : '.';
  ECO.unit = ecoNum(b.unit, 100, 1e6, 5000); ECO.central = { name: ecoStr(b.central && b.central.name, 30) || 'เหรียญกลาง', per: ecoNum(b.central && b.central.per, 0.001, 1e9, 1000) };
  ecoStamp++; ecoApply();
}
const ecoSerial = () => ({ v: 1, goods: ECO.goods, custom: ECO.custom, cats: ECO.cats, ucats: ECO.ucats, tune: ECO.tune, work: ECO.work, pop: ECO.pop, danger: ECO.danger, auto: ECO.auto, states: ECO.states, cells: ECO.cells.join(''), unit: ECO.unit, central: ECO.central });
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
  if (!ECO.states.length) return;
  if (!ecoPaths || ecoPathStamp !== ecoStamp) ecoBuildPaths();
  ctx.setTransform(dpr * view.s, 0, 0, dpr * view.s, dpr * view.x, dpr * view.y);
  const px = 1 / view.s;
  for (const s of ECO.states) {
    const P = ecoPaths.get(s.id); if (!P || !P.n) continue;
    if (mode === 'econ') { ctx.globalAlpha = 0.2; ctx.fillStyle = s.color; ctx.fill(P.fill); ctx.globalAlpha = 1; }
    ctx.lineCap = 'round'; ctx.lineWidth = Math.max(2.2, 4.2 * px); ctx.strokeStyle = 'rgba(15,17,20,.55)'; ctx.stroke(P.edge);
    ctx.lineWidth = Math.max(1.1, 2.2 * px); ctx.strokeStyle = s.color; ctx.stroke(P.edge);
  }
}
const __drawEco = draw;
draw = function () { __drawEco(); drawBorders(); };

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
    + ECATS.filter(c => !ECAT[c].own).map(c => `<div class="etr" data-c="${c}"><span><i style="background:${ECAT[c].col}"></i><input type="text" data-f="cname" maxlength="60" value="${esc(ECAT[c].name)}"></span><input type="number" data-f="cv" min="0.05" max="200" step="0.1" value="${ECAT[c].v}"><input type="number" data-f="cbulk" min="0.01" max="10" step="0.05" value="${ECAT[c].bulk}"></div>`).join('')
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
  let h = `<div class="btns" style="margin:0 0 8px"><button type="button" class="btn" data-a="snew"${ECO.states.length >= 52 ? ' disabled' : ''}>เพิ่มรัฐ</button></div>`;
  if (!ECO.states.length) return h + `<p class="note">ยังไม่มีรัฐ เพิ่มรัฐแล้วเลือกชื่อรัฐในแถบเครื่องมือเพื่อระบายเขตลงบนแผนที่ ระบายลงทะเลได้เพื่อกำหนดน่านน้ำ เมืองขึ้นกับรัฐของช่องที่ตั้งอยู่</p>`;
  const cnt = {}; for (const z of ECO.cells) if (z !== '.') cnt[z] = (cnt[z] || 0) + 1;
  for (const s of ECO.states) {
    const others = ECO.states.filter(o => o !== s);
    h += `<div class="eform" data-s="${s.id}"><div class="erow"><input type="color" data-f="scolor" value="${s.color}" aria-label="สีของรัฐ"><input type="text" data-f="sname" maxlength="60" value="${esc(s.name)}" style="flex:1"></div>`
      + ecoIn('ระบอบเศรษฐกิจ', `<select data-f="ssys">${Object.entries(ESYS).map(([k, v]) => `<option value="${k}"${k === s.sys ? ' selected' : ''}>${v[0]}</option>`).join('')}</select>`) + `<div class="tr w">${ESYS[s.sys][1]}</div>`
      + (s.sys === 'soc' ? ecoCapHTML(s) : '')
      + `<div class="erow"><label>สกุลเงิน <input type="text" data-f="scur" maxlength="30" value="${esc(s.cur)}" placeholder="${esc(ECO.central.name)}" style="width:8em"></label><label>1 หน่วย = <input type="number" data-f="srate" min="0.01" max="1000" step="0.05" value="${s.rate}"> ${esc(ECO.central.name)}</label></div>`
      + (others.length ? `<div class="erow">${others.map(o => `<label><i class="sdot" style="background:${o.color}"></i>${esc(o.name)} <select data-f="srel" data-o="${o.id}"><option value="">เป็นกลาง</option><option value="ally"${(s.rel[o.id] || o.rel[s.id]) === 'ally' ? ' selected' : ''}>พันธมิตร</option><option value="rival"${(s.rel[o.id] || o.rel[s.id]) === 'rival' ? ' selected' : ''}>คู่อริ</option></select></label>`).join('')}</div>` : '')
      + `<div class="tr w">${cnt[s.id] || 0} ช่อง</div><div class="btns"><button type="button" class="btn warn" data-a="sdel">ลบรัฐนี้</button></div></div>`;
  }
  return h;
}
function ecoGdp() {
  const E = ECON; if (!E) return [];
  return E.cities.map((c, k) => {
    let g = 0; for (const cat of ECATS) { const mk = E.MK[k][cat]; if (mk) g += mk[0] * (E.P1[k][cat] || 1) * ECAT[cat].v; }
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
    if (sys === 'cap' && r.c.through > 0) { const x = TU('cut') * r.c.through * ECO.central.per; r.inc += x; if (x > 0.005 * r.gdp) r.why = 'ได้ส่วนคนกลาง'; }
    const seat = sys === 'feud' && ECOX.seat && k < ECOX.seat.length ? ECOX.seat[k] : -1;
    if (seat >= 0 && rows[seat] && rows[seat].s === r.s) { const x = TU('tithe') * r.gdp; r.inc -= x; rows[seat].inc += x; r.why = 'ส่งส่วยให้' + rows[seat].c.name; if (!rows[seat].why) rows[seat].why = 'ได้ส่วย'; }
  });
  const pool = new Map();
  for (const r of rows) if (r.s && r.s.sys === 'soc') { const o = pool.get(r.s) || { sum: 0, people: 0 }; o.sum += TU('pool') * r.gdp; o.people += r.people; pool.set(r.s, o); }
  for (const r of rows) if (r.s && r.s.sys === 'soc') { const o = pool.get(r.s), back = o.sum * r.people / o.people, d = back - TU('pool') * r.gdp; r.inc += d; r.why = d > 0.02 * r.gdp ? 'รัฐเกลี่ยให้' : d < -0.02 * r.gdp ? 'รัฐเกลี่ยออก' : ''; }
  return rows;
}
const ecoPc = x => Math.round(x * 1000) / 10;
const ecoNumF = v => v >= 100 ? Math.round(v).toLocaleString('en-US') : v >= 1 ? v.toFixed(1) : v.toFixed(2);
function ecoGdpHTML() {
  const rows = ecoIncome(ecoGdp()); let h = `<div class="erow"><label>เงินกลางชื่อ <input type="text" data-f="cenname" maxlength="30" value="${esc(ECO.central.name)}" style="width:8em"></label><label>หนึ่งหน่วยมูลค่าฐาน = <input type="number" data-f="cenper" min="0.001" step="1" value="${ECO.central.per}"> ${esc(ECO.central.name)}</label><label>ประชากรหนึ่งหน่วยของแบบจำลอง = <input type="number" data-f="unit" min="100" step="100" value="${ECO.unit}"> คน</label></div>`;
  if (!rows.length) return h + `<p class="note">ยังไม่มีเมืองบนแผนที่ หรือยังคิดการค้าไม่เสร็จ</p>`;
  const tot = rows.reduce((a, r) => a + r.gdp, 0), ppl = rows.reduce((a, r) => a + r.people, 0), mean = rows.reduce((a, r) => a + r.inc, 0) / ppl;
  h += `<div class="tr">ทั้งแผนที่ GDP <b>${ecoNumF(tot)}</b> ${esc(ECO.central.name)} ประชากร ${ppl.toLocaleString('en-US')} คน เฉลี่ยคนละ ${ecoNumF(mean)}</div>`;
  const by = new Map(); for (const r of rows) { const key = r.s ? r.s.id : '.'; const o = by.get(key) || { s: r.s, gdp: 0, people: 0, n: 0 }; o.gdp += r.gdp; o.people += r.people; o.n++; by.set(key, o); }
  if (ECO.states.length) h += `<h4>รายรัฐ</h4><div class="etable g4"><div class="eth"><span>รัฐ</span><span>GDP (เงินกลาง)</span><span>เงินท้องถิ่น</span><span>ต่อหัว</span></div>` + [...by.values()].sort((a, b) => b.gdp - a.gdp).map(o => `<div class="etr"><span>${o.s ? `<i class="sdot" style="background:${o.s.color}"></i>${esc(o.s.name)} · ${ESYS[o.s.sys][0]}` : 'ไม่ขึ้นกับรัฐใด'}</span><span>${ecoNumF(o.gdp)}</span><span>${o.s ? ecoNumF(o.gdp / o.s.rate) + ' ' + esc(o.s.cur || ECO.central.name) : ''}</span><span>${ecoNumF(o.gdp / o.people)}</span></div>`).join('') + `</div>`;
  h += `<h4>รายเมือง</h4><div class="etable g5"><div class="eth"><span>เมือง</span><span>ประชากร</span><span>GDP</span><span>รายได้</span><span>ต่อหัว</span></div>` + rows.sort((a, b) => b.inc - a.inc).map(r => { const ph = r.inc / r.people, w = ph >= 1.4 * mean ? 'มั่งคั่ง' : ph <= 0.6 * mean ? 'ยากจน' : ''; return `<div class="etr"><span>${r.s ? `<i class="sdot" style="background:${r.s.color}"></i>` : ''}${esc(r.c.name)}${r.short ? ` <em>ขาด ${r.short} ประเภท</em>` : ''}</span><span>${r.people.toLocaleString('en-US')}</span><span>${ecoNumF(r.gdp)}</span><span${r.why ? ` title="${esc(r.why)}"` : ''}>${ecoNumF(r.inc)}${r.why ? '*' : ''}</span><span>${ecoNumF(ph)}${w ? ' <em>' + w + '</em>' : ''}</span></div>`; }).join('') + `</div>`;
  return h + `<p class="note">GDP ของเมืองคือมูลค่าของทุกอย่างที่เมืองผลิตได้ในหนึ่งปีตามราคาในเมืองหลังการค้า หักวัตถุดิบที่โรงงานใช้ไป เงินท้องถิ่นแปลงด้วยอัตราของแต่ละรัฐ รายได้คือ GDP หลังมือของระบอบ เมืองทุนนิยมได้ส่วนคนกลางร้อยละ ${ecoPc(TU('cut'))} ของมูลค่าที่ผ่านเมือง ชุมชนศักดินาส่งส่วยร้อยละ ${ecoPc(TU('tithe'))} ให้ศูนย์ที่ตนขึ้นอยู่ รัฐสังคมนิยมรวมร้อยละ ${ecoPc(TU('pool'))} ของทุกเมืองแล้วแบ่งตามหัว สัดส่วนทั้งสามแก้ได้ที่แท็บตัวเลข ช่องที่มีดอกจันชี้ค้างไว้เพื่อดูเหตุ ความมั่งคั่งวัดจากรายได้ต่อหัว</p>`;
}
function ecoRender() {
  const card = $('ecocard'); card.hidden = mode !== 'econ'; if (card.hidden) return;
  segPick('ecoTab', 't', ecoTab, t => { ecoTab = t; ecoRender(); requestDraw(); });
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

