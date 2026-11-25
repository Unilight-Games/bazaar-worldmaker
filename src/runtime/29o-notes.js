// ---------- notes and the world's page (v0.19.0) ----------
// The owner asked for a writer of notes that can be formatted, a page for the world (its name, the year, the age), and history or
// lore written on a community, a region's name, or a state. A note is kept as a little HTML of a few kinds of mark only (bold,
// italic, underline, two sizes of heading, lists, quotes, paragraphs); anything else in it is dropped when it is read in, so a note
// from someone else's file cannot carry anything that runs. The notes ride in the economy's document beside the states.
// Keys: 'w' the world, 'c:<community>', 's:<state>', 'z:<region code>', 'h:<hex>', 'x:<special zone>'.
ECO.notes = {}; ECO.world = { name: '', year: '', era: '' };
const NOTE_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'H3', 'H4', 'UL', 'OL', 'LI', 'P', 'BR', 'BLOCKQUOTE', 'DIV']);
const NOTE_MAX = 20000;
function noteClean(html) {
  if (typeof html !== 'string' || !html) return '';
  const tpl = document.createElement('template'); tpl.innerHTML = html.slice(0, NOTE_MAX * 2);
  const walk = (n, out) => {
    for (const ch of [...n.childNodes]) {
      if (ch.nodeType === 3) { out.appendChild(document.createTextNode(ch.nodeValue)); continue; }
      if (ch.nodeType !== 1) continue;
      const tag = ch.tagName.toUpperCase();
      if (NOTE_TAGS.has(tag)) { const e = document.createElement(tag === 'DIV' ? 'p' : tag.toLowerCase()); walk(ch, e); out.appendChild(e); }
      else walk(ch, out);                              // an unknown mark goes, its words stay
    }
  };
  const box = document.createElement('div'); walk(tpl.content, box);
  let h = box.innerHTML.replace(/<p><\/p>/g, '').trim(); if (h.length > NOTE_MAX) h = h.slice(0, NOTE_MAX);
  return box.textContent.trim() ? h : '';
}
const noteText = html => { const d = document.createElement('div'); d.innerHTML = html || ''; return d.textContent.replace(/\s+/g, ' ').trim(); };
const noteOf = key => ECO.notes[key] || '';
function noteSet(key, html) { const h = noteClean(html); if (h) ECO.notes[key] = h; else delete ECO.notes[key]; ecoChanged(false); noteHooks(); }
// a point moved over to a feature leaves its name and story on its hex
function noteFromPoint(h, name, note) {
  const key = 'h:' + h, add = (name ? `<h4>${esc(name)}</h4>` : '') + (note ? `<p>${esc(note)}</p>` : ''); if (!add) return;
  ECO.notes[key] = noteClean((ECO.notes[key] || '') + add);
}

// ---- the document ----
{
  const ld = ecoLoad, sr = ecoSerial;
  ecoLoad = function (b) {
    ld(b); b = b || {};
    ECO.notes = {}; if (b.notes && typeof b.notes === 'object') for (const [k, v] of Object.entries(b.notes).slice(0, 6000)) { if (typeof k !== 'string' || k.length > 130 || !/^(w|[cszhxur]:.+)$/.test(k)) continue; const h = noteClean(v); if (h) ECO.notes[k] = h; }
    const w = b.world && typeof b.world === 'object' ? b.world : {};
    ECO.world = { name: ecoStr(w.name, 80), year: ecoStr(w.year, 40), era: ecoStr(w.era, 80) };
    noteHooks();
  };
  ecoSerial = function () {
    const o = sr(); if (Object.keys(ECO.notes).length) o.notes = { ...ECO.notes };
    if (ECO.world.name || ECO.world.year || ECO.world.era) o.world = { ...ECO.world }; return o;
  };
}

// ---- the writer: one window for every note ----
const noteBox = document.createElement('div'); noteBox.className = 'mmodal'; noteBox.hidden = true;
noteBox.innerHTML = `<div class="mmcard" role="dialog" aria-modal="true" aria-labelledby="ntTitle">
  <div class="mmhead"><h3 id="ntTitle">บันทึก</h3><button type="button" class="btn" id="ntClose" aria-label="ปิด">ปิด</button></div>
  <div id="ntWorld" class="ntworld" hidden>
    <label>ชื่อโลก <input type="text" id="ntWName" maxlength="80" autocomplete="off"></label>
    <label>ปี <input type="text" id="ntWYear" maxlength="40" autocomplete="off" placeholder="เช่น 1203"></label>
    <label>ยุค <input type="text" id="ntWEra" maxlength="80" autocomplete="off" placeholder="เช่น ยุคหลังมหาสงคราม"></label>
  </div>
  <div class="nttools" id="ntTools" role="toolbar" aria-label="รูปแบบตัวอักษร">
    <button type="button" data-c="bold" title="ตัวหนา"><b>ห</b></button><button type="button" data-c="italic" title="ตัวเอียง"><i>อ</i></button><button type="button" data-c="underline" title="ขีดเส้นใต้"><u>ข</u></button>
    <button type="button" data-c="h3" title="หัวข้อ">หัวข้อ</button><button type="button" data-c="h4" title="หัวข้อย่อย">หัวข้อย่อย</button><button type="button" data-c="p" title="ย่อหน้าธรรมดา">ย่อหน้า</button>
    <button type="button" data-c="insertUnorderedList" title="รายการจุด">• รายการ</button><button type="button" data-c="insertOrderedList" title="รายการเลข">1. รายการ</button><button type="button" data-c="blockquote" title="ข้อความยกมา">ยกมา</button>
    <button type="button" data-c="removeFormat" title="ล้างรูปแบบ">ล้างรูปแบบ</button>
  </div>
  <div class="ntedit" id="ntEdit" contenteditable="true" spellcheck="false"></div>
  <p class="hint" id="ntHint"></p>
</div>`;
$('mapbox').appendChild(noteBox);
let noteKey = null;
function noteOpen(key, title) {
  noteKey = key; $('ntTitle').textContent = title || 'บันทึก';
  const world = key === 'w'; $('ntWorld').hidden = !world;
  if (world) { $('ntWName').value = ECO.world.name; $('ntWYear').value = ECO.world.year; $('ntWEra').value = ECO.world.era; }
  for (const id of ['ntWName', 'ntWYear', 'ntWEra']) $(id).disabled = !editable;
  $('ntEdit').innerHTML = noteOf(key); $('ntEdit').contentEditable = editable ? 'true' : 'false';
  $('ntTools').hidden = !editable;
  $('ntHint').textContent = editable ? 'บันทึกเก็บเองทุกครั้งที่พิมพ์ จัดรูปแบบได้จากแถบด้านบน วางข้อความจากที่อื่นได้ รูปแบบที่ไม่อยู่ในแถบจะถูกตัดออก' : 'แผนที่นี้ให้อ่านได้อย่างเดียว';
  noteBox.hidden = false; if (editable) $('ntEdit').focus();
}
function noteClose() { if (noteKey && editable) noteSave(); noteKey = null; noteBox.hidden = true; }
let noteT = 0;
function noteSave() {
  if (!noteKey || !editable) return;
  if (noteKey === 'w') ECO.world = { name: $('ntWName').value.slice(0, 80), year: $('ntWYear').value.slice(0, 40), era: $('ntWEra').value.slice(0, 80) };
  noteSet(noteKey, $('ntEdit').innerHTML);
}
$('ntEdit').addEventListener('input', () => { clearTimeout(noteT); noteT = setTimeout(noteSave, 500); });
for (const id of ['ntWName', 'ntWYear', 'ntWEra']) $(id).addEventListener('input', () => { clearTimeout(noteT); noteT = setTimeout(noteSave, 500); });
$('ntTools').addEventListener('mousedown', e => e.preventDefault());   // the words stay chosen while a mark is put on them
$('ntTools').addEventListener('click', e => {
  const b = e.target.closest('button[data-c]'); if (!b || !editable) return; const c = b.dataset.c;
  if (c === 'h3' || c === 'h4' || c === 'p' || c === 'blockquote') document.execCommand('formatBlock', false, '<' + c + '>'); else document.execCommand(c, false, null);
  $('ntEdit').dispatchEvent(new Event('input'));
});
$('ntEdit').addEventListener('paste', e => {       // what is pasted comes in cleaned
  const html = e.clipboardData && e.clipboardData.getData('text/html'), txt = e.clipboardData && e.clipboardData.getData('text/plain'); if (!html && !txt) return;
  e.preventDefault(); document.execCommand('insertHTML', false, html ? noteClean(html) : esc(txt).replace(/\n/g, '<br>'));
});
$('ntClose').onclick = noteClose;
noteBox.addEventListener('pointerdown', e => { if (e.target === noteBox) noteClose(); e.stopPropagation(); });
for (const ev of ['wheel', 'click', 'keydown']) noteBox.addEventListener(ev, e => { if (ev === 'keydown' && e.key === 'Escape') { noteClose(); e.preventDefault(); } e.stopPropagation(); });

// ---- where a note is opened from ----
// the world: a button on the card of this map, and a line on the map under the scale
function worldLine() { const w = ECO.world; return [w.name, w.era, w.year ? 'ปี ' + w.year : ''].filter(Boolean).join(' · '); }
function noteHooks() {
  const sc = $('setcard'); if (sc && !$('setWorld')) { const b = document.createElement('div'); b.className = 'btns'; b.innerHTML = '<button type="button" class="btn" id="setWorld">ข้อมูลโลก</button>'; const at = sc.querySelector('.btns'); sc.insertBefore(b, at); $('setWorld').onclick = () => noteOpen('w', 'ข้อมูลโลก'); }
  let wl = $('worldLine'); if (!wl) { wl = document.createElement('div'); wl.id = 'worldLine'; wl.className = 'worldline'; $('mapbox').appendChild(wl); wl.onclick = () => noteOpen('w', 'ข้อมูลโลก'); }
  const t = worldLine(); wl.textContent = t; wl.hidden = !t; wl.title = 'ข้อมูลโลก คลิกเพื่ออ่านหรือแก้';
}
noteHooks();
// a community: under its short note, a button to its history
{
  const nt = $('cfNote'); if (nt && !$('cfHist')) { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.id = 'cfHist'; b.textContent = 'ประวัติและข้อมูลของชุมชน'; nt.insertAdjacentElement('afterend', b); b.onclick = () => { if (!sel) return; const v = visibleCities().find(c => c.id === sel); noteOpen('c:' + sel, 'ประวัติของ' + (v && v.name ? v.name : 'ชุมชนนี้')); }; }
  const rf = refreshForm; refreshForm = function () { rf(); const b = $('cfHist'); if (b && sel) b.textContent = noteOf('c:' + sel) ? 'อ่านหรือแก้ประวัติของชุมชน' : 'เขียนประวัติของชุมชน'; };
}
// a state: a button in its card in the states tab
{
  const es = ecoStatesHTML; ecoStatesHTML = function () {
    let h = es();
    for (const s of ECO.states) { const at = h.indexOf(`<div class="eform" data-s="${s.id}">`); if (at < 0) continue; const k = h.indexOf('</div>', h.indexOf('class="btns sbtns"', at)); if (k < 0) continue; h = h.slice(0, k) + `<button type="button" class="btn" data-note="s:${s.id}" data-nt="${esc('ประวัติของ' + s.name)}">${noteOf('s:' + s.id) ? 'ประวัติของรัฐ' : 'เขียนประวัติของรัฐ'}</button>` + h.slice(k); }
    return h;
  };
}
__on(document, 'click', e => { const b = e.target.closest ? e.target.closest('[data-note]') : null; if (!b) return; e.preventDefault(); noteOpen(b.dataset.note, b.dataset.nt || 'บันทึก'); });
// a region's name and a hex: buttons in the card of the information mode
{
  const ri = renderInfoCard; renderInfoCard = function () {
    ri(); const body = $('infobody'); if (!body || !isel) return;
    if (isel.t !== 'hex' || body.querySelector('[data-note]')) return;
    const h = isel.h, zc = zoneOf(h), z = zc !== '.' ? zoneInfo(zc) : null, d = document.createElement('div'); d.className = 'btns';
    d.innerHTML = (z ? `<button type="button" class="btn" data-note="z:${esc(zc)}" data-nt="${esc('เรื่องราวของ' + (z.name || 'เขตนี้'))}">${noteOf('z:' + zc) ? 'ประวัติของเขต' : 'เขียนประวัติของเขต'}</button>` : '')
      + `<button type="button" class="btn" data-note="h:${h}" data-nt="บันทึกของช่องนี้">${noteOf('h:' + h) ? 'บันทึกของช่องนี้' : 'เขียนบันทึกของช่องนี้'}</button>`;
    body.insertBefore(d, body.firstChild);
  };
}
__on(window, 'keydown', e => { if (e.key === 'Escape' && !noteBox.hidden) noteClose(); });
