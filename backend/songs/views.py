"""
songs/views.py
Complete API for: generation, library, playback, search/filter, sharing, download, privacy
"""

import json
import struct
import uuid
from datetime import timedelta

from django.http import JsonResponse, HttpResponse
from django.utils import timezone

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

from generation.models import GenerationJob
from generation.selector import get_generator
from generation.strategies import SongGenerationRequest

from quota.models import Quota
from songs.models import Song, ShareLink, Invitation
from songs.utils import song_to_dict


# ─────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────

def job_to_dict(job):
    return {
        "id": job.id,
        "task_id": job.task_id,
        "strategy": job.strategy,
        "status": job.status,
        "audio_url": job.audio_url,
        "created_at": job.created_at.isoformat(),
        "updated_at": job.updated_at.isoformat(),
    }


def _check_quota(user):
    try:
        quota, _ = Quota.objects.get_or_create(
            user=user,
            defaults={"weekly_limit": 10, "reset_date": timezone.now().date()}
        )

        if (timezone.now().date() - quota.reset_date).days >= 7:
            quota.used_this_week = 0
            quota.reset_date = timezone.now().date()
            quota.save()

        used = getattr(quota, "used_this_week", 0)

        if used >= quota.weekly_limit:
            return False, quota

        quota.used_this_week = used + 1
        quota.save()

        return True, quota

    except Exception:
        return True, None


# ─────────────────────────────────────────────────────────────
# LIST SONGS
# ─────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def song_list(request):
    qs = Song.objects.filter(user=request.user).order_by("-created_at")

    search = request.GET.get("search", "")
    genre = request.GET.get("genre", "")
    occasion = request.GET.get("occasion", "")
    privacy = request.GET.get("privacy", "")

    if search:
        qs = qs.filter(title__icontains=search)
    if genre and genre != "all":
        qs = qs.filter(genre=genre)
    if occasion and occasion != "all":
        qs = qs.filter(occasion=occasion)
    if privacy and privacy != "all":
        qs = qs.filter(privacy_status=privacy)

    return JsonResponse({"songs": [song_to_dict(s) for s in qs]})


# ─────────────────────────────────────────────────────────────
# SONG DETAIL (GET / PATCH / DELETE)
# ─────────────────────────────────────────────────────────────

@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def song_detail(request, pk):
    try:
        song = Song.objects.get(pk=pk, user=request.user)
    except Song.DoesNotExist:
        return JsonResponse({"error": "Not found"}, status=404)

    # GET
    if request.method == "GET":
        return JsonResponse({"song": song_to_dict(song)})

    # PATCH
    if request.method == "PATCH":
        body = json.loads(request.body)

        for field in ["title", "genre", "mood", "occasion", "privacy_status"]:
            if field in body:
                setattr(song, field, body[field])

        song.save()
        return JsonResponse({"song": song_to_dict(song)})

    # DELETE (FIXED)
    if request.method == "DELETE":
        song_id = song.id

        ShareLink.objects.filter(song=song).delete()
        Invitation.objects.filter(share_link__song=song).delete()

        song.delete()

        return JsonResponse({
            "message": "Song deleted",
            "id": song_id
        }, status=200)


# ─────────────────────────────────────────────────────────────
# POLL GENERATION STATUS (IMPORTANT FIX - WAS MISSING)
# ─────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def poll_status(request, task_id):

    job = GenerationJob.objects.get(
        task_id=task_id,
        song__user=request.user
    )

    if job.status not in ["SUCCESS", "FAILED"]:
        generator = get_generator(job.strategy)
        result = generator.get_status(task_id)

        job.status = result.status
        job.audio_url = result.audio_url or job.audio_url
        job.raw_response = result.metadata
        job.save()

        job.song.generation_status = (
            Song.GenStatus.READY if result.status == "SUCCESS"
            else Song.GenStatus.GENERATING
        )
        job.song.save()

    return JsonResponse({
        "job": {
            "task_id": job.task_id,
            "status": job.status,
            "audio_url": job.audio_url,
        }
    })


# ─────────────────────────────────────────────────────────────
# PRIVACY UPDATE
# ─────────────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def song_privacy(request, pk):
    try:
        song = Song.objects.get(pk=pk, user=request.user)
    except Song.DoesNotExist:
        return JsonResponse({"error": "Not found"}, status=404)

    body = json.loads(request.body)
    status = body.get("privacy_status", "private")

    if status not in ("private", "public", "shared"):
        return JsonResponse({"error": "Invalid privacy value"}, status=400)

    song.privacy_status = status
    song.save()

    return JsonResponse({"song": song_to_dict(song)})


# ─────────────────────────────────────────────────────────────
# GENERATE SONG
# ─────────────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_song(request):
    body = json.loads(request.body)

    title = body.get("title", "").strip()
    prompt = body.get("prompt", "").strip()
    genre = body.get("genre", "pop")
    mood = body.get("mood", "happy")
    duration = int(body.get("duration", 30))
    mode = body.get("mode", "mock")

    if not title or not prompt:
        return JsonResponse({"error": "title and prompt required"}, status=400)

    song = Song.objects.create(
        title=title,
        genre=genre,
        mood=mood,
        duration=duration,
        generation_status=Song.GenStatus.GENERATING,
        privacy_status=Song.Privacy.PRIVATE,
        user=request.user,
    )

    generator = get_generator(mode)

    req = SongGenerationRequest(
        title=title,
        prompt=prompt,
        style=genre,
        mood=mood,
        duration=duration,
    )

    result = generator.generate(req)

    job = GenerationJob.objects.create(
        song=song,
        task_id=result.task_id,
        strategy=mode,
        status=result.status,
        audio_url=result.audio_url or None,
        raw_response=result.metadata,
    )

    return JsonResponse({
        "song": {
            "id": song.id,
            "title": song.title,
        },
        "task_id": job.task_id,
        "status": job.status,
        "audio_url": job.audio_url,
    }, status=201)


# ─────────────────────────────────────────────────────────────
# DOWNLOAD SONG
# ─────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def download_song(request, pk):
    try:
        song = Song.objects.get(pk=pk, user=request.user)
    except Song.DoesNotExist:
        return JsonResponse({"error": "Not found"}, status=404)

    job = song.generation_jobs.order_by("-created_at").first()

    if job and job.audio_url:
        from django.shortcuts import redirect
        return redirect(job.audio_url)

    return JsonResponse({"error": "No audio available"}, status=404)


# ─────────────────────────────────────────────────────────────
# SHARE SONG
# ─────────────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def share_song(request, pk):
    try:
        song = Song.objects.get(pk=pk, user=request.user)
    except Song.DoesNotExist:
        return JsonResponse({"error": "Not found"}, status=404)

    body = json.loads(request.body)
    make_public = body.get("make_public", False)

    if make_public:
        song.privacy_status = Song.Privacy.PUBLIC
        song.save()

    share_link, _ = ShareLink.objects.get_or_create(
        song=song,
        defaults={
            "url": f"https://chithara.app/shared/{song.id}/{uuid.uuid4().hex[:8]}",
            "expires_at": timezone.now() + timedelta(days=30),
            "is_active": True,
        }
    )

    return JsonResponse({
        "share_url": share_link.url,
        "expires_at": share_link.expires_at.isoformat(),
        "privacy_status": song.privacy_status,
    })


# ─────────────────────────────────────────────────────────────
# INVITE EMAIL
# ─────────────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def invite_email(request):
    body = json.loads(request.body)

    song_id = body.get("song_id")
    email = body.get("email", "").strip()

    if not song_id or not email:
        return JsonResponse({"error": "song_id and email required"}, status=400)

    try:
        song = Song.objects.get(pk=song_id, user=request.user)
    except Song.DoesNotExist:
        return JsonResponse({"error": "Song not found"}, status=404)

    share_link = ShareLink.objects.filter(song=song, is_active=True).first()

    if not share_link:
        share_link = ShareLink.objects.create(
            song=song,
            url=f"https://chithara.app/shared/{song.id}/{uuid.uuid4().hex[:8]}",
            expires_at=timezone.now() + timedelta(days=30),
            is_active=True,
        )

    inv, created = Invitation.objects.get_or_create(
        share_link=share_link,
        email=email,
        defaults={"status": "pending"},
    )

    return JsonResponse({
        "invited": email,
        "share_url": share_link.url,
        "status": inv.status,
        "already_invited": not created,
    })