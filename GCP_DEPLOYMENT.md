# GCP Deployment Guide for Logis ML Engine

## Prerequisites

1. **Google Cloud Account**
   - Create a GCP account at https://cloud.google.com
   - Enable billing for your project
   - Install Google Cloud SDK: https://cloud.google.com/sdk/docs/install

2. **Required APIs**
   ```bash
   gcloud services enable cloudbuild.googleapis.com
   gcloud services enable run.googleapis.com
   gcloud services enable sqladmin.googleapis.com
   gcloud services enable compute.googleapis.com
   ```

## Step 1: Initialize GCP Project

```bash
# Login to GCP
gcloud auth login

# Create a new project (or use existing)
gcloud projects create logis-ml-engine --name="Logis ML Engine"

# Set the project
gcloud config set project logis-ml-engine

# Get your project ID
gcloud config get-value project
```

## Step 2: Setup Cloud SQL Database

```bash
# Create Cloud SQL PostgreSQL instance
gcloud sql instances create logis-ml-db \
    --database-version=POSTGRES_14 \
    --tier=db-f1-micro \
    --region=us-central1

# Set password for postgres user
gcloud sql users set-password postgres \
    --instance=logis-ml-db \
    --password=YOUR_SECURE_PASSWORD

# Create database
gcloud sql databases create logis_ml_db --instance=logis-ml-db

# Get connection name (save this for later)
gcloud sql instances describe logis-ml-db --format="value(connectionName)"
```

## Step 3: Configure Environment Variables

Create a file `backend/.env.production`:

```env
SECRET_KEY=your-random-secret-key-generate-this
DEBUG=False
ALLOWED_HOSTS=your-app-id.appspot.com,your-custom-domain.com
CLOUD_SQL_CONNECTION_NAME=your-project:region:instance-name
DB_USER=postgres
DB_PASSWORD=YOUR_SECURE_PASSWORD
DB_NAME=logis_ml_db
FRONTEND_URL=https://your-app.web.app
```

Update `backend/app.yaml` with your actual values.

## Step 4: Prepare Backend for Deployment

```bash
# Navigate to backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Add production dependencies
pip install gunicorn psycopg2-binary google-cloud-storage django-storages

# Update requirements.txt
pip freeze > requirements.txt

# Collect static files
python manage.py collectstatic --noinput

# Run migrations (locally first to test)
python manage.py migrate
```

## Step 5: Deploy Backend to App Engine

```bash
# Initialize App Engine
gcloud app create --region=us-central1

# Deploy the application
gcloud app deploy app.yaml

# View the deployed app
gcloud app browse

# View logs
gcloud app logs tail -s default
```

## Step 6: Run Database Migrations on Cloud SQL

```bash
# Connect to Cloud SQL via proxy (in a separate terminal)
cloud_sql_proxy -instances=YOUR_CONNECTION_NAME=tcp:5432

# In another terminal, run migrations
python manage.py migrate --settings=config.settings_production

# Create superuser
python manage.py createsuperuser --settings=config.settings_production
```

## Step 7: Deploy Frontend to Firebase Hosting

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Navigate to frontend directory
cd ../frontend

# Login to Firebase
firebase login

# Initialize Firebase project
firebase init hosting

# Select your GCP project (or create new one)
# Choose 'build' as public directory
# Configure as single-page app: Yes
# Set up automatic builds: No

# Update API endpoint in frontend
# Edit src/services/api.js and set baseURL to your App Engine URL

# Build production version
npm run build

# Deploy to Firebase
firebase deploy --only hosting

# Get your Firebase URL
firebase hosting:sites:list
```

## Step 8: Update Frontend API Configuration

Edit `frontend/src/services/api.js`:

```javascript
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://your-app-id.appspot.com/api';
```

Create `frontend/.env.production`:

```env
REACT_APP_API_URL=https://your-app-id.appspot.com/api
```

Rebuild and redeploy:

```bash
npm run build
firebase deploy --only hosting
```

## Step 9: Configure CORS and Security

Update `backend/config/settings_production.py` with your Firebase URL:

```python
CORS_ALLOWED_ORIGINS = [
    'https://your-app.web.app',
    'https://your-app.firebaseapp.com',
]

CSRF_TRUSTED_ORIGINS = [
    'https://your-app.web.app',
    'https://your-app.firebaseapp.com',
]
```

Redeploy backend:

```bash
cd backend
gcloud app deploy
```

## Step 10: Setup Cloud Storage for Media Files (Optional)

```bash
# Create a Cloud Storage bucket
gsutil mb -l us-central1 gs://logis-ml-media

# Make bucket publicly readable (for user photos, CVs)
gsutil iam ch allUsers:objectViewer gs://logis-ml-media

# Update app.yaml
# Add to env_variables:
USE_GCS_STORAGE=True
GS_BUCKET_NAME=logis-ml-media
GS_PROJECT_ID=logis-ml-engine
```

Install storage backend:

```bash
pip install django-storages[google]
pip freeze > requirements.txt
gcloud app deploy
```

## Alternative: Deploy Backend to Cloud Run (More Cost Effective)

```bash
# Build container
cd backend

# Create Dockerfile if not exists
cat > Dockerfile << 'EOF'
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN python manage.py collectstatic --noinput

CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 config.wsgi:application
EOF

# Build and push to Container Registry
gcloud builds submit --tag gcr.io/logis-ml-engine/backend

# Deploy to Cloud Run
gcloud run deploy backend \
    --image gcr.io/logis-ml-engine/backend \
    --platform managed \
    --region us-central1 \
    --allow-unauthenticated \
    --add-cloudsql-instances YOUR_CONNECTION_NAME \
    --set-env-vars CLOUD_SQL_CONNECTION_NAME=YOUR_CONNECTION_NAME \
    --set-env-vars DB_USER=postgres \
    --set-env-vars DB_PASSWORD=YOUR_PASSWORD \
    --set-env-vars DB_NAME=logis_ml_db

# Get the Cloud Run URL
gcloud run services describe backend --region us-central1 --format 'value(status.url)'
```

## Monitoring and Maintenance

```bash
# View App Engine logs
gcloud app logs tail -s default

# View Cloud Run logs
gcloud run services logs read backend --region us-central1

# Check App Engine status
gcloud app describe

# SSH into App Engine instance (for debugging)
gcloud app instances ssh [INSTANCE_ID] --service=default

# View Cloud SQL logs
gcloud sql operations list --instance=logis-ml-db
```

## Cost Optimization

1. **Use Cloud Run instead of App Engine** - Pay only for actual usage
2. **Use Cloud SQL f1-micro instance** - ~$7/month
3. **Use Firebase Hosting Free Tier** - 10GB storage, 360MB/day bandwidth
4. **Set up auto-scaling limits** - Prevent unexpected costs

## Custom Domain Setup

```bash
# For App Engine
gcloud app domain-mappings create 'your-domain.com' --certificate-management=automatic

# For Firebase
firebase hosting:channel:deploy production
# Follow instructions in Firebase Console to add custom domain
```

## Troubleshooting

**Database Connection Issues:**
```bash
# Check Cloud SQL is running
gcloud sql instances list

# Test connection
gcloud sql connect logis-ml-db --user=postgres
```

**Static Files Not Loading:**
```bash
# Collect static files again
python manage.py collectstatic --clear --noinput
gcloud app deploy
```

**CORS Errors:**
- Verify CORS_ALLOWED_ORIGINS in settings_production.py
- Check CSRF_TRUSTED_ORIGINS includes frontend URL
- Redeploy backend after changes

## Continuous Deployment with GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GCP

on:
  push:
    branches: [ main ]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Cloud SDK
        uses: google-github-actions/setup-gcloud@v0
        with:
          project_id: ${{ secrets.GCP_PROJECT_ID }}
          service_account_key: ${{ secrets.GCP_SA_KEY }}
      
      - name: Deploy to App Engine
        run: |
          cd backend
          gcloud app deploy --quiet
  
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Build and Deploy to Firebase
        run: |
          cd frontend
          npm ci
          npm run build
          npm install -g firebase-tools
          firebase deploy --token ${{ secrets.FIREBASE_TOKEN }}
```

## Next Steps

1. Set up monitoring with Google Cloud Monitoring
2. Configure Cloud CDN for static assets
3. Set up Cloud Armor for DDoS protection
4. Enable Cloud Logging for audit trails
5. Set up automated backups for Cloud SQL

## Estimated Monthly Costs

- Cloud SQL (f1-micro): $7-10
- App Engine (F4 instance): $50-100 (with auto-scaling)
- Cloud Run (alternative): $5-20 (more cost-effective)
- Firebase Hosting: Free (within limits)
- Cloud Storage: $1-5
- **Total: $15-120/month** depending on traffic

---

**Important:** Replace all placeholder values (YOUR_PASSWORD, your-app-id, etc.) with actual values before deployment.
