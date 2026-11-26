// ---------- money: who issues it, what it is made of, and who uses it (v0.21.0) ----------
// The owner found the central coin hard to follow, asked that the money of our own world be studied and set beside the system,
// and that a state be chosen to issue the coins or notes (26 Nov 2026). What the system now holds, and where it comes from:
//   the central coin   a measure of worth for the whole world, the way grain or a day's pay was before coins: it is shown as how
//                      many days of a person's food it buys. No one issues it; a state that issues nothing pays in it (as the
//                      Spanish silver dollar served many lands that minted little of their own).
//   a state's money    issued by one state, and used by it and by any state that chooses to (a monetary union like the euro,
//                      or a country that uses another's money as Panama and Ecuador use the dollar). Every user shares one
//                      rate, so trade between them pays no money changer and their money rises and falls together.
//   its make           full-weight gold or silver coin (its worth is its metal: it barely moves, and minting earns little);
//                      token coin of base metal (worth what the issuer says: minting earns more, people trust it less);
//                      notes that can be changed for gold (the gold standard: steady, a fair earning);
//                      notes of the government alone (fiat, floating: they follow the balance of trade fully, and earn most).
//   seigniorage        the issuer's earning from making money, paid by everyone who uses it, a share of their product a year;
//                      a state that uses another's money pays it to that state's treasury.
// What each make does is Claude's reading of how such money behaved (from general knowledge, not looked up this time); the
// numbers are Claude's, for the owner to tune.
const COINF = {
  gold: { name: 'เหรียญทองหรือเงินเต็มน้ำหนัก', why: 'ค่าเงินอยู่ที่เนื้อโลหะ เปลี่ยนตามดุลการค้าน้อยมาก รายได้จากการผลิตเงินน้อย คนเชื่อถือ แบบเหรียญเดนาริอุสหรือเหรียญเงินเม็กซิโก', fxm: 0.3, seig: 0.002, stab: 1 },
  token: { name: 'เหรียญโลหะผสม (ค่าตามที่รัฐประกาศ)', why: 'เนื้อโลหะน้อยกว่าราคาหน้าเหรียญ รัฐได้กำไรจากการผลิตเงินมาก แต่คนเชื่อถือน้อยลง แบบเหรียญที่ถูกลดเนื้อเงินในโรมันยุคหลัง', fxm: 1, seig: 0.006, stab: -2 },
  note: { name: 'ธนบัตรแลกทองได้ (มาตรฐานทองคำ)', why: 'ธนบัตรมีทองค้ำ ค่าเงินนิ่ง เปลี่ยนตามดุลการค้าครึ่งเดียว รายได้จากการผลิตเงินพอประมาณ แบบปอนด์สเตอร์ลิงในศตวรรษที่ 19', fxm: 0.5, seig: 0.004, stab: 1 },
  fiat: { name: 'ธนบัตรรัฐบาล (ลอยตัว)', why: 'ไม่มีอะไรค้ำนอกจากรัฐ ค่าเงินลอยตามดุลการค้าเต็มที่และแรงกว่าแบบอื่น รายได้จากการผลิตเงินมากที่สุด แบบเงินตราส่วนใหญ่ในปัจจุบัน', fxm: 1.5, seig: 0.008, stab: 0 },
};
// what a state pays in: 'cen' (the central coin), 'own', or the id of the state whose money it uses
const coinUse = s => { if (!s || s.sys === 'anar') return 'cen'; const u = s.coin && s.coin.use; if (u === 'own' || u === 'cen') return u; if (u) return ECO.states.some(x => x.id === u && x !== s && coinUse0(x) === 'own') ? u : 'cen'; return s.cur && s.cur.trim() ? 'own' : 'cen'; };
const coinUse0 = s => { const u = s.coin && s.coin.use; return u === 'own' ? 'own' : u === 'cen' || (u && u !== 'own') ? 'x' : s.cur && s.cur.trim() ? 'own' : 'cen'; };
const coinIssuer = s => { const u = coinUse(s); return u === 'own' ? s : u === 'cen' ? null : ECO.states.find(x => x.id === u) || null; };
const coinForm = s => { const I = coinIssuer(s); return I && I.coin && COINF[I.coin.form] ? I.coin.form : 'gold'; };
const coinName = s => { const I = coinIssuer(s); return I ? (I.cur && I.cur.trim()) || 'เงิน' + I.name : ECO.central.name; };
// before a year is worked out: a state that uses another's money takes its name and its rate, so the engine sees one coin
function coinSync() {
  for (const s of ECO.states) {
    const u = coinUse(s);
    if (u === 'cen') { s.cur = ''; s.rate = 1; }
    else if (u !== 'own') { const I = coinIssuer(s); if (I) { if (!I.cur || !I.cur.trim()) I.cur = 'เงิน' + I.name; s.cur = I.cur; s.rate = I.rate; } }
  }
}
{ const ec = econCompute; econCompute = function () { coinSync(); return ec(); }; }
// the balance of trade moves a money, not a state: everyone who uses it, summed, and by its make
fxPlan = function (E) {
  if (!ECOX.on || !E || !E.soc || !(TU('fxBal') > 0)) return null; const area = new Map();
  for (const [id, b] of E.soc.states) { const s = ECOX.byKey.get(id); if (!s || s.sys === 'anar' || !(b.gdp > 0)) continue; const I = coinIssuer(s); if (!I) continue; const a = area.get(I.id) || { net: 0, gdp: 0, ids: [], I }; a.net += b.net; a.gdp += b.gdp; a.ids.push(id); area.set(I.id, a); }
  const fx = new Map(); for (const a of area.values()) { const m = COINF[coinForm(a.I)].fxm, x = clamp(TU('fxBal') * m * a.net / a.gdp, -0.3, 0.3); if (Math.abs(x) >= 0.002) for (const id of a.ids) fx.set(id, x); }
  return fx.size ? fx : null;
};
// seigniorage, after the taxes (called at the end of taxApply, 29m)
let COINY = new Map();
function coinApply(rows) {
  COINY = new Map(); if (!ECO.states.length) return;
  for (const r of rows) {
    const s = r.s; if (!s || s.sys === 'anar') continue; const I = coinIssuer(s); if (!I) continue; const F = COINF[coinForm(s)], x = F.seig * Math.max(0, r.gdp);
    if (!(x > 0)) continue; const y = Math.min(x, Math.max(0, r.inc) * 0.1); r.inc -= y;
    const o = COINY.get(I.id) || { got: 0, from: new Map() }; o.got += y; o.from.set(s.id, (o.from.get(s.id) || 0) + y); COINY.set(I.id, o);
    if (F.stab && r.stab != null) { r.stab = clamp(r.stab + F.stab, 0, 100); (r.stabWhy || (r.stabWhy = [])).push([F.name, F.stab]); }
  }
  for (const [id, o] of COINY) { const S = FISC.st.get(id); if (S) { S.treasury += o.got; S.seig = o.got; } else { const cap = rows.find(r => r.s && r.s.id === id); if (cap) cap.inc += o.got; } }
}
// a mint of full-weight coin buys gold and silver for it, and a bank of gold-backed notes keeps a reserve: the issuer's capital
// wants precious metal in proportion to the people who use its money (Claude's numbers)
const COINRARE = { gold: 0.004, note: 0.002, token: 0.0005, fiat: 0 };
{
  const an = armyNeed; armyNeed = (c, cat) => {
    let v = an(c, cat); if (cat !== 'rare' || !ECON) return v; const s = c.sto || (c.st ? ECO.states.find(q => q.id === c.st) : null); if (!s || coinUse(s) !== 'own') return v;
    let capId = s.cap; if (!capId) { let b = null; for (const x of ECON.cities) if (x.st === s.id && (!b || x.pop > b.pop)) b = x; capId = b ? b.id : ''; } if (c.id !== capId) return v;   // the capital as set, else the greatest town
    const r = COINRARE[coinForm(s)] || 0; if (!r) return v; let pop = 0; for (const x of ECON.cities) { const z = x.st ? ECO.states.find(q => q.id === x.st) : null, I = z ? coinIssuer(z) : null; if (I && I.id === s.id) pop += x.pop; } return v + r * pop;   // by id: last year's towns hold last year's state objects
  };
}
// ---- the document ----
{
  const ld = ecoLoad;
  ecoLoad = function (b) {
    ld(b); b = b || {}; const by = new Map((Array.isArray(b.states) ? b.states : []).filter(s => s && typeof s.id === 'string').map(s => [s.id, s]));
    for (const s of ECO.states) { const o = (by.get(s.id) || {}).coin; delete s.coin; if (o && typeof o === 'object') { const use = o.use === 'own' || o.use === 'cen' || (typeof o.use === 'string' && /^.$/.test(o.use)) ? o.use : ''; const form = COINF[o.form] ? o.form : ''; if (use || form) s.coin = { ...(use ? { use } : {}), ...(form ? { form } : {}) }; } }
  };
}
// ---- the state's card: one row of money, said plainly ----
function coinStateForm(s) {
  const dis = editable ? '' : ' disabled', use = coinUse(s), I = coinIssuer(s), form = coinForm(s), b = typeof socStat === 'function' ? socStat(s) : null, cen = esc(ECO.central.name);
  const issuers = ECO.states.filter(x => x !== s && x.sys !== 'anar' && coinUse0(x) === 'own');
  const days = r => { const pd = ECO.central.per / ECO.unit / 365; return pd > 0 ? r / pd : 0; };
  let h = `<div class="erow"><label>เงินที่ใช้ <select data-cn="use"${dis}><option value="cen"${use === 'cen' ? ' selected' : ''}>${cen} (เงินกลางของทั้งโลก ไม่มีใครออก)</option><option value="own"${use === 'own' ? ' selected' : ''}>ออกเงินของรัฐนี้เอง</option>${issuers.map(x => `<option value="${x.id}"${use === x.id ? ' selected' : ''}>ใช้เงินของ${esc(x.name)} (${esc(coinName(x))})</option>`).join('')}</select></label></div>`;
  if (use === 'own') {
    h += `<div class="erow"><label>ชื่อเงิน <input type="text" data-f="scur" maxlength="30" value="${esc(s.cur)}" placeholder="เงิน${esc(s.name)}" style="width:8em"${dis}></label><label>ทำจาก <select data-cn="form"${dis}>${Object.entries(COINF).map(([k, z]) => `<option value="${k}"${k === form ? ' selected' : ''}>${esc(z.name)}</option>`).join('')}</select></label></div>`
      + `<div class="erow"><label>1 ${esc(coinName(s))} = <input type="number" data-f="srate" min="0.01" max="1000" step="0.05" value="${s.rate}"${dis}> ${cen}</label><span class="lbl">ซื้อข้าวให้คนหนึ่งกินได้ราว ${ecoNumF(days(s.rate))} วัน</span></div>`
      + `<div class="tr w">${esc(COINF[form].why)}</div>`;
    const users = ECO.states.filter(x => x !== s && coinIssuer(x) === s), Y = COINY.get(s.id);
    h += `<div class="tr w">${users.length ? 'รัฐที่ใช้เงินนี้ด้วย: ' + users.map(x => esc(x.name)).join(' · ') + ' ค้ากันไม่ต้องแลกเงิน ' : 'ยังไม่มีรัฐอื่นใช้เงินนี้ '}${Y ? `· ปีนี้ได้จากการผลิตเงิน ${socN(Y.got)} ${cen}${users.length ? ` (จากรัฐอื่น ${socN([...Y.from].filter(([id]) => id !== s.id).reduce((a, [, v]) => a + v, 0))})` : ''}` : ''}</div>`;
  } else if (I) {
    h += `<div class="tr w">ใช้${esc(coinName(s))}ที่ออกโดย${esc(I.name)} (${esc(COINF[form].name)}) 1 หน่วย = ${I.rate} ${cen} ค่าเงินขึ้นลงพร้อมกับ${esc(I.name)} ค้ากับรัฐที่ใช้เงินเดียวกันไม่ต้องแลกเงิน และจ่ายค่าผลิตเงินร้อยละ ${ecoPc(COINF[form].seig)} ของ GDP ต่อปีให้คลังของ${esc(I.name)}</div>`;
  } else h += `<div class="tr w">${cen} เป็นหน่วยวัดมูลค่ากลาง ไม่มีรัฐใดออก ค่าไม่ขึ้นลงตามดุลการค้า ค้ากับรัฐที่ใช้เงินของตัวเองต้องแลกเงิน</div>`;
  if (b && Math.abs(b.fx) >= 0.001) h += `<div class="tr w">ปีนี้ค่าเงิน${b.fx > 0 ? 'แข็งขึ้น' : 'อ่อนลง'}ร้อยละ ${ecoPc(Math.abs(b.fx))} ตามดุลการค้า${use !== 'own' && I ? 'ของทุกรัฐที่ใช้เงินนี้รวมกัน' : ''}</div>`;
  return h;
}
$('ecobody').addEventListener('change', e => {
  const el = e.target; if (!editable || !el.dataset || !el.dataset.cn) return; const bx = el.closest('[data-s]'), s = bx ? ECO.states.find(x => x.id === bx.dataset.s) : null; if (!s) return;
  const c = s.coin || (s.coin = {});
  if (el.dataset.cn === 'use') { c.use = el.value; if (el.value === 'own') { if (!s.cur || !s.cur.trim()) s.cur = 'เงิน' + s.name; } for (const x of ECO.states) if (x !== s && x.coin && x.coin.use === s.id && el.value !== 'own') x.coin.use = 'cen'; }
  else if (el.dataset.cn === 'form' && COINF[el.value]) c.form = el.value;
  coinSync(); ecoChanged(true); ecoRender();
});
// ---- the money tab: the measure, said in food; and every money in the world in one table ----
function coinWorldHTML() {
  const cen = esc(ECO.central.name), pd = ECO.central.per / ECO.unit / 365, list = ECO.states.filter(s => s.sys !== 'anar' && coinUse(s) === 'own');
  let h = `<div class="ssec"><h5>ระบบเงินตราของโลก</h5><div class="tr w">${cen}เป็นหน่วยวัดมูลค่าของทั้งโลก 1 ${cen} ซื้อข้าวให้คนหนึ่งกินได้ราว ${ecoNumF(pd > 0 ? 1 / pd : 0)} วัน รัฐใดจะออกเงินเอง ใช้เงินของรัฐอื่น หรือใช้${cen}ก็ได้ ตั้งในการ์ดของรัฐ</div>`;
  if (!list.length) return h + `<div class="tr w">ยังไม่มีรัฐใดออกเงินของตัวเอง ทุกรัฐใช้${cen}</div></div>`;
  h += `<div class="etable g5"><div class="eth"><span>เงิน</span><span>ผู้ออก</span><span>ทำจาก</span><span>1 หน่วย</span><span>รัฐที่ใช้</span></div>`
    + list.map(I => { const users = ECO.states.filter(x => coinIssuer(x) === I); return `<div class="etr"><span>${esc(coinName(I))}</span><span><i class="sdot" style="background:${I.color}"></i>${esc(I.name)}</span><span>${esc(COINF[coinForm(I)].name)}</span><span>${I.rate} ${cen}</span><span>${users.map(x => esc(x.name)).join(' · ')}</span></div>`; }).join('') + `</div>`;
  const cenU = ECO.states.filter(s => s.sys !== 'anar' && coinUse(s) === 'cen'); if (cenU.length) h += `<div class="tr w">ใช้${cen}: ${cenU.map(s => esc(s.name)).join(' · ')}</div>`;
  return h + `</div>`;
}
