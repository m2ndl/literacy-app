// Every activity of a few units, with a mix of right and wrong answers, then the unit check.
import { newPage, check, closeBadges, runSession, progress, openWith, openUnit, unitsDone, question } from './harness.mjs';

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
    await closeBadges(page);
    await page.waitForSelector('#lesson-view [data-activity]');
  }
  await page.click('[data-activity="unit-check"]');
  await page.waitForSelector('#activity-content .instruction');
  await runSession(page, () => true, 12);
  await page.waitForSelector('.check-result');
  const p = await progress(page);
  check(`unit ${unitId}: unit check completes the unit`, p.completedUnits.includes(unitId) && p.unlockedUnit === unitId + 1);
  await page.click('.check-result .today-btn');
  await closeBadges(page);
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
