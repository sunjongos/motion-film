#!/usr/bin/env python3
"""Automated QA for a rendered film.

  python qa.py film.mp4 [--bpm 120] [--offset 0] [--loop] [--max-hold 1.0] [--sheet beats.jpg]

Checks
  pops      single-frame spikes: frame diff > 3x the mean of its 4 neighbours (and above a floor)
  loop      if --loop: the last->first diff must look like any other frame step (no stutter)
  holds     stretches with ~no motion longer than --max-hold seconds (dead time)
  beats     motion energy per beat; beats with almost nothing happening are listed
  sheet     one frame per beat contact sheet with beat labels (check it with your eyes)
Exit code 1 if pops / loop stutter / dead time are found, so it can gate delivery.
"""
import argparse, json, subprocess, sys

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

import numpy as np

p = argparse.ArgumentParser()
p.add_argument('mp4'); p.add_argument('--bpm', type=float, default=120); p.add_argument('--offset', type=float, default=0)
p.add_argument('--loop', action='store_true'); p.add_argument('--max-hold', type=float, default=1.0); p.add_argument('--sheet')
a = p.parse_args()

raw_fps = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v', '-show_entries', 'stream=r_frame_rate', '-of', 'csv=p=0', a.mp4], capture_output=True, text=True, encoding='utf-8', errors='replace').stdout.strip().split(',')[0]
fps = (float(raw_fps.split('/')[0]) / float(raw_fps.split('/')[1])) if '/' in raw_fps else float(raw_fps)
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', a.mp4, '-vf', 'scale=128:128,format=gray', '-f', 'rawvideo', '-'], capture_output=True).stdout
fr = np.frombuffer(raw, np.uint8).reshape(-1, 128, 128).astype(np.float32)
d = np.abs(np.diff(fr, axis=0)).mean(axis=(1, 2))           # d[i] = change i -> i+1
rep = {'frames': int(len(fr)), 'fps': fps}

# pops
pops = []
for i in range(2, len(d) - 2):
    nb = (d[i - 2] + d[i - 1] + d[i + 1] + d[i + 2]) / 4
    if d[i] > 3 * max(nb, 0.35) and d[i] > 1.2: pops.append({'frame': i + 1, 't': round((i + 1) / fps, 3), 'diff': round(float(d[i]), 2), 'neighbours': round(float(nb), 2)})
rep['pops'] = pops

# loop seam
if a.loop:
    seam = float(np.abs(fr[-1] - fr[0]).mean()); nb = float(np.mean([d[0], d[1], d[-1], d[-2]]))
    rep['loop'] = {'seam_diff': round(seam, 2), 'neighbour_steps': round(nb, 2), 'ok': seam <= 3 * max(nb, 0.35)}

# holds (dead time)
still = d < 0.08; holds = []; i = 0
while i < len(still):
    if still[i]:
        j = i
        while j < len(still) and still[j]: j += 1
        if (j - i) / fps > a.max_hold: holds.append({'from': round(i / fps, 2), 'to': round(j / fps, 2), 'sec': round((j - i) / fps, 2)})
        i = j
    else: i += 1
rep['holds'] = holds

# per-beat activity
spb = 60 / a.bpm; nb_ = int((len(fr) / fps - a.offset) / spb + 1e-6); act = []
for b in range(nb_):
    s0, s1 = int((a.offset + b * spb) * fps), int((a.offset + (b + 1) * spb) * fps)
    act.append(float(d[s0:min(s1, len(d))].sum()))
med = float(np.median(act)) if act else 0
rep['quiet_beats'] = [{'beat': b, 't': round(a.offset + b * spb, 2), 'energy': round(e, 1)} for b, e in enumerate(act) if e < 0.08 * med]

if a.sheet:
    from PIL import Image, ImageDraw
    cols, s = 8, 220; idx = [min(len(fr) - 1, int(round((a.offset + b * spb) * fps))) for b in range(nb_)]
    rawc = subprocess.run(['ffmpeg', '-v', 'error', '-i', a.mp4, '-vf', f'scale={s}:{s}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout
    col = np.frombuffer(rawc, np.uint8).reshape(-1, s, s, 3)
    rows = (len(idx) + cols - 1) // cols; sh = Image.new('RGB', (cols * s, rows * (s + 18)), 'white'); dr = ImageDraw.Draw(sh)
    for k, n in enumerate(idx):
        x, y = (k % cols) * s, (k // cols) * (s + 18); sh.paste(Image.fromarray(col[n]), (x, y + 18)); dr.text((x + 4, y + 3), f'b{k}  {n / fps:.2f}s', fill=(0, 0, 0))
    sh.save(a.sheet, quality=85); rep['sheet'] = a.sheet

bad = bool(pops) or bool(holds) or (a.loop and not rep['loop']['ok'])
rep['verdict'] = 'FIX' if bad else 'PASS'
print(json.dumps(rep, indent=1)); sys.exit(1 if bad else 0)
