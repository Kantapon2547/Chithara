from django.db import models
from django.conf import settings


class Song(models.Model):
    # --- Enumerations ---
    class Genre(models.TextChoices):
        POP = 'pop', 'Pop'
        ROCK = 'rock', 'Rock'
        RNB = 'r&b', 'R&B'
        JAZZ = 'jazz', 'Jazz'
        CLASSICAL = 'classical', 'Classical'

    class Mood(models.TextChoices):
        HAPPY = 'happy', 'Happy'
        SAD = 'sad', 'Sad'
        RELAXED = 'relaxed', 'Relaxed'
        ENERGETIC = 'energetic', 'Energetic'
        CHILL = 'chill', 'Chill'

    class GenStatus(models.TextChoices):
        PENDING = 'pending', 'Pending'
        GENERATING = 'generating', 'Generating'
        READY = 'ready', 'Ready'
        FAILED = 'failed', 'Failed'

    class Privacy(models.TextChoices):
        PRIVATE = 'private', 'Private'
        PUBLIC = 'public', 'Public'
        SHARED = 'shared', 'Shared'

    class Occasion(models.TextChoices):
        STUDY = 'study', 'Study'
        PARTY = 'party', 'Party'
        SLEEP = 'sleep', 'Sleep'
        WORKOUT = 'workout', 'Workout'

    title = models.CharField(max_length=200)
    genre = models.CharField(max_length=20, choices=Genre.choices, default=Genre.POP)
    mood = models.CharField(max_length=20, choices=Mood.choices, default=Mood.HAPPY)
    occasion = models.CharField(max_length=20, choices=Occasion.choices, default=Occasion.STUDY)

    generation_status = models.CharField(
        max_length=20,
        choices=GenStatus.choices,
        default=GenStatus.PENDING
    )

    privacy_status = models.CharField(
        max_length=20,
        choices=Privacy.choices,
        default=Privacy.PRIVATE
    )

    duration = models.IntegerField(help_text="Duration in seconds")
    created_at = models.DateTimeField(auto_now_add=True)

    # ✅ FIXED USER RELATION
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="songs"
    )

    # album relation is OK
    album = models.ForeignKey(
        "albums.Album",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="songs"
    )

    def __str__(self):
        return self.title


class ShareLink(models.Model):
    song = models.OneToOneField('Song', on_delete=models.CASCADE, null=True, blank=True)
    album = models.OneToOneField('albums.Album', on_delete=models.CASCADE, null=True, blank=True)

    url = models.URLField()
    expires_at = models.DateTimeField()
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.url


class Invitation(models.Model):
    share_link = models.ForeignKey(
        ShareLink,
        on_delete=models.CASCADE,
        related_name='invitations'
    )
    email = models.EmailField()
    status = models.CharField(max_length=20, default='pending')

    def __str__(self):
        return f"Invite for {self.email}"