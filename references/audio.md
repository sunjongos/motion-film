# Audio

## Song first, picture to the song
1. `python scripts/beats.py song.mp3 --target 120 --drop-at 8.0 --json beats.json`
   - comb-filter tempo search with a prior around `--target` (handles half/double tempo)
   - downbeat = the beat phase (mod 4) with the most low-band (kick) energy
   - drop = biggest bar-energy rise; breakdowns = quiet bar runs after the drop
   - `song_start` = where to trim the song so the drop lands at `--drop-at` film seconds;
     `song_start_on_downbeat` = nearest downbeat at/before it
   Validated: synthetic 120 BPM track → 120.0 BPM, drop within 16 ms.
2. Put `bpm` into CONFIG. If the trimmed song starts on a downbeat, `offset: 0`; otherwise set
   `offset` so film beat 0 = the song's first downbeat after trimming.
3. Plan: hero zoom/reveal on the drop; quiet/real-world passage in a breakdown; the return
   (wordmark, loop point) on the beat after the breakdown.
4. Check the plan visually against the music with the one-frame-per-beat sheet.

## SFX on every visual event
`events.json`: `[{"t": 2.5, "sfx": "click", "gain": 0.8}, {"t": 3.02, "sfx": "uploads/snap.wav"}]`
`audio.py mix` measures each file's peak (5 ms envelope) and offsets it so the PEAK lands on
`t` — a whoosh whose peak is 0.2 s in starts 0.2 s early. Match sound to gesture: click on
press, pop on spring-in, tick on slider detents (compute crossing times from the same easing
the picture uses), whoosh on camera/large moves, snap on iris open, ratchet on iris close,
bloop on goo, chime on success, impact on floods/drops, riser into the drop.
Keep SFX 6–10 dB under the music except signature hits.

## Loudness & loops
`audio.py mix` normalises with two-pass `loudnorm` to -14 LUFS integrated, -1 dBTP.
`--loop` wraps SFX tails around to the start and crossfades the last 40 ms into the first,
so a looping MP4/GIF has no click at the seam. Musically, end the loop on the bar line.

## Fallback synth (stand-in only)
`audio.py synth --dur D --bpm 120 --sections sections.json --out-dir audio` writes
`song_synth.wav` (kick/clap/hats/bass/chord stabs/risers/impacts per section kind:
intro, groove, build, drop, breakdown, return) and a 12-sound SFX kit in `audio/sfx/`.
Always tell the user it is synthesized and offer to swap in a licensed track (Mixkit tracks
are free for commercial use, but mixkit.co is not reachable from the sandbox: ask for upload).
