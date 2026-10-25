
from django.contrib.auth import get_user_model
from django.http import FileResponse
from pathlib import Path
from django.db import transaction
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import FormParser, MultiPartParser
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
from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import ActivityLog, Comment, Milestone, Notification, Profile, Project, ProjectMember, Skill, Task, TaskAttachment, UserSkill
from .serializers import (
    ActivityLogSerializer,
    CommentSerializer,
    EmailTokenObtainPairSerializer,
    MilestoneSerializer,
    NotificationSerializer,
    PasswordChangeSerializer,
    ProjectSerializer,
    RegisterSerializer,
    SkillSerializer,
    TaskSerializer,
    TaskAttachmentSerializer,
    UserSerializer,
    UserProfileUpdateSerializer,
    UserSkillSerializer,
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
PRIORITY_WEIGHT = {'low': 1, 'medium': 2, 'high': 3}
PROJECT_ADMIN_ROLES = {'team lead', 'project manager', 'lead', 'owner'}


def project_access_queryset(user):
    return Project.objects.filter(Q(owner=user) | Q(members__user=user)).distinct()


def is_project_admin(user, project):
    if project.owner_id == user.id:
        return True
    member = project.members.filter(user=user).first()
    if member is None:
        return False
    return (member.role or '').strip().lower() in PROJECT_ADMIN_ROLES


def log_project_activity(project, user, action, details=''):
    return ActivityLog.objects.create(
        project=project,
        user=user,
        action=action,
        details=details,
    )


def build_skill_match_score(user, task):
    required_skills = list(task.required_skills.all())
    if not required_skills:
        return 100

    user_skills = dict(
        UserSkill.objects.filter(user=user).values_list('skill__name', 'proficiency')
    )

    if not user_skills:
        return 0

    matched_score = 0
    for skill in required_skills:
        prof = user_skills.get(skill.name, 0)
        matched_score += min(5, max(0, prof))

    total_possible = len(required_skills) * 5
    return round((matched_score / total_possible) * 100)


def build_project_risk(project):
    overdue_tasks = Task.objects.filter(project=project).exclude(due_date__isnull=True).filter(
        due_date__lt=timezone.now().date(),
        status__in=['todo', 'in_progress', 'review'],
    )

    critical_unfinished = Task.objects.filter(
        project=project,
        priority='high',
    ).exclude(status='done')

    milestone_pending = project.milestones.filter(status__in=['pending', 'in_progress']).count()
    blocked_tasks = Task.objects.filter(
        project=project,
        status__in=['todo', 'in_progress', 'review'],
        dependencies__status__in=['todo', 'in_progress', 'review'],
    ).distinct().count()
    workload = []
    for member in User.objects.filter(project_memberships__project=project).distinct():
        tasks = Task.objects.filter(project=project, assignee=member)
        active = tasks.exclude(status='done')
        weighted = sum(PRIORITY_WEIGHT.get(task.priority, 1) * task.estimated_effort for task in active)
        overdue_count = tasks.exclude(due_date__isnull=True).filter(
            due_date__lt=timezone.now().date(),
            status__in=['todo', 'in_progress', 'review'],
        ).count()
        score = min(100, (active.count() * 20) + (weighted * 5) + (overdue_count * 15))
        if score >= 85:
            workload.append(member.username)

    risk_level = 'low'
    reasons = []

    if overdue_tasks.count() >= 3 or critical_unfinished.count() >= 2 or milestone_pending >= 3 or blocked_tasks >= 3:
        risk_level = 'high'
        reasons.append('Multiple overdue or high-priority tasks are still open.')
    elif overdue_tasks.count() >= 1 or critical_unfinished.exists() or milestone_pending >= 1 or blocked_tasks:
        risk_level = 'medium'
        reasons.append('Some deadlines and project milestones need attention.')
    else:
        reasons.append('The project is currently tracking within plan.')

    if workload:
        reasons.append(f'Overloaded team members: {", ".join(workload)}.')
    if blocked_tasks:
        reasons.append(f'{blocked_tasks} open tasks are waiting on unfinished dependencies.')

    return {'risk_level': risk_level, 'reasons': reasons, 'blocked_tasks': blocked_tasks}


def build_workload_snapshot(project):
    today = timezone.now().date()
    members = []
    for member in User.objects.filter(project_memberships__project=project).distinct():
        tasks = Task.objects.filter(project=project, assignee=member)
        active_tasks = tasks.exclude(status='done')
        overdue_count = tasks.exclude(due_date__isnull=True).filter(
            due_date__lt=today,
            status__in=['todo', 'in_progress', 'review'],
        ).count()
        weighted_effort = sum(m['value'] for m in [
            {'value': task.estimated_effort * PRIORITY_WEIGHT.get(task.priority, 1)} for task in active_tasks
        ])
        utilization = min(100, (active_tasks.count() * 20) + (weighted_effort * 5) + (overdue_count * 15))
        members.append({
            'user': UserSerializer(member).data,
            'active_tasks': active_tasks.count(),
            'overdue_tasks': overdue_count,
            'estimated_effort': weighted_effort,
            'utilization': utilization,
            'status': 'overloaded' if utilization >= 80 else 'balanced' if utilization >= 50 else 'available',
        })
    return sorted(members, key=lambda item: item['utilization'], reverse=True)


def build_contribution_snapshot(project):
    today = timezone.now().date()
    members = []
    for member in User.objects.filter(project_memberships__project=project).distinct():
        tasks = Task.objects.filter(project=project, assignee=member)
        completed_tasks = tasks.filter(status='done')
        completed_weight = sum(PRIORITY_WEIGHT.get(task.priority, 1) * 25 for task in completed_tasks)
        on_time = 0
        for task in completed_tasks.exclude(due_date__isnull=True):
            if task.updated_at.date() <= task.due_date:
                on_time += 1
        comments_count = Comment.objects.filter(task__project=project, author=member).count()
        score = min(100, (completed_tasks.count() * 18) + completed_weight + (on_time * 10) + (comments_count * 5))
        members.append({
            'user': UserSerializer(member).data,
            'completed_tasks': completed_tasks.count(),
            'on_time_completion': on_time,
            'comment_count': comments_count,
            'score': score,
            'level': 'high' if score >= 80 else 'medium' if score >= 50 else 'low',
        })
    return sorted(members, key=lambda item: item['score'], reverse=True)


def build_skill_recommendations(project, task=None):
    task_queryset = Task.objects.filter(project=project)
    if task is not None:
        task_queryset = task_queryset.filter(pk=task.pk)

    recommendations = []
    for current_task in task_queryset:
        required_skills = list(current_task.required_skills.all())
        if not required_skills:
            recs = []
        else:
            recs = []
            for member in User.objects.filter(project_memberships__project=project).distinct():
                score = build_skill_match_score(member, current_task)
                if score > 0:
                    recs.append({
                        'user': UserSerializer(member).data,
                        'match_score': score,
                        'skill_fit': score,
                    })
            recs.sort(key=lambda item: item['match_score'], reverse=True)

        recommendations.append({
            'task_id': current_task.id,
            'task_title': current_task.title,
            'required_skills': [SkillSerializer(skill).data for skill in required_skills],
            'recommended_members': recs[:5],
        })

    return recommendations


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer


class ProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        Profile.objects.get_or_create(user=request.user, defaults={'role': 'Student'})
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        Profile.objects.get_or_create(user=request.user, defaults={'role': 'Student'})
        serializer = UserProfileUpdateSerializer(
            request.user,
            data=request.data,
            partial=True,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        request.user.refresh_from_db()
        return Response(UserSerializer(request.user).data)


class PasswordChangeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save(update_fields=['password'])
        return Response({'detail': 'Password changed successfully.'}, status=status.HTTP_200_OK)


class SkillListCreateView(generics.ListCreateAPIView):
    queryset = Skill.objects.order_by('name')
    serializer_class = SkillSerializer
    permission_classes = [permissions.IsAuthenticated]


class UserDirectoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        users = User.objects.all().order_by('username')
        search = request.query_params.get('search', '').strip()
        if search:
            users = users.filter(
                Q(username__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search)
            )
        return Response(list(users.values(
            'id', 'username', 'first_name', 'last_name', 'email'
        )[:50]))


class UserSkillListCreateView(generics.ListCreateAPIView):
    serializer_class = UserSkillSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserSkill.objects.filter(user=self.request.user).select_related('skill')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class UserSkillDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = UserSkillSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserSkill.objects.filter(user=self.request.user).select_related('skill')


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response({'detail': 'Refresh token is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except Exception:
            return Response({'detail': 'Invalid refresh token.'}, status=status.HTTP_400_BAD_REQUEST)

        return Response(status=status.HTTP_204_NO_CONTENT)


class ProjectListCreateView(generics.ListCreateAPIView):
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return project_access_queryset(self.request.user).annotate(
            task_count=Count('tasks', distinct=True),
            completed_task_count=Count(
                'tasks',
                filter=Q(tasks__status='done'),
                distinct=True,
            ),
        )

    def perform_create(self, serializer):
        project = serializer.save()
        log_project_activity(project, self.request.user, 'Project created')


class ProjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return project_access_queryset(self.request.user).annotate(
            task_count=Count('tasks', distinct=True),
            completed_task_count=Count(
                'tasks',
                filter=Q(tasks__status='done'),
                distinct=True,
            ),
        )

    def update(self, request, *args, **kwargs):
        project = self.get_object()
        if not is_project_admin(request.user, project):
            return Response({'detail': 'Only the project owner or team lead can update this project.'}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        project = self.get_object()
        if project.owner != request.user:
            return Response({'detail': 'Only the project owner can delete this project.'}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)


class ProjectMemberListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, project_pk):
        project = Project.objects.filter(pk=project_pk).filter(Q(owner=request.user) | Q(members__user=request.user)).first()
        if project is None:
            return Response({'detail': 'Project not found.'}, status=status.HTTP_404_NOT_FOUND)
        members = project.members.select_related('user', 'user__profile').all()
        data = []
        for member in members:
            data.append({
                'id': member.id,
                'user': UserSerializer(member.user).data,
                'role': member.role,
                'joined_at': member.joined_at,
            })
        return Response(data)

    def post(self, request, project_pk):
        project = Project.objects.filter(pk=project_pk).first()
        if project is None:
            return Response({'detail': 'Project not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not is_project_admin(request.user, project):
            return Response({'detail': 'Only the project owner or team lead can add members.'}, status=status.HTTP_403_FORBIDDEN)

        user_id = request.data.get('user_id')
        role = request.data.get('role', 'Member')
        if not user_id:
            return Response({'detail': 'user_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(pk=user_id).first()
        if user is None:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        member, created = ProjectMember.objects.get_or_create(project=project, user=user, defaults={'role': role})
        if not created:
            member.role = role
            member.save(update_fields=['role'])
        else:
            Notification.objects.create(
                recipient=user,
                title='Added to a project',
                message=f'You were added to {project.name}.',
                link=f'/projects/{project.pk}',
            )
            log_project_activity(project, request.user, 'Team member added', user.username)

        return Response({
            'id': member.id,
            'user': UserSerializer(user).data,
            'role': member.role,
            'joined_at': member.joined_at,
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class ProjectMemberDeleteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, project_pk, user_id):
        project = Project.objects.filter(pk=project_pk).first()
        if project is None:
            return Response({'detail': 'Project not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not is_project_admin(request.user, project):
            return Response({'detail': 'Only the project owner or team lead can remove members.'}, status=status.HTTP_403_FORBIDDEN)

        membership = project.members.filter(user_id=user_id).first()
        if membership is None:
            return Response({'detail': 'Member not found.'}, status=status.HTTP_404_NOT_FOUND)

        if membership.user == project.owner:
            return Response({'detail': 'The project owner cannot be removed.'}, status=status.HTTP_400_BAD_REQUEST)

        membership.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MilestoneListCreateView(generics.ListCreateAPIView):
    serializer_class = MilestoneSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        project_pk = self.kwargs['project_pk']
        return Milestone.objects.filter(
            project__pk=project_pk,
        ).filter(
            Q(project__owner=self.request.user) |
            Q(project__members__user=self.request.user)
        ).distinct()

    def perform_create(self, serializer):
        project = Project.objects.filter(pk=self.kwargs['project_pk']).first()
        if project is None:
            self.permission_denied(self.request, message='Project not found.')
        if not is_project_admin(self.request.user, project):
            self.permission_denied(self.request, message='Only the project owner or team lead can create milestones.')
        milestone = serializer.save(project=project)
        log_project_activity(project, self.request.user, 'Milestone created', milestone.title)


class MilestoneDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = MilestoneSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Milestone.objects.filter(
            Q(project__owner=self.request.user) |
            Q(project__members__user=self.request.user)
        ).distinct()

    def update(self, request, *args, **kwargs):
        milestone = self.get_object()
        if not is_project_admin(request.user, milestone.project):
            return Response(
                {'detail': 'Only the project owner or team lead can update milestones.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        response = super().update(request, *args, **kwargs)
        if response.status_code < 400:
            log_project_activity(milestone.project, request.user, 'Milestone updated', milestone.title)
        return response

    def destroy(self, request, *args, **kwargs):
        milestone = self.get_object()
        if not is_project_admin(request.user, milestone.project):
            return Response(
                {'detail': 'Only the project owner or team lead can delete milestones.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        log_project_activity(milestone.project, request.user, 'Milestone deleted', milestone.title)
        return super().destroy(request, *args, **kwargs)


class TaskListCreateView(generics.ListCreateAPIView):
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        project_pk = self.kwargs['project_pk']
        return Task.objects.filter(project__pk=project_pk).filter(Q(project__owner=self.request.user) | Q(project__members__user=self.request.user)).distinct()

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['project'] = Project.objects.filter(
            pk=self.kwargs['project_pk'],
        ).filter(
            Q(owner=self.request.user) | Q(members__user=self.request.user)
        ).first()
        return context

    def perform_create(self, serializer):
        project = Project.objects.filter(pk=self.kwargs['project_pk']).first()
        if project is None:
            self.permission_denied(self.request, message='Project not found.')
        if not is_project_admin(self.request.user, project):
            self.permission_denied(self.request, message='Only the project owner or team lead can create tasks.')
        task = serializer.save(project=project)
        log_project_activity(project, self.request.user, 'Task created', task.title)
        if task.assignee_id and task.assignee_id != self.request.user.pk:
            Notification.objects.create(
                recipient=task.assignee,
                title='Task assigned',
                message=f'You were assigned "{task.title}" in {project.name}.',
                link='/tasks',
            )


class MyTaskListView(generics.ListAPIView):
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Task.objects.filter(
            assignee=self.request.user,
        ).filter(
            Q(project__owner=self.request.user) |
            Q(project__members__user=self.request.user)
        ).select_related('project', 'creator', 'assignee').prefetch_related(
            'required_skills'
        ).order_by('due_date', '-created_at')


class TaskDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Task.objects.filter(Q(project__owner=user) | Q(project__members__user=user)).distinct()

    def update(self, request, *args, **kwargs):
        task = self.get_object()
        if not is_project_admin(request.user, task.project):
            return Response({'detail': 'Only the project owner or team lead can update tasks.'}, status=status.HTTP_403_FORBIDDEN)
        previous_assignee_id = task.assignee_id
        response = super().update(request, *args, **kwargs)
        task.refresh_from_db()
        log_project_activity(task.project, request.user, 'Task updated', task.title)
        if task.assignee_id and task.assignee_id != previous_assignee_id:
            Notification.objects.create(
                recipient=task.assignee,
                title='Task assigned',
                message=f'You were assigned "{task.title}" in {task.project.name}.',
                link='/tasks',
            )
        return response

    def destroy(self, request, *args, **kwargs):
        task = self.get_object()
        if not is_project_admin(request.user, task.project):
            return Response({'detail': 'Only the project owner or team lead can delete tasks.'}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)


class TaskStatusUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        task = Task.objects.filter(pk=pk).filter(Q(project__owner=request.user) | Q(project__members__user=request.user)).first()
        if task is None:
            return Response({'detail': 'Task not found.'}, status=status.HTTP_404_NOT_FOUND)

        status_value = request.data.get('status')
        if status_value not in dict(Task.STATUS_CHOICES):
            return Response({'detail': 'Invalid status value.'}, status=status.HTTP_400_BAD_REQUEST)

        if task.assignee_id != request.user.id and not is_project_admin(request.user, task.project):
            return Response({'detail': 'Only the task assignee or project admin can change the task status.'}, status=status.HTTP_403_FORBIDDEN)

        previous_status = task.status
        task.status = status_value
        task.save(update_fields=['status', 'updated_at'])
        if previous_status != status_value:
            log_project_activity(
                task.project,
                request.user,
                'Task status changed',
                f'{task.title}: {previous_status} -> {status_value}',
            )
            if task.assignee_id and task.assignee_id != request.user.pk:
                Notification.objects.create(
                    recipient=task.assignee,
                    title='Task status updated',
                    message=f'"{task.title}" moved to {task.get_status_display()}.',
                    link='/tasks',
                )
        return Response(TaskSerializer(task).data)


class TaskAssignView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        task = Task.objects.filter(pk=pk).filter(
            Q(project__owner=request.user) |
            Q(project__members__user=request.user)
        ).first()
        if task is None:
            return Response({'detail': 'Task not found.'}, status=status.HTTP_404_NOT_FOUND)
        if not is_project_admin(request.user, task.project):
            return Response({'detail': 'Only the project owner or team lead can assign tasks.'}, status=status.HTTP_403_FORBIDDEN)

        assignee_id = request.data.get('assignee_id')
        if assignee_id is None:
            task.assignee = None
            task.save(update_fields=['assignee', 'updated_at'])
            return Response(TaskSerializer(task).data)

        assignee = User.objects.filter(pk=assignee_id).first()
        if assignee is None:
            return Response({'detail': 'Assignee not found.'}, status=status.HTTP_404_NOT_FOUND)

        project_membership = ProjectMember.objects.filter(project=task.project, user=assignee).exists()
        if not project_membership:
            return Response({'detail': 'Assignee must be a project member.'}, status=status.HTTP_400_BAD_REQUEST)

        previous_assignee_id = task.assignee_id
        task.assignee = assignee
        task.save(update_fields=['assignee', 'updated_at'])
        if previous_assignee_id != assignee.pk:
            Notification.objects.create(
                recipient=assignee,
                title='Task assigned',
                message=f'You were assigned "{task.title}" in {task.project.name}.',
                link='/tasks',
            )
            log_project_activity(task.project, request.user, 'Task assigned', task.title)
        return Response(TaskSerializer(task).data)


class TaskRecommendationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, project_pk, task_pk=None):
        project = Project.objects.filter(pk=project_pk).filter(Q(owner=request.user) | Q(members__user=request.user)).first()
        if project is None:
            return Response({'detail': 'Project not found.'}, status=status.HTTP_404_NOT_FOUND)

        if task_pk:
            task = Task.objects.filter(pk=task_pk, project=project).first()
            if task is None:
                return Response({'detail': 'Task not found.'}, status=status.HTTP_404_NOT_FOUND)
            return Response({'task_id': task.id, 'recommendations': build_skill_recommendations(project, task)[0]['recommended_members']})

        return Response({'recommendations': build_skill_recommendations(project)})


class CommentListCreateView(generics.ListCreateAPIView):
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        task_pk = self.kwargs['task_pk']
        return Comment.objects.filter(task__pk=task_pk).filter(Q(task__project__owner=self.request.user) | Q(task__project__members__user=self.request.user)).distinct()

    def perform_create(self, serializer):
        task = Task.objects.filter(pk=self.kwargs['task_pk']).filter(Q(project__owner=self.request.user) | Q(project__members__user=self.request.user)).first()
        if task is None:
            self.permission_denied(self.request, message='Task not found.')
        serializer.save(task=task, author=self.request.user)
        log_project_activity(task.project, self.request.user, 'Comment added', task.title)
        recipient_ids = {task.assignee_id, task.creator_id} - {None, self.request.user.pk}
        for recipient_id in recipient_ids:
            Notification.objects.create(
                recipient_id=recipient_id,
                title='New task comment',
                message=f'{self.request.user.username} commented on "{task.title}".',
                link='/tasks',
            )


class TaskAttachmentListCreateView(generics.ListCreateAPIView):
    serializer_class = TaskAttachmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_task(self):
        return get_object_or_404(
            Task.objects.filter(
                Q(project__owner=self.request.user) |
                Q(project__members__user=self.request.user)
            ).distinct(),
            pk=self.kwargs['task_pk'],
        )

    def get_queryset(self):
        return TaskAttachment.objects.filter(task=self.get_task()).select_related('uploaded_by')

    def perform_create(self, serializer):
        task = self.get_task()
        uploaded_file = serializer.validated_data['file']
        attachment = serializer.save(
            task=task,
            uploaded_by=self.request.user,
            original_name=Path(uploaded_file.name).name,
        )
        log_project_activity(task.project, self.request.user, 'Attachment uploaded', attachment.original_name)


class TaskAttachmentDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_attachment(self, pk):
        return get_object_or_404(
            TaskAttachment.objects.filter(
                Q(task__project__owner=self.request.user) |
                Q(task__project__members__user=self.request.user)
            ).distinct(),
            pk=pk,
        )

    def get(self, request, pk):
        attachment = self.get_attachment(pk)
        response = FileResponse(
            attachment.file.open('rb'),
            as_attachment=True,
            filename=attachment.original_name,
        )
        return response

    def delete(self, request, pk):
        attachment = self.get_attachment(pk)
        if (
            attachment.uploaded_by_id != request.user.pk and
            not is_project_admin(request.user, attachment.task.project)
        ):
            raise PermissionDenied('Only the uploader or a project lead can delete this attachment.')
        log_project_activity(
            attachment.task.project,
            request.user,
            'Attachment deleted',
            attachment.original_name,
        )
        attachment.file.delete(save=False)
        attachment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Notification.objects.filter(recipient=self.request.user)
        if self.request.query_params.get('unread') == 'true':
            queryset = queryset.filter(read=False)
        return queryset


class NotificationReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        notification = Notification.objects.filter(pk=pk, recipient=request.user).first()
        if notification is None:
            return Response({'detail': 'Notification not found.'}, status=status.HTTP_404_NOT_FOUND)
        notification.read = True
        notification.save(update_fields=['read'])
        return Response(NotificationSerializer(notification).data)


class ProjectActivityView(generics.ListAPIView):
    serializer_class = ActivityLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        project_pk = self.kwargs['project_pk']
        return ActivityLog.objects.filter(
            project__pk=project_pk,
        ).filter(
            Q(project__owner=self.request.user) |
            Q(project__members__user=self.request.user)
        ).select_related('user', 'project').order_by('-created_at')


class DashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        projects = project_access_queryset(request.user)
        total_tasks = Task.objects.filter(project__in=projects).count()
        completed_tasks = Task.objects.filter(project__in=projects, status='done').count()
        in_progress_tasks = Task.objects.filter(project__in=projects, status='in_progress').count()
        todo_tasks = Task.objects.filter(project__in=projects, status='todo').count()
        overdue_tasks = Task.objects.filter(project__in=projects).exclude(due_date__isnull=True).filter(
            due_date__lt=timezone.now().date(),
            status__in=['todo', 'in_progress', 'review'],
        ).count()

        workload = []
        for project in projects:
            workload.extend([
                {
                    'project_id': project.id,
                    'project_name': project.name,
                    'members': build_workload_snapshot(project),
                }
            ])

        activity = ActivityLog.objects.filter(project__in=projects).select_related('user', 'project')[:10]

        return Response({
            'project_count': projects.count(),
            'total_tasks': total_tasks,
            'completed_tasks': completed_tasks,
            'in_progress_tasks': in_progress_tasks,
            'todo_tasks': todo_tasks,
            'overdue_tasks': overdue_tasks,
            'workload': workload,
            'activity': ActivityLogSerializer(activity, many=True).data,
        })


class AnalyticsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        projects = project_access_queryset(request.user)
        if not projects.exists():
            return Response({
                'project_count': 0,
                'task_count': 0,
                'completed_tasks': 0,
                'overdue_tasks': 0,
                'progress': 0,
                'risk_level': 'low',
                'risk_reasons': ['No projects assigned yet.'],
                'workload': [],
                'contribution': [],
                'skills': [],
            })

        completed = Task.objects.filter(project__in=projects, status='done').count()
        total = Task.objects.filter(project__in=projects).count()
        overdue = Task.objects.filter(project__in=projects).exclude(due_date__isnull=True).filter(
            due_date__lt=timezone.now().date(),
            status__in=['todo', 'in_progress', 'review'],
        ).count()

        risk = build_project_risk(projects.first())
        workload = []
        contribution = []
        for project in projects:
            workload.extend([
                {
                    'project_id': project.id,
                    'project_name': project.name,
                    'data': build_workload_snapshot(project),
                }
            ])
            contribution.extend([
                {
                    'project_id': project.id,
                    'project_name': project.name,
                    'data': build_contribution_snapshot(project),
                }
            ])

        return Response({
            'project_count': projects.count(),
            'task_count': total,
            'completed_tasks': completed,
            'overdue_tasks': overdue,
            'progress': round((completed / total) * 100, 2) if total else 0,
            'risk_level': risk['risk_level'],
            'risk_reasons': risk['reasons'],
            'workload': workload,
            'contribution': contribution,
            'skills': SkillSerializer(
                Skill.objects.annotate(task_count=Count('required_for_tasks')).order_by('-task_count')[:10],
                many=True,
            ).data,
        })
