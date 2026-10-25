
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from rest_framework.permissions import AllowAny
from rest_framework.decorators import api_view, permission_classes


@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    return JsonResponse({
        "status": "ok",
        "service": "Smart Project Management API",
    })


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health_check, name="health-check"),
    path("api/auth/", include("projects.auth_urls")),
    path("api/", include("projects.api_urls")),
]
