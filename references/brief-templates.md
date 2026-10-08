# Brief templates

Users often paste a brief in six tagged sections. Treat each section as binding:

| section | what it controls | what you do |
|---|---|---|
| `<inputs>` | assets only the user can give | ask for exactly these, once; stand-ins if they say "just make it" |
| `<direction>` | look, motion language, fonts, banned list | becomes the art-direction rules of the scene; the banned list overrides defaults |
| `<structure>` | BPM, length, the sequence of states | becomes the beat map, one row per beat |
| `<build>` | technical method | follow it; the engine already implements most items (map them) |
| `<gotchas>` | known failure modes | check each one explicitly during stills/QA |
| `<start>` | what to show before coding | obey it (e.g. "show the beat map and 4 stills first") |

## Blank template (offer this when a user wants to write their own)
```
<inputs> Ask me for: … </inputs>
<direction> Look, canvas, palette, type, motion language, camera. Banned: … </direction>
<structure> BPM, bars/beats, the sequence of states / scenes, where the drop and loop land. </structure>
<build> Technical method (single HTML, seek(t), springs, render settings, QA). </build>
<gotchas> Known traps. </gotchas>
<start> What to show me before the full render. </start>
```

## Example A — one-take launch film (54 beats, 120 BPM)
- inputs: one-word brand (a verb), 9–12 photos (one aligned day/golden pair), a 120 BPM song
  with a drop and a quiet breakdown, a stock clip of a plain wall with moving plant shadows.
- direction: Apple-keynote, 2D, one continuous take; nothing fades/blurs/cuts — objects change
  shape. Warm off-white canvas, black UI, liquid glass over photos; Archivo wdth125/800 for
  the wordmark, Geist for UI; cursor drives every change; screen-studio zoom.
- structure: wordmark squeezes into its period → dot → pill with label → click → iris →
  photo → circle→square → map unfolds → bento → click zoom lands on the drop → glass word
  melts into droplet → glass toolbar → slider relights day→golden → knob becomes lens → orb →
  lock screen with glass clock → player → phone pull-back → Dynamic Island pinches off →
  Mac window rolls down → long-press wallpaper, drag to Safari tab, page pushes in, drop as
  hero → scroll: hero becomes framed print (mat and molding grow) → colour paints across →
  size → nav button flies into "Order print" → Ordered ✓ → Printing % → On its way (van) →
  Delivered ✓ → flood → hold → contracts into the print on the real wall → iris opens/closes →
  flood → pill → dot → letters spring back on the beat return. Last frame = first frame.
- implemented in `examples/launch_film_standalone.js` (pre-engine version; port its acts
  onto engine helpers when reusing).

## Example B — one-shape UI loop (7 bars, 120 BPM)
- inputs: 8–12 UI states, pure B/W or one accent, a 120 BPM song.
- direction: Dribbble-level UI motion; one shape, never cut; content swaps with a short blur;
  warm-gray canvas, B/W components, Geist; springs with tiny overshoot; camera zooms so each
  state fills the frame; loops. Banned: bouncy easing, particles, glows, UI-chrome gradients,
  mismatched icon strokes, dead time, template looks.
- structure: button → loader → check → dynamic island → music player (play/pause morph) →
  scrub → volume slider stretching past max → toggle on the beat → knob becomes liquid tab
  indicator → tabs open into a self-drawing chart with hover tooltip → ⌘K → type to filter →
  enter → toast → button.
- implemented in `examples/ui_morph_loop.js` — QA PASS (no pops, no holds, loop seam clean).
