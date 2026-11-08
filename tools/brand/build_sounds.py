"""Rawaj interface sounds, synthesised from noise and simple tones: no music, no instruments, no bells.
Every sound is short (<= 0.7 s) and quiet (peak -14 dBFS). Output: MP3s in brand/sounds (the WAV masters go to the temp folder).
Run from the repository: python3 tools/brand/build_sounds.py  (needs numpy and ffmpeg)."""
import os, subprocess, tempfile, wave
import numpy as np

SR = 44100
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # the repository
OUT = os.path.join(ROOT, 'brand', 'sounds')
MASTER = os.path.join(tempfile.gettempdir(), 'rawaj-sounds-wav')  # lossless masters, not kept in the repo
os.makedirs(OUT, exist_ok=True); os.makedirs(MASTER, exist_ok=True)
rng = np.random.default_rng(7)

def t(sec):
    return np.arange(int(SR * sec)) / SR

def env(n, attack=0.004, decay=0.08):
    x = np.arange(n) / SR
    a = np.clip(x / attack, 0, 1)
    return a * np.exp(-x / decay)

def lowpass(x, cutoff):
    # one-pole low-pass, enough for softening noise
    a = np.exp(-2 * np.pi * cutoff / SR); y = np.zeros_like(x); prev = 0.0
    for i, v in enumerate(x):
        prev = (1 - a) * v + a * prev; y[i] = prev
    return y

def bandsweep(n, f0, f1):
    """Noise passed through a moving low-pass: the 'air' of a whoosh."""
    noise = rng.standard_normal(n)
    out = np.zeros(n); prev = 0.0
    cut = np.geomspace(f0, f1, n)
    for i in range(n):
        a = np.exp(-2 * np.pi * cut[i] / SR)
        prev = (1 - a) * noise[i] + a * prev; out[i] = prev
    return out

def norm(x, peak_db=-14):
    x = x - np.mean(x)
    fade = min(len(x), int(0.004 * SR))
    x[-fade:] *= np.linspace(1, 0, fade)
    return x / (np.max(np.abs(x)) + 1e-9) * (10 ** (peak_db / 20))

def tap():
    n = int(0.05 * SR)
    click = lowpass(rng.standard_normal(n), 3500) * env(n, 0.0008, 0.008)
    body = np.sin(2 * np.pi * 1400 * t(0.05)) * env(n, 0.001, 0.01) * 0.35
    return norm(click + body, -16)

def pop():
    d = 0.12; n = int(d * SR); x = t(d)
    f = 520 + 700 * (1 - np.exp(-x / 0.02))            # quick upward bend, like a bubble
    phase = 2 * np.pi * np.cumsum(f) / SR
    return norm(np.sin(phase) * env(n, 0.002, 0.03), -15)

def whoosh(d=0.6):
    n = int(d * SR); x = np.arange(n) / n
    shape = np.sin(np.pi * x) ** 2                      # swell and fade
    return norm(bandsweep(n, 400, 5000) * shape, -16)

def success():
    a = whoosh(0.28)
    b = pop()
    out = np.zeros(int(0.42 * SR)); out[:len(a)] += a * 0.8
    s = int(0.2 * SR); out[s:s + len(b)] += b
    return norm(out, -14)

def notify():
    a = tap(); out = np.zeros(int(0.22 * SR))
    out[:len(a)] += a; s = int(0.11 * SR); out[s:s + len(a)] += a * 0.8
    return norm(out, -15)

def error():
    d = 0.18; n = int(d * SR)
    thud = np.sin(2 * np.pi * 140 * t(d)) * env(n, 0.003, 0.05)
    grit = lowpass(rng.standard_normal(n), 900) * env(n, 0.002, 0.03) * 0.6
    return norm(thud + grit, -15)

def reveal():
    """For the logo animation: a swell of air (the curve rising) and a pop (the dot)."""
    w = whoosh(0.7); p = pop(); out = np.zeros(int(1.0 * SR))
    out[:len(w)] += w; s = int(0.62 * SR); out[s:s + len(p)] += p * 1.1
    return norm(out, -14)

def save(name, x):
    pcm = (np.clip(x, -1, 1) * 32767).astype('<i2')
    wav = os.path.join(MASTER, f'{name}.wav')
    with wave.open(wav, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    mp3 = os.path.join(OUT, f'{name}.mp3')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-codec:a', 'libmp3lame', '-b:a', '64k', mp3], check=True)
    peak = 20 * np.log10(np.max(np.abs(x)) + 1e-9)
    print(f'{name}: {len(x) / SR:.2f}s peak {peak:.1f} dBFS, mp3 {os.path.getsize(mp3)} bytes')

for name, fn in (('tap', tap), ('pop', pop), ('success', success), ('notify', notify), ('error', error), ('whoosh', whoosh), ('reveal', reveal)):
    save(name, fn())
