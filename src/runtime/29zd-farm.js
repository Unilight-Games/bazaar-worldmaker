// ---------- the farmland of a community, its beasts, and what a town gains by making much of a thing (v0.21.0) ----------
// The owner asked (26 Nov 2026) for livestock as goods, for each community to manage its own farmland, with feed and
// fertiliser working into it; and that every kind of goods should give a town something when it makes a great deal of it.
// The farmland: what share goes to grain, to pasture and to crops for sale (the rest of the fallow is in the method). The
// method of tilling, the way the herds are kept, and whether beasts pull the plough. Bought fertiliser, stall feed and draft
// beasts only help as far as the town actually gets them: the year is worked out once as if it had them all, then again with
// the share it got. Every number below is Claude's, for the owner to tune.
const FARM0 = { g: 60, p: 30, c: 10, m: 'three', h: 'graze', d: 0 };
const FARMM = {
  fallow: ['สองแปลง ปลูกครึ่ง พักครึ่ง', 'ธัญพืช ×0.85 ไม่ต้องซื้ออะไร ดินไม่เสื่อม'],
  three: ['หมุนเวียนสามแปลง', 'ธัญพืช ×1 แบบที่ใช้กันทั่วไป'],
  manure: ['ใช้ปุ๋ยคอกจากฝูงสัตว์', 'ธัญพืช ×1.12 ถ้าทุ่งเลี้ยงสัตว์ได้ตั้งแต่ร้อยละ 20 ขึ้นไป'],
  fert: ['ซื้อปุ๋ยมาใส่', 'ธัญพืชเพิ่มได้ถึง 30% ตามปุ๋ยที่หาซื้อได้จริง ต้องการปุ๋ยราว 8% ของธัญพืชที่ปลูก'],
  irrig: ['ทำชลประทาน', 'ธัญพืช ×1.25 ถ้ามีแม่น้ำหรือทะเลสาบใกล้ ไม่มีได้แค่ ×1.05 ต้องใช้หินและไม้ซ่อมคันคลอง'],
};
const FARMH = {
  graze: ['ปล่อยทุ่ง', 'ฝูงสัตว์ ×1'],
  stall: ['ขุนในคอกด้วยอาหารสัตว์', 'ฝูงสัตว์เพิ่มได้ถึง 35% ตามอาหารสัตว์ที่หาซื้อได้ ต้องการอาหารสัตว์ราว 15% ของผลผลิตฝูง'],
  nomad: ['เลี้ยงเร่ร่อน', 'ฝูงสัตว์ ×1.15 ธัญพืช ×0.9'],
};
// what a herd gives (beyond the beasts themselves) and what is grown for sale, by good
const HERDG = new Set(['cattle', 'sheep', 'poultry', 'camel', 'reindeer', 'amberdairy', 'dodod', 'bison', 'cavehog', 'drake', 'wool', 'hides', 'bisonhide', 'drakehide', 'stonewool', 'dung']);
const CASHG = new Set(['tea', 'spice', 'sugar', 'cocoa', 'wine', 'incense', 'cotton', 'flax', 'silk', 'dyes', 'manasilk', 'ironvine', 'honey', 'dates', 'oasisfruit']);
const FISHG = new Set(['lakefish', 'seafish', 'dragonalgae', 'game', 'phantomgame', 'pearl', 'whaleoil']);
ECO.farm = {};
const farmOf = id => ({ ...FARM0, ...(ECO.farm[id] || {}) });
let FARMR = null;                                    // in the second working: the share of its fertiliser, feed and beasts each town got
function farmApply(cities, prod) {
  cities.forEach((c, k) => {
    const F = farmOf(c.id), P = prod[k]; c.farmIn = null; if (!ECO.farm[c.id]) return;
    const R = FARMR && FARMR.get(c.id) || { fert: 1, feed: 1, livestock: 1 }, tot = Math.max(1, F.g + F.p + F.c);
    const gS = clamp(Math.pow((F.g / tot) / 0.6, 0.8), 0.15, 1.6), pS = clamp(Math.pow((F.p / tot) / 0.3, 0.8), 0.1, 2.5), cS = clamp(Math.pow((F.c / tot) / 0.1, 0.7), 0.2, 4);
    let gM = 1, hM = 1; const ground = typeof specGround === 'function' ? specGround(c.h) : { riv: 0, lake: 0 };
    if (F.m === 'fallow') gM *= 0.85; else if (F.m === 'manure') gM *= F.p / tot >= 0.2 ? 1.12 : 1; else if (F.m === 'fert') gM *= 1 + 0.3 * R.fert; else if (F.m === 'irrig') gM *= ground.riv + ground.lake > 0 ? 1.25 : 1.05;
    if (F.h === 'stall') hM *= 1 + 0.35 * R.feed; else if (F.h === 'nomad') { hM *= 1.15; gM *= 0.9; }
    if (F.d) gM *= 1 + 0.12 * R.livestock;
    let grain = 0, herd = 0;
    for (const [id, v] of P) {
      const cat = catOf(id); if (FISHG.has(id)) continue;
      if (cat === 'grain') { P.set(id, v * gS * gM); grain += v * gS * gM; }
      else if (cat === 'livestock' || HERDG.has(id) || (cat === 'protein')) { P.set(id, v * pS * hM); herd += v * pS * hM; }
      else if (CASHG.has(id)) P.set(id, v * cS);
    }
    const inn = {}; if (F.m === 'fert') inn.fert = 0.08 * grain; if (F.m === 'irrig') { inn.stone = 0.03 * grain; inn.timber = 0.02 * grain; } if (F.h === 'stall') inn.feed = 0.15 * herd; if (F.d) inn.livestock = 0.05 * grain;
    c.farmIn = inn; c.farmY = { grain, herd, gM, hM, R };
  });
}
{ const ha = harvApply; harvApply = function (cities, prod, own, dist) { const r = ha(cities, prod, own, dist); farmApply(cities, prod); return r; }; }
{ const an = armyNeed; armyNeed = (c, cat) => an(c, cat) + (c.farmIn && c.farmIn[cat] || 0); }
{
  const ec = econCompute; econCompute = function () {
    FARMR = null; let E = ec(); const uses = Object.values(ECO.farm).some(f => f && (f.m === 'fert' || f.h === 'stall' || f.d));
    if (!uses || !E || !E.MK) return E;
    const R = new Map(); E.cities.forEach((c, k) => { if (!c.farmIn) return; const o = {}; for (const cat of ['fert', 'feed', 'livestock']) { const mk = E.MK[k][cat], want = c.farmIn[cat] || 0; if (!want) { o[cat] = 1; continue; } const have = mk ? Math.max(0, mk[0] - mk[3] + mk[2]) : 0, all = mk ? Math.max(mk[1], 1e-9) : 1; o[cat] = clamp(have / all, 0, 1); } R.set(c.id, o); });
    FARMR = R; try { E = ec(); } finally { FARMR = null; } return E;
  };
}
// ---- the document ----
{
  const ld = ecoLoad, sr = ecoSerial;
  ecoLoad = function (b) {
    ld(b); b = b || {}; ECO.farm = {};
    for (const [id, f] of Object.entries(b.farm || {}).slice(0, 4000)) { if (!f || typeof f !== 'object') continue; const o = {}; for (const k of ['g', 'p', 'c']) if (Number.isFinite(+f[k])) o[k] = clamp(Math.round(+f[k]), 0, 100); if (FARMM[f.m]) o.m = f.m; if (FARMH[f.h]) o.h = f.h; if (f.d) o.d = 1; ECO.farm[ecoStr(id, 120)] = o; }
  };
  ecoSerial = function () { const o = sr(); if (Object.keys(ECO.farm).length) o.farm = JSON.parse(JSON.stringify(ECO.farm)); return o; };
}
// ---- the community's form ----
{
  const anchor = $('cfSpec'); if (anchor && !$('cfFarm')) { const d = document.createElement('div'); d.className = 'optrow farmrow'; d.id = 'cfFarm'; anchor.insertAdjacentElement('afterend', d); }
}
function farmForm() {
  const box = $('cfFarm'); if (!box) return; if (!sel) { box.innerHTML = ''; return; }
  const F = farmOf(sel), ro = editable ? '' : ' disabled', own = !!ECO.farm[sel], ec = ECON ? ECON.cities.find(c => c.id === sel) : null, Y = ec && ec.farmY;
  const num = k => `<input type="number" data-fm="${k}" min="0" max="100" step="5" value="${F[k]}" style="width:4em"${ro}>`;
  box.innerHTML = `<details class="efold" data-fold="farm"${own ? ' open' : ''}><summary>ที่ดินเกษตรและปศุสัตว์ <small>${own ? 'ตั้งเอง' : 'แบบทั่วไป'}</small></summary>`
    + `<div class="erow"><label>ไร่ธัญพืช ${num('g')} %</label><label>ทุ่งเลี้ยงสัตว์ ${num('p')} %</label><label>พืชเศรษฐกิจ ${num('c')} %</label></div>`
    + `<div class="erow"><label>วิธีทำนา <select data-fm="m"${ro}>${Object.entries(FARMM).map(([k, z]) => `<option value="${k}"${k === F.m ? ' selected' : ''}>${z[0]}</option>`).join('')}</select></label><label>เลี้ยงสัตว์ <select data-fm="h"${ro}>${Object.entries(FARMH).map(([k, z]) => `<option value="${k}"${k === F.h ? ' selected' : ''}>${z[0]}</option>`).join('')}</select></label><label><input type="checkbox" data-fm="d"${F.d ? ' checked' : ''}${ro}> ใช้สัตว์ลากไถ</label></div>`
    + `<div class="tr w">${FARMM[F.m][1]} · ${FARMH[F.h][1]}${F.d ? ' · สัตว์ลากไถ ธัญพืชเพิ่มได้ถึง 12% ตามสัตว์ใช้งานที่หาได้' : ''} · ทุ่งมากขึ้นได้เนื้อ นม หนัง และสัตว์ใช้งานมากขึ้นแต่ธัญพืชน้อยลง พืชเศรษฐกิจคือชา ฝ้าย ไหม องุ่น อ้อย และอื่น ๆ</div>`
    + (own && Y ? `<div class="tr w">ปีนี้ธัญพืช ×${(Y.gM).toFixed(2)} ฝูงสัตว์ ×${(Y.hM).toFixed(2)}${F.m === 'fert' ? ` · ได้ปุ๋ย ${Math.round(Y.R.fert * 100)}% ของที่ต้องการ` : ''}${F.h === 'stall' ? ` · ได้อาหารสัตว์ ${Math.round(Y.R.feed * 100)}%` : ''}${F.d ? ` · ได้สัตว์ใช้งาน ${Math.round(Y.R.livestock * 100)}%` : ''}</div>` : '')
    + (own ? `<div class="btns"><button type="button" class="btn" data-fm="reset"${ro}>กลับเป็นแบบทั่วไป</button></div>` : '') + `</details>`;
}
{ const rf = refreshForm; refreshForm = function () { rf(); farmForm(); }; }
__on(document, 'change', e => {
  const el = e.target; if (!el.dataset || !el.dataset.fm || !sel || !editable || !el.closest('#cfFarm')) return;
  const f = { ...farmOf(sel) }, k = el.dataset.fm;
  if (k === 'g' || k === 'p' || k === 'c') f[k] = clamp(Math.round(+el.value || 0), 0, 100); else if (k === 'm' && FARMM[el.value]) f.m = el.value; else if (k === 'h' && FARMH[el.value]) f.h = el.value; else if (k === 'd') f.d = el.checked ? 1 : 0; else return;
  const o = {}; for (const x of Object.keys(FARM0)) if (f[x] !== FARM0[x]) o[x] = f[x]; if (Object.keys(o).length) ECO.farm[sel] = o; else delete ECO.farm[sel];
  ecoChanged(true); farmForm();
});
__on(document, 'click', e => { const b = e.target.closest ? e.target.closest('#cfFarm [data-fm="reset"]') : null; if (!b || !sel || !editable) return; delete ECO.farm[sel]; ecoChanged(true); farmForm(); });

// ---- what a town gains by making a great deal of a thing ----
// A town that makes at least one and a half times what its own people use of a class gains by it, in full at three times:
// well-being, stability, or a share more income (a trade that brings money in). [well-being, stability, income share, why]
const PBUF = {
  grain: [1, 0, 0, 'อาหารเหลือกิน'], protein: [1, 0, 0, 'เนื้อนมอุดมสมบูรณ์'], salt: [0, 1, 0, 'ถนอมอาหารได้ทั้งปี'], herbs: [0.5, 0, 0, 'สมุนไพรรักษาคน'],
  timber: [0, 0.5, 0, 'บ้านเรือนซ่อมง่าย'], fuel: [0.5, 0, 0, 'อบอุ่นทั้งหน้าหนาว'], stone: [0, 1, 0, 'บ้านและกำแพงมั่นคง'], ore: [0, 0, 0.01, 'แหล่งแร่ดึงคนมาทำงาน'],
  cloth: [0.5, 0, 0, 'เครื่องนุ่งห่มพอ'], livestock: [0.5, 0.5, 0, 'สัตว์ใช้งานพอ'], mana: [0.5, 0, 0.01, 'พลังมานาใช้ทั่วเมือง'], rare: [0, 0, 0.02, 'เมืองมั่งคั่ง'], luxury: [0.5, 0, 0.01, 'ของหายากดึงพ่อค้า'],
  tools: [0, 0, 0.015, 'เครื่องมือดีทำงานไว'], arms: [0, 2, 0, 'ป้องกันตัวได้'], tech: [0, 0, 0.02, 'เครื่องกลช่วยงาน'], ships: [0, 0, 0.015, 'อู่เรือคึกคัก'], books: [0.5, 1, 0, 'คนมีความรู้'],
  drink: [1, -0.5, 0, 'โรงสุราคึกคัก'], furniture: [1, 0, 0, 'บ้านเรือนน่าอยู่'], build: [0.5, 1.5, 0, 'สร้างบ้านเมืองได้มาก'], fert: [0.5, 0, 0.005, 'ดินดี'], feed: [0.5, 0, 0.005, 'สัตว์อ้วนท้วน'],
  textile: [1, 0, 0, 'แต่งกายดี'], pottery: [0.5, 0, 0, 'ภาชนะพอใช้'], food: [0.5, 1, 0, 'มีเสบียงสำรอง'], medicine: [1.5, 0, 0, 'คนป่วยน้อย'], jewelry: [0, 0, 0.02, 'ช่างทองดึงคนมีเงิน'],
};
Object.assign(ETUNE, { pbufAt: [1.5, 1, 5, 0.1, 'เมืองที่ผลิตสินค้าหมวดหนึ่งได้เกินความต้องการของคนในเมืองเท่านี้ เริ่มได้ผลดีจากหมวดนั้น ได้เต็มที่เมื่อถึงสองเท่าของตัวเลขนี้', 'ประชากรและแรงงาน'] });
let PBK = -1, PBI = new Map();
function prodLevels(c) {
  const E = ECON; if (!E || !E.prod) return []; if (PBK !== E.ver) { PBK = E.ver; PBI = new Map(E.cities.map((x, k) => [x, k])); }
  const k = PBI.get(c); if (k == null) return []; const out = [], at = TU('pbufAt'), own = {};
  for (const [id, q] of E.prod[k]) { const cat = catOf(id); own[cat] = (own[cat] || 0) + q; }
  for (const m of EMADEC) { const mk = E.MK[k][m]; if (mk) own[m] = (own[m] || 0) + mk[0]; }
  for (const [cat, q] of Object.entries(own)) { const z = PBUF[cat]; if (!z || !ENEED[cat]) continue; const need = ENEED[cat][c.ki] * c.pop; if (!(need > 0.002)) continue; const lv = clamp((q / need - at) / at, 0, 1); if (lv > 0.05) out.push([cat, lv]); }
  return out;
}
function prodBuf(r, add) {
  const L = prodLevels(r.c); r.pbuf = L;
  for (const [cat, lv] of L) { const z = PBUF[cat], name = 'ผลิต' + ECAT[cat].name + 'มาก: ' + z[3]; if (z[0]) r.taxWhy.push([name, z[0] * lv]); if (z[1] && add) add(name, z[1] * lv); if (z[2]) r.inc += z[2] * lv * Math.max(0, r.gdp); }
}
// the town's card says what it gains
{
  const sc = socCityHTML; socCityHTML = function (k) {
    const h = sc(k), rows = ecoIncome(ecoGdp()), r = rows[k]; if (!h || !r || !r.pbuf || !r.pbuf.length) return h;
    return h + `<div class="tr"><b>ผลดีจากสินค้าที่ผลิตมาก</b> <span class="w">${r.pbuf.map(([cat, lv]) => `${esc(ECAT[cat].name)} ${Math.round(lv * 100)}%: ${esc(PBUF[cat][3])}`).join(' · ')}</span></div>`;
  };
}
