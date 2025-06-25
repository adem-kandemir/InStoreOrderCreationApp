import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Order } from '../../models/cart.interface';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.scss']
})
export class OrdersComponent implements OnInit {
  orders: Order[] = [];
  loading = false;

  constructor() {}

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.loading = true;
    // Simulate API call
    setTimeout(() => {
      this.orders = [
        {
          id: '1',
          confirmationNumber: '1234568',
          items: [
            {
              product: {
                id: '123',
                ean: '9780201379617',
                description: 'RBO NRG Cup2Go',
                listPrice: 15.99,
                unit: 'ST',
                isAvailable: true
              },
              quantity: 2,
              price: 12.99,
              total: 25.98
            }
          ],
          customer: {
            firstName: 'Jane',
            lastName: 'Doe',
            email: 'jane.doe@example.com',
            address: {
              line1: 'Filiale München',
              zipCode: '80331',
              city: 'München',
              country: 'Germany'
            }
          },
          shipping: {
            id: 'standard',
            name: 'Standard Shipping',
            price: 4.99,
            estimatedDays: 5
          },
          payment: {
            id: 'prepayment',
            name: 'Prepayment'
          },
          totalPrice: 78.99,
          discount: 6.99,
          shippingCost: 4.99,
          finalTotal: 72.99,
          status: 'confirmed',
          createdAt: new Date('2024-01-15')
        }
      ];
      this.loading = false;
    }, 1000);
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'confirmed':
        return 'status-confirmed';
      case 'processing':
        return 'status-processing';
      case 'shipped':
        return 'status-shipped';
      case 'delivered':
        return 'status-delivered';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return 'status-pending';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'confirmed':
        return 'Confirmed';
      case 'processing':
        return 'Processing';
      case 'shipped':
        return 'Shipped';
      case 'delivered':
        return 'Delivered';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Pending';
    }
  }

  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3QgeD0iMyIgeT0iMyIgd2lkdGg9IjE4IiBoZWlnaHQ9IjE4IiByeD0iMiIgc3Ryb2tlPSIjY2NjIiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9IiNmNWY1ZjUiLz4KPGNpcmNsZSBjeD0iOC41IiBjeT0iOC41IiByPSIxLjUiIGZpbGw9IiNjY2MiLz4KPHBhdGggZD0iTTIxIDE1bC01LTVMNSAyMSIgc3Ryb2tlPSIjY2NjIiBzdHJva2Utd2lkdGg9IjIiLz4KPC9zdmc+';
    }
  }
} 