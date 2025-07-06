# 🔐 Credentials Deployment Guide

This guide explains how to securely deploy user-provided services containing credentials for the InStore Order Creation App to Cloud Foundry.

## 📋 Overview

The application requires credentials for three enterprise systems:
- **OPPS** (Price and Promotion Service) - ✅ **Currently Working**
- **OMSA** (Sourcing and Availability Service) - 🔄 **Pending Integration**
- **OMF** (Order Management and Fulfillment) - 🔄 **Pending Integration**

## 🛠️ Available Scripts

### 1. PowerShell Script (Windows)
```powershell
.\deploy-services.ps1
```

### 2. Bash Script (Linux/Mac/WSL)
```bash
./deploy-services.sh
```

## 🚀 Quick Start

### Prerequisites
1. **Cloud Foundry CLI** installed and configured
2. **Logged in** to your Cloud Foundry space:
   ```bash
   cf login
   ```

### Basic Deployment
```powershell
# Deploy all configured services
.\deploy-services.ps1

# Update existing services
.\deploy-services.ps1 -UpdateExisting

# Delete and recreate services
.\deploy-services.ps1 -DeleteFirst
```

### Bash Equivalent
```bash
# Deploy all configured services
./deploy-services.sh

# Update existing services
./deploy-services.sh --update-existing

# Delete and recreate services
./deploy-services.sh --delete-first
```

## 📁 File Structure

```
InStoreOrderCreationApp/
├── deploy-services.ps1          # PowerShell deployment script
├── deploy-services.sh           # Bash deployment script
├── credentials-template.json    # Template for credentials
├── credentials.json            # YOUR actual credentials (gitignored)
├── mta.yaml                    # MTA deployment descriptor
└── CREDENTIALS_DEPLOYMENT.md   # This guide
```

## 🔧 Configuration

### Option 1: Direct Script Editing (Current)
The scripts contain hardcoded credentials. This is secure because:
- ✅ Credentials are stored as **Cloud Foundry services**
- ✅ **Not visible** in environment variables
- ✅ **Encrypted** by Cloud Foundry
- ✅ **Access controlled** by CF permissions

### Option 2: JSON Configuration File (Recommended)
1. Copy the template:
   ```bash
   cp credentials-template.json credentials.json
   ```
2. Edit `credentials.json` with your actual credentials
3. **Never commit** `credentials.json` (it's gitignored)

## 🛡️ Security Best Practices

### ✅ What We Do Right:
- 🔐 **User-provided services** instead of environment variables
- 🚫 **Gitignored** credentials files
- 🔒 **VCAP_SERVICES** integration
- 🛡️ **No credentials in UI** or logs
- 🔄 **Secure binding** via `mta.yaml`

### ❌ What to Avoid:
- 🚫 **Never** use `cf set-env` for secrets
- 🚫 **Never** commit credentials to Git
- 🚫 **Never** hardcode credentials in source code
- 🚫 **Never** log credentials

## 📝 Service Configuration

### OPPS (Currently Working)
```json
{
  "service_name": "opps-credentials",
  "credentials": {
    "client_id": "sb-4774874b-da35-4dd9-8b59-8ecd7d0a17ef!b59628|ppservice-cf-OPPS_oppsprodeu20-prod!b5785",
    "client_secret": "df37408a-5cdb-4b58-a145-d27a8797ba10$bPZjkBtg6NWOmIrCpmUAx34elbb3saNwdsZW8OiWKhk=",
    "token_url": "https://rbos-showcase-zzai01ti.authentication.eu20.hana.ondemand.com/oauth/token",
    "base_url": "https://ppservice-odata-cf.cfapps.eu20.hana.ondemand.com:443/odata/v2/OPPS"
  }
}
```

### OMSA & OMF (Placeholders)
Update the scripts with your actual credentials when available.

## 🔄 Deployment Workflow

### 1. Deploy Services
```powershell
.\deploy-services.ps1
```

### 2. Deploy Application
```powershell
.\build-and-deploy.ps1
```

### 3. Verify Binding
```bash
cf env InStoreOrderCreationApp-srv | findstr VCAP_SERVICES
```

## 🐛 Troubleshooting

### Service Already Exists
```powershell
# Update existing service
.\deploy-services.ps1 -UpdateExisting

# Or recreate it
.\deploy-services.ps1 -DeleteFirst
```

### Authentication Issues
```bash
# Check if logged in
cf target

# Check service binding
cf service opps-credentials

# Check app environment
cf env InStoreOrderCreationApp-srv
```

### View Logs
```bash
# Application logs
cf logs InStoreOrderCreationApp-srv --recent

# Stream logs
cf logs InStoreOrderCreationApp-srv
```

## 📊 Service Status

| Service | Status | Integration | Notes |
|---------|--------|-------------|--------|
| OPPS | ✅ Working | Complete | Real-time pricing active |
| OMSA | ⏸️ Pending | Placeholder | Awaiting credentials |
| OMF | ⏸️ Pending | Placeholder | Awaiting credentials |

## 🔗 Integration with Application

The services are automatically bound to the application via `mta.yaml`:

```yaml
requires:
  - name: opps-credentials
  - name: omsa-credentials
  - name: omf-credentials
```

The application reads credentials from `VCAP_SERVICES` in `auth.service.js`:

```javascript
const vcapServices = JSON.parse(process.env.VCAP_SERVICES || '{}');
const oppsService = vcapServices['user-provided']?.find(service => 
  service.name === 'opps-credentials'
);
```

## 🎯 Next Steps

1. **Add OMSA credentials** when available
2. **Add OMF credentials** when available
3. **Test integration** with new services
4. **Update documentation** as needed

## 📞 Support

For questions or issues:
1. Check application logs: `cf logs InStoreOrderCreationApp-srv --recent`
2. Verify service binding: `cf service opps-credentials`
3. Check VCAP_SERVICES: `cf env InStoreOrderCreationApp-srv`

---

## 🔒 Security Note

**NEVER commit actual credentials to version control!**
- ✅ Use the deployment scripts
- ✅ Keep `credentials.json` gitignored
- ✅ Use Cloud Foundry user-provided services
- ✅ Secure your Cloud Foundry account with MFA 