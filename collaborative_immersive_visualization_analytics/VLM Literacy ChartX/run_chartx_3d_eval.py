"""Evaluate GPT-5.4 on ChartX 3D-Bar images — original dataset images + QA pairs."""

import asyncio
import json
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "src"))
from dotenv import load_dotenv
load_dotenv()
from vlm_eval.models.clients import OpenAIVision

BASE = Path(__file__).parent / "data" / "chartx_raw"
IMG_BASE = BASE / "images" / "ChartX_png"


def load_3d_items():
    """Load 3D-Bar items from annotation files."""
    all_items = []
    for fname in [BASE / "ChartX_annotation_val.json", BASE / "ChartX_annotation_test.json"]:
        with open(fname) as f:
            data = json.load(f)
        for item in data:
            if item["chart_type"] == "3D-Bar":
                imgname = item["imgname"]
                img_path = IMG_BASE / "3D-Bar" / "png" / f"{imgname}.png"
                if img_path.exists():
                    all_items.append({
                        "chart_id": imgname,
                        "chart_type": "3D-Bar",
                        "image_path": str(img_path),
                        "question": item["QA"]["input"],
                        "expected_answer": item["QA"]["output"],
                    })
    return all_items


def score_response(raw: str, expected: str) -> bool:
    if not raw or not expected:
        return False
    raw_clean = raw.strip().lower()
    exp_clean = expected.strip().lower()
    raw_nums = re.findall(r"[-+]?\d+(?:,\d{3})*(?:\.\d+)?", raw.replace(",", ""))
    exp_nums = re.findall(r"[-+]?\d+(?:,\d{3})*(?:\.\d+)?", expected.replace(",", ""))
    if exp_nums:
        try:
            exp_val = float(exp_nums[0])
            if raw_nums:
                for rn in raw_nums:
                    pred_val = float(rn)
                    if exp_val == 0:
                        if pred_val == 0:
                            return True
                    elif abs(pred_val - exp_val) / max(abs(exp_val), 1e-9) <= 0.10:
                        return True
        except ValueError:
            pass
    if exp_clean in raw_clean:
        return True
    exp_stripped = re.sub(r"[\$%,]", "", exp_clean).strip()
    raw_stripped = re.sub(r"[\$%,]", "", raw_clean).strip()
    if exp_stripped and exp_stripped in raw_stripped:
        return True
    return False


async def evaluate_items(items: list[dict]) -> list[dict]:
    api_key = os.environ.get("OPENAI_API_KEY", "")
    model = OpenAIVision(model_id="gpt-5.4", api_key=api_key, temperature=0, max_tokens=200)
    semaphore = asyncio.Semaphore(5)
    results = []
    total = len(items)

    async def eval_one(item):
        async with semaphore:
            try:
                response = await model.query(Path(item["image_path"]), item["question"])
                correct = score_response(response.raw_response, item["expected_answer"])
                return {
                    "chart_id": item["chart_id"],
                    "chart_type": item["chart_type"],
                    "question": item["question"][:80],
                    "expected": item["expected_answer"],
                    "response": response.raw_response[:100],
                    "correct": correct,
                    "cost": response.cost_usd,
                }
            except Exception as e:
                return {
                    "chart_id": item["chart_id"],
                    "chart_type": item["chart_type"],
                    "question": item["question"][:80],
                    "expected": item["expected_answer"],
                    "response": f"ERROR: {e}",
                    "correct": False,
                    "cost": 0,
                }

    tasks = [eval_one(item) for item in items]
    for coro in asyncio.as_completed(tasks):
        result = await coro
        results.append(result)
        done = len(results)
        if done % 10 == 0 or done == total:
            print(f"  {done}/{total} completed...")

    return results


async def main():
    print("Loading ChartX 3D-Bar items...")
    items = load_3d_items()
    print(f"  Found {len(items)} 3D-Bar images with QA")

    # Run all 280
    print(f"\nEvaluating {len(items)} 3D-Bar images with GPT-5.4...")
    results = await evaluate_items(items)

    correct = sum(1 for r in results if r["correct"])
    total = len(results)
    cost = sum(r["cost"] for r in results)

    print(f"\n{'=' * 60}")
    print(f"  GPT-5.4 on ChartX — 2D vs 3D COMPARISON")
    print(f"{'=' * 60}")
    print(f"\n  {'Condition':<20} {'Accuracy':>10} {'Correct':>10} {'Total':>8} {'Cost':>8}")
    print(f"  {'─' * 58}")
    print(f"  {'2D (all types)':<20} {'86.5%':>10} {'147':>10} {'170':>8} {'$0.46':>8}")
    print(f"  {'2D bar_chart only':<20} {'90.0%':>10} {'9':>10} {'10':>8} {'—':>8}")
    print(f"  {'2D bar_chart_num':<20} {'100.0%':>10} {'10':>10} {'10':>8} {'—':>8}")
    print(f"  {'3D-Bar':<20} {correct/total:>9.1%} {correct:>10} {total:>8} {'${:.2f}'.format(cost):>8}")
    print(f"  {'─' * 58}")

    gap = correct/total - 0.865
    print(f"\n  3D-Bar vs 2D overall:     {gap:+.1%}")
    gap_bar = correct/total - 0.90
    print(f"  3D-Bar vs 2D bar_chart:   {gap_bar:+.1%}")
    gap_barnum = correct/total - 1.0
    print(f"  3D-Bar vs 2D bar_num:     {gap_barnum:+.1%}")

    print(f"\n{'=' * 60}")

    # Save CSV
    import csv
    csv_path = Path(__file__).parent / "results" / "scores" / "chartx_3d_bar_results.csv"
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    with open(csv_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=results[0].keys())
        writer.writeheader()
        writer.writerows(results)
    print(f"  Saved to: {csv_path}")


if __name__ == "__main__":
    asyncio.run(main())
