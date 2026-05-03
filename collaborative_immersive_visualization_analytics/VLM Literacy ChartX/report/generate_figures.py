"""Generate publication-quality figures for the final report."""

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

OUT = "figures"

# Data from evaluation results
CHART_TYPES_2D = [
    ("line_chart_num", 95.3),
    ("pie_chart", 94.7),
    ("bar_chart_num", 92.1),
    ("rose", 91.8),
    ("rings", 91.1),
    ("line_chart", 91.1),
    ("box", 89.3),
    ("heatmap", 88.9),
    ("candlestick", 88.9),
    ("bar_chart", 87.7),
    ("multi-axes", 86.8),
    ("histogram", 85.4),
    ("funnel", 83.2),
    ("area_chart", 77.4),
    ("bubble", 71.1),
    ("radar", 68.2),
    ("treemap", 51.6),
]

plt.rcParams.update({
    "figure.dpi": 300, "savefig.dpi": 300,
    "font.family": "serif", "font.size": 10,
    "axes.titlesize": 12, "axes.labelsize": 10,
    "savefig.bbox": "tight", "savefig.pad_inches": 0.1,
})


def fig1_accuracy_by_chart_type():
    """Horizontal bar chart: accuracy by chart type (2D)."""
    fig, ax = plt.subplots(figsize=(7, 5.5))

    names = [ct for ct, _ in reversed(CHART_TYPES_2D)]
    accs = [acc for _, acc in reversed(CHART_TYPES_2D)]

    # Color by encoding type
    encoding_colors = {
        "line_chart_num": "#2196F3", "line_chart": "#2196F3",
        "bar_chart_num": "#2196F3", "bar_chart": "#2196F3",
        "box": "#2196F3", "candlestick": "#2196F3",
        "histogram": "#2196F3", "multi-axes": "#2196F3",
        "pie_chart": "#4CAF50", "rings": "#4CAF50", "rose": "#4CAF50",
        "heatmap": "#FF9800",
        "funnel": "#9C27B0",
        "area_chart": "#F44336", "bubble": "#F44336",
        "treemap": "#F44336", "radar": "#F44336",
    }
    colors = [encoding_colors.get(n, "#999") for n in names]

    bars = ax.barh(names, accs, color=colors, edgecolor="black", linewidth=0.3, height=0.7)

    # Add value labels
    for bar, acc in zip(bars, accs):
        ax.text(acc + 0.5, bar.get_y() + bar.get_height()/2,
                f"{acc:.1f}%", va="center", fontsize=8)

    ax.set_xlim(0, 105)
    ax.set_xlabel("Accuracy (%)")
    ax.set_title("GPT-5.4 Accuracy on ChartX 2D by Chart Type")
    ax.axvline(x=85.7, color="red", linestyle="--", linewidth=1, alpha=0.7, label="Overall: 85.7%")
    ax.legend(fontsize=8)

    # Legend for encoding types
    from matplotlib.patches import Patch
    legend_elements = [
        Patch(facecolor="#2196F3", label="Position-encoded"),
        Patch(facecolor="#4CAF50", label="Angle/Arc-encoded"),
        Patch(facecolor="#FF9800", label="Color-encoded"),
        Patch(facecolor="#9C27B0", label="Length-encoded"),
        Patch(facecolor="#F44336", label="Area/Polar-encoded"),
    ]
    ax.legend(handles=legend_elements, loc="lower right", fontsize=7, framealpha=0.9)

    ax.grid(axis="x", alpha=0.2)
    plt.tight_layout()
    plt.savefig(f"{OUT}/fig1_accuracy_by_chart_type.png")
    plt.savefig(f"{OUT}/fig1_accuracy_by_chart_type.pdf")
    plt.close()
    print("  Fig 1: Accuracy by chart type")


def fig2_2d_vs_3d():
    """Grouped bar chart: 2D vs 3D bar chart accuracy."""
    fig, ax = plt.subplots(figsize=(5, 3.5))

    conditions = ["2D bar_chart", "2D bar_chart_num", "3D-Bar"]
    accs = [87.7, 92.1, 59.3]
    colors = ["#2196F3", "#2196F3", "#F44336"]

    bars = ax.bar(conditions, accs, color=colors, edgecolor="black", linewidth=0.5, width=0.5)
    for bar, acc in zip(bars, accs):
        ax.text(bar.get_x() + bar.get_width()/2, acc + 1.5,
                f"{acc:.1f}%", ha="center", fontsize=10, fontweight="bold")

    ax.set_ylim(0, 105)
    ax.set_ylabel("Accuracy (%)")
    ax.set_title("2D vs 3D Bar Chart Accuracy")

    # Add drop annotation
    ax.annotate("", xy=(2, 59.3), xytext=(1, 92.1),
                arrowprops=dict(arrowstyle="->", color="red", lw=2))
    ax.text(1.7, 78, "-32.8pp", color="red", fontsize=10, fontweight="bold")

    ax.grid(axis="y", alpha=0.2)
    plt.tight_layout()
    plt.savefig(f"{OUT}/fig2_2d_vs_3d.png")
    plt.savefig(f"{OUT}/fig2_2d_vs_3d.pdf")
    plt.close()
    print("  Fig 2: 2D vs 3D comparison")


def fig3_perceptual_hierarchy():
    """Grouped comparison: encoding type vs accuracy."""
    fig, ax = plt.subplots(figsize=(6, 3.5))

    groups = {
        "Position\n(bar,line,box,\ncandlestick,hist)": [95.3, 92.1, 91.1, 91.1, 89.3, 88.9, 87.7, 86.8, 85.4],
        "Angle/Arc\n(pie,rings,\nrose)": [94.7, 91.1, 91.8],
        "Color\n(heatmap)": [88.9],
        "Length\n(funnel)": [83.2],
        "Area/Polar\n(treemap,bubble,\nradar,area)": [51.6, 71.1, 68.2, 77.4],
    }

    names = list(groups.keys())
    means = [np.mean(v) for v in groups.values()]
    stds = [np.std(v) for v in groups.values()]
    colors = ["#2196F3", "#4CAF50", "#FF9800", "#9C27B0", "#F44336"]

    bars = ax.bar(range(len(names)), means, yerr=stds, color=colors,
                  edgecolor="black", linewidth=0.5, width=0.6, capsize=4)

    for bar, m in zip(bars, means):
        ax.text(bar.get_x() + bar.get_width()/2, m + 3,
                f"{m:.1f}%", ha="center", fontsize=9, fontweight="bold")

    ax.set_xticks(range(len(names)))
    ax.set_xticklabels(names, fontsize=7)
    ax.set_ylim(0, 110)
    ax.set_ylabel("Mean Accuracy (%)")
    ax.set_title("Accuracy by Perceptual Encoding Channel\n(Cleveland & McGill Hierarchy)")
    ax.grid(axis="y", alpha=0.2)
    plt.tight_layout()
    plt.savefig(f"{OUT}/fig3_perceptual_hierarchy.png")
    plt.savefig(f"{OUT}/fig3_perceptual_hierarchy.pdf")
    plt.close()
    print("  Fig 3: Perceptual hierarchy")


def fig4_failure_analysis():
    """Stacked bar: failure type breakdown for weak chart types."""
    fig, ax = plt.subplots(figsize=(5, 3.5))

    types = ["Treemap\n(51.6%)", "Radar\n(68.2%)", "Bubble\n(71.1%)", "Area\n(77.4%)"]
    completely_wrong = [79, 66, 75, 79]
    close_numeric = [17, 11, 9, 10]
    format_mismatch = [4, 22, 16, 11]

    x = range(len(types))
    w = 0.5
    ax.bar(x, completely_wrong, w, label="Completely wrong", color="#F44336", edgecolor="black", linewidth=0.3)
    ax.bar(x, close_numeric, w, bottom=completely_wrong, label="Close (within 25%)", color="#FF9800", edgecolor="black", linewidth=0.3)
    bottoms = [a+b for a, b in zip(completely_wrong, close_numeric)]
    ax.bar(x, format_mismatch, w, bottom=bottoms, label="Format mismatch", color="#FFC107", edgecolor="black", linewidth=0.3)

    ax.set_xticks(x)
    ax.set_xticklabels(types, fontsize=8)
    ax.set_ylabel("% of Failures")
    ax.set_title("Failure Classification for Weak Chart Types")
    ax.legend(fontsize=7, loc="upper right")
    ax.set_ylim(0, 115)
    ax.grid(axis="y", alpha=0.2)
    plt.tight_layout()
    plt.savefig(f"{OUT}/fig4_failure_analysis.png")
    plt.savefig(f"{OUT}/fig4_failure_analysis.pdf")
    plt.close()
    print("  Fig 4: Failure analysis")


def fig5_prior_work_comparison():
    """Bar chart comparing this work with prior studies."""
    fig, ax = plt.subplots(figsize=(6, 3.5))

    studies = ["Kim et al.\n(GPT-4V)", "Pandey\n(GPT-4)", "Phase 1\n(GPT-5.2)", "VLAT\n(GPT-5.4)", "This work\n(GPT-5.4)"]
    accs_2d = [82, 85, 82, 67.9, 85.7]
    accs_3d = [None, None, 31.1, None, 59.3]

    x = np.arange(len(studies))
    w = 0.35

    bars1 = ax.bar(x - w/2, accs_2d, w, label="2D", color="#2196F3", edgecolor="black", linewidth=0.3)
    bars2 = ax.bar(x + w/2, [a if a else 0 for a in accs_3d], w, label="3D", color="#F44336", edgecolor="black", linewidth=0.3)

    for bar, acc in zip(bars1, accs_2d):
        ax.text(bar.get_x() + bar.get_width()/2, acc + 1,
                f"{acc}%", ha="center", fontsize=7, fontweight="bold")
    for bar, acc in zip(bars2, accs_3d):
        if acc:
            ax.text(bar.get_x() + bar.get_width()/2, acc + 1,
                    f"{acc}%", ha="center", fontsize=7, fontweight="bold")

    ax.set_xticks(x)
    ax.set_xticklabels(studies, fontsize=7)
    ax.set_ylim(0, 105)
    ax.set_ylabel("Accuracy (%)")
    ax.set_title("Comparison with Prior Work")
    ax.legend(fontsize=8)
    ax.grid(axis="y", alpha=0.2)
    plt.tight_layout()
    plt.savefig(f"{OUT}/fig5_prior_work.png")
    plt.savefig(f"{OUT}/fig5_prior_work.pdf")
    plt.close()
    print("  Fig 5: Prior work comparison")


if __name__ == "__main__":
    print("Generating figures...")
    fig1_accuracy_by_chart_type()
    fig2_2d_vs_3d()
    fig3_perceptual_hierarchy()
    fig4_failure_analysis()
    fig5_prior_work_comparison()

    # Copy sample ChartX images for the report
    import shutil
    src = "/Users/nagavenkatasaichennu/Desktop/692-working-project/vlm-eval-pipeline/data/chartx_raw/images/ChartX_png"
    samples = [
        (f"{src}/bar_chart/png/bar_85.png", f"{OUT}/sample_bar_2d.png"),
        (f"{src}/3D-Bar/png/3D-Bar_1.png", f"{OUT}/sample_bar_3d.png"),
        (f"{src}/treemap/png/228.png", f"{OUT}/sample_treemap.png"),
        (f"{src}/line_chart/png/line_3.png", f"{OUT}/sample_line_2d.png"),
        (f"{src}/radar/png/radar_50.png", f"{OUT}/sample_radar.png"),
        (f"{src}/bubble/png/bubble_237.png", f"{OUT}/sample_bubble.png"),
    ]
    for s, d in samples:
        try:
            shutil.copy(s, d)
        except FileNotFoundError:
            print(f"  Warning: {s} not found")

    print(f"\nAll figures saved to {OUT}/")
    import os
    for f in sorted(os.listdir(OUT)):
        size = os.path.getsize(f"{OUT}/{f}")
        print(f"  {f}: {size/1024:.1f} KB")
