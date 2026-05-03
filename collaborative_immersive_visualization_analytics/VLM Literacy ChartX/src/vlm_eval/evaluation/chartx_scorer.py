"""ChartX free-form response scorer.

Lifted verbatim from run_chartx_2d_eval.py:63-100 so the 2D baseline,
3D-single-angle, and 3D-multi-angle conditions all use bit-identical
scoring logic. Imported by the runners and the comparison report.

Numeric matches use a 10% relative tolerance; substring matches are
case-insensitive after stripping common decorations ($, %, ,).
"""

from __future__ import annotations

import re


def score_response(raw: str, expected: str) -> bool:
    """Return True iff the model response matches the expected answer.

    Order of checks: numeric (with 10% relative tolerance) → exact
    substring → substring after stripping currency/percent/comma.
    """
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
