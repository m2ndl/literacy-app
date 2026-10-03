// Guards for the static app: offline cache list, CSS classes and generated audio.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { units, gpc, ALPHABET, PERCEPTION } from '../data.js';
import { requiredClips } from '../phonics.js';
import { BENCH_PSEUDO } from '../data-assess.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const sw = read('service-worker.js');
const precached = new Set([...sw.matchAll(/'(\.\/[^']+)'/g)].map(m => m[1]));

describe('service worker precache list', () => {
  it('contains every local module the app imports', () => {
    const modules = new Set(['./app.js']);
    const queue = ['app.js'];
    while (queue.length) {
      const file = queue.pop();
      for (const m of read(file).matchAll(/^import[^'"]*['"](\.\/[^'"]+)['"]/gm)) {
        if (!modules.has(m[1])) { modules.add(m[1]); queue.push(m[1].slice(2)); }
      }
    }
    for (const m of modules) assert.ok(precached.has(m), `${m} is not precached`);
  });

  it('contains every local file referenced by index.html', () => {
    const html = read('index.html');
    const refs = [...html.matchAll(/(?:href|src)="(\.\/[^"]+)"/g)].map(m => m[1]);
    assert.ok(refs.length > 5);
    for (const r of refs) assert.ok(precached.has(r), `${r} is not precached`);
    for (const r of precached) assert.ok(existsSync(new URL(`../${r.slice(2) || 'index.html'}`, import.meta.url)), `${r} does not exist`);
  });
});

describe('CSS classes', () => {
  const css = ['tailwind.css', 'styles.css', 'ui-overrides.css', 'semantic-tokens.css'].map(read).join('\n');
  const escape = (c) => c.replace(/([:[\]/.%])/g, '\\$1');
  // Classes used only as JavaScript hooks or for headings that need no styling.
  const HOOKS = new Set(['activity-card', 'word', 'reader-compact', 'audio-option']);

  it('every static class used in index.html and the interface modules has a style', () => {
    const html = read('index.html');
    const js = ['app.js', 'dom.js', 'widgets.js', 'tracing.js', 'backup-ui.js', 'platform.js'].map(read).join('\n');
    const fromHtml = [...html.matchAll(/class="([^"]+)"/g)].flatMap(m => m[1].split(/\s+/));
    const fromJs = [...js.matchAll(/class: ['`]([^'`]+)['`]/g)].flatMap(m => m[1].replace(/\$\{[^}]*\}/g, ' ').split(/\s+/));
    const missing = [...new Set([...fromHtml, ...fromJs])]
      .filter(c => c && /^[a-z]/.test(c) && !HOOKS.has(c))
      .filter(c => !css.includes(`.${escape(c)}`));
    assert.deepEqual(missing, []);
  });
});

describe('generated audio', () => {
  const manifestUrl = new URL('../audio/manifest.json', import.meta.url);
  const hasAudio = existsSync(manifestUrl);

  it('covers every word, sentence and letter name (skips if audio is not generated)', { skip: !hasAudio }, () => {
    const manifest = JSON.parse(readFileSync(manifestUrl, 'utf8'));
    for (const c of requiredClips(units, gpc, ALPHABET, PERCEPTION, BENCH_PSEUDO.flatMap(s => s.items))) {
      if (c.kind === 'ph') continue; // a sound without a clean recording is taught through its keyword
      const entry = manifest.clips[c.key];
      assert.ok(entry, `missing clip ${c.key}`);
      for (const v of c.voices) {
        assert.ok(entry[v], `missing voice ${v} for ${c.key}`);
        const i = c.key.indexOf(':');
        const file = new URL(`../audio/${v}/${c.key.slice(0, i)}/${c.key.slice(i + 1)}.mp3`, import.meta.url);
        assert.ok(existsSync(file), `missing file for ${c.key} (${v})`);
      }
    }
  });

  it('has clean recordings for most single sounds, and all five short vowels', { skip: !hasAudio }, () => {
    const manifest = JSON.parse(readFileSync(manifestUrl, 'utf8'));
    const soundsOf = (gs) => [...new Set(gs.flatMap(g => [gpc[g].ph, gpc[g].alt?.ph].filter(Boolean)))];
    const share = (list) => list.filter(ph => manifest.clips[`ph:${ph}`]).length / list.length;
    // Letters and digraphs (units 1-10) are cut from short words and nearly all pass. Long vowels and r-vowels
    // are harder to cut and check; any that fail are taught through their keyword (the vowel in "home").
    const early = soundsOf(units.filter(u => u.id <= 10).flatMap(u => u.graphemes || []));
    const all = soundsOf(Object.keys(gpc));
    assert.ok(share(early) >= 0.9, `only ${Math.round(share(early) * 100)}% of the unit 1-10 sounds recorded`);
    assert.ok(share(all) >= 0.75, `only ${Math.round(share(all) * 100)}% of all sounds recorded`);
    for (const v of ['ae', 'ih', 'eh', 'uh', 'aa']) assert.ok(manifest.clips[`ph:${v}`], `vowel ${v} missing`);
  });

  it('keeps enough clean ear-training tokens for every set', { skip: !hasAudio }, () => {
    const manifest = JSON.parse(readFileSync(manifestUrl, 'utf8'));
    const avoid = new Set(manifest.avoid || []);
    for (const a of avoid) assert.ok(manifest.clips[a.split('@')[0]], `avoid list names an unknown clip ${a}`);
    for (const set of PERCEPTION) {
      for (const side of [0, 1]) {
        const usable = set.pairs.flatMap(p => ['f', 'm', 'f2', 'm2'].filter(v => !avoid.has(`w:${p[side]}@${v}`)));
        assert.ok(usable.length >= 16, `${set.id}: only ${usable.length} usable tokens for "${side ? set.b : set.a}"`);
      }
    }
  });

  it('stays within the size budget', { skip: !hasAudio }, () => {
    const manifest = JSON.parse(readFileSync(manifestUrl, 'utf8'));
    let bytes = 0;
    for (const [key, voices] of Object.entries(manifest.clips)) {
      const i = key.indexOf(':');
      for (const v of Object.keys(voices)) {
        bytes += statSync(new URL(`../audio/${v}/${key.slice(0, i)}/${key.slice(i + 1)}.mp3`, import.meta.url)).size;
      }
    }
    // 24 units at about 0.7 MB each. Clips are cached as the learner reaches them, never all at once.
    assert.ok(bytes < 20 * 1024 * 1024, `audio is ${(bytes / 1048576).toFixed(1)} MB`);
  });
});
