# Usability round 1 — session kit

Phase 2 is finished when a first usability round with target learners reaches an average **System Usability Scale (SUS) score of 70 or more** (`PEDAGOGY_PLAN.md`, sections 10–11). This kit is everything needed to run that round.

## Who and where

| | |
|---|---|
| Participants | 5–8 college or foundation-year students, Arabic first language, CEFR pre-A1 in reading. Include at least 2 *true* beginners and 2 *false* beginners. |
| Devices | One low-cost Android phone (Chrome) and one iPhone (Safari), each with the volume up. Use a fresh browser profile for each participant, or reset progress from the menu. |
| Time | About 40 minutes per participant. |
| People | A facilitator who speaks Arabic, plus a note-taker (or a screen and audio recording, with consent). |
| Method | Think-aloud in Arabic. The facilitator reads each task, then only says "ماذا تفكّر الآن؟" when the participant goes quiet. Don't help unless the participant has been stuck for 2 minutes; record that as a failed task. |

## Consent (read aloud, then ask for agreement)

> نحن نختبر برنامجًا لتعلّم القراءة بالإنجليزية، ولا نختبرك أنت. ستستخدم البرنامج حوالي ٣٠ دقيقة وتتحدث بصوت عالٍ عمّا تفكّر فيه. يمكنك التوقف في أي وقت دون أي أثر عليك. لن نسجّل اسمك؛ سنستخدم رقمًا بدلًا منه. إذا وافقت، سنسجّل الشاشة والصوت لنراجع الجلسة لاحقًا فقط. هل توافق؟

*We are testing a program for learning to read English. We are not testing you. You will use it for about 30 minutes and say aloud what you are thinking. You can stop at any time with no consequences. We will not record your name; we will use a number. If you agree, we will record the screen and audio, only to review the session afterwards. Do you agree?*

Record: participant code (P1…P8), device, age band, years of English at school, whether they already knew letter names.

## Tasks

Read each task in Arabic. Record success (✓ without help / ½ with a hint / ✗), time, errors and quotes.

| # | Task (Arabic, read aloud) | Success means |
|---|---|---|
| 1 | افتح البرنامج وابدأ التعلّم. اختر الطريقة المناسبة لك للبدء. | Chooses "beginner" or "placement test" and reaches unit 1 or the test |
| 2 | (iPhone only) أضف البرنامج إلى الشاشة الرئيسية، ثم افتحه من هناك. | Opens the app from its Home Screen icon |
| 3 | في الوحدة الأولى، استمع إلى صوت الحرف p ثم إلى اسمه. | Plays both; can say which one is used for reading |
| 4 | أكمل نشاط «اسمع الصوت». | Finishes; notices the hint after a mistake |
| 5 | أكمل نشاط «إملاء» واكتب ثلاث كلمات. | Uses the on-screen keyboard; understands the coloured feedback |
| 6 | (optional) جرّب «اكتب الحرف». | Traces one letter, then writes it alone |
| 7 | ارجع إلى الصفحة الرئيسية وابدأ «تدريب الأذن» (after unit 2 is open; use the placement test or a prepared phone — a strong reader can reach unit 21 or 23 through the placement test too). | Finishes one round of 16 |
| 8 | ابحث عن الأصوات التي تحتاج إلى تدريب. | Opens the progress report and finds "sounds to practise" |
| 9 | احفظ نسخة احتياطية من تقدّمك وأرسلها لنفسك. | Makes a code and copies or shares it |
| 10 | (prepared phone, unit 21 open) افتح الوحدة ٢١ وأكمل «اقرأ اللافتة». | Finishes; can say what one sign means without looking at the options |
| 11 | (prepared phone, unit 23 open) في «الاستمارات»، أين تكتب رقم هاتفك؟ | Chooses the *Phone* field; says whether they understood the form |

After the tasks, ask: «ما أصعب شيء في البرنامج؟ ما أكثر شيء أفادك؟ هل ستستخدمه غدًا؟ لماذا؟»

## Questionnaire

Use the **validated Arabic SUS** (AlGhannam et al., 2018, *International Journal of Human–Computer Interaction* 34(9), 799–804; doi:10.1080/10447318.2017.1388099). Take the ten items exactly as published; don't translate the English SUS again.

Scoring (standard SUS): for odd items subtract 1 from the answer; for even items subtract the answer from 5; add the ten results and multiply by 2.5 (range 0–100). Report the mean and range. The target is a mean of 70 or more.

## Logs

At the end of the session, on the participant's device: menu → **نسخة احتياطية** → **سجل الإجابات (CSV)**. Save the file under the participant code. Each row has: time, unit, activity, item, try number, delayed re-test, correct, chosen answer, response time (ms), mode (unit, review, weak, perception or placement), graphemes practised, and the confusion (target>chosen). Nothing leaves the phone unless you save this file.

## Analysis and decisions

1. Task success rate per task and per device. Any task below 80% success is a usability problem to fix.
2. A list of problems, each with the number of participants affected and a severity (0 cosmetic … 4 blocks the task). Fix every problem seen in 2 or more participants, and every severity 3–4 problem, before the next round.
3. SUS mean and range. Below 70: fix, then run a second round with new participants.
4. From the logs: time per activity, first-try accuracy per activity, the most common confusions, and whether any activity takes far longer than the others (a sign that its instructions are unclear).
5. Write a one-page summary, and add it to section 10 of `PEDAGOGY_PLAN.md`.
