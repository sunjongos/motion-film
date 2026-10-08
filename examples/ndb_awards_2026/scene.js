/* =====================================================================
   2026 NDB 남양주백병원 EXCELLENCE AWARDS MOTION FILM (WORLD-BEST)
   "Every pixel is a pure mathematical function of time: P = f(t)"
   Duration: 90.0s (180 beats @ 120 BPM, 45 bars)
   Size: 1440 x 1440, 60fps Broadcast Master
   Design System:
     N (Green):  #8CC63F
     D (Blue):   #008FD5
     B (Orange): #F49820
   ===================================================================== */

const CONFIG = {
  size: 1440,
  dur: 90,
  bpm: 120,
  offset: 0,
  bg: '#FAFAFA',
  fonts: ['600 40px Geist', '800 100px Archivo']
};

const B = n => beat(n);

// Brand Colors
const C_GREEN  = '#8CC63F';
const C_BLUE   = '#008FD5';
const C_ORANGE = '#F49820';
const C_DARK   = '#0F172A';
const C_GRAY   = '#6B7280';
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

// Pre-computed particles for deterministic particle bursts
const PARTICLE_SEED = rng(2026);
const PARTICLES = Array.from({ length: 120 }, () => ({
  ang: PARTICLE_SEED() * TAU,
  spd: 140 + PARTICLE_SEED() * 480,
  size: 4 + PARTICLE_SEED() * 10,
  color: [C_GREEN, C_BLUE, C_ORANGE, C_GOLD][Math.floor(PARTICLE_SEED() * 4)]
}));

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

async function setup() {}

function draw(t) {
  // Continuous Breathing Camera
  const camPulse = 1.0 + Math.sin(t * 0.35) * 0.015;
  X.save();
  applyCam(X, [C, C, camPulse]);

  // Dynamic Background: Light Warm vs Cyber Dark
  drawDynamicBackground(t);

  // Continuous Floating Ambient Particles (Prevents Dead Holds)
  drawFloatingParticles(t);

  // Render Cinematic Acts with Smooth Blending
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
  if (t >= 51.5 && t < 66.5) {
    const a = t < 52.5 ? prog(t, 51.5, 52.5) : (t > 65.5 ? 1 - prog(t, 65.5, 66.5) : 1);
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

  X.restore();
}

/* ---------------------------------------------------------
   0. DYNAMIC BACKGROUND & AMBIENT ENERGY
--------------------------------------------------------- */
function drawDynamicBackground(t) {
  // Dark mode active during Act 4 (52s to 66s)
  const enterDark = smooth(prog(t, 51.2, 52.2));
  const exitDark  = smooth(prog(t, 65.4, 66.4));
  const darkWeight = enterDark * (1 - exitDark);

  if (darkWeight > 0.01) {
    X.fillStyle = '#0F172A';
    X.fillRect(0, 0, S, S);
    if (darkWeight < 0.99) {
      X.fillStyle = `rgba(250, 250, 250, ${1 - darkWeight})`;
      X.fillRect(0, 0, S, S);
    }
  } else {
    X.fillStyle = '#FAFAFA';
    X.fillRect(0, 0, S, S);
  }

  // Soft Ambient Blobs
  const pulse = Math.sin(t * 0.8) * 45;
  const bAlpha = darkWeight > 0.5 ? 0.15 : 0.08;

  // Blue ambient
  const g1 = X.createRadialGradient(280 + pulse, 280, 50, 280, 280, 650);
  g1.addColorStop(0, `rgba(0, 143, 213, ${bAlpha})`);
  g1.addColorStop(1, 'rgba(0, 143, 213, 0)');
  X.fillStyle = g1; X.fillRect(0, 0, S, S);

  // Green ambient
  const g2 = X.createRadialGradient(S - 280, S - 280 - pulse, 50, S - 280, S - 280, 650);
  g2.addColorStop(0, `rgba(140, 198, 63, ${bAlpha})`);
  g2.addColorStop(1, 'rgba(140, 198, 63, 0)');
  X.fillStyle = g2; X.fillRect(0, 0, S, S);

  // Orange ambient
  const g3 = X.createRadialGradient(S - 240, 320, 40, S - 240, 320, 550);
  g3.addColorStop(0, `rgba(244, 152, 32, ${bAlpha * 0.8})`);
  g3.addColorStop(1, 'rgba(244, 152, 32, 0)');
  X.fillStyle = g3; X.fillRect(0, 0, S, S);
}

function drawFloatingParticles(t) {
  X.save();
  for (let i = 0; i < 48; i++) {
    const seed = i * 43.17;
    const py = (seed * 19 + t * 45) % (S + 80) - 40;
    const px = (seed * 89 + Math.sin(t * 0.7 + i) * 80) % S;
    const pRad = 2.5 + (i % 4) * 1.5;
    const col = [C_GREEN, C_BLUE, C_ORANGE][i % 3];
    X.fillStyle = col;
    X.globalAlpha = 0.12 + Math.sin(t * 1.2 + i) * 0.06;
    X.beginPath();
    X.arc(px, py, pRad, 0, TAU);
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
  const ang = sp * TAU * 1.6;
  const radius = lerp(420, 140, eio(prog(t, 1, 5)));

  if (t < 5.5) {
    const colors = [C_GREEN, C_BLUE, C_ORANGE];
    for (let i = 0; i < 3; i++) {
      const a = ang + i * (TAU / 3);
      const px = C + Math.cos(a) * radius;
      const py = C + Math.sin(a) * radius;
      X.fillStyle = colors[i];
      X.beginPath();
      X.arc(px, py, 44, 0, TAU);
      X.fill();
    }
  } else {
    const dockSpring = spring(t, 5.5, 2.4, 0.78, 0.8);
    const cardW = lerp(320, 780, dockSpring);
    const cardH = lerp(120, 220, dockSpring);

    X.fillStyle = '#FFFFFF';
    X.shadowColor = 'rgba(0, 0, 0, 0.06)';
    X.shadowBlur = 40;
    X.shadowOffsetY = 15;
    rrc(X, C, C - 80, cardW, cardH, 36);
    X.fill();
    X.shadowColor = 'transparent';

    X.strokeStyle = 'rgba(0, 0, 0, 0.05)';
    X.lineWidth = 2;
    rrc(X, C, C - 80, cardW, cardH, 36);
    X.stroke();

    const textAlpha = clamp(spring(t, 6.0, 2.6, 0.75, 0.6));
    X.save();
    X.globalAlpha = textAlpha;
    X.font = '900 120px Archivo';
    X.textAlign = 'center';
    X.textBaseline = 'middle';

    const gap = 160;
    X.fillStyle = C_GREEN;  X.fillText('n', C - gap, C - 80);
    X.fillStyle = C_BLUE;   X.fillText('d', C,       C - 80);
    X.fillStyle = C_ORANGE; X.fillText('b', C + gap, C - 80);
    X.restore();
  }

  if (t > 7.5) {
    const titleSpring = spring(t, 7.5, 2.4, 0.76, 0.8);
    const titleY = lerp(C + 160, C + 110, titleSpring);

    X.save();
    X.globalAlpha = titleSpring;
    X.textAlign = 'center';

    X.fillStyle = '#1F2937';
    X.font = '900 52px Archivo';
    X.fillText('남양주백병원', C, titleY);

    X.fillStyle = '#9CA3AF';
    X.font = '700 20px Archivo';
    X.fillText('NDB NAMYANGJU BAEK HOSPITAL', C, titleY + 45);

    if (t > 9.5) {
      const bSpring = spring(t, 9.5, 2.6, 0.75, 0.6);
      const bScale = lerp(0.8, 1.0, bSpring);
      X.save();
      X.translate(C, titleY + 115);
      X.scale(bScale, bScale);
      
      X.fillStyle = '#111827';
      rrc(X, 0, 0, 360, 48, 24);
      X.fill();

      X.fillStyle = '#FFFFFF';
      X.font = '800 17px Archivo';
      X.fillText('2026 EXCELLENCE AWARDS', 0, 5);
      X.restore();
    }
    X.restore();
  }
  X.restore();
}

/* ---------------------------------------------------------
   ACT 2: 2026 HOSPITAL VISION & 3 PILLARS (14s - 28s)
--------------------------------------------------------- */
function drawAct2_Vision(t) {
  X.save();
  const headSpring = spring(t, 14.0, 2.6, 0.75, 0.7);
  X.save();
  X.globalAlpha = headSpring;
  X.textAlign = 'center';
  X.fillStyle = '#111827';
  X.font = '900 48px Archivo';
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
    const cardY = lerp(850, 580, cardSpring);

    X.save();
    X.globalAlpha = clamp(cardSpring);
    X.translate(c.x, cardY);

    X.fillStyle = '#FFFFFF';
    X.shadowColor = 'rgba(0, 0, 0, 0.05)';
    X.shadowBlur = 30;
    X.shadowOffsetY = 12;
    rrc(X, 0, 0, 340, 480, 28);
    X.fill();
    X.shadowColor = 'transparent';

    X.fillStyle = c.color;
    rrc(X, 0, -200, 80, 8, 4);
    X.fill();

    X.fillStyle = c.color;
    X.beginPath();
    X.arc(0, -90, 52, 0, TAU);
    X.fill();

    X.fillStyle = '#FFFFFF';
    X.font = '900 44px Archivo';
    X.textAlign = 'center';
    X.textBaseline = 'middle';
    X.fillText(['N', 'D', 'B'][idx], 0, -88);

    X.fillStyle = '#111827';
    X.font = '800 26px Archivo';
    X.fillText(c.kr, 0, 10);

    X.fillStyle = c.color;
    X.font = '800 16px Archivo';
    X.fillText(c.title, 0, 48);

    X.fillStyle = '#6B7280';
    X.font = '500 18px Archivo';
    wrapText(X, c.sub, 0, 110, 260, 26);
    X.restore();
  });

  if (t > 21) {
    const bannerSpring = spring(t, 21.0, 2.5, 0.75, 0.8);
    X.save();
    X.globalAlpha = bannerSpring;
    X.fillStyle = '#111827';
    rrc(X, C, 980, 860, 84, 42);
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
   Smooth gliding cards without instantaneous pops
--------------------------------------------------------- */
function drawAct3_Showreel(t) {
  X.save();

  X.save();
  X.textAlign = 'center';
  X.fillStyle = '#111827';
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

  X.fillStyle = '#FFFFFF';
  X.shadowColor = 'rgba(0, 0, 0, 0.08)';
  X.shadowBlur = 50;
  X.shadowOffsetY = 20;
  rrc(X, 0, 0, 880, 580, 36);
  X.fill();
  X.shadowColor = 'transparent';

  X.fillStyle = currentAward.color;
  rrc(X, 0, -210, 160, 48, 24);
  X.fill();

  X.fillStyle = '#FFFFFF';
  X.font = '900 20px Archivo';
  X.textAlign = 'center';
  X.textBaseline = 'middle';
  X.fillText(`${currentAward.m}월 AWARDS`, 0, -208);

  X.font = '90px Archivo';
  X.fillText(currentAward.icon, 0, -90);

  X.fillStyle = currentAward.color;
  X.font = '800 24px Archivo';
  X.fillText(`[ ${currentAward.theme} ]`, 0, 10);

  X.fillStyle = '#111827';
  X.font = '900 50px Archivo';
  X.fillText(currentAward.title, 0, 75);

  X.fillStyle = '#4B5563';
  X.font = '600 24px Archivo';
  wrapText(X, `"${currentAward.desc}"`, 0, 145, 680, 34);

  X.fillStyle = '#F3F4F6';
  rrc(X, 0, 230, 720, 60, 30);
  X.fill();

  X.fillStyle = '#1F2937';
  X.font = '800 18px Archivo';
  X.fillText('🎁 포상: 상금 20만원 + 최우수 명예 배지 증정', 0, 232);
  X.restore();

  // Progress Dots
  const dotY = 960;
  const dotSpacing = 42;
  const startX = C - (7 * dotSpacing) / 2;
  for (let i = 0; i < 8; i++) {
    const isCurrent = i === itemIndex;
    X.fillStyle = isCurrent ? MONTHLY_AWARDS[i].color : '#D1D5DB';
    X.beginPath();
    X.arc(startX + i * dotSpacing, dotY, isCurrent ? 10 : 5, 0, TAU);
    X.fill();
  }
  X.restore();
}

/* ---------------------------------------------------------
   ACT 4: SPECIAL AWARD - AI INNOVATION (52s - 66s)
--------------------------------------------------------- */
function drawAct4_SpecialAI(t) {
  X.save();

  // Futuristic HUD Canvas
  X.fillStyle = '#0F172A';
  rrc(X, C, C, 1280, 1280, 48);
  X.fill();

  const glow = X.createRadialGradient(C, 400, 50, C, 400, 600);
  glow.addColorStop(0, 'rgba(0, 143, 213, 0.28)');
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
    X.strokeStyle = 'rgba(255, 255, 255, 0.1)';
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

    X.fillStyle = '#FFFFFF';
    X.font = '900 40px Archivo';
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
    rrc(X, C, 870, 880, 100, 24);
    X.fill();
    X.strokeStyle = C_GOLD;
    X.lineWidth = 2;
    rrc(X, C, 870, 880, 100, 24);
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
  X.fillStyle = '#111827';
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

  X.fillStyle = '#FFFFFF';
  X.shadowColor = 'rgba(0, 0, 0, 0.08)';
  X.shadowBlur = 40;
  X.shadowOffsetY = 15;
  rrc(X, 0, 0, 920, 480, 32);
  X.fill();
  X.shadowColor = 'transparent';

  // Button 1: 우수직원 추천하기 (Blue)
  const b1Clicked = t > 69.0 && t < 70.5;
  const b1Scale = b1Clicked ? 0.94 : 1.0;
  X.save();
  X.translate(-220, 0);
  X.scale(b1Scale, b1Scale);
  X.fillStyle = C_BLUE;
  rrc(X, 0, 0, 360, 100, 24);
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
  rrc(X, 0, 0, 360, 100, 24);
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
    rrc(X, 0, 0, 480, 60, 16);
    X.stroke();

    X.fillStyle = C_ORANGE;
    X.font = '900 22px Archivo';
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

  const confProgress = clamp(prog(t, 78.0, 84.0));
  PARTICLES.forEach(p => {
    const dist = p.spd * confProgress;
    const px = C + Math.cos(p.ang) * dist;
    const py = C + Math.sin(p.ang) * dist + (confProgress * confProgress * 250);
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

  X.font = '900 180px Archivo';
  X.textAlign = 'center';
  X.textBaseline = 'middle';

  const gOffset = 210;
  X.fillStyle = C_GREEN;  X.fillText('n', -gOffset, -30);
  X.fillStyle = C_BLUE;   X.fillText('d', 0,        -30);
  X.fillStyle = C_ORANGE; X.fillText('b', gOffset,  -30);

  X.fillStyle = '#111827';
  X.font = '900 48px Archivo';
  X.fillText('남양주백병원', 0, 130);

  X.fillStyle = C_GRAY;
  X.font = '800 22px Archivo';
  X.fillText('NDB NAMYANGJU BAEK HOSPITAL', 0, 180);
  X.restore();

  if (t > 81.5) {
    const ribbonSpring = spring(t, 81.5, 2.5, 0.75, 0.7);
    X.save();
    X.globalAlpha = ribbonSpring;
    X.fillStyle = '#111827';
    rrc(X, C, 1020, 1000, 96, 48);
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
    X.fillStyle = '#9CA3AF';
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
