import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController, LoadingController, AlertController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { NetworkService } from '../../services/network.service';
import { SyncStatusComponent } from '../../components/sync-status/sync-status.component';
import { SignInSyncService } from '../../services/sign-in-sync.service';
import { Router } from '@angular/router';
import { Angular4PaystackModule } from 'angular4-paystack';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [Angular4PaystackModule,IonicModule, CommonModule, FormsModule, SyncStatusComponent]
})
export class LoginPage implements OnInit {
  loginData = {
    email: '',
    password: '',
    rememberMe: true
  };

  isLoading = false;
  showPassword = false;
  isOnline = true;
  authInitialized = false;
  syncStatus: any = null;

  constructor(
    private authService: AuthService,
    private networkService: NetworkService,
    private signInSyncService: SignInSyncService,
    private navCtrl: NavController,
    private loadingController: LoadingController,
    private alertController: AlertController,
    private router: Router
  ) {}

  async ngOnInit() {
    // Wait for auth initialization
    this.authService.authInitialized$.subscribe(async (initialized) => {
      this.authInitialized = initialized;
      if (initialized && this.authService.isAuthenticated) {
        this.navCtrl.navigateRoot('/home');
      }
    });

    // Load remember me preference
    this.loginData.rememberMe = await this.authService.getStoredRememberMe();

    // Monitor network status
    this.networkService.isOnline$.subscribe(isOnline => {
      this.isOnline = isOnline;
    });

    // Monitor sign-in sync status
    this.signInSyncService.syncStatus$.subscribe(status => {
      this.syncStatus = status;
    });
  }

  async login() {
    if (!this.validateForm()) {
      return;
    }

    let loading = await this.loadingController.create({
      message: this.isOnline ? 'Signing in...' : 'Preparing offline mode...',
      spinner: 'crescent'
    });

    await loading.present();
    this.isLoading = true;

    try {
      const result = await this.authService.login(this.loginData);
      console.log(result.success);
      if (result.success) {
        await loading.dismiss();
        // Navigate to home immediately after successful login
        // Sync will happen on the home page
        this.router.navigateByUrl('/home');
      } else {
        await loading.dismiss();
        await this.showAlert('Login Failed', result.message || 'Invalid credentials. Please try again.');
      }
    } catch (error) {
      await loading.dismiss();
      await this.showAlert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      this.isLoading = false;
    }
  }

  private validateForm(): boolean {
    if (!this.loginData.email.trim()) {
      this.showAlert('Validation Error', 'Please enter your email address.');
      return false;
    }

    if (!this.isValidEmail(this.loginData.email)) {
      this.showAlert('Validation Error', 'Please enter a valid email address.');
      return false;
    }

    if (!this.loginData.password.trim()) {
      this.showAlert('Validation Error', 'Please enter your password.');
      return false;
    }

    if (this.loginData.password.length < 6) {
      this.showAlert('Validation Error', 'Password must be at least 6 characters long.');
      return false;
    }

    return true;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  goToRegister() {
    this.navCtrl.navigateForward('/register');
  }

  async forgotPassword() {
    const alert = await this.alertController.create({
      header: 'Forgot Password',
      message: 'Password reset functionality will be available soon. Please contact support if you need assistance.',
      buttons: ['OK']
    });
    await alert.present();
  }

  // Demo login for testing
  async demoLogin() {
    this.loginData = {
      email: 'demo@savingswallet.com',
      password: 'Tl12345678',
      rememberMe: this.loginData.rememberMe
    };
    await this.login();
  }
}