# InStore Order Creation App - API Server

This API server provides a backend for the InStore Order Creation App, connecting to an on-premise SAP S/4HANA system through SAP BTP's Connectivity and Destination services.

## Architecture

The API server acts as a proxy between the Angular frontend and the on-premise S/4HANA system:

```
Angular App → API Server → Destination Service → Connectivity Service → Cloud Connector → S/4HANA
```

## Features

- Product search and retrieval from S/4HANA OData services
- Automatic fallback to mock data when S/4HANA is unavailable
- Support for both local development and Cloud Foundry deployment
- Secure connection through SAP BTP services

## Local Development

### Prerequisites

1. Node.js 18+ installed
2. Access to SAP BTP with configured:
   - Destination Service instance
   - Connectivity Service instance
   - Destination "RS4" configured for on-premise S/4HANA
3. Cloud Foundry CLI installed and logged in

### Setup

1. Install dependencies:
   ```bash
   cd app/order-app/src/api
   npm install
   ```

2. Copy the environment template:
   ```bash
   cp default-env.json.template default-env.json
   ```

3. Update `default-env.json` with your service credentials (already configured)

### Running Locally

1. Start the SSH tunnel to the connectivity proxy (in a separate terminal):
   ```bash
   cf ssh InStoreOrderCreationApp -L localhost:8081:connectivityproxy.internal.cf.eu10-004.hana.ondemand.com:20003
   ```

2. Start the API server:
   ```bash
   npm start
   ```

The API server will run on http://localhost:3000

### API Endpoints

- `GET /api/health` - Health check endpoint
- `GET /api/products` - List products (supports search query parameter)
- `GET /api/products/:id` - Get specific product by ID
- `GET /api/products/:id/image` - Get product image (redirects to static assets)

## Cloud Foundry Deployment

When deployed to Cloud Foundry, the API server automatically:
1. Uses bound service instances for authentication
2. Connects through the connectivity proxy without SSH tunnels
3. Handles authentication tokens automatically

### Environment Detection

The server detects the environment using:
```javascript
const isCloudFoundry = process.env.VCAP_APPLICATION ? true : false;
```

### Service Bindings

Required services in Cloud Foundry:
- `destination-service` - For accessing destination configurations
- `connectivity-service` - For connecting to on-premise systems

## Configuration

### Destination Configuration (RS4)

The destination should be configured with:
- **Name**: RS4
- **Type**: HTTP
- **URL**: http://rs4.rb-omnishore.de:8000
- **ProxyType**: OnPremise
- **Authentication**: BasicAuthentication
- **CloudConnectorLocationId**: RS4CLNT100_LOCID

### Product Data Transformation

S/4HANA product data is transformed to match the Angular app's interface:

```javascript
{
  id: s4Product.Product,
  ean: s4Product.ProductStandardID || '',
  description: s4Product.ProductDescription || s4Product.Product,
  listPrice: parseFloat(s4Product.NetPriceAmount || '0'),
  unit: s4Product.BaseUnit || 'EA',
  image: `/api/images/products/${s4Product.Product}.jpg`,
  inStoreStock: Math.floor(Math.random() * 100), // Mock data
  onlineStock: Math.floor(Math.random() * 100),  // Mock data
  isAvailable: true
}
```

## Error Handling

The API includes comprehensive error handling:
1. Falls back to mock data when S/4HANA is unavailable
2. Logs detailed error information for debugging
3. Returns appropriate HTTP status codes

## Mock Data

When the S/4HANA connection fails, the API returns mock product data to ensure the frontend can still be tested. Mock products include sample highlighters and a test product from S/4HANA.

## Troubleshooting

### Local Development Issues

1. **Connection Refused**: Ensure the SSH tunnel is running
2. **403 Forbidden**: Check destination service credentials and permissions
3. **IPv6 Issues**: The server binds to 127.0.0.1 to avoid IPv6 problems

### Cloud Foundry Issues

1. **Service Binding**: Ensure services are properly bound to the application
2. **Destination Access**: Verify the destination is accessible from the subaccount
3. **Cloud Connector**: Ensure the Cloud Connector is running and configured

## Security Notes

- OAuth2 tokens are automatically refreshed
- Credentials are never exposed in logs
- All connections to S/4HANA go through secure SAP BTP services 