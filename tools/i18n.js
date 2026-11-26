#!/usr/bin/env node
// Bazaar Worldmaker: the English build (v0.22.0, the owner's ask of 26 Nov 2026).
//
// The sources stay Thai. This tool reads a built file and writes its English twin: every string literal and every piece of a
// template literal that holds Thai is cut into phrases (at HTML markup and at the characters " ` = < > { }), and each phrase is
// put through src/i18n/en.json. Markup files are cut the same way. A phrase with no English yet stays Thai and is counted.
// A line that carries the mark  i18n:keep  is left as it is (strings a parser reads back, such as Thai number words).
//
//   node tools/i18n.js js   IN OUT DICT     a script
//   node tools/i18n.js html IN OUT DICT     markup
//   node tools/i18n.js sheet DICT FILE...   the phrases that still want English, one per line, as JSON
const fs = require('fs'), path = require('path');
const acorn = require(path.join(__dirname, 'vendor', 'acorn.js')), walk = require(path.join(__dirname, 'vendor', 'acorn-walk.js'));
const TH = /[฀-๿]/;
const ATTR = /((?:title|placeholder|aria-label|alt|data-tip|label)=")([^"]*)(")/g;
let missing = new Map();

// put one piece of text into English, phrase by phrase, keeping the markup and the spaces around each phrase
function tr(s, D, after) {
  if (!TH.test(s)) return s;
  // a phrase right after a number (an expression, or a closing tag around one) may have its own English under '#': Thai counts
  // with the same word it names things with (3 เมือง, 3 cities; เมือง, City)
  const parts = s.split(/(<[^<>]*>)/), out = parts.map((part, k) => {
    if (/^<[^<>]*>$/.test(part)) return part.replace(ATTR, (m, a, v, b) => a + tr(v, D) + b);
    const counted = (k === 0 && after) || (k > 0 && /^<\/(b|small|span|strong)>$/i.test(parts[k - 1]));
    return part.split(/(["`=<>{}])/).map((p, j) => {
      if (!TH.test(p)) return p;
      const t = p.trim(); let lead = p.slice(0, p.indexOf(t)); const tail = p.slice(p.indexOf(t) + t.length);
      const e = (counted && j === 0 && lead && D['#' + t] != null) ? D['#' + t] : D[t];
      if (e == null) { missing.set(t, (missing.get(t) || 0) + 1); return p; }
      if (/^[,.;:)!?%]/.test(e)) lead = '';                       // English punctuation hugs the word before it
      return lead + e + tail;
    }).join('');
  });
  // Thai runs words together across inline tags; English wants a space there
  for (let k = 0; k < parts.length; k++) {
    if (/^<[^<>]*>$/.test(parts[k])) continue;
    const nx = parts[k + 1], pv = parts[k - 1];
    if (nx && INL.test(nx) && !nx.startsWith('</') && THE.test(parts[k]) && /[\w)]$/.test(out[k])) out[k] += ' ';
    if (pv && INL.test(pv) && pv.startsWith('</') && THS.test(parts[k]) && /^[\w(]/.test(out[k])) out[k] = ' ' + out[k];
  }
  return out.join('');
}
const INL = /^<\/?(b|strong|em|i|span|a|code|kbd|u|small|sup|sub|mark)\b/i, THS = /^[\u0E00-\u0E7F]/, THE = /[\u0E00-\u0E7F]$/;
function phrases(s) {
  const out = [];
  for (const part of s.split(/(<[^<>]*>)/)) {
    if (/^<[^<>]*>$/.test(part)) { for (const m of part.matchAll(ATTR)) out.push(...phrases(m[2])); continue; }
    for (const p of part.split(/["`=<>{}]/)) { const t = p.trim(); if (TH.test(t)) out.push(t); }
  }
  return out;
}
function jsNodes(src) {
  const ast = acorn.parse(src, { ecmaVersion: 'latest', allowReturnOutsideFunction: true, allowHashBang: true }), out = [];
  const keep = new Set(); src.split('\n').reduce((pos, line) => { if (line.includes('i18n:keep')) keep.add(pos); return pos + line.length + 1; }, 0);
  const lineStart = i => src.lastIndexOf('\n', i - 1) + 1;
  // Thai writes ร้อยละ before the number; English puts % after it. Mark the piece of text that follows such a number.
  const PCT = /ร้อยละ\s*$/;
  const edge = (x, side) => { if (x.type === 'Literal') x[side] = true; else if (x.type === 'ConditionalExpression') { edge(x.consequent, side); edge(x.alternate, side); } else if (x.type === 'TemplateLiteral') x.quasis[side === 'padL' ? 0 : x.quasis.length - 1][side] = true; };
  walk.full(ast, n => {
    if (n.type === 'TemplateLiteral') n.expressions.forEach((x, i) => { const L = n.quasis[i].value.cooked || '', R = n.quasis[i + 1].value.cooked || ''; if (i > 0 && !L) edge(x, 'padL'); if (i + 1 < n.expressions.length && !R) edge(x, 'padR'); });
    if (n.type === 'TemplateLiteral') n.quasis.forEach((q, i) => { if (i + 1 < n.quasis.length && PCT.test(q.value.cooked || '')) n.quasis[i + 1].pct = true; if (i > 0) q.padL = true; if (i + 1 < n.quasis.length) q.padR = true; });
    if (n.type === 'BinaryExpression' && n.operator === '+') {
      const ops = []; (function flat(x) { if (x.type === 'BinaryExpression' && x.operator === '+') { flat(x.left); flat(x.right); } else ops.push(x); })(n);
      ops.forEach((x, i) => { if (i > 0) edge(x, 'padL'); if (i + 1 < ops.length) edge(x, 'padR'); });
      ops.forEach((x, i) => { if (x.type === 'Literal' && typeof x.value === 'string' && PCT.test(x.value) && ops[i + 2] && ops[i + 2].type === 'Literal' && typeof ops[i + 2].value === 'string') ops[i + 2].pct = true; });
    }
  });
  walk.full(ast, n => {
    if (n.type === 'Literal' && typeof n.value === 'string' && (TH.test(n.value) || n.pct) && !keep.has(lineStart(n.start))) out.push({ n, v: n.value, tpl: false });
    else if (n.type === 'TemplateElement' && (TH.test(n.value.cooked || '') || n.pct) && !keep.has(lineStart(n.start))) out.push({ n, v: n.value.cooked, tpl: true });
  });
  return out;
}
function jsFile(src, D) {
  const nodes = jsNodes(src).sort((a, b) => b.n.start - a.n.start);
  let s = src;
  for (const { n, v, tpl } of nodes) {
    let e = tr(v, D, !!n.padL);
    if (e !== v) { if (n.padL && THS.test(v) && /^[\w(]/.test(e)) e = ' ' + e; if (n.padR && THE.test(v) && /[\w)]$/.test(e)) e += ' '; }
    if (n.pct) e = /^\s*%/.test(e) ? e.replace(/^\s+/, '') : '%' + e;
    if (/ร้อยละ\s*$/.test(v) && /\(\s+$/.test(e)) e = e.replace(/\s+$/, '');
    if (e === v) continue;
    const rep = tpl ? e.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${') : JSON.stringify(e).split(String.fromCharCode(0x2028)).join('\\u2028').split(String.fromCharCode(0x2029)).join('\\u2029');
    s = s.slice(0, n.start) + rep + s.slice(n.end);
  }
  return s;
}
const [mode, ...args] = process.argv.slice(2);
if (mode === 'js' || mode === 'html') {
  const [inp, outp, dict] = args, D = JSON.parse(fs.readFileSync(dict, 'utf8')), src = fs.readFileSync(inp, 'utf8');
  const out = mode === 'js' ? jsFile(src, D) : tr(src, D);
  if (mode === 'js') acorn.parse(out, { ecmaVersion: 'latest', allowReturnOutsideFunction: true });   // the English file must still parse
  fs.writeFileSync(outp, out);
  if (process.env.I18N_LIST && missing.size) process.stderr.write(path.basename(inp) + ': ' + JSON.stringify([...missing.keys()]) + '\n');
  process.stdout.write(JSON.stringify({ file: path.basename(inp), missing: missing.size }) + '\n');
} else if (mode === 'sheet') {
  const [dict, ...files] = args, D = JSON.parse(fs.readFileSync(dict, 'utf8')), want = new Set();
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    const ps = f.endsWith('.html') ? phrases(src) : jsNodes(src).flatMap(x => phrases(x.v));
    for (const p of ps) if (!D[p]) want.add(p);
  }
  process.stdout.write(JSON.stringify([...want], null, 0) + '\n');
} else { console.error('usage: i18n.js js|html IN OUT DICT, or sheet DICT FILE...'); process.exit(2); }
