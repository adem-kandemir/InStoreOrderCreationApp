#!/bin/bash

# In-Store Order Creation App - Build and Deploy Script
# This script builds the MTA and deploys to Cloud Foundry

set -e  # Exit on any error

echo "🚀 Starting build and deploy process..."

# Step 1: Build Angular app and copy to router
echo "🔨 Building Angular app..."
cd app/order-app
npm run build:prod
cd ../..

echo "📁 Copying build files to router..."
rm -rf app/router/resources/browser
mkdir -p app/router/resources
cp -r app/order-app/dist/order-app/browser app/router/resources/

# Step 2: Build MTA archive
echo "🔨 Building MTA archive..."
mbt build

# Step 3: Deploy to Cloud Foundry
echo "☁️ Deploying to Cloud Foundry..."
MTAR_FILE=$(ls -t mta_archives/*.mtar | head -1)
echo "Deploying: $MTAR_FILE"
cf deploy $MTAR_FILE

echo "✅ Build and deployment completed successfully!"
echo "🌐 Your app should be available at: https://instoreordercreationapp.cfapps.eu10-004.hana.ondemand.com/" 