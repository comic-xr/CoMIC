"""
Final paired-bootstrap CI table for the Phase-8 length-adaptive r paper claim.
Adds adaptive policies + true vanilla to the earlier Pareto.
"""
import json, random
random.seed(42)

FILES = {
    'vanilla (r=1.00)': 'mlvu_p8_truevanilla_plotqa_n539.json',
    'r=0.30 (control)': 'mlvu_stamptemporal_r0.3__c5_merge_multi7152331_tast32g0.1__n539_phase7control.json',
    'r=0.50 (fixed)': 'mlvu_stamptemporal_r0.5__c5_merge_multi7152331_tast32g0.1.json',
    'r=0.70 (fixed)': 'mlvu_stamptemporal_r0.7__c5_merge_multi7152331_tast32g0.1.json',
    'r=0.85 (fixed)': 'mlvu_p8_path1_r085_n539.json',
    'adaptive continuous': 'mlvu_stamptemporal_r0.3__c5_merge_multi7152331_tast32g0.1_rpol_length_adaptive_rmin0.3_rmax0.85_dthr300.0.json',
    'adaptive hard threshold': 'mlvu_stamptemporal_r0.3__c5_merge_multi7152331_tast32g0.1_rpol_length_adaptive_hard_rmin0.3_rmax0.85_dthr300.0.json',
}

def load(path):
    d = json.load(open(path))
    out = {}
    for r in d.get('results', d) if isinstance(d, dict) else d:
        if isinstance(r, dict) and 'correct' in r:
            out[(r['video'], r['question'])] = 1 if r['correct'] else 0
    return out

vecs = {k: load(v) for k, v in FILES.items()}
keys = sorted(set.intersection(*[set(v.keys()) for v in vecs.values()]))
print(f"Common samples: {len(keys)} (paired)")

def bs_paired(a, b, B=10000):
    pairs = list(zip(a, b))
    n = len(pairs)
    point = (sum(x for x, _ in pairs) - sum(y for _, y in pairs)) / n
    s = []
    for _ in range(B):
        idx = [random.randint(0, n - 1) for _ in range(n)]
        a_acc = sum(pairs[i][0] for i in idx) / n
        b_acc = sum(pairs[i][1] for i in idx) / n
        s.append(a_acc - b_acc)
    s.sort()
    return point, s[int(B * 0.025)], s[int(B * 0.975)]

print()
print("Absolute accuracies on paired n=" + str(len(keys)) + ":")
for label in FILES:
    a = [vecs[label][k] for k in keys]
    acc = sum(a) / len(a) * 100
    print(f"  {label:<26} {acc:6.2f}%")

print()
print("Paired Δ vs r=0.30 control (paper benchmark vs r=0.30 baseline):")
ctrl = [vecs['r=0.30 (control)'][k] for k in keys]
for label in ['r=0.50 (fixed)', 'r=0.70 (fixed)', 'r=0.85 (fixed)', 'adaptive continuous', 'adaptive hard threshold', 'vanilla (r=1.00)']:
    a = [vecs[label][k] for k in keys]
    d, lo, hi = bs_paired(a, ctrl)
    sig = "**" if (lo > 0 or hi < 0) else "  "
    print(f"  {label:<26} Δ={d*100:+6.2f} pp  [{lo*100:+.2f}, {hi*100:+.2f}]  {sig}")

print()
print("Paired Δ vs vanilla r=1.00 (how close are we to the unpruned ceiling?):")
van = [vecs['vanilla (r=1.00)'][k] for k in keys]
for label in ['r=0.30 (control)', 'r=0.50 (fixed)', 'r=0.70 (fixed)', 'r=0.85 (fixed)', 'adaptive continuous', 'adaptive hard threshold']:
    a = [vecs[label][k] for k in keys]
    d, lo, hi = bs_paired(a, van)
    if lo <= 0 <= hi:
        verdict = "in noise (within CI of vanilla)"
    elif hi < 0:
        verdict = "sig. LOWER than vanilla"
    else:
        verdict = "sig. HIGHER than vanilla"
    print(f"  {label:<26} Δ={d*100:+6.2f} pp  [{lo*100:+.2f}, {hi*100:+.2f}]  {verdict}")
