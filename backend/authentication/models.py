import pyotp
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("An email address is required.")
        email = self.normalize_email(email)
        user = self.model(email=email, username=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)


class Role(models.Model):
    name = models.CharField(max_length=64, unique=True)
    description = models.CharField(max_length=256, null=True, blank=True)
    can_approve = models.BooleanField(default=False)
    is_agent = models.BooleanField(default=False)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class User(AbstractUser):
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=150, unique=True, blank=True, null=True)
    role = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, blank=True)
    branch = models.CharField(max_length=128, default='HQ — Treasury')
    is_on_duty = models.BooleanField(default=True)

    otp_secret_key = models.CharField(max_length=32, default=pyotp.random_base32)
    last_mfa_code = models.CharField(max_length=6, blank=True, null=True)

    department = models.ForeignKey('tickets.Department', on_delete=models.SET_NULL, null=True, blank=True, related_name='members')

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    @property
    def can_approve(self):
        if self.is_superuser:
            return True
        return self.role.can_approve if self.role else False

    @property
    def is_agent(self):
        if self.is_superuser:
            return True
        return self.role.is_agent if self.role else False

    @property
    def role_name(self):
        if self.is_superuser:
            return 'Admin'
        return self.role.name if self.role else 'Staff'

    def __str__(self):
        return self.email