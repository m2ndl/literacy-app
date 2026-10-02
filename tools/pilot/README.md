# Pilot tools

`item_analysis.py` checks the stage benchmarks with pilot data (PEDAGOGY_PLAN.md, section 15). It uses only the Python standard library.

1. On each learner's phone, open the menu, then **نسخة احتياطية**, then **نتائج اختبارات المراحل (CSV)**. Save the file as the learner's study code (`P01.csv`, `P02.csv`, …), never as their name.
2. Optional: write a criterion file with measures taken by a teacher. For example, words correct per minute in one minute of oral reading (`orf_wcpm`), or a 1–5 rating against the CEFR Pre-A1/A1 reading descriptors:

   ```csv
   participant,stage,measure,value
   P01,1,orf_wcpm,38
   P01,1,teacher_cefr,2
   ```

3. Run:

   ```bash
   python3 tools/pilot/item_analysis.py data/P*.csv --criterion data/criterion.csv > report.md
   ```

The report covers:
- descriptives per stage and part;
- item facility and item–rest correlation, with flags;
- test–retest (two sittings ≤ 14 days apart) and KR-20 reliability;
- before/after gains with paired effect sizes;
- correlations with the criterion measures;
- the relation between can-do self-ratings and accuracy.

The decisions it supports (revise items, lengthen parts, set the speed criteria in `assess.js`) are described in PEDAGOGY_PLAN.md, section 15.
