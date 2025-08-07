import { Component, CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController, AlertController, LoadingController, isPlatform, Platform, ToastController } from '@ionic/angular';
import { DataService, HistoryEntry, SavingsEntry } from '../services/data.service';
import { NotificationService } from '../services/notification.service';
import { SavingsTipService } from '../services/savings-tip.service';
import { SavingsGoal, SavingsGoalService } from '../services/savings-goal.service';
import { SettingsService } from '../services/settings.service';
import { AuthService } from '../services/auth.service';
import { SyncStatusComponent } from '../components/sync-status/sync-status.component';
import { SyncService, SavingsEntry as SyncSavingsEntry } from '../services/sync.service';
import { SignInSyncService } from '../services/sign-in-sync.service';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import Paystack from '@paystack/inline-js';
import { PaystackOptions, Angular4PaystackModule } from 'angular4-paystack';

@Component({
  schemas: [CUSTOM_ELEMENTS_SCHEMA,NO_ERRORS_SCHEMA],
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SyncStatusComponent,
   // Angular4PaystackModule,
  ],
})
export class HomePage implements OnInit {
  options: PaystackOptions = {
      amount: 50000,
      email: 'user@mail.com',
      ref: `${Math.ceil(Math.random() * 10e10)}`
    }

    

  reference: string = '';
  netIncome: number | null | any = null;
  amountSaved: number | null = null;
  totalSavings = 0;
  history: HistoryEntry[] = [];
  primaryGoal: SavingsGoal | undefined;
  showBot = false;
  botMessage = '';
  isMobile = false;
  profilePicture: string | undefined;
  currentUser: any = null;
  syncStatus: any = null;
  isManualSyncing = false;

  constructor(
    private dataService: DataService,
    private notificationService: NotificationService,
    private savingsTipService: SavingsTipService,
    private savingsGoalService: SavingsGoalService,
    private settingsService: SettingsService,
    private authService: AuthService,
    private syncService: SyncService,
    private signInSyncService: SignInSyncService,
    private navCtrl: NavController,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private platform: Platform,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    console.log('HomePage ngOnInit');
    this.loadUserData();
    this.loadHistory();
    this.loadPrimaryGoal();
    this.loadNetIncome();
    this.isMobile = this.platform.is('hybrid');
    this.loadProfilePicture();
    this.setupSyncStatusMonitoring();
  }

  async ionViewWillEnter() {
    console.log('HomePage ionViewWillEnter');
    this.reference = `ref-${Math.ceil(Math.random() * 10e13)}`;
    this.loadUserData();
    this.loadPrimaryGoal();
    this.loadHistory();
    this.scheduleSavingsTipNotification();
    this.loadProfilePicture();
    
    // Perform sign-in sync if user just logged in
    await this.performSignInSyncIfNeeded();
  }

  async loadHistory() {
    this.totalSavings = await this.dataService.getTotalSavings();
    this.history = await this.dataService.getHistory();

    //console.log(this.totalSavings);
  }

  async loadPrimaryGoal() {
    this.primaryGoal = await this.savingsGoalService.getPrimaryGoal();

    //console.log(this.primaryGoal?.currentAmount);
  }

  async loadNetIncome() {
    this.netIncome = await this.dataService.getNetIncome();
  }

  async addSavings() {
    if (this.amountSaved) {
      // Create entry - data service will handle API sync automatically
      const newEntry: SavingsEntry = {
        type: 'deposit',
        netIncome: this.netIncome,
        amountSaved: this.amountSaved,
        date: new Date().toISOString(),
        id: Date.now()
      };
      await this.dataService.addHistoryEntry(newEntry);

      if (this.primaryGoal) {
        this.primaryGoal.currentAmount += this.amountSaved;
        await this.savingsGoalService.updateGoal(this.primaryGoal);
      }

      const tip = this.savingsTipService.getTip(this.netIncome, this.amountSaved);
      this.notificationService.speak(`You have saved ${this.amountSaved} cedis. Great job! Here's a tip for you: ${tip}`);
      this.showBotMessage(tip);
      this.loadHistory();
      this.loadPrimaryGoal();
      this.amountSaved = null;
    }
  }

  paymentInit()
  {
    const popup = new Paystack()

    popup.newTransaction({
      key: 'pk_test_e58cabbb41e5a44f223991bb7c3954211f3e9ebd',
      email: this.currentUser?.email,
      amount: (this.amountSaved || 0) * 100,
      onSuccess: (transaction:any) => {
        this.paymentDone(transaction.reference);
      },
      onLoad: (response:any) => {
        console.log("onLoad: ", response);
      },
      onCancel: () => {
        console.log("onCancel");
      },
      onError: (error:any) => {
        console.log("Error: ", error.message);
      }
    })

   // console.log('Paystack payment initialized');
    //console.log('Amount:', this.amountSaved);
   // console.log('Email:', this.currentUser?.email);
   // console.log('Reference:', this.reference);
  }
  paymentCancel(){
    console.log('Paystack payment cancelled');
  }

  paymentDone(ref:any)
  {
    console.log('Paystack payment completed', ref);
    this.addSavings();
  }

  openGoals() {
    this.navCtrl.navigateForward('/savings-goal');
  }

  openWithdraw() {
    this.navCtrl.navigateForward('/withdraw');
  }

  async exportToPdf() {
    const doc = new jsPDF();
    let y = 10;
    doc.text('Savings History', 10, y);
    y += 10;
    this.history.forEach(entry => {
      const text = `${new Date(entry.date).toLocaleDateString()}: ${entry.type === 'deposit' ? '+' : '-'}${(entry.type === 'deposit' ? entry.amountSaved : entry.amountWithdrawn)}`;
      doc.text(text, 10, y);
      y += 10;
    });

    if (this.isMobile) {
      try {
        const pdfOutput = doc.output('blob');
        const base64 = await this.blobToBase64(pdfOutput) as string;
        await Filesystem.writeFile({
          path: 'savings-history.pdf',
          data: base64,
          directory: Directory.Documents,
        });
        this.showToast('PDF saved to Documents');
      } catch (e) {
        console.error('Unable to save PDF', e);
        this.showToast('Error saving PDF');
      }
    } else {
      doc.save('savings-history.pdf');
    }
  }

  async exportToExcel() {
    const worksheet = XLSX.utils.json_to_sheet(this.history.map(entry => ({
      Date: new Date(entry.date).toLocaleDateString(),
      Type: entry.type,
      Amount: entry.type === 'deposit' ? entry.amountSaved : entry.amountWithdrawn,
      'Goal Name': entry.type === 'withdrawal' ? entry.goalName : 'N/A'
    })));
    const workbook = { Sheets: { 'data': worksheet }, SheetNames: ['data'] };

    if (this.isMobile) {
      try {
        const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
        await Filesystem.writeFile({
          path: 'savings-history.xlsx',
          data: wbout,
          directory: Directory.Documents,
        });
        this.showToast('Excel saved to Documents');
      } catch (e) {
      //  console.error('Unable to save Excel', e);
        this.showToast('Error saving Excel');
      }
    } else {
      XLSX.writeFile(workbook, 'savings-history.xlsx');
    }
  }

  scheduleSavingsTipNotification() {
    const now = new Date();
    const nextTipTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0, 0); // Tomorrow at 9 AM

    this.notificationService.scheduleNotification(
      'Daily Savings Tip',
      this.savingsTipService.getRandomTip(),
      nextTipTime
    );
  }

  showBotMessage(message: string) {
    this.botMessage = message;
    this.showBot = true;
  }

  hideBot() {
    this.showBot = false;
  }

  async editEntry(entry: HistoryEntry) {
    const alert = await this.alertController.create({
      header: 'Edit Entry',
      inputs: [
        {
          name: 'amount',
          type: 'number',
          value: entry.type === 'deposit' ? entry.amountSaved : entry.amountWithdrawn,
          placeholder: 'New Amount'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Save',
          handler: async (data) => {
            const newAmount = parseFloat(data.amount);
            if (!isNaN(newAmount) && newAmount > 0) {
              // Update the entry amount
              if (entry.type === 'deposit') {
                entry.amountSaved = newAmount;
              } else {
                entry.amountWithdrawn = newAmount;
              }
              
              // Update the entry - this will trigger automatic goal recalculation
              await this.dataService.updateHistoryEntry(entry);
              
              // Reload data to reflect changes
              this.loadHistory();
              this.loadPrimaryGoal();
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async deleteEntry(id: number) {
    // Delete the entry - this will trigger automatic goal recalculation
    await this.dataService.deleteHistoryEntry(id);

    // Reload data to reflect changes
    this.loadHistory();
    this.loadPrimaryGoal();
  }

  private async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000
    });
    toast.present();
  }

  private blobToBase64(blob: Blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        resolve(reader.result);
      };
      reader.readAsDataURL(blob);
    });
  }
  async loadProfilePicture() {
    const settings = await this.settingsService.getSettings();
    this.profilePicture = settings.profilePicture;
  }

  loadUserData() {
    this.currentUser = this.authService.currentUser;
    if (this.currentUser) {
      this.netIncome = this.currentUser.net_income;
      //console.log(this.netIncome);
    }
    //console.log(this.currentUser.email);
  }

  async logout() {
    const alert = await this.alertController.create({
      header: 'Logout',
      message: 'Are you sure you want to logout?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Logout',
          handler: async () => {
            await this.authService.logout();
            this.navCtrl.navigateRoot('/login');
          }
        }
      ]
    });

    await alert.present();
  }

  async openSettings() {
    this.navCtrl.navigateForward('/settings');
  }

  getUserDisplayName(): string {
    return this.currentUser?.name || 'User';
  }

  getUserEmail(): string {
    return this.currentUser?.email || '';
  }

  /**
   * Setup sync status monitoring
   */
  private setupSyncStatusMonitoring(): void {
    // Monitor sign-in sync status
    this.signInSyncService.syncStatus$.subscribe(status => {
      this.syncStatus = status;
    });

    // Monitor regular sync status
    this.syncService.syncStatus$.subscribe(status => {
      if (!this.syncStatus?.isLoading) {
        this.syncStatus = status;
      }
    });
  }

  /**
   * Manual sync trigger
   */
  async manualSync(): Promise<void> {
    const isOnline = (window as any).navigator?.onLine ?? true;
    if (this.isManualSyncing || !isOnline) {
      if (!isOnline) {
        this.showToast('Cannot sync while offline');
      }
      return;
    }

    this.isManualSyncing = true;
    
    try {
      await this.signInSyncService.forceCompleteSync();
      this.showToast('Sync completed successfully');
      
      // Reload data after sync
      await this.loadHistory();
      await this.loadPrimaryGoal();
      await this.loadNetIncome();
    } catch (error) {
     // console.error('Manual sync failed:', error);
      this.showToast('Sync failed. Please try again.');
    } finally {
      this.isManualSyncing = false;
    }
  }

  /**
   * Get sync status for display
   */
  getSyncStatusText(): string {
    if (this.isManualSyncing) {
      return 'Syncing...';
    }
    
    if (this.syncStatus?.isLoading) {
      return this.syncStatus.currentStep || 'Syncing...';
    }
    
    if (this.syncStatus?.lastSync) {
      const lastSync = new Date(this.syncStatus.lastSync);
      const now = new Date();
      const diffMinutes = Math.floor((now.getTime() - lastSync.getTime()) / (1000 * 60));
      
      if (diffMinutes < 1) {
        return 'Just synced';
      } else if (diffMinutes < 60) {
        return `Synced ${diffMinutes}m ago`;
      } else {
        const diffHours = Math.floor(diffMinutes / 60);
        return `Synced ${diffHours}h ago`;
      }
    }
    
    return 'Not synced';
  }

  /**
   * Check if sync is available
   */
  isSyncAvailable(): boolean {
    const isOnline = (window as any).navigator?.onLine ?? true;
    return isOnline && !this.isManualSyncing && !this.syncStatus?.isLoading;
  }

  /**
   * Get pending changes count
   */
  getPendingChangesCount(): number {
    return this.syncStatus?.pendingChanges || 0;
  }

  /**
   * Show sync status details
   */
  async showSyncDetails(): Promise<void> {
    const pendingCount = this.getPendingChangesCount();
    const statusText = this.getSyncStatusText();
    const isOnline = (window as any).navigator?.onLine ?? true;
    
    let message = `Status: ${statusText}\n`;
    message += `Network: ${isOnline ? 'Online' : 'Offline'}\n`;
    message += `Pending changes: ${pendingCount}`;
    
    if (this.syncStatus?.error) {
      message += `\nLast error: ${this.syncStatus.error}`;
    }

    const alert = await this.alertController.create({
      header: 'Sync Status',
      message: message,
      buttons: [
        {
          text: 'Close',
          role: 'cancel'
        },
        ...(this.isSyncAvailable() ? [{
          text: 'Sync Now',
          handler: () => {
            this.manualSync();
          }
        }] : [])
      ]
    });

    await alert.present();
  }

  /**
   * Perform sign-in sync if user just logged in
   */
  private async performSignInSyncIfNeeded(): Promise<void> {
    // Check if user just logged in and needs sync
    if (this.authService.justLoggedIn) {
      const isOnline = (window as any).navigator?.onLine ?? true;
      
      if (isOnline) {
        console.log('Performing sign-in sync on home page...');
        
        try {
          // Show a subtle loading indicator
          const loading = await this.loadingController.create({
            message: 'Synchronizing your data...',
            spinner: 'crescent',
            duration: 15000 // Auto-dismiss after 15 seconds
          });
          
          await loading.present();
          
          // Subscribe to sync status for real-time updates
          const syncSubscription = this.signInSyncService.syncStatus$.subscribe(async (status) => {
            if (status.isLoading && status.currentStep) {
              // Update loading message with current step
              try {
                await loading.dismiss();
                const newLoading = await this.loadingController.create({
                  message: `${status.currentStep} (${status.progress}%)`,
                  spinner: 'crescent',
                  duration: 15000
                });
                await newLoading.present();
                // Update reference
                (loading as any) = newLoading;
              } catch (error) {
                // Ignore loading update errors
              }
            } else if (status.completed || status.error) {
              syncSubscription.unsubscribe();
              try {
                await loading.dismiss();
              } catch (error) {
                // Ignore dismiss errors
              }
              
              if (status.error) {
                this.showToast(`Sync completed with warnings: ${status.error}`);
              } else {
                this.showToast('Data synchronized successfully');
              }
            }
          });
          
          // Perform the comprehensive sign-in sync
          await this.signInSyncService.performSignInSync();
          
          // Mark sync as completed
          this.authService.markSignInSyncCompleted();
          
          // Cleanup subscription
          syncSubscription.unsubscribe();
          
          try {
            await loading.dismiss();
          } catch (error) {
            // Ignore dismiss errors
          }
          
          // Reload data after sync
          await this.loadHistory();
          await this.loadPrimaryGoal();
          await this.loadNetIncome();
          
          //console.log('Sign-in sync completed successfully');
          
        } catch (error) {
         // console.error('Sign-in sync failed:', error);
          this.authService.markSignInSyncCompleted(); // Mark as done to avoid retrying
          this.showToast('Sync failed. Will retry automatically.');
        }
      } else {
        //console.log('Offline - sign-in sync will happen when online');
        this.authService.markSignInSyncCompleted(); // Mark as done to avoid retrying
        this.showToast('Offline mode - data will sync when online');
      }
    }
  }
}
