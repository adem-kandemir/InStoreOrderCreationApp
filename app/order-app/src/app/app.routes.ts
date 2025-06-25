import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: '/new-order', pathMatch: 'full' },
  { 
    path: 'new-order', 
    loadComponent: () => import('./components/new-order/new-order.component').then(m => m.NewOrderComponent)
  },
  { 
    path: 'orders', 
    loadComponent: () => import('./components/orders/orders.component').then(m => m.OrdersComponent)
  },
  { 
    path: 'unauthorized', 
    loadComponent: () => import('./components/unauthorized/unauthorized.component').then(m => m.UnauthorizedComponent)
  },
  { 
    path: 'settings', 
    loadComponent: () => import('./components/settings/settings.component').then(m => m.SettingsComponent)
  },
  { path: '**', redirectTo: '/new-order' }
];
