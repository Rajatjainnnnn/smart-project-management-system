from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import ActivityLog, Comment, Milestone, Notification, Profile, Project, ProjectMember, Skill, Task, UserSkill

User = get_user_model()


class SkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = ('id', 'name', 'category')

    def validate_name(self, value):
        value = value.strip()
        skills = Skill.objects.filter(name__iexact=value)
        if self.instance is not None:
            skills = skills.exclude(pk=self.instance.pk)
        if skills.exists():
            raise serializers.ValidationError('A skill with this name already exists.')
        return value


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ('role', 'bio', 'department')


class UserSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'profile')


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    bio = serializers.CharField(source='profile.bio', required=False, allow_blank=True)
    department = serializers.CharField(source='profile.department', required=False, allow_blank=True)
    role = serializers.CharField(source='profile.role', read_only=True)

    class Meta:
        model = User
        fields = ('username', 'email', 'first_name', 'last_name', 'role', 'bio', 'department')
        read_only_fields = ('username', 'role')

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exclude(pk=self.instance.pk).exists():
            raise serializers.ValidationError('A user with that email already exists.')
        return value

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', {})
        for attribute, value in validated_data.items():
            setattr(instance, attribute, value)
        instance.save()

        profile, _ = Profile.objects.get_or_create(user=instance, defaults={'role': 'Student'})
        for attribute, value in profile_data.items():
            setattr(profile, attribute, value)
        if profile_data:
            profile.save()
        return instance


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)

    def validate_current_password(self, value):
        if not self.context['request'].user.check_password(value):
            raise serializers.ValidationError('Current password is incorrect.')
        return value

    def validate_new_password(self, value):
        validate_password(value, user=self.context['request'].user)
        return value


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'first_name', 'last_name')
        extra_kwargs = {
            'first_name': {'required': False, 'allow_blank': True},
            'last_name': {'required': False, 'allow_blank': True},
        }

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('A user with that email already exists.')
        return value

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError('A user with that username already exists.')
        return value

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User.objects.create_user(password=password, **validated_data)
        Profile.objects.get_or_create(user=user, defaults={'role': 'Student'})
        return user


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        return token

    def validate(self, attrs):
        username_or_email = attrs.get('username')
        if username_or_email:
            user = User.objects.filter(username=username_or_email).first()
            if user is None:
                user = User.objects.filter(email__iexact=username_or_email).first()
            if user is not None:
                attrs['username'] = user.username
        return super().validate(attrs)


class ProjectMemberSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = ProjectMember
        fields = ('id', 'user', 'user_id', 'role', 'joined_at')
        read_only_fields = ('id', 'user', 'joined_at')


class ProjectSerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)
    members = ProjectMemberSerializer(many=True, read_only=True)

    class Meta:
        model = Project
        fields = (
            'id',
            'name',
            'description',
            'status',
            'start_date',
            'end_date',
            'owner',
            'members',
            'created_at',
            'updated_at',
        )

    def create(self, validated_data):
        owner = self.context['request'].user
        project = Project.objects.create(owner=owner, **validated_data)
        ProjectMember.objects.create(project=project, user=owner, role='Team Lead')
        return project


class MilestoneSerializer(serializers.ModelSerializer):
    project = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Milestone
        fields = ('id', 'project', 'title', 'description', 'due_date', 'status', 'created_at')
        read_only_fields = ('id', 'project', 'created_at')


class TaskSerializer(serializers.ModelSerializer):
    project = serializers.PrimaryKeyRelatedField(read_only=True)
    creator = UserSerializer(read_only=True)
    assignee = UserSerializer(read_only=True)
    assignee_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    required_skills = SkillSerializer(many=True, read_only=True)
    required_skill_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        allow_empty=True,
    )

    class Meta:
        model = Task
        fields = (
            'id',
            'project',
            'title',
            'description',
            'issue_type',
            'status',
            'priority',
            'due_date',
            'estimated_effort',
            'creator',
            'assignee',
            'assignee_id',
            'required_skills',
            'required_skill_ids',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'project', 'creator', 'required_skills', 'created_at', 'updated_at')

    def create(self, validated_data):
        required_skill_ids = validated_data.pop('required_skill_ids', [])
        assignee_id = validated_data.pop('assignee_id', None)
        task = Task.objects.create(creator=self.context['request'].user, **validated_data)
        if assignee_id is not None:
            task.assignee_id = assignee_id
            task.save(update_fields=['assignee'])
        if required_skill_ids:
            task.required_skills.set(required_skill_ids)
        return task

    def update(self, instance, validated_data):
        required_skill_ids = validated_data.pop('required_skill_ids', None)
        assignee_id = validated_data.pop('assignee_id', None)
        if assignee_id is not None:
            instance.assignee_id = assignee_id
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if required_skill_ids is not None:
            instance.required_skills.set(required_skill_ids)
        return instance


class CommentSerializer(serializers.ModelSerializer):
    task = serializers.PrimaryKeyRelatedField(read_only=True)
    author = UserSerializer(read_only=True)

    class Meta:
        model = Comment
        fields = ('id', 'task', 'author', 'body', 'created_at')
        read_only_fields = ('id', 'author', 'created_at', 'task')


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ('id', 'recipient', 'title', 'message', 'link', 'read', 'created_at')
        read_only_fields = ('id', 'recipient', 'created_at')


class ActivityLogSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = ActivityLog
        fields = ('id', 'project', 'user', 'action', 'details', 'created_at')
        read_only_fields = ('id', 'user', 'created_at')


class UserSkillSerializer(serializers.ModelSerializer):
    skill = SkillSerializer(read_only=True)
    skill_id = serializers.PrimaryKeyRelatedField(queryset=Skill.objects.all(), source='skill', write_only=True)

    class Meta:
        model = UserSkill
        fields = ('id', 'skill', 'skill_id', 'proficiency')
        read_only_fields = ('id', 'skill')

    def validate(self, attrs):
        skill = attrs.get('skill', getattr(self.instance, 'skill', None))
        user_skills = UserSkill.objects.filter(user=self.context['request'].user, skill=skill)
        if self.instance is not None:
            user_skills = user_skills.exclude(pk=self.instance.pk)
        if skill is not None and user_skills.exists():
            raise serializers.ValidationError({'skill_id': 'This skill is already on your profile.'})
        return attrs
