// data.js
export const appData = {
  // Every word only uses letters taught so far. Words that can't be sounded out letter by
  // letter are listed in sightWords and taught as "heart words" in the same group.
  // tests/content.test.js enforces both rules.
  chunks: [
    { id: 1,  title: "المجموعة ١",  letters: ['b','t','a'], words: ['at','bat','tab'], letterPairs: ['ba','ta','ab','at'] },
    { id: 2,  title: "المجموعة ٢",  letters: ['p','i','n'], words: ['pin','tin','bit','pat','pan','tip','nap'], letterPairs: ['pi','ni','bi','ti','pa','na'] },
    { id: 3,  title: "المجموعة ٣",  letters: ['c','h','o'], words: ['cot','hot','hop','pot','cat','can','cop'], letterPairs: ['co','ho','oc','oh','ca','ha'] },
    { id: 4,  title: "المجموعة ٤",  letters: ['r','d','m'], words: ['dot','rot','rod','mat','map','mad','dad','mop','rid','dim','mama','Hamad'], letterPairs: ['ra','ri','ro','da','di','do','ma','mi','mo'],
      sightWords: ['a','mama'],
      sentences: [
        { text: "a mad dad", missing: "dad", translation: "أب غاضب" },
        { text: "a mad cat", missing: "mad", translation: "قطة غاضبة" },
        { text: "a hot pot", missing: "hot", translation: "قدر ساخن" },
        { text: "mama can mop", missing: "mop", translation: "أمي تستطيع أن تمسح" },
        { text: "Hamad can hop", missing: "Hamad", translation: "حمد يستطيع القفز" }
      ]
    },
    { id: 5,  title: "المجموعة ٥",  letters: ['s','f','e'], words: ['set','bed','fed','sis','fan','fat','ten','sad','pet','baba'], letterPairs: ['be','fe','es','ef','sa','so'],
      sightWords: ['is','baba'],
      sentences: [
        { text: "a fat cat", missing: "fat", translation: "قطة سمينة" },
        { text: "a red bed", missing: "bed", translation: "سرير أحمر" },
        { text: "baba is sad", missing: "baba", translation: "أبي حزين" },
        { text: "a red fan", missing: "fan", translation: "مروحة حمراء" }
      ]
    },
    { id: 6,  title: "المجموعة ٦",  letters: ['l','g','u'], words: ['leg','log','lug','dug','gut','sun','fun','run','but','bug','film','Ali'], letterPairs: ['la','le','li','lo','lu','ga','ge','gi','go','gu'],
      sightWords: ['the','Ali'],
      sentences: [
        { text: "a fun bug", missing: "fun", translation: "حشرة ممتعة" },
        { text: "the sun is hot", missing: "sun", translation: "الشمس حارة" },
        { text: "a big log", missing: "log", translation: "جذع كبير" },
        { text: "Ali can run", missing: "Ali", translation: "علي يستطيع الركض" }
      ]
    },
    { id: 7,  title: "المجموعة ٧",  letters: ['k','j','w'], words: ['kid','kit','win','wet','web','job','jog','jam','jug','bank'], letterPairs: ['ka','ke','ki','ko','ku','ja','je','ji','jo','ju','wa','we','wi'],
      sentences: [
        { text: "a wet kid", missing: "wet", translation: "طفل مبلل" },
        { text: "a big jug", missing: "jug", translation: "إبريق كبير" },
        { text: "a big bank", missing: "bank", translation: "بنك كبير" },
        { text: "a wet web", missing: "web", translation: "شبكة مبللة" }
      ]
    },
    { id: 8,  title: "المجموعة ٨",  letters: ['v','y','z'], words: ['van','vet','yet','yes','zap','zip','zig','zag','zero'], letterPairs: ['va','ve','vi','vo','vu','ya','ye','yo','yu','za','ze','zi','zo','zu'],
      sightWords: ['zero'],
      sentences: [
        { text: "a big van", missing: "van", translation: "شاحنة كبيرة" },
        { text: "yes it is", missing: "yes", translation: "نعم هي كذلك" },
        { text: "a zip on a bag", missing: "zip", translation: "سحّاب على حقيبة" },
        { text: "a fun vet", missing: "vet", translation: "طبيب بيطري ممتع" }
      ]
    },
    { id: 9,  title: "المجموعة ٩",  letters: ['q','x'], words: ['quiz','quit','box','fox','fix','six','tax','wax','taxi'], letterPairs: ['qu','ax','ex','ix','ox','ux'],
      sightWords: ['do','taxi'],
      sentences: [
        { text: "a red fox", missing: "fox", translation: "ثعلب أحمر" },
        { text: "fix the box", missing: "fix", translation: "أصلح الصندوق" },
        { text: "a red taxi", missing: "taxi", translation: "سيارة أجرة حمراء" },
        { text: "do not quit", missing: "quit", translation: "لا تستسلم" }
      ]
    },
    { id: 11, title: "المجموعة ١١: مراجعة", letters: [], words: ['jump','vest','next','help','milk','lamp','tent','gift'], letterPairs: [],
      sentences: [
        { text: "Ali can jump", missing: "jump", translation: "علي يستطيع القفز" },
        { text: "the next bus", missing: "next", translation: "الحافلة التالية" },
        { text: "help a kid", missing: "help", translation: "ساعد طفلاً" },
        { text: "a red vest", missing: "vest", translation: "سترة حمراء" }
      ]
    }
  ]
};

// Dynamic achievements (ASCII-safe SVG icons)
export function getAchievements(totalChunks) {
  return [
    {
      id: 'chunk1',
      name: 'خطوة أولى',
      description: 'أكملت المجموعة الأولى',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-full h-full text-green-500"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7l9-4 9 4v6a9 9 0 11-18 0V7z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4"/></svg>',
      condition: (p) => p.completedChunks.includes(1)
    },
    {
      id: 'chunk5',
      name: 'في منتصف الطريق',
      description: 'أكملت 5 مجموعات',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-full h-full text-blue-500"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"/></svg>',
      condition: (p) => p.completedChunks.length >= Math.min(5, totalChunks)
    },
    {
      id: 'chunkAll',
      name: 'خبير الأبجدية',
      description: 'أكملت جميع المجموعات',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-full h-full text-purple-500"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927l2.351 4.764 5.259.764-3.805 3.706.898 5.236-4.703-2.47-4.703 2.47.898-5.236L3.44 8.455l5.259-.764 2.35-4.764z"/></svg>',
      condition: (p) => p.completedChunks.length >= totalChunks
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
      description: 'حافظت على سلسلة لـ 3 أيام',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-full h-full text-orange-500"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>',
      condition: (p) => p.streak >= 3
    },
    {
      id: 'streak7',
      name: 'ملتزم',
      description: 'حافظت على سلسلة لـ 7 أيام',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="w-full h-full text-red-500"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3c2.5 2.3 4 4.7 4 7a4 4 0 11-8 0c0-2.3 1.5-4.7 4-7z"/></svg>',
      condition: (p) => p.streak >= 7
    }
  ];
}
