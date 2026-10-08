from django.contrib import admin
from .models import Visit


@admin.register(Visit)
class VisitAdmin(admin.ModelAdmin):
    list_display = ('user', 'cafeteria', 'visited_at')
    list_filter = ('visited_at',)
    search_fields = ('user__username', 'cafeteria__name')
    raw_id_fields = ('user', 'cafeteria')