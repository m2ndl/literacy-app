// The learner model: daily review, weak sounds, ear training, the report, and backup -> reset -> restore.
import { newPage, check, closeBadges, runSession, progress, openWith, unitsDone, modalOpen } from './harness.mjs';

const ITEMS = ['w:pin', 'w:map', 'w:cat', 'w:pen', 'w:sit', 'w:top', 'w:net', 'w:dog', 'ph:ae', 'ph:ih'];

export default async function learner(browser, base) {
  const page = await newPage(browser, base);
  const items = Object.fromEntries(ITEMS.map(k => [k, { b: 2, due: 0, h: '11', rt: null, days: 2, last: 1 }]));
  const weak = Array.from({ length: 4 }, () => ({ t: Date.now(), u: 3, a: 'which-word', i: 'pin', n: 0, ok: false, c: 'pen', rt: 900, f: ['i'], x: 'i>e' }));
  await openWith(page, `${unitsDone(3)} p.points = 50; p.items = ${JSON.stringify(items)}; p.attempts = ${JSON.stringify(weak)};`);

  // Daily review
  await page.click('.today-card[data-card="review"] .today-btn');
  const r = await runSession(page, (q, i) => i % 4 !== 3, 20);
  const after = await progress(page);
  check('review runs mixed item types', r.length >= 8 && new Set(r.map(x => x.activity)).size >= 2, [...new Set(r.map(x => x.activity))].join(','));
  check('review reschedules items', Object.values(after.items).filter(m => m.due === 0).length < ITEMS.length);
  await page.click('#modal-buttons button');
  await closeBadges(page);

  // Weak sounds (i/e confused four times)
  await page.click('.today-card[data-card="weak"] .today-btn');
  const w = await runSession(page, () => true, 15);
  check('weak-sound practice includes ear training', w.length >= 5 && w.some(x => x.activity === 'perception'), [...new Set(w.map(x => x.activity))].join(','));
  await page.click('#modal-buttons button:last-child');
  await closeBadges(page);

  // Ear training: one 16-trial round
  await page.click('.today-card[data-card="ear"] .today-btn');
  await page.waitForSelector('.perception-card');
  await page.click('.perception-card[data-set="i-e"]');
  await page.waitForSelector('#activity-content .option-btn');
  const voices = new Set();
  const e = await runSession(page, (q, i) => { voices.add(q.prompt.voice); return i % 5 !== 0; }, 16);
  const ps = (await progress(page)).perception['i-e'];
  check('ear training records a 16-trial round in several voices', e.length === 16 && ps?.n === 16 && voices.size >= 2, [...voices].join(','));
  await page.click('#modal-buttons button:last-child');
  await closeBadges(page);

  // Report
  await page.click('#back-button');
  await page.click('#menu-button');
  await page.click('#progress-report-button');
  const report = await page.innerText('#progress-report-view');
  check('report shows mastery, ear training and speed', report.includes('ما أتقنته') && report.includes('تدريب الأذن') && report.includes('سرعة القراءة'));

  // Backup -> reset -> restore
  await page.click('#menu-button');
  await page.click('#backup-button');
  await page.click('#backup-view .today-btn');
  await page.waitForFunction(() => /^L2A[01]\./.test(document.querySelector('#backup-view textarea').value));
  const code = await page.inputValue('#backup-view textarea');
  const before = await progress(page);
  await page.click('#menu-button');
  await page.click('#reset-progress');
  await page.click('#modal-buttons .modal-btn-danger');
  await page.waitForTimeout(300);
  if (await modalOpen(page)) await page.click('#modal-buttons button:first-child');
  await closeBadges(page);
  await page.waitForTimeout(300);
  await page.click('#back-button').catch(() => {});
  await page.click('#menu-button');
  await page.click('#backup-button');
  await page.fill('#backup-view textarea:not([readonly])', code);
  await page.click('#backup-view .today-btn >> nth=1');
  await page.waitForSelector('#message-modal:not(.hidden)');
  await page.click('#modal-buttons .modal-btn-danger');
  await page.waitForTimeout(300);
  const restored = await progress(page);
  check('backup code restores progress', restored.unlockedUnit === before.unlockedUnit && restored.points === before.points
    && Object.keys(restored.items).length === Object.keys(before.items).length, `unit ${restored.unlockedUnit}, ${restored.points} points`);
  check('learner model: no page errors', page.errors.length === 0, page.errors.join(' | '));
  await page.context().close();
}
