// ---------- keys on the map, the culture brush's reach, and folds that stay open (v0.21.0) ----------
// The owner found (26 Nov 2026) that nothing told him to hold Shift to annex a unit of government: no one would know how. Every
// tool that does more than a plain click now says so in a strip on the map while it is in hand: the keys as small caps, what each
// does, and the key lit while it is held. In the government tab, with Shift held, the unit a click would annex is outlined.
const KH = { shift: false, html: '' };
{
  const mb = $('mapbox'); if (mb && !$('keyhint')) { const d = document.createElement('div'); d.id = 'keyhint'; d.className = 'keyhint'; d.hidden = true; d.setAttribute('aria-live', 'polite'); mb.appendChild(d); }
  const set = v => { if (KH.shift === v) return; KH.shift = v; keyHintNow(); requestDraw(); };
  __on(window, 'keydown', e => { if (e.key === 'Shift') set(true); });
  __on(window, 'keyup', e => { if (e.key === 'Shift') set(false); });
  __on(window, 'blur', () => set(false));
  __on(window, 'pointermove', e => { if (KH.shift !== e.shiftKey) set(e.shiftKey); });
}
// what the hand holds now: [keys, what they do, the modifier that lights it]
function keyHintList() {
  if (!editable) return [];
  if (mode === 'econ' && ecoTab === 'adm') {
    const sel = ADM.sel, NC = admNames(admCtx()), lv = ADM.lv;
    const out = [['คลิก', 'เลือก' + (lv === 3 ? 'รัฐ' : NC[lv]) + 'บนแผนที่']];
    if (!sel) out.push(['Shift + คลิก', 'ผนวก (เลือกหน่วยที่จะรับก่อน)', 'shift']);
    else if (sel.startsWith('S:')) { const s = ECO.states.find(x => x.id === sel.slice(2)); out.push(['Shift + คลิก', 'ผนวกหน่วยใต้ช่องพร้อมดินแดนเข้ากับ' + (s ? s.name : 'รัฐ'), 'shift']); }
    else { const u = admById(sel); if (u) { if (u.t === 0) out.push(['Shift + ลาก', 'ระบายช่องให้' + admTitle(u), 'shift']); else out.push(['Shift + คลิก', 'ผนวก' + NC[u.t - 1] + 'เข้ากับ' + admTitle(u), 'shift']); } }
    out.push(['Space + ลาก', 'เลื่อนแผนที่']); return out;
  }
  if (mode === 'econ' && (ecoTab === 'cul' || ecoTab === 'rel')) { const o = belById(ecoTab, BEL.pick); return [['ลาก', BEL.erase ? 'ลบ' + belName[ecoTab] : o ? 'ระบาย ' + o.name : 'เลือก' + belName[ecoTab] + 'ในแผงข้างก่อน'], ['คลิกขวาค้าง + ลาก', 'ลบ' + belName[ecoTab]], ['Space + ลาก', 'เลื่อนแผนที่']]; }
  if (mode === 'econ' && ecoTab === 'states' && ecoPaint != null) return [['ลาก', ecoPaint === '.' ? 'ลบเขตรัฐ' : 'ระบายเขตรัฐ'], ['Space + ลาก', 'เลื่อนแผนที่']];
  if (mode === 'econ' && ecoTab === 'orgs' && orgPick) { const o = ECO.orgs.find(x => x.id === orgPick); return o ? [['คลิกชุมชน', o.hq ? 'เพิ่มหรือถอนสาขาของ ' + o.name : 'ตั้งสำนักงานใหญ่ของ ' + o.name]] : []; }
  return [];
}
function keyHintNow() {
  const el = $('keyhint'); if (!el) return; const L = keyHintList();
  const html = L.map(([k, t, m]) => `<span class="kh${m === 'shift' && KH.shift ? ' on' : ''}">${k.split(' + ').map(x => `<kbd>${esc(x)}</kbd>`).join('+')} ${esc(t)}</span>`).join('');
  if (html !== KH.html) { KH.html = html; el.innerHTML = html; } el.hidden = !L.length;
}
{ const er = ecoRender; ecoRender = function () { const r = er.apply(this, arguments); keyHintNow(); return r; }; }
{ const sm = setMode; setMode = function () { const r = sm.apply(this, arguments); keyHintNow(); return r; }; }
// the unit a Shift and a click would annex, outlined under the pointer
{
  const top = drawOnTop; drawOnTop = function (c, px) {
    if (top) top(c, px); if (!KH.shift || !editable || mode !== 'econ' || ecoTab !== 'adm' || !ADM.sel || !cursor) return;
    const h = hexAt(cursor[0], cursor[1]); if (h < 0) return; let hs = [];
    if (ADM.sel.startsWith('S:')) { const ch = admChain(h), u = ch[2] || ch[1] || ch[0]; hs = u ? admIndex().hexes.get(u.id) || [] : [h]; }
    else { const P = admById(ADM.sel); if (!P) return; if (P.t === 0) hs = [h]; else { const u = admChain(h)[P.t - 1]; hs = u ? admIndex().hexes.get(u.id) || [] : []; } }
    if (!hs.length) return; c.save(); c.beginPath(); for (const i of hs) hexPath(c, i, 1); c.fillStyle = 'rgba(140,220,255,.18)'; c.fill(); c.setLineDash([4 * px, 3 * px]); c.lineWidth = 1.6 * px; c.strokeStyle = 'rgba(170,230,255,.95)'; c.stroke(); c.restore();
  };
}

// ---- the culture and faith brush shows its reach, as the terrain, climate and border brushes do ----
{
  const rn = reachNow; reachNow = function () {
    const r = rn(); if (r) return r;
    if (!cursor || pinch || !editable || spaceDown || (act && act.k === 'pan') || mode !== 'econ' || (ecoTab !== 'cul' && ecoTab !== 'rel')) return null;
    const o = belById(ecoTab, BEL.pick); if (!o && !BEL.erase) return null;
    const h = hexAt(cursor[0], cursor[1]); if (h < 0) return null; const n = BEL.n, all = brush(h, n), erase = BEL.erase;
    const cells = erase ? all : all.filter(i => !isW(eff(i))), c = !erase && /^#[0-9a-f]{6}$/i.test(o.col) ? o.col : null;
    return { h, n, tint: c ? [1, 3, 5].map(k => parseInt(c.slice(k, k + 2), 16)).join(',') : '236,236,236', cells, all: all.length };
  };
}

// ---- folds that stay as they were ----
// The owner found that ticking a box in some cards folded the card away (26 Nov 2026): a tick redraws the panel, and a fold the
// page does not remember came back in its first state. Around each redraw of the side panels, every fold is found again by its
// marks (or its place among its like) and set back the way the owner left it, as long as the panel still shows the same thing.
const foldKey = (root, d) => { const a = [...d.attributes].filter(x => x.name.startsWith('data-')).map(x => x.name + '=' + x.value).join('&'); if (a) return a; const s = d.querySelector(':scope > summary'); return 's=' + (s ? s.textContent.trim().slice(0, 40) : '') + '#' + [...root.querySelectorAll('details')].indexOf(d); };
function foldsNow(root) { if (!root) return null; const m = new Map(); for (const d of root.querySelectorAll('details')) m.set(foldKey(root, d), d.open); return m; }
function foldsBack(root, m) { if (!root || !m) return; for (const d of root.querySelectorAll('details')) { const k = foldKey(root, d); if (m.has(k) && d.open !== m.get(k)) d.open = m.get(k); } }
let FOLDSKIP = false;                                // the buttons that fold or open all the cards mean it
__on(document, 'click', e => { const b = e.target.closest ? e.target.closest('[data-a="stfold"]') : null; if (b) { FOLDSKIP = true; setTimeout(() => { FOLDSKIP = false; }, 0); } }, true);
function keepFolds(root, fn, same) { const m = FOLDSKIP ? null : foldsNow(root), k = same(); const r = fn(); if (m && same() === k) foldsBack(root, m); return r; }
{ const er = ecoRender; ecoRender = function () { return keepFolds($('ecobody'), () => er.apply(this, arguments), () => mode + '|' + ecoTab + '|' + ecoSel); }; }
{ const rf = refreshForm; refreshForm = function () { return keepFolds(document.getElementById('opts'), () => rf.apply(this, arguments), () => mode + '|' + sel); }; }
{ if (typeof renderTradeCard === 'function' && $('tradebody')) { const rt = renderTradeCard; renderTradeCard = function () { return keepFolds($('tradebody'), () => rt.apply(this, arguments), () => mode + '|' + tsel + '|' + tlsel + '|' + tstate); }; } }
