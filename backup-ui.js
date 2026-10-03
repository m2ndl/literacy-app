// backup-ui.js - The "backup" screen: make a code, restore from a code, export the answer log.
import { el, toArabicDigits } from './dom.js';
import { encodeBackup, decodeBackup, attemptsCsv, benchmarksCsv, backupDue } from './backup.js';

export { backupDue };

const ERRORS = {
  format: 'هذا ليس رمزًا احتياطيًا. انسخ الرمز كاملًا (يبدأ بـ L2A).',
  checksum: 'الرمز ناقص أو تغيّر أثناء النسخ. انسخه مرة أخرى كاملًا.',
  unsupported: 'هذا المتصفح قديم ولا يستطيع قراءة الرمز. حدّث المتصفح أو استخدم Chrome أو Safari حديثًا.',
  data: 'لم نستطع قراءة التقدّم من هذا الرمز.'
};

function download(name, text, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
  const a = el('a', { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const stamp = () => new Date().toISOString().slice(0, 10);

/**
 * ctx: { root, getProgress(), replaceProgress(p), markBackedUp(), showView(), showMessage(node, buttons),
 *        confirmAction(node, fn), renderDashboard(), units }
 */
export function renderBackup(ctx) {
  const codeBox = el('textarea', { class: 'code-box english-content', dir: 'ltr', readonly: true, rows: '4', 'aria-label': 'الرمز الاحتياطي' });
  const status = el('p', { class: 'section-help', 'aria-live': 'polite' });
  const actions = el('div', { class: 'flex flex-wrap gap-2 hidden' });
  const make = el('button', { class: 'today-btn' }, 'أنشئ الرمز');
  make.addEventListener('click', async () => {
    codeBox.value = await encodeBackup(ctx.getProgress());
    actions.classList.remove('hidden');
    status.textContent = 'احفظ هذا الرمز في مكان آمن: أرسله لنفسك في واتساب أو البريد، أو احفظه ملفًا.';
  });
  const copy = el('button', { class: 'small-btn' }, '📋 نسخ');
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(codeBox.value);
    } catch (e) {
      codeBox.select();
      document.execCommand?.('copy');
    }
    ctx.markBackedUp();
    status.textContent = '✅ نُسخ الرمز.';
  });
  const share = navigator.share ? el('button', { class: 'small-btn' }, '📤 مشاركة') : null;
  share?.addEventListener('click', async () => {
    try {
      await navigator.share({ title: 'رمز تقدّمي — لغتي الثانية', text: codeBox.value });
      ctx.markBackedUp();
    } catch (e) { /* cancelled */ }
  });
  const save = el('button', { class: 'small-btn' }, '💾 حفظ ملفًا');
  save.addEventListener('click', () => {
    download(`my2ndlang-backup-${stamp()}.txt`, codeBox.value);
    ctx.markBackedUp();
  });
  actions.append(copy, ...(share ? [share] : []), save);

  const input = el('textarea', { class: 'code-box english-content', dir: 'ltr', rows: '4', placeholder: 'L2A1.…', 'aria-label': 'ألصق الرمز هنا' });
  const restoreStatus = el('p', { class: 'section-help', 'aria-live': 'polite' });
  const restore = el('button', { class: 'today-btn' }, 'استرجع التقدّم');
  restore.addEventListener('click', async () => {
    const r = await decodeBackup(input.value);
    if (!r.ok) {
      restoreStatus.textContent = ERRORS[r.error];
      return;
    }
    const p = r.progress;
    const unit = ctx.units.find(u => u.id === p.unlockedUnit);
    const when = r.saved ? new Date(r.saved).toLocaleDateString('ar') : '';
    ctx.confirmAction(el('div', { class: 'text-right' },
      el('p', { class: 'font-bold mb-2', text: 'استرجاع التقدّم من الرمز' }),
      el('p', { class: 'text-base', text: `${unit ? unit.title : ''} — ${toArabicDigits(p.points)} نقطة${when ? ` — حُفظ في ${when}` : ''}` }),
      el('p', { class: 'text-base mt-2', text: 'سيحلّ هذا محل التقدّم الموجود على هذا الجهاز.' })), () => {
      ctx.replaceProgress(p);
      ctx.showMessage(el('p', { text: '✅ استُرجع تقدّمك.' }), [{ label: 'متابعة', onClick: ctx.renderDashboard }]);
    });
  });

  const exportCsv = el('button', { class: 'small-btn' }, '⬇️ سجل الإجابات (CSV)');
  exportCsv.addEventListener('click', () => download(`my2ndlang-answers-${stamp()}.csv`, attemptsCsv(ctx.getProgress()), 'text/csv'));
  const exportBench = el('button', { class: 'small-btn' }, '⬇️ نتائج اختبارات المراحل (CSV)');
  exportBench.addEventListener('click', () => download(`my2ndlang-benchmarks-${stamp()}.csv`, benchmarksCsv(ctx.getProgress()), 'text/csv'));

  ctx.root.replaceChildren(
    el('div', { class: 'bg-white p-6 rounded-lg shadow-sm mb-6 space-y-3' },
      el('h3', { class: 'text-lg font-bold', text: 'احفظ نسخة من تقدّمك' }),
      el('p', { class: 'section-help', text: 'لا يوجد تسجيل دخول: تقدّمك محفوظ في هذا المتصفح فقط. الرمز الاحتياطي يحفظ تقدّمك لتسترجعه إذا مُسحت بيانات المتصفح أو غيّرت جهازك.' }),
      make, codeBox, actions, status),
    el('div', { class: 'bg-white p-6 rounded-lg shadow-sm mb-6 space-y-3' },
      el('h3', { class: 'text-lg font-bold', text: 'استرجع تقدّمك' }),
      el('p', { class: 'section-help', text: 'ألصق الرمز الذي حفظته من قبل.' }),
      input, restore, restoreStatus),
    el('div', { class: 'bg-white p-6 rounded-lg shadow-sm space-y-3' },
      el('h3', { class: 'text-lg font-bold', text: 'للمعلّم أو للدراسة' }),
      el('p', { class: 'section-help', text: 'ملف بإجاباتك (الوقت، النشاط، الإجابة، سرعة الإجابة). لا يُرسل البرنامج أي شيء تلقائيًا: الملف يبقى معك، وأنت تقرّر إن كنت تشاركه.' }),
      el('div', { class: 'flex flex-wrap gap-2' }, exportCsv, ctx.getProgress().benchmarks.length ? exportBench : null)));
  ctx.showView();
}
