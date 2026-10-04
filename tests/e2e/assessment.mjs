// Phase 4: unit checks, timed drills, reading aloud, a stage benchmark, the text timer and the report.
import { newPage, check, runSession, progress, openWith, openUnit, unitsDone, showAll } from './harness.mjs';
import { units } from '../../data.js';
import { requiredActivities } from '../../logic.js';

const allButCheck = (id) => requiredActivities(units[id - 1]).filter(a => a !== 'unit-check');

async function answerDrill(page, kind, wrongEvery = 0) {
  let wrongs = 0;
  for (let i = 0; i < 80; i++) {
    const node = await page.$(kind === 'words' ? '.drill-word' : '.drill-sentence');
    if (!node) break;
    const text = (await node.innerText()).trim();
    const right = kind === 'words' ? text
      : String(await page.evaluate(async (t) => (await import('./data-assess.js')).SENSE.find(x => x.text === t).answer, text));
    const wrong = wrongEvery && i % wrongEvery === wrongEvery - 1;
    const btn = await page.$(wrong ? `.drill-option:not([data-value="${right}"]):not([disabled])` : `.drill-option[data-value="${right}"]:not([disabled])`);
    if (btn) { await btn.click(); if (wrong) wrongs++; }
    await page.waitForTimeout(200);
  }
  return wrongs;
}

export default async function assessment(browser, base) {
  // Unit check: closed until the other activities are done; a pass completes the unit.
  {
    const page = await newPage(browser, base);
    await openWith(page, 'p.unlockedUnit = 2; p.completedUnits = [1];');
    await openUnit(page, 2);
    await page.click('[data-activity="unit-check"]');
    await page.waitForSelector('#message-modal:not(.hidden)');
    check('unit check waits for the other activities', (await page.innerText('#modal-message')).includes('أكمل أنشطة الوحدة'));
    await page.context().close();
    const page2 = await newPage(browser, base);
    await openWith(page2, `p.unlockedUnit = 2; p.completedUnits = [1]; p.completedActivities = { 2: ${JSON.stringify(allButCheck(2))} };`);
    await openUnit(page2, 2);
    await page2.click('[data-activity="unit-check"]');
    await page2.waitForSelector('#activity-content .instruction');
    const seen = await runSession(page2, () => true, 12);
    await page2.waitForSelector('.check-result');
    const p = await progress(page2);
    check('unit check: 12 items, no feedback during', seen.length === 12 && new Set(seen.map(s => s.activity)).size >= 5);
    check('unit check pass completes the unit, opens the next, adds 20 points', p.completedUnits.includes(2) && p.unlockedUnit === 3 && p.checks[2].passed && p.points === 20);
    check('unit check pass: no page errors', page2.errors.length === 0, page2.errors.join(' | '));
    await page2.context().close();
  }
  // Unit check failed -> missed items -> corrective practice -> retake offered.
  {
    const page = await newPage(browser, base);
    await openWith(page, `p.unlockedUnit = 3; p.completedUnits = [1, 2]; p.completedActivities = { 3: ${JSON.stringify(allButCheck(3))} };`);
    await openUnit(page, 3);
    await page.click('[data-activity="unit-check"]');
    await page.waitForSelector('#activity-content .instruction');
    await runSession(page, (q, i) => i >= 4, 12);
    await page.waitForSelector('.check-result');
    const missed = await page.$$eval('.missed-item', ns => ns.length);
    const p = await progress(page);
    check('unit check fail keeps the unit open and lists the 4 missed items', !p.completedUnits.includes(3) && missed === 4 && p.checks[3].passed === false);
    await page.click('.check-result .today-btn');
    await page.waitForSelector('#activity-content .instruction');
    const fixed = await runSession(page, () => true, 10);
    await page.waitForSelector('#message-modal:not(.hidden)');
    check('corrective practice covers the missed items, then offers a retake', fixed.length === 4 && (await page.innerText('#modal-message')).includes('أعد'));
    check('unit check fail: no page errors', page.errors.length === 0, page.errors.join(' | '));
    await page.context().close();
  }
  // Fluency practice: untimed by default (not recorded), the timer is a choice.
  {
    const page = await newPage(browser, base);
    await openWith(page, unitsDone(7));
    await showAll(page);
    await page.click('[data-card="speed"] .today-btn');
    await page.click('[data-drill="words"] .drill-untimed');
    await page.click('.drill-start');
    check('untimed practice shows no clock', !(await page.$('.drill-clock')));
    await answerDrill(page, 'words', 5);
    await page.waitForSelector('.drill-result', { timeout: 20000 });
    check('untimed practice: 20 items, a plain score, nothing recorded', (await page.innerText('.drill-result')).includes('من ٢٠')
      && (await progress(page)).fluency.words.length === 0);
    await page.click('.drill-result .small-btn');
    await page.click('[data-drill="words"] .drill-timed');
    await page.click('.drill-start');
    const wrongs = await answerDrill(page, 'words', 10);
    await page.waitForSelector('.drill-result', { timeout: 70000 });
    let p = await progress(page);
    check('word drill: right and wrong answers recorded', p.fluency.words.length === 1 && p.fluency.words[0].n >= 40 && p.fluency.words[0].x === wrongs, JSON.stringify(p.fluency.words));
    await page.click('.drill-result .small-btn');
    await page.click('[data-drill="sentences"] .drill-timed');
    await page.click('.drill-start');
    await answerDrill(page, 'sentences');
    await page.waitForSelector('.drill-result', { timeout: 100000 });
    p = await progress(page);
    check('sentence drill recorded with no mistakes', p.fluency.sentences.length === 1 && p.fluency.sentences[0].x === 0 && p.fluency.sentences[0].n >= 10);
    check('drills: no page errors', page.errors.length === 0, page.errors.join(' | '));
    await page.context().close();
  }
  // Reading aloud with the browser's fake microphone (unit 2: unit 1 has words only).
  {
    const page = await newPage(browser, base);
    await openWith(page, 'p.unlockedUnit = 2; p.completedUnits = [1];');
    await openUnit(page, 2);
    await page.click('[data-activity="read-aloud"]');
    await page.waitForSelector('.record-btn');
    await page.click('.record-btn');
    await page.waitForTimeout(1500);
    await page.click('.record-btn');
    await page.waitForSelector('.record-ratings button', { timeout: 8000 });
    check('reading aloud shows both waveforms', (await page.$$('.wave')).length === 2);
    await page.click('.record-ratings button[data-value="1"]');
    await runSession(page, () => true, 4);
    await page.waitForSelector('#message-modal:not(.hidden)');
    const p = await progress(page);
    const logged = p.attempts.filter(a => a.a === 'read-aloud');
    check('reading aloud: 5 ratings logged with both durations', logged.length === 5 && /^\d\|\d+\.\d\|\d+\.\d$/.test(logged[0].c), logged.map(a => a.c).join(' '));
    check('reading aloud is optional and marked done', p.completedActivities[2].includes('read-aloud') && !p.completedUnits.includes(2));
    check('reading aloud: no page errors', page.errors.length === 0, page.errors.join(' | '));
    await page.context().close();
  }
  // Stage 1 benchmark, self-assessment, report, export button.
  {
    const page = await newPage(browser, base);
    await openWith(page, unitsDone(10));
    await showAll(page);
    await page.click('[data-card="benchmark"] .today-btn');
    await page.waitForSelector('#message-modal:not(.hidden)');
    await page.click('#modal-buttons button:first-child');
    await page.click('.drill-start');
    await answerDrill(page, 'words');
    await page.waitForSelector('.drill-start', { timeout: 70000 });
    await page.click('.drill-start');
    await answerDrill(page, 'sentences');
    for (const [n, decide] of [[6, () => true], [6, (q, i) => i >= 2], [4, () => true]]) {
      await page.waitForSelector('#message-modal:not(.hidden)', { timeout: 100000 });
      await page.click('#modal-buttons button');
      await page.waitForSelector('#activity-content .instruction');
      await runSession(page, decide, n);
    }
    await page.waitForSelector('.can-row');
    for (const row of await page.$$('.can-row')) await (await row.$('.can-btn[data-value="1"]')).click();
    await page.click('#activity-content > .today-btn');
    await page.waitForSelector('.bench-result');
    const b = (await progress(page)).benchmarks[0];
    check('benchmark saved with five parts and item responses', b && Object.keys(b.parts).length === 5 && b.items.length >= 50 && b.done === true);
    check('benchmark scores', b.parts.decoding.r === 6 && b.parts.spelling.r === 4 && b.parts.reading.r === 4 && b.parts.words.x === 0, JSON.stringify(b.parts));
    check('benchmark profile: spelling not met, decoding met', !!(await page.$('.profile-row[data-part="spelling"].is-not')) && !!(await page.$('.profile-row[data-part="decoding"].is-met')));
    await page.click('.bench-result .today-btn');
    await page.waitForSelector('#progress-report-view:not(.hidden)');
    check('report shows the stage profile', !!(await page.$('.stage-report[data-stage="0"] .profile')));
    await page.click('#menu-button');
    await page.click('#backup-button');
    check('benchmark CSV export offered', (await page.innerText('#backup-view')).includes('نتائج اختبارات المراحل'));
    check('benchmark: no page errors', page.errors.length === 0, page.errors.join(' | '));
    await page.context().close();
  }
  // Timed reading of a lesson text.
  {
    const page = await newPage(browser, base);
    await openWith(page, unitsDone(10));
    await openUnit(page, 11);
    await page.click('.reader-timer button');
    await page.waitForTimeout(12000);
    await page.click('.reader-timer button');
    const p = await progress(page);
    check('text timer records words a minute', p.fluency.texts.length === 1 && p.fluency.texts[0].wpm > 100);
    await page.context().close();
  }
}
