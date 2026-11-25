// ---------- tools ----------
let mode = 'view', bcode = 'g', bsize = 2, rtool = 'draw', rkind = 'river', rsize = 1, ckind = 'city';
let act = null, pinch = null, riv = null, sel = null, editBase = null, spaceDown = false, overMap = false;
let editable = false;                              // tools unlock once the saved edits have loaded (or the page has no store)
const undoS = [], redoS = [];
function brush(h, size) {
  const seen = new Set([h]); let ring = [h];
  for (let r = 1; r < size; r++) { const nxt = []; for (const u of ring) for (let j = 0; j < 6; j++) { const v = NB[u * 6 + j]; if (v >= 0 && !seen.has(v)) { seen.add(v); nxt.push(v); } } ring = nxt; }
  return [...seen];
}
const chipColor = b => b === 'S' ? '#2c4a64' : b === 'L' ? '#4a7692' : b === 'i' ? '#4e7688' : 'rgb(' + RCOL[b].join(',') + ')';
const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const r1 = v => Math.round(v * 10) / 10;

// every change is an operation that can be done and undone; doing one again over the same state changes nothing
function applyOp(op, dir, fx) {
  if (op.k === 't') {
    for (const [i, c0, c1] of op.ch) {
      const before = eff(i); setCell(i, dir > 0 ? c1 : c0);
      if (isW(before) !== isW(eff(i))) fx.flip = true; fx.hexes.push(i);
    }
    fx.docs.add('terrain');
  } else if (op.k === 'rh') {                       // stretches of the map's rivers hidden (on) or shown again (off)
    for (const key of op.on) { setPair(key, dir > 0); fx.hexes.push(key % N); }
    for (const key of op.off) { setPair(key, dir < 0); fx.hexes.push(key % N); }
    fx.docs.add('terrain');
  } else if (op.k === 'r+' || op.k === 'r-') {
    const add = (op.k === 'r+') === (dir > 0);
    if (add) addRiver(op.r, op.at); else removeRiver(op.r.id);
    fx.rivers.push(op.r); fx.docs.add('rivers');
  } else if (op.k === 'c+' || op.k === 'c-') {
    const add = (op.k === 'c+') === (dir > 0);
    if (add) addCity(op.c, op.at); else removeCity(op.c.id);
    fx.docs.add('cities');
  } else if (op.k === 'c~') {
    const c = ownCity(op.id); if (c) Object.assign(c, dir > 0 ? op.b : op.a); fx.docs.add('cities');
  } else if (op.k === 'bh+' || op.k === 'bh-') {
    if ((op.k === 'bh+') === (dir > 0)) ED.bhid.add(op.id); else ED.bhid.delete(op.id);
    fx.docs.add('cities');
  } else if (op.k === 'lb') {                       // a map label as the user has it (null: the page's own, or none for a label of the user's)
    const o = dir > 0 ? op.b : op.a;
    if (o) ED.labels.set(op.id, { ...o }); else ED.labels.delete(op.id);
    fx.docs.add('marks');
  } else if (op.k === 'lh+' || op.k === 'lh-') {   // one of the page's own labels removed, or brought back
    if ((op.k === 'lh+') === (dir > 0)) ED.lhid.add(op.id); else ED.lhid.delete(op.id);
    fx.docs.add('marks');
  } else if (op.k === 'rt') {                       // a road or trade route as the user has it (null: the page's own road, or none)
    const o = dir > 0 ? op.b : op.a;
    if (o) ED.routes.set(op.id, { ...o, via: (o.via || []).map(p => [p[0], p[1]]) }); else ED.routes.delete(op.id);
    fx.docs.add('routes');
  } else if (op.k === 'rth+' || op.k === 'rth-') { // one of the page's own roads removed, or brought back
    if ((op.k === 'rth+') === (dir > 0)) ED.rthid.add(op.id); else ED.rthid.delete(op.id);
    fx.docs.add('routes');
  } else if (op.k === 'pt') {                       // a lore point as the user has it (null: the page's own, or none)
    const o = dir > 0 ? op.b : op.a;
    if (o) ED.points.set(op.id, { ...o }); else ED.points.delete(op.id);
    fx.hexes.push(...refreshPTF(op.id)); fx.docs.add('info'); fx.info = true;
  } else if (op.k === 'ph+' || op.k === 'ph-') {
    if ((op.k === 'ph+') === (dir > 0)) ED.phid.add(op.id); else ED.phid.delete(op.id);
    fx.hexes.push(...refreshPTF(op.id)); fx.docs.add('info'); fx.info = true;
  } else if (op.k === 'zi' || op.k === 'bi' || op.k === 'ki') {   // the user's text for a zone, a kind of ground or a kind of point
    const o = dir > 0 ? op.b : op.a, m = INFO[op.k].map();
    if (o) m.set(op.key, { ...o }); else m.delete(op.key);
    fx.docs.add('info'); fx.info = true;
  } else if (op.k === 'tl') {                       // a trade line as the user has it (null: the page's own line, or none)
    const o = dir > 0 ? op.b : op.a;
    if (o) ED.tlinks.set(op.id, { ...o, via: (o.via || []).map(p => [p[0], p[1]]) }); else ED.tlinks.delete(op.id);
    fx.docs.add('trade');
  } else if (op.k === 'tlh+' || op.k === 'tlh-') { // one of the page's own trade lines removed, or brought back
    if ((op.k === 'tlh+') === (dir > 0)) ED.tlhid.add(op.id); else ED.tlhid.delete(op.id);
    fx.docs.add('trade');
  } else if (op.k === 'hub') {                      // a city's rank as a centre, 0 to 3; null: as its kind gives
    const o = dir > 0 ? op.b : op.a;
    if (o == null) ED.hubs.delete(op.id); else ED.hubs.set(op.id, o);
    fx.docs.add('trade');
  } else if (op.k === 'tpar') {                     // the centre a city sends its goods to; null: the nearest above it
    const o = dir > 0 ? op.b : op.a;
    if (o == null) ED.tparent.delete(op.id); else ED.tparent.set(op.id, o);
    fx.docs.add('trade');
  } else if (op.k === 'st') {                       // Mount Stanther's great peak to another hex (null: its first place)
    const before = stPeak(); setStan(dir > 0 ? op.b : op.a);
    fx.rects.push(stanRect(before), stanRect(stPeak()), stanRect(D.stpeak)); fx.docs.add('marks'); fx.stan = true;
  } else if (op.k === 'm') {
    for (const o of dir > 0 ? op.ops : op.ops.slice().reverse()) applyOp(o, dir, fx);
  }
}
const newFx = () => ({ docs: new Set(), hexes: [], rivers: [], rects: [], flip: false, info: false });
function settle(fx) {
  if (fx.rivers.length) buildUserSamples();
  if (fx.hexes.length > 4000 || fx.rivers.length > 6) rebuildAll();
  else {
    if (fx.hexes.length) rebuildHexes(fx.hexes, fx.flip);
    for (const r of fx.rivers) { const bb = bbox(smoothLine(r.pts), (RK[r.kind] || RK.river).w + 3 * R); rebuild(bb[0], bb[1], bb[2], bb[3]); }
    for (const rc of fx.rects) rebuild(rc[0], rc[1], rc[2], rc[3]);
  }
  layerUsed = painted.size > 0 || ED.rivers.length > 0;
  for (const d of fx.docs) scheduleSave(d);
  if (fx.stan || ['terrain', 'rivers', 'cities'].some(d => fx.docs.has(d))) bumpRoutes();   // the ground, the rivers, the cities or the great peak moved: routes are found again
  if (fx.info) infoChanged();
  if (fx.docs.has('trade')) scheduleEcon(20);       // an edit of the network shows at once
  else if (fx.stan || fx.info || ['terrain', 'rivers', 'cities', 'routes'].some(d => fx.docs.has(d))) scheduleEcon();   // the trade follows the map
  updateStats(); requestDraw();
}
function pushOp(op) { undoS.push(op); if (undoS.length > 400) undoS.shift(); redoS.length = 0; updateHistory(); }
function doOp(op) { const fx = newFx(); applyOp(op, 1, fx); pushOp(op); settle(fx); }
function addRiver(r, at) {
  if (ED.rivers.some(x => x.id === r.id)) return;
  const o = { id: r.id, kind: r.kind, pts: r.pts.map(p => [p[0], p[1]]) };
  if (at != null && at >= 0 && at <= ED.rivers.length) ED.rivers.splice(at, 0, o); else ED.rivers.push(o);
  derive(o);
}
function removeRiver(id) { const k = ED.rivers.findIndex(x => x.id === id); if (k >= 0) ED.rivers.splice(k, 1); RDER.delete(id); }
function addCity(c, at) {
  if (ownCity(c.id)) return;
  const o = { id: c.id, name: c.name, kind: c.kind, note: c.note, x: c.x, y: c.y };
  if (at != null && at >= 0 && at <= ED.cities.length) ED.cities.splice(at, 0, o); else ED.cities.push(o);
}
function removeCity(id) { const k = cityIdx(id); if (k >= 0) ED.cities.splice(k, 1); }
function undo() {
  if (riv && riv.pts.length) { riv.pts.pop(); if (!riv.pts.length) riv = null; requestDraw(); return; }
  commitCityEdit(); commitLabelEdit(true); commitInfo(); const op = undoS.pop(); if (!op) return;
  const fx = newFx(); applyOp(op, -1, fx); redoS.push(op); settle(fx); afterHistory();
}
function redo() {
  commitCityEdit(); commitLabelEdit(true); commitInfo(); const op = redoS.pop(); if (!op) return;
  const fx = newFx(); applyOp(op, 1, fx); undoS.push(op); settle(fx); afterHistory();
}
function afterHistory() {
  updateHistory();
  if (sel && !visibleCities().some(c => c.id === sel)) selectCity(null); else refreshForm();
  afterLabels(); afterRoutes();
}
function afterRoutes() {                            // the chosen route and the info card after undo, redo or a load
  if (rsel && !visibleRoutes().some(r => r.id === rsel)) selectRoute(null); else refreshRouteForm();
  if (isel && isel.t === 'pt' && !visiblePoints().some(p => p.id === isel.id)) isel = null;
  if (mode === 'info') renderInfoCard();
}
function afterLabels() {                            // the chosen name after undo, redo or a load: gone, or shown as it is now
  if (!lsel) return;
  if (!visibleLabels().some(l => l.id === lsel)) dropLabelSel(); else { rebaseLabel(); refreshLabelForm(); }
}
function updateHistory() { $('undo').disabled = !editable || (!undoS.length && !(riv && riv.pts.length)); $('redo').disabled = !editable || !redoS.length; }

// terrain brush, and the river eraser
function paintHex(t, changed) {
  const c1 = bcode === 'restore' || bcode === BI[t] ? '.' : bcode;
  if (ED.cells[t] !== c1) {
    if (!act.ch.has(t)) act.ch.set(t, ED.cells[t]);
    const before = eff(t); setCell(t, c1); if (isW(before) !== isW(eff(t))) act.flip = true;
    changed.push(t);
  }
  if (bcode === 'restore' && ED.hide[t]) for (const k of HEXLINES.get(t) || []) hidePair(k * N + t, false, changed);   // the map's own river comes back too
}
function hidePair(key, on, changed) {
  if (HIDK.has(key) === on) return;
  if (!act.pr.has(key)) act.pr.set(key, !on);
  setPair(key, on); changed.push(key % N);
}
// how far the eraser reaches: the thin size takes the line under the pointer, the others a circle of about one and two hexes
const eraseReach = () => rsize === 1 ? Math.max(4 / view.s, 1.2) : rsize === 2 ? R * 1.5 : R * 3;
function eraseHits(x, y, lock) {
  // what an erase at this point takes: for each line of the map's rivers the hexes of its stretches in reach, and the user's rivers in reach
  const rad = eraseReach(), lines = new Map(), users = [], gap = new Map();
  nearSamples(BS, x, y, rad + HWMAX, j => {
    const h = BS.hex[j], d = Math.hypot(BS.x[j] - x, BS.y[j] - y) - BS.hw[j];
    if (h < 0 || d >= rad) return;
    const k = BS.line[j]; let s = lines.get(k); if (!s) lines.set(k, s = new Set()); s.add(h);
    gap.set('b' + k, Math.min(gap.get('b' + k) ?? 1e9, d));
  });
  for (const r of ED.rivers) {
    const d = RDER.get(r.id); if (!d || !hits(d.bb, x - rad, y - rad, x + rad, y + rad)) continue;
    let g = 1e9; for (let i = 0; i < d.q.length - 1; i++) g = Math.min(g, segDist(x, y, d.q[i], d.q[i + 1]) - d.w / 2);
    if (g < rad) { users.push(r.id); gap.set('u' + r.id, g); }
  }
  // the thin size takes one line: the one the stroke is already on, else the nearest; through a confluence
  // the other lines stay, unless the stroke leaves its line and goes on along one of them
  if (rsize === 1 && gap.size) {
    let keep = lock && lock.size ? [...gap.keys()].filter(c => lock.has(c)) : [];
    if (!keep.length) { let best = null, bd = 1e9; for (const [c, d] of gap) if (d < bd) { bd = d; best = c; } keep = [best]; if (lock) lock.add(best); }
    const K = new Set(keep);
    for (const k of [...lines.keys()]) if (!K.has('b' + k)) lines.delete(k);
    for (let i = users.length - 1; i >= 0; i--) if (!K.has('u' + users[i])) users.splice(i, 1);
  }
  return { lines, users };
}
function eraseAt(x, y, changed) {
  const { lines, users } = eraseHits(x, y, act.lock);
  for (const [k, hs] of lines) for (const h of hs) hidePair(k * N + h, true, changed);
  for (const id of users) {
    const r = ED.rivers.find(v => v.id === id), d = RDER.get(id); if (!r || !d) continue;
    act.gone.push({ k: 'r-', r: { id: r.id, kind: r.kind, pts: r.pts }, at: ED.rivers.indexOf(r) });
    removeRiver(id); buildUserSamples(); const bb = bbox(d.q, d.w + 3 * R); rebuild(bb[0], bb[1], bb[2], bb[3]);
  }
}
function strokeTo(mx, my) {
  const erase = act.k === 'erase', step = erase ? Math.max(0.6, Math.min(R * 0.5, eraseReach() * 0.7)) : R * 0.5;
  const a = act.last || [mx, my], dx = mx - a[0], dy = my - a[1], n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / step));
  const changed = [];
  for (let s = act.last ? 1 : 0; s <= n; s++) {
    const x = a[0] + dx * s / n, y = a[1] + dy * s / n;
    if (erase) { eraseAt(x, y, changed); continue; }
    const h = hexAt(x, y);
    if (h >= 0 && h !== act.lastHex) { act.lastHex = h; for (const i of brush(h, bsize)) paintHex(i, changed); }
  }
  act.last = [mx, my];
  if (changed.length) { rebuildHexes(changed, act.flip); act.flip = false; layerUsed = painted.size > 0 || ED.rivers.length > 0; updateStats(); }
  requestDraw();
}
function segDist(x, y, a, b) {
  const vx = b[0] - a[0], vy = b[1] - a[1], L2 = vx * vx + vy * vy, t = L2 ? Math.max(0, Math.min(1, ((x - a[0]) * vx + (y - a[1]) * vy) / L2)) : 0;
  return Math.hypot(x - a[0] - t * vx, y - a[1] - t * vy);
}
function endStroke(cancel) {
  const ch = [...act.ch].map(([i, c0]) => [i, c0, ED.cells[i]]).filter(x => x[1] !== x[2]);
  const on = [], off = [];
  for (const [key, was] of act.pr) { const now = HIDK.has(key); if (now !== was) (now ? on : off).push(key); }
  const ops = [];
  if (ch.length) ops.push({ k: 't', ch });
  if (on.length || off.length) ops.push({ k: 'rh', on, off });
  ops.push(...act.gone);
  if (!ops.length) return;
  if (cancel) { const fx = newFx(); applyOp({ k: 'm', ops }, -1, fx); settle(fx); return; }
  pushOp(ops.length === 1 ? ops[0] : { k: 'm', ops });
  bumpRoutes();
  if (ch.length || on.length || off.length) scheduleSave('terrain');
  if (act.gone.length) scheduleSave('rivers');
  updateStats();
}

// river pen
function finishRiver() {
  if (!riv) return;
  const pts = [];
  for (const p of riv.pts) if (!pts.length || Math.hypot(p[0] - pts[pts.length - 1][0], p[1] - pts[pts.length - 1][1]) >= 1.5) pts.push([r1(p[0]), r1(p[1])]);
  const kind = riv.kind; riv = null;
  if (pts.length >= 2) { const ops = riverJoin(pts, kind); doOp(ops.length > 1 ? { k: 'm', ops } : ops[0]); }
  updateHistory(); requestDraw();
}
// v0.18.5, the owner's ask: rivers drawn to meet join up, and a river drawn over an older one takes its place along the stretch it
// covers. The river drawn last is the one that stays: where it runs along an older river of the user's for at least JOIN_RUN, that
// stretch of the older one goes and what is left of it is joined to the new one at the cut; a stretch of the map's own river under
// it is hidden the way the eraser hides one. A new end close to a river (JOIN_SNAP on screen) is put on that river; close to the end
// of a river of the same kind, the two become one line. A river that only crosses another is left alone. Distances are Claude's.
const JOIN_SNAP = 12, JOIN_RUN = 1.2;
function denseOf(pts, step) {
  const out = []; for (let i = 0; i + 1 < pts.length; i++) { const a = pts[i], b = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step)); for (let s = 0; s < n; s++) out.push([a[0] + (b[0] - a[0]) * s / n, a[1] + (b[1] - a[1]) * s / n]); }
  if (pts.length) out.push([pts[pts.length - 1][0], pts[pts.length - 1][1]]); return out;
}
function nearGrid(ps) {                              // points by cells of 4 units, for the nearest point and its distance
  const g = new Map(); ps.forEach((p, i) => { const k = Math.floor(p[0] / 4) * 8192 + Math.floor(p[1] / 4); let c = g.get(k); if (!c) g.set(k, c = []); c.push(i); });
  return (x, y, lim) => { let bd = lim, bi = -1; const r = Math.ceil(lim / 4); for (let gx = Math.floor(x / 4) - r; gx <= Math.floor(x / 4) + r; gx++) for (let gy = Math.floor(y / 4) - r; gy <= Math.floor(y / 4) + r; gy++) { const c = g.get(gx * 8192 + gy); if (c) for (const i of c) { const d = Math.hypot(ps[i][0] - x, ps[i][1] - y); if (d < bd) { bd = d; bi = i; } } } return bi < 0 ? null : { i: bi, d: bd, p: ps[bi] }; };
}
const thin = ps => { const o = []; for (const p of ps) if (!o.length || Math.hypot(p[0] - o[o.length - 1][0], p[1] - o[o.length - 1][1]) >= 1.5) o.push([r1(p[0]), r1(p[1])]); if (ps.length && o.length) { const e = ps[ps.length - 1]; o[o.length - 1] = [r1(e[0]), r1(e[1])]; } return o; };
function riverJoin(pts0, kind) {
  const W = (RK[kind] || RK.river).w, rem = [], add = [], snap = Math.max(2.5, JOIN_SNAP / view.s), minRun = JOIN_RUN * R;
  let pts = pts0.map(p => [p[0], p[1]]); const gone = new Set(); let merged = 0, cut = 0;
  // the ends: onto a river close by; onto the end of one of the same kind, as one line
  const lines = [];                                  // every river now shown, as points: the user's (with their ends) and the map's
  for (const U of ED.rivers) { const d = RDER.get(U.id); if (d) lines.push({ U, q: d.q }); }
  for (const r of BRIV) for (const u of riverRuns(r)) lines.push({ U: null, q: u.q });
  const endSnap = (p, first) => {
    let best = null;
    for (const L of lines) {
      if (L.U && gone.has(L.U.id)) continue;
      if (L.U && L.U.kind === kind) for (const [e, atStart] of [[L.U.pts[0], true], [L.U.pts[L.U.pts.length - 1], false]]) { const d = Math.hypot(e[0] - p[0], e[1] - p[1]); if (d <= snap && (!best || d < best.d - 0.01 || !best.U)) best = { d, p: e, U: L.U, atStart }; }
      for (const q of L.q) { const d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d <= snap && (!best || d < best.d - 0.5)) best = { d, p: q }; }
    }
    if (!best) return;
    if (best.U) {                                    // the two become one: the old line, then the new
      const U = best.U, up = U.pts.map(q => [q[0], q[1]]); gone.add(U.id); merged++;
      rem.push(U);
      if (first) pts = (best.atStart ? up.reverse() : up).concat(pts.slice(1));
      else pts = pts.slice(0, -1).concat(best.atStart ? up : up.reverse());
    } else { if (first) pts[0] = [best.p[0], best.p[1]]; else pts[pts.length - 1] = [best.p[0], best.p[1]]; merged++; }
  };
  endSnap(pts[0], true); endSnap(pts[pts.length - 1], false);
  // the stretches the new river runs along
  const dense = denseOf(smoothLine(pts), 0.6), near = nearGrid(dense);
  const runsOf = (ps, covered) => {                  // the covered stretches long enough to count, as [from, to] in ps
    const out = []; let a = -1;
    for (let i = 0; i <= ps.length; i++) { const on = i < ps.length && covered[i]; if (on && a < 0) a = i; if (!on && a >= 0) { let len = 0; for (let k = a; k < i - 1; k++) len += Math.hypot(ps[k + 1][0] - ps[k][0], ps[k + 1][1] - ps[k][1]); if (len >= minRun) out.push([a, i - 1]); a = -1; } }
    return out;
  };
  const order = ED.rivers.map((U, at) => ({ U, at })).filter(x => !gone.has(x.U.id)).sort((x, y) => y.at - x.at);   // last first: the places stay right
  for (const { U, at } of order) {
    const ovR = (W + (RK[U.kind] || RK.river).w) / 2 + 0.9, ps = denseOf(U.pts, 0.8), cov = ps.map(p => !!near(p[0], p[1], ovR)), runs = runsOf(ps, cov);
    if (!runs.length) continue;
    const off = new Uint8Array(ps.length); for (const [a, b] of runs) for (let i = a; i <= b; i++) off[i] = 1;
    rem.push(U); cut++;
    let cur = [], cutBefore = false;
    const flush = cutAfter => {
      if (cur.length) {
        const piece = cur.slice();
        if (cutBefore) { const m = near(piece[0][0], piece[0][1], 1e3); if (m) piece.unshift(m.p); }
        if (cutAfter) { const m = near(piece[piece.length - 1][0], piece[piece.length - 1][1], 1e3); if (m) piece.push(m.p); }
        const t = thin(piece); if (t.length >= 2) add.push({ k: 'r+', r: { id: uid('r'), kind: U.kind, pts: t } });
      }
      cur = [];
    };
    for (let i = 0; i < ps.length; i++) { if (off[i]) { if (cur.length) flush(true); cutBefore = true; continue; } cur.push(ps[i]); }
    flush(false);
  }
  // the map's own rivers under the new one: their stretches hidden hex by hex, as the eraser does
  const hide = new Set();
  BRIV.forEach((r, k) => {
    if (!hits(r.bb, ...bbox(dense, 6))) return;
    const ovR = (W + r.w) / 2 + 0.9, idx = [], ps = [];
    for (let j = r.s0; j < r.s1; j++) if (!sampleOff(j)) { idx.push(j); ps.push([BS.x[j], BS.y[j]]); }
    const cov = ps.map(p => !!near(p[0], p[1], ovR));
    for (const [a, b] of runsOf(ps, cov)) for (let i = a; i <= b; i++) { const h = BS.hex[idx[i]]; if (h >= 0) hide.add(k * N + h); }
  });
  const ops = rem.map(U => ({ U, at: ED.rivers.indexOf(U) })).sort((x, y) => y.at - x.at).map(({ U, at }) => ({ k: 'r-', r: { id: U.id, kind: U.kind, pts: U.pts }, at }));   // the highest place first, so each place holds
  ops.push(...add);
  if (hide.size) { const on = [...hide].filter(key => !HIDK.has(key)); if (on.length) { ops.push({ k: 'rh', on, off: [] }); cut++; } }
  ops.push({ k: 'r+', r: { id: uid('r'), kind, pts: thin(pts) } });
  if (cut) flash('แม่น้ำที่วาดใหม่แทนที่ช่วงที่วาดทับแล้ว'); else if (merged) flash('เชื่อมกับแม่น้ำเดิมแล้ว');
  return ops;
}
function cancelRiver() { riv = null; updateHistory(); requestDraw(); }

// cities
function cityAt(mx, my) {                         // the marker first, then the name above it
  if (!citiesShown()) return null;
  let best = null, bd = (12 / view.s) ** 2;
  const all = visibleCities();
  for (const v of all) { const d = (v.x - mx) ** 2 + (v.y - my) ** 2; if (d < bd) { bd = d; best = v; } }
  if (best) return best;
  for (const v of all) { const b = LBL.get(v.id); if (b && mx >= b[0] && mx <= b[2] && my >= b[1] && my <= b[3]) return v; }
  return null;
}
const fieldsOf = c => ({ name: c.name, kind: c.kind, note: c.note, x: c.x, y: c.y });
const sameFields = (a, b) => a.name === b.name && a.kind === b.kind && a.note === b.note && a.x === b.x && a.y === b.y;
function makeOverride(id) {
  const b = D.cities.find(c => c.id === id); if (!b) return null;
  const o = { id, name: b.name, kind: b.kind || 'city', note: b.note, x: b.x, y: b.y };
  doOp({ k: 'c+', c: o }); return ownCity(id);
}
function selectCity(id) {
  commitCityEdit(); sel = id || null; editBase = null;
  const v = sel && visibleCities().find(c => c.id === sel);
  if (!v) sel = null;
  $('cityNew').classList.toggle('pane-off', !!sel); $('cityForm').classList.toggle('pane-off', !sel);
  if (sel) refreshForm();
  requestDraw();
}
function refreshForm() {
  if (!sel) return;
  const v = visibleCities().find(c => c.id === sel); if (!v) return;
  $('cfName').value = v.name || ''; $('cfKind').value = CK[v.kind] ? v.kind : 'city'; $('cfNote').value = v.note || '';
  $('cfHint').textContent = isBuiltin(sel) ? 'เมืองนี้มากับแผนที่ ย้ายหรือแก้ได้ ค่าที่แก้จะใช้แทนค่าเดิม' : '';
  const own = ownCity(sel); editBase = own ? fieldsOf(own) : null;
}
function cityInput() {
  if (!sel || !editable) return;
  let c = ownCity(sel);
  if (!c) { c = makeOverride(sel); if (!c) return; editBase = fieldsOf(c); }
  c.name = $('cfName').value.slice(0, 60); c.kind = CK[$('cfKind').value] ? $('cfKind').value : 'city'; c.note = $('cfNote').value.slice(0, 600);
  scheduleSave('cities'); requestDraw();
}
function commitCityEdit() {
  if (!sel || !editBase) return;
  const c = ownCity(sel); if (!c) { editBase = null; return; }
  const now = fieldsOf(c); if (!sameFields(now, editBase)) pushOp({ k: 'c~', id: sel, a: editBase, b: now });
  editBase = now;
}
// Mount Stanther to another hex: the great peak, the city on its summit and its name move as one, in one step of undo
function moveStanther(H) {
  const P0 = stPeak(); if (H < 0 || H === P0) return;
  if (isW(eff(H))) { flash('วางภูเขาลงในน้ำไม่ได้'); return; }
  const dx = CX[H] - CX[P0], dy = CY[H] - CY[P0], ops = [{ k: 'st', a: ED.stan, b: H === D.stpeak ? null : H }];
  if (!ED.bhid.has('stanther')) {
    const own = ownCity('stanther'), b0 = D.cities.find(c => c.id === 'stanther');
    if (own) ops.push({ k: 'c~', id: 'stanther', a: { x: own.x, y: own.y }, b: { x: r1(own.x + dx), y: r1(own.y + dy) } });
    else if (b0) ops.push({ k: 'c+', c: { id: 'stanther', name: b0.name, kind: b0.kind || 'city', note: b0.note, x: r1(b0.x + dx), y: r1(b0.y + dy) } });
  }
  const L = visibleLabels().find(l => l.id === 'stanther');
  if (L) { const now = ED.labels.get('stanther'); ops.push({ k: 'lb', id: 'stanther', a: now ? { ...now } : null, b: { ...plainLabel(L), x: r1(L.x + dx), y: r1(L.y + dy) } }); }
  doOp({ k: 'm', ops });
  if (sel === 'stanther') refreshForm();
  if (lsel === 'stanther') { rebaseLabel(); refreshLabelForm(); }
}
// place names: chosen, edited and removed like cities; the page's own names too.
// An edit runs on the user's own copy of the name; it becomes one step of undo when the field is left (or the name let go)
let lsel = null, leditBase = null, lfresh = false, lsize = 'mid';
const sameLabel = (a, b) => ['text', 'x', 'y', 'size', 'ang', 'color'].every(k => a[k] === b[k]);
function rebaseLabel() { const own = lsel && ED.labels.get(lsel); leditBase = own ? { ...own } : null; lfresh = false; }
function selectLabel(id) {
  commitLabelEdit();
  lsel = id && visibleLabels().some(l => l.id === id) ? id : null;
  rebaseLabel();
  $('labelNew').classList.toggle('pane-off', !!lsel); $('labelForm').classList.toggle('pane-off', !lsel);
  if (lsel) refreshLabelForm();
  requestDraw();
}
function dropLabelSel() { lsel = null; leditBase = null; lfresh = false; selectLabel(null); }   // the chosen name is gone: let it go without committing
function refreshLabelForm() {
  if (!lsel) return;
  const v = visibleLabels().find(l => l.id === lsel); if (!v) return;
  $('lfText').value = v.text || ''; $('lfSize').value = v.size; $('lfAng').value = String(v.ang); $('lfAngV').textContent = v.ang + '°';
  for (const b of document.querySelectorAll('#lfColor button')) b.setAttribute('aria-pressed', String(b.dataset.c === v.color));
  $('lfHint').textContent = baseLabel(lsel) ? 'ชื่อนี้มากับแผนที่ แก้ ย้าย หรือลบได้ ค่าที่แก้จะใช้แทนค่าเดิม' : 'ชื่อที่ใส่เพิ่ม ล้างข้อความจนว่างแล้วกด Enter ก็ลบชื่อนี้ได้';
}
function labelEdit(patch) {
  if (!lsel || !editable) return;
  let o = ED.labels.get(lsel);
  if (!o) { const L = baseLabel(lsel); if (!L) return; o = labelOf(L); ED.labels.set(lsel, o); lfresh = true; }   // the first change to one of the page's names
  Object.assign(o, patch);
  scheduleSave('marks'); updateStats(); requestDraw();
}
function commitLabelEdit(quiet) {
  if (!lsel) return;
  const id = lsel, o = ED.labels.get(id);
  if (!o || (!lfresh && !leditBase)) { rebaseLabel(); return; }
  const was = lfresh ? null : leditBase;            // the name as it stood before this edit (null: the page's own)
  lfresh = false; leditBase = { ...o };
  if (!String(o.text || '').trim()) {               // a name emptied out is a name removed, in one step of undo
    if (was) ED.labels.set(id, { ...was }); else ED.labels.delete(id);
    const ops = [];
    if (was) ops.push({ k: 'lb', id, a: { ...was }, b: null });
    if (baseLabel(id)) ops.push({ k: 'lh+', id });
    lsel = null; leditBase = null;
    $('labelNew').classList.remove('pane-off'); $('labelForm').classList.add('pane-off');
    if (ops.length) doOp(ops.length === 1 ? ops[0] : { k: 'm', ops }); else { scheduleSave('marks'); updateStats(); requestDraw(); }
    if (!quiet) flash('ลบชื่อที่ว่างแล้ว กดย้อนเพื่อเอาคืน');
    return;
  }
  if (!was || !sameLabel(o, was)) pushOp({ k: 'lb', id, a: was ? { ...was } : null, b: { ...o } });
}
function deleteLabel() {
  if (!lsel || !editable) return;
  commitLabelEdit();
  if (!lsel) return;                                // an emptied name is already gone
  const id = lsel, own = ED.labels.get(id), ops = [];
  if (own) ops.push({ k: 'lb', id, a: { ...own }, b: null });
  if (baseLabel(id)) ops.push({ k: 'lh+', id });
  selectLabel(null);
  if (ops.length) doOp(ops.length === 1 ? ops[0] : { k: 'm', ops });
  flash('ลบชื่อแล้ว กดย้อนเพื่อเอาคืน');
}
function newLabelId() { let id; do id = uid('n'); while (baseLabel(id) || ED.labels.has(id)); return id; }
function deleteCity() {
  if (!sel || !editable) return;
  commitCityEdit();
  const id = sel, own = ownCity(id), ops = [];
  for (const [rid, r] of ED.routes) if (!baseRoad(rid) && (r.a === id || r.b === id)) ops.push({ k: 'rt', id: rid, a: { ...r }, b: null });
  for (const [lid, o] of ED.tlinks) if (o.a === id || o.b === id) ops.push({ k: 'tl', id: lid, a: { ...o }, b: null });
  if (ED.hubs.has(id)) ops.push({ k: 'hub', id, a: ED.hubs.get(id), b: null });
  for (const [cid, pid] of ED.tparent) if (cid === id || pid === id) ops.push({ k: 'tpar', id: cid, a: pid, b: null });
  if (own) ops.push({ k: 'c-', c: { ...own }, at: cityIdx(id) });
  if (isBuiltin(id)) ops.push({ k: 'bh+', id });
  selectCity(null);
  if (ops.length) doOp(ops.length === 1 ? ops[0] : { k: 'm', ops });
  flash('ลบเมืองแล้ว กดย้อนเพื่อเอาคืน');
}

