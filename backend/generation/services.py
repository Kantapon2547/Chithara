from songs.models import Song
from .models import GenerationJob
from .selector import get_generator
from .strategies import SongGenerationRequest


# =========================================================
# GENERATE SONG JOB (SAFE + IDEMPOTENT)
# =========================================================

def generate_song(song: Song, prompt: str, mode: str = "mock") -> GenerationJob:

    mode = (mode or "mock").lower().strip()
    generator = get_generator(mode)

    request = SongGenerationRequest(
        title=song.title,
        prompt=prompt,
        style=getattr(song, "genre", "pop"),
    )

    result = generator.generate(request)

    # 🔥 FIX: prevent duplicate task_id crash
    job, _ = GenerationJob.objects.get_or_create(
        task_id=result.task_id,
        defaults={
            "song": song,
            "strategy": mode,
            "status": result.status,
            "audio_url": result.audio_url,
            "raw_response": result.metadata or {},
        }
    )

    _sync_song_status(song, result)

    return job


# =========================================================
# SYNC SONG STATUS
# =========================================================

def _sync_song_status(song: Song, result):

    if not hasattr(song, "generation_status"):
        return

    if result.status == "SUCCESS":
        song.generation_status = "READY"

    elif result.status == "FAILED":
        song.generation_status = "FAILED"

    else:
        song.generation_status = "GENERATING"

    song.save(update_fields=["generation_status"])


# =========================================================
# REFRESH JOB STATUS (POLLING)
# =========================================================

def refresh_job_status(job: GenerationJob) -> GenerationJob:

    mode = (job.strategy or "mock").lower().strip()
    generator = get_generator(mode)

    result = generator.get_status(job.task_id)

    job.status = result.status
    job.raw_response = result.metadata or {}

    if result.audio_url:
        job.audio_url = result.audio_url

    job.save(update_fields=["status", "audio_url", "raw_response", "updated_at"])

    _sync_song_status(job.song, result)

    return job


def save_job_from_result(job, result):

    # Extract Suno response safely
    record = (
        result.metadata
        .get("data", {})
        .get("response", {})
    )

    tracks = record.get("sunoData", [])

    audio_urls = [
        t.get("audioUrl")
        for t in tracks
        if t.get("audioUrl")
    ]

    # -----------------------------
    # SAVE TO DATABASE
    # -----------------------------
    job.status = record.get("status", result.status)

    job.audio_urls = audio_urls

    job.audio_url = audio_urls[0] if audio_urls else None

    job.raw_response = result.metadata

    job.save()