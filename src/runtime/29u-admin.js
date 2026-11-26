// ---------- the units that govern a state, from the smallest up (v0.19.0) ----------
// The owner asked for a state's government in tiers, from the smallest unit up: Manor, County, Duchy (a March where it holds a
// border or is first of all a military charge, a Principality where it stands nearly or half on its own, as a special region),
// and the Sovereign state at the top; the names may be changed. The units inside a state can be set by hand; a unit is annexed to a
// greater authority with Shift and a click; and when two states are joined, the old one can stay as a unit under the new.
// How it is held: a manor owns hexes; a county holds manors, a duchy holds counties, and the state holds whatever has no holder
// above it. A unit with no holder belongs to the state most of its land lies in. A unit's seat is a community inside it.
// What a tier does today: a March makes the arms of its communities and keeps watch on its border; a Principality runs its own
// affairs and its people live a little better for it. The public purse (batch 4) collects up these tiers.
// The starting names follow the owner's own; the Thai set beside them is Claude's offer.
// v0.20.0: the tiers as Crusader Kings III has them (the owner chose it, 26 Nov 2026): the county is the smallest piece of land,
// the communities in it are its baronies, counties make a duchy and duchies a kingdom; the state over them is the realm that
// holds them in fact. The three land tiers keep their places (0, 1, 2), so a map divided before keeps its units under the new
// names: what was a manor reads as a county, and so on up.
const ADMN0 = { 0: 'เคาน์ตี', 1: 'ดัชชี', 2: 'คิงดอม', march: 'มาร์ช', princ: 'ราชรัฐ', 3: 'รัฐอธิปไตย' };
const ADMN_TH = { 0: 'เมือง', 1: 'มณฑล', 2: 'อาณาจักร', march: 'หัวเมืองชายแดน', princ: 'ประเทศราช', 3: 'ราชอาณาจักร' };
const ADMN_OLD = [{ 0: 'แมเนอร์', 1: 'เคาน์ตี', 2: 'ดัชชี', march: 'มาร์ช', princ: 'ราชรัฐ', 3: 'รัฐอธิปไตย' }, { 0: 'ตำบล', 1: 'เมือง', 2: 'มณฑล', march: 'หัวเมืองชายแดน', princ: 'ประเทศราช', 3: 'ราชอาณาจักร' }];
const ADM_HOLD = 0.51;                                // a state holds a duchy or a kingdom when it has this share of its counties (CK3's 51%)
// v0.20.0, from Victoria 3: how fully a county is folded into its state. Unincorporated land pays half its taxes and is a
// little less settled; a colony pays a fifth and is less settled again. The shares are Claude's, for the owner to tune.
const ADMINC = { '': ['ผนวกเต็ม', 1, 0], part: ['ไม่ผนวก (ชายขอบ)', 0.5, -3], col: ['อาณานิคม', 0.2, -8] };
const ADMFX = { march: { arms: 1.25, well: -1 }, princ: { well: 2 } };
ECO.adm = []; ECO.admc = new Array(N).fill(''); ECO.admn = { ...ADMN0 };
const ADM = { stamp: 0, idx: null, lv: 2, sel: null, paint: false, cityKey: -1, city: new Map() };
const admById = id => id ? ECO.adm.find(u => u.id === id) || null : null;
let admTier = u => u.t === 2 && u.type ? ECO.admn[u.type] || ADMN0[u.type] : ECO.admn[u.t] || ADMN0[u.t];
let admTitle = u => admTier(u) + (u.name ? ' ' + u.name : '');
function admChanged(tables) { ADM.stamp++; ADM.idx = null; ADM.city.clear(); admSheetKey = ''; ecoChanged(!!tables); requestDraw(); if (mode === 'econ' && ecoTab === 'adm') ecoRender(); }
// everything about the units at once: their hexes, their holders, their state, their communities and people
function admIndex() {
  if (ADM.idx && ADM.idx.stamp === ADM.stamp && ADM.idx.ecs === ecoStampAdm()) return ADM.idx;
  const by = new Map(ECO.adm.map(u => [u.id, u])), kids = new Map(), hexes = new Map(), st = new Map(), cities = new Map(), people = new Map();
  for (const u of ECO.adm) { kids.set(u.id, []); hexes.set(u.id, []); cities.set(u.id, []); people.set(u.id, 0); }
  const upOf = u => { const p = by.get(u.up); return p && p.t > u.t ? p : null; };
  for (const u of ECO.adm) { const p = upOf(u); if (p) kids.get(p.id).push(u.id); }
  for (let i = 0; i < N; i++) { const id = ECO.admc[i]; if (!id) continue; const u = by.get(id); if (!u || u.t !== 0) continue; for (let x = u; x; x = upOf(x)) hexes.get(x.id).push(i); }
  for (const u of ECO.adm) { const n = {}; for (const i of hexes.get(u.id)) { const z = ECO.cells[i]; if (z && z !== '.') n[z] = (n[z] || 0) + 1; } let best = '', bn = 0; for (const [z, c] of Object.entries(n)) if (c > bn) { bn = c; best = z; } st.set(u.id, best); }
  for (const c of visibleCities()) { const h = hexAt(c.x, c.y), id = h >= 0 ? ECO.admc[h] : ''; let u = by.get(id); while (u) { cities.get(u.id).push(c.id); u = upOf(u); } }
  if (ECON) for (const c of ECON.cities) { const h = c.h != null ? c.h : hexAt(c.x, c.y), id = h >= 0 ? ECO.admc[h] : ''; let u = by.get(id); while (u) { people.set(u.id, people.get(u.id) + c.pop * ECO.unit); u = upOf(u); } }
  ADM.idx = { stamp: ADM.stamp, ecs: ecoStampAdm(), by, kids, hexes, st, cities, people, upOf }; return ADM.idx;
}
const ecoStampAdm = () => { let s = 0; for (let i = 0; i < N; i += 7) s = (Math.imul(s, 31) + ECO.cells[i].charCodeAt(0)) | 0; return s + (ECON ? ECON.ver * 7919 : 0); };
// the chain over a hex: its manor, county, duchy (each may be missing)
function admChain(h) {
  const X = admIndex(), out = { 0: null, 1: null, 2: null }; let u = X.by.get(ECO.admc[h] || ''); if (!u || u.t !== 0) return out;
  while (u) { out[u.t] = u; u = X.upOf(u); } return out;
}
function admCity(id) {
  const k = ADM.stamp; let c = ADM.city.get(id); if (c && c.k === k) return c.v;
  const v = visibleCities().find(x => x.id === id), h = v ? hexAt(v.x, v.y) : -1, ch = h >= 0 ? admChain(h) : { 0: null, 1: null, 2: null }; ADM.city.set(id, { k, v: ch }); return ch;
}

// ---- what a tier does ----
{
  const cf = comFx; comFx = function (id, kind) {
    const f = cf(id, kind); if (!ECO.adm.length) return f; const d = admCity(id)[2]; const o = d && ADMFX[d.type]; if (!o) return f;
    for (const k of Object.keys(o)) { if (!(k in f)) continue; if (k === 'arms') f[k] *= o[k]; else f[k] += o[k]; } return f;
  };
  const cw = comWhy; comWhy = function (id, kind) { const out = cw(id, kind), d = ECO.adm.length ? admCity(id)[2] : null; if (d && d.type === 'march') out.push(admTitle(d) + ': เขตทหาร ทำอาวุธได้มากขึ้นหนึ่งในสี่ ความเป็นอยู่ −1'); if (d && d.type === 'princ') out.push(admTitle(d) + ': ปกครองตนเอง ความเป็นอยู่ +2'); return out; };
  const ec = econCompute; econCompute = function () { ADM.stamp++; ADM.idx = null; ADM.city.clear(); return ec(); };
}

// ---- the document ----
{
  const ld = ecoLoad, sr = ecoSerial;
  ecoLoad = function (b) {
    ld(b); b = b || {}; ECO.adm = [];
    for (const u of (Array.isArray(b.adm) ? b.adm : []).slice(0, 6000)) {
      if (!u || typeof u.id !== 'string' || !/^[a-z0-9]{1,16}$/.test(u.id) || ECO.adm.some(x => x.id === u.id) || ![0, 1, 2].includes(u.t)) continue;
      const o = { id: u.id, t: u.t, name: ecoStr(u.name, 60), up: ecoStr(u.up, 16), type: u.t === 2 && ADMFX[u.type] ? u.type : '', seat: ecoStr(u.seat, 120), ...(u.t === 0 && ADMINC[u.inc] && u.inc ? { inc: u.inc } : {}) };
      // v0.21.0: a unit's own purse: its rate, its base, its budget and its toll
      if (u.rate != null && Number.isFinite(+u.rate)) o.rate = clamp(+u.rate, 0, 0.5); if (typeof LBASE !== 'undefined' && LBASE[u.base]) o.base = u.base; if (u.toll != null && +u.toll > 0) o.toll = clamp(+u.toll, 0, 1);
      if (u.bud && typeof u.bud === 'object') { const bb = {}; for (const k of ['mil', 'adm', 'pub', 'wel']) if (Number.isFinite(+u.bud[k])) bb[k] = clamp(+u.bud[k], 0, 1); if (Object.keys(bb).length) o.bud = bb; }
      ECO.adm.push(o);
    }
    ECO.admc = new Array(N).fill(''); if (b.admc && typeof b.admc === 'object') for (const [id, list] of Object.entries(b.admc)) { const u = admById(id); if (!u || u.t !== 0 || !Array.isArray(list)) continue; for (const i of list.slice(0, N)) if (Number.isInteger(i) && i >= 0 && i < N) ECO.admc[i] = id; }
    ECO.admn = { ...ADMN0 }; if (b.admn && typeof b.admn === 'object') for (const k of Object.keys(ADMN0)) if (typeof b.admn[k] === 'string' && b.admn[k].trim()) ECO.admn[k] = b.admn[k].slice(0, 30);
    { const j = JSON.stringify(ECO.admn); if (ADMN_OLD.some(o => JSON.stringify(o) === j)) ECO.admn = { ...(JSON.stringify(ADMN_OLD[1]) === j ? ADMN_TH : ADMN0) }; }   // the old stock names give way to the new ones; names the owner wrote stay
    ADM.stamp++; ADM.idx = null; ADM.city.clear(); admSheetKey = '';
  };
  ecoSerial = function () {
    const o = sr(); if (!ECO.adm.length && JSON.stringify(ECO.admn) === JSON.stringify(ADMN0)) return o;
    o.adm = ECO.adm.map(u => ({ ...u })); const by = {}; ECO.admc.forEach((id, i) => { if (id) (by[id] || (by[id] = [])).push(i); }); o.admc = by; o.admn = { ...ECO.admn }; return o;
  };
}
// a change to the units is one step back: the units, their hexes and the states' land as they were and are
const admSnap = () => ({ adm: JSON.stringify(ECO.adm), admc: ECO.admc.join('\n'), cells: ECO.cells.join(''), admn: JSON.stringify(ECO.admn), states: JSON.stringify(ECO.states) });
function admRestore(s) { ECO.adm = JSON.parse(s.adm); if (s.admn) ECO.admn = JSON.parse(s.admn); if (s.states && s.states !== JSON.stringify(ECO.states)) ECO.states = JSON.parse(s.states); ECO.admc = s.admc.split('\n'); if (ECO.admc.length !== N) ECO.admc = new Array(N).fill(''); const cs = [...s.cells]; if (cs.length === N) for (let i = 0; i < N; i++) ECO.cells[i] = cs[i]; }
function admDo(fn, tables) { const a = admSnap(); fn(); const b = admSnap(); if (a.adm === b.adm && a.admc === b.admc && a.cells === b.cells && a.admn === b.admn && a.states === b.states) return; pushOp({ k: 'adm', a, b }); if (a.cells !== b.cells || a.states !== b.states) ecoChanged(true); admChanged(tables !== false); }
{ const ap = applyOp; applyOp = function (op, dir, fx) { if (op.k !== 'adm') return ap(op, dir, fx); const was = op.a.cells !== op.b.cells || op.a.states !== op.b.states; admRestore(dir > 0 ? op.b : op.a); if (was) ecoChanged(true); admChanged(true); }; }
const admNewId = () => { let id; do { id = 'a' + Math.random().toString(36).slice(2, 9); } while (admById(id)); return id; };

// ---- dividing a state: manors around its communities, counties of manors, duchies of counties ----
function admBuild(s) {
  const land = []; for (let i = 0; i < N; i++) if (ECO.cells[i] === s.id && !isW(eff(i))) land.push(i); if (!land.length) return 0;
  const inS = new Uint8Array(N); for (const i of land) inS[i] = 1;
  const cs = (ECON ? ECON.cities : []).filter(c => { const h = c.h != null ? c.h : hexAt(c.x, c.y); return h >= 0 && inS[h]; });
  // drop the units of this state that were there before
  const X = admIndex(), old = new Set(ECO.adm.filter(u => X.st.get(u.id) === s.id).map(u => u.id)); ECO.adm = ECO.adm.filter(u => !old.has(u.id)); for (const i of land) ECO.admc[i] = '';
  for (let i = 0; i < N; i++) if (old.has(ECO.admc[i])) ECO.admc[i] = '';
  // manors: the land goes to the nearest community the cheapest way over the ground
  // v0.20.0: a county is seated at one of the greater communities, and the smaller ones near it are its baronies: about one
  // county for every two and a half communities, the seats spread out over the state, the most populous first
  const byPop = cs.slice().sort((a, b) => b.pop - a.pop), nC = Math.max(1, Math.round(cs.length / 2.5)), span = Math.sqrt(land.length) * R * 1.6 / Math.sqrt(nC), heads = [];
  for (const c of byPop) { if (heads.length >= nC) break; if (heads.some(h => Math.hypot(h.x - c.x, h.y - c.y) < span)) continue; heads.push(c); }
  for (const c of byPop) { if (heads.length >= nC) break; if (!heads.includes(c)) heads.push(c); }
  const seeds = heads.map(c => ({ c, h: c.h != null ? c.h : hexAt(c.x, c.y) }));
  if (!seeds.length) seeds.push({ c: null, h: land[0] });
  const cost = i => { const b = eff(i); return b === 'M' ? 4 : 'fokjaw'.includes(b) ? 1.5 : b === 'd' || b === 'n' ? 1.8 : 1; };
  const T = new Float64Array(N).fill(Infinity), own = new Int32Array(N).fill(-1), H = [];
  const push = x => { H.push(x); let q = H.length - 1; while (q) { const p = (q - 1) >> 1; if (H[p][0] <= H[q][0]) break; [H[p], H[q]] = [H[q], H[p]]; q = p; } };
  const pop = () => { const t = H[0], l = H.pop(); if (H.length) { H[0] = l; let q = 0; for (;;) { const x = 2 * q + 1, y = x + 1; let m = q; if (x < H.length && H[x][0] < H[m][0]) m = x; if (y < H.length && H[y][0] < H[m][0]) m = y; if (m === q) break; [H[m], H[q]] = [H[q], H[m]]; q = m; } } return t; };
  seeds.forEach((s0, j) => { if (T[s0.h] > 0) { T[s0.h] = 0; own[s0.h] = j; push([0, s0.h]); } });
  while (H.length) { const [t, i] = pop(); if (t > T[i]) continue; for (let d = 0; d < 6; d++) { const v = NB[i * 6 + d]; if (v < 0 || !inS[v]) continue; const nt = t + cost(v); if (nt < T[v]) { T[v] = nt; own[v] = own[i]; push([nt, v]); } } }
  for (const i of land) if (own[i] < 0) { let bd = Infinity; seeds.forEach((s0, j) => { const d = Math.hypot(CX[s0.h] - CX[i], CY[s0.h] - CY[i]); if (d < bd) { bd = d; own[i] = j; } }); }
  const manors = seeds.map(s0 => { const u = { id: admNewId(), t: 0, name: s0.c ? s0.c.name || '' : s.name, up: '', type: '', seat: s0.c ? s0.c.id : '' }; ECO.adm.push(u); return { u, c: s0.c, x: CX[s0.h], y: CY[s0.h], pop: s0.c ? s0.c.pop : 0 }; });
  for (const i of land) ECO.admc[i] = manors[own[i]].u.id;
  // counties: about five manors each, gathered round the greater communities
  const group = (items, size, mk) => {
    const n = Math.max(1, Math.round(items.length / size)), heads = [];
    const sorted = items.slice().sort((a, b) => b.pop - a.pop), span = Math.sqrt(land.length) * R * 1.6 / Math.sqrt(n);
    for (const it of sorted) { if (heads.length >= n) break; if (heads.some(h => Math.hypot(h.x - it.x, h.y - it.y) < span)) continue; heads.push(it); }
    for (const it of sorted) { if (heads.length >= n) break; if (!heads.includes(it)) heads.push(it); }
    const ups = heads.map(h => mk(h)); for (const it of items) { let bj = 0, bd = Infinity; heads.forEach((h, j) => { const d = Math.hypot(h.x - it.x, h.y - it.y); if (d < bd) { bd = d; bj = j; } }); it.u.up = ups[bj].u.id; ups[bj].pop += it.pop; }
    return ups;
  };
  if (manors.length < 2) return manors.length;
  const counties = group(manors, 4, h => { const u = { id: admNewId(), t: 1, name: h.u.name, up: '', type: '', seat: h.u.seat }; ECO.adm.push(u); return { u, x: h.x, y: h.y, pop: 0 }; });   // v0.20.0: duchies of about four counties
  if (counties.length >= 3) {
    const duchies = group(counties, 4, h => { const u = { id: admNewId(), t: 2, name: h.u.name, up: '', type: '', seat: h.u.seat }; ECO.adm.push(u); return { u, x: h.x, y: h.y, pop: 0 }; });
    // a duchy on the border with a rival keeps the march
    ADM.idx = null; ADM.stamp++; const X2 = admIndex();
    for (const d of duchies) { let rival = false; for (const i of X2.hexes.get(d.u.id)) { for (let j = 0; j < 6 && !rival; j++) { const v = NB[i * 6 + j]; const z = v >= 0 ? ECO.cells[v] : '.'; if (z !== '.' && z !== s.id && s.rel[z] === 'rival') rival = true; } if (rival) break; } if (rival) d.u.type = 'march'; }
  }
  return manors.length;
}
// joining two states: the land of one goes to the other; the old state may stay as a principality under the new
function admJoin(from, to, keep) {
  const X = admIndex(), mine = ECO.adm.filter(u => X.st.get(u.id) === from.id);
  for (let i = 0; i < N; i++) if (ECO.cells[i] === from.id) ECO.cells[i] = to.id;
  if (keep) {
    const p = { id: admNewId(), t: 2, name: from.name, up: '', type: 'princ', seat: from.cap || '' }; ECO.adm.push(p);
    // its duchies give way: their counties, and its counties with no duchy, come under the principality
    for (const u of mine) { if (u.t === 2) u.dead = 1; }
    for (const u of mine) if (u.t === 1) { const up = X.by.get(u.up); if (!up || up.t !== 1) u.up = p.id; }
    for (const u of mine) if (u.t === 0 && !X.by.get(u.up)) { u.up = ''; }
    ECO.adm = ECO.adm.filter(u => !u.dead);
    if (!mine.some(u => u.t === 1)) for (const u of mine) if (u.t === 0) u.up = p.id;   // a small state of manors only: they sit straight under it (a step skipped)
  }
  ECO.states = ECO.states.filter(s => s !== from); for (const s of ECO.states) { delete s.rel[from.id]; }
}

// ---- on the map: the tiers as lines of three weights, and the chosen unit lit ----
let admCv = null, admSheetKey = '';
const admShown = () => (mode === 'econ' && ecoTab === 'adm') || BEL.view === 'adm';
function admSheet() {
  const key = ADM.stamp + '|' + ecoStampAdm(); if (key === admSheetKey && admCv) return admCv; admSheetKey = key;
  if (!admCv) { admCv = document.createElement('canvas'); admCv.width = Math.max(1, Math.ceil(G.w / (2 * SHK))); admCv.height = Math.max(1, Math.ceil(G.h / (2 * SHK))); }
  const c = admCv.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, admCv.width, admCv.height); c.setTransform(0.5 / SHK, 0, 0, 0.5 / SHK, 0, 0);
  const X = admIndex(), top = new Array(N).fill(''), mid = new Array(N).fill('');
  for (let i = 0; i < N; i++) { const ch = ECO.admc[i] ? admChain(i) : null; if (!ch) continue; mid[i] = ch[1] ? ch[1].id : ch[0] ? ch[0].id : ''; top[i] = ch[2] ? ch[2].id : mid[i]; }
  const edge = (arr, w, col, dash) => {
    c.beginPath(); for (let i = 0; i < N; i++) { if (!arr[i]) continue; for (let j = 0; j < 6; j++) { const v = NB[i * 6 + j]; if (v < 0 || arr[v] === arr[i] || (!arr[v] && v < i)) continue; const e = EDGE[j], t0 = e * Math.PI / 3, t1 = (e + 1) * Math.PI / 3; c.moveTo(CX[i] + R * Math.cos(t0), CY[i] + R * Math.sin(t0)); c.lineTo(CX[i] + R * Math.cos(t1), CY[i] + R * Math.sin(t1)); } }
    c.setLineDash(dash || []); c.lineWidth = w; c.strokeStyle = col; c.stroke(); c.setLineDash([]);
  };
  // a faint colour for each duchy (or county standing alone), the state's hue a little turned
  const hue = new Map(); let k = 0; for (const u of ECO.adm) if ((u.t === 2) || (u.t === 1 && !X.upOf(u)) || (u.t === 0 && !X.upOf(u))) hue.set(u.id, (k++ * 47) % 360);
  for (const [id, hh] of hue) { c.beginPath(); let any = false; for (const i of X.hexes.get(id) || []) { hexPath(c, i, 1.02); any = true; } if (!any) continue; const u = X.by.get(id); c.fillStyle = u.type === 'princ' ? `hsla(${hh},55%,55%,.30)` : u.type === 'march' ? `hsla(${hh},45%,40%,.30)` : `hsla(${hh},40%,55%,.20)`; c.fill(); }
  edge(ECO.admc, 0.8, 'rgba(30,28,26,.55)', [2, 2]); edge(mid, 1.6, 'rgba(30,28,26,.8)'); edge(top, 3, 'rgba(20,18,16,.9)');
  return admCv;
}
{ const dg = drawOverGround; drawOverGround = function (c, w, h, live) { if (dg) dg(c, w, h, live); if (!live || !admShown() || !ECO.adm.length) return; const s = admSheet(); c.drawImage(s, 0, 0, s.width * 2 * SHK, s.height * 2 * SHK); }; }
{
  const top = drawOnTop; drawOnTop = function (c, px) {
    if (top) top(c, px); if (!admShown() || !ECO.adm.length) return; const X = admIndex();
    if (ADM.sel) { const hs = X.hexes.get(ADM.sel) || []; c.save(); c.beginPath(); for (const i of hs) hexPath(c, i, 1); c.fillStyle = 'rgba(255,230,150,.22)'; c.fill(); c.restore(); }
    // names: duchies when far, counties nearer, manors close
    const t = view.s < 0.9 ? 2 : view.s < 1.8 ? 1 : 0;
    for (const u of ECO.adm) {
      if (u.t !== t && !(u.t > t && false)) continue; const hs = X.hexes.get(u.id) || []; if (hs.length < (t === 0 ? 1 : 3)) continue;
      let sx = 0, sy = 0; for (const i of hs) { sx += CX[i]; sy += CY[i]; } const tt = admTitle(u), fs = (t === 2 ? 13 : t === 1 ? 11 : 9.5) * px;
      c.font = `600 ${fs}px serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 3 * px; c.strokeStyle = 'rgba(16,16,20,.8)'; c.strokeText(tt, sx / hs.length, sy / hs.length); c.fillStyle = u.type === 'march' ? '#ffd2b0' : u.type === 'princ' ? '#e2d4ff' : '#f6ecd4'; c.fillText(tt, sx / hs.length, sy / hs.length);
    }
  };
}
// the layer switch learns a third stop
{ const b = $('belBtn'); if (b) { const old = b.onclick; b.onclick = () => { BEL.view = BEL.view === '' ? 'cul' : BEL.view === 'cul' ? 'rel' : BEL.view === 'rel' ? 'adm' : ''; b.textContent = BEL.view === 'cul' ? 'ชั้น: วัฒนธรรม' : BEL.view === 'rel' ? 'ชั้น: ศาสนา' : BEL.view === 'adm' ? 'ชั้น: การปกครอง' : 'ชั้น: ปิด'; b.setAttribute('aria-pressed', String(!!BEL.view)); requestDraw(); }; b.title = 'แสดงวัฒนธรรม ศาสนา หรือหน่วยการปกครองบนแผนที่'; } }

// ---- the pointer in the government tab: a click picks the unit of the chosen tier; Shift and a click annexes ----
const admLevelAt = (h, lv) => { if (h < 0) return null; if (lv === 3) { const z = ECO.cells[h]; return z && z !== '.' ? { st: ECO.states.find(s => s.id === z) } : null; } const ch = admChain(h); for (let t = lv; t <= 2; t++) if (ch[t]) return ch[t]; return null; };
box.addEventListener('pointerdown', e => {
  if (mode !== 'econ' || ecoTab !== 'adm' || spaceDown || e.target !== cv || e.button !== 0) return;
  e.stopPropagation(); e.preventDefault();
  const [mx, my] = toMap(e.clientX, e.clientY), h = hexAt(mx, my); if (h < 0) return;
  if (e.shiftKey && editable) { admAnnex(h); if (ADM.lv === 0) ADM.drag = true; return; }
  const u = admLevelAt(h, ADM.lv); ADM.sel = u ? (u.st ? 'S:' + u.st.id : u.id) : null; ecoRender(); requestDraw();
}, true);
__on(window, 'pointermove', e => { if (!ADM.drag || !(e.buttons & 1)) { ADM.drag = false; return; } const [mx, my] = toMap(e.clientX, e.clientY), h = hexAt(mx, my); if (h >= 0) admAnnex(h, true); });
__on(window, 'pointerup', () => { ADM.drag = false; });
function admAnnex(h, quiet) {
  const sel = ADM.sel; if (!sel) { if (!quiet) flash('คลิกเลือกหน่วยที่จะรับก่อน แล้วกด Shift ค้างคลิกหน่วยที่จะผนวก'); return; }
  if (sel.startsWith('S:')) {                        // a state takes the greatest unit over the hex, land and all
    const s = ECO.states.find(x => x.id === sel.slice(2)); if (!s) return; const ch = admChain(h), u = ch[2] || ch[1] || ch[0];
    admDo(() => { if (u) { const X = admIndex(); for (const i of X.hexes.get(u.id)) ECO.cells[i] = s.id; u.up = ''; } else if (!isW(eff(h))) ECO.cells[h] = s.id; });
    if (!quiet) flash(u ? `ผนวก${admTitle(u)}เข้ากับ${s.name}แล้ว` : `ผนวกช่องเข้ากับ${s.name}แล้ว`); return;
  }
  const P = admById(sel); if (!P) return;
  if (P.t === 0) { if (isW(eff(h)) || ECO.admc[h] === P.id) return; admDo(() => { ECO.admc[h] = P.id; }); return; }
  const ch = admChain(h), u = ch[P.t - 1]; if (!u) { if (!quiet) flash('ช่องนี้ยังไม่มีหน่วยระดับที่เล็กกว่า'); return; }
  if (u.up === P.id) return; admDo(() => { u.up = P.id; }); if (!quiet) flash(`ผนวก${admTitle(u)}เข้ากับ${admTitle(P)}แล้ว`);
}

// ---- the tab ----
{
  const row = $('ecoTab'); if (row && !row.querySelector('[data-t="adm"]')) { const b = document.createElement('button'); b.type = 'button'; b.dataset.t = 'adm'; b.textContent = 'การปกครอง'; row.insertBefore(b, row.querySelector('[data-t="cul"]')); }
  const er = ecoRender; ecoRender = function () {
    if (ecoTab !== 'adm') return er();
    ecoTab = 'tune'; er(); ecoTab = 'adm'; if ($('ecocard').hidden) return;
    segPick('ecoTab', 't', ecoTab, t => { ecoTab = t; ecoRender(); requestDraw(); if (window.MME && MME.shell && MME.shell.reveal) MME.shell.reveal('ecocard'); });
    $('ecoHead').textContent = 'หน่วยการปกครอง';
    $('ecoHint').textContent = editable ? 'คลิกบนแผนที่เพื่อเลือกหน่วยระดับที่ตั้งไว้ กด Shift ค้างแล้วคลิกหน่วยที่เล็กกว่าเพื่อผนวกเข้ากับหน่วยที่เลือก ถ้าเลือกรัฐไว้ หน่วยที่ผนวกย้ายดินแดนมาด้วย' : 'คลิกบนแผนที่เพื่อดูหน่วยการปกครอง';
    $('ecobody').innerHTML = admHTML();
  };
}
// v0.20.0: who holds a duchy or a kingdom in fact: its counties, counted by the state each lies in (de jure, the title is the
// land; de facto, the state with 51% of its counties holds it)
function admCounties(u, X) { const out = []; const walk = x => { if (x.t === 0) { out.push(x); return; } for (const k of X.kids.get(x.id) || []) walk(X.by.get(k)); }; walk(u); return out; }
function admHold(u, X) {
  const cs = admCounties(u, X), n = new Map(); for (const c of cs) { const z = X.st.get(c.id) || ''; n.set(z, (n.get(z) || 0) + 1); }
  let holder = null; for (const [z, k] of n) if (z && k / Math.max(1, cs.length) >= ADM_HOLD) holder = ECO.states.find(x => x.id === z) || null;
  return { total: cs.length, n, holder };
}
// a state's titles: the duchies and kingdoms it holds in fact, and those it holds in part, which it has a claim to
function admTitlesHTML(s, X) {
  const held = [], part = [];
  for (const u of ECO.adm) { if (u.t < 1) continue; const H = admHold(u, X), k = H.n.get(s.id) || 0; if (!k || !H.total) continue; (H.holder === s ? held : part).push(`<a href="#" data-adm="${u.id}">${esc(admTitle(u))}</a> ${k}/${H.total}`); }
  return (held.length ? `<div class="tr"><b>ตำแหน่งที่ครอง</b> <span class="w">${held.join(' · ')}</span></div>` : '')
    + (part.length ? `<div class="tr"><b>อ้างสิทธิ์ได้ (ครองไม่ถึง 51%)</b> <span class="w">${part.join(' · ')}</span></div>` : '');
}
function admHTML() {
  const X = admIndex(), dis = editable ? '' : ' disabled', lv = ADM.lv, NC = admNames(admCtx());
  let h = `<div class="erow"><span class="lbl">คลิกเลือกระดับ</span><div class="seg" id="admLv">${[0, 1, 2, 3].map(t => `<button type="button" data-lv="${t}" aria-pressed="${t === lv}">${esc(NC[t])}</button>`).join('')}</div></div>`
    + (editable && ECO.states.length ? `<div class="btns" style="margin:4px 0 8px">${[0, 1, 2].map(t => `<button type="button" class="btn" data-aa="new" data-t="${t}">ตั้ง${esc(NC[t])}ใหม่</button>`).join('')}</div>` : '');
  // the chosen unit
  if (ADM.sel && ADM.sel.startsWith('S:')) { const s = ECO.states.find(x => x.id === ADM.sel.slice(2)); if (s) h += `<div class="scard" style="padding:8px"><b>${esc(admNames(s)[3])} ${esc(s.name)}</b><div class="tr w">กด Shift ค้างแล้วคลิกบนแผนที่เพื่อผนวกหน่วยที่ใหญ่ที่สุดใต้ช่องนั้นพร้อมดินแดน</div><button type="button" class="btn" data-sopen="${s.id}">การ์ดของรัฐ</button>${admTitlesHTML(s, X)}</div>`; }
  const u = ADM.sel && !ADM.sel.startsWith('S:') ? admById(ADM.sel) : null;
  if (u) {
    const up = X.upOf(u), st = ECO.states.find(s => s.id === X.st.get(u.id)), cs = X.cities.get(u.id) || [], kids = (X.kids.get(u.id) || []).map(id => X.by.get(id));
    const vc = new Map(visibleCities().map(c => [c.id, c]));
    h += `<div class="scard" style="padding:8px"><b>${esc(admTitle(u))}</b> <small>${X.hexes.get(u.id).length} ช่อง · ${cs.length} ชุมชน · ${socN(X.people.get(u.id) || 0)} คน</small>`
      + `<div class="tr w">ขึ้นกับ ${up ? `<a href="#" data-adm="${up.id}">${esc(admTitle(up))}</a>` : st ? `<a href="#" data-sopen="${st.id}">${esc(admNames(st)[3])} ${esc(st.name)}</a>` : 'ไม่มีรัฐ'}</div>`
      + (u.t >= 1 ? (() => { const H = admHold(u, X), parts = [...H.n].filter(([z]) => z).map(([z, k]) => { const st2 = ECO.states.find(x => x.id === z); return `${esc(st2 ? st2.name : '?')} ${k}/${H.total}`; }).join(' · ');
          return `<div class="tr w">ตามสิทธิ์ (de jure) มี ${H.total} ${esc(admNames(st)[0])} · ${H.holder ? `ครองโดย <b>${esc(H.holder.name)}</b>` : 'ยังไม่มีรัฐใดครองถึง 51%'}${parts ? ' · ' + parts : ''}</div>`; })() : '')
      + `<div class="erow"><label>ชื่อ <input type="text" data-af="name" maxlength="60" value="${esc(u.name)}"${dis}></label>`
      + (u.t === 2 ? `<label>ชนิด <select data-af="type"${dis}><option value="">${esc(admNames(st)[2])}</option><option value="march"${u.type === 'march' ? ' selected' : ''}>${esc(admNames(st).march)}</option><option value="princ"${u.type === 'princ' ? ' selected' : ''}>${esc(admNames(st).princ)}</option></select></label>` : '') + `</div>`
      + (u.t === 0 ? `<div class="erow"><label>การผนวก <select data-af="inc"${dis}>${Object.entries(ADMINC).map(([k, v]) => `<option value="${k}"${(u.inc || '') === k ? ' selected' : ''}>${v[0]}</option>`).join('')}</select></label><span class="lbl">${u.inc ? `เก็บภาษีได้ ${Math.round(ADMINC[u.inc][1] * 100)}% เสถียรภาพ ${ADMINC[u.inc][2]}` : 'เก็บภาษีเต็ม'}</span></div>` : '')
      + `<div class="erow"><label>ที่ตั้งศูนย์กลาง <select data-af="seat"${dis}><option value="">ไม่ระบุ</option>${cs.map(id => `<option value="${esc(id)}"${id === u.seat ? ' selected' : ''}>${esc((vc.get(id) || {}).name || 'ไม่มีชื่อ')}</option>`).join('')}</select></label></div>`
      + (u.type === 'march' ? `<div class="tr w">${esc(admNames(st).march)}: เขตทหาร ชุมชนในเขตทำอาวุธได้มากขึ้นหนึ่งในสี่ ความเป็นอยู่ −1 ส่วนกลางเก็บภาษีได้ 90% งบของหน่วยตั้งต้นให้กลาโหมมาก</div>` : u.type === 'princ' ? `<div class="tr w">${esc(admNames(st).princ)}: ปกครองตนเองเกือบเต็มที่ ความเป็นอยู่ +2 ส่วนกลางเก็บภาษีได้ครึ่งเดียว ภาษีท้องถิ่นของหน่วยสูงขึ้นครึ่งหนึ่ง</div>` : '')
      + (kids.length ? `<div class="tr"><b>หน่วยในสังกัด</b> <span class="w">${kids.map(k => `<a href="#" data-adm="${k.id}">${esc(admTitle(k))}</a>`).join(' · ')}</span></div>` : '')
      + (cs.length ? `<div class="tr"><b>${u.t === 0 ? 'ชุมชนใน' + esc(admTier(u)) : 'ชุมชน'}</b> <span class="w">${cs.slice(0, 30).map(id => `<a href="#" data-city="${esc(id)}">${esc((vc.get(id) || {}).name || 'ไม่มีชื่อ')}</a>`).join(' · ')}${cs.length > 30 ? ' …' : ''}</span></div>` : '')
      + `<div class="btns"><button type="button" class="btn" data-note="s:${u.id}" data-nt="${esc(admTitle(u))}">${noteOf('s:' + u.id) ? 'ประวัติ' : 'เขียนประวัติ'}</button>${up ? `<button type="button" class="btn" data-aa="free"${dis}>แยกออกจากหน่วยเหนือ</button>` : ''}<button type="button" class="btn warn" data-aa="del"${dis}>ยุบหน่วยนี้</button></div></div>`;
  }
  // each state, its tree
  for (const s of ECO.states) {
    // v0.19.6: a state not yet divided shows its card open, with the button to divide it (the owner could not find it folded away)
    const tops = ECO.adm.filter(x => !X.upOf(x) && X.st.get(x.id) === s.id).sort((a, b) => b.t - a.t || (X.people.get(b.id) || 0) - (X.people.get(a.id) || 0));
    const tree = x => `<li><a href="#" data-adm="${x.id}"${ADM.sel === x.id ? ' class="on"' : ''}>${esc(admTitle(x))}</a>${x.t > 0 && (X.kids.get(x.id) || []).length ? `<ul>${X.kids.get(x.id).map(id => tree(X.by.get(id))).join('')}</ul>` : ''}</li>`;
    h += `<details class="efold scard"${GDPV['ad' + s.id] || (GDPV['ad' + s.id] == null && !tops.length) ? ' open' : ''} data-afold="${s.id}"><summary><i class="sdot" style="background:${s.color}"></i>${esc(admNames(s)[3])} ${esc(s.name)} <small>${s.gov && GOV[s.gov] ? esc(GOV[s.gov].name) + ' · ' : ''}${tops.length ? ECO.adm.filter(x => X.st.get(x.id) === s.id).length + ' หน่วย' : 'ยังไม่แบ่ง'}</small></summary><div class="eform">`
      + `<div class="btns"><button type="button" class="btn" data-aa="build" data-s="${s.id}"${dis}>${tops.length ? 'แบ่งใหม่อัตโนมัติ' : 'แบ่งหน่วยอัตโนมัติ'}</button><button type="button" class="btn" data-aa="sel" data-s="${s.id}">เลือกรัฐนี้</button></div>`
      + (tops.length ? `<ul class="admtree">${tops.map(tree).join('')}</ul>` : '')
      + admTitlesHTML(s, X)
      + (ECO.states.length > 1 ? `<div class="erow"><label>รวมเข้ากับ <select data-aj="${s.id}"${dis}>${ECO.states.filter(o => o !== s).map(o => `<option value="${o.id}">${esc(o.name)}</option>`).join('')}</select></label><label><input type="checkbox" data-ak="${s.id}" checked${dis}> เก็บรัฐนี้ไว้เป็น${esc(admNames(s).princ)}</label><button type="button" class="btn warn" data-aa="join" data-s="${s.id}"${dis}>รวมรัฐ</button></div>` : '')
      + `</div></details>`;
  }
  if (!ECO.states.length) h += '<p class="note">ยังไม่มีรัฐ หน่วยการปกครองแบ่งได้ภายในรัฐเท่านั้น เพิ่มรัฐและระบายเขตแดนก่อน แล้วกลับมาแบ่งที่นี่</p><div class="btns"><button type="button" class="btn" data-aa="gost">ไปแท็บรัฐและเขตแดน</button></div>';
  h += `<details class="efold" data-fold="admnames"><summary>ชื่อของระดับการปกครอง <small>ใช้กับรัฐที่ไม่ได้เลือกระบอบ</small></summary><div class="eform"><div class="erow">${['0', '1', '2', 'march', 'princ', '3'].map(k => `<label>${{ 0: 'ระดับเล็กสุด', 1: 'ระดับที่สอง', 2: 'ระดับที่สาม', march: 'ระดับที่สามแบบชายแดน', princ: 'ระดับที่สามแบบปกครองตนเอง', 3: 'ระดับสูงสุด' }[k]} <input type="text" data-an="${k}" maxlength="30" value="${esc(ECO.admn[k])}" style="width:9em"${dis}></label>`).join('')}</div>`
    + `<div class="tr w">รัฐที่เลือกระบอบการปกครองไว้ในการ์ดของรัฐใช้ชื่อตามระบอบนั้น</div><div class="btns"><button type="button" class="btn" data-aa="names0"${dis}>ชื่อแบบยุโรป</button><button type="button" class="btn" data-aa="namesTh"${dis}>ชื่อแบบไทยโบราณ</button></div></div></details>`;
  return h;
}
$('ecobody').addEventListener('click', e => {
  if (ecoTab !== 'adm') return;
  const lvb = e.target.closest ? e.target.closest('#admLv button') : null; if (lvb) { ADM.lv = +lvb.dataset.lv; ecoRender(); return; }
  const go = e.target.closest ? e.target.closest('[data-adm]') : null; if (go) { e.preventDefault(); ADM.sel = go.dataset.adm; const u = admById(ADM.sel); if (u) { ADM.lv = u.t; admFocus(u); } ecoRender(); requestDraw(); return; }
  const cg = e.target.closest ? e.target.closest('[data-city]') : null; if (cg) { e.preventDefault(); const v = visibleCities().find(c => c.id === cg.dataset.city); if (v) { setMode('city'); selectCity(v.id); admFocusXY(v.x, v.y); } return; }
  const b = e.target.closest ? e.target.closest('[data-aa]') : null; if (!b) return; const a = b.dataset.aa;
  if (a === 'sel') { ADM.sel = 'S:' + b.dataset.s; ADM.lv = 3; ecoRender(); requestDraw(); return; }
  if (a === 'gost') { ecoTab = 'states'; ecoRender(); requestDraw(); return; }
  if (!editable) return; const u = admById(ADM.sel);
  if (a === 'new') { const t = +b.dataset.t; if (![0, 1, 2].includes(t)) return; const NC = admNames(admCtx()), nu = { id: admNewId(), t, name: 'ใหม่', up: '', type: '', seat: '' }; admDo(() => { ECO.adm.push(nu); }); ADM.sel = nu.id; ADM.lv = t; ecoRender(); requestDraw();
    flash(t === 0 ? `ตั้ง${NC[0]}ใหม่แล้ว กด Shift ค้างแล้วลากบนแผนที่เพื่อระบายที่ดินให้` : `ตั้ง${NC[t]}ใหม่แล้ว กด Shift ค้างแล้วคลิก${NC[t - 1]}บนแผนที่เพื่อรวมเข้ามา`); return; }
  if (a === 'build') { const s = ECO.states.find(x => x.id === b.dataset.s); if (s) { let n = 0; admDo(() => { n = admBuild(s); }); flash(n ? `แบ่ง${s.name} เป็น ${n} ${admNames(s)[0]}แล้ว` : 'รัฐนี้ยังไม่มีดินแดนบนแผ่นดิน'); } }
  else if (a === 'free' && u) admDo(() => { u.up = ''; });
  else if (a === 'del' && u) { admDo(() => { const X = admIndex(), up = X.upOf(u); for (const k of X.kids.get(u.id) || []) X.by.get(k).up = up ? up.id : ''; if (u.t === 0) { for (let i = 0; i < N; i++) if (ECO.admc[i] === u.id) ECO.admc[i] = ''; } ECO.adm = ECO.adm.filter(x => x !== u); }); ADM.sel = null; ecoRender(); }
  else if (a === 'join') { const from = ECO.states.find(x => x.id === b.dataset.s), to = ECO.states.find(x => x.id === $('ecobody').querySelector(`[data-aj="${b.dataset.s}"]`).value), keep = $('ecobody').querySelector(`[data-ak="${b.dataset.s}"]`).checked; if (from && to) { admDo(() => admJoin(from, to, keep)); ECOX.byKey.delete(from.id); flash(`รวม${from.name}เข้ากับ${to.name}แล้ว` + (keep ? ` ${from.name}เป็น${admNames(to).princ}` : '')); ecoChanged(true); } }
  else if (a === 'names0' || a === 'namesTh') admDo(() => { ECO.admn = { ...(a === 'names0' ? ADMN0 : ADMN_TH) }; });
});
$('ecobody').addEventListener('change', e => {
  if (ecoTab !== 'adm' || !editable) return; const el = e.target, u = admById(ADM.sel);
  if (el.dataset.an) { const v = el.value.trim().slice(0, 30); if (v) admDo(() => { ECO.admn[el.dataset.an] = v; }); return; }
  if (!u || !el.dataset.af) return; const f = el.dataset.af;
  admDo(() => { if (f === 'name') u.name = el.value.trim().slice(0, 60); else if (f === 'type') u.type = ADMFX[el.value] ? el.value : ''; else if (f === 'seat') u.seat = el.value; else if (f === 'inc' && u.t === 0) { if (ADMINC[el.value] && el.value) u.inc = el.value; else delete u.inc; } });
});
$('ecobody').addEventListener('toggle', e => { const d = e.target; if (d.dataset && d.dataset.afold) { GDPV['ad' + d.dataset.afold] = d.open ? 1 : 0; } }, true);
function admFocusXY(x, y) { const r = cv.getBoundingClientRect(); view.x = r.width / 2 - x * view.s; view.y = r.height / 2 - y * view.s; clampView(); requestDraw(); }
function admFocus(u) { const hs = admIndex().hexes.get(u.id) || []; if (!hs.length) return; let sx = 0, sy = 0; for (const i of hs) { sx += CX[i]; sy += CY[i]; } admFocusXY(sx / hs.length, sy / hs.length); }
// the peek and the community's card name the units over a community
{ const px = peekCityExtra; peekCityExtra = (c, E) => { const ch = ECO.adm.length ? admCity(c.id) : null, t = ch ? [ch[0], ch[1], ch[2]].filter(Boolean).map(admTitle) : []; return px(c, E) + (t.length ? `<div class="m">${t.map(esc).join(' · ')}</div>` : ''); }; }
// the unit's own economy this year (29m, v0.21.0): its people and product, what it taxed and how, what it spent, what it trades
// across its own bounds; and the settings of its purse
{
  const ah = admHTML; admHTML = function () {
    const h = ah(), u = ADM.sel && !ADM.sel.startsWith('S:') ? admById(ADM.sel) : null; if (!u || typeof fiscOf !== 'function') return h;
    const st = admStateOf(u); if (!st || st.sys === 'anar') return h; const F = fiscOf(st), U = typeof FISC !== 'undefined' ? FISC.unit.get(u.id) : null, dis = editable ? '' : ' disabled', coin = esc(ECO.central.name);
    const B = unitBud(u, F), pcv = x => Math.round(x * 1000) / 10;
    let x = `<div class="ssec"><h5>เศรษฐกิจของ${esc(admTitle(u))}</h5>`;
    if (U && ECON) {
      const X = admIndex(), ids = new Set(X.cities.get(u.id) || []), per = ECO.central.per; let ex = 0, im = 0;
      for (const f of ECON.flows) { if (f.cat === 'labor') continue; const a = ids.has(ECON.cities[f.from].id), b2 = ids.has(ECON.cities[f.to].id); if (a === b2) continue; const v = f.amt * ECAT[f.cat].v * (ECON.P1[f.to][f.cat] || 1) * per; if (a) ex += v; else im += v; }
      x += `<div class="schips tr"><span class="chip0">${socN(U.ppl)} คน</span><span class="chip0">GDP ${socN(U.gdp)} ${coin}</span><span class="chip0">ต่อหัว ${socN(U.ppl ? U.gdp / U.ppl : 0)}</span><span class="chip0 ${ex >= im ? 'pos' : 'neg'}">ขายออกนอกเขต ${socN(ex)} · ซื้อเข้า ${socN(im)}</span><span class="chip0">เสถียรภาพ ${Math.round(U.stab)}</span></div>`
        + `<div class="tr">ภาษีท้องถิ่นปีนี้ <b>${socN(U.got)}</b> ${coin}${U.toll > 0 ? ` (รวมด่าน ${socN(U.toll)})` : ''} <span class="w">รั่วไหล ${socN(U.leak)} · ใช้ ${Object.entries(FBUD).map(([k, n]) => n + ' ' + socN(U.bud[k])).join(' · ')} · เข้าคลังของหน่วย ${socN(U.tr)}</span></div>`;
    } else x += `<div class="tr w">ยังไม่มีชุมชนในเขตนี้ หรือการค้ายังคิดไม่เสร็จ</div>`;
    x += `<div class="erow"><label>ภาษีท้องถิ่น <input type="number" data-uf="rate" min="0" max="50" step="0.5" value="${pcv(unitRate(u, F))}" style="width:4.6em"${u.rate != null ? ' class="chg"' : ''}${dis}> %</label><label>ของ <select data-uf="base"${dis}>${Object.entries(LBASE).map(([k, n]) => `<option value="${k}"${unitBase(u, F) === k ? ' selected' : ''}>${n}</option>`).join('')}</select></label><label>ด่านเก็บของที่เข้าเขต <input type="number" data-uf="toll" min="0" max="100" step="0.5" value="${pcv(u.toll || 0)}" style="width:4.6em"${dis}> %</label></div>`
      + `<div class="ftax">${Object.entries(FBUD).map(([k, n]) => `<label>${n} <input type="number" data-uf="b.${k}" min="0" max="100" step="1" value="${pcv(B[k])}" style="width:4.4em"${u.bud && u.bud[k] != null ? ' class="chg"' : ''}${dis}> %</label>`).join('')}</div>`
      + `<div class="tr w">เขตนี้ตั้งภาษี ด่าน และงบของตัวเองได้ ส่วนพันธมิตร คู่อริ การคว่ำบาตร ภาษีนำเข้า และระบอบเศรษฐกิจเป็นกฎหมายของ${esc(st.name)} ใช้ทั้งรัฐ ด่านทำให้ของจากนอกเขตแพงขึ้นในเขตนี้ คนในเขตจึงซื้อของในเขตมากขึ้น</div>`
      + `<div class="btns"><button type="button" class="btn" data-aa="ureset"${dis}>ใช้อัตราและงบตามระดับของรัฐ</button></div></div>`;
    const at = h.indexOf('<div class="erow"><label>ชื่อ'); return at >= 0 ? h.slice(0, at) + x + h.slice(at) : h + x;
  };
}
$('ecobody').addEventListener('change', e => {
  if (ecoTab !== 'adm' || !editable) return; const el = e.target, f = el.dataset && el.dataset.uf, u = admById(ADM.sel); if (!f || !u) return;
  const v = clamp((+el.value || 0) / 100, 0, 1);
  admDo(() => { if (f === 'rate') u.rate = Math.min(0.5, v); else if (f === 'base') { if (LBASE[el.value]) u.base = el.value; } else if (f === 'toll') { if (v > 0) u.toll = v; else delete u.toll; } else if (f.startsWith('b.')) (u.bud || (u.bud = {}))[f.slice(2)] = v; });
});
$('ecobody').addEventListener('click', e => { if (ecoTab !== 'adm' || !editable) return; const b = e.target.closest ? e.target.closest('[data-aa="ureset"]') : null, u = admById(ADM.sel); if (!b || !u) return; admDo(() => { delete u.rate; delete u.base; delete u.bud; delete u.toll; }); });

// ---- v0.19.5: a community put under another, from the community's own form ----
// The owner asked why he could not simply say which city answers to which (25 Nov 2026). The units hold land, so a community
// answers to whoever holds the unit it heads. Its own unit is the highest it is the seat of; a community that heads nothing is
// given its own hex as a manor of its own, carved from the manor it stood in. Putting A under B:
//   - B's unit ranks above A's: A's unit goes straight into it (a tier may be skipped, as it may by hand).
//   - Otherwise B is given a unit one tier above A's, seated at B and named after it, set between B's unit and whatever held
//     B's unit; A's unit goes into that.
// A state not yet divided is divided first, as its own button would. A duchy's seat answers only to its state, and a community
// answers only within its own state: moving land between states is the state's own brush.
function admOwnUnit(cid, carve) {
  const X = admIndex(), seats = ECO.adm.filter(u => u.seat === cid);
  if (seats.length) return seats.reduce((a, b) => (b.t > a.t ? b : a));
  const v = visibleCities().find(c => c.id === cid), h = v ? hexAt(v.x, v.y) : -1, m = h >= 0 ? X.by.get(ECO.admc[h] || '') : null;
  if (!m || m.t !== 0) return null;
  if (!m.seat) { if (carve) m.seat = cid; return m; }
  if (!carve) return m;
  const u = { id: admNewId(), t: 0, name: v.name || '', up: m.up, type: '', seat: cid }; ECO.adm.push(u); ECO.admc[h] = u.id;
  ADM.stamp++; ADM.idx = null; return u;
}
function admUpCity(cid) {                            // what the form shows: the community, the unit or the state it answers to
  const v = visibleCities().find(c => c.id === cid), h = v ? hexAt(v.x, v.y) : -1, st = h >= 0 ? ECO.cells[h] : '.';
  if (!st || st === '.') return { st: '' };
  const u = admOwnUnit(cid, false); if (!u) return { st, none: true };
  const p = admIndex().upOf(u); return { st, u, p };
}
function admPutUnder(a, b) {
  const va = visibleCities().find(c => c.id === a), vb = visibleCities().find(c => c.id === b); if (!va || !vb) return 'ไม่พบชุมชน';
  const ha = hexAt(va.x, va.y), hb = hexAt(vb.x, vb.y), sa = ha >= 0 ? ECO.cells[ha] : '.', sb = hb >= 0 ? ECO.cells[hb] : '.';
  if (!sa || sa === '.') return `${va.name || 'ชุมชนนี้'} อยู่นอกรัฐ ระบายเขตรัฐให้ก่อน`;
  if (sa !== sb) return `${vb.name || 'ชุมชนนั้น'} อยู่คนละรัฐ ขึ้นตรงต่อกันได้เฉพาะในรัฐเดียวกัน`;
  let msg = '';
  admDo(() => {
    const s = ECO.states.find(x => x.id === sa);
    if (s && !ECO.adm.some(u => u.t === 0 && (ECO.admc[ha] === u.id || ECO.admc[hb] === u.id))) { admBuild(s); ADM.stamp++; ADM.idx = null; }
    const ua = admOwnUnit(a, true), ub = admOwnUnit(b, true); if (!ua || !ub) { msg = 'แบ่งหน่วยการปกครองของรัฐนี้ไม่ได้'; return; }
    ADM.stamp++; ADM.idx = null; const X = admIndex();
    for (let x = ub; x; x = X.upOf(x)) if (x === ua) { msg = `${vb.name} ขึ้นกับ ${va.name} อยู่ ให้ ${vb.name} ขึ้นกับที่อื่นก่อน`; return; }
    if (ub.t > ua.t) { ua.up = ub.id; return; }
    const T = ua.t + 1; if (T > 2) { msg = `${va.name} เป็นที่ตั้งของ${admNames(ECO.states.find(x => x.id === sa))[2]} ขึ้นตรงต่อรัฐได้อย่างเดียว`; return; }
    let p = X.upOf(ub); while (p && p.t <= T) p = X.upOf(p);
    const c = { id: admNewId(), t: T, name: vb.name || '', up: p ? p.id : '', type: '', seat: b }; ECO.adm.push(c);
    ub.up = c.id; ua.up = c.id;
  });
  return msg;
}
function admCityForm() {
  const sl = $('cfUp'); if (!sl || !sel) return; const r = admUpCity(sel), note = $('cfUpNote');
  if (!r.st) { sl.innerHTML = '<option>อยู่นอกรัฐ</option>'; sl.disabled = true; note.textContent = 'ระบายเขตรัฐให้ชุมชนนี้ก่อน'; return; }
  const vc = visibleCities(), mine = vc.filter(c => c.id !== sel && ECO.cells[hexAt(c.x, c.y)] === r.st).sort((x, y) => (KIX[x.kind] != null ? KIX[x.kind] : 1) - (KIX[y.kind] != null ? KIX[y.kind] : 1) || (x.name || '').localeCompare(y.name || '', 'th')).slice(0, 400);
  const s = ECO.states.find(x => x.id === r.st), boss = r.u && r.u.seat && r.u.seat !== sel ? r.u : r.p, cur = boss ? (boss.seat && boss.seat !== sel ? boss.seat : 'u:' + boss.id) : '';   // a community that heads nothing answers to its manor's seat
  let h = `<option value="">${esc(admNames(s)[3])} ${esc(s ? s.name : '')} โดยตรง</option>`;
  if (cur.startsWith('u:')) h += `<option value="${cur}">${esc(admTitle(boss))}</option>`;
  h += mine.map(c => `<option value="${esc(c.id)}">${esc(c.name || 'ไม่มีชื่อ')} · ${esc((CK[c.kind] || CK.city).name)}</option>`).join('');
  sl.innerHTML = h; sl.value = cur; sl.disabled = !editable;
  note.textContent = r.none ? 'รัฐนี้ยังไม่ได้แบ่งหน่วยการปกครอง เลือกแล้วระบบจะแบ่งให้ก่อน' : r.u && r.u.seat === sel ? `ในฐานะที่ตั้งของ${admTier(r.u)}${r.u.name ? ' ' + r.u.name : ''}` : r.u ? `อยู่ใน${admTitle(r.u)}` : '';
}
$('cfUp').onchange = () => {
  if (!sel || !editable) return; const v = $('cfUp').value;
  if (v.startsWith('u:')) return;
  if (!v) { admDo(() => { const u = admOwnUnit(sel, true); if (u) u.up = ''; }); flash('ขึ้นตรงต่อรัฐโดยตรงแล้ว กดย้อนเพื่อเอาคืน'); }
  else { const m = admPutUnder(sel, v); const vb = visibleCities().find(c => c.id === v); flash(m || `ขึ้นตรงต่อ${vb ? ' ' + vb.name : ''}แล้ว กดย้อนเพื่อเอาคืน`); }
  admCityForm(); requestDraw();
};
{ const rf = refreshForm; refreshForm = function () { rf(); admCityForm(); }; }
