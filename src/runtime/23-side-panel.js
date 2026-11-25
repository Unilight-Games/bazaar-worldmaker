// ---------- the side panel ----------
let counts = {};
function updateLegend() {
  counts = {}; for (let i = 0; i < N; i++) { const b = eff(i); counts[b] = (counts[b] || 0) + 1; }
  let rv1 = 0, rv2 = 0; for (let i = 0; i < N; i++) if (RV[i] !== '0' && !isW(eff(i)) && shownAt(i)) { if (RV[i] === '1') rv1++; else rv2++; }
  $('legend').innerHTML = Object.entries(BIOME).filter(([k]) => counts[k] && k !== 'S').map(([k, b]) =>
    `<div class="lg"><span class="chip" style="background:${chipColor(k)}"></span><span>${esc(biomeInfo(k).name)}</span><span class="n">${counts[k]}</span></div>`).join('')
    + `<div class="lg"><span class="chip" style="background:linear-gradient(90deg,transparent 40%,#5488ac 40% 60%,transparent 60%),#a7b06e"></span><span>แม่น้ำ</span><span class="n">${rv1}</span></div>`
    + `<div class="lg"><span class="chip" style="background:linear-gradient(90deg,transparent 42%,#7ca6be 42% 58%,transparent 58%),#c4b880"></span><span>ลำน้ำตามฤดูกาล</span><span class="n">${rv2}</span></div>`;
}
let statT = 0;
function updateStats() {
  renderFixes();
  clearTimeout(statT);
  statT = setTimeout(() => {
    let pc = 0, hc = 0; for (const i of painted) { if (ED.cells[i] !== '.') pc++; if (ED.hide[i]) hc++; }
    const lc = { add: 0, edit: 0 }; for (const id of ED.labels.keys()) if (!baseLabel(id)) lc.add++; else if (!ED.lhid.has(id)) lc.edit++;
    const rc = { add: 0, edit: 0 }; for (const id of ED.routes.keys()) if (!baseRoad(id)) rc.add++; else if (!ED.rthid.has(id)) rc.edit++;
    const rows = [['ช่องที่ระบาย', pc], ['ช่องที่ซ่อนแม่น้ำเดิม', hc], ['แม่น้ำที่วาด', ED.rivers.length], ['เมืองที่วางหรือแก้', ED.cities.length], ['เมืองเดิมที่ลบ', ED.bhid.size],
      ['ชื่อสถานที่ที่ใส่เพิ่ม', lc.add], ['ชื่อสถานที่เดิมที่แก้หรือย้าย', lc.edit], ['ชื่อสถานที่เดิมที่ลบ', ED.lhid.size], ['ภูเขาสแตนเทอร์', ED.stan == null ? 'ที่เดิม' : 'ย้ายแล้ว'],
      ['ถนนที่วาง', rc.add], ['ถนนเดิมที่แก้', rc.edit], ['ถนนเดิมที่ลบ', ED.rthid.size],
      ['สถานที่น่าสนใจที่วางหรือแก้', ED.points.size], ['สถานที่น่าสนใจเดิมที่ลบ', ED.phid.size], ['ข้อความเขตและภูมิประเทศที่แก้', ED.zinfo.size + ED.binfo.size + ED.kinfo.size],
      ['เส้นการค้าที่วางหรือแก้', ED.tlinks.size], ['เส้นการค้าเดิมที่ลบ', ED.tlhid.size], ['ระดับศูนย์ที่ตั้งเอง', ED.hubs.size], ['ศูนย์ที่ส่งของให้ที่เลือกเอง', ED.tparent.size]];
    $('stats').innerHTML = (BLANK ? rows.filter(([k]) => !k.includes('เดิม') && !k.includes('สแตนเทอร์')) : rows).map(([k, v]) => `<span>${esc(k)}</span><span>${v}</span>`).join('');
    $('clearAll').disabled = !editable || !(pc + hc + ED.rivers.length + ED.cities.length + ED.bhid.size + ED.labels.size + ED.lhid.size + (ED.stan != null ? 1 : 0) + ED.routes.size + ED.rthid.size + ED.points.size + ED.phid.size + ED.zinfo.size + ED.binfo.size + ED.kinfo.size + ED.tlinks.size + ED.tlhid.size + ED.hubs.size + ED.tparent.size);
    updateLegend(); updateHistory();
  }, 120);
}
updatePointsLegend();
document.getElementById('method').innerHTML = (D.method || []).map(sec => `<h3>${esc(sec.h)}</h3><ol>${sec.items.map(x => `<li>${esc(x)}</li>`).join('')}</ol>`).join('');
let clearArm = 0;
$('clearAll').onclick = () => {
  if (!editable) return;
  const btn = $('clearAll');
  if (!clearArm) { btn.textContent = 'กดอีกครั้งเพื่อล้าง'; clearArm = setTimeout(() => { clearArm = 0; btn.textContent = 'ล้างงานแก้ทั้งหมด'; }, 4000); return; }
  clearTimeout(clearArm); clearArm = 0; btn.textContent = 'ล้างงานแก้ทั้งหมด';
  commitCityEdit(); commitInfo(); selectCity(null); selectLabel(null); selectRoute(null); selectInfo(null); riv = null;
  const ops = [], ch = [];
  for (const i of painted) if (ED.cells[i] !== '.') ch.push([i, ED.cells[i], '.']);
  if (ch.length) ops.push({ k: 't', ch });
  if (HIDK.size) ops.push({ k: 'rh', on: [], off: [...HIDK] });
  // rivers and cities leave from the back, so undo puts each one back at its own place in the list
  for (let at = ED.rivers.length - 1; at >= 0; at--) { const r = ED.rivers[at]; ops.push({ k: 'r-', r: { id: r.id, kind: r.kind, pts: r.pts }, at }); }
  for (let at = ED.cities.length - 1; at >= 0; at--) ops.push({ k: 'c-', c: { ...ED.cities[at] }, at });
  for (const id of ED.bhid) ops.push({ k: 'bh-', id });
  for (const [id, o] of ED.labels) ops.push({ k: 'lb', id, a: { ...o }, b: null });
  for (const id of ED.lhid) ops.push({ k: 'lh-', id });
  if (ED.stan != null) ops.push({ k: 'st', a: ED.stan, b: null });
  for (const [id, o] of ED.routes) ops.push({ k: 'rt', id, a: { ...o }, b: null });
  for (const id of ED.rthid) ops.push({ k: 'rth-', id });
  for (const [id, o] of ED.points) ops.push({ k: 'pt', id, a: { ...o }, b: null });
  for (const id of ED.phid) ops.push({ k: 'ph-', id });
  for (const t of ['zi', 'bi', 'ki']) for (const [key, o] of INFO[t].map()) ops.push({ k: t, key, a: { ...o }, b: null });
  for (const [id, o] of ED.tlinks) ops.push({ k: 'tl', id, a: { ...o }, b: null });
  for (const id of ED.tlhid) ops.push({ k: 'tlh-', id });
  for (const [id, v] of ED.hubs) ops.push({ k: 'hub', id, a: v, b: null });
  for (const [id, v] of ED.tparent) ops.push({ k: 'tpar', id, a: v, b: null });
  if (!ops.length) return;
  doOp({ k: 'm', ops });
  flash('ล้างงานแก้แล้ว กดย้อนเพื่อเอาคืน');
};

