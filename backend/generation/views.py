from rest_framework.decorators import api_view
from rest_framework.response import Response

from songs.models import Song
from generation.services import generate_song


@api_view(["POST"])
def generate(request):
    data = request.data

    print("🔥 REQUEST DATA:", data)

    song_id = data.get("song_id")
    prompt = data.get("prompt", "")

    # 🔥 THIS IS THE CRITICAL PART
    mode = data.get("mode", "mock")

    if not song_id:
        return Response({"error": "song_id required"}, status=400)

    song = Song.objects.get(id=song_id)

    job = generate_song(
        song=song,
        prompt=prompt,
        mode=mode
    )

    return Response({
        "task_id": job.task_id,
        "status": job.status,
        "audio_url": job.audio_url,
    })