def song_to_dict(song):
    job = song.generation_jobs.order_by("-created_at").first()

    # safe defaults
    audio_urls = []

    if job:
        # support both single + future multi track field
        if job.audio_url:
            audio_urls.append(job.audio_url)

        # optional future field support (if you add it later)
        if hasattr(job, "audio_urls") and job.audio_urls:
            audio_urls = job.audio_urls

    return {
        "id": song.id,
        "title": song.title,
        "genre": song.genre,
        "mood": song.mood,
        "occasion": song.occasion,
        "generation_status": song.generation_status,
        "privacy_status": song.privacy_status,
        "duration": song.duration,
        "created_at": song.created_at.isoformat(),

        # ✅ IMPORTANT
        "task_id": job.task_id if job else None,
        "audio_url": job.audio_url if job else None,
        "audio_urls": job.audio_urls if job else [],
        "strategy": job.strategy if job else None,
    }