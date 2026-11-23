// ---------- the trade in motion ----------
// Boats and caravans run along the trade lines, each carrying one category of goods: as many on a line as its loads call for,
// each way in proportion to what goes each way, quicker afloat than on land. Two looks: a spark in the colour of its goods, or a
// little ship or wagon flying a pennant in that colour, the way the trade of EU4 is seen moving on its map. They are drawn on a
// canvas of their own over the map, so the map itself is drawn again only when something on it changes.
const FXSPEED = { water: 9, land: 3.2 };           // map units a second: a ship crosses a hex in about a second and a half, a wagon in four
let fxMode = 'dots', fxSet = null, fxRaf = 0, fxFocus = null;
try {
  const m = localStorage.getItem('gresland-trade-motion');
  if (FXMODES[m]) fxMode = m; else if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) fxMode = 'off';
} catch (err) { /* without storage the motion starts as sparks */ }
const fxRunning = () => fxMode !== 'off' && !!ECON && (showR.water || showR.caravan) && !document.hidden;
function fxBuild() {                                 // the ways of the lines that carry something, and who runs on each
  const E = ECON, lines = [], movers = [];
  let seed = 1234567; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
  E.links.forEach((L, li) => {
    if (L.fail || !L.geo) return;
    const vol = tcat ? L.cats.get(tcat) || 0 : L.vol; if (vol < 0.03) return;
    const P = [], wet = [];                          // the way as one line from the first city to the second
    for (const r of L.geo.runs) for (let i = P.length ? 1 : 0; i < r.q.length; i++) { P.push(r.q[i]); if (P.length > 1) wet.push(r.wet); }
    const n = P.length; if (n < 2) return;
    const T = new Float64Array(n); let len = 0;
    for (let j = 1; j < n; j++) { const d = Math.hypot(P[j][0] - P[j - 1][0], P[j][1] - P[j - 1][1]); len += d; T[j] = T[j - 1] + d / FXSPEED[wet[j - 1] ? 'water' : 'land']; }
    if (len < 2) return;
    const w = { li, P, T, wet, dur: T[n - 1] }; lines.push(w);
    const cnt = Math.max(1, Math.min(12, Math.round(Math.sqrt(vol) * len / 70)));
    const d = tcat ? L.cdir.get(tcat) || [0, 0] : [L.fwd, L.back], nf = Math.round(cnt * (d[0] + d[1] > 0 ? d[0] / (d[0] + d[1]) : 0.5));
    const cats = tcat ? [[tcat, 1]] : [...L.cats].filter(([, v]) => v > 0), sum = cats.reduce((a, [, v]) => a + v, 0);
    for (const [dir, k] of [[1, nf], [-1, cnt - nf]]) for (let i = 0; i < k; i++) {
      let u = rnd() * sum, cat = cats[0][0]; for (const [c, v] of cats) if ((u -= v) <= 0) { cat = c; break; }
      movers.push({ w, dir, t0: (i + 0.7 * rnd()) / k * w.dur, cat, j: 2 * rnd() - 1 });
    }
  });
  return { key: E.ver + '|' + tcat, lines, movers };
}
function fxAt(w, tau) {                              // where a runner is at a time along its way, its heading, and whether afloat
  const T = w.T; let lo = 0, hi = T.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (T[mid] <= tau) lo = mid; else hi = mid; }
  const a = w.P[lo], b = w.P[hi], f = T[hi] > T[lo] ? (tau - T[lo]) / (T[hi] - T[lo]) : 0;
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, Math.atan2(b[1] - a[1], b[0] - a[0]), w.wet[lo]];
}
const hexA = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`; };
const FXSPR = new Map();
function fxSprite(kind, cat) {                       // drawn once for each kind and colour: a spark, a ship, a wagon
  const key = kind + cat; let s = FXSPR.get(key); if (s) return s;
  const col = ECAT[cat] ? ECAT[cat].col : '#ffe9a8';
  s = document.createElement('canvas'); const c = s.getContext('2d');
  if (kind === 'spark') {                           // a dark halo under it, so it shows on a pale line as well as on dark water
    s.width = s.height = 32;
    let g = c.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(10,12,16,.55)'); g.addColorStop(0.55, 'rgba(10,12,16,.22)'); g.addColorStop(1, 'rgba(10,12,16,0)');
    c.fillStyle = g; c.fillRect(0, 0, 32, 32);
    g = c.createRadialGradient(16, 16, 0, 16, 16, 14);
    g.addColorStop(0, 'rgba(255,253,240,1)'); g.addColorStop(0.32, 'rgba(255,248,226,.95)'); g.addColorStop(0.42, col); g.addColorStop(0.7, hexA(col, 0.5)); g.addColorStop(1, hexA(col, 0));
    c.fillStyle = g; c.beginPath(); c.arc(16, 16, 14, 0, 2 * Math.PI); c.fill();
  } else {
    s.width = 64; s.height = 48; c.scale(2, 2); c.lineJoin = 'round'; c.lineCap = 'round';
    c.fillStyle = 'rgba(8,10,14,.38)'; c.beginPath(); c.ellipse(16, 20.5, 13, 2.4, 0, 0, 2 * Math.PI); c.fill();
    if (kind === 'ship') {                           // a merchant ship from the side: hull, mast, one square sail, a pennant
      c.beginPath(); c.moveTo(2.5, 14); c.lineTo(29.5, 14); c.lineTo(25.5, 19.5); c.lineTo(6.5, 19.5); c.closePath();
      c.fillStyle = '#6b4528'; c.fill(); c.strokeStyle = '#1e140b'; c.lineWidth = 1; c.stroke();
      c.beginPath(); c.moveTo(3.5, 15.6); c.lineTo(28.5, 15.6); c.strokeStyle = 'rgba(240,214,160,.55)'; c.lineWidth = 0.7; c.stroke();
      c.beginPath(); c.moveTo(16, 14); c.lineTo(16, 1.6); c.strokeStyle = '#26190e'; c.lineWidth = 1.2; c.stroke();
      c.beginPath(); c.moveTo(9, 3.4); c.quadraticCurveTo(16, 1.8, 23, 3.4); c.lineTo(23, 11.6); c.quadraticCurveTo(16, 10.2, 9, 11.6); c.closePath();
      c.fillStyle = '#f1e7cc'; c.fill(); c.strokeStyle = '#3a2c1c'; c.lineWidth = 0.8; c.stroke();
      c.beginPath(); c.moveTo(16, 1.2); c.lineTo(23.5, 2.6); c.lineTo(16, 4); c.closePath(); c.fillStyle = col; c.fill(); c.strokeStyle = 'rgba(20,14,8,.8)'; c.lineWidth = 0.5; c.stroke();
    } else {                                         // a covered wagon drawn by an ox: wheels, bed, canopy with a band in the goods' colour
      c.fillStyle = '#4a3322'; c.beginPath(); c.ellipse(26.2, 14.6, 4, 2.6, 0, 0, 2 * Math.PI); c.fill();
      c.beginPath(); c.arc(30.2, 13.2, 1.7, 0, 2 * Math.PI); c.fill();
      c.strokeStyle = '#3a281a'; c.lineWidth = 1; c.beginPath(); c.moveTo(24.6, 16.6); c.lineTo(24.6, 20); c.moveTo(27.8, 16.6); c.lineTo(27.8, 20); c.moveTo(18.5, 16) ; c.lineTo(23, 15.2); c.stroke();
      c.fillStyle = '#7a5232'; c.fillRect(4, 12, 15, 5); c.strokeStyle = '#25180d'; c.lineWidth = 0.9; c.strokeRect(4, 12, 15, 5);
      c.beginPath(); c.moveTo(4.4, 12); c.bezierCurveTo(4.4, 3.6, 18.6, 3.6, 18.6, 12); c.closePath();
      c.fillStyle = '#efe6cf'; c.fill(); c.strokeStyle = '#3a2c1c'; c.lineWidth = 0.8; c.stroke();
      c.fillStyle = col; c.fillRect(4.7, 9.6, 13.6, 1.8);
      c.fillStyle = '#2b1d12'; for (const wx of [7.6, 15.6]) { c.beginPath(); c.arc(wx, 18, 2.6, 0, 2 * Math.PI); c.fill(); }
      c.fillStyle = '#c9b48a'; for (const wx of [7.6, 15.6]) { c.beginPath(); c.arc(wx, 18, 0.75, 0, 2 * Math.PI); c.fill(); }
    }
  }
  FXSPR.set(key, s); return s;
}
function fxClear() { fxc.setTransform(1, 0, 0, 1, 0, 0); fxc.clearRect(0, 0, fx.width, fx.height); }
function fxFrame(now) {
  fxRaf = 0;
  if (!fxRunning()) { fxClear(); return; }
  if (!fxSet || fxSet.key !== ECON.ver + '|' + tcat) fxSet = fxBuild();
  const fk = mode === 'trade' && tsel ? tsel + '|' + ECON.ver + '|' + tcat : '';
  if (!fxFocus || fxFocus.key !== fk) fxFocus = { key: fk, set: fk ? focusLinks(tsel) : null };
  const t = now / 1000, z = view.s / fitS, ships = fxMode === 'ships';
  const size = (ships ? Math.min(9, 2.6 + 1.9 * Math.sqrt(z)) : Math.min(8, 3.4 + 1.3 * Math.sqrt(z))) / view.s;   // on the screen, in pixels, as map units: small beside a town
  const dens = ships ? Math.min(1, 0.3 + 0.25 * (z - 1)) : Math.min(1, 0.55 + 0.2 * (z - 1));   // zoomed out, fewer of them, so the coast is not a swarm
  // what lies on top of the trade on the map: a runner fades as it passes under a city or a name
  const under = [...LBL.values()], names = [...LBX.values()];
  const x0 = -view.x / view.s - size, y0 = -view.y / view.s - size, x1 = x0 + cv.clientWidth / view.s + 2 * size, y1 = y0 + cv.clientHeight / view.s + 2 * size;
  fxClear(); fxc.setTransform(dpr * view.s, 0, 0, dpr * view.s, dpr * view.x, dpr * view.y);
  for (const m of fxSet.movers) {
    if ((m.j + 1) / 2 > dens) continue;
    const w = m.w; let tau = (m.t0 + t) % w.dur; if (m.dir < 0) tau = w.dur - tau;
    let [x, y, ang, wet] = fxAt(w, tau);
    const off = (m.dir * 0.22 + m.j * 0.08) * size;  // each keeps to the right of its way, so the two ways pass side by side
    x -= Math.sin(ang) * off; y += Math.cos(ang) * off;
    if (x < x0 || x > x1 || y < y0 || y > y1 || !showR[wet ? 'water' : 'caravan']) continue;
    let alpha = fxFocus.set && !fxFocus.set.has(w.li) ? 0.16 : 1;
    const e0 = w.P[0], e1 = w.P[w.P.length - 1], near = 0.9 * size;
    if (Math.abs(x - e0[0]) < near && Math.abs(y - e0[1]) < near || Math.abs(x - e1[0]) < near && Math.abs(y - e1[1]) < near) alpha *= 0.3;
    else if (under.some(b => x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3]) || names.some(n => { const dx = x - n.x, dy = y - n.y, c = Math.cos(n.ang), s = Math.sin(n.ang); return Math.abs(dx * c + dy * s) < n.w / 2 && Math.abs(dy * c - dx * s) < n.fs * 0.6; })) alpha *= 0.3;
    fxc.globalAlpha = alpha;
    if (!ships) { const s = size * (1 + 0.12 * Math.sin(5 * t + 9 * m.j)); fxc.drawImage(fxSprite('spark', m.cat), x - s / 2, y - s / 2, s, s); continue; }
    let a = m.dir < 0 ? ang + Math.PI : ang; const flip = Math.cos(a) < 0;   // the side view faces its way; it leans up or down hill a little
    if (flip) a = Math.atan2(Math.sin(a), -Math.cos(a));
    a = Math.max(-0.5, Math.min(0.5, a));
    fxc.save(); fxc.translate(x, y); fxc.rotate(flip ? -a : a); if (flip) fxc.scale(-1, 1);
    fxc.drawImage(fxSprite(wet ? 'ship' : 'wagon', m.cat), -size * 0.667, -size * 0.8, size * 1.333, size);
    fxc.restore();
  }
  fxc.globalAlpha = 1;
  fxRaf = requestAnimationFrame(fxFrame);
}
function fxKick() { if (fxRunning()) { if (!fxRaf) fxRaf = requestAnimationFrame(fxFrame); } else { if (fxRaf) cancelAnimationFrame(fxRaf); fxRaf = 0; fxClear(); } }
function setFxMode(m) {
  fxMode = FXMODES[m] ? m : 'dots';
  try { localStorage.setItem('gresland-trade-motion', fxMode); } catch (err) { /* the choice lasts this visit */ }
  segPick('fxSeg', 'm', fxMode, setFxMode); fxKick();
}
__on(document, 'visibilitychange', fxKick);

