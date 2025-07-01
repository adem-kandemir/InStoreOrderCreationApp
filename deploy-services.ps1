#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Deploy user-provided services for InStore Order Creation App to Cloud Foundry
.DESCRIPTION
    This script creates or updates user-provided services containing credentials for:
    - OPPS (Price and Promotion Service)
    - OMSA (Sourcing and Availability Service) 
    - OMF (Order Management and Fulfillment)
.EXAMPLE
    .\deploy-services.ps1
.EXAMPLE
    .\deploy-services.ps1 -UpdateExisting
#>

param(
    [switch]$UpdateExisting = $false,
    [switch]$DeleteFirst = $false,
    [string]$Environment = "dev"
)

# Color functions for output
function Write-Success { param($Message) Write-Host "✅ $Message" -ForegroundColor Green }
function Write-Info { param($Message) Write-Host "ℹ️  $Message" -ForegroundColor Cyan }
function Write-Warning { param($Message) Write-Host "⚠️  $Message" -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host "❌ $Message" -ForegroundColor Red }

Write-Info "🚀 Starting deployment of user-provided services..."

# Check if cf CLI is available
if (-not (Get-Command cf -ErrorAction SilentlyContinue)) {
    Write-Error "Cloud Foundry CLI (cf) is not installed or not in PATH"
    exit 1
}

# Check if logged in to CF
$cfTarget = cf target 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "Not logged in to Cloud Foundry. Please run 'cf login' first."
    exit 1
}

Write-Info "Current CF Target:"
Write-Host $cfTarget

# Function to create or update user-provided service
function Deploy-UserProvidedService {
    param(
        [string]$ServiceName,
        [hashtable]$Credentials,
        [string]$Description
    )
    
    Write-Info "Processing service: $ServiceName"
    
    # Convert credentials to JSON
    $credentialsJson = $Credentials | ConvertTo-Json -Compress
    
    # Check if service exists
    $serviceExists = cf service $ServiceName 2>&1
    $serviceExists = $LASTEXITCODE -eq 0
    
    if ($serviceExists) {
        if ($DeleteFirst) {
            Write-Warning "Deleting existing service: $ServiceName"
            cf delete-service $ServiceName -f
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Service $ServiceName deleted"
                $serviceExists = $false
            } else {
                Write-Error "Failed to delete service $ServiceName"
                return $false
            }
        } elseif ($UpdateExisting) {
            Write-Warning "Updating existing service: $ServiceName"
            cf update-user-provided-service $ServiceName -p $credentialsJson
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Service $ServiceName updated successfully"
                return $true
            } else {
                Write-Error "Failed to update service $ServiceName"
                return $false
            }
        } else {
            Write-Warning "Service $ServiceName already exists. Use -UpdateExisting to update or -DeleteFirst to recreate."
            return $true
        }
    }
    
    if (-not $serviceExists) {
        Write-Info "Creating new service: $ServiceName"
        cf create-user-provided-service $ServiceName -p $credentialsJson
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Service $ServiceName created successfully"
            return $true
        } else {
            Write-Error "Failed to create service $ServiceName"
            return $false
        }
    }
    
    return $false
}

# OPPS Credentials (Price and Promotion Service)
Write-Info "🔧 Deploying OPPS credentials..."
$oppsCredentials = @{
    client_id = "sb-4774874b-da35-4dd9-8b59-8ecd7d0a17ef!b59628|ppservice-cf-OPPS_oppsprodeu20-prod!b5785"
    client_secret = "df37408a-5cdb-4b58-a145-d27a8797ba10`$bPZjkBtg6NWOmIrCpmUAx34elbb3saNwdsZW8OiWKhk="
    token_url = "https://rbos-showcase-zzai01ti.authentication.eu20.hana.ondemand.com/oauth/token"
    base_url = "https://ppservice-odata-cf.cfapps.eu20.hana.ondemand.com:443/odata/v2/OPPS"
}

$oppsSuccess = Deploy-UserProvidedService -ServiceName "opps-credentials" -Credentials $oppsCredentials -Description "OPPS (Price and Promotion Service) credentials"

# OMSA Credentials (Sourcing and Availability Service) - Now Active!
Write-Info "🔧 Deploying OMSA credentials..."
$omsaCredentials = @{
    client_id = "sb-omsa-broker!b56615|provider-xsuaa-broker!b7248"
    client_secret = "2ab72a69-48d6-46ba-a123-4dd3b7a16255`$qBJ1xaPjr_nsD4zXjQ3IninXMIv5brsJpPh-1GV2cm4="
    token_url = "https://omsa-132fsx5y.authentication.eu20.hana.ondemand.com/oauth/token"
    base_url = "https://api.sourcing-availability.cloud.sap"
}

$omsaSuccess = Deploy-UserProvidedService -ServiceName "omsa-credentials" -Credentials $omsaCredentials -Description "OMSA (Sourcing and Availability Service) credentials"

# OMF Credentials (Order Management and Fulfillment) - Now Active!
Write-Info "🔧 Deploying OMF credentials..."
$omfCredentials = @{
    client_id = "sb-8dc23f9d-8457-4052-a3a6-651e06c29df4!b59628|dom!b7501"
    client_secret = "bcad55e1-d072-4de4-b122-4755e14e851b`$51RI549HpGAYJ2eFtmtgwrZw695NqfvJK_tukcfeXBM="
    token_url = "https://rbos-showcase-zzai01ti.authentication.eu20.hana.ondemand.com/oauth/token"
    base_url = "https://c4h-order.cfapps.eu20.hana.ondemand.com"
}

$omfSuccess = Deploy-UserProvidedService -ServiceName "omf-credentials" -Credentials $omfCredentials -Description "OMF (Order Management and Fulfillment) credentials"

# Summary
Write-Info "📋 Deployment Summary:"
if ($oppsSuccess) {
    Write-Success "OPPS credentials: ✅ Deployed"
} else {
    Write-Error "OPPS credentials: ❌ Failed"
}

if ($omsaSuccess) {
    Write-Success "OMSA credentials: ✅ Deployed"
} else {
    Write-Error "OMSA credentials: ❌ Failed"
}
if ($omfSuccess) {
    Write-Success "OMF credentials: ✅ Deployed"
} else {
    Write-Error "OMF credentials: ❌ Failed"
}

# List created services
Write-Info "📋 Current user-provided services:"
cf services | Select-String "user-provided"

Write-Info "🎯 Next steps:"
Write-Host "1. Update OMSA and OMF credentials in this script"
Write-Host "2. Run deployment: .\build-and-deploy.ps1"
Write-Host "3. Services will be automatically bound via mta.yaml"

Write-Success "🎉 Service deployment completed!" 