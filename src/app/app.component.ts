import { Component, OnInit } from '@angular/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { CommonModule } from '@angular/common';
import { LocalNotifications } from '@capacitor/local-notifications';
import { SettingsService } from './services/settings.service';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { HttpClient, HttpClientModule } from '@angular/common/http';
import { ApiService } from './services/api.service';
import { NetworkService } from './services/network.service';
import { SyncService } from './services/sync.service';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule,HttpClientModule],
  providers:[ ApiService,
  NetworkService,
  SyncService,
  AuthService,HttpClient],
})
export class AppComponent implements OnInit {
  public appPages = [
    { title: 'Home', url: '/home', icon: 'home' },
    { title: 'Savings Goals', url: '/savings-goal', icon: 'flag' },
    { title: 'Withdraw', url: '/withdraw', icon: 'wallet' },
    { title: 'Settings', url: '/settings', icon: 'cog' },
  ];
  profilePicture: string | undefined;

  constructor(private settingsService: SettingsService) {
    this.initializeApp();
    this.loadTheme();
    this.loadProfilePicture();
    window.addEventListener('settingsChanged', () => {
      this.loadProfilePicture();
      this.loadTheme();
    });
  }

  async initializeApp() {
    await SplashScreen.show({
      showDuration: 2000,
      autoHide: true,
    });
  }

  async ngOnInit() {
    await LocalNotifications.requestPermissions();
    this.loadProfilePicture();
  }

  async loadTheme() {
    const settings = await this.settingsService.getSettings();
    document.body.classList.remove('dark', 'maroon');
    if (settings.theme !== 'light') {
      document.body.classList.add(settings.theme);
    }
  }

  async loadProfilePicture() {
    const settings = await this.settingsService.getSettings();
    this.profilePicture = settings.profilePicture;
    if(this.profilePicture=='')
    {
        this.profilePicture = 'assets/img/u1.png';
    }
    else
    {
      
    }
  }
}
