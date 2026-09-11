from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync


@shared_task
def send_complaint_notification(complaint_id, event_type):
    from apps.complaints.models import Complaint
    from .models import Notification

    try:
        complaint = Complaint.objects(id=complaint_id).first()
        if not complaint:
            return
    except Exception:
        return

    status_messages = {
        'submitted':   ('Complaint Submitted',  f'Your complaint "{complaint.title}" has been submitted. ID: {complaint.complaint_id}'),
        'verified':    ('Complaint Verified',   f'Your complaint {complaint.complaint_id} has been verified.'),
        'assigned':    ('Complaint Assigned',   f'Your complaint {complaint.complaint_id} has been assigned to an officer.'),
        'accepted':    ('Complaint Accepted',   f'Officer has accepted your complaint {complaint.complaint_id}.'),
        'work_started':('Work Started',         f'Work has started on your complaint {complaint.complaint_id}.'),
        'in_progress': ('In Progress',          f'Your complaint {complaint.complaint_id} is in progress.'),
        'resolved':    ('Complaint Resolved',   f'Your complaint {complaint.complaint_id} has been resolved. Please provide feedback.'),
        'closed':      ('Complaint Closed',     f'Your complaint {complaint.complaint_id} has been closed.'),
        'rejected':    ('Complaint Rejected',   f'Your complaint {complaint.complaint_id} has been rejected.'),
        'reopened':    ('Complaint Reopened',   f'Your complaint {complaint.complaint_id} has been reopened.'),
    }
    title, message = status_messages.get(
        event_type, ('Update', f'Your complaint {complaint.complaint_id} has been updated.')
    )

    valid_types = [c[0] for c in Notification.TYPE_CHOICES]
    notif_type = f'complaint_{event_type}' if f'complaint_{event_type}' in valid_types else 'status_changed'

    # Create notification for citizen — MongoEngine: use .save() not .create()
    notif = Notification(
        recipient=complaint.citizen,
        notification_type=notif_type,
        title=title,
        message=message,
        complaint=complaint,
    )
    notif.save()

    channel_layer = get_channel_layer()

    # Push real-time notification to citizen
    async_to_sync(channel_layer.group_send)(
        f'notifications_{complaint.citizen.id}',
        {
            'type': 'send_notification',
            'notification': {
                'id': str(notif.id),
                'title': title,
                'message': message,
                'complaint_id': complaint.complaint_id,
                'notification_type': notif.notification_type,
                'created_at': str(notif.created_at),
            }
        }
    )

    # Push complaint status update to any open complaint detail pages
    async_to_sync(channel_layer.group_send)(
        f'complaint_{complaint.id}',
        {
            'type': 'complaint_update',
            'status': complaint.status,
            'complaint_id': complaint.complaint_id,
        }
    )

    # Email notification
    if complaint.citizen.email_notifications and complaint.citizen.email:
        send_email_notification.delay(
            complaint.citizen.email,
            complaint.citizen.full_name,
            title,
            message,
        )

    # Notify assigned officer when a new complaint is assigned
    if event_type == 'assigned' and complaint.assigned_officer:
        officer_notif = Notification(
            recipient=complaint.assigned_officer,
            notification_type='complaint_assigned',
            title='New Complaint Assigned',
            message=f'Complaint {complaint.complaint_id} has been assigned to you.',
            complaint=complaint,
        )
        officer_notif.save()

        async_to_sync(channel_layer.group_send)(
            f'notifications_{complaint.assigned_officer.id}',
            {
                'type': 'send_notification',
                'notification': {
                    'id': str(officer_notif.id),
                    'title': officer_notif.title,
                    'message': officer_notif.message,
                    'complaint_id': complaint.complaint_id,
                    'notification_type': officer_notif.notification_type,
                    'created_at': str(officer_notif.created_at),
                }
            }
        )


@shared_task
def send_email_notification(email, name, subject, message):
    try:
        send_mail(
            subject=f'[Grievance Portal] {subject}',
            message=f'Dear {name},\n\n{message}\n\nRegards,\nSmart Grievance Portal',
            from_email=settings.EMAIL_HOST_USER,
            recipient_list=[email],
            fail_silently=True,
        )
    except Exception as e:
        print(f'Email error: {e}')
