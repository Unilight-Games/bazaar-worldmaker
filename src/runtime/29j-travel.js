// ---------- people on the move: kin, pilgrims and business (v0.17.0, the owner's ask) ----------
// Goods were the only thing the lines carried. Now people ride them too, for four reasons:
//   - sightseeing, the visitors of v0.13.0, unchanged, only now they are put on the lines they ride;
//   - personal journeys: kin, errands, a wedding in the next town. Many short trips, mostly within the traveller's own state;
//   - pilgrimage: to a holy city. Fewer trips, but pilgrims go far, and a city whose people can reach a holy place lives better;
//   - business: merchants who follow the goods. The more two cities trade, the more of their people go between them.
// Each journey goes the cheapest way the network has between the two cities, so a railway or a royal road draws travellers as it
// draws caravans. Personal, pilgrim and business travellers spend in the city they go to, which counts as that city's income
// and, across a border, in the two states' books. Every number here is mine, and each sits in the numbers tab.
Object.assign(ETUNE, {
  trvPer: [0.06, 0, 1, 0.005, 'จำนวนเที่ยวเดินทางส่วนตัว (เยี่ยมญาติ ธุระ งานบุญ) ต่อคนต่อปี ในเมืองที่รายได้และความเป็นอยู่เท่าค่าเฉลี่ย', 'การเดินทางของผู้คน'],
  trvPerFar: [0.6, 0.1, 10, 0.1, 'ระยะที่การเดินทางส่วนตัวลดลงราวสองในสาม เป็นกี่เท่าของการเดินทางยาวปานกลางของแผนที่', 'การเดินทางของผู้คน'],
  trvPerSpend: [0.01, 0, 1, 0.005, 'เงินที่ผู้เดินทางส่วนตัวหนึ่งคนใช้ในเมืองที่ไป เป็นส่วนของรายได้ต่อหัวเฉลี่ยของแผนที่ (ส่วนใหญ่พักกับญาติ)', 'การเดินทางของผู้คน'],
  trvPilg: [0.015, 0, 1, 0.005, 'จำนวนเที่ยวแสวงบุญต่อคนต่อปี เมื่อมีเมืองศักดิ์สิทธิ์บนแผนที่', 'การเดินทางของผู้คน'],
  trvPilgFar: [2, 0.1, 10, 0.1, 'ระยะที่การแสวงบุญลดลงราวสองในสาม เป็นกี่เท่าของการเดินทางยาวปานกลางของแผนที่ (ผู้แสวงบุญยอมไปไกล)', 'การเดินทางของผู้คน'],
  trvPilgSpend: [0.02, 0, 1, 0.005, 'เงินที่ผู้แสวงบุญหนึ่งคนใช้ในเมืองศักดิ์สิทธิ์ เป็นส่วนของรายได้ต่อหัวเฉลี่ยของแผนที่', 'การเดินทางของผู้คน'],
  trvPilgWell: [4, 0, 30, 0.5, 'ความเป็นอยู่ที่เพิ่มขึ้นเต็มที่ (แต้ม) ในเมืองที่ไปถึงที่ศักดิ์สิทธิ์ทุกแห่งได้ง่าย ลดตามระยะทาง', 'การเดินทางของผู้คน'],
  trvBiz: [0.1, 0, 20, 0.01, 'การเดินทางติดต่อธุรกิจ: จำนวนเที่ยวต่อมูลค่าการค้าระหว่างสองเมืองเท่ารายได้ต่อหัวเฉลี่ยของแผนที่หนึ่งคน', 'การเดินทางของผู้คน'],
  trvBizSpend: [0.04, 0, 1, 0.005, 'เงินที่นักธุรกิจหนึ่งคนใช้ในเมืองที่ไป เป็นส่วนของรายได้ต่อหัวเฉลี่ยของแผนที่ (โรงเตี๊ยม อาหาร นายหน้า)', 'การเดินทางของผู้คน'],
  railStep: [0.3, 0.05, 2.4, 0.05, 'ค่าเดินทางหนึ่งช่องบนทางรถไฟ ทั้งของและคน (ถนนหลวง 0.6 ถนนลูกรัง 0.75 ทางเกวียน 0.95 ทุ่งหญ้าไม่มีถนน 2.4)', 'การเดินทางของผู้คน'],
});
const TRVK = {
  tour: ['ท่องเที่ยว', '#f0c96a'],
  per: ['ส่วนตัว', '#9fd0f0'],
  pilg: ['แสวงบุญ', '#e9a0d8'],
  biz: ['ธุรกิจ', '#a6e0a0'],
};
const HOLY = { 1: ['ศาลเจ้าท้องถิ่น', 1], 2: ['ศูนย์แสวงบุญของภูมิภาค', 3], 3: ['ศูนย์แสวงบุญใหญ่', 8] };
ECO.holy = {};
let TRV = null;
{ const ec = econCompute; econCompute = function () { RAIL_STEP = TU('railStep'); return ec(); }; }

// how holy a city is: the owner's mark, the houses of faiths in it, old stones nearby and the great peak in sight
function trvHoly(c, pts, st) {
  const why = []; let h = 0;
  const own = HOLY[ECO.holy[c.id]]; if (own) { h += own[1]; why.push([own[0], own[1]]); }
  let f = 0; for (const o of c.org || []) if (o.kind === 'faith') f += relOrgW(c, o); if (f) { h += f; why.push(['บ้านขององค์กรศาสนา ' + f + ' แห่ง', f]); }
  let near = 0; for (const p of pts) if (p.h >= 0 && (p.k === 'pillar' || p.k === 'ruin') && Math.hypot(CX[p.h] - c.x, CY[p.h] - c.y) <= 2.2 * DY) near += p.k === 'pillar' ? 0.5 : 0.25;
  if (near) { h += near; why.push(['เสาหินหรือซากโบราณใกล้เมือง', near]); }
  if (st >= 0 && Math.hypot(CX[st] - c.x, CY[st] - c.y) <= 3.2 * DY) { h += 2; why.push(['มองเห็นยอดเขาศักดิ์สิทธิ์', 2]); }
  { const rh = relHoly(c); if (rh.h) { h += rh.h; why.push(...rh.why); } }
  const fh = c.fx ? c.fx.holy : 0; if (fh) { h += fh; why.push([c.kind === 'monastery' && !comTr(c.id).includes('holy') ? 'เป็นอาราม' : 'ชนิดและคุณลักษณะของชุมชน', fh]); }   // v0.18.5 (29k)
  return { h, why };
}
function trvApply(E, rows, book, mean, tpairs) {
  const n = rows.length; TRV = null; if (!E || !n) return;
  const tRef = socTRef(E), per = ECO.central.per, NT = E.NT, NWAY = E.NWAY || null;
  const pts = ptLike(), st = stPeak();
  const out = {}, inn = {}, spendIn = new Float64Array(n), spendOut = new Float64Array(n), pairs = [];
  for (const k of Object.keys(TRVK)) { out[k] = new Float64Array(n); inn[k] = new Float64Array(n); }
  const add = (i, j, x, k) => { if (!(x > 0) || i === j) return; out[k][i] += x; inn[k][j] += x; pairs.push([i, j, x, k]); };
  for (const [i, j, x] of tpairs) add(i, j, x, 'tour');
  const relW = (A, B) => A === B ? 1 : A && B && (A.rel[B.id] === 'ally' || B.rel[A.id] === 'ally') ? 0.5 : 0.25;
  // personal journeys: to the cities near and big, most within the state
  const farP = Math.max(1e-6, TU('trvPerFar') * tRef), rateP = TU('trvPer'), W = new Float64Array(n);
  if (rateP > 0 && n > 1) for (let i = 0; i < n; i++) {
    const r = rows[i], G = r.people * rateP * Math.sqrt(clamp(r.rich, 0.2, 3)) * r.well0 / 100; if (!(G >= 0.5)) continue;
    let sum = 0; for (let j = 0; j < n; j++) { W[j] = 0; if (j === i) continue; const t = NT[i][j]; if (!isFinite(t) || ecoRival(r.s, rows[j].s)) continue; sum += W[j] = rows[j].people * relW(r.s, rows[j].s) * Math.exp(-t / farP); }
    if (sum > 0) for (let j = 0; j < n; j++) if (W[j] > 0) add(i, j, G * W[j] / sum, 'per');
  }
  // pilgrimage: to the holy cities, the holier and the nearer the more; a holy city's own people need not travel
  const holy = rows.map(r => trvHoly(r.c, pts, st)), H = holy.map(x => x.h), Hsum = H.reduce((a, b) => a + b, 0);
  const farG = Math.max(1e-6, TU('trvPilgFar') * tRef), rateG = TU('trvPilg'), wellG = TU('trvPilgWell');
  rows.forEach((r, i) => { r.holy = holy[i]; r.trvWell = 0; r.pilgAccess = 0; });
  if (Hsum > 0) for (let i = 0; i < n; i++) {
    const r = rows[i]; let sum = H[i], away = 0;
    for (let j = 0; j < n; j++) { W[j] = 0; if (j === i || !(H[j] > 0)) continue; const t = NT[i][j]; if (!isFinite(t) || ecoRival(r.s, rows[j].s)) continue; const e = Math.exp(-t / farG); W[j] = H[j] * e * relPilgW(r, rows[j]); sum += W[j]; away += W[j]; }
    r.pilgAccess = sum / Hsum; r.trvWell = wellG * r.pilgAccess;
    // the more holiness within reach, the more often people go: as often as the rate says when a regional centre (3) is at hand
    const G = r.people * rateG * relPilgRate(r) * Math.pow(clamp(r.rich, 0.3, 2), 0.3) * Math.min(2, Math.sqrt(away / 3)) * (sum > 0 ? away / sum : 0); if (!(G >= 0.5) || !(away > 0)) continue;
    sum = away;
    for (let j = 0; j < n; j++) if (W[j] > 0) add(i, j, G * W[j] / sum, 'pilg');
  }
  // business: merchants follow the goods, half of them from the seller's side and half from the buyer's
  const deal = TU('trvBiz') > 0 && mean > 0 ? mean / TU('trvBiz') : 0;
  if (deal > 0) {
    const val = new Map();
    for (const f of E.flows) { if (f.cat === 'labor' || f.from === f.to) continue; const v = f.amt * ECAT[f.cat].v * (E.P1[f.to][f.cat] || 1) * per; if (!(v > 0)) continue; const a = Math.min(f.from, f.to), b = Math.max(f.from, f.to), key = a * n + b; val.set(key, (val.get(key) || 0) + v); }
    for (const [key, v] of val) { const a = Math.floor(key / n), b = key % n, x = v / deal; add(a, b, x / 2, 'biz'); add(b, a, x / 2, 'biz'); }
  }
  // what they spend where they go
  const sp = { per: TU('trvPerSpend') * mean, pilg: TU('trvPilgSpend') * mean, biz: TU('trvBizSpend') * mean };
  for (const [i, j, x, k] of pairs) {
    const m = sp[k]; if (!(m > 0)) continue; const v = x * m; spendIn[j] += v; spendOut[i] += v;
    const A = rows[i].s, B = rows[j].s; if (A !== B) { if (A) { const b = book(A); b.trvOut = (b.trvOut || 0) + v; } if (B) { const b = book(B); b.trvIn = (b.trvIn || 0) + v; } }
  }
  rows.forEach((r, k) => { r.inc += spendIn[k] - spendOut[k]; r.trv = { out: Object.fromEntries(Object.keys(TRVK).map(q => [q, out[q][k]])), inn: Object.fromEntries(Object.keys(TRVK).map(q => [q, inn[q][k]])), spendIn: spendIn[k], spendOut: spendOut[k] }; });
  // on the lines
  for (const L of E.links) { L.pax = 0; L.paxBy = { tour: 0, per: 0, pilg: 0, biz: 0 }; }
  let tot = 0, ride = 0, onRail = 0; const by = { tour: 0, per: 0, pilg: 0, biz: 0 };
  for (const [i, j, x, k] of pairs) {
    by[k] += x; tot += x; const way = NWAY ? NWAY[i][j] : null; if (!way || !way.length) continue;
    let dry = 0, rl = 0; for (const [li] of way) { const L = E.links[li]; if (!L) continue; L.pax += x; L.paxBy[k] += x; dry += L.dry + L.wet; rl += L.rail || 0; }
    ride += x; if (dry > 0) onRail += x * rl / dry;
  }
  let top = 0; for (const L of E.links) if (L.pax > top) top = L.pax;
  TRV = { by, tot, ride, onRail, top, sp, pairs: pairs.length, holy: holy.map((x, k) => [k, x]).filter(x => x[1].h > 0) };
  E.trv = TRV;
}

// ---- the document: the owner's holy cities ----
{
  const ld = ecoLoad, sr = ecoSerial;
  ecoLoad = function (b) { ld(b); b = b || {}; ECO.holy = {}; for (const [id, v] of Object.entries(b.holy || {}).slice(0, 4000)) if (HOLY[v]) ECO.holy[ecoStr(id, 120)] = +v; };
  ecoSerial = function () { const o = sr(); if (Object.keys(ECO.holy).length) o.holy = { ...ECO.holy }; return o; };
}

// ---- on the screen ----
const trvList = o => Object.keys(TRVK).filter(k => o[k] >= 0.5).map(k => `${TRVK[k][0]} ${socN(o[k])}`).join(' · ');
function trvCityHTML(k) {
  const rows = ecoIncome(ecoGdp()), r = rows[k]; if (!r || !r.trv) return ''; const c = r.c, T = r.trv, coin = esc(ECO.central.name), dis = editable ? '' : ' disabled';
  const sumO = o => Object.values(o).reduce((a, b) => a + b, 0), own = ECO.holy[c.id] || 0;
  let h = `<h3>การเดินทางของผู้คน</h3>`
    + `<div class="tr">มาเยือนเมืองนี้ <b>${socN(sumO(T.inn))}</b> คนต่อปี <span class="w">${trvList(T.inn) || 'ไม่มี'}</span></div>`
    + `<div class="tr">คนของเมืองออกเดินทาง <b>${socN(sumO(T.out))}</b> คนต่อปี <span class="w">${trvList(T.out) || 'ไม่มี'}</span></div>`
    + `<div class="tr">ผู้มาเยือนที่ไม่ใช่นักท่องเที่ยวใช้เงินในเมือง <b>${socN(T.spendIn)}</b> ${coin} <span class="w">คนของเมืองไปใช้ที่อื่น ${socN(T.spendOut)} ${coin}</span></div>`;
  h += `<div class="optrow"><span class="lbl">ที่ศักดิ์สิทธิ์</span><select data-tv="holy"${dis}><option value="0">ไม่ได้ตั้ง</option>${Object.entries(HOLY).map(([q, z]) => `<option value="${q}"${+q === own ? ' selected' : ''}>${z[0]}</option>`).join('')}</select></div>`;
  h += r.holy && r.holy.h > 0 ? `<div class="tr w">ความศักดิ์สิทธิ์ ${r.holy.h.toFixed(1)} จาก ${r.holy.why.map(x => x[0]).join(' · ')}</div>` : `<div class="tr w">เมืองนี้ยังไม่ใช่ที่แสวงบุญ ตั้งเองได้ที่ช่องด้านบน หรือเมืองจะศักดิ์สิทธิ์เองเมื่อมีบ้านขององค์กรศาสนา มีเสาหินหรือซากโบราณใกล้เมือง หรืออยู่ใกล้ยอดเขาศักดิ์สิทธิ์</div>`;
  if (TRV && TRV.holy.length) h += `<div class="tr w">ไปถึงที่ศักดิ์สิทธิ์ได้ ${ecoPc(r.pilgAccess)}% ของทั้งแผนที่ ความเป็นอยู่ ${socPts(r.trvWell)} แต้ม ทางที่เร็วขึ้นไปเมืองศักดิ์สิทธิ์ เช่น ทางรถไฟ เพิ่มค่านี้ได้</div>`;
  return h;
}
{
  const t = tradeCityHTML; tradeCityHTML = function (k) { const h = t(k), add = trvCityHTML(k), at = h.indexOf('<!--prod-->'); return at >= 0 ? h.slice(0, at) + add + h.slice(at) : h + add; };
  $('tradebody').addEventListener('change', e => {
    const el = e.target; if (!el || !el.dataset || el.dataset.tv !== 'holy' || !editable || !tsel) return;
    const v = +el.value; if (HOLY[v]) ECO.holy[tsel] = v; else delete ECO.holy[tsel];
    ecoChanged(false); renderTradeCard();
  });
  const tl = tradeLinkHTML; tradeLinkHTML = function (L) {
    let h = tl(L); if (!L || !(L.pax >= 0.5)) return h;
    return h + `<div class="tr">ผู้เดินทางบนเส้นนี้ <b>${socN(L.pax)}</b> คนต่อปี <span class="w">${trvList(L.paxBy)}${L.rail ? ` · มีทางรถไฟ ${L.rail} ช่อง` : ''}</span></div>`;
  };
}
function trvGdpHTML() {
  if (!TRV || !(TRV.tot >= 0.5)) return '';
  const rows = ecoIncome(ecoGdp()), coin = esc(ECO.central.name), sumO = o => Object.values(o).reduce((a, b) => a + b, 0);
  const list = rows.filter(r => r.trv).sort((a, b) => sumO(b.trv.inn) - sumO(a.trv.inn)).slice(0, 30);
  const holy = TRV.holy.map(([k, x]) => [rows[k], x]).filter(x => x[0]).sort((a, b) => b[1].h - a[1].h).slice(0, 12);
  const open = GDPV.gtrv ? ' open' : '';
  return `<details class="efold" data-fold="gtrv"${open}><summary>การเดินทางของผู้คน <small>${socN(TRV.tot)} คนต่อปี</small></summary>`
    + `<div class="tr">${Object.keys(TRVK).map(k => `${TRVK[k][0]} <b>${socN(TRV.by[k])}</b>`).join(' · ')} คนต่อปี${TRV.onRail >= 0.5 ? ` <span class="w">ราว ${socN(TRV.onRail)} คนเดินทางด้วยรถไฟเป็นส่วนใหญ่ของทาง</span>` : ''}</div>`
    + `<div class="etable g5"><div class="eth"><span>เมือง</span><span>มาเยือน</span><span>แสวงบุญ</span><span>ธุรกิจ</span><span>ใช้เงินในเมือง</span></div>`
    + list.map(r => `<div class="etr"><span>${r.s ? `<i class="sdot" style="background:${r.s.color}"></i>` : ''}${esc(r.c.name)}${r.holy && r.holy.h > 0 ? ' <em>ที่ศักดิ์สิทธิ์</em>' : ''}</span><span>${socN(sumO(r.trv.inn))}</span><span>${socN(r.trv.inn.pilg)}</span><span>${socN(r.trv.inn.biz)}</span><span>${socN(r.trv.spendIn)}</span></div>`).join('') + `</div>`
    + (holy.length ? `<div class="tr">ที่ศักดิ์สิทธิ์ <span class="w">${holy.map(([r, x]) => `${esc(r.c.name)} ${x.h.toFixed(1)}`).join(' · ')}</span></div>` : `<div class="tr w">แผนที่นี้ยังไม่มีที่ศักดิ์สิทธิ์ จึงยังไม่มีผู้แสวงบุญ ตั้งเมืองศักดิ์สิทธิ์ได้ในการ์ดของเมือง</div>`)
    + `<p class="note">ผู้เดินทางทุกคนไปทางที่ถูกที่สุดของเครือข่าย ทางรถไฟและถนนจึงดึงคนเหมือนดึงคาราวาน การเดินทางส่วนตัวส่วนใหญ่อยู่ในรัฐ ผู้แสวงบุญยอมไปไกล นักธุรกิจตามมูลค่าการค้าระหว่างสองเมือง เงินที่ผู้เดินทางส่วนตัว ผู้แสวงบุญ และนักธุรกิจใช้นับเป็นรายได้ของเมืองที่ไป ข้ามเขตรัฐนับในดุลของรัฐด้วย (ราว ${ecoNumF(TRV.sp.per)} ${ecoNumF(TRV.sp.pilg)} และ ${ecoNumF(TRV.sp.biz)} ${coin} ต่อคน) ตัวเลขทั้งหมดอยู่ในแท็บตัวเลข หมวดการเดินทางของผู้คน</p></details>`;
}
{ const g = ecoGdpHTML; ecoGdpHTML = function () { return g() + trvGdpHTML(); }; }
// on the map: a dotted line beside the trade, as wide as the people on it
function drawTravel(c, px) {
  if (!showR.pax || !ECON || !TRV || !(TRV.top > 0) || !ECON.bundles) return;
  c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
  for (const ch of ECON.bundles) {
    let p = 0; for (const li of ch.ls) p += ECON.links[li].pax || 0; if (!(p >= 1)) continue;
    const w = Math.max(0.5, (0.5 + 2.2 * Math.sqrt(p / TRV.top)) * px);
    linePath(c, ch.q); c.setLineDash([Math.max(0.6, w * 0.4), Math.max(1.4, w * 2.2)]); c.strokeStyle = 'rgba(34,18,48,.7)'; c.lineWidth = w + Math.max(0.4, 0.8 * px); c.stroke();
    linePath(c, ch.q); c.strokeStyle = 'rgba(214,176,255,.95)'; c.lineWidth = w; c.stroke();
  }
  c.setLineDash([]); c.restore();
}
{ const t = drawTrade; drawTrade = function (c, px, live) { t(c, px, live); drawTravel(c, px); }; }
function trvTest() {
  if (!ECON) return null; const rows = ecoIncome(ecoGdp()); if (!TRV) return null;
  return { by: { ...TRV.by }, tot: TRV.tot, ride: TRV.ride, onRail: TRV.onRail, holy: TRV.holy.map(([k, x]) => [ECON.cities[k].id, +x.h.toFixed(2)]),
    rows: rows.map(r => ({ id: r.c.id, name: r.c.name, inn: r.trv ? r.trv.inn : null, out: r.trv ? r.trv.out : null, spendIn: r.trv ? r.trv.spendIn : 0, well: r.trvWell || 0, access: r.pilgAccess || 0 })),
    links: ECON.links.map(L => ({ a: ECON.cities[L.ia].id, b: ECON.cities[L.ib].id, pax: L.pax || 0, by: L.paxBy || null, rail: L.rail || 0, road: L.road || 0, dry: L.dry })),
    books: SOC ? [...SOC.books.values()].map(b => ({ id: b.s.id, trvIn: b.trvIn || 0, trvOut: b.trvOut || 0, net: b.net })) : [] };
}
function railTest() {
  ensureRoutes(); const out = [];
  for (const r of visibleRoutes()) if (r.cls === 'rail') { const g = geoOf(r); out.push({ id: r.id, ok: !!(g && !g.fail), len: g && !g.fail ? g.len : 0, tunnels: g && !g.fail ? g.tunnels : 0, bridges: g && !g.fail ? g.bridges.length : 0, hexes: g && !g.fail ? g.hexes : [] }); }
  return { rails: out, edges: RAILE.size, step: RAIL_STEP };
}
