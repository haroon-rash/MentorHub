from __future__ import annotations

import re
from typing import Iterable


def tokenize_topics(*sources: str | None) -> list[str]:
    """Normalize subjects/interests into comparable topic tokens."""
    topics: list[str] = []
    seen: set[str] = set()

    for source in sources:
        if not source:
            continue
        for raw in re.split(r"[,;|/\n]+", str(source)):
            token = normalize_topic(raw)
            if token and token not in seen:
                seen.add(token)
                topics.append(token)
    return topics


def normalize_topic(value: str) -> str:
    cleaned = re.sub(r"\s+", " ", value.strip().lower())
    if len(cleaned) < 2:
        return ""
    aliases = {
        "cs": "computer science",
        "dsa": "data structures",
        "data structures and algorithms": "data structures",
        "spring": "spring boot",
        "springboot": "spring boot",
        "micro service": "microservices",
        "micro-service": "microservices",
        "ielts prep": "ielts",
        "english speaking": "english",
        "spoken english": "english",
        "communication": "communication skills",
        "math": "mathematics",
        "maths": "mathematics",
    }
    return aliases.get(cleaned, cleaned)


def extract_keywords(text: str, limit: int = 12) -> list[str]:
    tokens = re.findall(r"[a-zA-Z][a-zA-Z0-9+#.-]{1,}", (text or "").lower())
    stop = {
        "the", "and", "for", "with", "this", "that", "need", "help", "want",
        "from", "have", "been", "will", "about", "into", "your", "their",
    }
    out: list[str] = []
    seen: set[str] = set()
    for t in tokens:
        n = normalize_topic(t)
        if not n or n in stop or n in seen:
            continue
        seen.add(n)
        out.append(n)
        if len(out) >= limit:
            break
    return out


def jaccard_similarity(a: Iterable[str], b: Iterable[str]) -> float:
    set_a = {normalize_topic(x) for x in a if normalize_topic(x)}
    set_b = {normalize_topic(x) for x in b if normalize_topic(x)}
    if not set_a or not set_b:
        return 0.0
    inter = len(set_a & set_b)
    union = len(set_a | set_b)
    return inter / union if union else 0.0


def cosine_similarity_weights(
    student_weights: dict[str, float],
    tutor_topics: list[str],
) -> float:
    if not student_weights or not tutor_topics:
        return 0.0
    tutor_set = {normalize_topic(t) for t in tutor_topics}
    dot = sum(w for topic, w in student_weights.items() if topic in tutor_set)
    norm_s = sum(w * w for w in student_weights.values()) ** 0.5
    norm_t = len(tutor_set) ** 0.5
    if norm_s == 0 or norm_t == 0:
        return 0.0
    return min(1.0, dot / (norm_s * norm_t))
