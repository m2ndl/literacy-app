#!/usr/bin/env python3
"""Content metrics for the curriculum (PEDAGOGY_PLAN.md, section 10, Tier 1).

Decodability, meanings and contrasts are enforced by tests/curriculum.test.js; this script adds the
vocabulary-frequency metric, which needs a word-frequency list (wordfreq, CC BY-SA), and writes
tools/content/metrics.json.

Usage: pip install wordfreq && python tools/content/metrics.py
"""
import json
import re
import subprocess
import sys
from pathlib import Path

from wordfreq import top_n_list, zipf_frequency

ROOT = Path(__file__).resolve().parents[2]
DUMP = """
import('./data.js').then(({ units }) => console.log(JSON.stringify(units.map(u => ({
  id: u.id, review: !!u.review, words: (u.words || []).map(w => w.w), heart: (u.heart || []).map(h => h.w),
  contrasts: (u.contrasts || []).length, sentences: (u.sentences || []).length,
  texts: (u.texts || []).map(t => t.sentences.map(s => s.text).join(' ')), signs: (u.signs || []).length,
  forms: (u.forms || []).length, names: (u.names || []).map(n => n.w),
  running: [...(u.sentences || []).map(s => s.text), ...(u.texts || []).flatMap(t => t.sentences.map(s => s.text))]
})))));
"""


SUFFIXES = ['ing', 'ed', 'est', 'er', 'ly', 'ness', 'ful', 'ment', 'es', 's']


def family(word, top):
    """The word or its base (word family, as the NGSL counts): jumped -> jump, quickly -> quick, unlock -> lock."""
    if word in top:
        return word
    for pre in ('un', 're'):
        if word.startswith(pre) and word[len(pre):] in top:
            return word[len(pre):]
    for suf in SUFFIXES:
        if word.endswith(suf):
            stem = word[:-len(suf)]
            for cand in (stem, stem + 'e', stem[:-1] if len(stem) > 2 and stem[-1] == stem[-2] else None,
                         stem[:-1] + 'y' if stem.endswith('i') else None):
                if cand and cand in top:
                    return cand
    return None


def tokens(text):
    """Lower-case words of a sentence (digits and punctuation dropped; Mr. -> mr)."""
    return [t for t in re.findall(r"[a-z]+(?:'[a-z]+)?", text.lower())]


def main():
    units = json.loads(subprocess.run(['node', '-e', DUMP], cwd=ROOT, capture_output=True, text=True, check=True).stdout)
    top1000 = set(top_n_list('en', 1000))
    top3000 = set(top_n_list('en', 3000))
    rows = []
    for u in units:
        words = u['words']
        text_words = sum(len(t.split()) for t in u['texts'])
        rows.append({
            'unit': u['id'],
            'words': len(words),
            'top1000': round(sum(w in top1000 for w in words) / len(words), 2) if words else None,
            'family1000': round(sum(family(w, top1000) is not None for w in words) / len(words), 2) if words else None,
            'top3000': round(sum(w in top3000 for w in words) / len(words), 2) if words else None,
            'zipf_median': round(sorted(zipf_frequency(w, 'en') for w in words)[len(words) // 2], 2) if words else None,
            'heart': len(u['heart']), 'contrasts': u['contrasts'], 'sentences': u['sentences'],
            'texts': len(u['texts']), 'text_words': text_words, 'signs': u['signs'], 'forms': u['forms']
        })
    later = [w for u in units if u['id'] >= 3 for w in u['words']]
    # Running words (lexical coverage): every word a learner reads in sentences and texts, names excluded.
    names = {n.lower() for u in units for n in u['names']} | {'mr', 'mrs', 'dr'}
    running = [t for u in units for s in u['running'] for t in tokens(s) if t not in names]
    summary = {
        'units': len(units),
        'words': sum(len(u['words']) for u in units),
        'heart_words': sum(len(u['heart']) for u in units),
        'texts': sum(len(u['texts']) for u in units),
        'signs': sum(u['signs'] for u in units),
        'top1000_from_unit3': round(sum(w in top1000 for w in later) / len(later), 2),
        'top3000_from_unit3': round(sum(w in top3000 for w in later) / len(later), 2),
        'family1000_from_unit3': round(sum(family(w, top1000) is not None for w in later) / len(later), 2),
        'family3000_from_unit3': round(sum(family(w, top3000) is not None for w in later) / len(later), 2),
        'running_words': len(running),
        'running_family1000': round(sum(family(t, top1000) is not None for t in running) / len(running), 2),
        'running_family3000': round(sum(family(t, top3000) is not None for t in running) / len(running), 2),
        'frequency_source': 'wordfreq top_n_list("en") (proxy for the NGSL)'
    }
    out = {'summary': summary, 'units': rows}
    (ROOT / 'tools' / 'content' / 'metrics.json').write_text(json.dumps(out, indent=1) + '\n')
    print(json.dumps(summary, indent=1))
    print('unit words top1000 family1000 top3000 zipf heart texts')
    for r in rows:
        print(f"{r['unit']:4d} {r['words']:5d} {str(r['top1000']):7s} {str(r['family1000']):10s} {str(r['top3000']):7s} {str(r['zipf_median']):5s} {r['heart']:5d} {r['texts']:5d}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
