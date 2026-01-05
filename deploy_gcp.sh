#!/bin/bash

# Logis ML Engine - Quick Deploy Script for GCP

set -e

echo "=========================================="
echo "Logis ML Engine - GCP Deployment Script"
echo "=========================================="

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "Error: gcloud CLI not found. Please install it first."
    exit 1
fi

# Prompt for project ID
read -p "Enter your GCP Project ID: " PROJECT_ID
gcloud config set project $PROJECT_ID

# Prompt for deployment method
echo ""
echo "Choose deployment method:"
echo "1) App Engine (Simple, auto-managed)"
echo "2) Cloud Run (Cost-effective, containerized)"
read -p "Enter choice (1 or 2): " DEPLOY_METHOD

if [ "$DEPLOY_METHOD" == "1" ]; then
    echo ""
    echo "=== Deploying to App Engine ==="
    
    # Deploy backend
    cd backend
    echo "Deploying backend..."
    gcloud app deploy app.yaml --quiet
    
    BACKEND_URL=$(gcloud app describe --format="value(defaultHostname)")
    echo "Backend deployed to: https://$BACKEND_URL"
    
elif [ "$DEPLOY_METHOD" == "2" ]; then
    echo ""
    echo "=== Deploying to Cloud Run ==="
    
    # Build and deploy backend
    cd backend
    echo "Building container image..."
    gcloud builds submit --tag gcr.io/$PROJECT_ID/backend
    
    read -p "Enter Cloud SQL Connection Name (format: project:region:instance): " SQL_CONNECTION
    read -p "Enter DB Password: " -s DB_PASSWORD
    echo ""
    
    echo "Deploying to Cloud Run..."
    gcloud run deploy backend \
        --image gcr.io/$PROJECT_ID/backend \
        --platform managed \
        --region us-central1 \
        --allow-unauthenticated \
        --add-cloudsql-instances $SQL_CONNECTION \
        --set-env-vars CLOUD_SQL_CONNECTION_NAME=$SQL_CONNECTION \
        --set-env-vars DB_USER=postgres \
        --set-env-vars DB_PASSWORD=$DB_PASSWORD \
        --set-env-vars DB_NAME=logis_ml_db \
        --set-env-vars DEBUG=False
    
    BACKEND_URL=$(gcloud run services describe backend --region us-central1 --format 'value(status.url)')
    echo "Backend deployed to: $BACKEND_URL"
fi

# Deploy frontend
echo ""
echo "=== Deploying Frontend to Firebase ==="
cd ../frontend

# Update API URL in .env.production
echo "REACT_APP_API_URL=$BACKEND_URL/api" > .env.production

# Build
echo "Building frontend..."
npm run build

# Deploy to Firebase
if command -v firebase &> /dev/null; then
    echo "Deploying to Firebase..."
    firebase deploy --only hosting
else
    echo "Firebase CLI not found. Install with: npm install -g firebase-tools"
    echo "Then run: firebase deploy --only hosting"
fi

echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo "Backend URL: $BACKEND_URL"
echo ""
echo "Next steps:"
echo "1. Run migrations: gcloud sql connect logis-ml-db --user=postgres"
echo "   Then: python manage.py migrate"
echo "2. Create superuser: python manage.py createsuperuser"
echo "3. Update CORS settings in backend/config/settings_production.py"
echo "4. Test your application"
echo "=========================================="
