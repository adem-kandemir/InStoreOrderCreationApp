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

# InStoreOrderCreationApp

An Angular-based in-store order creation application for SAP Business Technology Platform (BTP) that connects to SAP S/4HANA for product data.

## Overview

This application enables store employees to create orders by searching and selecting products from the S/4HANA system. It features:

- **Product Search**: Real-time search through S/4HANA product catalog
- **Responsive Design**: Works on tablets and mobile devices
- **Multi-language Support**: Configurable language settings
- **SAP BTP Integration**: Deployed as a Cloud Foundry application
- **Direct S/4HANA Connection**: For local development
- **Destination Service**: For cloud deployment

## Architecture

```
├── app/
│   ├── order-app/          # Angular frontend application
│   │   ├── src/
│   │   │   ├── api/        # Node.js API server
│   │   │   ├── app/        # Angular components
│   │   │   └── assets/     # Static assets
│   │   └── dist/           # Build output
│   └── router/             # Application router for SAP BTP
├── mta.yaml                # Multi-Target Application descriptor
└── xs-security.json        # Security configuration
```

## Prerequisites

- Node.js (v18 or higher)
- Angular CLI (`npm install -g @angular/cli`)
- Cloud Foundry CLI (for deployment)
- SAP BTP account with:
  - Cloud Foundry environment
  - Destination service
  - Authorization & Trust Management service

## Local Development

### Quick Start

Use the provided start scripts to run both servers:

```bash
# Windows
./start-local.ps1

# Linux/Mac
./start-local.sh
```

This will start both the API server (port 3000) and Angular app (port 4200) in separate windows.

### Manual Setup

1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install Angular app dependencies
cd app/order-app
npm install

# Install API server dependencies
cd src/api
npm install
```

2. Configure S/4HANA Connection

For local development, create `app/order-app/src/api/env.local` file:

```env
# S/4HANA Direct Connection Credentials
S4HANA_USERNAME=your_username
S4HANA_PASSWORD=your_password
```

3. Start the Application

Start both the API server and Angular development server:

```bash
# Terminal 1: Start API server
cd app/order-app/src/api
npm start

# Terminal 2: Start Angular app
cd app/order-app
npm start
```

The application will be available at:
- Frontend: http://localhost:4200
- API: http://localhost:3000

## Deployment to SAP BTP

### 1. Build the Application

Use the provided build script:

```bash
# Windows
./build-and-deploy.ps1

# Linux/Mac
./build-and-deploy.sh
```

This script will:
- Build the Angular application
- Copy files to the router directory
- Create an MTA archive

### 2. Deploy to Cloud Foundry

```bash
# Deploy the MTA archive
cf deploy mta_archives/InStoreOrderCreationApp_1.0.0.mtar
```

### 3. Configure Destination

In SAP BTP cockpit, create a destination named "RS4" with:
- URL: Your S/4HANA system URL
- Authentication: BasicAuthentication
- ProxyType: OnPremise (if using Cloud Connector)

## Features

### Product Search
- Search products by name, ID, or EAN
- Real-time search with debouncing
- Displays product details including price and availability

### Shopping Cart
- Add/remove products
- Adjust quantities
- Calculate totals

### Multi-language Support
- German and English translations
- Configurable through settings

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/products` - List products (with optional search)
- `GET /api/products/:id` - Get specific product

## Security

The application uses:
- OAuth 2.0 for API authentication
- SAP BTP Authorization & Trust Management
- Secure destination service for S/4HANA connection

## Troubleshooting

### Blank Page After Deployment
- Check that Angular build files are in `app/router/resources/browser/`
- Verify the xs-app.json routing configuration

### 403 Forbidden Errors
- Ensure the app is bound to the correct destination service
- Check destination service credentials in SAP BTP

### Connection Issues
- For on-premise systems, verify Cloud Connector is running
- Check destination configuration in SAP BTP cockpit

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.
