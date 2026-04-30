"""Continue ChartX 2D evaluation — retry ERROR items via OpenRouter GPT-5.4."""

import asyncio
import csv
import json
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "src"))
from dotenv import load_dotenv
load_dotenv()
from vlm_eval.models.clients import OpenRouterVision

BASE = Path(__file__).parent / "data" / "chartx_raw"
IMG_BASE = BASE / "images" / "ChartX_png"
RESULTS_CSV = Path(__file__).parent / "results" / "scores" / "chartx_2d_results.csv"


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


def load_error_items():
    """Load items that had ERROR responses from previous run."""
    # Load annotations to get questions
    annotations = {}
    for fname in [BASE / "ChartX_annotation_val.json", BASE / "ChartX_annotation_test.json"]:
        with open(fname) as f:
            for item in json.load(f):
                annotations[item["imgname"]] = item

    # Read CSV and find ERROR rows
    error_items = []
    with open(RESULTS_CSV) as f:
        for row in csv.DictReader(f):
            if row["response"].startswith("ERROR"):
                chart_id = row["chart_id"]
                chart_type = row["chart_type"]
                ann = annotations.get(chart_id)
                if ann:
                    img_path = IMG_BASE / chart_type / "png" / f"{chart_id}.png"
                    if img_path.exists():
                        error_items.append({
                            "chart_id": chart_id,
                            "chart_type": chart_type,
                            "image_path": str(img_path),
                            "question": ann["QA"]["input"],
                            "expected_answer": ann["QA"]["output"],
                        })
    return error_items


async def evaluate_items(items):
    api_key = os.environ.get("OPENROUTER_API_KEY", "")
    model = OpenRouterVision(
        model_id="openai/gpt-5.4",
        api_key=api_key,
        temperature=0,
        max_tokens=200,
    )
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
                    "correct": str(correct),
                    "cost": str(response.cost_usd),
                }
            except Exception as e:
                return {
                    "chart_id": item["chart_id"],
                    "chart_type": item["chart_type"],
                    "question": item["question"][:60],
                    "expected": item["expected_answer"],
                    "response": f"ERROR: {e}",
                    "correct": "False",
                    "cost": "0",
                }

    tasks = [eval_one(item) for item in items]
    for coro in asyncio.as_completed(tasks):
        result = await coro
        results.append(result)
        done = len(results)
        if done % 50 == 0 or done == total:
            print(f"  {done}/{total} completed...")

    return results


def combine_and_report(new_results):
    """Combine new results with existing good results and print final report."""
    from collections import defaultdict

    # Load original CSV — keep good rows, replace errors
    all_rows = []
    error_ids = set()
    with open(RESULTS_CSV) as f:
        for row in csv.DictReader(f):
            if row["response"].startswith("ERROR"):
                error_ids.add(row["chart_id"])
            else:
                all_rows.append(row)

    # Add new results
    new_errors = 0
    for r in new_results:
        if r["response"].startswith("ERROR"):
            new_errors += 1
        all_rows.append(r)

    # Save combined CSV
    combined_csv = RESULTS_CSV.parent / "chartx_2d_results_full.csv"
    with open(combined_csv, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=all_rows[0].keys())
        writer.writeheader()
        writer.writerows(all_rows)

    # Filter to real responses only
    real = [r for r in all_rows if not r["response"].startswith("ERROR")]
    total_correct = sum(1 for r in real if r["correct"] == "True")
    total = len(real)

    by_type = defaultdict(list)
    for r in real:
        by_type[r["chart_type"]].append(r)

    print(f"\n{'=' * 70}")
    print(f"  GPT-5.4 on ChartX 2D — FULL COMBINED RESULTS")
    print(f"  {total} successful evaluations (out of 5,720)")
    print(f"{'=' * 70}")
    print(f"\n  Overall: {total_correct}/{total} = {total_correct/total:.1%}")
    print(f"\n  {'Chart Type':<20} {'Correct':>8} {'Total':>7} {'Accuracy':>10}")
    print(f"  {'─' * 48}")

    sorted_types = sorted(by_type.items(), key=lambda x: -sum(1 for r in x[1] if r['correct']=='True')/len(x[1]))
    for ct, items in sorted_types:
        correct = sum(1 for r in items if r['correct'] == 'True')
        t = len(items)
        acc = correct / t if t > 0 else 0
        bar = '█' * int(acc * 20) + '░' * (20 - int(acc * 20))
        print(f"  {ct:<20} {correct:>5}/{t:<5} {acc:>9.1%}  {bar}")

    print(f"  {'─' * 48}")
    print(f"  {'OVERALL':<20} {total_correct:>5}/{total:<5} {total_correct/total:>9.1%}")
    print(f"{'=' * 70}")

    if new_errors > 0:
        print(f"\n  Warning: {new_errors} items still failed in retry")
    print(f"  Saved to: {combined_csv}")


async def main():
    print("Loading ERROR items from previous run...")
    error_items = load_error_items()
    print(f"  {len(error_items)} items to retry via OpenRouter")

    print(f"\nEvaluating with GPT-5.4 via OpenRouter...")
    new_results = await evaluate_items(error_items)

    combine_and_report(new_results)


if __name__ == "__main__":
    asyncio.run(main())
