FROM python:3.9-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV DJANGO_ENVIRONMENT=production
ENV PORT=8080

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install gunicorn psycopg2-binary

# Copy ML Engine
COPY logis_ai_candidate_engine /app/logis_ai_candidate_engine

# Install ML Engine dependencies
RUN pip install --no-cache-dir -r /app/logis_ai_candidate_engine/requirements.txt

# Copy backend project
COPY backend /app

# Create necessary directories
RUN mkdir -p /app/logs /app/staticfiles /app/media/cvs /app/media/candidate_photos

# Copy startup script
COPY backend/startup.sh /app/startup.sh
RUN chmod +x /app/startup.sh

# Run migrations and collect static during build
RUN python manage.py collectstatic --noinput

# Pre-run migrations in the build to have database ready
RUN python manage.py migrate --run-syncdb --noinput

# Create default admin user during build
RUN echo "from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.filter(username='admin').delete() if User.objects.filter(username='admin').exists() else None; User.objects.create_superuser('admin', 'admin@logiscareers.com', 'Admin@123456') if not User.objects.filter(username='admin').exists() else print('exists')" | python manage.py shell || true

# Expose port
EXPOSE 8080

# Run startup script
CMD ["/app/startup.sh"]
