# Techniques

## Liquid glass (iOS-26 style)
Each glass element samples its own clone of the scene behind it (`snapBack()` copies the
canvas as drawn so far), drawn magnified (mag ≈ 1.08–1.18) inside the shape, plus a refraction
band along the rim magnified more (emag ≈ 1.3–1.5), split into red/blue copies at ±2.5 %
scale for chromatic edges, a faint white tint, a diagonal rim light (bright top-left, dimmer
bottom-right) and a soft drop shadow. That reads as glass without displacement maps.
- Order matters: draw the backdrop, then the glass, then anything that sits on the glass.
- Glass over a flat colour looks like nothing — glass needs a photo or busy UI behind it.
- A real SVG displacement version (feImage rounded-rect distance field → three
  feDisplacementMaps at slightly different scales) is possible in DOM scenes; never apply it via
  `backdrop-filter:url()` (Chromium misreads it) — filter a cloned backdrop element instead.
- Glass letters: the shape callback `fillText`s/`strokeText`s; the band comes from the stroke.

## Goo (liquid merge / pinch-off)
Blur the union of shapes, then threshold alpha (`gooMask`): blobs within ~2×blur radius merge,
separating blobs neck and pinch off. For glass goo the band mask = pixels just inside the
threshold. Ramp blur from 0 when entering a goo section; leave goo once shapes are separate
and switch back to crisp vector shapes at a moment of fast motion.
Dynamic-island stretch: island capsule + a circle sliding out of it → `gooFill(..., '#111113')`.

## Iris
Six blades on a hexagonal aperture. Each blade: its two hexagon vertices, both edge
extensions to the circle, and the SHORT arc between them (polyline). Closing = aperture → 0
with eio over ~0.25 s while rotating ~1 rad; snapping open = `eo5` over ~0.25 s. Swap what is
behind the iris while it is fully closed — that is the "cut". Floor the aperture at 1 px.

## Accordion wordmark
Squeeze: all letters scale toward the dot by k (positions and widths), period stays; the
period is drawn as a rounded rect so it can grow into a pill (`WM.rect` → springState).
Return: reverse with `eback` landing exactly at the end time.

## Flood → contract
A shape expands past the corners (overscale ≥ √2 × frame) with `ei` over ~0.3 s, holds black
≤ 1 beat, then contracts (eio, ~0.35 s) into the next scene's shape (a frame, a pill, a card).
Anything inside the contracting shape must already exist in its final form (or be covered by
an iris) — don't let insets scale with the flood.

## Paper-map unfold
Centre tile, then plus (4 tiles), then corners. Each new tile scales from the edge it shares
with its parent, image squished (not cropped) plus a fold shade `(1-p)*0.45` that clears as
it opens. Then reflow into a bento with per-tile staggered springs.

## Tab indicator / toggle knob (dualEdge)
Left and right edges ride different springs: moving right, the right edge is fast and the left
slow, so the pill stretches ahead and catches up. Draw labels twice: white under, then clip to
the indicator and draw them in ink — the indicator "inverts" text as it passes.

## Direct-manipulation drags
Value from cursor while held; after release spring from the release value. Rubber-band past
limits (`rubber`): clamp the value, convert the excess to container stretch, spring it back.
Push the camera in while held.

## Play ↔ pause morph
Two quads per glyph with point-for-point correspondence: ▶ split into two quads; ‖ two bars.
`lerp` each vertex by one spring.

## Footage
Re-encode all-intra so every frame is a keyframe: `ffmpeg -i in.mp4 -an -c:v libx264 -g 1 -crf 16 -pix_fmt yuv420p wall.mp4`.
Load as a blob URL (`loadVideo`), and in `prepare(t)` `await seekVideo(v, t - start)`; draw it
in `draw`. Never rely on `video.play()` timing.

## Stand-in assets
Use only when the user can't provide assets or says "just make it" — and say so. Photos:
`standinPhoto(seed, palette)`, layered ridges/water/sun with grain; same seed + different
palette = aligned pair for relight drags. Footage: procedural (e.g. wall texture + leaf
shadows drawn on a small canvas and upscaled for soft edges, swaying with sines of t).
