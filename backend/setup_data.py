"""
Seeds departments, categories, officers (3-5 per dept per city), and admin.
Usage: python setup_data.py
"""
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'grievance_platform.settings')
django.setup()

from apps.departments.models import Department, ComplaintCategory
from apps.accounts.models import User, OfficerProfile

CITIES = ['Ahmedabad', 'Surat', 'Baroda', 'Surendranagar']

# ─── Departments ──────────────────────────────────────────────────────────────
DEPARTMENTS = [
    {'name': 'Public Works Department',  'code': 'PWD',     'description': 'Roads, drainage, street lights',   'email': 'pwd@grievance.gov.in'},
    {'name': 'Water Supply Department',  'code': 'WSD',     'description': 'Water supply and pipelines',       'email': 'wsd@grievance.gov.in'},
    {'name': 'Electricity Department',   'code': 'ELEC',    'description': 'Electricity and power supply',     'email': 'elec@grievance.gov.in'},
    {'name': 'Health Department',        'code': 'HEALTH',  'description': 'Healthcare and ambulance services','email': 'health@grievance.gov.in'},
    {'name': 'Traffic Department',       'code': 'TRAFFIC', 'description': 'Traffic signals and transport',    'email': 'traffic@grievance.gov.in'},
    {'name': 'Municipal Corporation',    'code': 'MC',      'description': 'Garbage, sanitation, environment', 'email': 'mc@grievance.gov.in'},
    {'name': 'Education Department',     'code': 'EDU',     'description': 'Schools and colleges',             'email': 'edu@grievance.gov.in'},
]

dept_map = {}
print("\n--- Departments ---")
for d in DEPARTMENTS:
    obj = Department.objects(code=d['code']).first()
    if obj:
        print(f"  Exists : {d['name']}")
    else:
        obj = Department(**d); obj.save()
        print(f"  Created: {d['name']}")
    dept_map[d['code']] = obj

# ─── Categories ───────────────────────────────────────────────────────────────
CATEGORIES = [
    ('road_damage',      'Road Damage',        'PWD',     '72',  '🛣️',  '#ef4444'),
    ('drainage',         'Drainage',           'PWD',     '96',  '🌊',  '#06b6d4'),
    ('street_light',     'Street Light',       'PWD',     '24',  '💡',  '#f59e0b'),
    ('water_supply',     'Water Supply',       'WSD',     '72',  '💧',  '#3b82f6'),
    ('electricity',      'Electricity',        'ELEC',    '48',  '⚡',  '#f97316'),
    ('healthcare',       'Healthcare',         'HEALTH',  '48',  '🏥',  '#22c55e'),
    ('traffic',          'Traffic',            'TRAFFIC', '48',  '🚦',  '#8b5cf6'),
    ('illegal_parking',  'Illegal Parking',    'TRAFFIC', '24',  '🚗',  '#ec4899'),
    ('public_transport', 'Public Transport',   'TRAFFIC', '36',  '🚌',  '#14b8a6'),
    ('garbage',          'Garbage Collection', 'MC',      '48',  '🗑️',  '#84cc16'),
    ('environment',      'Environment',        'MC',      '72',  '🌿',  '#10b981'),
    ('education',        'Education',          'EDU',     '48',  '🎓',  '#a855f7'),
    ('government_office','Government Office',  'MC',      '48',  '🏛️',  '#6366f1'),
    ('others',           'Others',             'MC',      '60',  '📋',  '#6b7280'),
]

print("\n--- Categories ---")
for slug, name, dept_code, sla, icon, color in CATEGORIES:
    obj = ComplaintCategory.objects(slug=slug).first()
    dept = dept_map.get(dept_code)
    if obj:
        if not obj.department and dept:
            obj.department = dept; obj.save()
        print(f"  Exists : {name}")
    else:
        ComplaintCategory(name=name, slug=slug, department=dept,
                          sla_hours=sla, icon=icon, color=color).save()
        print(f"  Created: {name}")

# ─── Officers  (3-5 per department per city) ───────────────────────────────────
# fmt: (first_name, last_name, gender_prefix)
NAMES_BY_DEPT = {
    'PWD':     [('Ramesh','Patel','M'), ('Seema','Shah','F'), ('Arvind','Joshi','M'), ('Kiran','Mehta','F'), ('Deepak','Tiwari','M')],
    'WSD':     [('Suresh','Verma','M'), ('Nita','Desai','F'), ('Mahesh','Rao','M'),   ('Pooja','Gupta','F'), ('Harish','Nair','M')],
    'ELEC':    [('Vivek','Singh','M'),  ('Ritu','Sharma','F'),('Nikhil','Kumar','M'), ('Anita','Das','F'),   ('Sanjay','Pandey','M')],
    'HEALTH':  [('Dr. Priya','Menon','F'),('Dr. Raj','Iyer','M'),('Sunita','Bose','F'),('Arun','Pillai','M'),('Meena','Nair','F')],
    'TRAFFIC': [('Inspector Raj','Kumar','M'),('Constable Soni','Patel','F'),('SI Ravi','Verma','M'),('ASI Kamla','Devi','F'),('HC Amit','Shah','M')],
    'MC':      [('Ganesh','Waghmare','M'),('Savita','Kadam','F'),('Raju','Yadav','M'),('Lata','More','F'),('Ajay','Pawar','M')],
    'EDU':     [('Vijay','Kulkarni','M'),('Smita','Jain','F'), ('Rakesh','Agarwal','M'),('Alka','Mishra','F'),('Nitin','Patil','M')],
}

# City short codes for email/employee IDs
CITY_CODE = {
    'Ahmedabad':    'ahm',
    'Surat':        'srt',
    'Baroda':       'vdr',
    'Surendranagar':'sng',
}

EMP_COUNTER = [100]   # mutable for closure

def _next_emp():
    EMP_COUNTER[0] += 1
    return f"EMP{EMP_COUNTER[0]:04d}"

# Start emp counter after existing ones
existing_max = OfficerProfile.objects.count()
EMP_COUNTER[0] = max(100, existing_max + 100)

print("\n--- Officers (3-5 per dept per city) ---")
created_count = 0

for dept_code, names in NAMES_BY_DEPT.items():
    dept = dept_map.get(dept_code)
    # Take first 4 names (3-4 per city is fine for demo)
    city_names = names[:4]

    for city in CITIES:
        cc = CITY_CODE[city]
        for i, (fname, lname, _) in enumerate(city_names):
            full_name  = f"{fname} {lname}"
            email      = f"officer.{dept_code.lower()}.{cc}.{i+1}@grievance.gov.in".lower()
            emp_id     = _next_emp()

            if User.objects(email=email).first():
                continue  # already exists

            if OfficerProfile.objects(employee_id=emp_id).first():
                emp_id = _next_emp()

            try:
                user = User.create_user(
                    email=email,
                    password='Officer@1234',
                    full_name=full_name,
                    phone=f"98{dept_code[:2].lower()}{cc[:2]}{i:04d}"[:12],
                    role='officer',
                    is_verified=True,
                )
                OfficerProfile(
                    user=user,
                    department=dept,
                    employee_id=emp_id,
                    designation='Field Officer',
                    city=city,
                    assigned_area=city,
                ).save()
                created_count += 1
                print(f"  Created: {full_name:25s} | {dept_code:7s} | {city}")
            except Exception as e:
                print(f"  SKIP  : {email} — {e}")

# ─── Department Heads (one per dept) ──────────────────────────────────────────
HEADS = [
    ('Priya', 'Sharma', 'PWD',    'Head@1234', 'head.pwd'),
    ('Ravi',  'Nair',   'WSD',    'Head@1234', 'head.wsd'),
    ('Anita', 'Rao',    'ELEC',   'Head@1234', 'head.elec'),
    ('Suresh','Kumar',  'HEALTH', 'Head@1234', 'head.health'),
    ('Geeta', 'Menon',  'TRAFFIC','Head@1234', 'head.traffic'),
    ('Mohan', 'Desai',  'MC',     'Head@1234', 'head.mc'),
    ('Vijay', 'Patil',  'EDU',    'Head@1234', 'head.edu'),
]

print("\n--- Department Heads ---")
for fname, lname, dept_code, pwd, prefix in HEADS:
    email = f"{prefix}@grievance.gov.in"
    if User.objects(email=email).first():
        print(f"  Exists : {fname} {lname} ({email})")
        continue
    dept = dept_map.get(dept_code)
    try:
        user = User.create_user(
            email=email, password=pwd,
            full_name=f"{fname} {lname}",
            role='department_head', is_verified=True,
        )
        OfficerProfile(
            user=user, department=dept,
            employee_id=_next_emp(),
            designation='Department Head',
            city='Ahmedabad',
        ).save()
        print(f"  Created: {fname} {lname} ({email})")
    except Exception as e:
        print(f"  SKIP: {email} — {e}")

# ─── Super Admin ──────────────────────────────────────────────────────────────
print("\n--- Super Admin ---")
admin_email = 'admin@grievance.gov.in'
if User.objects(email=admin_email).first():
    print(f"  Exists: {admin_email}")
else:
    User.create_superuser(email=admin_email, password='Admin@1234',
                          full_name='Super Admin', is_verified=True)
    print(f"  Created: {admin_email}  password: Admin@1234")

# ─── Summary ──────────────────────────────────────────────────────────────────
total_officers = OfficerProfile.objects.count()
print(f"\n{'='*60}")
print("SETUP COMPLETE")
print(f"{'='*60}")
print(f"  Departments  : {Department.objects.count()}")
print(f"  Categories   : {ComplaintCategory.objects.count()}")
print(f"  Users        : {User.objects.count()}")
print(f"  Officers     : {total_officers}")
print(f"  Cities       : {', '.join(CITIES)}")
print(f"\n  Admin  : admin@grievance.gov.in / Admin@1234")
print(f"  Heads  : head.pwd@grievance.gov.in / Head@1234  (and others)")
print(f"  Officers: officer.<dept>.<city>.1@grievance.gov.in / Officer@1234")
print(f"{'='*60}")
