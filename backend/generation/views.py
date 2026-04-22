from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from songs.models import Song
from generation.services import generate_song
from django.shortcuts import get_object_or_404


@api_view(["POST"])
def generate(request):
    data = request.data

    print("🔥 REQUEST DATA:", data)

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
    # GENERATE
    # -----------------------------
    try:
        job = generate_song(song=song, prompt=prompt, mode=mode)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

    # -----------------------------
    # FAILED CASE
    # -----------------------------
    if job.status == "FAILED":
        return Response({
            "task_id": job.task_id,
            "status": job.status,
            "error": job.raw_response or "generation_failed",
        }, status=500)

    # -----------------------------
    # SUCCESS RESPONSE
    # -----------------------------
    return Response({
        "task_id": job.task_id,
        "status": job.status,

        # IMPORTANT: support multi-track UI
        "audio_url": job.audio_url,
        "audio_urls": getattr(job, "audio_urls", []),
    }, status=200)