import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface AppSettings {
  favicon: string | null;
  banner: string | null;
  userAvatar: string | null;
  companyName: string;
  appTitle: string;
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private settingsSubject = new BehaviorSubject<AppSettings>(this.getDefaultSettings());
  public settings$ = this.settingsSubject.asObservable();

  private readonly STORAGE_KEY = 'app-settings';

  constructor() {
    this.loadSettings();
  }

  private getDefaultSettings(): AppSettings {
    return {
      favicon: null,
      banner: null,
      userAvatar: null,
      companyName: 'Omnishore',
      appTitle: 'Order App'
    };
  }

  private loadSettings(): void {
    if (this.isBrowser()) {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        try {
          const settings = JSON.parse(saved);
          this.settingsSubject.next({ ...this.getDefaultSettings(), ...settings });
        } catch (error) {
          console.error('Failed to load settings:', error);
        }
      }
    }
  }

  private saveSettings(settings: AppSettings): void {
    if (this.isBrowser()) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
    }
  }

  getCurrentSettings(): AppSettings {
    return this.settingsSubject.value;
  }

  updateSettings(settings: Partial<AppSettings>): void {
    const current = this.getCurrentSettings();
    const updated = { ...current, ...settings };
    this.settingsSubject.next(updated);
    this.saveSettings(updated);
  }

  async uploadFile(file: File, type: 'favicon' | 'banner' | 'userAvatar'): Promise<string> {
    return new Promise((resolve, reject) => {
      // Validate file type
      if (!this.isValidImageFile(file)) {
        reject(new Error('Please select a valid image file (PNG, JPG, JPEG, GIF, SVG)'));
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        reject(new Error('File size must be less than 5MB'));
        return;
      }

      // Validate specific requirements
      if (type === 'favicon' && file.size > 1024 * 1024) {
        reject(new Error('Favicon size must be less than 1MB'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          // Update settings with the new file
          this.updateSettings({ [type]: result });
          resolve(result);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  private isValidImageFile(file: File): boolean {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/svg+xml'];
    return validTypes.includes(file.type);
  }

  removeFile(type: 'favicon' | 'banner' | 'userAvatar'): void {
    this.updateSettings({ [type]: null });
  }

  resetToDefaults(): void {
    const defaults = this.getDefaultSettings();
    this.settingsSubject.next(defaults);
    this.saveSettings(defaults);
  }

  getFaviconUrl(): string | null {
    const settings = this.getCurrentSettings();
    return settings.favicon || null;
  }

  getBannerUrl(): string | null {
    const settings = this.getCurrentSettings();
    return settings.banner || null;
  }

  getUserAvatarUrl(): string | null {
    const settings = this.getCurrentSettings();
    return settings.userAvatar || null;
  }

  updateFavicon(): void {
    if (this.isBrowser()) {
      const faviconUrl = this.getFaviconUrl();
      const faviconLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      
      if (faviconLink && faviconUrl) {
        faviconLink.href = faviconUrl;
      }
    }
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }
} 