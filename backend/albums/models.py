from django.db import models
from django.conf import settings
import uuid


class Album(models.Model):
    title = models.CharField(max_length=200)
    release_date = models.DateField(null=True, blank=True)

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="albums"
    )

    # album cover
    cover_image = models.URLField(null=True, blank=True)

    # share system
    share_token = models.CharField(
        max_length=64,
        blank=True,
        null=True,
        unique=True
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

    @property
    def song_count(self):
        return self.songs.count()

    def generate_share_token(self):
        self.share_token = uuid.uuid4().hex[:10]
        self.save()
