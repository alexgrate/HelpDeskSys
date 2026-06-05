from rest_framework import serializers
from .models import Ticket, TicketAttachment, TicketComment, ApprovalRequest

class TicketAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = TicketAttachment
        fields = ['id', 'file', 'uploaded_at']


class TicketSerializer(serializers.ModelSerializer):
    attachments = TicketAttachmentSerializer(many=True, read_only=True)
    submitted_by_email = serializers.EmailField(source='submitted_by.email', read_only=True)
    assignee_name = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = '__all__'

    def get_assignee_name(self, obj):
        if obj.assignee:
            return f"{obj.assignee.first_name} {obj.assignee.last_name}".strip() or obj.assignee.email
        return None


class TicketCreateSerializer(serializers.ModelSerializer):
    uploaded_files = serializers.ListField(
        child=serializers.FileField(allow_empty_file=False, use_url=False),
        write_only=True,
        required=False
    )

    class Meta:
        model = Ticket
        fields = [
            'ticket_id', 'category', 'problem_type', 'summary', 'description', 
            'impact', 'priority', 'status', 'account_or_card', 'txn_date', 
            'txn_id', 'asset_tag', 'error_code', 'uploaded_files'
        ]
        read_only_fields = ['ticket_id', 'priority', 'status']

    def create(self, validated_data):
        uploaded_files = validated_data.pop('uploaded_files', [])
        category = validated_data.get('category')

        HIGH_RISK_CATEGORIES = ['cards', 'core']

        if category in HIGH_RISK_CATEGORIES:
            validated_data['status'] = 'Pending Manager Approval'
            status_text = 'Pending Manager Approval'
        else:
            validated_data['status'] = 'Submitted'
            status_text = 'Submitted'
        
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
        user = request.user
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
    ticket_category = serializers.CharField(source='ticket.category', read_only=True)  # <-- add this
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