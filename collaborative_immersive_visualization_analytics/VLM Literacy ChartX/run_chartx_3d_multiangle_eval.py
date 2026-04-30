"""Evaluate GPT-5.4 on 3D MULTI-angle renders of the worst-4 ChartX types.

Sends 4 images (azim 0/90/180/270, all elev=25) in a SINGLE GPT-5.4 call
with a system prompt explaining that the four images depict the same chart
from four different sides.

Run:
    PYTHONPATH=src uv run python run_chartx_3d_multiangle_eval.py [--smoke]
"""

from __future__ import annotations

import argparse
import asyncio
import csv
import json
import os
import sys
import time
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).parent / "src"))

import openai
from dotenv import load_dotenv

load_dotenv()

from vlm_eval.evaluation.chartx_scorer import score_response  # noqa: E402
from vlm_eval.models.clients import OPENROUTER_PRICING, _compute_cost  # noqa: E402
from vlm_eval.models.openrouter_helpers import (  # noqa: E402
    PROVIDER_PIN_OPENAI,
    call_with_smart_retry,
    get_remaining_credits,
    make_async_client,
)

REPO = Path(__file__).parent
MANIFEST = REPO / "data" / "chartx_3d_multiangle_worst4" / "manifest.json"
RESPONSES_DIR = REPO / "results" / "responses" / "gpt-5.4_chartx_3d_multi_worst4_v1"
CSV_PATH = REPO / "results" / "scores" / "chartx_3d_multiangle_worst4_results.csv"
CONCURRENCY = 5
MODEL_ID = "openai/gpt-5.4"
MAX_TOKENS = 200
MIN_CREDITS_USD = 0.05  # run until OpenRouter returns 402; do not pre-block

SYSTEM_PROMPT = (
    "You are an expert at reading data visualizations. The user message contains "
    "FOUR images of the SAME 3D chart photographed from four different camera "
    "angles around a single vertical axis (azimuth 0°, 90°, 180°, 270°, all at "
    "the same elevation). Use information from ALL FOUR views together to answer "
    "the question. Bars, labels, or values occluded in one view are usually "
    "visible in another view. Read tick labels and value labels carefully and "
    "answer concisely."
)


def encode_image_b64(p: Path) -> str:
    import base64

    return base64.b64encode(p.read_bytes()).decode("ascii")


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


def build_messages(item: dict[str, Any]) -> list[dict[str, Any]]:
    user_text = (
        f"The four images below show the same 3D {item['chart_type']} from four "
        f"different sides (azimuth 0°, 90°, 180°, 270° at the same elevation).\n\n"
        f"Question: {item['question']}\n\n"
        f"Answer concisely."
    )
    content: list[dict[str, Any]] = [{"type": "text", "text": user_text}]
    for rel_path in item["image_paths"]:
        p = REPO / rel_path
        b64 = encode_image_b64(p)
        content.append(
            {
                "type": "image_url",
                "image_url": {"url": f"data:image/png;base64,{b64}"},
            }
        )
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": content},
    ]


async def evaluate_items(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    client = make_async_client()
    sem = asyncio.Semaphore(CONCURRENCY)
    results: list[dict[str, Any]] = []
    total = len(items)
    first_model_seen: dict[str, str] = {}

    async def eval_one(item: dict[str, Any]) -> dict[str, Any]:
        chart_id = str(item["chart_id"])
        chart_type = item["chart_type"]
        cached = load_cached(chart_id, chart_type)
        if cached is not None:
            return cached

        async with sem:
            try:
                messages = build_messages(item)

                async def _call() -> openai.types.chat.ChatCompletion:
                    return await asyncio.wait_for(
                        client.chat.completions.create(
                            model=MODEL_ID,
                            messages=messages,
                            temperature=0,
                            max_tokens=MAX_TOKENS,
                            extra_body={"provider": PROVIDER_PIN_OPENAI},
                        ),
                        timeout=180.0,
                    )

                t0 = time.perf_counter()
                response = await call_with_smart_retry(_call)
                latency_ms = (time.perf_counter() - t0) * 1000

                # Detect mid-batch model drift; abort if alias re-routes
                served_model = getattr(response, "model", "") or ""
                if "served" not in first_model_seen:
                    first_model_seen["served"] = served_model
                elif served_model and served_model != first_model_seen["served"]:
                    raise RuntimeError(
                        f"Model drifted mid-batch: first={first_model_seen['served']!r} "
                        f"now={served_model!r}"
                    )

                raw_text = response.choices[0].message.content or ""
                input_tokens = response.usage.prompt_tokens if response.usage else 0
                output_tokens = response.usage.completion_tokens if response.usage else 0
                # Prefer authoritative cost reported by OpenRouter
                cost = float(getattr(response.usage, "cost", 0.0) or 0.0)
                if cost == 0.0:
                    cost = _compute_cost(OPENROUTER_PRICING, MODEL_ID, input_tokens, output_tokens)
                correct = score_response(raw_text, item["expected_answer"])

                row = {
                    "chart_id": chart_id,
                    "chart_type": chart_type,
                    "question": item["question"],
                    "expected": item["expected_answer"],
                    "response": raw_text,
                    "correct": correct,
                    "cost": cost,
                    "input_tokens": input_tokens,
                    "output_tokens": output_tokens,
                    "latency_ms": latency_ms,
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
    print(f"  GPT-5.4 on ChartX 3D-MULTI-angle Worst-4 (per chart type)")
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
