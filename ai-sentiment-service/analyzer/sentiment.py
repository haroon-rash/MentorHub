"""HuggingFace transformer sentiment for review text."""

from __future__ import annotations

import logging
import re
from functools import lru_cache
from typing import Any

logger = logging.getLogger(__name__)

# Free, lightweight SST-2 fine-tuned model (~250MB)
MODEL_NAME = "distilbert-base-uncased-finetuned-sst-2-english"

_pipeline = None


@lru_cache(maxsize=1)
def _get_pipeline():
    global _pipeline
    if _pipeline is not None:
        return _pipeline
    from transformers import pipeline

    logger.info("Loading sentiment model: %s", MODEL_NAME)
    _pipeline = pipeline(
        "sentiment-analysis",
        model=MODEL_NAME,
        tokenizer=MODEL_NAME,
        truncation=True,
        max_length=512,
    )
    return _pipeline


def _extract_keywords(text: str, limit: int = 8) -> list[str]:
    tokens = re.findall(r"[a-zA-Z][a-zA-Z0-9+#.-]{1,}", text.lower())
    stop = {
        "the", "and", "for", "with", "this", "that", "was", "were", "are", "has",
        "have", "had", "but", "not", "you", "your", "very", "from", "they", "their",
    }
    seen: set[str] = set()
    out: list[str] = []
    for t in tokens:
        if t in stop or len(t) < 3:
            continue
        if t not in seen:
            seen.add(t)
            out.append(t)
        if len(out) >= limit:
            break
    return out


def analyze_sentiment(text: str, rating: int | None = None) -> dict[str, Any]:
    cleaned = (text or "").strip()
    if not cleaned:
        return {
            "sentiment": "NEUTRAL",
            "confidence": 0.5,
            "keywords": [],
            "summary": "No text provided",
            "details": {"model": MODEL_NAME, "label": "empty"},
        }

    clf = _get_pipeline()
    results = clf(cleaned[:2000])
    top = results[0] if isinstance(results, list) else results

    label_raw = str(top.get("label", "")).upper()
    score = float(top.get("score", 0.5))

    if "POS" in label_raw:
        sentiment = "POSITIVE"
    elif "NEG" in label_raw:
        sentiment = "NEGATIVE"
    else:
        sentiment = "NEUTRAL"

    # Blend with star rating when comment is short / ambiguous
    if rating is not None:
        if rating >= 4 and sentiment == "NEGATIVE" and score < 0.85:
            sentiment = "POSITIVE"
            score = max(score, 0.72)
        elif rating <= 2 and sentiment == "POSITIVE" and score < 0.85:
            sentiment = "NEGATIVE"
            score = max(score, 0.72)

    keywords = _extract_keywords(cleaned)
    summary = f"{sentiment.title()} review ({score:.0%} confidence)"

    return {
        "sentiment": sentiment,
        "confidence": round(min(max(score, 0.0), 1.0), 4),
        "keywords": keywords,
        "summary": summary,
        "details": {
            "model": MODEL_NAME,
            "label": label_raw,
            "rawScore": score,
        },
    }
