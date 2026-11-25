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
os.makedirs(os.path.join(DIST, 'assets', 'bg'), exist_ok=True)     # the paintings behind the menu (the owner's own, from his asset folder)
BG = sorted(os.listdir(os.path.join(ROOT, 'assets', 'bg')))
for f in BG:
    shutil.copy(os.path.join(ROOT, 'assets', 'bg', f), os.path.join(DIST, 'assets', 'bg', f))

SCRIPTS = ['gen.js', 'store.js', 'backup.js', 'net.js', 'fire.js', 'defaults.js', 'runtime.js', 'shell.js', 'hub.js', 'policy.js', 'tutor-lines.js', 'tutor.js']
index = """<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Bazaar Worldmaker</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;700&family=Noto+Serif+Thai:wght@500;700&display=swap" rel="stylesheet">
<style>
""" + rd(os.path.join(SRC, 'map.css')) + "\n" + rd(os.path.join(SRC, 'shell.css')) + """</style>
</head>
<body>
""" + rd(os.path.join(SRC, 'menu.html')) + """<template id="tpl-map">
""" + rd(os.path.join(SRC, 'map.html')) + """
</template>
""" + ''.join('<script src="engine/%s"></script>\n' % f for f in SCRIPTS) + """</body>
</html>
"""
wr('index.html', index)

# ---------------------------------------------------------------- one file that runs from disk, with no server and no network
def b64(path): return base64.b64encode(open(path, 'rb').read()).decode()
off = index
arts = {f[:-5]: 'data:image/webp;base64,' + b64(os.path.join(ROOT, 'assets', 'nem', f)) for f in sorted(os.listdir(os.path.join(ROOT, 'assets', 'nem')))}
head = ('<script>window.MME_OFFLINE = true; window.MME_ASSETS = ' + json.dumps(arts) + '; window.MME_EDITS = '
        + rd(os.path.join(SRC, 'maps', 'gresland-edits.json')) + ';</script>\n<script>\n' + rd(os.path.join(SRC, 'maps', 'gresland-base.js')) + '\n</script>\n') if GRES else (
        '<script>window.MME_OFFLINE = true; window.MME_NO_GRESLAND = true; window.MME_ASSETS = ' + json.dumps(arts) + ';</script>\n')
assert off.count('<script src="engine/gen.js"></script>') == 1
off = off.replace('<script src="engine/gen.js"></script>', head + '<script src="engine/gen.js"></script>')
for f in SCRIPTS:
    tag = '<script src="engine/%s"></script>' % f; body = rd(os.path.join(DIST, 'engine', f))
    assert off.count(tag) == 1 and '</script' not in body, f
    off = off.replace(tag, '<script>\n' + body + '\n</script>')
for f in BG:
    ref = 'url(assets/bg/%s)' % f
    assert off.count(ref) == 1, ref
    off = off.replace(ref, 'url(data:image/webp;base64,' + b64(os.path.join(ROOT, 'assets', 'bg', f)) + ')')
assert off.count('src="assets/nem/smile.webp"') == 1
off = off.replace('src="assets/nem/smile.webp"', 'src="' + arts['smile'] + '"')
os.makedirs(OFF, exist_ok=True)
open(os.path.join(OFF, 'bazaar-worldmaker-offline.html'), 'w', encoding='utf-8').write(off)

# ---------------------------------------------------------------- the page for GitHub Pages: no Gresland, and Firebase for sign-in and rooms
WEB = os.path.join(ROOT, 'dist-web')
shutil.rmtree(WEB, ignore_errors=True)
shutil.copytree(os.path.join(DIST, 'engine'), os.path.join(WEB, 'engine'))
open(os.path.join(WEB, 'engine', 'defaults.js'), 'w', encoding='utf-8').write(PLAIN_DEFAULTS)
shutil.copytree(os.path.join(DIST, 'assets'), os.path.join(WEB, 'assets'))
webhead = '<script>window.MME_BUILD = "web"; window.MME_NO_GRESLAND = true;</script>\n<script src="firebase-config.js"></script>\n'
assert index.count('<script src="engine/gen.js"></script>') == 1
# a browser keeps a script for a while after the page changes; the version in the address makes a new release fetch all of them at once
VER = re.search(r"MME\.VERSION = '([0-9.]+)'", rd(os.path.join(SRC, 'shell.js'))).group(1)
webindex = index.replace('<script src="engine/gen.js"></script>', webhead + '<script src="engine/gen.js"></script>')
for f in SCRIPTS:
    assert webindex.count('<script src="engine/%s"></script>' % f) == 1, f
    webindex = webindex.replace('<script src="engine/%s"></script>' % f, '<script src="engine/%s?v=%s"></script>' % (f, VER))
webindex = webindex.replace('<script src="firebase-config.js"></script>', '<script src="firebase-config.js?v=%s"></script>' % VER)
open(os.path.join(WEB, 'index.html'), 'w', encoding='utf-8').write(webindex)
for f in ['firebase-config.js', 'database.rules.json']:
    shutil.copy(os.path.join(SRC, 'web', f), os.path.join(WEB, f))
open(os.path.join(WEB, '.nojekyll'), 'w').write('')

if __name__ == '__main__':
    print('%9d  dist-offline/bazaar-worldmaker-offline.html' % os.path.getsize(os.path.join(OFF, 'bazaar-worldmaker-offline.html')))
    for root, _, files in os.walk(DIST):
        for f in sorted(files):
            p = os.path.join(root, f); print('%9d  %s' % (os.path.getsize(p), os.path.relpath(p, DIST)))
