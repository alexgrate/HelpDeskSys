from rest_framework import permissions

class IsNormalStaff(permissions.BasePermission):
    """
    Grants access only to users with the 'Staff' role.
    """
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'Staff'
        )

class IsManagerOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return (
            request.user and request.user.is_authenticated and request.user.role in ['Manager', 'Admin']
        )