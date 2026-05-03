"""Aggregate metrics for VLM evaluation results.

All functions accept a :class:`pandas.DataFrame` whose rows represent
individual scored items (one row per model-question-trial combination)
and return summary DataFrames.
"""

from __future__ import annotations

import numpy as np
import pandas as pd


# ---------------------------------------------------------------------------
# Accuracy
# ---------------------------------------------------------------------------


def compute_accuracy_by_group(
    results_df: pd.DataFrame,
    group_col: str,
) -> pd.DataFrame:
    """Compute accuracy statistics grouped by *group_col*.

    Parameters
    ----------
    results_df:
        Must contain a boolean ``correct`` column and the column named
        by *group_col*.
    group_col:
        Column name to group by (e.g. ``"task_type"``,
        ``"chart_type"``, ``"model_name"``).

    Returns
    -------
    pd.DataFrame
        Columns: ``[group_col, "accuracy", "count", "std"]``.
    """
    grouped = results_df.groupby(group_col, sort=True)["correct"]
    summary = grouped.agg(
        accuracy="mean",
        count="count",
        std="std",
    ).reset_index()

    # Fill NaN std (groups with a single observation) with 0
    summary["std"] = summary["std"].fillna(0.0)
    return summary


# ---------------------------------------------------------------------------
# Cost / latency
# ---------------------------------------------------------------------------


def compute_cost_metrics(results_df: pd.DataFrame) -> pd.DataFrame:
    """Compute per-model cost and latency statistics.

    Parameters
    ----------
    results_df:
        Expected columns: ``model_name``, ``latency_ms``,
        ``input_tokens``, ``output_tokens``, ``cost_usd``, ``correct``.

    Returns
    -------
    pd.DataFrame
        One row per model with columns:

        * ``model_name``
        * ``mean_latency_ms``
        * ``p95_latency_ms``
        * ``mean_input_tokens``
        * ``mean_output_tokens``
        * ``mean_cost_usd``
        * ``total_cost_usd``
        * ``cost_per_correct_answer``
    """
    grouped = results_df.groupby("model_name", sort=True)

    summary = grouped.agg(
        mean_latency_ms=("latency_ms", "mean"),
        p95_latency_ms=("latency_ms", lambda s: np.percentile(s.dropna(), 95) if len(s.dropna()) > 0 else np.nan),
        mean_input_tokens=("input_tokens", "mean"),
        mean_output_tokens=("output_tokens", "mean"),
        mean_cost_usd=("cost_usd", "mean"),
        total_cost_usd=("cost_usd", "sum"),
    ).reset_index()

    # Cost per correct answer
    correct_counts = (
        results_df[results_df["correct"]]
        .groupby("model_name", sort=True)
        .size()
        .reset_index(name="_n_correct")
    )
    summary = summary.merge(correct_counts, on="model_name", how="left")
    summary["_n_correct"] = summary["_n_correct"].fillna(0).astype(int)
    summary["cost_per_correct_answer"] = np.where(
        summary["_n_correct"] > 0,
        summary["total_cost_usd"] / summary["_n_correct"],
        np.nan,
    )
    summary = summary.drop(columns=["_n_correct"])
    return summary


# ---------------------------------------------------------------------------
# Consistency across trials
# ---------------------------------------------------------------------------


def compute_consistency(results_df: pd.DataFrame) -> pd.DataFrame:
    """Compute answer-consistency for items with multiple trials.

    For each (model, chart) pair that has more than one trial, the
    *agreement rate* is 1.0 when every trial produced the same
    ``correct`` outcome and 0.0 otherwise.

    Parameters
    ----------
    results_df:
        Expected columns: ``model_name``, ``chart_id``, ``correct``.

    Returns
    -------
    pd.DataFrame
        Columns: ``[model_name, chart_id, n_trials, agreement_rate]``.
    """
    grouped = results_df.groupby(["model_name", "chart_id"], sort=True)

    records: list[dict] = []
    for (model, chart), group in grouped:
        n_trials = len(group)
        if n_trials < 2:
            continue
        # Agreement: all trials have the same correctness value
        all_same = group["correct"].nunique() == 1
        records.append(
            {
                "model_name": model,
                "chart_id": chart,
                "n_trials": n_trials,
                "agreement_rate": 1.0 if all_same else 0.0,
            }
        )

    if not records:
        return pd.DataFrame(
            columns=["model_name", "chart_id", "n_trials", "agreement_rate"]
        )

    return pd.DataFrame(records)


# ---------------------------------------------------------------------------
# Summary table
# ---------------------------------------------------------------------------


def generate_summary_table(results_df: pd.DataFrame) -> pd.DataFrame:
    """Produce a single-row-per-model summary table.

    Parameters
    ----------
    results_df:
        Expected columns: ``model_name``, ``correct``, ``chart_type``,
        ``latency_ms``, ``cost_usd``.

    Returns
    -------
    pd.DataFrame
        Columns:

        * ``model`` -- model identifier
        * ``overall_accuracy``
        * ``bar_accuracy``
        * ``line_accuracy``
        * ``scatter_accuracy``
        * ``mean_latency_ms``
        * ``mean_cost_per_task``
        * ``total_cost``
    """
    models = sorted(results_df["model_name"].unique())
    rows: list[dict] = []

    for model in models:
        mdf = results_df[results_df["model_name"] == model]

        row: dict = {
            "model": model,
            "overall_accuracy": mdf["correct"].mean(),
        }

        # Per-chart-type accuracy
        for ctype in ("bar", "line", "scatter"):
            subset = mdf[mdf["chart_type"].str.lower() == ctype]
            row[f"{ctype}_accuracy"] = subset["correct"].mean() if len(subset) > 0 else np.nan

        # Latency and cost
        row["mean_latency_ms"] = mdf["latency_ms"].mean() if "latency_ms" in mdf.columns else np.nan
        row["mean_cost_per_task"] = mdf["cost_usd"].mean() if "cost_usd" in mdf.columns else np.nan
        row["total_cost"] = mdf["cost_usd"].sum() if "cost_usd" in mdf.columns else np.nan

        rows.append(row)

    return pd.DataFrame(rows)
