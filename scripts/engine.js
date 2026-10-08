/* =====================================================================
   motion-film ENGINE — every pixel is a pure function of t.
   No CSS transitions, no timers, no state carried between frames.
   The scene file (loaded AFTER this engine) defines:  CONFIG = {size, dur, bpm, offset, fonts, bg}
                            function setup()   (optional, async ok)
                            function draw(t)   (required)
   The engine exposes:      window.seek(t), window.ready, preview loop.
   ===================================================================== */
const PI = Math.PI, TAU = PI * 2;
let S = 1440, C = 720, DUR = 10, BPM = 120, OFFSET = 0;
const cv = document.getElementById('c');
const X = cv.getContext('2d', { willReadFrequently: false });

/* ---------------- math & easing ---------------- */
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const prog = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, x) => a + (b - a) * x;
const smooth = x => x * x * (3 - 2 * x);
const eio = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;   // zero velocity at both ends
const eo = x => 1 - Math.pow(1 - x, 3);
const eo5 = x => 1 - Math.pow(1 - x, 5);
const ei = x => x * x * x;
const eback = (x, s = 1.3) => { const c = s + 1; return 1 + c * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); };
const beat = n => (CONFIG.offset ?? 0) + n * 60 / (CONFIG.bpm ?? 120);   // beat index -> seconds (safe at scene top level)
const bar = (n, b = 0) => beat(n * 4 + b);          // bar n, beat b
function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ---------------- springs (closed form) ----------------
   spring(t, t0, f, z): step response 0 -> 1 starting at t0.
   f = natural frequency (Hz), z = damping ratio. z 0.7–0.8 = "tiny overshoot at most".
   The response is forced to settle exactly to 1 by t0 + settle, so act boundaries never pop. */
function spring(t, t0, f = 2.2, z = 0.72, settle = 1.0) {
  if (t <= t0) return 0; const x = t - t0; if (x >= settle) return 1;
  const w = TAU * f; let s;
  if (z < 1) { const wd = w * Math.sqrt(1 - z * z); s = 1 - Math.exp(-z * w * x) * (Math.cos(wd * x) + z * w / wd * Math.sin(wd * x)); }
  else s = 1 - Math.exp(-w * x) * (1 + w * x);
  const k = smooth(prog(x, settle * 0.6, settle)); return s + (1 - s) * k;
}
// A value with many targets = sum of one spring per change: stays a pure function of t.
// changes: [[t0, value, f?, z?, settle?], ...]
function springTo(t, v0, changes, f = 2.2, z = 0.72, settle = 1.0) {
  let v = v0, p = v0;
  for (const c of changes) { v += (c[1] - p) * spring(t, c[0], c[2] ?? f, c[3] ?? z, c[4] ?? settle); p = c[1]; }
  return v;
}
// Two edges on different springs: the leading edge runs ahead, the trailing edge catches up.
// Use for tab indicators, toggle knobs, liquid pills. changes: [[t0, left, right], ...] -> [L, R]
function dualEdge(t, l0, r0, changes, fast = 3.4, slow = 1.9, z = 0.8, settle = 0.9) {
  let L = l0, R = r0, pl = l0, pr = r0;
  for (const [t0, l1, r1] of changes) {
    const right = (l1 + r1) / 2 > (pl + pr) / 2;
    L += (l1 - pl) * spring(t, t0, right ? slow : fast, z, settle);
    R += (r1 - pr) * spring(t, t0, right ? fast : slow, z, settle);
    pl = l1; pr = r1;
  } return [L, R];
}
// Spring a whole state object (numbers and colors) through a list of states.
// states: [[t0, {w, h, r, fill, ...}], ...]; a key missing from a state keeps its previous value.
function springState(t, states, f = 2.2, z = 0.74, settle = 1.0) {
  const out = {}; const keys = new Set(); states.forEach(s => Object.keys(s[1]).forEach(k => keys.add(k)));
  for (const k of keys) {
    const seq = []; let last;
    for (const s of states) { if (s[1][k] !== undefined) last = s[1][k]; if (last !== undefined) seq.push([s[0], last]); }
    const v0 = seq[0][1];
    if (typeof v0 === 'number') out[k] = springTo(t, v0, seq.slice(1).map(c => [c[0], c[1], f, z, settle]));
    else if (/^#|^rgb/.test(v0)) { const c0 = rgb(v0); out[k] = rgbs([0, 1, 2].map(i => springTo(t, c0[i], seq.slice(1).map(c => [c[0], rgb(c[1])[i], f, z, settle])))); }
    else { let v = v0; for (const c of seq) if (t >= c[0]) v = c[1]; out[k] = v; }
  } return out;
}
function rgb(c) { if (c[0] === '#') { const h = c.length === 4 ? c.slice(1).split('').map(x => x + x).join('') : c.slice(1); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); } return c.match(/[\d.]+/g).slice(0, 3).map(Number); }
const rgbs = a => `rgb(${a.map(v => Math.round(clamp(v, 0, 255))).join(',')})`;
const mixc = (a, b, u) => rgbs(rgb(a).map((v, i) => lerp(v, rgb(b)[i], u)));

/* ---------------- direct manipulation ----------------
   While held, the value is computed from the cursor position. On release it springs
   back (or settles) from wherever it was — still a pure function of t. */
function dragValue(t, tDown, tUp, cursorAt, map, rest = null, f = 2.4, z = 0.7) {
  if (t < tDown) return rest ?? map(cursorAt(tDown));
  if (t <= tUp) return map(cursorAt(t));
  const vUp = map(cursorAt(tUp)); const target = rest ?? vUp;
  return lerp(vUp, target, spring(t, tUp, f, z));
}
// Rubber-band past limits (slider stretched beyond max): returns {value, over}
function rubber(v, lo, hi, k = 0.35) {
  if (v > hi) return { value: hi, over: (1 - 1 / ((v - hi) * k / (hi - lo + 1e-6) + 1)) * (hi - lo) * 0.25 };
  if (v < lo) return { value: lo, over: -(1 - 1 / ((lo - v) * k / (hi - lo + 1e-6) + 1)) * (hi - lo) * 0.25 };
  return { value: v, over: 0 };
}

/* ---------------- geometry & drawing ---------------- */
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function rr(g, x, y, w, h, r) {
  w = Math.max(w, 0); h = Math.max(h, 0); r = Math.max(0, Math.min(r, w / 2, h / 2));
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
const rrc = (g, cx, cy, w, h, r) => rr(g, cx - w / 2, cy - h / 2, w, h, r);
function cover(g, img, x, y, w, h, squish = false) {
  if (w <= 0.5 || h <= 0.5 || !img) return; if (squish) { g.drawImage(img, x, y, w, h); return; }
  const iw = img.videoWidth || img.width, ih = img.videoHeight || img.height, s = Math.max(w / iw, h / ih);
  const sw = w / s, sh = h / s; g.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, x, y, w, h);
}
function font(g, px, fam = 'Geist', wt = 600, stretch = 'normal') { g.font = `${wt} ${px}px "${fam}"`; g.fontStretch = stretch; }
const pt = (M, x, y) => { const p = M.transformPoint(new DOMPoint(x, y)); return [p.x, p.y]; };
function lerpRect(a, b, u) { const o = {}; for (const k in a) o[k] = typeof a[k] === 'number' ? lerp(a[k], b[k] ?? a[k], u) : a[k]; return o; }

/* ---------------- text swaps ----------------
   Text inside a morphing container needs its OWN enter and exit timing or it overlaps.
   mode 'rise': rises out of a mask line (launch-film style, no blur)
   mode 'blur': short blur + scale swap (UI-morph style)                                  */
function swapText(g, t, items, clip, mode = 'rise') {
  // items: [{text, t0, t1, x, y, font:[px,fam,wt,stretch], color, align}]
  g.save(); if (clip) { g.beginPath(); clip(g); g.clip(); }
  for (const it of items) {
    const a = prog(t, it.t0, it.t0 + (it.inDur ?? 0.22)), b = it.t1 == null ? 0 : prog(t, it.t1, it.t1 + (it.outDur ?? 0.16));
    if (a <= 0 || b >= 1) continue;
    font(g, ...it.font); g.fillStyle = it.color ?? '#fff'; g.textAlign = it.align ?? 'center'; g.textBaseline = 'middle';
    if (mode === 'rise') {
      const h = it.font[0] * 1.3; const dy = (1 - eo5(a)) * h - eio(b) * h;
      g.fillText(it.text, it.x, it.y + dy);
    } else {
      const bl = (1 - eo(a)) * 10 + eio(b) * 10; const s = lerp(0.92, 1, eo(a)) * lerp(1, 1.04, eio(b));
      g.save(); g.filter = bl > 0.15 ? `blur(${bl}px)` : 'none'; g.globalAlpha = Math.min(eo(a), 1 - eio(b));
      g.translate(it.x, it.y); g.scale(s, s); g.fillText(it.text, 0, 0); g.restore();
    }
  }
  g.restore(); g.textAlign = 'left'; g.textBaseline = 'alphabetic';
}
// Single line rising out of a mask line (rect clip).
function riseText(g, str, x, y, clipRect, u, align = 'center') {
  g.save(); g.beginPath(); g.rect(...clipRect); g.clip();
  g.textAlign = align; g.fillText(str, x, y + (1 - u) * clipRect[3] * 1.05); g.restore(); g.textAlign = 'left';
}

/* ---------------- accordion wordmark ----------------
   Every letter moves toward the dot by the same factor k and its drawn width follows,
   so letters stay touching. k=1 open, k=0 squeezed into the period.                     */
function wordmarkLayout(text, px, fam = 'Archivo', wt = 800, stretch = 'expanded', cx = C, cy = C) {
  font(X, px, fam, wt, stretch); const body = text.replace(/\.$/, ''); const hasDot = text.endsWith('.');
  const adv = [...body].map(ch => X.measureText(ch).width); const dm = X.measureText('.');
  const tot = adv.reduce((a, b) => a + b, 0) + (hasDot ? dm.width : 0); const x0 = cx - tot / 2;
  const cap = X.measureText(body[0]).actualBoundingBoxAscent; const base = cy + cap / 2;
  const xs = []; let x = x0; for (const a of adv) { xs.push(x); x += a; }
  const dot = hasDot ? { x: x - dm.actualBoundingBoxLeft, y: base - dm.actualBoundingBoxAscent, w: dm.actualBoundingBoxRight + dm.actualBoundingBoxLeft, h: dm.actualBoundingBoxAscent + dm.actualBoundingBoxDescent } : { x, y: base - 10, w: 0, h: 0 };
  return { body, px, fam, wt, stretch, adv, xs, base, dot, rect: { cx: dot.x + dot.w / 2, cy: dot.y + dot.h / 2, w: dot.w, h: dot.h, r: dot.w * 0.12 } };
}
function drawWordmark(g, L, k, color = '#0B0B0C', drawDot = true) {
  font(g, L.px, L.fam, L.wt, L.stretch); g.fillStyle = color; const xa = L.dot.x;
  if (k > 0.002) [...L.body].forEach((ch, i) => { g.save(); g.translate(xa - (xa - L.xs[i]) * k, L.base); g.scale(k, 1); g.fillText(ch, 0, 0); g.restore(); });
  if (drawDot) { const d = L.rect; rrc(g, d.cx, d.cy, d.w, d.h, d.r); g.fill(); }  // dot drawn as a shape so it can morph
}

/* ---------------- iris: 6 blades on a hexagonal aperture ----------------
   Each blade = its two vertices, both edge extensions and the SHORT arc between them.
   Arc is drawn as a polyline and aperture is floored at 1px: Skia mis-fills degenerate
   sub-pixel blade tips at some canvas positions (leaves a wedge-shaped hole).             */
function rayCircle(p, d, cx, cy, R) { const ox = p[0] - cx, oy = p[1] - cy, b = d[0] * ox + d[1] * oy, c = ox * ox + oy * oy - R * R; const s = -b + Math.sqrt(Math.max(0, b * b - c)); return [p[0] + d[0] * s, p[1] + d[1] * s]; }
function iris(g, cx, cy, R, a, rot, col = '#141416', seam = '#3A3A3E', seamW = 2) {
  if (a >= R) return; const closed = a < 1; a = Math.max(a, 1);
  const V = []; for (let k = 0; k < 6; k++) { const an = rot + k * TAU / 6; V.push([cx + a * Math.cos(an), cy + a * Math.sin(an)]); }
  const nd = (p, q) => { const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy); return [dx / l, dy / l]; };
  for (let i = 0; i < 6; i++) {
    const v0 = V[i], v1 = V[(i + 1) % 6], vp = V[(i + 5) % 6];
    const E = rayCircle(v1, nd(v0, v1), cx, cy, R), F = rayCircle(v0, nd(vp, v0), cx, cy, R);
    const a1 = Math.atan2(E[1] - cy, E[0] - cx); let dl = Math.atan2(F[1] - cy, F[0] - cx) - a1;
    while (dl > PI) dl -= TAU; while (dl < -PI) dl += TAU;
    g.beginPath(); g.moveTo(v0[0], v0[1]); g.lineTo(v1[0], v1[1]); g.lineTo(E[0], E[1]);
    for (let q = 1; q <= 20; q++) { const an = a1 + dl * q / 20; g.lineTo(cx + R * Math.cos(an), cy + R * Math.sin(an)); }
    g.closePath(); g.fillStyle = col; g.fill();
    if (seamW > 0.01) { g.strokeStyle = seam; g.lineWidth = seamW; g.lineJoin = 'round'; g.stroke(); }
  }
  if (closed) { g.fillStyle = col; g.beginPath(); g.arc(cx, cy, 2.5, 0, TAU); g.fill(); }
}

/* ---------------- liquid glass ----------------
   Each glass element samples its own clone of the scene behind it (BACK), magnified,
   plus a stronger-magnified refraction band at the rim, split into R/B at slightly
   different scales for chromatic edges, plus a rim light. Don't use backdrop-filter:url()
   (Chromium misreads displacement maps).                                                */
let BACK, LA, LB, MF, MB, G1, G2, G3; const GQ = 720;
function _glassInit() { BACK = mk(S, S); LA = mk(S, S); LB = mk(S, S); MF = mk(S, S); MB = mk(S, S); G1 = mk(GQ, GQ); G2 = mk(GQ, GQ); G3 = mk(GQ, GQ); G1.getContext('2d', { willReadFrequently: true }); }
function _reset(g) { g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.filter = 'none'; g.clearRect(0, 0, S, S); }
function snapBack() { const g = BACK.getContext('2d'); _reset(g); g.drawImage(cv, 0, 0); }
// shape(g, mode): draw the path then g.fill() or g.stroke() depending on mode ('fill'|'stroke')
function glass(shape, wcx, wcy, o = {}) {
  const M = X.getTransform(); const [cx, cy] = pt(M, wcx, wcy); const sc = Math.hypot(M.a, M.b);
  const band = (o.band ?? 16) * sc; snapBack();
  const f = MF.getContext('2d'); _reset(f); f.setTransform(M); f.fillStyle = '#fff'; shape(f, 'fill');
  const b = MB.getContext('2d'); _reset(b); b.setTransform(M); b.strokeStyle = '#fff'; b.lineJoin = 'round'; b.lineWidth = band * 2 / sc; shape(b, 'stroke');
  b.setTransform(1, 0, 0, 1, 0, 0); b.globalCompositeOperation = 'destination-in'; b.drawImage(MF, 0, 0);
  _glassComposite(cx, cy, o, M, shape);
}
function _glassComposite(cx, cy, o, M, shape) {
  const mag = o.mag ?? 1.1, emag = o.emag ?? 1.32;
  const a = LA.getContext('2d'); _reset(a); a.translate(cx, cy); a.scale(mag, mag); a.translate(-cx, -cy); a.drawImage(BACK, 0, 0); a.setTransform(1, 0, 0, 1, 0, 0);
  const bb = LB.getContext('2d');
  _reset(bb); bb.translate(cx, cy); bb.scale(emag, emag); bb.translate(-cx, -cy); bb.drawImage(BACK, 0, 0);
  bb.setTransform(1, 0, 0, 1, 0, 0); bb.globalCompositeOperation = 'destination-in'; bb.drawImage(MB, 0, 0); a.drawImage(LB, 0, 0);
  for (const [col, m] of [['#ff0000', emag * 1.025], ['#0000ff', emag * 0.975]]) {
    _reset(bb); bb.translate(cx, cy); bb.scale(m, m); bb.translate(-cx, -cy); bb.drawImage(BACK, 0, 0);
    bb.setTransform(1, 0, 0, 1, 0, 0); bb.globalCompositeOperation = 'multiply'; bb.fillStyle = col; bb.fillRect(0, 0, S, S);
    bb.globalCompositeOperation = 'destination-in'; bb.drawImage(MB, 0, 0);
    a.globalCompositeOperation = 'lighter'; a.globalAlpha = 0.18; a.drawImage(LB, 0, 0); a.globalAlpha = 1;
  }
  a.globalCompositeOperation = 'source-atop'; a.fillStyle = o.tint ?? 'rgba(255,255,255,0.10)'; a.fillRect(0, 0, S, S);
  if (shape) {
    a.save(); a.setTransform(M); const inv = M.inverse(); const [x0, y0] = pt(inv, 0, 0), [x1, y1] = pt(inv, S, S);
    const gr = a.createLinearGradient(x0, y0, x1, y1);
    gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.15)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.1)'); gr.addColorStop(1, 'rgba(255,255,255,0.7)');
    a.strokeStyle = gr; a.lineWidth = (o.rim ?? 3) * 2 / Math.hypot(M.a, M.b); a.lineJoin = 'round'; a.globalCompositeOperation = 'source-over'; shape(a, 'stroke'); a.restore();
  }
  a.globalCompositeOperation = 'destination-in'; a.drawImage(MF, 0, 0);
  X.save(); X.setTransform(1, 0, 0, 1, 0, 0); X.shadowColor = `rgba(0,0,0,${o.shadow ?? 0.18})`; X.shadowBlur = 36; X.shadowOffsetY = 14; X.drawImage(LA, 0, 0); X.restore();
}
/* ---------------- goo (blur + alpha threshold) ----------------
   gooMask(draw, blur): draws shapes (world coords, current X transform) into a half-res
   mask, blurs, thresholds. Returns {fill, band} canvases at GQ res (scale up to S).
   Ramp blur up from 0 at the start of a goo section so the switch from crisp vector
   shapes doesn't pop.                                                                    */
function gooMask(draw, blur) {
  const g = G1.getContext('2d', { willReadFrequently: true }); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, GQ, GQ);
  const M = X.getTransform(); const k = GQ / S;
  g.filter = blur > 0.05 ? `blur(${blur * k}px)` : 'none'; g.setTransform(M.a * k, M.b * k, M.c * k, M.d * k, M.e * k, M.f * k); g.fillStyle = '#fff'; draw(g); g.filter = 'none';
  const id = g.getImageData(0, 0, GQ, GQ), d = id.data, bd = new ImageData(GQ, GQ), e = bd.data;
  for (let i = 3; i < d.length; i += 4) { const v = d[i]; d[i - 3] = d[i - 2] = d[i - 1] = 255; d[i] = clamp((v - 127) * 6 + 128, 0, 255); e[i - 3] = e[i - 2] = e[i - 1] = 255; e[i] = (v > 127 && v < 197) ? 255 : 0; }
  G2.getContext('2d').putImageData(id, 0, 0); G3.getContext('2d').putImageData(bd, 0, 0); return { fill: G2, band: G3 };
}
function gooFill(draw, blur, color) {   // solid goo (e.g. a black island pinching off)
  const m = gooMask(draw, blur); const l = LB.getContext('2d'); _reset(l); l.drawImage(m.fill, 0, 0, S, S);
  l.globalCompositeOperation = 'source-in'; l.fillStyle = color; l.fillRect(0, 0, S, S);
  X.save(); X.setTransform(1, 0, 0, 1, 0, 0); X.drawImage(LB, 0, 0); X.restore();
}
function gooGlass(draw, blur, wcx, wcy, o = {}) {
  const m = gooMask(draw, blur); const [cx, cy] = pt(X.getTransform(), wcx, wcy); snapBack();
  const f = MF.getContext('2d'); _reset(f); f.drawImage(m.fill, 0, 0, S, S);
  const b = MB.getContext('2d'); _reset(b); b.drawImage(m.band, 0, 0, S, S);
  _glassComposite(cx, cy, o, new DOMMatrix(), null);
}

/* ---------------- camera (screen-studio zoom) ----------------
   keys: [[t, cx, cy, scale], ...]; eased with zero velocity at each key, scale
   interpolated in log space so zooms feel uniform. Draw the cursor INSIDE the camera
   so it scales with it.                                                                 */
function camAt(t, keys) {
  if (t <= keys[0][0]) return keys[0].slice(1);
  for (let i = 1; i < keys.length; i++) { const a = keys[i - 1], b = keys[i]; if (t <= b[0]) { const u = eio(prog(t, a[0], b[0])); return [lerp(a[1], b[1], u), lerp(a[2], b[2], u), Math.exp(lerp(Math.log(a[3]), Math.log(b[3]), u))]; } }
  return keys[keys.length - 1].slice(1);
}
function applyCam(g, cam) { g.translate(C, C); g.scale(cam[2], cam[2]); g.translate(-cam[0], -cam[1]); }

/* ---------------- cursor ----------------
   keys: [[t, x, y], ...] eio between keys -> zero speed at every key (needed for loops:
   make the last key equal the first so position AND speed match).
   clicks: [[t, holdDur], ...]                                                            */
function cursorAt(t, keys) {
  if (t <= keys[0][0]) return [keys[0][1], keys[0][2]];
  for (let i = 1; i < keys.length; i++) { const a = keys[i - 1], b = keys[i]; if (t <= b[0]) { const u = eio(prog(t, a[0], b[0])); return [lerp(a[1], b[1], u), lerp(a[2], b[2], u)]; } }
  const k = keys[keys.length - 1]; return [k[1], k[2]];
}
function pressAt(t, clicks) { let p = 0; for (const [c, d] of clicks) if (t >= c - 0.06 && t <= c + d) p = Math.max(p, Math.min(prog(t, c - 0.06, c), 1 - prog(t, c + d - 0.06, c + d))); return p; }
function drawCursor(g, t, keys, clicks, o = {}) {
  const [x, y] = cursorAt(t, keys); const sc = Math.hypot(g.getTransform().a, g.getTransform().b) || 1;
  const ink = o.ink ?? '#0B0B0C', size = (o.size ?? 1.15) / sc;
  for (const [c] of clicks) { const p = prog(t, c, c + 0.4); if (p > 0 && p < 1) { g.strokeStyle = ink; g.lineWidth = (1 - p) * 5 / sc; g.beginPath(); g.arc(x, y, (14 + eo(p) * 46) / sc, 0, TAU); g.stroke(); } }
  if (o.longPress) { const [t0, t1] = o.longPress; const lp = prog(t, t0, t1); if (lp > 0 && t < t1 + 0.05) { g.strokeStyle = ink; g.lineWidth = 5 / sc; g.lineCap = 'round'; g.beginPath(); g.arc(x, y, 34 / sc, -PI / 2, -PI / 2 + TAU * eio(lp)); g.stroke(); g.lineCap = 'butt'; } }
  const press = Math.max(pressAt(t, clicks), o.held ? 1 : 0);
  g.save(); g.translate(x, y); const s = (1 - press * 0.16) * size; g.scale(s, s);
  g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 30); g.lineTo(7.5, 23.5); g.lineTo(12.5, 34.5); g.lineTo(17.5, 32.3); g.lineTo(12.6, 21.5); g.lineTo(22, 21.5); g.closePath();
  g.fillStyle = ink; g.strokeStyle = '#fff'; g.lineWidth = 2.6; g.lineJoin = 'round'; g.stroke(); g.fill(); g.restore();
  return [x, y];
}

/* ---------------- flood / contract ----------------
   A flood must overscale past the corners and take ~0.3s, or half the frame changes in
   one frame. floodRect returns a rect lerped from `from` to a full-bleed overscaled rect. */
function floodRect(from, u, over = 1.18) { const big = S * Math.SQRT2 * over; return { cx: lerp(from.cx, C, u), cy: lerp(from.cy, C, u), w: lerp(from.w, big, u), h: lerp(from.h, big, u), r: lerp(from.r, big / 2 * (from.r > 0 ? 1 : 0), u) }; }

/* ---------------- stand-ins (when real assets are unavailable) ----------------
   Procedural "photos": aligned day/golden pairs come from the same seed. Always tell the
   user these are stand-ins and offer to swap their real files in.                         */
function standinPhoto(seed, pal, opt = {}) {
  const N = opt.size ?? 1200, c = mk(N, N), g = c.getContext('2d', { willReadFrequently: true }), R = rng(seed), hz = opt.horizon ?? 0.62;
  let gr = g.createLinearGradient(0, 0, 0, N * hz); gr.addColorStop(0, pal.sky[0]); gr.addColorStop(1, pal.sky[1]); g.fillStyle = gr; g.fillRect(0, 0, N, N);
  if (pal.sun) { const [sx, sy, sr, col] = pal.sun; const h = g.createRadialGradient(sx * N, sy * N, 0, sx * N, sy * N, sr * N * 5); h.addColorStop(0, col + 'aa'); h.addColorStop(1, col + '00'); g.fillStyle = h; g.fillRect(0, 0, N, N); g.fillStyle = col; g.beginPath(); g.arc(sx * N, sy * N, sr * N, 0, TAU); g.fill(); }
  (pal.layers || []).forEach((col, k) => {
    const ph = [R() * 9, R() * 9, R() * 9]; const base = N * (hz - 0.17 + k * 0.08), amp = N * (0.16 - k * 0.025) * (opt.amp ?? 1);
    g.fillStyle = col; g.beginPath(); g.moveTo(0, N);
    for (let x = 0; x <= N; x += 6) { const u = x / N; g.lineTo(x, base - amp * (0.55 * Math.sin(u * 3.1 + ph[0]) + 0.3 * Math.sin(u * 7.3 + ph[1]) + 0.1 * (1 + k) * Math.sin(u * 23 + ph[2]))); }
    g.lineTo(N, N); g.closePath(); g.fill();
  });
  if (pal.water) { const wy = N * hz, wg = g.createLinearGradient(0, wy, 0, N); wg.addColorStop(0, pal.water[0]); wg.addColorStop(1, pal.water[1]); g.fillStyle = wg; g.fillRect(0, wy, N, N - wy);
    for (let i = 0; i < 240; i++) { const y = wy + Math.pow(R(), 1.6) * (N - wy), w = 20 + R() * 160 * (y - wy) / (N - wy); const sx = pal.sun ? pal.sun[0] * N : N / 2; g.fillStyle = `rgba(255,235,200,${0.08 + R() * 0.22})`; g.fillRect(sx + (R() - .5) * 260 - w / 2, y, w, 2 + R() * 2); } }
  const id = g.getImageData(0, 0, N, N), d = id.data, R3 = rng(seed * 7 + 1); for (let i = 0; i < d.length; i += 4) { const n = (R3() - 0.5) * 12; d[i] += n; d[i + 1] += n; d[i + 2] += n; } g.putImageData(id, 0, 0);
  return c;
}
// Video footage: re-encode all-intra (ffmpeg -g 1), load as a blob URL (python http.server
// can't range-seek), and await 'seeked' before drawing each frame.
async function loadVideo(url) { const b = await (await fetch(url)).blob(); const v = document.createElement('video'); v.muted = true; v.src = URL.createObjectURL(b); await new Promise(r => v.addEventListener('loadeddata', r, { once: true })); return v; }
async function seekVideo(v, t) { const tt = clamp(t, 0, v.duration - 0.001); if (Math.abs(v.currentTime - tt) < 1e-4) return; await new Promise(r => { v.addEventListener('seeked', r, { once: true }); v.currentTime = tt; }); }

/* ---------------- runtime ---------------- */
window.seek = async t => {
  t = ((t % DUR) + DUR) % DUR;                      // loops wrap, so trailing motion-blur subframes of frame 0 sample the end
  X.setTransform(1, 0, 0, 1, 0, 0); X.globalAlpha = 1; X.globalCompositeOperation = 'source-over'; X.filter = 'none'; X.textAlign = 'left'; X.textBaseline = 'alphabetic';
  X.fillStyle = CONFIG.bg ?? '#F2F0EC'; X.fillRect(0, 0, S, S);
  if (typeof prepare === 'function') await prepare(t);  // async per-frame work (video seeks) goes here, never in draw
  draw(t);
};
window.ready = (async () => {
  await new Promise(r => setTimeout(r, 0));          // let the scene script (loaded after the engine) define CONFIG
  S = CONFIG.size ?? 1440; C = S / 2; DUR = CONFIG.dur; BPM = CONFIG.bpm ?? 120; OFFSET = CONFIG.offset ?? 0;
  cv.width = cv.height = S; _glassInit();
  for (const f of (CONFIG.fonts || [])) await document.fonts.load(f);
  await document.fonts.ready; if (typeof setup === 'function') await setup(); return true;
})();
if (!location.search.includes('render')) window.ready.then(() => {
  const t0 = performance.now(); let busy = false;
  const loop = async () => { if (!busy) { busy = true; await window.seek((performance.now() - t0) / 1000); busy = false; } requestAnimationFrame(loop); }; loop();
});
