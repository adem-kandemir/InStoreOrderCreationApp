import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, map } from 'rxjs';
import { Product, ProductSearchResult } from '../models/product.interface';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  searchProducts(query: string): Observable<ProductSearchResult> {
    const url = `${this.apiUrl}/products${query ? '?search=' + encodeURIComponent(query) : ''}`;
    
    return this.http.get<ProductSearchResult>(url).pipe(
      catchError(error => {
        console.error('Error searching products:', error);
        // Fallback to empty result on error
        return of({
          products: [],
          totalCount: 0
        });
      })
    );
  }

  getProductById(id: string): Observable<Product | null> {
    const url = `${this.apiUrl}/products/${encodeURIComponent(id)}`;
    
    return this.http.get<Product>(url).pipe(
      catchError(error => {
        console.error('Error fetching product:', error);
        return of(null);
      })
    );
  }

  getAllProducts(): Observable<Product[]> {
    return this.searchProducts('').pipe(
      map(result => result.products)
    );
  }

  // Additional method to check API health
  checkApiHealth(): Observable<boolean> {
    return this.http.get<any>(`${this.apiUrl}/health`).pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }
} 