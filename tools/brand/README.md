# Rawaj brand tools

These scripts generate everything under `brand/` and the site icons. Run them from the repository root, in this order:

| Step | Command | Writes |
|---|---|---|
| 1. Logos (text drawn as outlines) | `python3 tools/brand/build_logo.py` | `brand/assets/*.svg` |
| 2. PNG exports | `node tools/brand/export_png.mjs` | `brand/assets/*.png` (app icons, logos) |
| 3. Interface sounds | `python3 tools/brand/build_sounds.py` | `brand/sounds/*.mp3` |
| 4. Animated logo and video stage | `python3 tools/brand/build_motion.py` | `brand/assets/rawaj-logo-animated.svg`, plus the stage page in the temp folder |
| 5. Logo reveal videos | `node tools/brand/render_video.mjs` | `brand/motion/*.mp4` and the poster (takes a few minutes) |
| 6. Download kit | `bash tools/brand/build_kit.sh` | `brand/rawaj-brand-kit.zip` |

You need:
- `pip install uharfbuzz fonttools brotli numpy`
- ffmpeg
- `npm ci`, for Playwright with Chromium

The scripts are deterministic: running them again without changes reproduces the same files.

The owner's rules:
- No music, no instruments and no bells in any sound or video.
- Keep sounds short and quiet.

`colours-ar.txt` holds the colours and logo-use notes. It ships in the kit as `الألوان.txt`.

Two files are not scripted:
- `favicon.svg`: a copy of `brand/assets/rawaj-mark.svg`.
- `og.png`: a late frame of the landscape reveal, at 1200×630.
