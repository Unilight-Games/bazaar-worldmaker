// ---------- the engine's additions ----------
// moving the view with the keys: a steady glide while a key is held
function panStep(now) {
  panRaf = 0; if (!panKeys.size) return;
  const dt = Math.min(50, now - (panT || now)); panT = now;
  const v = (panFast ? 1.5 : 0.75) * dt, x0 = view.x, y0 = view.y;
  view.x += ((panKeys.has('l') ? 1 : 0) - (panKeys.has('r') ? 1 : 0)) * v; view.y += ((panKeys.has('u') ? 1 : 0) - (panKeys.has('d') ? 1 : 0)) * v;
  clampView();
  if (view.x === x0 && view.y === y0 && view.s <= fitS * 1.001 && !panHint) { panHint = true; flash('ซูมเข้าก่อน แล้วใช้ปุ่มลูกศรหรือ W A S D เลื่อนแผนที่'); }
  requestDraw(); panRaf = requestAnimationFrame(panStep);
}
function panKick() { if (!panRaf) { panT = 0; panRaf = requestAnimationFrame(panStep); } }

// the terrain as changed by someone else in the room: only the hexes that differ are repainted
function softTerrain(body) {
  if (!body || typeof body.cells !== 'string' || body.cells.length !== N) return false;
  if (JSON.stringify(body.rivOff || []) !== JSON.stringify(serial('terrain').rivOff)) return false;
  const ch = []; for (let i = 0; i < N; i++) { const c1 = body.cells[i], c = c1 !== '.' && CODES.includes(c1) && c1 !== BI[i] ? c1 : '.'; if (ED.cells[i] !== c) ch.push([i, c]); }
  if (ch.length > 2500) return false;
  let flip = false; const ids = [];
  for (const [i, c1] of ch) { const before = eff(i); setCell(i, c1); if (isW(before) !== isW(eff(i))) flip = true; ids.push(i); }
  if (ids.length) { rebuildHexes(ids, flip); layerUsed = painted.size > 0 || ED.rivers.length > 0; bumpRoutes(); scheduleEcon(); updateStats(); requestDraw(); }
  return true;
}

// the others in the room, where their pointers are
let PEERS = [], curT = 0;
cv.addEventListener('pointermove', e => { if (!ENV.room) return; const now = performance.now(); if (now - curT < 170) return; curT = now; const [mx, my] = toMap(e.clientX, e.clientY); ENV.room.cursor(mx, my); });
function drawPeers() {
  if (!PEERS.length) return;
  ctx.setTransform(dpr * view.s, 0, 0, dpr * view.s, dpr * view.x, dpr * view.y);
  const px = 1 / view.s;
  for (const p of PEERS) {
    const col = /^#[0-9a-f]{6}$/i.test(p.color) ? p.color : '#e8b04a';
    ctx.beginPath(); ctx.arc(p.x, p.y, 7 * px, 0, 2 * Math.PI); ctx.lineWidth = 4.5 * px; ctx.strokeStyle = 'rgba(15,17,20,.8)'; ctx.stroke(); ctx.lineWidth = 2.2 * px; ctx.strokeStyle = col; ctx.stroke();
    ctx.beginPath(); ctx.arc(p.x, p.y, 2 * px, 0, 2 * Math.PI); ctx.fillStyle = col; ctx.fill();
    ctx.font = `600 ${12 * px}px 'Noto Sans Thai', sans-serif`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 3.5 * px; ctx.strokeStyle = 'rgba(15,17,20,.9)'; ctx.strokeText(p.name, p.x + 11 * px, p.y - 11 * px); ctx.fillStyle = col; ctx.fillText(p.name, p.x + 11 * px, p.y - 11 * px);
  }
}
// the scale: one hex centre to the next is the map's distance for a hex
let scaleKey = '';
function drawScale() {
  const el = $('scalebar'); if (!el) return;
  const kmU = (ENV.meta && ENV.meta.kmPerHex || 10) / DY, target = 120 / view.s * kmU;
  const p = Math.pow(10, Math.floor(Math.log10(target))), m = target / p, nice = (m >= 5 ? 5 : m >= 2 ? 2 : 1) * p, w = Math.round(nice / kmU * view.s);
  const key = nice + ':' + w; if (key === scaleKey) return; scaleKey = key;
  el.firstChild.textContent = (nice >= 1 ? nice.toLocaleString('en-US') : String(+nice.toPrecision(2))) + ' กม.'; el.lastChild.style.width = w + 'px';
}
const __drawBase = draw;
draw = function () { __drawBase(); drawPeers(); drawScale(); };

// mountains and rivers laid by rule on the ground as it stands (gen.js); each is one step of undo
const groundNow = () => { const a = new Array(N); for (let i = 0; i < N; i++) a[i] = eff(i); return a; };
$('autoMt').onclick = () => {
  if (!editable) return;
  const keep = new Set(); for (const ct of visibleCities()) { const h = hexAt(ct.x, ct.y); if (h >= 0) keep.add(h); }
  const ids = MME.autoMountains(G, groundNow(), { seed: (Math.random() * 1e9) | 0, amount: +$('autoMtAmt').value / 100, keep });
  const ch = ids.filter(i => eff(i) !== 'M').map(i => [i, ED.cells[i], BI[i] === 'M' ? '.' : 'M']);
  if (!ch.length) { flash('ยังไม่มีแผ่นดินที่กว้างพอจะตั้งเทือกเขา ระบายแผ่นดินให้ห่างฝั่งอย่างน้อยสองช่องก่อน'); return; }
  doOp({ k: 't', ch }); flash(`วางเทือกเขา ${ch.length} ช่อง ถ้าไม่ถูกใจกดย้อนแล้ววางใหม่ได้`);
};
$('autoRiv').onclick = () => {
  if (!editable) return;
  const blocked = new Set(URVH); for (let i = 0; i < N; i++) if (RV[i] !== '0' && shownAt(i)) blocked.add(i);
  const res = MME.autoRivers(G, groundNow(), { seed: (Math.random() * 1e9) | 0, density: +$('autoRivAmt').value, blocked });
  const list = res.rivers.slice(0, 2400 - ED.rivers.length);
  if (!list.length) { flash(res.why || 'ไม่มีลุ่มน้ำที่ควรมีแม่น้ำเพิ่ม ลองวางภูเขาก่อน หรือเพิ่มจำนวนแม่น้ำ'); return; }
  const ops = list.map(r => ({ k: 'r+', r: { id: uid('r'), kind: r.kind, pts: r.pts } }));
  doOp(ops.length === 1 ? ops[0] : { k: 'm', ops }); flash(`วางแม่น้ำ ${ops.length} สาย ถ้าไม่ถูกใจกดย้อนแล้ววางใหม่ได้`);
};
document.querySelector('section.method').hidden = !(D.method && D.method.length);


