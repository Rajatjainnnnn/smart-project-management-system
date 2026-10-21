from .api_urls import urlpatterns as api_urlpatterns
from .auth_urls import urlpatterns as auth_urlpatterns

urlpatterns = auth_urlpatterns + api_urlpatterns
