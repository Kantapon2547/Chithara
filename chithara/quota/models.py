from django.db import models


class Quota(models.Model):
    user = models.OneToOneField("users.Users", on_delete=models.CASCADE)
    weekly_limit = models.IntegerField()
    reset_date = models.DateField()

    def __str__(self):
        return f"Quota for {self.user.username}"
