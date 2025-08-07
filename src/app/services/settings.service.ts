import { Injectable, Injector } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

export interface AppSettings {
  profilePicture: string;
  voiceNotificationsEnabled: boolean;
  reminderFrequency: 'daily' | 'weekly' | 'monthly' | 'none';
  theme: 'light' | 'dark' | 'maroon';
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {

  private SETTINGS_KEY = 'app_settings';

  private syncService: any;

  constructor(private injector: Injector) { }

  private getSyncService() {
    if (!this.syncService) {
      // Lazy load SyncService to avoid circular dependency
      this.syncService = this.injector.get('SyncService', null);
    }
    return this.syncService;
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    await Preferences.set({
      key: this.SETTINGS_KEY,
      value: JSON.stringify(settings),
    });
    window.dispatchEvent(new CustomEvent('settingsChanged'));

    // Queue for sync if sync service is available
    const syncService = this.getSyncService();
    if (syncService) {
      await syncService.queueForSync({
        type: 'update',
        entity: 'user_profile',
        data: {
          profile_picture: settings.profilePicture,
          voice_notifications_enabled: settings.voiceNotificationsEnabled,
          reminder_frequency: settings.reminderFrequency,
          theme: settings.theme
        }
      });
    }
  }

  async getSettings(): Promise<AppSettings> {
    const result = await Preferences.get({ key: this.SETTINGS_KEY });
    const defaultSettings: AppSettings = {
      profilePicture: '',
      voiceNotificationsEnabled: true,
      reminderFrequency: 'weekly',
      theme: 'light',
    };
    return result.value ? JSON.parse(result.value) : defaultSettings;
  }
}
