from django.urls import path
from . import views

urlpatterns = [
    path("albums/",          views.album_list,   name="album-list"),
    path("albums/<int:pk>/", views.album_detail, name="album-detail"),
    path("albums/<int:pk>/songs/", views.album_songs),
    path("albums/<int:pk>/share/", views.create_album_share),
]