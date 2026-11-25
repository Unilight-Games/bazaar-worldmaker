// ---------- communities (v0.18.5): their kinds beyond the town, and the marks the owner gives them ----------
// The owner asked for "ชนิดของชุมชน" in place of "ชนิดของเมือง", four more kinds (a monastery, a hamlet, a tribal camp, a way
// station), and marks that any community may carry (a great port, a fortress, walls, the country's market, a seat of faith,
// crowded quarters), each one working on that community. A kind past the old five works at the level of a village and differs
// from it by the numbers in COMK; a mark's numbers are in COMT. The marks are kept in the economy's document, ECO.tr, by the
// community's id, so they ride its undo, its saving and its room like the head counts and holy places do.
//
// What each number does (every one of them chosen by Claude, for the owner to tune):
//   pop    the head count a community has when the owner has not counted it, times this
//   rank   the lowest level it holds as a hub of the trade network; rank3 makes it a hub of the first level; portRank lifts a
//          community with a quay one level
//   holy   holiness, as the pilgrims count it (a regional shrine is 3)
//   att    what there is to see, as the sightseers weigh it (0 to 1)
//   well   points of well-being (0 to 100)
//   ind    workshops per head, times this; arms: weapons made, times this; books: books made, added
//   reach  hexes more of land worked
//   lab    how much cheaper a day's work is (crowded quarters); mid: a larger middle class, as a share of the free people
const COMK = {
  hamlet: { pop: 0.4 },
  monastery: { pop: 0.5, holy: 2, att: 0.15, books: 0.4, well: 2 },
  camp: { pop: 0.7, reach: 1, ind: 0.5 },
  waystation: { pop: 0.35, rankMin: 1, att: 0.1 },
};
const COMT = {
  port: { name: 'เมืองท่าสำคัญ', pop: 1.1, portRank: 1, mid: 0.03, why: 'ศูนย์การค้าขึ้นหนึ่งระดับถ้ามีท่าเรือ คนเพิ่ม 10% ชนชั้นกลางมากขึ้น' },
  fort: { name: 'มีป้อมปราการ', arms: 1.5, well: 2, why: 'ผลิตอาวุธมากขึ้นครึ่งเท่า คนอยู่ปลอดภัยขึ้น' },
  wall: { name: 'มีกำแพงล้อมรอบ', pop: 0.95, well: 3, att: 0.05, why: 'คนอยู่ปลอดภัยขึ้น มีของให้ชมเพิ่ม ที่ในกำแพงจำกัด คนน้อยลง 5%' },
  trade: { name: 'ศูนย์กลางการค้าของประเทศ', pop: 1.15, rank3: 1, mid: 0.05, why: 'เป็นศูนย์กระจายสินค้าระดับสูงสุด คนเพิ่ม 15% ชนชั้นกลางมากขึ้น' },
  holy: { name: 'ศูนย์กลางศาสนา', holy: 3, att: 0.15, why: 'ศักดิ์สิทธิ์ขึ้นเท่าศูนย์แสวงบุญของภูมิภาค นักท่องเที่ยวสนใจขึ้น' },
  slum: { name: 'มีย่านแออัด', pop: 1.25, well: -6, lab: 0.04, why: 'คนเพิ่ม 25% ค่าแรงถูกลง ความเป็นอยู่แย่ลง คนจนมากขึ้น' },
};
const COMKWHY = {
  hamlet: 'คนน้อยกว่าหมู่บ้านราวครึ่งหนึ่ง',
  monastery: 'คนน้อย ศักดิ์สิทธิ์ มีคนมาแสวงบุญและเที่ยวชม คัดลอกหนังสือ และช่วยให้คนรอบ ๆ อยู่ดีขึ้นเล็กน้อย',
  camp: 'เลี้ยงสัตว์ไปไกลกว่าหมู่บ้านหนึ่งช่อง แต่งานช่างน้อยกว่าครึ่ง',
  waystation: 'คนน้อยมาก แต่เป็นจุดพักของเส้นการค้าเสมอ และมีคนผ่านมาเที่ยวชม',
};
ECO.tr = {};
const comTr = id => (ECO.tr[id] || []).filter(k => COMT[k]);
function comFx(id, kind) {                          // everything a community's kind and marks do to it, summed
  const f = { pop: 1, rank3: 0, portRank: 0, rankMin: 0, holy: 0, att: 0, well: 0, ind: 1, arms: 1, books: 0, reach: 0, lab: 0, mid: 0 };
  const add = o => { if (!o) return; for (const k of Object.keys(o)) { if (!(k in f)) continue; if (k === 'pop' || k === 'ind' || k === 'arms') f[k] *= o[k]; else if (k === 'rankMin') f[k] = Math.max(f[k], o[k]); else f[k] += o[k]; } };
  add(COMK[kind]); for (const k of comTr(id)) add(COMT[k]);
  return f;
}
const comPop = (id, kind) => ECO.pop[id] > 0 ? 1 : comFx(id, kind).pop;   // a head count the owner typed stands as typed
function comWhy(id, kind) {                         // the plain words for what the kind and the marks do
  const out = []; if (COMKWHY[kind]) out.push((CK[kind] || CK.city).name + ': ' + COMKWHY[kind]);
  for (const k of comTr(id)) out.push(COMT[k].name + ': ' + COMT[k].why);
  return out;
}

// ---- the document ----
{
  const ld = ecoLoad, sr = ecoSerial;
  ecoLoad = function (b) {
    ld(b); b = b || {}; ECO.tr = {};
    for (const [id, v] of Object.entries(b.tr || {}).slice(0, 4000)) { const a = [...new Set((Array.isArray(v) ? v : []).filter(k => COMT[k]))]; if (a.length) ECO.tr[ecoStr(id, 120)] = a; }
  };
  ecoSerial = function () { const o = sr(); if (Object.keys(ECO.tr).length) o.tr = JSON.parse(JSON.stringify(ECO.tr)); return o; };
}

// ---- the marks, in the community's own form ----
function comForm() {
  const box = $('cfTraits'); if (!box) return;
  if (!sel) { box.innerHTML = ''; return; }
  const v = visibleCities().find(c => c.id === sel); if (!v) { box.innerHTML = ''; return; }
  const on = new Set(comTr(sel)), ro = editable ? '' : ' disabled';
  box.innerHTML = `<span class="lbl">คุณลักษณะ</span>` + Object.entries(COMT).map(([k, t]) => `<label class="trait" title="${esc(t.why)}"><input type="checkbox" data-tr="${k}"${on.has(k) ? ' checked' : ''}${ro}> ${esc(t.name)}</label>`).join('');
  const why = comWhy(sel, v.kind); $('cfFx').hidden = !why.length; $('cfFx').textContent = why.join(' · ');
}
__on(document, 'change', e => {
  const el = e.target; if (!el || !el.dataset || !el.dataset.tr || !editable || !sel || !COMT[el.dataset.tr]) return;
  const a = new Set(comTr(sel)); if (el.checked) a.add(el.dataset.tr); else a.delete(el.dataset.tr);
  if (a.size) ECO.tr[sel] = [...a].filter(k => COMT[k]); else delete ECO.tr[sel];
  ecoChanged(false); ecoCityForm(); comForm();
});
{ const rf = refreshForm; refreshForm = function () { rf(); comForm(); }; }
