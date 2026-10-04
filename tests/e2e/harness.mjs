// Browser test harness: a static server for the app, Chromium through Playwright, and helpers that
// answer questions. The page under test exposes the current question as window.__q: app.js is rewritten
// on the fly by a request route, so nothing test-only ships in the app.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from 'playwright';

export { devices };
export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const PROGRESS_KEY = 'literacyAppProgress.v5';

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.mp3': 'audio/mpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.md': 'text/markdown'
};

/** Serve the repository on a free local port. Returns { url, close() }. */
export async function serve() {
  const server = createServer(async (req, res) => {
    try {
      const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
      let file = join(ROOT, path);
      if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
      res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
      res.end(await readFile(file));
    } catch (e) {
      res.writeHead(404);
      res.end('not found');
    }
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  return { url: `http://127.0.0.1:${server.address().port}/`, close: () => new Promise(r => server.close(r)) };
}

/** Results of all checks; a check never throws, so one failure doesn't hide the others. */
export const results = [];
export function check(name, ok, extra = '') {
  results.push({ name, ok: !!ok });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${extra ? ` — ${extra}` : ''}`);
}

export async function launch() {
  return chromium.launch({
    // CHROMIUM_PATH: a browser already on the machine (otherwise Playwright's own download).
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
  });
}

/** A new page (own context) with window.__q exposed and page errors collected in page.errors. */
export async function newPage(browser, base, { device = devices['Pixel 7'], userAgent = null } = {}) {
  const context = await browser.newContext({
    ...device, ...(userAgent ? { userAgent } : {}), locale: 'ar', serviceWorkers: 'block', permissions: ['microphone']
  });
  // Nothing outside the local server is fetched: third-party requests (web fonts, the visit counter) get an
  // empty reply, so an outage elsewhere cannot fail a test (CI once failed on a 521 from one of them).
  await context.route(url => !url.href.startsWith(base), route => route.fulfill({ status: 200, body: '' }));
  await context.route('**/app.js', async route => {
    const res = await route.fetch();
    const body = (await res.text()).replace('function renderQuestion() {\n', 'function renderQuestion() {\n  window.__q = session.queue[session.index].q;\n');
    await route.fulfill({ response: res, body, headers: { ...res.headers(), 'content-type': 'text/javascript' } });
  });
  const page = await context.newPage();
  page.base = base;
  page.errors = [];
  page.on('pageerror', e => page.errors.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error' && !/favicon|404|ERR_/.test(m.text())) page.errors.push(`console: ${m.text()}`); });
  return page;
}

export const question = (page) => page.evaluate(() => window.__q && JSON.parse(JSON.stringify(window.__q)));
export const modalOpen = (page) => page.isVisible('#message-modal:not(.hidden)');
export const progress = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), PROGRESS_KEY);

/**
 * Open the app with prepared progress. `mutate(p)` runs in the page on default progress. Storage is
 * written from a non-app page of the same origin, because the app saves its own state when it unloads.
 */
export async function openWith(page, mutate = '') {
  await page.goto(`${page.base}manifest.json`);
  await page.evaluate(async ({ k, src }) => {
    const { getDefaultProgress } = await import('./logic.js');
    const p = getDefaultProgress();
    p.seenNotices = ['new-course', 'ios-install', 'start-choice'];
    // eslint-disable-next-line no-new-func
    new Function('p', src)(p);
    localStorage.setItem(k, JSON.stringify(p));
  }, { k: PROGRESS_KEY, src: mutate });
  await page.goto(page.base);
  await page.click('#start-learning-btn');
  await page.waitForSelector('#unit-grid .unit-card');
}

/** Progress with the first `n` units complete (unit n + 1 open). */
export const unitsDone = (n) => `p.unlockedUnit = ${n + 1}; p.completedUnits = Array.from({ length: ${n} }, (_, i) => i + 1);`;


export async function openUnit(page, unitId) {
  await page.click(`#unit-grid .unit-card >> nth=${unitId - 1}`);
  await page.waitForSelector('#lesson-view [data-activity]', { state: 'attached' });
  await showAll(page);
}

/** Unfold the folded lists (every activity of a unit, "More" on the home screen, settings in the menu). */
export async function showAll(page) {
  await page.evaluate(() => document.querySelectorAll('details').forEach(d => { d.open = true; }));
}

async function drawStrokes(page, strokes) {
  const box = await page.locator('.trace-canvas').boundingBox();
  for (const s of strokes) {
    const pts = s.map(([x, y]) => [box.x + (x / 120) * box.width, box.y + (y / 140) * box.height]);
    await page.mouse.move(...pts[0]);
    await page.mouse.down();
    for (const p of pts.slice(1)) await page.mouse.move(...p, { steps: 1 });
    await page.mouse.up();
  }
}

async function traceLetter(page, letter, right) {
  const strokes = await page.evaluate(async (l) => (await import('./tracing.js')).LETTERS[l], letter);
  const mirrored = strokes.map(s => s.map(([x, y]) => [120 - x, y]));
  await page.waitForFunction(() => document.querySelector('.trace-step')?.textContent.includes('تتبّع'), null, { timeout: 8000 });
  await drawStrokes(page, strokes);
  await page.waitForFunction(() => document.querySelector('.trace-step')?.textContent.includes('وحدك'), null, { timeout: 4000 });
  await drawStrokes(page, right ? strokes : mirrored);
  await page.waitForTimeout(700);
}

/** Answer the current question, right or wrong. Returns the question. */
export async function answer(page, right = true) {
  const q = await question(page);
  if (q.type === 'choice' || q.type === 'yesno') {
    const values = q.options.map(o => String(o.value));
    const v = right ? String(q.answer) : values.find(x => x !== String(q.answer));
    await page.click(`#activity-content .option-btn[data-value="${v}"]`);
  } else if (q.type === 'audio-choice') {
    const v = right ? q.answer : q.options.find(o => o.value !== q.answer).value;
    await page.click(`#activity-content .audio-option[data-value="${v}"]`);
    await page.click('#activity-content .audio-choice .next-btn');
  } else if (q.type === 'spell') {
    await page.keyboard.type(right ? q.answer : q.answer.slice(0, -1) || 'x');
    await page.keyboard.press('Enter');
  } else if (q.type === 'build') {
    const order = right ? q.answerTiles : [...q.answerTiles].reverse();
    for (const label of order) {
      for (const t of await page.$$('#activity-content .tile:not([disabled])')) {
        if ((await t.innerText()) === label) { await t.click(); break; }
      }
    }
  } else if (q.type === 'trace') {
    await traceLetter(page, q.answer, right);
  } else if (q.type === 'record') {
    await page.click('.record-btn');
    await page.waitForTimeout(1200);
    await page.click('.record-btn');
    await page.waitForSelector('.record-ratings button', { timeout: 8000 });
    await page.click(`.record-ratings button[data-value="${right ? 2 : 0}"]`);
  } else if (q.type === 'blend') {
    await page.click('#activity-content [data-slow]');
    const v = right ? q.answer : q.options.find(o => o.value !== q.answer).value;
    await page.click(`#activity-content .audio-option[data-value="${v}"]`);
    await page.click('#activity-content .audio-choice .next-btn');
  }
  return q;
}

async function continueAfter(page) {
  const next = await page.$('#feedback .next-btn');
  if (next) await next.click();
  else if (await page.$('#activity-content .option-btn.reveal')) await page.click('#activity-content .option-btn.reveal');
  else await page.waitForTimeout(1900);
}

const ONE_TRY = /^(place|check|bench):/;

/**
 * Answer up to `max` questions: decide(q, i) says whether to answer right. A wrong first try is followed
 * by a right second try, except where there is only one try (placement, checks, benchmarks, ear training,
 * reading aloud). Stops when a message opens. Returns [{ activity, unit, ok }].
 */
export async function runSession(page, decide = () => true, max = 80) {
  const seen = [];
  for (let i = 0; i < max; i++) {
    if (await modalOpen(page)) break;
    const before = await question(page);
    if (!before) break;
    const shown = (await page.innerText('#activity-content').catch(() => '')).match(/\[object \w+\]|\bundefined\b|\bNaN\b/);
    if (shown) check(`${before.activity}: no "${shown[0]}" on screen`, false, before.key);
    const ok = decide(before, i);
    await answer(page, ok);
    seen.push({ activity: before.activity, unit: before.unit, ok });
    await page.waitForTimeout(150);
    if (await modalOpen(page)) break;
    if (before.type === 'record') { await page.waitForTimeout(300); continue; }
    if (!ok) {
      const still = await question(page);
      if (still && still.key === before.key && !(await page.$('#feedback .next-btn')) && before.activity !== 'perception' && !ONE_TRY.test(before.key)) {
        await page.waitForTimeout(1000);
        await answer(page, true);
      }
    }
    await continueAfter(page);
  }
  return seen;
}
