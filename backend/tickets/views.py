from rest_framework import status, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import Ticket, TicketComment, ApprovalRequest
from .serializers import (
    TicketSerializer, TicketCreateSerializer, 
    TicketCommentSerializer, TicketCommentCreateSerializer, ApprovalRequestSerializer # Added Comment serializers
)
from .permissions import IsNormalStaff, IsManagerOrAdmin

DEPARTMENT_ROUTING = {
    'it':         'IT Helpdesk',
    'core':       'Core Banking Operations',
    'cards':      'Cards Operations Team',
    'facilities': 'Facilities Management',
    'hr':         'Human Resources',
    'compliance': 'Compliance & Risk',
}

class TicketViewSet(viewsets.ModelViewSet):
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_serializer_class(self):
        if self.action == 'create':
            return TicketCreateSerializer
        return TicketSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [permissions.IsAuthenticated(), IsNormalStaff()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'Staff':

            return Ticket.objects.filter(submitted_by=user)
        elif user.role in ['Agent', 'Admin']:
            return Ticket.objects.exclude(status='Pending Manager Approval')
        
        return Ticket.objects.all()

    def perform_update(self, serializer):
        instance = self.get_object()
        old_status = instance.status
        old_priority = instance.priority
        old_assignee = instance.assignee

        updated_instance = serializer.save()

        if old_status != updated_instance.status:
            TicketComment.objects.create(
                ticket=updated_instance,
                comment_type='system',
                body=f"Status changed from '{old_status}' to '{updated_instance.status}' by {self.request.user.email}"
            )
            
        if old_priority != updated_instance.priority:
            TicketComment.objects.create(
                ticket=updated_instance,
                comment_type='system',
                body=f"Priority changed from '{old_priority}' to '{updated_instance.priority}' by {self.request.user.email}"
            )

        if old_assignee != updated_instance.assignee:
            old_name = old_assignee.email if old_assignee else "None"
            new_name = updated_instance.assignee.email if updated_instance.assignee else "None"
            TicketComment.objects.create(
                ticket=updated_instance,
                comment_type='system',
                body=f"Assignee changed from '{old_name}' to '{new_name}' by {self.request.user.email}"
            )

    # Action route: /api/tickets/{id}/comments/
    @action(detail=True, methods=['get', 'post'], permission_classes=[permissions.IsAuthenticated])
    def comments(self, request, pk=None):
        ticket = self.get_object()
        user = request.user

        if request.method == 'GET':
            queryset = ticket.comments.all()
            serializer = TicketCommentSerializer(queryset, many=True)
            return Response(serializer.data)

        elif request.method == 'POST':
            serializer = TicketCommentCreateSerializer(
                data=request.data, 
                context={'request': request, 'ticket': ticket}
            )
            serializer.is_valid(raise_exception=True)
            comment = serializer.save()
            return Response(TicketCommentSerializer(comment).data, status=status.HTTP_201_CREATED)


class ApprovalRequestViewSet(viewsets.ModelViewSet):
    serializer_class = ApprovalRequestSerializer
    permission_classes = [permissions.IsAuthenticated, IsManagerOrAdmin]
    http_method_names = ['get', 'post', 'head', 'options']  # Block PUT/PATCH/DELETE — approvals are decided, not edited

    def get_queryset(self):
        return ApprovalRequest.objects.all()

    def create(self, request, *args, **kwargs):
        # Approval records are only created by the post_save signal, not via API
        return Response(
            {"detail": "Approval requests are generated automatically by the system."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )

    @action(detail=True, methods=['post'])
    def decide(self, request, pk=None):
        approval = self.get_object()

        if approval.status != 'Pending':
            return Response(
                {"detail": "This approval request has already been decided."},
                status=status.HTTP_400_BAD_REQUEST
            )

        verdict = request.data.get('status')
        comment = request.data.get('comment', '').strip()

        if verdict not in ['Approved', 'Rejected']:
            return Response(
                {"detail": "Decision must be either 'Approved' or 'Rejected'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if verdict == 'Rejected' and not comment:
            return Response(
                {"detail": "Rejection requires a justification comment."},
                status=status.HTTP_400_BAD_REQUEST
            )

        approval.status = verdict
        approval.comment = comment
        approval.approved_by = request.user
        approval.save()

        ticket = approval.ticket
        department = DEPARTMENT_ROUTING.get(ticket.category, 'Operations Team')

        if verdict == 'Approved':
            ticket.status = 'In Progress'
            ticket.save()
            TicketComment.objects.create(
                ticket=ticket,
                comment_type='system',
                body=(
                    f"Override approved by {request.user.email}. "
                    f"Ticket #{ticket.ticket_id} routed to {department} for active processing."
                )
            )
        else: 
            ticket.status = 'Closed' # Changed from 'Submitted' to 'Closed'
            ticket.save()
            TicketComment.objects.create(
                ticket=ticket,
                comment_type='system',
                body=(
                    f"Override rejected by {request.user.email}. "
                    f"Reason: {comment}. Ticket closed."
                )
            )

        response_data = ApprovalRequestSerializer(approval).data
        response_data['routed_to'] = department if verdict == 'Approved' else None
        return Response(response_data, status=status.HTTP_200_OK)