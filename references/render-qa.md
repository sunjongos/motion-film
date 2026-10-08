# Render & QA

## How a frame is made
For output frame n at `fps`, with `sub` subframes, the renderer calls `seek(t)` at
`t = (n - (sub-1-s)/sub) / fps` for s = 0..sub-1 (subframes trail into the frame), JPEG-encodes
each canvas (quality 94), and ffmpeg runs `tmix=frames=sub` then keeps every sub-th blended
frame. That is real shutter-style motion blur at zero authoring cost. Because `seek` wraps t
modulo `dur`, frame 0 of a loop is blurred with the end of the film.

## Resumable chunks
`start` launches a detached worker (`start_new_session`) that renders `--chunk` seconds per
file into `out/chunks/NNNN.mp4` and writes `NNNN.done` when a chunk is complete. `status`
reports progress and whether the worker is alive. Tool calls are capped near 300 s and the
sandbox can pause between turns, killing the worker — just `start` again. Poll with
`sleep 240; status` (never a single sleep ≥ 300 s). `assemble` concatenates, muxes audio,
trims to `dur`, re-encodes (crf 17, faststart) and verifies the frame count.

Partial re-render after a fix: rebuild the HTML, delete only the affected `NNNN.done` (+ mp4),
`start`, `assemble`.

## Throughput (1 vCPU, 1440², per subframe)
simple vector UI ≈ 0.05 s · photos + text ≈ 0.08 s · each glass pass ≈ +0.07 s · goo ≈ +0.05 s
14 s @60fps ×4 subframes simple ≈ 3–4 min; 27 s with heavy glass ≈ 25 min.
Previews: `--sub 1 --scale 0.5` is ~10× faster.

## QA metrics (qa.py)
- Frame difference d[i] = mean |frame(i+1) − frame(i)| on a 128² grayscale proxy.
- **pop**: d[i] > 3× mean of 4 neighbours and > 1.2 → a single-frame event. Typical causes and fixes:
  element appears/disappears in one frame (grow it in), unsettled spring at an act switch
  (lower `settle`), flood not overscaled or too fast (≥ 0.3 s), representation switch
  (vector ↔ goo) at a slow moment (switch during fast motion or ramp blur).
- **loop**: |last − first| must be ≤ 3× the neighbouring steps; otherwise cursor/camera/state
  don't match frame 0 or a spring hasn't settled by `dur`.
- **holds**: runs of d < 0.08 longer than 1 s. Small-area motion (a knob creeping) also counts
  as dead — add a camera push or reactive detail.
- **quiet_beats**: beats with < 8 % of median motion energy; confirm each is intentional.
- **sheet**: one frame per beat with labels — always view it.
Exit code 1 on pops/holds/loop failure: don't deliver on FIX.

## Delivery variants
- Vertical 1080×1920: set `CONFIG.size` square and compose for a centre-safe area, or write the
  scene for a non-square canvas (set canvas width/height in setup and use W/H instead of S).
- GIF/loop for Dribbble: `ffmpeg -i film.mp4 -vf "fps=30,scale=800:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3" film.gif`
- WebM: `ffmpeg -i film.mp4 -c:v libvpx-vp9 -b:v 0 -crf 30 -an film.webm`
- Poster frame: `render.py stills --times <hero time> --scale 1`.
