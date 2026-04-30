"""Publication-quality result visualization."""

from __future__ import annotations

import logging
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns

from vlm_eval.config import PipelineConfig
from vlm_eval.evaluation.metrics import (
    compute_accuracy_by_group,
    compute_cost_metrics,
    generate_summary_table,
)
from vlm_eval.storage.store import ResultStore

logger = logging.getLogger(__name__)

# Publication style
plt.rcParams.update({
    "figure.dpi": 300,
    "savefig.dpi": 300,
    "font.size": 11,
    "axes.titlesize": 13,
    "axes.labelsize": 11,
    "figure.figsize": (8, 5),
    "savefig.bbox": "tight",
    "savefig.pad_inches": 0.1,
})


def plot_model_comparison(df: pd.DataFrame, output_path: Path):
    """Grouped bar chart: accuracy by chart type, grouped by model."""
    pivot = df.groupby(["model_name", "chart_type"])["correct"].mean().unstack(fill_value=0)

    ax = pivot.plot(kind="bar", figsize=(10, 6), width=0.8, edgecolor="black", linewidth=0.5)
    ax.set_ylabel("Accuracy")
    ax.set_xlabel("Model")
    ax.set_title("VLM Accuracy by Chart Type")
    ax.set_ylim(0, 1.05)
    ax.legend(title="Chart Type", bbox_to_anchor=(1.02, 1), loc="upper left")
    plt.xticks(rotation=0)

    for container in ax.containers:
        ax.bar_label(container, fmt="%.2f", fontsize=7, padding=2)

    plt.tight_layout()
    plt.savefig(output_path)
    plt.savefig(output_path.with_suffix(".pdf"))
    plt.close()
    logger.info(f"Saved model comparison to {output_path}")


def plot_accuracy_heatmap(df: pd.DataFrame, output_path: Path):
    """Heatmap: model x chart_type accuracy."""
    pivot = df.groupby(["model_name", "chart_type"])["correct"].mean().unstack(fill_value=0)

    fig, ax = plt.subplots(figsize=(8, 4))
    sns.heatmap(
        pivot, annot=True, fmt=".2f", cmap="RdYlGn", vmin=0, vmax=1,
        linewidths=0.5, ax=ax, cbar_kws={"label": "Accuracy"},
    )
    ax.set_title("Model vs Chart Type Accuracy")
    ax.set_ylabel("Model")
    ax.set_xlabel("Chart Type")

    plt.tight_layout()
    plt.savefig(output_path)
    plt.savefig(output_path.with_suffix(".pdf"))
    plt.close()
    logger.info(f"Saved accuracy heatmap to {output_path}")


def plot_latency_boxplot(df: pd.DataFrame, output_path: Path):
    """Boxplot: latency distribution per model."""
    fig, ax = plt.subplots(figsize=(8, 5))
    models = df["model_name"].unique()
    data = [df[df["model_name"] == m]["latency_ms"].dropna().values for m in models]

    bp = ax.boxplot(data, labels=models, patch_artist=True)
    colors = sns.color_palette("Set2", len(models))
    for patch, color in zip(bp["boxes"], colors):
        patch.set_facecolor(color)

    ax.set_ylabel("Latency (ms)")
    ax.set_title("Response Latency by Model")
    ax.grid(axis="y", alpha=0.3)

    plt.tight_layout()
    plt.savefig(output_path)
    plt.savefig(output_path.with_suffix(".pdf"))
    plt.close()
    logger.info(f"Saved latency boxplot to {output_path}")


def plot_task_type_comparison(df: pd.DataFrame, output_path: Path):
    """Grouped bar chart: accuracy by task type per model."""
    pivot = df.groupby(["model_name", "task_type"])["correct"].mean().unstack(fill_value=0)

    ax = pivot.plot(kind="bar", figsize=(12, 6), width=0.8, edgecolor="black", linewidth=0.5)
    ax.set_ylabel("Accuracy")
    ax.set_xlabel("Model")
    ax.set_title("VLM Accuracy by Task Type")
    ax.set_ylim(0, 1.05)
    ax.legend(title="Task Type", bbox_to_anchor=(1.02, 1), loc="upper left", fontsize=8)
    plt.xticks(rotation=0)

    plt.tight_layout()
    plt.savefig(output_path)
    plt.savefig(output_path.with_suffix(".pdf"))
    plt.close()
    logger.info(f"Saved task type comparison to {output_path}")


def plot_cost_efficiency(df: pd.DataFrame, output_path: Path):
    """Scatter plot: accuracy vs cost per task."""
    summary = generate_summary_table(df)

    fig, ax = plt.subplots(figsize=(8, 6))
    for _, row in summary.iterrows():
        ax.scatter(
            row["mean_cost_per_task"] * 1000,  # convert to millicents
            row["overall_accuracy"],
            s=150, zorder=5, edgecolors="black", linewidth=0.5,
        )
        ax.annotate(
            row["model"], (row["mean_cost_per_task"] * 1000, row["overall_accuracy"]),
            textcoords="offset points", xytext=(10, 5), fontsize=10,
        )

    ax.set_xlabel("Cost per Task (milli-USD)")
    ax.set_ylabel("Overall Accuracy")
    ax.set_title("Accuracy vs Cost Efficiency")
    ax.set_ylim(0, 1.05)
    ax.grid(alpha=0.3)

    plt.tight_layout()
    plt.savefig(output_path)
    plt.savefig(output_path.with_suffix(".pdf"))
    plt.close()
    logger.info(f"Saved cost efficiency plot to {output_path}")


def plot_2d_vs_3d_comparison(df_2d: pd.DataFrame, df_3d: pd.DataFrame, output_path: Path):
    """Grouped bar chart: 2D vs 3D overall accuracy per model."""
    # Compute overall accuracy per model for each condition
    acc_2d = df_2d.groupby("model_name")["correct"].mean().rename("2D")
    acc_3d = df_3d.groupby("model_name")["correct"].mean().rename("3D")
    combined = pd.concat([acc_2d, acc_3d], axis=1)

    ax = combined.plot(kind="bar", figsize=(8, 5), width=0.6,
                       color=["#4C72B0", "#DD8452"], edgecolor="black", linewidth=0.5)
    ax.set_ylabel("Accuracy")
    ax.set_xlabel("Model")
    ax.set_title("2D vs 3D Chart Accuracy by Model")
    ax.set_ylim(0, 1.05)
    ax.legend(title="Condition")
    plt.xticks(rotation=0)

    for container in ax.containers:
        ax.bar_label(container, fmt="%.2f", fontsize=9, padding=2)

    plt.tight_layout()
    plt.savefig(output_path)
    plt.savefig(output_path.with_suffix(".pdf"))
    plt.close()
    logger.info(f"Saved 2D vs 3D comparison to {output_path}")


def plot_2d_vs_3d_by_chart_type(df_2d: pd.DataFrame, df_3d: pd.DataFrame, output_path: Path):
    """Grouped bar chart: 2D vs 3D accuracy per chart type, per model."""
    # Normalize 3D chart type names by stripping _3d suffix
    df_3d_norm = df_3d.copy()
    df_3d_norm["chart_type"] = df_3d_norm["chart_type"].str.replace("_3d", "", regex=False)
    df_3d_norm["condition"] = "3D"

    df_2d_norm = df_2d.copy()
    df_2d_norm["condition"] = "2D"

    combined = pd.concat([df_2d_norm, df_3d_norm], ignore_index=True)

    # Compute accuracy per model x condition x chart_type
    pivot = combined.groupby(["model_name", "chart_type", "condition"])["correct"].mean().reset_index()
    pivot_wide = pivot.pivot_table(
        values="correct", index=["model_name", "chart_type"], columns="condition"
    )

    # Plot as grouped bar
    fig, axes = plt.subplots(1, 2, figsize=(14, 6), sharey=True)
    models = combined["model_name"].unique()

    for idx, model in enumerate(sorted(models)):
        model_data = pivot_wide.loc[model]
        ax = axes[idx]
        model_data.plot(kind="bar", ax=ax, width=0.7,
                        color=["#4C72B0", "#DD8452"], edgecolor="black", linewidth=0.5)
        ax.set_title(model, fontsize=12)
        ax.set_ylabel("Accuracy" if idx == 0 else "")
        ax.set_xlabel("Chart Type")
        ax.set_ylim(0, 1.05)
        ax.legend(title="Condition", fontsize=8)
        ax.tick_params(axis="x", rotation=45)
        for container in ax.containers:
            ax.bar_label(container, fmt="%.2f", fontsize=7, padding=2)

    fig.suptitle("2D vs 3D Accuracy by Chart Type and Model", fontsize=14, y=1.02)
    plt.tight_layout()
    plt.savefig(output_path)
    plt.savefig(output_path.with_suffix(".pdf"))
    plt.close()
    logger.info(f"Saved 2D vs 3D by chart type to {output_path}")


def plot_2d_vs_3d_heatmap(df_2d: pd.DataFrame, df_3d: pd.DataFrame, output_path: Path):
    """Side-by-side heatmap: 2D accuracy vs 3D accuracy (model x chart_type)."""
    df_3d_norm = df_3d.copy()
    df_3d_norm["chart_type"] = df_3d_norm["chart_type"].str.replace("_3d", "", regex=False)

    pivot_2d = df_2d.groupby(["model_name", "chart_type"])["correct"].mean().unstack(fill_value=0)
    pivot_3d = df_3d_norm.groupby(["model_name", "chart_type"])["correct"].mean().unstack(fill_value=0)

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 4))

    sns.heatmap(pivot_2d, annot=True, fmt=".2f", cmap="RdYlGn", vmin=0, vmax=1,
                linewidths=0.5, ax=ax1, cbar_kws={"label": "Accuracy"})
    ax1.set_title("2D Charts")
    ax1.set_ylabel("Model")
    ax1.set_xlabel("Chart Type")

    sns.heatmap(pivot_3d, annot=True, fmt=".2f", cmap="RdYlGn", vmin=0, vmax=1,
                linewidths=0.5, ax=ax2, cbar_kws={"label": "Accuracy"})
    ax2.set_title("3D Charts")
    ax2.set_ylabel("")
    ax2.set_xlabel("Chart Type")

    fig.suptitle("2D vs 3D: Model x Chart Type Accuracy", fontsize=14, y=1.02)
    plt.tight_layout()
    plt.savefig(output_path)
    plt.savefig(output_path.with_suffix(".pdf"))
    plt.close()
    logger.info(f"Saved 2D vs 3D heatmap to {output_path}")


def generate_all_figures(config: PipelineConfig):
    """Generate all result figures from evaluation data."""
    store = ResultStore(config.results_dir)
    df = store.load_all_results()

    if df.empty:
        print("No results found. Run 'evaluate' first.")
        return

    output_dir = config.figures_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"Generating figures from {len(df)} results...")

    plot_model_comparison(df, output_dir / "model_comparison.png")
    plot_accuracy_heatmap(df, output_dir / "accuracy_heatmap.png")
    plot_latency_boxplot(df, output_dir / "latency_boxplot.png")
    plot_task_type_comparison(df, output_dir / "task_type_comparison.png")
    plot_cost_efficiency(df, output_dir / "cost_efficiency.png")

    # Save summary table
    summary = generate_summary_table(df)
    summary.to_csv(output_dir / "summary_table.csv", index=False)

    # Generate 2D vs 3D comparison figures if 3D results exist
    df_3d = store.load_all_results("all_results_3d.csv")
    if not df_3d.empty:
        print(f"\nGenerating 2D vs 3D comparison figures ({len(df_3d)} 3D results)...")
        plot_2d_vs_3d_comparison(df, df_3d, output_dir / "2d_vs_3d_comparison.png")
        plot_2d_vs_3d_by_chart_type(df, df_3d, output_dir / "2d_vs_3d_by_chart_type.png")
        plot_2d_vs_3d_heatmap(df, df_3d, output_dir / "2d_vs_3d_heatmap.png")

    print(f"\nAll figures saved to: {output_dir}")
    print("\nSummary Table:")
    print(summary.to_string(index=False))
