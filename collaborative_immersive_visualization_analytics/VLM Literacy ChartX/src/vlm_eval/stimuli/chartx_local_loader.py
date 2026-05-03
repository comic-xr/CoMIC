"""Offline loader for ChartX worst-4 chart types.

Reads `data/chartx_raw/ChartX_annotation_{test,val}.json`, parses the embedded
CSV strings (which use literal `\\t` and `\\n` as delimiters) into typed
data structures, and returns the items intersected with the 2D baseline
chart_id set so all three conditions (2D / 3D-single / 3D-multi) score
the exact same questions on the exact same data.

Public:
    TARGET_TYPES        – frozenset of {"treemap","radar","bubble","area_chart"}
    load_worst4_items() – returns list[dict] (deterministically ordered)
"""

from __future__ import annotations

import csv
import io
import json
from pathlib import Path
from typing import Any

TARGET_TYPES = frozenset({"treemap", "radar", "bubble", "area_chart"})


def _parse_chartx_csv(raw_csv: str) -> list[dict[str, str]]:
    """Parse a ChartX CSV string into row dicts.

    ChartX stores CSV with literal "\\t" and "\\n" character sequences as
    delimiters (not actual tab/newline). Replace them and read with
    csv.DictReader.
    """
    text = raw_csv.replace("\\n", "\n").replace("\\t", "\t").strip()
    reader = csv.DictReader(io.StringIO(text), delimiter="\t")
    rows: list[dict[str, str]] = []
    for row in reader:
        cleaned = {
            k.strip(): (v.strip() if v is not None else "")
            for k, v in row.items()
            if k is not None
        }
        if cleaned:
            rows.append(cleaned)
    return rows


def _safe_float(val: str) -> float | None:
    cleaned = val.replace(",", "").replace("$", "").replace("%", "").strip()
    try:
        return float(cleaned)
    except (ValueError, TypeError):
        return None


def _parse_treemap(rows: list[dict[str, str]]) -> dict[str, Any] | None:
    """Treemap: 2-column CSV: (label, percentage)."""
    if not rows:
        return None
    headers = list(rows[0].keys())
    if len(headers) < 2:
        return None
    label_col, value_col = headers[0], headers[1]
    labels: list[str] = []
    values: list[float] = []
    for r in rows:
        v = _safe_float(r.get(value_col, ""))
        if v is None:
            return None
        labels.append(r[label_col])
        values.append(v)
    return {
        "labels": labels,
        "values": values,
        "value_axis": value_col,
    }


def _parse_radar(rows: list[dict[str, str]]) -> dict[str, Any] | None:
    """Radar: first col is series name, headers[1:] are polar axes.

    Returns matrix shape (n_series, n_axes) plus axis labels and series labels.
    """
    if not rows:
        return None
    headers = list(rows[0].keys())
    if len(headers) < 3:  # need series_name + at least 2 axes
        return None
    series_col = headers[0]
    axis_cols = headers[1:]
    series_labels: list[str] = []
    matrix: list[list[float]] = []
    for r in rows:
        row_vals: list[float] = []
        for col in axis_cols:
            v = _safe_float(r.get(col, ""))
            if v is None:
                return None
            row_vals.append(v)
        series_labels.append(r[series_col])
        matrix.append(row_vals)
    return {
        "axis_labels": axis_cols,
        "series_labels": series_labels,
        "matrix": matrix,
    }


def _parse_bubble(rows: list[dict[str, str]]) -> dict[str, Any] | None:
    """Bubble: first col is entity, then 4 numeric cols (x, y, size, color)."""
    if not rows:
        return None
    headers = list(rows[0].keys())
    if len(headers) < 5:  # need entity + 4 numeric channels
        return None
    entity_col = headers[0]
    x_col, y_col, size_col, color_col = headers[1], headers[2], headers[3], headers[4]
    entities: list[str] = []
    xs: list[float] = []
    ys: list[float] = []
    sizes: list[float] = []
    colors: list[float] = []
    for r in rows:
        x = _safe_float(r.get(x_col, ""))
        y = _safe_float(r.get(y_col, ""))
        s = _safe_float(r.get(size_col, ""))
        c = _safe_float(r.get(color_col, ""))
        if None in (x, y, s, c):
            return None
        entities.append(r[entity_col])
        xs.append(x)  # type: ignore[arg-type]
        ys.append(y)  # type: ignore[arg-type]
        sizes.append(s)  # type: ignore[arg-type]
        colors.append(c)  # type: ignore[arg-type]
    return {
        "entities": entities,
        "x": xs,
        "y": ys,
        "size": sizes,
        "color": colors,
        "labels": {
            "x": x_col,
            "y": y_col,
            "size": size_col,
            "color": color_col,
        },
    }


def _parse_area(rows: list[dict[str, str]]) -> dict[str, Any] | None:
    """Area chart: first col is x category (e.g. year), headers[1:] are stacked series."""
    if not rows:
        return None
    headers = list(rows[0].keys())
    if len(headers) < 2:
        return None
    x_col = headers[0]
    series_cols = headers[1:]
    x_labels = [r[x_col] for r in rows]
    series_data: dict[str, list[float]] = {}
    for col in series_cols:
        vals: list[float] = []
        for r in rows:
            v = _safe_float(r.get(col, ""))
            if v is None:
                return None
            vals.append(v)
        series_data[col] = vals
    return {
        "x_label": x_col,
        "x_values": x_labels,
        "series_names": series_cols,
        "series_data": series_data,
    }


_PARSERS = {
    "treemap": _parse_treemap,
    "radar": _parse_radar,
    "bubble": _parse_bubble,
    "area_chart": _parse_area,
}


def load_worst4_items(
    chartx_dir: Path | str = Path("data/chartx_raw"),
) -> list[dict[str, Any]]:
    """Load all worst-4 ChartX items from val + test annotations.

    Returns a deterministically ordered list (by chart_type then chart_id)
    of dicts with keys:
        chart_id, chart_type, data, question, expected_answer, topic, title
    Items whose CSV fails to parse are dropped with a printed warning.
    """
    chartx_dir = Path(chartx_dir)
    annotation_files = [
        chartx_dir / "ChartX_annotation_val.json",
        chartx_dir / "ChartX_annotation_test.json",
    ]

    items: list[dict[str, Any]] = []
    skipped: list[tuple[str, str, str]] = []
    for path in annotation_files:
        with open(path) as f:
            raw = json.load(f)
        for entry in raw:
            ct = entry.get("chart_type", "")
            if ct not in TARGET_TYPES:
                continue
            csv_str = entry.get("csv", "")
            try:
                rows = _parse_chartx_csv(csv_str)
            except Exception as e:  # noqa: BLE001
                skipped.append((ct, entry.get("imgname", "?"), f"csv-parse:{e}"))
                continue
            data = _PARSERS[ct](rows)
            if data is None:
                skipped.append((ct, entry.get("imgname", "?"), "shape-mismatch"))
                continue
            items.append(
                {
                    "chart_id": entry["imgname"],
                    "chart_type": ct,
                    "data": data,
                    "question": entry["QA"]["input"],
                    "expected_answer": entry["QA"]["output"],
                    "topic": entry.get("topic", ""),
                    "title": entry.get("title", "").strip(),
                }
            )

    if skipped:
        print(f"chartx_local_loader: skipped {len(skipped)} entries:")
        for s in skipped[:5]:
            print(f"  {s}")
        if len(skipped) > 5:
            print(f"  ... and {len(skipped) - 5} more")

    items.sort(key=lambda x: (x["chart_type"], str(x["chart_id"])))
    return items


if __name__ == "__main__":
    items = load_worst4_items()
    from collections import Counter

    counts = Counter(it["chart_type"] for it in items)
    print(f"Loaded {len(items)} items: {dict(counts)}")
    for ct in sorted(TARGET_TYPES):
        sample = next(it for it in items if it["chart_type"] == ct)
        print(f"\n{ct} sample (id={sample['chart_id']}):")
        print(f"  Q: {sample['question']}")
        print(f"  A: {sample['expected_answer']}")
        d = sample["data"]
        print(f"  data keys: {list(d.keys())}")
