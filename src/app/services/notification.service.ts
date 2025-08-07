import { Injectable } from '@angular/core';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { SettingsService } from './settings.service';
import { LocalNotifications } from '@capacitor/local-notifications';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  constructor(private settingsService: SettingsService) {
    this.requestPermissions();
  }

  async requestPermissions(): Promise<void> {
    await LocalNotifications.requestPermissions();
  }

  async speak(text: string): Promise<void> {
    const settings = await this.settingsService.getSettings();
    if (settings.voiceNotificationsEnabled) {
      return TextToSpeech.speak({
        text: text,
        lang: 'en-US',
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
        category: 'ambient',
      });
    }
  }

  async scheduleNotification(title: string, body: string, at: Date): Promise<void> {
    const permissions = await LocalNotifications.checkPermissions();
    if (permissions.display === 'granted') {
      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id: 1,
            schedule: { at, repeats: true, every: 'day' },
            sound: undefined,
            attachments: undefined,
            actionTypeId: '',
            extra: null
          }
        ]
      });
    }
  }
}
