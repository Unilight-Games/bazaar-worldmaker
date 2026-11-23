// ---------- the reach of a brush that paints numbers or borders ----------
// The terrain brush has always shown its reach under the pointer. The climate brush and the border brush did not, so a stroke
// was a guess at how far it would go (the owner's note, 23 Nov 2026). Both show it now: the hexes a press here would change,
// tinted by what it would do to them, and the card says the same in words.
let REACH = null;
function reachNow() {
  if (!cursor || pinch || !editable || spaceDown || (act && act.k === 'pan')) return null;
  let n = 0, tint = '', land = false;
  if (mode === 'climate' && clTool && CLSTEP[clLayer]) { n = clBrushN; land = true; tint = clTool === 'up' ? '255,138,76' : clTool === 'down' ? '96,176,255' : '236,236,236'; }
  else if (mode === 'econ' && ecoTab === 'states' && ecoPaint != null) { n = ecoBrushN; const s = ECOX.byKey && ECOX.byKey.get(ecoPaint), c = s && /^#[0-9a-f]{6}$/i.test(s.color || '') ? s.color : null; tint = c ? [1, 3, 5].map(k => parseInt(c.slice(k, k + 2), 16)).join(',') : '236,236,236'; }
  if (!n) return null;
  const h = hexAt(cursor[0], cursor[1]); if (h < 0) return null;
  const cells = []; for (const i of brush(h, n)) if (!land || !isW(eff(i))) cells.push(i);
  return { h, n, tint, cells, all: brush(h, n).length };
}
const __drawReach = draw;
draw = function () {
  __drawReach();
  REACH = reachNow(); if (!REACH) return;
  const px = 1 / view.s;
  ctx.save(); ctx.setTransform(dpr * view.s, 0, 0, dpr * view.s, dpr * view.x, dpr * view.y);
  if (REACH.cells.length) {
    ctx.beginPath(); for (const i of REACH.cells) hexPath(ctx, i, 1);
    ctx.fillStyle = `rgba(${REACH.tint},.3)`; ctx.fill();
    ctx.lineWidth = 1.5 * px; ctx.strokeStyle = 'rgba(255,244,214,.95)'; ctx.stroke();
  }
  if (REACH.cells.length < REACH.all) {              // the part of the brush that lies on water, where the climate brush changes nothing
    ctx.beginPath(); for (const i of brush(REACH.h, REACH.n)) if (!REACH.cells.includes(i)) hexPath(ctx, i, 1);
    ctx.setLineDash([3 * px, 3 * px]); ctx.lineWidth = 1 * px; ctx.strokeStyle = 'rgba(255,244,214,.45)'; ctx.stroke(); ctx.setLineDash([]);
  }
  ctx.restore();
};
// one more line on the climate card while a brush is in hand: what a press here would do, and to how many hexes
function clReachNote() {
  if (mode !== 'climate' || !clTool || !editable) return '';
  const st = CLSTEP[clLayer]; if (!st) return '<div class="m">ชั้นนี้คิดจากชั้นอื่น แปรงแก้ตรง ๆ ไม่ได้</div>';
  const r = reachNow(), k = r ? r.cells.length : 0;
  return `<div class="s">แปรงตรงนี้${clTool === 'clear' ? 'คืนค่าที่ระบบคิดให้' : (clTool === 'up' ? 'เพิ่ม ' : 'ลด ') + st[0] + ' ' + st[1] + ' ต่อช่อง'} ${k ? 'ใน ' + k + ' ช่อง' : 'แต่ใต้แปรงเป็นน้ำทั้งหมด จึงไม่มีช่องให้แก้'}</div>`;
}
// the card keeps its place when the map's box changes size
const __refitTip = refit; refit = function () { __refitTip(); tipPlace(); };
// the room's owner asks to be taken to where a friend is working
function lookAt(x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  const r = cv.getBoundingClientRect();
  view.s = Math.max(view.s, Math.min(fitS * 6, fitS * 2.2));
  view.x = padL() + (r.width - padL() - padR()) / 2 - x * view.s; view.y = r.height / 2 - y * view.s; clampView(); requestDraw();
}
