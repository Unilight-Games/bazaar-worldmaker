// ---------- the season on the map itself (v0.18.5) ----------
// The owner asked for a button on the map, beside the one for the names, that steps through the seasons; and for the waters that
// run only part of the year (the seasonal streams and the seasonal rivers, the user's and the map's own) to fade as their season
// dries. The button steps the same season the climate mode looks at (clSeas). A seasonal line fades by the rain where it runs:
// the season's rain over the year's mean season, along its hexes. Below SEAS_DRY of it the line is a dry bed; between SEAS_DRY and
// SEAS_LOW it fades part of the way. Both shares are Claude's, as the owner left them to Claude.
const SEAS_DRY = 0.4, SEAS_LOW = 0.7;
let seasCv = null, seasKey = '', seasAny = false;
function seasRatio() {                              // the season's rain over the year's mean, hex by hex; null for the whole year
  if (!clSeas) return null;
  const A = climEnsure(), SE = A.seas; if (!SE || !A.S) return null;
  const k = SE.findIndex(s => s.id === clSeas); if (k < 0) return null;
  const tot = SE.reduce((a, s) => a + (s.len || 0), 0) || 1, out = new Float32Array(N);
  for (let i = 0; i < N; i++) { let m = 0; SE.forEach((s, j) => { m += A.S[j].p[i] * (s.len || 0); }); m /= tot; out[i] = m > 0.01 ? A.S[k].p[i] / m : 1; }
  return { k, r: out, stamp: A.stamp };
}
const seasFade = x => x < SEAS_DRY ? 1 : x < SEAS_LOW ? (SEAS_LOW - x) / (SEAS_LOW - SEAS_DRY) : 0;
function seasLines() {                              // every seasonal line as points, with the width it is drawn at
  const out = [];
  for (const r of BRIV) if (r.s) for (const u of riverRuns(r)) out.push({ q: u.q, w: r.w });
  for (const r of ED.rivers) { const k = RK[r.kind]; if (!k || !k.s) continue; const d = RDER.get(r.id); if (d) out.push({ q: d.q, w: d.w }); }
  return out;
}
function seasSheet() {                              // the dry beds of the season shown, drawn once for each season and set of waters
  const R = seasRatio(); if (!R) return null;
  const key = clSeas + '|' + R.stamp + '|' + RIVSIG + '|' + ED.rivers.length + '|' + ED.rivers.reduce((a, r) => a + r.pts.length, 0) + '|' + painted.size;
  if (key === seasKey) return seasAny ? seasCv : null;
  seasKey = key; seasAny = false;
  if (!seasCv) { seasCv = document.createElement('canvas'); seasCv.width = layer.width; seasCv.height = layer.height; }
  const c = seasCv.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, seasCv.width, seasCv.height);
  c.setTransform(seasCv.width / G.w, 0, 0, seasCv.height / G.h, 0, 0); c.lineCap = 'round'; c.lineJoin = 'round';
  for (const L of seasLines()) {
    let s = 0, n = 0; for (const p of L.q) { const h = hexAt(p[0], p[1]); if (h >= 0 && !isW(eff(h))) { s += R.r[h]; n++; } }
    const f = n ? seasFade(s / n) : 0; if (!(f > 0.02)) continue; seasAny = true;
    for (let i = 0; i + 1 < L.q.length; i++) {      // the ground's own colour over the water, piece by piece
      const a = L.q[i], b = L.q[i + 1], h = hexAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2); if (h < 0 || isW(eff(h))) continue;
      c.globalAlpha = f; c.strokeStyle = fillOf(h, eff(h)); c.lineWidth = L.w * 0.85 + 1.1; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
    }
    c.globalAlpha = f * 0.75; c.strokeStyle = 'rgb(150,128,96)'; c.lineWidth = Math.max(0.35, L.w * 0.22); c.setLineDash([1.1, 1.3]);   // the dry bed
    c.beginPath(); c.moveTo(L.q[0][0], L.q[0][1]); for (const p of L.q) c.lineTo(p[0], p[1]); c.stroke(); c.setLineDash([]);
    if (f < 1) { c.globalAlpha = 1 - f; c.strokeStyle = 'rgb(124,166,190)'; c.lineWidth = L.w * 0.6; c.beginPath(); c.moveTo(L.q[0][0], L.q[0][1]); for (const p of L.q) c.lineTo(p[0], p[1]); c.stroke(); }   // what water is left
  }
  c.globalAlpha = 1;
  return seasAny ? seasCv : null;
}
{ const og = drawOverGround; drawOverGround = function (c, w, h, live) { if (og) og(c, w, h, live); if (mode === 'river' || mode === 'terrain') return; const s = seasSheet(); if (s) c.drawImage(s, 0, 0, w, h); }; }

// the button: whole year, then each season in turn
const seasBtn = $('seasonBtn');
function seasLabel() {
  if (!seasBtn) return; const A = climEnsure(), SE = A.seas, s = SE && clSeas ? SE.find(x => x.id === clSeas) : null;
  seasBtn.textContent = 'ฤดู: ' + (s ? s.name : 'ทั้งปี'); seasBtn.setAttribute('aria-pressed', s ? 'true' : 'false');
  seasBtn.title = SE ? 'กดเพื่อเปลี่ยนฤดู ลำน้ำและแม่น้ำตามฤดูกาลจางลงในฤดูที่ฝนน้อย คลิกขวาเพื่อย้อนฤดู' : 'แผนที่นี้ยังไม่ได้แบ่งฤดู กดเพื่อไปแบ่งในโหมดภูมิอากาศ';
}
function seasStep(dir) {
  const A = climEnsure(), SE = A.seas;
  if (!SE || !SE.length) { if (editable) { setMode('climate'); flash('แผนที่นี้ยังไม่ได้แบ่งฤดู กดแบ่งปีเป็นฤดูได้ที่การ์ดภูมิอากาศ'); } else flash('แผนที่นี้ยังไม่ได้แบ่งฤดู'); return; }
  const ids = ['', ...SE.map(s => s.id)], k = Math.max(0, ids.indexOf(clSeas)), nx = ids[(k + dir + ids.length) % ids.length];
  setClSeas(nx); seasLabel(); flash(nx ? 'กำลังดู' + SE.find(s => s.id === nx).name : 'ดูทั้งปี');
}
if (seasBtn) {
  seasBtn.onclick = () => seasStep(1);
  seasBtn.addEventListener('contextmenu', e => { e.preventDefault(); seasStep(-1); });
  { const sc = setClSeas; setClSeas = function (id) { sc(id); seasLabel(); requestDraw(); }; }
  { const cc = clChanged; clChanged = function () { cc.apply(this, arguments); seasKey = ''; seasLabel(); }; }
  seasLabel();
}
