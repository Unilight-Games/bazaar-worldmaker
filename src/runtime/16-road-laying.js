// ---------- laying roads ----------
let rcls = 'royal', rsel = null, rpend = null, rprev = null;
const ROADS_OF = id => visibleRoutes().filter(r => r.a === id || r.b === id);
function endAt(mx, my) {                            // a city under the pointer, or the spot itself on land
  const c = cityAt(mx, my); if (c) return c.id;
  const h = hexAt(mx, my); if (h < 0 || isW(eff(h))) return null;
  return [r1(mx), r1(my)];
}
function makeRoute(cls, a, b) { return { id: uid('d'), t: 'road', cls, a, b, via: [] }; }
function selectRoute(id) {
  rsel = id || null; rpend = null; rprev = null;
  if (rsel && !visibleRoutes().some(r => r.id === rsel)) rsel = null;
  $('routeNew').classList.toggle('pane-off', !!rsel); $('routeForm').classList.toggle('pane-off', !rsel);
  refreshRouteForm(); requestDraw();
}
function refreshRouteForm() {
  if (!rsel) return;
  const r = visibleRoutes().find(v => v.id === rsel); if (!r) return;
  const g = geoOf(r);
  let t = `${routeName(r)} จาก${endName(r.a)} ถึง${endName(r.b)}`;
  if (g && !g.fail) t += ` · ยาว ${g.len} ช่อง` + (g.bridges.length ? ` · สะพาน ${g.bridges.length}` : '') + (g.tunnels ? ` · อุโมงค์ ${g.tunnels}` : '');
  else t += ' · หาทางไม่ได้';
  $('rfInfo').textContent = t;
  $('rfCls').innerHTML = Object.entries(RDC).map(([k, v]) => `<button type="button" data-k="${k}" aria-pressed="${k === r.cls}">${esc(v.name)}</button>`).join('');
  for (const b of document.querySelectorAll('#rfCls button')) b.onclick = () => changeRoute(r.id, { cls: b.dataset.k });
  $('rfFlat').disabled = !(r.via && r.via.length);
}
function changeRoute(id, patch) {                   // one step of undo: the route as it was (null: the page's own road) and as it is now
  const r = visibleRoutes().find(v => v.id === id); if (!r || !editable) return;
  const own = ED.routes.get(id);
  doOp({ k: 'rt', id, a: own ? { ...own } : null, b: { ...plainRoute(r), ...patch } });
  refreshRouteForm();
}
function deleteRoute(id) {
  const own = ED.routes.get(id), ops = [];
  if (own) ops.push({ k: 'rt', id, a: { ...own }, b: null });
  if (baseRoad(id)) ops.push({ k: 'rth+', id });
  if (!ops.length) return;
  if (rsel === id) selectRoute(null);
  doOp(ops.length === 1 ? ops[0] : { k: 'm', ops });
  flash('ลบเส้นแล้ว กดย้อนเพื่อเอาคืน');
}
// a new city's road to its nearest city, and roads for every city that has none
function autoRoad(c) {
  const h = landHex(hexAt(c.x, c.y)); if (h < 0) return null;
  ensureRoutes();
  const n = nearestCity(h, c.id); if (!n) return null;
  const o = cityById(n.id), id = uid('d');
  return { k: 'rt', id, a: null, b: { id, t: 'road', cls: autoCls(c.kind, o ? o.kind : 'city'), a: c.id, b: n.id, via: [] } };
}
function connectLoose(quiet) {
  if (!editable) return 0;
  ensureRoutes();
  const has = new Set(); for (const r of visibleRoutes()) if (r.t === 'road') { if (typeof r.a === 'string') has.add(r.a); if (typeof r.b === 'string') has.add(r.b); }
  const ops = [];
  for (const c of visibleCities()) {
    if (has.has(c.id)) continue;
    const op = autoRoad(c); if (!op) continue;
    ops.push(op); has.add(c.id); has.add(op.b.b);
  }
  if (ops.length) doOp(ops.length === 1 ? ops[0] : { k: 'm', ops });
  if (!quiet) flash(ops.length ? `ต่อถนนให้ ${ops.length} เมืองแล้ว` : 'ทุกเมืองมีถนนแล้ว');
  return ops.length;
}
function setRoadCls(k) {
  rcls = RDC[k] ? k : 'royal'; rpend = null; rprev = null;
  $('rtCls').innerHTML = Object.entries(RDC).map(([q, v]) => `<button type="button" data-k="${q}">${esc(v.name)}</button>`).join('');
  segPick('rtCls', 'k', rcls, setRoadCls);
  $('rtHint').textContent = 'คลิกเมืองต้นทางแล้วคลิกเมืองปลายทาง ถนนจะหาทางที่สั้นที่สุดเอง เลี่ยงภูเขา แม่น้ำใหญ่ และป่าบรรพกาล ถ้าเลี่ยงไม่ได้จะมีอุโมงค์หรือสะพาน คลิกที่ว่างเพื่อเริ่มหรือจบที่จุดนั้น คลิกเส้นที่มีอยู่เพื่อเลือก แล้วลากเส้นเพื่อดัดทาง Esc ยกเลิก เมืองที่วางใหม่ยังไม่มีถนน กดปุ่มต่อถนนเพื่อต่อให้ คาราวานใช้ถนนที่วางไว้' + (rcls === 'rail' ? ' ทางรถไฟวางเองเท่านั้น ไม่มีเมืองไหนได้ทางรถไฟอัตโนมัติ รถไฟขนของและผู้คนถูกกว่าถนนหลวงราวครึ่งหนึ่ง และเลี่ยงทางลาดชันจึงเจาะอุโมงค์และสร้างสะพานบ่อยกว่าถนน' : '');
  requestDraw();
}
function drawnLine(r, g) { return g.q; }
function routeClick(x, y) {
  const c = cityAt(x, y);
  if (!c && rpend == null) { const r = routeAt(x, y); if (r) { selectRoute(r.id); return; } }
  if (rsel) { selectRoute(null); if (!c) return; }   // a click away lets the chosen route go; a click on a city starts a new one at once
  const e = c ? c.id : endAt(x, y);
  if (e == null) { flash('เริ่มหรือจบเส้นในน้ำไม่ได้'); return; }
  if (rpend == null) { rpend = e; rprev = null; requestDraw(); return; }
  if (JSON.stringify(e) === JSON.stringify(rpend)) { rpend = null; rprev = null; requestDraw(); return; }   // the same place twice lets it go
  const route = makeRoute(rcls, rpend, e); rpend = null; rprev = null;
  ensureRoutes(); const g = routeGeom(route);
  if (!g || g.fail) { flash('หาทางระหว่างสองจุดนี้ไม่ได้'); requestDraw(); return; }
  doOp({ k: 'rt', id: route.id, a: null, b: route }); selectRoute(route.id);
}
// bending: a waypoint is put where the line is grabbed, between the stops of the leg it was grabbed on
function legAt(g, x, y) {
  let best = 0, bd = 1e9;
  for (let i = 0; i < g.raw.length - 1; i++) { const d = segDist(x, y, g.raw[i], g.raw[i + 1]); if (d < bd) { bd = d; best = i; } }
  let leg = 0; for (let l = 0; l < g.legs.length; l++) if (best >= g.legs[l]) leg = l;
  return leg;
}
function handleAt(r, mx, my) {
  const lim = Math.max(3, 8 / view.s);
  for (let i = 0; i < (r.via || []).length; i++) if (Math.hypot(r.via[i][0] - mx, r.via[i][1] - my) <= lim) return i;
  return -1;
}
