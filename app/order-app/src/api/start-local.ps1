Write-Host "Starting local development environment for Order App API..." -ForegroundColor Green

# Check if default-env.json exists
if (!(Test-Path "default-env.json")) {
    Write-Host "ERROR: default-env.json not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please create default-env.json from the template:" -ForegroundColor Yellow
    Write-Host "  cp default-env.json.template default-env.json" -ForegroundColor White
    Write-Host ""
    Write-Host "Then update it with your service credentials from:" -ForegroundColor Yellow
    Write-Host "  cf env InStoreOrderCreationApp" -ForegroundColor White
    Write-Host ""
    exit 1
}

# Function to check if SSH tunnel is running
function Test-SSHTunnel {
    $connection = Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort 8081 -ErrorAction SilentlyContinue
    return $null -ne $connection
}

# Start SSH tunnel if not already running
if (!(Test-SSHTunnel)) {
    Write-Host "SSH tunnel not detected." -ForegroundColor Yellow
    Write-Host "Please run this command in a separate terminal:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "cf ssh InStoreOrderCreationApp -L localhost:8081:connectivityproxy.internal.cf.eu10-004.hana.ondemand.com:20003" -ForegroundColor White
    Write-Host ""
    Write-Host "Press Enter when the SSH tunnel is established..." -ForegroundColor Yellow
    Read-Host
    
    # Check again
    if (!(Test-SSHTunnel)) {
        Write-Host "SSH tunnel not detected. Please ensure the tunnel is running." -ForegroundColor Red
        exit 1
    }
}

Write-Host "SSH tunnel detected on port 8081" -ForegroundColor Green

# Install dependencies if needed
if (!(Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# Start the API server
Write-Host "Starting API server on port 3000..." -ForegroundColor Green
npm run dev 