// ---------- editing the network ----------
function changeLink(id, patch) {                    // one step of undo: the line as the user had it (null: the page's own) and as it is now
  const L = ECON && ECON.links.find(x => x.id === id); if (!L || !editable) return;
  const own = ED.tlinks.get(id);
  doOp({ k: 'tl', id, a: own ? { ...own, via: (own.via || []).map(p => [p[0], p[1]]) } : null, b: { ...plainLink(L), ...patch } });
}
function deleteLink(id) {
  if (!ED.tlinks.has(id) && !(ECON && ECON.links.some(x => x.id === id))) return;
  const own = ED.tlinks.get(id), ops = [];
  if (own) ops.push({ k: 'tl', id, a: { ...own }, b: null });
  if (id.startsWith('a:') && !ED.tlhid.has(id)) ops.push({ k: 'tlh+', id });
  if (!ops.length || !editable) return;
  if (tlsel === id) tlsel = null;
  doOp(ops.length === 1 ? ops[0] : { k: 'm', ops });
  flash('ลบเส้นการค้าแล้ว กดย้อนเพื่อเอาคืน');
}
function setHub(id, rank) {                         // a city's rank as a centre (null: as its kind gives); a rank set by hand stays even where it
  const c = ECON && ECON.cities.find(x => x.id === id); if (!c || !editable) return;   // matches the kind, so a later change of kind leaves it
  const a = ED.hubs.has(id) ? ED.hubs.get(id) : null, b = rank == null ? null : Math.max(0, Math.min(3, rank | 0));
  if (a === b) return;
  doOp({ k: 'hub', id, a, b });
  const r = b == null ? autoRank(c) : b;
  flash(r ? `ตั้งเป็น${RANKN[r]}ระดับ ${r} แล้ว เครือข่ายจัดใหม่รอบเมืองนี้` : 'เลิกเป็นศูนย์กระจายสินค้าแล้ว สินค้าของเมืองนี้ไปรวมที่ศูนย์ที่ใกล้ที่สุด');
}
function setParent(id, pid) {                       // the centre a smaller place sends its goods to (null: the nearest above it)
  if (!editable) return;
  const a = ED.tparent.has(id) ? ED.tparent.get(id) : null, b = pid || null;
  if (a === b) return;
  doOp({ k: 'tpar', id, a, b });
  flash(b ? 'เปลี่ยนศูนย์ที่ส่งของให้แล้ว' : 'กลับไปส่งของให้ศูนย์ที่ใกล้ที่สุดแล้ว');
}
function resetNetwork() {
  if (!editable) return;
  const ops = [];
  for (const [id, o] of ED.tlinks) ops.push({ k: 'tl', id, a: { ...o }, b: null });
  for (const id of ED.tlhid) ops.push({ k: 'tlh-', id });
  for (const [id, v] of ED.hubs) ops.push({ k: 'hub', id, a: v, b: null });
  for (const [id, v] of ED.tparent) ops.push({ k: 'tpar', id, a: v, b: null });
  if (!ops.length) { flash('เครือข่ายเป็นแบบอัตโนมัติอยู่แล้ว'); return; }
  tlsel = null; tpend = null;
  doOp({ k: 'm', ops }); flash('คืนเครือข่ายอัตโนมัติแล้ว กดย้อนเพื่อเอาคืน');
}
function tradeClick(x, y) {
  const c = cityAt(x, y);
  if (ttool === 'add' && editable) {                  // laying a line: one city, then another
    if (!c) { if (tpend) { tpend = null; tprev = null; requestDraw(); } return; }
    if (!tpend) { tpend = c.id; tprev = null; requestDraw(); return; }
    if (tpend === c.id) { tpend = null; tprev = null; requestDraw(); return; }
    const o = { id: uid('u'), a: tpend, b: c.id, mode: tmode, via: [] }; tpend = null; tprev = null;
    doOp({ k: 'tl', id: o.id, a: null, b: o }); tlsel = o.id; tsel = null; renderTradeCard(); return;
  }
  if (c) { selectTrade(c.id); return; }
  const ch = chainAt(x, y);
  if (ch) { const ls = chainLines(ch), i = ls.findIndex(L => L.id === tlsel); selectLink(ls[(i + 1) % ls.length].id); return; }   // again: the next line on the stretch
  selectTrade(null);
}
function setTtool(t) {
  ttool = t === 'add' ? 'add' : 'pick'; tpend = null; tprev = null;
  segPick('tdTool', 't', ttool, setTtool);
  $('tdMode').hidden = ttool !== 'add';
  $('tdHint').textContent = ttool === 'add'
    ? 'คลิกเมืองต้นทางแล้วคลิกเมืองปลายทาง เส้นใหม่หาทางที่ถูกที่สุดตามแบบที่เลือก อัตโนมัติใช้ทั้งเรือและคาราวาน ทางน้ำใช้เรือ คาราวานไปทางบกอย่างเดียว สินค้าจะเลือกวิ่งบนเส้นใหม่เองถ้าถูกกว่า Esc ยกเลิก'
    : 'สินค้าวิ่งเฉพาะบนเส้นการค้า เมืองที่มีวงทองคือศูนย์กระจายสินค้า จำนวนวงบอกระดับศูนย์ ศูนย์ระดับ 2 ขึ้นไปเชื่อมกันด้วยเส้นหลัก ศูนย์หลักระดับ 3 มีเส้นสายใหญ่ถึงกัน เมืองที่เล็กกว่าส่งของเข้าศูนย์ที่ใกล้ที่สุดซึ่งระดับสูงกว่าด้วยเส้นสาขา เส้นที่วิ่งเลียบกันรวมเป็นเส้นเดียวที่หนาตามของรวม เส้นฟ้าคือช่วงที่ไปทางน้ำ เส้นอำพันคือช่วงที่คาราวานขน เส้นประคือเส้นที่ยังไม่มีของวิ่ง ' + (editable ? 'คลิกเมืองเพื่อดูการค้า ปรับระดับศูนย์ หรือเลือกศูนย์ที่ส่งของให้ คลิกเส้นเพื่อเลือก คลิกซ้ำช่วงที่วิ่งร่วมกันเพื่อเลือกเส้นถัดไป ลากเส้นที่เลือกเพื่อดัดทาง Delete ลบเส้น' : 'คลิกเมืองเพื่อดูการค้าของเมืองนั้น คลิกเส้นเพื่อดูว่าขนอะไร คลิกซ้ำช่วงที่วิ่งร่วมกันเพื่อเลือกเส้นถัดไป');
  requestDraw();
}
function setTmode(m) { tmode = LMODE[m] ? m : 'auto'; tprev = null; segPick('tdMode', 'k', tmode, setTmode); }


// the coastal glow and the phantom haze of the render, as fields to lay over repainted hexes
let hazeCv = null, glowCv = null;
function fieldCanvas(src, w, h, col, ch, k) {
  const cv2 = document.createElement('canvas'); cv2.width = w; cv2.height = h; const c2 = cv2.getContext('2d'), im = c2.createImageData(w, h);
  for (let p = 0; p < w * h; p++) { im.data[p * 4] = col[0]; im.data[p * 4 + 1] = col[1]; im.data[p * 4 + 2] = col[2]; im.data[p * 4 + 3] = Math.round(src[p * 4 + ch] * k); }
  c2.putImageData(im, 0, 0); return cv2;
}
const fimg = new Image();
fimg.onload = () => {
  const w = fimg.naturalWidth, h = fimg.naturalHeight, t = document.createElement('canvas'); t.width = w; t.height = h;
  const tc = t.getContext('2d'); tc.drawImage(fimg, 0, 0); const src = tc.getImageData(0, 0, w, h).data;
  hazeCv = fieldCanvas(src, w, h, [128, 98, 168], 0, 0.5); glowCv = fieldCanvas(src, w, h, [118, 160, 172], 1, 0.42);
  for (let i = 0; i < N; i++) { const x = Math.min(w - 1, Math.max(0, Math.round(CX[i] / G.w * w))), y = Math.min(h - 1, Math.max(0, Math.round(CY[i] / G.h * h))); HZ[i] = src[(y * w + x) * 4] / 255; }
  scheduleEcon(0);
  if (painted.size) rebuildAll();
};
if (D.fields) fimg.src = D.fields;

