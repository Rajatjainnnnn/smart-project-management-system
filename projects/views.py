from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import ProfileSerializer, RegisterSerializer


class RegisterView(generics.CreateAPIView):
	serializer_class = RegisterSerializer
	permission_classes = [AllowAny]
	authentication_classes = []


class ProfileView(generics.RetrieveUpdateAPIView):
	serializer_class = ProfileSerializer
	permission_classes = [IsAuthenticated]

	def get_object(self):
		return self.request.user


class LogoutView(APIView):
	permission_classes = [IsAuthenticated]

	def post(self, request):
		try:
			refresh_token = RefreshToken(request.data.get('refresh'))
			if refresh_token.get('user_id') != str(request.user.pk):
				raise TokenError('Token does not belong to the authenticated user.')
			refresh_token.blacklist()
		except (TokenError, TypeError):
			return Response(
				{'detail': 'A valid refresh token is required.'},
				status=status.HTTP_400_BAD_REQUEST,
			)

		return Response(status=status.HTTP_205_RESET_CONTENT)
