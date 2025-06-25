import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { SettingsService, AppSettings } from '../../services/settings.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  settings: AppSettings;
  uploadingFile: string | null = null;
  uploadError: string | null = null;
  uploadSuccess: string | null = null;

  constructor(
    private settingsService: SettingsService,
    public authService: AuthService
  ) {
    this.settings = this.settingsService.getCurrentSettings();
  }

  ngOnInit(): void {
    this.settingsService.settings$.subscribe(settings => {
      this.settings = settings;
    });
  }

  onFileSelected(event: Event, type: 'favicon' | 'banner' | 'userAvatar'): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (file) {
      this.uploadFile(file, type);
    }
  }

  async uploadFile(file: File, type: 'favicon' | 'banner' | 'userAvatar'): Promise<void> {
    this.uploadingFile = type;
    this.uploadError = null;
    this.uploadSuccess = null;

    try {
      await this.settingsService.uploadFile(file, type);
      this.uploadSuccess = `${this.getTypeDisplayName(type)} uploaded successfully!`;
      
      // Update favicon immediately if it was changed
      if (type === 'favicon') {
        this.settingsService.updateFavicon();
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        this.uploadSuccess = null;
      }, 3000);
      
    } catch (error) {
      this.uploadError = error instanceof Error ? error.message : 'Upload failed';
    } finally {
      this.uploadingFile = null;
    }
  }

  removeFile(type: 'favicon' | 'banner' | 'userAvatar'): void {
    this.settingsService.removeFile(type);
    this.uploadSuccess = `${this.getTypeDisplayName(type)} removed successfully!`;
    
    // Update favicon immediately if it was removed
    if (type === 'favicon') {
      this.settingsService.updateFavicon();
    }
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      this.uploadSuccess = null;
    }, 3000);
  }

  updateTextSettings(): void {
    this.settingsService.updateSettings({
      companyName: this.settings.companyName,
      appTitle: this.settings.appTitle
    });
    
    this.uploadSuccess = 'Settings updated successfully!';
    setTimeout(() => {
      this.uploadSuccess = null;
    }, 3000);
  }

  resetToDefaults(): void {
    if (confirm('Are you sure you want to reset all settings to defaults? This will remove all uploaded files.')) {
      this.settingsService.resetToDefaults();
      this.uploadSuccess = 'Settings reset to defaults!';
      
      // Update favicon
      this.settingsService.updateFavicon();
      
      setTimeout(() => {
        this.uploadSuccess = null;
      }, 3000);
    }
  }

  getTypeDisplayName(type: string): string {
    switch (type) {
      case 'favicon': return 'Favicon';
      case 'banner': return 'Banner';
      case 'userAvatar': return 'User Avatar';
      default: return type;
    }
  }

  getFileSize(dataUrl: string): string {
    // Estimate file size from base64 data URL
    const base64 = dataUrl.split(',')[1];
    const bytes = (base64.length * 3) / 4;
    
    if (bytes < 1024) return `${bytes.toFixed(0)} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  triggerFileInput(inputId: string): void {
    const input = document.getElementById(inputId) as HTMLInputElement;
    input?.click();
  }

  getUserInitials(): string {
    const user = this.authService.getCurrentUser();
    if (!user || !user.name) return 'U';
    
    const name = user.name.trim();
    if (name.length === 0) return 'U';
    
    const names = name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
} 