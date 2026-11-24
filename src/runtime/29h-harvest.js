// ---------- the yield of a hex and the hands that work it (v0.15.0) ----------
// The owner asked for a city's people to raise or lower what each hex of its land yields: 100% at the start, 10% at the least,
// 300% at the most, counted from the hands that work the land, class by class. Measured the way the owner chose from what Claude
// set out: the hands on the land over the hexes the city harvests, against a reference density that is fixed (a city does not
// change because a village was set down across the map), in heads of the model (so a level of people on the map does not starve
// one map and glut another), and turned into a yield by a power under one: more hands bring more from a hex and less a head.
// Who works the land: the share of each class that lives off it, read from where its money comes from, as the classes are
// measured (the small holders of the middle, the hands in the fields of the lower class, a few of the poorest at harvest, and
// the slaves at the share of the city's money the land makes, a slave in the fields counting for more than a free hand). The
// classes come out of the year's trade, so the year is worked out once with the classes guessed before trade, and again with
// the classes the first working found, whenever they move a city's yield by more than two in a hundred; a state's tools and its
// coin go into the same second working. All numbers Claude's, in the numbers tab.
Object.assign(ETUNE, {
  effRef: [0.065, 0.001, 10, 0.001, 'ความแน่นอ้างอิงของแรงงานบนที่ดิน เป็นหัวต่อช่อง (หัวคือหน่วยประชากรของแบบจำลอง) เมืองที่แน่นเท่านี้เก็บเกี่ยวได้ 100% ต่อช่อง', 'การเก็บเกี่ยวต่อช่อง'],
  effMin: [0.1, 0.01, 1, 0.01, 'ประสิทธิภาพการเก็บเกี่ยวต่อช่องต่ำสุด', 'การเก็บเกี่ยวต่อช่อง'],
  effMax: [3, 1, 10, 0.05, 'ประสิทธิภาพการเก็บเกี่ยวต่อช่องสูงสุด', 'การเก็บเกี่ยวต่อช่อง'],
  effGrain: [0.5, -1, 1.5, 0.05, 'ธัญพืชและพืชผล: ประสิทธิภาพ = (ความแน่น ÷ ค่าอ้างอิง) ยกกำลังเท่านี้ 0 คือคนไม่มีผล', 'การเก็บเกี่ยวต่อช่อง'],
  effHerd: [0.35, -1, 1.5, 0.05, 'เนื้อ ปลา นม และไข่ (ทุ่งหญ้าจำกัดมากกว่าแรงงาน)', 'การเก็บเกี่ยวต่อช่อง'],
  effFibre: [0.45, -1, 1.5, 0.05, 'เส้นใย หนัง และเชือก', 'การเก็บเกี่ยวต่อช่อง'],
  effDig: [0.6, -1, 1.5, 0.05, 'ไม้ เชื้อเพลิง หิน แร่ เกลือ และโลหะมีค่า (งานที่ขึ้นกับมือคน)', 'การเก็บเกี่ยวต่อช่อง'],
  effHerb: [0.2, -1, 1.5, 0.05, 'เห็ด สมุนไพร และเครื่องเทศ (ปลูกได้บ้าง เก็บจากป่าบ้าง)', 'การเก็บเกี่ยวต่อช่อง'],
  effWild: [-0.3, -1, 1.5, 0.05, 'ของหายากจากป่า: ค่าติดลบคือยิ่งคนแน่นยิ่งถูกล่าและเก็บจนร่อยหรอ', 'การเก็บเกี่ยวต่อช่อง'],
  effPoor: [0.15, 0, 1, 0.01, 'ส่วนของคนล่างสุดที่รับจ้างในไร่ตามฤดู', 'การเก็บเกี่ยวต่อช่อง'],
  effSlave: [1.5, 0, 3, 0.05, 'ทาสในไร่นับเป็นแรงงานกี่เท่าของคนอิสระ (ไร่แบบอาณานิคมใช้แรงทาสเข้มกว่า)', 'การเก็บเกี่ยวต่อช่อง'],
});
const HARV_POW = { grain: 'effGrain', protein: 'effHerd', cloth: 'effFibre', timber: 'effDig', fuel: 'effDig', stone: 'effDig', ore: 'effDig', salt: 'effDig', rare: 'effDig', herbs: 'effHerb', luxury: 'effWild' };   // mana: the hands do not matter
const HARV_SHOW = [['grain', 'ธัญพืช'], ['protein', 'เนื้อ'], ['timber', 'ไม้และแร่'], ['luxury', 'ของป่า']];
let HARVL = null;                                    // the hands counted by class in the first working, used in the second
const harvE = (d, cat) => { const p = HARV_POW[cat] ? TU(HARV_POW[cat]) : 0; return p ? clamp(Math.pow(Math.max(1e-9, d), p), TU('effMin'), Math.max(TU('effMin'), TU('effMax'))) : 1; };
function harvEst(c, rent, made) {                    // before trade: the classes as the city's kind, system and work order make them, and their money from the ground
  const H = classHeads(c, 1, 0, 1), sp = classSplit(c, { rent, made, comm: 0.03 * (rent + made), slave: 0, surplus: 0 }), pp = TU('effPoor');
  const parts = { mid: c.pop * H.mid * sp.land.mid, low: c.pop * H.low * sp.land.low, poor: c.pop * H.poor * pp, slave: 0 };
  return { units: parts.mid + parts.low + parts.poor, parts };
}
function harvApply(cities, prod, own, dist) {         // the hands spread over the city's home ground: the hexes it harvests within the reach of its kind of city, so the
  const n = cities.length, cnt = new Int32Array(n), ref = TU('effRef');   // measure holds whatever the level of people (fields laid out farther for a populous level feed their own share, v0.14.2)
  for (let i = 0; i < N; i++) { const k = own[i]; if (k >= 0 && k < n && dist[i] <= EREACH[cities[k].ki]) cnt[k]++; }
  cities.forEach((c, k) => {
    const P = prod[k], hexes = Math.max(1, cnt[k]), made = c.pop * EIND[c.ki] * 0.5 * (c.work || 1);
    let rent0 = 0; for (const [id, v] of P) { const cat = catOf(id); if (ECAT[cat]) rent0 += v * ECAT[cat].v; }
    const got = HARVL ? HARVL.get(c.id) : null; let L = 0, parts = null;
    if (got) { L = got.units; parts = got.parts; }
    else { let e = 1; for (let it = 0; it < 3; it++) { const r = harvEst(c, rent0 * e, made); L = r.units; parts = r.parts; e = harvE(L / hexes / ref, 'grain'); } }   // the ground's money rises with the yield it counts: three rounds settle it
    const d = L / hexes / ref, eff = {}; for (const cat of ERAW) eff[cat] = harvE(d, cat);
    c.harv = { L, parts, hexes, d, eff, est: !got };
    for (const [id, v] of P) { const f = eff[catOf(id)]; if (f != null && f !== 1) P.set(id, v * f); }
  });
}
function harvCount(E) {                               // after the year: the hands on the land, class by class, as the classes came out
  const rows = ecoIncome(ecoGdp()), unit = ECO.unit, pp = TU('effPoor'), sl = TU('effSlave'), out = new Map(); if (!(unit > 0)) return;
  rows.forEach(r => {
    if (!r.cls || !r.clsLand) return; const C = r.cls, Ld = r.clsLand;
    const parts = { mid: C.mid.n * Ld.mid / unit, low: C.low.n * Ld.low / unit, poor: C.poor.n * pp / unit, slave: (C.slave ? C.slave.n : 0) * (r.rentSh == null ? 1 : r.rentSh) * sl / unit };
    out.set(r.c.id, { units: parts.mid + parts.low + parts.poor + parts.slave, parts });
  });
  E.harvN = out;
}
function harvMoved(E) {                               // whether the counted hands move any city's yield of grain by more than two in a hundred
  if (!E || !E.harvN) return false; const ref = TU('effRef');
  for (const c of E.cities) { const h = c.harv, x = E.harvN.get(c.id); if (!h || !x) continue; if (Math.abs(harvE(x.units / h.hexes / ref, 'grain') - h.eff.grain) > 0.02) return true; }
  return false;
}
function harvSettle(E) {                             // no second working was needed: the counted hands are within two in a hundred of the guess, so the card shows them
  if (!E || !E.harvN) return; const ref = TU('effRef');
  for (const c of E.cities) { const h = c.harv, x = E.harvN.get(c.id); if (!h || !x) continue; h.L = x.units; h.parts = x.parts; h.d = x.units / h.hexes / ref; h.est = false; }
}
{ const sy = socYear; socYear = function (E) { const r = sy(E); harvCount(E); return r; }; }

// ---- on the screen ----
const harvPc = x => Math.round(100 * x) + '%';
function harvWho(h) {                                // the hands on the land in people, class by class
  const u = ECO.unit, p = h.parts || {}, L = [];
  if (p.mid >= 1e-9) L.push(`เจ้าของที่ดินรายย่อย ${socN(p.mid * u)}`); if (p.low >= 1e-9) L.push(`ชนชั้นล่างในไร่ ${socN(p.low * u)}`);
  if (p.poor >= 1e-9) L.push(`ล่างสุดรับจ้างตามฤดู ${socN(p.poor * u)}`); if (p.slave >= 1e-9) L.push(`ทาส ${socN(p.slave * u / Math.max(1e-9, TU('effSlave')))} คน นับเป็น ${socN(p.slave * u)}`);
  return L.join(' · ');
}
function harvLine(c) {
  const h = c.harv; if (!h) return '';
  return `<div class="tr">เก็บเกี่ยวต่อช่อง <b>${harvPc(h.eff.grain)}</b> <span class="w">แรงงานบนที่ดิน ${socN(h.L * ECO.unit)} คน บน ${h.hexes} ช่อง แน่นเป็น ${h.d >= 10 ? Math.round(h.d) : h.d.toFixed(2)} เท่าของค่าอ้างอิง · ${HARV_SHOW.map(([cat, t]) => `${t} ${harvPc(h.eff[cat])}`).join(' · ')}${h.est ? ' · ประมาณจากชนชั้นก่อนการค้า' : ''}</span></div>`
    + (h.parts ? `<div class="tr w">ใครทำกินบนที่ดิน: ${harvWho(h) || 'ไม่มี'}</div>` : '');
}
{
  const sc = socCityHTML; socCityHTML = function (k) {
    const h = sc(k), c = ECON && ECON.cities[k]; if (!c || !c.harv) return h; const add = harvLine(c), at = h.indexOf('<div class="optrow"><span class="lbl">ระเบียบงาน');
    return at >= 0 ? h.slice(0, at) + add + h.slice(at) : h + add;
  };
}
function harvGdpHTML() {
  if (!ECON) return ''; const cs = ECON.cities.filter(c => c.harv); if (!cs.length) return '';
  const SK = { name: ['เมือง', c => c.name], L: ['บนที่ดิน', c => c.harv.L], hexes: ['ช่อง', c => c.harv.hexes], d: ['ความแน่น', c => c.harv.d], grain: ['ธัญพืช', c => c.harv.eff.grain], protein: ['เนื้อ', c => c.harv.eff.protein], timber: ['ไม้และแร่', c => c.harv.eff.timber] };
  const sk = SK[GDPV.hk] ? GDPV.hk : 'grain', dir = GDPV.hd > 0 ? 1 : -1, arrow = k => k === sk ? (dir > 0 ? ' ▲' : ' ▼') : '';
  const list = cs.slice().sort((a, b) => sk === 'name' ? dir * a.name.localeCompare(b.name, 'th') : dir * (SK[sk][1](a) - SK[sk][1](b)) || a.name.localeCompare(b.name, 'th'));
  const g = cs.map(c => c.harv.eff.grain).sort((a, b) => a - b), med = g[g.length >> 1], top = g.filter(x => x >= TU('effMax') - 1e-6).length, bot = g.filter(x => x <= TU('effMin') + 1e-6).length;
  const est = cs.some(c => c.harv.est);
  return `<details class="efold" data-fold="ghv"${GDPV.ghv ? ' open' : ''}><summary>การเก็บเกี่ยวต่อช่อง <small>${cs.length} แถว</small></summary>`
    + `<div class="tr">ธัญพืชต่อช่อง ค่ากลาง <b>${harvPc(med)}</b> · ชนเพดาน ${harvPc(TU('effMax'))} <b>${top}</b> เมือง · ชนพื้น ${harvPc(TU('effMin'))} <b>${bot}</b> เมือง</div>`
    + `<div class="etable g5 g7"><div class="eth sortable">${Object.entries(SK).map(([k, v]) => `<span data-a="hsort" data-k="${k}" title="กดเพื่อเรียงตามช่องนี้">${v[0]}${arrow(k)}</span>`).join('')}</div>`
    + list.map(c => { const s = c.sto; return `<div class="etr"><span>${s ? `<i class="sdot" style="background:${s.color}"></i>` : ''}${esc(c.name)}</span><span>${socN(c.harv.L * ECO.unit)}</span><span>${c.harv.hexes}</span><span>${c.harv.d >= 10 ? Math.round(c.harv.d) : c.harv.d.toFixed(2)}×</span><span>${harvPc(c.harv.eff.grain)}</span><span>${harvPc(c.harv.eff.protein)}</span><span>${harvPc(c.harv.eff.timber)}</span></div>`; }).join('') + `</div>`
    + `<p class="note">ผลผลิตของแต่ละช่องขึ้นกับจำนวนคนที่ทำกินบนที่ดินต่อช่องที่เมืองเก็บเกี่ยว เทียบกับความแน่นอ้างอิง แล้วยกกำลังตามชนิดของ คนยิ่งแน่นยิ่งได้ต่อช่องมากขึ้นแต่ได้ต่อหัวน้อยลง ของป่ากลับลดลงเมื่อคนแน่น คนที่ทำกินบนที่ดินนับจากชนชั้น: ส่วนของชนชั้นกลางและชนชั้นล่างที่รายได้มาจากที่ดิน คนล่างสุดที่รับจ้างตามฤดู และทาสตามส่วนรายได้ของเมืองที่มาจากที่ดิน${est ? ' เมืองที่ยังไม่ได้คิดรอบที่สองใช้ชนชั้นที่ประมาณก่อนการค้า' : ''} ไร่ที่แผนที่วางให้ยังเลี้ยงคนส่วนที่วางไว้ให้เหมือนเดิม ตัวเลขทั้งหมดอยู่ในแท็บตัวเลข หมวดการเก็บเกี่ยวต่อช่อง</p></details>`;
}
{ const g = ecoGdpHTML; ecoGdpHTML = function () { return g() + harvGdpHTML(); }; }
$('ecobody').addEventListener('click', e => {
  const el = e.target.closest ? e.target.closest('[data-a="hsort"]') : null; if (!el) return; const k = el.dataset.k;
  if (GDPV.hk === k) GDPV.hd = GDPV.hd > 0 ? -1 : 1; else { GDPV.hk = k; GDPV.hd = k === 'name' ? 1 : -1; } gdpKeep(); ecoRender();
});
