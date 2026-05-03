"""CLI entry point for the VLM evaluation pipeline."""

from __future__ import annotations

import argparse
import asyncio
import logging
import sys
from pathlib import Path


def cmd_generate(args):
    """Download/prepare VLAT benchmark data."""
    from vlm_eval.config import load_config

    config = load_config(Path(args.config) if args.config else None)

    vlat_manifest = config.vlat_dir / "manifest.json"
    if vlat_manifest.exists():
        import json
        with open(vlat_manifest) as f:
            manifest = json.load(f)
        print(f"VLAT dataset ready: {manifest['total_items']} items, "
              f"12 chart images in {config.vlat_dir / 'images'}")
    else:
        print("VLAT dataset not found. Downloading from HuggingFace...")
        _download_vlat(config.vlat_dir)
        print("VLAT dataset downloaded successfully.")


def _download_vlat(vlat_dir: Path):
    """Download VLAT dataset from HuggingFace."""
    import json
    import os

    from datasets import load_dataset

    vlat_dir.mkdir(parents=True, exist_ok=True)
    (vlat_dir / "images").mkdir(exist_ok=True)

    ds = load_dataset("joaompalmeiro/VLATDataset", split="test")

    meta_path = vlat_dir / "vlat_metadata.json"
    if not meta_path.exists():
        import urllib.request
        urllib.request.urlretrieve(
            "https://raw.githubusercontent.com/washuvis/VisLit-VLM-Eval/main/data/VLAT/vlat_skip.json",
            str(meta_path),
        )
    with open(meta_path) as f:
        meta = json.load(f)
    meta_by_id = {q["id"]: q for q in meta["questions"]}

    saved_images = {}
    vlat_items = []

    for item in ds:
        qid = item["id"]
        qnum = int(qid[1:])
        meta_item = meta_by_id[qnum]
        img_filename = os.path.basename(meta_item["image_path"])
        img_path = f"data/vlat/images/{img_filename}"

        if img_filename not in saved_images:
            item["image"].save(str(vlat_dir / "images" / img_filename))
            saved_images[img_filename] = img_path

        vlat_items.append({
            "id": qid,
            "question_number": qnum,
            "chart_type": meta_item["Chart_type"],
            "task_type": meta_item["Task"],
            "image_file": img_filename,
            "image_path": img_path,
            "question": item["question"],
            "options": item["options"],
            "correct_answer_letter": item["answer"],
            "correct_answer_text": meta_item["correct_answer"],
        })

    manifest = {"dataset": "VLAT", "total_items": len(vlat_items), "items": vlat_items}
    with open(vlat_dir / "manifest.json", "w") as f:
        json.dump(manifest, f, indent=2)


def cmd_evaluate(args):
    """Run VLM evaluation on VLAT benchmark."""
    from vlm_eval.config import load_config
    from vlm_eval.pipeline import EvalPipeline

    config = load_config(Path(args.config) if args.config else None)
    config.condition = "vlat"

    if args.models:
        model_names = set(args.models.split(","))
        config.models = [m for m in config.models if m.name in model_names]

    if not config.models:
        print("Error: No models configured. Check configs/default.yaml or --models flag.")
        sys.exit(1)

    print(f"Running VLAT evaluation with models: {[m.name for m in config.models]}")
    pipeline = EvalPipeline(config)
    asyncio.run(pipeline.run())


def cmd_report(args):
    """Generate result figures and tables."""
    from vlm_eval.config import load_config
    from vlm_eval.visualization import generate_all_figures

    config = load_config(Path(args.config) if args.config else None)
    generate_all_figures(config)


def main():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    parser = argparse.ArgumentParser(
        prog="vlm-eval",
        description="VLM Evaluation Pipeline — VLAT Benchmark",
    )
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Generate
    gen_parser = subparsers.add_parser("generate", help="Download/verify VLAT benchmark data")
    gen_parser.add_argument("--config", help="Path to config YAML")

    # Evaluate
    eval_parser = subparsers.add_parser("evaluate", help="Run VLM evaluation on VLAT")
    eval_parser.add_argument("--models", help="Comma-separated model names to evaluate")
    eval_parser.add_argument("--config", help="Path to config YAML")

    # Report
    report_parser = subparsers.add_parser("report", help="Generate figures and tables")
    report_parser.add_argument("--config", help="Path to config YAML")

    args = parser.parse_args()

    if args.command == "generate":
        cmd_generate(args)
    elif args.command == "evaluate":
        cmd_evaluate(args)
    elif args.command == "report":
        cmd_report(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
