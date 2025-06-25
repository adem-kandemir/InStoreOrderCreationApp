import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable, map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    
    return this.authService.isAuthenticated$.pipe(
      take(1),
      map(isAuthenticated => {
        if (!isAuthenticated) {
          // Redirect to login or show unauthorized message
          console.warn('User not authenticated');
          return false;
        }

        // Check for required roles/scopes from route data
        const requiredRoles = route.data['roles'] as string[];
        const requiredScopes = route.data['scopes'] as string[];

        if (requiredRoles && requiredRoles.length > 0) {
          const hasRequiredRole = requiredRoles.some(role => this.authService.hasRole(role));
          if (!hasRequiredRole) {
            console.warn('User does not have required role:', requiredRoles);
            this.router.navigate(['/unauthorized']);
            return false;
          }
        }

        if (requiredScopes && requiredScopes.length > 0) {
          const hasRequiredScope = requiredScopes.some(scope => this.authService.hasScope(scope));
          if (!hasRequiredScope) {
            console.warn('User does not have required scope:', requiredScopes);
            this.router.navigate(['/unauthorized']);
            return false;
          }
        }

        return true;
      })
    );
  }
}

@Injectable({
  providedIn: 'root'
})
export class OrderCreatorGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): Observable<boolean> | Promise<boolean> | boolean {
    return this.authService.isAuthenticated$.pipe(
      take(1),
      map(isAuthenticated => {
        if (!isAuthenticated || !this.authService.canCreateOrders()) {
          this.router.navigate(['/unauthorized']);
          return false;
        }
        return true;
      })
    );
  }
}

@Injectable({
  providedIn: 'root'
})
export class OrderViewerGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): Observable<boolean> | Promise<boolean> | boolean {
    return this.authService.isAuthenticated$.pipe(
      take(1),
      map(isAuthenticated => {
        if (!isAuthenticated || !this.authService.canViewOrders()) {
          this.router.navigate(['/unauthorized']);
          return false;
        }
        return true;
      })
    );
  }
} 