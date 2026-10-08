from django.urls import path
from . import views

urlpatterns = [
    path('', views.cafeteria_list, name='cafeteria-list'),
    path('nearby/', views.nearby_cafeterias, name='cafeteria-nearby'),
    path('<int:pk>/', views.cafeteria_detail, name='cafeteria-detail'),
]