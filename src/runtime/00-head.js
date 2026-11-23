// Map Maker Engine: the map runtime. Built by build.py from the Gresland terrain page's script; see the patches there.
(function () {
const MME = window.MME = window.MME || {};
MME.startMap = function (BASE, ENV) {
const MAP_IMG = BASE.img || '', G = BASE.G, D = BASE.D, BLANK = !!BASE.blank;
let __dead = false; const __offs = [];
const setTimeout = (f, ms) => window.setTimeout(() => { if (!__dead) f(); }, ms);
const requestAnimationFrame = f => window.requestAnimationFrame(t => { if (!__dead) f(t); });
const __on = (t, ev, fn, o) => { t.addEventListener(ev, fn, o); __offs.push(() => t.removeEventListener(ev, fn, o)); };
const FSLUG = (String(ENV.meta && ENV.meta.title || 'map').toLowerCase().replace(/[^a-z0-9ก-๙]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)) || 'map';
const PANKEY = { ArrowUp: 'u', ArrowDown: 'd', ArrowLeft: 'l', ArrowRight: 'r', KeyW: 'u', KeyS: 'd', KeyA: 'l', KeyD: 'r' }, panKeys = new Set();
let panRaf = 0, panT = 0, panFast = false, panHint = false;
const CLO = { e: {}, p: {}, t: {}, set: {}, seasons: [], st: {}, sp: {} };   // heights, rain and warmth set by hand, hex by hex; the means; the seasons of the year and what each is like, down to the hex
const clSet = k => CLO.set[k] != null ? CLO.set[k] : k === 'g' ? 16 : BLANK ? (k === 'w' ? 0 : 22) : (k === 'w' ? -60 : 26);
const $ = id => document.getElementById(id);

