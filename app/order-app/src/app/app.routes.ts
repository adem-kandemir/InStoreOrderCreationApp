import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: '/new-order', pathMatch: 'full' },
  { path: 'new-order', loadComponent: () => import('./components/new-order/new-order.component').then(m => m.NewOrderComponent) },
  { path: 'orders', loadComponent: () => import('./components/orders/orders.component').then(m => m.OrdersComponent) },
  { path: '**', redirectTo: '/new-order' }
];
