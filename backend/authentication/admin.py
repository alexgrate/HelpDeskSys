from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Role
from .forms import CustomUserCreationForm, CustomUserChangeForm

class CustomUserAdmin(UserAdmin):
    model = User
    add_form = CustomUserCreationForm
    form = CustomUserChangeForm

    list_display = ('email', 'first_name', 'last_name', 'role', 'branch', 'is_on_duty', 'department', 'is_staff')
    list_filter = ('role', 'branch', 'is_on_duty', 'is_staff', 'is_superuser')


    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Custom Fields', {'fields': ('role', 'branch', 'is_on_duty', 'otp_secret_key', 'department')}),     
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'first_name', 'last_name', 'role', 'branch', 'is_on_duty', 'department'),
        }),
    )

    search_fields = ('email', 'first_name', 'last_name')
    ordering = ('email',)

admin.site.register(User, CustomUserAdmin)
admin.site.register(Role)