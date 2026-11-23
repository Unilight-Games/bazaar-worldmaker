// ---------- start ----------
img.onload = () => requestDraw();
img.src = MAP_IMG;
__on(window, 'resize', refit);
if (window.ResizeObserver) { const ro = new ResizeObserver(() => requestAnimationFrame(() => { if (!__dead) refit(); })); ro.observe(box); __offs.push(() => ro.disconnect()); }
FD = (getComputedStyle(document.body).getPropertyValue('--display') || FD).trim();
fit();
document.fonts && document.fonts.ready.then(() => requestDraw());
updateLegend(); updateStats(); status();
initStore(); scheduleEcon(600);
segPick('fxSeg', 'm', fxMode, setFxMode); fxKick();
window.__terrain = { counts, cities: D.cities.length, labels: D.labels.length, points: D.points.length };
window.__ed = { ED, painted, undoS, redoS, get mode() { return mode; }, get editable() { return editable; }, get layerUsed() { return layerUsed; }, rebuildAll, setMode, setBrush, setBsize, setRtool, setRkind, setCkind };
