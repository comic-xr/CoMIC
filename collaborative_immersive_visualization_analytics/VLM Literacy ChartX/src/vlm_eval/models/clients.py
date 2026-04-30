"""Concrete VLM client implementations for OpenAI, OpenRouter, Anthropic, and Google Gemini."""

from __future__ import annotations

import asyncio
import logging
import os
import time
from pathlib import Path
from typing import Any

import anthropic
import openai
from dotenv import load_dotenv
from google import genai
from PIL import Image

from vlm_eval.models.base import VisionModel, VisionResponse, retry_with_backoff

load_dotenv()

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Pricing tables  (USD per 1 M tokens)
# ---------------------------------------------------------------------------

OPENAI_PRICING: dict[str, dict[str, float]] = {
    "gpt-4o": {"input": 2.50, "output": 10.00},
    "gpt-4o-mini": {"input": 0.15, "output": 0.60},
    "gpt-5.2": {"input": 1.75, "output": 14.00},
    "gpt-5.4": {"input": 2.00, "output": 16.00},
}

OPENROUTER_PRICING: dict[str, dict[str, float]] = {
    "openai/gpt-5.2-chat": {"input": 1.75, "output": 14.00},
    "openai/gpt-5.4": {"input": 2.50, "output": 15.00},
}

CLAUDE_PRICING: dict[str, dict[str, float]] = {
    "claude-sonnet": {"input": 3.00, "output": 15.00},
}

GEMINI_PRICING: dict[str, dict[str, float]] = {
    "gemini-2.0-flash": {"input": 0.075, "output": 0.30},
    "gemini-2.5-flash": {"input": 0.15, "output": 0.60},
}


def _compute_cost(
    pricing: dict[str, dict[str, float]],
    model_id: str,
    input_tokens: int,
    output_tokens: int,
) -> float:
    """Return the estimated cost in USD for a single API call."""
    # Try exact match first, then prefix match for versioned model names
    rates = pricing.get(model_id)
    if rates is None:
        for key in pricing:
            if model_id.startswith(key):
                rates = pricing[key]
                break
    if rates is None:
        logger.warning("No pricing entry for model '%s'; cost set to 0.", model_id)
        return 0.0
    return (input_tokens * rates["input"] + output_tokens * rates["output"]) / 1_000_000


# ---------------------------------------------------------------------------
# OpenAI  (GPT-4o / GPT-4o-mini)
# ---------------------------------------------------------------------------


class OpenAIVision(VisionModel):
    """Client for OpenAI vision-capable models."""

    def __init__(self, model_id: str, api_key: str, **kwargs: Any) -> None:
        super().__init__(model_id, api_key, **kwargs)
        self.client = openai.AsyncOpenAI(api_key=self.api_key)

    async def query(self, image_path: Path | list[Path], prompt: str) -> VisionResponse:
        paths = image_path if isinstance(image_path, list) else [image_path]
        content: list[dict] = [{"type": "text", "text": prompt}]
        for p in paths:
            p = Path(p)
            b64 = self.encode_image(p)
            suffix = p.suffix.lstrip(".").lower()
            media = f"image/{suffix}" if suffix != "jpg" else "image/jpeg"
            content.append({
                "type": "image_url",
                "image_url": {"url": f"data:{media};base64,{b64}"},
            })

        messages = [{"role": "user", "content": content}]

        async def _call() -> openai.types.chat.ChatCompletion:
            return await self.client.chat.completions.create(
                model=self.model_id,
                messages=messages,
                temperature=self.temperature,
                max_completion_tokens=self.max_tokens,
            )

        start = time.perf_counter()
        response = await retry_with_backoff(_call)
        elapsed_ms = (time.perf_counter() - start) * 1000

        raw_text = response.choices[0].message.content or ""
        input_tokens = response.usage.prompt_tokens if response.usage else 0
        output_tokens = response.usage.completion_tokens if response.usage else 0
        cost = _compute_cost(OPENAI_PRICING, self.model_id, input_tokens, output_tokens)

        return VisionResponse(
            model_name=self.model_id,
            raw_response=raw_text,
            parsed_answer=None,
            latency_ms=elapsed_ms,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cost_usd=cost,
        )


# ---------------------------------------------------------------------------
# OpenRouter  (GPT-5.2 via OpenRouter proxy)
# ---------------------------------------------------------------------------


OPENROUTER_PROVIDER_PIN: dict[str, Any] = {
    "order": ["openai"],
    "allow_fallbacks": False,
    "data_collection": "deny",
}

OPENROUTER_DEFAULT_HEADERS: dict[str, str] = {
    "HTTP-Referer": "https://gmu.edu/cs692-vlm-eval",
    "X-Title": "VLM-Eval-Pipeline",
}


class OpenRouterVision(VisionModel):
    """Client for models accessed via OpenRouter (OpenAI-compatible API).

    Pinned to the OpenAI upstream provider — Azure fallback is disabled because
    Azure has a 16-token minimum on max_completion_tokens and uses different
    parameter names, which would break batch consistency.
    """

    def __init__(self, model_id: str, api_key: str, **kwargs: Any) -> None:
        super().__init__(model_id, api_key, **kwargs)
        import httpx

        self.client = openai.AsyncOpenAI(
            api_key=self.api_key,
            base_url="https://openrouter.ai/api/v1",
            timeout=httpx.Timeout(connect=10.0, read=120.0, write=30.0, pool=30.0),
            max_retries=0,
            default_headers=OPENROUTER_DEFAULT_HEADERS,
        )

    async def query(self, image_path: Path | list[Path], prompt: str) -> VisionResponse:
        paths = image_path if isinstance(image_path, list) else [image_path]
        content: list[dict] = [{"type": "text", "text": prompt}]
        for p in paths:
            p = Path(p)
            b64 = self.encode_image(p)
            suffix = p.suffix.lstrip(".").lower()
            media = f"image/{suffix}" if suffix != "jpg" else "image/jpeg"
            content.append({
                "type": "image_url",
                "image_url": {"url": f"data:{media};base64,{b64}"},
            })

        messages = [{"role": "user", "content": content}]

        async def _call() -> openai.types.chat.ChatCompletion:
            return await asyncio.wait_for(
                self.client.chat.completions.create(
                    model=self.model_id,
                    messages=messages,
                    temperature=self.temperature,
                    max_tokens=self.max_tokens,
                    extra_body={"provider": OPENROUTER_PROVIDER_PIN},
                ),
                timeout=180.0,
            )

        start = time.perf_counter()
        response = await retry_with_backoff(_call)
        elapsed_ms = (time.perf_counter() - start) * 1000

        raw_text = response.choices[0].message.content or ""
        input_tokens = response.usage.prompt_tokens if response.usage else 0
        output_tokens = response.usage.completion_tokens if response.usage else 0
        # Prefer the authoritative cost field reported by OpenRouter, fall back
        # to local pricing only if the field is missing.
        cost = float(getattr(response.usage, "cost", 0.0) or 0.0)
        if cost == 0.0:
            cost = _compute_cost(OPENROUTER_PRICING, self.model_id, input_tokens, output_tokens)

        return VisionResponse(
            model_name=getattr(response, "model", self.model_id),
            raw_response=raw_text,
            parsed_answer=None,
            latency_ms=elapsed_ms,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cost_usd=cost,
        )


# ---------------------------------------------------------------------------
# Anthropic  (Claude Sonnet)
# ---------------------------------------------------------------------------


class ClaudeVision(VisionModel):
    """Client for Anthropic Claude vision-capable models."""

    def __init__(self, model_id: str, api_key: str, **kwargs: Any) -> None:
        super().__init__(model_id, api_key, **kwargs)
        self.client = anthropic.AsyncAnthropic(api_key=self.api_key)

    async def query(self, image_path: Path | list[Path], prompt: str) -> VisionResponse:
        paths = image_path if isinstance(image_path, list) else [image_path]
        content: list[dict] = []
        for p in paths:
            p = Path(p)
            b64 = self.encode_image(p)
            suffix = p.suffix.lstrip(".").lower()
            media = f"image/{suffix}" if suffix != "jpg" else "image/jpeg"
            content.append({
                "type": "image",
                "source": {"type": "base64", "media_type": media, "data": b64},
            })
        content.append({"type": "text", "text": prompt})

        messages = [{"role": "user", "content": content}]

        async def _call() -> anthropic.types.Message:
            return await self.client.messages.create(
                model=self.model_id,
                max_tokens=self.max_tokens,
                temperature=self.temperature,
                messages=messages,
            )

        start = time.perf_counter()
        response = await retry_with_backoff(_call)
        elapsed_ms = (time.perf_counter() - start) * 1000

        raw_text = response.content[0].text if response.content else ""
        input_tokens = response.usage.input_tokens
        output_tokens = response.usage.output_tokens
        cost = _compute_cost(CLAUDE_PRICING, self.model_id, input_tokens, output_tokens)

        return VisionResponse(
            model_name=self.model_id,
            raw_response=raw_text,
            parsed_answer=None,
            latency_ms=elapsed_ms,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cost_usd=cost,
        )


# ---------------------------------------------------------------------------
# Google Gemini
# ---------------------------------------------------------------------------


class GeminiVision(VisionModel):
    """Client for Google Gemini vision-capable models."""

    def __init__(self, model_id: str, api_key: str, **kwargs: Any) -> None:
        super().__init__(model_id, api_key, **kwargs)
        self.client = genai.Client(api_key=self.api_key)

    async def query(self, image_path: Path | list[Path], prompt: str) -> VisionResponse:
        paths = image_path if isinstance(image_path, list) else [image_path]
        images = [Image.open(Path(p)) for p in paths]

        def _sync_call() -> Any:
            return self.client.models.generate_content(
                model=self.model_id,
                contents=[prompt] + images,
            )

        async def _call() -> Any:
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(None, _sync_call)

        start = time.perf_counter()
        response = await retry_with_backoff(_call)
        elapsed_ms = (time.perf_counter() - start) * 1000

        raw_text = response.text or ""
        # Token usage may not be available for all Gemini models
        input_tokens = 0
        output_tokens = 0
        if hasattr(response, "usage_metadata") and response.usage_metadata is not None:
            input_tokens = getattr(response.usage_metadata, "prompt_token_count", 0) or 0
            output_tokens = getattr(response.usage_metadata, "candidates_token_count", 0) or 0
        cost = _compute_cost(GEMINI_PRICING, self.model_id, input_tokens, output_tokens)

        return VisionResponse(
            model_name=self.model_id,
            raw_response=raw_text,
            parsed_answer=None,
            latency_ms=elapsed_ms,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cost_usd=cost,
        )


# ---------------------------------------------------------------------------
# Registry & factory
# ---------------------------------------------------------------------------

MODEL_REGISTRY: dict[str, type[VisionModel]] = {
    "openai": OpenAIVision,
    "openrouter": OpenRouterVision,
    "anthropic": ClaudeVision,
    "google": GeminiVision,
}


def get_model(provider: str, model_id: str, api_key: str, **kwargs: Any) -> VisionModel:
    """Instantiate a VisionModel by provider name.

    Parameters
    ----------
    provider:
        One of the keys in ``MODEL_REGISTRY`` (e.g. ``"openai"``).
    model_id:
        The model identifier expected by the provider's API
        (e.g. ``"gpt-4o"``, ``"claude-sonnet-4-20250514"``).
    api_key:
        API key for the provider.  Falls back to the corresponding
        environment variable when an empty string is supplied.
    **kwargs:
        Extra keyword arguments forwarded to the model constructor
        (``temperature``, ``max_tokens``, etc.).

    Returns
    -------
    VisionModel
        A ready-to-use model client.

    Raises
    ------
    ValueError
        If *provider* is not found in ``MODEL_REGISTRY``.
    """
    cls = MODEL_REGISTRY.get(provider)
    if cls is None:
        raise ValueError(
            f"Unknown provider '{provider}'. "
            f"Available: {', '.join(sorted(MODEL_REGISTRY))}"
        )

    # Fall back to well-known env vars when no key is given explicitly
    if not api_key:
        env_map: dict[str, str] = {
            "openai": "OPENAI_API_KEY",
            "openrouter": "OPENROUTER_API_KEY",
            "anthropic": "ANTHROPIC_API_KEY",
            "google": "GOOGLE_API_KEY",
        }
        env_var = env_map.get(provider, "")
        api_key = os.environ.get(env_var, "")

    return cls(model_id=model_id, api_key=api_key, **kwargs)
