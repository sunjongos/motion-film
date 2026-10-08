#!/usr/bin/env python3
"""Analyze a song (numpy only) so the edit locks to it.

  python beats.py song.mp3 [--target 120] [--drop-at 8.0] [--json out.json]
  python beats.py peaks sfx1.wav sfx2.wav ...          # measured peak offset of each SFX

Outputs: bpm, beat times, downbeats, per-bar energy, the drop (largest bar-energy rise),
breakdowns (quiet runs after the drop), and — with --drop-at — the song start offset that
makes the drop land exactly at that film time while starting on a downbeat.
"""
import json, subprocess, sys
import numpy as np

SR = 22050

def load(path, sr=SR):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-'], capture_output=True).stdout
    return np.frombuffer(raw, np.float32).copy()

def stft_mag(x, n=2048, hop=512):
    w = np.hanning(n); frames = 1 + max(0, (len(x) - n) // hop)
    idx = np.arange(n)[None, :] + hop * np.arange(frames)[:, None]
    return np.abs(np.fft.rfft(x[idx] * w, axis=1)), hop

def analyze(path, target=120.0, drop_at=None):
    x = load(path); M, hop = stft_mag(x); fps = SR / hop
    L = np.log1p(M * 10)
    flux = np.maximum(0, np.diff(L, axis=0)).sum(1); flux = np.concatenate([[0], flux])
    lowbin = int(150 / (SR / 2048)); low = np.maximum(0, np.diff(L[:, :lowbin], axis=0)).sum(1); low = np.concatenate([[0], low])
    onset = flux - np.convolve(flux, np.ones(16) / 16, 'same'); onset = np.maximum(onset, 0)
    # tempo + phase: comb filter over a fine BPM grid (sub-frame accurate), log-normal prior around target
    idx = np.arange(len(onset)); best = (-1, target, 0.0)
    for bpm_c in np.arange(60, 200, 0.05):
        per = 60 * fps / bpm_c; nb = int(len(onset) / per) - 1
        if nb < 4: continue
        ph = np.linspace(0, per, 48, endpoint=False)[:, None]; pos = ph + per * np.arange(nb)[None, :]
        sc = np.interp(pos, idx, onset).mean(1); k = int(np.argmax(sc))
        val = sc[k] * np.exp(-0.5 * (np.log2(bpm_c / target) / 0.3) ** 2)
        if val > best[0]: best = (val, bpm_c, float(ph[k, 0]))
    _, bpm, phase = best
    period = 60 * fps / bpm; nbeats = int((len(onset) - phase) / period)
    beats = (phase + period * np.arange(nbeats)) / fps + 1024 / SR   # STFT frames are stamped at their centre
    # downbeat: phase (mod 4) with most low-band (kick) energy
    lowb = np.interp((beats - 1024 / SR) * fps, np.arange(len(low)), low)
    ph = int(np.argmax([lowb[k::4].mean() for k in range(4)])); downs = beats[ph::4]
    # bar energy (dB)
    rms = np.sqrt(np.convolve(x ** 2, np.ones(SR // 10) / (SR // 10), 'same') + 1e-12)
    bars = []
    for i in range(len(downs) - 1):
        s0, s1 = int(downs[i] * SR), int(downs[i + 1] * SR); bars.append(float(20 * np.log10(rms[s0:s1].mean() + 1e-9)))
    bars = np.array(bars); drop = None; brk = []
    if len(bars) >= 4:
        rise = [bars[i] - bars[max(0, i - 2):i].mean() for i in range(1, len(bars))]
        di = int(np.argmax(rise)) + 1; drop = float(downs[di])
        thr = np.median(bars) - 5; i = di + 1
        while i < len(bars):
            if bars[i] < thr:
                j = i
                while j < len(bars) and bars[j] < thr: j += 1
                brk.append({'start': float(downs[i]), 'end': float(downs[j]) if j < len(downs) else float(len(x) / SR)}); i = j
            else: i += 1
    res = {'bpm': round(bpm, 2), 'beat_period': round(60 / bpm, 4), 'first_beat': round(float(beats[0]), 3),
           'first_downbeat': round(float(downs[0]), 3), 'downbeats': [round(float(d), 3) for d in downs],
           'bar_energy_db': [round(float(b), 1) for b in bars], 'drop': drop and round(drop, 3), 'breakdowns': brk,
           'duration': round(len(x) / SR, 2)}
    if drop_at is not None and drop is not None:
        start = drop - drop_at
        # snap the song start to a downbeat at or before `start` and report the residual
        cands = [d for d in downs if d <= start + 1e-3]
        res['song_start'] = round(start, 3)
        res['song_start_on_downbeat'] = round(cands[-1], 3) if cands else 0.0
        res['note'] = ('trim the song at song_start so the drop lands at film t=%.2f; if song_start is not on a downbeat, '
                       'shift the film beat grid by (song_start - song_start_on_downbeat) instead' % drop_at)
    return res

def peaks(files):
    out = {}
    for f in files:
        x = np.abs(load(f, 44100)); env = np.convolve(x, np.ones(220) / 220, 'same')
        out[f] = {'peak_offset': round(float(np.argmax(env) / 44100), 4), 'length': round(len(x) / 44100, 3)}
    return out

if __name__ == '__main__':
    a = sys.argv[1:]
    if not a: print(__doc__); sys.exit(1)
    if a[0] == 'peaks': print(json.dumps(peaks(a[1:]), indent=1)); sys.exit()
    tgt = float(a[a.index('--target') + 1]) if '--target' in a else 120.0
    dat = float(a[a.index('--drop-at') + 1]) if '--drop-at' in a else None
    r = analyze(a[0], tgt, dat); s = json.dumps(r, indent=1); print(s)
    if '--json' in a: open(a[a.index('--json') + 1], 'w').write(s)
