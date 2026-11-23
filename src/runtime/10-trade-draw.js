// ---------- drawing the trade ----------
// Every line of the network runs from city to city: blue where boats carry it, amber where caravans do, wider for more loads,
// with a light stripe down a main or trunk line, and dashed while nothing moves on it. Where lines share a stretch they are
// drawn as one, as wide as their loads together. A centre wears one gold ring for each rank.
const TRD = {
  water: { name: 'การค้าทางน้ำ', line: 'rgba(118,214,250,.95)', core: 'rgba(236,252,255,.95)', px: 3 },
  caravan: { name: 'คาราวาน', line: 'rgba(242,170,62,.95)', core: 'rgba(255,240,200,.95)', px: 3 },
};
let tsel = null, tlsel = null, tcat = '', ttool = 'pick', tmode = 'auto', tpend = null, tprev = null;
const PCOL = { mid: [232, 226, 208], lo: [62, 184, 166], hi: [228, 82, 58] };
function priceCol(x) {                              // a price as a share of the base value, as a colour
  const t = Math.max(-1, Math.min(1, (x - 1) / 0.75)), b = t < 0 ? PCOL.lo : PCOL.hi, u = Math.abs(t);
  return 'rgb(' + PCOL.mid.map((m, i) => Math.round(m + (b[i] - m) * u)).join(',') + ')';
}
const pctP = x => Math.round(x * 100) + '%';
const priceWord = x => x >= 1.5 ? 'แพงมาก' : x >= 1.15 ? 'แพง' : x <= 0.5 ? 'ถูกมาก' : x <= 0.85 ? 'ถูก' : 'ราคากลาง';
const linkVol = L => tcat ? L.cats.get(tcat) || 0 : L.vol;
const volW = (v, m, px) => Math.max((m ? 0.8 : 0.55) + 0.5 * Math.sqrt(v), ((m ? 1.8 : 1.2) + 1.0 * Math.sqrt(v)) * px);
const isMain = L => L.tier === 'main' || L.tier === 'trunk' || L.tier === 'lore';
const linkW = (L, px) => volW(linkVol(L), isMain(L), px);
const bundleVol = ch => ch.ls.reduce((a, li) => a + linkVol(ECON.links[li]), 0);
const bundleW = (ch, px) => volW(bundleVol(ch), ch.main, px);
function strokeLink(c, px, L, geo, glow) {
  if (!geo) return;
  const runs = geo.runs.filter(r => showR[r.wet ? 'water' : 'caravan']); if (!runs.length) return;
  const w = linkW(L, px), idle = linkVol(L) < 0.03;
  c.lineJoin = 'round'; c.lineCap = 'round';
  if (glow) for (const r of runs) { linePath(c, r.q); c.strokeStyle = 'rgba(255,232,160,.55)'; c.lineWidth = w + 6 * px; c.stroke(); }
  c.setLineDash(idle ? [Math.max(1.6, 3.2 * px), Math.max(1.3, 2.6 * px)] : []);
  for (const r of runs) { linePath(c, r.q); c.strokeStyle = 'rgba(14,18,24,.6)'; c.lineWidth = w + Math.max(0.6, 1.2 * px); c.stroke(); }
  for (const r of runs) { linePath(c, r.q); c.strokeStyle = TRD[r.wet ? 'water' : 'caravan'].line; c.lineWidth = w; c.stroke(); }
  c.setLineDash([]);
  if (isMain(L) && !idle) for (const r of runs) { linePath(c, r.q); c.strokeStyle = TRD[r.wet ? 'water' : 'caravan'].core; c.lineWidth = Math.max(0.5, w * 0.28); c.stroke(); }
}
function focusLinks(id) {                           // the lines a city's own goods ride, and the lines that end at it
  const k = ECON.cities.findIndex(c => c.id === id), s = new Set();
  for (const f of ECON.flows) if ((f.from === k || f.to === k) && (!tcat || f.cat === tcat)) for (const [li] of f.way) s.add(li);
  ECON.links.forEach((L, li) => { if (L.ia === k || L.ib === k) s.add(li); });
  return s;
}
function drawTrade(c, px, live) {
  if (!ECON || (!showR.water && !showR.caravan)) return;
  const here = live && mode === 'trade', focus = here && tsel ? focusLinks(tsel) : null;
  const si = here && tlsel ? ECON.links.findIndex(x => x.id === tlsel) : -1, sel = si >= 0 ? ECON.links[si] : null;
  const bend = sel && act && act.k === 'tbend' && act.id === sel.id && act.geo ? act.geo : null;
  const B = (ECON.bundles || []).filter(ch => showR[ch.wet ? 'water' : 'caravan']), W = B.map(ch => bundleW(ch, px)), V = B.map(bundleVol);
  c.lineJoin = 'round'; c.lineCap = 'round';
  if (sel && sel.geo && !bend) {                    // the chosen line: a glow along all of it, under the stretches it shares
    const w = Math.max(linkW(sel, px), ...B.map((ch, i) => ch.ls.includes(si) ? W[i] : 0));
    for (const r of sel.geo.runs) if (showR[r.wet ? 'water' : 'caravan']) { linePath(c, r.q); c.strokeStyle = 'rgba(255,232,160,.55)'; c.lineWidth = w + 6 * px; c.stroke(); }
  }
  const dash = [Math.max(1.6, 3.2 * px), Math.max(1.3, 2.6 * px)];
  for (let pass = 0; pass < 3; pass++) B.forEach((ch, i) => {   // the dark edges of every stretch, then the colours, then the stripes of the main lines
    const idle = V[i] < 0.03; if (pass === 2 && (!ch.main || idle)) return;
    c.globalAlpha = focus && !ch.ls.some(li => focus.has(li)) ? 0.22 : 1;
    c.setLineDash(pass < 2 && idle ? dash : []);
    const st = TRD[ch.wet ? 'water' : 'caravan'];
    linePath(c, ch.q);
    c.strokeStyle = pass === 0 ? 'rgba(14,18,24,.6)' : pass === 1 ? st.line : st.core;
    c.lineWidth = pass === 0 ? W[i] + Math.max(0.6, 1.2 * px) : pass === 1 ? W[i] : Math.max(0.3, W[i] * 0.28);
    c.stroke();
  });
  c.setLineDash([]); c.globalAlpha = 1;
  if (bend) strokeLink(c, px, sel, bend, true);     // a line being bent: its new course over the old
  const vc = new Map(visibleCities().map(v => [v.id, v])), priced = here && tcat && ECON.P1;
  ECON.cities.forEach((ct, k) => {
    const v = vc.get(ct.id) || ct, st = CK[ct.kind] || CK.city, r0 = Math.max(st.r * px, st.min);
    const bk = priced && ECON.MK[k][tcat], on = bk && (bk[0] > 0.01 || bk[1] > 0.01);
    if (on) {                                         // the price of the chosen category: a ring from sea green (cheap) to red (dear)
      const r = r0 + Math.max(1, 1.8 * px);
      c.beginPath(); c.arc(v.x, v.y, r, 0, 2 * Math.PI); c.lineWidth = Math.max(1.5, 3.4 * px); c.strokeStyle = 'rgba(14,18,24,.8)'; c.stroke();
      c.beginPath(); c.arc(v.x, v.y, r, 0, 2 * Math.PI); c.lineWidth = Math.max(0.9, 2.2 * px); c.strokeStyle = priceCol(ECON.P1[k][tcat]); c.stroke();
    }
    if (!ct.hub) return;                              // the centres: one ring for each rank
    for (let l = 0; l < Math.max(1, ct.rank); l++) {
      const r = r0 + Math.max(1.6, (on ? 5 : 3.4) * px) + l * Math.max(1.2, 2.4 * px);
      c.beginPath(); c.arc(v.x, v.y, r, 0, 2 * Math.PI); c.lineWidth = Math.max(0.9, 2.2 * px); c.strokeStyle = 'rgba(14,18,24,.75)'; c.stroke();
      c.beginPath(); c.arc(v.x, v.y, r, 0, 2 * Math.PI); c.lineWidth = Math.max(0.55, 1.3 * px); c.strokeStyle = '#f2c862'; c.stroke();
    }
  });
  if (!here) return;
  if (tpend) {                                        // a line being laid: a ring at its first city, and its course to the city under the pointer
    const a = vc.get(tpend);
    if (a) { c.beginPath(); c.arc(a.x, a.y, 9 * px, 0, 2 * Math.PI); c.setLineDash([3 * px, 2 * px]); c.lineWidth = 1.8 * px; c.strokeStyle = '#ffd678'; c.stroke(); c.setLineDash([]); }
    const pv = tradePreview(); if (pv) strokeLink(c, px, { tier: 'user', vol: 0.5, cats: new Map() }, pv, true);
  }
  const L = tlsel && ECON.links.find(x => x.id === tlsel);
  if (L && editable) {
    const via = act && act.k === 'tbend' && act.id === L.id ? act.via : L.via || [];
    for (const p of via) { c.beginPath(); c.arc(p[0], p[1], 4.2 * px, 0, 2 * Math.PI); c.fillStyle = '#fff4d6'; c.fill(); c.lineWidth = 1.5 * px; c.strokeStyle = '#2a2116'; c.stroke(); }
  }
}
function tradePreview() {
  if (!cursor || !tpend || !ECON) return null;
  const b = cityAt(cursor[0], cursor[1]); if (!b || b.id === tpend) return null;
  const key = JSON.stringify([tpend, b.id, tmode, ECON.ver]);
  if (!tprev || tprev.key !== key) {
    const A = ECON.cities.find(c => c.id === tpend), B = ECON.cities.find(c => c.id === b.id);
    const r = A && B ? eRoute({ mode: tmode, via: [] }, A, B) : null;
    tprev = { key, geo: r ? eGeo(r.states, A, B) : null };
  }
  return tprev.geo;
}
const linkDist = (L, geo, mx, my) => { let d = 1e9; for (const r of (geo || L.geo).runs) d = Math.min(d, distToLine(r.q, mx, my)); return d; };
function chainAt(mx, my) {                          // the stretch of the network under the pointer
  if (!ECON || !ECON.bundles) return null;
  let best = null, bd = 1e9;
  for (const ch of ECON.bundles) {
    if (!showR[ch.wet ? 'water' : 'caravan']) continue;
    const lim = bundleW(ch, 1 / view.s) / 2 + Math.max(2, 4 / view.s);
    if (!hits(ch.bb, mx - lim, my - lim, mx + lim, my + lim)) continue;
    const d = distToLine(ch.q, mx, my); if (d <= lim && d < bd) { bd = d; best = ch; }
  }
  return best;
}
const chainLines = ch => ch.ls.map(li => ECON.links[li]).sort((a, b) => linkVol(b) - linkVol(a) || (a.id < b.id ? -1 : 1));
function linkAt(mx, my) {                           // the line under the pointer: the chosen one where it runs, else the busiest there
  const ch = chainAt(mx, my); if (!ch) return null;
  const ls = chainLines(ch); return ls.find(L => L.id === tlsel) || ls[0];
}
function linkLegAt(L, x, y) {                        // which leg of the line, between its waypoints, a point lies on
  const P = L.geo.raw; let best = 0, bd = 1e9;
  for (let i = 0; i < P.length - 1; i++) { const d = segDist(x, y, P[i], P[i + 1]); if (d < bd) { bd = d; best = i; } }
  let leg = 0; for (let l = 0; l < L.legs.length; l++) if (best >= L.legs[l]) leg = l;
  return leg;
}
const viaAt = (via, mx, my) => { const lim = Math.max(3, 8 / view.s); for (let i = 0; i < via.length; i++) if (Math.hypot(via[i][0] - mx, via[i][1] - my) <= lim) return i; return -1; };
const fmtL = v => v >= 9.95 ? Math.round(v).toString() : v >= 0.095 ? v.toFixed(1) : v.toFixed(2);
const topGoods = (m, n) => [...m].sort((a, b) => b[1] - a[1]).filter(([, v]) => v >= 0.05).slice(0, n).map(([id, v]) => `${esc(goodName(id))} ${fmtL(v)}`).join(' · ');
const linkGoods = L => tcat ? new Map([...L.goods].filter(([g]) => catOf(g) === tcat)) : L.goods;
const linkName = L => L.tier === 'main' ? 'เส้นหลัก' : L.tier === 'trunk' ? 'เส้นสายใหญ่' : L.tier === 'branch' ? 'เส้นสาขา' : L.tier === 'lore' || !editable ? 'เส้นประจำ' : 'เส้นที่วางเพิ่ม';
const howText = L => (L.wet && L.dry ? `ทางน้ำ ${L.wet} ช่อง คาราวาน ${L.dry} ช่อง` : L.wet ? `ทางน้ำ ${L.wet} ช่อง` : `คาราวาน ${L.dry} ช่อง`) + (L.dry && L.road ? ` บนถนน ${L.road} ช่อง` : '');
function linkTipHTML(L) {
  const v = linkVol(L);
  return `<b>${linkName(L)} ${esc(ECON.cities[L.ia].name)} กับ${esc(ECON.cities[L.ib].name)}</b><div class="m">${howText(L)}${v >= 0.03 ? ' · ขนส่ง ' + fmtL(v) + ' หน่วย' : ' · ยังไม่มีของวิ่ง'}</div>`
    + (v >= 0.03 ? `<div class="lore">${topGoods(linkGoods(L), 5)}</div>` : '');
}
function bundleTipHTML(ch) {                        // a stretch several lines share: the lines on it and what they carry together
  const ls = chainLines(ch); if (ls.length === 1) return linkTipHTML(ls[0]);
  const v = bundleVol(ch), gs = new Map(); for (const L of ls) for (const [g, x] of linkGoods(L)) gs.set(g, (gs.get(g) || 0) + x);
  let h = `<b>เส้นการค้า ${ls.length} เส้นวิ่งร่วมกันช่วงนี้</b><div class="m">${ch.wet ? 'ทางน้ำ' : 'คาราวาน'}${v >= 0.03 ? ' · ขนส่งรวม ' + fmtL(v) + ' หน่วย' : ' · ยังไม่มีของวิ่ง'}</div>`;
  h += ls.slice(0, 6).map(L => `<div class="m">${linkName(L)} ${esc(ECON.cities[L.ia].name)} กับ${esc(ECON.cities[L.ib].name)}${linkVol(L) >= 0.03 ? ' · ' + fmtL(linkVol(L)) : ''}</div>`).join('');
  if (ls.length > 6) h += `<div class="m">และอีก ${ls.length - 6} เส้น</div>`;
  return h + (v >= 0.03 ? `<div class="lore">${topGoods(gs, 5)}</div>` : '');
}
// what a city sells and buys, short: for the hover cards
function cityTradeLine(id) {
  if (!ECON) return '';
  const k = ECON.cities.findIndex(c => c.id === id); if (k < 0) return '';
  const c = ECON.cities[k], sum = (fs, pick) => { const m = new Map(); for (const f of fs) for (const g in f.goods) m.set(g, (m.get(g) || 0) + f.goods[g]); return [...m].sort((a, b) => b[1] - a[1]).slice(0, pick).map(([g]) => esc(goodName(g))).join(' '); };
  const out = ECON.flows.filter(f => f.from === k), inn = ECON.flows.filter(f => f.to === k);
  let h = c.hub ? `<div class="s">${RANKN[c.rank]} ระดับ ${c.rank}</div>` : '';
  if (c.home >= 0 && c.home !== k) h += `<div class="m">ส่งของผ่าน${RANKN[ECON.cities[c.home].rank]}${esc(ECON.cities[c.home].name)}</div>`;
  const bk = mode === 'trade' && tcat && ECON.MK[k][tcat];
  if (bk && (bk[0] > 0.01 || bk[1] > 0.01)) h += `<div class="m">ราคา${esc(ECAT[tcat].name)} ${pctP(ECON.P1[k][tcat])} ของราคากลาง</div>`;
  if (out.length) h += `<div class="m">ส่งออก ${sum(out, 3)}</div>`;
  if (inn.length) h += `<div class="m">นำเข้า ${sum(inn, 3)}</div>`;
  if (!ECON.links.some(L => !L.fail && (L.ia === k || L.ib === k))) h += '<div class="mine">ยังไม่มีเส้นการค้ามาถึง</div>';
  return h;
}

