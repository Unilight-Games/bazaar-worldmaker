// ---------- the feel of a game (v0.19.0) ----------
// The owner picked, from a list Claude offered: the light of the season and a haze along the borders; a strategy game's bar of
// the world's figures with a small map; everything that is linked to something else a click away from it; a camera that glides;
// sounds and music; short animations; a ring menu on the right button; windows that float and can be dragged; keys and a hotbar.
// No progression of any kind. Sounds and music are made in the browser (no files), quiet, and can be turned off; music starts
// off. Everything moving respects the reduced-motion setting of the device.
const CALM = (() => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (err) { return false; } })();
const GAME = (() => { let o = {}; try { o = JSON.parse(localStorage.getItem('mme-game') || '{}') || {}; } catch (err) { /* defaults */ } return { sfx: o.sfx !== false, music: !!o.music, vol: Number.isFinite(o.vol) ? o.vol : 0.5, hud: o.hud !== false, mini: o.mini !== false }; })();
const gameSave = () => { try { localStorage.setItem('mme-game', JSON.stringify(GAME)); } catch (err) { /* this visit */ } };

// ---- sound: small sounds made on the spot ----
const SND = { ctx: null, out: null, music: null };
function sndCtx() {
  if (SND.ctx) return SND.ctx; const A = window.AudioContext || window.webkitAudioContext; if (!A) return null;
  try { SND.ctx = new A(); SND.out = SND.ctx.createGain(); SND.out.gain.value = GAME.vol; SND.out.connect(SND.ctx.destination); } catch (err) { SND.ctx = null; } return SND.ctx;
}
function tone(f, t0, dur, type, vol, f2) { const c = SND.ctx, o = c.createOscillator(), g = c.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, t0); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); o.connect(g); g.connect(SND.out); o.start(t0); o.stop(t0 + dur + 0.02); }
function noise(t0, dur, vol, freq) { const c = SND.ctx, n = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n); const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = b; f.type = 'bandpass'; f.frequency.value = freq || 1200; f.Q.value = 0.8; g.gain.value = vol; s.connect(f); f.connect(g); g.connect(SND.out); s.start(t0); }
let sfxLast = 0;
function sfx(k) {
  if (!GAME.sfx || !sndCtx()) return; const c = SND.ctx; if (c.state === 'suspended') c.resume(); const t = c.currentTime; if (t - sfxLast < 0.04 && k === 'tick') return; sfxLast = t;
  if (k === 'stamp') { tone(140, t, 0.18, 'triangle', 0.35, 70); noise(t, 0.08, 0.25, 400); tone(660, t + 0.05, 0.25, 'sine', 0.08); }
  else if (k === 'water') { tone(520, t, 0.16, 'sine', 0.12, 880); tone(780, t + 0.07, 0.14, 'sine', 0.07, 1100); }
  else if (k === 'brush') noise(t, 0.09, 0.08, 2200);
  else if (k === 'page') { noise(t, 0.14, 0.09, 3200); tone(880, t, 0.06, 'triangle', 0.04); }
  else if (k === 'undo') { tone(600, t, 0.14, 'sine', 0.08, 300); }
  else if (k === 'open') { tone(392, t, 0.12, 'triangle', 0.07); tone(587, t + 0.06, 0.16, 'triangle', 0.06); }
  else if (k === 'coin') { tone(1318, t, 0.12, 'square', 0.04); tone(1760, t + 0.06, 0.18, 'square', 0.035); }
  else tone(900, t, 0.05, 'triangle', 0.05);
}
// music: a slow drone and a pentatonic line over it; the season makes it lower and darker in the cold
function musicStart() {
  if (!sndCtx() || SND.music) return; const c = SND.ctx; if (c.state === 'suspended') c.resume();
  const bus = c.createGain(); bus.gain.value = 0.0001; bus.gain.exponentialRampToValueAtTime(0.5, c.currentTime + 3); const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400; bus.connect(lp); lp.connect(SND.out);
  const drone = [0, 7].map(st => { const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = 110 * Math.pow(2, st / 12); g.gain.value = 0.06; o.connect(g); g.connect(bus); o.start(); return o; });
  const scale = [0, 2, 4, 7, 9, 12, 14, 16], M = { bus, drone, lp, timer: 0 };
  const step = () => {
    if (!SND.music) return; const t = c.currentTime, sea = seasWarm(), root = sea < 0.35 ? 196 : 220;
    lp.frequency.setTargetAtTime(900 + 900 * sea, t, 2);
    for (const o of drone) o.frequency.setTargetAtTime((root / 2) * (o === drone[1] ? Math.pow(2, 7 / 12) : 1), t, 1.5);
    const n = scale[Math.floor(Math.random() * scale.length)], f = root * Math.pow(2, n / 12), o = c.createOscillator(), g = c.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.07, t + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4); o.connect(g); g.connect(bus); o.start(t); o.stop(t + 2.5);
    M.timer = setTimeout(step, 900 + Math.random() * 1500);
  };
  SND.music = M; step();
}
function musicStop() { const M = SND.music; if (!M) return; SND.music = null; clearTimeout(M.timer); const c = SND.ctx; M.bus.gain.setTargetAtTime(0.0001, c.currentTime, 0.4); setTimeout(() => { for (const o of M.drone) try { o.stop(); } catch (err) { /* stopped */ } }, 1500); }
const seasWarm = () => { const S = clSeasons(); if (!S || !clSeas) return 0.6; const s = S.find(x => x.id === clSeas); return s ? s.warm : 0.6; };
// the edits make their sounds; undo and redo theirs; a change of mode turns a page
{ const d = doOp; doOp = function (op) { const r = d(op); const k = op && op.k; sfx(k === 'c+' ? 'stamp' : /^r/.test(k || '') || k === 'rh' ? 'water' : k === 'ft' || k === 'sz' || k === 'bel' || k === 'adm' ? 'brush' : k === 'm' && op.ops && op.ops.some(o => o.k === 'c+') ? 'stamp' : 'tick'); if (k === 'c+' && op.c) animStamp(op.c.x, op.c.y); return r; }; }
{ const p = pushOp; pushOp = function (op) { const r = p(op); if (op && (op.k === 'ft' || op.k === 'sz' || op.k === 'bel' || op.k === 'adm')) sfx('brush'); else if (op && op.k === 'r+') sfx('water'); return r; }; }
{ const u = undo; undo = function () { sfx('undo'); return u(); }; const r = redo; redo = function () { sfx('undo'); return r(); }; }
{ const sm = setMode; setMode = function (m) { const was = mode; const r = sm(m); if (was !== m) sfx('page'); return r; }; }
__on(document, 'pointerdown', () => { if (GAME.music && !SND.music) musicStart(); }, { once: false });

// ---- the camera glides ----
let camAnim = 0;
function camTween(to, ms) {
  cancelAnimationFrame(camAnim); if (CALM) { view.x = to.x; view.y = to.y; view.s = to.s; clampView(); requestDraw(); return; }
  const from = { x: view.x, y: view.y, s: view.s }, t0 = performance.now(), d = ms || 180;
  const ease = t => 1 - Math.pow(1 - t, 3);
  const step = () => { const t = Math.min(1, (performance.now() - t0) / d), e = ease(t); view.s = from.s + (to.s - from.s) * e; view.x = from.x + (to.x - from.x) * e; view.y = from.y + (to.y - from.y) * e; requestDraw(); if (t < 1) camAnim = requestAnimationFrame(step); else { clampView(); requestDraw(); } };
  camAnim = requestAnimationFrame(step);
}
let camTarget = null;
{
  const za = zoomAt; zoomAt = function (f, sx, sy) {
    const live = { x: view.x, y: view.y, s: view.s }, base = camAnim && camTarget ? camTarget : live;
    view.x = base.x; view.y = base.y; view.s = base.s; za(f, sx, sy); const to = { x: view.x, y: view.y, s: view.s };
    view.x = live.x; view.y = live.y; view.s = live.s; camTarget = to; camTween(to, 160);
  };
  const ft = fit; fit = function () { const live = { x: view.x, y: view.y, s: view.s }; ft(); if (!live.s) return; const to = { x: view.x, y: view.y, s: view.s }; view.x = live.x; view.y = live.y; view.s = live.s; camTarget = to; camTween(to, 260); };
}
function camTo(x, y, s) { const r = cv.getBoundingClientRect(), ns = s || Math.max(view.s, fitS * 2.2), w = box.clientWidth - padR() - padL(); const save = { ...view }; view.s = ns; view.x = padL() + w / 2 - x * ns; view.y = r.height / 2 - y * ns; clampView(); const to = { x: view.x, y: view.y, s: view.s }; view.x = save.x; view.y = save.y; view.s = save.s; camTarget = to; camTween(to, 420); }
if (typeof admFocusXY === 'function') admFocusXY = (x, y) => camTo(x, y, view.s);

// ---- short animations: a stamp where a community is set down, a ring where a river ends ----
const ANIMS = [];
function animStamp(x, y) { if (CALM) return; ANIMS.push({ k: 'stamp', x, y, t0: performance.now(), d: 650 }); requestDraw(); animTick(); }
function animRipple(x, y) { if (CALM) return; ANIMS.push({ k: 'ripple', x, y, t0: performance.now(), d: 900 }); requestDraw(); animTick(); }
let animRaf = 0; function animTick() { if (animRaf) return; const f = () => { animRaf = 0; if (!ANIMS.length) return; requestDraw(); animRaf = requestAnimationFrame(f); }; animRaf = requestAnimationFrame(f); }
{
  const top = drawOnTop; drawOnTop = function (c, px) {
    if (top) top(c, px); const now = performance.now();
    for (let i = ANIMS.length - 1; i >= 0; i--) {
      const a = ANIMS[i], t = (now - a.t0) / a.d; if (t >= 1) { ANIMS.splice(i, 1); continue; }
      c.save(); c.globalAlpha = 1 - t;
      if (a.k === 'stamp') { const r = (6 + 26 * t) * px; c.beginPath(); c.arc(a.x, a.y, r, 0, 2 * Math.PI); c.strokeStyle = '#ffe3a0'; c.lineWidth = (3 - 2 * t) * px; c.stroke(); c.beginPath(); c.arc(a.x, a.y, r * 0.55, 0, 2 * Math.PI); c.strokeStyle = 'rgba(255,240,200,.8)'; c.lineWidth = 1.5 * px; c.stroke(); }
      else { for (let k = 0; k < 3; k++) { const tt = Math.max(0, t - k * 0.15); c.beginPath(); c.arc(a.x, a.y, (4 + 30 * tt) * px, 0, 2 * Math.PI); c.strokeStyle = 'rgba(150,210,255,.9)'; c.lineWidth = 1.5 * px; c.stroke(); } }
      c.restore();
    }
  };
}
{ const fr = finishRiver; finishRiver = function () { const end = riv && riv.pts.length ? riv.pts[riv.pts.length - 1] : null; const r = fr(); if (end) animRipple(end[0], end[1]); return r; }; }

// ---- the light of the season, and a haze along the borders of states ----
const SEASLIGHT = w => w < 0.3 ? [110, 150, 210, 0.13] : w < 0.6 ? [150, 190, 140, 0.05] : w < 0.85 ? [255, 210, 130, 0.07] : [255, 190, 110, 0.11];
let bhazeCv = null, bhazeKey = '';
function bhazeSheet() {
  let hsh = 0; for (let i = 0; i < N; i += 3) hsh = (Math.imul(hsh, 31) + ECO.cells[i].charCodeAt(0)) | 0; const key = hsh + '|' + ECO.states.map(s => s.color).join('');
  if (key === bhazeKey && bhazeCv) return bhazeCv; bhazeKey = key;
  if (!bhazeCv) { bhazeCv = document.createElement('canvas'); bhazeCv.width = Math.max(1, Math.ceil(G.w / 3)); bhazeCv.height = Math.max(1, Math.ceil(G.h / 3)); }
  const c = bhazeCv.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, bhazeCv.width, bhazeCv.height); c.setTransform(1 / 3, 0, 0, 1 / 3, 0, 0);
  for (const s of ECO.states) {
    c.beginPath(); let any = false;
    for (let i = 0; i < N; i++) { if (ECO.cells[i] !== s.id || isW(eff(i))) continue; for (let j = 0; j < 6; j++) { const v = NB[i * 6 + j]; if (v < 0 || ECO.cells[v] === s.id || isW(eff(v))) continue; const e = EDGE[j], t0 = e * Math.PI / 3, t1 = (e + 1) * Math.PI / 3; c.moveTo(CX[i] + R * Math.cos(t0), CY[i] + R * Math.sin(t0)); c.lineTo(CX[i] + R * Math.cos(t1), CY[i] + R * Math.sin(t1)); any = true; } }
    if (!any) continue; c.lineCap = 'round'; c.strokeStyle = s.color;
    for (const [w, a] of [[14, 0.07], [8, 0.12], [3, 0.35]]) { c.globalAlpha = a; c.lineWidth = w; c.stroke(); }
  }
  c.globalAlpha = 1; return bhazeCv;
}
{
  const dg = drawOverGround; drawOverGround = function (c, w, h, live) {
    if (dg) dg(c, w, h, live); if (!live) return;
    if (ECO.states.length && (mode === 'view' || mode === 'trade' || mode === 'econ')) { const s = bhazeSheet(); c.save(); c.imageSmoothingEnabled = true; c.drawImage(s, 0, 0, s.width * 3, s.height * 3); c.restore(); }
    if (clSeas) { const S = clSeasons(), z = S && S.find(x => x.id === clSeas); if (z) { const [r, g, b, a] = SEASLIGHT(z.warm); c.save(); c.fillStyle = `rgba(${r},${g},${b},${a})`; c.fillRect(0, 0, G.w, G.h); c.restore(); } }
  };
}

// ---- the options at the top right, and a small map at the bottom right ----
// The owner (25 Nov 2026, after trying it): no bar of figures along the foot of the map; the world's name and the sound and music
// switches sit at the top right; the small map sits in the bottom right corner of the map.
const opt = document.createElement('div'); opt.className = 'mapopt'; $('mapbox').appendChild(opt);
const mini = document.createElement('canvas'); mini.className = 'minimap'; mini.width = 200; mini.height = Math.max(60, Math.round(200 * G.h / G.w)); mini.title = 'คลิกหรือลากเพื่อเลื่อนแผนที่ (กด H เพื่อซ่อน)'; $('mapbox').appendChild(mini);
let optLast = '';
function hudRender() {
  // the options take the top right corner itself (the owner, 25 Nov 2026); the zoom buttons step down below them
  mini.hidden = !GAME.mini; mini.style.right = (padR() + 10) + 'px'; opt.style.right = (padR() + 10) + 'px';
  { const ctl = document.querySelector('#mapbox .ctl'), br = box.getBoundingClientRect(); let top = 10;
    // the row of map buttons wraps short of the corner, so the options keep it; only on a very narrow map do they step below the row
    if (ctl) { ctl.style.maxWidth = ''; const room = br.right - padR() - 10 - opt.offsetWidth - 10 - ctl.getBoundingClientRect().left; if (room >= 280) ctl.style.maxWidth = Math.floor(room) + 'px'; else top = Math.round(ctl.getBoundingClientRect().bottom - br.top + 8); }
    opt.style.top = top + 'px';
    const zm = box.querySelector('.zoom'); if (zm) zm.style.top = (top + (opt.offsetHeight || 32) + 8) + 'px'; }
  // during a lesson the scale sits at the top of the map, where the row of map buttons may now reach: it goes below them
  { const sb = $('scalebar'), ctl = document.querySelector('#mapbox .ctl'); if (sb && ctl) { sb.style.top = ''; if (document.body.classList.contains('tutoring')) { const a = sb.getBoundingClientRect(), c = ctl.getBoundingClientRect(); if (a.top < c.bottom && a.bottom > c.top && a.left < c.right && a.right > c.left) sb.style.top = Math.round(c.bottom - box.getBoundingClientRect().top + 6) + 'px'; } } }
  const w = ECO.world, wt = [w.name, w.era, w.year ? 'ปี ' + w.year : ''].filter(Boolean).join(' · ');
  const key = wt + GAME.sfx + GAME.music; if (key === optLast) return; optLast = key;
  opt.innerHTML = `<button type="button" data-hud="world" class="w" title="ข้อมูลโลก: ชื่อ ยุค ปี และประวัติ">${esc(wt || 'ตั้งชื่อโลก')}</button><button type="button" data-hud="sfx" aria-pressed="${GAME.sfx}" title="เสียงประกอบ">${GAME.sfx ? 'เสียง ●' : 'เสียง ○'}</button><button type="button" data-hud="music" aria-pressed="${GAME.music}" title="เพลง">${GAME.music ? 'เพลง ●' : 'เพลง ○'}</button><button type="button" data-hud="keys" title="คีย์ลัด">?</button>`;
}
opt.addEventListener('click', e => {
  const b = e.target.closest('[data-hud]'); if (!b) return; const k = b.dataset.hud; sfx('tick');
  if (k === 'world') noteOpen('w', 'ข้อมูลโลก');
  else if (k === 'sfx') { GAME.sfx = !GAME.sfx; gameSave(); optLast = ''; hudRender(); if (GAME.sfx) sfx('open'); }
  else if (k === 'music') { GAME.music = !GAME.music; gameSave(); optLast = ''; hudRender(); if (GAME.music) musicStart(); else musicStop(); }
  else if (k === 'keys') keysHelp();
});
for (const ev of ['pointerdown', 'wheel']) { opt.addEventListener(ev, e => e.stopPropagation()); mini.addEventListener(ev, e => e.stopPropagation()); }
if ($('worldLine')) $('worldLine').style.display = 'none';
setInterval(() => { if (document.hidden) return; hudRender(); }, 700);
let miniKey = '';
function miniDraw() {
  if (mini.hidden) return; const c = mini.getContext('2d'), W = mini.width, H = mini.height, sc = W / G.w;
  const key = painted.size + '|' + (img.complete ? 1 : 0) + '|' + ECO.states.length;
  if (key !== miniKey) { miniKey = key; c.clearRect(0, 0, W, H); if (img.complete && img.naturalWidth) c.drawImage(img, 0, 0, W, H); if (layerUsed) c.drawImage(layer, 0, 0, W, H); mini._bg = c.getImageData(0, 0, W, H); }
  else if (mini._bg) c.putImageData(mini._bg, 0, 0);
  const r = cv.getBoundingClientRect(), x0 = (-view.x) / view.s, y0 = (-view.y) / view.s, w = r.width / view.s, h = r.height / view.s;
  c.strokeStyle = '#ffe3a0'; c.lineWidth = 1.5; c.strokeRect(x0 * sc, y0 * sc, w * sc, h * sc);
  if (MS && MS.trip && MS.trip.pin >= 0) { c.fillStyle = '#d0453a'; c.beginPath(); c.arc(CX[MS.trip.pin] * sc, CY[MS.trip.pin] * sc, 3, 0, 2 * Math.PI); c.fill(); }
}
{ const rd = requestDraw; let mq = 0; requestDraw = function () { rd(); if (!mq) mq = requestAnimationFrame(() => { mq = 0; miniDraw(); }); }; }
{
  let drag = false; const go = e => { const r = mini.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * G.w, y = (e.clientY - r.top) / r.height * G.h, cr = cv.getBoundingClientRect(); view.x = cr.width / 2 - x * view.s; view.y = cr.height / 2 - y * view.s; clampView(); requestDraw(); };
  mini.addEventListener('pointerdown', e => { drag = true; try { mini.setPointerCapture(e.pointerId); } catch (err) { /* fine */ } go(e); });
  mini.addEventListener('pointermove', e => { if (drag) go(e); }); mini.addEventListener('pointerup', () => { drag = false; });
}

// ---- links: anything that names a community, a state or a unit takes you to it ----
function goCity(id) { const v = visibleCities().find(c => c.id === id); if (!v) return; camTo(v.x, v.y); if (mode === 'city' || mode === 'view') { if (mode === 'view') setMode('city'); selectCity(v.id); } }
__on(document, 'click', e => {
  const a = e.target.closest ? e.target.closest('[data-city]') : null; if (!a || e.defaultPrevented) return; if (a.closest('#ecobody') && ecoTab === 'adm') return; e.preventDefault(); goCity(a.dataset.city);
});
__on(document, 'click', e => { const a = e.target.closest ? e.target.closest('[data-sopen]') : null; if (!a || a.closest('#ecobody')) return; e.preventDefault(); stateOpen(a.dataset.sopen); });

// ---- windows that float: any card of the side panel can come out over the map and be dragged ----
function dragBy(el, handle, keyName) {
  let d = null; const pos = (() => { try { return JSON.parse(localStorage.getItem('mme-win-' + keyName) || 'null'); } catch (err) { return null; } })();
  if (pos && Number.isFinite(pos.x)) { el.style.left = pos.x + 'px'; el.style.top = pos.y + 'px'; el.style.right = 'auto'; }
  handle.addEventListener('pointerdown', e => { if (e.button !== 0 || e.target.closest('button, input, select, a')) return; const r = el.getBoundingClientRect(), pr = el.offsetParent ? el.offsetParent.getBoundingClientRect() : { left: 0, top: 0 }; d = { dx: e.clientX - r.left, dy: e.clientY - r.top, pl: pr.left, pt: pr.top }; try { handle.setPointerCapture(e.pointerId); } catch (err) { /* fine */ } el.classList.add('dragging'); e.preventDefault(); e.stopPropagation(); });
  handle.addEventListener('pointermove', e => { if (!d) return; el.style.left = Math.max(0, e.clientX - d.pl - d.dx) + 'px'; el.style.top = Math.max(0, e.clientY - d.pt - d.dy) + 'px'; el.style.right = 'auto'; });
  const end = () => { if (!d) return; d = null; el.classList.remove('dragging'); try { localStorage.setItem('mme-win-' + keyName, JSON.stringify({ x: parseFloat(el.style.left) || 0, y: parseFloat(el.style.top) || 0 })); } catch (err) { /* this visit */ } };
  handle.addEventListener('pointerup', end); handle.addEventListener('pointercancel', end); handle.style.cursor = 'move';
}
dragBy(tripEl, tripEl, 'trip'); dragBy(cropEl, cropEl, 'crop');
for (const [m, k] of [[noteBox, 'note'], [mkEl, 'market']]) { const card = m.querySelector('.mmcard'), head = m.querySelector('.mmhead'); if (card && head) { card.style.position = 'relative'; let d = null; head.style.cursor = 'move'; head.addEventListener('pointerdown', e => { if (e.target.closest('button')) return; d = { x: e.clientX, y: e.clientY, l: parseFloat(card.style.left) || 0, t: parseFloat(card.style.top) || 0 }; try { head.setPointerCapture(e.pointerId); } catch (err) { /* fine */ } }); head.addEventListener('pointermove', e => { if (!d) return; card.style.left = d.l + e.clientX - d.x + 'px'; card.style.top = d.t + e.clientY - d.y + 'px'; }); head.addEventListener('pointerup', () => { d = null; }); } }
function popCards() {
  for (const card of document.querySelectorAll('aside .card')) {
    if (card.dataset.pop) continue; const h2 = card.querySelector('h2'); if (!h2) continue; card.dataset.pop = '1';
    const b = document.createElement('button'); b.type = 'button'; b.className = 'popbtn'; b.title = 'แยกการ์ดนี้ออกมาเป็นหน้าต่างลอย ลากที่หัวการ์ดเพื่อย้าย'; b.textContent = '⧉'; h2.appendChild(b);
    let home = null;
    b.onclick = e => {
      e.stopPropagation(); sfx('open');
      if (!card.classList.contains('floating')) { home = { parent: card.parentNode, next: card.nextSibling }; $('mapbox').appendChild(card); card.classList.add('floating'); b.textContent = '⤓'; b.title = 'เก็บกลับเข้าแผงข้าง'; if (!card.style.left) { card.style.left = (padL() + 60) + 'px'; card.style.top = '70px'; } if (!card._drag) { dragBy(card, h2, 'card-' + (card.id || 'x')); card._drag = 1; } }
      else { card.classList.remove('floating'); if (home) home.parent.insertBefore(card, home.next); b.textContent = '⧉'; b.title = 'แยกการ์ดนี้ออกมาเป็นหน้าต่างลอย'; }
    };
    for (const ev of ['pointerdown', 'wheel']) card.addEventListener(ev, e => { if (card.classList.contains('floating')) e.stopPropagation(); });
  }
}
popCards(); setTimeout(popCards, 1500);

// ---- the ring menu, on a right click that did not drag ----
const ring = document.createElement('div'); ring.className = 'ringmenu'; ring.hidden = true; $('mapbox').appendChild(ring);
let rdown = null;
cv.addEventListener('pointerdown', e => { if (e.button === 2) rdown = { x: e.clientX, y: e.clientY }; });
cv.addEventListener('contextmenu', e => {
  const moved = rdown && Math.hypot(e.clientX - rdown.x, e.clientY - rdown.y) > 5; rdown = null; if (moved) return;
  const painting = mode === 'terrain' || mode === 'river' || mode === 'climate' || (mode === 'info' && iptool === 'zone') || (mode === 'econ' && (ecoTab === 'cul' || ecoTab === 'rel' || ecoTab === 'states'));
  if (painting) return; e.preventDefault(); ringOpen(e.clientX, e.clientY);
});
function ringOpen(ex, ey) {
  const [mx, my] = toMap(ex, ey), c = cityAt(mx, my), h = hexAt(mx, my), r = box.getBoundingClientRect(); if (h < 0) return;
  const acts = c ? [
    ['ชุมชนนี้', () => { setMode('city'); selectCity(c.id); }], ['ประวัติ', () => noteOpen('c:' + c.id, 'ประวัติของ' + (c.name || 'ชุมชนนี้'))],
    ['การค้า', () => { setMode('trade'); }], ['หมุดคณะที่นี่', () => { MS.trip.pin = h; tripSave(); msTool('trip'); }],
    ['วัดระยะจากที่นี่', () => { msTool('ruler'); MS.ruler = [[c.x, c.y]]; requestDraw(); }], ['ตลาด', () => mkOpen()],
  ] : [
    ['ซูมเข้า', () => zoomAt(1.6, ex - r.left, ey - r.top)], ['บันทึกช่องนี้', () => noteOpen('h:' + h, 'บันทึกของช่องนี้')],
    ['วางชุมชน', () => { setMode('city'); flash('คลิกที่ว่างเพื่อวางชุมชน'); }], ['หมุดคณะที่นี่', () => { MS.trip.pin = h; tripSave(); msTool('trip'); }],
    ['วัดระยะจากที่นี่', () => { msTool('ruler'); MS.ruler = [[mx, my]]; requestDraw(); }], ['ตลาด', () => mkOpen()],
  ];
  const n = acts.length, rad = 74; ring.innerHTML = `<div class="ringhub">${c ? esc(c.name || 'ชุมชน') : esc(biomeInfo(eff(h)).name)}</div>` + acts.map(([t], i) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n; return `<button type="button" data-ri="${i}" style="left:${Math.cos(a) * rad}px;top:${Math.sin(a) * rad}px">${esc(t)}</button>`; }).join('');
  ring.style.left = (ex - r.left) + 'px'; ring.style.top = (ey - r.top) + 'px'; ring.hidden = false; ring.classList.remove('on'); void ring.offsetWidth; ring.classList.add('on'); sfx('open');
  ring.onclick = e => { const b = e.target.closest('[data-ri]'); if (!b) return; ring.hidden = true; acts[+b.dataset.ri][1](); };
}
ring.addEventListener('pointerdown', e => e.stopPropagation());
__on(document, 'pointerdown', e => { if (!ring.hidden && !ring.contains(e.target)) ring.hidden = true; });
__on(window, 'keydown', e => { if (e.key === 'Escape') ring.hidden = true; });

// ---- keys, shown on the mode buttons at the top ----
const HOTK = [['1', 'view', 'ดู'], ['2', 'terrain', 'ภูมิประเทศ'], ['3', 'river', 'แม่น้ำ'], ['4', 'city', 'ชุมชน'], ['5', 'label', 'ชื่อ'], ['6', 'route', 'ถนน'], ['7', 'trade', 'การค้า'], ['8', 'climate', 'ภูมิอากาศ'], ['9', 'econ', 'เศรษฐกิจ'], ['0', 'info', 'ข้อมูล']];
for (const [k, m] of HOTK) { const b = document.querySelector(`#modes button[data-mode="${m}"]`); if (!b || b.querySelector('kbd')) continue; const kb = document.createElement('kbd'); kb.className = 'modekey'; kb.textContent = k; b.appendChild(kb); b.title = (b.title ? b.title + ' ' : '') + '(กด ' + k + ')'; }
const KEYS = [['1 ถึง 0', 'เปลี่ยนโหมด ตามเลขบนปุ่มโหมดด้านบน'], ['[ และ ]', 'แปรงเล็กลงและใหญ่ขึ้น'], ['Q / Shift+Q', 'ฤดูถัดไปและฤดูก่อน'], ['M', 'ตลาดสินค้ากลาง'], ['R', 'วัดระยะ'], ['T', 'วางแผนเดินทาง'], ['L', 'ชั้นวัฒนธรรม ศาสนา และการปกครอง'], ['N', 'ชื่อสถานที่'], ['H', 'ซ่อนหรือแสดงแผนที่ย่อ'], ['Ctrl+Z / Ctrl+Y', 'ย้อนและทำซ้ำ'], ['คลิกขวา', 'เมนูวงล้อ'], ['Esc', 'ปิดหน้าต่างหรือเลิกเครื่องมือ']];
function keysHelp() { const t = $('toast'); flash(KEYS.map(([k, v]) => k + ': ' + v).join('  ·  ')); if (t) { t.classList.add('long'); setTimeout(() => t.classList.remove('long'), 7000); } }
__on(window, 'keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey) return; const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
  if (!noteBox.hidden || !mkEl.hidden) return; const code = e.code, d = /^Digit([0-9])$/.exec(code);
  if (d) { const h = HOTK.find(x => x[0] === d[1]); const b = h && document.querySelector(`#modes button[data-mode="${h[1]}"]`); if (b && !b.hidden && !b.disabled) { setMode(h[1]); e.preventDefault(); } return; }
  if (code === 'BracketLeft' || code === 'BracketRight') { const n = clamp(bsize + (code === 'BracketRight' ? 1 : -1), 1, 4); setBsize(n); flash('แปรง ' + ['', '1 ช่อง', '7 ช่อง', '19 ช่อง', '37 ช่อง'][n]); BEL.n = n; e.preventDefault(); return; }
  if (code === 'KeyQ') { if (e.shiftKey) $('seasonBtn').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true })); else $('seasonBtn').click(); }
  else if (code === 'KeyM') mkOpen(); else if (code === 'KeyR') $('rulerBtn').click(); else if (code === 'KeyT') $('tripBtn').click(); else if (code === 'KeyL') $('belBtn').click(); else if (code === 'KeyN') $('names').click();
  else if (code === 'KeyH') { GAME.mini = !GAME.mini; gameSave(); hudRender(); miniDraw(); }
  else return; e.preventDefault();
});
