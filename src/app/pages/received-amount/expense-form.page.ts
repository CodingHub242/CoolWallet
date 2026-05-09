import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ReceivedAmountService, Expense } from '../../services/received-amount.service';
import { AlertController, LoadingController, NavController } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-expense-form',
  templateUrl: './expense-form.page.html',
  styleUrls: ['./expense-form.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class ExpenseFormPage implements OnInit {
  expenseForm: FormGroup;
  isEditMode = false;
  receivedAmountId: number = 0;
  expenseId: number | null = null;

  constructor(
    private receivedAmountService: ReceivedAmountService,
    private formBuilder: FormBuilder,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private navController: NavController,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.expenseForm = this.formBuilder.group({
      name: ['', Validators.required],
      amount: ['', [Validators.required, Validators.min(0.01)]],
      date: ['', Validators.required]
    });
  }

  ngOnInit() {
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    this.expenseForm.patchValue({ date: today });

    // Get IDs from route params
    const receivedAmountId = this.route.snapshot.paramMap.get('receivedAmountId');
    const expenseId = this.route.snapshot.paramMap.get('expenseId');
    
    if (receivedAmountId) {
      this.receivedAmountId = +receivedAmountId;
    }
    
    if (expenseId) {
      this.isEditMode = true;
      this.expenseId = +expenseId;
      this.loadExpense(this.expenseId);
    }
  }

  async loadExpense(id: number) {
    const loading = await this.loadingController.create({
      message: 'Loading expense...'
    });
    await loading.present();

    try {
      const response = await this.receivedAmountService.getExpense(this.receivedAmountId, id);
      const expense = response.data;
      if (expense) {
        this.expenseForm.patchValue({
          name: expense.name,
          amount: expense.amount,
          date: expense.date.split('T')[0] // Extract date part
        });
      }
    } catch (error) {
      console.error('Error loading expense:', error);
      this.showError('Failed to load expense');
    } finally {
      await loading.dismiss();
    }
  }

  async onSubmit() {
    if (this.expenseForm.invalid) {
      this.expenseForm.markAllAsTouched();
      return;
    }

    const loading = await this.loadingController.create({
      message: this.isEditMode ? 'Updating...' : 'Creating...'
    });
    await loading.present();

    try {
      const formValue = this.expenseForm.value;
      const expenseData = {
        name: formValue.name,
        amount: parseFloat(formValue.amount),
        date: formValue.date
      };

      let response;
      if (this.isEditMode && this.expenseId) {
        response = await this.receivedAmountService.updateExpense(
          this.receivedAmountId,
          this.expenseId,
          expenseData
        );
      } else {
        response = await this.receivedAmountService.createExpense(
          this.receivedAmountId,
          expenseData
        );
      }

      this.showSuccess(this.isEditMode ? 'Expense updated successfully' : 'Expense created successfully');
      this.navController.navigateBack(`/received-amount/expenses/${this.receivedAmountId}`);
    } catch (error) {
      console.error('Error saving expense:', error);
      this.showError('Failed to save expense');
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

  goBack() {
    this.navController.navigateBack(`/received-amount/expenses/${this.receivedAmountId}`);
  }
}