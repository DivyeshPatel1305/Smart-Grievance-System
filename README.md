# Smart Public Grievance & Service Delivery Platform

A production-ready full-stack web application for civic complaint management.

## Tech Stack
- **Frontend**: React.js (Vite), Tailwind CSS, Framer Motion, React Leaflet, Chart.js
- **Backend**: Django, Django REST Framework, Django Channels, Celery
- **Database**: MySQL
- **Cache/Queue**: Redis
- **Auth**: JWT

---

## Prerequisites
- Python 3.10+
- Node.js 18+
- MySQL 8.0+
- Redis 7+

---

## Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Configure environment
# Edit .env with your MySQL credentials and secret key

# Gmail OTP email configuration
# Use a Gmail App Password, not your normal Gmail password:
# EMAIL_HOST=smtp.gmail.com
# EMAIL_PORT=587
# EMAIL_USE_TLS=True
# EMAIL_HOST_USER=your-gmail-address@gmail.com
# EMAIL_HOST_PASSWORD=your-16-character-gmail-app-password

# Create MySQL database
mysql -u root -p
CREATE DATABASE grievance_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;

# Run migrations
python manage.py makemigrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Load initial data (optional)
python manage.py shell
# >>> from apps.departments.models import Department, ComplaintCategory
# >>> Department.objects.create(name="Public Works", code="PWD")
# >>> ComplaintCategory.objects.create(name="Road Damage", slug="road_damage", sla_hours=72, color="#ef4444")

# Start Django server
python manage.py runserver

# Start Celery worker (new terminal)
celery -A grievance_platform worker -l info

# Start Celery beat (new terminal)
celery -A grievance_platform beat -l info
```

---

## Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend runs at: http://localhost:5173

### Gmail OTP verification

Citizen registration sends a six-digit OTP to the entered email address. The OTP is
not returned by the API or displayed in the browser. To enable delivery, put the
following values in `backend/.env`:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-gmail-address@gmail.com
EMAIL_HOST_PASSWORD=your-gmail-app-password
```

For Gmail, enable 2-Step Verification and create an App Password under Google
Account security. Use that 16-character App Password in `EMAIL_HOST_PASSWORD`.

---

## WebSocket (Django Channels)

Django Channels uses ASGI. Run with Daphne for WebSocket support:

```bash
pip install daphne
daphne -b 0.0.0.0 -p 8000 grievance_platform.asgi:application
```

---

## Default Roles

| Role | Access |
|------|--------|
| Citizen | `/citizen/*` |
| Officer | `/officer/*` |
| Department Head | `/officer/*` |
| Super Admin | `/admin/*` |

---

## API Documentation

- Swagger UI: http://localhost:8000/swagger/
- ReDoc: http://localhost:8000/redoc/
- Django Admin: http://localhost:8000/admin/

---

## Key Features

- ✅ JWT Authentication with role-based access
- ✅ Real-time WebSocket notifications
- ✅ Real-time citizen-officer chat
- ✅ Interactive OpenStreetMap with complaint markers
- ✅ Complaint lifecycle management (11 statuses)
- ✅ Auto priority escalation via community support
- ✅ Export reports (CSV, Excel, PDF)
- ✅ Celery async email notifications
- ✅ Dark/Light mode
- ✅ Fully responsive mobile-friendly UI
- ✅ Swagger API documentation
