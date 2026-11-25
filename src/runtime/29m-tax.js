// ---------- the public purse (v0.19.0; it grew out of the single tax of v0.18.5) ----------
// The owner asked for a state's finances in full: taxes split out in detail (on imports, by head, on land, on companies, on value
// added), fees for a market licence, a budget of four heads, the cost of corruption, and stability unit by unit; and taxes that
// are gathered step by step up the units of government. Customs duties and embargoes are set state by state and good by good.
// How a year runs, for each state:
//   bases      by head: the state's mean income a head, the same for everyone; on land: what the land and the mines bring in
//              (the community's product less its workshops); on companies: the workshops' output; on value added: what people
//              spend; market licence: what the community's market sells abroad; on imports: each load that crosses into the
//              state, at the duty the state set for that partner and that good
//   up the     the tax of a community goes to its manor, which keeps a share for its own running and passes the rest to the
//   tiers      county, which does the same, then the duchy (a march keeps more for its soldiers, a principality much more), then
//              the state. At every step some of it sticks to fingers: the state's corruption, more where the unit is unsettled,
//              less the more the state spends on its own administration. What a unit keeps and what sticks go to its seat.
//   budget     the state spends what reaches it on four heads: defence (pay to the march seats and the capital; the army of the
//              next batch draws on it), administration and court (to the seats; it cuts corruption), public works (wages to every
//              community by head, and next year cheaper roads inside the state), and welfare (back to every community by head,
//              and people live better). What is not given out stays in the treasury.
//   stability  0 to 100 for every unit: how well needs are met, wealth, the culture and faith of the state's main people, the
//              weight of tax, welfare and defence spending, a principality's self-rule, and the special zones over it. Below 35
//              people live worse; the lower it is, the more corruption.
// Every rate and share below is Claude's starting number, set by the kind of state; the state's card changes them.
Object.assign(ETUNE, {
  taxWell: [30, 0, 200, 1, 'ความเป็นอยู่ที่ลดลง (แต้ม) เมื่อภาษีรวมเท่ากับรายได้ทั้งหมด ภาษีรวมร้อยละ 20 ลด 6 แต้ม', 'การคลัง'],
  welWell: [40, 0, 300, 1, 'ความเป็นอยู่ที่ได้ (แต้ม) เมื่องบสวัสดิการเท่ากับรายได้ทั้งหมด', 'การคลัง'],
  pubRoad: [2, 0, 10, 0.1, 'งบโยธาต่อ GDP ของรัฐคูณเลขนี้ คือส่วนที่ค่าขนในรัฐถูกลง (ไม่เกินร้อยละ 20)', 'การคลัง'],
  stabLow: [35, 0, 100, 1, 'เสถียรภาพต่ำกว่านี้ ความเป็นอยู่ลด 5 แต้ม', 'การคลัง'],
});
const FTAX = { poll: 'ภาษีรายหัว', land: 'ภาษีที่ดิน', corp: 'ภาษีนิติบุคคล', vat: 'ภาษีมูลค่าเพิ่ม', lic: 'ค่าใบอนุญาตตลาด', imp: 'ภาษีนำเข้า' };
const FBUD = { mil: 'กลาโหม', adm: 'บริหารและราชสำนัก', pub: 'โยธาและสาธารณูปโภค', wel: 'สวัสดิการประชาชน' };
const FSYS = {   // poll land corp vat lic imp | defence admin works welfare | corruption
  trad: [0.04, 0.06, 0, 0, 0.02, 0.05, 0.30, 0.40, 0.15, 0.15, 0.10],
  feud: [0.03, 0.12, 0, 0.02, 0.04, 0.08, 0.40, 0.35, 0.15, 0.10, 0.12],
  merc: [0, 0.04, 0.06, 0.05, 0.06, 0.15, 0.25, 0.20, 0.35, 0.20, 0.06],
  cap: [0, 0.03, 0.10, 0.06, 0.02, 0.05, 0.20, 0.15, 0.35, 0.30, 0.05],
  soc: [0.02, 0.05, 0.25, 0.08, 0, 0.10, 0.25, 0.15, 0.25, 0.35, 0.08],
  anar: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
};
const FKEEP = { 0: 0.10, 1: 0.10, 2: 0.15, march: 0.20, princ: 0.50 };
function fiscDef(s) { const a = FSYS[s.sys] || FSYS.merc; return { poll: a[0], land: a[1], corp: a[2], vat: a[3], lic: a[4], imp: a[5], bud: { mil: a[6], adm: a[7], pub: a[8], wel: a[9] }, corr: a[10], keep: { ...FKEEP } }; }
// what a state has set, over its kind's defaults
function fiscOf(s) { const d = fiscDef(s), o = s.fisc || {}; const f = { ...d, ...Object.fromEntries(Object.keys(FTAX).filter(k => o[k] != null).map(k => [k, o[k]])), bud: { ...d.bud, ...(o.bud || {}) }, keep: { ...d.keep, ...(o.keep || {}) } }; if (o.corr != null) f.corr = o.corr; return f; }
ECO.cmul = {};
let FISC = { st: new Map(), unit: new Map(), pub: new Map() };
const taxUse = () => '';                              // kept for older callers

// ---- customs and embargoes: a state's rules for one partner (or all) and one class of goods (or all) ----
function tradeRule(s, other, cat) {
  if (!s || !Array.isArray(s.trade) || !other) return null; let best = null, sc = -1;
  for (const r of s.trade) { if (r.p !== '*' && r.p !== other.id) continue; if (r.c !== '*' && r.c !== cat) continue; const k = (r.p !== '*' ? 2 : 0) + (r.c !== '*' ? 1 : 0); if (k > sc) { sc = k; best = r; } }
  return best;
}
{
  const ee = ecoEarn; ecoEarn = function (i, j, cat, pi, pj, v, t, bulk, phase, w) {
    const ci = ECOX.C[i], cj = ECOX.C[j], si = ci && ci.sto, sj = cj && cj.sto;
    if (phase >= 0 && si && sj && si !== sj && !(w && w.org)) {
      const out = tradeRule(si, sj, cat), inn = tradeRule(sj, si, cat);
      if ((out && out.e) || (inn && inn.e)) return 0;                     // under embargo, either way
      const m = ee(i, j, cat, pi, pj, v, t, bulk, phase, w); if (!(m > 0)) return m;
      const duty = inn ? inn.t : fiscOf(sj).imp; return m - duty * pj * v;
    }
    return ee(i, j, cat, pi, pj, v, t, bulk, phase, w);
  };
}
// public works make the roads inside the state cheaper next year
{ const lc = ecoLinkCost; ecoLinkCost = function (L, cities) { const c = lc(L, cities), a = cities[L.ia].sto, b = cities[L.ib].sto; if (!a || a !== b) return c; const p = FISC.pub.get(a.id) || 0; return c * (1 - Math.min(0.2, TU('pubRoad') * p)); }; }

// ---- the year (called from socApply, after the trade's books and before well-being) ----
function taxApply(rows, book) {
  const E = ECON, per = ECO.central.per; FISC = { st: new Map(), unit: new Map(), pub: FISC.pub };
  for (const r of rows) { r.tax = 0; r.taxBack = 0; r.taxWell = 0; r.taxWhy = []; r.taxParts = {}; r.stab = null; }
  // imports at the border: each load into a state pays that state's duty
  const imp = new Float64Array(rows.length);
  for (const f of E.flows) { if (f.cat === 'labor') continue; const A = rows[f.from].s, B = rows[f.to].s; if (!B || A === B || B.sys === 'anar') continue; const r = tradeRule(B, A, f.cat), duty = r ? r.t : fiscOf(B).imp; if (!(duty > 0)) continue; imp[f.to] += duty * f.amt * ECAT[f.cat].v * (E.P1[f.to][f.cat] || 1) * per; }
  const byS = new Map(); rows.forEach((r, k) => { if (r.s && r.s.sys !== 'anar') { let g = byS.get(r.s.id); if (!g) byS.set(r.s.id, g = { s: r.s, rows: [], ks: [] }); g.rows.push(r); g.ks.push(k); } });
  for (const g of byS.values()) {
    const s = g.s, F = fiscOf(s), b = book(s); let inc = 0, ppl = 0; for (const r of g.rows) { inc += Math.max(0, r.inc); ppl += r.people; } const mean = ppl > 0 ? inc / ppl : 0;
    const S = { s, F, rev: Object.fromEntries(Object.keys(FTAX).map(k => [k, 0])), total: 0, leak: 0, kept: 0, reach: 0, bud: { mil: 0, adm: 0, pub: 0, wel: 0 }, treasury: 0, ppl, gdp: 0 };
    // the main culture and faith of the state's people, for stability
    const cnt = { cul: new Map(), rel: new Map() }; for (const r of g.rows) { const bb = typeof belCity === 'function' ? belCity(r.c.id) : {}; for (const k of ['cul', 'rel']) if (bb[k]) cnt[k].set(bb[k], (cnt[k].get(bb[k]) || 0) + r.people); }
    const main = k => { let best = null, n = 0; for (const [x, v] of cnt[k]) if (v > n) { n = v; best = x; } return best; }, mc = main('cul'), mr = main('rel');
    // each community's tax, before it goes up
    g.rows.forEach((r, j) => {
      const k = g.ks[j], m = ECO.cmul[r.c.id] != null ? ECO.cmul[r.c.id] : 1, made = Math.max(0, r.made || 0);
      const parts = { poll: F.poll * mean * r.people, land: F.land * Math.max(0, r.gdp - made), corp: F.corp * made, vat: F.vat * Math.max(0, r.inc), lic: F.lic * Math.max(0, r.exX || 0), imp: imp[k] };
      let T = 0; for (const x of Object.keys(parts)) { parts[x] *= m; T += parts[x]; }
      const cap = 0.8 * Math.max(0, r.inc); if (T > cap && T > 0) { const q = cap / T; for (const x of Object.keys(parts)) parts[x] *= q; T = cap; }
      r.inc -= T; r.tax = T; r.taxParts = parts; for (const x of Object.keys(parts)) S.rev[x] += parts[x]; S.total += T; S.gdp += r.gdp;
      // stability of the community, which its units sum
      const bb = typeof belCity === 'function' ? belCity(r.c.id) : {}, why = [];
      let st = 55; const add = (t, v) => { if (Math.abs(v) >= 0.5) { st += v; why.push([t, v]); } };
      add('ความต้องการพื้นฐาน', 40 * ((r.metB == null ? 1 : r.metB) - 0.8)); add('ความมั่งคั่ง', 8 * clamp(Math.log2(Math.max(0.05, mean > 0 ? Math.max(0, r.inc + T) / r.people / mean : 1)), -1.5, 1.5));
      if (mc && bb.cul && bb.cul !== mc) add('วัฒนธรรมต่างจากคนส่วนใหญ่ของรัฐ', -12); if (mr && bb.rel && bb.rel !== mr) add('ศาสนาต่างจากคนส่วนใหญ่ของรัฐ', -8);
      const burden = r.inc + T > 0 ? T / (r.inc + T) : 0; add('ภาระภาษี', -60 * burden); add('งบสวัสดิการ', 20 * F.bud.wel); add('งบกลาโหม', 15 * F.bud.mil);
      const ch = typeof admCity === 'function' && ECO.adm.length ? admCity(r.c.id) : null; if (ch && ch[2] && ch[2].type === 'princ') add('ปกครองตนเอง', 5); if (ch && ch[2] && ch[2].type === 'march') add('เขตชายแดน', -3);
      const h = r.c.h != null ? r.c.h : hexAt(r.c.x, r.c.y), z = h >= 0 && typeof szAt === 'function' ? szAt(h) : null; if (z) add(z.name, { war: -25, unrest: -15, bandit: -8 }[z.kind] || -5);
      r.stab = clamp(st, 0, 100); r.stabWhy = why; r.taxWhy.push(['ภาษี', -TU('taxWell') * burden]);
      if (r.stab < TU('stabLow')) r.taxWhy.push(['เสถียรภาพต่ำ', -5]);
    });
    // up the tiers: keep, stick, pass on
    const seatRow = id => { if (!id) return null; return g.rows.find(r => r.c.id === id) || null; };
    const capRow = (() => { const k = ECOX.cap.get(s), id = k != null && ECOX.C[k] ? ECOX.C[k].id : s.cap; return seatRow(id) || g.rows.reduce((a, r) => !a || r.people > a.people ? r : a, null); })();
    const UT = new Map(), uOf = id => { let u = UT.get(id); if (!u) UT.set(id, u = { got: 0, kept: 0, leak: 0, ppl: 0, stab: 0 }); return u; };
    const corrAt = stab => F.corr * (1.5 - stab / 100) * (1 - 0.8 * F.bud.adm);
    for (const r of g.rows) {
      let money = r.tax; const ch = typeof admCity === 'function' && ECO.adm.length ? admCity(r.c.id) : { 0: null, 1: null, 2: null };
      for (const t of [0, 1, 2]) {
        const u = ch[t]; if (!u) continue; const U = uOf(u.id); U.got += money; U.ppl += r.people; U.stab += r.stab * r.people;
        const keep = t === 2 && u.type ? F.keep[u.type] : F.keep[t], leak = clamp(corrAt(r.stab), 0, 0.6);
        const kp = money * keep, lk = (money - kp) * leak; money -= kp + lk; U.kept += kp; U.leak += lk; S.kept += kp; S.leak += lk;
        const seat = seatRow(u.seat) || r; seat.inc += kp + lk; seat.taxBack += kp + lk;
      }
      const lk = money * clamp(corrAt(r.stab), 0, 0.6) * (ch[0] ? 0.5 : 1); money -= lk; S.leak += lk; if (capRow) { capRow.inc += lk; capRow.taxBack += lk; }
      S.reach += money;
    }
    for (const [id, U] of UT) { U.stab = U.ppl > 0 ? U.stab / U.ppl : 0; FISC.unit.set(id, U); }
    // the budget
    let given = 0; for (const k of Object.keys(FBUD)) { S.bud[k] = S.reach * clamp(F.bud[k], 0, 1); given += S.bud[k]; } if (given > S.reach) { const q = S.reach / given; for (const k of Object.keys(FBUD)) S.bud[k] *= q; given = S.reach; }
    S.treasury = S.reach - given;
    const byHead = x => { if (!(x > 0) || !(ppl > 0)) return; for (const r of g.rows) { const y = x * r.people / ppl; r.inc += y; r.taxBack += y; } };
    byHead(S.bud.wel); byHead(S.bud.pub);
    const seats = [capRow, ...ECO.adm.filter(u => u.t === 2 && u.type === 'march').map(u => seatRow(u.seat))].filter(Boolean);
    if (seats.length && S.bud.mil > 0) for (const r of seats) { const y = S.bud.mil / seats.length; r.inc += y; r.taxBack += y; }
    const aseats = [capRow, ...ECO.adm.filter(u => u.t >= 1).map(u => seatRow(u.seat))].filter(Boolean);
    if (aseats.length && S.bud.adm > 0) { const w = aseats.map((r, i) => i === 0 ? 3 : 1), sw = w.reduce((a, x) => a + x, 0); aseats.forEach((r, i) => { const y = S.bud.adm * w[i] / sw; r.inc += y; r.taxBack += y; }); }
    const welRate = inc > 0 ? S.bud.wel / inc : 0; for (const r of g.rows) if (welRate > 0) r.taxWhy.push(['งบสวัสดิการของรัฐ', TU('welWell') * welRate]);
    FISC.pub.set(s.id, S.gdp > 0 ? S.bud.pub / S.gdp : 0);
    b.tax = S.total; b.taxUse = ''; b.treasury = S.treasury; b.fisc = S; FISC.st.set(s.id, S);
  }
}

// ---- the document: a state's finances and trade rules ride on the state; v0.18.5's single tax is read into them ----
{
  const ld = ecoLoad, sr = ecoSerial;
  const num = (x, a, b) => Number.isFinite(+x) ? clamp(+x, a, b) : null;
  ecoLoad = function (b) {
    ld(b); b = b || {};
    const by = new Map((Array.isArray(b.states) ? b.states : []).filter(s => s && typeof s.id === 'string').map(s => [s.id, s]));
    for (const s of ECO.states) {
      const o = by.get(s.id) || {}, f = o.fisc && typeof o.fisc === 'object' ? o.fisc : null; s.fisc = {};
      if (f) {
        for (const k of Object.keys(FTAX)) { const v = num(f[k], 0, 0.9); if (v != null) s.fisc[k] = v; }
        if (f.bud && typeof f.bud === 'object') { s.fisc.bud = {}; for (const k of Object.keys(FBUD)) { const v = num(f.bud[k], 0, 1); if (v != null) s.fisc.bud[k] = v; } }
        if (f.keep && typeof f.keep === 'object') { s.fisc.keep = {}; for (const k of Object.keys(FKEEP)) { const v = num(f.keep[k], 0, 0.9); if (v != null) s.fisc.keep[k] = v; } }
        const c = num(f.corr, 0, 0.6); if (c != null) s.fisc.corr = c;
      } else if (o.tax != null && Number.isFinite(+o.tax)) {           // v0.18.5: one rate and one use become a land tax and a budget
        s.fisc.land = clamp(+o.tax, 0, 0.9); const u = o.tuse; if (u === 'svc') s.fisc.bud = { wel: 0.7 }; else if (u === 'court') s.fisc.bud = { adm: 0.7 }; else if (u === 'keep') s.fisc.bud = { mil: 0, adm: 0, pub: 0, wel: 0 };
      }
      s.trade = []; for (const r of (Array.isArray(o.trade) ? o.trade : []).slice(0, 200)) { if (!r || typeof r.p !== 'string' || typeof r.c !== 'string') continue; if (r.p !== '*' && !/^.$/.test(r.p)) continue; if (r.c !== '*' && !ECAT[r.c]) continue; s.trade.push({ p: r.p, c: r.c, t: num(r.t, 0, 3) || 0, e: r.e ? 1 : 0 }); }
      delete s.tax; delete s.tuse;
    }
    ECO.cmul = {}; for (const [id, v] of Object.entries(b.cmul || {}).slice(0, 4000)) if (Number.isFinite(+v)) ECO.cmul[ecoStr(id, 120)] = clamp(+v, 0, 3);
  };
  ecoSerial = function () { const o = sr(); if (Object.keys(ECO.cmul).length) o.cmul = { ...ECO.cmul }; return o; };
}

// ---- the state's card ----
const pc1 = x => Math.round(x * 1000) / 10;
function taxStateForm(s) {
  if (s.sys === 'anar') return `<div class="tr w">ดินแดนที่ไม่มีรัฐไม่เก็บภาษีและไม่มีงบประมาณ</div>`;
  const F = fiscOf(s), d = fiscDef(s), S = FISC.st.get(s.id), dis = editable ? '' : ' disabled', coin = esc(ECO.central.name);
  const inp = (f, v, dv, max) => `<input type="number" data-fz="${f}" min="0" max="${max || 90}" step="0.5" value="${pc1(v)}" style="width:4.6em"${dis}${Math.abs(v - dv) > 1e-9 ? ' class="chg"' : ''}>`;
  let h = `<div class="ftax">${Object.entries(FTAX).map(([k, n]) => `<label>${n} ${inp(k, F[k], d[k])} %${S ? ` <small>${socN(S.rev[k])}</small>` : ''}</label>`).join('')}</div>`
    + `<div class="tr w">ภาษีรายหัวคิดจากรายได้เฉลี่ยต่อหัวของรัฐ เท่ากันทุกคน ภาษีที่ดินคิดจากผลผลิตของที่ดินและเหมือง ภาษีนิติบุคคลคิดจากผลผลิตของโรงงาน ภาษีมูลค่าเพิ่มคิดจากการใช้จ่าย ค่าใบอนุญาตตลาดคิดจากของที่ตลาดขายออกนอกรัฐ ภาษีนำเข้าเก็บที่ด่านตามกฎข้างล่าง</div>`
    + `<div class="tr"><b>งบประมาณ</b> <span class="w">ส่วนของเงินที่ถึงคลังกลาง ที่เหลือเก็บเข้าคลัง</span></div><div class="ftax">${Object.entries(FBUD).map(([k, n]) => `<label>${n} ${inp('b.' + k, F.bud[k], d.bud[k], 100)} %${S ? ` <small>${socN(S.bud[k])}</small>` : ''}</label>`).join('')}</div>`
    + `<div class="tr"><b>ส่งต่อตามลำดับการปกครอง</b> <span class="w">ส่วนที่แต่ละระดับเก็บไว้ใช้เอง</span></div><div class="ftax">${[['0', ECO.admn[0]], ['1', ECO.admn[1]], ['2', ECO.admn[2]], ['march', ECO.admn.march], ['princ', ECO.admn.princ]].map(([k, n]) => `<label>${esc(n)} ${inp('k.' + k, F.keep[k], d.keep[k])} %</label>`).join('')}<label>คอร์รัปชัน ${inp('corr', F.corr, d.corr, 60)} %</label></div>`;
  if (S) {
    const lk = S.total > 0 ? S.leak / S.total : 0, st = (() => { let a = 0, n = 0; for (const [id, U] of FISC.unit) { const u = admById(id); if (u && u.t === 0 && U.ppl) { a += U.stab * U.ppl; n += U.ppl; } } return n ? a / n : null; })();
    h += `<div class="tr">ปีนี้เก็บได้ <b>${socN(S.total)}</b> ${coin} <span class="w">${pc1(S.total / Math.max(1e-9, S.gdp))}% ของ GDP · หน่วยการปกครองเก็บไว้ ${socN(S.kept)} · รั่วไหลจากคอร์รัปชัน ${socN(S.leak)} (${pc1(lk)}%) · ถึงคลังกลาง ${socN(S.reach)} · เข้าคลัง ${socN(S.treasury)}${st != null ? ` · เสถียรภาพเฉลี่ย ${Math.round(st)}` : ''}</span></div>`;
  }
  // customs and embargoes
  const others = ECO.states.filter(o => o !== s), rules = s.trade || [];
  h += `<div class="tr"><b>ภาษีศุลกากรและการคว่ำบาตร</b> <span class="w">กฎที่ระบุคู่ค้าและสินค้าชัดกว่าชนะ ไม่มีกฎใช้ภาษีนำเข้าข้างบน การคว่ำบาตรห้ามทั้งซื้อและขาย</span></div>`
    + rules.map((r, i) => `<div class="erow frule" data-ri="${i}"><select data-rf="p"${dis}><option value="*">ทุกรัฐ</option>${others.map(o => `<option value="${o.id}"${o.id === r.p ? ' selected' : ''}>${esc(o.name)}</option>`).join('')}</select><select data-rf="c"${dis}><option value="*">ทุกหมวด</option>${ECATS.filter(c => !ECAT[c].people).map(c => `<option value="${c}"${c === r.c ? ' selected' : ''}>${esc(ECAT[c].name)}</option>`).join('')}</select><label><input type="number" data-rf="t" min="0" max="300" step="1" value="${pc1(r.t)}" style="width:4.2em"${r.e ? ' disabled' : ''}${dis}> %</label><label><input type="checkbox" data-rf="e"${r.e ? ' checked' : ''}${dis}> คว่ำบาตร</label><button type="button" class="btn warn" data-rf="x"${dis}>ลบ</button></div>`).join('')
    + `<div class="btns"><button type="button" class="btn" data-rf="new"${dis}>เพิ่มกฎ</button><button type="button" class="btn" data-rf="reset"${dis}>คืนค่าการคลังตามระบอบ</button></div>`;
  return h;
}
$('ecobody').addEventListener('change', e => {
  const el = e.target; if (!editable || !el.dataset || (!el.dataset.fz && !el.dataset.rf)) return;
  const box = el.closest('[data-s]'), s = box ? ECO.states.find(x => x.id === box.dataset.s) : null; if (!s) return; s.fisc = s.fisc || {};
  if (el.dataset.fz) {
    const f = el.dataset.fz, v = clamp((+el.value || 0) / 100, 0, f.startsWith('b.') ? 1 : 0.9);
    if (f.startsWith('b.')) (s.fisc.bud || (s.fisc.bud = {}))[f.slice(2)] = v; else if (f.startsWith('k.')) (s.fisc.keep || (s.fisc.keep = {}))[f.slice(2)] = v; else if (f === 'corr') s.fisc.corr = Math.min(0.6, v); else s.fisc[f] = v;
  } else {
    const row = el.closest('[data-ri]'), r = row ? (s.trade || [])[+row.dataset.ri] : null; if (!r) return; const f = el.dataset.rf;
    if (f === 'p') r.p = el.value; else if (f === 'c') r.c = el.value; else if (f === 't') r.t = clamp((+el.value || 0) / 100, 0, 3); else if (f === 'e') r.e = el.checked ? 1 : 0;
  }
  ecoChanged(false); ecoRender();
});
$('ecobody').addEventListener('click', e => {
  const b = e.target.closest ? e.target.closest('button[data-rf]') : null; if (!b || !editable) return; const box = b.closest('[data-s]'), s = box ? ECO.states.find(x => x.id === box.dataset.s) : null; if (!s) return;
  const f = b.dataset.rf; s.trade = s.trade || [];
  if (f === 'new') s.trade.push({ p: '*', c: '*', t: fiscOf(s).imp, e: 0 });
  else if (f === 'x') { const row = b.closest('[data-ri]'); if (row) s.trade.splice(+row.dataset.ri, 1); }
  else if (f === 'reset') s.fisc = {};
  else return;
  ecoChanged(false); ecoRender();
});

// ---- a community's own rate (a share of the state's), under its head count ----
function taxCityForm() {
  const inp = $('cfTax'); if (!inp || !sel) return;
  const ec = ECON ? ECON.cities.find(c => c.id === sel) : null, s = ec && ec.st ? ECO.states.find(x => x.id === ec.st) || null : null;
  inp.value = ECO.cmul[sel] != null ? Math.round(ECO.cmul[sel] * 100) : ''; inp.placeholder = '100'; inp.disabled = !editable || !s || s.sys === 'anar';
  $('cfTaxNote').textContent = !s ? 'ชุมชนนอกรัฐไม่เสียภาษี' : s.sys === 'anar' ? 'ดินแดนที่ไม่มีรัฐไม่เก็บภาษี' : `ร้อยละของอัตราภาษีทุกชนิดของ${s.name} เว้นว่างคือ 100 ใส่ 0 คือยกเว้นภาษี`;
}
{ const lb = $('cfTax') && $('cfTax').closest('label'); if (lb && lb.firstChild && lb.firstChild.nodeType === 3) lb.firstChild.nodeValue = 'อัตราภาษีของชุมชน '; }
if ($('cfTax')) { $('cfTax').max = '300'; $('cfTax').onchange = () => { if (!sel || !editable) return; const v = $('cfTax').value.trim(); if (v === '' || !Number.isFinite(+v)) delete ECO.cmul[sel]; else ECO.cmul[sel] = clamp(+v / 100, 0, 3); ecoChanged(false); taxCityForm(); }; }
{ const rf = refreshForm; refreshForm = function () { rf(); taxCityForm(); }; }

// ---- the community's card: what it paid, what came back, how settled it is ----
{
  const sc = socCityHTML; socCityHTML = function (k) {
    let h = sc(k); const rows = ecoIncome(ecoGdp()), r = rows[k]; if (!h || !r || !(r.tax > 0 || r.taxBack > 0)) return h;
    const parts = Object.entries(r.taxParts || {}).filter(([, v]) => v >= 0.5).map(([x, v]) => FTAX[x] + ' ' + socN(v)).join(' · ');
    const line = `<div class="tr">ภาษี <b>${socN(r.tax)}</b> ${esc(ECO.central.name)} <span class="w">${parts}${r.taxBack > 0 ? ' · ได้คืนจากงบรัฐและส่วนที่หน่วยเก็บไว้ ' + socN(r.taxBack) : ''}</span></div>`
      + (r.stab != null ? `<div class="tr">เสถียรภาพ <b>${Math.round(r.stab)}</b> จาก 100 <span class="w">${(r.stabWhy || []).map(([t, v]) => `${t} ${v > 0 ? '+' : ''}${Math.round(v)}`).join(' · ')}</span></div>` : '');
    const at = h.indexOf('<div class="tr">ค่าแรง'); return at >= 0 ? h.slice(0, at) + line + h.slice(at) : h + line;
  };
}
