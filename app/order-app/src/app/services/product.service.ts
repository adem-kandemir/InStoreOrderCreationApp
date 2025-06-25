import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { Product, ProductSearchResult } from '../models/product.interface';
import { ImageService } from './image.service';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  constructor(private imageService: ImageService) {}

  private mockProducts: Product[] = [
    {
      id: '123',
      ean: '9780201379617',
      description: 'RBO NRG Cup2Go',
      listPrice: 15.99,
      unit: 'ST',
      image: this.imageService.getProductImageUrl('123'),
      inStoreStock: 12,
      onlineStock: 93,
      isAvailable: true
    },
    {
      id: '124',
      ean: '9780201379618',
      description: 'RBO NRG Cup2Go Premium',
      listPrice: 18.99,
      unit: 'ST',
      image: this.imageService.getProductImageUrl('124'),
      inStoreStock: 8,
      onlineStock: 45,
      isAvailable: true
    },
    {
      id: '125',
      ean: '9780201379619',
      description: 'RBO NRG Cup2Go Deluxe',
      listPrice: 22.99,
      unit: 'ST',
      image: this.imageService.getProductImageUrl('125'),
      inStoreStock: 5,
      onlineStock: 23,
      isAvailable: true
    }
  ];

  searchProducts(query: string): Observable<ProductSearchResult> {
    const filteredProducts = this.mockProducts.filter(product =>
      product.description.toLowerCase().includes(query.toLowerCase()) ||
      product.ean.includes(query) ||
      product.id.includes(query)
    );

    return of({
      products: filteredProducts,
      totalCount: filteredProducts.length
    }).pipe(delay(300)); // Simulate API delay
  }

  getProductById(id: string): Observable<Product | null> {
    const product = this.mockProducts.find(p => p.id === id);
    return of(product || null).pipe(delay(200));
  }

  getAllProducts(): Observable<Product[]> {
    return of(this.mockProducts).pipe(delay(200));
  }
} 