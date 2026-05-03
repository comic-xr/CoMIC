"""Base classes and utilities for Vision Language Model clients."""

from __future__ import annotations

import asyncio
import base64
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Callable, Coroutine

logger = logging.getLogger(__name__)


@dataclass
class VisionResponse:
    """Standardised response from any VLM provider."""

    model_name: str
    raw_response: str
    parsed_answer: str | None
    latency_ms: float
    input_tokens: int
    output_tokens: int
    cost_usd: float
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())


class VisionModel(ABC):
    """Abstract base class that every VLM client must implement."""

    def __init__(
        self,
        model_id: str,
        api_key: str,
        temperature: float = 0,
        max_tokens: int = 1024,
    ) -> None:
        self.model_id = model_id
        self.api_key = api_key
        self.temperature = temperature
        self.max_tokens = max_tokens

    @abstractmethod
    async def query(self, image_path: Path | list[Path], prompt: str) -> VisionResponse:
        """Send image(s) + text prompt to the model and return a VisionResponse.

        Parameters
        ----------
        image_path:
            A single image path, or a list of paths for multi-image queries
            (e.g., multiple camera angles of the same 3D chart).
        prompt:
            The text prompt to send alongside the image(s).
        """
        ...

    def encode_image(self, image_path: Path) -> str:
        """Read an image file and return its base64-encoded string."""
        with open(image_path, "rb") as f:
            return base64.b64encode(f.read()).decode("utf-8")


async def retry_with_backoff(
    coro_factory: Callable[[], Coroutine],
    max_retries: int = 3,
    base_delay: float = 1.0,
) -> object:
    """Retry an async operation with exponential backoff.

    Parameters
    ----------
    coro_factory:
        A zero-argument callable that returns a *new* coroutine on each call.
    max_retries:
        Maximum number of retry attempts (in addition to the initial try).
    base_delay:
        Initial delay in seconds; doubles after every failed attempt.

    Returns
    -------
    The result of the coroutine once it succeeds.

    Raises
    ------
    Exception
        The last exception encountered after all retries are exhausted.
    """
    last_exception: Exception | None = None
    for attempt in range(max_retries + 1):
        try:
            return await coro_factory()
        except Exception as exc:
            last_exception = exc
            if attempt < max_retries:
                delay = base_delay * (2 ** attempt)
                logger.warning(
                    "Attempt %d/%d failed (%s). Retrying in %.1fs ...",
                    attempt + 1,
                    max_retries + 1,
                    exc,
                    delay,
                )
                await asyncio.sleep(delay)
            else:
                logger.error(
                    "All %d attempts exhausted. Last error: %s",
                    max_retries + 1,
                    exc,
                )
    raise last_exception  # type: ignore[misc]
