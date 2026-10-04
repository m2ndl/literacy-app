# Pedagogical Review and Development Plan — لغتي الثانية (My Second Language)

**Purpose:** review the app as a literacy course and plan how to make it the best possible English reading app for **college-level EFL learners at CEFR pre-A1 whose first language is Arabic**.
**Audience:** the app owner, teachers who recommend the app, and developers.
**Status:** this document is the plan. Phases 1–4 (sections 12–15) and the follow-up in section 16 are implemented in this repository; Phase 4's benchmarks still need validating in a pilot. Phase 5 is a proposal.

Companion document: [`EVALUATION.md`](./EVALUATION.md) (technical/code review).

---

## Contents

1. [Summary](#1-summary)
2. [Who the learners are](#2-who-the-learners-are)
3. [Audit of the previous version](#3-audit-of-the-previous-version)
4. [Design principles](#4-design-principles)
5. [Precedents we borrow from](#5-precedents-we-borrow-from)
6. [Scope and sequence](#6-scope-and-sequence)
7. [Activities, feedback and error correction](#7-activities-feedback-and-error-correction)
8. [Audio](#8-audio)
9. [Assessment inside the app](#9-assessment-inside-the-app)
10. [How to evaluate the app](#10-how-to-evaluate-the-app)
11. [Roadmap](#11-roadmap)
12. [Phase 1 — what this release changes](#12-phase-1--what-this-release-changes)
13. [Phase 2 — the learner model](#13-phase-2--the-learner-model)
14. [Phase 3 — the full course (Stages 3–5)](#14-phase-3--the-full-course-stages-35)
15. [Phase 4 — fluency and assessment](#15-phase-4--fluency-and-assessment)
16. [After Phase 4: gaps closed and a safety net](#16-after-phase-4-gaps-closed-and-a-safety-net)
17. [References](#17-references)

---

## 1. Summary

**The previous version's problems.** It was a well-built offline web app, but as a reading course it had serious problems:
- It played letter **names** ("bee", "see") where it claimed to teach letter **sounds**.
- About **30% of the words used could not be sounded out** with what had been taught (71% in the "review" unit).
- Vocabulary was rare or childish, and words had no meaning support.
- Wrong options were random instead of diagnostic.
- Practice was very short and nothing was reviewed.
- Feedback said only right or wrong.
- There was no spelling, no connected reading and no assessment.

**The plan rebuilds the course around five ideas:**
1. **Sound first, systematic, cumulative.** Teach letter–sound correspondences explicitly, in an order designed for Arabic speakers. Only use words the learner can decode (or has been taught as "heart words").
2. **Meaning always.** Every English word comes with audio and its Arabic meaning. Words are chosen for usefulness to a college student, not for convenience.
3. **Target Arabic speakers' known difficulties.** These are vowel letters ("vowel blindness"), /p/–/b/, /f/–/v/, the short vowels, *ng*, consonant clusters, mirror-image letters and left-to-right reading. The tool is contrast practice with minimal pairs.
4. **Practice until accurate *and* fast, then keep reviewing.** Use spaced, mixed practice with explanatory feedback, and log errors so the app knows what each learner confuses.
5. **Evaluate it properly.** Use expert review against established rubrics, usability testing with real learners, and a pre/post/delayed learning study.

**Owner decisions behind this plan:**
- self-study use only (offline, no login);
- an American English pronunciation model;
- fully automated, high-quality audio that works on both iPhone and Android;
- a full progress reset when the new curriculum ships.

---

## 2. Who the learners are

**Profile.** Adults (≈18–25) in university foundation / preparatory-year programmes, whose English is at CEFR **pre-A1**. Two groups matter:

- **False beginners (the majority).** Years of school English. They usually know letter *names*, recognise some words by shape, and guess from the first letter. They skip vowels when reading and spelling. Their oral vocabulary is limited.
- **True beginners.** Little or no exposure. They need orientation to the Roman alphabet itself.

Both groups are **fully literate in Arabic**, and that matters. They already understand that letters stand for sounds, and they read and write fluently. They do not need to be taught *what reading is*. They need a new script, a new direction, a new sound system and a much less regular spelling system.

### What transfers from Arabic, and what interferes

| Area | What happens | Example | How the app responds |
|---|---|---|---|
| **Vowel letters** ("vowel blindness") | Arabic usually leaves short vowels unwritten, so readers attend to consonants and under-process English vowel letters (Ryan & Meara 1991; Hayes-Harb 2006; Alhaisoni et al. 2015). | *pen* read as *pin*; *bet* spelled *bt* | Vowel-focused blanks, minimal-pair listening, vowel highlighting, word chains (*pin → pen → pan*) |
| **Short vowels** /ɪ ɛ æ ʌ ɑ/ | Arabic has three short vowels; English has more | *pin/pen/pan*, *cut/cot/cat* | Contrasts introduced unit by unit; sound-discrimination training with several voices (Phase 2) |
| **/p/ vs /b/** | Arabic has no /p/ | *park* heard as *bark* | p taught first, b later with an explicit contrast; tip: "p is like ب with no voice and a puff of air" |
| **/f/ vs /v/**, **/w/ vs /v/** | Arabic has no /v/ | *van* → *fan*; *vet* → *wet* | Contrast pairs in unit 6 |
| **/ŋ/** (*sing*) | Speakers add a /g/ | *sing-g* | n/ŋ and ŋ/ŋk contrasts in unit 8 |
| **Consonant clusters** | Arabic syllables don't start with two consonants, so a vowel gets inserted | *street* → "istreet"; *stop* → "sitop" | Clusters postponed to Stage 3 and taught with "no extra vowel" practice |
| **Look-alike letters** | Right-to-left readers mirror shapes; print letters are new | *b/d/p/q*, *m/w*, *n/u* | Look-alike distractors; a font designed for beginning readers (Andika) |
| **Direction and case** | Right-to-left habit; Arabic has no capital letters | — | Orientation in unit 1; capital/small matching; when capitals are used |
| **Spelling** | Reliance on the consonant skeleton | *bt*, *sht* | Vowel-biased spelling tasks; dictation (Phase 2) |
| **Word order** | Arabic puts the adjective after the noun | *a car red* | Word-order sentence building (Phase 2) |
| **Sounds that help** | Arabic already has th (ث/ذ), sh (ش), j (ج), and in some dialects ch (تش) and g | — | Arabic "sound bridges" for familiar sounds; never Arabic spelling of English words |
| **Dialect differences** | Some Gulf dialects say ج like ي; Egyptian ج is /g/; some urban dialects replace th with t/s/d/z | *jet* ~ *yet* | j/y and th/t/s contrasts |

**What these learners need most** (Fender 2003; Martin 2024; Ibrahim 2018):
- accurate decoding that pays attention to vowels;
- fast word recognition;
- enough high-frequency vocabulary to make decoding meaningful.

The Simple View of Reading (Gough & Tunmer 1986) is a reminder that decoding without language comprehension yields nothing. Every decodable word should therefore be a word worth knowing, and its meaning must be supplied.

---

## 3. Audit of the previous version

| # | Finding | Why it matters |
|---|---|---|
| 1 | **Letter names played as "sounds".** `speak('b')` says "bee"; a lone `a` may be read as "uh", while the lesson says "tap a letter to hear its sound". Browser speech engines cannot produce isolated speech sounds. | Reading means mapping graphemes to phonemes. Names such as c "see", h "aitch", w "double-u" and y "why" mislead blending (Ehri 2014). |
| 2 | **Consonant–vowel "letter pairs"** (*ba, ti, zu, ix, qu*) used as listening items. | Speech engines read them unpredictably: as letter names, as words, even as a Roman numeral ("ix"). English open-syllable vowels also differ from the short vowels being taught. Onset–rime units and full blending are the stable units (Treiman 1985; Goswami & Bryant 1990). |
| 3 | **Words appear before their letters or spelling patterns are taught.** About 30% of distinct words (35 of 121) failed a decodability check; 10 of 14 (71%) in the review unit did. Examples: *sit* (unit 2, *s* taught in unit 5); *sad, Sara, red* (unit 4); *the, is, a, do* never taught; *film, bank, number, zero, taxi* use untaught patterns; the review unit brings in clusters and long vowels (*jump, next, prize, queen, brave*). | Forces guessing, the very habit false beginners must lose. Decodable practice is what drives self-teaching (Share 1995; Mesmer 2001). |
| 4 | **Vocabulary and tone.** Rare words (*cot, cop, rot, rod, lug, gut, dim, zap, zig, sis, wax*); a non-English word (*baba*); childish phrases (*a fun bug, a sad mama, the queen can jump*). The web-app manifest listed the app under "kids". | Adults need relevance and respect (Knowles et al. 2015). Decoding words one does not know is "barking at print". |
| 5 | **No meaning support for words**, and some translations were wrong (*baba is sad* ≠ أبي حزين; *a fun vet*). | Arabic translations are a fast, effective way to give beginners meaning (Laufer & Shmueli 1997; Hall & Cook 2012). |
| 6 | **Nothing targeted Arabic speakers' difficulties** (section 2). | These transfer effects are well documented (Ryan & Meara 1991; Hayes-Harb 2006; Fender 2003; Saigh & Schmitt 2012; Smith 2001). |
| 7 | **Random distractors.** For example, unit 1 "sound match" had 3 items with 3 options. | Minimal-pair contrasts build new sound categories and attention to vowels (Thomson 2018; McCandliss et al. 2003). |
| 8 | **Too little practice; weak mastery.** 5 items per activity, 70% first-try accuracy to pass, "mastered" meaning only "activities completed", no review, and "unlock all" skipping everything. | Word reading needs accuracy *and* speed, built by spaced, cumulative retrieval practice (LaBerge & Samuels 1974; Cepeda et al. 2006; Karpicke & Roediger 2008). |
| 9 | **Feedback that explains nothing and raises anxiety:** a harsh buzzer, a shake and a disabled button. Points were given for any correct tap, including guesses. | Specific, explanatory feedback beats right/wrong (Shute 2008). Reading anxiety is common among foreign-language learners (Saito, Garza & Horwitz 1999). |
| 10 | **No spelling or writing.** "Word build" only reordered exactly the letters needed. | Spelling and writing strengthen reading (Graham & Hebert 2010). Handwriting helps adults learn a new alphabet (Wiley & Rapp 2021). |
| 11 | **No connected reading or comprehension.** "بناء الجمل" was a fill-the-gap with the translation visible, while its card said "arrange the words". | A balanced course needs meaning-focused reading and fluency practice, not only code work (Nation 2007). |
| 12 | **No placement; one path for all.** | False beginners need a diagnostic starting point; true beginners need an orientation. |
| 13 | **"Letters mastered" meant only the letters of completed units**, and no error data was kept. | Not a measure of mastery; the app could not target what a learner confuses. |
| 14 | **Typography and language tagging.** Inter's *a* and *g* differ from handwriting forms, and *I* and *l* look alike. English text was not tagged `lang="en"`. | Fonts designed for beginning readers reduce confusions; correct language tags help screen readers. |
| 15 | **Inconsistent audio.** Device voices differ between iPhone and Android, the accent was British, the 0.5× "slow" speed distorts, and the iPhone silent switch can mute speech. | Learners need one consistent model that works offline on both platforms. |
| 16 | **Progress can vanish.** Safari deletes a website's storage after 7 days without use unless the app was added to the Home Screen, and there was no backup. | A no-login, self-study app needs install guidance and an export/import backup. |

**What was good and is kept:**
- the offline-first PWA;
- the Arabic interface;
- short activities;
- re-queuing of missed items;
- slow-audio buttons;
- streaks and achievements as light motivation;
- the small, dependency-free code base.

---

## 4. Design principles

1. **Systematic, explicit, cumulative code instruction.** Sound → letter, blending, segmenting and spelling, in a planned sequence with cumulative review (Kruidenier 2002; NRC 2012; Burt, Peyton & Adams 2003; Martin 2024).
2. **Whole–part–whole.** Units open and close with short, meaningful adult texts; code work sits in the middle (Bow Valley College 2011; Vinogradov 2010).
3. **Meaning always.** Every word has audio and an Arabic meaning, plus a picture or emoji where the word is concrete. Choose high-frequency, campus-useful words: NGSL / English Vocabulary Profile A1–A2, plus loanwords learners already know (*taxi, bus, laptop, film*).
4. **Contrast practice informed by Arabic.** Minimal pairs, vowel highlighting and word chains for the contrasts in section 2 (Thomson 2018; Alsadoon & Heift 2015; McCandliss et al. 2003).
5. **Heart words by mapping, not by rote.** Teach high-frequency irregular words by mapping their regular parts and flagging the one "tricky" part. Group them into mini-patterns where possible: *he/we/me/be*, *go/no/so*, *is/has/his* (Ehri 2014).
6. **Retrieval, spacing and interleaving; mastery = accuracy + speed** (Cepeda et al. 2006; Karpicke & Roediger 2008; Settles & Meeder 2016; Perfetti 2007).
7. **Produce, don't only recognise.** Spelling from dictation; tracing and handwriting (Graham & Hebert 2010; Wiley & Rapp 2021).
8. **Fluency.** Read-while-listening, repeated reading and timed recognition (Chang & Millett 2015; Therrien 2004; Fender 2003).
9. **Low-anxiety, explanatory feedback; adult tone; competence-based motivation.** Show learners what they can now do rather than piling up points (Shute 2008; Ryan & Deci 2000; Sailer & Homner 2020).
10. **Principled use of Arabic.** Arabic for instructions, meanings and sound "bridges" (*b* = ب). Never write English words in Arabic letters, because that bypasses English spelling (Hall & Cook 2012).

### Strength of the evidence

The core claims rest on different kinds of evidence:
- **Arabic-speaker vowel difficulties:** several independent studies.
- **High-variability phonetic training (HVPT):** a 2025 meta-analysis of 79 studies.
- **Explicit phonics for literate adult EFL learners:** growing evidence, including a university intensive-English programme where most participants spoke Arabic (Martin 2024).

Some cited studies (McCandliss et al. 2003; Chang & Millett 2015; Hirsh-Pasek et al. 2015) involved children or teenagers; they inform design, not expected effect sizes. Some large adult-literacy trials found small or no effects (Condelli et al. 2010; Greenberg et al. 2011). **That is why section 10 makes a real pilot study part of the plan.**

---

## 5. Precedents we borrow from

| Programme / framework | What we take |
|---|---|
| *Letters and Sounds* (DfES 2007) | Order and pace of grapheme–phoneme correspondences; a "tricky words" strand |
| Linguistic phonics (Sounds-Write; McGuinness 1997) | Sound-to-print logic: a sound can be spelled with 1–4 letters, and one spelling can represent different sounds |
| Direct Instruction / *Corrective Reading* (Engelmann & Carnine 1982) | Introduce confusable items apart, then contrast them; model–lead–test–delayed-test error correction; mastery criteria |
| Wilson Reading System (adolescents/adults) | Sound tapping; two-syllable closed-syllable words early; six syllable types later |
| Bow Valley College *Learning for LIFE* (2011); CLB *ESL for Adult Literacy Learners* (2015); Council of Europe *LASLLIAM* (2022) | Adult ESL-literacy principles; descriptors below A1, including the "technical literacy" scales for second-script learners |
| English Accent Coach (R. Thomson) | Web-based high-variability perception training: many voices, identification with feedback |
| PIAAC Reading Components (Sabatini & Bruce 2009); UK Phonics Screening Check; DIBELS Nonsense Word Fluency | Adult-appropriate component measures: print vocabulary, sentence processing, pseudoword decoding |
| Duolingo half-life regression (Settles & Meeder 2016) | A practical spaced-repetition scheduler |

---

## 6. Scope and sequence

### Whole course

| Stage | Focus | Units | Arabic-speaker emphasis |
|---|---|---|---|
| 0 Orientation (inside unit 1) | Left-to-right; spaces between words; print letters don't join; capitals; **every vowel is written**; letter **name** vs **sound** | — | Script and direction |
| 1 Single-letter sounds + CVC words | s a t i n p · m d o g · c k ck e · u r h b · f l ff ll ss · j v w x y z zz qu | 6 | p/b, f/v, w/v, j/y; *pin/pen/pan*, *cut/cot*; b/d/p/q |
| 2 Digraphs, plural -s/-es, two-syllable words | sh ch th · ng nk wh · *laptop*, *sunset* | 3 + review | th = ث/ذ, sh = ش; *ng* without /g/ |
| 3 Consonant clusters | st sp sk sm sn · bl cl fl gl pl sl · br cr dr fr gr pr tr · -st -nd -mp -nt; -ed (/t d ɪd/), -ing | 4 (units 11–14) | No inserted vowel |
| 4 Long vowels; American r-coloured vowels | a_e i_e o_e u_e; ee/ea; ai/ay; oa/ow; igh/y; oo; ar or er/ir/ur; ou/ow; oi/oy; aw, all | 6 + review (units 15–21) | Many spellings per vowel: the biggest spelling load |
| 5 Multisyllabic words and morphology | open syllables; y = /i/; soft c/g; -le; un- re- -er -est -ful -ly -ness -ment -tion; ph; campus words, signs and forms | 2 + review (units 22–24) | Word families |
| Strands (all stages) | ≈100 most frequent heart words; numbers, days, times; campus signs (EXIT, PUSH, LIBRARY); forms (name, ID, email) | — | Survival and college literacy |

Units 11–24 (Stages 3–5) are listed in section 14.

### Phase 1 units (Stages 0–2)

Every word, sentence and text is checked by an automated test to use only letter-sounds taught so far, or heart words and names already introduced.

| Unit | New graphemes | Contrast pairs | Heart words | Sample words | Sample sentence |
|---|---|---|---|---|---|
| 1 | s a t i n p | *pat–pit, tap–tip* | I, a, is | at it in sit pin tip tap nap pan | *It is a pin.* |
| 2 | m d o g | *pot–pat, mop–map* | the, to, go, no, so | am and on not top map man sad got dig | *Sam got a map.* |
| 3 | c k ck e | *pen–pin, men–man* | you, he, we, me, be | can cat cap kid pen ten get neck pick | *It is ten to ten.* |
| 4 | u r h b | *pin–bin, cut–cot, cup–cap* | are, was, of, has, his | up but cup bus run hot hat red bad bag bed big | *The bus is red.* |
| 5 | f l + double letters | *fan–pan* | do, have, for, or | if off fan fun lab let leg lip lock miss pass bell tell will app | *Do not miss the bus!* |
| 6 | j v w x y z zz qu | *fan–van, wet–vet, jet–yet* | what, where, one, two | job jet van vet wet web win box six fix yes zip quiz | *What is in the box?* |
| 7 | sh ch th + plural -s | *ship–chip, sip–ship, thin–tin, path–pass* | they, there, my, she | shop cash fish chip chat check math this that with pens labs | *This is my math lab.* |
| 8 | ng nk wh + -es | *thin–thing, sing–sink* | who, your, said, were | sing long thing bank think thank when which buses quizzes | *When is the quiz?* |
| 9 | Two-syllable closed words | (syllable splitting) | like, some, come, from | laptop backpack sunset upset picnic tennis napkin cannot | *My laptop is in my backpack.* |
| 10 | Review + short texts with comprehension questions | everything so far | — | everything so far | *I have a quiz at ten. It is in the lab…* |

Names (*Ali, Sara* and a few others) are flagged as name-words for cultural relevance. Each unit has a short Arabic tip, and each letter-sound has a keyword with a picture (e.g. t → *taxi*, p → *pen*, l → *laptop*, b → *bus*).

---

## 7. Activities, feedback and error correction

### Activities

| Activity | Previous problem | Phase 1 design | Later |
|---|---|---|---|
| **Sound match** | Played letter names; tiny pool | Hear a recorded **sound** → choose its grapheme from everything taught so far, confusable graphemes first (b/p/d, e/i/a, u/o/a, f/v) | Several voices |
| **Capital match** | Isolated skill | Look-alike distractors (b/d/p/q); tip on when English uses capitals (names, sentence start, *I*) | Names in context |
| **Which word?** (replaces "letter pairs") | Unreliable speech; wrong vowel values | Hear a word → choose among **minimal pairs** (*pin/pen/pan*) | Full sound-discrimination module |
| **Word build** | Only the needed letters, so trial and error worked | One tile per grapheme (*ck, sh, th* are single tiles) plus 1–2 distractor tiles, usually a vowel | Dictation with the QWERTY keyboard |
| **Missing letter** | Random letter removed | **Vowel-biased**: most blanks are vowels, with vowel distractors | — |
| **What does it mean?** (replaces "word match") | Random distractors | Read the English word → choose its Arabic meaning | — |
| **First/last sound** | First sound only | Alternates first and last sound | Middle sound (built, section 16) |
| **Complete the sentence** ("أكمل الجملة", was "بناء الجمل") | Mislabelled; translation visible | Translation shown **after** answering; same-word-class distractors | Real word-order building (adjective before noun) |
| *New in Phase 2* | | | Dictation, heart-word spelling, sentence order, letter formation (optional), ear training, placement test (section 13) |
| *New in Phase 3* | | | Read the sign, forms, multiple-choice text questions; word build and missing letter with vowel teams and word parts (section 14) |
| *New in Phase 4* | | | Unit check; read aloud and compare (optional); timed word and sentence drills; timed text reading; stage benchmarks; can-do self-assessment (section 15) |
| *Later* | | | Blending (built, section 16); timed reading and record-and-compare (built, section 15) |

### Feedback and error correction (Phase 1)

Error correction follows the Direct Instruction sequence (model → lead → test → delayed test), adapted for a self-study app:

- **Correct on the first try:** a short, soft tone; the Arabic meaning appears under the word; points are awarded.
- **First error:** a neutral tone (no buzzer). The target audio replays and a short Arabic hint explains the *type* of error:
  - vowel: "listen to the vowel in the middle";
  - p/b: "p has no voice and a puff of air";
  - look-alike letters: "b faces right";
  - otherwise a general hint.

  The learner tries again.
- **Second error:** the answer is shown and spoken, and the learner taps it to continue (errorless completion).
- **Delayed test:** the missed item returns at the end of the activity (re-queuing, kept from the previous version).
- **Pass mark:** 8–10 items per activity (pool permitting); passing needs **≥ 80% correct on the first try**.

Every answer is logged locally with item, choice, correctness and response time. The progress report shows the learner's most frequent confusions ("sounds to practise").

---

## 8. Audio

### Generation: automated, done once at build time

- **Engine:** Kokoro-82M v1.0, an open-weight text-to-speech model under the Apache-2.0 licence, run with `kokoro-onnx` (ONNX Runtime). The generated audio may be redistributed.
- **Voices (American English):**
  - `af_heart`, the highest-rated voice, for sounds, words and sentences;
  - `am_michael` for words, so learners hear more than one talker.

  Phase 2 adds `af_sarah` and `am_fenrir` for ear training, so every ear-training word is heard in four voices (section 13).
- **Pronunciation input:** the *misaki* US phonemizer, plus a small hand-checked list of fixes.
- **Isolated speech sounds:** a TTS model cannot say a lone consonant (it comes out as vowel-like noise), so each sound is cut out of whole words at acoustic landmarks such as frication, voicing onset and loudness changes.
  - Several source words are tried for each sound.
  - Each cut is glued into test words (p + e + n) and must be recognised correctly (the "blend test"); the best cut is kept.
  - A sound that never passes is presented as "sound in a keyword" instead. In Phase 1 that applies only to *th*.
- **Post-processing (ffmpeg):**
  - trim leading and trailing silence only;
  - peak-normalise words and sounds;
  - loudness-normalise sentences;
  - encode as **MP3, mono, 24 kHz, 48 kbps**, which every iPhone and Android device can play.
- **Automated quality checks:**
  - acoustic sanity checks on every cut sound (voicing share and spectral centre);
  - the blend test;
  - every word and sentence transcribed back by a speech recogniser (Whisper small.en via sherpa-onnx).

  Results are written to `tools/audio/qa-report.json`. Formant measurements were tried as a vowel check but proved unreliable on synthetic voices, so the blend test is used instead.

**Why synthetic speech is acceptable:**
- Modern TTS supports learning about as well as a human voice (Craig & Schroeder 2017) and is as comprehensible to L2 learners (Bione & Cardoso 2020).
- Perception training built from TTS stimuli works (Qian et al. 2018), including with Arabic-speaking learners (Al-Shami & Cardoso 2025).
- Professional recordings still sound more natural, which is why the top-rated voice and automatic quality checks are used.

### Playback on iPhone and Android

- **Engine:** clips are played with the Web Audio API (`fetch` → `decodeAudioData` → buffer source) for low latency.
- **Unlocking audio:** the audio context is resumed inside the learner's taps, and again on every tap and when the app returns to the foreground.
- **iPhone silent switch:** handled with the Audio Session API (`navigator.audioSession.type = "playback"`) where available, with a silent-loop fallback.
- **Offline:** clips are cached by the service worker unit by unit. They are read with `fetch()`, which avoids Safari's range-request problem with cached media.
- **Speech-engine fallback:** the device's speech engine is used only for words or sentences with no recording, never for letters or sounds.
- **Storage:** the app asks the browser to keep its storage (`navigator.storage.persist()`). Phase 2 adds Home-Screen install guidance for iPhone, a backup/restore code, and a warning when opened inside in-app browsers (Instagram, Facebook, TikTok…).

---

## 9. Assessment inside the app

**Placement test (built in Phase 2, see section 13).** At most about 10 minutes, adaptive, with Arabic instructions. The original design covered:
- letter sounds;
- vowel minimal pairs;
- real words read for meaning;
- made-up words presented as "brand names";
- heart words;
- a 5-word dictation;
- 3 sentences matched to pictures.

It places the learner at the first unit not yet mastered and lets them test out of units, replacing "unlock all". The built version covers letter sounds, minimal pairs, made-up words, heart words and dictation, and, in units 3, 6 and 9, a sentence matched to one of three pictures (section 16).

**Ongoing tracking.** Logged from Phase 1 and used for adaptation from Phase 2: accuracy, response time and confusion pairs for each grapheme and word.
- Mastery rule (Phase 2): ≥ 90% correct over the last ≥ 8 first tries, spread over ≥ 2 days, and an average response under 3 s on recognition tasks. The time counts from when the item appears, so it includes about 1 s of audio (≈ 2 s after the audio ends).
- These thresholds should be calibrated in the pilot study.

**Unit check (built in Phase 4, section 15).** 12 mixed items, including 2 made-up words and a reading item; pass at ≥ 80%, with corrective practice and a retake.

**Stage benchmarks** are linked to:
- the CEFR Companion Volume (2020) Pre-A1/A1 reading descriptors, e.g. Pre-A1 "Can recognise familiar words accompanied by pictures…";
- the CLB *ESL for Adult Literacy Learners*;
- the *LASLLIAM* technical-literacy scales.

Learners see Arabic can-do statements. The built benchmarks (section 15) have five parts: timed word reading, timed sentence verification, made-up words, dictation, and an unseen text. Self-assessment follows. Their speed criteria are provisional until the pilot.

**Learner report:** sounds I know vs sounds to practise, words learned, unit checks, stage benchmark profiles with self-ratings, and speed over time (built in Phases 2 and 4).

---

## 10. How to evaluate the app

### Tier 1 — Expert review (before and after each phase)

**Rubrics:**
- Chapelle's (2001) six CALL criteria: language-learning potential, learner fit, meaning focus, authenticity, positive impact, practicality;
- Hirsh-Pasek et al.'s (2015) four pillars (active, engaged, meaningful, socially interactive learning);
- Rosell-Aguilar's (2017) taxonomy for language-learning apps;
- the principles in section 4 as a checklist;
- WCAG 2.2 AA for accessibility.

**Automated content metrics** (computed from `data.js` by the test suite and `tools/content/metrics.py`; Phase 3 results in section 14):

| Metric | Target |
|---|---|
| Decodable at point of use | 100% |
| Words with an Arabic meaning | 100% |
| Words in the NGSL top 1,000 (from unit 3) | ≥ 70% |
| Contrast pairs per unit | ≥ 3 (unit 1: ≥ 2) |
| Items available per activity | ≥ 4 options |

**Raters:** two or three independent raters (EFL literacy specialist, Arabic–English bilingual teacher, UX designer), reporting inter-rater agreement.

### Tier 2 — Usability with target learners (each phase)

- **Participants:** 5–8 pre-A1 college learners per round, on a low-cost Android phone and on an iPhone.
- **Method:** think-aloud in Arabic, using set tasks: start a unit, finish an activity, find weak sounds, back up progress.
- **Measures:** task success, time, errors, and the Arabic System Usability Scale (AlGhannam et al. 2018). Target ≥ 70.

### Tier 3 — Learning-effectiveness pilot (after Phase 3)

- **Design:** pre-test, post-test and delayed post-test (4–6 weeks later), with a waitlist or business-as-usual comparison group, randomised where possible.
- **Dose:** about 20 minutes a day, 5 days a week, for 6–8 weeks.
- **Measures:**
  - letter–sound knowledge;
  - pseudoword decoding (accuracy and rate);
  - timed real-word reading;
  - spelling dictation, scored by correct graphemes;
  - vowel and consonant minimal-pair perception;
  - sentence-verification fluency (PIAAC-style);
  - picture-based vocabulary size (PVST; Anthony & Nation 2017, used as a relative measure because its norms are for young learners);
  - short A1 comprehension texts;
  - the Foreign Language Reading Anxiety Scale (Saito et al. 1999);
  - app logs (minutes, items, accuracy, response times).
- **Analysis:**
  - mixed-effects models or ANCOVA with the pretest as covariate;
  - Hedges' *g*;
  - dose–response;
  - change in confusion patterns (e.g. *pin/pen*);
  - false vs true beginners.
- **Pre-registered success criteria:**
  - *g* ≥ 0.5 on pseudoword decoding vs comparison;
  - ≥ 85% of Stage-1 letter-sounds mastered;
  - SUS ≥ 70;
  - ≥ 40% of learners return after 7 days.
- **Ethics:** informed consent; anonymous random learner codes; data leaves the device only when the learner chooses to export it (no login, no tracking).
- **Benchmark validation:** the same pilot validates the stage benchmarks (section 15). Learners export their benchmark CSV; a teacher adds a 1-minute oral reading and a CEFR-descriptor rating; `tools/pilot/item_analysis.py` reports the results.

---

## 11. Roadmap

| Phase | Deliverables | Done when |
|---|---|---|
| **1 Foundation** (this release) | This plan; decodable Stage 0–2 curriculum; generated American audio for sounds, words and sentences; iPhone/Android audio engine; explanatory feedback; local error log; curriculum-checking tests | All tests pass; 100% decodable; audio plays on both platforms |
| **2 Learner model** (built, section 13) | Placement test; item-level mastery; daily spaced review; "practise my weak sounds"; multi-voice perception training; dictation; tracing; word-order sentences; backup code; iPhone install guide; in-app-browser warning | First usability round SUS ≥ 70 ([usability kit](./docs/usability-kit.md)) |
| **3 Curriculum** (built, section 14) | Stages 3–5; heart-word strand (≈100); decodable adult readers (campus series) with read-along highlighting and comprehension; campus signs and forms | Content metrics met (all but vocabulary frequency; see section 14) |
| **4 Fluency & assessment** (built, section 15) | Timed fluency tasks; record-and-compare reading aloud; unit checks and stage benchmarks; can-do self-assessment | Benchmarks validated in pilot (tools and protocol ready; needs learners) |
| 5 Evaluation | Tier 3 pilot; report; revisions | Report complete |

---

## 12. Phase 1 — what this release changes

### Curriculum (`data.js`)
- 10 new units covering Stages 0–2:
  - 189 words with Arabic meanings (88 with a picture emoji);
  - 39 heart words with their tricky part marked;
  - 6 names;
  - 69 minimal-pair sets;
  - 83 sentences;
  - 4 short texts with 12 comprehension questions;
  - Arabic tips in every unit.
- 37 grapheme–phoneme correspondences. Each has a keyword with a picture, an Arabic "bridge" letter where the sound exists in Arabic, and a "new sound" flag where it doesn't.
- **100% decodable at the point of use**, enforced by `tests/curriculum.test.js`. The previous version: about 70%.
- The test segments words over the full grapheme inventory, so untaught patterns are caught. It also enforces:
  - closed syllables;
  - soft c/g and w+a rules;
  - heart words, names, plural -s/-es and two-syllable splits by unit;
  - unique Arabic meanings;
  - valid minimal pairs.

### Activities, feedback and data (`questions.js`, `app.js`, `logic.js`)
- The eight activities described in section 7 plus short-text comprehension. Each has 8 items (pool permitting), and passing needs ≥ 80% right on the first try.
- Wrong options come from tables of sounds and letter shapes that Arabic speakers confuse. Two spellings of the same sound (c/k/ck) are never offered together.
- Error correction:
  - a soft tone;
  - a hint for the specific confusion;
  - "listen again" and "what you chose";
  - the answer revealed after a second error;
  - the item repeated at the end with its options reshuffled.
- Meaning (Arabic and emoji) is shown and the word is heard after each answer. Points are given for first-try answers only.
- Every answer is logged on the device: item, choice, try number and response time. Per-grapheme accuracy and confusion counts feed the new **"sounds to practise"** report.
- Progress v3 is stored under a new key. Old progress is reset (owner decision), and returning learners see a one-time Arabic notice.

### Reading support
- Andika (a typeface for beginning readers), self-hosted.
- Vowel letters coloured everywhere: textual input enhancement for vowel blindness.
- Tricky parts of heart words marked; syllable dots in two-syllable words.
- Read-along texts that highlight each sentence as it is spoken.
- English text tagged `lang="en"`.

### Audio (`audio.js`, `tools/audio/`, `audio/`)
- 909 generated MP3 clips (≈ 6 MB):
  - 29 isolated sounds (vowels and most consonants);
  - 26 letter names;
  - 250 words in two voices plus a slow version;
  - 113 sentences, plus slow versions.
- Isolated sounds are cut from words and verified by the blend test (`tools/audio/README.md`). *th* is taught through its keywords.
- Ten American voices were compared for minimal-pair clarity. On all curriculum words the two best voices were equivalent (154 vs 155 of 189 recognised exactly), so the most natural voice was kept.
- Slow versions are time-stretched normal speech: the model's own slow mode added an "uh" before words.
- The playback engine follows WebKit and Chrome guidance:
  - Web Audio buffers;
  - unlocks on every tap and recovers from iOS interruptions;
  - Audio Session API for the iPhone silent switch, with a silent-loop fallback;
  - no device-voice fallback for letter sounds;
  - per-unit offline caching in a separate audio cache.
- An "audio test" screen in the menu, to help learners and teachers troubleshoot.

### Fixes found during the design review
- Theme toggle bound twice: the menu toggle could stop working.
- Modal backdrops: Tailwind v4 dropped `bg-opacity-*`, so backdrops rendered solid black.
- Stale compiled Tailwind CSS. It is rebuilt now, scanning only the app's own files.
- The service worker deleted every cache on the origin. It now deletes only this app's caches.
- Progress is now also saved on `pagehide`, because iOS doesn't reliably fire `beforeunload`.
- The sentence blank now matches whole words only.
- "kids" removed from the web-app manifest; adult copy on the landing page.

### Verification
- `npm test` passes:
  - the phonics engine;
  - the curriculum linter;
  - the question bank for every unit × activity × 5 random seeds;
  - progress logic;
  - the precache list;
  - CSS classes;
  - audio coverage and size budget.
- An end-to-end browser run in Chromium, emulating a Pixel 7, passed:
  - all activities of unit 1, plus units 7, 9 and 10;
  - error, hint and reveal paths;
  - MP3 decoding;
  - progress logging;
  - reload while offline, including cached audio.
- **Still to do by a person:**
  - the 2-minute iPhone check (Home Screen install, silent switch, airplane mode);
  - a short listening pass over the clips flagged in `tools/audio/qa-report.json`.

### Deferred to Phase 2+
Placement test, spaced review, the multi-voice perception-training module, dictation, tracing, word-order sentences, backup/restore code, iPhone install guide and in-app-browser warning. All were built in Phase 2 (section 13).

---

## 13. Phase 2 — the learner model

Phase 1 logged every answer. Phase 2 uses that record. The app now:
- places each learner;
- schedules review;
- targets each learner's own confusions;
- trains the ear with several voices;
- asks learners to *produce* spellings, sentences and letters, not only recognise them;
- protects self-study progress.

### Item memory and spaced review (`learner.js`)
- **What is tracked.** Every sound (sound ↔ letter), decodable word and heart word the learner practises gets a small record:
  - a Leitner box (0–6);
  - the next review day;
  - the last 10 first-try results;
  - a moving average of response time;
  - the number of different days practised.
- **Spacing** (Leitner 1972; Cepeda et al. 2006; Kang 2016).
  - A right first try on a due item moves it up one box. The next review is then 1, 2, 4, 8, 16 or 32 days later.
  - A wrong answer sends it back to tomorrow.
  - Right answers given before the item is due don't move it up, so answering the same word in three activities on one day counts once.
- **Mastery** (shown in the report). All of these are needed:
  - ≥ 90% right over the last ≥ 8 first tries;
  - practice on ≥ 2 different days;
  - an average response under 3 s on recognition tasks.

  These thresholds are for the pilot to calibrate (section 9).
- **Daily review** ("مراجعة اليوم"). Up to 12 due items per session, mixed across sounds, words and heart words.
  - The question type gets harder as an item becomes secure: *meaning / which word* → *missing letter / build the word* → *dictation*.
  - This moves from recognition to recall (Karpicke & Roediger 2008; Bjork 1994).
- **Weak sounds** ("نقاط ضعفي"). Found in the last 300 answers: graphemes with < 80% first-try accuracy, or confused ≥ 2 times.
  - Because only recent answers count, a weak sound disappears once the learner improves.
  - The practice is a 10-item mix: ear-training trials, sound → letter with the confused letter as a distractor, minimal-pair words, and missing letter.
- **Progress v4.** Phase 1 (v3) progress is migrated, not reset, and item memory is rebuilt from the answer log. Streak days now use the local date; the UTC date was a day behind for learners in UTC+3 before 3 a.m.

### Ear training (high-variability phonetic training)
- **The sets.** 11 sets for the contrasts in section 2: *a/o, i/e, e/a, a/u, o/u, p/b, f/v, v/w, j/y, sh/ch, n/ng*.
  - Each set has 7–12 minimal pairs (178 words), heard in four voices: `af_heart`, `am_michael`, `af_sarah`, `am_fenrir`.
  - A set opens once both letters have been taught.
- **A round.** 16 two-choice trials. The learner hears a word and chooses the **letter** they heard; the word is shown afterwards, so consonant sets can use words not yet decodable (*fine/vine*).
  - Half the trials have each answer, the voices vary, and the same word never comes twice in a row.
  - A wrong answer plays both words of the pair in the same voice.
  - Accuracy per round is kept, and the menu and report show the trend.
  - This is the design of identification HVPT (Thomson 2018; Qian et al. 2018; Uchihara, Karas & Thomson 2025).
- **Clip checks.** A wrong clip would teach the wrong category, so every ear-training clip is transcribed by the speech recogniser. The 174 of 712 clips it does not hear as the intended word are never used (`audio/manifest.json`, `avoid`).

### New activities

| Activity | Units | Design |
|---|---|---|
| **Dictation** (إملاء) | 1–10 | The learner hears a word (one of two voices) and types it on an **in-app QWERTY keyboard**, where letters not yet taught are disabled. This avoids switching the phone to an English keyboard and stops autocorrect. Feedback compares the spelling grapheme by grapheme. It names a missing vowel ("every vowel is written in English"), a swapped grapheme (with the pair hint), or a spelling choice for the same sound (*c/k/ck*). |
| **Heart words** (كلمات القلب) | 1–10 | Hear a heart word → choose its spelling among look-alike heart words (*the/they/then*). The feedback marks the tricky part. |
| **Sentence order** (رتّب الجملة) | 2–10 | The Arabic meaning and the audio are shown; the learner taps the word tiles in English order. Tiles keep the capital letter and the full stop, which teaches both conventions. |
| **Letter formation** (اكتب الحرف, optional) | 1–6 | Three steps follow model–lead–test: watch the stroke animation; trace over a dotted letter from the green start dot; then write it alone on guide lines. Scoring checks how much of the letter was covered, how much of the ink is on the letter, and the start point. It rejects mirrored *b/d, p/q* and strokes drawn from the bottom up. The activity is optional because the evidence is for handwriting with a pen (Wiley & Rapp 2021), so learners are also told to write on paper. |

Each unit now has 7–12 activities. Letter formation does not count towards completing a unit.

### Placement test
- **When it is offered.** At first launch the learner chooses "complete beginner → unit 1" or "I know some English → short test". It is also in the menu, replacing "unlock all".
- **What it asks.** Five items per unit (units 1–9):
  - two sound → letter items (unit 9: word meaning);
  - one minimal pair;
  - one made-up word;
  - one dictation or heart-word item.

  A unit is passed with ≥ 4/5. The test stops at the first unit not passed, so a true beginner sees 5 items and a strong reader at most 45.
- **Made-up words.** 35 of them, 3–4 per unit, presented as "product names". The learner decodes one by choosing among three spoken versions: the right one, a vowel misreading and a consonant misreading. This tests decoding without letting a false beginner use a memorised word (compare the Phonics Screening Check and PIAAC components).
  - They are synthesised from phonemes built from their letters.
  - They were checked against the American pronunciation lexicon so that none is a real word or sounds like one.
  - The curriculum linter rejects any whose spelling would be read differently (soft *g* in *gim*).
  - A speech-recogniser check made sure each made-up word and its vowel foil sound different. Seven foils were changed to a more distant vowel, e.g. *nin/nan* instead of *nin/nen*, because the synthetic short *i* and *e* were too close in made-up words.
- **Scoring.** No feedback and no points during the test. Units passed are marked complete but stay open. A retake can only move the starting unit forward.

### Keeping self-study progress safe
- **Backup code.** `L2A1.` + compressed JSON + a checksum, about 1–4 KB of text.
  - The learner can copy it, share it (e.g. to themselves on WhatsApp) or save it as a file.
  - Restoring shows a summary and asks for confirmation.
  - The checksum catches codes cut off while copying.
  - Browsers without `CompressionStream` get an uncompressed code.
  - The dashboard reminds learners every 14 days once they have made real progress.
- **Answer log export (CSV)** for a teacher or a study. The learner decides whether to share it; nothing is sent automatically.
- **iPhone/iPad in Safari.** Before the first lesson, illustrated Arabic steps for *Add to Home Screen*, with the reason: Safari can delete a site's data after 7 days without a visit.
- **Android.** An install button, or manual steps.
- **In-app browsers** (Instagram, Facebook, TikTok, Snapchat, LINE, other web views). A banner on the landing page asks the learner to open the link in Safari or Chrome, with a copy-link button.

### Audio added in Phase 2
- **Voice choice.** The two extra voices were chosen by recogniser accuracy on the 178 ear-training words, each spoken alone:

  | Voice | Recognised (of 178) |
  |---|---|
  | `af_sarah` | 144 |
  | `af_bella` | 134 |
  | `af_nicole` | 113 |
  | `am_fenrir` | 120 |
  | `am_puck` | 87 |

  The best female and the best male voice were kept (`tools/audio/voice-comparison.json`).
- **New clips.** 681 clips (made-up words and ear-training words); the total audio is now 1,590 files, ≈ 6.6 MB.

### Verification
- `npm test` (238 tests) covers:
  - the learner model: Leitner, mastery, due order, local days, v3 → v4 migration;
  - backup codes: round trip, cut and changed codes, uncompressed fallback;
  - platform detection: iPhone, iPad, Android, in-app browsers;
  - letter templates and scoring: all 26 letters, mirrored, reversed and scribbled input;
  - every unit × activity × 5 random seeds, review questions for every item, placement, ear-training blocks and weak-sound practice;
  - made-up words: decodable, not curriculum words;
  - the ear-training sets;
  - audio coverage, enough clean tokens per set, and the size budget.
- A browser run (Chromium; Pixel 7, iPhone and Instagram profiles) passed 18 checks:
  - placement right on units 1–3 and wrong on 4 → starts at unit 4, no points;
  - sentence order, dictation feedback;
  - tracing (a well-formed letter accepted, a mirrored one rejected);
  - daily review after the items become due;
  - weak-sound practice;
  - a 16-trial ear-training round;
  - the report;
  - backup → reset → restore;
  - the iPhone Home Screen guide;
  - the in-app banner;
  - no page errors.

  A second run completed every activity of units 1, 7, 9 and 10 with a mix of right and wrong answers (37 checks, no page errors).

### Still to do by a person
- **iPhone check:** Home Screen guide, silent switch, airplane mode, and copy-pasting a backup code through WhatsApp.
- **A short listening pass** over the made-up words (`audio/f/p/`) and a sample of the new voices. Listen especially for short *i* versus *e*: the recogniser often hears the main voice's /ɪ/ as /ɛ/ in made-up words (*nin* → "nen"). It happens less often with real words (*bin* → "Ben" is one), and ear training already skips every clip the recogniser mishears, but a person should judge.
- **Usability round 1** with 5–8 learners: see [`docs/usability-kit.md`](./docs/usability-kit.md).

---

## 14. Phase 3 — the full course (Stages 3–5)

Phase 3 completes the scope and sequence in section 6:
- 14 new units (11–24), so the course now has **24 units** in four stages on the home screen;
- the full heart-word strand;
- campus reading texts with comprehension questions;
- campus signs and forms.

Every new word, sentence, text, sign and form label passes the same decodability test as Phase 1.

### Units 11–24

| Unit | New patterns | Heart words | Sample words | Text |
|---|---|---|---|---|
| 11 | st sp sk sm sn sl sw sc | put push pull full does | stop spin skill smell snack swim | *At the Bus Stop* |
| 12 | bl cl fl gl pl br cr dr gr pr tr tw | friend want water work word | black class clock flag plan truck | *In Class* |
| 13 | -st -nd -nt -mp -sk -lp -lk -xt; str spr | old cold find kind both | best last hand went help strong | *The Test* |
| 14 | -ed (/t/, /d/, /ɪd/), -ing, doubling (*planned*) | give live love done gone | jumped filled ended planned shopping | *The Lost Backpack* |
| 15 | a_e i_e o_e u_e (silent e) | very every many any again | name late time smile home cute use | *Five to Nine* |
| 16 | ee ea ai ay | people because eye buy laugh | see need sleep teach train day | *The Team* |
| 17 | oa ow (snow) igh y (my) ie | could would should walk talk | road coat show light high cry pie | *A Cold Night* |
| 18 | oo (moon, book) ew ue | school group through move whose | food room restroom soon good few true | *Lunch* |
| 19 | ar or er ir ur | four our hour sure warm | card park short sport her first turn | *The Form* |
| 20 | ou ow (cow) oi oy aw all | father mother brother other son | out loud house now join boy saw call | *The Mall* |
| 21 | Review; 14 signs | answer listen here | — | three texts |
| 22 | open syllables (*o-pen*, *stu-dent*), y = /i/ (*baby*), soft c and g, -le; days of the week | busy women eight half learn | open paper music student email library | *At the Library* |
| 23 | -er -est -ful -ly -ness -ment, un- re-, -tion, ph, numbers | enough quiet idea minute | teacher biggest helpful kindness unlock station phone | *The Math Teacher* + a library-card form |
| 24 | Review; 12 signs; a student-card form | world thought tomorrow only | — | three texts |

The four stages on the home screen are: sounds and short words (1–10), consonant clusters and word endings (11–14), long vowels (15–21), and longer words, signs and forms (22–24).

### What the decoding check now understands (`phonics.js`)
- **Syllable types:**
  - closed;
  - silent e;
  - vowel teams;
  - r-controlled vowels;
  - open syllables;
  - y as a vowel (*my*, *baby*);
  - consonant + *le*;
  - *-tion*.

  Each syllable of a word must use only patterns taught by that unit.
- **Consonant clusters** at the start (*st, bl, str*…) and the end (*-nd, -mp, -xt*…) of a syllable, introduced in units 11–13.
- **Word parts.**
  - Endings: -s, -es, -ed, -ing, -er, -est, -ful, -less, -ness, -ment, -ly.
  - Prefixes: un-, re-.
  - Spelling changes are handled: dropped e (*make → making*), doubled consonant (*plan → planned*) and y → i (*happy → happiness*).

  A word with parts is accepted when its base is decodable (or a heart word) and its parts have been taught.
- **Spellings that would mislead.** These are refused unless the word is a heart word:
  - *w* + *a* (*want*);
  - *wor-/war-*;
  - *-old, -ind, -ild, -alk*;
  - a soft *c* or *g* before unit 22.
- **Made-up words** are synthesised from phonemes worked out by the same rules: long vowels in open syllables, soft *c*/*g*, *-le* as /əl/.

### What is aimed at Arabic speakers
- **No inserted vowel in clusters.** Arabic does not allow two consonants at the start of a syllable, so learners often say *sipring* or *hande* (Smith 2001).
  - The contrast pairs differ only by the cluster consonant (*top/stop, lip/slip, tent/test*).
  - The Arabic tips say "stop, not «سِتوب»".
  - The vowel-error choice for each new made-up word has an **inserted vowel** (*snep* vs *sinep*), so the placement test and the made-up-word activity catch this error.
- **-ed has three sounds.** The tip in unit 14 says that *jumped* is one syllable, and that /ɪd/ is added only after *t* and *d*.
- **Long vs short vowels.** Every long-vowel unit contrasts it with the short vowel (*not/note, sit/seat, cut/cute*). A twelfth ear-training set, **i / ee**, has 11 pairs (*ship/sheep, sit/seat, fill/feel*…). It opens at unit 16 and targets the best-known vowel problem for Arabic speakers.
- **Many spellings for one vowel** (Fender 2008; Saigh & Schmitt 2012).
  - Spellings of the same sound are grouped: *a_e/ai/ay, ee/ea/y, er/ir/ur, oo/ew/ue*, and others.
  - In *missing letter* and *word build*, the wrong choices include other spellings of the same sound.
  - In dictation, a spelling that has the right sounds but the wrong letters (*rane* for *rain*, *fone* for *phone*) gets its own message: «نطقك صحيح! لكن هذه الكلمة تُكتب بطريقة أخرى». This means "your sounds are right, but this word is spelled another way". It replaces a sound hint that would not apply.
- **American r.** *ar, or, er/ir/ur*. The tips say the American *r* is not trilled and is always said at the end of a word (*car, more*).
- **Second sounds.** Some letters get a second sound: *ow* in *cow* (after *snow*), *y* in *baby* (after *my*), *c* in *city* and *g* in *page*.
  - Each has its own sound card, with the same letter and a new keyword.
  - Earlier units keep the first sound, so a word is never ambiguous when it is first met.

### Heart-word strand
- **105 heart words** in all:
  - 39 in units 1–10;
  - 66 in units 11–24, about five per unit.
- They are the frequent irregular words learners meet in campus texts (*people, because, could, school, friend, water, father, enough*).
- The tricky part of each is marked on the word card (Ehri 2014).
- The heart-word activity uses look-alike heart words as wrong choices (*could/would/should*, *four/our/hour*).

### Campus readers
- **22 short texts**: one in each of units 11–20, 22 and 23; three in each of the review units 21 and 24; four in unit 10.
  - They follow the same students (*Sara*, *Ali*) through campus life: the bus stop, class, a test, a lost backpack, lunch, a form, the library, the end of term.
  - Unit texts are 35–60 words long. Every word is decodable at that unit or is a taught heart word or name.
- **Read-along** (from Phase 1):
  - each sentence is highlighted as it is spoken, and an Arabic translation can be shown under each sentence;
  - the routine is "read alone, then listen and follow, then read again", based on repeated and audio-assisted reading (Therrien 2004; Chang & Millett 2015).
- **Comprehension.** 66 questions:
  - 53 yes/no statements;
  - 13 *who/what/where* questions with three English options.

  The options must also be decodable. Each question has an Arabic translation, shown after answering.

### Signs and forms (survival literacy)
- **"Read the sign" (اقرأ اللافتة)**, units 21 and 24.
  - 26 campus signs in capitals: *EXIT, PUSH, PULL, NO ENTRY, STAFF ONLY, LOST AND FOUND, QUIET PLEASE, FIRST AID*…
  - Each sign is on a coloured plate: red for stop, a ban or a warning; green for go, open or free; blue for information. The learner chooses its Arabic meaning.
  - The unit 21 tip explains that signs use capital letters (EXIT = exit).
- **"Forms" (الاستمارات)**, units 23 and 24. A library-card form and a student-card form, with two question types:
  - On the empty form: "where do you write your phone number?" → choose the field label (*First name, Last name, Phone, Email, Date of birth, Student number*…).
  - On a filled form: yes/no statements about the details (*Her last name is Hassan.*), which practise reading names, numbers, dates and an email address.

These are the "real-world literacy" tasks in the CLB adult-literacy benchmarks and LASLLIAM (filling in personal details, recognising public signs).

### Activities adapted to longer words
- **Word build:** tiles are the word's sound-spellings and word parts (*jump + ed*, *teach + er*). The extra tile is another spelling of a vowel or another suffix.
- **Missing letter:** the blank can be a whole vowel team (*r _ _ d* → *oa / ai / ee*).
- **First/last sound** and the sound cards show the letters (*y*, *ow*), not internal names.
- **Placement test:**
  - It now reaches unit 23.
  - From unit 11 each unit has **3 items** instead of 5: a minimal pair, a made-up word and a dictation word. Units 11–23 build on everything before them, so these three are enough evidence.
  - A strong reader answers at most 81 items (about 10 minutes); a true beginner still answers only 5.
  - All three items must be right to pass a unit from 11 on (the 80% rule). This errs towards starting earlier, which costs little because completed units are quick.
- **Can-do statements** after placement now cover clusters and endings, long vowels, campus texts, and signs and forms.

### Content metrics (section 10)

Computed by `tests/curriculum.test.js` and `tools/content/metrics.py` (`tools/content/metrics.json`).

| Metric | Target | Result |
|---|---|---|
| Decodable at point of use | 100% | **100%**: 493 words, 203 practice sentences, 22 texts, 26 signs, 2 forms |
| Words with an Arabic meaning | 100% | **100%** |
| Contrast pairs per unit | ≥ 3 (unit 1: ≥ 2) | **met**: 72 sets in units 11–24 |
| Items available per activity | ≥ 4 options | **met** (tested for every unit × activity × 5 seeds) |
| Heart-word strand | ≈ 100 | **105** |
| Texts with comprehension | every unit from 10 | **met**: 22 texts, 66 questions |
| Words in the top 1,000 (from unit 3) | ≥ 70% | **not met: 45%** (50% counting word families); 55% / 59% after section 16 |

**Why the frequency target is not met.** The frequency list is `wordfreq`'s English top-1,000, used as a stand-in for the NGSL (Browne, Culligan & Phillips 2013); the two overlap heavily, but this should be re-checked against the NGSL itself. Three things keep the share down:
1. The most frequent words (*have, said, would, people*) are mostly irregular. They are taught as **heart words**, which this metric does not count.
2. Minimal pairs need partners that are less frequent (*spin, slip, cot, cute*).
3. Campus words learners need (*laptop, backpack, restroom, library*) are frequent on campus but not in a general list.

The sounds a unit teaches limit what it can use, which is why units 9 (*laptop, napkin, sunset*), 11 and 14 are lowest.

**What the learner actually reads is much more frequent.** Of the 1,692 running words in all sentences and texts (names excluded):
- **84%** are in the top 1,000 word families;
- **95%** are in the top 3,000.

Of the word lists themselves, 80% of words from unit 3 are in the top 3,000 families.

**Proposed revision, for the owner and raters to decide.** Replace the type-based target with:
- ≥ 80% of running words in the top 1,000 families (met: 84%);
- ≥ 75% of listed words in the top 3,000 families (met: 80%).

Running-word coverage is the usual measure of how readable a text is for a learner (Nation 2006). Until this is agreed, the original target is reported as **not met**.

### Audio added in Phase 3
- **New clips.** 865 clips: words, sentences, signs, form statements, made-up words, and the *i/ee* ear-training words.
  - The total is now 1,496 clips in 3,369 files, about 16.8 MB, or about 0.7 MB per unit.
  - Clips are cached as the learner reaches each unit, never all at once. The size budget in the tests was raised from 12 MB to 20 MB.
- **Isolated sounds.** 9 of the 15 new sounds have a clean recording on their own: *long a, long i, long u, ar, or, er, ow* (cow), *oy*, *all*.
  - Long vowels are synthesised on their own as well as cut from words.
  - A vowel said alone is accepted if the recogniser hears it as its name (*I*, *you*, *or*, *ow*, *all*).
  - *Long o, long e, oo* (both sounds), *aw* and *-tion* failed. They are taught through their keyword, and the prompt now says "listen to **the vowel** in *home*" (or "the last part of *station*") instead of "the first sound".
  - Units 1–10 still have 29 of 31 sounds (*th* in *thin* and *this* is taught through its keyword).
  - A fix was needed on the way. Adding long-vowel test words had made the check reject *f*, *b* and *r*, because glued diphthongs are hard for the recogniser. Consonants are now judged only on short-vowel words, as in Phase 1.
- **Pronunciation fixes found by checking:**
  - *for* and *or* had been said like "far" and "ar": the short-o rule now skips *o* before *r*.
  - *close*, *use* and *live* said alone were the wrong meaning (/kloʊs/, /juːs/, /laɪv/). They are now /kloʊz/, /juːz/, /lɪv/, matching *يُغلق، يستخدم، يعيش*. In sentences the context already gave the right form.
  - One text sentence had *read* as past tense /rɛd/ in a present-tense story, which clashes with *ea* = /iː/ taught in unit 16. It was rewritten (*the club reads a short book*).
- **Made-up words.**
  - 48 new items (unit 11 on), each with two misread versions.
  - A recogniser check compared each word with its misread versions. Four foils were changed because they sounded like a real word (*moble* ≈ *mobile*, *sharp*) or too close to the target (*smock*/*smawk*, *snobeng*/*snobbing*). *cimp*'s vowel foil is now *semp* (soft c kept).
  - Two pairs are still written the same way by the recogniser (*snobbing/snobing*, *retrom/rettrom*), but their phonemes differ clearly (/ɑ/ vs /oʊ/; stress and vowel).
- **Recogniser flags.** 423 of 2,176 checked clips are flagged. In the new words almost all are homophones or digits (*by → bye*, *see → C*, *nine → 9*, *mail → male*) or short isolated words. The flags to listen to are in the list below.
- **Ear training.** 31 of the 88 *i/ee* tokens are not heard as the intended word, mostly *ship/sheep*-type confusions in the extra voices, so they are never played. Every set still has at least 16 clean tokens per side.

### Verification
- `npm test`: 392 tests. New or extended:
  - decoding of every Stage 3–5 pattern on a synthetic curriculum;
  - all 24 units decodable at the point of use (words, sentences, texts, questions, signs, form labels and statements, multiple-choice options);
  - heart words ≥ 95;
  - every unit × activity × 5 seeds for the new activities;
  - placement parts (5 items, or 3 from unit 11; at most 90 in all);
  - audio coverage per stage and the new size budget.
- **Browser runs** (Chromium, Pixel 7 profile, no service worker):
  - every activity of units 11, 15, 19, 21, 22, 23 and 24 with a mix of right and wrong answers: 71 checks, no page errors;
  - units 17 and 23 again with the final audio: 23 checks;
  - placement right through unit 12 and wrong on unit 13 → 54 items, starts at unit 13 with the clusters can-do line;
  - placement all right → 81 items (≈ 3 minutes for the script), starts at the final review with the top can-do line.
- **Screenshots checked:** sound cards for *a_e … u_e*; vowel colouring in silent-e words; heart-word marks; sign plates; filled and empty forms; text questions; the sound-match fallback note.

### Still to do by a person
- **A listening pass:**
  - the new isolated sounds (`audio/f/ph/`);
  - the *-ed* endings (*jumped, filled, ended*);
  - the made-up words with an inserted-vowel foil (`audio/f/p/`, e.g. *snep/sinep*);
  - the words the recogniser heard with *v* for *f* in both voices (*face, first, fixed*);
  - *page/age* (heard as *pay/A*), *coach* (*coat*), *took* (*tog*), *hall*, *mall*.
- **Tier 1 expert review** of units 11–24 (section 10): two or three raters, especially for the naturalness of the texts and the Arabic translations and tips.
- **Decide on the frequency target** (above).
- **Usability round 1** (still open from Phase 2), now also covering a Stage 3 unit, signs and forms.
- **Tier 3 pilot.** The course is complete, so the learning-effectiveness pilot in section 10 can be planned.

---

## 15. Phase 4 — fluency and assessment

Phase 4 builds what the roadmap lists:
- timed fluency tasks;
- record-and-compare reading aloud;
- unit checks and stage benchmarks;
- can-do self-assessment.

The roadmap's "done when" is **benchmarks validated in a pilot**, which needs learners. This release builds the benchmarks, the data export and the analysis tool for that pilot, and sets out how validation will be done.

### Unit checks (اختبار الوحدة)
- **Where.** The last activity of every unit. It opens once all the unit's other required activities are done.
- **What.** 12 mixed items:
  - 2 minimal pairs;
  - 2 meanings;
  - 2 dictation words;
  - 1 word-part item (missing letter or word build);
  - 1 heart word;
  - 2 made-up words;
  - the unit's signs, forms or new sounds;
  - a reading item, always last: a text question (units 1–9: complete the sentence).
- **How.** No feedback until the end, like the placement test. 80% (10 of 12) completes the unit and opens the next one; the first pass gives 20 points.
- **After the check.** The learner sees each missed item with its right answer and audio.
  - "Practise your mistakes" replays the missed items with the usual feedback: hint, then answer, then a delayed retest.
  - Then the learner can retake the check, with new items.
  - This is mastery learning's cycle: formative test, then correctives, then a second test (Kulik, Kulik & Bangert-Drowns 1990; Black & Wiliam 1998).
  - Check answers also update item memory, so the check is retrieval practice too.
- **Existing learners.** Units completed before this release stay complete. Their check is available but not required.

### Timed reading practice (تدريب السرعة)
**Why.** Accuracy is not enough: word recognition has to become automatic, or reading stays slow and comprehension suffers (LaBerge & Samuels 1974; Perfetti 2007). For adult EFL learners, timed and repeated reading improves rate and comprehension (Gorsuch & Taguchi 2008; Therrien 2004).

**How speed is measured.** The app is offline and has no speech recogniser, so speed is measured with silent tasks that can only be done by reading for meaning.
- **Words (60 s).** Read an English word and pick its meaning from two (picture and Arabic). The pool is every word of the units completed.
- **True or false? (90 s).** Read a sentence and say whether it is true. This is sentence verification, as in TOSREC (Wagner et al. 2010) and the PIAAC reading components (Sabatini & Bruce 2009).
  - 72 sentences (`data-assess.js`), each plainly true or false from everyday knowledge (*A fish can swim.* / *A rock can swim.*).
  - Each is decodable at its unit, and the pool grows as units are completed. The linter checks decodability and a 40–60% true share in every stage.
- **Score.** Items right minus items wrong, per minute, so guessing does not pay. The result shows the personal best, a trend line and the mistakes with their answers.
- **Pausing.** Time only runs while the app is on screen.
- **Timed text reading (repeated reading).** Every lesson text has a "⏱ measure your speed" button.
  - The learner reads silently, taps "done", and sees words a minute next to their previous reading of the same text.
  - Readings faster than 4 words a second are refused as not real reading.
- **When.** The word drill opens after the first completed unit; the sentence drill opens once at least 10 sentences can be read (around unit 7). A "speed practice" card appears on the Today panel.

### Read aloud and compare (اقرأ بصوت عالٍ)
- **The activity.** Optional, in every unit: 5 of the unit's sentences.
  - The learner reads the sentence silently, records reading it aloud, and then hears their own reading followed by the model.
  - They rate it: *like the model*, *close* or *I need practice*.
- **Cues to help the comparison:**
  - speaking time against the model's, with silence trimmed, plus advice on pace (e.g. "much slower than the model, which is normal at first");
  - the two waveforms side by side, where pauses show as gaps.
- **No automatic scoring.** A browser cannot recognise speech offline, and certainly not learner speech. Cloud recognition would break the no-account, offline design. So the learner judges, helped by the cues: self-monitoring against a model, as in repeated and assisted reading.
- **Logging.** Each rating is logged with both durations (`rating|learner s|model s`), so a pilot can follow learners' speaking-rate ratio over time.
- **Privacy.** Recordings stay in memory and are gone when the learner moves on. Nothing is saved or sent, and the screen says so.
- **iPhone.**
  - The audio session switches to *play-and-record* while recording and back to *playback* afterwards.
  - The microphone is released after each recording, so playback returns to the loudspeaker.
  - This needs a check on a real iPhone.
- **No microphone.** If recording is unavailable or permission is refused, the learner reads aloud, listens to the model and rates.

### Stage benchmarks (اختبار المرحلة)

| Part | Task | Score | Criterion |
|---|---|---|---|
| 1 Word reading | Words, 60 s; the stage's words come first | Net words a minute | ≥ 20 (provisional: 3 s a word, as in the mastery rule) |
| 2 Sentence reading | True or false, 90 s; the stage's sentences come first | Net sentences a minute | ≥ 6 (provisional: 10 s a sentence) |
| 3 Decoding | 6 made-up words from the stage (choose the right reading of three) | % right | ≥ 80% |
| 4 Spelling | 6 dictation words from the stage | % of whole words right | ≥ 80% |
| 5 Reading comprehension | An **unseen** text for the stage (48–65 words), 3 yes/no questions and 1 *who/what* question, no audio | % right | ≥ 75% |
| then | Can-do self-assessment (4 statements) | — | — |

- **During the test.** No feedback, about 10 minutes in all.
- **Results.** A profile of the five parts:
  - met or not met;
  - the change since the previous sitting;
  - what to practise for each part not met.
- **When.**
  - Recommended on the Today panel once every unit of a stage is complete.
  - It can be taken whenever the stage is open, for example as a "before" measure. Each sitting records whether the stage was already finished, so before/after comparisons are possible.
- **Not a gate.** The criteria are not validated, so they hold no learner back. The unit checks are the gate.
- **The texts.** They are not used anywhere else (the linter checks this) and are decodable at the stage's last unit.
- **A limitation.** The made-up words come from the stage's pool, which the placement test and unit checks also use, so a learner may have met some of them. Since section 16, the benchmark uses 32 made-up words kept for it alone.

**Can-do statements and frameworks.** The statements are the course's own Arabic wording (`CAN_DO_STAGES`). Each names the descriptor family it was written from, for the Tier 1 raters to check. This is not a claim of equivalence, and the benchmark is not a CEFR test.

| Stage | Statements (summary) | Written from |
|---|---|---|
| 1 | read short words; spell a heard word; tell *p/b, i/e* apart; read a short sentence | CEFR CV Pre-A1 overall reading comprehension; LASLLIAM technical literacy |
| 2 | read clusters without an added vowel; read *-ed/-ing* words; spell clusters; read a short campus text | CEFR A1 overall reading comprehension; CLB ALL reading |
| 3 | read long vowels; know several spellings of one sound; read campus signs; answer questions on a text | CEFR Pre-A1/A1 reading for orientation; CLB ALL |
| 4 | read long words; understand words from their parts; read a form; read a short text at a comfortable speed | CEFR A1 reading for orientation; CLB ALL forms |

### Can-do self-assessment
- **The ratings.** Four statements per stage, each rated *yes, easily* / *yes, with help* / *not yet*.
- **When.** Asked at the end of each benchmark, and available from the report at any time. The latest ratings are kept and shown next to the measured profile.
- **Why.** Self-assessment builds learner autonomy, and in second-language studies it correlates moderately with other proficiency measures (Ross 1998). Seeing ratings next to results helps learners judge their own reading.

### Report and data
- **Report.** New sections show:
  - speed: last and best rates with trend lines, and timed text readings;
  - unit checks: best score per unit;
  - stage benchmarks: the latest profile with self-ratings, and buttons to take or retake a benchmark and to self-assess.
- **Progress v5** (`literacyAppProgress.v5`) adds:
  - drill results (last 30 of each kind) and timed text readings (last 60);
  - unit checks;
  - benchmarks (last 12 sittings, item by item);
  - self-assessments.

  v4 and v3 progress are migrated; backup codes include the new records.
- **Benchmark export.** From the backup screen, as CSV: one row per item answered, per part and per can-do rating. As before, nothing is sent automatically.

### How the benchmarks will be validated
This is an argument-based validation (Kane 2013). Steps 1–3 and 5–6 are computed by `tools/pilot/item_analysis.py` from the learners' exported CSV files and an optional criterion file.
1. **Scoring.** Item facility and item–rest correlation. Items with facility above .95 or below .20, or correlation below .20, are revised.
2. **Generalisation.**
   - Test–retest of two sittings within 14 days: target *r* ≥ .80 for decisions about a learner.
   - Internal consistency (KR-20) for the accuracy parts.
   - The accuracy parts are short (4–6 items), so their reliability will be modest. Any part below .70 is lengthened (e.g. 10 made-up words) before it is used for decisions.
3. **Extrapolation.** Correlation with measures taken by a teacher (target *r* ≥ .50):
   - one minute of oral reading (words correct per minute; Fuchs et al. 2001);
   - a rating against the CEFR Pre-A1/A1 reading descriptors.
4. **Decision.**
   - Replace the provisional speed criteria with values from data. For example, use contrasting groups: learners the teacher judges ready for the next stage, compared with those judged not ready.
   - Update `assess.js` (`BENCHMARK_CRITERIA`) and this section.
5. **Sensitivity.** Before/after sittings of the same stage: mean gain and paired effect size per part.
6. **Self-assessment.** Correlation of can-do ratings with measured accuracy.

The sample is the Tier 3 pilot (section 10): at least 30 learners, because correlations from usability rounds of 5–8 learners are too unstable. Phase 4 is **done** when this has been reported for at least stages 1 and 2, the criteria have been revised, and any part with reliability below .70 has been lengthened.

### Verification
- **`npm test`: 460 tests.** New or extended:
  - scoring, history limits, benchmark profiles, the benchmark recommendation, the recording helpers (speech span, waveform, pace advice) and the CSV export;
  - progress v5 and its migration from v4;
  - the Phase 4 content linter (72 sentences decodable and balanced, unseen texts decodable at the end of each stage, can-do statements);
  - unit checks for every unit × 5 seeds;
  - drills and benchmarks for every stage.
- **Browser run** (Chromium, Pixel 7, fake microphone): 25 checks, no page errors.
  - The unit check is closed until the other activities are done.
  - A pass: 12 items with no feedback; the unit completes, the next unit opens and 20 points are added.
  - A fail: 4 missed items listed, corrective practice, and a retake offered.
  - Read aloud: recording, both waveforms, and 5 ratings logged with durations.
  - Word and sentence drills, with mistakes counted.
  - A full stage 1 benchmark: 5 parts, 96 item responses, the profile and the self-assessment.
  - The report sections and the text timer.
- **Earlier browser runs repeated:** the Phase 2 flows, the placement test and the Stage 3 activities.
- **The pilot analysis script** was run on synthetic exports (12 learners × 3 sittings).

### Still to do by a person
- **iPhone check of recording:** the permission prompt, the play-and-record switch, the loudspeaker after recording, and Home Screen mode.
- **Expert review** of the benchmark texts, the true/false sentences and the can-do wording (Tier 1).
- **The Tier 3 pilot**, with the validation steps above, to set the speed criteria.

---

## 16. After Phase 4: gaps closed and a safety net

Phase 5 needs learners. Until the pilot can run, this round closes gaps that earlier phases reported, adds the activities section 7 left for "later", and puts the browser tests into the repository.

### New activities
- **Blending (اقرأ صوتًا صوتًا)**, units 1–8 and 11–14.
  - The word is shown as separate letter tiles; tapping a tile plays its sound.
  - "All sounds" plays them back to back with no gap. This is as close as recorded single sounds get to connected phonation ("sssaaannn"), which teaches decoding of new words better than sounds with breaks between them (Gonzalez-Frey & Ehri 2021).
  - Three spoken words then appear, and the learner chooses the one the sounds make. The wrong choices are minimal-pair neighbours first.
  - Only words whose every sound has a clean recording are used, so no sound is ever replaced by a guess.
- **Middle sound.** "Where is the sound?" (was "first and last sound") now asks for the first, the last *and the middle* sound. The middle is always a vowel, with other vowels as the choices: the vowel letters Arabic speakers tend to skip (Ryan & Meara 1991).
- **Sentence and picture in the placement test** (the part of the original design in section 9 that was still missing).
  - Units 3, 6 and 9 each have a sentence to read and three pictures that differ in one thing the sentence says, e.g. *Dad got a cap.*: 👨🧢 / 👨🧦 / 👩🧢.
  - It replaces one of the unit's five items, so the test length does not change.

### Content gaps closed
- **Six more single sounds** now have a recording: long *o* and long *e*, both *oo* sounds, *aw* and *-tion*. That makes **44 of 46**; only *th* (both sounds) is still taught through its keyword.
  - The search tried more source words and four voices for each sound.
  - A cut is kept if the speech recogniser hears it alone as the sound's name ("Oh", "e", "oo", "shun"), or if it passes the usual test of glueing it into words (*foot, good, look*; *talk, saw, paw, jaw*).
  - Long *e* and long *oo* are in the *af_bella* voice and short *oo* in *af_sarah*, because the main voice's cuts were less clear. Every other sound is in the main voice.
  - *-tion* is the stressed syllable "shun". Unstressed /ʃən/ alone was heard as "Shen".
  - For *th* in *this*, two of four test words were recognised. But both were *that* and *then*, which are frequent enough for the recogniser to accept a plain d, so it was not counted as a pass.
- **Made-up words kept for the stage benchmarks.**
  - 32 new made-up words, 8 per stage (`BENCH_PSEUDO` in `data-assess.js`), used nowhere else.
  - So part 3 of a benchmark now measures decoding of words the learner has never seen (the limitation noted in section 15).
  - Each was checked against the American pronunciation dictionary: it is not a real word and does not sound like one.
  - Their foils follow the same rules as the course's: a vowel misreading, and a consonant confusion or an inserted vowel (*glep / gilep*). Stage 4 adds the closed-syllable misreading of an open syllable (*ro·mel / rommel*).
- **More frequent vocabulary.**
  - 106 frequent words were added across units 1–23, with Arabic meanings: *fact, past, cost, film, trust, life, safe, three, please, street, night, book, car, price, choice, report, result*…
  - Three rare words used nowhere else were removed (*zigzag, denim, jog*).
  - Near-synonyms are grouped (*big / large / huge*, *fast / quick*, *shop / store*), so they are never offered as each other's wrong answer.
  - Words whose spelling would mislead at that point were left out, e.g. *truth* (u says /uː/), *rule* and *record* (two pronunciations).

  | Measure (from unit 3) | Phase 3 | Now |
  |---|---|---|
  | Listed words in the top 1,000 | 45% | 55% |
  | … counting word families | 50% | 59% |
  | … in the top 3,000 families | 80% | 84% |
  | Running words in the top 1,000 families | 84% | 84% |

  The 70% target is still not met. The remaining rare words (188) carry the minimal pairs, sentences and texts. The frequent words still missing are irregular (taught as heart words), inflections of words already taught, or not suitable for a course. The proposal in section 14 stands.

### Safety net
- **Browser tests in the repository.** `tests/e2e` (`npm run test:e2e`) runs the app in Chromium through Playwright against a local server. Four scenarios run in parallel:
  - first run and placement, the iPhone guide and the in-app browser banner;
  - every activity of units 1 and 15 and their unit checks;
  - review, weak sounds, ear training, the report, and backup and restore;
  - unit checks, drills, reading aloud, a stage benchmark and the text timer.

  Every scenario also fails on any page error.
- **GitHub Actions** (`.github/workflows/test.yml`) runs the unit and content tests and the browser tests on every push and pull request.

### Verification
- `npm test`: 476 tests. New: blending items (every sound recorded, three spoken choices), middle-sound items (always a vowel), sentence-and-picture placement items, benchmark made-up words (decodable at the stage end, used nowhere else) and the audio coverage of all of them.
- `npm run test:e2e`: 67 browser checks, including blending in unit 1. They pass locally and run on every push in GitHub Actions.
- **Audio:** 1,684 clips in 3,757 files, 18.5 MB (budget 20 MB). Recogniser checks on the new clips:
  - Of the new words, 18 were misheard in both voices. Most are homophones or digits (*past → passed*, *sea → C*, *three → 3*, *role → roll*) or the recogniser's f/v confusion (*fast → vast*).
  - *an* and *than* had been synthesised in their weak forms (/ən/, /ðən/); they now use the strong forms.
  - One made-up word (*jick*) was heard as a real word and was replaced (*vush*).
  - Three made-up words are still written the same as a foil by the recogniser (*drup/drop*, *bife/bive*, *snoper/snopper*), but their sounds differ (/ʌ/ vs /ɑ/, /f/ vs /v/, /oʊ/ vs /ɑ/).
- **Still to do by a person:** listen to the new single sounds (`audio/f/ph/`) and to *law, huge, stage, each, choice*, which the recogniser heard oddly in both voices.

### Owner feedback after launch
- **Word first, not sounds cut out of words.** The owner found the cut sounds unclear on their own. A consonant cut out of a word loses the transitions into the vowel that carry most of its place cue: *m* and *n*, and *b, d* and *g*, differ mainly in those transitions.
  - "Listen and choose the letter" now plays a real word, the sound's keyword, with its picture, and asks where the sound sits: "what does it start with?" (*bus*), "how is the last sound written?" (*sock*), or "…the middle sound?" (*cake*). The position comes from the keyword (`soundPosition` in `phonics.js`). The word's spelling appears only after the answer.
  - Sound cards and the "what you chose" button play the word first, then the sound: "*map* … m".
  - Letters are still taught; this is how their sounds are presented. The letter name stays one tap away for spelling.
  - A test makes sure no question plays a single cut sound.
- Blending is the one place that still plays the sounds alone, because joining them is the skill. Its answer choices are whole spoken words.
- **Heart words removed as a taught strand** (owner decision). The learners are adults already frustrated with English, and exceptions are too early for them.
  - The heart-word activity, the "كلمات القلب ♥" lesson section, the ♥ marks and heart-word items in unit checks, the placement test and review are all gone. The placement slot is always a dictation item now.
  - The words themselves (*the, I, is, you, said*…) stay in sentences and texts, because 179 of the 203 sentences use at least one. Learners hear every sentence whole, so these words are picked up by ear and sight, with no rule or exception to learn.
  - The decodability linter still lets them into sentences. Review items for them saved in old progress (`h:`) are no longer offered.
  - This supersedes the heart-word parts of sections 7, 9, 13 and 14.
- **Less to manage at once** (owner decision: the learners are easily overloaded). Choice, reading and pressure are cut, not content.
  - **Fewer required steps.** A unit now needs 5–8 steps instead of 9–14:
    - sounds (sound-match);
    - blending;
    - which word;
    - meaning;
    - dictation;
    - a sentence;
    - the text, where the unit has one;
    - the unit check.

    Capital letters, first/last sound, word build, missing letter and sentence order overlap with these. They stay as optional practice. The unit check and review use only the required formats, so no test question comes in a format the learner has not practised.
  - **One "Continue" button.**
    - The unit page and the home screen show the next step only: "Step 3 of 7 — Which word did you hear? — Continue". After a step, "Continue" opens the next one.
    - The full list of activities is folded under "all activities".
    - The pronunciation tips fold away once the unit is under way, and long word lists show 12 words at a time.

    This removes a choice among up to 14 tiles before every practice. Choice and split attention are extraneous load for novices (Sweller et al. 2019); a single recommended path is the guided sequence that works best for beginners (Kirschner et al. 2006).
  - **Calmer home screen.**
    - Only "Today's lesson", plus review when items are due.
    - Ear training, weak sounds, fluency practice, stage tests and the backup reminder sit under "More".
    - The menu keeps the progress report, backup and install. Sound test, note, placement test, achievements, dark mode and reset are folded under "Settings and help".
  - **Less pressure.**
    - Badges are recorded quietly, with no pop-up during practice, and the points counter is no longer in the header.
    - Fluency practice is untimed by default: 20 words or 10 sentences, scored as "x of y right" and not recorded. The 60/90-second timer is a button the learner chooses, and only timed runs count as fluency scores.
    - Stage benchmarks keep their timed parts because they are measures; they are optional and sit under "More".

---

## 17. References

References were checked against DOI, ERIC or publisher records. Those marked † were located through web-search records of the publisher page but not re-opened for this document.

### Arabic-speaking readers of English
- Alhaisoni, E., Al-Zuoud, K., & Gaudel, D. (2015). Analysis of spelling errors of Saudi beginner learners of English enrolled in an intensive English language program. *English Language Teaching, 8*(3), 185–192. https://doi.org/10.5539/elt.v8n3p185
- Alsadoon, R., & Heift, T. (2015). Textual input enhancement for vowel blindness: A study with Arabic ESL learners. *The Modern Language Journal, 99*(1), 57–79. https://doi.org/10.1111/modl.12188
- Fender, M. (2003). English word recognition and word integration skills of native Arabic- and Japanese-speaking learners of English as a second language. *Applied Psycholinguistics, 24*(2), 289–315. https://doi.org/10.1017/S014271640300016X
- Fender, M. (2008). Spelling knowledge and reading development: Insights from Arab ESL learners. *Reading in a Foreign Language, 20*(1), 19–42.
- Hayes-Harb, R. (2006). Native speakers of Arabic and ESL texts: Evidence for the transfer of written word identification processes. *TESOL Quarterly, 40*(2), 321–339. https://doi.org/10.2307/40264525
- Ibrahim, M. (2018). Explicit versus implicit modes of EFL reading literacy instruction: Using phonological awareness with adult Arab learners. *English Language Teaching, 11*(9), 144–155. https://doi.org/10.5539/elt.v11n9p144
- Martin, K. I. (2024). How a phonics-based intervention, L1 orthography, and item characteristics impact adult ESL spelling knowledge. *Education Sciences, 14*(4), 421. https://doi.org/10.3390/educsci14040421
- Randall, M., & Meara, P. (1988). How Arabs read Roman letters. *Reading in a Foreign Language, 4*(2), 133–145.
- Ryan, A., & Meara, P. (1991). The case of the invisible vowels: Arabic speakers reading English words. *Reading in a Foreign Language, 7*(2), 531–540.
- Saigh, K., & Schmitt, N. (2012). Difficulties with vocabulary word form: The case of Arabic ESL learners. *System, 40*(1), 24–36. https://doi.org/10.1016/j.system.2012.01.005
- Sammour-Shehadeh, R., Kahn-Horwitz, J., & Prior, A. (2023). Spelling English as a foreign language: A narrative review. *Reading and Writing, 36*, 2147–2173. https://doi.org/10.1007/s11145-022-10386-z
- Smith, B. (2001). Arabic speakers. In M. Swan & B. Smith (Eds.), *Learner English* (2nd ed., pp. 195–213). Cambridge University Press. https://doi.org/10.1017/CBO9780511667121.014

### Reading development and phonics
- DfES (2007). *Letters and Sounds: Principles and Practice of High Quality Phonics.* Department for Education and Skills.
- Ehri, L. C. (2014). Orthographic mapping in the acquisition of sight word reading, spelling memory, and vocabulary learning. *Scientific Studies of Reading, 18*(1), 5–21. https://doi.org/10.1080/10888438.2013.819356
- Engelmann, S., & Carnine, D. (1982). *Theory of Instruction: Principles and Applications.* Irvington.
- Gonzalez-Frey, S. M., & Ehri, L. C. (2021). Connected phonation is more effective than segmented phonation for teaching beginning readers to decode unfamiliar words. *Scientific Studies of Reading, 25*(3), 272–285. ERIC EJ1295469.
- Goswami, U., & Bryant, P. (1990). *Phonological Skills and Learning to Read.* Lawrence Erlbaum.
- † Fuchs, L. S., Fuchs, D., Hosp, M. K., & Jenkins, J. R. (2001). Oral reading fluency as an indicator of reading competence: A theoretical, empirical, and historical analysis. *Scientific Studies of Reading, 5*(3), 239–256. https://doi.org/10.1207/S1532799XSSR0503_3
- Gough, P. B., & Tunmer, W. E. (1986). Decoding, reading, and reading disability. *Remedial and Special Education, 7*(1), 6–10. https://doi.org/10.1177/074193258600700104
- LaBerge, D., & Samuels, S. J. (1974). Toward a theory of automatic information processing in reading. *Cognitive Psychology, 6*(2), 293–323. https://doi.org/10.1016/0010-0285(74)90015-2
- McCandliss, B., Beck, I. L., Sandak, R., & Perfetti, C. (2003). Focusing attention on decoding for children with poor reading skills: Design and preliminary tests of the Word Building intervention. *Scientific Studies of Reading, 7*(1), 75–104. https://doi.org/10.1207/S1532799XSSR0701_05
- McGuinness, D. (1997). *Why Our Children Can't Read and What We Can Do About It.* Free Press.
- Mesmer, H. A. E. (2001). Decodable text: A review of what we know. *Reading Research and Instruction, 40*(2), 121–141. https://doi.org/10.1080/19388070109558338
- Perfetti, C. (2007). Reading ability: Lexical quality to comprehension. *Scientific Studies of Reading, 11*(4), 357–383. https://doi.org/10.1080/10888430701530730
- Share, D. L. (1995). Phonological recoding and self-teaching: Sine qua non of reading acquisition. *Cognition, 55*(2), 151–218. https://doi.org/10.1016/0010-0277(94)00645-2
- Therrien, W. J. (2004). Fluency and comprehension gains as a result of repeated reading: A meta-analysis. *Remedial and Special Education, 25*(4), 252–261. https://doi.org/10.1177/07419325040250040801
- Treiman, R. (1985). Onsets and rimes as units of spoken syllables: Evidence from children. *Journal of Experimental Child Psychology, 39*(1), 161–181. https://doi.org/10.1016/0022-0965(85)90034-7
- Wagner, R. K., Torgesen, J. K., Rashotte, C. A., & Pearson, N. A. (2010). *Test of Silent Reading Efficiency and Comprehension (TOSREC).* Pro-Ed.
- Wiley, R. W., & Rapp, B. (2021). The effects of handwriting experience on literacy learning. *Psychological Science, 32*(7), 1086–1103. https://doi.org/10.1177/0956797621993111

### Adult and second-language literacy
- Burt, M., Peyton, J. K., & Adams, R. (2003). *Reading and Adult English Language Learners: A Review of the Research.* Center for Applied Linguistics. ERIC ED482785.
- Condelli, L., Wrigley, H. S., Yoon, K., Cronen, S., & Seburn, M. (2003). *"What Works" Study for Adult ESL Literacy Students: Final Report.* American Institutes for Research / U.S. Department of Education.
- Condelli, L., Cronen, S., Bos, J., Tseng, F., & Altuna, J. (2010). *The Impact of a Reading Intervention for Low-Literate Adult ESL Learners* (NCEE 2011-4003). Institute of Education Sciences.
- † Gorsuch, G., & Taguchi, E. (2008). Repeated reading for developing reading fluency and reading comprehension: The case of EFL learners in Vietnam. *System, 36*(2), 253–278. https://doi.org/10.1016/j.system.2007.09.009
- Greenberg, D., Wise, J. C., Morris, R., Fredrick, L. D., Rodrigo, V., Nanda, A. O., & Pae, H. K. (2011). A randomized control study of instructional approaches for struggling adult readers. *Journal of Research on Educational Effectiveness, 4*(2), 101–117. https://doi.org/10.1080/19345747.2011.555288
- Kruidenier, J. (2002). *Research-Based Principles for Adult Basic Education Reading Instruction.* National Institute for Literacy. ERIC ED472427.
- Lesgold, A. M., & Welch-Ross, M. (Eds.). (2012). *Improving Adult Literacy Instruction: Options for Practice and Research.* National Research Council / National Academies Press. https://doi.org/10.17226/13242
- Piccinin, S., & Dal Maso, S. (2021). Promoting literacy in adult second language learners: A systematic review of effective practices. *Languages, 6*(3), 127. https://doi.org/10.3390/languages6030127
- Vinogradov, P. (2010). Balancing top and bottom: Learner-generated texts for teaching phonics. In T. Wall & M. Leong (Eds.), *Low Educated Second Language and Literacy Acquisition: Proceedings of the 5th Symposium* (pp. 3–14). Bow Valley College. https://doi.org/10.5281/zenodo.8004038

### Frameworks and standards
- Bow Valley College (2011). *Learning for LIFE: An ESL Literacy Curriculum Framework.* Bow Valley College.
- Centre for Canadian Language Benchmarks (2015). *Canadian Language Benchmarks: ESL for Adult Literacy Learners (ALL).* CCLB.
- Council of Europe (2020). *Common European Framework of Reference for Languages: Learning, Teaching, Assessment — Companion Volume.* Council of Europe Publishing.
- Minuz, F., Kurvers, J., Schramm, K., Rocca, L., & Naeb, R. (2022). *Literacy and Second Language Learning for the Linguistic Integration of Adult Migrants (LASLLIAM): Reference Guide.* Council of Europe Publishing.
- Sabatini, J. P., & Bruce, K. M. (2009). *PIAAC Reading Component: A Conceptual Framework* (OECD Education Working Papers No. 33). https://doi.org/10.1787/220367414132

### Vocabulary, practice, fluency and motivation
- Bjork, R. A. (1994). Memory and metamemory considerations in the training of human beings. In J. Metcalfe & A. P. Shimamura (Eds.), *Metacognition: Knowing about Knowing* (pp. 185–205). MIT Press.
- Browne, C., Culligan, B., & Phillips, J. (2013). *The New General Service List* (Version 1.0). http://www.newgeneralservicelist.org
- Black, P., & Wiliam, D. (1998). Assessment and classroom learning. *Assessment in Education: Principles, Policy & Practice, 5*(1), 7–74. https://doi.org/10.1080/0969595980050102
- Cepeda, N. J., Pashler, H., Vul, E., Wixted, J. T., & Rohrer, D. (2006). Distributed practice in verbal recall tasks: A review and quantitative synthesis. *Psychological Bulletin, 132*(3), 354–380. https://doi.org/10.1037/0033-2909.132.3.354
- Chang, A. C.-S., & Millett, S. (2015). Improving reading rates and comprehension through audio-assisted extensive reading for beginner learners. *System, 52*, 91–102. https://doi.org/10.1016/j.system.2015.05.003
- Graham, S., & Hebert, M. (2010). *Writing to Read: Evidence for How Writing Can Improve Reading.* Alliance for Excellent Education.
- Hall, G., & Cook, G. (2012). Own-language use in language teaching and learning. *Language Teaching, 45*(3), 271–308. https://doi.org/10.1017/S0261444812000067
- Kang, S. H. K. (2016). Spaced repetition promotes efficient and effective learning: Policy implications for instruction. *Policy Insights from the Behavioral and Brain Sciences, 3*(1), 12–19. https://doi.org/10.1177/2372732215624708
- Karpicke, J. D., & Roediger, H. L. (2008). The critical importance of retrieval for learning. *Science, 319*(5865), 966–968. https://doi.org/10.1126/science.1152408
- Kirschner, P. A., Sweller, J., & Clark, R. E. (2006). Why minimal guidance during instruction does not work: An analysis of the failure of constructivist, discovery, problem-based, experiential, and inquiry-based teaching. *Educational Psychologist, 41*(2), 75–86. https://doi.org/10.1207/s15326985ep4102_1
- Knowles, M. S., Holton, E. F., & Swanson, R. A. (2015). *The Adult Learner* (8th ed.). Routledge.
- Leitner, S. (1972). *So lernt man lernen.* Herder.
- † Kulik, C.-L. C., Kulik, J. A., & Bangert-Drowns, R. L. (1990). Effectiveness of mastery learning programs: A meta-analysis. *Review of Educational Research, 60*(2), 265–299. https://doi.org/10.3102/00346543060002265
- Laufer, B., & Shmueli, K. (1997). Memorizing new words: Does teaching have anything to do with it? *RELC Journal, 28*(1), 89–108. https://doi.org/10.1177/003368829702800106
- Nation, I. S. P. (2006). How large a vocabulary is needed for reading and listening? *The Canadian Modern Language Review, 63*(1), 59–82. https://doi.org/10.3138/cmlr.63.1.59
- Nation, P. (2007). The four strands. *Innovation in Language Learning and Teaching, 1*(1), 2–13. https://doi.org/10.2167/illt039.0
- Ryan, R. M., & Deci, E. L. (2000). Self-determination theory and the facilitation of intrinsic motivation, social development, and well-being. *American Psychologist, 55*(1), 68–78. https://doi.org/10.1037/0003-066X.55.1.68
- Sailer, M., & Homner, L. (2020). The gamification of learning: A meta-analysis. *Educational Psychology Review, 32*(1), 77–112. https://doi.org/10.1007/s10648-019-09498-w
- Saito, Y., Garza, T. J., & Horwitz, E. K. (1999). Foreign language reading anxiety. *The Modern Language Journal, 83*(2), 202–218. https://doi.org/10.1111/0026-7902.00016
- Settles, B., & Meeder, B. (2016). A trainable spaced repetition model for language learning. In *Proceedings of the 54th Annual Meeting of the ACL* (pp. 1848–1858). https://doi.org/10.18653/v1/P16-1174
- Shute, V. J. (2008). Focus on formative feedback. *Review of Educational Research, 78*(1), 153–189. https://doi.org/10.3102/0034654307313795
- Speer, R. (2022). *wordfreq* (Version 3) [Software and word-frequency data]. https://github.com/rspeer/wordfreq
- † Sweller, J., van Merriënboer, J. J. G., & Paas, F. (2019). Cognitive architecture and instructional design: 20 years later. *Educational Psychology Review, 31*(2), 261–292. https://doi.org/10.1007/s10648-019-09465-5
- Thomson, R. I. (2018). High variability [pronunciation] training (HVPT): A proven technique about which every language teacher and learner ought to know. *Journal of Second Language Pronunciation, 4*(2), 208–231. https://doi.org/10.1075/jslp.17038.tho

### Speech technology
- † Al-Shami, & Cardoso, W. (2025). Text-to-speech-based high-variability phonetic training with Arabic-speaking learners of English. *Canadian Journal of Applied Linguistics, 28*(3), 142–168. https://doi.org/10.37213/cjal.2025.35910
- † Bione, T., & Cardoso, W. (2020). Synthetic voices in the foreign language context. *Language Learning & Technology, 24*(1).
- Craig, S. D., & Schroeder, N. L. (2017). Reconsidering the voice effect when learning from a virtual human. *Computers & Education, 114*, 193–205. https://doi.org/10.1016/j.compedu.2017.07.003
- Qian, M., Chukharev-Hudilainen, E., & Levis, J. (2018). A system for adaptive high-variability segmental perceptual training: Implementation, effectiveness, transfer. *Language Learning & Technology, 22*(1), 69–96.
- † Uchihara, T., Karas, M., & Thomson, R. I. (2025). High variability phonetic training: A meta-analysis. *Studies in Second Language Acquisition.* https://doi.org/10.1017/S0272263125100879

### App evaluation, assessment and usability
- AlGhannam, B. A., Albustan, S. A., Al-Hassan, A. A., & Albustan, L. A. (2018). Towards a standard Arabic System Usability Scale: Psychometric evaluation using communication disorder app. *International Journal of Human–Computer Interaction, 34*(9), 799–804. https://doi.org/10.1080/10447318.2017.1388099
- Anthony, L., & Nation, I. S. P. (2017). *Picture Vocabulary Size Test* (Version 1.2.0) [Software]. Waseda University.
- Chapelle, C. A. (2001). *Computer Applications in Second Language Acquisition: Foundations for Teaching, Testing and Research.* Cambridge University Press. https://doi.org/10.1017/CBO9781139524681
- Hirsh-Pasek, K., Zosh, J. M., Golinkoff, R. M., Gray, J. H., Robb, M. B., & Kaufman, J. (2015). Putting education in "educational" apps: Lessons from the science of learning. *Psychological Science in the Public Interest, 16*(1), 3–34. https://doi.org/10.1177/1529100615569721
- Kane, M. T. (2013). Validating the interpretations and uses of test scores. *Journal of Educational Measurement, 50*(1), 1–73. https://doi.org/10.1111/jedm.12000
- Rosell-Aguilar, F. (2017). State of the app: A taxonomy and framework for evaluating language learning mobile applications. *CALICO Journal, 34*(2), 243–258. https://doi.org/10.1558/cj.27623
- † Ross, S. (1998). Self-assessment in second language testing: A meta-analysis and analysis of experiential factors. *Language Testing, 15*(1), 1–20. https://doi.org/10.1177/026553229801500101
