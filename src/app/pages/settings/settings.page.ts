import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { SettingsService, AppSettings } from '../../services/settings.service';
import { DataService } from '../../services/data.service';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
  ],
})
export class SettingsPage implements OnInit {
currentUser:any;
  settings: AppSettings = {
    profilePicture: '',
    voiceNotificationsEnabled: true,
    reminderFrequency: 'weekly',
    theme: 'light',
  };
  netIncome: number | null = null;

  constructor(private settingsService: SettingsService, private dataService: DataService,private authService: AuthService) { }

  ngOnInit() {
    this.loadSettings();
    this.loadNetIncome();
  }

  async loadSettings() {
    this.settings = await this.settingsService.getSettings();
  }

  async saveSettings() {
    await this.settingsService.saveSettings(this.settings);
    this.updateTheme();
  }

  async loadNetIncome() {
     this.currentUser = this.authService.currentUser;
    if (this.currentUser) {
      this.netIncome = this.currentUser.net_income;
      //console.log(this.netIncome);
    }
    //this.netIncome = await this.dataService.getNetIncome();
  }

  async saveNetIncome() {
    if (this.netIncome) {
      await this.dataService.setNetIncome(this.netIncome);
    }
  }

  updateTheme() {
    document.body.classList.remove('dark', 'maroon');
    if (this.settings.theme !== 'light') {
      document.body.classList.add(this.settings.theme);
    }
  }
  async changeProfilePicture() {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: true,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Photos,
    });

    if (image && image.dataUrl) {
      this.settings.profilePicture = image.dataUrl;
      this.saveSettings();
    }
  }
}
