import { Component } from '@angular/core';
import { RouterOutlet, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

import { LocalizationService, Language } from './services/localization.service';
import { AuthService, UserInfo } from './services/auth.service';
import { SettingsService } from './services/settings.service';
import { TranslatePipe } from './pipes/translate.pipe';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterModule, CommonModule, TranslatePipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'order-app';
  currentLanguage$ = this.localizationService.currentLanguage$;
  user$ = this.authService.user$;
  isAuthenticated$ = this.authService.isAuthenticated$;
  settings$ = this.settingsService.settings$;

  constructor(
    private localizationService: LocalizationService,
    public authService: AuthService,
    private settingsService: SettingsService
  ) {}

  switchLanguage(language: Language): void {
    this.localizationService.setLanguage(language);
  }

  toggleLanguage(): void {
    const currentLang = this.getCurrentLanguage();
    const newLang: Language = currentLang === 'en' ? 'de' : 'en';
    this.switchLanguage(newLang);
  }

  getCurrentLanguage(): Language {
    return this.localizationService.getCurrentLanguage();
  }

  logout(): void {
    this.authService.logout();
  }

  getUserInitials(user: UserInfo): string {
    if (!user || !user.name) return 'U';
    const names = user.name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    return user.name.substring(0, 2).toUpperCase();
  }

  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target && target.nextElementSibling) {
      target.style.display = 'none';
      (target.nextElementSibling as HTMLElement).style.display = 'flex';
    }
  }
}
