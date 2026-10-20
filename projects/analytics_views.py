"""
Project-scoped analytics endpoints for the Smart Project Management System.

All endpoints enforce project membership before returning data. The metrics are
computed from the current database state; no client-supplied counts are trusted.
"""
from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ActivityLog, Comment, Milestone, Project, ProjectMember, Skill, Task
from .serializers import ActivityLogSerializer, SkillSerializer, UserSerializer
from .views import (
    build_contribution_snapshot,
    build_project_risk,
    build_workload_snapshot,
)

User = get_user_model()

OPEN_STATUSES = ("todo", "in_progress", "review")


def get_accessible_project(user, project_id):
    """Return a project only when the requesting user is a member or owner."""
    return (
        Project.objects.filter(pk=project_id)
        .filter(Q(owner=user) | Q(members__user=user))
        .distinct()
        .first()
    )


def task_summary(project):
    """Return stable task totals used by project analytics and dashboards."""
    tasks = Task.objects.filter(project=project)
    total = tasks.count()
    completed = tasks.filter(status="done").count()
    today = timezone.now().date()
    overdue = tasks.exclude(due_date__isnull=True).filter(
        due_date__lt=today,
        status__in=OPEN_STATUSES,
    ).count()
    status_counts = {
        row["status"]: row["count"]
        for row in tasks.values("status").annotate(count=Count("id"))
    }
    priority_counts = {
        row["priority"]: row["count"]
        for row in tasks.values("priority").annotate(count=Count("id"))
    }
    return {
        "total_tasks": total,
        "completed_tasks": completed,
        "open_tasks": total - completed,
        "overdue_tasks": overdue,
        "completion_percentage": round((completed / total) * 100, 2) if total else 0,
        "status_breakdown": {
            key: status_counts.get(key, 0)
            for key in ("todo", "in_progress", "review", "done")
        },
        "priority_breakdown": {
            key: priority_counts.get(key, 0)
            for key in ("low", "medium", "high")
        },
    }


class ProjectAnalyticsView(APIView):
    """High-level summary for one project."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, project_pk):
        project = get_accessible_project(request.user, project_pk)
        if project is None:
            return Response({"detail": "Project not found."}, status=404)

        summary = task_summary(project)
        risk = build_project_risk(project)
        recent_activity = (
            ActivityLog.objects.filter(project=project)
            .select_related("user", "project")[:10]
        )
        milestones = project.milestones.all()
        summary.update({
            "project_id": project.pk,
            "project_name": project.name,
            "project_status": project.status,
            "milestone_count": milestones.count(),
            "pending_milestones": milestones.filter(
                status__in=("pending", "in_progress")
            ).count(),
            "risk_level": risk["risk_level"],
            "risk_reasons": risk["reasons"],
            "recent_activity": ActivityLogSerializer(
                recent_activity, many=True
            ).data,
        })
        return Response(summary)


class ProjectWorkloadView(APIView):
    """Per-member task and effort breakdown for a project."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, project_pk):
        project = get_accessible_project(request.user, project_pk)
        if project is None:
            return Response({"detail": "Project not found."}, status=404)

        return Response({
            "project_id": project.pk,
            "project_name": project.name,
            "members": build_workload_snapshot(project),
        })


class ProjectContributionView(APIView):
    """Transparent, task-derived contribution indicators for project members."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, project_pk):
        project = get_accessible_project(request.user, project_pk)
        if project is None:
            return Response({"detail": "Project not found."}, status=404)

        return Response({
            "project_id": project.pk,
            "project_name": project.name,
            "contribution": build_contribution_snapshot(project),
            "methodology": {
                "description": (
                    "Contribution is an indicative score based on completed tasks, "
                    "task priority, on-time completion, and authored comments. "
                    "It is not a measure of personal worth or a substitute for review."
                ),
                "maximum_score": 100,
            },
        })


class ProjectRiskView(APIView):
    """Explainable risk indicators for overdue work, high-priority tasks and load."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, project_pk):
        project = get_accessible_project(request.user, project_pk)
        if project is None:
            return Response({"detail": "Project not found."}, status=404)

        risk = build_project_risk(project)
        summary = task_summary(project)
        return Response({
            "project_id": project.pk,
            "project_name": project.name,
            "risk_level": risk["risk_level"],
            "reasons": risk["reasons"],
            "overdue_tasks": summary["overdue_tasks"],
            "unfinished_high_priority_tasks": Task.objects.filter(
                project=project, priority="high"
            ).exclude(status="done").count(),
            "pending_milestones": Milestone.objects.filter(
                project=project, status__in=("pending", "in_progress")
            ).count(),
            "generated_at": timezone.now(),
        })
