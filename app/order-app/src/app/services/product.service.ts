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

  searchProducts(query: string, options?: { refresh?: boolean }): Observable<ProductSearchResult> {
    const params = new URLSearchParams();
    
    if (query) {
      params.append('search', query);
    }
    
    if (options?.refresh) {
      params.append('refresh', 'true');
    }
    
    const url = `${this.apiUrl}/products${params.toString() ? '?' + params.toString() : ''}`;
    
    return this.http.get<ProductSearchResult>(url).pipe(
      catchError(error => {
        console.error('Error searching products:', error);
        
        // Create enhanced error response with backend error details
        const errorResponse: ProductSearchResult = {
          products: [],
          totalCount: 0,
          error: true,
          errorType: error.error?.errorType || 'unknown',
          userMessage: error.error?.userMessage || 'Unable to search products at this time',
          technicalMessage: error.error?.technicalMessage || error.message,
          timestamp: error.error?.timestamp || new Date().toISOString()
        };
        
        return of(errorResponse);
      })
    );
  }

  getProductById(id: string, options?: { refresh?: boolean }): Observable<Product | null> {
    const params = new URLSearchParams();
    
    if (options?.refresh) {
      params.append('refresh', 'true');
    }
    
    const url = `${this.apiUrl}/products/${encodeURIComponent(id)}${params.toString() ? '?' + params.toString() : ''}`;
    
    console.log(`Fetching product ${id} with availability and pricing...`);
    
    return this.http.get<Product>(url).pipe(
      catchError(error => {
        console.error('Error fetching product:', error);
        return of(null);
      })
    );
  }

  /**
   * Get product availability from OMSA
   */
  getProductAvailability(id: string, options?: { refresh?: boolean }): Observable<any> {
    const params = new URLSearchParams();
    
    if (options?.refresh) {
      params.append('refresh', 'true');
    }
    
    const url = `${this.apiUrl}/availability/${encodeURIComponent(id)}${params.toString() ? '?' + params.toString() : ''}`;
    
    return this.http.get<any>(url).pipe(
      catchError(error => {
        console.error('Error fetching product availability:', error);
        return of(null);
      })
    );
  }

  getAllProducts(): Observable<Product[]> {
    return this.searchProducts('').pipe(
      map(result => result.products)
    );
  }

  searchProductByEAN(ean: string): Promise<Product | null> {
    const url = `${this.apiUrl}/products/scan/${encodeURIComponent(ean)}`;
    
    return this.http.get<Product>(url).pipe(
      catchError(error => {
        console.error('Error scanning EAN:', error);
        return of(null);
      })
    ).toPromise().then(result => result || null);
  }

  // Additional method to check API health
  checkApiHealth(): Observable<boolean> {
    return this.http.get<any>(`${this.apiUrl}/health`).pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }
} 