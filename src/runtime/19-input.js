// ---------- pointer, touch and keys ----------
const toMap = (ex, ey) => { const r = cv.getBoundingClientRect(); return [(ex - r.left - view.x) / view.s, (ey - r.top - view.y) / view.s]; };
function clampView() {
  const pl = padL(), w = box.clientWidth - padR() - pl, h = boxH();
  view.s = Math.max(fitS, Math.min(fitS * 6, view.s));
  const mw = G.w * view.s, mh = G.h * view.s;      // a map smaller than the room left by the panels sits in its middle; a larger one may be dragged until its edge shows
  view.x = mw <= w + 0.5 ? pl + (w - mw) / 2 : Math.min(pl, Math.max(pl + w - mw, view.x));
  view.y = mh <= h + 0.5 ? (h - mh) / 2 : Math.min(0, Math.max(h - mh, view.y));
}
function zoomAt(f, sx, sy) { const s0 = view.s; view.s *= f; clampView(); const k = view.s / s0; view.x = sx - (sx - view.x) * k; view.y = sy - (sy - view.y) * k; clampView(); requestDraw(); }
cv.addEventListener('wheel', e => { e.preventDefault(); const r = cv.getBoundingClientRect(); zoomAt(e.deltaY < 0 ? 1.18 : 1 / 1.18, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
$('zin').onclick = () => zoomAt(1.4, padL() + (box.clientWidth - padR() - padL()) / 2, cv.clientHeight / 2);
$('zout').onclick = () => zoomAt(1 / 1.4, padL() + (box.clientWidth - padR() - padL()) / 2, cv.clientHeight / 2);
$('zfit').onclick = () => fit();
const bn = $('names');
bn.onclick = () => { showNames = !showNames; bn.setAttribute('aria-pressed', String(showNames)); requestDraw(); };
const bcn = $('cnames');
bcn.setAttribute('aria-pressed', String(showCityNames));
bcn.onclick = () => {
  showCityNames = !showCityNames; bcn.setAttribute('aria-pressed', String(showCityNames));
  try { localStorage.setItem('gresland-city-names', showCityNames ? '1' : '0'); } catch (err) { /* the choice lasts this visit */ }
  requestDraw();
};
const ptrs = new Map();
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('pointerdown', e => {
  ptrs.set(e.pointerId, [e.clientX, e.clientY]);
  try { cv.setPointerCapture(e.pointerId); } catch (err) { /* capture is a nicety */ }
  if (ptrs.size === 2) { abortAct(); const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, m: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], s: view.s, vx: view.x, vy: view.y }; return; }
  if (ptrs.size > 2 || pinch) return;
  hideTip(true); hot = -1;
  const [mx, my] = toMap(e.clientX, e.clientY);
  if (e.pointerType !== 'mouse') { const tc = cityAt(mx, my), tid = tc ? tc.id : null; if (tid !== tapCity) { tapCity = tid; requestDraw(); } }   // a tap shows a small place's name until the next tap
  // in the view mode and the city mode a city (its marker or its name), a map label, or Mount Stanther can be picked up and moved;
  // in the place-name mode only the names
  if (e.button === 0 && editable && !spaceDown && (mode === 'view' || mode === 'city' || mode === 'label')) {
    const pk = mode === 'label' ? (lab => lab ? { k: 'label', id: lab } : null)(labelAt(mx, my)) : pickAt(mx, my);
    if (pk && pk.k === 'city') {
      commitCityEdit(); cv.classList.add('drag');
      act = { k: 'cdrag', id: pk.v.id, sx: e.clientX, sy: e.clientY, d: [pk.v.x - mx, pk.v.y - my], pos: null }; requestDraw(); return;
    }
    if (pk && pk.k === 'label') {
      const v = visibleLabels().find(l => l.id === pk.id); commitCityEdit(); commitLabelEdit(); cv.classList.add('drag');
      act = { k: 'ldrag', id: pk.id, sx: e.clientX, sy: e.clientY, d: [v.x - mx, v.y - my], pos: null }; requestDraw(); return;
    }
    if (pk && pk.k === 'stan') {
      const P = stPeak(); commitCityEdit(); cv.classList.add('drag');
      act = { k: 'sdrag', sx: e.clientX, sy: e.clientY, d: [CX[P] - mx, CY[P] - my], target: -1 }; requestDraw(); return;
    }
  }
  if (e.button === 0 && editable && !spaceDown && mode === 'route') {
    // the chosen route: grabbed on a waypoint, that waypoint moves; grabbed on its line, a new waypoint goes there
    const r = rsel && visibleRoutes().find(v => v.id === rsel), g = r && geoOf(r);
    if (r && g && !g.fail) {                        // v0.18.4: an end of the chosen route goes to another city or spot
      const end = endHandleAt(r, mx, my);
      if (end) { cv.classList.add('drag'); act = { k: 'rend', id: r.id, end, to: r[end], sx: e.clientX, sy: e.clientY, moved: false, geo: g, at: [mx, my] }; requestDraw(); return; }
    }
    if (r && g && !g.fail) {
      const hi = handleAt(r, mx, my);
      if (hi >= 0 || distToLine(drawnLine(r, g), mx, my) <= Math.max(3, 7 / view.s)) {
        const via = (r.via || []).map(p => [p[0], p[1]]); let at = hi;
        if (at < 0) { at = legAt(g, mx, my); via.splice(at, 0, [r1(mx), r1(my)]); }
        cv.classList.add('drag');
        act = { k: 'rbend', id: r.id, at, via, sx: e.clientX, sy: e.clientY, moved: false, geo: g }; requestDraw(); return;
      }
    }
    // v0.18.4: any road or railway is bent straight from a press on its line; a click without a drag still picks it
    const r2 = rpend == null && !cityAt(mx, my) ? routeAt(mx, my) : null, g2 = r2 && geoOf(r2);
    if (r2 && g2 && !g2.fail) {
      const via = (r2.via || []).map(p => [p[0], p[1]]), at = legAt(g2, mx, my); via.splice(at, 0, [r1(mx), r1(my)]);
      act = { k: 'rbend', id: r2.id, at, via, sx: e.clientX, sy: e.clientY, moved: false, geo: g2, fresh: true, px: [mx, my] }; return;
    }
    act = { k: 'rnew', sx: e.clientX, sy: e.clientY, at: [mx, my], vx: view.x, vy: view.y }; return;
  }
  if (e.button === 0 && !spaceDown && mode === 'trade') {
    // the chosen line: grabbed on a waypoint, that waypoint moves; grabbed on the line, a new waypoint goes there
    const L = editable && ttool === 'pick' && tlsel && ECON ? ECON.links.find(x => x.id === tlsel) : null;
    if (L && L.geo) {
      const hi = viaAt(L.via || [], mx, my);
      if (hi >= 0 || linkDist(L, null, mx, my) <= Math.max(3, 7 / view.s)) {
        const via = (L.via || []).map(p => [p[0], p[1]]); let at = hi;
        if (at < 0) { at = linkLegAt(L, mx, my); via.splice(at, 0, [r1(mx), r1(my)]); }
        cv.classList.add('drag');
        act = { k: 'tbend', id: L.id, at, via, sx: e.clientX, sy: e.clientY, moved: false, geo: L.geo, hi, px: [mx, my] }; requestDraw(); return;
      }
    }
    // v0.18.4: any trade line is bent straight from a press on it (the chosen one where it runs, else the busiest there)
    const L2 = editable && ttool === 'pick' && ECON && !cityAt(mx, my) ? linkAt(mx, my) : null;
    if (L2 && L2.geo) {
      const via = (L2.via || []).map(p => [p[0], p[1]]), at = linkLegAt(L2, mx, my); via.splice(at, 0, [r1(mx), r1(my)]);
      act = { k: 'tbend', id: L2.id, at, via, sx: e.clientX, sy: e.clientY, moved: false, geo: L2.geo, hi: -1, px: [mx, my], fresh: true }; return;
    }
    act = { k: 'tnew', sx: e.clientX, sy: e.clientY, at: [mx, my], vx: view.x, vy: view.y }; return;
  }
  if (e.button === 0 && editable && !spaceDown && mode === 'info') {
    const p = pointAt(mx, my);
    if (p) { commitInfo(); cv.classList.add('drag'); act = { k: 'pdrag', id: p.id, sx: e.clientX, sy: e.clientY, d: [p.x - mx, p.y - my], pos: null }; requestDraw(); return; }
    act = { k: 'inew', sx: e.clientX, sy: e.clientY, at: [mx, my], vx: view.x, vy: view.y }; return;
  }
  if (e.button === 0 && !spaceDown && mode === 'climate') { act = { k: 'wnew', sx: e.clientX, sy: e.clientY, at: [mx, my], vx: view.x, vy: view.y }; return; }
  if (mode === 'view' || !editable || e.button === 1 || e.button === 2 || spaceDown) {
    act = { k: 'pan', x: e.clientX, y: e.clientY, vx: view.x, vy: view.y }; cv.classList.add('pan'); return;
  }
  if (e.button !== 0) return;
  if (mode === 'terrain' || (mode === 'river' && rtool === 'erase')) { act = { k: mode === 'terrain' ? 'paint' : 'erase', ch: new Map(), pr: new Map(), gone: [], lock: new Set(), last: null, lastHex: -1, flip: false }; strokeTo(mx, my); }
  else if (mode === 'river') { if (!riv) riv = { pts: [], kind: rkind }; act = { k: 'rdraw', sx: e.clientX, sy: e.clientY, start: [mx, my], free: false }; }
  else if (mode === 'city') act = { k: 'cnew', sx: e.clientX, sy: e.clientY, at: [mx, my], vx: view.x, vy: view.y };
  else if (mode === 'label') act = { k: 'lnew', sx: e.clientX, sy: e.clientY, at: [mx, my], vx: view.x, vy: view.y };
});
cv.addEventListener('pointermove', e => {
  if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, [e.clientX, e.clientY]);
  if (pinch) {
    if (ptrs.size < 2) return;
    const [a, b] = [...ptrs.values()], r = cv.getBoundingClientRect();
    const s = Math.max(fitS, Math.min(fitS * 6, pinch.s * Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch.d));
    const mx = (pinch.m[0] - r.left - pinch.vx) / pinch.s, my = (pinch.m[1] - r.top - pinch.vy) / pinch.s;
    view.s = s; view.x = (a[0] + b[0]) / 2 - r.left - mx * s; view.y = (a[1] + b[1]) / 2 - r.top - my * s; clampView(); requestDraw(); return;
  }
  const [mx, my] = toMap(e.clientX, e.clientY); cursor = [mx, my];
  if (act) {
    if (act.k === 'pan') { view.x = act.vx + e.clientX - act.x; view.y = act.vy + e.clientY - act.y; clampView(); requestDraw(); return; }
    if (act.k === 'paint' || act.k === 'erase') { strokeTo(mx, my); return; }
    const far = Math.hypot(e.clientX - act.sx, e.clientY - act.sy) > 4;
    if (act.k === 'rdraw') {
      if (!act.free && far) { act.free = true; const l = riv.pts[riv.pts.length - 1]; if (!l || Math.hypot(l[0] - act.start[0], l[1] - act.start[1]) > 1.5) riv.pts.push(act.start); }
      if (act.free) { const l = riv.pts[riv.pts.length - 1]; if (Math.hypot(l[0] - mx, l[1] - my) >= Math.max(3, 5 / view.s)) riv.pts.push([mx, my]); }
      requestDraw(); return;
    }
    if (act.k === 'cdrag' || act.k === 'ldrag') { if (far || act.pos) act.pos = [r1(Math.max(0, Math.min(G.w, mx + act.d[0]))), r1(Math.max(0, Math.min(G.h, my + act.d[1])))]; requestDraw(); return; }
    if (act.k === 'sdrag') { if (far || act.target >= 0) act.target = hexAt(mx + act.d[0], my + act.d[1]); requestDraw(); return; }
    if (act.k === 'pdrag') { if (far || act.pos) act.pos = [r1(Math.max(0, Math.min(G.w, mx + act.d[0]))), r1(Math.max(0, Math.min(G.h, my + act.d[1])))]; requestDraw(); return; }
    if (act.k === 'tbend') {
      if (!act.moved && !far) return;
      if (!act.moved && act.fresh) { tlsel = act.id; tsel = null; cv.classList.add('drag'); }   // the line grabbed becomes the chosen one
      act.moved = true; act.via[act.at] = [r1(Math.max(0, Math.min(G.w, mx))), r1(Math.max(0, Math.min(G.h, my)))];
      if (!act.pend) {                              // the course is found again once a frame, not once an event
        act.pend = true;
        requestAnimationFrame(() => {
          const a = act; if (!a || a.k !== 'tbend') return; a.pend = false;
          const L = ECON && ECON.links.find(x => x.id === a.id);
          if (L) { const A = ECON.cities[L.ia], B = ECON.cities[L.ib], r = eRoute({ ...L, via: a.via }, A, B); if (r) a.geo = eGeo(r.states, A, B); }
          requestDraw();
        });
      }
      return;
    }
    if (act.k === 'rend') {
      if (!act.moved && !far) return;
      act.moved = true; act.at = [mx, my];
      const c = cityAt(mx, my); act.to = c ? c.id : endAt(mx, my, act.id);
      if (!act.pend) {
        act.pend = true;
        requestAnimationFrame(() => {
          const a = act; if (!a || a.k !== 'rend') return; a.pend = false;
          const r = visibleRoutes().find(v => v.id === a.id);
          if (r && a.to != null) { ensureRoutes(); const g = routeGeom({ ...r, [a.end]: a.to }); a.geo = g && !g.fail ? g : null; } else a.geo = null;
          requestDraw();
        });
      }
      return;
    }
    if (act.k === 'rbend') {
      if (!act.moved && !far) return;
      if (!act.moved && act.fresh) { selectRoute(act.id); cv.classList.add('drag'); }   // the road grabbed becomes the chosen one
      act.moved = true; act.via[act.at] = [r1(Math.max(0, Math.min(G.w, mx))), r1(Math.max(0, Math.min(G.h, my)))];
      if (!act.pend) {                              // the course is found again once a frame, not once an event
        act.pend = true;
        requestAnimationFrame(() => {
          const a = act; if (!a || a.k !== 'rbend') return; a.pend = false;
          const r = visibleRoutes().find(v => v.id === a.id); if (r) { ensureRoutes(); const g = routeGeom({ ...r, via: a.via }); if (g && !g.fail) a.geo = g; }
          requestDraw();
        });
      }
      return;
    }
    if ((act.k === 'cnew' || act.k === 'lnew' || act.k === 'rnew' || act.k === 'inew' || act.k === 'tnew' || act.k === 'wnew') && far) { act = { k: 'pan', x: act.sx, y: act.sy, vx: act.vx, vy: act.vy }; cv.classList.add('pan'); }   // dragging open ground moves the map
    return;
  }
  const hc = cityAt(mx, my), hid = hc ? hc.id : null;
  if (hid !== hoverCity) { hoverCity = hid; requestDraw(); }
  cv.classList.toggle('overcity', editable && (mode === 'label' ? !!labelAt(mx, my) : mode === 'info' ? !!pointAt(mx, my) : mode === 'route' ? !!(cityAt(mx, my) || routeAt(mx, my)) : (mode === 'view' || mode === 'city') && !!pickAt(mx, my)));
  cv.classList.toggle('pick', mode === 'trade' && !!(cityAt(mx, my) || chainAt(mx, my)));
  if (mode === 'trade') { showTradeTip(mx, my, e); return; }
  if (mode === 'climate') { const id = hexAt(mx, my); cv.classList.toggle('pick', !!hc); if (id !== hot) { hot = id; requestDraw(); } showClimTip(mx, my, e, id); return; }
  if (mode === 'view') {
    const id = hexAt(mx, my);
    if (id !== hot) { hot = id; requestDraw(); }
    if (id >= 0) showTip(id, mx, my, e); else hideTip(true);
  } else requestDraw();
});
function endPointer(e, cancel) {
  ptrs.delete(e.pointerId);
  if (pinch) { if (ptrs.size < 2) pinch = null; return; }
  if (!act) return;
  const a = act; act = null; cv.classList.remove('pan'); cv.classList.remove('drag');
  if (a.k === 'paint' || a.k === 'erase') { act = a; endStroke(cancel); act = null; return; }
  if (cancel) { requestDraw(); return; }
  const [mx, my] = toMap(e.clientX, e.clientY);
  if (a.k === 'rdraw') {
    if (a.free) { const l = riv.pts[riv.pts.length - 1]; if (Math.hypot(l[0] - mx, l[1] - my) > 1.5) riv.pts.push([mx, my]); finishRiver(); }
    else { const l = riv.pts[riv.pts.length - 1]; if (!l || Math.hypot(l[0] - mx, l[1] - my) > 4 / view.s) riv.pts.push([mx, my]); updateHistory(); requestDraw(); }
  } else if (a.k === 'cdrag') {
    if (a.pos) {
      const own = ownCity(a.id);
      if (own) doOp({ k: 'c~', id: a.id, a: { x: own.x, y: own.y }, b: { x: a.pos[0], y: a.pos[1] } });
      else { const b = D.cities.find(c => c.id === a.id); if (b) doOp({ k: 'c+', c: { id: b.id, name: b.name, kind: b.kind || 'city', note: b.note, x: a.pos[0], y: a.pos[1] } }); }
    }
    if (mode === 'city') { if (a.id !== sel) selectCity(a.id); else refreshForm(); }   // the form opens after the drag, so the bar never shifts mid-move
    else refreshForm();
  } else if (a.k === 'ldrag') {
    if (a.pos) {
      const v = visibleLabels().find(l => l.id === a.id), now = ED.labels.get(a.id);
      if (v) doOp({ k: 'lb', id: a.id, a: now ? { ...now } : null, b: { ...plainLabel(v), x: a.pos[0], y: a.pos[1] } });
    }
    if (mode === 'label') { if (a.id !== lsel) selectLabel(a.id); else { rebaseLabel(); refreshLabelForm(); } }
  } else if (a.k === 'lnew' && Math.hypot(e.clientX - a.sx, e.clientY - a.sy) <= 4) {
    if (lsel) selectLabel(null);                  // a click beside the chosen name lets it go; the next click places a new one
    else {
      const o = { id: newLabelId(), text: 'ชื่อใหม่', x: r1(a.at[0]), y: r1(a.at[1]), size: lsize, ang: 0, color: '#f3ead2' };
      doOp({ k: 'lb', id: o.id, a: null, b: o }); selectLabel(o.id); const t = $('lfText'); t.focus(); t.select();
    }
  } else if (a.k === 'rend') {
    if (a.moved) moveRouteEnd(a.id, a.end, a.to);
    else routeClick(a.at[0], a.at[1]);              // a click on the end, not a drag: as a click there always did
  } else if (a.k === 'rbend' && !a.moved && a.fresh) {
    routeClick(a.px[0], a.px[1]);                   // a click on a road, not a drag: it is picked
  } else if (a.k === 'rbend') {
    if (a.moved) {
      const r = visibleRoutes().find(v => v.id === a.id), own = ED.routes.get(a.id);
      if (r) doOp({ k: 'rt', id: a.id, a: own ? { ...own } : null, b: { ...plainRoute(r), via: a.via.map(p => [r1(p[0]), r1(p[1])]) } });
      refreshRouteForm();
    }
  } else if (a.k === 'rnew' && Math.hypot(e.clientX - a.sx, e.clientY - a.sy) <= 4) {
    routeClick(a.at[0], a.at[1]);
  } else if (a.k === 'pdrag') {
    if (a.pos) {
      const h = hexAt(a.pos[0], a.pos[1]), p = visiblePoints().find(v => v.id === a.id), own = ED.points.get(a.id);
      if (h < 0 || isW(eff(h))) flash('วางจุดในน้ำไม่ได้');
      else if (p) doOp({ k: 'pt', id: a.id, a: own ? { ...own } : null, b: { id: p.id, k: p.k, x: a.pos[0], y: a.pos[1], name: p.name || '', note: p.note || '' } });
    }
    selectInfo({ t: 'pt', id: a.id });
  } else if (a.k === 'tnew' && Math.hypot(e.clientX - a.sx, e.clientY - a.sy) <= 4) {
    tradeClick(a.at[0], a.at[1]);
  } else if (a.k === 'wnew' && Math.hypot(e.clientX - a.sx, e.clientY - a.sy) <= 4) {
    climClick(a.at[0], a.at[1]);
  } else if (a.k === 'tbend') {
    if (a.moved) changeLink(a.id, { via: a.via.map(p => [r1(p[0]), r1(p[1])]) });
    else if (a.hi < 0) tradeClick(a.px[0], a.px[1]);   // a click on the line, not on a waypoint
  } else if (a.k === 'inew' && Math.hypot(e.clientX - a.sx, e.clientY - a.sy) <= 4) {
    if (iptool === 'point') placePoint(a.at[0], a.at[1]);
    else { const h = hexAt(a.at[0], a.at[1]); selectInfo(h >= 0 ? { t: 'hex', h } : null); }
  } else if (a.k === 'sdrag') {
    if (a.target >= 0) moveStanther(a.target);
  } else if (a.k === 'cnew' && Math.hypot(e.clientX - a.sx, e.clientY - a.sy) <= 4) {
    if (sel) selectCity(null);                    // a click beside the selected city lets it go; the next click places a new one
    else {
      const c = { id: uid('c'), name: 'เมืองใหม่', kind: ckind, note: '', x: r1(a.at[0]), y: r1(a.at[1]) };
      doOp({ k: 'c+', c }); selectCity(c.id); const nm = $('cfName'); nm.focus(); nm.select();   // no road of its own until the user asks
    }
  }
  requestDraw();
}
function abortAct() {
  if (!act) return;
  const a = act;
  if (a.k === 'paint' || a.k === 'erase') endStroke(true);
  if (a.k === 'rdraw' && riv && a.free) riv = null;
  act = null; cv.classList.remove('pan'); cv.classList.remove('drag'); requestDraw();
}
cv.addEventListener('pointerup', e => endPointer(e, false));
cv.addEventListener('pointercancel', e => endPointer(e, true));
cv.addEventListener('pointerenter', () => { overMap = true; });
cv.addEventListener('pointerleave', () => { overMap = false; if (!act) { hot = -1; cursor = null; hoverCity = null; hideTip(true); requestDraw(); } });
cv.addEventListener('dblclick', e => {
  if (mode !== 'trade' || !tlsel || !ECON || !editable) return;
  const [mx, my] = toMap(e.clientX, e.clientY), L = ECON.links.find(x => x.id === tlsel), hi = L ? viaAt(L.via || [], mx, my) : -1;
  if (hi >= 0) { e.preventDefault(); changeLink(L.id, { via: L.via.filter((p, i) => i !== hi) }); }
});
cv.addEventListener('dblclick', e => {
  if (mode !== 'route' || !rsel) return;
  const [mx, my] = toMap(e.clientX, e.clientY), r = visibleRoutes().find(v => v.id === rsel), hi = r ? handleAt(r, mx, my) : -1;
  if (hi >= 0) { e.preventDefault(); changeRoute(r.id, { via: r.via.filter((p, i) => i !== hi) }); }
});
cv.addEventListener('dblclick', e => { if (mode === 'river' && rtool === 'draw' && riv) { e.preventDefault(); if (riv.pts.length >= 3) { const a = riv.pts[riv.pts.length - 1], b = riv.pts[riv.pts.length - 2]; if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 10 / view.s) riv.pts.pop(); } finishRiver(); } });
__on(window, 'keydown', e => {
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
  const mod = e.ctrlKey || e.metaKey;
  // v0.18.5: Ctrl+Z / Ctrl+Y by the key's place, so a Thai keyboard (where that key types ผ / ๆ) undoes too; a list, a tick box or a
  // slider still holding the focus after a change no longer swallows it, only a box being typed in keeps its own undo; and in the
  // economy, or the climate with a tool on, it steps that mode's own history, once
  const uk = e.code === 'KeyZ' ? 'z' : e.code === 'KeyY' ? 'y' : String(e.key || '').toLowerCase();
  const textBox = e.target.tagName === 'TEXTAREA' || e.target.isContentEditable || (e.target.tagName === 'INPUT' && /^(text|number|search|email|url|password|tel|)$/.test(e.target.type || ''));
  if (mod && !e.altKey && !textBox && editable && (uk === 'z' || uk === 'y')) {
    e.preventDefault(); if (typing) e.target.blur();
    const back = uk === 'z' && !e.shiftKey, side = mode === 'econ' ? 'eco' : mode === 'climate' && clTool ? 'clim' : null;
    if (side) { if (!sideStep(side, back)) flash(back ? 'ไม่มีอะไรให้ย้อนในหน้านี้แล้ว' : 'ไม่มีอะไรให้ทำซ้ำ'); }
    else if (back) { if (!undoS.length && !(riv && riv.pts.length)) flash('ไม่มีอะไรให้ย้อนแล้ว'); undo(); } else { if (!redoS.length) flash('ไม่มีอะไรให้ทำซ้ำ'); redo(); }
    return;
  }
  if (typing) { if (e.key === 'Escape' || (e.key === 'Enter' && e.target.tagName === 'INPUT')) e.target.blur(); return; }
  if (PANKEY[e.code] && !mod && !e.altKey) { e.preventDefault(); panKeys.add(PANKEY[e.code]); panFast = e.shiftKey; panKick(); return; }
  if (e.key === ' ' && overMap && mode !== 'view') { spaceDown = true; e.preventDefault(); if (document.activeElement && document.activeElement.tagName === 'BUTTON') document.activeElement.blur(); return; }
  if (mode === 'river' && riv) {
    if (e.key === 'Enter') { e.preventDefault(); finishRiver(); }
    else if (e.key === 'Escape') cancelRiver();
    else if (e.key === 'Backspace') { e.preventDefault(); riv.pts.pop(); if (!riv.pts.length) riv = null; updateHistory(); requestDraw(); }
  } else if (mode === 'city') {
    if (e.key === 'Escape') selectCity(null);
    else if ((e.key === 'Delete' || e.key === 'Backspace') && sel) { e.preventDefault(); deleteCity(); }
  } else if (mode === 'label') {
    if (e.key === 'Escape') selectLabel(null);
    else if ((e.key === 'Delete' || e.key === 'Backspace') && lsel) { e.preventDefault(); deleteLabel(); }
  } else if (mode === 'route') {
    if (e.key === 'Escape') { if (rpend != null) { rpend = null; rprev = null; requestDraw(); } else selectRoute(null); }
    else if ((e.key === 'Delete' || e.key === 'Backspace') && rsel) { e.preventDefault(); deleteRoute(rsel); }
  } else if (mode === 'trade') {
    if (e.key === 'Escape') { if (tpend) { tpend = null; tprev = null; requestDraw(); } else if (tlsel) selectLink(null); else selectTrade(null); }
    else if ((e.key === 'Delete' || e.key === 'Backspace') && tlsel && editable) { e.preventDefault(); deleteLink(tlsel); }
  } else if (mode === 'climate') {
    if (e.key === 'Escape') { clsel = null; clhex = -1; renderClimCard(); requestDraw(); }
  } else if (mode === 'info') {
    if (e.key === 'Escape') selectInfo(null);
    else if ((e.key === 'Delete' || e.key === 'Backspace') && isel && isel.t === 'pt') { e.preventDefault(); deletePoint(isel.id); }
  }
});
__on(window, 'keyup', e => { if (e.key === ' ') spaceDown = false; if (PANKEY[e.code]) panKeys.delete(PANKEY[e.code]); });
__on(window, 'blur', () => panKeys.clear());

