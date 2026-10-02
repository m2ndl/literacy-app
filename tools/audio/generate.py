#!/usr/bin/env python3
"""Generate the app's audio clips with Kokoro-82M (Apache-2.0) and check them.

Reads tools/audio/clips.json (from build-manifest.mjs) and writes:
  audio/<voice>/<kind>/<slug>.mp3   MP3, mono, 24 kHz, 48 kbps (plays on iOS and Android)
  audio/manifest.json               clips that exist, with duration (ms) and a content hash
  tools/audio/qa-report.json        automated quality checks

Voices: f = af_heart (main), m = am_michael (second talker), fs = af_heart slowed to 0.8x,
f2 and m2 = extra talkers for ear training (chosen with compare-voices.py).
Made-up words for the placement test ("p" clips) are synthesised from phonemes built from their letters.

Isolated speech sounds ("ph" clips) cannot be synthesised directly (a lone consonant comes out
as vowel-like noise), so each sound is cut out of whole words at acoustic landmarks (frication,
voicing, loudness). Several source words are tried per sound; each cut is glued into test words
(p + e + n) and a speech recogniser must hear the word. The best cut is kept; a sound with no
good cut is left out and the app teaches it through its keyword instead.

Usage: see tools/audio/README.md
"""
import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parents[2]
TOOLS = ROOT / 'tools' / 'audio'
OUT = ROOT / 'audio'
SR = 24000
# voice id -> (Kokoro voice, tempo). Slow clips are normal speech time-stretched (pitch kept),
# because Kokoro's own slow speed adds a short "uh" before the word.
VOICES = {'f': ('af_heart', 1.0), 'm': ('am_michael', 1.0), 'fs': ('af_heart', 0.8),
          'f2': ('af_sarah', 1.0), 'm2': ('am_fenrir', 1.0)}
PIPELINE_VERSION = '2'  # bump to force regeneration of everything

# --- pronunciation fixes (misaki US phonemes) ----------------------------------------------
# Kokoro's US lexicon uses /ɔ/ in dog, long, off...; the app teaches short o as /ɑ/ (a common,
# cot-caught-merged American accent), so single-o words are normalised to /ɑ/.
SHORT_O = re.compile(r'^[b-df-hj-np-tv-z]*o[b-df-hj-np-tv-z]+$')
NAME_PHONEMES = {'Ali': 'ˈɑli', 'Sara': 'sˈɑɹə'}
LETTER_PHONEMES = {'a': 'ˈA', 'i': 'ˈI'}

# --- isolated sounds -------------------------------------------------------------------------
# Candidate source words (explicit stressed phonemes) and the cut method for each sound.
PHONEME_CANDIDATES = {
    's': [('sˈʌn', 'frication'), ('sˈæt', 'frication'), ('sˈɪt', 'frication')],
    'f': [('fˈæn', 'frication'), ('fˈɪt', 'frication')],
    'sh': [('ʃˈɪp', 'frication'), ('ʃˈɑp', 'frication')],
    'th': [('θˈɪn', 'frication'), ('θˈɪk', 'frication')],
    'ch': [('ʧˈɪp', 'frication'), ('ʧˈɑp', 'frication')],
    'h': [('hˈæt', 'initial-weak'), ('hˈɑt', 'initial-weak')],
    'p': [('pˈæn', 'stop'), ('pˈɪn', 'stop'), ('pˈɑt', 'stop')],
    't': [('tˈɑp', 'stop'), ('tˈɪp', 'stop'), ('tˈæp', 'stop')],
    'k': [('kˈæt', 'stop'), ('kˈɪt', 'stop')],
    'b': [('bˈʌs', 'voiced-stop'), ('bˈæd', 'voiced-stop')],
    'd': [('dˈɑt', 'voiced-stop'), ('dˈæd', 'voiced-stop')],
    'g': [('ɡˈæs', 'voiced-stop'), ('ɡˈɑt', 'voiced-stop')],
    'jh': [('ʤˈɑb', 'voiced-stop'), ('ʤˈɛt', 'voiced-stop')],
    'm': [('mˈæp', 'initial-nasal'), ('mˈɑp', 'initial-nasal')],
    'n': [('nˈæp', 'initial-nasal'), ('nˈɛt', 'initial-nasal')],
    'l': [('lˈæp', 'initial-weak-4'), ('lˈɪp', 'initial-nasal'), ('ˈɪl', 'final-drop')],
    'r': [('ɹˈɛd', 'initial-weak-4'), ('ɹˈæt', 'initial-weak-4'), ('hˈɜɹ', 'post-voice')],
    'z': [('zˈɪp', 'initial-voiced-fricative'), ('zˈæp', 'initial-voiced-fricative')],
    'v': [('vˈæn', 'initial-weak'), ('vˈɛt', 'initial-weak')],
    'w': [('wˈɛt', 'glide'), ('wˈɪn', 'glide')],
    'y': [('jˈɛs', 'glide'), ('jˈɛt', 'glide')],
    'kw': [('kwˈɪt', 'glide'), ('kwˈɪk', 'glide')],
    'ks': [('bˈɑks', 'final'), ('sˈɪks', 'final')],
    'ng': [('sˈɪŋ', 'final-drop'), ('lˈɑŋ', 'final-drop')],
    'ngk': [('ˈɪŋk', 'final-drop'), ('pˈɪŋk', 'final-drop')],
    # Vowels: cut from words, or synthesised alone ("whole"); the blend test picks the clearest.
    'ae': [('ˈæt', 'vowel'), ('kˈæt', 'vowel'), ('pˈæt', 'vowel'), ('ˈæ', 'whole')],
    'ih': [('ˈɪt', 'vowel'), ('pˈɪt', 'vowel'), ('sˈɪt', 'vowel'), ('kˈɪt', 'vowel'), ('tˈɪp', 'vowel'),
           ('ˈɪ', 'whole'), ('ʔˈɪ', 'whole'), ('ˈɪp', 'vowel'), ('ˈɪk', 'vowel')],
    'eh': [('ˈɛʧ', 'vowel'), ('pˈɛt', 'vowel'), ('sˈɛt', 'vowel'), ('tˈɛk', 'vowel'), ('ˈɛ', 'whole')],
    'uh': [('ˈʌp', 'vowel'), ('kˈʌp', 'vowel'), ('sˈʌk', 'vowel'), ('tˈʌk', 'vowel'), ('ˈʌ', 'whole')],
    'aa': [('ˈɑks', 'vowel'), ('pˈɑt', 'vowel'), ('tˈɑp', 'vowel'), ('ˈɑ', 'whole')],
    # The model renders /ð/ like a short [d]; the app teaches it through its keyword ("this").
    'dh': [],
}
CONTINUANTS = {'s', 'f', 'sh', 'th', 'm', 'n', 'l', 'r', 'z', 'v', 'ng'}
VOWELS = {'ae', 'ih', 'eh', 'uh', 'aa'}
# Words glued together from cut sounds; the recogniser must hear the word.
BLEND_WORDS = {
    'pan': ['p', 'ae', 'n'], 'cat': ['k', 'ae', 't'], 'hat': ['h', 'ae', 't'], 'sat': ['s', 'ae', 't'], 'bad': ['b', 'ae', 'd'],
    'map': ['m', 'ae', 'p'], 'tap': ['t', 'ae', 'p'], 'dad': ['d', 'ae', 'd'],
    'hot': ['h', 'aa', 't'], 'pot': ['p', 'aa', 't'], 'top': ['t', 'aa', 'p'], 'box': ['b', 'aa', 'ks'], 'dog': ['d', 'aa', 'g'],
    'not': ['n', 'aa', 't'],
    'pin': ['p', 'ih', 'n'], 'sit': ['s', 'ih', 't'], 'tip': ['t', 'ih', 'p'], 'big': ['b', 'ih', 'g'], 'kit': ['k', 'ih', 't'],
    'fish': ['f', 'ih', 'sh'],
    'pen': ['p', 'eh', 'n'], 'ten': ['t', 'eh', 'n'], 'bed': ['b', 'eh', 'd'], 'net': ['n', 'eh', 't'], 'get': ['g', 'eh', 't'],
    'set': ['s', 'eh', 't'],
    'cup': ['k', 'uh', 'p'], 'bus': ['b', 'uh', 's'], 'sun': ['s', 'uh', 'n'], 'cut': ['k', 'uh', 't'], 'hut': ['h', 'uh', 't'],
    'but': ['b', 'uh', 't'],
    'fan': ['f', 'ae', 'n'], 'fat': ['f', 'ae', 't'], 'ship': ['sh', 'ih', 'p'], 'shop': ['sh', 'aa', 'p'],
    'thin': ['th', 'ih', 'n'], 'thick': ['th', 'ih', 'k'], 'chip': ['ch', 'ih', 'p'], 'chop': ['ch', 'aa', 'p'],
    'gas': ['g', 'ae', 's'], 'got': ['g', 'aa', 't'], 'jet': ['jh', 'eh', 't'], 'job': ['jh', 'aa', 'b'],
    'mad': ['m', 'ae', 'd'], 'nap': ['n', 'ae', 'p'], 'lap': ['l', 'ae', 'p'], 'lot': ['l', 'aa', 't'],
    'red': ['r', 'eh', 'd'], 'rat': ['r', 'ae', 't'], 'zip': ['z', 'ih', 'p'], 'zap': ['z', 'ae', 'p'],
    'van': ['v', 'ae', 'n'], 'vet': ['v', 'eh', 't'], 'wet': ['w', 'eh', 't'], 'win': ['w', 'ih', 'n'],
    'yes': ['y', 'eh', 's'], 'yet': ['y', 'eh', 't'], 'quit': ['kw', 'ih', 't'], 'quick': ['kw', 'ih', 'k'],
    'six': ['s', 'ih', 'ks'], 'sing': ['s', 'ih', 'ng'], 'long': ['l', 'aa', 'ng'], 'pink': ['p', 'ih', 'ngk'],
    'bank': ['b', 'ae', 'ngk'],
}
PASS_SCORE = {'vowel': 0.6, 'consonant': 0.5}
# Acoustic sanity checks for cut consonants: voiced share and spectral centroid (Hz) ranges.
CONSONANT_CHECKS = {
    's': {'voiced_max': 0.3, 'centroid_min': 7000}, 'sh': {'voiced_max': 0.3, 'centroid_min': 3000, 'centroid_max': 7800},
    'f': {'voiced_max': 0.4}, 'th': {'voiced_max': 0.4}, 'h': {'voiced_max': 0.7}, 'ch': {'voiced_max': 0.4, 'centroid_min': 1500},
    'p': {'voiced_max': 0.6}, 't': {'voiced_max': 0.6}, 'k': {'voiced_max': 0.6}, 'ks': {'centroid_min': 2500},
    'm': {'voiced_min': 0.6, 'centroid_max': 1200}, 'n': {'voiced_min': 0.6, 'centroid_max': 1200},
    'ng': {'voiced_min': 0.6, 'centroid_max': 1200}, 'l': {'voiced_min': 0.6, 'centroid_max': 1500},
    'r': {'voiced_min': 0.6}, 'z': {'voiced_min': 0.5, 'centroid_min': 1000}, 'v': {'voiced_min': 0.5},
}


# --- signal helpers ----------------------------------------------------------------------------
def sha(text):
    return hashlib.sha1(text.encode('utf-8')).hexdigest()[:10]


def frames_db(a, hop=0.005, win=0.02):
    h, w = int(SR * hop), int(SR * win)
    n = max(1, 1 + (len(a) - w) // h)
    return np.array([20 * np.log10(np.sqrt(np.mean(a[i * h:i * h + w] ** 2)) + 1e-9) for i in range(n)]), h


def band_ratio(a, cut, hop=0.005, win=0.02):
    """Share of energy above `cut` Hz in each frame."""
    h, w = int(SR * hop), int(SR * win)
    n = max(1, 1 + (len(a) - w) // h)
    hi = np.fft.rfftfreq(w, 1 / SR) >= cut
    win_fn = np.hanning(w)
    out = np.empty(n)
    for i in range(n):
        seg = a[i * h:i * h + w]
        if len(seg) < w:
            seg = np.pad(seg, (0, w - len(seg)))
        spec = np.abs(np.fft.rfft(seg * win_fn)) ** 2
        out[i] = spec[hi].sum() / (spec.sum() + 1e-12)
    return out


def voiced_mask(a, hop=0.005):
    import parselmouth
    p = parselmouth.Sound(a.astype(np.float64), sampling_frequency=SR).to_pitch_ac(time_step=hop, pitch_floor=75, pitch_ceiling=500)
    return p.xs(), p.selected_array['frequency'] > 0


def runs(mask):
    out, st = [], None
    for i, m in enumerate(list(mask) + [False]):
        if m and st is None:
            st = i
        elif not m and st is not None:
            out.append((st, i - 1))
            st = None
    return out


def trim_silence(a, thr_db=-50, pad=0.03):
    peak = np.max(np.abs(a)) + 1e-9
    idx = np.where(np.abs(a) > peak * 10 ** (thr_db / 20))[0]
    if not len(idx):
        return a
    p = int(SR * pad)
    return a[max(0, idx[0] - p):min(len(a), idx[-1] + p)]


def fade(a, fin=0.008, fout=0.02):
    a = a.copy()
    n_in, n_out = min(len(a), int(SR * fin)), min(len(a), int(SR * fout))
    if n_in:
        a[:n_in] *= np.linspace(0, 1, n_in)
    if n_out:
        a[-n_out:] *= np.linspace(1, 0, n_out)
    return a


def normalise(a, target_rms_db=-20.0, peak_db=-1.0):
    """Match loudness by RMS over active frames, keeping peaks below peak_db."""
    db, h = frames_db(a)
    active = np.where(db > db.max() - 30)[0]
    rms = np.sqrt(np.mean(np.concatenate([a[i * h:i * h + h] for i in active]) ** 2) + 1e-12)
    b = a * (10 ** (target_rms_db / 20) / (rms + 1e-9))
    peak = np.max(np.abs(b)) + 1e-9
    if peak > 10 ** (peak_db / 20):
        b *= 10 ** (peak_db / 20) / peak
    return b.astype(np.float32)


def stretch(a, min_dur):
    """Lengthen short continuous sounds with ffmpeg's pitch-preserving atempo."""
    dur = len(a) / SR
    if dur >= min_dur:
        return a
    factor = max(0.5, dur / min_dur)
    with tempfile.TemporaryDirectory() as d:
        src, dst = os.path.join(d, 'in.wav'), os.path.join(d, 'out.wav')
        sf.write(src, a, SR)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-filter:a', f'atempo={factor:.3f}', dst], check=True)
        b, _ = sf.read(dst, dtype='float32')
    return b


def tempo(a, factor):
    """Change speed without changing pitch (ffmpeg atempo)."""
    with tempfile.TemporaryDirectory() as d:
        src, dst = os.path.join(d, 'in.wav'), os.path.join(d, 'out.wav')
        sf.write(src, a, SR)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-filter:a', f'atempo={factor:.3f}', dst], check=True)
        b, _ = sf.read(dst, dtype='float32')
    return b


def encode_mp3(a, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as d:
        src = os.path.join(d, 'in.wav')
        sf.write(src, a, SR)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-ac', '1', '-ar', str(SR),
                        '-c:a', 'libmp3lame', '-b:a', '48k', str(path)], check=True)


# --- synthesis -------------------------------------------------------------------------------
class Synth:
    def __init__(self, models):
        from kokoro_onnx import Kokoro
        from misaki import en, espeak
        self.k = Kokoro(str(Path(models) / 'kokoro-v1.0.onnx'), str(Path(models) / 'voices-v1.0.bin'))
        self.g2p = en.G2P(trf=False, british=False, fallback=espeak.EspeakFallback(british=False))

    def phonemes(self, text, kind):
        if kind == 'ln':
            return LETTER_PHONEMES.get(text) or self.g2p(text.upper())[0]
        if text in NAME_PHONEMES:
            return NAME_PHONEMES[text]
        _, tokens = self.g2p(text)
        out = []
        for t in tokens:
            ph = t.phonemes or ''
            if t.text in NAME_PHONEMES:
                ph = NAME_PHONEMES[t.text]
            elif SHORT_O.match(t.text.lower()):
                ph = ph.replace('ɔ', 'ɑ')
            out.append(ph + (' ' if t.whitespace else ''))
        return ''.join(out).strip()

    def say(self, phonemes, voice='af_heart', speed=1.0):
        a, sr = self.k.create(phonemes, voice=voice, speed=speed, is_phonemes=True)
        assert sr == SR, sr
        return np.asarray(a, dtype=np.float32)


def cut_sound(a, method):
    """Cut one speech sound out of a whole word. Returns (segment or None, info)."""
    a = trim_silence(a, -45, 0.0)
    db, h = frames_db(a)
    tf = lambda i: i * h / SR
    peak = db.max()
    seg = lambda t0, t1: a[max(0, int(t0 * SR)):min(len(a), int(t1 * SR))]
    if method == 'whole':
        return a, {}
    if method in ('frication', 'stop'):
        r = [x for x in runs(band_ratio(a, 2500) > 0.4) if x[1] - x[0] >= 2]  # first clear frication
        if not r:
            return None, {'error': 'no frication'}
        st, en = r[0]
        return seg(tf(st) - 0.01, tf(en) + 0.015 + (0.025 if method == 'stop' else 0)), {'start': round(tf(st), 3)}
    if method == 'voiced-stop':
        burst = next((i for i, d in enumerate(db) if d > peak - 25), 0)
        t0 = max(0.0, tf(burst) - 0.01)
        return seg(t0, t0 + 0.08), {'burst': round(t0, 3)}
    if method.startswith('initial-weak'):
        drop = 4 if method.endswith('-4') else 6
        end = next((i for i in range(4, len(db)) if db[i] > peak - drop), None)
        return (seg(0, tf(end) - 0.005), {'vowel_on': round(tf(end), 3)}) if end else (None, {'error': 'no vowel onset'})
    if method == 'initial-nasal':
        lf = 1.0 - band_ratio(a, 600)
        end = next((i for i in range(4, len(lf)) if lf[i] < 0.8), None)
        return (seg(0, tf(end) - 0.005), {'vowel_on': round(tf(end), 3)}) if end else (None, {'error': 'no vowel onset'})
    if method == 'initial-voiced-fricative':
        r = runs(band_ratio(a, 2500) > 0.25)
        return (seg(0, tf(r[0][1]) + 0.01), {'frication_end': round(tf(r[0][1]), 3)}) if r else (None, {'error': 'no frication'})
    times, voiced = voiced_mask(a)
    vr = runs(voiced)
    if method == 'vowel':
        if not vr:
            return None, {'error': 'no voicing'}
        st, en = max(vr, key=lambda x: x[1] - x[0])
        # skip the first 10 ms (breathy or consonant transition) and the last 15 ms (closure)
        return seg(times[st] + 0.01, times[en] - 0.015), {'on': round(times[st], 3)}
    if method == 'whole':
        return a, {}
    if method == 'glide':
        on = times[vr[0][0]] if vr else 0.0
        return seg(0, on + 0.11), {'on': round(on, 3)}
    if method == 'post-voice':
        return (seg(times[vr[0][0]], len(a) / SR), {}) if vr else (None, {'error': 'no voicing'})
    if method == 'final':
        return (seg(times[vr[-1][1]], len(a) / SR), {}) if vr else (None, {'error': 'no voicing'})
    if method == 'final-drop':
        top = int(np.argmax(db))
        drop = next((i for i in range(top, len(db)) if db[i] < peak - 6), None)
        return (seg(tf(drop), len(a) / SR), {'cons_on': round(tf(drop), 3)}) if drop else (None, {'error': 'no drop'})
    raise ValueError(method)


def consonant_features(a):
    _, v = voiced_mask(a)
    spec = np.abs(np.fft.rfft(a * np.hanning(len(a)))) ** 2
    f = np.fft.rfftfreq(len(a), 1 / SR)
    return {'voiced': round(float(v.mean()) if len(v) else 0.0, 2), 'centroid': int((spec * f).sum() / (spec.sum() + 1e-12))}


def consonant_ok(ph, feats):
    rule = CONSONANT_CHECKS.get(ph, {})
    return not (('voiced_max' in rule and feats['voiced'] > rule['voiced_max'])
                or ('voiced_min' in rule and feats['voiced'] < rule['voiced_min'])
                or ('centroid_min' in rule and feats['centroid'] < rule['centroid_min'])
                or ('centroid_max' in rule and feats['centroid'] > rule['centroid_max']))


def finish_sound(seg, ph):
    # Continuous consonants are lengthened so learners can hear them; short (lax) vowels are
    # kept at their natural length, because stretching /ɪ/ or /ʌ/ makes them sound like other vowels.
    if ph in CONTINUANTS:
        seg = stretch(seg, 0.30)
    return normalise(fade(seg))


# --- speech recognition ----------------------------------------------------------------------
class Checker:
    def __init__(self, models):
        import sherpa_onnx
        d = Path(models) / 'sherpa-onnx-whisper-small.en'
        self.rec = sherpa_onnx.OfflineRecognizer.from_whisper(
            encoder=str(d / 'small.en-encoder.int8.onnx'), decoder=str(d / 'small.en-decoder.int8.onnx'),
            tokens=str(d / 'small.en-tokens.txt'), language='en', task='transcribe', num_threads=4)

    def text(self, a):
        pad = np.zeros(int(SR * 0.5), dtype=np.float32)
        s = self.rec.create_stream()
        s.accept_waveform(SR, np.concatenate([pad, a, pad]))
        self.rec.decode_stream(s)
        return s.result.text.strip()


DIGITS = {'0': 'zero', '1': 'one', '2': 'two', '6': 'six', '10': 'ten'}
HOMOPHONES = {'I': {'i', 'eye', 'aye'}, 'a': {'a', 'uh'}, 'two': {'two', 'to', 'too'}, 'one': {'one', 'won'},
              'so': {'so', 'sew'}, 'be': {'be', 'bee'}, 'you': {'you', 'u'}, 'there': {'there', 'their', 'theyre'},
              'which': {'which', 'witch'}, 'were': {'were', 'whirr'}, 'Sara': {'sara', 'sarah'},
              'Ali': {'ali', 'ollie', 'olly', 'alley'}, 'Ken': {'ken'}, 'yes': {'yes', 'yeah'}, 'in': {'in', 'inn'},
              'sun': {'sun', 'son'}, 'not': {'not', 'knot'}, 'red': {'red', 'read'}, 'add': {'add', 'ad'},
              'bill': {'bill', 'bil'}, 'ink': {'ink', 'inc'}, 'him': {'him', 'hymn'}, 'tax': {'tax', 'tacks'},
              'mom': {'mom', 'mum', 'mam'}, 'whale': {'whale', 'wail'}, 'quiz': {'quiz', 'quizz'},
              # ear-training words
              'cot': {'cot', 'caught'}, 'led': {'led', 'lead'}, 'peck': {'peck', 'pec'}, 'mat': {'mat', 'matte'},
              'vary': {'vary', 'very'}, 'wail': {'wail', 'whale'}, 'veil': {'veil', 'vale'}, 'yolk': {'yolk', 'yoke'},
              'jell': {'jell', 'gel'}, 'wheel': {'wheel', 'well'}, 'while': {'while', 'wile'}, 'wine': {'wine', 'whine'},
              'few': {'few', 'phew'}, 'cash': {'cash', 'cache'}, 'shoe': {'shoe', 'shoo'}, 'cheap': {'cheap', 'cheep'},
              'rung': {'rung', 'wrung'}, 'son': {'son', 'sun'}, 'yacht': {'yacht', 'yot'}, 'yaw': {'yaw', 'yo'},
              'pun': {'pun'}, 'ban': {'ban'}, 'kin': {'kin'}, 'pop': {'pop'}, 'vile': {'vile', 'vial'}}


def norm_words(t):
    t = re.sub(r'\d+', lambda m: ' ' + DIGITS.get(m.group(0), m.group(0)) + ' ', t)
    return re.sub(r"[^a-z ]", '', t.lower().replace('-', ' ')).split()


FILLERS = {'a', 'an', 'the', 'and', 'is', 'i', 'in', 'uh', 'um', 'oh', 'its', 'at'}


def single_word_ok(expected, heard, loose=False):
    got = norm_words(heard)
    # An isolated word often comes back with a filler ("A cat.", "and cut"): ignore those.
    if len(got) > 1 and expected.lower() not in FILLERS:
        got = [g for g in got if g not in FILLERS] or got
    alts = HOMOPHONES.get(expected, {expected.lower()})
    if len(got) != 1:
        return False
    g = got[0]
    if g in alts:
        return True
    if loose:  # glued sounds: tolerate a doubled last letter or an added final vowel ("mapp", "zippa")
        g2 = re.sub(r'(.)\1+', r'\1', re.sub(r'[aeo]$', '', g))
        return g2 in {re.sub(r'(.)\1+', r'\1', x) for x in alts}
    return False


def transcript_ok(expected, heard):
    want = norm_words(expected)
    if len(want) == 1:
        return single_word_ok(expected, heard)
    return norm_words(heard) == want


# --- isolated-sound selection ------------------------------------------------------------------
def build_sounds(synth, checker, report):
    """Pick the best cut for every sound. Returns {ph: audio}."""
    candidates = {}
    for ph, cands in PHONEME_CANDIDATES.items():
        candidates[ph] = []
        for src, method in cands:
            seg, info = cut_sound(synth.say(src), method)
            if seg is None or len(seg) < SR * 0.04:
                continue
            if ph not in VOWELS:
                feats = consonant_features(seg)
                if not consonant_ok(ph, feats):
                    continue
                info.update(feats)
            candidates[ph].append({'src': src, 'method': method, 'audio': finish_sound(seg, ph), 'info': info})
    current = {ph: c[0] for ph, c in candidates.items() if c}
    gap = np.zeros(int(SR * 0.012), dtype=np.float32)
    cache = {}

    def heard(word, parts, choice):
        key = (word,) + tuple(choice[p]['src'] + choice[p]['method'] for p in parts)
        if key not in cache:
            audio = np.concatenate([x for p in parts for x in (choice[p]['audio'], gap)])
            cache[key] = checker.text(audio)
        return cache[key]

    def score(ph, choice):
        tests = [(w, parts) for w, parts in BLEND_WORDS.items() if ph in parts and all(p in choice for p in parts)]
        if not tests:
            return 1.0, []
        results = [(w, heard(w, parts, choice)) for w, parts in tests]
        ok = [single_word_ok(w, h, loose=True) for w, h in results]
        return sum(ok) / len(ok), [{'word': w, 'heard': h, 'ok': k} for (w, h), k in zip(results, ok)]

    for _ in range(2):  # two rounds of coordinate ascent
        for ph, cands in candidates.items():
            best, best_score = current.get(ph), -1
            for cand in cands:
                trial = dict(current, **{ph: cand})
                s, _ = score(ph, trial)
                if s > best_score:
                    best, best_score = cand, s
            if best:
                current[ph] = best
    sounds = {}
    for ph in PHONEME_CANDIDATES:
        if ph not in current:
            report['sounds'][ph] = {'accepted': False, 'reason': 'no usable cut; taught through its keyword'}
            continue
        s, detail = score(ph, current)
        kind = 'vowel' if ph in VOWELS else 'consonant'
        accepted = s >= PASS_SCORE[kind]
        report['sounds'][ph] = {'accepted': accepted, 'score': round(s, 2), 'source': current[ph]['src'],
                                'method': current[ph]['method'], 'tests': detail, **current[ph]['info']}
        print(f"sound {ph:4s} {'OK ' if accepted else 'NO '} {s:.2f} from {current[ph]['src']}", flush=True)
        if accepted:
            sounds[ph] = current[ph]['audio']
    return sounds


# --- main ----------------------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--models', required=True, help='folder with kokoro-v1.0.onnx, voices-v1.0.bin, sherpa-onnx-whisper-small.en/')
    ap.add_argument('--only', choices=['ph', 'ln', 'w', 's', 'p'], help='only (re)generate this kind of clip')
    ap.add_argument('--force', action='store_true', help='regenerate even if unchanged')
    ap.add_argument('--recheck', action='store_true', help='only re-score the stored transcripts in qa-report.json')
    args = ap.parse_args()
    if args.recheck:
        report_path = TOOLS / 'qa-report.json'
        report = json.loads(report_path.read_text())
        clips = {c['key']: c for c in json.loads((TOOLS / 'clips.json').read_text())['clips']}
        for k, r in report['asr'].items():
            r['ok'] = transcript_ok(clips[k.split('@')[0]]['text'], r['heard'])
        report['asr_summary'] = {'checked': len(report['asr']), 'failed': sorted(k for k, r in report['asr'].items() if not r['ok'])}
        report_path.write_text(json.dumps(report, ensure_ascii=False, indent=1, sort_keys=True) + '\n')
        print(f"ASR checked {len(report['asr'])}, flagged {len(report['asr_summary']['failed'])}")
        return 0

    clips = json.loads((TOOLS / 'clips.json').read_text())['clips']
    manifest_path = OUT / 'manifest.json'
    old = json.loads(manifest_path.read_text()) if manifest_path.exists() else {'clips': {}}
    report_path = TOOLS / 'qa-report.json'
    old_report = json.loads(report_path.read_text()) if report_path.exists() else {}
    synth = Synth(args.models)
    checker = Checker(args.models)
    manifest = {'version': 1, 'format': 'mp3', 'voices': {k: f'{v[0]}@{v[1]}' for k, v in VOICES.items()}, 'clips': {}}
    report = {'pipeline': PIPELINE_VERSION, 'sounds': old_report.get('sounds', {}), 'asr': old_report.get('asr', {}),
              'files': 0}

    sounds_hash = sha(PIPELINE_VERSION + json.dumps(PHONEME_CANDIDATES, ensure_ascii=False) + json.dumps(BLEND_WORDS))
    redo_sounds = args.force or args.only in (None, 'ph') and old.get('sounds') != sounds_hash
    sounds = None
    if redo_sounds:
        report['sounds'] = {}
        sounds = build_sounds(synth, checker, report)
    manifest['sounds'] = sounds_hash

    for c in clips:
        prev_entry = old['clips'].get(c['key'], {})
        if args.only and c['kind'] != args.only:
            if prev_entry:
                manifest['clips'][c['key']] = prev_entry
            continue
        if c['kind'] == 'ph':
            if sounds is None:  # unchanged: keep previous files
                if prev_entry:
                    manifest['clips'][c['key']] = prev_entry
                continue
            path = OUT / 'f' / 'ph' / f"{c['slug']}.mp3"
            if c['text'] not in sounds:
                path.unlink(missing_ok=True)
                continue
            a = sounds[c['text']]
            encode_mp3(a, path)
            manifest['clips'][c['key']] = {'f': {'d': int(round(len(a) / SR * 1000)), 'h': sha(sounds_hash + c['key'])}}
            report['files'] += 1
            continue
        entry = {}
        for v in c['voices']:
            voice, speed = VOICES[v]
            source = c['ipa'] if c['kind'] == 'p' else synth.phonemes(c['text'], c['kind'])
            h = sha('|'.join([PIPELINE_VERSION, c['key'], v, voice, str(speed) if speed == 1.0 else f'tempo{speed}', source]))
            path = OUT / v / c['kind'] / f"{c['slug']}.mp3"
            prev = prev_entry.get(v)
            if prev and prev.get('h') == h and path.exists() and not args.force:
                entry[v] = prev
                continue
            a = trim_silence(synth.say(source, voice, 1.0), -50, 0.03)
            if speed != 1.0:
                a = tempo(a, speed)
            a = fade(a, 0.005, 0.03)
            # Slow clips are time-stretched copies of the checked main clip, so only f and m are re-checked.
            if c['kind'] in ('w', 's') and v != 'fs':
                heard = checker.text(a)
                ok = transcript_ok(c['text'], heard)
                report['asr'][f"{c['key']}@{v}"] = {'heard': heard, 'ok': ok}
            else:
                report['asr'].pop(f"{c['key']}@{v}", None)
            a = normalise(a)
            encode_mp3(a, path)
            entry[v] = {'d': int(round(len(a) / SR * 1000)), 'h': h}
            report['files'] += 1
            print(f"{c['key']:44s} {v:3s} {entry[v]['d']:5d} ms", flush=True)
        if entry:
            manifest['clips'][c['key']] = entry

    asr = report['asr']
    report['asr_summary'] = {'checked': len(asr), 'failed': sorted(k for k, r in asr.items() if not r['ok'])}
    # Ear-training tokens the recogniser did not hear as the right word are not used by the app:
    # in perception training, one wrong token teaches the wrong category.
    manifest['avoid'] = sorted(f"{c['key']}@{v}" for c in clips if 'f2' in c['voices'] for v in c['voices']
                               if not asr.get(f"{c['key']}@{v}", {}).get('ok', True))
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, sort_keys=True, separators=(',', ':')) + '\n')
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=1, sort_keys=True) + '\n')
    accepted = sum(1 for s in report['sounds'].values() if s.get('accepted'))
    print(f"\nclips: {len(manifest['clips'])}; sounds accepted: {accepted}/{len(report['sounds'])}; "
          f"ASR checked {len(asr)}, failed {len(report['asr_summary']['failed'])}; ear-training tokens avoided {len(manifest['avoid'])}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
