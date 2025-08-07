import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController, LoadingController, AlertController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { NetworkService } from '../../services/network.service';
import { SyncStatusComponent } from '../../components/sync-status/sync-status.component';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, SyncStatusComponent]
})
export class RegisterPage implements OnInit {
  registerData = {
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    net_income: null as number | null
  };

  isLoading = false;
  showPassword = false;
  showConfirmPassword = false;
  isOnline = true;
  agreedToTerms = false;

  constructor(
    private authService: AuthService,
    private networkService: NetworkService,
    private navCtrl: NavController,
    private loadingController: LoadingController,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    // Check if user is already authenticated
    if (this.authService.isAuthenticated) {
      this.navCtrl.navigateRoot('/home');
    }

    // Monitor network status
    this.networkService.isOnline$.subscribe(isOnline => {
      this.isOnline = isOnline;
    });
  }

  async register() {
    if (!this.validateForm()) {
      return;
    }

    const loading = await this.loadingController.create({
      message: this.isOnline ? 'Creating your account...' : 'Preparing offline setup...',
      spinner: 'crescent'
    });

    await loading.present();
    this.isLoading = true;

    try {
      // Prepare data for registration, converting null to undefined
      const registrationData = {
        ...this.registerData,
        net_income: this.registerData.net_income ?? undefined
      };
      
      const result = await this.authService.register(registrationData);

      if (result.success) {
        await loading.dismiss();
        await this.showSuccessAlert();
        this.navCtrl.navigateRoot('/home');
      } else {
        await loading.dismiss();
        await this.showAlert('Registration Failed', result.message || 'Unable to create account. Please try again.');
      }
    } catch (error) {
      await loading.dismiss();
      await this.showAlert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      this.isLoading = false;
    }
  }

  private validateForm(): boolean {
    if (!this.registerData.name.trim()) {
      this.showAlert('Validation Error', 'Please enter your full name.');
      return false;
    }

    if (this.registerData.name.trim().length < 2) {
      this.showAlert('Validation Error', 'Name must be at least 2 characters long.');
      return false;
    }

    if (!this.registerData.email.trim()) {
      this.showAlert('Validation Error', 'Please enter your email address.');
      return false;
    }

    if (!this.isValidEmail(this.registerData.email)) {
      this.showAlert('Validation Error', 'Please enter a valid email address.');
      return false;
    }

    if (!this.registerData.password.trim()) {
      this.showAlert('Validation Error', 'Please enter a password.');
      return false;
    }

    if (this.registerData.password.length < 8) {
      this.showAlert('Validation Error', 'Password must be at least 8 characters long.');
      return false;
    }

    if (!this.hasValidPasswordStrength(this.registerData.password)) {
      this.showAlert('Validation Error', 'Password must contain at least one uppercase letter, one lowercase letter, and one number.');
      return false;
    }

    if (this.registerData.password !== this.registerData.password_confirmation) {
      this.showAlert('Validation Error', 'Passwords do not match.');
      return false;
    }

    if (this.registerData.net_income !== null && this.registerData.net_income < 0) {
      this.showAlert('Validation Error', 'Net income cannot be negative.');
      return false;
    }

    if (!this.agreedToTerms) {
      this.showAlert('Terms Required', 'Please agree to the Terms of Service and Privacy Policy to continue.');
      return false;
    }

    return true;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private hasValidPasswordStrength(password: string): boolean {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    return hasUpperCase && hasLowerCase && hasNumbers;
  }

  private async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  private async showSuccessAlert() {
    const alert = await this.alertController.create({
      header: 'Welcome!',
      message: 'Your account has been created successfully. You can now start managing your savings goals.',
      buttons: ['Get Started']
    });
    await alert.present();
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  goToLogin() {
    this.navCtrl.navigateBack('/login');
  }

  getPasswordStrengthColor(): string {
    const password = this.registerData.password;
    if (!password) return 'light';
    
    if (password.length < 6) return 'danger';
    if (password.length < 8) return 'warning';
    if (!this.hasValidPasswordStrength(password)) return 'warning';
    return 'success';
  }

  getPasswordStrengthText(): string {
    const password = this.registerData.password;
    if (!password) return '';
    
    if (password.length < 6) return 'Too short';
    if (password.length < 8) return 'Weak';
    if (!this.hasValidPasswordStrength(password)) return 'Medium';
    return 'Strong';
  }

  async showTermsAndConditions() {
    const alert = await this.alertController.create({
      header: 'Terms of Service & Privacy Policy',
      message: `
        <p><strong>Terms of Service:</strong></p>
        <p>By using Savings Wallet, you agree to use the app responsibly for personal financial management.</p>
        
        <p><strong>Privacy Policy:</strong></p>
        <p>Your data is stored securely and never shared with third parties. All financial information remains private and encrypted.</p>
        
        <p><strong>Data Security:</strong></p>
        <p>We use industry-standard encryption to protect your financial data both locally and during synchronization.</p>
      `,
      buttons: [
        {
          text: 'I Understand',
          handler: () => {
            this.agreedToTerms = true;
          }
        }
      ]
    });
    await alert.present();
  }
}