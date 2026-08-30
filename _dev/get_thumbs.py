"""Pull her live case-study thumbnail components out of a bundled page.
   Run:  /usr/bin/python3 _dev/get_thumbs.py     (writes assets/thumbs.js)"""
import re, json, base64, gzip, zlib, os, urllib.request

PAGE = 'https://seyeonchoi.work/LS%20Case%2001%20Trust.dc.html'
OUT  = os.path.join(os.path.dirname(__file__), '..', 'assets', 'thumbs.js')

page = urllib.request.urlopen(PAGE).read().decode('utf-8', 'replace')
man  = json.loads(re.search(r'<script type="__bundler/manifest"[^>]*>\s*(.*?)\s*</script>', page, re.S).group(1))

def js(entry):
    raw = base64.b64decode(entry['data'])
    if entry.get('compressed'):
        try: raw = gzip.decompress(raw)
        except Exception: raw = zlib.decompress(raw)
    return raw.decode('utf-8', 'replace')

live = thumbs = None
for v in man.values():
    if 'javascript' not in v['mime']: continue
    t = js(v)
    if "customElements.define('live-frame'" in t or 'customElements.get(\'live-frame\')' in t: live = t
    if 'thumb-autoview' in t and 'def(' in t: thumbs = t
assert live and thumbs, 'components not found in this page bundle'

thumbs = thumbs.replace("'./", "'https://seyeonchoi.work/")     # her paths are site-relative
thumbs = re.sub(r'\s*<div class="hint">[^<]*</div>', '', thumbs)   # no "clickable mockup" badge here
thumbs = re.sub(r'\s*\.hint[^{]*\{[^}]*\}', '', thumbs)
open(OUT, 'w').write(
    "/* Her own case-study thumbnails, lifted from seyeonchoi.work: a branded stage with\n"
    "   the REAL app running inside via <live-frame>. Only the app URLs were made absolute.\n"
    "   Regenerate with _dev/get_thumbs.py if she ships new ones. */\n\n"
    + live.rstrip() + "\n\n" + thumbs.rstrip() + "\n")
print('wrote', OUT)
