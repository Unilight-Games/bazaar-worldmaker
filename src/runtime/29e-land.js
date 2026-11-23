// ---------- how many people the map holds, and the land its cities use up (v0.10.0) ----------
// The owner picks a level for the whole map. From it follows how many people each city has, and from that how much of the land
// around it has gone under the plough, how much forest is cleared or cut, and whether its mountains are mined. The yardsticks are
// read off our own world's history and are mine:
//   - Ploughland a person: 0.45 hectares while the world holds under half a billion, 0.3 up to five billion, 0.15 beyond. HYDE
//     puts the world's cropland near 293 million hectares in 1700 and 1.5 billion in 2000; over some 600 million and 6.1 billion
//     people (those two counts from memory) that is about 0.49 and 0.25 hectares a head. Tens of billions have not happened yet:
//     0.15 says farming has to go on getting denser for the land to hold them.
//   - A hex counts as farmed when 45 in 100 of it is ploughed, which is about what the most closely farmed country of the old
//     world reached, with the rest in villages, roads, fallow and waste.
//   - Open country goes first. Forest is cleared when the open land of the same distance has run out, as in Europe's great
//     clearances of the years 1000 to 1300.
//   - Wood for fuel and building: two thirds of a person's ploughland again, as forest cut over (from memory: about a cubic metre
//     of firewood a person a year, off coppice that gives three or four a hectare).
//   - Mountains are mined on a scale that shows on a map only by a city of 100,000 or more, one hex and then one more for each
//     further 250,000. Before the age of industry our world had a handful of such cities at any time.
// None of this changes the year's trade: it is the picture of what the people need, and a count of where the land falls short.
const LAND_TILL = 0.45, LAND_REACH = 16, LAND_MINE = 1e5, LAND_OPEN = new Set(['g', 's', 'v', 'h', 'e', 'm', 'c', 'y']), LAND_FARM = new Set(['p', 'r']);
const LAND_COL = { 1: 'rgba(222,200,104,.62)', 2: 'rgba(204,170,86,.7)', 3: 'rgba(168,172,96,.42)', 4: 'rgba(58,54,52,.62)' };
function ecoCrop(total) { return total < 5e8 ? 0.45 : total < 5e9 ? 0.3 : 0.15; }
let LAND = null, landOn = (() => { try { return localStorage.getItem('mme-land') !== '0'; } catch (err) { return true; } })();
function landCompute() {
  const E = ECON; if (!E) { LAND = null; return; }
  if (LAND && LAND.ver === E.ver && LAND.unit === ECO.unit) return;                     // the year is worked out again whenever the land or the cities change
  const km = ENV.meta && +ENV.meta.kmPerHex || 34, haHex = 0.866 * km * km * 100, total = E.cities.reduce((a, c) => a + c.pop, 0) * ECO.unit, crop = ecoCrop(total), wood = crop * 2 / 3;
  const use = new Int8Array(N), rows = E.cities.map(() => ({ farm: 0, cleared: 0, logged: 0, mine: 0, need: 0, short: 0 })), tot = { farm: 0, cleared: 0, logged: 0, mine: 0, was: 0 };
  let short = 0;
  for (const k of E.cities.map((c, i) => i).sort((a, b) => E.cities[b].pop - E.cities[a].pop)) {   // the largest city takes its land first
    const c = E.cities[k], r = rows[k], P = c.pop * ECO.unit; r.need = P * crop / 100;             // square kilometres of ploughland
    if (c.h < 0) continue;
    let nF = Math.round(P * crop / (haHex * LAND_TILL)), nW = Math.round(P * wood / (haHex * 0.8)), nM = P >= LAND_MINE ? Math.min(12, 1 + Math.floor((P - LAND_MINE) / 2.5e5)) : 0;
    if (!nF && !nW && !nM) continue;
    let ring = [c.h]; const seen = new Set(ring);
    for (let d = 0; d <= LAND_REACH && (nF > 0 || nW > 0 || nM > 0) && ring.length; d++) {
      const trees = [];
      for (const u of ring) {
        if (use[u]) continue; const b = eff(u);
        if (LAND_FARM.has(b)) { if (nF > 0) { use[u] = 5; nF--; tot.was++; } }                  // fields the map already shows
        else if (LAND_OPEN.has(b)) { if (nF > 0) { use[u] = 1; nF--; r.farm++; } }
        else if (FOREST.has(b)) trees.push(u);
        else if (b === 'M' && nM > 0 && d > 0) { use[u] = 4; nM--; r.mine++; }
      }
      for (const u of trees) { if (nF > 0) { use[u] = 2; nF--; r.cleared++; } else if (nW > 0) { use[u] = 3; nW--; r.logged++; } }
      const nx = []; for (const u of ring) for (let j = 0; j < 6; j++) { const v = NB[u * 6 + j]; if (v >= 0 && !seen.has(v)) { seen.add(v); nx.push(v); } } ring = nx;
    }
    r.short = nF; short += nF; tot.farm += r.farm; tot.cleared += r.cleared; tot.logged += r.logged; tot.mine += r.mine;
  }
  let landN = 0; for (let i = 0; i < N; i++) { const b = eff(i); if (b !== 'S' && b !== 'L') landN++; }
  LAND = { ver: E.ver, unit: ECO.unit, use, rows, tot, total, crop, haHex, short, landN, km2: landN * haHex / 100 };
}
function landDraw() {
  tierSync();
  if (!landOn || !ECON) return; landCompute(); const L = LAND; if (!L || !(L.tot.farm + L.tot.cleared + L.tot.logged + L.tot.mine)) return;
  ctx.setTransform(dpr * view.s, 0, 0, dpr * view.s, dpr * view.x, dpr * view.y); ctx.globalAlpha = 1; ctx.setLineDash([]);
  for (const t of [3, 1, 2, 4]) { ctx.beginPath(); let any = false; for (let i = 0; i < N; i++) if (L.use[i] === t) { hexPath(ctx, i, 1); any = true; } if (any) { ctx.fillStyle = LAND_COL[t]; ctx.fill(); } }
  if (R * view.s < 5) return;                         // the furrows and the pits only where a hex is large enough to carry them
  ctx.lineWidth = Math.max(0.5, 0.9 / view.s); ctx.lineCap = 'butt';
  ctx.beginPath(); for (let i = 0; i < N; i++) { const t = L.use[i]; if (t !== 1 && t !== 2) continue; for (const dy of [-0.42, 0, 0.42]) { ctx.moveTo(CX[i] - R * 0.6, CY[i] + R * dy); ctx.lineTo(CX[i] + R * 0.6, CY[i] + R * dy); } } ctx.strokeStyle = 'rgba(120,96,40,.55)'; ctx.stroke();
  ctx.beginPath(); for (let i = 0; i < N; i++) { if (L.use[i] !== 4) continue; ctx.moveTo(CX[i] - R * 0.4, CY[i] - R * 0.4); ctx.lineTo(CX[i] + R * 0.4, CY[i] + R * 0.4); ctx.moveTo(CX[i] + R * 0.4, CY[i] - R * 0.4); ctx.lineTo(CX[i] - R * 0.4, CY[i] + R * 0.4); } ctx.strokeStyle = 'rgba(230,220,200,.75)'; ctx.stroke();
}
{ const under = drawUnderNames; drawUnderNames = function () { landDraw(); if (under) under(); }; }   // under the borders, which are under the names
{ const b = $('landBtn'); if (b) { b.setAttribute('aria-pressed', landOn ? 'true' : 'false'); b.onclick = () => { landOn = !landOn; b.setAttribute('aria-pressed', landOn ? 'true' : 'false'); try { localStorage.setItem('mme-land', landOn ? '1' : '0'); } catch (err) { /* this view keeps nothing */ } requestDraw(); }; } }

// the level, set on the map itself (the owner asked for it there): a small list beside the chips, kept in step with the document.
// Three levels and a number of one's own (v0.11.1); the number is written in the box beside the list, as a person writes it.
const tierSel = $('tierSel'), tierNum = $('tierNum');
function ecoPeople(s) {                               // 250,000,000 · 250 ล้าน · 2.5 พันล้าน · 3 แสน · 2.5e8
  s = String(s == null ? '' : s).replace(/[,\s_]/g, '').replace(/คน$/, '').toLowerCase();
  const m = /^(\d+(?:\.\d+)?(?:e\d{1,2})?)(ล้านล้าน|หมื่นล้าน|พันล้าน|ร้อยล้าน|สิบล้าน|ล้าน|แสน|หมื่น|พัน|ร้อย|k|m|b)?$/.exec(s); if (!m) return NaN;
  const u = { 'ล้านล้าน': 1e12, 'หมื่นล้าน': 1e10, 'พันล้าน': 1e9, 'ร้อยล้าน': 1e8, 'สิบล้าน': 1e7, 'ล้าน': 1e6, 'แสน': 1e5, 'หมื่น': 1e4, 'พัน': 1e3, 'ร้อย': 100, k: 1e3, m: 1e6, b: 1e9 };
  return Math.round(+m[1] * (m[2] ? u[m[2]] : 1));
}
const tierNow = () => ECO.tier === 'own' ? ECO.total : ECON ? ECON.cities.reduce((a, c) => a + c.pop, 0) * ECO.unit : 0;   // with no level named, what the heads come to
function tierSet(k, total) {
  if (tierOk(k)) { ECO.tier = k; ECO.total = ETIER[k][1]; }
  else { ECO.tier = 'own'; ECO.total = clamp(Math.round(total > 0 ? total : tierNow() || 3e6), 100, 1e12); }
  ecoChanged(true); ecoRender();
}
const tierOpts = sel => Object.entries(ETIER).map(([k, z]) => `<option value="${k}"${sel === k ? ' selected' : ''}>${z[0]} · ${z[2]}</option>`).join('') + `<option value="own"${tierOk(sel) ? '' : ' selected'}>กำหนดเอง</option>`;
function tierSync() {
  if (!tierSel) return; const own = !tierOk(ECO.tier), n = Math.round(tierNow()), sig = ECO.tier + '|' + (editable ? 1 : 0) + '|' + (own ? n : 0);
  if (tierSel.dataset.sig === sig) return; tierSel.dataset.sig = sig;
  tierSel.innerHTML = tierOpts(ECO.tier); tierSel.value = own ? 'own' : ECO.tier; tierSel.disabled = !editable;
  tierSel.parentNode.classList.toggle('own', own);
  if (tierNum) { tierNum.hidden = !own; tierNum.disabled = !editable; tierNum.classList.remove('bad'); if (document.activeElement !== tierNum) tierNum.value = n > 0 ? n.toLocaleString('en-US') : ''; }
}
function tierTyped(el) {                              // a number written by hand; one that cannot be read is refused and the old one comes back
  const v = ecoPeople(el.value); if (!(v >= 100) || !(v <= 1e12)) { el.classList.add('bad'); el.title = 'อ่านจำนวนนี้ไม่ออก เขียนได้ตั้งแต่ 100 ถึง 1 ล้านล้านคน เช่น 250,000,000 หรือ 250 ล้าน'; return false; }
  el.classList.remove('bad'); tierSet('own', v); return true;
}
if (tierSel) tierSel.addEventListener('change', () => {
  if (!editable) { tierSel.dataset.sig = ''; tierSync(); return; }
  tierSet(tierSel.value); if (tierSel.value === 'own' && tierNum) { tierSel.dataset.sig = ''; tierSync(); tierNum.focus(); tierNum.select(); }
});
if (tierNum) {
  tierNum.addEventListener('change', () => { if (!editable) return; if (tierTyped(tierNum)) { tierSel.dataset.sig = ''; tierSync(); } });
  tierNum.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); tierNum.blur(); } else if (e.key === 'Escape') { tierNum.value = ''; tierSel.dataset.sig = ''; tierNum.blur(); tierSync(); } });
  tierNum.addEventListener('blur', () => { if (tierNum.classList.contains('bad')) { tierSel.dataset.sig = ''; tierSync(); } });
  tierNum.addEventListener('focus', () => tierNum.select());
}
// the head of the GDP tab: the level, what follows from it, and what the land says
function landHeadHTML() {
  landCompute(); const L = LAND, own = ECO.tier === 'own';
  const tn = Math.round(tierNow());
  let h = `<div class="erow"><label>ประชากรรวมในแผนที่ <select data-f="tier"${editable ? '' : ' disabled'}>${tierOpts(ECO.tier)}</select></label>${tierOk(ECO.tier) ? '' : `<label>จำนวน <input type="text" inputmode="numeric" data-f="total" value="${tn > 0 ? tn.toLocaleString('en-US') : ''}" style="width:10em" title="เขียนได้เช่น 250,000,000 หรือ 250 ล้าน หรือ 2.5 พันล้าน"${editable ? '' : ' disabled'}> คน</label>`}</div>`;
  if (!tierOk(ECO.tier)) h += `<p class="note">${own ? 'จำนวนนี้คุณเขียนเอง' : 'จำนวนนี้นับจากจำนวนคนต่อหน่วยที่ตั้งไว้'} เขียนใหม่ได้เป็นตัวเลขเต็มหรือย่อ เช่น 250,000,000 หรือ 250 ล้าน หรือ 2.5 พันล้าน</p>`;
  if (!L) return h;
  const dens = L.km2 > 0 ? L.total / L.km2 : 0, used = L.tot.farm + L.tot.cleared + L.tot.was, sw = t => `<i class="lsw" style="background:${LAND_COL[t]}"></i>`;
  h += `<p class="note">ทั้งแผนที่มี <b>${ecoNumF(L.total)}</b> คน หนาแน่น ${dens >= 10 ? Math.round(dens).toLocaleString('en-US') : dens.toFixed(2)} คนต่อตารางกิโลเมตรของแผ่นดิน หนึ่งหน่วยประชากรคือ ${ecoNumF(ECO.unit)} คน คนหนึ่งคนใช้ไร่นา ${L.crop} เฮกตาร์ หนึ่งช่องเลี้ยงคนได้ราว ${ecoNumF(L.haHex * LAND_TILL / L.crop)} คนเมื่อไถเต็มที่</p>`;
  h += `<div class="tr">${sw(1)}ไร่บนที่โล่ง <b>${L.tot.farm}</b> ช่อง ${sw(2)}ไร่บนป่าที่ถาง <b>${L.tot.cleared}</b> ช่อง ${sw(3)}ป่าที่ตัดไม้ <b>${L.tot.logged}</b> ช่อง ${sw(4)}เหมืองในภูเขา <b>${L.tot.mine}</b> ช่อง</div>`;
  h += `<div class="tr w">ไร่นากินแผ่นดินร้อยละ ${(100 * used / Math.max(1, L.landN)).toFixed(1)} ${L.short ? `<em>ที่ดินรอบเมืองไม่พอ ขาดไร่อีก ${L.short} ช่อง เมืองเหล่านั้นต้องพึ่งอาหารจากที่อื่น</em>` : used ? 'ที่ดินรอบเมืองพอเลี้ยงคนทุกเมือง' : 'ประชากรระดับนี้ยังใช้ที่ดินไม่ถึงครึ่งช่องต่อเมือง แผนที่จึงยังไม่เปลี่ยน'}</div>`;
  const rows = L.rows.map((r, k) => ({ r, c: ECON.cities[k] })).filter(x => x.r.farm + x.r.cleared + x.r.logged + x.r.mine + x.r.short > 0).sort((a, b) => (b.r.farm + b.r.cleared) - (a.r.farm + a.r.cleared));
  if (rows.length) h += `<details class="efold" data-fold="gld"${GDPV.gld === 1 ? ' open' : ''}><summary>ที่ดินที่เมืองใช้ <small>${rows.length} แถว</small></summary><div class="etable g5"><div class="eth"><span>เมือง</span><span>ไร่</span><span>ถางป่า</span><span>ตัดไม้</span><span>เหมือง</span></div>` + rows.slice(0, 200).map(x => `<div class="etr"><span>${esc(x.c.name)}${x.r.short ? ` <em>ขาด ${x.r.short}</em>` : ''}</span><span>${x.r.farm}</span><span>${x.r.cleared}</span><span>${x.r.logged}</span><span>${x.r.mine}</span></div>`).join('') + `</div></details>`;
  return h;
}
const __gdpLand = ecoGdpHTML;
ecoGdpHTML = function () { return landHeadHTML() + __gdpLand(); };
$('ecobody').addEventListener('change', e => {
  const el = e.target, f = el.dataset.f; if (!editable || !f) return;
  if (f === 'tier') { tierSet(el.value); if (el.value === 'own') { const t = $('ecobody').querySelector('input[data-f="total"]'); if (t) { t.focus(); t.select(); } } return; }
  else if (f === 'total') { if (ecoPeople(el.value) >= 100 && document.activeElement === el) el.blur(); tierTyped(el); return; }
  else if (f === 'unit') { ECO.tier = ''; ECO.total = 0; ECO.cpp = clamp(ECO.central.per / ECO.unit, 1e-6, 1e9); }   // a head set by hand: the level lets go
  else if (f === 'cenper') { ECO.cpp = clamp(ECO.central.per / ECO.unit, 1e-6, 1e9); }
  else return;
  ecoChanged(true); ecoRender();
});
// The year is worked out again a moment after a change, and the GDP tab is drawn again when it is: a number half written in the
// box for the people of the map is carried across, with the place of the caret.
{ const er = ecoRender; ecoRender = function () {
  const at = document.activeElement, hold = at && at.dataset && at.dataset.f === 'total' && at.closest && at.closest('#ecobody') ? [at.value, at.selectionStart, at.selectionEnd, at.classList.contains('bad')] : null;
  er();
  if (!hold) return; const el = $('ecobody').querySelector('input[data-f="total"]'); if (!el) return;
  el.value = hold[0]; if (hold[3]) el.classList.add('bad'); el.focus(); try { el.setSelectionRange(hold[1], hold[2]); } catch (err) { /* a field that keeps no caret */ }
}; }
