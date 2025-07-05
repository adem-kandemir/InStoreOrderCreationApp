import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService } from '../../../services/product.service';
import { ImageService } from '../../../services/image.service';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { Product } from '../../../models/product.interface';

@Component({
  selector: 'app-product-details',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './product-details.component.html',
  styleUrls: ['./product-details.component.scss']
})
export class ProductDetailsComponent {
  @Input() selectedProduct: Product | null = null;
  @Input() isRefreshingPrices = false;
  
  @Output() refreshPricesRequested = new EventEmitter<void>();
  @Output() addToCartRequested = new EventEmitter<Product>();
  
  // Track image loading state for each product
  private imageLoadedState = new Map<string, boolean>();

  constructor(
    private productService: ProductService,
    private imageService: ImageService
  ) {}

  onRefreshPrices(): void {
    this.refreshPricesRequested.emit();
  }

  onAddToCart(product: Product): void {
    this.addToCartRequested.emit(product);
  }

  getProductImageUrl(productId: string): string {
    return this.imageService.getProductImageUrl(productId);
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
} 