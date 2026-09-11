from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Complaint


@receiver(post_save, sender=Complaint)
def update_citizen_stats(sender, instance, **kwargs):
    try:
        profile = instance.citizen.citizen_profile
        profile.total_complaints = Complaint.objects.filter(citizen=instance.citizen).count()
        profile.resolved_complaints = Complaint.objects.filter(
            citizen=instance.citizen, status__in=['resolved', 'closed']
        ).count()
        profile.save(update_fields=['total_complaints', 'resolved_complaints'])
    except Exception:
        pass


@receiver(post_save, sender=Complaint)
def update_officer_stats(sender, instance, **kwargs):
    if instance.assigned_officer:
        try:
            profile = instance.assigned_officer.officer_profile
            profile.total_assigned = Complaint.objects.filter(assigned_officer=instance.assigned_officer).count()
            profile.total_resolved = Complaint.objects.filter(
                assigned_officer=instance.assigned_officer, status__in=['resolved', 'closed']
            ).count()
            profile.save(update_fields=['total_assigned', 'total_resolved'])
        except Exception:
            pass
