from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from quota.models import Quota

import requests as http_requests


# ─────────────────────────────────────────────
#  Existing views (unchanged)
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
#  NEW: Google OAuth login
# ─────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([AllowAny])
def google_auth_view(request):
    """
    Accepts: { "token": "<Google ID token>" }
    Verifies with Google, finds-or-creates a Django user,
    and returns SimpleJWT access + refresh tokens.
    """
    google_token = request.data.get("token")
    if not google_token:
        return Response({"error": "Token is required"}, status=status.HTTP_400_BAD_REQUEST)

    # 1. Verify the token with Google
    google_resp = http_requests.get(
        "https://oauth2.googleapis.com/tokeninfo",
        params={"id_token": google_token},
        timeout=10,
    )

    if google_resp.status_code != 200:
        return Response({"error": "Invalid Google token"}, status=status.HTTP_401_UNAUTHORIZED)

    google_data = google_resp.json()

    # 2. Check audience matches your Client ID
    from django.conf import settings
    if google_data.get("aud") != settings.GOOGLE_CLIENT_ID:
        return Response({"error": "Token audience mismatch"}, status=status.HTTP_401_UNAUTHORIZED)

    email = google_data.get("email")
    if not email:
        return Response({"error": "Email not provided by Google"}, status=status.HTTP_400_BAD_REQUEST)

    # 3. Find or create the user
    user, created = User.objects.get_or_create(
        email=email,
        defaults={
            "username": email.split("@")[0],
            "first_name": google_data.get("given_name", ""),
            "last_name": google_data.get("family_name", ""),
        }
    )

    # 4. Issue JWT tokens
    refresh = RefreshToken.for_user(user)

    return Response({
        "access":  str(refresh.access_token),
        "refresh": str(refresh),
        "created": created,   # True = new account, False = existing
    })