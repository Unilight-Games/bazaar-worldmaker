// ---------- cultures and faiths (v0.19.0) ----------
// The owner asked for a system of belief. Each land has a culture of its own: cultures can be made, their traits set, and the land
// where each is the main one painted. A faith works the same way, and is tied to the organisations of faith, to what people
// spend on, and to the journeys of pilgrims. A community takes the culture and the faith of its hex unless the owner set its own.
// What they do:
//   traits    each trait adds to the community what a kind or a mark of a community does (size, workshops, arms, books, reach,
//             how well people live, visitors, the middle class, holiness), and some change what people buy
//   trade     a trade line between two cultures, or two faiths, costs a little more (a merchant culture and a tolerant faith
//             do not mind; an inward culture minds twice)
//   tithe     the believers give a share of their income; it goes to the faith's seat
//   holiness  the seat of a faith is holier; a house of a faith's organisation counts in full among its own believers and half
//             among others
//   pilgrims  go to the holy places of their own faith, rarely to another's
// Every number here is Claude's: the traits are in the tables below, the costs and shares in the numbers tab.
Object.assign(ETUNE, {
  culFar: [0.08, 0, 1, 0.01, 'ค่าขนที่เพิ่มบนเส้นการค้าระหว่างสองวัฒนธรรม (ส่วนของค่าขน)', 'วัฒนธรรมและศาสนา'],
  relFar: [0.06, 0, 1, 0.01, 'ค่าขนที่เพิ่มบนเส้นการค้าระหว่างสองศาสนา (ส่วนของค่าขน)', 'วัฒนธรรมและศาสนา'],
  relPilgOther: [0.15, 0, 1, 0.05, 'ผู้แสวงบุญไปศาสนสถานของศาสนาอื่นได้เท่านี้ของศาสนาตัวเอง', 'วัฒนธรรมและศาสนา'],
  relSeatHoly: [2, 0, 10, 0.5, 'ความศักดิ์สิทธิ์ที่ศูนย์กลางของศาสนาได้เพิ่ม', 'วัฒนธรรมและศาสนา'],
});
const CULT = {
  merchant: { name: 'ค้าขายเก่ง', why: 'ชนชั้นกลางเพิ่ม 4% ค้ากับต่างวัฒนธรรมไม่เสียค่าขนเพิ่ม', fx: { mid: 0.04 }, open: 1 },
  martial: { name: 'นักรบ', why: 'ทำอาวุธได้มากขึ้นครึ่งหนึ่งของสามส่วน ความเป็นอยู่ −1', fx: { arms: 1.3, well: -1 } },
  scholarly: { name: 'รักการเรียนรู้', why: 'ผลิตตำราเพิ่ม', fx: { books: 0.3 } },
  artisan: { name: 'ช่างฝีมือ', why: 'โรงงานผลิตได้มากขึ้น 15%', fx: { ind: 1.15 } },
  nomadic: { name: 'เร่ร่อนเลี้ยงสัตว์', why: 'เก็บเกี่ยวได้ไกลขึ้นหนึ่งช่อง คนน้อยลง 10% ต้องการเนื้อนมมากขึ้น', fx: { reach: 1, pop: 0.9 }, need: { protein: 1.2 } },
  seafaring: { name: 'ชาวเรือ', why: 'ชุมชนติดน้ำขึ้นลำดับชุมทางหนึ่งขั้น ต้องการเรือมากขึ้น', fx: { portRank: 1 }, need: { ships: 1.3 } },
  hospitable: { name: 'ต้อนรับแขก', why: 'ดึงนักท่องเที่ยวมากขึ้น', fx: { att: 0.15 } },
  communal: { name: 'รวมหมู่', why: 'ความเป็นอยู่ +3 ชนชั้นกลางลด 2%', fx: { well: 3, mid: -0.02 } },
  insular: { name: 'ปิดตัว', why: 'ความเป็นอยู่ +1 ค้ากับต่างวัฒนธรรมเสียค่าขนเพิ่มเป็นสองเท่า', fx: { well: 1 }, close: 1 },
};
const RELT = {
  pilgrim: { name: 'แสวงบุญมาก', why: 'คนออกแสวงบุญบ่อยขึ้นครึ่งหนึ่ง', pilg: 1.5 },
  ascetic: { name: 'สมถะ', why: 'ซื้อของหายากน้อยลง 40% ความเป็นอยู่ +2', fx: { well: 2 }, need: { luxury: 0.6 } },
  festive: { name: 'เทศกาลมาก', why: 'ซื้อของหายากและสมุนไพรมากขึ้น ดึงนักท่องเที่ยว', fx: { att: 0.1 }, need: { luxury: 1.3, herbs: 1.2 } },
  monastic: { name: 'นิยมบวชเรียน', why: 'ผลิตตำราเพิ่ม ศักดิ์สิทธิ์ขึ้นเล็กน้อย', fx: { books: 0.2, holy: 0.5 } },
  militant: { name: 'นักรบศาสนา', why: 'ทำอาวุธได้มากขึ้น 20%', fx: { arms: 1.2 } },
  tolerant: { name: 'ใจกว้าง', why: 'ค้ากับต่างศาสนาไม่เสียค่าขนเพิ่ม ผู้แสวงบุญของศาสนาอื่นมาได้ครึ่งหนึ่ง', open: 1 },
  dietary: { name: 'ข้อห้ามอาหาร', why: 'กินเนื้อสัตว์น้อยลงหนึ่งในสี่ กินธัญพืชมากขึ้น', need: { protein: 0.75, grain: 1.1 } },
  temple: { name: 'สร้างศาสนสถานใหญ่', why: 'ต้องการหินและของหายากมากขึ้น ศักดิ์สิทธิ์ขึ้นเล็กน้อย', fx: { holy: 0.5 }, need: { stone: 1.15, luxury: 1.1 } },
};
const BELCOLS = ['#c8553d', '#3d7ec8', '#5aa05a', '#c8a03d', '#8a5ac8', '#3db0a8', '#c85a96', '#7a8a3d', '#d07a2a', '#4a5ac0', '#a03d5a', '#5a8a7a'];
ECO.cul = []; ECO.culc = new Array(N).fill(''); ECO.rel = []; ECO.relc = new Array(N).fill(''); ECO.ccul = {}; ECO.crel = {};
let belCv = null, belSheetKey = '';
const BEL = { tab: null, pick: null, erase: false, n: 2, stamp: 0, city: new Map(), view: '' };
const belList = k => k === 'cul' ? ECO.cul : ECO.rel, belCells = k => k === 'cul' ? ECO.culc : ECO.relc, belOver = k => k === 'cul' ? ECO.ccul : ECO.crel, belTraits = k => k === 'cul' ? CULT : RELT;
const belById = (k, id) => id ? belList(k).find(x => x.id === id) || null : null;
const belName = { cul: 'วัฒนธรรม', rel: 'ศาสนา' };
// a community's culture and faith: its own, else its hex's
function belAt(id, x, y) {
  const h = x != null ? hexAt(x, y) : -1;
  const pick = k => { const o = belOver(k)[id]; if (o === '-') return null; if (o && belById(k, o)) return belById(k, o); return h >= 0 ? belById(k, belCells(k)[h]) : null; };
  return { cul: pick('cul'), rel: pick('rel') };
}
function belCity(id) {                                // from the year's cache, or worked out now
  const c = BEL.city.get(id); if (c && c.stamp === BEL.stamp) return c.b;
  const v = visibleCities().find(x => x.id === id); const b = v ? belAt(id, v.x, v.y) : { cul: null, rel: null }; BEL.city.set(id, { stamp: BEL.stamp, b }); return b;
}
function belChanged(tables) { BEL.stamp++; BEL.city.clear(); belSheetKey = ''; ecoChanged(!!tables); requestDraw(); if (mode === 'econ' && (ecoTab === 'cul' || ecoTab === 'rel')) ecoRender(); }

// ---- what they do ----
{
  const cf = comFx; comFx = function (id, kind) {
    const f = cf(id, kind); if (!ECO.cul.length && !ECO.rel.length) return f; const b = belCity(id);
    const add = o => { if (!o) return; for (const k of Object.keys(o)) { if (!(k in f)) continue; if (k === 'pop' || k === 'ind' || k === 'arms') f[k] *= o[k]; else if (k === 'rankMin') f[k] = Math.max(f[k], o[k]); else f[k] += o[k]; } };
    if (b.cul) for (const t of b.cul.tr) add(CULT[t] && CULT[t].fx); if (b.rel) for (const t of b.rel.tr) add(RELT[t] && RELT[t].fx);
    return f;
  };
  const cw = comWhy; comWhy = function (id, kind) {
    const out = cw(id, kind), b = belCity(id);
    if (b.cul) for (const t of b.cul.tr) if (CULT[t] && CULT[t].fx) out.push(b.cul.name + ' (' + CULT[t].name + '): ' + CULT[t].why);
    if (b.rel) for (const t of b.rel.tr) if (RELT[t] && RELT[t].fx) out.push(b.rel.name + ' (' + RELT[t].name + '): ' + RELT[t].why);
    return out;
  };
  const sn = socNeed; socNeed = function (c, cat) {
    let v = sn(c, cat); if (!ECO.cul.length && !ECO.rel.length) return v; const b = belCity(c.id);
    if (b.cul) for (const t of b.cul.tr) { const n = CULT[t] && CULT[t].need; if (n && n[cat]) v *= n[cat]; }
    if (b.rel) for (const t of b.rel.tr) { const n = RELT[t] && RELT[t].need; if (n && n[cat]) v *= n[cat]; }
    return v;
  };
  const lc = ecoLinkCost; ecoLinkCost = function (L, cities) {
    const c = lc(L, cities); L.belFar = 0; if (!ECO.cul.length && !ECO.rel.length) return c;
    const A = belCity(cities[L.ia].id), B = belCity(cities[L.ib].id); let k = 0;
    if (A.cul && B.cul && A.cul !== B.cul) { const op = A.cul.tr.includes('merchant') || B.cul.tr.includes('merchant'), cl = A.cul.tr.includes('insular') || B.cul.tr.includes('insular'); if (!op || cl) k += TU('culFar') * (cl ? 2 : 1); }
    if (A.rel && B.rel && A.rel !== B.rel && !A.rel.tr.includes('tolerant') && !B.rel.tr.includes('tolerant')) k += TU('relFar');
    L.belFar = k; return c * (1 + k);
  };
  const ec = econCompute; econCompute = function () { BEL.stamp++; BEL.city.clear(); return ec(); };
}
// the seat of a faith: the owner's choice, else its holiest believing community, else its biggest
function relSeat(R, rows) {
  if (R.seat && rows.some(r => r.c.id === R.seat && belCity(r.c.id).rel === R)) return R.seat;
  let best = null; for (const r of rows) { if (belCity(r.c.id).rel !== R) continue; if (!best || r.people > best.people) best = r; } return best ? best.c.id : '';
}
// the tithe, before the books of the states are drawn: from each believing community to the faith's seat
{
  const sa = socApply; socApply = function (rows) {
    BEL.tithe = {};
    if (ECO.rel.length && rows && rows.length) {
      for (const R of ECO.rel) {
        const t = clamp(+R.tithe || 0, 0, 0.3); if (!(t > 0)) continue; const seat = relSeat(R, rows), to = rows.find(r => r.c.id === seat); if (!to) continue;
        let pool = 0; for (const r of rows) { if (belCity(r.c.id).rel !== R) continue; const x = t * Math.max(0, r.inc); r.inc -= x; r.tithe = x; pool += x; }
        to.inc += pool; to.titheIn = pool; BEL.tithe[R.id] = { pool, seat };
      }
    }
    return sa(rows);
  };
}
// holiness and the pilgrims' choice (called from the journeys, 29j)
function relHoly(c) {
  const b = belCity(c.id); let h = 0; const why = [];
  if (b.rel) { const seat = BEL.tithe && BEL.tithe[b.rel.id] ? BEL.tithe[b.rel.id].seat : b.rel.seat; if (seat === c.id) { h += TU('relSeatHoly'); why.push(['ศูนย์กลางของ' + b.rel.name, TU('relSeatHoly')]); } }
  return { h, why };
}
function relOrgW(c, o) {                              // a house of a faith's organisation: whole among its own believers, half elsewhere
  const R = ECO.rel.find(x => (x.orgs || []).includes(o.id)); if (!R) return 1; return belCity(c.id).rel === R ? 1 : 0.5;
}
function relPilgW(a, b) {
  const A = belCity(a.c.id).rel, B = belCity(b.c.id).rel; if (!A || !B || A === B) return 1;
  return B.tr.includes('tolerant') ? Math.max(0.5, TU('relPilgOther')) : TU('relPilgOther');
}
const relPilgRate = r => { const R = belCity(r.c.id).rel; return R && R.tr.includes('pilgrim') ? RELT.pilgrim.pilg : 1; };

// ---- the document ----
{
  const ld = ecoLoad, sr = ecoSerial;
  const clean = (list, T) => { const out = []; for (const o of (Array.isArray(list) ? list : []).slice(0, 60)) { if (!o || typeof o.id !== 'string' || !/^[a-z0-9]{1,16}$/.test(o.id) || out.some(x => x.id === o.id)) continue; out.push({ id: o.id, name: ecoStr(o.name, 60) || 'ไม่มีชื่อ', col: HEXC.test(o.col) ? o.col : BELCOLS[out.length % BELCOLS.length], tr: (Array.isArray(o.tr) ? o.tr : []).filter(t => T[t]).slice(0, 12), tithe: o.tithe != null ? clamp(+o.tithe || 0, 0, 0.3) : 0.05, seat: ecoStr(o.seat, 120), orgs: (Array.isArray(o.orgs) ? o.orgs : []).filter(x => typeof x === 'string').slice(0, 60) }); } return out; };
  const cells = (src, list) => { const a = new Array(N).fill(''); if (src && typeof src === 'object') for (const [id, l] of Object.entries(src)) { if (!list.some(x => x.id === id) || !Array.isArray(l)) continue; for (const i of l.slice(0, N)) if (Number.isInteger(i) && i >= 0 && i < N) a[i] = id; } return a; };
  ecoLoad = function (b) {
    ld(b); b = b || {};
    ECO.cul = clean(b.cul, CULT); ECO.rel = clean(b.rel, RELT); for (const c of ECO.cul) { delete c.tithe; delete c.seat; delete c.orgs; }
    ECO.culc = cells(b.culc, ECO.cul); ECO.relc = cells(b.relc, ECO.rel);
    for (const k of ['ccul', 'crel']) { ECO[k] = {}; for (const [id, v] of Object.entries(b[k] || {}).slice(0, 4000)) if (typeof v === 'string' && (v === '-' || belById(k === 'ccul' ? 'cul' : 'rel', v))) ECO[k][ecoStr(id, 120)] = v; }
    BEL.stamp++; BEL.city.clear(); belSheetKey = '';
  };
  const out = a => { const o = {}; a.forEach((id, i) => { if (id) (o[id] || (o[id] = [])).push(i); }); return o; };
  ecoSerial = function () {
    const o = sr();
    if (ECO.cul.length) { o.cul = JSON.parse(JSON.stringify(ECO.cul)); o.culc = out(ECO.culc); }
    if (ECO.rel.length) { o.rel = JSON.parse(JSON.stringify(ECO.rel)); o.relc = out(ECO.relc); }
    if (Object.keys(ECO.ccul).length) o.ccul = { ...ECO.ccul }; if (Object.keys(ECO.crel).length) o.crel = { ...ECO.crel };
    return o;
  };
}
{ const ap = applyOp; applyOp = function (op, dir, fx) { if (op.k !== 'bel') return ap(op, dir, fx); const a = belCells(op.t); for (const [i, x, y] of op.ch) a[i] = dir > 0 ? y : x; belChanged(false); }; }

// ---- on the map: the culture or the faith as a wash of colour, while its tab is open or its layer is on ----
const belShown = () => mode === 'econ' && (ecoTab === 'cul' || ecoTab === 'rel') ? ecoTab : mode === 'econ' && ecoTab === 'adm' ? '' : BEL.view === 'cul' || BEL.view === 'rel' ? BEL.view : '';
function belSheet(k) {
  const key = k + '|' + BEL.stamp + '|' + belList(k).map(x => x.col).join(''); if (key === belSheetKey && belCv) return belCv; belSheetKey = key;
  if (!belCv) { belCv = document.createElement('canvas'); belCv.width = Math.max(1, Math.ceil(G.w / 3)); belCv.height = Math.max(1, Math.ceil(G.h / 3)); }
  const c = belCv.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, belCv.width, belCv.height); c.setTransform(1 / 3, 0, 0, 1 / 3, 0, 0);
  const a = belCells(k);
  for (const o of belList(k)) { c.beginPath(); let any = false; for (let i = 0; i < N; i++) if (a[i] === o.id) { hexPath(c, i, 1.03); any = true; } if (any) { c.fillStyle = o.col; c.fill(); } }
  c.strokeStyle = 'rgba(20,20,24,.7)'; c.lineWidth = 1.2; c.beginPath();
  for (let i = 0; i < N; i++) { if (!a[i]) continue; for (let j = 0; j < 6; j++) { const v = NB[i * 6 + j]; if (v < 0 || a[v] === a[i] || (!a[v] && isW(eff(v)))) continue; const e = EDGE[j], t0 = e * Math.PI / 3, t1 = (e + 1) * Math.PI / 3; c.moveTo(CX[i] + R * Math.cos(t0), CY[i] + R * Math.sin(t0)); c.lineTo(CX[i] + R * Math.cos(t1), CY[i] + R * Math.sin(t1)); } }
  c.stroke(); return belCv;
}
{ const dg = drawOverGround; drawOverGround = function (c, w, h, live) { if (dg) dg(c, w, h, live); const k = live ? belShown() : ''; if (!k || !belList(k).length) return; const s = belSheet(k); c.save(); c.globalAlpha = 0.42; c.drawImage(s, 0, 0, s.width * 3, s.height * 3); c.restore(); }; }
{
  const top = drawOnTop; drawOnTop = function (c, px) {
    if (top) top(c, px); const k = belShown(); if (!k) return; const a = belCells(k);
    for (const o of belList(k)) { let sx = 0, sy = 0, n = 0; for (let i = 0; i < N; i++) if (a[i] === o.id) { sx += CX[i]; sy += CY[i]; n++; } if (n < 3) continue; c.font = `italic 600 ${13 * px}px serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 3 * px; c.strokeStyle = 'rgba(16,16,20,.8)'; c.strokeText(o.name, sx / n, sy / n); c.fillStyle = '#fff2d4'; c.fillText(o.name, sx / n, sy / n); }
  };
}
// the layer switch on the map: off, culture, faith
{
  const ctl = document.querySelector('#mapbox .ctl'), b = document.createElement('button'); b.type = 'button'; b.id = 'belBtn'; b.setAttribute('aria-pressed', 'false');
  const lbl = () => { b.textContent = BEL.view === 'cul' ? 'ชั้น: วัฒนธรรม' : BEL.view === 'rel' ? 'ชั้น: ศาสนา' : 'ชั้น: ปิด'; b.setAttribute('aria-pressed', String(!!BEL.view)); };
  b.title = 'แสดงวัฒนธรรมหรือศาสนาบนแผนที่'; lbl(); if (ctl) ctl.insertBefore(b, $('seasonBtn'));
  b.onclick = () => { BEL.view = BEL.view === '' ? 'cul' : BEL.view === 'cul' ? 'rel' : ''; lbl(); requestDraw(); };
}

// ---- painting, from the culture and faith tabs ----
let belAct = null;
function belPaintAt(e) {
  const [mx, my] = toMap(e.clientX, e.clientY), h = hexAt(mx, my); if (h < 0) return; const a = belCells(belAct.t), want = belAct.erase ? '' : BEL.pick;
  for (const i of brush(h, BEL.n)) { if (isW(eff(i)) && !belAct.erase) continue; if (a[i] === want) continue; const was = belAct.ch.has(i) ? belAct.ch.get(i)[0] : a[i]; belAct.ch.set(i, [was, want]); a[i] = want; }
  BEL.stamp++; belSheetKey = ''; requestDraw();
}
box.addEventListener('pointerdown', e => {
  if (mode !== 'econ' || (ecoTab !== 'cul' && ecoTab !== 'rel') || !editable || spaceDown || e.target !== cv || (e.button !== 0 && e.button !== 2) || (!BEL.pick && !BEL.erase && e.button !== 2)) return;
  e.stopPropagation(); e.preventDefault(); belAct = { t: ecoTab, ch: new Map(), erase: BEL.erase || e.button === 2 }; belPaintAt(e);
}, true);
box.addEventListener('contextmenu', e => { if (mode === 'econ' && (ecoTab === 'cul' || ecoTab === 'rel')) e.preventDefault(); });
__on(window, 'pointermove', e => { if (belAct) belPaintAt(e); });
__on(window, 'pointerup', () => { if (!belAct) return; const t = belAct.t, ch = [...belAct.ch].map(([i, [a, b]]) => [i, a, b]).filter(x => x[1] !== x[2]); belAct = null; if (ch.length) { pushOp({ k: 'bel', t, ch }); belChanged(false); } });

// ---- starting a map's belief: one culture per state, or spread from the great communities over the land ----
function belFromStates(k) {
  if (!ECO.states.length) { flash('ยังไม่มีรัฐ'); return; } const L = belList(k), a = belCells(k), ch = [];
  for (const s of ECO.states) { if (s.sys === 'anar') continue; const id = belNewId(k); L.push({ id, name: (k === 'cul' ? 'ชาว' : 'ศาสนาของ') + s.name, col: s.color, tr: [], tithe: 0.05, seat: '', orgs: [] }); for (let i = 0; i < N; i++) if (ECO.cells[i] === s.id && !isW(eff(i)) && a[i] !== id) { ch.push([i, a[i], id]); a[i] = id; } }
  if (k === 'cul') for (const o of L) { delete o.tithe; delete o.seat; delete o.orgs; }
  if (ch.length) pushOp({ k: 'bel', t: k, ch }); belChanged(true);
}
function belSpread(k, n) {
  const cs = (ECON ? ECON.cities.slice() : []).sort((a, b) => b.pop - a.pop), seeds = [], minD = Math.sqrt(G.w * G.h / Math.max(1, n)) * 0.45;
  for (const c of cs) { if (seeds.length >= n) break; if (seeds.some(s => Math.hypot(s.x - c.x, s.y - c.y) < minD)) continue; seeds.push(c); }
  if (!seeds.length) { flash('ยังไม่มีชุมชนให้เริ่มกระจาย'); return; }
  const L = belList(k), a = belCells(k), ids = seeds.map((c, j) => { const id = belNewId(k); L.push({ id, name: k === 'cul' ? 'ชาว' + (c.name || 'ไม่มีชื่อ') : 'ศาสนาแห่ง' + (c.name || 'ไม่มีชื่อ'), col: BELCOLS[(L.length) % BELCOLS.length], tr: [], tithe: 0.05, seat: k === 'rel' ? c.id : '', orgs: [] }); return id; });
  if (k === 'cul') for (const o of L) { delete o.tithe; delete o.seat; delete o.orgs; }
  // spread over the land, the cheapest way: mountains and open water hold a people back
  const cost = i => { const b = eff(i); return isSea(b) ? 12 : b === 'L' ? 4 : b === 'M' ? 5 : b === 'n' ? 4 : 'fokjaw'.includes(b) ? 1.6 : b === 'd' ? 1.8 : 1; };
  const T = new Float64Array(N).fill(Infinity), own = new Int32Array(N).fill(-1), H = [];
  const push = x => { H.push(x); let q = H.length - 1; while (q) { const p = (q - 1) >> 1; if (H[p][0] <= H[q][0]) break; [H[p], H[q]] = [H[q], H[p]]; q = p; } };
  const pop = () => { const t = H[0], l = H.pop(); if (H.length) { H[0] = l; let q = 0; for (;;) { const x = 2 * q + 1, y = x + 1; let m = q; if (x < H.length && H[x][0] < H[m][0]) m = x; if (y < H.length && H[y][0] < H[m][0]) m = y; if (m === q) break; [H[m], H[q]] = [H[q], H[m]]; q = m; } } return t; };
  seeds.forEach((c, j) => { const h = c.h != null ? c.h : hexAt(c.x, c.y); if (h >= 0) { T[h] = 0; own[h] = j; push([0, h]); } });
  while (H.length) { const [t, i] = pop(); if (t > T[i]) continue; for (let d = 0; d < 6; d++) { const v = NB[i * 6 + d]; if (v < 0) continue; const nt = t + cost(v); if (nt < T[v]) { T[v] = nt; own[v] = own[i]; push([nt, v]); } } }
  const ch = []; for (let i = 0; i < N; i++) { if (isW(eff(i)) || own[i] < 0) continue; const id = ids[own[i]]; if (a[i] !== id) { ch.push([i, a[i], id]); a[i] = id; } }
  if (ch.length) pushOp({ k: 'bel', t: k, ch }); belChanged(true);
}
function belNewId(k) { let id; do { id = k[0] + Math.random().toString(36).slice(2, 8); } while (belById(k, id)); return id; }

// ---- the tabs ----
{
  const row = $('ecoTab'); if (row && !row.querySelector('[data-t="cul"]')) { const at = row.querySelector('[data-t="orgs"]'); for (const [t, n] of [['cul', 'วัฒนธรรม'], ['rel', 'ศาสนา']]) { const b = document.createElement('button'); b.type = 'button'; b.dataset.t = t; b.textContent = n; row.insertBefore(b, at); } }
  const er = ecoRender; ecoRender = function () {
    if (ecoTab !== 'cul' && ecoTab !== 'rel') return er();
    const keep = ecoTab; ecoTab = 'tune'; er(); ecoTab = keep; if ($('ecocard').hidden) return;
    segPick('ecoTab', 't', ecoTab, t => { ecoTab = t; ecoRender(); requestDraw(); if (window.MME && MME.shell && MME.shell.reveal) MME.shell.reveal('ecocard'); });
    $('ecoHead').textContent = ecoTab === 'cul' ? 'วัฒนธรรม' : 'ศาสนา';
    $('ecoHint').textContent = editable ? `เลือก${belName[ecoTab]}ในแผงข้างแล้วลากบนแผนที่เพื่อระบาย คลิกขวาค้างเพื่อลบ ชุมชนรับ${belName[ecoTab]}ของช่องที่ตั้ง เว้นแต่ตั้งเองในฟอร์มของชุมชน` : '';
    $('ecobody').innerHTML = belHTML(ecoTab);
  };
}
function belHTML(k) {
  const L = belList(k), a = belCells(k), T = belTraits(k), dis = editable ? '' : ' disabled', n = {}; for (const id of a) if (id) n[id] = (n[id] || 0) + 1;
  const cs = ECON ? ECON.cities : [], cn = {}; for (const c of cs) { const b = belCity(c.id)[k]; if (b) cn[b.id] = (cn[b.id] || 0) + 1; }
  let h = `<div class="btns" style="margin:0 0 6px"><button type="button" class="btn" data-bl="new"${dis}>เพิ่ม${belName[k]}</button><button type="button" class="btn" data-bl="states"${dis}>สร้างหนึ่ง${belName[k]}ต่อรัฐ</button><button type="button" class="btn" data-bl="spread"${dis}>กระจายจากชุมชนใหญ่</button><label>จำนวน <select id="belSeeds"${dis}>${[2, 3, 4, 6, 8, 12].map(x => `<option${x === (k === 'cul' ? 6 : 3) ? ' selected' : ''}>${x}</option>`).join('')}</select></label></div>`
    + `<div class="erow"><span class="lbl">แปรง</span><div class="seg" id="belBrush">${[[1, '1 ช่อง'], [2, '7 ช่อง'], [3, '19 ช่อง'], [4, '37 ช่อง']].map(([v, t]) => `<button type="button" data-n="${v}" aria-pressed="${BEL.n === v}">${t}</button>`).join('')}</div><label><input type="checkbox" id="belErase"${BEL.erase ? ' checked' : ''}${dis}> ลบออก</label></div>`;
  for (const o of L) {
    const on = BEL.pick === o.id && ecoTab === k, R = k === 'rel' ? BEL.tithe && BEL.tithe[o.id] : null;
    h += `<details class="efold scard" data-bid="${o.id}"${on ? ' open' : ''}><summary><i class="sdot" style="background:${o.col}"></i>${esc(o.name)} <small>${n[o.id] || 0} ช่อง · ${cn[o.id] || 0} ชุมชน</small></summary><div class="eform">`
      + `<div class="btns"><button type="button" class="btn${on ? ' on' : ''}" data-bl="pick"${dis}>${on ? 'กำลังระบาย' : 'ระบาย' + belName[k] + 'นี้'}</button><button type="button" class="btn" data-note="${k === 'cul' ? 'u' : 'r'}:${o.id}" data-nt="${esc(o.name)}">${noteOf((k === 'cul' ? 'u:' : 'r:') + o.id) ? 'ข้อมูล' : 'เขียนข้อมูล'}</button></div>`
      + `<div class="erow"><input type="color" data-bf="col" value="${o.col}"${dis}><input type="text" data-bf="name" maxlength="60" value="${esc(o.name)}" style="flex:1"${dis}></div>`
      + `<div class="polset">${Object.entries(T).map(([t, z]) => `<label title="${esc(z.why)}"><input type="checkbox" data-bt="${t}"${o.tr.includes(t) ? ' checked' : ''}${dis}> ${esc(z.name)}</label>`).join('')}</div>`
      + `<div class="tr w">${o.tr.map(t => T[t].name + ': ' + T[t].why).join(' · ') || 'ยังไม่มีคุณลักษณะ ชี้ที่ชื่อคุณลักษณะเพื่อดูผล'}</div>`;
    if (k === 'rel') {
      const believers = cs.filter(c => belCity(c.id).rel === o), faith = ECO.orgs.filter(x => x.kind === 'faith');
      h += `<div class="erow"><label>ทศางค์ <input type="number" data-bf="tithe" min="0" max="30" step="1" value="${Math.round((o.tithe || 0) * 100)}" style="width:4.5em"${dis}> % ของรายได้</label>`
        + `<label>ศูนย์กลาง <select data-bf="seat"${dis}><option value="">เลือกเอง (ชุมชนใหญ่สุด)</option>${believers.map(c => `<option value="${esc(c.id)}"${c.id === o.seat ? ' selected' : ''}>${esc(c.name || 'ไม่มีชื่อ')}</option>`).join('')}</select></label></div>`
        + (R ? `<div class="tr w">ปีนี้ทศางค์รวม ${socN(R.pool)} ${esc(ECO.central.name)} ไปที่${esc((cs.find(c => c.id === R.seat) || {}).name || 'ศูนย์กลาง')}</div>` : '')
        + (faith.length ? `<div class="tr"><b>องค์กรศาสนาของ${esc(o.name)}</b> <span class="w">บ้านขององค์กรในชุมชนที่นับถือศาสนานี้นับความศักดิ์สิทธิ์เต็ม ที่อื่นนับครึ่ง</span></div><div class="polset">${faith.map(f => `<label><input type="checkbox" data-bo="${esc(f.id)}"${(o.orgs || []).includes(f.id) ? ' checked' : ''}${dis}> ${esc(f.name)}</label>`).join('')}</div>` : `<div class="tr w">ยังไม่มีองค์กรศาสนา เพิ่มได้ในแท็บองค์กร</div>`);
    }
    h += `<div class="btns"><button type="button" class="btn warn" data-bl="del"${dis}>ลบ${belName[k]}นี้</button></div></div></details>`;
  }
  if (!L.length) h += `<p class="note">ยังไม่มี${belName[k]} กดเพิ่ม หรือให้สร้างจากรัฐหรือกระจายจากชุมชนใหญ่</p>`;
  return h + `<p class="note">${k === 'cul' ? 'วัฒนธรรมที่ต่างกันทำให้ค่าขนระหว่างสองชุมชนแพงขึ้นร้อยละ ' + ecoPc(TU('culFar')) : 'ศาสนาที่ต่างกันทำให้ค่าขนระหว่างสองชุมชนแพงขึ้นร้อยละ ' + ecoPc(TU('relFar')) + ' ผู้แสวงบุญไปศาสนสถานของศาสนาอื่นน้อยลงเหลือร้อยละ ' + ecoPc(TU('relPilgOther'))} ตัวเลขเหล่านี้แก้ได้ในแท็บตัวเลข</p>`;
}
$('ecobody').addEventListener('click', e => {
  if (ecoTab !== 'cul' && ecoTab !== 'rel') return; const k = ecoTab;
  const nb = e.target.closest ? e.target.closest('#belBrush button') : null; if (nb) { BEL.n = +nb.dataset.n; ecoRender(); return; }
  const b = e.target.closest ? e.target.closest('[data-bl]') : null; if (!b || !editable) return; const a = b.dataset.bl, d = b.closest('[data-bid]'), o = d ? belById(k, d.dataset.bid) : null;
  if (a === 'new') { const id = belNewId(k), L = belList(k); L.push(k === 'cul' ? { id, name: 'วัฒนธรรมใหม่', col: BELCOLS[L.length % BELCOLS.length], tr: [] } : { id, name: 'ศาสนาใหม่', col: BELCOLS[(L.length + 5) % BELCOLS.length], tr: [], tithe: 0.05, seat: '', orgs: [] }); BEL.pick = id; BEL.erase = false; belChanged(true); }
  else if (a === 'states') belFromStates(k);
  else if (a === 'spread') belSpread(k, +$('belSeeds').value || 4);
  else if (a === 'pick' && o) { BEL.pick = BEL.pick === o.id ? null : o.id; BEL.erase = false; ecoRender(); }
  else if (a === 'del' && o) { const cells = belCells(k), ch = []; cells.forEach((id, i) => { if (id === o.id) ch.push([i, id, '']); }); for (const [i] of ch) cells[i] = ''; const L = belList(k); L.splice(L.indexOf(o), 1); if (BEL.pick === o.id) BEL.pick = null; if (ch.length) pushOp({ k: 'bel', t: k, ch }); belChanged(true); }
});
$('ecobody').addEventListener('change', e => {
  if ((ecoTab !== 'cul' && ecoTab !== 'rel') || !editable) return; const k = ecoTab, el = e.target;
  if (el.id === 'belErase') { BEL.erase = el.checked; return; }
  const d = el.closest('[data-bid]'), o = d ? belById(k, d.dataset.bid) : null; if (!o) return;
  if (el.dataset.bf === 'name') o.name = el.value.trim().slice(0, 60) || o.name;
  else if (el.dataset.bf === 'col') { if (HEXC.test(el.value)) o.col = el.value; }
  else if (el.dataset.bf === 'tithe') o.tithe = clamp((+el.value || 0) / 100, 0, 0.3);
  else if (el.dataset.bf === 'seat') o.seat = el.value;
  else if (el.dataset.bt) { const s = new Set(o.tr); if (el.checked) s.add(el.dataset.bt); else s.delete(el.dataset.bt); o.tr = Object.keys(belTraits(k)).filter(t => s.has(t)); }
  else if (el.dataset.bo) { const s = new Set(o.orgs || []); if (el.checked) { for (const R of ECO.rel) if (R !== o) R.orgs = (R.orgs || []).filter(x => x !== el.dataset.bo); s.add(el.dataset.bo); } else s.delete(el.dataset.bo); o.orgs = [...s]; }
  else return;
  belChanged(true);
});

// ---- a community's own culture and faith, in its form ----
{
  const anchor = $('cfTraits'); if (anchor && !$('cfBel')) { const d = document.createElement('div'); d.className = 'optrow'; d.id = 'cfBel'; anchor.insertAdjacentElement('beforebegin', d); }
  const fill = () => {
    const box = $('cfBel'); if (!box) return; const v = sel ? visibleCities().find(c => c.id === sel) : null; if (!v || (!ECO.cul.length && !ECO.rel.length)) { box.hidden = true; return; } box.hidden = false;
    const h = hexAt(v.x, v.y), dis = editable ? '' : ' disabled';
    const one = k => { const L = belList(k); if (!L.length) return ''; const land = h >= 0 ? belById(k, belCells(k)[h]) : null, cur = belOver(k)[sel] || '';
      return `<label>${belName[k]} <select data-cb="${k}"${dis}><option value="">ตามพื้นที่${land ? ' (' + esc(land.name) + ')' : ' (ไม่มี)'}</option><option value="-"${cur === '-' ? ' selected' : ''}>ไม่มี</option>${L.map(o => `<option value="${o.id}"${o.id === cur ? ' selected' : ''}>${esc(o.name)}</option>`).join('')}</select></label>`; };
    box.innerHTML = one('cul') + one('rel');
  };
  const rf = refreshForm; refreshForm = function () { rf(); fill(); };
  __on(document, 'change', e => { const el = e.target; if (!el.dataset || !el.dataset.cb || !sel || !editable) return; const o = belOver(el.dataset.cb); if (el.value) o[sel] = el.value; else delete o[sel]; belChanged(false); comForm(); });
}
// the peek says it too
{ const px = peekCityExtra; peekCityExtra = (c, E) => { const b = belCity(c.id); return px(c, E) + (b.cul || b.rel ? `<div class="m">${[b.cul && b.cul.name, b.rel && b.rel.name].filter(Boolean).map(esc).join(' · ')}</div>` : ''); }; }
