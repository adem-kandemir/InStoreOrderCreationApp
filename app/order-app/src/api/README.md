# Order App API Server

This API server provides the backend for the InStore Order Creation App, handling connections to the SAP S/4HANA system through SAP BTP services.

## Architecture

The API server uses:
- **Destination Service**: To retrieve connection details and credentials for the S/4HANA system
- **Connectivity Service**: To establish secure connection to on-premise systems
- **XSUAA**: For authentication and authorization

## Setup for Local Development

### Prerequisites

1. Cloud Foundry CLI installed and logged in
2. Access to the deployed app on SAP BTP
3. Node.js 14+ installed

### Steps

1. **Get Service Credentials**
   ```bash
   cf env InStoreOrderCreationApp
   ```
   Copy the VCAP_SERVICES section from the output.

2. **Create default-env.json**
   ```bash
   cp default-env.json.template default-env.json
   ```
   Update the file with the actual credentials from step 1.

3. **Start SSH Tunnel** (in a separate terminal)
   ```bash
   cf ssh InStoreOrderCreationApp -L localhost:8081:connectivityproxy.internal.cf.eu10-004.hana.ondemand.com:20003
   ```

4. **Start the API Server**
   
   On Linux/Mac:
   ```bash
   ./start-local.sh
   ```
   
   On Windows:
   ```powershell
   .\start-local.ps1
   ```

## API Endpoints

### Products

- `GET /api/products` - List all products
  - Query params: `search` (optional) - Search by product ID or EAN
  
- `GET /api/products/:id` - Get single product by ID

- `GET /api/products/:id/image` - Get product image

### Health Check

- `GET /api/health` - Check API server status

## Development

The server automatically detects the environment:
- **Local**: Uses SSH tunnel and local service credentials
- **Cloud Foundry**: Uses bound services directly

## Troubleshooting

### SSH Tunnel Issues
- Ensure you're logged into CF: `cf login`
- Check the app is running: `cf app InStoreOrderCreationApp`
- Verify tunnel is established: `netstat -an | grep 8081`

### Service Connection Issues
- Verify default-env.json has correct credentials
- Check destination "RS4" exists in BTP cockpit
- Ensure Cloud Connector is running and location ID matches

### Product Data Issues
- Products need descriptions in entity `A_ProductDescription`
- Default language is 'EN'
- Stock and pricing data would come from additional services (not implemented yet) 