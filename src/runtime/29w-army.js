// ---------- armies (v0.19.0) ----------
// The owner asked for an army: kinds of troops, regiments reckoned from the population, and the weapons, armour, materiel and
// support gear each kind uses, all of it hanging on the country's resources and its power to make things; the stats and traits of
// the gear can be changed, and the gear counts as goods. The army, not the size of the country, is what lets a state press its
// neighbour's prices down.
// How a state's army is reckoned each year:
//   men        a share of its people under arms (by the kind of state), no more than last year's defence budget can pay:
//              each soldier draws a share of the state's mean income a head, plus the price of his kit
//   kinds      the state's mix shares the men among the kinds of troops; a regiment is a number of men (1,000 to start)
//   kit        each kind carries a set of gear; each piece of gear asks a class of goods, so many loads a year per thousand men;
//              those loads become the demand of the garrisons (the capital, the march seats, the duchy seats), and the trade
//              brings them like anything else
//   readiness  for each class, how much of what the garrisons asked for they got; a piece of gear counts as far as it was had
//   strength   men by the attack and defence of their kit, by its readiness, by the kind's own worth
// The neighbour's squeeze (29g) then weighs strength against strength where both states have an army.
// The kinds, the gear, their stats and loads are Claude's starting set; the army tab changes all of them. The loads were set so
// that a soldier's kit costs a little over a year of the mean income a head, his pay three fifths of one more.
const AEQ0 = {
  sword: { name: 'ดาบและหอก', part: 'weapon', cat: 'arms', q: 0.48, atk: 3, def: 1, spd: 0 },
  bow: { name: 'ธนูและหน้าไม้', part: 'weapon', cat: 'arms', q: 0.28, atk: 3, def: 0, spd: 0, also: { timber: 0.16 } },
  leather: { name: 'เกราะหนัง', part: 'armour', cat: 'cloth', q: 0.32, atk: 0, def: 2, spd: 0 },
  plate: { name: 'เกราะโลหะ', part: 'armour', cat: 'arms', q: 0.6, atk: 0, def: 4, spd: -1 },
  horse: { name: 'ม้าศึกและอาหารม้า', part: 'materiel', cat: 'livestock', q: 0.6, atk: 2, def: 0, spd: 3, also: { feed: 0.5, grain: 0.3 } },   // v0.21.0: the mounts are beasts of work now, fed on feed
  siege: { name: 'เครื่องยิงและปืนใหญ่', part: 'materiel', cat: 'tech', q: 0.24, atk: 6, def: 0, spd: -1, also: { stone: 0.4 } },
  warship: { name: 'เรือรบ', part: 'materiel', cat: 'ships', q: 0.6, atk: 3, def: 2, spd: 2, also: { timber: 0.4 } },
  arcane: { name: 'อุปกรณ์เวท', part: 'support', cat: 'mana', q: 0.2, atk: 3, def: 1, spd: 0, also: { tech: 0.08 } },
  ration: { name: 'เสบียงและยา', part: 'support', cat: 'grain', q: 0.5, atk: 0, def: 1, spd: 1, also: { food: 0.12, medicine: 0.03, protein: 0.1 } },   // v0.21.0: preserved food and medicine
  tools: { name: 'เครื่องมือช่างสนาม', part: 'support', cat: 'tools', q: 0.16, atk: 0, def: 1, spd: 0 },
};
const APART = { weapon: 'อาวุธ', armour: 'ชุดเกราะ', materiel: 'ยุทโธปกรณ์', support: 'อุปกรณ์สนับสนุน' };
const AUT0 = {
  inf: { name: 'ทหารราบ', kit: ['sword', 'leather', 'ration'], w: 1 },
  arch: { name: 'พลธนู', kit: ['bow', 'leather', 'ration'], w: 1 },
  cav: { name: 'ทหารม้า', kit: ['sword', 'plate', 'horse', 'ration'], w: 1.4 },
  heavy: { name: 'ทหารราบหนัก', kit: ['sword', 'plate', 'ration'], w: 1.2 },
  art: { name: 'ทหารปืนใหญ่', kit: ['siege', 'tools', 'ration'], w: 1 },
  navy: { name: 'ทหารเรือ', kit: ['sword', 'warship', 'ration'], w: 1.1, sea: 1 },
  mage: { name: 'นักเวทสนาม', kit: ['arcane', 'ration'], w: 1.5 },
};
const AMOB = { trad: 0.015, feud: 0.02, merc: 0.01, cap: 0.008, soc: 0.015, anar: 0.004 };
const AMIX = { trad: { inf: 0.5, arch: 0.4, cav: 0.1 }, feud: { inf: 0.4, arch: 0.2, cav: 0.25, heavy: 0.15 }, merc: { inf: 0.35, arch: 0.2, navy: 0.3, art: 0.15 }, cap: { inf: 0.35, art: 0.25, navy: 0.25, cav: 0.15 }, soc: { inf: 0.5, art: 0.2, heavy: 0.2, mage: 0.1 }, anar: { inf: 0.6, arch: 0.4 } };
Object.assign(ETUNE, { armyPay: [0.6, 0, 3, 0.05, 'ค่าจ้างทหารหนึ่งคนต่อปี เทียบรายได้เฉลี่ยต่อหัวของรัฐ', 'กองทัพ'] });
ECO.aeq = {}; ECO.aut = {};
const aeqAll = () => { const o = {}; for (const [k, z] of Object.entries(AEQ0)) { const x = ECO.aeq[k]; if (x && x.del) continue; o[k] = { ...z, ...(x || {}), also: { ...(z.also || {}), ...((x && x.also) || {}) } }; } for (const [k, x] of Object.entries(ECO.aeq)) if (!AEQ0[k] && !x.del) o[k] = { name: 'อุปกรณ์ใหม่', part: 'weapon', cat: 'arms', q: 1, atk: 1, def: 0, spd: 0, also: {}, ...x }; return o; };
const autAll = () => { const o = {}; for (const [k, z] of Object.entries(AUT0)) { const x = ECO.aut[k]; if (x && x.del) continue; o[k] = { ...z, ...(x || {}), kit: (x && x.kit) || z.kit.slice() }; } for (const [k, x] of Object.entries(ECO.aut)) if (!AUT0[k] && !x.del) o[k] = { name: 'หน่วยใหม่', kit: ['sword', 'ration'], w: 1, ...x }; return o; };
let ARMY = { st: new Map(), need: new Map(), ver: 0 };
const armyOf = s => { const a = s.army || {}; return { mob: a.mob != null ? a.mob : AMOB[s.sys] || 0.01, mix: a.mix && Object.keys(a.mix).length ? a.mix : AMIX[s.sys] || AMIX.merc, reg: a.reg > 0 ? a.reg : 1000 }; };

// the year's reckoning, after the trade and the books: who stands under arms, with what, and how ready
function armyReckon() {
  const E = ECON; if (!E || !SOC) return; const EQ = aeqAll(), UT = autAll(), rows = SOC.rows || ecoIncome(ecoGdp()), per = ECO.central.per;
  const st = new Map(), need = new Map();
  for (const s of ECO.states) {
    const A = armyOf(s), mine = rows.filter(r => r.s === s); if (!mine.length) continue;
    let ppl = 0, inc = 0; for (const r of mine) { ppl += r.people; inc += Math.max(0, r.inc); } const mean = ppl > 0 ? inc / ppl : 0;
    const port = mine.some(r => r.c.port), mix = Object.entries(A.mix).filter(([k, v]) => UT[k] && v > 0 && (!UT[k].sea || port)); const ms = mix.reduce((a, [, v]) => a + v, 0) || 1;
    // the price of one man's kit a year, at the capital's prices
    const cap = (() => { const k = ECOX.cap.get(s); return k != null ? k : E.cities.indexOf(mine.reduce((a, r) => !a || r.people > a.people ? r : a, null).c); })();
    const priceOf = cat => (E.P1[cap] && E.P1[cap][cat] || 1) * ECAT[cat].v * per;
    const kitCost = k => UT[k].kit.reduce((a, e) => { const q = EQ[e]; if (!q) return a; let c = q.q * priceOf(q.cat); for (const [cat, x] of Object.entries(q.also || {})) if (ECAT[cat]) c += x * priceOf(cat); return a + c / 1000; }, 0);
    const perMan = mix.reduce((a, [k, v]) => a + (v / ms) * (TU('armyPay') * mean + kitCost(k)), 0);
    const want = ppl * A.mob, F = typeof FISC !== 'undefined' ? FISC.st.get(s.id) : null, locMil = typeof FISC !== 'undefined' ? [...FISC.unit.values()].reduce((a, U) => a + (U.st === s.id ? U.bud.mil : 0), 0) : 0, can = F && perMan > 0 ? (F.bud.mil + locMil) / perMan : Infinity;   // v0.21.0: what the units spend on their own guard raises men too
    const men = Math.max(0, Math.min(want, can)), units = {};
    for (const [k, v] of mix) { const m = men * v / ms; units[k] = { men: m, regs: Math.ceil(m / A.reg - 1e-9), kit: UT[k].kit.slice() }; }
    // where they stand: the capital, the march seats, the duchy seats
    const seats = [cap]; if (ECO.adm.length) for (const u of ECO.adm) if (u.t === 2 && u.seat) { const k = E.cities.findIndex(c => c.id === u.seat); if (k >= 0 && E.cities[k].st === s.id && !seats.includes(k)) seats.push(k); }
    const share = seats.map((k, i) => i === 0 ? (seats.length > 1 ? 0.4 : 1) : 0.6 / (seats.length - 1));
    const loads = {}; for (const [k, u] of Object.entries(units)) for (const e of u.kit) { const q = EQ[e]; if (!q) continue; loads[q.cat] = (loads[q.cat] || 0) + q.q * u.men / 1000; for (const [cat, x] of Object.entries(q.also || {})) if (ECAT[cat]) loads[cat] = (loads[cat] || 0) + x * u.men / 1000; }
    seats.forEach((k, i) => { const id = E.cities[k].id, m = need.get(id) || {}; for (const [cat, x] of Object.entries(loads)) m[cat] = (m[cat] || 0) + x * share[i]; need.set(id, m); });
    // readiness: of what the garrisons asked for, what they got this year
    const ready = {}; for (const cat of Object.keys(loads)) { let w = 0, g = 0; for (const k of seats) { const nd = E.need[k][cat] || 0, got = E.got[k][cat] || 0, a = (ARMY.need.get(E.cities[k].id) || {})[cat] || 0; if (!(a > 0)) continue; w += a; g += a * Math.min(1, nd > 0 ? got / nd : 1); } ready[cat] = w > 0 ? g / w : 0.5; }
    let pow = 0; for (const [k, u] of Object.entries(units)) { let s0 = 1; for (const e of u.kit) { const q = EQ[e]; if (!q) continue; const r = ready[q.cat] == null ? 0.5 : ready[q.cat]; s0 += (q.atk + q.def + 0.5 * q.spd) * r; } u.pow = u.men / 1000 * s0 * (UT[k].w || 1); pow += u.pow; }
    st.set(s.id, { s, A, men, want, can, perMan, units, ready, pow, seats: seats.map(k => E.cities[k].id), loads });
  }
  const changed = (() => { if (need.size !== ARMY.need.size) return true; for (const [id, m] of need) { const o = ARMY.need.get(id) || {}; for (const [c, x] of Object.entries(m)) if (Math.abs(x - (o[c] || 0)) > 0.05 * Math.max(0.2, x)) return true; } return false; })();
  ARMY = { st, need, ver: ARMY.ver + 1 }; return changed;
}
{ const an0 = armyNeed; armyNeed = (c, cat) => { const m = ARMY.need.get(c.id); return an0(c, cat) + (m && m[cat] || 0); }; }   // v0.21.0: on top of what came before (the mint, 29ub)
pressPow = (s, b) => { const a = ARMY.st.get(s.id), any = ARMY.st.size > 1; return any && a ? a.pow + 1e-6 : b.gdp; };
// the garrisons' demand and the army it feeds settle in a couple of rounds
{
  let rounds = 0;
  const ec = econCompute; econCompute = function () { const r = ec(); try { const ch = armyReckon(); if (ch && rounds < 2) { rounds++; scheduleEcon(60); } else rounds = 0; } catch (err) { console.error(err); } return r; };
}

// ---- the document ----
{
  const ld = ecoLoad, sr = ecoSerial, num = (x, a, b) => Number.isFinite(+x) ? clamp(+x, a, b) : null;
  ecoLoad = function (b) {
    ld(b); b = b || {};
    ECO.aeq = {}; for (const [k, x] of Object.entries(b.aeq || {}).slice(0, 60)) { if (!/^[a-z0-9]{1,16}$/.test(k) || !x || typeof x !== 'object') continue; const o = {}; if (x.del) o.del = 1; if (typeof x.name === 'string') o.name = x.name.slice(0, 40); if (APART[x.part]) o.part = x.part; if (ECAT[x.cat] && !ECAT[x.cat].people) o.cat = x.cat; for (const [f, a, z] of [['q', 0, 20], ['atk', -10, 30], ['def', -10, 30], ['spd', -10, 10]]) { const v = num(x[f], a, z); if (v != null) o[f] = v; } if (x.also && typeof x.also === 'object') { o.also = {}; for (const [c, v] of Object.entries(x.also)) if (ECAT[c] && +v >= 0) o.also[c] = Math.min(20, +v); } ECO.aeq[k] = o; }
    ECO.aut = {}; for (const [k, x] of Object.entries(b.aut || {}).slice(0, 40)) { if (!/^[a-z0-9]{1,16}$/.test(k) || !x || typeof x !== 'object') continue; const o = {}; if (x.del) o.del = 1; if (typeof x.name === 'string') o.name = x.name.slice(0, 40); if (Array.isArray(x.kit)) o.kit = x.kit.filter(e => typeof e === 'string' && /^[a-z0-9]{1,16}$/.test(e)).slice(0, 8); const w = num(x.w, 0.1, 10); if (w != null) o.w = w; if (x.sea) o.sea = 1; ECO.aut[k] = o; }
    const by = new Map((Array.isArray(b.states) ? b.states : []).filter(s => s && typeof s.id === 'string').map(s => [s.id, s]));
    for (const s of ECO.states) { const a = (by.get(s.id) || {}).army; s.army = {}; if (a && typeof a === 'object') { const m = num(a.mob, 0, 0.3); if (m != null) s.army.mob = m; const r = num(a.reg, 50, 100000); if (r != null) s.army.reg = Math.round(r); if (a.mix && typeof a.mix === 'object') { s.army.mix = {}; for (const [k, v] of Object.entries(a.mix).slice(0, 40)) if (/^[a-z0-9]{1,16}$/.test(k) && +v >= 0) s.army.mix[k] = Math.min(1, +v); } } }
  };
  ecoSerial = function () { const o = sr(); if (Object.keys(ECO.aeq).length) o.aeq = JSON.parse(JSON.stringify(ECO.aeq)); if (Object.keys(ECO.aut).length) o.aut = JSON.parse(JSON.stringify(ECO.aut)); return o; };
}

// ---- in the state's card: how many under arms, of what kinds, how ready ----
{
  const tf = taxStateForm; taxStateForm = function (s) {
    let h = tf(s); if (s.sys === 'anar') return h; const A = armyOf(s), R = ARMY.st.get(s.id), UT = autAll(), dis = editable ? '' : ' disabled';
    h += `<div class="tr"><b>กองทัพ</b> <span class="w">จำนวนทหารคิดจากประชากร ไม่เกินที่งบกลาโหมจ่ายไหว ชนิดหน่วย อุปกรณ์ และค่าสถานะแก้ได้ในแท็บกองทัพ</span></div>`
      + `<div class="ftax"><label>ทหารต่อประชากร <input type="number" data-am="mob" min="0" max="30" step="0.1" value="${pc1(A.mob)}" style="width:4.6em"${dis}> %</label><label>คนต่อกรม <input type="number" data-am="reg" min="50" max="100000" step="50" value="${A.reg}" style="width:6em"${dis}></label></div>`
      + `<div class="ftax">${Object.entries(UT).map(([k, u]) => `<label>${esc(u.name)} <input type="number" data-am="mix.${k}" min="0" max="100" step="5" value="${Math.round((A.mix[k] || 0) * 100)}" style="width:4.2em"${dis}> ส่วน</label>`).join('')}</div>`;
    if (R) {
      h += `<div class="tr">ทหาร <b>${socN(R.men)}</b> คน <span class="w">${R.can < R.want ? `งบกลาโหมจ่ายได้ ${socN(R.can)} จากที่ต้องการ ${socN(R.want)} · ` : ''}กำลังรบ ${Math.round(R.pow)} · ค่าใช้จ่ายต่อคนต่อปี ${socN(R.perMan)} ${esc(ECO.central.name)} · ประจำการที่ ${R.seats.map(id => esc((visibleCities().find(c => c.id === id) || {}).name || '')).join(' ')}</span></div>`
        + Object.entries(R.units).filter(([, u]) => u.men >= 1).map(([k, u]) => `<div class="tr w">${esc(UT[k] ? UT[k].name : k)}: ${u.regs} กรม ${socN(u.men)} คน กำลังรบ ${Math.round(u.pow)}</div>`).join('')
        + `<div class="tr w">ความพร้อมของอุปกรณ์: ${Object.entries(R.ready).map(([c, r]) => `${esc(ECAT[c].name)} ${Math.round(r * 100)}%`).join(' · ')}</div>`;
    }
    return h;
  };
}
$('ecobody').addEventListener('change', e => {
  const el = e.target; if (!editable || !el.dataset || !el.dataset.am) return; const box = el.closest('[data-s]'), s = box ? ECO.states.find(x => x.id === box.dataset.s) : null; if (!s) return;
  s.army = s.army || {}; const f = el.dataset.am;
  if (f === 'mob') s.army.mob = clamp((+el.value || 0) / 100, 0, 0.3); else if (f === 'reg') s.army.reg = clamp(Math.round(+el.value || 1000), 50, 100000);
  else if (f.startsWith('mix.')) { const cur = { ...armyOf(s).mix }; cur[f.slice(4)] = clamp((+el.value || 0) / 100, 0, 1); s.army.mix = cur; }
  ecoChanged(false); ecoRender();
});

// ---- the army tab: the gear and the kinds of troops ----
{
  const row = $('ecoTab'); if (row && !row.querySelector('[data-t="army"]')) { const b = document.createElement('button'); b.type = 'button'; b.dataset.t = 'army'; b.textContent = 'กองทัพ'; row.insertBefore(b, row.querySelector('[data-t="orgs"]')); }
  const er = ecoRender; ecoRender = function () {
    if (ecoTab !== 'army') return er();
    ecoTab = 'tune'; er(); ecoTab = 'army'; if ($('ecocard').hidden) return;
    segPick('ecoTab', 't', ecoTab, t => { ecoTab = t; ecoRender(); requestDraw(); if (window.MME && MME.shell && MME.shell.reveal) MME.shell.reveal('ecocard'); });
    $('ecoHead').textContent = 'กองทัพ: ชนิดหน่วยและอุปกรณ์'; $('ecoHint').textContent = 'อุปกรณ์แต่ละชิ้นใช้สินค้าหนึ่งหมวด (และหมวดอื่นได้อีก) เป็นจำนวนเที่ยวขนต่อทหารพันคนต่อปี ความต้องการนี้ไปอยู่ที่เมืองที่ทหารประจำการ';
    $('ecobody').innerHTML = armyHTML();
  };
}
function armyHTML() {
  const EQ = aeqAll(), UT = autAll(), dis = editable ? '' : ' disabled', cats = ECATS.filter(c => !ECAT[c].people);
  let h = `<h4>ชนิดหน่วย</h4>`;
  for (const [k, u] of Object.entries(UT)) h += `<details class="efold scard" data-au="${k}"><summary>${esc(u.name)} <small>${u.kit.map(e => EQ[e] ? EQ[e].name : '').filter(Boolean).join(' · ')}</small></summary><div class="eform">`
    + `<div class="erow"><label>ชื่อ <input type="text" data-auf="name" maxlength="40" value="${esc(u.name)}"${dis}></label><label>ค่าความชำนาญ <input type="number" data-auf="w" min="0.1" max="10" step="0.1" value="${u.w}" style="width:4.6em"${dis}></label><label><input type="checkbox" data-auf="sea"${u.sea ? ' checked' : ''}${dis}> ต้องมีเมืองท่า</label></div>`
    + `<div class="polset">${Object.entries(EQ).map(([e, q]) => `<label><input type="checkbox" data-auk="${e}"${u.kit.includes(e) ? ' checked' : ''}${dis}> ${esc(q.name)}</label>`).join('')}</div>`
    + `<div class="btns"><button type="button" class="btn warn" data-aa2="udel"${dis}>${AUT0[k] ? 'ซ่อนชนิดนี้' : 'ลบชนิดนี้'}</button></div></div></details>`;
  h += `<div class="btns"><button type="button" class="btn" data-aa2="unew"${dis}>เพิ่มชนิดหน่วย</button></div><h4>อุปกรณ์</h4>`;
  for (const [e, q] of Object.entries(EQ)) h += `<details class="efold scard" data-ae="${e}"><summary>${esc(q.name)} <small>${APART[q.part]} · ${esc(ECAT[q.cat].name)} ${q.q} · โจมตี ${q.atk} ป้องกัน ${q.def} ความเร็ว ${q.spd}</small></summary><div class="eform">`
    + `<div class="erow"><label>ชื่อ <input type="text" data-aef="name" maxlength="40" value="${esc(q.name)}"${dis}></label><label>ประเภท <select data-aef="part"${dis}>${Object.entries(APART).map(([p, n]) => `<option value="${p}"${p === q.part ? ' selected' : ''}>${n}</option>`).join('')}</select></label></div>`
    + `<div class="erow"><label>สินค้าที่ใช้ <select data-aef="cat"${dis}>${cats.map(c => `<option value="${c}"${c === q.cat ? ' selected' : ''}>${esc(ECAT[c].name)}</option>`).join('')}</select></label><label><input type="number" data-aef="q" min="0" max="20" step="0.1" value="${q.q}" style="width:4.6em"${dis}> เที่ยวต่อพันคนต่อปี</label></div>`
    + `<div class="ftax"><label>โจมตี <input type="number" data-aef="atk" min="-10" max="30" step="0.5" value="${q.atk}" style="width:4.2em"${dis}></label><label>ป้องกัน <input type="number" data-aef="def" min="-10" max="30" step="0.5" value="${q.def}" style="width:4.2em"${dis}></label><label>ความเร็ว <input type="number" data-aef="spd" min="-10" max="10" step="0.5" value="${q.spd}" style="width:4.2em"${dis}></label></div>`
    + (Object.keys(q.also || {}).length ? `<div class="tr w">ใช้เพิ่ม: ${Object.entries(q.also).map(([c, x]) => `${esc(ECAT[c].name)} ${x}`).join(' · ')}</div>` : '')
    + `<div class="btns"><button type="button" class="btn warn" data-aa2="edel"${dis}>${AEQ0[e] ? 'ซ่อนอุปกรณ์นี้' : 'ลบอุปกรณ์นี้'}</button></div></div></details>`;
  h += `<div class="btns"><button type="button" class="btn" data-aa2="enew"${dis}>เพิ่มอุปกรณ์</button><button type="button" class="btn" data-aa2="reset"${dis}>คืนค่าตั้งต้นทั้งหมด</button></div>`;
  const rows = [...ARMY.st.values()].sort((a, b) => b.pow - a.pow);
  if (rows.length) h += `<h4>กำลังของแต่ละรัฐ</h4>` + rows.map(R => `<div class="tr"><a href="#" data-sopen="${R.s.id}">${esc(R.s.name)}</a> <span class="w">ทหาร ${socN(R.men)} คน · กำลังรบ ${Math.round(R.pow)}</span></div>`).join('') + `<p class="note">รัฐที่กำลังรบมากกว่ากดราคาสินค้าของรัฐเพื่อนบ้านที่ไม่ใช่พันธมิตรได้ เดิมระบบใช้ขนาดเศรษฐกิจของรัฐ</p>`;
  return h;
}
$('ecobody').addEventListener('change', e => {
  if (ecoTab !== 'army' || !editable) return; const el = e.target;
  const du = el.closest('[data-au]'), de = el.closest('[data-ae]');
  if (du) { const k = du.dataset.au, o = ECO.aut[k] || (ECO.aut[k] = {}), cur = autAll()[k]; if (el.dataset.auf === 'name') o.name = el.value.trim().slice(0, 40) || cur.name; else if (el.dataset.auf === 'w') o.w = clamp(+el.value || 1, 0.1, 10); else if (el.dataset.auf === 'sea') o.sea = el.checked ? 1 : 0; else if (el.dataset.auk) { const s = new Set(cur.kit); if (el.checked) s.add(el.dataset.auk); else s.delete(el.dataset.auk); o.kit = [...s].slice(0, 8); } }
  else if (de) { const k = de.dataset.ae, o = ECO.aeq[k] || (ECO.aeq[k] = {}), f = el.dataset.aef; if (f === 'name') o.name = el.value.trim().slice(0, 40) || aeqAll()[k].name; else if (f === 'part') o.part = APART[el.value] ? el.value : 'weapon'; else if (f === 'cat') o.cat = ECAT[el.value] ? el.value : 'arms'; else if (f) o[f] = +el.value || 0; }
  else return;
  ecoChanged(true); ecoRender();
});
$('ecobody').addEventListener('click', e => {
  if (ecoTab !== 'army' || !editable) return; const b = e.target.closest ? e.target.closest('[data-aa2]') : null; if (!b) return; const a = b.dataset.aa2;
  const newId = p => { let k; do { k = p + Math.random().toString(36).slice(2, 7); } while (ECO.aeq[k] || ECO.aut[k] || AEQ0[k] || AUT0[k]); return k; };
  if (a === 'unew') ECO.aut[newId('u')] = { name: 'หน่วยใหม่', kit: ['sword', 'ration'], w: 1 };
  else if (a === 'enew') ECO.aeq[newId('e')] = { name: 'อุปกรณ์ใหม่', part: 'weapon', cat: 'arms', q: 1, atk: 1, def: 0, spd: 0 };
  else if (a === 'udel') { const k = b.closest('[data-au]').dataset.au; if (AUT0[k]) ECO.aut[k] = { ...(ECO.aut[k] || {}), del: 1 }; else delete ECO.aut[k]; }
  else if (a === 'edel') { const k = b.closest('[data-ae]').dataset.ae; if (AEQ0[k]) ECO.aeq[k] = { ...(ECO.aeq[k] || {}), del: 1 }; else delete ECO.aeq[k]; }
  else if (a === 'reset') { ECO.aeq = {}; ECO.aut = {}; }
  else return;
  ecoChanged(true); ecoRender();
});
// the peek and the community card name a garrison
{ const px = peekCityExtra; peekCityExtra = (c, E) => { let t = ''; for (const R of ARMY.st.values()) if (R.seats.includes(c.id)) { const regs = Object.values(R.units).reduce((a, u) => a + u.regs, 0), share = R.seats.length > 1 ? (R.seats[0] === c.id ? 0.4 : 0.6 / (R.seats.length - 1)) : 1; t = `<div class="m">ทหารประจำการราว ${socN(R.men * share)} คน (${Math.max(1, Math.round(regs * share))} กรม)</div>`; } return px(c, E) + t; }; }
