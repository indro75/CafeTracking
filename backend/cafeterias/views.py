from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Cafeteria
from .serializers import CafeteriaSerializer
from visits.models import Visit
import math


def haversine_distance(lat1, lng1, lat2, lng2):
    """Calculate distance in meters between two points."""
    R = 6371000  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda/2)**2
    return 2 * R * math.asin(math.sqrt(a))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def cafeteria_list(request):
    user = request.user
    lat = request.query_params.get('lat')
    lng = request.query_params.get('lng')
    radius_km = request.query_params.get('radius')

    qs = Cafeteria.objects.all()

    visited_ids = set(
        Visit.objects.filter(user=user).values_list('cafeteria_id', flat=True)
    )

    if lat and lng:
        try:
            user_lat = float(lat)
            user_lng = float(lng)
        except (TypeError, ValueError):
            return Response({'detail': 'Invalid coordinates.'}, status=400)

        cafeterias_with_distance = []
        for caf in qs:
            dist = haversine_distance(user_lat, user_lng, caf.latitude, caf.longitude)
            if radius_km and dist > float(radius_km) * 1000:
                continue
            cafeterias_with_distance.append((caf, dist))

        cafeterias_with_distance.sort(key=lambda x: x[1])
        data = CafeteriaSerializer([c[0] for c in cafeterias_with_distance], many=True).data
        for i, item in enumerate(data):
            item['is_visited'] = item['id'] in visited_ids
            item['distance'] = round(cafeterias_with_distance[i][1], 1)
        return Response(data)

    data = CafeteriaSerializer(qs, many=True).data
    for item in data:
        item['is_visited'] = item['id'] in visited_ids
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def cafeteria_detail(request, pk):
    try:
        caf = Cafeteria.objects.get(pk=pk)
    except Cafeteria.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=404)

    user = request.user
    lat = request.query_params.get('lat')
    lng = request.query_params.get('lng')

    data = CafeteriaSerializer(caf).data
    data['is_visited'] = Visit.objects.filter(user=user, cafeteria=caf).exists()

    if lat and lng:
        try:
            dist = haversine_distance(float(lat), float(lng), caf.latitude, caf.longitude)
            data['distance'] = round(dist, 1)
        except (TypeError, ValueError):
            pass

    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def nearby_cafeterias(request):
    lat = request.query_params.get('lat')
    lng = request.query_params.get('lng')
    radius_km = float(request.query_params.get('radius', '2'))

    if not lat or not lng:
        return Response({'detail': 'lat and lng required.'}, status=400)

    try:
        user_lat = float(lat)
        user_lng = float(lng)
    except (TypeError, ValueError):
        return Response({'detail': 'Invalid coordinates.'}, status=400)

    qs = Cafeteria.objects.all()
    cafeterias_with_distance = []
    for caf in qs:
        dist = haversine_distance(user_lat, user_lng, caf.latitude, caf.longitude)
        if dist <= radius_km * 1000:
            cafeterias_with_distance.append((caf, dist))

    cafeterias_with_distance.sort(key=lambda x: x[1])

    visited_ids = set(
        Visit.objects.filter(user=request.user).values_list('cafeteria_id', flat=True)
    )
    data = CafeteriaSerializer([c[0] for c in cafeterias_with_distance], many=True).data
    for i, item in enumerate(data):
        item['is_visited'] = item['id'] in visited_ids
        item['distance'] = round(cafeterias_with_distance[i][1], 1)
    return Response(data)