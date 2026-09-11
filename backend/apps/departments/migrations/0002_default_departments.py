from django.db import migrations


def create_default_departments(apps, schema_editor):
    Department = apps.get_model('departments', 'Department')
    default_departments = [
        {'name': 'Public Works', 'code': 'PWD', 'description': 'Roads, bridges and public infrastructure.'},
        {'name': 'Water Supply', 'code': 'WATER', 'description': 'Clean water distribution and services.'},
        {'name': 'Electricity', 'code': 'ELEC', 'description': 'Electricity supply and street lighting.'},
        {'name': 'Sanitation', 'code': 'SAN', 'description': 'Garbage collection and drainage services.'},
        {'name': 'Health', 'code': 'HEALTH', 'description': 'Public health and medical support.'},
        {'name': 'Education', 'code': 'EDU', 'description': 'Schools and education services.'},
    ]

    for dept_data in default_departments:
        Department.objects.get_or_create(code=dept_data['code'], defaults=dept_data)


def reverse_default_departments(apps, schema_editor):
    Department = apps.get_model('departments', 'Department')
    codes = ['PWD', 'WATER', 'ELEC', 'SAN', 'HEALTH', 'EDU']
    Department.objects.filter(code__in=codes).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('departments', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(create_default_departments, reverse_default_departments),
    ]
