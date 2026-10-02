# Audio build

All speech in the app is **generated automatically** (no human recording) and committed under `audio/`.
The generator is re-run whenever the curriculum in `data.js` changes.

| | |
|---|---|
| Engine | [Kokoro-82M v1.0](https://github.com/hexgrad/kokoro) via [`kokoro-onnx`](https://github.com/thewh1teagle/kokoro-onnx) (ONNX Runtime, CPU). The model and voices are Apache-2.0. |
| Accent | American English. Short *o* is normalised to /ɑ/ (as in many US accents), e.g. *dog, long, off*. |
| Voices | `f` = af_heart (main), `m` = am_michael (second talker for words), `fs` = af_heart slowed to 0.8× with a pitch-preserving time-stretch (the "slow" button). Kokoro's own slow speed adds a short "uh" before the word, so it is not used. |
| Format | MP3, mono, 24 kHz, 48 kbps. Plays on every iPhone and Android browser. |
| Size | ≈ 6 MB for Phase 1 (≈ 900 files). Cached per unit by the service worker. |

## What gets generated

`node tools/audio/build-manifest.mjs` lists every clip the curriculum needs in `tools/audio/clips.json`:

- **`ph`**: one speech sound per grapheme (e.g. `ph:ae`, the vowel in *pan*).
- **`ln`**: letter names (*ay, bee, see* …), used for spelling.
- **`w`**: words, keywords and heart words.
- **`s`**: sentences and text sentences.

The app finds each clip through `audio/manifest.json`, which records each clip's duration and a content hash. The hash is added to the URL so the cache updates when a clip changes.

## Single speech sounds

A TTS model cannot say a lone consonant (it produces vowel-like noise), so each sound is cut out of whole words at acoustic landmarks:

- the frication noise of *s, f, sh, ch* and the aspirated stops;
- the start of the vowel for *m, n, v, z*;
- the longest voiced stretch for vowels;
- the drop in loudness for word-final *l, ng, nk*.

For every sound, several source words are tried. Each cut is then glued into test words (e.g. **p + e + n**) and the speech recogniser must hear the right word (the **blend test**). The best cut is kept.

A sound that never passes is left out. The app then teaches it through its keyword: "the first sound in *three*". Currently **29 of 31 sounds pass**; *th* (/θ/, /ð/) is taught through *three* and *this*.

## Quality checks

- Every word and sentence is transcribed back with Whisper small.en (via sherpa-onnx). The results are in `tools/audio/qa-report.json`.
- Isolated words are hard for any recogniser: it adds "a"/"the", prefers names (*Ollie* for *Ali*), or picks a more frequent neighbour (*Ben* for *bin*). So read the failure list as a list of clips to listen to, not as errors.
- **Voice choice.** Ten American Kokoro voices were compared on 44 minimal-pair words (isolated and in a carrier sentence). The two best were then compared on all 189 curriculum words: af_heart was recognised exactly for 154 and af_sarah for 155. With no real difference in clarity, af_heart was kept because it is rated the most natural voice.
- The sound cuts also pass acoustic sanity checks: voicing share and spectral centre.

## Re-generating

Needs Python 3.11, ffmpeg and about 1.7 GB of models. Hugging Face is not needed: the weights are GitHub release assets.

```bash
python3 -m venv .venv && . .venv/bin/activate
pip install kokoro-onnx==0.6.1 misaki==0.9.4 num2words spacy phonemizer-fork espeakng-loader soundfile sherpa-onnx praat-parselmouth numpy
pip install https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.8.0/en_core_web_sm-3.8.0-py3-none-any.whl
mkdir -p models && cd models
curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
curl -L https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-whisper-small.en.tar.bz2 | tar xj
cd ..
node tools/audio/build-manifest.mjs
python tools/audio/generate.py --models models          # only new or changed clips
python tools/audio/generate.py --models models --force  # everything
npm test                                                # includes the audio coverage test
```

Licences of the tools: kokoro-onnx (MIT), Kokoro model and voices (Apache-2.0), misaki (Apache-2.0), sherpa-onnx (Apache-2.0), Whisper (MIT). praat-parselmouth and espeak-ng (GPL-3.0) are only used at build time and are not distributed with the app.
