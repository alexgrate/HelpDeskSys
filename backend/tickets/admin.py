from django.contrib import admin
from .models import Ticket, TicketComment, TicketAttachment, ApprovalRequest

@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display  = ('ticket_id', 'summary', 'category', 'priority', 'status', 'submitted_by', 'created_at')
    list_filter   = ('status', 'priority', 'category')
    search_fields = ('ticket_id', 'summary', 'submitted_by__email')

@admin.register(TicketComment)
class TicketCommentAdmin(admin.ModelAdmin):
    list_display  = ('ticket', 'comment_type', 'author', 'created_at')
    list_filter   = ('comment_type',)

@admin.register(TicketAttachment)
class TicketAttachmentAdmin(admin.ModelAdmin):
    list_display = ('ticket', 'file', 'uploaded_at')

@admin.register(ApprovalRequest)
class ApprovalRequestAdmin(admin.ModelAdmin):
    list_display  = ('id', 'ticket', 'category', 'status', 'requested_by', 'approved_by', 'created_at')
    list_filter   = ('status', 'category')