"""
songs/views.py
Handles: song list, generate, poll status, download
"""

import json
import requests
from django.http import JsonResponse, HttpResponse, StreamingHttpResponse
from django.shortcuts import redirect
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

from generation.models import GenerationJob
from generation.strategies import (
    MockSongGeneratorStrategy,
    SunoSongGeneratorStrategy,
    SongGenerationRequest,
)

import uuid
from django.utils import timezone
from datetime import timedelta
from songs.models import Song
from django.core.mail import send_mail
from django.conf import settings
from songs.models import ShareLink, Invitation


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
# 🔄 POLL STATUS
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
        return JsonResponse({"error": "Song not found"}, status=404)

    job = song.generation_jobs.order_by("-created_at").first()

    if not job or not job.audio_url:
        return JsonResponse({"error": "No audio available"}, status=404)

    try:
        # 🔥 DEBUG PRINT
        print("Downloading from:", job.audio_url)

        r = requests.get(job.audio_url, stream=True, timeout=10)

        if r.status_code != 200:
            print("Bad response:", r.status_code)
            return JsonResponse({"error": "Failed to fetch audio"}, status=400)

        content_type = r.headers.get("Content-Type", "audio/mpeg")

        filename = f"{song.title or 'song'}.mp3"

        response = StreamingHttpResponse(
            r.iter_content(chunk_size=8192),
            content_type=content_type
        )

        response["Content-Disposition"] = f'attachment; filename="{filename}"'

        return response

    except Exception as e:
        print("DOWNLOAD ERROR:", str(e))  # 🔥 IMPORTANT
        return JsonResponse({"error": str(e)}, status=500)


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


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_share_link(request, pk):
    try:
        song = Song.objects.get(pk=pk, user=request.user)
    except Song.DoesNotExist:
        return JsonResponse({"error": "Not found"}, status=404)

    body = json.loads(request.body)
    emails = body.get("emails", [])

    # ✅ generate unique token
    token = str(uuid.uuid4())

    # frontend route (React page)
    url = f"http://localhost:3000/shared/{token}"

    share = ShareLink.objects.create(
        song=song,
        url=url,
        expires_at=timezone.now() + timedelta(days=7),
    )

    # ✅ update privacy → SHARED
    song.privacy_status = Song.Privacy.SHARED
    song.save(update_fields=["privacy_status"])

    # ✅ send emails
    for email in emails:
        Invitation.objects.create(
            share_link=share,
            email=email
        )

        send_mail(
            subject="🎵 You've been invited to a song",
            message=f"Listen here:\n{url}",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=True,  # prevents crash
        )

    return JsonResponse({
        "url": url,
        "expires_at": share.expires_at.isoformat()
    })


@api_view(["GET"])
def get_shared_song(request, token):
    try:
        share = ShareLink.objects.select_related("song").get(
            url__endswith=token,
            is_active=True
        )
    except ShareLink.DoesNotExist:
        return JsonResponse({"error": "Invalid link"}, status=404)

    if share.expires_at < timezone.now():
        return JsonResponse({"error": "Link expired"}, status=403)

    return JsonResponse({
        "song": song_to_dict(share.song)
    })

@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def update_privacy(request, pk):
    try:
        song = Song.objects.get(pk=pk, user=request.user)
    except Song.DoesNotExist:
        return JsonResponse({"error": "Not found"}, status=404)

    body = json.loads(request.body)
    privacy = body.get("privacy_status")

    if privacy not in ["private", "public", "shared"]:
        return JsonResponse({"error": "Invalid value"}, status=400)

    song.privacy_status = privacy
    song.save(update_fields=["privacy_status"])

    return JsonResponse({"success": True})