"""3D matplotlib renderers for the ChartX worst-4 chart types.

Each renderer takes a parsed `data` dict from chartx_local_loader and writes
a single PNG. The dispatch entry point `render_3d` selects the right
renderer for the chart_type.

Designed for clarity at 300 DPI / 10x8 figure size, with explicit
in-figure value labels, transparent 3D panes, and large fonts.

Multi-angle convention: pass elev=25, azim in {0, 90, 180, 270} per view.
Single-angle canonical view: elev=25, azim=45 (does not coincide with
any multi-angle frame).
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import squarify
from matplotlib import cm
from mpl_toolkits.mplot3d.art3d import Poly3DCollection

# ---------------------------------------------------------------------------
# Shared style constants
# ---------------------------------------------------------------------------

FIGSIZE = (10, 8)
DPI = 300
TITLE_FS = 16
AXES_FS = 14
TICK_FS = 11
LABEL_FS = 10
EDGE_COLOR = "black"
EDGE_LW = 0.5
ALPHA = 0.92
SINGLE_ANGLE = (25, 45)  # (elev, azim) for 3D-single condition
MULTI_ANGLES = [(25, 0), (25, 90), (25, 180), (25, 270)]


def _apply_3d_style(ax) -> None:
    """Apply consistent visual styling to a 3D axes object."""
    # Transparent panes with light gray edges
    ax.xaxis.set_pane_color((1.0, 1.0, 1.0, 0.0))
    ax.yaxis.set_pane_color((1.0, 1.0, 1.0, 0.0))
    ax.zaxis.set_pane_color((1.0, 1.0, 1.0, 0.0))
    ax.xaxis.pane.set_edgecolor("lightgrey")
    ax.yaxis.pane.set_edgecolor("lightgrey")
    ax.zaxis.pane.set_edgecolor("lightgrey")
    # Light grid
    ax.grid(True, alpha=0.25)
    # Tick label sizes
    ax.tick_params(axis="both", which="major", labelsize=TICK_FS)


def _wrap_title(title: str, max_chars: int = 60) -> str:
    """Soft-wrap long titles to two lines so they fit in the figure."""
    if len(title) <= max_chars:
        return title
    words = title.split()
    line1: list[str] = []
    n = 0
    for w in words:
        if n + len(w) + 1 > max_chars and line1:
            break
        line1.append(w)
        n += len(w) + 1
    rest = words[len(line1):]
    return " ".join(line1) + ("\n" + " ".join(rest) if rest else "")


# ---------------------------------------------------------------------------
# Treemap 3D — squarify-tiled prisms with height ∝ value
# ---------------------------------------------------------------------------


def _make_prism(x: float, y: float, dx: float, dy: float, dz: float) -> list[list[tuple[float, float, float]]]:
    """Return the 6 face polygons of a rectangular prism."""
    x0, x1 = x, x + dx
    y0, y1 = y, y + dy
    z0, z1 = 0.0, dz
    return [
        # bottom
        [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0)],
        # top
        [(x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)],
        # front (y=y0)
        [(x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1)],
        # back (y=y1)
        [(x0, y1, z0), (x1, y1, z0), (x1, y1, z1), (x0, y1, z1)],
        # left (x=x0)
        [(x0, y0, z0), (x0, y1, z0), (x0, y1, z1), (x0, y0, z1)],
        # right (x=x1)
        [(x1, y0, z0), (x1, y1, z0), (x1, y1, z1), (x1, y0, z1)],
    ]


def _render_treemap_3d(data: dict[str, Any], out_path: Path, *, elev: int, azim: int, title: str) -> None:
    labels: list[str] = list(data["labels"])
    values: list[float] = list(data["values"])
    value_axis: str = data.get("value_axis", "Value")

    n = len(values)
    if n == 0:
        raise ValueError("Treemap has zero values")

    # Squarify on a 100x100 footprint
    sizes = squarify.normalize_sizes(values, 100, 100)
    rects = squarify.squarify(sizes, 0, 0, 100, 100)

    # Height = original value (so total visual encoding is footprint*height)
    max_v = max(values)
    z_max = max_v * 1.15

    fig = plt.figure(figsize=FIGSIZE, dpi=DPI)
    ax = fig.add_subplot(111, projection="3d")

    cmap = cm.get_cmap("viridis_r")
    colors = [cmap(0.10 + 0.75 * i / max(n - 1, 1)) for i in range(n)]

    # Determine which labels go on-prism vs in side legend
    top8_idx = sorted(range(n), key=lambda i: -values[i])[:8]
    show_on_prism = set(top8_idx)

    # Sort: largest first (back-most after squarify) — squarify already places largest first,
    # which after viridis goes back-left.
    for i, (rect, val, lab, color) in enumerate(zip(rects, values, labels, colors)):
        x, y = rect["x"], rect["y"]
        dx, dy = rect["dx"], rect["dy"]
        faces = _make_prism(x, y, dx, dy, val)
        poly = Poly3DCollection(
            faces,
            facecolors=[color] * 6,
            edgecolors=EDGE_COLOR,
            linewidths=EDGE_LW,
            alpha=ALPHA,
        )
        ax.add_collection3d(poly)

        if i in show_on_prism:
            # Place label centered on top face
            cx = x + dx / 2
            cy = y + dy / 2
            cz = val + z_max * 0.02
            # Shorten very long labels for in-figure rendering
            short = lab if len(lab) <= 22 else lab[:20] + "…"
            ax.text(
                cx,
                cy,
                cz,
                f"{short}\n{val:g}",
                ha="center",
                va="bottom",
                fontsize=max(8, LABEL_FS - max(0, n - 8) // 4),
                color="black",
                zorder=10,
            )

    # Axis limits
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.set_zlim(0, z_max)

    # Axis labels and ticks
    ax.set_xlabel("")
    ax.set_ylabel("")
    ax.set_zlabel(value_axis, fontsize=AXES_FS, labelpad=8)
    ax.set_xticks([])
    ax.set_yticks([])
    ax.tick_params(axis="z", labelsize=TICK_FS)
    ax.view_init(elev=elev, azim=azim)
    _apply_3d_style(ax)

    # Side legend if any labels weren't shown on-prism
    legend_idx = [i for i in range(n) if i not in show_on_prism]
    if legend_idx:
        from matplotlib.patches import Patch

        handles = [
            Patch(facecolor=colors[i], edgecolor=EDGE_COLOR, label=f"{labels[i]} ({values[i]:g})")
            for i in legend_idx
        ]
        fig.legend(
            handles=handles,
            loc="center right",
            bbox_to_anchor=(0.99, 0.5),
            fontsize=LABEL_FS - 1,
            frameon=True,
            title="Other categories",
            title_fontsize=LABEL_FS,
        )

    fig.suptitle(_wrap_title(title) or "Treemap (3D)", fontsize=TITLE_FS, y=0.97)
    fig.savefig(out_path, dpi=DPI, bbox_inches="tight", facecolor="white")
    plt.close(fig)


# ---------------------------------------------------------------------------
# Radar 3D — concentric rings of 3D bars at K polar axes
# ---------------------------------------------------------------------------


def _render_radar_3d(data: dict[str, Any], out_path: Path, *, elev: int, azim: int, title: str) -> None:
    axis_labels: list[str] = list(data["axis_labels"])
    series_labels: list[str] = list(data["series_labels"])
    matrix: list[list[float]] = data["matrix"]

    n_series = len(series_labels)
    n_axes = len(axis_labels)
    if n_series == 0 or n_axes == 0:
        raise ValueError("Radar has empty series or axes")

    angles = np.linspace(0, 2 * np.pi, n_axes, endpoint=False)
    # Radial offset per series: 1, 2, ..., n_series
    radii = np.arange(1, n_series + 1, dtype=float)

    max_v = max(max(row) for row in matrix) if any(matrix) else 1.0
    z_max = max_v * 1.15

    # Bar footprint sizing
    dx = dy = 0.45  # square footprint per bar

    fig = plt.figure(figsize=FIGSIZE, dpi=DPI)
    ax = fig.add_subplot(111, projection="3d")

    cmap = cm.get_cmap("tab10")
    series_colors = [cmap(i % 10) for i in range(n_series)]

    # Draw radial gridlines at z=0 (one line per axis)
    r_max = radii[-1] + 0.6
    for theta in angles:
        x_end = r_max * np.cos(theta)
        y_end = r_max * np.sin(theta)
        ax.plot([0, x_end], [0, y_end], [0, 0], color="lightgrey", linewidth=0.7, zorder=1)

    # Draw concentric circles at z=0
    circle_theta = np.linspace(0, 2 * np.pi, 200)
    for r in radii:
        ax.plot(
            r * np.cos(circle_theta),
            r * np.sin(circle_theta),
            np.zeros_like(circle_theta),
            color="lightgrey",
            linewidth=0.5,
            zorder=1,
        )

    # Draw bars
    for s_idx, row in enumerate(matrix):
        r = radii[s_idx]
        for a_idx, theta in enumerate(angles):
            cx = r * np.cos(theta) - dx / 2
            cy = r * np.sin(theta) - dy / 2
            v = row[a_idx]
            ax.bar3d(
                cx,
                cy,
                0,
                dx,
                dy,
                v,
                color=series_colors[s_idx],
                edgecolor=EDGE_COLOR,
                linewidth=EDGE_LW,
                alpha=ALPHA,
                zorder=2,
            )
            # Value label above bar
            if v > 0:
                ax.text(
                    cx + dx / 2,
                    cy + dy / 2,
                    v + z_max * 0.015,
                    f"{v:g}",
                    ha="center",
                    va="bottom",
                    fontsize=LABEL_FS - 1,
                    color="black",
                    zorder=10,
                )

    # Axis labels around the perimeter on z=0 plane
    label_r = r_max * 1.05
    for theta, lab in zip(angles, axis_labels):
        ax.text(
            label_r * np.cos(theta),
            label_r * np.sin(theta),
            0,
            lab,
            ha="center",
            va="center",
            fontsize=AXES_FS - 1,
            color="black",
            zorder=10,
        )

    ax.set_xlim(-r_max * 1.15, r_max * 1.15)
    ax.set_ylim(-r_max * 1.15, r_max * 1.15)
    ax.set_zlim(0, z_max)
    ax.set_xticks([])
    ax.set_yticks([])
    ax.set_zlabel("Value", fontsize=AXES_FS, labelpad=8)
    ax.tick_params(axis="z", labelsize=TICK_FS)
    ax.view_init(elev=elev, azim=azim)
    _apply_3d_style(ax)

    # Legend for series
    from matplotlib.patches import Patch

    handles = [
        Patch(facecolor=series_colors[i], edgecolor=EDGE_COLOR, label=series_labels[i])
        for i in range(n_series)
    ]
    fig.legend(
        handles=handles,
        loc="center right",
        bbox_to_anchor=(0.99, 0.5),
        fontsize=LABEL_FS,
        frameon=True,
        title="Series",
        title_fontsize=LABEL_FS,
    )

    fig.suptitle(_wrap_title(title) or "Radar (3D)", fontsize=TITLE_FS, y=0.97)
    fig.savefig(out_path, dpi=DPI, bbox_inches="tight", facecolor="white")
    plt.close(fig)


# ---------------------------------------------------------------------------
# Bubble 3D — cylinders (radius ∝ √size, height = color value)
# ---------------------------------------------------------------------------


def _make_cylinder(cx: float, cy: float, radius: float, height: float, n_segments: int = 28) -> list[list[tuple[float, float, float]]]:
    """Side faces of a cylinder centred at (cx, cy), top at z=height."""
    theta = np.linspace(0, 2 * np.pi, n_segments + 1)
    xs = cx + radius * np.cos(theta)
    ys = cy + radius * np.sin(theta)
    side_faces: list[list[tuple[float, float, float]]] = []
    for i in range(n_segments):
        side_faces.append([
            (xs[i], ys[i], 0.0),
            (xs[i + 1], ys[i + 1], 0.0),
            (xs[i + 1], ys[i + 1], height),
            (xs[i], ys[i], height),
        ])
    # Top disc (single polygon)
    top = [(xs[i], ys[i], height) for i in range(n_segments)]
    side_faces.append(top)
    return side_faces


def _render_bubble_3d(data: dict[str, Any], out_path: Path, *, elev: int, azim: int, title: str) -> None:
    """Bubble in 3D: cylinders in a normalized [0,100]^3 visual space.

    The four data channels (x, y, size, color) span vastly different scales,
    so we project x, y, and color (height) to [0,100] independently and label
    the ticks with the original values. Cylinder radius scales with √size.
    """
    entities: list[str] = list(data["entities"])
    xs_raw = np.asarray(data["x"], dtype=float)
    ys_raw = np.asarray(data["y"], dtype=float)
    sizes = np.asarray(data["size"], dtype=float)
    colors_raw = np.asarray(data["color"], dtype=float)
    labels = data["labels"]

    n = len(entities)
    if n == 0:
        raise ValueError("Bubble has no entities")

    def _norm(arr: np.ndarray) -> tuple[np.ndarray, float, float]:
        amin, amax = float(arr.min()), float(arr.max())
        rng = max(amax - amin, 1e-9)
        return (arr - amin) / rng * 100.0, amin, amax

    xs, x_min, x_max = _norm(xs_raw)
    ys, y_min, y_max = _norm(ys_raw)
    cs, c_min, c_max = _norm(colors_raw)

    # Cylinder radius: 3% to 10% of the visual range, by √size.
    s_min, s_max = sizes.min(), sizes.max()
    s_norm = (sizes - s_min) / max(s_max - s_min, 1e-9)
    r_min, r_max = 3.0, 10.0
    radii = r_min + np.sqrt(s_norm) * (r_max - r_min)

    z_max_visual = 115.0

    fig = plt.figure(figsize=FIGSIZE, dpi=DPI)
    ax = fig.add_subplot(111, projection="3d")
    ax.set_box_aspect((1.0, 1.0, 1.0))

    cmap = cm.get_cmap("tab20")
    entity_colors = [cmap(i % 20) for i in range(n)]

    for i in range(n):
        faces = _make_cylinder(xs[i], ys[i], radii[i], cs[i], n_segments=28)
        poly = Poly3DCollection(
            faces,
            facecolors=[entity_colors[i]] * len(faces),
            edgecolors=EDGE_COLOR,
            linewidths=EDGE_LW * 0.6,
            alpha=0.80,
        )
        ax.add_collection3d(poly)
        # Top label: entity name + raw size value
        ax.text(
            xs[i] + radii[i] * 0.7,
            ys[i] + radii[i] * 0.7,
            cs[i] + 4.0,
            f"{entities[i]}\n{labels['size']}={sizes[i]:g}",
            fontsize=LABEL_FS - 1,
            color="black",
            ha="left",
            va="bottom",
            zorder=10,
        )

    # Tick labels show the ORIGINAL data values, evenly spaced across the [0,100] visual range.
    def _ticks(amin: float, amax: float) -> tuple[list[float], list[str]]:
        vals = np.linspace(amin, amax, 5)
        positions = np.linspace(0, 100, 5)
        # Pretty-format: integers if all whole numbers, else 2 decimals
        if all(abs(v - round(v)) < 1e-6 for v in vals):
            labs = [f"{int(round(v))}" for v in vals]
        else:
            labs = [f"{v:.2g}" for v in vals]
        return list(positions), labs

    xt_pos, xt_lab = _ticks(x_min, x_max)
    yt_pos, yt_lab = _ticks(y_min, y_max)
    zt_pos, zt_lab = _ticks(c_min, c_max)
    ax.set_xticks(xt_pos)
    ax.set_xticklabels(xt_lab)
    ax.set_yticks(yt_pos)
    ax.set_yticklabels(yt_lab)
    ax.set_zticks(zt_pos)
    ax.set_zticklabels(zt_lab)

    ax.set_xlim(-5, 105)
    ax.set_ylim(-5, 105)
    ax.set_zlim(0, z_max_visual)
    ax.set_xlabel(labels["x"], fontsize=AXES_FS, labelpad=10)
    ax.set_ylabel(labels["y"], fontsize=AXES_FS, labelpad=10)
    ax.set_zlabel(labels["color"], fontsize=AXES_FS, labelpad=10)
    ax.view_init(elev=elev, azim=azim)
    _apply_3d_style(ax)

    # Annotation in corner explaining size encoding
    fig.text(
        0.02,
        0.02,
        f"Cylinder radius ∝ √({labels['size']})",
        fontsize=LABEL_FS - 1,
        color="dimgray",
    )

    fig.suptitle(_wrap_title(title) or "Bubble (3D)", fontsize=TITLE_FS, y=0.97)
    fig.savefig(out_path, dpi=DPI, bbox_inches="tight", facecolor="white")
    plt.close(fig)


# ---------------------------------------------------------------------------
# Area chart 3D — parallel ribbons separated along Y
# ---------------------------------------------------------------------------


def _render_area_3d(data: dict[str, Any], out_path: Path, *, elev: int, azim: int, title: str) -> None:
    x_label: str = data.get("x_label", "Category")
    x_values: list[str] = list(data["x_values"])
    series_names: list[str] = list(data["series_names"])
    series_data: dict[str, list[float]] = data["series_data"]

    n_series = len(series_names)
    n_x = len(x_values)
    if n_series == 0 or n_x < 2:
        raise ValueError("Area chart needs ≥1 series and ≥2 x values")

    # Order series by descending mean (biggest in back)
    means = {s: float(np.mean(series_data[s])) for s in series_names}
    series_ordered = sorted(series_names, key=lambda s: -means[s])

    # Ribbons spaced along Y at unit intervals
    y_positions = np.arange(n_series, dtype=float)

    max_v = max(max(series_data[s]) for s in series_names)
    z_max = max_v * 1.18

    fig = plt.figure(figsize=FIGSIZE, dpi=DPI)
    ax = fig.add_subplot(111, projection="3d")

    cmap = cm.get_cmap("tab10")
    series_colors = {s: cmap(i % 10) for i, s in enumerate(series_ordered)}

    x_idx = np.arange(n_x, dtype=float)

    for s_pos, s_name in enumerate(series_ordered):
        y = y_positions[s_pos]
        z_vals = series_data[s_name]
        # Build per-segment trapezoid polygons
        polys: list[list[tuple[float, float, float]]] = []
        for i in range(n_x - 1):
            polys.append([
                (x_idx[i], y, 0.0),
                (x_idx[i + 1], y, 0.0),
                (x_idx[i + 1], y, float(z_vals[i + 1])),
                (x_idx[i], y, float(z_vals[i])),
            ])
        ribbon = Poly3DCollection(
            polys,
            facecolors=[series_colors[s_name]] * len(polys),
            edgecolors=EDGE_COLOR,
            linewidths=EDGE_LW,
            alpha=0.85,
        )
        ax.add_collection3d(ribbon)

        # Top-edge line for each ribbon (clarity)
        ax.plot(
            x_idx,
            np.full_like(x_idx, y),
            z_vals,
            color="black",
            linewidth=0.8,
            zorder=10,
        )

        # Value label at the rightmost segment
        ax.text(
            x_idx[-1] + 0.15,
            y,
            float(z_vals[-1]),
            f"{s_name}: {z_vals[-1]:g}",
            ha="left",
            va="center",
            fontsize=LABEL_FS,
            color="black",
            zorder=11,
        )

    # X tick labels (rotated according to view)
    ax.set_xlim(-0.5, n_x - 0.5 + 1.5)
    ax.set_ylim(-0.5, n_series - 0.5)
    ax.set_zlim(0, z_max)
    ax.set_xticks(x_idx)
    # Rotate x tick labels 30 degrees so labels stay legible
    ax.set_xticklabels([str(x) for x in x_values], fontsize=TICK_FS - 1, rotation=30, ha="right")
    ax.set_yticks(y_positions)
    ax.set_yticklabels(series_ordered, fontsize=TICK_FS - 1)
    ax.set_xlabel(x_label, fontsize=AXES_FS, labelpad=10)
    ax.set_ylabel("Series", fontsize=AXES_FS, labelpad=10)
    ax.set_zlabel("Value", fontsize=AXES_FS, labelpad=8)
    ax.view_init(elev=elev, azim=azim)
    _apply_3d_style(ax)

    fig.suptitle(_wrap_title(title) or "Area chart (3D)", fontsize=TITLE_FS, y=0.97)
    fig.savefig(out_path, dpi=DPI, bbox_inches="tight", facecolor="white")
    plt.close(fig)


# ---------------------------------------------------------------------------
# Dispatch
# ---------------------------------------------------------------------------

_RENDERERS = {
    "treemap": _render_treemap_3d,
    "radar": _render_radar_3d,
    "bubble": _render_bubble_3d,
    "area_chart": _render_area_3d,
}


def render_3d(
    chart_type: str,
    data: dict[str, Any],
    out_path: Path,
    *,
    elev: int,
    azim: int,
    title: str = "",
) -> None:
    """Render a single 3D chart PNG.

    Raises ValueError on unsupported chart_type.
    """
    if chart_type not in _RENDERERS:
        raise ValueError(
            f"Unsupported chart_type {chart_type!r}; expected one of {sorted(_RENDERERS)}"
        )
    out_path.parent.mkdir(parents=True, exist_ok=True)
    _RENDERERS[chart_type](data, out_path, elev=elev, azim=azim, title=title)
