from __future__ import annotations

import time
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional

import requests
from django.conf import settings


# ---------------------------------------------------------------------------
# DTOs
# ---------------------------------------------------------------------------

@dataclass
class SongGenerationRequest:
    title: str
    prompt: str
    style: str = "pop"
    mood: str = "happy"
    duration: int = 30
    make_instrumental: bool = False


@dataclass
class SongGenerationResult:
    task_id: str
    status: str  # PENDING | SUCCESS | FAILED
    audio_url: Optional[str] = None
    error: Optional[str] = None
    metadata: dict = field(default_factory=dict)


# ---------------------------------------------------------------------------
# Abstract Strategy
# ---------------------------------------------------------------------------

class SongGeneratorStrategy(ABC):

    @abstractmethod
    def generate(self, request: SongGenerationRequest) -> SongGenerationResult:
        ...

    @abstractmethod
    def get_status(self, task_id: str) -> SongGenerationResult:
        ...


# ---------------------------------------------------------------------------
# Mock Strategy (DEV ONLY)
# ---------------------------------------------------------------------------

class MockSongGeneratorStrategy(SongGeneratorStrategy):

    MOCK_AUDIO_URL = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"

    def generate(self, request: SongGenerationRequest) -> SongGenerationResult:
        time.sleep(0.05)

        task_id = f"mock-{uuid.uuid4().hex[:12]}"
        print(f"[Mock] generate taskId={task_id}")

        return SongGenerationResult(
            task_id=task_id,
            status="SUCCESS",
            audio_url=self.MOCK_AUDIO_URL,
            metadata={"strategy": "mock"},
        )

    def get_status(self, task_id: str) -> SongGenerationResult:
        return SongGenerationResult(
            task_id=task_id,
            status="SUCCESS",
            audio_url=self.MOCK_AUDIO_URL,
            metadata={"strategy": "mock"},
        )


# ---------------------------------------------------------------------------
# Suno Strategy (PRODUCTION SAFE)
# ---------------------------------------------------------------------------

class SunoSongGeneratorStrategy(SongGeneratorStrategy):

    TERMINAL_STATUSES = {"SUCCESS", "FAILED"}

    def __init__(self):
        self.api_key = getattr(settings, "SUNO_API_KEY", "")
        self.base_url = getattr(settings, "SUNO_API_BASE_URL", "https://api.sunoapi.org").rstrip("/")

        if not self.api_key:
            raise ValueError("SUNO_API_KEY is missing")

    # -------------------------
    # headers
    # -------------------------
    def _headers(self):
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    # -------------------------
    # GENERATE
    # -------------------------
    def generate(self, request: SongGenerationRequest) -> SongGenerationResult:
        url = f"{self.base_url}/api/v1/generate"

        payload = {
            "customMode": False,
            "instrumental": request.make_instrumental,
            "model": "V3_5",
            "prompt": request.prompt,
            "style": request.style,
            "title": request.title,
            "callBackUrl": "https://example.com/callback",
        }

        print(f"[Suno] POST {url}")
        print(f"[Suno] payload: {payload}")

        try:
            response = requests.post(url, json=payload, headers=self._headers(), timeout=30)

            # -------------------------
            # HTTP ERROR
            # -------------------------
            if not response.ok:
                return SongGenerationResult(
                    task_id="",
                    status="FAILED",
                    error=f"HTTP_ERROR_{response.status_code}",
                    metadata={"raw": response.text},
                )

            data = response.json()
            print(f"[Suno] response: {data}")

            # -------------------------
            # QUOTA ERROR
            # -------------------------
            if data.get("code") == 429:
                return SongGenerationResult(
                    task_id="",
                    status="FAILED",
                    error="INSUFFICIENT_CREDITS",
                    metadata=data,
                )

            # -------------------------
            # INVALID RESPONSE
            # -------------------------
            if not data.get("data"):
                return SongGenerationResult(
                    task_id="",
                    status="FAILED",
                    error="INVALID_RESPONSE",
                    metadata=data,
                )

            inner = data.get("data") or {}

            task_id = (
                inner.get("taskId")
                or data.get("taskId")
                or f"suno-{uuid.uuid4().hex[:12]}"
            )

            return SongGenerationResult(
                task_id=task_id,
                status="PENDING",
                audio_url=None,
                metadata=data,
            )

        except Exception as e:
            return SongGenerationResult(
                task_id="",
                status="FAILED",
                error=str(e),
                metadata={},
            )

    # -------------------------
    # STATUS
    # -------------------------
    def get_status(self, task_id: str) -> SongGenerationResult:
        url = f"{self.base_url}/api/v1/generate/record-info"

        try:
            response = requests.get(
                url,
                params={"taskId": task_id},
                headers=self._headers(),
                timeout=30,
            )

            if not response.ok:
                return SongGenerationResult(
                    task_id=task_id,
                    status="FAILED",
                    error=f"HTTP_{response.status_code}",
                )

            data = response.json()
            record = data.get("data") or data

            if isinstance(record, list):
                record = record[0]

            status = (record.get("status") or "PENDING").upper()
            audio_url = record.get("audioUrl") or record.get("url")

            return SongGenerationResult(
                task_id=task_id,
                status=status,
                audio_url=audio_url,
                metadata=data,
            )

        except Exception as e:
            return SongGenerationResult(
                task_id=task_id,
                status="FAILED",
                error=str(e),
            )

    # -------------------------
    # POLLING
    # -------------------------
    def poll_until_complete(self, task_id: str, max_attempts=30, interval_seconds=5):
        for _ in range(max_attempts):
            result = self.get_status(task_id)

            if result.status in self.TERMINAL_STATUSES:
                return result

            time.sleep(interval_seconds)

        return SongGenerationResult(
            task_id=task_id,
            status="FAILED",
            error="POLL_TIMEOUT",
        )