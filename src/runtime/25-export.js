// ---------- export ----------
async function offer(filename, data) {
  if (!downloads) return;
  try { await downloads.save({ filename, data }); flash('บันทึกไฟล์แล้ว'); }
  catch (err) { const code = err && err.code; if (code === 'declined') return; if (code === 'rate_limited') flash('รอสักครู่แล้วลองอีกครั้ง'); else flash('หน้านี้บันทึกไฟล์ไม่ได้'); }
}
$('expPng').onclick = async () => {
  // names and cities go into the picture only while the names button is on, the same rule as on the map
  const named = showNames;
  flash(named ? 'กำลังเตรียมภาพพร้อมชื่อสถานที่' : 'กำลังเตรียมภาพแบบไม่มีชื่อสถานที่');
  const W = layer.width, H = layer.height, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'); x.drawImage(img, 0, 0, W, H); if (layerUsed) x.drawImage(layer, 0, 0, W, H); if (drawOverGround) drawOverGround(x, W, H, false);
  x.setTransform(LS, 0, 0, LS, 0, 0); drawLoosePoints(x, 1 / LS); drawRoutes(x, 1 / LS, null); drawTrade(x, 1 / LS, false);
  if (named) { const keep = sel; sel = null; drawNames(x, 1 / LS, true, true); sel = keep; }
  const blob = await new Promise(res => c.toBlob(res, 'image/png'));
  if (blob) offer(FSLUG + (named ? '.png' : '-no-names.png'), blob);
};
$('expJson').onclick = () => {
  commitCityEdit(); commitLabelEdit(); commitInfo();
  const vr = ensureRoutes();
  const out = {
    map: 'Gresland terrain', version: 4, exported: new Date().toISOString(),
    grid: { x0: G.x0, y0: G.y0, R: G.R, cols: COLS, rows: ROWS, cmin: G.cmin, kmin: G.kmin, width: G.w, height: G.h },
    codes: Object.fromEntries(Object.keys(BIOME).map(k => [k, biomeInfo(k).name])),
    terrain: [...painted].filter(i => ED.cells[i] !== '.').sort((a, b) => a - b).map(i => ({ hex: i, col: cOf(i), row: kOf(i), x: r1(CX[i]), y: r1(CY[i]), was: BI[i], now: ED.cells[i] })),
    hiddenRivers: [...HIDK].sort((a, b) => a - b).map(key => { const i = key % N; return { line: Math.floor(key / N), hex: i, col: cOf(i), row: kOf(i), x: r1(CX[i]), y: r1(CY[i]) }; }),
    rivers: ED.rivers.map(r => ({ id: r.id, kind: r.kind, name: RK[r.kind].name, pts: r.pts })),
    cities: ED.cities.map(c => ({ ...c, builtin: isBuiltin(c.id) })),
    removedCities: [...ED.bhid],
    labels: [...ED.labels.values()].map(o => ({ ...plainLabel(o), x: r1(o.x), y: r1(o.y), builtin: !!baseLabel(o.id) })),
    removedLabels: [...ED.lhid],
    routes: vr.map(r => { const g = geoOf(r); return { ...plainRoute(r), name: routeName(r), builtin: r.base, ...(g && !g.fail ? { hexes: g.hexes, bridges: g.bridges.map(b => [r1(b.x), r1(b.y)]), tunnels: g.tunnels } : { unreachable: true }) }; }),
    removedRoads: [...ED.rthid],
    zones: Object.fromEntries([...ED.zinfo]), biomes: Object.fromEntries([...ED.binfo]), pointKinds: Object.fromEntries([...ED.kinfo]),
    points: [...ED.points.values()].map(o => ({ ...o, builtin: PTB.has(o.id) })), removedPoints: [...ED.phid],
    stanther: ED.stan == null ? null : { hex: ED.stan, col: cOf(ED.stan), row: kOf(ED.stan), x: r1(CX[ED.stan]), y: r1(CY[ED.stan]) },
    trade: tradeExport(),
  };
  offer(FSLUG + '-edits.json', JSON.stringify(out, null, 1));
};

// the year's trade as data: what each city makes, sells, buys and lacks, and every flow with its goods and its way
function tradeExport() {
  if (!ECON) return null;
  const E = ECON, nm = k => E.cities[k].id, r2 = v => Math.round(v * 100) / 100, goods = o => Object.fromEntries(Object.entries(o).filter(([, v]) => v >= 0.01).map(([g, v]) => [goodName(g), r2(v)]));
  return {
    note: 'loads are relative to each other on this map; production comes from the ground around each city; prices are shares of each category\'s base value, after the Victoria 3 rule, before and after trade; hubRank is a city\'s rank as a centre of distribution (0 none, 1 market town, 2 regional, 3 great), sendsTo the centre it sends its goods to; line tiers are trunk (great centre to great centre), main (between centres of rank 2 and up), branch (a place to its centre) and user',
    categories: Object.fromEntries(ECATS.map(c => [c, ECAT[c].name])),
    cities: E.cities.map((c, k) => ({ id: c.id, name: c.name, kind: c.kind, zone: c.zone, port: ['none', 'river or lake', 'sea'][c.port],
      production: goods(Object.fromEntries(E.prod[k])), short: Object.fromEntries(Object.entries(c.short || {}).map(([cat, v]) => [cat, r2(v)])), unsold: goods(Object.fromEntries(E.left[k])),
      hubRank: c.rank, rankSetByUser: ED.hubs.has(c.id), sendsTo: c.home >= 0 ? E.cities[c.home].id : null, sendsToChosen: !!c.chosen, valueThrough: r2(c.through), rankByValue: c.sug,
      prices: Object.fromEntries(ECATS.filter(cat => E.MK[k][cat] && (E.MK[k][cat][0] > 0.01 || E.MK[k][cat][1] > 0.01)).map(cat => [cat, { before: r2(E.P0[k][cat]), after: r2(E.P1[k][cat]), made: r2(E.MK[k][cat][0]), wanted: r2(E.MK[k][cat][1]), bought: r2(E.MK[k][cat][2]), sold: r2(E.MK[k][cat][3]) }])) })),
    hubs: E.cities.filter(c => c.hub).map(c => ({ id: c.id, rank: c.rank })),
    lines: E.links.map(L => ({ id: L.id, from: nm(L.ia), to: nm(L.ib), tier: L.tier, mode: L.mode, edited: !!L.own, via: L.via || [], unreachable: !!L.fail, loads: r2(L.vol),
      water: L.wet, land: L.dry, onRoad: L.road, way: L.states ? L.states.filter((t, i) => !i || (t >> 1) !== (L.states[i - 1] >> 1)).map(t => [t >> 1, t & 1 ? 'boat' : 'land']) : [] })),
    flows: E.flows.map(f => ({ from: nm(f.from), to: nm(f.to), category: f.cat, loads: r2(f.amt), by: f.by, goods: goods(f.goods), lines: f.way.map(([li]) => E.links[li].id) })),
  };
}

