// ---------- small things of the screen (v0.19.0) ----------
// The owner: the brushes should always be in sight while the options are scrolled down to read something else, because nobody
// wants to scroll back up to pick a brush again. In each mode's options, the rows that choose what the pointer does stay pinned at
// the top of the options while the rest scrolls under them.
{
  const pin = (panel, els) => {
    els = els.filter(Boolean); if (!els.length) return; const w = document.createElement('div'); w.className = 'pinrow';
    panel.insertBefore(w, els[0]); for (const el of els) w.appendChild(el);
  };
  const P = f => document.querySelector(`#opts > [data-for="${f}"]`);
  const terr = P('terrain'); if (terr) pin(terr, [$('pal'), $('bsize') && $('bsize').closest('.optrow'), $('featPal') && $('featPal').closest('.optrow')]);
  for (const f of ['river', 'city', 'label', 'route', 'trade', 'climate', 'info']) { const p = P(f); if (!p) continue; const first = [...p.children].find(el => !el.classList.contains('sidehint')); if (first) pin(p, [first]); }
  const eco = P('econ'); if (eco) pin(eco, [$('ecoTab') && $('ecoTab').closest('.optrow'), $('ecoPaintRow')]);
}
