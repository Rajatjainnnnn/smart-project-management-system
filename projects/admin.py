from django.contrib import admin

from .models import (
    ActivityLog,
    Comment,
    Milestone,
    Notification,
    Profile,
    Project,
    ProjectMember,
    Skill,
    Task,
    UserSkill,
)


@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'created_at')
    list_filter = ('category',)
    search_fields = ('name',)


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'role', 'department', 'created_at')
    list_filter = ('role',)
    search_fields = ('user__username', 'user__email', 'department')


@admin.register(UserSkill)
class UserSkillAdmin(admin.ModelAdmin):
    list_display = ('user', 'skill', 'proficiency')
    list_filter = ('skill', 'proficiency')
    search_fields = ('user__username', 'skill__name')


class ProjectMemberInline(admin.TabularInline):
    model = ProjectMember
    extra = 0


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner', 'status', 'start_date', 'end_date', 'created_at')
    list_filter = ('status',)
    search_fields = ('name', 'owner__username')
    inlines = [ProjectMemberInline]


@admin.register(ProjectMember)
class ProjectMemberAdmin(admin.ModelAdmin):
    list_display = ('project', 'user', 'role', 'joined_at')
    list_filter = ('role',)
    search_fields = ('project__name', 'user__username')


@admin.register(Milestone)
class MilestoneAdmin(admin.ModelAdmin):
    list_display = ('title', 'project', 'status', 'due_date')
    list_filter = ('status',)
    search_fields = ('title', 'project__name')


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ('title', 'project', 'issue_type', 'status', 'priority', 'assignee', 'due_date')
    list_filter = ('issue_type', 'status', 'priority')
    search_fields = ('title', 'project__name', 'assignee__username')
    filter_horizontal = ('required_skills',)


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('task', 'author', 'created_at')
    search_fields = ('body', 'author__username', 'task__title')


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('title', 'recipient', 'read', 'created_at')
    list_filter = ('read',)
    search_fields = ('title', 'recipient__username')


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ('action', 'project', 'user', 'created_at')
    search_fields = ('action', 'details', 'project__name', 'user__username')
