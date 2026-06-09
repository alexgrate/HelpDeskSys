from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView, TokenBlacklistView
from .views import LoginView, MfaVerifyView, UserProfileView, MfaResendView

urlpatterns = [
    path('auth/login/', LoginView.as_view(), name='auth_login'),
    path('auth/mfa/verify/', MfaVerifyView.as_view(), name='auth_mfa_verify'),
    path('auth/mfa/resend/', MfaResendView.as_view(), name='auth_mfa_resend'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/logout/', TokenBlacklistView.as_view(), name='token_logout'),
    path('users/me/', UserProfileView.as_view(), name='user_profile'),
]