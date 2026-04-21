from songs.models import Song
from .models import GenerationJob
from .selector import get_generator
from .strategies import SongGenerationRequest


def generate_song(song: Song, prompt: str, mode: str = "mock") -> GenerationJob:
    mode = (mode or "mock").lower().strip()

    generator = get_generator(mode)

    request = SongGenerationRequest(
        title=song.title,
        prompt=prompt,
        style=song.genre,
        mood=song.mood,
        duration=getattr(song, "duration", 30),
    )

    result = generator.generate(request)

    job = GenerationJob.objects.create(
        song=song,
        task_id=result.task_id,
        strategy=mode,
        status=result.status,
        audio_url=result.audio_url,
        raw_response=result.metadata,
    )

    _sync_song_status(song, result)

    return job


def _sync_song_status(song: Song, result):

    if result.status == "SUCCESS":
        song.generation_status = Song.GenStatus.READY

    elif result.status == "FAILED":
        song.generation_status = Song.GenStatus.FAILED

    else:
        song.generation_status = Song.GenStatus.GENERATING

    song.save(update_fields=["generation_status"])


def refresh_job_status(job: GenerationJob) -> GenerationJob:
    mode = (job.strategy or "mock").lower().strip()

    generator = get_generator(mode)

    result = generator.get_status(job.task_id)

    job.status = result.status
    job.raw_response = result.metadata

    if result.audio_url:
        job.audio_url = result.audio_url

    job.save(update_fields=["status", "audio_url", "raw_response", "updated_at"])

    _sync_song_status(job.song, result)

    return job
