// drill.js - Timed reading drills: read as many items as you can before the time runs out.
// One tap per item, a short tick or cross, no hints and no second tries: the score is
// (right - wrong) per minute (assess.js). Time only runs while the app is on screen.
import { el, en, wordNode, toArabicDigits } from './dom.js';

/**
 * Run a drill inside `root`.
 * items: questions with { item, type: 'choice'|'yesno', prompt, options, answer } (questions.js)
 * opts: { seconds, title, intro (Arabic), cue(type), onDone({ n, x, s, answers: [{ q, value, ok, ms }] }) }
 * Returns { cancel() }.
 */
export function runDrill(root, items, { seconds, title, intro, cue = () => {}, onDone }) {
  let index = 0;
  let n = 0;
  let x = 0;
  let elapsed = 0;          // ms on screen
  let resumedAt = null;
  let shownAt = 0;
  let timer = null;
  let done = false;
  const answers = [];
  const clock = el('span', { class: 'drill-clock', 'aria-live': 'off' });
  const bar = el('div', { class: 'drill-bar' }, el('span'));
  const count = el('span', { class: 'drill-count' });
  const stage = el('div', { class: 'drill-stage' });

  const now = () => performance.now();
  const spent = () => elapsed + (resumedAt === null ? 0 : now() - resumedAt);
  const pause = () => { if (resumedAt !== null) { elapsed += now() - resumedAt; resumedAt = null; } };
  const resume = () => { if (resumedAt === null && !done) resumedAt = now(); };
  const onVisibility = () => (document.hidden ? pause() : resume());

  function tick() {
    const left = Math.max(0, seconds * 1000 - spent());
    clock.textContent = `${toArabicDigits(Math.ceil(left / 1000))} ث`;
    bar.firstChild.style.width = `${(left / (seconds * 1000)) * 100}%`;
    if (left <= 0) finish();
  }

  function finish() {
    if (done) return;
    pause();
    done = true;
    clearInterval(timer);
    document.removeEventListener('visibilitychange', onVisibility);
    onDone({ n, x, s: Math.min(seconds, spent() / 1000), answers });
  }

  function show() {
    if (done) return;
    if (index >= items.length) { finish(); return; }
    const q = items[index];
    count.textContent = `✓ ${toArabicDigits(n)}   ✗ ${toArabicDigits(x)}`;
    const prompt = q.type === 'yesno'
      ? en(q.prompt.statement, 'drill-sentence')
      : wordNode(q.prompt.text, { cls: 'drill-word', split: q.prompt.split });
    const buttons = el('div', { class: `drill-options ${q.type === 'yesno' ? 'is-yesno' : ''}` }, ...q.options.map(o => el('button', {
      class: 'option-btn option-ar drill-option', 'data-value': String(o.value),
      onclick: (e) => answer(q, o.value, e.currentTarget)
    }, o.label)));
    stage.replaceChildren(prompt, buttons);
    shownAt = now();
  }

  function answer(q, value, node) {
    if (done || node.disabled) return;
    const ok = value === q.answer;
    answers.push({ q, value, ok, ms: Math.round(now() - shownAt) });
    if (ok) n++; else x++;
    cue(ok ? 'ok' : 'soft');
    node.classList.add(ok ? 'is-right' : 'is-wrong');
    stage.querySelectorAll('button').forEach(b => { b.disabled = true; });
    index++;
    setTimeout(show, ok ? 150 : 350);
  }

  const startBtn = el('button', { class: 'today-btn drill-start' }, '▶ ابدأ');
  root.replaceChildren(el('div', { class: 'drill' },
    el('h3', { class: 'text-xl font-bold', text: title }),
    el('p', { class: 'section-help' }, intro),
    el('p', { class: 'section-help', text: `لديك ${toArabicDigits(seconds)} ثانية. أجب بسرعة ودقّة: الإجابة الخطأ تُنقص من نتيجتك.` }),
    startBtn));
  startBtn.addEventListener('click', () => {
    root.replaceChildren(el('div', { class: 'drill is-running' }, el('div', { class: 'drill-head' }, clock, count), bar, stage));
    document.addEventListener('visibilitychange', onVisibility);
    resume();
    timer = setInterval(tick, 200);
    tick();
    show();
  });

  return {
    cancel: () => {
      done = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    }
  };
}

/** A small line chart of recent values (inline SVG), newest on the right. */
export function sparkline(values, { width = 160, height = 40, label = '' } = {}) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('class', 'sparkline');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', label);
  if (values.length) {
    const max = Math.max(...values, 1);
    const pts = values.map((v, i) => [values.length === 1 ? width / 2 : (i / (values.length - 1)) * (width - 8) + 4, height - 4 - (v / max) * (height - 8)]);
    const line = document.createElementNS(ns, 'polyline');
    line.setAttribute('points', pts.map(p => p.map(c => c.toFixed(1)).join(',')).join(' '));
    line.setAttribute('fill', 'none');
    line.setAttribute('stroke', 'currentColor');
    line.setAttribute('stroke-width', '2');
    svg.append(line);
    pts.forEach(([cx, cy]) => {
      const c = document.createElementNS(ns, 'circle');
      c.setAttribute('cx', cx);
      c.setAttribute('cy', cy);
      c.setAttribute('r', '2.5');
      c.setAttribute('fill', 'currentColor');
      svg.append(c);
    });
  }
  return svg;
}
