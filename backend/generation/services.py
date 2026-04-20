"""
generation/services.py

Application-level service that:
  1. Picks the active strategy via get_generator()
  2. Calls generate()
  3. Persists a GenerationJob row
"""

from songs.models import Song

from .models import GenerationJob
from .selector import get_generator
from .strategies import SongGenerationRequest


def generate_song(song: Song, prompt: str) -> GenerationJob:
    """
    Kick off song generation for the given Song instance.
    Returns the persisted GenerationJob.
    """
    generator = get_generator()

    request = SongGenerationRequest(
        title=song.title,
        prompt=prompt,
        style=song.genre,
        mood=song.mood,
    )

    result = generator.generate(request)

    # Determine which strategy name to store
    strategy_name = type(generator).__name__.replace("SongGeneratorStrategy", "").lower()
    if strategy_name.startswith("mock"):
        strategy_name = "mock"
    elif strategy_name.startswith("suno"):
        strategy_name = "suno"

    job = GenerationJob.objects.create(
        song=song,
        task_id=result.task_id,
        strategy=strategy_name,
        status=result.status,
        audio_url=result.audio_url or "",
        raw_response=result.metadata,
    )

    # Mirror status back onto the Song model
    if result.status == "SUCCESS":
        song.generation_status = Song.GenStatus.READY
    elif result.status == "FAILED":
        song.generation_status = Song.GenStatus.FAILED
    else:
        song.generation_status = Song.GenStatus.GENERATING
    song.save(update_fields=["generation_status"])

    return job


def refresh_job_status(job: GenerationJob) -> GenerationJob:
    """
    Poll the strategy for the latest status of an existing job and update DB.
    """
    generator = get_generator()
    result = generator.get_status(job.task_id)

    job.status = result.status
    if result.audio_url:
        job.audio_url = result.audio_url
    job.raw_response = result.metadata
    job.save(update_fields=["status", "audio_url", "raw_response", "updated_at"])

    return job
