from django.db import models


class Album(models.Model):
    title = models.CharField(max_length=200)
    release_date = models.DateField()

    user = models.ForeignKey(
        "users.Users",
        on_delete=models.CASCADE,
        related_name="albums"
    )

    def __str__(self):
        return self.title