// ---------- the climate mode: five layers to look through, what each hex is like, and what it asks of each city ----------
// the colours are one hue each, dark for little and pale for much, stepped in OKLCH and checked as ordinal ramps against the page's ink
const fmtT = v => (v <= -0.5 ? '−' : '') + Math.abs(v).toFixed(0) + '°C';
const fmtN = v => Math.round(v).toLocaleString('en-US');
const CLL = {
  ts: { name: 'อากาศห้วงฟ้าคลาย', ramp: 'heat', v: (A, i) => A.ts[i], t: v => (v + 10) / 50, ticks: [-10, 0, 10, 20, 30, 40], fmt: fmtT,
        about: 'อุณหภูมิเฉลี่ยในห้วงฟ้าคลาย ห้วงที่อุ่นที่สุดของปี ทางเหนือเย็นกว่าทางใต้ ริมทะเลเย็นกว่าแผ่นดินด้านใน หลังเทือกเขาที่ฝนไม่ตกร้อนที่สุด และทุกพันเมตรที่สูงขึ้น อากาศเย็นลงราวหกองศาครึ่ง' },
  tw: { name: 'อากาศห้วงขาว', ramp: 'cold', v: (A, i) => A.tw[i], t: v => (-40 - v) / 55, ticks: [-40, -50, -60, -70, -80, -90], fmt: fmtT,
        about: 'อุณหภูมิเฉลี่ยในห้วงขาว ห้วงที่หนาวที่สุดของปี ทั้งทวีปเฉลี่ยราวลบหกสิบองศา และบางคืนลงไปถึงลบเก้าสิบ ทางเหนือหนาวกว่าทางใต้ ริมทะเลอุ่นกว่าด้านใน บนที่สูงหนาวขึ้นไม่มากนัก เพราะอากาศเย็นไหลลงไปขังในที่ต่ำ' },
  p: { name: 'ความชื้น', ramp: 'wet', v: (A, i) => A.p[i], t: v => v / 2300, ticks: [0, 500, 1000, 1500, 2000], fmt: v => fmtN(v) + ' มม.',
       about: 'ปริมาณฝนและหิมะตลอดหนึ่งปี ฝั่งตะวันตกหลังเทือกเขาคาราฮาระแห้งจัด ตอนกลางแห้งปานกลาง ดินแดนรกร้างทางใต้แล้ง ฝนราวสองร้อยถึงห้าร้อยมิลลิเมตร แดนเหนือกับภาคตะวันออกเฉียงเหนือชื้น ชายฝั่งตะวันตกหน้าเทือกเขาและภูเขาด้านที่รับลมได้ฝนมากที่สุด' },
  ai: { name: 'ความแห้งแล้ง', ramp: 'arid', classes: true, v: (A, i) => A.ai[i],
        about: 'บอกว่าฝนที่ตกพอกับน้ำที่แดดและลมดึงออกไปจากดินหรือไม่ ยิ่งค่าน้อยยิ่งแห้ง แบ่งเป็นห้าระดับ ตั้งแต่แห้งแล้งจัดอย่างทะเลทรายซาทาราไปจนถึงชุ่มชื้น' },
  h: { name: 'ความสูง', ramp: 'elev', v: (A, i) => A.h[i], t: v => Math.sqrt(Math.max(0, v) / 10500), ticks: [0, 500, 1000, 2000, 3000, 5000, 10000], fmt: v => fmtN(v) + ' ม.',
       about: 'ความสูงเฉลี่ยของแต่ละช่องจากระดับน้ำทะเล ยอดเขาบางยอดในช่องสูงกว่านี้ ภูเขาสแตนเทอร์สูงที่สุดในทวีป ชั้นเมฆมานาคลุมโลกไว้ที่ราวสามพันเมตร ที่ที่สูงพ้นเมฆจึงมีแดดส่องถึง' },
};
if (BLANK) {
  Object.assign(CLL.ts, { name: 'อากาศฤดูร้อน', about: 'อุณหภูมิเฉลี่ยของฤดูที่อุ่นที่สุดของแต่ละช่อง คิดจากละติจูดของแผนที่ ยิ่งใกล้ขั้วโลกยิ่งเย็น ริมทะเลเย็นกว่าแผ่นดินด้านใน ที่แห้งร้อนกว่าที่ชื้น และทุกพันเมตรที่สูงขึ้นเย็นลงราวหกองศาครึ่ง' });
  Object.assign(CLL.tw, { name: 'อากาศฤดูหนาว', t: v => (25 - v) / 65, ticks: [20, 10, 0, -10, -20, -40], about: 'อุณหภูมิเฉลี่ยของฤดูที่หนาวที่สุดของแต่ละช่อง คิดจากละติจูดของแผนที่ ยิ่งใกล้ขั้วโลกและยิ่งลึกเข้าไปในแผ่นดิน ฤดูหนาวยิ่งหนาวและห่างจากฤดูร้อนมาก ริมทะเลอุ่นกว่าด้านใน' });
  CLL.p.about = 'ปริมาณฝนและหิมะตลอดหนึ่งปี เริ่มจากชนิดของพื้นที่ระบายไว้ เกลี่ยกับช่องข้างเคียง แล้วลมของแต่ละฤดูกับแถบละติจูดดันขึ้นในด้านที่รับลมจากทะเลและดันลงหลังเทือกเขา ช่องที่ตั้งฝนเองด้วยเครื่องมือจะคงค่าที่ตั้งไว้';
  CLL.ai.about = 'บอกว่าฝนที่ตกพอกับน้ำที่แดดและลมดึงออกไปจากดินหรือไม่ ยิ่งค่าน้อยยิ่งแห้ง แบ่งเป็นห้าระดับ ตั้งแต่แห้งแล้งจัดไปจนถึงชุ่มชื้น';
  CLL.h.about = 'ความสูงเฉลี่ยของแต่ละช่องจากระดับน้ำทะเล คิดจากระยะถึงฝั่งและระยะถึงภูเขา แก้เองรายช่องได้';
}
// one season looked at alone: its own warmth and its own rain take the place of the year's extremes
let clSeas = '';
const clSeasIx = () => { const A = climEnsure(); return A.seas ? A.seas.findIndex(s => s.id === clSeas) : -1; };
CLL.st = { get name() { const k = clSeasIx(); return 'อากาศ' + (k >= 0 ? climEnsure().seas[k].name : 'ของฤดู'); }, ramp: 'heat', v: (A, i) => { const k = clSeasIx(); return k >= 0 ? A.S[k].t[i] : A.ts[i]; }, t: BLANK ? v => (v + 30) / 70 : v => (v + 90) / 130, ticks: BLANK ? [-30, -20, -10, 0, 10, 20, 30, 40] : [-90, -60, -30, 0, 20, 40], fmt: fmtT,
  about: 'อุณหภูมิเฉลี่ยของฤดูที่เลือก คิดจากตำแหน่งของฤดูบนวงรอบปีระหว่างช่วงหนาวที่สุดกับร้อนที่สุดของแต่ละช่อง บวกค่าที่ตั้งให้ฤดูนี้ และค่าที่ระบายแก้รายช่อง' };
CLL.sp = { get name() { const k = clSeasIx(); return 'ฝน' + (k >= 0 ? climEnsure().seas[k].name : 'ของฤดู'); }, ramp: 'wet', v: (A, i) => { const k = clSeasIx(); return k >= 0 ? A.S[k].p[i] : A.p[i]; }, t: v => v / 900, ticks: [0, 150, 300, 450, 600, 900], fmt: v => fmtN(v) + ' มม.',
  about: 'ฝนและหิมะที่ตกในฤดูที่เลือก ฝนทั้งปีของแต่ละช่องถูกแบ่งให้แต่ละฤดูตามความยาวของฤดูและตามลมของฤดูนั้น ด้านที่รับลมจากทะเลได้มาก หลังเทือกเขาได้น้อย' };
const clKeys = () => clSeas && clSeasIx() >= 0 ? ['st', 'sp', 'ai', 'h'] : ['ts', 'tw', 'p', 'ai', 'h'];
let clLayer = 'ts', clsel = null, clhex = -1, CL_BK = null;
try { const v = localStorage.getItem('gresland-clim-layer'); if (CLL[v] && v !== 'st' && v !== 'sp') clLayer = v; } catch (err) { /* the first layer this visit */ }
const clColor = (key, v) => { const L = CLL[key]; if (L.classes) return CLRAMP.arid[4 - aridClass(v)]; const r = CLRAMP[L.ramp]; return r[Math.round(clamp(L.t(v), 0, 1) * (r.length - 1))]; };
function climBuckets() {                            // the land hexes as one path per colour, built when the layer or the climate changes
  const A = climEnsure(), key = clLayer + '|' + clSeas + '|' + A.stamp;
  if (CL_BK && CL_BK.key === key) return CL_BK;
  const by = new Map();
  for (let i = 0; i < N; i++) { if (isNaN(A.h[i])) continue; const c = clColor(clLayer, CLL[clLayer].v(A, i)); let q = by.get(c); if (!q) by.set(c, q = new Path2D()); hexPath(q, i, 1.03); }
  return CL_BK = { key, by };
}
function drawClimate(c, px) {
  const B = climBuckets(), w = cv.width / dpr, h = cv.height / dpr;
  const x0 = -view.x / view.s - R, y0 = -view.y / view.s - R, x1 = (w - view.x) / view.s + R, y1 = (h - view.y) / view.s + R;
  c.globalAlpha = 0.86;
  for (const [col, q] of B.by) { c.fillStyle = col; c.fill(q); }
  c.globalAlpha = 1;
  // the rivers stay in sight as thin ink, the ones that run with the seasons broken
  c.save(); c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = 'rgba(12,16,22,.62)';
  for (const r of BRIV) {
    if (!hits(r.bb, x0, y0, x1, y1)) continue;
    c.lineWidth = Math.max(0.6, (r.s ? 0.45 : 0.6) * r.w); c.setLineDash(r.s ? [2.2, 1.8] : []);
    for (const u of riverRuns(r)) { if (u.q.length < 2) continue; c.beginPath(); c.moveTo(u.q[0][0], u.q[0][1]); for (let j = 1; j < u.q.length; j++) c.lineTo(u.q[j][0], u.q[j][1]); c.stroke(); }
  }
  c.setLineDash([]);
  if (clhex >= 0) { c.beginPath(); hexPath(c, clhex, 1); c.lineWidth = 2.2 * px; c.strokeStyle = 'rgba(255,214,120,.95)'; c.stroke(); }
  const sc = clsel && visibleCities().find(v => v.id === clsel);
  if (sc) { c.beginPath(); c.arc(sc.x, sc.y, Math.max(7 * px, 4), 0, 2 * Math.PI); c.lineWidth = 2.2 * px; c.strokeStyle = 'rgba(255,214,120,.95)'; c.stroke(); }
  c.restore();
}
// one hex as the climate sees it, as lines for a card
function climLines(i) {
  const A = climEnsure(); if (isNaN(A.h[i])) return '';
  const k = aridClass(A.ai[i]), hl = key => key === clLayer ? ' class="s"' : '';
  return `<div${hl('h')}>สูง ${fmtN(A.h[i])} ม. จากระดับทะเล</div>`
    + `<div><span${hl('ts')}>${BLANK ? 'ฤดูร้อน' : 'ห้วงฟ้าคลาย'} ${fmtT(A.ts[i])}</span> · <span${hl('tw')}>${BLANK ? 'ฤดูหนาว' : 'ห้วงขาว'} ${fmtT(A.tw[i])}</span></div>`
    + `<div${hl('p')}>ฝนและหิมะ ${fmtN(A.p[i])} มม. ต่อปี</div>`
    + `<div${hl('ai')}>${ARID[k][1]} · ดัชนีความแห้ง ${A.ai[i] >= 9 ? 'มากกว่า 5' : A.ai[i].toFixed(2)}</div>`
    + (A.S ? `<div class="clsl">` + A.seas.map((s, q) => { const T = A.S[q].t[i], p = A.S[q].p[i]; return `<span${s.id === clSeas ? ' class="s"' : ''}>${esc(s.name)}</span><span class="n">${fmtT(T)}</span><span class="n">${fmtN(p)} มม.</span><span>${T < 0 ? (p >= 15 ? 'หิมะตก น้ำแข็งจับ' : 'เยือกแข็ง') : T < 5 ? 'หนาวจัด พืชไม่โต' : p < 12 ? 'แล้ง' : p > 350 ? 'ฝนชุก' : ''}</span>`; }).join('') + `</div><div>ปลูกพืชได้ราวร้อยละ ${Math.round(A.grow[i] * 100)} ของปี</div>` : '')
    + (!BLANK && A.h[i] >= CL.cloud ? `<div class="mine">พ้นชั้นเมฆมานา แดดส่องถึง</div>` : '');
}
const xm = v => '×' + v.toFixed(2);
function climFxRows(id) {                           // what the climate asks of one city, against a city of the continent's own mean climate
  const c = ECON && ECON.cities.find(x => x.id === id); if (!c || !c.cm) return '';
  const m = c.cm, rows = [
    ['เชื้อเพลิง', m.fuel, m.geo ? 'นครใต้ภูเขาใช้ความร้อนใต้พิภพให้ความอบอุ่น จึงใช้เชื้อเพลิงน้อยกว่าเมืองอื่น' : 'ยิ่งหนาวนานยิ่งต้องเผาเชื้อเพลิงให้ความอบอุ่นมาก'],
    ['เส้นใย หนัง และเชือก', m.cloth, 'เสื้อผ้ากันหนาว'],
    ['สมุนไพร', m.herbs, 'ที่ชื้นมีไข้หวัดและปอดบวมมากกว่า'],
    ['เครื่องมือโลหะ', m.tools, 'โลหะขึ้นสนิมเร็วในที่ชื้น'],
    ['ธัญพืชจากน้ำฝนในที่ทำกิน', m.grain, 'ที่แห้งปลูกพืชที่อาศัยน้ำฝนได้น้อยลง นาริมแม่น้ำและริมทะเลสาบไม่เสีย'],
  ];
  return `<h3>ผลต่อเมือง</h3><div class="clfx">` + rows.map(([n, v, why]) => `<span title="${esc(why)}">${esc(n)}</span><span class="n${Math.abs(v - 1) >= 0.05 ? ' hi' : ''}">${xm(v)}</span>`).join('') + `</div>`
    + `<p class="note" style="margin-top:6px">ค่า ×1.00 คือเมืองที่อากาศเท่าค่าเฉลี่ยของทวีป สี่แถวแรกคูณความต้องการ แถวสุดท้ายคูณผลผลิตรวงอำพันจากที่ทำกินรอบเมือง</p>`;
}
function climLegend() {
  const L = CLL[clLayer];
  if (L.classes) return `<div class="legend" style="margin-top:6px">` + ARID.map(([t], k) => { const lo = k ? ARID[k - 1][0] : 0; const col = CLRAMP.arid[4 - k];
    return `<div class="lg"><span class="chip" style="background:${col}"></span><span>${ARID[k][1]}</span><span class="n">${t === Infinity ? lo.toFixed(2) + ' ขึ้นไป' : lo.toFixed(2) + ' ถึง ' + t.toFixed(2)}</span></div>`; }).reverse().join('') + `</div>`;
  const r = CLRAMP[L.ramp], grad = r.map((c, k) => `${c} ${(k / (r.length - 1) * 100).toFixed(1)}%`).join(',');
  const ticks = L.ticks.map(v => { const x = clamp(L.t(v), 0, 1) * 100; return `<span${!BLANK && clLayer === 'h' && v === CL.cloud ? ' class="cloud"' : ''} style="left:${x.toFixed(1)}%">${clLayer === 'h' ? (v >= 1000 ? (v / 1000).toLocaleString('en-US') + 'k' : v) : L.fmt(v).replace(' มม.', '')}</span>`; }).join('');
  return `<div class="clleg"><div class="clbar" style="background:linear-gradient(90deg,${grad})"></div><div class="clticks">${ticks}</div></div>`
    + (clLayer === 'h' ? `<p class="note" style="margin-top:2px">สเกลยืดช่วงที่ต่ำให้กว้าง ที่ราบจึงเห็นความต่าง${BLANK ? '' : ' ขีดสีทองคือชั้นเมฆมานา'}</p>` : clLayer === 'p' ? `<p class="note" style="margin-top:2px">มิลลิเมตรต่อปี</p>` : '');
}
function renderClimCard() {
  const card = $('climcard'); card.hidden = mode !== 'climate';
  if (card.hidden) return;
  const L = CLL[clLayer], A = climEnsure();
  if (clsel && !visibleCities().some(v => v.id === clsel)) clsel = null;
  let h = `<div class="tr"><b>${esc(L.name)}</b></div><div class="tr w">${esc(L.about)}</div>` + climLegend();
  const sc = clsel && visibleCities().find(v => v.id === clsel);
  if (sc) {
    const hx = landHex(hexAt(sc.x, sc.y));
    h += `<h3>${esc(sc.name || 'เมืองไม่มีชื่อ')}</h3><div class="tr">${hx >= 0 ? climLines(hx) : ''}</div>` + climFxRows(sc.id);
    h += `<div class="btns"><button type="button" class="btn" id="clBack">ดูทุกเมือง</button></div>`;
  } else {
    if (clhex >= 0 && !isNaN(A.h[clhex])) h += `<h3>${esc(biomeInfo(eff(clhex)).name)}</h3><div class="tr">${climLines(clhex)}</div>`;
    // the table view: every city on the map by the layer shown, so no reading rests on colour alone
    const rows = visibleCities().map(v => { const hx = landHex(hexAt(v.x, v.y)); return hx >= 0 && !isNaN(A.h[hx]) ? [v, CLL[clLayer].v(A, hx)] : null; }).filter(Boolean);
    const desc = clLayer !== 'tw';                   // the coldest White interval first, the hottest, wettest, driest and highest first otherwise
    rows.sort((a, b) => clLayer === 'ai' ? a[1] - b[1] : desc ? b[1] - a[1] : a[1] - b[1]);
    const val = v => clLayer === 'ai' ? ARID[aridClass(v)][1] + ' ' + (v >= 9 ? '>5' : v.toFixed(2)) : CLL[clLayer].fmt(v);
    h += `<h3>เมืองทั้งหมด ${rows.length} แห่ง</h3><div class="cltbl">` + rows.map(([v, x]) => `<button type="button" data-id="${esc(v.id)}">${esc(v.name || 'เมืองไม่มีชื่อ')}</button><span class="n">${esc(val(x))}</span>`).join('') + `</div>`
      + `<p class="note">คลิกเมืองบนแผนที่หรือในรายการเพื่อดูว่าอากาศส่งผลกับเมืองนั้นอย่างไร</p>`;
  }
  $('climbody').innerHTML = h;
  for (const b of document.querySelectorAll('#climbody .cltbl button')) b.onclick = () => { clsel = b.dataset.id; clhex = -1; renderClimCard(); requestDraw(); };
  if ($('clBack')) $('clBack').onclick = () => { clsel = null; renderClimCard(); requestDraw(); };
}
function setClLayer(k) {
  clLayer = k; CL_BK = null; segPick('clLayer', 'k', k, setClLayer);
  try { localStorage.setItem('gresland-clim-layer', k); } catch (err) { /* this visit only */ }
  renderClimCard(); requestDraw();
}
function climClick(mx, my) {
  const c = cityAt(mx, my);
  if (c) { clsel = c.id; clhex = -1; }
  else { const h = hexAt(mx, my); clsel = null; clhex = h >= 0 && !isW(eff(h)) ? h : -1; }
  renderClimCard(); requestDraw();
}
function showClimTip(mx, my, e, id) {
  const c = cityAt(mx, my), hx = c ? landHex(hexAt(c.x, c.y)) : id;
  if (hx < 0 || isNaN(climEnsure().h[hx])) { hideTip(true); return; }
  const z = zoneOf(hx), zn = z !== '.' ? zoneInfo(z).name : '';
  tip.set((c ? `<b>${esc(c.name || 'เมืองไม่มีชื่อ')}</b>` : `<b>${esc(biomeInfo(eff(hx)).name)}</b>`) + (zn ? `<div class="m">${esc(zn)}</div>` : '') + `<div class="lore">${climLines(hx)}</div>`
    + (c ? '<div class="m">คลิกเพื่อดูผลต่อเมือง</div>' : '') + (typeof clReachNote === 'function' ? clReachNote() : ''), clColor(clLayer, CLL[clLayer].v(climEnsure(), hx)));
}
function clLayerRow() { const ks = clKeys(); if (!ks.includes(clLayer)) clLayer = clLayer === 'p' || clLayer === 'sp' ? (clSeas ? 'sp' : 'p') : ks.includes('st') ? 'st' : 'ts'; $('clLayer').innerHTML = ks.map(k => `<button type="button" data-k="${k}">${esc(CLL[k].name)}</button>`).join(''); segPick('clLayer', 'k', clLayer, setClLayer); }
clLayerRow();
$('clHint').textContent = 'เลือกชั้นข้อมูลด้านบน ชี้ช่องเพื่อดูอากาศของช่องนั้น คลิกเมืองเพื่อดูว่าอากาศส่งผลกับเมืองอย่างไร ลากเพื่อเลื่อนแผนที่';

