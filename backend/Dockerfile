# Use official Python slim image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Set working directory
WORKDIR /app

# Install system dependencies needed by some Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --upgrade pip && pip install --no-cache-dir -r requirements.txt

# Copy project source
COPY . .

# Collect static files
RUN python manage.py collectstatic --noinput || true

# Expose the port Daphne/Gunicorn will listen on
EXPOSE 8000

# Start with Daphne (ASGI server — supports HTTP + WebSockets)
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "grievance_platform.asgi:application"]
