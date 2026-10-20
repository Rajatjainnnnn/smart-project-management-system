
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import (
    ActivityLog,
    Comment,
    Notification,
    Project,
    ProjectMember,
    Task,
)
from .serializers import (
    ActivityLogSerializer,
    CommentSerializer,
    NotificationSerializer,
    ProjectMemberSerializer,
    ProjectSerializer,
    TaskSerializer,
)

User = get_user_model()


def accessible_projects(user):
    """Return projects the current user owns or belongs to."""
    return Project.objects.filter(
        Q(owner=user) | Q(members__user=user)
    ).distinct()


def record_activity(project, actor, action, details=None):
    """Record a project event for the activity feed."""
    return ActivityLog.objects.create(
        project=project,
        actor=actor,
        action=action,
        details=details or {},
    )


class ProjectViewSet(viewsets.ModelViewSet):
    """Create, list, retrieve, update and delete accessible projects."""

    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            accessible_projects(self.request.user)
            .select_related("owner")
            .prefetch_related("members__user")
            .annotate(
                task_count=Count("tasks", distinct=True),
                completed_task_count=Count(
                    "tasks",
                    filter=Q(tasks__status=Task.Status.DONE),
                    distinct=True,
                ),
            )
            .order_by("-updated_at")
        )

    @transaction.atomic
    def perform_create(self, serializer):
        project = serializer.save(owner=self.request.user)
        record_activity(
            project,
            self.request.user,
            "project_created",
            {"name": project.name},
        )

    @transaction.atomic
    def perform_update(self, serializer):
        project = serializer.save()
        record_activity(
            project,
            self.request.user,
            "project_updated",
            {"name": project.name},
        )

    def perform_destroy(self, instance):
        if instance.owner_id != self.request.user.pk:
            raise PermissionDenied("Only the project owner can delete it.")
        record_activity(
            instance, self.request.user, "project_deleted",
            {"name": instance.name},
        )
        instance.delete()

    @action(detail=True, methods=["get", "post"])
    def members(self, request, pk=None):
        """List project members or add a member."""
        project = self.get_object()

        if request.method == "GET":
            members = project.members.select_related("user").all()
            return Response(
                ProjectMemberSerializer(members, many=True).data
            )

        if project.owner_id != request.user.pk:
            raise PermissionDenied(
                "Only the project owner can add members."
            )

        serializer = ProjectMemberSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]

        membership, created = ProjectMember.objects.get_or_create(
            project=project,
            user=user,
            defaults={"role": serializer.validated_data["role"]},
        )

        if created:
            Notification.objects.create(
                recipient=user,
                message=f"You were added to project: {project.name}",
                link=f"/projects/{project.pk}",
            )
            record_activity(
                project,
                request.user,
                "member_added",
                {"username": user.get_username()},
            )

        return Response(
            ProjectMemberSerializer(membership).data,
            status=status.HTTP_201_CREATED if created
            else status.HTTP_200_OK,
        )

    @action(detail=True, methods=["get"])
    def analytics(self, request, pk=None):
        """Return progress and risk indicators for a project."""
        project = self.get_object()
        tasks = project.tasks.all()

        total = tasks.count()
        completed = tasks.filter(status=Task.Status.DONE).count()
        overdue = sum(1 for task in tasks if task.is_overdue)

        status_counts = {
            item["status"]: item["count"]
            for item in tasks.values("status").annotate(count=Count("id"))
        }
        priority_counts = {
            item["priority"]: item["count"]
            for item in tasks.values("priority").annotate(count=Count("id"))
        }

        return Response({
            "project_id": str(project.pk),
            "project_name": project.name,
            "total_tasks": total,
            "completed_tasks": completed,
            "open_tasks": total - completed,
            "completion_percentage": round(
                completed * 100 / total, 2
            ) if total else 0,
            "overdue_tasks": overdue,
            "tasks_by_status": status_counts,
            "tasks_by_priority": priority_counts,
            "member_count": project.members.count() + 1,
        })


class TaskViewSet(viewsets.ModelViewSet):
    """Manage tasks belonging to accessible projects."""

    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Task.objects.filter(
            project__in=accessible_projects(self.request.user)
        ).select_related("project", "assignee", "created_by")

        project_id = self.request.query_params.get("project")
        if project_id:
            queryset = queryset.filter(project_id=project_id)

        assignee = self.request.query_params.get("assignee")
        if assignee == "me":
            queryset = queryset.filter(assignee=self.request.user)
        elif assignee:
            queryset = queryset.filter(assignee_id=assignee)

        task_status = self.request.query_params.get("status")
        if task_status:
            queryset = queryset.filter(status=task_status)

        priority = self.request.query_params.get("priority")
        if priority:
            queryset = queryset.filter(priority=priority)

        if self.request.query_params.get("overdue") == "true":
            queryset = queryset.exclude(status=Task.Status.DONE).filter(
                due_date__lt=__import__(
                    "django.utils.timezone", fromlist=["localdate"]
                ).localdate()
            )

        return queryset.order_by("position", "-created_at")

    def perform_create(self, serializer):
        project = serializer.validated_data["project"]

        if not accessible_projects(self.request.user).filter(
            pk=project.pk
        ).exists():
            raise PermissionDenied(
                "You do not have access to this project."
            )

        task = serializer.save(created_by=self.request.user)
        record_activity(
            task.project,
            self.request.user,
            "task_created",
            {"task_id": str(task.pk), "title": task.title},
        )

    def perform_update(self, serializer):
        task = self.get_object()
        old_status = task.status
        updated = serializer.save()

        if old_status != updated.status:
            record_activity(
                updated.project,
                self.request.user,
                "task_status_changed",
                {
                    "task_id": str(updated.pk),
                    "from": old_status,
                    "to": updated.status,
                },
            )

            if updated.assignee_id and updated.assignee_id != self.request.user.pk:
                Notification.objects.create(
                    recipient=updated.assignee,
                    message=f"Task status changed: {updated.title}",
                    link=f"/tasks/{updated.pk}",
                )

    def perform_destroy(self, instance):
        project = instance.project
        record_activity(
            project,
            self.request.user,
            "task_deleted",
            {"task_id": str(instance.pk), "title": instance.title},
        )
        instance.delete()


class CommentViewSet(viewsets.ModelViewSet):
    """List and manage comments on tasks the user can access."""

    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        return Comment.objects.filter(
            task__project__in=accessible_projects(self.request.user)
        ).select_related("author", "task")

    def perform_create(self, serializer):
        task = serializer.validated_data["task"]

        if not accessible_projects(self.request.user).filter(
            pk=task.project_id
        ).exists():
            raise PermissionDenied(
                "You cannot comment on a task in this project."
            )

        comment = serializer.save(author=self.request.user)
        record_activity(
            task.project,
            self.request.user,
            "comment_added",
            {"task_id": str(task.pk), "comment_id": comment.pk},
        )


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """Return only the current user's notifications."""

    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Notification.objects.filter(
            recipient=self.request.user
        )

        unread = self.request.query_params.get("unread")
        if unread == "true":
            queryset = queryset.filter(is_read=False)

        return queryset

    @action(detail=True, methods=["post"])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save(update_fields=["is_read", "updated_at"])
        return Response(NotificationSerializer(notification).data)

    @action(detail=False, methods=["post"])
    def mark_all_read(self, request):
        count = self.get_queryset().filter(is_read=False).update(
            is_read=True
        )
        return Response({"marked_read": count})


class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    """Read activity events for accessible projects."""

    serializer_class = ActivityLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = ActivityLog.objects.filter(
            project__in=accessible_projects(self.request.user)
        ).select_related("actor", "project")

        project_id = self.request.query_params.get("project")
        if project_id:
            queryset = queryset.filter(project_id=project_id)

        return queryset
