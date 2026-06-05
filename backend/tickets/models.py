import secrets
from django.db import models
from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.dispatch import receiver

User = get_user_model()

def generate_ticket_id():
    while True:
        ticket_id = f"DMFB-{secrets.token_hex(3).upper()}"
        if not Ticket.objects.filter(ticket_id=ticket_id).exists():
            return ticket_id

class Ticket(models.Model):
    CATEGORY_CHOICES = [
        ('it', 'IT Support'),
        ('core', 'Core Banking'),
        ('cards', 'Cards Team'),
        ('facilities', 'Facilities'),
        ('hr', 'Human Resources'),
        ('compliance', 'Compliance / Risk'),
    ]

    IMPACT_CHOICES = [
        ('single', 'Single User'),
        ('team', 'Whole Team'),
        ('branch', 'Entire Branch'),
    ]

    PRIORITY_CHOICES = [
        ('Low', 'Low'),
        ('Medium', 'Medium'),
        ('High', 'High'),
        ('Critical', 'Critical'),
    ]

    STATUS_CHOICES = [
        ('Submitted', 'Submitted'),
        ('Pending Manager Approval', 'Pending Manager Approval'),
        ('In Progress', 'In Progress'),
        ('Resolved', 'Resolved'),
        ('Closed', 'Closed'),
    ]

    ticket_id = models.CharField(max_length=16, unique=True, default=generate_ticket_id, editable=False)
    
    category = models.CharField(max_length=32, choices=CATEGORY_CHOICES)
    problem_type = models.CharField(max_length=128)
    summary = models.CharField(max_length=120)
    description = models.TextField(max_length=2000)
    impact = models.CharField(max_length=16, choices=IMPACT_CHOICES)
    priority = models.CharField(max_length=16, choices=PRIORITY_CHOICES, default='Medium')
    status = models.CharField(max_length=32, choices=STATUS_CHOICES, default='Pending Manager Approval')

    submitted_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='submitted_tickets')
    assignee = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_tickets')

    account_or_card = models.CharField(max_length=32, null=True, blank=True)
    txn_date = models.DateField(null=True, blank=True)
    txn_id = models.CharField(max_length=64, null=True, blank=True)
    asset_tag = models.CharField(max_length=32, null=True, blank=True)
    error_code = models.CharField(max_length=64, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.ticket_id} - {self.summary}"


class TicketAttachment(models.Model):
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(upload_to='ticket_attachments/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Attachment for {self.ticket.ticket_id}"

class TicketComment(models.Model):
    COMMENT_TYPE_CHOICES = [
        ('public', 'Public Reply'),
        ('system', 'System Audit Log'),
    ]


    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    comment_type = models.CharField(max_length=16, choices=COMMENT_TYPE_CHOICES, default='public')
    body = models.TextField(max_length=2000)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.comment_type} on {self.ticket.ticket_id} by {self.author or 'System'}"

class ApprovalRequest(models.Model):
    CATEGORY_CHOICES = [
        ('Cash Reversal', 'Cash Reversal'),
        ('Software Install', 'Software Install'),
        ('Limit Increase', 'Limit Increase'),
        ('Access Request', 'Access Request'),
    ]

    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Approved', 'Approved'),
        ('Rejected', 'Rejected'),
    ]

    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='approval_requests')
    category = models.CharField(max_length=32, choices=CATEGORY_CHOICES)
    requested_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='requested_approvals')
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_approvals')
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default='Pending')
    comment = models.TextField(max_length=1000, null=True, blank=True) # Required if status is Rejected

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Approval {self.id} for {self.ticket.ticket_id}"



@receiver(post_save, sender=Ticket)
def trigger_manager_approval_request(sender, instance, created, **kwargs):

    if instance.status == 'Pending Manager Approval':
        existing_request = ApprovalRequest.objects.filter(ticket=instance, status='Pending').exists()
        
        if not existing_request:
            approval_category = 'Access Request'
            if instance.category in ['cards', 'core']:
                approval_category = 'Cash Reversal' if instance.category == 'cards' else 'Limit Increase'
            elif instance.category == 'facilities':
                approval_category = 'Software Install'

            ApprovalRequest.objects.create(
                ticket=instance,
                category=approval_category,
                requested_by=instance.submitted_by,
                status='Pending'
            )
