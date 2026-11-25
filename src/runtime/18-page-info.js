// ---------- the page's own information: zones, kinds of ground, lore points ----------
// overrides by key; an edit runs on a copy and is one step of undo when its field is left
const zoneInfo = c => { const z = ZONE[c] || { name: '', lore: '', placed: '' }, o = ED.zinfo.get(c); return o ? { ...z, ...o } : z; };
const biomeInfo = b => { const z = BIOME[b], o = ED.binfo.get(b); return o ? { ...z, ...o } : z; };
const kindInfo = k => { const z = D.pointKinds[k], o = ED.kinfo.get(k); return o ? { ...z, ...o } : z; };
const INFO = { zi: { map: () => ED.zinfo, keys: ['name', 'lore', 'placed'], base: c => ZONE[c] }, bi: { map: () => ED.binfo, keys: ['name', 'note'], base: b => BIOME[b] }, ki: { map: () => ED.kinfo, keys: ['name', 'note'], base: k => D.pointKinds[k] } };
let iedit = null;                                   // { t, key, was }
function infoEdit(t, key, patch) {
  if (!editable) return;
  if (!iedit || iedit.t !== t || iedit.key !== key) { commitInfo(); const cur = t === 'pt' ? ED.points.get(key) : INFO[t].map().get(key); iedit = { t, key, was: cur ? { ...cur } : null }; }
  if (t === 'pt') {
    let o = ED.points.get(key);
    if (!o) { const p = PTB.get(key); if (!p) return; o = { id: p.id, k: p.k, x: p.x, y: p.y, name: '', note: '' }; ED.points.set(key, o); }
    Object.assign(o, patch);
    const hs = refreshPTF(key); if (hs.length) { rebuildHexes(hs, false); layerUsed = true; }   // a changed kind: the map's own glyph is painted out
  } else {
    const m = INFO[t].map(); let o = m.get(key);
    if (!o) { const b = INFO[t].base(key); o = {}; for (const f of INFO[t].keys) o[f] = b[f] || ''; m.set(key, o); }
    Object.assign(o, patch);
  }
  scheduleSave('info'); infoChanged(); requestDraw();
}
function commitInfo() {
  if (!iedit) return;
  const { t, key, was } = iedit; iedit = null;
  const cur = t === 'pt' ? ED.points.get(key) : INFO[t].map().get(key);
  const now = cur ? { ...cur } : null;
  if (JSON.stringify(now) !== JSON.stringify(was)) pushOp(t === 'pt' ? { k: 'pt', id: key, a: was, b: now } : { k: t, key, a: was, b: now });
}
function resetInfo(t, key) {
  commitInfo();
  const cur = INFO[t].map().get(key); if (!cur) return;
  doOp({ k: t, key, a: { ...cur }, b: null }); renderInfoCard();
}
function infoChanged() { updateLegend(); paletteNames(); updatePointsLegend(); if (mode === 'terrain') setBrush(bcode); }
// lore points: the page's own (by id) unless changed or removed, then the user's own
const PTB = new Map(PTS.map(p => [p.id, p]));
const PTF = new Set();                              // hexes of the page's own points that moved, changed kind or went: redrawn without them
const bakedOk = (p, o) => !o || (o.x === p.x && o.y === p.y && o.k === p.k);
function refreshPTF(id) {
  const p = PTB.get(id); if (!p || p.h < 0) return [];
  const want = ED.phid.has(id) || !bakedOk(p, ED.points.get(id)), had = PTF.has(p.h) && PTFBY.get(p.h).has(id);
  if (want === had) return [];
  let s = PTFBY.get(p.h); if (!s) PTFBY.set(p.h, s = new Set());
  if (want) s.add(id); else s.delete(id);
  if (s.size) PTF.add(p.h); else PTF.delete(p.h);
  updPainted(p.h); return [p.h];
}
const PTFBY = new Map();
function refreshAllPTF() { const hs = []; for (const p of PTS) hs.push(...refreshPTF(p.id)); return hs; }
function visiblePoints() {
  const out = [];
  for (const p of PTS) { if (ED.phid.has(p.id)) continue; const o = ED.points.get(p.id); out.push(o ? { ...p, ...o, h: hexAt(o.x, o.y), base: true, baked: bakedOk(p, o) } : { ...p, name: '', note: '', base: true, baked: true }); }
  for (const [id, o] of ED.points) if (!PTB.has(id)) out.push({ ...o, h: hexAt(o.x, o.y), base: false, baked: false });
  if (act && act.k === 'pdrag' && act.pos) for (const v of out) if (v.id === act.id) { v.x = act.pos[0]; v.y = act.pos[1]; v.baked = false; }
  return out;
}
function drawLoosePoints(c, px) {                   // points not in the map image: placed, moved or changed by the user
  for (const p of visiblePoints()) {
    if (p.baked || !POINTFN[p.k] || (p.h >= 0 && isW(eff(p.h)))) continue;
    POINTFN[p.k](c, p.x, p.y);
  }
  if (c === ctx && mode === 'info' && isel && isel.t === 'pt') {
    const p = visiblePoints().find(v => v.id === isel.id);
    if (p) { c.beginPath(); c.arc(p.x, p.y - 1.5, 7.5, 0, 2 * Math.PI); c.setLineDash([3 * px, 2 * px]); c.lineWidth = 1.5 * px; c.strokeStyle = '#cfa95e'; c.stroke(); c.setLineDash([]); }
  }
}
function pointAt(mx, my) {
  const lim = Math.max(6, 9 / view.s); let best = null, bd = lim;
  for (const p of visiblePoints()) { const d = Math.hypot(p.x - mx, p.y - 1.5 - my); if (d < bd) { bd = d; best = p; } }
  return best;
}
let isel = null, iptool = 'pick', ipkind = 'ruin';
function selectInfo(s) { commitInfo(); isel = s; renderInfoCard(); requestDraw(); }
function setIptool(t) {
  iptool = t === 'point' ? 'point' : 'pick'; segPick('ifTool', 't', iptool, setIptool);
  $('ifKind').hidden = iptool !== 'point';
  $('ifKind').innerHTML = Object.keys(D.pointKinds).map(k => `<button type="button" data-k="${k}">${esc(kindInfo(k).name)}</button>`).join('');
  segPick('ifKind', 'k', ipkind, k => { ipkind = k; setIptool(iptool); });
  $('ifHint').textContent = iptool === 'pick'
    ? 'คลิกช่องบนแผนที่เพื่อแก้ชื่อและเรื่องของเขต กับชื่อและคำอธิบายของภูมิประเทศ ช่องแก้อยู่ในแถบด้านข้าง คลิกสถานที่น่าสนใจเพื่อแก้หรือลบ ลากจุดเพื่อย้าย'
    : 'คลิกที่ว่างบนแผ่นดินเพื่อวางจุดชนิดที่เลือก ลากจุดเพื่อย้าย คลิกจุดเพื่อแก้ชื่อและบันทึกของจุดนั้น';
}
function renderInfoCard() {
  const card = $('infocard'); card.hidden = mode !== 'info';
  if (card.hidden) return;
  const body = $('infobody');
  if (!isel) { body.innerHTML = '<p class="hint">คลิกช่องหรือจุดบนแผนที่เพื่อแก้ข้อมูลของแผนที่ ชื่อและข้อความที่แก้จะขึ้นในการ์ดของช่อง คำอธิบายภูมิประเทศ และรายการด้านล่างทันที</p>'; return; }
  const ro = !editable ? ' disabled' : '';
  if (isel.t === 'hex') {
    const h = isel.h, zc = zoneOf(h), b = eff(h), z = zc !== '.' ? zoneInfo(zc) : null, bi = biomeInfo(b);
    body.innerHTML = (z ? `<h3>เขต: ${esc(z.name)}</h3>
      <label class="full">ชื่อเขต <input id="izName" maxlength="60" value="${esc(z.name)}"${ro}></label>
      <label class="full">เรื่องของเขต <textarea id="izLore" rows="5" maxlength="1200"${ro}>${esc(z.lore)}</textarea></label>
      <label class="full">ข้อมูลเพิ่มเติม <textarea id="izPlaced" rows="2" maxlength="600"${ro}>${esc(z.placed || '')}</textarea></label>
      <div class="btns"><button type="button" class="btn" id="izReset"${ED.zinfo.has(zc) ? '' : ' disabled'}>คืนข้อความเดิมของเขต</button></div>` : '<p class="hint">ช่องนี้ไม่อยู่ในเขตใด</p>')
      + `<h3>ภูมิประเทศ: ${esc(bi.name)}</h3>
      <label class="full">ชื่อ <input id="ibName" maxlength="60" value="${esc(bi.name)}"${ro}></label>
      <label class="full">คำอธิบาย <textarea id="ibNote" rows="3" maxlength="600"${ro}>${esc(bi.note || '')}</textarea></label>
      <div class="btns"><button type="button" class="btn" id="ibReset"${ED.binfo.has(b) ? '' : ' disabled'}>คืนข้อความเดิมของภูมิประเทศ</button></div>
      <p class="hint">ชื่อและคำอธิบายที่แก้ใช้กับทุกช่องของเขตหรือภูมิประเทศเดียวกัน</p>`;
    if (z) {
      const zf = () => infoEdit('zi', zc, { name: $('izName').value.slice(0, 60), lore: $('izLore').value.slice(0, 1200), placed: $('izPlaced').value.slice(0, 600) });
      for (const id of ['izName', 'izLore', 'izPlaced']) { $(id).addEventListener('input', zf); $(id).addEventListener('change', commitInfo); }
      $('izReset').onclick = () => resetInfo('zi', zc);
    }
    const bf = () => infoEdit('bi', b, { name: $('ibName').value.slice(0, 60), note: $('ibNote').value.slice(0, 600) });
    for (const id of ['ibName', 'ibNote']) { $(id).addEventListener('input', bf); $(id).addEventListener('change', commitInfo); }
    $('ibReset').onclick = () => resetInfo('bi', b);
    return;
  }
  const p = visiblePoints().find(v => v.id === isel.id); if (!p) { isel = null; renderInfoCard(); return; }
  const ki = kindInfo(p.k);
  body.innerHTML = `<h3>สถานที่น่าสนใจ: ${esc(p.name || ki.name)}</h3>
    <label>ชนิด <select id="ipKind"${ro}>${Object.keys(D.pointKinds).map(k => `<option value="${k}"${k === p.k ? ' selected' : ''}>${esc(kindInfo(k).name)}</option>`).join('')}</select></label>
    <label class="full">ชื่อจุดนี้ <input id="ipName" maxlength="60" value="${esc(p.name || '')}" placeholder="${esc(ki.name)}"${ro}></label>
    <label class="full">บันทึกของจุดนี้ <textarea id="ipNote" rows="3" maxlength="600" placeholder="${esc(ki.note)}"${ro}>${esc(p.note || '')}</textarea></label>
    <div class="btns"><button type="button" class="btn warn" id="ipDel"${ro}>ลบจุดนี้</button></div>
    <h3>ทุกจุดชนิด${esc(ki.name)}</h3>
    <label class="full">ชื่อชนิด <input id="ikName" maxlength="60" value="${esc(ki.name)}"${ro}></label>
    <label class="full">คำอธิบายชนิด <textarea id="ikNote" rows="3" maxlength="600"${ro}>${esc(ki.note || '')}</textarea></label>
    <div class="btns"><button type="button" class="btn" id="ikReset"${ED.kinfo.has(p.k) ? '' : ' disabled'}>คืนข้อความเดิมของชนิดนี้</button></div>
    <p class="hint">ชื่อจุดกับบันทึกของจุดเว้นว่างไว้ได้ การ์ดจะใช้ชื่อและคำอธิบายของชนิดแทน</p>`;
  const pf = () => infoEdit('pt', p.id, { name: $('ipName').value.slice(0, 60), note: $('ipNote').value.slice(0, 600) });
  for (const id of ['ipName', 'ipNote']) { $(id).addEventListener('input', pf); $(id).addEventListener('change', commitInfo); }
  $('ipKind').addEventListener('change', () => { infoEdit('pt', p.id, { k: D.pointKinds[$('ipKind').value] ? $('ipKind').value : p.k }); commitInfo(); renderInfoCard(); });
  $('ipDel').onclick = () => deletePoint(p.id);
  const kf = () => infoEdit('ki', p.k, { name: $('ikName').value.slice(0, 60), note: $('ikNote').value.slice(0, 600) });
  for (const id of ['ikName', 'ikNote']) { $(id).addEventListener('input', kf); $(id).addEventListener('change', commitInfo); }
  $('ikReset').onclick = () => resetInfo('ki', p.k);
}
function deletePoint(id) {
  if (!editable) return;
  commitInfo();
  const own = ED.points.get(id), ops = [];
  if (own) ops.push({ k: 'pt', id, a: { ...own }, b: null });
  if (PTB.has(id)) ops.push({ k: 'ph+', id });
  if (!ops.length) return;
  isel = null; doOp(ops.length === 1 ? ops[0] : { k: 'm', ops }); renderInfoCard();
  flash('ลบจุดแล้ว กดย้อนเพื่อเอาคืน');
}
function startPlacePoint(k) {                       // v0.18.5: from the list of points of interest straight to placing one
  if (!editable || !D.pointKinds[k]) return; ipkind = k; if (mode !== 'info') setMode('info'); setIptool('point'); flash('คลิกบนแผ่นดินเพื่อวาง' + kindInfo(k).name);
}
__on(document, 'click', e => { const el = e.target.closest ? e.target.closest('[data-ptk]') : null; if (el) startPlacePoint(el.dataset.ptk); });
__on(document, 'keydown', e => { if (e.key !== 'Enter') return; const el = e.target.closest ? e.target.closest('[data-ptk]') : null; if (el) startPlacePoint(el.dataset.ptk); });
function placePoint(x, y) {
  const h = hexAt(x, y); if (h < 0 || isW(eff(h))) { flash('วางจุดในน้ำไม่ได้'); return; }
  const o = { id: uid('p'), k: ipkind, x: r1(x), y: r1(y), name: '', note: '' };
  doOp({ k: 'pt', id: o.id, a: null, b: o }); selectInfo({ t: 'pt', id: o.id });
}
function paletteNames() { for (const s of document.querySelectorAll('#pal .sw')) if (s.dataset.b !== 'restore') s.lastChild.textContent = biomeInfo(s.dataset.b).name; }
function updatePointsLegend() {
  const vis = visiblePoints();
  // v0.19.0: the owner asked for the points of interest to become features of the ground. No new point is placed; the points the
  // map already has stay and keep counting until the owner moves them over, with one button, into kinds of feature of the same name.
  const left = Object.entries(D.pointKinds).filter(([k]) => vis.some(q => q.k === k));
  $('points').innerHTML = left.map(([k, p]) => `<div class="lg"><span class="chip" style="background:${p.color}"></span><span>${esc(kindInfo(k).name)}</span><span class="n">${vis.filter(q => q.k === k).length}</span></div>`).join('')
    + `<div class="lg"><span class="chip" style="background:radial-gradient(circle,#2a2116 30%,#f5e7b8 32%)"></span><span>ชุมชน</span><span class="n">${visibleCities().length}</span></div>`
    + (vis.length ? `<p class="ptwhy">จุดเหล่านี้เป็นสถานที่น่าสนใจแบบเดิม ยังดึงนักท่องเที่ยว ทำให้ชุมชนใกล้ ๆ ศักดิ์สิทธิ์ และให้สินค้าที่ผูกกับชนิดของจุดเหมือนเดิม สถานที่แบบนี้ย้ายไปเป็นลักษณะพิเศษของพื้นที่แล้ว วางใหม่ได้จากแถว "ลักษณะพิเศษ" ในโหมดระบายภูมิประเทศ</p>`
      + (editable ? `<div class="btns"><button type="button" class="btn" id="ptMove">ย้ายจุดทั้งหมดไปเป็นลักษณะพิเศษ</button></div>` : '') : '');
  const b = $('ptMove'); if (b) b.onclick = movePointsToFeatures;
}
// every point to a feature of the same kind on its hex; a kind of point becomes a kind of feature of its own (pk keeps what it was)
function movePointsToFeatures() {
  if (!editable) return; commitInfo();
  const vis = visiblePoints().filter(p => p.h >= 0 && !isW(eff(p.h))); if (!vis.length) return;
  const codeOf = {};
  for (const k of new Set(vis.map(p => p.k))) {
    let c = Object.keys(ECO.fkinds).find(x => ECO.fkinds[x].pk === k && !ECO.fkinds[x].del); if (c) { codeOf[k] = c; continue; }
    c = [...FEAT_CODES].find(x => !ECO.fkinds[x]); if (!c) continue;
    const nm = kindInfo(k).name, clash = Object.values(FEAT_BASE).some(z => z.name === nm);
    ECO.fkinds[c] = { name: (clash ? nm + ' (จากจุดเดิม)' : nm).slice(0, 40), col: D.pointKinds[k].color || '#b08cd8', on: 'land', y: {}, farm: 0, water: 0, well: 0, tour: 0, g: k, pk: k }; codeOf[k] = c;
  }
  const ch = [], ops = [], seen = new Set(), notes = [];
  for (const p of vis) {
    const c = codeOf[p.k]; if (!c) continue;
    if (!seen.has(p.h) && ECO.feat[p.h] === '.') { ch.push([p.h, '.', c]); seen.add(p.h); } else if (!seen.has(p.h) && ECO.feat[p.h] !== c) continue;
    if (p.name || p.note) notes.push([p.h, p.name, p.note]);
    const own = ED.points.get(p.id); if (own) ops.push({ k: 'pt', id: p.id, a: { ...own }, b: null }); if (PTB.has(p.id)) ops.push({ k: 'ph+', id: p.id });
  }
  for (const [i, , c] of ch) ECO.feat[i] = c;
  if (typeof noteFromPoint === 'function') for (const [h, nm, nt] of notes) noteFromPoint(h, nm, nt);
  if (ch.length) ops.push({ k: 'ft', ch });
  if (ops.length) doOp(ops.length === 1 ? ops[0] : { k: 'm', ops });
  featChanged(true); isel = null; renderInfoCard(); updatePointsLegend();
  flash(`ย้าย ${vis.length} จุดไปเป็นลักษณะพิเศษแล้ว`);
}

