import os
from rest_framework import serializers
from django.db import transaction
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from authentication.models import Role
from .models import Ticket, TicketCategory, TicketAttachment, TicketComment, ApprovalRequest, ApprovalStep, Department, Notification, SystemAuditLog

User = get_user_model()

ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.pdf', '.docx', '.xlsx', '.txt']
MAX_FILE_SIZE = 10 * 1024 * 1024

def validate_secure_file(file_obj):
    if file_obj.size > MAX_FILE_SIZE:
        raise ValidationError(
            f"File '{file_obj.name}' exceeds the maximum allowed upload limit of 10MB."
        )

    ext = os.path.splitext(file_obj.name)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValidationError(
            f"File '{file_obj.name}' has an unauthorized extension. Allowed formats: PNG, JPG, PDF, DOCX, XLSX, TXT."
        )

    content_type = file_obj.content_type.lower() if file_obj.content_type else ""
    blocked_mimes = ['text/html', 'text/javascript', 'application/javascript', 'application/x-msdownload', 'application/octet-stream']
    
    if any(blocked in content_type for blocked in blocked_mimes) and ext not in ['.bin', '.dat']:
        raise ValidationError(
            f"File '{file_obj.name}' contains a prohibited MIME type."
        )

class TicketAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = TicketAttachment
        fields = ['id', 'file', 'uploaded_at']


class TicketSerializer(serializers.ModelSerializer):
    attachments = TicketAttachmentSerializer(many=True, read_only=True)
    submitted_by_email = serializers.EmailField(source='submitted_by.email', read_only=True)
    assignee_name = serializers.SerializerMethodField()
    approval_sequence = serializers.SerializerMethodField()
    active_approval_step = serializers.SerializerMethodField()
    active_approver_role = serializers.SerializerMethodField()
    category_department = serializers.SerializerMethodField()

    category_label = serializers.SerializerMethodField()
    category_color = serializers.SerializerMethodField()

    sla_hours = serializers.SerializerMethodField()

    uploaded_files = serializers.ListField(
        child=serializers.FileField(allow_empty_file=False, use_url=False, validators=[validate_secure_file]),
        write_only=True,
        required=False
    )

    class Meta:
        model = Ticket
        fields = '__all__'

    def get_sla_hours(self, obj):
        if obj.category:
            return {
                'Critical': obj.category.sla_critical_hours,
                'High': obj.category.sla_high_hours,
                'Medium': obj.category.sla_medium_hours,
                'Low': obj.category.sla_low_hours,
            }
        return None

    def get_category_label(self, obj):
        try:
            if obj.category:
                return obj.category.label
            return "UNKNOWN"
        except Exception:
            return str(obj.category_id).upper() if obj.category_id else "UNKNOWN"

    def get_category_color(self, obj):
        try:
            if obj.category:
                return getattr(obj.category, 'color', '#3b82f6')
            return '#64748b'
        except Exception:
            return '#64748b'

    def get_assignee_name(self, obj):
        if obj.assignee:
            return f"{obj.assignee.first_name} {obj.assignee.last_name}".strip() or obj.assignee.email
        return None

    def get_approval_sequence(self, obj):
        try:
            if obj.category:
                return list(obj.category.steps.order_by('step_number').values_list('role__name', flat=True))
            return []
        except Exception:
            return []

    def get_active_approval_step(self, obj):
        if obj.status.startswith("Pending") and "Approval" in obj.status:
            active_req = obj.approval_requests.filter(status='Pending').order_by('step_number').first()
            if active_req:
                return active_req.step_number
        return None

    def get_active_approver_role(self, obj):
        if obj.status.startswith("Pending") and "Approval" in obj.status:
            active_req = obj.approval_requests.filter(status='Pending').order_by('step_number').first()
            if active_req:
                return active_req.approver_role
        return None

    def get_category_department(self, obj):
        try:
            if obj.category and obj.category.team:
                return obj.category.team.name
            return None
        except Exception:
            return None

    def validate(self, attrs):
        user = self.context['request'].user
        instance = self.instance

        if instance:
            if instance.status.startswith("Pending") and "Approval" in instance.status:
                restricted_fields = ['status', 'assignee', 'priority']
                for field in restricted_fields:
                    if field in attrs and attrs[field] != getattr(instance, field):
                        raise serializers.ValidationError(
                            {field: "This ticket must first be approved before any operational actions can be taken."}
                        )

            if user.role_name == 'Staff':
                if instance.status != 'Returned for Update':
                    raise serializers.ValidationError(
                        "You cannot modify a ticket that is currently active and in process."
                    )
                
                unauthorized_fields = ['priority', 'assignee', 'ticket_id', 'submitted_by']
                for field in unauthorized_fields:
                    if field in attrs and attrs[field] != getattr(instance, field):
                        raise serializers.ValidationError(
                            {field: "You do not have administrative permission to modify this field."}
                        )
                
                if 'status' in attrs:
                    allowed_resubmit_statuses = ['Pending Manager Approval', 'Pending Approval', 'Pending']
                    if attrs['status'] not in allowed_resubmit_statuses:
                        raise serializers.ValidationError(
                            {"status": "You do not have permission to manually assign this status."}
                        )
        return attrs

    def update(self, instance, validated_data):
        uploaded_files = validated_data.pop('uploaded_files', [])
        status = validated_data.get('status', instance.status)

        if status in ['Pending Manager Approval', 'Pending Approval', 'Pending']:
            validated_data['status'] = 'Pending Approval'
            try:
                category_obj = TicketCategory.objects.get(key=instance.category)
                first_step = category_obj.steps.order_by('step_number').first()
                if first_step:                  
                    first_req = instance.approval_requests.filter(step_number=first_step.step_number).first()
                    if first_req:
                        first_req.status = 'Pending'
                        first_req.comment = None
                        first_req.approved_by = None
                        first_req.save()
                    
                    instance.approval_requests.filter(step_number__gt=first_step.step_number).delete()
            except TicketCategory.DoesNotExist:
                pass

        for file in uploaded_files:
            TicketAttachment.objects.create(ticket=instance, file=file)
            
        return super().update(instance, validated_data)


class TicketCreateSerializer(serializers.ModelSerializer):
    uploaded_files = serializers.ListField(
        child=serializers.FileField(allow_empty_file=False, use_url=False, validators=[validate_secure_file]),
        write_only=True,
        required=False
    )
    category = serializers.SlugRelatedField(slug_field='key', queryset=TicketCategory.objects.all())

    class Meta:
        model = Ticket
        fields = [
            'ticket_id', 'category', 'problem_type', 'summary', 'description', 
            'impact', 'priority', 'status', 'account_or_card', 'txn_date', 
            'txn_id', 'asset_tag', 'error_code', 'uploaded_files'
        ]
        read_only_fields = ['ticket_id', 'priority', 'status']

    def validate(self, attrs):
        category = attrs.get('category')

        if category in ['core', 'cards']:
            if not attrs.get('account_or_card'):
                raise serializers.ValidationError({"account_or_card": "Account or Card number is required for financial operations."})
            if not attrs.get('txn_date'):
                raise serializers.ValidationError({"txn_date": "Transaction date is required for financial operations."})
            if not attrs.get('txn_id'):
                raise serializers.ValidationError({"txn_id": "Transaction ID is required for financial operations."})
        elif category == 'it':
            if not attrs.get('asset_tag'):
                raise serializers.ValidationError({"asset_tag": "Asset tag is required for IT support requests."})
            if not attrs.get('error_code'):
                raise serializers.ValidationError({"error_code": "Error code is required for IT support requests."})
        return attrs

    def create(self, validated_data):
        uploaded_files = validated_data.pop('uploaded_files', [])
        category = validated_data.get('category')

        try:
            category_obj = TicketCategory.objects.get(key=category)
            is_high_risk = category_obj.is_high_risk
        except TicketCategory.DoesNotExist:
            is_high_risk = False
        
        if is_high_risk:
            first_step = category_obj.steps.order_by('step_number').first()
            if first_step:
                status_text = f"Pending {first_step.role.name} Approval"
            else:
                status_text = "Pending Approval"
        else:
            status_text = 'New'
        
        validated_data['status'] = status_text
        
        impact = validated_data.get('impact')
        if impact == 'branch':
            validated_data['priority'] = 'Critical'
        elif impact == 'team':
            validated_data['priority'] = 'High'
        else:
            validated_data['priority'] = 'Medium'

        request = self.context.get('request')
        if request and request.user:
            validated_data['submitted_by'] = request.user

        ticket = Ticket.objects.create(**validated_data)

        TicketComment.objects.create(
            ticket=ticket,
            comment_type='system',
            body=f"Ticket registered. Automatically routed to queue with status: {status_text}."
        )

        for file in uploaded_files:
            TicketAttachment.objects.create(ticket=ticket, file=file)

        return ticket
        
class TicketCommentSerializer(serializers.ModelSerializer):
    author_email = serializers.EmailField(source='author.email', read_only=True)
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = TicketComment
        fields = ['id', 'comment_type', 'body', 'author_email', 'author_name', 'created_at']

    def get_author_name(self, obj):
        if obj.author:
            name = f"{obj.author.first_name} {obj.author.last_name}".strip()
            return name or obj.author.email
        return "System Control"

class TicketCommentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TicketComment
        fields = ['comment_type', 'body']

    def validate(self, attrs):
        request = self.context.get('request')
        comment_type = attrs.get('comment_type', 'public')

        if comment_type == 'system':
            raise serializers.ValidationError(
                {"comment_type": "System logs are generated automatically by state transitions."}
            )

        return attrs

    def create(self, validated_data):
        ticket = self.context.get('ticket')
        request = self.context.get('request')
        validated_data['ticket'] = ticket
        validated_data['author'] = request.user
        return super().create(validated_data)


class ApprovalRequestSerializer(serializers.ModelSerializer):
    ticket_id_ref  = serializers.CharField(source='ticket.ticket_id', read_only=True)
    title          = serializers.CharField(source='ticket.summary', read_only=True)
    reason         = serializers.CharField(source='ticket.description', read_only=True)
    impact         = serializers.CharField(source='ticket.impact', read_only=True)
    priority       = serializers.CharField(source='ticket.priority', read_only=True)
    amount         = serializers.CharField(source='ticket.account_or_card', read_only=True)
    ticket_category = serializers.CharField(source='ticket.category', read_only=True)  
    branch         = serializers.SerializerMethodField()
    requester      = serializers.SerializerMethodField()
    attachments    = serializers.SerializerMethodField()

    class Meta:
        model = ApprovalRequest
        fields = '__all__'

    def get_branch(self, obj):
        return obj.ticket.submitted_by.branch if obj.ticket.submitted_by else "Head Office"

    def get_requester(self, obj):
        if obj.requested_by:
            name = f"{obj.requested_by.first_name} {obj.requested_by.last_name}".strip()
            return name or obj.requested_by.email
        return "Unknown Requester"

    def get_attachments(self, obj):
        return obj.ticket.attachments.count()


class ApprovalStepNestedSerializer(serializers.ModelSerializer):
    role_id = serializers.PrimaryKeyRelatedField(source='role', queryset=Role.objects.all())
    role_name = serializers.CharField(source='role.name', read_only=True)
    department_id = serializers.PrimaryKeyRelatedField(
        source='department', 
        queryset=Department.objects.all(), 
        required=False, 
        allow_null=True
    )
    department_name = serializers.CharField(source='department.name', read_only=True, allow_null=True)

    class Meta:
        model = ApprovalStep
        fields = ['id', 'step_number', 'role_id', 'role_name', 'department_id', 'department_name']


class TicketCategorySerializer(serializers.ModelSerializer):
    team_id = serializers.PrimaryKeyRelatedField(source='team', queryset=Department.objects.all(), write_only=True)
    team_name = serializers.CharField(source='team.name', read_only=True)
    steps = ApprovalStepNestedSerializer(many=True, required=False)

    class Meta:
        model = TicketCategory
        fields = ['id', 'key', 'label', 'team_name', 'team_id', 'description', 'problems', 'icon_name', 'is_high_risk', 'is_active', 'steps', 'sla_critical_hours', 'sla_high_hours', 'sla_medium_hours', 'sla_low_hours']

    def create(self, validated_data):
        steps_data = validated_data.pop('steps', [])
        
        with transaction.atomic():
            category = TicketCategory.objects.create(**validated_data)
            for idx, step_data in enumerate(steps_data, start=1):
                role = step_data.get('role')
                if role:
                    ApprovalStep.objects.create(
                        category=category,
                        step_number=idx, 
                        role=role,
                        department=step_data.get('department')
                    )
        return category
    
    def update(self, instance, validated_data):
        steps_data = validated_data.pop('steps', None)
        
        with transaction.atomic():
            instance = super().update(instance, validated_data)
            
            if steps_data is not None:
                instance.steps.all().delete()
                for idx, step_data in enumerate(steps_data, start=1):
                    role = step_data.get('role')
                    if role:
                        ApprovalStep.objects.create(
                            category=instance,
                            step_number=idx,  
                            role=role,
                            department=step_data.get('department')
                        )
        return instance

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ['id', 'name']

class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = ['id', 'name', 'description', 'can_approve', 'is_agent']

class UserAdminSerializer(serializers.ModelSerializer):
    open_load = serializers.IntegerField(read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True, allow_null=True)
    role_name = serializers.CharField(source='role.name', read_only=True, allow_null=True)
    role_id = serializers.PrimaryKeyRelatedField(source='role', queryset=Role.objects.all(), required=False, allow_null=True)
    department_id = serializers.PrimaryKeyRelatedField(source='department', queryset=Department.objects.all(), required=False, allow_null=True)

    def validate_email(self, value):
        if value and not value.endswith('dash-mfb.com'):
            raise serializers.ValidationError("Email must end with @dash-mfb.com")
        return value

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'role_id', 'role_name', 
            'branch', 'is_on_duty', 'department_id', 'department_name', 'open_load'
        ]

class NotificationSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()
    branch = serializers.SerializerMethodField()
    ticket_id_ref = serializers.CharField(source='ticket.ticket_id', read_only=True)
    time_label = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = '__all__'

    def get_actor_name(self, obj):
        if obj.actor:
            name = f"{obj.actor.first_name} {obj.actor.last_name}".strip()
            return name or obj.actor.email.split('@')[0]
        return "System"

    def get_branch(self, obj):
        return obj.actor.branch if obj.actor else None

    def get_time_label(self, obj):
        now = timezone.now()
        diff = now - obj.created_at
        if diff.days == 0:
            if diff.seconds < 60:
                return "Just now"
            if diff.seconds < 3600:
                return f"{diff.seconds // 60} min ago"
            return f"{diff.seconds // 3600} hr ago"
        elif diff.days == 1:
            return f"Yesterday"
        else:
            return obj.created_at.strftime("%b %d")

class SystemAuditLogSerializer(serializers.ModelSerializer):
    ts = serializers.SerializerMethodField()
    date = serializers.SerializerMethodField()
    actor = serializers.CharField(source='actor_name_cache', read_only=True)
    email = serializers.CharField(source='email_cache', read_only=True)
    ticket = serializers.CharField(source='ticket.ticket_id', read_only=True, allow_null=True)
    ip = serializers.CharField(source='ip_address', read_only=True)
    device = serializers.CharField(source='device_meta', read_only=True)

    class Meta:
        model = SystemAuditLog
        fields = ['ts', 'date', 'actor', 'email', 'action', 'category', 'ticket', 'ip', 'device', 'severity']

    def get_ts(self, obj):
        local_dt = timezone.localtime(obj.created_at)
        return local_dt.strftime("%H:%M:%S")

    def get_date(self, obj):
        return obj.created_at.date().isoformat()