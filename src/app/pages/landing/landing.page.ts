import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-landing',
  templateUrl: './landing.page.html',
  styleUrls: ['./landing.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule,
  ],
})
export class LandingPage implements OnInit {

  profilePicture: string | undefined;

  constructor(private router: Router, private settingsService: SettingsService) { }

  ngOnInit() {
    this.loadProfilePicture();
  }

  async loadProfilePicture() {
    const settings = await this.settingsService.getSettings();
    this.profilePicture = settings.profilePicture;
  }

  goToHome() {
    this.router.navigate(['/home']);
  }

}
