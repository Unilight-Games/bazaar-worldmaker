// Bazaar Worldmaker: Nemessiah's lessons. A visual novel laid over a practice map: she speaks, points at the page, and asks for a try.
(function () {
  const MME = window.MME, T = MME.TUTOR, $ = id => document.getElementById(id);
  const esc = t => String(t).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
  const LS = { get(k) { try { return localStorage.getItem(k); } catch (err) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (err) { /* this visit only */ } } };
  const POSES = ['smile', 'explain', 'think', 'ask', 'smirk', 'guilty', 'shush', 'surprise', 'panic', 'mad'];
  const CH = T.chapters;
  let prog = { done: {}, at: [0, 0] };
  try { const p = JSON.parse(LS.get('mme-tutor') || 'null'); if (p && typeof p === 'object') { prog.done = p.done && typeof p.done === 'object' ? p.done : {}; if (Array.isArray(p.at) && CH[p.at[0]] && CH[p.at[0]].steps[p.at[1]]) prog.at = [p.at[0] | 0, p.at[1] | 0]; } } catch (err) { /* start over */ }
  const save = () => LS.set('mme-tutor', JSON.stringify(prog));
  const doneCount = () => CH.filter(c => prog.done[c.id]).length;

  // ---------- the practice map: a small continent with a few towns, made afresh for each visit to the lessons ----------
  let docs = null;
  const PRACTICE = { id: 'practice', title: 'แผนที่ฝึกของเนเมสไซอาร์', base: 'blank', kmPerHex: 30 };
  const TOWNS = [['capital', 'อรุณธานี'], ['city', 'ท่าศิลา'], ['city', 'เวียงลม'], ['town', 'บ้านปากน้ำ'], ['town', 'ด่านเหมันต์'], ['fort', 'ป้อมผา'], ['village', 'บ้านไร่ริมทาง']];
  function practiceDocs() {
    const S = MME.SIZES.s, G = MME.gridFor(S.cols, S.rows), L = MME.lattice(G);
    const g = MME.generate(G, { seed: 31415, style: 'continent', land: 0.42, relief: 0.4, climate: 'mixed', wind: 'W', rivers: 1 });
    const sea = i => g.cells[i] === '.' || g.cells[i] === 'S' || g.cells[i] === 'L', ok = i => 'gsvchfo'.includes(g.cells[i]);
    const cand = [], coast = new Uint8Array(L.N); let sx = 0, sy = 0, n = 0;
    for (let i = 0; i < L.N; i++) {
      if (sea(i)) continue; sx += L.CX[i]; sy += L.CY[i]; n++;
      if (!ok(i)) continue; const c = i % L.cols, r = (i / L.cols) | 0; if (c < 3 || r < 3 || c > L.cols - 4 || r > L.rows - 4) continue;
      for (let k = 0; k < 6; k++) { const v = L.NB[i * 6 + k]; if (v >= 0 && sea(v)) coast[i] = 1; }
      cand.push(i);
    }
    const picks = [], d2 = (a, b) => (L.CX[a] - L.CX[b]) ** 2 + (L.CY[a] - L.CY[b]) ** 2;
    if (cand.length) {
      const cx = sx / n, cy = sy / n; let first = cand[0], bd = Infinity;
      for (const i of cand) { const d = (L.CX[i] - cx) ** 2 + (L.CY[i] - cy) ** 2; if (d < bd) { bd = d; first = i; } }
      picks.push(first);
      while (picks.length < TOWNS.length) { let best = -1, bs = -1; for (const i of cand) { let m = Infinity; for (const p of picks) m = Math.min(m, d2(i, p)); const s = Math.sqrt(m) * (coast[i] ? 1.2 : 1); if (s > bs) { bs = s; best = i; } } if (best < 0 || bs < 40) break; picks.push(best); }
    }
    const round = v => Math.round(v * 10) / 10;
    return {
      meta: { ...PRACTICE, cols: S.cols, rows: S.rows, created: Date.now(), updated: Date.now(), thumb: '' },
      docs: {
        terrain: { v: 2, cols: S.cols, rows: S.rows, cells: g.cells, rivOff: [], rivSig: '0:0' },
        rivers: { v: 1, rivers: g.rivers.map((r, i) => ({ id: 'g' + i.toString(36) + 'prac', kind: r.kind, pts: r.pts })) },
        cities: { v: 1, hidden: [], cities: picks.map((h, k) => ({ id: 'ptown' + k, kind: TOWNS[k][0], name: TOWNS[k][1], note: '', x: round(L.CX[h]), y: round(L.CY[h]) })) }
      }
    };
  }
  // three example states around the towns, west to east: a feudal realm, a capitalist market state between, a socialist state
  async function seedStates() {
    const c = MME.shell.cur; if (!c || !c.practice) return false;
    await c.rt.flush();
    const body = JSON.parse(JSON.stringify(c.db.known('economy') || { v: 1 }));
    if (Array.isArray(body.states) && body.states.length) return false;
    const ter = c.db.known('terrain'), cit = (c.db.known('cities') || {}).cities || []; if (!ter || cit.length < 3) return false;
    const G = MME.gridFor(c.meta.cols, c.meta.rows), L = MME.lattice(G), N = L.N;
    const hexOf = p => { let b = 0, bd = Infinity; for (let i = 0; i < N; i++) { const d = (L.CX[i] - p.x) ** 2 + (L.CY[i] - p.y) ** 2; if (d < bd) { bd = d; b = i; } } return b; };
    const sorted = cit.slice().sort((a, b) => a.x - b.x), third = Math.ceil(sorted.length / 3), own = new Array(N).fill('.'), dist = new Int16Array(N).fill(99), q = [];
    sorted.forEach((p, k) => { const h = hexOf(p), key = 'ABC'[Math.min(2, Math.floor(k / third))]; own[h] = key; dist[h] = 0; q.push(h); });
    for (let at = 0; at < q.length; at++) {
      const u = q[at]; if (dist[u] >= 7) continue;
      for (let k = 0; k < 6; k++) { const v = L.NB[u * 6 + k]; if (v < 0 || dist[v] <= dist[u] + 1) continue; const wet = ter.cells[v] === '.' || ter.cells[v] === 'S'; if (wet && dist[u] >= 3) continue; dist[v] = dist[u] + 1; own[v] = own[u]; q.push(v); }
    }
    body.v = 1;
    body.states = [
      { id: 'A', name: 'แคว้นตะวันตก', color: '#d9534f', sys: 'feud', cur: 'เบี้ย', rate: 2, rel: { C: 'rival' } },
      { id: 'B', name: 'สหนครกลางทวีป', color: '#4f8fd9', sys: 'cap', cur: 'มาร์ก', rate: 0.5, rel: {} },
      { id: 'C', name: 'สาธารณรัฐตะวันออก', color: '#58b368', sys: 'soc', cur: 'คูปอง', rate: 4, rel: { A: 'rival' } }
    ];
    body.cells = own.join('');
    c.db.remoteDoc('economy', body);
    return true;
  }

  // ---------- the stage ----------
  const root = document.createElement('div'); root.id = 'tutor'; root.hidden = true;
  root.innerHTML = `<div class="tu-fig" aria-hidden="true"><img id="tuImg" alt="" width="950" height="1100"></div>
    <div class="tu-box" role="region" aria-label="บทเรียนกับ${esc(T.name)}">
      <div class="tu-head"><span class="tu-name">${esc(T.name)}<small>${esc(T.title)}</small></span><span class="tu-chap" id="tuChap"></span><span class="tu-gap"></span>
        <button type="button" class="btn" id="tuToc">สารบัญ</button><button type="button" class="btn" id="tuMin">ย่อ</button><button type="button" class="btn" id="tuQuit">ออกจากบทเรียน</button></div>
      <p class="tu-text" id="tuText" aria-live="polite"></p>
      <div class="tu-task" id="tuTask" hidden></div>
      <div class="tu-foot"><button type="button" class="btn" id="tuAct" hidden></button><span class="tu-gap"></span><span class="tu-count" id="tuCount"></span><button type="button" class="btn" id="tuPrev">← ย้อน</button><button type="button" class="btn brass" id="tuNext">ต่อไป →</button></div>
      <div class="tu-toc" id="tuTocBox" hidden></div>
    </div>`;
  const chip = document.createElement('button'); chip.type = 'button'; chip.id = 'tuChip'; chip.className = 'btn brass'; chip.hidden = true; chip.textContent = 'ฟังเนเมสไซอาร์ต่อ';
  document.body.appendChild(root); document.body.appendChild(chip);
  const art = p => (window.MME_ASSETS && window.MME_ASSETS[p]) || 'assets/nem/' + p + '.webp';   // the one-file build carries her pictures inside it
  for (const p of POSES) { const im = new Image(); im.src = art(p); }
  const reduce = (() => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (err) { return false; } })();
  const graphemes = t => { try { return [...new Intl.Segmenter('th', { granularity: 'grapheme' }).segment(t)].map(s => s.segment); } catch (err) { return Array.from(t); } };

  let on = false, ci = 0, si = 0, s0 = null, taskDone = false, typeT = 0, pollT = 0, full = '', spots = [];
  const rt = () => MME.shell.cur && MME.shell.cur.practice ? MME.shell.cur.rt : null;
  const state = () => { const r = rt(); try { return r ? r.state() : null; } catch (err) { return null; } };
  const TESTS = {
    view: (a, b) => a.view.join() !== b.view.join(),
    undo: (a, b) => a.undo > b.undo || a.land !== b.land,
    rivers: (a, b) => a.rivers !== b.rivers,
    cities: (a, b) => a.cities > b.cities,
    clim: (a, b) => a.clim[0] + a.clim[1] + a.clim[2] !== b.clim[0] + b.clim[1] + b.clim[2] || a.clim[3] !== b.clim[3],
    eco: (a, b) => a.clim[5] > b.clim[5] || a.goods !== b.goods,
    states: a => a.states > 0 && a.cellsSet > 0
  };
  function pose(p) { p = POSES.includes(p) ? p : 'smile'; $('tuImg').src = art(p); $('tuImg').parentNode.dataset.pose = p; }
  function say(text, more) {
    clearInterval(typeT); const el = $('tuText'); full = text;
    // the box takes the height of the whole line before the first letter is typed, so it never grows over the map while she speaks
    el.style.minHeight = ''; el.textContent = text; const tall = el.offsetHeight; if (tall) el.style.minHeight = tall + 'px';
    if (reduce || more) return;
    const g = graphemes(text); let k = 0; el.textContent = '';
    typeT = setInterval(() => { k += 2; el.textContent = g.slice(0, k).join(''); if (k >= g.length) clearInterval(typeT); }, 22);
  }
  const typing = () => $('tuText').textContent.length < full.length;
  function clearSpots() { for (const el of spots) el.classList.remove('tu-spot'); spots = []; }
  function spot(sel) {
    clearSpots(); if (!sel) return;
    if ($('mapscreen').classList.contains('fit')) { let hid = []; try { hid = [...document.querySelectorAll(sel)]; } catch (err) { hid = []; } if (hid.some(e => e.closest('aside')) && $('mapscreen').classList.contains('noside')) MME.shell.panels({ side: true }); if (hid.some(e => e.closest('.opts')) && $('mapscreen').classList.contains('noopts')) MME.shell.panels({ opts: true }); }
    let els = []; try { els = [...document.querySelectorAll(sel)].filter(el => el.offsetParent !== null || el.id === 'scalebar'); } catch (err) { els = []; }
    for (const el of els) { el.classList.add('tu-spot'); spots.push(el); }
    const el = els.find(e => !root.contains(e)); if (!el) return;
    if ($('mapscreen').classList.contains('fit')) {   // the fitted screen does not scroll: a panel that is put away comes back, and scrolls inside itself
      const inSide = els.find(e => e.closest('aside')), inOpts = els.find(e => e.closest('.opts'));
      if (inSide && $('mapscreen').classList.contains('noside')) MME.shell.panels({ side: true });
      if (inOpts && $('mapscreen').classList.contains('noopts')) MME.shell.panels({ opts: true });
      if (inSide) setTimeout(() => { try { inSide.scrollIntoView({ block: /^H[2-4]$/.test(inSide.tagName) || inSide.getBoundingClientRect().height > 200 ? 'start' : 'center', behavior: reduce ? 'auto' : 'smooth' }); } catch (err) { /* stays where it is */ } }, 80);
      if (inOpts) setTimeout(() => { const o = inOpts.closest('.opts'), r = (inOpts.closest('.optrow') || inOpts).getBoundingClientRect(), q = o.getBoundingClientRect(); const bar = o.querySelector('.ohead'), hb = bar ? bar.offsetHeight + 4 : 0; if (r.top < q.top + 4 + hb || r.bottom > q.bottom - 4) o.scrollTop += r.top - q.top - 10 - hb; }, 120);   // the options have a scroll of their own when the lesson leaves them little height
      return;
    }
    const r = el.getBoundingClientRect(), room = window.innerHeight - (root.querySelector('.tu-box').getBoundingClientRect().height + 30);
    if (r.top < 8 || r.bottom > room) window.scrollTo({ top: Math.max(0, window.scrollY + r.top - Math.max(20, (room - r.height) / 2)), behavior: reduce ? 'auto' : 'smooth' });
  }
  function setMode(m, tab) {
    const s = state(); if (!s) return;
    if (m && s.mode !== m) { const b = document.querySelector(`#modes button[data-mode="${m}"]`); if (b) b.click(); }
    if (tab) { const b = document.querySelector(`#ecoTab button[data-t="${tab}"]`); if (b && b.getAttribute('aria-pressed') !== 'true') b.click(); }
  }
  function show() {
    const ch = CH[ci], st = ch.steps[si]; if (!st) return;
    prog.at = [ci, si]; save();
    $('tuChap').textContent = `บทที่ ${ci + 1} ${ch.title}`; $('tuCount').textContent = `${si + 1} / ${ch.steps.length}`;
    $('tuPrev').disabled = ci === 0 && si === 0;
    const last = si === ch.steps.length - 1; $('tuNext').textContent = !last ? 'ต่อไป →' : ci === CH.length - 1 ? 'จบบทเรียน' : 'บทถัดไป →';
    setMode(st.mode || ch.mode, st.tab || (st.mode ? '' : ch.tab));
    const bk = !!(MME.backup && !MME.backup.off && MME.backup.on);   // where the page keeps a second copy of the library, the lines about keeping maps say so
    pose(bk && st.poseBk ? st.poseBk : st.pose); say(bk && st.textBk ? st.textBk : st.text);
    taskDone = false; s0 = state();
    const tk = $('tuTask'); tk.hidden = !st.task; tk.className = 'tu-task'; if (st.task) tk.textContent = T.taskLabel[st.task] || '';
    const act = $('tuAct'); act.hidden = !st.act; if (st.act === 'states') { act.textContent = 'วางรัฐตัวอย่างสามรัฐ'; act.disabled = !!(s0 && s0.states > 0); }
    $('tuTocBox').hidden = true;
    refit();                                        // her box is as tall as this line needs: the options beside her get what is left
    setTimeout(() => spot(st.spot), 60);
  }
  function poll() {
    if (!on || root.hidden) return; const st = CH[ci].steps[si], now = state(); if (!now) return;
    if (st.act === 'states') $('tuAct').disabled = now.states > 0;
    if (!st.task || taskDone || !s0 || typing()) return;
    let ok = false; try { ok = TESTS[st.task](now, s0); } catch (err) { ok = false; }
    if (!ok) return;
    taskDone = true; const tk = $('tuTask'); tk.textContent = '✓ ' + (T.taskLabel[st.task] || '').replace(/^ลองทำ: /, 'ทำแล้ว: '); tk.className = 'tu-task ok';
    pose('smile'); say(T.praise[st.task] || 'ดีมาก', false);
  }
  function next() {
    if (typing()) { clearInterval(typeT); $('tuText').textContent = full; return; }
    const ch = CH[ci];
    if (si < ch.steps.length - 1) { si++; show(); return; }
    prog.done[ch.id] = true; save();
    if (ci < CH.length - 1) { ci++; si = 0; show(); return; }
    prog.at = [0, 0]; save(); quit('จบบทเรียนแล้ว เนเมสไซอาร์รออยู่ที่หน้าเมนูเสมอ');
  }
  function prev() { if (si > 0) si--; else if (ci > 0) { ci--; si = CH[ci].steps.length - 1; } else return; show(); }
  function toc() {
    const box = $('tuTocBox'); if (!box.hidden) { box.hidden = true; return; }
    box.innerHTML = CH.map((c, k) => `<button type="button" class="${k === ci ? 'on' : ''}" data-k="${k}"><b>${k + 1}</b>${esc(c.nav)}${prog.done[c.id] ? '<i>✓</i>' : ''}</button>`).join('');
    box.hidden = false;
  }
  $('tuTocBox').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (!b) return; ci = +b.dataset.k; si = 0; show(); });
  $('tuToc').onclick = toc; $('tuNext').onclick = next; $('tuPrev').onclick = prev;
  $('tuText').onclick = () => { if (typing()) next(); };
  const refit = () => { try { if (MME.shell.refit) MME.shell.refit(); } catch (err) { /* the map is closing */ } };   // the map screen makes room for her, and takes it back
  $('tuMin').onclick = () => { root.hidden = true; chip.hidden = false; clearSpots(); document.body.classList.remove('tutoring'); refit(); };
  chip.onclick = () => { root.hidden = false; chip.hidden = true; document.body.classList.add('tutoring'); refit(); spot(CH[ci].steps[si].spot); };
  $('tuQuit').onclick = () => quit('');
  $('tuAct').onclick = async () => { const st = CH[ci].steps[si]; if (st.act === 'states') { $('tuAct').disabled = true; const ok = await seedStates(); if (!ok) { pose('guilty'); say('แผนที่นี้มีรัฐอยู่แล้ว เราไม่วางทับงานของเจ้า', false); } } };
  document.addEventListener('keydown', e => {
    if (!on || root.hidden || e.key !== 'Enter' || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target; if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
    if (t && t.tagName === 'BUTTON' && (t.id === 'tuNext' || (!root.contains(t) && t.offsetParent !== null))) return;   // a button in view keeps its own Enter
    e.preventDefault(); next();
  });

  async function start(chapter) {
    if (on) return; if (MME.shell.cur) { return; }
    if (chapter == null) { ci = prog.at[0]; si = prog.at[1]; } else { ci = Math.max(0, Math.min(CH.length - 1, chapter | 0)); si = 0; }
    on = true; docs = practiceDocs();
    const ok = await MME.shell.openPractice(docs.meta, docs.docs);
    if (!ok) { on = false; docs = null; return; }
    for (let k = 0; k < 80 && on; k++) { const s = state(); if (s && s.editable) break; await new Promise(res => setTimeout(res, 100)); }
    if (!on) return;
    root.hidden = false; chip.hidden = true; document.body.classList.add('tutoring'); refit(); show();
    clearInterval(pollT); pollT = setInterval(poll, 500);
  }
  function hide() { on = false; clearInterval(pollT); clearInterval(typeT); clearSpots(); root.hidden = true; chip.hidden = true; document.body.classList.remove('tutoring'); refit(); docs = null; renderCard(); }
  async function quit(why) { if (!on) return; hide(); if (MME.shell.cur && MME.shell.cur.practice) await MME.shell.closeMap(why || ''); }

  // ---------- her card on the menu ----------
  function renderCard() {
    const box = $('tutorCard'); if (!box) return;
    const n = doneCount(), mid = prog.at[0] > 0 || prog.at[1] > 0;
    box.innerHTML = `<h2>บทเรียนกับ${esc(T.name)}</h2><p>${esc(T.card)}</p>
      <div class="tu-go"><button type="button" class="btn brass" id="tuStart">${mid ? 'เรียนต่อ บทที่ ' + (prog.at[0] + 1) : n >= CH.length ? 'ทบทวนตั้งแต่ต้น' : 'เริ่มบทเรียน'}</button><span class="tu-prog">${n ? 'จบแล้ว ' + n + ' จาก ' + CH.length + ' บท' : CH.length + ' บท ราวยี่สิบนาที'}</span></div>
      <div class="tu-chips">${CH.map((c, k) => `<button type="button" data-k="${k}" class="${prog.done[c.id] ? 'done' : ''}" title="บทที่ ${k + 1} ${esc(c.title)}">${k + 1}. ${esc(c.nav)}</button>`).join('')}</div>`;
    $('tuStart').onclick = () => start(n >= CH.length && !mid ? 0 : null);
    for (const b of box.querySelectorAll('.tu-chips [data-k]')) b.onclick = () => start(+b.dataset.k);
  }
  MME.tutor = { start, quit, closed: hide, get on() { return on; }, seedStates };
  renderCard();
})();
