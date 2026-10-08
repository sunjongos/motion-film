#!/usr/bin/env python3
"""Soundtrack assembly.

  python audio.py mix  --dur 14 --out track.wav [--song song.mp3 --song-start 12.34] [--events events.json] [--loop]
  python audio.py synth --dur 14 --bpm 120 --sections sections.json --out-dir audio/   (fallback only)

events.json: [{"t": 2.5, "sfx": "click"|"path/to/file.wav", "gain": 0.8}, ...]
  Each SFX is placed so its MEASURED PEAK (not its file start) lands on t.
  Built-in names (click pop tick whoosh snap ratchet bloop chime paper impact riser swipe)
  resolve to files in --sfx-dir (default: ./sfx, created by `synth`).
sections.json (synth): [{"from":0,"to":8,"kind":"intro"},{"from":8,"to":12,"kind":"drop"},
  {"from":12,"to":13.5,"kind":"breakdown"},{"from":13.5,"to":14,"kind":"return"}]
  kinds: intro | groove | drop | build | breakdown | return

Real music + real SFX (e.g. Mixkit, free for commercial use) always beat the synth. Use the
synth only when downloads are impossible, and tell the user it is a stand-in.
Loudness is normalised to -14 LUFS (two-pass loudnorm), true peak -1 dBTP.
--loop: crossfades the last 40 ms into the start so a looping film has no audio click.
import argparse, json, os, pathlib, subprocess, sys

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, lfilter, fftconvolve

SR = 44100
rng = np.random.default_rng(7)

def T(d): return np.arange(int(d * SR)) / SR
def filt(x, f, kind='low', o=2):
    b, a = butter(o, np.array(f) / (SR / 2), btype=kind); return lfilter(b, a, x)
def saw(f, t): return 2 * ((f * t) % 1.0) - 1
IR = filt(rng.standard_normal(int(1.4 * SR)) * np.exp(-T(1.4) * 3.4), 5000); IR /= np.abs(IR).sum() / 6
def verb(x, wet=0.3):
    y = fftconvolve(x, IR); o = np.zeros(len(y)); o[:len(x)] += x * (1 - wet); return o + y * wet

# ---------------- SFX library (synth stand-ins) ----------------
def sfx_library():
    L = {}
    t = T(0.05); L['click'] = filt(rng.standard_normal(len(t)), [2000, 9000], 'band') * np.exp(-t * 160) * .9 + np.sin(2 * np.pi * 1900 * t) * np.exp(-t * 120) * .4
    t = T(0.03); L['tick'] = np.sin(2 * np.pi * 3200 * t) * np.exp(-t * 300) * .6
    t = T(0.12); L['pop'] = np.sin(2 * np.pi * np.cumsum(560 * (1 + 1.2 * np.exp(-t * 40))) / SR) * np.exp(-t * 30) * .6
    t = T(0.35); L['whoosh'] = filt(rng.standard_normal(len(t)), [600, 3500], 'band') * np.sin(np.pi * t / .35) ** 2 * .6
    t = T(0.22); L['swipe'] = filt(rng.standard_normal(len(t)), [1500, 7000], 'band') * np.sin(np.pi * t / .22) ** 1.5 * .5
    t = T(0.18); L['snap'] = filt(rng.standard_normal(len(t)), [600, 6000], 'band') * np.exp(-t * 45) * .9 + np.sin(2 * np.pi * 140 * t) * np.exp(-t * 30) * .5
    r = np.zeros(int(.25 * SR))
    for i in range(7): s = int(i * .25 / 7 * SR); c = L['click'] * (.5 + .5 * i / 7); r[s:s + len(c)] += c[:len(r) - s]
    L['ratchet'] = r
    t = T(0.35); L['bloop'] = np.sin(2 * np.pi * np.cumsum(300 + 600 * (t / .35) ** .6) / SR) * np.sin(np.pi * t / .35) ** .8 * .45
    t = T(1.2); L['chime'] = verb(sum(np.sin(2 * np.pi * f * t) * np.exp(-t * (4 + i * 2)) for i, f in enumerate((1318.5, 1975.5))) * .35, .4)[:len(t)]
    t = T(0.3); g = np.convolve((rng.random(len(t)) < .02).astype(float), np.exp(-np.arange(300) / 60), 'same')
    L['paper'] = filt(rng.standard_normal(len(t)), [1500, 7000], 'band') * np.clip(g, 0, 1) * np.sin(np.pi * t / .3) * .9
    t = T(1.4); L['impact'] = verb(np.tanh(1.5 * (np.sin(2 * np.pi * np.cumsum(38 + 60 * np.exp(-t * 12)) / SR) * np.exp(-t * 2.4) * 1.2 + filt(rng.standard_normal(len(t)), 900) * np.exp(-t * 5) * .8)), .3)[:len(t)]
    t = T(1.0); r = t / 1.0; L['riser'] = filt(rng.standard_normal(len(t)), 1500, 'high') * r ** 2.5 * .5 + np.sin(2 * np.pi * np.cumsum(200 + 1000 * r ** 2) / SR) * r ** 2 * .25
    return L

# ---------------- song synth (fallback) ----------------
AM = [220.0, 261.63, 329.63]; F = [174.61, 220.0, 261.63]; Cc = [261.63, 329.63, 392.0]; G = [196.0, 246.94, 293.66]
CH = [AM, F, Cc, G]; ROOT = [55.0, 43.65, 65.41, 49.0]
def kick(g=1.0):
    t = T(.45); s = np.sin(2 * np.pi * np.cumsum(46 + 140 * np.exp(-t * 30)) / SR) * np.exp(-t * 6.5); s[:300] += rng.standard_normal(300) * np.linspace(.5, 0, 300); return np.tanh(s * 1.8) * g
def hat(d=.05, dec=60): t = T(d); return filt(rng.standard_normal(len(t)), 7500, 'high') * np.exp(-t * dec)
def clap():
    t = T(.35); env = np.exp(-t * 16)
    for o in (0, .011, .022): env += .9 * np.exp(-np.maximum(t - o, 0) * 300) * (t >= o)
    return verb(filt(rng.standard_normal(len(t)), [900, 5000], 'band') * env * .7, .25)
def bassn(f, d=.24): t = T(d); return filt(saw(f, t) + .6 * saw(f * 1.004, t) + .8 * np.sin(np.pi * f * t), 520) * np.exp(-t * 5) * np.minimum(t / .005, 1)
def stab(fr, d=.6, dec=5, cut=2600, wet=.4):
    t = T(d); s = sum(saw(f * (1 + dt), t + rng.random()) for f in fr for dt in (-.006, 0, .007))
    return verb(filt(s, cut) * np.exp(-t * dec) * np.minimum(t / .004, 1) / len(fr) / 3, wet)

def synth_song(dur, bpm, sections):
    n = int(dur * SR); dr = np.zeros(n); mu = np.zeros(n); fx = np.zeros(n); spb = 60 / bpm; kicks = []
    def add(bus, s, t0, g=1.):
        i = int(round(t0 * SR));
        if 0 <= i < n: m = min(len(s), n - i); bus[i:i + m] += s[:m] * g
    lib = sfx_library()
    for sec in sections:
        k = sec['kind']; t0 = sec['from']; t1 = sec['to']; b = t0
        while b < t1 - 1e-6:
            bi = int(round(b / spb)); barn = (bi // 4) % 4
            if k in ('groove', 'drop', 'return', 'build') or (k == 'intro' and b - t0 >= 2 * spb * 4 * 0):
                if k != 'intro' or bi % 2 == 0: add(dr, kick(.75 if k == 'intro' else 1), b); kicks.append(b)
            if k in ('drop', 'return') and bi % 2 == 1: add(dr, clap(), b, .5)
            if k != 'breakdown': add(dr, hat(), b + spb / 2, .3); add(dr, hat(.03, 120), b + spb / 4, .1)
            if k in ('groove', 'drop', 'build', 'return'):
                for q in range(2): add(mu, bassn(ROOT[barn] * (2 if q else 1)), b + q * spb / 2, .5)
            if bi % 4 == 0:
                if k == 'breakdown': add(mu, stab(CH[barn] + [CH[barn][0] * 2], spb * 4, 1.0, 1400, .6), b, .45)
                elif k in ('drop', 'return'): add(mu, stab([c * 2 for c in CH[barn]], 1.4, 2.4, 2600, .45), b, .3)
                elif k == 'intro': add(mu, stab(CH[barn], 1.8, 1.4, 1500, .5), b, .35)
            b += spb
        if k == 'build': add(fx, lib['riser'][-int((t1 - t0) * SR):] if (t1 - t0) < 1 else filt(rng.standard_normal(int((t1 - t0) * SR)), 1500, 'high') * np.linspace(0, 1, int((t1 - t0) * SR)) ** 2.5 * .5, t0, .8)
        if k in ('drop', 'return'): add(fx, lib['impact'], t0, .9)
    duck = np.ones(n)
    for kt in kicks:
        i = int(kt * SR); m = min(int(.3 * SR), n - i); tt = np.arange(m) / SR; duck[i:i + m] = np.minimum(duck[i:i + m], 1 - .5 * np.exp(-tt * 12))
    mix = dr * .8 + mu * duck * .85 + fx * .7
    return np.tanh(mix * 1.05)

# ---------------- mixing ----------------
def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).copy()

def loudnorm(inp, out, I=-14):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-i', inp, '-af', f'loudnorm=I={I}:TP=-1:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True, encoding='utf-8', errors='replace').stderr
    m = json.loads(r[r.rindex('{'):r.rindex('}') + 1])
    af = (f"loudnorm=I={I}:TP=-1:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
          f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', inp, '-af', af, '-ar', str(SR), out], check=True)

def mix(a):
    n = int(a.dur * SR); bus = np.zeros((n, 2), np.float32)
    if a.song:
        s = load(a.song); i = int(round(a.song_start * SR)); seg = s[max(0, i):max(0, i) + n]
        if i < 0: seg = np.concatenate([np.zeros((-i, 2), np.float32), s[:n + i]])
        bus[:len(seg)] += seg * a.song_gain
    sfxdir = pathlib.Path(a.sfx_dir)
    for e in (json.load(open(a.events)) if a.events else []):
        f = e['sfx']; path = f if os.path.exists(f) else str(sfxdir / f'{f}.wav')
        x = load(path); env = np.convolve(np.abs(x).mean(1), np.ones(220) / 220, 'same'); pk = int(np.argmax(env))
        i = int(round(e['t'] * SR)) - pk; g = e.get('gain', 0.8)
        if a.loop: idx = (np.arange(len(x)) + i) % n; np.add.at(bus, idx, x * g)
        else:
            s0 = max(0, i); x = x[s0 - i:]; m = min(len(x), n - s0)
            if m > 0: bus[s0:s0 + m] += x[:m] * g
    if a.loop:
        k = int(0.04 * SR); w = np.linspace(0, 1, k)[:, None]; bus[:k] = bus[:k] * w + bus[-k:] * (1 - w)
    tmp = a.out + '.pre.wav'; wavfile.write(tmp, SR, np.clip(bus, -1, 1).astype(np.float32)); loudnorm(tmp, a.out); os.remove(tmp)
    print('wrote', a.out)

def synth(a):
    od = pathlib.Path(a.out_dir); (od / 'sfx').mkdir(parents=True, exist_ok=True)
    for k, v in sfx_library().items(): wavfile.write(str(od / 'sfx' / f'{k}.wav'), SR, (v / max(1e-9, np.abs(v).max()) * .9).astype(np.float32))
    secs = json.load(open(a.sections)) if a.sections else [{'from': 0, 'to': a.dur, 'kind': 'groove'}]
    s = synth_song(a.dur, a.bpm, secs); s = s / np.abs(s).max() * .9
    wavfile.write(str(od / 'song_synth.wav'), SR, np.stack([s, s], 1).astype(np.float32))
    print('wrote', od / 'song_synth.wav', 'and', od / 'sfx/*.wav', '(synth stand-ins — tell the user)')

if __name__ == '__main__':
    p = argparse.ArgumentParser(); p.add_argument('cmd', choices=['mix', 'synth']); p.add_argument('--dur', type=float, required=True)
    p.add_argument('--out'); p.add_argument('--song'); p.add_argument('--song-start', type=float, default=0); p.add_argument('--song-gain', type=float, default=0.9)
    p.add_argument('--events'); p.add_argument('--sfx-dir', default='sfx'); p.add_argument('--loop', action='store_true')
    p.add_argument('--bpm', type=float, default=120); p.add_argument('--sections'); p.add_argument('--out-dir', default='audio')
    a = p.parse_args(); mix(a) if a.cmd == 'mix' else synth(a)
