import secrets
from django import forms
from django.contrib.auth.forms import UserCreationForm, UserChangeForm
from .models import User

class CustomUserCreationForm(UserCreationForm):
    class Meta:
        model = User
        fields = ('email', 'first_name', 'last_name', 'role', 'branch', 'is_on_duty', 'department')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        if 'password1' in self.fields:
            self.fields['password1'].required = False
        if 'password2' in self.fields:
            self.fields['password2'].required = False

    def clean(self):
        cleaned_data = super().clean()
        p1 = cleaned_data.get("password1")
        p2 = cleaned_data.get("password2")

        if not p1 and not p2:
            # No password supplied by the admin: assign a random one-time secret.
            # The user gains access via the password-reset ("Forgot Password") flow.
            default_pw = secrets.token_urlsafe(16)
            cleaned_data["password1"] = default_pw
            cleaned_data["password2"] = default_pw
            
        return cleaned_data
    
    def clean_email(self):
        email = self.cleaned_data.get('email')
        if email and not email.endswith('@dash-mfb.com'):
            raise forms.ValidationError("Email must end with @dash-mfb.com")
        return email


class CustomUserChangeForm(UserChangeForm):
    class Meta:
        model = User
        fields = ('email', 'first_name', 'last_name', 'role', 'branch', 'is_on_duty', 'department')