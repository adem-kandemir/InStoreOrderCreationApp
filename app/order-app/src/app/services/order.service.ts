import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, catchError, map, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface OrderSearchParams {
  displayId?: number;
  precedingDocumentNumber?: string;
  customerFirstName?: string;
  customerLastName?: string;
  status?: string;
  page?: number;
  size?: number;
  sort?: string;
  modifiedAfter?: string;
  createdAfter?: string;
  createdBefore?: string;
}

export interface OrderResponse {
  content: any[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private apiUrl = environment.apiUrl;
  private omfUrl = 'https://c4h-order.cfapps.eu20.hana.ondemand.com/api/v2';

  constructor(private http: HttpClient) {}

  searchOrders(params: OrderSearchParams = {}): Observable<OrderResponse> {
    let httpParams = new HttpParams();

    // Add search parameters if provided
    if (params.displayId) {
      httpParams = httpParams.set('displayId', params.displayId.toString());
    }
    if (params.precedingDocumentNumber) {
      httpParams = httpParams.set('precedingDocumentNumber', params.precedingDocumentNumber);
    }
    if (params.customerFirstName) {
      httpParams = httpParams.set('customerFirstName', params.customerFirstName);
    }
    if (params.customerLastName) {
      httpParams = httpParams.set('customerLastName', params.customerLastName);
    }
    if (params.status) {
      httpParams = httpParams.set('status', params.status);
    }
    if (params.modifiedAfter) {
      httpParams = httpParams.set('modifiedAfter', params.modifiedAfter);
    }
    if (params.createdAfter) {
      httpParams = httpParams.set('createdAfter', params.createdAfter);
    }
    if (params.createdBefore) {
      httpParams = httpParams.set('createdBefore', params.createdBefore);
    }

    // Pagination parameters
    httpParams = httpParams.set('page', (params.page || 0).toString());
    httpParams = httpParams.set('size', (params.size || 20).toString());
    
    // Sort parameter (default to displayId,DESC)
    httpParams = httpParams.set('sort', params.sort || 'displayId,DESC');

    // Make the API call through the backend proxy
    const url = `${this.apiUrl}/orders`;
    
    return this.http.get<any>(url, { params: httpParams }).pipe(
      map(response => {
        // Handle both array response and paginated response
        if (Array.isArray(response)) {
          return {
            content: response,
            totalElements: response.length,
            totalPages: 1,
            size: response.length,
            number: 0
          };
        }
        return response;
      }),
      catchError(error => {
        console.error('Error fetching orders:', error);
        // Return empty result on error
        return of({
          content: [],
          totalElements: 0,
          totalPages: 0,
          size: params.size || 20,
          number: params.page || 0
        });
      })
    );
  }

  getOrderById(orderId: string, expanded: boolean = false): Observable<any> {
    let url = `${this.apiUrl}/orders/${orderId}`;
    
    // Add expand parameters if requested
    if (expanded) {
      const expandParams = [
        'payment',
        'fees', 
        'prices',
        'sourcing',
        'customFields',
        'discount'
      ];
      const expandQuery = expandParams.map(param => `expand=${param}`).join('&');
      url += `?${expandQuery}`;
    }
    
    return this.http.get<any>(url).pipe(
      catchError(error => {
        console.error('Error fetching order details:', error);
        return of(null);
      })
    );
  }

  getOrderStatuses(): string[] {
    return [
      'TRANSFER_ON_HOLD',
      'PENDING',
      'READY_FOR_TRANSFER',
      'IN_TRANSFER',
      'IN_TRANSFER_FAILED',
      'TRANSFER_STARTED',
      'TRANSFER_SUCCESSFUL',
      'TRANSFER_FAILED',
      'TRANSFER_PARTIALLY_FAILED',
      'CANCELED',
      'CANCELED_DURING_PROCESSING'
    ];
  }

  // Helper method to format status for display
  formatStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      'TRANSFER_ON_HOLD': 'On Hold',
      'PENDING': 'Pending',
      'READY_FOR_TRANSFER': 'Ready',
      'IN_TRANSFER': 'Processing',
      'IN_TRANSFER_FAILED': 'Transfer Failed',
      'TRANSFER_STARTED': 'Started',
      'TRANSFER_SUCCESSFUL': 'Completed',
      'TRANSFER_FAILED': 'Failed',
      'TRANSFER_PARTIALLY_FAILED': 'Partially Failed',
      'CANCELED': 'Cancelled',
      'CANCELED_DURING_PROCESSING': 'Cancelled'
    };
    return statusMap[status] || status;
  }

  // Helper method to get status CSS class
  getStatusClass(status: string): string {
    const classMap: { [key: string]: string } = {
      'TRANSFER_ON_HOLD': 'status-pending',
      'PENDING': 'status-pending',
      'READY_FOR_TRANSFER': 'status-processing',
      'IN_TRANSFER': 'status-processing',
      'IN_TRANSFER_FAILED': 'status-cancelled',
      'TRANSFER_STARTED': 'status-processing',
      'TRANSFER_SUCCESSFUL': 'status-delivered',
      'TRANSFER_FAILED': 'status-cancelled',
      'TRANSFER_PARTIALLY_FAILED': 'status-cancelled',
      'CANCELED': 'status-cancelled',
      'CANCELED_DURING_PROCESSING': 'status-cancelled'
    };
    return classMap[status] || 'status-pending';
  }

  /**
   * Get order items with expanded price information
   */
  getOrderItems(orderId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/orders/${orderId}/items`).pipe(
      tap(items => console.log('Order items received:', items)),
      catchError(error => {
        console.error('Error fetching order items:', error);
        return of([]);
      })
    );
  }

  /**
   * Get activities for a specific item
   */
  getItemActivities(itemId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/orderActivities?itemId=${itemId}`).pipe(
      tap(activities => console.log('Item activities received:', activities)),
      catchError(error => {
        console.error('Error fetching item activities:', error);
        return of([]);
      })
    );
  }

  /**
   * Get all activities for all items in an order
   */
  getOrderActivities(orderId: string): Observable<{[key: string]: any[]}> {
    return this.http.get<{[key: string]: any[]}>(`${this.apiUrl}/orders/${orderId}/activities`).pipe(
      tap(activities => console.log('All order activities received:', activities)),
      catchError(error => {
        console.error('Error fetching order activities:', error);
        return of({});
      })
    );
  }
} 