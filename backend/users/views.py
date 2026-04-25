from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from quota.models import Quota

import requests as http_requests

from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from django.conf import settings


# ─────────────────────────────────────────────
#  Existing views
# ─────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def profile_view(request):
    user = request.user
    return Response({"id": user.id, "username": user.username, "email": user.email})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def quota_view(request):
    quota, _ = Quota.objects.get_or_create(
        user=request.user,
        defaults={"weekly_limit": 10, "used_this_week": 0, "reset_date": timezone.now().date()}
    )
    if (timezone.now().date() - quota.reset_date).days >= 7:
        quota.used_this_week = 0
        quota.reset_date = timezone.now().date()
        quota.save()

    return Response({
        "used":      quota.used_this_week,
        "limit":     quota.weekly_limit,
        "remaining": max(0, quota.weekly_limit - quota.used_this_week),
    })


# ─────────────────────────────────────────────
#  Google OAuth login
# ─────────────────────────────────────────────
@api_view(["POST"])
@permission_classes([AllowAny])
def google_auth_view(request):
    token = request.data.get("token")

    if not token:
        return Response({"error": "Token required"}, status=400)

    # VERIFY GOOGLE TOKEN
    try:
        google_data = id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID
        )

        # issuer validation
        if google_data.get("iss") not in [
            "accounts.google.com",
            "https://accounts.google.com"
        ]:
            return Response({"error": "Invalid issuer"}, status=401)

    except Exception:
        return Response({"error": "Invalid Google token"}, status=401)

    email = google_data.get("email")
    if not email:
        return Response({"error": "Email not provided"}, status=400)

    # USER CREATE / GET
    user, created = User.objects.get_or_create(
        username=email,
        defaults={
            "email": email,
            "first_name": google_data.get("given_name", ""),
            "last_name": google_data.get("family_name", ""),
        }
    )

    Quota.objects.get_or_create(
        user=user,
        defaults={"weekly_limit": 10, "used_this_week": 0, "reset_date": timezone.now().date()}
    )

    # JWT
    refresh = RefreshToken.for_user(user)

    return Response({
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "user": {
            "id": user.id,
            "email": user.email,
            "username": user.username
        },
        "created": created
    })

@api_view(["POST"])
@permission_classes([AllowAny])
def register_view(request):
    username = request.data.get("username")
    email = request.data.get("email")
    password = request.data.get("password")

    if not username or not password:
        return Response(
            {"error": "Username and password required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    if User.objects.filter(username=username).exists():
        return Response(
            {"error": "Username already exists"},
            status=status.HTTP_400_BAD_REQUEST
        )

    user = User.objects.create_user(
        username=username,
        email=email,
        password=password
    )

    refresh = RefreshToken.for_user(user)

    return Response({
        "access": str(refresh.access_token),
        "refresh": str(refresh),
    })
