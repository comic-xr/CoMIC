"""Evaluation scoring and metric aggregation utilities."""

from vlm_eval.evaluation.metrics import (
    compute_accuracy_by_group,
    compute_cost_metrics,
    generate_summary_table,
)
from vlm_eval.evaluation.scorer import score_item

__all__ = [
    "score_item",
    "compute_accuracy_by_group",
    "compute_cost_metrics",
    "generate_summary_table",
]
