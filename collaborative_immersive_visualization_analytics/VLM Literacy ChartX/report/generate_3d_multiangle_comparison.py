"""Build the 3-way comparison (2D / 3D-single / 3D-multi) for the worst-4 ChartX types.

Joins the existing 2D baseline CSV with the new 3D single + multi CSVs on
(chart_type, chart_id), computes per-type accuracy with Wilson 95% CIs,
runs a hand-rolled exact McNemar test on paired (3D-single, 3D-multi)
outcomes, and writes:

    results/scores/chartx_3d_comparison_worst4.csv
    report/figures/3d_comparison/3d_comparison_grouped_bars.png
    report/figures/3d_comparison/3d_multi_minus_single_delta.png
    report/figures/3d_comparison/3d_per_chartid_paired_scatter.png
"""

from __future__ import annotations

import csv
import math
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

REPO = Path(__file__).resolve().parent.parent
CSV_2D = REPO / "results" / "scores" / "chartx_2d_results_full.csv"
CSV_3D_SINGLE = REPO / "results" / "scores" / "chartx_3d_worst4_results.csv"
CSV_3D_MULTI = REPO / "results" / "scores" / "chartx_3d_multiangle_worst4_results.csv"
OUT_CSV = REPO / "results" / "scores" / "chartx_3d_comparison_worst4.csv"
FIG_DIR = REPO / "report" / "figures" / "3d_comparison"

TARGET_TYPES = ("treemap", "radar", "bubble", "area_chart")
TYPE_LABELS = {
    "treemap": "Treemap",
    "radar": "Radar",
    "bubble": "Bubble",
    "area_chart": "Area chart",
}

# ---------------------------------------------------------------------------
# Stats helpers (no scipy dep)
# ---------------------------------------------------------------------------


def wilson_ci(k: int, n: int, z: float = 1.96) -> tuple[float, float, float]:
    """Wilson 95% CI for a binomial proportion. Returns (p_hat, lo, hi)."""
    if n == 0:
        return 0.0, 0.0, 0.0
    p = k / n
    denom = 1.0 + z**2 / n
    centre = (p + z**2 / (2 * n)) / denom
    halfw = (z * math.sqrt((p * (1 - p) + z**2 / (4 * n)) / n)) / denom
    return p, max(0.0, centre - halfw), min(1.0, centre + halfw)


def mcnemar_exact_p(b: int, c: int) -> float:
    """Exact two-sided McNemar p-value (binomial p=0.5 on min(b,c) of n=b+c)."""
    n = b + c
    if n == 0:
        return 1.0
    k = min(b, c)
    # P(X <= k) under Binomial(n, 0.5)
    log_half_n = -n * math.log(2)
    cum = 0.0
    for i in range(k + 1):
        cum += math.exp(math.lgamma(n + 1) - math.lgamma(i + 1) - math.lgamma(n - i + 1) + log_half_n)
    p_two_sided = min(1.0, 2 * cum)
    return p_two_sided


def diff_ci_paired(b: int, c: int, n: int, z: float = 1.96) -> tuple[float, float, float]:
    """95% CI for the paired difference of proportions p_multi - p_single.

    Uses the standard error of the paired McNemar difference:
        diff = (b - c) / n,  SE = sqrt((b + c - (b - c)^2 / n)) / n
    """
    if n == 0:
        return 0.0, 0.0, 0.0
    diff = (b - c) / n
    var = (b + c - (b - c) ** 2 / n) / n**2
    se = math.sqrt(max(var, 0.0))
    return diff, diff - z * se, diff + z * se


# ---------------------------------------------------------------------------
# CSV loaders
# ---------------------------------------------------------------------------


def load_csv_correct_map(path: Path) -> dict[tuple[str, str], bool]:
    """Map (chart_type, chart_id) -> correct (bool)."""
    out: dict[tuple[str, str], bool] = {}
    if not path.exists():
        return out
    with open(path) as f:
        for row in csv.DictReader(f):
            ct = row["chart_type"]
            if ct not in TARGET_TYPES:
                continue
            cid = str(row["chart_id"])
            correct = row["correct"].strip().lower() == "true"
            out[(ct, cid)] = correct
    return out


def load_csv_full(path: Path) -> dict[tuple[str, str], dict[str, Any]]:
    out: dict[tuple[str, str], dict[str, Any]] = {}
    if not path.exists():
        return out
    with open(path) as f:
        for row in csv.DictReader(f):
            ct = row["chart_type"]
            if ct not in TARGET_TYPES:
                continue
            cid = str(row["chart_id"])
            out[(ct, cid)] = row
    return out


# ---------------------------------------------------------------------------
# Comparison
# ---------------------------------------------------------------------------


def build_comparison_rows() -> list[dict[str, Any]]:
    rows_2d = load_csv_full(CSV_2D)
    rows_3d_single = load_csv_full(CSV_3D_SINGLE)
    rows_3d_multi = load_csv_full(CSV_3D_MULTI)

    # Inner join on the keys that exist in 3D conditions (both must be present)
    keys = set(rows_3d_single.keys()) & set(rows_3d_multi.keys()) & set(rows_2d.keys())
    keys_sorted = sorted(keys, key=lambda k: (k[0], k[1]))

    out_rows: list[dict[str, Any]] = []
    for k in keys_sorted:
        ct, cid = k
        r2 = rows_2d[k]
        rs = rows_3d_single[k]
        rm = rows_3d_multi[k]
        out_rows.append(
            {
                "chart_id": cid,
                "chart_type": ct,
                "question": r2.get("question", rs.get("question", "")),
                "expected": r2.get("expected", rs.get("expected", "")),
                "response_2d": r2.get("response", ""),
                "correct_2d": r2.get("correct", "").strip().lower() == "true",
                "response_3d_single": rs.get("response", ""),
                "correct_3d_single": rs.get("correct", "").strip().lower() == "true",
                "response_3d_multi": rm.get("response", ""),
                "correct_3d_multi": rm.get("correct", "").strip().lower() == "true",
                "cost_3d_single": float(rs.get("cost", 0.0) or 0.0),
                "cost_3d_multi": float(rm.get("cost", 0.0) or 0.0),
            }
        )
    return out_rows


def write_comparison_csv(rows: list[dict[str, Any]]) -> None:
    OUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    cols = [
        "chart_id",
        "chart_type",
        "question",
        "expected",
        "response_2d",
        "correct_2d",
        "response_3d_single",
        "correct_3d_single",
        "response_3d_multi",
        "correct_3d_multi",
        "cost_3d_single",
        "cost_3d_multi",
    ]
    with open(OUT_CSV, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        for r in rows:
            w.writerow({k: r.get(k, "") for k in cols})


def per_type_accuracies(rows: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    by_type: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for r in rows:
        by_type[r["chart_type"]].append(r)
    summary: dict[str, dict[str, Any]] = {}
    for ct in TARGET_TYPES:
        rs = by_type.get(ct, [])
        n = len(rs)
        if n == 0:
            continue
        c2 = sum(1 for x in rs if x["correct_2d"])
        cs = sum(1 for x in rs if x["correct_3d_single"])
        cm = sum(1 for x in rs if x["correct_3d_multi"])
        # Paired McNemar between 3D-single and 3D-multi
        b = sum(1 for x in rs if not x["correct_3d_single"] and x["correct_3d_multi"])  # multi gained
        c = sum(1 for x in rs if x["correct_3d_single"] and not x["correct_3d_multi"])  # multi lost
        a = sum(1 for x in rs if x["correct_3d_single"] and x["correct_3d_multi"])
        d = sum(1 for x in rs if not x["correct_3d_single"] and not x["correct_3d_multi"])
        diff, dlo, dhi = diff_ci_paired(b, c, n)
        p2_hat, p2_lo, p2_hi = wilson_ci(c2, n)
        ps_hat, ps_lo, ps_hi = wilson_ci(cs, n)
        pm_hat, pm_lo, pm_hi = wilson_ci(cm, n)
        summary[ct] = {
            "n": n,
            "acc_2d": (p2_hat, p2_lo, p2_hi),
            "acc_3d_single": (ps_hat, ps_lo, ps_hi),
            "acc_3d_multi": (pm_hat, pm_lo, pm_hi),
            "delta_multi_minus_single": (diff, dlo, dhi),
            "mcnemar_p": mcnemar_exact_p(b, c),
            "table": {"a": a, "b": b, "c": c, "d": d},
        }
    return summary


# ---------------------------------------------------------------------------
# Figures
# ---------------------------------------------------------------------------


def fig_grouped_bars(summary: dict[str, dict[str, Any]], all_rows: list[dict[str, Any]]) -> None:
    types = [t for t in TARGET_TYPES if t in summary]

    def get_acc(t: str, key: str) -> tuple[float, float, float]:
        return summary[t][key]

    x = np.arange(len(types))
    w = 0.27
    fig, ax = plt.subplots(figsize=(11, 6.2), dpi=180)
    series = [
        ("acc_2d", "2D baseline", "#4C72B0"),
        ("acc_3d_single", "3D single-angle", "#DD8452"),
        ("acc_3d_multi", "3D multi-angle (4 views)", "#55A868"),
    ]
    for i, (key, label, color) in enumerate(series):
        means = []
        err_low = []
        err_hi = []
        for t in types:
            p, lo, hi = get_acc(t, key)
            means.append(p * 100)
            err_low.append((p - lo) * 100)
            err_hi.append((hi - p) * 100)
        ax.bar(
            x + (i - 1) * w,
            means,
            width=w,
            label=label,
            color=color,
            edgecolor="black",
            linewidth=0.4,
            yerr=[err_low, err_hi],
            capsize=3,
        )
        for xi, m in zip(x + (i - 1) * w, means):
            ax.text(xi, m + 1.0, f"{m:.0f}%", ha="center", va="bottom", fontsize=9)

    ax.set_xticks(x)
    ax.set_xticklabels([TYPE_LABELS.get(t, t.title()) for t in types])
    ax.set_ylim(0, 105)
    ax.set_ylabel("Accuracy (%)")
    ax.set_title("GPT-5.4 accuracy on the 4 worst ChartX types (2D vs 3D single vs 3D multi-angle)")
    ax.grid(axis="y", alpha=0.3)
    ax.legend(loc="lower right", fontsize=9)
    fig.tight_layout()
    out = FIG_DIR / "3d_comparison_grouped_bars.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out, dpi=180, bbox_inches="tight", facecolor="white")
    plt.close(fig)


def fig_delta(summary: dict[str, dict[str, Any]], all_rows: list[dict[str, Any]]) -> None:
    types = [t for t in TARGET_TYPES if t in summary]
    deltas = []
    err_lo = []
    err_hi = []
    pvals = []
    for t in types:
        d, lo, hi = summary[t]["delta_multi_minus_single"]
        deltas.append(d * 100)
        err_lo.append((d - lo) * 100)
        err_hi.append((hi - d) * 100)
        pvals.append(summary[t]["mcnemar_p"])

    y = np.arange(len(types))[::-1]
    fig, ax = plt.subplots(figsize=(10, 5.5), dpi=180)
    colors = ["#55A868" if d >= 0 else "#C44E52" for d in deltas]
    ax.barh(
        y,
        deltas,
        xerr=[err_lo, err_hi],
        color=colors,
        edgecolor="black",
        linewidth=0.4,
        capsize=4,
    )
    ax.axvline(0, color="black", linewidth=0.7)
    for yi, d, p in zip(y, deltas, pvals):
        sig = "***" if p < 0.001 else "**" if p < 0.01 else "*" if p < 0.05 else "ns"
        ax.text(
            d + (1.5 if d >= 0 else -1.5),
            yi,
            f"{d:+.1f}%  (p={p:.3f} {sig})",
            ha="left" if d >= 0 else "right",
            va="center",
            fontsize=9,
        )
    ax.set_yticks(y)
    ax.set_yticklabels([TYPE_LABELS.get(t, t.title()) for t in types])
    ax.set_xlabel("Δ Accuracy (multi-angle − single-angle), percentage points")
    ax.set_title(
        "Effect of 4-view multi-angle 3D vs single-angle 3D (paired McNemar exact)\n"
        "Positive = multi-angle helps. Error bars = 95% CI on paired difference."
    )
    ax.grid(axis="x", alpha=0.3)
    fig.tight_layout()
    out = FIG_DIR / "3d_multi_minus_single_delta.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out, dpi=180, bbox_inches="tight", facecolor="white")
    plt.close(fig)


def fig_paired_scatter(rows: list[dict[str, Any]]) -> None:
    rng = np.random.default_rng(42)
    type_to_color = {
        "treemap": "#4C72B0",
        "radar": "#DD8452",
        "bubble": "#55A868",
        "area_chart": "#C44E52",
    }
    fig, ax = plt.subplots(figsize=(7, 7), dpi=180)
    for r in rows:
        x = (1 if r["correct_3d_single"] else 0) + rng.uniform(-0.18, 0.18)
        y = (1 if r["correct_3d_multi"] else 0) + rng.uniform(-0.18, 0.18)
        ax.scatter(
            x,
            y,
            color=type_to_color.get(r["chart_type"], "gray"),
            alpha=0.45,
            s=18,
            edgecolors="none",
        )
    ax.plot([-0.5, 1.5], [-0.5, 1.5], color="black", linewidth=0.7, linestyle="--")
    ax.set_xlim(-0.4, 1.4)
    ax.set_ylim(-0.4, 1.4)
    ax.set_xticks([0, 1])
    ax.set_xticklabels(["wrong", "correct"])
    ax.set_yticks([0, 1])
    ax.set_yticklabels(["wrong", "correct"])
    ax.set_xlabel("3D single-angle outcome")
    ax.set_ylabel("3D multi-angle outcome")
    ax.set_title("Paired per-question outcomes (jittered)\nUpper-left quadrant = multi-angle gains")
    ax.grid(alpha=0.3)
    handles = [
        plt.Line2D([0], [0], marker="o", color="w", markerfacecolor=c, markersize=8, label=TYPE_LABELS[t])
        for t, c in type_to_color.items()
    ]
    ax.legend(handles=handles, loc="lower right", fontsize=9)
    fig.tight_layout()
    out = FIG_DIR / "3d_per_chartid_paired_scatter.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out, dpi=180, bbox_inches="tight", facecolor="white")
    plt.close(fig)


def print_summary(summary: dict[str, dict[str, Any]], all_rows: list[dict[str, Any]]) -> None:
    print(f"\n{'='*78}")
    print(f"  ChartX worst-4: 2D vs 3D-single vs 3D-multi-angle  (per chart type)")
    print(f"{'='*78}")
    print(
        f"  {'Type':<13} {'n':>4} {'2D':>10} {'3D-single':>12} {'3D-multi':>12} "
        f"{'Δ multi-single':>16} {'McNemar p':>10}"
    )
    print(f"  {'-'*78}")
    for ct in [t for t in TARGET_TYPES if t in summary]:
        s = summary[ct]
        n = s["n"]
        a2 = s["acc_2d"][0] * 100
        as_ = s["acc_3d_single"][0] * 100
        am = s["acc_3d_multi"][0] * 100
        d, dl, dh = s["delta_multi_minus_single"]
        d_pp = d * 100
        p = s["mcnemar_p"]
        print(
            f"  {ct:<13} {n:>4d} {a2:>9.1f}% {as_:>11.1f}% {am:>11.1f}% "
            f"{d_pp:>+13.1f}pp {p:>10.4f}"
        )
    print(f"{'='*78}")


def main() -> int:
    rows = build_comparison_rows()
    if not rows:
        print(
            "ERROR: comparison rows are empty. Did you run both 3D evals first?\n"
            f"  expected: {CSV_3D_SINGLE}\n  expected: {CSV_3D_MULTI}",
            file=sys.stderr,
        )
        return 1
    write_comparison_csv(rows)
    summary = per_type_accuracies(rows)
    print_summary(summary, rows)
    fig_grouped_bars(summary, rows)
    fig_delta(summary, rows)
    fig_paired_scatter(rows)
    print(f"\n  Comparison CSV: {OUT_CSV}")
    print(f"  Figures dir:    {FIG_DIR}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
