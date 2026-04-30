"""Multi-angle chart generator for 3D evaluation experiments.

Generates synthetic charts with known ground truth in three conditions:
  - 2D baseline (standard matplotlib)
  - 3D single-angle (one camera viewpoint)
  - 3D multi-angle (multiple camera viewpoints)

Each chart comes with questions and ground-truth answers so that
VLM accuracy can be compared across rendering conditions.
"""

from __future__ import annotations

import json
import random
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

CATEGORIES_POOL = [
    "USA", "China", "Germany", "Japan", "India", "Brazil", "UK", "France",
    "Canada", "Australia", "Italy", "Spain", "Mexico", "Russia", "Korea",
    "Indonesia", "Turkey", "Netherlands", "Switzerland", "Sweden",
]

DEFAULT_ANGLES = [
    {"elev": 30, "azim": 45},
    {"elev": 20, "azim": 0},
    {"elev": 20, "azim": 90},
    {"elev": 80, "azim": 45},
]


# ---------------------------------------------------------------------------
# Data generators
# ---------------------------------------------------------------------------


def _gen_bar_data(seed: int, n_categories: int = 6) -> dict:
    rng = np.random.RandomState(seed)
    cats = random.Random(seed).sample(CATEGORIES_POOL, n_categories)
    values = rng.randint(10, 100, size=n_categories).tolist()
    return {"categories": cats, "values": values}


def _gen_line_data(seed: int, n_points: int = 10) -> dict:
    rng = np.random.RandomState(seed)
    xs = list(range(2015, 2015 + n_points))
    base = rng.choice(["up", "down"])
    if base == "up":
        ys = np.cumsum(rng.uniform(0.5, 5.0, size=n_points)).tolist()
    else:
        ys = (100 - np.cumsum(rng.uniform(0.5, 5.0, size=n_points))).tolist()
    ys = [round(y, 1) for y in ys]
    trend = "increasing" if ys[-1] > ys[0] else "decreasing"
    return {"xs": xs, "ys": ys, "trend": trend}


def _gen_scatter_data(seed: int, n_points: int = 60) -> dict:
    rng = np.random.RandomState(seed)
    n_clusters = rng.choice([2, 3, 4])
    centers = rng.uniform(10, 90, size=(n_clusters, 3))
    points_x, points_y, points_z = [], [], []
    for c in centers:
        n = n_points // n_clusters
        points_x.extend((c[0] + rng.normal(0, 5, n)).tolist())
        points_y.extend((c[1] + rng.normal(0, 5, n)).tolist())
        points_z.extend((c[2] + rng.normal(0, 5, n)).tolist())
    # Correlation direction (between x and y)
    corr = np.corrcoef(points_x, points_y)[0, 1]
    if corr > 0.3:
        direction = "positive"
    elif corr < -0.3:
        direction = "negative"
    else:
        direction = "none"
    return {
        "x": points_x, "y": points_y, "z": points_z,
        "n_clusters": int(n_clusters), "correlation": direction,
    }


# ---------------------------------------------------------------------------
# 2D renderers
# ---------------------------------------------------------------------------


def _render_bar_2d(data: dict, path: Path):
    fig, ax = plt.subplots(figsize=(8, 5))
    ax.bar(data["categories"], data["values"], color="steelblue", edgecolor="black")
    ax.set_ylabel("Value")
    ax.set_title("Bar Chart")
    for i, v in enumerate(data["values"]):
        ax.text(i, v + 1, str(v), ha="center", fontsize=8)
    plt.xticks(rotation=45, ha="right")
    plt.tight_layout()
    plt.savefig(path, dpi=150)
    plt.close()


def _render_line_2d(data: dict, path: Path):
    fig, ax = plt.subplots(figsize=(8, 5))
    ax.plot(data["xs"], data["ys"], "o-", color="steelblue", linewidth=2, markersize=5)
    ax.set_xlabel("Year")
    ax.set_ylabel("Value")
    ax.set_title("Line Chart")
    ax.grid(alpha=0.3)
    plt.xticks(rotation=45, ha="right")
    plt.tight_layout()
    plt.savefig(path, dpi=150)
    plt.close()


def _render_scatter_2d(data: dict, path: Path):
    fig, ax = plt.subplots(figsize=(8, 5))
    ax.scatter(data["x"], data["y"], alpha=0.6, edgecolors="black", linewidth=0.5)
    ax.set_xlabel("X")
    ax.set_ylabel("Y")
    ax.set_title("Scatter Plot")
    ax.grid(alpha=0.3)
    plt.tight_layout()
    plt.savefig(path, dpi=150)
    plt.close()


# ---------------------------------------------------------------------------
# 3D renderers
# ---------------------------------------------------------------------------


def _render_bar_3d(data: dict, path: Path, elev: int = 30, azim: int = 45):
    fig = plt.figure(figsize=(8, 6))
    ax = fig.add_subplot(111, projection="3d")
    xs = np.arange(len(data["categories"]))
    ax.bar3d(xs, 0, 0, 0.6, 0.6, data["values"],
             color="steelblue", edgecolor="black", alpha=0.9)
    ax.set_xticks(xs + 0.3)
    ax.set_xticklabels(data["categories"], rotation=45, ha="right", fontsize=7)
    ax.set_zlabel("Value")
    ax.set_title("3D Bar Chart")
    ax.view_init(elev=elev, azim=azim)
    plt.tight_layout()
    plt.savefig(path, dpi=150)
    plt.close()


def _render_line_3d(data: dict, path: Path, elev: int = 30, azim: int = 45):
    fig = plt.figure(figsize=(8, 6))
    ax = fig.add_subplot(111, projection="3d")
    xs = np.arange(len(data["xs"]))
    zs = np.zeros_like(xs)
    ax.plot(xs, data["ys"], zs, "o-", color="steelblue", linewidth=2, markersize=5)
    ax.set_xticks(xs[::2])
    ax.set_xticklabels([str(x) for x in data["xs"][::2]], fontsize=7)
    ax.set_ylabel("Value")
    ax.set_title("3D Line Chart")
    ax.view_init(elev=elev, azim=azim)
    plt.tight_layout()
    plt.savefig(path, dpi=150)
    plt.close()


def _render_scatter_3d(data: dict, path: Path, elev: int = 30, azim: int = 45):
    fig = plt.figure(figsize=(8, 6))
    ax = fig.add_subplot(111, projection="3d")
    ax.scatter(data["x"], data["y"], data["z"],
               alpha=0.6, edgecolors="black", linewidth=0.3)
    ax.set_xlabel("X")
    ax.set_ylabel("Y")
    ax.set_zlabel("Z")
    ax.set_title("3D Scatter Plot")
    ax.view_init(elev=elev, azim=azim)
    plt.tight_layout()
    plt.savefig(path, dpi=150)
    plt.close()


# ---------------------------------------------------------------------------
# Question generators
# ---------------------------------------------------------------------------


def _bar_questions(data: dict, seed: int) -> list[dict]:
    rng = random.Random(seed)
    cats, vals = data["categories"], data["values"]
    questions = []

    # Value retrieval
    idx = rng.randint(0, len(cats) - 1)
    questions.append({
        "task_type": "value_retrieval",
        "question": f"What is the approximate value of the bar labeled '{cats[idx]}'?",
        "expected_answer": str(vals[idx]),
    })

    # Comparison
    i, j = rng.sample(range(len(cats)), 2)
    larger = cats[i] if vals[i] > vals[j] else cats[j]
    questions.append({
        "task_type": "value_comparison",
        "question": f"Which bar has a higher value: '{cats[i]}' or '{cats[j]}'?",
        "expected_answer": larger,
    })

    # Extremum
    max_idx = int(np.argmax(vals))
    questions.append({
        "task_type": "extremum_detection",
        "question": "Which category has the highest bar value?",
        "expected_answer": cats[max_idx],
    })

    return questions


def _line_questions(data: dict, seed: int) -> list[dict]:
    rng = random.Random(seed)
    xs, ys = data["xs"], data["ys"]
    questions = []

    # Value retrieval
    idx = rng.randint(0, len(xs) - 1)
    questions.append({
        "task_type": "value_retrieval",
        "question": f"What is the approximate value at year {xs[idx]}?",
        "expected_answer": str(ys[idx]),
    })

    # Trend identification
    questions.append({
        "task_type": "trend_identification",
        "question": "Is the overall trend of this line increasing or decreasing?",
        "expected_answer": data["trend"],
    })

    # Extremum
    max_idx = int(np.argmax(ys))
    questions.append({
        "task_type": "extremum_detection",
        "question": "In which year does the line reach its maximum value?",
        "expected_answer": str(xs[max_idx]),
    })

    return questions


def _scatter_questions(data: dict, seed: int) -> list[dict]:
    questions = []

    # Cluster count
    questions.append({
        "task_type": "cluster_count",
        "question": "How many distinct clusters of points can you see in this scatter plot?",
        "expected_answer": str(data["n_clusters"]),
    })

    # Correlation
    questions.append({
        "task_type": "correlation_direction",
        "question": "What is the overall correlation between X and Y: positive, negative, or none?",
        "expected_answer": data["correlation"],
    })

    return questions


# ---------------------------------------------------------------------------
# Dispatch tables
# ---------------------------------------------------------------------------

_DATA_GENERATORS = {"bar": _gen_bar_data, "line": _gen_line_data, "scatter": _gen_scatter_data}
_RENDERERS_2D = {"bar": _render_bar_2d, "line": _render_line_2d, "scatter": _render_scatter_2d}
_RENDERERS_3D = {"bar": _render_bar_3d, "line": _render_line_3d, "scatter": _render_scatter_3d}
_QUESTION_GENERATORS = {"bar": _bar_questions, "line": _line_questions, "scatter": _scatter_questions}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def generate_charts(
    charts_dir: Path,
    charts_3d_dir: Path,
    charts_multiangle_dir: Path,
    chart_types: list[str],
    n_per_type: int = 50,
    angles: list[dict] | None = None,
    seed: int = 42,
) -> dict[str, Path]:
    """Generate 2D, 3D single-angle, and 3D multi-angle charts.

    Returns a dict mapping condition name to its manifest path.
    """
    if angles is None:
        angles = DEFAULT_ANGLES

    for d in (charts_dir, charts_3d_dir, charts_multiangle_dir):
        d.mkdir(parents=True, exist_ok=True)

    manifest_2d: list[dict] = []
    manifest_3d: list[dict] = []
    manifest_ma: list[dict] = []

    for chart_type in chart_types:
        gen_data = _DATA_GENERATORS[chart_type]
        render_2d = _RENDERERS_2D[chart_type]
        render_3d = _RENDERERS_3D[chart_type]
        gen_questions = _QUESTION_GENERATORS[chart_type]

        for i in range(n_per_type):
            chart_seed = seed + i
            chart_id = f"{chart_type}_{i:04d}"
            data = gen_data(chart_seed)
            questions = gen_questions(data, chart_seed)

            # --- 2D ---
            img_2d = charts_dir / f"{chart_id}.png"
            render_2d(data, img_2d)
            manifest_2d.append({
                "chart_id": chart_id,
                "chart_type": chart_type,
                "image_path": str(img_2d),
                "questions": questions,
            })

            # --- 3D single angle (first angle) ---
            img_3d = charts_3d_dir / f"{chart_id}.png"
            render_3d(data, img_3d, elev=angles[0]["elev"], azim=angles[0]["azim"])
            manifest_3d.append({
                "chart_id": chart_id,
                "chart_type": chart_type,
                "image_path": str(img_3d),
                "questions": questions,
            })

            # --- 3D multi-angle ---
            angle_paths = []
            for ai, angle in enumerate(angles):
                img_ma = charts_multiangle_dir / f"{chart_id}_view{ai}.png"
                render_3d(data, img_ma, elev=angle["elev"], azim=angle["azim"])
                angle_paths.append(str(img_ma))
            manifest_ma.append({
                "chart_id": chart_id,
                "chart_type": chart_type,
                "image_paths": angle_paths,
                "questions": questions,
            })

    # Save manifests
    paths = {}
    for name, items, directory in [
        ("2d", manifest_2d, charts_dir),
        ("3d", manifest_3d, charts_3d_dir),
        ("multiangle", manifest_ma, charts_multiangle_dir),
    ]:
        manifest_path = directory / "manifest.json"
        with open(manifest_path, "w") as f:
            json.dump({"condition": name, "items": items}, f, indent=2)
        paths[name] = manifest_path

    total = n_per_type * len(chart_types)
    n_angles = len(angles)
    print(f"Generated {total} charts x 3 conditions:")
    print(f"  2D:          {total} images  -> {charts_dir}")
    print(f"  3D single:   {total} images  -> {charts_3d_dir}")
    print(f"  3D multi:    {total * n_angles} images ({n_angles} angles) -> {charts_multiangle_dir}")

    return paths
