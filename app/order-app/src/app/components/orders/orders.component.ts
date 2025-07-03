import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrderService, OrderSearchParams } from '../../services/order.service';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, TranslatePipe],
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.scss']
})
export class OrdersComponent implements OnInit {
  orders: any[] = [];
  loading = false;
  searchQuery = '';
  searchSubject = new Subject<string>();
  selectedOrder: any = null;
  collapseOrderItems = false;
  collapseOrderActivities = false;
  loadingItems = false;
  
  // Pagination
  currentPage = 0;
  pageSize = 5;
  totalElements = 0;
  totalPages = 0;
  
  // Search filters
  selectedStatus = '';
  availableStatuses = [
    { value: '', label: 'All Statuses' },
    { value: 'TRANSFER_ON_HOLD', label: 'On Hold' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'READY_FOR_TRANSFER', label: 'Ready' },
    { value: 'IN_TRANSFER', label: 'In Transfer' },
    { value: 'TRANSFER_STARTED', label: 'Started' },
    { value: 'TRANSFER_SUCCESSFUL', label: 'Successful' },
    { value: 'TRANSFER_FAILED', label: 'Failed' },
    { value: 'CANCELED', label: 'Cancelled' }
  ];

  constructor(private orderService: OrderService) {}

  ngOnInit(): void {
    // Set up search debouncing
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(searchValue => {
      this.performSearch();
    });
    
    // Load initial orders
    this.loadOrders();
  }

  loadOrders(): void {
    this.loading = true;
    
    const searchParams: OrderSearchParams = {
      page: this.currentPage,
      size: this.pageSize,
      sort: 'displayId,DESC'
    };
    
    // Add search filters if present
    if (this.searchQuery) {
      // Check if it's a number (could be displayId or precedingDocumentNumber)
      if (!isNaN(Number(this.searchQuery))) {
        searchParams.displayId = Number(this.searchQuery);
      } else {
        // Could be precedingDocumentNumber or customer name
        if (this.searchQuery.match(/^[A-Z0-9]{10}$/)) {
          // Looks like a preceding document number
          searchParams.precedingDocumentNumber = this.searchQuery;
        } else {
          // Search by customer name
          const nameParts = this.searchQuery.split(' ');
          if (nameParts.length > 1) {
            searchParams.customerFirstName = nameParts[0];
            searchParams.customerLastName = nameParts.slice(1).join(' ');
          } else {
            searchParams.customerLastName = this.searchQuery;
          }
        }
      }
    }
    
    // Add status filter if selected
    if (this.selectedStatus) {
      searchParams.status = this.selectedStatus;
    }
    
    this.orderService.searchOrders(searchParams).subscribe({
      next: (response) => {
        console.log('Orders loaded:', response);
        this.orders = this.transformOrders(response.content || []);
        this.totalElements = response.totalElements;
        this.totalPages = response.totalPages;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading orders:', error);
        this.orders = [];
        this.loading = false;
      }
    });
  }

  transformOrders(rawOrders: any[]): any[] {
    console.log('Raw orders from API:', rawOrders);
    return rawOrders.map(order => {
      // Extract customer info
      const customer = order.customer || {};
      const person = customer.person || {};
      const addresses = customer.addresses || [];
      const shipToAddress = addresses.find((a: any) => a.addressType === 'SHIP_TO') || addresses[0] || {};
      
      // Extract items with proper structure
      console.log(`Order ${order.id} has ${order.orderItems?.length || 0} items in raw response`);
      const items = (order.orderItems || []).map((item: any) => ({
        product: {
          id: item.product?.externalSystemReference?.externalId || item.referenceId || 'Unknown',
          description: item.product?.description || `Product ${item.referenceId || 'Unknown'}`,
          ean: item.product?.ean || '',
          image: this.getProductImageUrl(item.referenceId || 'placeholder')
        },
        quantity: item.quantity?.value || 1,
        price: item.price?.aspectsData?.physicalItemPrice?.priceTotals?.[0]?.effectiveAmount || 0,
        total: item.price?.aspectsData?.physicalItemPrice?.priceTotals?.[0]?.finalAmount || 0
      }));
      
      // Calculate totals
      const subtotal = items.reduce((sum: number, item: any) => sum + item.total, 0);
      
      // Try to find shipping fee from different possible locations
      let shippingCost = 0;
      if (order.fees) {
        const shippingFee = order.fees.find((f: any) => f.category === 'SHIPPING' || f.type === 'SHIPPING');
        shippingCost = shippingFee?.finalAmount || shippingFee?.originalAmount || shippingFee?.amount || 0;
      } else if (order.shippingFee) {
        shippingCost = order.shippingFee;
      } else if (order.delivery?.shippingCost) {
        shippingCost = order.delivery.shippingCost;
      }
      
      const discount = order.discount || 0;
      const finalTotal = subtotal + shippingCost - discount;
      
      return {
        id: order.id,
        confirmationNumber: order.precedingDocument?.externalSystemReference?.externalNumber || order.displayId || 'N/A',
        displayId: order.displayId,
        items: items,
        customer: {
          firstName: person.firstName || 'Unknown',
          lastName: person.lastName || 'Customer',
          email: shipToAddress.email || 'no-email@example.com',
          address: {
            line1: `${shipToAddress.street || ''} ${shipToAddress.houseNumber || ''}`.trim() || 'Unknown Address',
            zipCode: shipToAddress.postalCode || '',
            city: shipToAddress.city || 'Unknown City',
            country: shipToAddress.country || 'DE'
          }
        },
        shipping: {
          id: 'standard',
          name: 'Standard Shipping',
          price: shippingCost,
          estimatedDays: 5,
          estimatedDelivery: order.delivery?.expectedDeliveryDate || new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        },
        payment: {
          id: order.customFields?.PaymentMethod || 'unknown',
          name: this.formatPaymentMethod(order.customFields?.PaymentMethod || 'Bank')
        },
        totalPrice: subtotal,
        discount: discount,
        shippingCost: shippingCost,
        finalTotal: finalTotal,
        status: order.status || 'PENDING',
        createdAt: new Date(order.metadata?.createdAt || order.createdAt || Date.now()),
        fulfillment: order.fulfillment || {}
      };
    });
  }

  formatPaymentMethod(method: string): string {
    const methodMap: { [key: string]: string } = {
      'Prepayment': 'Prepayment',
      'CreditCard': 'Credit Card',
      'DebitCard': 'Debit Card',
      'Invoice': 'Invoice',
      'DirectDebit': 'Direct Debit',
      'Cash': 'Cash',
      'Bank': 'Bank Transfer',
      'Other': 'Other'
    };
    return methodMap[method] || method;
  }

  onSearchChange(value: string): void {
    this.searchQuery = value;
    this.currentPage = 0; // Reset to first page
    this.searchSubject.next(value);
  }

  onStatusChange(): void {
    this.currentPage = 0; // Reset to first page
    this.loadOrders();
  }

  performSearch(): void {
    this.loadOrders();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadOrders();
  }

  getStatusClass(status: string): string {
    return this.orderService.getStatusClass(status);
  }

  getStatusText(status: string): string {
    // For now, return the formatted status from the service
    // In the future, we can add translation keys for each status
    const formattedStatus = this.orderService.formatStatus(status);
    
    // Map to translation keys if available
    const statusTranslationMap: { [key: string]: string } = {
      'Completed': 'orders.completed',
      'Failed': 'orders.failed'
    };
    
    // Check if we have a translation key for this status
    if (statusTranslationMap[formattedStatus]) {
      // We'll need to inject LocalizationService for this to work properly
      // For now, just return the formatted status
      return formattedStatus;
    }
    
    return formattedStatus;
  }

  getStatusIconClass(status: string): string {
    const iconClassMap: { [key: string]: string } = {
      'TRANSFER_ON_HOLD': 'icon-pending',
      'PENDING': 'icon-pending',
      'READY_FOR_TRANSFER': 'icon-processing',
      'IN_TRANSFER': 'icon-processing',
      'IN_TRANSFER_FAILED': 'icon-failed',
      'TRANSFER_STARTED': 'icon-processing',
      'TRANSFER_SUCCESSFUL': 'icon-success',
      'TRANSFER_FAILED': 'icon-failed',
      'TRANSFER_PARTIALLY_FAILED': 'icon-failed',
      'CANCELED': 'icon-failed',
      'CANCELED_DURING_PROCESSING': 'icon-failed'
    };
    return iconClassMap[status] || 'icon-pending';
  }

  getProductImageUrl(productId: string): string {
    return `assets/images/products/${productId}.jpg`;
  }

  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3QgeD0iMyIgeT0iMyIgd2lkdGg9IjE4IiBoZWlnaHQ9IjE4IiByeD0iMiIgc3Ryb2tlPSIjY2NjIiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9IiNmNWY1ZjUiLz4KPGNpcmNsZSBjeD0iOC41IiBjeT0iOC41IiByPSIxLjUiIGZpbGw9IiNjY2MiLz4KPHBhdGggZD0iTTIxIDE1bC01LTVMNSAyMSIgc3Ryb2tlPSIjY2NjIiBzdHJva2Utd2lkdGg9IjIiLz4KPC9zdmc+';
    }
  }

  toggleOrderItems(): void {
    this.collapseOrderItems = !this.collapseOrderItems;
  }

  toggleOrderActivities(): void {
    this.collapseOrderActivities = !this.collapseOrderActivities;
  }

  selectOrder(order: any): void {
    console.log('Selected order:', order);
    console.log('Order has ID:', order?.id);
    console.log('Order has displayId:', order?.displayId);
    console.log('Order initial items:', order?.items);
    
    this.selectedOrder = order;
    // Reset collapse states when selecting a new order
    this.collapseOrderItems = false;
    this.collapseOrderActivities = false;
    
    // First fetch the expanded order details to get fees and other data
    if (order && order.id) {
      this.orderService.getOrderById(order.id, true).subscribe({
        next: (expandedOrder) => {
          console.log('Expanded order details:', expandedOrder);
          
          // Extract shipping fee from fees array
          let shippingCost = 0;
          if (expandedOrder.fees && Array.isArray(expandedOrder.fees)) {
            const shippingFee = expandedOrder.fees.find((fee: any) => fee.category === 'SHIPPING');
            shippingCost = shippingFee?.finalAmount || 0;
          }
          
          // Update the selected order with expanded data
          this.selectedOrder = {
            ...this.selectedOrder,
            shippingCost: shippingCost,
            payment: expandedOrder.payment?.[0] || this.selectedOrder.payment,
            customFields: expandedOrder.customFields,
            prices: expandedOrder.prices,
            sourcing: expandedOrder.sourcing
          };
          
          // Update shipping info from sourcing if available
          if (expandedOrder.sourcing?.shipments?.[0]?.delivery) {
            const delivery = expandedOrder.sourcing.shipments[0].delivery;
            this.selectedOrder.shipping = {
              ...this.selectedOrder.shipping,
              name: delivery.deliveryOption || 'Standard Shipping',
              estimatedDelivery: delivery.expectedDeliveryDate ? 
                new Date(delivery.expectedDeliveryDate).toISOString().split('T')[0] : 
                this.selectedOrder.shipping?.estimatedDelivery
            };
          }
          
          console.log('Updated order with shipping cost:', shippingCost);
          
          // Recalculate final total with the correct shipping cost
          if (this.selectedOrder.items && this.selectedOrder.items.length > 0) {
            const itemsTotal = this.selectedOrder.items.reduce((sum: number, item: any) => sum + item.total, 0);
            this.selectedOrder.finalTotal = itemsTotal + shippingCost;
          }
        },
        error: (error) => {
          console.error('Error fetching expanded order details:', error);
        }
      });
      
      // Fetch detailed items with price information
      console.log('Fetching items for order ID:', order.id);
      this.loadingItems = true;
      this.orderService.getOrderItems(order.id).subscribe({
        next: (items) => {
          console.log('Raw items response:', items);
          if (items && items.length > 0) {
          // Transform the detailed items
          const detailedItems = items.map((item: any) => {
            const quantity = item.quantity?.value || 1;
            const unitPrice = item.price?.aspectsData?.physicalItemPrice?.priceTotals?.[0]?.effectiveAmount || 0;
            const originalUnitPrice = item.price?.aspectsData?.physicalItemPrice?.priceTotals?.[0]?.originalAmount || 0;
            const finalUnitPrice = item.price?.aspectsData?.physicalItemPrice?.priceTotals?.[0]?.finalAmount || 0;
            const unitDiscount = item.price?.aspectsData?.physicalItemPrice?.priceTotals?.[0]?.discount?.totalAmount || 0;
            
            return {
              id: item.id,
              product: {
                id: item.product?.externalSystemReferences?.[0]?.externalId || item.referenceId || 'Unknown',
                description: item.product?.name || `Product ${item.referenceId || 'Unknown'}`,
                ean: '', // Not provided in the response
                image: this.getProductImageUrl(item.referenceId || 'placeholder')
              },
              quantity: quantity,
              unit: item.quantity?.unit || 'PCE',
              price: unitPrice, // Unit price
              originalPrice: originalUnitPrice, // Original unit price
              total: finalUnitPrice * quantity, // Total = unit price * quantity
              discount: unitDiscount * quantity, // Total discount
              fulfillment: item.fulfillment
            };
          });
          
          // Update the selected order with detailed items
          this.selectedOrder = {
            ...this.selectedOrder,
            items: detailedItems,
            // Recalculate totals based on detailed items
            totalPrice: detailedItems.reduce((sum: number, item: any) => sum + (item.originalPrice * item.quantity), 0),
            discount: detailedItems.reduce((sum: number, item: any) => sum + item.discount, 0),
            // Note: finalTotal will be recalculated after shipping cost is fetched
            finalTotal: detailedItems.reduce((sum: number, item: any) => sum + item.total, 0) + (this.selectedOrder.shippingCost || 0)
          };
          
            console.log('Order updated with detailed items:', this.selectedOrder);
          } else {
            console.log('No items returned from API or empty items array');
          }
          this.loadingItems = false;
        },
        error: (error) => {
          console.error('Error loading order items:', error);
          this.loadingItems = false;
        }
      });
      
      // Optionally fetch activities for all items
      this.orderService.getOrderActivities(order.id).subscribe(activities => {
        console.log('Order activities:', activities);
        // Store activities if needed for display
        this.selectedOrder = {
          ...this.selectedOrder,
          itemActivities: activities
        };
      });
    }
  }
} 