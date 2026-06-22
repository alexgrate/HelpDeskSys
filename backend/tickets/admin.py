from django import forms
from django.contrib import admin
from .models import Ticket, TicketComment, TicketAttachment, ApprovalRequest, TicketCategory, Department, ApprovalStep

class TicketCategoryAdminForm(forms.ModelForm):
    problems = forms.CharField(
        widget=forms.Textarea(attrs={'rows': 4}),
        help_text="Enter problem types separated by commas (e.g., Password reset, VPN not connecting, Workstation issue)."
    )

    class Meta:
        model = TicketCategory
        fields = '__all__'
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance and self.instance.pk and self.instance.problems:
            self.initial['problems'] = ", ".join(self.instance.problems)

    def clean_problems(self):
        data = self.cleaned_data['problems']
        problem_list = [item.strip() for item in data.split(',') if item.strip()]
        return problem_list


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

@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'description')
    search_fields = ('name',)

class ApprovalStepInline(admin.TabularInline):
    model = ApprovalStep
    extra = 1 

@admin.register(TicketCategory)
class TicketCategoryAdmin(admin.ModelAdmin):
    form = TicketCategoryAdminForm
    list_display  = ('key', 'label', 'team', 'icon_name', 'is_high_risk', 'is_active')
    list_filter   = ('is_high_risk', 'is_active', 'team')
    search_fields = ('key', 'label')
    inlines = [ApprovalStepInline] 
