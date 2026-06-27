import secrets, re
from django.db import models
from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

User = get_user_model()

class Department(models.Model):
    name = models.CharField(max_length=64, unique=True)
    description = models.CharField(max_length=256, null=True, blank=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name
    
ICON_CHOICES = [
    ('Monitor', 'Monitor / Workstations'),
    ('Banknote', 'Banknote / Core Banking'),
    ('CreditCard', 'CreditCard / ATM & Cards'),
    ('Wrench', 'Wrench / Facilities'),
    ('Users', 'Users / HR Services'),
    ('ShieldAlert', 'ShieldAlert / Compliance & Risk'),
    ('ShoppingBag', 'ShoppingBag / Procurement'),
    ('Scale', 'Scale / Legal'),
    ('Key', 'Key / Access Security'),
    ('Database', 'Database / Core Engine'),
    ('HelpCircle', 'HelpCircle / General Inquiries'),
    ('Activity', 'Activity / System Status'),
    ('UserCog', 'UserCog / Administrative Overrides'),
    ('Laptop', 'Laptop / Asset Provisioning'),
]


def generate_ticket_id():
    while True:
        ticket_id = f"DMFB-{secrets.token_hex(3).upper()}"
        if not Ticket.objects.filter(ticket_id=ticket_id).exists():
            return ticket_id

class Ticket(models.Model):
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

    ticket_id = models.CharField(max_length=16, unique=True, default=generate_ticket_id, editable=False)
    
    # RESOLVED: Changed reference to a string literal 'TicketCategory' to bypass NameError
    category = models.ForeignKey('TicketCategory', on_delete=models.PROTECT, to_field='key', related_name='tickets')
    
    problem_type = models.CharField(max_length=128)
    summary = models.CharField(max_length=120)
    description = models.TextField(max_length=2000)
    impact = models.CharField(max_length=16, choices=IMPACT_CHOICES)
    priority = models.CharField(max_length=16, choices=PRIORITY_CHOICES, default='Medium')
    status = models.CharField(max_length=64, default='New')

    submitted_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='submitted_tickets')
    assignee = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_tickets')

    account_or_card = models.CharField(max_length=32, null=True, blank=True)
    txn_date = models.DateField(null=True, blank=True)
    txn_id = models.CharField(max_length=64, null=True, blank=True)
    asset_tag = models.CharField(max_length=32, null=True, blank=True)
    error_code = models.CharField(max_length=64, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if self.status in ['Resolved', 'Closed']:
            if not self.resolved_at:
                self.resolved_at = timezone.now()
        else:
            self.resolved_at = None
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.ticket_id} - {self.summary}"

class TicketCategory(models.Model):
    key = models.CharField(max_length=32, unique=True)
    label = models.CharField(max_length=64)
    description = models.CharField(max_length=256)
    problems = models.JSONField(default=list)
    is_high_risk = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    team = models.ForeignKey(Department, on_delete=models.PROTECT, related_name='categories')
    icon_name = models.CharField(max_length=32, choices=ICON_CHOICES, default='Monitor')

    sla_critical_hours = models.PositiveIntegerField(default=1)
    sla_high_hours = models.PositiveIntegerField(default=2)
    sla_medium_hours = models.PositiveIntegerField(default=4)
    sla_low_hours = models.PositiveIntegerField(default=8)

    color = models.CharField(max_length=7, default='#4f1a60')

    class Meta:
        verbose_name_plural = "Ticket Categories"

    def __str__(self):
        return self.label


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
    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Approved', 'Approved'),
        ('Rejected', 'Rejected'),
        ('Returned', 'Returned'),
    ]

    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='approval_requests')
    category = models.CharField(max_length=64)
    requested_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='requested_approvals')
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_approvals')
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default='Pending')
    comment = models.TextField(max_length=1000, null=True, blank=True) 
    step_number = models.IntegerField(default=1)
    approver_role = models.CharField(max_length=32, default='HOD')
    approver_department = models.ForeignKey(Department, on_delete=models.PROTECT, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Approval {self.id} for {self.ticket.ticket_id}"

class ApprovalStep(models.Model):
    category = models.ForeignKey(TicketCategory, on_delete=models.CASCADE, related_name='steps')
    role = models.ForeignKey('authentication.Role', on_delete=models.PROTECT)
    step_number = models.PositiveIntegerField(default=1)
    department = models.ForeignKey(Department, on_delete=models.PROTECT, null=True, blank=True)

    class Meta:
        ordering = ['step_number']
        unique_together = ('category', 'step_number')

    def __str__(self):
        return f"Step {self.step_number}: {self.role.name} for {self.category.label}"

class Notification(models.Model):
    KIND_CHOICES = [
        ('sla', 'SLA Warning'),
        ('assignment', 'Ticket Assignment'),
        ('mention', 'Comment Mention'),
        ('approval', 'Approval Request'),
        ('comment', 'New Comment'),
        ('status', 'Ticket Status Update'),
        ('system', 'System/Maintenance Alert'),
    ]

    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='triggered_notifications')
    kind = models.CharField(max_length=16, choices=KIND_CHOICES)
    title = models.CharField(max_length=128)
    body = models.TextField(max_length=1000)
    ticket = models.ForeignKey(Ticket, on_delete=models.SET_NULL, null=True, blank=True, related_name='notifications')
    
    unread = models.BooleanField(default=True)
    urgent = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.kind} alert for {self.recipient.email} - {self.title}"

@receiver(post_save, sender=Ticket)
def trigger_manager_approval_request(sender, instance, created, **kwargs):
    if instance.status.startswith('Pending') and 'Approval' in instance.status:
        steps = ApprovalStep.objects.filter(category=instance.category).order_by('step_number')
        
        if steps.exists():
            existing_requests = ApprovalRequest.objects.filter(ticket=instance)

            if not existing_requests.exists():
                first_step = steps.first()
                category_obj = instance.category
                target_dept = first_step.department or category_obj.team

                ApprovalRequest.objects.create(
                    ticket=instance,
                    category=f"{category_obj.key.upper()} - {first_step.role.name}",
                    requested_by=instance.submitted_by,
                    status='Pending',
                    approver_role=first_step.role.name,
                    approver_department=target_dept,  
                    step_number=first_step.step_number
                )

@receiver(post_save, sender=Ticket)
def notify_new_ticket_creation(sender, instance, created, **kwargs):
    if created and instance.status == 'New':
        from tickets.views import send_email_async
        
        category_obj = instance.category
        if category_obj and category_obj.team:
            agents = User.objects.filter(role__is_agent=True, department=category_obj.team)
            recipient_list = [agent.email for agent in agents if agent.email]

            if recipient_list:
                subject = f"New Ticket Routed to Queue: {instance.ticket_id}"
                message = (
                    f"Hello Team,\n\n"
                    f"A new ticket has been submitted under your department's queue.\n\n"
                    f"    Ticket ID: {instance.ticket_id}\n"
                    f"    Summary: {instance.summary}\n"
                    f"    Priority: {instance.priority}\n\n"
                    f"Please log in to your dashboard to claim and begin active processing."
                )
                send_email_async(subject, message, recipient_list)


@receiver(post_save, sender=ApprovalRequest)
def notify_managers_of_pending_approval(sender, instance, created, **kwargs):
    if created and instance.status == 'Pending':
        from tickets.views import send_email_async

        managers = User.objects.filter(
            role__name=instance.approver_role,
            department=instance.approver_department
        )
        for mgr in managers:
            Notification.objects.create(
                recipient=mgr,
                actor=instance.requested_by,
                kind='approval',
                title=f"Approval needed · {instance.ticket.ticket_id}",
                body=f"{instance.requested_by.first_name} {instance.requested_by.last_name} requests your approval on: {instance.ticket.summary}.",
                ticket=instance.ticket 
            )

            recipient_list = [mgr.email for mgr in managers if mgr.email]
            if recipient_list:
                subject = f"Action Required: Dual-Control Approval Needed for {instance.ticket.ticket_id}"
                message = (
                    f"Hello Manager,\n\n"
                    f"{instance.requested_by.first_name} {instance.requested_by.last_name} has submitted a high-risk request that requires your dual-control authorization [1].\n\n"
                    f"    Ticket ID: {instance.ticket.ticket_id}\n"
                    f"    Summary: {instance.ticket.summary}\n"
                    f"    Priority: {instance.ticket.priority}\n"
                    f"    Current Step: {instance.category}\n\n"
                    f"Please log in to your Approvals Hub to review and execute your decision [1, 2]."
                )
                send_email_async(subject, message, recipient_list)

@receiver(post_save, sender=TicketComment)
def notify_comment_activities(sender, instance, created, **kwargs):
    if created:
        from ticket.views import send_email_async

        mentions = re.findall(r'@(\w+)', instance.body.lower())
        notified_users = set()

        for prefix in mentions:
            user = User.objects.filter(email__istartswith=prefix).first()
            if user and user != instance.author:
                Notification.objects.create(
                    recipient=user,
                    actor=instance.author,
                    kind='mention',
                    title=f"{instance.author.first_name or 'Someone'} mentioned you",
                    body=instance.body,
                    ticket=instance.ticket
                )
                notified_users.add(user.id)

                if user.email:
                    subject = f"Dash MFB Support - Mentioned on {instance.ticket.ticket_id}"
                    message = (
                        f"Hello,\n\n"
                        f"{instance.author.first_name or 'Someone'} mentioned you in a comment on ticket #{instance.ticket.ticket_id}.\n\n"
                        f"Comment:\n"
                        f"\"{instance.body}\"\n\n"
                        f"Log in to your workspace to view the conversation."
                    )
                    send_email_async(subject, message, [user.email])

        if instance.comment_type == 'public':
            ticket = instance.ticket
            recipient = None

            if instance.author == ticket.submitted_by:
                recipient = ticket.assignee
            elif instance.author == ticket.assignee:
                recipient = ticket.submitted_by

            if recipient and recipient != instance.author and recipient.id not in notified_users:
                Notification.objects.create(
                    recipient=recipient,
                    actor=instance.author,
                    kind='comment',
                    title=f"New reply on {ticket.ticket_id}",
                    body=instance.body,
                    ticket=ticket
                )

                if recipient.email:
                    subject = f"New Reply on Ticket {ticket.ticket_id}"
                    message = (
                        f"Hello,\n\n"
                        f"A new update has been posted on your ticket #{ticket.ticket_id} by {instance.author.first_name or 'System'}.\n\n"
                        f"Comment Detail:\n"
                        f"\"{instance.body}\"\n\n"
                        f"Log in to your dashboard to reply."
                    )
                    send_email_async(subject, message, [recipient.email])


class SystemAuditLog(models.Model):
    SEVERITY_CHOICES = [
        ('Info', 'Info'),
        ('Notice', 'Notice'),
        ('Warning', 'Warning'),
        ('Critical', 'Critical'),
    ]

    CATEGORY_CHOICES = [
        ('Approval', 'Approval'),
        ('SLA', 'SLA'),
        ('Role', 'Role'),
        ('Auth', 'Auth'),
        ('Ticket', 'Ticket'),
        ('Config', 'Config'),
        ('Access', 'Access'),
    ]

    created_at = models.DateTimeField(auto_now_add=True)
    actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_logs')
    actor_name_cache = models.CharField(max_length=128, null=True, blank=True)
    email_cache = models.CharField(max_length=128, null=True, blank=True)
    
    action = models.CharField(max_length=256)
    category = models.CharField(max_length=32, choices=CATEGORY_CHOICES)
    ticket = models.ForeignKey(Ticket, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_logs')
    
    ip_address = models.CharField(max_length=45, default='—')
    device_meta = models.CharField(max_length=128, default='Internal')
    severity = models.CharField(max_length=16, choices=SEVERITY_CHOICES, default='Info')

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.created_at} - {self.action}"