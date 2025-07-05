import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';

import { TranslatePipe } from '../../../pipes/translate.pipe';
import { Cart } from '../../../models/cart.interface';
import { Product } from '../../../models/product.interface';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.scss']
})
export class CartComponent {
  @Input() cart$!: Observable<Cart>;
  @Input() sourcing$!: Observable<any>;
  
  @Output() quantityUpdated = new EventEmitter<{productId: string, quantity: number}>();
  @Output() itemRemoved = new EventEmitter<string>();
  @Output() cartEmptied = new EventEmitter<void>();
  @Output() proceedToCustomerRequested = new EventEmitter<void>();
  @Output() imageError = new EventEmitter<Event>();

  onUpdateQuantity(productId: string, quantity: number): void {
    this.quantityUpdated.emit({ productId, quantity });
  }

  onRemoveItem(productId: string): void {
    this.itemRemoved.emit(productId);
  }

  onEmptyCart(): void {
    this.cartEmptied.emit();
  }

  onProceedToCustomer(): void {
    this.proceedToCustomerRequested.emit();
  }

  onImageError(event: Event): void {
    this.imageError.emit(event);
  }

  getProductImageUrl(productId: string): string {
    return `assets/images/products/${productId}.jpg`;
  }
} 