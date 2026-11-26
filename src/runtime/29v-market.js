// ---------- regional markets and the central market (v0.19.0) ----------
// The owner asked for markets of their own in each region, with their stock and their price, the price rising and falling with
// supply and demand; and a window over the central market that shows supply, demand, price and the communities that sell, all of
// it moving with the seasons.
// A region is the ground a great market serves: the top hubs of the trade network, each with the communities it reaches soonest.
// Over the year the trade settles what moves where (the year's flows); the market follows the year through its seasons:
//   supply     what the region's ground and workshops make, the crops by the season's warmth and rain, the rest evenly
//   demand     what its people and garrisons use, evenly through the year
//   stock      carried from season to season: the harvest fills it, the lean seasons draw it down; it starts the year with what
//              the lean seasons will need, and a tenth of the year's use besides
//   price      the year's price, raised where a season asks more than it has (stock counting for half), lowered where it has
//              more, by the square root's gentler cousin (power 0.4), and the seasons' prices average back to the year's
// None of this feeds back into the year's trade: it reads it. The numbers are Claude's.
const MKSEAS = { grain: 1, herbs: 0.9, protein: 0.4, cloth: 0.35, timber: 0.2, fuel: 0.25 };
const MK = { stamp: -1, regions: [], at: null };
// v0.19.0: a price for one piece too. A portion (a person's year of a good) holds this many pieces of the good's usual unit; the
// counts are Claude's reading of what one person uses in a year (grain about 200 kg, a weapon kept a year, a ship shared by many),
// and each can be changed in the market window.
const MKBOLT = window.MME_LANG === 'en' ? 'bolt' : 'ผืน';   // v0.22.0: ผืน also counts maps, which takes the English word first
const MKUNIT0 = { grain: ['กก.', 200], protein: ['กก.', 60], salt: ['กก.', 6], herbs: ['กก.', 3], timber: ['ท่อน', 5], fuel: ['มัด', 100], stone: ['ก้อน', 20], ore: ['กก.', 50], cloth: [MKBOLT, 4], mana: ['ก้อน', 2], rare: ['บาท (น้ำหนัก)', 20], luxury: ['ชิ้น', 5], tools: ['ชิ้น', 2], arms: ['ชิ้น', 1], tech: ['ชิ้น', 1], ships: ['ลำ', 0.01], books: ['เล่ม', 3] , livestock: ['ตัว', 0.5], drink: ['ไห', 2], furniture: ['ชิ้น', 1], build: ['ก้อน', 100], fert: ['กระสอบ', 4], feed: ['กระสอบ', 4], textile: [MKBOLT, 3], pottery: ['ใบ', 10], food: ['ไห', 2], medicine: ['ขวด', 5], jewelry: ['ชิ้น', 0.2] };
ECO.munit = {};
const mkUnit = cat => { const o = ECO.munit[cat], d = MKUNIT0[cat] || ['ชิ้น', 1]; return [o && o[0] || d[0], o && o[1] > 0 ? o[1] : d[1]]; };
const mkPiece = x => x >= 100 ? Math.round(x).toLocaleString(window.MME_LANG === 'en' ? 'en-GB' : 'th-TH') : x >= 1 ? x.toFixed(2) : x >= 0.01 ? x.toFixed(3) : x.toPrecision(2);
{
  const ld = ecoLoad, sr = ecoSerial;
  ecoLoad = function (b) { ld(b); b = b || {}; ECO.munit = {}; for (const [c, v] of Object.entries(b.munit || {})) if (ECAT[c] && Array.isArray(v) && typeof v[0] === 'string' && +v[1] > 0) ECO.munit[c] = [v[0].slice(0, 20), Math.min(1e6, +v[1])]; };
  ecoSerial = function () { const o = sr(); if (Object.keys(ECO.munit).length) o.munit = JSON.parse(JSON.stringify(ECO.munit)); return o; };
}
function mkSeasons() {
  const S = clSeasons(); if (!S || !S.length) return [{ id: '', name: 'ทั้งปี', len: 1, g: 1 }];
  const tot = S.reduce((a, s) => a + s.len, 0), raw = S.map(s => 0.6 * s.warm + 0.4 * Math.min(2, s.rain == null ? 1 : s.rain)), mean = raw.reduce((a, x, i) => a + x * S[i].len, 0) / tot;
  return S.map((s, i) => ({ id: s.id, name: s.name, len: s.len / tot, g: mean > 0 ? raw[i] / mean : 1 }));
}
function mkBuild() {
  const E = ECON; if (!E || !E.cities.length) return null; if (MK.stamp === E.ver && MK.regions.length) return MK;
  const n = E.cities.length, per = ECO.central.per, top = Math.max(...E.cities.map(c => c.rank || 0));
  let hubs = E.cities.map((c, k) => k).filter(k => (E.cities[k].rank || 0) >= Math.max(1, top));
  if (hubs.length < 2) hubs = E.cities.map((c, k) => k).sort((a, b) => E.cities[b].pop - E.cities[a].pop).slice(0, Math.max(2, Math.round(n / 12)));
  const reg = new Int32Array(n);
  for (let k = 0; k < n; k++) { let best = 0, bt = Infinity; hubs.forEach((h, j) => { const t = k === h ? 0 : E.NT[k][h]; const d = isFinite(t) ? t : 1e6 + Math.hypot(E.cities[k].x - E.cities[h].x, E.cities[k].y - E.cities[h].y); if (d < bt) { bt = d; best = j; } }); reg[k] = best; }
  const seas = mkSeasons(), cats = ECATS.filter(c => !ECAT[c].people);
  const regions = hubs.map((h, j) => ({ j, hub: h, name: 'ตลาด' + (E.cities[h].name || 'ไม่มีชื่อ'), cities: [], cat: {} }));
  for (let k = 0; k < n; k++) regions[reg[k]].cities.push(k);
  // what each community makes and uses of each class
  const supply = E.cities.map((c, k) => { const m = {}; for (const [id, q] of E.prod[k]) { const cat = catOf(id); m[cat] = (m[cat] || 0) + q; } if (E.MK) for (const cat of cats) { const mk = E.MK[k][cat]; if (mk) m[cat] = (m[cat] || 0) + mk[0]; } return m; });
  const imp = regions.map(() => ({})), exp = regions.map(() => ({})), sell = regions.map(() => ({}));
  for (const f of E.flows) { if (f.cat === 'labor') continue; const a = reg[f.from], b = reg[f.to]; (sell[a][f.cat] || (sell[a][f.cat] = new Map())).set(f.from, ((sell[a][f.cat] && sell[a][f.cat].get(f.from)) || 0) + f.amt); if (a === b) continue; exp[a][f.cat] = (exp[a][f.cat] || 0) + f.amt; imp[b][f.cat] = (imp[b][f.cat] || 0) + f.amt; }
  for (const R of regions) for (const cat of cats) {
    let sup = 0, dem = 0, pw = 0, pd = 0, lo = Infinity, hi = 0; for (const k of R.cities) { sup += supply[k][cat] || 0; const d = E.need[k][cat] || 0; dem += d; pw += (E.P1[k][cat] || 1) * Math.max(d, 0.01); pd += Math.max(d, 0.01); if (d > 0.001 || (supply[k][cat] || 0) > 0.001) { const pk = (E.P1[k][cat] || 1) * ECAT[cat].v * per; lo = Math.min(lo, pk); hi = Math.max(hi, pk); } }   // v0.21.0: the cheapest and dearest town too
    const I = imp[R.j][cat] || 0, X = exp[R.j][cat] || 0, P = pw / pd * ECAT[cat].v * per; if (!(sup > 0.001 || dem > 0.001 || I > 0.001)) continue;
    const k0 = MKSEAS[cat] || 0, rows = seas.map(s => ({ s, sup: sup * s.len * (1 + k0 * (s.g - 1)), dem: dem * s.len, imp: I * s.len, exp: X * s.len }));
    let run = 0, low = 0; for (const r of rows) { run += r.sup + r.imp - r.dem - r.exp; low = Math.min(low, run); }
    let st = -low + 0.1 * dem; const raw = [];
    for (const r of rows) { r.stock0 = st; const have = r.sup + r.imp + 0.5 * st, want = r.dem + r.exp; raw.push(Math.pow(Math.max(1e-6, want) / Math.max(1e-6, have), 0.4)); st = Math.max(0, st + r.sup + r.imp - r.dem - r.exp); r.stock1 = st; }
    const mean = raw.reduce((a, x, i) => a + x * rows[i].s.len, 0) || 1; rows.forEach((r, i) => { r.price = P * clamp(raw[i] / mean, 0.4, 2.5); });
    const sellers = [...(sell[R.j][cat] || new Map())].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, q]) => ({ id: E.cities[k].id, name: E.cities[k].name, q }));
    R.cat[cat] = { sup, dem, imp: I, exp: X, P, rows, sellers, lo: isFinite(lo) ? lo : P, hi: hi || P };
  }
  // the whole map as one more region
  const all = { j: -1, hub: -1, name: 'ทั้งแผนที่', cities: E.cities.map((c, k) => k), cat: {} };
  for (const cat of cats) {
    const parts = regions.map(R => R.cat[cat]).filter(Boolean); if (!parts.length) continue;
    const rows = seas.map((s, i) => { const o = { s, sup: 0, dem: 0, imp: 0, exp: 0, stock0: 0, stock1: 0, price: 0 }; let w = 0; for (const p of parts) { const r = p.rows[i]; for (const f of ['sup', 'dem', 'stock0', 'stock1']) o[f] += r[f]; o.price += r.price * Math.max(r.dem, 0.01); w += Math.max(r.dem, 0.01); } o.price /= w || 1; return o; });
    const sell = new Map(); for (const p of parts) for (const x of p.sellers) sell.set(x.id, (sell.get(x.id) || { ...x, q: 0 })), sell.get(x.id).q += x.q;
    all.cat[cat] = { lo: Math.min(...parts.map(p => p.lo)), hi: Math.max(...parts.map(p => p.hi)), sup: parts.reduce((a, p) => a + p.sup, 0), dem: parts.reduce((a, p) => a + p.dem, 0), imp: 0, exp: 0, P: rows.reduce((a, r) => a + r.price * r.s.len, 0), rows, sellers: [...sell.values()].sort((a, b) => b.q - a.q).slice(0, 8) };
  }
  MK.stamp = E.ver; MK.regions = [all, ...regions]; MK.seas = seas; return MK;
}

// ---- the window ----
const mkEl = document.createElement('div'); mkEl.className = 'mmodal'; mkEl.hidden = true;
mkEl.innerHTML = `<div class="mmcard mkcard" role="dialog" aria-modal="true" aria-labelledby="mkTitle"><div class="mmhead"><h3 id="mkTitle">ตลาดสินค้ากลาง</h3><button type="button" class="btn" id="mkClose">ปิด</button></div><div id="mkBody"></div></div>`;
$('mapbox').appendChild(mkEl);
const MKV = { r: 0, s: -1, cat: null, k: '', d: -1 };   // k, d: the column the goods are ordered by and which way (v0.21.0, the owner's ask)
// the columns that order the table, each read from the season shown: the goods' share of trade when none is chosen
const MKSORT = { sup: (C, r) => r.sup + r.imp, dem: (C, r) => r.dem + r.exp, stock: (C, r) => r.stock0, price: (C, r) => r.price, piece: (C, r, cat) => r.price / mkUnit(cat)[1] };
function mkOpen() { MKV.s = -1; mkEl.hidden = false; mkRender(); }
function mkClose() { mkEl.hidden = true; }
$('mkClose').onclick = mkClose; mkEl.addEventListener('pointerdown', e => { if (e.target === mkEl) mkClose(); e.stopPropagation(); });
for (const ev of ['wheel', 'click', 'keydown']) mkEl.addEventListener(ev, e => { if (ev === 'keydown' && e.key === 'Escape') mkClose(); e.stopPropagation(); });
// shown in portions: a load is what a thousand people use in a year, so a portion is one person's year of that good
const MKP = 1000, mkN = x => { x *= MKP; return x >= 100 ? Math.round(x).toLocaleString(window.MME_LANG === 'en' ? 'en-GB' : 'th-TH') : x >= 10 ? x.toFixed(1) : x.toFixed(2); }, mkPr = x => { x /= MKP; return x >= 100 ? Math.round(x).toLocaleString(window.MME_LANG === 'en' ? 'en-GB' : 'th-TH') : x >= 10 ? x.toFixed(1) : x.toFixed(2); };
function mkSeasonIdx(M) { if (MKV.s >= 0) return MKV.s; const id = typeof clSeas !== 'undefined' ? clSeas : ''; const i = M.seas.findIndex(s => s.id && s.id === id); return i >= 0 ? i : 0; }
function mkSpark(vals, w, h, col) {
  const lo = Math.min(...vals), hi = Math.max(...vals), sp = hi - lo || 1, n = vals.length;
  const pts = vals.map((v, i) => [n > 1 ? 4 + i * (w - 8) / (n - 1) : w / 2, h - 4 - (v - lo) / sp * (h - 8)]);
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><polyline fill="none" stroke="${col}" stroke-width="2" points="${pts.map(p => p.join(',')).join(' ')}"/>${pts.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="2.5" fill="${col}"/>`).join('')}</svg>`;
}
// a column head that orders the table: a first press orders it high to low, the next low to high; the goods' head goes back to the
// order by trade
function mkHead(k, label, tip) {
  const on = MKV.k === k, arrow = k && on ? (MKV.d < 0 ? ' ▼' : ' ▲') : '', srt = on ? (k ? (MKV.d < 0 ? 'descending' : 'ascending') : 'other') : 'none';
  const t = (tip ? tip + ' · ' : '') + (k ? (on && MKV.d < 0 ? 'กดเพื่อเรียงจากต่ำไปสูง' : 'กดเพื่อเรียงจากสูงไปต่ำ') : 'กดเพื่อกลับไปเรียงตามมูลค่าการค้า');
  return `<button type="button" class="mkh mks${k ? ' r' : ''}${on ? ' on' : ''}" data-mks="${k}" aria-sort="${srt}" title="${esc(t)}">${label}${arrow}</button>`;
}
function mkRender() {
  const body = $('mkBody'); const M = mkBuild(); if (!M) { body.innerHTML = '<p class="hint">ยังไม่มีชุมชนหรือการค้าบนแผนที่</p>'; return; }
  if (MKV.r >= M.regions.length) MKV.r = 0; const R = M.regions[MKV.r], si = mkSeasonIdx(M), coin = esc(ECO.central.name);
  let h = `<div class="erow"><label>ตลาด <select id="mkReg">${M.regions.map((x, i) => `<option value="${i}"${i === MKV.r ? ' selected' : ''}>${esc(x.name)}${x.j >= 0 ? ` (${x.cities.length} ชุมชน)` : ''}</option>`).join('')}</select></label>`
    + `<div class="seg" id="mkSeas">${M.seas.map((s, i) => `<button type="button" data-si="${i}" aria-pressed="${i === si}">${esc(s.name)}</button>`).join('')}</div></div>`
    + (M.seas.length === 1 ? `<p class="hint">แผนที่นี้ยังไม่แบ่งฤดู ตัวเลขเป็นของทั้งปี แบ่งฤดูได้ในโหมดภูมิอากาศ</p>` : '')
    + `<div class="mktbl">${mkHead('', 'สินค้า', 'เรียงตามมูลค่าการค้าของสินค้า (ค่าตั้งต้น)')}${mkHead('sup', 'อุปทาน')}${mkHead('dem', 'อุปสงค์')}${mkHead('stock', 'สต็อกต้นฤดู')}${mkHead('price', 'ราคาเฉลี่ยต่อส่วน', 'ค่าเฉลี่ยของราคาในทุกชุมชนในตลาดนี้ ถ่วงด้วยปริมาณที่แต่ละชุมชนซื้อ')}${mkHead('piece', 'ราคาเฉลี่ยต่อชิ้น', 'ค่าเฉลี่ยถ่วงด้วยปริมาณที่ซื้อ เช่นเดียวกัน')}<div class="mkh">ผู้ขายหลัก</div>`;
  const cats = Object.keys(R.cat).sort((a, b) => R.cat[b].dem * R.cat[b].P - R.cat[a].dem * R.cat[a].P);
  if (MKV.k && MKSORT[MKV.k]) { const f = MKSORT[MKV.k], v = cat => f(R.cat[cat], R.cat[cat].rows[si], cat); cats.sort((a, b) => MKV.d * (v(a) - v(b))); }
  for (const cat of cats) {
    const C = R.cat[cat], r = C.rows[si], d = C.P > 0 ? r.price / C.P - 1 : 0, on = MKV.cat === cat;
    h += `<button type="button" class="mkrow${on ? ' on' : ''}" data-cat="${cat}"><span><i class="sdot" style="background:${ECAT[cat].col}"></i>${esc(ECAT[cat].name)}</span><span class="r">${mkN(r.sup + r.imp)}</span><span class="r">${mkN(r.dem + r.exp)}</span><span class="r">${mkN(r.stock0)}</span><span class="r">${mkPr(r.price)} <small class="${d > 0.02 ? 'up' : d < -0.02 ? 'dn' : ''}">${d > 0.02 ? '▲' : d < -0.02 ? '▼' : '·'}${Math.abs(Math.round(d * 100))}%</small></span><span class="r">${(() => { const [u, n] = mkUnit(cat); return mkPiece(r.price / MKP / n) + ' <small>/' + esc(u) + '</small>'; })()}</span><span class="w">${C.sellers.slice(0, 3).map(x => esc(x.name || 'ไม่มีชื่อ')).join(' · ')}</span></button>`;
    if (on) {
      h += `<div class="mkdet"><div class="mkplot"><div><b>ราคา</b> ${mkSpark(C.rows.map(x => x.price), 220, 54, 'var(--brass)')}</div><div><b>สต็อก</b> ${mkSpark(C.rows.map(x => x.stock0), 220, 54, '#7fb6ff')}</div></div>`
        + `<div class="tr w">ราคาเฉลี่ยทั้งปี ${mkPr(C.P)} ${coin} ต่อส่วน (เฉลี่ยจากราคาในทุกชุมชน ถ่วงด้วยปริมาณที่แต่ละชุมชนซื้อ ถูกสุด ${mkPr(C.lo)} แพงสุด ${mkPr(C.hi)}) · ทั้งปีผลิต ${mkN(C.sup)} บริโภค ${mkN(C.dem)}${C.imp ? ` · ซื้อเข้าจากตลาดอื่น ${mkN(C.imp)}` : ''}${C.exp ? ` · ขายออก ${mkN(C.exp)}` : ''}</div>`
        + (() => { const [u, n] = mkUnit(cat); return `<div class="erow"><span class="lbl">หนึ่งส่วนเท่ากับ</span><input type="number" data-mu="n" data-cat="${cat}" min="0.0001" step="any" value="${n}" style="width:6em"${editable ? '' : ' disabled'}><input type="text" data-mu="u" data-cat="${cat}" maxlength="20" value="${esc(u)}" style="width:7em"${editable ? '' : ' disabled'}><span class="w">ราคาต่อ${esc(u)} ${mkPiece(C.P / MKP / n)} ${coin} เฉลี่ยทั้งปี</span></div>`; })()
        + `<div class="tr"><b>ชุมชนที่ขาย</b> <span class="w">${C.sellers.map(x => `<a href="#" data-mkc="${esc(x.id)}">${esc(x.name || 'ไม่มีชื่อ')}</a> ${mkN(x.q)}`).join(' · ') || 'ไม่มี'}</span></div></div>`;
    }
  }
  h += `</div><p class="note">ตัวเลขนับเป็นส่วน หนึ่งส่วนคือสินค้าที่คนหนึ่งคนใช้ในหนึ่งปี เช่น ธัญพืชหนึ่งส่วนคืออาหารหลักของคนหนึ่งคนตลอดปี ราคาต่อชิ้นคือราคาต่อส่วนหารด้วยจำนวนชิ้นในหนึ่งส่วน ซึ่งแก้ได้เมื่อกดที่สินค้า ราคาในแต่ละฤดูขึ้นเมื่อของที่ต้องการมากกว่าของที่มี (สต็อกนับครึ่ง) และลงเมื่อมีมากกว่า เฉลี่ยทั้งปีกลับมาเท่าราคาของปี พืชผลออกตามความอุ่นและฝนของฤดู ของอื่นออกเท่ากันทุกฤดู ตลาดภูมิภาคคือชุมทางใหญ่ที่สุดของแผนที่กับชุมชนที่ไปถึงเร็วที่สุด</p>`;
  body.innerHTML = h;
}
$('mkBody').addEventListener('change', e => {
  if (e.target.id === 'mkReg') { MKV.r = +e.target.value; MKV.cat = null; mkRender(); return; }
  const el = e.target, cat = el.dataset && el.dataset.cat; if (!el.dataset || !el.dataset.mu || !ECAT[cat] || !editable) return; const cur = mkUnit(cat);
  if (el.dataset.mu === 'n') { const v = +el.value; if (v > 0) ECO.munit[cat] = [cur[0], Math.min(1e6, v)]; } else ECO.munit[cat] = [el.value.trim().slice(0, 20) || cur[0], cur[1]];
  ecoChanged(false); mkRender();
});
$('mkBody').addEventListener('click', e => {
  const s = e.target.closest('#mkSeas button'); if (s) { MKV.s = +s.dataset.si; mkRender(); return; }
  const hd = e.target.closest('[data-mks]'); if (hd) { const k = hd.dataset.mks; if (!k) MKV.k = ''; else if (MKV.k === k) MKV.d = -MKV.d; else { MKV.k = k; MKV.d = -1; } mkRender(); return; }
  const a = e.target.closest('[data-mkc]'); if (a) { e.preventDefault(); const v = visibleCities().find(c => c.id === a.dataset.mkc); if (v) { mkClose(); if (typeof admFocusXY === 'function') admFocusXY(v.x, v.y); setMode('trade'); if (typeof tradeSelectCity === 'function') tradeSelectCity(v.id); } return; }
  const r = e.target.closest('[data-cat]'); if (r) { MKV.cat = MKV.cat === r.dataset.cat ? null : r.dataset.cat; mkRender(); }
});
{ const ctl = document.querySelector('#mapbox .ctl'), b = document.createElement('button'); b.type = 'button'; b.id = 'mkBtn'; b.textContent = 'ตลาด'; b.title = 'ตลาดสินค้ากลาง: อุปสงค์ อุปทาน สต็อก ราคา และชุมชนที่ขาย ตามฤดู'; if (ctl) ctl.appendChild(b); b.onclick = mkOpen; }
__on(window, 'keydown', e => { if (e.key === 'Escape' && !mkEl.hidden) mkClose(); });
