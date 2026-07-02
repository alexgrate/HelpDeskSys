from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TicketViewSet, ApprovalRequestViewSet, TicketCategoryViewSet, DepartmentViewSet, RoleViewSet, UserAdminViewSet, NotificationViewSet, SystemAuditLogViewSet, KnowledgeArticleViewSet

router = DefaultRouter()
router.register(r'tickets', TicketViewSet, basename='ticket')
router.register(r'approvals', ApprovalRequestViewSet, basename='approval')
router.register(r'categories', TicketCategoryViewSet, basename='category')
router.register(r'departments', DepartmentViewSet, basename='department')
router.register(r'roles', RoleViewSet, basename='role')
router.register(r'users', UserAdminViewSet, basename='user')
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'audit-logs', SystemAuditLogViewSet, basename='audit-log') 
router.register(r'knowledge', KnowledgeArticleViewSet, basename='knowledge')


urlpatterns = [
    path('', include(router.urls)),
]