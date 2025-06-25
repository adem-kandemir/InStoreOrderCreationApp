import { Pipe, PipeTransform, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { LocalizationService } from '../services/localization.service';

@Pipe({
  name: 'translate',
  pure: false, // Make it impure so it updates when language changes
  standalone: true
})
export class TranslatePipe implements PipeTransform, OnDestroy {
  private subscription?: Subscription;
  private lastLanguage?: string;
  private lastKey?: string;
  private lastTranslation?: string;

  constructor(private localizationService: LocalizationService) {}

  transform(key: string): string {
    const currentLanguage = this.localizationService.getCurrentLanguage();
    
    // Cache optimization - only translate if key or language changed
    if (this.lastKey === key && this.lastLanguage === currentLanguage && this.lastTranslation) {
      return this.lastTranslation;
    }
    
    this.lastKey = key;
    this.lastLanguage = currentLanguage;
    this.lastTranslation = this.localizationService.translate(key);
    
    return this.lastTranslation;
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
} 