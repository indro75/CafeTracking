from django.db import models


class Cafeteria(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    address = models.CharField(max_length=300)
    latitude = models.FloatField()
    longitude = models.FloatField()
    image = models.URLField(max_length=500, blank=True, default='')
    rating = models.DecimalField(max_digits=2, decimal_places=1, default=0.0)
    opening_time = models.TimeField(blank=True, null=True)
    closing_time = models.TimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name