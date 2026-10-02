// data-assess.js - Content for timed reading and assessment (Phase 4).
// Every sentence is checked by tests/curriculum.test.js: decodable at its `unit` (true/false sentences)
// or at the last unit of its stage (benchmark texts).

/**
 * "True or false?" sentences for timed silent reading (sentence verification, as in TOSREC and the
 * PIAAC reading components). Each is plainly true or false from everyday knowledge, never a matter of
 * opinion. `unit` is the first unit after which the sentence can be read.
 */
export const SENSE = [
  // Stage 1
  { unit: 4, text: 'The sun is hot.', answer: true, ar: 'الشمس حارّة.' },
  { unit: 4, text: 'A cat can run.', answer: true, ar: 'القطة تستطيع أن تجري.' },
  { unit: 4, text: 'A dog can run.', answer: true, ar: 'الكلب يستطيع أن يجري.' },
  { unit: 4, text: 'A cup can hop.', answer: false, ar: 'الكوب يستطيع أن يقفز.' },
  { unit: 5, text: 'An egg can run.', answer: false, ar: 'البيضة تستطيع أن تجري.' },
  { unit: 6, text: 'A box can yell.', answer: false, ar: 'الصندوق يستطيع أن يصرخ.' },
  { unit: 6, text: 'Six is not ten.', answer: true, ar: 'ستة ليست عشرة.' },
  { unit: 7, text: 'Fish have fins.', answer: true, ar: 'للأسماك زعانف.' },
  { unit: 7, text: 'A dog has six legs.', answer: false, ar: 'للكلب ست أرجل.' },
  { unit: 7, text: 'Ten is less than six.', answer: false, ar: 'العشرة أقل من الستة.' },
  { unit: 7, text: 'Six is less than ten.', answer: true, ar: 'الستة أقل من العشرة.' },
  { unit: 7, text: 'A duck can quack.', answer: true, ar: 'البطة تستطيع أن تبطبط.' },
  { unit: 7, text: 'A dog can quack.', answer: false, ar: 'الكلب يستطيع أن يبطبط.' },
  { unit: 7, text: 'Fish can run.', answer: false, ar: 'الأسماك تستطيع أن تجري.' },
  { unit: 8, text: 'A bell can ring.', answer: true, ar: 'الجرس يستطيع أن يرن.' },
  { unit: 8, text: 'A bank has cash.', answer: true, ar: 'في البنك نقود.' },
  { unit: 8, text: 'A sink can sing.', answer: false, ar: 'المغسلة تستطيع أن تغنّي.' },
  { unit: 8, text: 'A king is rich.', answer: true, ar: 'الملك غني.' },
  { unit: 9, text: 'Tennis has a net.', answer: true, ar: 'في التنس شبكة.' },
  { unit: 9, text: 'A napkin can think.', answer: false, ar: 'المنديل يستطيع أن يفكّر.' },
  // Stage 2
  { unit: 11, text: 'A fish can swim.', answer: true, ar: 'السمكة تستطيع أن تسبح.' },
  { unit: 11, text: 'A rock can swim.', answer: false, ar: 'الصخرة تستطيع أن تسبح.' },
  { unit: 11, text: 'A dog can spell.', answer: false, ar: 'الكلب يستطيع أن يتهجّى.' },
  { unit: 12, text: 'Grass is black.', answer: false, ar: 'العشب أسود.' },
  { unit: 12, text: 'A truck can swim.', answer: false, ar: 'الشاحنة تستطيع أن تسبح.' },
  { unit: 12, text: 'A drum is a pet.', answer: false, ar: 'الطبل حيوان أليف.' },
  { unit: 12, text: 'A crab has legs.', answer: true, ar: 'للسلطعون أرجل.' },
  { unit: 12, text: 'You can swim in water.', answer: true, ar: 'تستطيع أن تسبح في الماء.' },
  { unit: 13, text: 'A frog can jump.', answer: true, ar: 'الضفدع يستطيع أن يقفز.' },
  { unit: 13, text: 'A desk can jump.', answer: false, ar: 'المكتب يستطيع أن يقفز.' },
  { unit: 13, text: 'You can drink milk.', answer: true, ar: 'تستطيع أن تشرب الحليب.' },
  { unit: 13, text: 'You can drink sand.', answer: false, ar: 'تستطيع أن تشرب الرمل.' },
  { unit: 13, text: 'You can swim in sand.', answer: false, ar: 'تستطيع أن تسبح في الرمل.' },
  { unit: 13, text: 'A clock has hands.', answer: true, ar: 'للساعة عقارب.' },
  { unit: 13, text: 'Milk is not black.', answer: true, ar: 'الحليب ليس أسود.' },
  // Stage 3
  { unit: 16, text: 'Rain is wet.', answer: true, ar: 'المطر مُبلِّل.' },
  { unit: 16, text: 'You eat with your feet.', answer: false, ar: 'تأكل بقدميك.' },
  { unit: 16, text: 'You eat with your teeth.', answer: true, ar: 'تأكل بأسنانك.' },
  { unit: 16, text: 'You can see with your feet.', answer: false, ar: 'ترى بقدميك.' },
  { unit: 16, text: 'A week has five days.', answer: false, ar: 'في الأسبوع خمسة أيام.' },
  { unit: 16, text: 'A sheep can eat grass.', answer: true, ar: 'الخروف يستطيع أن يأكل العشب.' },
  { unit: 16, text: 'A bike has three wheels.', answer: false, ar: 'للدراجة ثلاث عجلات.' },
  { unit: 17, text: 'Snow is cold.', answer: true, ar: 'الثلج بارد.' },
  { unit: 17, text: 'Snow is hot.', answer: false, ar: 'الثلج حار.' },
  { unit: 17, text: 'A boat can fly.', answer: false, ar: 'القارب يستطيع أن يطير.' },
  { unit: 17, text: 'A goat can read.', answer: false, ar: 'الماعز يستطيع أن يقرأ.' },
  { unit: 17, text: 'The sky is green.', answer: false, ar: 'السماء خضراء.' },
  { unit: 18, text: 'Food is good for you.', answer: true, ar: 'الطعام مفيد لك.' },
  { unit: 18, text: 'The moon is in the sky at night.', answer: true, ar: 'القمر في السماء ليلًا.' },
  { unit: 19, text: 'A bird can fly.', answer: true, ar: 'الطائر يستطيع أن يطير.' },
  { unit: 19, text: 'The night is dark.', answer: true, ar: 'الليل مظلم.' },
  { unit: 19, text: 'A cat can bark.', answer: false, ar: 'القطة تستطيع أن تنبح.' },
  { unit: 19, text: 'A dog can bark.', answer: true, ar: 'الكلب يستطيع أن ينبح.' },
  { unit: 19, text: 'Nine is more than five.', answer: true, ar: 'التسعة أكثر من الخمسة.' },
  { unit: 19, text: 'Five is more than nine.', answer: false, ar: 'الخمسة أكثر من التسعة.' },
  { unit: 19, text: 'A car has four wheels.', answer: true, ar: 'للسيارة أربع عجلات.' },
  { unit: 19, text: 'A nurse can help sick people.', answer: true, ar: 'الممرّضة تستطيع أن تساعد المرضى.' },
  { unit: 20, text: 'A cow can moo.', answer: true, ar: 'البقرة تستطيع أن تخور.' },
  // Stage 4
  { unit: 22, text: 'A library has books.', answer: true, ar: 'في المكتبة كتب.' },
  { unit: 22, text: 'You can eat paper.', answer: false, ar: 'تستطيع أن تأكل الورق.' },
  { unit: 22, text: 'Ice is cold.', answer: true, ar: 'الجليد بارد.' },
  { unit: 22, text: 'Ice is hot.', answer: false, ar: 'الجليد حار.' },
  { unit: 22, text: 'Monday comes after Sunday.', answer: true, ar: 'يأتي الاثنين بعد الأحد.' },
  { unit: 22, text: 'Friday comes after Saturday.', answer: false, ar: 'تأتي الجمعة بعد السبت.' },
  { unit: 22, text: 'A table has legs.', answer: true, ar: 'للطاولة أرجل.' },
  { unit: 22, text: 'Twenty is less than ten.', answer: false, ar: 'العشرون أقل من العشرة.' },
  { unit: 23, text: 'A baby can drive a car.', answer: false, ar: 'الرضيع يستطيع أن يقود سيارة.' },
  { unit: 23, text: 'A teacher helps students.', answer: true, ar: 'المعلّم يساعد الطلاب.' },
  { unit: 23, text: 'A phone can make calls.', answer: true, ar: 'الهاتف يستطيع أن يجري مكالمات.' },
  { unit: 23, text: 'A city is smaller than a house.', answer: false, ar: 'المدينة أصغر من البيت.' },
  { unit: 23, text: 'An hour is longer than a minute.', answer: true, ar: 'الساعة أطول من الدقيقة.' },
  { unit: 23, text: 'A minute is longer than an hour.', answer: false, ar: 'الدقيقة أطول من الساعة.' }
];

/**
 * One unseen text per stage for the stage benchmark (not used anywhere else, so it measures reading,
 * not memory). Decodable at the stage's last unit.
 */
export const BENCHMARK_TEXTS = [
  {
    stage: 0, id: 'bench-1', title: 'Max and His Job',
    sentences: [
      'Max has a job at a shop.',
      'The shop sells hats and bags.',
      'At ten, a man comes in.',
      'The man picks a red hat and a big bag.',
      'Max gets the cash from him.',
      'Then Max has a chat with Ken.',
      'Ken has a quiz at six.',
      'Max will check his math.'
    ],
    questions: [
      { text: 'Max has a job at a shop.', answer: true, ar: 'لدى ماكس عمل في متجر.' },
      { text: 'The man picks a red bag.', answer: false, ar: 'يختار الرجل حقيبة حمراء.' },
      { text: 'Ken has a quiz at ten.', answer: false, ar: 'لدى كِن اختبار قصير في العاشرة.' },
      { text: 'Who has a quiz?', options: ['Ken', 'Max', 'the man'], answer: 'Ken', ar: 'مَن لديه اختبار قصير؟' }
    ]
  },
  {
    stage: 1, id: 'bench-2', title: 'The Swim Test',
    sentences: [
      'Sara had a swim test at the club.',
      'She had to swim to the end and back.',
      'The water was cold, but Sara jumped in.',
      'She was fast, and she did not stop.',
      'At the end, Ali yelled, "Well done!"',
      'Sara passed the test, and she was glad.'
    ],
    questions: [
      { text: 'Sara had a swim test.', answer: true, ar: 'كان لدى سارة اختبار سباحة.' },
      { text: 'The water was hot.', answer: false, ar: 'كان الماء حارًا.' },
      { text: 'Sara stopped in the water.', answer: false, ar: 'توقّفت سارة في الماء.' },
      { text: 'Who yelled at the end?', options: ['Ali', 'Sara', 'Ken'], answer: 'Ali', ar: 'مَن صاح في النهاية؟' }
    ]
  },
  {
    stage: 2, id: 'bench-3', title: 'The Lost Coat',
    sentences: [
      'It was a cold day, and the sky was dark.',
      'Ali left his coat on the bus.',
      'At home, he saw that his coat was not with him.',
      'The next day, he went to the bus stop at nine.',
      'He asked the man on the bus for his coat.',
      'The man smiled and gave Ali the coat.',
      'Ali was so glad. He said, "Thank you!"'
    ],
    questions: [
      { text: 'Ali left his coat on the bus.', answer: true, ar: 'ترك علي معطفه في الحافلة.' },
      { text: 'The day was hot.', answer: false, ar: 'كان اليوم حارًا.' },
      { text: 'Ali went to the bus stop at five.', answer: false, ar: 'ذهب علي إلى موقف الحافلة في الخامسة.' },
      { text: 'What was on the bus?', options: ['his coat', 'his bike', 'his book'], answer: 'his coat', ar: 'ماذا كان في الحافلة؟' }
    ]
  },
  {
    stage: 3, id: 'bench-4', title: 'A New Job',
    sentences: [
      'On Sunday, Nora started a new job at the library.',
      'She helps students find books.',
      'On Tuesday, she printed a long list of new books.',
      'On Wednesday, a student lost his library card, and Nora made a new card for him.',
      'On Thursday, the library was very quiet.',
      'Nora was busy, but she was happy with her new job.'
    ],
    questions: [
      { text: 'Nora started a new job at the library.', answer: true, ar: 'بدأت نورة عملًا جديدًا في المكتبة.' },
      { text: 'On Thursday, the library was very loud.', answer: false, ar: 'يوم الخميس كانت المكتبة صاخبة جدًا.' },
      { text: 'A student lost his phone.', answer: false, ar: 'أضاع طالب هاتفه.' },
      { text: 'What did Nora make for the student?', options: ['a new card', 'a list', 'a form'], answer: 'a new card', ar: 'ماذا صنعت نورة للطالب؟' }
    ]
  }
];

/**
 * Can-do statements for self-assessment at the end of each stage (rated: 2 = yes, easily;
 * 1 = yes, with help; 0 = not yet). `link` names the descriptor family each one is written from;
 * the statements are the course's own wording, not quotations.
 */
export const CAN_DO_STAGES = [
  {
    stage: 0, items: [
      { id: 's1-words', ar: 'أقرأ كلمات قصيرة مثل map و fish و bank.', link: 'CEFR Pre-A1 reading; LASLLIAM technical literacy' },
      { id: 's1-spell', ar: 'أكتب كلمة قصيرة أسمعها، مثل pen أو shop.', link: 'LASLLIAM technical literacy (writing)' },
      { id: 's1-sounds', ar: 'أميّز بين أصوات مثل p و b، و i و e.', link: 'Course objective (section 2)' },
      { id: 's1-sentence', ar: 'أقرأ جملة قصيرة وأفهمها، مثل The bus is red.', link: 'CEFR Pre-A1 overall reading comprehension' }
    ]
  },
  {
    stage: 1, items: [
      { id: 's2-clusters', ar: 'أقرأ كلمات مثل stop و hand دون أن أضيف حركة بين الحروف.', link: 'Course objective (section 2)' },
      { id: 's2-ed', ar: 'أقرأ كلمات مثل jumped و ended و shopping.', link: 'Course objective (section 6)' },
      { id: 's2-spell', ar: 'أكتب كلمات فيها حروف ساكنة متتالية، مثل desk و print.', link: 'LASLLIAM technical literacy (writing)' },
      { id: 's2-text', ar: 'أقرأ نصًا قصيرًا عن الحياة الجامعية وأفهمه.', link: 'CEFR A1 overall reading comprehension; CLB ALL reading' }
    ]
  },
  {
    stage: 2, items: [
      { id: 's3-long', ar: 'أقرأ كلمات بحروف علة طويلة مثل name و rain و night.', link: 'Course objective (section 6)' },
      { id: 's3-spellings', ar: 'أعرف أن للصوت الواحد أكثر من طريقة كتابة، مثل rain و day.', link: 'Course objective (section 6)' },
      { id: 's3-signs', ar: 'أقرأ لافتات بسيطة في الحرم الجامعي مثل EXIT و PUSH و NO SMOKING.', link: 'CEFR Pre-A1/A1 reading for orientation; CLB ALL' },
      { id: 's3-text', ar: 'أقرأ نصًا قصيرًا وأجيب عن أسئلة عنه.', link: 'CEFR A1 overall reading comprehension' }
    ]
  },
  {
    stage: 3, items: [
      { id: 's4-long', ar: 'أقرأ كلمات طويلة مثل student و library و information.', link: 'Course objective (section 6)' },
      { id: 's4-parts', ar: 'أفهم كلمات مثل teacher و helpful و unlock من أجزائها.', link: 'Course objective (section 6)' },
      { id: 's4-forms', ar: 'أقرأ استمارة بسيطة وأعرف أين أكتب اسمي ورقمي وبريدي.', link: 'CEFR A1 reading for orientation; CLB ALL forms' },
      { id: 's4-fluent', ar: 'أقرأ نصًا قصيرًا عن الحياة الجامعية بسرعة مناسبة دون أن أتوقّف عند كل كلمة.', link: 'Fluency objective (section 15)' }
    ]
  }
];
