"""Main evaluation pipeline orchestrator."""

from __future__ import annotations

import asyncio
import logging
from pathlib import Path

from tqdm import tqdm

from vlm_eval.config import PipelineConfig
from vlm_eval.models import VisionResponse, get_model
from vlm_eval.storage.store import ResultStore

logger = logging.getLogger(__name__)


def _parse_mc_letter(raw: str) -> str | None:
    """Extract a multiple-choice answer letter (A/B/C/D) from VLM output."""
    import re

    if not raw:
        return None
    raw = raw.strip()

    if raw.upper() in ("A", "B", "C", "D"):
        return raw.upper()

    m = re.search(r"(?:^|\b(?:answer|option)\s*[:=]?\s*)\(?([A-Da-d])\)?", raw, re.IGNORECASE)
    if m:
        return m.group(1).upper()

    m = re.match(r"\**\(?([A-Da-d])\)?\**[\.\)\s,:]", raw)
    if m:
        return m.group(1).upper()

    letters = re.findall(r"\b([A-Da-d])\b", raw)
    if letters:
        return letters[0].upper()

    return None


class EvalPipeline:
    """Orchestrates the full VLAT evaluation across models."""

    def __init__(self, config: PipelineConfig):
        self.config = config
        self.store = ResultStore(config.results_dir)

    async def _evaluate_item(
        self,
        model_name: str,
        provider: str,
        model_id: str,
        chart_id: str,
        image_path: str,
        task_type: str,
        question: str,
        expected_answer: str,
        chart_type: str,
        trial: int = 0,
        semaphore: asyncio.Semaphore | None = None,
    ) -> dict:
        """Evaluate a single VLAT item: query VLM, parse MC letter, score."""
        cache_key = f"{chart_id}_{task_type}"
        condition = "vlat"

        cached = self.store.check_cached(model_name, cache_key, trial, condition)
        if cached:
            return cached

        api_key = self.config.get_api_key(provider)
        model = get_model(
            provider=provider,
            model_id=model_id,
            api_key=api_key,
            temperature=0,
            max_tokens=self.config.models[0].max_tokens if self.config.models else 200,
        )

        async def _query():
            if semaphore:
                async with semaphore:
                    return await model.query(Path(image_path), question)
            return await model.query(Path(image_path), question)

        try:
            response: VisionResponse = await _query()
        except Exception as e:
            logger.error(f"Error querying {model_name} for {chart_id}: {e}")
            result = {
                "model_name": model_name,
                "chart_id": chart_id,
                "chart_type": chart_type,
                "task_type": task_type,
                "question": question,
                "expected_answer": str(expected_answer),
                "raw_response": f"ERROR: {e}",
                "parsed_answer": None,
                "correct": False,
                "score_method": "error",
                "latency_ms": 0,
                "input_tokens": 0,
                "output_tokens": 0,
                "cost_usd": 0,
                "trial": trial,
                "condition": condition,
            }
            self.store.save_response(model_name, cache_key, result, trial, condition)
            return result

        # VLAT: multiple-choice — extract the answer letter
        parsed = _parse_mc_letter(response.raw_response)
        correct = parsed is not None and parsed.upper() == str(expected_answer).upper()

        result = {
            "model_name": model_name,
            "chart_id": chart_id,
            "chart_type": chart_type,
            "task_type": task_type,
            "question": question,
            "expected_answer": str(expected_answer),
            "raw_response": response.raw_response,
            "parsed_answer": parsed,
            "correct": correct,
            "score_method": "multiple_choice",
            "latency_ms": response.latency_ms,
            "input_tokens": response.input_tokens,
            "output_tokens": response.output_tokens,
            "cost_usd": response.cost_usd,
            "trial": trial,
            "condition": condition,
        }

        self.store.save_response(model_name, cache_key, result, trial, condition)
        return result

    async def _run_model(self, model_cfg, benchmark_items: list[dict]) -> list[dict]:
        """Run a single model on all benchmark items."""
        semaphore = asyncio.Semaphore(self.config.concurrency_limit)
        results = []

        tasks = []
        for item in benchmark_items:
            for trial in range(self.config.n_trials):
                tasks.append(
                    self._evaluate_item(
                        model_name=model_cfg.name,
                        provider=model_cfg.provider,
                        model_id=model_cfg.model_id,
                        chart_id=item["chart_id"],
                        image_path=item["image_path"],
                        task_type=item["task_type"],
                        question=item["question"],
                        expected_answer=item["expected_answer"],
                        chart_type=item["chart_type"],
                        trial=trial,
                        semaphore=semaphore,
                    )
                )

        pbar = tqdm(total=len(tasks), desc=f"  {model_cfg.name}", leave=True)
        for coro in asyncio.as_completed(tasks):
            result = await coro
            results.append(result)
            pbar.update(1)
        pbar.close()

        return results

    def _load_benchmark_items(self) -> list[dict]:
        """Load VLAT benchmark items."""
        from vlm_eval.stimuli.vlat_loader import load_vlat_items
        return load_vlat_items(self.config.vlat_dir)

    async def run(self) -> None:
        """Run the full evaluation pipeline."""
        import pandas as pd

        from vlm_eval.evaluation.metrics import (
            compute_accuracy_by_group,
            compute_cost_metrics,
            generate_summary_table,
        )

        logger.info("Loading benchmark items...")
        benchmark_items = self._load_benchmark_items()
        logger.info(f"Loaded {len(benchmark_items)} evaluation items")

        all_results = []
        for model_cfg in self.config.models:
            logger.info(f"Evaluating {model_cfg.name}...")
            results = await self._run_model(model_cfg, benchmark_items)
            all_results.extend(results)

        df = pd.DataFrame(all_results)
        self.store.save_results_df(df, filename="all_results_vlat.csv")
        logger.info(f"Saved {len(df)} results to CSV")

        if not df.empty and "correct" in df.columns:
            print("\n=== VLAT Results Summary ===\n")

            summary = generate_summary_table(df)
            print(summary.to_string(index=False))
            summary.to_csv(
                self.config.results_dir / "scores" / "summary_vlat.csv",
                index=False,
            )

            print("\n--- Accuracy by Model ---")
            print(compute_accuracy_by_group(df, "model_name").to_string(index=False))

            print("\n--- Accuracy by Chart Type ---")
            print(compute_accuracy_by_group(df, "chart_type").to_string(index=False))

            print("\n--- Accuracy by Task Type ---")
            print(compute_accuracy_by_group(df, "task_type").to_string(index=False))

            print("\n--- Cost Metrics ---")
            print(compute_cost_metrics(df).to_string(index=False))
