# Getting Started

Welcome to your new project.

It contains these folders and files, following our recommended project layout:

File or Folder | Purpose
---------|----------
`app/` | content for UI frontends goes here
`db/` | your domain models and data go here
`srv/` | your service models and code go here
`package.json` | project metadata and configuration
`readme.md` | this getting started guide


## Next Steps

- Open a new terminal and run `cds watch`
- (in VS Code simply choose _**Terminal** > Run Task > cds watch_)
- Start adding content, for example, a [db/schema.cds](db/schema.cds).


## Learn More

Learn more at https://cap.cloud.sap/docs/get-started/.

# InStore Order Creation App

This is a multi-module SAP BTP application for in-store order creation.

## Project Structure

- `app/` - Contains the application modules
  - `order-app/` - Angular frontend application
  - `router/` - Application router for SAP BTP
- `mta.yaml` - Multi-Target Application descriptor
- `xs-security.json` - Security configuration

## Development

### Prerequisites

- Node.js 18+
- Cloud Foundry CLI
- SAP BTP account with necessary services

### Local Development

1. Install dependencies:
   ```bash
   cd app/order-app
   npm install
   ```

2. Start the development server:
   ```bash
   npm start
   ```

The application will be available at http://localhost:4200

## On-Premise S/4HANA Integration

This application connects to an on-premise SAP S/4HANA system for product data. The integration uses SAP BTP's Connectivity and Destination services to securely access on-premise resources.

### Key Features

- **Product Search**: Search and display products from S/4HANA
- **Product Details**: View detailed product information including EAN, pricing, and stock levels
- **Fallback Mode**: Automatic fallback to mock data when S/4HANA is unavailable
- **Secure Connection**: All connections go through SAP BTP security layers

### Quick Start for On-Premise Connection

1. **Start SSH Tunnel** (for local development):
   ```bash
   cf ssh InStoreOrderCreationApp -L localhost:8081:connectivityproxy.internal.cf.eu10-004.hana.ondemand.com:20003
   ```

2. **Start API Server**:
   ```bash
   cd app/order-app/src/api
   npm start
   ```

3. **Start Angular App**:
   ```bash
   cd app/order-app
   npm start
   ```

For detailed setup instructions, see [ONPREMISE_CONNECTION.md](ONPREMISE_CONNECTION.md)

## Deployment

### Build and Deploy

Use the provided scripts to build and deploy the application:

```bash
# Windows
./build-and-deploy.ps1

# Linux/Mac
./build-and-deploy.sh
```

### Manual Deployment

1. Build the MTA:
   ```bash
   mbt build
   ```

2. Deploy to Cloud Foundry:
   ```bash
   cf deploy mta_archives/InStoreOrderCreationApp_1.0.0.mtar
   ```

## Architecture

The application follows a microservices architecture:

```
┌─────────────────┐     ┌─────────────────┐     ┌──────────────────┐
│   Angular App   │────▶│   App Router    │────▶│   API Server     │
│   (Frontend)    │     │  (Entry Point)  │     │   (Backend)      │
└─────────────────┘     └─────────────────┘     └──────────────────┘
                                                           │
                                                           ▼
                                                 ┌──────────────────┐
                                                 │  SAP BTP Services │
                                                 │  (Dest, Conn)    │
                                                 └──────────────────┘
                                                           │
                                                           ▼
                                                 ┌──────────────────┐
                                                 │   S/4HANA        │
                                                 │  (On-Premise)    │
                                                 └──────────────────┘
```

## Services

The application requires the following SAP BTP services:

- **Destination Service**: For managing connections to backend systems
- **Connectivity Service**: For secure tunnel to on-premise systems
- **XSUAA**: For authentication and authorization

## Documentation

- [Deployment Guide](DEPLOYMENT.md) - Detailed deployment instructions
- [On-Premise Connection](ONPREMISE_CONNECTION.md) - S/4HANA integration setup
- [API Documentation](app/order-app/src/api/README.md) - API server details

## License

This project is licensed under the SAP Sample Code License.
