// The older tests were written on the scrolling page and find the map by the box of its canvas. With FIT=1 they run on the fitted
// screen instead: the address loses ?fit=0, the window is wide enough for the tool options to dock beside the map, and the box
// asked of #map is where the map itself is drawn, read from the engine.
const pw = require('playwright'), FIT = !!process.env.FIT;
function patchPage(page) {
  if (!FIT) return page;
  const goto = page.goto.bind(page); page.goto = (url, o) => goto(String(url).replace(/[?&]fit=0\b/, ''), o);
  const locator = page.locator.bind(page);
  page.locator = (sel, o) => {
    const loc = locator(sel, o); if (sel !== '#map') return loc;
    const bb = loc.boundingBox.bind(loc);
    loc.boundingBox = async () => { const r = await page.evaluate(() => { const c = window.MME && MME.shell && MME.shell.cur; if (!c || !c.rt) return null; const a = c.rt.test.pt(0, 0), b = c.rt.test.pt(1, 1); return { x: a[0], y: a[1], width: b[0] - a[0], height: b[1] - a[1] }; }); return r || bb(); };
    return loc;
  };
  return page;
}
const chromium = { launch: async o => { const b = await pw.chromium.launch(o), nc = b.newContext.bind(b); b.newContext = async c => { const ctx = await nc(FIT ? { ...(c || {}), viewport: { width: 1900, height: 940 } } : c), np = ctx.newPage.bind(ctx); ctx.newPage = async () => patchPage(await np()); return ctx; }; return b; } };
module.exports = { chromium, FIT };
