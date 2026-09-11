import os, django
os.environ['DJANGO_SETTINGS_MODULE'] = 'grievance_platform.settings'
django.setup()

from apps.complaints.models import Complaint
from apps.accounts.models import User

print("\n=== All Citizens ===")
citizens = list(User.objects(role='citizen'))
for c in citizens:
    count = Complaint.objects(citizen=c).count()
    print(f"  {c.email:45s} — {count} complaints")

print("\n=== Total complaints:", Complaint.objects.count(), "===")
print("\n=== Sample complaints ===")
for c in Complaint.objects.order_by('-submitted_at').limit(5):
    try: cname = c.citizen.email
    except: cname = 'unknown'
    print(f"  {c.complaint_id} | {cname:45s} | {c.status}")
