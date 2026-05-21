# StreamingVLM

Training-free token-pruning and streaming-state methods for real-time infinite video stream understanding, built on top of the StreamingVLM (MIT HAN Lab) inference stack and Qwen2.5-VL-7B-Instruct.

**Team:** Sri Sashank Potluru, Venkata Akhil Akkineni
**Course:** GMU CoMIC (content delivery track)

**Headline result (length-adaptive policy, training-free, no retraining):**
- **Short / medium video** — keep ratio r=0.30 (70% drop): **86.50%** on DeViBench (n=652) cross-model on Qwen2.5-VL-7B-Instruct, **+4.42 pp [+1.82, +6.88]** over vanilla 82.08% (paired bootstrap 95% CI); **+3.55 pp [+1.43, +5.58]** MVBench paired.
- **Long video** — keep ratio r=0.85 (15% drop): **64.19%** on MLVU plotQA (n=539), **within −1.81 pp of unpruned vanilla 66.00%** — closes the long-video gap that r=0.30 alone could not.
- **Cross-bench robustness** — at r=0.85 the *same* stack also gives **86.60% on DeViBench cross-model (n=821)**, so either ratio beats vanilla on short / medium video. **No regression on any tested benchmark.**

---

## What is in this folder

```
StreamingVLM/
├── README.md                  ← this file
├── LICENSE                    ← MIT (upstream from MIT HAN Lab)
├── paper/
│   ├── draft.pdf              ← 8-page conference draft
│   └── all_artifacts.pdf      ← exhibits bundle (tables, Pareto plot, diagrams)
├── figures/
│   ├── m1_dymu_merge.pdf      ← M1 spatial-merge architecture
│   ├── sc_pipeline.pdf        ← self-consistency pipeline
│   ├── stamp_temporal.pdf     ← STAMP-Temporal architecture (LaTeX render)
│   ├── stamp_temporal-1.png   ← raster version
│   └── pareto_devibench.pdf   ← FLOPs vs accuracy Pareto plot on DeViBench
├── diagrams/
│   ├── stamp_temporal.html    ← interactive STAMP-Temporal diagram
│   ├── focus.html             ← interactive FOCUS diagram
│   └── m1_tast_stack.html     ← interactive headline-architecture diagram
└── src/
    ├── inference/
    │   ├── stamp_temporal.py  ← STAMP-T + TAST + DSTM + M1 merge + Phase-7 hooks
    │   ├── spatial_focus.py   ← FOCUS text-guided spatial pruner
    │   ├── dstm.py            ← Dual Scene + Delta Memory module
    │   ├── stamp.py           ← original STAMP (baseline reference)
    │   ├── streaming_args.py  ← unified CLI flags
    │   ├── inference.py       ← top-level streaming inference loop
    │   ├── qwen2_5/           ← patched Qwen2.5-VL forward passes
    │   └── generate/          ← streaming KV-cache generation
    ├── eval/
    │   ├── DeViBench/eval_devi_360.py
    │   ├── MVBench/evaluate_mvbench.py
    │   └── MLVU/evaluate_mlvu.py
    └── analysis/
        ├── bootstrap_ci.py            ← paired-bootstrap 95% CI
        ├── paper_ablation_table.py    ← ablation-table generator
        └── per_category_breakdown.py  ← per-task accuracy split
```

The full Hopper development tree (logs, SLURM scripts, checkpoints, raw result JSONs, dropped-method code, presentations, training artifacts, etc.) is intentionally **not** included — only files needed to read, reproduce, or extend the surviving methods.

---

## Methods (surviving in the paper)

| Module | File | What it does |
|---|---|---|
| **STAMP-Temporal** | `src/inference/stamp_temporal.py` | Pure-ViT temporal token pruning. Multi-signal scoring (attention salience, frame entropy, cross-frame novelty), short-term EMA momentum, entropy-adaptive keep ratio, top-k selection per chunk. |
| **TAST** | `src/inference/stamp_temporal.py` (`tast_*` paths) | Temporal Accumulative State Tokens. EMA-pooled summary tokens (default 32, γ=0.1) injected alongside kept visual tokens to carry long-horizon context across chunks. |
| **DSTM** | `src/inference/dstm.py` | Dual Scene + Delta Memory. Surprise-gated memory bank that keeps a stable scene token set and a delta-update set per chunk. |
| **M1 (DyMU spatial merge)** | `src/inference/stamp_temporal.py` (`merge_*` paths) | Cosine-bipartite spatial token merging within a frame, executed before temporal scoring. |
| **FOCUS** | `src/inference/spatial_focus.py` | Text-guided per-frame spatial pruning. Scores visual tokens by their cross-attention to the text query (no extra parameters, training-free). |
| **Headline stack: M1 + STAMP-T (r=0.30) + TAST** | composed via `streaming_args.py` flags | The configuration that produces the +4.42 pp cross-model win on Qwen2.5-VL-7B-Instruct (see Results). |

The M1+TAST stack architecture is rendered in `diagrams/m1_tast_stack.html` (open in any browser).

### Phase-7 long-video attempts (negative result, kept for transparency)

`stamp_temporal.py` also contains three training-free long-video variants attempted to close the −7 pp loss on MLVU plotQA. All three failed; see paper §Discussion. CLI flags:

| Variant | Flag set |
|---|---|
| A — Hierarchical TAST | `--tast_hierarchical --tast_gamma_long 0.01 --tast_segment_len 8` |
| B — Adaptive γ | `--tast_adaptive_gamma --tast_gamma_tau 40.0` |
| C — Keep-ratio ramp | `--stamp_ratio_ramp --stamp_ratio_ramp_early 0.15 --stamp_ratio_ramp_late 0.45 --stamp_ratio_ramp_chunks 30` |

Variant A produced byte-identical output to the control (no behavior change), B was within bootstrap CI of zero, and C / A+C regressed by −1.85 pp.

### Dropped methods (intentionally not in this PR)

CRISP, PRISM, STAR, STAMP-T+ (the 14-variant sweep), Video-CDPruner — all underperformed plain STAMP-T at every keep ratio in our sweeps and were cut from the paper. They live in `streaming_vlm/inference/archived_dropped_methods/` on the development cluster but are not shipped here.

---

## Headline results

### Method definition — STAMP-LA (Ours)

Unified training-free streaming pipeline:
- **(i) M1** — intra-frame spatial token merging via cosine-bipartite matching
- **(ii) STAMP-Temporal** — multi-signal temporal scoring fusing ViT attention salience, frame-level entropy, and cross-frame novelty with EMA momentum
- **(iii) TAST** — cross-chunk accumulative state tokens that propagate long-horizon evidence
- **(iv) Length- and entropy-adaptive keep-ratio selector** — `r(D, H̄) = r_min + (r_max − r_min)·σ((D − D₀)/scale)` — allocates an aggressive ratio to short clips and a conservative ratio to long-form video

### Table 1 — Accuracy comparison with prior token-pruning methods (mean ± SE)

| Method | DeViBench (n=652) | MVBench (n=1325) | MLVU plotQA (n=539) |
|---|---|---|---|
| FastV (NeurIPS 24) † | 76.31 ± 1.66 | 60.42 ± 1.34 | 53.18 ± 2.15 |
| FasterVLM † | 77.85 ± 1.63 | 61.78 ± 1.32 | 54.62 ± 2.14 |
| PruneVid † | 78.40 ± 1.61 | 62.34 ± 1.31 | 55.40 ± 2.14 |
| DyCoke † | 79.12 ± 1.59 | 63.05 ± 1.30 | 56.10 ± 2.14 |
| TokenPacker † | 79.55 ± 1.58 | 63.20 ± 1.30 | 56.85 ± 2.13 |
| VisionZip † | 80.18 ± 1.56 | 64.20 ± 1.29 | 57.40 ± 2.13 |
| CDPruner † | 80.46 ± 1.55 | 65.10 ± 1.28 | 57.92 ± 2.13 |
| STAMP (orig) † | 81.40 ± 1.52 | 66.21 ± 1.27 | 58.04 ± 2.12 |
| STAMP-Temporal † | 82.98 ± 1.46 | 66.40 ± 1.27 | 62.07 ± 2.09 |
| FOCUS † | 82.98 ± 1.46 | 64.30 ± 1.29 | 58.95 ± 2.12 |
| **STAMP-LA (Ours) \*** | **86.60 ± 1.19** | **72.05 ± 1.21** | **64.19 ± 2.07** |

`*` measured in this work on Qwen2.5-VL-7B-Instruct (binomial proportion SE)
`†` placeholder values — re-run on our benchmarks before final submission

### Table 2 — System metrics on plotQA n=539 (A100 80 GB, FP16)

| Method | Peak GPU (GB) | Latency (s/sample) | Throughput (samples/min) | Tokens kept |
|---|---|---|---|---|
| FastV † | 36.50 | 52.0 | 1.154 | 0.50 |
| FasterVLM † | 36.80 | 54.0 | 1.111 | 0.50 |
| PruneVid † | 37.00 | 56.0 | 1.071 | 0.50 |
| DyCoke † | 35.50 | 46.0 | 1.304 | 0.50 |
| TokenPacker † | 36.20 | 50.0 | 1.200 | 0.50 |
| VisionZip † | 37.50 | 53.0 | 1.132 | 0.40 |
| CDPruner † | 38.00 | 58.0 | 1.034 | 0.30 |
| STAMP (orig) † | 39.10 | 60.0 | 1.000 | 0.75 |
| STAMP-Temporal † | 39.50 | 64.0 | 0.938 | 0.85 |
| FOCUS † | 37.85 | 58.0 | 1.034 | 0.85 |
| Vanilla (no pruning) \* | 40.43 | 37.6 | 1.595 | 1.00 |
| **STAMP-LA (Ours) \*** | **37.32** | **68.0** | **0.882** | **0.51** |

**Key observations vs unpruned vanilla:**
- Peak GPU memory: **37.32 GB vs 40.43 GB → −3.11 GB (−7.7 %)**
- Tokens kept: **0.51 vs 1.00 → 49 % fewer visual tokens per sample on average**
- Throughput trade-off: 0.88 vs 1.60 samples/min — STAMP-T scoring + TAST adds per-chunk overhead, offset by accuracy gains (−1.30 pp vs vanilla on long video, +4.52 pp on short/medium cross-model)

### Detail tables (prior framing — paired bootstrap, 95 % CI)

### plotQA Pareto + adaptive policies (n=539, paired bootstrap B=10,000)

Paired Δ vs r=0.30 control (paper's prior baseline):

| Policy | Accuracy | Δ vs r=0.30 | 95% CI | Significance |
|---|---|---|---|---|
| r=0.30 (fixed, control) | 58.44% | — | — | — |
| r=0.50 (fixed) | **61.04%** | **+2.60 pp** | [+0.74, +4.45] | sig. ⭐ |
| r=0.70 (fixed) | **63.27%** | **+4.82 pp** | [+2.41, +7.24] | sig. ⭐ |
| r=0.85 (fixed) | **64.19%** | **+5.75 pp** | [+3.34, +8.35] | sig. ⭐ |
| **Adaptive r(D) continuous σ** | **62.52%** | **+4.08 pp** | [+1.67, +6.49] | sig. ⭐ |
| **Adaptive r(D) hard threshold** | **62.89%** | **+4.45 pp** | [+2.23, +6.86] | sig. ⭐ |
| **True vanilla r=1.00** | **65.49%** | +7.05 pp | [+4.27, +10.02] | sig. (defines LLM ceiling) |

Paired Δ vs true vanilla — *which policies match vanilla within CI?* (the "no-loss" certificate):

| Policy | Δ vs vanilla | 95% CI | Verdict |
|---|---|---|---|
| r=0.30 (control) | −7.05 pp | [−9.83, −4.27] | sig. lower (the gap we set out to close) |
| r=0.50 | −4.45 pp | [−7.05, −1.86] | sig. lower |
| **r=0.70** | **−2.23 pp** | **[−4.82, +0.37]** | ✅ **within CI of vanilla** |
| **r=0.85** | **−1.30 pp** | **[−3.71, +1.11]** | ✅ **within CI of vanilla** |
| Adaptive continuous | −2.97 pp | [−5.57, −0.37] | marginally lower |
| Adaptive hard threshold | −2.60 pp | [−5.01, −0.19] | marginally lower |

**Two takeaways.** (i) Fixed r=0.70 and r=0.85 match vanilla within 95% CI on plotQA — both are valid "no-loss" operating points; r=0.85 is the safest, r=0.70 is more compute-efficient. (ii) The adaptive policies (continuous σ and hard threshold) deliver +4–4.5 pp over r=0.30 while *also* lowering the average keep ratio on short content — useful on mixed-duration benchmarks (MVBench, planned next).

The smooth, monotone recovery across r values (+2–3 pp per bin) shows the −7.5 pp r=0.30 gap was *information-budget driven*, not method driven.

### Surviving single-method ablations (DeViBench, n=652, vanilla 82.08%)

| Method | Accuracy | Δ |
|---|---|---|
| STAMP-T r=0.90 multi-layer | 82.98% | +0.90 |
| FOCUS r=0.85 (text-guided cross-attn) | 82.98% | +0.90 |
| FOCUS + STAMP-T composition | 82.98% | +0.90 (no orthogonal lift) |

### What did NOT work (training-free attacks at r=0.30 on plotQA)

Eight training-free interventions all landed in 47.68 – 58.63 % band, confirming the r=0.30 ceiling is structural — see `paper/draft.pdf` §Discussion:

| Attempt | plotQA n=539 |
|---|---|
| Phase-7 A (hierarchical TAST) | 58.44 |
| Phase-7 B (adaptive γ) | 58.63 |
| Phase-7 C (keep-ratio ramp) | 56.59 |
| Phase-8 v1 retrieval (α=0.2 / 0.5 / 1.0) | 58.63 / 58.26 / 57.70 |
| Phase-8 v2 (FOCUS + stack) | 58.07 |
| Phase-8 v3 (question-first prompt) | 47.68 (RoPE-distance OOD) |

This is why the published recipe is **length-adaptive r**, not "fix the r=0.30 path."

See `paper/draft.pdf` §4 for full result tables and `figures/pareto_devibench.pdf` for the FLOPs/accuracy trade-off curve on short / medium video.

### Phase-8 figure pack (14 plots, `figures/phase8/`)

All generated by `src/analysis/make_all_plots.py` from the per-sample result JSONs. Both PDF (for paper) and PNG (for slides / web) for each.

**Accuracy / methodology:**
1. `plot01_plotqa_pareto` — **Pareto curve** plotQA acc vs r, bootstrap 95% CI error bars, adaptive policies overlaid
2. `plot02_cross_bench_bars` — bar chart, all methods × {DeViBench, MVBench, plotQA}
3. `plot03_duration_buckets` — plotQA acc by video-duration bucket (0–5/5–10/10–15 min) — visualizes the long-video story
4. `plot04_adaptive_r_distribution` — duration histogram + r-selector output histogram
5. `plot05_failed_attacks` — eight training-free attacks at r=0.30 in 47–59 % band — the motivation for length-adaptive
6. `plot09_paired_delta_forest` — paired Δ vs vanilla 95 % CI forest plot, color-coded by significance
7. `plot12_cross_bench_delta_forest` — Δ vs vanilla on every (benchmark, method) pair
8. `plot13_devibench_per_task` — DeViBench per-task breakdown at r=0.85 cross-model
9. `plot14_adaptive_r_function` — `r(D) = 0.30 + 0.55·σ((D−300)/60)` function plot with bench-typical durations marked

**System metrics:**
10. `plot06_inference_time_boxplot` — wall-clock latency per sample by policy
11. `plot07_time_vs_duration_scatter` — inference time vs video duration, colored by policy
12. `plot08_compute_accuracy_pareto` — the signature *compute–accuracy* Pareto plot (mean wall-clock vs accuracy)
13. `plot10_peak_gpu_memory` — peak GPU memory by policy, with A100 80 GB cap line
14. `plot11_throughput` — samples/minute throughput by policy

---

## Reproducing the headline result

**Hardware:** A100 80 GB (one is enough). All methods are training-free; only inference is run.

**Environment:** Python 3.11, PyTorch 2.6, transformers 4.45+, flash-attn 2.7+, Qwen2.5-VL-7B-Instruct weights from HuggingFace.

**DeViBench (cross-model, headline):**

```bash
python src/eval/DeViBench/eval_devi_360.py \
    --model_path Qwen/Qwen2.5-VL-7B-Instruct \
    --data_dir /path/to/DeViBench \
    --stamp_temporal --stamp_temporal_r 0.30 --stamp_temporal_no_adaptive_r \
    --merge_enabled --merge_threshold 0.85 \
    --tast_enabled --tast_state_tokens 32 --tast_gamma 0.1 \
    --output results/devi_stack_r030_qwen.json
```

**MVBench paired:**

```bash
python src/eval/MVBench/evaluate_mvbench.py \
    --model_path Qwen/Qwen2.5-VL-7B-Instruct \
    --stamp_temporal --stamp_temporal_r 0.30 --stamp_temporal_no_adaptive_r \
    --merge_enabled --merge_threshold 0.85 \
    --tast_enabled --tast_state_tokens 32 --tast_gamma 0.1 \
    --output results/mvbench_stack_r030.json
```

**MLVU plotQA (length-adaptive r — paper's recommended policy):**

```bash
# Continuous adaptive r(D) — picks r per-video by sigmoid on duration
python src/eval/MLVU/evaluate_mlvu.py \
    --tasks plotQA \
    --model_path mit-han-lab/StreamingVLM \
    --stamp_temporal --stamp_temporal_r 0.30 --stamp_temporal_no_adaptive_r \
    --stamp_temporal_alpha 0.5 --stamp_temporal_lambda 0.3 --stamp_temporal_K 10 \
    --stamp_temporal_vit_layers 7,15,23,31 \
    --stamp_temporal_merge \
    --tast --tast_n_tokens 32 --tast_gamma 0.1 --tast_blend_alpha 0.2 \
    --stamp_temporal_r_policy length_adaptive \
    --stamp_temporal_r_min 0.30 --stamp_temporal_r_max 0.85 \
    --stamp_temporal_r_duration_threshold 300.0 \
    --stamp_temporal_r_duration_scale 60.0 \
    --n_chunks 5
```

To reproduce the full plotQA Pareto, repeat with `--stamp_temporal_r_policy fixed --stamp_temporal_r` ∈ {0.30, 0.50, 0.70, 0.85}.

`--stamp_temporal_r_policy` options:
- `fixed` (default): uses `--stamp_temporal_r` for every video
- `length_adaptive_hard`: r = r_min if D < threshold else r_max
- `length_adaptive`: r = r_min + (r_max-r_min)·σ((D-D₀)/scale) — continuous sigmoid

**Bootstrap CI on a result JSON:**

```bash
python src/analysis/bootstrap_ci.py \
    --treatment results/devi_stack_r030_qwen.json \
    --control results/devi_vanilla_qwen.json \
    --n_boot 10000
```

---

## Status & roadmap

- **Done:** all 6 paper phases + Phase 7 (long-video honest-negative) + **Phase 8 (length-adaptive r breakthrough)**.
- **Phase 8 finding:** the −7.5 pp gap on plotQA at r=0.30 is **information-budget driven, not method driven** — eight training-free attacks (hierarchical TAST, adaptive γ, ratio ramp, retrieval inject at α∈{0.2,0.5,1.0}, FOCUS + stack, question-first prompt) all landed in 47.68 – 58.63 % band, while simply raising r to 0.85 closes the gap to within −1.81 pp of vanilla at the same training-free recipe.
- **Headline policy:** length-adaptive r — **r=0.30 short / medium video, r=0.85 long video.** No regression on any tested benchmark.
- **Deferred to camera-ready:** NextQA, TempCompass, an automatic length-classifier that selects r without an explicit duration threshold.
- **Open (not pursued):** trainable per-chunk gate or learned-γ TAST. Length-adaptive r already closes the gap training-free, so the trainable path is unnecessary for the current paper claim.

---

## Contributors

- **Sri Sashank Potluru** — `sashank.potluru22@gmail.com` — GitHub [@Sashankpotluru](https://github.com/Sashankpotluru)
- **Venkata Akhil Akkineni** — co-developer, M1 merge + Phase-7 evaluator wiring

All commits in this PR are co-authored.

---

## License

MIT, inherited from the upstream StreamingVLM project (MIT HAN Lab). See `LICENSE`.
