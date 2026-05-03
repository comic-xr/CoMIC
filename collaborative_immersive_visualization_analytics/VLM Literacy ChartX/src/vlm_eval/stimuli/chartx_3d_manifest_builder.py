"""Mass-render ChartX worst-4 items into 3D-single and 3D-multi PNG sets.

Reads the full output of ``chartx_local_loader.load_worst4_items`` and writes:

    data/chartx_3d_worst4/<chart_type>/<chart_id>.png       # single-angle
    data/chartx_3d_worst4/manifest.json
    data/chartx_3d_multiangle_worst4/<chart_type>/<chart_id>_a{000,090,180,270}.png
    data/chartx_3d_multiangle_worst4/manifest.json

Manifest schemas:

    single  -> {"condition": "3d_single",  "items": [{chart_id, chart_type, image_path,
                                                       question, expected_answer, ...}]}
    multi   -> {"condition": "3d_multi",   "items": [{chart_id, chart_type, image_paths: [...],
                                                       question, expected_answer, ...}]}

Run:
    PYTHONPATH=src uv run python -m vlm_eval.stimuli.chartx_3d_manifest_builder
"""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path
from typing import Any

from vlm_eval.stimuli.chartx_3d_renderers import (
    MULTI_ANGLES,
    SINGLE_ANGLE,
    render_3d,
)
from vlm_eval.stimuli.chartx_local_loader import load_worst4_items


def build_full_manifests(
    repo_root: Path,
    items: list[dict[str, Any]],
    *,
    skip_existing: bool = True,
    log_every: int = 25,
) -> tuple[Path, Path]:
    single_dir = repo_root / "data" / "chartx_3d_worst4"
    multi_dir = repo_root / "data" / "chartx_3d_multiangle_worst4"
    single_dir.mkdir(parents=True, exist_ok=True)
    multi_dir.mkdir(parents=True, exist_ok=True)

    single_manifest: list[dict[str, Any]] = []
    multi_manifest: list[dict[str, Any]] = []

    n = len(items)
    t0 = time.time()
    for idx, item in enumerate(items, start=1):
        ct = item["chart_type"]
        chart_id = str(item["chart_id"])
        title = item["title"]

        # --- single-angle ---
        single_path = single_dir / ct / f"{chart_id}.png"
        if not (skip_existing and single_path.exists()):
            try:
                render_3d(
                    ct,
                    item["data"],
                    single_path,
                    elev=SINGLE_ANGLE[0],
                    azim=SINGLE_ANGLE[1],
                    title=title,
                )
            except Exception as e:  # noqa: BLE001
                print(f"  ERROR single {ct}/{chart_id}: {e}")
                continue

        single_manifest.append(
            {
                "chart_id": chart_id,
                "chart_type": ct,
                "image_path": str(single_path.relative_to(repo_root)),
                "question": item["question"],
                "expected_answer": item["expected_answer"],
                "topic": item["topic"],
                "title": title,
            }
        )

        # --- multi-angle (4 PNGs) ---
        angle_paths: list[str] = []
        ok = True
        for elev, azim in MULTI_ANGLES:
            mp = multi_dir / ct / f"{chart_id}_a{azim:03d}.png"
            if not (skip_existing and mp.exists()):
                try:
                    render_3d(ct, item["data"], mp, elev=elev, azim=azim, title=title)
                except Exception as e:  # noqa: BLE001
                    print(f"  ERROR multi {ct}/{chart_id}@{azim}: {e}")
                    ok = False
                    break
            angle_paths.append(str(mp.relative_to(repo_root)))
        if not ok:
            continue

        multi_manifest.append(
            {
                "chart_id": chart_id,
                "chart_type": ct,
                "image_paths": angle_paths,
                "angles": [{"elev": e, "azim": a} for e, a in MULTI_ANGLES],
                "question": item["question"],
                "expected_answer": item["expected_answer"],
                "topic": item["topic"],
                "title": title,
            }
        )

        if idx % log_every == 0 or idx == n:
            elapsed = time.time() - t0
            rate = idx / elapsed if elapsed > 0 else 0
            eta = (n - idx) / rate if rate > 0 else 0
            print(
                f"  [{idx:4d}/{n}] {ct:11s} {chart_id:18s} | "
                f"elapsed={elapsed:5.0f}s rate={rate:4.1f}/s eta={eta:5.0f}s"
            )

    single_manifest_path = single_dir / "manifest.json"
    multi_manifest_path = multi_dir / "manifest.json"
    with open(single_manifest_path, "w") as f:
        json.dump({"condition": "3d_single", "items": single_manifest}, f, indent=2)
    with open(multi_manifest_path, "w") as f:
        json.dump({"condition": "3d_multi", "items": multi_manifest}, f, indent=2)

    return single_manifest_path, multi_manifest_path


def main() -> int:
    repo_root = Path(__file__).resolve().parents[3]
    chartx_dir = repo_root / "data" / "chartx_raw"
    print(f"Loading items from {chartx_dir}...")
    items = load_worst4_items(chartx_dir)
    print(f"Loaded {len(items)} items.")
    print("Rendering single + multi-angle PNGs (skipping existing files)...")
    s_path, m_path = build_full_manifests(repo_root, items)
    print(f"\nSingle-angle manifest: {s_path}")
    print(f"Multi-angle manifest:  {m_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
