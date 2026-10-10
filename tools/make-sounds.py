#!/usr/bin/env python3
"""Renders the recorded-style sound effects in sounds/ (numpy + ffmpeg):  python3 tools/make-sounds.py

- horn.mp3: a five-chime locomotive air horn (the D# 6th chord of a real "K5LA" horn): each bell a buzzing
  reed, scooping up into tune with a brassy blare, a breath of air, and the echo of the open countryside.
  Two blasts, short then long, like a train leaving the station.
- moo, baa, oink, cluck, neigh, quack .mp3: farm animals for ABC Train, made the way voices are made:
  a buzzing source shaped by moving mouth resonances (formants).
"""
import os, subprocess, tempfile
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'sounds')
SR = 44100
rng = np.random.default_rng(7)


def save(name, x, rate='96k'):
    x = x / max(1e-9, np.abs(x).max()) * 0.9
    import wave
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
        with wave.open(tmp.name, 'wb') as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
            w.writeframes((x * 32767).astype('<i2').tobytes())
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp.name, '-ac', '1', '-b:a', rate, os.path.join(OUT, name + '.mp3')], check=True)
    os.unlink(tmp.name)
    print('sounds/' + name + '.mp3', f'{len(x) / SR:.2f}s')


def eq(x, curve):
    """Shape the spectrum: curve(freqs) gives the gain at each frequency."""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    return np.fft.irfft(X * curve(f), len(x))


def bump(f, centre, width, gain):
    return 1 + (gain - 1) * np.exp(-((np.log(np.maximum(f, 1)) - np.log(centre)) / width) ** 2)


def outdoors(x, wet=0.28, tail=0.9):
    """Early echoes off buildings and hills, then a soft open-air tail."""
    y = x.copy()
    for d, g in [(0.041, 0.32), (0.067, 0.24), (0.109, 0.17), (0.173, 0.12), (0.26, 0.08)]:
        n = int(d * SR); y[n:] += g * x[:-n]
    t = np.arange(int(tail * SR)) / SR
    ir = rng.standard_normal(len(t)) * np.exp(-t / (tail / 4.5))
    ir = eq(ir, lambda f: 1 / (1 + (f / 3000) ** 2))
    n = len(y) + len(ir)
    wetsig = np.fft.irfft(np.fft.rfft(y, n) * np.fft.rfft(ir, n), n)[:len(y)]
    wetsig /= max(1e-9, np.abs(wetsig).max())
    return y / np.abs(y).max() + wet * wetsig


def horn_blast(dur, start_flat=0.06):
    n = int((dur + 0.05) * SR); t = np.arange(n) / SR
    chord = [311.13, 369.99, 415.30, 493.88, 622.25]
    out = np.zeros(n)
    for i, f0 in enumerate(chord):
        # scoop up into tune as the air arrives, then a slow little wander
        drift = np.cumsum(rng.standard_normal(n)) / SR * 0.6
        drift -= np.linspace(drift[0], drift[-1], n)
        f = f0 * (1 - start_flat * np.exp(-t / 0.045)) * (1 + 0.002 * drift) * (1 + 0.0012 * (i - 2))
        ph = 2 * np.pi * np.cumsum(f) / SR + rng.uniform(0, 6.28)
        duty = 0.32 + 0.03 * i
        k = np.arange(1, int(9000 / f0) + 1)
        amp = np.abs(np.sin(np.pi * k * duty)) / k ** 0.85        # a reed's buzzy pulse
        bell = np.zeros(n)
        for kk, a in zip(k, amp):
            bell += a * np.sin(kk * ph)
        bell = np.tanh(1.5 * bell / np.abs(bell).max()) / np.tanh(1.5)   # each bell's own brassy blare (on the sum it would buzz)
        out += bell * (0.9 + 0.2 * rng.random())
    env = (1 - np.exp(-t / 0.025)) * (1 + 0.35 * np.exp(-t / 0.09))    # the "BWAH" as the reeds catch
    rel = np.clip((dur - t) / 0.13, 0, 1) ** 1.6
    out *= env * rel
    air = eq(rng.standard_normal(n), lambda f: bump(f, 2500, 0.6, 1) * np.exp(-((np.log(np.maximum(f, 1)) - np.log(2200)) / 0.7) ** 2))
    out += 0.05 * air / np.abs(air).max() * env * rel
    # the bells: a strong middle, a brassy edge, not much rumble or fizz
    out = eq(out, lambda f: bump(f, 900, 0.5, 2.2) * bump(f, 2100, 0.35, 1.6) / (1 + (f / 5200) ** 4) / (1 + (220 / np.maximum(f, 1)) ** 4))
    return out


def horn():
    a, b = horn_blast(0.55), horn_blast(1.35)
    gap = np.zeros(int(0.16 * SR))
    x = np.concatenate([a, gap, b, np.zeros(int(1.0 * SR))])
    return outdoors(x, wet=0.3, tail=1.1)


def biquad_bp(x, fc, q):
    """A resonance (band-pass) whose centre can move: fc and q are arrays, one value per sample."""
    y = np.zeros_like(x); x1 = x2 = y1 = y2 = 0.0
    blk = 64
    for s in range(0, len(x), blk):
        w = 2 * np.pi * fc[s] / SR; al = np.sin(w) / (2 * q[s])
        b0, b2, a0, a1, a2 = al, -al, 1 + al, -2 * np.cos(w), 1 - al
        b0, b2, a1, a2 = b0 / a0, b2 / a0, a1 / a0, a2 / a0
        for i in range(s, min(s + blk, len(x))):
            v = b0 * x[i] + b2 * x2 - a1 * y1 - a2 * y2
            x2, x1, y2, y1 = x1, x[i], y1, v
            y[i] = v
    return y


def voice(dur, f0, formants, buzz=1.0, noise=0.0, tremolo=None, env=None):
    """f0(t) the pitch, formants: list of (freq(t), q, gain), tremolo(t) a wobble on the loudness."""
    n = int(dur * SR); t = np.arange(n) / SR
    f = f0(t)
    ph = 2 * np.pi * np.cumsum(f) / SR
    src = np.zeros(n)
    for k in range(1, 40):
        src += np.where(k * f < 8000, np.sin(k * ph) / k, 0)
    src = buzz * src + noise * rng.standard_normal(n)
    out = np.zeros(n)
    for ff, q, g in formants:
        out += g * biquad_bp(src, ff(t), np.full(n, q))
    if tremolo is not None:
        out *= tremolo(t)
    e = env(t) if env else np.clip(t / 0.04, 0, 1) * np.clip((dur - t) / 0.12, 0, 1)
    return out * e


def lerp(pts):
    xs, ys = zip(*pts)
    return lambda t: np.interp(t, xs, ys)


def moo():
    x = voice(1.5, lerp([(0, 105), (0.25, 128), (1.0, 118), (1.5, 92)]),
              [(lerp([(0, 260), (0.35, 520), (1.5, 450)]), 5, 1.0), (lerp([(0, 700), (0.35, 900), (1.5, 800)]), 6, 0.6), (lambda t: 0 * t + 2400, 8, 0.12)],
              env=lambda t: np.clip(t / 0.15, 0, 1) * np.clip((1.5 - t) / 0.35, 0, 1))
    return outdoors(eq(x, lambda f: 1 / (1 + (f / 3500) ** 2)), wet=0.18, tail=0.6)


def baa():
    x = voice(1.0, lerp([(0, 330), (0.15, 380), (1.0, 300)]),
              [(lambda t: 0 * t + 820, 6, 1.0), (lambda t: 0 * t + 1350, 7, 0.7), (lambda t: 0 * t + 2700, 9, 0.25)], noise=0.05,
              tremolo=lambda t: 1 - 0.55 * (0.5 + 0.5 * np.sin(2 * np.pi * 17 * t)))
    return outdoors(x, wet=0.15, tail=0.5)


def oink():
    parts = []
    for d, p in [(0.16, 150), (0.13, 175), (0.22, 135)]:
        g = voice(d, lerp([(0, p), (d, p * 0.8)]), [(lambda t: 0 * t + 620, 4, 1), (lambda t: 0 * t + 1500, 5, 0.6)], noise=0.6,
                  tremolo=lambda t: 0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 38 * t)))
        parts += [g, np.zeros(int(0.07 * SR))]
    return outdoors(np.concatenate(parts), wet=0.12, tail=0.4)


def cluck():
    parts = []
    for d, p in [(0.07, 600), (0.07, 650), (0.06, 620), (0.28, 700)]:
        parts += [voice(d, lerp([(0, p), (d, p * 1.15)]), [(lambda t: 0 * t + 1100, 5, 1), (lambda t: 0 * t + 2400, 6, 0.5)], noise=0.15), np.zeros(int(0.09 * SR))]
    return outdoors(np.concatenate(parts), wet=0.12, tail=0.4)


def neigh():
    d = 1.3
    x = voice(d, lerp([(0, 950), (0.25, 1050), (1.3, 420)]),
              [(lerp([(0, 900), (1.3, 700)]), 5, 1.0), (lerp([(0, 1900), (1.3, 1500)]), 6, 0.5)], noise=0.08,
              tremolo=lambda t: 1 - 0.6 * (0.5 + 0.5 * np.sin(2 * np.pi * (14 + 8 * t) * t)))
    snort = eq(rng.standard_normal(int(0.25 * SR)), lambda f: bump(f, 900, 0.5, 1) / (1 + (f / 1500) ** 2)) * np.linspace(1, 0, int(0.25 * SR)) ** 2 * 0.05
    return outdoors(np.concatenate([x, np.zeros(int(0.1 * SR)), snort]), wet=0.2, tail=0.6)


def quack():
    parts = []
    for d in [0.22, 0.26]:
        parts += [voice(d, lerp([(0, 260), (d, 220)]), [(lambda t: 0 * t + 1000, 4, 1), (lambda t: 0 * t + 2300, 4, 0.9), (lambda t: 0 * t + 3300, 6, 0.4)], noise=0.15,
                        env=lambda t, d=d: np.clip(t / 0.01, 0, 1) * np.clip((d - t) / 0.08, 0, 1)), np.zeros(int(0.12 * SR))]
    return outdoors(np.concatenate(parts), wet=0.12, tail=0.4)


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    save('horn', horn(), '128k')
    for name, fn in [('moo', moo), ('baa', baa), ('oink', oink), ('cluck', cluck), ('neigh', neigh), ('quack', quack)]:
        save(name, fn())
