"""
generation/models.py

Stores a GenerationJob per song-generation task so that:
  - the taskId returned by Suno (or mock) is persisted
  - status can be polled / updated later
"""

from django.db import models


class GenerationJob(models.Model):

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        TEXT_SUCCESS = "TEXT_SUCCESS", "Text Success"
        FIRST_SUCCESS = "FIRST_SUCCESS", "First Success"
        SUCCESS = "SUCCESS", "Success"
        FAILED = "FAILED", "Failed"

    song = models.ForeignKey(
        "songs.Song",
        on_delete=models.CASCADE,
        related_name="generation_jobs",
    )

    task_id = models.CharField(max_length=200, unique=True)
    strategy = models.CharField(max_length=20, default="mock")

    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.PENDING,
    )

    # ✅ MAIN playable audio
    audio_url = models.URLField(blank=True, null=True)

    # 🔥 NEW: store ALL outputs from Suno
    audio_urls = models.JSONField(default=list, blank=True)

    raw_response = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"GenerationJob({self.task_id}, {self.status})"
