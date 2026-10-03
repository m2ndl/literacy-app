// Browser tests: `npm run test:e2e` (CHROMIUM_PATH=/path/to/chrome to use a browser already installed).
// Scenarios run in parallel, each in its own browser context, against a local static server.
import { serve, launch, results } from './harness.mjs';
import start from './start.mjs';
import units from './units.mjs';
import learner from './learner.mjs';
import assessment from './assessment.mjs';

const SCENARIOS = { start, units, learner, assessment };
const only = process.argv.slice(2);
const server = await serve();
const browser = await launch();
const t0 = Date.now();
const failures = [];
await Promise.all(Object.entries(SCENARIOS).filter(([name]) => !only.length || only.includes(name)).map(async ([name, run]) => {
  try {
    await run(browser, server.url);
  } catch (e) {
    failures.push(name);
    console.log(`FAIL ${name} stopped: ${e.message.split('\n').slice(0, 3).join(' | ')}`);
    console.log((e.stack || '').split('\n').filter(l => l.includes('tests/e2e/')).slice(0, 2).join('\n'));
  }
}));
await browser.close();
await server.close();
const passed = results.filter(r => r.ok).length;
console.log(`\n${passed}/${results.length} checks passed in ${Math.round((Date.now() - t0) / 1000)} s${failures.length ? `; scenarios stopped: ${failures.join(', ')}` : ''}`);
process.exit(passed === results.length && !failures.length ? 0 : 1);
