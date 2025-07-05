import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

import { ProductService } from '../../services/product.service';
import { CartService } from '../../services/cart.service';
import { LocalizationService } from '../../services/localization.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { Product, ProductSearchResult } from '../../models/product.interface';
import { Cart, CartItem, CustomerDetails, ShippingOption, PaymentOption, Order } from '../../models/cart.interface';
import { ProductSearchComponent } from './product-search/product-search.component';
import { ProductDetailsComponent } from './product-details/product-details.component';
import { CartComponent } from './cart/cart.component';
import { CustomerDetailsComponent } from './customer-details/customer-details.component';
import { PaymentComponent } from './payment/payment.component';

@Component({
  selector: 'app-new-order',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslatePipe, ProductSearchComponent, ProductDetailsComponent, CartComponent, CustomerDetailsComponent, PaymentComponent],
  templateUrl: './new-order.component.html',
  styleUrls: ['./new-order.component.scss']
})
export class NewOrderComponent implements OnInit, OnDestroy {
  // Product search and details properties
  searchQuery = '';
  searchResults: Product[] = [];
  isSearching = false;
  isRefreshingPrices = false;
  selectedProduct: Product | null = null;
  searchError: boolean = false;
  searchErrorType: string | null = null;
  searchErrorMessage: string | null = null;
  
  cart$: Observable<Cart>;
  sourcing$: Observable<any>;
  
  currentStep: 'search' | 'cart' | 'customer' | 'payment' | 'success' | 'error' = 'search';
  
  customerForm: FormGroup;
  shippingOptions: ShippingOption[] = [
    { id: 'standard', name: 'Standard Shipping', price: 4.99, estimatedDays: 5 },
    { id: 'express', name: 'Express Shipping', price: 7.99, estimatedDays: 2 }
  ];
  
  paymentOptions: PaymentOption[] = [
    { id: 'prepayment', name: 'Prepayment', description: 'Please transfer confirmation number to the cashier and pay with the available payment options.' }
  ];
  
  selectedShipping: ShippingOption = this.shippingOptions[0];
  selectedPayment: PaymentOption = this.paymentOptions[0];
  isProcessingOrder: boolean = false;
  
  orderConfirmation: string | null = null;
  orderError = false;
  orderErrorMessage: string | null = null;
  orderErrorDetails: string | null = null;

  constructor(
    private productService: ProductService,
    private cartService: CartService,
    private localizationService: LocalizationService,
    private fb: FormBuilder,
    private http: HttpClient
  ) {
    this.cart$ = this.cartService.cart$;
    this.sourcing$ = this.cartService.sourcing$;
    
    this.customerForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      addressLine1: ['', Validators.required],
      addressLine2: [''],
      zipCode: ['', Validators.required],
      city: ['', Validators.required],
      country: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    // Component initialization
  }

  ngOnDestroy(): void {
    // Component cleanup
  }

  // Search methods moved to ProductSearchComponent

  // Product search event handlers
  onSearchQueryChange(query: string): void {
    this.searchQuery = query;
  }

  onSearchResultsChange(results: Product[]): void {
    this.searchResults = results;
  }

  onIsSearchingChange(isSearching: boolean): void {
    this.isSearching = isSearching;
  }

  onSearchErrorChange(error: boolean): void {
    this.searchError = error;
  }

  onSearchErrorTypeChange(errorType: string | null): void {
    this.searchErrorType = errorType;
  }

  onSearchErrorMessageChange(errorMessage: string | null): void {
    this.searchErrorMessage = errorMessage;
  }

  onProductSelected(product: Product): void {
    this.selectedProduct = product;
  }

  onRetrySearchRequested(): void {
    // The ProductSearchComponent will handle the retry logic
  }

  // Product details event handlers
  onRefreshPricesRequested(): void {
    this.isRefreshingPrices = true;
    // The ProductDetailsComponent will handle the refresh logic
  }

  onAddToCartRequested(product: Product): void {
    this.addToCart(product);
  }

  addToCart(product: Product): void {
    this.cartService.addToCart(product, 1);
  }

  // Cart event handlers
  onQuantityUpdated(event: {productId: string, quantity: number}): void {
    this.cartService.updateQuantity(event.productId, event.quantity);
  }

  onItemRemoved(productId: string): void {
    this.cartService.removeFromCart(productId);
  }

  onCartEmptied(): void {
    this.cartService.clearCart();
  }

  onProceedToCustomerRequested(): void {
    this.proceedToCustomerDetails();
  }

  onCartImageError(event: Event): void {
    this.onImageErrorFallback(event);
  }

  // Customer details event handlers
  onBackToCartRequested(): void {
    this.goBackToCart();
  }

  onProceedToPaymentRequested(event: {customerData: CustomerDetails, selectedShipping: ShippingOption}): void {
    // Update the selected shipping option
    this.selectedShipping = event.selectedShipping;
    
    // Update the form with customer data (for legacy compatibility)
    this.customerForm.patchValue({
      firstName: event.customerData.firstName,
      lastName: event.customerData.lastName,
      email: event.customerData.email,
      phone: event.customerData.phone,
      addressLine1: event.customerData.address.line1,
      addressLine2: event.customerData.address.line2,
      zipCode: event.customerData.address.zipCode,
      city: event.customerData.address.city,
      country: event.customerData.address.country
    });
    
    this.proceedToPayment();
  }

  onShippingOptionChanged(option: ShippingOption): void {
    this.selectedShipping = option;
  }

  // Payment event handlers
  onBackToCustomerRequested(): void {
    this.goBackToCustomer();
  }

  onCancelOrderRequested(): void {
    this.goBackToCart();
  }

  onPlaceOrderRequested(paymentOption: PaymentOption): void {
    this.selectedPayment = paymentOption;
    this.placeOrder();
  }

  onPaymentOptionChanged(option: PaymentOption): void {
    this.selectedPayment = option;
  }

  // Get customer data for the component
  getInitialCustomerData(): CustomerDetails | undefined {
    if (!this.customerForm.value.firstName) {
      return undefined;
    }

    return {
      firstName: this.customerForm.value.firstName,
      lastName: this.customerForm.value.lastName,
      email: this.customerForm.value.email,
      phone: this.customerForm.value.phone,
      address: {
        line1: this.customerForm.value.addressLine1,
        line2: this.customerForm.value.addressLine2,
        zipCode: this.customerForm.value.zipCode,
        city: this.customerForm.value.city,
        country: this.customerForm.value.country
      }
    };
  }

  // Legacy methods for backward compatibility
  removeFromCart(productId: string): void {
    this.cartService.removeFromCart(productId);
  }

  updateQuantity(productId: string, quantity: number): void {
    this.cartService.updateQuantity(productId, quantity);
  }

  proceedToCustomerDetails(): void {
    this.currentStep = 'customer';
    // Scroll to the customer section
    setTimeout(() => {
      const customerSection = document.querySelector('.customer-section');
      if (customerSection) {
        customerSection.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  }

  proceedToPayment(): void {
    if (this.customerForm.valid) {
      this.currentStep = 'payment';
      // Scroll to the payment section
      setTimeout(() => {
        const paymentSection = document.querySelector('.payment-section');
        if (paymentSection) {
          paymentSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  }

  goBackToCart(): void {
    this.currentStep = 'search';
    // Scroll back to top
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  }

  goBackToCustomer(): void {
    this.currentStep = 'customer';
    // Scroll to the customer section
    setTimeout(() => {
      const customerSection = document.querySelector('.customer-section');
      if (customerSection) {
        customerSection.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  }

  async placeOrder(): Promise<void> {
    if (!this.customerForm.valid) {
      return;
    }

    this.isProcessingOrder = true;

    try {
      console.log('Placing order with OMF...');
      
      const cart = this.cartService.getCurrentCart();
      const customerDetails: CustomerDetails = {
        firstName: this.customerForm.value.firstName,
        lastName: this.customerForm.value.lastName,
        email: this.customerForm.value.email,
        phone: this.customerForm.value.phone,
        address: {
          line1: this.customerForm.value.addressLine1,
          line2: this.customerForm.value.addressLine2,
          zipCode: this.customerForm.value.zipCode,
          city: this.customerForm.value.city,
          country: this.customerForm.value.country
        }
      };

      // Build complete order data for OMF API
      const orderData = {
        items: cart.items,
        customer: customerDetails,
        shipping: this.selectedShipping,
        payment: this.selectedPayment,
        totalPrice: cart.totalPrice,
        discount: cart.discount,
        finalTotal: cart.finalTotal + this.selectedShipping.price,
        
        // Additional metadata
        channel: 'IN_STORE',
        orderType: 'SALES_ORDER',
        currency: 'EUR',
        createdAt: new Date().toISOString()
      };

      console.log('Order data being sent:', orderData);

      // Call the backend API to create the order
      const response = await this.http.post<any>(`${environment.apiUrl}/orders`, orderData).toPromise();
      
      console.log('Order creation response:', response);

      if (response && response.success) {
        // Order created successfully
        this.orderConfirmation = response.order.externalNumber || response.order.orderNumber || response.order.orderId;
        this.currentStep = 'success';
        this.cartService.clearCart();
        
        console.log('Order created successfully with confirmation:', this.orderConfirmation);
      } else {
        // Order creation failed - server returned error response
        console.error('Order creation failed:', response);
        this.orderError = true;
        this.orderErrorMessage = response.message || response.error || 'Order creation failed';
        this.orderErrorDetails = response.details ? JSON.stringify(response.details, null, 2) : null;
        this.currentStep = 'error';
      }

    } catch (error: any) {
      console.error('Error placing order:', error);
      this.orderError = true;
      
      // Handle HTTP error responses
      if (error.error && error.error.message) {
        this.orderErrorMessage = error.error.message;
        this.orderErrorDetails = error.error.details ? JSON.stringify(error.error.details, null, 2) : null;
      } else if (error.message) {
        this.orderErrorMessage = error.message;
        this.orderErrorDetails = null;
      } else {
        this.orderErrorMessage = 'An unexpected error occurred while placing the order';
        this.orderErrorDetails = null;
      }
      
      this.currentStep = 'error';
    } finally {
      this.isProcessingOrder = false;
    }
  }

  startNewOrder(): void {
    this.currentStep = 'search';
    this.searchQuery = '';
    this.selectedProduct = null;
    this.orderConfirmation = null;
    this.orderError = false;
    this.orderErrorMessage = null;
    this.orderErrorDetails = null;
    this.isProcessingOrder = false;
    this.customerForm.reset();
  }

  emptyCart(): void {
    this.cartService.clearCart();
  }

  // Image handling methods moved to individual components
  getProductImageUrl(productId: string): string {
    return `assets/images/products/${productId}.jpg`;
  }

  onImageErrorFallback(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3QgeD0iMyIgeT0iMyIgd2lkdGg9IjE4IiBoZWlnaHQ9IjE4IiByeD0iMiIgc3Ryb2tlPSIjY2NjIiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9IiNmNWY1ZjUiLz4KPGNpcmNsZSBjeD0iOC41IiBjeT0iOC41IiByPSIxLjUiIGZpbGw9IiNjY2MiLz4KPHBhdGggZD0iTTIxIDE1bC01LTVMNSAyMSIgc3Ryb2tlPSIjY2NjIiBzdHJva2Utd2lkdGg9IjIiLz4KPC9zdmc+';
    }
  }
} 