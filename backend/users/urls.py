from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from .views import profile_view, quota_view, google_auth_view, register_view


urlpatterns = [
    path("login/", TokenObtainPairView.as_view()),
    path("refresh/", TokenRefreshView.as_view()),
    path("profile/", profile_view),
    path("quota/", quota_view),
    path("google-login/", google_auth_view),
    path("register/", register_view),
]