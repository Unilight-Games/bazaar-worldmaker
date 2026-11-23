// ---------- the trade card ----------
const PORTN = ['ไม่มีท่าเรือ ค้าขายด้วยคาราวานอย่างเดียว', 'ท่าเรือริมแม่น้ำหรือทะเลสาบ', 'ท่าเรือริมทะเล'];
const BYN = { water: 'ทางน้ำ', caravan: 'คาราวาน', mixed: 'ทางน้ำต่อคาราวาน' };
const chipT = cat => `<i style="background:${ECAT[cat].col}"></i>`;
function goodRows(list) {                            // [[id, loads]] as rows with the colour of their category
  return `<div class="tl">${list.map(([id, v]) => { const g = GBY.get(id); return `${chipT(catOf(id))}<span>${esc(goodName(id))}</span><span class="n">${fmtL(v)}</span>`; }).join('')}</div>`;
}
function partnerRows(fs, side) {                     // flows grouped by the other city, the biggest first
  const by = new Map();
  for (const f of fs) {
    const o = side === 'to' ? f.to : f.from; let r = by.get(o);
    if (!r) by.set(o, r = { o, amt: 0, goods: new Map(), by: new Set(), hops: 0 });
    r.amt += f.amt; r.by.add(f.by); r.hops = Math.max(r.hops, f.way.length); if (f.via) r.via = f.via; for (const g in f.goods) r.goods.set(g, (r.goods.get(g) || 0) + f.goods[g]);
  }
  const rows = [...by.values()].sort((a, b) => b.amt - a.amt), shown = rows.slice(0, 7);
  return shown.map(r => {
    const how = r.by.size === 1 ? BYN[[...r.by][0]] : 'หลายทาง';
    return `<div class="tr"><b>${side === 'to' ? 'ไป' : 'จาก'}${esc(ECON.cities[r.o].name)}</b> <span class="w">${how} · ${r.via ? 'ส่งต่อที่' + r.via.map(k => esc(ECON.cities[k].name)).join(' แล้ว') + ' · ' : ''}${r.hops > 1 ? 'ผ่าน ' + (r.hops - 1) + ' เมือง · ' : ''}${fmtL(r.amt)} หน่วย</span><br>${topGoods(r.goods, 4)}</div>`;
  }).join('') + (rows.length > shown.length ? `<div class="tr w">และอีก ${rows.length - shown.length} เมือง</div>` : '');
}
function tradeCityHTML(k) {
  const c = ECON.cities[k], z = c.zone !== '.' ? zoneInfo(c.zone) : null, cn = ECANON[c.id];
  const inCat = id => !tcat || catOf(id) === tcat;
  const prod = [...ECON.prod[k]].filter(([id, v]) => inCat(id) && v >= 0.05).sort((a, b) => b[1] - a[1]);
  const out = ECON.flows.filter(f => f.from === k && (!tcat || f.cat === tcat)), inn = ECON.flows.filter(f => f.to === k && (!tcat || f.cat === tcat));
  const short = Object.entries(c.short || {}).filter(([cat, v]) => (!tcat || cat === tcat) && v >= 0.05).sort((a, b) => b[1] * ECAT[b[0]].v - a[1] * ECAT[a[0]].v);
  const spare = [...ECON.left[k]].filter(([id, v]) => inCat(id) && v >= 0.1).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const lines = ECON.links.filter(L => !L.fail && (L.ia === k || L.ib === k));
  let h = `<h3>${esc(c.name)}</h3><div class="tr w">${esc((CK[c.kind] || CK.city).name)}${z ? ' · ' + esc(z.name) : ''} · ${PORTN[c.port]}</div>`;
  h += rankHTML(k, lines.length);
  if (cn) h += `<div class="tr">${esc(cn.why)}</div>`;
  if (c.zone === 'X') h += `<div class="tr w">${esc(ERULE.phantomstone.why)}</div>`;
  if (c.zone === 'S') h += `<div class="tr w">${esc(ERULE.adamant.why)} ${esc(ERULE.sephine.why)}</div>`;
  h += `<h3>ผลผลิต</h3>` + (prod.length ? goodRows(prod.slice(0, 12)) + (prod.length > 12 ? `<div class="tr w">และอีก ${prod.length - 12} อย่าง</div>` : '') : '<div class="tr w">ไม่มี</div>');
  h += priceHTML(k);
  h += `<h3>ส่งออก</h3>` + (out.length ? partnerRows(out, 'to') : '<div class="tr w">ไม่มี</div>');
  h += `<h3>นำเข้า</h3>` + (inn.length ? partnerRows(inn, 'from') : '<div class="tr w">ไม่มี</div>');
  if (short.length) h += `<h3>ยังขาด</h3><div class="tl">${short.map(([cat, v]) => `${chipT(cat)}<span>${esc(ECAT[cat].name)}</span><span class="n">${fmtL(v)}</span>`).join('')}</div>`;
  if (spare.length) h += `<h3>ขายไม่หมด</h3>` + goodRows(spare);
  return h;
}
function rankHTML(k, nl) {                          // the city as a centre: its rank, where its goods go, what it gathers, and the controls
  const E = ECON, c = E.cities[k], set = ED.hubs.has(c.id), ar = autoRank(c);
  const why = set ? 'ตั้งระดับไว้เอง' : EHUB[c.id] || EHUB2[c.id] || 'เพราะเป็น' + (CK[c.kind] || CK.city).name;
  let h = `<div class="tr"><b>${c.rank ? RANKN[c.rank] + ' ระดับ ' + c.rank : 'ไม่เป็นศูนย์กระจายสินค้า'}</b> <span class="w">${esc(why)}</span></div>`;
  if (c.home >= 0) { const p = E.cities[c.home]; h += `<div class="tr">ส่งของผ่าน${RANKN[p.rank]}${esc(p.name)} <span class="w">${c.chosen ? 'ศูนย์ที่เลือกไว้' : 'ศูนย์ที่ใกล้ที่สุดซึ่งระดับสูงกว่า'}</span></div>`; }
  else if (!c.mesh) h += '<div class="tr mine">ยังไม่มีศูนย์ที่ระดับสูงกว่าอยู่ในระยะ</div>';
  const kids = E.cities.filter(x => x.home === k);
  if (kids.length) h += `<div class="tr">รวมของจาก ${kids.length} แห่ง <span class="w">${kids.sort((a, b) => b.rank - a.rank || b.through - a.through).map(x => esc(x.name)).join(' · ')}</span></div>`;
  h += `<div class="tr w">เส้นการค้าที่มาถึงเมืองนี้ ${nl} เส้น · มูลค่าสินค้าที่ผ่านเมืองนี้ ${fmtL(c.through)}${editable && c.sug !== c.rank ? ' · มูลค่านี้เทียบกับเมืองที่คึกคักที่สุดเหมาะกับระดับ ' + c.sug : ''}</div>`;
  if (!editable) return h;
  h += `<div class="optrow"><span class="lbl">ระดับศูนย์</span><div class="seg" id="tdRank"><button type="button" data-r="a" aria-pressed="${!set}">อัตโนมัติ ${ar}</button>${[0, 1, 2, 3].map(r => `<button type="button" data-r="${r}" aria-pressed="${set && c.rank === r}">${r}</button>`).join('')}</div></div>`;
  h += '<div class="tr w">0 ไม่เป็นศูนย์ · 1 ศูนย์ย่อยรวมของจากหมู่บ้านและป้อม · 2 ศูนย์ภาครวมของจากศูนย์ย่อย · 3 ศูนย์หลัก มีเส้นสายใหญ่ถึงศูนย์หลักด้วยกัน</div>';
  if (!c.mesh) {                                    // the centre this place sends its goods to: the nearest above it, or one the user picks
    const pid = ED.tparent.get(c.id), opts = E.cities.map((x, j) => ({ x, j, d: Math.hypot(x.x - c.x, x.y - c.y) })).filter(o => o.j !== k && o.x.rank > c.rank).sort((a, b) => a.d - b.d);
    const shown = opts.slice(0, 12); if (pid && !shown.some(o => o.x.id === pid)) { const o = opts.find(o => o.x.id === pid); if (o) shown.push(o); }
    h += `<div class="optrow"><span class="lbl">ส่งของให้</span><select id="tdPar"><option value="">ศูนย์ที่ใกล้ที่สุดเอง</option>${shown.map(o => `<option value="${esc(o.x.id)}"${o.x.id === pid ? ' selected' : ''}>${esc(o.x.name)} · ${RANKN[o.x.rank]} ระดับ ${o.x.rank}</option>`).join('')}</select></div>`;
  }
  return h;
}
function priceHTML(k) {                             // what each category costs in the city, before and after trade
  const E = ECON, rows = [];
  for (const cat of ECATS) {
    if (tcat && cat !== tcat) continue;
    const bk = E.MK[k][cat]; if (!bk || (bk[0] <= 0.01 && bk[1] <= 0.01)) continue;
    const a = E.P0[k][cat], b = E.P1[k][cat];
    if (!tcat && Math.abs(a - 1) < 0.1 && Math.abs(b - 1) < 0.1) continue;
    rows.push([cat, a, b]);
  }
  rows.sort((x, y) => Math.abs(y[2] - 1) * ECAT[y[0]].v - Math.abs(x[2] - 1) * ECAT[x[0]].v);
  let h = '<h3>ราคาในเมือง</h3>';
  if (!rows.length) return h + `<div class="tr w">${tcat ? 'เมืองนี้ไม่ผลิตและไม่ใช้' + esc(ECAT[tcat].name) : 'ราคาทุกหมวดใกล้ราคากลาง'}</div>`;
  h += '<div class="tr w">ร้อยละของราคากลาง ก่อนค้าขายและหลังค้าขาย</div>';
  h += `<div class="tl">${rows.slice(0, 8).map(([cat, a, b]) => `${chipT(cat)}<span>${esc(ECAT[cat].name)} · ${priceWord(b)}</span><span class="n">${pctP(a)} → <b style="color:${priceCol(b)}">${pctP(b)}</b></span>`).join('')}</div>`;
  if (tcat) { const bk = E.MK[k][tcat]; h += `<div class="tr w">ผลิต ${fmtL(bk[0])} ต้องการ ${fmtL(bk[1])} ซื้อเข้า ${fmtL(bk[2])} ขายออก ${fmtL(bk[3])} หน่วย</div>`; }
  return h;
}
function tradeLinkHTML(L) {
  const A = ECON.cities[L.ia], B = ECON.cities[L.ib], v = linkVol(L);
  let h = `<h3>${linkName(L)}</h3><div class="tr"><b>${esc(A.name)} กับ${esc(B.name)}</b></div>`;
  h += `<div class="tr w">${L.tier === 'main' ? 'ระหว่างศูนย์ระดับ 2 ขึ้นไปสองแห่ง' : L.tier === 'trunk' ? 'ระหว่างศูนย์หลักสองแห่ง ของผ่านศูนย์ภาคระหว่างทางโดยไม่ต้องขึ้นฝั่ง' : L.tier === 'branch' ? 'จากเมืองเข้าศูนย์ที่มันส่งของให้' : L.tier === 'lore' ? esc((loreOf(L) || {}).why || 'เส้นประจำ') : editable ? 'เส้นที่วางเพิ่ม' : 'สองเมืองนี้ค้าขายกันเป็นประจำ'}${editable && L.own && L.auto ? ' · ดัดทางหรือเปลี่ยนแบบเส้นไว้' : ''}</div>`;
  h += L.fail ? `<div class="tr mine">หาทางแบบ${esc(LMODE[L.mode])}ระหว่างสองเมืองนี้ไม่ได้ ของจึงไม่วิ่งบนเส้นนี้</div>` : `<div class="tr">${howText(L)}</div>`;
  if (!L.fail) h += v >= 0.03 ? `<div class="tr">ขนส่ง ${fmtL(v)} หน่วย <span class="w">จาก${esc(A.name)} ${fmtL(L.fwd)} · จาก${esc(B.name)} ${fmtL(L.back)}</span></div>` + goodRows([...linkGoods(L)].sort((a, b) => b[1] - a[1]).filter(([, x]) => x >= 0.05).slice(0, 10)) : '<div class="tr w">ยังไม่มีของวิ่ง</div>';
  if (editable) {
    h += `<div class="optrow"><span class="lbl">แบบเส้น</span><div class="seg" id="tdLMode">${Object.entries(LMODE).map(([k, n]) => `<button type="button" data-k="${k}" aria-pressed="${k === L.mode}">${esc(n)}</button>`).join('')}</div></div>`;
    h += `<div class="btns"><button type="button" class="btn" id="tdLFlat"${L.via && L.via.length ? '' : ' disabled'}>ล้างจุดดัด</button><button type="button" class="btn warn" id="tdLDel">ลบเส้นนี้</button><button type="button" class="btn" id="tdLDone">เสร็จ</button></div>`;
    h += `<p class="hint">ลากเส้นเพื่อดัดทาง ลากจุดกลมเพื่อขยับ ดับเบิลคลิกจุดกลมเพื่อเอาออก ดัดลงแม่น้ำหรือทะเลแล้วเส้นจะลงเรือตรงนั้น</p>`;
  }
  return h;
}
function tradeAllHTML() {
  const E = ECON, fs = E.flows.filter(f => !tcat || f.cat === tcat);
  const tot = fs.reduce((a, f) => a + f.amt, 0), wet = fs.filter(f => f.by === 'water').reduce((a, f) => a + f.amt, 0), car = fs.filter(f => f.by === 'caravan').reduce((a, f) => a + f.amt, 0);
  const pct = v => tot ? Math.round(100 * v / tot) : 0, ok = E.links.filter(L => !L.fail);
  const cnt = t => ok.filter(L => L.tier === t).length, hubs = E.cities.filter(c => c.hub);
  let h = `<h3>เครือข่าย</h3><div class="tr">เส้นการค้า ${ok.length} เส้น เส้นสายใหญ่ ${cnt('trunk')} เส้นหลัก ${cnt('main')} เส้นสาขา ${cnt('branch')}${editable ? (cnt('lore') ? ` เส้นประจำ ${cnt('lore')}` : '') + ` เส้นที่วางเพิ่ม ${cnt('user')}` : cnt('lore') + cnt('user') ? ` เส้นประจำ ${cnt('lore') + cnt('user')}` : ''}</div>`;
  const shared = (E.bundles || []).filter(ch => ch.ls.length > 1).length;
  if (shared) h += `<div class="tr w">ช่วงที่หลายเส้นวิ่งร่วมกัน ${shared} ช่วง วาดเป็นเส้นเดียวที่หนาตามของรวม</div>`;
  h += `<div class="tr"><b>ศูนย์กระจายสินค้า ${hubs.length} แห่ง</b></div>`;
  const nk = E.cities.map(() => 0); for (const c of E.cities) if (c.home >= 0) nk[c.home]++;
  for (const l of [3, 2, 1]) {                      // each rank's centres, the busiest first, with how many places send their goods to each
    const at = E.cities.map((c, k) => ({ c, k })).filter(o => o.c.rank === l).sort((a, b) => b.c.through - a.c.through);
    if (at.length) h += `<div class="tr">ระดับ ${l} ${RANKN[l]} <span class="w">${at.map(o => esc(o.c.name) + (nk[o.k] ? ' รวมจาก ' + nk[o.k] + ' แห่ง' : '')).join(' · ')}</span></div>`;
  }
  const up = E.cities.filter(c => c.sug > c.rank).sort((a, b) => b.through - a.through).slice(0, 5);
  if (editable && up.length) h += `<div class="tr w">ของผ่านมากกว่าระดับที่ตั้งไว้ ${up.map(c => esc(c.name) + ' เหมาะกับระดับ ' + c.sug).join(' · ')}</div>`;
  const alone = E.cities.filter((c, k) => !ok.some(L => L.ia === k || L.ib === k));
  if (editable && alone.length) h += `<div class="tr mine">ยังไม่มีเส้นการค้ามาถึง ${alone.map(c => esc(c.name)).join(' · ')}</div>`;
  const bad = E.links.filter(L => L.fail);
  if (editable && bad.length) h += `<div class="tr mine">เส้นที่หาทางไม่ได้ ${bad.length} เส้น</div>`;
  h += `<h3>ภาพรวม${tcat ? ' · ' + esc(ECAT[tcat].name) : ''}</h3><div class="tr">${E.cities.length} เมือง ค้าขาย ${fs.length} คู่ รวม ${fmtL(tot)} หน่วย ทางน้ำล้วน ${pct(wet)}% คาราวานล้วน ${pct(car)}% ที่เหลือต่อกันสองทาง</div>`;
  if (tcat) {
    const pr = E.cities.map((c, k) => ({ c, k, bk: E.MK[k][tcat] })).filter(r => r.bk && (r.bk[0] > 0.01 || r.bk[1] > 0.01)).map(r => ({ ...r, p: E.P1[r.k][tcat] })).sort((a, b) => b.p - a.p);
    if (pr.length) {
      const row = list => list.map(r => `${esc(r.c.name)} <b style="color:${priceCol(r.p)}">${pctP(r.p)}</b>`).join(' · ');
      h += `<h3>ราคา${esc(ECAT[tcat].name)}</h3><div class="tr">แพงสุด <span class="w">${row(pr.slice(0, 4))}</span></div><div class="tr">ถูกสุด <span class="w">${row(pr.slice(-4).reverse())}</span></div>`;
      h += '<div class="tr w">วงสีรอบเมืองบอกราคาหมวดนี้ แดงคือแพงกว่าราคากลาง เขียวอมฟ้าคือถูกกว่า</div>';
    }
  } else h += '<div class="tr w">เลือกหมวดสินค้าเพื่อดูราคาของหมวดนั้นทุกเมืองบนแผนที่</div>';
  const busy = ok.slice().sort((a, b) => linkVol(b) - linkVol(a)).filter(L => linkVol(L) >= 0.05).slice(0, 6);
  if (busy.length) h += `<h3>เส้นที่คึกคักที่สุด</h3>` + busy.map(L => `<div class="tr"><b>${esc(E.cities[L.ia].name)} กับ${esc(E.cities[L.ib].name)}</b> <span class="w">${linkName(L)} · ${fmtL(linkVol(L))} หน่วย</span><br>${topGoods(linkGoods(L), 4)}</div>`).join('');
  const gs = new Map(); for (const f of fs) for (const g in f.goods) gs.set(g, (gs.get(g) || 0) + f.goods[g]);
  if (gs.size) h += `<h3>สินค้าที่ขนมากที่สุด</h3>` + goodRows([...gs].sort((a, b) => b[1] - a[1]).slice(0, 10));
  const lack = E.cities.map(c => ({ c, v: Object.entries(c.short || {}).filter(([cat]) => !tcat || cat === tcat).reduce((a, [cat, v]) => a + v * ECAT[cat].v, 0) })).filter(r => r.v >= 0.3).sort((a, b) => b.v - a.v).slice(0, 6);
  if (lack.length) h += `<h3>เมืองที่ขาดมากที่สุด</h3>` + lack.map(({ c }) => `<div class="tr"><b>${esc(c.name)}</b> <span class="w">${Object.entries(c.short).filter(([cat, v]) => (!tcat || cat === tcat) && v >= 0.05).sort((a, b) => b[1] * ECAT[b[0]].v - a[1] * ECAT[a[0]].v).slice(0, 4).map(([cat]) => esc(ECAT[cat].name)).join(' · ')}</span></div>`).join('');
  h += `<p class="note">ตัวเลขเป็นหน่วยเทียบกันเองในแผนที่นี้ ผลผลิตคิดจากภูมิประเทศรอบเมือง ราคาขึ้นลงตามของที่มีกับของที่ต้องการ ของวิ่งเมื่อส่วนต่างราคาคุ้มค่าขนตามเส้นการค้า</p>`;
  return h;
}
function renderTradeCard() {
  const card = $('tradecard'); card.hidden = mode !== 'trade';
  if (card.hidden) return;
  if (!ECON) { $('tradebody').innerHTML = '<div class="tr w">กำลังคิดการค้า</div>'; return; }
  if (tsel && !ECON.cities.some(c => c.id === tsel)) tsel = null;
  const L = tlsel && ECON.links.find(x => x.id === tlsel);
  if (tlsel && !L && !ED.tlinks.has(tlsel)) tlsel = null;          // a line just laid waits for the network to be worked out again
  const k = tsel ? ECON.cities.findIndex(c => c.id === tsel) : -1;
  $('tradebody').innerHTML = L ? tradeLinkHTML(L) : tlsel ? '<div class="tr w">กำลังหาทางของเส้นนี้</div>' : k >= 0 ? tradeCityHTML(k) : tradeAllHTML();
  if (!editable) return;
  if (L) {
    for (const b of document.querySelectorAll('#tdLMode button')) b.onclick = () => changeLink(L.id, { mode: b.dataset.k });
    $('tdLFlat').onclick = () => changeLink(L.id, { via: [] });
    $('tdLDel').onclick = () => deleteLink(L.id);
    $('tdLDone').onclick = () => selectLink(null);
  } else if (k >= 0) {
    const id = ECON.cities[k].id;
    for (const b of document.querySelectorAll('#tdRank button')) b.onclick = () => setHub(id, b.dataset.r === 'a' ? null : +b.dataset.r);
    const ps = $('tdPar'); if (ps) ps.onchange = () => setParent(id, ps.value || null);
  }
}
function selectTrade(id) { tsel = id || null; tlsel = null; renderTradeCard(); requestDraw(); }
function selectLink(id) { tlsel = id || null; tsel = null; renderTradeCard(); requestDraw(); }

