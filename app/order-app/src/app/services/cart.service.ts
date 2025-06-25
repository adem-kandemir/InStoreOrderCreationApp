import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Cart, CartItem } from '../models/cart.interface';
import { Product } from '../models/product.interface';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private cartSubject = new BehaviorSubject<Cart>({
    items: [],
    totalPrice: 0,
    discount: 0,
    finalTotal: 0
  });

  cart$: Observable<Cart> = this.cartSubject.asObservable();

  addToCart(product: Product, quantity: number = 1): void {
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
    this.cartSubject.next({
      items: [],
      totalPrice: 0,
      discount: 0,
      finalTotal: 0
    });
  }

  private updateCartTotals(cart: Cart): void {
    cart.totalPrice = cart.items.reduce((sum, item) => sum + item.total, 0);
    cart.discount = cart.totalPrice * 0.088; // 8.8% discount as shown in mockup
    cart.finalTotal = cart.totalPrice - cart.discount;
    this.cartSubject.next({ ...cart });
  }

  getCartItemCount(): Observable<number> {
    return new BehaviorSubject(
      this.cartSubject.value.items.reduce((count, item) => count + item.quantity, 0)
    ).asObservable();
  }

  getCurrentCart(): Cart {
    return this.cartSubject.value;
  }
} 