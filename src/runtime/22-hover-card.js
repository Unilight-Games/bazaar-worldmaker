// ---------- the hover card ----------
// It used to follow the pointer, and so lay over the very ground being read. The owner asked for the notes that cover the map to
// be something he can drag and fold away (23 Nov 2026): the card now rests where it is put, keeps the last thing pointed at so the
// hand can reach it, folds down to its title, and remembers place and fold between visits.
const tipEl = $('tip');
tipEl.innerHTML = '<div class="tiphead" title="ลากเพื่อย้ายคำอธิบาย ดับเบิลคลิกเพื่อคืนที่เดิม"><span class="tipgrip" aria-hidden="true">⠿</span><span class="tiptitle" id="tipTitle">คำอธิบาย</span><button type="button" class="tipfold" id="tipFold" aria-expanded="true" aria-controls="tipBody" title="พับหรือกางคำอธิบาย">▾</button></div><div class="tipbody" id="tipBody"></div>';
const tipBody = $('tipBody');
let TIP = { x: null, y: null, fold: false };
try { const o = JSON.parse(localStorage.getItem('mme-tip') || 'null'); if (o && typeof o === 'object') TIP = { x: Number.isFinite(o.x) ? o.x : null, y: Number.isFinite(o.y) ? o.y : null, fold: !!o.fold }; } catch (err) { /* where it started */ }
const tipSave = () => { try { localStorage.setItem('mme-tip', JSON.stringify(TIP)); } catch (err) { /* this visit only */ } };
function tipPlace() {                               // inside the map's box, wherever the box now ends
  if (tipEl.style.display === 'none') return;
  const r = box.getBoundingClientRect(), w = tipEl.offsetWidth, h = tipEl.offsetHeight;
  // Where nobody has put it: the foot of the map, clear of the strip the options stand in. In a lesson her words lie over the
  // foot, so there it stands at the top, left of the side panel, and a place chosen outside lessons waits until the lesson ends.
  const teach = document.body.classList.contains('tutoring');
  if (teach) { tipEl.style.left = Math.max(4, r.width - padR() - w - 52) + 'px'; tipEl.style.top = '8px'; return; }
  if (TIP.x == null) { tipEl.style.left = (padL() + 10) + 'px'; tipEl.style.top = Math.max(6, r.height - h - 46) + 'px'; return; }
  tipEl.style.left = Math.max(4, Math.min(r.width - w - 4, TIP.x)) + 'px'; tipEl.style.top = Math.max(4, Math.min(r.height - h - 4, TIP.y)) + 'px';
}
function tipFoldUI() { tipEl.classList.toggle('folded', TIP.fold); $('tipFold').textContent = TIP.fold ? '▸' : '▾'; $('tipFold').setAttribute('aria-expanded', String(!TIP.fold)); const b = tipBody.querySelector('b'); $('tipTitle').textContent = TIP.fold && b ? b.textContent : 'คำอธิบาย'; }
// the one way a card is filled: what to say, and the colour of its edge
const tip = {
  set(html, color) { tipEl.style.setProperty('--c', color || 'var(--brass)'); if (tipBody.innerHTML !== html) tipBody.innerHTML = html; tipEl.style.display = 'block'; tipFoldUI(); tipPlace(); },
  get shown() { return tipEl.style.display === 'block'; }
};
$('tipFold').onclick = e => { e.stopPropagation(); TIP.fold = !TIP.fold; tipSave(); tipFoldUI(); tipPlace(); };
(function tipDrag() {
  const head = tipEl.querySelector('.tiphead'); let d = null;
  head.addEventListener('pointerdown', e => { if (e.button !== 0 || e.target.closest('button')) return; const r = tipEl.getBoundingClientRect(); d = { dx: e.clientX - r.left, dy: e.clientY - r.top }; try { head.setPointerCapture(e.pointerId); } catch (err) { /* a nicety */ } tipEl.classList.add('dragging'); e.preventDefault(); e.stopPropagation(); });
  head.addEventListener('pointermove', e => { if (!d) return; const r = box.getBoundingClientRect(); TIP.x = Math.round(e.clientX - r.left - d.dx); TIP.y = Math.round(e.clientY - r.top - d.dy); tipPlace(); });
  const end = () => { if (!d) return; d = null; tipEl.classList.remove('dragging'); const r = box.getBoundingClientRect(), t = tipEl.getBoundingClientRect(); TIP.x = Math.round(t.left - r.left); TIP.y = Math.round(t.top - r.top); tipSave(); };
  head.addEventListener('pointerup', end); head.addEventListener('pointercancel', end);
  head.addEventListener('dblclick', e => { if (e.target.closest('button')) return; TIP.x = TIP.y = null; tipSave(); tipPlace(); });
  for (const ev of ['pointerdown', 'wheel', 'click']) tipEl.addEventListener(ev, e => e.stopPropagation());   // the card is not the map: nothing done on it reaches the map under it
  __on(window, 'resize', tipPlace);
})();
function near(list, mx, my, rad) { let best = null, bd = rad * rad; for (const p of list) { const d = (p.x - mx) ** 2 + (p.y - my) ** 2; if (d < bd) { bd = d; best = p; } } return best; }
function showTip(id, mx, my, e) {
  const code = eff(id), b = biomeInfo(code), zc = zoneOf(id), z = zc !== '.' ? zoneInfo(zc) : null;
  const pk = pickAt(mx, my), city = pk && pk.k === 'city' ? pk.v : null, lid = pk && pk.k === 'label' ? pk.id : null, onStan = !!pk && pk.k === 'stan', pt = near(visiblePoints(), mx, my, 9);
  const td = !pk && !pt ? chainAt(mx, my) : null, rt = !pk && !td ? routeAt(mx, my) : null;
  const hr = '<hr style="border:0;border-top:1px solid #333844;margin:6px 0">';
  let h = '';
  if (city) h += `<b>${esc(city.name || 'เมืองไม่มีชื่อ')}</b>` + (editable && city.own && !isBuiltin(city.id) ? `<div class="mine">${esc((CK[city.kind] || CK.city).name)}ที่วางเพิ่ม</div>` : '') + `<div class="lore">${esc(city.note || 'ยังไม่มีบันทึก')}</div>`
    + cityTradeLine(city.id) + (editable ? `<div class="m">ลากตัวเมืองหรือชื่อเมืองเพื่อย้าย</div>` : '') + hr;
  else if (lid) { const v = visibleLabels().find(l => l.id === lid) || {}; h += `<b>${esc(v.text || 'ชื่อสถานที่')}</b>` + (!editable ? '' : !baseLabel(lid) ? `<div class="mine">ชื่อที่ใส่เพิ่ม</div>` : ED.labels.has(lid) ? `<div class="mine">ชื่อนี้แก้หรือย้ายแล้ว</div>` : '') + (editable ? `<div class="m">ลากเพื่อย้าย แก้ข้อความได้ในโหมดใส่ชื่อสถานที่</div>` : '') + hr; }
  else if (onStan) h += `<b>ภูเขาสแตนเทอร์</b>` + (editable && ED.stan != null ? `<div class="mine">ภูเขานี้ย้ายมาตั้งที่นี่</div>` : '') + (editable ? `<div class="m">ลากเพื่อย้ายภูเขาทั้งลูก นครบนยอดกับป้ายชื่อจะย้ายตามไปด้วย</div>` : '') + hr;
  else if (pt && pt.h >= 0 && !isW(eff(pt.h))) { const ki = kindInfo(pt.k); h += `<b>${esc(pt.name || ki.name)}</b><div class="lore">${esc(pt.note || ki.note)}</div>${hr}`; }
  else if (td) h += bundleTipHTML(td) + hr;
  else if (rt) { const g = geoOf(rt); h += `<b>${esc(routeName(rt))}</b><div class="m">${esc(endName(rt.a))} ถึง ${esc(endName(rt.b))}${g && !g.fail ? ` · ยาว ${g.len} ช่อง` + (g.bridges.length ? ` · สะพาน ${g.bridges.length}` : '') + (g.tunnels ? ` · อุโมงค์ ${g.tunnels}` : '') : ''}</div>${hr}`; }
  h += `<b>${esc(b.name)}</b>`;
  h += landTipHTML(id);
  if (editable && ED.cells[id] !== '.') h += `<div class="mine">ช่องนี้ระบายใหม่ เดิมเป็น${esc(biomeInfo(BI[id]).name)}</div>`;
  if (!isW(code) && shownAt(id)) {
    if (RV[id] === '1') h += `<div class="s">มีแม่น้ำไหลผ่าน</div>`;
    if (RV[id] === '2') h += `<div class="s">ลำน้ำตามฤดูกาล ไหลเฉพาะห้วงที่ฝนชุก</div>`;
  }
  if (editable && ED.hide[id]) h += `<div class="mine">${shownAt(id) ? 'ซ่อนแม่น้ำเดิมบางสายในช่องนี้' : 'ซ่อนแม่น้ำเดิมในช่องนี้'}</div>`;
  if (URVH.has(id)) h += editable ? `<div class="mine">มีแม่น้ำที่วาดเพิ่มไหลผ่าน</div>` : RV[id] === '1' && shownAt(id) ? '' : `<div class="s">มีแม่น้ำไหลผ่าน</div>`;
  if (b.note && ED.cells[id] === '.') h += `<div class="lore">${esc(b.note)}</div>`;
  if (z) h += `<div class="m" style="margin-top:4px"><span class="s">${esc(z.name)}</span> · ${esc(z.lore)}</div>`;
  if (z && zc === 'T' && ED.stan != null) { if (editable) h += `<div class="m">ภูเขาย้ายมาตั้งที่นี่</div>`; }
  else if (z && z.placed) h += `<div class="m">${esc(z.placed)}</div>`;
  tip.set(h, chipColor(code));
}
// soft: the pointer only left the ground it was reading, so the card keeps what it says and the hand can go to it
function hideTip(soft) { if (soft && tipEl.style.display === 'block') return; tipEl.style.display = 'none'; }
function showTradeTip(mx, my, e) {                  // the trade mode: a city's trade, or what a line carries
  const c = cityAt(mx, my), ch = c ? null : chainAt(mx, my);
  if (!c && !ch) { hideTip(true); return; }
  tip.set(c ? `<b>${esc(c.name || 'เมืองไม่มีชื่อ')}</b>${cityTradeLine(c.id)}<div class="m">คลิกเพื่อดูรายละเอียด</div>`
    : bundleTipHTML(ch) + (ch.ls.length > 1 ? '<div class="m">คลิกเพื่อเลือกทีละเส้น</div>' : editable ? '<div class="m">คลิกเพื่อเลือก แล้วลากเพื่อดัดทาง</div>' : ''), ch ? TRD[ch.wet ? 'water' : 'caravan'].line : 'var(--brass)');
}

