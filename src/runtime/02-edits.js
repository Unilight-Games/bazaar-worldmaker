// ---------- the user's edits ----------
// cells: '.' keeps the drawn map, any other code repaints the hex
// HIDK: stretches of the map's own rivers the user hid, one key per river line and hex (line × N + hex); hide counts them per hex
// labels: map labels the user added or changed (id → the whole label); lhid: the page's own labels the user removed;
// stan: the hex Mount Stanther's great peak was moved to (null: where the render put it)
// routes: roads and trade routes the user laid or changed (id → the whole route); rthid: the page's own roads the user removed;
// points, phid: lore points the same way; zinfo, binfo, kinfo: the user's text for zones, kinds of ground and kinds of point;
// tlinks: trade lines the user laid or changed (id → the whole line), tlhid: the page's own lines removed, hubs: city → its rank as
// a centre (0 to 3) where the user set one, tparent: city → the centre the user chose for it to send its goods to
const ED = { cells: new Array(N).fill('.'), hide: new Uint16Array(N), rivers: [], cities: [], bhid: new Set(), labels: new Map(), lhid: new Set(), stan: null,
  routes: new Map(), rthid: new Set(), points: new Map(), phid: new Set(), zinfo: new Map(), binfo: new Map(), kinfo: new Map(),
  tlinks: new Map(), tlhid: new Set(), hubs: new Map(), tparent: new Map() };
const HIDK = new Set();
const painted = new Set();
if (BLANK) for (let i = 0; i < N; i++) painted.add(i);   // nothing is drawn under a new map: the sea is the engine's to draw too                         // hexes the edits layer draws afresh
const STF = new Set();                             // hexes redrawn because Mount Stanther moved: where it stood and where it stands
const eff = i => ED.cells[i] !== '.' ? ED.cells[i] : i === ED.stan ? 'M' : BI[i];   // the great peak stands on a mountain hex wherever it goes
function updPainted(i) { if (BLANK || ED.cells[i] !== '.' || ED.hide[i] || STF.has(i) || PTF.has(i)) painted.add(i); else painted.delete(i); }
function setCell(i, c) { ED.cells[i] = c; updPainted(i); CL_DIRTY = true; }
function setPair(key, on) {
  if (on === HIDK.has(key)) return false;
  const h = key % N;
  if (on) { HIDK.add(key); ED.hide[h]++; } else { HIDK.delete(key); ED.hide[h]--; }
  updPainted(h); return true;
}
const CODES = 'SLigsvchdtnfokjaewmpryuM';
const RK = {
  big: { name: 'แม่น้ำใหญ่', w: 4.0, s: 0 }, river: { name: 'แม่น้ำ', w: 2.5, s: 0 },
  stream: { name: 'ลำน้ำเล็ก', w: 1.5, s: 0 }, seasonal: { name: 'ลำน้ำตามฤดูกาล', w: 1.6, s: 1 },
  searv: { name: 'แม่น้ำตามฤดูกาล', w: 2.4, s: 1 },   // v0.18.5: a river that runs only in the wet part of the year
};
const CK = {
  capital: { name: 'เมืองหลวง', r: 4.2, min: 3.6, f: { min: 11, max: 16, base: 14 }, wt: 700 },
  city: { name: 'เมือง', r: 3.3, min: 2.8, f: { min: 10, max: 14, base: 12 }, wt: 600 },
  town: { name: 'เมืองเล็ก', r: 2.4, min: 2, f: { min: 9, max: 12.5, base: 10.5 }, wt: 500 },
  fort: { name: 'ป้อมปราการ', r: 2.9, min: 2.4, f: { min: 9.5, max: 13, base: 11 }, wt: 600 },
  village: { name: 'หมู่บ้าน', r: 1.8, min: 1.5, f: { min: 8.5, max: 11.5, base: 9.5 }, wt: 500 },
  // v0.18.5: four more kinds of community; each works at a village's level, with the numbers of COMK (29k) on top
  hamlet: { name: 'หมู่บ้านเล็ก', r: 1.4, min: 1.2, f: { min: 8, max: 10.5, base: 8.8 }, wt: 500 },
  monastery: { name: 'อาราม', r: 2.2, min: 1.8, f: { min: 8.5, max: 11.5, base: 9.5 }, wt: 500 },
  camp: { name: 'แคมป์ชนเผ่า', r: 2.1, min: 1.7, f: { min: 8.5, max: 11.5, base: 9.5 }, wt: 500 },
  waystation: { name: 'จุดแวะพัก', r: 2.0, min: 1.6, f: { min: 8.5, max: 11.5, base: 9.5 }, wt: 500 },
};

