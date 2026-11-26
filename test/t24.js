// every line of the lessons against the screen it is spoken over: the words shown are the words written, what she points at can be
// seen and is not under her box, every button she names can be seen at that moment, and a picture is kept of each line
const { chromium } = require('playwright'), fs = require('fs');
const W = +(process.env.W || 1536), H = +(process.env.H || 602), TAG = process.env.TAG || 'a', BK = !!process.env.BK;
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H } }); const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  if (process.env.UI) await page.addInitScript(u => localStorage.setItem('mme-ui', u), process.env.UI);   // a fixed letter size (s, m, l); the default is the automatic one
  if (BK) await page.addInitScript(() => { const S = new Map(), snap = (i, b) => ({ id: i, exists: b != null, data: () => b, metadata: {} }); const doc = p => ({ id: p.split('/').pop(), path: p, get: async () => snap(p, S.get(p)), set: async b => { S.set(p, b); }, delete: async () => { S.delete(p); }, onSnapshot: () => () => {} }); const q = p => ({ where: () => q(p), doc: i => doc(p + '/' + i), get: async () => ({ docs: [], size: 0, empty: true }) }); window.claude = { use: n => Promise.resolve(n === 'db' ? { doc, collection: q } : n === 'user' ? { id: async () => 'u1', isOwner: async () => true } : null) }; });
  await page.goto('http://localhost:8765/index.html'); await page.waitForSelector('.mapcard');
  await page.click('#tuStart'); await page.waitForSelector('#tutor:not([hidden])', { timeout: 30000 }); await page.waitForTimeout(2000);
  fs.mkdirSync('shots/lesson-' + TAG, { recursive: true });
  const total = await page.evaluate(() => MME.TUTOR.chapters.reduce((a, c) => a + c.steps.length, 0)), rows = [];
  for (let n = 0; n < total; n++) {
    await page.click('#tuText'); await page.waitForTimeout(900);
    const r = await page.evaluate(() => {
      const p = JSON.parse(localStorage.getItem('mme-tutor')), c = MME.TUTOR.chapters[p.at[0]], x = c.steps[p.at[1]], bk = !!(MME.backup && !MME.backup.off && MME.backup.on);
      const want = bk && x.textBk ? x.textBk : x.text, pose = bk && x.poseBk ? x.poseBk : x.pose;
      const box = document.querySelector('#tutor .tu-box').getBoundingClientRect(), fig = document.querySelector('#tutor .tu-fig').getBoundingClientRect();
      const seen = el => { if (!el || el.offsetParent === null && el.id !== 'scalebar') return 'hidden'; const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return 'hidden'; if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return 'off-screen'; const cx = Math.min(innerWidth - 2, Math.max(2, r.left + r.width / 2)), cy = Math.min(innerHeight - 2, Math.max(2, r.top + Math.min(r.height / 2, 14))); if (getComputedStyle(el).pointerEvents === 'none') return 'seen'; const top = document.elementFromPoint(cx, cy); if (top && (top === el || el.contains(top) || top.contains(el))) return 'seen'; if (top && top.closest('#tutor')) return top.closest('.tu-fig') ? 'under her figure' : 'under her box'; return 'covered by ' + (top ? (top.id || top.className || top.tagName) : '?'); };
      // where she stands, by the part of each picture that is not empty (measured from the ten pictures, mirrored as the page shows them)
      const HER = { ask: [0.222, 0.899], explain: [0.167, 0.715], guilty: [0.233, 0.705], mad: [0, 1], panic: [0.264, 0.706], shush: [0.263, 0.704], smile: [0.257, 0.682], smirk: [0.22, 0.74], surprise: [0.193, 0.723], think: [0.167, 0.715] }[pose] || [0.2, 0.75];
      const her = { l: fig.left + HER[0] * fig.width, r: fig.left + HER[1] * fig.width, t: fig.top + 0.11 * fig.height, b: fig.bottom };
      const under = el => { const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2 || innerWidth <= 760) return 0; const w = Math.max(0, Math.min(r.right, her.r) - Math.max(r.left, her.l)), h = Math.max(0, Math.min(r.bottom, her.b, box.top) - Math.max(r.top, her.t)); return w * h / (r.width * Math.min(r.height, 400)); };
      const spots = (x.spot ? [...document.querySelectorAll(x.spot)] : []).map(el => { const st = seen(el), u = under(el); return (el.id || el.className || el.tagName) + ': ' + (st === 'seen' && u > 0.25 ? 'behind her (' + Math.round(u * 100) + '%)' : st); });
      const far = (x.far || []).filter(nm => ![...document.querySelectorAll('button, summary, h2, h3, h4, option, label, span.lbl')].some(e => e.textContent.trim().startsWith(nm))).map(nm => nm + ': nowhere on the page');
      const lit = [...document.querySelectorAll('.tu-spot')].length;
      const names = (x.names || []).map(nm => { const els = [...document.querySelectorAll('button, summary, h2, h3, h4, option, label, span.lbl')].filter(e => { const t = e.textContent.trim(); return t === nm || t.startsWith(nm); }); if (!els.length) return nm + ': not on the page'; const st = els.map(e => { const q = e.tagName === 'OPTION' ? e.parentNode : e, v = seen(q); return v === 'seen' && under(q) > 0.5 ? 'behind her' : v; }); return nm + ': ' + (st.includes('seen') ? 'seen' : st[0]); }).concat(far);
      const im = document.getElementById('tuImg'), st = MME.shell.cur.rt.state(), tab = document.querySelector('#ecoTab button[aria-pressed="true"]');
      return { id: x.id, shown: document.getElementById('tuText').textContent, want, same: document.getElementById('tuText').textContent === want, pose, img: (im.getAttribute('src') || '').split('/').pop(), mode: st.mode, wantMode: x.mode || c.mode, tab: tab ? tab.dataset.t : '', wantTab: x.tab || '', spot: x.spot || '', spots, lit, names, box: [Math.round(box.left), Math.round(box.top), Math.round(box.right), Math.round(box.bottom)], fig: [Math.round(fig.left), Math.round(fig.top), Math.round(fig.right), Math.round(fig.bottom)], scale: (() => { const s = document.getElementById('scalebar'); if (!s) return null; const r = s.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top)]; })(), fit: document.getElementById('mapscreen').className };
    });
    await page.screenshot({ path: `shots/lesson-${TAG}/${String(n + 1).padStart(2, '0')}-${r.id}.png` });
    rows.push(r);
    if (await page.evaluate(() => { const p = JSON.parse(localStorage.getItem('mme-tutor')), b = document.getElementById('tuAct'); return !!MME.TUTOR.chapters[p.at[0]].steps[p.at[1]].act && !b.disabled; })) { await page.click('#tuAct'); await page.waitForTimeout(2200); }
    await page.click('#tuNext'); await page.waitForTimeout(250);
  }
  fs.writeFileSync(`shots/lesson-${TAG}/audit.json`, JSON.stringify(rows, null, 1));
  let bad = 0;
  for (const r of rows) {
    const f = [];
    if (!r.same) f.push('WORDS DIFFER');
    if (r.img !== r.pose + '.webp' && !r.img.startsWith('data:')) f.push('pose picture ' + r.img + ' for ' + r.pose);
    if (r.wantMode && r.mode !== r.wantMode) f.push('mode ' + r.mode + ' not ' + r.wantMode);
    if (r.wantTab && r.tab !== r.wantTab) f.push('tab ' + r.tab + ' not ' + r.wantTab);
    for (const s of r.spots) if (!/: seen$/.test(s)) f.push('points at ' + s);
    if (r.spot && !r.spots.length) f.push('points at nothing: ' + r.spot);
    for (const s of r.names) if (!/: seen$/.test(s)) f.push('names ' + s);
    if (f.length) { bad++; console.log(r.id.padEnd(12), f.join(' | ')); }
  }
  console.log(`${W}x${H}${BK ? ' with a second copy on the page' : ''}: ${rows.length} lines, ${bad} with something to look at | layout ${rows[0].fit} | errors ${errs.length} ${errs.slice(0, 2).join(' ')}`);
  await browser.close();
})().catch(e => { console.error('TEST FAILED', e.message.slice(0, 600)); process.exit(1); });
