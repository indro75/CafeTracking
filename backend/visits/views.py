from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from cafeterias.models import Cafeteria
from .models import Visit
from .serializers import CheckinSerializer, VisitSerializer
import math


def haversine_distance(lat1, lng1, lat2, lng2):
    R = 6371000
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda/2)**2
    return 2 * R * math.asin(math.sqrt(a))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def checkin_view(request):
    serializer = CheckinSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    cafeteria_id = serializer.validated_data['cafeteria_id']
    user_lat = serializer.validated_data['latitude']
    user_lng = serializer.validated_data['longitude']

    try:
        cafeteria = Cafeteria.objects.get(pk=cafeteria_id)
    except Cafeteria.DoesNotExist:
        return Response(
            {'success': False, 'message': 'Cafeteria not found.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    distance_m = haversine_distance(user_lat, user_lng, cafeteria.latitude, cafeteria.longitude)
    allowed = getattr(settings, 'ALLOWED_CHECKIN_RADIUS_METERS', 100)

    if distance_m > allowed:
        return Response({
            'success': False,
            'message': f'You are {int(distance_m)}m away. Move within {allowed}m to check in.',
            'distance': round(distance_m, 1),
            'allowed_radius': allowed,
        }, status=status.HTTP_400_BAD_REQUEST)

    if Visit.objects.filter(user=request.user, cafeteria=cafeteria).exists():
        return Response({
            'success': False,
            'message': 'You have already checked in at this cafeteria.',
            'already_visited': True,
        }, status=status.HTTP_409_CONFLICT)

    visit = Visit.objects.create(
        user=request.user,
        cafeteria=cafeteria,
        checkin_latitude=user_lat,
        checkin_longitude=user_lng,
    )

    return Response({
        'success': True,
        'message': 'Check-in successful!',
        'cafeteria_id': cafeteria.id,
        'visit_id': visit.id,
        'distance': round(distance_m, 1),
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def visit_list_view(request):
    visits = Visit.objects.filter(user=request.user).select_related('cafeteria')
    data = VisitSerializer(visits, many=True).data
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def stats_view(request):
    user = request.user
    visited = Visit.objects.filter(user=user).count()
    total = Cafeteria.objects.count()
    remaining = max(total - visited, 0)
    completion = round((visited / total) * 100, 1) if total else 0
    return Response({
        'total': total,
        'visited': visited,
        'remaining': remaining,
        'completion': completion,
    })