from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TicketViewSet, ApprovalRequestViewSet

router = DefaultRouter()
router.register(r'tickets', TicketViewSet, basename='ticket')
router.register(r'approvals', ApprovalRequestViewSet, basename='approval')

urlpatterns = [
    path('', include(router.urls)),
]