# ─────────────────────────────────────────────────────────────
# helpers
# ─────────────────────────────────────────────────────────────

def song_to_dict(song):
    job = song.generation_jobs.order_by("-created_at").first()
    return {
        "id":                song.id,
        "title":             song.title,
        "genre":             song.genre,
        "mood":              song.mood,
        "occasion":          song.occasion,
        "generation_status": song.generation_status,
        "privacy_status":    song.privacy_status,
        "duration":          song.duration,
        "created_at":        song.created_at.isoformat(),
        "task_id":           job.task_id if job else None,
        "audio_url":         job.audio_url if job else None,
        "strategy":          job.strategy if job else None,
    }