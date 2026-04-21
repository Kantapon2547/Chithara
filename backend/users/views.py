from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from quota.models import Quota


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
    # weekly reset
    if (timezone.now().date() - quota.reset_date).days >= 7:
        quota.used_this_week = 0
        quota.reset_date = timezone.now().date()
        quota.save()

    return Response({
        "used":      quota.used_this_week,
        "limit":     quota.weekly_limit,
        "remaining": max(0, quota.weekly_limit - quota.used_this_week),
    })