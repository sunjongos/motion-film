---
name: motion-film
description: Make broadcast-quality motion graphics videos (MP4) from code, such as Apple-keynote launch films, one-shape UI-morph loops, Dribbble-level UI animation, showreels, kinetic typography, logo reveals and beat-synced product promos with a cursor driving the UI. Renders a deterministic seek(t) canvas film with Playwright at 60fps with real motion blur, locks every event to the song's measured beat grid, places SFX by measured peak, and gates delivery on automated QA (single-frame pops, loop seams, dead time). Use this skill whenever the user asks for a motion graphic, animated video, motion design, launch or teaser film, UI animation, animated mockup, looping animation, Remotion-style or After-Effects-style video, or mentions '모션그래픽', '모션그래픽 만들기', '모션 필름', '모션 디자인', 'Remotion 대체', '리모션', or pastes a motion-design brief. Far superior to Remotion: 0-npm dependency, 100% deterministic mathematical seek(t), subframe motion blur, acoustic peak lock, resumable chunks, and automated frame-differential QA.
---

# motion-film (월드베스트 코드 기반 모션그래픽 엔진)

> **"Every pixel is a pure mathematical function of time: $P = f(t)$"**
> Remotion의 무거운 Node/React/Webpack 종속성을 100% 제거하고, 60fps 결정론적 캔버스 렌더링, 물리 서브프레임 모션 블러, 음악 비트 피크 동기화, 자동화 프레임 QA를 탑재한 초격차 모션그래픽 시스템입니다.

## 🌟 왜 Remotion을 압도하는가? (Why This Outclasses Remotion)

| 비교 항목 | 기존 Remotion 방식 | **motion-film (World-Best)** |
| :--- | :--- | :--- |
| **의존성 (Dependencies)** | Node.js, React, Webpack/Vite, 500MB+ `node_modules` | **0-npm! 단일 HTML + Python 런타임** |
| **프레임 결정론 (Determinism)** | React 렌더 사이클 및 비동기 훅으로 인한 프레임 스킵 가능 | **시간의 순수 함수 `draw(t)` — 100% 프레임 일치 보증** |
| **모션 블러 (Motion Blur)** | CSS 필터 기반 가짜 블러 또는 고비용 후처리 | **물리 서브프레임(240Hz+) 샘플링 + FFmpeg `tmix` 실시간 합성** |
| **오디오 싱크 (Audio Sync)** | 파일 시작점(t0) 기준 단순 배치 | **FFT 에너지 분석으로 SFX 최대 피크(Peak) 순간에 비트 동기화** |
| **품질 검증 (Quality Gate)** | 사용자 육안 수동 검수 (버그 발견 시 재렌더링) | **`qa.py` 프레임 미분 분석: 튐(Pop), 정지(Hold), 루프 솔기 자동 판정** |
| **중단 복구 (Resumable)** | 프로세스 다운 시 0%부터 재렌더링 | **3초 단위 독립 청크 렌더링 — 중단 시 마지막 청크부터 즉시 재개** |

## 📁 주요 구성 파일 (Files)

```
scripts/motion_film_cli.py  통합 CLI 오케스트레이터: init, build, stills, render, qa, demo
scripts/engine.js           런타임 엔진: closed-form 스프링, 모핑, 리퀴드 글래스, 구(goo), 조리개(iris), 카메라, 커서, 텍스트 스왑
scripts/build.py            scene.js + engine.js + Base64 폰트 -> 단일 독립 HTML 패키징
scripts/render.py           Playwright 60fps 청크 렌더러 (stills, start, work, status, assemble)
scripts/beats.py            NumPy 기반 음원 분석: BPM 추정, 비트 그리드, 다운비트, 드롭 지점, SFX 피크 감지
scripts/audio.py            음원 + 피크 정렬 SFX 믹싱, 방송 표준 -14 LUFS 자동 노멀라이제이션
scripts/kakao_audio_master.py 카카오톡 모바일 공유 무결점 오디오 마스터러 (48kHz, TP<=-2.5dB, 보컬 더킹, faststart)
scripts/qa.py               자동화 프레임 QA: 팝(Pop), 홀드(Hold), 루프 시임(Loop Seam), 비트 시트 검증
examples/ui_morph_loop.js   검증된 7마디 원셰이프 UI 모핑 루프 (검증 완료된 레퍼런스)
examples/ui_morph_loop_demo.mp4  완성된 14초 60fps 1440x1440 마스터 데모 영상
examples/launch_film_standalone.js 27초 54비트 원테이크 제품 런칭 필름
examples/ndb_awards_scene.js 2026 NDB 어워즈 90초 2,700프레임 브로드캐스트 마스터 씬
examples/ndb_awards_contact_sheet.jpg 14개 주요 키프레임 콘택트 시트
references/opus-mastery.md  [필독] Claude Opus를 능가하는 5대 초격차 모션 헌법 & 카톡 무결점 오디오 표준
```

Read `references/opus-mastery.md`, `references/engine-api.md`, and `examples/ui_morph_loop.js` before writing the first scene.
Read the technique/audio/QA references when the brief calls for those things.

## Workflow (do the phases in order; each has a gate)

### 0. Intake
If the user pasted a brief in the `<inputs> <direction> <structure> <build> <gotchas> <start>`
format, treat each section as binding (see `references/brief-templates.md`). Otherwise extract
the same six things from their message.

Ask only for inputs you cannot invent well: brand word, their photos/footage, their song,
their accent color, the list of UI states. Ask once, compactly (use the tappable question tool
when available). If the user says "just make it" or the brief's assets can't be fetched,
proceed with **stand-ins** and say exactly which parts are stand-ins in the final message:
- photos → `standinPhoto()` (aligned day/golden pairs share a seed)
- footage → procedural (e.g. wall + swaying leaf shadows) or a user upload
- music/SFX → `audio.py synth` (only as a fallback; real tracks always win)
Sandbox network allows github/raw.githubusercontent (fonts come from google/fonts there) but
blocks mixkit.co, pexels.com, fonts.google.com, unsplash and CDN downloads. Uploaded files
appear in `/mnt/user-data/uploads`.

### 1. Beat map  (gate: written before any scene code)
Write the timeline on the beat grid as a compact table: beat → time → what changes. Rules:
- something happens on **every beat**; nothing holds longer than 1 s unless the brief asks
- the hero moment (zoom landing, reveal) lands exactly on the drop / a downbeat
- quiet visual passages sit in the musical breakdown; the return lands with the beat
- loops: the last frame equals the first — shape, text, camera, cursor position AND speed
- every state change says *how* it morphs (see vocabulary in `references/choreography.md`);
  "fade", "cut", "crossfade", "blur-in" are not morphs
If the brief says to show the beat map first, show it and wait. Save it as `beatmap.md`.

### 2. Scene code
Write `scene.js` against the engine. Skeleton:

```js
const CONFIG = { size: 1440, dur: 14, bpm: 120, offset: 0, bg: '#ECEAE6',
                 fonts: ['600 40px Geist', '800 100px Archivo'] };
const B = n => beat(n);                       // beat index -> seconds (uses CONFIG.bpm/offset)
const STATES = [[0, {w: 380, h: 116, r: 58, fill: '#0B0B0C'}], [B(2), {w: 116, h: 116, r: 58}], ...];
async function setup() { /* build stand-in photos, load footage, precompute layouts */ }
function draw(t) {
  const st = springState(t, STATES, 2.6, 0.78, 0.5);    // the one shape
  const zoom = Math.pow(Math.min(S * .74 / st.w, S * .74 / st.h), .75);
  X.save(); applyCam(X, [C, C, zoom]);                   // camera follows the shape
  X.fillStyle = st.fill; rrc(X, C, C, st.w, st.h, st.r); X.fill();
  // content layers, each with its OWN enter/exit times
  drawCursor(X, t, CURSOR_KEYS, CLICKS);                 // inside the camera so it scales
  X.restore();
}
```
Non-negotiables (they are what make it look designed rather than templated):
- **Pure function of t.** No `Date`, no `Math.random()` (use `rng(seed)`), no state carried
  between frames, no CSS transitions/timers, no `will-change` on anything the camera scales.
- **Springs, not tweens,** for anything that "arrives": `spring`, `springTo` (sum of one spring
  per change), `springState`, `dualEdge`. Damping 0.7–0.85 = tiny overshoot at most. Use `eio`
  only for camera moves, cursor paths, wipes and progress — things that start and stop.
- **Settle springs before the next state** (`settle` ≤ the gap to the next change, typically
  one beat). Unsettled springs at act boundaries are the #1 source of pops.
- **Objects change shape instead of cutting.** Every scene is made out of the previous one.
- **Text in a morphing container gets its own enter and exit timing**, or it overlaps.
- **Drags are direct manipulation:** while held, value = f(cursor position) (`dragValue`);
  on release it springs from wherever it was. Past limits use `rubber()`.
- Keep geometry in world coordinates; let `applyCam` frame it. Draw the cursor inside the camera.

Build: `python scripts/build.py scene.js film.html [--font Family=gf:ofl/dir/File.ttf]`

### 3. Stills  (gate: look at the sheet and fix before the full render)
```
python scripts/render.py film.html stills --out out --beats --scale 0.5
```
Then `view out/contact_sheet.jpg`. Check every beat: state correct, nothing cramped, text
readable at phone size, nothing off-grid, no unintended empty frames. For tricky moments add
`--times 2.75 3.02 ...`. Fix and repeat. Never start the full render with a known issue.

### 4. Audio
With a real song: `python scripts/beats.py song.mp3 --target 120 --drop-at <film drop time>`
→ use `bpm`, set `CONFIG.offset` / trim the song at `song_start` so the song starts on a
downbeat and the drop lands on the hero frame. Then write `events.json` (one SFX per visual
event) and `python scripts/audio.py mix --dur D --song song.mp3 --song-start S --events events.json --sfx-dir sfx [--loop] --out track.wav`.
SFX are placed by their **measured peak**, not file start. Output is loudnormed to -14 LUFS.
Without a song: `audio.py synth --dur D --bpm 120 --sections sections.json --out-dir audio`
creates a stand-in song and SFX kit, then mix as above. Details: `references/audio.md`.

### 5. Full render  (resumable; never one long blocking call)
```
python scripts/render.py film.html start  --out out --sub 4      # detached worker, chunks of 3 s
python scripts/render.py film.html status --out out              # poll with `sleep 240` between calls
python scripts/render.py film.html assemble --out out --audio track.wav --name film.mp4
```
Each tool call is capped near 300 s and the container can pause between turns, killing
background jobs — that is why chunks are saved individually. If `status` says the worker is
dead, run `start` again; it resumes after the last finished chunk. `--sub 4` = 4 subframes
blended with tmix (true motion blur). Use `--sub 1 --scale 0.5` for quick previews.

### 6. QA  (gate: verdict PASS before delivery)
```
python scripts/qa.py out/film.mp4 --bpm 120 --offset 0 [--loop] --sheet out/qa_beats.jpg
```
- `pops`: frames whose change is >3× their neighbours → find the cause (an element appearing
  in one frame, an unsettled spring at a scene switch, a flood that isn't overscaled)
- `holds`: >1 s of near-stillness → add motion (camera push, reactive detail) or tighten timing
- `loop`: the last→first step must look like any other step
- `quiet_beats`: informational; make sure each is intentional
Fix → delete only the affected chunk markers (`out/chunks/NNNN.done`) → `start` → `assemble`.
Look at `qa_beats.jpg` yourself, too.

### 7. Deliver
`present_files` the MP4 first, then the HTML source and `beatmap.md`. In the message: length,
resolution, fps, what QA checked, and an explicit list of stand-ins with an offer to swap in
real assets. Don't paste the code.

## Art direction defaults (override only when the brief says so)
- Canvas: warm off-white (#F4F1EA / #ECEAE6); UI black #0B0B0C and white; one accent at most.
- Type: Geist for UI; Archivo 800 at `fontStretch:'expanded'` (wdth 125) for wordmarks/display.
- Motion: springs everywhere (f 2–3 Hz, z 0.7–0.85); camera eases with zero velocity ends;
  zoom so each moment fills the frame; cursor moves on eased paths and really clicks/drags.
- Banned unless asked: crossfades, blur-ins, brightness "developing", 3D flips, particles,
  glows, bouncy easing, gradients on UI chrome, mismatched icon stroke weights, dead time,
  holds > 1 s, anything that looks like a template.
- One continuous take beats cuts. A black flood → contract is the strongest "cut" allowed.

## Gotchas (each one cost a re-render)
- `backdrop-filter:url()` misreads displacement maps in Chromium → glass clones the scene (`glass()` does this).
- A flood must overscale past the corners and take ~0.3 s, or half the screen changes in one frame.
- Skia mis-fills sub-pixel degenerate polygons at some canvas positions (iris blades at zero
  aperture left a wedge hole) → floor apertures at 1 px; `iris()` handles it.
- Elements that "appear" in one frame (seams, shadows, labels) are pops. Grow them in.
- The engine loads before the scene; compute layout in `setup()` if `CONFIG.size` ≠ 1440.
- Canvas `filter: blur()` is fine for short content swaps (UI style) but never as a transition in launch-film style.
- Footage: re-encode all-intra (`ffmpeg -g 1`), load via blob URL, await `seeked` before drawing (`loadVideo`/`seekVideo`, called from `prepare(t)`). `python -m http.server` can't range-seek.
- A child with `visibility: visible` shows through a hidden parent (DOM scenes): use inherit.
- Throughput on one core at 1440²: ~0.05 s per simple subframe, ~0.35 s with several glass elements. Budget: `frames × sub × cost`.
- **카카오톡 공유 시 음성 깨짐 방지**: 마스터 음원이 44.1kHz이거나 True Peak가 -1 dBFS 이상이면, 카톡 모바일 저비트레이트(64k AAC) 재압축 시 인터샘플 오버슈트 클리핑(+1.5~2dB)으로 음성이 찢어집니다 → 반드시 `scripts/kakao_audio_master.py`로 48,000 Hz, True Peak $\le -2.5\text{ dBTP}$, -15.0 LUFS, `-movflags +faststart` 마스터링 필수.
- **글로벌 식별자 충돌 방지**: `engine.js`에 이미 `BACK, LA, LB, MF, MB, G1, G2, G3`가 선언되어 있으므로 `scene.js`에서 `const BACK = ...` 중복 선언 금지 → 엔진의 `glass()`를 직접 호출할 것.
