// Bazaar Worldmaker on its own page (GitHub Pages): who is online, the public chat, and the owner's back office (v0.18.0, the
// owner's ask of 24 Nov 2026). It wakes only where fire.js reaches a database that offers what it needs (see fire.js, hub).
//
// What it keeps on the server, under bw/ (the rules are in web/database.rules.json):
//   on/<account>_<tab>     one line per open page: when it came, and whether it is signed in with Google. Anyone signed in,
//                          with a name or without, reads these to count the people online. Gone when the page goes.
//   who/<account>_<tab>    the same page for the back office: the Google name, and where on the page it is (the menu, a map, a
//                          room, a lesson). Never which map. Only an admin reads it.
//   log/<day>/<id>         a line when a page comes and when it goes. Only an admin reads it.
//   users/<account>        the account's name and when it was last here. Only an admin reads it.
//   chat/<id>              the public chat. Anyone signed in reads it; only a Google account writes, one line each three
//                          seconds at most. The page shows only what was said since the last midnight in Thailand, and the rules
//                          let any page clear what came before that midnight, so the chat empties itself each night.
//   maps/<account>/<map>   a copy of each map as its file, sent when its owner leaves it, never while they work on it, and only
//   mapix/<account>/<map>  after the page has told them so; they turn it off on the menu. Only an admin and the owner read them.
//   cloudban/<account>     true when an admin has stopped that account from leaving copies of maps (v0.18.3). The rules
//                          refuse its copies; it may still take away what it left.
//   admin/<account>        true for an admin's account, set by hand in the Firebase console. Nothing on the page writes it.
//                          The rules also name the owner's admin account by its verified Google email (ADMIN_EMAIL in the
//                          copy of the rules in this repo; the owner's own copy carries the address).
// One account leaves at most QUOTA letters of copies (v0.18.3, the owner's ask: 100 MB, first 500 MB). The page counts them from its own
// mapix/ list before it sends; past the line it sends nothing more and asks its owner to keep copies as JSON files and take
// some of the ones it left away. The rules cannot add up a list, so this line lives in the page; cloudban/ is the hard stop.
// An admin gets no key to anyone's room: a room still opens only to its code, given by the person who owns the map.
(function () {
  'use strict';
  const MME = window.MME, fire = MME && MME.fire;
  if (!fire) { if (MME) MME.hub = null; return; }
  const $ = id => document.getElementById(id);
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
  const LS = { get(k) { try { return localStorage.getItem(k); } catch (err) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (err) { /* this visit only */ } } };
  const rnd = n => { let s = ''; while (s.length < n) s += Math.random().toString(36).slice(2); return s.slice(0, n); };
  const TZ = 7 * 3600000, DAYMS = 86400000;
  const midnight = t => t - ((t + TZ) % DAYMS);                            // the last midnight in Thailand
  const dayKey = t => new Date(t + TZ).toISOString().slice(0, 10);
  const hm = t => { const d = new Date(t + TZ); return String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0'); };
  const ago = ms => { const m = Math.max(0, Math.round(ms / 60000)); return m < 1 ? "just joined" : m < 60 ? m + " min" : Math.floor(m / 60) + " hr " + (m % 60) + " min"; };
  const kb = n => !n ? '0 KB' : n >= 1048576 ? (n / 1048576).toFixed(1).replace(/\.0$/, '') + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
  const MB = 1048576, QUOTA = +window.MME_CLOUD_QUOTA || 100 * MB, FREE_DB = 1024 * MB;    // the owner's line per account; the free plan's whole database
  const num = n => Number(n || 0).toLocaleString('en-US');
  const AT = { menu: "main menu", map: "editing a map", room: "in a shared room", tutor: "Learn with Nemessiah" };
  const tab = rnd(8);
  let H = null, uid = null, me = null, offs = [], admin = false, myIx = {}, cloudBan = false, full = null, kept = new Set(), online = { n: 0, g: 0 }, chat = [], banned = false, chatErr = '', where = '', since = Date.now(), wasMap = null, midT = 0;
  const say = (t, ms) => { const el = $('mtoast'); if (!el) return; el.textContent = t; el.hidden = false; clearTimeout(say.t); say.t = setTimeout(() => { el.hidden = true; }, ms || 4000); };
  const google = () => !!fire.user, myName = () => (fire.user && fire.user.name) || '';
  const off = f => { offs.push(typeof f === 'function' ? f : () => {}); };

  // ---------- this page, online ----------
  const key = () => uid + '_' + tab;
  function whereNow() { const c = MME.shell && MME.shell.cur; return !c ? 'menu' : c.practice ? 'tutor' : c.room || c.guest ? 'room' : 'map'; }
  function putWho() { if (!H || !uid) return; H.set('bw/who/' + key(), { t: H.stamp(), s: since, at: where || 'menu', n: myName().slice(0, 60), g: google() }).catch(() => {}); }
  function arrive() {
    const day = dayKey(H.now()), base = { u: uid, g: google(), n: myName().slice(0, 60) };
    H.set('bw/log/' + day + '/' + H.key('bw/log/' + day), { ...base, k: 'in', t: H.stamp() }).catch(() => {});
    H.update({ ['bw/users/' + uid + '/t']: H.stamp(), ['bw/users/' + uid + '/n']: base.n, ['bw/users/' + uid + '/g']: base.g, ['bw/users/' + uid + '/cloud']: cloudOn() }).catch(() => {});
    off(H.connected(on => {
      if (!on || !uid) return;
      const outDay = dayKey(H.now()), out = 'bw/log/' + outDay + '/' + H.key('bw/log/' + outDay);
      Promise.all([H.gone('bw/on/' + key()), H.gone('bw/who/' + key()), H.goneSet(out, { ...base, k: 'out', t: H.stamp() })])
        .then(() => Promise.all([H.set('bw/on/' + key(), { t: H.stamp(), g: google() }), putWho()])).catch(() => {});
      leave.out = out;
    }));
  }
  async function leave() {                           // before the account changes: the rules let only the account that wrote them take these away
    if (!H || !uid) return; const u0 = uid, k = key(), out = leave.out; leave.out = null;
    for (const f of offs) { try { f(); } catch (err) { /* already off */ } } offs = [];
    try { if (out) { await H.cancel(out); await H.set(out, { u: u0, k: 'out', t: H.stamp(), g: google(), n: myName().slice(0, 60) }); } } catch (err) { /* the line has gone already */ }
    try { await Promise.all([H.cancel('bw/on/' + k), H.cancel('bw/who/' + k)]); await Promise.all([H.remove('bw/on/' + k), H.remove('bw/who/' + k)]); } catch (err) { /* the line has gone already */ }
    if (uid === u0) { uid = null; admin = false; }
  }
  // the account changes inside fire.js's sign-in and sign-out; this page says goodbye under the old one first
  for (const f of ['signIn', 'signOut']) { const g = fire[f]; fire[f] = async function () { await leave(); try { return await g.apply(fire, arguments); } finally { setTimeout(start, 50); } }; }

  function start() {
    H = fire.hub; if (!H) return render();
    const u = H.uid(); me = fire.user;
    if (u === uid) return render();
    if (uid) leave();
    uid = u; if (!uid) return render();
    since = Date.now(); where = whereNow();
    arrive();
    off(H.value('bw/on', v => { const list = Object.values(v || {}); online = { n: list.length, g: list.filter(x => x && x.g).length }; renderOnline(); }, () => {}));
    // an admin is named in the database (admin/<account>) or by a verified Google email in the rules themselves (v0.18.2, the
    // owner's choice): the page cannot read the rules, so it asks the database for a list only an admin may read
    let named = false, byRule = false; const tell = () => { admin = named || byRule; renderAdmin(); }, u0 = uid;
    off(H.value('bw/admin/' + uid, v => { named = v === true; tell(); }, () => { named = false; tell(); }));
    if (google()) H.get('bw/who').then(() => { if (uid === u0) { byRule = true; tell(); } }, () => {});
    off(H.value('bw/chatban/' + uid, v => { banned = v === true; renderChat(); }, () => {}));
    off(H.value('bw/mapix/' + uid, v => { myIx = v || {}; renderCloud(); if ($('cloudVeil') && !$('cloudVeil').hidden) renderStore(); }, () => {}));
    off(H.value('bw/cloudban/' + uid, v => { cloudBan = v === true; renderCloud(); }, () => {}));
    listenChat();
    setTimeout(sync, 2500);
    render();
  }
  // ---------- the public chat ----------
  function listenChat() {
    clearTimeout(midT); const now = H.now(), mid = midnight(now);
    let first = true;
    off(H.since('bw/chat', mid, v => {
      chatErr = ''; chat = Object.entries(v || {}).map(([k, m]) => ({ k, ...m })).filter(m => m && typeof m.t === 'number' && m.t >= mid).sort((a, b) => a.t - b.t).slice(-200);
      renderChat(first); first = false;
    }, () => { chatErr = google() ? "Can't read the chat right now" : "Sign in with Google to read and write in the chat"; chat = []; renderChat(); }));
    // what was said before the last midnight is cleared by whoever comes first after it
    H.before('bw/chat', mid - 1).then(v => { for (const k of Object.keys(v || {})) H.remove('bw/chat/' + k).catch(() => {}); }).catch(() => {});
    midT = setTimeout(() => { if (!uid) return; for (const f of offs.splice(offs.length - 1)) { try { f(); } catch (err) { /* off */ } } listenChat(); }, mid + DAYMS - now + 1500);
  }
  async function send() {
    const box = $('hubMsg'); if (!box || !H || !uid || !google()) return; const m = box.value.trim().slice(0, 300); if (!m) return;
    const k = H.key('bw/chat');
    try { await H.update({ ['bw/chat/' + k]: { u: uid, n: myName() || "No name", m, t: H.stamp() }, ['bw/chatlast/' + uid]: H.stamp() }); box.value = ''; }
    catch (err) { say(banned ? "This account is barred from the public chat" : "Not sent; you can post every three seconds. Try again"); }
  }

  // ---------- copies of maps for the owner of the page ----------
  const cloudSeen = () => LS.get('mme-cloud-seen') === '1', cloudOn = () => LS.get('mme-cloud') !== 'off';
  const sentAt = () => { try { return JSON.parse(LS.get('mme-cloud-at') || '{}') || {}; } catch (err) { return {}; } };
  const safeId = id => String(id).replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 40);
  let syncing = false;
  async function sync() {
    if (syncing || !H || !uid || !cloudSeen() || !cloudOn() || !MME.store) return; syncing = true;
    try {
      if (cloudBan) { syncing = false; return; }
      const at = sentAt(), mine = at[uid] || (at[uid] = {}), open = MME.shell && MME.shell.cur ? MME.shell.cur.meta.id : null;
      try { myIx = await H.get('bw/mapix/' + uid) || {}; } catch (err) { /* the list from the listener stands */ }
      for (const m of await MME.store.list()) {
        const openNow = MME.shell && MME.shell.cur ? MME.shell.cur.meta.id : null;   // a map opened while this ran stays at home too
        if (m.builtin || m.id === open || m.id === openNow || !((m.updated || 0) > (mine[m.id] || 0))) continue;
        const f = await MME.store.exportMap(m.id); if (!f) continue; const d = JSON.stringify(f);
        if (d.length > 8000000) continue;           // the database takes up to ten million letters a line; a map this big stays at home
        const id = safeId(m.id), after = used(id) + d.length;
        if (after > QUOTA) {                         // past the owner's line: nothing more goes, and the page says why once per edit
          const seen = LS.get('mme-cloud-full') === uid + ':' + m.id + ':' + (m.updated || 0);
          full = { id: m.id, title: String(m.title || "Map"), size: d.length, after };
          if (!seen) { LS.set('mme-cloud-full', uid + ':' + m.id + ':' + (m.updated || 0)); if (whereNow() === 'menu') openStore(); else openStore.later = true; } renderCloud();
          break;
        }
        await H.update({ ['bw/maps/' + uid + '/' + id]: { d, at: H.stamp() }, ['bw/mapix/' + uid + '/' + id]: { title: String(m.title || "Map").slice(0, 80), at: H.stamp(), size: d.length, cols: m.cols | 0, rows: m.rows | 0 } });
        mine[m.id] = m.updated || Date.now(); LS.set('mme-cloud-at', JSON.stringify(at));
        myIx[id] = { size: d.length, title: String(m.title || "Map").slice(0, 80), at: Date.now() };
        if (full && full.id === m.id) full = null;
      }
    } catch (err) { console.warn('map copy', err && (err.code || err.message)); }
    syncing = false;
  }
  function used(except) { let n = 0; for (const [k, x] of Object.entries(myIx || {})) if (k !== except) n += +(x && x.size) || 0; return n; }
  async function forget() {
    if (!H || !uid) return;
    try { await Promise.all([H.remove('bw/maps/' + uid), H.remove('bw/mapix/' + uid)]); const at = sentAt(); delete at[uid]; LS.set('mme-cloud-at', JSON.stringify(at)); myIx = {}; full = null; renderCloud(); say("This account's map copies were deleted from the developer", 6000); }
    catch (err) { say("Couldn't delete; try again"); }
  }
  // ---------- the copies an account left, in its own hands ----------
  function openStore() { const v = $('cloudVeil'); if (!v || !H || !uid) return; v.hidden = false; renderStore(); }
  function renderStore() {
    const body = $('cloudBody'); if (!body) return;
    const rows = Object.entries(myIx || {}).map(([m, x]) => ({ m, ...x })).sort((a, b) => (b.size || 0) - (a.size || 0)), u = used(), pct = Math.min(100, u / QUOTA * 100);
    let h = '';
    if (full) h += `<div class="cloudfull" role="alert"><b>Storage full</b><p>The map “${esc(full.title)}” of ${kb(full.size)} would take this account over ${kb(QUOTA)} so it wasn't stored. Save maps as JSON files on your computer first, then delete other stored maps. When there's room, press Try again</p>`
      + `<div class="rowx"><button type="button" class="btn brass" data-hub="keepfull">Save “${esc(full.title.slice(0, 30))}” as a JSON file</button><button type="button" class="btn" data-hub="retry"${u + full.size > QUOTA ? ' disabled' : ''}>Try again</button></div></div>`;
    if (cloudBan) h += `<div class="cloudfull" role="alert"><b>This account can't store maps</b><p>The developer turned off storage for this account. Maps already stored can still be saved as files or deleted</p></div>`;
    h += `<div class="quota"><div class="quotabar${pct > 90 ? ' hot' : ''}" role="meter" aria-valuemin="0" aria-valuemax="${QUOTA}" aria-valuenow="${u}" aria-label="Storage used"><i style="width:${pct.toFixed(2)}%"></i></div><span>Used <b>${kb(u)}</b> of ${kb(QUOTA)} · ${rows.length} maps</span></div>`;
    h += rows.length ? `<div class="hubt hub4 cloudt"><div class="hubh"><span>Map</span><span>Stored on</span><span>Size</span><span></span></div>`
      + rows.map(r => `<div><span>${esc(r.title || r.m)}${r.cols ? ` <small>${r.cols}×${r.rows}</small>` : ''}</span><span>${r.at ? new Date(r.at).toLocaleString(window.MME_LANG === 'en' ? 'en-GB' : 'th-TH') : ''}</span><span>${kb(r.size || 0)}</span><span><button type="button" class="lnk" data-hub="mykeep" data-m="${esc(r.m)}" data-t="${esc(r.title || r.m)}">Save as JSON file</button> <button type="button" class="lnk" data-hub="mydel" data-m="${esc(r.m)}">Remove from storage</button></span></div>`).join('') + `</div>`
      + `<div class="rowx"><button type="button" class="btn" data-hub="mykeepall">Save every stored map as one file</button></div>`
      : `<p class="hubempty">No maps stored yet</p>`;
    h += `<p class="note2">Removed from storage. The maps in this browser's library are all still here; what's gone is the developer's copy. Saved JSON files come back in with the Import a map file button</p>`;
    body.innerHTML = h;
  }
  const fname = t => String(t || 'map').replace(/[^A-Za-z0-9ก-๙]+/g, '-').slice(0, 40) + '.mapmaker.json';
  async function myKeep(m, t) { try { const x = await H.get('bw/maps/' + uid + '/' + m); if (!x || !x.d) return say("Copy not found"); file(fname(t), x.d); kept.add(m); renderStore(); } catch (err) { say("Couldn't save the file"); } }
  async function myKeepAll() { try { const all = await H.get('bw/maps/' + uid) || {}, maps = []; for (const [m, x] of Object.entries(all)) { try { maps.push(JSON.parse(x.d)); kept.add(m); } catch (err) { /* a broken copy is left out */ } } file('bazaar-worldmaker-my-copies-' + dayKey(Date.now()) + '.mapmaker.json', JSON.stringify({ format: 'map-maker-engine-library', version: 1, maps })); renderStore(); } catch (err) { say("Couldn't save the file"); } }
  async function keepFull() { if (!full) return; try { const f = await MME.store.exportMap(full.id); if (!f) return say("This map isn't in the library"); file(fname(full.title), JSON.stringify(f)); } catch (err) { say("Couldn't save the file"); } }
  async function myDel(m) {
    try { await H.update({ ['bw/maps/' + uid + '/' + m]: null, ['bw/mapix/' + uid + '/' + m]: null }); delete myIx[m]; say("Removed from storage"); renderStore(); renderCloud(); }
    catch (err) { say("Couldn't delete; try again"); }
  }

  // where this page is, every few seconds; leaving a map sends its copy
  setInterval(() => {
    if (!uid) return; const w = whereNow(), c = MME.shell && MME.shell.cur, id = c && !c.guest && !c.practice ? c.meta.id : null;
    if (w !== where) { where = w; putWho(); }
    if (w === 'menu' && openStore.later && full) { openStore.later = false; openStore(); }   // told on the menu, never over a map
    if (wasMap && wasMap !== id) setTimeout(sync, 800);
    wasMap = id;
  }, 3000);

  // ---------- on the menu ----------
  function renderOnline() { const el = $('hubOnline'); if (el) el.innerHTML = H && uid ? `Online <b>${online.n}</b> people ${online.g ? ` <small>signed in ${online.g}</small>` : ''}` : ''; }
  function renderChat(jump) {
    const list = $('hubList'), inp = $('hubMsg'), btn = $('hubSend'), why = $('hubWhy'); if (!list) return;
    const atEnd = list.scrollHeight - list.scrollTop - list.clientHeight < 40;
    list.innerHTML = chatErr ? `<p class="hubempty">${esc(chatErr)}</p>` : chat.length ? chat.map(m => `<div class="hubm${m.u === uid ? ' mine' : ''}" data-k="${esc(m.k)}"><b>${esc(m.n)}</b><time>${hm(m.t)}</time><span>${esc(m.m)}</span>${admin ? `<em><button type="button" class="lnk" data-hub="del" data-k="${esc(m.k)}">Delete</button><button type="button" class="lnk" data-hub="ban" data-u="${esc(m.u)}" data-n="${esc(m.n)}">Bar</button></em>` : ''}</div>`).join('') : `<p class="hubempty">No one has said anything since midnight</p>`;
    if (jump || atEnd) list.scrollTop = list.scrollHeight;
    const can = !!(H && uid && google() && !banned);
    if (inp) { inp.disabled = !can; inp.placeholder = banned ? "This account is barred from the public chat" : google() ? "Type a message, then press Enter" : "Sign in with Google to write"; }
    if (btn) btn.disabled = !can;
    if (why) why.textContent = "All messages are cleared every midnight, Thailand time";
  }
  function renderNote() {
    const el = $('hubNote'); if (!el) return; el.hidden = !(H && uid) || cloudSeen();
    if (el.hidden) return;
    el.innerHTML = `<h2>Back up your maps with the developer</h2><p>This page sends a copy of your maps to the developer each time you leave a map for the menu. The copy helps recover your work if the browser clears its data. The developer sees the maps that were sent, but can't enter a map you are editing unless you invite them to a room. You can turn backup off any time at the bottom of the map library</p>`
      + `<div class="rowx"><button type="button" class="btn brass" data-hub="cloudok">Got it, back them up</button><button type="button" class="btn" data-hub="cloudno">No backup</button></div>`;
  }
  function renderCloud() {
    const el = $('hubCloud'); if (!el) return; el.hidden = !(H && uid) || !cloudSeen();
    if (el.hidden) return;
    const u = used(), use = ` · stored ${kb(u)} of ${kb(QUOTA)} <button type="button" class="lnk" data-hub="store">Manage storage</button>`;
    el.innerHTML = cloudBan ? `The developer turned off map storage for this account ${use}`
      : full ? `<b class="warn">Storage full: “${esc(full.title)}” not stored</b>${use}`
      : cloudOn() ? `A copy of the map goes to the developer when you leave it ${use} <button type="button" class="lnk" data-hub="cloudoff">Stop backing up</button>`
      : `Maps are not backed up with the developer <button type="button" class="lnk" data-hub="cloudon">Start backing up</button>${u ? use + ` <button type="button" class="lnk" data-hub="forget">Delete every copy sent so far</button>` : ''}`;
  }
  function renderAcct() {                            // the account's id, which the owner writes into the console to make his own account the admin
    const el = $('acctId'); if (!el) return; el.hidden = !(H && uid && google());
    if (!el.hidden) el.innerHTML = `Account ID in the system <code>${esc(uid)}</code>`;
  }
  function renderAdmin() { const b = $('hubAdminBtn'); if (b) b.hidden = !admin; if (!admin && $('hubVeil')) $('hubVeil').hidden = true; renderChat(); }
  function render() {
    const card = $('hubCard'); if (card) card.hidden = !(H && uid);
    renderOnline(); renderChat(true); renderNote(); renderCloud(); renderAcct(); renderAdmin();
  }
  document.addEventListener('click', e => {
    const el = e.target.closest ? e.target.closest('[data-hub]') : null; if (!el) return; const a = el.dataset.hub;
    if (a === 'cloudok') { LS.set('mme-cloud-seen', '1'); LS.set('mme-cloud', 'on'); render(); setTimeout(sync, 300); }
    else if (a === 'cloudno' || a === 'cloudoff') { LS.set('mme-cloud-seen', '1'); LS.set('mme-cloud', 'off'); render(); if (H && uid) H.update({ ['bw/users/' + uid + '/cloud']: false }).catch(() => {}); }
    else if (a === 'cloudon') { LS.set('mme-cloud', 'on'); render(); setTimeout(sync, 300); }
    else if (a === 'forget') forget();
    else if (a === 'store') openStore();
    else if (a === 'storeclose') $('cloudVeil').hidden = true;
    else if (a === 'mykeep') myKeep(el.dataset.m, el.dataset.t);
    else if (a === 'mykeepall') myKeepAll();
    else if (a === 'keepfull') keepFull();
    else if (a === 'retry') { full = null; LS.set('mme-cloud-full', ''); renderStore(); renderCloud(); sync().then(() => { if (!full) say("Map stored"); renderStore(); }); }
    else if (a === 'mydel') { if (el.dataset.sure) myDel(el.dataset.m); else { el.dataset.sure = '1'; el.textContent = kept.has(el.dataset.m) ? "Press again to delete" : "Not saved as a file yet; press again to delete anyway"; } }
    else if ((a === 'cloudban' || a === 'cloudunban') && admin) (a === 'cloudban' ? H.set('bw/cloudban/' + el.dataset.u, true) : H.remove('bw/cloudban/' + el.dataset.u)).then(() => boView(BO.view), () => say("Didn't work"));
    else if (a === 'dashre' && admin) boView('dash');
    else if (a === 'send') send();
    else if (a === 'del' && admin) H.remove('bw/chat/' + el.dataset.k).catch(() => say("Couldn't delete"));
    else if (a === 'ban' && admin) H.set('bw/chatban/' + el.dataset.u, true).then(() => say("Barred " + el.dataset.n + " from writing in the public chat"), () => say("Didn't work"));
    else if (a === 'unban' && admin) H.remove('bw/chatban/' + el.dataset.u).then(() => boView('chat'), () => say("Didn't work"));
    else if (a === 'open' && admin) { $('hubVeil').hidden = false; boView(BO.view || 'dash'); }
    else if (a === 'close') $('hubVeil').hidden = true;
    else if (a === 'view' && admin) boView(el.dataset.v);
    else if (a === 'dl' && admin) dlMap(el.dataset.u, el.dataset.m, el.dataset.t);
    else if (a === 'dlall' && admin) dlAll();
    else if (a === 'logjson' && admin) dlLog();
    else if (a === 'stale' && admin) { if (el.dataset.sure) { el.disabled = true; staleSweep().then(n => { say(n.users < n.n ? `Deleted the map copies of ${n.n} accounts. Account data for ${n.n - n.users} of them couldn't be deleted: the database rules don't let the admin delete them yet` : `Deleted the data and map copies of ${n.n} accounts`); boView('maps'); }, () => say("Couldn't delete")); } else { el.dataset.sure = '1'; el.textContent = "Press again to delete; this can't be undone"; } }
    else if (a === 'logclear' && admin) { if (el.dataset.sure) { H.remove('bw/log').then(() => { say("Visit log cleared"); boView('stat'); }, () => say("Couldn't clear")); } else { el.dataset.sure = '1'; el.textContent = "Press again to clear the whole log"; } }
    else if (a === 'mapdel' && admin) { if (el.dataset.sure) H.update({ ['bw/maps/' + el.dataset.u + '/' + el.dataset.m]: null, ['bw/mapix/' + el.dataset.u + '/' + el.dataset.m]: null }).then(() => boView('maps'), () => say("Couldn't delete")); else { el.dataset.sure = '1'; el.textContent = "Press again to delete"; } }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target && e.target.id === 'hubMsg' && !e.isComposing) { e.preventDefault(); send(); } });

  // ---------- the back office: the owner's account alone ----------
  const BO = { view: 'dash', offOn: null };
  function file(name, text) { try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); } catch (err) { say("Couldn't save the file"); } }
  const STALE_MS = 3 * 365.25 * 86400000;
  async function staleSweep() {
    const us = await H.get('bw/users') || {}, ids = Object.entries(us).filter(([, x]) => x && typeof x.t === 'number' && H.now() - x.t > STALE_MS).map(([k]) => k); let users = 0;
    for (const u of ids) { await H.remove('bw/maps/' + u); await H.remove('bw/mapix/' + u); try { await H.remove('bw/users/' + u); users++; } catch (err) { /* the rules before v0.19.1 let only the account itself write its record */ } }
    return { n: ids.length, users };
  }
  async function boView(v) {
    BO.view = v; const body = $('hubBo'); if (!body || !admin) return;
    for (const b of document.querySelectorAll('#hubBoTabs button')) b.setAttribute('aria-pressed', String(b.dataset.v === v));
    if (BO.offOn) { BO.offOn(); BO.offOn = null; }
    body.innerHTML = "<p class=\"hubempty\">Reading</p>";
    try {
      if (v === 'dash') body.innerHTML = await dash();
      else if (v === 'on') {
        BO.offOn = H.value('bw/who', w => {
          const rows = Object.entries(w || {}).map(([k, x]) => ({ k, ...x })).sort((a, b) => (a.s || 0) - (b.s || 0)), now = Date.now();
          body.innerHTML = `<div class="tr">Online now <b>${rows.length}</b> pages · signed in with Google ${rows.filter(r => r.g).length}</div><div class="hubt hub4"><div class="hubh"><span>Name</span><span>Where</span><span>here for</span><span>Account</span></div>`
            + rows.map(r => `<div><span>${r.g ? esc(r.n || "Google account") : "Anonymous visitor"}</span><span>${esc(AT[r.at] || r.at)}</span><span>${ago(now - (r.s || now))}</span><span><code>${esc(String(r.k).split('_')[0].slice(0, 10))}</code></span></div>`).join('') + `</div>`
            + `<p class="note2">This table doesn't say who has which map open, and the back office can't enter anyone's room. A room is open only to people the map's owner gives the code</p>`;
        }, () => { body.innerHTML = "<p class=\"hubempty\">Can't read; this account may not be an admin in the database</p>"; });
      } else if (v === 'stat') {
        const L = await H.get('bw/log') || {}, days = Object.keys(L).sort().reverse();
        const rows = days.map(d => { const ev = Object.values(L[d] || {}); const ins = ev.filter(e => e.k === 'in'); return { d, in: ins.length, out: ev.filter(e => e.k === 'out').length, u: new Set(ins.map(e => e.u)).size, g: new Set(ins.filter(e => e.g).map(e => e.u)).size }; });
        const tot = rows.reduce((a, r) => ({ in: a.in + r.in, u: a.u + r.u }), { in: 0, u: 0 });
        body.innerHTML = `<div class="tr">Save ${rows.length} days · total visits <b>${tot.in.toLocaleString('en-US')}</b> times</div><div class="hubt hub5"><div class="hubh"><span>Date</span><span>In</span><span>Out</span><span>Unique people</span><span>Google account</span></div>`
          + rows.map(r => `<div><span>${r.d}</span><span>${r.in}</span><span>${r.out}</span><span>${r.u}</span><span>${r.g}</span></div>`).join('') + `</div>`
          + `<div class="rowx"><button type="button" class="btn" data-hub="logjson">Export the log as a JSON file</button><button type="button" class="btn" data-hub="logclear">Clear the whole log</button></div><p class="note2">Dates follow Thailand time. Export before clearing; a cleared log can't be recovered</p>`;
      } else if (v === 'maps') {
        const [ix, us] = await Promise.all([H.get('bw/mapix'), H.get('bw/users')]); const rows = [];
        for (const [u, ms] of Object.entries(ix || {})) for (const [m, x] of Object.entries(ms || {})) rows.push({ u, m, ...x, who: us && us[u] ? (us[u].g ? us[u].n || "Google account" : "Anonymous visitor") : '' });
        rows.sort((a, b) => (b.at || 0) - (a.at || 0));
        const cb = await H.get('bw/cloudban').catch(() => null) || {}, per = {};
        for (const r of rows) { const o = per[r.u] || (per[r.u] = { u: r.u, who: r.who, n: 0, size: 0 }); o.n++; o.size += r.size || 0; }
        for (const k of Object.keys(cb)) if (cb[k] === true && !per[k]) per[k] = { u: k, who: us && us[k] ? us[k].n || '' : '', n: 0, size: 0 };
        const owners = Object.values(per).sort((a, b) => b.size - a.size);
        const ownerT = owners.length ? `<div class="tr">Storage per account (at most ${kb(QUOTA)} per account)</div><div class="hubt hub4"><div class="hubh"><span>Owner</span><span>Used</span><span>maps</span><span></span></div>`
          + owners.map(o => `<div><span>${esc(o.who || o.u.slice(0, 10))}</span><span><span class="minibar"><i style="width:${Math.min(100, o.size / QUOTA * 100).toFixed(1)}%"></i></span> ${kb(o.size)}</span><span>${o.n}</span><span>${cb[o.u] === true ? `<b class="warn">Bar storage</b> <button type="button" class="lnk" data-hub="cloudunban" data-u="${esc(o.u)}">Allow storage again</button>` : `<button type="button" class="lnk" data-hub="cloudban" data-u="${esc(o.u)}">Bar storage</button>`}</span></div>`).join('') + `</div>` : '';
        // accounts not seen for three years: the terms of use (10, the table) say their records and copies are deleted (25 Nov 2026)
        const stale = Object.entries(us || {}).filter(([, x]) => x && typeof x.t === 'number' && H.now() - x.t > STALE_MS).map(([k]) => k);
        const staleT = `<div class="tr">Accounts not seen for over 3 years <b>${stale.length}</b> Account ${stale.length ? ` <button type="button" class="btn" data-hub="stale">Delete the data and map copies of these accounts</button>` : ''}</div>${stale.length ? `<p class="note2">These accounts' entries in Firebase Authentication must be deleted by hand in the Firebase console, Authentication tab. Account IDs: <code>${stale.map(esc).join(' ')}</code></p>` : ''}`;
        body.innerHTML = staleT + ownerT + `<div class="tr">Map copies <b>${rows.length}</b> maps from ${new Set(rows.map(r => r.u)).size} accounts · total ${kb(rows.reduce((a, r) => a + (r.size || 0), 0))}</div><div class="hubt hub5"><div class="hubh"><span>Map</span><span>Owner</span><span>Sent on</span><span>Size</span><span></span></div>`
          + rows.map(r => `<div><span>${esc(r.title)} <small>${r.cols}×${r.rows}</small></span><span>${esc(r.who)}</span><span>${new Date(r.at).toLocaleString(window.MME_LANG === 'en' ? 'en-GB' : 'th-TH')}</span><span>${kb(r.size || 0)}</span><span><button type="button" class="lnk" data-hub="dl" data-u="${esc(r.u)}" data-m="${esc(r.m)}" data-t="${esc(r.title)}">Download</button> <button type="button" class="lnk" data-hub="mapdel" data-u="${esc(r.u)}" data-m="${esc(r.m)}">Delete</button></span></div>`).join('') + `</div>`
          + (rows.length ? `<div class="rowx"><button type="button" class="btn" data-hub="dlall">Download all as one file</button></div>` : '') + `<p class="note2">Downloaded files can be imported into this page with the Import a map file button. Copies arrive when the owner leaves a map, never while they are editing</p>`;
      } else if (v === 'chat') {
        const ban = await H.get('bw/chatban') || {}, us = await H.get('bw/users') || {};
        const ids = Object.keys(ban).filter(k => ban[k] === true);
        body.innerHTML = `<div class="tr">Messages can be deleted, or people barred from writing, straight from the public chat on the menu</div><div class="tr">Accounts barred from writing <b>${ids.length}</b></div>`
          + ids.map(k => `<div class="tr">${esc(us[k] && us[k].n || k)} <button type="button" class="lnk" data-hub="unban" data-u="${esc(k)}">Allow writing again</button></div>`).join('');
      }
    } catch (err) { body.innerHTML = "<p class=\"hubempty\">Can't read; this account may not be an admin in the database</p>"; }
  }
  // ---------- the statistics page (v0.18.3): what the owner wants at a glance ----------
  async function dash() {
    const [L0, us0, ix0, cb0] = await Promise.all([H.get('bw/log'), H.get('bw/users'), H.get('bw/mapix'), H.get('bw/cloudban').catch(() => null)]);
    const L = L0 || {}, us = us0 || {}, ix = ix0 || {}, now = H.now(), today = dayKey(now);
    const days = []; for (let i = 29; i >= 0; i--) days.push(dayKey(now - i * DAYMS));
    const day = d => { const ev = Object.values(L[d] || {}), ins = ev.filter(e => e && e.k === 'in'); return { d, in: ins.length, u: new Set(ins.map(e => e.u)).size, g: new Set(ins.filter(e => e.g).map(e => e.u)).size, ins }; };
    const D = days.map(day), T = D[D.length - 1];
    const uniq = n => new Set(D.slice(-n).flatMap(x => x.ins.map(e => e.u))).size;
    const hours = new Array(24).fill(0); for (const x of D) for (const e of x.ins) if (typeof e.t === 'number') hours[new Date(e.t + TZ).getUTCHours()]++;
    const acc = Object.values(us), accG = acc.filter(x => x && x.g).length, accCloud = acc.filter(x => x && x.cloud).length;
    const per = []; let maps = 0, bytes = 0;
    for (const [u, ms] of Object.entries(ix)) { let n = 0, b = 0; for (const x of Object.values(ms || {})) { n++; b += +(x && x.size) || 0; } maps += n; bytes += b; per.push({ u, n, b, who: us[u] ? (us[u].g ? us[u].n || "Google account" : "Anonymous visitor") : u.slice(0, 10) }); }
    per.sort((a, b) => b.b - a.b);
    const talk = chat.filter(m => m.t >= midnight(now)), bannedN = Object.values(cb0 || {}).filter(x => x === true).length;
    const tile = (k, v, sub) => `<div class="tile"><span>${k}</span><b>${v}</b>${sub ? `<small>${sub}</small>` : ''}</div>`;
    const tiles = `<div class="tiles">`
      + tile("Online now", num(online.n), online.g ? `signed in ${num(online.g)}` : "No Google account")
      + tile("Today", num(T.u) + " people", `In ${num(T.in)} times · Google ${num(T.g)}`)
      + tile("7 days", num(uniq(7)) + " people", `30 days ${num(uniq(30))} people`)
      + tile("Accounts that have visited", num(acc.length), `Google ${num(accG)} · backup on ${num(accCloud)}`)
      + tile("Stored maps", num(maps) + " maps", `${kb(bytes)} of ${num(per.length)} Account ${bannedN ? ` · storage barred ${bannedN}` : ''}`)
      + tile("Chat today", num(talk.length) + " messages", `${num(new Set(talk.map(m => m.u)).size)} people writing`)
      + `</div>`;
    const W = 640, Hh = 150, padL = 30, padB = 22, top = 8, iw = W - padL - 4, ih = Hh - padB - top;
    const nice = m => { if (m <= 4) return 4; const p = Math.pow(10, Math.floor(Math.log10(m))), f = m / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; };
    const bars = (vals, labels, tips, every) => {
      const mx = nice(Math.max(1, ...vals)), bw = iw / vals.length, g = Math.min(2, bw * .2);
      let svg = `<svg viewBox="0 0 ${W} ${Hh}" class="chart" role="img">`;
      for (const f of [0, .5, 1]) { const y = top + ih - ih * f; svg += `<line x1="${padL}" x2="${W - 4}" y1="${y}" y2="${y}" class="grid"/><text x="${padL - 5}" y="${y + 3}" class="ax" text-anchor="end">${num(mx * f)}</text>`; }
      vals.forEach((v, i) => { const h = ih * v / mx, x = padL + i * bw + g / 2, w = Math.max(1, bw - g), y = top + ih - h;
        if (v > 0) svg += `<path class="bar" d="M${x},${top + ih}V${y + Math.min(3, h)}q0,-${Math.min(3, h)} ${Math.min(3, w / 2)},-${Math.min(3, h)}H${x + w - Math.min(3, w / 2)}q${Math.min(3, w / 2)},0 ${Math.min(3, w / 2)},${Math.min(3, h)}V${top + ih}Z"/>`;
        svg += `<rect class="hit" x="${padL + i * bw}" y="${top}" width="${bw}" height="${ih}" data-tip="${esc(tips[i])}"/>`;
        if (i % every === 0 || i === vals.length - 1) svg += `<text x="${padL + i * bw + bw / 2}" y="${Hh - 6}" class="ax" text-anchor="middle">${esc(labels[i])}</text>`; });
      return svg + `<line x1="${padL}" x2="${W - 4}" y1="${top + ih}" y2="${top + ih}" class="base"/></svg>`;
    };
    const visits = bars(D.map(x => x.in), D.map(x => x.d.slice(8) + '/' + x.d.slice(5, 7)), D.map(x => `${x.d} · in ${num(x.in)} times · ${num(x.u)} people · Google ${num(x.g)}`), 5);
    const byHour = bars(hours, hours.map((_, h) => String(h).padStart(2, '0')), hours.map((n, h) => `${String(h).padStart(2, '0')}:00 to ${String(h).padStart(2, '0')}:59 · in ${num(n)} times in 30 days`), 3);
    const top10 = per.slice(0, 10);
    const store = top10.length ? `<div class="hbars">` + top10.map(p => `<div data-tip="${esc(p.who)} · ${kb(p.b)} · ${p.n} maps · ${(p.b / QUOTA * 100).toFixed(1)}% of ${kb(QUOTA)}"><span>${esc(p.who)}</span><span class="hb"><i style="width:${Math.max(.5, Math.min(100, p.b / QUOTA * 100)).toFixed(2)}%"></i></span><span>${kb(p.b)}</span></div>`).join('') + `</div><p class="note2">A full bar is the ${kb(QUOTA)} each account may store</p>`
      : `<p class="hubempty">No one has stored maps yet</p>`;
    const dbPct = bytes / FREE_DB * 100;
    return tiles
      + `<h3 class="ch">Visits per day, last 30 days</h3>${visits}`
      + `<h3 class="ch">When people visit (Thailand time, last 30 days)</h3>${byHour}`
      + `<h3 class="ch">Storage per account (top 10)</h3>${store}`
      + `<h3 class="ch">Database space</h3><div class="quota"><div class="quotabar${dbPct > 80 ? ' hot' : ''}"><i style="width:${Math.min(100, dbPct).toFixed(2)}%"></i></div><span>Map copies use about <b>${kb(bytes)}</b> of ${FREE_DB / MB / 1024} GB of the free plan (Spark)</span></div>`
      + `<p class="note2">Counted from the visit log not yet cleared. One person is one account; anonymous visitors who clear their browser count as new people. Days follow Thailand time. Updated ${hm(now)} <button type="button" class="lnk" data-hub="dashre">Reload</button></p>`;
  }
  // one tooltip for every chart in the back office
  document.addEventListener('mousemove', e => {
    const tip = $('hubTip'); if (!tip) return; const t = e.target && e.target.closest ? e.target.closest('#hubBo [data-tip]') : null;
    if (!t) { tip.hidden = true; return; }
    tip.textContent = t.getAttribute('data-tip'); tip.hidden = false;
    const r = tip.getBoundingClientRect(); tip.style.left = Math.min(innerWidth - r.width - 8, e.clientX + 12) + 'px'; tip.style.top = Math.max(8, e.clientY - r.height - 10) + 'px';
  });
  async function dlMap(u, m, t) { try { const x = await H.get('bw/maps/' + u + '/' + m); if (!x || !x.d) return say("Copy not found"); file(String(t || 'map').replace(/[^A-Za-z0-9ก-๙]+/g, '-').slice(0, 40) + '.mapmaker.json', x.d); } catch (err) { say("Download failed"); } }
  async function dlAll() { try { const all = await H.get('bw/maps') || {}, maps = []; for (const ms of Object.values(all)) for (const x of Object.values(ms || {})) { try { maps.push(JSON.parse(x.d)); } catch (err) { /* a broken copy is left out */ } } file('bazaar-worldmaker-backups-' + dayKey(Date.now()) + '.mapmaker.json', JSON.stringify({ format: 'map-maker-engine-library', version: 1, maps })); } catch (err) { say("Download failed"); } }
  async function dlLog() { try { const [log, users] = await Promise.all([H.get('bw/log'), H.get('bw/users')]); file('bazaar-worldmaker-visits-' + dayKey(Date.now()) + '.json', JSON.stringify({ format: 'bazaar-worldmaker-visits', version: 1, exported: new Date().toISOString(), log: log || {}, users: users || {} }, null, 1)); } catch (err) { say("Export failed"); } }

  fire.onHub(start); fire.onUser(() => setTimeout(start, 0));
  fire.ready.then(() => start());
  MME.hub = { get uid() { return uid; }, get admin() { return admin; }, get online() { return online; }, get chat() { return chat; }, get used() { return used(); }, get full() { return full; }, QUOTA, sync, forget, start, openStore };
})();
