// ---------- the peek: a short card where the pointer rests two seconds (v0.19.0) ----------
// The owner asked for a box of brief facts about a community or a special feature when the pointer rests on it for two seconds,
// with a small ring that fills while the two seconds run, so it is plain the box is coming. It also answers for the special zones.
// Moving off the thing, pressing, or leaving the map ends it. The hover card in the corner stays as it was.
const PEEK_MS = 2000;
const peekEl = document.createElement('div'); peekEl.className = 'peek'; peekEl.hidden = true; $('mapbox').appendChild(peekEl);
const ringEl = document.createElement('div'); ringEl.className = 'peekring'; ringEl.hidden = true; $('mapbox').appendChild(ringEl);
let PK = { key: '', t0: 0, x: 0, y: 0, raf: 0, shown: false };
function peekTarget(mx, my) {
  const c = cityAt(mx, my); if (c) return { key: 'c:' + c.id, c };
  const h = hexAt(mx, my); if (h < 0) return null;
  const f = typeof featAt === 'function' ? featAt(h) : null; if (f) return { key: 'f:' + h, f, h };
  const z = typeof szAt === 'function' ? szAt(h) : null; if (z) return { key: 'z:' + z.id, z, h };
  return null;
}
const peekCut = (s, n) => s.length > n ? s.slice(0, n - 1) + '…' : s;
let peekCityExtra = c => '';                         // later parts add a line (culture, faith, the unit that governs it)
function peekHTML(t) {
  if (t.c) {
    const c = t.c, k = (CK[c.kind] || CK.city).name, E = ECON && ECON.cities.find(x => x.id === c.id), tr = typeof comTr === 'function' ? comTr(c.id).map(x => COMT[x] && COMT[x].name).filter(Boolean) : [];
    const st = E && E.st ? ECO.states.find(s => s.id === E.st) : null, hist = noteText(noteOf('c:' + c.id)) || c.note || '';
    return `<b>${esc(c.name || 'ชุมชนไม่มีชื่อ')}</b><div class="m">${esc(k)}${st ? ' · ' + esc(st.name) : ''}${E ? ' · ' + socN(E.pop * ECO.unit) + ' คน' : ''}</div>`
      + (tr.length ? `<div class="s">${tr.map(esc).join(' · ')}</div>` : '') + (() => { const h = hexAt(c.x, c.y), z = h >= 0 && typeof szAt === 'function' ? szAt(h) : null; return z ? `<div class="s">อยู่ใน${esc(z.name)} · ${DANGER[z.danger]}</div>` : ''; })() + peekCityExtra(c, E) + (hist ? `<div class="lore">${esc(peekCut(hist, 160))}</div>` : '');
  }
  if (t.f) { const n = noteText(noteOf('h:' + t.h)); return `<b>${esc(t.f.name)}</b><div class="m">ลักษณะพิเศษของพื้นที่</div><div class="s">${esc(featSum(t.f))}</div>` + (t.f.tour ? `<div class="m">ดึงนักท่องเที่ยว ${t.f.tour}</div>` : '') + (n ? `<div class="lore">${esc(peekCut(n, 160))}</div>` : ''); }
  if (t.z) { const n = noteText(noteOf('x:' + t.z.id)); return `<b>${esc(t.z.name)}</b><div class="m">${esc(SZK[t.z.kind].name)} · ${DANGER[t.z.danger]}</div>` + (t.z.well ? `<div class="s">ความเป็นอยู่ของชุมชนในเขต ${t.z.well > 0 ? '+' : ''}${t.z.well}</div>` : '') + (n ? `<div class="lore">${esc(peekCut(n, 160))}</div>` : ''); }
  return '';
}
function peekStop() { cancelAnimationFrame(PK.raf); PK.raf = 0; PK.key = ''; PK.shown = false; peekEl.hidden = true; ringEl.hidden = true; }
function peekPlace(el, x, y, dx, dy) { const r = box.getBoundingClientRect(); el.style.left = Math.max(4, Math.min(r.width - el.offsetWidth - 4, x - r.left + dx)) + 'px'; el.style.top = Math.max(4, Math.min(r.height - el.offsetHeight - 4, y - r.top + dy)) + 'px'; }
function peekTick() {
  PK.raf = 0; if (!PK.key) return; const p = Math.min(1, (performance.now() - PK.t0) / PEEK_MS);
  if (p < 1) { ringEl.hidden = false; ringEl.style.setProperty('--p', (p * 360).toFixed(1) + 'deg'); peekPlace(ringEl, PK.x, PK.y, 12, 12); PK.raf = requestAnimationFrame(peekTick); return; }
  ringEl.hidden = true; const [mx, my] = toMap(PK.x, PK.y), t = peekTarget(mx, my); if (!t || t.key !== PK.key) { peekStop(); return; }
  peekEl.innerHTML = peekHTML(t); if (!peekEl.innerHTML) { peekStop(); return; } peekEl.hidden = false; PK.shown = true; peekPlace(peekEl, PK.x, PK.y, 16, 16);
}
cv.addEventListener('pointermove', e => {
  if (e.buttons || (act && act.k !== 'hover') || pinch || e.pointerType === 'touch') { if (PK.key) peekStop(); return; }
  const [mx, my] = toMap(e.clientX, e.clientY), t = peekTarget(mx, my);
  if (!t) { if (PK.key) peekStop(); return; }
  if (t.key === PK.key) { if (!PK.shown) { PK.x = e.clientX; PK.y = e.clientY; } return; }
  peekStop(); PK = { key: t.key, t0: performance.now(), x: e.clientX, y: e.clientY, raf: requestAnimationFrame(peekTick), shown: false };
});
for (const ev of ['pointerdown', 'pointerleave', 'wheel']) cv.addEventListener(ev, peekStop);
__on(window, 'keydown', e => { if (e.key === 'Escape') peekStop(); });
