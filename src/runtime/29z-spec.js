// ---------- what a community is known for (v0.19.7) ----------
// The owner found communities alike, each taking a little of everything from a wide ring of ground, and asked for some to
// live by one thing they are good at: a mining village, salt pans, a fishing village and many more (26 Nov 2026). A
// community may take one specialty. Where the ground around it (two hexes out) allows the trade, the goods of the specialty
// come out of its harvest twice over, and the rest of what it gathers at seven parts in ten, since its hands are on the one
// thing; a mining village opens a mine on a mountain beside it, whatever its size. Ground that does not allow the trade
// leaves the community as it was, and its card says why. The doubling, the seven in ten and the two hexes are Claude's
// numbers, for the owner to tune. A better price for goods of a famous place was proposed too, but the year's trade prices
// goods by their class, not one by one, so it waits for a market that knows them apart.
const SPEC_MULT = 2, SPEC_OTHER = 0.7;
// what the ground two hexes out holds: kinds of ground counted, the sea and lakes, rivers, features and ruins
function specGround(h) {
  const o = { M: 0, sea: 0, sea1: 0, lake: 0, riv: 0, forest: 0, f: 0, j: 0, a: 0, o: 0, d: 0, cold: 0, wet: 0, grass: 0, dry: 0, farm: 0, u: 0, feat: new Set(), ruin: 0 };
  if (h < 0) return o;
  let ring = [h]; const seen = new Set(ring);
  for (let d = 0; d <= 2; d++) {
    const nx = [];
    for (const u of ring) {
      const b = eff(u);
      if (isSea(b)) { o.sea++; if (d <= 1) o.sea1++; } else if (b === 'L') o.lake++;
      else {
        if (b === 'M') o.M++; if (FOREST.has(b)) o.forest++; if (b === 'f') o.f++; if (b === 'j') o.j++; if (b === 'a') o.a++; if (b === 'o' || b === 'k') o.o++;
        if (b === 'd') o.d++; if (b === 't' || b === 'n') o.cold++; if (b === 'w' || b === 'm') o.wet++; if ('gsvhe'.includes(b)) o.grass++; if ('scy'.includes(b)) o.dry++; if (b === 'p' || b === 'r') o.farm++; if (b === 'u') o.u++;
        if ((RV[u] === '1' && shownAt(u)) || URVH.has(u)) o.riv++;
      }
      const fk = ECO.feat ? ECO.feat[u] : '.'; if (fk && fk !== '.' && featAt(u)) o.feat.add(fk);
      for (let j = 0; j < 6; j++) { const v = NB[u * 6 + j]; if (v >= 0 && !seen.has(v)) { seen.add(v); nx.push(v); } }
    }
    ring = nx;
  }
  for (const p of ptLike()) if (p.k === 'ruin') { const ph = p.h != null ? p.h : hexAt(p.x, p.y); if (ph >= 0 && seen.has(ph)) o.ruin++; }
  return o;
}
// each specialty: its group, its name, the goods it lives by (those of Gresland and of our own world alike), what the ground
// must hold, and that in words
const SPECG = { mine: 'เหมืองและหิน', salt: 'เกลือ', water: 'น้ำ', wood: 'ป่า', crop: 'ไร่สินค้าราคาดี', herd: 'เลี้ยงสัตว์', other: 'อื่น ๆ' };
const SPEC = {
  iron: ['mine', 'หมู่บ้านเหมืองเหล็ก', ['iron'], g => g.M > 0, 'มีภูเขาไม่เกินสองช่อง'],
  copper: ['mine', 'เหมืองทองแดงและดีบุก', ['copper'], g => g.M > 0, 'มีภูเขาไม่เกินสองช่อง'],
  gold: ['mine', 'เหมืองทองคำ', ['gold'], g => g.M > 0 || g.riv > 0, 'มีภูเขาหรือแม่น้ำไม่เกินสองช่อง'],
  silver: ['mine', 'เหมืองเงิน', ['silver'], g => g.M > 0, 'มีภูเขาไม่เกินสองช่อง'],
  gems: ['mine', 'เหมืองพลอย', ['gems', 'bloodruby'], g => g.M > 0, 'มีภูเขาไม่เกินสองช่อง'],
  coal: ['mine', 'เหมืองถ่านหิน', ['coal'], g => g.M > 0, 'มีภูเขาไม่เกินสองช่อง'],
  arcane: ['mine', 'เหมืองแร่เวท', ['mithril', 'hyperium', 'adamant', 'orichalcum', 'umbralite', 'manastone', 'sephine', 'floatstone', 'phantomstone'], g => g.M > 0, 'มีภูเขาไม่เกินสองช่อง'],
  sulfur: ['mine', 'บ่อกำมะถัน', ['sulfur'], g => g.u > 0 || g.feat.has('c') || g.feat.has('m') || g.feat.has('d'), 'มีทุ่งกำมะถัน ดินภูเขาไฟ หรือบ่อน้ำร้อนใกล้ ๆ'],
  quarry: ['mine', 'หมู่บ้านบ่อหิน', ['stone'], g => g.M > 0 || g.feat.has('q') || g.feat.has('j'), 'มีภูเขา ภูเขาหินปูน หรือหุบผาใกล้ ๆ'],
  potter: ['mine', 'หมู่บ้านช่างปั้น', ['clay'], g => g.riv > 0 || g.lake > 0 || g.wet > 0, 'มีแม่น้ำ ทะเลสาบ หรือที่ลุ่มใกล้ ๆ'],
  seasalt: ['salt', 'นาเกลือทะเล', ['seasalt'], g => g.sea1 > 0, 'อยู่ติดทะเล'],
  rocksalt: ['salt', 'บ่อเกลือสินเธาว์', ['rocksalt', 'minesalt', 'desertsalt', 'plainsalt'], g => g.feat.has('e') || g.d > 0 || g.M > 0, 'มีแหล่งเกลือ ทะเลทราย หรือภูเขาใกล้ ๆ'],
  seafish: ['water', 'หมู่บ้านประมงทะเล', ['seafish', 'dragonalgae'], g => g.sea1 > 0, 'อยู่ติดทะเล'],
  lakefish: ['water', 'หมู่บ้านประมงน้ำจืด', ['lakefish'], g => g.lake > 0 || g.riv > 0, 'มีทะเลสาบหรือแม่น้ำใกล้ ๆ'],
  pearl: ['water', 'หมู่บ้านไข่มุก', ['pearl'], g => g.sea1 > 0, 'อยู่ติดทะเล (แนวปะการังหรือลากูนยิ่งดี)'],
  whale: ['water', 'ฐานล่าวาฬ', ['whaleoil'], g => g.sea1 > 0, 'อยู่ติดทะเล'],
  logging: ['wood', 'หมู่บ้านตัดไม้', ['softwood', 'hardwood', 'tropicalwood', 'swampwood', 'pine', 'darkwood', 'junglewood', 'steelwood'], g => g.forest >= 3, 'มีป่าอย่างน้อยสามช่องใกล้ ๆ'],
  charcoal: ['wood', 'หมู่บ้านเผาถ่าน', ['charcoal'], g => g.forest >= 2, 'มีป่าอย่างน้อยสองช่องใกล้ ๆ'],
  pitch: ['wood', 'หมู่บ้านเก็บยางสน', ['pitch'], g => g.f > 0, 'มีป่าสนใกล้ ๆ'],
  finewood: ['wood', 'หมู่บ้านไม้หอม', ['finewood'], g => g.j + g.a > 0, 'มีป่าดงดิบหรือป่าบรรพกาลใกล้ ๆ'],
  furs: ['wood', 'หมู่บ้านพรานขนสัตว์', ['furs', 'game', 'phantomgame'], g => g.forest >= 2 || g.cold > 0, 'มีป่าหรือทุนดราใกล้ ๆ'],
  honey: ['wood', 'หมู่บ้านน้ำผึ้ง', ['honey', 'bloodroot', 'bluebird'], g => g.forest + g.grass > 0, 'มีป่าหรือทุ่งดอกไม้ใกล้ ๆ'],
  herbs: ['wood', 'หมู่บ้านสมุนไพรและเห็ด', ['herbs', 'crimsonvein', 'cliffmush', 'shadowflora', 'guardian', 'coriander', 'spiritsap'], g => g.forest > 0 || g.M > 0, 'มีป่าหรือภูเขาใกล้ ๆ'],
  peat: ['wood', 'หมู่บ้านขุดพีต', ['peat'], g => g.wet > 0 || g.feat.has('f'), 'มีบึงหรือบึงพรุใกล้ ๆ'],
  tea: ['crop', 'หมู่บ้านไร่ชา', ['tea'], g => g.M > 0, 'มีเนินภูเขาใกล้ ๆ'],
  spice: ['crop', 'สวนเครื่องเทศ', ['spice'], g => g.j > 0 || g.farm > 0, 'มีป่าดงดิบหรือไร่อาณานิคมใกล้ ๆ'],
  sugar: ['crop', 'ไร่อ้อย', ['sugar'], g => g.farm > 0 || g.j > 0, 'มีนาริมแม่น้ำ ไร่อาณานิคม หรือป่าดงดิบใกล้ ๆ'],
  wine: ['crop', 'สวนองุ่นและมะกอก', ['wine'], g => g.dry + g.grass > 0, 'มีทุ่งหญ้าหรือทุ่งพุ่มไม้แห้งใกล้ ๆ'],
  silk: ['crop', 'หมู่บ้านเลี้ยงไหม', ['silk', 'manasilk'], g => g.o + g.grass > 0, 'มีป่าผลัดใบหรือทุ่งหญ้าใกล้ ๆ'],
  dyes: ['crop', 'ไร่คราม', ['dyes'], g => g.farm + g.grass > 0, 'มีนา ไร่ หรือทุ่งหญ้าใกล้ ๆ'],
  cotton: ['crop', 'ไร่ฝ้าย', ['cotton'], g => g.dry + g.farm + g.grass > 0, 'มีทุ่งหรือไร่ใกล้ ๆ'],
  flax: ['crop', 'หมู่บ้านลินิน', ['flax', 'ironvine'], g => g.grass + g.wet > 0, 'มีทุ่งหญ้าหรือที่ลุ่มใกล้ ๆ'],
  dates: ['crop', 'สวนอินทผลัม', ['dates', 'oasisfruit'], g => g.d > 0 || g.feat.has('a'), 'มีทะเลทรายหรือโอเอซิสใกล้ ๆ'],
  cocoa: ['crop', 'สวนโกโก้และกาแฟ', ['cocoa'], g => g.j > 0, 'มีป่าดงดิบใกล้ ๆ'],
  incense: ['crop', 'หมู่บ้านกำยาน', ['incense'], g => g.d + g.dry > 0, 'มีทะเลทรายหรือดินแห้งใกล้ ๆ'],
  sheep: ['herd', 'หมู่บ้านเลี้ยงแกะ', ['wool', 'sheep', 'stonewool'], g => g.grass + g.M > 0, 'มีทุ่งหญ้าหรือภูเขาใกล้ ๆ'],
  dairy: ['herd', 'ฟาร์มโคนม', ['cattle', 'amberdairy', 'bison'], g => g.grass > 0, 'มีทุ่งหญ้าใกล้ ๆ'],
  camel: ['herd', 'หมู่บ้านอูฐ', ['camel', 'drake'], g => g.d > 0, 'มีทะเลทรายใกล้ ๆ'],
  reindeer: ['herd', 'หมู่บ้านเลี้ยงเรนเดียร์', ['reindeer'], g => g.cold > 0, 'มีทุนดราหรือแดนหิมะใกล้ ๆ'],
  tannery: ['herd', 'หมู่บ้านฟอกหนัง', ['hides', 'bisonhide', 'drakehide'], g => g.grass > 0 && (g.riv > 0 || g.lake > 0), 'มีทุ่งหญ้าและน้ำใกล้ ๆ'],
  relics: ['other', 'หมู่บ้านขุดซากเมืองเก่า', ['relics'], g => g.ruin > 0, 'มีซากเมืองเก่าใกล้ ๆ'],
};
ECO.spec = {};
const specOf = id => (SPEC[ECO.spec[id]] ? ECO.spec[id] : '');
const SPECK = new Map();                             // a community's ground, kept until the map or the community moves
function specFits(c, k) { const s = SPEC[k]; if (!s) return false; const h = c.h != null ? c.h : hexAt(c.x, c.y), key = h + '|' + painted.size + '|' + featStamp + '|' + ED.rivers.length; let g = SPECK.get(c.id); if (!g || g.key !== key) { g = { key, v: specGround(h) }; SPECK.set(c.id, g); } return s[3](g.v); }
function specMine(c) { const k = specOf(c.id); return !!k && SPEC[k][0] === 'mine' && k !== 'potter' && specFits(c, k); }
function specApply(cities, prod) {
  cities.forEach((c, k) => {
    const key = specOf(c.id); c.spec = ''; if (!key || !specFits(c, key)) return;
    const own = new Set(SPEC[key][2]), P = prod[k]; c.spec = key;
    for (const [id, v] of P) { const cat = catOf(id); if (!ERAW.includes(cat)) continue; P.set(id, v * (own.has(id) ? SPEC_MULT : SPEC_OTHER)); }
  });
}
{ const ha = harvApply; harvApply = function (cities, prod, own, dist) { const r = ha(cities, prod, own, dist); specApply(cities, prod); return r; }; }
// ---- the document ----
{
  const ld = ecoLoad, sr = ecoSerial;
  ecoLoad = function (b) { ld(b); b = b || {}; ECO.spec = {}; for (const [id, v] of Object.entries(b.spec || {}).slice(0, 4000)) if (SPEC[v]) ECO.spec[ecoStr(id, 120)] = v; };
  ecoSerial = function () { const o = sr(); if (Object.keys(ECO.spec).length) o.spec = { ...ECO.spec }; return o; };
}
// ---- the community's form ----
function specForm() {
  const box = $('cfSpec'); if (!box) return; if (!sel) { box.innerHTML = ''; return; }
  const v = visibleCities().find(c => c.id === sel); if (!v) { box.innerHTML = ''; return; }
  const c = { id: v.id, x: v.x, y: v.y, h: hexAt(v.x, v.y) }, cur = specOf(sel), ro = editable ? '' : ' disabled';
  // what the ground allows, the trades whose goods its harvest already brings in first, the largest first
  const r0 = ECON ? ECON.cities.findIndex(x => x.id === sel) : -1, P0 = r0 >= 0 ? ECON.prod[r0] : null;
  const worth = k => { if (!P0) return 0; let w = 0; for (const id of SPEC[k][2]) { const v = P0.get(id) || 0, g = ecoGood(id); if (v > 0 && g && ECAT[g.cat]) w += v * ECAT[g.cat].v; } return w; };
  const fitAll = Object.keys(SPEC).filter(k => specFits(c, k)), fit = fitAll.filter(k => worth(k) > 0).sort((a, b) => worth(b) - worth(a)), thin = fitAll.filter(k => !(worth(k) > 0));
  const opt = k => `<option value="${k}"${k === cur ? ' selected' : ''}>${esc(SPEC[k][1])}</option>`;
  let h = `<label>ความชำนาญ <select id="cfSpecSel"${ro}><option value="">ไม่มี (เก็บทุกอย่างรอบตัว)</option>`;
  if (fit.length) h += `<optgroup label="เหมาะ และพื้นที่มีสินค้านี้อยู่แล้ว">${fit.map(opt).join('')}</optgroup>`;
  if (thin.length) h += `<optgroup label="พื้นที่เหมาะ แต่ยังไม่มีสินค้านี้">${thin.map(opt).join('')}</optgroup>`;
  for (const [g, gn] of Object.entries(SPECG)) { const rest = Object.keys(SPEC).filter(k => SPEC[k][0] === g && !fitAll.includes(k)); if (rest.length) h += `<optgroup label="${esc(gn)} (พื้นที่ไม่เหมาะ)">${rest.map(opt).join('')}</optgroup>`; }
  h += '</select></label>';
  let note = '';
  if (cur) {
    const ok = fitAll.includes(cur), r = ECON ? ECON.cities.find(x => x.id === sel) : null, P = r && ECON.prod ? ECON.prod[ECON.cities.indexOf(r)] : null;
    note = ok ? `${SPEC[cur][1]}: ผลผลิต${SPEC[cur][2].filter(id => ecoGood(id)).map(id => ecoGood(id).name).slice(0, 3).join(' ')} ×${SPEC_MULT} ของอื่นที่เก็บได้ ×${SPEC_OTHER}` : `ยังไม่มีผล ต้อง${SPEC[cur][4]}`;
    if (ok && P && !SPEC[cur][2].some(id => (P.get ? P.get(id) : P[id]) > 0)) note += ' · พื้นที่ที่ชุมชนนี้เก็บเกี่ยวยังไม่มีสินค้านี้เลย';
  } else if (fit.length) note = 'เหมาะกับ ' + fit.slice(0, 3).map(k => SPEC[k][1]).join(' ') + (fit.length > 3 ? ' และอื่น ๆ' : '');
  box.innerHTML = h + `<span class="lbl">${esc(note)}</span>`;
}
__on(document, 'change', e => {
  const el = e.target; if (!el || el.id !== 'cfSpecSel' || !editable || !sel) return;
  if (SPEC[el.value]) ECO.spec[sel] = el.value; else delete ECO.spec[sel];
  ecoChanged(false); scheduleEcon(60); specForm();
});
{ const rf = refreshForm; refreshForm = function () { rf(); specForm(); }; }
