// ---------- the toolbar ----------
function setMode(m) {
  if (m !== 'view' && m !== 'trade' && m !== 'climate' && !editable) return;
  if (m === mode) return;
  if (mode === 'river' && riv) finishRiver();
  if (mode === 'city') selectCity(null);
  if (mode === 'label') selectLabel(null);
  if (mode === 'route') { selectRoute(null); rpend = null; rprev = null; }
  if (mode === 'info') selectInfo(null);
  if (mode === 'trade') { tsel = null; tlsel = null; tpend = null; tprev = null; }
  if (mode === 'climate') { clsel = null; clhex = -1; }
  mode = m; box.dataset.mode = m; hot = -1; hideTip(); cv.classList.remove('pick');
  for (const b of document.querySelectorAll('#modes button')) b.setAttribute('aria-pressed', String(b.dataset.mode === m));
  for (const p of document.querySelectorAll('#opts > [data-for]')) p.hidden = p.dataset.for !== m;
  renderInfoCard(); renderTradeCard(); renderClimCard(); renderFixes(); requestDraw();
}
for (const b of document.querySelectorAll('#modes button')) b.onclick = () => setMode(b.dataset.mode);
const PAL = [['น้ำและภูเขา', ['S', 'i', 'L', 'M']], ['ทุ่ง', ['g', 'h', 's', 'v', 'c', 'y', 'u', 'd', 'e', 'm', 'p', 'r', 't', 'n']], ['ป่า', ['f', 'o', 'k', 'j', 'a', 'w']]];
const esc = t => String(t).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
$('pal').innerHTML = PAL.map(([g, codes]) => `<div class="grp"><span>${esc(g)}</span>${codes.map(b => `<button type="button" class="sw" data-b="${b}" aria-pressed="false"><i style="background:${chipColor(b)}"></i>${esc(BIOME[b].name)}</button>`).join('')}</div>`).join('')
  + `<div class="grp"><button type="button" class="sw" data-b="restore" aria-pressed="false"><i class="rs"></i>คืนค่าเดิม</button></div>`;
function setBrush(b) {
  bcode = b;
  for (const s of document.querySelectorAll('#pal .sw')) s.setAttribute('aria-pressed', String(s.dataset.b === b));
  $('bname').textContent = b === 'restore' ? 'กำลังคืนค่าเดิม' : 'กำลังระบาย' + biomeInfo(b).name;
}
for (const s of document.querySelectorAll('#pal .sw')) s.onclick = () => setBrush(s.dataset.b);
function segPick(id, attr, val, fn) { for (const b of document.querySelectorAll(`#${id} button`)) { b.setAttribute('aria-pressed', String(b.dataset[attr] === String(val))); b.onclick = () => fn(b.dataset[attr]); } }
function setBsize(n) { bsize = +n; segPick('bsize', 'n', bsize, setBsize); }
function setRsize(n) { rsize = +n; segPick('rsize', 'n', rsize, setRsize); }
$('rkind').innerHTML = Object.entries(RK).map(([k, v]) => `<button type="button" data-k="${k}">${esc(v.name)}</button>`).join('');
function setRkind(k) { rkind = k; if (riv) riv.kind = k; segPick('rkind', 'k', k, setRkind); requestDraw(); }
function setRtool(t) {
  if (t === 'erase' && riv) finishRiver();
  rtool = t; segPick('rtool', 'rt', t, setRtool);
  $('rkind').hidden = t !== 'draw'; $('rfinish').hidden = t !== 'draw'; $('rcancel').hidden = t !== 'draw'; $('rsize').hidden = t !== 'erase';
  $('rhint').textContent = t === 'draw'
    ? 'คลิกทีละจุดตามแนวแม่น้ำ หรือกดค้างแล้วลากเป็นเส้นเดียว ดับเบิลคลิกหรือกด Enter เพื่อจบเส้น Esc ยกเลิก Backspace ลบจุดล่าสุด แม่น้ำควรเริ่มจากภูเขาและไหลไปถึงทะเลหรือทะเลสาบ'
    : 'ชี้ที่แม่น้ำแล้วส่วนที่จะหายขึ้นเป็นสีแดงก่อน ขนาดทีละสายจับเส้นที่ใกล้เคอร์เซอร์ที่สุดแล้วลบตามที่ลาก ลากผ่านจุดบรรจบแล้วสายอื่นยังอยู่ จนกว่าจะลากต่อไปตามสายนั้น ขนาดวงลบทุกสายในวง แม่น้ำเดิมหายทีละช่วงตามช่อง แม่น้ำที่วาดเพิ่มหายทั้งสาย ใช้ช่องคืนค่าเดิมในเครื่องมือระบายเพื่อเอาแม่น้ำเดิมกลับมา';
  requestDraw();
}
$('ckind').innerHTML = Object.entries(CK).map(([k, v]) => `<button type="button" data-k="${k}">${esc(v.name)}</button>`).join('');
$('cfKind').innerHTML = Object.entries(CK).map(([k, v]) => `<option value="${k}">${esc(v.name)}</option>`).join('');
function setCkind(k) { ckind = k; segPick('ckind', 'k', k, setCkind); }
$('rfinish').onclick = finishRiver; $('rcancel').onclick = cancelRiver;
$('undo').onclick = undo; $('redo').onclick = redo;
for (const id of ['cfName', 'cfNote']) { $(id).addEventListener('input', cityInput); $(id).addEventListener('change', commitCityEdit); }
$('cfKind').addEventListener('change', () => { cityInput(); commitCityEdit(); });
$('cfName').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); selectCity(null); } });
$('cfDel').onclick = deleteCity;
$('cfDone').onclick = () => selectCity(null);
$('lsizeSeg').innerHTML = Object.entries(LSIZE).map(([k, v]) => `<button type="button" data-s="${k}">${esc(v.name)}</button>`).join('');
$('lfSize').innerHTML = Object.entries(LSIZE).map(([k, v]) => `<option value="${k}">${esc(v.name)}</option>`).join('');
$('lfColor').innerHTML = LCOL.map(([c, n]) => `<button type="button" class="sw" data-c="${c}" aria-pressed="false"><i style="background:${c}"></i>${esc(n)}</button>`).join('');
function setLsize(k) { lsize = LSIZE[k] ? k : 'mid'; segPick('lsizeSeg', 's', lsize, setLsize); }
$('lfText').addEventListener('input', () => labelEdit({ text: $('lfText').value.slice(0, 60) }));
$('lfText').addEventListener('change', () => commitLabelEdit());
$('lfText').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); selectLabel(null); } });
$('lfSize').addEventListener('change', () => { labelEdit({ size: LSIZE[$('lfSize').value] ? $('lfSize').value : 'mid' }); commitLabelEdit(); });
$('lfAng').addEventListener('input', () => { const a = LANG(+$('lfAng').value); $('lfAngV').textContent = a + '°'; labelEdit({ ang: a }); });
$('lfAng').addEventListener('change', () => commitLabelEdit());
for (const b of document.querySelectorAll('#lfColor button')) b.onclick = () => { labelEdit({ color: b.dataset.c }); commitLabelEdit(); refreshLabelForm(); };
$('lfDel').onclick = deleteLabel;
$('lfDone').onclick = () => selectLabel(null);
setBrush('g'); setBsize(2); setRsize(1); setRkind('river'); setRtool('draw'); setCkind('city'); setLsize('mid'); setRoadCls('royal'); setIptool('pick');
$('tdCat').innerHTML = `<option value="">ทุกหมวด</option>` + ECATS.map(c => `<option value="${c}">${esc(ECAT[c].name)}</option>`).join('');
$('tdCat').onchange = () => { tcat = ECAT[$('tdCat').value] ? $('tdCat').value : ''; renderTradeCard(); requestDraw(); };
$('tdMode').innerHTML = Object.entries(LMODE).map(([k, n]) => `<button type="button" data-k="${k}">${esc(n)}</button>`).join('');
setTtool('pick'); setTmode('auto');
$('tdReset').onclick = resetNetwork;
$('rtLoose').onclick = () => connectLoose(false);
$('rfFlat').onclick = () => { if (rsel) changeRoute(rsel, { via: [] }); };
$('rfDel').onclick = () => { if (rsel) deleteRoute(rsel); };
$('rfDone').onclick = () => selectRoute(null);
// which roads and which trade the map shows (and the saved picture), kept for this viewer in this browser, and how the trade moves
const FXMODES = { off: 'ปิด', dots: 'ลูกไฟ', ships: 'เรือและเกวียน' };
const LAYERS = [['royal', RDC.royal], ['laterite', RDC.laterite], ['cart', RDC.cart], ['rail', { name: RDC.rail.name, px: 2, line: '#2a2420' }], ['water', TRD.water], ['caravan', TRD.caravan], ['pax', { name: 'ผู้เดินทาง', px: 2, line: '#c9a2f0', dash: true }]];
try { const sv = JSON.parse(localStorage.getItem('gresland-route-layers') || 'null'); if (sv) for (const k in showR) if (typeof sv[k] === 'boolean') showR[k] = sv[k]; } catch (err) { /* without storage the layers start all shown */ }
$('layers').innerHTML = LAYERS.map(([k, st]) => `<label><input type="checkbox" data-k="${k}"${showR[k] ? ' checked' : ''}><i style="border-top:${Math.max(2, Math.round(st.px))}px ${st.dash ? 'dashed' : 'solid'} ${st.line}"></i>${esc(st.name)}</label>`).join('')
  + `<div class="fxrow"><span>การค้าเคลื่อนไหว</span><div class="seg" id="fxSeg">${Object.entries(FXMODES).map(([k, n]) => `<button type="button" data-m="${k}">${esc(n)}</button>`).join('')}</div></div>`;
for (const b of document.querySelectorAll('#layers input')) b.onchange = () => { showR[b.dataset.k] = b.checked; try { localStorage.setItem('gresland-route-layers', JSON.stringify(showR)); } catch (err) { /* the choice lasts this visit */ } requestDraw(); fxKick(); };
// the two cards under the map's buttons: opening one closes the other
function openCard(id, btn) {
  for (const [c, b] of [['layers', 'layersBtn'], ['nsize', 'nsizeBtn']]) { const open = c === id && $(c).hidden; $(c).hidden = !open; $(b).setAttribute('aria-expanded', String(open)); if (open) cardUnder($(c), $(b)); }
}
// v0.19.2: the card opens right under its own button, now that the row of buttons can wrap onto two or three lines
function cardUnder(el, btn) {
  const host = el.offsetParent || el.parentNode, hr = host.getBoundingClientRect(), br = btn.getBoundingClientRect();
  el.style.top = Math.round(br.bottom - hr.top + 4) + 'px';
  el.style.left = Math.round(Math.max(4, Math.min(br.left - hr.left, hr.width - el.offsetWidth - 4))) + 'px';
}
$('layersBtn').onclick = () => openCard('layers');
$('nsizeBtn').onclick = () => openCard('nsize');
$('nsize').innerHTML = [['city', 'ชื่อเมือง'], ['place', 'ชื่อสถานที่']].map(([k, n]) =>
  `<label>${n}<input type="range" data-k="${k}" min="${NSIZE.min * 100}" max="${NSIZE.max * 100}" step="10" value="${Math.round(nameSize[k] * 100)}" aria-label="ขนาด${n}"><output data-k="${k}">${Math.round(nameSize[k] * 100)}%</output></label>`).join('')
  + '<div class="hint">ชื่อเมืองหลวงกับเมืองขึ้นเสมอ ชื่อเมืองเล็ก หมู่บ้าน และป้อม ขึ้นเมื่อชี้หรือแตะที่จุดนั้น</div><button type="button" id="nsizeReset">ขนาดเดิม</button>';
function setNameSize(k, v) {
  nameSize[k] = Math.max(NSIZE.min, Math.min(NSIZE.max, Math.round(v * 10) / 10));
  const r = document.querySelector(`#nsize input[data-k="${k}"]`), o = document.querySelector(`#nsize output[data-k="${k}"]`);
  if (r) r.value = Math.round(nameSize[k] * 100); if (o) o.textContent = Math.round(nameSize[k] * 100) + '%';
  try { localStorage.setItem('gresland-name-size', JSON.stringify(nameSize)); } catch (err) { /* the choice lasts this visit */ }
  requestDraw();
}
for (const r of document.querySelectorAll('#nsize input')) r.oninput = () => setNameSize(r.dataset.k, +r.value / 100);
$('nsizeReset').onclick = () => { setNameSize('city', 1); setNameSize('place', 1); };
let flashT = 0;
function flash(t) { const el = $('toast'); el.textContent = t; el.classList.add('on'); clearTimeout(flashT); flashT = setTimeout(() => el.classList.remove('on'), 2600); }

const CLRAMP = {"heat":["#814b28","#894d26","#904f23","#985120","#a0531c","#a75618","#ae5814","#b55a10","#bc5d0d","#c3600a","#c9630b","#cf670e","#d56b13","#da6f19","#df7320","#e37828","#e77d31","#eb8239","#ef8842","#f18e4c","#f49355","#f69a5f","#f8a068","#faa672","#fbac7c","#fcb386","#fdb990","#febf9a","#fec5a4","#fdccaf","#ffd2b8","#ffd8c2"],"cold":["#365f80","#366388","#356891","#356c99","#3571a1","#3476a9","#347ab0","#357fb8","#3684bf","#3788c6","#398dcd","#3c92d3","#4096d9","#449bde","#4aa0e3","#4fa5e8","#56aaec","#5daef0","#64b3f4","#6cb8f7","#74bdf9","#7cc1fb","#84c6fd","#90cafc","#99cffe","#a4d3fd","#acd8fe","#b6dcfe","#c0e1fd","#c9e5fe","#d2eaff","#dbeefe"],"wet":["#246666","#1e6b6b","#177070","#0d7575","#127a7a","#067f7f","#128383","#0a8888","#038c8d","#189090","#199595","#1b9a9a","#079f9f","#13a3a4","#1da8a8","#13adad","#03b2b2","#1fb6b6","#2fbaba","#3ebebe","#4ac2c2","#57c5c5","#62c9c9","#6ecdcc","#79d0cf","#84d3d3","#8ed7d6","#99dad9","#9ddfde","#a1e3e2","#a6e8e7","#aaeceb"],"elev":["#60527b","#655682","#6a598a","#6f5c91","#746099","#7963a0","#7f67a8","#846baf","#896eb6","#8e72bc","#9376c3","#977bc9","#9c7fcf","#a184d4","#a688d9","#ab8dde","#af92e3","#b498e7","#b89dea","#bda2ee","#c1a8f1","#c6aef4","#cab3f6","#cfb9f8","#d3bffb","#d8c5fc","#dccbfe","#e0d1fe","#e4d8fe","#e8defe","#ede5fe","#f1ebff"],"arid":["#725523","#a17003","#ca8f18","#e2b66e","#fedca8"]};
