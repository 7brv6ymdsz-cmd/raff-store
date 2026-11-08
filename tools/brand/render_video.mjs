// Renders the logo reveal frame by frame (30 fps) and muxes it with the reveal sound. No music.
// Run `python3 tools/brand/build_motion.py` first: it writes the stage page this script films.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { chromium } = createRequire(path.join(ROOT, 'package.json'))('playwright');
const STAGE = path.join(os.tmpdir(), 'rawaj-motion-stage.html');
if (!fs.existsSync(STAGE)) throw new Error('Run python3 tools/brand/build_motion.py first');
const FORMATS = [['square', 1080, 1080, 118], ['vertical', 1080, 1920, 170], ['landscape', 1920, 1080, 118]];
const FPS = 30, SECONDS = 4.5, OUT = path.join(ROOT, 'brand/motion');
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch();
for (const [name, w, h, u] of FORMATS) {
  const dir = path.join(os.tmpdir(), `rawaj-frames-${name}`);
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto(pathToFileURL(STAGE).href);
  await p.evaluate(([W, H, U]) => { const s = document.getElementById('stage').style; s.setProperty('--w', W + 'px'); s.setProperty('--h', H + 'px'); s.setProperty('--u', U + 'px'); }, [w, h, u]);
  await p.evaluate(() => document.fonts.ready);
  for (let i = 0; i < FPS * SECONDS; i++) {
    await p.evaluate((t) => window.frame(t), i / FPS);
    await p.screenshot({ path: `${dir}/${String(i).padStart(4, '0')}.png`, clip: { x: 0, y: 0, width: w, height: h } });
  }
  if (name === 'square') await p.screenshot({ path: `${OUT}/rawaj-reveal-poster.png`, clip: { x: 0, y: 0, width: w, height: h } });
  await p.close();
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', `${dir}/%04d.png`, '-i', path.join(ROOT, 'brand/sounds/reveal.mp3'),
    '-filter_complex', '[1:a]adelay=380|380,apad[a]', '-map', '0:v', '-map', '[a]', '-t', String(SECONDS),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '96k', `${OUT}/rawaj-reveal-${name}.mp4`]);
  console.log(name, fs.statSync(`${OUT}/rawaj-reveal-${name}.mp4`).size);
  fs.rmSync(dir, { recursive: true, force: true });
}
await b.close();
