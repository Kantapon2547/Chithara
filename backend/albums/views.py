import json
import uuid
from datetime import timedelta

from django.http import JsonResponse
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

from .models import Album
from songs.models import Song, ShareLink, Invitation
from songs.utils import song_to_dict


# =========================
# SERIALIZER
# =========================
def album_to_dict(album):
    return {
        "id": album.id,
        "title": album.title,
        "release_date": str(album.release_date) if album.release_date else None,
        "song_count": album.songs.count(),
    }


# =========================
# ALBUM LIST
# =========================
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def album_list(request):

    if request.method == "GET":
        albums = Album.objects.filter(user=request.user).order_by("-id")

        return JsonResponse({
            "albums": [album_to_dict(a) for a in albums]
        })

    body = json.loads(request.body or "{}")

    album = Album.objects.create(
        title=body.get("title", "New Album"),
        release_date=body.get("release_date"),
        user=request.user,
    )

    return JsonResponse({"album": album_to_dict(album)}, status=201)


# =========================
# ALBUM DETAIL
# =========================
@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def album_detail(request, pk):

    try:
        album = Album.objects.get(pk=pk, user=request.user)
    except Album.DoesNotExist:
        return JsonResponse({"error": "Not found"}, status=404)

    if request.method == "GET":
        return JsonResponse({"album": album_to_dict(album)})

    if request.method == "PATCH":
        body = json.loads(request.body or "{}")

        if "title" in body:
            album.title = body["title"]

        album.save()
        return JsonResponse({"album": album_to_dict(album)})

    if request.method == "DELETE":
        album.delete()
        return JsonResponse({"deleted": pk})


# =========================
# ALBUM SONGS
# =========================
@api_view(["GET", "POST", "DELETE"])
@permission_classes([IsAuthenticated])
def album_songs(request, pk):

    try:
        album = Album.objects.get(pk=pk, user=request.user)
    except Album.DoesNotExist:
        return JsonResponse({"error": "Not found"}, status=404)

    # GET songs
    if request.method == "GET":
        songs = album.songs.prefetch_related("generation_jobs").all()

        return JsonResponse({
            "album": album_to_dict(album),
            "songs": [song_to_dict(s) for s in songs]
        })

    body = json.loads(request.body or "{}")
    song_id = body.get("song_id")

    if not song_id:
        return JsonResponse({"error": "song_id required"}, status=400)

    try:
        song = Song.objects.get(pk=song_id, user=request.user)

        if request.method == "POST":
            album.songs.add(song)

        if request.method == "DELETE":
            album.songs.remove(song)

        songs = album.songs.prefetch_related("generation_jobs").all()

        return JsonResponse({
            "songs": [song_to_dict(s) for s in songs]
        })

    except Song.DoesNotExist:
        return JsonResponse({"error": "Song not found"}, status=404)


# =========================
# SHARE ALBUM
# =========================
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_album_share(request, pk):

    try:
        album = Album.objects.get(pk=pk, user=request.user)
    except Album.DoesNotExist:
        return JsonResponse({"error": "Not found"}, status=404)

    body = json.loads(request.body or "{}")
    emails = body.get("emails", [])

    token = str(uuid.uuid4())
    url = f"http://localhost:3000/shared/album/{token}"

    share = ShareLink.objects.create(
        album=album,
        url=url,
        expires_at=timezone.now() + timedelta(days=7),
    )

    for email in emails:
        Invitation.objects.create(
            share_link=share,
            email=email
        )

        send_mail(
            subject=f"🎵 {album.title} shared with you",
            message=f"Listen here:\n{url}",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=True,
        )

    return JsonResponse({
        "url": url,
        "expires_at": share.expires_at.isoformat()
    })
