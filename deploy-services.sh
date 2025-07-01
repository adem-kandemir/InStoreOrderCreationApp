#!/bin/bash

# Deploy user-provided services for InStore Order Creation App to Cloud Foundry
# This script creates or updates user-provided services containing credentials for:
# - OPPS (Price and Promotion Service)
# - OMSA (Sourcing and Availability Service) 
# - OMF (Order Management and Fulfillment)

set -e  # Exit on any error

# Parse command line arguments
UPDATE_EXISTING=false
DELETE_FIRST=false
ENVIRONMENT="dev"

while [[ $# -gt 0 ]]; do
  case $1 in
    --update-existing)
      UPDATE_EXISTING=true
      shift
      ;;
    --delete-first)
      DELETE_FIRST=true
      shift
      ;;
    --environment)
      ENVIRONMENT="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 [OPTIONS]"
      echo "Options:"
      echo "  --update-existing    Update existing services instead of creating new ones"
      echo "  --delete-first       Delete existing services before creating new ones"
      echo "  --environment ENV    Target environment (default: dev)"
      echo "  -h, --help          Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Color functions for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

write_success() { echo -e "${GREEN}✅ $1${NC}"; }
write_info() { echo -e "${CYAN}ℹ️  $1${NC}"; }
write_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
write_error() { echo -e "${RED}❌ $1${NC}"; }

write_info "🚀 Starting deployment of user-provided services..."

# Check if cf CLI is available
if ! command -v cf &> /dev/null; then
    write_error "Cloud Foundry CLI (cf) is not installed or not in PATH"
    exit 1
fi

# Check if logged in to CF
if ! cf target &> /dev/null; then
    write_error "Not logged in to Cloud Foundry. Please run 'cf login' first."
    exit 1
fi

write_info "Current CF Target:"
cf target

# Function to create or update user-provided service
deploy_user_provided_service() {
    local service_name=$1
    local credentials_json=$2
    local description=$3
    
    write_info "Processing service: $service_name"
    
    # Check if service exists
    if cf service "$service_name" &> /dev/null; then
        service_exists=true
    else
        service_exists=false
    fi
    
    if [ "$service_exists" = true ]; then
        if [ "$DELETE_FIRST" = true ]; then
            write_warning "Deleting existing service: $service_name"
            if cf delete-service "$service_name" -f; then
                write_success "Service $service_name deleted"
                service_exists=false
            else
                write_error "Failed to delete service $service_name"
                return 1
            fi
        elif [ "$UPDATE_EXISTING" = true ]; then
            write_warning "Updating existing service: $service_name"
            if cf update-user-provided-service "$service_name" -p "$credentials_json"; then
                write_success "Service $service_name updated successfully"
                return 0
            else
                write_error "Failed to update service $service_name"
                return 1
            fi
        else
            write_warning "Service $service_name already exists. Use --update-existing to update or --delete-first to recreate."
            return 0
        fi
    fi
    
    if [ "$service_exists" = false ]; then
        write_info "Creating new service: $service_name"
        if cf create-user-provided-service "$service_name" -p "$credentials_json"; then
            write_success "Service $service_name created successfully"
            return 0
        else
            write_error "Failed to create service $service_name"
            return 1
        fi
    fi
    
    return 1
}

# OPPS Credentials (Price and Promotion Service)
write_info "🔧 Deploying OPPS credentials..."
OPPS_CREDENTIALS='{
  "client_id": "sb-4774874b-da35-4dd9-8b59-8ecd7d0a17ef!b59628|ppservice-cf-OPPS_oppsprodeu20-prod!b5785",
  "client_secret": "df37408a-5cdb-4b58-a145-d27a8797ba10$bPZjkBtg6NWOmIrCpmUAx34elbb3saNwdsZW8OiWKhk=",
  "token_url": "https://rbos-showcase-zzai01ti.authentication.eu20.hana.ondemand.com/oauth/token",
  "base_url": "https://ppservice-odata-cf.cfapps.eu20.hana.ondemand.com:443/odata/v2/OPPS"
}'

if deploy_user_provided_service "opps-credentials" "$OPPS_CREDENTIALS" "OPPS (Price and Promotion Service) credentials"; then
    OPPS_SUCCESS=true
else
    OPPS_SUCCESS=false
fi

# OMSA Credentials (Sourcing and Availability Service) - Now Active!
write_info "🔧 Deploying OMSA credentials..."
OMSA_CREDENTIALS='{
  "client_id": "sb-omsa-broker!b56615|provider-xsuaa-broker!b7248",
  "client_secret": "2ab72a69-48d6-46ba-a123-4dd3b7a16255$qBJ1xaPjr_nsD4zXjQ3IninXMIv5brsJpPh-1GV2cm4=",
  "token_url": "https://omsa-132fsx5y.authentication.eu20.hana.ondemand.com/oauth/token",
  "base_url": "https://api.sourcing-availability.cloud.sap"
}'

if deploy_user_provided_service "omsa-credentials" "$OMSA_CREDENTIALS" "OMSA (Sourcing and Availability Service) credentials"; then
    OMSA_SUCCESS=true
else
    OMSA_SUCCESS=false
fi

# OMF Credentials (Order Management and Fulfillment) - Now Active!
write_info "🔧 Deploying OMF credentials..."
OMF_CREDENTIALS='{
  "client_id": "sb-8dc23f9d-8457-4052-a3a6-651e06c29df4!b59628|dom!b7501",
  "client_secret": "bcad55e1-d072-4de4-b122-4755e14e851b$51RI549HpGAYJ2eFtmtgwrZw695NqfvJK_tukcfeXBM=",
  "token_url": "https://rbos-showcase-zzai01ti.authentication.eu20.hana.ondemand.com/oauth/token",
  "base_url": "https://c4h-order.cfapps.eu20.hana.ondemand.com"
}'

if deploy_user_provided_service "omf-credentials" "$OMF_CREDENTIALS" "OMF (Order Management and Fulfillment) credentials"; then
    OMF_SUCCESS=true
else
    OMF_SUCCESS=false
fi

# Summary
write_info "📋 Deployment Summary:"
if [ "$OPPS_SUCCESS" = true ]; then
    write_success "OPPS credentials: ✅ Deployed"
else
    write_error "OPPS credentials: ❌ Failed"
fi

if [ "$OMSA_SUCCESS" = true ]; then
    write_success "OMSA credentials: ✅ Deployed"
else
    write_error "OMSA credentials: ❌ Failed"
fi

if [ "$OMF_SUCCESS" = true ]; then
    write_success "OMF credentials: ✅ Deployed"
else
    write_error "OMF credentials: ❌ Failed"
fi

# List created services
write_info "📋 Current user-provided services:"
cf services | grep "user-provided" || echo "No user-provided services found"

write_info "🎯 Next steps:"
echo "1. Update OMSA and OMF credentials in this script"
echo "2. Run deployment: ./build-and-deploy.sh"
echo "3. Services will be automatically bound via mta.yaml"

write_success "🎉 Service deployment completed!" 