from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken


class AuthenticationTests(TestCase):
	def setUp(self):
		self.client = APIClient()

	def test_registration_creates_user_with_hashed_password(self):
		response = self.client.post(
			'/auth/register/',
			{
				'username': 'student1',
				'email': 'student@example.com',
				'password': 'ProjectPass!234',
			},
			format='json',
		)

		self.assertEqual(response.status_code, 201)
		user = User.objects.get(username='student1')
		self.assertTrue(user.check_password('ProjectPass!234'))
		self.assertNotIn('password', response.data)

	def test_login_returns_tokens_for_valid_credentials(self):
		User.objects.create_user(username='member', password='ProjectPass!234')

		response = self.client.post(
			'/auth/token/',
			{'username': 'member', 'password': 'ProjectPass!234'},
			format='json',
		)

		self.assertEqual(response.status_code, 200)
		self.assertIn('access', response.data)
		self.assertIn('refresh', response.data)
		profile_response = self.client.get(
			'/auth/profile/',
			HTTP_AUTHORIZATION=f"Bearer {response.data['access']}",
		)
		self.assertEqual(profile_response.status_code, 200)
		self.assertEqual(profile_response.data['username'], 'member')

	def test_profile_requires_authentication_and_returns_current_user(self):
		user = User.objects.create_user(username='member', password='ProjectPass!234')
		unauthenticated_response = self.client.get('/auth/profile/')
		self.assertEqual(unauthenticated_response.status_code, 401)

		self.client.force_authenticate(user=user)

		response = self.client.get('/auth/profile/')

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data['username'], 'member')

	def test_logout_blacklists_refresh_token(self):
		user = User.objects.create_user(username='member', password='ProjectPass!234')
		refresh = RefreshToken.for_user(user)
		self.client.force_authenticate(user=user)

		response = self.client.post(
			'/auth/logout/',
			{'refresh': str(refresh)},
			format='json',
		)

		self.assertEqual(response.status_code, 205)
		refresh_response = self.client.post(
			'/auth/token/refresh/',
			{'refresh': str(refresh)},
			format='json',
		)
		self.assertEqual(refresh_response.status_code, 401)

	def test_logout_cannot_revoke_another_users_refresh_token(self):
		user = User.objects.create_user(username='member', password='ProjectPass!234')
		other_user = User.objects.create_user(username='other', password='ProjectPass!234')
		refresh = RefreshToken.for_user(other_user)
		self.client.force_authenticate(user=user)

		response = self.client.post(
			'/auth/logout/',
			{'refresh': str(refresh)},
			format='json',
		)

		self.assertEqual(response.status_code, 400)
