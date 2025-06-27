# On-Premise S/4HANA Connection Setup

This document describes how the InStore Order Creation App connects to an on-premise SAP S/4HANA system through SAP BTP services.

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌──────────────────┐
│   Angular App   │────▶│   API Server    │────▶│ Destination Svc  │
│  (localhost:4200)│     │ (localhost:3000)│     │    (SAP BTP)     │
└─────────────────┘     └─────────────────┘     └──────────────────┘
                                                           │
                                                           ▼
                                                 ┌──────────────────┐
                                                 │ Connectivity Svc │
                                                 │    (SAP BTP)     │
                                                 └──────────────────┘
                                                           │
                                                           ▼
                                                 ┌──────────────────┐
                                                 │ Cloud Connector  │
                                                 │  (On-Premise)    │
                                                 └──────────────────┘
                                                           │
                                                           ▼
                                                 ┌──────────────────┐
                                                 │   S/4HANA        │
                                                 │  (On-Premise)    │
                                                 └──────────────────┘
```

## Components

### 1. Angular Frontend (`app/order-app/`)
- Runs on http://localhost:4200
- Proxies API calls to the backend server
- Configuration: `proxy.conf.json`

### 2. API Server (`app/order-app/src/api/`)
- Runs on http://localhost:3000
- Handles authentication and routing to S/4HANA
- Provides fallback mock data when S/4HANA is unavailable

### 3. SAP BTP Services
- **Destination Service**: Stores S/4HANA connection details
- **Connectivity Service**: Manages secure tunnel to on-premise systems
- **XSUAA**: Handles OAuth2 authentication

### 4. On-Premise Components
- **Cloud Connector**: Bridges on-premise network with SAP BTP
- **S/4HANA System**: Provides OData services for product data

## Setup Instructions

### Prerequisites

1. SAP BTP subaccount with:
   - Destination service instance
   - Connectivity service instance
   - XSUAA service instance
   - Destination "RS4" configured

2. Cloud Connector configured with:
   - Connection to S/4HANA system
   - Location ID: RS4CLNT100_LOCID

3. Development tools:
   - Node.js 18+
   - Cloud Foundry CLI
   - Git

### Local Development Setup

1. **Clone and Install**
   ```bash
   git clone <repository>
   cd InStoreOrderCreationApp
   
   # Install API dependencies
   cd app/order-app/src/api
   npm install
   
   # Install Angular dependencies
   cd ../..
   npm install
   ```

2. **Configure Services**
   The `default-env.json` is already configured with the necessary service credentials.

3. **Start SSH Tunnel** (Terminal 1)
   ```bash
   cf ssh InStoreOrderCreationApp -L localhost:8081:connectivityproxy.internal.cf.eu10-004.hana.ondemand.com:20003
   ```

4. **Start API Server** (Terminal 2)
   ```bash
   cd app/order-app/src/api
   npm start
   ```

5. **Start Angular App** (Terminal 3)
   ```bash
   cd app/order-app
   npm start
   ```

6. **Access Application**
   Open http://localhost:4200 in your browser

## Destination Configuration

The destination "RS4" should be configured in SAP BTP with:

```json
{
  "Name": "RS4",
  "Type": "HTTP",
  "URL": "http://rs4.rb-omnishore.de:8000",
  "ProxyType": "OnPremise",
  "Authentication": "BasicAuthentication",
  "User": "<username>",
  "Password": "<password>",
  "CloudConnectorLocationId": "RS4CLNT100_LOCID"
}
```

## API Endpoints

### Product Endpoints

- **List Products**
  ```
  GET /api/products?search=<query>
  ```
  Returns product list from S/4HANA or mock data

- **Get Product**
  ```
  GET /api/products/:id
  ```
  Returns specific product details

- **Product Image**
  ```
  GET /api/products/:id/image
  ```
  Returns product image (currently redirects to static assets)

### Health Check

- **API Health**
  ```
  GET /api/health
  ```
  Returns server status

## Data Flow

1. **Angular App** makes request to `/api/products`
2. **Proxy** forwards to `http://127.0.0.1:3000/api/products`
3. **API Server** authenticates with Destination Service
4. **Destination Service** returns S/4HANA credentials
5. **API Server** makes OData call through SSH tunnel
6. **Connectivity Service** routes through Cloud Connector
7. **S/4HANA** returns product data
8. **API Server** transforms and returns to Angular

## Error Handling

The API server includes robust error handling:

1. **Connection Failures**: Falls back to mock data
2. **Authentication Errors**: Logs details for debugging
3. **Network Issues**: Returns appropriate error messages

## Mock Data Fallback

When S/4HANA is unavailable, the API returns sample products:
- Stabilo Boss Highlighters (Yellow, Pink, Green)
- Test Product from S/4HANA (ID: 4)

## Deployment to Cloud Foundry

When deployed to SAP BTP, the application automatically:
1. Uses bound service instances
2. Connects without SSH tunnels
3. Handles authentication transparently

### Build and Deploy

```bash
# Build the application
./build-and-deploy.sh  # Linux/Mac
./build-and-deploy.ps1 # Windows

# Or deploy only
./deploy.sh  # Linux/Mac
./deploy.ps1 # Windows
```

## Troubleshooting

### Common Issues

1. **"Connection Refused" Error**
   - Ensure SSH tunnel is running
   - Check API server is started
   - Verify proxy configuration uses `127.0.0.1`

2. **"403 Forbidden" from Destination Service**
   - Check service credentials in `default-env.json`
   - Verify destination exists and is accessible
   - Ensure proper roles assigned in SAP BTP

3. **No Products Displayed**
   - Check browser console for errors
   - Verify API health: http://localhost:3000/api/health
   - Check SSH tunnel is active

### Debug Commands

```bash
# Check SSH tunnel
netstat -an | grep 8081

# Test API directly
curl http://localhost:3000/api/health
curl http://localhost:3000/api/products

# Check CF app status
cf app InStoreOrderCreationApp
cf logs InStoreOrderCreationApp --recent
```

## Security Considerations

1. **Credentials**: Never commit `default-env.json` with real credentials
2. **OAuth Tokens**: Automatically refreshed by the API server
3. **Network**: All traffic goes through encrypted SAP BTP services
4. **Logging**: Sensitive data is not logged

## Next Steps

1. Implement real stock data integration
2. Add pricing service integration
3. Implement order creation in S/4HANA
4. Add product image management
5. Implement caching for better performance 