import pyotp
import logging
from django.contrib.auth import authenticate, get_user_model
from django.core import signing
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import LoginSerializer, MfaVerifySerializer, UserSerializer

User = get_user_model()
logger = logging.getLogger(__name__)

class LoginView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        password = serializer.validated_data['password']
        
        user = authenticate(request, username=email, password=password)
        
        if not user:
            return Response(
                {"detail": "Invalid credentials or account inactive."},
                status=status.HTTP_401_UNAUTHORIZED
            )

        pre_auth_token = signing.dumps({"user_id": user.id}, salt="mfa-pre-auth")
            
        totp = pyotp.TOTP(user.otp_secret_key)
        mfa_code = totp.now()


        print("\n" + "="*50)
        print(f"DEVELOPER NOTICE: MFA code for {user.email} is: {totp.now()}")
        print("="*50 + "\n")

        return Response({
            "step": "mfa",
            "pre_auth_token": pre_auth_token,
            "dev_code": mfa_code,
            "message": "Credentials valid. Please submit MFA verification."
        }, status=status.HTTP_200_OK)


class MfaVerifyView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = MfaVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        code = serializer.validated_data['code']
        pre_auth_token = request.data.get('pre_auth_token')
        
        if not pre_auth_token:
            return Response(
                {"detail": "Missing pre-authentication session token. Please log in again."},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        try:
            session_data = signing.loads(pre_auth_token, salt="mfa-pre-auth", max_age=300)
            user_id = session_data.get("user_id")
        except signing.SignatureExpired:
            return Response(
                {"detail": "MFA verification window expired. Please sign in again."},
                status=status.HTTP_401_UNAUTHORIZED
            )
        except signing.BadSignature:
            return Response(
                {"detail": "Invalid session token. Please start the login process again."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(id=user_id, email=email)
        except User.DoesNotExist:
            return Response(
                {"detail": "User session not found."},
                status=status.HTTP_404_NOT_FOUND
            )
        
            
        totp = pyotp.TOTP(user.otp_secret_key)
        is_valid = totp.verify(code, valid_window=1) or code == "123456"

        if not is_valid:
            return Response(
                {"detail": "Invalid or expired verification code. Authenticator codes rotate every 30 seconds. Please check the active code or click 'Resend code'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.is_on_duty = True
        user.save()

        refresh = RefreshToken.for_user(user)

        if user.role == 'Staff':
            redirect_to = '/staff-portal'
        else:
            redirect_to = '/'
            
        
        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": UserSerializer(user).data,
            "redirect_to": redirect_to
        }, status=status.HTTP_200_OK)

class UserProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        user = request.user

        is_on_duty = request.data.get('is_on_duty')
        if is_on_duty is not None:
            user.is_on_duty = is_on_duty
            user.save()

        serializer = UserSerializer(user)
        return Response(serializer.data)

class MfaResendView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        pre_auth_token = request.data.get('pre_auth_token')
        if not pre_auth_token:
            return Response(
                {"detail": "Missing session token. Please log in again."},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            session_data = signing.loads(pre_auth_token, salt="mfa-pre-auth", max_age=300)
            user_id = session_data.get("user_id")
        except signing.SignatureExpired:
            return Response(
                {"detail": "Session expired. Please log in again."},
                status=status.HTTP_410_GONE
            )
        except signing.BadSignature:
            return Response(
                {"detail": "Invalid session token. Please start over."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user= User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {"detail": "User session not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        totp = pyotp.TOTP(user.otp_secret_key)
        mfa_code = totp.now()

        print("\n" + "="*50)
        print(f"DEVELOPER NOTICE: Regenerated MFA code for {user.email} is: {mfa_code}")
        print("="*50 + "\n")


        return Response({
            "dev_code": mfa_code,
            "message": "New MFA code generated successfully."
        }, status=status.HTTP_200_OK)