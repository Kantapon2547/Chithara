from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from songs.models import Song
from generation.factory import get_song_strategy
from generation.context import SongGenerationContext


# =========================================================
# GENERATE SONG ENDPOINT
# =========================================================

@api_view(["POST"])
def generate(request):
    data = request.data

    # -----------------------------
    # INPUT DEBUG (remove in production later)
    # -----------------------------
    # print("REQUEST DATA:", data)

    song_id = data.get("song_id")
    prompt = data.get("prompt", "")
    mode = (data.get("mode") or "suno").lower().strip()

    # -----------------------------
    # VALIDATION
    # -----------------------------
    if not song_id:
        return Response({"error": "song_id required"}, status=400)

    if not prompt:
        return Response({"error": "prompt required"}, status=400)

    # -----------------------------
    # GET SONG
    # -----------------------------
    song = get_object_or_404(Song, id=song_id)

    # -----------------------------
    # STRATEGY PATTERN (IMPORTANT PART)
    # -----------------------------
    strategy = get_song_strategy(mode)
    context = SongGenerationContext(strategy)

    # Build request object for strategy layer
    generation_request = {
        "title": song.title,
        "prompt": prompt,
        "style": getattr(song, "style", "pop"),
    }

    # -----------------------------
    # GENERATE SONG
    # -----------------------------
    try:
        job = context.generate(generation_request)
    except Exception as e:
        return Response(
            {
                "error": "generation_failed",
                "detail": str(e),
            },
            status=500,
        )

    # -----------------------------
    # RESPONSE (UNIFIED FORMAT)
    # -----------------------------
    return Response(
        {
            "task_id": job.task_id,
            "status": job.status,
            "audio_url": job.audio_url,
            "audio_urls": job.audio_urls,
            "error": job.error,
        },
        status=200,
    )