from django.conf import settings
from django.db import models
from cafeterias.models import Cafeteria


class Visit(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='visits',
    )
    cafeteria = models.ForeignKey(
        Cafeteria,
        on_delete=models.CASCADE,
        related_name='visits',
    )
    checkin_latitude = models.FloatField()
    checkin_longitude = models.FloatField()
    visited_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-visited_at']
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'cafeteria'],
                name='unique_user_cafeteria_visit',
            )
        ]

    def __str__(self):
        return f'{self.user.username} @ {self.cafeteria.name}'