#!/usr/bin/env python3
"""Evidence for validating the stage benchmarks in a pilot (PEDAGOGY_PLAN.md, section 15).

Input: one benchmark CSV per learner, exported from the app (backup screen -> "نتائج اختبارات المراحل (CSV)")
and named after the learner's study code, e.g. P01.csv. Optionally a criterion file with an external measure
per learner and stage (e.g. words correct per minute read aloud to a teacher, or a teacher's rating):

    participant,stage,measure,value
    P01,1,orf_wcpm,38

Output (Markdown, to stdout):
  1. Descriptives per stage and part (sittings, mean, SD, share meeting the criterion).
  2. Item statistics for the accuracy parts: facility (share right) and item-rest correlation.
  3. Reliability: test-retest for sittings of the same stage within 14 days (both before, or both after,
     the stage); internal consistency (KR-20) for accuracy parts where learners answered the same items.
  4. Pre/post: learners with a sitting before and after finishing the stage (mean gain, paired d_z).
  5. Criterion validity: correlation of each part with the external measures.
  6. Self-assessment: correlation between the mean can-do rating and the benchmark accuracy.

Standard library only. Usage: python tools/pilot/item_analysis.py data/*.csv [--criterion criterion.csv]
"""
import argparse
import csv
import statistics as st
import sys
from collections import defaultdict
from datetime import date
from pathlib import Path

# Must match assess.js BENCHMARK_CRITERIA.
CRITERIA = {'words': ('rate', 20), 'sentences': ('rate', 6), 'decoding': ('acc', 0.8), 'spelling': ('acc', 0.8), 'reading': ('acc', 0.75)}
PARTS = list(CRITERIA)
RETEST_DAYS = 14


def pearson(xs, ys):
    if len(xs) < 3 or len(set(xs)) < 2 or len(set(ys)) < 2:
        return None
    mx, my = st.mean(xs), st.mean(ys)
    num = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    den = (sum((x - mx) ** 2 for x in xs) * sum((y - my) ** 2 for y in ys)) ** 0.5
    return num / den if den else None


def fmt(v, digits=2):
    return '–' if v is None else f'{v:.{digits}f}'


def read_sittings(paths):
    """{(participant, sitting): {stage, date, after, parts: {part: score}, items: [(part, item, ok)], can: {id: r}}}"""
    sittings = {}
    for path in paths:
        who = Path(path).stem
        with open(path, newline='', encoding='utf-8') as f:
            for row in csv.DictReader(f):
                key = (who, int(row['sitting']))
                s = sittings.setdefault(key, {'who': who, 'stage': int(row['stage']), 'date': date.fromisoformat(row['date']),
                                              'after': row['after_stage'] == '1', 'parts': {}, 'items': [], 'can': {}})
                part, item = row['part'], row['item']
                if part == 'can-do':
                    s['can'][item] = int(row['correct'])
                elif item == '(part)':
                    if CRITERIA[part][0] == 'rate':
                        right, wrong, sec = float(row['right']), float(row['wrong']), float(row['seconds'])
                        s['parts'][part] = max(0.0, (right - wrong) * 60 / sec) if sec > 0 else 0.0
                    else:
                        right, total = float(row['right']), float(row['total'])
                        s['parts'][part] = right / total if total else 0.0
                else:
                    s['items'].append((part, item, int(row['correct'])))
    return list(sittings.values())


def met(part, value):
    kind, cut = CRITERIA[part]
    return value >= cut


def descriptives(sittings):
    out = ['## 1. Descriptives', '', '| Stage | Part | Sittings | Mean | SD | Meeting the criterion |', '|---|---|---|---|---|---|']
    for stage in sorted({s['stage'] for s in sittings}):
        for part in PARTS:
            vals = [s['parts'][part] for s in sittings if s['stage'] == stage and part in s['parts']]
            if not vals:
                continue
            sd = st.stdev(vals) if len(vals) > 1 else None
            share = sum(met(part, v) for v in vals) / len(vals)
            out.append(f'| {stage} | {part} | {len(vals)} | {fmt(st.mean(vals))} | {fmt(sd)} | {share:.0%} |')
    return out


def item_statistics(sittings):
    out = ['', '## 2. Item statistics (accuracy parts)', '',
           'Facility = share right. Item-rest r = correlation between the item and the rest of its part (needs ≥ 5 answers).',
           'Flag items with facility above 0.95 or below 0.2, or item-rest r below 0.2.', '',
           '| Stage | Part | Item | Answers | Facility | Item-rest r | Flag |', '|---|---|---|---|---|---|---|']
    groups = defaultdict(list)   # (stage, part, item) -> [(ok, rest score)]
    for s in sittings:
        by_part = defaultdict(list)
        for part, item, ok in s['items']:
            if CRITERIA[part][0] == 'acc':
                by_part[part].append((item, ok))
        for part, answers in by_part.items():
            total = sum(ok for _, ok in answers)
            for item, ok in answers:
                rest = (total - ok) / max(1, len(answers) - 1)
                groups[(s['stage'], part, item)].append((ok, rest))
    for (stage, part, item), rows in sorted(groups.items()):
        oks = [r[0] for r in rows]
        fac = sum(oks) / len(oks)
        r = pearson(oks, [r[1] for r in rows]) if len(rows) >= 5 else None
        flag = 'easy' if fac > 0.95 else 'hard' if fac < 0.2 else 'low r' if r is not None and r < 0.2 else ''
        out.append(f'| {stage} | {part} | {item} | {len(rows)} | {fac:.2f} | {fmt(r)} | {flag} |')
    return out


def kr20(matrix):
    """KR-20 for a learners x items 0/1 matrix (complete rows only)."""
    k = len(matrix[0])
    if len(matrix) < 5 or k < 2:
        return None
    totals = [sum(row) for row in matrix]
    var = st.pvariance(totals)
    if var == 0:
        return None
    pq = sum((sum(row[j] for row in matrix) / len(matrix)) * (1 - sum(row[j] for row in matrix) / len(matrix)) for j in range(k))
    return (k / (k - 1)) * (1 - pq / var)


def reliability(sittings):
    out = ['', '## 3. Reliability', '', f'Test-retest: two sittings of the same stage by the same learner, ≤ {RETEST_DAYS} days apart, '
           'both before or both after finishing the stage (target r ≥ 0.80 for decisions about a learner).', '',
           '| Stage | Part | Pairs | r |', '|---|---|---|---|']
    by_learner = defaultdict(list)
    for s in sittings:
        by_learner[(s['who'], s['stage'], s['after'])].append(s)
    pairs = defaultdict(list)
    for (who, stage, after), ss in by_learner.items():
        ss.sort(key=lambda s: s['date'])
        for a, b in zip(ss, ss[1:]):
            if (b['date'] - a['date']).days <= RETEST_DAYS:
                for part in PARTS:
                    if part in a['parts'] and part in b['parts']:
                        pairs[(stage, part)].append((a['parts'][part], b['parts'][part]))
                break
    for (stage, part), ps in sorted(pairs.items()):
        out.append(f'| {stage} | {part} | {len(ps)} | {fmt(pearson([p[0] for p in ps], [p[1] for p in ps]))} |')
    out += ['', 'Internal consistency (KR-20) where at least 5 sittings had exactly the same items:', '',
            '| Stage | Part | Sittings | Items | KR-20 |', '|---|---|---|---|---|']
    forms = defaultdict(list)
    for s in sittings:
        for part in PARTS:
            if CRITERIA[part][0] != 'acc':
                continue
            answers = sorted((item, ok) for p, item, ok in s['items'] if p == part)
            if answers:
                forms[(s['stage'], part, tuple(i for i, _ in answers))].append([ok for _, ok in answers])
    for (stage, part, items), matrix in sorted(forms.items()):
        if len(matrix) >= 5:
            out.append(f'| {stage} | {part} | {len(matrix)} | {len(items)} | {fmt(kr20(matrix))} |')
    return out


def pre_post(sittings):
    out = ['', '## 4. Before and after the stage', '', 'First sitting before finishing the stage vs first sitting after it.', '',
           '| Stage | Part | Learners | Before | After | Gain | d_z |', '|---|---|---|---|---|---|---|']
    first = {}
    for s in sorted(sittings, key=lambda s: s['date']):
        first.setdefault((s['who'], s['stage'], s['after']), s)
    for stage in sorted({s['stage'] for s in sittings}):
        for part in PARTS:
            pairs = [(first[(w, stage, False)]['parts'][part], first[(w, stage, True)]['parts'][part])
                     for (w, sg, after) in first if sg == stage and not after and (w, stage, True) in first
                     and part in first[(w, stage, False)]['parts'] and part in first[(w, stage, True)]['parts']]
            if len(pairs) < 2:
                continue
            gains = [b - a for a, b in pairs]
            sd = st.stdev(gains)
            dz = st.mean(gains) / sd if sd else None
            out.append(f'| {stage} | {part} | {len(pairs)} | {fmt(st.mean(a for a, _ in pairs))} | {fmt(st.mean(b for _, b in pairs))} | {fmt(st.mean(gains))} | {fmt(dz)} |')
    return out


def criterion_validity(sittings, path):
    out = ['', '## 5. Criterion validity', '']
    if not path:
        return out + ['No criterion file given (--criterion).']
    ext = defaultdict(dict)   # (who, stage) -> {measure: value}
    with open(path, newline='', encoding='utf-8') as f:
        for row in csv.DictReader(f):
            ext[(row['participant'], int(row['stage']))][row['measure']] = float(row['value'])
    latest = {}
    for s in sorted(sittings, key=lambda s: s['date']):
        latest[(s['who'], s['stage'])] = s
    measures = sorted({m for v in ext.values() for m in v})
    out += ['Latest sitting of each learner and stage vs the external measure (target r ≥ 0.50).', '',
            '| Measure | Part | Learners | r |', '|---|---|---|---|']
    for m in measures:
        for part in PARTS:
            xs, ys = [], []
            for key, s in latest.items():
                if key in ext and m in ext[key] and part in s['parts']:
                    xs.append(s['parts'][part])
                    ys.append(ext[key][m])
            if xs:
                out.append(f'| {m} | {part} | {len(xs)} | {fmt(pearson(xs, ys))} |')
    return out


def self_assessment(sittings):
    xs, ys = [], []
    for s in sittings:
        acc = [s['parts'][p] for p in PARTS if CRITERIA[p][0] == 'acc' and p in s['parts']]
        if s['can'] and acc:
            xs.append(st.mean(s['can'].values()))
            ys.append(st.mean(acc))
    return ['', '## 6. Self-assessment', '',
            f'Mean can-do rating (0-2) vs mean accuracy: {len(xs)} sittings, r = {fmt(pearson(xs, ys))}. '
            'Self-assessment of reading usually correlates moderately with test scores; a low r here means learners need help judging their own reading.']


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('files', nargs='+', help="learners' benchmark CSV files (named after the study code)")
    ap.add_argument('--criterion', help='CSV with participant,stage,measure,value')
    args = ap.parse_args()
    sittings = read_sittings(args.files)
    if not sittings:
        print('No benchmark sittings found.')
        return 1
    learners = len({s['who'] for s in sittings})
    lines = [f'# Benchmark pilot analysis', '', f'{learners} learners, {len(sittings)} sittings.', '']
    lines += descriptives(sittings) + item_statistics(sittings) + reliability(sittings) + pre_post(sittings)
    lines += criterion_validity(sittings, args.criterion) + self_assessment(sittings)
    print('\n'.join(lines))
    return 0


if __name__ == '__main__':
    sys.exit(main())
