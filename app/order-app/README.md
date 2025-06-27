# Order App - Angular Frontend

Modern Angular application for in-store order creation with SAP S/4HANA integration.

## Features

- **Product Search**: Real-time search with debouncing
- **Shopping Cart**: Add/remove products, adjust quantities
- **Multi-language**: German and English support
- **Responsive Design**: Optimized for tablets and mobile devices
- **Settings Management**: Configurable store and language preferences
- **SAP Integration**: Direct connection to S/4HANA product catalog

## Technology Stack

- Angular 17 with standalone components
- TypeScript
- RxJS for reactive programming
- Angular Material for UI components
- Server-Side Rendering (SSR) support

## Project Structure

```
src/
├── app/
│   ├── components/
│   │   ├── new-order/      # Main order creation component
│   │   ├── orders/         # Order history view
│   │   ├── settings/       # Application settings
│   │   └── unauthorized/   # Auth error page
│   ├── services/
│   │   ├── auth.service.ts         # Authentication
│   │   ├── cart.service.ts         # Shopping cart management
│   │   ├── product.service.ts      # Product data access
│   │   ├── settings.service.ts     # Settings persistence
│   │   └── localization.service.ts # Translation management
│   ├── guards/
│   │   └── auth.guard.ts   # Route protection
│   └── models/
│       ├── product.interface.ts
│       └── cart.interface.ts
├── api/                    # Node.js API server
└── assets/
    └── i18n/              # Translation files
```

## Development

### Prerequisites

- Node.js 18+
- Angular CLI: `npm install -g @angular/cli`

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure proxy for API (already configured in `proxy.conf.json`):
   ```json
   {
     "/api": {
       "target": "http://localhost:3000",
       "secure": false
     }
   }
   ```

3. Start the development server:
   ```bash
   npm start
   ```

The app will be available at http://localhost:4200

### Development Commands

- `npm start` - Start dev server with local configuration
- `npm run build` - Build for production
- `npm test` - Run unit tests
- `npm run watch` - Build and watch for changes

## Components

### New Order Component
Main component for creating orders:
- Product search with debouncing (300ms)
- Real-time search results from S/4HANA
- Add to cart functionality
- Displays product details (price, EAN, availability)

### Shopping Cart
- Persistent cart state
- Quantity adjustment
- Total calculation
- Remove items

### Settings
- Store number configuration
- Language selection (DE/EN)
- Settings persistence in localStorage

## Services

### ProductService
- Fetches products from API server
- Search functionality
- Caching and error handling

### CartService
- Cart state management
- Add/remove/update items
- Total calculations
- Cart persistence

### LocalizationService
- Translation management
- Language switching
- Locale persistence

## Internationalization

Translations are stored in `src/assets/i18n/`:
- `de.json` - German translations
- `en.json` - English translations

Add new translations by updating these files.

## Styling

- Global styles in `src/styles.scss`
- Component-specific styles in component files
- CSS custom properties for theming
- Responsive design with CSS Grid and Flexbox

## Building for Production

```bash
npm run build
```

This creates optimized bundles in `dist/order-app/browser/`

### Build Output
- Optimized JavaScript bundles
- Minified CSS
- Compressed assets
- Service worker for offline support

## Configuration

### Environment Files
- `environment.ts` - Default configuration
- `environment.development.ts` - Development settings
- `environment.local.ts` - Local development with API proxy

### Proxy Configuration
The `proxy.conf.json` routes `/api` requests to the local API server during development.

## Best Practices

1. **Lazy Loading**: Components are lazy-loaded for better performance
2. **Standalone Components**: Using Angular's standalone component API
3. **Reactive Forms**: For complex form handling
4. **OnPush Strategy**: For better performance
5. **Type Safety**: Strict TypeScript configuration

## Troubleshooting

### API Connection Issues
- Ensure API server is running on port 3000
- Check proxy configuration
- Verify CORS settings

### Translation Not Working
- Check language files in `assets/i18n/`
- Verify LocalizationService is initialized
- Check browser console for errors

### Build Errors
- Clear node_modules and reinstall
- Check TypeScript version compatibility
- Ensure all imports are correct

## Testing

### Unit Tests
```bash
npm test
```

### E2E Tests
```bash
npm run e2e
```

## Deployment

The built application is served through the SAP BTP app router. Build files should be copied to `app/router/resources/browser/`.

## Contributing

1. Follow Angular style guide
2. Write unit tests for new features
3. Update translations for new UI elements
4. Test on multiple devices/browsers
