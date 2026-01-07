#!/bin/bash

set -e

# Set default port if not provided
export PORT=${PORT:-8080}

echo "Starting Logis Career AI Backend..."
echo "Environment: ${DJANGO_ENVIRONMENT:-development}"

# Run database migrations
echo "Running database migrations..."
python manage.py migrate --noinput || {
    echo "Migration failed, but continuing..."
}

# Create superuser if it doesn't exist
echo "Setting up default admin user..."
python manage.py shell << 'END' || true
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@logiscareers.com', 'Admin@123456')
    print("Admin user created: admin / Admin@123456")
else:
    print("Admin user already exists")
END

echo "Database setup complete."

# Start gunicorn
echo "Starting gunicorn server on port $PORT..."
exec gunicorn --bind :$PORT --workers 2 --threads 4 --timeout 300 --access-logfile - --error-logfile - config.wsgi:application
