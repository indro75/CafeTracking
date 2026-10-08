from django.contrib import admin
from .models import Cafeteria


@admin.register(Cafeteria)
class CafeteriaAdmin(admin.ModelAdmin):
    list_display = ('name', 'address', 'rating', 'created_at')
    search_fields = ('name', 'address')
    list_filter = ('rating',)