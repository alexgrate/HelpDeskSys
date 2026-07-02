import pyotp
import logging
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core import signing
from django.core.exceptions import ValidationError
from django.conf import settings
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.contrib.auth.password_validation import validate_password
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import LoginSerializer, MfaVerifySerializer, UserSerializer
from tickets.views import send_email_async, log_system_action

User = get_user_model()
logger = logging.getLogger(__name__)

class LoginView(APIView):
    authentication_classes = []
    permission_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'

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

        subject = f"Dash MFB Help Desk - Your One-Time Passcode ({mfa_code})"
        message_body = (
            f"Hello {user.first_name or 'User'},\n\n"
            f"You are attempting to log into the Dash MFB Help Desk portal.\n"
            f"Your One-Time Passcode (OTP) is:\n\n"
            f"      {mfa_code}\n\n"
            f"This passcode will rotate in 30 seconds. Do not share this code with anyone."
        )
        send_email_async(subject, message_body, [user.email])

        return Response({
            "step": "mfa",
            "pre_auth_token": pre_auth_token,
            "message": "Credentials valid. Please check your corporate email for your MFA verification code."
        }, status=status.HTTP_200_OK)


class MfaVerifyView(APIView):
    authentication_classes = []
    permission_classes = []

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'mfa'

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
        
        if user.last_mfa_code == code:
            return Response(
                {"detail": "This authorization code has already been verified. Please wait for the next active cycle."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        totp = pyotp.TOTP(user.otp_secret_key)
        is_valid = totp.verify(code, valid_window=1)

        if not is_valid:
            return Response(
                {"detail": "Invalid or expired verification code. Authenticator codes rotate every 30 seconds. Please check the active code or click 'Resend code'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.last_mfa_code = code
        user.is_on_duty = True
        user.save()

        refresh = RefreshToken.for_user(user)

        redirect_to = '/staff-portal' if user.role_name == 'Staff' else '/'

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
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'mfa'

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

        subject = f"Dash MFB Help Desk - Your Regenerated Passcode ({mfa_code})"
        message_body = (
            f"Hello {user.first_name or 'User'},\n\n"
            f"Your regenerated One-Time Passcode (OTP) is:\n\n"
            f"      {mfa_code}\n\n"
            f"This passcode will rotate in 30 seconds."
        )
        send_email_async(subject, message_body, [user.email])

        return Response({
            "message": "New MFA code sent successfully to your corporate inbox."
        }, status=status.HTTP_200_OK)


class PasswordResetRequestView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        email = request.data.get('email', '').strip()
        if not email:
            return Response({"detail": "Email address is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        if not email.endswith('@dash-mfb.com'):
            return Response(
                {"detail": "Only corporate emails ending with @dash-mfb.com are authorized."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(email__iexact=email)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            
            domain = settings.FRONTEND_URL
            reset_url = f"{domain}/reset-password?uid={uid}&token={token}"

            subject = "Dash MFB - Password Reset Request"
            message_body = (
                f"Hello {user.first_name or 'User'},\n\n"
                f"A secure request was initiated to reset your corporate Help Desk account credentials [2].\n"
                f"Please execute the password reset by copying and pasting the URL below into your browser:\n\n"
                f"      {reset_url}\n\n"
                f"This secure link is single-use only and will expire in 15 minutes [2]."
            )

            reset_html = (
                f"<div style='font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;'>"
                f"  <h2 style='color: #1e1b4b; margin-top: 0;'>Dash MFB Help Desk</h2>"
                f"  <p style='font-size: 14px; color: #475569;'>Hello {user.first_name or 'User'},</p>"
                f"  <p style='font-size: 14px; color: #475569;'>A secure request was initiated to reset your corporate Help Desk account credentials [2].</p>"
                f"  <div style='margin: 25px 0;'>"
                f"    <a href='{reset_url}' style='background-color: #4D1D6F; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;'>Reset Password</a>"
                f"  </div>"
                f"  <p style='font-size: 12px; color: #94a3b8; line-height: 1.5;'>This secure link is single-use only and will expire in 15 minutes [2]. "
                f"  If you did not initiate this request, contact an IT Security administrator immediately.</p>"
                f"  <hr style='border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;' />"
                f"  <p style='font-size: 11px; color: #94a3b8;'>If the button above does not work, copy and paste this URL into your browser:</p>"
                f"  <p style='font-size: 11px; color: #3b82f6; word-break: break-all;'>{reset_url}</p>"
                f"</div>"
            )

            send_email_async(subject, message_body, [user.email], html_message=reset_html)
            
            log_system_action(
                request=request,
                action_text=f"Initiated secure password reset sequence for {user.email}",
                category="Auth",
                severity="Notice"
            )
        except User.DoesNotExist:
            pass

        return Response({
            "detail": "If the corporate email exists in our records, a secure reset link has been dispatched."
        }, status=status.HTTP_200_OK)


class PasswordResetConfirmView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        uidb64 = request.data.get('uid')
        token = request.data.get('token')
        new_password = request.data.get('new_password')

        if not uidb64 or not token or not new_password:
            return Response({"detail": "Missing mandatory validation parameters."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response({"detail": "Invalid or expired authorization link."}, status=status.HTTP_400_BAD_REQUEST)

        if not default_token_generator.check_token(user, token):
            return Response({"detail": "Invalid or expired authorization link."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            validate_password(new_password, user)
        except ValidationError as e:
            return Response({"detail": e.messages},
            status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()

        log_system_action(
            request=request,
            action_text=f"Password reset completed successfully for user {user.email}",
            category="Auth",
            severity="Critical"
        )

        return Response({"detail": "Password has been successfully updated. Please sign in."}, status=status.HTTP_200_OK)