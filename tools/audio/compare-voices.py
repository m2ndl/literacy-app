#!/usr/bin/env python3
"""Choose the two extra ear-training voices (f2, m2): which Kokoro voices does a speech recogniser
understand best on the perception words? Writes tools/audio/voice-comparison.json.

Usage: python tools/audio/compare-voices.py --models models
"""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from generate import Synth, Checker, transcript_ok, trim_silence, TOOLS  # noqa: E402

# Kokoro v1.0 American voices with the best published quality grades, besides the two already used.
CANDIDATES = ['af_bella', 'af_sarah', 'af_nicole', 'am_fenrir', 'am_puck']


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--models', required=True)
    args = ap.parse_args()
    clips = [c for c in json.loads((TOOLS / 'clips.json').read_text())['clips'] if 'f2' in c['voices']]
    synth = Synth(args.models)
    checker = Checker(args.models)
    results = {}
    for voice in CANDIDATES:
        heard = {}
        for c in clips:
            a = trim_silence(synth.say(synth.phonemes(c['text'], 'w'), voice, 1.0), -50, 0.03)
            heard[c['text']] = checker.text(a)
        ok = sorted(w for w, h in heard.items() if transcript_ok(w, h))
        results[voice] = {'recognised': len(ok), 'of': len(clips),
                          'missed': {w: h for w, h in heard.items() if w not in ok}}
        print(f'{voice}: {len(ok)}/{len(clips)}', flush=True)
    (TOOLS / 'voice-comparison.json').write_text(json.dumps(results, ensure_ascii=False, indent=1, sort_keys=True) + '\n')
    return 0


if __name__ == '__main__':
    sys.exit(main())
