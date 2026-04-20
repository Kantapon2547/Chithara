from django.db import models
from django.conf import settings


class Album(models.Model):
    title = models.CharField(max_length=200)
    release_date = models.DateField()

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,  # ✅ FIX HERE
        on_delete=models.CASCADE,
        related_name="albums"
    )

    def __str__(self):
        return self.title