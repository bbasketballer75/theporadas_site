# Cloud Run Deployment Script for Wedding Website Functions
# This script builds and deploys the functions as a Cloud Run service

param(
    [string]$ProjectId = "wedding-site-final",
    [string]$ServiceName = "wedding-functions",
    [string]$Region = "us-central1",
    [switch]$Force
)

Write-Host "🚀 Deploying Wedding Website Functions to Cloud Run" -ForegroundColor Green
Write-Host "Project: $ProjectId" -ForegroundColor Cyan
Write-Host "Service: $ServiceName" -ForegroundColor Cyan
Write-Host "Region: $Region" -ForegroundColor Cyan
Write-Host ""

# Authenticate with gcloud (if not already authenticated)
Write-Host "🔐 Checking gcloud authentication..." -ForegroundColor Yellow
$AuthStatus = gcloud auth list --filter=status:ACTIVE --format="value(account)"
if (-not $AuthStatus) {
    Write-Host "Not authenticated with gcloud. Please run 'gcloud auth login' first." -ForegroundColor Red
    exit 1
}
Write-Host "Authenticated as: $AuthStatus" -ForegroundColor Green

# Enable required APIs
Write-Host "📋 Enabling required APIs..." -ForegroundColor Yellow
gcloud services enable run.googleapis.com --project=$ProjectId
gcloud services enable containerregistry.googleapis.com --project=$ProjectId
gcloud services enable cloudbuild.googleapis.com --project=$ProjectId

# Build and push the Docker image
Write-Host "🏗️ Building Docker image..." -ForegroundColor Yellow
$ImageName = "gcr.io/$ProjectId/$ServiceName"

try {
    docker build -f ./Dockerfile.cloudrun -t $ImageName .
    Write-Host "✅ Docker image built successfully" -ForegroundColor Green
}
catch {
    Write-Host "❌ Failed to build Docker image: $_" -ForegroundColor Red
    exit 1
}

Write-Host "📤 Pushing image to Container Registry..." -ForegroundColor Yellow
try {
    docker push $ImageName
    Write-Host "✅ Image pushed successfully" -ForegroundColor Green
}
catch {
    Write-Host "❌ Failed to push Docker image: $_" -ForegroundColor Red
    exit 1
}

# Deploy to Cloud Run
Write-Host "🚀 Deploying to Cloud Run..." -ForegroundColor Yellow
$DeployCommand = "gcloud run deploy $ServiceName --image=$ImageName --platform=managed --region=$Region --allow-unauthenticated --project=$ProjectId --port=8080 --memory=1Gi --cpu=1 --max-instances=10 --timeout=540"

if ($Force) {
    Write-Host "🗑️ Removing existing service (force mode)..." -ForegroundColor Yellow
    try {
        gcloud run services delete $ServiceName --platform=managed --region=$Region --project=$ProjectId --quiet
        Write-Host "✅ Existing service removed" -ForegroundColor Green
    }
    catch {
        Write-Host "⚠️ Could not remove existing service (may not exist): $_" -ForegroundColor Yellow
    }
}

try {
    Invoke-Expression $DeployCommand
    Write-Host "✅ Cloud Run deployment successful" -ForegroundColor Green
}
catch {
    Write-Host "❌ Cloud Run deployment failed: $_" -ForegroundColor Red
    exit 1
}

# Get the service URL
Write-Host "🔗 Getting service URL..." -ForegroundColor Yellow
try {
    $ServiceUrl = gcloud run services describe $ServiceName --platform=managed --region=$Region --project=$ProjectId --format="value(status.url)"
    Write-Host "✅ Service URL: $ServiceUrl" -ForegroundColor Green
}
catch {
    Write-Host "❌ Could not get service URL: $_" -ForegroundColor Red
    exit 1
}

# Test the health endpoint
Write-Host "🩺 Testing health endpoint..." -ForegroundColor Yellow
try {
    $HealthResponse = Invoke-WebRequest -Uri "$ServiceUrl/health" -Method GET -TimeoutSec 30
    if ($HealthResponse.StatusCode -eq 200) {
        Write-Host "✅ Health check passed!" -ForegroundColor Green
        $HealthContent = $HealthResponse.Content | ConvertFrom-Json
        Write-Host "   Status: $($HealthContent.status)" -ForegroundColor White
        Write-Host "   Service: $($HealthContent.service)" -ForegroundColor White
    }
    else {
        Write-Host "⚠️ Health check returned status: $($HealthResponse.StatusCode)" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "❌ Health check failed: $_" -ForegroundColor Red
}
Write-Host ""
Write-Host "Available endpoints:" -ForegroundColor Yellow
Write-Host "  GET  $ServiceUrl/health" -ForegroundColor White
Write-Host "  GET  $ServiceUrl/family-tree" -ForegroundColor White
Write-Host "  POST $ServiceUrl/family-member" -ForegroundColor White
Write-Host "  POST $ServiceUrl/guest-message" -ForegroundColor White
Write-Host "  GET  $ServiceUrl/guest-messages" -ForegroundColor White
Write-Host "  POST $ServiceUrl/process-image" -ForegroundColor White
