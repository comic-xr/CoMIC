"""Pipeline configuration management."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

import yaml
from dotenv import load_dotenv

load_dotenv()

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


@dataclass
class ModelConfig:
    name: str
    provider: str
    model_id: str
    temperature: float = 0
    max_tokens: int = 1024


@dataclass
class PipelineConfig:
    models: list[ModelConfig] = field(default_factory=list)
    n_trials: int = 1
    concurrency_limit: int = 5
    vlat_dir: Path = field(default_factory=lambda: PROJECT_ROOT / "data" / "vlat")
    results_dir: Path = field(default_factory=lambda: PROJECT_ROOT / "results")
    figures_dir: Path = field(default_factory=lambda: PROJECT_ROOT / "results" / "figures")
    condition: str = "vlat"

    # API keys from environment
    openai_api_key: str = field(default_factory=lambda: os.environ.get("OPENAI_API_KEY", ""))
    anthropic_api_key: str = field(
        default_factory=lambda: os.environ.get("ANTHROPIC_API_KEY", "")
    )
    google_api_key: str = field(default_factory=lambda: os.environ.get("GOOGLE_API_KEY", ""))

    def get_api_key(self, provider: str) -> str:
        key_map = {
            "openai": self.openai_api_key,
            "anthropic": self.anthropic_api_key,
            "google": self.google_api_key,
        }
        return key_map.get(provider, "")


def load_config(config_path: Path | None = None) -> PipelineConfig:
    """Load config from YAML file, falling back to defaults."""
    if config_path is None:
        config_path = PROJECT_ROOT / "configs" / "default.yaml"

    config = PipelineConfig()

    if config_path.exists():
        with open(config_path) as f:
            raw = yaml.safe_load(f)

        if raw:
            if "models" in raw:
                config.models = [ModelConfig(**m) for m in raw["models"]]
            if "n_trials" in raw:
                config.n_trials = raw["n_trials"]
            if "concurrency_limit" in raw:
                config.concurrency_limit = raw["concurrency_limit"]
            paths = raw.get("paths", {})
            if "vlat_dir" in paths:
                config.vlat_dir = PROJECT_ROOT / paths["vlat_dir"]
            if "results_dir" in paths:
                config.results_dir = PROJECT_ROOT / paths["results_dir"]
            if "figures_dir" in paths:
                config.figures_dir = PROJECT_ROOT / paths["figures_dir"]

    return config
