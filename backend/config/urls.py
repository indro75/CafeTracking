from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve
from django.http import FileResponse, Http404

FRONTEND_DIR = settings.BASE_DIR.parent / 'frontend'

def serve_frontend_index(request):
    index_file = FRONTEND_DIR / 'index.html'
    if index_file.exists():
        return FileResponse(open(index_file, 'rb'), content_type='text/html')
    raise Http404("Frontend index.html not found")

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('users.urls')),
    path('api/cafeterias/', include('cafeterias.urls')),
    path('api/visits/', include('visits.urls')),
    path('', serve_frontend_index, name='frontend-index'),
    re_path(r'^(?P<path>(css|js)/.*)$', serve, {'document_root': FRONTEND_DIR}),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
