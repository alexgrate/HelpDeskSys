from rest_framework import permissions
from .models import TicketCategory

class IsNormalStaff(permissions.BasePermission):
    """
    Grants access only to users with the 'Staff' role.
    """
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role_name == 'Staff'
        )

class IsManagerOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return (
            request.user and request.user.is_authenticated and (request.user.can_approve or request.user.role_name == 'Admin')
        )

class IsDepartmentAgentOrHOD(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        user = request.user

        if user.is_superuser or user.role_name == 'Admin':
            return True

        if obj.status.startswith('Pending') and 'Approval' in obj.status:
            return False

        if obj.submitted_by == user:
            return True
        
        try:
            if obj.category and obj.category.team:
                return user.department == obj.category.team
        except Exception:
            return False

        return False