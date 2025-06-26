#!/bin/bash

# In-Store Order Creation App - Deployment Script
# This script builds the Angular app and deploys it to SAP BTP Cloud Foundry

set -e  # Exit on any error

echo "🚀 Starting deployment process..."

# Step 1: Build the Angular application
echo "📦 Building Angular application..."
cd app/order-app
npm install --legacy-peer-deps --no-audit --no-fund
npm run build:prod -- --output-hashing=none --extract-licenses=false --source-map=false
cd ../..

# Step 2: Copy built files to router resources
echo "📁 Copying built files to router resources..."
mkdir -p app/router/resources/browser
rm -rf app/router/resources/browser/*
cp -r app/order-app/dist/order-app/* app/router/resources/browser/

# Step 3: Build MTA archive
echo "🔨 Building MTA archive..."
mbt build

# Step 4: Deploy to Cloud Foundry
echo "☁️ Deploying to Cloud Foundry..."
MTAR_FILE=$(ls -t mta_archives/*.mtar | head -n1)
echo "Deploying: $MTAR_FILE"
cf deploy "$MTAR_FILE"

echo "✅ Deployment completed successfully!"
echo "🌐 Your app should be available at: https://instoreordercreationapp.cfapps.eu10-004.hana.ondemand.com/" 