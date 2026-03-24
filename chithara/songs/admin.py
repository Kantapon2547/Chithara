from django.contrib import admin
from .models import Song, ShareLink, Invitation

admin.site.register(Song)
admin.site.register(ShareLink)
admin.site.register(Invitation)
