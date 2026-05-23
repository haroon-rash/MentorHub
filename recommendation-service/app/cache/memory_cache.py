"""In-process TTL cache (no Redis)."""

from __future__ import annotations

import time
from threading import Lock
from typing import Any, Generic, TypeVar

T = TypeVar("T")


class TTLCache(Generic[T]):
    def __init__(self, default_ttl: int = 300, max_entries: int = 500):
        self._default_ttl = default_ttl
        self._max_entries = max_entries
        self._store: dict[str, tuple[float, T]] = {}
        self._lock = Lock()

    def get(self, key: str) -> T | None:
        with self._lock:
            entry = self._store.get(key)
            if not entry:
                return None
            expires_at, value = entry
            if time.monotonic() > expires_at:
                del self._store[key]
                return None
            return value

    def set(self, key: str, value: T, ttl: int | None = None) -> None:
        ttl = ttl if ttl is not None else self._default_ttl
        with self._lock:
            if len(self._store) >= self._max_entries:
                self._evict_oldest()
            self._store[key] = (time.monotonic() + ttl, value)

    def delete(self, key: str) -> None:
        with self._lock:
            self._store.pop(key, None)

    def invalidate_prefix(self, prefix: str) -> None:
        with self._lock:
            keys = [k for k in self._store if k.startswith(prefix)]
            for k in keys:
                del self._store[k]

    def _evict_oldest(self) -> None:
        if not self._store:
            return
        oldest_key = min(self._store, key=lambda k: self._store[k][0])
        del self._store[oldest_key]
