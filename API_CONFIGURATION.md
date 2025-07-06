# API Configuration Guide

This guide explains how to configure OAuth 2.0 credentials for the three integrated systems: OPPS, OMSA, and OMF.

## 🏗️ System Architecture

### Three Integrated Systems:
- **OPPS** (Price and Promotion Service): Handles product pricing and promotions
- **OMSA** (Sourcing and Availability Service): Manages stock levels, availability, and sourcing
- **OMF** (Order Management and Fulfillment): Processes orders, payments, and fulfillment

### Authentication:
All systems use **OAuth 2.0 with Client Credentials** grant type for service-to-service authentication.

## 🔧 Local Development Setup

### Step 1: Create Local Environment File

1. Copy the example environment file:
   ```bash
   cd app/order-app/src/api
   cp env.local.example env.local
   ```

2. Fill in your actual credentials in `env.local`:
   ```bash
   # Default Store Configuration
   DEFAULT_STORE_ID=STORE001

   # OPPS (Price and Promotion Service) Configuration
   OPPS_CLIENT_ID=your_actual_opps_client_id
   OPPS_CLIENT_SECRET=your_actual_opps_client_secret
   OPPS_TOKEN_URL=https://auth.your-opps-system.com/oauth/token
   OPPS_BASE_URL=https://api.your-opps-system.com

   # OMSA (Sourcing and Availability Service) Configuration
   OMSA_CLIENT_ID=your_actual_omsa_client_id
   OMSA_CLIENT_SECRET=your_actual_omsa_client_secret
   OMSA_TOKEN_URL=https://auth.your-omsa-system.com/oauth/token
   OMSA_BASE_URL=https://api.your-omsa-system.com

   # OMF (Order Management and Fulfillment Service) Configuration
   OMF_CLIENT_ID=your_actual_omf_client_id
   OMF_CLIENT_SECRET=your_actual_omf_client_secret
   OMF_TOKEN_URL=https://auth.your-omf-system.com/oauth/token
   OMF_BASE_URL=https://api.your-omf-system.com
   ```

### Step 2: Secure the Environment File

Add `env.local` to your `.gitignore` to prevent committing credentials:
```bash
echo "app/order-app/src/api/env.local" >> .gitignore
```

## ☁️ Cloud Foundry Deployment Setup

### Step 1: Set Environment Variables

Use the Cloud Foundry CLI to set environment variables for your deployed application:

```bash
# OPPS Configuration
cf set-env InStoreOrderCreationApp-srv OPPS_CLIENT_ID "your_actual_opps_client_id"
cf set-env InStoreOrderCreationApp-srv OPPS_CLIENT_SECRET "your_actual_opps_client_secret"
cf set-env InStoreOrderCreationApp-srv OPPS_TOKEN_URL "https://auth.your-opps-system.com/oauth/token"
cf set-env InStoreOrderCreationApp-srv OPPS_BASE_URL "https://api.your-opps-system.com"

# OMSA Configuration
cf set-env InStoreOrderCreationApp-srv OMSA_CLIENT_ID "your_actual_omsa_client_id"
cf set-env InStoreOrderCreationApp-srv OMSA_CLIENT_SECRET "your_actual_omsa_client_secret"
cf set-env InStoreOrderCreationApp-srv OMSA_TOKEN_URL "https://auth.your-omsa-system.com/oauth/token"
cf set-env InStoreOrderCreationApp-srv OMSA_BASE_URL "https://api.your-omsa-system.com"

# OMF Configuration
cf set-env InStoreOrderCreationApp-srv OMF_CLIENT_ID "your_actual_omf_client_id"
cf set-env InStoreOrderCreationApp-srv OMF_CLIENT_SECRET "your_actual_omf_client_secret"
cf set-env InStoreOrderCreationApp-srv OMF_TOKEN_URL "https://auth.your-omf-system.com/oauth/token"
cf set-env InStoreOrderCreationApp-srv OMF_BASE_URL "https://api.your-omf-system.com"

# Restart the application to apply changes
cf restart InStoreOrderCreationApp-srv
```

### Step 2: Alternative - MTA Deployment Variables

Alternatively, you can use MTA deployment variables. Create a `mtad.yaml` file:

```yaml
# mtad.yaml - MTA Deployment Variables
_schema-version: '3.1'
ID: InStoreOrderCreationApp
version: 1.0.0

modules:
  - name: InStoreOrderCreationApp-srv
    parameters:
      env:
        OPPS_CLIENT_ID: ${opps-client-id}
        OPPS_CLIENT_SECRET: ${opps-client-secret}
        OPPS_TOKEN_URL: ${opps-token-url}
        OPPS_BASE_URL: ${opps-base-url}
        # ... other variables
```

Then deploy with variables:
```bash
cf deploy mta_archives/InStoreOrderCreationApp_1.0.0.mtar -e mtad.yaml
```

## 📋 Required OAuth 2.0 Credentials

For each system (OPPS, OMSA, OMF), you need:

| Variable | Description | Example |
|----------|-------------|---------|
| CLIENT_ID | OAuth 2.0 Client ID | `service-client-123` |
| CLIENT_SECRET | OAuth 2.0 Client Secret | `abc123xyz789` |
| TOKEN_URL | OAuth token endpoint | `https://auth.system.com/oauth/token` |
| BASE_URL | API base URL | `https://api.system.com` |

## 🔍 Testing Configuration

### Health Check Endpoint

Test your configuration using the health check endpoint:

**Local Development:**
```bash
curl http://localhost:3000/api/health
```

**Cloud Foundry:**
```bash
curl https://your-instoreordercreationapp-srv-url.cfapps.eu10-004.hana.ondemand.com/api/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "environment": "Local Development",
  "services": {
    "opps": "configured",
    "omsa": "configured", 
    "omf": "configured"
  }
}
```

### Service Status:
- `"configured"` - Credentials are properly set
- `"fallback"` - Using fallback/mock data (credentials missing)

## 🚀 Available API Endpoints

### OPPS - Pricing and Promotions
- `GET /api/pricing/:productId` - Get product pricing
- `POST /api/pricing/batch` - Get batch pricing
- `GET /api/promotions/:productId` - Get promotions
- `POST /api/pricing-promotions/batch` - Get combined data

### OMSA - Sourcing and Availability
- `GET /api/availability/:productId` - Check availability
- `POST /api/availability/batch` - Batch availability check
- `GET /api/sourcing/:productId` - Get sourcing info
- `GET /api/stock/:productId` - Get stock levels
- `POST /api/stock/reserve` - Reserve stock
- `POST /api/stock/release` - Release reservations

### OMF - Order Management
- `POST /api/orders` - Create order
- `GET /api/orders/:orderId` - Get order details
- `PUT /api/orders/:orderId/status` - Update order status
- `POST /api/orders/:orderId/cancel` - Cancel order
- `GET /api/orders/:orderId/fulfillment` - Get fulfillment status
- `POST /api/orders/:orderId/payment` - Process payment
- `GET /api/orders` - Search orders

## 🛡️ Security Best Practices

1. **Never commit credentials** to version control
2. **Use environment variables** for all sensitive data
3. **Rotate credentials regularly**
4. **Use least privilege principle** for OAuth scopes
5. **Monitor API usage** and set up alerts
6. **Enable request logging** for debugging (without credentials)

## 🐛 Troubleshooting

### Common Issues:

**1. "Missing credentials" error:**
- Check environment variables are set correctly
- Verify variable names match exactly (case-sensitive)
- Restart the application after setting variables

**2. "Authentication failed" error:**
- Verify client ID and secret are correct
- Check token URL is accessible
- Ensure OAuth scopes are sufficient

**3. "Service unavailable" error:**
- Check base URL is correct and accessible
- Verify network connectivity
- Check service status

### Debug Mode:

Set `LOG_LEVEL=debug` to enable detailed logging:
```bash
# Local
LOG_LEVEL=debug npm start

# Cloud Foundry
cf set-env InStoreOrderCreationApp-srv LOG_LEVEL debug
cf restart InStoreOrderCreationApp-srv
```

## 📖 API Documentation

Each service provides fallback/mock data when real systems are unavailable, ensuring development can continue without external dependencies.

For detailed API documentation, see the individual service files:
- `services/opps.service.js` - OPPS implementation
- `services/omsa.service.js` - OMSA implementation  
- `services/omf.service.js` - OMF implementation
- `services/auth.service.js` - Centralized OAuth handling 