import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ReceivedAmountService, Expense } from '../../services/received-amount.service';
import { AlertController, LoadingController } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-expense-list',
  templateUrl: './expense-list.page.html',
  styleUrls: ['./expense-list.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class ExpenseListPage implements OnInit {
  expenses: Expense[] = [];
  receivedAmountId: number = 0;
  receivedAmount: any = null;
  total_expenses: any = 0;
  remaining_amount: any = 0;

  constructor(
    private receivedAmountService: ReceivedAmountService,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  async ngOnInit() {
    // Get the received amount ID from route params
    const id = this.route.snapshot.paramMap.get('receivedAmountId');
    if (id) {
      this.receivedAmountId = +id;
      await this.loadReceivedAmount();
      await this.loadExpenses();
    }
  }

  async loadReceivedAmount() {
    try {
      const response = await this.receivedAmountService.getReceivedAmount(this.receivedAmountId);
      this.receivedAmount = response.data;
    } catch (error) {
      console.error('Error loading received amount:', error);
      this.showError('Failed to load received amount details');
    }
  }

  async loadExpenses() {
    const loading = await this.loadingController.create({
      message: 'Loading expenses...'
    });
    await loading.present();

    try {
      const response : any = await this.receivedAmountService.getExpenses(this.receivedAmountId);
      this.expenses = response.data || [];
      this.total_expenses = response.total_expenses || 0;
      this.remaining_amount = response.remaining_amount || 0;
    } catch (error) {
      console.error('Error loading expenses:', error);
      this.showError('Failed to load expenses');
    } finally {
      await loading.dismiss();
    }
  }

  async showError(message: string) {
    const alert = await this.alertController.create({
      header: 'Error',
      message: message,
      buttons: ['OK']
    });
    await alert.present();
  }

  async showSuccess(message: string) {
    const alert = await this.alertController.create({
      header: 'Success',
      message: message,
      buttons: ['OK']
    });
    await alert.present();
  }

  async deleteExpense(id: number) {
    const alert = await this.alertController.create({
      header: 'Delete Expense',
      message: 'Are you sure you want to delete this expense? This action cannot be undone.',
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
              await this.receivedAmountService.deleteExpense(this.receivedAmountId, id);
              await this.loadExpenses();
            } catch (error) {
              console.error('Error deleting expense:', error);
              this.showError('Failed to delete expense');
            } finally {
              await loading.dismiss();
            }
          }
        }
      ]
    });
    await alert.present();
  }

  editExpense(id: number) {
    this.router.navigate(['/received-amount/expense/edit', this.receivedAmountId, id]);
  }

  addExpense() {
    this.router.navigate(['/received-amount/expense/add', this.receivedAmountId]);
  }

  goBack() {
    this.router.navigate(['/received-amount/list']);
  }
}