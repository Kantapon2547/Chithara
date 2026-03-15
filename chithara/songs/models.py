from django.db import models


class Song(models.Model):
    title = models.CharField(max_length=200)
    duration = models.IntegerField(help_text="Duration in seconds")
    created_at = models.DateTimeField(auto_now_add=True)

    user = models.ForeignKey(
        "users.Users",
        on_delete=models.CASCADE,
        related_name="songs"
    )

    album = models.ForeignKey(
        "albums.Album",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="songs"
    )

    def __str__(self):
        return self.title