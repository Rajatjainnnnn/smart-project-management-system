
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
from django.urls import path

from .analytics_views import (
    ProjectAnalyticsView,
    ProjectContributionView,
    ProjectRiskView,
    ProjectWorkloadView,
)
from .views import (
    AnalyticsView,
    CommentListCreateView,
    DashboardView,
    MilestoneDetailView,
    MilestoneListCreateView,
    MyTaskListView,
    NotificationListView,
    NotificationReadView,
    ProjectActivityView,
    ProjectDetailView,
    ProjectListCreateView,
    ProjectMemberDeleteView,
    ProjectMemberListCreateView,
    TaskAssignView,
    TaskAttachmentDetailView,
    TaskAttachmentListCreateView,
    TaskDetailView,
    TaskListCreateView,
    TaskRecommendationView,
    TaskStatusUpdateView,
    SkillListCreateView,
    UserDirectoryView,
    UserSkillDetailView,
    UserSkillListCreateView,
)

urlpatterns = [
    path('projects/', ProjectListCreateView.as_view(), name='project-list'),
    path('projects/<int:pk>/', ProjectDetailView.as_view(), name='project-detail'),
    path('users/', UserDirectoryView.as_view(), name='user-directory'),
    path('skills/', SkillListCreateView.as_view(), name='skill-list'),
    path('users/me/skills/', UserSkillListCreateView.as_view(), name='user-skill-list'),
    path('users/me/skills/<int:pk>/', UserSkillDetailView.as_view(), name='user-skill-detail'),
    path('projects/<int:project_pk>/members/', ProjectMemberListCreateView.as_view(), name='project-member-list'),
    path('projects/<int:project_pk>/members/<int:user_id>/', ProjectMemberDeleteView.as_view(), name='project-member-delete'),
    path('projects/<int:project_pk>/milestones/', MilestoneListCreateView.as_view(), name='milestone-list'),
    path('milestones/<int:pk>/', MilestoneDetailView.as_view(), name='milestone-detail'),
    path('projects/<int:project_pk>/activity/', ProjectActivityView.as_view(), name='project-activity'),
    path('projects/<int:project_pk>/tasks/', TaskListCreateView.as_view(), name='task-list'),
    path('my-tasks/', MyTaskListView.as_view(), name='my-task-list'),
    path('projects/<int:project_pk>/recommendations/', TaskRecommendationView.as_view(), name='task-recommendations'),
    path('projects/<int:project_pk>/tasks/<int:task_pk>/recommendation/', TaskRecommendationView.as_view(), name='task-recommendation'),
    path('projects/<int:project_pk>/analytics/', ProjectAnalyticsView.as_view(), name='project-analytics'),
    path('projects/<int:project_pk>/workload/', ProjectWorkloadView.as_view(), name='project-workload'),
    path('projects/<int:project_pk>/contribution/', ProjectContributionView.as_view(), name='project-contribution'),
    path('projects/<int:project_pk>/risk/', ProjectRiskView.as_view(), name='project-risk'),
    path('tasks/<int:pk>/', TaskDetailView.as_view(), name='task-detail'),
    path('tasks/<int:pk>/status/', TaskStatusUpdateView.as_view(), name='task-status'),
    path('tasks/<int:pk>/assign/', TaskAssignView.as_view(), name='task-assign'),
    path('tasks/<int:task_pk>/comments/', CommentListCreateView.as_view(), name='comment-list'),
    path('tasks/<int:task_pk>/attachments/', TaskAttachmentListCreateView.as_view(), name='task-attachment-list'),
    path('attachments/<int:pk>/', TaskAttachmentDetailView.as_view(), name='task-attachment-detail'),
    path('attachments/<int:pk>/download/', TaskAttachmentDetailView.as_view(), name='attachment-download'),
    path('notifications/', NotificationListView.as_view(), name='notification-list'),
    path('notifications/<int:pk>/read/', NotificationReadView.as_view(), name='notification-read'),
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('analytics/', AnalyticsView.as_view(), name='analytics'),
]
