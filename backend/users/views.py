from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response


# 👤 GET CURRENT USER PROFILE
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def profile_view(request):
    user = request.user

    return Response({
        "id": user.id,
        "username": user.username,
        "email": user.email,
    })


# 📊 USER QUOTA (example)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def quota_view(request):
    # you can later replace this with real logic
    return Response({
        "used": 2,
        "limit": 10,
        "remaining": 8,
    })