// ---------- forms of government and the marks of a state (v0.21.0) ----------
// The owner asked (26 Nov 2026) that the units of government be named, and power be spread, by the form of the state: a republic,
// a kingdom, an empire, a confederation, a federation, a council of tribes and the rest; Claude was to think up forms enough to
// cover the ground; and then marks of each form for the owner to tick, many of them.
// What a form sets:
//   names     the three land tiers, the border and self-ruling kinds of the third, and the state itself
//   loc       the local tax of each tier, a share of what its people make, kept and spent by the unit itself (29m)
//   cMul      how much of the central taxes of the state's economic system the centre actually levies
//   fx        how settled people are, how much sticks to fingers, and what the communities do (the channels below)
// A mark is a law or an institution: some fit any state, the rest belong to one form and act only while the state has it.
// The channels: stab (stability, points), corr (corruption, times), well (well-being, points), taxC and taxL (central and local
// taxes, times), arms, ind (times), books, att, mid, holy, reach (added), imp (import duty, times), minC and minR (the unrest of
// a culture or a faith other than the state's main one, times), road (a cut in the cost of carrying inside the state), need
// (what people buy, times, by class of goods). Every number is Claude's, for the owner to change.
const GOV = {
  '': { name: 'ไม่ระบุ (ใช้ชื่อที่ตั้งเอง)', why: 'ใช้ชื่อระดับที่ตั้งไว้ท้ายแท็บการปกครอง ไม่มีผลพิเศษ', loc: [0.01, 0.005, 0.005], cMul: 1, fx: {} },
  absmon: { name: 'ราชาธิปไตยเบ็ดเสร็จ', why: 'อำนาจรวมที่กษัตริย์ หัวเมืองเก็บภาษีเองน้อย ส่วนกลางเก็บมาก คอร์รัปชันในราชสำนักสูงขึ้น', n: ['เมือง', 'หัวเมือง', 'ภาค', 'เขตชายแดน', 'ประเทศราช', 'ราชอาณาจักร'], loc: [0.01, 0.005, 0.005], cMul: 1.1, fx: { stab: 2, corr: 1.15 } },
  conmon: { name: 'ราชาธิปไตยภายใต้รัฐธรรมนูญ', why: 'กษัตริย์เป็นประมุข รัฐบาลและสภาบริหาร ท้องถิ่นเก็บภาษีเองได้บ้าง คอร์รัปชันต่ำ', n: ['อำเภอ', 'จังหวัด', 'ภาค', 'เขตทหาร', 'เขตปกครองตนเอง', 'ราชอาณาจักร'], loc: [0.02, 0.01, 0], cMul: 1, fx: { stab: 3, corr: 0.85 } },
  feudal: { name: 'ราชอาณาจักรศักดินา', why: 'แบบ Crusader Kings III ขุนนางแต่ละชั้นเก็บภาษีบนที่ดินของตัวเองมาก ส่งเข้าราชสำนักน้อย ทำอาวุธได้มาก', n: ['เคาน์ตี', 'ดัชชี', 'คิงดอม', 'มาร์ช', 'ราชรัฐ', 'ราชอาณาจักร'], loc: [0.06, 0.03, 0.02], cMul: 0.6, fx: { stab: -2, corr: 1.1, arms: 1.1 } },
  elective: { name: 'ราชาธิปไตยแบบเลือกตั้ง', why: 'ผู้ครองแคว้นใหญ่เลือกประมุข แบบจักรวรรดิโรมันอันศักดิ์สิทธิ์ แคว้นเก็บภาษีเองเกือบทั้งหมด ส่วนกลางอ่อน', n: ['เคาน์ตี', 'ดัชชี', 'อิเล็กโทเรต', 'มาร์ช', 'นครอิสระ', 'จักรวรรดิ'], loc: [0.05, 0.04, 0.02], cMul: 0.5, fx: { stab: -3, corr: 1.05 } },
  mandala: { name: 'มณฑลราช (มันดาลา)', why: 'แบบรัฐโบราณในอุษาคเนย์ อำนาจแผ่จากเมืองหลวงแล้วจางลงตามระยะ หัวเมืองชั้นนอกและประเทศราชส่งบรรณาการ', n: ['เมือง', 'หัวเมืองชั้นใน', 'หัวเมืองชั้นนอก', 'หัวเมืองชายแดน', 'เมืองประเทศราช', 'อาณาจักร'], loc: [0.04, 0.03, 0.03], cMul: 0.7, fx: { holy: 0.3 } },
  empire: { name: 'จักรวรรดิ', why: 'ปกครองหลายชนชาติผ่านข้าหลวง คนต่างวัฒนธรรมไม่ค่อยกระด้างกระเดื่อง กองทัพใหญ่', n: ['จังหวัด', 'แคว้น', 'มณฑลอุปราช', 'เขตชายแดน', 'รัฐบรรณาการ', 'จักรวรรดิ'], loc: [0.02, 0.02, 0.01], cMul: 1, fx: { stab: 1, minC: 0.7, arms: 1.1 } },
  theocracy: { name: 'เทวาธิปไตย', why: 'นักบวชปกครอง คนศาสนาเดียวกันมั่นคงขึ้น คนต่างศาสนาไม่พอใจมากขึ้น ศาสนสถานศักดิ์สิทธิ์ขึ้น', n: ['เขตวัด', 'สังฆมณฑล', 'อัครสังฆมณฑล', 'เขตนักรบศาสนา', 'อารามปกครองตนเอง', 'รัฐศาสนา'], loc: [0.03, 0.02, 0.01], cMul: 0.9, fx: { stab: 3, minR: 1.6, holy: 0.5, books: 0.1 } },
  republic: { name: 'สาธารณรัฐ', why: 'ประชาชนเลือกผู้นำ ท้องถิ่นมีสภาของตัวเอง คอร์รัปชันต่ำ ชนชั้นกลางโต', n: ['อำเภอ', 'จังหวัด', 'ภาค', 'เขตความมั่นคง', 'เขตปกครองพิเศษ', 'สาธารณรัฐ'], loc: [0.02, 0.015, 0], cMul: 1, fx: { corr: 0.85, mid: 0.02 } },
  merchrep: { name: 'สาธารณรัฐพาณิชย์', why: 'แบบเวนิสและเจนัว ตระกูลพ่อค้าปกครอง ภาษีนำเข้าต่ำ ชนชั้นกลางมาก', n: ['ตำบลการค้า', 'ดินแดน', 'อาณาเขต', 'ป้อมสถานี', 'สถานีการค้าอิสระ', 'สาธารณรัฐ'], loc: [0.02, 0.01, 0.01], cMul: 0.9, fx: { mid: 0.04, imp: 0.7, att: 0.05 } },
  citystate: { name: 'นครรัฐ', why: 'นครเดียวปกครองชนบทรอบตัว คนผูกพันกับนคร มั่นคง', n: ['ย่าน', 'ชานนคร', 'ดินแดนรอบนคร', 'ป้อมนอกนคร', 'เมืองพันธมิตร', 'นครรัฐ'], loc: [0.03, 0.01, 0], cMul: 1, fx: { stab: 4, ind: 1.05 } },
  federation: { name: 'สหพันธรัฐ', why: 'มลรัฐในสหพันธ์มีรัฐบาลและภาษีของตัวเอง ส่วนกลางดูแลกลาโหม การต่างประเทศ และเงินตรา', n: ['เทศมณฑล', 'มลรัฐ', 'ภูมิภาค', 'เขตกลาโหม', 'ดินแดนปกครองตนเอง', 'สหพันธรัฐ'], loc: [0.02, 0.05, 0], cMul: 0.75, fx: { stab: 2, minC: 0.8 } },
  confed: { name: 'สมาพันธรัฐ', why: 'รัฐสมาชิกอธิปไตยเต็มรวมกันหลวม ๆ ส่วนกลางแทบไม่มีภาษีของตัวเอง', n: ['เขต', 'แคนตัน', 'สันนิบาต', 'เขตป้องกันร่วม', 'แคนตันอิสระ', 'สมาพันธรัฐ'], loc: [0.03, 0.07, 0.01], cMul: 0.35, fx: { stab: 3, corr: 0.9, arms: 0.9 } },
  tribal: { name: 'สภาชนเผ่า', why: 'หัวหน้าเผ่าประชุมกันตัดสินเรื่องใหญ่ แต่ละเผ่าดูแลกันเอง คนอยู่ดี ทำอาวุธเก่ง งานช่างน้อย', n: ['ถิ่น', 'เผ่า', 'สหเผ่า', 'ถิ่นนักรบ', 'เผ่าอิสระ', 'สภาชนเผ่า'], loc: [0.03, 0.03, 0.01], cMul: 0.4, fx: { stab: 2, well: 1, arms: 1.15, ind: 0.9 } },
  khanate: { name: 'ข่านาเต (รัฐทุ่งหญ้า)', why: 'รัฐของคนเลี้ยงสัตว์เร่ร่อน แบ่งคนเป็นหมื่นครัวและปีกทัพ ทหารม้าเก่ง เก็บเกี่ยวได้ไกล', n: ['ยูร์ต', 'ตูเมน', 'อูลุส', 'ปีกทัพ', 'ข่านบริวาร', 'ข่านาเต'], loc: [0.02, 0.03, 0.03], cMul: 0.6, fx: { stab: -2, arms: 1.25, reach: 1, ind: 0.85 } },
  oligarchy: { name: 'คณาธิปไตย', why: 'ตระกูลร่ำรวยไม่กี่ตระกูลกุมอำนาจ คอร์รัปชันสูง ชนชั้นกลางถูกกด', n: ['เขต', 'จังหวัด', 'ภาค', 'เขตทหาร', 'เขตสัมปทาน', 'รัฐ'], loc: [0.02, 0.01, 0.01], cMul: 0.9, fx: { stab: -1, corr: 1.2, mid: -0.02 } },
  junta: { name: 'รัฐบาลทหาร', why: 'กองทัพปกครอง หน่วยพื้นที่เป็นหน่วยทหาร ทำอาวุธมาก คนไม่พอใจ คอร์รัปชันสูง', n: ['เขตปกครอง', 'กองพลพื้นที่', 'กองทัพภาค', 'เขตยุทธศาสตร์', 'เขตพลเรือนพิเศษ', 'รัฐบาลทหาร'], loc: [0.01, 0.01, 0.02], cMul: 1.15, fx: { stab: -4, well: -1, corr: 1.25, arms: 1.35 } },
  party: { name: 'รัฐพรรคเดียว', why: 'พรรคเดียวคุมรัฐ วางแผนจากส่วนกลาง เก็บภาษีเข้าศูนย์กลางเกือบทั้งหมด', n: ['อำเภอ', 'จังหวัด', 'ภาค', 'เขตป้องกันชายแดน', 'เขตปกครองตนเอง', 'สาธารณรัฐประชาชน'], loc: [0.01, 0.01, 0.01], cMul: 1.2, fx: { stab: 2, corr: 1.1, ind: 1.05, mid: -0.02, minC: 1.2 } },
  company: { name: 'รัฐบรรษัท', why: 'บริษัทการค้าปกครองดินแดนเพื่อกำไร แบบบริษัทอินเดียตะวันออก ผลิตมาก คนอยู่ไม่ดี', n: ['สถานีการค้า', 'เขตสัมปทาน', 'เพรสซิเดนซี', 'ป้อมของบริษัท', 'รัฐในอารักขา', 'ดินแดนของบริษัท'], loc: [0.01, 0.01, 0.01], cMul: 1.1, fx: { stab: -3, well: -2, ind: 1.1, imp: 0.6 } },
  commune: { name: 'สหพันธ์คอมมูน', why: 'คอมมูนปกครองตนเองรวมกันจากล่างขึ้นบน คอมมูนเก็บและใช้เงินเอง คนอยู่ดี ชนชั้นกลางน้อย', n: ['คอมมูน', 'สภาเขต', 'สหภาพภาค', 'เขตอาสาป้องกัน', 'คอมมูนอิสระ', 'สหพันธ์เสรี'], loc: [0.06, 0.02, 0], cMul: 0.3, fx: { well: 2, corr: 0.8, mid: -0.03, ind: 0.95 } },
  magocracy: { name: 'รัฐปราชญ์', why: 'ผู้รอบรู้และผู้ใช้พลังปกครองตามสำนัก ตำราและความรู้มาก', n: ['เขตสำนัก', 'แคว้นวิทยาลัย', 'ภาคหอคอย', 'ป้อมผู้พิทักษ์', 'สำนักอิสระ', 'รัฐปราชญ์'], loc: [0.02, 0.02, 0.01], cMul: 1, fx: { stab: -1, books: 0.4, ind: 1.05 } },
};
const GOVG = [['ราชาธิปไตย', ['absmon', 'conmon', 'feudal', 'elective', 'mandala', 'empire']], ['สาธารณรัฐและนคร', ['republic', 'merchrep', 'citystate', 'oligarchy']], ['รวมกันหลายรัฐ', ['federation', 'confed']], ['ชนเผ่าและทุ่งหญ้า', ['tribal', 'khanate']], ['อำนาจรวมศูนย์แบบอื่น', ['theocracy', 'junta', 'party', 'company', 'magocracy']], ['ล่างขึ้นบน', ['commune']]];
// the marks: [name, what it does in words, its channels, the form it belongs to ('' fits any)]
const GTR = {
  // any state
  bureau: ['ระบบราชการเข้มแข็ง', 'คอร์รัปชัน ×0.8 ภาษีส่วนกลาง ×1.05', { corr: 0.8, taxC: 1.05 }, ''],
  exam: ['สอบคัดเลือกขุนนาง', 'คอร์รัปชัน ×0.85 ตำราเพิ่ม', { corr: 0.85, books: 0.1 }, ''],
  census: ['สำมะโนครัวทั่วราชอาณาจักร', 'ภาษีส่วนกลาง ×1.1 เสถียรภาพ −1', { taxC: 1.1, stab: -1 }, ''],
  code: ['ประมวลกฎหมายลายลักษณ์อักษร', 'เสถียรภาพ +3 คอร์รัปชัน ×0.9', { stab: 3, corr: 0.9 }, ''],
  roads: ['ถนนหลวงและไปรษณีย์', 'ค่าขนในรัฐถูกลง 5%', { road: 0.05 }, ''],
  army: ['กองทัพประจำการ', 'อาวุธ ×1.2 ความเป็นอยู่ −0.5', { arms: 1.2, well: -0.5 }, ''],
  levy: ['เกณฑ์ไพร่พล', 'อาวุธ ×1.3 ความเป็นอยู่ −1.5', { arms: 1.3, well: -1.5 }, ''],
  tolerate: ['ขันติธรรมทางศาสนา', 'ความไม่พอใจของคนต่างศาสนา ×0.4 นักท่องเที่ยวเพิ่ม', { minR: 0.4, att: 0.03 }, ''],
  statecul: ['วัฒนธรรมแห่งรัฐ', 'เสถียรภาพ +2 ความไม่พอใจของคนต่างวัฒนธรรม ×1.5', { stab: 2, minC: 1.5 }, ''],
  plural: ['รัฐพหุวัฒนธรรม', 'ความไม่พอใจของคนต่างวัฒนธรรม ×0.4 ชนชั้นกลาง +1%', { minC: 0.4, mid: 0.01 }, ''],
  press: ['สื่อเสรี', 'คอร์รัปชัน ×0.8 เสถียรภาพ −1', { corr: 0.8, stab: -1 }, ''],
  spies: ['ตำรวจลับ', 'เสถียรภาพ +4 ความเป็นอยู่ −1.5', { stab: 4, well: -1.5 }, ''],
  granary: ['ยุ้งฉางหลวง', 'ความเป็นอยู่ +1 เสถียรภาพ +2 ซื้อธัญพืชมากขึ้น 5%', { well: 1, stab: 2, need: { grain: 1.05 } }, ''],
  freeport: ['เมืองท่าเสรี', 'ภาษีนำเข้า ×0.4 นักท่องเที่ยวเพิ่ม ชนชั้นกลาง +1%', { imp: 0.4, att: 0.04, mid: 0.01 }, ''],
  wall: ['กำแพงภาษีปกป้องช่าง', 'ภาษีนำเข้า ×1.6 งานช่าง ×1.05', { imp: 1.6, ind: 1.05 }, ''],
  sumpt: ['กฎหมายห้ามฟุ่มเฟือย', 'ซื้อของหายากน้อยลง 20% เสถียรภาพ +1', { stab: 1, need: { luxury: 0.8 } }, ''],
  patron: ['อุปถัมภ์ศิลปะ', 'นักท่องเที่ยวเพิ่ม ตำราเพิ่ม ซื้อของหายากมากขึ้น', { att: 0.05, books: 0.05, need: { luxury: 1.1 } }, ''],
  academy: ['สถาบันวิชาการหลวง', 'ตำราเพิ่มมาก', { books: 0.3 }, ''],
  reform: ['ปฏิรูปที่ดิน', 'ความเป็นอยู่ +1 ชนชั้นกลาง +2% ภาษีท้องถิ่น ×0.9', { well: 1, mid: 0.02, taxL: 0.9 }, ''],
  corvee: ['แรงงานเกณฑ์สร้างทาง', 'ค่าขนในรัฐถูกลง 4% ความเป็นอยู่ −1', { road: 0.04, well: -1 }, ''],
  forts: ['ป้อมชายแดน', 'อาวุธ ×1.1 เสถียรภาพ +1', { arms: 1.1, stab: 1 }, ''],
  shrines: ['อุปถัมภ์ศาสนสถาน', 'ศักดิ์สิทธิ์ขึ้น นักท่องเที่ยวเพิ่ม', { holy: 0.5, att: 0.03 }, ''],
  amnesty: ['นิรโทษกรรมประจำรัชกาล', 'เสถียรภาพ +2 คอร์รัปชัน ×1.05', { stab: 2, corr: 1.05 }, ''],
  // ราชาธิปไตยเบ็ดเสร็จ
  divine: ['เทวราชา', 'เสถียรภาพ +3 คนต่างศาสนาไม่พอใจ ×1.2', { stab: 3, minR: 1.2 }, 'absmon'],
  court: ['ราชสำนักหรูหรา', 'ภาษีส่วนกลาง ×1.05 นักท่องเที่ยวเพิ่ม ซื้อของหายากมากขึ้น 20%', { taxC: 1.05, att: 0.03, need: { luxury: 1.2 } }, 'absmon'],
  roymono: ['ผูกขาดการค้าของหลวง', 'ภาษีส่วนกลาง ×1.1 ภาษีนำเข้า ×1.2 ชนชั้นกลาง −2%', { taxC: 1.1, imp: 1.2, mid: -0.02 }, 'absmon'],
  guards: ['กรมวังและองครักษ์', 'เสถียรภาพ +2 อาวุธ ×1.05', { stab: 2, arms: 1.05 }, 'absmon'],
  // ราชาธิปไตยภายใต้รัฐธรรมนูญ
  parl: ['รัฐสภาสองสภา', 'คอร์รัปชัน ×0.85 เสถียรภาพ +1', { corr: 0.85, stab: 1 }, 'conmon'],
  cabinet: ['คณะรัฐมนตรีรับผิดชอบต่อสภา', 'คอร์รัปชัน ×0.9', { corr: 0.9 }, 'conmon'],
  crown: ['ทรัพย์สินพระมหากษัตริย์แยกจากแผ่นดิน', 'คอร์รัปชัน ×0.9 ภาษีส่วนกลาง ×0.97', { corr: 0.9, taxC: 0.97 }, 'conmon'],
  rites: ['พระราชพิธีประจำปี', 'เสถียรภาพ +2 นักท่องเที่ยวเพิ่ม', { stab: 2, att: 0.04 }, 'conmon'],
  // ศักดินา
  vassal: ['ไพร่พลของขุนนาง', 'อาวุธ ×1.2 ภาษีท้องถิ่น ×1.1', { arms: 1.2, taxL: 1.1 }, 'feudal'],
  primo: ['สืบทอดแก่บุตรคนโต', 'เสถียรภาพ +3', { stab: 3 }, 'feudal'],
  serf: ['ข้าติดที่ดิน', 'ภาษีท้องถิ่น ×1.15 ความเป็นอยู่ −2 งานช่าง ×0.95', { taxL: 1.15, well: -2, ind: 0.95 }, 'feudal'],
  tourney: ['การประลองยุทธ์', 'นักท่องเที่ยวเพิ่ม อาวุธ ×1.05', { att: 0.03, arms: 1.05 }, 'feudal'],
  chivalry: ['ระเบียบอัศวิน', 'เสถียรภาพ +1 อาวุธ ×1.1', { stab: 1, arms: 1.1 }, 'feudal'],
  // ราชาธิปไตยแบบเลือกตั้ง
  electors: ['คณะเจ้าผู้เลือกตั้ง', 'ภาษีท้องถิ่น ×1.1 เสถียรภาพ −1', { taxL: 1.1, stab: -1 }, 'elective'],
  capit: ['สัญญาก่อนขึ้นครองราชย์', 'ภาษีส่วนกลาง ×0.9 เสถียรภาพ +2', { taxC: 0.9, stab: 2 }, 'elective'],
  freecity: ['สิทธิ์นครอิสระ', 'ชนชั้นกลาง +3% งานช่าง ×1.05', { mid: 0.03, ind: 1.05 }, 'elective'],
  diet: ['สภาจักรวรรดิ', 'เสถียรภาพ +2', { stab: 2 }, 'elective'],
  // มณฑลราช
  tribute: ['ส่งต้นไม้เงินต้นไม้ทอง', 'ภาษีท้องถิ่น ×0.9 ภาษีส่วนกลาง ×1.05 เสถียรภาพ +1', { taxL: 0.9, taxC: 1.05, stab: 1 }, 'mandala'],
  center: ['ราชธานีศูนย์กลางจักรวาล', 'ศักดิ์สิทธิ์ขึ้น เสถียรภาพ +1', { holy: 0.5, stab: 1 }, 'mandala'],
  elephant: ['กรมช้าง', 'อาวุธ ×1.15', { arms: 1.15 }, 'mandala'],
  marriage: ['การแต่งงานเชื่อมไมตรีกับหัวเมือง', 'เสถียรภาพ +2', { stab: 2 }, 'mandala'],
  // จักรวรรดิ
  satrap: ['ข้าหลวงปกครองมณฑล', 'ภาษีท้องถิ่น ×1.1 คอร์รัปชัน ×1.1', { taxL: 1.1, corr: 1.1 }, 'empire'],
  cult: ['ลัทธิบูชาจักรพรรดิ', 'เสถียรภาพ +2 คนต่างศาสนาไม่พอใจ ×1.2', { stab: 2, minR: 1.2 }, 'empire'],
  legion: ['กองทัพจักรวรรดิ', 'อาวุธ ×1.25', { arms: 1.25 }, 'empire'],
  tribsys: ['ระบบบรรณาการ', 'ภาษีส่วนกลาง ×1.05', { taxC: 1.05 }, 'empire'],
  lingua: ['ภาษากลางของจักรวรรดิ', 'คนต่างวัฒนธรรมไม่พอใจ ×0.8 ชนชั้นกลาง +1%', { minC: 0.8, mid: 0.01 }, 'empire'],
  // เทวาธิปไตย
  inquis: ['ศาลศาสนา', 'เสถียรภาพ +3 คนต่างศาสนาไม่พอใจ ×2 ความเป็นอยู่ −1', { stab: 3, minR: 2, well: -1 }, 'theocracy'],
  temple: ['เศรษฐกิจศาสนสถาน', 'ศักดิ์สิทธิ์ขึ้น ภาษีส่วนกลาง ×0.9 ใช้หินมากขึ้น', { holy: 0.5, taxC: 0.9, need: { stone: 1.1 } }, 'theocracy'],
  holywar: ['สงครามศักดิ์สิทธิ์', 'อาวุธ ×1.25', { arms: 1.25 }, 'theocracy'],
  cloister: ['โรงเรียนในอาราม', 'ตำราเพิ่มมาก', { books: 0.25 }, 'theocracy'],
  alms: ['ทานบารมี', 'ความเป็นอยู่ +1.5', { well: 1.5 }, 'theocracy'],
  // สาธารณรัฐ
  checks: ['แบ่งแยกอำนาจ', 'คอร์รัปชัน ×0.85', { corr: 0.85 }, 'republic'],
  terms: ['จำกัดวาระผู้นำ', 'คอร์รัปชัน ×0.85 เสถียรภาพ −1', { corr: 0.85, stab: -1 }, 'republic'],
  citizens: ['กองทัพพลเมือง', 'อาวุธ ×1.1', { arms: 1.1 }, 'republic'],
  works: ['งานโยธาสาธารณะ', 'ค่าขนในรัฐถูกลง 5%', { road: 0.05 }, 'republic'],
  suffrage: ['สิทธิเลือกตั้งทั่วไป', 'เสถียรภาพ +2 ชนชั้นกลาง +2%', { stab: 2, mid: 0.02 }, 'republic'],
  // สาธารณรัฐพาณิชย์
  guildc: ['สภาสมาคมการค้า', 'ชนชั้นกลาง +3%', { mid: 0.03 }, 'merchrep'],
  fleet: ['กองเรือพาณิชย์ติดอาวุธ', 'อาวุธ ×1.1 นักท่องเที่ยวเพิ่ม', { arms: 1.1, att: 0.02 }, 'merchrep'],
  banks: ['ธนาคารของตระกูลพ่อค้า', 'งานช่าง ×1.05 ชนชั้นกลาง +2%', { ind: 1.05, mid: 0.02 }, 'merchrep'],
  outpost: ['สถานีการค้าโพ้นทะเล', 'ภาษีนำเข้า ×0.8 ภาษีส่วนกลาง ×1.05', { imp: 0.8, taxC: 1.05 }, 'merchrep'],
  // นครรัฐ
  walls: ['กำแพงนคร', 'เสถียรภาพ +3 อาวุธ ×1.05', { stab: 3, arms: 1.05 }, 'citystate'],
  civic: ['สิทธิพลเมืองนคร', 'เสถียรภาพ +2 คนต่างวัฒนธรรมไม่พอใจ ×1.2', { stab: 2, minC: 1.2 }, 'citystate'],
  agora: ['ลานตลาดกลาง', 'ชนชั้นกลาง +2% นักท่องเที่ยวเพิ่ม', { mid: 0.02, att: 0.03 }, 'citystate'],
  league: ['สันนิบาตนครรัฐ', 'ภาษีนำเข้า ×0.7', { imp: 0.7 }, 'citystate'],
  // สหพันธรัฐ
  court1: ['ศาลสูงสุดของสหพันธ์', 'เสถียรภาพ +2 คอร์รัปชัน ×0.9', { stab: 2, corr: 0.9 }, 'federation'],
  market1: ['ตลาดร่วมภายในสหพันธ์', 'ค่าขนในรัฐถูกลง 4%', { road: 0.04 }, 'federation'],
  rights: ['สิทธิของมลรัฐ', 'ภาษีท้องถิ่น ×1.15 ภาษีส่วนกลาง ×0.95', { taxL: 1.15, taxC: 0.95 }, 'federation'],
  fedarmy: ['กองทัพสหพันธ์', 'อาวุธ ×1.1', { arms: 1.1 }, 'federation'],
  equal: ['เงินอุดหนุนเกลี่ยรายได้', 'ความเป็นอยู่ +1 ภาษีส่วนกลาง ×1.03', { well: 1, taxC: 1.03 }, 'federation'],
  // สมาพันธรัฐ
  unanim: ['มติต้องเป็นเอกฉันท์', 'คอร์รัปชัน ×0.9 เสถียรภาพ −1', { corr: 0.9, stab: -1 }, 'confed'],
  mutual: ['สนธิสัญญาป้องกันร่วม', 'อาวุธ ×1.15', { arms: 1.15 }, 'confed'],
  neutral: ['ความเป็นกลางถาวร', 'เสถียรภาพ +3 อาวุธ ×0.9 นักท่องเที่ยวเพิ่ม', { stab: 3, arms: 0.9, att: 0.03 }, 'confed'],
  cbank: ['ธนาคารของแคนตัน', 'ชนชั้นกลาง +2%', { mid: 0.02 }, 'confed'],
  // สภาชนเผ่า
  elders: ['สภาผู้อาวุโส', 'เสถียรภาพ +2', { stab: 2 }, 'tribal'],
  raid: ['การปล้นสะดม', 'อาวุธ ×1.2 ความเป็นอยู่ −1', { arms: 1.2, well: -1 }, 'tribal'],
  kin: ['สายเลือดและเครือญาติ', 'เสถียรภาพ +2 คนต่างวัฒนธรรมไม่พอใจ ×1.3', { stab: 2, minC: 1.3 }, 'tribal'],
  oral: ['กฎหมายมุขปาฐะ', 'ความเป็นอยู่ +1 คอร์รัปชัน ×1.1', { well: 1, corr: 1.1 }, 'tribal'],
  totem: ['ลัทธิบรรพบุรุษ', 'ศักดิ์สิทธิ์ขึ้นเล็กน้อย', { holy: 0.3 }, 'tribal'],
  // ข่านาเต
  yam: ['สถานีม้าเร็ว (ยาม)', 'ค่าขนในรัฐถูกลง 6%', { road: 0.06 }, 'khanate'],
  archers: ['ทหารม้ายิงธนู', 'อาวุธ ×1.3', { arms: 1.3 }, 'khanate'],
  tamga: ['ภาษีคาราวาน (ตัมฆา)', 'ภาษีส่วนกลาง ×1.1 ภาษีนำเข้า ×1.1', { taxC: 1.1, imp: 1.1 }, 'khanate'],
  kurultai: ['สภาคุรุลไต', 'เสถียรภาพ +2', { stab: 2 }, 'khanate'],
  khantol: ['ขันติธรรมของข่าน', 'คนต่างศาสนาไม่พอใจ ×0.5', { minR: 0.5 }, 'khanate'],
  // คณาธิปไตย
  pluto: ['อำนาจของเงิน', 'ชนชั้นกลาง +2% ความเป็นอยู่ −1', { mid: 0.02, well: -1 }, 'oligarchy'],
  council: ['สภาสิบคน', 'เสถียรภาพ +2 ความเป็นอยู่ −0.5', { stab: 2, well: -0.5 }, 'oligarchy'],
  taxfarm: ['เหมาภาษีให้เอกชน', 'ภาษีส่วนกลาง ×1.15 คอร์รัปชัน ×1.3', { taxC: 1.15, corr: 1.3 }, 'oligarchy'],
  patric: ['ตระกูลผู้ดีเก่า', 'เสถียรภาพ +1', { stab: 1 }, 'oligarchy'],
  // รัฐบาลทหาร
  martial: ['กฎอัยการศึก', 'เสถียรภาพ +5 ความเป็นอยู่ −2', { stab: 5, well: -2 }, 'junta'],
  wareco: ['เศรษฐกิจสงคราม', 'อาวุธ ×1.3 งานช่าง ×1.05 ซื้อของหายากน้อยลง 20%', { arms: 1.3, ind: 1.05, need: { luxury: 0.8 } }, 'junta'],
  censor: ['เซ็นเซอร์', 'เสถียรภาพ +2 ตำราลดลง', { stab: 2, books: -0.1 }, 'junta'],
  officer: ['ที่ดินของนายทหาร', 'ภาษีท้องถิ่น ×1.1 คอร์รัปชัน ×1.2', { taxL: 1.1, corr: 1.2 }, 'junta'],
  // รัฐพรรคเดียว
  plan: ['แผนพัฒนาจากส่วนกลาง', 'งานช่าง ×1.1 ชนชั้นกลาง −2%', { ind: 1.1, mid: -0.02 }, 'party'],
  cadre: ['ผู้ปฏิบัติงานพรรค', 'คอร์รัปชัน ×0.9 เสถียรภาพ +1', { corr: 0.9, stab: 1 }, 'party'],
  collect: ['นารวม', 'ความเป็นอยู่ −1 ภาษีท้องถิ่น ×1.1', { well: -1, taxL: 1.1 }, 'party'],
  propag: ['โฆษณาชวนเชื่อ', 'เสถียรภาพ +3 ตำราเพิ่มเล็กน้อย', { stab: 3, books: 0.05 }, 'party'],
  literacy: ['รณรงค์อ่านออกเขียนได้', 'ตำราเพิ่ม ชนชั้นกลาง +1%', { books: 0.2, mid: 0.01 }, 'party'],
  // รัฐบรรษัท
  share: ['ผู้ถือหุ้นต่างแดน', 'ภาษีส่วนกลาง ×1.1 ความเป็นอยู่ −1', { taxC: 1.1, well: -1 }, 'company'],
  carmy: ['กองทัพของบริษัท', 'อาวุธ ×1.2', { arms: 1.2 }, 'company'],
  charter: ['สัมปทานผูกขาด', 'ภาษีนำเข้า ×1.3 งานช่าง ×1.05', { imp: 1.3, ind: 1.05 }, 'company'],
  scrip: ['คูปองบริษัทแทนค่าแรง', 'ความเป็นอยู่ −1.5 ชนชั้นกลาง −2%', { well: -1.5, mid: -0.02 }, 'company'],
  // สหพันธ์คอมมูน
  assembly: ['สมัชชาเปิด', 'เสถียรภาพ +2 คอร์รัปชัน ×0.85', { stab: 2, corr: 0.85 }, 'commune'],
  aid: ['ช่วยเหลือซึ่งกันและกัน', 'ความเป็นอยู่ +1.5', { well: 1.5 }, 'commune'],
  militia: ['อาสารักษ์คอมมูน', 'อาวุธ ×1.1', { arms: 1.1 }, 'commune'],
  gift: ['แบ่งปันไม่ซื้อขาย', 'ความเป็นอยู่ +1 ชนชั้นกลาง −3%', { well: 1, mid: -0.03 }, 'commune'],
  // รัฐปราชญ์
  trial: ['สอบวัดพลัง', 'คอร์รัปชัน ×0.9 ตำราเพิ่ม', { corr: 0.9, books: 0.1 }, 'magocracy'],
  towers: ['หอคอยผู้พิทักษ์', 'อาวุธ ×1.15 เสถียรภาพ +1', { arms: 1.15, stab: 1 }, 'magocracy'],
  manatax: ['ภาษีมานา', 'ภาษีส่วนกลาง ×1.08', { taxC: 1.08 }, 'magocracy'],
  library: ['หอสมุดใหญ่', 'ตำราเพิ่มมาก นักท่องเที่ยวเพิ่ม', { books: 0.3, att: 0.03 }, 'magocracy'],
};
const GOV_MUL = new Set(['corr', 'taxC', 'taxL', 'arms', 'ind', 'imp', 'minC', 'minR']);
const govOf = s => (s && GOV[s.gov]) || GOV[''];
const govTraits = s => !s || !Array.isArray(s.gtr) ? [] : s.gtr.filter(t => GTR[t] && (!GTR[t][3] || GTR[t][3] === (s.gov || '')));
let GOVSTAMP = 0; const GOVC = new Map();
function govFx(s) {
  if (!s || s.sys === 'anar') return { stab: 0, corr: 1, well: 0, taxC: 1, taxL: 1, arms: 1, ind: 1, books: 0, att: 0, mid: 0, holy: 0, reach: 0, imp: 1, minC: 1, minR: 1, road: 0, need: {}, why: [] };
  const key = GOVSTAMP + '|' + (s.gov || '') + '|' + (s.gtr || []).join(','); const c = GOVC.get(s.id); if (c && c.key === key) return c.v;
  const f = { stab: 0, corr: 1, well: 0, taxC: 1, taxL: 1, arms: 1, ind: 1, books: 0, att: 0, mid: 0, holy: 0, reach: 0, imp: 1, minC: 1, minR: 1, road: 0, need: {}, why: [] };
  const add = (o, name) => { if (!o) return; for (const [k, v] of Object.entries(o)) { if (k === 'need') { for (const [c2, m] of Object.entries(v)) f.need[c2] = (f.need[c2] || 1) * m; continue; } if (!(k in f)) continue; if (GOV_MUL.has(k)) f[k] *= v; else f[k] += v; if ((k === 'stab' || k === 'well') && v) f.why.push([k, name, v]); } };
  const g = govOf(s); add(g.fx, g.name); for (const t of govTraits(s)) add(GTR[t][2], GTR[t][0]);
  f.road = Math.min(0.25, f.road); GOVC.set(s.id, { key, v: f }); return f;
}
// the names of the tiers in a state: its form's, else the ones written for the map
function admNames(s) { const g = s && GOV[s.gov]; if (!g || !g.n) return ECO.admn; const n = g.n; return { 0: n[0], 1: n[1], 2: n[2], march: n[3], princ: n[4], 3: n[5] }; }
const admStateOf = u => { if (!u) return null; const z = admIndex().st.get(u.id); return z ? ECO.states.find(s => s.id === z) || null : null; };
admTier = u => { const N0 = admNames(admStateOf(u)); return u.t === 2 && u.type ? N0[u.type] || ADMN0[u.type] : N0[u.t] || ADMN0[u.t]; };
admTitle = u => admTier(u) + (u.name ? ' ' + u.name : '');
// the state the government tab is looking at: the chosen state, the chosen unit's, else the only one
function admCtx() { if (ADM.sel && ADM.sel.startsWith('S:')) return ECO.states.find(s => s.id === ADM.sel.slice(2)) || null; const u = ADM.sel ? admById(ADM.sel) : null; if (u) return admStateOf(u); return ECO.states.length === 1 ? ECO.states[0] : null; }

// ---- where a community stands: its state, for the marks that act on communities ----
const GOVCITY = new Map(); let govCityKey = -1;
function govState(id) {
  const k = ECON ? ECON.ver : -2; if (k !== govCityKey) { GOVCITY.clear(); govCityKey = k; }
  if (GOVCITY.has(id)) return GOVCITY.get(id);
  let s = null; const ec = ECON ? ECON.cities.find(c => c.id === id) : null;
  if (ec && ec.sto) s = ec.sto; else { const v = visibleCities().find(c => c.id === id), h = v ? hexAt(v.x, v.y) : -1, z = h >= 0 ? ECO.cells[h] : '.'; s = z && z !== '.' ? ECO.states.find(x => x.id === z) || null : null; }
  GOVCITY.set(id, s); return s;
}
{
  const cf = comFx; comFx = function (id, kind) {
    const f = cf(id, kind); if (!ECO.states.length) return f; const s = govState(id); if (!s || s.sys === 'anar' || (!s.gov && !(s.gtr || []).length)) return f; const G = govFx(s);
    f.arms *= G.arms; f.ind *= G.ind; f.books += G.books; f.att += G.att; f.mid += G.mid; f.holy += G.holy; f.reach += G.reach; return f;
  };
  const cw = comWhy; comWhy = function (id, kind) { const out = cw(id, kind), s = ECO.states.length ? govState(id) : null; if (s && s.sys !== 'anar' && s.gov && GOV[s.gov]) out.push(GOV[s.gov].name + ': ' + GOV[s.gov].why); return out; };
  const sn = socNeed; socNeed = function (c, cat) { let v = sn(c, cat); const s = c && c.sto; if (!s || s.sys === 'anar' || !(s.gtr || []).length) return v; const m = govFx(s).need[cat]; return m ? v * m : v; };
  const lc = ecoLinkCost; ecoLinkCost = function (L, cities) { const c = lc(L, cities), a = cities[L.ia].sto, b = cities[L.ib].sto; if (!a || a !== b || a.sys === 'anar') return c; const r = govFx(a).road; return r > 0 ? c * (1 - r) : c; };
}

// ---- the document ----
{
  const ld = ecoLoad;
  ecoLoad = function (b) {
    ld(b); b = b || {}; const by = new Map((Array.isArray(b.states) ? b.states : []).filter(s => s && typeof s.id === 'string').map(s => [s.id, s]));
    for (const s of ECO.states) { const o = by.get(s.id) || {}; s.gov = GOV[o.gov] && o.gov ? o.gov : ''; s.gtr = (Array.isArray(o.gtr) ? o.gtr : []).filter(t => GTR[t]).slice(0, 60); if (!s.gov) delete s.gov; if (!s.gtr.length) delete s.gtr; }
    GOVSTAMP++;
  };
}

// ---- the state's card: the form and its marks, at the head of the laws ----
function govStateForm(s) {
  const dis = editable ? '' : ' disabled', g = govOf(s), on = new Set(govTraits(s)), N0 = admNames(s);
  const own = Object.entries(GTR).filter(([, z]) => z[3] && z[3] === (s.gov || '')), any = Object.entries(GTR).filter(([, z]) => !z[3]);
  const box = list => `<div class="polset gtr">${list.map(([k, z]) => `<label title="${esc(z[1])}"><input type="checkbox" data-gt="${k}"${on.has(k) ? ' checked' : ''}${dis}> ${esc(z[0])}</label>`).join('')}</div>`;
  return ecoIn('ระบอบการปกครอง', `<select data-gv="1"${dis}><option value="">${esc(GOV[''].name)}</option>${GOVG.map(([gn, ks]) => `<optgroup label="${esc(gn)}">${ks.map(k => `<option value="${k}"${k === s.gov ? ' selected' : ''}>${esc(GOV[k].name)}</option>`).join('')}</optgroup>`).join('')}</select>`)
    + `<div class="tr w">${esc(g.why)}</div>`
    + `<div class="tr w">หน่วยการปกครอง: ${esc(N0[0])} › ${esc(N0[1])} › ${esc(N0[2])} (ชายแดน: ${esc(N0.march)} · ปกครองตนเอง: ${esc(N0.princ)}) › ${esc(N0[3])} · ภาษีท้องถิ่นตั้งต้น ${g.loc.map(x => pc1(x) + '%').join(' / ')} · ส่วนกลางเก็บ ${Math.round(g.cMul * 100)}% ของอัตราตามระบอบเศรษฐกิจ</div>`
    + (own.length ? `<div class="tr"><b>คุณลักษณะของ${esc(g.name)}</b> <span class="w">ใช้ได้เฉพาะรัฐในระบอบนี้ ชี้ที่ชื่อเพื่อดูผล</span></div>` + box(own) : '')
    + `<div class="tr"><b>คุณลักษณะที่รัฐแบบไหนก็มีได้</b></div>` + box(any)
    + (on.size ? `<div class="tr w">${[...on].map(t => GTR[t][0] + ': ' + GTR[t][1]).join(' · ')}</div>` : '');
}
$('ecobody').addEventListener('change', e => {
  const el = e.target; if (!editable || !el.dataset || (!el.dataset.gv && !el.dataset.gt)) return;
  const bx = el.closest('[data-s]'), s = bx ? ECO.states.find(x => x.id === bx.dataset.s) : null; if (!s) return;
  if (el.dataset.gv) { if (GOV[el.value] && el.value) s.gov = el.value; else delete s.gov; }
  else { const set = new Set(s.gtr || []); if (el.checked) set.add(el.dataset.gt); else set.delete(el.dataset.gt); s.gtr = Object.keys(GTR).filter(t => set.has(t)); if (!s.gtr.length) delete s.gtr; }
  GOVSTAMP++; ADM.stamp++; ADM.idx = null; admSheetKey = ''; ecoChanged(true); ecoRender(); requestDraw();
});
