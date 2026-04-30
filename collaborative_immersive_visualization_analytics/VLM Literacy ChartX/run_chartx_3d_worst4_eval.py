"""Evaluate GPT-5.4 on 3D single-angle renders of the worst-4 ChartX types.

Reads data/chartx_3d_worst4/manifest.json, runs each (image, question)
through the OpenAI client, scores with chartx_scorer.score_response,
and writes results/scores/chartx_3d_worst4_results.csv plus per-item JSON
into results/responses/gpt-5.4_chartx_3d_single_worst4_v1/.

Run:
    PYTHONPATH=src uv run python run_chartx_3d_worst4_eval.py [--smoke]
"""

from __future__ import annotations

import argparse
import asyncio
import csv
import json
import os
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).parent / "src"))

from dotenv import load_dotenv

load_dotenv()

from vlm_eval.evaluation.chartx_scorer import score_response  # noqa: E402
from vlm_eval.models.clients import OpenRouterVision  # noqa: E402
from vlm_eval.models.openrouter_helpers import get_remaining_credits  # noqa: E402

REPO = Path(__file__).parent
MANIFEST = REPO / "data" / "chartx_3d_worst4" / "manifest.json"
RESPONSES_DIR = REPO / "results" / "responses" / "gpt-5.4_chartx_3d_single_worst4_v1"
CSV_PATH = REPO / "results" / "scores" / "chartx_3d_worst4_results.csv"
CONCURRENCY = 5
MODEL_ID = "openai/gpt-5.4"
MAX_TOKENS = 200
MIN_CREDITS_USD = 0.05  # run until OpenRouter returns 402; do not pre-block


def load_manifest_items() -> list[dict[str, Any]]:
    with open(MANIFEST) as f:
        manifest = json.load(f)
    return manifest["items"]


def cached_response_path(chart_id: str, chart_type: str) -> Path:
    safe = f"{chart_type}_{chart_id}".replace("/", "_")
    return RESPONSES_DIR / f"{safe}_trial0.json"


def load_cached(chart_id: str, chart_type: str) -> dict[str, Any] | None:
    p = cached_response_path(chart_id, chart_type)
    if p.exists():
        with open(p) as f:
            return json.load(f)
    return None


def save_cached(chart_id: str, chart_type: str, payload: dict[str, Any]) -> None:
    p = cached_response_path(chart_id, chart_type)
    p.parent.mkdir(parents=True, exist_ok=True)
    with open(p, "w") as f:
        json.dump(payload, f, indent=2, default=str)


async def evaluate_items(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    api_key = os.environ.get("OPENROUTER_API_KEY", "")
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY is not set in the environment.")
    model = OpenRouterVision(model_id=MODEL_ID, api_key=api_key, temperature=0, max_tokens=MAX_TOKENS)
    sem = asyncio.Semaphore(CONCURRENCY)
    results: list[dict[str, Any]] = []
    total = len(items)

    async def eval_one(item: dict[str, Any]) -> dict[str, Any]:
        chart_id = str(item["chart_id"])
        chart_type = item["chart_type"]
        cached = load_cached(chart_id, chart_type)
        if cached is not None:
            return cached

        async with sem:
            image_path = REPO / item["image_path"]
            try:
                response = await model.query(image_path, item["question"])
                correct = score_response(response.raw_response, item["expected_answer"])
                row = {
                    "chart_id": chart_id,
                    "chart_type": chart_type,
                    "question": item["question"],
                    "expected": item["expected_answer"],
                    "response": response.raw_response,
                    "correct": correct,
                    "cost": response.cost_usd,
                    "input_tokens": response.input_tokens,
                    "output_tokens": response.output_tokens,
                    "latency_ms": response.latency_ms,
                }
            except Exception as e:  # noqa: BLE001
                row = {
                    "chart_id": chart_id,
                    "chart_type": chart_type,
                    "question": item["question"],
                    "expected": item["expected_answer"],
                    "response": f"ERROR: {e}",
                    "correct": False,
                    "cost": 0.0,
                    "input_tokens": 0,
                    "output_tokens": 0,
                    "latency_ms": 0.0,
                }
            save_cached(chart_id, chart_type, row)
            return row

    tasks = [eval_one(it) for it in items]
    for coro in asyncio.as_completed(tasks):
        r = await coro
        results.append(r)
        if len(results) % 20 == 0 or len(results) == total:
            cost_so_far = sum(x.get("cost", 0.0) for x in results)
            print(f"  {len(results):4d}/{total}  cost=${cost_so_far:.2f}")
    return results


def write_csv(results: list[dict[str, Any]]) -> None:
    CSV_PATH.parent.mkdir(parents=True, exist_ok=True)
    cols = [
        "chart_id",
        "chart_type",
        "question",
        "expected",
        "response",
        "correct",
        "cost",
        "input_tokens",
        "output_tokens",
        "latency_ms",
    ]
    with open(CSV_PATH, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        for r in results:
            w.writerow({k: r.get(k, "") for k in cols})


def summarize(results: list[dict[str, Any]]) -> None:
    from collections import defaultdict

    by_type: dict[str, list[bool]] = defaultdict(list)
    for r in results:
        by_type[r["chart_type"]].append(bool(r["correct"]))

    total_cost = sum(r.get("cost", 0.0) for r in results)
    print(f"\n{'='*60}")
    print(f"  GPT-5.4 on ChartX 3D-Single Worst-4 (per chart type)")
    print(f"{'='*60}")
    print(f"  {'Chart Type':<14} {'Acc':>7}  {'Correct':>10}")
    print(f"  {'-'*40}")
    for ct in sorted(by_type):
        cs = by_type[ct]
        acc = sum(cs) / len(cs)
        print(f"  {ct:<14} {acc:>6.1%}  {sum(cs):>4d}/{len(cs):<4d}")
    print(f"  {'-'*40}")
    print(f"  Cost: ${total_cost:.2f}")
    print(f"{'='*60}")
    print(f"  CSV:        {CSV_PATH}")
    print(f"  Cache:      {RESPONSES_DIR}")


async def main_async(smoke: bool) -> None:
    # Pre-flight: confirm OpenRouter has enough credit before spending any.
    try:
        remaining = get_remaining_credits()
    except Exception as e:  # noqa: BLE001
        print(f"WARN: could not check OpenRouter credits ({e}); proceeding anyway.")
        remaining = float("inf")
    print(f"OpenRouter remaining credit: ${remaining:.2f}")
    threshold = 0.10 if smoke else MIN_CREDITS_USD
    if remaining < threshold:
        raise RuntimeError(
            f"Insufficient credits: ${remaining:.2f} < ${threshold:.2f}. Top up at openrouter.ai."
        )

    items = load_manifest_items()
    if smoke:
        # 1 per chart_type for the API smoke test
        seen: set[str] = set()
        sample: list[dict[str, Any]] = []
        for it in items:
            if it["chart_type"] not in seen:
                seen.add(it["chart_type"])
                sample.append(it)
        items = sample
        print(f"SMOKE: {len(items)} items (1 per type)")
    else:
        print(f"Full run: {len(items)} items")

    results = await evaluate_items(items)
    write_csv(results)
    summarize(results)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--smoke", action="store_true", help="Run on 1 chart per type only")
    args = parser.parse_args()
    asyncio.run(main_async(args.smoke))


if __name__ == "__main__":
    main()
