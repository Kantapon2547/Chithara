"""
generation/strategies.py
Strategy Pattern for Song Generation (Exercise 4)

Defines the abstract interface and two concrete strategies:
  - MockSongGeneratorStrategy  (offline, deterministic)
  - SunoSongGeneratorStrategy  (calls api.sunoapi.org)
"""

from __future__ import annotations

import time
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional

import requests
from django.conf import settings


# ---------------------------------------------------------------------------
# Data transfer objects
# ---------------------------------------------------------------------------

@dataclass
class SongGenerationRequest:
    """
    Carries everything a strategy needs to generate a song.
    Field names mirror the Suno API body so both strategies share the same input.
    """
    title: str
    prompt: str                          # lyric / style description
    style: str = "pop"
    mood: str = "happy"
    duration: int = 30                   # seconds (hint only; Suno ignores it)
    make_instrumental: bool = False


@dataclass
class SongGenerationResult:
    """
    Returned by every strategy.
    task_id  – the Suno taskId (or a mock value in offline mode)
    status   – PENDING | TEXT_SUCCESS | FIRST_SUCCESS | SUCCESS | FAILED
    audio_url – populated when status == SUCCESS
    metadata  – any extra data returned by the API
    """
    task_id: str
    status: str
    audio_url: Optional[str] = None
    metadata: dict = field(default_factory=dict)


# ---------------------------------------------------------------------------
# Abstract strategy interface
# ---------------------------------------------------------------------------

class SongGeneratorStrategy(ABC):
    """Common interface that all generation strategies must implement."""

    @abstractmethod
    def generate(self, request: SongGenerationRequest) -> SongGenerationResult:
        """
        Kick off song generation and return an initial result.
        The result may have status PENDING if generation is async.
        """
        ...

    @abstractmethod
    def get_status(self, task_id: str) -> SongGenerationResult:
        """
        Poll the current status of a previously submitted task.
        """
        ...


# ---------------------------------------------------------------------------
# Strategy A: Mock (offline / deterministic)
# ---------------------------------------------------------------------------

class MockSongGeneratorStrategy(SongGeneratorStrategy):
    """
    Does NOT call any external API.
    Returns deterministic, predictable output suitable for unit tests and
    development without network access.
    """

    MOCK_AUDIO_URL = "https://mock-storage.example.com/placeholder_audio.mp3"

    def generate(self, request: SongGenerationRequest) -> SongGenerationResult:
        # Simulate a tiny delay to mimic async behaviour
        time.sleep(0.05)

        fake_task_id = f"mock-{uuid.uuid4().hex[:12]}"
        print(f"[MockStrategy] generate() called – taskId={fake_task_id}")
        print(f"  title={request.title}, style={request.style}, mood={request.mood}")

        return SongGenerationResult(
            task_id=fake_task_id,
            status="SUCCESS",
            audio_url=self.MOCK_AUDIO_URL,
            metadata={
                "title": request.title,
                "prompt": request.prompt,
                "style": request.style,
                "mood": request.mood,
                "duration_hint": request.duration,
                "strategy": "mock",
            },
        )

    def get_status(self, task_id: str) -> SongGenerationResult:
        print(f"[MockStrategy] get_status() called – taskId={task_id}")
        return SongGenerationResult(
            task_id=task_id,
            status="SUCCESS",
            audio_url=self.MOCK_AUDIO_URL,
            metadata={"strategy": "mock"},
        )


# ---------------------------------------------------------------------------
# Strategy B: Suno API (calls api.sunoapi.org)
# ---------------------------------------------------------------------------

class SunoSongGeneratorStrategy(SongGeneratorStrategy):
    """
    Integrates with https://api.sunoapi.org

    Required Django settings (never commit the key!):
        SUNO_API_KEY = "<your-bearer-token>"          # set via env var
        SUNO_API_BASE_URL = "https://api.sunoapi.org" # optional override

    Workflow:
        1. generate()    → POST /api/v1/generate  → returns taskId
        2. get_status()  → GET  /api/v1/generate/record-info?taskId=... → polls status
    """

    # Suno status lifecycle
    TERMINAL_STATUSES = {"SUCCESS", "FAILED"}

    def __init__(self):
        self.api_key: str = getattr(settings, "SUNO_API_KEY", "")
        self.base_url: str = getattr(
            settings, "SUNO_API_BASE_URL", "https://api.sunoapi.org"
        ).rstrip("/")

        if not self.api_key:
            raise ValueError(
                "SUNO_API_KEY is not set. "
                "Add it to settings.py or set the SUNO_API_KEY environment variable."
            )

    # ------------------------------------------------------------------
    # helpers
    # ------------------------------------------------------------------

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    def _raise_for_status(self, response: requests.Response) -> None:
        if not response.ok:
            raise RuntimeError(
                f"Suno API error {response.status_code}: {response.text[:300]}"
            )

    # ------------------------------------------------------------------
    # Strategy interface
    # ------------------------------------------------------------------

    def generate(self, request: SongGenerationRequest) -> SongGenerationResult:
        """
        POST /api/v1/generate
        Returns a result with the taskId and initial status PENDING.
        """
        url = f"{self.base_url}/api/v1/generate"

        # customMode=False → Suno uses the prompt as a full description (no custom lyrics).
        # customMode=True  → you supply separate [Verse]/[Chorus] tags in the prompt.
        payload = {
            "customMode": False,
            "instrumental": request.make_instrumental,
            "model": "V3_5",          # or "V4" – use whichever your plan supports
            "prompt": request.prompt,
            "style": request.style,
            "title": request.title,
            "callBackUrl": "https://example.com/callback",  # required by API; we use polling
        }

        print(f"[SunoStrategy] POST {url}")
        print(f"[SunoStrategy] payload: {payload}")
        response = requests.post(url, json=payload, headers=self._headers(), timeout=30)
        self._raise_for_status(response)

        data = response.json()
        print(f"[SunoStrategy] generate() response: {data}")

        # Check for API-level errors (code != 200)
        if data.get("code") not in (200, None) or data.get("data") is None:
            raise RuntimeError(
                f"Suno API returned an error: code={data.get('code')} msg={data.get('msg')}"
            )

        inner = data.get("data") or {}

        # taskId may be at top level or inside data
        task_id = (
            inner.get("taskId")
            or inner.get("task_id")
            or data.get("taskId")
            or data.get("id")
            or "unknown"
        )

        return SongGenerationResult(
            task_id=task_id,
            status="PENDING",
            audio_url=None,
            metadata=data,
        )

    def get_status(self, task_id: str) -> SongGenerationResult:
        """
        GET /api/v1/generate/record-info?taskId=<id>
        Returns the current status and, when ready, the audio URL.
        """
        url = f"{self.base_url}/api/v1/generate/record-info"
        params = {"taskId": task_id}

        print(f"[SunoStrategy] GET {url} taskId={task_id}")
        response = requests.get(url, params=params, headers=self._headers(), timeout=30)
        self._raise_for_status(response)

        data = response.json()
        print(f"[SunoStrategy] get_status() response: {data}")

        # Parse status – may be nested under 'data'
        record = data.get("data") or data
        if isinstance(record, list) and record:
            record = record[0]

        status = (
            record.get("status")
            or record.get("state")
            or "PENDING"
        ).upper()

        audio_url = (
            record.get("audioUrl")
            or record.get("audio_url")
            or record.get("url")
        )

        return SongGenerationResult(
            task_id=task_id,
            status=status,
            audio_url=audio_url,
            metadata=data,
        )

    def poll_until_complete(
        self,
        task_id: str,
        max_attempts: int = 30,
        interval_seconds: float = 5.0,
    ) -> SongGenerationResult:
        """
        Helper: polls get_status() until the task reaches a terminal state
        or max_attempts is exhausted.
        """
        for attempt in range(1, max_attempts + 1):
            result = self.get_status(task_id)
            print(f"[SunoStrategy] poll attempt {attempt}/{max_attempts} status={result.status}")

            if result.status in self.TERMINAL_STATUSES:
                return result

            time.sleep(interval_seconds)

        # Return whatever the last result was
        return result  # type: ignore[return-value]
