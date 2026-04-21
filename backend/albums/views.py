import json
from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from .models import Album
from songs.models import Song
from songs.utils import song_to_dict


def album_to_dict(album):
    return {
        "id":           album.id,
        "title":        album.title,
        "release_date": str(album.release_date),
        "song_count":   album.songs.count(),
    }


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def album_list(request):
    if request.method == "GET":
        albums = Album.objects.filter(user=request.user).order_by("-id")
        return JsonResponse({"albums": [album_to_dict(a) for a in albums]})

    body = json.loads(request.body)
    from django.utils import timezone
    album = Album.objects.create(
        title=body.get("title", "New Album"),
        release_date=body.get("release_date", timezone.now().date()),
        user=request.user,
    )
    return JsonResponse({"album": album_to_dict(album)}, status=201)


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
        body = json.loads(request.body)
        if "title" in body:
            album.title = body["title"]
        album.save()
        return JsonResponse({"album": album_to_dict(album)})
    if request.method == "DELETE":
        album.delete()
        return JsonResponse({"deleted": pk})


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def album_songs(request, pk):
    try:
        album = Album.objects.get(pk=pk, user=request.user)
    except Album.DoesNotExist:
        return JsonResponse({"error": "Not found"}, status=404)

    if request.method == "GET":
        songs = album.songs.prefetch_related("generation_jobs").all()
        return JsonResponse({"songs": [song_to_dict(s) for s in songs]})

    # POST: add song to album
    body = json.loads(request.body)
    song_id = body.get("song_id")
    try:
        song = Song.objects.get(pk=song_id, user=request.user)
        song.album = album
        song.save(update_fields=["album"])
        return JsonResponse({"song": song_to_dict(song)})
    except Song.DoesNotExist:
        return JsonResponse({"error": "Song not found"}, status=404)