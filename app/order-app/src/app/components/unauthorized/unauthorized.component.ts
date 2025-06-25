import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="unauthorized-container">
      <div class="unauthorized-content">
        <div class="unauthorized-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="#f44336" stroke-width="2"/>
            <path d="M15 9l-6 6m0-6l6 6" stroke="#f44336" stroke-width="2"/>
          </svg>
        </div>
        <h2>{{ 'unauthorized.title' | translate }}</h2>
        <p>{{ 'unauthorized.message' | translate }}</p>
        <div class="user-info" *ngIf="authService.getCurrentUser() as user">
          <p><strong>{{ 'unauthorized.currentUser' | translate }}:</strong> {{ user.name }} ({{ user.email }})</p>
          <p><strong>{{ 'unauthorized.roles' | translate }}:</strong> {{ user.roles.join(', ') || 'None' }}</p>
        </div>
        <div class="actions">
          <button class="contact-btn" (click)="contactAdmin()">
            {{ 'unauthorized.contactAdmin' | translate }}
          </button>
          <button class="logout-btn" (click)="logout()">
            {{ 'unauthorized.logout' | translate }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .unauthorized-container {
      min-height: 80vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    .unauthorized-content {
      text-align: center;
      max-width: 500px;
      background: white;
      padding: 48px 32px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .unauthorized-icon {
      margin-bottom: 24px;
      color: #f44336;
    }

    h2 {
      margin: 0 0 16px 0;
      font-size: 24px;
      font-weight: 600;
      color: #333;
    }

    p {
      margin: 0 0 24px 0;
      color: #666;
      line-height: 1.6;
    }

    .user-info {
      background: #f5f5f5;
      padding: 16px;
      border-radius: 8px;
      margin: 24px 0;
      text-align: left;

      p {
        margin: 8px 0;
        font-size: 14px;
      }
    }

    .actions {
      display: flex;
      gap: 12px;
      justify-content: center;
      flex-wrap: wrap;
    }

    .contact-btn, .logout-btn {
      padding: 12px 24px;
      border-radius: 6px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      border: none;
    }

    .contact-btn {
      background: #00b4d8;
      color: white;

      &:hover {
        background: #0096c7;
      }
    }

    .logout-btn {
      background: #f44336;
      color: white;

      &:hover {
        background: #d32f2f;
      }
    }
  `]
})
export class UnauthorizedComponent {
  constructor(public authService: AuthService) {}

  contactAdmin(): void {
    // You can customize this to open email client or redirect to support
    const subject = encodeURIComponent('Access Request for In-Store Order Creation App');
    const body = encodeURIComponent(
      `Hello,\n\nI need access to the In-Store Order Creation App.\n\n` +
      `Current user: ${this.authService.getCurrentUser()?.name}\n` +
      `Email: ${this.authService.getCurrentUser()?.email}\n\n` +
      `Please grant me the necessary permissions.\n\nThank you.`
    );
    window.open(`mailto:admin@company.com?subject=${subject}&body=${body}`);
  }

  logout(): void {
    this.authService.logout();
  }
} 