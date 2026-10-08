/* LAUNCH FILM (27 s, 54 beats @120) — standalone, pre-engine version.
   It defines its own helpers (X, spr, glass, iris, ...) and does NOT run through build.py
   as-is. Use it as a choreography/technique reference: acts act1..act6, the beat timing,
   iris/goo/glass usage, the flood -> contract handoffs and the loop closure.
   To reuse: port act functions onto engine helpers (spring/springTo, glass, gooGlass,
   iris, wordmarkLayout/drawWordmark, cursorAt/drawCursor, camAt/applyCam). */
// ============ FRAME. launch film — every pixel is a pure function of t ============
const S = 1440, C = 720, PI = Math.PI, TAU = PI * 2, DUR = 27.0;
const INK = '#0B0B0C', PAPER = '#F4F1EA';
const cv = document.getElementById('c'); const X = cv.getContext('2d');
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const prog = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, x) => a + (b - a) * x;
const eio = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const eo = x => 1 - Math.pow(1 - x, 3);
const eo5 = x => 1 - Math.pow(1 - x, 5);
const ei = x => x * x * x;
const eback = (x, s = 1.6) => { const c = s + 1; return 1 + c * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); };
// closed-form spring step response, forced to settle exactly by t0+1.0s
function spr(t, t0, f = 2.2, z = 0.6) {
  if (t <= t0) return 0; const x = t - t0; if (x >= 1.0) return 1;
  const w = TAU * f, wd = w * Math.sqrt(1 - z * z);
  const s = 1 - Math.exp(-z * w * x) * (Math.cos(wd * x) + z * w / wd * Math.sin(wd * x));
  const k = prog(x, 0.6, 1.0); const sm = k * k * (3 - 2 * k);
  return s + (1 - s) * sm;
}
// value with many targets = sum of one spring per change
function sv(t, v0, ch) { let v = v0, p = v0; for (const c of ch) { v += (c[1] - p) * spr(t, c[0], c[2] || 2.2, c[3] || 0.6); p = c[1]; } return v; }
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function rr(g, x, y, w, h, r) {
  w = Math.max(w, 0); h = Math.max(h, 0); r = Math.max(0, Math.min(r, w / 2, h / 2));
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function rrc(g, cx, cy, w, h, r) { rr(g, cx - w / 2, cy - h / 2, w, h, r); }
function cover(g, img, x, y, w, h, squish = false) {
  if (w <= 0.5 || h <= 0.5) return;
  if (squish) { g.drawImage(img, x, y, w, h); return; }
  const iw = img.width, ih = img.height, s = Math.max(w / iw, h / ih);
  const sw = w / s, sh = h / s; g.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, x, y, w, h);
}
function font(g, px, fam = 'Geist', wt = 600, stretch = 'normal') { g.font = `${wt} ${px}px ${fam}`; g.fontStretch = stretch; }
function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const pt = (M, x, y) => { const p = M.transformPoint(new DOMPoint(x, y)); return [p.x, p.y]; };

// ============ PHOTOS (procedural stand-ins, aligned day/golden pair) ============
const PH = []; let GOLD;
function ridge(R, N, base, amp, rough) {
  const ph = [R() * 9, R() * 9, R() * 9, R() * 9]; const pts = [];
  for (let x = 0; x <= N; x += 6) {
    const u = x / N;
    let y = base - amp * (0.55 * Math.sin(u * 3.1 + ph[0]) + 0.3 * Math.sin(u * 7.3 + ph[1]) + rough * 0.12 * Math.sin(u * 23 + ph[2]) + rough * 0.06 * Math.sin(u * 51 + ph[3]));
    y -= amp * 0.6 * Math.exp(-Math.pow((u - 0.35 - ph[0] % 0.3) * 4, 2));
    pts.push([x, y]);
  } return pts;
}
function makePhoto(sp, P) {
  const N = 1200, c = mk(N, N), g = c.getContext('2d'); const R = rng(sp.seed);
  let gr = g.createLinearGradient(0, 0, 0, N * sp.hz); gr.addColorStop(0, P.sky[0]); gr.addColorStop(1, P.sky[1]);
  g.fillStyle = gr; g.fillRect(0, 0, N, N);
  if (sp.stars) { for (let i = 0; i < 380; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + R() * 0.7})`; const s = R() * 2.2 + .5; g.fillRect(R() * N, R() * N * sp.hz, s, s); } }
  if (P.sun) {
    const [sx, sy, sr, col] = P.sun;
    const h = g.createRadialGradient(sx * N, sy * N, 0, sx * N, sy * N, sr * N * 5);
    h.addColorStop(0, col + 'aa'); h.addColorStop(1, col + '00'); g.fillStyle = h; g.fillRect(0, 0, N, N);
    g.fillStyle = col; g.beginPath(); g.arc(sx * N, sy * N, sr * N, 0, TAU); g.fill();
  }
  if (sp.city) {
    const R2 = rng(sp.seed + 9); let x = 0;
    while (x < N) {
      const w = 40 + R2() * 90, h = 120 + R2() * 380; g.fillStyle = P.layers[0]; g.fillRect(x, N * sp.hz - h, w + 1, h + N);
      for (let wy = N * sp.hz - h + 14; wy < N * sp.hz - 10; wy += 22) for (let wx = x + 8; wx < x + w - 10; wx += 16)
        if (R2() < 0.33) { g.fillStyle = 'rgba(255,214,150,0.85)'; g.fillRect(wx, wy, 7, 10); }
      x += w + 4;
    }
  }
  P.layers.forEach((col, k) => {
    if (sp.city) return;
    const base = N * (sp.hz - 0.22 + k * (0.24 / P.layers.length) + (sp.water ? 0 : k * 0.08));
    const pts = ridge(R, N, base + N * 0.05, N * (0.16 - k * 0.025) * sp.amp, 1 + k);
    g.fillStyle = col; g.beginPath(); g.moveTo(0, N); pts.forEach(p => g.lineTo(p[0], p[1])); g.lineTo(N, N); g.closePath(); g.fill();
    const hz = g.createLinearGradient(0, base - N * 0.2, 0, N);
    hz.addColorStop(0, P.sky[1] + '00'); hz.addColorStop(1, P.sky[1] + (k < P.layers.length - 1 ? '33' : '00'));
  });
  if (sp.field) {
    const cols = sp.field; for (let i = 0; i < 26; i++) {
      const y0 = N * 0.62 + Math.pow(i / 26, 1.7) * N * 0.4, y1 = N * 0.62 + Math.pow((i + 1) / 26, 1.7) * N * 0.4;
      g.fillStyle = cols[i % cols.length]; g.fillRect(0, y0, N, y1 - y0 + 1);
    }
  }
  if (sp.water) {
    const wy = N * sp.hz; const wg = g.createLinearGradient(0, wy, 0, N);
    wg.addColorStop(0, P.water[0]); wg.addColorStop(1, P.water[1]); g.fillStyle = wg; g.fillRect(0, wy, N, N - wy);
    for (let i = 0; i < 260; i++) {
      const y = wy + Math.pow(R(), 1.6) * (N - wy), w = 20 + R() * 160 * (y - wy) / (N - wy) + 10;
      const sx = P.sun ? P.sun[0] * N : N / 2; const x = sx + (R() - 0.5) * (P.sun ? 260 : N);
      g.fillStyle = `rgba(255,${P.sun ? 220 : 255},${P.sun ? 170 : 255},${0.08 + R() * 0.25})`; g.fillRect(x - w / 2, y, w, 2 + R() * 2);
    }
  }
  if (sp.rocks) { g.fillStyle = sp.rocks; g.beginPath(); g.moveTo(0, N); g.lineTo(0, N * 0.66); g.quadraticCurveTo(N * 0.12, N * 0.6, N * 0.26, N * 0.72); g.quadraticCurveTo(N * 0.33, N * 0.8, N * 0.4, N); g.fill(); }
  // film grain + gentle vignette
  const vg = g.createRadialGradient(N / 2, N / 2, N * 0.3, N / 2, N / 2, N * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.22)');
  g.fillStyle = vg; g.fillRect(0, 0, N, N);
  const id = g.getImageData(0, 0, N, N), d = id.data, R3 = rng(sp.seed * 7 + 1);
  for (let i = 0; i < d.length; i += 4) { const n = (R3() - 0.5) * 14; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(id, 0, 0);
  return c;
}
function buildPhotos() {
  const alp = { seed: 11, hz: 0.6, amp: 1.2, water: true };
  PH.push(makePhoto(alp, { sky: ['#5E9BD6', '#D5E7F3'], sun: [0.78, 0.16, 0.035, '#FFFDF2'], layers: ['#9DB3C8', '#6A879F', '#33505F'], water: ['#5C86A8', '#24425A'] }));
  GOLD = makePhoto(alp, { sky: ['#E3874F', '#FCD7A0'], sun: [0.3, 0.5, 0.05, '#FFE7B0'], layers: ['#C98B7E', '#8F5D5C', '#47303A'], water: ['#B66E55', '#3B2530'] });
  PH.push(makePhoto({ seed: 21, hz: 0.62, amp: 0.8 }, { sky: ['#F1B88E', '#FBE9D6'], sun: [0.7, 0.28, 0.06, '#FFF4E0'], layers: ['#E8AC73', '#D88D55', '#BC6B3C'] }));
  PH.push(makePhoto({ seed: 31, hz: 0.55, amp: 0.1, water: true, rocks: '#26282C' }, { sky: ['#8EC1E6', '#EDF4F8'], layers: [], water: ['#4E8FBE', '#1E4E73'] }));
  PH.push(makePhoto({ seed: 41, hz: 0.78, amp: 1, city: true }, { sky: ['#2A2758', '#F2906E'], layers: ['#16152B'] }));
  PH.push(makePhoto({ seed: 51, hz: 0.62, amp: 1 }, { sky: ['#D9E3DA', '#F3F3EC'], layers: ['#AFC4AD', '#83A084', '#4F6E56', '#2A4333'] }));
  PH.push(makePhoto({ seed: 61, hz: 0.7, amp: 1.3, stars: true }, { sky: ['#0C1430', '#33406E'], sun: [0.25, 0.22, 0.03, '#F4F1E4'], layers: ['#1C2547', '#0A0F1F'] }));
  PH.push(makePhoto({ seed: 71, hz: 0.62, amp: 0.3, field: ['#E9505A', '#F6C2C8', '#F2D24B', '#E9505A', '#7AB55C', '#F4F1EA'] }, { sky: ['#7DB5E3', '#E6F1F8'], layers: ['#7FA96B'] }));
  PH.push(makePhoto({ seed: 81, hz: 0.66, amp: 1.4 }, { sky: ['#F0BFCB', '#FCEDEF'], sun: [0.62, 0.3, 0.04, '#FFF7F0'], layers: ['#DDA7BB', '#AC789A', '#6F4D70'] }));
  PH.push(makePhoto({ seed: 91, hz: 0.58, amp: 0.5, water: true }, { sky: ['#6F62B0', '#F7B48C'], sun: [0.5, 0.5, 0.075, '#FFE3B8'], layers: ['#5A4C8C'], water: ['#C98A8E', '#3C2F5C'] }));
}
const WALLPAPER = () => PH[8];

// ============ LIQUID GLASS (scene clone + refraction band + chromatic rim) ============
const BACK = mk(S, S), LA = mk(S, S), LB = mk(S, S), MF = mk(S, S), MB = mk(S, S);
function snap() { const g = BACK.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, S, S); g.drawImage(cv, 0, 0); }
function reset(g) { g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.filter = 'none'; g.clearRect(0, 0, S, S); }
// shape(g, mode) : mode 'fill' or 'stroke'  (drawn in current world transform)
function glass(shape, wcx, wcy, o = {}) {
  const M = X.getTransform(); const [cx, cy] = pt(M, wcx, wcy);
  const sc = Math.hypot(M.a, M.b);
  const band = (o.band ?? 16) * sc, mag = o.mag ?? 1.1, emag = o.emag ?? 1.32;
  snap();
  const f = MF.getContext('2d'); reset(f); f.setTransform(M); f.fillStyle = '#fff'; shape(f, 'fill');
  const b = MB.getContext('2d'); reset(b); b.setTransform(M); b.strokeStyle = '#fff'; b.lineJoin = 'round'; b.lineWidth = band * 2 / sc; shape(b, 'stroke');
  b.setTransform(1, 0, 0, 1, 0, 0); b.globalCompositeOperation = 'destination-in'; b.drawImage(MF, 0, 0);
  glassComposite(cx, cy, mag, emag, o, M, shape);
}
function glassComposite(cx, cy, mag, emag, o, M, shape) {
  const a = LA.getContext('2d'); reset(a);
  a.translate(cx, cy); a.scale(mag, mag); a.translate(-cx, -cy); a.drawImage(BACK, 0, 0); a.setTransform(1, 0, 0, 1, 0, 0);
  // refraction band: stronger magnification near the rim, 3 channels at slightly different scales
  const bb = LB.getContext('2d');
  const chans = [['#ff0000', emag * 1.012], ['#00ff00', emag], ['#0000ff', emag * 0.988]];
  a.save(); a.globalCompositeOperation = 'source-over';
  reset(bb); bb.translate(cx, cy); bb.scale(emag, emag); bb.translate(-cx, -cy); bb.drawImage(BACK, 0, 0);
  bb.setTransform(1, 0, 0, 1, 0, 0); bb.globalCompositeOperation = 'destination-in'; bb.drawImage(MB, 0, 0);
  a.drawImage(LB, 0, 0);
  for (const [col, m] of [chans[0], chans[2]]) {
    reset(bb); bb.translate(cx, cy); bb.scale(m * 1.01, m * 1.01); bb.translate(-cx, -cy); bb.drawImage(BACK, 0, 0);
    bb.setTransform(1, 0, 0, 1, 0, 0); bb.globalCompositeOperation = 'multiply'; bb.fillStyle = col; bb.fillRect(0, 0, S, S);
    bb.globalCompositeOperation = 'destination-in'; bb.drawImage(MB, 0, 0);
    a.globalCompositeOperation = 'lighter'; a.globalAlpha = 0.18; a.drawImage(LB, 0, 0); a.globalAlpha = 1;
  }
  a.restore();
  // tint + inner shade
  a.globalCompositeOperation = 'source-atop';
  a.fillStyle = o.tint ?? 'rgba(255,255,255,0.10)'; a.fillRect(0, 0, S, S);
  if (o.dark) { a.fillStyle = o.dark; a.fillRect(0, 0, S, S); }
  // rim light
  if (shape) {
    a.save(); a.setTransform(M);
    const inv = M.inverse(); const [x0, y0] = pt(inv, 0, 0); const [x1, y1] = pt(inv, S, S);
    const gr = a.createLinearGradient(x0, y0, x1, y1);
    gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.15)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.1)'); gr.addColorStop(1, 'rgba(255,255,255,0.7)');
    a.strokeStyle = gr; a.lineWidth = (o.rim ?? 3) / Math.hypot(M.a, M.b) * 2; a.lineJoin = 'round';
    a.globalCompositeOperation = 'source-over'; shape(a, 'stroke'); a.restore();
  }
  a.globalCompositeOperation = 'destination-in'; a.drawImage(MF, 0, 0);
  X.save(); X.setTransform(1, 0, 0, 1, 0, 0);
  X.shadowColor = `rgba(0,0,0,${o.shadow ?? 0.18})`; X.shadowBlur = 36; X.shadowOffsetY = 14; X.drawImage(LA, 0, 0); X.restore();
}
// ---- goo: blur + alpha threshold at half res -> fill & band masks
const GQ = 720, G1 = mk(GQ, GQ), G2 = mk(GQ, GQ), G3 = mk(GQ, GQ);
function gooGlass(draw, blur, cx, cy, o = {}) {
  const g = G1.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, GQ, GQ);
  g.filter = blur > 0.05 ? `blur(${blur * 0.5}px)` : 'none'; g.setTransform(0.5, 0, 0, 0.5, 0, 0); g.fillStyle = '#fff'; draw(g); g.filter = 'none';
  const id = g.getImageData(0, 0, GQ, GQ), d = id.data; const bd = new ImageData(GQ, GQ), e = bd.data;
  const bw = blur > 0.05 ? 40 : 0;
  for (let i = 3; i < d.length; i += 4) {
    const v = d[i]; const fa = clamp((v - 127) * 6 + 128, 0, 255);
    d[i - 3] = d[i - 2] = d[i - 1] = 255; d[i] = fa;
    e[i - 3] = e[i - 2] = e[i - 1] = 255; e[i] = (v > 127 && v < 127 + 70) ? 255 : 0;
  }
  G2.getContext('2d').putImageData(id, 0, 0); G3.getContext('2d').putImageData(bd, 0, 0);
  snap();
  const f = MF.getContext('2d'); reset(f); f.drawImage(G2, 0, 0, S, S);
  const b = MB.getContext('2d'); reset(b); b.drawImage(G3, 0, 0, S, S);
  glassComposite(cx, cy, o.mag ?? 1.1, o.emag ?? 1.32, o, new DOMMatrix(), null);
  // rim from band
  X.save(); X.setTransform(1, 0, 0, 1, 0, 0);
  const r = LB.getContext('2d'); reset(r); r.drawImage(G3, 0, 0, S, S); r.globalCompositeOperation = 'source-in';
  const gr = r.createLinearGradient(0, 0, S, S); gr.addColorStop(0, 'rgba(255,255,255,0.5)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.05)'); gr.addColorStop(1, 'rgba(255,255,255,0.35)');
  r.fillStyle = gr; r.fillRect(0, 0, S, S); X.drawImage(LB, 0, 0); X.restore();
}

// ============ IRIS: 6 blades on a hexagonal aperture ============
function rayCircle(p, d, cx, cy, R) {
  const ox = p[0] - cx, oy = p[1] - cy; const b = d[0] * ox + d[1] * oy; const c = ox * ox + oy * oy - R * R;
  const s = -b + Math.sqrt(Math.max(0, b * b - c)); return [p[0] + d[0] * s, p[1] + d[1] * s];
}
function iris(g, cx, cy, R, a, rot, col = '#141416', seam = '#3A3A3E', sw = 2) {
  if (a >= R) return; const closed = a < 1; a = Math.max(a, 1);
  const V = []; for (let k = 0; k < 6; k++) { const an = rot + k * TAU / 6; V.push([cx + a * Math.cos(an), cy + a * Math.sin(an)]); }
  const nd = (p, q) => { const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy); return [dx / l, dy / l]; };
  for (let i = 0; i < 6; i++) {
    const v0 = V[i], v1 = V[(i + 1) % 6], vp = V[(i + 5) % 6];
    const E = rayCircle(v1, nd(v0, v1), cx, cy, R), F = rayCircle(v0, nd(vp, v0), cx, cy, R);
    let a1 = Math.atan2(E[1] - cy, E[0] - cx), a2 = Math.atan2(F[1] - cy, F[0] - cx);
    let dl = a2 - a1; while (dl > PI) dl -= TAU; while (dl < -PI) dl += TAU;
    g.beginPath(); g.moveTo(v0[0], v0[1]); g.lineTo(v1[0], v1[1]); g.lineTo(E[0], E[1]);
    for (let q = 1; q <= 20; q++) { const an = a1 + dl * q / 20; g.lineTo(cx + R * Math.cos(an), cy + R * Math.sin(an)); } g.closePath();
    g.fillStyle = col; g.fill(); if (sw > 0.01) { g.strokeStyle = seam; g.lineWidth = sw; g.lineJoin = 'round'; g.stroke(); }
  }
  if (closed) { g.fillStyle = col; g.beginPath(); g.arc(cx, cy, 2.5, 0, TAU); g.fill(); }
}

// ============ CURSOR ============
function track(t, keys) {
  if (t <= keys[0][0]) return [keys[0][1], keys[0][2]];
  for (let i = 1; i < keys.length; i++) { const k0 = keys[i - 1], k1 = keys[i]; if (t <= k1[0]) { const u = eio(prog(t, k0[0], k1[0])); return [lerp(k0[1], k1[1], u), lerp(k0[2], k1[2], u)]; } }
  const k = keys[keys.length - 1]; return [k[1], k[2]];
}
function pressAmt(t, clicks) { let p = 0; for (const [c, d] of clicks) { if (t >= c - 0.06 && t <= c + d) p = Math.max(p, Math.min(prog(t, c - 0.06, c), 1 - prog(t, c + d - 0.06, c + d))); } return p; }
function drawCursor(g, x, y, press, clicks, t, sc = 1, lp = null) {
  for (const [c] of clicks) { const p = prog(t, c, c + 0.4); if (p > 0 && p < 1) { g.strokeStyle = INK; g.lineWidth = (1 - p) * 5 / sc; g.beginPath(); g.arc(x, y, (14 + eo(p) * 46) / sc, 0, TAU); g.stroke(); } }
  if (lp) { g.strokeStyle = INK; g.lineWidth = 5 / sc; g.lineCap = 'round'; g.beginPath(); g.arc(x, y, 34 / sc, -PI / 2, -PI / 2 + TAU * lp); g.stroke(); g.lineCap = 'butt'; }
  g.save(); g.translate(x, y); const s = (1 - press * 0.16) * 1.15 / sc; g.scale(s, s);
  g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 30); g.lineTo(7.5, 23.5); g.lineTo(12.5, 34.5); g.lineTo(17.5, 32.3); g.lineTo(12.6, 21.5); g.lineTo(22, 21.5); g.closePath();
  g.fillStyle = INK; g.strokeStyle = '#fff'; g.lineWidth = 2.6; g.lineJoin = 'round'; g.stroke(); g.fill(); g.restore();
}

// ============ WORDMARK ============
let WM; // layout of 'Frame.'
function layoutWordmark() {
  font(X, 230, 'Archivo', 800, 'expanded'); const s = 'Frame';
  const adv = [...s].map(ch => X.measureText(ch).width); const dotm = X.measureText('.');
  const tot = adv.reduce((a, b) => a + b, 0) + dotm.width; const x0 = C - tot / 2;
  const cap = X.measureText('F').actualBoundingBoxAscent; const base = C + cap / 2;
  const xs = []; let x = x0; for (const a of adv) { xs.push(x); x += a; }
  const dl = x - dotm.actualBoundingBoxLeft, dr = x + dotm.actualBoundingBoxRight;
  const dt = base - dotm.actualBoundingBoxAscent, db = base + dotm.actualBoundingBoxDescent;
  WM = { s, adv, xs, base, dot: { x: dl, y: dt, w: dr - dl, h: db - dt } };
}
function drawWordmark(g, k) { // k: 1 = open, 0 = squeezed into the dot
  const xa = WM.dot.x; font(g, 230, 'Archivo', 800, 'expanded'); g.fillStyle = INK;
  if (k > 0.002) [...WM.s].forEach((ch, i) => { const nx = xa - (xa - WM.xs[i]) * k; g.save(); g.translate(nx, WM.base); g.scale(k, 1); g.fillText(ch, 0, 0); g.restore(); });
}
function dotRect() { const d = WM.dot; return { cx: d.x + d.w / 2, cy: d.y + d.h / 2, w: d.w, h: d.h, r: d.w * 0.12 }; }
function lerpRect(a, b, u) { return { cx: lerp(a.cx, b.cx, u), cy: lerp(a.cy, b.cy, u), w: lerp(a.w, b.w, u), h: lerp(a.h, b.h, u), r: lerp(a.r, b.r, u) }; }
const PILL = { cx: C, cy: C, w: 660, h: 156, r: 78 };
const CIRC = { cx: C, cy: C, w: 600, h: 600, r: 300 };

// masked text: rises from a mask line
function riseText(g, str, x, y, clipRect, u, align = 'center') {
  g.save(); g.beginPath(); g.rect(clipRect[0], clipRect[1], clipRect[2], clipRect[3]); g.clip();
  g.textAlign = align; g.fillText(str, x, y + (1 - u) * (clipRect[3] * 1.05)); g.restore(); g.textAlign = 'left';
}

// ============ ACT 1: OPEN + IRIS (0 – 3.5) and GRID (3 – 8) ============
const GRIDPOS = [[0, 0], [0, -1], [1, 0], [0, 1], [-1, 0], [1, -1], [1, 1], [-1, 1], [-1, -1]];
const GRIDPH = [0, 1, 2, 3, 4, 5, 6, 7, 8];
// bento in 4x4 units (312px), margin 104
const BENTO = [[0, 0, 2, 2], [2, 0, 2, 1], [2, 1, 1, 1], [3, 1, 1, 2], [0, 2, 1, 1], [1, 2, 2, 1], [0, 3, 2, 1], [2, 3, 1, 1], [3, 3, 1, 1]];
const brect = i => { const [c, r, w, h] = BENTO[i]; return [104 + c * 312, 104 + r * 312, w * 312 - 16, h * 312 - 16]; };
const HOVERS = [[5, 5.5, 5.95], [2, 6.0, 6.45], [0, 6.5, 7.0]];
const CUR1 = [[1.7, 1560, 1380], [2.38, 860, 770], [2.6, 860, 770], [3.4, 1180, 1160], [5.3, 1040, 860], [5.85, 860, 470], [6.35, 470, 420], [6.95, 420, 400], [8.0, 420, 400]];
const CLK1 = [[2.5, 0.1], [7.0, 0.1]];

function cam1(t) { // zoom into the big bento tile, landing on the drop
  const u = t > 20 ? 0 : eio(prog(t, 7.05, 8.0)); const [x, y, w] = brect(0);
  const s = Math.exp(lerp(0, Math.log(S / w), u));
  const fx = lerp(C, x + w / 2, u), fy = lerp(C, y + w / 2, u);
  return [s, fx, fy, u];
}
function act1(t) {
  X.fillStyle = PAPER; X.fillRect(0, 0, S, S);
  const [cs, fx, fy, zu] = cam1(t);
  X.save(); X.translate(C, C); X.scale(cs, cs); X.translate(-fx, -fy);
  if (t < 1.0 || t >= 26.5) {
    const k = t >= 26.5 ? Math.max(0, eback(prog(t, 26.5, 27.0), 1.3)) : 1 - eio(prog(t, 0.5, 0.97));
    drawWordmark(X, k); const d = dotRect(); X.fillStyle = INK; rrc(X, d.cx, d.cy, d.w, d.h, d.r); X.fill();
  } else if (t < 3.0) {
    const u1 = spr(t, 1.0, 1.7, 0.72), u2 = spr(t, 2.5, 2.0, 0.66);
    let R = lerpRect(dotRect(), PILL, u1); R = lerpRect(R, CIRC, u2);
    X.fillStyle = INK; rrc(X, R.cx, R.cy, R.w, R.h, R.r); X.fill();
    font(X, 50, 'Geist', 600); X.fillStyle = '#fff';
    X.save(); rrc(X, R.cx, R.cy, R.w, R.h, R.r); X.clip();
    riseText(X, 'Print what you love', R.cx, R.cy + 17, [R.cx - 400, R.cy - 40, 800, 80], spr(t, 1.5, 2.0, 0.75));
    X.restore();
    const ap = 300 * 1.0 * (1 - eio(prog(t, 2.75, 3.0)));
    X.save(); X.beginPath(); X.arc(C, C, R.w / 2 - 1, 0, TAU); X.clip();
    if (t >= 2.7) iris(X, C, C, 300, ap, 0.3 + (1 - ap / 300) * 1.1);
    X.restore();
  } else {
    // photo circle -> square -> tile -> map unfold -> bento
    const ap = 300 * eo5(prog(t, 3.02, 3.28));
    const sq = spr(t, 3.5, 2.0, 0.7), sh = spr(t, 3.75, 2.2, 0.72);
    const size = lerp(600, 400, sh), rad = lerp(300, 22, sq);
    const reflow = BENTO.map((_, i) => spr(t, 5.0 + i * 0.028, 1.9, 0.72));
    for (let i = 8; i >= 0; i--) {
      const [gx, gy] = GRIDPOS[i]; let x, y, w, h, squish = false, shade = 0;
      if (i === 0) { x = C - size / 2; y = C - size / 2; w = h = size; }
      else {
        const plus = i <= 4; const p = spr(t, (plus ? 4.0 : 4.5) + (i % 4) * 0.035, 2.3, 0.75);
        if (p <= 0.001) continue;
        const cx0 = C + gx * 416, cy0 = C + gy * 416; x = cx0 - 200; y = cy0 - 200; w = h = 400; squish = true; shade = (1 - Math.min(p, 1)) * 0.45;
        if (plus && gx !== 0) { const ax = gx > 0 ? x : x + 400; w = 400 * p; x = gx > 0 ? ax : ax - w; }
        else { const ay = gy > 0 ? y : y + 400; h = 400 * p; y = gy > 0 ? ay : ay - h; }
      }
      const u = reflow[i]; const [bx, by, bw, bh] = brect(i);
      if (u > 0) { x = lerp(x, bx, u); y = lerp(y, by, u); w = lerp(w, bw, u); h = lerp(h, bh, u); squish = false; }
      let hv = 0; for (const [ti, on, off] of HOVERS) if (ti === i) hv += spr(t, on, 2.6, 0.55) - spr(t, off, 2.6, 0.55);
      const s = 1 + 0.05 * hv * (1 - zu); const ccx = x + w / 2, ccy = y + h / 2; w *= s; h *= s; x = ccx - w / 2; y = ccy - h / 2;
      const r = i === 0 ? lerp(rad, 22, u) * (1 - zu) : 22;
      X.save(); rr(X, x, y, w, h, r); X.clip();
      cover(X, PH[GRIDPH[i]], x, y, w, h, squish);
      if (shade > 0) { X.fillStyle = `rgba(20,16,10,${shade})`; X.fillRect(x, y, w, h); }
      X.restore();
      if (i === 0 && t < 3.3) { X.save(); X.beginPath(); X.arc(C, C, 300, 0, TAU); X.clip(); iris(X, C, C, 300, ap, 1.4 - ap / 300 * 1.1); X.restore(); }
    }
  }
  if (t >= 1.7 && t < 8.0) {
    const [x, y] = track(t, CUR1); drawCursor(X, x, y, pressAmt(t, CLK1), CLK1, t, cs);
  }
  X.restore();
}

// ============ ACT 2: GLASS (8 – 14) ============
const ICONS = [450, 630, 810, 990];
const CUR2 = [[9.6, 1500, 1460], [10.35, 640, 1222], [10.6, 640, 1222], [10.95, 425, 1220], [11.05, 425, 1220], [11.95, 1020, 1220], [12.3, 1180, 1330]];
const CLK2 = [[10.5, 0.08], [11.0, 0.95]];
function knobX(t) { return lerp(lerp(630, 420, spr(t, 10.5, 2.2, 0.7)), 1020, eio(prog(t, 11.05, 11.95))); }
function drawIcon(g, k, cx, cy, s) {
  g.save(); g.translate(cx, cy); g.scale(s, s); g.strokeStyle = INK; g.fillStyle = INK; g.lineWidth = 4.5; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath();
  if (k === 0) { g.moveTo(-10, -20); g.lineTo(-10, 10); g.lineTo(20, 10); g.moveTo(-20, -10); g.lineTo(10, -10); g.lineTo(10, 20); g.stroke(); }
  if (k === 1) { for (const [y, x] of [[-11, 6], [0, -8], [11, 3]]) { g.moveTo(-18, y); g.lineTo(18, y); } g.stroke(); for (const [y, x] of [[-11, 6], [0, -8], [11, 3]]) { g.beginPath(); g.arc(x, y, 5.5, 0, TAU); g.fill(); } }
  if (k === 2) { g.moveTo(-16, 16); g.lineTo(8, -8); g.stroke(); for (const [x, y, r] of [[12, -14, 3], [17, -2, 2.2], [3, -18, 2.2]]) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); } }
  if (k === 3) { g.moveTo(0, 8); g.lineTo(0, -18); g.moveTo(-9, -10); g.lineTo(0, -19); g.lineTo(9, -10); g.moveTo(-11, -3); g.lineTo(-16, -3); g.lineTo(-16, 18); g.lineTo(16, 18); g.lineTo(16, -3); g.lineTo(11, -3); g.stroke(); }
  g.restore();
}
function act2(t) {
  // relit backdrop: golden revealed along the knob's sweep
  cover(X, PH[0], 0, 0, S, S);
  const u = clamp((knobX(t) - 420) / 600); const reveal = t >= 12 ? 1 : (t > 11.05 ? u : 0);
  if (reveal > 0) {
    const ex = lerp(-260, S + 260, reveal);
    X.save(); X.beginPath(); X.moveTo(-10, -10); X.lineTo(ex + 160, -10); X.lineTo(ex - 160, S + 10); X.lineTo(-10, S + 10); X.closePath(); X.clip();
    cover(X, GOLD, 0, 0, S, S); X.restore();
  }
  // ---- glass word -> droplet -> toolbar
  const word = 'glass';
  font(X, 250, 'Archivo', 800, 'expanded'); const adv = [...word].map(c => X.measureText(c).width);
  const tw = adv.reduce((a, b) => a + b, 0); const capg = X.measureText('l').actualBoundingBoxAscent;
  let lx = C - tw / 2; const letters = adv.map((a, i) => { const o = { x: lx, w: a, ch: word[i] }; lx += a; return o; });
  const meltU = eio(prog(t, 9.0, 9.42));
  const drawLetters = (g, mode) => {
    font(g, 250, 'Archivo', 800, 'expanded');
    letters.forEach((L, i) => {
      const s = spr(t, 8.0 + i * 0.1, 2.6, 0.5) * lerp(1, 0.3, meltU); if (s < 0.01) return;
      const lcx = lerp(L.x + L.w / 2, C, meltU), lcy = lerp(700 - capg * 0.25, 700, meltU);
      g.save(); g.translate(lcx, lcy); g.scale(s, s); g.translate(-L.w / 2, capg * 0.25);
      mode === 'fill' ? g.fillText(L.ch, 0, 0) : g.strokeText(L.ch, 0, 0); g.restore();
    });
  };
  const drop = spr(t, 9.0, 1.8, 0.7);
  const bar = spr(t, 9.5, 1.7, 0.62), lag = spr(t, 9.5, 1.15, 0.6);
  const out = spr(t, 12.0, 2.2, 0.75);
  const bw = lerp(lerp(0, 190, drop), 760, bar) * (1 - out), bh = lerp(lerp(0, 190, drop), 132, bar) * (1 - out), by = lerp(700, 1215, bar);
  if (t >= 8.0 && t < 9.0) {
    glass(drawLetters, C, 700, { band: 12, mag: 1.12, emag: 1.45, tint: 'rgba(255,255,255,0.12)' });
  } else if (t >= 9.0 && t < 9.95) {
    const blur = 16 * prog(t, 9.0, 9.15);
    gooGlass(g => { drawLetters(g, 'fill'); rrc(g, C, by, bw, bh, bh / 2); g.fill(); const ly = lerp(700, 1215, lag); g.beginPath(); g.arc(C, ly, 60 * (1 - prog(t, 9.7, 9.95)) * drop, 0, TAU); g.fill(); }, blur, C, (by + 700) / 2, { mag: 1.12, emag: 1.4 });
  } else if (t >= 9.95 && bw > 2) {
    glass((g, m) => { rrc(g, C, by, bw, bh, bh / 2); m === 'fill' ? g.fill() : g.stroke(); }, C, by, { band: 18, mag: 1.08, emag: 1.3 });
  }
  // icons
  if (t >= 9.95 && t < 12.5) {
    ICONS.forEach((ix, k) => {
      let s = spr(t, 10.0 + k * 0.06, 2.6, 0.5); if (k !== 1) s *= 1 - spr(t, 10.5 + k * 0.03, 2.6, 0.8); else s *= 1 - spr(t, 10.5, 3, 0.9);
      s *= 1 - out; if (s > 0.01) drawIcon(X, k, ix, 1215, s);
    });
  }
  // slider
  if (t >= 10.5 && t < 12.6) {
    const L = 600 * eio(prog(t, 10.58, 10.95)) * (1 - eio(prog(t, 12.0, 12.3)));
    const x0 = 420 + 600 * eio(prog(t, 12.0, 12.3));
    X.strokeStyle = 'rgba(20,20,22,0.85)'; X.lineWidth = 6; X.lineCap = 'round';
    if (L > 1) { X.beginPath(); X.moveTo(x0, 1215); X.lineTo(Math.min(x0 + L, 1020), 1215); X.stroke(); }
    for (let k = 0; k <= 4; k++) { const tx = 420 + k * 150; const pass = prog(knobX(t), tx - 30, tx); const s = (1 + 0.6 * Math.sin(pass * PI)) * eio(prog(t, 10.7 + k * 0.04, 10.95 + k * 0.04)) * (1 - prog(t, 12.0, 12.15));
      if (s > 0.01 && tx >= x0) { X.fillStyle = INK; X.beginPath(); X.arc(tx, 1215, 5 * s, 0, TAU); X.fill(); } }
    X.lineCap = 'butt';
  }
  // knob -> lens -> orb -> photo circle -> lock screen
  const lensR = sv(t, 0, [[10.5, 24, 2.6, 0.6], [11.0, 66, 2.4, 0.55], [12.0, 232, 1.6, 0.7]]);
  const kx = lerp(knobX(t), C, spr(t, 12.0, 1.6, 0.7)), ky = lerp(1215, 660, spr(t, 12.0, 1.6, 0.7));
  const lock = spr(t, 13.0, 1.35, 0.85);
  if (t >= 10.5 && lensR > 1) {
    const g0 = spr(t, 11.0, 2.4, 0.55);
    if (g0 < 0.02) { X.fillStyle = '#fff'; X.beginPath(); X.arc(kx, ky, lensR, 0, TAU); X.fill(); }
    else if (lock < 0.999) {
      const R = lerp(lensR, 900, lock);
      glass((g, m) => { g.beginPath(); g.arc(kx, ky, R, 0, TAU); m === 'fill' ? g.fill() : g.stroke(); }, kx, ky, { band: 20, mag: 1.18, emag: 1.5, tint: 'rgba(255,255,255,0.10)' });
    }
  }
  // photo inside orb, then the lock screen
  if (t >= 12.5) {
    const pr = (lensR - 18) * spr(t, 12.5, 2.0, 0.7);
    const half = lerp(pr, 720, lock), cy = lerp(ky, C, lock), r = lerp(pr, 0, lock);
    const rect = { x: C - half, y: cy - half, w: half * 2, h: half * 2, r };
    drawLock(t, rect, true);
  }
  if (t >= 9.6 && t < 12.3) { const [x, y] = track(t, CUR2); drawCursor(X, x, y, pressAmt(t, CLK2), CLK2.slice(0, 1), t); }
}
// lock screen inside any rect (x,y,w,h,r); content scales with w
function drawLock(t, R, inOrb = false) {
  const sc = R.w / 1440;
  X.save(); rr(X, R.x, R.y, R.w, R.h, R.r); X.clip(); cover(X, WALLPAPER(), R.x, R.y, R.w, R.h); X.restore();
  if (t < 13.0) return;
  const cx = R.x + R.w / 2;
  // date
  font(X, 50 * sc, 'Geist', 600); X.fillStyle = '#fff';
  const dy = R.y + 0.15 * R.h; riseText(X, 'Monday, October 5', cx, dy + 18 * sc, [R.x, dy - 40 * sc, R.w, 70 * sc], spr(t, 13.2, 2.2, 0.75));
  // glass clock digits
  const dig = '9:41'; font(X, 340 * sc, 'Archivo', 800, 'normal');
  const adv = [...dig].map(c => X.measureText(c).width); const tw = adv.reduce((a, b) => a + b, 0);
  const base = R.y + 0.4 * R.h; let lx = cx - tw / 2; const L = adv.map((a, i) => { const o = [lx, a, dig[i]]; lx += a; return o; });
  const capd = X.measureText('9').actualBoundingBoxAscent;
  glass((g, m) => {
    font(g, 340 * sc, 'Archivo', 800, 'normal');
    L.forEach(([x, a, ch], i) => { const s = spr(t, 13.05 + i * 0.07, 2.6, 0.55); if (s < 0.01) return; g.save(); g.translate(x + a / 2, base - capd / 2); g.scale(s, s); g.translate(-a / 2, capd / 2); m === 'fill' ? g.fillText(ch, 0, 0) : g.strokeText(ch, 0, 0); g.restore(); });
  }, cx, base - capd / 2, { band: 10 * sc + 2, mag: 1.1, emag: 1.5, tint: 'rgba(255,255,255,0.16)', shadow: 0.12 });
  // home bar -> glass music player
  const pl = spr(t, 13.5, 1.8, 0.66);
  const pw = lerp(300 * sc, 1120 * sc, pl), ph = lerp(13 * sc, 210 * sc, pl), pcy = lerp(R.y + R.h - 0.035 * R.h, R.y + R.h - 0.17 * R.h, pl);
  const pop = spr(t, 13.3, 2.8, 0.55);
  if (pl < 0.02) { X.fillStyle = '#fff'; rrc(X, cx, pcy, pw * pop, ph * pop, ph / 2); X.fill(); }
  else {
    glass((g, m) => { rrc(g, cx, pcy, pw, ph, Math.min(ph / 2, 56 * sc)); m === 'fill' ? g.fill() : g.stroke(); }, cx, pcy, { band: 18 * sc + 3, mag: 1.08, emag: 1.3, tint: 'rgba(255,255,255,0.14)' });
    const c = spr(t, 13.75, 2.6, 0.6);
    if (c > 0.01) {
      const ax = cx - pw / 2 + 32 * sc, as = 146 * sc;
      X.save(); X.translate(ax + as / 2, pcy); X.scale(c, c); rrc(X, 0, 0, as, as, 22 * sc); X.clip(); cover(X, PH[0], -as / 2, -as / 2, as, as); X.restore();
      X.save(); X.beginPath(); X.rect(ax + as + 20 * sc, pcy - ph / 2, pw * 0.6, ph); X.clip();
      font(X, 44 * sc, 'Geist', 700); X.fillStyle = '#fff'; X.fillText('Golden Hour', ax + as + 30 * sc, pcy - 6 * sc + (1 - c) * 120 * sc);
      font(X, 32 * sc, 'Geist', 500); X.fillStyle = 'rgba(255,255,255,0.78)'; X.fillText('frame. radio', ax + as + 30 * sc, pcy + 40 * sc + (1 - c) * 160 * sc);
      X.restore();
      const px = cx + pw / 2 - 90 * sc; X.save(); X.translate(px, pcy); X.scale(c, c); X.fillStyle = '#fff';
      X.fillRect(-18 * sc, -26 * sc, 13 * sc, 52 * sc); X.fillRect(6 * sc, -26 * sc, 13 * sc, 52 * sc); X.restore();
    }
  }
}

// ============ ACT 3: STAGE (14 – 19) + SCROLL (19 – 21.5) ============
const WIN = { x: 610, y: 358, w: 780, tb: 48 }; const WIN_H = 560;
const HERO = { x: 640, y: 466, w: 720, h: 262 };
const CUR3 = [[15.6, 1300, 1400], [15.95, 330, 690], [16.55, 330, 690], [17.0, 970, 382], [17.5, 975, 390], [17.95, 1000, 600], [18.4, 1180, 760],
  [19.15, 1180, 740], [19.85, 1015, 656], [20.1, 1015, 656], [20.4, 1112, 736], [20.6, 1112, 736], [21.38, 1160, 822], [21.6, 1160, 822]];
const CLK3 = [[16.05, 0.45], [18.0, 0.08], [20.0, 0.08], [20.5, 0.08], [21.5, 0.08]];
function cam3(t) {
  const u = eio(prog(t, 18.5, 19.05)); const s = lerp(1, S * 0.94 / WIN.w, u);
  return [s, lerp(C, WIN.x + WIN.w / 2, u), lerp(C, WIN.y + WIN_H / 2, u)];
}
function phoneRect(t) {
  const u = spr(t, 14.0, 1.5, 0.78); const slide = spr(t, 14.95, 1.7, 0.75);
  const cx = lerp(C, 330, slide);
  return { x: lerp(0, cx - 235, u), y: lerp(0, C - 510, u), w: lerp(S, 470, u), h: lerp(S, 1020, u), r: lerp(0, 66, u), cx };
}
function act3(t) {
  X.fillStyle = PAPER; X.fillRect(0, 0, S, S);
  const [cs, fx, fy] = cam3(t);
  X.save(); X.translate(C, C); X.scale(cs, cs); X.translate(-fx, -fy);
  const P = phoneRect(t);
  // bezel grows out of the screen edge
  const bez = sv(t, 0, [[14.12, 16, 2.4, 0.7]]);
  if (bez > 0.3) { X.fillStyle = '#111113'; rr(X, P.x - bez, P.y - bez, P.w + bez * 2, P.h + bez * 2, P.r + bez); X.fill(); }
  drawLock(t, P);
  // dynamic island: stretches like liquid, pinches off, flies, becomes a Mac title bar
  const icx = P.x + P.w / 2, icy = P.y + 30;
  const ipop = spr(t, 14.4, 2.6, 0.6);
  const blobX = lerp(icx, icx + 120, eio(prog(t, 14.55, 14.95)));
  const fly = eio(prog(t, 15.0, 15.38));
  const winX = WIN.x + WIN.w / 2, winY = WIN.y + WIN.tb / 2;
  const bx = lerp(blobX, winX, fly), byy = lerp(icy, winY, fly) - Math.sin(fly * PI) * 160;
  const grow = spr(t, 15.3, 2.0, 0.72);
  if (t >= 14.4 && t < 15.0) {
    // liquid stretch via goo (black)
    const g = G1.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, GQ, GQ);
    const M = X.getTransform(); g.filter = 'blur(5px)'; g.setTransform(M.a / 2, M.b / 2, M.c / 2, M.d / 2, M.e / 2, M.f / 2); g.fillStyle = '#fff';
    rrc(g, icx, icy, 112 * ipop, 34 * ipop, 17); g.fill();
    g.beginPath(); g.arc(blobX, icy, 17 * ipop, 0, TAU); g.fill(); g.filter = 'none';
    const id = g.getImageData(0, 0, GQ, GQ), d = id.data; for (let i = 3; i < d.length; i += 4) { const v = clamp((d[i] - 127) * 6 + 128, 0, 255); d[i - 3] = 0x11; d[i - 2] = 0x11; d[i - 1] = 0x13; d[i] = v; }
    G2.getContext('2d').putImageData(id, 0, 0); X.save(); X.setTransform(1, 0, 0, 1, 0, 0); X.drawImage(G2, 0, 0, S, S); X.restore();
  } else if (t >= 15.0) {
    X.fillStyle = '#111113'; rrc(X, icx, icy, 112, 34, 17); X.fill();
  }
  // Mac window
  if (t >= 15.0) {
    const tw = lerp(34, WIN.w, grow), th = lerp(34, WIN.tb, grow), tr = lerp(17, 12, grow);
    const tcx = lerp(bx, winX, grow), tcy = lerp(byy, winY, grow);
    const roll = eio(prog(t, 15.5, 15.92)) * (WIN_H - WIN.tb);
    if (roll > 0) {
      X.save(); X.shadowColor = 'rgba(0,0,0,0.18)'; X.shadowBlur = 40; X.shadowOffsetY = 18; X.fillStyle = '#fff';
      rr(X, WIN.x, WIN.y + WIN.tb - 12, WIN.w, roll + 12, 12); X.fill(); X.restore();
      X.save(); X.beginPath(); X.rect(WIN.x, WIN.y + WIN.tb, WIN.w, roll); X.clip(); drawPages(t); X.restore();
      if (roll < WIN_H - WIN.tb - 0.5) { X.fillStyle = '#C9C5BE'; X.fillRect(WIN.x, WIN.y + WIN.tb + roll - 5, WIN.w, 5); }
    }
    X.fillStyle = '#1C1C1E'; rrc(X, tcx, tcy, tw, th, tr); X.fill();
    if (grow > 0.5) {
      const dp = spr(t, 15.45, 2.8, 0.6);
      ['#FF5F57', '#FEBC2E', '#28C840'].forEach((c, i) => { X.fillStyle = c; X.beginPath(); X.arc(WIN.x + 26 + i * 22, winY, 7 * dp, 0, TAU); X.fill(); });
      // tabs
      const sel = spr(t, 17.0, 2.4, 0.7); const tabs = [['Inspiration', 720], ['frame.co', 900]];
      const tp = spr(t, 15.55, 2.4, 0.7);
      X.fillStyle = 'rgba(255,255,255,0.14)'; rr(X, lerp(712, 892, sel), winY - 15, 170, 30, 8); X.fill();
      font(X, 15, 'Geist', 600); tabs.forEach(([s, x], i) => { X.fillStyle = 'rgba(255,255,255,0.9)'; riseText(X, s, x + 77, winY + 5, [x, winY - 16, 160, 32], tp, 'center'); });
    }
  }
  // long-press -> lifted card -> drag -> hero -> framed print
  drawCard(t);
  if (t >= 15.6 && t < 21.7) {
    const [x, y] = track(t, CUR3);
    const lp = t >= 16.05 && t < 16.5 ? eio(prog(t, 16.05, 16.5)) : null;
    drawCursor(X, x, y, pressAmt(t, CLK3) || (t > 16.05 && t < 18.0 ? 1 : 0), CLK3.filter(c => c[1] < 0.2), t, cs, lp);
  }
  X.restore();
}
function drawPages(t) {
  const push = eio(prog(t, 17.5, 17.92));
  const cx0 = WIN.x, cy0 = WIN.y + WIN.tb;
  // old page: Inspiration masonry
  X.save(); X.translate(-push * WIN.w, 0);
  X.fillStyle = '#FBFAF7'; X.fillRect(cx0, cy0, WIN.w, WIN_H);
  font(X, 26, 'Archivo', 800, 'expanded'); X.fillStyle = INK; X.fillText('Inspiration', cx0 + 32, cy0 + 56);
  const R = rng(5); for (let c = 0; c < 4; c++) { let y = cy0 + 80; for (let k = 0; k < 4; k++) { const h = 70 + R() * 110; X.fillStyle = ['#E7E1D6', '#DDD6CA', '#EDE8DF'][k % 3]; rr(X, cx0 + 32 + c * 182, y, 168, h, 10); X.fill(); y += h + 14; } }
  X.restore();
  // new page: frame.co landing / product
  if (push > 0) {
    X.save(); X.translate((1 - push) * WIN.w, 0);
    X.fillStyle = '#FBFAF7'; X.fillRect(cx0, cy0, WIN.w, WIN_H);
    const scroll = eio(prog(t, 19.0, 19.45)) * 400;
    // headline + CTA
    const hu = spr(t, 18.15, 2.2, 0.75);
    font(X, 40, 'Archivo', 800, 'expanded'); X.fillStyle = INK;
    riseText(X, 'Hang what you love.', cx0 + WIN.w / 2, cy0 + 360 - scroll, [cx0, cy0 + 318 - scroll, WIN.w, 54], hu);
    const cp = spr(t, 18.3, 2.6, 0.6); if (cp > 0.01) { X.save(); X.translate(cx0 + WIN.w / 2, cy0 + 410 - scroll); X.scale(cp, cp); X.fillStyle = INK; rrc(X, 0, 0, 150, 40, 20); X.fill(); font(X, 15, 'Geist', 600); X.fillStyle = '#fff'; X.textAlign = 'center'; X.fillText('Shop prints', 0, 5); X.textAlign = 'left'; X.restore(); }
    // product info
    if (t >= 19.4) {
      const ix = 965; const u = spr(t, 19.5, 2.2, 0.75);
      font(X, 30, 'Archivo', 800, 'expanded'); X.fillStyle = INK; riseText(X, 'Golden Hour', ix, 548, [ix, 514, 400, 44], u, 'left');
      font(X, 16, 'Geist', 500); X.fillStyle = '#6B6760'; riseText(X, 'Archival print · from €89', ix, 580, [ix, 562, 400, 26], spr(t, 19.58, 2.2, 0.75), 'left');
      font(X, 13, 'Geist', 600); X.fillStyle = '#8A857C'; X.fillText('FRAME', ix, 628); X.fillText('SIZE', ix, 708);
      const sw = ['#141414', '#B5875A', '#EFEBE3']; const selx = lerp(980, 1015, spr(t, 20.0, 2.6, 0.65));
      sw.forEach((c, i) => { const s = spr(t, 19.6 + i * 0.05, 2.8, 0.55); X.fillStyle = c; X.beginPath(); X.arc(980 + i * 35 + 15 - 15, 656, 13 * s, 0, TAU); X.fill(); X.strokeStyle = 'rgba(0,0,0,0.15)'; X.lineWidth = 1; X.stroke(); });
      X.strokeStyle = INK; X.lineWidth = 2.5; X.beginPath(); X.arc(selx, 656, 19 * spr(t, 19.75, 2.6, 0.6), 0, TAU); X.stroke();
      const lsel = spr(t, 20.5, 2.4, 0.7); const pillx = lerp(1050, 1112, lsel);
      X.fillStyle = INK; rrc(X, pillx, 736, 52 * spr(t, 19.75, 2.6, 0.6), 32, 16); X.fill();
      ['S', 'M', 'L'].forEach((s, i) => { const x = 988 + i * 62; const p = spr(t, 19.7 + i * 0.05, 2.8, 0.55); const on = Math.abs(x - pillx) < 26;
        X.save(); X.translate(x, 741); X.scale(p, p); font(X, 15, 'Geist', 600); X.textAlign = 'center'; X.fillStyle = on ? '#fff' : INK; X.fillText(s, 0, 0); X.restore(); X.textAlign = 'left'; });
    }
    X.fillStyle = '#FBFAF7'; X.fillRect(cx0, cy0, WIN.w, 58); X.fillStyle = 'rgba(0,0,0,0.07)'; X.fillRect(cx0, cy0 + 58, WIN.w, 1);
    font(X, 22, 'Archivo', 800, 'expanded'); X.fillStyle = INK; X.fillText('Frame.', cx0 + 30, cy0 + 36);
    font(X, 14, 'Geist', 500); X.fillStyle = '#6B6760'; ['Prints', 'Frames', 'Gifts'].forEach((s, i) => X.fillText(s, cx0 + 200 + i * 70, cy0 + 34));
    // nav Cart -> Order print
    const fl = spr(t, 21.0, 1.7, 0.7);
    if (t < 21.5) {
      const bx = lerp(cx0 + WIN.w - 60, 1160, fl), by = lerp(cy0 + 26, 822, fl) - Math.sin(Math.min(fl, 1) * PI) * 40;
      const bw = lerp(76, 380, fl), bh = lerp(30, 54, fl);
      X.fillStyle = INK; rrc(X, bx, by, bw, bh, bh / 2); X.fill();
      X.save(); rrc(X, bx, by, bw, bh, bh / 2); X.clip(); X.fillStyle = '#fff'; X.textAlign = 'center';
      const sw2 = eio(prog(t, 21.05, 21.3)); font(X, 14, 'Geist', 600); X.fillText('Cart', bx, by + 5 - sw2 * 40);
      font(X, 18, 'Geist', 600); X.fillText('Order print', bx, by + 6 + (1 - sw2) * 50); X.restore(); X.textAlign = 'left';
    }
    X.restore();
  }
}
function printRect(t) {
  const L = spr(t, 20.5, 2.2, 0.6); const s = lerp(1, 1.1, L);
  const w = 210 * s, h = 270 * s; return { x: 790 - w / 2, y: 660 - h / 2, w, h };
}
function drawCard(t) {
  if (t < 16.5 || t >= 21.7) return;
  const P = phoneRect(t);
  const lift = spr(t, 16.5, 2.0, 0.66);
  const [cxx, cyy] = track(t, CUR3);
  const card = { x: lerp(P.x, cxx - 100, lift), y: lerp(P.y, cyy - 100, lift), w: lerp(P.w, 200, lift), h: lerp(P.h, 200, lift) };
  const drop = spr(t, 18.0, 1.9, 0.72);
  let R = { x: lerp(card.x, HERO.x, drop), y: lerp(card.y, HERO.y, drop), w: lerp(card.w, HERO.w, drop), h: lerp(card.h, HERO.h, drop) };
  const pr = spr(t, 19.0, 1.8, 0.75); const PR = printRect(t);
  const scroll = eio(prog(t, 19.0, 19.45)) * 400;
  R = { x: lerp(R.x, PR.x, pr), y: lerp(R.y - (t >= 19 ? scroll * (1 - pr) : 0), PR.y, pr), w: lerp(R.w, PR.w, pr), h: lerp(R.h, PR.h, pr) };
  const r = lerp(lerp(24, 14, drop), 0, pr);
  const mat = sv(t, 0, [[19.2, 24, 2.2, 0.75]]), mold = sv(t, 0, [[19.32, 15, 2.2, 0.75]]);
  X.save(); X.beginPath(); X.rect(t >= 17.95 ? WIN.x : -9999, t >= 17.95 ? WIN.y + WIN.tb + 59 : -9999, t >= 17.95 ? WIN.w : 99999, t >= 17.95 ? WIN_H - WIN.tb - 59 : 99999); X.clip();
  if (mold > 0.2) {
    const ox = R.x - mat - mold, oy = R.y - mat - mold, ow = R.w + 2 * (mat + mold), oh = R.h + 2 * (mat + mold);
    X.save(); X.shadowColor = 'rgba(0,0,0,0.25)'; X.shadowBlur = 24; X.shadowOffsetY = 10; X.fillStyle = '#141414'; X.fillRect(ox, oy, ow, oh); X.restore();
    const paint = eio(prog(t, 20.03, 20.35));
    if (paint > 0) { X.save(); X.beginPath(); X.rect(ox, oy, ow * paint, oh); X.clip(); X.fillStyle = '#B5875A'; X.fillRect(ox, oy, ow, oh);
      X.strokeStyle = 'rgba(80,50,20,0.25)'; X.lineWidth = 1; for (let k = 0; k < 8; k++) { X.beginPath(); X.moveTo(ox, oy + 3 + k * 2.2); X.lineTo(ox + ow, oy + 3 + k * 2.2); X.stroke(); } X.restore(); }
  }
  if (mat > 0.2) { X.fillStyle = '#FAF8F3'; X.fillRect(R.x - mat, R.y - mat, R.w + 2 * mat, R.h + 2 * mat); }
  X.save(); if (lift < 0.98 || t < 17.95) { X.shadowColor = 'rgba(0,0,0,0.25)'; X.shadowBlur = 30 * lift * (1 - drop); X.shadowOffsetY = 14 * lift * (1 - drop); }
  rr(X, R.x, R.y, R.w, R.h, r); X.fillStyle = '#000'; X.fill(); X.restore();
  X.save(); rr(X, R.x, R.y, R.w, R.h, r); X.clip(); cover(X, WALLPAPER(), R.x, R.y, R.w, R.h); X.restore();
  X.restore();
}

// ============ ACT 4: ORDER (21.5 – 23.6) ============
function act4(t) {
  act3(Math.min(t, 21.69));
  const [cs, fx, fy] = cam3(21.6);
  const bcx = (1160 - fx) * cs + C, bcy = (822 - fy) * cs + C;
  const states = [[21.5, 560, 150, 75], [22.0, 660, 150, 75], [22.5, 880, 190, 95], [23.0, 230, 230, 115]];
  let w = 380 * cs, h = 54 * cs, r = h / 2, cx = bcx, cy = bcy, prev = [w, h, r];
  const mv = spr(t, 21.5, 1.8, 0.75); cx = lerp(bcx, C, mv); cy = lerp(bcy, C, mv);
  for (const [ti, sw, sh, sr] of states) { const u = spr(t, ti, 2.0, 0.68); w += (sw - prev[0]) * u; h += (sh - prev[1]) * u; r += (sr - prev[2]) * u; prev = [sw, sh, sr]; }
  // flood: overscale past the corners in ~0.3s
  const fl = eio(prog(t, 23.28, 23.58));
  if (fl > 0) { const big = 2200; w = lerp(w, big, fl); h = lerp(h, big, fl); r = lerp(r, big / 2, fl); }
  X.fillStyle = INK; rrc(X, cx, cy, w, h, r); X.fill();
  if (fl >= 1) return;
  X.save(); rrc(X, cx, cy, w, h, r); X.clip(); X.fillStyle = '#fff'; X.strokeStyle = '#fff'; X.textAlign = 'center';
  const lab = (s, t0, t1, dx = 0, size = 46) => { const a = eio(prog(t, t0, t0 + 0.24)), b = eio(prog(t, t1, t1 + 0.22)); if (a <= 0 || b >= 1) return; font(X, size, 'Geist', 600); X.fillText(s, cx + dx, cy + 16 + (1 - a) * 120 - b * 120); };
  const check = (x, y, s, p) => { if (p <= 0) return; X.lineWidth = 7 * s; X.lineCap = 'round'; X.lineJoin = 'round'; X.beginPath(); const pts = [[-14, 0], [-4, 11], [16, -12]]; const L1 = 14.9, L2 = 30.5, tot = L1 + L2; let d = p * tot;
    X.moveTo(x + pts[0][0] * s, y + pts[0][1] * s); if (d <= L1) X.lineTo(x + lerp(pts[0][0], pts[1][0], d / L1) * s, y + lerp(pts[0][1], pts[1][1], d / L1) * s); else { X.lineTo(x + pts[1][0] * s, y + pts[1][1] * s); d -= L1; X.lineTo(x + lerp(pts[1][0], pts[2][0], d / L2) * s, y + lerp(pts[1][1], pts[2][1], d / L2) * s); } X.stroke(); X.lineCap = 'butt'; };
  lab('Ordered', 21.62, 21.96, -28);
  if (t >= 21.62 && t < 22.0) check(cx + 110, cy, 1.3, eio(prog(t, 21.75, 21.92)) * (1 - eio(prog(t, 21.96, 22.0))));
  const pc = Math.round(100 * eio(prog(t, 22.08, 22.45)));
  if (t >= 22.0 && t < 22.52) { X.fillStyle = '#2A2A2E'; X.fillRect(cx - w / 2, cy - h / 2, w * pc / 100 * (t < 22.45 ? 1 : 1), h); X.fillStyle = '#fff'; }
  lab(`Printing ${pc}%`, 22.04, 22.47);
  if (t >= 22.5 && t < 23.02) {
    const a = eio(prog(t, 22.54, 22.76)), b = eio(prog(t, 22.97, 23.15));
    font(X, 42, 'Geist', 600); X.textAlign = 'left'; X.fillText('On its way', cx - w / 2 + 70, cy + 15 + (1 - a) * 120 - b * 120);
    const rx0 = cx + 30, rx1 = cx + w / 2 - 70; X.setLineDash([2, 12]); X.lineCap = 'round'; X.lineWidth = 5; X.strokeStyle = 'rgba(255,255,255,0.55)';
    X.beginPath(); X.moveTo(rx0, cy + (1 - a) * 120); X.lineTo(rx1, cy + (1 - a) * 120); X.stroke(); X.setLineDash([]); X.lineCap = 'butt';
    X.fillStyle = '#fff'; X.beginPath(); X.arc(rx1, cy + (1 - a) * 120, 9 * a, 0, TAU); X.fill();
    const vx = lerp(rx0, rx1 - 40, eio(prog(t, 22.6, 23.0))), vy = cy + (1 - a) * 120 - b * 120;
    X.save(); X.translate(vx, vy); X.fillStyle = '#fff'; rr(X, -30, -22, 40, 30, 5); X.fill(); rr(X, 10, -12, 20, 20, 5); X.fill();
    X.fillStyle = INK; X.beginPath(); X.arc(-18, 10, 7, 0, TAU); X.arc(18, 10, 7, 0, TAU); X.fill(); X.fillStyle = '#fff'; X.beginPath(); X.arc(-18, 10, 3.5, 0, TAU); X.arc(18, 10, 3.5, 0, TAU); X.fill(); X.restore();
    X.textAlign = 'center';
  }
  if (t >= 23.0) check(cx, cy + 4, 2.4, eio(prog(t, 23.05, 23.25)));
  X.restore(); X.textAlign = 'left';
}

// ============ ACT 5: WALL (23.6 – 26.5) ============
const WALLTEX = mk(720, 720); const LEAF = mk(360, 360);
function buildWall() {
  const g = WALLTEX.getContext('2d'); g.fillStyle = '#E8E1D5'; g.fillRect(0, 0, 720, 720);
  const id = g.getImageData(0, 0, 720, 720), d = id.data, R = rng(3);
  for (let i = 0; i < d.length; i += 4) { const n = (R() - 0.5) * 10; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(id, 0, 0);
}
function drawWall(t) {
  X.drawImage(WALLTEX, 0, 0, S, S);
  const sun = X.createRadialGradient(980, 380, 60, 900, 520, 1000); sun.addColorStop(0, 'rgba(255,236,200,0.55)'); sun.addColorStop(1, 'rgba(255,236,200,0)');
  X.fillStyle = sun; X.fillRect(0, 0, S, S);
  const g = LEAF.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 360, 360);
  g.fillStyle = '#000'; const R = rng(17);
  const sway = Math.sin(t * 1.7) * 0.05 + Math.sin(t * 2.9 + 1) * 0.02;
  for (let b = 0; b < 3; b++) {
    const bx = 380 - b * 26, by = -20 + b * 70; g.save(); g.translate(bx, by); g.rotate(2.3 + b * 0.25 + sway * (1 + b));
    g.lineWidth = 2.2; g.strokeStyle = '#000'; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(60, 20, 200, 10); g.stroke();
    for (let i = 0; i < 9; i++) { const u = i / 9; const x = u * 190, y = 10 * Math.sin(u * 3); const side = i % 2 ? 1 : -1;
      g.save(); g.translate(x, y); g.rotate(side * (0.75 + R() * 0.3) + Math.sin(t * 2.3 + i + b) * 0.08); g.beginPath(); g.ellipse(22, 0, 24 + R() * 8, 8 + R() * 3, 0, 0, TAU); g.fill(); g.restore(); }
    g.restore();
  }
  X.save(); X.globalAlpha = 0.16; X.imageSmoothingQuality = 'high'; X.drawImage(LEAF, 0, 0, S, S); X.restore();
}
const FR = { cx: 720, cy: 690, w: 520, h: 650, mold: 26, mat: 58 };
function act5(t) {
  if (t < 24.0 || t >= 25.85) { X.fillStyle = INK; X.fillRect(0, 0, S, S); if (t < 24.0) return; }
  drawWall(t);
  // black contracts into the frame / later floods back
  const c = eio(prog(t, 24.0, 24.36)), f = ei(prog(t, 25.5, 25.8));
  const k = c * (1 - f); const ov = 1600;
  const w = lerp(ov, FR.w, k), h = lerp(ov, FR.h, k);
  X.save(); X.shadowColor = `rgba(40,25,10,${0.35 * k})`; X.shadowBlur = 50; X.shadowOffsetY = 26; X.shadowOffsetX = -10; X.fillStyle = INK; rrc(X, FR.cx, FR.cy, w, h, 2); X.fill(); X.restore();
  const ix = FR.cx - w / 2 + FR.mold, iy = FR.cy - h / 2 + FR.mold, iw = w - 2 * FR.mold, ih = h - 2 * FR.mold;
  if (iw <= 0) return;
  // mat + print, under the iris
  X.save(); X.beginPath(); X.rect(ix, iy, iw, ih); X.clip();
  X.fillStyle = '#F7F4EE'; X.fillRect(ix, iy, iw, ih);
  const mt = FR.mat * (iw / (FR.w - 2 * FR.mold)); X.fillStyle = 'rgba(0,0,0,0.12)'; X.fillRect(ix + mt - 2, iy + mt - 2, iw - 2 * mt + 4, ih - 2 * mt + 4);
  cover(X, WALLPAPER(), ix + mt, iy + mt, iw - 2 * mt, ih - 2 * mt);
  const open = eo5(prog(t, 24.48, 24.82)) * (1 - eio(prog(t, 25.18, 25.48)));
  const Rr = Math.hypot(iw, ih) / 2 + 4;
  iris(X, FR.cx, FR.cy, Rr, Rr * open, 0.3 + (1 - open) * 1.1, '#0B0B0C', '#2E2E32', 2 * eio(prog(k, 0.55, 1)));
  X.restore();
  // glass reflection sweep across the print (no glow; a hard-edged sheen band)
  if (open > 0.5) { X.save(); X.beginPath(); X.rect(ix, iy, iw, ih); X.clip(); const sx = lerp(ix - 200, ix + iw + 200, prog(t, 24.7, 25.15)); X.fillStyle = 'rgba(255,255,255,0.10)';
    X.beginPath(); X.moveTo(sx, iy); X.lineTo(sx + 90, iy); X.lineTo(sx - 60, iy + ih); X.lineTo(sx - 150, iy + ih); X.fill(); X.restore(); }
}

// ============ ACT 6: RETURN (25.85 – 27) ============
function act6(t) {
  X.fillStyle = PAPER; X.fillRect(0, 0, S, S);
  if (t < 26.5) {
    const a = eio(prog(t, 26.0, 26.3)), b = eio(prog(t, 26.3, 26.5));
    const full = { cx: C, cy: C, w: 1700, h: 1700, r: 0 };
    let R = lerpRect(full, PILL, a); R = lerpRect(R, dotRect(), b);
    X.fillStyle = INK; rrc(X, R.cx, R.cy, R.w, R.h, R.r); X.fill();
  } else act1(t);
}

// ============ MASTER ============
function frame(t) {
  X.setTransform(1, 0, 0, 1, 0, 0); X.globalAlpha = 1; X.globalCompositeOperation = 'source-over'; X.textAlign = 'left'; X.filter = 'none';
  if (t < 8.0) act1(t);
  else if (t < 14.0) act2(t);
  else if (t < 21.5) act3(t);
  else if (t < 23.62) act4(t);
  else if (t < 25.85) act5(t);
  else act6(t);
}
window.seek = async t => { frame(clamp(t, 0, DUR)); };
window.ready = (async () => {
  await document.fonts.load('800 100px Archivo'); await document.fonts.load('600 40px Geist');
  await document.fonts.ready; buildPhotos(); buildWall(); layoutWordmark(); return true;
})();
if (!location.search.includes('render')) window.ready.then(() => { const t0 = performance.now(); const loop = () => { frame(((performance.now() - t0) / 1000) % DUR); requestAnimationFrame(loop); }; loop(); });
