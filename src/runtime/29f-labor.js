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
  const order = [...rows.keys()].filter(k => dem[k] >= 0.5).sort((a, b) => rows[b].inc / rows[b].people - rows[a].inc / rows[a].people);
  for (const j of order) {
    const cj = rows[j].c, near = [...rows.keys()].filter(k => k !== j && sup[k] >= 0.5 && may(k, j)).sort((a, b) => Math.hypot(rows[a].c.x - cj.x, rows[a].c.y - cj.y) - Math.hypot(rows[b].c.x - cj.x, rows[b].c.y - cj.y));
    for (const k of near) { if (dem[j] < 0.5) break; const q = Math.min(sup[k], dem[j]); if (q < 0.5) continue; sup[k] -= q; dem[j] -= q; out[k] += q; got[j] += q; held[j] += q; flows.push({ a: k, b: j, n: Math.round(q) }); }
  }
  const tot = { held: 0, moved: 0, people: 0 }, price = TU('slavePrice') * mean;
  rows.forEach((r, k) => {
    const h = Math.round(held[k]), o = Math.round(out[k]), g = Math.round(got[k]); if (!h && !o) return;
    r.slave = { held: h, out: o, bought: g, law: law[k] }; r.people = Math.max(1, r.people - o + g);
    if (h) { r.inc += h * mean * TU('slaveGain') * (law[k] === 'pat' ? 0.6 : 1); r.why = (r.why ? r.why + ' และ' : '') + 'ได้แรงงานจากทาส'; }
    tot.held += h; tot.moved += o;
  });
  for (const r of rows) tot.people += r.people;
  SLAVE = { flows: flows.filter(f => f.n > 0).sort((a, b) => b.n - a.n), tot, price, mean };
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
    if (S.flows.length) h += `<h4>เส้นทางที่ขายมากที่สุด</h4>` + S.flows.slice(0, 12).map(f => `<div class="tr w">${nm(f.a)} ไป ${nm(f.b)} ${ecoNumF(f.n)} คน</div>`).join('');
    h += `<p class="note">ทาสนับเป็นประชากรของเมืองที่ถือ จำนวนคนและรายได้ต่อหัวในตารางข้างบนรวมทาสแล้ว เมืองที่ถือทาสได้รายได้เพิ่มจากแรงงานของทาส เส้นทางดูได้ในโหมดการค้า กดปุ่มแสดงเส้นทางแรงงานทาสในการ์ดการค้า ตัวเลขของแบบจำลองแก้ได้ที่แท็บตัวเลข หมวดแรงงานทาส</p>`;
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
// the routes on the map, in the trade view, when asked for
function slaveDraw() {
  if (!slaveShow || mode !== 'trade' || !ECON) return;
  const key = [ECON.ver, ECO.unit, ECO.noSlave, ECO.states.map(z => z.sys + (z.slave || '') + JSON.stringify(z.rel)).join(), ECO.orgs.length, TU('slaveOut'), TU('slaveIn')].join('|');
  if (!slaveSeen || slaveSeen.key !== key) { ecoIncome(ecoGdp()); slaveSeen = { key, S: SLAVE }; }   // worked out once for a year, not on every frame
  const S = slaveSeen.S; if (!S || !S.flows.length) return;
  const px = 1 / view.s, top = S.flows[0].n;
  ctx.setTransform(dpr * view.s, 0, 0, dpr * view.s, dpr * view.x, dpr * view.y); ctx.globalAlpha = 0.9; ctx.lineCap = 'round'; ctx.strokeStyle = '#b3262d';
  for (const f of S.flows.slice(0, 400)) { const a = ECON.cities[f.a], b = ECON.cities[f.b], w = Math.max(1, 1 + 4 * Math.sqrt(f.n / top)) * px; ctx.setLineDash([4 * px, 4 * px]); ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); const an = Math.atan2(b.y - a.y, b.x - a.x), hx = b.x - Math.cos(an) * 7 * px, hy = b.y - Math.sin(an) * 7 * px; ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx - Math.cos(an - 0.5) * 7 * px, hy - Math.sin(an - 0.5) * 7 * px); ctx.moveTo(hx, hy); ctx.lineTo(hx - Math.cos(an + 0.5) * 7 * px, hy - Math.sin(an + 0.5) * 7 * px); ctx.stroke(); }
  ctx.setLineDash([]); ctx.globalAlpha = 1;
}
{ const under = drawUnderNames; drawUnderNames = function () { if (under) under(); slaveDraw(); }; }
const __rtLabor = renderTradeCard;
renderTradeCard = function () {
  __rtLabor();
  if (mode !== 'trade' || !ECON || ECO.noSlave) return;
  $('tradebody').insertAdjacentHTML('beforeend', `<div class="btns" style="margin-top:8px"><button type="button" class="btn${slaveShow ? ' on' : ''}" data-a="slaveshow" aria-pressed="${slaveShow}">${slaveShow ? 'ซ่อนเส้นทางแรงงานทาส' : 'แสดงเส้นทางแรงงานทาส'}</button></div>`);
};
$('tradebody').addEventListener('click', e => { const b = e.target.closest('[data-a="slaveshow"]'); if (!b) return; slaveShow = !slaveShow; renderTradeCard(); requestDraw(); });
