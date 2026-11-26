#!/usr/bin/env python3
"""Bazaar Worldmaker (working name in the code: Map Maker Engine): build.

  python3 -I build.py            ->  dist/ (index.html, engine/*.js, maps/*, assets/*) and dist-offline/ (one file)

The sources are the truth: nothing here rewrites code. The map runtime is one function whose body is kept as the files of
src/runtime/, one per section, joined in the order of src/runtime/ORDER.txt. (Until v0.5.1 the runtime was made by patching
the old Gresland page's script with string replacements; that builder is kept as tools/build-from-legacy.py for the record,
and its last output is what src/runtime/ was cut from.)
"""
import re, base64, json, os, shutil

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC, DIST, OFF = os.path.join(ROOT, 'src'), os.path.join(ROOT, 'dist'), os.path.join(ROOT, 'dist-offline')
rd = lambda p: open(p, encoding='utf-8').read()

def wr(rel, s):
    p = os.path.join(DIST, rel); os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, 'w', encoding='utf-8').write(s)

# ---------------------------------------------------------------- the runtime: its sections, in order
order = [l.strip() for l in rd(os.path.join(SRC, 'runtime', 'ORDER.txt')).splitlines() if l.strip()]
on_disk = sorted(f for f in os.listdir(os.path.join(SRC, 'runtime')) if f.endswith('.js'))
assert sorted(order) == on_disk, 'src/runtime/ORDER.txt and the files of src/runtime/ disagree: %s' % sorted(set(order) ^ set(on_disk))
runtime = ''.join(rd(os.path.join(SRC, 'runtime', f)) for f in order)

# ---------------------------------------------------------------- files
ENGINE = ['gen.js', 'store.js', 'backup.js', 'net.js', 'fire.js', 'defaults.js', 'shell.js', 'hub.js', 'policy.js', 'tutor-lines.js', 'tutor.js']
wr('engine/runtime.js', runtime)
for f in ENGINE:
    shutil.copy(os.path.join(SRC, f), os.path.join(DIST, 'engine', f))
PLAIN_DEFAULTS = rd(os.path.join(SRC, 'defaults.js'))               # what a copy without Gresland ships: no picture of his map either
# The owner's own map, Gresland, ships with his Claude artifact and his one-file build. It is not part of what goes to GitHub
# (his ruling, 23 Nov 2026), so a copy of this source without src/maps/ still builds: the page then starts with an empty library.
GRES = os.path.exists(os.path.join(SRC, 'maps', 'gresland-base.js'))
shutil.rmtree(os.path.join(DIST, 'maps'), ignore_errors=True)
if GRES:
    os.makedirs(os.path.join(DIST, 'maps'), exist_ok=True)
    for f in ['gresland-base.js', 'gresland-edits.json']:
        shutil.copy(os.path.join(SRC, 'maps', f), os.path.join(DIST, 'maps', f))
    wr('engine/defaults.js', PLAIN_DEFAULTS + 'MME.DEFAULTS.greslandThumb = ' + json.dumps(rd(os.path.join(SRC, 'maps', 'gresland-thumb.txt')).strip()) + ';\n')
os.makedirs(os.path.join(DIST, 'assets', 'nem'), exist_ok=True)
for f in sorted(os.listdir(os.path.join(ROOT, 'assets', 'nem'))):
    shutil.copy(os.path.join(ROOT, 'assets', 'nem', f), os.path.join(DIST, 'assets', 'nem', f))
os.makedirs(os.path.join(DIST, 'assets', 'music'), exist_ok=True)  # the music of the map (the owner's own song, v0.19.2)
for f in sorted(os.listdir(os.path.join(ROOT, 'assets', 'music'))):
    shutil.copy(os.path.join(ROOT, 'assets', 'music', f), os.path.join(DIST, 'assets', 'music', f))
os.makedirs(os.path.join(DIST, 'assets', 'bg'), exist_ok=True)     # the paintings behind the menu (the owner's own, from his asset folder)
BG = sorted(os.listdir(os.path.join(ROOT, 'assets', 'bg')))
for f in BG:
    shutil.copy(os.path.join(ROOT, 'assets', 'bg', f), os.path.join(DIST, 'assets', 'bg', f))

SCRIPTS = ['gen.js', 'store.js', 'backup.js', 'net.js', 'fire.js', 'defaults.js', 'runtime.js', 'shell.js', 'hub.js', 'policy.js', 'tutor-lines.js', 'tutor.js']

# ---------------------------------------------------------------- the English build (v0.22.0)
# The sources stay Thai; tools/i18n.js writes an English twin of every built script and of the page's markup through
# src/i18n/en.json. Each page carries its language and the name of its twin, and goes to the twin at once when the reader chose
# the other language (kept in the browser under mme.lang). Without node or the dictionary only the Thai page is built.
import subprocess
DICT = os.path.join(SRC, 'i18n', 'en.json')
EN_OK = os.path.exists(DICT) and shutil.which('node') is not None
def to_en(kind, src_path, out_path):
    r = subprocess.run(['node', os.path.join(ROOT, 'tools', 'i18n.js'), kind, src_path, out_path, DICT], capture_output=True, text=True)
    if r.returncode: raise SystemExit('i18n failed on %s: %s' % (src_path, r.stderr[-800:]))
    return json.loads(r.stdout.strip().splitlines()[-1])['missing']
def en_text(kind, text):
    tmp_in, tmp_out = os.path.join(DIST, '.i18n-in'), os.path.join(DIST, '.i18n-out')
    open(tmp_in, 'w', encoding='utf-8').write(text); to_en(kind, tmp_in, tmp_out); out = rd(tmp_out); os.remove(tmp_in); os.remove(tmp_out); return out
def lang_head(lang, pages):
    return ('<script>window.MME_LANG = %s; window.MME_PAGES = %s; (function () { try { var l = localStorage.getItem("mme.lang");'
            ' if (l && l !== window.MME_LANG && window.MME_PAGES[l]) location.replace(window.MME_PAGES[l] + location.search + location.hash); } catch (e) {} })();</script>\n') % (json.dumps(lang), json.dumps(pages))
MENU, MAPT = rd(os.path.join(SRC, 'menu.html')), rd(os.path.join(SRC, 'map.html'))
def page(lang, pages, menu, mapt, folder):
    return '<!DOCTYPE html>\n<html lang="' + lang + '">\n<head>\n' + """<meta charset="utf-8">
""" + lang_head(lang, pages) + """<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Bazaar Worldmaker</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;700&family=Noto+Serif+Thai:wght@500;700&display=swap" rel="stylesheet">
<style>
""" + rd(os.path.join(SRC, 'map.css')) + "\n" + rd(os.path.join(SRC, 'shell.css')) + """</style>
</head>
<body>
""" + menu + """<template id="tpl-map">
""" + mapt + """
</template>
""" + ''.join('<script src="%s/%s"></script>\n' % (folder, f) for f in SCRIPTS) + """</body>
</html>
"""
PAGES = {'th': 'index.html', 'en': 'en.html'} if EN_OK else {'th': 'index.html'}
index = page('th', PAGES, MENU, MAPT, 'engine')
wr('index.html', index)
EN_MISSING = 0
if EN_OK:
    os.makedirs(os.path.join(DIST, 'engine-en'), exist_ok=True)
    for f in SCRIPTS:
        EN_MISSING += to_en('js', os.path.join(DIST, 'engine', f), os.path.join(DIST, 'engine-en', f))
    MENU_EN, MAPT_EN = en_text('html', MENU), en_text('html', MAPT)
    en_index = page('en', PAGES, MENU_EN, MAPT_EN, 'engine-en')
    wr('en.html', en_index)
else:
    shutil.rmtree(os.path.join(DIST, 'engine-en'), ignore_errors=True)

# ---------------------------------------------------------------- one file that runs from disk, with no server and no network
def b64(path): return base64.b64encode(open(path, 'rb').read()).decode()
OFFNAME = {'th': 'bazaar-worldmaker-offline.html', 'en': 'bazaar-worldmaker-offline-en.html'}
def offline(lang, idx, folder):
    off = idx.replace(lang_head(lang, PAGES), lang_head(lang, {k: OFFNAME[k] for k in PAGES}))
    arts = {f[:-5]: 'data:image/webp;base64,' + b64(os.path.join(ROOT, 'assets', 'nem', f)) for f in sorted(os.listdir(os.path.join(ROOT, 'assets', 'nem')))}
    arts['music'] = 'data:audio/mpeg;base64,' + b64(os.path.join(ROOT, 'assets', 'music', 'worldbuilding.mp3'))
    head = ('<script>window.MME_OFFLINE = true; window.MME_ASSETS = ' + json.dumps(arts) + '; window.MME_EDITS = '
            + rd(os.path.join(SRC, 'maps', 'gresland-edits.json')) + ';</script>\n<script>\n' + rd(os.path.join(SRC, 'maps', 'gresland-base.js')) + '\n</script>\n') if GRES else (
            '<script>window.MME_OFFLINE = true; window.MME_NO_GRESLAND = true; window.MME_ASSETS = ' + json.dumps(arts) + ';</script>\n')
    first = '<script src="%s/gen.js"></script>' % folder
    assert off.count(first) == 1
    off = off.replace(first, head + first)
    for f in SCRIPTS:
        tag = '<script src="%s/%s"></script>' % (folder, f); body = rd(os.path.join(DIST, folder, f))
        assert off.count(tag) == 1 and '</script' not in body, f
        off = off.replace(tag, '<script>\n' + body + '\n</script>')
    for f in BG:
        ref = 'url(assets/bg/%s)' % f
        assert off.count(ref) == 1, ref
        off = off.replace(ref, 'url(data:image/webp;base64,' + b64(os.path.join(ROOT, 'assets', 'bg', f)) + ')')
    assert off.count('src="assets/nem/smile.webp"') == 1
    off = off.replace('src="assets/nem/smile.webp"', 'src="' + arts['smile'] + '"')
    os.makedirs(OFF, exist_ok=True)
    open(os.path.join(OFF, OFFNAME[lang]), 'w', encoding='utf-8').write(off)
offline('th', index, 'engine')
if EN_OK: offline('en', en_index, 'engine-en')
elif os.path.exists(os.path.join(OFF, OFFNAME['en'])): os.remove(os.path.join(OFF, OFFNAME['en']))

# ---------------------------------------------------------------- the page for GitHub Pages: no Gresland, and Firebase for sign-in and rooms
WEB = os.path.join(ROOT, 'dist-web')
shutil.rmtree(WEB, ignore_errors=True)
shutil.copytree(os.path.join(DIST, 'engine'), os.path.join(WEB, 'engine'))
open(os.path.join(WEB, 'engine', 'defaults.js'), 'w', encoding='utf-8').write(PLAIN_DEFAULTS)
if EN_OK:
    shutil.copytree(os.path.join(DIST, 'engine-en'), os.path.join(WEB, 'engine-en'))
    to_en('js', os.path.join(WEB, 'engine', 'defaults.js'), os.path.join(WEB, 'engine-en', 'defaults.js'))
shutil.copytree(os.path.join(DIST, 'assets'), os.path.join(WEB, 'assets'))
webhead = '<script>window.MME_BUILD = "web"; window.MME_NO_GRESLAND = true;</script>\n<script src="firebase-config.js"></script>\n'
# a browser keeps a script for a while after the page changes; the version in the address makes a new release fetch all of them at once
VER = re.search(r"MME\.VERSION = '([0-9.]+)'", rd(os.path.join(SRC, 'shell.js'))).group(1)
def webpage(idx, folder):
    first = '<script src="%s/gen.js"></script>' % folder
    assert idx.count(first) == 1
    w = idx.replace(first, webhead + first)
    for f in SCRIPTS:
        assert w.count('<script src="%s/%s"></script>' % (folder, f)) == 1, f
        w = w.replace('<script src="%s/%s"></script>' % (folder, f), '<script src="%s/%s?v=%s"></script>' % (folder, f, VER))
    return w.replace('<script src="firebase-config.js"></script>', '<script src="firebase-config.js?v=%s"></script>' % VER)
open(os.path.join(WEB, 'index.html'), 'w', encoding='utf-8').write(webpage(index, 'engine'))
if EN_OK: open(os.path.join(WEB, 'en.html'), 'w', encoding='utf-8').write(webpage(en_index, 'engine-en'))
for f in ['firebase-config.js', 'database.rules.json']:
    shutil.copy(os.path.join(SRC, 'web', f), os.path.join(WEB, f))
open(os.path.join(WEB, '.nojekyll'), 'w').write('')

if __name__ == '__main__':
    print('%9d  dist-offline/bazaar-worldmaker-offline.html' % os.path.getsize(os.path.join(OFF, 'bazaar-worldmaker-offline.html')))
    print('English build:', ('%d Thai phrases still without English' % EN_MISSING) if EN_OK else 'skipped (no node or no src/i18n/en.json)')
    for root, _, files in os.walk(DIST):
        for f in sorted(files):
            p = os.path.join(root, f); print('%9d  %s' % (os.path.getsize(p), os.path.relpath(p, DIST)))
