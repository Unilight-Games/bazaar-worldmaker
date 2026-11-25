// ---------- what is being typed survives a redraw (v0.19.6) ----------
// The owner and a friend working in one room found that text being typed sometimes vanished (26 Nov 2026). A change heard
// from the room reloads a document and redraws the panels: the economy card is written afresh and the community's form is
// filled again from the map, and either way the box under the cursor lost what had been typed but not yet committed. Around
// each redraw, the box that has the focus is found again afterwards, by its id or by its data attributes and its place
// among boxes alike, and given back its text, its cursor and the focus.
const TYPE_TAGS = new Set(['INPUT', 'TEXTAREA']);
function typingNow(root) {
  const a = document.activeElement; if (!a || !root || !root.contains(a) || !TYPE_TAGS.has(a.tagName)) return null;
  if (a.type === 'checkbox' || a.type === 'radio' || a.type === 'range' || a.type === 'button' || a.type === 'file') return null;
  const attrs = [...a.attributes].filter(x => x.name.startsWith('data-')).map(x => `[${x.name}="${CSS.escape(x.value)}"]`).join('');
  const sel = a.id ? '#' + CSS.escape(a.id) : a.tagName.toLowerCase() + attrs + (a.name ? `[name="${CSS.escape(a.name)}"]` : '');
  const n = a.id ? 0 : [...root.querySelectorAll(sel)].indexOf(a);
  let s0 = null, s1 = null; try { s0 = a.selectionStart; s1 = a.selectionEnd; } catch (err) { /* a number box has none */ }
  return { root, sel, n, val: a.value, s0, s1, el: a };
}
function typingBack(t) {
  if (!t) return; let b = null;
  try { b = t.sel.startsWith('#') ? t.root.querySelector(t.sel) : t.root.querySelectorAll(t.sel)[Math.max(0, t.n)]; } catch (err) { b = null; }
  if (!b || b.disabled) return;
  if (b.value !== t.val) b.value = t.val;
  if (document.activeElement !== b) b.focus({ preventScroll: true });
  if (t.s0 != null) try { b.setSelectionRange(t.s0, t.s1); } catch (err) { /* not a text box */ }
}
// what the panel shows must be the same before and after (the same community, the same tab and good): a redraw for another
// one is a fresh form, and the text goes with the old one
function keepTyping(root, fn, same) { const t = typingNow(root), k = same ? same() : ''; const r = fn(); if (t && (!same || same() === k)) typingBack(t); return r; }
{ const er = ecoRender; ecoRender = function () { return keepTyping($('ecobody'), er, () => mode + '|' + ecoTab + '|' + ecoSel); }; }
{ const rf = refreshForm; refreshForm = function () { return keepTyping(document.getElementById('opts') || document.body, rf, () => mode + '|' + sel); }; }
