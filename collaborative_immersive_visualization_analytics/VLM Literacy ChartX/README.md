# VLM Literacy on ChartX: 2D, 3D Single-Angle, and 3D Multi-Angle Rendering

An empirical evaluation of GPT-5.4's visualization literacy across the **18 chart
types of the ChartX benchmark**, with a follow-up intervention study that
re-renders the four worst-performing chart types as **single-angle 3D** and
**four-angle multi-angle 3D** images to measure whether dimensionality and
viewing geometry can recover lost accuracy.

**Course:** CS 692 — Mobile Immersive Computing (Spring 2026), George Mason University.
**Authors:** Naga Venkata Sai Chennu (G01514409), Hemanjali Buchireddy (G01520809).
**Advisor:** Dr.\ Bo Han.  **Collaborator / TA:** Fahim Arsad Nafis.

---

## Headline results

| Condition | Coverage | Accuracy |
|-----------|---------:|---------:|
| ChartX 2D — all 18 types (5,713 items) | 17 chart types | **85.7%** |
| ChartX 2D — worst type (treemap)       | 279 items      | 51.6%   |
| ChartX 3D-Bar (full benchmark)         | 280 items      | 59.3%   |
| 3D-Single re-render — treemap          | 220 items      | **97.7%** |
| 3D-Multi-Angle (4 views) — treemap     | 220 items      | 89.1%   |

**Two key findings.**

1. **Treemap accuracy jumps from 51.6% to 97.7%** when we re-render the same
   ChartX data as 3D extruded prisms with on-chart numeric value labels. This
   provides direct empirical support for the "invisible ground truth" problem
   we identify in the report: 2D ChartX treemaps display only colored
   rectangles, not the percentages the QA pairs require.

2. **Four-angle multi-image prompting does not help.** Sending four camera
   angles of the same 3D chart in a single GPT-5.4 call did not improve over a
   single canonical 3D view for any of the four worst chart types, and was
   statistically worse for treemap (paired McNemar exact, $p=0.0003$).

Full per-chart-type results, methodology, and discussion are in
[`report/final_report.pdf`](report/final_report.pdf).

---

## Repository structure

```
.
├── README.md                                   # this file
├── pyproject.toml                              # Python deps (uv-managed)
├── uv.lock                                     # locked dep graph
├── configs/
│   └── default.yaml                            # model + run config
├── src/vlm_eval/                               # library code
│   ├── __main__.py                             # CLI: generate | evaluate | report
│   ├── config.py                               # PipelineConfig dataclass
│   ├── pipeline.py                             # async orchestrator
│   ├── visualization.py                        # publication figures
│   ├── models/                                 # VLM API clients
│   │   ├── base.py                             #   abstract VisionModel + retry
│   │   ├── clients.py                          #   OpenAI / OpenRouter / Anthropic / Google
│   │   └── openrouter_helpers.py               #   credit pre-flight + smart retry
│   ├── stimuli/                                # chart loaders + renderers
│   │   ├── chartx_local_loader.py              #   offline ChartX CSV parser
│   │   ├── chartx_3d_renderers.py              #   3D matplotlib renderers (4 types)
│   │   ├── chartx_3d_manifest_builder.py       #   mass renders worst-4 PNGs
│   │   ├── multiangle_generator.py             #   synthetic multi-angle (legacy)
│   │   └── vlat_loader.py                      #   VLAT benchmark loader
│   ├── evaluation/
│   │   ├── chartx_scorer.py                    #   ChartX free-form scoring
│   │   ├── scorer.py                           #   VLAT MC scoring
│   │   └── metrics.py                          #   accuracy / cost / consistency
│   └── storage/store.py                        # JSON cache + CSV aggregation
├── scripts/
│   └── smoke_render_3d.py                      # render 1 chart per worst-4 type
├── run_chartx_2d_eval.py                       # full 2D run on 17 types
├── run_chartx_2d_continue.py                   # resume helper
├── run_chartx_3d_eval.py                       # 3D-Bar run (280 items)
├── run_chartx_3d_worst4_eval.py                # 3D-single on worst-4 types
├── run_chartx_3d_multiangle_eval.py            # 3D-multi-angle on worst-4 types
├── report/
│   ├── final_report.pdf                        # final write-up (7 pages)
│   ├── final_report.tex                        # LaTeX source
│   ├── final_presentation.{md,pptx}            # April 17 presentation
│   ├── generate_final_report_pdf.py            # builds the PDF (ReportLab)
│   ├── generate_3d_multiangle_comparison.py    # builds the 3D comparison figures
│   ├── generate_figures.py                     # builds the main paper figures
│   ├── generate_presentation.py                # builds the presentation deck
│   ├── add_speaker_notes.py
│   └── figures/                                # all PNGs / PDFs used in the report
│       └── 3d_comparison/                      # follow-up study figures
└── results/
    └── scores/                                 # final CSV outputs
        ├── chartx_2d_results_full.csv          # 2D run, all 17 types (5,713 rows)
        ├── chartx_2d_results.csv               # truncated-response variant
        ├── chartx_3d_bar_results.csv           # 3D-Bar run (280 rows)
        ├── chartx_3d_worst4_results.csv        # 3D-single worst-4 (1,107 rows)
        ├── chartx_3d_multiangle_worst4_results.csv  # 3D-multi worst-4 (887 rows; 220 unfinished due to credit exhaustion)
        └── chartx_3d_comparison_worst4.csv     # paired join used for the report figures
```

The raw ChartX images and the rendered worst-4 PNG sets are NOT included in
this repository because of file-size constraints. They can be regenerated from
public sources — see [Setup](#setup).

---

## Setup

The project uses Python 3.12+ managed by [uv](https://docs.astral.sh/uv/).

```bash
# 1. Install Python deps
uv sync

# 2. Provide API keys via environment or a .env file in the repo root
cat > .env <<EOF
OPENAI_API_KEY=sk-...
OPENROUTER_API_KEY=sk-or-...        # used by the worst-4 runners
ANTHROPIC_API_KEY=sk-ant-...        # optional (Phase 1 only)
GOOGLE_API_KEY=AIza...              # optional (Phase 1 only)
EOF

# 3. Download ChartX raw data (≈ 1.5 GB)
#    Available on HuggingFace as InternScience/ChartX
#    Place under data/chartx_raw/ with the layout:
#      data/chartx_raw/
#        ├── ChartX_annotation_test.json
#        ├── ChartX_annotation_val.json
#        └── images/ChartX_png/<chart_type>/{png,csv,code,txt}/...
huggingface-cli download InternScience/ChartX \
    --repo-type dataset \
    --local-dir data/chartx_raw
```

A working `OPENROUTER_API_KEY` with at least ~$15 of credit is required to
reproduce the worst-4 follow-up study end-to-end. Single-angle alone costs
roughly $4; multi-angle costs roughly $25 because each image bills as ~3,000
high-detail tokens and we send four images per call.

---

## Reproducing each evaluation

All commands assume the repository root is the working directory.

### 1. ChartX 2D — full 18-type evaluation (5,713 calls, ~$10)

```bash
PYTHONPATH=src uv run python run_chartx_2d_eval.py
```

Writes `results/scores/chartx_2d_results.csv` (rows are per-question; each
response is truncated to 80 chars) and `chartx_2d_results_full.csv` (full
responses).

### 2. ChartX 3D-Bar — original benchmark images (280 calls, ~$1)

```bash
PYTHONPATH=src uv run python run_chartx_3d_eval.py
```

Writes `results/scores/chartx_3d_bar_results.csv`.

### 3. Worst-4 follow-up: render + evaluate

The follow-up study targets the four worst-performing 2D chart types
(treemap, radar, bubble, area chart). It re-renders the original ChartX raw
data into single-angle and four-angle 3D images, then evaluates GPT-5.4 on the
verbatim ChartX questions. Step-by-step:

```bash
# 3a. Smoke render 1 chart per type (4 single + 16 multi-angle PNGs)
#     Outputs to data/chartx_3d_smoke/. Inspect them visually before mass rendering.
PYTHONPATH=src uv run python scripts/smoke_render_3d.py

# 3b. Mass-render all 1,107 charts in both conditions (~5,500 PNGs, ~50 min wall)
PYTHONPATH=src uv run python -m vlm_eval.stimuli.chartx_3d_manifest_builder

# 3c. Evaluate GPT-5.4 on the 1,107 single-angle PNGs (~$4, ~25 min wall)
PYTHONPATH=src uv run python run_chartx_3d_worst4_eval.py

# 3d. Evaluate GPT-5.4 on the multi-angle prompts (4 images per call, ~$25, ~30 min wall)
PYTHONPATH=src uv run python run_chartx_3d_multiangle_eval.py

# 3e. Build the comparison CSV + 3 figures
PYTHONPATH=src uv run python report/generate_3d_multiangle_comparison.py
```

Both runner scripts:
- pre-flight check available OpenRouter credit;
- pin the upstream provider to OpenAI (no fallback to Azure);
- use `httpx.Timeout(connect=10, read=120, write=30)` plus an outer
  `asyncio.wait_for(180)` to bound any single call;
- retry only `408 / 429 / 5xx` errors and abort immediately on
  `400 / 401 / 402 / 403 / 404`;
- cache every response to JSON so a partial run can be resumed without
  re-spending budget.

The default concurrency is 5 parallel calls.

### 4. Rebuild the figures and the final-report PDF

```bash
PYTHONPATH=src uv run python report/generate_figures.py
PYTHONPATH=src uv run python report/generate_3d_multiangle_comparison.py
PYTHONPATH=src uv run python report/generate_final_report_pdf.py
PYTHONPATH=src uv run python report/generate_presentation.py
```

`generate_final_report_pdf.py` produces `report/final_report.pdf` directly via
ReportLab (no LaTeX install required). The LaTeX source in
`report/final_report.tex` is provided as a parallel artifact and can be
compiled with `pdflatex final_report.tex` (twice).

---

## Configuration

`configs/default.yaml`:

```yaml
models:
- name: gpt-5.4
  provider: openrouter
  model_id: openai/gpt-5.4
  temperature: 0
  max_tokens: 200

n_trials: 1
concurrency_limit: 5
```

The OpenRouter provider pin (in `src/vlm_eval/models/openrouter_helpers.py`)
forces the upstream provider to OpenAI:

```python
PROVIDER_PIN_OPENAI = {
    "order": ["openai"],
    "allow_fallbacks": False,
    "data_collection": "deny",
}
```

This is essential — the same model is also served by Azure on OpenRouter, but
Azure rejects `max_tokens < 16` and uses a different parameter name, which
silently breaks token-budget consistency across the batch.

---

## Statistical methods

- **Wilson 95% confidence intervals** on each accuracy
  ([Wilson 1927](https://www.jstor.org/stable/2276774)).
- **McNemar's exact two-sided test** on per-question paired outcomes
  ([McNemar 1947](https://link.springer.com/article/10.1007/BF02295996)),
  hand-rolled in pure Python (no `scipy` dependency).

Both are implemented in `report/generate_3d_multiangle_comparison.py`.

---

## Project phases (chronological)

1. **Phase 1** (early Spring 2026) — initial multi-VLM evaluation on synthetic
   and ChartX-derived charts using GPT-5.2, Anthropic Claude Sonnet, and
   Google Gemini 2.5 Flash on matplotlib-rendered 2D and 3D charts. Established
   the severity of the 3D comprehension drop (50.9 pp from 2D to 3D for
   GPT-5.2). Code in `src/vlm_eval/stimuli/multiangle_generator.py` (synthetic
   pipeline) is from this phase.
2. **Phase 2** — VLAT benchmark evaluation establishing GPT-5.4 baseline at
   67.9% on 53 multiple-choice questions. Code in
   `src/vlm_eval/stimuli/vlat_loader.py`.
3. **Phase 3** — full ChartX evaluation reported in §4.1–§4.2 of the report
   (5,713 2D items + 280 3D-Bar items, GPT-5.4).
4. **Phase 4** — targeted re-rendering follow-up reported in §4.4
   (worst-4 types, 3D-single + 3D-multi-angle, GPT-5.4 via OpenRouter).

---

## Final report

The full write-up is at [`report/final_report.pdf`](report/final_report.pdf)
(7 pages, two-column conference format). It contains the methodology, all
result tables and figures, the failure analysis, the "invisible ground truth"
discussion, and seven evidence-based design guidelines for VLM-assisted
immersive analytics systems.

The presentation slides delivered on **April 17, 2026** are at
[`report/final_presentation.pptx`](report/final_presentation.pptx) with
markdown source at [`report/final_presentation.md`](report/final_presentation.md).
