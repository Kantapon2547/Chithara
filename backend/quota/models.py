from django.db import models
from django.conf import settings


class Quota(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,  # ✅ FIX
        on_delete=models.CASCADE
    )
    weekly_limit = models.IntegerField()
    reset_date = models.DateField()

    def __str__(self):
        return f"Quota for {self.user.username}"