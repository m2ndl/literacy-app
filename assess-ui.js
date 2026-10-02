// assess-ui.js - Screens for timed reading practice, stage benchmarks and can-do self-assessment.
//
// ctx (from app.js): { getProgress(), save(now), today(), bank, stages, canDo, activityRoot(title, heading, back),
//   showMessage(node, buttons), renderDashboard(), renderReport(), runQuestions(questions, opts), cue(type),
//   maxUnit(), track(drill) }
import { el, en, wordNode, toArabicDigits } from './dom.js';
import { runDrill, sparkline } from './drill.js';
import {
  DRILL_SECONDS, netPerMinute, recordFluency, fluencyTrend, recordBenchmark, lastBenchmark, benchmarkProfile,
  benchmarkStatus, stageFinished, BENCHMARK_CRITERIA
} from './assess.js';

const fmt = (v) => toArabicDigits(String(Math.round(v * 10) / 10)).replace('.', '٫');

const DRILLS = {
  words: {
    title: 'كلمات سريعة', icon: '⚡', per: 'كلمة في الدقيقة', min: 12,
    intro: 'اقرأ الكلمة الإنجليزية واختر معناها من خيارين.'
  },
  sentences: {
    title: 'جملة صحيحة أم خطأ؟', icon: '✅', per: 'جملة في الدقيقة', min: 10,
    intro: 'اقرأ الجملة بعينيك (دون صوت)، واختر «نعم» إذا كانت صحيحة و«لا» إذا كانت خطأ.'
  }
};

export const PART_LABELS = {
  words: 'قراءة الكلمات بسرعة',
  sentences: 'قراءة الجمل بسرعة',
  decoding: 'قراءة كلمات جديدة (مصنوعة)',
  spelling: 'الإملاء',
  reading: 'فهم نص جديد'
};

const PART_ADVICE = {
  words: 'تدرّب على «كلمات سريعة» دقيقة كل يوم.',
  sentences: 'تدرّب على «جملة صحيحة أم خطأ؟»، واقرأ نصوص الوحدات مرة أخرى.',
  decoding: 'راجع وحدات المرحلة، وانتبه لكل حرف في الكلمة: حروف العلة خاصة.',
  spelling: 'أعد نشاط «إملاء» في وحدات المرحلة.',
  reading: 'اقرأ نصوص الوحدات بنفسك، ثم استمع وتابع، ثم أعد القراءة.'
};

const RATINGS = [[2, 'نعم، بسهولة'], [1, 'نعم، بمساعدة'], [0, 'ليس بعد']];

function drillPool(ctx, kind) {
  const max = ctx.maxUnit();
  if (!max) return [];
  return kind === 'words' ? ctx.bank.wordFlash(max) : ctx.bank.sentenceSense(max);
}

export const drillReady = (ctx, kind) => drillPool(ctx, kind).length >= DRILLS[kind].min;

const bestOf = (list) => (list.length ? Math.max(...list.map(netPerMinute)) : null);

// ---------------------------------------------------------------------------
// Speed practice
// ---------------------------------------------------------------------------
export function renderSpeedMenu(ctx) {
  const p = ctx.getProgress();
  const root = ctx.activityRoot('تدريب السرعة', 'تدريب السرعة', ctx.renderDashboard);
  const cards = Object.entries(DRILLS).map(([kind, d]) => {
    const ready = drillReady(ctx, kind);
    const best = bestOf(p.fluency[kind]);
    return el('div', { class: `today-card ${ready ? '' : 'is-muted'}`, 'data-drill': kind },
      el('div', { class: 'today-head' }, el('span', { class: 'today-icon', 'aria-hidden': 'true', text: d.icon }), el('h3', { class: 'today-title', text: d.title })),
      el('p', { class: 'today-text', text: `${d.intro} (${toArabicDigits(DRILL_SECONDS[kind])} ثانية)` }),
      ready ? el('p', { class: 'today-text', text: best === null ? 'لم تتدرّب بعد.' : `أفضل نتيجة: ${fmt(best)} ${d.per}` }) : el('p', { class: 'today-text', text: 'يبدأ بعد إكمال بعض الوحدات.' }),
      ready && p.fluency[kind].length > 1 ? sparkline(fluencyTrend(p, kind), { label: 'آخر النتائج' }) : null,
      ready ? el('button', { class: 'today-btn', onclick: () => startDrill(ctx, kind) }, 'ابدأ') : null);
  });
  root.replaceChildren(
    el('p', { class: 'section-help', text: 'القارئ الجيد يقرأ بدقّة وبسرعة دون أن يتوقف عند كل كلمة. تدرّب دقيقة أو دقيقتين كل يوم، وحاول أن تتجاوز أفضل نتيجة لك.' }),
    el('div', { class: 'today-grid' }, ...cards));
}

export function startDrill(ctx, kind) {
  const d = DRILLS[kind];
  const root = ctx.activityRoot('تدريب السرعة', d.title, () => renderSpeedMenu(ctx));
  ctx.track(runDrill(root, drillPool(ctx, kind), {
    seconds: DRILL_SECONDS[kind], title: d.title, intro: d.intro, cue: ctx.cue,
    onDone: (r) => {
      const res = recordFluency(ctx.getProgress(), kind, { day: ctx.today(), n: r.n, x: r.x, s: r.s });
      ctx.save(true);
      drillResult(ctx, kind, r, res, root);
    }
  }));
}

function mistakeLine(q, value) {
  if (q.type === 'yesno') {
    return el('li', {}, en(q.prompt.statement), ` — ${q.answer ? 'صحيحة' : 'خطأ'} (${q.feedback.ar})`);
  }
  const right = q.options.find(o => o.value === q.answer);
  const chosen = q.options.find(o => o.value === value);
  return el('li', {}, wordNode(q.item), ` = ${right.label}`, chosen ? el('span', { class: 'text-gray-500', text: ` (اخترت: ${chosen.label})` }) : null);
}

function drillResult(ctx, kind, r, res, root) {
  const d = DRILLS[kind];
  const mistakes = r.answers.filter(a => !a.ok);
  const p = ctx.getProgress();
  root.replaceChildren(el('div', { class: 'drill-result' },
    el('p', { class: 'drill-score' }, el('span', { class: 'drill-score-num', text: fmt(res.rate) }), ` ${d.per}`),
    el('p', { text: `صحيح: ${toArabicDigits(r.n)} — خطأ: ${toArabicDigits(r.x)} — الوقت: ${toArabicDigits(Math.round(r.s))} ث` }),
    res.best === null ? el('p', { text: 'هذه أول نتيجة لك. تدرّب مرة أخرى غدًا لترى تقدّمك.' })
      : res.isBest ? el('p', { class: 'text-green-700 font-bold', text: `رقم قياسي جديد! 🎉 (السابق: ${fmt(res.best)})` })
        : el('p', { text: `أفضل نتيجة لك: ${fmt(res.best)}` }),
    r.x > r.n / 2 ? el('p', { class: 'hint', text: 'تمهّل قليلًا: الإجابة الخطأ تُنقص من النتيجة، والدقة أهم من السرعة.' }) : null,
    p.fluency[kind].length > 1 ? sparkline(fluencyTrend(p, kind), { label: 'آخر النتائج' }) : null,
    mistakes.length ? el('div', { class: 'mt-3' }, el('h4', { class: 'font-bold', text: 'راجع أخطاءك' }),
      el('ul', { class: 'drill-mistakes' }, ...mistakes.map(a => mistakeLine(a.q, a.value)))) : null,
    el('div', { class: 'flex flex-wrap gap-2 mt-4' },
      el('button', { class: 'today-btn', onclick: () => startDrill(ctx, kind) }, 'مرة أخرى'),
      el('button', { class: 'small-btn', onclick: () => renderSpeedMenu(ctx) }, 'رجوع'))));
}

// ---------------------------------------------------------------------------
// Can-do self-assessment
// ---------------------------------------------------------------------------
/** Rate each can-do statement of a stage. onDone(ratings) */
export function renderSelfAssessment(ctx, stageIndex, onDone, { heading = 'ماذا تستطيع أن تفعل الآن؟', back = null } = {}) {
  const set = ctx.canDo.find(s => s.stage === stageIndex);
  const root = ctx.activityRoot(ctx.stages[stageIndex].title, heading, back || ctx.renderReport);
  const ratings = {};
  const save = el('button', { class: 'today-btn', disabled: true, onclick: () => onDone({ ...ratings }) }, 'حفظ');
  const rows = set.items.map(item => {
    const buttons = RATINGS.map(([v, label]) => el('button', {
      class: 'small-btn can-btn', 'aria-pressed': 'false', 'data-value': String(v),
      onclick: (e) => {
        ratings[item.id] = v;
        buttons.forEach(b => b.setAttribute('aria-pressed', String(b === e.currentTarget)));
        save.disabled = Object.keys(ratings).length < set.items.length;
      }
    }, label));
    return el('div', { class: 'can-row', 'data-can': item.id }, el('p', { class: 'can-text' }, ...richText(item.ar)), el('div', { class: 'can-buttons' }, ...buttons));
  });
  root.replaceChildren(
    el('p', { class: 'section-help', text: 'قيّم نفسك بصدق: هذا ليس اختبارًا، بل يساعدك على معرفة ما تحتاج إلى التدرّب عليه.' }),
    ...rows, save);
}

function richText(text) {
  return String(text).split(/([A-Za-z][A-Za-z ,'.-]*[A-Za-z.])/).filter(Boolean).map(part => (/^[A-Za-z]/.test(part) ? en(part) : part));
}

export function startSelfAssessment(ctx, stageIndex) {
  renderSelfAssessment(ctx, stageIndex, (r) => {
    const p = ctx.getProgress();
    p.selfAssess[stageIndex] = { day: ctx.today(), r };
    ctx.save(true);
    ctx.renderReport();
  });
}

// ---------------------------------------------------------------------------
// Stage benchmark
// ---------------------------------------------------------------------------
const partOf = (k, n) => `الجزء ${toArabicDigits(k)} من ${toArabicDigits(n)}`;

export function introduceBenchmark(ctx, stageIndex) {
  const st = ctx.stages[stageIndex];
  const p = ctx.getProgress();
  const pre = !stageFinished(p, st);
  ctx.showMessage(el('div', { class: 'text-right' },
    el('p', { class: 'text-2xl font-bold mb-2', text: 'اختبار المرحلة' }),
    el('p', { class: 'text-base font-bold', text: st.title }),
    el('p', { class: 'text-base mt-2', text: 'خمسة أجزاء قصيرة (حوالي ١٠ دقائق): قراءة كلمات وجمل بسرعة، وقراءة كلمات مصنوعة، وإملاء، وفهم نص جديد. ثم تقيّم نفسك.' }),
    el('p', { class: 'text-base mt-2', text: 'لن ترى التصحيح أثناء الاختبار. النتيجة تظهر في النهاية وتُحفظ في تقرير التقدّم.' }),
    pre ? el('p', { class: 'hint mt-2', text: 'لم تُكمل وحدات هذه المرحلة بعد: ستكون هذه النتيجة «قبل التعلّم»، لتقارنها بنتيجتك بعد إكمال المرحلة.' }) : null),
  [{ label: 'ابدأ', onClick: () => startBenchmark(ctx, stageIndex) }, { label: 'ليس الآن', onClick: () => {}, secondary: true }]);
}

export function startBenchmark(ctx, stageIndex) {
  const b = ctx.bank.benchmark(stageIndex);
  const st = ctx.stages[stageIndex];
  const parts = {};
  const items = [];
  const TOTAL = 5;
  const back = () => ctx.showMessage(el('p', { text: 'إذا خرجت الآن فلن تُحفظ نتيجة الاختبار.' }), [
    { label: 'خروج', onClick: ctx.renderDashboard, danger: true }, { label: 'تابع الاختبار', onClick: () => {}, secondary: true }]);

  const timed = (k, kind, next) => {
    const d = DRILLS[kind];
    const root = ctx.activityRoot('اختبار المرحلة', `${partOf(k, TOTAL)}: ${PART_LABELS[kind]}`, back);
    ctx.track(runDrill(root, b[kind], {
      seconds: DRILL_SECONDS[kind], title: d.title, intro: d.intro, cue: () => {},
      onDone: (r) => {
        parts[kind] = { n: r.n, x: r.x, s: Math.round(r.s * 10) / 10 };
        r.answers.forEach(a => items.push([kind, a.q.item, a.ok ? 1 : 0, a.ms]));
        next();
      }
    }));
  };
  const asked = (k, part, questions, intro, next) => {
    if (!questions.length) { next(); return; }
    ctx.showMessage(el('div', { class: 'text-right' },
      el('p', { class: 'text-xl font-bold mb-2', text: `${partOf(k, TOTAL)}: ${PART_LABELS[part]}` }),
      el('p', { class: 'text-base', text: intro })),
    [{ label: 'ابدأ', onClick: () => ctx.runQuestions(questions, {
      title: 'اختبار المرحلة', heading: `${partOf(k, TOTAL)}: ${PART_LABELS[part]}`, back,
      onDone: (s) => {
        parts[part] = { r: s.results.filter(x => x.ok).length, t: s.results.length };
        s.results.forEach(x => items.push([part, x.q.item, x.ok ? 1 : 0, x.rt ?? null]));
        next();
      }
    }) }]);
  };
  const finish = (can) => {
    const p = ctx.getProgress();
    const before = lastBenchmark(p, stageIndex);
    const entry = { stage: stageIndex, day: ctx.today(), done: stageFinished(p, st), parts, items, can };
    const profile = recordBenchmark(p, entry);
    ctx.save(true);
    benchmarkResult(ctx, stageIndex, profile, before);
  };

  timed(1, 'words', () => timed(2, 'sentences', () =>
    asked(3, 'decoding', b.decoding, 'هذه أسماء منتجات جديدة لم ترها من قبل. لكل اسم ثلاث قراءات مسموعة: اختر القراءة الصحيحة.', () =>
      asked(4, 'spelling', b.spelling, 'استمع إلى الكلمة واكتبها بلوحة المفاتيح.', () =>
        asked(5, 'reading', b.reading, 'اقرأ نصًا جديدًا بنفسك (لا يوجد صوت في هذا الجزء)، ثم أجب عن الأسئلة.', () =>
          renderSelfAssessment(ctx, stageIndex, finish, { heading: 'أخيرًا: قيّم نفسك', back }))))));
}

function partValue(row) {
  return row.unit === 'rate' ? `${fmt(row.value)} في الدقيقة` : `${toArabicDigits(row.value)}٪`;
}

function criterionText(part) {
  const c = BENCHMARK_CRITERIA[part];
  return c.rate ? `المعيار: ${toArabicDigits(c.rate)} في الدقيقة (مؤقت)` : `المعيار: ${toArabicDigits(Math.round(c.accuracy * 100))}٪`;
}

/** The profile of one sitting as a table, with the change since the previous sitting when there is one. */
export function profileTable(profile, before = null) {
  const prev = before ? Object.fromEntries(benchmarkProfile(before.parts).map(r => [r.part, r])) : {};
  return el('div', { class: 'profile' }, ...profile.map(row => el('div', { class: `profile-row ${row.met ? 'is-met' : 'is-not'}`, 'data-part': row.part },
    el('span', { class: 'profile-mark', 'aria-hidden': 'true', text: row.met ? '✓' : '…' }),
    el('span', { class: 'profile-label', text: PART_LABELS[row.part] }),
    el('span', { class: 'profile-value', text: partValue(row) }),
    prev[row.part] ? el('span', { class: 'profile-change', text: `(قبل: ${partValue(prev[row.part])})` }) : null,
    el('span', { class: 'profile-criterion', text: criterionText(row.part) }))));
}

function benchmarkResult(ctx, stageIndex, profile, before) {
  const root = ctx.activityRoot('اختبار المرحلة', 'النتيجة', ctx.renderDashboard);
  const notMet = profile.filter(r => !r.met);
  root.replaceChildren(el('div', { class: 'bench-result' },
    el('p', { class: 'text-base font-bold', text: ctx.stages[stageIndex].title }),
    profileTable(profile, before),
    notMet.length
      ? el('div', { class: 'mt-3' }, el('h4', { class: 'font-bold', text: 'ما الذي تتدرّب عليه الآن؟' }),
        el('ul', { class: 'tips-list' }, ...notMet.map(r => el('li', { text: `${PART_LABELS[r.part]}: ${PART_ADVICE[r.part]}` }))))
      : el('p', { class: 'text-green-700 font-bold mt-3', text: 'حقّقت كل معايير هذه المرحلة. أحسنت! 🎉' }),
    el('p', { class: 'section-help mt-3', text: 'معايير السرعة مؤقتة: ستُحدَّد بدقة بعد تجربة البرنامج مع عدد من المتعلمين.' }),
    el('div', { class: 'flex flex-wrap gap-2 mt-4' },
      el('button', { class: 'today-btn', onclick: ctx.renderReport }, 'تقرير التقدّم'),
      el('button', { class: 'small-btn', onclick: ctx.renderDashboard }, 'الصفحة الرئيسية'))));
}

// ---------------------------------------------------------------------------
// Today panel and report
// ---------------------------------------------------------------------------
/** Cards for the dashboard's "today" panel: [{ id, icon, title, text, action, onClick }]. */
export function todayCards(ctx) {
  const p = ctx.getProgress();
  const cards = [];
  const { recommended } = benchmarkStatus(p, ctx.stages);
  if (recommended) {
    cards.push({ id: 'benchmark', icon: '🏆', title: 'اختبار المرحلة', text: `أكملت «${recommended.title}». قِس قراءتك الآن (حوالي ١٠ دقائق).`, action: 'ابدأ الاختبار', onClick: () => introduceBenchmark(ctx, recommended.index) });
  }
  if (drillReady(ctx, 'words')) {
    const best = bestOf(p.fluency.words);
    cards.push({ id: 'speed', icon: '⚡', title: 'تدريب السرعة', text: best === null ? 'دقيقة واحدة: اقرأ كلمات بسرعة ودقّة.' : `أفضل نتيجة: ${fmt(best)} كلمة في الدقيقة. هل تتجاوزها اليوم؟`, action: 'تدرّب', onClick: () => renderSpeedMenu(ctx) });
  }
  return cards;
}

/** Report sections: speed, unit checks, stage benchmarks and can-do ratings. */
export function reportSections(ctx, units) {
  const p = ctx.getProgress();
  const box = (title, ...content) => el('div', { class: 'bg-white p-6 rounded-lg shadow-sm mb-6' }, el('h3', { class: 'text-lg font-bold mb-2', text: title }), ...content);
  const out = [];
  const speedRows = Object.entries(DRILLS).filter(([kind]) => p.fluency[kind].length).map(([kind, d]) => el('div', { class: 'speed-row' },
    el('span', { class: 'font-bold', text: d.title }),
    el('span', { text: `آخر نتيجة: ${fmt(netPerMinute(p.fluency[kind][p.fluency[kind].length - 1]))} — الأفضل: ${fmt(bestOf(p.fluency[kind]))} ${d.per}` }),
    sparkline(fluencyTrend(p, kind), { label: d.title })));
  const texts = p.fluency.texts.slice(-5).reverse();
  out.push(box('سرعة القراءة',
    speedRows.length || texts.length ? null : el('p', { class: 'text-gray-500', text: 'تدرّب على «تدريب السرعة» أو قِس سرعة قراءتك لنص قصير، وستظهر نتائجك هنا.' }),
    ...speedRows,
    texts.length ? el('div', { class: 'mt-2' }, el('p', { class: 'font-bold', text: 'قراءة النصوص (كلمة في الدقيقة)' }),
      el('ul', { class: 'confusion-list' }, ...texts.map(t => el('li', { text: `${t.id.split(':')[0] ? `الوحدة ${toArabicDigits(t.id.split(':')[0])}` : ''}: ${toArabicDigits(t.wpm)}` })))) : null,
    drillReady(ctx, 'words') ? el('button', { class: 'today-btn mt-3', onclick: () => renderSpeedMenu(ctx) }, 'تدريب السرعة') : null));

  const checked = units.filter(u => p.checks[u.id]);
  out.push(box('اختبارات الوحدات',
    checked.length
      ? el('div', { class: 'accuracy-grid' }, ...checked.map(u => el('span', { class: `accuracy-chip ${p.checks[u.id].passed ? 'is-good' : 'is-weak'}` },
        el('span', { text: toArabicDigits(u.id) }), el('span', { text: `${toArabicDigits(Math.round(p.checks[u.id].best * 100))}٪` }))))
      : el('p', { class: 'text-gray-500', text: 'في آخر كل وحدة «اختبار الوحدة»: ١٢ سؤالًا، والنجاح ٨٠٪.' })));

  const { open } = benchmarkStatus(p, ctx.stages);
  out.push(box('اختبارات المراحل والتقييم الذاتي',
    el('p', { class: 'section-help', text: 'في نهاية كل مرحلة اختبار قصير يقيس الدقة والسرعة والفهم. يمكنك أن تأخذه قبل المرحلة أيضًا لتقارن قبل وبعد.' }),
    ...open.map(s => {
      const last = lastBenchmark(p, s.index);
      const self = p.selfAssess[s.index];
      const set = ctx.canDo.find(c => c.stage === s.index);
      return el('div', { class: 'stage-report', 'data-stage': String(s.index) },
        el('p', { class: 'font-bold', text: s.title }),
        last ? profileTable(benchmarkProfile(last.parts)) : el('p', { class: 'text-gray-500', text: 'لم تأخذ اختبار هذه المرحلة بعد.' }),
        self && set ? el('ul', { class: 'can-list' }, ...set.items.filter(i => self.r[i.id] !== undefined).map(i => el('li', {},
          el('span', { class: 'can-mark', text: ['○', '◐', '●'][self.r[i.id]] }), ' ', ...richText(i.ar)))) : null,
        el('div', { class: 'flex flex-wrap gap-2 mt-2' },
          el('button', { class: 'small-btn', onclick: () => introduceBenchmark(ctx, s.index) }, last ? 'أعد الاختبار' : 'خذ الاختبار'),
          el('button', { class: 'small-btn', onclick: () => startSelfAssessment(ctx, s.index) }, 'قيّم نفسك')));
    })));
  return out;
}
