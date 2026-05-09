import { Component, OnInit } from '@angular/core';
import { ReceivedAmountService, ReceivedAmount } from '../../services/received-amount.service';
import { AlertController, LoadingController, NavController } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-received-amount-form',
  templateUrl: './received-amount-form.page.html',
  styleUrls: ['./received-amount-form.page.scss'],
})
export class ReceivedAmountFormPage implements OnInit {
  receivedAmountForm: FormGroup;
  isEditMode = false;
  receivedAmountId: number | null = null;
  loanStatusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'partially_paid', label: 'Partially Paid' },
    { value: 'paid', label: 'Paid' }
  ];

  constructor(
    private receivedAmountService: ReceivedAmountService,
    private formBuilder: FormBuilder,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private navController: NavController,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.receivedAmountForm = this.formBuilder.group({
      amount: ['', [Validators.required, Validators.min(0.01)]],
      date_received: ['', Validators.required],
      is_loan: [false],
      lender: [''],
      loan_status: ['']
    });

    // Set validators for loan fields when is_loan changes
    this.receivedAmountForm.get('is_loan')?.valueChanges.subscribe(isLoan => {
      const lenderControl = this.receivedAmountForm.get('lender');
      const loanStatusControl = this.receivedAmountForm.get('loan_status');
      
      if (isLoan) {
        lenderControl?.setValidators([Validators.required]);
        loanStatusControl?.setValidators([Validators.required]);
      } else {
        lenderControl?.clearValidators();
        loanStatusControl?.clearValidators();
        lenderControl?.setValue('');
        loanStatusControl?.setValue('');
      }
      
      lenderControl?.updateValueAndValidity();
      loanStatusControl?.updateValueAndValidity();
    });
  }

  ngOnInit() {
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    this.receivedAmountForm.patchValue({ date_received: today });

    // Check if we're in edit mode
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.isEditMode = true;
        this.receivedAmountId = +id;
        this.loadReceivedAmount(this.receivedAmountId);
      }
    });
  }

  async loadReceivedAmount(id: number) {
    const loading = await this.loadingController.create({
      message: 'Loading received amount...'
    });
    await loading.present();

    try {
      const response = await this.receivedAmountService.getReceivedAmount(id);
      const amount = response.data;
      if (amount) {
        this.receivedAmountForm.patchValue({
          amount: amount.amount,
          date_received: amount.date_received.split('T')[0], // Extract date part
          is_loan: amount.is_loan,
          lender: amount.lender || '',
          loan_status: amount.loan_status || ''
        });
      }
    } catch (error) {
      console.error('Error loading received amount:', error);
      this.showError('Failed to load received amount');
    } finally {
      await loading.dismiss();
    }
  }

  async onSubmit() {
    if (this.receivedAmountForm.invalid) {
      this.receivedAmountForm.markAllAsTouched();
      return;
    }

    const loading = await this.loadingController.create({
      message: this.isEditMode ? 'Updating...' : 'Creating...'
    });
    await loading.present();

    try {
      const formValue = this.receivedAmountForm.value;
      const receivedAmountData = {
        amount: parseFloat(formValue.amount),
        date_received: formValue.date_received,
        is_loan: formValue.is_loan,
        lender: formValue.is_loan ? formValue.lender : null,
        loan_status: formValue.is_loan ? formValue.loan_status : null
      };

      let response;
      if (this.isEditMode && this.receivedAmountId) {
        response = await this.receivedAmountService.updateReceivedAmount(
          this.receivedAmountId,
          receivedAmountData
        );
      } else {
        response = await this.receivedAmountService.createReceivedAmount(receivedAmountData);
      }

      this.showSuccess(this.isEditMode ? 'Received amount updated successfully' : 'Received amount created successfully');
      this.navController.navigateBack('/received-amount/list');
    } catch (error) {
      console.error('Error saving received amount:', error);
      this.showError('Failed to save received amount');
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
    this.navController.navigateBack('/received-amount/list');
  }
}