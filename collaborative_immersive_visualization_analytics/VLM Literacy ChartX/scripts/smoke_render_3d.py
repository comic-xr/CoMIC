"""Smoke test: render 1 chart per worst-4 type in single + multi-angle conditions.

Outputs go to data/chartx_3d_smoke/. User reviews these before mass rendering.

Run:
    PYTHONPATH=src uv run python scripts/smoke_render_3d.py
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from vlm_eval.stimuli.chartx_3d_renderers import (
    MULTI_ANGLES,
    SINGLE_ANGLE,
    render_3d,
)
from vlm_eval.stimuli.chartx_local_loader import TARGET_TYPES, load_worst4_items


def main() -> None:
    repo_root = Path(__file__).parent.parent
    out_root = repo_root / "data" / "chartx_3d_smoke"
    chartx_dir = repo_root / "data" / "chartx_raw"

    items = load_worst4_items(chartx_dir)

    # Pick first item per type (deterministic — list is sorted by chart_type, chart_id)
    picked: dict[str, dict] = {}
    for it in items:
        ct = it["chart_type"]
        if ct in TARGET_TYPES and ct not in picked:
            picked[ct] = it
        if len(picked) == len(TARGET_TYPES):
            break

    rendered_paths: list[Path] = []
    for ct in sorted(TARGET_TYPES):
        item = picked[ct]
        chart_id = str(item["chart_id"])
        # Single-angle
        single_path = out_root / "single" / ct / f"{chart_id}.png"
        elev_s, azim_s = SINGLE_ANGLE
        render_3d(
            ct,
            item["data"],
            single_path,
            elev=elev_s,
            azim=azim_s,
            title=item["title"],
        )
        rendered_paths.append(single_path)
        print(f"  [single] {ct}/{chart_id} -> {single_path}")

        # Multi-angle (4 PNGs)
        for elev, azim in MULTI_ANGLES:
            multi_path = out_root / "multi" / ct / f"{chart_id}_a{azim:03d}.png"
            render_3d(
                ct,
                item["data"],
                multi_path,
                elev=elev,
                azim=azim,
                title=item["title"],
            )
            rendered_paths.append(multi_path)
            print(f"  [multi]  {ct}/{chart_id} azim={azim:3d} -> {multi_path}")

    print(f"\nRendered {len(rendered_paths)} smoke PNGs to {out_root}")
    print("Inspect them visually before mass rendering.")


if __name__ == "__main__":
    main()
