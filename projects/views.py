from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import ActivityLog, Comment, Milestone, Notification, Profile, Project, ProjectMember, Skill, Task, UserSkill
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
    UserSerializer,
    UserProfileUpdateSerializer,
    UserSkillSerializer,
)

User = get_user_model()

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

    if overdue_tasks.count() >= 3 or critical_unfinished.count() >= 2 or milestone_pending >= 3:
        risk_level = 'high'
        reasons.append('Multiple overdue or high-priority tasks are still open.')
    elif overdue_tasks.count() >= 1 or critical_unfinished.exists() or milestone_pending >= 1:
        risk_level = 'medium'
        reasons.append('Some deadlines and project milestones need attention.')
    else:
        reasons.append('The project is currently tracking within plan.')

    if workload:
        reasons.append(f'Overloaded team members: {", ".join(workload)}.')

    return {'risk_level': risk_level, 'reasons': reasons}


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
        return project_access_queryset(self.request.user)


class ProjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return project_access_queryset(self.request.user)

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
        return Milestone.objects.filter(project__pk=project_pk, project__owner=self.request.user)

    def perform_create(self, serializer):
        project = Project.objects.filter(pk=self.kwargs['project_pk']).first()
        if project is None:
            self.permission_denied(self.request, message='Project not found.')
        if not is_project_admin(self.request.user, project):
            self.permission_denied(self.request, message='Only the project owner or team lead can create milestones.')
        serializer.save(project=project)


class TaskListCreateView(generics.ListCreateAPIView):
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        project_pk = self.kwargs['project_pk']
        return Task.objects.filter(project__pk=project_pk).filter(Q(project__owner=self.request.user) | Q(project__members__user=self.request.user)).distinct()

    def perform_create(self, serializer):
        project = Project.objects.filter(pk=self.kwargs['project_pk']).first()
        if project is None:
            self.permission_denied(self.request, message='Project not found.')
        if not is_project_admin(self.request.user, project):
            self.permission_denied(self.request, message='Only the project owner or team lead can create tasks.')
        serializer.save(project=project)


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
        return super().update(request, *args, **kwargs)

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

        task.status = status_value
        task.save(update_fields=['status', 'updated_at'])
        return Response(TaskSerializer(task).data)


class TaskAssignView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        task = Task.objects.filter(pk=pk).first()
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

        task.assignee = assignee
        task.save(update_fields=['assignee', 'updated_at'])
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


class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)


class NotificationReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        notification = Notification.objects.filter(pk=pk, recipient=request.user).first()
        if notification is None:
            return Response({'detail': 'Notification not found.'}, status=status.HTTP_404_NOT_FOUND)
        notification.read = True
        notification.save(update_fields=['read'])
        return Response(NotificationSerializer(notification).data)


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
