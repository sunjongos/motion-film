# Engine API (scripts/engine.js)

Globals available to every scene. `X` is the 2D context of the film canvas, `S` its size,
`C = S/2`. All functions are pure in `t`.

## Contents
1. Scene contract  2. Time & easing  3. Springs  4. Direct manipulation  5. Drawing
6. Text  7. Wordmark  8. Iris  9. Liquid glass & goo  10. Camera  11. Cursor
12. Flood  13. Stand-ins & footage

## 1. Scene contract
```js
const CONFIG = { size: 1440, dur: 14, bpm: 120, offset: 0, bg: '#ECEAE6',
                 fonts: ['600 40px Geist', '800 100px Archivo'] };   // fonts awaited before setup
async function setup() {}          // once: build images, load video, precompute layouts
async function prepare(t) {}       // optional per-frame async work (video seeks) — before draw
function draw(t) {}                // required; canvas is already cleared to CONFIG.bg
```
`seek(t)` wraps t modulo `dur` (so loop motion blur works) and calls prepare → draw.
`?render=1` disables the live preview loop; opening the HTML normally plays it in real time.

## 2. Time & easing
| fn | meaning |
|---|---|
| `beat(n)` / `bar(n, b)` | seconds of beat n / bar n beat b (uses CONFIG.bpm, offset) |
| `prog(t, a, b)` | 0→1 clamp of t across [a, b] |
| `lerp`, `clamp`, `smooth` | usual |
| `eio` | cubic in-out, zero velocity at both ends (camera, cursor paths, wipes) |
| `eo`, `eo5`, `ei` | out-cubic, out-quint (snaps, iris opening), in-cubic (floods) |
| `eback(x, s)` | out-back with overshoot s (letters springing out, landing exactly at x=1) |
| `rng(seed)` | deterministic PRNG — never use Math.random |

## 3. Springs
```js
spring(t, t0, f=2.2, z=0.72, settle=1.0)   // 0→1 step response, forced to exactly 1 at t0+settle
springTo(t, v0, [[t0, v, f?, z?, settle?], ...])   // many targets = sum of springs
springState(t, [[t0, {w, h, r, fill, ...}], ...], f, z, settle)
     // numbers and colours spring; missing keys carry forward; strings switch at t0
dualEdge(t, l0, r0, [[t0, l, r], ...], fast=3.4, slow=1.9, z=0.8, settle=0.9) -> [L, R]
     // leading edge on the fast spring, trailing on the slow one: stretchy liquid indicators
```
Rules of thumb: f 2.2–3.4 Hz for UI, 1.5–2 Hz for big layout moves; z 0.7–0.85 (tiny
overshoot). `settle` ≤ time to the next change on the same value, or act switches pop.
Settled springs are what make `last frame == first frame` exact.

## 4. Direct manipulation
```js
dragValue(t, tDown, tUp, cursorAtFn, map, rest=null, f, z)
   // held: map(cursorAtFn(t)); after release springs from map(cursor at tUp) to `rest` (or stays)
rubber(v, lo, hi, k) -> {value, over}   // past-limit stretch: value clamped, `over` = stretch px
```
Typical: `const v = t => dragValue(t, B(8), B(11), t2 => cursorAt(t2, CUR), ([x]) => clamp((x-600)/500))`.
Add `over` to the container width (and half to its centre) so the slider stretches; spring it
to 0 after release.

## 5. Drawing helpers
`rr(g,x,y,w,h,r)`, `rrc(g,cx,cy,w,h,r)` rounded-rect paths (call `fill()`/`stroke()`/`clip()`),
`cover(g,img,x,y,w,h,squish)` object-fit cover (squish=true for paper-map unfolds),
`font(g,px,family,weight,stretch)`, `mk(w,h)` offscreen canvas, `lerpRect(a,b,u)`,
`rgb()`, `rgbs()`, `mixc(a,b,u)` colour helpers, `pt(M,x,y)` transform a point.

## 6. Text
```js
swapText(g, t, items, clipFn, mode='rise'|'blur')
   // items: {text, t0, t1, x, y, font:[px,fam,wt,stretch], color, align, inDur, outDur}
riseText(g, str, x, y, [cx,cy,cw,ch], u, align)   // rises out of a mask line, u = 0..1
```
'rise' = launch-film style (no blur). 'blur' = UI style short blur+scale swap. Each item has
its own enter (t0) and exit (t1) — overlapping labels are the classic bug.

## 7. Wordmark (accordion squeeze into its own period)
```js
const WM = wordmarkLayout('Frame.', 230, 'Archivo', 800, 'expanded', C, C);  // in setup()
drawWordmark(X, WM, k)          // k=1 open, 0 squeezed into the dot; dot drawn as a shape
WM.rect                         // {cx,cy,w,h,r} of the dot -> springState/lerpRect it into a pill
```
Every letter moves toward the dot by the same factor and its width follows, so letters stay
touching. Reverse with `eback(prog(t, a, end))` so it lands exactly on the final frame.

## 8. Iris
`iris(g, cx, cy, R, aperture, rotation, col, seam, seamW)` — six blades around a hexagonal
aperture; aperture R = open, 0 = closed. Rotate as it closes: `rot = base + (1-a/R)*1.1`.
Clip to the circle/rect it lives in. Grow `seamW` in with the element so seams don't pop.

## 9. Liquid glass & goo
```js
glass((g, mode) => { rrc(g, cx, cy, w, h, h/2); mode === 'fill' ? g.fill() : g.stroke(); },
      cx, cy, {band: 16, mag: 1.1, emag: 1.32, tint: 'rgba(255,255,255,.1)', rim: 3, shadow: .18})
gooFill(g => { /* draw blobs */ }, blurPx, '#111113')          // liquid pinch-off, solid colour
gooGlass(g => { /* draw letters + droplet */ }, blurPx, cx, cy, opts)   // liquid glass blobs
```
Glass samples a clone of what is already drawn (`snapBack()`), so draw it AFTER its backdrop.
Glass text: pass a shape that calls `g.fillText`/`g.strokeText` by mode. Several glass items =
one combined shape (one pass) when possible; each pass costs ~4 full-frame composites.
Goo: ramp `blurPx` from 0 at the start of a goo section to avoid a pop when switching from
crisp vector shapes.

## 10. Camera
`camAt(t, [[t, cx, cy, scale], ...])` → `[cx, cy, scale]` (eio between keys, log-scale zoom);
`applyCam(X, cam)` inside `X.save()/restore()`. Or derive the camera from the shape state:
`scale = (S*0.74 / max(w,h))^0.75` — partial compensation so the morph still reads.
Screen-studio push-ins: add `spring(t, a) - spring(t, b)` bumps to scale and centre.

## 11. Cursor
```js
cursorAt(t, keys)                    // keys [[t, x, y], ...] eio → zero speed at every key
drawCursor(X, t, keys, clicks, {held, longPress:[t0,t1], ink, size})   // inside the camera
pressAt(t, clicks)                   // 0..1 press amount
```
Arrive ≥ 0.1 s before a click; click ON the beat; leave after. Loops: last key = first key.

## 12. Flood
`floodRect(fromRect, u, over=1.18)` → rect that overscales past the corners. Drive `u` with
`ei(prog(t, a, a+0.3))`; contract out of it with `eio` into the next scene's shape.

## 13. Stand-ins & footage
`standinPhoto(seed, {sky:[top,bottom], sun:[x,y,r,col], layers:[...], water:[top,bottom]}, {horizon, amp})`
— same seed + different palette = aligned day/golden pair.
`loadVideo(url)` (blob URL) and `await seekVideo(video, t)` inside `prepare(t)`, then `cover(X, video, ...)`.
