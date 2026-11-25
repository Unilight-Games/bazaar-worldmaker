# Makes src/policy.js (the terms read from the menu) from the owner's policy document in Markdown.
import json, sys, markdown
src, out = sys.argv[1], sys.argv[2]
html = markdown.markdown(open(src, encoding='utf-8').read(), extensions=['tables'])
head = open(out, encoding='utf-8').read().split('(function', 1)[0]
open(out, 'w', encoding='utf-8').write(head + '(function () { const MME = window.MME = window.MME || {}; MME.POLICY_HTML = ' + json.dumps(html, ensure_ascii=False) + '; })();\n')
