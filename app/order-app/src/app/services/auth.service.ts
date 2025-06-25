import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UserInfo {
  id: string;
  name: string;
  email: string;
  scopes: string[];
  roles: string[];
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private userSubject = new BehaviorSubject<UserInfo | null>(null);
  public user$ = this.userSubject.asObservable();

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  private isLocalDevelopment = this.checkLocalDevelopment();

  constructor() {
    this.loadUserInfo();
  }

  private checkLocalDevelopment(): boolean {
    // Use environment configuration first
    if (environment.enableMockAuth !== undefined) {
      return environment.enableMockAuth;
    }
    
    // Fallback to URL-based detection for backwards compatibility
    if (!this.isBrowser()) return false;
    
    const hostname = window.location.hostname;
    const port = window.location.port;
    
    // Check if running on localhost or development ports
    return hostname === 'localhost' || 
           hostname === '127.0.0.1' || 
           hostname === '0.0.0.0' ||
           port === '4200' || // Angular dev server default
           port === '3000' || // Common dev port
           hostname.includes('localhost');
  }

  private async loadUserInfo(): Promise<void> {
    // Skip authentication in development mode
    if (this.isLocalDevelopment) {
      console.log('🔓 Development mode - Authentication disabled (enableMockAuth: ' + environment.enableMockAuth + ')');
      const mockUser: UserInfo = {
        id: 'dev-user',
        name: 'Development User',
        email: 'dev@localhost.com',
        scopes: ['OrderCreator', 'OrderViewer', 'Admin'],
        roles: ['Administrator', 'OrderCreator', 'OrderViewer']
      };
      
      this.userSubject.next(mockUser);
      this.isAuthenticatedSubject.next(true);
      return;
    }

    // Skip authentication during SSR prerendering
    if (!this.isBrowser()) {
      console.log('🔄 SSR prerendering - Skipping authentication');
      this.isAuthenticatedSubject.next(false);
      return;
    }

    try {
      // In BTP Cloud Foundry, user info is available via /user-api/currentUser
      const response = await fetch('/user-api/currentUser', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const userInfo = await response.json();
        const user: UserInfo = {
          id: userInfo.id || userInfo.name,
          name: userInfo.name || userInfo.displayName,
          email: userInfo.email,
          scopes: userInfo.scopes || [],
          roles: userInfo.roles || []
        };
        
        this.userSubject.next(user);
        this.isAuthenticatedSubject.next(true);
      } else {
        this.handleAuthError();
      }
    } catch (error) {
      console.error('Failed to load user info:', error);
      this.handleAuthError();
    }
  }

  private handleAuthError(): void {
    this.userSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    
    // Don't redirect to login in local development
    if (!this.isLocalDevelopment && this.isBrowser()) {
      window.location.href = '/login';
    }
  }

  getCurrentUser(): UserInfo | null {
    return this.userSubject.value;
  }

  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  hasScope(scope: string): boolean {
    const user = this.getCurrentUser();
    return user ? user.scopes.includes(scope) : false;
  }

  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user ? user.roles.includes(role) : false;
  }

  canCreateOrders(): boolean {
    return this.hasScope('OrderCreator') || this.hasRole('OrderCreator') || this.hasRole('Administrator');
  }

  canViewOrders(): boolean {
    return this.hasScope('OrderViewer') || this.hasRole('OrderViewer') || 
           this.hasRole('OrderCreator') || this.hasRole('Administrator');
  }

  isAdmin(): boolean {
    return this.hasScope('Admin') || this.hasRole('Administrator');
  }

  logout(): void {
    if (this.isLocalDevelopment) {
      console.log('🔓 Development mode - Logout disabled');
      return;
    }
    
    if (this.isBrowser()) {
      window.location.href = '/do/logout';
    }
  }

  isLocalDevelopmentMode(): boolean {
    return this.isLocalDevelopment;
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined';
  }
} 