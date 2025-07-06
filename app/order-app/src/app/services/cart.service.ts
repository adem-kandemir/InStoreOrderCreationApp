import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { Cart, CartItem, SourcingResponse } from '../models/cart.interface';
import { Product } from '../models/product.interface';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private apiUrl = environment.apiUrl;
  private cartSubject = new BehaviorSubject<Cart>({
    items: [],
    totalPrice: 0,
    discount: 0,
    finalTotal: 0
  });

  cart$: Observable<Cart> = this.cartSubject.asObservable();
  
  // Sourcing cache
  private sourcingCache: SourcingResponse | null = null;
  private sourcingSubject = new BehaviorSubject<SourcingResponse | null>(null);
  sourcing$: Observable<SourcingResponse | null> = this.sourcingSubject.asObservable();

  constructor(private http: HttpClient) {}

  addToCart(product: Product, quantity: number = 1): void {
    // Prevent adding products without valid prices
    if (product.listPrice === null || product.listPrice === undefined || product.listPrice <= 0) {
      console.warn('Cannot add product to cart: no valid price available', product);
      return;
    }

    const currentCart = this.cartSubject.value;
    const existingItemIndex = currentCart.items.findIndex(item => item.product.id === product.id);

    if (existingItemIndex >= 0) {
      // Update existing item
      currentCart.items[existingItemIndex].quantity += quantity;
      currentCart.items[existingItemIndex].total = 
        currentCart.items[existingItemIndex].quantity * currentCart.items[existingItemIndex].price;
    } else {
      // Add new item
      const newItem: CartItem = {
        product,
        quantity,
        price: product.listPrice,
        total: product.listPrice * quantity
      };
      currentCart.items.push(newItem);
    }

    this.updateCartTotals(currentCart);
  }

  removeFromCart(productId: string): void {
    const currentCart = this.cartSubject.value;
    currentCart.items = currentCart.items.filter(item => item.product.id !== productId);
    this.updateCartTotals(currentCart);
  }

  updateQuantity(productId: string, quantity: number): void {
    const currentCart = this.cartSubject.value;
    const itemIndex = currentCart.items.findIndex(item => item.product.id === productId);
    
    if (itemIndex >= 0) {
      if (quantity <= 0) {
        this.removeFromCart(productId);
      } else {
        currentCart.items[itemIndex].quantity = quantity;
        currentCart.items[itemIndex].total = 
          currentCart.items[itemIndex].price * quantity;
        this.updateCartTotals(currentCart);
      }
    }
  }

  clearCart(): void {
    const emptyCart = {
      items: [],
      totalPrice: 0,
      discount: 0,
      finalTotal: 0
    };
    this.cartSubject.next(emptyCart);
    
    // Clear sourcing cache when cart is cleared
    this.sourcingCache = null;
    this.sourcingSubject.next(null);
    
    // Notify OMSA that cart is empty
    this.triggerSourcingRequest(emptyCart);
  }

  private updateCartTotals(cart: Cart): void {
    cart.totalPrice = cart.items.reduce((sum, item) => sum + item.total, 0);
    cart.discount = 0; // No automatic discount
    cart.finalTotal = cart.totalPrice - cart.discount;
    this.cartSubject.next({ ...cart });
    
    // Trigger sourcing request for the updated cart
    this.triggerSourcingRequest(cart);
  }

  getCartItemCount(): Observable<number> {
    return new BehaviorSubject(
      this.cartSubject.value.items.reduce((count, item) => count + item.quantity, 0)
    ).asObservable();
  }

  getCurrentCart(): Cart {
    return this.cartSubject.value;
  }

  /**
   * Trigger sourcing request for cart changes
   * @param cart Current cart state
   */
  private async triggerSourcingRequest(cart: Cart): Promise<void> {
    try {
      console.log('CartService: Triggering sourcing request for cart changes');
      
      const requestBody = {
        cartItems: cart.items,
        options: {
          countryCode: 'DE' // Default to Germany, could be made configurable
        }
      };

      const response = await this.http.post<any>(`${this.apiUrl}/sourcing/cart`, requestBody).toPromise();
      
      if (response && response.success) {
        // Create sourcing response with both success status and data
        const sourcingResponse: SourcingResponse = {
          success: true,
          data: response.data,
          source: response.source || 'OMSA',
          lastUpdated: response.lastUpdated || new Date().toISOString(),
          error: undefined
        };
        
        this.sourcingCache = sourcingResponse;
        this.sourcingSubject.next(sourcingResponse);
        console.log('CartService: Sourcing request successful', response);
      } else {
        // Handle failed sourcing
        const failedResponse: SourcingResponse = {
          success: false,
          data: null,
          source: response.source || 'Unknown',
          lastUpdated: response.lastUpdated || new Date().toISOString(),
          error: response.error || 'Sourcing request failed'
        };
        
        this.sourcingCache = failedResponse;
        this.sourcingSubject.next(failedResponse);
        console.log('CartService: Sourcing request failed:', response.error);
      }
    } catch (error) {
      console.error('CartService: Error triggering sourcing request:', error);
      
      // Set error state
      const errorResponse: SourcingResponse = {
        success: false,
        data: null,
        source: 'CartService-Error',
        lastUpdated: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      this.sourcingCache = errorResponse;
      this.sourcingSubject.next(errorResponse);
    }
  }

  /**
   * Get current sourcing data
   * @returns Current sourcing response or null
   */
  getCurrentSourcing(): SourcingResponse | null {
    return this.sourcingCache;
  }

  /**
   * Force refresh sourcing data
   */
  async refreshSourcing(): Promise<void> {
    const currentCart = this.getCurrentCart();
    await this.triggerSourcingRequest(currentCart);
  }
} 