# Choreography

## Beat map format
```
BPM 120 · beat 0.5 s · 28 beats · 14.0 s · loops
b   t      change                          how it morphs                    sfx
0   0.00   button at rest (= last frame)
1   0.50   CLICK                           press 0.84, ripple               click
2   1.00   button → loader                 w/h spring to circle, label blurs out   pop
...
```
One row per beat (half-beats when needed). The "how" column is the craft: if it says fade or
cut, redesign the row.

## Archetypes

**One-take launch film** (keynote style, 20–30 s): wordmark → product UI → feature beats →
device stage → purchase/outcome → real-world payoff → wordmark. Every scene is made of the
previous object: a dot grows into a pill, a pill into an iris, a photo tile unfolds a grid,
a lens lifts into an orb, an orb expands into a lock screen, a flood contracts into a frame.
Hero zoom lands on the drop; the quiet "real world" moment sits in the breakdown; the beat
returns with the wordmark. See `examples/launch_film_standalone.js` (54 beats).

**One-shape UI loop** (Dribbble style, 10–16 s): a single container morphs size/radius/colour
through 8–14 UI states while its content swaps with a short blur; a cursor drives each change;
camera keeps each state filling the frame; last frame = first frame. See
`examples/ui_morph_loop.js` (validated, QA PASS).

**Logo reveal / sting** (3–6 s): accordion squeeze, rise-from-mask, iris reveal, flood →
contract into the mark. Land the final pose on a downbeat with `eback` so it settles exactly.

**Kinetic type** (one word per beat): each word a distinct technique (scale punch, slide with
motion-trail copies, tracking collapse under measurement guides, elastic per-letter, echo
outlines). Change background colour on the beat, not between beats.

**Data story**: bars draw across, lines draw themselves (`prog` over the polyline length),
tooltips spring in on hover, numbers count with the same easing as the bars.

## Morph vocabulary (use these instead of transitions)
rise out of a mask line · pop from zero on a spring · draw across (stroke/width) ·
push (pages translate together) · unfold like a paper map (scale from the shared edge,
centre → plus → corners) · reflow (rects spring to new layout, staggered 25–40 ms) ·
accordion squeeze · iris close/open · goo melt / stretch / pinch-off · lens → orb → screen ·
roll down like a blind · flood → hold ≤1 beat → contract · knob → indicator (dualEdge) ·
container → container (springState) · paint across (clip wipe in the new colour).

## Camera
- Each moment should fill ~60–75 % of the frame. Derive zoom from the subject size with
  partial compensation (`^0.75`) so size changes still read.
- Screen-studio push-ins on direct manipulation (scrubs, drags), released when the hand lifts.
- Zoom in log space; zero velocity at both ends; never more than one camera move per beat.
- The cursor lives inside the camera and scales with it.

## Cursor
- Moves on eased paths between keys (zero speed at keys reads as intentional).
- Arrives ~0.1–0.3 s before the beat, clicks ON the beat, leaves after the reaction starts.
- Long-press shows a progress ring; drags keep the pointer pressed (`held`).
- Exits frame or rests during non-interactive passages; loops back to its first key.

## Rhythm checks before coding
- Count: does every beat have a row? Any gap > 2 beats is dead time.
- Are 2+ big things happening on the same beat? Split them by a half beat.
- Does every text element have both an in and an out time?
- Does the final pose equal frame 0 (positions, sizes, colours, cursor)?
