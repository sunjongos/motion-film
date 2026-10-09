# 🎬 motion-film — World-Best Code-Driven Motion Graphics Engine

> **"Every pixel is a pure mathematical function of time: $P = f(t)$"**  
> Remotion의 무거운 React/Node/Webpack 종속성을 100% 제거하고, 60fps 결정론적 캔버스 물리 렌더링, 서브프레임 모션 블러, 음악 비트 피크 동기화, 자동화 프레임 차분 QA 게이트를 탑재한 월드베스트 코드 기반 모션그래픽 엔진입니다.

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![Playwright](https://img.shields.io/badge/Renderer-Playwright--Chromium-2ea44f.svg)](https://playwright.dev/)
[![FFmpeg](https://img.shields.io/badge/FFmpeg-8.1-red.svg)](https://ffmpeg.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Engine](https://img.shields.io/badge/Engine-Deterministic--Canvas--seek(t)-orange.svg)]()

---

## 🏛️ 1. 왜 Remotion을 압도하는가? (Remotion vs motion-film)

기존 Remotion 및 웹 기반 비디오 라이브러리는 무거운 Node.js 런타임과 React 생태계 위에서 동작하여 번들링 오버헤드, 프레임 스킵, 긴 렌더 타임아웃 문제를 필연적으로 겪습니다.  
**motion-film**은 카파시 제1원칙(Karpathy Minimalist First-Principles)에 입각하여 모든 불필요한 레이어를 걷어내고, **단일 자립형 HTML + Python Playwright 런타임**으로 압도적인 화질과 제작 속도를 구현합니다.

| 비교 항목 | 기존 Remotion 방식 | **motion-film (World-Best)** |
| :--- | :--- | :--- |
| **의존성 (Dependencies)** | Node.js, React, Webpack/Vite, 500MB+ `node_modules` | **0-npm! 순수 HTML5 Canvas + Python Playwright 런타임** |
| **프레임 결정론 (Determinism)** | React 렌더 사이클 및 비동기 훅으로 인한 프레임 스킵/지연 | **시간의 순수 수학 함수 $P = f(t)$ — 100% 비트 일치 보증** |
| **모션 블러 (Motion Blur)** | CSS 필터 기반 가짜 블러 또는 고비용 후처리 블러 | **물리 서브프레임(240Hz+) 샘플링 + FFmpeg `tmix` 실시간 합성** |
| **오디오 싱크 (Audio Sync)** | 오디오 파일 시작점($t_0$) 기준 단순 타임스탬프 배치 | **FFT 스펙트럼 에너지 분석으로 SFX 최대 피크(Peak) 순간에 비트 락** |
| **품질 검증 (Quality Gate)** | 사용자 육안 수동 검수 (결함 발견 시 0%부터 재렌더링) | **`qa.py` 프레임 미분 분석: 튐(Pop), 정지(Hold), 루프 솔기 자동 판정** |
| **중단 복구 (Resumable)** | 긴 렌더링 중단 시 프로세스 종료 및 진행 데이터 소실 | **3초 단위 독립 청크 렌더링 — 중단 시 마지막 청크부터 즉시 재개** |

---

## ⚡ 2. 5대 핵심 아키텍처 (Core Architecture)

```
[ Scene Definition ] ──▶ scene.js (CONFIG + STATES + draw(t))
         │
         ▼
[ Engine Compilation ] ──▶ build.py ➔ ONE self-contained HTML (Base64 Fonts + engine.js)
         │
         ├─▶ 1. Stills Preview (2s) ──▶ render.py stills --beats ➔ contact_sheet.jpg
         │
         ├─▶ 2. Acoustic Grid-Lock  ──▶ beats.py (BPM/Drop) + audio.py (SFX Peak Mix, -14 LUFS)
         │
         ├─▶ 3. 60fps Chunk Render  ──▶ render.py work (3s chunks, 4x subframe tmix motion blur)
         │
         ├─▶ 4. Audio/Video Concat  ──▶ render.py assemble ➔ final.mp4
         │
         └─▶ 5. Frame-Level QA Gate ──▶ qa.py (pops=0, holds=0, loop=PASS) ➔ Verified Delivery
```

### ① 시간의 순수 함수 ($P = f(t)$)
- `Date.now()`, `Math.random()`(대신 `rng(seed)`), CSS transition, 비동기 상태를 일절 배제합니다.
- 임의의 시점 $t$를 `seek(t)`로 호출했을 때 단 1픽셀의 오차도 없이 동일한 프레임을 렌더링합니다.

### ② 닫힌형태(Closed-Form) 스프링 물리
- $f$(주파수, Hz), $z$(감쇠비, 0.7~0.8) 기반의 정확한 2차 미분방정식 수치해를 closed-form으로 계산합니다.
- `springState`: 여러 속성을 가진 객체 상태 전체를 물리 스프링으로 보간.
- `dualEdge`: 선행 에지와 후행 에지가 각기 다른 속도로 반응하여 리퀴드 탭/필(pill) 애니메이션 형성.
- `dragValue` & `rubber`: 커서 드래그 시 물리 고무줄(rubber-banding) 텐션 구현.

### ③ 방송용 물리 서브프레임 모션 블러 (`tmix`)
- 프레임당 4개의 서브프레임을 고속 렌더링하고, FFmpeg의 `tmix` 필터로 가중 평균 합성합니다.
- 정지된 캡처본에서도 Apple Keynote, 테슬라 런칭 필름 수준의 부드러운 카메라 궤적 셔터 블러가 적용됩니다.

### ④ 측정된 사운드 피크(Measured Peak) 오디오 동기화
- 오디오 파일의 시작점이 아닌, **실제 파형 에너지가 폭발하는 피크(Peak) 시점**을 측정하여 시각적 타격 지점($t$)과 일치시킵니다.
- EBU R128 방송 표준 기준 **-14 LUFS (True Peak -1 dBTP)**로 2-pass 자동 라우드니스 노멀라이제이션을 수행합니다.

### ⑤ 자동화 프레임 차분 QA 게이트 (`qa.py`)
- 모든 렌더링 결과물은 즉시 128×128 그레이스케일 프레임 미분 분석을 거칩니다:
  - **Pops**: 인접 4개 프레임 평균 변화량 대비 3배 이상의 스파이크 감지 ➔ 불완전 스프링/요소 깜빡임 원천 차단.
  - **Holds**: 1초 이상의 무의미한 정지(Dead Time) 감지.
  - **Loop Seam**: 첫 프레임과 마지막 프레임의 오차를 일반 프레임 변화율과 비교하여 완전 무결점 루프 보증.
  - 판정 결과 **`verdict: "PASS"`**가 확인되어야 최종 납품됩니다.

---

## 👑 2.5 Claude Opus 초격차 5대 모션 헌법 & 카카오톡 무결점 오디오 표준

### 🌟 5대 모션 불변 원칙 (The 5 Invariants)
1. **Never Cut, Never Crossfade (연속 유기적 변형):** 단순 Fade/Cut 금지. 모든 요소는 이전 도형의 스프링 모핑(`springState`) 또는 6각 기계식 조리개(`iris`)로 전이.
2. **Apple Keynote Liquid Glass & Chromatic Rim:** 씬 실시간 캡처 기반 $1.12\times$ 굴절, 테두리 적/청 색수차(Chromatic Aberration Red +1.2%, Blue -1.2%), 대각 스페큘러 림라이트.
3. **Procedural Parallax & 35mm Grain:** 수채화 아침 햇살과 원경/근경 산 능선, 상시 52개 유영 파티클(Living Bokeh)로 픽셀 미분 에너지 상시 유지.
4. **Size-Compensated Optical Framing:** 객체 크기 변화 시 화면 점유율($65 \sim 75\%$) 자동 보정 카메라 줌.
5. **Kinetic Spring Typography & Rolling Counters:** 텍스트 오버슈트 안착, 숫자 고속 롤링 카운팅.

### 🔇 카카오톡 모바일 공유 무결점 오디오 표준 (Anti-Clipping Audio)
카카오톡으로 영상을 공유할 때 모바일 앱 내부 인코더가 저비트레이트(64k~96k AAC)로 재압축하면서 **음성이 찢어지거나 지직거리는 현상**을 원천 차단합니다:
- **48,000 Hz 단일 샘플레이트 강제:** 모바일 하드웨어 리샘플링 지터 방지.
- **트루 피크 헤드룸 (True Peak $\le -2.5\text{ dBTP}$):** AAC 손실 압축 시 오버슈트 클리핑 0% 보증.
- **한국어 전문 AI 성우 내레이션 & BGM 사이드체인 더킹:** 성우 음성 등장 시 BGM 자동 $-10\text{ dB}$ 감쇄, 80Hz 하이패스로 스마트폰 스피커 명료도 극대화.
- **FastStart Moov Atom (`-movflags +faststart`):** 모바일 채팅창 인앱 브라우저에서 0.1초 즉시 무손실 스트리밍.

---

## 🛠️ 3. 빠른 시작 (Quick Start)

### 요구사항 (Prerequisites)
- Python 3.10 이상
- FFmpeg & FFprobe (시스템 PATH 등록)

### 설치 (Installation)
```bash
# 1. 저장소 클론
git clone https://github.com/sunjongos/motion-film.git
cd motion-film

# 2. 필수 패키지 설치 (Playwright, NumPy, SciPy, Pillow)
pip install -r requirements.txt

# 3. Playwright Chromium 브라우저 설치
playwright install chromium
```

---

## 🚀 4. 통합 CLI 사용법 (`motion_film_cli.py`)

복잡한 빌드, 렌더링, 오디오 믹싱 과정을 단 하나의 명령어로 제어할 수 있는 통합 CLI가 기본 탑재되어 있습니다.

```bash
# 1. 새 프로젝트 템플릿 생성 (scene.js 및 비트맵 자동 생성)
python scripts/motion_film_cli.py init my_project

# 2. 2초 만에 전체 비트별 콘택트 시트(preview) 추출
python scripts/motion_film_cli.py stills scene.js --beats

# 3. 60fps 서브프레임 모션 블러 풀 렌더링 + 오디오 믹싱 + 자동 QA 검증
python scripts/motion_film_cli.py render scene.js --out film.mp4 --loop --qa

# 4. 렌더링된 MP4 파일 자동 QA 검사
python scripts/motion_film_cli.py qa film.mp4 --bpm 120 --loop

# 5. 동봉된 14초 60fps 1440x1440 UI Morph Loop 마스터 데모 검증
python scripts/motion_film_cli.py demo
```

---

## 🎬 5. 7단계 프로덕션 파이프라인 (Production Pipeline)

```
[0. Intake] ──▶ 재생시간, BPM, 브랜드 컬러, 핵심 UI 상태 정의
     │
[1. Beat Map] ──▶ beatmap.md 작성: 매 비트마다 시각적 변형 배치 (1초 정지 금지)
     │
[2. Scene Code] ──▶ scene.js 작성: springState, dualEdge, applyCam, drawCursor
     │
[3. Stills QA] ──▶ 2초 만에 contact_sheet.jpg 생성하여 레이아웃/폰트 사전 검증
     │
[4. Audio Peak] ──▶ beats.py 비트 감지 + audio.py 피크 SFX 정렬 (-14 LUFS)
     │
[5. Full Render] ──▶ 3초 단위 독립 청크 렌더링 (중단 시 즉시 재개 가능)
     │
[6. Automated QA] ──▶ qa.py: pops=0, holds=0, loop=ok ➔ verdict: "PASS"
     │
[7. Final Deliver] ──▶ 마스터 MP4 + 단일 HTML 소스 + beatmap.md 동시 보고
```

---

## 📂 6. 디렉터리 구조 (Repository Structure)

```
motion-film/
├── SKILL.md                 # Antigravity/Cursor AGI 전용 에이전트 스킬 명세서
├── README.md                # 레포지토리 메인 문서
├── requirements.txt         # 필수 패키지 목록 (playwright, numpy, scipy, pillow)
├── LICENSE                  # MIT License
├── scripts/
│   ├── motion_film_cli.py   # [핵심] 원클릭 통합 CLI 오케스트레이터
│   ├── engine.js            # 결정론적 캔버스 런타임 (스프링, 모핑, 글래스, 구, 조리개, 커서)
│   ├── build.py             # scene.js + engine.js + Base64 폰트 ➔ 단일 자립형 HTML 컴파일러
│   ├── render.py            # Playwright 60fps 청크 렌더러 & 어셈블러 (Windows/Linux 호환)
│   ├── beats.py             # NumPy 기반 오디오 스펙트럼 분석기 (BPM, 다운비트, 드롭 감지)
│   ├── audio.py             # 피크 측정 기반 SFX 배치 & -14 LUFS 라우드니스 정규화기
│   ├── kakao_audio_master.py # [신규] 카카오톡 모바일 무결점 오디오 마스터러 (48kHz, TP<=-2.5dB, 보컬 더킹)
│   └── qa.py                # 프레임 차분 픽셀 그래디언트 분석기 (Pops, Holds, Loop Seam 검증)
├── examples/
│   ├── ui_morph_loop.js     # 검증된 7마디 원셰이프 UI 모핑 루프 소스코드
│   ├── ui_morph_loop_demo.mp4 # 14초 60fps 1440x1440 마스터 데모 영상
│   ├── launch_film_standalone.js # 27초 54비트 원테이크 제품 런칭 필름
│   ├── ndb_awards_scene.js  # [신규] 2026 NDB 어워즈 90초 2,700프레임 브로드캐스트 마스터 씬
│   └── ndb_awards_contact_sheet.jpg # 14개 주요 키프레임 콘택트 시트
└── references/
    ├── opus-mastery.md      # [필독] Claude Opus 능가 5대 모션 헌법 & 카톡 오디오 표준
    ├── engine-api.md        # 모든 엔진 API 함수 시그니처 및 상세 레퍼런스
    ├── choreography.md      # 비트 맵핑, 전환 어휘, 카메라 트래킹 가이드
    ├── techniques.md        # 리퀴드 글래스, 구(Goo), 조리개(Iris), 드래그 인터랙션 기법
    ├── audio.md             # 비트 그리드 동기화, SFX 측정 피크 배치 지침
    ├── render-qa.md         # 렌더링 수학, QA 차분 메트릭, 성능 벤치마크
    └── brief-templates.md   # 프로덕션 브리프 표준 템플릿
```

---

## 🎯 7. 마스터 데모 영상 스펙 (Reference Demo Spec)

동봉된 `examples/ui_morph_loop_demo.mp4`는 본 엔진의 모든 물리적 특성을 증명하는 기준 영상입니다:

- **해상도:** 1440 × 1440 (Square Keynote Format)
- **프레임레이트:** 60.0 fps (True 4× Subframe Motion Blur, 240Hz 내부 샘플링)
- **재생 시간:** 14.0 초 (28비트, BPM 120 그리드 록)
- **오디오 사양:** AAC 192kbps, -14 LUFS 방송 규격
- **QA 검증 수치:**
  - `Pops (1프레임 튐)`: **0건**
  - `Dead Holds (1초 이상 멈춤)`: **0건**
  - `Loop Seam Difference`: **0.03** (육안 구별 불가능한 완전 무결점 루프)
  - `Verdict`: **PASS**

---

## ⚖️ License

MIT License — Copyright (c) 2026 Sunjo Hong / LCK-Pie Healthcare. 자유로운 상업적 이용 및 확장이 가능합니다.
