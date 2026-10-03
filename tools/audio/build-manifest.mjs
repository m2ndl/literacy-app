// Lists every audio clip the curriculum needs (tools/audio/clips.json).
// Usage: node tools/audio/build-manifest.mjs
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { units, gpc, ALPHABET, PERCEPTION } from '../../data.js';
import { BENCH_PSEUDO } from '../../data-assess.js';
import { requiredClips, slugify } from '../../phonics.js';

const here = dirname(fileURLToPath(import.meta.url));
const clips = requiredClips(units, gpc, ALPHABET, PERCEPTION, BENCH_PSEUDO.flatMap(s => s.items)).map(c => ({
  ...c,
  slug: c.kind === 'ph' || c.kind === 'ln' ? c.text : slugify(c.text)
}));
// One clip per line keeps diffs readable.
writeFileSync(join(here, 'clips.json'), `{"clips": [\n${clips.map(c => JSON.stringify(c)).join(',\n')}\n]}\n`);
const count = (k) => clips.filter(c => c.kind === k).length;
console.log(`clips: ${clips.length} (phonemes ${count('ph')}, letter names ${count('ln')}, words ${count('w')}, sentences ${count('s')}, made-up words ${count('p')})`);
console.log(`files: ${clips.reduce((n, c) => n + c.voices.length, 0)}`);
