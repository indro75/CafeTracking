from rest_framework import serializers
from .models import Visit


class CheckinSerializer(serializers.Serializer):
    cafeteria_id = serializers.IntegerField()
    latitude = serializers.FloatField()
    longitude = serializers.FloatField()

    def validate_latitude(self, v):
        if not -90 <= v <= 90:
            raise serializers.ValidationError('Latitude out of range.')
        return v

    def validate_longitude(self, v):
        if not -180 <= v <= 180:
            raise serializers.ValidationError('Longitude out of range.')
        return v


class VisitSerializer(serializers.ModelSerializer):
    cafeteria_name = serializers.CharField(source='cafeteria.name', read_only=True)
    cafeteria_image = serializers.ImageField(source='cafeteria.image', read_only=True)
    cafeteria_rating = serializers.DecimalField(
        source='cafeteria.rating', max_digits=2, decimal_places=1, read_only=True
    )

    class Meta:
        model = Visit
        fields = (
            'id', 'cafeteria', 'cafeteria_name', 'cafeteria_image',
            'cafeteria_rating', 'visited_at',
        )