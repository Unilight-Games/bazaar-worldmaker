// ---------- features of the ground: oases and the small worlds within a kind of ground (v0.16.0) ----------
// The owner asked why an oasis, or any other small world inside a kind of ground, could not be made, and why the oasis that
// could be set down (as a point of lore, under the editing of text) did nothing for the land's goods though it should. His
// choices: features are painted over the hexes, as rivers lie over the ground, from the painting of the ground; a starting set
// after the real world, and kinds of his own; and a feature reaches the goods of its hex, whether fields may be laid there, the
// caravans' road, and how well people live and how many come to see it. The numbers are Claude's, in the numbers tab and on
// each kind's card.
Object.assign(ETUNE, {
  featWater: [0.4, 0, 0.9, 0.05, 'จุดพักน้ำ (เช่น โอเอซิส) ทำให้ช่วงที่แห้งแล้งของเส้นคาราวานที่ผ่านใกล้ถูกลงเป็นส่วนเท่านี้ และลดความอันตรายลงหนึ่งขั้น', 'ลักษณะพิเศษ'],
  featWellMax: [10, 0, 40, 1, 'ความเป็นอยู่ที่ลักษณะพิเศษในพื้นที่เก็บเกี่ยวของเมืองเพิ่มให้ได้มากที่สุด (แต้ม)', 'ลักษณะพิเศษ'],
});
const FEAT_BASE = {
  a: { name: 'โอเอซิส', col: '#4f9a8a', on: 'land', y: { grain: 1, protein: 0.3 }, farm: 1, water: 1, well: 2, tour: 0.5, g: 'oasis' },
  b: { name: 'ป่าชายเลน', col: '#3f6b4a', on: 'coast', y: { protein: 0.8, timber: 0.4, fuel: 0.3 }, farm: 0, water: 0, well: 0, tour: 0, g: 'mangrove' },
  c: { name: 'ดินภูเขาไฟ', col: '#8a5040', on: 'land', y: { grain: 0.6, stone: 0.4, ore: 0.2 }, farm: 1, water: 0, well: 0, tour: 0.2, g: 'volcanic' },
  d: { name: 'บ่อน้ำร้อน', col: '#8cc4d4', on: 'land', y: { herbs: 0.3 }, farm: 0, water: 0, well: 4, tour: 1, g: 'spring' },
  e: { name: 'แหล่งเกลือ', col: '#ece6d6', on: 'land', y: { salt: 1.2 }, farm: 0, water: 0, well: 0, tour: 0, g: 'salt' },
  f: { name: 'บึงพรุ', col: '#6a5640', on: 'land', y: { fuel: 1 }, farm: 0, water: 0, well: 0, tour: 0, g: 'peat' },
  g: { name: 'ทุ่งหญ้าชั้นดี', col: '#a6cc70', on: 'land', y: { protein: 0.8, cloth: 0.4 }, farm: 0, water: 0, well: 0, tour: 0, g: 'pasture' },
  h: { name: 'แนวปะการัง', col: '#e48a98', on: 'sea', y: { protein: 0.6, luxury: 0.2 }, farm: 0, water: 0, well: 0, tour: 0.5, g: 'reef' },
  i: { name: 'ถ้ำ', col: '#55505c', on: 'land', y: { stone: 0.3, ore: 0.3 }, farm: 0, water: 0, well: 0, tour: 0.5, g: 'cave' },
  // asked for next (v0.16.0): canyons, atolls, lagoons, volcanic islands, floodplains, and their like
  j: { name: 'หุบผาชัน', col: '#a5583c', on: 'land', y: { stone: 0.4, ore: 0.2 }, farm: 0, water: 0, well: 0, tour: 1, cross: 1, g: 'canyon' },
  k: { name: 'เกาะปะการังวงแหวน', col: '#7fd0c8', on: 'sea', y: { protein: 0.6, luxury: 0.15 }, farm: 0, water: 0, well: 0, tour: 0.6, g: 'atoll' },
  l: { name: 'ลากูน', col: '#5cc0c8', on: 'sea', y: { protein: 0.7, salt: 0.3 }, farm: 0, water: 0, well: 1, tour: 0.4, cross: -0.25, g: 'lagoon' },
  m: { name: 'เกาะภูเขาไฟ', col: '#6e4a40', on: 'sea', y: { grain: 0.3, stone: 0.3, ore: 0.2 }, farm: 0, water: 0, well: 0, tour: 0.8, g: 'vislet' },
  n: { name: 'ที่ราบลุ่มน้ำ', col: '#8ab86a', on: 'land', y: { grain: 0.8, protein: 0.2 }, farm: 1, water: 1, well: 0, tour: 0, g: 'flood' },
  o: { name: 'สามเหลี่ยมปากแม่น้ำ', col: '#9cc07a', on: 'coast', y: { grain: 0.6, protein: 0.5 }, farm: 1, water: 1, well: 0, tour: 0, g: 'delta' },
  p: { name: 'ฟยอร์ด', col: '#4a6a84', on: 'coast', y: { protein: 0.4, timber: 0.2 }, farm: 0, water: 0, well: 0, tour: 0.8, cross: -0.2, g: 'fjord' },
  q: { name: 'ภูเขาหินปูน', col: '#8a9a7a', on: 'land', y: { stone: 0.5, herbs: 0.1 }, farm: 0, water: 0, well: 0, tour: 0.8, cross: 0.4, g: 'karst' },
  r: { name: 'ที่ราบสูงยอดตัด', col: '#b0704c', on: 'land', y: { stone: 0.3, ore: 0.1 }, farm: 0, water: 0, well: 0, tour: 0.5, cross: 0.3, g: 'mesa' },
  // asked for next (v0.16.1): islands strewn over open sea, where the ground of the map is sea; the ground "หมู่เกาะ" is shallow sea full of islets already
  s: { name: 'หมู่เกาะกลางทะเล', col: '#78a86e', on: 'sea', y: { protein: 0.4, timber: 0.15, luxury: 0.05 }, farm: 0, water: 1, well: 0, tour: 0.4, cross: -0.1, g: 'isles' },
};
const FEAT_ON = { land: 'บนแผ่นดิน', coast: 'แผ่นดินริมทะเล', sea: 'ในทะเล', any: 'ที่ไหนก็ได้' };
const FEAT_CODES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const DRYB = new Set(['d', 'c', 'y', 'u']);
ECO.feat = new Array(N).fill('.'); ECO.fkinds = {};
let featStamp = 0, featPick = null, featSel = null;
function featKinds() {                                  // the kinds as they stand: the base's, with the owner's changes, and the owner's own
  const K = {};
  for (const [c, z] of Object.entries(FEAT_BASE)) { const o = ECO.fkinds[c] || {}; if (o.del) continue; K[c] = { ...z, ...o, y: o.y ? { ...o.y } : { ...z.y }, base: true, edited: !!ECO.fkinds[c] }; }
  for (const [c, o] of Object.entries(ECO.fkinds)) if (!FEAT_BASE[c] && !o.del) K[c] = { name: 'ลักษณะพิเศษใหม่', col: '#b08cd8', on: 'land', y: {}, farm: 0, water: 0, well: 0, tour: 0, g: '', ...o, y: { ...(o.y || {}) }, base: false };
  return K;
}
let FK = featKinds();
function featOk(k, i) {                                 // whether a kind may lie on this hex as the ground now stands
  if (!k || i < 0) return false; const b = eff(i);
  if (k.on === 'any') return true; if (k.on === 'sea') return isSea(b);
  if (isW(b)) return false; if (k.on !== 'coast') return true;
  for (let j = 0; j < 6; j++) { const v = NB[i * 6 + j]; if (v >= 0 && isSea(eff(v))) return true; } return false;
}
const featAt = i => { const c = ECO.feat[i]; if (!c || c === '.') return null; const k = FK[c]; return k && featOk(k, i) ? k : null; };
function featRegister() {                               // each kind's goods, named for the class and the feature, for the books and the cards
  for (const id of [...GBY.keys()]) if (id.startsWith('ft.')) GBY.delete(id);
  for (const [c, k] of Object.entries(FK)) for (const cat of Object.keys(k.y)) if (ECAT[cat]) GBY.set('ft.' + c + '.' + cat, { id: 'ft.' + c + '.' + cat, name: ECAT[cat].name + ' จาก' + k.name, cat });
}
function featChanged(tables) { FK = featKinds(); featRegister(); featStamp++; FEATW.key = -1; ecoChanged(!!tables); featCard(); featPalette(); }

// ---- the water a caravan can count on ----
const FEATW = { key: -1, near: new Uint8Array(N), any: false };
function featIndex() {
  const key = featStamp; if (FEATW.key === key) return FEATW;
  FEATW.near.fill(0); FEATW.any = false; FEATW.cross = false;
  for (let i = 0; i < N; i++) { const k = featAt(i); if (k && k.cross) FEATW.cross = true; if (!k || !k.water) continue; FEATW.any = true; FEATW.near[i] = 1; for (let j = 0; j < 6; j++) { const v = NB[i * 6 + j]; if (v >= 0) FEATW.near[v] = 1; } }
  FEATW.key = key; return FEATW;
}
function featRoute(L) {                                 // the share of a caravan's way that is dry ground, when it passes water on the way; 0 otherwise
  const st = L && L.states; if (!st || !st.length) return 0; const W = featIndex(); if (!W.any) return 0;
  let dry = 0, wet = false; for (const t of st) { if (t & 1) continue; const h = t >> 1; if (DRYB.has(eff(h))) dry++; if (W.near[h]) wet = true; }
  return wet ? dry / st.length : 0;
}
function featCross(L) {                                 // what the features a line passes through do to its cost: a canyon to be got round, a lagoon's calm water
  const st = L && L.states; if (!st || !st.length || !FEATW.cross) return 0; let s = 0;
  for (const t of st) { const k = featAt(t >> 1); if (k && k.cross) s += k.cross; }
  return s / st.length;
}
{ const lc = ecoLinkCost; ecoLinkCost = function (L, cities) { const c = lc(L, cities), r = featRoute(L), x = featCross(L); L.featDry = r; L.featCross = x; return c * (r > 0 ? 1 - TU('featWater') * r : 1) * Math.max(0.2, 1 + x); }; }
{ const ad = ecoAutoDanger; ecoAutoDanger = function (L) { const r = ad(L); if (r && r.lv > 0 && featRoute(L) >= 0.2) { r.lv--; r.water = true; } return r; }; }

// ---- the year: goods, fields, the eye of a visitor, and how well people live ----
function featProd(cities, prod, own, dist) {
  FEATW.key = -1; featIndex(); const n = cities.length;   // the ground may have changed under a feature since: looked at afresh each year
  for (const c of cities) c.feats = {};
  for (let i = 0; i < N; i++) {
    const code = ECO.feat[i]; if (code === '.') continue; const k = own[i]; if (k < 0 || k >= n) continue; const kd = featAt(i); if (!kd) continue;
    const c = cities[k], w = Math.max(0.5, 1 - 0.5 * dist[i] / Math.max(1, c.reach)); c.feats[code] = (c.feats[code] || 0) + w;
  }
  cities.forEach((c, k) => {
    for (const [code, w] of Object.entries(c.feats)) { const kd = FK[code]; for (const [cat, r] of Object.entries(kd.y)) { if (!ECAT[cat] || ECAT[cat].made || ECAT[cat].people || !(r > 0)) continue; const id = 'ft.' + code + '.' + cat; prod[k].set(id, (prod[k].get(id) || 0) + r * w * orgProd(c, cat) * socRaw(c, cat)); } }
  });
}
const featFarmAt = u => { const k = featAt(u); return !!(k && k.farm); };
{ const sp = socPrep; socPrep = function (cities) {         // a feature others come to see draws visitors as a mark of the map does, within three hexes
  sp(cities); featIndex(); let any = false; for (const k of Object.values(FK)) if (k.tour > 0) any = true; if (!any) return;
  for (const c of cities) {
    let t = 0, ring = [c.h]; const sn = new Set(ring);
    for (let d = 0; d <= 3 && ring.length; d++) { const nx = []; for (const u of ring) { const k = featAt(u); if (k && k.tour > 0) t += k.tour; for (let j = 0; j < 6; j++) { const v = NB[u * 6 + j]; if (v >= 0 && !sn.has(v)) { sn.add(v); nx.push(v); } } } ring = nx; }
    if (t > 0) { c.att = clamp(c.att + t / 6, 0, 1); c.featAtt = t; }
  }
}; }
{ const sa = socApply; socApply = function (rows) {       // what the features of a city's land add to how well its people live
  sa(rows); if (!ECON) return rows; const cap = TU('featWellMax');
  rows.forEach((r, k) => {
    const c = ECON.cities[k]; if (!c || !c.feats) return; let b = 0;
    for (const [code, w] of Object.entries(c.feats)) { const kd = FK[code]; if (kd && kd.well) b += kd.well * Math.min(1, w); }
    b = clamp(b, -cap, cap); if (Math.abs(b) < 0.5) return;
    r.well = clamp(r.well + b, 0, 100); if (r.wellWhy) r.wellWhy.push(['ลักษณะพิเศษในพื้นที่', b]);
  });
  return rows;
}; }

// ---- the document ----
{
  const ld = ecoLoad, sr = ecoSerial;
  ecoLoad = function (b) {
    ld(b); b = b || {};
    ECO.feat = new Array(N).fill('.'); ECO.fkinds = {};
    const okCode = c => typeof c === 'string' && c.length === 1 && (FEAT_BASE[c] || FEAT_CODES.includes(c));
    if (b.fkinds && typeof b.fkinds === 'object') for (const [c, o] of Object.entries(b.fkinds).slice(0, 60)) {
      if (!okCode(c) || !o || typeof o !== 'object') continue; const z = {};
      if (o.del) z.del = 1;
      if (typeof o.name === 'string') z.name = o.name.slice(0, 40);
      if (/^#[0-9a-f]{6}$/i.test(o.col || '')) z.col = o.col;
      if (FEAT_ON[o.on]) z.on = o.on;
      if (o.y && typeof o.y === 'object') { z.y = {}; for (const [cat, r] of Object.entries(o.y).slice(0, 30)) if (typeof cat === 'string' && cat.length <= 40 && +r > 0) z.y[cat] = Math.min(20, +r); }
      for (const f of ['farm', 'water']) if (o[f] != null) z[f] = o[f] ? 1 : 0;
      if (o.well != null) z.well = ecoNum(o.well, -20, 20, 0); if (o.tour != null) z.tour = ecoNum(o.tour, 0, 3, 0); if (o.cross != null) z.cross = ecoNum(o.cross, -0.9, 3, 0);
      ECO.fkinds[c] = z;
    }
    if (b.feat && typeof b.feat === 'object') for (const [c, list] of Object.entries(b.feat)) { if (!okCode(c) || !Array.isArray(list)) continue; for (const i of list.slice(0, N)) if (Number.isInteger(i) && i >= 0 && i < N) ECO.feat[i] = c; }
    FK = featKinds(); featRegister(); featStamp++; FEATW.key = -1;
    if (typeof featCard === 'function') { featCard(); featPalette(); }
  };
  ecoSerial = function () {
    const o = sr(), f = {}; let any = false;
    for (let i = 0; i < N; i++) { const c = ECO.feat[i]; if (c !== '.') { (f[c] || (f[c] = [])).push(i); any = true; } }
    if (any) o.feat = f; if (Object.keys(ECO.fkinds).length) o.fkinds = JSON.parse(JSON.stringify(ECO.fkinds));
    return o;
  };
}
{ const ap = ecoApply; ecoApply = function () {
  ap(); FK = featKinds(); featRegister();
  for (const c of [...SOC_BASIC]) if (/^u[a-z0-9]/.test(c)) SOC_BASIC.delete(c);   // a class of the owner's own may be counted among the basics (v0.16.2)
  for (const u of ECO.ucats) if (u.basic && ECAT[u.id]) SOC_BASIC.add(u.id);
}; }
FK = featKinds(); featRegister();

// ---- painting: from the painting of the ground, a row of its own ----
{ const ap = applyOp; applyOp = function (op, dir, fx) { if (op.k !== 'ft') return ap(op, dir, fx); for (const [i, a, b] of op.ch) ECO.feat[i] = dir > 0 ? b : a; featChanged(false); }; }
let featAct = null;
function featPaintAt(e) {
  const [mx, my] = toMap(e.clientX, e.clientY), h = hexAt(mx, my); if (h < 0) return;
  const want = featPick === 'x' ? '.' : featPick, k = want === '.' ? null : FK[want];
  for (const i of brush(h, bsize)) {
    if (want !== '.' && !featOk(k, i)) continue; const was = featAct.ch.has(i) ? featAct.ch.get(i)[0] : ECO.feat[i];
    if (ECO.feat[i] === want) continue; featAct.ch.set(i, [was, want]); ECO.feat[i] = want;
  }
  requestDraw();
}
box.addEventListener('pointerdown', e => {
  if (mode !== 'terrain' || featPick == null || !editable || e.button !== 0 || spaceDown || e.target !== cv) return;
  e.stopPropagation(); e.preventDefault(); featAct = { ch: new Map() }; featPaintAt(e);
}, true);
__on(window, 'pointermove', e => { if (featAct) featPaintAt(e); });
__on(window, 'pointerup', () => {
  if (!featAct) return; const ch = [...featAct.ch].map(([i, [a, b]]) => [i, a, b]).filter(x => x[1] !== x[2]); featAct = null;
  if (ch.length) { pushOp({ k: 'ft', ch }); featChanged(false); }
});
{ const sb = setBrush; setBrush = function (b) { featPick = null; featPalSync(); return sb(b); }; }
function featPalSync() {
  for (const s of document.querySelectorAll('#featPal .sw')) s.setAttribute('aria-pressed', String(s.dataset.f === featPick));
  if (featPick != null) { for (const s of document.querySelectorAll('#pal .sw')) s.setAttribute('aria-pressed', 'false'); $('bname').textContent = featPick === 'x' ? 'กำลังลบลักษณะพิเศษ' : 'กำลังวาง' + (FK[featPick] ? FK[featPick].name : ''); }
}
function featPalette() {
  const p = $('featPal'); if (!p) return;
  p.innerHTML = Object.entries(FK).map(([c, k]) => `<button type="button" class="sw" data-f="${c}" aria-pressed="false" title="${esc(featSum(k))}"><i style="background:${k.col}"></i>${esc(k.name)}</button>`).join('')
    + `<button type="button" class="sw" data-f="x" aria-pressed="false"><i class="rs"></i>ลบลักษณะพิเศษ</button>`;
  for (const s of p.querySelectorAll('.sw')) s.onclick = () => { featPick = s.dataset.f; featSel = featPick !== 'x' ? featPick : featSel; featPalSync(); featCard(); };
  featPalSync();
}
const featSum = k => [Object.entries(k.y).filter(([c, r]) => ECAT[c] && r > 0).map(([c, r]) => `${ECAT[c].name} ${r}`).join(' · ') || 'ไม่ให้ผลผลิต', k.farm ? 'ตั้งไร่ได้' : '', k.water ? 'จุดพักน้ำคาราวาน' : '', k.well ? `ความเป็นอยู่ ${k.well > 0 ? '+' : ''}${k.well}` : '', k.tour ? `ดึงนักท่องเที่ยว ${k.tour}` : '', k.cross ? `ทางที่ผ่าน${k.cross > 0 ? 'ช้าลง' : 'เร็วขึ้น'} ${Math.round(Math.abs(k.cross) * 100)}%` : ''].filter(Boolean).join(' · ');

// ---- on the map ----
function featHex(c, i, col) { c.beginPath(); for (let a = 0; a < 6; a++) { const t = a * Math.PI / 3, x = CX[i] + R * 0.94 * Math.cos(t), y = CY[i] + R * 0.94 * Math.sin(t); if (a) c.lineTo(x, y); else c.moveTo(x, y); } c.closePath(); c.fillStyle = col; c.fill(); }
const FEATG = {
  oasis(c, x, y) { POINTFN.oasis(c, x, y + 1); },
  mangrove(c, x, y) { ell(c, x, y + 1.6, 3.4, 1, 'rgb(90,130,150)'); for (const [dx, dy] of [[-2, -0.6], [0, -1.4], [2, -0.6]]) { seg(c, x + dx - 0.8, y + 1.6, x + dx, y + dy + 1, 'rgb(70,58,44)', 0.35); seg(c, x + dx + 0.8, y + 1.6, x + dx, y + dy + 1, 'rgb(70,58,44)', 0.35); ell(c, x + dx, y + dy - 0.4, 1.4, 1.1, 'rgb(52,94,62)'); } },
  volcanic(c, x, y) { poly(c, [[x - 3.6, y + 2], [x - 0.9, y - 2.4], [x + 0.9, y - 2.4], [x + 3.6, y + 2]], 'rgb(96,66,54)', 'rgb(52,36,30)'); ell(c, x, y - 2.4, 1, 0.45, 'rgb(214,98,52)'); },
  spring(c, x, y) { ell(c, x, y + 1, 3, 1.4, 'rgb(150,206,222)', 'rgb(70,110,124)'); for (const dx of [-1.4, 0, 1.4]) { c.beginPath(); c.moveTo(x + dx, y - 0.2); c.quadraticCurveTo(x + dx + 0.9, y - 1.6, x + dx, y - 2.8); c.strokeStyle = 'rgba(240,244,246,.9)'; c.lineWidth = 0.4; c.stroke(); } },
  salt(c, x, y) { poly(c, [[x - 3.2, y + 0.4], [x - 1.4, y - 1.6], [x + 0.6, y - 0.9], [x - 0.6, y + 1.6]], 'rgb(246,242,232)', 'rgb(160,150,130)'); poly(c, [[x + 0.4, y + 0.2], [x + 2.6, y - 1], [x + 3.2, y + 1.2], [x + 1.2, y + 1.8]], 'rgb(238,232,220)', 'rgb(160,150,130)'); },
  peat(c, x, y) { ell(c, x, y + 0.6, 3.2, 1.6, 'rgb(96,78,56)', 'rgb(58,46,32)'); for (const dx of [-1.6, 0, 1.6]) seg(c, x + dx - 0.5, y - 0.2, x + dx + 0.5, y + 1.4, 'rgb(58,46,32)', 0.35); },
  pasture(c, x, y) { for (const [dx, dy] of [[-2.2, 0.8], [0.4, -0.6], [2.2, 1]]) ell(c, x + dx, y + dy, 1.2, 0.7, 'rgb(132,176,84)'); for (const [dx, dy] of [[-0.8, 1.4], [1.4, -0.2]]) ell(c, x + dx, y + dy, 0.6, 0.42, 'rgb(244,242,236)', 'rgb(90,90,90)'); },
  reef(c, x, y) { for (const [dx, dy, r] of [[-2, 0.6, 1.3], [0.6, -0.6, 1.1], [2.2, 0.8, 1.2]]) { ell(c, x + dx, y + dy, r, r * 0.6, 'rgb(232,136,150)', 'rgb(150,70,84)'); } },
  canyon(c, x, y) { poly(c, [[x - 3.6, y - 2.2], [x - 1.2, y - 0.6], [x - 2, y + 0.4], [x + 0.4, y + 1.2], [x - 0.2, y + 2.4], [x + 0.9, y + 2.4], [x + 1.6, y + 1], [x - 0.6, y + 0.1], [x + 0.2, y - 0.7], [x - 2.4, y - 2.2]], 'rgb(70,36,24)', 'rgb(150,84,56)'); seg(c, x + 1.4, y - 2.4, x + 3.4, y - 0.6, 'rgb(120,64,40)', 0.5); },
  atoll(c, x, y) { ell(c, x, y, 3.4, 2.3, 'rgb(230,214,170)', 'rgb(150,130,90)'); ell(c, x, y, 2.2, 1.4, 'rgb(120,206,206)'); ell(c, x - 2.6, y - 1, 0.8, 0.6, 'rgb(70,130,70)'); ell(c, x + 2.5, y + 0.8, 0.7, 0.55, 'rgb(70,130,70)'); },
  lagoon(c, x, y) { ell(c, x, y + 0.2, 3.4, 2, 'rgb(226,210,168)'); ell(c, x, y + 0.2, 2.7, 1.45, 'rgb(104,196,204)'); seg(c, x - 1.2, y + 0.2, x + 0.6, y + 0.2, 'rgba(240,250,250,.8)', 0.3); },
  vislet(c, x, y) { ell(c, x, y + 1.6, 3.6, 1.2, 'rgb(214,196,150)'); poly(c, [[x - 2.8, y + 1.6], [x - 0.7, y - 2.2], [x + 0.7, y - 2.2], [x + 2.8, y + 1.6]], 'rgb(88,62,52)', 'rgb(46,32,28)'); ell(c, x, y - 2.2, 0.8, 0.35, 'rgb(220,96,50)'); },
  flood(c, x, y) { ell(c, x - 1.6, y - 1, 1.5, 0.9, 'rgb(118,168,82)'); ell(c, x + 1.7, y + 1.1, 1.5, 0.9, 'rgb(118,168,82)'); for (const dy of [-0.2, 1.4]) { c.beginPath(); c.moveTo(x - 3.2, y + dy); c.quadraticCurveTo(x - 1.6, y + dy - 1, x, y + dy); c.quadraticCurveTo(x + 1.6, y + dy + 1, x + 3.2, y + dy); c.strokeStyle = 'rgb(84,140,176)'; c.lineWidth = 0.45; c.stroke(); } },
  delta(c, x, y) { ell(c, x, y + 0.6, 3.2, 2, 'rgb(150,182,104)'); seg(c, x, y - 2.6, x, y - 0.4, 'rgb(76,132,170)', 0.6); for (const dx of [-2.4, -0.8, 0.8, 2.4]) seg(c, x, y - 0.4, x + dx, y + 2.4, 'rgb(76,132,170)', 0.45); },
  fjord(c, x, y) { poly(c, [[x - 3.4, y - 2.6], [x - 0.8, y - 2.6], [x - 0.4, y + 2.6], [x - 3.4, y + 2.6]], 'rgb(120,126,120)', 'rgb(70,74,70)'); poly(c, [[x + 0.8, y - 2.6], [x + 3.4, y - 2.6], [x + 3.4, y + 2.6], [x + 0.4, y + 2.6]], 'rgb(120,126,120)', 'rgb(70,74,70)'); poly(c, [[x - 0.8, y - 2.6], [x + 0.8, y - 2.6], [x + 0.4, y + 2.6], [x - 0.4, y + 2.6]], 'rgb(50,86,118)'); },
  karst(c, x, y) { for (const [dx, hh] of [[-2.2, 3], [0, 4.2], [2.2, 2.6]]) { poly(c, [[x + dx - 1, y + 2], [x + dx - 0.8, y + 2 - hh], [x + dx + 0.8, y + 2 - hh], [x + dx + 1, y + 2]], 'rgb(140,152,124)', 'rgb(70,80,62)'); ell(c, x + dx, y + 2 - hh, 0.9, 0.5, 'rgb(96,132,80)'); } },
  mesa(c, x, y) { poly(c, [[x - 3.6, y + 2], [x - 2.2, y - 1.8], [x + 2.2, y - 1.8], [x + 3.6, y + 2]], 'rgb(178,104,70)', 'rgb(96,52,34)'); seg(c, x - 2.6, y - 0.4, x + 2.6, y - 0.4, 'rgb(140,76,50)', 0.4); seg(c, x - 3, y + 0.8, x + 3, y + 0.8, 'rgb(140,76,50)', 0.4); },
  isles(c, x, y) { for (const [dx, dy, r] of [[-2.2, -0.8, 1.2], [0.6, 0.9, 1.5], [2.4, -1.2, 0.9]]) { ell(c, x + dx, y + dy, r, r * 0.7, 'rgb(212,196,150)'); ell(c, x + dx, y + dy - 0.15, r * 0.65, r * 0.45, 'rgb(98,146,84)'); } },
  cave(c, x, y) { poly(c, [[x - 3.4, y + 1.8], [x - 2.4, y - 1.6], [x, y - 2.6], [x + 2.4, y - 1.6], [x + 3.4, y + 1.8]], 'rgb(130,122,110)', 'rgb(70,64,58)'); ell(c, x, y + 0.9, 1.4, 1.5, 'rgb(34,30,36)'); },
};
// v0.18.5: the owner found the features standing out too much, and asked for them to sit in the ground the way the fields and the
// mines of the communities do. A feature now tints its hexes toward its colour on a small sheet laid over the map smoothly, so the
// edges melt into the ground around and the trees and peaks under it still show; its sign is drawn smaller and fainter, and in a
// wide patch only on about half of its hexes. FEAT_TINT is how far the ground goes toward the feature's colour (Claude's number).
const FEAT_TINT = 0.55, FEAT_ALPHA = 0.5, FEAT_SHEET = 6;
let featCv = null, featKey = '';
const featRGB = h => { const n = parseInt(String(h).slice(1), 16); return [n >> 16, n >> 8 & 255, n & 255]; };
const featGround = b => RCOL[b] || (b === 'S' ? [44, 74, 100] : b === 'L' ? [74, 118, 146] : RCOL.g);
function featSheet() {
  let hsh = 0; for (let i = 0; i < N; i++) if (ECO.feat[i] !== '.') hsh = (Math.imul(hsh, 31) + i * 131 + ECO.feat[i].charCodeAt(0)) | 0;   // a number, not a string: this runs every frame
  const key = featStamp + '|' + painted.size + '|' + hsh;
  if (key === featKey) return featCv;
  featKey = key;
  if (!featCv) { featCv = document.createElement('canvas'); featCv.width = Math.max(1, Math.ceil(G.w / FEAT_SHEET)); featCv.height = Math.max(1, Math.ceil(G.h / FEAT_SHEET)); }
  const c = featCv.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, featCv.width, featCv.height); c.setTransform(1 / FEAT_SHEET, 0, 0, 1 / FEAT_SHEET, 0, 0);
  for (let i = 0; i < N; i++) { const k = featAt(i); if (!k) continue; c.beginPath(); hexPath(c, i, 1.08); c.fillStyle = jit(landMix(featGround(eff(i)), featRGB(k.col), FEAT_TINT), i, 8); c.fill(); }
  return featCv;
}
function featDraw(c) {
  let any = false; for (let i = 0; i < N; i++) if (ECO.feat[i] !== '.') { any = true; break; } if (!any) return;
  const sh = featSheet();
  c.save(); c.globalAlpha = FEAT_ALPHA; c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high'; c.drawImage(sh, 0, 0, sh.width * FEAT_SHEET, sh.height * FEAT_SHEET); c.globalAlpha = 0.85;
  for (let i = 0; i < N; i++) {
    const k = featAt(i); if (!k) continue; const fn = FEATG[k.g];
    let same = 0; for (let j = 0; j < 6; j++) { const v = NB[i * 6 + j]; if (v >= 0 && ECO.feat[v] === ECO.feat[i]) same++; }
    const r = rng(i * 13 + 5); if (same >= 3 && r() < 0.5) continue;             // in a wide patch, a sign on about half of it
    c.save(); c.translate(CX[i] + (r() - 0.5) * 0.5 * R, CY[i] + (r() - 0.5) * 0.4 * R); c.scale(0.95, 0.95);
    if (fn) fn(c, 0, 0); else poly(c, [[0, -2.6], [2.2, 0], [0, 2.6], [-2.2, 0]], k.col, 'rgba(20,20,24,.8)');
    c.restore();
  }
  c.restore();
}
{ const dg = drawOverGround; drawOverGround = function (c, w, h, live) { if (dg) dg(c, w, h, live); featDraw(c); }; }
{ const lt = landTipHTML; landTipHTML = function (id) { const k = featAt(id); return lt(id) + (k ? `<div class="s">ลักษณะพิเศษ: ${esc(k.name)} <span class="w">${esc(featSum(k))}</span></div>` : ''); }; }

// ---- the card: the kinds, what each does, and kinds of one's own ----
function featCount() { const n = {}; for (let i = 0; i < N; i++) { const c = ECO.feat[i]; if (c !== '.' && featAt(i)) n[c] = (n[c] || 0) + 1; } return n; }
function featCard() {
  const card = $('featcard'), body = $('featbody'); if (!card || !body) return; card.hidden = mode !== 'terrain'; if (card.hidden) return;
  const n = featCount(), dis = editable ? '' : ' disabled';
  let h = `<p class="hint" style="margin-top:0">เลือกลักษณะพิเศษในแถว "ลักษณะพิเศษ" ของหน้าต่างตัวเลือก แล้วระบายทับช่องบนแผนที่ ขนาดแปรงใช้ตัวเดียวกับภูมิประเทศ ลักษณะพิเศษให้ผลผลิตกับเมืองที่เก็บเกี่ยวช่องนั้น</p>`
    + `<div class="btns" style="margin:0 0 8px"><button type="button" class="btn" data-fa="new"${dis}>เพิ่มลักษณะพิเศษชนิดใหม่</button></div>`;
  for (const [c, k] of Object.entries(FK)) {
    const open = featSel === c;
    h += `<details class="tfold fk" data-fk="${c}"${open ? ' open' : ''}><summary><i class="sdot" style="background:${k.col}"></i>${esc(k.name)} <small>${n[c] || 0} ช่อง</small></summary>`
      + `<div class="tr w">${esc(featSum(k))}</div>`
      + `<div class="erow"><label>ชื่อ <input type="text" data-ff="name" maxlength="40" value="${esc(k.name)}"${dis}></label><label>สี <input type="color" data-ff="col" value="${k.col}"${dis}></label></div>`
      + `<div class="erow"><label>วางได้ <select data-ff="on"${dis}>${Object.entries(FEAT_ON).map(([v, t]) => `<option value="${v}"${v === k.on ? ' selected' : ''}>${t}</option>`).join('')}</select></label></div>`
      + `<div class="erow"><label><input type="checkbox" data-ff="farm"${k.farm ? ' checked' : ''}${dis}> ตั้งไร่ได้</label><label><input type="checkbox" data-ff="water"${k.water ? ' checked' : ''}${dis}> จุดพักน้ำของคาราวาน</label></div>`
      + `<div class="erow"><label>ความเป็นอยู่ <input type="number" data-ff="well" min="-20" max="20" step="1" value="${k.well || 0}"${dis}> แต้ม</label><label>ดึงนักท่องเที่ยว <input type="number" data-ff="tour" min="0" max="3" step="0.1" value="${k.tour || 0}"${dis}></label></div>`
      + `<div class="erow"><label title="บวกคือเส้นทางที่ผ่านช่องนี้ช้าลง ลบคือเร็วขึ้น เช่น หุบผาชันต้องอ้อม ลากูนน้ำนิ่ง">เส้นทางผ่านช่องนี้ <input type="number" data-ff="cross" min="-90" max="300" step="5" value="${Math.round((k.cross || 0) * 100)}"${dis}> %</label></div>`
      + `<div class="tr"><b>ผลผลิตต่อช่อง</b> <span class="w">หน่วยต่อปี ก่อนคูณประสิทธิภาพการเก็บเกี่ยว</span></div>`
      + Object.entries(k.y).filter(([cat]) => ECAT[cat]).map(([cat, r]) => `<div class="erow"><span class="lbl">${esc(ECAT[cat].name)}</span><input type="number" data-fy="${cat}" min="0" max="20" step="0.05" value="${r}"${dis}><button type="button" class="btn warn" data-fa="ydel" data-cat="${cat}"${dis}>เอาออก</button></div>`).join('')
      + `<div class="erow"><select data-fa="yadd"${dis}><option value="">เพิ่มผลผลิต…</option>${ERAW.filter(cat => !(cat in k.y) && !ECAT[cat].people).map(cat => `<option value="${cat}">${esc(ECAT[cat].name)}</option>`).join('')}</select></div>`
      + `<div class="btns">${k.base ? `<button type="button" class="btn" data-fa="reset"${k.edited ? '' : ' disabled'}${dis}>คืนค่าตั้งต้น</button>` : ''}<button type="button" class="btn warn" data-fa="del"${dis}>${k.base ? 'ซ่อนชนิดนี้' : 'ลบชนิดนี้'}</button></div></details>`;
  }
  const hid = Object.keys(FEAT_BASE).filter(c => ECO.fkinds[c] && ECO.fkinds[c].del);
  if (hid.length) h += `<div class="erow"><span class="lbl">ชนิดที่ซ่อนไว้</span>${hid.map(c => `<button type="button" class="btn" data-fa="unhide" data-c="${c}"${dis}>${esc(FEAT_BASE[c].name)}</button>`).join('')}</div>`;
  h += `<p class="note">ผลของลักษณะพิเศษ: ผลผลิตของช่องไปเข้าเมืองที่เก็บเกี่ยวช่องนั้น (คูณประสิทธิภาพการเก็บเกี่ยวต่อช่อง) ชนิดที่ตั้งไร่ได้ทำให้แผนผังที่ดินวางไร่ลงช่องนั้นได้แม้เป็นทะเลทราย จุดพักน้ำทำให้ช่วงที่แห้งแล้งของเส้นคาราวานที่ผ่านใกล้ถูกลงร้อยละ ${ecoPc(TU('featWater'))} และลดความอันตรายหนึ่งขั้น ลักษณะพิเศษที่ตั้งค่าเส้นทางไว้ทำให้เส้นคาราวานและเส้นเรือที่ผ่านช่องนั้นช้าลงหรือเร็วขึ้นตามสัดส่วนของทางที่ผ่าน ความเป็นอยู่บวกให้เมืองที่มีลักษณะพิเศษในพื้นที่เก็บเกี่ยว (รวมได้ไม่เกิน ${TU('featWellMax')} แต้ม) และนักท่องเที่ยวนับลักษณะพิเศษในสามช่องรอบเมือง</p>`;
  body.innerHTML = h;
}
const featEdit = (c, f) => { const o = ECO.fkinds[c] || (ECO.fkinds[c] = {}); f(o, FK[c]); featChanged(true); };
$('featbody') && $('featbody').addEventListener('change', e => {
  if (!editable) return; const el = e.target, d = el.closest('[data-fk]'); if (!d) return; const c = d.dataset.fk; featSel = c;
  if (el.dataset.ff) { const f = el.dataset.ff; featEdit(c, o => { o[f] = f === 'farm' || f === 'water' ? (el.checked ? 1 : 0) : f === 'well' ? ecoNum(el.value, -20, 20, 0) : f === 'tour' ? ecoNum(el.value, 0, 3, 0) : f === 'cross' ? ecoNum(+el.value / 100, -0.9, 3, 0) : f === 'name' ? (el.value.trim() || FK[c].name).slice(0, 40) : f === 'on' ? (FEAT_ON[el.value] ? el.value : 'land') : /^#[0-9a-f]{6}$/i.test(el.value) ? el.value : FK[c].col; }); }
  else if (el.dataset.fy) featEdit(c, (o, k) => { o.y = { ...k.y, [el.dataset.fy]: ecoNum(el.value, 0, 20, 0) }; if (!(o.y[el.dataset.fy] > 0)) delete o.y[el.dataset.fy]; });
  else if (el.dataset.fa === 'yadd' && el.value) featEdit(c, (o, k) => { o.y = { ...k.y, [el.value]: 0.3 }; });
});
$('featbody') && $('featbody').addEventListener('click', e => {
  const el = e.target.closest ? e.target.closest('button[data-fa]') : null; if (!el || !editable) return; const a = el.dataset.fa, d = el.closest('[data-fk]'), c = d ? d.dataset.fk : null;
  if (a === 'new') { const code = [...FEAT_CODES].find(x => !ECO.fkinds[x]); if (!code) return; ECO.fkinds[code] = { name: 'ลักษณะพิเศษใหม่', col: '#b08cd8', on: 'land', y: {}, farm: 0, water: 0, well: 0, tour: 0 }; featSel = code; featChanged(true); }
  else if (a === 'ydel' && c) featEdit(c, (o, k) => { o.y = { ...k.y }; delete o.y[el.dataset.cat]; });
  else if (a === 'reset' && c) { delete ECO.fkinds[c]; featChanged(true); }
  else if (a === 'del' && c) { if (FEAT_BASE[c]) ECO.fkinds[c] = { ...(ECO.fkinds[c] || {}), del: 1 }; else delete ECO.fkinds[c]; if (featPick === c) featPick = null; featChanged(true); }
  else if (a === 'unhide') { const o = ECO.fkinds[el.dataset.c]; if (o) { delete o.del; if (!Object.keys(o).length) delete ECO.fkinds[el.dataset.c]; } featChanged(true); }
});
$('featbody') && $('featbody').addEventListener('toggle', e => { const d = e.target; if (d.dataset && d.dataset.fk && d.open) featSel = d.dataset.fk; }, true);
new MutationObserver(() => featCard()).observe($('mapbox'), { attributes: true, attributeFilter: ['data-mode'] });
featPalette(); featCard();

// ---- the cards of the trade view ----
{ const sc = socCityHTML; socCityHTML = function (k) {
  const h = sc(k), c = ECON && ECON.cities[k]; if (!c || !c.feats || !Object.keys(c.feats).length) return h;
  const add = `<div class="tr">ลักษณะพิเศษในพื้นที่เก็บเกี่ยว <span class="w">${Object.entries(c.feats).map(([code, w]) => `${esc((FK[code] || {}).name || code)} ${w >= 0.95 ? Math.round(w) : w.toFixed(1)}`).join(' · ')}${c.featAtt ? ' · ดึงนักท่องเที่ยว' : ''}</span></div>`, at = h.indexOf('<div class="optrow"><span class="lbl">ระเบียบงาน');
  return at >= 0 ? h.slice(0, at) + add + h.slice(at) : h + add;
}; }
{ const tl = tradeLinkHTML; tradeLinkHTML = function (L) { let h = tl(L); if (L && Math.abs(L.featCross || 0) >= 0.005) h += `<div class="tr">ผ่านลักษณะพิเศษ <span class="w">ทาง${L.featCross > 0 ? 'แพงขึ้น' : 'ถูกลง'}ร้อยละ ${ecoPc(Math.abs(L.featCross))}</span></div>`; return L && L.featDry > 0 ? h + `<div class="tr">ผ่านจุดพักน้ำ <span class="w">ช่วงที่แห้งแล้ง (ร้อยละ ${ecoPc(L.featDry)} ของทาง) ถูกลงร้อยละ ${ecoPc(TU('featWater'))}${L.dauto && L.dauto.water ? ' และอันตรายลดหนึ่งขั้น' : ''}</span></div>` : h; }; }

// ---- laid by rule (v0.16.1): the owner asked for a button that sets the features down from the ground as the map has it ----
// Each kind has a rule read off the ground, the rivers, the mountains, the sea and the climate: where it may be, how likely it
// is there, and how far apart two of a kind stand. Hexes that already carry a feature are left alone; the whole is one step of
// undo. The rules and their chances are Claude's.
function featAuto(amt, seed) {
  const A = climEnsure(), g = i => eff(i), land = i => !isW(g(i)), sea = i => isSea(g(i));
  const nbs = i => { const o = []; for (let j = 0; j < 6; j++) { const v = NB[i * 6 + j]; if (v >= 0) o.push(v); } return o; };
  const bfs = src => { const d = new Uint16Array(N).fill(999), q = []; for (let i = 0; i < N; i++) if (src(i)) { d[i] = 0; q.push(i); } for (let h = 0; h < q.length; h++) { const u = q[h]; for (const v of nbs(u)) if (d[v] > d[u] + 1) { d[v] = d[u] + 1; q.push(v); } } return d; };
  const dM = bfs(i => g(i) === 'M'), dL = bfs(land);
  // How warm a hex is for this map, from 0 (its coldest land) to 1 (its warmest), and for the sea the nearest land's: the maps'
  // climates are scaled each their own way (Gresland's winters read far colder than a new map's), so warmth is ranked within the map.
  const tw = new Float32Array(N), seen = new Uint8Array(N), q = [], vals = [];
  for (let i = 0; i < N; i++) if (land(i) && Number.isFinite(A.tw[i]) && Number.isFinite(A.ts[i])) vals.push([A.tw[i] + A.ts[i], i]);
  vals.sort((a, b) => a[0] - b[0]); vals.forEach(([, i], k) => { tw[i] = vals.length > 1 ? k / (vals.length - 1) : 0.5; seen[i] = 1; q.push(i); });
  for (let h = 0; h < q.length; h++) { const u = q[h]; for (const v of nbs(u)) if (!seen[v]) { seen[v] = 1; tw[v] = tw[u]; q.push(v); } }
  const WARM = 'jvwrp', COLD = 'ftnk';
  const river = i => (RV[i] === '1' && shownAt(i)) || URVH.has(i), DRY = 'dcyu', near = (i, f) => nbs(i).some(f), count = (i, f) => nbs(i).filter(f).length;
  const RULE = {
    a: [i => g(i) === 'd' && count(i, v => DRY.includes(g(v))) >= 4 && !river(i), 0.035, 5],
    b: [i => 'jwmvp'.includes(g(i)) && near(i, sea) && tw[i] >= 0.6, 0.15, 2],
    c: [i => land(i) && g(i) !== 'M' && dM[i] === 1 && !DRY.includes(g(i)), 0.025, 6],
    d: [i => land(i) && g(i) !== 'M' && dM[i] === 1, 0.012, 8],
    e: [i => DRY.includes(g(i)) && (near(i, v => g(v) === 'L') || count(i, v => DRY.includes(g(v))) === 6), 0.04, 7],
    f: [i => 'mwt'.includes(g(i)) && tw[i] <= 0.45 && near(i, v => 'ftnkL'.includes(g(v))), 0.08, 4],
    g: [i => 'ghes'.includes(g(i)) && (river(i) || near(i, v => g(v) === 'L')), 0.05, 4],
    h: [i => g(i) === 'S' && near(i, land) && tw[i] >= 0.65 && near(i, v => WARM.includes(g(v)) || 'dsv'.includes(g(v))), 0.12, 3],
    i: [i => land(i) && g(i) !== 'M' && dM[i] === 1, 0.01, 8],
    j: [i => 'dcys'.includes(g(i)) && dM[i] <= 2 && g(i) !== 'M' && (river(i) ? true : hash(i, 61) < 0.15), 0.15, 4],
    k: [i => g(i) === 'S' && dL[i] >= 3 && dL[i] <= 8 && tw[i] >= 0.75, 0.02, 8],
    l: [i => g(i) === 'S' && (count(i, land) >= 3 || near(i, v => g(v) === 'i')), 0.06, 5],
    m: [i => g(i) === 'S' && dL[i] >= 4, 0.004, 12],
    n: [i => 'gposvem'.includes(g(i)) && river(i) && dM[i] >= 3, 0.06, 3],
    o: [i => land(i) && river(i) && near(i, sea), 0.6, 3],
    p: [i => land(i) && near(i, sea) && near(i, v => g(v) === 'M') && tw[i] <= 0.35 && (COLD.includes(g(i)) || near(i, v => COLD.includes(g(v)))), 0.4, 3],
    q: [i => 'jofkae'.includes(g(i)) && dM[i] === 1 && tw[i] >= 0.4, 0.025, 6],
    r: [i => 'dcys'.includes(g(i)) && dM[i] >= 1 && dM[i] <= 3 && !river(i), 0.025, 6],
    s: [i => g(i) === 'S' && dL[i] >= 2 && dL[i] <= 4, 0.01, 7],
  };
  function hash(i, k) { let h = (i * 374761393 + k * 668265263 + seed * 1274126177) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; h ^= h >>> 16; return (h >>> 0) / 4294967296; }
  const ch = [], put = new Map(), byKind = {};
  for (const [code, [ok, p, sp]] of Object.entries(RULE)) {
    const k = FK[code]; if (!k) continue; const far = sp * 1.5 * R * sp * 1.5 * R; const mine = byKind[code] = [];
    for (let i = 0; i < N; i++) if (ECO.feat[i] === code) mine.push(i);   // the ones already on the map keep their distance too
    for (let i = 0; i < N; i++) {
      if (ECO.feat[i] !== '.' || put.has(i) || !featOk(k, i) || !ok(i) || hash(i, code.charCodeAt(0)) >= p * amt) continue;
      if (sp && mine.some(j => (CX[i] - CX[j]) ** 2 + (CY[i] - CY[j]) ** 2 < far)) continue;
      put.set(i, code); mine.push(i); ch.push([i, '.', code]);
    }
  }
  return ch;
}
{ const b = $('featAuto'); if (b) b.onclick = () => {
  if (!editable) return; const amt = +($('featAutoAmt') ? $('featAutoAmt').value : 1) || 1, ch = featAuto(amt, (Math.random() * 1e9) | 0);
  if (!ch.length) { const s = $('featAutoSay'); if (s) s.textContent = 'ไม่มีช่องที่เข้าเงื่อนไขของลักษณะพิเศษเหลืออยู่'; return; }
  for (const [i, , c] of ch) ECO.feat[i] = c; pushOp({ k: 'ft', ch }); featChanged(false);
  const n = {}; for (const [, , c] of ch) n[c] = (n[c] || 0) + 1; const s = $('featAutoSay'); if (s) s.textContent = 'วางแล้ว ' + Object.entries(n).map(([c, k]) => `${FK[c].name} ${k}`).join(' · ');
}; }
