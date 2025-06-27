# Order App API Server

Node.js/Express API server that provides product data from SAP S/4HANA to the Angular frontend.

## Overview

This API server acts as a middleware between the Angular frontend and SAP S/4HANA system. It handles:
- Authentication with SAP BTP services
- Product data retrieval from S/4HANA
- Data transformation and caching
- Fallback to mock data when S/4HANA is unavailable

## Features

- **Environment Detection**: Automatically detects local vs Cloud Foundry environment
- **Direct S/4HANA Connection**: For local development
- **Destination Service Integration**: For cloud deployment
- **Product Search**: Full-text search across product descriptions, IDs, and EANs
- **Error Handling**: Graceful fallback to mock data
- **CORS Support**: Configured for local development

## Configuration

### Local Development

Create an `env.local` file:

```env
# S/4HANA Direct Connection Credentials
S4HANA_USERNAME=your_username
S4HANA_PASSWORD=your_password
```

The server will automatically:
- Load credentials from `env.local`
- Connect directly to S/4HANA at `http://MERCHANDISE.REALCORE.DE:8000`
- Use Basic Authentication

### Cloud Deployment

In Cloud Foundry, the server:
- Uses VCAP_SERVICES for service bindings
- Retrieves destination configuration from SAP BTP
- Handles OAuth2 authentication automatically

## API Endpoints

### Health Check
```
GET /api/health
```
Returns server status and timestamp.

### List Products
```
GET /api/products?search=<query>
```
- Returns up to 100 products
- Optional search parameter filters by description, ID, or EAN
- Includes product descriptions from S/4HANA

Example response:
```json
{
  "products": [
    {
      "id": "29",
      "ean": "9999999999987",
      "description": "RBOmnishore Pen",
      "listPrice": 19.99,
      "unit": "ST",
      "image": "/api/images/products/29.jpg",
      "inStoreStock": 45,
      "onlineStock": 120,
      "isAvailable": true
    }
  ],
  "totalCount": 15
}
```

### Get Product by ID
```
GET /api/products/:id
```
Returns detailed information for a specific product.

## Running the Server

### Development
```bash
npm install
npm start
```

The server runs on http://localhost:3000

### Testing Direct Connection
```bash
node test-direct.js
```

This tests the direct S/4HANA connection without starting the full server.

## Architecture

```
┌─────────────────┐
│  Angular App    │
│  (Port 4200)    │
└────────┬────────┘
         │ HTTP
         ▼
┌─────────────────┐
│   API Server    │
│  (Port 3000)    │
└────────┬────────┘
         │
         ├─── Local Dev ──────► Direct S/4HANA Connection
         │
         └─── Cloud ──────────► Destination Service ──► S/4HANA
```

## Error Handling

The server implements multiple fallback strategies:

1. **Primary**: Fetch from S/4HANA
2. **Fallback**: Return mock data if S/4HANA is unavailable
3. **Logging**: All errors are logged for debugging

## Mock Data

When S/4HANA is unavailable, the server returns mock products:
- Stabilo Boss Highlighters
- Test products with realistic data
- Consistent structure for frontend development

## Security

- **Local**: Basic Authentication with S/4HANA credentials
- **Cloud**: OAuth2 via SAP BTP services
- **CORS**: Configured for Angular development server
- **No credentials in code**: All sensitive data in environment variables

## Dependencies

- `express`: Web framework
- `cors`: CORS middleware
- `axios`: HTTP client
- `dotenv`: Environment variable management
- `@sap/xsenv`: SAP service bindings (Cloud Foundry only)

## Troubleshooting

### 401 Unauthorized
- Check S/4HANA credentials in `env.local`
- Verify username/password are correct

### 403 Forbidden
- Ensure destination service binding is correct
- Check SAP BTP service credentials

### Empty Search Results
- Products are fetched with descriptions
- Search is case-insensitive
- Searches in description, ID, and EAN fields

### Connection Timeout
- Verify S/4HANA system is accessible
- Check network connectivity
- For on-premise systems, ensure Cloud Connector is running 