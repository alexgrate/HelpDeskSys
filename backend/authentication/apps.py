# backend/authentication/apps.py

from django.apps import AppConfig

class AuthenticationConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'authentication'

    def ready(self):
        """
        Runs automatically on Django startup. 
        Safely provisions a compliant superuser if none exists.
        """
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            
            # Check if any superuser already exists in the Postgres database
            if not User.objects.filter(is_superuser=True).exists():
                User.objects.create_superuser(
                    email='admin@dashmfb.com',
                    password='ChangeMe@Dash2026'
                )
                print("\n" + "="*50)
                print("COMPLIANCE NOTICE: Auto-generated Admin Superuser")
                print("Email: admin@dashmfb.com")
                print("Password: ChangeMe@Dash2026")
                print("="*50 + "\n")
        except Exception:
            # Wrapped in a try-except block so that it does not crash 
            # during the initial database migrations build phase.
            pass