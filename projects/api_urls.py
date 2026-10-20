
from rest_framework.routers import DefaultRouter

from .views import (
    ActivityLogViewSet,
    CommentViewSet,
    NotificationViewSet,
    ProjectViewSet,
    TaskViewSet,
)

router = DefaultRouter()
router.register("projects", ProjectViewSet, basename="project")
router.register("tasks", TaskViewSet, basename="task")
router.register("comments", CommentViewSet, basename="comment")
router.register(
    "notifications", NotificationViewSet, basename="notification"
)
router.register("activity", ActivityLogViewSet, basename="activity")

urlpatterns = router.urls
