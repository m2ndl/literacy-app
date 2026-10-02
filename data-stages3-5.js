// data-stages3-5.js - Curriculum units 11-24 (Phase 3): consonant clusters and endings (Stage 3),
// long vowels, r-controlled vowels and diphthongs (Stage 4), longer words and word parts (Stage 5).
// Same rules as data.js: every word, sentence and text is checked by tests/curriculum.test.js.
// Texts follow Sara and Ali through their foundation year (the campus series).
//
// Extra fields used from Stage 3 on:
//   patterns: [{ p, ex }]   letter patterns shown in the lesson (st, -nd, -ed...), with an example word
//   rules: decoding rules introduced (blends-s, magic e, open-syllable...); see phonics.js
//   texts[].questions: yes/no ({ text, answer: true|false }) or choice ({ text, options, answer })
//   signs: [{ text, say, ar, kind }]   campus signs, read as signs (kind: stop | go | info)
//   forms: [{ id, title, ar, fields: [{ label, ar, ask, value }], statements: [{ text, answer, ar }] }]
//   pseudo foils may be written with | for syllables (tal|by) or as { w, ipa } when the spelling alone doesn't
//   give the sound: word endings, and the extra vowel Arabic speakers may insert in a cluster (stib -> "sitib").

const CLUSTER_UNIT = ['which-word', 'first-last-sound', 'word-build', 'missing-letter', 'dictation', 'meaning', 'heart-words',
  'complete-sentence', 'sentence-build', 'read-text'];
const VOWEL_UNIT = ['sound-match', 'which-word', 'first-last-sound', 'word-build', 'missing-letter', 'dictation', 'meaning',
  'heart-words', 'complete-sentence', 'sentence-build', 'read-text'];
const WORD_PARTS_UNIT = ['sound-match', 'which-word', 'word-build', 'missing-letter', 'dictation', 'meaning', 'heart-words',
  'complete-sentence', 'sentence-build', 'read-text'];

export const stage3to5 = [
  // ======================================================== Stage 3: consonant clusters and endings
  {
    id: 11,
    title: 'الوحدة ١١',
    graphemes: [],
    patterns: [{ p: 'st', ex: 'stop' }, { p: 'sp', ex: 'spin' }, { p: 'sk', ex: 'skip' }, { p: 'sm', ex: 'smell' },
      { p: 'sn', ex: 'snack' }, { p: 'sl', ex: 'slip' }, { p: 'sw', ex: 'swim' }, { p: 'sc', ex: 'scan' }],
    rules: ['blends-s'],
    words: [
      { w: 'stop', ar: 'يتوقّف', emoji: '🛑' },
      { w: 'step', ar: 'خطوة', emoji: '👣' },
      { w: 'spot', ar: 'بقعة' },
      { w: 'spin', ar: 'يدور', emoji: '🌀' },
      { w: 'spell', ar: 'يتهجّى', emoji: '🔤' },
      { w: 'skip', ar: 'يتخطّى', emoji: '⏭️' },
      { w: 'skin', ar: 'جِلد' },
      { w: 'skill', ar: 'مهارة' },
      { w: 'smell', ar: 'يشمّ', emoji: '👃' },
      { w: 'snack', ar: 'وجبة خفيفة', emoji: '🍪' },
      { w: 'slim', ar: 'رشيق', group: 'thin' },
      { w: 'slip', ar: 'ينزلق' },
      { w: 'swim', ar: 'يسبح', emoji: '🏊' },
      { w: 'still', ar: 'لا يزال' },
      { w: 'stuck', ar: 'عالق' },
      { w: 'stick', ar: 'عصا' },
      { w: 'stack', ar: 'كومة' },
      { w: 'scan', ar: 'يمسح ضوئيًا' },
      { w: 'swing', ar: 'أرجوحة' }
    ],
    heart: [
      { w: 'put', ar: 'يضع', mark: 'p[u]t' },
      { w: 'push', ar: 'يدفع', mark: 'p[u]sh' },
      { w: 'pull', ar: 'يسحب', mark: 'p[u]ll' },
      { w: 'full', ar: 'ممتلئ', mark: 'f[u]ll' },
      { w: 'does', ar: 'يفعل (مع he / she)', mark: 'd[oe]s' }
    ],
    contrasts: [['top', 'stop'], ['pin', 'spin'], ['lip', 'slip'], ['spin', 'skin'], ['slip', 'skip'], ['stick', 'stack', 'stuck'],
      ['smell', 'spell'], ['swim', 'slim']],
    pseudo: [{ w: 'snep', foils: ['snip', { w: 'sinep', ipa: 'sɪnˈɛp' }] }, { w: 'spog', foils: ['spig', { w: 'sipog', ipa: 'sɪpˈɑɡ' }] }, { w: 'stib', foils: ['stab', { w: 'sitib', ipa: 'sɪtˈɪb' }] },
      { w: 'slom', foils: ['slum', { w: 'silom', ipa: 'sɪlˈɑm' }] }],
    sentences: [
      { text: 'Stop at the bus stop.', missing: 'stop', ar: 'توقّف عند موقف الحافلة.' },
      { text: 'I can swim.', missing: 'swim', ar: 'أستطيع أن أسبح.' },
      { text: 'Put the snack in my bag.', missing: 'snack', ar: 'ضع الوجبة الخفيفة في حقيبتي.' },
      { text: 'Can you spell it?', missing: 'spell', ar: 'هل تستطيع أن تتهجّاها؟' },
      { text: 'The van is stuck in the mud.', missing: 'stuck', ar: 'الشاحنة عالقة في الطين.' },
      { text: 'Do not slip!', missing: 'slip', ar: 'لا تنزلق!' },
      { text: 'I smell fish.', missing: 'smell', ar: 'أشمّ رائحة سمك.' },
      { text: 'Skip the step.', missing: 'step', ar: 'تخطَّ الدرجة.' },
      { text: 'It is still hot.', missing: 'still', ar: 'لا يزال ساخنًا.' },
      { text: 'Scan it with the app.', missing: 'scan', ar: 'امسحه ضوئيًا بالتطبيق.' }
    ],
    texts: [
      {
        id: 'bus-stop',
        title: 'At the Bus Stop',
        sentences: [
          { text: 'Sara and Ali are at the bus stop.', ar: 'سارة وعلي في موقف الحافلة.' },
          { text: 'The bus is not at the stop yet.', ar: 'لم تصل الحافلة إلى الموقف بعد.' },
          { text: 'Ali has a snack in his bag.', ar: 'لدى علي وجبة خفيفة في حقيبته.' },
          { text: 'Sara can smell it.', ar: 'تستطيع سارة أن تشمّ رائحتها.' },
          { text: 'Ali gets a snack for Sara.', ar: 'يُخرج علي وجبة خفيفة لسارة.' },
          { text: 'Then the bus stops, and Sara and Ali get on.', ar: 'ثم تتوقّف الحافلة، فتركب سارة وعلي.' }
        ],
        questions: [
          { text: 'Ali has a snack.', answer: true, ar: 'لدى علي وجبة خفيفة.' },
          { text: 'Sara gets a snack for Ali.', answer: false, ar: 'سارة تُخرج وجبة خفيفة لعلي.' },
          { text: 'Who has a snack?', options: ['Ali', 'Sara', 'Tom'], answer: 'Ali', ar: 'مَن لديه وجبة خفيفة؟' }
        ]
      }
    ],
    tips: [
      'في الإنجليزية تأتي حروف ساكنة معًا بلا حركة بينها: stop وليس «سِتوب».',
      'اقرأ الحرفين بسرعة كأنهما صوت واحد يبدأ به المقطع: st-op, sw-im.',
      'كلمات القلب الجديدة: put, push, pull, full — حرف u فيها يُقرأ مثل ضمّة قصيرة.'
    ],
    activities: CLUSTER_UNIT
  },
  {
    id: 12,
    title: 'الوحدة ١٢',
    graphemes: [],
    patterns: [{ p: 'bl', ex: 'black' }, { p: 'cl', ex: 'class' }, { p: 'fl', ex: 'flag' }, { p: 'gl', ex: 'glass' },
      { p: 'pl', ex: 'plan' }, { p: 'br', ex: 'brick' }, { p: 'cr', ex: 'crab' }, { p: 'dr', ex: 'drink' },
      { p: 'gr', ex: 'grass' }, { p: 'pr', ex: 'press' }, { p: 'tr', ex: 'trip' }, { p: 'tw', ex: 'twin' }],
    rules: ['blends-lr'],
    words: [
      { w: 'black', ar: 'أسود', emoji: '⚫' },
      { w: 'block', ar: 'يحجب' },
      { w: 'class', ar: 'صفّ (حصة دراسية)', emoji: '🏫' },
      { w: 'clock', ar: 'ساعة حائط', emoji: '🕰️' },
      { w: 'flag', ar: 'عَلَم', emoji: '🏳️' },
      { w: 'glass', ar: 'كأس / زجاج', emoji: '🥛' },
      { w: 'plan', ar: 'خطة' },
      { w: 'plus', ar: 'زائد', emoji: '➕' },
      { w: 'club', ar: 'نادٍ' },
      { w: 'brick', ar: 'طوب', emoji: '🧱' },
      { w: 'crab', ar: 'سلطعون', emoji: '🦀' },
      { w: 'dress', ar: 'فستان', emoji: '👗' },
      { w: 'drink', ar: 'يشرب', emoji: '🥤' },
      { w: 'drum', ar: 'طبل', emoji: '🥁' },
      { w: 'grab', ar: 'يمسك بسرعة' },
      { w: 'grass', ar: 'عشب', emoji: '🌱' },
      { w: 'press', ar: 'يضغط' },
      { w: 'trip', ar: 'رحلة', emoji: '🧳' },
      { w: 'truck', ar: 'شاحنة كبيرة', emoji: '🚚', group: 'truck' },
      { w: 'twin', ar: 'توأم', emoji: '👯' }
    ],
    heart: [
      { w: 'friend', ar: 'صديق', mark: 'fr[ie]nd' },
      { w: 'want', ar: 'يريد', mark: 'w[a]nt' },
      { w: 'water', ar: 'ماء', mark: 'w[a]t[er]' },
      { w: 'work', ar: 'يعمل / عمل', mark: 'w[or]k' },
      { w: 'word', ar: 'كلمة', mark: 'w[or]d' }
    ],
    contrasts: [['back', 'black'], ['black', 'block'], ['block', 'clock'], ['crab', 'grab'], ['press', 'dress'], ['class', 'glass']],
    pseudo: [{ w: 'blom', foils: ['blim', { w: 'bilom', ipa: 'bɪlˈɑm' }] }, { w: 'prid', foils: ['prod', { w: 'pirid', ipa: 'pɪɹˈɪd' }] }, { w: 'glab', foils: ['glib', { w: 'gilab', ipa: 'ɡɪlˈæb' }] },
      { w: 'frem', foils: ['frim', { w: 'firem', ipa: 'fɪɹˈɛm' }] }],
    sentences: [
      { text: 'I am in class.', missing: 'class', ar: 'أنا في الصف.' },
      { text: 'Drink a glass of water.', missing: 'glass', ar: 'اشرب كأسًا من الماء.' },
      { text: 'The clock is black.', missing: 'clock', ar: 'الساعة سوداء.' },
      { text: 'We have a plan.', missing: 'plan', ar: 'لدينا خطة.' },
      { text: 'Press the red dot.', missing: 'press', ar: 'اضغط على النقطة الحمراء.' },
      { text: 'My friend has a red truck.', missing: 'truck', ar: 'لدى صديقي شاحنة حمراء.' },
      { text: 'Grab the flag!', missing: 'flag', ar: 'أمسك العلم!' },
      { text: 'The trip is fun.', missing: 'trip', ar: 'الرحلة ممتعة.' }
    ],
    texts: [
      {
        id: 'math-class',
        title: 'In Class',
        sentences: [
          { text: 'Ali and Sara are in a math class.', ar: 'علي وسارة في حصة رياضيات.' },
          { text: 'The class has a big black clock.', ar: 'في الصف ساعة سوداء كبيرة.' },
          { text: 'Ali has a plan.', ar: 'لدى علي خطة.' },
          { text: 'He wants to sit with his friend Ken.', ar: 'يريد أن يجلس مع صديقه كين.' },
          { text: 'Ken is not in class.', ar: 'كين ليس في الصف.' },
          { text: 'He is on a trip with the tennis club.', ar: 'إنه في رحلة مع نادي التنس.' }
        ],
        questions: [
          { text: 'Ali and Sara are in a math class.', answer: true, ar: 'علي وسارة في حصة رياضيات.' },
          { text: 'Ken is in the class.', answer: false, ar: 'كين في الصف.' },
          { text: 'Ken is on a trip.', answer: true, ar: 'كين في رحلة.' }
        ]
      }
    ],
    tips: [
      'حرف l أو r بعد حرف ساكن: اقرأهما معًا بلا حركة بينهما: black, truck.',
      'r في الإنجليزية الأمريكية لا تُكرَّر كالراء العربية: اللسان لا يضرب سقف الفم.',
      'كلمات القلب: want, water, work, word — حرف w يغيّر صوت حرف العلة بعده.'
    ],
    activities: CLUSTER_UNIT
  },
  {
    id: 13,
    title: 'الوحدة ١٣',
    graphemes: [],
    patterns: [{ p: '-st', ex: 'best' }, { p: '-nd', ex: 'hand' }, { p: '-nt', ex: 'went' }, { p: '-mp', ex: 'jump' },
      { p: '-sk', ex: 'desk' }, { p: '-lp', ex: 'help' }, { p: '-lk', ex: 'milk' }, { p: '-xt', ex: 'next' },
      { p: 'str', ex: 'strong' }, { p: 'spr', ex: 'spring' }],
    rules: ['blends-final', 'blends-3'],
    words: [
      { w: 'best', ar: 'الأفضل' },
      { w: 'test', ar: 'اختبار', emoji: '📝' },
      { w: 'last', ar: 'آخِر / الماضي' },
      { w: 'list', ar: 'قائمة', emoji: '📋' },
      { w: 'must', ar: 'يجب' },
      { w: 'just', ar: 'فقط / للتوّ' },
      { w: 'hand', ar: 'يد', emoji: '✋' },
      { w: 'send', ar: 'يرسل', emoji: '📤' },
      { w: 'end', ar: 'نهاية' },
      { w: 'went', ar: 'ذهبَ' },
      { w: 'tent', ar: 'خيمة', emoji: '⛺' },
      { w: 'print', ar: 'يطبع', emoji: '🖨️' },
      { w: 'plant', ar: 'نبات', emoji: '🪴' },
      { w: 'jump', ar: 'يقفز' },
      { w: 'desk', ar: 'مكتب (طاولة)' },
      { w: 'ask', ar: 'يسأل' },
      { w: 'help', ar: 'يساعد', emoji: '🆘' },
      { w: 'milk', ar: 'حليب' },
      { w: 'next', ar: 'التالي' },
      { w: 'text', ar: 'رسالة نصية', emoji: '💬' },
      { w: 'exit', ar: 'مخرج', split: 'ex|it' },
      { w: 'strong', ar: 'قوي', emoji: '💪' },
      { w: 'spring', ar: 'الربيع', emoji: '🌸' }
    ],
    heart: [
      { w: 'old', ar: 'قديم', mark: '[o]ld' },
      { w: 'cold', ar: 'بارد', mark: 'c[o]ld' },
      { w: 'find', ar: 'يجد', mark: 'f[i]nd' },
      { w: 'kind', ar: 'لطيف / نوع', mark: 'k[i]nd' },
      { w: 'both', ar: 'كلاهما', mark: 'b[o]th' }
    ],
    contrasts: [['best', 'test'], ['list', 'last'], ['tent', 'test'], ['ten', 'tent'], ['send', 'end']],
    pseudo: [{ w: 'rond', foils: ['rand', { w: 'ronid', ipa: 'ɹˈɑnɪd' }] }, { w: 'bist', foils: ['bust', { w: 'bisit', ipa: 'bˈɪsɪt' }] }, { w: 'famp', foils: ['fomp', { w: 'famip', ipa: 'fˈæmɪp' }] },
      { w: 'strem', foils: ['strim', { w: 'sitrem', ipa: 'sɪtɹˈɛm' }] }],
    sentences: [
      { text: 'Help me with the test.', missing: 'help', ar: 'ساعدني في الاختبار.' },
      { text: 'Send me a text.', missing: 'text', ar: 'أرسل لي رسالة نصية.' },
      { text: 'The test is next.', missing: 'next', ar: 'الاختبار هو التالي.' },
      { text: 'Put the list on the desk.', missing: 'desk', ar: 'ضع القائمة على المكتب.' },
      { text: 'I must print it.', missing: 'print', ar: 'يجب أن أطبعه.' },
      { text: 'Ask the man at the desk.', missing: 'ask', ar: 'اسأل الرجل الذي عند المكتب.' },
      { text: 'It is a strong plant.', missing: 'plant', ar: 'إنه نبات قوي.' },
      { text: 'I went to the bank.', missing: 'went', ar: 'ذهبت إلى البنك.' },
      { text: 'The exit is on the left.', missing: 'exit', ar: 'المخرج على اليسار.' }
    ],
    texts: [
      {
        id: 'the-test',
        title: 'The Test',
        sentences: [
          { text: 'Ali has a math test next.', ar: 'لدى علي اختبار رياضيات قادم.' },
          { text: 'He is upset.', ar: 'إنه منزعج.' },
          { text: 'He asks Sara to help him.', ar: 'يطلب من سارة أن تساعده.' },
          { text: 'Sara sends him a list.', ar: 'ترسل له سارة قائمة.' },
          { text: 'Ali checks the list and the old tests.', ar: 'يراجع علي القائمة والاختبارات القديمة.' },
          { text: 'At the end, he is not upset.', ar: 'في النهاية، لم يعد منزعجًا.' },
          { text: 'He did his best.', ar: 'بذل قصارى جهده.' }
        ],
        questions: [
          { text: 'Sara sends Ali a list.', answer: true, ar: 'ترسل سارة إلى علي قائمة.' },
          { text: 'Ali has a test in math.', answer: true, ar: 'لدى علي اختبار في الرياضيات.' },
          { text: 'Ali is upset at the end.', answer: false, ar: 'علي منزعج في النهاية.' }
        ]
      }
    ],
    tips: [
      'حرفان ساكنان في آخر الكلمة: انطقهما معًا بلا حركة: hand وليس «هاندِ».',
      'ثلاثة حروف ساكنة في البداية: str, spr — مثل strong و spring.',
      'كلمات القلب: old, cold, find, kind, both — حرف العلة هنا يُقرأ باسمه.'
    ],
    activities: CLUSTER_UNIT
  },
  {
    id: 14,
    title: 'الوحدة ١٤',
    graphemes: [],
    patterns: [{ p: '-ed = t', ex: 'jumped' }, { p: '-ed = d', ex: 'filled' }, { p: '-ed = id', ex: 'ended' },
      { p: '-ing', ex: 'singing' }, { p: 'pp, mm…', ex: 'shopping' }],
    rules: ['suffix-ed', 'suffix-ing'],
    words: [
      { w: 'jumped', ar: 'قفزَ' },
      { w: 'helped', ar: 'ساعدَ' },
      { w: 'asked', ar: 'سألَ' },
      { w: 'fixed', ar: 'أصلحَ', emoji: '🔧' },
      { w: 'passed', ar: 'نجحَ (في الاختبار)' },
      { w: 'filled', ar: 'ملأَ' },
      { w: 'yelled', ar: 'صرخَ' },
      { w: 'planned', ar: 'خطّطَ' },
      { w: 'ended', ar: 'انتهى' },
      { w: 'landed', ar: 'هبطَ', emoji: '🛬' },
      { w: 'tested', ar: 'اختبرَ' },
      { w: 'printed', ar: 'طبعَ' },
      { w: 'shopping', ar: 'تسوّق', emoji: '🛍️' },
      { w: 'swimming', ar: 'سباحة' },
      { w: 'spelling', ar: 'تهجئة' },
      { w: 'missing', ar: 'مفقود' },
      { w: 'setting', ar: 'إعداد (في الهاتف)', emoji: '⚙️' },
      { w: 'singing', ar: 'غناء', emoji: '🎤' },
      { w: 'sent', ar: 'أرسلَ' },
      { w: 'lend', ar: 'يُقرض' },
      { w: 'lent', ar: 'أقرضَ' },
      { w: 'spend', ar: 'يُنفق' },
      { w: 'spent', ar: 'أنفقَ' },
      { w: 'mask', ar: 'كمامة / قناع', emoji: '😷' }
    ],
    heart: [
      { w: 'give', ar: 'يعطي', mark: 'g[i]v[e]' },
      { w: 'live', ar: 'يعيش / يسكن', mark: 'l[i]v[e]' },
      { w: 'love', ar: 'يحبّ', mark: 'l[o]v[e]' },
      { w: 'done', ar: 'منتهٍ', mark: 'd[o]n[e]' },
      { w: 'gone', ar: 'ذهبَ (غير موجود)', mark: 'g[o]n[e]' }
    ],
    contrasts: [['send', 'sent'], ['lend', 'lent'], ['spend', 'spent'], ['ask', 'mask']],
    pseudo: [
      { w: 'blemped', ipa: 'blˈɛmpt', foils: [{ w: 'blimped', ipa: 'blˈɪmpt' }, { w: 'blempid', ipa: 'blˈɛmpɪd' }] },
      { w: 'drisked', ipa: 'dɹˈɪskt', foils: [{ w: 'drasked', ipa: 'dɹˈæskt' }, { w: 'driskid', ipa: 'dɹˈɪskɪd' }] },
      { w: 'snobbing', ipa: 'snˈɑbɪŋ', foils: [{ w: 'snubbing', ipa: 'snˈʌbɪŋ' }, { w: 'snobing', ipa: 'snˈObɪŋ' }] },
      { w: 'glonted', ipa: 'ɡlˈɑntɪd', foils: [{ w: 'glanted', ipa: 'ɡlˈæntɪd' }, { w: 'glontt', ipa: 'ɡlˈɑnt' }] }
    ],
    sentences: [
      { text: 'I passed the test!', missing: 'passed', ar: 'نجحت في الاختبار!' },
      { text: 'Ali helped me.', missing: 'helped', ar: 'ساعدني علي.' },
      { text: 'She asked for help.', missing: 'asked', ar: 'طلبت المساعدة.' },
      { text: 'The class ended at six.', missing: 'ended', ar: 'انتهت الحصة في السادسة.' },
      { text: 'We went shopping.', missing: 'shopping', ar: 'ذهبنا للتسوّق.' },
      { text: 'I sent the text.', missing: 'sent', ar: 'أرسلت الرسالة.' },
      { text: 'He is singing a song.', missing: 'singing', ar: 'إنه يغنّي أغنية.' },
      { text: 'Check the settings.', missing: 'settings', ar: 'تحقّق من الإعدادات.' },
      { text: 'The jet landed.', missing: 'landed', ar: 'هبطت الطائرة.' }
    ],
    texts: [
      {
        id: 'lost-bag',
        title: 'The Lost Backpack',
        sentences: [
          { text: 'Sara lost the backpack.', ar: 'أضاعت سارة حقيبة الظهر.' },
          { text: 'She checked the bus and the class.', ar: 'بحثت في الحافلة والصف.' },
          { text: 'She asked Ali and Ken to help.', ar: 'طلبت من علي وكين أن يساعداها.' },
          { text: 'Ken checked the lab, and Ali checked the shop.', ar: 'بحث كين في المختبر، وبحث علي في المتجر.' },
          { text: 'Then Ali yelled to Sara.', ar: 'ثم نادى علي سارة بصوت عالٍ.' },
          { text: 'The backpack was at the shop.', ar: 'كانت حقيبة الظهر في المتجر.' },
          { text: 'Sara thanked him a lot.', ar: 'شكرته سارة كثيرًا.' }
        ],
        questions: [
          { text: 'Sara lost the backpack.', answer: true, ar: 'أضاعت سارة حقيبة الظهر.' },
          { text: 'Ken checked the shop.', answer: false, ar: 'بحث كين في المتجر.' },
          { text: 'Where was the backpack?', options: ['at the shop', 'in the lab', 'on the bus'], answer: 'at the shop', ar: 'أين كانت حقيبة الظهر؟' }
        ]
      }
    ],
    tips: [
      'نهاية الماضي -ed لها ثلاثة أصوات: t بعد p و k و s و sh و ch و x (jumped)، و d بعد معظم الأصوات الأخرى (filled)، و id بعد t و d فقط (ended).',
      'لا تقل «جَمْبِد»: jumped مقطع واحد، و id تُضاف فقط بعد t و d.',
      'إذا انتهت الكلمة بحرف علة قصير ثم حرف ساكن واحد نضاعف الساكن: shop → shopping, plan → planned.'
    ],
    activities: CLUSTER_UNIT
  },

  // ======================================================== Stage 4: long vowels, r-vowels, diphthongs
  {
    id: 15,
    title: 'الوحدة ١٥',
    graphemes: ['a_e', 'i_e', 'o_e', 'u_e'],
    rules: ['silent-e'],
    words: [
      { w: 'name', ar: 'اسم' },
      { w: 'game', ar: 'لعبة', emoji: '🎮' },
      { w: 'late', ar: 'متأخر', emoji: '⏰' },
      { w: 'make', ar: 'يصنع' },
      { w: 'made', ar: 'صنعَ' },
      { w: 'same', ar: 'نفسه / مماثل' },
      { w: 'date', ar: 'تاريخ', emoji: '📅' },
      { w: 'plate', ar: 'صحن', emoji: '🍽️' },
      { w: 'plane', ar: 'طائرة', emoji: '✈️', group: 'plane' },
      { w: 'tape', ar: 'شريط لاصق' },
      { w: 'time', ar: 'وقت', emoji: '⏱️' },
      { w: 'nine', ar: 'تسعة', emoji: '9️⃣' },
      { w: 'five', ar: 'خمسة', emoji: '5️⃣' },
      { w: 'line', ar: 'طابور / خط' },
      { w: 'ride', ar: 'يركب' },
      { w: 'smile', ar: 'يبتسم', emoji: '😊' },
      { w: 'file', ar: 'ملفّ', emoji: '📁' },
      { w: 'site', ar: 'موقع (إلكتروني)' },
      { w: 'home', ar: 'منزل', emoji: '🏠', group: 'home' },
      { w: 'note', ar: 'ملاحظة', emoji: '🗒️' },
      { w: 'hope', ar: 'يأمل' },
      { w: 'close', ar: 'يُغلق' },
      { w: 'joke', ar: 'نكتة', emoji: '😄' },
      { w: 'code', ar: 'رمز (كود)' },
      { w: 'use', ar: 'يستخدم' },
      { w: 'cute', ar: 'ظريف' }
    ],
    heart: [
      { w: 'very', ar: 'جدًّا', mark: 'v[e]r[y]' },
      { w: 'every', ar: 'كلّ', mark: '[e]v[e]r[y]' },
      { w: 'many', ar: 'كثير (للمعدود)', mark: 'm[a]n[y]' },
      { w: 'any', ar: 'أيّ', mark: '[a]n[y]' },
      { w: 'again', ar: 'مرة أخرى', mark: 'ag[ai]n' }
    ],
    contrasts: [['not', 'note'], ['cut', 'cute'], ['us', 'use'], ['tap', 'tape'], ['plan', 'plane'], ['mad', 'made'], ['sit', 'site']],
    pseudo: [{ w: 'bame', foils: ['bime', 'bam'] }, { w: 'sote', foils: ['sute', 'sot'] }, { w: 'kipe', foils: ['kape', 'kip'] },
      { w: 'flune', foils: ['flane', 'flun'] }],
    sentences: [
      { text: 'What is your name?', missing: 'name', ar: 'ما اسمك؟' },
      { text: 'I am late!', missing: 'late', ar: 'أنا متأخر!' },
      { text: 'It is time to go.', missing: 'time', ar: 'حان وقت الذهاب.' },
      { text: 'Close the file.', missing: 'file', ar: 'أغلق الملف.' },
      { text: 'Use the code.', missing: 'code', ar: 'استخدم الرمز.' },
      { text: 'We made a plan.', missing: 'made', ar: 'وضعنا خطة.' },
      { text: 'Smile, it is a joke!', missing: 'joke', ar: 'ابتسم، إنها نكتة!' },
      { text: 'The plane is late.', missing: 'plane', ar: 'الطائرة متأخرة.' },
      { text: 'I hope you pass.', missing: 'hope', ar: 'أتمنى أن تنجح.' }
    ],
    texts: [
      {
        id: 'five-to-nine',
        title: 'Five to Nine',
        sentences: [
          { text: 'It is five to nine.', ar: 'الساعة التاسعة إلا خمس دقائق.' },
          { text: 'Ali is late for class.', ar: 'علي متأخر عن الحصة.' },
          { text: 'He rides his bike fast.', ar: 'يركب دراجته بسرعة.' },
          { text: 'In class, he cannot find a pen.', ar: 'في الصف، لا يجد قلمًا.' },
          { text: 'Sara gives him a pen and a smile.', ar: 'تعطيه سارة قلمًا وابتسامة.' },
          { text: 'The class is fun.', ar: 'الحصة ممتعة.' },
          { text: 'Then Ali makes a note: get up on time!', ar: 'ثم يكتب علي ملاحظة: استيقظ في الوقت المحدّد!' }
        ],
        questions: [
          { text: 'Ali is late for class.', answer: true, ar: 'علي متأخر عن الحصة.' },
          { text: 'Ali rides the bus.', answer: false, ar: 'يركب علي الحافلة.' },
          { text: 'What does Sara give Ali?', options: ['a pen', 'a bike', 'a note'], answer: 'a pen', ar: 'ماذا تعطي سارة علي؟' }
        ]
      }
    ],
    tips: [
      'حرف e في آخر الكلمة لا يُنطق، لكنه يجعل حرف العلة قبله يُقرأ باسمه: cap ← cape، not ← note.',
      'قارن: us / use، cut / cute، plan / plane: الفرق كله في e الأخيرة.',
      'كلمات القلب: very, every, many, any, again.'
    ],
    activities: VOWEL_UNIT
  },
  {
    id: 16,
    title: 'الوحدة ١٦',
    graphemes: ['ee', 'ea', 'ai', 'ay'],
    words: [
      { w: 'see', ar: 'يرى' },
      { w: 'need', ar: 'يحتاج' },
      { w: 'feel', ar: 'يشعر' },
      { w: 'week', ar: 'أسبوع' },
      { w: 'sleep', ar: 'ينام', emoji: '😴' },
      { w: 'green', ar: 'أخضر', emoji: '🟢' },
      { w: 'free', ar: 'مجاني', emoji: '🆓' },
      { w: 'meet', ar: 'يلتقي' },
      { w: 'sheep', ar: 'خروف', emoji: '🐑' },
      { w: 'teach', ar: 'يعلّم' },
      { w: 'read', ar: 'يقرأ', emoji: '📖' },
      { w: 'eat', ar: 'يأكل' },
      { w: 'team', ar: 'فريق' },
      { w: 'clean', ar: 'نظيف', emoji: '🧹' },
      { w: 'mean', ar: 'يعني' },
      { w: 'speak', ar: 'يتكلّم', emoji: '🗣️' },
      { w: 'seat', ar: 'مقعد', emoji: '💺' },
      { w: 'cheap', ar: 'رخيص' },
      { w: 'wait', ar: 'ينتظر', emoji: '⏳' },
      { w: 'paint', ar: 'طلاء', emoji: '🎨' },
      { w: 'train', ar: 'قطار', emoji: '🚆' },
      { w: 'mail', ar: 'بريد', emoji: '📬' },
      { w: 'main', ar: 'رئيسي' },
      { w: 'day', ar: 'يوم' },
      { w: 'play', ar: 'يلعب' },
      { w: 'say', ar: 'يقول' },
      { w: 'stay', ar: 'يبقى' },
      { w: 'pay', ar: 'يدفع (المال)', emoji: '💳' },
      { w: 'way', ar: 'طريق / طريقة' }
    ],
    heart: [
      { w: 'people', ar: 'ناس', mark: 'p[eo]pl[e]' },
      { w: 'because', ar: 'لأنّ', mark: 'bec[au]s[e]' },
      { w: 'eye', ar: 'عين', mark: '[eye]' },
      { w: 'buy', ar: 'يشتري', mark: 'b[uy]' },
      { w: 'laugh', ar: 'يضحك', mark: 'l[augh]' }
    ],
    contrasts: [['sit', 'seat'], ['met', 'meet'], ['men', 'mean'], ['wet', 'wait'], ['chip', 'cheap'], ['ship', 'sheep'], ['man', 'main']],
    pseudo: [{ w: 'treem', foils: ['trim', 'dreem'] }, { w: 'blain', foils: ['blan', 'glain'] }, { w: 'speeg', foils: ['spig', 'sneeg'] },
      { w: 'chaim', foils: ['cham', 'shaim'] }],
    sentences: [
      { text: 'I need to sleep.', missing: 'sleep', ar: 'أحتاج إلى النوم.' },
      { text: 'See you next week!', missing: 'week', ar: 'أراك الأسبوع القادم!' },
      { text: 'Wait for the train.', missing: 'train', ar: 'انتظر القطار.' },
      { text: 'The app is free.', missing: 'free', ar: 'التطبيق مجاني.' },
      { text: 'We play on a team.', missing: 'team', ar: 'نلعب في فريق.' },
      { text: 'Read it, then speak.', missing: 'read', ar: 'اقرأها، ثم تكلّم.' },
      { text: 'What does it mean?', missing: 'mean', ar: 'ماذا تعني؟' },
      { text: 'Pay with cash.', missing: 'pay', ar: 'ادفع نقدًا.' },
      { text: 'Keep it clean.', missing: 'clean', ar: 'حافظ عليه نظيفًا.' }
    ],
    texts: [
      {
        id: 'the-team',
        title: 'The Team',
        sentences: [
          { text: 'Ali plays on the tennis team.', ar: 'يلعب علي في فريق التنس.' },
          { text: 'The team meets each week.', ar: 'يجتمع الفريق كل أسبوع.' },
          { text: 'Ali needs to win this week.', ar: 'يحتاج علي إلى الفوز هذا الأسبوع.' },
          { text: 'He plays well, but the team does not win.', ar: 'يلعب جيدًا، لكن الفريق لا يفوز.' },
          { text: 'Ali is sad, and he needs to sleep.', ar: 'علي حزين، ويحتاج إلى النوم.' },
          { text: 'Sara says, "Next week, you will win!"', ar: 'تقول سارة: «في الأسبوع القادم ستفوز!»' }
        ],
        questions: [
          { text: 'Ali plays on a math team.', answer: false, ar: 'يلعب علي في فريق رياضيات.' },
          { text: 'The team does not win.', answer: true, ar: 'الفريق لا يفوز.' },
          { text: 'Sara says Ali will win next week.', answer: true, ar: 'تقول سارة إن عليًّا سيفوز الأسبوع القادم.' }
        ]
      }
    ],
    tips: [
      'حرفا علة معًا يصنعان صوتًا واحدًا: ee و ea = «إي» طويلة (see, eat)، و ai و ay = «اِي» (rain, day).',
      'ay تأتي غالبًا في آخر الكلمة (day)، و ai في وسطها (rain).',
      'قارن القصير والطويل: ship / sheep، sit / seat — صوت مهم جدًا للمتحدثين بالعربية.'
    ],
    activities: VOWEL_UNIT
  },
  {
    id: 17,
    title: 'الوحدة ١٧',
    graphemes: ['oa', 'ow', 'igh', 'y2', 'ie'],
    words: [
      { w: 'road', ar: 'شارع (طريق للسيارات)' },
      { w: 'coat', ar: 'معطف' },
      { w: 'goat', ar: 'ماعز', emoji: '🐐' },
      { w: 'soap', ar: 'صابون', emoji: '🧼' },
      { w: 'goal', ar: 'هدف', emoji: '🥅' },
      { w: 'coach', ar: 'مدرّب' },
      { w: 'show', ar: 'يعرض' },
      { w: 'slow', ar: 'بطيء' },
      { w: 'low', ar: 'منخفض' },
      { w: 'grow', ar: 'ينمو' },
      { w: 'own', ar: 'يملك' },
      { w: 'throw', ar: 'يرمي' },
      { w: 'bowl', ar: 'وعاء', emoji: '🥣' },
      { w: 'window', ar: 'نافذة', emoji: '🪟', split: 'win|dow' },
      { w: 'yellow', ar: 'أصفر', emoji: '🟡', split: 'yel|low' },
      { w: 'follow', ar: 'يتابع', split: 'fol|low' },
      { w: 'light', ar: 'ضوء', emoji: '💡' },
      { w: 'right', ar: 'يمين / صحيح', group: 'true' },
      { w: 'high', ar: 'مرتفع' },
      { w: 'bright', ar: 'ساطع' },
      { w: 'sight', ar: 'بصر / منظر' },
      { w: 'by', ar: 'بجانب / بواسطة' },
      { w: 'try', ar: 'يحاول' },
      { w: 'cry', ar: 'يبكي', emoji: '😢' },
      { w: 'dry', ar: 'جافّ' },
      { w: 'fly', ar: 'يطير' },
      { w: 'why', ar: 'لماذا' },
      { w: 'pie', ar: 'فطيرة', emoji: '🥧' }
    ],
    heart: [
      { w: 'could', ar: 'استطاعَ', mark: 'c[oul]d' },
      { w: 'would', ar: 'يودّ (would like)', mark: 'w[oul]d' },
      { w: 'should', ar: 'ينبغي', mark: 'sh[oul]d' },
      { w: 'walk', ar: 'يمشي', mark: 'w[al]k' },
      { w: 'talk', ar: 'يتحدّث', mark: 't[al]k' }
    ],
    contrasts: [['got', 'goat'], ['sit', 'sight'], ['coat', 'cat'], ['road', 'red']],
    pseudo: [{ w: 'droat', foils: ['drot', 'troat'] }, { w: 'snight', foils: ['snit', 'smight'] }, { w: 'floam', foils: ['flam', 'floan'] },
      { w: 'smoat', foils: ['smat', 'snoat'] }],
    sentences: [
      { text: 'Why do you cry?', missing: 'cry', ar: 'لماذا تبكي؟' },
      { text: 'Go right, then left.', missing: 'right', ar: 'اذهب يمينًا، ثم يسارًا.' },
      { text: 'The light is bright.', missing: 'light', ar: 'الضوء ساطع.' },
      { text: 'Try it again!', missing: 'try', ar: 'حاول مرة أخرى!' },
      { text: 'Show me the way.', missing: 'show', ar: 'أرني الطريق.' },
      { text: 'Clean the bowl with soap.', missing: 'soap', ar: 'نظّف الوعاء بالصابون.' },
      { text: 'The coach is slow.', missing: 'coach', ar: 'المدرّب بطيء.' },
      { text: 'Follow the road.', missing: 'road', ar: 'اتبع الطريق.' },
      { text: 'My coat is yellow.', missing: 'coat', ar: 'معطفي أصفر.' }
    ],
    texts: [
      {
        id: 'cold-night',
        title: 'A Cold Night',
        sentences: [
          { text: 'It is a cold night.', ar: 'إنها ليلة باردة.' },
          { text: 'Sara waits for the bus by the road.', ar: 'تنتظر سارة الحافلة بجانب الطريق.' },
          { text: 'Then it rains.', ar: 'ثم تمطر.' },
          { text: 'Sara has no coat.', ar: 'ليس لدى سارة معطف.' },
          { text: 'A man with a yellow coat stops his van.', ar: 'رجل يرتدي معطفًا أصفر يوقف شاحنته.' },
          { text: 'It is Ken and his dad!', ar: 'إنه كين ووالده!' },
          { text: 'Sara gets a ride home in the dry van.', ar: 'تعود سارة إلى البيت في الشاحنة الجافة.' }
        ],
        questions: [
          { text: 'It is a cold night.', answer: true, ar: 'إنها ليلة باردة.' },
          { text: 'Sara has a coat.', answer: false, ar: 'لدى سارة معطف.' },
          { text: 'Who stops the van?', options: ['Ken and his dad', 'Ali', 'the coach'], answer: 'Ken and his dad', ar: 'مَن يوقف الشاحنة؟' }
        ]
      }
    ],
    tips: [
      'oa و ow = «أو» طويلة (boat, snow).',
      'igh = «آي» (night)، و y في آخر كلمة قصيرة = «آي» أيضًا (my, fly, why).',
      'ow لها صوت ثانٍ ستتعلّمه في الوحدة ٢٠ (cow).'
    ],
    activities: VOWEL_UNIT
  },
  {
    id: 18,
    title: 'الوحدة ١٨',
    graphemes: ['oo', 'ew', 'ue'],
    words: [
      { w: 'food', ar: 'طعام', emoji: '🍲' },
      { w: 'room', ar: 'غرفة' },
      { w: 'restroom', ar: 'دورة مياه', emoji: '🚻', split: 'rest|room' },
      { w: 'soon', ar: 'قريبًا' },
      { w: 'cool', ar: 'رائع' },
      { w: 'pool', ar: 'مسبح' },
      { w: 'boot', ar: 'حذاء طويل', emoji: '👢' },
      { w: 'tool', ar: 'أداة', emoji: '🔧' },
      { w: 'zoom', ar: 'يكبّر (الصورة)', emoji: '🔎' },
      { w: 'noon', ar: 'الظهر', emoji: '🕛' },
      { w: 'too', ar: 'أيضًا' },
      { w: 'look', ar: 'ينظر', emoji: '👀' },
      { w: 'cook', ar: 'يطبخ', emoji: '🧑‍🍳' },
      { w: 'good', ar: 'جيد', emoji: '👍' },
      { w: 'foot', ar: 'قدم', emoji: '🦶' },
      { w: 'wood', ar: 'خشب', emoji: '🪵' },
      { w: 'took', ar: 'أخذَ' },
      { w: 'few', ar: 'قليل' },
      { w: 'flew', ar: 'طارَ' },
      { w: 'grew', ar: 'نما' },
      { w: 'drew', ar: 'رسمَ' },
      { w: 'chew', ar: 'يمضغ' },
      { w: 'true', ar: 'صحيح', group: 'true' },
      { w: 'glue', ar: 'صمغ' }
    ],
    heart: [
      { w: 'school', ar: 'مدرسة', mark: 's[ch]ool' },
      { w: 'group', ar: 'مجموعة (من الناس)', mark: 'gr[ou]p' },
      { w: 'through', ar: 'عبر', mark: 'thr[ough]' },
      { w: 'move', ar: 'يتحرّك', mark: 'm[o]v[e]' },
      { w: 'whose', ar: 'لمن', mark: 'wh[o]s[e]' }
    ],
    contrasts: [['foot', 'fit'], ['soon', 'sun'], ['boot', 'but'], ['few', 'flew'], ['grew', 'drew']],
    pseudo: [{ w: 'droom', foils: ['drim', 'troom'] }, { w: 'plook', foils: ['plick', 'ploob'] }, { w: 'snew', foils: ['snay', 'smew'] },
      { w: 'gloot', foils: ['glat', 'gloop'] }],
    sentences: [
      { text: 'See you soon!', missing: 'soon', ar: 'أراك قريبًا!' },
      { text: 'The food is good.', missing: 'food', ar: 'الطعام جيد.' },
      { text: 'Look at the moon.', missing: 'look', ar: 'انظر إلى القمر.' },
      { text: 'Is it true?', missing: 'true', ar: 'هل هذا صحيح؟' },
      { text: 'I need a few tools.', missing: 'few', ar: 'أحتاج إلى بعض الأدوات.' },
      { text: 'The class is in room six.', missing: 'room', ar: 'الحصة في الغرفة ستة.' },
      { text: 'She cooks a good dish.', missing: 'cooks', ar: 'تطبخ طبقًا جيدًا.' },
      { text: 'Where is the restroom?', missing: 'restroom', ar: 'أين دورة المياه؟' },
      { text: 'We have a class at noon.', missing: 'noon', ar: 'لدينا حصة في الظهر.' }
    ],
    texts: [
      {
        id: 'lunch',
        title: 'Lunch',
        sentences: [
          { text: 'At noon, Ali and Ken look for food.', ar: 'في الظهر، يبحث علي وكين عن طعام.' },
          { text: 'The food truck is by the pool.', ar: 'شاحنة الطعام بجانب المسبح.' },
          { text: 'Ken gets a big hot dog.', ar: 'يأخذ كين نقانق كبيرة.' },
          { text: 'Ali gets a cool drink and a muffin.', ar: 'يأخذ علي مشروبًا باردًا وكعكة مافن.' },
          { text: 'They sit in the shade of a tree.', ar: 'يجلسان في ظل شجرة.' },
          { text: 'The food is good, and it is cheap.', ar: 'الطعام جيد ورخيص.' },
          { text: 'Soon, it is time to go back to class.', ar: 'قريبًا يحين وقت العودة إلى الصف.' }
        ],
        questions: [
          { text: 'The food truck is by the pool.', answer: true, ar: 'شاحنة الطعام بجانب المسبح.' },
          { text: 'Ken gets a muffin.', answer: false, ar: 'يأخذ كين كعكة مافن.' },
          { text: 'The food is cheap.', answer: true, ar: 'الطعام رخيص.' }
        ]
      }
    ],
    tips: [
      'oo لها صوتان: طويل في moon و food، وقصير في book و good.',
      'ew و ue = «او» طويلة (new, blue).'
    ],
    activities: VOWEL_UNIT
  },
  {
    id: 19,
    title: 'الوحدة ١٩',
    graphemes: ['ar', 'or', 'er', 'ir', 'ur'],
    words: [
      { w: 'card', ar: 'بطاقة (بنكية)', emoji: '💳' },
      { w: 'park', ar: 'حديقة / يركن', emoji: '🅿️' },
      { w: 'start', ar: 'يبدأ' },
      { w: 'art', ar: 'فنّ' },
      { w: 'arm', ar: 'ذراع' },
      { w: 'far', ar: 'بعيد' },
      { w: 'hard', ar: 'صعب' },
      { w: 'smart', ar: 'ذكي', emoji: '🧠' },
      { w: 'short', ar: 'قصير' },
      { w: 'sport', ar: 'رياضة', emoji: '⚽' },
      { w: 'north', ar: 'شمال', emoji: '🧭' },
      { w: 'storm', ar: 'عاصفة', emoji: '⛈️' },
      { w: 'more', ar: 'أكثر' },
      { w: 'form', ar: 'استمارة', emoji: '📝' },
      { w: 'her', ar: 'ـها (لها / ضمير المؤنث)' },
      { w: 'term', ar: 'فصل دراسي' },
      { w: 'person', ar: 'شخص', split: 'per|son' },
      { w: 'after', ar: 'بعد', split: 'af|ter' },
      { w: 'under', ar: 'تحت', split: 'un|der' },
      { w: 'number', ar: 'رقم', emoji: '🔢', split: 'num|ber' },
      { w: 'letter', ar: 'حرف / رسالة', emoji: '✉️', split: 'let|ter' },
      { w: 'first', ar: 'الأول', emoji: '🥇' },
      { w: 'girl', ar: 'فتاة', emoji: '👧' },
      { w: 'shirt', ar: 'قميص', emoji: '👕' },
      { w: 'third', ar: 'الثالث' },
      { w: 'turn', ar: 'دَور (نوبة) / ينعطف' },
      { w: 'nurse', ar: 'ممرّضة', emoji: '👩‍⚕️' }
    ],
    heart: [
      { w: 'four', ar: 'أربعة', mark: 'f[our]' },
      { w: 'our', ar: 'ـنا (لنا)', mark: '[our]' },
      { w: 'hour', ar: 'ساعة (٦٠ دقيقة)', mark: '[h]our' },
      { w: 'sure', ar: 'متأكد', mark: 's[ure]' },
      { w: 'warm', ar: 'دافئ', mark: 'w[ar]m' }
    ],
    contrasts: [['at', 'art'], ['am', 'arm'], ['had', 'hard'], ['shut', 'short', 'shirt'], ['ten', 'turn']],
    pseudo: [{ w: 'chorp', foils: ['chop', 'shorp'] }, { w: 'glurp', foils: ['glop', 'clurp'] }, { w: 'borm', foils: ['bam', 'dorm'] },
      { w: 'smirt', foils: ['smit', 'snirt'] }],
    sentences: [
      { text: 'Her shirt is short.', missing: 'shirt', ar: 'قميصها قصير.' },
      { text: 'Turn left at the park.', missing: 'park', ar: 'انعطف يسارًا عند الحديقة.' },
      { text: 'The first test is hard.', missing: 'hard', ar: 'الاختبار الأول صعب.' },
      { text: 'Fill in the form.', missing: 'form', ar: 'املأ الاستمارة.' },
      { text: 'What is your number?', missing: 'number', ar: 'ما رقمك؟' },
      { text: 'It is not far.', missing: 'far', ar: 'إنه ليس بعيدًا.' },
      { text: 'Start after the storm.', missing: 'after', ar: 'ابدأ بعد العاصفة.' },
      { text: 'She is a smart girl.', missing: 'smart', ar: 'إنها فتاة ذكية.' },
      { text: 'Is it your turn?', missing: 'turn', ar: 'هل حان دورك؟' }
    ],
    texts: [
      {
        id: 'the-form',
        title: 'The Form',
        sentences: [
          { text: 'It is the first day of the term.', ar: 'إنه اليوم الأول من الفصل الدراسي.' },
          { text: 'Sara has to fill in a form.', ar: 'على سارة أن تملأ استمارة.' },
          { text: 'She puts her name and her number on the form.', ar: 'تكتب اسمها ورقمها على الاستمارة.' },
          { text: 'Then she gets a card with her name on it.', ar: 'ثم تحصل على بطاقة عليها اسمها.' },
          { text: 'The card is for the lab and the art club.', ar: 'البطاقة للمختبر ولنادي الفن.' },
          { text: 'Sara is the third person in the line.', ar: 'سارة هي الشخص الثالث في الطابور.' },
          { text: 'It is a short wait.', ar: 'الانتظار قصير.' }
        ],
        questions: [
          { text: 'It is the last day of the term.', answer: false, ar: 'إنه اليوم الأخير من الفصل الدراسي.' },
          { text: 'Sara fills in a form.', answer: true, ar: 'تملأ سارة استمارة.' },
          { text: 'What does Sara get?', options: ['a card', 'a shirt', 'a pen'], answer: 'a card', ar: 'على ماذا تحصل سارة؟' }
        ]
      }
    ],
    tips: [
      'حرف r بعد حرف العلة يغيّر صوته: ar = «آر» (car)، و or = «أور» (fork).',
      'er و ir و ur لها الصوت نفسه (her, bird, turn)، فتعلّم كتابة كل كلمة.',
      'في اللهجة الأمريكية تُنطق r في آخر الكلمة دائمًا: car, more.'
    ],
    activities: VOWEL_UNIT
  },
  {
    id: 20,
    title: 'الوحدة ٢٠',
    graphemes: ['ou', 'ow2', 'oi', 'oy', 'aw', 'all'],
    words: [
      { w: 'out', ar: 'خارج' },
      { w: 'loud', ar: 'صاخب' },
      { w: 'mouth', ar: 'فم', emoji: '👄' },
      { w: 'south', ar: 'جنوب' },
      { w: 'sound', ar: 'صوت', emoji: '🔊' },
      { w: 'found', ar: 'وجدَ' },
      { w: 'count', ar: 'يعدّ' },
      { w: 'house', ar: 'بيت', emoji: '🏡', group: 'home' },
      { w: 'now', ar: 'الآن' },
      { w: 'how', ar: 'كيف' },
      { w: 'down', ar: 'إلى الأسفل' },
      { w: 'town', ar: 'بلدة' },
      { w: 'brown', ar: 'بنّي', emoji: '🟤' },
      { w: 'oil', ar: 'زيت', emoji: '🫒' },
      { w: 'join', ar: 'ينضمّ' },
      { w: 'point', ar: 'يشير', emoji: '👉' },
      { w: 'boy', ar: 'ولد', emoji: '👦' },
      { w: 'enjoy', ar: 'يستمتع', split: 'en|joy' },
      { w: 'saw', ar: 'رأى' },
      { w: 'draw', ar: 'يرسم', emoji: '✏️' },
      { w: 'all', ar: 'الكلّ / جميع' },
      { w: 'call', ar: 'يتّصل', emoji: '📞' },
      { w: 'tall', ar: 'طويل القامة' },
      { w: 'small', ar: 'صغير' },
      { w: 'mall', ar: 'مركز تسوّق', emoji: '🏬' },
      { w: 'hall', ar: 'قاعة' }
    ],
    heart: [
      { w: 'father', ar: 'والد', mark: 'f[a]th[er]' },
      { w: 'mother', ar: 'والدة', mark: 'm[o]th[er]' },
      { w: 'brother', ar: 'أخ', mark: 'br[o]th[er]' },
      { w: 'other', ar: 'آخَر (غير)', mark: '[o]th[er]' },
      { w: 'son', ar: 'ابن', mark: 's[o]n' }
    ],
    contrasts: [['tin', 'town'], ['saw', 'say'], ['out', 'at'], ['mouth', 'math']],
    pseudo: [{ w: 'floud', foils: ['flod', 'froud'] }, { w: 'proin', foils: ['pran', 'broin'] }, { w: 'smawk', foils: [{ w: 'smowk', ipa: 'smˈWk' }, 'snawk'] },
      { w: 'bloy', foils: ['blay', 'gloy'] }],
    sentences: [
      { text: 'How are you now?', missing: 'now', ar: 'كيف حالك الآن؟' },
      { text: 'Call me at noon.', missing: 'call', ar: 'اتصل بي في الظهر.' },
      { text: 'I found my card.', missing: 'found', ar: 'وجدت بطاقتي.' },
      { text: 'The boy is tall.', missing: 'tall', ar: 'الولد طويل القامة.' },
      { text: 'Join the art club!', missing: 'join', ar: 'انضمّ إلى نادي الفن!' },
      { text: 'Go down to the hall.', missing: 'hall', ar: 'انزل إلى القاعة.' },
      { text: 'Count to ten.', missing: 'count', ar: 'عُدّ إلى عشرة.' },
      { text: 'The sound is too loud.', missing: 'loud', ar: 'الصوت صاخب جدًا.' },
      { text: 'We enjoy the mall.', missing: 'enjoy', ar: 'نستمتع بمركز التسوّق.' }
    ],
    texts: [
      {
        id: 'the-mall',
        title: 'The Mall',
        sentences: [
          { text: 'After class, Sara and her friend go to the mall.', ar: 'بعد الحصة، تذهب سارة وصديقتها إلى مركز التسوّق.' },
          { text: 'The mall is in the south of town.', ar: 'المركز في جنوب البلدة.' },
          { text: 'It is a big mall with a lot of shops.', ar: 'إنه مركز كبير فيه الكثير من المتاجر.' },
          { text: 'Sara buys a brown coat.', ar: 'تشتري سارة معطفًا بنّيًا.' },
          { text: 'Her friend buys a small toy for her brother.', ar: 'تشتري صديقتها لعبة صغيرة لأخيها.' },
          { text: 'Then they sit down and enjoy a cool drink.', ar: 'ثم تجلسان وتستمتعان بمشروب بارد.' },
          { text: 'At six, they call a cab to go home.', ar: 'في السادسة، تتصلان بسيارة أجرة للعودة إلى البيت.' }
        ],
        questions: [
          { text: 'The mall is in the north of town.', answer: false, ar: 'المركز في شمال البلدة.' },
          { text: 'Sara buys a coat.', answer: true, ar: 'تشتري سارة معطفًا.' },
          { text: 'What does her friend buy?', options: ['a toy', 'a coat', 'a drink'], answer: 'a toy', ar: 'ماذا تشتري صديقتها؟' }
        ]
      }
    ],
    tips: [
      'ou و ow (في cow) = «آو» (out, now). تذكّر أن ow لها صوت آخر: snow.',
      'oi و oy = «أوي» (oil, boy).',
      'aw = «أو» مفتوحة (saw)، و all = «أول» (ball, call).'
    ],
    activities: VOWEL_UNIT
  },
  {
    id: 21,
    title: 'الوحدة ٢١',
    graphemes: [],
    review: true,
    words: [],
    heart: [
      { w: 'answer', ar: 'يجيب / جواب', mark: 'ans[w]er' },
      { w: 'listen', ar: 'يستمع', mark: 'lis[t]en' },
      { w: 'here', ar: 'هنا', mark: 'h[ere]' }
    ],
    contrasts: [['pin', 'spin'], ['not', 'note'], ['ship', 'sheep'], ['sit', 'seat'], ['at', 'art'], ['cut', 'cute'], ['foot', 'fit']],
    sentences: [
      { text: 'Stop and look.', missing: 'look', ar: 'توقّف وانظر.' },
      { text: 'Listen and answer.', missing: 'listen', ar: 'استمع وأجب.' },
      { text: 'I will wait here.', missing: 'wait', ar: 'سأنتظر هنا.' },
      { text: 'The storm is far.', missing: 'storm', ar: 'العاصفة بعيدة.' },
      { text: 'We need more time.', missing: 'more', ar: 'نحتاج إلى وقت أكثر.' },
      { text: 'Close the window.', missing: 'window', ar: 'أغلق النافذة.' }
    ],
    texts: [
      {
        id: 'big-storm',
        title: 'The Big Storm',
        sentences: [
          { text: 'Last night, a big storm hit the town.', ar: 'الليلة الماضية، ضربت عاصفة كبيرة البلدة.' },
          { text: 'The rain was loud, and the lights went out.', ar: 'كان المطر صاخبًا، وانطفأت الأضواء.' },
          { text: 'Ali and his brother sat by the window.', ar: 'جلس علي وأخوه بجانب النافذة.' },
          { text: 'They saw the storm in the dark sky.', ar: 'رأيا العاصفة في السماء المظلمة.' },
          { text: 'Then the storm stopped, and the boys went to sleep.', ar: 'ثم توقّفت العاصفة، ونام الولدان.' }
        ],
        questions: [
          { text: 'A big storm hit the town.', answer: true, ar: 'ضربت عاصفة كبيرة البلدة.' },
          { text: 'Ali sat with his mother.', answer: false, ar: 'جلس علي مع والدته.' },
          { text: 'Who sat by the window?', options: ['Ali and his brother', 'Sara and Ken', 'the nurse'], answer: 'Ali and his brother', ar: 'مَن جلس بجانب النافذة؟' }
        ]
      },
      {
        id: 'book-club',
        title: 'The Book Club',
        sentences: [
          { text: 'Sara is in a book club.', ar: 'سارة في نادٍ للقراءة.' },
          { text: 'The club meets in room nine each week.', ar: 'يجتمع النادي في الغرفة تسعة كل أسبوع.' },
          { text: 'This week, the club reads a short book.', ar: 'هذا الأسبوع، يقرأ النادي كتابًا قصيرًا.' },
          { text: 'Sara reads it two times.', ar: 'تقرؤه سارة مرتين.' },
          { text: 'Then she speaks to the group.', ar: 'ثم تتحدّث إلى المجموعة.' },
          { text: 'They all enjoy the talk.', ar: 'يستمتع الجميع بالحديث.' }
        ],
        questions: [
          { text: 'The club meets in room nine.', answer: true, ar: 'يجتمع النادي في الغرفة تسعة.' },
          { text: 'Sara reads the book one time.', answer: false, ar: 'تقرأ سارة الكتاب مرة واحدة.' },
          { text: 'They enjoy the talk.', answer: true, ar: 'يستمتعون بالحديث.' }
        ]
      },
      {
        id: 'new-job',
        title: 'A Job at the Food Truck',
        sentences: [
          { text: 'Ken has a job at a food truck.', ar: 'لدى كين وظيفة في شاحنة طعام.' },
          { text: 'He works at night.', ar: 'يعمل في الليل.' },
          { text: 'He cooks and cleans, and he takes the cash.', ar: 'يطبخ وينظّف ويأخذ النقود.' },
          { text: 'It is hard, but he likes it.', ar: 'العمل صعب، لكنه يحبّه.' },
          { text: 'He wants to save for a car.', ar: 'يريد أن يدّخر لشراء سيارة.' }
        ],
        questions: [
          { text: 'Ken has a job at a bank.', answer: false, ar: 'لدى كين وظيفة في بنك.' },
          { text: 'Ken likes the job.', answer: true, ar: 'يحبّ كين الوظيفة.' },
          { text: 'What does Ken want to save for?', options: ['a car', 'a bike', 'a coat'], answer: 'a car', ar: 'لماذا يريد كين أن يدّخر؟' }
        ]
      }
    ],
    signs: [
      { text: 'STOP', say: 'Stop', ar: 'قف', kind: 'stop' },
      { text: 'EXIT', say: 'Exit', ar: 'مخرج', kind: 'go' },
      { text: 'PUSH', say: 'Push', ar: 'ادفع', kind: 'info' },
      { text: 'PULL', say: 'Pull', ar: 'اسحب', kind: 'info' },
      { text: 'IN', say: 'In', ar: 'دخول', kind: 'go' },
      { text: 'OUT', say: 'Out', ar: 'خروج', kind: 'info' },
      { text: 'NO SMOKING', say: 'No smoking', ar: 'ممنوع التدخين', kind: 'stop' },
      { text: 'NO PARKING', say: 'No parking', ar: 'ممنوع الوقوف', kind: 'stop' },
      { text: 'KEEP RIGHT', say: 'Keep right', ar: 'الزم اليمين', kind: 'info' },
      { text: 'WET PAINT', say: 'Wet paint', ar: 'طلاء غير جافّ', kind: 'stop' },
      { text: 'FREE', say: 'Free', ar: 'مجّانًا', kind: 'go' },
      { text: 'RESTROOM', say: 'Restroom', ar: 'دورة المياه', kind: 'info' },
      { text: 'WAIT HERE', say: 'Wait here', ar: 'انتظر هنا', kind: 'info' },
      { text: 'SALE', say: 'Sale', ar: 'تخفيضات', kind: 'go' }
    ],
    tips: [
      'راجع كل ما تعلّمته: الحروف الساكنة المتتالية، ونهايات الكلمات، وحروف العلة الطويلة.',
      'اللافتات تُكتب غالبًا بحروف كبيرة: EXIT = exit.',
      'اقرأ النص بنفسك أولًا، ثم استمع وتابع، ثم اقرأه مرة أخرى.'
    ],
    activities: ['which-word', 'dictation', 'meaning', 'heart-words', 'signs', 'complete-sentence', 'sentence-build', 'read-text']
  },

  // ======================================================== Stage 5: longer words and word parts
  {
    id: 22,
    title: 'الوحدة ٢٢',
    graphemes: ['y3', 'c2', 'g2'],
    patterns: [{ p: 'o|pen', ex: 'open' }, { p: 'stu|dent', ex: 'student' }, { p: '-y = ee', ex: 'baby' },
      { p: 'c = s', ex: 'city' }, { p: 'g = j', ex: 'page' }, { p: '-le', ex: 'table' }],
    rules: ['open-syllable', 'soft-cg', 'consonant-le'],
    words: [
      { w: 'open', ar: 'يفتح / مفتوح', split: 'o|pen' },
      { w: 'paper', ar: 'ورق', emoji: '🧾', split: 'pa|per' },
      { w: 'music', ar: 'موسيقى', emoji: '🎵', split: 'mu|sic' },
      { w: 'student', ar: 'طالب', emoji: '🧑‍🎓', split: 'stu|dent' },
      { w: 'hotel', ar: 'فندق', emoji: '🏨', split: 'ho|tel' },
      { w: 'robot', ar: 'روبوت', emoji: '🤖', split: 'ro|bot' },
      { w: 'menu', ar: 'قائمة طعام', split: 'me|nu' },
      { w: 'email', ar: 'بريد إلكتروني', emoji: '📧', split: 'e|mail' },
      { w: 'library', ar: 'مكتبة', emoji: '📚', split: 'li|bra|ry' },
      { w: 'baby', ar: 'طفل رضيع', emoji: '👶', split: 'ba|by' },
      { w: 'happy', ar: 'سعيد', emoji: '😀', split: 'hap|py' },
      { w: 'city', ar: 'مدينة', emoji: '🏙️', split: 'ci|ty' },
      { w: 'study', ar: 'يدرس', split: 'stud|y' },
      { w: 'story', ar: 'قصة', split: 'sto|ry' },
      { w: 'funny', ar: 'مضحك', split: 'fun|ny' },
      { w: 'sorry', ar: 'آسف', emoji: '🙏', split: 'sor|ry' },
      { w: 'twenty', ar: 'عشرون', split: 'twen|ty' },
      { w: 'face', ar: 'وجه' },
      { w: 'place', ar: 'مكان' },
      { w: 'nice', ar: 'جميل' },
      { w: 'rice', ar: 'أرز', emoji: '🍚' },
      { w: 'page', ar: 'صفحة', emoji: '📄' },
      { w: 'age', ar: 'عُمر (سنّ)' },
      { w: 'center', ar: 'مركز', split: 'cen|ter' },
      { w: 'table', ar: 'طاولة', split: 'ta|ble' },
      { w: 'little', ar: 'قليلًا / صغير', split: 'lit|tle' },
      { w: 'simple', ar: 'بسيط', split: 'sim|ple' },
      { w: 'middle', ar: 'وسط', split: 'mid|dle' },
      { w: 'major', ar: 'تخصّص (دراسي)', split: 'ma|jor' },
      { w: 'mobile', ar: 'هاتف جوّال', split: 'mo|bile', group: 'phone' },
      { w: 'entry', ar: 'دخول', split: 'en|try' },
      { w: 'party', ar: 'حفلة', emoji: '🎉', split: 'par|ty' }
    ],
    heart: [
      { w: 'busy', ar: 'مشغول', mark: 'b[u]s[y]' },
      { w: 'women', ar: 'نساء', mark: 'w[o]m[e]n' },
      { w: 'eight', ar: 'ثمانية', mark: '[eigh]t' },
      { w: 'half', ar: 'نصف', mark: 'ha[l]f' },
      { w: 'learn', ar: 'يتعلّم', mark: 'l[ear]n' }
    ],
    names: [
      { w: 'Sunday', ar: 'الأحد' },
      { w: 'Monday', ar: 'الاثنين' },
      { w: 'Tuesday', ar: 'الثلاثاء' },
      { w: 'Wednesday', ar: 'الأربعاء' },
      { w: 'Thursday', ar: 'الخميس' },
      { w: 'Friday', ar: 'الجمعة' },
      { w: 'Saturday', ar: 'السبت' },
      { w: 'English', ar: 'اللغة الإنجليزية' }
    ],
    contrasts: [['nice', 'nine'], ['place', 'plate'], ['rice', 'ride']],
    pseudo: [{ w: 'pomic', split: 'po|mic', foils: ['pom|mic', 'po|mig'] }, { w: 'tilby', split: 'til|by', foils: ['tal|by', 'til|py'] },
      { w: 'cimp', foils: ['semp', 'kimp'] }, { w: 'mople', split: 'mo|ple', foils: [{ w: 'mopple', ipa: 'mˈɑpəl' }, { w: 'mofle', ipa: 'mˈOfəl' }] }],
    sentences: [
      { text: 'Open the email.', missing: 'email', ar: 'افتح البريد الإلكتروني.' },
      { text: 'I am a student.', missing: 'student', ar: 'أنا طالب.' },
      { text: 'Sorry, I am late!', missing: 'sorry', ar: 'آسف، أنا متأخر!' },
      { text: 'Read page twenty.', missing: 'page', ar: 'اقرأ الصفحة عشرين.' },
      { text: 'What is your age?', missing: 'age', ar: 'كم عمرك؟' },
      { text: 'Put the paper on the table.', missing: 'table', ar: 'ضع الورقة على الطاولة.' },
      { text: 'It is a nice place.', missing: 'place', ar: 'إنه مكان جميل.' },
      { text: 'I study on Monday.', missing: 'study', ar: 'أدرس يوم الاثنين.' },
      { text: 'The baby is happy.', missing: 'happy', ar: 'الطفل سعيد.' }
    ],
    texts: [
      {
        id: 'library',
        title: 'At the Library',
        sentences: [
          { text: 'On Monday, Sara is at the library.', ar: 'يوم الاثنين، سارة في المكتبة.' },
          { text: 'She has a test on Friday.', ar: 'لديها اختبار يوم الجمعة.' },
          { text: 'The library is a nice place to study.', ar: 'المكتبة مكان جميل للدراسة.' },
          { text: 'Sara finds a table in the middle.', ar: 'تجد سارة طاولة في الوسط.' },
          { text: 'She reads twenty pages.', ar: 'تقرأ عشرين صفحة.' },
          { text: 'Then a student with a baby sits by her.', ar: 'ثم تجلس بجانبها طالبة معها طفل رضيع.' },
          { text: 'The baby smiles at Sara.', ar: 'يبتسم الطفل لسارة.' }
        ],
        questions: [
          { text: 'Sara is at the library on Monday.', answer: true, ar: 'سارة في المكتبة يوم الاثنين.' },
          { text: 'Sara has a test on Sunday.', answer: false, ar: 'لدى سارة اختبار يوم الأحد.' },
          { text: 'How many pages does Sara read?', options: ['twenty', 'ten', 'five'], answer: 'twenty', ar: 'كم صفحة تقرأ سارة؟' }
        ]
      }
    ],
    tips: [
      'المقطع المفتوح (ينتهي بحرف علة) يُقرأ فيه حرف العلة باسمه: o-pen، stu-dent.',
      'c قبل e أو i أو y = «س» (city, face)، و g قبلها غالبًا = «ج» (page, age).',
      'y في آخر كلمة من مقطعين = «إي» (baby, happy)، و le في آخر الكلمة = «ل» مع حركة خفيفة (table).',
      'أيام الأسبوع تبدأ دائمًا بحرف كبير: Monday, Friday.'
    ],
    activities: WORD_PARTS_UNIT
  },
  {
    id: 23,
    title: 'الوحدة ٢٣',
    graphemes: ['tion', 'ph'],
    patterns: [{ p: '-er', ex: 'teacher' }, { p: '-est', ex: 'biggest' }, { p: '-ful', ex: 'helpful' }, { p: '-ly', ex: 'quickly' },
      { p: '-ness', ex: 'sadness' }, { p: '-ment', ex: 'payment' }, { p: 'un-', ex: 'unlock' }, { p: 're-', ex: 'replay' }],
    rules: ['suffix-er', 'suffixes', 'prefixes', 'digits'],
    words: [
      { w: 'teacher', ar: 'معلّم', emoji: '🧑‍🏫' },
      { w: 'player', ar: 'لاعب' },
      { w: 'driver', ar: 'سائق' },
      { w: 'reader', ar: 'قارئ' },
      { w: 'faster', ar: 'أسرع' },
      { w: 'biggest', ar: 'الأكبر' },
      { w: 'helpful', ar: 'متعاون' },
      { w: 'useful', ar: 'مفيد' },
      { w: 'sadness', ar: 'حزن' },
      { w: 'kindness', ar: 'لُطف' },
      { w: 'payment', ar: 'دفعة (مالية)' },
      { w: 'quickly', ar: 'بسرعة' },
      { w: 'slowly', ar: 'ببطء' },
      { w: 'unlock', ar: 'يفتح القفل', emoji: '🔓' },
      { w: 'unhappy', ar: 'غير سعيد' },
      { w: 'redo', ar: 'يعيد (العمل)' },
      { w: 'replay', ar: 'يعيد التشغيل', emoji: '🔁' },
      { w: 'station', ar: 'محطة', emoji: '🚉', split: 'sta|tion' },
      { w: 'nation', ar: 'أمّة', split: 'na|tion' },
      { w: 'action', ar: 'حركة (أكشن)', split: 'ac|tion' },
      { w: 'question', ar: 'سؤال', emoji: '❓', split: 'ques|tion' },
      { w: 'nationality', ar: 'جنسية', split: 'na|tion|al|i|ty' },
      { w: 'phone', ar: 'هاتف', emoji: '📱', group: 'phone' },
      { w: 'information', ar: 'معلومات', split: 'in|for|ma|tion' },
      { w: 'photo', ar: 'صورة', emoji: '📷', split: 'pho|to' },
      { w: 'graph', ar: 'رسم بياني', emoji: '📊' }
    ],
    heart: [
      { w: 'enough', ar: 'كافٍ', mark: 'en[ough]' },
      { w: 'quiet', ar: 'هادئ', mark: 'qu[ie]t' },
      { w: 'idea', ar: 'فكرة', mark: '[i]d[ea]' },
      { w: 'minute', ar: 'دقيقة', mark: 'min[u]t[e]' }
    ],
    names: [
      { w: 'Mr', ar: 'السيد' },
      { w: 'Mrs', ar: 'السيدة' },
      { w: 'Dr', ar: 'الدكتور' },
      { w: 'Hassan', ar: 'حسن' },
      { w: 'Nora', ar: 'نورة' }
    ],
    contrasts: [['ship', 'sheep'], ['cut', 'cute'], ['at', 'art']],
    pseudo: [{ w: 'retrom', split: 're|trom', foils: [{ w: 'rettrom', ipa: 'ɹˈɛtɹɑm' }, 're|tram'] }, { w: 'plotion', split: 'plo|tion', foils: ['plot|tin', 'plo|shan'] },
      { w: 'blemful', split: 'blem|ful', foils: ['blim|ful', 'blem|fal'] }, { w: 'phip', foils: ['phap', 'pip'] }],
    sentences: [
      { text: 'Ask the teacher a question.', missing: 'question', ar: 'اسأل المعلّم سؤالًا.' },
      { text: 'The bus is at the station.', missing: 'station', ar: 'الحافلة في المحطة.' },
      { text: 'Call me on my phone.', missing: 'phone', ar: 'اتصل بي على هاتفي.' },
      { text: 'Read the graph quickly.', missing: 'quickly', ar: 'اقرأ الرسم البياني بسرعة.' },
      { text: 'This app is useful.', missing: 'useful', ar: 'هذا التطبيق مفيد.' },
      { text: 'Unlock the gate.', missing: 'unlock', ar: 'افتح قفل البوابة.' },
      { text: 'He is the biggest player.', missing: 'player', ar: 'إنه أكبر لاعب.' },
      { text: 'The class ends at 10:30.', missing: 'ends', ar: 'تنتهي الحصة في الساعة العاشرة والنصف.' },
      { text: 'Send me a photo.', missing: 'photo', ar: 'أرسل لي صورة.' }
    ],
    texts: [
      {
        id: 'the-teacher',
        title: 'The Math Teacher',
        sentences: [
          { text: 'Mr Hassan is the math teacher.', ar: 'السيد حسن هو معلّم الرياضيات.' },
          { text: 'He is helpful and kind.', ar: 'إنه متعاون ولطيف.' },
          { text: 'On Sunday, he gives the class a quiz on the app.', ar: 'يوم الأحد، يعطي الصف اختبارًا قصيرًا على التطبيق.' },
          { text: 'Ali is unhappy because he left his phone at home.', ar: 'علي غير سعيد لأنه ترك هاتفه في البيت.' },
          { text: 'Mr Hassan gives him the quiz on paper.', ar: 'يعطيه السيد حسن الاختبار على ورقة.' },
          { text: 'Ali is quick, and he gets ten out of ten.', ar: 'علي سريع، ويحصل على عشرة من عشرة.' }
        ],
        questions: [
          { text: 'Mr Hassan is the math teacher.', answer: true, ar: 'السيد حسن هو معلّم الرياضيات.' },
          { text: 'Ali has his phone.', answer: false, ar: 'هاتف علي معه.' },
          { text: 'What does Ali get on the quiz?', options: ['ten out of ten', 'five out of ten', 'six out of ten'], answer: 'ten out of ten', ar: 'ماذا يحصل علي في الاختبار؟' }
        ]
      }
    ],
    forms: [
      {
        id: 'library-card',
        title: 'Library Card Form',
        ar: 'استمارة بطاقة المكتبة',
        fields: [
          { label: 'First name', ar: 'الاسم الأول', ask: 'أين تكتب اسمك الأول؟', value: 'Nora' },
          { label: 'Last name', ar: 'اسم العائلة', ask: 'أين تكتب اسم عائلتك؟', value: 'Hassan' },
          { label: 'Phone', ar: 'الهاتف', ask: 'أين تكتب رقم هاتفك؟', value: '0551 234 567' },
          { label: 'Email', ar: 'البريد الإلكتروني', ask: 'أين تكتب بريدك الإلكتروني؟', value: 'nora.h@mail.com' },
          { label: 'Date of birth', ar: 'تاريخ الميلاد', ask: 'أين تكتب تاريخ ميلادك؟', value: '12/05/2006' },
          { label: 'Nationality', ar: 'الجنسية', ask: 'أين تكتب جنسيتك؟', value: 'Saudi' }
        ],
        statements: [
          { text: 'Her first name is Nora.', answer: true, ar: 'اسمها الأول نورة.' },
          { text: 'Her last name is Hassan.', answer: true, ar: 'اسم عائلتها حسن.' },
          { text: 'Her phone number is on the form.', answer: true, ar: 'رقم هاتفها في الاستمارة.' },
          { text: 'Her first name is Sara.', answer: false, ar: 'اسمها الأول سارة.' }
        ]
      }
    ],
    tips: [
      'كثير من الكلمات الطويلة = كلمة تعرفها + جزء: teach + er = teacher، quick + ly = quickly، un + lock = unlock.',
      'tion في آخر الكلمة = «شَن» (station)، و ph = «ف» (phone).',
      'اقرأ الكلمة الطويلة مقطعًا مقطعًا: sta-tion، na-tion-al-i-ty.'
    ],
    activities: [...WORD_PARTS_UNIT, 'forms']
  },
  {
    id: 24,
    title: 'الوحدة ٢٤',
    graphemes: [],
    review: true,
    words: [],
    heart: [
      { w: 'world', ar: 'العالم', mark: 'w[or]ld' },
      { w: 'thought', ar: 'فكّرَ', mark: 'th[ough]t' },
      { w: 'tomorrow', ar: 'غدًا', mark: 't[o]m[o]rr[ow]' },
      { w: 'only', ar: 'فقط', mark: '[o]nl[y]' }
    ],
    contrasts: [['ship', 'sheep'], ['not', 'note'], ['at', 'art'], ['soon', 'sun']],
    sentences: [
      { text: 'See you tomorrow!', missing: 'see', ar: 'أراك غدًا!' },
      { text: 'Fill in the form slowly.', missing: 'slowly', ar: 'املأ الاستمارة ببطء.' },
      { text: 'The library is open on Sunday.', missing: 'open', ar: 'المكتبة مفتوحة يوم الأحد.' },
      { text: 'I have a question for the teacher.', missing: 'teacher', ar: 'لديّ سؤال للمعلّم.' },
      { text: 'The station is in the center of the city.', missing: 'center', ar: 'المحطة في وسط المدينة.' },
      { text: 'Send me an email after class.', missing: 'email', ar: 'أرسل لي بريدًا إلكترونيًا بعد الحصة.' }
    ],
    texts: [
      {
        id: 'the-last-week',
        title: 'The Last Week',
        sentences: [
          { text: 'It is the last week of the term.', ar: 'إنه الأسبوع الأخير من الفصل الدراسي.' },
          { text: 'Sara and Ali are busy.', ar: 'سارة وعلي مشغولان.' },
          { text: 'They have a big test on Thursday.', ar: 'لديهما اختبار كبير يوم الخميس.' },
          { text: 'They study in the library each day.', ar: 'يدرسان في المكتبة كل يوم.' },
          { text: 'Sara reads the notes, and Ali asks her questions.', ar: 'تقرأ سارة الملاحظات، ويسألها علي أسئلة.' },
          { text: 'On Thursday, they both feel good.', ar: 'يوم الخميس، يشعران كلاهما بالارتياح.' }
        ],
        questions: [
          { text: 'It is the first week of the term.', answer: false, ar: 'إنه الأسبوع الأول من الفصل الدراسي.' },
          { text: 'They study in the library.', answer: true, ar: 'يدرسان في المكتبة.' },
          { text: 'When is the big test?', options: ['on Thursday', 'on Monday', 'on Friday'], answer: 'on Thursday', ar: 'متى الاختبار الكبير؟' }
        ]
      },
      {
        id: 'the-party',
        title: 'The End of the Term',
        sentences: [
          { text: 'After the test, the class has a party in the hall.', ar: 'بعد الاختبار، يقيم الصف حفلة في القاعة.' },
          { text: 'Mr Hassan thanks all the students.', ar: 'يشكر السيد حسن جميع الطلاب.' },
          { text: 'Sara gives a short talk in English.', ar: 'تلقي سارة كلمة قصيرة بالإنجليزية.' },
          { text: 'She is a little upset, but she smiles and speaks slowly.', ar: 'إنها متوتّرة قليلًا، لكنها تبتسم وتتكلّم ببطء.' },
          { text: 'At the end, all the people clap for her.', ar: 'في النهاية، يصفّق لها جميع الناس.' }
        ],
        questions: [
          { text: 'The party is in the hall.', answer: true, ar: 'الحفلة في القاعة.' },
          { text: 'Ali gives the talk.', answer: false, ar: 'علي يلقي الكلمة.' },
          { text: 'How does Sara speak?', options: ['slowly', 'quickly', 'loudly'], answer: 'slowly', ar: 'كيف تتكلّم سارة؟' }
        ]
      },
      {
        id: 'a-new-start',
        title: 'A New Start',
        sentences: [
          { text: 'Next term, Sara will study art, and Ali will study math.', ar: 'في الفصل القادم، ستدرس سارة الفن، وسيدرس علي الرياضيات.' },
          { text: 'They will not be in the same class.', ar: 'لن يكونا في الصف نفسه.' },
          { text: 'But they will still meet at the bus stop each day.', ar: 'لكنهما سيظلّان يلتقيان في موقف الحافلة كل يوم.' },
          { text: 'And they will still help each other.', ar: 'وسيظلّ كل منهما يساعد الآخر.' }
        ],
        questions: [
          { text: 'Sara will study art.', answer: true, ar: 'ستدرس سارة الفن.' },
          { text: 'Sara and Ali will be in the same class.', answer: false, ar: 'سيكون سارة وعلي في الصف نفسه.' },
          { text: 'Where will they meet?', options: ['at the bus stop', 'at the mall', 'at the pool'], answer: 'at the bus stop', ar: 'أين سيلتقيان؟' }
        ]
      }
    ],
    signs: [
      { text: 'OPEN', say: 'Open', ar: 'مفتوح', kind: 'go' },
      { text: 'CLOSED', say: 'Closed', ar: 'مغلق', kind: 'stop' },
      { text: 'LIBRARY', say: 'Library', ar: 'المكتبة', kind: 'info' },
      { text: 'INFORMATION', say: 'Information', ar: 'الاستعلامات', kind: 'info' },
      { text: 'FIRST AID', say: 'First aid', ar: 'إسعافات أولية', kind: 'go' },
      { text: 'NO ENTRY', say: 'No entry', ar: 'ممنوع الدخول', kind: 'stop' },
      { text: 'STAFF ONLY', say: 'Staff only', ar: 'للموظفين فقط', kind: 'stop' },
      { text: 'BUS STOP', say: 'Bus stop', ar: 'موقف الحافلة', kind: 'info' },
      { text: 'PAY HERE', say: 'Pay here', ar: 'ادفع هنا', kind: 'info' },
      { text: 'LOST AND FOUND', say: 'Lost and found', ar: 'المفقودات', kind: 'info' },
      { text: 'QUIET PLEASE', say: 'Quiet please', ar: 'الزم الهدوء', kind: 'stop' },
      { text: 'NO FOOD', say: 'No food', ar: 'ممنوع الطعام', kind: 'stop' }
    ],
    forms: [
      {
        id: 'student-card',
        title: 'Student Card Form',
        ar: 'استمارة البطاقة الجامعية',
        fields: [
          { label: 'First name', ar: 'الاسم الأول', ask: 'أين تكتب اسمك الأول؟', value: 'Ali' },
          { label: 'Last name', ar: 'اسم العائلة', ask: 'أين تكتب اسم عائلتك؟', value: 'Nasser' },
          { label: 'Student number', ar: 'الرقم الجامعي', ask: 'أين تكتب رقمك الجامعي؟', value: '4410235' },
          { label: 'Major', ar: 'التخصّص', ask: 'أين تكتب تخصّصك؟', value: 'Math' },
          { label: 'Mobile', ar: 'الجوّال', ask: 'أين تكتب رقم جوّالك؟', value: '0509 876 543' },
          { label: 'Date of birth', ar: 'تاريخ الميلاد', ask: 'أين تكتب تاريخ ميلادك؟', value: '03/09/2005' },
          { label: 'Email', ar: 'البريد الإلكتروني', ask: 'أين تكتب بريدك الإلكتروني؟', value: 'ali.n@mail.com' }
        ],
        statements: [
          { text: 'His first name is Ali.', answer: true, ar: 'اسمه الأول علي.' },
          { text: 'His major is art.', answer: false, ar: 'تخصّصه الفن.' },
          { text: 'His major is math.', answer: true, ar: 'تخصّصه الرياضيات.' }
        ]
      }
    ],
    tips: [
      'أحسنت! هذه آخر وحدة في الدورة: راجع الكلمات والنصوص، وتدرّب يوميًا في «مراجعة اليوم».',
      'اللافتات والاستمارات من أهم ما تقرؤه في الجامعة: تعلّم كلماتها جيدًا.',
      'اقرأ النصوص بصوت عالٍ: الاستماع ثم القراءة ثم إعادة القراءة يزيد سرعتك.'
    ],
    activities: ['which-word', 'dictation', 'meaning', 'heart-words', 'signs', 'forms', 'complete-sentence', 'sentence-build', 'read-text']
  }
];
