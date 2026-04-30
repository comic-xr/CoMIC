"""Shared OpenRouter helpers — credit pre-flight, retry policy, provider pin.

Only retry the error families the OpenRouter docs flag as transient
(408 timeout, 429 rate-limit, 502/503 provider errors). 4xx-other should
abort fast — retrying a 400 wastes money on the resend without changing
the outcome.
"""

from __future__ import annotations

import asyncio
import logging
import os
from typing import Any, Callable, Coroutine

import httpx
import openai

logger = logging.getLogger(__name__)

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

PROVIDER_PIN_OPENAI: dict[str, Any] = {
    "order": ["openai"],
    "allow_fallbacks": False,
    "data_collection": "deny",
    # NOTE: require_parameters=True empirically returns 404 for openai/gpt-5.4
    # even when the OpenAI endpoint declares max_tokens as supported. Live curl
    # without this flag returns 200 with provider="OpenAI" so the pin still
    # holds; we just don't strictly require schema match.
}

DEFAULT_HEADERS: dict[str, str] = {
    "HTTP-Referer": "https://gmu.edu/cs692-vlm-eval",
    "X-Title": "VLM-Eval-Pipeline",
}


def get_remaining_credits(api_key: str | None = None, *, timeout: float = 15.0) -> float:
    """Return remaining USD credit on the OpenRouter account.

    Hits GET /credits and computes total_credits - total_usage. Raises on
    network errors or non-200 responses so the caller can abort the batch.
    """
    if api_key is None:
        api_key = os.environ.get("OPENROUTER_API_KEY", "")
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY is not set in the environment.")

    headers = {"Authorization": f"Bearer {api_key}"}
    r = httpx.get(f"{OPENROUTER_BASE_URL}/credits", headers=headers, timeout=timeout)
    r.raise_for_status()
    data = r.json().get("data", {})
    total_credits = float(data.get("total_credits", 0.0) or 0.0)
    total_usage = float(data.get("total_usage", 0.0) or 0.0)
    return total_credits - total_usage


def make_async_client(api_key: str | None = None) -> openai.AsyncOpenAI:
    """Return a properly-configured async OpenRouter client.

    httpx.Timeout values are tuned for OpenRouter's published p99 latency
    (~82s for openai/gpt-5.4) so a single hung connection cannot freeze
    the whole batch.
    """
    if api_key is None:
        api_key = os.environ.get("OPENROUTER_API_KEY", "")
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY is not set in the environment.")
    return openai.AsyncOpenAI(
        api_key=api_key,
        base_url=OPENROUTER_BASE_URL,
        timeout=httpx.Timeout(connect=10.0, read=120.0, write=30.0, pool=30.0),
        max_retries=0,
        default_headers=DEFAULT_HEADERS,
    )


# Error codes that warrant a retry. Anything else is terminal.
_RETRYABLE_STATUS = {408, 425, 429, 500, 502, 503, 504}


def _should_retry(exc: BaseException) -> tuple[bool, float | None]:
    """Decide whether to retry, and how long to honour Retry-After if present."""
    if isinstance(exc, asyncio.TimeoutError):
        return True, None
    if isinstance(exc, openai.APITimeoutError):
        return True, None
    if isinstance(exc, openai.APIConnectionError):
        return True, None
    if isinstance(exc, openai.RateLimitError):
        ra = None
        try:
            ra = float(exc.response.headers.get("retry-after", "")) if exc.response else None  # type: ignore[union-attr]
        except (TypeError, ValueError):
            ra = None
        return True, ra
    if isinstance(exc, openai.APIStatusError):
        try:
            return exc.status_code in _RETRYABLE_STATUS, None
        except AttributeError:
            return False, None
    return False, None


async def call_with_smart_retry(
    coro_factory: Callable[[], Coroutine],
    *,
    max_retries: int = 3,
    base_delay: float = 2.0,
    max_delay: float = 60.0,
) -> Any:
    """Retry an async coroutine, but ONLY on transient errors.

    Retries 408/429/5xx, asyncio/openai timeouts, and connection errors.
    Aborts immediately on 400/401/402/403/404 and other terminal failures.
    """
    last: BaseException | None = None
    for attempt in range(max_retries + 1):
        try:
            return await coro_factory()
        except BaseException as exc:  # noqa: BLE001
            last = exc
            retry, retry_after = _should_retry(exc)
            if not retry or attempt >= max_retries:
                logger.error(
                    "Aborting after attempt %d: %s (type=%s)",
                    attempt + 1,
                    exc,
                    type(exc).__name__,
                )
                raise
            delay = retry_after if (retry_after is not None) else min(base_delay * (2 ** attempt), max_delay)
            logger.warning(
                "Attempt %d/%d failed (%s: %s). Retrying in %.1fs ...",
                attempt + 1,
                max_retries + 1,
                type(exc).__name__,
                exc,
                delay,
            )
            await asyncio.sleep(delay)
    if last is not None:
        raise last
    raise RuntimeError("retry loop fell through without an exception")
