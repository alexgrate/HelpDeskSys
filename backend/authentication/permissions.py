from rest_framework import permissions

class IsHelpDeskStaff(permissions.BasePermission):
    def has_permission(self, request, view):
        return (
            request.user and request.user.is_authenticated and request.user.role in ['Agent', 'Manager', 'Admin']
        )

class IsNormalStaff(permissions.BasePermission):
    def has_permission(self, request, view):
        return (
            request.user and request.user.is_authenticated and request.user.role == 'Staff'
        )