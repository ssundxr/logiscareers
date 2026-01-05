# Logis ML Engine - GCP Deployment (Windows PowerShell)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Logis ML Engine - GCP Deployment Script" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Check if gcloud is installed
if (!(Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Host "Error: gcloud CLI not found. Please install it first." -ForegroundColor Red
    Write-Host "Download from: https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
    exit 1
}

# Prompt for project ID
$PROJECT_ID = Read-Host "Enter your GCP Project ID"
gcloud config set project $PROJECT_ID

# Prompt for deployment method
Write-Host ""
Write-Host "Choose deployment method:" -ForegroundColor Yellow
Write-Host "1) App Engine (Simple, auto-managed)"
Write-Host "2) Cloud Run (Cost-effective, containerized)"
$DEPLOY_METHOD = Read-Host "Enter choice (1 or 2)"

if ($DEPLOY_METHOD -eq "1") {
    Write-Host ""
    Write-Host "=== Deploying to App Engine ===" -ForegroundColor Green
    
    # Deploy backend
    Set-Location backend
    Write-Host "Deploying backend..." -ForegroundColor Yellow
    gcloud app deploy app.yaml --quiet
    
    $BACKEND_URL = gcloud app describe --format="value(defaultHostname)"
    Write-Host "Backend deployed to: https://$BACKEND_URL" -ForegroundColor Green
    
} elseif ($DEPLOY_METHOD -eq "2") {
    Write-Host ""
    Write-Host "=== Deploying to Cloud Run ===" -ForegroundColor Green
    
    # Build and deploy backend
    Set-Location backend
    Write-Host "Building container image..." -ForegroundColor Yellow
    gcloud builds submit --tag gcr.io/$PROJECT_ID/backend
    
    $SQL_CONNECTION = Read-Host "Enter Cloud SQL Connection Name (format: project:region:instance)"
    $DB_PASSWORD = Read-Host "Enter DB Password" -AsSecureString
    $DB_PASSWORD_PLAIN = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($DB_PASSWORD))
    
    Write-Host "Deploying to Cloud Run..." -ForegroundColor Yellow
    gcloud run deploy backend `
        --image gcr.io/$PROJECT_ID/backend `
        --platform managed `
        --region us-central1 `
        --allow-unauthenticated `
        --add-cloudsql-instances $SQL_CONNECTION `
        --set-env-vars CLOUD_SQL_CONNECTION_NAME=$SQL_CONNECTION `
        --set-env-vars DB_USER=postgres `
        --set-env-vars DB_PASSWORD=$DB_PASSWORD_PLAIN `
        --set-env-vars DB_NAME=logis_ml_db `
        --set-env-vars DEBUG=False
    
    $BACKEND_URL = gcloud run services describe backend --region us-central1 --format 'value(status.url)'
    Write-Host "Backend deployed to: $BACKEND_URL" -ForegroundColor Green
}

# Deploy frontend
Write-Host ""
Write-Host "=== Deploying Frontend to Firebase ===" -ForegroundColor Green
Set-Location ..\frontend

# Update API URL in .env.production
"REACT_APP_API_URL=$BACKEND_URL/api" | Out-File -FilePath .env.production -Encoding utf8

# Build
Write-Host "Building frontend..." -ForegroundColor Yellow
npm run build

# Deploy to Firebase
if (Get-Command firebase -ErrorAction SilentlyContinue) {
    Write-Host "Deploying to Firebase..." -ForegroundColor Yellow
    firebase deploy --only hosting
} else {
    Write-Host "Firebase CLI not found. Install with: npm install -g firebase-tools" -ForegroundColor Red
    Write-Host "Then run: firebase deploy --only hosting" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Backend URL: $BACKEND_URL" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Run migrations on Cloud SQL"
Write-Host "2. Create superuser"
Write-Host "3. Update CORS settings in backend/config/settings_production.py"
Write-Host "4. Test your application"
Write-Host "==========================================" -ForegroundColor Cyan
