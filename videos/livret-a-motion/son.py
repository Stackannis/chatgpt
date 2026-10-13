"""Bande-son du Livret A, édition motion design : électro 120 BPM + bruitages synthétisés, calés sur rendu/sons.json. Écrit rendu/mix.wav"""
import json, subprocess, wave, pathlib
import numpy as np
ICI = pathlib.Path(__file__).parent; OUT = ICI / "rendu"; SR = 44100; BT = .5
info = json.loads((OUT / "sons.json").read_text(encoding="utf-8")); D = info["dur"]; N = int((D + 1.5) * SR); rng = np.random.default_rng(1)
def t_(d): return np.arange(int(d * SR)) / SR
def bruit(d): return rng.standard_normal(int(d * SR))
def lis(x, s):
    k = max(1, int(s * SR)); c = np.cumsum(np.insert(x, 0, 0)); y = (c[k:] - c[:-k]) / k
    return np.pad(y, (k // 2, k - 1 - k // 2), mode="edge")
def pose(p, t0, a, v=1.):
    i = int(max(0, t0) * SR); j = min(len(p), i + len(a))
    if j > i: p[i:j] += v * a[:j - i]
hz = lambda n: 440 * 2 ** ((n - 69) / 12)
def ad(*a):
    n = max(len(x) for x in a); return sum(np.pad(x, (0, n - len(x))) for x in a)
def saw(f, t): return 2 * ((f * t) % 1) - 1
# ---------- bruitages ----------
def tinte(f, d=.8, v=.4): t = t_(d); return v * sum(a * np.sin(2 * np.pi * f * m * t) for m, a in [(1, 1), (1.51, .45), (2.37, .25)]) * np.exp(-t * 7)
def boom(d=1.6): t = t_(d); return np.sin(2 * np.pi * (36 * t + 60 * (1 - np.exp(-t * 6)) / 6)) * np.exp(-t * 2.3) + .35 * lis(bruit(d), 1 / 600) * np.exp(-t * 5)
def whoosh(d=.45): t = t_(d); b = bruit(d); return .5 * (lis(b, 1 / 3000) - lis(b, 1 / 250)) * (t / d) ** 2.5
def pop(): t = t_(.12); return .5 * np.sin(2 * np.pi * np.cumsum(320 + 1600 * t / .12) / SR) * np.exp(-t * 35)
def tic(): t = t_(.03); return .35 * np.sin(2 * np.pi * 2600 * t) * np.exp(-t * 180)
def glitch(d=.35): t = t_(d); return .35 * np.sign(np.sin(2 * np.pi * 80 * t * (1 + 4 * (t * 17 % 1)))) * (np.floor(t * 30) % 2) * np.exp(-t * 4)
S = {
 'impact': lambda: ad(boom(1.2) * .8, np.pad(.5 * (bruit(.2) - lis(bruit(.2), 1 / 3000)) * np.exp(-t_(.2) * 25), (0, int(1.2 * SR) - int(.2 * SR)))),
 'boom': lambda: boom(2.2), 'whoosh': lambda: whoosh(), 'pop': pop, 'tic': tic, 'glitch': glitch,
 'piece': lambda: ad(tinte(2300, .6, .35), tinte(3400, .4, .15)),
 'mot': lambda: .3 * np.sin(2 * np.pi * np.cumsum(900 + 600 * t_(.08) / .08) / SR) * np.exp(-t_(.08) * 30),
 'monte': lambda: (lambda t: .3 * (bruit(2) - lis(bruit(2), 1 / 2500)) * (t / 2) ** 3 + .2 * np.sin(2 * np.pi * np.cumsum(200 + 900 * (t / 2) ** 2) / SR) * (t / 2) ** 2)(t_(2)),
 'gel': lambda: (lambda t: .45 * np.sin(2 * np.pi * np.cumsum(1400 * np.exp(-t * 3) + 60) / SR) * np.exp(-t * 1.5) + .2 * lis(bruit(1.5), 1 / 5000) * np.exp(-t * 2))(t_(1.5)) + tinte(3100, 1.5, .25)[:int(1.5 * SR)],
 'chute': lambda: (lambda t: .35 * np.sin(2 * np.pi * np.cumsum(900 - 780 * t / 1.4) / SR) * (1 - t / 1.4))(t_(1.4)),
 'iris': lambda: ad(whoosh(.6), np.pad(boom(1.0) * .5, (int(.3 * SR), 0))),
 'morph': lambda: (lambda t: .25 * (bruit(1.1) - lis(bruit(1.1), 1 / 4000)) * np.sin(np.pi * t / 1.1) ** 2 + .15 * np.sin(2 * np.pi * np.cumsum(300 + 1200 * t / 1.1) / SR) * np.sin(np.pi * t / 1.1))(t_(1.1)),
 'caisse': lambda: np.concatenate([tinte(1320, .12, .5), tinte(1760, 1.2, .5)]),
 'flip': lambda: .4 * (bruit(.07) - lis(bruit(.07), 1 / 2000)) * np.exp(-t_(.07) * 50),
 'cascade': lambda: ad(*[np.pad(tic(), (int(i * .03 * SR), 0)) for i in range(31)]),
 'flux': lambda: (lambda t: .2 * (lis(bruit(2), 1 / 1200) - lis(bruit(2), 1 / 150)) * np.sin(np.pi * t / 2))(t_(2)),
 'batir': lambda: (lambda t: .5 * np.sin(2 * np.pi * (70 + 50 * np.exp(-t * 20)) * t) * np.exp(-t * 6) + .15 * lis(bruit(.6), 1 / 800) * np.exp(-t * 9))(t_(.6)),
 'buzz': lambda: .25 * np.sign(np.sin(2 * np.pi * 110 * t_(.35))) * np.exp(-t_(.35) * 3),
 'ding': lambda: tinte(1320, 1.2, .5), 'clic': lambda: .5 * bruit(.04) * np.exp(-t_(.04) * 120),
 'marteau': lambda: ad(boom(1.4), .6 * (bruit(.1) - lis(bruit(.1), 1 / 2000)) * np.exp(-t_(.1) * 40)),
 'gonfle': lambda: (lambda t: .3 * np.sin(2 * np.pi * np.cumsum(180 + 500 * (t / 2.2) ** 1.5) / SR) * (.3 + .7 * t / 2.2) + .1 * lis(bruit(2.2), 1 / 1500) * t / 2.2)(t_(2.2)),
 'fond': lambda: (lambda t: .35 * np.sin(2 * np.pi * np.cumsum(500 - 400 * t / 2) / SR) * (1 - t / 2))(t_(2)),
 'trace': lambda: (lambda t: .15 * (bruit(1.5) - lis(bruit(1.5), 1 / 2500)) * (.5 + .5 * np.sin(2 * np.pi * 14 * t)) * np.exp(-t))(t_(1.5)),
 'crash': lambda: ad(boom(2.5) * 1.2, glitch(.6)),
 'tampon': lambda: ad(boom(1.0), .5 * lis(bruit(.3), 1 / 1500) * np.exp(-t_(.3) * 15)),
 'remplit': lambda: ad(*[np.pad(tinte(1800 + 300 * (i % 5), .3, .15), (int(i * .12 * SR), 0)) for i in range(26)]),
 'boing': lambda: (lambda t: .4 * np.sin(2 * np.pi * np.cumsum(200 + 400 * np.sqrt(t / .5)) / SR) * np.exp(-t * 6) * (1 + .3 * np.sin(2 * np.pi * 14 * t)))(t_(.5)),
}
# ---------- musique : 120 BPM, énergie par passage ----------
# zones calmes (secondes absolues) : l'image se fige ou respire
CALMES = [(0, 12), (5, 12), (100.5, 106.5), (236, 999)]
def plein(t0): return not any(a <= t0 < b for a, b in CALMES)
ACC = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]
def kick(): t = t_(.4); return np.sin(2 * np.pi * (45 * t + 140 * (1 - np.exp(-t * 28)) / 28)) * np.exp(-t * 7)
def clap(): t = t_(.25); b = bruit(.25); return .7 * (b - lis(b, 1 / 2500)) * np.exp(-t * 22)
def hat(o=False): d = .16 if o else .04; t = t_(d); b = bruit(d); return .22 * (b - lis(b, 1 / 7000)) * np.exp(-t * (18 if o else 110))
dr, bs, pd = np.zeros(N), np.zeros(N), np.zeros(N)
for k in range(int(D / 2) + 1):
    t0 = k * 2; a = ACC[k % 4]; t = t_(2.1); e = np.minimum(1, t / .05) * np.exp(-np.maximum(0, t - 2) * 30)
    pose(pd, t0, lis(sum(saw(hz(n) * (1 + d), t) for n in a for d in (-.004, .004)) / 6, 1 / 1800) * e * .5)
    for s in range(8):
        n = a[[0, 1, 2, 1][s % 4]] + 24; tt = t_(.3); pose(pd, t0 + s * .25, .09 * np.sin(2 * np.pi * hz(n) * tt) * np.exp(-tt * 14))
for b in range(int(D / BT)):
    t0 = b * BT
    if plein(t0) and t0 < D - 1:
        pose(dr, t0, kick(), .9)
        if b % 2: pose(dr, t0, clap(), .5)
        for s in range(4): pose(dr, t0 + s * BT / 4, hat(s == 2), .45 if s % 2 else .28)
        n = ACC[int(t0 // 2) % 4][0] - 24
        for s in range(2): tt = t_(BT / 2); pose(bs, t0 + s * BT / 2, lis(saw(hz(n + 12 * s), tt), 1 / 700) * np.exp(-tt * 6) * .5)
    elif t0 < D - 1:
        pose(dr, t0 + BT / 2, hat(), .15)
sc = np.ones(N)
for b in range(int(D / BT)):
    if plein(b * BT): pose(sc, b * BT, -.55 * np.exp(-t_(BT) * 9))
mus = (bs + pd * .55) * np.clip(sc, .3, 1)
fx = np.zeros(N)
for nom, f in S.items(): f()
for s in info["sons"]: pose(fx, s["t"], S.get(s["nom"], pop)(), s.get("v", 1) * .75)

mix = dr * .8 + mus + fx
f = np.minimum(1, np.arange(N) / (.3 * SR)) * np.clip((N - np.arange(N)) / (2 * SR), 0, 1); mix *= f
mix /= np.abs(mix).max() / .95
st = np.stack([mix, np.roll(mix, int(.011 * SR)) * .97 + mix * .03], 1)
tmp = OUT / "mix_brut.wav"
with wave.open(str(tmp), "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st * 32767).astype(np.int16).tobytes())
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(tmp), "-af", "acompressor=threshold=-14dB:ratio=3:attack=10:release=120,loudnorm=I=-14:TP=-1", "-ar", str(SR), str(OUT / "mix.wav")], check=True)
print("son ok")
