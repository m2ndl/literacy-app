# Pedagogical Review and Development Plan — لغتي الثانية (My Second Language)

**Purpose:** review the app as a literacy course and plan how to make it the best possible English reading app for **college-level EFL learners at CEFR pre-A1 whose first language is Arabic**.
**Audience:** the app owner, teachers who recommend the app, and developers.
**Status:** this document is the plan. Phase 1 (section 12) is implemented in this repository. Later phases are proposals.

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
13. [References](#13-references)

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
| 3 Consonant clusters | st sp sk sm sn · bl cl fl gl pl sl · br cr dr fr gr pr tr · -st -nd -mp -nt; -ed (/t d ɪd/), -ing | ≈4 | No inserted vowel |
| 4 Long vowels; American r-coloured vowels | a_e i_e o_e u_e; ee/ea; ai/ay; oa/ow; igh/y; oo; ar or er/ir/ur; ou/ow; oi/oy; schwa | ≈6 | Many spellings per vowel: the biggest spelling load |
| 5 Multisyllabic words and morphology | syllable types; un- re- -er -est -ful -ly -tion; stress; campus/academic words | ≈4 | Word families |
| Strands (all stages) | ≈100 most frequent heart words; numbers, days, times; campus signs (EXIT, PUSH, LIBRARY); forms (name, ID, email) | — | Survival and college literacy |

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
| **First/last sound** | First sound only | Alternates first and last sound | Middle sound |
| **Complete the sentence** ("أكمل الجملة", was "بناء الجمل") | Mislabelled; translation visible | Translation shown **after** answering; same-word-class distractors | Real word-order building (adjective before noun) |
| *New, later* | | | Blending (tap each sound → word), dictation, tracing, read-along texts, timed reading, record-and-compare |

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

  Phase 2 adds more voices for perception training.
- **Pronunciation input:** the *misaki* US phonemizer, plus a small hand-checked list of fixes.
- **Isolated speech sounds:**
  - vowels and continuous consonants are synthesised from phoneme input;
  - stop consonants are synthesised as a minimal-vowel syllable and trimmed;
  - any sound that fails quality checks is presented as "sound in a keyword" instead.
- **Post-processing (ffmpeg):**
  - trim leading and trailing silence only;
  - peak-normalise words and sounds;
  - loudness-normalise sentences;
  - encode as **MP3, mono, 24 kHz, 48 kbps**, which every iPhone and Android device can play.
- **Automated quality checks:**
  - duration, silence and clipping;
  - each word and sentence is transcribed back by a speech recogniser (Whisper small.en via sherpa-onnx) and must match;
  - vowel sounds are checked against American English formant norms (Hillenbrand et al. 1995).

  Results are written to `tools/audio/qa-report.json`.

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
- **Storage:** the app asks the browser to keep its storage (`navigator.storage.persist()`). Phase 2 adds Home-Screen install guidance for iPhone, a backup/restore code, and a warning when opened inside in-app browsers (WhatsApp, Instagram).

---

## 9. Assessment inside the app

**Placement test (Phase 2).** About 10 minutes, adaptive, with Arabic instructions. It covers:
- letter sounds;
- vowel minimal pairs;
- real words read for meaning;
- made-up words presented as "brand names";
- heart words;
- a 5-word dictation;
- 3 sentences matched to pictures.

It places the learner at the first unit not yet mastered and lets them test out of units, replacing "unlock all".

**Ongoing tracking.** Logged from Phase 1 and used for adaptation from Phase 2: accuracy, response time and confusion pairs for each grapheme and word.
- Proposed mastery rule: ≥ 90% correct over the last ≥ 8 attempts, spread over ≥ 2 days, with a median response under 2 s on recognition tasks.
- These thresholds should be calibrated in the pilot study.

**Unit check (Phase 4).** 12 mixed items, including 2 pseudowords and 1 mini-text; pass at ≥ 80%.

**Stage benchmarks** are linked to:
- the CEFR Companion Volume (2020) Pre-A1/A1 reading descriptors, e.g. Pre-A1 "Can recognise familiar words accompanied by pictures…";
- the CLB *ESL for Adult Literacy Learners*;
- the *LASLLIAM* technical-literacy scales.

Learners see Arabic can-do statements.

**Learner report:** sounds I know vs sounds to practise, words learned, texts read, and speed over time.

---

## 10. How to evaluate the app

### Tier 1 — Expert review (before and after each phase)

**Rubrics:**
- Chapelle's (2001) six CALL criteria: language-learning potential, learner fit, meaning focus, authenticity, positive impact, practicality;
- Hirsh-Pasek et al.'s (2015) four pillars (active, engaged, meaningful, socially interactive learning);
- Rosell-Aguilar's (2017) taxonomy for language-learning apps;
- the principles in section 4 as a checklist;
- WCAG 2.2 AA for accessibility.

**Automated content metrics** (computed from `data.js` by the test suite):

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

---

## 11. Roadmap

| Phase | Deliverables | Done when |
|---|---|---|
| **1 Foundation** (this release) | This plan; decodable Stage 0–2 curriculum; generated American audio for sounds, words and sentences; iPhone/Android audio engine; explanatory feedback; local error log; curriculum-checking tests | All tests pass; 100% decodable; audio plays on both platforms |
| 2 Learner model | Placement test; item-level mastery; daily spaced review; "practise my weak sounds"; multi-voice perception training; dictation; tracing; word-order sentences; backup code; iPhone install guide; in-app-browser warning | First usability round SUS ≥ 70 |
| 3 Curriculum | Stages 3–5; heart-word strand (≈100); decodable adult readers (campus series) with read-along highlighting and comprehension; campus signs and forms | Content metrics met |
| 4 Fluency & assessment | Timed fluency tasks; record-and-compare reading aloud; unit checks and stage benchmarks; can-do self-assessment | Benchmarks validated in pilot |
| 5 Evaluation | Tier 3 pilot; report; revisions | Report complete |

---

## 12. Phase 1 — what this release changes

*(Updated as Phase 1 is implemented.)*

---

## 13. References

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
- Goswami, U., & Bryant, P. (1990). *Phonological Skills and Learning to Read.* Lawrence Erlbaum.
- Gough, P. B., & Tunmer, W. E. (1986). Decoding, reading, and reading disability. *Remedial and Special Education, 7*(1), 6–10. https://doi.org/10.1177/074193258600700104
- LaBerge, D., & Samuels, S. J. (1974). Toward a theory of automatic information processing in reading. *Cognitive Psychology, 6*(2), 293–323. https://doi.org/10.1016/0010-0285(74)90015-2
- McCandliss, B., Beck, I. L., Sandak, R., & Perfetti, C. (2003). Focusing attention on decoding for children with poor reading skills: Design and preliminary tests of the Word Building intervention. *Scientific Studies of Reading, 7*(1), 75–104. https://doi.org/10.1207/S1532799XSSR0701_05
- McGuinness, D. (1997). *Why Our Children Can't Read and What We Can Do About It.* Free Press.
- Mesmer, H. A. E. (2001). Decodable text: A review of what we know. *Reading Research and Instruction, 40*(2), 121–141. https://doi.org/10.1080/19388070109558338
- Perfetti, C. (2007). Reading ability: Lexical quality to comprehension. *Scientific Studies of Reading, 11*(4), 357–383. https://doi.org/10.1080/10888430701530730
- Share, D. L. (1995). Phonological recoding and self-teaching: Sine qua non of reading acquisition. *Cognition, 55*(2), 151–218. https://doi.org/10.1016/0010-0277(94)00645-2
- Therrien, W. J. (2004). Fluency and comprehension gains as a result of repeated reading: A meta-analysis. *Remedial and Special Education, 25*(4), 252–261. https://doi.org/10.1177/07419325040250040801
- Treiman, R. (1985). Onsets and rimes as units of spoken syllables: Evidence from children. *Journal of Experimental Child Psychology, 39*(1), 161–181. https://doi.org/10.1016/0022-0965(85)90034-7
- Wiley, R. W., & Rapp, B. (2021). The effects of handwriting experience on literacy learning. *Psychological Science, 32*(7), 1086–1103. https://doi.org/10.1177/0956797621993111

### Adult and second-language literacy
- Burt, M., Peyton, J. K., & Adams, R. (2003). *Reading and Adult English Language Learners: A Review of the Research.* Center for Applied Linguistics. ERIC ED482785.
- Condelli, L., Wrigley, H. S., Yoon, K., Cronen, S., & Seburn, M. (2003). *"What Works" Study for Adult ESL Literacy Students: Final Report.* American Institutes for Research / U.S. Department of Education.
- Condelli, L., Cronen, S., Bos, J., Tseng, F., & Altuna, J. (2010). *The Impact of a Reading Intervention for Low-Literate Adult ESL Learners* (NCEE 2011-4003). Institute of Education Sciences.
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
- Cepeda, N. J., Pashler, H., Vul, E., Wixted, J. T., & Rohrer, D. (2006). Distributed practice in verbal recall tasks: A review and quantitative synthesis. *Psychological Bulletin, 132*(3), 354–380. https://doi.org/10.1037/0033-2909.132.3.354
- Chang, A. C.-S., & Millett, S. (2015). Improving reading rates and comprehension through audio-assisted extensive reading for beginner learners. *System, 52*, 91–102. https://doi.org/10.1016/j.system.2015.05.003
- Graham, S., & Hebert, M. (2010). *Writing to Read: Evidence for How Writing Can Improve Reading.* Alliance for Excellent Education.
- Hall, G., & Cook, G. (2012). Own-language use in language teaching and learning. *Language Teaching, 45*(3), 271–308. https://doi.org/10.1017/S0261444812000067
- Karpicke, J. D., & Roediger, H. L. (2008). The critical importance of retrieval for learning. *Science, 319*(5865), 966–968. https://doi.org/10.1126/science.1152408
- Knowles, M. S., Holton, E. F., & Swanson, R. A. (2015). *The Adult Learner* (8th ed.). Routledge.
- Laufer, B., & Shmueli, K. (1997). Memorizing new words: Does teaching have anything to do with it? *RELC Journal, 28*(1), 89–108. https://doi.org/10.1177/003368829702800106
- Nation, P. (2007). The four strands. *Innovation in Language Learning and Teaching, 1*(1), 2–13. https://doi.org/10.2167/illt039.0
- Ryan, R. M., & Deci, E. L. (2000). Self-determination theory and the facilitation of intrinsic motivation, social development, and well-being. *American Psychologist, 55*(1), 68–78. https://doi.org/10.1037/0003-066X.55.1.68
- Sailer, M., & Homner, L. (2020). The gamification of learning: A meta-analysis. *Educational Psychology Review, 32*(1), 77–112. https://doi.org/10.1007/s10648-019-09498-w
- Saito, Y., Garza, T. J., & Horwitz, E. K. (1999). Foreign language reading anxiety. *The Modern Language Journal, 83*(2), 202–218. https://doi.org/10.1111/0026-7902.00016
- Settles, B., & Meeder, B. (2016). A trainable spaced repetition model for language learning. In *Proceedings of the 54th Annual Meeting of the ACL* (pp. 1848–1858). https://doi.org/10.18653/v1/P16-1174
- Shute, V. J. (2008). Focus on formative feedback. *Review of Educational Research, 78*(1), 153–189. https://doi.org/10.3102/0034654307313795
- Thomson, R. I. (2018). High variability [pronunciation] training (HVPT): A proven technique about which every language teacher and learner ought to know. *Journal of Second Language Pronunciation, 4*(2), 208–231. https://doi.org/10.1075/jslp.17038.tho

### Speech technology
- † Al-Shami, & Cardoso, W. (2025). Text-to-speech-based high-variability phonetic training with Arabic-speaking learners of English. *Canadian Journal of Applied Linguistics, 28*(3), 142–168. https://doi.org/10.37213/cjal.2025.35910
- † Bione, T., & Cardoso, W. (2020). Synthetic voices in the foreign language context. *Language Learning & Technology, 24*(1).
- Craig, S. D., & Schroeder, N. L. (2017). Reconsidering the voice effect when learning from a virtual human. *Computers & Education, 114*, 193–205. https://doi.org/10.1016/j.compedu.2017.07.003
- Hillenbrand, J., Getty, L. A., Clark, M. J., & Wheeler, K. (1995). Acoustic characteristics of American English vowels. *Journal of the Acoustical Society of America, 97*(5), 3099–3111. https://doi.org/10.1121/1.411872
- Qian, M., Chukharev-Hudilainen, E., & Levis, J. (2018). A system for adaptive high-variability segmental perceptual training: Implementation, effectiveness, transfer. *Language Learning & Technology, 22*(1), 69–96.
- † Uchihara, T., Karas, M., & Thomson, R. I. (2025). High variability phonetic training: A meta-analysis. *Studies in Second Language Acquisition.* https://doi.org/10.1017/S0272263125100879

### App evaluation and usability
- AlGhannam, B. A., Albustan, S. A., Al-Hassan, A. A., & Albustan, L. A. (2018). Towards a standard Arabic System Usability Scale: Psychometric evaluation using communication disorder app. *International Journal of Human–Computer Interaction, 34*(9), 799–804. https://doi.org/10.1080/10447318.2017.1388099
- Anthony, L., & Nation, I. S. P. (2017). *Picture Vocabulary Size Test* (Version 1.2.0) [Software]. Waseda University.
- Chapelle, C. A. (2001). *Computer Applications in Second Language Acquisition: Foundations for Teaching, Testing and Research.* Cambridge University Press. https://doi.org/10.1017/CBO9781139524681
- Hirsh-Pasek, K., Zosh, J. M., Golinkoff, R. M., Gray, J. H., Robb, M. B., & Kaufman, J. (2015). Putting education in "educational" apps: Lessons from the science of learning. *Psychological Science in the Public Interest, 16*(1), 3–34. https://doi.org/10.1177/1529100615569721
- Rosell-Aguilar, F. (2017). State of the app: A taxonomy and framework for evaluating language learning mobile applications. *CALICO Journal, 34*(2), 243–258. https://doi.org/10.1558/cj.27623
