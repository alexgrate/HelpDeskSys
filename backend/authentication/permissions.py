from rest_framework import permissions

class IsHelpDeskStaff(permissions.BasePermission):
    def has_permission(self, request, view):
        return (
            request.user and request.user.is_authenticated and (request.user.is_agent or request.user.can_approve or request.user.role_name == 'Admin')
        )

class IsNormalStaff(permissions.BasePermission):
    def has_permission(self, request, view):
        return (
            request.user and request.user.is_authenticated and request.user.role_name == 'Staff'
        )