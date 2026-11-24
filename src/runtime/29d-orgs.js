// ---------- organisations, a state's balance of trade, and the order of the GDP list (v0.9.0) ----------
// An organisation is a guild, an association, a charity, a faith or anything else the owner names. It has houses in cities, and
// in each of them it does what its five numbers say: raises output, raises the worth of what is made, helps the people, takes
// something off the cost of carrying, and (when it trades past the states) lets its houses deal with each other directly.
// Every number is the owner's to set; what each kind starts with is mine.
function orgCities(cities) {
  const by = new Map(cities.map(c => [c.id, c]));
  for (const c of cities) c.org = null;
  for (const o of ECO.orgs) for (const id of o.seats) { const c = by.get(id); if (c) (c.org || (c.org = [])).push(o); }
}
function orgFor(o, cat) { return !o.cat || o.cat === cat; }
function orgProd(c, cat) { if (!c.org) return 1; let f = 1; for (const o of c.org) if (o.prod > 0 && orgFor(o, cat)) f += o.prod; return Math.min(4, f); }
function orgVal(c, cat) { if (!c.org) return 0; let f = 0; for (const o of c.org) if (o.val > 0 && orgFor(o, cat)) f += o.val; return Math.min(3, f); }
function orgWell(c) { if (!c.org) return 0; let f = 0; for (const o of c.org) f += o.well || 0; return Math.min(1, f); }
function orgHaulOf(c) { if (!c.org) return 0; let f = 0; for (const o of c.org) f += o.haul || 0; return Math.min(0.9, f); }
function orgHaul(a, b) { return 1 - (orgHaulOf(a) + orgHaulOf(b)) / 2; }   // a line pays less at each end that has such a house
function orgNet(a, b, cat) { if (!a.org || !b.org || a === b) return null; for (const o of a.org) if (o.net && orgFor(o, cat) && b.org.includes(o)) return o.id; return null; }

// What each organisation made in the year, in the central coin: the extra output its houses brought, the worth it added, the
// carrying it saved, the fee on what rode its own network, and the help it gave. Its worth is its founding capital plus so many
// years of that (a number in the model's table). The split between two organisations in one city follows their own numbers.
function orgValues(rows) {
  const E = ECON, out = new Map(ECO.orgs.map(o => [o.id, { made: 0, worth: 0, saved: 0, fee: 0, help: 0, year: 0, value: o.base || 0, seats: 0 }]));
  if (!E) return out;
  const per = ECO.central.per;
  E.cities.forEach((c, k) => {
    if (!c.org) return;
    for (const o of c.org) out.get(o.id).seats++;
    for (const cat of ECATS) {
      const mk = E.MK[k][cat]; if (!mk || !(mk[0] > 0)) continue; const val = mk[0] * (E.P1[k][cat] || 1) * ECAT[cat].v * per, f = orgProd(c, cat);
      for (const o of c.org) { if (!orgFor(o, cat)) continue; const v = out.get(o.id); if (o.prod > 0 && f > 1) v.made += val * o.prod / f; if (o.val > 0) v.worth += val * o.val; }
    }
    const r = rows && rows[k]; if (r) for (const o of c.org) if (o.well > 0) out.get(o.id).help += o.well * r.gdp;
  });
  for (const f of E.flows) {
    const a = E.cities[f.from], b = E.cities[f.to], cat = ECAT[f.cat]; if (!cat) continue;
    if (f.org && out.has(f.org)) out.get(f.org).fee += TU('orgFee') * f.amt * (E.P1[f.to][f.cat] || 1) * cat.v * per;
    const ha = orgHaulOf(a), hb = orgHaulOf(b), h = (ha + hb) / 2; if (!(h > 0)) continue;
    const saved = f.amt * f.cost * cat.bulk * EKAPPA * ECOX.km * h / (1 - h) * per;   // what the same way would have cost without the houses
    for (const [c, hc] of [[a, ha], [b, hb]]) if (hc > 0) for (const o of c.org) if (o.haul > 0) out.get(o.id).saved += saved * (hc / (ha + hb)) * (o.haul / c.org.reduce((s, x) => s + (x.haul || 0), 0));
  }
  for (const [id, v] of out) { v.year = v.made + v.worth + v.saved + v.fee + v.help; v.value += v.year * TU('orgYears'); }
  return out;
}
function orgTableHTML(rows) {
  const V = orgValues(rows);
  return `<div class="etable g4"><div class="eth"><span>องค์กร</span><span>เมือง</span><span>สร้างต่อปี</span><span>มูลค่าองค์กร</span></div>` + [...ECO.orgs].sort((a, b) => V.get(b.id).value - V.get(a.id).value).map(o => { const v = V.get(o.id); return `<div class="etr"><span><i class="odot" style="background:${o.color}"></i>${esc(o.name)} · ${OKIND[o.kind][0]}</span><span>${v.seats}</span><span>${ecoNumF(v.year)}</span><span>${ecoNumF(v.value)}</span></div>`; }).join('') + `</div>`;
}
let orgPick = null;                                  // the organisation whose houses a click on a city sets up or takes down
function ecoOrgsHTML() {
  let h = `<div class="btns" style="margin:0 0 8px"><button type="button" class="btn" data-a="onew"${ECO.orgs.length >= 60 ? ' disabled' : ''}>เพิ่มองค์กร</button></div>`;
  if (!ECO.orgs.length) return h + `<p class="note">ยังไม่มีองค์กร เพิ่มองค์กรแล้วกดปุ่มแปะบนแผนที่ จากนั้นคลิกเมืองที่องค์กรนั้นมีสาขา คลิกซ้ำเพื่อถอนสาขา เมืองหนึ่งมีหลายองค์กรได้</p>`;
  const E = ECON, rows = E ? ecoIncome(ecoGdp()) : null, V = orgValues(rows), names = new Map(visibleCities().map(c => [c.id, c.name || 'เมืองไม่มีชื่อ']));
  const pct = (o, f, label, max) => `<label>${label} <input type="number" data-f="${f}" min="0" max="${max}" step="1" value="${Math.round(o[f] * 1000) / 10}"> %</label>`;
  for (const o of ECO.orgs) {
    const v = V.get(o.id), seats = o.seats.filter(id => names.has(id)), free = [...names].filter(([id]) => !o.seats.includes(id)).sort((a, b) => a[1].localeCompare(b[1], 'th'));
    h += `<div class="eform${orgPick === o.id ? ' picked' : ''}" data-org="${o.id}"><div class="erow"><input type="color" data-f="ocolor" value="${o.color}" aria-label="สีขององค์กร"><input type="text" data-f="oname" maxlength="60" value="${esc(o.name)}" style="flex:1"></div>`
      + `<div class="erow"><label>ชนิด <select data-f="okind">${Object.entries(OKIND).map(([k, z]) => `<option value="${k}"${k === o.kind ? ' selected' : ''}>${z[0]}</option>`).join('')}</select></label><label>ทำงานกับ <select data-f="ocat"><option value="">สินค้าทุกประเภท</option>${ECATS.map(c => `<option value="${c}"${c === o.cat ? ' selected' : ''}>${esc(ECAT[c].name)}</option>`).join('')}</select></label></div>`
      + `<div class="erow">${pct(o, 'prod', 'เพิ่มผลผลิต', 200)}${pct(o, 'val', 'เพิ่มมูลค่าสินค้า', 200)}${pct(o, 'well', 'ยกความเป็นอยู่', 100)}${pct(o, 'haul', 'ลดค่าขนส่ง', 90)}</div>`
      + `<div class="erow"><label><input type="checkbox" data-f="onet"${o.net ? ' checked' : ''}> สาขาค้ากันเองข้ามกรอบของรัฐ</label><label>ทุนตั้งต้น <input type="number" data-f="obase" min="0" step="1000" value="${o.base || 0}" style="width:8em"> ${esc(ECO.central.name)}</label></div>`
      + `<div class="tr w">สาขา ${seats.length} เมือง${seats.length ? ' ' + seats.map(id => `<span class="ochip">${esc(names.get(id))}${editable ? `<button type="button" data-a="oseat" data-c="${esc(id)}" aria-label="ถอนสาขาที่ ${esc(names.get(id))}">×</button>` : ''}</span>`).join('') : ''}</div>`
      + `<div class="erow"><label>เพิ่มสาขา <select data-f="oadd"><option value="">เลือกเมือง</option>${free.map(([id, n]) => `<option value="${esc(id)}">${esc(n)}</option>`).join('')}</select></label><button type="button" class="btn${orgPick === o.id ? ' on' : ''}" data-a="opick">${orgPick === o.id ? 'กำลังแปะ คลิกเมืองบนแผนที่' : 'แปะบนแผนที่'}</button></div>`
      + `<div class="tr">สร้างมูลค่าปีละ <b>${ecoNumF(v.year)}</b> ${esc(ECO.central.name)} มูลค่าองค์กร <b>${ecoNumF(v.value)}</b></div>`
      + `<div class="tr w">ผลผลิตที่เพิ่ม ${ecoNumF(v.made)} · มูลค่าที่เพิ่ม ${ecoNumF(v.worth)} · ค่าขนที่ประหยัด ${ecoNumF(v.saved)} · ค่าธรรมเนียมเครือข่าย ${ecoNumF(v.fee)} · ความช่วยเหลือ ${ecoNumF(v.help)}</div>`
      + `<div class="btns"><button type="button" class="btn warn" data-a="odel">ลบองค์กรนี้</button></div></div>`;
  }
  return h + `<p class="note">เพิ่มผลผลิตคูณของที่เมืองทำได้ในประเภทที่องค์กรทำงานด้วย เพิ่มมูลค่าสินค้านับเข้า GDP ของเมืองโดยไม่เปลี่ยนปริมาณ ยกความเป็นอยู่เพิ่มรายได้ของคนในเมืองเป็นสัดส่วนของ GDP ลดค่าขนส่งลดค่าเดินทางของเส้นที่ปลายข้างนั้นมีสาขา ปลายละครึ่งของตัวเลข สาขาที่ค้ากันเองข้ามกรอบของรัฐไม่ต้องผ่านศูนย์ของศักดินา เมืองศูนย์กลางของสังคมนิยม คนกลางของคู่อริ หรือกำแพงภาษี โดยจ่ายค่าธรรมเนียมให้องค์กรร้อยละ ${ecoPc(TU('orgFee'))} มูลค่าองค์กรคือทุนตั้งต้นบวกมูลค่าที่สร้างต่อปี ${TU('orgYears')} ปี ตัวเลขสองตัวหลังแก้ได้ที่แท็บตัวเลข</p>`;
}
const __erOrg = ecoRender;
ecoRender = function () {
  if (ecoTab !== 'orgs' && orgPick) orgPick = null;
  __erOrg();
  box.classList.toggle('orgpick', mode === 'econ' && ecoTab === 'orgs' && !!orgPick);
  if ($('ecocard').hidden || ecoTab !== 'orgs') return;
  if (orgPick && !ECO.orgs.some(o => o.id === orgPick)) orgPick = null;
  $('ecoHead').textContent = 'องค์กร'; $('ecoHint').textContent = 'องค์กรมีสาขาในเมือง และทำงานในเมืองนั้นตามตัวเลขของตัวเอง ผลการค้าคิดใหม่ทุกครั้งที่แก้';
  if (editable) $('ecobody').innerHTML = ecoOrgsHTML();
};
$('ecobody').addEventListener('click', e => {
  const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a;
  if (a === 'gsortc') { const k = b.dataset.k; if (GDPV.k === k) GDPV.d = -GDPV.d; else { GDPV.k = k; GDPV.d = k === 'name' ? 1 : -1; } gdpKeep(); ecoRender(); return; }
  if (!editable || a[0] !== 'o') return;
  const o = b.closest('[data-org]') ? ECO.orgs.find(x => x.id === b.closest('[data-org]').dataset.org) : null;
  if (a === 'onew') { if (ECO.orgs.length >= 60) return; const z = OKIND.guild, id = 'o' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); ECO.orgs.push({ id, name: 'องค์กรที่ ' + (ECO.orgs.length + 1), kind: 'guild', color: SCOLS[(ECO.orgs.length * 3 + 3) % SCOLS.length], cat: '', ...z[1], base: 0, seats: [] }); orgPick = id; }
  else if (a === 'odel' && o) { ECO.orgs = ECO.orgs.filter(x => x !== o); if (orgPick === o.id) orgPick = null; }
  else if (a === 'opick' && o) { orgPick = orgPick === o.id ? null : o.id; ecoRender(); return; }
  else if (a === 'oseat' && o) { o.seats = o.seats.filter(id => id !== b.dataset.c); }
  else return;
  ecoChanged(false); ecoRender();
});
$('ecobody').addEventListener('change', e => {
  const el = e.target, f = el.dataset.f; if (!f) return;
  if (f === 'gsort') { GDPV.k = el.value; gdpKeep(); ecoRender(); return; }
  if (f === 'gdir') { GDPV.d = +el.value > 0 ? 1 : -1; gdpKeep(); ecoRender(); return; }
  const box0 = el.closest('[data-org]'); if (!box0 || !editable) return; const o = ECO.orgs.find(x => x.id === box0.dataset.org); if (!o) return; const num = +el.value;
  if (f === 'oname') o.name = el.value.trim().slice(0, 60) || o.name;
  else if (f === 'ocolor' && HEXC.test(el.value)) o.color = el.value;
  else if (f === 'okind' && OKIND[el.value]) { o.kind = el.value; Object.assign(o, OKIND[el.value][1]); }   // a kind brings the numbers it starts with
  else if (f === 'ocat') o.cat = ECAT[el.value] ? el.value : '';
  else if (f === 'prod' || f === 'val') o[f] = clamp((num || 0) / 100, 0, 2);
  else if (f === 'well') o.well = clamp((num || 0) / 100, 0, 1);
  else if (f === 'haul') o.haul = clamp((num || 0) / 100, 0, 0.9);
  else if (f === 'onet') o.net = el.checked ? 1 : 0;
  else if (f === 'obase') o.base = clamp(num || 0, 0, 1e12);
  else if (f === 'oadd' && el.value && !o.seats.includes(el.value) && o.seats.length < 400) o.seats.push(el.value);
  else return;
  ecoChanged(false);
  if (el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'color') ecoRender();
});
$('ecobody').addEventListener('toggle', e => { const d = e.target; if (d && d.dataset && d.dataset.fold) { GDPV[d.dataset.fold] = d.open ? 1 : 0; gdpKeep(); } }, true);
// a click on a city, with an organisation picked: a house there, or none any more
box.addEventListener('pointerdown', e => {
  if (mode !== 'econ' || ecoTab !== 'orgs' || !orgPick || !editable || e.button !== 0 || spaceDown || e.target !== cv) return;
  const [mx, my] = toMap(e.clientX, e.clientY), c = cityAt(mx, my), o = ECO.orgs.find(x => x.id === orgPick); if (!c || !o) return;
  e.stopPropagation(); e.preventDefault();
  if (o.seats.includes(c.id)) o.seats = o.seats.filter(id => id !== c.id); else if (o.seats.length < 400) o.seats.push(c.id);
  ecoChanged(false); ecoRender();
}, true);
// the houses on the map: a small diamond for each organisation beside its city, in the economy and the trade views
function orgDraw(px) {
  if (!ECO.orgs.length || (mode !== 'econ' && mode !== 'trade')) return;
  const at = new Map(); for (const o of ECO.orgs) for (const id of o.seats) (at.get(id) || at.set(id, []).get(id)).push(o);
  if (!at.size) return; const r = Math.max(3.2, 5 * px);
  ctx.setTransform(dpr * view.s, 0, 0, dpr * view.s, dpr * view.x, dpr * view.y); ctx.globalAlpha = 1; ctx.setLineDash([]);
  for (const c of visibleCities()) {
    const os = at.get(c.id); if (!os) continue;
    os.slice(0, 5).forEach((o, i) => {
      const x = c.x + (i - (Math.min(os.length, 5) - 1) / 2) * r * 2.3, y = c.y + r * 2.6;
      ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath();
      ctx.fillStyle = o.color; ctx.fill(); ctx.lineWidth = Math.max(0.8, 1.4 * px); ctx.strokeStyle = orgPick === o.id ? '#fff' : 'rgba(15,17,20,.85)'; ctx.stroke();
    });
  }
}

// ---- a state's balance of trade: a click inside its borders, in the trade view ----
let tstate = null;
function selectState(id) { tstate = id || null; tsel = null; tlsel = null; renderTradeCard(); requestDraw(); }
function tradeStateHTML(s) {
  const E = ECON, per = ECO.central.per, inS = E.cities.map(c => c.st === s.id), n = inS.filter(Boolean).length;
  const val = f => f.amt * ECAT[f.cat].v * (E.P1[f.to][f.cat] || 1) * per;
  let out = 0, inn = 0, home = 0, slvOut = 0, slvIn = 0; const byP = new Map(), byC = new Map();
  for (const f of E.flows) {
    if (tcat && f.cat !== tcat) continue; const a = inS[f.from], b = inS[f.to]; if (!a && !b) continue; const v = val(f);
    if (f.cat === 'labor' && !tcat) { if (a !== b) { if (a) slvOut += v; else slvIn += v; } continue; }   // people bought and sold stand on their own line
    if (a && b) { home += v; continue; }
    const other = E.cities[a ? f.to : f.from].st, P = byP.get(other) || byP.set(other, [0, 0]).get(other), C = byC.get(f.cat) || byC.set(f.cat, [0, 0]).get(f.cat);
    if (a) { out += v; P[0] += v; C[0] += v; } else { inn += v; P[1] += v; C[1] += v; }
  }
  const net = out - inn, coin = esc(ECO.central.name), loc = s.cur && s.rate ? ` (${ecoNumF(Math.abs(net) / s.rate)} ${esc(s.cur)})` : '';
  const sign = v => (v >= 0 ? '+' : '−') + ecoNumF(Math.abs(v));
  let h = `<h3><i class="sdot" style="background:${s.color}"></i>${esc(s.name)}</h3><div class="tr w">${ESYS[s.sys][0]} · ${n} เมือง${tcat ? ' · เฉพาะ' + esc(ECAT[tcat].name) : ''}</div>`
    + `<div class="tr">ส่งออก <b>${ecoNumF(out)}</b> นำเข้า <b>${ecoNumF(inn)}</b> ${coin}</div>`
    + `<div class="tr">${net >= 0 ? 'เกินดุล' : 'ขาดดุล'} <b>${ecoNumF(Math.abs(net))}</b> ${coin}${loc}</div><div class="tr w">ค้ากันเองในรัฐ ${ecoNumF(home)} ${coin}</div>`;
  if (!n) return h + `<div class="tr w">ยังไม่มีเมืองในเขตของรัฐนี้ จึงยังไม่มีการค้าให้นับ</div>`;
  const table = (title, m, name) => !m.size ? '' : `<h4>${title}</h4><div class="etable g4"><div class="eth"><span></span><span>ส่งออก</span><span>นำเข้า</span><span>ดุล</span></div>` + [...m].sort((x, y) => (y[1][0] + y[1][1]) - (x[1][0] + x[1][1])).map(([k, v]) => `<div class="etr"><span>${name(k)}</span><span>${ecoNumF(v[0])}</span><span>${ecoNumF(v[1])}</span><span class="${v[0] - v[1] >= 0 ? 'pos' : 'neg'}">${sign(v[0] - v[1])}</span></div>`).join('') + `</div>`;
  h += table('คู่ค้า', byP, k => { const o = ECOX.byKey.get(k); return o ? `<i class="sdot" style="background:${o.color}"></i>${esc(o.name)}` : 'เมืองที่ไม่ขึ้นกับรัฐใด'; });
  h += table('ตามประเภทสินค้า', byC, c => `${chipT(c)}${esc(ECAT[c].name)}`);
  if (slvOut + slvIn >= 1) h += `<div class="tr w">ซื้อขายทาสข้ามเขตรัฐ ขายออก ${ecoNumF(slvOut)} ซื้อเข้า ${ecoNumF(slvIn)} ${coin} ไม่นับในดุลข้างบน</div>`;
  if (!tcat) h += socStateCardHTML(s);
  return h + `<div class="tr w">มูลค่านับตามราคาในเมืองที่ซื้อ หลังการค้าของปี คลิกที่ว่างนอกเขตเพื่อกลับไปดูทั้งเครือข่าย</div>`;
}
const __stSel = selectTrade, __stLink = selectLink;
selectTrade = function (id) { tstate = null; __stSel(id); };
selectLink = function (id) { tstate = null; __stLink(id); };
const __rtOrg = renderTradeCard;
renderTradeCard = function () {
  __rtOrg();
  if (mode !== 'trade' || !ECON) return;
  const s = tstate && !tsel && !tlsel ? ECOX.byKey.get(tstate) : null; if (tstate && !s) tstate = null;
  if (s) $('tradebody').innerHTML = tradeStateHTML(s);
  else if (!tsel && !tlsel && ECO.states.length) $('tradebody').insertAdjacentHTML('beforeend', `<div class="tr w">คลิกในเขตของรัฐบนแผนที่เพื่อดูดุลการค้าของรัฐนั้น</div>`);
};
