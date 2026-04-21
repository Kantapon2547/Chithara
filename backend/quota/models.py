from django.db import models
from django.conf import settings


class Quota(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    weekly_limit = models.IntegerField(default=10)
    used_this_week = models.IntegerField(default=0)
    reset_date = models.DateField()

    def __str__(self):
        return f"Quota for {self.user.username} ({self.used_this_week}/{self.weekly_limit})"