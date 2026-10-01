import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { appData } from '../data.js';
import { findDecodingProblems, getLearnedContent } from '../logic.js';

// Walk the course in order, tracking which letters and sight words the learner has met
function eachChunkWithKnowledge(fn) {
  const taught = new Set();
  const sight = new Set();
  appData.chunks.forEach(chunk => {
    chunk.letters.forEach(l => taught.add(l));
    (chunk.sightWords || []).forEach(w => sight.add(w.toLowerCase()));
    fn(chunk, taught, sight);
  });
}

function wordsIn(chunk) {
  return [
    ...chunk.words.map(w => ({ w, where: 'words' })),
    ...chunk.letterPairs.map(w => ({ w, where: 'letterPairs' })),
    ...(chunk.sentences || []).flatMap(s => s.text.split(/\s+/).map(w => ({ w, where: `sentence "${s.text}"` })))
  ];
}

describe('course content is decodable', () => {
  it('every word uses only taught letters and patterns, or is a sight word', () => {
    const problems = [];
    eachChunkWithKnowledge((chunk, taught, sight) => {
      wordsIn(chunk).forEach(({ w, where }) => {
        if (sight.has(w.toLowerCase())) return;
        const found = findDecodingProblems(w, taught);
        if (found.length) problems.push(`group ${chunk.id}, ${where}: "${w}" (${found.join('; ')})`);
      });
    });
    assert.deepEqual(problems, []);
  });

  it('sight words only use letters that have been taught', () => {
    const problems = [];
    eachChunkWithKnowledge((chunk, taught) => {
      (chunk.sightWords || []).forEach(w => {
        const missing = [...w.toLowerCase()].filter(ch => !taught.has(ch));
        if (missing.length) problems.push(`group ${chunk.id}: "${w}" uses ${missing.join(', ')}`);
      });
    });
    assert.deepEqual(problems, []);
  });

  it('flags the kinds of words that used to slip in', () => {
    const early = new Set(['b', 't', 'a', 'p', 'i', 'n']);
    const all = new Set('abcdefghijklmnopqrstuvwxyz');
    assert.ok(findDecodingProblems('sit', early).length > 0, 'untaught s');
    assert.ok(findDecodingProblems('queen', all).length > 0, 'vowel team ee');
    assert.ok(findDecodingProblems('prize', all).length > 0, 'silent e');
    assert.ok(findDecodingProblems('yell', all).length > 0, 'double letter');
    assert.ok(findDecodingProblems('the', all).length > 0, 'digraph th');
    assert.deepEqual(findDecodingProblems('quiz', all), []);
    assert.deepEqual(findDecodingProblems('jump', all), []);
  });
});

describe('sentences', () => {
  it('each missing word is in the sentence and is a word the learner has met', () => {
    appData.chunks.forEach(chunk => {
      const known = new Set([
        ...getLearnedContent(chunk.id, 'words'),
        ...appData.chunks.filter(c => c.id <= chunk.id).flatMap(c => c.sightWords || [])
      ]);
      (chunk.sentences || []).forEach(s => {
        assert.ok(s.text.split(' ').includes(s.missing), `"${s.missing}" not in "${s.text}"`);
        assert.ok(known.has(s.missing), `group ${chunk.id}: "${s.missing}" hasn't been taught`);
        assert.ok(s.translation && s.translation.trim(), `"${s.text}" has no translation`);
      });
    });
  });
});
