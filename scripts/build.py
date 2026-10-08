#!/usr/bin/env python3
"""Assemble ONE self-contained HTML film: fonts (base64) + engine.js + scene.js.

usage: python build.py scene.js out.html [--font Family=path_or_gf] ...

Fonts default to Geist + Archivo (variable, wdth 62-125) fetched from github.com/google/fonts
(raw.githubusercontent.com is reachable from the Claude sandbox; fonts.google.com is not).
A --font value may be a local .ttf/.otf/.woff2 path or 'gf:ofl/<dir>/<file>.ttf'.
"""
import base64, os, re, sys, urllib.request, pathlib

HERE = pathlib.Path(__file__).resolve().parent
CACHE = pathlib.Path.home() / '.cache' / 'motion-film' / 'fonts'
GF = 'https://raw.githubusercontent.com/google/fonts/main/'
DEFAULT = {
    'Geist': 'gf:ofl/geist/Geist%5Bwght%5D.ttf',
    'Archivo': 'gf:ofl/archivo/Archivo%5Bwdth,wght%5D.ttf',
}

def fetch(spec):
    if not spec.startswith('gf:'):
        return pathlib.Path(spec).read_bytes()
    CACHE.mkdir(parents=True, exist_ok=True)
    name = re.sub(r'[^A-Za-z0-9._-]', '_', spec[3:])
    p = CACHE / name
    if not p.exists():
        urllib.request.urlretrieve(GF + spec[3:], p)
    return p.read_bytes()

def face(family, data, spec):
    fmt = 'woff2' if spec.endswith('woff2') else ('opentype' if spec.endswith('otf') else 'truetype')
    mime = {'woff2': 'font/woff2', 'opentype': 'font/otf', 'truetype': 'font/ttf'}[fmt]
    stretch = 'font-stretch:62% 125%;' if 'wdth' in spec else ''
    b64 = base64.b64encode(data).decode()
    return (f"@font-face{{font-family:'{family}';src:url(data:{mime};base64,{b64}) format('{fmt}');"
            f"font-weight:100 900;{stretch}font-display:block;}}")

def main():
    a = sys.argv[1:]
    if len(a) < 1:
        print(__doc__); sys.exit(1)
    scene = a[0]
    out = None
    fonts = dict(DEFAULT)
    i = 1
    while i < len(a):
        if a[i] == '--out' and i + 1 < len(a):
            out = a[i + 1]; i += 2
        elif a[i] == '--font' and i + 1 < len(a):
            k, v = a[i + 1].split('=', 1); fonts[k] = v; i += 2
        elif not a[i].startswith('--') and out is None:
            out = a[i]; i += 1
        else:
            i += 1
    if not out:
        out = str(pathlib.Path(scene).with_suffix('.html'))

    faces = '\n'.join(face(k, fetch(v), v) for k, v in fonts.items())
    engine = (HERE / 'engine.js').read_text(encoding='utf-8')
    sc = pathlib.Path(scene).read_text(encoding='utf-8')
    html = f"""<!doctype html><html><head><meta charset="utf-8"><title>{pathlib.Path(scene).stem}</title>
<style>
{faces}
html,body{{margin:0;height:100%;background:#111;display:flex;align-items:center;justify-content:center}}
canvas{{width:min(100vw,100vh);height:min(100vw,100vh)}}
</style></head><body><canvas id="c" width="1440" height="1440"></canvas>
<script>
{engine}
</script>
<script>
{sc}
</script></body></html>"""
    pathlib.Path(out).write_text(html, encoding='utf-8')
    print(f'built {out} ({len(html)//1024} KB, fonts: {", ".join(fonts)})')

if __name__ == '__main__':
    main()
