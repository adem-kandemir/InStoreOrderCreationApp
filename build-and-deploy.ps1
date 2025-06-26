# In-Store Order Creation App - Build and Deploy Script (PowerShell)
# This script builds the MTA and deploys to Cloud Foundry

$ErrorActionPreference = "Stop"  # Exit on any error

Write-Host "🚀 Starting build and deploy process..." -ForegroundColor Green

try {
    # Step 1: Build MTA archive
    Write-Host "🔨 Building MTA archive..." -ForegroundColor Yellow
    mbt build

    # Step 2: Deploy to Cloud Foundry
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