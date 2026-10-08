from rest_framework import serializers
from .models import Cafeteria


class CafeteriaSerializer(serializers.ModelSerializer):
    distance = serializers.FloatField(read_only=True, required=False)
    is_visited = serializers.BooleanField(read_only=True, required=False)

    class Meta:
        model = Cafeteria
        fields = (
            'id', 'name', 'description', 'address',
            'latitude', 'longitude', 'image', 'rating',
            'opening_time', 'closing_time', 'created_at',
            'distance', 'is_visited',
        )