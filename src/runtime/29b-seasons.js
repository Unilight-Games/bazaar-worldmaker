
// ---- the seasons of the year, as the owner divides it (the request of 23 Nov 2026) ----
// The climate mode gains a row to look at one season alone, and its card a list of the seasons: add one, take one away, give each
// its length, its place between the coldest and the warmest of the year, its own warmth and rain, and its wind. With a season
// chosen the brush changes that season's warmth or rain hex by hex. The model that reads all this is in the climate part above.
const clUid = () => 's' + Math.random().toString(36).slice(2, 8);
const SBOX = document.createElement('div'); SBOX.id = 'clseasbox'; $('climbody').parentNode.insertBefore(SBOX, $('climbody'));
// the list the owner can change: on a map of our own world the four seasons become the map's own the first time one is touched
function clOwnSeasons() { if (!CLO.seasons.length && BLANK) CLO.seasons = CLSEAS0.map(s => ({ ...s })); return CLO.seasons; }
const CLUNIT = BLANK ? 'เดือน' : 'ห้วง';
let clSeasOpen = true, clSeasMean = null;
function clSeasMeans() {                            // each season over the whole land, for the list
  const A = climEnsure(); if (!A.S) return null; if (clSeasMean && clSeasMean.stamp === A.stamp) return clSeasMean.rows;
  const rows = A.S.map(() => [0, 0, 0, 0]); let n = 0;
  for (let i = 0; i < N; i++) { if (isNaN(A.h[i])) continue; n++; A.S.forEach((S, k) => { rows[k][0] += S.t[i]; rows[k][1] += S.p[i]; if (S.t[i] < 0) rows[k][2]++; if (S.t[i] >= 5) rows[k][3]++; }); }
  for (const r of rows) { r[0] /= n || 1; r[1] /= n || 1; r[2] /= n || 1; r[3] /= n || 1; }
  clSeasMean = { stamp: A.stamp, rows }; return rows;
}
const clWindOpts = (v, first) => `<option value="">${first}</option>` + Object.keys(WDIR).map(d => `<option value="${d}"${v === d ? ' selected' : ''}>จาก${WNAME[d]}</option>`).join('') + `<option value="calm"${v === 'calm' ? ' selected' : ''}>ลมสงบ ไม่พาฝนไปทางใด</option>`;
function clSeasHTML() {
  const A = climEnsure(), SE = A.seas, own = CLO.seasons.length > 0;
  if (!SE) return `<details class="clseas"${clSeasOpen ? ' open' : ''}><summary>ฤดูของปี</summary><p class="note" style="margin-top:6px">แผนที่นี้คิดอากาศจากสองห้วงสุดขั้วตามลอร์ คือห้วงขาวกับห้วงฟ้าคลาย ถ้าแบ่งปีเป็นฤดู แต่ละฤดูจะมีอุณหภูมิ ฝน และลมของตัวเอง แล้วผลผลิตกับความต้องการของเมืองจะคิดจากทุกฤดูรวมกัน</p>${editable ? '<div class="btns"><button type="button" class="btn" data-sa="split">แบ่งปีเป็นฤดู</button></div>' : ''}</details>`;
  const tot = SE.reduce((a, s) => a + s.len, 0) || 1, M = clSeasMeans();
  let h = `<details class="clseas"${clSeasOpen ? ' open' : ''}><summary>ฤดูของปี ${SE.length} ฤดู</summary>`;
  if (editable) h += `<div class="btns"><button type="button" class="btn" data-sa="add"${SE.length >= 13 ? ' disabled' : ''}>เพิ่มฤดู</button>${own ? `<button type="button" class="btn" data-sa="reset">${BLANK ? 'คืนสี่ฤดูตั้งต้น' : 'กลับไปใช้สองห้วงตามลอร์'}</button>` : ''}</div>`;
  SE.forEach((s, k) => {
    const m = M[k], w = clWindOf(s);
    h += `<div class="eform${s.id === clSeas ? ' on' : ''}" data-sid="${s.id}"><div class="erow"><input type="text" data-sf="name" maxlength="40" value="${esc(s.name)}" style="flex:1" aria-label="ชื่อฤดู"${editable ? '' : ' disabled'}><button type="button" class="btn" data-sa="view">${s.id === clSeas ? 'กำลังดู' : 'ดูบนแผนที่'}</button>${editable && SE.length > 1 ? '<button type="button" class="btn warn" data-sa="del">ลบ</button>' : ''}</div>`
      + `<div class="erow"><label>ยาว <input type="number" data-sf="len" min="0.25" max="13" step="0.25" value="${s.len}"> ${CLUNIT} (ร้อยละ ${Math.round(s.len / tot * 100)} ของปี)</label></div>`
      + `<div class="erow"><label style="flex:1">ตำแหน่งบนวงรอบปี หนาวสุด <input type="range" data-sf="warm" min="0" max="100" step="5" value="${Math.round(s.warm * 100)}" style="flex:1"> ร้อนสุด <b>${Math.round(s.warm * 100)}%</b></label></div>`
      + `<div class="erow"><label>อุณหภูมิ บวกหรือลบ <input type="number" data-sf="dt" min="-40" max="40" step="0.5" value="${s.dt}"> °C</label><label>ฝน <input type="number" data-sf="rain" min="0" max="400" step="5" value="${Math.round(s.rain * 100)}"> %</label></div>`
      + `<div class="erow"><label>ลม <select data-sf="wind">${clWindOpts(s.wind, BLANK ? 'ตามลมประจำของแผนที่' : 'ไม่กำหนด ฝนกระจายตามที่สำรวจ')}</select></label><label>แรงลม <input type="number" data-sf="gust" min="30" max="300" step="10" value="${Math.round((s.gust || 1) * 100)}"> %</label></div>`
      + `<div class="tr w">เฉลี่ยทั้งแผ่นดิน ${fmtT(m[0])} ฝน ${fmtN(m[1])} มม.${m[2] > 0.02 ? ' แผ่นดินร้อยละ ' + Math.round(m[2] * 100) + ' ต่ำกว่าจุดเยือกแข็ง' : ''} ปลูกพืชได้ร้อยละ ${Math.round(m[3] * 100)} ของแผ่นดิน${w === 'auto' ? ' ลมตามแถบละติจูด' : WDIR[w] ? ' ลมจาก' + WNAME[w] : ''}</div></div>`;
  });
  return h + `<p class="note">ความยาวคิดเป็นสัดส่วนกันเอง ไม่ต้องรวมได้เลขใดเลขหนึ่ง ตำแหน่งบนวงรอบปีบอกว่าฤดูนั้นอยู่ใกล้ช่วงหนาวที่สุดหรือร้อนที่สุดของแต่ละช่อง ${BLANK ? 'ซีกใต้ของเส้นศูนย์สูตรกลับฤดูให้เอง ' : ''}ฝนร้อยละร้อยคือส่วนที่แบบจำลองแบ่งให้ฤดูนี้ ลมกำหนดว่าด้านไหนของแผ่นดินและของเทือกเขาได้ฝนของฤดูนี้ แรงลมมากพาความชื้นเข้าไปได้ลึก ถ้าจะแก้เฉพาะบางพื้นที่ กดดูบนแผนที่แล้วใช้เครื่องมือแก้ค่าของชั้นที่ดูอยู่</p></details>`;
}
function clSeasonRow() {
  const A = climEnsure(), SE = A.seas; if (clSeas && !(SE && SE.some(s => s.id === clSeas))) clSeas = '';
  $('clSeason').innerHTML = `<button type="button" data-s="">ทั้งปี</button>` + (SE || []).map(s => `<button type="button" data-s="${s.id}">${esc(s.name)}</button>`).join('');
  segPick('clSeason', 's', clSeas, setClSeas);
  $('clSeason').closest('.optrow').hidden = !SE;
}
function setClSeas(id) { clSeas = id || ''; CL_BK = null; clSeasonRow(); clLayerRow(); renderClimCard(); requestDraw(); }
function clSeasEdit(fn) { if (!editable) return; fn(clOwnSeasons()); clChanged(); }
SBOX.addEventListener('toggle', e => { if (e.target.classList && e.target.classList.contains('clseas')) clSeasOpen = e.target.open; }, true);
SBOX.addEventListener('click', e => {
  const b = e.target.closest('[data-sa]'); if (!b) return; const a = b.dataset.sa, box = b.closest('[data-sid]'), sid = box && box.dataset.sid;
  if (a === 'view') { setClSeas(clSeas === sid ? '' : sid); return; }
  if (!editable) return;
  if (a === 'split') { CLO.seasons = [{ id: clUid(), name: 'ห้วงขาว', len: 6.5, warm: 0, dt: 0, rain: 1, wind: '', gust: 1 }, { id: clUid(), name: 'ห้วงฟ้าคลาย', len: 6.5, warm: 1, dt: 0, rain: 1, wind: '', gust: 1 }]; clChanged(); }
  else if (a === 'add') clSeasEdit(L => { if (L.length < 13) L.push({ id: clUid(), name: 'ฤดูใหม่', len: BLANK ? 3 : 1, warm: 0.5, dt: 0, rain: 1, wind: '', gust: 1 }); });
  else if (a === 'del') clSeasEdit(L => { if (L.length < 2) return; const k = L.findIndex(s => s.id === sid); if (k < 0) return; L.splice(k, 1); for (const m of [CLO.st, CLO.sp]) for (const key of Object.keys(m)) if (key.startsWith(sid + ':')) delete m[key]; if (clSeas === sid) clSeas = ''; });
  else if (a === 'reset') { CLO.seasons = []; CLO.st = {}; CLO.sp = {}; clSeas = ''; clChanged(); }
});
SBOX.addEventListener('input', e => { if (e.target.dataset.sf === 'warm') { const b = e.target.parentNode.querySelector('b'); if (b) b.textContent = e.target.value + '%'; } });
SBOX.addEventListener('change', e => {
  const el = e.target, f = el.dataset.sf, box = el.closest('[data-sid]'); if (!f || !box) return; const sid = box.dataset.sid, num = +el.value;
  clSeasEdit(L => {
    const s = L.find(x => x.id === sid); if (!s) return;
    if (f === 'name') s.name = el.value.trim().slice(0, 40) || s.name;
    else if (f === 'len' && num > 0) s.len = clamp(num, 0.25, 13);
    else if (f === 'warm') s.warm = clamp(num / 100, 0, 1);
    else if (f === 'dt' && Number.isFinite(num)) s.dt = clamp(num, -40, 40);
    else if (f === 'rain' && num >= 0) s.rain = clamp(num / 100, 0, 4);
    else if (f === 'wind') s.wind = WDIR[el.value] || el.value === 'calm' ? el.value : '';
    else if (f === 'gust' && num > 0) s.gust = clamp(num / 100, 0.3, 3);
  });
});
// the map's own settings: its latitudes and its prevailing wind
$('clWind').innerHTML = clWindOpts('', !BLANK ? 'ไม่กำหนด' : GENWIND ? 'ตามที่แผนที่ถูกสร้าง (จาก' + WNAME[GENWIND] + ')' : 'ตามแถบละติจูด') + (BLANK && GENWIND ? '<option value="auto">ตามแถบละติจูด (ลมสินค้า ลมตะวันตก ลมขั้วโลก)</option>' : '');
$('clWind').onchange = () => { if (!editable) return; const v = $('clWind').value; if (WDIR[v] || v === 'calm' || (v === 'auto' && BLANK)) CLO.set.wind = v; else delete CLO.set.wind; clChanged(); };
$('clLatL').hidden = !BLANK; $('clGL').hidden = BLANK;
// which way the season's wind blows, drawn over the layer as small arrows
function clDrawWind(c, px) {
  const A = climEnsure(), k = clSeasIx(); if (k < 0) return; const w = clWindOf(A.seas[k]); if (!w || w === 'calm') return;
  const step = Math.max(3, Math.round(26 * px / R)), len = R * step * 0.42;
  c.save(); c.strokeStyle = 'rgba(255,255,255,.62)'; c.fillStyle = 'rgba(255,255,255,.62)'; c.lineWidth = Math.max(1, 1.4 * px); c.lineCap = 'round';
  for (let r = (step >> 1); r < ROWS; r += step) for (let q = (step >> 1); q < COLS; q += step) {
    const i = r * COLS + q, d = WDIR[w === 'auto' ? clBelt(CLB.lat ? CLB.lat[i] : 0) : w]; if (!d) continue;
    const x = CX[i], y = CY[i], x1 = x + d[0] * len, y1 = y + d[1] * len, x0 = x - d[0] * len, y0 = y - d[1] * len, hx = len * 0.45;
    c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x1 - d[0] * hx - d[1] * hx * 0.55, y1 - d[1] * hx + d[0] * hx * 0.55); c.lineTo(x1 - d[0] * hx + d[1] * hx * 0.55, y1 - d[1] * hx - d[0] * hx * 0.55); c.closePath(); c.fill();
  }
  c.restore();
}
const __dcSeas = drawClimate; drawClimate = function (c, px) { __dcSeas(c, px); clDrawWind(c, px); };
// A field that was typed in reports its change when the cursor leaves it, which is often the press of a button in this very card.
// Were the list drawn afresh at that moment the button would be gone from under the press and the click lost, so after a typed
// change the list stands as it is for a moment and is drawn afresh a little later.
// The list has a box of its own above the rest of the card for the same reason: the rest of the card is drawn afresh at every change.
let clTyped = false, clSeasLater = 0;
__on(window, 'change', e => { const t = e.target; if (t && t.matches && t.matches('input[type="number"], input[type="text"]')) { clTyped = true; setTimeout(() => { clTyped = false; }, 0); } }, true);
const __rcSeas = renderClimCard; renderClimCard = function () {
  __rcSeas(); SBOX.hidden = mode !== 'climate'; if (mode !== 'climate') return;
  clSeasonRow(); clLayerRow();
  if (!(document.activeElement && document.activeElement.closest && document.activeElement.closest('#clSetRow'))) clInputs();   // the means the model gives show in the empty fields
  if (clTyped && SBOX.firstChild) { clearTimeout(clSeasLater); clSeasLater = setTimeout(() => { if (mode === 'climate' && !__dead) renderClimCard(); }, 700); return; }
  const at = document.activeElement, hold = at && at.dataset && at.dataset.sf && at.closest('[data-sid]') ? [at.closest('[data-sid]').dataset.sid, at.dataset.sf] : null;
  SBOX.innerHTML = clSeasHTML();
  if (hold) { const el = SBOX.querySelector(`[data-sid="${hold[0]}"] [data-sf="${hold[1]}"]`); if (el) el.focus({ preventScroll: true }); }   // the field that was being worked in keeps the cursor
};
clInputs();
