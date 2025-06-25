# SAP BTP Cloud Foundry Deployment Guide

## Overview
This guide explains how to deploy the In-Store Order Creation App to SAP BTP Cloud Foundry with XSUAA authentication.

## Prerequisites

1. **SAP BTP Account** with Cloud Foundry environment
2. **CF CLI** installed and configured
3. **MTA Build Tool** (`mbt`) installed
4. **Node.js** (version 18 or higher)
5. **Access to SAP BTP Cockpit** for role assignments

## Authentication & Authorization Setup

### Roles and Scopes
The application defines three main roles:

1. **OrderViewer** - Can view orders only
   - Scope: `OrderViewer`

2. **OrderCreator** - Can create and view orders  
   - Scopes: `OrderCreator`, `OrderViewer`

3. **Administrator** - Full access to the application
   - Scopes: `OrderCreator`, `OrderViewer`, `Admin`

### Local Development
- Authentication is **automatically disabled** when running locally
- Mock user with all permissions is created automatically
- Development mode banner is shown in the header

## Deployment Steps

### 1. Build the MTA Archive

```bash
# From the project root directory
npm install
mbt build
```

### 2. Deploy to Cloud Foundry

```bash
# Login to your CF environment
cf login -a <api-endpoint> -u <username>

# Deploy the MTA archive
cf deploy mta_archives/InStoreOrderCreationApp_1.0.0.mtar
```

### 3. Configure User Roles in BTP Cockpit

1. Navigate to your **BTP Cockpit**
2. Go to **Security > Role Collections**
3. Create role collections based on your needs:

#### For Order Creators:
```
Role Collection Name: OrderCreator
Roles:
- InStoreOrderCreationApp!<instance>.OrderCreator
- InStoreOrderCreationApp!<instance>.OrderViewer
```

#### For Order Viewers:
```
Role Collection Name: OrderViewer  
Roles:
- InStoreOrderCreationApp!<instance>.OrderViewer
```

#### For Administrators:
```
Role Collection Name: OrderAdmin
Roles:
- InStoreOrderCreationApp!<instance>.Administrator
```

### 4. Assign Users to Role Collections

1. In BTP Cockpit, go to **Security > Users**
2. Select a user
3. Assign appropriate role collections
4. Save changes

## Application URLs

After deployment, the application will be available at:
```
https://<app-name>-<space>-<org>.cfapps.<region>.hana.ondemand.com
```

## Environment Configuration

The application uses Angular environment files to control behavior:

### Production Mode (BTP Deployment)
- Uses `environment.ts` 
- **Authentication**: Full XSUAA enabled
- **Development Mode**: Disabled
- **Mock Auth**: Disabled

### Local Development
- Uses `environment.local.ts` by default
- **Authentication**: Completely bypassed
- **Development Mode**: Enabled
- **Mock Auth**: Enabled with full permissions

### Available Commands:
```bash
# Local development (default)
npm start

# Development build
npm run start:dev  

# Production build (for BTP)
npm run build:prod
```

## Configuration Files

### Key Files:
- `xs-security.json` - XSUAA security configuration
- `mta.yaml` - Multi-target application descriptor  
- `app/router/xs-app.json` - Application router configuration
- `app/order-app/manifest.json` - HTML5 app manifest

### Security Configuration (`xs-security.json`):
```json
{
  "scopes": [
    { "name": "$XSAPPNAME.OrderCreator" },
    { "name": "$XSAPPNAME.OrderViewer" }, 
    { "name": "$XSAPPNAME.Admin" }
  ],
  "role-templates": [
    { "name": "OrderCreator", "scope-references": ["$XSAPPNAME.OrderCreator", "$XSAPPNAME.OrderViewer"] },
    { "name": "OrderViewer", "scope-references": ["$XSAPPNAME.OrderViewer"] },
    { "name": "Administrator", "scope-references": ["$XSAPPNAME.OrderCreator", "$XSAPPNAME.OrderViewer", "$XSAPPNAME.Admin"] }
  ]
}
```

## Troubleshooting

### Common Issues:

1. **403 Forbidden Error**
   - Check if user has correct role assignments
   - Verify role collection configuration
   - Check application router logs

2. **Authentication Not Working**
   - Verify XSUAA service binding
   - Check xs-security.json configuration
   - Ensure redirect URIs are correct

3. **Build Failures**
   - Ensure all dependencies are installed
   - Check Node.js version compatibility
   - Verify MTA build tool installation

### Useful Commands:

```bash
# Check application status
cf apps

# View application logs
cf logs <app-name> --recent

# Check service bindings
cf services

# Restart application
cf restart <app-name>

# Check environment variables
cf env <app-name>
```

## Development vs Production

| Feature | Local Development | Cloud Foundry |
|---------|------------------|---------------|
| Authentication | Disabled | XSUAA Enabled |
| User | Mock User | Real BTP Users |
| Permissions | All Granted | Role-based |
| Banner | Development Mode | None |

## Security Notes

- All routes require authentication in production
- Role-based access control is enforced
- CSRF protection is enabled for API calls
- Secure session management via XSUAA

## Support

For deployment issues:
1. Check CF logs: `cf logs <app-name>`
2. Verify BTP Cockpit configurations
3. Review XSUAA service instance
4. Contact your BTP administrator 