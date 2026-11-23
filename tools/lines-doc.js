// Writes the lesson lines as a markdown note and as plain text for the prose linter.
const fs = require('fs');
global.window = {};
eval(fs.readFileSync(__dirname + '/../src/tutor-lines.js', 'utf8'));
const T = window.MME.TUTOR, head = fs.readFileSync(process.argv[2], 'utf8').trimEnd();
let n = 0, out = [], plain = [];
T.chapters.forEach((c, i) => {
  out.push('', `## บทที่ ${i + 1} ${c.title}`, '', '| รหัส | ท่า | คำพูด |', '|---|---|---|');
  c.steps.forEach(s => { n++; plain.push(s.text); if (s.textBk) plain.push(s.textBk);
    out.push(`| ${s.id} | ${s.poseBk ? s.pose + ' หรือ ' + s.poseBk : s.pose} | ${s.text.replace(/\|/g, '/')}${s.textBk ? ' <br>**เมื่อหน้านั้นเก็บสำเนาสำรองให้:** ' + s.textBk.replace(/\|/g, '/') : ''} |`); });
});
const rest = Object.keys(T).filter(k => !['name', 'title', 'card', 'chapters'].includes(k));
for (const k of rest) { const v = T[k]; if (v && typeof v === 'object' && !Array.isArray(v)) { const es = Object.entries(v).filter(e => typeof e[1] === 'string'); if (es.length) { out.push('', `## ${({ praise: 'คำชมเมื่อทำตามที่ชวน', taskLabel: 'ป้ายของงานที่ชวนให้ลอง' })[k] || k}`, '', '| รหัส | คำพูด |', '|---|---|'); es.forEach(e => { out.push(`| ${e[0]} | ${e[1]} |`); plain.push(e[1]); }); } } else if (typeof v === 'string') plain.push(v); }
fs.writeFileSync(process.argv[3], head.replace('{N}', n).replace('{C}', T.chapters.length) + '\n' + out.join('\n') + '\n');
fs.writeFileSync(process.argv[4], plain.join('\n\n') + '\n');
console.log(n, 'lines', T.chapters.length, 'chapters | other keys:', rest.join(' '));
