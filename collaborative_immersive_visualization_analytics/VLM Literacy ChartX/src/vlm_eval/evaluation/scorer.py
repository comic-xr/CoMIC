"""Scoring utilities for VLM evaluation responses.

Provides functions to parse raw model outputs into comparable values and
score them against ground-truth answers using exact match, relaxed numeric
accuracy, and keyword matching strategies.
"""

from __future__ import annotations

import re


# ---------------------------------------------------------------------------
# Synonym groups for keyword matching
# ---------------------------------------------------------------------------

_SYNONYM_GROUPS: list[set[str]] = [
    {"increasing", "upward", "rising", "goes up", "uptrend"},
    {"decreasing", "downward", "falling", "goes down", "downtrend"},
    {"stable", "flat", "constant", "no change", "unchanged"},
    {"positive", "direct"},
    {"negative", "inverse"},
]

_SYNONYM_MAP: dict[str, set[str]] = {}
for _group in _SYNONYM_GROUPS:
    for _term in _group:
        _SYNONYM_MAP[_term] = _group


# ---------------------------------------------------------------------------
# Response parsers
# ---------------------------------------------------------------------------


def parse_response(raw: str, expected_type: str = "numeric") -> str | None:
    """Parse a raw model response into a normalised answer string.

    Parameters
    ----------
    raw:
        The raw text returned by the VLM.
    expected_type:
        One of ``"numeric"``, ``"categorical"``, ``"boolean"``, or
        ``"text"``.

    Returns
    -------
    str | None
        The parsed value as a string, or ``None`` if the response could not
        be interpreted for the requested type.
    """
    if raw is None:
        return None

    raw = raw.strip()
    if not raw:
        return None

    if expected_type == "numeric":
        return _parse_numeric(raw)
    if expected_type == "categorical":
        return _parse_categorical(raw)
    if expected_type == "boolean":
        return _parse_boolean(raw)
    if expected_type == "text":
        return raw.strip() or None
    return None


def _parse_numeric(text: str) -> str | None:
    """Extract the most relevant number from *text*.

    Prefers decimal numbers (e.g., 0.77) over integers to avoid grabbing
    step numbering like "1. Find the value".  Falls back to the last integer
    found if no decimal number exists.

    Handles currency symbols (``$``), percentage signs (``%``), thousand
    separators (``,``), and negative signs.
    """
    cleaned = text.replace(",", "")

    pattern = r"[-+]?\$?\s*\d+(?:\.\d+)?%?"

    all_matches = re.findall(pattern, cleaned)
    if not all_matches:
        return None

    # Prefer decimal numbers (contain a dot) — usually the actual answer
    decimal_matches = [m for m in all_matches if "." in m]
    # Use the last decimal match (conclusions tend to come at the end)
    if decimal_matches:
        num_str = decimal_matches[-1]
    else:
        # Fall back to the last integer match
        num_str = all_matches[-1]

    num_str = num_str.replace("$", "").replace("%", "").strip()
    try:
        float(num_str)
    except ValueError:
        return None
    return num_str


def _parse_categorical(text: str) -> str | None:
    """Lowercase, strip whitespace, and return key terms."""
    cleaned = text.strip().lower()
    # Collapse internal whitespace
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned or None


def _parse_boolean(text: str) -> str | None:
    """Look for yes/no/true/false in *text*."""
    lower = text.strip().lower()
    for token in ("yes", "true"):
        if token in lower:
            return "true"
    for token in ("no", "false"):
        if token in lower:
            return "false"
    return None


# ---------------------------------------------------------------------------
# Comparison helpers
# ---------------------------------------------------------------------------


def exact_match(predicted: str, expected: str) -> bool:
    """Case-insensitive exact string match.

    Parameters
    ----------
    predicted:
        The parsed prediction string.
    expected:
        The ground-truth string.
    """
    return predicted.strip().lower() == expected.strip().lower()


def relaxed_accuracy(
    predicted: str,
    expected: str,
    tolerance: float = 0.05,
) -> bool:
    """Check whether *predicted* is within *tolerance* of *expected*.

    The comparison is performed numerically when both values can be
    converted to floats.  For year-like integers (four-digit values in
    the range 1900--2100) the tolerance is forced to 0.  When both
    values are zero the result is ``True``.  If numeric parsing fails,
    falls back to :func:`exact_match`.

    Parameters
    ----------
    predicted:
        The parsed prediction.
    expected:
        The ground-truth answer.
    tolerance:
        Maximum allowed relative difference ``|p - e| / max(|e|, 1e-9)``.
    """
    try:
        pred_f = float(predicted)
        exp_f = float(expected)
    except (ValueError, TypeError):
        return exact_match(predicted, expected)

    # Both zero
    if pred_f == 0.0 and exp_f == 0.0:
        return True

    # Year values: require exact integer match
    if (
        exp_f == int(exp_f)
        and 1900 <= int(exp_f) <= 2100
        and len(expected.strip().split(".")[0].lstrip("-")) == 4
    ):
        tolerance = 0.0

    denom = max(abs(exp_f), 1e-9)
    return abs(pred_f - exp_f) / denom <= tolerance


def keyword_match(predicted: str, expected: str) -> bool:
    """Check whether *expected* keyword/phrase appears in *predicted*.

    The comparison is case-insensitive and also considers known synonym
    groups so that, for example, ``"increasing"`` matches ``"rising"``.

    Parameters
    ----------
    predicted:
        The full predicted text.
    expected:
        A keyword or short phrase to search for.
    """
    pred_lower = predicted.strip().lower()
    exp_lower = expected.strip().lower()

    # Direct substring check
    if exp_lower in pred_lower:
        return True

    # Synonym expansion: gather all terms equivalent to expected
    synonyms: set[str] = {exp_lower}
    if exp_lower in _SYNONYM_MAP:
        synonyms = _SYNONYM_MAP[exp_lower]

    return any(syn in pred_lower for syn in synonyms)


# ---------------------------------------------------------------------------
# Top-level scoring entry point
# ---------------------------------------------------------------------------


def score_item(
    predicted: str | None,
    expected: str,
    task_type: str,
) -> dict:
    """Score a single predicted answer against the expected ground truth.

    Parameters
    ----------
    predicted:
        The model's parsed answer (may be ``None`` if parsing failed).
    expected:
        The ground-truth answer string.
    task_type:
        The evaluation task category.  Recognised values:

        * ``"extremum"``, ``"value_retrieval"``, ``"value_comparison"`` --
          scored with :func:`relaxed_accuracy`.
        * ``"trend"``, ``"cluster"``, ``"correlation"`` --
          scored with :func:`keyword_match`.
        * ``"count"`` -- scored with :func:`exact_match` on parsed
          numbers.

    Returns
    -------
    dict
        ``{"correct": bool, "method": str, "predicted": predicted,
        "expected": expected}``
    """
    result: dict = {
        "correct": False,
        "method": "no_response",
        "predicted": predicted,
        "expected": expected,
    }

    if predicted is None:
        return result

    # Determine scoring method based on task type
    task_lower = task_type.strip().lower()

    # Numeric tasks: compare values with tolerance
    numeric_tasks = {
        "value_retrieval", "max_value", "max_value_cell",
        "cluster_count", "part_to_whole",
    }

    # Keyword / trend tasks: match keywords with synonyms
    keyword_tasks = {
        "trend_identification", "correlation_direction", "outlier_presence",
        "extremum_detection", "value_comparison", "comparison",
        "magnitude_comparison", "total_comparison",
    }

    if task_lower in numeric_tasks:
        result["method"] = "relaxed_accuracy"
        result["correct"] = relaxed_accuracy(predicted, expected)

    elif task_lower in keyword_tasks:
        result["method"] = "keyword_match"
        result["correct"] = keyword_match(predicted, expected)

    elif task_lower == "count":
        result["method"] = "exact_match"
        parsed_pred = parse_response(predicted, "numeric")
        parsed_exp = parse_response(expected, "numeric")
        if parsed_pred is not None and parsed_exp is not None:
            result["correct"] = exact_match(parsed_pred, parsed_exp)
        else:
            result["correct"] = exact_match(predicted, expected)

    else:
        # Fallback: try relaxed_accuracy, then exact_match
        result["method"] = "relaxed_accuracy"
        result["correct"] = relaxed_accuracy(predicted, expected)

    return result
