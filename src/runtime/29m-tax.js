// ---------- taxes (v0.18.5): what a state takes from its communities, and what it does with it ----------
// The owner asked to be able to set the taxes of a country and of a community. A state takes a share of every community's income
// (its rate, or the community's own where the owner set one) and spends it one of three ways:
//   svc    on its people: the take is shared back out by head over the whole state, so the poorer communities gain and the
//          richer pay for it, and every community lives a little better for the services
//   court  on the court and the lords: the whole take goes to the state's central community
//   keep   into the treasury: it leaves the year's spending, and stands in the state's books as its reserve
// Every rate costs the people some well-being, the higher the more; services give some back. A land with no state pays no tax.
// The starting rate and use of each kind of state, and the three numbers in ETUNE, are Claude's, for the owner to change.
Object.assign(ETUNE, {
  taxWell: [30, 0, 200, 1, 'ภาษี: ความเป็นอยู่ที่ลดลง (แต้ม) ต่อการเก็บภาษีเต็มรายได้ ภาษีร้อยละ 20 ลด 6 แต้ม', 'ภาษี'],
  taxSvc: [45, 0, 300, 1, 'ภาษีที่ใช้กับบริการประชาชน: ความเป็นอยู่ที่ได้คืน (แต้ม) ต่อการเก็บเต็มรายได้ ภาษีร้อยละ 20 ได้คืน 9 แต้ม', 'ภาษี'],
});
const TAXUSE = {
  svc: ['บริการประชาชน', 'เงินภาษีกลับไปหาคนทั้งรัฐตามจำนวนหัว ชุมชนที่จนกว่าได้คืนมากกว่าที่จ่าย ชุมชนที่รวยจ่ายมากกว่าที่ได้ และทุกชุมชนอยู่ดีขึ้นจากบริการ'],
  court: ['ราชสำนักและขุนนาง', 'เงินภาษีทั้งหมดไปอยู่ที่ชุมชนศูนย์กลางของรัฐ ชุมชนอื่นจ่ายอย่างเดียว'],
  keep: ['เก็บเข้าคลัง', 'เงินภาษีออกจากการใช้จ่ายของปี ไปเป็นเงินคงคลังของรัฐ'],
};
const TAX0 = { trad: [0.08, 'court'], feud: [0.15, 'court'], merc: [0.18, 'keep'], cap: [0.12, 'svc'], soc: [0.3, 'svc'], anar: [0, 'keep'] };
ECO.ctax = {};
const taxOf = s => !s || s.sys === 'anar' ? 0 : s.tax != null ? s.tax : (TAX0[s.sys] || TAX0.merc)[0];
const taxUse = s => !s ? 'keep' : TAXUSE[s.tuse] ? s.tuse : (TAX0[s.sys] || TAX0.merc)[1];
const taxRate = (id, s) => !s || s.sys === 'anar' ? 0 : ECO.ctax[id] != null ? ECO.ctax[id] : taxOf(s);

// in the year's books, after the trade and before the well-being (called from socApply)
function taxApply(rows, book) {
  for (const r of rows) { r.tax = 0; r.taxBack = 0; r.taxWell = 0; r.taxRate = 0; }
  const pools = new Map();
  for (const r of rows) {
    const s = r.s, t = taxRate(r.c.id, s); if (!(t > 0) || !s) continue;
    const T = t * Math.max(0, r.inc); r.inc -= T; r.tax = T; r.taxRate = t; r.taxWell = -TU('taxWell') * t;
    const b = book(s); b.tax = (b.tax || 0) + T; let p = pools.get(s.id); if (!p) pools.set(s.id, p = { s, T: 0, ppl: 0, rows: [] }); p.T += T;
  }
  for (const r of rows) { const p = r.s && pools.get(r.s.id); if (p) { p.ppl += r.people; p.rows.push(r); } }
  for (const p of pools.values()) {
    const use = taxUse(p.s), b = book(p.s); b.taxUse = use; b.treasury = 0;
    if (use === 'svc') { const rate = p.T / Math.max(1e-9, p.rows.reduce((a, r) => a + Math.max(0, r.inc + r.tax), 0)); for (const r of p.rows) { const back = p.T * r.people / Math.max(1e-9, p.ppl); r.inc += back; r.taxBack = back; r.taxWell += TU('taxSvc') * rate; } }
    else if (use === 'court') { const k = ECOX.cap.get(p.s), id = k != null && ECOX.C[k] ? ECOX.C[k].id : p.s.cap, seat = id ? p.rows.find(r => r.c.id === id) : null, to = seat || p.rows.reduce((a, r) => !a || r.people > a.people ? r : a, null); if (to) { to.inc += p.T; to.taxBack = p.T; } }
    else b.treasury = p.T;
  }
}

// ---- the document ----
{
  const ld = ecoLoad, sr = ecoSerial;
  ecoLoad = function (b) {
    ld(b); b = b || {};
    ECO.ctax = {}; for (const [id, v] of Object.entries(b.ctax || {}).slice(0, 4000)) if (Number.isFinite(+v)) ECO.ctax[ecoStr(id, 120)] = clamp(+v, 0, 0.9);
    const by = new Map((Array.isArray(b.states) ? b.states : []).filter(s => s && typeof s.id === 'string').map(s => [s.id, s]));
    for (const s of ECO.states) { const o = by.get(s.id) || {}; s.tax = o.tax != null && Number.isFinite(+o.tax) ? clamp(+o.tax, 0, 0.9) : null; s.tuse = TAXUSE[o.tuse] ? o.tuse : ''; }
  };
  ecoSerial = function () { const o = sr(); if (Object.keys(ECO.ctax).length) o.ctax = { ...ECO.ctax }; return o; };
}

// ---- on the screen: a state's taxes in its form, a community's own rate in its form ----
const taxPc = x => Math.round(x * 1000) / 10;
function taxStateForm(s) {
  if (s.sys === 'anar') return `<div class="tr w">ภาษี: ดินแดนที่ไม่มีรัฐไม่เก็บภาษี</div>`;
  const dis = editable ? '' : ' disabled', d = TAX0[s.sys] || TAX0.merc, b = SOC && SOC.books.get(s.id), use = taxUse(s);
  let h = `<div class="erow"><label>ภาษี <input type="number" data-f="stax" min="0" max="90" step="1" value="${s.tax != null ? taxPc(s.tax) : ''}" placeholder="${taxPc(d[0])}" style="width:5em"${dis}> % ของรายได้</label>`
    + `<label>ใช้เงินภาษีกับ <select data-f="stuse"${dis}>${Object.entries(TAXUSE).map(([k, z]) => `<option value="${k}"${k === use ? ' selected' : ''}>${z[0]}</option>`).join('')}</select></label></div>`
    + `<div class="tr w">${TAXUSE[use][1]} เว้นช่องภาษีว่างเพื่อใช้อัตราตั้งต้นของระบอบ${ESYS[s.sys][0]} (ร้อยละ ${taxPc(d[0])}) ชุมชนที่ตั้งอัตราของตัวเองใช้อัตรานั้นแทน</div>`;
  if (b && b.tax > 0) h += `<div class="tr w">ปีนี้เก็บภาษีได้ ${socN(b.tax)} ${esc(ECO.central.name)} คิดเป็น ${taxPc(b.tax / Math.max(1e-9, b.gdp))}% ของ GDP${b.taxUse === 'keep' ? ' เข้าคลังทั้งหมด' : b.taxUse === 'court' ? ' ไปที่ชุมชนศูนย์กลาง' : ' กลับไปเป็นบริการของคนทั้งรัฐ'}</div>`;
  return h;
}
$('ecobody').addEventListener('change', e => {
  const el = e.target, f = el && el.dataset ? el.dataset.f : ''; if (!editable || (f !== 'stax' && f !== 'stuse')) return;
  const box = el.closest('[data-s]'), s = box ? ECO.states.find(x => x.id === box.dataset.s) : null; if (!s) return;
  if (f === 'stax') { const v = el.value.trim(); s.tax = v === '' || !Number.isFinite(+v) ? null : clamp(+v / 100, 0, 0.9); }
  else s.tuse = TAXUSE[el.value] && el.value !== (TAX0[s.sys] || TAX0.merc)[1] ? el.value : '';
  ecoChanged(false); ecoRender();
});
// a community's own rate, under its head count
function taxCityForm() {
  const inp = $('cfTax'); if (!inp) return; if (!sel) return;
  const v = visibleCities().find(c => c.id === sel); if (!v) return;
  const ec = ECON ? ECON.cities.find(c => c.id === sel) : null, s = ec && ec.st ? ECO.states.find(x => x.id === ec.st) || null : null;
  inp.value = ECO.ctax[sel] != null ? taxPc(ECO.ctax[sel]) : ''; inp.placeholder = String(taxPc(taxOf(s)));
  inp.disabled = !editable || !s || s.sys === 'anar';
  $('cfTaxNote').textContent = !s ? 'ชุมชนนอกรัฐไม่เสียภาษี' : s.sys === 'anar' ? 'ดินแดนที่ไม่มีรัฐไม่เก็บภาษี' : `เว้นว่างเพื่อใช้อัตราของ${s.name} (ร้อยละ ${taxPc(taxOf(s))}) เงินภาษีใช้กับ${TAXUSE[taxUse(s)][0]}`;
}
if ($('cfTax')) $('cfTax').onchange = () => {
  if (!sel || !editable) return; const v = $('cfTax').value.trim();
  if (v === '' || !Number.isFinite(+v)) delete ECO.ctax[sel]; else ECO.ctax[sel] = clamp(+v / 100, 0, 0.9);
  ecoChanged(false); taxCityForm();
};
{ const rf = refreshForm; refreshForm = function () { rf(); taxCityForm(); }; }
// the community's card in the trade view: what it paid and what came back
{
  const sc = socCityHTML;
  socCityHTML = function (k) {
    let h = sc(k); const rows = ecoIncome(ecoGdp()), r = rows[k]; if (!h || !r || !(r.tax > 0)) return h;
    const use = taxUse(r.s), line = `<div class="tr">ภาษี <b>${socN(r.tax)}</b> ${esc(ECO.central.name)} <span class="w">ร้อยละ ${taxPc(r.taxRate)} ของรายได้${ECO.ctax[r.c.id] != null ? ' (อัตราของชุมชนเอง)' : ''} · ใช้กับ${TAXUSE[use][0]}${r.taxBack > 0 ? ' · ได้คืน ' + socN(r.taxBack) : ''}</span></div>`;
    const at = h.indexOf('<div class="tr">ค่าแรง'); return at >= 0 ? h.slice(0, at) + line + h.slice(at) : h + line;
  };
}
