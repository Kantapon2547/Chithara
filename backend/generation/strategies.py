import uuid
import requests
from dataclasses import dataclass, field
from typing import Optional, List
from abc import ABC, abstractmethod
from django.conf import settings


# =========================================================
# DTOs
# =========================================================

@dataclass
class SongGenerationRequest:
    title: str
    prompt: str
    style: str = "pop"


@dataclass
class SongGenerationResult:
    task_id: str
    status: str
    audio_url: Optional[str] = None
    audio_urls: List[str] = field(default_factory=list)
    error: Optional[str] = None
    metadata: dict = field(default_factory=dict)


# =========================================================
# BASE STRATEGY
# =========================================================

class SongGeneratorStrategy(ABC):

    @abstractmethod
    def generate(self, request: SongGenerationRequest) -> SongGenerationResult:
        pass

    @abstractmethod
    def get_status(self, task_id: str) -> SongGenerationResult:
        pass


# =========================================================
# MOCK STRATEGY
# =========================================================

class MockSongGeneratorStrategy(SongGeneratorStrategy):

    MOCK_URL = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"

    def generate(self, request):
        return SongGenerationResult(
            task_id=f"mock-{uuid.uuid4().hex[:10]}",
            status="SUCCESS",
            audio_url=self.MOCK_URL,
            audio_urls=[self.MOCK_URL],
        )

    def get_status(self, task_id):
        return SongGenerationResult(
            task_id=task_id,
            status="SUCCESS",
            audio_url=self.MOCK_URL,
            audio_urls=[self.MOCK_URL],
        )


# =========================================================
# SUNO STRATEGY (FINAL)
# =========================================================

class SunoSongGeneratorStrategy(SongGeneratorStrategy):

    def __init__(self):
        self.api_key = settings.SUNO_API_KEY
        self.base_url = settings.SUNO_API_BASE_URL.rstrip("/")
        self.callback_url = getattr(settings, "SUNO_CALLBACK_URL", None)

        if not self.api_key:
            raise ValueError("Missing SUNO_API_KEY")

    def _headers(self):
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    # -----------------------------------------------------
    # GENERATE
    # -----------------------------------------------------
    def generate(self, request):

        url = f"{self.base_url}/api/v1/generate"

        payload = {
            "customMode": True,
            "instrumental": False,
            "model": "V4_5ALL",
            "callBackUrl": self.callback_url,
            "prompt": request.prompt,
            "style": request.style,
            "title": request.title,
        }

        res = requests.post(url, json=payload, headers=self._headers(), timeout=30)

        print("🔥 SUNO GENERATE:", res.status_code, res.text)

        if not res.ok:
            return SongGenerationResult(
                task_id="",
                status="FAILED",
                error=f"HTTP_{res.status_code}",
                metadata={"raw": res.text},
            )

        data = res.json()
        task_id = data.get("data", {}).get("taskId")

        return SongGenerationResult(
            task_id=task_id,
            status="PENDING",
            metadata=data,
        )

    # -----------------------------------------------------
    # EXTRACT AUDIO
    # -----------------------------------------------------
    def _extract_audio_urls(self, data):
        urls = []

        try:
            response = data.get("data", {}).get("response", {})
            tracks = response.get("sunoData", [])

            for t in tracks:
                url = (
                        t.get("sourceAudioUrl")  # ✅ BEST (real CDN)
                        or t.get("streamAudioUrl")
                        or t.get("audioUrl")
                )

                # ✅ ONLY accept real URLs
                if url and isinstance(url, str) and url.startswith("http"):
                    urls.append(url)

        except Exception as e:
            print("❌ Extract error:", e)

        return urls

    # -----------------------------------------------------
    # STATUS
    # -----------------------------------------------------
    def get_status(self, task_id):

        url = f"{self.base_url}/api/v1/generate/record-info"

        res = requests.get(
            url,
            params={"taskId": task_id},
            headers=self._headers(),
            timeout=30
        )

        print("🔄 STATUS:", res.status_code, res.text[:300])

        if not res.ok:
            return SongGenerationResult(
                task_id=task_id,
                status="FAILED",
                error=f"HTTP_{res.status_code}",
            )

        data = res.json()

        response = data.get("data", {}).get("response", {})
        status = (response.get("status") or "PENDING").upper()

        audio_urls = self._extract_audio_urls(data)

        return SongGenerationResult(
            task_id=task_id,
            status=status,
            audio_url=audio_urls[0] if audio_urls else None,
            audio_urls=audio_urls,
            metadata=data,
        )