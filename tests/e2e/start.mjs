// First run: the start choice, the placement test, the iPhone guide and the in-app-browser banner.
import { newPage, check, runSession, progress, devices } from './harness.mjs';

export default async function start(browser, base) {
  // Placement: right on units 1-3, wrong on unit 4 -> starts at unit 4, no points.
  {
    const page = await newPage(browser, base);
    await page.goto(base);
    await page.click('#start-learning-btn');
    await page.waitForSelector('#message-modal:not(.hidden)');
    await page.click('#modal-buttons button:nth-child(2)');      // "I know some English"
    await page.waitForSelector('#message-modal:not(.hidden)');
    await page.click('#modal-buttons button:first-child');        // start the test
    await page.waitForSelector('#activity-content .instruction');
    const seen = await runSession(page, (q) => q.unit < 4, 40);
    const text = (await page.innerText('#modal-message')).replace(/\s+/g, ' ');
    const p = await progress(page);
    check('placement stops after the first failed unit', seen.length === 20, `${seen.length} items`);
    check('placement starts at unit 4 with no points', p.unlockedUnit === 4 && JSON.stringify(p.placement.passed) === '[1,2,3]' && p.points === 0, text.slice(0, 100));
    check('placement: no page errors', page.errors.length === 0, page.errors.join(' | '));
    await page.context().close();
  }

  // iPhone Safari: the beginner path shows the Home Screen guide, then unit 1.
  {
    const page = await newPage(browser, base, { device: devices['iPhone 13'] });
    await page.goto(base);
    await page.click('#start-learning-btn');
    await page.waitForSelector('#message-modal:not(.hidden)');
    await page.click('#modal-buttons button:first-child');
    await page.waitForSelector('#install-view:not(.hidden)');
    check('iPhone guide explains Add to Home Screen', (await page.innerText('#install-view')).includes('إضافة إلى الشاشة الرئيسية'));
    await page.click('#install-view .next-btn');
    await page.waitForSelector('#lesson-view .sound-card');
    check('iPhone: then unit 1 opens, no page errors', await page.isVisible('#lesson-view') && page.errors.length === 0, page.errors.join(' | '));
    await page.context().close();
  }

  // Instagram's in-app browser: a banner asks to open the link in Safari.
  {
    const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 336.0.3.18.99';
    const page = await newPage(browser, base, { device: devices['iPhone 13'], userAgent: ua });
    await page.goto(base);
    await page.waitForSelector('.inapp-banner');
    check('in-app browser banner', (await page.innerText('.inapp-banner')).includes('Instagram'));
    await page.context().close();
  }
}
