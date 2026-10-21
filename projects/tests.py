from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


class AuthAPITest(APITestCase):
    def test_register_and_login_user(self):
        register_response = self.client.post(
            reverse('register'),
            {
                'username': 'demo',
                'email': 'demo@example.com',
                'password': 'StrongPass123',
            },
            format='json',
        )

        self.assertEqual(register_response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(get_user_model().objects.filter(username='demo').exists())

        login_response = self.client.post(
            reverse('token_obtain_pair'),
            {
                'username': 'demo',
                'password': 'StrongPass123',
            },
            format='json',
        )

        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        self.assertIn('access', login_response.data)
        self.assertIn('refresh', login_response.data)

    def test_logout_blacklists_refresh_token(self):
        user = get_user_model().objects.create_user(
            username='logoutdemo',
            email='logout@example.com',
            password='StrongPass123',
        )

        token_response = self.client.post(
            reverse('token_obtain_pair'),
            {'username': user.username, 'password': 'StrongPass123'},
            format='json',
        )
        refresh = token_response.data['refresh']

        self.client.force_authenticate(user=user)
        logout_response = self.client.post(
            reverse('logout'),
            {'refresh': refresh},
            format='json',
        )

        self.assertEqual(logout_response.status_code, status.HTTP_204_NO_CONTENT)

    def test_profile_can_be_updated_without_changing_role_or_username(self):
        user = get_user_model().objects.create_user(
            username='profiledemo',
            email='profile@example.com',
            password='StrongPass123',
        )
        self.client.force_authenticate(user=user)

        response = self.client.patch(
            reverse('profile'),
            {
                'first_name': 'Demo',
                'email': 'updated@example.com',
                'department': 'Computer Applications',
                'bio': 'Backend developer',
                'role': 'Admin',
                'username': 'changed-name',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'profiledemo')
        self.assertEqual(response.data['email'], 'updated@example.com')
        self.assertEqual(response.data['profile']['role'], 'Student')
        self.assertEqual(response.data['profile']['department'], 'Computer Applications')

    def test_profile_rejects_duplicate_email(self):
        user = get_user_model().objects.create_user(
            username='profiledemo',
            email='profile@example.com',
            password='StrongPass123',
        )
        get_user_model().objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='StrongPass123',
        )
        self.client.force_authenticate(user=user)

        response = self.client.patch(
            reverse('profile'),
            {'email': 'other@example.com'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_password_can_be_changed_only_with_valid_current_password(self):
        user = get_user_model().objects.create_user(
            username='passworddemo',
            email='password@example.com',
            password='StrongPass123',
        )
        self.client.force_authenticate(user=user)

        invalid_response = self.client.post(
            reverse('password-change'),
            {'current_password': 'wrong-password', 'new_password': 'AnotherStrong456'},
            format='json',
        )
        self.assertEqual(invalid_response.status_code, status.HTTP_400_BAD_REQUEST)

        response = self.client.post(
            reverse('password-change'),
            {'current_password': 'StrongPass123', 'new_password': 'AnotherStrong456'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertTrue(user.check_password('AnotherStrong456'))

    def test_user_can_manage_own_skills(self):
        from projects.models import Skill

        user = get_user_model().objects.create_user(
            username='skillsdemo',
            email='skills@example.com',
            password='StrongPass123',
        )
        skill = Skill.objects.create(name='Django REST Framework', category='backend')
        self.client.force_authenticate(user=user)

        add_response = self.client.post(
            reverse('user-skill-list'),
            {'skill_id': skill.id, 'proficiency': 4},
            format='json',
        )
        self.assertEqual(add_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(add_response.data['skill']['name'], skill.name)

        update_response = self.client.patch(
            reverse('user-skill-detail', kwargs={'pk': add_response.data['id']}),
            {'proficiency': 5},
            format='json',
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(update_response.data['proficiency'], 5)
        self.assertEqual(self.client.get(reverse('user-skill-list')).data[0]['proficiency'], 5)

        delete_response = self.client.delete(
            reverse('user-skill-detail', kwargs={'pk': add_response.data['id']}),
        )
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(self.client.get(reverse('user-skill-list')).data, [])

    def test_user_cannot_access_another_users_skill_entry(self):
        from projects.models import Skill, UserSkill

        own_user = get_user_model().objects.create_user(
            username='skillowner',
            email='skillowner@example.com',
            password='StrongPass123',
        )
        other_user = get_user_model().objects.create_user(
            username='skillother',
            email='skillother@example.com',
            password='StrongPass123',
        )
        skill = Skill.objects.create(name='Python', category='backend')
        other_entry = UserSkill.objects.create(user=other_user, skill=skill, proficiency=3)
        self.client.force_authenticate(user=own_user)

        response = self.client.get(
            reverse('user-skill-detail', kwargs={'pk': other_entry.id}),
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_skill_catalog_is_listable_and_rejects_case_insensitive_duplicates(self):
        from projects.models import Skill

        self.client.force_authenticate(user=get_user_model().objects.create_user(
            username='catalogdemo',
            email='catalog@example.com',
            password='StrongPass123',
        ))
        Skill.objects.create(name='Python', category='backend')

        duplicate_response = self.client.post(
            reverse('skill-list'),
            {'name': ' python ', 'category': 'language'},
            format='json',
        )

        self.assertEqual(duplicate_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.client.get(reverse('skill-list')).status_code, status.HTTP_200_OK)


class ProjectAPITest(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username='projectowner',
            email='owner@example.com',
            password='StrongPass123',
        )
        self.client.force_authenticate(user=self.user)

    def test_project_and_task_creation(self):
        project_response = self.client.post(
            reverse('project-list'),
            {
                'name': 'Campus Portal',
                'description': 'Student portal project',
                'status': 'active',
            },
            format='json',
        )

        self.assertEqual(project_response.status_code, status.HTTP_201_CREATED)
        project_id = project_response.data['id']

        task_response = self.client.post(
            reverse('task-list', kwargs={'project_pk': project_id}),
            {
                'title': 'Build login API',
                'description': 'Create login endpoint',
                'issue_type': 'task',
                'status': 'in_progress',
                'priority': 'high',
                'estimated_effort': 8,
            },
            format='json',
        )

        self.assertEqual(task_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(task_response.data['title'], 'Build login API')

    def test_dashboard_has_summary_data(self):
        project_response = self.client.post(
            reverse('project-list'),
            {'name': 'Analytics App', 'status': 'planning'},
            format='json',
        )
        project_id = project_response.data['id']
        self.client.post(
            reverse('task-list', kwargs={'project_pk': project_id}),
            {
                'title': 'Create dashboard',
                'status': 'done',
                'priority': 'medium',
                'estimated_effort': 4,
            },
            format='json',
        )

        dashboard_response = self.client.get(reverse('dashboard'))
        self.assertEqual(dashboard_response.status_code, status.HTTP_200_OK)
        self.assertIn('project_count', dashboard_response.data)
        self.assertIn('total_tasks', dashboard_response.data)

    def test_project_analytics_includes_workload_and_contribution(self):
        project_response = self.client.post(
            reverse('project-list'),
            {'name': 'Smart Team Planner', 'status': 'active'},
            format='json',
        )
        project_id = project_response.data['id']
        task_response = self.client.post(
            reverse('task-list', kwargs={'project_pk': project_id}),
            {
                'title': 'Create analytics logic',
                'status': 'in_progress',
                'priority': 'high',
                'estimated_effort': 6,
            },
            format='json',
        )

        self.assertEqual(task_response.status_code, status.HTTP_201_CREATED)
        analytics_response = self.client.get(reverse('analytics'))
        self.assertEqual(analytics_response.status_code, status.HTTP_200_OK)
        self.assertIn('workload', analytics_response.data)
        self.assertIn('contribution', analytics_response.data)
        self.assertIn('risk_level', analytics_response.data)

    def test_skill_recommendations_are_returned_for_project(self):
        project_response = self.client.post(
            reverse('project-list'),
            {'name': 'Skill Match Demo', 'status': 'active'},
            format='json',
        )
        project_id = project_response.data['id']

        member = get_user_model().objects.create_user(username='member1', email='member1@example.com', password='StrongPass123')
        self.client.post(
            reverse('project-member-list', kwargs={'project_pk': project_id}),
            {'user_id': member.id, 'role': 'Developer'},
            format='json',
        )

        from projects.models import Skill, UserSkill
        skill = Skill.objects.create(name='Django')
        UserSkill.objects.create(user=member, skill=skill, proficiency=5)

        task_response = self.client.post(
            reverse('task-list', kwargs={'project_pk': project_id}),
            {
                'title': 'Build API',
                'priority': 'high',
                'estimated_effort': 5,
                'required_skill_ids': [skill.id],
            },
            format='json',
        )
        self.assertEqual(task_response.status_code, status.HTTP_201_CREATED)

        recommendation_response = self.client.get(reverse('task-recommendations', kwargs={'project_pk': project_id}))
        self.assertEqual(recommendation_response.status_code, status.HTTP_200_OK)
        self.assertIn('recommendations', recommendation_response.data)
        self.assertGreater(len(recommendation_response.data['recommendations'][0]['recommended_members']), 0)
