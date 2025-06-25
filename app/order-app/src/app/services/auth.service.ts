import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UserInfo {
  id: string;
  name: string;
  email: string;
  initials?: string;
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
    try {
      // Get user info from app router's user API
      const response = await fetch('/user-api/currentUser', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const userInfo = await response.json();
        
        // Extract user name and initials
        const firstName = userInfo.firstname || '';
        const lastName = userInfo.lastname || '';
        const fullName = firstName && lastName ? `${firstName} ${lastName}` : 
                        (userInfo.displayName || userInfo.name || 'Authenticated User');
        
        // Generate initials from first and last name
        const initials = firstName && lastName ? 
                        `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}` : 
                        fullName.split(' ').map((n: string) => n.charAt(0)).join('').toUpperCase().substring(0, 2);
        
        // Extract roles from scopes
        const roles = userInfo.scopes ? 
                     userInfo.scopes
                       .filter((scope: string) => scope.includes('OrderCreator') || scope.includes('OrderViewer') || scope.includes('Admin'))
                       .map((scope: string) => {
                         if (scope.includes('OrderCreator')) return 'OrderCreator';
                         if (scope.includes('OrderViewer')) return 'OrderViewer';
                         if (scope.includes('Admin')) return 'Administrator';
                         return scope;
                       }) : ['OrderViewer'];
        
        const user: UserInfo = {
          id: userInfo.name || userInfo.email || 'authenticated-user',
          name: fullName,
          email: userInfo.email || 'user@company.com',
          initials: initials,
          scopes: userInfo.scopes || ['OrderViewer'],
          roles: roles
        };
        
        this.userSubject.next(user);
        this.isAuthenticatedSubject.next(true);
        return;
      }
    } catch (error) {
      // Silently fall back to default user
    }

    // Fallback to default user if API call fails
    const defaultUser: UserInfo = {
      id: 'authenticated-user',
      name: 'Authenticated User',
      email: 'user@company.com',
      initials: 'AU',
      scopes: ['OrderCreator', 'OrderViewer', 'Admin'],
      roles: ['Administrator', 'OrderCreator', 'OrderViewer']
    };
    
    this.userSubject.next(defaultUser);
    this.isAuthenticatedSubject.next(true);
  }

  private handleAuthError(): void {
    // App router handles authentication, so this should not be called
    console.log('🔐 App router handles authentication - no error handling needed');
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