// Every activity of a few units, with a mix of right and wrong answers, then the unit check.
import { newPage, check, runSession, progress, openWith, openUnit, unitsDone, question, showAll } from './harness.mjs';

const SKIP = new Set(['unit-check']);   // run last, once the other activities are done

async function runUnit(page, unitId) {
  await openUnit(page, unitId);
  const acts = (await page.$$eval('#lesson-view [data-activity]', ns => ns.map(n => n.dataset.activity))).filter(a => !SKIP.has(a));
  for (const a of acts) {
    await page.click(`[data-activity="${a}"]`);
    await page.waitForSelector('#activity-content .instruction');
    const seen = await runSession(page, (q, i) => q.type === 'record' || i !== 5);   // one mistake, only in longer sessions
    await page.waitForSelector('#message-modal:not(.hidden)', { timeout: 10000 }).catch(() => {});
    const msg = (await page.innerText('#modal-message')).replace(/\s+/g, ' ');
    check(`unit ${unitId}: ${a} completes`, /اكتمل النشاط|أحسنت! قرأت/.test(msg), `${seen.length} answers`);
    await page.click('#modal-buttons button:last-child');
    await page.waitForSelector('#lesson-view [data-activity]', { state: 'attached' });
    await showAll(page);
  }
  await page.click('[data-activity="unit-check"]');
  await page.waitForSelector('#activity-content .instruction');
  await runSession(page, () => true, 12);
  await page.waitForSelector('.check-result');
  const p = await progress(page);
  check(`unit ${unitId}: unit check completes the unit`, p.completedUnits.includes(unitId) && p.unlockedUnit === unitId + 1);
  await page.click('.check-result .today-btn');
  await page.click('#back-button');
}

export default async function units(browser, base) {
  {
    const page = await newPage(browser, base);
    await openWith(page, '');
    await runUnit(page, 1);
    check('unit 1: no page errors', page.errors.length === 0, page.errors.join(' | '));
    await page.context().close();
  }
  {
    const page = await newPage(browser, base);
    await openWith(page, unitsDone(14));
    await runUnit(page, 15);
    check('unit 15: no page errors', page.errors.length === 0, page.errors.join(' | '));
    await page.context().close();
  }
  // A calm path: one lesson card at home; in a unit, one "Continue" button through the required steps.
  {
    const page = await newPage(browser, base);
    await openWith(page, '');
    check('home shows one main card (today\'s lesson)', (await page.$$eval('#today-panel .today-main > *', ns => ns.length)) === 1
      && (await page.innerText('[data-card="lesson"]')).includes('درس اليوم'));
    await page.click('#menu-button');
    check('rare menu items are folded under settings', await page.isVisible('#backup-button') && !(await page.isVisible('#reset-progress')));
    await page.click('#menu-button');
    await page.click('[data-card="lesson"] .continue-btn');
    await page.waitForSelector('#lesson-view .continue-card');
    check('a new unit opens on step 1 of 7, with the full activity list folded',
      (await page.innerText('.continue-card')).includes('الخطوة ١ من ٧') && !(await page.isVisible('#lesson-view [data-activity="capital-match"]')));
    await page.click('[data-continue]');
    await page.waitForSelector('#activity-content .instruction');
    const first = await question(page);
    await runSession(page, () => true);
    await page.waitForSelector('#message-modal:not(.hidden)');
    await page.click('#modal-buttons button:first-child');     // "Continue"
    await page.waitForSelector('#activity-content .instruction');
    const second = await question(page);
    check('Continue goes from the sounds straight to blending', first.activity === 'sound-match' && second.activity === 'blend', `${first.activity} -> ${second.activity}`);
    await page.click('#back-button');
    await page.waitForSelector('#lesson-view .continue-card');
    check('the unit page now shows step 2', (await page.innerText('.continue-card')).includes('الخطوة ٢ من ٧'));
    await page.click('#back-button');
    check('home: the lesson card continues at step 2', (await page.innerText('[data-card="lesson"]')).includes('الخطوة ٢ من ٧'));
    check('calm path: no page errors', page.errors.length === 0, page.errors.join(' | '));
    await page.context().close();
  }
  // Feedback details: dictation with a vowel left out, and tracing a mirrored letter.
  {
    const page = await newPage(browser, base);
    await openWith(page, unitsDone(3));
    await openUnit(page, 4);
    await page.click('[data-activity="dictation"]');
    await page.waitForSelector('.keyboard');
    const d = await question(page);
    await page.keyboard.type(d.answer.replace(/[aeiou]/, ''));
    await page.keyboard.press('Enter');
    await page.waitForSelector('.spell-diff');
    check('dictation names the missing vowel', (await page.innerText('#feedback')).includes('حرف العلة'));
    await page.click('#back-button');
    await showAll(page);
    await page.click('[data-activity="tracing"]');
    await page.waitForSelector('.trace-canvas');
    const { answer } = await import('./harness.mjs');
    await answer(page, true);
    await page.waitForSelector('#feedback.feedback-ok', { timeout: 4000 }).catch(() => {});
    check('tracing accepts a well-formed letter', await page.isVisible('#feedback.feedback-ok'));
    await page.waitForTimeout(1800);
    await answer(page, false);
    await page.waitForSelector('#feedback.feedback-try', { timeout: 4000 }).catch(() => {});
    check('tracing rejects a mirrored letter', await page.isVisible('#feedback.feedback-try'));
    check('feedback details: no page errors', page.errors.length === 0, page.errors.join(' | '));
    await page.context().close();
  }
}
