# 👑 Opus-Level Motion Design Mastery Guide (월드베스트 자가발전 표준)

> **"If it looks like a template, you failed. If every pixel breathes with physics, optical depth, and continuous morphing, it is art."**  
> Claude 3.7 Opus 및 세계 최고 수준의 모션 디자이너들이 구사하는 5대 초격차 모션 엔지니어링 원칙.

---

## Ⅰ. 5대 불변 모션 헌법 (The 5 Invariants)

### 1. [연속 변형 원칙] Never Cut, Never Crossfade — Always Morph
- **원칙:** 씬과 씬 사이에 단순 컷(`cut`), 페이드(`fade`), 디졸브(`crossfade`), 블러-인(`blur-in`)을 절대 사용하지 않습니다.
- **실행:** 화면 위의 모든 새로운 객체는 **반드시 이전 프레임에 존재하던 객체의 물리적 변형(Morph)**이어야 합니다:
  - 점(Dot) ➔ 알약(Pill) ➔ 카드(Card) ➔ 육각 조리개(Iris) ➔ 대시보드(Grid) ➔ 트로피 엠블럼(Monogram).
  - 씬 전환이 필요할 때는 **기계식 조리개(`iris`)의 폐쇄/개방**, **블랙 플러드(Flood) ➔ 수축(Contract)**, 또는 **스프링 상태 전이(`springState`)**를 사용합니다.

### 2. [광학 뎁스] Apple Keynote Liquid Glass & Chromatic Rim
- **원칙:** 평면 벡터 카드는 단조롭고 템플릿처럼 보입니다. 실시간 씬 캡처(`snap()`)와 광학 굴절을 적용합니다.
- **실행:**
  - **내부 확대 굴절 (Magnification):** 글래스 내부의 배경을 $1.08 \sim 1.18\times$ 확대하여 입체감 부여.
  - **색수차 림 (Chromatic Aberration):** 테두리 밴드에서 Red(+1.2%)와 Blue(-1.2%) 채널을 미세하게 분리하여 프리즘 굴절 시뮬레이션.
  - **대각 스페큘러 림 라이트 (Diagonal Rim Light):** 좌상단(Bright 0.95)에서 우하단(Dimmer 0.15)으로 흐르는 선형 그라디언트 스트로크.
  - **소프트 다층 그림자 (Multi-layer Ambient Shadow):** $Y+14\text{px}$, Blur $36\text{px}$의 부드러운 앰비언트 오클루전.

### 3. [살아있는 배경] Procedural Ambient Parallax & Grain
- **원칙:** 완전 단색(#FFF, #000) 배경은 정적이고 죽은 프레임(Dead Time)을 만듭니다.
- **실행:**
  - 절차적 능선/산/빛 번짐 (`makePhoto` / `proceduralBackdrop`)을 캔버스 최하단에 배치.
  - $t$의 삼각함수($\sin(t), \cos(t)$)로 유영하는 미세 파티클(Floating Bokeh Dust) 40~60개를 상시 가동하여 픽셀 미분 에너지 보장.
  - 미세 필름 그레인(Film Grain, $\pm 8\text{LSB}$)을 적용하여 밴딩 현상(Color Banding)을 원천 차단.

### 4. [동적 카메라 보정] Size-Compensated Optical Framing
- **원칙:** 요소의 크기가 변할 때 화면이 텅 비거나 넘치지 않도록 카메라가 능동 추적해야 합니다.
- **실행:**
  - $zoom = \left(\frac{S \times 0.72}{\max(w, h)}\right)^{0.75}$ 수식을 통해 객체가 항상 화면의 $65 \sim 75\%$를 황금 비율로 점유하도록 자동 보정.
  - 커서의 직접 조작(드래그, 클릭) 시 카메라가 순간적으로 $1.05 \sim 1.10\times$ 푸시-인(Push-in)되었다가 릴리즈 시 복귀.

### 5. [키네틱 타이포] Spring Elasticity & Rolling Counters
- **원칙:** 글자가 툭 나타나면 Pop 에러가 발생합니다.
- **실행:**
  - 텍스트는 반드시 자체 엔터/엑시트 타이밍을 가지며, `eback(x, 1.4)`를 통해 미세한 오버슈트로 도착.
  - 숫자는 `Math.round(lerp(0, target, spring(t, ...)))`로 부드럽게 롤링 카운팅.
  - 어코디언 스퀴즈(Accordion Squeeze): 단어 전체가 중앙 점으로 응축되었다가 펼쳐지는 물리감 구현.

---

## Ⅱ. 자동 검증 수치 기준 (World-Best Metric Gate)

1. `pops`: **0건** (단일 프레임 스파이크 전무)
2. `holds`: **0건** (>1.0초 정지 전무, 상시 유영 파티클 & 카메라 브리딩)
3. `loop`: **ok = true** (시작과 끝의 100% 매끄러운 연속성)
4. `verdict`: **PASS 필수**
