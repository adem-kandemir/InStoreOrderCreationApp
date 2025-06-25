import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Observable } from 'rxjs';

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
export class NewOrderComponent implements OnInit {
  searchQuery = '';
  searchResults: Product[] = [];
  isSearching = false;
  selectedProduct: Product | null = null;
  cart$: Observable<Cart>;
  
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
    // Initialize with some search results
    this.productService.getAllProducts().subscribe(products => {
      this.searchResults = products;
    });
  }

  onSearch(): void {
    if (this.searchQuery.trim().length < 3) {
      return;
    }
    
    this.isSearching = true;
    this.productService.searchProducts(this.searchQuery).subscribe({
      next: (result: ProductSearchResult) => {
        this.searchResults = result.products;
        this.isSearching = false;
      },
      error: () => {
        this.isSearching = false;
      }
    });
  }

  selectProduct(product: Product): void {
    this.selectedProduct = product;
    // Reset image state when selecting a product
    if (!this.imageLoadedState.has(product.id)) {
      this.imageLoadedState.set(product.id, false);
    }
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
} 