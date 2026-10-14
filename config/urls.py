from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('projects.auth_urls')),
    path('api/', include('projects.api_urls')),
]
