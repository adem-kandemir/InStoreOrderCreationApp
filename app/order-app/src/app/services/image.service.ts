import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ImageService {
  private readonly imageBasePath = 'assets/images/products/';
  private readonly supportedFormats = ['jpg', 'png'];

  constructor() {}

  /**
   * Get the product image URL for a given product ID
   * Tries multiple formats and returns the first available one
   */
  getProductImageUrl(productId: string): string {
    // Try JPG first, then PNG
    return `${this.imageBasePath}${productId}.jpg`;
  }

  /**
   * Get all possible image URLs for a product ID
   */
  getProductImageUrls(productId: string): string[] {
    return this.supportedFormats.map(format => 
      `${this.imageBasePath}${productId}.${format}`
    );
  }

  /**
   * Check if an image exists (for future use with HTTP requests)
   */
  async imageExists(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
  }

  /**
   * Get the best available image URL for a product
   */
  async getBestProductImage(productId: string): Promise<string | null> {
    const urls = this.getProductImageUrls(productId);
    
    for (const url of urls) {
      if (await this.imageExists(url)) {
        return url;
      }
    }
    
    return null; // No image found
  }

  /**
   * Get placeholder image as data URL
   */
  getPlaceholderImage(): string {
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB4PSIzIiB5PSIzIiB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHJ4PSIyIiBzdHJva2U9IiNjY2MiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0iI2Y1ZjVmNSIvPgo8Y2lyY2xlIGN4PSI4LjUiIGN5PSI4LjUiIHI9IjEuNSIgZmlsbD0iI2NjYyIvPgo8cGF0aCBkPSJNMjEgMTVsLTUtNUw1IDIxIiBzdHJva2U9IiNjY2MiIHN0cm9rZS13aWR0aD0iMiIvPgo8L3N2Zz4K';
  }
} 