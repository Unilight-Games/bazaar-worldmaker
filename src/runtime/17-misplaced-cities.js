// ---------- cities that stand where they should not ----------
// The page lists the cities of the user's own map that sit on a mountain, in the haze they guard, or on top of another city,
// each with a hex nearby that suits it better. A proposal applies with one click and one step of undo; a city the user has
// moved since the proposal was written drops out of the list.
const FIXES = Array.isArray(D.fixes) ? D.fixes : [];
function activeFixes() {
  const vc = new Map(visibleCities().map(c => [c.id, c]));
  return FIXES.filter(f => { const c = vc.get(f.id); return c && Math.hypot(c.x - f.from[0], c.y - f.from[1]) <= 2; });
}
function applyFixes(list) {
  if (!editable || !list.length) return;
  const ops = [];
  for (const f of list) {
    const own = ownCity(f.id), b = D.cities.find(c => c.id === f.id);
    if (own) ops.push({ k: 'c~', id: f.id, a: { x: own.x, y: own.y }, b: { x: f.x, y: f.y } });
    else if (b) ops.push({ k: 'c+', c: { id: b.id, name: b.name, kind: b.kind || 'city', note: b.note, x: f.x, y: f.y } });
  }
  if (!ops.length) return;
  doOp(ops.length === 1 ? ops[0] : { k: 'm', ops });
  flash(ops.length === 1 ? 'ย้ายเมืองตามข้อเสนอแล้ว กดย้อนเพื่อเอาคืน' : `ย้ายเมืองตามข้อเสนอ ${ops.length} เมืองแล้ว กดย้อนเพื่อเอาคืน`);
}
function lookAt(x, y, z) {                          // the view on a point of the map, at z times the whole-map scale
  const w = box.clientWidth - padR() - padL(), h = boxH(); view.s = fitS * z; clampView();
  view.x = padL() + w / 2 - x * view.s; view.y = h / 2 - y * view.s; clampView(); requestDraw();
}
function renderFixes() {
  const card = $('fixcard'), list = mode === 'city' && editable ? activeFixes() : [];
  card.hidden = !list.length; if (card.hidden) return;
  $('fixbody').innerHTML = list.map(f => `<div class="tr"><b>${esc(f.name)}</b> <span class="w">${esc(f.why)}</span><div class="btns"><button type="button" class="btn" data-fix="${esc(f.id)}">ย้ายตามข้อเสนอ</button><button type="button" class="btn" data-see="${esc(f.id)}">ดูบนแผนที่</button></div></div>`).join('')
    + (list.length > 1 ? '<div class="btns"><button type="button" class="btn" id="fixAll">ย้ายทั้งหมด</button></div>' : '')
    + '<p class="note">เส้นประบนแผนที่ชี้จากที่ตั้งตอนนี้ไปช่องที่เสนอ ถนนกับเส้นการค้าของเมืองหาทางใหม่เอง กดย้อนได้ทุกครั้ง</p>';
  for (const b of document.querySelectorAll('#fixbody [data-fix]')) b.onclick = () => applyFixes(activeFixes().filter(f => f.id === b.dataset.fix));
  for (const b of document.querySelectorAll('#fixbody [data-see]')) b.onclick = () => { const f = FIXES.find(x => x.id === b.dataset.see); if (f) { lookAt((f.from[0] + f.x) / 2, (f.from[1] + f.y) / 2, 4); selectCity(f.id); } };
  const all = $('fixAll'); if (all) all.onclick = () => applyFixes(activeFixes());
}
function drawFixes(c, px) {                         // in the city mode: a dashed arrow from each such city to the hex proposed for it
  if (mode !== 'city' || !editable) return;
  for (const f of activeFixes()) {
    const v = visibleCities().find(x => x.id === f.id); if (!v) continue;
    const ang = Math.atan2(f.y - v.y, f.x - v.x), r = 5 * px;
    c.beginPath(); c.moveTo(v.x, v.y); c.lineTo(f.x - Math.cos(ang) * r, f.y - Math.sin(ang) * r);
    c.setLineDash([4 * px, 3 * px]); c.lineWidth = 1.8 * px; c.strokeStyle = '#ffd678'; c.stroke(); c.setLineDash([]);
    c.beginPath(); c.arc(f.x, f.y, r, 0, 2 * Math.PI); c.lineWidth = 2 * px; c.strokeStyle = '#ffd678'; c.stroke();
  }
}
function drawHandles(c, px) {
  if (mode === 'route' && rpend != null) {          // where the route being laid starts
    const e = endPoint(rpend);
    if (e) { c.beginPath(); c.arc(e.x, e.y, 7 * px, 0, 2 * Math.PI); c.setLineDash([3 * px, 2 * px]); c.lineWidth = 1.8 * px; c.strokeStyle = '#ffd678'; c.stroke(); c.setLineDash([]); }
  }
  const r = rsel && visibleRoutes().find(v => v.id === rsel); if (!r) return;
  const via = act && act.k === 'rbend' && act.id === r.id ? act.via : r.via || [];
  for (const p of via) { c.beginPath(); c.arc(p[0], p[1], 4.2 * px, 0, 2 * Math.PI); c.fillStyle = '#fff4d6'; c.fill(); c.lineWidth = 1.5 * px; c.strokeStyle = '#2a2116'; c.stroke(); }
}
function liveRoute() {                              // what the canvas shows instead of the stored line: a bend in progress, or a route being laid
  if (act && act.k === 'rbend') return { id: act.id, geo: act.geo };
  if (mode === 'route' && rpend != null && cursor) {
    const b = endAt(cursor[0], cursor[1]); if (b == null) return null;
    const key = JSON.stringify([rcls, rpend, typeof b === 'string' ? b : hexAt(b[0], b[1]), RT_EPOCH]);
    if (!rprev || rprev.key !== key) { ensureRoutes(); rprev = { key, geo: routeGeom({ t: 'road', cls: rcls, a: rpend, b, via: [] }) }; }
    return { id: null, t: 'road', cls: rcls, geo: rprev.geo };
  }
  return null;
}

