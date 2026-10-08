/* One shape, never cut — 7 bars @120 BPM, loops.
   button → loader → check → island → player (play/pause) → scrub → volume (stretch past max)
   → toggle → knob becomes liquid tab indicator → chart (draws, tooltip) → ⌘K (type, filter)
   → enter → toast → button.                                                              */
const CONFIG = { size: 1440, dur: 14, bpm: 120, offset: 0, bg: '#ECEAE6', fonts: ['600 40px Geist', '500 40px Geist'] };
const B = n => beat(n);
const INK = '#0B0B0C', WH = '#FFFFFF', DIM = 'rgba(255,255,255,0.55)', TRACK = '#3A3A3D';
const SET = 0.5;   // every state change is settled within half a beat -> exact loop at t=dur

// ---------------- the one shape ----------------
const STATES = [
  [0, { w: 380, h: 116, r: 58, fill: INK }],           // button
  [B(2), { w: 116, h: 116, r: 58 }],                    // loader
  [B(5), { w: 440, h: 116, r: 58 }],                    // dynamic island
  [B(6), { w: 880, h: 340, r: 64 }],                    // music player
  [B(12), { w: 880, h: 124, r: 62 }],                   // volume slider
  [B(15), { w: 250, h: 136, r: 68, fill: '#B3AFA8' }],  // toggle (off)
  [B(16), { fill: INK }],                               // toggle flips on the beat
  [B(17), { w: 900, h: 116, r: 58 }],                   // tabs
  [B(20), { w: 980, h: 680, r: 52 }],                   // chart
  [B(23), { w: 980, h: 600, r: 44 }],                   // ⌘K
  [B(26), { w: 720, h: 116, r: 58 }],                   // toast
  [B(27), { w: 380, h: 116, r: 58 }],                   // back to the button
];

// ---------------- cursor (last key == first key, zero speed at both) ----------------
const HOME = [C + 120, C + 70];
const CUR = [[0, ...HOME], [0.35, 760, 738], [0.62, 760, 738], [1.1, 930, 880],
  [3.2, 1092, 668], [3.62, 1092, 668], [3.92, 700, 798], [4.0, 700, 798], [5.4, 990, 798], [5.62, 990, 806],
  [6.4, 794, 722], [6.5, 794, 722], [6.95, 1240, 724], [7.12, 1200, 760],
  [7.88, 740, 740], [8.1, 740, 740], [8.85, 724, 736], [9.05, 724, 736], [9.38, 1022, 736], [9.6, 1022, 736],
  [10.9, 935, 640], [11.35, 935, 640], [11.8, 1230, 1050], [13.6, 1100, 960], [14.0, ...HOME]];
const CLICKS = [[B(1), 0.1], [B(7), 0.1], [B(16), 0.1], [B(18), 0.1], [B(19), 0.1]];
const SCRUB = [B(8), B(11)], VOL = [B(13), B(14)];

// ---------------- helpers ----------------
function layer(t, tin, tout, fn) {   // content swap with a short blur, own enter/exit timing
  const a = eo(prog(t, tin, tin + 0.2)) * (1 - eio(prog(t, tout, tout + 0.14)));
  if (a <= 0.003) return; X.save(); X.globalAlpha = a; const bl = (1 - a) * 9; if (bl > 0.2) X.filter = `blur(${bl}px)`;
  const s = lerp(0.94, 1, a); X.translate(C, C); X.scale(s, s); X.translate(-C, -C); fn(a); X.restore();
}
function text(s, x, y, px, col = WH, wt = 600, align = 'center') { font(X, px, 'Geist', wt); X.fillStyle = col; X.textAlign = align; X.textBaseline = 'middle'; X.fillText(s, x, y); X.textAlign = 'left'; X.textBaseline = 'alphabetic'; }
function poly(pts) { X.beginPath(); pts.forEach((p, i) => i ? X.lineTo(...p) : X.moveTo(...p)); X.closePath(); X.fill(); }

// play ▶ <-> pause ‖ : two quads that interpolate point-for-point
const PLAY = [[[-14, -24], [3, -14], [3, 14], [-14, 24]], [[3, -14], [22, 0], [22, 0], [3, 14]]];
const PAUSE = [[[-18, -24], [-5, -24], [-5, 24], [-18, 24]], [[5, -24], [18, -24], [18, 24], [5, 24]]];

const scrubX = t => cursorAt(t, CUR)[0];
const progVal = t => dragValue(t, SCRUB[0], SCRUB[1], t2 => [scrubX(t2)], ([x]) => clamp((x - 600) / 500), null);
const volRaw = t => (t < VOL[0] ? 0.55 : (cursorAt(Math.min(t, VOL[1]), CUR)[0] - 420) / 680);

function draw(t) {
  const st = springState(t, STATES, 2.6, 0.78, SET);
  // volume: rubber band past max stretches the container; release springs it back
  let over = 0, vol = 0.55;
  if (t >= VOL[0]) {
    const held = rubber(volRaw(t) * 680, 0, 680); const relU = spring(t, VOL[1], 2.6, 0.7, SET);
    over = held.over * (1 - relU); vol = lerp(held.value / 680, 1, t > VOL[1] ? relU : 0);
    if (t > VOL[1]) { const h0 = rubber(volRaw(VOL[1]) * 680, 0, 680); over = h0.over * (1 - relU); vol = lerp(h0.value / 680, 1, relU); }
  }
  const w = st.w + over * 2, h = st.h, cx = C + over;
  // camera: partial fit so each state fills the frame but size changes still read
  const fit = Math.min(S * 0.74 / st.w, S * 0.74 / st.h);
  // screen-studio push-in on the progress bar while scrubbing
  const push = spring(t, SCRUB[0] - 0.2, 2.2, 0.8, SET) - spring(t, SCRUB[1], 2.2, 0.8, SET);
  const cam = [lerp(C, 850, push), lerp(C, 760, push), Math.pow(clamp(fit, 0.6, 3.2), 0.75) * (1 + 0.45 * push)];
  X.save(); applyCam(X, cam);

  X.fillStyle = st.fill; rrc(X, cx, C, w, h, st.r); X.fill();
  X.save(); rrc(X, cx, C, w, h, st.r); X.clip();

  // button
  layer(t, -1, B(1.6), () => text('Get started', C, C, 40));
  layer(t, B(27.2), 99, () => text('Get started', C, C, 40));
  // loader
  layer(t, B(2), B(3.9), () => { X.strokeStyle = WH; X.lineWidth = 9; X.lineCap = 'round'; const a0 = t * TAU * 1.5; X.beginPath(); X.arc(C, C, 30, a0, a0 + 4.2); X.stroke(); X.lineCap = 'butt'; });
  // check
  layer(t, B(4), B(4.9), () => { const p = eio(prog(t, B(4) + 0.04, B(4) + 0.3)); X.strokeStyle = WH; X.lineWidth = 10; X.lineCap = 'round'; X.lineJoin = 'round';
    const P = [[C - 22, C + 2], [C - 6, C + 18], [C + 24, C - 16]], L1 = Math.hypot(16, 16), L2 = Math.hypot(30, 34); let d = p * (L1 + L2);
    X.beginPath(); X.moveTo(...P[0]); if (d <= L1) X.lineTo(lerp(P[0][0], P[1][0], d / L1), lerp(P[0][1], P[1][1], d / L1)); else { X.lineTo(...P[1]); d -= L1; X.lineTo(lerp(P[1][0], P[2][0], d / L2), lerp(P[1][1], P[2][1], d / L2)); } X.stroke(); X.lineCap = 'butt'; });
  // dynamic island
  layer(t, B(5), B(5.9), () => { X.fillStyle = '#E9E6E0'; rrc(X, C - 160, C, 64, 64, 18); X.fill();
    for (let i = 0; i < 6; i++) { const hh = 14 + 26 * Math.abs(Math.sin(t * 7 + i * 1.1)); X.fillStyle = WH; rrc(X, C + 110 + i * 16, C, 7, hh, 3.5); X.fill(); } });
  // music player
  layer(t, B(6), B(11.9), () => {
    X.fillStyle = '#E9E6E0'; rr(X, 330, 600, 220, 220, 30); X.fill(); X.fillStyle = INK; X.beginPath(); X.arc(440, 710, 46, 0, TAU); X.fill(); X.fillStyle = '#E9E6E0'; X.beginPath(); X.arc(440, 710, 10, 0, TAU); X.fill();
    const spin = progVal(t) * TAU * 4 + spring(t, B(7), 1, 1, SET) * (t - B(7)) * 2; X.strokeStyle = '#E9E6E0'; X.lineWidth = 6; X.lineCap = 'round';
    X.beginPath(); X.moveTo(440 + Math.cos(spin) * 18, 710 + Math.sin(spin) * 18); X.lineTo(440 + Math.cos(spin) * 38, 710 + Math.sin(spin) * 38); X.stroke(); X.lineCap = 'butt';
    // waveform above the bar reacts to the scrub position
    for (let i = 0; i < 40; i++) { const x = 600 + i * 12.5, on = (x - 600) / 500 <= progVal(t); const hh = 6 + 22 * Math.abs(Math.sin(i * 1.7 + 0.3) * Math.sin(i * 0.37 + t * 1.5));
      X.fillStyle = on ? WH : TRACK; rrc(X, x + 4, 760, 6, hh, 3); X.fill(); }
    text('Midnight Drive', 600, 650, 38, WH, 600, 'left'); text('Lumen', 600, 700, 30, DIM, 500, 'left');
    const v = progVal(t), held = t >= SCRUB[0] - 0.05 && t <= SCRUB[1];
    X.fillStyle = TRACK; rrc(X, 850, 798, 500, 8, 4); X.fill(); X.fillStyle = WH; rr(X, 600, 794, 500 * v, 8, 4); X.fill();
    const ks = springTo(t, 1, [[SCRUB[0], 1.7, 3, 0.7, SET], [SCRUB[1], 1, 3, 0.7, SET]]);
    X.beginPath(); X.arc(600 + 500 * v, 798, 9 * ks, 0, TAU); X.fill();
    const sec = Math.round(v * 214); text(`${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`, 600, 836, 24, DIM, 500, 'left'); text('3:34', 1100, 836, 24, DIM, 500, 'right');
    const m = spring(t, B(7), 3.0, 0.8, SET); X.fillStyle = WH; X.beginPath(); X.arc(1092, 668, 48, 0, TAU); X.fill(); X.fillStyle = INK;
    X.save(); X.translate(1092, 668); PLAY.forEach((q, i) => poly(q.map((p, j) => [lerp(p[0], PAUSE[i][j][0], m), lerp(p[1], PAUSE[i][j][1], m)]))); X.restore();
  });
  // volume slider
  layer(t, B(12), B(14.9), () => {
    X.fillStyle = WH; X.save(); X.translate(cx - w / 2 + 70, C); poly([[-14, -9], [-4, -9], [8, -20], [8, 20], [-4, 9], [-14, 9]]);
    X.strokeStyle = WH; X.lineWidth = 5; X.lineCap = 'round'; X.beginPath(); X.arc(10, 0, 18, -0.8, 0.8); X.stroke(); X.restore();
    const x0 = cx - w / 2 + 140, len = w - 140 - 60; X.fillStyle = TRACK; rr(X, x0, C - 7, len, 14, 7); X.fill();
    X.fillStyle = WH; rr(X, x0, C - 7, Math.max(14, len * (over > 0 ? 1 : vol)), 14, 7); X.fill();
  });
  // toggle knob -> liquid tab indicator (one element, two springs)
  const tabW = (900 - 16) / 3, tab = i => [278 + i * tabW, 278 + (i + 1) * tabW];
  const [L, R] = dualEdge(t, 609, 717, [[B(16), 723, 831], [B(17), ...tab(0)], [B(18), ...tab(1)], [B(19), ...tab(2)]], 3.4, 1.9, 0.8, SET);
  layer(t, B(15), B(19.9), () => {
    const kh = lerp(108, 100, spring(t, B(17), 2.6, 0.8, SET));
    const labels = ['Week', 'Month', 'Year'];
    layer(t, B(17.1), B(19.9), () => labels.forEach((s, i) => text(s, (tab(i)[0] + tab(i)[1]) / 2, C, 32)));
    X.fillStyle = WH; rr(X, L, C - kh / 2, R - L, kh, kh / 2); X.fill();
    X.save(); rr(X, L, C - kh / 2, R - L, kh, kh / 2); X.clip(); layer(t, B(17.1), B(19.9), () => labels.forEach((s, i) => text(s, (tab(i)[0] + tab(i)[1]) / 2, C, 32, INK))); X.restore();
  });
  // chart: draws itself, tooltip on hover
  const PTS = [0.32, 0.4, 0.36, 0.52, 0.47, 0.6, 0.55, 0.7, 0.82, 0.74, 0.88, 0.93];
  layer(t, B(20), B(22.9), () => {
    text('Revenue', 290, 440, 36, WH, 600, 'left'); text('Year', 1150, 440, 28, DIM, 500, 'right');
    text('$612k', 290, 490, 30, DIM, 500, 'left');
    const x0 = 300, x1 = 1140, y0 = 980, y1 = 560, px = i => lerp(x0, x1, i / 11), py = v => lerp(y0, y1, v);
    X.strokeStyle = 'rgba(255,255,255,0.12)'; X.lineWidth = 2; for (let g = 0; g < 4; g++) { X.beginPath(); X.moveTo(x0, lerp(y0, y1, g / 3)); X.lineTo(x1, lerp(y0, y1, g / 3)); X.stroke(); }
    const p = eio(prog(t, B(20) + 0.1, B(21) + 0.4)) * 11; X.strokeStyle = WH; X.lineWidth = 7; X.lineJoin = 'round'; X.lineCap = 'round';
    X.beginPath(); X.moveTo(px(0), py(PTS[0])); for (let i = 1; i <= Math.floor(p); i++) X.lineTo(px(i), py(PTS[i]));
    const f = p - Math.floor(p), k = Math.floor(p); if (k < 11) X.lineTo(lerp(px(k), px(k + 1), f), lerp(py(PTS[k]), py(PTS[k + 1]), f)); X.stroke();
    const hv = spring(t, B(22), 3, 0.75, SET);
    if (hv > 0.01) { const hx = px(8), hy = py(PTS[8]); X.strokeStyle = 'rgba(255,255,255,0.35)'; X.lineWidth = 2; X.beginPath(); X.moveTo(hx, y0); X.lineTo(hx, hy); X.stroke();
      X.fillStyle = WH; X.beginPath(); X.arc(hx, hy, 12 * hv, 0, TAU); X.fill();
      X.save(); X.translate(hx, hy - 70); X.scale(hv, hv); X.fillStyle = WH; rrc(X, 0, 0, 170, 64, 32); X.fill(); text('$48.2k', 0, 0, 30, INK); X.restore(); }
  });
  // ⌘K palette: type to filter
  const items = ['Export chart', 'Share link', 'Duplicate view', 'Explore data', 'Settings'];
  const typed = 'exp'.slice(0, [B(24), B(24.4), B(24.8)].filter(x => t >= x).length);
  layer(t, B(23), B(25.9), () => {
    X.strokeStyle = DIM; X.lineWidth = 5; X.beginPath(); X.arc(310, 482, 15, 0, TAU); X.moveTo(321, 493); X.lineTo(333, 505); X.stroke();
    if (typed) text(typed, 356, 486, 36, WH, 500, 'left'); else text('Search…', 356, 486, 36, DIM, 500, 'left');
    font(X, 36, 'Geist', 500); const cw = X.measureText(typed).width; if (Math.floor(t * 4) % 2 === 0 || typed.length < 3) { X.fillStyle = WH; X.fillRect(358 + cw + 4, 466, 3, 40); }
    X.fillStyle = TRACK; rrc(X, 1110, 484, 74, 46, 12); X.fill(); text('⌘K', 1110, 486, 24, WH, 600);
    X.fillStyle = 'rgba(255,255,255,0.1)'; X.fillRect(270, 540, 900, 2);
    items.forEach((s, i) => {
      const keepIdx = items.slice(0, i).filter(x => x.toLowerCase().includes('exp')).length;
      const yFull = 600 + i * 76, yFilt = 600 + keepIdx * 76;
      const fu = spring(t, B(24.8), 2.6, 0.8, SET); const y = lerp(yFull, yFilt, fu);
      const out = items[i].toLowerCase().includes('exp') ? 0 : eio(prog(t, B(24.8), B(24.8) + 0.18));
      if (out >= 1) return;
      X.save(); X.globalAlpha = 1 - out; if (out > 0.02) X.filter = `blur(${out * 8}px)`;
      if (i === 0) { const hl = spring(t, B(25), 3, 0.8, SET); X.fillStyle = `rgba(255,255,255,${0.12 * hl})`; rr(X, 286, y - 32, 868, 64, 16); X.fill(); }
      X.fillStyle = 'rgba(255,255,255,0.18)'; rrc(X, 320, y, 36, 36, 9); X.fill(); text(s, 360, y + 2, 32, WH, 500, 'left'); X.restore();
    });
    const ent = spring(t, B(25.6), 3, 0.7, SET) * (1 - spring(t, B(26), 3, 0.7, SET)); if (ent > 0.01) { X.fillStyle = TRACK; rrc(X, 1110, 600, 60 * (0.9 + 0.1 * ent), 46, 12); X.fill(); text('↵', 1110, 602, 26, WH); }
  });
  // toast
  layer(t, B(26), B(26.9), () => { X.fillStyle = WH; X.beginPath(); X.arc(C - 220, C, 22, 0, TAU); X.fill(); X.strokeStyle = INK; X.lineWidth = 5; X.lineCap = 'round'; X.beginPath(); X.moveTo(C - 230, C); X.lineTo(C - 223, C + 8); X.lineTo(C - 209, C - 8); X.stroke(); text('Chart exported', C + 30, C, 36); });
  X.restore();

  drawCursor(X, t, CUR, CLICKS, { held: (t >= SCRUB[0] && t <= SCRUB[1]) || (t >= VOL[0] && t <= VOL[1]) });
  X.restore();
}
