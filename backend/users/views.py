from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import login, logout
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.middleware.csrf import get_token
from .serializers import RegisterSerializer, LoginSerializer, UserSerializer
from visits.models import Visit


@api_view(['GET'])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def csrf_token_view(request):
    """Ensure CSRF cookie is set and return token in JSON for clients."""
    token = get_token(request)
    return Response({'csrfToken': token})


@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def register_view(request):
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    login(request, user)
    token = get_token(request)
    data = UserSerializer(user).data
    data['csrfToken'] = token
    return Response(data, status=status.HTTP_201_CREATED)


@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def login_view(request):
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.validated_data['user']
    login(request, user)
    token = get_token(request)
    data = UserSerializer(user).data
    data['csrfToken'] = token
    return Response(data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    logout(request)
    return Response({'detail': 'Logged out.'})


@api_view(['GET'])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def me_view(request):
    if not request.user.is_authenticated:
        return Response({'authenticated': False}, status=status.HTTP_401_UNAUTHORIZED)
    user = request.user
    visited_count = Visit.objects.filter(user=user).count()
    data = UserSerializer(user).data
    data['visited_count'] = visited_count
    data['csrfToken'] = get_token(request)
    return Response(data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_profile_view(request):
    user = request.user
    allowed = ('username', 'email', 'bio', 'profile_image')
    for field in allowed:
        if field in request.data:
            setattr(user, field, request.data[field])
    user.save()
    return Response(UserSerializer(user).data)