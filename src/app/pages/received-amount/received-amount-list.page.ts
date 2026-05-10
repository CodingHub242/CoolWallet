import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ReceivedAmountService, ReceivedAmount } from '../../services/received-amount.service';
import { AlertController, LoadingController } from '@ionic/angular';
import { Router } from '@angular/router';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-received-amount-list',
  templateUrl: './received-amount-list.page.html',
  styleUrls: ['./received-amount-list.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, ReactiveFormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ReceivedAmountListPage implements OnInit {
  receivedAmounts: ReceivedAmount[] = [];
  filteredAmounts: ReceivedAmount[] = [];
  selectedMonth: number = new Date().getMonth() + 1; // 1-12
  selectedYear: number = new Date().getFullYear();
  months = [
    { value: 1, name: 'January' },
    { value: 2, name: 'February' },
    { value: 3, name: 'March' },
    { value: 4, name: 'April' },
    { value: 5, name: 'May' },
    { value: 6, name: 'June' },
    { value: 7, name: 'July' },
    { value: 8, name: 'August' },
    { value: 9, name: 'September' },
    { value: 10, name: 'October' },
    { value: 11, name: 'November' },
    { value: 12, name: 'December' }
  ];
  years: number[] = [];

  constructor(
    private receivedAmountService: ReceivedAmountService,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private router: Router
  ) {
    // Generate years from current year - 5 to current year + 5
    const currentYear = new Date().getFullYear();
    for (let i = currentYear - 5; i <= currentYear + 5; i++) {
      this.years.push(i);
    }
  }

  ngOnInit() {
    this.loadReceivedAmounts();
  }

  async loadReceivedAmounts() {
    const loading = await this.loadingController.create({
      message: 'Loading received amounts...'
    });
    await loading.present();

    try {
      const filters = { month: this.selectedMonth, year: this.selectedYear };
      const response = await this.receivedAmountService.getReceivedAmounts(filters);
      this.receivedAmounts = response.data || [];
      this.filteredAmounts = [...this.receivedAmounts];
    } catch (error) {
      console.error('Error loading received amounts:', error);
      this.showError('Failed to load received amounts');
    } finally {
      await loading.dismiss();
    }
  }

  onFilterChange() {
    this.loadReceivedAmounts();
  }

  async showError(message: string) {
    const alert = await this.alertController.create({
      header: 'Error',
      message: message,
      buttons: ['OK']
    });
    await alert.present();
  }

  async deleteReceivedAmount(id: number) {
    const alert = await this.alertController.create({
      header: 'Delete Received Amount',
      message: 'Are you sure you want to delete this received amount? This action cannot be undone.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            const loading = await this.loadingController.create({
              message: 'Deleting...'
            });
            await loading.present();

            try {
              await this.receivedAmountService.deleteReceivedAmount(id);
              this.loadReceivedAmounts();
            } catch (error) {
              console.error('Error deleting received amount:', error);
              this.showError('Failed to delete received amount');
            } finally {
              await loading.dismiss();
            }
          }
        }
      ]
    });
    await alert.present();
  }

  viewExpenses(receivedAmountId: number) {
    this.router.navigate(['/received-amount/expenses', receivedAmountId]);
  }

  editReceivedAmount(id: number) {
    this.router.navigate(['/received-amount/edit', id]);
  }

addReceivedAmount() {
    this.router.navigate(['/received-amount/add']);
  }

  getLoanStatusColor(status?: string): string {
    switch (status) {
      case 'paid':
        return 'success';
      case 'partially_paid':
        return 'warning';
      case 'pending':
        return 'danger';
      default:
        return 'medium';
    }
  }

  isRemainingNegative(remainingAmount: number | undefined): boolean {
    return remainingAmount !== undefined && remainingAmount < 0;
  }
}
