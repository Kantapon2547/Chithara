from django.db import models


class Users(models.Model):
    email = models.EmailField()
    username = models.CharField(max_length=100)

    def __str__(self):
        return self.username