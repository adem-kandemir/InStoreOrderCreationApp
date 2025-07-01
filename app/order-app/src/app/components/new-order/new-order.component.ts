import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';

import { ProductService } from '../../services/product.service';
import { CartService } from '../../services/cart.service';
import { LocalizationService } from '../../services/localization.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { Product, ProductSearchResult } from '../../models/product.interface';
import { Cart, CartItem, CustomerDetails, ShippingOption, PaymentOption, Order } from '../../models/cart.interface';

@Component({
  selector: 'app-new-order',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './new-order.component.html',
  styleUrls: ['./new-order.component.scss']
})
export class NewOrderComponent implements OnInit, OnDestroy {
  searchQuery = '';
  searchResults: Product[] = [];
  isSearching = false;
  isRefreshingPrices = false;
  selectedProduct: Product | null = null;
  cart$: Observable<Cart>;
  sourcing$: Observable<any>;
  
  // Search subject for debouncing
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();
  
  // Track image loading state for each product
  private imageLoadedState = new Map<string, boolean>();
  
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
  
  orderConfirmation: string | null = null;
  orderError = false;
  orderErrorMessage: string | null = null;
  orderErrorDetails: string | null = null;
  
  // Barcode scanner properties
  isScanningBarcode = false;
  scannerError: string | null = null;
  private html5QrCode: Html5Qrcode | null = null;

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
    // Set up search with debouncing
    this.searchSubject.pipe(
      debounceTime(300), // Wait 300ms after user stops typing
      distinctUntilChanged(), // Only search if the value changed
      switchMap(query => {
        if (query.trim().length === 0) {
          // Clear results if search is empty
          this.searchResults = [];
          this.isSearching = false;
          return [];
        }
        
        this.isSearching = true;
        return this.productService.searchProducts(query);
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (result: ProductSearchResult) => {
        this.searchResults = result.products;
        this.isSearching = false;
      },
      error: () => {
        this.isSearching = false;
        this.searchResults = [];
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    // Clean up barcode scanner
    if (this.html5QrCode) {
      this.stopBarcodeScanning();
    }
  }

  onSearchInput(): void {
    this.searchSubject.next(this.searchQuery);
  }

  onSearch(): void {
    // This is now called when Enter is pressed
    if (this.searchQuery.trim().length > 0) {
      this.searchSubject.next(this.searchQuery);
    }
  }

  refreshPrices(): void {
    if (this.isRefreshingPrices) return;
    
    this.isRefreshingPrices = true;
    
    // If we have a selected product, refresh it with full details (including OMSA data)
    if (this.selectedProduct) {
      this.productService.getProductById(this.selectedProduct.id, { refresh: true }).subscribe({
        next: (freshProduct) => {
          if (freshProduct && this.selectedProduct?.id === freshProduct.id) {
            // Update the selected product with fresh data including OMSA availability
            this.selectedProduct = freshProduct;
            
            // Also update the product in search results if it exists there
            const searchIndex = this.searchResults.findIndex(p => p.id === freshProduct.id);
            if (searchIndex !== -1) {
              this.searchResults[searchIndex] = { ...this.searchResults[searchIndex], ...freshProduct };
            }
          }
          this.isRefreshingPrices = false;
        },
        error: () => {
          this.isRefreshingPrices = false;
        }
      });
    } else {
      // If no selected product, refresh the search results
      const currentQuery = this.searchQuery.trim();
      
      if (currentQuery.length > 0) {
        // Refresh the current search results
        this.productService.searchProducts(currentQuery, { refresh: true }).subscribe({
          next: (result: ProductSearchResult) => {
            this.searchResults = result.products;
            this.isRefreshingPrices = false;
          },
          error: () => {
            this.isRefreshingPrices = false;
          }
        });
      } else {
        // If no search query, refresh all products
        this.productService.searchProducts('', { refresh: true }).subscribe({
          next: (result: ProductSearchResult) => {
            this.searchResults = result.products;
            this.isRefreshingPrices = false;
          },
          error: () => {
            this.isRefreshingPrices = false;
          }
        });
      }
    }
  }

  selectProduct(product: Product): void {
    this.selectedProduct = product;
    // Reset image state when selecting a product
    if (!this.imageLoadedState.has(product.id)) {
      this.imageLoadedState.set(product.id, false);
    }
    
    // Fetch fresh pricing for the selected product
    this.productService.getProductById(product.id, { refresh: true }).subscribe({
      next: (freshProduct) => {
        if (freshProduct && this.selectedProduct?.id === product.id) {
          // Update the selected product with fresh pricing
          this.selectedProduct = { ...this.selectedProduct, ...freshProduct };
        }
      },
      error: (error) => {
        console.log('Could not fetch fresh pricing for product:', error);
        // Keep the existing product data on error
      }
    });
  }

  addToCart(product: Product): void {
    this.cartService.addToCart(product, 1);
  }

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
    this.customerForm.reset();
  }

  emptyCart(): void {
    this.cartService.clearCart();
  }

  getProductImageUrl(productId: string): string {
    return `assets/images/products/${productId}.jpg`;
  }

  isImageLoaded(productId: string): boolean {
    return this.imageLoadedState.get(productId) || false;
  }

  onProductImageLoad(productId: string): void {
    this.imageLoadedState.set(productId, true);
  }

  onProductImageError(productId: string): void {
    this.imageLoadedState.set(productId, false);
  }

  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target && target.nextElementSibling) {
      target.style.display = 'none';
      (target.nextElementSibling as HTMLElement).style.display = 'flex';
    }
  }

  onImageErrorFallback(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3QgeD0iMyIgeT0iMyIgd2lkdGg9IjE4IiBoZWlnaHQ9IjE4IiByeD0iMiIgc3Ryb2tlPSIjY2NjIiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9IiNmNWY1ZjUiLz4KPGNpcmNsZSBjeD0iOC41IiBjeT0iOC41IiByPSIxLjUiIGZpbGw9IiNjY2MiLz4KPHBhdGggZD0iTTIxIDE1bC01LTVMNSAyMSIgc3Ryb2tlPSIjY2NjIiBzdHJva2Utd2lkdGg9IjIiLz4KPC9zdmc+';
    }
  }

  // Barcode scanning methods
  async startBarcodeScanning(): Promise<void> {
    try {
      this.isScanningBarcode = true;
      this.scannerError = null;

      // Wait for Angular to render the DOM element
      await new Promise(resolve => setTimeout(resolve, 100));

      // Initialize Html5Qrcode
      this.html5QrCode = new Html5Qrcode("barcode-scanner");

      // Configuration for barcode scanning
      const config = {
        fps: 10,    // Optional frame per seconds for qr code scanning
        qrbox: { width: 250, height: 250 }  // Optional if you want bounded box UI
      };

      // Start scanning
      await this.html5QrCode.start(
        { facingMode: "environment" }, // Use back camera
        config,
        (decodedText, decodedResult) => {
          // Handle successful scan
          console.log(`Barcode scanned: ${decodedText}`);
          this.processBarcodeResult(decodedText);
        },
        (errorMessage) => {
          // Handle scan errors (most are not critical)
          // Uncomment to see detailed scan errors
          // console.log(`Scan error: ${errorMessage}`);
        }
      );

      console.log('Barcode scanner started successfully');

    } catch (error) {
      console.error('Error starting barcode scanner:', error);
      this.scannerError = 'Unable to access camera. Please ensure camera permissions are granted.';
      this.isScanningBarcode = false;
    }
  }

  private async processBarcodeResult(ean: string): Promise<void> {
    try {
      console.log('Scanned EAN:', ean);
      
      // Stop scanning immediately to prevent endless loop
      await this.stopBarcodeScanning();
      
      // Search for product by EAN using the new API endpoint
      const product = await this.productService.searchProductByEAN(ean);
      
      if (product) {
        // Select the found product and fetch real-time data (same as manual selection)
        this.selectProduct(product);
        
        // Optionally auto-add to cart
        // this.addToCart(product);
        
        console.log('Product found via barcode scan:', product.description);
      } else {
        // Show error but scanner is already stopped
        this.scannerError = `No product found for EAN: ${ean}. Try scanning again or search manually.`;
      }
    } catch (error) {
      console.error('Error processing barcode result:', error);
      // Make sure scanner is stopped even on error
      if (this.isScanningBarcode) {
        await this.stopBarcodeScanning();
      }
      this.scannerError = 'Error searching for product. Please try scanning again.';
    }
  }

  async stopBarcodeScanning(): Promise<void> {
    this.isScanningBarcode = false;
    this.scannerError = null;

    // Stop Html5Qrcode scanner
    if (this.html5QrCode) {
      try {
        const scannerState = this.html5QrCode.getState();
        if (scannerState === Html5QrcodeScannerState.SCANNING) {
          await this.html5QrCode.stop();
        }
      } catch (error) {
        console.log('Error stopping scanner:', error);
      }
      
      // Clear the scanner
      try {
        await this.html5QrCode.clear();
      } catch (error) {
        console.log('Error clearing scanner:', error);
      }
      
      this.html5QrCode = null;
    }
  }
} 