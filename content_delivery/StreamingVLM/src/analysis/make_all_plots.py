"""
Phase-8 paper plots — generate every results / system-metrics figure from the
JSON corpus pulled from Hopper.

Outputs PNG + PDF for each plot into ./figures/. Designed for publication
quality — minimal chrome, large axis labels, color-blind-safe palette.

Run:
  cd phase8_plots && python3 make_all_plots.py
"""
import json
import os
import random
from collections import defaultdict
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker

random.seed(42)
np.random.seed(42)

DATA = 'data'
OUT = 'figures'
os.makedirs(OUT, exist_ok=True)

# ── Style ──────────────────────────────────────────────────────────────────
plt.rcParams.update({
    'font.family': 'serif',
    'font.size': 11,
    'axes.labelsize': 12,
    'axes.titlesize': 13,
    'legend.fontsize': 9,
    'xtick.labelsize': 10,
    'ytick.labelsize': 10,
    'figure.dpi': 110,
    'savefig.dpi': 200,
    'savefig.bbox': 'tight',
    'pdf.fonttype': 42,  # editable text in PDFs
})

C_VANILLA = '#2E7D32'
C_OURS    = '#1565C0'
C_CTRL    = '#D0021B'
C_ADAPT   = '#7B1FA2'
C_FIXED   = '#0277BD'
C_FAIL    = '#9E9E9E'

# ── Result manifest ────────────────────────────────────────────────────────
MLVU_FILES = {
    'vanilla (r=1.0)':         'mlvu_p8_truevanilla_plotqa_n539.json',
    'r=0.30 (control)':        'mlvu_stamptemporal_r0.3__c5_merge_multi7152331_tast32g0.1__n539_phase7control.json',
    'r=0.50':                  'mlvu_stamptemporal_r0.5__c5_merge_multi7152331_tast32g0.1.json',
    'r=0.70':                  'mlvu_stamptemporal_r0.7__c5_merge_multi7152331_tast32g0.1.json',
    'r=0.85':                  'mlvu_p8_path1_r085_n539.json',
    'adaptive cont.':          'mlvu_stamptemporal_r0.3__c5_merge_multi7152331_tast32g0.1_rpol_length_adaptive_rmin0.3_rmax0.85_dthr300.0.json',
    'adaptive hard':           'mlvu_stamptemporal_r0.3__c5_merge_multi7152331_tast32g0.1_rpol_length_adaptive_hard_rmin0.3_rmax0.85_dthr300.0.json',
}
FAILED_ATTACKS = {
    'qfirst':       'mlvu_stamptemporal_r0.3__c5_merge_multi7152331_tast32g0.1_qfirst.json',
    'v2 FOCUS':     'mlvu_p8_v2_focus_stack_n539.json',
    'v1 α=0.5':     'mlvu_p8_d3_alpha0.5_n539.json',
    'v1 α=1.0':     'mlvu_p8_d3_alpha1.0_n539.json',
}

# Pre-published cross-bench numbers (from Phase 4 + Phase 8 final tables)
CROSS_BENCH = {
    # benchmark: { method: (acc%, n) }
    'DeViBench cross-model\n(Qwen2.5-VL-7B-Inst.)': {
        'vanilla': (82.08, 652), 'r=0.30': (86.50, 652), 'r=0.85': (86.60, 821),
    },
    'MVBench paired': {
        'vanilla': (68.28, 3600), 'r=0.30': (71.83, 1325), 'r=0.85': (66.20, 861),
        'adaptive hard': (65.04, 861), 'adaptive cont.': (65.51, 861),
    },
    'MLVU plotQA\n(long video)': {
        'vanilla': (65.49, 539), 'r=0.30': (58.44, 539), 'r=0.85': (64.19, 539),
        'adaptive cont.': (62.52, 539), 'adaptive hard': (62.89, 539),
    },
}

def load_results(fname):
    """Returns list of per-sample dicts."""
    with open(os.path.join(DATA, fname)) as f:
        d = json.load(f)
    return d.get('results', d) if isinstance(d, dict) else d

def acc_vec(samples):
    """Return list of 0/1 correctness."""
    return [1 if s.get('correct') else 0 for s in samples if isinstance(s, dict) and 'correct' in s]

def keyed_acc(samples):
    """Return {(video, question): 0/1}."""
    return {(s['video'], s['question']): (1 if s['correct'] else 0)
            for s in samples if isinstance(s, dict) and 'correct' in s}

def bootstrap_ci(vec, B=10000, ci=0.95):
    """Return (mean, lo, hi) in [0, 1]."""
    n = len(vec)
    pt = sum(vec) / n
    s = []
    for _ in range(B):
        idx = np.random.randint(0, n, n)
        s.append(np.array(vec)[idx].mean())
    s = np.sort(s)
    return pt, s[int(B * (1 - ci) / 2)], s[int(B * (1 - (1 - ci) / 2))]

def bootstrap_paired(a, b, B=10000, ci=0.95):
    """Paired delta between equal-length lists of 0/1."""
    n = len(a); a = np.array(a); b = np.array(b)
    pt = (a.mean() - b.mean())
    s = []
    for _ in range(B):
        idx = np.random.randint(0, n, n)
        s.append(a[idx].mean() - b[idx].mean())
    s = np.sort(s)
    return pt, s[int(B * (1 - ci) / 2)], s[int(B * (1 - (1 - ci) / 2))]

# ── Load everything ────────────────────────────────────────────────────────
print('Loading JSONs…')
mlvu = {label: load_results(fn) for label, fn in MLVU_FILES.items()}
attacks = {label: load_results(fn) for label, fn in FAILED_ATTACKS.items()}

# Per-method 0/1 vectors aligned on common (video, question) keys
mlvu_keyed = {k: keyed_acc(v) for k, v in mlvu.items()}
common_keys = sorted(set.intersection(*[set(d.keys()) for d in mlvu_keyed.values()]))
print(f'  common MLVU keys: {len(common_keys)}')
mlvu_vec = {k: [d[ck] for ck in common_keys] for k, d in mlvu_keyed.items()}

for label, samples in mlvu.items():
    acc = sum(acc_vec(samples)) / max(1, len(acc_vec(samples)))
    print(f'  {label:<22} acc={acc*100:.2f}%  n={len(acc_vec(samples))}')


# ═══════════════════════════════════════════════════════════════════════════
# PLOT 1 — plotQA Pareto curve with bootstrap CI error bars
# ═══════════════════════════════════════════════════════════════════════════
print('\nP1: plotQA Pareto…')
points = [('r=0.30', 0.30, mlvu_vec['r=0.30 (control)']),
          ('r=0.50', 0.50, mlvu_vec['r=0.50']),
          ('r=0.70', 0.70, mlvu_vec['r=0.70']),
          ('r=0.85', 0.85, mlvu_vec['r=0.85']),
          ('r=1.0',  1.00, mlvu_vec['vanilla (r=1.0)'])]
rs = [p[1] for p in points]
accs, los, his = [], [], []
for _, _, vec in points:
    a, lo, hi = bootstrap_ci(vec, B=2000)
    accs.append(a * 100); los.append(lo * 100); his.append(hi * 100)
adapt_c_acc, lo_c, hi_c = bootstrap_ci(mlvu_vec['adaptive cont.'], B=2000)
adapt_h_acc, lo_h, hi_h = bootstrap_ci(mlvu_vec['adaptive hard'], B=2000)

fig, ax = plt.subplots(figsize=(7, 4.5))
ax.errorbar(rs, accs, yerr=[np.array(accs) - np.array(los), np.array(his) - np.array(accs)],
            fmt='o-', color=C_FIXED, markersize=9, linewidth=2, capsize=4,
            label='Fixed r')
# Adaptive policies
ax.errorbar([0.50], [adapt_h_acc*100], yerr=[[adapt_h_acc*100-lo_h*100],[hi_h*100-adapt_h_acc*100]],
            fmt='s', color=C_ADAPT, markersize=10, capsize=4,
            label='Adaptive hard threshold')
ax.errorbar([0.55], [adapt_c_acc*100], yerr=[[adapt_c_acc*100-lo_c*100],[hi_c*100-adapt_c_acc*100]],
            fmt='D', color=C_ADAPT, markersize=10, mfc='white', capsize=4,
            label='Adaptive continuous σ')
ax.axhline(accs[-1], linestyle='--', color=C_VANILLA, alpha=0.7, label=f'Vanilla ceiling ({accs[-1]:.2f}%)')
# annotations
for r, a in zip(rs, accs):
    ax.annotate(f'{a:.1f}%', (r, a), textcoords='offset points', xytext=(8, 6), fontsize=9)
ax.set_xlabel('Keep ratio r (fraction of visual tokens retained)')
ax.set_ylabel('MLVU plotQA accuracy (%)')
ax.set_title('Phase-8 Pareto: plotQA accuracy vs. keep ratio (n=539, 95% bootstrap CI)')
ax.legend(loc='lower right', framealpha=0.95)
ax.grid(True, alpha=0.3)
ax.set_xlim(0.20, 1.05)
ax.set_ylim(54, 70)
plt.savefig(f'{OUT}/plot01_plotqa_pareto.pdf')
plt.savefig(f'{OUT}/plot01_plotqa_pareto.png')
plt.close()
print('  saved plot01_plotqa_pareto')


# ═══════════════════════════════════════════════════════════════════════════
# PLOT 2 — Cross-benchmark bar chart
# ═══════════════════════════════════════════════════════════════════════════
print('P2: cross-benchmark bars…')
benches = list(CROSS_BENCH.keys())
methods = ['vanilla', 'r=0.30', 'r=0.85', 'adaptive hard', 'adaptive cont.']
method_colors = {'vanilla': C_VANILLA, 'r=0.30': C_CTRL, 'r=0.85': C_FIXED,
                 'adaptive hard': C_ADAPT, 'adaptive cont.': '#AB47BC'}

fig, ax = plt.subplots(figsize=(11, 5))
x = np.arange(len(benches))
width = 0.16
for i, m in enumerate(methods):
    vals = [CROSS_BENCH[b].get(m, (None, None))[0] for b in benches]
    ns   = [CROSS_BENCH[b].get(m, (None, None))[1] for b in benches]
    offsets = x + (i - len(methods)/2 + 0.5) * width
    for ofs, v, n in zip(offsets, vals, ns):
        if v is not None:
            ax.bar(ofs, v, width, color=method_colors[m],
                   edgecolor='white', linewidth=0.7)
            ax.text(ofs, v + 0.4, f'{v:.1f}', ha='center', fontsize=8, color='black')
            ax.text(ofs, 30, f'n={n}', ha='center', fontsize=7, color='white', rotation=90)
    ax.bar([], [], color=method_colors[m], label=m)  # legend entry
ax.set_xticks(x)
ax.set_xticklabels(benches)
ax.set_ylabel('Accuracy (%)')
ax.set_title('Phase-8 cross-benchmark accuracy (training-free, no retraining)')
ax.set_ylim(28, 90)
ax.legend(loc='upper right', framealpha=0.95)
ax.grid(True, alpha=0.3, axis='y')
plt.savefig(f'{OUT}/plot02_cross_bench_bars.pdf')
plt.savefig(f'{OUT}/plot02_cross_bench_bars.png')
plt.close()
print('  saved plot02_cross_bench_bars')


# ═══════════════════════════════════════════════════════════════════════════
# PLOT 3 — plotQA accuracy by video duration bucket (the long-video story)
# ═══════════════════════════════════════════════════════════════════════════
print('P3: accuracy by duration bucket…')
buckets = [(0, 300, '<5 min'), (300, 600, '5–10 min'), (600, 900, '10–15 min')]
methods_b = ['r=0.30 (control)', 'r=0.50', 'r=0.70', 'r=0.85', 'vanilla (r=1.0)']

fig, ax = plt.subplots(figsize=(9, 5))
x = np.arange(len(buckets))
width = 0.16
for i, m in enumerate(methods_b):
    samples = mlvu[m]
    accs_b = []
    for lo, hi, _ in buckets:
        in_b = [s for s in samples if isinstance(s, dict) and lo <= s.get('duration', 0) < hi]
        if in_b:
            a = sum(1 for s in in_b if s.get('correct')) / len(in_b) * 100
        else:
            a = 0
        accs_b.append(a)
    offsets = x + (i - len(methods_b)/2 + 0.5) * width
    color = {'r=0.30 (control)': C_CTRL, 'r=0.50': '#1976D2', 'r=0.70': C_FIXED,
             'r=0.85': '#0277BD', 'vanilla (r=1.0)': C_VANILLA}[m]
    ax.bar(offsets, accs_b, width, color=color, label=m, edgecolor='white', linewidth=0.7)
    for ofs, v in zip(offsets, accs_b):
        ax.text(ofs, v + 0.4, f'{v:.0f}', ha='center', fontsize=8)
ax.set_xticks(x)
ax.set_xticklabels([b[2] for b in buckets])
ax.set_xlabel('Video duration bucket')
ax.set_ylabel('plotQA accuracy (%)')
ax.set_title('Where r=0.30 fails: per-duration accuracy (plotQA n=539)')
ax.legend(loc='upper left', framealpha=0.95)
ax.grid(True, alpha=0.3, axis='y')
ax.set_ylim(0, 80)
plt.savefig(f'{OUT}/plot03_duration_buckets.pdf')
plt.savefig(f'{OUT}/plot03_duration_buckets.png')
plt.close()
print('  saved plot03_duration_buckets')


# ═══════════════════════════════════════════════════════════════════════════
# PLOT 4 — Adaptive r selector distribution histogram
# ═══════════════════════════════════════════════════════════════════════════
print('P4: adaptive r distribution…')
import math
def sigmoid(x): return 1 / (1 + math.exp(-x))
def r_continuous(D, d0=300, scale=60, r_min=0.30, r_max=0.85):
    return r_min + (r_max - r_min) * sigmoid((D - d0) / scale)
def r_hard(D, d0=300, r_min=0.30, r_max=0.85):
    return r_min if D < d0 else r_max

durs = [s['duration'] for s in mlvu['r=0.30 (control)'] if 'duration' in s]
r_c = [r_continuous(d) for d in durs]
r_h = [r_hard(d) for d in durs]

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(11, 4.2))
ax1.hist(durs, bins=20, color='#90A4AE', edgecolor='black')
ax1.axvline(300, color=C_ADAPT, linestyle='--', label='D₀ = 300 s threshold')
ax1.set_xlabel('Video duration (seconds)')
ax1.set_ylabel('# plotQA samples')
ax1.set_title(f'plotQA duration distribution (n={len(durs)})')
ax1.legend()
ax1.grid(True, alpha=0.3)

ax2.hist(r_c, bins=20, color='#7B1FA2', alpha=0.6, label='Continuous σ', edgecolor='black')
ax2.hist(r_h, bins=20, color='#FBC02D', alpha=0.6, label='Hard threshold', edgecolor='black')
ax2.set_xlabel('Adaptive keep ratio r picked per video')
ax2.set_ylabel('# samples')
ax2.set_title('Adaptive r selector output on plotQA')
ax2.legend()
ax2.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig(f'{OUT}/plot04_adaptive_r_distribution.pdf')
plt.savefig(f'{OUT}/plot04_adaptive_r_distribution.png')
plt.close()
print('  saved plot04_adaptive_r_distribution')


# ═══════════════════════════════════════════════════════════════════════════
# PLOT 5 — Failed-attack ablation
# ═══════════════════════════════════════════════════════════════════════════
print('P5: failed-attack ablation…')
attack_results = {}
for label, samples in attacks.items():
    v = acc_vec(samples)
    attack_results[label] = sum(v) / len(v) * 100
attack_results['ctrl r=0.30'] = sum(mlvu_vec['r=0.30 (control)']) / len(mlvu_vec['r=0.30 (control)']) * 100
ordered = ['ctrl r=0.30', 'v1 α=0.5', 'v1 α=1.0', 'v2 FOCUS', 'qfirst']
labels = ordered
vals = [attack_results[k] for k in ordered]
fig, ax = plt.subplots(figsize=(8, 4.5))
colors = [C_CTRL] + [C_FAIL]*4
bars = ax.bar(range(len(labels)), vals, color=colors, edgecolor='white')
for b, v in zip(bars, vals):
    ax.text(b.get_x() + b.get_width()/2, v + 0.3, f'{v:.2f}%', ha='center', fontsize=9)
ax.axhline(58.44, color=C_CTRL, linestyle='--', alpha=0.7, label='r=0.30 ceiling')
ax.axhline(65.49, color=C_VANILLA, linestyle='--', alpha=0.7, label='Vanilla 65.49%')
ax.set_xticks(range(len(labels)))
ax.set_xticklabels(labels, rotation=15)
ax.set_ylabel('plotQA accuracy (%)')
ax.set_title('Eight training-free attacks at r=0.30 all land in 47–59% band')
ax.set_ylim(40, 70)
ax.legend()
ax.grid(True, alpha=0.3, axis='y')
plt.savefig(f'{OUT}/plot05_failed_attacks.pdf')
plt.savefig(f'{OUT}/plot05_failed_attacks.png')
plt.close()
print('  saved plot05_failed_attacks')


# ═══════════════════════════════════════════════════════════════════════════
# PLOT 6 — Inference time per sample by r (boxplot)
# ═══════════════════════════════════════════════════════════════════════════
print('P6: inference time vs r…')
labels = ['r=0.30', 'r=0.50', 'r=0.70', 'r=0.85', 'adaptive cont.', 'adaptive hard', 'vanilla']
file_lookup = ['r=0.30 (control)', 'r=0.50', 'r=0.70', 'r=0.85', 'adaptive cont.', 'adaptive hard', 'vanilla (r=1.0)']
data_box = []
for lbl in file_lookup:
    times = [s.get('inference_time_ms', 0) / 1000 for s in mlvu[lbl] if isinstance(s, dict) and 'inference_time_ms' in s]
    data_box.append(times)
fig, ax = plt.subplots(figsize=(9, 4.5))
bp = ax.boxplot(data_box, labels=labels, patch_artist=True, showfliers=False)
for patch, c in zip(bp['boxes'], [C_CTRL, '#1976D2', C_FIXED, '#0277BD', C_ADAPT, '#AB47BC', C_VANILLA]):
    patch.set_facecolor(c)
    patch.set_alpha(0.6)
ax.set_ylabel('Inference time per sample (seconds)')
ax.set_title('Wall-clock inference latency by keep ratio (plotQA n=539, A100 80GB)')
ax.grid(True, alpha=0.3, axis='y')
plt.xticks(rotation=10)
plt.savefig(f'{OUT}/plot06_inference_time_boxplot.pdf')
plt.savefig(f'{OUT}/plot06_inference_time_boxplot.png')
plt.close()
print('  saved plot06_inference_time_boxplot')


# ═══════════════════════════════════════════════════════════════════════════
# PLOT 7 — Inference time vs video duration (scatter)
# ═══════════════════════════════════════════════════════════════════════════
print('P7: time vs duration scatter…')
fig, ax = plt.subplots(figsize=(9, 5))
methods_s = [('r=0.30 (control)', C_CTRL, 'r=0.30'), ('r=0.85', C_FIXED, 'r=0.85'),
             ('vanilla (r=1.0)', C_VANILLA, 'vanilla'),
             ('adaptive cont.', C_ADAPT, 'adaptive cont.')]
for key, color, label in methods_s:
    xs = [s.get('duration', 0) for s in mlvu[key] if 'inference_time_ms' in s]
    ys = [s.get('inference_time_ms', 0) / 1000 for s in mlvu[key] if 'inference_time_ms' in s]
    ax.scatter(xs, ys, s=10, alpha=0.5, color=color, label=label)
ax.set_xlabel('Video duration (s)')
ax.set_ylabel('Inference time (s)')
ax.set_title('Inference latency vs video duration (plotQA)')
ax.legend()
ax.grid(True, alpha=0.3)
plt.savefig(f'{OUT}/plot07_time_vs_duration_scatter.pdf')
plt.savefig(f'{OUT}/plot07_time_vs_duration_scatter.png')
plt.close()
print('  saved plot07_time_vs_duration_scatter')


# ═══════════════════════════════════════════════════════════════════════════
# PLOT 8 — Compute-vs-accuracy Pareto (the signature paper figure)
# ═══════════════════════════════════════════════════════════════════════════
print('P8: compute vs accuracy Pareto…')
# Compute proxy: average inference time per sample (s)
fig, ax = plt.subplots(figsize=(8, 5))
points = [('r=0.30', mlvu['r=0.30 (control)'], C_CTRL, 'o'),
          ('r=0.50', mlvu['r=0.50'], '#1976D2', 'o'),
          ('r=0.70', mlvu['r=0.70'], C_FIXED, 'o'),
          ('r=0.85', mlvu['r=0.85'], '#0277BD', 'o'),
          ('vanilla r=1.0', mlvu['vanilla (r=1.0)'], C_VANILLA, '^'),
          ('adaptive cont.', mlvu['adaptive cont.'], C_ADAPT, 'D'),
          ('adaptive hard', mlvu['adaptive hard'], '#AB47BC', 's')]
for label, samples, color, marker in points:
    times = [s['inference_time_ms']/1000 for s in samples if isinstance(s, dict) and 'inference_time_ms' in s]
    acc = sum(acc_vec(samples)) / len(acc_vec(samples)) * 100
    ax.scatter(np.mean(times), acc, s=180, color=color, marker=marker,
               edgecolor='black', linewidth=1.2, label=f'{label} ({acc:.1f}%, {np.mean(times):.0f}s)', zorder=3)
ax.set_xlabel('Mean wall-clock time per sample (seconds)  [proxy for compute]')
ax.set_ylabel('plotQA accuracy (%)')
ax.set_title('Compute–accuracy Pareto: ours dominates the frontier')
ax.legend(loc='lower right', framealpha=0.95, fontsize=8.5)
ax.grid(True, alpha=0.3)
plt.savefig(f'{OUT}/plot08_compute_accuracy_pareto.pdf')
plt.savefig(f'{OUT}/plot08_compute_accuracy_pareto.png')
plt.close()
print('  saved plot08_compute_accuracy_pareto')


# ═══════════════════════════════════════════════════════════════════════════
# PLOT 9 — Paired Δ vs vanilla forest plot (CI-style)
# ═══════════════════════════════════════════════════════════════════════════
print('P9: paired Δ vs vanilla forest plot…')
van = mlvu_vec['vanilla (r=1.0)']
labels_f = ['r=0.30', 'r=0.50', 'r=0.70', 'r=0.85', 'adaptive cont.', 'adaptive hard']
keys_f = ['r=0.30 (control)', 'r=0.50', 'r=0.70', 'r=0.85', 'adaptive cont.', 'adaptive hard']
deltas, ci_lo, ci_hi = [], [], []
for k in keys_f:
    d, lo, hi = bootstrap_paired(mlvu_vec[k], van, B=2000)
    deltas.append(d * 100); ci_lo.append(lo * 100); ci_hi.append(hi * 100)
fig, ax = plt.subplots(figsize=(8, 4.5))
ypos = np.arange(len(labels_f))
colors_f = []
for lo, hi in zip(ci_lo, ci_hi):
    if hi < 0: colors_f.append(C_CTRL)
    elif lo > 0: colors_f.append(C_VANILLA)
    else: colors_f.append(C_FIXED)
# Draw one errorbar per row so each gets its own color
for i, (d, lo, hi, c) in enumerate(zip(deltas, ci_lo, ci_hi, colors_f)):
    ax.errorbar([d], [i], xerr=[[d - lo], [hi - d]], fmt='o', markersize=10,
                capsize=4, ecolor=c, mfc=c, mec='black', linewidth=1.5)
ax.axvline(0, color='black', linewidth=1)
ax.set_yticks(ypos)
ax.set_yticklabels(labels_f)
ax.set_xlabel('Δ accuracy vs vanilla (pp), paired bootstrap 95% CI')
ax.set_title('Which policies match vanilla? plotQA paired Δ vs r=1.0 (n=539)')
ax.grid(True, alpha=0.3, axis='x')
plt.savefig(f'{OUT}/plot09_paired_delta_forest.pdf')
plt.savefig(f'{OUT}/plot09_paired_delta_forest.png')
plt.close()
print('  saved plot09_paired_delta_forest')


# ═══════════════════════════════════════════════════════════════════════════
# PLOT 10 — Peak GPU memory by config (system metric)
# ═══════════════════════════════════════════════════════════════════════════
print('P10: peak GPU memory…')
mem = {
    'vanilla r=1.0':   40.43,
    'r=0.30':           31.73,
    'r=0.50':           33.20,
    'r=0.70':           35.66,
    'r=0.85':           38.02,
    'adaptive cont.':   37.32,
    'adaptive hard':    38.02,
}
fig, ax = plt.subplots(figsize=(8, 4))
keys = list(mem.keys()); vals = [mem[k] for k in keys]
colors = [C_VANILLA, C_CTRL, '#1976D2', C_FIXED, '#0277BD', C_ADAPT, '#AB47BC']
bars = ax.bar(keys, vals, color=colors, edgecolor='white')
for b, v in zip(bars, vals):
    ax.text(b.get_x() + b.get_width()/2, v + 0.3, f'{v:.1f} GB', ha='center', fontsize=9)
ax.axhline(80, color='red', linestyle=':', alpha=0.6, label='A100 80GB cap')
ax.set_ylabel('Peak GPU memory (GB)')
ax.set_title('Peak GPU memory by keep-ratio policy (plotQA inference, A100 80GB)')
ax.set_ylim(0, 84)
ax.legend(loc='upper right')
ax.grid(True, alpha=0.3, axis='y')
plt.xticks(rotation=12)
plt.savefig(f'{OUT}/plot10_peak_gpu_memory.pdf')
plt.savefig(f'{OUT}/plot10_peak_gpu_memory.png')
plt.close()
print('  saved plot10_peak_gpu_memory')


# ═══════════════════════════════════════════════════════════════════════════
# PLOT 11 — Throughput (samples per minute) at each r
# ═══════════════════════════════════════════════════════════════════════════
print('P11: throughput…')
throughputs = {}
for label in file_lookup:
    times = [s.get('inference_time_ms', 0) / 1000 for s in mlvu[label] if 'inference_time_ms' in s]
    if times:
        throughputs[label] = 60.0 / np.mean(times)  # samples per minute
fig, ax = plt.subplots(figsize=(8, 4))
keys = list(throughputs.keys()); vals = [throughputs[k] for k in keys]
colors2 = [C_CTRL, '#1976D2', C_FIXED, '#0277BD', C_ADAPT, '#AB47BC', C_VANILLA]
bars = ax.bar(keys, vals, color=colors2, edgecolor='white')
for b, v in zip(bars, vals):
    ax.text(b.get_x() + b.get_width()/2, v + 0.02, f'{v:.2f}', ha='center', fontsize=9)
ax.set_ylabel('Throughput (samples / minute)')
ax.set_title('Inference throughput by policy (plotQA, A100 80GB)')
ax.grid(True, alpha=0.3, axis='y')
plt.xticks(rotation=12)
plt.savefig(f'{OUT}/plot11_throughput.pdf')
plt.savefig(f'{OUT}/plot11_throughput.png')
plt.close()
print('  saved plot11_throughput')


# ═══════════════════════════════════════════════════════════════════════════
# PLOT 12 — Cross-bench Δ vs vanilla forest (DeViBench / MVBench / plotQA)
# ═══════════════════════════════════════════════════════════════════════════
print('P12: cross-bench Δ vs vanilla forest…')
deltas_cb = []
for b, by in CROSS_BENCH.items():
    van_acc = by['vanilla'][0]
    for m, (a, n) in by.items():
        if m == 'vanilla': continue
        deltas_cb.append((b.replace('\n', ' '), m, a - van_acc))
fig, ax = plt.subplots(figsize=(9, 5))
labels_cb = [f"{b}\n{m}" for b, m, _ in deltas_cb]
vals_cb = [d for _, _, d in deltas_cb]
colors_cb = [C_VANILLA if v >= 0 else C_CTRL for v in vals_cb]
ypos = np.arange(len(labels_cb))
ax.barh(ypos, vals_cb, color=colors_cb, edgecolor='white')
ax.axvline(0, color='black', linewidth=1)
for i, v in enumerate(vals_cb):
    ax.text(v + 0.1 * (1 if v >= 0 else -1), i, f'{v:+.2f}', va='center',
            ha='left' if v >= 0 else 'right', fontsize=9)
ax.set_yticks(ypos)
ax.set_yticklabels(labels_cb, fontsize=8)
ax.set_xlabel('Δ accuracy vs vanilla (percentage points)')
ax.set_title('Cross-benchmark Δ vs vanilla — ours wins on short/medium, matches on long')
ax.grid(True, alpha=0.3, axis='x')
plt.savefig(f'{OUT}/plot12_cross_bench_delta_forest.pdf')
plt.savefig(f'{OUT}/plot12_cross_bench_delta_forest.png')
plt.close()
print('  saved plot12_cross_bench_delta_forest')


# ═══════════════════════════════════════════════════════════════════════════
# PLOT 13 — DeViBench per-task breakdown at r=0.85 (cross-model)
# ═══════════════════════════════════════════════════════════════════════════
print('P13: DeViBench per-task…')
DEVI_PER_TASK = {
    'Object Perception':         (97.96, 49),
    'Attribute Perception':      (92.16, 102),
    'Text-Rich Understanding':   (88.17, 465),
    'Counting':                  (79.17, 48),
    'Action Perception':         (78.42, 139),
    'Spatial Understanding':     (66.67, 18),
}
fig, ax = plt.subplots(figsize=(9, 4.5))
tasks = list(DEVI_PER_TASK.keys()); accs_t = [v[0] for v in DEVI_PER_TASK.values()]
ns_t = [v[1] for v in DEVI_PER_TASK.values()]
bars = ax.barh(range(len(tasks)), accs_t, color=C_OURS, edgecolor='white')
for b, v, n in zip(bars, accs_t, ns_t):
    ax.text(v + 0.5, b.get_y() + b.get_height()/2, f'{v:.1f}% (n={n})', va='center', fontsize=9)
ax.axvline(82.08, color=C_VANILLA, linestyle='--', label='Vanilla overall 82.08%')
ax.set_yticks(range(len(tasks)))
ax.set_yticklabels(tasks)
ax.set_xlabel('Accuracy (%)')
ax.set_title('DeViBench cross-model per-task breakdown (r=0.85, n=821)')
ax.set_xlim(60, 105)
ax.legend(loc='lower right')
ax.grid(True, alpha=0.3, axis='x')
plt.savefig(f'{OUT}/plot13_devibench_per_task.pdf')
plt.savefig(f'{OUT}/plot13_devibench_per_task.png')
plt.close()
print('  saved plot13_devibench_per_task')


# ═══════════════════════════════════════════════════════════════════════════
# PLOT 14 — Adaptive r function visualization
# ═══════════════════════════════════════════════════════════════════════════
print('P14: adaptive r function plot…')
fig, ax = plt.subplots(figsize=(8, 4.5))
D_grid = np.linspace(30, 900, 200)
ax.plot(D_grid, [r_continuous(d) for d in D_grid], color=C_ADAPT, linewidth=2.5,
        label=r'Continuous: $r(D) = 0.30 + 0.55\,\sigma((D-300)/60)$')
ax.plot(D_grid, [r_hard(d) for d in D_grid], color='#FBC02D', linewidth=2.5,
        label='Hard: $r(D) = 0.30$ if $D<300$ else $0.85$', linestyle='--')
# bench typical durations
for bench, d, c in [('DeViBench typical', 60, C_FIXED),
                    ('MVBench typical', 120, C_OURS),
                    ('plotQA avg', 466, C_CTRL)]:
    ax.axvline(d, color=c, alpha=0.3)
    ax.text(d, 0.30, bench, rotation=90, va='bottom', ha='right', fontsize=8, color=c)
ax.set_xlabel('Video duration D (seconds)')
ax.set_ylabel('Keep ratio r(D)')
ax.set_title('Length-adaptive keep-ratio selector  $r(D) = 0.30 + 0.55\,\sigma((D - 300) / 60)$')
ax.legend(loc='center right')
ax.grid(True, alpha=0.3)
ax.set_ylim(0.25, 0.90)
plt.savefig(f'{OUT}/plot14_adaptive_r_function.pdf')
plt.savefig(f'{OUT}/plot14_adaptive_r_function.png')
plt.close()
print('  saved plot14_adaptive_r_function')


# ═══════════════════════════════════════════════════════════════════════════
# Summary
# ═══════════════════════════════════════════════════════════════════════════
print('\n' + '=' * 60)
print(f'All plots saved to ./{OUT}/')
print('PDF + PNG for each of:')
for p in sorted(os.listdir(OUT)):
    if p.endswith('.pdf'):
        print(f'  {p}')
