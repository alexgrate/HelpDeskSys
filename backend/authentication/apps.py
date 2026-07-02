import os
from django.apps import AppConfig
from django.db.models.signals import post_migrate

def create_default_superuser(sender, **kwargs):
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@dash-mfb.com")
    admin_password = os.environ.get("ADMIN_PASSWORD")

    # Never auto-provision a superuser with a hardcoded/default password.
    # Require ADMIN_PASSWORD to be set explicitly (e.g. in .env) to bootstrap one.
    if not admin_password:
        return

    try:
        if not User.objects.filter(is_superuser=True).exists():
            User.objects.create_superuser(
                email=admin_email,
                password=admin_password
            )
            print("\n" + "="*50)
            print("COMPLIANCE NOTICE: Safe Automated Admin Superuser Provisioned.")
            print(f"Email: {admin_email}")
            print("="*50 + "\n")
    except Exception as e:
        import sys
        sys.stderr.write(f"Failed to auto-provision superuser: {str(e)}\n")

class AuthenticationConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'authentication'

    def ready(self):
        post_migrate.connect(create_default_superuser, sender=self)