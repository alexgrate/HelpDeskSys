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

        if user.role_name == 'Admin':
            return True

        if obj.status.startswith('Pending') and 'Approval' in obj.status:
            return False

        if obj.submitted_by == user:
            return True
        
        try: 
            category_obj = TicketCategory.objects.get(key=obj.category)
            ticket_department = category_obj.team
        except TicketCategory.DoesNotExist:
            return False

        return user.department == ticket_department