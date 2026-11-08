"""Rawaj (رواج) logo system: the mark, the Arabic and Latin wordmarks as outlines, lockups and colour variants.
Text is shaped with HarfBuzz and drawn from IBM Plex Sans Arabic (SIL Open Font License) so the SVGs need no font.
Run from the repository: python3 tools/brand/build_logo.py  (needs: pip install uharfbuzz fonttools brotli)."""
import io, os
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
import uharfbuzz as hb

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # the repository
FONTS = os.path.join(ROOT, 'assets', 'fonts')
OUT = os.path.join(ROOT, 'brand', 'assets')
os.makedirs(OUT, exist_ok=True)

C = dict(ink='#121418', emerald='#0E7C66', deep='#0B5E4E', mint='#E6F3EF', saffron='#E7A33E', sand='#FBFAF7', slate='#5B5F6B', white='#FFFFFF')

def load(name):
    f = TTFont(os.path.join(FONTS, name))
    f.flavor = None
    buf = io.BytesIO(); f.save(buf)
    return f, buf.getvalue()

def text_path(txt, fontfile, size, rtl):
    """Shapes txt and returns (svg path d, width, ascent, descent) at font size `size` (px), baseline at y=0."""
    tt, data = load(fontfile)
    face = hb.Face(data); font = hb.Font(face)
    upem = face.upem; font.scale = (upem, upem)
    buf = hb.Buffer(); buf.add_str(txt); buf.guess_segment_properties()
    if rtl: buf.direction = 'rtl'
    hb.shape(font, buf, {'kern': True, 'liga': True})
    order = tt.getGlyphOrder(); gs = tt.getGlyphSet()
    k = size / upem
    pen = SVGPathPen(gs)
    x = 0
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        name = order[info.codepoint]
        # font units are y-up: flip into SVG space, scaled
        tp = TransformPen(pen, (k, 0, 0, -k, (x + pos.x_offset) * k, -pos.y_offset * k))
        gs[name].draw(tp)
        x += pos.x_advance
    hhea = tt['hhea']
    return pen.getCommands(), x * k, hhea.ascent * k, -hhea.descent * k

def mark(size=512, tile=C['ink'], stroke=C['emerald'], dot=C['saffron'], rx=120):
    """The rising curve (demand going up) ending in the saffron dot, on a rounded tile. Drawn on a 512 grid."""
    s = size / 512
    return f'''<g transform="scale({s:.5f})"><rect width="512" height="512" rx="{rx}" fill="{tile}"/>
  <path d="M120 352 C 200 360 236 328 266 276 C 296 224 318 176 360 150" fill="none" stroke="{stroke}" stroke-width="58" stroke-linecap="round"/>
  <circle cx="386" cy="138" r="42" fill="{dot}"/></g>'''

def svg(w, h, body, title):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} {h:.0f}" width="{w:.0f}" height="{h:.0f}" role="img" aria-label="{title}"><title>{title}</title>{body}</svg>\n'

def write(name, content):
    open(os.path.join(OUT, name), 'w').write(content)

# --- marks
write('rawaj-mark.svg', svg(512, 512, mark(), 'رواج'))
write('rawaj-mark-emerald.svg', svg(512, 512, mark(tile=C['emerald'], stroke=C['white']), 'رواج'))
write('rawaj-mark-sand.svg', svg(512, 512, mark(tile=C['sand'], stroke=C['emerald']), 'رواج'))
# maskable app icon: content inside the 80% safe zone
write('rawaj-maskable.svg', svg(512, 512, f'<rect width="512" height="512" fill="{C["ink"]}"/><g transform="translate(76.8 76.8) scale(0.7)">{mark(tile=C["ink"])}</g>', 'رواج'))

# --- wordmarks
ar_d, ar_w, ar_asc, ar_desc = text_path('رواج', 'ibm-plex-sans-arabic-arabic-600-normal.woff2', 200, True)
en_d, en_w, en_asc, en_desc = text_path('Rawaj', 'ibm-plex-sans-arabic-latin-600-normal.woff2', 200, False)

def ar_word(color, x, base):
    return f'<path transform="translate({x:.1f} {base:.1f})" d="{ar_d}" fill="{color}"/>'
def en_word(color, x, base):
    return f'<path transform="translate({x:.1f} {base:.1f})" d="{en_d}" fill="{color}"/>'

# The Arabic outlines' real top/bottom (the jeem's tail goes below the baseline), measured from the shaping run.
pad = 24
H = 300                    # lockup height; the mark is 220 tall and centred
m = 220 / 512
base = 196                 # Arabic baseline inside the 300 band
for variant, ink, tile, stroke in (('', C['ink'], C['ink'], C['emerald']), ('-white', C['white'], C['emerald'], C['white'])):
    # Arabic lockup: mark on the right (start of an RTL line), word to its left
    W = pad + ar_w + 48 + 220 + pad
    body = ar_word(ink, pad, base) + f'<g transform="translate({W - pad - 220:.1f} 40) scale({m:.5f})">{mark(tile=tile, stroke=stroke)}</g>'
    write(f'rawaj-logo-ar{variant}.svg', svg(W, H, body, 'رواج'))
    # Latin lockup: mark on the left
    W2 = pad + 220 + 44 + en_w + pad
    body = f'<g transform="translate({pad} 40) scale({m:.5f})">{mark(tile=tile, stroke=stroke)}</g>' + en_word(ink, pad + 220 + 44, 214)
    write(f'rawaj-logo-en{variant}.svg', svg(W2, H, body, 'Rawaj'))
    # wordmark only
    write(f'rawaj-wordmark-ar{variant}.svg', svg(ar_w + 2 * pad, 300, ar_word(ink, pad, base), 'رواج'))

print('arabic word', round(ar_w), 'latin word', round(en_w))
print(sorted(os.listdir(OUT)))
