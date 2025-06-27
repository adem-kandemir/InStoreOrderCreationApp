#!/usr/bin/env pwsh
# Start script for local development

Write-Host "Starting InStore Order Creation App..." -ForegroundColor Green

# Start API server in new window
Write-Host "Starting API server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd app/order-app/src/api; npm start"

# Wait a bit for API to start
Start-Sleep -Seconds 3

# Start Angular app in new window
Write-Host "Starting Angular app..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd app/order-app; npm start"

Write-Host "`nServers starting..." -ForegroundColor Green
Write-Host "API Server: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Angular App: http://localhost:4200" -ForegroundColor Cyan
Write-Host "`nPress any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 