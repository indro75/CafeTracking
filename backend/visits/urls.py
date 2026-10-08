from django.urls import path
from . import views

urlpatterns = [
    path('checkin/', views.checkin_view, name='checkin'),
    path('', views.visit_list_view, name='visit-list'),
    path('stats/', views.stats_view, name='visit-stats'),
]