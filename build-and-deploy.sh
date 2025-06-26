#!/bin/bash

# In-Store Order Creation App - Build and Deploy Script
# This script builds the MTA and deploys to Cloud Foundry

set -e  # Exit on any error

echo "🚀 Starting build and deploy process..."

# Step 1: Build MTA archive
echo "🔨 Building MTA archive..."
mbt build

# Step 2: Deploy to Cloud Foundry
echo "☁️ Deploying to Cloud Foundry..."
MTAR_FILE=$(ls -t mta_archives/*.mtar | head -n1)
echo "Deploying: $MTAR_FILE"
cf deploy "$MTAR_FILE"

echo "✅ Build and deployment completed successfully!"
echo "🌐 Your app should be available at: https://instoreordercreationapp.cfapps.eu10-004.hana.ondemand.com/" 