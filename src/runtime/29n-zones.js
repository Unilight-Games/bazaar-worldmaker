// ---------- special zones: war, bandits, disaster, plague and the owner's own (v0.19.0) ----------
// The owner asked for zones that can be laid on the map: a land struck by disaster, a land without peace (a war, bandits thick on
// the road), each with its danger and whatever else it needs set by the owner. A zone is painted over hexes from the information
// mode. What it does: a trade line through it is as dangerous as the zone where it passes (its cost rises the way the danger the
// owner gives a line raises it, by the share of the way inside), and the communities inside live less well. The kinds and their
// starting numbers are Claude's; every zone's card changes them.
const SZK = {
  war: { name: 'พื้นที่สงคราม', col: '#c0392b', danger: 3, well: -12 },
  bandit: { name: 'โจรชุกชุม', col: '#9a6232', danger: 2, well: -4 },
  disaster: { name: 'เขตภัยพิบัติ', col: '#d68910', danger: 2, well: -10 },
  plague: { name: 'โรคระบาด', col: '#7d8f3a', danger: 1, well: -10 },
  beast: { name: 'สัตว์ร้ายชุกชุม', col: '#6c3483', danger: 2, well: -3 },
  unrest: { name: 'ความไม่สงบ', col: '#a04060', danger: 1, well: -6 },
  other: { name: 'เขตพิเศษ', col: '#5d6d7e', danger: 1, well: 0 },
};
ECO.sz = []; ECO.szc = new Array(N).fill('');
let szPick = null, szStamp = 0, szErase = false;
const szById = id => ECO.sz.find(z => z.id === id) || null;
const szAt = i => { const id = ECO.szc[i]; return id ? szById(id) : null; };
function szChanged(tables) { szStamp++; ecoChanged(!!tables); requestDraw(); szCard(); }

// ---- what a zone does ----
{
  const lc = ecoLinkCost; ecoLinkCost = function (L, cities) {
    const c = lc(L, cities), st = L && L.states; L.zone = null; if (!st || !st.length || !ECO.sz.length) return c;
    let inside = 0, top = null; for (const t of st) { const z = szAt(t >> 1); if (!z) continue; inside++; if (!top || z.danger > top.danger) top = z; }
    if (!top) return c;
    const share = inside / st.length, base = L.danger || 0, add = Math.max(0, top.danger - base) * Math.min(1, 3 * share), k = TU('dstep');
    L.zone = { id: top.id, name: top.name, share, lv: top.danger }; if (add > 0) L.danger = Math.min(3, base + Math.round(add));
    return c * (1 + k * (base + add)) / (1 + k * base);
  };
}
{
  const sa = socApply; socApply = function (rows) {
    const out = sa(rows); if (!ECO.sz.length || !rows) return out;
    for (const r of rows) { const h = r.c.h != null ? r.c.h : hexAt(r.c.x, r.c.y), z = h >= 0 ? szAt(h) : null; if (!z || !z.well) continue; r.well = clamp(r.well + z.well, 0, 100); if (r.wellWhy) r.wellWhy.push([z.name, z.well]); r.zone = z.id; }
    return out;
  };
}

// ---- the document ----
{
  const ld = ecoLoad, sr = ecoSerial;
  ecoLoad = function (b) {
    ld(b); b = b || {}; ECO.sz = []; ECO.szc = new Array(N).fill('');
    for (const z of (Array.isArray(b.sz) ? b.sz : []).slice(0, 200)) {
      if (!z || typeof z.id !== 'string' || !/^[a-z0-9]{1,16}$/.test(z.id) || ECO.sz.some(x => x.id === z.id)) continue;
      const k = SZK[z.kind] ? z.kind : 'other';
      ECO.sz.push({ id: z.id, kind: k, name: ecoStr(z.name, 60) || SZK[k].name, col: HEXC.test(z.col) ? z.col : SZK[k].col, danger: Math.round(ecoNum(z.danger, 0, 3, SZK[k].danger)), well: Math.round(ecoNum(z.well, -40, 20, SZK[k].well)) });
    }
    if (b.szc && typeof b.szc === 'object') for (const [id, list] of Object.entries(b.szc)) { if (!szById(id) || !Array.isArray(list)) continue; for (const i of list.slice(0, N)) if (Number.isInteger(i) && i >= 0 && i < N) ECO.szc[i] = id; }
    szStamp++;
  };
  ecoSerial = function () {
    const o = sr(); if (!ECO.sz.length) return o;
    o.sz = ECO.sz.map(z => ({ ...z })); const by = {}; ECO.szc.forEach((id, i) => { if (id) (by[id] || (by[id] = [])).push(i); }); o.szc = by; return o;
  };
}
{ const ap = applyOp; applyOp = function (op, dir, fx) { if (op.k !== 'sz') return ap(op, dir, fx); for (const [i, a, b] of op.ch) ECO.szc[i] = dir > 0 ? b : a; szChanged(false); }; }

// ---- on the map: hatching in the zone's colour, its edge, and its name ----
let szCv = null, szKey = '';
function szSheet() {
  let hsh = 0; for (let i = 0; i < N; i++) if (ECO.szc[i]) hsh = (Math.imul(hsh, 31) + i * 7 + ECO.szc[i].charCodeAt(0)) | 0;
  const key = szStamp + '|' + hsh + '|' + ECO.sz.map(z => z.col).join(''); if (key === szKey && szCv) return szCv; szKey = key;
  if (!szCv) { szCv = document.createElement('canvas'); szCv.width = Math.max(1, Math.ceil(G.w / (2 * SHK))); szCv.height = Math.max(1, Math.ceil(G.h / (2 * SHK))); }
  const c = szCv.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, szCv.width, szCv.height); c.setTransform(0.5 / SHK, 0, 0, 0.5 / SHK, 0, 0);
  for (const z of ECO.sz) {
    c.save(); c.beginPath(); let any = false; for (let i = 0; i < N; i++) if (ECO.szc[i] === z.id) { hexPath(c, i, 1.01); any = true; } if (!any) { c.restore(); continue; }
    c.fillStyle = z.col; c.globalAlpha = 0.16; c.fill(); c.clip(); c.globalAlpha = 0.55; c.strokeStyle = z.col; c.lineWidth = 0.9;
    c.beginPath(); for (let d = -G.h; d < G.w; d += 5) { c.moveTo(d, 0); c.lineTo(d + G.h, G.h); } c.stroke(); c.restore();
    // the edge: a side of a hex whose neighbour is outside the zone
    c.save(); c.strokeStyle = z.col; c.lineWidth = 1.4; c.globalAlpha = 0.9; c.setLineDash([3, 2]); c.beginPath();
    for (let i = 0; i < N; i++) { if (ECO.szc[i] !== z.id) continue; for (let a = 0; a < 6; a++) { const v = NB[i * 6 + a]; if (v >= 0 && ECO.szc[v] === z.id) continue; const e = EDGE[a], p0 = szCorner(i, e), p1 = szCorner(i, e + 1); c.moveTo(p0[0], p0[1]); c.lineTo(p1[0], p1[1]); } }
    c.stroke(); c.restore();
  }
  return szCv;
}
// corner e of a hex, as hexPath walks them; the side shared with neighbour a runs from corner EDGE[a] to the next
function szCorner(i, e) { const t = (e % 6) * Math.PI / 3; return [CX[i] + R * Math.cos(t), CY[i] + R * Math.sin(t)]; }
{ const dg = drawOverGround; drawOverGround = function (c, w, h, live) { if (dg) dg(c, w, h, live); if (ECO.sz.length && szShown()) { const s = szSheet(); c.drawImage(s, 0, 0, s.width * 2 * SHK, s.height * 2 * SHK); } }; }
const szShown = () => SZVIEW.on;
const SZVIEW = { on: true };
try { SZVIEW.on = localStorage.getItem('mme-sz-shown') !== '0'; } catch (err) { /* shown */ }
{
  const top = drawOnTop; drawOnTop = function (c, px) {
    if (top) top(c, px); if (!ECO.sz.length || !szShown()) return;
    for (const z of ECO.sz) {
      let sx = 0, sy = 0, n = 0; for (let i = 0; i < N; i++) if (ECO.szc[i] === z.id) { sx += CX[i]; sy += CY[i]; n++; } if (!n) continue;
      const fs = 11 * px; c.font = `600 ${fs}px ${getComputedStyle(document.body).getPropertyValue('--display') || 'serif'}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      const t = z.name + (z.danger ? ' ' + '⚠'.repeat(z.danger) : ''); c.lineWidth = 3 * px; c.strokeStyle = 'rgba(16,16,20,.85)'; c.strokeText(t, sx / n, sy / n); c.fillStyle = '#f4e9d0'; c.fillText(t, sx / n, sy / n);
    }
  };
}
// the switch beside the names
{
  const ctl = document.querySelector('#mapbox .ctl'), b = document.createElement('button'); b.type = 'button'; b.id = 'szBtn'; b.textContent = 'เขตพิเศษ'; b.setAttribute('aria-pressed', String(SZVIEW.on));
  b.title = 'แสดงหรือซ่อนเขตพิเศษ เช่น พื้นที่สงคราม โจรชุกชุม เขตภัยพิบัติ';
  if (ctl) ctl.insertBefore(b, $('seasonBtn'));
  b.onclick = () => { SZVIEW.on = !SZVIEW.on; b.setAttribute('aria-pressed', String(SZVIEW.on)); try { localStorage.setItem('mme-sz-shown', SZVIEW.on ? '1' : '0'); } catch (err) { /* this visit */ } requestDraw(); };
}

// ---- painting, from the information mode ----
{
  const si = setIptool; setIptool = function (t) {
    if (t !== 'zone') { si(t); szCard(); return; }
    si('pick'); iptool = 'zone'; segPick('ifTool', 't', 'zone', setIptool); $('ifKind').hidden = true;
    $('ifHint').textContent = editable ? 'เลือกเขตในแผงข้าง แล้วลากบนแผนที่เพื่อระบาย ขนาดแปรงใช้ตัวเดียวกับภูมิประเทศ กดค้างปุ่มขวาหรือเลือก "ลบออกจากเขต" เพื่อเอาช่องออก' : 'แผนที่นี้ให้ดูได้อย่างเดียว';
    szCard(); requestDraw();
  };
}
segPick('ifTool', 't', iptool, setIptool);   // the buttons were bound before this part existed
let szAct = null;
function szPaintAt(e) {
  const [mx, my] = toMap(e.clientX, e.clientY), h = hexAt(mx, my); if (h < 0) return;
  const want = szAct.erase ? '' : szPick;
  for (const i of brush(h, bsize)) { const was = szAct.ch.has(i) ? szAct.ch.get(i)[0] : ECO.szc[i]; if (ECO.szc[i] === want) continue; if (szAct.erase && ECO.szc[i] !== szPick && szPick) continue; szAct.ch.set(i, [was, want]); ECO.szc[i] = want; }
  szStamp++; requestDraw();
}
box.addEventListener('pointerdown', e => {
  if (mode !== 'info' || iptool !== 'zone' || !editable || spaceDown || e.target !== cv || (e.button !== 0 && e.button !== 2)) return;
  if (!szPick) { flash('เลือกหรือเพิ่มเขตในแผงข้างก่อน'); return; }
  e.stopPropagation(); e.preventDefault(); szAct = { ch: new Map(), erase: szErase || e.button === 2 }; szPaintAt(e);
}, true);
box.addEventListener('contextmenu', e => { if (mode === 'info' && iptool === 'zone') e.preventDefault(); });
__on(window, 'pointermove', e => { if (szAct) szPaintAt(e); });
__on(window, 'pointerup', () => {
  if (!szAct) return; const ch = [...szAct.ch].map(([i, [a, b]]) => [i, a, b]).filter(x => x[1] !== x[2]); szAct = null;
  if (ch.length) { pushOp({ k: 'sz', ch }); szChanged(false); }
});

// ---- the card: the zones, what each does ----
function szCount() { const n = {}; for (const id of ECO.szc) if (id) n[id] = (n[id] || 0) + 1; return n; }
function szCard() {
  if (mode !== 'info' || iptool !== 'zone') return; const body = $('infobody'); if (!body) return;
  const n = szCount(), dis = editable ? '' : ' disabled';
  let h = `<h3>เขตพิเศษ</h3><p class="hint" style="margin-top:0">เขตพิเศษทำให้เส้นการค้าที่ผ่านอันตรายเท่ากับเขตตามส่วนของทางที่อยู่ในเขต และชุมชนในเขตอยู่ดีน้อยลงตามที่ตั้ง</p>`
    + `<div class="erow"><select id="szNewKind"${dis}>${Object.entries(SZK).map(([k, z]) => `<option value="${k}">${esc(z.name)}</option>`).join('')}</select><button type="button" class="btn" data-sz="new"${dis}>เพิ่มเขต</button></div>`
    + `<div class="erow"><label><input type="checkbox" id="szErase"${szErase ? ' checked' : ''}${dis}> ลบออกจากเขต</label></div>`;
  for (const z of ECO.sz) {
    const on = szPick === z.id;
    h += `<details class="tfold" data-szid="${z.id}"${on ? ' open' : ''}><summary><i class="sdot" style="background:${z.col}"></i>${esc(z.name)} <small>${n[z.id] || 0} ช่อง · ${DANGER[z.danger]}</small></summary>`
      + `<div class="btns"><button type="button" class="btn${on ? ' on' : ''}" data-sz="pick"${dis}>${on ? 'กำลังระบายเขตนี้' : 'ระบายเขตนี้'}</button><button type="button" class="btn" data-note="x:${z.id}" data-nt="${esc(z.name)}">${noteOf('x:' + z.id) ? 'ข้อมูลของเขต' : 'เขียนข้อมูลของเขต'}</button></div>`
      + `<div class="erow"><label>ชื่อ <input type="text" data-szf="name" maxlength="60" value="${esc(z.name)}"${dis}></label><label>สี <input type="color" data-szf="col" value="${z.col}"${dis}></label></div>`
      + `<div class="erow"><label>ชนิด <select data-szf="kind"${dis}>${Object.entries(SZK).map(([k, s]) => `<option value="${k}"${k === z.kind ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label></div>`
      + `<div class="erow"><label>ความอันตราย <select data-szf="danger"${dis}>${DANGER.map((t, i) => `<option value="${i}"${i === z.danger ? ' selected' : ''}>${t}</option>`).join('')}</select></label><label>ความเป็นอยู่ของชุมชนในเขต <input type="number" data-szf="well" min="-40" max="20" step="1" value="${z.well}" style="width:5em"${dis}> แต้ม</label></div>`
      + `<div class="btns"><button type="button" class="btn warn" data-sz="del"${dis}>ลบเขตนี้</button></div></details>`;
  }
  body.innerHTML = h;
}
$('infobody').addEventListener('click', e => {
  const b = e.target.closest ? e.target.closest('[data-sz]') : null; if (!b || !editable) return; const a = b.dataset.sz, d = b.closest('[data-szid]'), z = d ? szById(d.dataset.szid) : null;
  if (a === 'new') { const k = $('szNewKind').value in SZK ? $('szNewKind').value : 'other', s = SZK[k]; let id; do { id = 'z' + Math.random().toString(36).slice(2, 8); } while (szById(id)); ECO.sz.push({ id, kind: k, name: s.name, col: s.col, danger: s.danger, well: s.well }); szPick = id; szErase = false; szChanged(true); }
  else if (a === 'pick' && z) { szPick = szPick === z.id ? null : z.id; szCard(); }
  else if (a === 'del' && z) {
    const ch = []; ECO.szc.forEach((id, i) => { if (id === z.id) ch.push([i, id, '']); }); for (const [i] of ch) ECO.szc[i] = '';
    ECO.sz = ECO.sz.filter(x => x !== z); if (szPick === z.id) szPick = null; if (ch.length) pushOp({ k: 'sz', ch }); szChanged(true); flash('ลบเขตแล้ว ช่องที่ระบายไว้ย้อนคืนได้ แต่ตัวเขตต้องเพิ่มใหม่');
  }
});
$('infobody').addEventListener('change', e => {
  const el = e.target; if (!editable) return; if (el.id === 'szErase') { szErase = el.checked; return; }
  const f = el.dataset && el.dataset.szf, d = el.closest && el.closest('[data-szid]'), z = d ? szById(d.dataset.szid) : null; if (!f || !z) return;
  if (f === 'name') z.name = el.value.trim().slice(0, 60) || SZK[z.kind].name;
  else if (f === 'col') { if (HEXC.test(el.value)) z.col = el.value; }
  else if (f === 'kind') { const k = SZK[el.value] ? el.value : 'other', s = SZK[k], o = SZK[z.kind]; if (z.name === o.name) z.name = s.name; if (z.col === o.col) z.col = s.col; if (z.danger === o.danger) z.danger = s.danger; if (z.well === o.well) z.well = s.well; z.kind = k; }
  else if (f === 'danger') z.danger = clamp(Math.round(+el.value) || 0, 0, 3);
  else if (f === 'well') z.well = Math.round(ecoNum(el.value, -40, 20, 0));
  szChanged(true);
});
{ const ri = renderInfoCard; renderInfoCard = function () { if (mode === 'info' && iptool === 'zone') { $('infocard').hidden = false; szCard(); return; } ri(); }; }
// the hover card names the zone a hex lies in
{ const lt = landTipHTML; landTipHTML = function (id) { const z = szAt(id); return lt(id) + (z ? `<div class="s">${esc(z.name)} <span class="w">${DANGER[z.danger]}${z.well ? ' · ความเป็นอยู่ ' + (z.well > 0 ? '+' : '') + z.well : ''}</span></div>` : ''); }; }
