"""Evaluate GPT-5.4 on ChartX 2D images — original dataset images + QA pairs.

Runs 10 samples per chart type across all 17 2D types.
"""

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
N_PER_TYPE = 9999  # All available


def load_2d_items():
    """Load 2D items from annotation files, match with images."""
    all_items = []
    for fname in [BASE / "ChartX_annotation_val.json", BASE / "ChartX_annotation_test.json"]:
        with open(fname) as f:
            data = json.load(f)
        for item in data:
            all_items.append(item)

    # Group by chart type, exclude 3D
    from collections import defaultdict
    by_type = defaultdict(list)
    for item in all_items:
        ct = item["chart_type"]
        if ct == "3D-Bar":
            continue

        # Resolve image path
        folder = ct
        imgname = item["imgname"]
        # Images are in png/ subfolder
        img_path = IMG_BASE / folder / "png" / f"{imgname}.png"
        if not img_path.exists():
            img_path = IMG_BASE / folder / f"{imgname}.png"
        if not img_path.exists():
            continue

        by_type[ct].append({
            "chart_id": imgname,
            "chart_type": ct,
            "image_path": str(img_path),
            "question": item["QA"]["input"],
            "expected_answer": item["QA"]["output"],
            "topic": item.get("topic", ""),
            "title": item.get("title", ""),
        })

    return by_type


def score_response(raw: str, expected: str) -> bool:
    """Score VLM response against ground truth."""
    if not raw or not expected:
        return False

    raw_clean = raw.strip().lower()
    exp_clean = expected.strip().lower()

    # Remove common prefixes like $, units
    raw_nums = re.findall(r"[-+]?\d+(?:,\d{3})*(?:\.\d+)?", raw.replace(",", ""))
    exp_nums = re.findall(r"[-+]?\d+(?:,\d{3})*(?:\.\d+)?", expected.replace(",", ""))

    # Try numeric comparison first
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

    # Try exact/keyword match
    if exp_clean in raw_clean:
        return True

    # Try removing $ and % for matching
    exp_stripped = re.sub(r"[\$%,]", "", exp_clean).strip()
    raw_stripped = re.sub(r"[\$%,]", "", raw_clean).strip()
    if exp_stripped and exp_stripped in raw_stripped:
        return True

    return False


async def evaluate_items(items: list[dict]) -> list[dict]:
    """Evaluate items with GPT-5.4."""
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
                    "question": item["question"][:60],
                    "expected": item["expected_answer"],
                    "response": response.raw_response[:80],
                    "correct": correct,
                    "cost": response.cost_usd,
                }
            except Exception as e:
                return {
                    "chart_id": item["chart_id"],
                    "chart_type": item["chart_type"],
                    "question": item["question"][:60],
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
        status = "OK" if result["correct"] else "WRONG"
        if done % 10 == 0 or done == total:
            print(f"  {done}/{total} completed...")

    return results


def print_results(results: list[dict]):
    """Print clean results table."""
    from collections import defaultdict

    by_type = defaultdict(list)
    for r in results:
        by_type[r["chart_type"]].append(r)

    total_correct = sum(1 for r in results if r["correct"])
    total = len(results)
    total_cost = sum(r["cost"] for r in results)

    print(f"\n{'=' * 70}")
    print(f"  GPT-5.4 on ChartX 2D — RESULTS ({N_PER_TYPE} per type)")
    print(f"{'=' * 70}")
    print(f"\n  Overall: {total_correct}/{total} = {total_correct/total:.1%}  |  Cost: ${total_cost:.2f}")
    print(f"\n  {'Chart Type':<20} {'Correct':>8} {'Total':>7} {'Accuracy':>10}")
    print(f"  {'─' * 48}")

    sorted_types = sorted(by_type.items(), key=lambda x: -sum(1 for r in x[1] if r["correct"]) / len(x[1]))
    for ct, items in sorted_types:
        correct = sum(1 for r in items if r["correct"])
        total_ct = len(items)
        acc = correct / total_ct if total_ct > 0 else 0
        bar = "█" * int(acc * 20) + "░" * (20 - int(acc * 20))
        print(f"  {ct:<20} {correct:>5}/{total_ct:<5} {acc:>9.1%}  {bar}")

    print(f"  {'─' * 48}")
    print(f"  {'OVERALL':<20} {total_correct:>5}/{total:<5} {total_correct/total:>9.1%}")
    print(f"{'=' * 70}")

    # Save CSV
    import csv
    csv_path = Path(__file__).parent / "results" / "scores" / "chartx_2d_results.csv"
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    with open(csv_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=results[0].keys())
        writer.writeheader()
        writer.writerows(results)
    print(f"\n  Saved to: {csv_path}")


async def main():
    print("Loading ChartX 2D items...")
    by_type = load_2d_items()

    print(f"  Found {len(by_type)} 2D chart types")
    all_items = []
    for ct, items in sorted(by_type.items()):
        sample = items[:N_PER_TYPE]
        all_items.extend(sample)
        print(f"    {ct}: {len(items)} available, using {len(sample)}")

    print(f"\n  Total items to evaluate: {len(all_items)}")
    print(f"\nEvaluating with GPT-5.4...")

    results = await evaluate_items(all_items)
    print_results(results)


if __name__ == "__main__":
    asyncio.run(main())
