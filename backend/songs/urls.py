from django.urls import path
from . import views

urlpatterns = [
    path("songs/",                 views.song_list,      name="song-list"),
    path("songs/<int:pk>/",        views.song_detail,    name="song-detail"),
    path("songs/<int:pk>/privacy/",views.song_privacy,   name="song-privacy"),
    path("generate/",              views.generate_song,  name="generate"),
    path("status/<str:task_id>/",  views.poll_status,    name="poll-status"),
    path("download/<int:pk>/",     views.download_song,  name="download"),
    path("share/<int:pk>/",        views.share_song,     name="share"),
    path("invite/",                views.invite_email,   name="invite"),
]