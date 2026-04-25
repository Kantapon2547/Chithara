from django.urls import path
from . import views

urlpatterns = [
    path("songs/",                 views.song_list,      name="song-list"),
    path("songs/<int:pk>/",        views.song_detail,    name="song-detail"),
    path("generate/",              views.generate_song,  name="generate"),
    path("status/<str:task_id>/",  views.poll_status,    name="poll-status"),
    path("download/<int:pk>/",     views.download_song,  name="download"),

    path("share/<int:pk>/", views.create_share_link),
    path("shared/<str:token>/", views.get_shared_song),
    path("privacy/<int:pk>/", views.update_privacy),

]