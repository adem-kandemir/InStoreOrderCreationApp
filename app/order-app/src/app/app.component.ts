import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

import { LocalizationService, Language } from './services/localization.service';
import { TranslatePipe } from './pipes/translate.pipe';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, TranslatePipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'order-app';
  currentLanguage$ = this.localizationService.currentLanguage$;

  constructor(private localizationService: LocalizationService) {}

  switchLanguage(language: Language): void {
    this.localizationService.setLanguage(language);
  }

  getCurrentLanguage(): Language {
    return this.localizationService.getCurrentLanguage();
  }

  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target && target.nextElementSibling) {
      target.style.display = 'none';
      (target.nextElementSibling as HTMLElement).style.display = 'flex';
    }
  }
}
