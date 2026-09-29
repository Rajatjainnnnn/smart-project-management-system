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
