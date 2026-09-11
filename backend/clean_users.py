"""
Force-removes remaining sneaky/test users including their activity logs.
Run: python clean_users.py
"""
import os, django
os.environ['DJANGO_SETTINGS_MODULE'] = 'grievance_platform.settings'
django.setup()

from apps.accounts.models import User, EmailVerification, CitizenProfile, OfficerProfile, ActivityLog
from apps.complaints.models import (
    Complaint, ComplaintTimeline, ComplaintSupport,
    ComplaintImage, ComplaintVideo, Feedback, AuditLog
)
from apps.notifications.models import Notification
from apps.chat.models import ChatRoom, ChatMessage

KEEP = {
    'admin@grievance.gov.in',
    'head.pwd@grievance.gov.in',
    'officer.pwd@grievance.gov.in',
    'officer.wsd@grievance.gov.in',
    'officer.elec@grievance.gov.in',
    'officer.mc@grievance.gov.in',
    'officer1@grievance.gov.in',
    'mihirraval0872@gmail.com',
    'miheerraval0872@gmail.com',
    'divyesh@gmail.com',
    'rahul1@gmail.com',
}

def force_delete_user(user):
    """Delete user and ALL their associated data."""
    # Activity logs
    ActivityLog.objects(user=user).delete()
    # Email verifications
    EmailVerification.objects(user=user).delete()
    # Notifications
    Notification.objects(recipient=user).delete()
    Notification.objects(sender=user).delete()
    # Complaints and related
    complaints = list(Complaint.objects(citizen=user))
    for c in complaints:
        ComplaintTimeline.objects(complaint=c).delete()
        ComplaintSupport.objects(complaint=c).delete()
        ComplaintImage.objects(complaint=c).delete()
        ComplaintVideo.objects(complaint=c).delete()
        Feedback.objects(complaint=c).delete()
        AuditLog.objects(complaint=c).delete()
        # Chat rooms for this complaint
        rooms = list(ChatRoom.objects(complaint=c))
        for room in rooms:
            ChatMessage.objects(room=room).delete()
            room.delete()
        c.delete()
    # Profile
    CitizenProfile.objects(user=user).delete()
    OfficerProfile.objects(user=user).delete()
    # Finally delete the user
    user.delete()

removed = []
for user in list(User.objects.all()):
    if user.email in KEEP:
        continue
    print(f"  Removing: {user.email} ...")
    try:
        force_delete_user(user)
        removed.append(user.email)
        print(f"    DONE")
    except Exception as e:
        print(f"    FAILED: {e}")

print(f"\nRemoved {len(removed)} users.")
print("\nFinal user list:")
for u in User.objects.all().order_by('role'):
    print(f"  [{u.role:20s}] {u.email:45s} verified={u.is_verified}")
