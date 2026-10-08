from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Custom user model — extensible for future profile fields."""
    profile_image = models.ImageField(upload_to='profiles/', blank=True, null=True)
    bio = models.CharField(max_length=255, blank=True, default='')

    def __str__(self):
        return self.username