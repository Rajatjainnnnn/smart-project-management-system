"""Fill the database with demo data for presentations and the viva.

    python manage.py seed_demo_data
    python manage.py seed_demo_data --password "YourDemoPassword1"
    python manage.py seed_demo_data --reset

Creates 4 demo users (usernames start with "demo_"), a skill catalogue, one
project with milestones, tasks, comments, activity and notifications. The
data is arranged so the smart features have something to show: one member is
overloaded, another has spare capacity and matching skills, and a few tasks
are overdue.

No password is stored in the code. Pass --password, or one is generated and
printed once. Only the demo user accounts and the demo project are touched;
--reset deletes just those, never anything else.
"""

import secrets
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from projects.models import (
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

User = get_user_model()

DEMO_PROJECT_NAME = 'Smart E-Commerce Website (Demo)'

SKILLS = {
    'Python': 'backend',
    'Django': 'backend',
    'REST API': 'backend',
    'SQL': 'data',
    'Java': 'backend',
    'Machine Learning': 'data',
    'React': 'frontend',
    'JavaScript': 'frontend',
    'UI/UX': 'frontend',
    'Testing': 'quality',
}

# username, first name, last name, {skill: proficiency 1-5}
DEMO_USERS = [
    ('demo_rajat', 'Rajat', 'Demo', {'Python': 5, 'Django': 4, 'REST API': 4, 'SQL': 4, 'React': 3}),
    ('demo_rahul', 'Rahul', 'Demo', {'Java': 4, 'SQL': 3}),
    ('demo_priya', 'Priya', 'Demo', {'React': 5, 'JavaScript': 4, 'UI/UX': 4}),
    ('demo_amit', 'Amit', 'Demo', {'Python': 4, 'Django': 3, 'REST API': 3, 'Machine Learning': 5, 'Testing': 4}),
]

# (title, type, status, priority, effort, due in N days or None, assignee, skills)
DEMO_TASKS = [
    ('Create Login API', 'task', 'in_progress', 'high', 3, 4, 'demo_rajat', ['Python', 'Django', 'REST API']),
    ('Build Product Catalogue API', 'task', 'todo', 'high', 3, 7, 'demo_rajat', ['Python', 'Django', 'REST API']),
    ('Order Management API', 'task', 'todo', 'high', 3, 9, 'demo_rajat', ['Python', 'Django', 'REST API']),
    ('Payment Gateway Integration', 'task', 'todo', 'high', 4, 12, 'demo_rajat', ['Python', 'REST API']),
    ('Login fails with incorrect token', 'bug', 'todo', 'high', 2, -2, 'demo_rajat', ['Python', 'Django']),
    ('Design database schema', 'task', 'done', 'medium', 2, 1, 'demo_rahul', ['SQL']),
    ('Write sales report queries', 'task', 'todo', 'medium', 2, 10, 'demo_rahul', ['SQL']),
    ('Home page UI', 'task', 'in_progress', 'medium', 2, 3, 'demo_priya', ['React', 'UI/UX']),
    ('Product listing page', 'task', 'todo', 'medium', 2, 8, 'demo_priya', ['React', 'JavaScript']),
    ('Checkout page UI', 'task', 'review', 'high', 3, -1, 'demo_priya', ['React', 'JavaScript']),
    ('Product recommendation model', 'task', 'in_progress', 'medium', 4, 14, 'demo_amit', ['Python', 'Machine Learning']),
    ('Write API unit tests', 'task', 'todo', 'low', 2, 11, 'demo_amit', ['Testing', 'Python']),
    ('Project proposal document', 'task', 'done', 'low', 1, 1, 'demo_amit', []),
]

# title, status, due in N days (relative to today). Mirrors the academic stages in the spec.
DEMO_MILESTONES = [
    ('Project Proposal', 'completed', -28),
    ('Requirements / SRS', 'completed', -21),
    ('ER Diagram', 'completed', -14),
    ('Development', 'in_progress', 10),
    ('Testing', 'pending', 14),
    ('Documentation', 'pending', 17),
    ('Presentation', 'pending', 19),
    ('Viva', 'pending', 21),
    ('Final Submission', 'pending', 23),
]


class Command(BaseCommand):
    help = 'Create demo users, a project, milestones, tasks and activity for presentations.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--password',
            help='Password for newly created demo users. If omitted, a random one is generated and printed.',
        )
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Delete the demo project and demo users first, then re-create them.',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options['reset']:
            self._reset()

        if Project.objects.filter(name=DEMO_PROJECT_NAME).exists():
            self.stdout.write(self.style.WARNING(
                'Demo project already exists. Run with --reset to rebuild it.'
            ))
            return

        password = options['password'] or secrets.token_urlsafe(10)
        today = timezone.now().date()

        users, created_usernames = self._create_users(password)
        self._create_skills_for(users)
        project = self._create_project(users, today)
        self._create_milestones(project, today)
        tasks = self._create_tasks(project, users, today)
        self._create_activity(project, users, tasks)

        self.stdout.write(self.style.SUCCESS(
            f'Demo data ready: 1 project, {len(users)} users, {len(tasks)} tasks.'
        ))
        if created_usernames:
            self.stdout.write(f'Created users: {", ".join(created_usernames)}')
            self.stdout.write(f'Password for newly created users: {password}')
            self.stdout.write('(Shown once. Not stored anywhere in the code.)')
        existing = [u for u in users if u not in created_usernames]
        if existing:
            self.stdout.write(f'Existing users kept with their current password: {", ".join(existing)}')

    def _reset(self):
        Project.objects.filter(name=DEMO_PROJECT_NAME).delete()
        usernames = [entry[0] for entry in DEMO_USERS]
        User.objects.filter(username__in=usernames).delete()
        self.stdout.write('Removed existing demo project and demo users.')

    def _create_users(self, password):
        users = {}
        created_usernames = []
        for username, first_name, last_name, _skills in DEMO_USERS:
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    'first_name': first_name,
                    'last_name': last_name,
                    'email': f'{username}@example.com',
                },
            )
            if created:
                user.set_password(password)
                user.save(update_fields=['password'])
                created_usernames.append(username)
            Profile.objects.get_or_create(
                user=user,
                defaults={'role': 'Student', 'department': 'MCA'},
            )
            users[username] = user
        return users, created_usernames

    def _create_skills_for(self, users):
        skills = {
            name: Skill.objects.get_or_create(name=name, defaults={'category': category})[0]
            for name, category in SKILLS.items()
        }
        for username, _first, _last, skill_levels in DEMO_USERS:
            for skill_name, proficiency in skill_levels.items():
                UserSkill.objects.update_or_create(
                    user=users[username],
                    skill=skills[skill_name],
                    defaults={'proficiency': proficiency},
                )
        self._skills = skills

    def _create_project(self, users, today):
        project = Project.objects.create(
            owner=users['demo_rajat'],
            name=DEMO_PROJECT_NAME,
            description='MCA software project: an e-commerce website with smart team analytics (demo data).',
            status='active',
            start_date=today - timedelta(days=30),
            end_date=today + timedelta(days=23),
        )
        for username, user in users.items():
            ProjectMember.objects.create(
                project=project,
                user=user,
                role='Team Lead' if username == 'demo_rajat' else 'Member',
            )
        return project

    def _create_milestones(self, project, today):
        for title, status, due_in_days in DEMO_MILESTONES:
            Milestone.objects.create(
                project=project,
                title=title,
                status=status,
                due_date=today + timedelta(days=due_in_days),
            )

    def _create_tasks(self, project, users, today):
        tasks = {}
        for title, issue_type, status, priority, effort, due_in_days, assignee, skill_names in DEMO_TASKS:
            task = Task.objects.create(
                project=project,
                title=title,
                issue_type=issue_type,
                status=status,
                priority=priority,
                estimated_effort=effort,
                due_date=None if due_in_days is None else today + timedelta(days=due_in_days),
                creator=users['demo_rajat'],
                assignee=users[assignee],
            )
            if skill_names:
                task.required_skills.set([self._skills[name] for name in skill_names])
            tasks[title] = task
        return tasks

    def _create_activity(self, project, users, tasks):
        rajat, rahul, priya, amit = (users[name] for name in ('demo_rajat', 'demo_rahul', 'demo_priya', 'demo_amit'))

        Comment.objects.create(task=tasks['Create Login API'], author=amit, body='Should we use JWT with refresh tokens?')
        Comment.objects.create(task=tasks['Create Login API'], author=rajat, body='Yes, simplejwt is already set up.')
        Comment.objects.create(task=tasks['Checkout page UI'], author=priya, body='Ready for review.')

        for user, action, details in [
            (rajat, 'Created project', DEMO_PROJECT_NAME),
            (rajat, 'Assigned task', 'Create Login API to Rajat'),
            (rahul, 'Completed task', 'Design database schema'),
            (priya, 'Moved task to Review', 'Checkout page UI'),
            (amit, 'Commented on task', 'Create Login API'),
        ]:
            ActivityLog.objects.create(project=project, user=user, action=action, details=details)

        Notification.objects.create(
            recipient=rajat,
            title='Task overdue',
            message='"Login fails with incorrect token" is past its due date.',
        )
        Notification.objects.create(
            recipient=priya,
            title='Task moved to Review',
            message='"Checkout page UI" is waiting for review.',
        )
