// widgets.js - Answer widgets for activities: tiles, on-screen keyboard, audio choices.
// Each widget calls onSubmit(value) once the learner has answered, and checks isLocked()
// so nothing can be changed while feedback is showing.
import { el, en, toArabicDigits } from './dom.js';
import { isVowel } from './phonics.js';

const QWERTY = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
let keyHandler = null;

/** Remove the physical-keyboard listener of the previous question. */
export function cleanupWidgets() {
  if (keyHandler) document.removeEventListener('keydown', keyHandler);
  keyHandler = null;
}

/**
 * Tap tiles into slots in order: graphemes (word-build) or words (sentence-build).
 * Returns { node, reset(), fill() }.
 */
export function buildWidget(q, { onSubmit, isLocked, words = false }) {
  const slots = el('div', { class: `build-slots english-content ${words ? 'build-words' : ''}`.trim(), dir: 'ltr' });
  const tiles = el('div', { class: `build-tiles english-content ${words ? 'build-words' : ''}`.trim(), dir: 'ltr' });
  const placed = [];
  const refresh = () => {
    slots.replaceChildren(...q.answerTiles.map((_, i) => {
      const t = placed[i];
      return el('button', {
        class: `slot ${t ? 'filled' : ''}`, 'aria-label': t ? `إزالة ${t.label}` : 'خانة فارغة',
        onclick: () => { if (t && !isLocked()) { placed.splice(i, 1); refresh(); } }
      }, t ? t.label : '');
    }));
    tiles.replaceChildren(...q.tiles.map(t => el('button', {
      class: 'tile', disabled: placed.includes(t), onclick: () => {
        if (isLocked() || placed.length >= q.answerTiles.length) return;
        placed.push(t);
        refresh();
        if (placed.length === q.answerTiles.length) onSubmit(placed.map(x => x.label), slots);
      }
    }, t.label)));
  };
  refresh();
  return {
    node: el('div', { class: 'build' }, slots, tiles),
    reset: () => { placed.length = 0; refresh(); },
    fill: () => {
      placed.length = 0;
      q.answerTiles.forEach(label => placed.push(q.tiles.find(t => t.label === label && !placed.includes(t))));
      refresh();
    }
  };
}

/**
 * Dictation: an on-screen QWERTY keyboard (letters not taught yet are disabled), so learners don't
 * need to switch their phone to an English keyboard and autocorrect can't change the answer.
 * A physical keyboard works too. Returns { node, reset(), show(text) }.
 */
export function keyboardWidget(q, { onSubmit, isLocked }) {
  let typed = '';
  const max = q.answer.length + 3;
  const allowed = new Set(q.keys);
  const display = el('div', { class: 'typed english-content', dir: 'ltr', 'aria-live': 'polite', 'aria-label': 'ما كتبته' });
  const render = () => {
    display.replaceChildren(...[...typed].map(ch => el('span', { class: isVowel(ch) ? 'vowel' : null, text: ch })),
      el('span', { class: 'caret', 'aria-hidden': 'true' }));
  };
  const type = (ch) => {
    if (isLocked() || typed.length >= max || !allowed.has(ch)) return;
    typed += ch;
    render();
  };
  const back = () => { if (!isLocked()) { typed = typed.slice(0, -1); render(); } };
  const submit = () => { if (!isLocked() && typed) onSubmit(typed, display); };
  const rows = QWERTY.map(row => el('div', { class: 'kb-row' }, ...[...row].map(ch => el('button', {
    class: 'kb-key', disabled: !allowed.has(ch), 'aria-label': ch, onclick: () => type(ch)
  }, ch))));
  rows.push(el('div', { class: 'kb-row' },
    el('button', { class: 'kb-key kb-wide', 'aria-label': 'حذف', onclick: back }, '⌫'),
    el('button', { class: 'kb-key kb-enter', onclick: submit }, 'تحقّق ✓')));
  cleanupWidgets();
  keyHandler = (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Backspace') { e.preventDefault(); back(); } else if (e.key === 'Enter') { e.preventDefault(); submit(); } else if (/^[a-zA-Z]$/.test(e.key)) type(e.key.toLowerCase());
  };
  document.addEventListener('keydown', keyHandler);
  render();
  return {
    node: el('div', { class: 'spell' }, display, el('div', { class: 'keyboard english-content', dir: 'ltr' }, ...rows)),
    reset: () => { typed = ''; render(); },
    show: (text) => { typed = text; render(); }
  };
}

/** Spelling feedback: the target word, grapheme by grapheme, coloured by what the learner typed. */
export function spellingDiff(result) {
  return el('div', { class: 'spell-diff english-content', dir: 'ltr' }, ...result.ops.map(o => {
    if (o.op === 'ok') return el('span', { class: 'sd-ok', text: o.target });
    if (o.op === 'sub') return el('span', { class: 'sd-wrong', title: o.typed }, el('s', { text: o.typed }), el('b', { text: o.target }));
    if (o.op === 'miss') return el('span', { class: 'sd-miss', text: o.target });
    return el('span', { class: 'sd-extra' }, el('s', { text: o.typed }));
  }));
}

/**
 * Three spoken options for a written made-up word: tapping plays and selects; "confirm" answers.
 * Returns { node }.
 */
export function audioChoiceWidget(q, { play, onSubmit, isLocked }) {
  let selected = null;
  const confirm = el('button', { class: 'next-btn', disabled: true, onclick: () => { if (selected && !isLocked()) onSubmit(selected.value, null); } }, 'تأكيد');
  const buttons = q.options.map((o, i) => {
    const b = el('button', { class: 'option-btn audio-option', 'aria-pressed': 'false', 'data-value': o.value }, `${toArabicDigits(i + 1)} 🔊`);
    b.addEventListener('click', () => {
      if (isLocked()) return;
      play(o.audio);
      selected = o;
      buttons.forEach(x => { x.classList.toggle('is-selected', x === b); x.setAttribute('aria-pressed', String(x === b)); });
      confirm.disabled = false;
    });
    return b;
  });
  return { node: el('div', { class: 'audio-choice' }, el('div', { class: 'options options-audio' }, ...buttons), confirm) };
}

/**
 * Blending: the word's letters as separate tiles; tapping a tile plays its sound. Once every sound has been
 * heard (or all of them played together, back to back with no gap, as close as recorded sounds get to
 * connected phonation: Gonzalez-Frey & Ehri 2021), three spoken words appear: which one do the sounds make?
 * Returns { node }.
 */
export function blendWidget(q, { play, playTogether, onSubmit, isLocked }) {
  const heard = new Set();
  const choice = audioChoiceWidget(q, { play, onSubmit, isLocked });
  const ask = el('p', { class: 'section-help hidden', text: 'أيّ كلمة تكوّنها هذه الأصوات؟' });
  choice.node.classList.add('hidden');
  const reveal = () => { ask.classList.remove('hidden'); choice.node.classList.remove('hidden'); };
  const tiles = q.prompt.tiles.map((t, i) => {
    const tile = el('button', { class: `blend-tile ${t.vowel ? 'vowel' : ''}`.trim(), 'aria-label': `صوت ${t.text}` }, t.text);
    tile.addEventListener('click', () => {
      if (isLocked()) return;
      play(t.audio);
      heard.add(i);
      tile.classList.add('is-heard');
      if (heard.size === q.prompt.tiles.length) reveal();
    });
    return tile;
  });
  const together = el('button', { class: 'small-btn' }, '▶ الأصوات متّصلة');
  together.addEventListener('click', async () => {
    if (isLocked()) return;
    tiles.forEach(t => t.classList.add('is-heard'));
    await playTogether(q.prompt.tiles.map(t => t.audio));
    reveal();
  });
  return {
    node: el('div', { class: 'blend' }, el('div', { class: 'blend-tiles english-content', dir: 'ltr' }, ...tiles), together, ask, choice.node)
  };
}

/** A product card for a made-up "brand name". */
export function brandCard(word) {
  return el('div', { class: 'brand-card' }, el('span', { class: 'brand-label', text: 'اسم منتج جديد' }), en(word, 'brand-name'));
}
