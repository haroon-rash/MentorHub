"""FastAPI sentiment analysis service — HuggingFace transformers."""

from __future__ import annotations

import logging

from fastapi import FastAPI
from pydantic import BaseModel, Field

from analyzer.sentiment import analyze_sentiment

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="MentorHub AI Sentiment Service",
    version="2.0.0",
    description="Review sentiment classification using DistilBERT SST-2",
)


class AnalyzeRequest(BaseModel):
    text: str = ""
    rating: int | None = Field(default=None, ge=1, le=5)


class AnalyzeResponse(BaseModel):
    sentiment: str
    confidence: float
    keywords: list[str]
    summary: str
    details: dict | None = None


@app.on_event("startup")
async def warmup_model():
    try:
        analyze_sentiment("Great tutor, very helpful session!", 5)
        logger.info("Sentiment model warmed up")
    except Exception as exc:
        logger.warning("Model warmup failed (will retry on first request): %s", exc)


@app.post("/api/v1/analyze", response_model=AnalyzeResponse)
async def analyze(body: AnalyzeRequest):
    result = analyze_sentiment(body.text, body.rating)
    return AnalyzeResponse(**result)


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "ai-sentiment-service", "engine": "huggingface-transformers"}
