# In-Store Order Creation App - Build and Deploy Script (PowerShell)
# This script builds the MTA and deploys to Cloud Foundry

$ErrorActionPreference = "Stop"  # Exit on any error

Write-Host "🚀 Starting build and deploy process..." -ForegroundColor Green

try {
    # Step 1: Build Angular app and copy to router
    Write-Host "🔨 Building Angular app..." -ForegroundColor Yellow
    Push-Location app/order-app
    npm run build:prod
    Pop-Location
    
    Write-Host "📁 Copying build files to router..." -ForegroundColor Yellow
    if (Test-Path "app/router/resources/browser") {
        Remove-Item -Path "app/router/resources/browser" -Recurse -Force
    }
    if (-not (Test-Path "app/router/resources")) {
        New-Item -ItemType Directory -Path "app/router/resources" -Force | Out-Null
    }
    Copy-Item -Path "app/order-app/dist/order-app/browser" -Destination "app/router/resources/" -Recurse -Force
    
    # Step 2: Build MTA archive
    Write-Host "🔨 Building MTA archive..." -ForegroundColor Yellow
    mbt build

    # Step 3: Deploy to Cloud Foundry
    Write-Host "☁️ Deploying to Cloud Foundry..." -ForegroundColor Yellow
    $mtarFile = Get-ChildItem -Path "mta_archives/*.mtar" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    Write-Host "Deploying: $($mtarFile.Name)" -ForegroundColor Cyan
    cf deploy $mtarFile.FullName

    Write-Host "✅ Build and deployment completed successfully!" -ForegroundColor Green
    Write-Host "🌐 Your app should be available at: https://instoreordercreationapp.cfapps.eu10-004.hana.ondemand.com/" -ForegroundColor Cyan
}
catch {
    Write-Host "❌ Build and deployment failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} 