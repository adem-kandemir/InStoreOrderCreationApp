# Environment Configuration

This application supports multiple environment configurations to control development vs production behavior.

## Environment Files

### `environment.ts` (Production - Default)
- **Production**: `true`
- **Development Mode**: `false`
- **Mock Authentication**: `false`
- Used for BTP Cloud Foundry deployments

### `environment.development.ts` (Development)
- **Production**: `false`
- **Development Mode**: `true`
- **Mock Authentication**: `true`
- Used for standard development builds

### `environment.local.ts` (Local Development)
- **Production**: `false`
- **Development Mode**: `true`
- **Mock Authentication**: `true`
- **Debug Mode**: `true`
- **Skip Authentication**: `true`
- Used for local development with full debugging

## Available Scripts

```bash
# Local development (default) - uses environment.local.ts
npm start

# Development build - uses environment.development.ts
npm run start:dev

# Production build - uses environment.ts
npm run start:prod

# Build commands
npm run build:local    # Local development build
npm run build:dev      # Development build
npm run build:prod     # Production build (used for BTP deployment)
```

## Authentication Behavior

### Local Development (`environment.local.ts`)
- Authentication is completely bypassed
- Mock user with all permissions is automatically logged in
- Console shows: "🔓 Development mode - Authentication disabled"

### Production (`environment.ts`)
- Full XSUAA authentication is enabled
- Users must authenticate through SAP BTP
- Role-based access control is enforced

## BTP Deployment

When deploying to SAP BTP Cloud Foundry:
1. The `build:prod` script is used automatically
2. `environment.ts` is loaded (production configuration)
3. Authentication is enabled and required
4. All debugging features are disabled

## Local Development Setup

For local development with mock authentication:

```bash
npm start
```

This will:
- Use `environment.local.ts`
- Enable development mode
- Skip authentication
- Provide mock user with all permissions
- Enable debugging features 