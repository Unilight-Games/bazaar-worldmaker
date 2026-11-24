// ---------- society (v0.13.0, the owner's twelve) ----------
// What this part adds to the year, each from a line of the owner's:
//   - People move. A city's people are those who were born to it and stay, those who came, and those who left, and beside them
//     the visitors who pass through. How settled a city's people are, how readily they move and how much the place charms a
//     visitor are three numbers each city is given by lot when it is made (the owner changes them, or draws again).
//   - Movement follows well-being and income: people leave where life is poorer than their state's average and settle where it
//     is better. A state chooses how its incomers spread: by the pull of each city, into a few great ones, evenly, or with the
//     seasons, out of the hard winters and back.
//   - Visitors go by four things the owner chose together: what there is to see near a city, how much trade passes through it,
//     how rich and well it lives, and the houses of organisations in it. Rich cities send more of them, far cities draw fewer.
//   - A city of many people has cheap hands: its workshops turn out more, and caravans to and from it cost less.
//   - Each city's workshops run under one of four orders of work, the owner's choice of four.
//   - A state that buys far more than it sells, measured against what it makes, lives worse for it. A greater state leans on
//     the smaller ones beside it and pays them less. And a state in deficit does something about it, with the tools its
//     system favours, the first of them first: a wall of duties, a bounty on exports, a cheaper coin, making at home what it
//     buys abroad, a tighter belt, drawing visitors. Organisations are left to the owner, as a last resort the card points to.
// Every number here is mine unless the owner gave it, and each sits in the numbers tab.
Object.assign(ETUNE, {
  labRef: [10000, 100, 1e7, 100, 'จำนวนคนของเมืองที่ค่าแรงเป็นค่ากลาง เมืองที่คนมากกว่านี้ค่าแรงถูกลง เมืองที่คนน้อยกว่านี้ค่าแรงแพงขึ้นเล็กน้อย', 'ประชากรและแรงงาน'],
  labCheap: [0.3, 0, 0.8, 0.01, 'ค่าแรงถูกลงได้มากสุดเป็นส่วนเท่านี้ เมื่อเมืองมีคนเป็นพันเท่าของค่ากลาง', 'ประชากรและแรงงาน'],
  labMake: [0.5, 0, 2, 0.05, 'โรงงานผลิตเพิ่มเป็นกี่เท่าของส่วนที่ค่าแรงถูกลง', 'ประชากรและแรงงาน'],
  labHaul: [1, 0, 2, 0.05, 'ค่าคาราวานของเส้นที่ต่อกับเมืองถูกลงเป็นกี่เท่าของส่วนที่ค่าแรงถูกลง นับเฉพาะช่วงทางบก', 'ประชากรและแรงงาน'],
  landFood: [1, 0, 1, 0.05, 'เมื่อที่ดินไม่พอ เมืองผลิตอาหารขาดไปเป็นส่วนเท่านี้ของส่วนที่ดินที่ขาด (1 คือขาดที่ดินเท่าไรก็ผลิตอาหารขาดเท่านั้น ส่วนที่ขาดต้องซื้อเข้า)', 'ประชากรและแรงงาน'],
  regHomeOut: [0.85, 0.3, 1.5, 0.01, 'งานช่างตามบ้าน: ผลผลิตโรงงานเทียบกับโรงงานกะเดียว', 'ระเบียบงาน'],
  regHomeVal: [0.08, 0, 1, 0.01, 'งานช่างตามบ้าน: มูลค่าสินค้าโรงงานที่เพิ่มขึ้น', 'ระเบียบงาน'],
  regSweatOut: [1.25, 0.5, 2.5, 0.01, 'โรงงานเร่งผลิต: ผลผลิตโรงงานเทียบกับโรงงานกะเดียว', 'ระเบียบงาน'],
  regSweatWell: [10, 0, 50, 1, 'โรงงานเร่งผลิต: ความเป็นอยู่ที่ลดลง (แต้มจาก 100)', 'ระเบียบงาน'],
  regCareOut: [1.12, 0.5, 2.5, 0.01, 'โรงงานสองกะมีสวัสดิการ: ผลผลิตโรงงานเทียบกับโรงงานกะเดียว', 'ระเบียบงาน'],
  regCareCost: [0.1, 0, 0.8, 0.01, 'โรงงานสองกะมีสวัสดิการ: ต้นทุนค่าแรงที่เพิ่ม เป็นส่วนของมูลค่าสินค้าโรงงานที่หักจากรายได้ของเมือง', 'ระเบียบงาน'],
  regWell: [5, 0, 50, 1, 'งานช่างตามบ้านและโรงงานมีสวัสดิการ: ความเป็นอยู่ที่เพิ่มขึ้น (แต้มจาก 100)', 'ระเบียบงาน'],
  migMove: [0.5, 0, 1, 0.05, 'ส่วนของคนที่พร้อมย้ายซึ่งย้ายออกจริงในเมืองที่แย่ที่สุดของรัฐ', 'ย้ายถิ่นและท่องเที่ยว'],
  migWorld: [0.2, 0, 1, 0.05, 'ส่วนของคนย้ายออกที่ไปตั้งถิ่นนอกรัฐของตัวเอง', 'ย้ายถิ่นและท่องเที่ยว'],
  seasSpan: [20, 2, 80, 1, 'ย้ายถิ่นตามฤดู: เมืองที่หน้าหนาวเย็นกว่าเมืองที่อุ่นที่สุดของรัฐเท่านี้องศา คนที่พร้อมย้ายครึ่งหนึ่งออกไปอยู่เมืองที่อุ่นกว่าครึ่งปี', 'ย้ายถิ่นและท่องเที่ยว'],
  tourRate: [0.02, 0, 1, 0.005, 'จำนวนครั้งที่คนหนึ่งคนออกไปเที่ยวเมืองอื่นต่อปี ในเมืองที่รายได้และความเป็นอยู่เท่าค่าเฉลี่ย', 'ย้ายถิ่นและท่องเที่ยว'],
  tourSpend: [0.03, 0, 1, 0.005, 'เงินที่นักท่องเที่ยวหนึ่งคนใช้ในเมืองที่ไปเที่ยว เป็นส่วนของรายได้ต่อหัวเฉลี่ยของแผนที่', 'ย้ายถิ่นและท่องเที่ยว'],
  tourFar: [1, 0.1, 10, 0.1, 'ระยะที่แรงดึงดูดนักท่องเที่ยวลดลงราวสองในสาม เป็นกี่เท่าของการเดินทางยาวปานกลางของแผนที่', 'ย้ายถิ่นและท่องเที่ยว'],
  defFree: [0.05, 0, 1, 0.01, 'ขาดดุลได้เท่านี้ของ GDP ของรัฐโดยความเป็นอยู่ไม่ลด', 'ดุลการค้าของรัฐ'],
  defWell: [100, 0, 500, 5, 'ความเป็นอยู่ลดกี่แต้ม ต่อการขาดดุลเต็ม GDP ที่เกินจากส่วนที่ขาดได้', 'ดุลการค้าของรัฐ'],
  defMax: [30, 0, 100, 1, 'ความเป็นอยู่ลดเพราะขาดดุลได้มากสุดกี่แต้ม', 'ดุลการค้าของรัฐ'],
  pressStep: [0.08, 0, 0.5, 0.01, 'รัฐที่ใหญ่กว่าเท่าตัวกดราคาของรัฐติดกันลงได้เป็นส่วนเท่านี้', 'ดุลการค้าของรัฐ'],
  pressMax: [0.2, 0, 0.6, 0.01, 'กดราคาได้มากสุดเป็นส่วนเท่านี้', 'ดุลการค้าของรัฐ'],
  polStart: [0.05, 0, 1, 0.01, 'รัฐเริ่มใช้นโยบายแก้ขาดดุลเมื่อขาดดุลเกินเท่านี้ของ GDP', 'ดุลการค้าของรัฐ'],
  polFull: [0.25, 0.01, 2, 0.01, 'รัฐใช้นโยบายทุกข้อเต็มกำลังเมื่อขาดดุลถึงเท่านี้ของ GDP', 'ดุลการค้าของรัฐ'],
  polTariff: [0.3, 0, 2, 0.01, 'ภาษีขาเข้าเต็มกำลัง เป็นส่วนของมูลค่าของที่ซื้อเข้า (ไม่เก็บจากอาหาร เกลือ และเชื้อเพลิง)', 'ดุลการค้าของรัฐ'],
  polSub: [0.3, 0, 2, 0.01, 'เงินอุดหนุนส่งออกเต็มกำลัง เป็นส่วนของมูลค่าของที่ขายออก', 'ดุลการค้าของรัฐ'],
  polDev: [0.15, 0, 1, 0.01, 'ลดค่าเงินเต็มกำลัง เป็นส่วนที่ของนอกแพงขึ้นและของส่งออกได้ราคาดีขึ้น', 'ดุลการค้าของรัฐ'],
  polSubst: [0.25, 0, 2, 0.01, 'ผลิตทดแทนการนำเข้าเต็มกำลัง ผลผลิตของสามหมวดที่ซื้อเข้ามากที่สุดเพิ่มเป็นส่วนเท่านี้', 'ดุลการค้าของรัฐ'],
  polAust: [0.2, 0, 0.9, 0.01, 'รัดเข็มขัดเต็มกำลัง ความต้องการของฟุ่มเฟือยลดเป็นส่วนเท่านี้', 'ดุลการค้าของรัฐ'],
  polTour: [0.5, 0, 3, 0.05, 'ส่งเสริมการท่องเที่ยวเต็มกำลัง แรงดึงดูดนักท่องเที่ยวของเมืองในรัฐเพิ่มเป็นส่วนเท่านี้', 'ดุลการค้าของรัฐ'],
});
const EREG = {
  home: ['งานช่างตามบ้าน', 'ผลผลิตโรงงานน้อยลง มูลค่าสินค้าโรงงานสูงขึ้น ความเป็นอยู่ดีขึ้น'],
  shift: ['โรงงานกะเดียว', 'ค่ากลาง ไม่บวกไม่ลบ'],
  sweat: ['โรงงานเร่งผลิต กะยาว', 'ผลผลิตโรงงานมากขึ้น ความเป็นอยู่แย่ลง คนย้ายออกมากขึ้น และความจนที่เพิ่มทำให้มีทาสมากขึ้น'],
  care: ['โรงงานสองกะมีสวัสดิการ', 'ผลผลิตโรงงานมากขึ้น ต้นทุนค่าแรงสูงขึ้น ความเป็นอยู่ดีขึ้น และดึงคนย้ายเข้า'],
};
const ESPREAD = {
  nat: ['ตามแรงดึงดูด', 'คนย้ายเข้าเมืองตามแรงดึงดูดและขนาดของแต่ละเมือง'],
  clump: ['เป็นกลุ่มก้อน', 'คนย้ายเข้ากระจุกในเมืองใหญ่ที่น่าอยู่ที่สุดไม่กี่เมือง เมืองเล็กแทบไม่ได้คน'],
  even: ['สม่ำเสมอ', 'คนย้ายเข้ากระจายทุกเมืองใกล้เคียงกันไม่ว่าเมืองเล็กหรือใหญ่ เมืองเล็กจึงโตเร็วกว่าเมื่อเทียบกับขนาด'],
  season: ['ย้ายถิ่นตามฤดู', 'นอกจากย้ายตามแรงดึงดูด คนส่วนหนึ่งออกจากเมืองที่ฤดูหนาวรุนแรงไปอยู่เมืองที่อุ่นกว่าในรัฐเดียวกันครึ่งปีแล้วกลับ'],
};
const EPOL = {
  tariff: ['ภาษีขาเข้า', 'ของจากนอกรัฐแพงขึ้นจึงซื้อเข้าน้อยลง ไม่เก็บจากอาหาร เกลือ และเชื้อเพลิง', 'ของในเมืองแพงขึ้น ความเป็นอยู่ลดเล็กน้อย'],
  subsidy: ['อุดหนุนการส่งออก', 'รัฐช่วยค่าขนของที่ขายออกนอกรัฐ จึงขายได้ไกลและมากขึ้น', 'รัฐจ่ายเงินอุดหนุน รายได้ของเมืองลดเล็กน้อย'],
  dev: ['ลดค่าเงิน', 'ของส่งออกได้ราคาดีขึ้นในสายตาผู้ขาย และของนอกแพงขึ้น', 'ของนำเข้าแพง ความเป็นอยู่ลด'],
  subst: ['ผลิตทดแทนการนำเข้า', 'เร่งผลิตสามหมวดที่รัฐซื้อเข้ามากที่สุดขึ้นเองในรัฐ', 'รัฐอุดหนุนผู้ผลิต รายได้ของเมืองลดเล็กน้อย'],
  aust: ['รัดเข็มขัด', 'ลดการใช้ของฟุ่มเฟือย (ของหายาก โลหะมีค่า ตำรา เครื่องกล สมุนไพร) จึงซื้อเข้าน้อยลง', 'ความเป็นอยู่ลด'],
  tour: ['ส่งเสริมการท่องเที่ยว', 'ดึงนักท่องเที่ยวจากนอกรัฐ เงินที่เขาใช้นับเป็นรายรับของรัฐ', 'รัฐจ่ายค่าส่งเสริม รายได้ของเมืองลดเล็กน้อย'],
};
const EPOL_SYS = { trad: ['aust'], feud: ['tariff', 'aust'], merc: ['tariff', 'subst', 'subsidy'], cap: ['dev', 'subsidy', 'tour'], soc: ['subst', 'aust', 'tariff'], anar: [] };
const EPOL_COST = { tariff: [3, 0], subsidy: [0, 0.02], dev: [4, 0], subst: [0, 0.02], aust: [6, 0], tour: [0, 0.01] };   // at full strength: points of well-being lost, share of the city's income spent
const SOC_FOOD = new Set(['grain', 'protein']), SOC_LUX = new Set(['luxury', 'rare', 'books', 'tech', 'herbs']), SOC_STAPLE = new Set(['grain', 'protein', 'salt', 'fuel']);
ECO.regime = {}; ECO.demo = {};
let SOC = null;

// ---- each city's lot ----
function socHash(str, salt) { let h = (2166136261 ^ salt) >>> 0; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15; return (h >>> 0) / 4294967296; }
function socDemo(id) {                               // the lot a city drew when it was made, unless the owner has set or redrawn it
  const o = ECO.demo[id] || {};
  return { nat: o.nat != null ? o.nat : 0.6 + 0.35 * socHash(id, 1), mob: o.mob != null ? o.mob : 0.5 + socHash(id, 2), charm: o.charm != null ? o.charm : 0.5 + socHash(id, 3) };
}
const polList = s => { if (!s || s.sys === 'anar') return []; const on = (Array.isArray(s.pol) ? s.pol : EPOL_SYS[s.sys] || []).filter(k => EPOL[k]); return s.pol1 && on.includes(s.pol1) ? [s.pol1, ...on.filter(k => k !== s.pol1)] : on; };
const polOn = (c, tool) => c.pol && c.pol.tools.has(tool) ? c.pol.k : 0;

// ---- before the year's trade: what each city brings to it ----
function socPrep(cities) {
  const ref = TU('labRef'), cheap = TU('labCheap'), pts = new Map(), st = stPeak();
  for (const p of visiblePoints()) if (p.h >= 0) pts.set(p.h, (pts.get(p.h) || 0) + 1);
  for (const c of cities) {
    const s = ECOX.byKey.get(c.st) || null;
    c.reg = EREG[ECO.regime[c.id]] ? ECO.regime[c.id] : s && EREG[s.reg] ? s.reg : 'shift';
    c.lab = clamp(cheap * Math.log10(Math.max(1, c.people) / ref) / 3, -0.1, cheap);              // how much cheaper a day's work is here than in a middling town
    c.pol = POL && s ? POL.get(s.id) || null : null;
    c.work = (c.reg === 'home' ? TU('regHomeOut') : c.reg === 'sweat' ? TU('regSweatOut') : c.reg === 'care' ? TU('regCareOut') : 1) * (1 + TU('labMake') * c.lab);
    c.foodCut = 1 - TU('landFood') * (c.land ? c.land.lack : 0);                                   // a city short of land grows that much less of its food, and must buy the rest
    let seen = 0, sea = 0, lake = 0, ring = [c.h]; const sn = new Set(ring);                       // what there is to see: marks on the map within three hexes, the great peak, a sea shore, a lake
    for (let d = 0; d <= 3 && ring.length; d++) { const nx = []; for (const u of ring) { seen += pts.get(u) || 0; if (u === st) seen += 3; const b = eff(u); if (d <= 1 && isSea(b)) sea = 1; if (d <= 2 && b === 'L') lake = 1; for (let j = 0; j < 6; j++) { const v = NB[u * 6 + j]; if (v >= 0 && !sn.has(v)) { sn.add(v); nx.push(v); } } } ring = nx; }
    c.att = clamp((seen + sea + lake) / 6, 0, 1);
  }
}
function socRaw(c, cat) { return (SOC_FOOD.has(cat) ? c.foodCut : 1) * (c.pol && c.pol.top.has(cat) ? 1 + polOn(c, 'subst') * TU('polSubst') : 1); }
function socMake(c, m) { return c.work * (c.pol && c.pol.top.has(m) ? 1 + polOn(c, 'subst') * TU('polSubst') : 1); }
function socNeed(c, cat) { return SOC_LUX.has(cat) ? 1 - polOn(c, 'aust') * TU('polAust') : 1; }
function socHaul(L, cities) {                        // caravans to and from a city of many hands cost less: the stretch by land, by the two ends
  const a = cities[L.ia], b = cities[L.ib], len = (L.dry || 0) + (L.wet || 0), dry = len > 0 ? L.dry / len : 0;
  return clamp(1 - TU('labHaul') * dry * (Math.max(0, a.lab) + Math.max(0, b.lab)) / 2, 0.4, 1);
}
function polEarn(ci, cj, cat, pi, pj, v, gain, cost) {   // a trade across a border, as the two states' tools leave it
  POLG = gain; POLC = cost; const si = ci.sto, sj = cj.sto; if (si === sj) return;
  if ((si && si.sys === 'anar') || (sj && sj.sys === 'anar')) return;                              // no wall and no bounty reaches the black market
  const a = ci.pol, b = cj.pol;
  if (b) { if (b.tools.has('tariff') && !SOC_STAPLE.has(cat)) POLC += b.k * TU('polTariff') * pj * v; if (b.tools.has('dev')) POLC += b.k * TU('polDev') * pj * v; }
  if (a) { if (a.tools.has('subsidy')) POLC = Math.max(0.3 * cost, POLC - a.k * TU('polSub') * pi * v); if (a.tools.has('dev')) POLG += a.k * TU('polDev') * pj; }
}

// ---- after the year's trade ----
function socMet(E, k) {                              // how far the city's needs were met, by value, the staples counted twice
  let a = 0, b = 0;
  for (const cat of ECATS) { const nd = E.need[k][cat]; if (!(nd > 0) || !ECAT[cat] || ECAT[cat].people) continue; const w = nd * ECAT[cat].v * (SOC_STAPLE.has(cat) ? 2 : 1); a += w * Math.min(1, (E.got[k][cat] || 0) / nd); b += w; }
  return b > 0 ? a / b : 1;
}
let socNearKey = '', socNearSet = null;
function socNear() {                                 // which states touch
  const key = ecoStamp + '|' + ECO.states.length; if (key === socNearKey && socNearSet) return socNearSet;
  const S = new Set(); for (let i = 0; i < N; i++) { const a = ECO.cells[i]; if (a === '.') continue; for (let j = 0; j < 6; j++) { const v = NB[i * 6 + j]; if (v < 0) continue; const b = ECO.cells[v]; if (b !== '.' && b !== a) S.add(a < b ? a + b : b + a); } }
  socNearKey = key; return socNearSet = S;
}
const socTouch = (a, b) => socNear().has(a < b ? a + b : b + a);
function socTRef(E) { let s = 0, m = 0; const n = E.cities.length; for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) { const t = E.NT[a][b]; if (isFinite(t) && t > 0) { s += t; m++; } } return m ? s / m : 1; }
function socApply(rows) {
  const E = ECON, n = rows.length; SOC = null; if (!E || !n) return rows;
  let ppl = 0, inc = 0; for (const r of rows) { ppl += r.people; inc += r.inc; } const mean = ppl > 0 ? inc / ppl : 0, per = ECO.central.per;
  const base = rows.map(r => r.people), books = new Map();
  const book = s => { let b = books.get(s.id); if (!b) books.set(s.id, b = { s, out: 0, inn: 0, gdp: 0, people: 0, cities: 0, lost: 0, won: 0, tourIn: 0, tourOut: 0, byP: new Map(), byC: new Map(), sq: new Map(), def: 0, pen: 0, plan: null }); return b; };
  rows.forEach((r, k) => { if (r.s) { const b = book(r.s); b.gdp += r.gdp; b.people += r.people; b.cities++; if (r.c.pol) b.plan = r.c.pol; } });
  // the order of work, and the workshops' wage bill under the two-shift order
  rows.forEach((r, k) => {
    const c = r.c; let made = 0; for (const m of EMADEC) { const mk = E.MK[k][m]; if (mk) made += mk[0] * (E.P1[k][m] || 1) * ECAT[m].v; } made *= per; r.made = made;
    if (c.reg === 'home') { r.inc += TU('regHomeVal') * made; r.gdp += TU('regHomeVal') * made; } else if (c.reg === 'care') r.inc -= TU('regCareCost') * made;
    if (c.pol) { let cost = 0; for (const t of c.pol.tools) cost += EPOL_COST[t][1]; r.inc -= c.pol.k * cost * r.gdp; }
  });
  // each state's books in goods, at the buyer's price; and what a greater neighbour squeezed out of a smaller one
  for (const f of E.flows) {
    if (f.cat === 'labor') continue; const ra = rows[f.from], rb = rows[f.to], A = ra.s, B = rb.s; if (A === B) continue;
    let v = f.amt * ECAT[f.cat].v * (E.P1[f.to][f.cat] || 1) * per;
    if (A && B && A.sys !== 'anar' && B.sys !== 'anar' && (A.rel[B.id] || B.rel[A.id]) !== 'ally' && socTouch(A.id, B.id)) {
      const ga = book(A).gdp, gb = book(B).gdp;
      if (gb > ga && ga > 0) { const x = clamp(TU('pressStep') * Math.log2(gb / ga), 0, TU('pressMax')) * v; ra.inc -= x; rb.inc += x; v -= x; const ba = book(A), bb = book(B); ba.lost += x; bb.won += x; ba.sq.set(B.id, (ba.sq.get(B.id) || 0) + x); }
    }
    const put = (b, other, side) => { const P = b.byP.get(other) || b.byP.set(other, [0, 0]).get(other), C = b.byC.get(f.cat) || b.byC.set(f.cat, [0, 0]).get(f.cat); P[side] += v; C[side] += v; };
    if (A) { const b = book(A); b.out += v; put(b, B ? B.id : '.', 0); }
    if (B) { const b = book(B); b.inn += v; put(b, A ? A.id : '.', 1); }
  }
  // well-being before the state's balance weighs on it
  rows.forEach((r, k) => {
    const c = r.c, why = []; r.met = socMet(E, k); r.rich = mean > 0 ? r.inc / r.people / mean : 1;
    let w = 100 * r.met; why.push(['ความต้องการที่ยังไม่ได้รับ', w - 100]);
    const add = (t, v) => { if (Math.abs(v) >= 0.5) { w += v; why.push([t, v]); } };
    add('รายได้ต่อหัวเทียบค่าเฉลี่ย', 8 * clamp(Math.log2(Math.max(0.01, r.rich)), -1, 1));
    add('องค์กรในเมือง', Math.min(15, 100 * orgWell(c)));
    add(EREG[c.reg][0], c.reg === 'sweat' ? -TU('regSweatWell') : c.reg === 'home' || c.reg === 'care' ? TU('regWell') : 0);
    if (c.pol) for (const t of c.pol.tools) add(EPOL[t][0], -c.pol.k * EPOL_COST[t][0]);
    r.well0 = clamp(w, 0, 100); r.wellWhy = why;
  });
  // visitors
  const top = Math.max(1e-9, ...E.cities.map(c => c.through || 0)), tRef = socTRef(E), far = Math.max(1e-6, TU('tourFar') * tRef), spend = TU('tourSpend') * mean, rate = TU('tourRate');
  const score = rows.map(r => {
    const c = r.c, d = socDemo(c.id); let og = 0; for (const o of c.org || []) og += o.kind === 'faith' ? 1 : o.kind === 'guild' || o.kind === 'assoc' ? 0.5 : 0.3;
    r.tourWhy = { att: c.att || 0, hub: Math.sqrt((c.through || 0) / top), rich: clamp(r.rich / 2, 0, 1) * r.well0 / 100, org: clamp(og / 2, 0, 1), charm: d.charm };
    return d.charm * (0.35 * r.tourWhy.att + 0.25 * r.tourWhy.hub + 0.2 * r.tourWhy.rich + 0.2 * r.tourWhy.org + 0.01) * (1 + polOn(c, 'tour') * TU('polTour')) * Math.sqrt(r.people);
  });
  const tin = new Float64Array(n), tout = new Float64Array(n), W = new Float64Array(n);
  if (rate > 0 && n > 1) for (let i = 0; i < n; i++) {
    const r = rows[i], G = r.people * rate * clamp(r.rich, 0.2, 3) * r.well0 / 100; if (!(G >= 0.5)) continue;
    let sum = 0; for (let j = 0; j < n; j++) { W[j] = 0; if (j === i) continue; const t = E.NT[i][j]; if (!isFinite(t) || ecoRival(r.s, rows[j].s)) continue; sum += W[j] = score[j] * Math.exp(-t / far); }
    if (!(sum > 0)) continue; tout[i] = G;
    for (let j = 0; j < n; j++) if (W[j] > 0) { const x = G * W[j] / sum; tin[j] += x; const A = r.s, B = rows[j].s; if (A !== B) { if (A) book(A).tourOut += x * spend; if (B) book(B).tourIn += x * spend; } }
  }
  rows.forEach((r, k) => { r.inc += (tin[k] - tout[k]) * spend; });
  // a state deep in deficit lives worse
  for (const b of books.values()) { const net = b.out + b.tourIn - b.inn - b.tourOut; b.net = net; b.def = b.gdp > 0 ? Math.max(0, -net) / b.gdp : 0; b.pen = clamp((b.def - TU('defFree')) * TU('defWell'), 0, TU('defMax')); }
  rows.forEach(r => { const pen = r.s && books.get(r.s.id) ? books.get(r.s.id).pen : 0; r.wellPen = pen; if (pen >= 0.5) r.wellWhy.push(['รัฐขาดดุลการค้าหนัก', -pen]); r.well = clamp(r.well0 - pen, 0, 100); });
  // people on the move
  const A = rows.map(r => Math.max(0.02, (r.well / 100) * Math.sqrt(clamp(r.rich, 0.2, 3)) * (r.c.reg === 'sweat' ? 0.85 : r.c.reg === 'care' ? 1.15 : 1)));
  const groups = new Map(); rows.forEach((r, k) => { const key = r.s || null; (groups.get(key) || groups.set(key, []).get(key)).push(k); });
  const mIn = new Float64Array(n), mOut = new Float64Array(n), sIn = new Float64Array(n), sOut = new Float64Array(n), mobile = rows.map((r, k) => { const d = socDemo(r.c.id); return base[k] * Math.min(0.6, (1 - d.nat) * d.mob); });
  const CLM = climEnsure(), tw = rows.map(r => CLM && CLM.tw ? CLM.tw[r.c.h] : 0), harsh = new Float64Array(n), move = TU('migMove'), abroad = TU('migWorld');
  for (const [s, ks] of groups) {
    let pw = 0, aw = 0; for (const k of ks) { pw += base[k]; aw += A[k] * base[k]; } const abar = pw > 0 ? aw / pw : 1;
    let pool = 0; for (const k of ks) { const o = mobile[k] * move * clamp((abar - A[k]) / abar + 0.25, 0.05, 1) * (rows[k].c.reg === 'sweat' ? 1.3 : 1); mOut[k] = o; pool += o; }
    const outs = []; let ws = 0; for (let j = 0; j < n; j++) { const o = rows[j].s || null; if (o === s || ecoRival(s, o)) continue; const w = A[j] * base[j]; outs.push([j, w]); ws += w; }
    const away = ws > 0 ? pool * abroad : 0, home = pool - away, mode = s && ESPREAD[s.spread] ? s.spread : 'nat';
    const wt = k => mode === 'clump' ? Math.pow(A[k] * base[k], 1.8) : mode === 'even' ? A[k] : A[k] * base[k];
    let hs = 0; for (const k of ks) hs += wt(k); if (hs > 0) for (const k of ks) mIn[k] += home * wt(k) / hs;
    for (const [j, w] of outs) mIn[j] += away * w / ws;
    if (mode === 'season') {                           // out of the hard winters for half the year, to the milder cities of the same state
      let warm = -Infinity; for (const k of ks) warm = Math.max(warm, tw[k]);
      for (const k of ks) harsh[k] = clamp((warm - tw[k]) / TU('seasSpan'), 0, 1);   // how much colder a city's winter is than the mildest of its state's
      let ms = 0; for (const k of ks) ms += base[k] * (1 - harsh[k]); if (!(ms > 0)) continue;
      for (const k of ks) { const o = mobile[k] * 0.5 * harsh[k]; if (!(o > 0)) continue; sOut[k] = o; for (const j of ks) if (j !== k) sIn[j] += o * base[j] * (1 - harsh[j]) / Math.max(1e-9, ms - base[k] * (1 - harsh[k])); }
    }
  }
  const T = { native: 0, moved: 0, season: 0, tour: 0 };
  rows.forEach((r, k) => {
    r.demo = { base: base[k], native: Math.max(0, base[k] - mOut[k]), in: mIn[k], out: mOut[k], seasIn: sIn[k], seasOut: sOut[k], tour: tin[k], tourOut: tout[k] };
    r.people = Math.max(1, Math.round(base[k] - mOut[k] + mIn[k] + (sIn[k] - sOut[k]) / 2));
    T.native += r.demo.native; T.moved += mOut[k]; T.season += sOut[k]; T.tour += tin[k];
  });
  SOC = { books, mean, spend, tot: T, rows };
  return rows;
}

// ---- the year, closed: slaves as a class of goods on the lines they are carried by, and the state of each state ----
function socYear(E) {
  ECAT.labor.v = 1;
  const rows = ecoIncome(ecoGdp()), S = SLAVE, unit = ECO.unit, per = ECO.central.per;
  for (let k = 0; k < E.cities.length; k++) { E.MK[k].labor = [0, 0, 0, 0]; E.P0[k].labor = 1; E.P1[k].labor = 1; }
  if (S && S.flows.length && unit > 0 && per > 0) {
    ECAT.labor.v = Math.max(0.01, S.price * unit / per);                                          // a person's price, in the measure every other load is priced in
    for (const f of S.flows) {
      const amt = f.n / unit; if (!(amt > 0)) continue;
      E.flows.push({ from: f.a, to: f.b, cat: 'labor', amt, goods: { slaves: amt }, cost: f.t, via: null, broker: -1, hub: false, org: null, way: f.way, by: f.by === 'none' ? 'caravan' : f.by, people: f.n });
      E.MK[f.a].labor[3] += amt; E.MK[f.b].labor[2] += amt; E.MK[f.b].labor[1] += amt;
      for (const [li, dir] of f.way) { const L = E.links[li]; L.vol += amt; if (dir > 0) L.fwd += amt; else L.back += amt; L.cats.set('labor', (L.cats.get('labor') || 0) + amt); L.goods.set('slaves', (L.goods.get('slaves') || 0) + amt); let cd = L.cdir.get('labor'); if (!cd) L.cdir.set('labor', cd = [0, 0]); cd[dir > 0 ? 0 : 1] += amt; }
    }
  }
  const st = new Map(); if (SOC) for (const [id, b] of SOC.books) st.set(id, { def: b.def, net: b.net, gdp: b.gdp, byC: b.byC });
  E.soc = { states: st, rows: rows.length };
}
// A state in deficit acts, and the year is worked out once more with what it does. The first working shows how deep each
// state's deficit is and in which classes of goods; the deeper it is, the more of the state's tools come in, in its own order.
function polPlan(E) {
  if (!ECOX.on || !E || !E.soc) return null; const plan = new Map(), start = TU('polStart'), full = Math.max(start + 0.01, TU('polFull'));
  for (const [id, b] of E.soc.states) {
    const s = ECOX.byKey.get(id), list = polList(s); if (!s || !list.length || !(b.def > start)) continue;
    const k = clamp((b.def - start) / (full - start), 0.2, 1), use = Math.max(1, Math.ceil(k * list.length));
    const top = [...b.byC].map(([cat, v]) => [cat, v[1] - v[0]]).filter(x => x[1] > 0 && !ECAT[x[0]].people).sort((x, y) => y[1] - x[1]).slice(0, 3).map(x => x[0]);
    plan.set(id, { k, tools: new Set(list.slice(0, use)), top: new Set(top), def1: b.def, net1: b.net });
  }
  return plan.size ? plan : null;
}
const __ecSoc = econCompute;
econCompute = function () {
  POL = null; let E = __ecSoc();
  const plan = polPlan(E);
  if (plan) { POL = plan; try { E = __ecSoc(); E.pol = plan; } finally { POL = null; } }
  return E;
};
{ const ap = ecoApply; ecoApply = function () { ap(); GBY.set('slaves', { id: 'slaves', name: 'ทาส', cat: 'labor' }); }; GBY.set('slaves', { id: 'slaves', name: 'ทาส', cat: 'labor' }); }

// ---- the document ----
{
  const ld = ecoLoad, sr = ecoSerial;
  ecoLoad = function (b) {
    ld(b); b = b || {};
    ECO.regime = {}; for (const [id, k] of Object.entries(b.regime || {}).slice(0, 4000)) if (EREG[k] && k !== 'shift') ECO.regime[ecoStr(id, 120)] = k;
    ECO.demo = {}; for (const [id, o] of Object.entries(b.demo || {}).slice(0, 4000)) { if (!o || typeof o !== 'object') continue; const d = {}; if (o.nat != null) d.nat = ecoNum(o.nat, 0.3, 0.99, 0.8); if (o.mob != null) d.mob = ecoNum(o.mob, 0, 3, 1); if (o.charm != null) d.charm = ecoNum(o.charm, 0, 5, 1); if (Object.keys(d).length) ECO.demo[ecoStr(id, 120)] = d; }
    const by = new Map((Array.isArray(b.states) ? b.states : []).filter(s => s && typeof s.id === 'string').map(s => [s.id, s]));
    for (const s of ECO.states) { const o = by.get(s.id) || {}; s.spread = ESPREAD[o.spread] ? o.spread : 'nat'; s.reg = EREG[o.reg] && o.reg !== 'shift' ? o.reg : ''; s.pol = Array.isArray(o.pol) ? o.pol.filter(k => EPOL[k]).slice(0, 8) : null; s.pol1 = EPOL[o.pol1] ? o.pol1 : ''; }
  };
  ecoSerial = function () {
    const o = sr(); if (Object.keys(ECO.regime).length) o.regime = { ...ECO.regime }; if (Object.keys(ECO.demo).length) o.demo = JSON.parse(JSON.stringify(ECO.demo));
    return o;
  };
}

// ---- on the screen ----
const socN = x => { const v = Math.round(x); return Math.abs(v) < 1e6 ? v.toLocaleString('en-US') : ecoNumF(v); }, socPts = v => (v >= 0 ? '+' : '−') + Math.abs(Math.round(v));
const socOpt = (table, cur, first) => (first != null ? `<option value="">${first}</option>` : '') + Object.entries(table).map(([k, z]) => `<option value="${k}"${k === cur ? ' selected' : ''}>${z[0]}</option>`).join('');
function socStateForm(s) {                           // a state's choices: how incomers spread, the order of work, and what it does about a deficit
  if (s.sys === 'anar') return `<div class="tr w">ดินแดนที่ไม่มีรัฐไม่มีนโยบายดุลการค้า คนย้ายเข้าตามแรงดึงดูดของแต่ละเมือง</div>`;
  const on = new Set(Array.isArray(s.pol) ? s.pol : EPOL_SYS[s.sys] || []), list = polList(s), b = SOC && SOC.books.get(s.id), dis = editable ? '' : ' disabled';
  let h = ecoIn('การกระจายตัวของคนย้ายเข้า', `<select data-f="sspread"${dis}>${socOpt(ESPREAD, s.spread || 'nat')}</select>`) + `<div class="tr w">${ESPREAD[s.spread || 'nat'][1]}</div>`
    + ecoIn('ระเบียบงานของโรงงานในรัฐ', `<select data-f="sreg"${dis}>${socOpt(EREG, s.reg || 'shift')}</select>`) + `<div class="tr w">${EREG[s.reg || 'shift'][1]} เมืองที่ตั้งระเบียบของตัวเองในการ์ดเมืองใช้ของตัวเอง</div>`
    + `<div class="tr">สิ่งที่รัฐทำเมื่อขาดดุลการค้า <span class="w">ใช้ข้อแรกก่อน ยิ่งขาดดุลลึกยิ่งใช้หลายข้อ ชี้ที่ชื่อเพื่อดูผลดีและผลเสีย</span></div><div class="polset">`
    + Object.entries(EPOL).map(([k, z]) => `<label title="${esc(z[1] + ' ข้อเสีย: ' + z[2])}"><input type="checkbox" data-f="spol" data-k="${k}"${on.has(k) ? ' checked' : ''}${dis}> ${z[0]}</label>`).join('') + `</div>`
    + (list.length > 1 ? ecoIn('ใช้ข้อไหนก่อน', `<select data-f="spol1"${dis}>${list.map((k, i) => `<option value="${k}"${i === 0 ? ' selected' : ''}>${EPOL[k][0]}</option>`).join('')}</select>`) : '')
    + (!list.length ? `<div class="tr w">รัฐนี้ไม่แทรกแซง ปล่อยให้ขาดดุลหรือเกินดุลตามการค้า</div>` : '');
  if (b) h += `<div class="tr w">${socBalanceLine(b)}</div>`;
  return h;
}
function socBalanceLine(b) {
  const p = b.plan, pc = x => ecoPc(x) + '%';
  let t = b.net >= 0 ? `ปีนี้เกินดุล ${socN(b.net)} ${esc(ECO.central.name)}` : `ปีนี้ขาดดุล ${socN(-b.net)} ${esc(ECO.central.name)} คิดเป็น ${pc(b.def)} ของ GDP`;
  if (p) t += ` หลังใช้${[...p.tools].map(k => EPOL[k][0]).join(' ')}ที่กำลัง ${pc(p.k)} (ก่อนใช้ขาดดุล ${pc(p.def1)})`;
  if (b.pen >= 0.5) t += ` ความเป็นอยู่ของทุกเมืองในรัฐลด ${Math.round(b.pen)} แต้ม`;
  return t;
}
$('ecobody').addEventListener('change', e => {
  const el = e.target, f = el && el.dataset ? el.dataset.f : ''; if (!editable || !f) return;
  const box = el.closest('[data-s]'), s = box ? ECO.states.find(x => x.id === box.dataset.s) : null; if (!s) return;
  if (f === 'sspread') s.spread = ESPREAD[el.value] ? el.value : 'nat';
  else if (f === 'sreg') s.reg = EREG[el.value] && el.value !== 'shift' ? el.value : '';
  else if (f === 'spol') { const on = new Set(Array.isArray(s.pol) ? s.pol : EPOL_SYS[s.sys] || []); if (el.checked) on.add(el.dataset.k); else on.delete(el.dataset.k); s.pol = Object.keys(EPOL).filter(k => on.has(k)); if (s.pol1 && !on.has(s.pol1)) s.pol1 = ''; }
  else if (f === 'spol1') s.pol1 = EPOL[el.value] ? el.value : '';
  else return;
  ecoChanged(false); ecoRender();
});
$('ecobody').addEventListener('click', e => {
  const el = e.target.closest ? e.target.closest('[data-a]') : null; if (!el) return; const a = el.dataset.a;
  if (a === 'stfold') { for (const s of ECO.states) GDPV['st' + s.id] = +el.dataset.v; gdpKeep(); ecoRender(); }
  else if (a === 'psort') { const k = el.dataset.k; if (GDPV.pk === k) GDPV.pd = GDPV.pd > 0 ? -1 : 1; else { GDPV.pk = k; GDPV.pd = k === 'name' ? 1 : -1; } gdpKeep(); ecoRender(); }
});
// the GDP tab: who lives where, who visits, and how each state's books stand
function socGdpHTML() {
  if (!ECON) return ''; const rows = ecoIncome(ecoGdp()); if (!rows.length || !SOC) return '';
  const fold = (id, title, body) => `<details class="efold" data-fold="${id}"${GDPV[id] ? ' open' : ''}><summary>${title}</summary>${body}</details>`, T = SOC.tot, coin = esc(ECO.central.name);
  const SK = { name: ['เมือง', r => r.c.name], well: ['อยู่ดี', r => r.well], native: ['ดั้งเดิม', r => r.demo.native], in: ['ย้ายเข้า', r => r.demo.in + r.demo.seasIn], out: ['ย้ายออก', r => r.demo.out + r.demo.seasOut], tour: ['นักท่องเที่ยว', r => r.demo.tour] };
  const sk = SK[GDPV.pk] ? GDPV.pk : 'tour', dir = GDPV.pd > 0 ? 1 : -1, arrow = k => k === sk ? (dir > 0 ? ' ▲' : ' ▼') : '';
  const list = rows.slice().sort((a, b) => sk === 'name' ? dir * a.c.name.localeCompare(b.c.name, 'th') : dir * (SK[sk][1](a) - SK[sk][1](b)) || a.c.name.localeCompare(b.c.name, 'th'));
  const wellAvg = rows.reduce((a, r) => a + r.well * r.people, 0) / Math.max(1, rows.reduce((a, r) => a + r.people, 0));
  let h = fold('gpp', `ประชากร การย้ายถิ่น และนักท่องเที่ยว <small>${rows.length} แถว</small>`,
    `<div class="tr">ผู้อยู่อาศัยดั้งเดิม <b>${socN(T.native)}</b> คน ย้ายถิ่นในปีนี้ <b>${socN(T.moved)}</b> คน${T.season >= 0.5 ? ` ย้ายตามฤดู <b>${socN(T.season)}</b> คน` : ''} นักท่องเที่ยว <b>${socN(T.tour)}</b> คนต่อปี ความเป็นอยู่เฉลี่ย <b>${Math.round(wellAvg)}</b> จาก 100</div>`
    + `<div class="etable g5 g7"><div class="eth sortable">${Object.entries(SK).map(([k, v]) => `<span data-a="psort" data-k="${k}" title="กดเพื่อเรียงตามช่องนี้">${v[0]}${arrow(k)}</span>`).join('')}</div><div class="eth"><span></span><span>อยู่ดี</span><span>ดั้งเดิม</span><span>ย้ายเข้า</span><span>ย้ายออก</span><span>นักท่องเที่ยว</span><span>ค่าแรง</span></div>`
    + list.map(r => `<div class="etr"><span>${r.s ? `<i class="sdot" style="background:${r.s.color}"></i>` : ''}${esc(r.c.name)}${r.c.reg !== 'shift' ? ` <em>${EREG[r.c.reg][0]}</em>` : ''}${r.c.land && r.c.land.lack >= 0.05 ? ` <em>ที่ดินขาด ${ecoPc(r.c.land.lack)}%</em>` : ''}</span><span>${Math.round(r.well)}</span><span>${socN(r.demo.native)}</span><span>${socN(r.demo.in + r.demo.seasIn)}</span><span>${socN(r.demo.out + r.demo.seasOut)}</span><span>${socN(r.demo.tour)}</span><span>${r.c.lab >= 0.005 ? 'ถูก ' + ecoPc(r.c.lab) + '%' : r.c.lab <= -0.005 ? 'แพง ' + ecoPc(-r.c.lab) + '%' : 'กลาง'}</span></div>`).join('') + `</div>`
    + `<p class="note">ผู้อยู่อาศัยดั้งเดิมคือคนของเมืองที่ยังอยู่ คนย้ายออกจากเมืองที่ความเป็นอยู่และรายได้ต่ำกว่าค่าเฉลี่ยของรัฐไปเมืองที่ดีกว่า ร้อยละ ${ecoPc(TU('migWorld'))} ไปนอกรัฐ นักท่องเที่ยวไม่นับเป็นประชากร แต่ละคนใช้เงินราว ${ecoNumF(SOC.spend)} ${coin} ในเมืองที่ไป แรงดึงดูดนักท่องเที่ยวมาจากสี่อย่าง: สิ่งดึงดูดรอบเมืองในสามช่อง ความเป็นชุมทางการค้า ความมั่งคั่งกับความเป็นอยู่ และองค์กรในเมือง คูณด้วยเสน่ห์ของเมืองที่สุ่มไว้ ค่าแรงถูกหมายถึงโรงงานผลิตได้มากขึ้นและคาราวานรอบเมืองถูกลง ระเบียบงาน สัดส่วนคนดั้งเดิม และเสน่ห์ของเมือง ตั้งได้ในการ์ดของเมืองในโหมดการค้า</p>`);
  if (SOC.books.size) {
    const bs = [...SOC.books.values()].sort((a, b) => a.net - b.net);
    h += fold('gbl', `ดุลการค้าของรัฐและนโยบาย <small>${bs.length} แถว</small>`, `<div class="etable g5"><div class="eth"><span>รัฐ</span><span>ส่งออก</span><span>นำเข้า</span><span>ดุล</span><span>ต่อ GDP</span></div>`
      + bs.map(b => `<div class="etr"><span><i class="sdot" style="background:${b.s.color}"></i>${esc(b.s.name)}${b.plan ? ` <em>${[...b.plan.tools].map(k => EPOL[k][0]).join(' ')}</em>` : ''}${b.pen >= 0.5 ? ` <em>ความเป็นอยู่ลด ${Math.round(b.pen)}</em>` : ''}${b.lost >= 1 ? ` <em>ถูกกดราคา ${socN(b.lost)}</em>` : ''}${b.won >= 1 ? ` <em>กดราคาได้ ${socN(b.won)}</em>` : ''}</span><span>${socN(b.out + b.tourIn)}</span><span>${socN(b.inn + b.tourOut)}</span><span class="${b.net >= 0 ? 'pos' : 'neg'}">${(b.net >= 0 ? '+' : '−') + socN(Math.abs(b.net))}</span><span>${b.gdp > 0 ? (b.net >= 0 ? '+' : '−') + ecoPc(Math.abs(b.net) / b.gdp) + '%' : ''}</span></div>`).join('') + `</div>`
      + `<p class="note">ดุลนับสินค้าที่ข้ามเขตรัฐตามราคาในเมืองที่ซื้อ รวมเงินที่นักท่องเที่ยวต่างรัฐใช้ ไม่นับการซื้อขายทาส รัฐที่ขาดดุลเกินร้อยละ ${ecoPc(TU('defFree'))} ของ GDP เสียความเป็นอยู่ และรัฐที่ขาดดุลเกินร้อยละ ${ecoPc(TU('polStart'))} เริ่มใช้นโยบายที่ติ๊กไว้ในแท็บรัฐและเขตแดน รัฐที่ใหญ่กว่า (วัดด้วย GDP) กดราคาของที่ซื้อจากรัฐติดกันที่เล็กกว่าและไม่ใช่พันธมิตร</p>`);
  }
  return h;
}
{ const g = ecoGdpHTML; ecoGdpHTML = function () { return g() + socGdpHTML(); }; }
// a city's card in the trade view: its people, how well it lives and why, the order of its workshops, and the lot it drew
function socCityHTML(k) {
  const rows = ecoIncome(ecoGdp()), r = rows[k]; if (!r || !r.demo) return ''; const c = r.c, d = socDemo(c.id), D = r.demo, dis = editable ? '' : ' disabled', own = ECO.regime[c.id] || '';
  let h = `<h3>ประชากรและความเป็นอยู่</h3><div class="tr">ผู้อยู่อาศัย <b>${socN(r.people)}</b> คน <span class="w">ดั้งเดิม ${socN(D.native)} · ย้ายเข้า ${socN(D.in)} · ย้ายออก ${socN(D.out)}${D.seasIn + D.seasOut >= 0.5 ? ` · ตามฤดู เข้า ${socN(D.seasIn)} ออก ${socN(D.seasOut)}` : ''}</span></div>`
    + `<div class="tr">นักท่องเที่ยว <b>${socN(D.tour)}</b> คนต่อปี <span class="w">คนของเมืองออกไปเที่ยว ${socN(D.tourOut)} · สิ่งดึงดูด ${ecoPc(r.tourWhy.att)}% ชุมทาง ${ecoPc(r.tourWhy.hub)}% มั่งคั่ง ${ecoPc(r.tourWhy.rich)}% องค์กร ${ecoPc(r.tourWhy.org)}%</span></div>`
    + `<div class="tr">ความเป็นอยู่ <b>${Math.round(r.well)}</b> จาก 100 <span class="w">${r.wellWhy.filter(x => Math.abs(x[1]) >= 0.5).map(x => `${x[0]} ${socPts(x[1])}`).join(' · ') || 'ความต้องการครบ'}</span></div>`
    + `<div class="tr">ค่าแรง <b>${c.lab >= 0.005 ? 'ถูกกว่าค่ากลาง ' + ecoPc(c.lab) + '%' : c.lab <= -0.005 ? 'แพงกว่าค่ากลาง ' + ecoPc(-c.lab) + '%' : 'ค่ากลาง'}</b> <span class="w">โรงงานผลิต ×${c.work.toFixed(2)} · เก็บเกี่ยวรอบเมืองได้ไกล ${c.reach} ช่อง</span></div>`;
  if (c.land && c.land.lack >= 0.01) h += `<div class="tr">ที่ดินไม่พอ <b>${ecoPc(c.land.lack)}%</b> <span class="w">เมืองจึงผลิตอาหารได้ ${ecoPc(c.foodCut)}% ของที่ผืนดินให้ ส่วนที่ขาดต้องซื้อเข้า</span></div>`;
  h += `<div class="optrow"><span class="lbl">ระเบียบงานของโรงงาน</span><select data-sf="reg"${dis}>${socOpt(EREG, own, 'ตามรัฐ' + (c.sto && c.sto.reg ? ' (' + EREG[c.sto.reg][0] + ')' : ' (โรงงานกะเดียว)'))}</select></div><div class="tr w">${EREG[c.reg][1]}</div>`
    + `<div class="optrow soclot"><label title="ส่วนของคนในเมืองที่ตั้งรกรากและไม่ย้าย">ดั้งเดิม <input type="number" data-sf="nat" min="30" max="99" step="1" value="${Math.round(d.nat * 100)}"${dis}>%</label><label title="คนที่ไม่ได้ตั้งรกรากพร้อมย้ายแค่ไหน 1 คือค่ากลาง">พร้อมย้าย <input type="number" data-sf="mob" min="0" max="3" step="0.1" value="${d.mob.toFixed(1)}"${dis}></label><label title="เสน่ห์ของเมืองต่อนักท่องเที่ยว 1 คือค่ากลาง">เสน่ห์ <input type="number" data-sf="charm" min="0" max="5" step="0.1" value="${d.charm.toFixed(1)}"${dis}></label><button type="button" class="btn" data-sf="dice"${dis}>สุ่มใหม่</button></div>`
    + `<div class="tr w">สามค่านี้เมืองได้มาจากการสุ่มตอนสร้างเมือง${ECO.demo[c.id] ? ' และถูกตั้งเองแล้ว' : ''}</div>`;
  return h;
}
{
  const t = tradeCityHTML; tradeCityHTML = function (k) { const h = t(k), add = socCityHTML(k), at = h.indexOf('<!--prod-->'); return at >= 0 ? h.slice(0, at) + add + h.slice(at) : h + add; };
  const set = el => {
    if (!editable || !tsel) return false; const f = el.dataset.sf, id = tsel;
    if (f === 'reg') { if (EREG[el.value]) ECO.regime[id] = el.value; else delete ECO.regime[id]; }
    else if (f === 'dice') ECO.demo[id] = { nat: +(0.6 + 0.35 * Math.random()).toFixed(2), mob: +(0.5 + Math.random()).toFixed(1), charm: +(0.5 + Math.random()).toFixed(1) };
    else if (f === 'nat' || f === 'mob' || f === 'charm') { const d = socDemo(id), v = +el.value; if (!Number.isFinite(v)) return false; d[f] = f === 'nat' ? clamp(v / 100, 0.3, 0.99) : clamp(v, 0, f === 'mob' ? 3 : 5); ECO.demo[id] = d; }
    else return false;
    ecoChanged(false); renderTradeCard(); return true;
  };
  $('tradebody').addEventListener('change', e => { const el = e.target; if (el && el.dataset && el.dataset.sf && el.dataset.sf !== 'dice') set(el); });
  $('tradebody').addEventListener('click', e => { const el = e.target.closest ? e.target.closest('[data-sf="dice"]') : null; if (el) set(el); });
}
// a state's card in the trade view: the same books the model works from
function socStateCardHTML(s) {
  ecoIncome(ecoGdp()); const b = SOC && SOC.books.get(s.id); if (!b) return '';
  const coin = esc(ECO.central.name), nm = id => { const o = ECOX.byKey.get(id); return o ? esc(o.name) : 'เมืองที่ไม่ขึ้นกับรัฐใด'; };
  let h = `<h4>ดุลของรัฐในปีนี้</h4><div class="tr">${socBalanceLine(b)}</div>`;
  if (b.tourIn + b.tourOut >= 1) h += `<div class="tr w">นักท่องเที่ยวต่างรัฐใช้เงินในรัฐ ${socN(b.tourIn)} ${coin} คนของรัฐออกไปใช้นอกรัฐ ${socN(b.tourOut)} ${coin}</div>`;
  if (b.lost >= 1) h += `<div class="tr w">ถูกรัฐที่ใหญ่กว่ากดราคา เสีย ${socN(b.lost)} ${coin}: ${[...b.sq].map(([id, v]) => nm(id) + ' ' + socN(v)).join(' · ')}</div>`;
  if (b.won >= 1) h += `<div class="tr w">กดราคารัฐติดกันที่เล็กกว่าได้ ${socN(b.won)} ${coin}</div>`;
  if (b.plan) h += `<div class="tr w">กำลังใช้: ${[...b.plan.tools].map(k => `${EPOL[k][0]} (${EPOL[k][2]})`).join(' · ')}${b.plan.top.size ? ' หมวดที่ซื้อเข้ามากที่สุด: ' + [...b.plan.top].map(c => esc(ECAT[c].name)).join(' ') : ''}</div>`;
  if (b.def > TU('polStart')) h += `<div class="tr w">ยังขาดดุลอยู่ ทางที่เหลือ: ติ๊กนโยบายเพิ่มในแท็บรัฐและเขตแดน ปรับอัตราแลกเงิน ผูกพันธมิตรกับรัฐที่กดราคา หรือเป็นทางสุดท้าย ตั้งองค์กรที่เพิ่มผลผลิตหรือลดค่าขนในเมืองของรัฐ</div>`;
  return h;
}
$('tradebody').addEventListener('click', e => {      // the city's tables: a column clicked sets the order
  const el = e.target.closest ? e.target.closest('[data-ts]') : null; if (!el) return; const [kind, k] = el.dataset.ts.split(':'), key = kind === 'p' ? 'pk' : 'ck', dk = kind === 'p' ? 'pd' : 'cd';
  if (TCV[key] === k) TCV[dk] = TCV[dk] > 0 ? -1 : 1; else { TCV[key] = k; TCV[dk] = k === 'name' ? 1 : -1; } tcKeep(); renderTradeCard();
});
$('tradebody').addEventListener('toggle', e => { const d = e.target; if (d && d.dataset && d.dataset.tfold) { TCV[d.dataset.tfold] = d.open ? 1 : 0; tcKeep(); } }, true);
