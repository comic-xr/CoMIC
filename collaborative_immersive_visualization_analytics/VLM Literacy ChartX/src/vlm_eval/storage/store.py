"""Result storage and caching."""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd


class ResultStore:
    """Manages saving/loading evaluation results."""

    def __init__(self, results_dir: Path):
        self.results_dir = results_dir
        self.results_dir.mkdir(parents=True, exist_ok=True)
        self.responses_dir = results_dir / "responses"
        self.responses_dir.mkdir(exist_ok=True)
        self.scores_dir = results_dir / "scores"
        self.scores_dir.mkdir(exist_ok=True)

    def _response_path(self, model_name: str, chart_id: str, trial: int = 0, condition: str = "") -> Path:
        dir_name = model_name.replace("/", "_")
        if condition:
            dir_name = f"{dir_name}_{condition}"
        model_dir = self.responses_dir / dir_name
        model_dir.mkdir(parents=True, exist_ok=True)
        safe_id = chart_id.replace("/", "_").replace(" ", "_")
        return model_dir / f"{safe_id}_trial{trial}.json"

    def check_cached(self, model_name: str, chart_id: str, trial: int = 0, condition: str = "") -> dict | None:
        """Return cached response dict or None."""
        path = self._response_path(model_name, chart_id, trial, condition)
        if path.exists():
            with open(path) as f:
                return json.load(f)
        return None

    def save_response(self, model_name: str, chart_id: str, response: dict, trial: int = 0, condition: str = ""):
        """Save a single response as JSON."""
        path = self._response_path(model_name, chart_id, trial, condition)
        with open(path, "w") as f:
            json.dump(response, f, indent=2, default=str)

    def append_to_csv(self, row: dict, filename: str = "all_results.csv"):
        """Append a result row to the CSV file."""
        csv_path = self.scores_dir / filename
        df_row = pd.DataFrame([row])
        if csv_path.exists():
            df_row.to_csv(csv_path, mode="a", header=False, index=False)
        else:
            df_row.to_csv(csv_path, index=False)

    def load_all_results(self, filename: str = "all_results.csv") -> pd.DataFrame:
        """Load all results from CSV."""
        csv_path = self.scores_dir / filename
        if csv_path.exists():
            return pd.read_csv(csv_path)
        return pd.DataFrame()

    def save_results_df(self, df: pd.DataFrame, filename: str = "all_results.csv"):
        """Save full results DataFrame."""
        csv_path = self.scores_dir / filename
        df.to_csv(csv_path, index=False)
