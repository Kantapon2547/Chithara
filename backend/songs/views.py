"""
songs/views.py
Handles: song list, generate, poll status, download
"""

import json
from django.http import JsonResponse, HttpResponse
from django.shortcuts import redirect
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

from generation.models import GenerationJob
from generation.strategies import (
    MockSongGeneratorStrategy,
    SunoSongGeneratorStrategy,
    SongGenerationRequest,
)
from songs.models import Song


# =========================================================
# 🔥 HELPERS
# =========================================================

def _extract_audio_urls(record):
    """
    Extract BEST possible audio URLs from Suno response
    """
    urls = []

    for t in record.get("sunoData", []):
        url = (
            t.get("sourceAudioUrl")   # ✅ BEST
            or t.get("streamAudioUrl")
            or t.get("audioUrl")
        )

        if url:
            urls.append(url)

    return urls


def song_to_dict(song):
    job = song.generation_jobs.order_by("-created_at").first()

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

        # 🔥 IMPORTANT
        "task_id": job.task_id if job else None,
        "audio_url": job.audio_url if job else None,
        "audio_urls": getattr(job, "audio_urls", []) if job else [],
        "strategy": job.strategy if job else None,
    }


def job_to_dict(job):
    return {
        "id": job.id,
        "task_id": job.task_id,
        "strategy": job.strategy,
        "status": job.status,
        "audio_url": job.audio_url,
        "audio_urls": getattr(job, "audio_urls", []),
        "created_at": job.created_at.isoformat(),
        "updated_at": job.updated_at.isoformat(),
    }


def _get_generator_for(strategy_name):
    if (strategy_name or "").lower().strip() == "suno":
        return SunoSongGeneratorStrategy()
    return MockSongGeneratorStrategy()


# =========================================================
# 🎵 SONG LIST
# =========================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def song_list(request):
    qs = Song.objects.filter(user=request.user).prefetch_related("generation_jobs")

    return JsonResponse({
        "songs": [song_to_dict(s) for s in qs]
    })


# =========================================================
# 🚀 GENERATE SONG
# =========================================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_song(request):

    try:
        body = json.loads(request.body)
    except:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    title    = body.get("title", "").strip()
    prompt   = body.get("prompt", "").strip()
    genre    = body.get("genre", "pop")
    mood     = body.get("mood", "happy")
    occasion = body.get("occasion", "study")
    duration = int(body.get("duration", 30))
    strategy = body.get("strategy", "mock").lower().strip()

    if not title or not prompt:
        return JsonResponse({"error": "title and prompt required"}, status=400)

    song = Song.objects.create(
        title=title,
        genre=genre,
        mood=mood,
        occasion=occasion,
        duration=duration,
        generation_status=Song.GenStatus.GENERATING,
        privacy_status=Song.Privacy.PRIVATE,
        user=request.user,
    )

    try:
        generator = _get_generator_for(strategy)

        req = SongGenerationRequest(
            title=title,
            prompt=prompt,
            style=genre,
        )

        result = generator.generate(req)

        job = GenerationJob.objects.create(
            song=song,
            task_id=result.task_id,
            strategy=strategy,
            status=result.status,
            audio_url=result.audio_url or "",
            audio_urls=result.audio_urls or [],   # ✅ IMPORTANT
            raw_response=result.metadata,
        )

        song.generation_status = (
            Song.GenStatus.READY if result.status == "SUCCESS"
            else Song.GenStatus.GENERATING
        )
        song.save(update_fields=["generation_status"])

        return JsonResponse({
            "song": song_to_dict(song),
            "job": job_to_dict(job),
        }, status=201)

    except Exception as e:
        song.generation_status = Song.GenStatus.FAILED
        song.save(update_fields=["generation_status"])
        return JsonResponse({"error": str(e)}, status=500)


# =========================================================
# 🔄 POLL STATUS (🔥 MAIN FIX)
# =========================================================

# =========================================================
# POLL STATUS (FINAL SAVE FIX)
# =========================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def poll_status(request, task_id):

    try:
        job = GenerationJob.objects.select_related("song").get(
            task_id=task_id,
            song__user=request.user
        )
    except GenerationJob.DoesNotExist:
        return JsonResponse({"error": "Job not found"}, status=404)

    # already done
    if job.status in ("SUCCESS", "FAILED"):
        return JsonResponse({"job": job_to_dict(job)})

    try:
        generator = _get_generator_for(job.strategy)
        result = generator.get_status(task_id)

        job.status = result.status
        job.raw_response = result.metadata

        # ✅ SAVE AUDIO (clean + reliable)
        if result.audio_urls:
            job.audio_urls = result.audio_urls
            job.audio_url = result.audio_urls[0]

        elif result.audio_url:
            job.audio_url = result.audio_url
            job.audio_urls = [result.audio_url]

        job.save()

        # ✅ update song status
        if result.status == "SUCCESS":
            job.song.generation_status = Song.GenStatus.READY
            job.song.save(update_fields=["generation_status"])

        elif result.status == "FAILED":
            job.song.generation_status = Song.GenStatus.FAILED
            job.song.save(update_fields=["generation_status"])

        return JsonResponse({"job": job_to_dict(job)})

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


# =========================================================
# ⬇ DOWNLOAD
# =========================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def download_song(request, pk):

    try:
        song = Song.objects.prefetch_related("generation_jobs").get(
            pk=pk,
            user=request.user
        )
    except Song.DoesNotExist:
        return JsonResponse({"error": "Not found"}, status=404)

    job = song.generation_jobs.order_by("-created_at").first()

    if job and job.audio_url:
        return redirect(job.audio_url)

    return JsonResponse({"error": "No audio available"}, status=404)


# =========================================================
# ✏️ SONG DETAIL
# =========================================================

@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def song_detail(request, pk):
    try:
        song = Song.objects.prefetch_related("generation_jobs").get(
            pk=pk, user=request.user
        )
    except Song.DoesNotExist:
        return JsonResponse({"error": "Not found"}, status=404)

    if request.method == "GET":
        return JsonResponse({"song": song_to_dict(song)})

    if request.method == "PATCH":
        body = json.loads(request.body)
        for f in ["title", "genre", "mood", "occasion", "privacy_status"]:
            if f in body:
                setattr(song, f, body[f])
        song.save()
        return JsonResponse({"song": song_to_dict(song)})

    if request.method == "DELETE":
        song.delete()
        return JsonResponse({"deleted": pk})