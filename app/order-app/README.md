# In-Store Order Creation App

A comprehensive Angular application for creating and managing in-store orders, built with Angular 17 and TypeScript.

## Features

### 🛍️ Order Creation Flow
- **Product Search**: Search products by description, ID, or EAN number
- **Product Details**: View detailed product information including stock levels
- **Shopping Cart**: Add products to cart with quantity management
- **Customer Information**: Capture customer details and shipping address
- **Payment Options**: Select payment method (Prepayment supported)
- **Order Confirmation**: Success/error handling with confirmation numbers

### 📋 Order Management
- **Order History**: View all previous orders
- **Order Status**: Track order status (Pending, Confirmed, Processing, Shipped, Delivered, Cancelled)
- **Order Details**: View complete order information including items and pricing

### 🎨 User Interface
- **Modern Design**: Clean, responsive interface matching the provided mockups
- **Intuitive Navigation**: Easy switching between New Order and Orders views
- **Real-time Updates**: Cart updates and search results in real-time
- **Mobile Responsive**: Works on desktop and mobile devices

## Technical Stack

- **Framework**: Angular 17
- **Language**: TypeScript
- **Styling**: SCSS with custom design system
- **State Management**: RxJS Observables with BehaviorSubject
- **Forms**: Reactive Forms with validation
- **Routing**: Angular Router with lazy loading
- **Build Tool**: Angular CLI

## Project Structure

```
src/
├── app/
│   ├── components/
│   │   ├── new-order/          # Main order creation component
│   │   └── orders/             # Order history component
│   ├── models/
│   │   ├── product.interface.ts # Product data models
│   │   └── cart.interface.ts   # Cart and order models
│   ├── services/
│   │   ├── product.service.ts  # Product data service
│   │   └── cart.service.ts     # Cart management service
│   ├── app.component.*         # Root component with navigation
│   └── app.routes.ts          # Application routing
├── assets/                    # Static assets
└── styles.scss               # Global styles
```

## Getting Started

### Prerequisites
- Node.js 18.x or higher
- npm 9.x or higher

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd InStoreOrderCreationApp/app/order-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm start
   ```

4. **Open your browser**
   Navigate to `http://localhost:4200`

### Available Scripts

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run unit tests
- `npm run watch` - Build in watch mode

## Application Flow

### 1. Product Search
- Users can search for products using the search bar
- Results are displayed in a table format
- Click on a product to view details

### 2. Product Selection
- View product details including price and stock levels
- Add products to cart with "zum Warenkorb hinzufügen" button
- Stock information shows both in-store and online availability

### 3. Cart Management
- View all items in the cart
- Adjust quantities using +/- buttons
- Remove items with the delete button
- View pricing breakdown with discounts

### 4. Customer Details
- Fill in personal information (name, email, phone)
- Enter shipping address
- Select shipping option (Standard or Express)

### 5. Payment & Confirmation
- Select payment method
- Review order summary
- Place order and receive confirmation

### 6. Order History
- View all previous orders
- See order status and details
- Access order actions (view details, download invoice, cancel)

## Features Implementation

### State Management
- **Cart Service**: Manages cart state using BehaviorSubject
- **Product Service**: Handles product search and data retrieval
- **Reactive Updates**: Real-time cart updates across components

### Form Validation
- **Customer Form**: Required field validation for contact and address
- **Email Validation**: Proper email format checking
- **Conditional Validation**: Smart form validation based on user input

### Responsive Design
- **Mobile-First**: Designed to work on all screen sizes
- **Grid Layouts**: CSS Grid for flexible layouts
- **Touch-Friendly**: Large buttons and touch targets

### Error Handling
- **Order Processing**: Simulated success/failure scenarios
- **Form Validation**: Clear error messages and visual feedback
- **Loading States**: Loading indicators for better UX

## Mock Data

The application includes mock data for demonstration:
- **Products**: Sample RBO NRG Cup2Go products with variations
- **Stock Levels**: Simulated in-store and online stock
- **Order History**: Sample completed orders

## Customization

### Adding New Products
Update the `mockProducts` array in `product.service.ts`:

```typescript
{
  id: 'NEW_ID',
  ean: 'NEW_EAN',
  description: 'Product Name',
  listPrice: 29.99,
  unit: 'ST',
  inStoreStock: 15,
  onlineStock: 50,
  isAvailable: true
}
```

### Styling Customization
- Global styles: `src/styles.scss`
- Component styles: Individual `.scss` files
- Color scheme: Update CSS custom properties

### Adding New Features
1. Create new components in `src/app/components/`
2. Add routes in `app.routes.ts`
3. Update navigation in `app.component.html`

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For questions or issues, please contact the development team or create an issue in the repository.
