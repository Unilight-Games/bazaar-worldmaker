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
  richRef: [0.5, 0.05, 0.95, 0.01, 'ส่วนรายได้ของชนชั้นสูงและกลางรวมกันที่ความต้องการของฟุ่มเฟือยเป็นค่ากลาง', 'ชนชั้น'],
  homePref: [0.15, 0, 2, 0.01, 'คนที่ไม่มั่งคั่งชอบของพื้นฐานจากในรัฐ: ของจากนอกรัฐต้องถูกกว่าเท่านี้ของราคาจึงซื้อ (คูณส่วนรายได้ของชนชั้นล่าง)', 'ชนชั้น'],
  basicWell: [70, 0, 100, 1, 'ความเป็นอยู่ที่ลดลงเมื่อของพื้นฐานขาดทั้งหมด (อาหาร เกลือ เชื้อเพลิง ไม้ หิน ผ้า เครื่องมือ) ลดตามส่วนที่ขาด', 'ชนชั้น'],
  otherWell: [25, 0, 100, 1, 'ความเป็นอยู่ที่ลดลงเมื่อของอื่นขาดทั้งหมด ลดตามส่วนที่ขาด', 'ชนชั้น'],
  alms: [0.01, 0, 0.2, 0.005, 'ทานที่ชนชั้นล่างสุดได้ เป็นส่วนของรายได้ของเมือง เมื่อคนล่างสุดมีร้อยละ 8 (องค์กรที่ให้ความเป็นอยู่เพิ่มทานได้)', 'ชนชั้น'],
  jobless: [0.03, 0, 0.5, 0.01, 'ส่วนของคนแรงงานที่ไม่มีงานเป็นอย่างน้อย กลายเป็นชนชั้นล่างสุด (เพิ่มตามค่าแรงที่ถูก ทาส และของพื้นฐานที่ขาด)', 'ชนชั้น'],
  slvBase: [15, 0, 100, 1, 'ความเป็นอยู่ของทาสเมื่อชนชั้นสูงไม่มีเงินเลย', 'ชนชั้น'],
  slvTop: [110, 0, 300, 5, 'ความเป็นอยู่ของทาสที่เพิ่มตามส่วนรายได้ของเมืองที่อยู่กับชนชั้นสูง (คูณส่วนนั้น)', 'ชนชั้น'],
  fxBal: [0.5, 0, 3, 0.05, 'ค่าเงินของรัฐแข็งขึ้นเป็นกี่เท่าของดุลการค้าต่อ GDP (เกินดุลร้อยละ 10 แข็งขึ้นร้อยละ 5) ขาดดุลอ่อนลงแบบเดียวกัน สูงสุดร้อยละ 30', 'ดุลการค้าของรัฐ'],
  balBand: [0.03, 0, 0.5, 0.005, 'รัฐที่ดุลห่างจากศูนย์ไม่เกินเท่านี้ของ GDP นับว่าค้าสมดุล', 'ดุลการค้าของรัฐ'],
  balWell: [3, 0, 30, 1, 'ค้าสมดุล: ความเป็นอยู่ที่เพิ่มขึ้น (แต้ม)', 'ดุลการค้าของรัฐ'],
  balStay: [0.2, 0, 1, 0.05, 'ค้าสมดุล: คนย้ายออกน้อยลงเป็นส่วนเท่านี้', 'ดุลการค้าของรัฐ'],
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
const SOC_BASIC = new Set(['grain', 'protein', 'salt', 'fuel', 'timber', 'stone', 'cloth', 'tools']), SOC_FOOD = new Set(['grain', 'protein']), SOC_LUX = new Set(['luxury', 'rare', 'books', 'tech', 'herbs']), SOC_STAPLE = new Set(['grain', 'protein', 'salt', 'fuel']);
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
function socNeed(c, cat) {                         // the share of the city's need that its people will pay for (v0.14.0): the rich want the fine things, the rest want what their country has
  const A = ECAT[cat]; if (!A || A.people || SOC_BASIC.has(cat)) return 1;
  const r = c.rich0 == null ? TU('richRef') : c.rich0; let f = 1;
  if (SOC_LUX.has(cat)) f = clamp(r / TU('richRef'), 0.2, 2.5) * (1 - polOn(c, 'aust') * TU('polAust'));
  else if (A.made) return 1;
  if (!A.made && c.dom && !c.dom.has(cat)) f *= clamp(r, 0.05, 1);   // what nobody of their country brings up from the ground, only the well-off send for
  return f;
}
function socHaul(L, cities) {                        // caravans to and from a city of many hands cost less: the stretch by land, by the two ends
  const a = cities[L.ia], b = cities[L.ib], len = (L.dry || 0) + (L.wet || 0), dry = len > 0 ? L.dry / len : 0;
  return clamp(1 - TU('labHaul') * dry * (Math.max(0, a.lab) + Math.max(0, b.lab)) / 2, 0.4, 1);
}
function polEarn(ci, cj, cat, pi, pj, v, gain, cost) {   // a trade across a border, as the two states' tools leave it
  POLG = gain; POLC = cost; const si = ci.sto, sj = cj.sto; if (si === sj) return;
  if ((si && si.sys === 'anar') || (sj && sj.sys === 'anar')) return;                              // no wall and no bounty reaches the black market
  if (FXS) { const xa = FXS.get(si ? si.id : '') || 0, xb = FXS.get(sj ? sj.id : '') || 0; if (xa || xb) POLC = Math.max(0.2 * cost, POLC + clamp((1 + xa) / (1 + xb) - 1, -0.5, 0.5) * pj * v); }   // a hard coin makes a state's wares dear abroad and the world's cheap at home
  const a = ci.pol, b = cj.pol;
  if (b) { if (b.tools.has('tariff') && !SOC_STAPLE.has(cat)) POLC += b.k * TU('polTariff') * pj * v; if (b.tools.has('dev')) POLC += b.k * TU('polDev') * pj * v; }
  if (a) { if (a.tools.has('subsidy')) POLC = Math.max(0.3 * cost, POLC - a.k * TU('polSub') * pi * v); if (a.tools.has('dev')) POLG += a.k * TU('polDev') * pj; }
}

// ---- after the year's trade ----
function socMet(E, k, set, inSet) {                  // how far the city's needs were met, by value, the staples counted twice; of one set of classes, or of the rest, when asked
  let a = 0, b = 0;
  for (const cat of ECATS) { const nd = E.need[k][cat]; if (!(nd > 0) || !ECAT[cat] || ECAT[cat].people || (set && set.has(cat) !== inSet)) continue; const w = nd * ECAT[cat].v * (SOC_STAPLE.has(cat) ? 2 : 1); a += w * Math.min(1, (E.got[k][cat] || 0) / nd); b += w; }
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
    r.exX = 0; const c = r.c; let made = 0; for (const m of EMADEC) { const mk = E.MK[k][m]; if (mk) made += mk[0] * (E.P1[k][m] || 1) * ECAT[m].v; } made *= per; r.made = made;
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
    ra.exX = (ra.exX || 0) + v;
    if (B) { const b = book(B); b.inn += v; put(b, A ? A.id : '.', 1); }
  }
  // well-being before the state's balance weighs on it
  rows.forEach((r, k) => {
    const c = r.c, why = []; r.met = socMet(E, k); r.rich = mean > 0 ? r.inc / r.people / mean : 1;
    let w = 100; const add = (t, v) => { if (Math.abs(v) >= 0.5) { w += v; why.push([t, v]); } };
    r.metB = socMet(E, k, SOC_BASIC, true); r.metO = socMet(E, k, SOC_BASIC, false);
    add('ของพื้นฐานที่ยังขาด', -TU('basicWell') * (1 - r.metB)); add('ของอื่นที่ยังขาด', -TU('otherWell') * (1 - r.metO));
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
  for (const b of books.values()) { const net = b.out + b.tourIn - b.inn - b.tourOut; b.net = net; b.def = b.gdp > 0 ? Math.max(0, -net) / b.gdp : 0; b.pen = clamp((b.def - TU('defFree')) * TU('defWell'), 0, TU('defMax')); b.stable = b.s.sys !== 'anar' && b.gdp > 0 && Math.abs(net) / b.gdp <= TU('balBand'); b.fx = ECON && ECON.fx ? ECON.fx.get(b.s.id) || 0 : 0; }
  rows.forEach(r => {
    const b = r.s ? books.get(r.s.id) : null, pen = b ? b.pen : 0, bon = b && b.stable ? TU('balWell') : 0; r.wellPen = pen; r.stable = !!(b && b.stable);
    if (pen >= 0.5) r.wellWhy.push(['รัฐขาดดุลการค้าหนัก', -pen]); if (bon >= 0.5) r.wellWhy.push(['รัฐค้าสมดุล', bon]);
    r.well = clamp(r.well0 - pen + bon, 0, 100);
    r.sur = b && b.net > 0 && b.out > 0 ? b.net * r.exX / b.out : 0;                                 // the city's part of its state's surplus
  });
  // people on the move
  const A = rows.map(r => Math.max(0.02, (r.well / 100) * Math.sqrt(clamp(r.rich, 0.2, 3)) * (r.c.reg === 'sweat' ? 0.85 : r.c.reg === 'care' ? 1.15 : 1)));
  const groups = new Map(); rows.forEach((r, k) => { const key = r.s || null; (groups.get(key) || groups.set(key, []).get(key)).push(k); });
  const mIn = new Float64Array(n), mOut = new Float64Array(n), sIn = new Float64Array(n), sOut = new Float64Array(n), mobile = rows.map((r, k) => { const d = socDemo(r.c.id); return base[k] * Math.min(0.6, (1 - d.nat) * d.mob); });
  const CLM = climEnsure(), tw = rows.map(r => CLM && CLM.tw ? CLM.tw[r.c.h] : 0), harsh = new Float64Array(n), move = TU('migMove'), abroad = TU('migWorld');
  for (const [s, ks] of groups) {
    let pw = 0, aw = 0; for (const k of ks) { pw += base[k]; aw += A[k] * base[k]; } const abar = pw > 0 ? aw / pw : 1;
    let pool = 0; for (const k of ks) { const o = mobile[k] * move * clamp((abar - A[k]) / abar + 0.25, 0.05, 1) * (rows[k].c.reg === 'sweat' ? 1.3 : 1) * (rows[k].stable ? 1 - TU('balStay') : 1); mOut[k] = o; pool += o; }
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
// The coin of a state in surplus hardens, and of one in deficit softens (the owner's choice, after the flow of money Hume
// described: from memory, not looked up). Worked out from the first working of the year, used in the second.
function fxPlan(E) {
  if (!ECOX.on || !E || !E.soc || !(TU('fxBal') > 0)) return null; const fx = new Map();
  for (const [id, b] of E.soc.states) { const s = ECOX.byKey.get(id); if (!s || s.sys === 'anar' || !(b.gdp > 0)) continue; const x = clamp(TU('fxBal') * b.net / b.gdp, -0.3, 0.3); if (Math.abs(x) >= 0.002) fx.set(id, x); }
  return fx.size ? fx : null;
}
const __ecSoc = econCompute;
econCompute = function () {
  POL = null; FXS = null; let E = __ecSoc();
  const plan = polPlan(E), fx = fxPlan(E);
  if (plan || fx) { POL = plan; FXS = fx; try { E = __ecSoc(); E.pol = plan; E.fx = fx; } finally { POL = null; FXS = null; } }
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
  let t = (b.net >= 0 ? `ปีนี้เกินดุล ${socN(b.net)} ${esc(ECO.central.name)}` : `ปีนี้ขาดดุล ${socN(-b.net)} ${esc(ECO.central.name)} คิดเป็น ${pc(b.def)} ของ GDP`) + ' (สินค้ารวมเงินนักท่องเที่ยว)';
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
      + bs.map(b => `<div class="etr"><span><i class="sdot" style="background:${b.s.color}"></i><button type="button" class="lnk" data-sopen="${b.s.id}" title="เปิดการ์ดตั้งค่าของรัฐ">${esc(b.s.name)}</button>${b.plan ? ` <em>${[...b.plan.tools].map(k => EPOL[k][0]).join(' ')}</em>` : ''}${b.pen >= 0.5 ? ` <em>ความเป็นอยู่ลด ${Math.round(b.pen)}</em>` : ''}${b.lost >= 1 ? ` <em>ถูกกดราคา ${socN(b.lost)}</em>` : ''}${b.won >= 1 ? ` <em>กดราคาได้ ${socN(b.won)}</em>` : ''}</span><span>${socN(b.out + b.tourIn)}</span><span>${socN(b.inn + b.tourOut)}</span><span class="${b.net >= 0 ? 'pos' : 'neg'}">${(b.net >= 0 ? '+' : '−') + socN(Math.abs(b.net))}</span><span>${b.gdp > 0 ? (b.net >= 0 ? '+' : '−') + ecoPc(Math.abs(b.net) / b.gdp) + '%' : ''}</span></div>`).join('') + `</div>`
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

// ---------- classes (v0.14.0, the owner's four, measured by where the money comes from) ----------
// A city's year is split by its sources: the rent of land and mine goes mostly to the landlords, the profit of the workshops to
// the owners and the master craftsmen, the margins of trade and the visitors' money to the merchants, the pay of officials and
// soldiers to the middle, and what is left of each to those who work for wages. Who gets how much of rent and profit is the
// system's: a feudal lord takes most of the rent, a socialist state little of anything. Cheap hands lower wages and raise the
// profit; a long shift does the same, a welfare shift the reverse; home crafts leave the profit with the craftsmen. Those who
// find no work fall to the bottom and live on alms. A slave fares as well as the house that holds him, so the more of a city's
// money the top holds, the better its slaves live, better than the middle where the money sits high enough. All numbers mine.
const RENT_HI = { feud: 0.6, trad: 0.35, merc: 0.4, cap: 0.4, anar: 0.45, soc: 0.1, '': 0.35 };
const PROF_HI = { feud: 0.4, trad: 0.25, merc: 0.45, cap: 0.5, anar: 0.55, soc: 0.1, '': 0.35 };
const ADMIN = [0.12, 0.08, 0.05, 0.15, 0.02];                 // the share of what land and workshops make that pays officials and soldiers, by kind of city
const HI_N = [0.03, 0.02, 0.015, 0.015, 0.01], MID_N = [0.22, 0.18, 0.12, 0.25, 0.06];
const HI_SYS = { feud: 1.4, soc: 0.4, cap: 1.1, anar: 1.2 }, MID_SYS = { cap: 1.2, merc: 1.1, soc: 1.3, feud: 0.8, trad: 0.7 };
const CLS = { hi: 'ชนชั้นสูง', mid: 'ชนชั้นกลาง', low: 'ชนชั้นล่าง', poor: 'ล่างสุด', slave: 'ทาส' };
const CLS_WHO = { hi: 'ขุนนาง ราชวงศ์ เศรษฐี', mid: 'ข้าราชการ พ่อค้า ทหาร เจ้าของที่ดินรายย่อย', low: 'กรรมกร คนหาเช้ากินค่ำ กุลี คนงานโรงงาน', poor: 'ขอทาน คนไร้บ้าน', slave: '' };
function classSplit(c, P) {                          // the city's money by class, as shares that add up to one
  const sys = c.sto ? c.sto.sys : '', cut = clamp(c.lab || 0, -0.1, 0.5), reg = c.reg || 'shift';
  let hi = 0, mid = 0, low = 0;
  const rh = clamp((RENT_HI[sys] != null ? RENT_HI[sys] : 0.35) * (1 + cut), 0.02, 0.9); hi += P.rent * rh; mid += P.rent * (1 - rh) * 0.3; low += P.rent * (1 - rh) * 0.7;   // landlords, the small holders, and those who work the land
  const pf = clamp((PROF_HI[sys] != null ? PROF_HI[sys] : 0.35) + 0.6 * cut + (reg === 'sweat' ? 0.12 : reg === 'care' ? -0.08 : 0), 0.03, 0.85), prof = P.made * pf;
  if (reg === 'home') { hi += prof * 0.2; mid += prof * 0.8; } else { hi += prof * 0.6; mid += prof * 0.4; } mid += (P.made - prof) * 0.15; low += (P.made - prof) * 0.85;   // the foremen and clerks are paid more than the hands
  mid += P.comm * 0.75; hi += P.comm * 0.25 + P.slave;
  const sur = P.surplus || 0; hi += sur * 0.5; mid += sur * 0.5; low -= sur;
  const adm = ADMIN[c.ki] * (P.rent + P.made) * (sys === 'soc' ? 1.5 : 1); mid += adm; hi -= adm * 0.5; low -= adm * 0.5;
  hi = Math.max(0, hi); mid = Math.max(0, mid); low = Math.max(0, low);
  const tot = hi + mid + low || 1, a = clamp((TU('alms') + 0.3 * orgWell(c)) * clamp((P.poorFrac == null ? 0.08 : P.poorFrac) / 0.08, 0, 3), 0, 0.25), top = hi + mid;
  const w = top > 0 ? { hi: hi / tot - a * hi / top, mid: mid / tot - a * mid / top, low: low / tot, poor: a } : { hi: 0, mid: 0, low: low / tot - a, poor: a };
  return { w };
}
function classHeads(c, free, held, metB) {           // the free people by class, as shares of them
  const sys = c.sto ? c.sto.sys : '', reg = c.reg || 'shift', hi = HI_N[c.ki] * (HI_SYS[sys] || 1), mid = MID_N[c.ki] * (MID_SYS[sys] || 1), rest = Math.max(0, 1 - hi - mid);
  const out = clamp(TU('jobless') + 0.4 * Math.max(0, c.lab || 0) + 0.6 * held / Math.max(1, free + held) + 0.3 * (1 - (metB == null ? 1 : metB)) + (reg === 'sweat' ? -0.02 : reg === 'home' ? -0.01 : 0), 0.01, 0.6);
  return { hi, mid, low: rest * (1 - out), poor: rest * out };
}
function socRich(cities, prod) {                     // before the year's trade: roughly how the money will fall, and what the country brings up from its own ground
  const dom = new Map();
  cities.forEach((c, k) => { const key = c.sto ? c.sto.id : '@' + k; let s = dom.get(key); if (!s) dom.set(key, s = new Set()); for (const [id, v] of prod[k]) if (v > 0.05) s.add(catOf(id)); });
  cities.forEach((c, k) => {
    let rent = 0; for (const [id, v] of prod[k]) { const cat = catOf(id); if (ECAT[cat]) rent += v * ECAT[cat].v; }
    const made = c.pop * EIND[c.ki] * 0.5 * (c.work || 1), sp = classSplit(c, { rent, made, comm: 0.03 * (rent + made), slave: 0, surplus: 0 });
    c.rich0 = sp.w.hi + sp.w.mid; c.dom = dom.get(c.sto ? c.sto.id : '@' + k);
  });
}
function classApply(rows) {
  const E = ECON; if (!E || !rows.length) return rows; const per = ECO.central.per, S = SLAVE;
  rows.forEach((r, k) => {
    const c = r.c; let rent = 0;
    for (const cat of ERAW) { const mk = E.MK[k][cat]; if (mk && ECAT[cat]) rent += mk[0] * (E.P1[k][cat] || 1) * ECAT[cat].v; }
    rent *= per; const made = Math.max(0, r.gdp - rent), held = r.slave ? r.slave.held : 0;
    const slaveInc = held && S ? held * S.mean * TU('slaveGain') * (r.slave.law === 'pat' ? 0.6 : 1) : 0, other = r.inc - r.gdp - slaveInc;
    const free = Math.max(1, r.people - held), H = classHeads(c, free, held, r.metB);
    const sp = classSplit(c, { rent, made, comm: Math.max(0, other), slave: slaveInc, surplus: Math.min(r.sur || 0, 0.8 * (rent + made)), poorFrac: H.poor });
    const inc = Math.max(0, r.inc), ph = inc / free, wellOf = (x, n) => n > 0.5 ? clamp((r.well == null ? 60 : r.well) + 12 * Math.log2(Math.max(1e-6, x / n) / Math.max(1e-6, ph)), 0, 100) : 0;
    const cls = {};
    for (const q of ['hi', 'mid', 'low', 'poor']) { const n = free * H[q], x = inc * sp.w[q]; cls[q] = { n, inc: x, well: wellOf(x, n) }; }
    cls.poor.well = Math.min(cls.poor.well, 30);
    cls.slave = { n: held, inc: 0, well: held ? clamp(TU('slvBase') + TU('slvTop') * sp.w.hi, 0, 100) : 0 };
    r.cls = cls; r.clsW = sp.w;
  });
  if (SOC) {                                         // each state's classes, and the whole map's
    const add = (G, r) => { for (const q in r.cls) { const a = G[q] || (G[q] = { n: 0, inc: 0, wn: 0 }); a.n += r.cls[q].n; a.inc += r.cls[q].inc; a.wn += r.cls[q].well * r.cls[q].n; } };
    SOC.cls = {}; for (const b of SOC.books.values()) b.cls = {};
    for (const r of rows) { add(SOC.cls, r); const b = r.s ? SOC.books.get(r.s.id) : null; if (b) add(b.cls, r); }
  }
  return rows;
}
function clsSum(G) {                                 // shares, wealth per head, well-being and the measure of inequality of a group of classes
  const qs = ['hi', 'mid', 'low', 'poor', 'slave'].filter(q => G[q] && G[q].n >= 0.5), n = qs.reduce((a, q) => a + G[q].n, 0), w = qs.reduce((a, q) => a + G[q].inc, 0);
  const out = {}; for (const q of qs) { const g = G[q]; out[q] = { n: g.n, p: n > 0 ? g.n / n : 0, s: w > 0 ? g.inc / w : 0, ph: g.n > 0 ? g.inc / g.n : 0, well: g.wn != null ? (g.n > 0 ? g.wn / g.n : 0) : g.well }; }
  const ord = qs.slice().sort((a, b) => out[a].ph - out[b].ph); let L = 0, gini = 1;
  for (const q of ord) { const L2 = L + out[q].s; gini -= out[q].p * (L + L2); L = L2; }
  // where the money gathers: going down from the top, the class at which half of all the money has been counted
  let acc = 0, top = 'low'; for (const q of ['hi', 'mid']) { acc += out[q] ? out[q].s : 0; if (acc >= 0.5) { top = q; break; } }
  return { out, n, w, gini: clamp(gini, 0, 1), top };
}
function clsTableHTML(G) {
  const T = clsSum(G); if (!T.n) return '';
  return `<div class="etable g5c"><div class="eth"><span>ชนชั้น</span><span>คน</span><span>เงิน</span><span>ต่อหัว</span><span>อยู่ดี</span></div>`
    + ['hi', 'mid', 'low', 'poor', 'slave'].filter(q => T.out[q]).map(q => { const o = T.out[q]; return `<div class="etr"><span title="${CLS_WHO[q]}">${CLS[q]}</span><span>${ecoPc(o.p)}%</span><span>${q === 'slave' ? '' : ecoPc(o.s) + '%'}</span><span>${q === 'slave' ? '' : ecoNumF(o.ph)}</span><span>${Math.round(o.well)}</span></div>`; }).join('') + `</div>`;
}
// what the way the money falls does to a state, from the numbers the model works with
function clsVerdictHTML(G, rows, b) {
  const T = clsSum(G); if (!T.n) return ''; const o = T.out, top = T.top, coin = esc(ECO.central.name), L = [];
  const hp = o.hi ? o.hi.p : 0, hs = o.hi ? o.hi.s : 0, mp = hp + (o.mid ? o.mid.p : 0), ms = hs + (o.mid ? o.mid.s : 0);
  L.push((top === 'hi' ? `ความมั่งคั่ง (รายได้ต่อปี) <b>กระจุกที่ชนชั้นสูง</b>: คนร้อยละ ${ecoPc(hp)} ถือเงินร้อยละ ${ecoPc(hs)} เกินครึ่งของทั้งหมด`
    : top === 'mid' ? `ความมั่งคั่ง (รายได้ต่อปี) <b>กระจุกที่ชนชั้นสูงและกลาง</b>: คนร้อยละ ${ecoPc(mp)} ถือเงินร้อยละ ${ecoPc(ms)} (ชนชั้นสูงลำพังร้อยละ ${ecoPc(hs)})`
    : `ความมั่งคั่ง (รายได้ต่อปี) <b>กระจายถึงชนชั้นล่าง</b>: ชนชั้นสูงและกลางรวมกันถือเงินร้อยละ ${ecoPc(ms)} ไม่ถึงครึ่ง`)
    + ` · ดัชนีความเหลื่อมล้ำ <b>${T.gini.toFixed(2)}</b> <span class="w">(0 ทุกคนได้เท่ากัน 1 คนกลุ่มเดียวได้ทั้งหมด)</span>`);
  const ppl = rows.reduce((a, r) => a + r.people, 0) || 1, rich = rows.reduce((a, r) => a + (r.c.rich0 == null ? TU('richRef') : r.c.rich0) * r.people, 0) / ppl;
  L.push(`ชนชั้นสูงและกลางมีรายได้รวมร้อยละ ${ecoPc(rich)} ความต้องการของฟุ่มเฟือย (ของหายาก โลหะมีค่า ตำรา เครื่องกล สมุนไพร) จึงเป็น <b>×${clamp(rich / TU('richRef'), 0.2, 2.5).toFixed(2)}</b> ของค่ากลาง`);
  const c0 = rows[0] && rows[0].c, miss = b && c0 && c0.dom ? ERAW.filter(cat => ECAT[cat] && !SOC_BASIC.has(cat) && !SOC_LUX.has(cat) && rows.some(r => ENEED[cat] && ENEED[cat][r.c.ki] > 0) && !c0.dom.has(cat)) : [];
  if (miss.length) L.push(`${b ? 'รัฐนี้' : 'เมืองเหล่านี้'}ไม่มี${miss.map(c => esc(ECAT[c].name)).join(' ')}เอง คนที่ไม่มั่งคั่งจึงไม่ซื้อ ความต้องการเหลือราวร้อยละ ${ecoPc(rich)}`);
  if (b) L.push(`ของพื้นฐานจากนอกรัฐต้องถูกกว่าของในรัฐราวร้อยละ ${ecoPc(TU('homePref') * (1 - rich))} คนจึงยอมซื้อ`);
  if (o.slave && o.slave.n >= 1) L.push(`ทาส ${ecoNumF(Math.round(o.slave.n))} คน อยู่ดี <b>${Math.round(o.slave.well)}</b> ${o.mid && o.slave.well > o.mid.well ? '<b>ดีกว่าชนชั้นกลาง</b> (' + Math.round(o.mid.well) + ') เพราะเงินกระจุกอยู่กับชนชั้นสูงที่ถือทาส' : 'ต่ำกว่าชนชั้นกลาง (' + (o.mid ? Math.round(o.mid.well) : 0) + ') ยิ่งเงินไปกระจุกกับชนชั้นสูง ทาสยิ่งอยู่ดี'}`);
  if (o.poor) L.push(`ล่างสุด ร้อยละ ${ecoPc(o.poor.p)} ของคน อยู่ดี ${Math.round(o.poor.well)} อยู่ได้ด้วยทาน${o.low ? ` ชนชั้นล่างอยู่ดี ${Math.round(o.low.well)}` : ''}`);
  if (b) {
    if (b.net > 0 && b.gdp > 0) L.push(`เกินดุล ${socN(b.net)} ${coin} เงินส่วนเกินไหลเข้าชนชั้นสูงและกลางที่ค้าขาย${b.fx > 0.001 ? ` และค่าเงินแข็งขึ้นร้อยละ ${ecoPc(b.fx)} ของส่งออกจึงแพงขึ้นในสายตาต่างรัฐ ของนำเข้าถูกลง` : ''}`);
    else if (b.net < 0 && b.fx < -0.001) L.push(`ขาดดุล ค่าเงินอ่อนลงร้อยละ ${ecoPc(-b.fx)} ของส่งออกขายง่ายขึ้น ของนำเข้าแพงขึ้น`);
    if (b.stable) L.push(`ค้าสมดุล ความเป็นอยู่ +${TU('balWell')} และคนย้ายออกน้อยลงร้อยละ ${ecoPc(TU('balStay'))}`);
  }
  return `<div class="clsv">${L.map(t => `<div class="tr">${t}</div>`).join('')}</div>`;
}
function clsGdpHTML() {
  if (!ECON || !SOC || !SOC.cls) return ''; const rows = ecoIncome(ecoGdp());
  let h = `<div class="clsgrp"><h4>ทั้งแผนที่</h4>${clsTableHTML(SOC.cls)}${clsVerdictHTML(SOC.cls, rows, null)}</div>`;
  for (const b of [...SOC.books.values()].sort((x, y) => y.gdp - x.gdp)) if (b.cls) h += `<div class="clsgrp"><h4><i class="sdot" style="background:${b.s.color}"></i>${esc(b.s.name)} <small>${ESYS[b.s.sys][0]}</small> <button type="button" class="lnk" data-sopen="${b.s.id}">เปิดการ์ดรัฐ</button></h4>${clsTableHTML(b.cls)}${clsVerdictHTML(b.cls, rows.filter(r => r.s === b.s), b)}</div>`;
  return `<details class="efold" data-fold="gcl"${GDPV.gcl ? ' open' : ''}><summary>ชนชั้นและความมั่งคั่ง <small>${SOC.books.size + 1} กลุ่ม</small></summary>${h}<p class="note">ชนชั้นวัดจากแหล่งรายได้ของเมือง: ค่าเช่าที่ดินและเหมือง กำไรโรงงาน ส่วนต่างการค้าและเงินนักท่องเที่ยว เงินเดือนข้าราชการและทหาร และค่าแรง ส่วนแบ่งของแต่ละก้อนขึ้นกับระบอบ ค่าแรงที่ถูก ระเบียบงาน ทาส และเงินเกินดุล คนที่ไม่มีงานเป็นชนชั้นล่างสุดและอยู่ด้วยทาน ชี้ที่ชื่อชนชั้นเพื่อดูว่าใครอยู่ในชั้นนั้น ตัวเลขทั้งหมดอยู่ในแท็บตัวเลข หมวดชนชั้น</p></details>`;
}
{ const g = ecoGdpHTML; ecoGdpHTML = function () { return g() + clsGdpHTML(); }; }
{
  const t = tradeCityHTML; tradeCityHTML = function (k) {
    let h = t(k); const rows = ecoIncome(ecoGdp()), r = rows[k]; if (!r || !r.cls) return h;
    const G = {}; for (const q in r.cls) G[q] = { n: r.cls[q].n, inc: r.cls[q].inc, wn: r.cls[q].well * r.cls[q].n };
    const add = `<h3>ชนชั้นในเมือง</h3>${clsTableHTML(G)}`, at = h.indexOf('<!--prod-->'); return at >= 0 ? h.slice(0, at) + add + h.slice(at) : h + add;
  };
  const st = socStateCardHTML; socStateCardHTML = function (s) { let h = st(s); const b = SOC && SOC.books.get(s.id); if (b && b.cls) { const rows = ecoIncome(ecoGdp()).filter(r => r.s === s); h += `<h4>ชนชั้นและความมั่งคั่ง</h4>${clsTableHTML(b.cls)}${clsVerdictHTML(b.cls, rows, b)}`; } return h; };
}

// ---------- a city's reach, on the map (v0.14.0): the land it works for its goods, and the farther land it sends out to ----------
let reachKey = '', reachP = null;
function reachSel() { if (!ECON || !ECON.hin) return -1; const id = mode === 'trade' ? tsel : mode === 'city' ? sel : null; return id ? ECON.cities.findIndex(c => c.id === id) : -1; }
function reachOf(k) {
  const key = ECON.ver + '|' + k; if (key === reachKey && reachP) return reachP; reachKey = key;
  const fi = new Path2D(), fo = new Path2D(), ei = new Path2D(), eo = new Path2D(), I = ECON.hin, O = ECON.hout; let ni = 0, no = 0;
  for (let i = 0; i < N; i++) {
    const a = I[i] === k, b = O[i] === k; if (!a && !b) continue; if (isW(eff(i))) continue;
    if (a) ni++; else no++; hexPath(a ? fi : fo, i, 1);
    for (let j = 0; j < 6; j++) { const v = NB[i * 6 + j], same = v >= 0 && !isW(eff(v)) && (a ? I[v] === k : I[v] === k || O[v] === k); if (same) continue; const e = EDGE[j], e2 = (e + 1) % 6, P = a ? ei : eo; P.moveTo(CX[i] + R * COS[e], CY[i] + R * SIN[e]); P.lineTo(CX[i] + R * COS[e2], CY[i] + R * SIN[e2]); }
  }
  return reachP = { fi, fo, ei, eo, ni, no };
}
function reachDraw() {
  const k = reachSel(); if (k < 0) return; const P = reachOf(k), px = 1 / view.s;
  ctx.save(); ctx.setTransform(dpr * view.s, 0, 0, dpr * view.s, dpr * view.x, dpr * view.y); ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(255,206,110,.1)'; ctx.fill(P.fo); ctx.fillStyle = 'rgba(255,206,110,.28)'; ctx.fill(P.fi);
  ctx.lineCap = 'round'; ctx.setLineDash([Math.max(1.5, 4 * px), Math.max(1.5, 4 * px)]); ctx.strokeStyle = 'rgba(255,214,130,.7)'; ctx.lineWidth = Math.max(0.4, 1.2 * px); ctx.stroke(P.eo);
  ctx.setLineDash([]); ctx.strokeStyle = 'rgba(30,20,8,.75)'; ctx.lineWidth = Math.max(0.8, 3.4 * px); ctx.stroke(P.ei); ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = Math.max(0.5, 1.8 * px); ctx.stroke(P.ei);
  ctx.restore();
}
{ const under = drawUnderNames; drawUnderNames = function () { if (under) under(); reachDraw(); }; }
{ const t = tradeCityHTML; tradeCityHTML = function (k) { const h = t(k); if (!ECON || !ECON.hin) return h; const P = reachOf(k), c = ECON.cities[k], line = `<div class="tr">เก็บเกี่ยวรอบเมือง <b>${P.ni}</b> ช่อง ไกลสุด ${c.reach} ช่อง <span class="w">และอีก ${P.no} ช่องที่ส่งคนไปหาของบางอย่าง เช่น ไม้ แร่ และของป่า (กรอบทองทึบกับกรอบประบนแผนที่)</span></div>`, at = h.indexOf('<h3>ประชากรและความเป็นอยู่</h3>'); return at >= 0 ? h.slice(0, at) + line + h.slice(at) : h + line; }; }
{ const cf = ecoCityForm; ecoCityForm = function () { cf(); if (!sel || !ECON || !ECON.hin || !$('cfHint')) return; const k = ECON.cities.findIndex(c => c.id === sel); if (k < 0) return; const P = reachOf(k), tx = `เก็บเกี่ยวรอบเมือง ${P.ni} ช่อง ไกลสุด ${ECON.cities[k].reach} ช่อง (กรอบทองบนแผนที่)`, cur = $('cfHint').textContent.split(' · ').filter(x => !x.startsWith('เก็บเกี่ยวรอบเมือง')); $('cfHint').textContent = [...cur, tx].join(' · '); requestDraw(); }; }

// ---------- one card for each state, one card for each city (v0.14.0, the owner: easy, friendly, not scattered) ----------
// Everything about a state is set in one card in the states tab, in sections in the order a person thinks of them: what it is
// called and pays in, how it is ruled, how its people live and work, whom it deals with, what it does when it buys too much, and
// how its year went. The card's head carries the numbers worth a glance. From the trade map, a state's card has a button to open
// its settings, and from the settings a button to see it on the trade map. A city's card in the trade view folds by section.
const socStat = s => { const b = SOC && SOC.books.get(s.id); return b ? b : null; };
function stateChips(s, cnt) {
  const b = socStat(s), cs = b && b.cls ? clsSum(b.cls) : null, coin = esc(ECO.central.name);
  if (!b) return `<span class="chip0">${cnt || 0} ช่อง · ยังไม่มีเมือง</span>`;
  const r = b.gdp > 0 ? b.net / b.gdp : 0;
  return `<span class="chip0">${b.cities} เมือง</span><span class="chip0">${socN(b.people)} คน</span><span class="chip0" title="GDP ต่อปี">${ecoNumF(b.gdp)} ${coin}</span>`
    + `<span class="chip0 ${b.stable ? 'ok' : r >= 0 ? 'pos' : 'neg'}" title="ดุลการค้าต่อ GDP">${b.stable ? 'สมดุล' : r >= 0 ? 'เกินดุล' : 'ขาดดุล'} ${r >= 0 ? '+' : '−'}${ecoPc(Math.abs(r))}%</span>`
    + (cs ? `<span class="chip0" title="ดัชนีความเหลื่อมล้ำ 0 ถึง 1">เหลื่อมล้ำ ${cs.gini.toFixed(2)}</span>` : '');
}
ecoStatesHTML = function () {
  if (ECON) ecoIncome(ecoGdp());
  let h = `<div class="btns" style="margin:0 0 8px"><button type="button" class="btn" data-a="snew"${ECO.states.length >= 52 ? ' disabled' : ''}>เพิ่มรัฐ</button>${ECO.states.length > 1 ? `<button type="button" class="btn" data-a="stfold" data-v="0">พับทุกรัฐ</button><button type="button" class="btn" data-a="stfold" data-v="1">กางทุกรัฐ</button>` : ''}</div>`;
  if (!ECO.states.length) return h + `<p class="note">ยังไม่มีรัฐ กดเพิ่มรัฐ แล้วกดปุ่มระบายเขตในการ์ดของรัฐเพื่อระบายเขตลงบนแผนที่ ระบายลงทะเลได้เพื่อกำหนดน่านน้ำ เมืองขึ้นกับรัฐของช่องที่ตั้งอยู่</p>`;
  const cnt = {}; for (const z of ECO.cells) if (z !== '.') cnt[z] = (cnt[z] || 0) + 1;
  const dis = editable ? '' : ' disabled', sel = (f, table, cur, extra) => `<select data-f="${f}"${extra || ''}${dis}>${Object.entries(table).map(([k, v]) => `<option value="${k}"${k === cur ? ' selected' : ''}>${v[0]}</option>`).join('')}</select>`;
  for (const s of ECO.states) {
    const others = s.sys === 'anar' ? [] : ECO.states.filter(o => o !== s && o.sys !== 'anar'), b = socStat(s), anar = s.sys === 'anar';
    const on = new Set(Array.isArray(s.pol) ? s.pol : EPOL_SYS[s.sys] || []), list = polList(s);
    h += `<details class="efold stfold scard" data-fold="st${s.id}"${GDPV['st' + s.id] === 0 ? '' : ' open'}><summary><i class="sdot" style="background:${s.color}"></i>${esc(s.name)} <small>${ESYS[s.sys][0]}</small><span class="schips">${stateChips(s, cnt[s.id])}</span></summary><div class="eform" data-s="${s.id}">`
      + `<div class="btns sbtns"><button type="button" class="btn${ecoPaint === s.id ? ' on' : ''}" data-a="spaint"${dis}>${ecoPaint === s.id ? 'กำลังระบายเขตของรัฐนี้' : 'ระบายเขตของรัฐนี้'}</button><button type="button" class="btn" data-a="sgo">ดูบนแผนที่การค้า</button><small class="w">${cnt[s.id] || 0} ช่องบนแผนที่</small></div>`
      + `<div class="ssec"><h5>ชื่อ สี และเงิน</h5><div class="erow"><input type="color" data-f="scolor" value="${s.color}" aria-label="สีของรัฐ"${dis}><input type="text" data-f="sname" maxlength="60" value="${esc(s.name)}" style="flex:1"${dis}></div>`
      + `<div class="erow"><label>สกุลเงิน <input type="text" data-f="scur" maxlength="30" value="${esc(s.cur)}" placeholder="${esc(ECO.central.name)}" style="width:8em"${dis}></label><label>1 หน่วย = <input type="number" data-f="srate" min="0.01" max="1000" step="0.05" value="${s.rate}"${dis}> ${esc(ECO.central.name)}</label></div>${b && Math.abs(b.fx) >= 0.001 ? `<div class="tr w">ปีนี้ค่าเงิน${b.fx > 0 ? 'แข็งขึ้น' : 'อ่อนลง'}ร้อยละ ${ecoPc(Math.abs(b.fx))} ตามดุลการค้า</div>` : ''}</div>`
      + `<div class="ssec"><h5>ระบอบและกฎหมาย</h5>` + ecoIn('ระบอบเศรษฐกิจ', sel('ssys', ESYS, s.sys)) + `<div class="tr w">${ESYS[s.sys][1]}</div>`
      + (anar ? `<div class="tr w">แรงงานทาส: ดินแดนที่ไม่มีรัฐค้าทาสเสรีเสมอ</div>` : ecoIn('แรงงานทาส', sel('sslave', ESLAVE, s.slave || 'abol')) + `<div class="tr w">${ESLAVE[s.slave || 'abol'][1]}</div>`)
      + (s.sys === 'soc' ? ecoCapHTML(s) : '') + `</div>`
      + (anar ? '' : `<div class="ssec"><h5>ผู้คนและการทำงาน</h5>` + ecoIn('คนย้ายเข้ากระจายตัว', sel('sspread', ESPREAD, s.spread || 'nat')) + `<div class="tr w">${ESPREAD[s.spread || 'nat'][1]}</div>`
        + ecoIn('ระเบียบงานของโรงงาน', sel('sreg', EREG, s.reg || 'shift')) + `<div class="tr w">${EREG[s.reg || 'shift'][1]} เมืองที่ตั้งระเบียบของตัวเองในการ์ดเมืองใช้ของตัวเอง</div></div>`)
      + (others.length ? `<div class="ssec"><h5>ความสัมพันธ์กับรัฐอื่น</h5><div class="srel">${others.map(o => `<label><i class="sdot" style="background:${o.color}"></i><span>${esc(o.name)}</span><select data-f="srel" data-o="${o.id}"${dis}><option value="">เป็นกลาง</option><option value="ally"${(s.rel[o.id] || o.rel[s.id]) === 'ally' ? ' selected' : ''}>พันธมิตร</option><option value="rival"${(s.rel[o.id] || o.rel[s.id]) === 'rival' ? ' selected' : ''}>คู่อริ</option></select></label>`).join('')}</div><div class="tr w">พันธมิตรไม่กดราคากัน คู่อริไม่ค้ากันและเส้นทางผ่านแดนกันแพงขึ้น</div></div>` : '')
      + (anar ? '' : `<div class="ssec"><h5>เมื่อขาดดุลการค้า</h5><div class="polset">` + Object.entries(EPOL).map(([k, z]) => `<label title="${esc(z[1] + ' ข้อเสีย: ' + z[2])}"><input type="checkbox" data-f="spol" data-k="${k}"${on.has(k) ? ' checked' : ''}${dis}> ${z[0]}</label>`).join('') + `</div>`
        + (list.length > 1 ? ecoIn('ใช้ข้อไหนก่อน', `<select data-f="spol1"${dis}>${list.map((k, i) => `<option value="${k}"${i === 0 ? ' selected' : ''}>${EPOL[k][0]}</option>`).join('')}</select>`) : '')
        + `<div class="tr w">${list.length ? `รัฐเริ่มใช้เมื่อขาดดุลเกินร้อยละ ${ecoPc(TU('polStart'))} ของ GDP ยิ่งขาดลึกยิ่งใช้หลายข้อ ชี้ที่ชื่อนโยบายเพื่อดูผลดีและผลเสีย` : 'รัฐนี้ไม่แทรกแซง ปล่อยให้ดุลเป็นไปตามการค้า'}</div></div>`)
      + (b ? `<details class="efold sinner" data-fold="sy${s.id}"${GDPV['sy' + s.id] ? ' open' : ''}><summary>ปีนี้ของรัฐ: ดุลการค้า ชนชั้น และความมั่งคั่ง</summary><div class="tr">${socBalanceLine(b)}</div>${b.cls ? clsTableHTML(b.cls) + clsVerdictHTML(b.cls, ecoIncome(ecoGdp()).filter(r => r.s === s), b) : ''}</details>` : '')
      + `<div class="btns"><button type="button" class="btn warn" data-a="sdel"${dis}>ลบรัฐนี้</button></div></div></details>`;
  }
  return h;
};
function stateOpen(id) {                             // from anywhere: the state's card in the states tab, open and in view
  if (mode !== 'econ') setMode('econ'); ecoTab = 'states'; GDPV['st' + id] = 1; gdpKeep(); ecoRender();
  const d = document.querySelector(`#ecobody details[data-fold="st${id}"]`); if (d) { d.open = true; d.scrollIntoView({ block: 'start' }); }
}
$('ecobody').addEventListener('click', e => {
  const el = e.target.closest ? e.target.closest('[data-a="spaint"], [data-a="sgo"], [data-sopen]') : null; if (!el) return;
  if (el.dataset.sopen) { e.preventDefault(); stateOpen(el.dataset.sopen); return; }
  const id = el.closest('[data-s]') ? el.closest('[data-s]').dataset.s : null; if (!id) return;
  if (el.dataset.a === 'spaint') { if (!editable) return; ecoPaint = ecoPaint === id ? null : id; ecoRender(); requestDraw(); }
  else { setMode('trade'); selectState(id); }
});
$('tradebody').addEventListener('click', e => { const el = e.target.closest ? e.target.closest('[data-sopen]') : null; if (el) stateOpen(el.dataset.sopen); });
// the state's card on the trade map: the same numbers at the head, a way to its settings, and its sections folded
{
  const t = tradeStateHTML; tradeStateHTML = function (s) {
    if (ECON) ecoIncome(ecoGdp());
    const h = t(s), at = h.indexOf('</h3>'); const head = `<div class="schips tr">${stateChips(s)}</div><div class="btns"><button type="button" class="btn" data-sopen="${s.id}">แก้ค่าของรัฐนี้</button></div>`;
    return socFold(at >= 0 ? h.slice(0, at + 5) + head + h.slice(at + 5) : head + h, 'H4', { 'คู่ค้า': ['sp', 1], 'ตามประเภทสินค้า': ['sc', 0], 'ดุลของรัฐในปีนี้': ['sb', 1], 'ชนชั้นและความมั่งคั่ง': ['scl', 0] });
  };
}
// cut a card into folds at its headings of one level: the part before the first is its head, each heading opens a fold
function socFold(html, tag, keys, first) {
  const d = document.createElement('div'); d.innerHTML = html; const kids = [...d.childNodes], out = [];
  let i = 0; const head = document.createElement('div');
  if (first) { while (i < kids.length && !(kids[i].nodeType === 1 && kids[i].tagName === 'H3')) head.appendChild(kids[i++]); if (i < kids.length) head.appendChild(kids[i++]); while (i < kids.length && kids[i].nodeType === 1 && kids[i].matches('.tr.w, .schips')) head.appendChild(kids[i++]); }
  let cur = first ? { key: first[0], title: first[1], nodes: [] } : null; const groups = [];
  for (; i < kids.length; i++) {
    const n = kids[i];
    if (n.nodeType === 1 && (n.tagName === tag || (tag === 'H3' && n.tagName === 'H4')) && keys[n.textContent.trim()]) { if (cur) groups.push(cur); cur = { key: keys[n.textContent.trim()][0], def: keys[n.textContent.trim()][1], title: n.innerHTML, nodes: [] }; continue; }
    if (n.nodeType === 1 && n.tagName === 'DETAILS' && n.classList.contains('tfold')) { if (cur) groups.push(cur); groups.push({ raw: n }); cur = null; continue; }
    if (n.nodeType === 1 && n.matches('.tr') && /^เก็บเกี่ยวรอบเมือง/.test(n.textContent.trim())) { head.appendChild(n); continue; }
    if (!cur) { if (!groups.length) { head.appendChild(n); continue; } cur = { key: 'more', title: 'อื่น ๆ', nodes: [] }; }
    cur.nodes.push(n);
  }
  if (cur) groups.push(cur);
  let s = head.innerHTML;
  for (const g of groups) {
    if (g.raw) { s += g.raw.outerHTML; continue; }
    if (!g.nodes.some(n => n.nodeType === 1 || (n.textContent || '').trim())) continue;
    const open = TCV[g.key] != null ? TCV[g.key] === 1 : g.def != null ? !!g.def : false, box = document.createElement('div'); for (const n of g.nodes) box.appendChild(n.cloneNode(true));
    s += `<details class="tfold" data-tfold="${g.key}"${open ? ' open' : ''}><summary>${g.title}</summary>${box.innerHTML}</details>`;
  }
  return s;
}
{
  const t = tradeCityHTML; tradeCityHTML = function (k) {
    const h = t(k), rows = ECON ? ecoIncome(ecoGdp()) : [], r = rows[k];
    const chips = r ? `<div class="schips tr"><span class="chip0">${socN(r.people)} คน</span><span class="chip0" title="ความเป็นอยู่ 0 ถึง 100">อยู่ดี ${Math.round(r.well)}</span><span class="chip0" title="GDP ต่อปี">${ecoNumF(r.gdp)} ${esc(ECO.central.name)}</span><span class="chip0" title="รายได้ต่อหัว">ต่อหัว ${ecoNumF(r.inc / r.people)}</span>${r.s ? `<span class="chip0 link" data-sopen="${r.s.id}" title="เปิดการ์ดตั้งค่าของรัฐ"><i class="sdot" style="background:${r.s.color}"></i>${esc(r.s.name)}</span>` : ''}</div>` : '';
    const at = h.indexOf('</h3>'), h2 = at >= 0 ? h.slice(0, at + 5) + chips + h.slice(at + 5) : chips + h;
    return socFold(h2, 'H3', { 'ประชากรและความเป็นอยู่': ['people', 1], 'ชนชั้นในเมือง': ['cls', 0], 'ส่งออก': ['exp', 0], 'นำเข้า': ['imp', 0], 'ยังขาด': ['short', 1], 'ขายไม่หมด': ['spare', 0], 'แรงงานทาส': ['slv', 0] }, ['rank', 'ศูนย์การค้าและการส่งต่อ']);
  };
}
