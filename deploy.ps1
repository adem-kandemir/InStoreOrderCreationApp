# In-Store Order Creation App - Deployment Script (PowerShell)
# This script builds the Angular app and deploys it to SAP BTP Cloud Foundry

$ErrorActionPreference = "Stop"  # Exit on any error

Write-Host "🚀 Starting deployment process..." -ForegroundColor Green

try {
    # Step 1: Build the Angular application
    Write-Host "📦 Building Angular application..." -ForegroundColor Yellow
    Set-Location "app/order-app"
    npm install --legacy-peer-deps --no-audit --no-fund
    npm run build:prod -- --output-hashing=none --extract-licenses=false --source-map=false
    Set-Location "../.."

    # Step 2: Copy built files to router resources
    Write-Host "📁 Copying built files to router resources..." -ForegroundColor Yellow
    if (Test-Path "app/router/resources/browser") {
        Remove-Item -Path "app/router/resources/browser/*" -Recurse -Force -ErrorAction SilentlyContinue
    }
    if (-not (Test-Path "app/router/resources/browser")) {
        New-Item -Path "app/router/resources/browser" -ItemType Directory -Force
    }
    # Move files from the nested browser directory to the correct location
    if (Test-Path "app/router/resources/browser/browser") {
        Move-Item -Path "app/router/resources/browser/browser/*" -Destination "app/router/resources/browser/" -Force
        Remove-Item -Path "app/router/resources/browser/browser" -Recurse -Force
    }
    Copy-Item -Path "app/order-app/dist/order-app/*" -Destination "app/router/resources/browser/" -Recurse -Force

    # Step 3: Build MTA archive
    Write-Host "🔨 Building MTA archive..." -ForegroundColor Yellow
    mbt build

    # Step 4: Deploy to Cloud Foundry
    Write-Host "☁️ Deploying to Cloud Foundry..." -ForegroundColor Yellow
    $mtarFile = Get-ChildItem -Path "mta_archives/*.mtar" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    Write-Host "Deploying: $($mtarFile.Name)" -ForegroundColor Cyan
    cf deploy $mtarFile.FullName

    Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
    Write-Host "🌐 Your app should be available at: https://instoreordercreationapp.cfapps.eu10-004.hana.ondemand.com/" -ForegroundColor Cyan
}
catch {
    Write-Host "❌ Deployment failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} 