// data.js - Curriculum data (Phase 1: Stages 0-2). See PEDAGOGY_PLAN.md, section 6.
//
// Every word, sentence and text is checked by tests/curriculum.test.js: a unit may only use
// graphemes taught in that unit or earlier, plus heart words and names already introduced.
// American English pronunciation.

export const DATA_VERSION = 3;

// Grapheme-phoneme correspondences. `ph` is the sound's audio key (audio/.../ph/<ph>.mp3).
// `ar` is an Arabic "bridge" letter when the sound exists in Arabic; `newSound` marks sounds
// Arabic speakers need to learn; `variantOf` marks another spelling of the same sound.
export const gpc = {
  s:  { ph: 's',   ipa: 's',  kw: 'sun',      emoji: '☀️', ar: 'س' },
  a:  { ph: 'ae',  ipa: 'æ',  kw: 'apple',    emoji: '🍎', vowel: true, newSound: true },
  t:  { ph: 't',   ipa: 't',  kw: 'taxi',     emoji: '🚕', ar: 'ت' },
  i:  { ph: 'ih',  ipa: 'ɪ',  kw: 'insect',   emoji: '🐞', vowel: true, newSound: true },
  n:  { ph: 'n',   ipa: 'n',  kw: 'nose',     emoji: '👃', ar: 'ن' },
  p:  { ph: 'p',   ipa: 'p',  kw: 'pen',      emoji: '🖊️', newSound: true },
  m:  { ph: 'm',   ipa: 'm',  kw: 'map',      emoji: '🗺️', ar: 'م' },
  d:  { ph: 'd',   ipa: 'd',  kw: 'door',     emoji: '🚪', ar: 'د' },
  o:  { ph: 'aa',  ipa: 'ɑ',  kw: 'octopus',  emoji: '🐙', vowel: true, newSound: true },
  g:  { ph: 'g',   ipa: 'ɡ',  kw: 'gift',     emoji: '🎁' },
  c:  { ph: 'k',   ipa: 'k',  kw: 'cup',      emoji: '☕', ar: 'ك' },
  k:  { ph: 'k',   ipa: 'k',  kw: 'key',      emoji: '🔑', ar: 'ك', variantOf: 'c' },
  ck: { ph: 'k',   ipa: 'k',  kw: 'sock',     emoji: '🧦', ar: 'ك', variantOf: 'c' },
  e:  { ph: 'eh',  ipa: 'ɛ',  kw: 'egg',      emoji: '🥚', vowel: true, newSound: true },
  u:  { ph: 'uh',  ipa: 'ʌ',  kw: 'umbrella', emoji: '☂️', vowel: true, newSound: true },
  r:  { ph: 'r',   ipa: 'ɹ',  kw: 'red',      emoji: '🔴', ar: 'ر' },
  h:  { ph: 'h',   ipa: 'h',  kw: 'hat',      emoji: '🎩', ar: 'هـ' },
  b:  { ph: 'b',   ipa: 'b',  kw: 'bus',      emoji: '🚌', ar: 'ب' },
  f:  { ph: 'f',   ipa: 'f',  kw: 'fish',     emoji: '🐟', ar: 'ف' },
  ff: { ph: 'f',   ipa: 'f',  kw: 'off',      emoji: '📴', ar: 'ف', variantOf: 'f' },
  l:  { ph: 'l',   ipa: 'l',  kw: 'laptop',   emoji: '💻', ar: 'ل' },
  ll: { ph: 'l',   ipa: 'l',  kw: 'bell',     emoji: '🔔', ar: 'ل', variantOf: 'l' },
  ss: { ph: 's',   ipa: 's',  kw: 'glass',    emoji: '🥛', ar: 'س', variantOf: 's' },
  j:  { ph: 'jh',  ipa: 'dʒ', kw: 'jacket',   emoji: '🧥', ar: 'ج' },
  v:  { ph: 'v',   ipa: 'v',  kw: 'van',      emoji: '🚐', newSound: true },
  w:  { ph: 'w',   ipa: 'w',  kw: 'watch',    emoji: '⌚', ar: 'و' },
  x:  { ph: 'ks',  ipa: 'ks', kw: 'box',      emoji: '📦', ar: 'كس' },
  y:  { ph: 'y',   ipa: 'j',  kw: 'yes',      emoji: '✅', ar: 'ي' },
  z:  { ph: 'z',   ipa: 'z',  kw: 'zero',     emoji: '0️⃣', ar: 'ز' },
  zz: { ph: 'z',   ipa: 'z',  kw: 'buzz',     emoji: '🐝', ar: 'ز', variantOf: 'z' },
  qu: { ph: 'kw',  ipa: 'kw', kw: 'queen',    emoji: '👑', ar: 'كو' },
  sh: { ph: 'sh',  ipa: 'ʃ',  kw: 'ship',     emoji: '🚢', ar: 'ش' },
  ch: { ph: 'ch',  ipa: 'tʃ', kw: 'chair',    emoji: '🪑', ar: 'تش' },
  th: { ph: 'th',  ipa: 'θ',  kw: 'three',    emoji: '3️⃣', ar: 'ث', alt: { ph: 'dh', ipa: 'ð', kw: 'this', emoji: '👉', ar: 'ذ' } },
  ng: { ph: 'ng',  ipa: 'ŋ',  kw: 'ring',     emoji: '💍', newSound: true },
  nk: { ph: 'ngk', ipa: 'ŋk', kw: 'bank',     emoji: '🏦' },
  wh: { ph: 'w',   ipa: 'w',  kw: 'what',     emoji: '❓', ar: 'و', variantOf: 'w' }
};

// The English alphabet (for letter names and capital/small matching).
export const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');

// Arabic labels and descriptions for activity cards.
export const ACTIVITY_META = {
  'sound-match':       { title: 'اسمع الصوت',              desc: 'استمع إلى الصوت واختر الحرف الذي يمثّله.',           icon: '🔊' },
  'capital-match':     { title: 'الحروف الكبيرة والصغيرة', desc: 'طابق بين شكل الحرف الكبير والصغير.',                 icon: '🔠' },
  'which-word':        { title: 'أيّ كلمة سمعت؟',          desc: 'استمع وميّز بين كلمات متشابهة مثل pin / pen / pan.',  icon: '👂' },
  'word-build':        { title: 'ابنِ الكلمة',              desc: 'استمع ثم كوّن الكلمة صوتًا صوتًا.',                   icon: '🧩' },
  'missing-letter':    { title: 'الحرف الناقص',            desc: 'استمع وأكمل الحرف الناقص، وانتبه لحروف العلة.',      icon: '✍️' },
  'meaning':           { title: 'ما معنى الكلمة؟',         desc: 'اقرأ الكلمة واختر معناها بالعربية.',                  icon: '💡' },
  'first-last-sound':  { title: 'الصوت الأول والأخير',     desc: 'حدّد الصوت في أول الكلمة أو في آخرها.',              icon: '🎯' },
  'complete-sentence': { title: 'أكمل الجملة',             desc: 'استمع إلى الجملة واختر الكلمة الناقصة.',             icon: '📝' },
  'read-text':         { title: 'اقرأ وافهم',              desc: 'اقرأ نصًا قصيرًا وأجب بـ «نعم» أو «لا».',             icon: '📖' },
  'tracing':           { title: 'اكتب الحرف',              desc: 'شاهد كيف يُكتب الحرف، ثم تتبّعه بإصبعك، ثم اكتبه وحدك.', icon: '✏️', optional: true },
  'dictation':         { title: 'إملاء',                   desc: 'استمع إلى الكلمة واكتبها بلوحة المفاتيح الإنجليزية.',  icon: '⌨️' },
  'heart-words':       { title: 'كلمات القلب',             desc: 'استمع واختر الكتابة الصحيحة لكلمة شائعة.',            icon: '♥' },
  'sentence-build':    { title: 'رتّب الجملة',             desc: 'رتّب الكلمات لتكوّن جملة إنجليزية صحيحة.',            icon: '🔀' }
};

// Arabic feedback hints: first by the exact pair of graphemes confused (sorted, joined by |),
// then by error type (see classifyError in phonics.js).
export const HINTS = {
  pairs: {
    'b|p': 'p بلا صوت ومع نفخة هواء، و b بصوت مثل «ب». ضع يدك أمام فمك وقارن.',
    'f|v': 'v مثل «ف» لكن مع اهتزاز الحنجرة. أما f فبلا اهتزاز.',
    'v|w': 'في v تلمس الأسنانُ الشفةَ السفلى، وفي w تستدير الشفتان مثل «و».',
    'j|y': 'j مثل «ج»، و y مثل «ي».',
    'ch|sh': 'sh مثل «ش»، و ch مثل «تش».',
    's|sh': 's مثل «س»، و sh مثل «ش».',
    't|th': 'th مثل «ث» أو «ذ»: طرف اللسان بين الأسنان. أما t فمثل «ت».',
    's|th': 'th مثل «ث»: طرف اللسان بين الأسنان. أما s فمثل «س».',
    'n|ng': 'ng صوت أنفي من مؤخرة الفم بلا «g» في آخره: sing. أما n فمثل «ن».',
    'ng|nk': 'nk = صوت ng ثم k: sink. أما ng فلا ينتهي بـ k: sing.',
    'b|d': 'b: الخط أولًا ثم الدائرة. d: الدائرة أولًا ثم الخط.',
    'p|q': 'p: الدائرة يمين الخط. q: الدائرة يسار الخط.',
    'e|i': 'i قصيرة مثل الكسرة: pin. و e أكثر انفتاحًا: pen.',
    'a|e': 'a: الفم مفتوح أكثر (pan). و e: أقل انفتاحًا (pen).',
    'a|i': 'a: الفم مفتوح (pan). و i: قصيرة مثل الكسرة (pin).',
    'o|u': 'o: الفم مفتوح أكثر مثل «آ» قصيرة (hot). و u: صوت قصير مسترخٍ (hut).',
    'a|u': 'a: الفم مفتوح ومشدود (cat). و u: صوت قصير مسترخٍ (cut).',
    'a|o': 'a: مثل الفتحة مع ابتسامة (cat). و o: الفم مفتوح أكثر إلى الأسفل (cot).',
    'k|qu': 'qu صوتان: k ثم w، مثل «كو».',
    's|x': 'x صوتان: k ثم s، مثل «كس».',
    'd|t': 'd بصوت مثل «د»، و t بلا صوت مثل «ت».',
    'g|k': 'g بصوت، و k بلا صوت مثل «ك».',
    's|z': 'z بصوت مثل «ز»، و s بلا صوت مثل «س».'
  },
  types: {
    vowel: 'استمع جيدًا إلى حرف العلة في وسط الكلمة.',
    voicing: 'الفرق في اهتزاز الحنجرة: ضع يدك على حلقك وقل الصوتين.',
    'visual-voicing': 'انتبه للصوت وللشكل معًا.',
    visual: 'انتبه لشكل الحرف واتجاهه.',
    sound: 'صوتان متقاربان: استمع مرة أخرى وقارن.',
    other: 'استمع مرة أخرى وانظر إلى الحروف جيدًا.'
  }
};

// Order: hear and recognise -> build and write -> meaning -> sentences.
const LETTER_UNIT = ['sound-match', 'capital-match', 'tracing', 'which-word', 'first-last-sound', 'word-build', 'missing-letter',
  'dictation', 'meaning', 'heart-words', 'complete-sentence', 'sentence-build'];
const DIGRAPH_UNIT = ['sound-match', 'which-word', 'first-last-sound', 'word-build', 'missing-letter', 'dictation', 'meaning',
  'heart-words', 'complete-sentence', 'sentence-build'];
// Unit 1 has too few sentences of three or more words for "sentence order".
const FIRST_UNIT = LETTER_UNIT.filter(a => a !== 'sentence-build');

// Word fields: w = word, ar = Arabic meaning, emoji (concrete nouns only),
// group = near-synonyms that must not be offered as each other's distractors,
// split = syllables of a two-syllable word.
// Heart words: mark puts the "tricky" part in [brackets].
// pseudo = made-up "brand names" for the placement test (decodable, not English words); each has two
// spoken foils: a vowel misreading and a consonant misreading.
export const units = [
  {
    id: 1,
    title: 'الوحدة ١',
    graphemes: ['s', 'a', 't', 'i', 'n', 'p'],
    words: [
      { w: 'at', ar: 'عند / في', group: 'prep' },
      { w: 'it', ar: 'هو / هي (لغير العاقل)', group: 'pron' },
      { w: 'in', ar: 'في / داخل', group: 'prep' },
      { w: 'sit', ar: 'يجلس', group: 'sit' },
      { w: 'sat', ar: 'جلسَ', group: 'sit' },
      { w: 'pin', ar: 'دبّوس', emoji: '📌' },
      { w: 'tip', ar: 'نصيحة', emoji: '💡' },
      { w: 'tap', ar: 'ينقر (على الشاشة)', emoji: '👆' },
      { w: 'nap', ar: 'قيلولة', emoji: '😴' },
      { w: 'pan', ar: 'مقلاة', emoji: '🍳' },
      { w: 'tin', ar: 'علبة معدنية', emoji: '🥫' },
      { w: 'sip', ar: 'رشفة' }
    ],
    heart: [
      { w: 'I', ar: 'أنا', mark: '[I]' },
      { w: 'a', ar: 'أداة نكرة (واحد)', mark: '[a]' },
      { w: 'is', ar: 'يكون (هو / هي)', mark: 'i[s]' }
    ],
    contrasts: [['sat', 'sit'], ['tap', 'tip'], ['pan', 'pin']],
    pseudo: [{ w: 'nis', foils: ['nas', 'niz'] }, { w: 'nin', foils: ['nan', 'nim'] }, { w: 'tis', foils: ['tas', 'dis'] }],
    sentences: [
      { text: 'It is a pin.', missing: 'pin', ar: 'إنه دبّوس.' },
      { text: 'It is a tip.', missing: 'tip', ar: 'إنها نصيحة.' },
      { text: 'Tap it.', missing: 'tap', ar: 'انقر عليه.' },
      { text: 'I sit.', missing: 'sit', ar: 'أنا أجلس.' },
      { text: 'I sat.', missing: 'sat', ar: 'جلستُ.' },
      { text: 'It is in a tin.', missing: 'tin', ar: 'إنه في علبة معدنية.' },
      { text: 'I nap.', missing: 'nap', ar: 'آخذ قيلولة.' }
    ],
    tips: [
      'الإنجليزية تُقرأ من اليسار إلى اليمين →',
      'في الإنجليزية تُكتب حروف العلة دائمًا (a, i) — لا تتجاهلها، فهي تغيّر الكلمة: pan ≠ pin.',
      'اضغط على الحرف لتسمع صوته، واضغط «اسم الحرف» لتسمع اسمه. في القراءة نستخدم الصوت لا الاسم.',
      'p صوت جديد: مثل «ب» لكن بلا اهتزاز في الحنجرة، ومع نفخة هواء.'
    ],
    activities: FIRST_UNIT
  },
  {
    id: 2,
    title: 'الوحدة ٢',
    graphemes: ['m', 'd', 'o', 'g'],
    words: [
      { w: 'am', ar: 'أكون (مع I)' },
      { w: 'on', ar: 'على / يعمل (الجهاز)' },
      { w: 'not', ar: 'لا / ليس' },
      { w: 'top', ar: 'قمّة' },
      { w: 'pot', ar: 'قِدر', emoji: '🍲' },
      { w: 'dot', ar: 'نقطة' },
      { w: 'got', ar: 'حصلَ على', group: 'get' },
      { w: 'mom', ar: 'أمّ' },
      { w: 'dad', ar: 'أب' },
      { w: 'map', ar: 'خريطة', emoji: '🗺️' },
      { w: 'mat', ar: 'حصيرة' },
      { w: 'man', ar: 'رجل' },
      { w: 'mad', ar: 'غاضب', emoji: '😠', group: 'feel' },
      { w: 'sad', ar: 'حزين', emoji: '😢', group: 'feel' },
      { w: 'did', ar: 'فعلَ' },
      { w: 'dig', ar: 'يحفر' },
      { w: 'dip', ar: 'يغمس' },
      { w: 'gas', ar: 'وقود (بنزين)', emoji: '⛽' },
      { w: 'tag', ar: 'بطاقة (وسم)', emoji: '🏷️' },
      { w: 'dog', ar: 'كلب', emoji: '🐕' },
      { w: 'mop', ar: 'ممسحة' }
    ],
    heart: [
      { w: 'the', ar: 'الـ (أداة تعريف)', mark: '[th][e]' },
      { w: 'and', ar: 'و', mark: 'a[nd]' },
      { w: 'to', ar: 'إلى', mark: 't[o]' },
      { w: 'go', ar: 'يذهب', mark: 'g[o]' },
      { w: 'no', ar: 'لا', mark: 'n[o]' },
      { w: 'so', ar: 'لذلك / جدًا', mark: 's[o]' }
    ],
    names: [{ w: 'Sam', ar: 'سام' }, { w: 'Tom', ar: 'توم' }],
    contrasts: [['top', 'tap', 'tip'], ['mop', 'map'], ['dig', 'dog'], ['did', 'dad'], ['map', 'nap']],
    pseudo: [{ w: 'nid', foils: ['ned', 'nit'] }, { w: 'mip', foils: ['mep', 'nip'] }, { w: 'tid', foils: ['tod', 'did'] }, { w: 'mog', foils: ['mag', 'mok'] }],
    sentences: [
      { text: 'I am Sam.', missing: 'am', ar: 'أنا سام.' },
      { text: 'Sam got a map.', missing: 'map', ar: 'حصل سام على خريطة.' },
      { text: 'The dog is on the mat.', missing: 'dog', ar: 'الكلب على الحصيرة.' },
      { text: 'It is not on.', missing: 'not', ar: 'إنه لا يعمل.' },
      { text: 'Go to the top.', missing: 'top', ar: 'اذهب إلى القمّة.' },
      { text: 'Sam and Tom sit.', missing: 'sit', ar: 'سام وتوم يجلسان.' },
      { text: 'Tom is sad.', missing: 'sad', ar: 'توم حزين.' },
      { text: 'Dip it in the pot.', missing: 'pot', ar: 'اغمسه في القِدر.' }
    ],
    tips: [
      'o في الإنجليزية الأمريكية صوت قصير مفتوح قريب من «آ» القصيرة: not, top.',
      'm و n متشابهان: m لها قوسان، و n لها قوس واحد.',
      'the و and و to: كلمات شائعة جدًا تُحفظ كما هي (كلمات القلب ♥).',
      'go و no و so: حرف o في آخر الكلمة يُنطق مثل اسمه «أو».'
    ],
    activities: LETTER_UNIT
  },
  {
    id: 3,
    title: 'الوحدة ٣',
    graphemes: ['c', 'k', 'ck', 'e'],
    words: [
      { w: 'can', ar: 'يستطيع', group: 'can' },
      { w: 'cat', ar: 'قطة', emoji: '🐈' },
      { w: 'cap', ar: 'كاب (قبعة رياضية)', emoji: '🧢', group: 'hat' },
      { w: 'kid', ar: 'طفل', emoji: '🧒' },
      { w: 'kit', ar: 'عُدّة (مجموعة أدوات)', emoji: '🧰' },
      { w: 'pen', ar: 'قلم', emoji: '🖊️' },
      { w: 'ten', ar: 'عشرة', emoji: '🔟' },
      { w: 'net', ar: 'شبكة (شبكة صيد)', group: 'net' },
      { w: 'men', ar: 'رجال' },
      { w: 'met', ar: 'قابلَ' },
      { w: 'set', ar: 'مجموعة / يضبط' },
      { w: 'get', ar: 'يحصل على', group: 'get' },
      { w: 'neck', ar: 'رقبة' },
      { w: 'sock', ar: 'جورب', emoji: '🧦' },
      { w: 'pick', ar: 'يختار' },
      { w: 'sick', ar: 'مريض', emoji: '🤒' },
      { w: 'kick', ar: 'يركل' },
      { w: 'pack', ar: 'يحزم (الأمتعة)' },
      { w: 'pet', ar: 'حيوان أليف' }
    ],
    heart: [
      { w: 'you', ar: 'أنت / أنتم', mark: 'y[ou]' },
      { w: 'he', ar: 'هو', mark: 'h[e]' },
      { w: 'we', ar: 'نحن', mark: 'w[e]' },
      { w: 'me', ar: 'ـني / لي (المتكلم)', mark: 'm[e]' },
      { w: 'be', ar: 'يكون', mark: 'b[e]' }
    ],
    names: [{ w: 'Ken', ar: 'كِن' }],
    contrasts: [['pen', 'pin', 'pan'], ['ten', 'tin'], ['men', 'man'], ['pet', 'pot'], ['set', 'sit', 'sat'], ['net', 'not']],
    pseudo: [{ w: 'kep', foils: ['kip', 'keb'] }, { w: 'dack', foils: ['deck', 'tack'] }, { w: 'kem', foils: ['kim', 'gem'] }, { w: 'ked', foils: ['kid', 'ket'] }],
    sentences: [
      { text: 'It is ten to ten.', missing: 'ten', ar: 'الساعة العاشرة إلا عشر دقائق.' },
      { text: 'I can get a pen.', missing: 'pen', ar: 'أستطيع أن أحصل على قلم.' },
      { text: 'He is sick.', missing: 'sick', ar: 'هو مريض.' },
      { text: 'We can sit.', missing: 'can', ar: 'نستطيع أن نجلس.' },
      { text: 'Can you pick a pen?', missing: 'pick', ar: 'هل تستطيع أن تختار قلمًا؟' },
      { text: 'Ken met ten men.', missing: 'met', ar: 'قابل كِن عشرة رجال.' },
      { text: 'Get me a cap.', missing: 'cap', ar: 'أحضر لي كابًا.' },
      { text: 'The kid is sick.', missing: 'kid', ar: 'الطفل مريض.' }
    ],
    tips: [
      'c و k و ck لها صوت واحد مثل «ك»: cat, kid, sock.',
      'ck تأتي في آخر الكلمة بعد حرف علة قصير: neck, pick.',
      'e صوت قصير مثل الكسرة المفتوحة: pen. انتبه للفرق: pin – pen – pan.',
      'he و we و me و be: حرف e في آخر الكلمة يُنطق مثل اسمه «إي».'
    ],
    activities: LETTER_UNIT
  },
  {
    id: 4,
    title: 'الوحدة ٤',
    graphemes: ['u', 'r', 'h', 'b'],
    words: [
      { w: 'up', ar: 'فوق', emoji: '⬆️' },
      { w: 'us', ar: 'ـنا (ضمير: لنا / إيانا)', group: 'pron' },
      { w: 'but', ar: 'لكن' },
      { w: 'cut', ar: 'يقطع', emoji: '✂️', group: 'cut' },
      { w: 'cup', ar: 'كوب', emoji: '☕' },
      { w: 'sun', ar: 'شمس', emoji: '☀️', group: 'sun' },
      { w: 'run', ar: 'يجري', emoji: '🏃', group: 'run' },
      { w: 'bus', ar: 'حافلة', emoji: '🚌' },
      { w: 'bug', ar: 'حشرة / خلل برمجي', emoji: '🐛' },
      { w: 'hot', ar: 'ساخن / حار', emoji: '🔥' },
      { w: 'hat', ar: 'قبّعة', emoji: '🎩', group: 'hat' },
      { w: 'hit', ar: 'يضرب' },
      { w: 'him', ar: 'ـه (هو - مفعول به)', group: 'pron' },
      { w: 'had', ar: 'كان لديه' },
      { w: 'red', ar: 'أحمر', emoji: '🔴' },
      { w: 'bad', ar: 'سيئ', emoji: '👎' },
      { w: 'bag', ar: 'حقيبة', emoji: '👜', group: 'bag' },
      { w: 'bed', ar: 'سرير', emoji: '🛏️' },
      { w: 'big', ar: 'كبير' },
      { w: 'bin', ar: 'سلة مهملات', emoji: '🗑️' },
      { w: 'back', ar: 'ظهر / يعود' },
      { w: 'cab', ar: 'سيارة أجرة', emoji: '🚕' }
    ],
    heart: [
      { w: 'are', ar: 'يكونون / تكون', mark: '[are]' },
      { w: 'was', ar: 'كان', mark: 'w[a][s]' },
      { w: 'of', ar: 'من (للملكية والجزء)', mark: '[o][f]' },
      { w: 'has', ar: 'لديه', mark: 'ha[s]' },
      { w: 'his', ar: 'ـه (ملكه)', mark: 'hi[s]' }
    ],
    names: [{ w: 'Ali', ar: 'علي' }],
    contrasts: [['pin', 'bin'], ['pack', 'back'], ['cap', 'cab'], ['cup', 'cap'], ['cut', 'cat'], ['hot', 'hat', 'hit'], ['bag', 'big', 'bug'], ['bad', 'dad'], ['big', 'dig']],
    pseudo: [{ w: 'hib', foils: ['heb', 'hid'] }, { w: 'bup', foils: ['bop', 'pup'] }, { w: 'rab', foils: ['rub', 'rad'] }, { w: 'nug', foils: ['nog', 'nuk'] }],
    sentences: [
      { text: 'The bus is red.', missing: 'red', ar: 'الحافلة حمراء.' },
      { text: 'I can run.', missing: 'run', ar: 'أستطيع أن أجري.' },
      { text: 'He has a big bag.', missing: 'bag', ar: 'لديه حقيبة كبيرة.' },
      { text: 'Get up!', missing: 'up', ar: 'انهض!' },
      { text: 'The cup is hot.', missing: 'hot', ar: 'الكوب ساخن.' },
      { text: 'Ali has a red cab.', missing: 'cab', ar: 'لدى علي سيارة أجرة حمراء.' },
      { text: 'His bag is on the bus.', missing: 'bus', ar: 'حقيبته في الحافلة.' },
      { text: 'We are back.', missing: 'back', ar: 'لقد عدنا.' },
      { text: 'It was a bad bug.', missing: 'bug', ar: 'كان خللًا سيئًا.' }
    ],
    tips: [
      'b مثل «ب». أما p فبلا صوت ومع نفخة هواء. ضع يدك أمام فمك وقل: pin ثم bin.',
      'b و d متشابهان: في b الخط أولًا ثم الدائرة، وفي d الدائرة أولًا ثم الخط.',
      'u في cup صوت قصير قريب من الفتحة الخفيفة.',
      'r الأمريكية لا تُكرَّر مثل الراء العربية: اللسان لا يلمس سقف الفم.',
      'حرف s في is و has و his يُنطق /z/ مثل «ز».'
    ],
    activities: LETTER_UNIT
  },
  {
    id: 5,
    title: 'الوحدة ٥',
    graphemes: ['f', 'l', 'ff', 'll', 'ss'],
    rules: ['doubles'],
    words: [
      { w: 'if', ar: 'إذا' },
      { w: 'off', ar: 'مُطفأ', emoji: '📴' },
      { w: 'fan', ar: 'مروحة' },
      { w: 'fun', ar: 'متعة', emoji: '🎉' },
      { w: 'fit', ar: 'لائق / يناسب' },
      { w: 'fell', ar: 'سقطَ' },
      { w: 'lab', ar: 'مختبر', emoji: '🧪' },
      { w: 'let', ar: 'دَعْ / يسمح' },
      { w: 'leg', ar: 'ساق', emoji: '🦵' },
      { w: 'lip', ar: 'شفة', emoji: '👄' },
      { w: 'lot', ar: 'الكثير (a lot)', group: 'many' },
      { w: 'lock', ar: 'قفل', emoji: '🔒' },
      { w: 'luck', ar: 'حظ', emoji: '🍀' },
      { w: 'less', ar: 'أقل' },
      { w: 'miss', ar: 'يفوّت / يشتاق' },
      { w: 'pass', ar: 'ينجح / يمرّ' },
      { w: 'boss', ar: 'مدير' },
      { w: 'bell', ar: 'جرس', emoji: '🔔' },
      { w: 'tell', ar: 'يُخبر' },
      { w: 'sell', ar: 'يبيع' },
      { w: 'mess', ar: 'فوضى' },
      { w: 'fill', ar: 'يملأ' },
      { w: 'app', ar: 'تطبيق', emoji: '📱' },
      { w: 'add', ar: 'يُضيف', emoji: '➕' },
      { w: 'egg', ar: 'بيضة', emoji: '🥚' },
      { w: 'bill', ar: 'فاتورة', emoji: '🧾' },
      { w: 'odd', ar: 'فردي / غريب' }
    ],
    heart: [
      { w: 'do', ar: 'يفعل', mark: 'd[o]' },
      { w: 'have', ar: 'يملك / لديّ', mark: 'ha[ve]' },
      { w: 'for', ar: 'لـ / من أجل', mark: 'f[or]' },
      { w: 'or', ar: 'أو', mark: '[or]' }
    ],
    names: [{ w: 'Sara', ar: 'سارة' }],
    contrasts: [['fan', 'pan'], ['fun', 'fan'], ['miss', 'mess'], ['bell', 'bill'], ['fill', 'fell'], ['lock', 'luck'], ['add', 'odd'], ['let', 'lot']],
    pseudo: [{ w: 'fep', foils: ['fip', 'vep'] }, { w: 'lig', foils: ['lag', 'lik'] }, { w: 'duss', foils: ['dass', 'tuss'] }, { w: 'loff', foils: ['luff', 'lov'] }],
    sentences: [
      { text: 'Do not miss the bus!', missing: 'miss', ar: 'لا تفوّت الحافلة!' },
      { text: 'I can pass.', missing: 'pass', ar: 'أستطيع أن أنجح.' },
      { text: 'I have a lab at ten.', missing: 'lab', ar: 'لديّ مختبر الساعة العاشرة.' },
      { text: 'Is the app on or off?', missing: 'off', ar: 'هل التطبيق يعمل أم مُطفأ؟' },
      { text: 'Tell the boss.', missing: 'tell', ar: 'أخبر المدير.' },
      { text: 'Fill the cup.', missing: 'fill', ar: 'املأ الكوب.' },
      { text: 'Add it to the bill.', missing: 'bill', ar: 'أضفه إلى الفاتورة.' },
      { text: 'It is a lot of fun.', missing: 'fun', ar: 'إنه ممتع جدًا.' }
    ],
    tips: [
      'ff و ll و ss: حرفان متشابهان = صوت واحد: off, bell, miss.',
      'وكذلك pp و dd و gg: app, add, egg.',
      'حرف l الصغير يشبه I الكبيرة في بعض الخطوط. انتبه للسياق.',
      'f مثل «ف».'
    ],
    activities: LETTER_UNIT
  },
  {
    id: 6,
    title: 'الوحدة ٦',
    graphemes: ['j', 'v', 'w', 'x', 'y', 'z', 'zz', 'qu'],
    words: [
      { w: 'job', ar: 'وظيفة', emoji: '💼' },
      { w: 'jet', ar: 'طائرة نفاثة', emoji: '✈️' },
      { w: 'jog', ar: 'يهرول', group: 'run' },
      { w: 'jam', ar: 'مربّى / زحمة مرور' },
      { w: 'van', ar: 'شاحنة صغيرة (فان)', emoji: '🚐' },
      { w: 'vet', ar: 'طبيب بيطري' },
      { w: 'wet', ar: 'مبلّل', emoji: '💧' },
      { w: 'web', ar: 'الإنترنت (الويب)', emoji: '🌐', group: 'net' },
      { w: 'win', ar: 'يفوز', emoji: '🏆' },
      { w: 'well', ar: 'بخير / جيدًا' },
      { w: 'will', ar: 'سوف' },
      { w: 'box', ar: 'صندوق', emoji: '📦' },
      { w: 'six', ar: 'ستة', emoji: '6️⃣' },
      { w: 'fix', ar: 'يُصلح', emoji: '🔧' },
      { w: 'mix', ar: 'يخلط' },
      { w: 'tax', ar: 'ضريبة' },
      { w: 'yes', ar: 'نعم', emoji: '✅' },
      { w: 'yet', ar: 'بعدُ / حتى الآن' },
      { w: 'yell', ar: 'يصرخ' },
      { w: 'zip', ar: 'سحّاب', emoji: '🤐' },
      { w: 'buzz', ar: 'طنين', emoji: '🐝' },
      { w: 'quiz', ar: 'اختبار قصير', emoji: '📝' },
      { w: 'quit', ar: 'يترك / يستقيل' },
      { w: 'quick', ar: 'سريع', emoji: '⚡' }
    ],
    heart: [
      { w: 'what', ar: 'ماذا / ما', mark: 'wh[a]t' },
      { w: 'where', ar: 'أين', mark: 'wh[ere]' },
      { w: 'one', ar: 'واحد', mark: '[one]' },
      { w: 'two', ar: 'اثنان', mark: 't[wo]' }
    ],
    names: [{ w: 'Max', ar: 'ماكس' }],
    contrasts: [['fan', 'van'], ['vet', 'wet'], ['jet', 'yet'], ['quit', 'kit'], ['quick', 'kick'], ['mix', 'miss'], ['zip', 'sip'], ['buzz', 'bus'], ['fix', 'fit']],
    pseudo: [{ w: 'jub', foils: ['jib', 'yub'] }, { w: 'vap', foils: ['vip', 'fap'] }, { w: 'zep', foils: ['zip', 'sep'] }, { w: 'wex', foils: ['wix', 'vex'] }],
    sentences: [
      { text: 'What is in the box?', missing: 'box', ar: 'ماذا يوجد في الصندوق؟' },
      { text: 'Yes, I can fix it.', missing: 'fix', ar: 'نعم، أستطيع إصلاحه.' },
      { text: 'I have a quiz at six.', missing: 'quiz', ar: 'لديّ اختبار قصير الساعة السادسة.' },
      { text: 'Where is the van?', missing: 'van', ar: 'أين الفان؟' },
      { text: 'I will get a job.', missing: 'job', ar: 'سأحصل على وظيفة.' },
      { text: 'Max is not back yet.', missing: 'yet', ar: 'لم يعد ماكس بعد.' },
      { text: 'Quick, get on the bus!', missing: 'quick', ar: 'بسرعة، اركب الحافلة!' },
      { text: 'Do not yell!', missing: 'yell', ar: 'لا تصرخ!' },
      { text: 'Sara is well.', missing: 'well', ar: 'سارة بخير.' },
      { text: 'I will pass.', missing: 'will', ar: 'سوف أنجح.' }
    ],
    tips: [
      'v صوت جديد: مثل «ف» لكن مع اهتزاز الحنجرة: van ≠ fan.',
      'w مثل «و»: wet. ولا تخلط بينها وبين v: wet ≠ vet.',
      'j مثل «ج»: job. و y في أول الكلمة مثل «ي»: yes. انتبه: jet ≠ yet.',
      'x صوتان معًا /ks/ مثل «كس»: box, six.',
      'qu تُنطق /kw/ قريبًا من «كو»: quiz.'
    ],
    activities: LETTER_UNIT
  },
  {
    id: 7,
    title: 'الوحدة ٧',
    graphemes: ['sh', 'ch', 'th'],
    rules: ['plural-s'],
    words: [
      { w: 'ship', ar: 'سفينة', emoji: '🚢' },
      { w: 'shop', ar: 'متجر', emoji: '🏪' },
      { w: 'shut', ar: 'مُغلق / يُغلق' },
      { w: 'cash', ar: 'نقود (كاش)', emoji: '💵' },
      { w: 'fish', ar: 'سمك', emoji: '🐟' },
      { w: 'dish', ar: 'طبق', emoji: '🍽️' },
      { w: 'wish', ar: 'يتمنّى / أمنية' },
      { w: 'rush', ar: 'يستعجل' },
      { w: 'chip', ar: 'رقاقة / شريحة' },
      { w: 'chat', ar: 'دردشة', emoji: '💬' },
      { w: 'chin', ar: 'ذقن' },
      { w: 'chop', ar: 'يقطّع', group: 'cut' },
      { w: 'much', ar: 'كثير (لغير المعدود)', group: 'many' },
      { w: 'rich', ar: 'غنيّ', emoji: '💰' },
      { w: 'check', ar: 'يتحقّق / يراجع', emoji: '✔️' },
      { w: 'chess', ar: 'شطرنج', emoji: '♟️' },
      { w: 'thin', ar: 'نحيف / رقيق' },
      { w: 'thick', ar: 'سميك' },
      { w: 'math', ar: 'رياضيات', emoji: '➗' },
      { w: 'path', ar: 'ممر / مسار' },
      { w: 'bath', ar: 'استحمام', emoji: '🛁' },
      { w: 'with', ar: 'مع' },
      { w: 'this', ar: 'هذا / هذه' },
      { w: 'that', ar: 'ذلك / تلك' },
      { w: 'them', ar: 'هم (مفعول به)', group: 'pron' },
      { w: 'then', ar: 'ثم / بعد ذلك' }
    ],
    heart: [
      { w: 'they', ar: 'هم', mark: 'th[ey]' },
      { w: 'there', ar: 'هناك', mark: 'th[ere]' },
      { w: 'my', ar: 'ـي (ملكي)', mark: 'm[y]' },
      { w: 'she', ar: 'هي', mark: 'sh[e]' }
    ],
    contrasts: [['ship', 'chip'], ['shop', 'chop'], ['sip', 'ship'], ['thin', 'tin'], ['thick', 'sick'], ['path', 'pass'], ['math', 'mat'], ['then', 'ten'], ['chin', 'thin']],
    pseudo: [{ w: 'shap', foils: ['shep', 'chap'] }, { w: 'chim', foils: ['chem', 'shim'] }, { w: 'kesh', foils: ['kish', 'kech'] }, { w: 'chot', foils: ['chut', 'shot'] }],
    sentences: [
      { text: 'This is my math lab.', missing: 'math', ar: 'هذا مختبر الرياضيات الخاص بي.' },
      { text: 'I will check the chat.', missing: 'chat', ar: 'سأراجع الدردشة.' },
      { text: 'The shop is shut.', missing: 'shut', ar: 'المتجر مُغلق.' },
      { text: 'That is my cash.', missing: 'cash', ar: 'تلك نقودي.' },
      { text: 'They are in the shop.', missing: 'shop', ar: 'هم في المتجر.' },
      { text: 'There are ten pens.', missing: 'pens', ar: 'يوجد عشرة أقلام.' },
      { text: 'She has two jobs.', missing: 'jobs', ar: 'لديها وظيفتان.' },
      { text: 'Then I sat with them.', missing: 'with', ar: 'ثم جلستُ معهم.' },
      { text: 'I wish you luck.', missing: 'wish', ar: 'أتمنى لك الحظ.' }
    ],
    tips: [
      'sh = «ش»: ship. و ch = «تش»: chip.',
      'th لها صوتان: «ث» في thin، و«ذ» في this.',
      'حرف s في آخر الاسم يعني الجمع: pen ← pens.',
      's الجمع تُنطق /s/ بعد p و t و k (maps)، و /z/ بعد غيرها (pens, jobs).'
    ],
    activities: DIGRAPH_UNIT
  },
  {
    id: 8,
    title: 'الوحدة ٨',
    graphemes: ['ng', 'nk', 'wh'],
    rules: ['plural-es'],
    words: [
      { w: 'sing', ar: 'يغنّي', emoji: '🎤', group: 'sing' },
      { w: 'ring', ar: 'خاتم / يرنّ', emoji: '💍' },
      { w: 'king', ar: 'ملك', emoji: '👑' },
      { w: 'long', ar: 'طويل' },
      { w: 'song', ar: 'أغنية', emoji: '🎵', group: 'sing' },
      { w: 'thing', ar: 'شيء' },
      { w: 'wing', ar: 'جناح' },
      { w: 'hang', ar: 'يعلّق' },
      { w: 'bank', ar: 'بنك', emoji: '🏦' },
      { w: 'pink', ar: 'وردي' },
      { w: 'sink', ar: 'حوض المغسلة' },
      { w: 'think', ar: 'يفكّر / يظنّ', emoji: '🤔' },
      { w: 'thank', ar: 'يشكر', emoji: '🙏' },
      { w: 'ink', ar: 'حبر' },
      { w: 'when', ar: 'متى', emoji: '⏰' },
      { w: 'which', ar: 'أيّ' }
    ],
    heart: [
      { w: 'who', ar: 'مَن', mark: '[wh][o]' },
      { w: 'your', ar: 'ـك (ملكك)', mark: 'y[our]' },
      { w: 'said', ar: 'قالَ', mark: 's[ai]d' },
      { w: 'were', ar: 'كانوا / كنتم', mark: 'w[ere]' }
    ],
    contrasts: [['thin', 'thing'], ['win', 'wing'], ['sing', 'sink'], ['thing', 'think'], ['pin', 'pink']],
    pseudo: [{ w: 'whep', foils: ['whap', 'wheb'] }, { w: 'ponk', foils: ['pink', 'pong'] }, { w: 'fing', foils: ['fang', 'fin'] }, { w: 'hink', foils: ['hunk', 'hing'] }],
    sentences: [
      { text: 'When is the quiz?', missing: 'when', ar: 'متى الاختبار القصير؟' },
      { text: 'Thank you!', missing: 'thank', ar: 'شكرًا لك!' },
      { text: 'I think it is long.', missing: 'think', ar: 'أظن أنه طويل.' },
      { text: 'Which bus is it?', missing: 'which', ar: 'أيّ حافلة هي؟' },
      { text: 'The bank is shut.', missing: 'bank', ar: 'البنك مُغلق.' },
      { text: 'Who said that?', missing: 'that', ar: 'مَن قال ذلك؟' },
      { text: 'Your boxes are in the van.', missing: 'boxes', ar: 'صناديقك في الفان.' },
      { text: 'The quizzes were long.', missing: 'long', ar: 'كانت الاختبارات القصيرة طويلة.' },
      { text: 'Sing a song.', missing: 'song', ar: 'غنِّ أغنية.' }
    ],
    tips: [
      'ng صوت واحد يخرج من الأنف: sing. لا تنطق g في آخرها.',
      'nk = صوت ng ثم k: think, bank.',
      'wh تُنطق مثل w: when, which.',
      'es في الجمع بعد s و x و sh و ch و z تُنطق /iz/: boxes, buses.'
    ],
    activities: DIGRAPH_UNIT
  },
  {
    id: 9,
    title: 'الوحدة ٩',
    graphemes: [],
    rules: ['two-syllable'],
    words: [
      { w: 'laptop', split: 'lap|top', ar: 'حاسوب محمول', emoji: '💻' },
      { w: 'backpack', split: 'back|pack', ar: 'حقيبة ظهر', emoji: '🎒', group: 'bag' },
      { w: 'sunset', split: 'sun|set', ar: 'غروب الشمس', emoji: '🌇', group: 'sun' },
      { w: 'upset', split: 'up|set', ar: 'منزعج', emoji: '😟', group: 'feel' },
      { w: 'picnic', split: 'pic|nic', ar: 'نزهة', emoji: '🧺' },
      { w: 'tennis', split: 'ten|nis', ar: 'تنس', emoji: '🎾' },
      { w: 'napkin', split: 'nap|kin', ar: 'منديل' },
      { w: 'cannot', split: 'can|not', ar: 'لا يستطيع', group: 'can' },
      { w: 'habit', split: 'hab|it', ar: 'عادة' },
      { w: 'topic', split: 'top|ic', ar: 'موضوع' },
      { w: 'limit', split: 'lim|it', ar: 'حدّ' },
      { w: 'public', split: 'pub|lic', ar: 'عام / عمومي' },
      { w: 'panic', split: 'pan|ic', ar: 'ذُعر' },
      { w: 'within', split: 'with|in', ar: 'خلال / داخل', group: 'prep' },
      { w: 'comic', split: 'com|ic', ar: 'قصة مصوّرة' },
      { w: 'admin', split: 'ad|min', ar: 'الإدارة' },
      { w: 'index', split: 'in|dex', ar: 'فهرس' },
      { w: 'submit', split: 'sub|mit', ar: 'يُسلِّم (واجبًا)' },
      { w: 'solid', split: 'sol|id', ar: 'صُلب' },
      { w: 'denim', split: 'den|im', ar: 'قماش الجينز' },
      { w: 'muffin', split: 'muf|fin', ar: 'كعكة مافن', emoji: '🧁' },
      { w: 'zigzag', split: 'zig|zag', ar: 'متعرّج' }
    ],
    heart: [
      { w: 'like', ar: 'يحبّ / مثل', mark: 'l[i]k[e]' },
      { w: 'some', ar: 'بعض', mark: 's[o]m[e]' },
      { w: 'come', ar: 'يأتي / تعالَ', mark: 'c[o]m[e]' },
      { w: 'from', ar: 'من', mark: 'fr[o]m' }
    ],
    contrasts: [['pin', 'pen', 'pan'], ['cut', 'cat'], ['ship', 'chip'], ['thin', 'thing'], ['fan', 'van'], ['vet', 'wet'], ['jet', 'yet']],
    pseudo: [{ w: 'tobnap', split: 'tob|nap', foils: ['tubnap', 'tobnab'] }, { w: 'sumtip', split: 'sum|tip', foils: ['samtip', 'sumdip'] }, { w: 'pimbat', split: 'pim|bat', foils: ['pembat', 'bimbat'] }, { w: 'ludmeg', split: 'lud|meg', foils: ['ladmeg', 'lutmeg'] }],
    sentences: [
      { text: 'My laptop is in my backpack.', missing: 'laptop', ar: 'حاسوبي المحمول في حقيبة ظهري.' },
      { text: 'I like tennis.', missing: 'tennis', ar: 'أحبّ التنس.' },
      { text: 'Come to the picnic!', missing: 'picnic', ar: 'تعالَ إلى النزهة!' },
      { text: 'Do not panic!', missing: 'panic', ar: 'لا تذعر!' },
      { text: 'What is the topic?', missing: 'topic', ar: 'ما الموضوع؟' },
      { text: 'Submit it at six.', missing: 'submit', ar: 'سلّمه الساعة السادسة.' },
      { text: 'It is from the admin.', missing: 'admin', ar: 'إنه من الإدارة.' },
      { text: 'Some habits are bad.', missing: 'habits', ar: 'بعض العادات سيئة.' },
      { text: 'Check the index.', missing: 'index', ar: 'راجع الفهرس.' }
    ],
    tips: [
      'الكلمة الطويلة تتكوّن من مقاطع، وفي كل مقطع حرف علة واحد: lap | top, sun | set.',
      'اقرأ كل مقطع وحده، ثم اجمعهما بسرعة.'
    ],
    activities: ['which-word', 'word-build', 'missing-letter', 'dictation', 'meaning', 'heart-words', 'complete-sentence', 'sentence-build']
  },
  {
    id: 10,
    title: 'الوحدة ١٠: مراجعة',
    graphemes: [],
    review: true,
    words: [],
    contrasts: [['pin', 'pen', 'pan'], ['cut', 'cat'], ['ship', 'chip'], ['sing', 'sink'], ['fan', 'van'], ['jet', 'yet'], ['thin', 'tin'], ['bag', 'big', 'bug']],
    sentences: [
      { text: 'My laptop is in my bag.', missing: 'laptop', ar: 'حاسوبي المحمول في حقيبتي.' },
      { text: 'I think the quiz is long.', missing: 'quiz', ar: 'أظن أن الاختبار القصير طويل.' },
      { text: 'Sam and Ali get on the bus.', missing: 'bus', ar: 'سام وعلي يركبان الحافلة.' },
      { text: 'Sara has cash.', missing: 'cash', ar: 'لدى سارة نقود.' },
      { text: 'Then I will go to the shop.', missing: 'shop', ar: 'ثم سأذهب إلى المتجر.' },
      { text: 'The shop is shut at ten.', missing: 'shut', ar: 'يُغلق المتجر الساعة العاشرة.' }
    ],
    texts: [
      {
        id: 'my-bag',
        title: 'My Bag',
        sentences: [
          { text: 'This is my bag.', ar: 'هذه حقيبتي.' },
          { text: 'It is red.', ar: 'إنها حمراء.' },
          { text: 'My laptop is in it.', ar: 'حاسوبي المحمول فيها.' },
          { text: 'My pens are in it.', ar: 'أقلامي فيها.' },
          { text: 'Is it big?', ar: 'هل هي كبيرة؟' },
          { text: 'Yes, it is big.', ar: 'نعم، إنها كبيرة.' },
          { text: 'I can get it on the bus.', ar: 'أستطيع أن آخذها في الحافلة.' }
        ],
        questions: [
          { text: 'The bag is red.', answer: true, ar: 'الحقيبة حمراء.' },
          { text: 'The bag is not big.', answer: false, ar: 'الحقيبة ليست كبيرة.' },
          { text: 'The laptop is in the bag.', answer: true, ar: 'الحاسوب في الحقيبة.' }
        ]
      },
      {
        id: 'the-quiz',
        title: 'The Quiz',
        sentences: [
          { text: 'I have a quiz at ten.', ar: 'لديّ اختبار قصير الساعة العاشرة.' },
          { text: 'It is in the lab.', ar: 'إنه في المختبر.' },
          { text: 'I think the quiz is long.', ar: 'أظن أن الاختبار طويل.' },
          { text: 'Do not panic!', ar: 'لا تذعر!' },
          { text: 'I can do it.', ar: 'أستطيع أن أفعلها.' },
          { text: 'Then I will go to the shop.', ar: 'ثم سأذهب إلى المتجر.' }
        ],
        questions: [
          { text: 'The quiz is at six.', answer: false, ar: 'الاختبار الساعة السادسة.' },
          { text: 'The quiz is in the lab.', answer: true, ar: 'الاختبار في المختبر.' },
          { text: 'The quiz is long.', answer: true, ar: 'الاختبار طويل.' }
        ]
      },
      {
        id: 'the-bus',
        title: 'The Bus',
        sentences: [
          { text: 'The bus is at six.', ar: 'الحافلة الساعة السادسة.' },
          { text: 'It is a big red bus.', ar: 'إنها حافلة حمراء كبيرة.' },
          { text: 'Sam and Ali get on it.', ar: 'سام وعلي يركبانها.' },
          { text: 'The bus is hot, but Ali has a fan.', ar: 'الحافلة حارة، لكن لدى علي مروحة.' },
          { text: 'Sam has a muffin in his bag.', ar: 'لدى سام كعكة مافن في حقيبته.' }
        ],
        questions: [
          { text: 'The bus is at ten.', answer: false, ar: 'الحافلة الساعة العاشرة.' },
          { text: 'Ali has a fan.', answer: true, ar: 'لدى علي مروحة.' },
          { text: 'The muffin is in the van.', answer: false, ar: 'الكعكة في الفان.' }
        ]
      },
      {
        id: 'at-the-shop',
        title: 'At the Shop',
        sentences: [
          { text: 'Sara is at the shop.', ar: 'سارة في المتجر.' },
          { text: 'She has cash.', ar: 'لديها نقود.' },
          { text: 'She gets a fish and some chips.', ar: 'تشتري سمكًا وبعض رقائق البطاطس.' },
          { text: 'Then she said, "Thank you!"', ar: 'ثم قالت: «شكرًا لك!»' },
          { text: 'The shop is shut at ten.', ar: 'يُغلق المتجر الساعة العاشرة.' }
        ],
        questions: [
          { text: 'Sara is at the bank.', answer: false, ar: 'سارة في البنك.' },
          { text: 'Sara has cash.', answer: true, ar: 'لدى سارة نقود.' },
          { text: 'The shop is shut at six.', answer: false, ar: 'يُغلق المتجر الساعة السادسة.' }
        ]
      }
    ],
    tips: [
      'اقرأ النص بنفسك أولًا.',
      'ثم استمع إليه وتابع الكلمات بعينك.',
      'ثم اقرأه مرة أخرى بسرعة أكبر.'
    ],
    activities: ['which-word', 'dictation', 'meaning', 'heart-words', 'complete-sentence', 'sentence-build', 'read-text']
  }
];

// Ear training (high-variability phonetic training, HVPT): sounds that Arabic speakers find hard to
// tell apart. Each word is heard in four voices; the learner chooses the letter they hear and then sees
// the word. Pairs are minimal pairs [word with a, word with b]; they are heard, not read, so they may use
// spellings not taught yet. A set opens once both letters have been taught. Clips that the speech
// recogniser does not hear correctly are skipped (audio/manifest.json "avoid").
export const PERCEPTION = [
  { id: 'a-o', a: 'a', b: 'o', pairs: [['cat', 'cot'], ['hat', 'hot'], ['map', 'mop'], ['tap', 'top'], ['sack', 'sock'], ['pat', 'pot'], ['cap', 'cop'], ['rack', 'rock'], ['black', 'block'], ['lack', 'lock']] },
  { id: 'i-e', a: 'i', b: 'e', pairs: [['pin', 'pen'], ['tin', 'ten'], ['sit', 'set'], ['pit', 'pet'], ['pick', 'peck'], ['pig', 'peg'], ['bit', 'bet'], ['lid', 'led'], ['fill', 'fell'], ['bill', 'bell'], ['will', 'well'], ['big', 'beg']] },
  { id: 'e-a', a: 'e', b: 'a', pairs: [['pen', 'pan'], ['men', 'man'], ['ten', 'tan'], ['set', 'sat'], ['met', 'mat'], ['pet', 'pat'], ['bed', 'bad'], ['beg', 'bag'], ['peck', 'pack'], ['led', 'lad'], ['send', 'sand']] },
  { id: 'a-u', a: 'a', b: 'u', pairs: [['cap', 'cup'], ['cat', 'cut'], ['bag', 'bug'], ['ran', 'run'], ['hat', 'hut'], ['fan', 'fun'], ['mad', 'mud'], ['cab', 'cub'], ['ban', 'bun'], ['lack', 'luck'], ['tack', 'tuck']] },
  { id: 'o-u', a: 'o', b: 'u', pairs: [['cot', 'cut'], ['hot', 'hut'], ['cop', 'cup'], ['dock', 'duck'], ['lock', 'luck'], ['not', 'nut'], ['rob', 'rub'], ['shot', 'shut'], ['rot', 'rut'], ['pop', 'pup']] },
  { id: 'p-b', a: 'p', b: 'b', pairs: [['pin', 'bin'], ['pat', 'bat'], ['pack', 'back'], ['cap', 'cab'], ['pig', 'big'], ['pet', 'bet'], ['pun', 'bun'], ['mop', 'mob'], ['tap', 'tab'], ['rip', 'rib'], ['pan', 'ban'], ['pit', 'bit']] },
  { id: 'f-v', a: 'f', b: 'v', pairs: [['fan', 'van'], ['fat', 'vat'], ['fine', 'vine'], ['fast', 'vast'], ['few', 'view'], ['safe', 'save'], ['leaf', 'leave'], ['fail', 'veil'], ['ferry', 'very'], ['fault', 'vault']] },
  { id: 'v-w', a: 'v', b: 'w', pairs: [['vet', 'wet'], ['vest', 'west'], ['vine', 'wine'], ['vent', 'went'], ['vow', 'wow'], ['vary', 'wary'], ['veil', 'wail'], ['vile', 'while'], ['veal', 'wheel']] },
  { id: 'j-y', a: 'j', b: 'y', pairs: [['jet', 'yet'], ['jam', 'yam'], ['jell', 'yell'], ['joke', 'yolk'], ['jeer', 'year'], ['jot', 'yacht'], ['jaw', 'yaw']] },
  { id: 'sh-ch', a: 'sh', b: 'ch', pairs: [['ship', 'chip'], ['shop', 'chop'], ['sheep', 'cheap'], ['shoe', 'chew'], ['share', 'chair'], ['wash', 'watch'], ['cash', 'catch'], ['dish', 'ditch'], ['mash', 'match'], ['sheet', 'cheat']] },
  { id: 'n-ng', a: 'n', b: 'ng', pairs: [['thin', 'thing'], ['win', 'wing'], ['sin', 'sing'], ['ban', 'bang'], ['ran', 'rang'], ['run', 'rung'], ['kin', 'king'], ['sun', 'sung'], ['fan', 'fang'], ['pin', 'ping']] }
];

// Backwards-compatible container used by the app.
export const appData = { units };

// Achievements (ASCII-safe SVG icons)
export function getAchievements(totalUnits) {
  return [
    {
      id: 'unit1',
      name: 'خطوة أولى',
      description: 'أكملت الوحدة الأولى',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-full h-full text-green-500"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7l9-4 9 4v6a9 9 0 11-18 0V7z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4"/></svg>',
      condition: (p) => p.completedUnits.includes(1)
    },
    {
      id: 'unit5',
      name: 'في منتصف الطريق',
      description: 'أكملت 5 وحدات',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-full h-full text-blue-500"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"/></svg>',
      condition: (p) => p.completedUnits.length >= Math.min(5, totalUnits)
    },
    {
      id: 'unitAll',
      name: 'قارئ واثق',
      description: 'أكملت جميع الوحدات',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-full h-full text-purple-500"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927l2.351 4.764 5.259.764-3.805 3.706.898 5.236-4.703-2.47-4.703 2.47.898-5.236L3.44 8.455l5.259-.764 2.35-4.764z"/></svg>',
      condition: (p) => p.completedUnits.length >= totalUnits
    },
    {
      id: 'points100',
      name: 'جامع النقاط',
      description: 'كسبت 100 نقطة',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-full h-full text-yellow-500"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke-width="2"/><circle cx="12" cy="12" r="3" stroke-width="2"/></svg>',
      condition: (p) => p.points >= 100
    },
    {
      id: 'streak3',
      name: 'مثابر',
      description: 'تعلّمت 3 أيام متتالية',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-full h-full text-orange-500"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>',
      condition: (p) => p.streak >= 3
    },
    {
      id: 'streak7',
      name: 'ملتزم',
      description: 'تعلّمت 7 أيام متتالية',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-full h-full text-red-500"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3c2.5 2.3 4 4.7 4 7a4 4 0 11-8 0c0-2.3 1.5-4.7 4-7z"/></svg>',
      condition: (p) => p.streak >= 7
    }
  ];
}
