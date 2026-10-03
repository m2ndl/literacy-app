// tracing.js - Letter formation: stroke templates for a–z (print, "ball and stick"), scoring of a
// learner's strokes, and the watch -> trace -> write widget (model, lead, test).
//
// Coordinates: a 120 x 140 box. Guide lines: ascender y=10, x-height y=50, baseline y=100,
// descender y=135. Each letter is a list of strokes; each stroke is a list of points in drawing
// order, so the first point is where the pen starts.
import { el } from './dom.js';

export const BOX = { w: 120, h: 140, ascender: 10, xHeight: 50, baseline: 100, descender: 135 };

function line(x1, y1, x2, y2, step = 3) {
  const n = Math.max(1, Math.round(Math.hypot(x2 - x1, y2 - y1) / step));
  return Array.from({ length: n + 1 }, (_, i) => [x1 + ((x2 - x1) * i) / n, y1 + ((y2 - y1) * i) / n]);
}

/** Arc from angle a0 to a1 (degrees; 0 = right, 90 = down; increasing = clockwise on screen). */
function arc(cx, cy, r, a0, a1, step = 3) {
  const n = Math.max(2, Math.round((Math.abs(a1 - a0) * Math.PI * r) / 180 / step));
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    return [cx + r * Math.cos(t), cy + r * Math.sin(t)];
  });
}

/** Elliptical arc (same angle convention as arc). */
function ellipse(cx, cy, rx, ry, a0, a1, step = 3) {
  const n = Math.max(2, Math.round((Math.abs(a1 - a0) * Math.PI * Math.max(rx, ry)) / 180 / step));
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    return [cx + rx * Math.cos(t), cy + ry * Math.sin(t)];
  });
}

const join = (...parts) => parts.reduce((all, p) => [...all, ...(all.length ? p.slice(1) : p)], []);
const dot = (x, y) => [[x, y]];

// Bowl of a, d, g, q: start right of centre, round to the left (anticlockwise), close the circle.
const leftBowl = () => arc(60, 75, 25, -20, -380);

export const LETTERS = {
  a: [leftBowl(), line(85, 50, 85, 100)],
  b: [line(35, 10, 35, 100), arc(60, 75, 25, 180, 540)],
  c: [arc(60, 75, 25, -40, -320)],
  d: [leftBowl(), line(85, 10, 85, 100)],
  e: [join(line(35, 75, 85, 75), arc(60, 75, 25, 0, -315))],
  f: [join(arc(75, 25, 15, -30, -180), line(60, 25, 60, 100)), line(42, 50, 80, 50)],
  g: [leftBowl(), join(line(85, 50, 85, 120), arc(70, 120, 15, 0, 160))],
  h: [line(35, 10, 35, 100), join(arc(60, 75, 25, 180, 360), line(85, 75, 85, 100))],
  i: [line(60, 50, 60, 100), dot(60, 33)],
  j: [join(line(65, 50, 65, 120), arc(50, 120, 15, 0, 160)), dot(65, 33)],
  k: [line(40, 10, 40, 100), join(line(80, 50, 40, 80), line(40, 80, 82, 100))],
  l: [line(60, 10, 60, 100)],
  m: [line(30, 50, 30, 100), join(arc(47.5, 67, 17.5, 180, 360), line(65, 67, 65, 100)), join(arc(82.5, 67, 17.5, 180, 360), line(100, 67, 100, 100))],
  n: [line(40, 50, 40, 100), join(arc(60, 70, 20, 180, 360), line(80, 70, 80, 100))],
  o: [arc(60, 75, 25, -90, -450)],
  p: [line(40, 50, 40, 135), arc(65, 75, 25, 180, 540)],
  q: [leftBowl(), line(85, 50, 85, 135)],
  r: [line(40, 50, 40, 100), arc(60, 70, 20, 180, 315)],
  s: [join(ellipse(60, 62.5, 18, 12.5, -20, -270), ellipse(60, 87.5, 18, 12.5, -90, 160))],
  t: [line(60, 20, 60, 100), line(42, 50, 78, 50)],
  u: [join(line(40, 50, 40, 80), arc(60, 80, 20, 180, 0), line(80, 80, 80, 50)), line(80, 50, 80, 100)],
  v: [join(line(35, 50, 60, 100), line(60, 100, 85, 50))],
  w: [join(line(25, 50, 42, 100), line(42, 100, 60, 60), line(60, 60, 78, 100), line(78, 100, 95, 50))],
  x: [line(38, 50, 82, 100), line(82, 50, 38, 100)],
  y: [line(38, 50, 60, 100), line(82, 50, 45, 135)],
  z: [join(line(38, 50, 82, 50), line(82, 50, 38, 100), line(38, 100, 82, 100))]
};

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------
function resample(stroke, step = 3) {
  if (stroke.length < 2) return stroke.slice();
  const out = [stroke[0]];
  let [px, py] = stroke[0];
  let carry = 0;
  for (let i = 1; i < stroke.length; i++) {
    const [x, y] = stroke[i];
    let seg = Math.hypot(x - px, y - py);
    while (carry + seg >= step) {
      const t = (step - carry) / seg;
      px += (x - px) * t;
      py += (y - py) * t;
      out.push([px, py]);
      seg = Math.hypot(x - px, y - py);
      carry = 0;
    }
    carry += seg;
    px = x;
    py = y;
  }
  return out;
}

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const nearAny = (p, set, tol) => set.some(q => dist(p, q) <= tol);

export const TRACE_PASS = { coverage: 0.75, precision: 0.75 };

/**
 * Compare a learner's strokes with a letter template.
 * coverage: share of the template the learner went over; precision: share of the learner's ink that is on
 * the letter; start: the first stroke starts where the letter starts (top-down, the right side).
 */
export function scoreTrace(letter, strokes, { tol = 14, startTol = 24 } = {}) {
  const tmpl = LETTERS[letter];
  const user = (strokes || []).filter(s => s.length);
  if (!tmpl || !user.length) return { ok: false, coverage: 0, precision: 0, start: false };
  const T = tmpl.flatMap(s => resample(s));
  const U = user.flatMap(s => resample(s));
  const coverage = T.filter(p => nearAny(p, U, tol)).length / T.length;
  const precision = U.filter(p => nearAny(p, T, tol)).length / U.length;
  const start = dist(user[0][0], tmpl[0][0]) <= startTol;
  const strokesOk = user.length <= tmpl.length + 1;
  return {
    ok: coverage >= TRACE_PASS.coverage && precision >= TRACE_PASS.precision && start && strokesOk,
    coverage: Math.round(coverage * 100) / 100,
    precision: Math.round(precision * 100) / 100,
    start,
    strokes: user.length
  };
}

// ---------------------------------------------------------------------------
// Widget: watch -> trace over a dotted model -> write on empty guide lines
// ---------------------------------------------------------------------------
const STEPS = {
  watch: 'شاهد كيف يُكتب الحرف.',
  trace: 'تتبّع الحرف بإصبعك فوق الخط المنقّط. ابدأ من النقطة الخضراء.',
  write: 'الآن اكتب الحرف وحدك بين الخطوط.'
};

const css = (name, fallback) => {
  try { return getComputedStyle(document.body).getPropertyValue(name).trim() || fallback; } catch (e) { return fallback; }
};

/**
 * onSubmit(value): value is the letter when the free writing matches, '#' when it doesn't.
 * The app calls retry() after a first mistake (back to tracing) and showModel() after a second.
 */
export function traceWidget(q, { onSubmit, isLocked, playName }) {
  const letter = q.answer;
  const tmpl = LETTERS[letter];
  const canvas = el('canvas', { class: 'trace-canvas', 'aria-label': `مساحة كتابة الحرف ${letter}` });
  const stepText = el('p', { class: 'trace-step', 'aria-live': 'polite' });
  const note = el('p', { class: 'trace-note', 'aria-live': 'polite' });
  let step = 'watch';
  let strokes = [];
  let drawing = null;
  let animToken = 0;
  let showModelOverlay = false;
  let evalTimer = null;

  const ctx = canvas.getContext('2d');
  const size = () => {
    const w = Math.min(300, (canvas.parentElement?.clientWidth || 300));
    const ratio = window.devicePixelRatio || 1;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${(w * BOX.h) / BOX.w}px`;
    canvas.width = Math.round(w * ratio);
    canvas.height = Math.round(((w * BOX.h) / BOX.w) * ratio);
    return canvas.width / BOX.w;
  };
  let scale = 2;

  const pathOf = (pts) => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * scale, y * scale) : ctx.moveTo(x * scale, y * scale)));
  };

  function drawGuides() {
    const g = css('--c-border', '#cbd5e1');
    ctx.save();
    ctx.lineWidth = Math.max(1, scale * 0.6);
    [[BOX.ascender, [4, 4]], [BOX.xHeight, [6, 4]], [BOX.baseline, []], [BOX.descender, [4, 4]]].forEach(([y, dash]) => {
      ctx.strokeStyle = y === BOX.baseline ? css('--c-muted', '#64748b') : g;
      ctx.setLineDash(dash.map(d => d * scale * 0.5));
      ctx.beginPath();
      ctx.moveTo(4 * scale, y * scale);
      ctx.lineTo((BOX.w - 4) * scale, y * scale);
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawModel({ dotted = false, upTo = Infinity, color = null } = {}) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = scale * (dotted ? 5 : 6);
    ctx.strokeStyle = color || (dotted ? css('--c-guide', '#cbd5e1') : css('--c-accent', '#2563eb'));
    if (dotted) ctx.setLineDash([scale * 2, scale * 4]);
    let left = upTo;
    tmpl.forEach(s => {
      if (left <= 0) return;
      const pts = s.slice(0, Math.max(1, Math.min(s.length, left)));
      left -= s.length;
      if (pts.length === 1) {
        ctx.beginPath();
        ctx.arc(pts[0][0] * scale, pts[0][1] * scale, scale * 3, 0, Math.PI * 2);
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fill();
      } else {
        pathOf(pts);
        ctx.stroke();
      }
    });
    ctx.restore();
  }

  function drawStarts() {
    ctx.save();
    tmpl.forEach((s, i) => {
      const [x, y] = s[0];
      ctx.beginPath();
      ctx.arc(x * scale, y * scale, scale * 4, 0, Math.PI * 2);
      ctx.fillStyle = '#16a34a';
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.round(scale * 5)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), x * scale, y * scale + scale * 0.3);
    });
    ctx.restore();
  }

  function drawInk() {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = scale * 4;
    ctx.strokeStyle = css('--c-text', '#0f172a');
    strokes.forEach(s => {
      if (s.length === 1) {
        ctx.beginPath();
        ctx.arc(s[0][0] * scale, s[0][1] * scale, scale * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fill();
      } else {
        pathOf(s);
        ctx.stroke();
      }
    });
    ctx.restore();
  }

  function redraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGuides();
    if (step === 'trace') { drawModel({ dotted: true }); drawStarts(); }
    drawInk();
    if (showModelOverlay) drawModel({ color: 'rgba(22, 163, 74, .55)' });
  }

  function setStep(s, message = '') {
    step = s;
    strokes = [];
    stepText.textContent = STEPS[s];
    note.textContent = message;
    redraw();
  }

  function watch() {
    const token = ++animToken;
    setStep('watch');
    playName?.();
    const total = tmpl.reduce((n, s) => n + s.length, 0);
    let shown = 0;
    const tick = () => {
      if (token !== animToken) return;
      shown += Math.max(1, Math.round(total / 60));
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawGuides();
      drawModel({ upTo: shown });
      if (shown < total) requestAnimationFrame(tick);
      else setTimeout(() => { if (token === animToken && step === 'watch') setStep('trace'); }, 600);
    };
    requestAnimationFrame(tick);
  }

  function evaluate() {
    clearTimeout(evalTimer);
    if (isLocked() || !strokes.length || step === 'watch') return;
    const result = scoreTrace(letter, strokes, step === 'write' ? { tol: 18, startTol: 28 } : {});
    if (step === 'trace') {
      if (result.ok) setStep('write', 'ممتاز!');
      else setStep('trace', result.start ? 'حاول مرة أخرى، وابقَ على الخط المنقّط.' : 'حاول مرة أخرى: ابدأ من النقطة الخضراء رقم ١.');
      return;
    }
    onSubmit(result.ok ? letter : '#', canvas);
  }

  const point = (e) => {
    const r = canvas.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * BOX.w, ((e.clientY - r.top) / r.height) * BOX.h];
  };
  canvas.addEventListener('pointerdown', (e) => {
    if (isLocked() || step === 'watch') return;
    e.preventDefault();
    clearTimeout(evalTimer);
    canvas.setPointerCapture?.(e.pointerId);
    drawing = [point(e)];
    strokes.push(drawing);
    redraw();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    e.preventDefault();
    drawing.push(point(e));
    redraw();
  });
  const end = () => {
    if (!drawing) return;
    drawing = null;
    // Evaluate after the last expected stroke, or after a pause.
    evalTimer = setTimeout(evaluate, strokes.length >= tmpl.length ? 350 : 1600);
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  const replay = el('button', { class: 'small-btn', onclick: () => { if (!isLocked()) watch(); } }, '▶ شاهد مرة أخرى');
  const clear = el('button', { class: 'small-btn', onclick: () => { if (!isLocked() && step !== 'watch') setStep(step); } }, 'امسح');
  const check = el('button', { class: 'small-btn', onclick: evaluate }, 'تحقّق ✓');
  const node = el('div', { class: 'trace' }, stepText, canvas, note, el('div', { class: 'trace-tools' }, replay, clear, check));

  requestAnimationFrame(() => { scale = size(); watch(); });
  window.addEventListener('resize', () => { if (canvas.isConnected) { scale = size(); redraw(); } });

  return {
    node,
    retry: () => setStep('trace', 'تتبّع الحرف مرة أخرى، ثم اكتبه وحدك.'),
    showModel: () => { showModelOverlay = true; redraw(); },
    reset: () => setStep(step === 'watch' ? 'trace' : step)
  };
}
