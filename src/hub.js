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
//   admin/<account>        true for an admin's account, set by hand in the Firebase console. Nothing on the page writes it.
//                          The rules also name the owner's admin account by its verified Google email (ADMIN_EMAIL in the
//                          copy of the rules in this repo; the owner's own copy carries the address).
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
  const ago = ms => { const m = Math.max(0, Math.round(ms / 60000)); return m < 1 ? 'เพิ่งเข้ามา' : m < 60 ? m + ' นาที' : Math.floor(m / 60) + ' ชม. ' + (m % 60) + ' นาที'; };
  const kb = n => n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
  const AT = { menu: 'หน้าเมนู', map: 'กำลังแก้แผนที่', room: 'อยู่ในห้องแก้ร่วมกัน', tutor: 'เรียนกับเนเมสไซอาร์' };
  const tab = rnd(8);
  let H = null, uid = null, me = null, offs = [], admin = false, online = { n: 0, g: 0 }, chat = [], banned = false, chatErr = '', where = '', since = Date.now(), wasMap = null, midT = 0;
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
    }, () => { chatErr = google() ? 'อ่านแชทไม่ได้ในตอนนี้' : 'เข้าสู่ระบบด้วย Google เพื่ออ่านและพิมพ์ในแชท'; chat = []; renderChat(); }));
    // what was said before the last midnight is cleared by whoever comes first after it
    H.before('bw/chat', mid - 1).then(v => { for (const k of Object.keys(v || {})) H.remove('bw/chat/' + k).catch(() => {}); }).catch(() => {});
    midT = setTimeout(() => { if (!uid) return; for (const f of offs.splice(offs.length - 1)) { try { f(); } catch (err) { /* off */ } } listenChat(); }, mid + DAYMS - now + 1500);
  }
  async function send() {
    const box = $('hubMsg'); if (!box || !H || !uid || !google()) return; const m = box.value.trim().slice(0, 300); if (!m) return;
    const k = H.key('bw/chat');
    try { await H.update({ ['bw/chat/' + k]: { u: uid, n: myName() || 'ไม่ระบุชื่อ', m, t: H.stamp() }, ['bw/chatlast/' + uid]: H.stamp() }); box.value = ''; }
    catch (err) { say(banned ? 'บัญชีนี้ถูกห้ามพิมพ์ในแชทกลาง' : 'ส่งไม่ได้ พิมพ์ได้ทุกสามวินาที ลองอีกครั้ง'); }
  }

  // ---------- copies of maps for the owner of the page ----------
  const cloudSeen = () => LS.get('mme-cloud-seen') === '1', cloudOn = () => LS.get('mme-cloud') !== 'off';
  const sentAt = () => { try { return JSON.parse(LS.get('mme-cloud-at') || '{}') || {}; } catch (err) { return {}; } };
  const safeId = id => String(id).replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 40);
  let syncing = false;
  async function sync() {
    if (syncing || !H || !uid || !cloudSeen() || !cloudOn() || !MME.store) return; syncing = true;
    try {
      const at = sentAt(), mine = at[uid] || (at[uid] = {}), open = MME.shell && MME.shell.cur ? MME.shell.cur.meta.id : null;
      for (const m of await MME.store.list()) {
        if (m.builtin || m.id === open || !((m.updated || 0) > (mine[m.id] || 0))) continue;
        const f = await MME.store.exportMap(m.id); if (!f) continue; const d = JSON.stringify(f);
        if (d.length > 8000000) continue;           // the database takes up to ten million letters a line; a map this big stays at home
        const id = safeId(m.id);
        await H.update({ ['bw/maps/' + uid + '/' + id]: { d, at: H.stamp() }, ['bw/mapix/' + uid + '/' + id]: { title: String(m.title || 'แผนที่').slice(0, 80), at: H.stamp(), size: d.length, cols: m.cols | 0, rows: m.rows | 0 } });
        mine[m.id] = m.updated || Date.now(); LS.set('mme-cloud-at', JSON.stringify(at));
      }
    } catch (err) { console.warn('map copy', err && (err.code || err.message)); }
    syncing = false;
  }
  async function forget() {
    if (!H || !uid) return;
    try { await Promise.all([H.remove('bw/maps/' + uid), H.remove('bw/mapix/' + uid)]); const at = sentAt(); delete at[uid]; LS.set('mme-cloud-at', JSON.stringify(at)); say('ลบสำเนาแผนที่ของบัญชีนี้ออกจากผู้พัฒนาแล้ว', 6000); }
    catch (err) { say('ลบไม่สำเร็จ ลองอีกครั้ง'); }
  }
  // where this page is, every few seconds; leaving a map sends its copy
  setInterval(() => {
    if (!uid) return; const w = whereNow(), c = MME.shell && MME.shell.cur, id = c && !c.guest && !c.practice ? c.meta.id : null;
    if (w !== where) { where = w; putWho(); }
    if (wasMap && wasMap !== id) setTimeout(sync, 800);
    wasMap = id;
  }, 3000);

  // ---------- on the menu ----------
  function renderOnline() { const el = $('hubOnline'); if (el) el.innerHTML = H && uid ? `ออนไลน์ <b>${online.n}</b> คน${online.g ? ` <small>เข้าสู่ระบบ ${online.g}</small>` : ''}` : ''; }
  function renderChat(jump) {
    const list = $('hubList'), inp = $('hubMsg'), btn = $('hubSend'), why = $('hubWhy'); if (!list) return;
    const atEnd = list.scrollHeight - list.scrollTop - list.clientHeight < 40;
    list.innerHTML = chatErr ? `<p class="hubempty">${esc(chatErr)}</p>` : chat.length ? chat.map(m => `<div class="hubm${m.u === uid ? ' mine' : ''}" data-k="${esc(m.k)}"><b>${esc(m.n)}</b><time>${hm(m.t)}</time><span>${esc(m.m)}</span>${admin ? `<em><button type="button" class="lnk" data-hub="del" data-k="${esc(m.k)}">ลบ</button><button type="button" class="lnk" data-hub="ban" data-u="${esc(m.u)}" data-n="${esc(m.n)}">ห้ามพิมพ์</button></em>` : ''}</div>`).join('') : `<p class="hubempty">ยังไม่มีใครพูดอะไรตั้งแต่เที่ยงคืน</p>`;
    if (jump || atEnd) list.scrollTop = list.scrollHeight;
    const can = !!(H && uid && google() && !banned);
    if (inp) { inp.disabled = !can; inp.placeholder = banned ? 'บัญชีนี้ถูกห้ามพิมพ์ในแชทกลาง' : google() ? 'พิมพ์ข้อความ แล้วกด Enter' : 'เข้าสู่ระบบด้วย Google เพื่อพิมพ์'; }
    if (btn) btn.disabled = !can;
    if (why) why.textContent = 'ข้อความทั้งหมดถูกล้างทุกเที่ยงคืนตามเวลาประเทศไทย';
  }
  function renderNote() {
    const el = $('hubNote'); if (!el) return; el.hidden = !(H && uid) || cloudSeen();
    if (el.hidden) return;
    el.innerHTML = `<h2>สำรองแผนที่ไว้กับผู้พัฒนา</h2><p>หน้าเว็บนี้ส่งสำเนาแผนที่ของคุณไปเก็บที่ผู้พัฒนา ทุกครั้งที่คุณออกจากแผนที่กลับมาหน้าเมนู สำเนานี้ช่วยกู้งานของคุณถ้าเบราว์เซอร์ล้างข้อมูล ผู้พัฒนาเห็นแผนที่ที่ส่งมาแล้ว แต่เข้าแผนที่ที่คุณกำลังแก้ไม่ได้ ถ้าคุณไม่ชวนเข้าห้องเอง ปิดการสำรองได้ทุกเมื่อที่ด้านล่างของคลังแผนที่</p>`
      + `<div class="rowx"><button type="button" class="btn brass" data-hub="cloudok">เข้าใจแล้ว สำรองได้</button><button type="button" class="btn" data-hub="cloudno">ไม่ต้องสำรอง</button></div>`;
  }
  function renderCloud() {
    const el = $('hubCloud'); if (!el) return; el.hidden = !(H && uid) || !cloudSeen();
    if (el.hidden) return;
    el.innerHTML = cloudOn() ? `สำเนาแผนที่ส่งไปเก็บที่ผู้พัฒนาเมื่อคุณออกจากแผนที่ <button type="button" class="lnk" data-hub="cloudoff">หยุดสำรอง</button>`
      : `ไม่ได้สำรองแผนที่ไว้กับผู้พัฒนา <button type="button" class="lnk" data-hub="cloudon">เริ่มสำรอง</button> <button type="button" class="lnk" data-hub="forget">ลบสำเนาที่เคยส่งไป</button>`;
  }
  function renderAcct() {                            // the account's id, which the owner writes into the console to make his own account the admin
    const el = $('acctId'); if (!el) return; el.hidden = !(H && uid && google());
    if (!el.hidden) el.innerHTML = `รหัสบัญชีในระบบ <code>${esc(uid)}</code>`;
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
    else if (a === 'send') send();
    else if (a === 'del' && admin) H.remove('bw/chat/' + el.dataset.k).catch(() => say('ลบไม่สำเร็จ'));
    else if (a === 'ban' && admin) H.set('bw/chatban/' + el.dataset.u, true).then(() => say('ห้าม ' + el.dataset.n + ' พิมพ์ในแชทกลางแล้ว'), () => say('ทำไม่สำเร็จ'));
    else if (a === 'unban' && admin) H.remove('bw/chatban/' + el.dataset.u).then(() => boView('chat'), () => say('ทำไม่สำเร็จ'));
    else if (a === 'open' && admin) { $('hubVeil').hidden = false; boView(BO.view || 'on'); }
    else if (a === 'close') $('hubVeil').hidden = true;
    else if (a === 'view' && admin) boView(el.dataset.v);
    else if (a === 'dl' && admin) dlMap(el.dataset.u, el.dataset.m, el.dataset.t);
    else if (a === 'dlall' && admin) dlAll();
    else if (a === 'logjson' && admin) dlLog();
    else if (a === 'logclear' && admin) { if (el.dataset.sure) { H.remove('bw/log').then(() => { say('ล้างบันทึกการเข้าออกแล้ว'); boView('stat'); }, () => say('ล้างไม่สำเร็จ')); } else { el.dataset.sure = '1'; el.textContent = 'กดอีกครั้งเพื่อล้างบันทึกทั้งหมด'; } }
    else if (a === 'mapdel' && admin) { if (el.dataset.sure) H.update({ ['bw/maps/' + el.dataset.u + '/' + el.dataset.m]: null, ['bw/mapix/' + el.dataset.u + '/' + el.dataset.m]: null }).then(() => boView('maps'), () => say('ลบไม่สำเร็จ')); else { el.dataset.sure = '1'; el.textContent = 'กดอีกครั้งเพื่อลบ'; } }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target && e.target.id === 'hubMsg' && !e.isComposing) { e.preventDefault(); send(); } });

  // ---------- the back office: the owner's account alone ----------
  const BO = { view: 'on', offOn: null };
  function file(name, text) { try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); } catch (err) { say('บันทึกไฟล์ไม่ได้'); } }
  async function boView(v) {
    BO.view = v; const body = $('hubBo'); if (!body || !admin) return;
    for (const b of document.querySelectorAll('#hubBoTabs button')) b.setAttribute('aria-pressed', String(b.dataset.v === v));
    if (BO.offOn) { BO.offOn(); BO.offOn = null; }
    body.innerHTML = '<p class="hubempty">กำลังอ่าน</p>';
    try {
      if (v === 'on') {
        BO.offOn = H.value('bw/who', w => {
          const rows = Object.entries(w || {}).map(([k, x]) => ({ k, ...x })).sort((a, b) => (a.s || 0) - (b.s || 0)), now = Date.now();
          body.innerHTML = `<div class="tr">ออนไลน์ตอนนี้ <b>${rows.length}</b> หน้า · เข้าสู่ระบบด้วย Google ${rows.filter(r => r.g).length}</div><div class="hubt hub4"><div class="hubh"><span>ชื่อ</span><span>อยู่ที่</span><span>อยู่มา</span><span>บัญชี</span></div>`
            + rows.map(r => `<div><span>${r.g ? esc(r.n || 'บัญชี Google') : 'ผู้เยี่ยมชมไม่ระบุชื่อ'}</span><span>${esc(AT[r.at] || r.at)}</span><span>${ago(now - (r.s || now))}</span><span><code>${esc(String(r.k).split('_')[0].slice(0, 10))}</code></span></div>`).join('') + `</div>`
            + `<p class="note2">ตารางนี้ไม่บอกว่าใครเปิดแผนที่ผืนไหน และหลังบ้านเข้าห้องของใครไม่ได้ ห้องเปิดให้เฉพาะคนที่เจ้าของแผนที่ให้รหัส</p>`;
        }, () => { body.innerHTML = '<p class="hubempty">อ่านไม่ได้ บัญชีนี้อาจไม่ใช่แอดมินในฐานข้อมูล</p>'; });
      } else if (v === 'stat') {
        const L = await H.get('bw/log') || {}, days = Object.keys(L).sort().reverse();
        const rows = days.map(d => { const ev = Object.values(L[d] || {}); const ins = ev.filter(e => e.k === 'in'); return { d, in: ins.length, out: ev.filter(e => e.k === 'out').length, u: new Set(ins.map(e => e.u)).size, g: new Set(ins.filter(e => e.g).map(e => e.u)).size }; });
        const tot = rows.reduce((a, r) => ({ in: a.in + r.in, u: a.u + r.u }), { in: 0, u: 0 });
        body.innerHTML = `<div class="tr">บันทึก ${rows.length} วัน · เข้าทั้งหมด <b>${tot.in.toLocaleString('en-US')}</b> ครั้ง</div><div class="hubt hub5"><div class="hubh"><span>วันที่</span><span>เข้า</span><span>ออก</span><span>คนไม่ซ้ำ</span><span>บัญชี Google</span></div>`
          + rows.map(r => `<div><span>${r.d}</span><span>${r.in}</span><span>${r.out}</span><span>${r.u}</span><span>${r.g}</span></div>`).join('') + `</div>`
          + `<div class="rowx"><button type="button" class="btn" data-hub="logjson">ส่งออกบันทึกเป็นไฟล์ JSON</button><button type="button" class="btn" data-hub="logclear">ล้างบันทึกทั้งหมด</button></div><p class="note2">วันที่นับตามเวลาประเทศไทย ส่งออกเก็บไว้ก่อนล้าง บันทึกที่ล้างแล้วเอาคืนไม่ได้</p>`;
      } else if (v === 'maps') {
        const [ix, us] = await Promise.all([H.get('bw/mapix'), H.get('bw/users')]); const rows = [];
        for (const [u, ms] of Object.entries(ix || {})) for (const [m, x] of Object.entries(ms || {})) rows.push({ u, m, ...x, who: us && us[u] ? (us[u].g ? us[u].n || 'บัญชี Google' : 'ผู้เยี่ยมชมไม่ระบุชื่อ') : '' });
        rows.sort((a, b) => (b.at || 0) - (a.at || 0));
        body.innerHTML = `<div class="tr">สำเนาแผนที่ <b>${rows.length}</b> ผืน จาก ${new Set(rows.map(r => r.u)).size} บัญชี · รวม ${kb(rows.reduce((a, r) => a + (r.size || 0), 0))}</div><div class="hubt hub5"><div class="hubh"><span>แผนที่</span><span>เจ้าของ</span><span>ส่งมาเมื่อ</span><span>ขนาด</span><span></span></div>`
          + rows.map(r => `<div><span>${esc(r.title)} <small>${r.cols}×${r.rows}</small></span><span>${esc(r.who)}</span><span>${new Date(r.at).toLocaleString('th-TH')}</span><span>${kb(r.size || 0)}</span><span><button type="button" class="lnk" data-hub="dl" data-u="${esc(r.u)}" data-m="${esc(r.m)}" data-t="${esc(r.title)}">ดาวน์โหลด</button> <button type="button" class="lnk" data-hub="mapdel" data-u="${esc(r.u)}" data-m="${esc(r.m)}">ลบ</button></span></div>`).join('') + `</div>`
          + (rows.length ? `<div class="rowx"><button type="button" class="btn" data-hub="dlall">ดาวน์โหลดทั้งหมดเป็นไฟล์เดียว</button></div>` : '') + `<p class="note2">ไฟล์ที่ดาวน์โหลดนำเข้าหน้านี้ได้ด้วยปุ่มนำเข้าไฟล์แผนที่ สำเนามาถึงเมื่อเจ้าของออกจากแผนที่ ไม่ใช่ขณะที่เขากำลังแก้</p>`;
      } else if (v === 'chat') {
        const ban = await H.get('bw/chatban') || {}, us = await H.get('bw/users') || {};
        const ids = Object.keys(ban).filter(k => ban[k] === true);
        body.innerHTML = `<div class="tr">ลบข้อความหรือห้ามพิมพ์ได้จากแชทกลางบนหน้าเมนูโดยตรง</div><div class="tr">บัญชีที่ถูกห้ามพิมพ์ <b>${ids.length}</b></div>`
          + ids.map(k => `<div class="tr">${esc(us[k] && us[k].n || k)} <button type="button" class="lnk" data-hub="unban" data-u="${esc(k)}">ให้พิมพ์ได้อีก</button></div>`).join('');
      }
    } catch (err) { body.innerHTML = '<p class="hubempty">อ่านไม่ได้ บัญชีนี้อาจไม่ใช่แอดมินในฐานข้อมูล</p>'; }
  }
  async function dlMap(u, m, t) { try { const x = await H.get('bw/maps/' + u + '/' + m); if (!x || !x.d) return say('ไม่พบสำเนานี้'); file(String(t || 'map').replace(/[^A-Za-z0-9ก-๙]+/g, '-').slice(0, 40) + '.mapmaker.json', x.d); } catch (err) { say('ดาวน์โหลดไม่สำเร็จ'); } }
  async function dlAll() { try { const all = await H.get('bw/maps') || {}, maps = []; for (const ms of Object.values(all)) for (const x of Object.values(ms || {})) { try { maps.push(JSON.parse(x.d)); } catch (err) { /* a broken copy is left out */ } } file('bazaar-worldmaker-backups-' + dayKey(Date.now()) + '.mapmaker.json', JSON.stringify({ format: 'map-maker-engine-library', version: 1, maps })); } catch (err) { say('ดาวน์โหลดไม่สำเร็จ'); } }
  async function dlLog() { try { const [log, users] = await Promise.all([H.get('bw/log'), H.get('bw/users')]); file('bazaar-worldmaker-visits-' + dayKey(Date.now()) + '.json', JSON.stringify({ format: 'bazaar-worldmaker-visits', version: 1, exported: new Date().toISOString(), log: log || {}, users: users || {} }, null, 1)); } catch (err) { say('ส่งออกไม่สำเร็จ'); } }

  fire.onHub(start); fire.onUser(() => setTimeout(start, 0));
  fire.ready.then(() => start());
  MME.hub = { get uid() { return uid; }, get admin() { return admin; }, get online() { return online; }, get chat() { return chat; }, sync, forget, start };
})();
