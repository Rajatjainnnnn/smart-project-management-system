
from rest_framework import serializers
from django.contrib.auth import get_user_model

from .models import (
    ActivityLog,
    Comment,
    Notification,
    Project,
    ProjectMember,
    Task,
)

User = get_user_model()


class UserSummarySerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "full_name"]
        read_only_fields = fields

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username


class ProjectMemberSerializer(serializers.ModelSerializer):
    user = UserSummarySerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source="user",
        write_only=True,
    )

    class Meta:
        model = ProjectMember
        fields = ["id", "user", "user_id", "role", "created_at"]
        read_only_fields = ["id", "created_at"]


class ProjectSerializer(serializers.ModelSerializer):
    owner = UserSummarySerializer(read_only=True)
    members = ProjectMemberSerializer(many=True, read_only=True)
    task_count = serializers.IntegerField(read_only=True, default=0)
    completed_task_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Project
        fields = [
            "id",
            "name",
            "description",
            "owner",
            "status",
            "start_date",
            "due_date",
            "members",
            "task_count",
            "completed_task_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "owner",
            "members",
            "task_count",
            "completed_task_count",
            "created_at",
            "updated_at",
        ]


class TaskSerializer(serializers.ModelSerializer):
    assignee = UserSummarySerializer(read_only=True)
    created_by = UserSummarySerializer(read_only=True)
    assignee_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source="assignee",
        required=False,
        allow_null=True,
        write_only=True,
    )
    is_overdue = serializers.BooleanField(read_only=True)

    class Meta:
        model = Task
        fields = [
            "id",
            "project",
            "title",
            "description",
            "assignee",
            "assignee_id",
            "created_by",
            "status",
            "priority",
            "due_date",
            "estimated_hours",
            "position",
            "is_overdue",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_by",
            "is_overdue",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        project = attrs.get("project", getattr(self.instance, "project", None))
        assignee = attrs.get(
            "assignee", getattr(self.instance, "assignee", None)
        )

        if project and assignee:
            is_owner = project.owner_id == assignee.pk
            is_member = ProjectMember.objects.filter(
                project=project, user=assignee
            ).exists()

            if not (is_owner or is_member):
                raise serializers.ValidationError({
                    "assignee_id": "The assignee must belong to this project."
                })

        return attrs


class CommentSerializer(serializers.ModelSerializer):
    author = UserSummarySerializer(read_only=True)

    class Meta:
        model = Comment
        fields = ["id", "task", "author", "body", "created_at", "updated_at"]
        read_only_fields = ["id", "author", "created_at", "updated_at"]


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id",
            "message",
            "link",
            "is_read",
            "created_at",
        ]
        read_only_fields = fields


class ActivityLogSerializer(serializers.ModelSerializer):
    actor = UserSummarySerializer(read_only=True)

    class Meta:
        model = ActivityLog
        fields = ["id", "project", "actor", "action", "details", "created_at"]
        read_only_fields = fields
