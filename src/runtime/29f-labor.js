// ---------- slaves: labour as a thing bought and sold (v0.11.0) ----------
// The owner asked for a slave trade that rises out of poverty and a poor life, under a law each state chooses: none at all,
// patronage (held on conditions and easily freed), or a free trade. Slaves count among the people of the city that holds them.
// It is worked out after the year's trade, from what each city earned a head. The shape is the owner's; every number is mine:
//   - A city gives up people as it is poor: nothing at four fifths of the map's income a head or better, the most (a number in
//     the model's table) where there is no income at all. Each need of the people that went unmet adds to it, and what an
//     organisation does for the people's life takes away from it.
//   - A city wants slaves as it is rich: a third of the most at the map's mean income, rising with income above it.
//   - A city first holds its own poor, where its law lets it. Then the richest cities buy from the nearest that still have
//     people to sell. Abolition neither sells, buys nor holds. Patronage holds four tenths of what a free city would, gets six
//     tenths of the work, and deals only inside its own state. Rivals do not deal. A city under no state, and a land without one,
//     deal with anyone whose law lets them buy.
//   - A city wants fewer as it grows (the owner's ruling): where people are many, free labour is cheap. The want is halved at
//     100,000 people and all but gone in the millions. (Domar's old argument runs the same way: bondage pays where land is
//     plenty and hands are few. From memory.)
//   - A slave bought away is counted in the buyer's city and no longer in the one that lost them.
// Our own world's range, from memory and not looked up: in societies that kept slaves they were a few in a hundred; in the few
// built on them (Roman Italy, the American South) a fifth to a third. These numbers give the first kind.
let SLAVE = null, slaveShow = false, slaveSeen = null;
const SLAVE_BY = { water: 'ทางเรือ', caravan: 'คาราวาน', mixed: 'เรือต่อคาราวาน', none: 'ไม่มีเส้นทาง' };
function slaveLaw(c) { const s = c.sto; return !s ? 'free' : s.sys === 'anar' ? 'free' : ESLAVE[s.slave] ? s.slave : 'abol'; }
function slaveApply(rows) {
  const E = ECON; SLAVE = null;
  for (const r of rows) r.slave = null;
  if (!E || ECO.noSlave || rows.length < 2) return rows;
  let ppl = 0, inc = 0; for (const r of rows) { ppl += r.people; inc += r.inc; } const mean = ppl > 0 ? inc / ppl : 0; if (!(mean > 0)) return rows;
  const n = rows.length, law = rows.map(r => slaveLaw(r.c)), sup = new Float64Array(n), dem = new Float64Array(n), held = new Float64Array(n), out = new Float64Array(n), got = new Float64Array(n), flows = [];
  rows.forEach((r, k) => {
    const y = r.inc / r.people, poor = clamp(clamp((0.8 * mean - y) / (0.8 * mean), 0, 1) + 0.08 * (r.short || 0) - orgWell(r.c), 0, 1), rich = clamp((y - mean) / mean, 0, 1.5);
    if (law[k] !== 'abol') { sup[k] = r.people * TU('slaveOut') * poor * (law[k] === 'pat' ? 0.5 : 1); dem[k] = r.people * TU('slaveIn') * (1 / 3 + rich) * (law[k] === 'pat' ? 0.4 : 1) / (1 + r.people / TU('slaveCheap')); }   // a crowded city has cheap free hands, and wants few slaves
  });
  for (let k = 0; k < n; k++) { const own = Math.min(sup[k], dem[k]); held[k] += own; sup[k] -= own; dem[k] -= own; }   // a city's own poor first
  const may = (a, b) => { const sa = rows[a].c.sto, sb = rows[b].c.sto, same = !!sa && sa === sb; if (law[a] === 'pat' || law[b] === 'pat') return same; return same || !ecoRival(sa, sb); };
  // The journey (v0.12.0, the owner's): people are marched and shipped along the lines of the trade network, as goods are. The
  // nearest seller is the one the network brings nearest. Carrying costs a share of the price that grows with the journey, so a
  // buyer gets fewer from far away, and a journey that would cost more than the slave is not made. Where no line joins two
  // cities, nothing passes between them.
  const NT = E.NT, NWAY = E.NWAY || null, haul = TU('slaveHaul'); let ts = 0, tn = 0;
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) { const t = NT[a][b]; if (isFinite(t) && t > 0) { ts += t; tn++; } }
  const tRef = tn ? ts / tn : 1, far = (k, j) => { const t = NT[k] ? NT[k][j] : Infinity; return isFinite(t) ? haul * t / tRef : Infinity; };
  const order = [...rows.keys()].filter(k => dem[k] >= 0.5).sort((a, b) => rows[b].inc / rows[b].people - rows[a].inc / rows[a].people);
  for (const j of order) {
    const near = [...rows.keys()].filter(k => k !== j && sup[k] >= 0.5 && may(k, j) && far(k, j) <= 1).sort((a, b) => NT[a][j] - NT[b][j]);
    for (const k of near) {
      if (dem[j] < 0.5) break; const h = far(k, j), q = Math.min(sup[k], dem[j] / (1 + h)); if (q < 0.5) continue;
      sup[k] -= q; dem[j] -= q * (1 + h); out[k] += q; got[j] += q; held[j] += q; flows.push({ a: k, b: j, n: Math.round(q), t: NT[k][j], h, way: NWAY ? NWAY[k][j] : [] });
    }
  }
  const tot = { held: 0, moved: 0, people: 0 }, price = TU('slavePrice') * mean;
  rows.forEach((r, k) => {
    const h = Math.round(held[k]), o = Math.round(out[k]), g = Math.round(got[k]); if (!h && !o) return;
    r.slave = { held: h, out: o, bought: g, law: law[k] }; r.people = Math.max(1, r.people - o + g);
    if (h) { r.inc += h * mean * TU('slaveGain') * (law[k] === 'pat' ? 0.6 : 1); r.why = (r.why ? r.why + ' และ' : '') + 'ได้แรงงานจากทาส'; }
    tot.held += h; tot.moved += o;
  });
  for (const r of rows) tot.people += r.people;
  const fl = flows.filter(f => f.n > 0).sort((a, b) => b.n - a.n), load = new Map(); tot.haul = 0;
  for (const f of fl) {                              // what each line of the network carries in people, both ways, and how each journey goes
    let wet = 0, dry = 0, at = f.a; f.mids = [];
    for (const [li, dir] of f.way) { const L = E.links[li]; let x = load.get(li); if (!x) load.set(li, x = [0, 0]); x[dir > 0 ? 0 : 1] += f.n; wet += L.wet; dry += L.dry; at = L.ia === at ? L.ib : L.ia; if (at !== f.b) f.mids.push(at); }
    f.by = !f.way.length ? 'none' : !dry ? 'water' : !wet ? 'caravan' : 'mixed'; tot.haul += f.n * price * f.h;
  }
  SLAVE = { flows: fl, load, tot, price, mean, tRef };
  return rows;
}
const __incLabor = ecoIncome;
ecoIncome = function (rows) { return slaveApply(__incLabor(rows)); };

function slaveHTML() {
  if (!ECON) return '';
  const rows = ecoIncome(ecoGdp()), S = SLAVE, sw = `<div class="erow"><label>การค้าทาสในโลกนี้ <select data-f="noslave"${editable ? '' : ' disabled'}><option value="0"${ECO.noSlave ? '' : ' selected'}>มี</option><option value="1"${ECO.noSlave ? ' selected' : ''}>ไม่มี</option></select></label></div>`;
  let h = sw;
  if (ECO.noSlave) h += `<p class="note">ปิดไว้ ไม่มีเมืองใดถือหรือซื้อขายทาส</p>`;
  else if (!S || !S.tot.held) h += `<p class="note">ยังไม่มีทาสในแผนที่นี้ ทาสเกิดเมื่อมีเมืองที่รายได้ต่อหัวต่ำกว่าสี่ในห้าของค่าเฉลี่ย และมีเมืองที่กฎหมายยอมให้ถือทาส รัฐตั้งต้นที่เลิกทาสสมบูรณ์ เปลี่ยนได้ในแท็บรัฐและเขตแดน เมืองที่ไม่ขึ้นกับรัฐใดค้าทาสเสรี</p>`;
  else {
    const list = rows.filter(r => r.slave).sort((a, b) => b.slave.held - a.slave.held || b.slave.out - a.slave.out), nm = k => esc(ECON.cities[k].name);
    h += `<div class="tr">ทาสทั้งแผนที่ <b>${ecoNumF(S.tot.held)}</b> คน คิดเป็นร้อยละ ${(100 * S.tot.held / Math.max(1, S.tot.people)).toFixed(1)} ของประชากร ถูกขายข้ามเมือง <b>${ecoNumF(S.tot.moved)}</b> คน ราคาคนละ ${ecoNumF(S.price)} ${esc(ECO.central.name)}</div>`;
    h += `<div class="etable g4"><div class="eth"><span>เมือง</span><span>ทาสในเมือง</span><span>ซื้อเข้า</span><span>ถูกขายออก</span></div>` + list.slice(0, 200).map(r => `<div class="etr"><span>${r.s ? `<i class="sdot" style="background:${r.s.color}"></i>` : ''}${esc(r.c.name)} <em>${r.slave.law === 'pat' ? 'อุปถัมภ์' : ''}</em></span><span>${ecoNumF(r.slave.held)}</span><span>${ecoNumF(r.slave.bought)}</span><span>${ecoNumF(r.slave.out)}</span></div>`).join('') + `</div>`;
    if (S.flows.length) h += `<h4>เส้นทางขนย้ายที่คนมากที่สุด</h4>` + S.flows.slice(0, 12).map(f => `<div class="tr w">${nm(f.a)} ไป ${nm(f.b)} <b>${ecoNumF(f.n)}</b> คน · ${SLAVE_BY[f.by]}${f.mids.length ? ' ผ่าน' + f.mids.slice(0, 3).map(nm).join(' ') + (f.mids.length > 3 ? ' และอีก ' + (f.mids.length - 3) + ' เมือง' : '') : ''} · ค่าขนย้ายร้อยละ ${Math.round(100 * f.h)} ของราคา</div>`).join('') + `<div class="tr w">ค่าขนย้ายรวมทั้งแผนที่ ${ecoNumF(S.tot.haul)} ${esc(ECO.central.name)}</div>`;
    h += `<p class="note">ทาสนับเป็นประชากรของเมืองที่ถือ จำนวนคนและรายได้ต่อหัวในตารางข้างบนรวมทาสแล้ว เมืองที่ถือทาสได้รายได้เพิ่มจากแรงงานของทาส ทาสเดินทางตามเส้นการค้าของแผนที่ ทั้งทางเรือและคาราวาน ผู้ซื้อหาจากเมืองที่เส้นทางพาไปถึงใกล้ที่สุดก่อน และเส้นทางที่ค่าขนย้ายเกินราคาทาสไม่มีใครเดิน เส้นทางดูได้ในโหมดการค้า กดปุ่มแสดงเส้นทางขนย้ายทาสในการ์ดการค้า ตัวเลขของแบบจำลองแก้ได้ที่แท็บตัวเลข หมวดแรงงานทาส</p>`;
  }
  return `<details class="efold" data-fold="gsl"${GDPV.gsl === 1 ? ' open' : ''}><summary>แรงงานทาส <small>${S ? ecoNumF(S.tot.held) + ' คน' : 'ไม่มี'}</small></summary>${h}</details>`;
}
const __gdpLabor = ecoGdpHTML;
ecoGdpHTML = function () { return __gdpLabor() + slaveHTML(); };
$('ecobody').addEventListener('change', e => {
  const el = e.target, f = el.dataset.f; if (!editable || !f) return;
  if (f === 'noslave') ECO.noSlave = el.value === '1' ? 1 : 0;
  else if (f === 'sslave') { const box0 = el.closest('[data-s]'), s = box0 && ECO.states.find(x => x.id === box0.dataset.s); if (!s || !ESLAVE[el.value]) return; s.slave = el.value; }
  else return;
  ecoChanged(false); ecoRender();
});
// a state's card in the trade view: what it bought and sold in people
const __tsLabor = tradeStateHTML;
tradeStateHTML = function (s) {
  let h = __tsLabor(s); ecoIncome(ecoGdp()); const S = SLAVE, law = s.sys === 'anar' ? 'free' : ESLAVE[s.slave] ? s.slave : 'abol';
  h += `<h4>แรงงานทาส</h4><div class="tr w">กฎหมาย: ${ESLAVE[law][0]}</div>`;
  if (!S || ECO.noSlave) return h;
  let inn = 0, out = 0, home = 0; for (const f of S.flows) { const a = ECON.cities[f.a].st === s.id, b = ECON.cities[f.b].st === s.id; if (a && b) home += f.n; else if (a) out += f.n; else if (b) inn += f.n; }
  return h + `<div class="tr">ซื้อเข้า <b>${ecoNumF(inn)}</b> คน ขายออก <b>${ecoNumF(out)}</b> คน ซื้อขายในรัฐ ${ecoNumF(home)} คน</div><div class="tr w">มูลค่าที่ซื้อ ${ecoNumF(inn * S.price)} ที่ขาย ${ecoNumF(out * S.price)} ${esc(ECO.central.name)}</div>`;
};
// the journeys on the map, in the trade view, when asked for: along the lines the people are carried on, as wide as the
// number that pass, with a mark for the way they go; a ring on a city that sells its people, a dot on one that buys
function slaveNow() {
  const key = [ECON.ver, ECO.unit, ECO.noSlave, ECO.states.map(z => z.sys + (z.slave || '') + JSON.stringify(z.rel)).join(), ECO.orgs.length, TU('slaveOut'), TU('slaveIn'), TU('slaveCheap'), TU('slaveHaul')].join('|');
  if (!slaveSeen || slaveSeen.key !== key) { const rows = ecoIncome(ecoGdp()); slaveSeen = { key, S: SLAVE, rows: rows.map(r => r.slave) }; }   // worked out once for a year, not on every frame
  return slaveSeen;
}
function slaveAlong(q, f) {                          // the point a share of the way along a line, and the way the line runs there
  let len = 0; for (let k = 1; k < q.length; k++) len += Math.hypot(q[k][0] - q[k - 1][0], q[k][1] - q[k - 1][1]);
  let go = len * f; for (let k = 1; k < q.length; k++) { const d = Math.hypot(q[k][0] - q[k - 1][0], q[k][1] - q[k - 1][1]); if (go <= d || k === q.length - 1) { const u = d > 0 ? Math.min(1, go / d) : 0; return [q[k - 1][0] + (q[k][0] - q[k - 1][0]) * u, q[k - 1][1] + (q[k][1] - q[k - 1][1]) * u, Math.atan2(q[k][1] - q[k - 1][1], q[k][0] - q[k - 1][0]), len]; } go -= d; }
  return [q[0][0], q[0][1], 0, len];
}
function slaveDraw() {
  if (!slaveShow || mode !== 'trade' || !ECON) return;
  const seen = slaveNow(), S = seen.S; if (!S || !S.flows.length) return;
  const px = 1 / view.s, E = ECON, pick = tsel ? E.cities.findIndex(c => c.id === tsel) : -1;
  let load = S.load, flows = S.flows;
  if (pick >= 0) { flows = S.flows.filter(f => f.a === pick || f.b === pick); load = new Map(); for (const f of flows) for (const [li, dir] of f.way) { let x = load.get(li); if (!x) load.set(li, x = [0, 0]); x[dir > 0 ? 0 : 1] += f.n; } }
  let top = 1; for (const x of load.values()) top = Math.max(top, x[0] + x[1]);
  ctx.setTransform(dpr * view.s, 0, 0, dpr * view.s, dpr * view.x, dpr * view.y); ctx.globalAlpha = 1; ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
  const wOf = v => Math.max(0.5 + 1.1 * Math.sqrt(v / top), (1.3 + 3.4 * Math.sqrt(v / top)) * px), marks = [];
  for (let pass = 0; pass < 2; pass++) for (const [li, x] of load) {
    const L = E.links[li], geo = L && L.geo; if (!geo || !geo.runs.length) continue; const w = wOf(x[0] + x[1]);
    ctx.setLineDash(pass ? [Math.max(2.2, 5 * px), Math.max(1.6, 3.6 * px)] : []); ctx.strokeStyle = pass ? '#d0343c' : 'rgba(22,8,10,.82)'; ctx.lineWidth = pass ? w : w + Math.max(0.7, 1.5 * px);
    for (const r of geo.runs) { linePath(ctx, r.q); ctx.stroke(); }
    if (pass) continue;
    let best = null, bl = -1; for (const r of geo.runs) { const l = slaveAlong(r.q, 0.5)[3]; if (l > bl) { bl = l; best = r; } }
    const A = E.cities[L.ia], q0 = geo.runs[0].q[0], qe = geo.runs[geo.runs.length - 1].q, q1 = qe[qe.length - 1], fwdRuns = Math.hypot(q0[0] - A.x, q0[1] - A.y) <= Math.hypot(q1[0] - A.x, q1[1] - A.y);   // do the runs start at the line's first city
    if (best && bl * view.s > 26) { if (x[0] > 0) marks.push([best.q, x[1] > 0 ? 0.38 : 0.5, fwdRuns ? 0 : Math.PI, w]); if (x[1] > 0) marks.push([best.q, x[0] > 0 ? 0.62 : 0.5, fwdRuns ? Math.PI : 0, w]); }
  }
  ctx.setLineDash([]); ctx.lineCap = 'round';
  for (const [q, f, turn, w] of marks) {             // a chevron pointing the way the people go
    const [x, y, an] = slaveAlong(q, f), a = an + turn, s = Math.max(w * 1.5, 5.5 * px), tx = x + Math.cos(a) * s * 0.5, ty = y + Math.sin(a) * s * 0.5;
    for (let pass = 0; pass < 2; pass++) { ctx.beginPath(); ctx.moveTo(tx - Math.cos(a - 0.6) * s, ty - Math.sin(a - 0.6) * s); ctx.lineTo(tx, ty); ctx.lineTo(tx - Math.cos(a + 0.6) * s, ty - Math.sin(a + 0.6) * s); ctx.strokeStyle = pass ? '#ffd9d2' : 'rgba(22,8,10,.9)'; ctx.lineWidth = pass ? Math.max(0.5, 1.5 * px) : Math.max(1, 3.2 * px); ctx.stroke(); }
  }
  const ends = new Map(); for (const f of flows) { ends.set(f.a, (ends.get(f.a) || 0) | 1); ends.set(f.b, (ends.get(f.b) || 0) | 2); }
  for (const [k, m] of ends) {
    const c = E.cities[k], r = Math.max(2.2, 5.5 * px);
    ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, 2 * Math.PI); ctx.lineWidth = Math.max(0.7, 2 * px); ctx.strokeStyle = 'rgba(22,8,10,.85)'; if (m & 2) { ctx.fillStyle = '#d0343c'; ctx.fill(); } ctx.stroke();
    ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, 2 * Math.PI); ctx.lineWidth = Math.max(0.4, 1.1 * px); ctx.strokeStyle = m & 2 ? '#ffd9d2' : '#d0343c'; ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
{ const under = drawUnderNames; drawUnderNames = function () { if (under) under(); slaveDraw(); }; }
const __rtLabor = renderTradeCard;
renderTradeCard = function () {
  __rtLabor();
  if (mode !== 'trade' || !ECON || ECO.noSlave) return;
  $('tradebody').insertAdjacentHTML('beforeend', `<div class="btns" style="margin-top:8px"><button type="button" class="btn${slaveShow ? ' on' : ''}" data-a="slaveshow" aria-pressed="${slaveShow}">${slaveShow ? 'ซ่อนเส้นทางขนย้ายทาส' : 'แสดงเส้นทางขนย้ายทาส'}</button></div>` + (slaveShow ? `<p class="hint">เส้นประสีแดงคือเส้นการค้าที่มีทาสถูกขนผ่าน หนาตามจำนวนคน หัวลูกศรชี้ทางที่ไป วงแหวนคือเมืองที่ขายคนออก จุดทึบคือเมืองที่ซื้อ เลือกเมืองเพื่อดูเฉพาะเส้นทางของเมืองนั้น</p>` : ''));
};
$('tradebody').addEventListener('click', e => { const b = e.target.closest('[data-a="slaveshow"]'); if (!b) return; slaveShow = !slaveShow; renderTradeCard(); requestDraw(); });
// a line's card and a city's card in the trade view: the people carried along the line, and the slaves of the city
const __tlLabor = tradeLinkHTML;
tradeLinkHTML = function (L) {
  let h = __tlLabor(L); if (!ECON || ECO.noSlave) return h;
  const S = slaveNow().S, li = ECON.links.indexOf(L), x = S && S.load.get(li); if (!x || !(x[0] + x[1])) return h;
  const row = `<div class="tr">ทาสถูกขนผ่านเส้นนี้ <b>${ecoNumF(x[0] + x[1])}</b> คน <span class="w">จาก${esc(ECON.cities[L.ia].name)} ${ecoNumF(x[0])} · จาก${esc(ECON.cities[L.ib].name)} ${ecoNumF(x[1])}</span></div>`;
  const at = h.indexOf('<div class="optrow">'); return at >= 0 ? h.slice(0, at) + row + h.slice(at) : h + row;
};
const __tcLabor = tradeCityHTML;
tradeCityHTML = function (k) {
  let h = __tcLabor(k); if (!ECON || ECO.noSlave) return h;
  const seen = slaveNow(), sl = seen.rows[k]; if (!sl) return h;
  return h + `<h4>แรงงานทาส</h4><div class="tr">ทาสในเมือง <b>${ecoNumF(sl.held)}</b> คน <span class="w">ซื้อเข้า ${ecoNumF(sl.bought)} · ถูกขายออก ${ecoNumF(sl.out)}${sl.law === 'pat' ? ' · ระบบอุปถัมภ์' : ''}</span></div>`;
};
