/* =====================================================================
   2026 NDB 남양주백병원 EXCELLENCE AWARDS — OPUS-MASTERY MASTER FILM
   "Every pixel is a pure mathematical function of time: P = f(t)"
   Duration: 90.0s (180 beats @ 120 BPM, 45 bars)
   Size: 1440 x 1440, 60fps Broadcast Master
   Design System:
     N (Green):  #8CC63F (긍정, 치유, 생명존중)
     D (Blue):   #008FD5 (신뢰, 첨단의학, 의료지능)
     B (Orange): #F49820 (열정, 활력, 따뜻한동행)
   ===================================================================== */

const CONFIG = {
  size: 1440,
  dur: 90,
  bpm: 120,
  offset: 0,
  bg: '#F8F9FA',
  fonts: ['600 40px Geist', '800 100px Archivo']
};

const B = n => beat(n);

// Brand Tri-Colors
const C_GREEN  = '#8CC63F';
const C_BLUE   = '#008FD5';
const C_ORANGE = '#F49820';
const C_DARK   = '#0F172A';
const C_GRAY   = '#64748B';
const C_GOLD   = '#F59E0B';

// 8 Monthly Themes
const MONTHLY_AWARDS = [
  { m: 5,  theme: '긍정의 힘', title: '백(Baek)만불 미소상', color: C_GREEN,  icon: '😊', desc: '밝은 미소와 친절한 태도로 병원을 밝힌 직원' },
  { m: 6,  theme: '효도와 감사', title: '진심 동행상',       color: C_BLUE,   icon: '🤝', desc: '동료와 협력하고 환자에게 진심을 다해 동행한 직원' },
  { m: 7,  theme: '열정과 도전', title: '에너지 마스터상',   color: C_ORANGE, icon: '⚡', desc: '지치지 않는 열정으로 부서에 활력을 불어넣은 직원' },
  { m: 8,  theme: '배려와 휴식', title: '든든한 동료상',     color: C_GREEN,  icon: '🛡️', desc: '보이지 않는 곳에서 책임감으로 묵묵히 지원한 직원' },
  { m: 9,  theme: '나눔과 풍성', title: '마음 나눔상',       color: C_BLUE,   icon: '🎁', desc: '따뜻한 배려와 봉사 정신으로 나눔을 실천한 직원' },
  { m: 10, theme: '전문과 성장', title: '스마트 프로상(AI)', color: C_ORANGE, icon: '💡', desc: '창의적 AI 혁신으로 업무 효율을 극대화한 직원' },
  { m: 11, theme: '소통과 화합', title: '공감 울림상',       color: C_GREEN,  icon: '💬', desc: '뛰어난 공감 능력으로 부서 간 시너지를 창출한 직원' },
  { m: 12, theme: '결실과 감사', title: '올해의 빛 (Honor)', color: C_GOLD,   icon: '🏆', desc: '한 해 동안 최고의 성과로 모범이 된 최우수 직원' }
];

// Virtual cursor path
const CURSOR_KEYS = [
  [0,   [C, C + 600]],
  [66,  [C, C + 500]],
  [68,  [C - 200, C + 220]], // button 1
  [72,  [C + 200, C + 220]], // button 2
  [76,  [C, C - 40]],        // seal center
  [78,  [C, C + 800]]
];
const CLICKS = [[69.0, 0.25], [73.0, 0.25], [76.0, 0.25]];

// Deterministic Grand Finale Celebration Confetti Particles
const FINALE_PARTICLES = Array.from({ length: 90 }, (_, i) => {
  const ang = (i / 90) * TAU + Math.sin(i * 3.7) * 0.4;
  const spd = 280 + (i % 7) * 90;
  const size = 3 + (i % 6) * 2.5;
  const color = [C_GREEN, C_BLUE, C_ORANGE, C_GOLD, '#FFFFFF'][i % 5];
  return { ang, spd, size, color };
});

// Offscreen Canvas for Procedural Landscape Backdrop
let LANDSCAPE_CANVAS = null;

/* ---------------------------------------------------------
   LIQUID GLASS (Apple Keynote Chromatic Refraction Shader)
   Leverages engine.js glass() with chromatic aberration & rim light
--------------------------------------------------------- */
function drawLiquidGlass(shape, wcx, wcy, o = {}) {
  glass(shape, wcx, wcy, {
    mag: o.mag ?? 1.12,
    emag: o.emag ?? 1.35,
    band: o.band ?? 18,
    tint: o.tint ?? 'rgba(255, 255, 255, 0.45)',
    rim: o.rim ?? 2.8,
    shadow: o.shadow ?? 0.14
  });
}

/* ---------------------------------------------------------
   HEXAGONAL MECHANICAL IRIS APERTURE (Act 3 -> Act 4 Transition)
--------------------------------------------------------- */
function drawIrisAperture(g, cx, cy, R, aperture, rot, col = '#0F172A') {
  if (aperture >= R) return;
  const a = Math.max(aperture, 1);
  const V = [];
  for (let k = 0; k < 6; k++) {
    const an = rot + k * TAU / 6;
    V.push([cx + a * Math.cos(an), cy + a * Math.sin(an)]);
  }
  for (let i = 0; i < 6; i++) {
    const v0 = V[i], v1 = V[(i + 1) % 6];
    const dx = v1[0] - v0[0], dy = v1[1] - v0[1];
    const len = Math.hypot(dx, dy);
    const ex = v1[0] + (dx / len) * R * 1.5;
    const ey = v1[1] + (dy / len) * R * 1.5;
    g.beginPath();
    g.moveTo(v0[0], v0[1]);
    g.lineTo(v1[0], v1[1]);
    g.lineTo(ex, ey);
    g.arc(cx, cy, R * 1.5, Math.atan2(ey - cy, ex - cx), Math.atan2(v0[1] - cy, v0[0] - cx), true);
    g.closePath();
    g.fillStyle = col;
    g.fill();
  }
}

/* ---------------------------------------------------------
   SETUP: PRE-RENDER PROCEDURAL NAMYANGJU MOUNTAIN BACKDROP
--------------------------------------------------------- */
async function setup() {
  const c = mk(S, S);
  const g = c.getContext('2d');
  const R = rng(2026);

  // Morning Sky Gradient
  const sky = g.createLinearGradient(0, 0, 0, S * 0.75);
  sky.addColorStop(0, '#E8F1F8');
  sky.addColorStop(0.5, '#F3F6F9');
  sky.addColorStop(1, '#FFF5EB');
  g.fillStyle = sky;
  g.fillRect(0, 0, S, S);

  // Soft Morning Sun Glow (NDB Warmth)
  const sunGlow = g.createRadialGradient(S * 0.78, S * 0.22, 10, S * 0.78, S * 0.22, 500);
  sunGlow.addColorStop(0, 'rgba(255, 240, 210, 0.85)');
  sunGlow.addColorStop(0.4, 'rgba(244, 152, 32, 0.12)');
  sunGlow.addColorStop(1, 'rgba(244, 152, 32, 0)');
  g.fillStyle = sunGlow;
  g.fillRect(0, 0, S, S);

  // 4 Mountain Ridge Layers (Namyangju Cheonmasan & Han River Valley)
  const ridgeColors = ['#D3DFEC', '#AEC6DC', '#80A5C2', '#527B9B'];
  ridgeColors.forEach((col, k) => {
    const base = S * (0.64 + k * 0.08);
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(0, S);
    for (let x = 0; x <= S; x += 10) {
      const u = x / S;
      const y = base - Math.sin(u * 3.4 + k * 1.8) * (80 - k * 12) - Math.cos(u * 7.2) * (30 - k * 5);
      g.lineTo(x, y);
    }
    g.lineTo(S, S);
    g.closePath();
    g.fill();
  });

  // Fine 35mm Film Grain
  const imgData = g.getImageData(0, 0, S, S);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const noise = (R() - 0.5) * 12;
    d[i] += noise;
    d[i + 1] += noise;
    d[i + 2] += noise;
  }
  g.putImageData(imgData, 0, 0);

  LANDSCAPE_CANVAS = c;
}

/* ---------------------------------------------------------
   MAIN DRAW LOOP — STRICT PURE FUNCTION OF TIME P = f(t)
--------------------------------------------------------- */
function draw(t) {
  // 1. Draw Procedural Horizon Landscape
  if (LANDSCAPE_CANVAS) {
    X.drawImage(LANDSCAPE_CANVAS, 0, 0);
  } else {
    X.fillStyle = '#F8F9FA'; X.fillRect(0, 0, S, S);
  }

  // 2. Continuous Optical Camera Tracking
  const camZoom = 1.0 + Math.sin(t * 0.35) * 0.018 + (t / 90) * 0.04;
  X.save();
  applyCam(X, [C, C, camZoom]);

  // 3. Constant Living Ambient Bokeh Particles (Guarantees 0-Hold)
  drawLivingBokeh(t);

  // 4. Render 6 Cinematic Acts
  if (t < 14.5) {
    const a = t > 13.5 ? 1 - prog(t, 13.5, 14.5) : 1;
    X.save(); X.globalAlpha = a; drawAct1_Genesis(t); X.restore();
  }
  if (t >= 13.5 && t < 28.5) {
    const a = t < 14.5 ? prog(t, 13.5, 14.5) : (t > 27.5 ? 1 - prog(t, 27.5, 28.5) : 1);
    X.save(); X.globalAlpha = a; drawAct2_Vision(t); X.restore();
  }
  if (t >= 27.5 && t < 52.5) {
    const a = t < 28.5 ? prog(t, 27.5, 28.5) : (t > 51.5 ? 1 - prog(t, 51.5, 52.5) : 1);
    X.save(); X.globalAlpha = a; drawAct3_Showreel(t); X.restore();
  }
  if (t >= 51.2 && t < 66.5) {
    const a = t < 52.2 ? prog(t, 51.2, 52.2) : (t > 65.5 ? 1 - prog(t, 65.5, 66.5) : 1);
    X.save(); X.globalAlpha = a; drawAct4_SpecialAI(t); X.restore();
  }
  if (t >= 65.5 && t < 78.5) {
    const a = t < 66.5 ? prog(t, 65.5, 66.5) : (t > 77.5 ? 1 - prog(t, 77.5, 78.5) : 1);
    X.save(); X.globalAlpha = a; drawAct5_Governance(t); X.restore();
  }
  if (t >= 77.5) {
    const a = t < 78.5 ? prog(t, 77.5, 78.5) : 1;
    X.save(); X.globalAlpha = a; drawAct6_GrandFinale(t); X.restore();
  }

  // 5. Mechanical Iris Transition at t=51.8 ~ 52.5s (White -> Dark)
  if (t >= 51.5 && t <= 52.8) {
    const ap = eio(1 - prog(t, 51.5, 52.1)) * (S * 0.85);
    const rot = (t - 51.5) * 1.8;
    drawIrisAperture(X, C, C, S * 0.9, ap, rot, C_DARK);
  }
  // Iris Opening at t=65.5 ~ 66.5s (Dark -> Light)
  if (t >= 65.5 && t <= 66.6) {
    const ap = eo5(prog(t, 65.6, 66.4)) * (S * 0.95);
    const rot = -(t - 65.5) * 1.5;
    drawIrisAperture(X, C, C, S * 0.95, ap, rot, '#F8F9FA');
  }

  X.restore();
}

/* ---------------------------------------------------------
   LIVING AMBIENT BOKEH (Guarantees Frame Differences)
--------------------------------------------------------- */
function drawLivingBokeh(t) {
  X.save();
  for (let i = 0; i < 52; i++) {
    const seed = i * 67.31;
    const py = (seed * 23 + t * 50) % (S + 120) - 60;
    const px = (seed * 103 + Math.sin(t * 0.8 + i) * 90) % S;
    const rad = 3.0 + (i % 5) * 2.2;
    const col = [C_GREEN, C_BLUE, C_ORANGE, C_GOLD][i % 4];
    X.fillStyle = col;
    X.globalAlpha = 0.16 + Math.sin(t * 1.4 + i) * 0.08;
    X.beginPath();
    X.arc(px, py, rad, 0, TAU);
    X.fill();
  }
  X.restore();
}

/* ---------------------------------------------------------
   ACT 1: NDB BRAND GENESIS (0s - 14s)
--------------------------------------------------------- */
function drawAct1_Genesis(t) {
  X.save();
  const sp = prog(t, 0, 4.5);
  const ang = sp * TAU * 1.8;
  const radius = lerp(460, 140, eio(prog(t, 1, 5)));

  if (t < 5.5) {
    const colors = [C_GREEN, C_BLUE, C_ORANGE];
    for (let i = 0; i < 3; i++) {
      const a = ang + i * (TAU / 3);
      const px = C + Math.cos(a) * radius;
      const py = C + Math.sin(a) * radius;
      X.fillStyle = colors[i];
      X.beginPath();
      X.arc(px, py, 46, 0, TAU);
      X.fill();
    }
  } else {
    const dockSpring = spring(t, 5.5, 2.4, 0.78, 0.8);
    const cardW = lerp(320, 800, dockSpring);
    const cardH = lerp(120, 240, dockSpring);

    // Liquid Glass Card
    drawLiquidGlass((g, mode) => {
      rrc(g, C, C - 80, cardW, cardH, 40);
    }, C, C - 80, { mag: 1.15, emag: 1.35, rim: 3, shadow: 0.15 });

    // Letters "n d b"
    const textAlpha = clamp(spring(t, 6.0, 2.6, 0.75, 0.6));
    X.save();
    X.globalAlpha = textAlpha;
    X.font = '900 130px Archivo';
    X.textAlign = 'center';
    X.textBaseline = 'middle';

    const gap = 168;
    X.fillStyle = C_GREEN;  X.fillText('n', C - gap, C - 80);
    X.fillStyle = C_BLUE;   X.fillText('d', C,       C - 80);
    X.fillStyle = C_ORANGE; X.fillText('b', C + gap, C - 80);
    X.restore();
  }

  if (t > 7.5) {
    const titleSpring = spring(t, 7.5, 2.4, 0.76, 0.8);
    const titleY = lerp(C + 170, C + 120, titleSpring);

    X.save();
    X.globalAlpha = titleSpring;
    X.textAlign = 'center';

    X.fillStyle = '#0F172A';
    X.font = '900 54px Archivo';
    X.fillText('남양주백병원', C, titleY);

    X.fillStyle = '#64748B';
    X.font = '700 20px Archivo';
    X.fillText('NDB NAMYANGJU BAEK HOSPITAL', C, titleY + 46);

    if (t > 9.5) {
      const bSpring = spring(t, 9.5, 2.6, 0.75, 0.6);
      const bScale = lerp(0.8, 1.0, bSpring);
      X.save();
      X.translate(C, titleY + 120);
      X.scale(bScale, bScale);
      
      X.fillStyle = '#0F172A';
      rrc(X, 0, 0, 380, 52, 26);
      X.fill();

      X.fillStyle = '#FFFFFF';
      X.font = '800 18px Archivo';
      X.fillText('2026 EXCELLENCE AWARDS', 0, 6);
      X.restore();
    }
    X.restore();
  }
  X.restore();
}

/* ---------------------------------------------------------
   ACT 2: 2026 VISION & 3 PILLARS (14s - 28s)
--------------------------------------------------------- */
function drawAct2_Vision(t) {
  X.save();
  const headSpring = spring(t, 14.0, 2.6, 0.75, 0.7);
  X.save();
  X.globalAlpha = headSpring;
  X.textAlign = 'center';
  X.fillStyle = '#0F172A';
  X.font = '900 50px Archivo';
  X.fillText('2026 NDB 핵심 가치 & 비전', C, 220);

  X.fillStyle = C_GRAY;
  X.font = '600 22px Archivo';
  X.fillText('환자를 위한 365일 진심, 의료진의 헌신과 혁신', C, 268);
  X.restore();

  const cards = [
    { title: 'CARE & LIFE', kr: '생명 존중과 치유', color: C_GREEN,  sub: '환자 중심의 따뜻한 의료 케어', x: C - 390 },
    { title: 'INTELLIGENCE', kr: '신뢰와 첨단 의학', color: C_BLUE,   sub: 'AI 기반 정밀 진단 및 업무 혁신', x: C },
    { title: 'WARMTH',       kr: '동행과 열정',     color: C_ORANGE, sub: '동료를 향한 배려와 부서 간 화합', x: C + 390 }
  ];

  cards.forEach((c, idx) => {
    const cardTime = 15.2 + idx * 1.4;
    const cardSpring = spring(t, cardTime, 2.4, 0.76, 0.7);
    const cardY = lerp(860, 580, cardSpring);

    X.save();
    X.globalAlpha = clamp(cardSpring);
    X.translate(c.x, cardY);

    // Liquid Glass Card Surface
    drawLiquidGlass((g) => {
      rrc(g, 0, 0, 340, 490, 32);
    }, c.x, cardY, { mag: 1.1, emag: 1.3, rim: 2.5, tint: 'rgba(255,255,255,0.75)' });

    // Accent Pill
    X.fillStyle = c.color;
    rrc(X, 0, -205, 90, 8, 4);
    X.fill();

    // Circle Monogram
    X.fillStyle = c.color;
    X.beginPath();
    X.arc(0, -90, 54, 0, TAU);
    X.fill();

    X.fillStyle = '#FFFFFF';
    X.font = '900 46px Archivo';
    X.textAlign = 'center';
    X.textBaseline = 'middle';
    X.fillText(['N', 'D', 'B'][idx], 0, -88);

    X.fillStyle = '#0F172A';
    X.font = '800 26px Archivo';
    X.fillText(c.kr, 0, 10);

    X.fillStyle = c.color;
    X.font = '800 16px Archivo';
    X.fillText(c.title, 0, 48);

    X.fillStyle = '#475569';
    X.font = '500 18px Archivo';
    wrapText(X, c.sub, 0, 110, 260, 26);
    X.restore();
  });

  if (t > 21) {
    const bannerSpring = spring(t, 21.0, 2.5, 0.75, 0.8);
    X.save();
    X.globalAlpha = bannerSpring;
    X.fillStyle = '#0F172A';
    rrc(X, C, 980, 880, 86, 43);
    X.fill();

    X.fillStyle = '#FFFFFF';
    X.font = '800 24px Archivo';
    X.textAlign = 'center';
    X.textBaseline = 'middle';
    X.fillText('✨ 2026년 매월 이달의 빛나는 우수직원 & 우수부서 시상', C, 980);
    X.restore();
  }
  X.restore();
}

/* ---------------------------------------------------------
   ACT 3: 8 MONTHLY AWARDS SHOWREEL (28s - 52s)
--------------------------------------------------------- */
function drawAct3_Showreel(t) {
  X.save();

  X.save();
  X.textAlign = 'center';
  X.fillStyle = '#0F172A';
  X.font = '900 48px Archivo';
  X.fillText('2026 NDB 이달의 빛나는 직원 (5월 ~ 12월)', C, 190);
  X.fillStyle = C_GRAY;
  X.font = '600 20px Archivo';
  X.fillText('매월 병원을 빛낸 자랑스러운 주역들을 기립니다', C, 235);
  X.restore();

  const relTime = Math.max(0, t - 28.0);
  const rawIdx = relTime / 2.75;
  const itemIndex = Math.max(0, Math.min(7, Math.floor(rawIdx)));
  const subProg = clamp(rawIdx - Math.floor(rawIdx), 0, 1);

  // Smooth slide-in spring from right to center
  const enterSpring = spring(subProg, 0, 2.8, 0.78, 0.6);
  const exitSpring  = subProg > 0.85 ? prog(subProg, 0.85, 1.0) : 0;

  const currentAward = MONTHLY_AWARDS[itemIndex];
  const cardX = lerp(C + 280, C, enterSpring) - (exitSpring * 280);
  const cardAlpha = clamp(enterSpring * (1 - exitSpring * 0.9));

  X.save();
  X.globalAlpha = cardAlpha;
  X.translate(cardX, 580);

  // Liquid Glass Hero Card
  drawLiquidGlass((g) => {
    rrc(g, 0, 0, 900, 590, 40);
  }, cardX, 580, { mag: 1.15, emag: 1.35, rim: 3, tint: 'rgba(255,255,255,0.85)' });

  // Month Badge
  X.fillStyle = currentAward.color;
  rrc(X, 0, -215, 170, 50, 25);
  X.fill();

  X.fillStyle = '#FFFFFF';
  X.font = '900 22px Archivo';
  X.textAlign = 'center';
  X.textBaseline = 'middle';
  X.fillText(`${currentAward.m}월 AWARDS`, 0, -213);

  // Icon
  X.font = '94px Archivo';
  X.fillText(currentAward.icon, 0, -90);

  // Theme & Title
  X.fillStyle = currentAward.color;
  X.font = '800 24px Archivo';
  X.fillText(`[ ${currentAward.theme} ]`, 0, 10);

  X.fillStyle = '#0F172A';
  X.font = '900 52px Archivo';
  X.fillText(currentAward.title, 0, 75);

  X.fillStyle = '#334155';
  X.font = '600 24px Archivo';
  wrapText(X, `"${currentAward.desc}"`, 0, 145, 700, 34);

  // Prize Pill
  X.fillStyle = '#F1F5F9';
  rrc(X, 0, 235, 740, 62, 31);
  X.fill();

  X.fillStyle = '#0F172A';
  X.font = '800 18px Archivo';
  X.fillText('🎁 포상: 상금 20만원 지원 + 최우수 명예 배지 증정', 0, 237);
  X.restore();

  // Progress Dots
  const dotY = 960;
  const dotSpacing = 44;
  const startX = C - (7 * dotSpacing) / 2;
  for (let i = 0; i < 8; i++) {
    const isCurrent = i === itemIndex;
    X.fillStyle = isCurrent ? MONTHLY_AWARDS[i].color : '#CBD5E1';
    X.beginPath();
    X.arc(startX + i * dotSpacing, dotY, isCurrent ? 11 : 5.5, 0, TAU);
    X.fill();
  }
  X.restore();
}

/* ---------------------------------------------------------
   ACT 4: SPECIAL AWARD - AI INNOVATION (52s - 66s)
--------------------------------------------------------- */
function drawAct4_SpecialAI(t) {
  X.save();

  // Cyber Dark Glass Panel
  X.fillStyle = '#0F172A';
  rrc(X, C, C, 1300, 1300, 48);
  X.fill();

  const glow = X.createRadialGradient(C, 400, 50, C, 400, 650);
  glow.addColorStop(0, 'rgba(0, 143, 213, 0.32)');
  glow.addColorStop(1, 'rgba(15, 23, 42, 0)');
  X.fillStyle = glow;
  X.fillRect(C - 600, 100, 1200, 800);

  const titleSpring = spring(t, 52.0, 2.6, 0.75, 0.6);
  X.save();
  X.globalAlpha = titleSpring;
  X.textAlign = 'center';

  X.fillStyle = C_ORANGE;
  X.font = '800 20px Archivo';
  X.fillText('2026 NDB SPECIAL CATEGORY', C, 220);

  X.fillStyle = '#FFFFFF';
  X.font = '900 52px Archivo';
  X.fillText('특별상 : AI 선도 혁신상', C, 280);

  X.fillStyle = '#94A3B8';
  X.font = '600 22px Archivo';
  X.fillText('의료 혁신과 지능형 병원 업무 고도화를 이끈 인재', C, 328);
  X.restore();

  const metrics = [
    { label: '업무 지능화', pct: 40, color: C_BLUE,   x: C - 340, desc: 'AI 툴 및 자동화 도입' },
    { label: '팀워크 / 전파력', pct: 30, color: C_GREEN,  x: C,       desc: '조직 내 지식 전파 및 협업' },
    { label: '데이터 활용도', pct: 30, color: C_ORANGE, x: C + 340, desc: '데이터 기반 환자 케어' }
  ];

  metrics.forEach((m, idx) => {
    const ringTime = 53.5 + idx * 1.4;
    const ringSpring = spring(t, ringTime, 2.4, 0.74, 0.6);

    X.save();
    X.globalAlpha = clamp(ringSpring);
    X.translate(m.x, 560);

    X.fillStyle = 'rgba(255, 255, 255, 0.05)';
    rrc(X, 0, 0, 300, 380, 24);
    X.fill();
    X.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    X.lineWidth = 1.5;
    rrc(X, 0, 0, 300, 380, 24);
    X.stroke();

    X.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    X.lineWidth = 14;
    X.beginPath();
    X.arc(0, -50, 75, 0, TAU);
    X.stroke();

    const currentAngle = (m.pct / 100) * TAU * ringSpring;
    X.strokeStyle = m.color;
    X.lineCap = 'round';
    X.lineWidth = 14;
    X.beginPath();
    X.arc(0, -50, 75, -PI / 2, -PI / 2 + currentAngle);
    X.stroke();

    // Rolling Percentage Counter
    X.fillStyle = '#FFFFFF';
    X.font = '900 42px Archivo';
    X.textAlign = 'center';
    X.textBaseline = 'middle';
    X.fillText(`${Math.round(m.pct * ringSpring)}%`, 0, -48);

    X.fillStyle = '#FFFFFF';
    X.font = '800 24px Archivo';
    X.fillText(m.label, 0, 70);

    X.fillStyle = '#94A3B8';
    X.font = '500 16px Archivo';
    X.fillText(m.desc, 0, 110);
    X.restore();
  });

  if (t > 59.5) {
    const pkgSpring = spring(t, 59.5, 2.4, 0.75, 0.7);
    X.save();
    X.globalAlpha = pkgSpring;
    X.fillStyle = 'rgba(245, 158, 11, 0.15)';
    rrc(X, C, 870, 900, 100, 24);
    X.fill();
    X.strokeStyle = C_GOLD;
    X.lineWidth = 2;
    rrc(X, C, 870, 900, 100, 24);
    X.stroke();

    X.fillStyle = C_GOLD;
    X.font = '900 28px Archivo';
    X.textAlign = 'center';
    X.textBaseline = 'middle';
    X.fillText('👑 포상 혜택 : 상금 20만원 + 최고 명예 배지 + 부서 회식 지원', C, 870);
    X.restore();
  }
  X.restore();
}

/* ---------------------------------------------------------
   ACT 5: GOVERNANCE & NOMINATION (66s - 78s)
--------------------------------------------------------- */
function drawAct5_Governance(t) {
  X.save();

  X.save();
  X.textAlign = 'center';
  X.fillStyle = '#0F172A';
  X.font = '900 48px Archivo';
  X.fillText('참여와 공정의 2026 NDB 어워즈', C, 220);

  X.fillStyle = C_GRAY;
  X.font = '600 22px Archivo';
  X.fillText('동료들의 따뜻한 추천과 투명한 경영진 심사 시스템', C, 270);
  X.restore();

  const portalSpring = spring(t, 66.5, 2.4, 0.75, 0.7);
  X.save();
  X.translate(C, 560);
  X.scale(lerp(0.9, 1.0, portalSpring), lerp(0.9, 1.0, portalSpring));

  // Liquid Glass Background
  drawLiquidGlass((g) => {
    rrc(g, 0, 0, 940, 500, 36);
  }, C, 560, { mag: 1.12, emag: 1.3, rim: 3, tint: 'rgba(255,255,255,0.85)' });

  // Button 1: 우수직원 추천하기 (Blue)
  const b1Clicked = t > 69.0 && t < 70.5;
  const b1Scale = b1Clicked ? 0.94 : 1.0;
  X.save();
  X.translate(-220, 0);
  X.scale(b1Scale, b1Scale);
  X.fillStyle = C_BLUE;
  rrc(X, 0, 0, 370, 104, 26);
  X.fill();

  X.fillStyle = '#FFFFFF';
  X.font = '800 24px Archivo';
  X.textAlign = 'center';
  X.textBaseline = 'middle';
  X.fillText('🧑‍💼 우수직원 추천하기', 0, 0);
  X.restore();

  // Button 2: 우수부서 추천하기 (Green)
  const b2Clicked = t > 73.0 && t < 74.5;
  const b2Scale = b2Clicked ? 0.94 : 1.0;
  X.save();
  X.translate(220, 0);
  X.scale(b2Scale, b2Scale);
  X.fillStyle = C_GREEN;
  rrc(X, 0, 0, 370, 104, 26);
  X.fill();

  X.fillStyle = '#FFFFFF';
  X.font = '800 24px Archivo';
  X.textAlign = 'center';
  X.textBaseline = 'middle';
  X.fillText('🏢 우수부서 추천하기', 0, 0);
  X.restore();

  // Stamp: 공식 승인 의결
  if (t > 75.5) {
    const stampSpring = spring(t, 75.5, 3.0, 0.75, 0.6);
    X.save();
    X.translate(0, 140);
    X.rotate(-0.06);
    X.scale(lerp(1.6, 1.0, stampSpring), lerp(1.6, 1.0, stampSpring));

    X.strokeStyle = C_ORANGE;
    X.lineWidth = 4;
    rrc(X, 0, 0, 500, 64, 18);
    X.stroke();

    X.fillStyle = C_ORANGE;
    X.font = '900 23px Archivo';
    X.textAlign = 'center';
    X.textBaseline = 'middle';
    X.fillText('⚖️ 2026 경영진 심사위원회 공식 의결', 0, 0);
    X.restore();
  }
  X.restore();

  drawCursor(X, t, CURSOR_KEYS, CLICKS);
  X.restore();
}

/* ---------------------------------------------------------
   ACT 6: GRAND FINALE CEREMONY (78s - 90s)
--------------------------------------------------------- */
function drawAct6_GrandFinale(t) {
  X.save();

  // Confetti Shower
  const confProgress = clamp(prog(t, 78.0, 84.0));
  FINALE_PARTICLES.forEach(p => {
    const dist = p.spd * confProgress;
    const px = C + Math.cos(p.ang) * dist;
    const py = C + Math.sin(p.ang) * dist + (confProgress * confProgress * 260);
    X.fillStyle = p.color;
    X.beginPath();
    X.arc(px, py, p.size * (1 - confProgress * 0.4), 0, TAU);
    X.fill();
  });

  const grandSpring = spring(t, 78.5, 2.4, 0.78, 0.7);
  const zoom = lerp(0.85, 1.0, grandSpring);

  X.save();
  X.translate(C, C - 60);
  X.scale(zoom, zoom);

  X.font = '900 190px Archivo';
  X.textAlign = 'center';
  X.textBaseline = 'middle';

  const gOffset = 220;
  X.fillStyle = C_GREEN;  X.fillText('n', -gOffset, -30);
  X.fillStyle = C_BLUE;   X.fillText('d', 0,        -30);
  X.fillStyle = C_ORANGE; X.fillText('b', gOffset,  -30);

  X.fillStyle = '#0F172A';
  X.font = '900 50px Archivo';
  X.fillText('남양주백병원', 0, 136);

  X.fillStyle = C_GRAY;
  X.font = '800 22px Archivo';
  X.fillText('NDB NAMYANGJU BAEK HOSPITAL', 0, 186);
  X.restore();

  if (t > 81.5) {
    const ribbonSpring = spring(t, 81.5, 2.5, 0.75, 0.7);
    X.save();
    X.globalAlpha = ribbonSpring;
    X.fillStyle = '#0F172A';
    rrc(X, C, 1020, 1020, 96, 48);
    X.fill();

    X.fillStyle = C_GOLD;
    X.font = '900 32px Archivo';
    X.textAlign = 'center';
    X.textBaseline = 'middle';
    X.fillText('✨ "빛나는 당신이 남양주백병원의 자부심입니다" ✨', C, 1020);
    X.restore();
  }

  if (t > 84.5) {
    const tagSpring = spring(t, 84.5, 2.6, 0.75, 0.7);
    X.save();
    X.globalAlpha = tagSpring;
    X.fillStyle = '#64748B';
    X.font = '700 18px Archivo';
    X.textAlign = 'center';
    X.fillText('2026 NDB EXCELLENCE AWARDS — 365 DAYS OF DEDICATION & EXCELLENCE', C, 1140);
    X.restore();
  }
  X.restore();
}

/* ---------------------------------------------------------
   HELPER UTILITIES
--------------------------------------------------------- */
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let curY = y;
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, curY);
      line = words[n] + ' ';
      curY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, curY);
}
