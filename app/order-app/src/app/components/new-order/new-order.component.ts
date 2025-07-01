import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Observable, Subject, debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs';

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
  
  // Barcode scanner properties
  isScanningBarcode = false;
  scannerError: string | null = null;
  private videoStream: MediaStream | null = null;

  constructor(
    private productService: ProductService,
    private cartService: CartService,
    private localizationService: LocalizationService,
    private fb: FormBuilder
  ) {
    this.cart$ = this.cartService.cart$;
    
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

  placeOrder(): void {
    if (!this.customerForm.valid) {
      return;
    }

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

    const order: Order = {
      items: cart.items,
      customer: customerDetails,
      shipping: this.selectedShipping,
      payment: this.selectedPayment,
      totalPrice: cart.totalPrice,
      discount: cart.discount,
      shippingCost: this.selectedShipping.price,
      finalTotal: cart.finalTotal + this.selectedShipping.price,
      status: 'pending',
      createdAt: new Date()
    };

    // Simulate order processing
    setTimeout(() => {
      const success = Math.random() > 0.2; // 80% success rate
      if (success) {
        this.orderConfirmation = '1234568';
        this.currentStep = 'success';
        this.cartService.clearCart();
      } else {
        this.orderError = true;
        this.currentStep = 'error';
      }
    }, 2000);
  }

  startNewOrder(): void {
    this.currentStep = 'search';
    this.searchQuery = '';
    this.selectedProduct = null;
    this.orderConfirmation = null;
    this.orderError = false;
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

      // Check if camera is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported by this browser');
      }

      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera if available
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      this.videoStream = stream;

      // Wait for the DOM to be ready and then start the camera
      setTimeout(() => {
        this.setupCameraStream();
      }, 100);

    } catch (error) {
      console.error('Error starting barcode scanner:', error);
      this.scannerError = 'Unable to access camera. Please ensure camera permissions are granted.';
    }
  }

  private setupCameraStream(): void {
    const videoElement = document.getElementById('barcode-scanner') as HTMLDivElement;
    
    if (!videoElement || !this.videoStream) {
      this.scannerError = 'Unable to initialize camera';
      return;
    }

    // Create video element
    const video = document.createElement('video');
    video.srcObject = this.videoStream;
    video.autoplay = true;
    video.playsInline = true;
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'cover';

    // Clear any existing content and add video
    videoElement.innerHTML = '';
    videoElement.appendChild(video);

    // Start the barcode detection simulation
    this.startBarcodeDetection();
  }

  private startBarcodeDetection(): void {
    // This is a simplified implementation
    // In a real-world scenario, you would use a barcode scanning library like:
    // - html5-qrcode
    // - ZXing-js
    // - QuaggaJS
    
    // For now, we'll simulate barcode detection by listening for keyboard input
    // This allows testing without a real barcode scanning library
    
    const handleKeyPress = (event: KeyboardEvent) => {
      if (this.isScanningBarcode && event.key === 'Enter') {
        // Simulate scanning one of our test EAN codes
        const testEAN = '9999999999987'; // RBO pen EAN
        this.processBarcodeResult(testEAN);
      }
    };

    document.addEventListener('keypress', handleKeyPress);

    // Cleanup function
    const cleanup = () => {
      document.removeEventListener('keypress', handleKeyPress);
    };

    // Store cleanup function for later use
    (this as any).barcodeCleanup = cleanup;

    // Show instructions for testing
    setTimeout(() => {
      if (this.isScanningBarcode) {
        this.scannerError = null;
        console.log('Barcode scanner active. Press Enter to simulate scanning EAN: 9999999999987');
      }
    }, 1000);
  }

  private async processBarcodeResult(ean: string): Promise<void> {
    try {
      console.log('Scanned EAN:', ean);
      
      // Search for product by EAN using the new API endpoint
      const product = await this.productService.searchProductByEAN(ean);
      
      if (product) {
        // Stop scanning and select the found product
        this.stopBarcodeScanning();
        this.selectedProduct = product;
        
        // Optionally auto-add to cart
        // this.addToCart(product);
        
        console.log('Product found:', product.description);
      } else {
        this.scannerError = `No product found for EAN: ${ean}`;
      }
    } catch (error) {
      console.error('Error processing barcode result:', error);
      this.scannerError = 'Error searching for product. Please try again.';
    }
  }

  stopBarcodeScanning(): void {
    this.isScanningBarcode = false;
    this.scannerError = null;

    // Stop video stream
    if (this.videoStream) {
      this.videoStream.getTracks().forEach(track => track.stop());
      this.videoStream = null;
    }

    // Clean up barcode detection listeners
    if ((this as any).barcodeCleanup) {
      (this as any).barcodeCleanup();
      (this as any).barcodeCleanup = null;
    }

    // Clear video element
    const videoElement = document.getElementById('barcode-scanner');
    if (videoElement) {
      videoElement.innerHTML = '';
    }
  }
} 