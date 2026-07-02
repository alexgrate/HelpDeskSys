import os, threading, secrets
from datetime import timedelta
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django.http import Http404, FileResponse, HttpResponse, HttpResponseForbidden
from django.utils import timezone
from django.db.models import (
    Q, Count, F, Avg, Case, When, Value, IntegerField, DurationField, ExpressionWrapper
)
from django.db import transaction
from django.contrib.auth import get_user_model
from django.contrib.auth.decorators import login_required
from authentication.models import Role
from rest_framework import status, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import Ticket, TicketCategory, TicketComment, ApprovalRequest, ApprovalStep, Department, Notification, TicketAttachment, SystemAuditLog, KnowledgeArticle
from .serializers import (
    TicketSerializer, TicketCreateSerializer, TicketCategorySerializer,
    TicketCommentSerializer, TicketCommentCreateSerializer, ApprovalRequestSerializer,
    DepartmentSerializer, RoleSerializer, UserAdminSerializer, NotificationSerializer,
    SystemAuditLogSerializer,
    KnowledgeArticleListSerializer, KnowledgeArticleDetailSerializer, KnowledgeArticleWriteSerializer
)
from .permissions import IsNormalStaff, IsManagerOrAdmin, IsDepartmentAgentOrHOD

User = get_user_model()

COLOR_PALETTE = ["#3b82f6", "#1d4ed8", "#10b981", "#f59e0b", "#ef4444", "#6366f1", "#8b5cf6", "#ec4899", "#14b8a6"]

def send_email_async(subject, message, recipient_list, html_message=None):
    def send():
        msg = EmailMultiAlternatives(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            recipient_list
        )
        if html_message:
            msg.attach_alternative(html_message, "text/html")
        msg.send(fail_silently=False)

    thread = threading.Thread(target=send)
    thread.start()

class IsSystemAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role_name == 'Admin'


class AuditLogPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 100

    def paginate_queryset(self, queryset, request, view=None):
        self._stats = queryset.aggregate(
            total=Count('id'),
            critical=Count('id', filter=Q(severity='Critical')),
            auth=Count('id', filter=Q(category='Auth')),
            config=Count('id', filter=Q(category__in=['Config', 'SLA', 'Role'])),
        )
        return super().paginate_queryset(queryset, request, view)

    def get_paginated_response(self, data):
        return Response({
            'count': self.page.paginator.count,
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'stats': getattr(self, '_stats', {}),
            'results': data,
        })

class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsSystemAdmin()]

    def perform_create(self, serializer):
        dept = serializer.save()
        log_system_action(
            request=self.request,
            action_text=f"Created new department queue: '{dept.name}'",
            category="Config",
            severity="Notice"
        )

    def perform_update(self, serializer):
        old_dept = self.get_object()
        old_name = old_dept.name
        dept = serializer.save()
        if old_name != dept.name:
            log_system_action(
                request=self.request,
                action_text=f"Renamed department queue '{old_name}' to '{dept.name}'",
                category="Config",
                severity="Notice"
            )

    def perform_destroy(self, instance):
        name = instance.name
        instance.delete()
        log_system_action(
            request=self.request,
            action_text=f"Deleted department queue: '{name}'",
            category="Config",
            severity="Critical"
        )

class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsSystemAdmin()]

    def perform_create(self, serializer):
        role = serializer.save()
        log_system_action(
            request=self.request,
            action_text=f"Created new security role boundary: '{role.name}'",
            category="Config",
            severity="Critical"
        )

    def perform_update(self, serializer):
        old_role = self.get_object()
        old_name = old_role.name
        role = serializer.save()
        if old_name != role.name:
            log_system_action(
                request=self.request,
                action_text=f"Updated security role boundary: '{old_name}' to '{role.name}'",
                category="Config",
                severity="Critical"
            )

    def perform_destroy(self, instance):
        name = instance.name
        instance.delete()
        log_system_action(
            request=self.request,
            action_text=f"Deleted security role boundary: '{name}'",
            category="Config",
            severity="Critical"
        )

class UserAdminViewSet(viewsets.ModelViewSet):
    serializer_class = UserAdminSerializer
    permission_classes = [permissions.IsAuthenticated, IsSystemAdmin]

    def get_queryset(self):
        # UserAdminSerializer reads role.name and department.name per row.
        return User.objects.all().select_related('role', 'department').annotate(
            open_load=Count(
                'assigned_tickets',
                filter=~Q(assigned_tickets__status__in=['Resolved', 'Closed'])
            )
        ).order_by('first_name', 'last_name', 'email')

    def perform_update(self, serializer):
        old_instance = self.get_object()
        old_dept = old_instance.department.name if old_instance.department else "None"
        old_role = old_instance.role.name if old_instance.role else "None"
        
        user = serializer.save()
        
        new_dept = user.department.name if user.department else "None"
        new_role = user.role.name if user.role else "None"
        
        changes = []
        if old_dept != new_dept:
            changes.append(f"Department Queue: '{old_dept}' -> '{new_dept}'")
        if old_role != new_role:
            changes.append(f"Role: '{old_role}' -> '{new_role}'")
            
        if changes:
            log_system_action(
                request=self.request,
                action_text=f"Updated profile for {user.first_name} {user.last_name} ({user.email}): " + ", ".join(changes),
                category="Role",
                severity="Critical"
            )

    @action(detail=False, methods=['post'])
    def invite(self, request):
        email = request.data.get('email', '').strip()
        first_name = request.data.get('first_name', '').strip()
        last_name = request.data.get('last_name', '').strip()
        role_id = request.data.get('role_id')
        department_id = request.data.get('department_id')

        if role_id in ["", "null", "None", None]:
            role_id = None
        if department_id in ["", "null", "None", None]:
            department_id = None

        if not email.endswith('@dash-mfb.com'):
            return Response({"detail": "Only corporate emails ending with @dash-mfb.com are authorized for registration."}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(email=email).exists():
            return Response({"detail": "An employee profile with this email already exists."}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(
            email=email,
            password=secrets.token_urlsafe(16),
            first_name=first_name,
            last_name=last_name,
            role_id=role_id,
            department_id=department_id
        )
        
        user.open_load = 0

        log_system_action(
            request=request,
            action_text=f"Onboarded new team member: {user.first_name} {user.last_name} ({user.email})",
            category="Role",
            severity="Critical"
        )

        return Response(UserAdminSerializer(user).data, status=status.HTTP_201_CREATED)


class TicketViewSet(viewsets.ModelViewSet):
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_serializer_class(self):
        if self.action == 'create':
            return TicketCreateSerializer
        return TicketSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [permissions.IsAuthenticated(), IsNormalStaff()]
        if self.action in ['update', 'partial_update']:
            return [permissions.IsAuthenticated(), IsDepartmentAgentOrHOD()]
        return [permissions.IsAuthenticated()]

    def destroy(self, request, *args, **kwargs):
        if request.user.role_name != 'Admin':
            return Response(
                {"detail": "Unauthorized. Ticket deletion restricted to system administrators only."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)

    def get_queryset(self):
        user = self.request.user

        # Optimized base queryset: TicketSerializer reads submitted_by, assignee,
        # category (+ team + steps/role) and approval_requests/attachments per row.
        base = Ticket.objects.select_related(
            'submitted_by', 'assignee', 'category', 'category__team'
        ).prefetch_related(
            'attachments', 'approval_requests', 'category__steps__role'
        )

        if user.role_name == 'Admin':
            return base

        personal_query = Q(submitted_by=user)

        if user.role_name == 'Agent':
            if user.department:
                category_keys = TicketCategory.objects.filter(team=user.department).values_list('key', flat=True)
                return base.filter(personal_query | (Q(category__in=category_keys) & ~Q(status__startswith='Pending'))).distinct()
            return base.filter(personal_query)

        elif user.can_approve:
            category_keys = []
            if user.department:
                category_keys = TicketCategory.objects.filter(team=user.department).values_list('key', flat=True)
                pending_my_approval = Q(approval_requests__status='Pending', approval_requests__approver_role=user.role_name)
                return base.filter(personal_query | Q(category__in=category_keys) | pending_my_approval).distinct()
            return base.filter(personal_query)

        return base.filter(personal_query)

    @transaction.atomic
    def perform_update(self, serializer):
        instance = Ticket.objects.select_for_update().get(pk=serializer.instance.pk)

        if 'assignee' in serializer.validated_data:
            new_assignee = serializer.validated_data.get('assignee')
            if instance.assignee and instance.assignee != new_assignee and new_assignee is not None:
                from rest_framework.exceptions import ValidationError
                raise ValidationError(
                    {"detail": f"Ownership conflict. This ticket has already been claimed by {instance.assignee.email}."}
                )

        old_status = instance.status
        old_priority = instance.priority
        old_assignee = instance.assignee

        updated_instance = serializer.save()

        if old_assignee != updated_instance.assignee and updated_instance.assignee:
            old_name = old_assignee.email if old_assignee else "None"
            new_name = updated_instance.assignee.email if updated_instance.assignee else "None"

            TicketComment.objects.create(
                ticket=updated_instance,
                comment_type='system',
                body=f"Assignee changed from '{old_name}' to '{new_name}' by {self.request.user.email}"
            )

            if updated_instance.submitted_by.email:
                subject = f"Ticket Claimed: {updated_instance.ticket_id}"
                message = (
                    f"Hello {updated_instance.submitted_by.first_name},\n\n"
                    f"Your ticket #{updated_instance.ticket_id} has been claimed and is now being worked on [4].\n\n"
                    f"    Assigned Agent: {updated_instance.assignee.first_name} {updated_instance.assignee.last_name} ({updated_instance.assignee.email})\n\n"
                    f"You will receive further updates as they process your request."
                )
                send_email_async(subject, message, [updated_instance.submitted_by.email])


        if old_status != updated_instance.status:
            log_system_action(
                request=self.request,
                action_text=f"Status changed from '{old_status}' to '{updated_instance.status}'",
                category="Ticket",
                ticket=updated_instance,
                severity="Info"
            )

            TicketComment.objects.create(
                ticket=updated_instance,
                comment_type='system',
                body=f"Status changed from '{old_status}' to '{updated_instance.status}' by {self.request.user.email}"
            )

            if updated_instance.submitted_by.email:
                subject = f"Ticket Status Update: {updated_instance.ticket_id}"
                message = (
                    f"Hello {updated_instance.submitted_by.first_name},\n\n"
                    f"The status of your ticket #{updated_instance.ticket_id} has been changed from '{old_status}' to '{updated_instance.status}'.\n\n"
                    f"Log in to your portal to review active comments."
                )
                send_email_async(subject, message, [updated_instance.submitted_by.email])
            
        if old_priority != updated_instance.priority:
            log_system_action(
                request=self.request,
                action_text=f"Priority changed from '{old_priority}' to '{updated_instance.priority}'",
                category="SLA" if updated_instance.priority in ["High", "Critical"] else "Ticket",
                ticket=updated_instance,
                severity="Warning" if updated_instance.priority in ["High", "Critical"] else "Info"
            )

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

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def operations_analytics(self, request):
        now_time = timezone.now()
        start_time = now_time - timedelta(days=7)

        categories_db = TicketCategory.objects.all().select_related('team')
        categories_map = {c.key: c for c in categories_db}

        tickets_7d = Ticket.objects.filter(created_at__gte=start_time)
        resolved_7d = tickets_7d.filter(status__in=['Resolved', 'Closed'])

        whens = []
        for cat in categories_db:
            for priority in ['Critical', 'High', 'Medium', 'Low']:
                p_lower = priority.lower()
                limit_hours = getattr(cat, f"sla_{p_lower}_hours", 4)
                whens.append(
                    When(category=cat.key, priority=priority, then=Value(limit_hours))
                )

        resolved_annotated = resolved_7d.annotate(
            allowed_hours=Case(*whens, default=Value(4), output_field=IntegerField()),
            time_spent=ExpressionWrapper(F('resolved_at') - F('created_at'), output_field=DurationField())
        )

        # Materialize once; the per-category SLA breakdown below reuses this list
        # instead of re-querying the DB for every category.
        resolved_records = list(resolved_annotated)
        total_resolved = len(resolved_records)

        sla_compliant_count = sum(
            1 for t in resolved_records
            if t.time_spent <= timedelta(hours=t.allowed_hours)
        )

        compliance_rate = (sla_compliant_count / total_resolved * 100) if total_resolved > 0 else 0.0

        avg_res_time_raw = resolved_7d.aggregate(avg_time=Avg(F('resolved_at') - F('created_at')))['avg_time']
        if avg_res_time_raw:
            total_seconds = int(avg_res_time_raw.total_seconds())
            hours = total_seconds // 3600
            minutes = (total_seconds % 3600) // 60
            avg_res_label = f"{hours}h {minutes}m"
        else:
            avg_res_label = "0h 0m"

        volume_by_hour = [0] * 24
        for t in tickets_7d:
            local_dt = timezone.localtime(t.created_at)
            volume_by_hour[local_dt.hour] += 1

        category_counts = tickets_7d.values('category').annotate(count=Count('id'))
        
        departments_donut = []
        for item in category_counts:
            cat_key = item['category']
            cat_obj = categories_map.get(cat_key)
            name = cat_obj.label if cat_obj else str(cat_key).upper()
            color = getattr(cat_obj, 'color', '#3b82f6') if cat_obj else '#64748b'

            departments_donut.append({
                "name": name,
                "value": item['count'],
                "color": color
            })
        
        if not departments_donut:
            for cat_key, cat_obj in categories_map.items():
                departments_donut.append({
                    "name": cat_obj.label,
                    "value": 0,
                    "color": getattr(cat_obj, 'color', '#64748b')
                })

        sla_by_dept = []
        for cat_key, cat_obj in categories_map.items():
            # category_id holds the category key (FK uses to_field='key'); reading it
            # avoids a lazy DB fetch of the related category per record.
            cat_records = [t for t in resolved_records if t.category_id == cat_key]
            cat_total_resolved = len(cat_records)
            cat_compliant = sum(
                1 for t in cat_records
                if t.time_spent <= timedelta(hours=t.allowed_hours)
            )

            rate = (cat_compliant / cat_total_resolved * 100) if cat_total_resolved > 0 else 100.0
            sla_by_dept.append({
                "dept": cat_obj.label,
                "rate": round(rate, 1)
            })

        active_agents_count = User.objects.filter(role__is_agent=True, is_on_duty=True).count()

        return Response({
            "kpis": {
                "sla_compliance": f"{compliance_rate:.1f}%",
                "avg_resolution": avg_res_label,
                "tickets_per_day": str(max(1, tickets_7d.count() // 7)),
                "active_agents": str(active_agents_count)
            },
            "volume_by_hour": volume_by_hour,
            "departments": departments_donut,
            "sla_by_dept": sla_by_dept
        }, status=status.HTTP_200_OK)

    
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def badge_analytics(self, request):
        user = request.user

        pending_approvals_count = 0
        if user.can_approve or user.role_name == "Admin":
            approvals_query = ApprovalRequest.objects.filter(status='Pending')
            if user.role_name != 'Admin':
                approvals_query = approvals_query.filter(
                    approver_role = user.role_name,
                    approver_department=user.department
                )
            pending_approvals_count = approvals_query.count()

        my_workload_count = Ticket.objects.filter(
            assignee=user
        ).exclude(status__in=['Resolved', 'Closed']).count()

        return Response({
            "pending_approvals": pending_approvals_count,
            "my_workload": my_workload_count
        }, status=status.HTTP_200_OK)


class TicketCategoryViewSet(viewsets.ModelViewSet):
    # TicketCategorySerializer reads team.name and nested steps (+ role, department).
    queryset = TicketCategory.objects.all().select_related('team').prefetch_related(
        'steps__role', 'steps__department'
    )
    serializer_class = TicketCategorySerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsSystemAdmin()]
    
    def perform_create(self, serializer):
        category = serializer.save()
        log_system_action(
            request=self.request,
            action_text=f"Created new ticket category: '{category.label}'",
            category="Config",
            severity="Notice"
        )

    def perform_update(self, serializer):
        old_is_high_risk = self.get_object().is_high_risk
        category = serializer.save()
        
        if old_is_high_risk != category.is_high_risk:
            severity_level = "Critical" if category.is_high_risk else "Notice"
            log_system_action(
                request=self.request,
                action_text=f"Modified category risk level: '{category.label}' -> {'High' if category.is_high_risk else 'Standard'} Risk",
                category="Config",
                severity=severity_level
            )
        else:
            log_system_action(
                request=self.request,
                action_text=f"Updated settings for category: '{category.label}'",
                category="Config",
                severity="Notice"
            )

class ApprovalRequestViewSet(viewsets.ModelViewSet):
    serializer_class = ApprovalRequestSerializer
    permission_classes = [permissions.IsAuthenticated, IsManagerOrAdmin]
    http_method_names = ['get', 'post', 'head', 'options']  

    def get_queryset(self):
        user = self.request.user

        # ApprovalRequestSerializer reads ticket (+ submitted_by), requested_by and
        # ticket.attachments per row; join/prefetch them to avoid N+1.
        base = ApprovalRequest.objects.select_related(
            'ticket', 'ticket__submitted_by', 'requested_by', 'approved_by', 'approver_department'
        ).prefetch_related('ticket__attachments')

        if user.role_name == 'Admin':
            return base

        pending_for_me = Q(status='Pending', approver_role=user.role_name, approver_department=user.department)
        decided_by_me = Q(approved_by=user)

        return base.filter(pending_for_me | decided_by_me).distinct()

    def create(self, request, *args, **kwargs):
        return Response(
            {"detail": "Approval requests are generated automatically by the system."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def decide(self, request, pk=None):
        approval = self.get_object()

        if approval.status != 'Pending':
            return Response(
                {"detail": "This approval request has already been decided."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if request.user.role_name != approval.approver_role and request.user.role_name != 'Admin':
            return Response(
                {"detail": f"Unauthorized. Only users with the active role ({approval.approver_role}) can approve this step."},
                status=status.HTTP_403_FORBIDDEN
            )

        if approval.ticket.submitted_by == request.user and request.user.role_name != 'Admin':
            return Response(
                {"detail": "Self-approval is prohibited under Dual-Control policies."},
                status=status.HTTP_403_FORBIDDEN
            )

        if request.user.role_name != 'Admin' and approval.approver_department:
            if request.user.department != approval.approver_department:
                return Response(
                    {"detail": f"Unauthorized. This approval step is routed specifically to the {approval.approver_department.name} department."},
                    status=status.HTTP_403_FORBIDDEN
                )

        verdict = request.data.get('status')
        comment = request.data.get('comment', '').strip()

        if verdict not in ['Approved', 'Rejected', 'Returned']:
            return Response(
                {"detail": "Decision must be either 'Approved', 'Rejected', or 'Returned'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if verdict in ['Rejected', 'Returned'] and not comment:
            return Response(
                {"detail": f"Justification comment is required when performing a {verdict} action."},
                status=status.HTTP_400_BAD_REQUEST
            )

        approval.status = verdict
        approval.comment = comment
        approval.approved_by = request.user
        approval.save()

        ticket = approval.ticket

        severity_level = "Warning" if verdict in ['Rejected', 'Returned'] else "Notice"
        log_system_action(
            request=request,
            action_text=f"{verdict} approval step {approval.step_number} ({approval.approver_role}) for ticket {ticket.ticket_id}",
            category="Approval",
            ticket=ticket,
            severity=severity_level
        )

        category_obj = ticket.category
        department_name = category_obj.team.name if (category_obj and category_obj.team) else "Operations Team"
        
        next_step = ApprovalStep.objects.filter(
            category=ticket.category,
            step_number__gt=approval.step_number
        ).order_by('step_number').first()

        prev_step = ApprovalStep.objects.filter(
            category=ticket.category,
            step_number__lt=approval.step_number
        ).order_by('-step_number').first()

        if verdict == 'Approved':
            if next_step:
                next_role_name = next_step.role.name
                next_target_dept = next_step.department or (category_obj.team if category_obj else None)

                existing_next = ApprovalRequest.objects.filter(ticket=ticket, step_number=next_step.step_number).first()
                if existing_next:
                    existing_next.status = 'Pending'
                    existing_next.comment = None
                    existing_next.approved_by = None
                    existing_next.approver_department = next_target_dept 
                    existing_next.save()
                else:
                    ApprovalRequest.objects.create(
                        ticket=ticket,
                        category=f"{ticket.category.key.upper()} - {next_role_name}",
                        requested_by=ticket.submitted_by,
                        status='Pending',
                        approver_role=next_role_name,
                        approver_department=next_target_dept, 
                        step_number=next_step.step_number
                    )
                                    
                ticket.status = f"Pending {next_role_name} Approval"
                ticket.save()

                TicketComment.objects.create(
                    ticket=ticket,
                    comment_type='system',
                    body=(
                        f"Level step {approval.step_number} ({approval.approver_role}) approved by {request.user.email}. "
                        f"Ticket escalated to next level step {next_step.step_number} ({next_role_name}) for review."
                    )
                )
            else:
                ticket.status = 'In Progress'
                ticket.save()

                TicketComment.objects.create(
                    ticket=ticket,
                    comment_type='system',
                    body=(
                        f"Compliance override fully authorized by {request.user.email}. "
                        f"Ticket #{ticket.ticket_id} routed to {department_name} for active processing."
                    )
                )

                if ticket.submitted_by.email:
                    subject = f"Dual-Control Authorized: #{ticket.ticket_id}"
                    message = (
                        f"Hello {ticket.submitted_by.first_name},\n\n"
                        f"Your ticket #{ticket.ticket_id} has been fully authorized and approved by the HOD group [1].\n\n"
                        f"The ticket has been routed to the {department_name} queue for active processing."
                    )
                    send_email_async(subject, message, [ticket.submitted_by.email])

        elif verdict == 'Returned':
            if prev_step:
                prev_role_name = prev_step.role.name

                prev_approval = ApprovalRequest.objects.filter(ticket=ticket, step_number=prev_step.step_number).first()
                if prev_approval:
                    prev_approval.status = 'Pending'
                    prev_target_dept = prev_step.department or (category_obj.team if category_obj else None)
                    prev_approval.approver_department = prev_target_dept
                    prev_approval.save()

                ticket.status = f"Pending {prev_role_name} Approval"
                ticket.save()

                TicketComment.objects.create(
                    ticket=ticket,
                    comment_type='system',
                    body=(
                        f"Level step {approval.step_number} ({approval.approver_role}) requested a re-update. "
                        f"Comment: '{comment}'. Routed back to previous step {prev_step.step_number} ({prev_role_name}) for review."
                    )
                )
            else: 
                ticket.status = 'Returned for Update'
                ticket.save()
                TicketComment.objects.create(
                    ticket=ticket,
                    comment_type='system',
                    body=f"Returned for update by {request.user.email}. Reason: '{comment}'."
                )

                if ticket.submitted_by.email:
                    subject = f"Action Required: Ticket #{ticket.ticket_id} Returned for Correction"
                    message = (
                        f"Hello {ticket.submitted_by.first_name},\n\n"
                        f"Your ticket #{ticket.ticket_id} has been returned for update by an HOD [2].\n\n"
                        f"    HOD Comment: \"{comment}\"\n\n"
                        f"Please log in to your dashboard to make the required corrections and resubmit."
                    )
                    send_email_async(subject, message, [ticket.submitted_by.email])

        elif verdict == 'Rejected':
            if prev_step:
                prev_role_name = prev_step.role.name

                prev_approval = ApprovalRequest.objects.filter(ticket=ticket, step_number=prev_step.step_number).first()
                if prev_approval:
                    prev_approval.status = 'Pending'
                    prev_target_dept = prev_step.department or (category_obj.team if category_obj else None)
                    prev_approval.approver_department = prev_target_dept
                    prev_approval.save()

                ticket.status = f"Pending {prev_role_name} Approval"
                ticket.save()

                TicketComment.objects.create(
                    ticket=ticket,
                    comment_type='system',
                    body=(
                        f"Level step {approval.step_number} ({approval.approver_role}) proposed a Rejection. "
                        f"Comment: '{comment}'. Routed back to previous step {prev_step.step_number} ({prev_role_name}) for final review."
                    )
                )
            else:
                ticket.status = 'Closed'
                ticket.save()

                TicketComment.objects.create(
                    ticket=ticket,
                    comment_type='system',
                    body=f"Override rejected by {request.user.email}. Reason: '{comment}'. Ticket closed."
                )

                if ticket.submitted_by.email:
                    subject = f"Ticket Closed / Rejected: #{ticket.ticket_id}"
                    message = (
                        f"Hello {ticket.submitted_by.first_name},\n\n"
                        f"Your request #{ticket.ticket_id} has been rejected by the dual-control authority and closed [1, 2].\n\n"
                        f"    HOD Comment/Reason: \"{comment}\"\n\n"
                        f"If you believe this is an error, please consult your department supervisor."
                    )
                    send_email_async(subject, message, [ticket.submitted_by.email])

        response_data = ApprovalRequestSerializer(approval).data
        return Response(response_data, status=status.HTTP_200_OK)

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'patch', 'delete', 'options', 'head']  

    def get_queryset(self):
        return Notification.objects.filter(
            recipient=self.request.user
        ).select_related('actor', 'ticket')

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        self.get_queryset().filter(unread=True).update(unread=False)
        return Response({"detail": "All notifications marked as read."}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def badge_analytics(self, request):
        user = request.user

        pending_approvals_count = 0
        if user.can_approve or user.role_name == "Admin":
            approvals_query = ApprovalRequest.objects.filter(status='Pending')
            if user.role_name != 'Admin':
                approvals_query = approvals_query.filter(
                    approver_role=user.role_name,
                    approver_department=user.department
                )
            pending_approvals_count = approvals_query.count()

        my_workload_count = Ticket.objects.filter(
            assignee=user
        ).exclude(status__in=['Resolved', 'Closed']).count()

        unread_notifications_count = Notification.objects.filter(
            recipient=user, 
            unread=True
        ).count()

        return Response({
            "pending_approvals": pending_approvals_count,
            "my_workload": my_workload_count,
            "unread_notifications": unread_notifications_count 
        }, status=status.HTTP_200_OK)

@login_required
def protected_media_serve(request, path):
    safe_path = os.path.normpath(path).lstrip('/')
    if safe_path.startswith('..') or os.path.isabs(safe_path):
        return HttpResponseForbidden("Access Denied: Path security violation.")

    db_file_path = os.path.join('ticket_attachments', safe_path)

    try:
        attachment = TicketAttachment.objects.get(file=db_file_path)
    except TicketAttachment.DoesNotExist:
        raise Http404("Attachment not found in records.")
        
    ticket = attachment.ticket
    user = request.user
    authorized = False

    if user.is_superuser or user.role_name == "Admin":
        authorized = True
    elif ticket.submitted_by == user:
        authorized = True
    elif ticket.assignee == user:
        authorized = True
    elif user.can_approve or user.is_agent:
        try:
            category_obj = TicketCategory.objects.get(key=ticket.category_id)
            if user.department == category_obj.team:
                authorized = True
        except TicketCategory.DoesNotExist:
            pass

    if not authorized:
        return HttpResponseForbidden("Unauthorized. You do not have permission to view files attached to this ticket.")

    file_disk_path = os.path.normpath(os.path.join(settings.MEDIA_ROOT, db_file_path))
    if not os.path.exists(file_disk_path):
        raise Http404("File does not exist on disk storage.")

    if settings.DEBUG:
        return FileResponse(open(file_disk_path, 'rb'))

    response = HttpResponse(status=200)
    response['Content-Type'] = ''
    response['X-Accel-Redirect'] = os.path.join('/protected_media', db_file_path)
    return response


def parse_user_agent(ua_string):
    if not ua_string:
        return "Internal"
    ua_string = ua_string.lower()
    
    if "windows" in ua_string:
        os_name = "Win11" if "nt 10.0" in ua_string else "Win10" if "nt 6.2" in ua_string else "Windows"
    elif "macintosh" in ua_string or "mac os x" in ua_string:
        os_name = "macOS"
    elif "iphone" in ua_string or "ipad" in ua_string:
        os_name = "iOS"
    elif "android" in ua_string:
        os_name = "Android"
    elif "linux" in ua_string:
        os_name = "Linux"
    else:
        os_name = "Other"

    if "chrome" in ua_string and "safari" in ua_string:
        browser_name = "Chrome"
    elif "safari" in ua_string and "chrome" not in ua_string:
        browser_name = "Safari"
    elif "firefox" in ua_string:
        browser_name = "Firefox"
    elif "edge" in ua_string or "edg" in ua_string:
        browser_name = "Edge"
    else:
        browser_name = "WebBrowser"

    return f"{os_name} · {browser_name}"

def log_system_action(request, action_text, category, ticket=None, severity="Info"):
    actor = request.user if request and request.user and request.user.is_authenticated else None
    
    ip = "—"
    if request:
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR', '—')

    ua_string = request.META.get('HTTP_USER_AGENT', '') if request else ""
    device = parse_user_agent(ua_string)

    actor_name = "System"
    email = "system@dash-mfb.com"
    if actor:
        actor_name = f"{actor.first_name} {actor.last_name}".strip() or actor.email.split('@')[0]
        email = actor.email

    SystemAuditLog.objects.create(
        actor=actor,
        actor_name_cache=actor_name,
        email_cache=email,
        action=action_text,
        category=category,
        ticket=ticket,
        ip_address=ip,
        device_meta=device,
        severity=severity
    )

class SystemAuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SystemAuditLogSerializer
    permission_classes = [permissions.IsAuthenticated, IsSystemAdmin]
    pagination_class = AuditLogPagination

    def get_queryset(self):
        queryset = SystemAuditLog.objects.all().select_related('ticket')
        category = self.request.query_params.get('category')
        if category and category != 'All':
            queryset = queryset.filter(category=category)

        search = (self.request.query_params.get('search') or '').strip()
        if search:
            queryset = queryset.filter(
                Q(action__icontains=search) |
                Q(actor_name_cache__icontains=search) |
                Q(email_cache__icontains=search) |
                Q(ticket__ticket_id__icontains=search)
            )
        return queryset


class KnowledgeArticleViewSet(viewsets.ModelViewSet):
    lookup_field = 'slug'

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return KnowledgeArticleWriteSerializer
        if self.action == 'retrieve':
            return KnowledgeArticleDetailSerializer
        return KnowledgeArticleListSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsSystemAdmin()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        qs = KnowledgeArticle.objects.select_related('category', 'category__team', 'author')

        if not (user.is_authenticated and user.role_name == 'Admin'):
            qs = qs.filter(status='published')

        category = self.request.query_params.get('category')
        if category and category not in ('', 'All'):
            qs = qs.filter(category__key=category)

        search = (self.request.query_params.get('search') or '').strip()
        if search:
            qs = qs.filter(
                Q(title__icontains=search) |
                Q(summary__icontains=search) |
                Q(content__icontains=search)
            )

        if self.request.query_params.get('sort') == 'popular':
            qs = qs.order_by('-views', '-updated_at')
        return qs

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        KnowledgeArticle.objects.filter(pk=instance.pk).update(views=F('views') + 1)
        instance.views += 1
        return Response(self.get_serializer(instance).data)

    def perform_create(self, serializer):
        article = serializer.save()
        log_system_action(
            request=self.request,
            action_text=f"Published knowledge article: '{article.title}'",
            category="Config",
            severity="Notice",
        )

    def perform_update(self, serializer):
        article = serializer.save()
        log_system_action(
            request=self.request,
            action_text=f"Updated knowledge article: '{article.title}'",
            category="Config",
            severity="Notice",
        )

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def feedback(self, request, slug=None):
        article = self.get_object()
        vote = request.data.get('vote')
        if vote == 'up':
            KnowledgeArticle.objects.filter(pk=article.pk).update(helpful_count=F('helpful_count') + 1)
        elif vote == 'down':
            KnowledgeArticle.objects.filter(pk=article.pk).update(not_helpful_count=F('not_helpful_count') + 1)
        else:
            return Response({"detail": "vote must be 'up' or 'down'."}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"detail": "Feedback recorded."}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def categories(self, request):
        cats = TicketCategory.objects.filter(is_active=True).select_related('team').annotate(
            article_count=Count('articles', filter=Q(articles__status='published'))
        ).order_by('label')
        return Response([{
            "key": c.key,
            "label": c.label,
            "description": c.description,
            "icon_name": c.icon_name,
            "color": c.color,
            "department": c.team.name if c.team else None,
            "article_count": c.article_count,
        } for c in cats])