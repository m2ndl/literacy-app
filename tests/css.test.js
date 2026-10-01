import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cli = join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'tailwindcss.cmd' : 'tailwindcss');
const SOURCES = ['index.html', 'app.js', 'theme.js', 'activities-enhance.js'];

describe('compiled CSS', () => {
  it('uses no Tailwind v3 opacity utilities (removed in v4)', () => {
    // Write the old utility names in pieces so this file doesn't contain them itself
    const removed = new RegExp(['bg', 'text', 'border'].map(p => `\\b${p}-opacity-\\d+`).join('|'), 'g');
    const found = SOURCES.flatMap(f => (readFileSync(join(root, f), 'utf8').match(removed) || []).map(m => `${f}: ${m}`));
    assert.deepEqual(found, [], 'use the slash form instead, e.g. bg-black/50');
  });

  it('tailwind.css is up to date with the source (run `npm run build:css`)', { skip: !existsSync(cli) && 'run npm install first' }, () => {
    const dir = mkdtempSync(join(tmpdir(), 'tw-'));
    try {
      const out = join(dir, 'tailwind.css');
      execFileSync(cli, ['-i', 'tailwind-input.css', '-o', out, '--minify'], { cwd: root, stdio: 'ignore' });
      const fresh = readFileSync(out, 'utf8');
      const committed = readFileSync(join(root, 'tailwind.css'), 'utf8');
      assert.ok(fresh === committed, 'tailwind.css is stale: run `npm run build:css` and commit the result');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
