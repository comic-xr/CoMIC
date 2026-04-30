"""VLAT (Visualization Literacy Assessment Test) dataset loader.

Loads the 12 chart images and 53 multiple-choice questions from the VLAT
dataset (Lee, Kim & Kwon, IEEE TVCG 2017).  Data is stored locally in
``data/vlat/`` with a pre-built ``manifest.json``.
"""

from __future__ import annotations

import json
from pathlib import Path


def load_vlat_items(vlat_dir: Path) -> list[dict]:
    """Load VLAT benchmark items from the manifest.

    Parameters
    ----------
    vlat_dir:
        Path to the ``data/vlat/`` directory containing ``manifest.json``
        and ``images/``.

    Returns
    -------
    list[dict]
        One dict per question with keys: ``chart_id``, ``chart_type``,
        ``image_path``, ``task_type``, ``question``, ``expected_answer``,
        ``options``.
    """
    manifest_path = vlat_dir / "manifest.json"
    if not manifest_path.exists():
        raise FileNotFoundError(
            f"VLAT manifest not found at {manifest_path}. "
            "Run the VLAT download script first."
        )

    with open(manifest_path) as f:
        manifest = json.load(f)

    items = []
    for entry in manifest["items"]:
        # Build the multiple-choice prompt
        opts = entry["options"]
        options_text = "\n".join(
            f"{letter}) {opts[letter]}" for letter in ("A", "B", "C", "D")
        )
        prompt = (
            f"{entry['question']}\n\n"
            f"{options_text}\n\n"
            f"Answer with ONLY the letter (A, B, C, or D)."
        )

        image_path = str(vlat_dir.parent.parent / entry["image_path"])

        items.append({
            "chart_id": entry["id"],
            "chart_type": entry["chart_type"],
            "image_path": image_path,
            "task_type": entry["task_type"],
            "question": prompt,
            "expected_answer": entry["correct_answer_letter"],
            "options": opts,
        })

    return items
