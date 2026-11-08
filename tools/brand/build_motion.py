"""Animated logo (SVG with CSS keyframes, plays once) + the HTML used to render the logo-reveal videos.
Run from the repository after build_logo.py: python3 tools/brand/build_motion.py, then node tools/brand/render_video.mjs."""
import os, re, tempfile
from pathlib import Path

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # the repository
A = os.path.join(ROOT, 'brand', 'assets')
FONTS = os.path.join(ROOT, 'assets', 'fonts')
STAGE = os.path.join(tempfile.gettempdir(), 'rawaj-motion-stage.html')  # filmed by render_video.mjs
F_AR600, F_AR500, F_LAT500 = (Path(FONTS, f'ibm-plex-sans-arabic-{n}-normal.woff2').as_uri() for n in ('arabic-600', 'arabic-500', 'latin-500'))
word = open(f'{A}/rawaj-wordmark-ar.svg').read()
d = re.search(r' d="([^"]+)"', word).group(1)
tr = re.search(r'transform="([^"]+)"', word).group(1)
vb = re.search(r'viewBox="0 0 ([\d.]+) ([\d.]+)"', word)
ww, wh = float(vb.group(1)), float(vb.group(2))

SWOOSH = 'M120 352 C 200 360 236 328 266 276 C 296 224 318 176 360 150'
MARK = f'''<rect class="tile" width="512" height="512" rx="120" fill="#121418"/>
<path class="curve" d="{SWOOSH}" pathLength="1" fill="none" stroke="#0E7C66" stroke-width="58" stroke-linecap="round"/>
<circle class="dot" cx="386" cy="138" r="42" fill="#E7A33E"/>'''

# Horizontal Arabic lockup that animates once: tile, curve, dot, then the word.
W = ww + 48 + 220
animated = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.0f} 300" width="{W:.0f}" height="300" role="img" aria-label="رواج">
<title>رواج</title>
<style>
.tile {{ transform-origin: 256px 256px; animation: tile .6s cubic-bezier(.2,.9,.3,1.25) both; }}
.curve {{ stroke-dasharray: 1; stroke-dashoffset: 1; animation: draw .8s .3s cubic-bezier(.6,0,.2,1) forwards; }}
.dot {{ transform-origin: 386px 138px; transform: scale(0); animation: dot .45s 1s cubic-bezier(.2,.9,.3,1.6) forwards; }}
.word {{ opacity: 0; transform: translateX(-24px); animation: word .7s 1.15s ease-out forwards; }}
@keyframes tile {{ from {{ transform: scale(.6); opacity: 0; }} to {{ transform: scale(1); opacity: 1; }} }}
@keyframes draw {{ to {{ stroke-dashoffset: 0; }} }}
@keyframes dot {{ to {{ transform: scale(1); }} }}
@keyframes word {{ to {{ opacity: 1; transform: none; }} }}
@media (prefers-reduced-motion: reduce) {{ .tile, .curve, .dot, .word {{ animation: none; opacity: 1; transform: none; stroke-dashoffset: 0; }} }}
</style>
<g class="word"><path transform="{tr}" d="{d}" fill="#121418"/></g>
<g transform="translate({W - 24 - 220:.1f} 40) scale({220 / 512:.5f})">{MARK}</g>
</svg>
'''
open(f'{A}/rawaj-logo-animated.svg', 'w').write(animated)

# Video stage: stacked lockup, driven frame by frame by window.frame(t) so every frame is exact.
stage = f'''<!doctype html><html><head><meta charset="utf-8"><style>
@font-face {{ font-family: Plex; font-weight: 600; src: url({F_AR600}); unicode-range: U+0600-06FF, U+FB50-FDFF, U+FE70-FEFF; }}
@font-face {{ font-family: Plex; font-weight: 500; src: url({F_AR500}); unicode-range: U+0600-06FF, U+FB50-FDFF, U+FE70-FEFF; }}
@font-face {{ font-family: Plex; font-weight: 500; src: url({F_LAT500}); unicode-range: U+0000-00FF, U+2000-206F; }}
html, body {{ margin: 0; }}
#stage {{ width: var(--w); height: var(--h); position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: calc(var(--u) * 0.5);
  background: radial-gradient(circle at 50% 38%, #ffffff 0, #FBFAF7 45%, #F2EEE4 100%); font-family: Plex, sans-serif; }}
#mark {{ width: calc(var(--u) * 3); height: calc(var(--u) * 3); }}
#word {{ height: calc(var(--u) * 1.9); }}
#tag {{ text-align: center; color: #121418; }}
#tag b {{ display: block; font-weight: 600; font-size: calc(var(--u) * 0.5); }}
#tag span {{ display: block; color: #5B5F6B; font-weight: 500; font-size: calc(var(--u) * 0.3); margin-top: calc(var(--u) * 0.12); letter-spacing: .02em; }}
</style></head><body><div id="stage">
<svg id="mark" viewBox="0 0 512 512">{MARK}</svg>
<svg id="word" viewBox="0 0 {ww:.0f} {wh:.0f}"><path transform="{tr}" d="{d}" fill="#121418"/></svg>
<div id="tag"><b dir="rtl">خلّي شغلك يروج</b><span>Rawaj · Make your business thrive</span></div>
</div><script>
const clamp = (x) => Math.max(0, Math.min(1, x));
const ease = (x) => 1 - Math.pow(1 - x, 3);
const back = (x) => {{ const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); }};
const seg = (t, a, b) => clamp((t - a) / (b - a));
window.frame = (t) => {{
  const tile = document.querySelector('#mark .tile'), curve = document.querySelector('#mark .curve'), dot = document.querySelector('#mark .dot');
  const k1 = seg(t, 0, .6); tile.style.transformOrigin = '256px 256px'; tile.style.transform = `scale(${{.6 + .4 * back(k1)}})`; tile.style.opacity = ease(k1);
  curve.style.strokeDasharray = 1; curve.style.strokeDashoffset = 1 - ease(seg(t, .3, 1.1));
  const k3 = seg(t, 1.0, 1.45); dot.style.transformOrigin = '386px 138px'; dot.style.transform = `scale(${{k3 ? back(k3) : 0}})`;
  const k4 = ease(seg(t, 1.15, 1.85)); const w = document.getElementById('word'); w.style.opacity = k4; w.style.transform = `translateY(${{(1 - k4) * 24}}px)`;
  const k5 = ease(seg(t, 1.9, 2.6)); const g = document.getElementById('tag'); g.style.opacity = k5; g.style.transform = `translateY(${{(1 - k5) * 16}}px)`;
  const pulse = t > 2.8 ? 1 + 0.02 * Math.sin((t - 2.8) * 3) : 1; document.getElementById('mark').style.transform = `scale(${{pulse}})`;
}};
window.frame(0);
</script></body></html>
'''
open(STAGE, 'w').write(stage)
print('ok', round(W), STAGE)
